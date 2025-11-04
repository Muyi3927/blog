# Cloudflare 博客系统 - 完整部署指南

## 项目简介

这是一个基于 Cloudflare 全家桶构建的现代化博客系统，具有以下特点：

- **前端**: React + TypeScript + Tailwind CSS
- **后端**: Cloudflare Workers (Serverless API)
- **数据库**: Cloudflare D1 (SQLite)
- **存储**: Cloudflare R2 (对象存储)
- **部署**: Cloudflare Pages + GitHub 集成

## 功能特性

- 用户注册登录系统
- 角色管理（管理员/普通用户）
- Markdown 文章编写和预览
- 文章分类和标签系统
- 全文搜索功能
- 评论和回复系统
- 响应式设计 + 夜间模式
- 代码高亮显示

## 前置要求

1. Node.js 18+ 和 pnpm
2. Cloudflare 账户
3. GitHub 账户（用于自动部署）
4. Wrangler CLI（Cloudflare 命令行工具）

## 第一步：安装依赖

```bash
# 安装项目依赖
pnpm install

# 全局安装 Wrangler CLI
npm install -g wrangler

# 登录 Cloudflare
wrangler login
```

## 第二步：创建 Cloudflare D1 数据库

```bash
# 创建开发数据库
wrangler d1 create blog-database

# 创建生产数据库
wrangler d1 create blog-database-production

# 记录输出的 database_id，更新到 wrangler.toml
```

执行数据库迁移：

```bash
# 开发环境
wrangler d1 execute blog-database --file=./database/schema.sql

# 生产环境
wrangler d1 execute blog-database-production --file=./database/schema.sql --remote
```

## 第三步：创建 Cloudflare R2 存储桶

```bash
# 创建 R2 存储桶
wrangler r2 bucket create blog-uploads

# 生产环境
wrangler r2 bucket create blog-uploads-production
```

配置 R2 公共访问（用于图片访问）：

1. 登录 Cloudflare Dashboard
2. 进入 R2 > blog-uploads
3. 设置 > 公共访问 > 启用
4. 记录公共 URL，更新到 `workers/api/index.ts` 的上传函数

## 第四步：配置 wrangler.toml

编辑 `wrangler.toml`，填入实际的 `database_id`：

```toml
[[d1_databases]]
binding = "DB"
database_name = "blog-database"
database_id = "your-actual-database-id"

[[r2_buckets]]
binding = "BLOG_BUCKET"
bucket_name = "blog-uploads"
```

## 第五步：本地开发

```bash
# 启动 Workers 开发服务器（API）
wrangler dev workers/api/index.ts --port 8787

# 新开一个终端，启动前端开发服务器
pnpm dev
```

访问 `http://localhost:5173` 查看网站。

## 第六步：部署 Workers API

```bash
# 部署到生产环境
wrangler deploy workers/api/index.ts --env production

# 记录输出的 Workers URL，例如：
# https://blog-api-production.your-subdomain.workers.dev
```

## 第七步：部署前端到 Cloudflare Pages

### 方式一：通过 Cloudflare Dashboard（推荐）

1. 将代码推送到 GitHub 仓库

```bash
git init
git add .
git commit -m "Initial commit"
git remote add origin https://github.com/your-username/your-repo.git
git push -u origin main
```

2. 登录 Cloudflare Dashboard
3. Pages > 创建项目 > 连接 GitHub
4. 选择你的仓库
5. 配置构建设置：
   - **构建命令**: `pnpm build`
   - **构建输出目录**: `dist`
   - **环境变量**: 
     - `VITE_API_URL`: 你的 Workers URL（第六步记录的）
6. 点击 "保存并部署"

### 方式二：使用 Wrangler CLI

```bash
# 构建前端
pnpm build

# 部署到 Pages
wrangler pages deploy dist --project-name=blog-frontend
```

## 第八步：配置自定义域名（可选）

1. 在 Cloudflare Dashboard 中：
   - **Pages**: 设置 > 自定义域 > 添加域名
   - **Workers**: 设置 > 触发器 > 自定义域 > 添加路由
2. 更新前端环境变量 `VITE_API_URL` 为自定义 API 域名
3. 重新部署前端

## 第九步：创建初始管理员账户

1. 访问已部署的网站
2. 注册一个新账户
3. 通过 Wrangler 直接修改数据库，将用户角色设置为 admin：

