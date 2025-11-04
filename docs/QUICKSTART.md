# Cloudflare 博客系统 - 快速入门

## 5分钟快速体验

### 1. 克隆和安装

```bash
git clone https://github.com/your-username/cloudflare-blog.git
cd cloudflare-blog
pnpm install
npm install -g wrangler
```

### 2. 登录 Cloudflare

```bash
wrangler login
```

### 3. 创建数据库

```bash
# 创建 D1 数据库
wrangler d1 create blog-database

# 记录输出的 database_id，例如：
# database_id = "xxxx-xxxx-xxxx-xxxx"
```

### 4. 更新配置

编辑 `wrangler.toml`，将 `your-database-id` 替换为上一步的实际 ID：

```toml
[[d1_databases]]
binding = "DB"
database_name = "blog-database"
database_id = "your-actual-database-id-here"
```

### 5. 初始化数据库

```bash
wrangler d1 execute blog-database --file=./database/schema.sql
```

### 6. 启动开发服务器

打开两个终端：

**终端 1 - API 服务器:**
```bash
wrangler dev workers/api/index.ts --port 8787
```

**终端 2 - 前端服务器:**
```bash
pnpm dev
```

### 7. 访问网站

打开浏览器访问 http://localhost:5173

### 8. 注册账户

1. 点击右上角"注册"
2. 填写邮箱、用户名和密码
3. 注册成功后登录

### 9. 设置管理员权限

```bash
# 查看用户列表
wrangler d1 execute blog-database --command="SELECT id, email, username, role FROM users"

# 将用户设置为管理员（替换 1 为实际用户 ID）
wrangler d1 execute blog-database --command="UPDATE users SET role='admin' WHERE id=1"
```

### 10. 开始写作

刷新页面，现在可以点击"写文章"开始创作了！

## 下一步

- 查看 [DEPLOYMENT.md](DEPLOYMENT.md) 了解生产环境部署
- 自定义主题颜色（编辑 `tailwind.config.js`）
- 添加自己的分类和标签
- 配置 R2 存储桶上传图片

## 常见问题

**Q: 如何创建 R2 存储桶？**
```bash
wrangler r2 bucket create blog-uploads
```

**Q: 如何查看数据库内容？**
```bash
wrangler d1 execute blog-database --command="SELECT * FROM posts"
```

**Q: 如何重置数据库？**
```bash
wrangler d1 execute blog-database --file=./database/schema.sql
```

**Q: API 请求失败怎么办？**
- 检查 Workers 是否在运行（终端 1）
- 确认端口 8787 没有被占用
- 查看 `.env` 文件中的 `VITE_API_URL` 是否正确

**Q: 如何部署到生产环境？**
```bash
bash scripts/deploy.sh production
```

## 需要帮助？

查看完整文档：
- [README.md](README.md) - 项目概览
- [DEPLOYMENT.md](docs/DEPLOYMENT.md) - 详细部署指南

祝您使用愉快！
