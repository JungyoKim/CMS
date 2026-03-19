import { describe, it, expect } from 'vitest';
import { hashPassword, verifyPassword, isHashed } from './password';

describe('hashPassword', () => {
	it('salt:hash 형식의 문자열을 반환한다', () => {
		const result = hashPassword('test1234');
		expect(result).toContain(':');
		const [salt, hash] = result.split(':');
		expect(salt).toHaveLength(32); // 16 bytes = 32 hex chars
		expect(hash).toHaveLength(128); // 64 bytes = 128 hex chars
	});

	it('같은 비밀번호라도 매번 다른 해시를 생성한다', () => {
		const hash1 = hashPassword('test1234');
		const hash2 = hashPassword('test1234');
		expect(hash1).not.toBe(hash2);
	});
});

describe('verifyPassword', () => {
	it('해싱된 비밀번호를 올바르게 검증한다', () => {
		const hashed = hashPassword('mypassword');
		expect(verifyPassword('mypassword', hashed)).toBe(true);
	});

	it('틀린 비밀번호를 거부한다', () => {
		const hashed = hashPassword('mypassword');
		expect(verifyPassword('wrongpassword', hashed)).toBe(false);
	});

	it('레거시 평문 비밀번호를 올바르게 검증한다', () => {
		expect(verifyPassword('1234', '1234')).toBe(true);
		expect(verifyPassword('wrong', '1234')).toBe(false);
	});

	it('빈 비밀번호를 처리한다', () => {
		const hashed = hashPassword('');
		expect(verifyPassword('', hashed)).toBe(true);
		expect(verifyPassword('notempty', hashed)).toBe(false);
	});
});

describe('isHashed', () => {
	it('해싱된 문자열을 감지한다', () => {
		const hashed = hashPassword('test');
		expect(isHashed(hashed)).toBe(true);
	});

	it('평문을 감지한다', () => {
		expect(isHashed('1234')).toBe(false);
		expect(isHashed('plaintext')).toBe(false);
		expect(isHashed('')).toBe(false);
	});

	it('콜론이 있지만 올바른 형식이 아닌 문자열을 거부한다', () => {
		expect(isHashed('short:hash')).toBe(false);
		expect(isHashed('a:b:c')).toBe(false);
	});
});
