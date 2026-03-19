# 1. 빌드 스테이지
FROM node:20-alpine AS builder

# 네이티브 모듈 빌드를 위한 도구 설치
RUN apk add --no-cache python3 make g++

WORKDIR /app

# 의존성 파일 복사
COPY package*.json ./
COPY package-lock.json* ./

# 모든 의존성 설치 (optional dependencies 포함)
RUN npm install --include=optional

# npm의 optional dependencies 버그 해결을 위해 재설치
RUN rm -rf node_modules package-lock.json && npm install --include=optional

# 소스 코드 복사 및 빌드
COPY . .
ARG DATABASE_URL
ENV DATABASE_URL=${DATABASE_URL:-./data/sqlite.db}

# 데이터베이스 디렉토리 생성 (빌드 시 필요)
RUN mkdir -p data

# SvelteKit 동기화 및 빌드
RUN npm run prepare
RUN npm run build

# 프로덕션용 의존성만 남기기
RUN npm prune --production


# 2. 실행 스테이지
FROM node:20-alpine AS runner

# better-sqlite3를 위한 런타임 의존성 (선택적, 빌드된 모듈 사용 시 불필요할 수 있음)
RUN apk add --no-cache python3 make g++ || true

WORKDIR /app

# 환경 변수 설정
ENV NODE_ENV=production
ENV PORT=3000
ENV HOST=0.0.0.0

# 빌드 스테이지에서 필요한 파일만 복사
COPY --from=builder /app/build ./build
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package.json ./
COPY --from=builder /app/static ./static
COPY --from=builder /app/drizzle ./drizzle
COPY --from=builder /app/scripts ./scripts

# 데이터 및 업로드 디렉토리 생성
RUN mkdir -p uploads data

# Entrypoint 스크립트 실행 권한 부여
RUN chmod +x /app/scripts/docker-entrypoint.sh

# 포트 노출
EXPOSE 3000

# Entrypoint 설정 (마이그레이션 자동 실행 후 앱 시작)
ENTRYPOINT ["/app/scripts/docker-entrypoint.sh"]