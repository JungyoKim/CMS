# Synology Docker 배포 가이드

기존 SQLite 데이터베이스를 사용하여 Synology Docker에 CMS 애플리케이션을 배포하는 가이드입니다.

**✨ 자동 마이그레이션**: 컨테이너 시작 시 데이터베이스 스키마가 자동으로 업데이트됩니다. 이미지만 교체하면 됩니다!

## 📋 사전 준비

### 1. 필요한 파일 준비

다음 파일들을 Synology NAS에 준비합니다:

```
cms/
├── Dockerfile
├── docker-compose.yml
├── package.json
├── package-lock.json
├── drizzle/              # 마이그레이션 파일
├── static/               # 정적 파일
└── data/                 # 데이터베이스 디렉토리
    └── sqlite.db         # 기존 데이터베이스 파일
└── uploads/              # 업로드된 파일 (선택사항)
```

### 2. 기존 데이터베이스 파일 복사

로컬에서 사용하던 SQLite 데이터베이스 파일을 Synology NAS로 복사합니다:

**Windows에서 Synology로 복사:**
```powershell
# File Station 또는 네트워크 드라이브를 통해 복사
# 또는 SCP 사용
scp ./data/sqlite.db admin@[Synology-IP]:/volume1/docker/cms/data/sqlite.db
```

**권장 경로 구조:**
```
/volume1/docker/cms/
├── data/
│   └── sqlite.db
├── uploads/
├── Dockerfile
├── docker-compose.yml
└── ... (기타 파일들)
```

## 🐳 방법 1: Docker Compose 사용 (권장)

### 1단계: 파일 업로드

1. Synology File Station에서 `/volume1/docker/cms/` 디렉토리 생성
2. 프로젝트 파일들을 모두 업로드
3. 기존 `sqlite.db` 파일을 `data/` 폴더에 복사

### 2단계: Docker Compose 설정 수정

`docker-compose.yml` 파일을 Synology 경로에 맞게 수정:

```yaml
version: '3.8'

services:
  cms:
    build:
      context: .
      dockerfile: Dockerfile
      args:
        DATABASE_URL: ${DATABASE_URL:-./sqlite.db}
    container_name: cms
    restart: unless-stopped
    ports:
      - "3000:3000"  # 원하는 포트로 변경 가능
    environment:
      - NODE_ENV=production
      - PORT=3000
      - HOST=0.0.0.0
      - DATABASE_URL=/app/data/sqlite.db
      - BODY_SIZE_LIMIT=Infinity
    volumes:
      # Synology 절대 경로 사용
      - /volume1/docker/cms/data:/app/data
      - /volume1/docker/cms/uploads:/app/uploads
    networks:
      - cms-network

networks:
  cms-network:
    driver: bridge
```

### 3단계: SSH 접속 및 빌드

1. Synology DSM → 제어판 → 터미널 및 SNMP → SSH 서비스 활성화
2. SSH로 접속:

```bash
ssh admin@[Synology-IP]
```

3. 프로젝트 디렉토리로 이동:

```bash
cd /volume1/docker/cms
```

4. Docker Compose로 빌드 및 실행:

```bash
docker-compose build
docker-compose up -d
```

### 4단계: 로그 확인

```bash
docker-compose logs -f
```

## 🐳 방법 2: Synology Docker GUI 사용

### 1단계: 이미지 빌드 (SSH 필요)

SSH로 접속하여 이미지를 빌드합니다:

```bash
cd /volume1/docker/cms
docker build -t cms:latest .
```

또는 Docker Hub에 이미지를 푸시한 경우:

```bash
docker pull [your-dockerhub-username]/cms:latest
```

### 2단계: Docker GUI에서 컨테이너 생성

1. **DSM → Docker → 이미지**에서 `cms:latest` 선택
2. **실행** 클릭
3. **고급 설정** 클릭

### 3단계: 볼륨 설정

**볼륨 탭**에서 다음 마운트 경로 추가:

| 마운트 경로 | 컨테이너 경로 | 설명 |
|------------|--------------|------|
| `/volume1/docker/cms/data` | `/app/data` | 데이터베이스 파일 |
| `/volume1/docker/cms/uploads` | `/app/uploads` | 업로드된 파일 |

### 4단계: 포트 설정

**포트 설정 탭**에서:

| 로컬 포트 | 컨테이너 포트 | 프로토콜 |
|---------|-------------|---------|
| `3000` (또는 원하는 포트) | `3000` | TCP |

### 5단계: 환경 변수 설정

**환경 변수 탭**에서 다음 추가:

