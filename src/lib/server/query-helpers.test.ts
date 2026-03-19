import { describe, it, expect } from 'vitest';
import { createClientName, calculateASStatus } from './query-helpers';

describe('createClientName', () => {
	it('name1만 있을 때 그대로 반환한다', () => {
		expect(createClientName({ name1: '삼성전자' })).toBe('삼성전자');
	});

	it('여러 name을 공백으로 연결한다', () => {
		expect(createClientName({ name1: '삼성', name2: '전자' })).toBe('삼성 전자');
		expect(createClientName({ name1: 'A', name2: 'B', name3: 'C' })).toBe('A B C');
	});

	it('null/undefined name은 건너뛴다', () => {
		expect(createClientName({ name1: '삼성', name2: null, name3: '전자' })).toBe('삼성 전자');
		expect(createClientName({ name1: null, name2: undefined, name3: '테스트' })).toBe('테스트');
	});

	it('모든 name이 비어있으면 "-"를 반환한다', () => {
		expect(createClientName({ name1: null, name2: null })).toBe('-');
		expect(createClientName({})).toBe('-');
	});

	it('null/undefined 클라이언트이면 "-"를 반환한다', () => {
		expect(createClientName(null)).toBe('-');
		expect(createClientName(undefined)).toBe('-');
	});

	it('name1~5 모두 있는 경우', () => {
		expect(createClientName({
			name1: 'A', name2: 'B', name3: 'C', name4: 'D', name5: 'E'
		})).toBe('A B C D E');
	});
});

describe('calculateASStatus', () => {
	it('기록이 없으면 "없음"을 반환한다', () => {
		expect(calculateASStatus([])).toEqual({ status: '없음', incompleteCount: 0 });
	});

	it('모든 기록이 완료되면 "완료"를 반환한다', () => {
		const records = [
			{ isCompleted: 1 },
			{ isCompleted: 1 },
		];
		expect(calculateASStatus(records)).toEqual({ status: '완료', incompleteCount: 0 });
	});

	it('미완료 기록이 있으면 "진행중"과 미완료 수를 반환한다', () => {
		const records = [
			{ isCompleted: 0 },
			{ isCompleted: 1 },
			{ isCompleted: 0 },
		];
		expect(calculateASStatus(records)).toEqual({ status: '진행중', incompleteCount: 2 });
	});

	it('모든 기록이 미완료면 "진행중"을 반환한다', () => {
		const records = [
			{ isCompleted: 0 },
			{ isCompleted: 0 },
		];
		expect(calculateASStatus(records)).toEqual({ status: '진행중', incompleteCount: 2 });
	});

	it('isCompleted가 null인 경우 미완료로 처리한다', () => {
		const records = [
			{ isCompleted: null },
			{ isCompleted: 1 },
		];
		expect(calculateASStatus(records)).toEqual({ status: '진행중', incompleteCount: 1 });
	});

	it('isCompleted가 undefined인 경우 미완료로 처리한다', () => {
		const records = [
			{ isCompleted: undefined },
		];
		expect(calculateASStatus(records)).toEqual({ status: '진행중', incompleteCount: 1 });
	});
});
