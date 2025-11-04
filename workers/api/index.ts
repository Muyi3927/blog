// Cloudflare Workers API
// 博客系统后端 API

interface Env {
  DB: D1Database;
  BLOG_BUCKET: R2Bucket;
  JWT_SECRET: string;
}

// CORS 配置
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

// 路由处理器
export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    // 处理 CORS 预检请求
    if (request.method === 'OPTIONS') {
      return new Response(null, { headers: corsHeaders });
    }

    const url = new URL(request.url);
    const path = url.pathname;
    const method = request.method;

    try {
      // 路由分发
      if (path.startsWith('/api/auth/')) {
        return handleAuth(request, env, path, method);
      } else if (path.startsWith('/api/posts')) {
        return handlePosts(request, env, path, method);
      } else if (path.startsWith('/api/comments')) {
        return handleComments(request, env, path, method);
      } else if (path.startsWith('/api/categories')) {
        return handleCategories(request, env, path, method);
      } else if (path.startsWith('/api/tags')) {
        return handleTags(request, env, path, method);
      } else if (path.startsWith('/api/upload')) {
        return handleUpload(request, env);
      } else if (path.startsWith('/api/search')) {
        return handleSearch(request, env);
      }

      return jsonResponse({ error: '路由未找到' }, 404);
    } catch (error: any) {
      console.error('API Error:', error);
      return jsonResponse({ error: error.message || '服务器错误' }, 500);
    }
  },
};

// 认证相关处理
async function handleAuth(request: Request, env: Env, path: string, method: string): Promise<Response> {
  if (path === '/api/auth/register' && method === 'POST') {
    return handleRegister(request, env);
  } else if (path === '/api/auth/login' && method === 'POST') {
    return handleLogin(request, env);
  } else if (path === '/api/auth/logout' && method === 'POST') {
    return handleLogout(request, env);
  } else if (path === '/api/auth/me' && method === 'GET') {
    return handleGetCurrentUser(request, env);
  }

  return jsonResponse({ error: '未知的认证路由' }, 404);
}

// 用户注册
async function handleRegister(request: Request, env: Env): Promise<Response> {
  const body = await request.json() as any;
  const { email, password, username, displayName } = body;

  if (!email || !password || !username) {
    return jsonResponse({ error: '缺少必填字段' }, 400);
  }

  // 检查用户是否已存在
  const existingUser = await env.DB.prepare(
    'SELECT id FROM users WHERE email = ? OR username = ?'
  ).bind(email, username).first();

  if (existingUser) {
    return jsonResponse({ error: '邮箱或用户名已存在' }, 400);
  }

  // 哈希密码（生产环境应使用更强的加密）
  const passwordHash = await hashPassword(password);

  // 插入新用户
  const result = await env.DB.prepare(
    'INSERT INTO users (email, password_hash, username, display_name, role) VALUES (?, ?, ?, ?, ?)'
  ).bind(email, passwordHash, username, displayName || username, 'user').run();

  if (!result.success) {
    return jsonResponse({ error: '注册失败' }, 500);
  }

  return jsonResponse({ message: '注册成功', userId: result.meta.last_row_id }, 201);
}

// 用户登录
async function handleLogin(request: Request, env: Env): Promise<Response> {
  const body = await request.json() as any;
  const { email, password } = body;

  if (!email || !password) {
    return jsonResponse({ error: '缺少邮箱或密码' }, 400);
  }

  // 查询用户
  const user = await env.DB.prepare(
    'SELECT id, email, password_hash, username, display_name, role, avatar_url FROM users WHERE email = ?'
  ).bind(email).first();

  if (!user) {
    return jsonResponse({ error: '邮箱或密码错误' }, 401);
  }

  // 验证密码
  const passwordValid = await verifyPassword(password, user.password_hash as string);
  if (!passwordValid) {
    return jsonResponse({ error: '邮箱或密码错误' }, 401);
  }

  // 创建会话
  const sessionId = crypto.randomUUID();
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7天

  await env.DB.prepare(
    'INSERT INTO sessions (id, user_id, expires_at) VALUES (?, ?, ?)'
  ).bind(sessionId, user.id, expiresAt.toISOString()).run();

  // 更新最后登录时间
  await env.DB.prepare(
    'UPDATE users SET last_login = CURRENT_TIMESTAMP WHERE id = ?'
  ).bind(user.id).run();

  return jsonResponse({
    message: '登录成功',
    token: sessionId,
    user: {
      id: user.id,
      email: user.email,
      username: user.username,
      displayName: user.display_name,
      role: user.role,
      avatarUrl: user.avatar_url,
    },
  });
}

