import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { db } from '$lib/server/db';
import { contracts, clients, rooms, repeaters, installProducts, asRecords, files } from '$lib/server/db/schema';
import { eq, like, and, isNull } from 'drizzle-orm';
import { getFileNamesByListId } from '$lib/server/file-storage';

export const GET: RequestHandler = async ({ params }) => {
	const id = params.id;

	if (!id) {
		return json({ error: '계약 ID가 필요합니다.' }, { status: 400 });
	}

	const contractData = await db
		.select({
			contract: contracts,
			client: clients
		})
		.from(contracts)
		.leftJoin(clients, eq(contracts.clientId, clients.clientId))
		.where(eq(contracts.contractId, Number(id)))
		.limit(1)
		.then(rows => rows[0]);

	if (!contractData) {
		return json({ error: '계약을 찾을 수 없습니다.' }, { status: 404 });
	}

	const contract = contractData.contract;
	const client = contractData.client;

	// 발주처 정보 조회
	let orderClient = null;
	if (contract.orderClientId) {
		const orderClientRows = await db
			.select()
			.from(clients)
			.where(eq(clients.clientId, contract.orderClientId))
			.limit(1);
		orderClient = orderClientRows[0] || null;
	}

	// 첨부 파일 이름 가져오기
	const attachmentFileNames = await getFileNamesByListId(contract.attachmentFileListId);

	// 객실, 중계기, 설치제품, AS기록 데이터 병렬 조회
	const [roomsData, repeatersData, installProductsData, asRecordsData] = await Promise.all([
		db.select().from(rooms).where(eq(rooms.contractId, contract.contractId)),
		db.select().from(repeaters).where(eq(repeaters.contractId, contract.contractId)),
		db.select().from(installProducts).where(eq(installProducts.contractId, contract.contractId)),
		db.select().from(asRecords).where(eq(asRecords.contractId, contract.contractId))
	]);

	// 관련문서 데이터 불러오기 (삭제되지 않은 파일만)
	const allDocuments = await db
		.select()
		.from(files)
		.where(and(like(files.fileListId, `contract-${contract.contractId}-doc-%`), isNull(files.deletedAt)));

	const documentsMap = new Map<string, { content: string; fileName: string; fileListId: string }>();
	for (const doc of allDocuments) {
		if (doc.fileListId) {
			if (!documentsMap.has(doc.fileListId)) {
				documentsMap.set(doc.fileListId, {
					content: doc.title || '',
					fileName: doc.originalFileName || '',
					fileListId: doc.fileListId
				});
			}
		}
	}
	const documents = Array.from(documentsMap.values());

	return json({
		id: contract.contractId,
		name: contract.name ?? '',
		status: contract.status ?? '',
		contractDate: contract.contractDate ?? '',
		cancelDate: contract.cancelDate ?? '',
		salesStartDate: contract.salesStartDate ?? '',
		deposit: contract.deposit ?? 0,
		prepayment: contract.prepayment ?? 0,
		interimPaymentsData: contract.interimPaymentsData ?? null,
		balance: contract.balance ?? 0,
		taxInvoiceDate: contract.taxInvoiceDate ?? '',
		maintenanceMonthlyAmount: contract.maintenanceMonthlyAmount ?? 0,
		billingDayOfMonth: contract.billingDayOfMonth ?? null,
		managerName: contract.managerName ?? '',
		managerPhone: contract.managerPhone ?? '',
		managerEmail: contract.managerEmail ?? '',
		buildStartDate: contract.buildStartDate ?? '',
		buildEndDate: contract.buildEndDate ?? '',
		installerCompany: contract.installerCompany ?? '',
		installerName: contract.installerName ?? '',
		installerPhone: contract.installerPhone ?? '',
		taxInvoiceAmount: contract.taxInvoiceAmount ?? 0,
		taxInvoiceIssueDate: contract.taxInvoiceIssueDate ?? '',
		taxInvoiceDepositDate: contract.taxInvoiceDepositDate ?? '',
		taxInvoicesData: contract.taxInvoicesData ?? '',
		buildingInfo: contract.buildingInfo ?? '',
		otherMemo: contract.otherMemo ?? '',
		customerMemo: contract.customerMemo ?? '',
		clientId: contract.clientId ?? null,
		orderClientId: contract.orderClientId ?? null,
		customerContactName: client?.mainContactName ?? '',
		customerContactPosition: client?.mainContactPosition ?? '',
		customerContactPhone: client?.mainContactPhone ?? '',
		customerContactEmail: client?.mainContactEmail ?? '',
		customerAddress: client?.address ?? '',
		ordererContactName: orderClient?.mainContactName ?? '',
		ordererContactPosition: orderClient?.mainContactPosition ?? '',
		ordererContactPhone: orderClient?.mainContactPhone ?? '',
		ordererContactEmail: orderClient?.mainContactEmail ?? '',
		ordererAddress: orderClient?.address ?? '',
		attachmentFileName: attachmentFileNames[0] || null,
		attachmentFileListId: contract.attachmentFileListId,
		roomsData: roomsData.map(r => ({
			id: r.roomId, // Unique ID for DND
			building: r.buildingName || '',
			room: r.roomNumber || '',
			roomId: r.roomCode || '',
			memo: r.memo || '',
			checked: false // For checkbox
		})),
		repeatersData: repeatersData.map(r => ({
			id: r.repeaterId, // Unique ID for DND
			repeaterId: r.repeaterCode || '',
			room: r.roomNumbersMemo || '',
			memo: r.memo || '',
			checked: false // For checkbox
		})),
		installProductsData: installProductsData.map(p => ({
			id: p.installProductId, // Unique ID for DND
			productId: p.productId ? String(p.productId) : '',
			firmwareId: p.protocolId ? String(p.protocolId) : '',
			quantity: p.quantity || 0,
			memo: p.memo || '',
			checked: false // For checkbox
		})),
		asRecordsData: asRecordsData.map(r => ({
			id: r.asId, // Unique ID for DND
			requestDate: r.requestDate || '',
			requestContent: r.requestContent || '',
			responseDate: r.responseDate || '',
			responseContent: r.responseContent || '',
			cost: r.cost ? String(r.cost) : '',
			isCompleted: r.isCompleted === 1,
			checked: false // For checkbox
		})),
		documentsData: documents.map(d => ({
			id: d.fileListId || '', // Unique ID for DND
			content: d.content || '',
			fileName: d.fileName || '',
			fileListId: d.fileListId || '',
			checked: false // For checkbox
		}))
	});
};



