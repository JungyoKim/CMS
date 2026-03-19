# Docker 이미지 업데이트 가이드

## 🚀 간단한 업데이트 프로세스

Docker 이미지만 교체하면 모든 것이 자동으로 설정됩니다!

### 1. 새 이미지 빌드

```bash
# 로컬에서
docker build -t cms:latest .
```

또는 Docker Hub 사용:

```bash
docker build -t [your-username]/cms:latest .
docker push [your-username]/cms:latest
```

### 2. 컨테이너 재시작

```bash
# Docker Compose 사용 시
docker-compose build
docker-compose up -d

# 또는 직접 실행 시
docker stop cms-container
docker rm cms-container
docker run --rm -d \
  --name cms-container \
  -p 3000:3000 \
  -v ./data:/app/data \
  -v ./uploads:/app/uploads \
  -e DATABASE_URL=/app/data/sqlite.db \
  cms:latest
```

### 3. 완료! ✨

**자동으로 실행되는 작업:**
- ✅ 데이터베이스 마이그레이션 자동 실행
- ✅ 새로운 스키마 변경사항 자동 적용
- ✅ 기존 데이터는 그대로 유지
- ✅ 애플리케이션 자동 시작

## 🔄 마이그레이션 동작 방식

1. **컨테이너 시작 시** `docker-entrypoint.sh` 실행
2. **마이그레이션 스크립트** (`run-migrations.js`) 실행
3. **마이그레이션 추적**: `__drizzle_migrations` 테이블 확인
4. **미적용 마이그레이션만 실행**: `drizzle/` 폴더의 SQL 파일 순차 실행
5. **애플리케이션 시작**: 마이그레이션 완료 후 앱 실행

## 📋 마이그레이션 파일 구조

```
drizzle/
├── 0000_abandoned_night_thrasher.sql
├── 0001_same_rafael_vega.sql
├── 0002_unique_dracula.sql
├── ...
└── meta/
    └── _journal.json
```

마이그레이션 파일은 파일명 순서대로 자동 실행됩니다.

## ✅ 확인 방법

### 마이그레이션 로그 확인

```bash
docker logs cms-container | grep -i migration
```

### 적용된 마이그레이션 확인

```bash
docker exec cms-container sqlite3 /app/data/sqlite.db "SELECT * FROM __drizzle_migrations;"
```

## 🆘 문제 해결

### 마이그레이션이 실행되지 않는 경우

1. **로그 확인:**
```bash
docker logs cms-container
```

2. **수동 실행:**
```bash
docker exec cms-container node /app/scripts/run-migrations.js /app/data/sqlite.db
```

### 마이그레이션 오류 발생 시

- 이미 적용된 마이그레이션은 건너뜁니다
- 테이블/컬럼이 이미 존재하는 경우 자동으로 무시됩니다
- 심각한 오류는 컨테이너 시작을 중단합니다

### 데이터베이스 파일 권한 문제

```bash
# 파일 권한 확인 및 수정
sudo chown -R 1000:1000 ./data
chmod 644 ./data/sqlite.db
```

## 📝 주의사항

1. **데이터베이스 백업**: 업데이트 전에 항상 백업하세요
   ```bash
   cp ./data/sqlite.db ./data/sqlite.db.backup
   ```

2. **볼륨 마운트**: 데이터베이스 파일은 반드시 볼륨으로 마운트되어야 합니다
   ```yaml
   volumes:
     - ./data:/app/data
   ```

3. **마이그레이션 순서**: 마이그레이션 파일은 순서대로 실행되므로 파일명을 변경하지 마세요

## 🎯 Synology에서 업데이트

### 방법 1: Docker Compose (권장)

```bash
cd /volume1/docker/cms
docker-compose pull  # Docker Hub에서 가져오는 경우
docker-compose build # 로컬에서 빌드하는 경우
docker-compose up -d
```

### 방법 2: Docker GUI

1. Docker → 이미지 → 새 이미지 다운로드/빌드
2. 기존 컨테이너 중지 및 삭제
3. 새 이미지로 컨테이너 재생성 (동일한 설정 사용)
4. **마이그레이션은 자동으로 실행됩니다!**








