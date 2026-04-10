import { api } from '../api';
import type {
  BlogPost,
  BlogComment,
  BlogCategory,
  CreateBlogPostDto,
  UpdateBlogPostDto,
  CreateCommentDto,
  CreateCategoryDto,
  BlogQueryParams,
  CommentQueryParams,
  PaginatedResponse,
  RatingResponse,
  ImageUploadResponse,
  BlogStats,
  PopularTag,
} from '../../types/blog';

const BASE_URL = '/blog';

export const blogApi = {
  // PUBLIC ENDPOINTS

  async getPosts(params?: BlogQueryParams): Promise<PaginatedResponse<BlogPost>> {
    try {
      const queryString = params
        ? new URLSearchParams(
            Object.entries(params)
              .filter((entry) => entry[1] !== undefined && entry[1] !== null)
              .map(([k, v]) => [k, Array.isArray(v) ? v.join(',') : String(v)])
          ).toString()
        : '';
      const response = await api.get<PaginatedResponse<BlogPost>>(
        `${BASE_URL}/posts${queryString ? `?${queryString}` : ''}`
      );
      return response;
    } catch (error: unknown) {
      throw new Error((error instanceof Error ? error.message : undefined) || 'Failed to fetch blog posts');
    }
  },

  async getPostBySlug(slug: string): Promise<BlogPost> {
    try {
      const response = await api.get<BlogPost>(`${BASE_URL}/posts/slug/${slug}`);
      return response;
    } catch (error: unknown) {
      if ((error as { statusCode?: number }).statusCode === 404) {
        throw new Error('Blog post not found');
      }
      throw new Error((error instanceof Error ? error.message : undefined) || 'Failed to fetch blog post');
    }
  },

  async getPostById(id: string): Promise<BlogPost> {
    try {
      const response = await api.get<BlogPost>(`${BASE_URL}/posts/${id}`);
      return response;
    } catch (error: unknown) {
      if ((error as { statusCode?: number }).statusCode === 404) {
        throw new Error('Blog post not found');
      }
      throw new Error((error instanceof Error ? error.message : undefined) || 'Failed to fetch blog post');
    }
  },

  async getComments(
    postId: string,
    params?: CommentQueryParams
  ): Promise<PaginatedResponse<BlogComment>> {
    try {
      const queryString = params
        ? new URLSearchParams(
            Object.entries(params)
              .filter((entry) => entry[1] !== undefined && entry[1] !== null)
              .map(([k, v]) => [k, String(v)])
          ).toString()
        : '';
      const response = await api.get<PaginatedResponse<BlogComment>>(
        `${BASE_URL}/posts/${postId}/comments${queryString ? `?${queryString}` : ''}`
      );
      return response;
    } catch (error: unknown) {
      throw new Error((error instanceof Error ? error.message : undefined) || 'Failed to fetch comments');
    }
  },

  async getCategories(): Promise<BlogCategory[]> {
    try {
      const response = await api.get<BlogCategory[]>(`${BASE_URL}/categories`);
      return response;
    } catch (error: unknown) {
      throw new Error((error instanceof Error ? error.message : undefined) || 'Failed to fetch categories');
    }
  },

  async getPopularTags(): Promise<PopularTag[]> {
    try {
      const response = await api.get<PopularTag[]>(`${BASE_URL}/tags`);
      return response;
    } catch {
      return [];
    }
  },

  async getStats(): Promise<BlogStats> {
    try {
      const response = await api.get<BlogStats>(`${BASE_URL}/stats`);
      return response;
    } catch {
      return {
        total_posts: 0,
        published_posts: 0,
        total_comments: 0,
        categories_count: 0,
      };
    }
  },

  // AUTHENTICATED ENDPOINTS

  async ratePost(postId: string, rating: number): Promise<RatingResponse> {
    try {
      const response = await api.post<RatingResponse>(`${BASE_URL}/posts/${postId}/rate`, {
        rating,
      });
      return response;
    } catch (error: unknown) {
      throw new Error((error instanceof Error ? error.message : undefined) || 'Failed to rate post');
    }
  },

  async createComment(postId: string, data: CreateCommentDto): Promise<BlogComment> {
    try {
      const response = await api.post<BlogComment>(
        `${BASE_URL}/posts/${postId}/comments`,
        data
      );
      return response;
    } catch (error: unknown) {
      throw new Error((error instanceof Error ? error.message : undefined) || 'Failed to create comment');
    }
  },

  // ADMIN ROLE ENDPOINTS

  async getMyPosts(params?: BlogQueryParams): Promise<PaginatedResponse<BlogPost>> {
    try {
      const queryString = params
        ? new URLSearchParams(
            Object.entries(params)
              .filter((entry) => entry[1] !== undefined && entry[1] !== null)
              .map(([k, v]) => [k, Array.isArray(v) ? v.join(',') : String(v)])
          ).toString()
        : '';
      const response = await api.get<PaginatedResponse<BlogPost>>(
        `${BASE_URL}/my-posts${queryString ? `?${queryString}` : ''}`
      );
      return response;
    } catch (error: unknown) {
      throw new Error((error instanceof Error ? error.message : undefined) || 'Failed to fetch your posts');
    }
  },

  async createPost(data: CreateBlogPostDto): Promise<BlogPost> {
    try {
      const response = await api.post<BlogPost>(`${BASE_URL}/posts`, data);
      return response;
    } catch (error: unknown) {
      if ((error as { statusCode?: number }).statusCode === 403) {
        throw new Error('You do not have permission to create blog posts.');
      }
      throw new Error((error instanceof Error ? error.message : undefined) || 'Failed to create blog post');
    }
  },

  async updatePost(id: string, data: UpdateBlogPostDto): Promise<BlogPost> {
    try {
      const response = await api.put<BlogPost>(`${BASE_URL}/posts/${id}`, data);
      return response;
    } catch (error: unknown) {
      if ((error as { statusCode?: number }).statusCode === 404) {
        throw new Error('Blog post not found or you do not have permission to edit it');
      }
      if ((error as { statusCode?: number }).statusCode === 403) {
        throw new Error('You do not have permission to edit this blog post');
      }
      throw new Error((error instanceof Error ? error.message : undefined) || 'Failed to update blog post');
    }
  },

  async deletePost(id: string): Promise<void> {
    try {
      await api.delete(`${BASE_URL}/posts/${id}`);
    } catch (error: unknown) {
      if ((error as { statusCode?: number }).statusCode === 404) {
        throw new Error('Blog post not found or you do not have permission to delete it');
      }
      if ((error as { statusCode?: number }).statusCode === 403) {
        throw new Error('You do not have permission to delete this blog post');
      }
      throw new Error((error instanceof Error ? error.message : undefined) || 'Failed to delete blog post');
    }
  },

  async uploadImages(files: File[]): Promise<ImageUploadResponse> {
    try {
      const formData = new FormData();
      files.forEach((file) => formData.append('files', file));
      const response = await api.post<ImageUploadResponse>(
        `${BASE_URL}/images/upload`,
        formData
      );
      return response;
    } catch (error: unknown) {
      if ((error as { statusCode?: number }).statusCode === 403) {
        throw new Error('You do not have permission to upload images');
      }
      throw new Error((error instanceof Error ? error.message : undefined) || 'Failed to upload images');
    }
  },

  // ADMIN ENDPOINTS

  async createCategory(data: CreateCategoryDto): Promise<BlogCategory> {
    try {
      const response = await api.post<BlogCategory>(`${BASE_URL}/categories`, data);
      return response;
    } catch (error: unknown) {
      if ((error as { statusCode?: number }).statusCode === 403) {
        throw new Error('You do not have permission to create categories');
      }
      throw new Error((error instanceof Error ? error.message : undefined) || 'Failed to create category');
    }
  },

  async deleteCategory(id: string): Promise<void> {
    try {
      await api.delete(`${BASE_URL}/categories/${id}`);
    } catch (error: unknown) {
      if ((error as { statusCode?: number }).statusCode === 404) {
        throw new Error('Category not found');
      }
      if ((error as { statusCode?: number }).statusCode === 403) {
        throw new Error('You do not have permission to delete categories');
      }
      throw new Error((error instanceof Error ? error.message : undefined) || 'Failed to delete category');
    }
  },
};

export default blogApi;
