import React, { useState, useMemo, useRef, useEffect } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  ArrowLeft,
  Save,
  Eye,
  X,
  Upload,
  RefreshCw,
} from 'lucide-react';
import JoditEditor from 'jodit-react';
import {
  useBlogPost,
  useUpdateBlogPost,
  useBlogCategories,
  useUploadBlogImages,
} from '../../hooks/useBlog';
import { useAuth } from '../../contexts/AuthContext';
import type { UpdateBlogPostDto } from '../../types/blog';

const UpdateBlog: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin';
  const editor = useRef(null);

  const { data: post, isLoading: isLoadingPost } = useBlogPost(id || null);
  const updatePost = useUpdateBlogPost();
  const uploadImages = useUploadBlogImages();
  const { data: categories } = useBlogCategories();

  const [formData, setFormData] = useState<UpdateBlogPostDto>({
    title: '',
    content: '',
    excerpt: '',
    category: '',
    tags: [],
    status: 'draft',
    featured: false,
    meta_title: '',
    meta_description: '',
  });
  const [tagInput, setTagInput] = useState('');
  const [imageUrls, setImageUrls] = useState<string[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [isInitialized, setIsInitialized] = useState(false);

  // Initialize form data when post loads
  useEffect(() => {
    if (post && !isInitialized) {
      setFormData({
        title: post.title || '',
        content: post.content || '',
        excerpt: post.excerpt || '',
        category: post.category || '',
        tags: post.tags || [],
        status: post.status || 'draft',
        featured: post.featured || false,
        meta_title: post.meta_title || '',
        meta_description: post.meta_description || '',
      });
      setImageUrls(post.image_urls || []);
      setIsInitialized(true);
    }
  }, [post, isInitialized]);

  const editorConfig = useMemo(
    () => ({
      readonly: false,
      theme: 'default',
      height: 500,
      placeholder: 'Start writing your blog post...',
      style: {
        color: '#1f2937',
        background: '#ffffff',
      },
      buttons: [
        'bold',
        'italic',
        'underline',
        'strikethrough',
        '|',
        'ul',
        'ol',
        '|',
        'paragraph',
        'fontsize',
        '|',
        'image',
        'link',
        'table',
        '|',
        'align',
        '|',
        'undo',
        'redo',
        '|',
        'source',
      ],
      uploader: {
        insertImageAsBase64URI: true,
      },
      toolbarAdaptive: false,
    }),
    []
  );

  if (!isAdmin) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Access Denied</h1>
          <p className="text-gray-500 mb-6">
            Only administrators can edit blog posts.
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

  if (isLoadingPost) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <RefreshCw size={32} className="text-cyan-500 animate-spin" />
      </div>
    );
  }

  if (!post) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Post Not Found</h1>
          <p className="text-gray-500 mb-6">
            The blog post you're trying to edit doesn't exist.
          </p>
          <Link
            to="/blog/my-posts"
            className="px-4 py-2 bg-cyan-500 text-white rounded-lg hover:bg-cyan-600 transition-colors"
          >
            My Posts
          </Link>
        </div>
      </div>
    );
  }

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    const { name, value, type } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: type === 'checkbox' ? (e.target as HTMLInputElement).checked : value,
    }));
  };

  const handleContentChange = (newContent: string) => {
    setFormData((prev) => ({ ...prev, content: newContent }));
  };

  const handleAddTag = () => {
    const tag = tagInput.trim().toLowerCase();
    if (tag && !formData.tags?.includes(tag)) {
      setFormData((prev) => ({
        ...prev,
        tags: [...(prev.tags || []), tag],
      }));
      setTagInput('');
    }
  };

  const handleRemoveTag = (tagToRemove: string) => {
    setFormData((prev) => ({
      ...prev,
      tags: prev.tags?.filter((tag) => tag !== tagToRemove) || [],
    }));
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setIsUploading(true);
    try {
      const result = await uploadImages.mutateAsync(Array.from(files));
      setImageUrls((prev) => [...prev, ...result.urls]);
    } catch (error) {
      console.error('Failed to upload images:', error);
      alert('Failed to upload images');
    } finally {
      setIsUploading(false);
    }
  };

  const handleRemoveImage = (url: string) => {
    setImageUrls((prev) => prev.filter((u) => u !== url));
  };

  const handleSubmit = async (status: 'draft' | 'published') => {
    if (!formData.title?.trim()) {
      alert('Please enter a title');
      return;
    }
    if (!formData.content?.trim()) {
      alert('Please enter content');
      return;
    }

    try {
      await updatePost.mutateAsync({
        id: id!,
        data: {
          ...formData,
          status,
          image_urls: imageUrls,
        },
      });
      navigate('/blog/my-posts');
    } catch (error) {
      console.error('Failed to update post:', error);
      alert('Failed to update post');
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <Link
            to="/blog/my-posts"
            className="inline-flex items-center gap-2 text-gray-500 hover:text-cyan-600 transition-colors"
          >
            <ArrowLeft size={18} />
            Back to My Posts
          </Link>

          <div className="flex items-center gap-3">
            <button
              onClick={() => handleSubmit('draft')}
              disabled={updatePost.isPending}
              className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50 shadow-sm"
            >
              <Save size={16} />
              Save Draft
            </button>
            <button
              onClick={() => handleSubmit('published')}
              disabled={updatePost.isPending}
              className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-cyan-500 to-blue-500 text-white rounded-lg hover:from-cyan-600 hover:to-blue-600 transition-all disabled:opacity-50 shadow-lg shadow-cyan-500/30"
            >
              {updatePost.isPending ? (
                <RefreshCw size={16} className="animate-spin" />
              ) : (
                <Eye size={16} />
              )}
              {post.status === 'published' ? 'Update' : 'Publish'}
            </button>
          </div>
        </div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-6"
        >
          {/* Title */}
          <div>
            <input
              type="text"
              name="title"
              value={formData.title}
              onChange={handleChange}
              placeholder="Enter post title..."
              className="w-full text-3xl font-bold bg-transparent text-gray-900 placeholder-gray-400 border-none outline-none focus:ring-0"
            />
          </div>

          {/* Excerpt */}
          <div>
            <textarea
              name="excerpt"
              value={formData.excerpt}
              onChange={handleChange}
              placeholder="Brief description of your post..."
              rows={2}
              className="w-full bg-white border border-gray-200 rounded-lg px-4 py-3 text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-cyan-500 resize-none shadow-sm"
            />
          </div>

          {/* Category & Featured */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-600 mb-2">
                Category
              </label>
              <select
                name="category"
                value={formData.category}
                onChange={handleChange}
                className="w-full bg-white border border-gray-200 rounded-lg px-4 py-2.5 text-gray-900 focus:outline-none focus:ring-2 focus:ring-cyan-500 shadow-sm"
              >
                <option value="">Select a category</option>
                {categories?.map((cat) => (
                  <option key={cat.id} value={cat.name}>
                    {cat.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex items-end">
              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  name="featured"
                  checked={formData.featured}
                  onChange={handleChange}
                  className="w-5 h-5 rounded bg-white border-gray-300 text-cyan-500 focus:ring-cyan-500"
                />
                <span className="text-gray-900">Featured Post</span>
              </label>
            </div>
          </div>

          {/* Tags */}
          <div>
            <label className="block text-sm font-medium text-gray-600 mb-2">
              Tags
            </label>
            <div className="flex flex-wrap gap-2 mb-2">
              {formData.tags?.map((tag) => (
                <span
                  key={tag}
                  className="flex items-center gap-1 px-3 py-1 bg-cyan-50 text-cyan-600 rounded-full text-sm border border-cyan-200"
                >
                  #{tag}
                  <button
                    onClick={() => handleRemoveTag(tag)}
                    className="hover:text-cyan-800"
                  >
                    <X size={14} />
                  </button>
                </span>
              ))}
            </div>
            <div className="flex gap-2">
              <input
                type="text"
                value={tagInput}
                onChange={(e) => setTagInput(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddTag())}
                placeholder="Add a tag..."
                className="flex-1 bg-white border border-gray-200 rounded-lg px-4 py-2 text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-cyan-500 shadow-sm"
              />
              <button
                onClick={handleAddTag}
                className="px-4 py-2 bg-white border border-gray-200 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors shadow-sm"
              >
                Add
              </button>
            </div>
          </div>

          {/* Images */}
          <div>
            <label className="block text-sm font-medium text-gray-600 mb-2">
              Featured Images
            </label>
            <div className="flex flex-wrap gap-4 mb-4">
              {imageUrls.map((url, index) => (
                <div key={index} className="relative group">
                  <img
                    src={url}
                    alt={`Upload ${index + 1}`}
                    className="w-32 h-24 object-cover rounded-lg border border-gray-200 shadow-sm"
                  />
                  <button
                    onClick={() => handleRemoveImage(url)}
                    className="absolute -top-2 -right-2 w-6 h-6 bg-red-500 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <X size={14} />
                  </button>
                </div>
              ))}
              <label className="w-32 h-24 border-2 border-dashed border-gray-300 rounded-lg flex flex-col items-center justify-center cursor-pointer hover:border-cyan-500 transition-colors bg-white">
                {isUploading ? (
                  <RefreshCw size={24} className="text-gray-400 animate-spin" />
                ) : (
                  <>
                    <Upload size={24} className="text-gray-400 mb-1" />
                    <span className="text-xs text-gray-400">Upload</span>
                  </>
                )}
                <input
                  type="file"
                  multiple
                  accept="image/*"
                  onChange={handleImageUpload}
                  className="hidden"
                  disabled={isUploading}
                />
              </label>
            </div>
          </div>

          {/* Content Editor */}
          <div>
            <label className="block text-sm font-medium text-gray-600 mb-2">
              Content
            </label>
            <div className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
              <JoditEditor
                ref={editor}
                value={formData.content || ''}
                config={editorConfig}
                onBlur={handleContentChange}
              />
            </div>
          </div>

          {/* SEO Section */}
          <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              SEO Settings (Optional)
            </h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-600 mb-2">
                  Meta Title
                </label>
                <input
                  type="text"
                  name="meta_title"
                  value={formData.meta_title}
                  onChange={handleChange}
                  placeholder="SEO optimized title"
                  className="w-full bg-gray-50 border border-gray-200 rounded-lg px-4 py-2 text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-cyan-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-600 mb-2">
                  Meta Description
                </label>
                <textarea
                  name="meta_description"
                  value={formData.meta_description}
                  onChange={handleChange}
                  placeholder="Brief description for search engines"
                  rows={2}
                  className="w-full bg-gray-50 border border-gray-200 rounded-lg px-4 py-2 text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-cyan-500 resize-none"
                />
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
};

export default UpdateBlog;
