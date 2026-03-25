import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { db } from '$lib/server/db';
import { settings } from '$lib/server/db/schema';
import { eq } from 'drizzle-orm';

export const POST: RequestHandler = async ({ request }) => {
    try {
        const { pageSize } = await request.json();

        if (!pageSize || isNaN(Number(pageSize))) {
            return json({ error: '유효하지 않은 페이지 크기입니다.' }, { status: 400 });
        }

        // Upsert: 없으면 삽입, 있으면 업데이트
        await db.insert(settings).values({
            key: 'defaultPageSize',
            value: String(pageSize)
        }).onConflictDoUpdate({ target: settings.key, set: { value: String(pageSize) } });

        return json({ success: true, message: '페이지 설정이 저장되었습니다.' });
    } catch (error) {
        console.error('페이지 설정 저장 실패:', error);
        return json({ error: '서버 오류가 발생했습니다.' }, { status: 500 });
    }
};
