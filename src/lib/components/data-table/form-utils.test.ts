import { describe, it, expect, vi } from 'vitest';
import {
	generateId,
	createCustomerName,
	calculateBalance,
	deepClone,
	debounce,
	isEmpty,
	safeString,
	safeNumber
} from './form-utils';

describe('generateId', () => {
	it('문자열을 반환한다', () => {
		expect(typeof generateId()).toBe('string');
	});

	it('prefix를 포함한다', () => {
		const id = generateId('room');
		expect(id.startsWith('room-')).toBe(true);
	});

	it('prefix가 없으면 하이픈 없이 생성한다', () => {
		const id = generateId();
		expect(id.includes('-')).toBe(false);
	});

	it('매번 다른 ID를 생성한다', () => {
		const id1 = generateId();
		const id2 = generateId();
		expect(id1).not.toBe(id2);
	});
});

describe('createCustomerName', () => {
	it('이름을 공백으로 연결한다', () => {
		expect(createCustomerName('삼성', '전자')).toBe('삼성 전자');
	});

	it('null/undefined를 건너뛴다', () => {
		expect(createCustomerName('A', null, undefined, 'B')).toBe('A B');
	});

	it('모두 비어있으면 fallback을 반환한다', () => {
		expect(createCustomerName()).toBe('-');
		expect(createCustomerName(null, null, null, null, null, '없음')).toBe('없음');
	});

	it('name1~5 모두 사용', () => {
		expect(createCustomerName('A', 'B', 'C', 'D', 'E')).toBe('A B C D E');
	});
});

describe('calculateBalance', () => {
	it('잔금을 계산한다', () => {
		expect(calculateBalance(1000, 300, 200)).toBe(500);
	});

	it('문자열 입력도 처리한다', () => {
		expect(calculateBalance('1000', '300', '200')).toBe(500);
	});

	it('음수이면 0을 반환한다', () => {
		expect(calculateBalance(100, 200, 100)).toBe(0);
	});

	it('NaN 입력은 0으로 처리한다', () => {
		expect(calculateBalance('abc', '100', '0')).toBe(0);
	});
});

describe('deepClone', () => {
	it('객체를 깊은 복사한다', () => {
		const original = { a: 1, b: { c: 2 } };
		const cloned = deepClone(original);
		cloned.b.c = 999;
		expect(original.b.c).toBe(2);
	});

	it('배열도 복사한다', () => {
		const original = [1, [2, 3]];
		const cloned = deepClone(original);
		expect(cloned).toEqual(original);
		expect(cloned).not.toBe(original);
	});
});

describe('debounce', () => {
	it('지정 시간 후에 실행한다', async () => {
		vi.useFakeTimers();
		const fn = vi.fn();
		const debounced = debounce(fn, 100);

		debounced();
		expect(fn).not.toHaveBeenCalled();

		vi.advanceTimersByTime(100);
		expect(fn).toHaveBeenCalledTimes(1);

		vi.useRealTimers();
	});

	it('연속 호출 시 마지막만 실행한다', () => {
		vi.useFakeTimers();
		const fn = vi.fn();
		const debounced = debounce(fn, 100);

		debounced();
		debounced();
		debounced();

		vi.advanceTimersByTime(100);
		expect(fn).toHaveBeenCalledTimes(1);

		vi.useRealTimers();
	});
});

describe('isEmpty', () => {
	it('null/undefined/빈 문자열은 true', () => {
		expect(isEmpty(null)).toBe(true);
		expect(isEmpty(undefined)).toBe(true);
		expect(isEmpty('')).toBe(true);
		expect(isEmpty('   ')).toBe(true);
	});

	it('값이 있으면 false', () => {
		expect(isEmpty('hello')).toBe(false);
		expect(isEmpty(' a ')).toBe(false);
	});
});

describe('safeString', () => {
	it('null/undefined는 fallback 반환', () => {
		expect(safeString(null)).toBe('');
		expect(safeString(undefined, 'default')).toBe('default');
	});

	it('값을 문자열로 변환', () => {
		expect(safeString(123)).toBe('123');
		expect(safeString(true)).toBe('true');
	});
});

describe('safeNumber', () => {
	it('null/undefined/빈 문자열은 fallback 반환', () => {
		expect(safeNumber(null)).toBe(0);
		expect(safeNumber(undefined, 99)).toBe(99);
		expect(safeNumber('')).toBe(0);
	});

	it('숫자 문자열을 파싱', () => {
		expect(safeNumber('42')).toBe(42);
		expect(safeNumber('abc')).toBe(0);
	});

	it('숫자는 그대로 반환', () => {
		expect(safeNumber(7)).toBe(7);
	});
});
