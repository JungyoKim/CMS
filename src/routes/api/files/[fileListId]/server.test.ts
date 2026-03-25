import { describe, it, expect, vi, beforeEach } from 'vitest';

const { mockWhere, mockAccess, mockReadFile } = vi.hoisted(() => ({
	mockWhere: vi.fn(),
	mockAccess: vi.fn(),
	mockReadFile: vi.fn()
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
	files: {
		fileListId: 'fileListId',
		storedFilePath: 'storedFilePath',
		originalFileName: 'originalFileName',
		extension: 'extension',
		deletedAt: 'deletedAt'
	}
}));

vi.mock('$lib/server/file-storage', () => ({
	UPLOAD_ROOT: '/uploads'
}));

vi.mock('node:fs/promises', () => ({
	default: {
		access: (...args: unknown[]) => mockAccess(...args),
		readFile: (...args: unknown[]) => mockReadFile(...args)
	}
}));

vi.mock('drizzle-orm', () => ({
	eq: vi.fn(),
	and: vi.fn(),
	isNull: vi.fn()
}));

import { GET } from './+server';

function createMockEvent(fileListId?: string) {
	return { params: { fileListId } } as any;
}

describe('GET /api/files/[fileListId]', () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it('fileListId가 없으면 400을 반환한다', async () => {
		const response = await GET(createMockEvent(undefined));
		const data = await response.json();

		expect(response.status).toBe(400);
		expect(data.error).toContain('파일 ID');
	});

	it('DB에 파일이 없으면 404를 반환한다', async () => {
		mockWhere.mockReturnValue({
			limit: vi.fn().mockReturnValue({
				then: vi.fn((cb: Function) => cb([]))
			})
		});

		const response = await GET(createMockEvent('nonexistent'));
		const data = await response.json();

		expect(response.status).toBe(404);
		expect(data.error).toContain('파일을 찾을 수 없');
	});

	it('경로 트래버설 공격을 차단한다', async () => {
		mockWhere.mockReturnValue({
			limit: vi.fn().mockReturnValue({
				then: vi.fn((cb: Function) => cb([{
					storedFilePath: '/etc/passwd',
					originalFileName: 'passwd',
					extension: ''
				}]))
			})
		});

		const response = await GET(createMockEvent('attack'));
		const data = await response.json();

		expect(response.status).toBe(404);
		expect(data.error).toContain('파일을 찾을 수 없');
	});

	it('파일이 디스크에 없으면 404를 반환한다', async () => {
		mockWhere.mockReturnValue({
			limit: vi.fn().mockReturnValue({
				then: vi.fn((cb: Function) => cb([{
					storedFilePath: '/uploads/test/file.png',
					originalFileName: 'file.png',
					extension: 'png'
				}]))
			})
		});
		mockAccess.mockRejectedValue(new Error('ENOENT'));

		const response = await GET(createMockEvent('valid-id'));
		const data = await response.json();

		expect(response.status).toBe(404);
		expect(data.error).toContain('존재하지 않');
	});

	it('정상 파일을 다운로드한다', async () => {
		const fileContent = Buffer.from('test content');
		mockWhere.mockReturnValue({
			limit: vi.fn().mockReturnValue({
				then: vi.fn((cb: Function) => cb([{
					storedFilePath: '/uploads/test/file.png',
					originalFileName: 'photo.png',
					extension: 'png'
				}]))
			})
		});
		mockAccess.mockResolvedValue(undefined);
		mockReadFile.mockResolvedValue(fileContent);

		const response = await GET(createMockEvent('valid-id'));

		expect(response.status).toBe(200);
		expect(response.headers.get('Content-Type')).toBe('image/png');
		expect(response.headers.get('Content-Disposition')).toContain('photo.png');
	});
});
