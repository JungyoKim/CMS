import { fail, redirect } from '@sveltejs/kit';
import type { Actions } from './$types';
import { createToken } from '$lib/server/auth';
import { db } from '$lib/server/db';
import { passwords } from '$lib/server/db/schema';
import { verifyPassword, hashPassword, isHashed } from '$lib/server/password';
import { eq } from 'drizzle-orm';

// 쿠키 만료 시간: 7일 (고정)
const COOKIE_MAX_AGE = 60 * 60 * 24 * 7; // 7일

export const actions: Actions = {
	default: async ({ request, cookies, url }) => {
		const formData = await request.formData();
		const password = formData.get('password')?.toString();

		// 비밀번호 검증 (DB에서 확인, 없으면 기본값 1234)
		const storedPassword = await db.select().from(passwords).limit(1);
		const currentPassword = storedPassword[0]?.password || '1234';

		if (!password || !verifyPassword(password, currentPassword)) {
			return fail(401, { error: '비밀번호가 올바르지 않습니다.' });
		}

		// 레거시 평문 비밀번호인 경우 해시로 자동 마이그레이션
		if (!isHashed(currentPassword)) {
			const hashed = hashPassword(password);
			if (storedPassword.length > 0) {
				await db.update(passwords)
					.set({ password: hashed })
					.where(eq(passwords.pwId, storedPassword[0].pwId));
			} else {
				await db.insert(passwords).values({ password: hashed });
			}
		}

		// JWT 토큰 생성
		const token = await createToken({ userId: 'admin' });

		// 쿠키에 토큰 저장 (7일 고정)
		// secure 옵션: 리버스 프록시 환경에서 X-Forwarded-Proto 헤더 또는 URL 프로토콜로 자동 감지
		const forwardedProto = request.headers.get('x-forwarded-proto');
		const isSecure = forwardedProto?.includes('https') || url.protocol === 'https:';
		cookies.set('auth-token', token, {
			path: '/',
			maxAge: COOKIE_MAX_AGE,
			httpOnly: true,
			secure: isSecure,
			sameSite: 'lax'
		});

		// 로그인 성공 후 홈으로 리다이렉트
		throw redirect(302, '/');
	}
};
