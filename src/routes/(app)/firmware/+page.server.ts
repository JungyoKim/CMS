import type { Actions, PageServerLoad } from './$types';
import { db } from '$lib/server/db';
import { protocols } from '$lib/server/db/schema';
import { handleFileUpload, getFileNamesByListId } from '$lib/server/file-storage';
import { batchFetchFileNames } from '$lib/server/query-helpers';
import { softDeleteWithFiles, updateFileAttachment, parseDeleteIds } from '$lib/server/crud-helpers';
import { eq, like, sql, count, or, and, isNull, desc } from 'drizzle-orm';

export const load: PageServerLoad = async ({ url, depends, parent }) => {
	const { defaultPageSize } = await parent();
	// 페이지 이동 시마다 최신 데이터를 가져오도록 depends 추가
	depends('firmware:update');
	// 펌웨어 단일 조회 요청 처리
	const getFirmwareId = url.searchParams.get('getFirmware');
	if (getFirmwareId) {
		const firmwareId = parseInt(getFirmwareId, 10);
		if (!isNaN(firmwareId)) {
			const firmware = await db.select().from(protocols).where(and(eq(protocols.protocolId, firmwareId), isNull(protocols.deletedAt))).limit(1);
			if (firmware.length > 0) {
				const row = firmware[0];
				const firmwareFileNames = await getFileNamesByListId(row.firmwareFileListId);
				const docFileNames = await getFileNamesByListId(row.otherDocsFileListId);
				return {
					firmware: {
						id: row.protocolId,
						name: row.name ?? '',
						version: row.version ?? '',
						memo: row.memo ?? '',
						firmwareFileName: firmwareFileNames[0] || null,
						firmwareFileListId: row.firmwareFileListId,
						docFileName: docFileNames[0] || null,
						docFileListId: row.otherDocsFileListId
					}
				};
			}
		}
		return { firmware: null };
	}

	// URL 쿼리 파라미터에서 검색어, 검색 필드, 페이지 정보 가져오기
	const searchQuery = url.searchParams.get('search') || '';
	const searchField = url.searchParams.get('field') || 'name';
	const page = Math.max(1, parseInt(url.searchParams.get('page') || '1', 10));
	const pageSize = parseInt(url.searchParams.get('pageSize') || String(defaultPageSize), 10);

	// 검색 조건 구성
	let whereCondition = undefined;
	if (searchQuery.trim()) {
		const conditions = [];
		if (searchField === 'name') {
			conditions.push(like(protocols.name, `%${searchQuery}%`));
		} else if (searchField === 'memo') {
			conditions.push(like(protocols.memo, `%${searchQuery}%`));
		}
		if (conditions.length > 0) {
			whereCondition = or(...conditions);
		}
	}

	// 파일명 검색의 경우 모든 데이터를 가져와서 필터링 (삭제되지 않은 것만)
	const deletedAtCondition = isNull(protocols.deletedAt);
	const finalWhereCondition = whereCondition
		? and(whereCondition, deletedAtCondition)
		: deletedAtCondition;
	let allRows = await db.select().from(protocols).where(finalWhereCondition).orderBy(desc(protocols.protocolId));

	// 파일명으로 검색하는 경우
	if (searchQuery.trim() && (searchField === 'firmwareFileName' || searchField === 'docFileName')) {
		const filteredRows = [];
		for (const row of allRows) {
			const firmwareFileNames = await getFileNamesByListId(row.firmwareFileListId);
			const docFileNames = await getFileNamesByListId(row.otherDocsFileListId);

			let matches = false;
			if (searchField === 'firmwareFileName') {
				matches = firmwareFileNames.some(fileName =>
					fileName.toLowerCase().includes(searchQuery.toLowerCase())
				);
			} else if (searchField === 'docFileName') {
				matches = docFileNames.some(fileName =>
					fileName.toLowerCase().includes(searchQuery.toLowerCase())
				);
			}

			if (matches) {
				filteredRows.push(row);
			}
		}
		allRows = filteredRows;
	}

	const totalCount = allRows.length;

	// 페이지네이션 적용
	const offset = (page - 1) * pageSize;
	const rows = allRows.slice(offset, offset + pageSize);

	const allFileListIds = [
		...rows.map(r => r.firmwareFileListId),
		...rows.map(r => r.otherDocsFileListId)
	];
	const fileNamesMap = await batchFetchFileNames(allFileListIds);

	const items = rows.map((row) => {
		const firmwareFileNames = row.firmwareFileListId ? fileNamesMap.get(row.firmwareFileListId) || [] : [];
		const docFileNames = row.otherDocsFileListId ? fileNamesMap.get(row.otherDocsFileListId) || [] : [];
		return {
			id: row.protocolId,
			name: row.name ?? '',
			version: row.version ?? '',
			memo: row.memo ?? '',
			firmwareFileName: firmwareFileNames[0] || null,
			firmwareFileListId: row.firmwareFileListId,
			docFileName: docFileNames[0] || null,
			docFileListId: row.otherDocsFileListId
		};
	});

	return {
		firmware: items,
		totalCount,
		page,
		pageSize
	};
};

