import { describe, it, expect, vi, beforeEach } from 'vitest';

const {
	mockMkdir, mockWriteFile, mockUnlink,
	mockInsertValues, mockSelectFrom, mockSelectWhere,
	mockUpdateSet, mockUpdateWhere,
	mockDbInsert, mockDbSelect, mockDbUpdate
} = vi.hoisted(() => {
	const mockInsertValues = vi.fn();
	const mockSelectFrom = vi.fn();
	const mockSelectWhere = vi.fn();
	const mockUpdateSet = vi.fn();
	const mockUpdateWhere = vi.fn();

	mockSelectFrom.mockReturnValue({ where: mockSelectWhere });
	mockUpdateSet.mockReturnValue({ where: mockUpdateWhere });

	return {
		mockMkdir: vi.fn().mockResolvedValue(undefined),
		mockWriteFile: vi.fn().mockResolvedValue(undefined),
		mockUnlink: vi.fn().mockResolvedValue(undefined),
		mockInsertValues,
		mockSelectFrom,
		mockSelectWhere,
		mockUpdateSet,
		mockUpdateWhere,
		mockDbInsert: vi.fn(() => ({ values: mockInsertValues })),
		mockDbSelect: vi.fn(() => ({ from: mockSelectFrom })),
		mockDbUpdate: vi.fn(() => ({ set: mockUpdateSet }))
	};
});

vi.mock('node:fs/promises', () => ({
	default: {
		mkdir: (...args: unknown[]) => mockMkdir(...args),
		writeFile: (...args: unknown[]) => mockWriteFile(...args),
		unlink: (...args: unknown[]) => mockUnlink(...args)
	}
}));

vi.mock('$lib/server/db', () => ({
	db: {
		insert: mockDbInsert,
		select: mockDbSelect,
		update: mockDbUpdate
	}
}));

vi.mock('$lib/server/db/schema', () => ({
	files: {
		fileListId: 'fileListId',
		title: 'title',
		originalFileName: 'originalFileName',
		storedFilePath: 'storedFilePath',
		extension: 'extension',
		fileSize: 'fileSize',
		deletedAt: 'deletedAt',
		fileId: 'fileId'
	}
}));

vi.mock('drizzle-orm', () => ({
	eq: vi.fn((_col: unknown, val: unknown) => ({ op: 'eq', val })),
	and: vi.fn((...args: unknown[]) => ({ op: 'and', args })),
	isNull: vi.fn((col: unknown) => ({ op: 'isNull', col }))
}));

import {
	saveFileToList,
	getFileNamesByListId,
	getFileInfoByListId,
	handleFileUpload,
	deleteFilesByListId
} from './file-storage';

function createMockFile(name: string, content: string = 'test content'): File {
	return new File([content], name, { type: 'application/octet-stream' });
}

describe('saveFileToList', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		mockInsertValues.mockResolvedValue(undefined);
		mockMkdir.mockResolvedValue(undefined);
		mockWriteFile.mockResolvedValue(undefined);
	});

	it('파일을 저장하고 fileListId를 반환한다', async () => {
		const file = createMockFile('test.png');
		const result = await saveFileToList({ file, category: 'products' });

		expect(typeof result).toBe('string');
		expect(result.length).toBeGreaterThan(0);
		expect(mockMkdir).toHaveBeenCalledTimes(1);
		expect(mockWriteFile).toHaveBeenCalledTimes(1);
		expect(mockDbInsert).toHaveBeenCalledTimes(1);
	});

	it('listId가 주어지면 해당 ID를 사용한다', async () => {
		const file = createMockFile('doc.pdf');
		const result = await saveFileToList({ file, category: 'contracts', listId: 'my-custom-id' });

		expect(result).toBe('my-custom-id');
	});

	it('DB 실패 시 파일을 정리하고 에러를 던진다', async () => {
		mockInsertValues.mockRejectedValue(new Error('DB error'));

		const file = createMockFile('test.txt');
		await expect(saveFileToList({ file, category: 'test' })).rejects.toThrow('DB error');
		expect(mockUnlink).toHaveBeenCalledTimes(1);
	});

	it('확장자가 없는 파일도 처리한다', async () => {
		const file = createMockFile('noext');
		const result = await saveFileToList({ file, category: 'misc' });

		expect(typeof result).toBe('string');
		expect(mockWriteFile).toHaveBeenCalledTimes(1);
	});
});

