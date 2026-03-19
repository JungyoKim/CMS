# Synology Docker 배포 가이드

이 문서는 CMS 애플리케이션을 Synology NAS의 Docker에서 실행하는 방법을 설명합니다.

## 사전 준비사항

1. **Synology NAS에 Docker 설치**
   - 패키지 센터에서 "Docker" 설치
   - DSM 7.0 이상 권장

2. **필요한 폴더 구조 생성**
   ```
   /docker/cms/
   ├── data/          # 데이터베이스 파일 저장
   └── uploads/       # 업로드된 파일 저장
   ```

## 방법 1: Docker Compose 사용 (권장)

### 1단계: 파일 업로드

Synology NAS에 다음 파일들을 업로드합니다:
- `Dockerfile`
- `docker-compose.yml`
- `package.json`
- `package-lock.json` (또는 `bun.lock`)
- `svelte.config.js`
- `vite.config.ts`
- `tsconfig.json`
- `drizzle.config.ts`
- `src/` 폴더 전체
- `static/` 폴더 전체
- `drizzle/` 폴더 전체 (마이그레이션 파일)

### 2단계: SSH 접속 또는 File Station 사용

**옵션 A: SSH 접속 (터미널 사용자)**
```bash
ssh admin@your-synology-ip
cd /volume1/docker/cms
```

**옵션 B: File Station 사용 (GUI 사용자)**
- File Station에서 `/docker/cms` 폴더로 이동

### 3단계: Docker Compose로 빌드 및 실행

SSH로 접속한 경우:
```bash
docker-compose up -d --build
```

### 4단계: Synology Docker GUI에서 확인

1. Docker 패키지 열기
2. "컨테이너" 탭에서 `cms` 컨테이너 확인
3. 상태가 "실행 중"인지 확인

## 방법 2: Synology Docker GUI 사용

### 1단계: 이미지 빌드

1. Docker 패키지 열기
2. "이미지" 탭 → "추가" → "파일에서 추가"
3. 프로젝트 폴더 선택 (Dockerfile이 있는 폴더)
4. 이미지 이름: `cms:latest`
5. "빌드" 클릭

### 2단계: 컨테이너 생성

1. "컨테이너" 탭 → "생성" → "이미지에서 생성"
2. 이미지 선택: `cms:latest`
3. 컨테이너 이름: `cms`
4. "고급 설정" 클릭

#### 포트 설정
- "포트 설정" 탭
- 로컬 포트: `3000`
- 컨테이너 포트: `3000`
- 프로토콜: `TCP`

#### 볼륨 설정
- "볼륨" 탭
- 폴더 추가:
  - 마운트 경로: `/docker/cms/data` → 컨테이너 경로: `/app/data`
  - 마운트 경로: `/docker/cms/uploads` → 컨테이너 경로: `/app/uploads`

#### 환경 변수 설정
- "환경" 탭
- 다음 변수 추가:
  ```
  NODE_ENV=production
  PORT=3000
  HOST=0.0.0.0
  DATABASE_URL=/app/data/sqlite.db
  ```

#### 네트워크 설정
- "네트워크" 탭
- "bridge" 네트워크 사용 (기본값)

5. "적용" 클릭
6. "다음" → "완료"

### 3단계: 컨테이너 시작

컨테이너 목록에서 `cms` 선택 → "시작" 클릭

## 접속 방법

### 내부망에서 접속
- `http://synology-ip:3000`
- 예: `http://192.168.1.100:3000`

### 도메인 설정 (선택사항)
1. Synology의 Reverse Proxy 설정 사용
2. 또는 내부 DNS 서버 설정
3. 자세한 내용은 `INTERNAL_DOMAIN_SETUP.md` 참조

## 데이터 관리

### 데이터베이스 백업
```bash
# SSH 접속 후
docker exec cms cp /app/data/sqlite.db /app/data/sqlite.db.backup
```

또는 File Station에서 `/docker/cms/data/sqlite.db` 파일을 직접 복사

### 업로드 파일 백업
File Station에서 `/docker/cms/uploads` 폴더 전체를 백업

## 로그 확인

### Synology Docker GUI
1. Docker 패키지 → "컨테이너" 탭
2. `cms` 컨테이너 선택
3. "세부 정보" → "로그" 탭

### SSH 접속 시
```bash
docker logs cms
docker logs -f cms  # 실시간 로그 확인
```

## 업데이트 방법

### 방법 1: Docker Compose 사용
```bash
cd /volume1/docker/cms
git pull  # 또는 새 파일 업로드
docker-compose up -d --build
```

### 방법 2: GUI 사용
1. 컨테이너 중지
2. 이미지 삭제
3. 새 이미지 빌드
4. 컨테이너 재생성 (기존 볼륨 연결 유지)

## 문제 해결

### 컨테이너가 시작되지 않을 때
1. 로그 확인: `docker logs cms`
2. 포트 충돌 확인: 다른 서비스가 3000 포트 사용 중인지 확인
3. 볼륨 권한 확인:
   ```bash
   chmod -R 755 /volume1/docker/cms/data
   chmod -R 755 /volume1/docker/cms/uploads
   ```

### 데이터베이스 오류
1. 데이터베이스 파일 권한 확인
2. 볼륨 마운트 경로 확인
3. 환경 변수 `DATABASE_URL` 확인

### 업로드 파일이 저장되지 않을 때
1. `uploads` 폴더 권한 확인
2. 볼륨 마운트 설정 확인
3. 컨테이너 내부에서 폴더 확인:
   ```bash
   docker exec cms ls -la /app/uploads
   ```

### 포트 접근이 안 될 때
1. Synology 방화벽 설정 확인
2. Docker 네트워크 설정 확인
3. 포트 포워딩 설정 확인

## 성능 최적화

### 리소스 제한 설정
Synology Docker GUI에서:
- CPU 우선순위: 높음
- 메모리 제한: 최소 512MB 권장
- 자동 재시작: 활성화

### 데이터베이스 최적화
SQLite는 파일 시스템 성능에 의존하므로:
- SSD 볼륨 사용 권장
- 정기적인 VACUUM 실행 고려

## 보안 고려사항

1. **방화벽 설정**
   - 필요한 포트만 열기
   - 내부망에서만 접근 가능하도록 설정

2. **인증**
   - 애플리케이션 내부 인증 시스템 사용
   - 강력한 비밀번호 정책 적용

3. **백업**
   - 정기적인 데이터베이스 백업
   - 업로드 파일 백업

4. **업데이트**
   - 정기적인 컨테이너 이미지 업데이트
   - 보안 패치 적용

## 환경 변수 참조

| 변수명 | 설명 | 기본값 | 필수 |
|--------|------|--------|------|
| `NODE_ENV` | 실행 환경 | `production` | 예 |
| `PORT` | 서버 포트 | `3000` | 예 |
| `HOST` | 바인딩 호스트 | `0.0.0.0` | 예 |
| `DATABASE_URL` | 데이터베이스 경로 | `/app/data/sqlite.db` | 예 |

## 추가 리소스

- [Synology Docker 공식 문서](https://kb.synology.com/ko-kr/DSM/help/Docker/docker_desc)
- [SvelteKit 배포 가이드](https://kit.svelte.dev/docs/adapter-node)
- [Docker Compose 문서](https://docs.docker.com/compose/)
