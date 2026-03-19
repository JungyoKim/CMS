// Docker 컨테이너 시작 시 자동으로 마이그레이션을 실행하는 스크립트
import Database from 'better-sqlite3';
import { readFileSync, readdirSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// 데이터베이스 경로 (명령줄 인자 또는 환경 변수)
const dbPath = process.argv[2] || process.env.DATABASE_URL?.replace('file:', '') || '/app/data/sqlite.db';

console.log('📦 데이터베이스 경로:', dbPath);

if (!existsSync(dbPath)) {
    console.error('❌ 데이터베이스 파일을 찾을 수 없습니다:', dbPath);
    process.exit(1);
}

const db = new Database(dbPath);

try {
    // WAL 모드 활성화
    db.pragma('journal_mode = WAL');
    
    // 마이그레이션 추적 테이블 생성
    db.exec(`
        CREATE TABLE IF NOT EXISTS __drizzle_migrations (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            hash TEXT NOT NULL,
            created_at INTEGER
        );
    `);

    // 이미 적용된 마이그레이션 가져오기
    const appliedMigrations = db
        .prepare('SELECT hash FROM __drizzle_migrations')
        .all()
        .map((row) => row.hash);

    console.log('✅ 적용된 마이그레이션:', appliedMigrations.length, '개');

    // 마이그레이션 파일 디렉토리
    const migrationsDir = join(__dirname, '../drizzle');
    
    if (!existsSync(migrationsDir)) {
        console.log('⚠️  마이그레이션 디렉토리를 찾을 수 없습니다:', migrationsDir);
        process.exit(0);
    }

    // 마이그레이션 파일 목록 가져오기 (SQL 파일만)
    const migrationFiles = readdirSync(migrationsDir)
        .filter(file => file.endsWith('.sql'))
        .sort(); // 파일명 순서대로 정렬

    console.log('📋 발견된 마이그레이션 파일:', migrationFiles.length, '개');

    let appliedCount = 0;

    // 각 마이그레이션 파일 실행
    for (const file of migrationFiles) {
        const filePath = join(migrationsDir, file);
        const migrationHash = file.replace('.sql', '');

        // 이미 적용된 마이그레이션은 건너뛰기
        if (appliedMigrations.includes(migrationHash)) {
            console.log(`⏭️  건너뛰기: ${file} (이미 적용됨)`);
            continue;
        }

        console.log(`🔄 실행 중: ${file}`);

        try {
            // SQL 파일 읽기
            const sql = readFileSync(filePath, 'utf-8');

            // SQL 실행 (여러 문장일 수 있으므로 분리)
            const statements = sql
                .split(';')
                .map(s => s.trim())
                .filter(s => s.length > 0 && !s.startsWith('--'));

            for (const statement of statements) {
                if (statement) {
                    db.exec(statement);
                }
            }

            // 마이그레이션 기록
            db.prepare(
                'INSERT INTO __drizzle_migrations (hash, created_at) VALUES (?, ?)'
            ).run(migrationHash, Date.now());

            console.log(`✅ 완료: ${file}`);
            appliedCount++;
        } catch (error) {
            // 테이블이 이미 존재하는 등의 오류는 무시
            const errorMessage = error instanceof Error ? error.message : String(error);
            if (errorMessage.includes('already exists') || 
                errorMessage.includes('duplicate column') ||
                errorMessage.includes('no such table')) {
                console.log(`⚠️  경고 (무시됨): ${file} - ${errorMessage}`);
                // 마이그레이션 기록만 추가
                try {
                    db.prepare(
                        'INSERT OR IGNORE INTO __drizzle_migrations (hash, created_at) VALUES (?, ?)'
                    ).run(migrationHash, Date.now());
                } catch (e) {
                    // 이미 기록되어 있으면 무시
                }
            } else {
                const errorMessage = error instanceof Error ? error.message : String(error);
                console.error(`❌ 오류: ${file} - ${errorMessage}`);
                throw error;
            }
        }
    }

    if (appliedCount > 0) {
        console.log(`✨ ${appliedCount}개의 마이그레이션이 적용되었습니다.`);
    } else {
        console.log('✨ 모든 마이그레이션이 이미 적용되어 있습니다.');
    }
} catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error('❌ 마이그레이션 실행 중 오류:', errorMessage);
    process.exit(1);
} finally {
    db.close();
}

