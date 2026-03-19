import { randomBytes, scryptSync, timingSafeEqual } from 'crypto';

const SALT_LENGTH = 16;
const KEY_LENGTH = 64;

export function hashPassword(password: string): string {
	const salt = randomBytes(SALT_LENGTH).toString('hex');
	const hash = scryptSync(password, salt, KEY_LENGTH).toString('hex');
	return `${salt}:${hash}`;
}

export function verifyPassword(password: string, stored: string): boolean {
	const [salt, hash] = stored.split(':');

	// salt:hash 형식이 아니면 레거시 평문 비밀번호
	if (!salt || !hash || stored.indexOf(':') === -1) {
		return password === stored;
	}

	const hashBuffer = Buffer.from(hash, 'hex');
	const suppliedBuffer = scryptSync(password, salt, KEY_LENGTH);
	return timingSafeEqual(hashBuffer, suppliedBuffer);
}

export function isHashed(stored: string): boolean {
	const parts = stored.split(':');
	return parts.length === 2 && parts[0].length === SALT_LENGTH * 2;
}
