import { db } from '$lib/server/db';
import { asRecords, rooms, repeaters, installProducts, files, clients } from '$lib/server/db/schema';
import { eq, inArray, like, and, isNull, or, count, desc } from 'drizzle-orm';
import type { SQL, SQLWrapper } from 'drizzle-orm';
import type { SQLiteTable, SQLiteColumn } from 'drizzle-orm/sqlite-core';

/**
 * SQL LIKE 패턴에서 특수 와일드카드 문자(%, _)를 이스케이프합니다.
 * 유저 입력을 LIKE 패턴에 삽입하기 전에 반드시 사용하세요.
 */
export function escapeLike(value: string): string {
	return value.replace(/\\/g, '\\\\').replace(/%/g, '\\%').replace(/_/g, '\\_');
}

/**
 * URL 쿼리 파라미터에서 검색·페이지네이션 정보를 파싱합니다.
 * 모든 목록 페이지에서 공통으로 사용됩니다.
 */
export function parseListParams(url: URL, defaultPageSize: number, defaultField = 'name') {
	const searchQuery = url.searchParams.get('search') || '';
	const searchField = url.searchParams.get('field') || defaultField;
	const page = Math.max(1, parseInt(url.searchParams.get('page') || '1', 10));
	const pageSizeRaw = parseInt(url.searchParams.get('pageSize') || String(defaultPageSize), 10);
	const pageSize = isNaN(pageSizeRaw) || pageSizeRaw <= 0 ? defaultPageSize : pageSizeRaw;
	const offset = (page - 1) * pageSize;

	return { searchQuery, searchField, page, pageSize, offset };
}

/**
 * 검색 조건과 deletedAt IS NULL 조건을 결합합니다.
 */
export function withSoftDelete(deletedAtColumn: SQLiteColumn, searchCondition?: SQLWrapper): SQL<unknown> {
	const deletedAtCondition = isNull(deletedAtColumn);
	return searchCondition ? and(searchCondition, deletedAtCondition)! : deletedAtCondition;
}

/**
 * count + 데이터 조회를 병렬로 실행합니다.
 * 모든 목록 페이지에서 공통으로 사용되는 페이지네이션 쿼리입니다.
 */
export async function paginatedQuery<T extends SQLiteTable>(
	table: T,
	options: {
		where?: SQL<unknown>;
		orderBy: SQLiteColumn;
		limit: number;
		offset: number;
	}
) {
	const { where, orderBy, limit, offset } = options;

	const [countResult, rows] = await Promise.all([
		db.select({ count: count() }).from(table).where(where),
		db.select().from(table).where(where).orderBy(desc(orderBy)).limit(limit).offset(offset)
	]);

	return {
		totalCount: countResult[0]?.count ?? 0,
		rows
	};
}

/**
 * name1~5를 합쳐서 고객명을 생성합니다. 비어있으면 '-'를 반환합니다.
 */
export function createClientName(client: {
    name1?: string | null;
    name2?: string | null;
    name3?: string | null;
    name4?: string | null;
    name5?: string | null;
} | null | undefined): string {
    if (!client) return '-';
    const parts = [client.name1, client.name2, client.name3, client.name4, client.name5].filter(Boolean);
    return parts.length > 0 ? parts.join(' ') : '-';
}

/**
 * AS 기록 목록에서 상태(없음/진행중/완료)와 미완료 수를 계산합니다.
 */
export function calculateASStatus(records: { isCompleted?: number | null }[]): { status: string; incompleteCount: number } {
    if (records.length === 0) {
        return { status: '없음', incompleteCount: 0 };
    }

    const incompleteCount = records.filter(r => !r.isCompleted || r.isCompleted === 0).length;
    const hasCompleted = records.some(r => r.isCompleted && r.isCompleted === 1);

    if (incompleteCount > 0) {
        return { status: '진행중', incompleteCount };
    } else if (hasCompleted) {
        return { status: '완료', incompleteCount: 0 };
    }
    return { status: '없음', incompleteCount: 0 };
}

/**
 * 계약 ID 목록으로 AS 기록을 일괄 조회합니다.
 */
export async function batchFetchASRecords(contractIds: number[]): Promise<Map<number, typeof asRecords.$inferSelect[]>> {
    if (contractIds.length === 0) return new Map();

    const allRecords = await db.select().from(asRecords).where(inArray(asRecords.contractId, contractIds));

    const map = new Map<number, typeof asRecords.$inferSelect[]>();
    for (const record of allRecords) {
        if (record.contractId) {
            const list = map.get(record.contractId) || [];
            list.push(record);
            map.set(record.contractId, list);
        }
    }
    return map;
}

