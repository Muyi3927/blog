# 本地测试环境搭建指南

## 目标

在本地环境搭建完整的博客系统，用于开发和测试，无需依赖 Cloudflare 在线服务。

## 方式一：使用 Wrangler 本地开发环境（推荐）

### 1. 安装依赖

```bash
cd /workspace/cloudflare-blog

# 安装项目依赖
pnpm install

# 全局安装 Wrangler CLI
npm install -g wrangler
```

### 2. 创建本地数据库

```bash
# 创建本地 D1 数据库
wrangler d1 create blog-database-local --local

# 执行数据库架构
wrangler d1 execute blog-database-local --file=./database/schema.sql --local
```

### 3. 配置环境

编辑 `wrangler.toml`，确保有本地配置：

```toml
[[d1_databases]]
binding = "DB"
database_name = "blog-database-local"
database_id = "local-db"  # 本地开发时可以是任意值
```

### 4. 启动服务

**终端 1 - 启动 Workers 开发服务器：**
```bash
wrangler dev workers/api/index.ts --local --port 8787
```

参数说明：
- `--local`: 使用本地模式，不连接远程服务
- `--port 8787`: 指定端口

**终端 2 - 启动前端开发服务器：**
```bash
pnpm dev
```

### 5. 访问应用

打开浏览器访问：http://localhost:5173

### 6. 查看日志

**Workers 日志：**
- 在终端 1 中自动显示

**数据库查询：**
```bash
# 查看所有用户
wrangler d1 execute blog-database-local --command="SELECT * FROM users" --local

# 查看所有文章
wrangler d1 execute blog-database-local --command="SELECT * FROM posts" --local

# 查看评论
wrangler d1 execute blog-database-local --command="SELECT * FROM comments" --local
```

### 7. 重置数据库

如果需要重置数据库：

```bash
# 删除本地数据库文件
rm -rf .wrangler/state

# 重新执行架构
wrangler d1 execute blog-database-local --file=./database/schema.sql --local
```

## 方式二：使用远程开发数据库

如果本地模式有问题，可以使用 Cloudflare 的开发数据库：

### 1. 登录 Cloudflare

```bash
wrangler login
```

### 2. 创建开发数据库

```bash
# 创建远程开发数据库
wrangler d1 create blog-database-dev

# 记录输出的 database_id
# 更新到 wrangler.toml
```

### 3. 执行数据库架构

```bash
wrangler d1 execute blog-database-dev --file=./database/schema.sql --remote
```

### 4. 启动服务

```bash
# 终端 1
wrangler dev workers/api/index.ts --remote --port 8787

# 终端 2
pnpm dev
```

## 本地测试流程

### 1. 创建测试账户

访问 http://localhost:5173/register

注册信息：
- 邮箱：test@example.com
- 用户名：testuser
- 显示名称：Test User
- 密码：test123456

### 2. 设置管理员权限

```bash
# 查看用户 ID
wrangler d1 execute blog-database-local --command="SELECT id, email, role FROM users" --local

# 设置为管理员（假设 ID 为 1）
wrangler d1 execute blog-database-local --command="UPDATE users SET role='admin' WHERE id=1" --local
```

### 3. 测试核心功能

#### 3.1 测试登录
1. 访问 http://localhost:5173/login
2. 输入注册的邮箱和密码
3. 验证登录成功

#### 3.2 测试创建文章
1. 点击"写文章"
2. 填写：
   ```
   标题：本地测试文章
   内容：
   # 标题
   
   这是测试内容。
   
   ## 代码示例
   
   ```javascript
   console.log('Hello World');
   ```
   
   摘要：测试摘要
   ```
3. 选择分类：技术
4. 选择标签：JavaScript
5. 状态：已发布
6. 点击保存

#### 3.3 测试评论
1. 访问刚创建的文章详情页
2. 在评论区输入：这是测试评论
3. 点击发表评论
4. 验证评论显示

#### 3.4 测试搜索
1. 在顶部搜索框输入："测试"
2. 验证搜索结果

#### 3.5 测试分类和标签
1. 在首页侧边栏点击"技术"分类
2. 验证只显示技术类文章
3. 点击"JavaScript"标签
4. 验证只显示带该标签的文章

#### 3.6 测试深色模式
1. 点击顶部月亮图标
2. 验证切换到深色模式
3. 刷新页面，验证主题保持

### 4. 测试数据验证

查看数据库数据：

```bash
# 查看文章
wrangler d1 execute blog-database-local --command="SELECT id, title, status, view_count FROM posts" --local

# 查看评论
wrangler d1 execute blog-database-local --command="SELECT c.id, c.content, u.username FROM comments c JOIN users u ON c.user_id = u.id" --local

# 查看会话
wrangler d1 execute blog-database-local --command="SELECT id, user_id, expires_at FROM sessions" --local
```

## 调试技巧

### 1. 查看 API 请求

在浏览器开发者工具中：
1. 打开 Network 面板
2. 筛选 XHR/Fetch
3. 查看请求和响应

### 2. 查看 Workers 日志

在 Workers 开发服务器的终端中，所有 console.log 会自动显示。

添加调试日志：

```typescript
// 在 workers/api/index.ts 中
console.log('Request path:', path);
console.log('Request method:', method);
console.log('User:', user);
```

### 3. 查看前端状态

