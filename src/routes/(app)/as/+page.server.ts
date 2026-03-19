import type { Actions, PageServerLoad } from './$types';
import { db } from '$lib/server/db';
import { asRecords, contracts, clients, products, protocols } from '$lib/server/db/schema';
import { handleFileUpload, getFileNamesByListId, deleteFilesByListId } from '$lib/server/file-storage';
import { eq, and, isNull, isNotNull, desc, or, like, count, inArray, gte, lte } from 'drizzle-orm';

import { alias } from 'drizzle-orm/sqlite-core';

export const load: PageServerLoad = async ({ url, depends, parent }) => {
	const { defaultPageSize } = await parent();
	// 페이지 이동 시마다 최신 데이터를 가져오도록 depends 추가
	depends('as:update');
	depends('asRecords:update');
	depends('contracts:update');
	depends('clients:update');

	// URL 쿼리 파라미터에서 검색어, 검색 필드, 페이지 정보 가져오기
	let searchQuery = url.searchParams.get('search') || '';
	const searchField = url.searchParams.get('field') || 'customerName';

	// 상태 검색어 영문 -> 한글 변환
	if (searchField === 'status') {
		if (searchQuery === 'processing') searchQuery = '진행중';
		if (searchQuery === 'completed') searchQuery = '완료';
	}
	let startDate = url.searchParams.get('startDate');
	let endDate = url.searchParams.get('endDate');

	// 날짜 검색 처리: 콤마가 있으면 범위(start,end), 없으면 단일 날짜(exact match)로 처리
	if ((searchField === 'requestDate' || searchField === 'responseDate') && searchQuery) {
		if (searchQuery.includes(',')) {
			const parts = searchQuery.split(',');
			if (parts.length === 2) {
				startDate = parts[0].trim();
				endDate = parts[1].trim();
			}
		} else {
			startDate = searchQuery.trim();
			endDate = searchQuery.trim();
		}
	}
	const page = Math.max(1, parseInt(url.searchParams.get('page') || '1', 10));
	const pageSize = parseInt(url.searchParams.get('pageSize') || String(defaultPageSize), 10);
	const offset = (page - 1) * pageSize;

	// clients 테이블 별칭 생성 (계약 고객사 vs 단일 AS 고객사 구분)
	const contractClients = alias(clients, 'contractClients');
	const directClients = alias(clients, 'directClients');

	// 검색 필드별 JOIN 필요 여부 결정
	const needsFullJoin = searchField === 'customerName';
	const needsContractJoin = searchField === 'contractName' || needsFullJoin;
	const isAsRecordOnlySearch = ['requestContent', 'responseContent', 'requestDate', 'responseDate', 'status'].includes(searchField);

	// 기본 WHERE 조건 (JOIN이 필요한 경우와 아닌 경우 분리)
	const baseConditionWithJoin = or(
		isNull(asRecords.contractId),
		and(isNotNull(asRecords.contractId), isNull(contracts.deletedAt))
	);

	// asRecords만 검색하는 경우의 기본 조건 (deleted contracts 제외는 메인 쿼리에서 처리)
	const baseConditionSimple = undefined;

	// 검색 조건 구성 (DB SQL용)
	let searchCondition = undefined;
	if (searchQuery.trim()) {
		const q = `%${searchQuery}%`;
		switch (searchField) {
			case 'customerName':
				searchCondition = or(
					like(contractClients.name1, q),
					like(contractClients.name2, q),
					like(contractClients.name3, q),
					like(contractClients.name4, q),
					like(contractClients.name5, q),
					like(directClients.name1, q),
					like(directClients.name2, q),
					like(directClients.name3, q),
					like(directClients.name4, q),
					like(directClients.name5, q)
				);
				break;
			case 'contractName':
				searchCondition = like(contracts.name, q);
				break;
			case 'requestContent':
				searchCondition = like(asRecords.requestContent, q);
				break;
			case 'responseContent':
				searchCondition = like(asRecords.responseContent, q);
				break;
			case 'requestDate':
				if (startDate && endDate) {
					searchCondition = and(gte(asRecords.requestDate, startDate), lte(asRecords.requestDate, endDate));
				} else if (startDate) {
					searchCondition = gte(asRecords.requestDate, startDate);
				} else if (endDate) {
					searchCondition = lte(asRecords.requestDate, endDate);
				}
				break;
			case 'responseDate':
				if (startDate && endDate) {
					searchCondition = and(gte(asRecords.responseDate, startDate), lte(asRecords.responseDate, endDate));
				} else if (startDate) {
					searchCondition = gte(asRecords.responseDate, startDate);
				} else if (endDate) {
					searchCondition = lte(asRecords.responseDate, endDate);
				}
				break;
			case 'status':
				if (searchQuery === '완료') {
					searchCondition = eq(asRecords.isCompleted, 1);
				} else if (searchQuery === '진행중') {
					searchCondition = or(eq(asRecords.isCompleted, 0), isNull(asRecords.isCompleted));
				}
				break;
		}
	}

	// 최종 조건 결합
	const finalConditionWithJoin = searchCondition ? and(baseConditionWithJoin, searchCondition) : baseConditionWithJoin;
	const finalConditionSimple = searchCondition || baseConditionSimple;

	// Count 쿼리 최적화: 검색 필드에 따라 필요한 JOIN만 수행
	async function getOptimizedCount(): Promise<number> {
		if (isAsRecordOnlySearch && searchQuery.trim()) {
			// asRecords 필드만 검색하는 경우 - JOIN 없이 count
			const result = await db
				.select({ count: count() })
				.from(asRecords)
				.where(finalConditionSimple);
			return result[0]?.count ?? 0;
		} else if (searchField === 'contractName' && searchQuery.trim()) {
			// 계약명 검색 - contracts만 JOIN
			const result = await db
				.select({ count: count() })
				.from(asRecords)
				.leftJoin(contracts, eq(asRecords.contractId, contracts.contractId))
				.where(finalConditionWithJoin);
			return result[0]?.count ?? 0;
		} else {
			// 고객사명 검색 또는 검색어 없음 - 전체 JOIN
			const result = await db
				.select({ count: count() })
				.from(asRecords)
				.leftJoin(contracts, eq(asRecords.contractId, contracts.contractId))
				.leftJoin(contractClients, eq(contracts.clientId, contractClients.clientId))
				.leftJoin(directClients, eq(asRecords.clientId, directClients.clientId))
				.where(finalConditionWithJoin);
			return result[0]?.count ?? 0;
		}
	}

	// 병렬로 AS 데이터 + Count 조회
	const [asResults, totalCount] = await Promise.all([
		// 1. AS 레코드 메인 쿼리 (항상 전체 JOIN - 고객사명/계약명 표시 필요)
		db
			.select({
				asRecord: asRecords,
				contract: contracts,
				contractClient: contractClients,
				directClient: directClients
			})
			.from(asRecords)
			.leftJoin(contracts, eq(asRecords.contractId, contracts.contractId))
			.leftJoin(contractClients, eq(contracts.clientId, contractClients.clientId))
			.leftJoin(directClients, eq(asRecords.clientId, directClients.clientId))
			.where(finalConditionWithJoin)
			.orderBy(desc(asRecords.requestDate), desc(asRecords.asId))
			.limit(pageSize)
			.offset(offset),

		// 2. 최적화된 Count 쿼리
		getOptimizedCount()
	]);

	// 데이터 포맷팅
	const items = await Promise.all(
		asResults.map(async (row: typeof asResults[number]) => {
			const { asRecord, contract, contractClient, directClient } = row;

			// 계약 고객사가 있으면 우선, 없으면 단일 고객사
			const client = contractClient || directClient;
			const customerName = [client?.name1, client?.name2, client?.name3, client?.name4, client?.name5]
				.filter(Boolean)
				.join(' ') || '-';

			const photoFileNames = await getFileNamesByListId(asRecord.fileListId);

			return {
				id: asRecord.asId,
				contractId: asRecord.contractId,
				clientId: asRecord.clientId,
				customerName,
				contractName: contract?.name || (asRecord.contractId === null ? '단일 AS' : '-'),
				requestDate: asRecord.requestDate || '',
				requestContent: asRecord.requestContent || '',
				responseDate: asRecord.responseDate || '',
				responseContent: asRecord.responseContent || '',
				cost: asRecord.cost || 0,
				isCompleted: asRecord.isCompleted === 1,
				photoFileName: photoFileNames[0] || null,
				photoFileListId: asRecord.fileListId
			};
		})
	);

	return {
		asRecords: items,
		totalCount,
		page,
		pageSize,
		contractList: [],
		clientList: [],
		productList: [],
		firmwareList: []
	};

};

