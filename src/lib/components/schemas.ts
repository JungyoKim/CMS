import { z } from "zod/v4";

/**
 * 기본 테이블 행 스키마.
 * 각 테이블(contracts, clients, products 등)의 공통 필드를 정의하며,
 * 추가 필드는 인덱스 시그니처로 허용합니다.
 */
export const schema = z.object({
	id: z.number(),
	header: z.string(),
	type: z.string(),
	status: z.string(),
	target: z.string(),
	limit: z.string(),
	reviewer: z.string(),
});

export type Schema = z.infer<typeof schema> & Record<string, any>;

/**
 * 계약 데이터의 전체 필드 타입.
 * contracts +page.server.ts의 load 함수가 반환하는 구조와 일치합니다.
 */
export interface ContractData {
	id: number;
	name: string;
	status: string;
	customerName: string;
	customerStatus: string;
	phone: string;
	email: string;
	address: string;
	asStatus: string;
	asIncompleteCount: number;
	attachmentFileName: string | null;
	attachmentFileListId: string | null;
	// 계약 정보
	contractDate: string;
	cancelDate: string;
	salesStartDate: string;
	deposit: number;
	prepayment: number;
	interimPaymentsData: string | null;
	balance: number;
	taxInvoiceDate: string;
	taxInvoiceAmount: number;
	taxInvoiceIssueDate: string;
	taxInvoiceDepositDate: string;
	taxInvoicesData: string;
	maintenanceMonthlyAmount: number;
	billingDayOfMonth: number | null;
	// 담당자 정보
	managerName: string;
	managerPhone: string;
	managerEmail: string;
	// 시공 정보
	buildStartDate: string;
	buildEndDate: string;
	installerCompany: string;
	installerName: string;
	installerPhone: string;
	buildingInfo: string;
	// 메모
	otherMemo: string;
	customerMemo: string;
	// 연결 ID
	clientId: number | null;
	orderClientId: number | null;
	// 고객사 담당자
	customerContactName: string;
	customerContactPosition: string;
	customerContactPhone: string;
	customerContactEmail: string;
	customerAddress: string;
	// 발주처 담당자
	ordererContactName: string;
	ordererContactPosition: string;
	ordererContactPhone: string;
	ordererContactEmail: string;
	ordererAddress: string;
	// 하위 데이터
	roomsData: Array<{ building: string; room: string; roomId: string; memo: string }>;
	repeatersData: Array<{ repeaterId: string; room: string; memo: string }>;
	installProductsData: Array<{ productId: string; firmwareId: string; quantity: number; memo: string }>;
	asRecordsData: Array<{
		requestDate: string;
		requestContent: string;
		responseDate: string;
		responseContent: string;
		cost: string;
		isCompleted: boolean;
		fileListId: string | null;
		photoFileName: string | null;
	}>;
	documentsData: Array<{ content: string; fileName: string; fileListId: string }>;
	// 인덱스 시그니처 (추가 필드 허용)
	[key: string]: any;
}

/**
 * 고객사 편집용 데이터 타입.
 * 고객사 선택 시 편집 dialog에 전달되는 구조입니다.
 */
export interface ClientEditData {
	id: number;
	name1: string;
	name2: string;
	name3: string;
	name4: string;
	name5: string;
	businessNumber: string;
	zipCode: string;
	address: string;
	fax: string;
	mainContactName: string;
	mainContactPosition: string;
	mainContactPhone: string;
	mainContactEmail: string;
	subContactName: string;
	subContactPosition: string;
	subContactPhone: string;
	subContactEmail: string;
	name: string;
	[key: string]: any;
}

/**
 * 제품 편집용 데이터 타입.
 * API 응답에서 제품 정보를 편집 dialog에 전달하는 구조입니다.
 */
export interface ProductEditData {
	id: number;
	productName: string;
	productCode: string;
	version: string;
	price: number;
	memo: string;
	protocolId: number | null;
	photoFileName: string | null;
	photoFileListId: string | null;
	[key: string]: any;
}

/**
 * 펌웨어 편집용 데이터 타입.
 * API 응답에서 펌웨어 정보를 편집 dialog에 전달하는 구조입니다.
 */
export interface FirmwareEditData {
	id: number;
	name: string;
	memo: string;
	firmwareFileName: string | null;
	firmwareFileListId: string | null;
	docFileName: string | null;
	docFileListId: string | null;
	[key: string]: any;
}

/**
 * SvelteKit form action의 결과 데이터 타입.
 * success/message 패턴으로 반환되는 액션 응답입니다.
 */
export interface ActionResultData {
	success: boolean;
	message?: string;
}

/**
 * SvelteKit form action 결과에서 에러 메시지를 안전하게 추출합니다.
 */
export function getActionError(data: Record<string, unknown> | undefined, fallback: string): string {
	if (!data) return fallback;
	if (typeof data.message === 'string') return data.message;
	return fallback;
}

/**
 * SvelteKit form action 결과가 실패인지 확인합니다.
 */
export function isActionFailure(data: Record<string, unknown> | undefined): boolean {
	return !!data && data.success === false;
}
