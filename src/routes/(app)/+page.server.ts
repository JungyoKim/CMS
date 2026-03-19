import type { PageServerLoad } from './$types';
import { db } from '$lib/server/db';
import { contracts, clients, asRecords, products, protocols } from '$lib/server/db/schema';
import { eq, asc, desc, inArray, and, isNull, or } from 'drizzle-orm';

export const load: PageServerLoad = async ({ depends }) => {
	depends('contracts:update');
	depends('clients:update');
	depends('asRecords:update');

	// 사전영업중 고객: contracts.status가 "pre-sales"인 계약을 오래된 순으로 10개 가져오기 (삭제되지 않은 것만)
	const preSalesContracts = await db
		.select({
			contract: contracts,
			client: clients
		})
		.from(contracts)
		.leftJoin(clients, eq(contracts.clientId, clients.clientId))
		.where(and(eq(contracts.status, 'pre-sales'), isNull(contracts.deletedAt)))
		.orderBy(asc(contracts.contractDate))
		.limit(10);

	// 발주사 정보 가져오기
	const orderClientIds = preSalesContracts
		.map(row => row.contract.orderClientId)
		.filter((id): id is number => id !== null && id !== undefined);

	const orderClients = orderClientIds.length > 0
		? await db
			.select()
			.from(clients)
			.where(and(inArray(clients.clientId, orderClientIds), isNull(clients.deletedAt)))
		: [];

	const orderClientsMap = new Map(
		orderClients.map(client => [client.clientId, client])
	);

	// preSales 데이터 포맷팅
	const preSalesData = preSalesContracts.map((row) => {
		const contract = row.contract;
		const client = row.client;

		// 고객명 생성 (name1부터 name5까지 조합)
		const customerName = [
			client?.name1,
			client?.name2,
			client?.name3,
			client?.name4,
			client?.name5
		].filter(Boolean).join(' ') || '-';

		// 발주사명 생성 (orderClientId로 조회)
		const orderClient = contract.orderClientId ? orderClientsMap.get(contract.orderClientId) : null;
		const orderer = orderClient
			? [
				orderClient.name1,
				orderClient.name2,
				orderClient.name3,
				orderClient.name4,
				orderClient.name5
			].filter(Boolean).join(' ') || '-'
			: '-'; // 발주사가 없으면 "-" 표시

		return {
			...contract,
			id: contract.contractId,
			contractId: contract.contractId, // 계약 수정 dialog를 열기 위한 contractId 추가
			customerName: customerName,
			orderer: orderer,
			name: contract.name || '-',
			amount: contract.deposit || 0, // 총계약금액만 표시
			address: client?.address || '-',
			customerStatus: '사전영업'
		};
	});

	// AS미완료: isCompleted가 0인 AS기록을 오래된 순으로 10개 가져오기 (계약 없는 단일 AS 포함)
	const incompleteASRecords = await db
		.select({
			asRecord: asRecords,
			contract: contracts,
			contractClient: clients
		})
		.from(asRecords)
		.leftJoin(contracts, eq(asRecords.contractId, contracts.contractId))
		.leftJoin(clients, eq(contracts.clientId, clients.clientId))
		.where(and(
			eq(asRecords.isCompleted, 0),
			// 계약이 없거나, 계약이 있으면 삭제되지 않은 계약만
			or(isNull(asRecords.contractId), isNull(contracts.deletedAt))
		))
		.orderBy(asc(asRecords.requestDate))
		.limit(10);

	// 단일 AS(계약 없음)의 경우 clientId로 고객 정보 조회
	const standaloneClientIds = incompleteASRecords
		.filter(row => !row.contract && row.asRecord.clientId)
		.map(row => row.asRecord.clientId!)
		.filter((id): id is number => id !== null);

	const standaloneClients = standaloneClientIds.length > 0
		? await db.select().from(clients).where(and(inArray(clients.clientId, standaloneClientIds), isNull(clients.deletedAt)))
		: [];

	const standaloneClientsMap = new Map(standaloneClients.map(c => [c.clientId, c]));

	// incompleteAS 데이터 포맷팅
	const incompleteASData = incompleteASRecords.map((row) => {
		const asRecord = row.asRecord;
		const contract = row.contract;
		// 계약이 있으면 계약의 고객, 없으면 AS의 clientId로 조회
		const client = contract ? row.contractClient : standaloneClientsMap.get(asRecord.clientId!);

		// 고객명 생성 (name1부터 name5까지 조합)
		const customerName = [
			client?.name1,
			client?.name2,
			client?.name3,
			client?.name4,
			client?.name5
		].filter(Boolean).join(' ') || '-';

		return {
			...asRecord,
			id: asRecord.asId,
			asId: asRecord.asId, // AS 수정 dialog를 열기 위한 asId 추가
			contractId: contract?.contractId || null,
			customerName: customerName,
			requestDate: asRecord.requestDate || '-',
			name: contract?.name || '단일 AS',
			requestContent: asRecord.requestContent || '-',
			cost: asRecord.cost || 0,
			isCompleted: false
		};
	});

	// 최근 AS완료: isCompleted가 1인 AS기록을 최근 순으로 10개 가져오기 (계약 없는 단일 AS 포함)
	const completedASRecords = await db
		.select({
			asRecord: asRecords,
			contract: contracts,
			contractClient: clients
		})
		.from(asRecords)
		.leftJoin(contracts, eq(asRecords.contractId, contracts.contractId))
		.leftJoin(clients, eq(contracts.clientId, clients.clientId))
		.where(and(
			eq(asRecords.isCompleted, 1),
			// 계약이 없거나, 계약이 있으면 삭제되지 않은 계약만
			or(isNull(asRecords.contractId), isNull(contracts.deletedAt))
		))
		.orderBy(desc(asRecords.responseDate))
		.limit(10);

	// 단일 AS(계약 없음)의 경우 clientId로 고객 정보 조회
	const completedStandaloneClientIds = completedASRecords
		.filter(row => !row.contract && row.asRecord.clientId)
		.map(row => row.asRecord.clientId!)
		.filter((id): id is number => id !== null);

	const completedStandaloneClients = completedStandaloneClientIds.length > 0
		? await db.select().from(clients).where(and(inArray(clients.clientId, completedStandaloneClientIds), isNull(clients.deletedAt)))
		: [];

	const completedStandaloneClientsMap = new Map(completedStandaloneClients.map(c => [c.clientId, c]));

	// completedAS 데이터 포맷팅
	const completedASData = completedASRecords.map((row) => {
		const asRecord = row.asRecord;
		const contract = row.contract;
		// 계약이 있으면 계약의 고객, 없으면 AS의 clientId로 조회
		const client = contract ? row.contractClient : completedStandaloneClientsMap.get(asRecord.clientId!);

		// 고객명 생성 (name1부터 name5까지 조합)
		const customerName = [
			client?.name1,
			client?.name2,
			client?.name3,
			client?.name4,
			client?.name5
		].filter(Boolean).join(' ') || '-';

		return {
			...asRecord,
			id: asRecord.asId,
			asId: asRecord.asId, // AS 수정 dialog를 열기 위한 asId 추가
			contractId: contract?.contractId || null,
			customerName: customerName,
			requestDate: asRecord.requestDate || '-',
			requestContent: asRecord.requestContent || '-',
			responseDate: asRecord.responseDate || '-',
			responseContent: asRecord.responseContent || '-',
			name: contract?.name || '단일 AS',
			cost: asRecord.cost || 0,
			isCompleted: true
		};
	});

	// clientList, productList, firmwareList 가져오기 (삭제되지 않은 것만)
	const allClients = await db.select().from(clients).where(isNull(clients.deletedAt));
	const allProducts = await db.select().from(products).where(isNull(products.deletedAt));
	const allFirmware = await db.select().from(protocols).where(isNull(protocols.deletedAt));

	return {
		preSalesData,
		incompleteASData,
		completedASData,
		clientList: allClients.map(client => ({
			id: client.clientId,
			name: client.name || '',
			name1: client.name1,
			name2: client.name2,
			name3: client.name3,
			name4: client.name4,
			name5: client.name5,
			mainContactName: client.mainContactName,
			mainContactPosition: client.mainContactPosition,
			mainContactPhone: client.mainContactPhone,
			mainContactEmail: client.mainContactEmail,
			subContactName: client.subContactName,
			subContactPosition: client.subContactPosition,
			subContactPhone: client.subContactPhone,
			subContactEmail: client.subContactEmail,
			address: client.address
		})),
		productList: allProducts.map(product => ({
			id: product.productId,
			name: product.name || ''
		})),
		firmwareList: allFirmware.map(firmware => ({
			id: firmware.protocolId,
			name: firmware.name || ''
		}))
	};
};
