import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ArrowLeft,
  Calendar,
  Clock,
  Eye,
  Edit,
  Trash2,
  RefreshCw,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import {
  useBlogPostBySlug,
  useBlogComments,
  useCreateComment,
  useRatePost,
  useDeleteBlogPost,
} from '../../hooks/useBlog';
import { RatingStars, CommentSection } from '../../components/blog';
import { useAuth } from '../../contexts/AuthContext';

const BlogPost: React.FC = () => {
  const { t, i18n } = useTranslation();
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const { user, isAuthenticated } = useAuth();
  const isAdmin = user?.role === 'admin';
  const [currentImageIndex, setCurrentImageIndex] = useState(0);

  const { data: post, isLoading, isError, refetch } = useBlogPostBySlug(slug || null);
  const { data: commentsData, refetch: refetchComments } = useBlogComments(post?.id || '');
  const createComment = useCreateComment();
  const ratePost = useRatePost();
  const deletePost = useDeleteBlogPost();

  const imageUrls = post?.image_urls || [];
  const hasMultipleImages = imageUrls.length > 1;

  const nextImage = () => {
    setCurrentImageIndex((prev) => (prev + 1) % imageUrls.length);
  };

  const prevImage = () => {
    setCurrentImageIndex((prev) => (prev - 1 + imageUrls.length) % imageUrls.length);
  };

  // Auto-rotate images every 5 seconds
  useEffect(() => {
    if (!hasMultipleImages) return;

    const interval = setInterval(() => {
      setCurrentImageIndex((prev) => (prev + 1) % imageUrls.length);
    }, 5000);

    return () => clearInterval(interval);
  }, [hasMultipleImages, imageUrls.length]);

  const formatDate = (dateString: string) => {
    const locale = i18n.language === 'ja' ? 'ja-JP' : 'en-US';
    return new Date(dateString).toLocaleDateString(locale, {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  const readingTime = Math.ceil((post?.content?.length || 0) / 1000);

  const handleCommentSubmit = async (content: string, parentId?: string) => {
    if (!post?.id) return;

    try {
      await createComment.mutateAsync({
        postId: post.id,
        data: {
          content,
          parent_comment_id: parentId,
        },
      });
      refetchComments();
    } catch (error) {
      console.error('Failed to submit comment:', error);
    }
  };

  const handleRate = async (rating: number) => {
    if (!post?.id || !isAuthenticated) return;

    try {
      await ratePost.mutateAsync({ postId: post.id, rating });
      refetch();
    } catch (error) {
      console.error('Failed to rate post:', error);
    }
  };

  const handleDelete = async () => {
    if (!post?.id) return;

    if (window.confirm(t('blogPage.post.deleteConfirm'))) {
      try {
        await deletePost.mutateAsync(post.id);
        navigate('/blog');
      } catch (error) {
        console.error('Failed to delete post:', error);
      }
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <RefreshCw size={32} className="text-cyan-500 animate-spin" />
      </div>
    );
  }

  if (isError || !post) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">{t('blogPage.post.notFound.title')}</h1>
          <p className="text-gray-500 mb-6">{t('blogPage.post.notFound.message')}</p>
          <Link
            to="/blog"
            className="px-4 py-2 bg-cyan-500 text-white rounded-lg hover:bg-cyan-600 transition-colors"
          >
            {t('blogPage.post.backToBlog')}
          </Link>
        </div>
      </div>
    );
  }

  const comments = commentsData?.data || [];

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header Image Carousel */}
      {imageUrls.length > 0 && (
        <div className="relative h-64 md:h-96 overflow-hidden group">
          <AnimatePresence mode="wait">
            <motion.img
              key={currentImageIndex}
              src={imageUrls[currentImageIndex]}
              alt={`${post.title} - Image ${currentImageIndex + 1}`}
              className="w-full h-full object-cover"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.3 }}
            />
          </AnimatePresence>
          <div className="absolute inset-0 bg-gradient-to-t from-gray-50 via-transparent to-transparent" />

          {/* Navigation Arrows */}
          {hasMultipleImages && (
            <>
              <button
                onClick={prevImage}
                className="absolute left-4 top-1/2 -translate-y-1/2 w-10 h-10 bg-white/80 hover:bg-white text-gray-700 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity shadow-lg"
              >
                <ChevronLeft size={24} />
              </button>
              <button
                onClick={nextImage}
                className="absolute right-4 top-1/2 -translate-y-1/2 w-10 h-10 bg-white/80 hover:bg-white text-gray-700 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity shadow-lg"
              >
                <ChevronRight size={24} />
              </button>
            </>
          )}

          {/* Image Indicators */}
          {hasMultipleImages && (
            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex items-center gap-2">
              {imageUrls.map((_, index) => (
                <button
                  key={index}
                  onClick={() => setCurrentImageIndex(index)}
                  className={`w-2 h-2 rounded-full transition-all ${
                    index === currentImageIndex
                      ? 'w-6 bg-cyan-500'
                      : 'bg-gray-400/50 hover:bg-gray-500/80'
                  }`}
                />
              ))}
            </div>
          )}
        </div>
      )}

      {/* Content */}
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Back Link */}
        <Link
          to="/blog"
          className="inline-flex items-center gap-2 text-gray-500 hover:text-cyan-600 transition-colors mb-8"
        >
          <ArrowLeft size={18} />
          {t('blogPage.post.backToBlog')}
        </Link>

        <motion.article
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          {/* Category & Featured Badge */}
          <div className="flex items-center gap-3 mb-4">
            {post.category && (
              <span className="px-3 py-1 bg-cyan-50 text-cyan-600 text-sm font-medium rounded-full border border-cyan-200">
                {post.category}
              </span>
            )}
            {post.featured && (
              <span className="px-3 py-1 bg-gradient-to-r from-cyan-500 to-blue-500 text-white text-sm font-medium rounded-full">
                {t('blogPage.post.featured')}
              </span>
            )}
          </div>

          {/* Title */}
          <h1 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
            {post.title}
          </h1>

          {/* Meta Info */}
          <div className="flex flex-wrap items-center gap-4 text-sm text-gray-500 mb-6">
            <span className="flex items-center gap-1">
              <Calendar size={16} />
              {formatDate(post.published_at || post.created_at)}
            </span>
            <span className="flex items-center gap-1">
              <Clock size={16} />
              {readingTime} {t('blogPage.post.minRead')}
            </span>
            <span className="flex items-center gap-1">
              <Eye size={16} />
              {post.views_count || 0} {t('blogPage.post.views')}
            </span>
            <span className="text-gray-400">{t('blogPage.post.by')} {post.author || 'Admin'}</span>
          </div>

          {/* Rating */}
          <div className="mb-8">
            <RatingStars
              rating={post.rating || 0}
              ratingCount={post.rating_count || 0}
              userRating={post.user_rating}
              onRate={isAuthenticated ? handleRate : undefined}
              readonly={!isAuthenticated}
              size="lg"
            />
            {!isAuthenticated && (
              <p className="text-xs text-gray-400 mt-2">
                <Link to="/login" className="text-cyan-600 hover:underline">
                  {t('blogPage.comments.signIn')}
                </Link>{' '}
                {t('blogPage.post.signInToRate')}
              </p>
            )}
          </div>

          {/* Admin Actions */}
          {isAdmin && (
            <div className="flex items-center gap-4 mb-8 pb-8 border-b border-gray-200">
              <Link
                to={`/blog/edit/${post.id}`}
                className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 text-gray-700 rounded-lg hover:bg-gray-50 hover:text-gray-900 transition-colors shadow-sm"
              >
                <Edit size={16} />
                {t('blogPage.post.edit')}
              </Link>
              <button
                onClick={handleDelete}
                className="flex items-center gap-2 px-4 py-2 bg-red-50 text-red-600 rounded-lg hover:bg-red-100 transition-colors border border-red-200"
              >
                <Trash2 size={16} />
                {t('blogPage.post.delete')}
              </button>
            </div>
          )}

          {/* Content */}
          <div
            className="blog-content prose prose-lg max-w-none mb-12
              prose-headings:text-gray-900 prose-headings:font-bold
              prose-p:text-gray-600 prose-p:leading-relaxed
              prose-a:text-cyan-600 prose-a:no-underline hover:prose-a:underline
              prose-strong:text-gray-900
              prose-code:text-cyan-600 prose-code:bg-gray-100 prose-code:px-1 prose-code:py-0.5 prose-code:rounded
              prose-pre:bg-gray-900 prose-pre:border prose-pre:border-gray-200
              prose-blockquote:border-l-cyan-500 prose-blockquote:bg-gray-50 prose-blockquote:py-1 prose-blockquote:px-4
              prose-img:rounded-lg prose-img:shadow-lg
              prose-ul:text-gray-600 prose-ol:text-gray-600
              prose-li:text-gray-600"
            dangerouslySetInnerHTML={{ __html: post.content }}
          />

          {/* Tags */}
          {post.tags && post.tags.length > 0 && (
            <div className="flex flex-wrap gap-2 mb-12 pb-8 border-b border-gray-200">
              {post.tags.map((tag) => (
                <Link
                  key={tag}
                  to={`/blog?tags=${tag}`}
                  className="px-3 py-1 bg-gray-100 text-gray-600 rounded-full text-sm hover:bg-gray-200 hover:text-gray-900 transition-colors"
                >
                  #{tag}
                </Link>
              ))}
            </div>
          )}

          {/* Comments */}
          <CommentSection
            comments={comments}
            onSubmitComment={handleCommentSubmit}
            isSubmitting={createComment.isPending}
            isAuthenticated={isAuthenticated}
            totalComments={post.comments_count || 0}
          />
        </motion.article>
      </div>
    </div>
  );
};

export default BlogPost;
