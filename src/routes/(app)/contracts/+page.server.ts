import type { Actions, PageServerLoad } from './$types';
import { db } from '$lib/server/db';
import { contracts, clients, products, protocols, files, asRecords } from '$lib/server/db/schema';
import { saveFileToList } from '$lib/server/file-storage';
import { softDeleteWithFiles, parseDeleteIds } from '$lib/server/crud-helpers';
import { eq, like, sql, count, or, and, isNull, desc } from 'drizzle-orm';
import {
	createClientName,
	calculateASStatus,
	batchFetchASRecords,
	batchFetchRooms,
	batchFetchRepeaters,
	batchFetchInstallProducts,
	batchFetchClients,
	batchFetchDocuments,
	batchFetchFileNames,
	escapeLike
} from '$lib/server/query-helpers';
import {
	parseContractFormData,
	toContractDbValues,
	updateClientContacts,
	saveSubData,
	saveDocuments
} from './contract-helpers';

export const load: PageServerLoad = async ({ url, depends, parent }) => {
	const { defaultPageSize } = await parent();
	// 페이지 이동 시마다 최신 데이터를 가져오도록 depends 추가
	depends('contracts:update');
	depends('clients:update'); // 고객사 정보도 함께 갱신
	depends('products:update'); // 제품 목록도 함께 갱신
	depends('firmware:update'); // 펌웨어 목록도 함께 갱신
	// URL 쿼리 파라미터에서 검색어, 검색 필드, 페이지 정보 가져오기
	const searchQuery = url.searchParams.get('search') || '';
	const searchField = url.searchParams.get('field') || 'name';
	const page = Math.max(1, parseInt(url.searchParams.get('page') || '1', 10));
	const pageSizeRaw = parseInt(url.searchParams.get('pageSize') || String(defaultPageSize), 10);
	const pageSize = isNaN(pageSizeRaw) || pageSizeRaw <= 0 ? defaultPageSize : pageSizeRaw;

	// 검색 조건 구성
	let whereCondition = undefined;
	if (searchQuery.trim()) {
		const conditions = [];
		const escaped = escapeLike(searchQuery);
		if (searchField === 'name') {
			// 계약명 검색
			conditions.push(like(contracts.name, `%${escaped}%`));
		} else if (searchField === 'customerName') {
			// 고객사명 검색 - clients 테이블과 조인 필요
			conditions.push(like(clients.name1, `%${escaped}%`));
			conditions.push(like(clients.name2, `%${escaped}%`));
			conditions.push(like(clients.name3, `%${escaped}%`));
			conditions.push(like(clients.name4, `%${escaped}%`));
			conditions.push(like(clients.name5, `%${escaped}%`));
		} else if (searchField === 'phone') {
			// 연락처 검색 - clients 테이블의 mainContactPhone (하이픈 무시)
			const cleanQuery = escapeLike(searchQuery.replace(/-/g, ''));
			conditions.push(sql`replace(${clients.mainContactPhone}, '-', '') LIKE ${'%' + cleanQuery + '%'}`);
		} else if (searchField === 'email') {
			// 이메일 검색 - clients 테이블의 mainContactEmail
			conditions.push(like(clients.mainContactEmail, `%${escaped}%`));
		} else if (searchField === 'address') {
			// 주소 검색 - clients 테이블의 address
			conditions.push(like(clients.address, `%${escaped}%`));
		} else if (searchField === 'customerStatus') {
			// 고객상태 검색 - contracts 테이블의 status 필드
			// searchQuery는 "pre-sales", "active", "terminated" 중 하나
			conditions.push(eq(contracts.status, searchQuery));
		} else if (searchField === 'attachmentFileName') {
			// 첨부파일명 검색 - files 테이블과 EXISTS 서브쿼리
			const searchLower = escapeLike(searchQuery.toLowerCase());
			conditions.push(sql`EXISTS (
				SELECT 1 FROM files f
				WHERE f.FILE_LIST_ID = ${contracts.attachmentFileListId}
				AND f.deleted_at IS NULL
				AND LOWER(f.original_file_name) LIKE ${'%' + searchLower + '%'}
			)`);
		} else if (searchField === 'asStatus') {
			// AS 상태 검색 - as_records 테이블과 EXISTS 서브쿼리
			if (searchQuery === '없음') {
				conditions.push(sql`NOT EXISTS (
					SELECT 1 FROM as_records ar
					WHERE ar.CONTRACT_ID = ${contracts.contractId}
				)`);
			} else if (searchQuery === '진행중') {
				conditions.push(sql`EXISTS (
					SELECT 1 FROM as_records ar
					WHERE ar.CONTRACT_ID = ${contracts.contractId}
					AND (ar.is_completed = 0 OR ar.is_completed IS NULL)
				)`);
			} else if (searchQuery === '완료') {
				conditions.push(sql`EXISTS (
					SELECT 1 FROM as_records ar WHERE ar.CONTRACT_ID = ${contracts.contractId}
				) AND NOT EXISTS (
					SELECT 1 FROM as_records ar
					WHERE ar.CONTRACT_ID = ${contracts.contractId}
					AND (ar.is_completed = 0 OR ar.is_completed IS NULL)
				)`);
			}
		}
		if (conditions.length > 0) {
			whereCondition = or(...conditions);
		}
	}

	const deletedAtCondition = isNull(contracts.deletedAt);
	const finalWhereCondition = whereCondition
		? and(whereCondition, deletedAtCondition)
		: deletedAtCondition;

	const offset = (page - 1) * pageSize;

	// DB 레벨 페이지네이션
	const baseQuery = db
		.select({
			contract: contracts,
			client: clients
		})
		.from(contracts)
		.leftJoin(clients, eq(contracts.clientId, clients.clientId))
		.where(finalWhereCondition);

	const [countResult, rows] = await Promise.all([
		db.select({ count: count() })
			.from(contracts)
			.leftJoin(clients, eq(contracts.clientId, clients.clientId))
			.where(finalWhereCondition),
		baseQuery.orderBy(desc(contracts.contractId)).limit(pageSize).offset(offset)
	]);

	const totalCount = countResult[0]?.count ?? 0;

	// 일괄 조회 최적화: 필요한 모든 데이터를 미리 가져오기
	const contractIds = rows.map(r => r.contract.contractId);
	const orderClientIds = rows
		.map(r => r.contract.orderClientId)
		.filter((id): id is number => id !== null && id !== undefined);
	const attachmentFileListIds = rows.map(r => r.contract.attachmentFileListId);

	// 병렬로 모든 배치 쿼리 실행
	const [
		roomsMap,
		repeatersMap,
		installProductsMap,
		asRecordsMap,
		documentsMap,
		orderClientsMap,
		fileNamesMap
	] = await Promise.all([
		batchFetchRooms(contractIds),
		batchFetchRepeaters(contractIds),
		batchFetchInstallProducts(contractIds),
		batchFetchASRecords(contractIds),
		batchFetchDocuments(contractIds),
		batchFetchClients(orderClientIds),
		batchFetchFileNames(attachmentFileListIds)
	]);

	// AS 기록의 첨부파일 이름 가져오기
	const asFileListIds: string[] = [];
	for (const records of asRecordsMap.values()) {
		for (const r of records) {
			if (r.fileListId) asFileListIds.push(r.fileListId);
		}
	}
	const asFileNamesMap = await batchFetchFileNames(asFileListIds);

	// 동기적으로 데이터 매핑 (쿼리 없음)
	const items = rows.map((row) => {
		const contractId = row.contract.contractId;

		// 고객사명 생성
		const customerName = createClientName(row.client);

		// 첨부파일명
		const attachmentFileNames = row.contract.attachmentFileListId
			? fileNamesMap.get(row.contract.attachmentFileListId) || []
			: [];

		// 발주처 정보
		const orderClient = row.contract.orderClientId
			? orderClientsMap.get(row.contract.orderClientId) || null
			: null;

		// 하위 데이터
		const roomsData = roomsMap.get(contractId) || [];
		const repeatersData = repeatersMap.get(contractId) || [];
		const installProductsData = installProductsMap.get(contractId) || [];
		const asRecordsData = asRecordsMap.get(contractId) || [];
		const documentsData = documentsMap.get(contractId) || [];

		// AS 상태 계산
		const { status: asStatus, incompleteCount: asIncompleteCount } = calculateASStatus(asRecordsData);

		return {
			id: contractId,
			customerName,
			phone: row.client?.mainContactPhone ?? '',
			email: row.client?.mainContactEmail ?? '',
			address: row.client?.address ?? '',
			asStatus,
			asIncompleteCount,
			customerStatus: row.contract.status ?? '',
			attachmentFileName: attachmentFileNames[0] || null,
			attachmentFileListId: row.contract.attachmentFileListId,
			// 편집용 전체 데이터
			name: row.contract.name ?? '',
			status: row.contract.status ?? '',
			contractDate: row.contract.contractDate ?? '',
			cancelDate: row.contract.cancelDate ?? '',
			salesStartDate: row.contract.salesStartDate ?? '',
			deposit: row.contract.deposit ?? 0,
			prepayment: row.contract.prepayment ?? 0,
			interimPaymentsData: row.contract.interimPaymentsData ?? null,
			balance: row.contract.balance ?? 0,
			taxInvoiceDate: row.contract.taxInvoiceDate ?? '',
			maintenanceMonthlyAmount: row.contract.maintenanceMonthlyAmount ?? 0,
			billingDayOfMonth: row.contract.billingDayOfMonth ?? null,
			managerName: row.contract.managerName ?? '',
			managerPhone: row.contract.managerPhone ?? '',
			managerEmail: row.contract.managerEmail ?? '',
			buildStartDate: row.contract.buildStartDate ?? '',
			buildEndDate: row.contract.buildEndDate ?? '',
			installerCompany: row.contract.installerCompany ?? '',
			installerName: row.contract.installerName ?? '',
			installerPhone: row.contract.installerPhone ?? '',
			taxInvoiceAmount: row.contract.taxInvoiceAmount ?? 0,
			taxInvoiceIssueDate: row.contract.taxInvoiceIssueDate ?? '',
			taxInvoiceDepositDate: row.contract.taxInvoiceDepositDate ?? '',
			buildingInfo: row.contract.buildingInfo ?? '',
			otherMemo: row.contract.otherMemo ?? '',
			customerMemo: row.contract.customerMemo ?? '',
			taxInvoicesData: row.contract.taxInvoicesData ?? '',
			clientId: row.contract.clientId ?? null,
			orderClientId: row.contract.orderClientId ?? null,
			customerContactName: row.client?.mainContactName ?? '',
			customerContactPosition: row.client?.mainContactPosition ?? '',
			customerContactPhone: row.client?.mainContactPhone ?? '',
			customerContactEmail: row.client?.mainContactEmail ?? '',
			customerAddress: row.client?.address ?? '',
			ordererContactName: orderClient?.mainContactName ?? '',
			ordererContactPosition: orderClient?.mainContactPosition ?? '',
			ordererContactPhone: orderClient?.mainContactPhone ?? '',
			ordererContactEmail: orderClient?.mainContactEmail ?? '',
			ordererAddress: orderClient?.address ?? '',
			// 객실, 중계기, 설치제품 데이터
			roomsData: roomsData.map(r => ({
				building: r.buildingName || '',
				room: r.roomNumber || '',
				roomId: r.roomCode || '',
				memo: r.memo || ''
			})),
			repeatersData: repeatersData.map(r => ({
				repeaterId: r.repeaterCode || '',
				room: r.roomNumbersMemo || '',
				memo: r.memo || ''
			})),
			installProductsData: installProductsData.map(p => ({
				productId: p.productId ? String(p.productId) : '',
				firmwareId: p.protocolId ? String(p.protocolId) : '',
				quantity: p.quantity || 0,
				memo: p.memo || ''
			})),
			// AS기록 데이터
			asRecordsData: asRecordsData.map(r => ({
				requestDate: r.requestDate || '',
				requestContent: r.requestContent || '',
				responseDate: r.responseDate || '',
				responseContent: r.responseContent || '',
				cost: r.cost ? String(r.cost) : '',
				isCompleted: r.isCompleted === 1,
				fileListId: r.fileListId,
				photoFileName: r.fileListId ? (asFileNamesMap.get(r.fileListId)?.[0] || null) : null
			})),
			// 관련문서 데이터
			documentsData: documentsData
		};
	});

	// 고객사 목록 가져오기 (Combobox용, 삭제되지 않은 것만)
	const clientRows = await db.select({
		id: clients.clientId,
		name1: clients.name1,
		name2: clients.name2,
		name3: clients.name3,
		name4: clients.name4,
		name5: clients.name5,
		mainContactName: clients.mainContactName,
		mainContactPosition: clients.mainContactPosition,
		mainContactPhone: clients.mainContactPhone,
		mainContactEmail: clients.mainContactEmail,
		subContactName: clients.subContactName,
		subContactPosition: clients.subContactPosition,
		subContactPhone: clients.subContactPhone,
		subContactEmail: clients.subContactEmail,
		address: clients.address
	}).from(clients).where(isNull(clients.deletedAt));

	// 고객사명 합치기
	const clientList = clientRows.map(row => {
		const nameParts = [
			row.name1,
			row.name2,
			row.name3,
			row.name4,
			row.name5
		].filter(Boolean);
		const name = nameParts.join(' ') || `고객사 ${row.id}`;
		return {
			id: row.id,
			name,
			name1: row.name1,
			name2: row.name2,
			name3: row.name3,
			name4: row.name4,
			name5: row.name5,
			mainContactName: row.mainContactName,
			mainContactPosition: row.mainContactPosition,
			mainContactPhone: row.mainContactPhone,
			mainContactEmail: row.mainContactEmail,
			subContactName: row.subContactName,
			subContactPosition: row.subContactPosition,
			subContactPhone: row.subContactPhone,
			subContactEmail: row.subContactEmail,
			address: row.address
		};
	});

	// 제품 목록 가져오기 (납품 제품 선택용, 삭제되지 않은 것만)
	const productList = await db.select({
		id: products.productId,
		name: products.name
	}).from(products).where(isNull(products.deletedAt));

	// 펌웨어 목록 가져오기 (납품 제품 펌웨어 선택용, 삭제되지 않은 것만)
	const firmwareList = await db.select({
		id: protocols.protocolId,
		name: protocols.name
	}).from(protocols).where(isNull(protocols.deletedAt));

	return {
		contracts: items,
		totalCount,
		page,
		pageSize,
		clientList,
		productList,
		firmwareList
	};
};

