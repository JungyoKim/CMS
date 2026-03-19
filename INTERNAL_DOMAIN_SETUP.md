# 내부망 도메인 설정 가이드

이 문서는 CMS 애플리케이션을 내부망에서 도메인으로 접근할 수 있도록 설정하는 방법을 설명합니다.

## 현재 설정 상태

- **프레임워크**: SvelteKit
- **어댑터**: @sveltejs/adapter-node
- **개발 서버**: Vite (포트 5173)
- **호스트 설정**: `0.0.0.0` (모든 네트워크 인터페이스에서 접근 가능)

## 방법 1: Windows hosts 파일 사용 (가장 간단)

### 서버 측 설정
1. 서버의 IP 주소 확인:
   ```powershell
   ipconfig
   ```
   예: `192.168.1.100`

2. `vite.config.ts`는 이미 `host: '0.0.0.0'`으로 설정되어 있어 추가 설정 불필요

### 클라이언트 측 설정
각 클라이언트 PC에서 다음 작업 수행:

1. 관리자 권한으로 메모장 실행
2. `C:\Windows\System32\drivers\etc\hosts` 파일 열기
3. 파일 끝에 다음 줄 추가:
   ```
   192.168.1.100    cms.local
   192.168.1.100    cms.internal
   ```
   (IP 주소는 실제 서버 IP로 변경)

4. 파일 저장
5. 브라우저에서 `http://cms.local:5173` 접속

### 장점
- 설정이 간단함
- 추가 소프트웨어 불필요
- 즉시 적용 가능

### 단점
- 각 클라이언트마다 수동 설정 필요
- IP 변경 시 모든 클라이언트 수정 필요

## 방법 2: 로컬 DNS 서버 사용 (중규모 환경)

### Windows Server DNS 사용
1. Windows Server의 DNS 관리자 열기
2. 정방향 조회 영역 생성 (예: `internal.local`)
3. A 레코드 추가:
   - 이름: `cms`
   - IP 주소: 서버 IP 주소
4. 클라이언트의 DNS 설정을 해당 DNS 서버로 변경

### 접속 방법
- `http://cms.internal.local:5173`

### 장점
- 중앙 관리 가능
- IP 변경 시 DNS만 수정하면 됨
- 많은 클라이언트 관리에 적합

### 단점
- DNS 서버 필요
- 초기 설정이 복잡함

## 방법 3: 리버스 프록시 사용 (프로덕션 권장)

### Nginx 설정 예시

```nginx
server {
    listen 80;
    server_name cms.local cms.internal;

    location / {
        proxy_pass http://localhost:5173;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}
```

### IIS 설정 (Windows Server)
1. IIS 관리자 열기
2. 사이트 추가
3. 바인딩 설정:
   - 호스트 이름: `cms.local`
   - 포트: 80
4. URL 재작성 규칙 추가하여 `http://localhost:5173`으로 프록시

### 장점
- 포트 번호 없이 접속 가능 (`http://cms.local`)
- SSL 인증서 적용 가능
- 프로덕션 환경에 적합

### 단점
- 추가 소프트웨어 설치 필요
- 설정이 복잡함

## 방법 4: 개발 환경용 간단한 설정

### vite.config.ts 수정 (포트 80 사용, 관리자 권한 필요)

```typescript
server: {
    host: '0.0.0.0',
    port: 80, // HTTP 기본 포트
    strictPort: true
}
```

**주의**: 포트 80 사용 시 관리자 권한 필요

## 추천 방법

- **개발 환경**: 방법 1 (hosts 파일)
- **소규모 팀 (5-10명)**: 방법 1 (hosts 파일)
- **중규모 환경 (10-50명)**: 방법 2 (로컬 DNS)
- **프로덕션/대규모**: 방법 3 (리버스 프록시)

## 보안 고려사항

1. **방화벽 설정**: 필요한 포트만 열기
2. **인증**: 내부망이라도 인증 시스템 구현 권장
3. **HTTPS**: 민감한 데이터가 있다면 내부 인증서 사용 고려

## 문제 해결

### 도메인으로 접속이 안 될 때
1. hosts 파일이 제대로 저장되었는지 확인
2. DNS 캐시 삭제:
   ```powershell
   ipconfig /flushdns
   ```
3. 브라우저 캐시 삭제
4. 서버 방화벽에서 포트가 열려있는지 확인

### 포트 접근이 안 될 때
1. Windows 방화벽 설정 확인
2. `vite.config.ts`의 `host: '0.0.0.0'` 확인
3. 서버가 실행 중인지 확인















