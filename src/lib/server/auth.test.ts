import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock SvelteKit modules before importing auth
vi.mock('$env/dynamic/private', () => ({
	env: { JWT_SECRET: 'test-secret-key-for-unit-tests-32ch' }
}));

vi.mock('$app/environment', () => ({
	building: false
}));

import { createToken, verifyToken } from './auth';

describe('createToken', () => {
	it('JWT 토큰 문자열을 반환한다', async () => {
		const token = await createToken({ userId: 'admin' });
		expect(typeof token).toBe('string');
		expect(token.split('.')).toHaveLength(3); // JWT는 header.payload.signature
	});

	it('다른 payload로 다른 토큰을 생성한다', async () => {
		const token1 = await createToken({ userId: 'user1' });
		const token2 = await createToken({ userId: 'user2' });
		expect(token1).not.toBe(token2);
	});
});

describe('verifyToken', () => {
	it('유효한 토큰을 검증하고 payload를 반환한다', async () => {
		const token = await createToken({ userId: 'admin' });
		const payload = await verifyToken(token);
		expect(payload).not.toBeNull();
		expect(payload!.userId).toBe('admin');
	});

	it('잘못된 토큰은 null을 반환한다', async () => {
		const result = await verifyToken('invalid.token.string');
		expect(result).toBeNull();
	});

	it('빈 문자열은 null을 반환한다', async () => {
		const result = await verifyToken('');
		expect(result).toBeNull();
	});

	it('변조된 토큰은 null을 반환한다', async () => {
		const token = await createToken({ userId: 'admin' });
		// 토큰의 마지막 문자를 변조
		const tampered = token.slice(0, -1) + (token.endsWith('A') ? 'B' : 'A');
		const result = await verifyToken(tampered);
		expect(result).toBeNull();
	});
});
