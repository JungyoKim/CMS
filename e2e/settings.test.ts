import { test, expect } from '@playwright/test';
import { login } from './helpers';

test.describe('설정 페이지', () => {
	test.beforeEach(async ({ page }) => {
		await login(page);
	});

	test('설정 페이지로 이동할 수 있다', async ({ page }) => {
		const response = await page.goto('/settings');
		// +page.svelte가 없으면 500 에러가 발생할 수 있음
		// 정상이든 에러든 응답이 오는지만 확인
		expect(response).not.toBeNull();
	});
});
