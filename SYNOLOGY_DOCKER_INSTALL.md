# Synology Docker 설치 가이드

이 문서는 Synology NAS의 Docker에서 CMS 애플리케이션을 설치하고 실행하는 방법을 단계별로 설명합니다.

## 사전 준비사항

### 1. Synology NAS 준비

- **DSM 버전**: 7.0 이상 권장 (6.2 이상 가능)
- **최소 메모리**: 2GB 이상 권장
- **Docker 패키지**: Synology Package Center에서 Docker 설치 필요

### 2. Docker 패키지 설치

1. **Package Center 열기**
   - DSM 메인 화면 → Package Center

2. **Docker 검색 및 설치**
   - 검색창에 "Docker" 입력
   - "Docker" 패키지 선택
   - "설치" 클릭
   - 설치 완료까지 대기 (몇 분 소요)

3. **Docker 실행**
   - Package Center → "설치됨" 탭
   - Docker 선택 → "열기" 클릭

## 1단계: 프로젝트 파일 준비

### 방법 A: File Station 사용 (GUI)

1. **폴더 생성**
   - File Station 열기
   - 원하는 위치에 `docker` 폴더 생성 (예: `/volume1/docker`)
   - `docker` 폴더 안에 `cms` 폴더 생성

2. **프로젝트 파일 업로드**
   - `cms` 폴더에 다음 파일/폴더 업로드:
     ```
     cms/
     ├── Dockerfile
     ├── docker-compose.yml
     ├── package.json
     ├── package-lock.json (또는 bun.lock)
     ├── svelte.config.js
     ├── vite.config.ts
     ├── tsconfig.json
     ├── drizzle.config.ts
     ├── src/ (폴더 전체)
     ├── static/ (폴더 전체)
     └── drizzle/ (폴더 전체)
     ```

3. **필수 폴더 생성**
   - `cms/data` 폴더 생성 (데이터베이스 저장용)
   - `cms/uploads` 폴더 생성 (업로드 파일 저장용)

### 방법 B: SSH 사용 (고급 사용자)

1. **SSH 활성화**
   - 제어판 → 터미널 및 SNMP → SSH 서비스 활성화

2. **SSH 접속**
   ```bash
   ssh admin@your-synology-ip
   ```

3. **프로젝트 파일 복사**
   ```bash
   # docker 폴더 생성
   mkdir -p /volume1/docker/cms
   cd /volume1/docker/cms
   
   # 프로젝트 파일 복사 (WinSCP, scp, 또는 File Station 사용)
   # 또는 Git 사용:
   git clone <repository-url> .
   ```

4. **필수 폴더 생성**
   ```bash
   mkdir -p data uploads
   chmod 755 data uploads
   ```

## 2단계: Docker Compose 설정

### 방법 A: Docker GUI 사용 (권장)

Synology Docker GUI를 사용하면 더 쉽게 설정할 수 있습니다.

#### 2-1. 이미지 빌드

1. **Docker 패키지 열기**
   - Package Center → 설치됨 → Docker → 열기

2. **이미지 탭으로 이동**
   - 좌측 메뉴에서 "이미지" 선택

3. **이미지 빌드**
   - "추가" 버튼 클릭 → "파일에서 추가" 선택
   - 또는 "추가" → "Docker Hub에서 다운로드" 선택 후 빌드 명령어 사용

**SSH를 사용하는 경우 (더 쉬움):**
```bash
cd /volume1/docker/cms
docker build -t cms:latest .
```

#### 2-2. 컨테이너 생성

1. **컨테이너 생성 시작**
   - "컨테이너" 탭 → "생성" 클릭
   - "이미지에서 생성" 선택
   - `cms:latest` 이미지 선택

2. **컨테이너 이름 설정**
   - 컨테이너 이름: `cms`

3. **고급 설정 열기**
   - "고급 설정" 버튼 클릭

4. **환경 변수 설정**
   - "환경" 탭 클릭
   - 다음 환경 변수 추가:
     ```
     NODE_ENV=production
     PORT=3000
     HOST=0.0.0.0
     DATABASE_URL=/app/data/sqlite.db
     JWT_SECRET=your-strong-secret-key-here
     ```
     > **중요**: JWT_SECRET은 강력한 랜덤 문자열로 변경하세요!

