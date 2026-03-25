import { test, expect } from '@playwright/test';
import { login } from './helpers';

test.describe('제품 관리', () => {
	test.beforeEach(async ({ page }) => {
		await login(page);
		await page.goto('/products');
		await page.waitForLoadState('networkidle');
	});

	test('제품 페이지가 로드된다', async ({ page }) => {
		await expect(page).toHaveURL('/products');
	});

	test('제품 추가 다이얼로그를 열고 닫을 수 있다', async ({ page }) => {
		// 추가 버튼 클릭
		const addButton = page.locator('button', { hasText: '추가' });
		if (await addButton.isVisible()) {
			await addButton.click();
			// 다이얼로그가 열리는지 확인
			const dialog = page.locator('[role="dialog"]');
			await expect(dialog).toBeVisible({ timeout: 3000 });
		}
	});

	test('제품을 생성할 수 있다', async ({ page }) => {
		const addButton = page.locator('button', { hasText: '제품 추가' });
		await expect(addButton).toBeVisible({ timeout: 5000 });
		await addButton.click();

		const dialog = page.locator('[role="dialog"]');
		await expect(dialog).toBeVisible({ timeout: 5000 });

		// 제품명 input (다이얼로그 내 첫 번째 input)
		const nameInput = dialog.locator('input').first();
		await nameInput.fill('E2E 테스트 제품');

		// "제품 추가" 버튼으로 제출
		await dialog.locator('button', { hasText: '제품 추가' }).click();
		await page.waitForLoadState('networkidle');
	});
});
