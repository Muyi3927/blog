import { useAuthStore } from '../store';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8787';

export interface Post {
  id: number;
  title: string;
  slug: string;
  content: string;
  excerpt: string;
  cover_image?: string;
  author_id: number;
  author_username: string;
  author_display_name: string;
  author_avatar?: string;
  status: string;
  view_count: number;
  created_at: string;
  updated_at: string;
  published_at?: string;
  categories?: Category[];
  tags?: Tag[];
}

export interface Category {
  id: number;
  name: string;
  slug: string;
  description?: string;
}

export interface Tag {
  id: number;
  name: string;
  slug: string;
}

export interface Comment {
  id: number;
  post_id: number;
  user_id: number;
  parent_id?: number;
  content: string;
  username: string;
  display_name: string;
  avatar_url?: string;
  created_at: string;
}

class ApiClient {
  private getAuthHeaders(): HeadersInit {
    const token = useAuthStore.getState().token;
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
    };

    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    return headers;
  }

  async getPosts(params?: {
    page?: number;
    limit?: number;
    category?: string;
    tag?: string;
    status?: string;
  }): Promise<{ posts: Post[]; pagination: any }> {
    const queryParams = new URLSearchParams();
    if (params?.page) queryParams.set('page', params.page.toString());
    if (params?.limit) queryParams.set('limit', params.limit.toString());
    if (params?.category) queryParams.set('category', params.category);
    if (params?.tag) queryParams.set('tag', params.tag);
    if (params?.status) queryParams.set('status', params.status);

    const response = await fetch(`${API_URL}/api/posts?${queryParams}`, {
      headers: this.getAuthHeaders(),
    });

    if (!response.ok) throw new Error('获取文章列表失败');
    return response.json();
  }

  async getPost(id: number): Promise<{ post: Post }> {
    const response = await fetch(`${API_URL}/api/posts/${id}`, {
      headers: this.getAuthHeaders(),
    });

    if (!response.ok) throw new Error('获取文章详情失败');
    return response.json();
  }

  async createPost(data: {
    title: string;
    slug?: string;
    content: string;
    excerpt?: string;
    coverImage?: string;
    status?: string;
    categoryIds?: number[];
    tagIds?: number[];
  }): Promise<any> {
    const response = await fetch(`${API_URL}/api/posts`, {
      method: 'POST',
      headers: this.getAuthHeaders(),
      body: JSON.stringify(data),
    });

    if (!response.ok) throw new Error('创建文章失败');
    return response.json();
  }

  async updatePost(id: number, data: Partial<Post>): Promise<any> {
    const response = await fetch(`${API_URL}/api/posts/${id}`, {
      method: 'PUT',
      headers: this.getAuthHeaders(),
      body: JSON.stringify(data),
    });

    if (!response.ok) throw new Error('更新文章失败');
    return response.json();
  }

  async deletePost(id: number): Promise<any> {
    const response = await fetch(`${API_URL}/api/posts/${id}`, {
      method: 'DELETE',
      headers: this.getAuthHeaders(),
    });

    if (!response.ok) throw new Error('删除文章失败');
    return response.json();
  }

  async getComments(postId: number): Promise<{ comments: Comment[] }> {
    const response = await fetch(`${API_URL}/api/comments?postId=${postId}`, {
      headers: this.getAuthHeaders(),
    });

    if (!response.ok) throw new Error('获取评论失败');
    return response.json();
  }

  async createComment(data: {
    postId: number;
    content: string;
    parentId?: number;
  }): Promise<any> {
    const response = await fetch(`${API_URL}/api/comments`, {
      method: 'POST',
      headers: this.getAuthHeaders(),
      body: JSON.stringify(data),
    });

    if (!response.ok) throw new Error('创建评论失败');
    return response.json();
  }

  async deleteComment(id: number): Promise<any> {
    const response = await fetch(`${API_URL}/api/comments/${id}`, {
      method: 'DELETE',
      headers: this.getAuthHeaders(),
    });

    if (!response.ok) throw new Error('删除评论失败');
    return response.json();
  }

  async getCategories(): Promise<{ categories: Category[] }> {
    const response = await fetch(`${API_URL}/api/categories`);
    if (!response.ok) throw new Error('获取分类失败');
    return response.json();
  }

  async getTags(): Promise<{ tags: Tag[] }> {
    const response = await fetch(`${API_URL}/api/tags`);
    if (!response.ok) throw new Error('获取标签失败');
    return response.json();
  }

  async search(query: string): Promise<{ results: Post[] }> {
    const response = await fetch(`${API_URL}/api/search?q=${encodeURIComponent(query)}`);
    if (!response.ok) throw new Error('搜索失败');
    return response.json();
  }

  async uploadFile(file: File): Promise<{ url: string }> {
    const formData = new FormData();
    formData.append('file', file);

    const token = useAuthStore.getState().token;
    const response = await fetch(`${API_URL}/api/upload`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
      },
      body: formData,
    });

    if (!response.ok) throw new Error('文件上传失败');
    return response.json();
  }
}

export const apiClient = new ApiClient();
