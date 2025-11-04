import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { apiClient, Post, Category, Tag } from '../lib/api';
import { Calendar, Eye, User, Tag as TagIcon } from 'lucide-react';
import { format } from 'date-fns';

export default function HomePage() {
  const [searchParams] = useSearchParams();
  const [posts, setPosts] = useState<Post[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [tags, setTags] = useState<Tag[]>([]);
  const [loading, setLoading] = useState(true);
  const [pagination, setPagination] = useState<any>(null);

  const selectedCategory = searchParams.get('category');
  const selectedTag = searchParams.get('tag');
  const searchQuery = searchParams.get('search');
  const page = parseInt(searchParams.get('page') || '1');

  useEffect(() => {
    loadData();
  }, [selectedCategory, selectedTag, searchQuery, page]);

  const loadData = async () => {
    try {
      setLoading(true);

      if (searchQuery) {
        const { results } = await apiClient.search(searchQuery);
        setPosts(results);
      } else {
        const { posts: fetchedPosts, pagination: paginationData } = await apiClient.getPosts({
          page,
          limit: 12,
          category: selectedCategory || undefined,
          tag: selectedTag || undefined,
          status: 'published',
        });
        setPosts(fetchedPosts);
        setPagination(paginationData);
      }

      const [categoriesData, tagsData] = await Promise.all([
        apiClient.getCategories(),
        apiClient.getTags(),
      ]);

      setCategories(categoriesData.categories);
      setTags(tagsData.tags);
    } catch (error) {
      console.error('加载数据失败:', error);
    } finally {
      setLoading(false);
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

  return (
    <div className="space-y-8">
      <section className="text-center py-12 bg-gradient-to-r from-blue-50 to-purple-50 dark:from-gray-800 dark:to-gray-800 rounded-2xl">
        <h1 className="text-4xl md:text-5xl font-bold mb-4 bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
          欢迎来到现代博客
        </h1>
        <p className="text-lg text-gray-600 dark:text-gray-400 max-w-2xl mx-auto">
          探索技术、生活与思考，分享有价值的内容
        </p>
      </section>

      <div className="flex flex-col lg:flex-row gap-8">
        <aside className="lg:w-64 space-y-6">
          <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-200 dark:border-gray-700">
            <h3 className="font-semibold mb-4 flex items-center gap-2">
              <TagIcon className="w-5 h-5" />
              分类
            </h3>
            <ul className="space-y-2">
              <li>
                <Link
                  to="/"
                  className={`block px-3 py-2 rounded-lg transition-colors ${
                    !selectedCategory
                      ? 'bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300'
                      : 'hover:bg-gray-100 dark:hover:bg-gray-700'
                  }`}
                >
                  全部
                </Link>
              </li>
              {categories.map((category) => (
                <li key={category.id}>
                  <Link
                    to={`?category=${category.slug}`}
                    className={`block px-3 py-2 rounded-lg transition-colors ${
                      selectedCategory === category.slug
                        ? 'bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300'
                        : 'hover:bg-gray-100 dark:hover:bg-gray-700'
                    }`}
                  >
                    {category.name}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-200 dark:border-gray-700">
            <h3 className="font-semibold mb-4">热门标签</h3>
            <div className="flex flex-wrap gap-2">
              {tags.map((tag) => (
                <Link
                  key={tag.id}
                  to={`?tag=${tag.slug}`}
                  className={`px-3 py-1 rounded-full text-sm transition-colors ${
                    selectedTag === tag.slug
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600'
                  }`}
                >
                  {tag.name}
                </Link>
              ))}
            </div>
          </div>
        </aside>

        <div className="flex-1">
          {posts.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-gray-600 dark:text-gray-400">暂无文章</p>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {posts.map((post) => (
                  <article
                    key={post.id}
                    className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden hover:shadow-md transition-shadow"
                  >
                    {post.cover_image && (
                      <Link to={`/post/${post.id}`}>
                        <img
                          src={post.cover_image}
                          alt={post.title}
                          className="w-full h-48 object-cover"
                        />
                      </Link>
                    )}
                    <div className="p-6">
                      <Link to={`/post/${post.id}`}>
                        <h2 className="text-xl font-bold mb-2 hover:text-blue-600 dark:hover:text-blue-400 transition-colors line-clamp-2">
                          {post.title}
                        </h2>
                      </Link>
                      <p className="text-gray-600 dark:text-gray-400 mb-4 line-clamp-3">
                        {post.excerpt}
                      </p>
                      <div className="flex items-center justify-between text-sm text-gray-500 dark:text-gray-500">
                        <div className="flex items-center gap-4">
                          <span className="flex items-center gap-1">
                            <User className="w-4 h-4" />
                            {post.author_display_name}
                          </span>
                          <span className="flex items-center gap-1">
                            <Calendar className="w-4 h-4" />
                            {format(new Date(post.published_at || post.created_at), 'yyyy-MM-dd')}
                          </span>
                        </div>
                        <span className="flex items-center gap-1">
                          <Eye className="w-4 h-4" />
                          {post.view_count}
                        </span>
                      </div>
                    </div>
                  </article>
                ))}
              </div>

              {pagination && pagination.totalPages > 1 && (
                <div className="flex justify-center gap-2 mt-8">
                  {Array.from({ length: pagination.totalPages }, (_, i) => i + 1).map((pageNum) => (
                    <Link
                      key={pageNum}
                      to={`?page=${pageNum}${selectedCategory ? `&category=${selectedCategory}` : ''}${selectedTag ? `&tag=${selectedTag}` : ''}`}
                      className={`px-4 py-2 rounded-lg transition-colors ${
                        pageNum === page
                          ? 'bg-blue-600 text-white'
                          : 'bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600'
                      }`}
                    >
                      {pageNum}
                    </Link>
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