// 用户登出
async function handleLogout(request: Request, env: Env): Promise<Response> {
  const token = getAuthToken(request);
  if (!token) {
    return jsonResponse({ error: '未授权' }, 401);
  }

  await env.DB.prepare('DELETE FROM sessions WHERE id = ?').bind(token).run();

  return jsonResponse({ message: '登出成功' });
}

// 获取当前用户信息
async function handleGetCurrentUser(request: Request, env: Env): Promise<Response> {
  const user = await authenticateRequest(request, env);
  if (!user) {
    return jsonResponse({ error: '未授权' }, 401);
  }

  return jsonResponse({ user });
}

// 文章相关处理
async function handlePosts(request: Request, env: Env, path: string, method: string): Promise<Response> {
  if (path === '/api/posts' && method === 'GET') {
    return handleGetPosts(request, env);
  } else if (path === '/api/posts' && method === 'POST') {
    return handleCreatePost(request, env);
  } else if (path.match(/^\/api\/posts\/\d+$/) && method === 'GET') {
    const id = parseInt(path.split('/').pop()!);
    return handleGetPost(env, id);
  } else if (path.match(/^\/api\/posts\/\d+$/) && method === 'PUT') {
    const id = parseInt(path.split('/').pop()!);
    return handleUpdatePost(request, env, id);
  } else if (path.match(/^\/api\/posts\/\d+$/) && method === 'DELETE') {
    const id = parseInt(path.split('/').pop()!);
    return handleDeletePost(request, env, id);
  }

  return jsonResponse({ error: '未知的文章路由' }, 404);
}

// 获取文章列表
async function handleGetPosts(request: Request, env: Env): Promise<Response> {
  const url = new URL(request.url);
  const page = parseInt(url.searchParams.get('page') || '1');
  const limit = parseInt(url.searchParams.get('limit') || '10');
  const category = url.searchParams.get('category');
  const tag = url.searchParams.get('tag');
  const status = url.searchParams.get('status') || 'published';
  const offset = (page - 1) * limit;

  let query = `
    SELECT DISTINCT p.*, 
           u.username as author_username, 
           u.display_name as author_display_name,
           u.avatar_url as author_avatar
    FROM posts p
    JOIN users u ON p.author_id = u.id
  `;

  const conditions: string[] = [`p.status = ?`];
  const params: any[] = [status];

  if (category) {
    query += ` JOIN post_categories pc ON p.id = pc.post_id 
               JOIN categories c ON pc.category_id = c.id `;
    conditions.push('c.slug = ?');
    params.push(category);
  }

  if (tag) {
    query += ` JOIN post_tags pt ON p.id = pt.post_id 
               JOIN tags t ON pt.tag_id = t.id `;
    conditions.push('t.slug = ?');
    params.push(tag);
  }

  query += ' WHERE ' + conditions.join(' AND ');
  query += ' ORDER BY p.published_at DESC LIMIT ? OFFSET ?';
  params.push(limit, offset);

  const posts = await env.DB.prepare(query).bind(...params).all();

  // 获取总数
  let countQuery = 'SELECT COUNT(DISTINCT p.id) as total FROM posts p';
  if (category) countQuery += ' JOIN post_categories pc ON p.id = pc.post_id JOIN categories c ON pc.category_id = c.id';
  if (tag) countQuery += ' JOIN post_tags pt ON p.id = pt.post_id JOIN tags t ON pt.tag_id = t.id';
  countQuery += ' WHERE ' + conditions.join(' AND ');

  const countResult = await env.DB.prepare(countQuery).bind(...params.slice(0, -2)).first();
  const total = (countResult as any)?.total || 0;

  return jsonResponse({
    posts: posts.results,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  });
}

