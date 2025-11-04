import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useAuthStore } from '../store';
import { apiClient, Category, Tag } from '../lib/api';
import { Save, Eye } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeHighlight from 'rehype-highlight';
import rehypeRaw from 'rehype-raw';

export default function WritePage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { isAuthenticated } = useAuthStore();
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [excerpt, setExcerpt] = useState('');
  const [coverImage, setCoverImage] = useState('');
  const [status, setStatus] = useState<'draft' | 'published'>('draft');
  const [selectedCategories, setSelectedCategories] = useState<number[]>([]);
  const [selectedTags, setSelectedTags] = useState<number[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [tags, setTags] = useState<Tag[]>([]);
  const [preview, setPreview] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!isAuthenticated) {
      navigate('/login');
      return;
    }

    loadData();
  }, [isAuthenticated, id]);

  const loadData = async () => {
    try {
      const [categoriesData, tagsData] = await Promise.all([
        apiClient.getCategories(),
        apiClient.getTags(),
      ]);

      setCategories(categoriesData.categories);
      setTags(tagsData.tags);

      if (id) {
        const { post } = await apiClient.getPost(parseInt(id));
        setTitle(post.title);
        setContent(post.content);
        setExcerpt(post.excerpt);
        setCoverImage(post.cover_image || '');
        setStatus(post.status as 'draft' | 'published');
        setSelectedCategories(post.categories?.map(c => c.id) || []);
        setSelectedTags(post.tags?.map(t => t.id) || []);
      }
    } catch (error) {
      console.error('加载数据失败:', error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!title.trim() || !content.trim()) {
      alert('标题和内容不能为空');
      return;
    }

    try {
      setSubmitting(true);

      const postData = {
        title,
        content,
        excerpt,
        coverImage,
        status,
        categoryIds: selectedCategories,
        tagIds: selectedTags,
      };

      if (id) {
        await apiClient.updatePost(parseInt(id), postData);
        alert('文章更新成功');
      } else {
        const result = await apiClient.createPost(postData);
        alert('文章创建成功');
        navigate(`/post/${result.postId}`);
      }
    } catch (error: any) {
      alert(error.message || '保存失败');
    } finally {
      setSubmitting(false);
    }
  };

  const handleCategoryToggle = (categoryId: number) => {
    setSelectedCategories((prev) =>
      prev.includes(categoryId)
        ? prev.filter((id) => id !== categoryId)
        : [...prev, categoryId]
    );
  };

  const handleTagToggle = (tagId: number) => {
    setSelectedTags((prev) =>
      prev.includes(tagId) ? prev.filter((id) => id !== tagId) : [...prev, tagId]
    );
  };

  return (
    <div className="max-w-6xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-3xl font-bold">{id ? '编辑文章' : '写文章'}</h1>
        <div className="flex items-center gap-4">
          <button
            type="button"
            onClick={() => setPreview(!preview)}
            className="flex items-center gap-2 px-4 py-2 bg-gray-200 dark:bg-gray-700 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
          >
            <Eye className="w-4 h-4" />
            {preview ? '编辑' : '预览'}
          </button>
          <button
            onClick={handleSubmit}
            disabled={submitting}
            className="flex items-center gap-2 px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
          >
            <Save className="w-4 h-4" />
            {submitting ? '保存中...' : '保存'}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        <div className="lg:col-span-3">
          {preview ? (
            <div className="bg-white dark:bg-gray-800 rounded-xl p-8 shadow-sm border border-gray-200 dark:border-gray-700">
              <h1 className="text-4xl font-bold mb-4">{title || '无标题'}</h1>
              {excerpt && <p className="text-gray-600 dark:text-gray-400 mb-6">{excerpt}</p>}
              <div className="prose dark:prose-invert max-w-none">
                <ReactMarkdown
                  remarkPlugins={[remarkGfm]}
                  rehypePlugins={[rehypeHighlight, rehypeRaw]}
                >
                  {content}
                </ReactMarkdown>
              </div>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-200 dark:border-gray-700">
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="文章标题"
                  className="w-full text-3xl font-bold bg-transparent border-none outline-none placeholder-gray-400 dark:placeholder-gray-600"
                />
              </div>

              <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-200 dark:border-gray-700">
                <input
                  type="text"
                  value={excerpt}
                  onChange={(e) => setExcerpt(e.target.value)}
                  placeholder="文章摘要（选填）"
                  className="w-full bg-transparent border-none outline-none placeholder-gray-400 dark:placeholder-gray-600"
                />
              </div>

              <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-200 dark:border-gray-700">
                <input
                  type="text"
                  value={coverImage}
                  onChange={(e) => setCoverImage(e.target.value)}
                  placeholder="封面图片 URL（选填）"
                  className="w-full bg-transparent border-none outline-none placeholder-gray-400 dark:placeholder-gray-600"
                />
              </div>

              <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-200 dark:border-gray-700">
                <textarea
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  placeholder="使用 Markdown 编写内容..."
                  className="w-full h-[500px] bg-transparent border-none outline-none resize-none placeholder-gray-400 dark:placeholder-gray-600 font-mono"
                />
              </div>
            </form>
          )}
        </div>

        <div className="space-y-6">
          <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-200 dark:border-gray-700">
            <h3 className="font-semibold mb-4">发布状态</h3>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value as 'draft' | 'published')}
              className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
            >
              <option value="draft">草稿</option>
              <option value="published">已发布</option>
            </select>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-200 dark:border-gray-700">
            <h3 className="font-semibold mb-4">分类</h3>
            <div className="space-y-2">
              {categories.map((category) => (
                <label key={category.id} className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={selectedCategories.includes(category.id)}
                    onChange={() => handleCategoryToggle(category.id)}
                    className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                  <span>{category.name}</span>
                </label>
              ))}
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-200 dark:border-gray-700">
            <h3 className="font-semibold mb-4">标签</h3>
            <div className="flex flex-wrap gap-2">
              {tags.map((tag) => (
                <button
                  key={tag.id}
                  type="button"
                  onClick={() => handleTagToggle(tag.id)}
                  className={`px-3 py-1 rounded-full text-sm transition-colors ${
                    selectedTags.includes(tag.id)
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600'
                  }`}
                >
                  {tag.name}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
