import { describe, it, expect, vi, beforeEach } from 'vitest';

const { mockWhere, mockLimit, mockThen, mockGetFileNamesByListId, mockInvWhere } = vi.hoisted(() => ({
	mockWhere: vi.fn(),
	mockLimit: vi.fn(),
	mockThen: vi.fn(),
	mockInvWhere: vi.fn(),
	mockGetFileNamesByListId: vi.fn()
}));

vi.mock('$lib/server/db', () => ({
	db: {
		select: vi.fn(() => ({
			from: vi.fn(() => ({
				where: mockWhere
			}))
		}))
	}
}));

vi.mock('$lib/server/db/schema', () => ({
	products: { productId: 'productId', deletedAt: 'deletedAt' },
	productInventory: { productId: 'productId', deletedAt: 'deletedAt' }
}));

vi.mock('$lib/server/file-storage', () => ({
	getFileNamesByListId: mockGetFileNamesByListId
}));

vi.mock('drizzle-orm', () => ({
	eq: vi.fn(),
	and: vi.fn(),
	isNull: vi.fn()
}));

import { GET } from './+server';

function createMockEvent(id?: string) {
	return { params: { id } } as any;
}

describe('GET /api/products/[id]', () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it('id가 없으면 400을 반환한다', async () => {
		const response = await GET(createMockEvent(undefined));
		const data = await response.json();

		expect(response.status).toBe(400);
		expect(data.error).toContain('제품 ID');
	});

	it('존재하지 않는 제품이면 404를 반환한다', async () => {
		mockWhere.mockReturnValue({
			limit: vi.fn().mockReturnValue({
				then: vi.fn((cb: Function) => cb([]))
			})
		});

		const response = await GET(createMockEvent('999'));
		const data = await response.json();

		expect(response.status).toBe(404);
		expect(data.error).toContain('제품을 찾을 수 없');
	});

	it('제품 정보를 정상 반환한다', async () => {
		const mockProduct = {
			productId: 1,
			name: '테스트 제품',
			code: 'P001',
			version: '1.0',
			price: 10000,
			memo: '메모',
			protocolId: null,
			photoFileListId: 'photo-1'
		};

		// Product query chain
		mockWhere.mockReturnValueOnce({
			limit: vi.fn().mockReturnValue({
				then: vi.fn((cb: Function) => cb([mockProduct]))
			})
		});

		// Inventory query chain
		mockWhere.mockReturnValueOnce(Promise.resolve([
			{ type: '입고', content: 'A', date: '2025-01-01', quantity: 10 }
		]));

		mockGetFileNamesByListId.mockResolvedValue(['photo.jpg']);

		const response = await GET(createMockEvent('1'));
		const data = await response.json();

		expect(response.status).toBe(200);
		expect(data.product.name).toBe('테스트 제품');
		expect(data.product.photoFileName).toBe('photo.jpg');
		expect(data.product.inventoryData).toHaveLength(1);
	});
});
