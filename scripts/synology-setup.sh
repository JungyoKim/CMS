#!/bin/bash

# Synology Docker 배포 자동화 스크립트
# 사용법: ./synology-setup.sh

set -e

echo "🚀 Synology CMS Docker 배포 스크립트"
echo "======================================"

# 경로 설정 (필요에 따라 수정)
CMS_DIR="/volume1/docker/cms"
DATA_DIR="$CMS_DIR/data"
UPLOADS_DIR="$CMS_DIR/uploads"

# 디렉토리 생성
echo "📁 디렉토리 생성 중..."
mkdir -p "$DATA_DIR"
mkdir -p "$UPLOADS_DIR"

# 권한 설정
echo "🔐 권한 설정 중..."
chown -R 1000:1000 "$DATA_DIR"
chown -R 1000:1000 "$UPLOADS_DIR"
chmod -R 755 "$DATA_DIR"
chmod -R 755 "$UPLOADS_DIR"

# 데이터베이스 파일 확인
if [ ! -f "$DATA_DIR/sqlite.db" ]; then
    echo "⚠️  경고: $DATA_DIR/sqlite.db 파일이 없습니다."
    echo "   기존 데이터베이스 파일을 $DATA_DIR/ 디렉토리에 복사해주세요."
    read -p "계속하시겠습니까? (y/n) " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        exit 1
    fi
fi

# Docker Compose 빌드
echo "🔨 Docker 이미지 빌드 중..."
cd "$CMS_DIR"
docker-compose build

# 기존 컨테이너 중지 및 제거
echo "🛑 기존 컨테이너 중지 중..."
docker-compose down 2>/dev/null || true

# 컨테이너 시작
echo "▶️  컨테이너 시작 중..."
docker-compose up -d

# 컨테이너 상태 확인
echo "⏳ 컨테이너 시작 대기 중..."
sleep 5

# 상태 확인
if docker ps | grep -q cms; then
    echo "✅ 컨테이너가 성공적으로 시작되었습니다!"
    echo ""
    echo "📊 컨테이너 상태:"
    docker ps | grep cms
    echo ""
    echo "📝 로그 확인: docker-compose logs -f"
    echo "🌐 접속 주소: http://[Synology-IP]:3000"
else
    echo "❌ 컨테이너 시작 실패"
    echo "📝 로그 확인: docker-compose logs"
    exit 1
fi

# product_inventory 테이블 확인 및 생성
echo ""
echo "🔍 데이터베이스 테이블 확인 중..."
docker exec cms node -e "
const Database = require('better-sqlite3');
const db = new Database('/app/data/sqlite.db');
try {
  const tableInfo = db.prepare(\`SELECT name FROM sqlite_master WHERE type='table' AND name='product_inventory'\`).get();
  if (tableInfo) {
    console.log('✅ product_inventory 테이블이 이미 존재합니다.');
  } else {
    console.log('📦 product_inventory 테이블 생성 중...');
    db.exec(\`
      CREATE TABLE \`product_inventory\` (
        \`INVENTORY_ID\` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
        \`product_id\` integer NOT NULL,
        \`type\` text NOT NULL,
        \`content\` text,
        \`date\` text,
        \`quantity\` integer DEFAULT 0,
        \`deleted_at\` text,
        FOREIGN KEY (\`product_id\`) REFERENCES \`products\`(\`PRODUCT_ID\`) ON UPDATE no action ON DELETE no action
      );
    \`);
    console.log('✅ product_inventory 테이블 생성 완료');
  }
} catch (error) {
  console.error('❌ 오류:', error.message);
  process.exit(1);
} finally {
  db.close();
}
" || echo "⚠️  테이블 확인 중 오류 발생 (무시 가능)"

echo ""
echo "✨ 배포 완료!"








