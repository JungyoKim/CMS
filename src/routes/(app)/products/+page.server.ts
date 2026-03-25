import type { Actions, PageServerLoad } from './$types';
import { db } from '$lib/server/db';
import { products, protocols, productInventory, files } from '$lib/server/db/schema';
import { handleFileUpload, saveFileToList } from '$lib/server/file-storage';
import { batchFetchFileNames, escapeLike, parseListParams, withSoftDelete, paginatedQuery } from '$lib/server/query-helpers';
import { softDeleteWithFiles, parseDeleteIds } from '$lib/server/crud-helpers';
import { eq, inArray, like, sql, or, and, isNull } from 'drizzle-orm';

export const load: PageServerLoad = async ({ url, depends, parent }) => {
	const { defaultPageSize } = await parent();
	depends('products:update');

	const { searchQuery, searchField, page, pageSize, offset } = parseListParams(url, defaultPageSize, 'productName');

	// 펌웨어 목록 가져오기 (검색용, 삭제되지 않은 것만)
	const firmwareList = await db.select({
		id: protocols.protocolId,
		name: protocols.name
	}).from(protocols).where(isNull(protocols.deletedAt));

	// 검색 조건 구성
	let searchCondition = undefined;
	if (searchQuery.trim()) {
		const conditions = [];
		const escaped = escapeLike(searchQuery);
		if (searchField === 'productName') {
			conditions.push(like(products.name, `%${escaped}%`));
		} else if (searchField === 'productCode') {
			conditions.push(like(products.code, `%${escaped}%`));
		} else if (searchField === 'memo') {
			conditions.push(like(products.memo, `%${escaped}%`));
		} else if (searchField === 'price') {
			const priceNum = parseInt(searchQuery, 10);
			if (!isNaN(priceNum)) {
				conditions.push(eq(products.price, priceNum));
			}
		} else if (searchField === 'photoFileName') {
			const searchLower = escapeLike(searchQuery.toLowerCase());
			conditions.push(sql`EXISTS (
				SELECT 1 FROM files f
				WHERE f.FILE_LIST_ID = ${products.photoFileListId}
				AND f.deleted_at IS NULL
				AND LOWER(f.original_file_name) LIKE ${'%' + searchLower + '%'}
			)`);
		} else if (searchField === 'protocolId') {
			const searchLower = searchQuery.toLowerCase();
			const matchingFirmwareIds = firmwareList
				.filter(f => f.name && f.name.toLowerCase().includes(searchLower))
				.map(f => f.id);
			if (matchingFirmwareIds.length > 0) {
				conditions.push(inArray(products.protocolId, matchingFirmwareIds));
			} else {
				conditions.push(sql`1 = 0`);
			}
		} else if (searchField === 'totalQuantity') {
			conditions.push(sql`CAST((
				SELECT COALESCE(SUM(CASE WHEN type = 'in' THEN quantity ELSE -quantity END), 0)
				FROM product_inventory
				WHERE product_id = ${products.productId}
				AND deleted_at IS NULL
			) AS TEXT) LIKE ${'%' + escapeLike(searchQuery) + '%'}`);
		}
		if (conditions.length > 0) {
			searchCondition = or(...conditions);
		}
	}

	const where = withSoftDelete(products.deletedAt, searchCondition);
	const { totalCount, rows } = await paginatedQuery(products, { where, orderBy: products.productId, limit: pageSize, offset });

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

		let newProductId: number | undefined;
		try {
			newProductId = await db.transaction(async (tx) => {
				const result = await tx.insert(products).values({
					name,
					code: code || null,
					version: version || null,
					memo: memo || null,
					price: Number.isNaN(price) ? 0 : price,
					photoFileListId,
					protocolId
				}).returning({ productId: products.productId });

				const productId = result[0]?.productId;
				if (!productId) throw new Error('제품 생성에 실패했습니다.');

				// 입고/출고 기록 저장
				const inventoryData = formData.get('inventoryData')?.toString();
				if (inventoryData) {
					const inventoryArray = JSON.parse(inventoryData);
					if (Array.isArray(inventoryArray) && inventoryArray.length > 0) {
						await tx.insert(productInventory).values(
							inventoryArray.map((inv: any) => ({
								productId,
								type: inv.type || 'in',
								content: inv.content || null,
								date: inv.date || null,
								quantity: inv.quantity || 0
							}))
						);
					}
				}

				return productId;
			});
		} catch {
			return { success: false, message: '제품 생성 중 오류가 발생했습니다.' };
		}

		if (!newProductId) {
			return { success: false, message: '제품 생성에 실패했습니다.' };
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

		// 새 파일 업로드 - 트랜잭션 밖에서 (disk I/O)
		const productFile = formData.get('productFile');
		let newPhotoFileListId: string | null = null;
		if (productFile instanceof File && productFile.size > 0) {
			try {
				newPhotoFileListId = await saveFileToList({ file: productFile, category: 'products' });
			} catch {
				return { success: false, message: '파일 저장에 실패했습니다.' };
			}
		}
		const removeProductFile = formData.get('removeProductFile') === 'true';

		const productId = Number(id);

		// 파일 soft-delete + DB 업데이트를 트랜잭션으로 묶음
		try {
			await db.transaction(async (tx) => {
				let photoFileListId = existingProduct.photoFileListId;
				if (newPhotoFileListId) {
					if (photoFileListId) {
						await tx.update(files).set({ deletedAt: new Date().toISOString() }).where(and(eq(files.fileListId, photoFileListId), isNull(files.deletedAt)));
					}
					photoFileListId = newPhotoFileListId;
				} else if (removeProductFile && photoFileListId) {
					await tx.update(files).set({ deletedAt: new Date().toISOString() }).where(and(eq(files.fileListId, photoFileListId), isNull(files.deletedAt)));
					photoFileListId = null;
				}

				await tx
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
				await tx.delete(productInventory).where(eq(productInventory.productId, productId));

				const inventoryData = formData.get('inventoryData')?.toString();
				if (inventoryData) {
					const inventoryArray = JSON.parse(inventoryData);
					if (Array.isArray(inventoryArray) && inventoryArray.length > 0) {
						await tx.insert(productInventory).values(
							inventoryArray.map((inv: any) => ({
								productId,
								type: inv.type || 'in',
								content: inv.content || null,
								date: inv.date || null,
								quantity: inv.quantity || 0
							}))
						);
					}
				}
			});
		} catch {
			return { success: false, message: '제품 수정 중 오류가 발생했습니다.' };
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