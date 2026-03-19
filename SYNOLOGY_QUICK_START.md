# Synology Docker 빠른 시작 가이드

## 빠른 설정 (5분)

### 1단계: 파일 준비
프로젝트 전체를 Synology NAS의 `/docker/cms` 폴더에 업로드합니다.

### 2단계: 폴더 생성
File Station에서 다음 폴더를 생성합니다:
- `/docker/cms/data` (데이터베이스 저장)
- `/docker/cms/uploads` (업로드 파일 저장)

### 3단계: Docker Compose 실행

**SSH 접속 방법:**
```bash
ssh admin@your-synology-ip
cd /volume1/docker/cms
docker-compose up -d --build
```

**또는 Synology Docker GUI 사용:**
1. Docker 패키지 열기
2. "이미지" → "추가" → "파일에서 추가"
3. 프로젝트 폴더 선택 후 빌드
4. 컨테이너 생성 시 아래 설정 적용:
   - 포트: 3000:3000
   - 볼륨: `/docker/cms/data` → `/app/data`
   - 볼륨: `/docker/cms/uploads` → `/app/uploads`
   - 환경 변수: `DATABASE_URL=/app/data/sqlite.db`

### 4단계: 접속 확인
브라우저에서 `http://your-synology-ip:3000` 접속

## 문제 해결

**컨테이너가 시작되지 않으면:**
```bash
docker logs cms
```

**포트가 이미 사용 중이면:**
`docker-compose.yml`에서 포트 번호 변경 (예: 3001:3000)

**권한 오류가 발생하면:**
```bash
chmod -R 755 /volume1/docker/cms/data
chmod -R 755 /volume1/docker/cms/uploads
```

## 상세 가이드
더 자세한 내용은 `DOCKER_DEPLOYMENT.md` 참조
