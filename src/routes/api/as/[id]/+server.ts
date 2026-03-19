import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { db } from '$lib/server/db';
import { asRecords, contracts, clients, files } from '$lib/server/db/schema';
import { eq, and, isNull } from 'drizzle-orm';
import { getFileNamesByListId } from '$lib/server/file-storage';

export const GET: RequestHandler = async ({ params }) => {
    const id = params.id;

    if (!id) {
        return json({ error: 'AS ID가 필요합니다.' }, { status: 400 });
    }

    const asData = await db
        .select({
            asRecord: asRecords,
            contract: contracts,
            client: clients
        })
        .from(asRecords)
        .leftJoin(contracts, eq(asRecords.contractId, contracts.contractId))
        .leftJoin(clients, eq(contracts.clientId, clients.clientId))
        .where(eq(asRecords.asId, Number(id)))
        .limit(1)
        .then(rows => rows[0]);

    if (!asData) {
        return json({ error: 'AS 기록을 찾을 수 없습니다.' }, { status: 404 });
    }

    const asRecord = asData.asRecord;
    const contract = asData.contract;
    let client = asData.client;

    // 단일 AS(계약 없음)인 경우 AS의 clientId로 고객 조회
    if (!contract && asRecord.clientId) {
        const singleClient = await db
            .select()
            .from(clients)
            .where(eq(clients.clientId, asRecord.clientId))
            .limit(1)
            .then(rows => rows[0]);
        client = singleClient || null;
    }

    // 첨부 파일 이름 가져오기
    const fileNames = await getFileNamesByListId(asRecord.fileListId);

    // 고객명 생성 (name1부터 name5까지 조합)
    const customerName = [
        client?.name1,
        client?.name2,
        client?.name3,
        client?.name4,
        client?.name5
    ].filter(Boolean).join(' ') || '-';

    return json({
        id: asRecord.asId,
        contractId: asRecord.contractId,
        clientId: asRecord.clientId,
        customerName: customerName,
        contractName: contract?.name || '단일 AS',
        requestDate: asRecord.requestDate || '',
        requestContent: asRecord.requestContent || '',
        responseDate: asRecord.responseDate || '',
        responseContent: asRecord.responseContent || '',
        cost: asRecord.cost || 0,
        isCompleted: asRecord.isCompleted === 1,
        photoFileName: fileNames[0] || null,
        photoFileListId: asRecord.fileListId || null
    });
};
