import { redirect } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async ({ cookies, request, url }) => {
	// secure 옵션: 리버스 프록시 환경에서 X-Forwarded-Proto 헤더 또는 URL 프로토콜로 자동 감지
	const forwardedProto = request.headers.get('x-forwarded-proto');
	const isSecure = forwardedProto === 'https' || url.protocol === 'https:';

	// 쿠키 삭제 - HTTP/HTTPS 환경에 맞게 secure 옵션 설정
	cookies.delete('auth-token', {
		path: '/',
		secure: isSecure,
		sameSite: 'lax'
	});

	// SvelteKit의 redirect 헬퍼 사용으로 쿠키 변경사항이 응답에 포함됨
	throw redirect(303, '/login');
};

export const POST: RequestHandler = async ({ cookies, request, url }) => {
	// secure 옵션: 리버스 프록시 환경에서 X-Forwarded-Proto 헤더 또는 URL 프로토콜로 자동 감지
	const forwardedProto = request.headers.get('x-forwarded-proto');
	const isSecure = forwardedProto === 'https' || url.protocol === 'https:';

	cookies.delete('auth-token', {
		path: '/',
		secure: isSecure,
		sameSite: 'lax'
	});

	// SvelteKit의 redirect 헬퍼 사용
	throw redirect(303, '/login');
};


