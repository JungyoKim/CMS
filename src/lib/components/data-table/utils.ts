import { parseDate, type DateValue } from "@internationalized/date";
import { DateFormatter } from "@internationalized/date";

// DateFormatter for Korean locale
export const dateFormatter = new DateFormatter("ko-KR", {
	dateStyle: "long"
});

// Helper function to convert DateValue to string (YYYY-MM-DD format)
export function dateValueToString(date: DateValue | undefined): string {
	if (!date) return "";
	return date.toString();
}

// Helper function to convert string to DateValue
export function stringToDateValue(dateString: string | undefined | null): DateValue | undefined {
	if (!dateString) return undefined;
	try {
		return parseDate(dateString);
	} catch {
		return undefined;
	}
}

// 정규식 패턴
export const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
// 한국 전화번호: 
// - 휴대폰: 010-1234-5678, 01012345678 (11자리)
// - 서울: 02-123-4567, 02-1234-5678, 0212345678 (9-10자리)
// - 지역번호: 031-123-4567, 031-1234-5678, 0311234567 (10-11자리)
export const phoneRegex = /^(01[016-9]-?[0-9]{3,4}-?[0-9]{4}|02-?[0-9]{3,4}-?[0-9]{4}|0[3-9][0-9]-?[0-9]{3,4}-?[0-9]{4})$/;

// 전화번호 포맷팅 함수
export function formatPhoneNumber(value: string): string {
	// 숫자만 추출
	const numbers = value.replace(/[^\d]/g, '');

	if (!numbers) return '';

	// 휴대폰 번호 (010, 011, 016, 017, 018, 019로 시작하는 11자리)
	if (numbers.startsWith('01') && numbers.length === 11) {
		return `${numbers.slice(0, 3)}-${numbers.slice(3, 7)}-${numbers.slice(7)}`;
	}

	// 서울 지역번호 (02로 시작)
	if (numbers.startsWith('02')) {
		if (numbers.length === 9) {
			// 02-123-4567
			return `${numbers.slice(0, 2)}-${numbers.slice(2, 5)}-${numbers.slice(5)}`;
		} else if (numbers.length === 10) {
			// 02-1234-5678
			return `${numbers.slice(0, 2)}-${numbers.slice(2, 6)}-${numbers.slice(6)}`;
		}
	}

	// 지역번호 (031, 032, 033, 041, 042, 043, 044, 051, 052, 053, 054, 055, 061, 062, 063, 064 등)
	if (numbers.length === 10) {
		// 031-123-4567
		return `${numbers.slice(0, 3)}-${numbers.slice(3, 6)}-${numbers.slice(6)}`;
	} else if (numbers.length === 11) {
		// 031-1234-5678
		return `${numbers.slice(0, 3)}-${numbers.slice(3, 7)}-${numbers.slice(7)}`;
	}

	// 포맷팅이 안 되는 경우 숫자만 반환 (입력 중일 수 있음)
	return numbers;
}

// 검증 함수
export function validateEmail(email: string): boolean {
	if (!email) return true; // 빈 값은 허용 (선택 필드)
	return emailRegex.test(email);
}

export function validatePhone(phone: string): boolean {
	if (!phone) return true; // 빈 값은 허용 (선택 필드)
	return phoneRegex.test(phone);
}

