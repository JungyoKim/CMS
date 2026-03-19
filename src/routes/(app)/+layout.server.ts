import type { LayoutServerLoad } from './$types';
import { db } from '$lib/server/db';
import { settings } from '$lib/server/db/schema';
import { eq } from 'drizzle-orm';

export const load: LayoutServerLoad = async () => {
    // 설정 테이블에서 defaultPageSize 로드
    const settingRows = await db
        .select({ value: settings.value })
        .from(settings)
        .where(eq(settings.key, 'defaultPageSize'))
        .limit(1);

    let defaultPageSize = 25; // 기본값
    if (settingRows.length > 0 && settingRows[0].value) {
        const parsed = parseInt(settingRows[0].value, 10);
        if (!isNaN(parsed)) {
            defaultPageSize = parsed;
        }
    }

    return {
        defaultPageSize
    };
};
