import { integer, sqliteTable, text, index } from 'drizzle-orm/sqlite-core';

/**
 * NOTE:
 * ERD 에 있는 한글/공백/괄호 컬럼명은 SQLite 식별자 제약 때문에
 * 실제 컬럼 이름은 영문 스네이크 케이스로 정의했습니다.
 * (의미는 ERD 와 1:1 대응되도록 주석으로 남겨두었습니다.)
 */

// 1. 고객
export const clients = sqliteTable('clients', {
	clientId: integer('CLIENT_ID').primaryKey({ autoIncrement: true }),

	// (등록증)FILE_LIST_ID
	registrationFileListId: text('registration_file_list_id'),

	// 사업자등록번호
	businessNumber: text('business_number'),

	// 고객사명1~5
	name1: text('name1'),
	name2: text('name2'),
	name3: text('name3'),
	name4: text('name4'),
	name5: text('name5'),

	// 주소 정보
	zipCode: text('zip_code'),
	address: text('address'),
	fax: text('fax'),

	// 담당자(주)
	mainContactName: text('main_contact_name'),
	mainContactPosition: text('main_contact_position'),
	mainContactPhone: text('main_contact_phone'),
	mainContactEmail: text('main_contact_email'),

	// 담당자(부)
	subContactName: text('sub_contact_name'),
	subContactPosition: text('sub_contact_position'),
	subContactPhone: text('sub_contact_phone'),
	subContactEmail: text('sub_contact_email'),

	// Soft Deletion: 삭제일시 (ISO 8601 형식)
	deletedAt: text('deleted_at')
}, (t) => ({
	name1Idx: index('clients_name1_idx').on(t.name1),
	name2Idx: index('clients_name2_idx').on(t.name2),
	name3Idx: index('clients_name3_idx').on(t.name3),
	name4Idx: index('clients_name4_idx').on(t.name4),
	name5Idx: index('clients_name5_idx').on(t.name5),
	deletedAtIdx: index('clients_deleted_at_idx').on(t.deletedAt)
}));

// 2. 제품
export const products = sqliteTable('products', {
	productId: integer('PRODUCT_ID').primaryKey({ autoIncrement: true }),

	// (사진)FILE_LIST_ID
	photoFileListId: text('photo_file_list_id'),

	// 제품명
	name: text('name').notNull(),

	// 관리코드
	code: text('code'),

	// 단가
	price: integer('price').default(0),

	// 버전
	version: text('version'),

	// 메모
	memo: text('memo'),

	// 프로토콜(펌웨어) ID
	protocolId: integer('protocol_id'),

	// Soft Deletion: 삭제일시 (ISO 8601 형식)
	deletedAt: text('deleted_at')
}, (t) => ({
	nameIdx: index('products_name_idx').on(t.name),
	deletedAtIdx: index('products_deleted_at_idx').on(t.deletedAt)
}));

// 3. 프로토콜(펌웨어)
export const protocols = sqliteTable('protocols', {
	protocolId: integer('PROTOCOL_ID').primaryKey({ autoIncrement: true }),

	// 이름
	name: text('name').notNull(),

	// 버전
	version: text('version'),

	// 메모
	memo: text('memo'),

	// (펌웨어)FILE_LIST_ID
	firmwareFileListId: text('firmware_file_list_id'),

	// (기타문서)FILE_LIST_ID
	otherDocsFileListId: text('other_docs_file_list_id'),

	// Soft Deletion: 삭제일시 (ISO 8601 형식)
	deletedAt: text('deleted_at')
}, (t) => ({
	nameIdx: index('protocols_name_idx').on(t.name),
	deletedAtIdx: index('protocols_deleted_at_idx').on(t.deletedAt)
}));

