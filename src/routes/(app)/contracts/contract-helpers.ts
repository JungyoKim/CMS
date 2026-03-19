import { db } from '$lib/server/db';
import { clients, rooms, repeaters, installProducts, asRecords, files } from '$lib/server/db/schema';
import { saveFileToList } from '$lib/server/file-storage';
import { eq, and, isNull } from 'drizzle-orm';

/** db 또는 트랜잭션 객체에서 공통으로 사용 가능한 쿼리 인터페이스 */
type DbOrTx = {
	update: typeof db.update;
	insert: typeof db.insert;
	delete: typeof db.delete;
};

/**
 * 계약 폼에서 공통 필드를 파싱한다.
 * createContract와 updateContract에서 동일하게 사용.
 */
export function parseContractFormData(formData: FormData) {
	const getString = (key: string) => (formData.get(key) ?? '').toString().trim();
	const getInt = (key: string) => parseInt((formData.get(key) ?? '0').toString().replace(/,/g, '')) || 0;

	return {
		name: getString('name'),
		status: getString('status'),
		clientId: formData.get('clientId')?.toString() || null,
		orderClientId: formData.get('orderClientId')?.toString() || null,
		contractDate: getString('contractDate'),
		cancelDate: getString('cancelDate'),
		salesStartDate: getString('salesStartDate'),
		deposit: getInt('deposit'),
		prepayment: getInt('prepayment'),
		interimPaymentsData: getString('interimPaymentsData'),
		balance: getInt('balance'),
		taxInvoiceDate: getString('taxInvoiceDate'),
		maintenanceMonthlyAmount: getInt('maintenanceMonthlyAmount'),
		billingDayOfMonth: formData.get('billingDayOfMonth')?.toString() || null,
		managerName: getString('managerName'),
		managerPhone: getString('managerPhone'),
		managerEmail: getString('managerEmail'),
		buildStartDate: getString('buildStartDate'),
		buildEndDate: getString('buildEndDate'),
		installerCompany: getString('installerCompany'),
		installerName: getString('installerName'),
		installerPhone: getString('installerPhone'),
		taxInvoiceAmount: getInt('taxInvoiceAmount'),
		taxInvoiceIssueDate: getString('taxInvoiceIssueDate'),
		taxInvoiceDepositDate: getString('taxInvoiceDepositDate'),
		buildingInfo: getString('buildingInfo'),
		otherMemo: getString('otherMemo'),
		customerMemo: getString('customerMemo'),
		taxInvoicesData: getString('taxInvoicesData'),
	};
}

/**
 * 파싱된 데이터를 DB insert/update용 객체로 변환한다.
 */
export function toContractDbValues(data: ReturnType<typeof parseContractFormData>) {
	return {
		name: data.name,
		status: data.status || null,
		clientId: data.clientId ? Number(data.clientId) : null,
		orderClientId: data.orderClientId ? Number(data.orderClientId) : null,
		contractDate: data.contractDate || null,
		cancelDate: data.cancelDate || null,
		salesStartDate: data.salesStartDate || null,
		deposit: data.deposit,
		prepayment: data.prepayment,
		interimPaymentsData: data.interimPaymentsData || null,
		balance: data.balance,
		taxInvoiceDate: data.taxInvoiceDate || null,
		maintenanceMonthlyAmount: data.maintenanceMonthlyAmount,
		billingDayOfMonth: data.billingDayOfMonth ? Number(data.billingDayOfMonth) : null,
		managerName: data.managerName || null,
		managerPhone: data.managerPhone || null,
		managerEmail: data.managerEmail || null,
		buildStartDate: data.buildStartDate || null,
		buildEndDate: data.buildEndDate || null,
		installerCompany: data.installerCompany || null,
		installerName: data.installerName || null,
		installerPhone: data.installerPhone || null,
		taxInvoiceAmount: data.taxInvoiceAmount,
		taxInvoiceIssueDate: data.taxInvoiceIssueDate || null,
		taxInvoiceDepositDate: data.taxInvoiceDepositDate || null,
		buildingInfo: data.buildingInfo || null,
		otherMemo: data.otherMemo || null,
		customerMemo: data.customerMemo || null,
		taxInvoicesData: data.taxInvoicesData || null,
	};
}

/**
 * 고객사/발주처 담당자 정보를 업데이트한다.
 */
export async function updateClientContacts(
	tx: DbOrTx,
	formData: FormData,
	clientId: string | null,
	orderClientId: string | null
) {
	if (clientId) {
		const getString = (key: string) => (formData.get(key) ?? '').toString().trim();
		await tx.update(clients).set({
			mainContactName: getString('customerContactName') || null,
			mainContactPosition: getString('customerContactPosition') || null,
			mainContactPhone: getString('customerContactPhone') || null,
			mainContactEmail: getString('customerContactEmail') || null,
			address: getString('customerAddress') || null,
		}).where(and(eq(clients.clientId, Number(clientId)), isNull(clients.deletedAt)));
	}

	// 고객사와 발주처가 같으면 발주처 정보 업데이트를 건너뛰어야 함 (고객사 정보가 우선)
	if (orderClientId && orderClientId !== clientId) {
		const getString = (key: string) => (formData.get(key) ?? '').toString().trim();
		await tx.update(clients).set({
			mainContactName: getString('ordererContactName') || null,
			mainContactPosition: getString('ordererContactPosition') || null,
			mainContactPhone: getString('ordererContactPhone') || null,
			mainContactEmail: getString('ordererContactEmail') || null,
			address: getString('ordererAddress') || null,
		}).where(and(eq(clients.clientId, Number(orderClientId)), isNull(clients.deletedAt)));
	}
}

