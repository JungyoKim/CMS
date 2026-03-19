import { db } from '$lib/server/db';
import { asRecords, rooms, repeaters, installProducts, files, clients } from '$lib/server/db/schema';
import { eq, inArray, like, and, isNull } from 'drizzle-orm';

/**
 * Create customer name from name parts
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
 * Calculate AS status from records
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
 * Batch fetch AS records by contract IDs
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
 * Batch fetch rooms by contract IDs
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
 * Batch fetch repeaters by contract IDs
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
 * Batch fetch install products by contract IDs
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
 * Batch fetch clients by client IDs
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
 * Batch fetch documents by contract IDs
 * Returns a map of contractId -> document entries
 */
export async function batchFetchDocuments(contractIds: number[]): Promise<Map<number, { content: string; fileName: string; fileListId: string }[]>> {
    if (contractIds.length === 0) return new Map();

    // Build the like pattern for all contract IDs
    const patterns = contractIds.map(id => `contract-${id}-doc-%`);

    // We need to use OR for multiple LIKE patterns
    const allDocuments = await db.select().from(files)
        .where(and(
            isNull(files.deletedAt),
            // Use a more specific approach - query all doc files and filter in memory
            like(files.fileListId, 'contract-%-doc-%')
        ));

    // Filter and group by contract ID
    const map = new Map<number, { content: string; fileName: string; fileListId: string }[]>();

    for (const doc of allDocuments) {
        if (!doc.fileListId) continue;

        // Extract contract ID from fileListId (format: contract-{id}-doc-{index})
        const match = doc.fileListId.match(/^contract-(\d+)-doc-/);
        if (!match) continue;

        const contractId = parseInt(match[1], 10);
        if (!contractIds.includes(contractId)) continue;

        const list = map.get(contractId) || [];

        // Check if we already have this fileListId
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
 * Batch fetch file names by list IDs
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
