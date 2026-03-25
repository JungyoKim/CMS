import { type Page, expect } from '@playwright/test';

/**
 * 기본 비밀번호(1234)로 로그인하고 홈 페이지까지 이동
 */
export async function login(page: Page, password: string = '1234') {
	await page.goto('/login');
	await page.locator('input[name="password"]').fill(password);
	await page.locator('button[type="submit"]').click();

	// 로그인 성공 시 /login이 아닌 다른 페이지로 이동해야 함
	// enhance가 redirect를 처리하거나 서버가 302를 반환함
	await page.waitForURL((url) => !url.pathname.includes('/login'), { timeout: 15000 });
}
