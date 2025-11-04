#!/bin/bash

# 数据库初始化脚本

set -e

ENV=${1:-dev}

echo "初始化 Cloudflare D1 数据库 (环境: $ENV)"

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

# 检查 wrangler
if ! command -v wrangler &> /dev/null; then
    echo -e "${RED}错误: wrangler 未安装${NC}"
    exit 1
fi

# 创建数据库
echo -e "${YELLOW}创建数据库...${NC}"
if [ "$ENV" = "production" ]; then
    echo "生产环境数据库创建（如果已存在会跳过）"
    wrangler d1 create blog-database-production || true
else
    echo "开发环境数据库创建（如果已存在会跳过）"
    wrangler d1 create blog-database || true
fi

# 执行 schema
echo -e "${YELLOW}执行数据库架构...${NC}"
if [ "$ENV" = "production" ]; then
    wrangler d1 execute blog-database-production --file=./database/schema.sql --remote
else
    wrangler d1 execute blog-database --file=./database/schema.sql
fi

echo -e "${GREEN}数据库初始化完成！${NC}"
echo ""
echo "请记录 database_id 并更新到 wrangler.toml"
