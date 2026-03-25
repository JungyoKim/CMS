import type { Actions, PageServerLoad } from './$types';
import { db } from '$lib/server/db';
import { protocols, files } from '$lib/server/db/schema';
import { handleFileUpload, getFileNamesByListId, saveFileToList } from '$lib/server/file-storage';
import { batchFetchFileNames, escapeLike } from '$lib/server/query-helpers';
import { softDeleteWithFiles, parseDeleteIds } from '$lib/server/crud-helpers';
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
	const pageSizeRaw = parseInt(url.searchParams.get('pageSize') || String(defaultPageSize), 10);
	const pageSize = isNaN(pageSizeRaw) || pageSizeRaw <= 0 ? defaultPageSize : pageSizeRaw;

	// 검색 조건 구성
	let whereCondition = undefined;
	if (searchQuery.trim()) {
		const conditions = [];
		const escaped = escapeLike(searchQuery);
		if (searchField === 'name') {
			conditions.push(like(protocols.name, `%${escaped}%`));
		} else if (searchField === 'memo') {
			conditions.push(like(protocols.memo, `%${escaped}%`));
		} else if (searchField === 'firmwareFileName') {
			// 펌웨어 파일명 검색 - files 테이블과 EXISTS 서브쿼리
			const searchLower = escapeLike(searchQuery.toLowerCase());
			conditions.push(sql`EXISTS (
				SELECT 1 FROM files f
				WHERE f.FILE_LIST_ID = ${protocols.firmwareFileListId}
				AND f.deleted_at IS NULL
				AND LOWER(f.original_file_name) LIKE ${'%' + searchLower + '%'}
			)`);
		} else if (searchField === 'docFileName') {
			// 기타문서 파일명 검색 - files 테이블과 EXISTS 서브쿼리
			const searchLower = escapeLike(searchQuery.toLowerCase());
			conditions.push(sql`EXISTS (
				SELECT 1 FROM files f
				WHERE f.FILE_LIST_ID = ${protocols.otherDocsFileListId}
				AND f.deleted_at IS NULL
				AND LOWER(f.original_file_name) LIKE ${'%' + searchLower + '%'}
			)`);
		}
		if (conditions.length > 0) {
			whereCondition = or(...conditions);
		}
	}

	const deletedAtCondition = isNull(protocols.deletedAt);
	const finalWhereCondition = whereCondition
		? and(whereCondition, deletedAtCondition)
		: deletedAtCondition;

	const offset = (page - 1) * pageSize;

	// DB 레벨 페이지네이션
	const [countResult, rows] = await Promise.all([
		db.select({ count: count() }).from(protocols).where(finalWhereCondition),
		db.select().from(protocols).where(finalWhereCondition).orderBy(desc(protocols.protocolId)).limit(pageSize).offset(offset)
	]);

	const totalCount = countResult[0]?.count ?? 0;

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

		// 새 파일 업로드 - 트랜잭션 밖에서 (disk I/O)
		const binFile = formData.get('firmwareBinFile');
		let newFirmwareFileListId: string | null = null;
		if (binFile instanceof File && binFile.size > 0) {
			try {
				newFirmwareFileListId = await saveFileToList({ file: binFile, category: 'firmware' });
			} catch {
				return { success: false, message: '파일 저장에 실패했습니다.' };
			}
		}
		const removeFirmwareFile = formData.get('removeFirmwareFile') === 'true';

		const docFile = formData.get('firmwareDocFile');
		let newDocFileListId: string | null = null;
		if (docFile instanceof File && docFile.size > 0) {
			try {
				newDocFileListId = await saveFileToList({ file: docFile, category: 'firmware-docs' });
			} catch {
				return { success: false, message: '파일 저장에 실패했습니다.' };
			}
		}
		const removeDocFile = formData.get('removeDocFile') === 'true';

		// 파일 soft-delete + DB 업데이트를 트랜잭션으로 묶음
		try {
			await db.transaction(async (tx) => {
				let firmwareFileListId = existingFirmware.firmwareFileListId;
				if (newFirmwareFileListId) {
					if (firmwareFileListId) {
						await tx.update(files).set({ deletedAt: new Date().toISOString() }).where(and(eq(files.fileListId, firmwareFileListId), isNull(files.deletedAt)));
					}
					firmwareFileListId = newFirmwareFileListId;
				} else if (removeFirmwareFile && firmwareFileListId) {
					await tx.update(files).set({ deletedAt: new Date().toISOString() }).where(and(eq(files.fileListId, firmwareFileListId), isNull(files.deletedAt)));
					firmwareFileListId = null;
				}

				let otherDocsFileListId = existingFirmware.otherDocsFileListId;
				if (newDocFileListId) {
					if (otherDocsFileListId) {
						await tx.update(files).set({ deletedAt: new Date().toISOString() }).where(and(eq(files.fileListId, otherDocsFileListId), isNull(files.deletedAt)));
					}
					otherDocsFileListId = newDocFileListId;
				} else if (removeDocFile && otherDocsFileListId) {
					await tx.update(files).set({ deletedAt: new Date().toISOString() }).where(and(eq(files.fileListId, otherDocsFileListId), isNull(files.deletedAt)));
					otherDocsFileListId = null;
				}

				await tx.update(protocols).set({
					name,
					version: version || null,
					memo: memo || null,
					firmwareFileListId,
					otherDocsFileListId
				}).where(eq(protocols.protocolId, Number(id)));
			});
		} catch {
			return { success: false, message: '펌웨어 수정 중 오류가 발생했습니다.' };
		}

		return { success: true };
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