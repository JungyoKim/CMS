# Docker 이미지 빌드 가이드

## 🚀 cms:latest 이미지 빌드

### 방법 1: 직접 빌드 (권장)

```bash
docker build -t cms:latest .
```

### 방법 2: 스크립트 사용

**Windows (PowerShell):**
```powershell
.\scripts\build-docker-image.ps1
```

**Linux/Mac:**
```bash
chmod +x scripts/build-docker-image.sh
./scripts/build-docker-image.sh
```

### 방법 3: Docker Compose 사용

```bash
docker-compose build
```

`docker-compose.yml`에 `image: cms:latest`가 설정되어 있어서 자동으로 `cms:latest`로 빌드됩니다.

## 📋 이미지 확인

```bash
docker images cms:latest
```

## 🏃 실행 방법

### Docker Compose 사용 (권장)

```bash
docker-compose up -d
```

### 직접 실행

```bash
docker run --rm -d \
  --name cms-container \
  -p 3000:3000 \
  -v ./data:/app/data \
  -v ./uploads:/app/uploads \
  -e DATABASE_URL=/app/data/sqlite.db \
  cms:latest
```

## 🔄 업데이트 시

1. **새 이미지 빌드:**
```bash
docker build -t cms:latest .
```

2. **컨테이너 재시작:**
```bash
# Docker Compose 사용
docker-compose up -d

# 직접 실행 시
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

## 📦 Synology에 배포

### 1. 로컬에서 이미지 빌드

```bash
docker build -t cms:latest .
```

### 2. Docker Hub에 푸시 (선택사항)

```bash
# Docker Hub 로그인
docker login

# 태그 설정
docker tag cms:latest [your-username]/cms:latest

# 푸시
docker push [your-username]/cms:latest
```

### 3. Synology에서 가져오기

**방법 A: Docker Hub에서 가져오기**
```bash
ssh admin@[Synology-IP]
docker pull [your-username]/cms:latest
docker tag [your-username]/cms:latest cms:latest
```

**방법 B: 파일로 전송**
```bash
# 로컬에서 이미지 저장
docker save cms:latest -o cms-latest.tar

# Synology로 전송 (SCP 또는 File Station)
scp cms-latest.tar admin@[Synology-IP]:/volume1/docker/

# Synology에서 로드
ssh admin@[Synology-IP]
docker load -i /volume1/docker/cms-latest.tar
```

**방법 C: Synology에서 직접 빌드**
```bash
# 프로젝트 파일을 Synology로 복사 후
ssh admin@[Synology-IP]
cd /volume1/docker/cms
docker build -t cms:latest .
```

## ✅ 확인 사항

빌드 후 다음을 확인하세요:

1. **이미지가 생성되었는지:**
```bash
docker images cms:latest
```

2. **마이그레이션이 포함되었는지:**
```bash
docker run --rm cms:latest ls -la /app/drizzle
```

3. **Entrypoint 스크립트가 있는지:**
```bash
docker run --rm cms:latest ls -la /app/scripts/docker-entrypoint.sh
```

## 🆘 문제 해결

### 빌드 실패 시

```bash
# 캐시 없이 빌드
docker build --no-cache -t cms:latest .
```

### 이미지 크기 확인

```bash
docker images cms:latest
```

### 빌드 로그 확인

```bash
docker build -t cms:latest . 2>&1 | tee build.log
```








