import type { Actions, PageServerLoad } from './$types';
import { db } from '$lib/server/db';
import { products, protocols, productInventory } from '$lib/server/db/schema';
import { handleFileUpload, getFileNamesByListId } from '$lib/server/file-storage';
import { batchFetchFileNames } from '$lib/server/query-helpers';
import { softDeleteWithFiles, updateFileAttachment, parseDeleteIds } from '$lib/server/crud-helpers';
import { eq, inArray, like, sql, count, or, and, isNull, desc } from 'drizzle-orm';

export const load: PageServerLoad = async ({ url, depends, parent }) => {
	const { defaultPageSize } = await parent();
	// 페이지 이동 시마다 최신 데이터를 가져오도록 depends 추가
	depends('products:update');
	// URL 쿼리 파라미터에서 검색어, 검색 필드, 페이지 정보 가져오기
	const searchQuery = url.searchParams.get('search') || '';
	const searchField = url.searchParams.get('field') || 'productName';
	const page = Math.max(1, parseInt(url.searchParams.get('page') || '1', 10));
	const pageSize = parseInt(url.searchParams.get('pageSize') || String(defaultPageSize), 10);

	// 펌웨어 목록 가져오기 (검색용, 삭제되지 않은 것만)
	const firmwareList = await db.select({
		id: protocols.protocolId,
		name: protocols.name
	}).from(protocols).where(isNull(protocols.deletedAt));

	// 검색 조건 구성
	let whereCondition = undefined;
	if (searchQuery.trim()) {
		const conditions = [];
		if (searchField === 'productName') {
			conditions.push(like(products.name, `%${searchQuery}%`));
		} else if (searchField === 'productCode') {
			conditions.push(like(products.code, `%${searchQuery}%`));
		} else if (searchField === 'memo') {
			conditions.push(like(products.memo, `%${searchQuery}%`));
		} else if (searchField === 'price') {
			// 단가 검색: 숫자로 변환 가능한 경우 숫자 검색, 그렇지 않으면 문자열 검색
			const priceNum = parseInt(searchQuery, 10);
			if (!isNaN(priceNum)) {
				conditions.push(eq(products.price, priceNum));
			}
		}
		if (conditions.length > 0) {
			whereCondition = or(...conditions);
		}
	}

	// 파일명 검색의 경우 모든 데이터를 가져와서 필터링 (삭제되지 않은 것만)
	const deletedAtCondition = isNull(products.deletedAt);
	const finalWhereCondition = whereCondition
		? and(whereCondition, deletedAtCondition)
		: deletedAtCondition;
	let allRows = await db.select().from(products).where(finalWhereCondition).orderBy(desc(products.productId));

	// 파일명으로 검색하는 경우
	if (searchQuery.trim() && searchField === 'photoFileName') {
		const filteredRows = [];
		for (const row of allRows) {
			const photoFileNames = await getFileNamesByListId(row.photoFileListId);

			const matches = photoFileNames.some(fileName =>
				fileName.toLowerCase().includes(searchQuery.toLowerCase())
			);

			if (matches) {
				filteredRows.push(row);
			}
		}
		allRows = filteredRows;
	}

	// 펌웨어로 검색하는 경우 (펌웨어 이름으로 검색)
	if (searchQuery.trim() && searchField === 'protocolId') {
		const filteredRows = [];
		const searchLower = searchQuery.toLowerCase();
		// 검색어와 일치하는 펌웨어 ID 찾기
		const matchingFirmwareIds = firmwareList
			.filter(f => f.name && f.name.toLowerCase().includes(searchLower))
			.map(f => f.id);

		for (const row of allRows) {
			if (row.protocolId && matchingFirmwareIds.includes(row.protocolId)) {
				filteredRows.push(row);
			}
		}
		allRows = filteredRows;
	}

	// 재고로 검색하는 경우: 모든 데이터를 가져와서 totalQuantity로 필터링
	let finalRows = allRows;
	if (searchQuery.trim() && searchField === 'totalQuantity') {
		const filteredRows = [];
		const searchNum = parseInt(searchQuery, 10);

		for (const row of allRows) {
			// 입고/출고 기록 가져오기
			const inventoryRecords = await db.select()
				.from(productInventory)
				.where(and(eq(productInventory.productId, row.productId), isNull(productInventory.deletedAt)));

			// 재고 수량 계산: 입고는 +, 출고는 -
			const totalQuantity = inventoryRecords.reduce((total, inv) => {
				if (inv.type === 'in') {
					return total + (inv.quantity || 0);
				} else if (inv.type === 'out') {
					return total - (inv.quantity || 0);
				}
				return total;
			}, 0);

			// 문자열로 변환하여 포함 여부 확인 (부분 일치 검색)
			// 예: "1"을 입력하면 1, 10, 11, 12, 100 등이 모두 검색됨
			if (String(totalQuantity).includes(searchQuery)) {
				filteredRows.push(row);
			}
		}
		finalRows = filteredRows;
	} else {
		finalRows = allRows;
	}

	const totalCount = finalRows.length;

	// 페이지네이션 적용
	const offset = (page - 1) * pageSize;
	const rows = finalRows.slice(offset, offset + pageSize);

	const fileNamesMap = await batchFetchFileNames(rows.map(r => r.photoFileListId));

	// 재고 배치 조회
	const productIds = rows.map(r => r.productId);
	const allInventory = productIds.length > 0
		? await db.select().from(productInventory).where(and(inArray(productInventory.productId, productIds), isNull(productInventory.deletedAt)))
		: [];
	const inventoryMap = new Map<number, typeof allInventory>();
	for (const inv of allInventory) {
		const list = inventoryMap.get(inv.productId) || [];
		list.push(inv);
		inventoryMap.set(inv.productId, list);
	}

	const items = rows.map((row) => {
		const photoFileNames = row.photoFileListId ? fileNamesMap.get(row.photoFileListId) || [] : [];
		const inventoryRecords = inventoryMap.get(row.productId) || [];

		// 재고 수량 계산: 입고는 +, 출고는 -
		const totalQuantity = inventoryRecords.reduce((total, inv) => {
			if (inv.type === 'in') {
				return total + (inv.quantity || 0);
			} else if (inv.type === 'out') {
				return total - (inv.quantity || 0);
			}
			return total;
		}, 0);

		return {
			id: row.productId,
			productName: row.name ?? '',
			productCode: row.code ?? '',
			version: row.version ?? '',
			price: row.price ?? 0,
			memo: row.memo ?? '',
			protocolId: row.protocolId ?? null,
			photoFileName: photoFileNames[0] || null,
			photoFileListId: row.photoFileListId,
			totalQuantity,
			inventoryData: inventoryRecords.map(inv => ({
				type: inv.type,
				content: inv.content,
				date: inv.date,
				quantity: inv.quantity
			}))
		};
	});

	// firmwareList는 이미 위에서 가져왔으므로 중복 제거

	return {
		products: items,
		totalCount,
		page,
		pageSize,
		firmwareList
	};
};

