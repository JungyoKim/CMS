import { describe, it, expect, vi, beforeEach } from 'vitest';

// vi.hoisted로 mock 변수를 호이스팅
const {
	mockSelect, mockFrom, mockWhere,
	mockUpdate, mockSet, mockInsert,
	mockDeleteFilesByListId, mockHandleFileUpload
} = vi.hoisted(() => ({
	mockSelect: vi.fn(),
	mockFrom: vi.fn(),
	mockWhere: vi.fn(),
	mockUpdate: vi.fn(),
	mockSet: vi.fn(),
	mockInsert: vi.fn(),
	mockDeleteFilesByListId: vi.fn(),
	mockHandleFileUpload: vi.fn()
}));

vi.mock('$lib/server/db', () => ({
	db: {
		select: mockSelect,
		update: mockUpdate,
		insert: mockInsert
	}
}));

vi.mock('$lib/server/file-storage', () => ({
	deleteFilesByListId: mockDeleteFilesByListId,
	handleFileUpload: mockHandleFileUpload
}));

vi.mock('drizzle-orm', () => ({
	sql: Object.assign(
		(strings: TemplateStringsArray, ...values: unknown[]) => ({ strings, values }),
		{ join: vi.fn(() => ({})) }
	),
	inArray: vi.fn(() => ({}))
}));

import { parseDeleteIds, softDeleteWithFiles, updateFileAttachment } from './crud-helpers';

describe('parseDeleteIds', () => {
	it('FormData에서 ID 목록을 추출한다', () => {
		const formData = new FormData();
		formData.append('ids', '1');
		formData.append('ids', '2');
		formData.append('ids', '3');

		const result = parseDeleteIds(formData);
		expect(result).toEqual([1, 2, 3]);
	});

	it('빈 FormData는 빈 배열을 반환한다', () => {
		const formData = new FormData();
		const result = parseDeleteIds(formData);
		expect(result).toEqual([]);
	});

	it('숫자가 아닌 값은 NaN으로 변환된다', () => {
		const formData = new FormData();
		formData.append('ids', 'abc');
		const result = parseDeleteIds(formData);
		expect(result).toEqual([NaN]);
	});
});

describe('softDeleteWithFiles', () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it('ids가 비어있으면 실패 메시지를 반환한다', async () => {
		const result = await softDeleteWithFiles({
			table: {} as any,
			idColumn: {} as any,
			ids: [],
			fileColumns: []
		});
		expect(result).toEqual({ success: false, message: '삭제할 항목을 선택하세요.' });
	});

	it('파일 삭제 후 소프트 삭제를 수행한다', async () => {
		mockSelect.mockReturnValue({ from: mockFrom });
		mockFrom.mockReturnValue({ where: mockWhere });
		mockWhere.mockResolvedValue([
			{ photoFileListId: 'file-list-1' }
		]);

		mockUpdate.mockReturnValue({ set: mockSet });
		mockSet.mockReturnValue({ where: vi.fn().mockResolvedValue(undefined) });

		mockDeleteFilesByListId.mockResolvedValue(undefined);

		const mockColumn = { name: 'photoFileListId' };
		const result = await softDeleteWithFiles({
			table: {} as any,
			idColumn: {} as any,
			ids: [1, 2],
			fileColumns: [mockColumn as any]
		});

		expect(result).toEqual({ success: true });
		expect(mockDeleteFilesByListId).toHaveBeenCalledWith('file-list-1');
		expect(mockUpdate).toHaveBeenCalled();
	});
});

describe('updateFileAttachment', () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it('새 파일이 업로드되면 fileListId를 반환한다', async () => {
		mockHandleFileUpload.mockResolvedValue({ fileListId: 'new-file-id' });

		const formData = new FormData();
		const result = await updateFileAttachment({
			formData,
			fieldName: 'file',
			removeFieldName: 'removeFile',
			category: 'test',
			currentFileListId: null
		});

		expect(result).toEqual({ fileListId: 'new-file-id' });
	});

	it('파일 업로드 에러 시 에러를 반환한다', async () => {
		const error = { success: false as const, message: '파일 저장에 실패했습니다.' };
		mockHandleFileUpload.mockResolvedValue({ fileListId: null, error });

		const formData = new FormData();
		const result = await updateFileAttachment({
			formData,
			fieldName: 'file',
			removeFieldName: 'removeFile',
			category: 'test',
			currentFileListId: null
		});

		expect(result.error).toEqual(error);
	});

	it('removeFile 플래그가 true이면 파일을 삭제한다', async () => {
		mockHandleFileUpload.mockResolvedValue({ fileListId: null });
		mockDeleteFilesByListId.mockResolvedValue(undefined);

		const formData = new FormData();
		formData.set('removeFile', 'true');

		const result = await updateFileAttachment({
			formData,
			fieldName: 'file',
			removeFieldName: 'removeFile',
			category: 'test',
			currentFileListId: 'existing-file-id'
		});

		expect(result).toEqual({ fileListId: null });
		expect(mockDeleteFilesByListId).toHaveBeenCalledWith('existing-file-id');
	});

	it('파일 업로드도 없고 삭제 플래그도 없으면 기존 fileListId를 유지한다', async () => {
		mockHandleFileUpload.mockResolvedValue({ fileListId: null });

		const formData = new FormData();

		const result = await updateFileAttachment({
			formData,
			fieldName: 'file',
			removeFieldName: 'removeFile',
			category: 'test',
			currentFileListId: 'existing-file-id'
		});

		expect(result).toEqual({ fileListId: 'existing-file-id' });
	});
});
