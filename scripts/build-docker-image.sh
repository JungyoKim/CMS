#!/bin/bash

# CMS Docker 이미지를 cms:latest로 빌드하는 스크립트

set -e

echo "🔨 CMS Docker 이미지 빌드 중..."
echo "이미지 이름: cms:latest"
echo ""

# 현재 디렉토리 확인
if [ ! -f "Dockerfile" ]; then
    echo "❌ 오류: Dockerfile을 찾을 수 없습니다."
    echo "프로젝트 루트 디렉토리에서 실행해주세요."
    exit 1
fi

# Docker 이미지 빌드
docker build -t cms:latest .

echo ""
echo "✅ 빌드 완료!"
echo ""
echo "📋 이미지 확인:"
docker images cms:latest

echo ""
echo "🚀 실행 방법:"
echo "  docker run --rm -p 3000:3000 \\"
echo "    -v ./data:/app/data \\"
echo "    -v ./uploads:/app/uploads \\"
echo "    -e DATABASE_URL=/app/data/sqlite.db \\"
echo "    cms:latest"
echo ""
echo "또는 docker-compose 사용:"
echo "  docker-compose up -d"








