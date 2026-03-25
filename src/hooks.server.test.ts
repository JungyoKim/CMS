import { describe, it, expect, vi, beforeEach } from 'vitest';

const { mockVerifyToken } = vi.hoisted(() => ({
	mockVerifyToken: vi.fn()
}));

vi.mock('$lib/server/auth', () => ({
	verifyToken: mockVerifyToken
}));

vi.mock('$app/environment', () => ({
	dev: false
}));

vi.mock('$env/dynamic/private', () => ({
	env: { PRODUCTION_DOMAIN: '' }
}));

import { handle } from './hooks.server';

function createMockEvent(opts: {
	pathname?: string;
	token?: string | null;
	headers?: Record<string, string>;
}) {
	const { pathname = '/', token = null, headers = {} } = opts;
	const url = new URL(`http://localhost${pathname}`);
	return {
		request: {
			headers: new Headers(headers)
		},
		url,
		cookies: {
			get: vi.fn((name: string) => name === 'auth-token' ? token : undefined),
			delete: vi.fn(),
			set: vi.fn()
		},
		locals: {} as Record<string, any>
	} as any;
}

function createMockResolve() {
	const mockResponse = new Response('OK', { status: 200 });
	// headers.set을 추적하기 위해 실제 Response 사용
	return vi.fn().mockResolvedValue(mockResponse);
}

describe('hooks.server handle', () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it('토큰 없이 보호된 페이지 접근 시 /login으로 리다이렉트', async () => {
		const event = createMockEvent({ pathname: '/products' });
		const resolve = createMockResolve();

		await expect(handle({ event, resolve })).rejects.toThrow();
	});

	it('유효하지 않은 토큰으로 접근 시 쿠키 삭제 후 /login 리다이렉트', async () => {
		mockVerifyToken.mockResolvedValue(null);
		const event = createMockEvent({ pathname: '/products', token: 'invalid' });
		const resolve = createMockResolve();

		await expect(handle({ event, resolve })).rejects.toThrow();
		expect(event.cookies.delete).toHaveBeenCalledWith('auth-token', expect.any(Object));
	});

	it('유효한 토큰으로 보호된 페이지 접근 시 locals에 user 설정', async () => {
		mockVerifyToken.mockResolvedValue({ userId: 'admin' });
		const event = createMockEvent({ pathname: '/products', token: 'valid-token' });
		const resolve = createMockResolve();

		await handle({ event, resolve });

		expect(event.locals.user).toEqual({ userId: 'admin' });
		expect(resolve).toHaveBeenCalled();
	});

	it('보안 헤더가 응답에 추가된다', async () => {
		mockVerifyToken.mockResolvedValue({ userId: 'admin' });
		const event = createMockEvent({ pathname: '/', token: 'valid-token' });
		const resolve = createMockResolve();

		const response = await handle({ event, resolve });

		expect(response.headers.get('X-Frame-Options')).toBe('SAMEORIGIN');
		expect(response.headers.get('X-Content-Type-Options')).toBe('nosniff');
		expect(response.headers.get('Referrer-Policy')).toBe('strict-origin-when-cross-origin');
	});

	it('/login 페이지는 토큰 없이 접근 가능', async () => {
		const event = createMockEvent({ pathname: '/login' });
		const resolve = createMockResolve();

		const response = await handle({ event, resolve });
		expect(response.status).toBe(200);
	});

	it('/login에서 유효한 토큰이 있으면 / 로 리다이렉트', async () => {
		mockVerifyToken.mockResolvedValue({ userId: 'admin' });
		const event = createMockEvent({ pathname: '/login', token: 'valid-token' });
		const resolve = createMockResolve();

		await expect(handle({ event, resolve })).rejects.toThrow();
	});

	it('/login에서 만료된 토큰이면 쿠키 삭제 후 로그인 페이지 표시', async () => {
		mockVerifyToken.mockResolvedValue(null);
		const event = createMockEvent({ pathname: '/login', token: 'expired' });
		const resolve = createMockResolve();

		const response = await handle({ event, resolve });
		expect(event.cookies.delete).toHaveBeenCalledWith('auth-token', expect.any(Object));
		expect(response.status).toBe(200);
	});

	it('/logout 엔드포인트는 인증 없이 접근 가능', async () => {
		const event = createMockEvent({ pathname: '/logout' });
		const resolve = createMockResolve();

		const response = await handle({ event, resolve });
		expect(response.status).toBe(200);
	});

	it('/healthcheck는 즉시 200 OK 반환', async () => {
		const event = createMockEvent({ pathname: '/healthcheck' });
		const resolve = createMockResolve();

		const response = await handle({ event, resolve });
		expect(response.status).toBe(200);
		const text = await response.text();
		expect(text).toBe('OK');
	});
});
