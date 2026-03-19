# HTTPS 설정 가이드

이 문서는 Synology Docker 환경에서 CMS 애플리케이션에 HTTPS를 적용하는 방법을 설명합니다.

## 방법 1: Synology Reverse Proxy 사용 (가장 간단, 권장)

Synology의 내장 Reverse Proxy 기능을 사용하면 별도의 Nginx 컨테이너 없이 HTTPS를 설정할 수 있습니다.

### 장점
- 추가 컨테이너 불필요
- Synology GUI에서 쉽게 관리
- 자동 인증서 갱신 지원 (Let's Encrypt)
- 설정이 간단함

### 설정 방법

#### 1단계: 애플리케이션 실행
```bash
docker-compose up -d
```

#### 2단계: Synology Reverse Proxy 설정

1. **제어판** → **로그인 포털** → **고급** 탭 → **리버스 프록시** 클릭

2. **리버스 프록시 규칙 생성** 클릭

3. **일반 설정**:
   - 규칙 이름: `CMS`
   - 프로토콜: `HTTPS`
   - 호스트 이름: `cms.local` (또는 원하는 도메인)
   - 포트: `443` (또는 원하는 포트)
   - **HSTS 활성화**: 체크

4. **대상 설정**:
   - 프로토콜: `HTTP`
   - 호스트 이름: `localhost` (또는 Synology IP)
   - 포트: `3000`
   - **웹소켓 활성화**: 체크 (필요한 경우)

5. **고급 설정** (선택사항):
   - **사용자 정의 헤더**:
     ```
     X-Forwarded-Proto: https
     X-Forwarded-For: $remote_addr
     ```

6. **저장** 클릭

#### 3단계: 인증서 설정

1. **제어판** → **보안** → **인증서**

2. **추가** → **Let's Encrypt 인증서 추가** (공인 도메인) 또는 **자체 서명 인증서 만들기** (내부망)

3. 리버스 프록시 규칙에서 생성한 인증서 선택

#### 4단계: 파일 업로드 크기 제한 해제 (중요)

Synology Reverse Proxy는 기본적으로 파일 크기 제한이 있을 수 있습니다. 대용량 파일 업로드를 위해:

1. **제어판** → **애플리케이션 포털** → **리버스 프록시**
2. 생성한 규칙 선택 → **편집**
3. **고급 설정** 탭에서:
   - **사용자 정의 헤더**에 다음 추가:
     ```
     X-Forwarded-Proto: https
     X-Forwarded-For: $remote_addr
     ```
   - 또는 SSH 접속 후 Nginx 설정 파일 수정:
     ```bash
     # /usr/syno/share/nginx/conf.d/ 폴더의 해당 설정 파일에서
     # client_max_body_size 0; 추가
     ```
4. **저장** 후 Nginx 재시작

#### 5단계: 방화벽 설정

1. **제어판** → **보안** → **방화벽**
2. 포트 `443` (HTTPS) 허용 규칙 추가

### 접속 방법
- `https://cms.local` (도메인 설정 시)
- `https://synology-ip:443` (또는 설정한 포트)

---

## 방법 2: Nginx 리버스 프록시 컨테이너 사용

더 세밀한 제어가 필요하거나 여러 애플리케이션을 관리할 때 유용합니다.

### 장점
- 완전한 제어 가능
- 여러 애플리케이션 통합 관리
- 커스텀 설정 가능

### 설정 방법

#### 1단계: SSL 인증서 준비

**옵션 A: Synology 자체 서명 인증서 (내부망용)**
1. 제어판 → 보안 → 인증서
2. 자체 서명 인증서 만들기
3. 인증서 내보내기:
   ```bash
   # SSH 접속 후
   cp /usr/syno/etc/certificate/system/default/cert.pem nginx/ssl/
   cp /usr/syno/etc/certificate/system/default/privkey.pem nginx/ssl/key.pem
   ```

**옵션 B: Let's Encrypt (공인 도메인)**
1. 제어판 → 보안 → 인증서
2. Let's Encrypt 인증서 추가
3. 인증서 내보내기 후 `nginx/ssl/` 폴더에 복사

#### 2단계: Nginx 설정 파일 확인

- `nginx/nginx.conf` - 메인 설정
- `nginx/conf.d/cms.conf` - CMS 애플리케이션 설정
- `nginx/ssl/` - SSL 인증서 폴더

#### 3단계: Docker Compose 실행

```bash
# HTTPS용 docker-compose 파일 사용
docker-compose -f docker-compose.https.yml up -d --build
```

또는 기존 `docker-compose.yml`을 수정하여 Nginx 서비스 추가

#### 4단계: 접속 확인

- HTTP: `http://synology-ip` → 자동으로 HTTPS로 리다이렉트
- HTTPS: `https://synology-ip` 또는 `https://cms.local`

---

## 방법 3: 애플리케이션 내부 HTTPS (권장하지 않음)

애플리케이션 자체에서 HTTPS를 처리하는 방법입니다. 리버스 프록시 사용을 권장합니다.

---

## 프록시 헤더 처리

리버스 프록시를 사용할 때는 애플리케이션이 프록시 헤더를 올바르게 처리해야 합니다.

### SvelteKit 자동 처리

SvelteKit은 기본적으로 다음 환경 변수를 통해 프록시 헤더를 처리합니다:
- `TRUST_PROXY=true` (docker-compose에 이미 설정됨)

### hooks.server.ts 확인

`src/hooks.server.ts`에서 프록시 헤더를 올바르게 처리하는지 확인하세요. 현재 설정은 프록시 환경에서 잘 작동합니다.

---

## 보안 설정

### HTTPS 강제 리다이렉트

Nginx 설정에서 HTTP → HTTPS 자동 리다이렉트가 포함되어 있습니다.

### 보안 헤더

Nginx 설정에 다음 보안 헤더가 포함되어 있습니다:
- `Strict-Transport-Security`: HSTS 설정
- `X-Frame-Options`: 클릭재킹 방지
- `X-Content-Type-Options`: MIME 타입 스니핑 방지
- `X-XSS-Protection`: XSS 공격 방지

### 쿠키 보안

HTTPS 사용 시 쿠키에 `Secure` 플래그를 추가하는 것을 권장합니다:
```typescript
// hooks.server.ts에서
event.cookies.set('auth-token', token, {
  path: '/',
  httpOnly: true,
  secure: true,  // HTTPS에서만 전송
  sameSite: 'strict'
});
```

---

## 문제 해결

### 인증서 오류

**자체 서명 인증서 사용 시:**
- 브라우저에서 "고급" → "안전하지 않음으로 이동" 클릭
- 또는 신뢰할 수 있는 인증 기관에 인증서 추가

**Let's Encrypt 인증서 사용 시:**
- 도메인이 공인 DNS에 등록되어 있는지 확인
- 포트 80이 열려있는지 확인 (인증용)

### 프록시 헤더 문제

애플리케이션에서 클라이언트 IP가 올바르게 표시되지 않으면:
1. `TRUST_PROXY=true` 환경 변수 확인
2. Nginx의 `X-Forwarded-For` 헤더 설정 확인
3. `hooks.server.ts`에서 `event.getClientAddress()` 사용 확인

### WebSocket 연결 문제

WebSocket이 작동하지 않으면:
1. Nginx 설정에서 `Upgrade` 및 `Connection` 헤더 확인
2. Synology Reverse Proxy에서 "웹소켓 활성화" 확인

### 포트 충돌

포트가 이미 사용 중이면:
- `docker-compose.https.yml`에서 포트 번호 변경
- 또는 Synology의 다른 서비스 포트 확인

### 대용량 파일 업로드 실패

파일 업로드가 실패하거나 타임아웃이 발생하면:

**Nginx 컨테이너 사용 시:**
- `nginx/nginx.conf`와 `nginx/conf.d/cms.conf`에서 `client_max_body_size 0;` 확인
- 프록시 타임아웃이 충분한지 확인 (현재 300초로 설정됨)

**Synology Reverse Proxy 사용 시:**
- SSH 접속 후 Nginx 설정 파일 수정:
  ```bash
  # 설정 파일 위치 확인
  ls /usr/syno/share/nginx/conf.d/
  
  # 해당 파일에 client_max_body_size 0; 추가
  sudo vi /usr/syno/share/nginx/conf.d/[해당파일]
  ```
- 또는 제어판에서 고급 설정 확인

---

## 권장 설정

### 내부망 전용
- **방법**: Synology Reverse Proxy + 자체 서명 인증서
- **도메인**: `cms.local` 또는 `cms.internal`
- **장점**: 설정 간단, 추가 리소스 불필요

### 공인 도메인 사용
- **방법**: Synology Reverse Proxy + Let's Encrypt
- **도메인**: `cms.yourdomain.com`
- **장점**: 자동 인증서 갱신, 브라우저 신뢰

### 고급 사용자
- **방법**: Nginx 리버스 프록시 컨테이너
- **장점**: 완전한 제어, 커스터마이징 가능

---

## 추가 리소스

- [Synology Reverse Proxy 가이드](https://kb.synology.com/ko-kr/DSM/help/DSM/AdminCenter/application_appportalias)
- [Nginx SSL 설정 가이드](https://nginx.org/en/docs/http/configuring_https_servers.html)
- [Let's Encrypt 문서](https://letsencrypt.org/docs/)















