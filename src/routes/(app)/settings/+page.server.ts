import { fail } from '@sveltejs/kit';
import type { Actions } from './$types';
import { db } from '$lib/server/db';
import { settings, passwords } from '$lib/server/db/schema';
import { eq } from 'drizzle-orm';
import { verifyPassword, hashPassword } from '$lib/server/password';

export const actions: Actions = {
	changePassword: async ({ request }) => {
		const formData = await request.formData();
		const currentPassword = formData.get('currentPassword')?.toString();
		const newPassword = formData.get('newPassword')?.toString();
		const confirmPassword = formData.get('confirmPassword')?.toString();

		if (!currentPassword || !newPassword || !confirmPassword) {
			return fail(400, { error: '모든 필드를 입력해주세요.' });
		}

		if (newPassword !== confirmPassword) {
			return fail(400, { error: '새 비밀번호와 확인 비밀번호가 일치하지 않습니다.' });
		}

		if (currentPassword === newPassword) {
			return fail(400, { error: '현재 비밀번호와 새 비밀번호가 같습니다. 다른 비밀번호를 입력해주세요.' });
		}

		// 현재 비밀번호 확인
		const storedPassword = await db.select().from(passwords).limit(1);
		const currentStoredPassword = storedPassword[0]?.password || '1234';

		if (!verifyPassword(currentPassword, currentStoredPassword)) {
			return fail(401, { error: '현재 비밀번호가 올바르지 않습니다.' });
		}

		// 새 비밀번호를 해싱하여 저장
		const hashedNewPassword = hashPassword(newPassword);
		if (storedPassword.length > 0) {
			await db.update(passwords)
				.set({ password: hashedNewPassword })
				.where(eq(passwords.pwId, storedPassword[0].pwId));
		} else {
			await db.insert(passwords).values({ password: hashedNewPassword });
		}

		return { success: true };
	},

	setTokenExpiration: async ({ request }) => {
		const formData = await request.formData();
		const expirationType = formData.get('expirationType')?.toString();
		const expirationValue = formData.get('expirationValue')?.toString();

		if (!expirationType) {
			return fail(400, { error: '유효기간 타입을 선택해주세요.' });
		}

		if (expirationType === 'never') {
			// 만료 없음 설정
			const existing = await db.select().from(settings).where(eq(settings.key, 'tokenExpiration')).limit(1);
			if (existing.length > 0) {
				await db.update(settings)
					.set({ value: 'never' })
					.where(eq(settings.key, 'tokenExpiration'));
			} else {
				await db.insert(settings).values({ key: 'tokenExpiration', value: 'never' });
			}
		} else {
			if (!expirationValue) {
				return fail(400, { error: '유효기간 값을 입력해주세요.' });
			}

			const value = parseInt(expirationValue);
			if (isNaN(value) || value < 1) {
				return fail(400, { error: '유효한 값을 입력해주세요.' });
			}

			if (expirationType === 'days' && value > 7) {
				return fail(400, { error: '일 단위는 최대 7일까지 설정할 수 있습니다.' });
			}

			// 설정 저장 (예: "minutes:30", "hours:2", "days:7")
			const settingValue = `${expirationType}:${value}`;
			const existing = await db.select().from(settings).where(eq(settings.key, 'tokenExpiration')).limit(1);
			if (existing.length > 0) {
				await db.update(settings)
					.set({ value: settingValue })
					.where(eq(settings.key, 'tokenExpiration'));
			} else {
				await db.insert(settings).values({ key: 'tokenExpiration', value: settingValue });
			}
		}

		return { success: true };
	}
};


