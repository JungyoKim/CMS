/**
 * 다이얼로그 ↔ 서버 핸들러 formData 필드 일치 테스트
 *
 * 이 테스트는 프론트엔드 다이얼로그에서 formData.set()으로 전송하는 필드와
 * 서버 핸들러에서 formData.get()으로 읽는 필드가 일치하는지 정적 분석합니다.
 *
 * 누락된 formData.set() 호출을 감지하여 데이터가 DB에 저장되지 않는 버그를 방지합니다.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { resolve } from 'path';

// ── 유틸리티 ────────────────────────────────────────────────

/** 파일 내용에서 formData.set('key', ...) 패턴의 key 목록을 추출 (중복 제거) */
function extractFormDataSetKeys(content: string): string[] {
    const regex = /formData\.set\(\s*['"]([^'"]+)['"]/g;
    const keys = new Set<string>();
    let match;
    while ((match = regex.exec(content)) !== null) {
        keys.add(match[1]);
    }
    return [...keys];
}

/** 파일 내용에서 formData.get('key') 패턴의 key 목록을 추출 (중복 제거) */
function extractFormDataGetKeys(content: string): string[] {
    const regex = /formData\.get\(\s*['"]([^'"]+)['"]\)/g;
    const keys = new Set<string>();
    let match;
    while ((match = regex.exec(content)) !== null) {
        keys.add(match[1]);
    }
    return [...keys];
}

/**
 * formData.set() 호출에서 parseCurrency()가 적용되지 않은 통화 필드를 찾습니다.
 */
function findUnparsedCurrencyFields(content: string): string[] {
    const currencyFields = [
        'deposit',
        'prepayment',
        'interimPayment',
        'balance',
        'maintenanceMonthlyAmount',
        'taxInvoiceAmount',
        'cost'
    ];

    const unparsed: string[] = [];

    for (const field of currencyFields) {
        const setRegex = new RegExp(
            `formData\\.set\\(\\s*['"]${field}['"]\\s*,\\s*([^)]+)\\)`,
            'g'
        );
        let match;
        while ((match = setRegex.exec(content)) !== null) {
            const valueExpr = match[1].trim();
            if (
                !valueExpr.includes('parseCurrency') &&
                !valueExpr.match(/^['"][\d]+['"]$/) &&
                !valueExpr.match(/^String\(/) &&
                !valueExpr.match(/^\d+$/)
            ) {
                unparsed.push(field);
            }
        }
    }

    return unparsed;
}

/** 서버의 formData.set 필드가 모두 전송되는지 검사하는 헬퍼 */
function assertFieldsCovered(
    setKeys: string[],
    requiredFields: string[],
    ignoreFields: string[] = []
) {
    const filtered = requiredFields.filter((f) => !ignoreFields.includes(f));
    const missing = filtered.filter((field) => !setKeys.includes(field));
    expect(missing, `누락된 formData.set() 필드: ${missing.join(', ')}`).toEqual([]);
}

/** 파일을 읽어 문자열로 반환 */
function readFile(relativePath: string): string {
    const fullPath = resolve(process.cwd(), relativePath);
    return readFileSync(fullPath, 'utf-8');
}

// ── 서버 핸들러가 읽는 필드 정의 ────────────────────────────

const CONTRACT_SERVER_FIELDS = [
    'name', 'status', 'clientId', 'orderClientId',
    'contractDate', 'cancelDate', 'salesStartDate',
    'deposit', 'prepayment', 'interimPaymentsData', 'balance',
    'taxInvoiceDate',
    'maintenanceMonthlyAmount', 'billingDayOfMonth',
    'managerName', 'managerPhone', 'managerEmail',
    'buildStartDate', 'buildEndDate',
    'installerCompany', 'installerName', 'installerPhone',
    'taxInvoiceAmount', 'taxInvoiceIssueDate', 'taxInvoiceDepositDate',
    'buildingInfo', 'otherMemo', 'customerMemo', 'taxInvoicesData',
    'customerContactName', 'customerContactPosition',
    'customerContactPhone', 'customerContactEmail', 'customerAddress',
    'ordererContactName', 'ordererContactPosition',
    'ordererContactPhone', 'ordererContactEmail', 'ordererAddress',
    'roomsData', 'repeatersData', 'installProductsData',
    'asRecordsData', 'documentsData'
];

const AS_SERVER_FIELDS = [
    'asType', 'contractId', 'clientId',
    'requestDate', 'requestContent',
    'responseDate', 'responseContent',
    'cost', 'isCompleted'
];

const CLIENT_SERVER_FIELDS = [
    'name1', 'name2', 'name3', 'name4', 'name5',
    'businessNumber', 'zipCode', 'address', 'fax',
    'mainContactName', 'mainContactPosition',
    'mainContactPhone', 'mainContactEmail',
    'subContactName', 'subContactPosition',
    'subContactPhone', 'subContactEmail'
];

const PRODUCT_SERVER_FIELDS = [
    'productName', 'productCode', 'productVersion',
    'productMemo', 'productPrice', 'productFirmwareId'
];

const FIRMWARE_SERVER_FIELDS = [
    'firmwareName', 'firmwareVersion', 'firmwareMemo'
];

// UI에 해당 입력 폼이 없는 필드
const CONTRACT_IGNORE_FIELDS = ['otherMemo'];

// ── 홈 계약 다이얼로그가 포함된 컴포넌트 공통 필드 ──────────
// completed-as-table, incomplete-as-table, pre-sales-table은
// 계약 필드 중 일부만 포함 (customerMemo, taxInvoiceAmount 등 없음)
const HOME_CONTRACT_ESSENTIAL_FIELDS = [
    'name', 'status', 'clientId', 'orderClientId',
    'contractDate', 'deposit', 'prepayment', 'interimPaymentsData', 'balance',
    'maintenanceMonthlyAmount', 'billingDayOfMonth',
    'managerName', 'managerPhone', 'managerEmail',
    'buildStartDate', 'buildEndDate',
    'installerCompany', 'installerName', 'installerPhone',
    'buildingInfo',
    'customerContactName', 'customerContactPosition',
    'customerContactPhone', 'customerContactEmail', 'customerAddress',
    'ordererContactName', 'ordererContactPosition',
    'ordererContactPhone', 'ordererContactEmail', 'ordererAddress',
    'roomsData', 'repeatersData', 'installProductsData',
    'asRecordsData', 'documentsData', 'taxInvoicesData'
];

// ══════════════════════════════════════════════════════════════
// 1. 계약 다이얼로그
// ══════════════════════════════════════════════════════════════

describe('계약(Contract) 다이얼로그', () => {
    describe('contracts-table.svelte (/contracts 전용)', () => {
        const content = readFile('src/lib/components/contracts-table.svelte');

        it('통화 필드에 parseCurrency()가 적용되어야 합니다', () => {
            expect(findUnparsedCurrencyFields(content)).toEqual([]);
        });
    });

    describe('home-contract-dialog.svelte (홈 > 계약 수정)', () => {
        const content = readFile('src/lib/components/home-contract-dialog.svelte');
        const setKeys = extractFormDataSetKeys(content);

        it('서버 핸들러 필드를 모두 전송해야 합니다', () => {
            // taxInvoiceDate는 이 컴포넌트에서 제거됨 (taxInvoicesData로 대체)
            assertFieldsCovered(setKeys, CONTRACT_SERVER_FIELDS, [
                ...CONTRACT_IGNORE_FIELDS,
                'taxInvoiceDate'
            ]);
        });

        it('통화 필드에 parseCurrency()가 적용되어야 합니다', () => {
            expect(findUnparsedCurrencyFields(content)).toEqual([]);
        });

        it('동일 필드를 중복 설정하지 않아야 합니다', () => {
            const regex = /formData\.set\(\s*['"]([^'"]+)['"]/g;
            const allKeys: string[] = [];
            let match;
            while ((match = regex.exec(content)) !== null) {
                allKeys.push(match[1]);
            }
            const counts = new Map<string, number>();
            for (const key of allKeys) {
                counts.set(key, (counts.get(key) || 0) + 1);
            }
            // 'id'는 여러 서브 폼(계약, 고객사, 펌웨어, 제품)에서 사용되므로 제외
            const duplicates = [...counts.entries()]
                .filter(([key, count]) => count > 1 && key !== 'id')
                .map(([key, count]) => `${key} (${count}회)`);
            expect(duplicates, `중복 필드: ${duplicates.join(', ')}`).toEqual([]);
        });
    });

    describe('pre-sales-table.svelte (홈 > 사전영업)', () => {
        const content = readFile('src/lib/components/pre-sales-table.svelte');

        it('통화 필드에 parseCurrency()가 적용되어야 합니다', () => {
            expect(findUnparsedCurrencyFields(content)).toEqual([]);
        });
    });

    describe('completed-as-table.svelte (홈 > AS완료 내 계약 수정)', () => {
        const content = readFile('src/lib/components/completed-as-table.svelte');

        it('통화 필드에 parseCurrency()가 적용되어야 합니다', () => {
            expect(findUnparsedCurrencyFields(content)).toEqual([]);
        });
    });

    describe('incomplete-as-table.svelte (홈 > AS미완료 내 계약 수정)', () => {
        const content = readFile('src/lib/components/incomplete-as-table.svelte');

        it('통화 필드에 parseCurrency()가 적용되어야 합니다', () => {
            expect(findUnparsedCurrencyFields(content)).toEqual([]);
        });
    });
});

// ══════════════════════════════════════════════════════════════
// 2. AS 다이얼로그
// ══════════════════════════════════════════════════════════════

describe('AS 다이얼로그', () => {
    describe('as-table.svelte (/as 전용)', () => {
        const content = readFile('src/lib/components/as-table.svelte');
        const setKeys = extractFormDataSetKeys(content);

        it('서버 핸들러 필드를 모두 전송해야 합니다', () => {
            assertFieldsCovered(setKeys, AS_SERVER_FIELDS);
        });

        it('cost 필드에 parseCurrency()가 적용되어야 합니다', () => {
            expect(findUnparsedCurrencyFields(content)).toEqual([]);
        });
    });

    describe('home-as-dialog.svelte (홈 > AS 수정)', () => {
        const content = readFile('src/lib/components/home-as-dialog.svelte');
        const setKeys = extractFormDataSetKeys(content);

        it('서버 핸들러 필드를 모두 전송해야 합니다', () => {
            assertFieldsCovered(setKeys, AS_SERVER_FIELDS);
        });

        it('cost 필드에 parseCurrency()가 적용되어야 합니다', () => {
            expect(findUnparsedCurrencyFields(content)).toEqual([]);
        });
    });
});

// ══════════════════════════════════════════════════════════════
// 3. 고객사(Client) 다이얼로그
// ══════════════════════════════════════════════════════════════

describe('고객사(Client) 다이얼로그', () => {
    describe('clients-table.svelte (/clients 전용)', () => {
        const content = readFile('src/lib/components/clients-table.svelte');
        const setKeys = extractFormDataSetKeys(content);

        it('서버 핸들러 필드를 모두 전송해야 합니다', () => {
            assertFieldsCovered(setKeys, CLIENT_SERVER_FIELDS);
        });
    });



    describe('home-contract-dialog.svelte (홈 계약 내 고객사 편집)', () => {
        const content = readFile('src/lib/components/home-contract-dialog.svelte');
        const setKeys = extractFormDataSetKeys(content);

        it('고객사 서버 핸들러 필드를 모두 전송해야 합니다', () => {
            assertFieldsCovered(setKeys, CLIENT_SERVER_FIELDS);
        });
    });
});

// ══════════════════════════════════════════════════════════════
// 4. 제품(Product) 다이얼로그
// ══════════════════════════════════════════════════════════════

describe('제품(Product) 다이얼로그', () => {
    describe('products-table.svelte (/products 전용)', () => {
        const content = readFile('src/lib/components/products-table.svelte');
        const setKeys = extractFormDataSetKeys(content);

        it('서버 핸들러 필드를 모두 전송해야 합니다', () => {
            assertFieldsCovered(setKeys, PRODUCT_SERVER_FIELDS);
        });
    });



    describe('home-contract-dialog.svelte (홈 계약 내 제품 편집)', () => {
        const content = readFile('src/lib/components/home-contract-dialog.svelte');
        const setKeys = extractFormDataSetKeys(content);

        it('제품 서버 핸들러 필드를 모두 전송해야 합니다', () => {
            assertFieldsCovered(setKeys, PRODUCT_SERVER_FIELDS);
        });
    });


});

// ══════════════════════════════════════════════════════════════
// 5. 펌웨어(Firmware) 다이얼로그
// ══════════════════════════════════════════════════════════════

describe('펌웨어(Firmware) 다이얼로그', () => {
    describe('firmware-table.svelte (/firmware 전용)', () => {
        const content = readFile('src/lib/components/firmware-table.svelte');
        const setKeys = extractFormDataSetKeys(content);

        it('서버 핸들러 필드를 모두 전송해야 합니다', () => {
            assertFieldsCovered(setKeys, FIRMWARE_SERVER_FIELDS);
        });
    });

    describe('products-table.svelte (제품 내 펌웨어 편집)', () => {
        const content = readFile('src/lib/components/products-table.svelte');
        const setKeys = extractFormDataSetKeys(content);

        it('펌웨어 서버 핸들러 필드를 모두 전송해야 합니다', () => {
            assertFieldsCovered(setKeys, FIRMWARE_SERVER_FIELDS);
        });
    });

    describe('home-contract-dialog.svelte (홈 계약 내 펌웨어 편집)', () => {
        const content = readFile('src/lib/components/home-contract-dialog.svelte');
        const setKeys = extractFormDataSetKeys(content);

        it('펌웨어 서버 핸들러 필드를 모두 전송해야 합니다', () => {
            assertFieldsCovered(setKeys, FIRMWARE_SERVER_FIELDS);
        });
    });
});

// ══════════════════════════════════════════════════════════════
// 6. 서버 핸들러 동기화 검증
// ══════════════════════════════════════════════════════════════

describe('서버 핸들러 필드 목록 동기화', () => {
    // 서버에 새 필드가 추가되면 이 테스트가 실패 → 테스트 목록 업데이트 필요
    const serverNonEssentialFields = ['id', 'ids', 'attachmentFile', 'removeAttachmentFile'];

    it('contracts 서버 핸들러', () => {
        const content = readFile('src/routes/(app)/contracts/+page.server.ts');
        const getKeys = extractFormDataGetKeys(content);
        const mainFields = getKeys.filter((k) => !serverNonEssentialFields.includes(k));
        const allKnown = [...CONTRACT_SERVER_FIELDS];
        const unknownFields = mainFields.filter((k) => !allKnown.includes(k));
        expect(unknownFields, `테스트 목록에 없는 서버 필드: ${unknownFields.join(', ')}`).toEqual([]);
    });

    it('AS 서버 핸들러', () => {
        const content = readFile('src/routes/(app)/as/+page.server.ts');
        const getKeys = extractFormDataGetKeys(content);
        const nonEssential = [...serverNonEssentialFields, 'asFile', 'removeAsFile'];
        const mainFields = getKeys.filter((k) => !nonEssential.includes(k));
        const unknownFields = mainFields.filter((k) => !AS_SERVER_FIELDS.includes(k));
        expect(unknownFields, `테스트 목록에 없는 서버 필드: ${unknownFields.join(', ')}`).toEqual([]);
    });

    it('clients 서버 핸들러', () => {
        const content = readFile('src/routes/(app)/clients/+page.server.ts');
        const getKeys = extractFormDataGetKeys(content);
        const nonEssential = [
            ...serverNonEssentialFields,
            'registrationFile',
            'removeRegistrationFile'
        ];
        const mainFields = getKeys.filter((k) => !nonEssential.includes(k));
        const unknownFields = mainFields.filter((k) => !CLIENT_SERVER_FIELDS.includes(k));
        expect(unknownFields, `테스트 목록에 없는 서버 필드: ${unknownFields.join(', ')}`).toEqual([]);
    });

    it('products 서버 핸들러', () => {
        const content = readFile('src/routes/(app)/products/+page.server.ts');
        const getKeys = extractFormDataGetKeys(content);
        const nonEssential = [
            ...serverNonEssentialFields,
            'productFile',
            'removeProductFile',
            'inventoryData'
        ];
        const mainFields = getKeys.filter((k) => !nonEssential.includes(k));
        const unknownFields = mainFields.filter((k) => !PRODUCT_SERVER_FIELDS.includes(k));
        expect(unknownFields, `테스트 목록에 없는 서버 필드: ${unknownFields.join(', ')}`).toEqual([]);
    });

    it('firmware 서버 핸들러', () => {
        const content = readFile('src/routes/(app)/firmware/+page.server.ts');
        const getKeys = extractFormDataGetKeys(content);
        const nonEssential = [
            ...serverNonEssentialFields,
            'firmwareBinFile',
            'firmwareDocFile',
            'removeFirmwareFile',
            'removeDocFile'
        ];
        const mainFields = getKeys.filter((k) => !nonEssential.includes(k));
        const unknownFields = mainFields.filter((k) => !FIRMWARE_SERVER_FIELDS.includes(k));
        expect(unknownFields, `테스트 목록에 없는 서버 필드: ${unknownFields.join(', ')}`).toEqual([]);
    });
});
