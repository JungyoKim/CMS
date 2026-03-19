# Synology Docker 빠른 시작 가이드

## 🚀 빠른 배포 (5분)

### 1. 파일 준비 및 업로드

```bash
# Synology File Station에서
/volume1/docker/cms/ 디렉토리 생성

# 다음 파일들 업로드:
- Dockerfile
- docker-compose.yml
- package.json, package-lock.json
- drizzle/ 폴더 (마이그레이션 파일)
- static/ 폴더
- scripts/ 폴더

# 기존 데이터베이스 파일 복사:
data/sqlite.db → /volume1/docker/cms/data/sqlite.db
```

**✨ 중요**: 마이그레이션은 자동으로 실행되므로 수동 작업이 필요 없습니다!

### 2. SSH 접속 및 실행

```bash
# SSH 접속
ssh admin@[Synology-IP]

# 프로젝트 디렉토리로 이동
cd /volume1/docker/cms

# 자동화 스크립트 실행 (권장)
chmod +x scripts/synology-setup.sh
./scripts/synology-setup.sh

# 또는 수동 실행
docker-compose build
docker-compose up -d
```

### 3. 접속 확인

```
http://[Synology-IP]:3000
```

## 📋 필수 체크리스트

- [ ] 기존 `sqlite.db` 파일을 `/volume1/docker/cms/data/`에 복사
- [ ] `docker-compose.yml`의 볼륨 경로가 Synology 경로와 일치하는지 확인
- [ ] 포트 3000이 사용 가능한지 확인
- [ ] SSH 서비스가 활성화되어 있는지 확인

## 🔧 자주 사용하는 명령어

```bash
# 로그 확인
docker-compose logs -f

# 컨테이너 재시작
docker-compose restart

# 컨테이너 중지
docker-compose down

# 컨테이너 상태 확인
docker ps

# 데이터베이스 백업
cp /volume1/docker/cms/data/sqlite.db /volume1/docker/cms/backups/sqlite_$(date +%Y%m%d).db
```

## ⚠️ 문제 해결

### 컨테이너가 시작되지 않음
```bash
docker-compose logs
```

### 마이그레이션 로그 확인
```bash
# 마이그레이션 실행 로그 확인
docker-compose logs cms | grep -i migration
```

### 데이터베이스 오류
- 컨테이너가 시작될 때 자동으로 마이그레이션이 실행됩니다
- 로그에서 마이그레이션 오류 확인:
```bash
docker-compose logs cms
```

### 권한 문제
```bash
sudo chown -R 1000:1000 /volume1/docker/cms/data
sudo chown -R 1000:1000 /volume1/docker/cms/uploads
```

## 📚 상세 가이드

더 자세한 내용은 [SYNOLOGY_DOCKER_GUIDE.md](./SYNOLOGY_DOCKER_GUIDE.md)를 참조하세요.

