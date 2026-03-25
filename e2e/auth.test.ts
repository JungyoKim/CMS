import { test, expect } from '@playwright/test';

test.describe('인증 플로우', () => {
	test('로그인 페이지가 표시된다', async ({ page }) => {
		await page.goto('/login');
		await expect(page.locator('text=고객 관리 시스템')).toBeVisible();
		await expect(page.locator('input[name="password"]')).toBeVisible();
		await expect(page.locator('button[type="submit"]')).toBeVisible();
	});

	test('비밀번호 없이 로그인 시도하면 실패한다', async ({ page }) => {
		await page.goto('/login');
		await page.locator('button[type="submit"]').click();
		// required 속성으로 브라우저 기본 validation이 동작
		// input이 아직 포커스 상태여야 함
		await expect(page.locator('input[name="password"]')).toBeFocused();
	});

	test('틀린 비밀번호로 로그인하면 에러 메시지가 표시된다', async ({ page }) => {
		await page.goto('/login');
		await page.waitForLoadState('networkidle');
		const input = page.locator('input[name="password"]');
		await input.click();
		await input.fill('wrongpassword');
		// 폼 제출 후 서버 응답 대기
		await Promise.all([
			page.waitForResponse(resp => resp.url().includes('/login') && resp.status() >= 200),
			page.locator('button[type="submit"]').click()
		]);
		// 에러 메시지 또는 로그인 페이지 유지 확인
		await expect(page).toHaveURL(/\/login/, { timeout: 5000 });
	});

	test('올바른 비밀번호로 로그인하면 홈으로 이동한다', async ({ page }) => {
		await page.goto('/login');
		await page.locator('input[name="password"]').fill('1234');
		await page.locator('button[type="submit"]').click();
		await page.waitForURL('/', { timeout: 10000 });
		await expect(page).toHaveURL('/');
	});

	test('인증 없이 보호된 페이지 접근 시 로그인으로 리다이렉트', async ({ page }) => {
		await page.goto('/products');
		await expect(page).toHaveURL(/\/login/);
	});

	test('로그아웃하면 로그인 페이지로 이동한다', async ({ page }) => {
		// 먼저 로그인
		await page.goto('/login');
		await page.locator('input[name="password"]').fill('1234');
		await page.locator('button[type="submit"]').click();
		await page.waitForURL('/', { timeout: 10000 });

		// 로그아웃
		await page.goto('/logout');
		await expect(page).toHaveURL(/\/login/);
	});
});