| 변수 이름 | 값 |
|---------|-----|
| `NODE_ENV` | `production` |
| `PORT` | `3000` |
| `HOST` | `0.0.0.0` |
| `DATABASE_URL` | `/app/data/sqlite.db` |
| `BODY_SIZE_LIMIT` | `Infinity` |

### 6단계: 자동 재시작 설정

**고급 설정 → 자동 재시작**에서:
- **항상 재시작** 선택

### 7단계: 컨테이너 실행

**적용** 클릭하여 컨테이너를 실행합니다.

## 🔄 자동 마이그레이션

**컨테이너가 시작될 때 자동으로 데이터베이스 마이그레이션이 실행됩니다!**

- 기존 데이터베이스 파일을 그대로 사용할 수 있습니다
- 새로운 스키마 변경사항은 자동으로 적용됩니다
- 이미 적용된 마이그레이션은 건너뜁니다
- 수동 작업이 필요 없습니다

### 마이그레이션 로그 확인

```bash
# 컨테이너 시작 시 마이그레이션 로그 확인
docker-compose logs cms | grep -i migration
```

## 🌐 접속 확인

컨테이너가 실행되면 다음 주소로 접속:

```
http://[Synology-IP]:3000
```

## 📝 주의사항

### 1. 파일 권한

Synology에서 Docker 볼륨 마운트 시 파일 권한 문제가 발생할 수 있습니다:

```bash
# SSH로 접속하여 권한 설정
sudo chown -R 1000:1000 /volume1/docker/cms/data
sudo chown -R 1000:1000 /volume1/docker/cms/uploads
```

### 2. 데이터베이스 백업

정기적으로 데이터베이스 파일을 백업하세요:

```bash
# 백업 스크립트 예시
cp /volume1/docker/cms/data/sqlite.db /volume1/docker/cms/backups/sqlite_$(date +%Y%m%d_%H%M%S).db
```

### 3. 로그 확인

```bash
# Docker Compose 사용 시
docker-compose logs -f cms

# Docker GUI 사용 시
docker logs -f cms
```

### 4. 컨테이너 재시작

```bash
# Docker Compose 사용 시
docker-compose restart cms

# Docker GUI 사용 시
# Docker → 컨테이너 → cms → 재시작
```

## 🔄 업데이트 방법 (이미지만 교체!)

### Docker Compose 사용 시:

```bash
cd /volume1/docker/cms

# 새 이미지 빌드
docker-compose build

# 컨테이너 재시작 (자동으로 마이그레이션 실행됨)
docker-compose up -d
```

**✨ 마이그레이션은 자동으로 실행됩니다!** 기존 데이터베이스 파일은 그대로 유지되고, 새로운 스키마 변경사항만 자동 적용됩니다.

### Docker Hub 사용 시 (권장):

1. **로컬에서 이미지 빌드 및 푸시:**
```bash
# 로컬에서
docker build -t [your-username]/cms:latest .
docker push [your-username]/cms:latest
```

2. **Synology에서 이미지 가져오기:**
```bash
# SSH로 접속
ssh admin@[Synology-IP]

# 새 이미지 가져오기
docker pull [your-username]/cms:latest

# 기존 컨테이너 중지 및 삭제
docker stop cms
docker rm cms

# 새 이미지로 컨테이너 재생성 (docker-compose.yml 사용)
cd /volume1/docker/cms
docker-compose up -d
```

### Docker GUI 사용 시:

1. **새 이미지 가져오기:**
   - Docker → 이미지 → 레지스트리에서 검색 → 다운로드
   - 또는 SSH로 `docker pull [your-username]/cms:latest`

2. **기존 컨테이너 중지 및 삭제**
   - Docker → 컨테이너 → cms → 중지 → 삭제

3. **새 이미지로 컨테이너 재생성**
   - 동일한 설정으로 컨테이너 생성
   - **마이그레이션은 자동으로 실행됩니다!**

## 🆘 문제 해결

### 컨테이너가 시작되지 않는 경우:

```bash
# 로그 확인
docker logs cms

# 컨테이너 상태 확인
docker ps -a
```

### 데이터베이스 연결 오류:

- 데이터베이스 파일 경로 확인
- 파일 권한 확인
- 볼륨 마운트 경로 확인

### 포트 충돌:

다른 포트 사용:
```yaml
ports:
  - "3001:3000"  # 호스트 포트 변경
```

## 📞 추가 도움말

문제가 발생하면 다음을 확인하세요:

1. Docker 로그: `docker logs cms`
2. 컨테이너 상태: `docker ps -a`
3. 볼륨 마운트: `docker inspect cms | grep -A 10 Mounts`
4. 환경 변수: `docker exec cms env`

