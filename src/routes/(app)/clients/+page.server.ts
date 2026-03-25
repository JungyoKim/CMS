import type { Actions, PageServerLoad } from './$types';
import { db } from '$lib/server/db';
import { clients, files } from '$lib/server/db/schema';
import { handleFileUpload, saveFileToList } from '$lib/server/file-storage';
import { batchFetchFileNames, escapeLike } from '$lib/server/query-helpers';
import { softDeleteWithFiles, parseDeleteIds } from '$lib/server/crud-helpers';
import { eq, like, sql, count, or, and, isNull, desc } from 'drizzle-orm';

export const load: PageServerLoad = async ({ url, depends, parent }) => {
	const { defaultPageSize } = await parent();
	// 페이지 이동 시마다 최신 데이터를 가져오도록 depends 추가
	depends('clients:update');
	// URL 쿼리 파라미터에서 검색어, 검색 필드, 페이지 정보 가져오기
	const searchQuery = url.searchParams.get('search') || '';
	const searchField = url.searchParams.get('field') || 'customerName';
	const page = Math.max(1, parseInt(url.searchParams.get('page') || '1', 10));
	const pageSizeRaw = parseInt(url.searchParams.get('pageSize') || String(defaultPageSize), 10);
	const pageSize = isNaN(pageSizeRaw) || pageSizeRaw <= 0 ? defaultPageSize : pageSizeRaw;

	// 검색 조건 구성
	let whereCondition = undefined;
	if (searchQuery.trim()) {
		const conditions = [];
		const escaped = escapeLike(searchQuery);
		if (searchField === 'customerName') {
			// name1~5 중 하나라도 매칭되면 포함
			conditions.push(like(clients.name1, `%${escaped}%`));
			conditions.push(like(clients.name2, `%${escaped}%`));
			conditions.push(like(clients.name3, `%${escaped}%`));
			conditions.push(like(clients.name4, `%${escaped}%`));
			conditions.push(like(clients.name5, `%${escaped}%`));
		} else if (searchField === 'businessNumber') {
			conditions.push(like(clients.businessNumber, `%${escaped}%`));
		} else if (searchField === 'phone') {
			// 하이픈 무시 검색
			const cleanQuery = escapeLike(searchQuery.replace(/-/g, ''));
			conditions.push(sql`replace(${clients.mainContactPhone}, '-', '') LIKE ${'%' + cleanQuery + '%'}`);
			conditions.push(sql`replace(${clients.subContactPhone}, '-', '') LIKE ${'%' + cleanQuery + '%'}`);
		} else if (searchField === 'email') {
			conditions.push(like(clients.mainContactEmail, `%${escaped}%`));
			conditions.push(like(clients.subContactEmail, `%${escaped}%`));
		} else if (searchField === 'address') {
			conditions.push(like(clients.address, `%${escaped}%`));
		} else if (searchField === 'registrationFileName') {
			// 사업자등록증 파일명 검색 - files 테이블과 EXISTS 서브쿼리
			const searchLower = escapeLike(searchQuery.toLowerCase());
			conditions.push(sql`EXISTS (
				SELECT 1 FROM files f
				WHERE f.FILE_LIST_ID = ${clients.registrationFileListId}
				AND f.deleted_at IS NULL
				AND LOWER(f.original_file_name) LIKE ${'%' + searchLower + '%'}
			)`);
		}
		if (conditions.length > 0) {
			whereCondition = or(...conditions);
		}
	}

	const deletedAtCondition = isNull(clients.deletedAt);
	const finalWhereCondition = whereCondition
		? and(whereCondition, deletedAtCondition)
		: deletedAtCondition;

	const offset = (page - 1) * pageSize;

	// DB 레벨 페이지네이션
	const [countResult, rows] = await Promise.all([
		db.select({ count: count() }).from(clients).where(finalWhereCondition),
		db.select().from(clients).where(finalWhereCondition).orderBy(desc(clients.clientId)).limit(pageSize).offset(offset)
	]);

	const totalCount = countResult[0]?.count ?? 0;

	const fileNamesMap = await batchFetchFileNames(rows.map(r => r.registrationFileListId));

	const items = rows.map((row) => {
		// name1~5를 합쳐서 고객명 생성
		const customerNameParts = [
			row.name1,
			row.name2,
			row.name3,
			row.name4,
			row.name5
		].filter(Boolean);
		const customerName = customerNameParts.join(' ') || '-';

		const registrationFileNames = row.registrationFileListId ? fileNamesMap.get(row.registrationFileListId) || [] : [];

		return {
			id: row.clientId,
			customerName,
			businessNumber: row.businessNumber ?? '',
			phone: row.mainContactPhone ?? '',
			email: row.mainContactEmail ?? '',
			address: row.address ?? '',
			registrationFileName: registrationFileNames[0] || null,
			registrationFileListId: row.registrationFileListId,
			// 편집용 전체 데이터
			name1: row.name1 ?? '',
			name2: row.name2 ?? '',
			name3: row.name3 ?? '',
			name4: row.name4 ?? '',
			name5: row.name5 ?? '',
			zipCode: row.zipCode ?? '',
			fax: row.fax ?? '',
			mainContactName: row.mainContactName ?? '',
			mainContactPosition: row.mainContactPosition ?? '',
			mainContactPhone: row.mainContactPhone ?? '',
			mainContactEmail: row.mainContactEmail ?? '',
			subContactName: row.subContactName ?? '',
			subContactPosition: row.subContactPosition ?? '',
			subContactPhone: row.subContactPhone ?? '',
			subContactEmail: row.subContactEmail ?? ''
		};
	});

	return {
		clients: items,
		totalCount,
		page,
		pageSize
	};
};

