# CMS (Client Management System)

고객, 계약, 제품, 펌웨어(프로토콜), AS 이력을 통합 관리하는 사내 CMS 시스템입니다.

## 기술 스택

| 분류 | 기술 |
|------|------|
| 프레임워크 | SvelteKit 2 + Svelte 5 |
| 언어 | TypeScript |
| 데이터베이스 | SQLite (better-sqlite3) |
| ORM | Drizzle ORM |
| 인증 | JWT (jose 라이브러리, HS256) |
| UI | [shadcn-svelte](https://www.shadcn-svelte.com/) (bits-ui 기반), Tailwind CSS 4, Tabler Icons |
| 테이블 | TanStack Table |
| 차트 | LayerChart (D3 기반) |
| 테스트 | Vitest (단위/통합), Playwright (E2E) |
| CI/CD | GitHub Actions (테스트 → Docker 빌드 → ghcr.io 배포) |
| 배포 | Docker (Node.js 20 Alpine) |

## 프로젝트 구조

```
src/
├── hooks.server.ts              # 인증 미들웨어 (JWT 검증, HTTPS 리다이렉트)
├── service-worker.ts            # PWA 서비스 워커
├── lib/
│   ├── server/
│   │   ├── db/
│   │   │   ├── index.ts         # DB 연결 (WAL 모드, FK 활성화)
│   │   │   └── schema.ts        # Drizzle 테이블 스키마 정의
│   │   ├── auth.ts              # JWT 토큰 생성/검증
│   │   ├── file-storage.ts      # 파일 업로드/다운로드/삭제
│   │   └── crud-helpers.ts      # 공통 CRUD 헬퍼 (soft delete, 파일 처리)
│   └── components/
│       ├── clients-table.svelte     # 고객 관리 테이블
│       ├── contracts-table.svelte   # 계약 관리 테이블
│       ├── products-table.svelte    # 제품 관리 테이블
│       ├── firmware-table.svelte    # 펌웨어 관리 테이블
│       ├── as-table.svelte          # AS(진행중) 테이블
│       ├── completed-as-table.svelte # AS(완료) 테이블
│       ├── incomplete-as-table.svelte # AS(미완료) 테이블
│       ├── pre-sales-table.svelte   # 사전영업 테이블
│       ├── home-contract-dialog.svelte  # 홈 계약 상세 다이얼로그
│       ├── home-as-dialog.svelte    # 홈 AS 상세 다이얼로그
│       ├── data-table/utils.ts      # 전화번호/이메일 포맷팅·검증 유틸
│       └── ui/
│           ├── file-upload-field.svelte  # 재사용 파일 업로드 컴포넌트
│           ├── contact-section.svelte    # 재사용 담당자 정보 폼
│           └── ...                       # shadcn-svelte 기반 UI 컴포넌트
├── routes/
│   ├── (auth)/login/            # 로그인 페이지
│   ├── (app)/
│   │   ├── +page.*              # 홈 (대시보드)
│   │   ├── clients/             # 고객 관리
│   │   ├── contracts/           # 계약 관리
│   │   │   └── contract-helpers.ts  # 계약 전용 헬퍼 (담당자·하위 데이터 처리)
│   │   ├── products/            # 제품 관리
│   │   ├── firmware/            # 펌웨어(프로토콜) 관리
│   │   ├── as/                  # AS 관리
│   │   ├── settings/            # 설정 (비밀번호 변경)
│   │   └── logout/              # 로그아웃
│   ├── api/                     # REST API 엔드포인트
│   │   ├── clients/             # 고객 API
│   │   ├── contracts/[id]/      # 계약 상세 API
│   │   ├── products/            # 제품 API
│   │   ├── firmware/            # 펌웨어 API
│   │   ├── as/                  # AS API
│   │   ├── files/               # 파일 다운로드 API
│   │   └── settings/            # 설정 API
│   └── healthcheck/             # 헬스체크 엔드포인트
e2e/                                 # Playwright E2E 테스트
├── auth.test.ts                 # 인증 흐름 (로그인/로그아웃)
├── navigation.test.ts           # 페이지 네비게이션
├── products.test.ts             # 제품 CRUD
├── clients.test.ts              # 고객 CRUD
└── settings.test.ts             # 설정 페이지
drizzle/
├── 0000_*.sql ~ 0011_*.sql      # SQL 마이그레이션 파일
└── meta/                        # Drizzle 마이그레이션 메타데이터
scripts/
├── build-docker-image.sh        # Docker 이미지 빌드 스크립트
└── docker-entrypoint.sh         # Docker 엔트리포인트 (마이그레이션 → 앱 시작)
```

## 데이터베이스 스키마

| 테이블 | 설명 |
|--------|------|
| `clients` | 고객사 (사업자등록번호, 주소, 담당자 등) |
| `contracts` | 계약 (고객·발주처 연결, 금액, 기간, 설치정보 등) |
| `products` | 제품 (관리코드, 단가, 버전) |
| `protocols` | 펌웨어/프로토콜 (버전, 파일) |
| `files` | 파일 저장소 (`FILE_LIST_ID`로 엔티티와 연결) |
| `repeaters` | 중계기 ID (계약에 종속) |
| `install_products` | 설치제품 (계약에 종속, 제품·프로토콜 참조) |
| `rooms` | 객실 ID (계약에 종속) |
| `as_records` | AS 이력 (요청/대응 내용, 비용, 완료 여부) |
| `product_inventory` | 제품 입출고 기록 |
| `passwords` | 로그인 비밀번호 (scrypt 해시) |
| `settings` | 시스템 설정 (key-value) |

## 주요 설계 패턴

### Soft Deletion
모든 주요 엔티티는 `deleted_at` 컬럼을 사용한 소프트 삭제를 적용합니다. 데이터를 물리적으로 삭제하지 않고 삭제 시각을 기록하며, 조회 시 `deleted_at IS NULL` 조건으로 필터링합니다.

### 파일 저장
파일은 `FILE_LIST_ID`(UUID)를 통해 엔티티와 연결됩니다. 하나의 `FILE_LIST_ID`에 여러 파일이 연결될 수 있으며, 물리 파일은 `uploads/` 디렉토리에 저장됩니다.

### 인증
- 단일 비밀번호 방식 (사내 시스템용)
- JWT 토큰 (HS256, 7일 만료)을 쿠키에 저장
- `hooks.server.ts`에서 모든 요청에 대해 인증 검증

### 에러 모니터링
`hooks.server.ts`의 `handleError`에서 서버 에러를 타임스탬프, 경로와 함께 로깅합니다. 404는 제외하며, 개발 환경에서는 상세 에러 메시지를, 프로덕션에서는 일반 메시지를 클라이언트에 반환합니다.

### HTTPS 스마트 리다이렉트
프로덕션 환경에서 HTTP 접속 시 HTTPS 서버의 `/healthcheck`로 프로브를 보내 응답이 있을 때만 리다이렉트합니다. HTTPS가 다운되었을 때는 HTTP로 정상 접속 가능합니다.

## 시작하기

### 사전 요구사항

- Node.js 20 이상
- npm

### 설치 및 실행

```bash
# 의존성 설치
npm install

# 환경변수 설정
cp .env.example .env
# .env 파일을 열어 값을 설정:
#   DATABASE_URL=local.db          # SQLite 파일 경로
#   JWT_SECRET=your-secret-key     # JWT 서명 키 (32자 이상 권장)
#   PRODUCTION_DOMAIN=             # 프로덕션 도메인 (HTTPS 리다이렉트용, 개발 시 비워둠)

# 개발 서버 실행
npm run dev
```

개발 서버가 `http://localhost:5173`에서 실행됩니다.

### 초기 비밀번호 설정

처음 실행 시 `passwords` 테이블이 비어있으므로 로그인할 수 없습니다. 아래 방법 중 하나로 비밀번호를 설정하세요:

1. **설정 페이지 사용**: 이미 로그인된 상태에서 `/settings`에서 비밀번호를 변경할 수 있습니다.
2. **DB 직접 접근**: 개발 환경에서 SQLite DB에 직접 scrypt 해시 비밀번호를 삽입합니다.

### 빌드

```bash
# 프로덕션 빌드
npm run build

# 빌드 결과 실행
npm run start
```

## Docker 배포

### 이미지 빌드

```bash
./scripts/build-docker-image.sh
# 또는
docker build -t cms:latest .
```

### 실행

```bash
docker run --rm -p 3000:3000 \
  -v ./data:/app/data \
  -v ./uploads:/app/uploads \
  -e DATABASE_URL=/app/data/sqlite.db \
  -e JWT_SECRET=your-secret-key \
  cms:latest
```

### 볼륨 마운트

| 컨테이너 경로 | 용도 |
|--------------|------|
| `/app/data` | SQLite 데이터베이스 파일 |
| `/app/uploads` | 업로드된 파일 저장소 |

Docker 컨테이너 시작 시 `docker-entrypoint.sh`가 자동으로 Drizzle 마이그레이션을 실행한 뒤 앱을 시작합니다.

### Synology NAS 배포

Container Manager에서 위와 동일한 설정으로 컨테이너를 생성합니다. 볼륨 마운트 경로를 NAS의 공유 폴더에 맞게 조정하세요.

## 환경변수

| 변수 | 필수 | 설명 | 기본값 |
|------|------|------|--------|
| `DATABASE_URL` | O | SQLite 파일 경로 | - |
| `JWT_SECRET` | O | JWT 서명 키 | - |
| `PRODUCTION_DOMAIN` | X | 프로덕션 도메인 (HTTPS 리다이렉트용) | `''` |
| `BODY_SIZE_LIMIT` | X | 업로드 파일 크기 제한 (바이트) | `524288` |
| `PORT` | X | 서버 포트 | `3000` |

## 스크립트

| 명령 | 설명 |
|------|------|
| `npm run dev` | 개발 서버 실행 |
| `npm run build` | 프로덕션 빌드 |
| `npm run start` | 빌드된 앱 실행 |
| `npm run check` | Svelte/TypeScript 타입 검사 |
| `npm run lint` | ESLint + Prettier 검사 |
| `npm run format` | Prettier 자동 포맷 |
| `npm run test` | Vitest 단위/통합 테스트 |
| `npm run test:e2e` | Playwright E2E 테스트 |
| `npm run test:all` | 단위 + E2E 전체 테스트 |
| `npm run db:generate` | 스키마 변경에서 마이그레이션 SQL 생성 |
| `npm run db:migrate` | 마이그레이션 적용 |
| `npm run db:push` | 스키마를 DB에 직접 푸시 (개발용) |
| `npm run db:studio` | Drizzle Studio (DB 브라우저) |

## 테스트

### 단위/통합 테스트 (Vitest)

서버 유틸리티, API 라우트, 페이지 액션, 클라이언트 유틸리티 등 201개 테스트를 포함합니다.

```bash
npm test
```

주요 테스트 파일:
- `src/lib/server/*.test.ts` — 인증, 비밀번호, 파일 저장, CRUD 헬퍼
- `src/routes/**/server.test.ts` — API 엔드포인트 및 페이지 액션
- `src/lib/components/data-table/*.test.ts` — 폼/파일 유틸리티
- `src/hooks.server.test.ts` — 인증 미들웨어

### E2E 테스트 (Playwright)

Playwright로 브라우저 기반 E2E 테스트를 실행합니다. 실행 전 앱을 빌드하고 프리뷰 서버를 자동 시작합니다.

```bash
# Playwright 브라우저 설치 (최초 1회)
npx playwright install chromium

# E2E 테스트 실행
npm run test:e2e
```

## CI/CD

GitHub Actions로 `main` 브랜치에 push 시 자동 실행됩니다.

1. **테스트** — `npm test`로 단위/통합 테스트 실행
2. **빌드 및 배포** — 테스트 통과 시 Docker 이미지 빌드 후 `ghcr.io`에 푸시

워크플로 파일: `.github/workflows/docker-publish.yml`

## 마이그레이션

Drizzle ORM의 마이그레이션 시스템을 사용합니다.

```bash
# 스키마 변경 후 마이그레이션 파일 생성
npm run db:generate

# 마이그레이션 적용 (개발 환경)
npm run db:migrate

# Drizzle Studio (DB 브라우저)
npm run db:studio
```

Docker 환경에서는 컨테이너 시작 시 자동으로 마이그레이션이 실행됩니다.
