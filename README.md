# 现代博客系统

基于 Cloudflare 全家桶构建的现代化博客系统，简约美观，功能完整。

## 技术栈

- **前端**: React 18 + TypeScript + Tailwind CSS + Vite
- **后端**: Cloudflare Workers (Serverless API)
- **数据库**: Cloudflare D1 (SQLite)
- **存储**: Cloudflare R2 (对象存储)
- **部署**: Cloudflare Pages + GitHub Actions

## 功能特性

- 用户系统：邮箱注册登录，角色管理（管理员/普通用户）
- 博客管理：Markdown 编辑器，实时预览，代码高亮
- 分类系统：多级分类，标签支持
- 评论系统：嵌套评论，实时互动
- 全文搜索：基于 SQLite FTS5 的高性能搜索
- 响应式设计：完美适配移动端和桌面端
- 夜间模式：自动切换深色主题
- 性能优化：全球 CDN 加速，毫秒级响应

## 快速开始

### 前置要求

- Node.js 18+
- pnpm
- Cloudflare 账户
- Wrangler CLI

### 安装

```bash
# 克隆仓库
git clone https://github.com/your-username/cloudflare-blog.git
cd cloudflare-blog

# 安装依赖
pnpm install

# 安装 Wrangler CLI
npm install -g wrangler

# 登录 Cloudflare
wrangler login
```

### 配置

1. 创建 Cloudflare D1 数据库：

```bash
# 运行数据库初始化脚本
bash scripts/init-db.sh dev
```

2. 创建 Cloudflare R2 存储桶：

```bash
wrangler r2 bucket create blog-uploads
```

3. 更新 `wrangler.toml` 中的配置（填入实际的 database_id）

4. 复制环境变量配置：

```bash
cp .env.example .env
```

### 本地开发

```bash
# 终端 1: 启动 API 服务器
wrangler dev workers/api/index.ts --port 8787

# 终端 2: 启动前端开发服务器
pnpm dev
```

访问 http://localhost:5173

### 部署

```bash
# 使用自动化部署脚本
bash scripts/deploy.sh production

# 或手动部署
pnpm build
wrangler deploy workers/api/index.ts --env production
wrangler pages deploy dist --project-name=blog-frontend
```

详细部署指南请查看 [DEPLOYMENT.md](docs/DEPLOYMENT.md)

## 项目结构

```
cloudflare-blog/
├── src/                    # 前端源代码
│   ├── components/         # React 组件
│   ├── pages/              # 页面组件
│   ├── lib/                # 工具库（API 客户端）
│   ├── store/              # 状态管理（Zustand）
│   └── App.tsx             # 主应用
├── workers/                # Cloudflare Workers
│   └── api/                # API 代码
├── database/               # 数据库架构
├── scripts/                # 自动化脚本
├── docs/                   # 文档
└── public/                 # 静态资源
```

## 开发指南

### API 路由

- `POST /api/auth/register` - 用户注册
- `POST /api/auth/login` - 用户登录
- `POST /api/auth/logout` - 用户登出
- `GET /api/auth/me` - 获取当前用户
- `GET /api/posts` - 获取文章列表
- `GET /api/posts/:id` - 获取文章详情
- `POST /api/posts` - 创建文章
- `PUT /api/posts/:id` - 更新文章
- `DELETE /api/posts/:id` - 删除文章
- `GET /api/comments?postId=:id` - 获取评论列表
- `POST /api/comments` - 创建评论
- `DELETE /api/comments/:id` - 删除评论
- `GET /api/categories` - 获取分类列表
- `GET /api/tags` - 获取标签列表
- `GET /api/search?q=:query` - 搜索文章
- `POST /api/upload` - 上传文件

### 数据库架构

主要数据表：

- `users` - 用户表
- `posts` - 文章表
- `categories` - 分类表
- `tags` - 标签表
- `comments` - 评论表
- `sessions` - 会话表
- `posts_fts` - 全文搜索索引

详细架构请查看 `database/schema.sql`

## 常见问题

### API 请求失败

确保 `VITE_API_URL` 环境变量配置正确，并且 Workers 服务已启动。

### 数据库错误

确认 D1 数据库已创建并执行了 schema.sql。

### 图片上传失败

确认 R2 存储桶已创建并启用公共访问。

更多故障排查请查看 [DEPLOYMENT.md](docs/DEPLOYMENT.md)

## 性能指标

- 首屏加载：< 1s
- API 响应时间：< 100ms
- 全文搜索：< 50ms
- 全球 CDN：150+ 节点

## 安全特性

- JWT 会话管理
- 密码哈希存储
- SQL 注入防护
- XSS 防护
- CSRF 防护
- HTTPS 强制

## 路线图

- 草稿自动保存
- 文章定时发布
- 多语言支持
- SEO 优化
- 社交媒体分享
- RSS 订阅
- 邮件通知
- 数据分析

## 贡献

欢迎提交 Issue 和 Pull Request！

## 许可证

MIT License

## 致谢

感谢所有开源项目和贡献者。