// 获取单篇文章
async function handleGetPost(env: Env, id: number): Promise<Response> {
  const post = await env.DB.prepare(`
    SELECT p.*, 
           u.username as author_username, 
           u.display_name as author_display_name,
           u.avatar_url as author_avatar
    FROM posts p
    JOIN users u ON p.author_id = u.id
    WHERE p.id = ?
  `).bind(id).first();

  if (!post) {
    return jsonResponse({ error: '文章不存在' }, 404);
  }

  // 获取分类
  const categories = await env.DB.prepare(`
    SELECT c.* FROM categories c
    JOIN post_categories pc ON c.id = pc.category_id
    WHERE pc.post_id = ?
  `).bind(id).all();

  // 获取标签
  const tags = await env.DB.prepare(`
    SELECT t.* FROM tags t
    JOIN post_tags pt ON t.id = pt.tag_id
    WHERE pt.post_id = ?
  `).bind(id).all();

  // 增加浏览量
  await env.DB.prepare('UPDATE posts SET view_count = view_count + 1 WHERE id = ?').bind(id).run();

  return jsonResponse({
    post: {
      ...post,
      categories: categories.results,
      tags: tags.results,
    },
  });
}

// 创建文章
async function handleCreatePost(request: Request, env: Env): Promise<Response> {
  const user = await authenticateRequest(request, env);
  if (!user) {
    return jsonResponse({ error: '未授权' }, 401);
  }

  const body = await request.json() as any;
  const { title, slug, content, excerpt, coverImage, status, categoryIds, tagIds } = body;

  if (!title || !content) {
    return jsonResponse({ error: '标题和内容不能为空' }, 400);
  }

  const finalSlug = slug || generateSlug(title);
  const publishedAt = status === 'published' ? new Date().toISOString() : null;

  // 插入文章
  const result = await env.DB.prepare(`
    INSERT INTO posts (title, slug, content, excerpt, cover_image, author_id, status, published_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `).bind(title, finalSlug, content, excerpt || '', coverImage || '', user.id, status || 'draft', publishedAt).run();

  const postId = result.meta.last_row_id;

  // 关联分类
  if (categoryIds && categoryIds.length > 0) {
    for (const categoryId of categoryIds) {
      await env.DB.prepare('INSERT INTO post_categories (post_id, category_id) VALUES (?, ?)').bind(postId, categoryId).run();
    }
  }

  // 关联标签
  if (tagIds && tagIds.length > 0) {
    for (const tagId of tagIds) {
      await env.DB.prepare('INSERT INTO post_tags (post_id, tag_id) VALUES (?, ?)').bind(postId, tagId).run();
    }
  }

  return jsonResponse({ message: '文章创建成功', postId }, 201);
}

// 更新文章
async function handleUpdatePost(request: Request, env: Env, id: number): Promise<Response> {
  const user = await authenticateRequest(request, env);
  if (!user) {
    return jsonResponse({ error: '未授权' }, 401);
  }

  const post = await env.DB.prepare('SELECT author_id FROM posts WHERE id = ?').bind(id).first();
  if (!post) {
    return jsonResponse({ error: '文章不存在' }, 404);
  }

  if (post.author_id !== user.id && user.role !== 'admin') {
    return jsonResponse({ error: '无权限编辑此文章' }, 403);
  }

  const body = await request.json() as any;
  const { title, slug, content, excerpt, coverImage, status } = body;

  await env.DB.prepare(`
    UPDATE posts 
    SET title = ?, slug = ?, content = ?, excerpt = ?, cover_image = ?, status = ?, updated_at = CURRENT_TIMESTAMP
    WHERE id = ?
  `).bind(title, slug, content, excerpt, coverImage, status, id).run();

  return jsonResponse({ message: '文章更新成功' });
}

// 删除文章
async function handleDeletePost(request: Request, env: Env, id: number): Promise<Response> {
  const user = await authenticateRequest(request, env);
  if (!user) {
    return jsonResponse({ error: '未授权' }, 401);
  }

  const post = await env.DB.prepare('SELECT author_id FROM posts WHERE id = ?').bind(id).first();
  if (!post) {
    return jsonResponse({ error: '文章不存在' }, 404);
  }

  if (post.author_id !== user.id && user.role !== 'admin') {
    return jsonResponse({ error: '无权限删除此文章' }, 403);
  }

  await env.DB.prepare('DELETE FROM posts WHERE id = ?').bind(id).run();

  return jsonResponse({ message: '文章删除成功' });
}

