import { describe, it, expect, vi, beforeEach } from 'vitest';

const { mockSaveFileToList, mockUpdateSet, mockUpdateWhere, mockInsertValues, mockDeleteWhere } = vi.hoisted(() => ({
	mockSaveFileToList: vi.fn(),
	mockUpdateSet: vi.fn(),
	mockUpdateWhere: vi.fn().mockResolvedValue(undefined),
	mockInsertValues: vi.fn().mockResolvedValue(undefined),
	mockDeleteWhere: vi.fn().mockResolvedValue(undefined)
}));

mockUpdateSet.mockReturnValue({ where: mockUpdateWhere });

vi.mock('$lib/server/db', () => ({
	db: {
		update: vi.fn(() => ({ set: mockUpdateSet })),
		insert: vi.fn(() => ({ values: mockInsertValues })),
		delete: vi.fn(() => ({ where: mockDeleteWhere }))
	}
}));

vi.mock('$lib/server/db/schema', () => ({
	clients: { clientId: 'clientId', deletedAt: 'deletedAt' },
	rooms: { contractId: 'contractId' },
	repeaters: { contractId: 'contractId' },
	installProducts: { contractId: 'contractId' },
	asRecords: { contractId: 'contractId' },
	files: { fileListId: 'fileListId' }
}));

vi.mock('$lib/server/file-storage', () => ({
	saveFileToList: mockSaveFileToList
}));

vi.mock('drizzle-orm', () => ({
	eq: vi.fn(),
	and: vi.fn(),
	isNull: vi.fn()
}));

import { parseContractFormData, toContractDbValues, updateClientContacts, saveSubData, saveDocuments } from './contract-helpers';

describe('parseContractFormData', () => {
	it('폼 데이터를 올바르게 파싱한다', () => {
		const formData = new FormData();
		formData.set('name', '테스트 계약');
		formData.set('status', '진행중');
		formData.set('deposit', '1,000,000');
		formData.set('clientId', '5');

		const result = parseContractFormData(formData);

		expect(result.name).toBe('테스트 계약');
		expect(result.status).toBe('진행중');
		expect(result.deposit).toBe(1000000);
		expect(result.clientId).toBe('5');
	});

	it('빈 폼은 기본값으로 파싱한다', () => {
		const formData = new FormData();
		const result = parseContractFormData(formData);

		expect(result.name).toBe('');
		expect(result.deposit).toBe(0);
		expect(result.clientId).toBeNull();
	});

	it('콤마가 포함된 금액을 올바르게 파싱한다', () => {
		const formData = new FormData();
		formData.set('balance', '50,000,000');
		formData.set('taxInvoiceAmount', '5,500,000');

		const result = parseContractFormData(formData);
		expect(result.balance).toBe(50000000);
		expect(result.taxInvoiceAmount).toBe(5500000);
	});
});

describe('toContractDbValues', () => {
	it('빈 문자열을 null로 변환한다', () => {
		const data = parseContractFormData(new FormData());
		const dbValues = toContractDbValues(data);

		expect(dbValues.status).toBeNull();
		expect(dbValues.contractDate).toBeNull();
		expect(dbValues.clientId).toBeNull();
	});

	it('clientId를 숫자로 변환한다', () => {
		const formData = new FormData();
		formData.set('clientId', '10');
		const data = parseContractFormData(formData);
		const dbValues = toContractDbValues(data);

		expect(dbValues.clientId).toBe(10);
	});
});

describe('updateClientContacts', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		mockUpdateSet.mockReturnValue({ where: mockUpdateWhere });
	});

	const mockTx = {
		update: vi.fn(() => ({ set: mockUpdateSet })),
		insert: vi.fn(),
		delete: vi.fn()
	};

	it('clientId가 있으면 고객사 담당자 정보를 업데이트한다', async () => {
		const formData = new FormData();
		formData.set('customerContactName', '홍길동');
		formData.set('customerContactPhone', '010-1234-5678');

		await updateClientContacts(mockTx as any, formData, '1', null);
		expect(mockTx.update).toHaveBeenCalledTimes(1);
	});

	it('고객사와 발주처가 다르면 둘 다 업데이트한다', async () => {
		const formData = new FormData();
		formData.set('customerContactName', '홍길동');
		formData.set('ordererContactName', '김철수');

		await updateClientContacts(mockTx as any, formData, '1', '2');
		expect(mockTx.update).toHaveBeenCalledTimes(2);
	});

	it('고객사와 발주처가 같으면 고객사만 업데이트한다', async () => {
		const formData = new FormData();

		await updateClientContacts(mockTx as any, formData, '1', '1');
		expect(mockTx.update).toHaveBeenCalledTimes(1);
	});

	it('clientId가 null이면 업데이트하지 않는다', async () => {
		const formData = new FormData();

		await updateClientContacts(mockTx as any, formData, null, null);
		expect(mockTx.update).not.toHaveBeenCalled();
	});
});

