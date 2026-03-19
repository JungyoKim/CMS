import { redirect } from '@sveltejs/kit';
import type { Handle } from '@sveltejs/kit';
import { verifyToken } from '$lib/server/auth';
import { dev } from '$app/environment';
import { env } from '$env/dynamic/private';

const PRODUCTION_DOMAIN = env.PRODUCTION_DOMAIN || '';

export const handle: Handle = async ({ event, resolve }) => {
	// 프록시 환경에서 실행 중일 때는 TRUST_PROXY 환경 변수가 설정되어 있으면
	// SvelteKit이 자동으로 X-Forwarded-* 헤더를 처리합니다

	// User-Agent 확인 (모바일 여부 감지)
	const userAgent = event.request.headers.get('user-agent') || '';
	const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(userAgent);

	// 파일 업로드 크기 제한 제거 (무제한) 및 하이브리드 파비콘 처리
	const resolveOptions = {
		bodySizeLimit: Infinity,
		transformPageChunk: ({ html }: { html: string }) => {
			const placeholder = '<script id="desktop-favicon-placeholder"></script>';

			if (!isMobile) {
				// 데스크톱: SVG favicon과 동적 스위처 주입
				const desktopFaviconHtml = `
	<link id="dynamic-favicon" rel="icon" type="image/svg+xml" href="/favicon-light.svg?v=9" />
	<script>
		(function () {
			const matchMedia = window.matchMedia('(prefers-color-scheme: dark)');
			const link = document.getElementById('dynamic-favicon');
			const updateFavicon = () => {
				const isDark = matchMedia.matches;
				const newHref = isDark ? '/favicon-dark.svg?v=10' : '/favicon-light.svg?v=10';
				if (link && link.getAttribute('href') !== newHref) {
					link.setAttribute('href', newHref);
				}
			};
			updateFavicon();
			matchMedia.addEventListener('change', updateFavicon);
			setInterval(updateFavicon, 1000);
		})();
	<\/script>`;
				return html.replace(placeholder, desktopFaviconHtml);
			}
			// 모바일: 플레이스홀더 제거, PNG fallback 사용
			return html.replace(placeholder, '');
		}
	};

	// secure 옵션: 리버스 프록시 환경에서 X-Forwarded-Proto 헤더 또는 URL 프로토콜로 자동 감지
	const forwardedProto = event.request.headers.get('x-forwarded-proto');
	const isHttp = forwardedProto === 'http' || event.url.protocol === 'http:';
	const host = event.request.headers.get('host');
	const isProductionDomain = PRODUCTION_DOMAIN && host === PRODUCTION_DOMAIN;

	// Failsafe: URL 파라미터에 failsafe=http가 있으면 리다이렉트 하지 않음
	const isFailsafe = event.url.searchParams.get('failsafe') === 'http';

	// 프로덕션 환경이고 (HTTP로 접속했거나 또는 메인 도메인이 아닌 경우), Failsafe가 아니면 HTTPS로 스마트 리다이렉트 시도
	if (!dev && PRODUCTION_DOMAIN && (isHttp || !isProductionDomain) && !isFailsafe) {
		const targetUrl = `https://${PRODUCTION_DOMAIN}${event.url.pathname}${event.url.search}`;
		let canConnectToHttps = false;

		try {
			// HTTPS 서버가 응답하는지 1.5초 타임아웃으로 확인
			// redirect: 'manual' 옵션으로 리다이렉트를 따라가지 않고 직접 응답 확인
			const response = await fetch(`https://${PRODUCTION_DOMAIN}/healthcheck`, {
				method: 'HEAD',
				signal: AbortSignal.timeout(1500),
				redirect: 'manual' // 리다이렉트를 자동으로 따라가지 않음
			});
			// 200 OK일 때만 서버가 정상적으로 준비된 것으로 간주하고 리다이렉트
			if (response.ok) {
				canConnectToHttps = true;
			}
		} catch (error) {
			// HTTPS probe failed, staying on HTTP
		}

		if (canConnectToHttps) {
			// 캐시 방지 헤더와 함께 리다이렉트 - 브라우저가 이 리다이렉트를 캐시하지 않도록 함
			// HTTPS가 다운되었을 때 HTTP로 정상 접속할 수 있게 해줌
			return new Response(null, {
				status: 302,
				headers: {
					'Location': targetUrl,
					'Cache-Control': 'no-store, no-cache, must-revalidate, max-age=0',
					'Pragma': 'no-cache',
					'Expires': '0'
				}
			});
		}
	}

	const isSecure = !isHttp;

	const cookieDeleteOptions = { path: '/', secure: isSecure, sameSite: 'lax' as const };

	// 쿠키에서 JWT 토큰 가져오기
	const token = event.cookies.get('auth-token');

	// 로그인 페이지인 경우
	if (event.url.pathname === '/login') {
		// 토큰이 있고 유효하면 홈으로 리다이렉트
		if (token) {
			const payload = await verifyToken(token);
			if (payload) {
				event.locals.user = {
					userId: payload.userId
				};
				throw redirect(302, '/');
			} else {
				// 토큰이 만료되었거나 유효하지 않으면 쿠키 삭제
				event.cookies.delete('auth-token', cookieDeleteOptions);
			}
		}
		return resolve(event, resolveOptions);
	}

	// 로그아웃 엔드포인트는 인증 체크 제외
	if (event.url.pathname === '/logout') {
		return resolve(event, resolveOptions);
	}

	// healthcheck 엔드포인트는 인증 체크 제외하고 즉시 200 OK 반환
	// HTTPS 프로브에서 이 경로로 요청하여 서버가 정상인지 확인함
	if (event.url.pathname === '/healthcheck') {
		return new Response('OK', { status: 200 });
	}

	// 다른 페이지는 인증 필수
	// 토큰이 없거나 유효하지 않으면 로그인 페이지로 리다이렉트
	if (!token) {
		throw redirect(302, '/login');
	}

	const payload = await verifyToken(token);
	if (!payload) {
		// 토큰이 만료되었거나 유효하지 않으면 쿠키 삭제하고 로그인 페이지로 리다이렉트
		event.cookies.delete('auth-token', cookieDeleteOptions);
		throw redirect(302, '/login');
	}

	// 인증된 사용자 정보를 locals에 저장
	event.locals.user = {
		userId: payload.userId
	};

	return resolve(event, resolveOptions);
};
