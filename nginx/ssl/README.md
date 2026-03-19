# SSL 인증서 설정 가이드

이 폴더에 SSL 인증서 파일을 배치하세요.

## 방법 1: Synology 자체 서명 인증서 사용 (내부망용)

1. Synology 제어판 → 보안 → 인증서
2. "추가" → "자체 서명 인증서 만들기"
3. 인증서 내보내기:
   - 인증서 파일: `cert.pem`
   - 개인 키 파일: `key.pem`
4. 이 폴더에 복사:
   ```bash
   cp cert.pem nginx/ssl/
   cp key.pem nginx/ssl/
   ```

## 방법 2: Let's Encrypt 인증서 사용 (공인 도메인 필요)

1. Synology 제어판 → 보안 → 인증서
2. "추가" → "Let's Encrypt 인증서 추가"
3. 도메인 설정 및 인증 완료
4. 인증서 내보내기:
   - 인증서 파일: `fullchain.pem`
   - 개인 키 파일: `privkey.pem`
5. `nginx/conf.d/cms.conf`에서 주석 처리된 Let's Encrypt 설정 사용

## 방법 3: 기존 인증서 사용

기존 인증서가 있다면:
- 인증서 파일: `cert.pem` 또는 `fullchain.pem`
- 개인 키 파일: `key.pem` 또는 `privkey.pem`

이 폴더에 복사하고 `nginx/conf.d/cms.conf`에서 경로 확인

## 파일 권한 설정

```bash
chmod 600 nginx/ssl/*.pem
chmod 600 nginx/ssl/*.key
```

## 주의사항

- **절대 이 폴더를 Git에 커밋하지 마세요!**
- 개인 키 파일은 보안이 중요합니다
- `.gitignore`에 `nginx/ssl/` 추가 권장