export const actions: Actions = {
	createContract: async ({ request }) => {
		const formData = await request.formData();
		const data = parseContractFormData(formData);

		if (!data.name) {
			return { success: false, message: '계약명을 입력하세요.' };
		}

		// 첨부파일 저장
		let attachmentFileListId: string | null = null;
		const file = formData.get('attachmentFile');
		if (file instanceof File && file.size > 0) {
			try {
				attachmentFileListId = await saveFileToList({ file, category: 'contracts' });
			} catch {
				return { success: false, message: '파일 저장에 실패했습니다.' };
			}
		}

		let newContractId: number | undefined;
		try {
			newContractId = await db.transaction(async (tx) => {
				const result = await tx.insert(contracts).values({
					...toContractDbValues(data),
					attachmentFileListId
				}).returning({ contractId: contracts.contractId });

				const contractId = result[0]?.contractId;
				if (!contractId) throw new Error('계약 생성에 실패했습니다.');

				await updateClientContacts(tx, formData, data.clientId, data.orderClientId);
				await saveSubData(tx, contractId, formData);

				return contractId;
			});
		} catch {
			return { success: false, message: '계약 생성 중 오류가 발생했습니다.' };
		}

		if (newContractId) {
			try {
				await saveDocuments(newContractId, formData);
			} catch {
				return { success: false, message: '관련문서 저장에 실패했습니다.' };
			}
		}

		return { success: true };
	},
	updateContract: async ({ request }) => {
		const formData = await request.formData();

		const id = formData.get('id')?.toString();
		if (!id) {
			return { success: false, message: '계약 ID가 필요합니다.' };
		}

		const data = parseContractFormData(formData);
		if (!data.name) {
			return { success: false, message: '계약명을 입력하세요.' };
		}

		// 기존 항목 조회
		const existingContract = await db
			.select()
			.from(contracts)
			.where(and(eq(contracts.contractId, Number(id)), isNull(contracts.deletedAt)))
			.limit(1)
			.then(rows => rows[0]);

		if (!existingContract) {
			return { success: false, message: '계약을 찾을 수 없습니다.' };
		}

		// 첨부파일 처리 - 새 파일 업로드는 트랜잭션 밖에서 (disk I/O)
		const attachmentFile = formData.get('attachmentFile');
		let newAttachmentFileListId: string | null = null;
		if (attachmentFile instanceof File && attachmentFile.size > 0) {
			try {
				newAttachmentFileListId = await saveFileToList({ file: attachmentFile, category: 'contracts' });
			} catch {
				return { success: false, message: '파일 저장에 실패했습니다.' };
			}
		}
		const removeAttachment = formData.get('removeAttachmentFile') === 'true';

		// clientId가 빈 문자열이면 기존 값 사용
		const finalClientId = (data.clientId && data.clientId.trim() !== '') ? data.clientId : (existingContract.clientId ? String(existingContract.clientId) : null);
		const finalOrderClientId = (data.orderClientId && data.orderClientId.trim() !== '') ? data.orderClientId : (existingContract.orderClientId ? String(existingContract.orderClientId) : null);

		const contractId = Number(id);
		try {
			await db.transaction(async (tx) => {
				// 파일 soft-delete는 트랜잭션 안에서 (DB 업데이트와 원자적으로)
				let attachmentFileListId = existingContract.attachmentFileListId;
				if (newAttachmentFileListId) {
					if (attachmentFileListId) {
						await tx.update(files).set({ deletedAt: new Date().toISOString() }).where(and(eq(files.fileListId, attachmentFileListId), isNull(files.deletedAt)));
					}
					attachmentFileListId = newAttachmentFileListId;
				} else if (removeAttachment && attachmentFileListId) {
					await tx.update(files).set({ deletedAt: new Date().toISOString() }).where(and(eq(files.fileListId, attachmentFileListId), isNull(files.deletedAt)));
					attachmentFileListId = null;
				}

				await tx.update(contracts).set({
					...toContractDbValues(data),
					clientId: finalClientId ? Number(finalClientId) : null,
					orderClientId: finalOrderClientId ? Number(finalOrderClientId) : null,
					attachmentFileListId
				}).where(eq(contracts.contractId, contractId));

				await updateClientContacts(tx, formData, finalClientId, finalOrderClientId);
				await saveSubData(tx, contractId, formData, true);
			});
		} catch {
			return { success: false, message: '계약 수정 중 오류가 발생했습니다.' };
		}

		try {
			await saveDocuments(contractId, formData);
		} catch {
			return { success: false, message: '관련문서 저장에 실패했습니다.' };
		}

		return { success: true };
	},
	deleteContracts: async ({ request }) => {
		const formData = await request.formData();
		return softDeleteWithFiles({
			table: contracts,
			idColumn: contracts.contractId,
			ids: parseDeleteIds(formData),
			fileColumns: [contracts.attachmentFileListId]
		});
	}
};
