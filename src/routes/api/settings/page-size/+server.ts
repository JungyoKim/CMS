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

        // 설정값이 존재하는지 확인
        const existingSetting = await db
            .select()
            .from(settings)
            .where(eq(settings.key, 'defaultPageSize'))
            .limit(1);

        if (existingSetting.length > 0) {
            // 업데이트
            await db
                .update(settings)
                .set({ value: String(pageSize) })
                .where(eq(settings.key, 'defaultPageSize'));
        } else {
            // 삽입
            await db.insert(settings).values({
                key: 'defaultPageSize',
                value: String(pageSize)
            });
        }

        return json({ success: true, message: '페이지 설정이 저장되었습니다.' });
    } catch (error) {
        console.error('페이지 설정 저장 실패:', error);
        return json({ error: '서버 오류가 발생했습니다.' }, { status: 500 });
    }
};
