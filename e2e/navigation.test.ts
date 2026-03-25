import { test, expect } from '@playwright/test';
import { login } from './helpers';

test.describe('페이지 네비게이션', () => {
	test.beforeEach(async ({ page }) => {
		await login(page);
	});

	test('홈 페이지가 로드된다', async ({ page }) => {
		await expect(page.locator('text=사전영업중 고객')).toBeVisible();
		await expect(page.locator('text=AS미완료')).toBeVisible();
	});

	test('계약 페이지로 이동한다', async ({ page }) => {
		await page.goto('/contracts');
		await page.waitForLoadState('networkidle');
		await expect(page).toHaveURL('/contracts');
	});

	test('고객사 페이지로 이동한다', async ({ page }) => {
		await page.goto('/clients');
		await page.waitForLoadState('networkidle');
		await expect(page).toHaveURL('/clients');
	});

	test('제품 페이지로 이동한다', async ({ page }) => {
		await page.goto('/products');
		await page.waitForLoadState('networkidle');
		await expect(page).toHaveURL('/products');
	});

	test('펌웨어 페이지로 이동한다', async ({ page }) => {
		await page.goto('/firmware');
		await page.waitForLoadState('networkidle');
		await expect(page).toHaveURL('/firmware');
	});

	test('AS 페이지로 이동한다', async ({ page }) => {
		await page.goto('/as');
		await page.waitForLoadState('networkidle');
		await expect(page).toHaveURL('/as');
	});

	test('설정 페이지로 이동한다', async ({ page }) => {
		await page.goto('/settings');
		await page.waitForLoadState('networkidle');
		await expect(page).toHaveURL(/\/settings/);
	});
});
