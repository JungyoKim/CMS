import { describe, it, expect, vi, beforeEach } from 'vitest';

const { mockDbSelect, mockDbInsert, mockSelectFrom, mockSelectLimit, mockInsertValues } = vi.hoisted(() => {
	const mockSelectLimit = vi.fn();
	const mockSelectFrom = vi.fn(() => ({ limit: mockSelectLimit }));
	const mockInsertValues = vi.fn().mockResolvedValue(undefined);
	return {
		mockDbSelect: vi.fn(() => ({ from: mockSelectFrom })),
		mockDbInsert: vi.fn(() => ({ values: mockInsertValues })),
		mockSelectFrom,
		mockSelectLimit,
		mockInsertValues
	};
});

vi.mock('$lib/server/db', () => ({
	db: {
		select: mockDbSelect,
		insert: mockDbInsert
	}
}));

vi.mock('$lib/server/db/schema', () => ({
	passwords: { pwId: 'pwId', password: 'password' }
}));

const { mockCreateToken } = vi.hoisted(() => ({
	mockCreateToken: vi.fn().mockResolvedValue('mock-jwt-token')
}));

vi.mock('$lib/server/auth', () => ({
	createToken: mockCreateToken
}));

// password는 실제 모듈을 사용 (순수 함수)
import { hashPassword } from '$lib/server/password';

vi.mock('drizzle-orm', () => ({
	eq: vi.fn()
}));

import { actions } from './+page.server';

function createMockEvent(password: string) {
	const formData = new FormData();
	formData.set('password', password);

	const cookieStore = new Map<string, string>();
	return {
		request: {
			formData: () => Promise.resolve(formData),
			headers: new Headers()
		},
		cookies: {
			set: vi.fn((name: string, value: string) => cookieStore.set(name, value)),
			get: vi.fn((name: string) => cookieStore.get(name))
		},
		url: new URL('http://localhost/login')
	} as any;
}

describe('POST /login', () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it('비밀번호가 없으면 401을 반환한다', async () => {
		const hashedPw = hashPassword('1234');
		mockSelectLimit.mockResolvedValue([{ password: hashedPw, pwId: 1 }]);

		const formData = new FormData();
		// password 미설정
		const event = {
			request: {
				formData: () => Promise.resolve(formData),
				headers: new Headers()
			},
			cookies: { set: vi.fn() },
			url: new URL('http://localhost/login')
		} as any;

		const result = await actions.default(event);
		expect(result?.status).toBe(401);
	});

	it('틀린 비밀번호는 401을 반환한다', async () => {
		const hashedPw = hashPassword('correct');
		mockSelectLimit.mockResolvedValue([{ password: hashedPw, pwId: 1 }]);

		const result = await actions.default(createMockEvent('wrong'));
		expect(result?.status).toBe(401);
	});

	it('올바른 비밀번호로 로그인하면 리다이렉트한다', async () => {
		const hashedPw = hashPassword('mypassword');
		mockSelectLimit.mockResolvedValue([{ password: hashedPw, pwId: 1 }]);

		const event = createMockEvent('mypassword');

		// SvelteKit redirect throws
		await expect(actions.default(event)).rejects.toThrow();
		expect(mockCreateToken).toHaveBeenCalledWith({ userId: 'admin' });
		expect(event.cookies.set).toHaveBeenCalledWith(
			'auth-token',
			'mock-jwt-token',
			expect.objectContaining({ path: '/', httpOnly: true })
		);
	});

	it('DB에 비밀번호가 없으면 기본값 1234로 초기화한다', async () => {
		mockSelectLimit.mockResolvedValue([]);

		const event = createMockEvent('1234');

		// 기본 비밀번호 1234로 초기화 후 로그인 성공 → redirect
		await expect(actions.default(event)).rejects.toThrow();
		expect(mockDbInsert).toHaveBeenCalled();
	});
});
