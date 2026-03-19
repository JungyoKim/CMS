import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { db } from '$lib/server/db';
import { clients } from '$lib/server/db/schema';
import { eq, and, isNull } from 'drizzle-orm';
import { getFileNamesByListId } from '$lib/server/file-storage';

export const GET: RequestHandler = async ({ params }) => {
	const id = params.id;
	
	if (!id) {
		return json({ error: '고객사 ID가 필요합니다.' }, { status: 400 });
	}
	
	const client = await db
		.select()
		.from(clients)
		.where(and(eq(clients.clientId, Number(id)), isNull(clients.deletedAt)))
		.limit(1)
		.then(rows => rows[0]);
	
	if (!client) {
		return json({ error: '고객사를 찾을 수 없습니다.' }, { status: 404 });
	}

	const registrationFileNames = await getFileNamesByListId(client.registrationFileListId);
	
	return json({
		clientId: client.clientId,
		name1: client.name1 ?? '',
		name2: client.name2 ?? '',
		name3: client.name3 ?? '',
		name4: client.name4 ?? '',
		name5: client.name5 ?? '',
		businessNumber: client.businessNumber ?? '',
		zipCode: client.zipCode ?? '',
		address: client.address ?? '',
		fax: client.fax ?? '',
		mainContactName: client.mainContactName ?? '',
		mainContactPosition: client.mainContactPosition ?? '',
		mainContactPhone: client.mainContactPhone ?? '',
		mainContactEmail: client.mainContactEmail ?? '',
		subContactName: client.subContactName ?? '',
		subContactPosition: client.subContactPosition ?? '',
		subContactPhone: client.subContactPhone ?? '',
		subContactEmail: client.subContactEmail ?? '',
		registrationFileListId: client.registrationFileListId,
		registrationFileName: registrationFileNames[0] || null
	});
};