在浏览器控制台：

```javascript
// 查看当前用户
JSON.parse(localStorage.getItem('auth-storage'))

// 查看主题
JSON.parse(localStorage.getItem('theme-storage'))
```

### 4. 数据库调试

```bash
# 查看表结构
wrangler d1 execute blog-database-local --command="PRAGMA table_info(posts)" --local

# 查看所有表
wrangler d1 execute blog-database-local --command="SELECT name FROM sqlite_master WHERE type='table'" --local

# 查看索引
wrangler d1 execute blog-database-local --command="SELECT name FROM sqlite_master WHERE type='index'" --local
```

## 常见问题

### Q1: Workers 启动失败

**问题**：`Error: Cannot find module...`

**解决**：
```bash
pnpm install
wrangler --version  # 确保 wrangler 已安装
```

### Q2: 数据库连接失败

**问题**：`D1_ERROR: database not found`

**解决**：
```bash
# 重新创建数据库
wrangler d1 create blog-database-local --local
wrangler d1 execute blog-database-local --file=./database/schema.sql --local
```

### Q3: CORS 错误

**问题**：`Access-Control-Allow-Origin` 错误

**解决**：
确保 Workers 在 8787 端口运行，前端在 5173 端口。
检查 `workers/api/index.ts` 中的 CORS 配置。

### Q4: API 请求 404

**问题**：前端请求返回 404

**解决**：
1. 检查 `.env` 文件：`VITE_API_URL=http://localhost:8787`
2. 确保 Workers 服务正在运行
3. 检查 API 路由是否正确

### Q5: 密码哈希错误

**问题**：登录时密码验证失败

**说明**：密码哈希算法已升级到 PBKDF2，旧的 SHA-256 哈希仍兼容。

**解决**：
- 新注册的用户使用新算法
- 如果使用旧数据，密码验证会自动兼容

### Q6: 端口被占用

**问题**：`Port 8787 is already in use`

**解决**：
```bash
# 查找占用端口的进程
lsof -i :8787  # macOS/Linux
netstat -ano | findstr :8787  # Windows

# 或使用其他端口
wrangler dev workers/api/index.ts --local --port 8788
# 然后更新 .env: VITE_API_URL=http://localhost:8788
```

## 性能测试

### 1. 使用 Chrome DevTools

1. 打开开发者工具（F12）
2. 切换到 Performance 面板
3. 点击录制按钮
4. 执行操作（如加载首页）
5. 停止录制，查看分析结果

### 2. 使用 Lighthouse

1. 打开开发者工具
2. 切换到 Lighthouse 面板
3. 选择：Performance, Accessibility, Best Practices, SEO
4. 点击 "Generate report"
5. 查看结果和建议

### 3. 网络性能

在 Network 面板中：
- 查看总加载时间
- 查看资源大小
- 查看 API 响应时间

目标：
- 首页加载 < 2s
- API 响应 < 500ms
- 资源总大小 < 2MB

## 测试数据生成

### 创建测试数据脚本

创建 `scripts/seed-test-data.sql`：

```sql
-- 创建多个测试用户
INSERT INTO users (email, password_hash, username, display_name, role) VALUES
('admin@test.com', 'hash1', 'admin', 'Admin User', 'admin'),
('user1@test.com', 'hash2', 'user1', 'User One', 'user'),
('user2@test.com', 'hash3', 'user2', 'User Two', 'user');

-- 创建多篇测试文章
INSERT INTO posts (title, slug, content, excerpt, author_id, status, published_at) VALUES
('React 入门教程', 'react-tutorial', '# React 教程内容...', 'React 基础教程', 1, 'published', CURRENT_TIMESTAMP),
('TypeScript 最佳实践', 'typescript-best-practices', '# TypeScript 内容...', 'TS 实践指南', 1, 'published', CURRENT_TIMESTAMP),
('Cloudflare Workers 指南', 'cloudflare-workers-guide', '# Workers 内容...', 'Workers 使用指南', 2, 'published', CURRENT_TIMESTAMP);

-- 关联分类和标签
INSERT INTO post_categories (post_id, category_id) VALUES (1, 1), (2, 1), (3, 1);
INSERT INTO post_tags (post_id, tag_id) VALUES (1, 3), (2, 2), (3, 4);

-- 创建测试评论
INSERT INTO comments (post_id, user_id, content) VALUES
(1, 2, '很好的教程！'),
(1, 3, '感谢分享'),
(2, 3, '学到了很多');
```

执行测试数据：

```bash
wrangler d1 execute blog-database-local --file=./scripts/seed-test-data.sql --local
```

## 清理测试环境

### 清理本地数据

```bash
# 清理 Wrangler 缓存
rm -rf .wrangler

# 清理构建产物
rm -rf dist

# 清理依赖（可选）
rm -rf node_modules
pnpm install
```

### 重置数据库

```bash
# 重新执行架构（会清空所有数据）
wrangler d1 execute blog-database-local --file=./database/schema.sql --local
```

## 下一步

测试完成后：
1. 查看 [TEST_PLAN.md](TEST_PLAN.md) 进行完整测试
2. 参考 [DEPLOYMENT.md](DEPLOYMENT.md) 部署到生产环境
3. 使用 [QUICKSTART.md](QUICKSTART.md) 快速上手指南
