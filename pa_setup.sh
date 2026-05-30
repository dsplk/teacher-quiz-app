#!/bin/bash
# PythonAnywhere 一键部署脚本
# 用法: bash pa_setup.sh

set -e

echo "========================================"
echo "  刷题系统 - PythonAnywhere 部署"
echo "========================================"
echo ""

REPO_URL="https://github.com/dsplk/teacher-quiz-app.git"
PROJECT_DIR="$HOME/teacher-quiz"

# 1. Clone or pull
if [ -d "$PROJECT_DIR" ]; then
    echo "[1/4] 更新代码..."
    cd "$PROJECT_DIR" && git pull
else
    echo "[1/4] 克隆代码..."
    git clone "$REPO_URL" "$PROJECT_DIR"
    cd "$PROJECT_DIR"
fi

# 2. Python 虚拟环境
echo "[2/4] 设置 Python 环境..."
if [ ! -d "venv" ]; then
    python3 -m venv venv
fi
source venv/bin/activate
pip install -r requirements.txt --quiet

# 3. 构建前端
echo "[3/4] 构建前端..."
cd frontend
if ! command -v node &> /dev/null; then
    # PA 上 Node 可能不在 PATH，用预构建的版本
    echo "Node.js 未找到，尝试使用 npm..."
    npm install --silent && npx vite build --silent
else
    npm install --silent && npx vite build --silent
fi
cd ..

# 4. 创建 WSGI 配置
echo "[4/4] 配置 WSGI..."
WSGI_FILE="/var/www/dsplk_pythonanywhere_com_wsgi.py"
cat > /tmp/wsgi_config.py << 'WSGIPYTHON'
import sys
path = '/home/dsplk/teacher-quiz'
if path not in sys.path:
    sys.path.append(path)

# Suppress Flask reloader in production
import os
os.environ['WERKZEUG_RUN_MAIN'] = 'true'

from app import app as application
WSGIPYTHON

if [ -f "$WSGI_FILE" ]; then
    cp "$WSGI_FILE" "${WSGI_FILE}.bak" 2>/dev/null || true
fi
sudo cp /tmp/wsgi_config.py "$WSGI_FILE" 2>/dev/null || {
    echo ""
    echo "=========================================="
    echo "  ⚠️  无法自动写入 WSGI 配置"
    echo "=========================================="
    echo "请手动操作:"
    echo ""
    echo "1. 打开 Web 页面 → Code → WSGI configuration file"
    echo "2. 全部替换为以下内容:"
    echo ""
    echo "----------------------------------------"
    cat /tmp/wsgi_config.py
    echo "----------------------------------------"
    echo ""
    echo "3. 在 Web 页面设置 Static Files:"
    echo "   URL: /assets/"
    echo "   Directory: /home/dsplk/teacher-quiz/frontend/dist/assets/"
    echo ""
    echo "4. 点击 Reload 按钮"
    echo "=========================================="
}

echo ""
echo "✅ 部署完成！"
echo ""
echo "访问: https://dsplk.pythonanywhere.com"
