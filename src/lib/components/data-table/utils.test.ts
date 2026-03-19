import { describe, it, expect } from 'vitest';
import {
	formatPhoneNumber,
	validateEmail,
	validatePhone,
	formatCurrency,
	parseCurrency,
	dateValueToString,
	stringToDateValue,
	getRedirectPageAfterChange,
	executeSearch,
	executePagination
} from './utils';

describe('formatPhoneNumber', () => {
	it('휴대폰 번호를 포맷팅한다 (11자리)', () => {
		expect(formatPhoneNumber('01012345678')).toBe('010-1234-5678');
		expect(formatPhoneNumber('01112345678')).toBe('011-1234-5678');
	});

	it('서울 번호를 포맷팅한다 (9자리)', () => {
		expect(formatPhoneNumber('021234567')).toBe('02-123-4567');
	});

	it('서울 번호를 포맷팅한다 (10자리)', () => {
		expect(formatPhoneNumber('0212345678')).toBe('02-1234-5678');
	});

	it('지역번호를 포맷팅한다 (10자리)', () => {
		expect(formatPhoneNumber('0311234567')).toBe('031-123-4567');
	});

	it('지역번호를 포맷팅한다 (11자리)', () => {
		expect(formatPhoneNumber('03112345678')).toBe('031-1234-5678');
	});

	it('하이픈이 포함된 입력을 처리한다', () => {
		expect(formatPhoneNumber('010-1234-5678')).toBe('010-1234-5678');
	});

	it('빈 문자열을 처리한다', () => {
		expect(formatPhoneNumber('')).toBe('');
	});

	it('포맷팅 불가한 짧은 번호는 숫자만 반환한다', () => {
		expect(formatPhoneNumber('0101')).toBe('0101');
	});
});

describe('validateEmail', () => {
	it('유효한 이메일을 통과시킨다', () => {
		expect(validateEmail('test@example.com')).toBe(true);
		expect(validateEmail('user@domain.co.kr')).toBe(true);
	});

	it('유효하지 않은 이메일을 거부한다', () => {
		expect(validateEmail('notanemail')).toBe(false);
		expect(validateEmail('missing@')).toBe(false);
		expect(validateEmail('@nodomain.com')).toBe(false);
	});

	it('빈 문자열은 허용한다 (선택 필드)', () => {
		expect(validateEmail('')).toBe(true);
	});
});

describe('validatePhone', () => {
	it('유효한 한국 전화번호를 통과시킨다', () => {
		expect(validatePhone('010-1234-5678')).toBe(true);
		expect(validatePhone('01012345678')).toBe(true);
		expect(validatePhone('02-123-4567')).toBe(true);
		expect(validatePhone('031-123-4567')).toBe(true);
	});

	it('유효하지 않은 번호를 거부한다', () => {
		expect(validatePhone('1234')).toBe(false);
		expect(validatePhone('abc-defg-hijk')).toBe(false);
	});

	it('빈 문자열은 허용한다 (선택 필드)', () => {
		expect(validatePhone('')).toBe(true);
	});
});

describe('formatCurrency', () => {
	it('숫자에 콤마를 추가한다', () => {
		expect(formatCurrency('1000000')).toBe('1,000,000');
		expect(formatCurrency('1000')).toBe('1,000');
		expect(formatCurrency('100')).toBe('100');
	});

	it('이미 콤마가 있는 입력을 처리한다', () => {
		expect(formatCurrency('1,000,000')).toBe('1,000,000');
	});

	it('빈 문자열을 처리한다', () => {
		expect(formatCurrency('')).toBe('');
	});

	it('숫자가 아닌 문자를 제거한다', () => {
		expect(formatCurrency('abc123')).toBe('123');
	});
});

describe('parseCurrency', () => {
	it('콤마를 제거하여 숫자 문자열을 반환한다', () => {
		expect(parseCurrency('1,000,000')).toBe('1000000');
		expect(parseCurrency('1,000')).toBe('1000');
	});

	it('콤마가 없으면 그대로 반환한다', () => {
		expect(parseCurrency('1000')).toBe('1000');
	});
});