export const actions: Actions = {
	createClient: async ({ request }) => {
		const formData = await request.formData();

		const name1 = (formData.get('name1') ?? '').toString().trim();
		const name2 = (formData.get('name2') ?? '').toString().trim();
		const name3 = (formData.get('name3') ?? '').toString().trim();
		const name4 = (formData.get('name4') ?? '').toString().trim();
		const name5 = (formData.get('name5') ?? '').toString().trim();
		const businessNumber = (formData.get('businessNumber') ?? '').toString().trim();
		const zipCode = (formData.get('zipCode') ?? '').toString().trim();
		const address = (formData.get('address') ?? '').toString().trim();
		const fax = (formData.get('fax') ?? '').toString().trim();
		const mainContactName = (formData.get('mainContactName') ?? '').toString().trim();
		const mainContactPosition = (formData.get('mainContactPosition') ?? '').toString().trim();
		const mainContactPhone = (formData.get('mainContactPhone') ?? '').toString().trim();
		const mainContactEmail = (formData.get('mainContactEmail') ?? '').toString().trim();
		const subContactName = (formData.get('subContactName') ?? '').toString().trim();
		const subContactPosition = (formData.get('subContactPosition') ?? '').toString().trim();
		const subContactPhone = (formData.get('subContactPhone') ?? '').toString().trim();
		const subContactEmail = (formData.get('subContactEmail') ?? '').toString().trim();
		if (!name1) {
			return {
				success: false,
				message: '고객사명을 입력하세요.'
			};
		}

		const { fileListId: registrationFileListId, error: fileError } = await handleFileUpload(formData, 'registrationFile', 'clients');
		if (fileError) return fileError;

		await db.insert(clients).values({
			name1,
			name2: name2 || null,
			name3: name3 || null,
			name4: name4 || null,
			name5: name5 || null,
			businessNumber: businessNumber || null,
			zipCode: zipCode || null,
			address: address || null,
			fax: fax || null,
			mainContactName: mainContactName || null,
			mainContactPosition: mainContactPosition || null,
			mainContactPhone: mainContactPhone || null,
			mainContactEmail: mainContactEmail || null,
			subContactName: subContactName || null,
			subContactPosition: subContactPosition || null,
			subContactPhone: subContactPhone || null,
			subContactEmail: subContactEmail || null,
			registrationFileListId
		});

		return {
			success: true
		};
	},
	updateClient: async ({ request }) => {
		const formData = await request.formData();

		const id = formData.get('id')?.toString();
		if (!id) {
			return {
				success: false,
				message: '고객사 ID가 필요합니다.'
			};
		}

		const name1 = (formData.get('name1') ?? '').toString().trim();
		const name2 = (formData.get('name2') ?? '').toString().trim();
		const name3 = (formData.get('name3') ?? '').toString().trim();
		const name4 = (formData.get('name4') ?? '').toString().trim();
		const name5 = (formData.get('name5') ?? '').toString().trim();
		const businessNumber = (formData.get('businessNumber') ?? '').toString().trim();
		const zipCode = (formData.get('zipCode') ?? '').toString().trim();
		const address = (formData.get('address') ?? '').toString().trim();
		const fax = (formData.get('fax') ?? '').toString().trim();
		const mainContactName = (formData.get('mainContactName') ?? '').toString().trim();
		const mainContactPosition = (formData.get('mainContactPosition') ?? '').toString().trim();
		const mainContactPhone = (formData.get('mainContactPhone') ?? '').toString().trim();
		const mainContactEmail = (formData.get('mainContactEmail') ?? '').toString().trim();
		const subContactName = (formData.get('subContactName') ?? '').toString().trim();
		const subContactPosition = (formData.get('subContactPosition') ?? '').toString().trim();
		const subContactPhone = (formData.get('subContactPhone') ?? '').toString().trim();
		const subContactEmail = (formData.get('subContactEmail') ?? '').toString().trim();
		if (!name1) {
			return {
				success: false,
				message: '고객사명을 입력하세요.'
			};
		}

		// 기존 항목 조회 (삭제되지 않은 것만)
		const existingClient = await db
			.select()
			.from(clients)
			.where(and(eq(clients.clientId, Number(id)), isNull(clients.deletedAt)))
			.limit(1)
			.then(rows => rows[0]);

		if (!existingClient) {
			return {
				success: false,
				message: '고객사를 찾을 수 없습니다.'
			};
		}

		// 새 파일 업로드 - 트랜잭션 밖에서 (disk I/O)
		const regFile = formData.get('registrationFile');
		let newRegistrationFileListId: string | null = null;
		if (regFile instanceof File && regFile.size > 0) {
			try {
				newRegistrationFileListId = await saveFileToList({ file: regFile, category: 'clients' });
			} catch {
				return { success: false, message: '파일 저장에 실패했습니다.' };
			}
		}
		const removeRegistrationFile = formData.get('removeRegistrationFile') === 'true';

		// 파일 soft-delete + DB 업데이트를 트랜잭션으로 묶음
		try {
			await db.transaction(async (tx) => {
				let registrationFileListId = existingClient.registrationFileListId;
				if (newRegistrationFileListId) {
					if (registrationFileListId) {
						await tx.update(files).set({ deletedAt: new Date().toISOString() }).where(and(eq(files.fileListId, registrationFileListId), isNull(files.deletedAt)));
					}
					registrationFileListId = newRegistrationFileListId;
				} else if (removeRegistrationFile && registrationFileListId) {
					await tx.update(files).set({ deletedAt: new Date().toISOString() }).where(and(eq(files.fileListId, registrationFileListId), isNull(files.deletedAt)));
					registrationFileListId = null;
				}

				await tx.update(clients).set({
					name1,
					name2: name2 || null,
					name3: name3 || null,
					name4: name4 || null,
					name5: name5 || null,
					businessNumber: businessNumber || null,
					zipCode: zipCode || null,
					address: address || null,
					fax: fax || null,
					mainContactName: mainContactName || null,
					mainContactPosition: mainContactPosition || null,
					mainContactPhone: mainContactPhone || null,
					mainContactEmail: mainContactEmail || null,
					subContactName: subContactName || null,
					subContactPosition: subContactPosition || null,
					subContactPhone: subContactPhone || null,
					subContactEmail: subContactEmail || null,
					registrationFileListId
				}).where(eq(clients.clientId, Number(id)));
			});
		} catch {
			return { success: false, message: '고객사 수정 중 오류가 발생했습니다.' };
		}

		return { success: true };
	},
	deleteClients: async ({ request }) => {
		const formData = await request.formData();
		return softDeleteWithFiles({
			table: clients,
			idColumn: clients.clientId,
			ids: parseDeleteIds(formData),
			fileColumns: [clients.registrationFileListId]
		});
	}
};