/**
 * 계약 ID 목록으로 객실 정보를 일괄 조회합니다.
 */
export async function batchFetchRooms(contractIds: number[]): Promise<Map<number, typeof rooms.$inferSelect[]>> {
    if (contractIds.length === 0) return new Map();

    const allRooms = await db.select().from(rooms).where(inArray(rooms.contractId, contractIds));

    const map = new Map<number, typeof rooms.$inferSelect[]>();
    for (const room of allRooms) {
        const list = map.get(room.contractId) || [];
        list.push(room);
        map.set(room.contractId, list);
    }
    return map;
}

/**
 * 계약 ID 목록으로 중계기 정보를 일괄 조회합니다.
 */
export async function batchFetchRepeaters(contractIds: number[]): Promise<Map<number, typeof repeaters.$inferSelect[]>> {
    if (contractIds.length === 0) return new Map();

    const allRepeaters = await db.select().from(repeaters).where(inArray(repeaters.contractId, contractIds));

    const map = new Map<number, typeof repeaters.$inferSelect[]>();
    for (const repeater of allRepeaters) {
        const list = map.get(repeater.contractId) || [];
        list.push(repeater);
        map.set(repeater.contractId, list);
    }
    return map;
}

/**
 * 계약 ID 목록으로 설치 제품 정보를 일괄 조회합니다.
 */
export async function batchFetchInstallProducts(contractIds: number[]): Promise<Map<number, typeof installProducts.$inferSelect[]>> {
    if (contractIds.length === 0) return new Map();

    const allProducts = await db.select().from(installProducts).where(inArray(installProducts.contractId, contractIds));

    const map = new Map<number, typeof installProducts.$inferSelect[]>();
    for (const product of allProducts) {
        const list = map.get(product.contractId) || [];
        list.push(product);
        map.set(product.contractId, list);
    }
    return map;
}

/**
 * 고객 ID 목록으로 고객 정보를 일괄 조회합니다.
 */
export async function batchFetchClients(clientIds: number[]): Promise<Map<number, typeof clients.$inferSelect>> {
    if (clientIds.length === 0) return new Map();

    const allClients = await db.select().from(clients)
        .where(and(inArray(clients.clientId, clientIds), isNull(clients.deletedAt)));

    const map = new Map<number, typeof clients.$inferSelect>();
    for (const client of allClients) {
        map.set(client.clientId, client);
    }
    return map;
}

/**
 * 계약 ID 목록으로 첨부 문서를 일괄 조회합니다.
 * contractId → 문서 배열 Map을 반환합니다.
 */
export async function batchFetchDocuments(contractIds: number[]): Promise<Map<number, { content: string; fileName: string; fileListId: string }[]>> {
    if (contractIds.length === 0) return new Map();

    // 각 contractId에 대해 LIKE 조건을 OR로 결합하여 필요한 문서만 조회
    const likeConditions = contractIds.map(id => like(files.fileListId, `contract-${id}-doc-%`));
    const allDocuments = await db.select().from(files)
        .where(and(
            isNull(files.deletedAt),
            or(...likeConditions)
        ));

    // 계약 ID별로 그룹핑
    const map = new Map<number, { content: string; fileName: string; fileListId: string }[]>();

    for (const doc of allDocuments) {
        if (!doc.fileListId) continue;

        const match = doc.fileListId.match(/^contract-(\d+)-doc-/);
        if (!match) continue;

        const contractId = parseInt(match[1], 10);
        const list = map.get(contractId) || [];

        if (!list.some(d => d.fileListId === doc.fileListId)) {
            list.push({
                content: doc.title || '',
                fileName: doc.originalFileName || '',
                fileListId: doc.fileListId
            });
        }
        map.set(contractId, list);
    }

    return map;
}

/**
 * 파일 리스트 ID 목록으로 파일명을 일괄 조회합니다.
 */
export async function batchFetchFileNames(listIds: (string | null | undefined)[]): Promise<Map<string, string[]>> {
    const validIds = listIds.filter((id): id is string => id !== null && id !== undefined && id !== '');
    if (validIds.length === 0) return new Map();

    const allFiles = await db.select({
        fileListId: files.fileListId,
        originalFileName: files.originalFileName
    }).from(files)
        .where(and(inArray(files.fileListId, validIds), isNull(files.deletedAt)));

    const map = new Map<string, string[]>();
    for (const file of allFiles) {
        if (file.fileListId && file.originalFileName) {
            const list = map.get(file.fileListId) || [];
            list.push(file.originalFileName);
            map.set(file.fileListId, list);
        }
    }
    return map;
}
