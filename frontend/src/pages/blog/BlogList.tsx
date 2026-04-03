import React, { useState, useMemo } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  Plus,
  BookOpen,
  RefreshCw,
  Search,
  Clock,
  TrendingUp,
  Award,
  Filter,
  Folder,
  ChevronRight,
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useBlogPosts, useBlogCategories } from '../../hooks/useBlog';
import { BlogCard } from '../../components/blog';
import { useAuth } from '../../contexts/AuthContext';
import type { BlogQueryParams, BlogType } from '../../types/blog';
import { SEO } from '../../components/SEO';

const BlogList: React.FC = () => {
  const { t } = useTranslation();
  const [searchParams, setSearchParams] = useSearchParams();
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin';

  // Parse query params
  const initialType = (searchParams.get('type') as BlogType) || 'latest';
  const initialCategory = searchParams.get('category') || undefined;
  const initialSearch = searchParams.get('search') || '';
  const initialPage = parseInt(searchParams.get('page') || '1', 10);

  const [selectedType, setSelectedType] = useState<BlogType>(initialType);
  const [selectedCategory, setSelectedCategory] = useState<string | undefined>(initialCategory);
  const [searchQuery, setSearchQuery] = useState(initialSearch);
  const [page, setPage] = useState(initialPage);

  // Build query params
  const queryParams: BlogQueryParams = useMemo(() => ({
    page,
    limit: 9,
    type: selectedType,
    category: selectedCategory,
    search: searchQuery || undefined,
    status: 'published',
  }), [page, selectedType, selectedCategory, searchQuery]);

  // Fetch data
  const { data: postsData, isLoading, isError, refetch } = useBlogPosts(queryParams);
  const { data: categories } = useBlogCategories();

  // Update URL when filters change
  const updateFilters = (type: BlogType, category?: string, search?: string, newPage?: number) => {
    const params = new URLSearchParams();
    if (type && type !== 'latest') params.set('type', type);
    if (category) params.set('category', category);
    if (search) params.set('search', search);
    if (newPage && newPage > 1) params.set('page', String(newPage));
    setSearchParams(params);
  };

  const handleTypeSelect = (type: BlogType) => {
    setSelectedType(type);
    setPage(1);
    updateFilters(type, selectedCategory, searchQuery, 1);
  };

  const handleCategorySelect = (category: string | undefined) => {
    setSelectedCategory(category);
    setPage(1);
    updateFilters(selectedType, category, searchQuery, 1);
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    updateFilters(selectedType, selectedCategory, searchQuery, 1);
  };

  const handlePageChange = (newPage: number) => {
    setPage(newPage);
    updateFilters(selectedType, selectedCategory, searchQuery, newPage);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const posts = postsData?.data || [];
  const totalPages = postsData?.total_pages || 1;

  const browseOptions = [
    { id: 'latest' as BlogType, nameKey: 'blogPage.browse.latest', icon: Clock },
    { id: 'popular' as BlogType, nameKey: 'blogPage.browse.popular', icon: TrendingUp },
    { id: 'featured' as BlogType, nameKey: 'blogPage.browse.featured', icon: Award },
    { id: 'all' as BlogType, nameKey: 'blogPage.browse.allPosts', icon: Filter },
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      <SEO
        title="Blog"
        description="Read the latest articles about workflow automation, productivity tips, integration guides, and FluxTurn updates."
        canonical="/blog"
      />
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Compact Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center">
              <BookOpen size={24} className="text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">{t('blogPage.title')}</h1>
              <p className="text-sm text-gray-500">{t('blogPage.subtitle')}</p>
            </div>
          </div>

          {/* Admin Actions */}
          {isAdmin && (
            <div className="flex gap-3">
              <Link
                to="/blog/create"
                className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-cyan-500 to-blue-500 text-white text-sm rounded-lg font-medium hover:from-cyan-600 hover:to-blue-600 transition-all"
              >
                <Plus size={16} />
                {t('blogPage.newPost')}
              </Link>
              <Link
                to="/blog/my-posts"
                className="flex items-center gap-2 px-4 py-2 bg-white text-gray-700 text-sm rounded-lg font-medium hover:bg-gray-100 transition-all border border-gray-200 shadow-sm"
              >
                {t('blogPage.myPosts')}
              </Link>
            </div>
          )}
        </div>

        <div className="flex gap-6">
          {/* Sidebar */}
          <aside className="w-72 flex-shrink-0 space-y-4">
            {/* Search */}
            <div className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm">
              <form onSubmit={handleSearch} className="relative">
                <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder={t('blogPage.search.placeholder')}
                  className="w-full bg-gray-50 border border-gray-200 rounded-lg pl-10 pr-4 py-2.5 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-transparent"
                />
              </form>
            </div>

            {/* Browse */}
            <div className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm">
              <h3 className="flex items-center gap-2 text-sm font-semibold text-gray-900 mb-3">
                <span className="text-cyan-500">☰</span>
                {t('blogPage.browse.title')}
              </h3>
              <nav className="space-y-1">
                {browseOptions.map((option) => {
                  const Icon = option.icon;
                  const isActive = selectedType === option.id;
                  return (
                    <button
                      key={option.id}
                      onClick={() => handleTypeSelect(option.id)}
                      className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-sm transition-all ${
                        isActive
                          ? 'bg-cyan-50 text-cyan-600 border border-cyan-200'
                          : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                      }`}
                    >
                      <span className="flex items-center gap-2.5">
                        <Icon size={16} />
                        {t(option.nameKey)}
                      </span>
                      {isActive && <ChevronRight size={16} />}
                    </button>
                  );
                })}
              </nav>
            </div>

            {/* Categories */}
            <div className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm">
              <h3 className="flex items-center gap-2 text-sm font-semibold text-gray-900 mb-3">
                <Folder size={16} className="text-cyan-500" />
                {t('blogPage.categories.title')}
              </h3>
              <nav className="space-y-1">
                <button
                  onClick={() => handleCategorySelect(undefined)}
                  className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-all ${
                    !selectedCategory
                      ? 'bg-cyan-50 text-cyan-600'
                      : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                  }`}
                >
                  {t('blogPage.categories.all')}
                </button>
                {categories?.map((category) => (
                  <button
                    key={category.id}
                    onClick={() => handleCategorySelect(category.slug)}
                    className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-all ${
                      selectedCategory === category.slug
                        ? 'bg-cyan-50 text-cyan-600'
                        : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                    }`}
                  >
                    {category.name}
                  </button>
                ))}
              </nav>
            </div>
          </aside>

          {/* Main Content */}
          <main className="flex-1 min-w-0">
            <div className="bg-white border border-gray-200 rounded-xl p-6 min-h-[500px] shadow-sm">
              {isLoading ? (
                <div className="flex items-center justify-center py-20">
                  <RefreshCw size={32} className="text-cyan-500 animate-spin" />
                </div>
              ) : isError ? (
                <div className="text-center py-20">
                  <p className="text-red-500 mb-4">{t('blogPage.error.loadFailed')}</p>
                  <button
                    onClick={() => refetch()}
                    className="px-4 py-2 bg-cyan-500 text-white rounded-lg hover:bg-cyan-600 transition-colors"
                  >
                    {t('blogPage.error.tryAgain')}
                  </button>
                </div>
              ) : posts.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-20">
                  <div className="w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center mb-4">
                    <BookOpen size={32} className="text-cyan-500" />
                  </div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">{t('blogPage.empty.title')}</h3>
                  <p className="text-gray-500 text-sm">{t('blogPage.empty.subtitle')}</p>
                </div>
              ) : (
                <>
                  {/* Posts Grid */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {posts.map((post, index) => (
                      <motion.div
                        key={post.id}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: index * 0.05 }}
                      >
                        <BlogCard post={post} />
                      </motion.div>
                    ))}
                  </div>

                  {/* Pagination */}
                  {totalPages > 1 && (
                    <div className="flex justify-center items-center gap-2 mt-8 pt-6 border-t border-gray-200">
                      <button
                        onClick={() => handlePageChange(page - 1)}
                        disabled={page === 1}
                        className="px-4 py-2 bg-white border border-gray-200 text-gray-700 text-sm rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 transition-colors"
                      >
                        {t('blogPage.pagination.previous')}
                      </button>
                      <div className="flex items-center gap-1">
                        {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => {
                          const pageNum = i + 1;
                          return (
                            <button
                              key={pageNum}
                              onClick={() => handlePageChange(pageNum)}
                              className={`w-9 h-9 rounded-lg text-sm font-medium transition-colors ${
                                pageNum === page
                                  ? 'bg-cyan-500 text-white'
                                  : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                              }`}
                            >
                              {pageNum}
                            </button>
                          );
                        })}
                      </div>
                      <button
                        onClick={() => handlePageChange(page + 1)}
                        disabled={page === totalPages}
                        className="px-4 py-2 bg-white border border-gray-200 text-gray-700 text-sm rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 transition-colors"
                      >
                        {t('blogPage.pagination.next')}
                      </button>
                    </div>
                  )}
                </>
              )}
            </div>
          </main>
        </div>
      </div>
    </div>
  );
};

export default BlogList;
