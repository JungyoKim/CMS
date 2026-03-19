/**
 * 마이그레이션 스크립트: 원본 DB를 현재 스키마에 맞게 새 DB로 마이그레이션
 * 
 * 사용법: bun run scripts/migrate_from_old_db.ts <원본DB.db> <대상DB.db>
 * 예: bun run scripts/migrate_from_old_db.ts "sqlite (5).db" sqlite-new.db
 */

import { Database } from 'bun:sqlite';

const sourceDbPath = process.argv[2] || 'sqlite (5).db';
const targetDbPath = process.argv[3] || 'sqlite-migrated.db';

console.log('='.repeat(60));
console.log('DB 마이그레이션 시작');
console.log('='.repeat(60));
console.log(`원본 DB: ${sourceDbPath}`);
console.log(`대상 DB: ${targetDbPath}`);
console.log('');

// 원본 DB 연결
const sourceDb = new Database(sourceDbPath, { readonly: true });

// 대상 DB 연결 (새로 생성)
const targetDb = new Database(targetDbPath);

// 현재 스키마로 테이블 및 인덱스 생성
const createTablesSQL = `
-- 1. clients
CREATE TABLE IF NOT EXISTS clients (
    CLIENT_ID integer PRIMARY KEY AUTOINCREMENT NOT NULL,
    registration_file_list_id text,
    business_number text,
    name1 text,
    name2 text,
    name3 text,
    name4 text,
    name5 text,
    zip_code text,
    address text,
    fax text,
    main_contact_name text,
    main_contact_position text,
    main_contact_phone text,
    main_contact_email text,
    sub_contact_name text,
    sub_contact_position text,
    sub_contact_phone text,
    sub_contact_email text,
    deleted_at text
);
CREATE INDEX IF NOT EXISTS clients_name1_idx ON clients(name1);
CREATE INDEX IF NOT EXISTS clients_name2_idx ON clients(name2);
CREATE INDEX IF NOT EXISTS clients_name3_idx ON clients(name3);
CREATE INDEX IF NOT EXISTS clients_name4_idx ON clients(name4);
CREATE INDEX IF NOT EXISTS clients_name5_idx ON clients(name5);
CREATE INDEX IF NOT EXISTS clients_deleted_at_idx ON clients(deleted_at);

-- 2. products
CREATE TABLE IF NOT EXISTS products (
    PRODUCT_ID integer PRIMARY KEY AUTOINCREMENT NOT NULL,
    photo_file_list_id text,
    name text NOT NULL,
    code text,
    price integer DEFAULT 0,
    version text,
    memo text,
    protocol_id integer,
    deleted_at text
);
CREATE INDEX IF NOT EXISTS products_name_idx ON products(name);
CREATE INDEX IF NOT EXISTS products_deleted_at_idx ON products(deleted_at);

-- 3. protocols
CREATE TABLE IF NOT EXISTS protocols (
    PROTOCOL_ID integer PRIMARY KEY AUTOINCREMENT NOT NULL,
    name text NOT NULL,
    version text,
    memo text,
    firmware_file_list_id text,
    other_docs_file_list_id text,
    deleted_at text
);
CREATE INDEX IF NOT EXISTS protocols_name_idx ON protocols(name);
CREATE INDEX IF NOT EXISTS protocols_deleted_at_idx ON protocols(deleted_at);

-- 4. files
CREATE TABLE IF NOT EXISTS files (
    FILE_ID integer PRIMARY KEY AUTOINCREMENT NOT NULL,
    FILE_LIST_ID text NOT NULL,
    title text,
    original_file_name text,
    stored_file_path text,
    extension text,
    file_size integer,
    deleted_at text
);
CREATE INDEX IF NOT EXISTS files_file_list_id_idx ON files(FILE_LIST_ID);
CREATE INDEX IF NOT EXISTS files_deleted_at_idx ON files(deleted_at);

-- 5. contracts
CREATE TABLE IF NOT EXISTS contracts (
    CONTRACT_ID integer PRIMARY KEY AUTOINCREMENT NOT NULL,
    client_id integer,
    order_client_id integer,
    attachment_file_list_id text,
    name text,
    status text,
    contract_date text,
    cancel_date text,
    sales_start_date text,
    deposit integer DEFAULT 0,
    prepayment integer DEFAULT 0,
    interim_payment integer DEFAULT 0,
    balance integer DEFAULT 0,
    account_number text,
    tax_invoice_date text,
    maintenance_monthly_amount integer DEFAULT 0,
    billing_day_of_month integer,
    manager_name text,
    manager_phone text,
    manager_email text,
    build_start_date text,
    build_end_date text,
    installer_company text,
    installer_name text,
    installer_phone text,
    building_info text,
    other_memo text,
    deleted_at text
);
CREATE INDEX IF NOT EXISTS contracts_client_id_idx ON contracts(client_id);
CREATE INDEX IF NOT EXISTS contracts_order_client_id_idx ON contracts(order_client_id);
CREATE INDEX IF NOT EXISTS contracts_name_idx ON contracts(name);
CREATE INDEX IF NOT EXISTS contracts_deleted_at_idx ON contracts(deleted_at);

-- 6. repeaters
CREATE TABLE IF NOT EXISTS repeaters (
    REPEATER_ID integer PRIMARY KEY AUTOINCREMENT NOT NULL,
    CONTRACT_ID integer NOT NULL,
    repeater_code text,
    room_numbers_memo text,
    memo text
);
CREATE INDEX IF NOT EXISTS repeaters_contract_id_idx ON repeaters(CONTRACT_ID);

-- 7. install_products
CREATE TABLE IF NOT EXISTS install_products (
    INSTALL_PRODUCT_ID integer PRIMARY KEY AUTOINCREMENT NOT NULL,
    CONTRACT_ID integer NOT NULL,
    PRODUCT_ID integer,
    PROTOCOL_ID integer,
    quantity integer DEFAULT 1,
    memo text
);
CREATE INDEX IF NOT EXISTS install_products_contract_id_idx ON install_products(CONTRACT_ID);

-- 8. passwords
CREATE TABLE IF NOT EXISTS passwords (
    PW_ID integer PRIMARY KEY AUTOINCREMENT NOT NULL,
    password text
);

-- 9. as_records
CREATE TABLE IF NOT EXISTS as_records (
    AS_ID integer PRIMARY KEY AUTOINCREMENT NOT NULL,
    CONTRACT_ID integer,
    CLIENT_ID integer,
    file_list_id text,
    request_date text,
    request_content text,
    response_date text,
    response_content text,
    cost integer DEFAULT 0,
    is_completed integer DEFAULT 0
);
CREATE INDEX IF NOT EXISTS as_contract_id_idx ON as_records(CONTRACT_ID);
CREATE INDEX IF NOT EXISTS as_client_id_idx ON as_records(CLIENT_ID);
CREATE INDEX IF NOT EXISTS as_request_date_idx ON as_records(request_date);
CREATE INDEX IF NOT EXISTS as_is_completed_idx ON as_records(is_completed);
CREATE INDEX IF NOT EXISTS as_sorting_idx ON as_records(request_date, AS_ID);

-- 10. rooms
CREATE TABLE IF NOT EXISTS rooms (
    ROOM_ID integer PRIMARY KEY AUTOINCREMENT NOT NULL,
    CONTRACT_ID integer NOT NULL,
    building_name text,
    room_number text,
    room_code text,
    memo text
);
CREATE INDEX IF NOT EXISTS rooms_contract_id_idx ON rooms(CONTRACT_ID);

-- 11. product_inventory
CREATE TABLE IF NOT EXISTS product_inventory (
    INVENTORY_ID integer PRIMARY KEY AUTOINCREMENT NOT NULL,
    product_id integer NOT NULL REFERENCES products(PRODUCT_ID),
    type text NOT NULL,
    content text,
    date text,
    quantity integer DEFAULT 0,
    deleted_at text
);
CREATE INDEX IF NOT EXISTS inventory_product_id_idx ON product_inventory(product_id);
CREATE INDEX IF NOT EXISTS inventory_date_idx ON product_inventory(date);
CREATE INDEX IF NOT EXISTS inventory_deleted_at_idx ON product_inventory(deleted_at);

-- 12. settings
CREATE TABLE IF NOT EXISTS settings (
    SETTING_ID integer PRIMARY KEY AUTOINCREMENT NOT NULL,
    key text NOT NULL UNIQUE,
    value text
);
`;

