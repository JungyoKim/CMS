import Database from 'better-sqlite3';
import { scryptSync, randomBytes } from 'crypto';
import { readFileSync } from 'fs';
import { resolve } from 'path';

/**
 * E2E 테스트 전 비밀번호를 '1234'로 초기화
 */
export default function globalSetup() {
	// .env에서 DATABASE_URL 읽기
	const envPath = resolve(process.cwd(), '.env');
	const envContent = readFileSync(envPath, 'utf-8');
	const match = envContent.match(/^DATABASE_URL=(.+)$/m);
	const dbPath = match?.[1]?.trim();

	if (!dbPath) {
		throw new Error('DATABASE_URL not found in .env');
	}

	const db = new Database(dbPath);
	db.pragma('foreign_keys = ON');

	// 비밀번호를 '1234'로 해싱하여 저장
	const salt = randomBytes(16).toString('hex');
	const hash = scryptSync('1234', salt, 64).toString('hex');
	const hashedPassword = `${salt}:${hash}`;

	const existing = db.prepare('SELECT PW_ID FROM passwords LIMIT 1').get() as any;
	if (existing) {
		db.prepare('UPDATE passwords SET password = ? WHERE PW_ID = ?').run(hashedPassword, existing.PW_ID);
	} else {
		db.prepare('INSERT INTO passwords (password) VALUES (?)').run(hashedPassword);
	}

	db.close();
	console.log('E2E setup: 비밀번호를 1234로 초기화했습니다.');
}
