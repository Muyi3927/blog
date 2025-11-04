import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store';
import { apiClient, Post } from '../lib/api';
import { User, Mail, Calendar, FileText } from 'lucide-react';
import { format } from 'date-fns';

export default function ProfilePage() {
  const navigate = useNavigate();
  const { user, isAuthenticated } = useAuthStore();
  const [myPosts, setMyPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isAuthenticated) {
      navigate('/login');
      return;
    }

    loadMyPosts();
  }, [isAuthenticated]);

  const loadMyPosts = async () => {
    try {
      setLoading(true);
      const { posts } = await apiClient.getPosts({ status: 'published' });
      const filteredPosts = posts.filter((post) => post.author_id === user?.id);
      setMyPosts(filteredPosts);
    } catch (error) {
      console.error('加载文章失败:', error);
    } finally {
      setLoading(false);
    }
  };

  if (!user) {
    return null;
  }

  return (
    <div className="max-w-4xl mx-auto">
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-8 mb-8">
        <div className="flex items-start gap-6">
          {user.avatarUrl ? (
            <img src={user.avatarUrl} alt={user.displayName} className="w-24 h-24 rounded-full" />
          ) : (
            <div className="w-24 h-24 rounded-full bg-gradient-to-br from-blue-600 to-purple-600 flex items-center justify-center text-white text-3xl font-bold">
              {user.displayName[0]}
            </div>
          )}

          <div className="flex-1">
            <h1 className="text-3xl font-bold mb-2">{user.displayName}</h1>
            <p className="text-gray-600 dark:text-gray-400 mb-4">@{user.username}</p>

            <div className="flex flex-wrap gap-4 text-sm text-gray-600 dark:text-gray-400">
              <div className="flex items-center gap-2">
                <Mail className="w-4 h-4" />
                {user.email}
              </div>
              <div className="flex items-center gap-2">
                <User className="w-4 h-4" />
                {user.role === 'admin' ? '管理员' : '普通用户'}
              </div>
              <div className="flex items-center gap-2">
                <FileText className="w-4 h-4" />
                {myPosts.length} 篇文章
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-8">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold">我的文章</h2>
          <Link
            to="/write"
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            写新文章
          </Link>
        </div>

        {loading ? (
          <div className="text-center py-12">
            <div className="inline-block w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
          </div>
        ) : myPosts.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-gray-600 dark:text-gray-400">还没有发布文章</p>
            <Link
              to="/write"
              className="mt-4 inline-block text-blue-600 dark:text-blue-400 hover:underline"
            >
              写第一篇文章
            </Link>
          </div>
        ) : (
          <div className="space-y-4">
            {myPosts.map((post) => (
              <div
                key={post.id}
                className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-700 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors"
              >
                <div className="flex-1">
                  <Link
                    to={`/post/${post.id}`}
                    className="text-lg font-semibold hover:text-blue-600 dark:hover:text-blue-400"
                  >
                    {post.title}
                  </Link>
                  <div className="flex items-center gap-4 mt-2 text-sm text-gray-600 dark:text-gray-400">
                    <span className="flex items-center gap-1">
                      <Calendar className="w-4 h-4" />
                      {format(new Date(post.published_at || post.created_at), 'yyyy-MM-dd')}
                    </span>
                    <span>{post.view_count} 次浏览</span>
                    <span className={`px-2 py-1 rounded text-xs ${
                      post.status === 'published'
                        ? 'bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-300'
                        : 'bg-yellow-100 dark:bg-yellow-900 text-yellow-700 dark:text-yellow-300'
                    }`}>
                      {post.status === 'published' ? '已发布' : '草稿'}
                    </span>
                  </div>
                </div>

                <Link
                  to={`/edit/${post.id}`}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  编辑
                </Link>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