// 5. 파일
export const files = sqliteTable('files', {
	fileId: integer('FILE_ID').primaryKey({ autoIncrement: true }),

	// FILE_LIST_ID (연결 고리)
	fileListId: text('FILE_LIST_ID').notNull(),

	// 제목
	title: text('title'),

	// 원본파일이름
	originalFileName: text('original_file_name'),

	// 저장된파일경로
	storedFilePath: text('stored_file_path'),

	// 확장자
	extension: text('extension'),

	// 파일크기 (Byte)
	fileSize: integer('file_size'),

	// Soft Deletion: 삭제일시 (ISO 8601 형식)
	deletedAt: text('deleted_at')
}, (t) => ({
	fileListIdIdx: index('files_file_list_id_idx').on(t.fileListId),
	deletedAtIdx: index('files_deleted_at_idx').on(t.deletedAt)
}));

// 4. 계약
export const contracts = sqliteTable('contracts', {
	contractId: integer('CONTRACT_ID').primaryKey({ autoIncrement: true }),

	// (고객)CLIENT_ID
	clientId: integer('client_id'),

	// (발주처)CLIENT_ID
	orderClientId: integer('order_client_id'),

	// (첨부)FILE_LIST_ID
	attachmentFileListId: text('attachment_file_list_id'),

	// 계약명
	name: text('name'),

	// 계약상태
	status: text('status'),

	// 계약일, 계약해지일, 영업시작일
	contractDate: text('contract_date'),
	cancelDate: text('cancel_date'),
	salesStartDate: text('sales_start_date'),

	// 금액 관련
	deposit: integer('deposit').default(0), // 총계약금액
	prepayment: integer('prepayment').default(0), // 계약금
	interimPaymentsData: text('interim_payments_data'), // 중도금(다중 JSON)
	balance: integer('balance').default(0), // 잔금

	// 계좌번호 (removed)

	// 세금계산서 발행일
	taxInvoiceDate: text('tax_invoice_date'),

	// 유지비 월 청구금액
	maintenanceMonthlyAmount: integer('maintenance_monthly_amount').default(0),

	// 청구일 매월 (일자)
	billingDayOfMonth: integer('billing_day_of_month'),

	// 계약담당자
	managerName: text('manager_name'),
	managerPhone: text('manager_phone'),
	managerEmail: text('manager_email'),

	// 구축기간
	buildStartDate: text('build_start_date'),
	buildEndDate: text('build_end_date'),

	// 설치사 및 설치담당자
	installerCompany: text('installer_company'),
	installerName: text('installer_name'),
	installerPhone: text('installer_phone'),

	// 세금계산서 (설치담당자 섹션)
	taxInvoiceAmount: integer('tax_invoice_amount').default(0),
	taxInvoiceIssueDate: text('tax_invoice_issue_date'),
	taxInvoiceDepositDate: text('tax_invoice_deposit_date'),

	// 건물정보, 기타 메모
	buildingInfo: text('building_info'),
	otherMemo: text('other_memo'),

	// 고객정보 메모
	customerMemo: text('customer_memo'),

	// 세금계산서 내역 (JSON)
	taxInvoicesData: text('tax_invoices_data'),

	// Soft Deletion: 삭제일시 (ISO 8601 형식)
	deletedAt: text('deleted_at')
}, (t) => ({
	clientIdIdx: index('contracts_client_id_idx').on(t.clientId),
	orderClientIdIdx: index('contracts_order_client_id_idx').on(t.orderClientId),
	nameIdx: index('contracts_name_idx').on(t.name),
	deletedAtIdx: index('contracts_deleted_at_idx').on(t.deletedAt)
}));

// 6. 중계기 ID
export const repeaters = sqliteTable('repeaters', {
	repeaterId: integer('REPEATER_ID').primaryKey({ autoIncrement: true }),

	// CONTRACT_ID
	contractId: integer('CONTRACT_ID').notNull(),

	// 중계기 ID
	repeaterCode: text('repeater_code'),

	// 룸번호목록메모
	roomNumbersMemo: text('room_numbers_memo'),

	// 메모
	memo: text('memo')
}, (t) => ({
	contractIdIdx: index('repeaters_contract_id_idx').on(t.contractId)
}));

