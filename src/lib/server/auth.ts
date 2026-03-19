import { SignJWT, jwtVerify } from 'jose';
import { env } from '$env/dynamic/private';
import { building } from '$app/environment';

if (!building && !env.JWT_SECRET) {
	throw new Error('JWT_SECRET 환경변수가 설정되지 않았습니다. .env 파일 또는 환경변수에 JWT_SECRET을 설정해주세요.');
}

const SECRET_KEY = env.JWT_SECRET ?? '';

// JWT 시크릿 키 생성 (32바이트)
const secret = new TextEncoder().encode(SECRET_KEY);

// JWT 토큰 만료 시간: 7일 (쿠키와 동일하게 고정)
const TOKEN_EXPIRATION = '7d';

// JWT 토큰 생성
export async function createToken(payload: { userId: string }): Promise<string> {
	const token = await new SignJWT(payload)
		.setProtectedHeader({ alg: 'HS256' })
		.setIssuedAt()
		.setExpirationTime(TOKEN_EXPIRATION)
		.sign(secret);
	
	return token;
}

// JWT 토큰 검증
export async function verifyToken(token: string): Promise<{ userId: string } | null> {
	try {
		const { payload } = await jwtVerify(token, secret);
		return payload as { userId: string };
	} catch (error) {
		return null;
	}
}
