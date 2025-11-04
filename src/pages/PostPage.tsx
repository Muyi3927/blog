import { useEffect, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { apiClient, Post, Comment } from '../lib/api';
import { useAuthStore } from '../store';
import { Calendar, Eye, User, ArrowLeft, MessageCircle, Trash2 } from 'lucide-react';
import { format } from 'date-fns';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeHighlight from 'rehype-highlight';
import rehypeRaw from 'rehype-raw';

export default function PostPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user, isAuthenticated } = useAuthStore();
  const [post, setPost] = useState<Post | null>(null);
  const [comments, setComments] = useState<Comment[]>([]);
  const [commentContent, setCommentContent] = useState('');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    loadPost();
    loadComments();
  }, [id]);

  const loadPost = async () => {
    try {
      setLoading(true);
      const { post: fetchedPost } = await apiClient.getPost(parseInt(id!));
      setPost(fetchedPost);
    } catch (error) {
      console.error('加载文章失败:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadComments = async () => {
    try {
      const { comments: fetchedComments } = await apiClient.getComments(parseInt(id!));
      setComments(fetchedComments);
    } catch (error) {
      console.error('加载评论失败:', error);
    }
  };

  const handleSubmitComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!commentContent.trim()) return;

    try {
      setSubmitting(true);
      await apiClient.createComment({
        postId: parseInt(id!),
        content: commentContent,
      });
      setCommentContent('');
      loadComments();
    } catch (error: any) {
      alert(error.message || '评论失败');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteComment = async (commentId: number) => {
    if (!confirm('确定要删除这条评论吗？')) return;

    try {
      await apiClient.deleteComment(commentId);
      loadComments();
    } catch (error: any) {
      alert(error.message || '删除失败');
    }
  };

  const handleDeletePost = async () => {
    if (!confirm('确定要删除这篇文章吗？')) return;

    try {
      await apiClient.deletePost(parseInt(id!));
      navigate('/');
    } catch (error: any) {
      alert(error.message || '删除失败');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <div className="inline-block w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
          <p className="mt-4 text-gray-600 dark:text-gray-400">加载中...</p>
        </div>
      </div>
    );
  }

  if (!post) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-600 dark:text-gray-400">文章不存在</p>
        <Link to="/" className="mt-4 inline-block text-blue-600 hover:text-blue-700">
          返回首页
        </Link>
      </div>
    );
  }

  const canEdit = user?.id === post.author_id || user?.role === 'admin';

  return (
    <div className="max-w-4xl mx-auto">
      <Link
        to="/"
        className="inline-flex items-center gap-2 text-gray-600 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 mb-6"
      >
        <ArrowLeft className="w-4 h-4" />
        返回首页
      </Link>

      <article className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
        {post.cover_image && (
          <img src={post.cover_image} alt={post.title} className="w-full h-96 object-cover" />
        )}

        <div className="p-8">
          <h1 className="text-4xl font-bold mb-4">{post.title}</h1>

          <div className="flex items-center justify-between mb-6 pb-6 border-b border-gray-200 dark:border-gray-700">
            <div className="flex items-center gap-6 text-sm text-gray-600 dark:text-gray-400">
              <span className="flex items-center gap-2">
                <User className="w-4 h-4" />
                {post.author_display_name}
              </span>
              <span className="flex items-center gap-2">
                <Calendar className="w-4 h-4" />
                {format(new Date(post.published_at || post.created_at), 'yyyy-MM-dd HH:mm')}
              </span>
              <span className="flex items-center gap-2">
                <Eye className="w-4 h-4" />
                {post.view_count}
              </span>
            </div>

            {canEdit && (
              <div className="flex gap-2">
                <Link
                  to={`/edit/${post.id}`}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  编辑
                </Link>
                <button
                  onClick={handleDeletePost}
                  className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
                >
                  删除
                </button>
              </div>
            )}
          </div>

          {post.categories && post.categories.length > 0 && (
            <div className="flex flex-wrap gap-2 mb-4">
              {post.categories.map((category) => (
                <Link
                  key={category.id}
                  to={`/?category=${category.slug}`}
                  className="px-3 py-1 bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300 rounded-full text-sm"
                >
                  {category.name}
                </Link>
              ))}
            </div>
          )}

          {post.tags && post.tags.length > 0 && (
            <div className="flex flex-wrap gap-2 mb-6">
              {post.tags.map((tag) => (
                <Link
                  key={tag.id}
                  to={`/?tag=${tag.slug}`}
                  className="px-3 py-1 bg-gray-100 dark:bg-gray-700 rounded-full text-sm"
                >
                  #{tag.name}
                </Link>
              ))}
            </div>
          )}

          <div className="prose dark:prose-invert max-w-none">
            <ReactMarkdown
              remarkPlugins={[remarkGfm]}
              rehypePlugins={[rehypeHighlight, rehypeRaw]}
            >
              {post.content}
            </ReactMarkdown>
          </div>
        </div>
      </article>

      <section className="mt-8 bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-8">
        <h2 className="text-2xl font-bold mb-6 flex items-center gap-2">
          <MessageCircle className="w-6 h-6" />
          评论 ({comments.length})
        </h2>

        {isAuthenticated ? (
          <form onSubmit={handleSubmitComment} className="mb-8">
            <textarea
              value={commentContent}
              onChange={(e) => setCommentContent(e.target.value)}
              placeholder="写下你的评论..."
              className="w-full px-4 py-3 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none resize-none"
              rows={4}
            />
            <button
              type="submit"
              disabled={submitting || !commentContent.trim()}
              className="mt-4 px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
            >
              {submitting ? '提交中...' : '发表评论'}
            </button>
          </form>
        ) : (
          <div className="mb-8 p-4 bg-gray-100 dark:bg-gray-700 rounded-lg text-center">
            <Link to="/login" className="text-blue-600 dark:text-blue-400 hover:underline">
              登录
            </Link>
            后发表评论
          </div>
        )}

        <div className="space-y-4">
          {comments.length === 0 ? (
            <p className="text-center text-gray-600 dark:text-gray-400">暂无评论</p>
          ) : (
            comments.map((comment) => (
              <div
                key={comment.id}
                className="p-4 bg-gray-50 dark:bg-gray-700 rounded-lg"
              >
                <div className="flex items-start justify-between mb-2">
                  <div className="flex items-center gap-3">
                    {comment.avatar_url ? (
                      <img
                        src={comment.avatar_url}
                        alt={comment.display_name}
                        className="w-10 h-10 rounded-full"
                      />
                    ) : (
                      <div className="w-10 h-10 rounded-full bg-blue-600 flex items-center justify-center text-white font-bold">
                        {comment.display_name[0]}
                      </div>
                    )}
                    <div>
                      <div className="font-semibold">{comment.display_name}</div>
                      <div className="text-sm text-gray-600 dark:text-gray-400">
                        {format(new Date(comment.created_at), 'yyyy-MM-dd HH:mm')}
                      </div>
                    </div>
                  </div>

                  {(user?.id === comment.user_id || user?.role === 'admin') && (
                    <button
                      onClick={() => handleDeleteComment(comment.id)}
                      className="p-2 text-red-600 hover:bg-red-100 dark:hover:bg-red-900 rounded-lg transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
                <p className="text-gray-700 dark:text-gray-300">{comment.content}</p>
              </div>
            ))
          )}
        </div>
      </section>
    </div>
  );
}
