#!/bin/sh
set -e

echo "🚀 CMS Docker 컨테이너 시작 중..."

# 데이터베이스 경로 설정
DB_PATH="${DATABASE_URL#file:}"
if [ -z "$DB_PATH" ]; then
    DB_PATH="/app/data/sqlite.db"
fi

echo "📦 데이터베이스 경로: $DB_PATH"

# 데이터베이스 파일이 없으면 생성
if [ ! -f "$DB_PATH" ]; then
    echo "⚠️  데이터베이스 파일이 없습니다. 새로 생성합니다."
    mkdir -p "$(dirname "$DB_PATH")"
    touch "$DB_PATH"
fi

# 마이그레이션 실행
echo "🔄 데이터베이스 마이그레이션 실행 중..."

# Node.js로 마이그레이션 실행
node /app/scripts/run-migrations.js "$DB_PATH" || {
    echo "❌ 마이그레이션 실행 실패"
    exit 1
}

echo "✅ 마이그레이션 완료"

# 애플리케이션 시작
echo "▶️  애플리케이션 시작 중..."
exec node build