5. **볼륨 설정**
   - "볼륨" 탭 클릭
   - "폴더 추가" 클릭
   
   **데이터베이스 볼륨:**
   - 마운트 경로: `/volume1/docker/cms/data` (File Station에서 확인한 전체 경로)
   - 컨테이너 경로: `/app/data`
   
   **업로드 파일 볼륨:**
   - "폴더 추가" 클릭
   - 마운트 경로: `/volume1/docker/cms/uploads`
   - 컨테이너 경로: `/app/uploads`

6. **포트 설정**
   - "포트 설정" 탭 클릭
   - "포트 설정 추가" 클릭
   - 로컬 포트: `3000` (또는 원하는 포트)
   - 컨테이너 포트: `3000`
   - 프로토콜: `TCP`

7. **네트워크 설정**
   - "네트워크" 탭 확인
   - 기본 bridge 네트워크 사용

8. **자동 재시작 설정**
   - "자동 재시작 활성화" 체크

9. **적용 및 생성**
   - "적용" 클릭
   - "다음" 클릭
   - 설정 확인 후 "완료" 클릭

### 방법 B: Docker Compose 사용 (SSH 필요)

SSH 접속이 가능한 경우 Docker Compose를 사용하는 것이 더 편리합니다.

1. **docker-compose.yml 확인**
   - 이미 프로젝트에 포함되어 있음

2. **환경 변수 파일 생성 (선택사항)**
   ```bash
   cd /volume1/docker/cms
   cat > .env << EOF
   DATABASE_URL=./sqlite.db
   JWT_SECRET=$(openssl rand -base64 32)
   NODE_ENV=production
   PORT=3000
   HOST=0.0.0.0
   EOF
   ```

3. **Docker Compose로 실행**
   ```bash
   docker-compose up -d --build
   ```

4. **상태 확인**
   ```bash
   docker-compose ps
   docker-compose logs -f
   ```

## 3단계: 실행 및 확인

### 컨테이너 시작

**Docker GUI 사용:**
- 컨테이너 목록에서 `cms` 선택
- "시작" 버튼 클릭

**SSH 사용:**
```bash
docker start cms
# 또는 docker-compose 사용 시:
docker-compose start
```

### 로그 확인

**Docker GUI:**
- 컨테이너 선택 → "세부 정보" → "로그" 탭

**SSH:**
```bash
docker logs cms
docker logs -f cms  # 실시간 로그
```

### 접속 확인

브라우저에서 다음 주소로 접속:
- `http://your-synology-ip:3000`
- 예: `http://192.168.1.100:3000`

첫 로그인 페이지가 표시되면 성공!

## 4단계: 도메인 설정 (선택사항)

### Synology Reverse Proxy 사용

1. **제어판 열기**
   - 제어판 → 로그인 포털 → 고급 → Reverse Proxy

2. **Reverse Proxy 규칙 생성**
   - "생성" 클릭
   
   **일반 설정:**
   - 설명: `CMS`
   - 프로토콜: `HTTPS`
   - 호스트 이름: `cms.yourdomain.com` (또는 원하는 도메인)
   - 포트: `443`
   
   **대상 설정:**
   - 프로토콜: `HTTP`
   - 호스트 이름: `localhost`
   - 포트: `3000`

3. **SSL 인증서 설정**
   - 제어판 → 보안 → 인증서
   - Let's Encrypt 인증서 발급 (도메인 필요)
   - Reverse Proxy 규칙에 인증서 연결

## 5단계: 데이터 관리

### 데이터베이스 위치

- **로컬 경로**: `/volume1/docker/cms/data/sqlite.db`
- **컨테이너 내부**: `/app/data/sqlite.db`

### 업로드 파일 위치

- **로컬 경로**: `/volume1/docker/cms/uploads/`
- **컨테이너 내부**: `/app/uploads/`

### 백업 설정

**File Station 사용:**
1. File Station에서 `docker/cms/data` 및 `docker/cms/uploads` 폴더 선택
2. 우클릭 → "압축" → 백업 파일 생성
3. 정기적으로 다른 위치에 백업

**Hyper Backup 사용 (자동 백업):**
1. Hyper Backup 패키지 설치
2. 백업 작업 생성
3. 백업 대상에 `docker/cms` 폴더 포함
4. 스케줄 설정

**SSH 사용:**
```bash
# 데이터베이스 백업
cp /volume1/docker/cms/data/sqlite.db /volume1/docker/cms/data/sqlite.db.backup.$(date +%Y%m%d)

# 업로드 파일 백업
tar -czf /volume1/docker/cms/uploads-backup-$(date +%Y%m%d).tar.gz /volume1/docker/cms/uploads
```

## 문제 해결

### 문제 1: 컨테이너가 시작되지 않음

