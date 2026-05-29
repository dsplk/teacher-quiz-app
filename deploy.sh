#!/bin/bash
# 深圳教师招聘刷题系统 - 一键部署脚本
# 部署到 Render (render.com)

set -e

echo "=========================================="
echo "  深圳教师招聘刷题系统 - 部署工具"
echo "=========================================="
echo ""

# 1. 检查 git
if ! command -v git &> /dev/null; then
    echo "❌ 未安装 git，请先安装: https://git-scm.com/downloads"
    exit 1
fi

# 2. 配置 git 用户
if ! git config user.name &> /dev/null; then
    read -p "请输入你的 GitHub 用户名: " github_user
    read -p "请输入你的 GitHub 邮箱: " github_email
    git config user.name "$github_user"
    git config user.email "$github_email"
    echo "✅ git 已配置"
fi

echo ""
echo "=========================================="
echo "  准备工作"
echo "=========================================="
echo ""
echo "在开始之前，请准备好:"
echo "  1. 一个 GitHub 账号 (github.com)"
echo "  2. 一个 Render 账号 (render.com，可以用 GitHub 登录)"
echo ""
echo "第一步：创建 GitHub Personal Access Token"
echo "  1. 打开 https://github.com/settings/tokens"
echo "  2. 点击 Generate new token → Generate new token (classic)"
echo "  3. 勾选 repo 权限"
echo "  4. 生成后复制 token"
echo ""

read -s -p "输入你的 GitHub Token (输入时不会显示): " github_token
echo ""
read -p "输入你的 GitHub 用户名: " github_user
echo ""

# 3. 在 GitHub 上创建仓库
echo "正在创建 GitHub 仓库..."
repo_name="teacher-quiz-app"
curl_resp=$(curl -s -H "Authorization: token $github_token" \
    -H "Accept: application/vnd.github.v3+json" \
    -d "{\"name\":\"$repo_name\",\"private\":false,\"description\":\"深圳教师招聘刷题系统\"}" \
    "https://api.github.com/user/repos" 2>&1)

if echo "$curl_resp" | grep -q "\"full_name\""; then
    echo "✅ GitHub 仓库创建成功: $github_user/$repo_name"
elif echo "$curl_resp" | grep -q "already exists"; then
    echo "ℹ️  仓库已存在，继续..."
else
    echo "❌ 创建失败: $(echo $curl_resp | head -c 200)"
    echo "请检查 Token 是否正确，或手动创建仓库后重新运行"
    exit 1
fi

# 4. 提交并推送代码
echo "正在提交代码..."
if [ ! -d ".git" ]; then
    git init
fi
git add -A
git commit -m "初始部署: 深圳教师招聘刷题系统" 2>/dev/null || echo "ℹ️  无新提交"

echo "正在推送到 GitHub..."
git remote remove origin 2>/dev/null || true
git remote add origin "https://$github_user:$github_token@github.com/${github_user}/${repo_name}.git"
git branch -M main
git push -u origin main --force 2>&1 | tail -5
echo "✅ 代码已推送到 GitHub"
git remote set-url origin "https://github.com/${github_user}/${repo_name}.git"

echo ""
echo "=========================================="
echo "  部署到 Render"
echo "=========================================="
echo ""
echo "最后一步：在浏览器中完成部署"
echo ""
echo "  1. 打开 https://dashboard.render.com/blueprints"
echo "  2. 点击 New Blueprint Instance"
echo "  3. 连接 GitHub 仓库: $github_user/$repo_name"
echo "  4. Render 会自动检测 render.yaml 并部署"
echo "  5. 等待 2-3 分钟部署完成"
echo ""
echo "  部署完成后，Render 会给你一个 https://xxx.onrender.com 地址"
echo "  手机浏览器打开这个地址即可刷题！"
echo ""
echo "=========================================="
