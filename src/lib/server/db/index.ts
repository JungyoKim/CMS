import { drizzle } from 'drizzle-orm/better-sqlite3';
import Database from 'better-sqlite3';
import * as schema from './schema';
import { env } from '$env/dynamic/private';

if (!env.DATABASE_URL) throw new Error('DATABASE_URL is not set');

const client = new Database(env.DATABASE_URL);

// SQLite 외래 키 제약 조건 강제 활성화
client.pragma('foreign_keys = ON');

// WAL 모드 활성화 (성능 및 동시성 향상)
client.pragma('journal_mode = WAL');

export const db = drizzle(client, { schema });