describe('stringToDateValue', () => {
	it('유효한 날짜 문자열을 DateValue로 변환한다', () => {
		const result = stringToDateValue('2024-01-15');
		expect(result).toBeDefined();
		expect(result?.toString()).toBe('2024-01-15');
	});

	it('빈/null/undefined를 undefined로 반환한다', () => {
		expect(stringToDateValue('')).toBeUndefined();
		expect(stringToDateValue(null)).toBeUndefined();
		expect(stringToDateValue(undefined)).toBeUndefined();
	});

	it('잘못된 날짜 문자열은 undefined를 반환한다', () => {
		expect(stringToDateValue('invalid')).toBeUndefined();
	});
});

describe('dateValueToString', () => {
	it('undefined를 빈 문자열로 반환한다', () => {
		expect(dateValueToString(undefined)).toBe('');
	});

	it('DateValue를 문자열로 변환한다', () => {
		const dateValue = stringToDateValue('2024-06-15');
		expect(dateValueToString(dateValue)).toBe('2024-06-15');
	});
});

describe('getRedirectPageAfterChange', () => {
	it('삭제 후 현재 페이지가 유효하면 그대로 유지한다', () => {
		// 50개 중 5개 삭제, pageSize=10, 현재 2페이지
		expect(getRedirectPageAfterChange(2, 50, 5, 10)).toBe(2);
	});

	it('삭제 후 현재 페이지가 비면 이전 페이지로 이동한다', () => {
		// 11개 중 1개 삭제 (마지막 페이지의 유일한 항목), pageSize=10, 현재 2페이지
		expect(getRedirectPageAfterChange(2, 11, 1, 10)).toBe(1);
	});

	it('전체 삭제 시 1페이지로 이동한다', () => {
		expect(getRedirectPageAfterChange(3, 5, 5, 10)).toBe(1);
	});

	it('1페이지에서 삭제 시 1페이지를 유지한다', () => {
		expect(getRedirectPageAfterChange(1, 5, 3, 10)).toBe(1);
	});
});

describe('executeSearch', () => {
	it('유효한 타입과 검색어로 URL을 반환한다', () => {
		const url = new URL('http://localhost/products');
		const result = executeSearch('products', '테스트', 'productName', url);
		expect(result).not.toBeNull();
		expect(result?.searchParams.get('search')).toBe('테스트');
		expect(result?.searchParams.get('field')).toBe('productName');
	});

	it('검색어가 비면 search 파라미터를 제거한다', () => {
		const url = new URL('http://localhost/products?search=old&field=productName');
		const result = executeSearch('products', '', null, url);
		expect(result).not.toBeNull();
		expect(result?.searchParams.has('search')).toBe(false);
		expect(result?.searchParams.has('field')).toBe(false);
	});

	it('유효하지 않은 타입이면 null을 반환한다', () => {
		const url = new URL('http://localhost/invalid');
		expect(executeSearch('invalid', '검색어', 'name', url)).toBeNull();
	});

	it('변경사항이 없으면 null을 반환한다', () => {
		const url = new URL('http://localhost/products?search=테스트&field=productName');
		expect(executeSearch('products', '테스트', 'productName', url)).toBeNull();
	});

	it('검색어 변경 시 페이지를 1로 리셋한다', () => {
		const url = new URL('http://localhost/products?search=old&field=productName&page=3');
		const result = executeSearch('products', '새검색어', 'productName', url);
		expect(result?.searchParams.get('page')).toBe('1');
	});
});

describe('executePagination', () => {
	it('페이지 변경 시 URL을 반환한다', () => {
		const url = new URL('http://localhost/products?page=1');
		const result = executePagination('products', 1, 25, url, 25); // pageIndex 1 = page 2
		expect(result).not.toBeNull();
		expect(result?.searchParams.get('page')).toBe('2');
	});

	it('변경사항이 없으면 null을 반환한다', () => {
		const url = new URL('http://localhost/products?page=1');
		const result = executePagination('products', 0, 25, url, 25);
		expect(result).toBeNull();
	});

	it('유효하지 않은 타입이면 null을 반환한다', () => {
		const url = new URL('http://localhost/invalid');
		expect(executePagination('invalid', 0, 25, url, 25)).toBeNull();
	});

	it('pageSize 변경 시 URL에 반영한다', () => {
		const url = new URL('http://localhost/products?page=1&pageSize=25');
		const result = executePagination('products', 0, 50, url, 25);
		expect(result?.searchParams.get('pageSize')).toBe('50');
	});
});