// 评论相关处理
async function handleComments(request: Request, env: Env, path: string, method: string): Promise<Response> {
  if (method === 'GET') {
    const url = new URL(request.url);
    const postId = url.searchParams.get('postId');
    if (!postId) {
      return jsonResponse({ error: '缺少 postId 参数' }, 400);
    }
    return handleGetComments(env, parseInt(postId));
  } else if (method === 'POST') {
    return handleCreateComment(request, env);
  } else if (path.match(/^\/api\/comments\/\d+$/) && method === 'DELETE') {
    const id = parseInt(path.split('/').pop()!);
    return handleDeleteComment(request, env, id);
  }

  return jsonResponse({ error: '未知的评论路由' }, 404);
}

// 获取评论列表
async function handleGetComments(env: Env, postId: number): Promise<Response> {
  const comments = await env.DB.prepare(`
    SELECT c.*, 
           u.username, 
           u.display_name, 
           u.avatar_url
    FROM comments c
    JOIN users u ON c.user_id = u.id
    WHERE c.post_id = ?
    ORDER BY c.created_at DESC
  `).bind(postId).all();

  return jsonResponse({ comments: comments.results });
}

// 创建评论
async function handleCreateComment(request: Request, env: Env): Promise<Response> {
  const user = await authenticateRequest(request, env);
  if (!user) {
    return jsonResponse({ error: '未授权' }, 401);
  }

  const body = await request.json() as any;
  const { postId, content, parentId } = body;

  if (!postId || !content) {
    return jsonResponse({ error: '缺少必填字段' }, 400);
  }

  const result = await env.DB.prepare(`
    INSERT INTO comments (post_id, user_id, parent_id, content)
    VALUES (?, ?, ?, ?)
  `).bind(postId, user.id, parentId || null, content).run();

  return jsonResponse({ message: '评论创建成功', commentId: result.meta.last_row_id }, 201);
}

// 删除评论
async function handleDeleteComment(request: Request, env: Env, id: number): Promise<Response> {
  const user = await authenticateRequest(request, env);
  if (!user) {
    return jsonResponse({ error: '未授权' }, 401);
  }

  const comment = await env.DB.prepare('SELECT user_id FROM comments WHERE id = ?').bind(id).first();
  if (!comment) {
    return jsonResponse({ error: '评论不存在' }, 404);
  }

  if (comment.user_id !== user.id && user.role !== 'admin') {
    return jsonResponse({ error: '无权限删除此评论' }, 403);
  }

  await env.DB.prepare('DELETE FROM comments WHERE id = ?').bind(id).run();

  return jsonResponse({ message: '评论删除成功' });
}

// 分类相关处理
async function handleCategories(request: Request, env: Env, path: string, method: string): Promise<Response> {
  if (method === 'GET') {
    const categories = await env.DB.prepare('SELECT * FROM categories ORDER BY name').all();
    return jsonResponse({ categories: categories.results });
  }

  return jsonResponse({ error: '未知的分类路由' }, 404);
}

// 标签相关处理
async function handleTags(request: Request, env: Env, path: string, method: string): Promise<Response> {
  if (method === 'GET') {
    const tags = await env.DB.prepare('SELECT * FROM tags ORDER BY name').all();
    return jsonResponse({ tags: tags.results });
  }

  return jsonResponse({ error: '未知的标签路由' }, 404);
}

// 文件上传处理
async function handleUpload(request: Request, env: Env): Promise<Response> {
  const user = await authenticateRequest(request, env);
  if (!user) {
    return jsonResponse({ error: '未授权' }, 401);
  }

  const formData = await request.formData();
  const file = formData.get('file') as File;

  if (!file) {
    return jsonResponse({ error: '未找到文件' }, 400);
  }

  // 生成唯一文件名
  const filename = `${Date.now()}-${file.name}`;
  const key = `uploads/${filename}`;

  // 上传到 R2
  await env.BLOG_BUCKET.put(key, file.stream(), {
    httpMetadata: {
      contentType: file.type,
    },
  });

  // 生成访问 URL（需要配置 R2 公共访问域名）
  const url = `https://your-r2-domain.com/${key}`;

  return jsonResponse({ url });
}

