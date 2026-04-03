import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Link } from 'react-router-dom';
import { ChevronLeft, ChevronRight, Calendar, Clock, Star, ArrowRight } from 'lucide-react';
import { blogApi } from '@/lib/api/blog';
import type { BlogPost } from '@/types/blog';
import { useTranslation } from 'react-i18next';

export function BlogSection() {
  const { t } = useTranslation();
  const [posts, setPosts] = useState<BlogPost[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [isPaused, setIsPaused] = useState(false);

  // Fetch featured blog posts
  useEffect(() => {
    const fetchFeaturedPosts = async () => {
      try {
        const response = await blogApi.getPosts({
          type: 'featured',
          limit: 6, // Fetch more for carousel rotation
        });
        setPosts(response.data.filter(post => post.status === 'published'));
      } catch (error) {
        console.error('Failed to fetch featured blog posts:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchFeaturedPosts();
  }, []);

  // Auto-rotate carousel every 5 seconds
  useEffect(() => {
    if (posts.length <= 3 || isPaused) return;

    const interval = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % Math.max(1, posts.length - 2));
    }, 5000);

    return () => clearInterval(interval);
  }, [posts.length, isPaused]);

  const handlePrev = useCallback(() => {
    setCurrentIndex((prev) => (prev === 0 ? Math.max(0, posts.length - 3) : prev - 1));
  }, [posts.length]);

  const handleNext = useCallback(() => {
    setCurrentIndex((prev) => (prev + 1) % Math.max(1, posts.length - 2));
  }, [posts.length]);

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const getReadingTime = (content: string) => {
    return Math.max(1, Math.ceil((content?.length || 0) / 1000));
  };

  // Get visible posts based on current index
  const visiblePosts = posts.slice(currentIndex, currentIndex + 3);

  // Don't render section if no posts
  if (!isLoading && posts.length === 0) {
    return null;
  }

  return (
    <section className="py-20 px-4 bg-gradient-to-b from-white to-gray-50">
      <div className="max-w-7xl mx-auto">
        {/* Section Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-center mb-16"
        >
          <h2 className="text-4xl md:text-5xl font-bold mb-4">
            <span className="bg-gradient-to-r from-cyan-500 to-blue-500 bg-clip-text text-transparent">
              {t('blog.title')}
            </span>
          </h2>
          <p className="text-gray-600 text-lg max-w-2xl mx-auto">
            {t('blog.subtitle')}
          </p>
        </motion.div>

        {/* Loading State */}
        {isLoading && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {[1, 2, 3].map((i) => (
              <div key={i} className="bg-white rounded-2xl shadow-lg overflow-hidden animate-pulse">
                <div className="h-48 bg-gray-200" />
                <div className="p-6 space-y-4">
                  <div className="h-4 bg-gray-200 rounded w-1/4" />
                  <div className="h-6 bg-gray-200 rounded w-3/4" />
                  <div className="h-4 bg-gray-200 rounded w-full" />
                  <div className="h-4 bg-gray-200 rounded w-2/3" />
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Carousel */}
        {!isLoading && posts.length > 0 && (
          <div
            className="relative"
            onMouseEnter={() => setIsPaused(true)}
            onMouseLeave={() => setIsPaused(false)}
          >
            {/* Navigation Arrows */}
            {posts.length > 3 && (
              <>
                <button
                  onClick={handlePrev}
                  className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-4 z-10 p-3 bg-white rounded-full shadow-lg border border-gray-200 text-gray-600 hover:text-cyan-500 hover:border-cyan-500 transition-all opacity-0 group-hover:opacity-100 hover:opacity-100 focus:opacity-100"
                  aria-label="Previous posts"
                >
                  <ChevronLeft className="w-6 h-6" />
                </button>
                <button
                  onClick={handleNext}
                  className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-4 z-10 p-3 bg-white rounded-full shadow-lg border border-gray-200 text-gray-600 hover:text-cyan-500 hover:border-cyan-500 transition-all opacity-0 group-hover:opacity-100 hover:opacity-100 focus:opacity-100"
                  aria-label="Next posts"
                >
                  <ChevronRight className="w-6 h-6" />
                </button>
              </>
            )}

            {/* Cards Container */}
            <div className="overflow-hidden">
              <motion.div
                className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8"
                initial={false}
              >
                <AnimatePresence mode="popLayout">
                  {visiblePosts.map((post, index) => (
                    <motion.article
                      key={post.id}
                      initial={{ opacity: 0, x: 50 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -50 }}
                      transition={{ duration: 0.5, delay: index * 0.1 }}
                      className="group bg-white rounded-2xl shadow-lg border-2 border-gray-100 overflow-hidden hover:border-cyan-500/50 hover:shadow-xl transition-all duration-300"
                    >
                      <Link to={`/blog/${post.slug}`} className="block">
                        {/* Image */}
                        <div className="relative h-48 overflow-hidden">
                          {post.image_urls && post.image_urls.length > 0 ? (
                            <img
                              src={post.image_urls[0]}
                              alt={post.title}
                              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                            />
                          ) : (
                            <div className="w-full h-full bg-gradient-to-br from-cyan-500/20 to-blue-500/20 flex items-center justify-center">
                              <div className="text-cyan-500/50 text-6xl font-bold">
                                {post.title.charAt(0).toUpperCase()}
                              </div>
                            </div>
                          )}

                          {/* Category Badge */}
                          {post.category && (
                            <div className="absolute top-4 left-4">
                              <span className="px-3 py-1 bg-cyan-500 text-white text-xs font-medium rounded-full">
                                {post.category}
                              </span>
                            </div>
                          )}

                          {/* Featured Badge */}
                          {post.featured && (
                            <div className="absolute top-4 right-4">
                              <span className="px-3 py-1 bg-gradient-to-r from-cyan-500 to-blue-500 text-white text-xs font-medium rounded-full flex items-center gap-1">
                                <Star size={12} fill="currentColor" /> {t('blog.featured')}
                              </span>
                            </div>
                          )}
                        </div>

                        {/* Content */}
                        <div className="p-6">
                          {/* Meta */}
                          <div className="flex items-center gap-4 text-xs text-gray-400 mb-3">
                            <span className="flex items-center gap-1">
                              <Calendar size={12} />
                              {formatDate(post.published_at || post.created_at)}
                            </span>
                            <span className="flex items-center gap-1">
                              <Clock size={12} />
                              {getReadingTime(post.content)} {t('blog.minRead')}
                            </span>
                          </div>

                          {/* Title */}
                          <h3 className="text-xl font-semibold text-gray-900 group-hover:text-cyan-500 transition-colors mb-2 line-clamp-2">
                            {post.title}
                          </h3>

                          {/* Excerpt */}
                          {post.excerpt && (
                            <p className="text-gray-600 text-sm line-clamp-2 mb-4">
                              {post.excerpt}
                            </p>
                          )}

                          {/* Author */}
                          <div className="flex items-center justify-between pt-4 border-t border-gray-100">
                            <span className="text-sm text-gray-500">
                              {t('blog.by')} {post.author || 'Admin'}
                            </span>
                            <span className="text-cyan-500 text-sm font-medium group-hover:translate-x-1 transition-transform inline-flex items-center gap-1">
                              {t('blog.readMore')} <ArrowRight size={14} />
                            </span>
                          </div>
                        </div>
                      </Link>
                    </motion.article>
                  ))}
                </AnimatePresence>
              </motion.div>
            </div>

            {/* Navigation Dots */}
            {posts.length > 3 && (
              <div className="flex justify-center gap-2 mt-8">
                {Array.from({ length: Math.max(1, posts.length - 2) }).map((_, index) => (
                  <button
                    key={index}
                    onClick={() => setCurrentIndex(index)}
                    className={`w-2.5 h-2.5 rounded-full transition-all duration-300 ${
                      index === currentIndex
                        ? 'bg-cyan-500 w-8'
                        : 'bg-gray-300 hover:bg-gray-400'
                    }`}
                    aria-label={`Go to slide ${index + 1}`}
                  />
                ))}
              </div>
            )}
          </div>
        )}

        {/* View All Button */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, delay: 0.3 }}
          className="text-center mt-12"
        >
          <Link
            to="/blog"
            className="inline-flex items-center gap-2 px-8 py-4 bg-gradient-to-r from-cyan-500 to-blue-500 text-white font-semibold rounded-full hover:from-cyan-600 hover:to-blue-600 transition-all shadow-lg hover:shadow-cyan-500/25"
          >
            {t('blog.viewAllPosts')}
            <ArrowRight className="w-5 h-5" />
          </Link>
        </motion.div>
      </div>
    </section>
  );
}

export default BlogSection;