describe('getFileNamesByListId', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		mockSelectFrom.mockReturnValue({ where: mockSelectWhere });
	});

	it('null이면 빈 배열을 반환한다', async () => {
		const result = await getFileNamesByListId(null);
		expect(result).toEqual([]);
	});

	it('파일명 목록을 반환한다', async () => {
		mockSelectWhere.mockResolvedValue([
			{ originalFileName: 'file1.png' },
			{ originalFileName: 'file2.jpg' }
		]);

		const result = await getFileNamesByListId('some-list-id');
		expect(result).toEqual(['file1.png', 'file2.jpg']);
	});

	it('null인 파일명은 필터링한다', async () => {
		mockSelectWhere.mockResolvedValue([
			{ originalFileName: 'file1.png' },
			{ originalFileName: null }
		]);

		const result = await getFileNamesByListId('some-list-id');
		expect(result).toEqual(['file1.png']);
	});
});

describe('getFileInfoByListId', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		mockSelectFrom.mockReturnValue({ where: mockSelectWhere });
	});

	it('null이면 null을 반환한다', async () => {
		const result = await getFileInfoByListId(null);
		expect(result).toBeNull();
	});

	it('파일 정보를 반환한다', async () => {
		mockSelectWhere.mockResolvedValue([
			{ originalFileName: 'document.pdf' }
		]);

		const result = await getFileInfoByListId('file-list-1');
		expect(result).toEqual({
			fileListId: 'file-list-1',
			fileName: 'document.pdf'
		});
	});

	it('파일이 없으면 null을 반환한다', async () => {
		mockSelectWhere.mockResolvedValue([]);

		const result = await getFileInfoByListId('nonexistent-id');
		expect(result).toBeNull();
	});

	it('originalFileName이 null이면 null을 반환한다', async () => {
		mockSelectWhere.mockResolvedValue([
			{ originalFileName: null }
		]);

		const result = await getFileInfoByListId('file-list-1');
		expect(result).toBeNull();
	});
});

describe('deleteFilesByListId', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		mockSelectFrom.mockReturnValue({ where: mockSelectWhere });
		mockUpdateSet.mockReturnValue({ where: mockUpdateWhere });
	});

	it('null이면 아무것도 하지 않는다', async () => {
		await deleteFilesByListId(null);
		expect(mockDbSelect).not.toHaveBeenCalled();
	});

	it('파일이 없으면 업데이트하지 않는다', async () => {
		mockSelectWhere.mockResolvedValue([]);

		await deleteFilesByListId('empty-list');
		expect(mockDbUpdate).not.toHaveBeenCalled();
	});

	it('파일이 있으면 soft delete를 수행한다', async () => {
		mockSelectWhere.mockResolvedValue([{ fileId: 1 }, { fileId: 2 }]);
		mockUpdateWhere.mockResolvedValue(undefined);

		await deleteFilesByListId('file-list-1');
		expect(mockDbUpdate).toHaveBeenCalledTimes(1);
		expect(mockUpdateSet).toHaveBeenCalledWith(
			expect.objectContaining({ deletedAt: expect.any(String) })
		);
	});
});

describe('handleFileUpload', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		mockInsertValues.mockResolvedValue(undefined);
		mockMkdir.mockResolvedValue(undefined);
		mockWriteFile.mockResolvedValue(undefined);
		mockSelectFrom.mockReturnValue({ where: mockSelectWhere });
		mockUpdateSet.mockReturnValue({ where: mockUpdateWhere });
	});

	it('파일이 없으면 null fileListId를 반환한다', async () => {
		const formData = new FormData();
		const result = await handleFileUpload(formData, 'file', 'test');

		expect(result).toEqual({ fileListId: null });
	});

	it('빈 파일이면 null fileListId를 반환한다', async () => {
		const formData = new FormData();
		formData.set('file', new File([], 'empty.txt'));

		const result = await handleFileUpload(formData, 'file', 'test');
		expect(result).toEqual({ fileListId: null });
	});

	it('파일이 있으면 저장하고 fileListId를 반환한다', async () => {
		const formData = new FormData();
		formData.set('file', createMockFile('upload.png'));

		const result = await handleFileUpload(formData, 'file', 'products');
		expect(result.fileListId).toBeTruthy();
		expect(result.error).toBeUndefined();
	});

	it('기존 파일이 있으면 soft delete 후 새 파일을 저장한다', async () => {
		mockSelectWhere.mockResolvedValue([{ fileId: 1 }]);
		mockUpdateWhere.mockResolvedValue(undefined);

		const formData = new FormData();
		formData.set('file', createMockFile('new.png'));

		const result = await handleFileUpload(formData, 'file', 'products', 'old-list-id');
		expect(result.fileListId).toBeTruthy();
		expect(mockDbUpdate).toHaveBeenCalled();
	});

	it('저장 실패 시 에러를 반환한다', async () => {
		mockMkdir.mockRejectedValueOnce(new Error('disk full'));

		const formData = new FormData();
		formData.set('file', createMockFile('fail.png'));

		const result = await handleFileUpload(formData, 'file', 'test');
		expect(result.error).toEqual({
			success: false,
			message: '파일 저장에 실패했습니다.'
		});
	});
});
