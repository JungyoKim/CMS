import { describe, it, expect, vi, beforeEach } from 'vitest';

const { mockSelectLimit, mockUpdateSet, mockUpdateWhere, mockInsertValues, mockOnConflictDoUpdate } = vi.hoisted(() => {
	const mockUpdateWhere = vi.fn().mockResolvedValue(undefined);
	const mockUpdateSet = vi.fn(() => ({ where: mockUpdateWhere }));
	const mockSelectLimit = vi.fn();
	const mockOnConflictDoUpdate = vi.fn().mockResolvedValue(undefined);
	const mockInsertValues = vi.fn(() => ({ onConflictDoUpdate: mockOnConflictDoUpdate }));
	return { mockSelectLimit, mockUpdateSet, mockUpdateWhere, mockInsertValues, mockOnConflictDoUpdate };
});

vi.mock('$lib/server/db', () => ({
	db: {
		select: vi.fn(() => ({ from: vi.fn(() => ({ limit: mockSelectLimit })) })),
		update: vi.fn(() => ({ set: mockUpdateSet })),
		insert: vi.fn(() => ({ values: mockInsertValues }))
	}
}));

vi.mock('$lib/server/db/schema', () => ({
	settings: { key: 'key', value: 'value' },
	passwords: { pwId: 'pwId', password: 'password' }
}));

vi.mock('drizzle-orm', () => ({
	eq: vi.fn()
}));

import { hashPassword } from '$lib/server/password';
import { actions } from './+page.server';

function createFormEvent(data: Record<string, string>) {
	const formData = new FormData();
	for (const [key, value] of Object.entries(data)) {
		formData.set(key, value);
	}
	return {
		request: { formData: () => Promise.resolve(formData) }
	} as any;
}

describe('changePassword', () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it('필수 필드가 없으면 400을 반환한다', async () => {
		const result = await actions.changePassword(createFormEvent({
			currentPassword: 'old',
			newPassword: 'new'
			// confirmPassword 누락
		}));
		expect(result?.status).toBe(400);
	});

	it('새 비밀번호와 확인이 불일치하면 400을 반환한다', async () => {
		const result = await actions.changePassword(createFormEvent({
			currentPassword: 'old',
			newPassword: 'new1',
			confirmPassword: 'new2'
		}));
		expect(result?.status).toBe(400);
		expect((result?.data as any)?.error).toContain('일치하지 않');
	});

	it('현재와 새 비밀번호가 같으면 400을 반환한다', async () => {
		const result = await actions.changePassword(createFormEvent({
			currentPassword: 'same',
			newPassword: 'same',
			confirmPassword: 'same'
		}));
		expect(result?.status).toBe(400);
		expect((result?.data as any)?.error).toContain('같습니다');
	});

	it('저장된 비밀번호가 없으면 400을 반환한다', async () => {
		mockSelectLimit.mockResolvedValue([]);

		const result = await actions.changePassword(createFormEvent({
			currentPassword: 'old',
			newPassword: 'new123',
			confirmPassword: 'new123'
		}));
		expect(result?.status).toBe(400);
		expect((result?.data as any)?.error).toContain('저장된 비밀번호');
	});

	it('현재 비밀번호가 틀리면 401을 반환한다', async () => {
		const hashed = hashPassword('correct');
		mockSelectLimit.mockResolvedValue([{ password: hashed, pwId: 1 }]);

		const result = await actions.changePassword(createFormEvent({
			currentPassword: 'wrong',
			newPassword: 'new123',
			confirmPassword: 'new123'
		}));
		expect(result?.status).toBe(401);
	});

	it('비밀번호를 성공적으로 변경한다', async () => {
		const hashed = hashPassword('oldpassword');
		mockSelectLimit.mockResolvedValue([{ password: hashed, pwId: 1 }]);

		const result = await actions.changePassword(createFormEvent({
			currentPassword: 'oldpassword',
			newPassword: 'newpassword',
			confirmPassword: 'newpassword'
		}));
		expect((result as any)?.success).toBe(true);
		expect(mockUpdateSet).toHaveBeenCalled();
	});
});

describe('setTokenExpiration', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		mockOnConflictDoUpdate.mockResolvedValue(undefined);
	});

	it('expirationType이 없으면 400을 반환한다', async () => {
		const result = await actions.setTokenExpiration(createFormEvent({}));
		expect(result?.status).toBe(400);
	});

	it('never를 설정한다', async () => {
		const result = await actions.setTokenExpiration(createFormEvent({
			expirationType: 'never'
		}));
		expect((result as any)?.success).toBe(true);
		expect(mockInsertValues).toHaveBeenCalled();
	});

	it('일 단위 7일 초과는 400을 반환한다', async () => {
		const result = await actions.setTokenExpiration(createFormEvent({
			expirationType: 'days',
			expirationValue: '10'
		}));
		expect(result?.status).toBe(400);
		expect((result?.data as any)?.error).toContain('7일');
	});

	it('유효한 시간 단위 설정을 저장한다', async () => {
		const result = await actions.setTokenExpiration(createFormEvent({
			expirationType: 'hours',
			expirationValue: '2'
		}));
		expect((result as any)?.success).toBe(true);
	});

	it('유효하지 않은 값은 400을 반환한다', async () => {
		const result = await actions.setTokenExpiration(createFormEvent({
			expirationType: 'hours',
			expirationValue: 'abc'
		}));
		expect(result?.status).toBe(400);
	});

	it('expirationValue 없이 days를 보내면 400을 반환한다', async () => {
		const result = await actions.setTokenExpiration(createFormEvent({
			expirationType: 'days'
		}));
		expect(result?.status).toBe(400);
	});
});