// 테이블 생성
console.log('📦 새 DB에 테이블 및 인덱스 생성 중...');
targetDb.exec(createTablesSQL);
console.log('✅ 테이블 및 인덱스 생성 완료\n');

// 테이블 마이그레이션 함수 (위치 기반 바인딩 사용)
function migrateTable(tableName: string, columns: string[]) {
    const columnList = columns.join(', ');

    // 원본 데이터 조회
    const rows = sourceDb.query(`SELECT ${columnList} FROM ${tableName}`).all() as Record<string, any>[];

    if (rows.length === 0) {
        console.log(`  ⏭️  ${tableName}: 0건 (스킵)`);
        return 0;
    }

    // INSERT 준비 (위치 기반 ? 플레이스홀더 사용)
    const placeholders = columns.map(() => '?').join(', ');
    const insertStmt = targetDb.prepare(
        `INSERT INTO ${tableName} (${columnList}) VALUES (${placeholders})`
    );

    // 트랜잭션으로 일괄 삽입
    const insertMany = targetDb.transaction((data: Record<string, any>[]) => {
        for (const row of data) {
            // 컬럼 순서대로 값 배열 생성
            const values = columns.map(col => row[col]);
            insertStmt.run(...values);
        }
    });

    insertMany(rows);
    console.log(`  ✅ ${tableName}: ${rows.length}건 마이그레이션 완료`);
    return rows.length;
}

