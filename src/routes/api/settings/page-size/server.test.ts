import { describe, it, expect, vi, beforeEach } from 'vitest';

const { mockInsertValues, mockOnConflictDoUpdate } = vi.hoisted(() => {
	const mockOnConflictDoUpdate = vi.fn().mockResolvedValue(undefined);
	const mockInsertValues = vi.fn(() => ({ onConflictDoUpdate: mockOnConflictDoUpdate }));
	return { mockInsertValues, mockOnConflictDoUpdate };
});

vi.mock('$lib/server/db', () => ({
	db: {
		insert: vi.fn(() => ({ values: mockInsertValues }))
	}
}));

vi.mock('$lib/server/db/schema', () => ({
	settings: { key: 'key', value: 'value' }
}));

vi.mock('drizzle-orm', () => ({
	eq: vi.fn()
}));

import { POST } from './+server';

function createMockEvent(body: unknown) {
	return {
		request: new Request('http://localhost/api/settings/page-size', {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify(body)
		})
	} as any;
}

describe('POST /api/settings/page-size', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		mockOnConflictDoUpdate.mockResolvedValue(undefined);
	});

	it('유효한 pageSize를 저장한다', async () => {
		const response = await POST(createMockEvent({ pageSize: 20 }));
		const data = await response.json();

		expect(response.status).toBe(200);
		expect(data.success).toBe(true);
		expect(mockInsertValues).toHaveBeenCalled();
	});

	it('pageSize가 없으면 400을 반환한다', async () => {
		const response = await POST(createMockEvent({}));
		const data = await response.json();

		expect(response.status).toBe(400);
		expect(data.error).toBeDefined();
	});

	it('pageSize가 NaN이면 400을 반환한다', async () => {
		const response = await POST(createMockEvent({ pageSize: 'abc' }));
		const data = await response.json();

		expect(response.status).toBe(400);
		expect(data.error).toBeDefined();
	});

	it('DB 에러 시 500을 반환한다', async () => {
		mockOnConflictDoUpdate.mockRejectedValueOnce(new Error('DB error'));

		const response = await POST(createMockEvent({ pageSize: 10 }));
		const data = await response.json();

		expect(response.status).toBe(500);
		expect(data.error).toBeDefined();
	});
});