export const actions: Actions = {
	createASRecord: async ({ request }) => {
		const formData = await request.formData();

		const asType = formData.get('asType')?.toString(); // 'contract' or 'single'
		const contractId = formData.get('contractId')?.toString();
		const clientId = formData.get('clientId')?.toString();
		const requestDate = formData.get('requestDate')?.toString() || null;
		const requestContent = formData.get('requestContent')?.toString() || null;
		const responseDate = formData.get('responseDate')?.toString() || null;
		const responseContent = formData.get('responseContent')?.toString() || null;
		const cost = parseInt(formData.get('cost')?.toString() || '0', 10);
		const isCompleted = formData.get('isCompleted')?.toString() === '1' ? 1 : 0;
		if (asType === 'contract' && !contractId) {
			return {
				success: false,
				message: '계약을 선택하세요.'
			};
		}

		if (asType === 'single' && !clientId) {
			return {
				success: false,
				message: '고객사를 선택하세요.'
			};
		}

		const { fileListId, error: fileError } = await handleFileUpload(formData, 'asFile', 'as');
		if (fileError) return fileError;

		// AS 기록 생성
		await db.insert(asRecords).values({
			contractId: asType === 'contract' && contractId ? parseInt(contractId, 10) : null,
			clientId: asType === 'single' && clientId ? parseInt(clientId, 10) : null,
			requestDate,
			requestContent,
			responseDate,
			responseContent,
			cost,
			isCompleted,
			fileListId
		});


		return {
			success: true
		};
	},
	updateASRecord: async ({ request }) => {
		const formData = await request.formData();

		const id = parseInt(formData.get('id')?.toString() || '', 10);
		const asType = formData.get('asType')?.toString();
		const contractId = formData.get('contractId')?.toString();
		const clientId = formData.get('clientId')?.toString();
		const requestDate = formData.get('requestDate')?.toString() || null;
		const requestContent = formData.get('requestContent')?.toString() || null;
		const responseDate = formData.get('responseDate')?.toString() || null;
		const responseContent = formData.get('responseContent')?.toString() || null;
		const cost = parseInt(formData.get('cost')?.toString() || '0', 10);
		const isCompleted = formData.get('isCompleted')?.toString() === '1' ? 1 : 0;
		const removeFile = formData.get('removeAsFile') === 'true';

		if (Number.isNaN(id)) {
			return {
				success: false,
				message: '수정할 AS 기록이 올바르지 않습니다.'
			};
		}

		// 기존 레코드 조회
		const [existingRecord] = await db
			.select()
			.from(asRecords)
			.where(eq(asRecords.asId, id))
			.limit(1);


		if (!existingRecord) {
			return {
				success: false,
				message: 'AS 기록을 찾을 수 없습니다.'
			};
		}

		let fileListId = existingRecord.fileListId;

		// 새 파일 업로드
		const { fileListId: newFileListId, error: fileError } = await handleFileUpload(formData, 'asFile', 'as', fileListId);
		if (fileError) return fileError;
		if (newFileListId) {
			fileListId = newFileListId;
		} else if (removeFile && fileListId) {
			// 파일 삭제 요청
			await deleteFilesByListId(fileListId);
			fileListId = null;
		}

		if (asType === 'contract' && !contractId) {
			return {
				success: false,
				message: '계약을 선택하세요.'
			};
		}

		if (asType === 'single' && !clientId) {
			return {
				success: false,
				message: '고객사를 선택하세요.'
			};
		}

		await db
			.update(asRecords)
			.set({
				contractId: asType === 'contract' && contractId ? parseInt(contractId, 10) : null,
				clientId: asType === 'single' && clientId ? parseInt(clientId, 10) : null,
				requestDate,
				requestContent,
				responseDate,
				responseContent,
				cost,
				isCompleted,
				fileListId
			})
			.where(eq(asRecords.asId, id));


		return {
			success: true
		};
	},
	deleteASRecords: async ({ request }) => {
		const formData = await request.formData();
		const ids = formData.getAll('ids').map(id => Number(id));

		if (ids.length === 0) {
			return {
				success: false,
				message: '삭제할 항목을 선택하세요.'
			};
		}

		// 삭제할 항목들의 FILE_LIST_ID 조회
		const rowsToDelete: { fileListId: string | null }[] = await db
			.select({ fileListId: asRecords.fileListId })
			.from(asRecords)
			.where(inArray(asRecords.asId, ids));


		// 각 항목의 파일 삭제
		for (const row of rowsToDelete) {
			if (row.fileListId) {
				await deleteFilesByListId(row.fileListId);
			}
		}

		// Hard Deletion: AS 기록 삭제
		await db
			.delete(asRecords)
			.where(inArray(asRecords.asId, ids));


		return {
			success: true
		};
	}
};