```bash
# 查询用户 ID
wrangler d1 execute blog-database-production --command="SELECT id, email FROM users" --remote

# 将用户设置为管理员（替换 USER_ID 为实际 ID）
wrangler d1 execute blog-database-production --command="UPDATE users SET role='admin' WHERE id=USER_ID" --remote
```

## 项目结构

```
cloudflare-blog/
├── src/                    # 前端源代码
│   ├── components/         # React 组件
│   ├── pages/              # 页面组件
│   ├── lib/                # 工具库（API 客户端等）
│   ├── store/              # 状态管理（Zustand）
│   └── App.tsx             # 主应用组件
├── workers/                # Cloudflare Workers
│   └── api/                # API 代码
│       └── index.ts        # Workers 入口文件
├── database/               # 数据库相关
│   └── schema.sql          # 数据库架构
├── public/                 # 静态资源
├── wrangler.toml           # Cloudflare Workers 配置
├── package.json            # 项目依赖
└── docs/                   # 文档
```

## 常用命令

```bash
# 本地开发
pnpm dev                    # 启动前端开发服务器
wrangler dev workers/api/index.ts  # 启动 Workers 开发服务器

# 构建
pnpm build                  # 构建前端

# 数据库操作
wrangler d1 execute blog-database --command="SELECT * FROM users"  # 查询数据
wrangler d1 execute blog-database --file=./database/schema.sql     # 执行 SQL 文件

# 部署
wrangler deploy workers/api/index.ts  # 部署 Workers
wrangler pages deploy dist            # 部署 Pages

# 查看日志
wrangler tail                         # 实时查看 Workers 日志
```

## 环境变量配置

创建 `.env` 文件（已在 `.gitignore` 中）：

```env
VITE_API_URL=https://your-workers-url.workers.dev
```

生产环境在 Cloudflare Pages 设置中配置环境变量。

## 安全建议

1. **修改 JWT_SECRET**: 在 `wrangler.toml` 中设置强密码
2. **启用 HTTPS**: Cloudflare 自动提供
3. **配置 CORS**: 在生产环境限制允许的来源
4. **定期备份**: 导出 D1 数据库
5. **密码安全**: 生产环境建议使用更强的密码哈希算法（如 bcrypt）

## 数据库备份

```bash
# 导出数据库
wrangler d1 export blog-database-production --output=backup.sql --remote

# 导入数据库
wrangler d1 execute blog-database-production --file=backup.sql --remote
```

## 故障排查

### API 请求失败

1. 检查 `VITE_API_URL` 是否正确配置
2. 检查 Workers 是否成功部署
3. 查看 Workers 日志：`wrangler tail`
4. 检查 CORS 配置

### 数据库错误

1. 确认 D1 数据库已创建并迁移
2. 检查 `wrangler.toml` 中的 `database_id` 是否正确
3. 验证 SQL 语法

### 图片上传失败

1. 确认 R2 存储桶已创建
2. 检查公共访问是否启用
3. 更新 `workers/api/index.ts` 中的 R2 URL

## 性能优化

1. **启用缓存**: 配置 Cloudflare 缓存规则
2. **图片优化**: 使用 Cloudflare Images（可选）
3. **CDN 加速**: Cloudflare 自动提供全球 CDN
4. **代码分割**: React 已配置动态导入

## 监控和分析

1. Cloudflare Dashboard > Analytics
2. Workers > Metrics（查看 API 调用统计）
3. Pages > Analytics（查看访问统计）

## 升级和维护

```bash
# 更新依赖
pnpm update

# 更新 Wrangler
npm update -g wrangler

# 数据库迁移（添加新字段等）
wrangler d1 execute blog-database-production --file=./database/migration.sql --remote
```

## 贡献指南

1. Fork 项目
2. 创建特性分支：`git checkout -b feature/new-feature`
3. 提交更改：`git commit -m 'Add new feature'`
4. 推送到分支：`git push origin feature/new-feature`
5. 提交 Pull Request

## 许可证

MIT License

## 技术支持

如有问题，请通过以下方式联系：

- GitHub Issues
- 邮箱：your-email@example.com

## 鸣谢

- Cloudflare Workers & Pages
- React & Vite
- TailwindCSS
- 所有开源贡献者
