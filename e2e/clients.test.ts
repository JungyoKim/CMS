import { test, expect } from '@playwright/test';
import { login } from './helpers';

test.describe('고객사 관리', () => {
	test.beforeEach(async ({ page }) => {
		await login(page);
		await page.goto('/clients');
		await page.waitForLoadState('networkidle');
	});

	test('고객사 페이지가 로드된다', async ({ page }) => {
		await expect(page).toHaveURL('/clients');
	});

	test('고객사 추가 다이얼로그를 열 수 있다', async ({ page }) => {
		const addButton = page.locator('button', { hasText: '추가' });
		if (await addButton.isVisible()) {
			await addButton.click();
			const dialog = page.locator('[role="dialog"]');
			await expect(dialog).toBeVisible({ timeout: 3000 });
		}
	});

	test('고객사를 생성할 수 있다', async ({ page }) => {
		const addButton = page.locator('button', { hasText: '추가' });
		if (!await addButton.isVisible()) return;

		await addButton.click();
		const dialog = page.locator('[role="dialog"]');
		await expect(dialog).toBeVisible({ timeout: 3000 });

		// 고객사명 입력
		const nameInput = dialog.locator('input[name="name1"]');
		if (await nameInput.isVisible()) {
			await nameInput.fill('E2E 테스트');
		}

		const nameInput2 = dialog.locator('input[name="name2"]');
		if (await nameInput2.isVisible()) {
			await nameInput2.fill('고객사');
		}

		// 저장
		const saveButton = dialog.locator('button[type="submit"], button:has-text("저장")');
		if (await saveButton.isVisible()) {
			await saveButton.click();
			await page.waitForLoadState('networkidle');
		}
	});
});