console.log('📋 데이터 마이그레이션 시작...\n');

let totalRows = 0;

// 1. clients
totalRows += migrateTable('clients', [
    'CLIENT_ID', 'registration_file_list_id', 'business_number',
    'name1', 'name2', 'name3', 'name4', 'name5',
    'zip_code', 'address', 'fax',
    'main_contact_name', 'main_contact_position', 'main_contact_phone', 'main_contact_email',
    'sub_contact_name', 'sub_contact_position', 'sub_contact_phone', 'sub_contact_email',
    'deleted_at'
]);

// 2. products
totalRows += migrateTable('products', [
    'PRODUCT_ID', 'photo_file_list_id', 'name', 'code', 'price', 'version', 'memo', 'protocol_id', 'deleted_at'
]);

// 3. protocols
totalRows += migrateTable('protocols', [
    'PROTOCOL_ID', 'name', 'version', 'memo', 'firmware_file_list_id', 'other_docs_file_list_id', 'deleted_at'
]);

// 4. files
totalRows += migrateTable('files', [
    'FILE_ID', 'FILE_LIST_ID', 'title', 'original_file_name', 'stored_file_path', 'extension', 'file_size', 'deleted_at'
]);

// 5. contracts
totalRows += migrateTable('contracts', [
    'CONTRACT_ID', 'client_id', 'order_client_id', 'attachment_file_list_id', 'name', 'status',
    'contract_date', 'cancel_date', 'sales_start_date',
    'deposit', 'prepayment', 'interim_payment', 'balance', 'account_number', 'tax_invoice_date',
    'maintenance_monthly_amount', 'billing_day_of_month',
    'manager_name', 'manager_phone', 'manager_email',
    'build_start_date', 'build_end_date',
    'installer_company', 'installer_name', 'installer_phone',
    'building_info', 'other_memo', 'deleted_at'
]);

// 6. repeaters
totalRows += migrateTable('repeaters', [
    'REPEATER_ID', 'CONTRACT_ID', 'repeater_code', 'room_numbers_memo', 'memo'
]);

// 7. install_products
totalRows += migrateTable('install_products', [
    'INSTALL_PRODUCT_ID', 'CONTRACT_ID', 'PRODUCT_ID', 'PROTOCOL_ID', 'quantity', 'memo'
]);

// 8. passwords
totalRows += migrateTable('passwords', ['PW_ID', 'password']);

// 9. as_records
totalRows += migrateTable('as_records', [
    'AS_ID', 'CONTRACT_ID', 'CLIENT_ID', 'request_date', 'request_content',
    'response_date', 'response_content', 'cost', 'is_completed'
]);

// 10. rooms
totalRows += migrateTable('rooms', [
    'ROOM_ID', 'CONTRACT_ID', 'building_name', 'room_number', 'room_code', 'memo'
]);

// 11. product_inventory
totalRows += migrateTable('product_inventory', [
    'INVENTORY_ID', 'product_id', 'type', 'content', 'date', 'quantity', 'deleted_at'
]);

// 12. settings
totalRows += migrateTable('settings', ['SETTING_ID', 'key', 'value']);

// 연결 종료
sourceDb.close();
targetDb.close();

console.log('\n' + '='.repeat(60));
console.log(`🎉 마이그레이션 완료! 총 ${totalRows}건의 데이터가 이전되었습니다.`);
console.log(`📁 마이그레이션된 DB: ${targetDbPath}`);
console.log('='.repeat(60));