export const actions: Actions = {
	createProduct: async ({ request }) => {
		const formData = await request.formData();

		const name = (formData.get('productName') ?? '').toString().trim();
		const code = (formData.get('productCode') ?? '').toString().trim();
		const version = (formData.get('productVersion') ?? '').toString().trim();
		const memo = (formData.get('productMemo') ?? '').toString().trim();
		const priceRaw = (formData.get('productPrice') ?? '').toString().trim();
		const protocolIdRaw = (formData.get('productFirmwareId') ?? '').toString().trim();
		const protocolId = protocolIdRaw ? Number(protocolIdRaw) : null;
		if (!name) {
			return {
				success: false,
				message: '제품명을 입력하세요.'
			};
		}

		const price = priceRaw ? Number(priceRaw) : 0;

		const { fileListId: photoFileListId, error: fileError } = await handleFileUpload(formData, 'productFile', 'products');
		if (fileError) return fileError;

		const result = await db.insert(products).values({
			name,
			code: code || null,
			version: version || null,
			memo: memo || null,
			price: Number.isNaN(price) ? 0 : price,
			photoFileListId,
			protocolId
		}).returning({ productId: products.productId });

		const newProductId = result[0]?.productId;
		if (!newProductId) {
			return {
				success: false,
				message: '제품 생성에 실패했습니다.'
			};
		}

		// 입고/출고 기록 저장
		const inventoryData = formData.get('inventoryData')?.toString();
		if (inventoryData) {
			try {
				const inventoryArray = JSON.parse(inventoryData);
				if (Array.isArray(inventoryArray) && inventoryArray.length > 0) {
					await db.insert(productInventory).values(
						inventoryArray.map((inv: any) => ({
							productId: newProductId,
							type: inv.type || 'in',
							content: inv.content || null,
							date: inv.date || null,
							quantity: inv.quantity || 0
						}))
					);
				}
			} catch (error) {
				console.error('Error saving inventory:', error);
			}
		}

		return {
			success: true
		};
	},
	updateProduct: async ({ request }) => {
		const formData = await request.formData();

		const id = formData.get('id')?.toString();
		if (!id) {
			return {
				success: false,
				message: '제품 ID가 필요합니다.'
			};
		}

		const name = (formData.get('productName') ?? '').toString().trim();
		const code = (formData.get('productCode') ?? '').toString().trim();
		const version = (formData.get('productVersion') ?? '').toString().trim();
		const memo = (formData.get('productMemo') ?? '').toString().trim();
		const priceRaw = (formData.get('productPrice') ?? '').toString().trim();
		const protocolIdRaw = (formData.get('productFirmwareId') ?? '').toString().trim();
		const protocolId = protocolIdRaw ? Number(protocolIdRaw) : null;
		if (!name) {
			return {
				success: false,
				message: '제품명을 입력하세요.'
			};
		}

		const price = priceRaw ? Number(priceRaw) : 0;

		// 기존 항목 조회 (삭제되지 않은 것만)
		const existingProduct = await db
			.select()
			.from(products)
			.where(and(eq(products.productId, Number(id)), isNull(products.deletedAt)))
			.limit(1)
			.then(rows => rows[0]);

		if (!existingProduct) {
			return {
				success: false,
				message: '제품을 찾을 수 없습니다.'
			};
		}

		const { fileListId: photoFileListId, error: fileError } = await updateFileAttachment({
			formData,
			fieldName: 'productFile',
			removeFieldName: 'removeProductFile',
			category: 'products',
			currentFileListId: existingProduct.photoFileListId
		});
		if (fileError) return fileError;

		const productId = Number(id);

		await db
			.update(products)
			.set({
				name,
				code: code || null,
				version: version || null,
				memo: memo || null,
				price: Number.isNaN(price) ? 0 : price,
				photoFileListId,
				protocolId
			})
			.where(eq(products.productId, productId));

		// 입고/출고 기록 삭제 후 재삽입
		await db.delete(productInventory).where(eq(productInventory.productId, productId));

		const inventoryData = formData.get('inventoryData')?.toString();
		if (inventoryData) {
			try {
				const inventoryArray = JSON.parse(inventoryData);
				if (Array.isArray(inventoryArray) && inventoryArray.length > 0) {
					await db.insert(productInventory).values(
						inventoryArray.map((inv: any) => ({
							productId,
							type: inv.type || 'in',
							content: inv.content || null,
							date: inv.date || null,
							quantity: inv.quantity || 0
						}))
					);
				}
			} catch (error) {
				console.error('Error saving inventory:', error);
			}
		}

		return {
			success: true
		};
	},
	deleteProducts: async ({ request }) => {
		const formData = await request.formData();
		return softDeleteWithFiles({
			table: products,
			idColumn: products.productId,
			ids: parseDeleteIds(formData),
			fileColumns: [products.photoFileListId]
		});
	}
};