**해결 방법:**
1. 로그 확인 (Docker GUI → 컨테이너 → 로그)
2. 포트 충돌 확인:
   - 제어판 → 네트워크 → 네트워크 인터페이스
   - 다른 서비스가 3000 포트 사용 중인지 확인
3. 권한 확인:
   ```bash
   chmod -R 755 /volume1/docker/cms/data
   chmod -R 755 /volume1/docker/cms/uploads
   ```

### 문제 2: 권한 오류

**해결 방법:**
```bash
# SSH 접속 후
sudo chown -R 1026:100 /volume1/docker/cms/data
sudo chown -R 1026:100 /volume1/docker/cms/uploads
chmod -R 755 /volume1/docker/cms/data
chmod -R 755 /volume1/docker/cms/uploads
```
> 참고: 1026은 Docker의 기본 UID, 100은 users 그룹입니다.

### 문제 3: 업로드 파일이 저장되지 않음

**해결 방법:**
1. 볼륨 마운트 경로 확인 (Docker GUI → 컨테이너 → 편집 → 볼륨)
2. 폴더 권한 확인:
   ```bash
   ls -la /volume1/docker/cms/uploads
   ```
3. 컨테이너 내부 확인:
   ```bash
   docker exec cms ls -la /app/uploads
   ```

### 문제 4: 포트 접근 불가

**해결 방법:**
1. **방화벽 설정 확인**
   - 제어판 → 보안 → 방화벽
   - 규칙에서 포트 3000 허용 확인

2. **네트워크 설정 확인**
   - 제어판 → 네트워크
   - 라우터 설정 확인

3. **포트 변경**
   - Docker GUI에서 컨테이너 편집 → 포트 설정 변경
   - 예: 로컬 포트 3001, 컨테이너 포트 3000

### 문제 5: 빌드 실패

**해결 방법:**
```bash
# SSH 접속 후
cd /volume1/docker/cms
docker-compose build --no-cache

# 또는 Docker GUI에서 이미지 삭제 후 재빌드
```

### 문제 6: 메모리 부족

**해결 방법:**
1. Docker 리소스 제한 설정
   - Docker GUI → 설정 → 리소스
   - 메모리 할당량 확인 및 조정

2. 다른 컨테이너 중지
   - 불필요한 컨테이너 중지하여 메모리 확보

## 업데이트 방법

### 방법 1: Docker GUI 사용

1. 컨테이너 중지
2. 새 파일 업로드 (File Station 또는 Git)
3. 이미지 재빌드
4. 컨테이너 재시작

### 방법 2: SSH + Docker Compose 사용

```bash
cd /volume1/docker/cms

# 새 코드 가져오기 (Git 사용 시)
git pull

# 또는 새 파일 업로드 후

# 이미지 재빌드 및 재시작
docker-compose up -d --build
```

## 성능 최적화

### 리소스 할당

Docker GUI → 컨테이너 → 편집 → 리소스 제한:
- **CPU 우선순위**: 높음
- **메모리 제한**: 최소 512MB, 권장 1GB 이상

### 데이터베이스 최적화

SQLite는 파일 시스템 성능에 의존:
- SSD 볼륨 사용 권장
- 정기적인 백업 수행

## 보안 권장사항

1. **강력한 JWT_SECRET 사용**
   - 최소 32자 이상의 랜덤 문자열
   - 프로덕션에서는 반드시 변경

2. **방화벽 설정**
   - 필요한 포트만 열기
   - 가능하면 내부망에서만 접근

3. **HTTPS 사용** (프로덕션)
   - Reverse Proxy를 통한 HTTPS 설정
   - Let's Encrypt 인증서 사용

4. **정기적인 백업**
   - 데이터베이스와 업로드 파일 정기 백업
   - Hyper Backup 활용 권장

5. **업데이트 관리**
   - 정기적인 컨테이너 이미지 업데이트
   - 보안 패치 적용

## 추가 리소스

- 빠른 시작 가이드: `DOCKER_QUICK_START.md`
- 상세 설치 가이드: `DOCKER_INSTALLATION.md`
- 사용자 매뉴얼: `USER_MANUAL.md`
- Synology Docker 공식 문서: https://kb.synology.com/ko-kr/DSM/help/Docker/docker_desc

## 지원 및 문의

문제가 발생하거나 도움이 필요한 경우:
1. 로그 확인 (Docker GUI → 컨테이너 → 로그)
2. 이 가이드의 문제 해결 섹션 참조
3. 시스템 관리자에게 문의

