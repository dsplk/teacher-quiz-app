#!/bin/bash
cd "$(dirname "$0")"

echo "========================================="
echo "  刷题系统 - 教师招聘考试真题练习"
echo "========================================="
echo ""

# Install dependencies if needed
pip3 install -q flask flask-cors flask-sqlalchemy 2>/dev/null

# Build frontend if not already built
if [ ! -f "frontend/dist/index.html" ]; then
    echo "[构建前端]..."
    cd frontend && npx vite build --silent 2>/dev/null && cd ..
fi

# Start backend (serves both API and frontend)
echo "[启动] 后端服务..."
python3 app.py
