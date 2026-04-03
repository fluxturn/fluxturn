import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  Plus,
  Edit,
  Trash2,
  Eye,
  EyeOff,
  Calendar,
  MessageCircle,
  Star,
  RefreshCw,
  ArrowLeft,
  FileText,
} from 'lucide-react';
import { useMyBlogPosts, useDeleteBlogPost, useUpdateBlogPost } from '../../hooks/useBlog';
import { useAuth } from '../../contexts/AuthContext';
import type { BlogQueryParams } from '../../types/blog';

const MyBlogs: React.FC = () => {
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin';
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [page, setPage] = useState(1);

  const queryParams: BlogQueryParams = {
    page,
    limit: 10,
    status: statusFilter !== 'all' ? statusFilter as 'draft' | 'published' : undefined,
  };

  const { data: postsData, isLoading, refetch } = useMyBlogPosts(queryParams);
  const deletePost = useDeleteBlogPost();
  const updatePost = useUpdateBlogPost();

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const handleDelete = async (id: string, title: string) => {
    if (window.confirm(`Are you sure you want to delete "${title}"?`)) {
      try {
        await deletePost.mutateAsync(id);
        refetch();
      } catch (error) {
        console.error('Failed to delete post:', error);
        alert('Failed to delete post');
      }
    }
  };

  const handleToggleStatus = async (id: string, currentStatus: string) => {
    const newStatus = currentStatus === 'published' ? 'draft' : 'published';
    try {
      await updatePost.mutateAsync({
        id,
        data: { status: newStatus },
      });
      refetch();
    } catch (error) {
      console.error('Failed to update status:', error);
      alert('Failed to update post status');
    }
  };

  if (!isAdmin) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Access Denied</h1>
          <p className="text-gray-500 mb-6">
            Only administrators can access this page.
          </p>
          <Link
            to="/blog"
            className="px-4 py-2 bg-cyan-500 text-white rounded-lg hover:bg-cyan-600 transition-colors"
          >
            Back to Blog
          </Link>
        </div>
      </div>
    );
  }

  const posts = postsData?.data || [];
  const totalPages = postsData?.total_pages || 1;

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <Link
              to="/blog"
              className="inline-flex items-center gap-2 text-gray-500 hover:text-cyan-600 transition-colors mb-4"
            >
              <ArrowLeft size={18} />
              Back to Blog
            </Link>
            <h1 className="text-3xl font-bold text-gray-900">
              My{' '}
              <span className="bg-gradient-to-r from-cyan-500 to-blue-500 bg-clip-text text-transparent">
                Posts
              </span>
            </h1>
          </div>

          <Link
            to="/blog/create"
            className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-cyan-500 to-blue-500 text-white rounded-lg font-medium hover:from-cyan-600 hover:to-blue-600 transition-all shadow-lg shadow-cyan-500/30"
          >
            <Plus size={18} />
            New Post
          </Link>
        </div>

        {/* Filters */}
        <div className="flex gap-2 mb-6">
          {['all', 'published', 'draft'].map((status) => (
            <button
              key={status}
              onClick={() => {
                setStatusFilter(status);
                setPage(1);
              }}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                statusFilter === status
                  ? 'bg-cyan-500 text-white'
                  : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50 hover:text-gray-900'
              }`}
            >
              {status.charAt(0).toUpperCase() + status.slice(1)}
            </button>
          ))}
        </div>

        {/* Posts List */}
        {isLoading ? (
          <div className="flex items-center justify-center py-20">
            <RefreshCw size={32} className="text-cyan-500 animate-spin" />
          </div>
        ) : posts.length === 0 ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-center py-20 bg-white border border-gray-200 rounded-xl shadow-sm"
          >
            <FileText size={48} className="mx-auto text-gray-300 mb-4" />
            <p className="text-gray-500 mb-4">
              {statusFilter === 'all'
                ? "You haven't created any posts yet."
                : `No ${statusFilter} posts found.`}
            </p>
            <Link
              to="/blog/create"
              className="inline-flex items-center gap-2 px-4 py-2 bg-cyan-500 text-white rounded-lg hover:bg-cyan-600 transition-colors"
            >
              <Plus size={16} />
              Create Your First Post
            </Link>
          </motion.div>
        ) : (
          <div className="space-y-4">
            {posts.map((post, index) => (
              <motion.div
                key={post.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
                className="bg-white border border-gray-200 rounded-xl p-5 hover:border-gray-300 hover:shadow-md transition-all"
              >
                <div className="flex items-start justify-between gap-4">
                  {/* Post Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3 mb-2">
                      <span
                        className={`px-2 py-0.5 text-xs font-medium rounded-full ${
                          post.status === 'published'
                            ? 'bg-green-100 text-green-600'
                            : 'bg-yellow-100 text-yellow-600'
                        }`}
                      >
                        {post.status}
                      </span>
                      {post.featured && (
                        <span className="px-2 py-0.5 text-xs font-medium rounded-full bg-cyan-100 text-cyan-600">
                          Featured
                        </span>
                      )}
                      {post.category && (
                        <span className="text-xs text-gray-400">{post.category}</span>
                      )}
                    </div>

                    <h3 className="text-lg font-semibold text-gray-900 mb-2 truncate">
                      {post.title}
                    </h3>

                    {post.excerpt && (
                      <p className="text-sm text-gray-500 line-clamp-2 mb-3">
                        {post.excerpt}
                      </p>
                    )}

                    <div className="flex flex-wrap items-center gap-4 text-xs text-gray-400">
                      <span className="flex items-center gap-1">
                        <Calendar size={12} />
                        {formatDate(post.created_at)}
                      </span>
                      <span className="flex items-center gap-1">
                        <Eye size={12} />
                        {post.views_count || 0} views
                      </span>
                      <span className="flex items-center gap-1">
                        <MessageCircle size={12} />
                        {post.comments_count || 0} comments
                      </span>
                      {post.rating > 0 && (
                        <span className="flex items-center gap-1 text-yellow-500">
                          <Star size={12} fill="currentColor" />
                          {post.rating.toFixed(1)}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <button
                      onClick={() => handleToggleStatus(post.id, post.status)}
                      className={`p-2 rounded-lg transition-colors ${
                        post.status === 'published'
                          ? 'bg-yellow-100 text-yellow-600 hover:bg-yellow-200'
                          : 'bg-green-100 text-green-600 hover:bg-green-200'
                      }`}
                      title={post.status === 'published' ? 'Unpublish' : 'Publish'}
                    >
                      {post.status === 'published' ? (
                        <EyeOff size={16} />
                      ) : (
                        <Eye size={16} />
                      )}
                    </button>

                    <Link
                      to={`/blog/edit/${post.id}`}
                      className="p-2 bg-gray-100 text-gray-600 rounded-lg hover:bg-gray-200 hover:text-gray-900 transition-colors"
                      title="Edit"
                    >
                      <Edit size={16} />
                    </Link>

                    {post.status === 'published' && (
                      <Link
                        to={`/blog/${post.slug}`}
                        className="p-2 bg-cyan-100 text-cyan-600 rounded-lg hover:bg-cyan-200 transition-colors"
                        title="View"
                        target="_blank"
                      >
                        <Eye size={16} />
                      </Link>
                    )}

                    <button
                      onClick={() => handleDelete(post.id, post.title)}
                      className="p-2 bg-red-100 text-red-600 rounded-lg hover:bg-red-200 transition-colors"
                      title="Delete"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex justify-center items-center gap-2 mt-8">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
              className="px-4 py-2 bg-white border border-gray-200 text-gray-700 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 transition-colors"
            >
              Previous
            </button>
            <span className="px-4 py-2 text-gray-500">
              Page {page} of {totalPages}
            </span>
            <button
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
              className="px-4 py-2 bg-white border border-gray-200 text-gray-700 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 transition-colors"
            >
              Next
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default MyBlogs;
