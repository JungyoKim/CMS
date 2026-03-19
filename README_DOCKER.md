# Docker 자동 마이그레이션 설정 완료 ✅

## 🎯 주요 기능

**Docker 이미지만 교체하면 모든 것이 자동으로 설정됩니다!**

- ✅ 컨테이너 시작 시 **자동으로 데이터베이스 마이그레이션 실행**
- ✅ 기존 데이터베이스 파일 그대로 사용 가능
- ✅ 새로운 스키마 변경사항 자동 적용
- ✅ 이미 적용된 마이그레이션은 자동으로 건너뜀
- ✅ 수동 작업 불필요

## 📁 생성된 파일

1. **`scripts/docker-entrypoint.sh`** - 컨테이너 시작 스크립트
   - 마이그레이션 실행 후 애플리케이션 시작

2. **`scripts/run-migrations.js`** - 마이그레이션 실행 스크립트
   - `drizzle/` 폴더의 SQL 파일을 순차적으로 실행
   - `__drizzle_migrations` 테이블로 추적

3. **`Dockerfile`** - 업데이트됨
   - Entrypoint 스크립트 복사 및 실행 권한 부여

4. **`docs/DOCKER_UPDATE_GUIDE.md`** - 업데이트 가이드

## 🚀 사용 방법

### 로컬 테스트

```bash
# 이미지 빌드
docker build -t cms:latest .

# 컨테이너 실행 (마이그레이션 자동 실행)
docker run --rm -p 3000:3000 \
  -v ./data:/app/data \
  -v ./uploads:/app/uploads \
  -e DATABASE_URL=/app/data/sqlite.db \
  cms:latest
```

### Docker Compose

```bash
docker-compose build
docker-compose up -d
```

### 업데이트 시

```bash
# 새 이미지 빌드
docker-compose build

# 컨테이너 재시작 (마이그레이션 자동 실행)
docker-compose up -d
```

## 🔄 마이그레이션 동작 방식

1. 컨테이너 시작 → `docker-entrypoint.sh` 실행
2. `run-migrations.js` 실행
3. `__drizzle_migrations` 테이블 확인 (없으면 생성)
4. `drizzle/` 폴더의 SQL 파일 순차 실행
5. 이미 적용된 마이그레이션은 건너뜀
6. 마이그레이션 완료 후 애플리케이션 시작

## 📝 로그 확인

```bash
# 마이그레이션 로그 확인
docker logs cms-container | grep -i migration

# 전체 로그
docker logs cms-container
```

## ✅ Synology 배포

자세한 내용은 `docs/SYNOLOGY_DOCKER_GUIDE.md`를 참조하세요.

**핵심**: 이미지만 교체하면 모든 것이 자동으로 설정됩니다!








