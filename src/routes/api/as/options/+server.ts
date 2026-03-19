import { json } from '@sveltejs/kit';
import { db } from '$lib/server/db';
import { contracts, clients, products, protocols } from '$lib/server/db/schema';
import { isNull, desc, asc } from 'drizzle-orm';

export async function GET() {
    // 병렬로 드롭다운용 목록 조회
    const [contractListRaw, allClientsRaw, productListResult, firmwareListResult] = await Promise.all([
        // 계약 목록 조회
        db
            .select({
                id: contracts.contractId,
                name: contracts.name,
                clientId: contracts.clientId
            })
            .from(contracts)
            .where(isNull(contracts.deletedAt))
            .orderBy(desc(contracts.contractDate)),

        // 고객사 목록 조회
        db
            .select()
            .from(clients)
            .where(isNull(clients.deletedAt))
            .orderBy(asc(clients.name1)),

        // 제품 목록 조회
        db.select({ id: products.productId, name: products.name }).from(products).where(isNull(products.deletedAt)),

        // 펌웨어 목록 조회
        db.select({ id: protocols.protocolId, name: protocols.name }).from(protocols).where(isNull(protocols.deletedAt))
    ]);

    // 드롭다운용 데이터 가공 (고객사명 미리 매핑)
    const clientMap = new Map<number, typeof clients.$inferSelect>(
        allClientsRaw.map((c: typeof allClientsRaw[number]) => [c.clientId, c])
    );

    const contractList = contractListRaw.map((c: typeof contractListRaw[number]) => {
        const client = c.clientId ? clientMap.get(c.clientId) : null;
        const customerName = [client?.name1, client?.name2, client?.name3, client?.name4, client?.name5]
            .filter(Boolean)
            .join(' ') || '-';
        return { id: c.id, name: c.name, customerName };
    });

    const clientList = allClientsRaw.map((c: typeof allClientsRaw[number]) => ({
        id: c.clientId,
        customerName: [c.name1, c.name2, c.name3, c.name4, c.name5].filter(Boolean).join(' ') || '-',
        ...c
    }));

    return json({
        contractList,
        clientList,
        productList: productListResult,
        firmwareList: firmwareListResult
    });
}