// 7. 설치제품
export const installProducts = sqliteTable('install_products', {
	installProductId: integer('INSTALL_PRODUCT_ID').primaryKey({ autoIncrement: true }),

	// CONTRACT_ID
	contractId: integer('CONTRACT_ID').notNull(),

	// PRODUCT_ID
	productId: integer('PRODUCT_ID'),

	// PROTOCOL_ID
	protocolId: integer('PROTOCOL_ID'),

	// 수량
	quantity: integer('quantity').default(1),

	// 메모
	memo: text('memo')
}, (t) => ({
	contractIdIdx: index('install_products_contract_id_idx').on(t.contractId)
}));

// 8. 비밀번호
export const passwords = sqliteTable('passwords', {
	pwId: integer('PW_ID').primaryKey({ autoIncrement: true }),

	// 암호
	password: text('password')
});

// 9. AS 관리
export const asRecords = sqliteTable('as_records', {
	asId: integer('AS_ID').primaryKey({ autoIncrement: true }),

	// CONTRACT_ID (계약에 종속되지 않는 AS는 null)
	contractId: integer('CONTRACT_ID'),

	// CLIENT_ID (단일 AS의 경우 고객사 ID)
	clientId: integer('CLIENT_ID'),

	// (첨부)FILE_LIST_ID
	fileListId: text('file_list_id'),

	// 요청일자 / 요청내용

	requestDate: text('request_date'),
	requestContent: text('request_content'),

	// 대응일자 / 대응내용
	responseDate: text('response_date'),
	responseContent: text('response_content'),

	// 비용
	cost: integer('cost').default(0),

	// 완료여부 (0/1)
	isCompleted: integer('is_completed').default(0)
}, (t) => ({
	contractIdIdx: index('as_contract_id_idx').on(t.contractId),
	clientIdIdx: index('as_client_id_idx').on(t.clientId),
	requestDateIdx: index('as_request_date_idx').on(t.requestDate),
	isCompletedIdx: index('as_is_completed_idx').on(t.isCompleted),
	sortingIdx: index('as_sorting_idx').on(t.requestDate, t.asId)
}));

// 10. 객실 ID
export const rooms = sqliteTable('rooms', {
	roomId: integer('ROOM_ID').primaryKey({ autoIncrement: true }),

	// CONTRACT_ID
	contractId: integer('CONTRACT_ID').notNull(),

	// 건물명
	buildingName: text('building_name'),

	// 룸번호
	roomNumber: text('room_number'),

	// ID
	roomCode: text('room_code'),

	// 메모
	memo: text('memo')
}, (t) => ({
	contractIdIdx: index('rooms_contract_id_idx').on(t.contractId)
}));

// 11. 제품 입고/출고 기록
export const productInventory = sqliteTable('product_inventory', {
	inventoryId: integer('INVENTORY_ID').primaryKey({ autoIncrement: true }),

	// 제품 ID
	productId: integer('product_id').notNull().references(() => products.productId),

	// 입고/출고 (입고: 'in', 출고: 'out')
	type: text('type').notNull(),

	// 내용
	content: text('content'),

	// 날짜
	date: text('date'),

	// 수량
	quantity: integer('quantity').default(0),

	// Soft Deletion: 삭제일시 (ISO 8601 형식)
	deletedAt: text('deleted_at')
}, (t) => ({
	productIdIdx: index('inventory_product_id_idx').on(t.productId),
	dateIdx: index('inventory_date_idx').on(t.date),
	deletedAtIdx: index('inventory_deleted_at_idx').on(t.deletedAt)
}));

// 12. 설정
export const settings = sqliteTable('settings', {
	settingId: integer('SETTING_ID').primaryKey({ autoIncrement: true }),

	// 설정 키
	key: text('key').notNull().unique(),

	// 설정 값
	value: text('value')
});