export const actions: Actions = {
	createFirmware: async ({ request }) => {
		const formData = await request.formData();

		const name = (formData.get('firmwareName') ?? '').toString().trim();
		const version = (formData.get('firmwareVersion') ?? '').toString().trim();
		const memo = (formData.get('firmwareMemo') ?? '').toString().trim();
		if (!name) {
			return {
				success: false,
				message: '펌웨어 이름을 입력하세요.'
			};
		}

		const { fileListId: firmwareFileListId, error: binFileError } = await handleFileUpload(formData, 'firmwareBinFile', 'firmware');
		if (binFileError) return binFileError;

		const { fileListId: otherDocsFileListId, error: docFileError } = await handleFileUpload(formData, 'firmwareDocFile', 'firmware-docs');
		if (docFileError) return docFileError;

		await db.insert(protocols).values({
			name,
			version: version || null,
			memo: memo || null,
			firmwareFileListId,
			otherDocsFileListId
		});

		return {
			success: true
		};
	},
	updateFirmware: async ({ request }) => {
		const formData = await request.formData();

		const id = formData.get('id')?.toString();
		if (!id) {
			return {
				success: false,
				message: '펌웨어 ID가 필요합니다.'
			};
		}

		const name = (formData.get('firmwareName') ?? '').toString().trim();
		const version = (formData.get('firmwareVersion') ?? '').toString().trim();
		const memo = (formData.get('firmwareMemo') ?? '').toString().trim();
		if (!name) {
			return {
				success: false,
				message: '펌웨어 이름을 입력하세요.'
			};
		}

		// 기존 항목 조회 (삭제되지 않은 것만)
		const existingFirmware = await db
			.select()
			.from(protocols)
			.where(and(eq(protocols.protocolId, Number(id)), isNull(protocols.deletedAt)))
			.limit(1)
			.then(rows => rows[0]);

		if (!existingFirmware) {
			return {
				success: false,
				message: '펌웨어를 찾을 수 없습니다.'
			};
		}

		const { fileListId: firmwareFileListId, error: binError } = await updateFileAttachment({
			formData,
			fieldName: 'firmwareBinFile',
			removeFieldName: 'removeFirmwareFile',
			category: 'firmware',
			currentFileListId: existingFirmware.firmwareFileListId
		});
		if (binError) return binError;

		const { fileListId: otherDocsFileListId, error: docError } = await updateFileAttachment({
			formData,
			fieldName: 'firmwareDocFile',
			removeFieldName: 'removeDocFile',
			category: 'firmware-docs',
			currentFileListId: existingFirmware.otherDocsFileListId
		});
		if (docError) return docError;

		await db
			.update(protocols)
			.set({
				name,
				version: version || null,
				memo: memo || null,
				firmwareFileListId,
				otherDocsFileListId
			})
			.where(eq(protocols.protocolId, Number(id)));

		return {
			success: true
		};
	},
	deleteFirmware: async ({ request }) => {
		const formData = await request.formData();
		return softDeleteWithFiles({
			table: protocols,
			idColumn: protocols.protocolId,
			ids: parseDeleteIds(formData),
			fileColumns: [protocols.firmwareFileListId, protocols.otherDocsFileListId]
		});
	}
};