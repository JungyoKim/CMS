import type { Actions, PageServerLoad } from './$types';
import { db } from '$lib/server/db';
import { clients, files } from '$lib/server/db/schema';
import { handleFileUpload, saveFileToList } from '$lib/server/file-storage';
import { batchFetchFileNames, escapeLike, parseListParams, withSoftDelete, paginatedQuery, createClientName } from '$lib/server/query-helpers';
import { softDeleteWithFiles, parseDeleteIds } from '$lib/server/crud-helpers';
import { eq, like, sql, or, and, isNull } from 'drizzle-orm';

export const load: PageServerLoad = async ({ url, depends, parent }) => {
	const { defaultPageSize } = await parent();
	depends('clients:update');

	const { searchQuery, searchField, page, pageSize, offset } = parseListParams(url, defaultPageSize, 'customerName');

	// 검색 조건 구성
	let searchCondition = undefined;
	if (searchQuery.trim()) {
		const conditions = [];
		const escaped = escapeLike(searchQuery);
		if (searchField === 'customerName') {
			conditions.push(like(clients.name1, `%${escaped}%`));
			conditions.push(like(clients.name2, `%${escaped}%`));
			conditions.push(like(clients.name3, `%${escaped}%`));
			conditions.push(like(clients.name4, `%${escaped}%`));
			conditions.push(like(clients.name5, `%${escaped}%`));
		} else if (searchField === 'businessNumber') {
			conditions.push(like(clients.businessNumber, `%${escaped}%`));
		} else if (searchField === 'phone') {
			const cleanQuery = escapeLike(searchQuery.replace(/-/g, ''));
			conditions.push(sql`replace(${clients.mainContactPhone}, '-', '') LIKE ${'%' + cleanQuery + '%'}`);
			conditions.push(sql`replace(${clients.subContactPhone}, '-', '') LIKE ${'%' + cleanQuery + '%'}`);
		} else if (searchField === 'email') {
			conditions.push(like(clients.mainContactEmail, `%${escaped}%`));
			conditions.push(like(clients.subContactEmail, `%${escaped}%`));
		} else if (searchField === 'address') {
			conditions.push(like(clients.address, `%${escaped}%`));
		} else if (searchField === 'registrationFileName') {
			const searchLower = escapeLike(searchQuery.toLowerCase());
			conditions.push(sql`EXISTS (
				SELECT 1 FROM files f
				WHERE f.FILE_LIST_ID = ${clients.registrationFileListId}
				AND f.deleted_at IS NULL
				AND LOWER(f.original_file_name) LIKE ${'%' + searchLower + '%'}
			)`);
		}
		if (conditions.length > 0) {
			searchCondition = or(...conditions);
		}
	}

	const where = withSoftDelete(clients.deletedAt, searchCondition);
	const { totalCount, rows } = await paginatedQuery(clients, { where, orderBy: clients.clientId, limit: pageSize, offset });

	const fileNamesMap = await batchFetchFileNames(rows.map(r => r.registrationFileListId));

	const items = rows.map((row) => {
		const customerName = createClientName(row);

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