describe('saveSubData', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		mockSaveFileToList.mockResolvedValue('new-file-id');
	});

	const mockTx = {
		update: vi.fn(),
		insert: vi.fn(() => ({ values: mockInsertValues })),
		delete: vi.fn(() => ({ where: mockDeleteWhere }))
	};

	it('객실 데이터를 삽입한다', async () => {
		const formData = new FormData();
		formData.set('roomsData', JSON.stringify([
			{ building: 'A동', room: '101', roomId: 'R001', memo: '' }
		]));

		await saveSubData(mockTx as any, 1, formData);
		expect(mockTx.insert).toHaveBeenCalled();
	});

	it('deleteExisting=true이면 기존 데이터를 삭제한다', async () => {
		const formData = new FormData();
		formData.set('roomsData', JSON.stringify([]));

		await saveSubData(mockTx as any, 1, formData, true);
		// rooms, repeaters, installProducts, asRecords 4개 delete
		expect(mockTx.delete).toHaveBeenCalledTimes(4);
	});

	it('AS기록에 파일이 있으면 saveFileToList를 호출한다', async () => {
		const formData = new FormData();
		formData.set('asRecordsData', JSON.stringify([
			{ requestDate: '2025-01-01', requestContent: '수리 요청', cost: '50000', isCompleted: false }
		]));
		formData.set('asFile_0', new File(['photo'], 'as-photo.jpg'));

		await saveSubData(mockTx as any, 1, formData);
		expect(mockSaveFileToList).toHaveBeenCalledWith(
			expect.objectContaining({ category: 'as' })
		);
	});

	it('빈 데이터는 삽입하지 않는다', async () => {
		const formData = new FormData();
		// 아무 데이터도 없음

		await saveSubData(mockTx as any, 1, formData);
		expect(mockTx.insert).not.toHaveBeenCalled();
	});
});

describe('saveDocuments', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		mockSaveFileToList.mockResolvedValue('doc-file-id');
		mockUpdateSet.mockReturnValue({ where: mockUpdateWhere });
	});

	it('documentsData가 없으면 아무것도 하지 않는다', async () => {
		const formData = new FormData();
		await saveDocuments(1, formData);
		expect(mockSaveFileToList).not.toHaveBeenCalled();
	});

	it('파일이 있는 문서를 저장한다', async () => {
		const formData = new FormData();
		formData.set('documentsData', JSON.stringify([
			{ content: '계약서 사본' }
		]));
		formData.set('documentFile_0', new File(['pdf'], 'contract.pdf'));

		await saveDocuments(1, formData);
		expect(mockSaveFileToList).toHaveBeenCalledWith(
			expect.objectContaining({
				category: 'contract-documents',
				listId: 'contract-1-doc-0'
			})
		);
	});

	it('content가 있으면 파일 제목을 업데이트한다', async () => {
		const formData = new FormData();
		formData.set('documentsData', JSON.stringify([
			{ content: '중요 문서' }
		]));
		formData.set('documentFile_0', new File(['data'], 'doc.pdf'));

		await saveDocuments(1, formData);
		expect(mockUpdateSet).toHaveBeenCalledWith({ title: '중요 문서' });
	});

	it('파일이 없는 문서는 건너뛴다', async () => {
		const formData = new FormData();
		formData.set('documentsData', JSON.stringify([
			{ content: '제목만 있음' }
		]));
		// documentFile_0 없음

		await saveDocuments(1, formData);
		expect(mockSaveFileToList).not.toHaveBeenCalled();
	});
});
