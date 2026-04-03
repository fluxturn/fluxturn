import React from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Calendar, Eye, MessageCircle, Star, Clock } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import type { BlogPost } from '../../types/blog';

interface BlogCardProps {
  post: BlogPost;
  featured?: boolean;
}

export const BlogCard: React.FC<BlogCardProps> = ({ post, featured = false }) => {
  const { t, i18n } = useTranslation();

  const formatDate = (dateString: string) => {
    const locale = i18n.language === 'ja' ? 'ja-JP' : 'en-US';
    return new Date(dateString).toLocaleDateString(locale, {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const readingTime = Math.ceil((post.content?.length || 0) / 1000);

  return (
    <motion.article
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="group relative bg-white border border-gray-200 rounded-xl overflow-hidden hover:border-cyan-300 hover:shadow-lg transition-all duration-300 h-[420px] flex flex-col"
    >
      <Link to={`/blog/${post.slug}`} className="flex flex-col h-full">
        {/* Image */}
        <div className="relative overflow-hidden h-48 flex-shrink-0">
          {post.image_urls && post.image_urls.length > 0 ? (
            <img
              src={post.image_urls[0]}
              alt={post.title}
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
            />
          ) : (
            <div className="w-full h-full bg-gradient-to-br from-cyan-50 to-blue-50 flex items-center justify-center">
              <div className="text-cyan-300 text-6xl font-bold">
                {post.title.charAt(0).toUpperCase()}
              </div>
            </div>
          )}

          {/* Category Badge */}
          {post.category && (
            <div className="absolute top-4 left-4">
              <span className="px-3 py-1 bg-cyan-500/90 text-white text-xs font-medium rounded-full">
                {post.category}
              </span>
            </div>
          )}

          {/* Featured Badge */}
          {post.featured && (
            <div className="absolute top-4 right-4">
              <span className="px-3 py-1 bg-gradient-to-r from-cyan-500 to-blue-500 text-white text-xs font-medium rounded-full flex items-center gap-1">
                <Star size={12} fill="currentColor" /> {t('blogPage.post.featured')}
              </span>
            </div>
          )}
        </div>

        {/* Content */}
        <div className="p-5 flex flex-col flex-1">
          {/* Meta Info */}
          <div className="flex items-center gap-4 text-xs text-gray-500 mb-2">
            <span className="flex items-center gap-1">
              <Calendar size={12} />
              {formatDate(post.published_at || post.created_at)}
            </span>
            <span className="flex items-center gap-1">
              <Clock size={12} />
              {readingTime} {t('blogPage.card.minRead')}
            </span>
          </div>

          {/* Title */}
          <h3 className="font-bold text-gray-900 group-hover:text-cyan-600 transition-colors mb-2 line-clamp-2 text-lg">
            {post.title}
          </h3>

          {/* Excerpt */}
          <p className="text-gray-500 text-sm line-clamp-2 mb-3 flex-1">
            {post.excerpt || 'No description available.'}
          </p>

          {/* Footer Stats */}
          <div className="flex items-center justify-between pt-3 border-t border-gray-100 mt-auto">
            <div className="flex items-center gap-3 text-xs text-gray-500">
              <span className="flex items-center gap-1">
                <Eye size={14} />
                {post.views_count || 0}
              </span>
              <span className="flex items-center gap-1">
                <MessageCircle size={14} />
                {post.comments_count || 0}
              </span>
              {post.rating && post.rating > 0 && (
                <span className="flex items-center gap-1 text-yellow-500">
                  <Star size={14} fill="currentColor" />
                  {post.rating.toFixed(1)}
                </span>
              )}
            </div>

            <span className="text-xs text-gray-400 truncate max-w-[120px]">
              {t('blogPage.card.by')} {post.author || 'Admin'}
            </span>
          </div>

          {/* Tags */}
          {post.tags && post.tags.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mt-3">
              {post.tags.slice(0, 3).map((tag) => (
                <span
                  key={tag}
                  className="px-2 py-0.5 bg-gray-100 text-gray-500 text-xs rounded"
                >
                  #{tag}
                </span>
              ))}
            </div>
          )}
        </div>
      </Link>
    </motion.article>
  );
};

export default BlogCard;
