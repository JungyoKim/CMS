import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { db } from '$lib/server/db';
import { products, productInventory } from '$lib/server/db/schema';
import { eq, and, isNull } from 'drizzle-orm';
import { getFileNamesByListId } from '$lib/server/file-storage';

export const GET: RequestHandler = async ({ params }) => {
	const id = params.id;
	
	if (!id) {
		return json({ error: '제품 ID가 필요합니다.' }, { status: 400 });
	}
	
	const product = await db
		.select()
		.from(products)
		.where(eq(products.productId, Number(id)))
		.limit(1)
		.then(rows => rows[0]);
	
	if (!product) {
		return json({ error: '제품을 찾을 수 없습니다.' }, { status: 404 });
	}
	
	const photoFileNames = await getFileNamesByListId(product.photoFileListId);
	
	// 입고/출고 기록 가져오기
	const inventoryRecords = await db.select()
		.from(productInventory)
		.where(and(eq(productInventory.productId, product.productId), isNull(productInventory.deletedAt)));
	
	return json({
		product: {
			id: product.productId,
			name: product.name ?? '',
			code: product.code ?? '',
			version: product.version ?? '',
			price: product.price ?? 0,
			memo: product.memo ?? '',
			protocolId: product.protocolId ?? null,
			photoFileName: photoFileNames[0] || null,
			photoFileListId: product.photoFileListId,
			inventoryData: inventoryRecords.map(inv => ({
				type: inv.type,
				content: inv.content,
				date: inv.date,
				quantity: inv.quantity
			}))
		}
	});
};