/**
 * 하위 데이터(객실, 중계기, 설치제품, AS기록)를 저장한다.
 * insert=true이면 새로 삽입, false이면 기존 데이터 삭제 후 재삽입.
 */
export async function saveSubData(
	tx: DbOrTx,
	contractId: number,
	formData: FormData,
	deleteExisting: boolean = false
) {
	if (deleteExisting) {
		await tx.delete(rooms).where(eq(rooms.contractId, contractId));
		await tx.delete(repeaters).where(eq(repeaters.contractId, contractId));
		await tx.delete(installProducts).where(eq(installProducts.contractId, contractId));
		await tx.delete(asRecords).where(eq(asRecords.contractId, contractId));
	}

	// 객실
	const roomsRaw = formData.get('roomsData')?.toString();
	if (roomsRaw) {
		const arr = JSON.parse(roomsRaw);
		if (Array.isArray(arr) && arr.length > 0) {
			await tx.insert(rooms).values(
				arr.map((r: any) => ({
					contractId,
					buildingName: r.building || null,
					roomNumber: r.room || null,
					roomCode: r.roomId || null,
					memo: r.memo || null,
				}))
			);
		}
	}

	// 중계기
	const repeatersRaw = formData.get('repeatersData')?.toString();
	if (repeatersRaw) {
		const arr = JSON.parse(repeatersRaw);
		if (Array.isArray(arr) && arr.length > 0) {
			await tx.insert(repeaters).values(
				arr.map((r: any) => ({
					contractId,
					repeaterCode: r.repeaterId || null,
					roomNumbersMemo: r.room || null,
					memo: r.memo || null,
				}))
			);
		}
	}

	// 설치제품
	const installProductsRaw = formData.get('installProductsData')?.toString();
	if (installProductsRaw) {
		const arr = JSON.parse(installProductsRaw);
		if (Array.isArray(arr) && arr.length > 0) {
			await tx.insert(installProducts).values(
				arr.map((p: any) => ({
					contractId,
					productId: p.productId ? Number(p.productId) : null,
					protocolId: p.firmwareId ? Number(p.firmwareId) : null,
					quantity: p.quantity ? Number(p.quantity) : 1,
					memo: p.memo || null,
				}))
			);
		}
	}

	// AS기록 (파일 처리 포함)
	const asRecordsRaw = formData.get('asRecordsData')?.toString();
	if (asRecordsRaw) {
		const asArray = JSON.parse(asRecordsRaw);
		if (Array.isArray(asArray) && asArray.length > 0) {
			for (let i = 0; i < asArray.length; i++) {
				const record = asArray[i];
				const file = formData.get(`asFile_${i}`);
				if (file instanceof File && file.size > 0) {
					try {
						record.fileListId = await saveFileToList({ file, category: 'as' });
					} catch (error) {
						console.error(`Error saving AS file ${i}:`, error);
					}
				}
			}

			await tx.insert(asRecords).values(
				asArray.map((record: any) => ({
					contractId,
					requestDate: record.requestDate || null,
					requestContent: record.requestContent || null,
					responseDate: record.responseDate || null,
					responseContent: record.responseContent || null,
					cost: record.cost ? parseInt(record.cost) : 0,
					isCompleted: record.isCompleted ? 1 : 0,
					fileListId: record.fileListId || null,
				}))
			);
		}
	}
}

/**
 * 관련문서를 저장한다.
 */
export async function saveDocuments(contractId: number, formData: FormData) {
	const documentsRaw = formData.get('documentsData')?.toString();
	if (!documentsRaw) return;

	try {
		const documentsArray = JSON.parse(documentsRaw);
		if (!Array.isArray(documentsArray) || documentsArray.length === 0) return;

		for (let i = 0; i < documentsArray.length; i++) {
			const doc = documentsArray[i];
			const file = formData.get(`documentFile_${i}`);

			if (file instanceof File && file.size > 0) {
				try {
					const contractFileListId = `contract-${contractId}-doc-${i}`;
					const fileListId = await saveFileToList({
						file,
						category: 'contract-documents',
						listId: contractFileListId,
					});

					if (doc.content) {
						await db.update(files)
							.set({ title: doc.content })
							.where(eq(files.fileListId, fileListId));
					}
				} catch (error) {
					console.error(`Error saving document ${i}:`, error);
				}
			}
		}
	} catch (error) {
		console.error('Error saving documents:', error);
	}
}
