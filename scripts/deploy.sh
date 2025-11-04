#!/bin/bash

# Cloudflare 博客系统自动部署脚本
# 使用方法：./scripts/deploy.sh [dev|production]

set -e

ENV=${1:-production}

echo "开始部署 Cloudflare 博客系统 (环境: $ENV)"

# 颜色输出
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

# 检查依赖
echo -e "${YELLOW}检查依赖...${NC}"
if ! command -v pnpm &> /dev/null; then
    echo -e "${RED}错误: pnpm 未安装${NC}"
    exit 1
fi

if ! command -v wrangler &> /dev/null; then
    echo -e "${RED}错误: wrangler 未安装${NC}"
    echo "请运行: npm install -g wrangler"
    exit 1
fi

# 安装依赖
echo -e "${YELLOW}安装依赖...${NC}"
pnpm install

# 构建前端
echo -e "${YELLOW}构建前端...${NC}"
pnpm build

# 部署 Workers API
echo -e "${YELLOW}部署 Workers API...${NC}"
if [ "$ENV" = "production" ]; then
    wrangler deploy workers/api/index.ts --env production
else
    wrangler deploy workers/api/index.ts
fi

# 获取 Workers URL
echo -e "${YELLOW}获取 Workers URL...${NC}"
WORKERS_URL=$(wrangler deployments list --name blog-api-$ENV 2>/dev/null | grep -oP 'https://[^\s]+' | head -1)

if [ -z "$WORKERS_URL" ]; then
    echo -e "${RED}警告: 无法自动获取 Workers URL${NC}"
    echo "请手动设置 VITE_API_URL 环境变量"
else
    echo -e "${GREEN}Workers URL: $WORKERS_URL${NC}"
fi

# 部署前端到 Pages
echo -e "${YELLOW}部署前端到 Cloudflare Pages...${NC}"
if [ "$ENV" = "production" ]; then
    wrangler pages deploy dist --project-name=blog-frontend --branch=main
else
    wrangler pages deploy dist --project-name=blog-frontend --branch=dev
fi

echo -e "${GREEN}部署完成！${NC}"
echo ""
echo "后续步骤："
echo "1. 在 Cloudflare Pages 设置中配置环境变量 VITE_API_URL"
echo "2. 访问您的网站并测试功能"
echo "3. 创建初始管理员账户"
