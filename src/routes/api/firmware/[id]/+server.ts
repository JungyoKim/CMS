import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { db } from '$lib/server/db';
import { protocols } from '$lib/server/db/schema';
import { eq, and, isNull } from 'drizzle-orm';
import { getFileNamesByListId } from '$lib/server/file-storage';

export const GET: RequestHandler = async ({ params }) => {
	const id = params.id;
	
	if (!id) {
		return json({ error: '펌웨어 ID가 필요합니다.' }, { status: 400 });
	}
	
	const firmware = await db
		.select()
		.from(protocols)
		.where(and(eq(protocols.protocolId, Number(id)), isNull(protocols.deletedAt)))
		.limit(1)
		.then(rows => rows[0]);
	
	if (!firmware) {
		return json({ error: '펌웨어를 찾을 수 없습니다.' }, { status: 404 });
	}

	const firmwareFileNames = await getFileNamesByListId(firmware.firmwareFileListId);
	const docFileNames = await getFileNamesByListId(firmware.otherDocsFileListId);
	
	return json({
		firmware: {
			id: firmware.protocolId,
			name: firmware.name ?? '',
			version: firmware.version ?? '',
			memo: firmware.memo ?? '',
			firmwareFileName: firmwareFileNames[0] || null,
			firmwareFileListId: firmware.firmwareFileListId,
			docFileName: docFileNames[0] || null,
			docFileListId: firmware.otherDocsFileListId
		}
	});
};