// 搜索处理
async function handleSearch(request: Request, env: Env): Promise<Response> {
  const url = new URL(request.url);
  const query = url.searchParams.get('q');

  if (!query) {
    return jsonResponse({ error: '缺少搜索关键词' }, 400);
  }

  const results = await env.DB.prepare(`
    SELECT p.*, u.username as author_username
    FROM posts_fts
    JOIN posts p ON posts_fts.rowid = p.id
    JOIN users u ON p.author_id = u.id
    WHERE posts_fts MATCH ?
    ORDER BY rank
    LIMIT 20
  `).bind(query).all();

  return jsonResponse({ results: results.results });
}

// 工具函数
function jsonResponse(data: any, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'Content-Type': 'application/json',
      ...corsHeaders,
    },
  });
}

function getAuthToken(request: Request): string | null {
  const authHeader = request.headers.get('Authorization');
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return null;
  }
  return authHeader.substring(7);
}

async function authenticateRequest(request: Request, env: Env): Promise<any> {
  const token = getAuthToken(request);
  if (!token) {
    return null;
  }

  const session = await env.DB.prepare(`
    SELECT s.*, u.id, u.email, u.username, u.display_name, u.role, u.avatar_url
    FROM sessions s
    JOIN users u ON s.user_id = u.id
    WHERE s.id = ? AND s.expires_at > CURRENT_TIMESTAMP
  `).bind(token).first();

  if (!session) {
    return null;
  }

  return {
    id: session.id,
    email: session.email,
    username: session.username,
    displayName: session.display_name,
    role: session.role,
    avatarUrl: session.avatar_url,
  };
}

// 使用 PBKDF2 进行密码哈希（生产级安全）
async function hashPassword(password: string): Promise<string> {
  const encoder = new TextEncoder();
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const passwordData = encoder.encode(password);

  // 导入密码为 CryptoKey
  const key = await crypto.subtle.importKey(
    'raw',
    passwordData,
    { name: 'PBKDF2' },
    false,
    ['deriveBits']
  );

  // 使用 PBKDF2 派生密钥（100,000 次迭代）
  const derivedBits = await crypto.subtle.deriveBits(
    {
      name: 'PBKDF2',
      salt: salt,
      iterations: 100000,
      hash: 'SHA-256',
    },
    key,
    256
  );

  const hashArray = new Uint8Array(derivedBits);
  const saltHex = Array.from(salt).map(b => b.toString(16).padStart(2, '0')).join('');
  const hashHex = Array.from(hashArray).map(b => b.toString(16).padStart(2, '0')).join('');

  // 格式：salt$hash
  return `${saltHex}$${hashHex}`;
}

async function verifyPassword(password: string, storedHash: string): Promise<boolean> {
  // 兼容旧的 SHA-256 哈希（用于迁移）
  if (!storedHash.includes('$')) {
    // 旧格式：直接 SHA-256
    const encoder = new TextEncoder();
    const data = encoder.encode(password);
    const hash = await crypto.subtle.digest('SHA-256', data);
    const hashHex = Array.from(new Uint8Array(hash))
      .map(b => b.toString(16).padStart(2, '0'))
      .join('');
    return hashHex === storedHash;
  }

  // 新格式：salt$hash
  const [saltHex, expectedHashHex] = storedHash.split('$');
  const salt = new Uint8Array(saltHex.match(/.{2}/g)!.map(byte => parseInt(byte, 16)));

  const encoder = new TextEncoder();
  const passwordData = encoder.encode(password);

  const key = await crypto.subtle.importKey(
    'raw',
    passwordData,
    { name: 'PBKDF2' },
    false,
    ['deriveBits']
  );

  const derivedBits = await crypto.subtle.deriveBits(
    {
      name: 'PBKDF2',
      salt: salt,
      iterations: 100000,
      hash: 'SHA-256',
    },
    key,
    256
  );

  const hashArray = new Uint8Array(derivedBits);
  const hashHex = Array.from(hashArray).map(b => b.toString(16).padStart(2, '0')).join('');

  return hashHex === expectedHashHex;
}

function generateSlug(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^\w\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .trim();
}