// 서버 사이드 검색 실행 함수
export function executeSearch(
	type: string,
	searchQuery: string,
	searchField: string | null | undefined,
	currentUrl: URL
): URL | null {
	if (type !== "products" && type !== "firmware" && type !== "clients" && type !== "contracts" && type !== "as") {
		return null;
	}

	const url = new URL(currentUrl);
	const currentSearch = url.searchParams.get('search') || '';
	const currentField = url.searchParams.get('field') || null;

	let urlChanged = false;

	// 고객상태나 AS상태인 경우 빈 검색어도 허용 (전체 리스트 표시)
	if (searchField && (searchField === "customerStatus" || searchField === "asStatus")) {
		if (searchField !== currentField || searchQuery !== currentSearch) {
			url.searchParams.set('field', searchField);
			if (searchQuery.trim()) {
				url.searchParams.set('search', searchQuery.trim());
			} else {
				url.searchParams.delete('search');
			}
			// 검색어가 변경된 경우 페이지를 1로 리셋
			if (searchQuery !== currentSearch) {
				url.searchParams.set('page', '1');
			}
			urlChanged = true;
		}
	} else if (searchField && searchQuery.trim()) {
		if (searchField !== currentField || searchQuery.trim() !== currentSearch) {
			url.searchParams.set('field', searchField);
			url.searchParams.set('search', searchQuery.trim());
			// 검색어가 변경된 경우 페이지를 1로 리셋
			if (searchQuery.trim() !== currentSearch) {
				url.searchParams.set('page', '1');
			}
			urlChanged = true;
		}
	} else {
		if (currentSearch || currentField) {
			url.searchParams.delete('field');
			url.searchParams.delete('search');
			url.searchParams.set('page', '1');
			urlChanged = true;
		}
	}

	return urlChanged ? url : null;
}

// 서버 사이드 페이지네이션 실행 함수
export function executePagination(
	type: string,
	pageIndex: number,
	pageSize: number,
	currentUrl: URL,
	defaultPageSize: number
): URL | null {
	if (type !== "products" && type !== "firmware" && type !== "clients" && type !== "contracts" && type !== "as") {
		return null;
	}

	const url = new URL(currentUrl);
	const newPage = pageIndex + 1;
	const currentPageFromUrl = parseInt(url.searchParams.get('page') || '1', 10);
	const currentPageSizeFromUrl = parseInt(url.searchParams.get('pageSize') || String(defaultPageSize), 10);

	if (newPage !== currentPageFromUrl || pageSize !== currentPageSizeFromUrl) {
		url.searchParams.set('page', String(newPage));
		if (pageSize !== currentPageSizeFromUrl) {
			url.searchParams.set('pageSize', String(pageSize));
		}
		return url;
	}

	return null;
}

/**
 * Calculate the appropriate page to navigate to after delete/add operations.
 * If current page would be empty, go to previous page.
 * @param currentPage - Current page number (1-indexed)
 * @param currentTotalCount - Current total count BEFORE the operation
 * @param deletedCount - Number of items being deleted (use negative for adds)
 * @param pageSize - Items per page
 * @returns The page number to navigate to (1-indexed)
 */
export function getRedirectPageAfterChange(
	currentPage: number,
	currentTotalCount: number,
	deletedCount: number,
	pageSize: number
): number {
	const newTotalCount = currentTotalCount - deletedCount;
	const newTotalPages = Math.ceil(newTotalCount / pageSize) || 1;

	// If current page would be beyond total pages, go to last valid page
	if (currentPage > newTotalPages) {
		return Math.max(1, newTotalPages);
	}
	return currentPage;
}

/**
 * Create a URL for navigating after data change with proper page handling
 */
export function createPageRedirectUrl(
	currentUrl: URL,
	targetPage: number
): URL {
	const url = new URL(currentUrl);
	url.searchParams.set('page', String(targetPage));
	return url;
}

// 금액 포맷팅: 숫자에 콤마 자동 삽입 (예: 1000000 → 1,000,000)
export function formatCurrency(value: string): string {
	// 숫자와 콤마만 남기기
	const numbers = value.replace(/[^\d]/g, '');
	if (!numbers) return '';
	return Number(numbers).toLocaleString('ko-KR');
}

// 금액 파싱: 콤마 제거하여 순수 숫자 문자열 반환
export function parseCurrency(formatted: string): string {
	return formatted.replace(/,/g, '');
}

// Re-export utilities from other modules for convenient access
export * from './form-utils.js';
export * from './file-utils.js';

