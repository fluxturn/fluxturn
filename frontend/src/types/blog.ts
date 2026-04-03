// Blog Post Status
export type PostStatus = 'draft' | 'published' | 'archived';

// Blog Type (for filtering)
export type BlogType = 'popular' | 'featured' | 'latest' | 'all';

// Blog Post Interface
export interface BlogPost {
  id: string;
  user_id: string;
  title: string;
  slug: string;
  content: string;
  excerpt?: string;
  status: PostStatus;
  category?: string;
  tags?: string[];
  image_urls?: string[];
  meta_title?: string;
  meta_description?: string;
  featured?: boolean;
  author?: string;
  rating?: number;
  rating_count?: number;
  views_count: number;
  comments_count: number;
  user_rating?: number;
  published_at?: string;
  created_at: string;
  updated_at: string;
}

// Blog Comment Interface
export interface BlogComment {
  id: string;
  post_id: string;
  user_id?: string;
  content: string;
  parent_comment_id?: string;
  author_name?: string;
  replies?: BlogComment[];
  created_at: string;
  updated_at: string;
}

// Blog Category Interface
export interface BlogCategory {
  id: string;
  name: string;
  slug: string;
  description?: string;
  created_at: string;
}

// Create Blog Post DTO
export interface CreateBlogPostDto {
  title: string;
  content: string;
  excerpt?: string;
  status?: PostStatus;
  category?: string;
  tags?: string[];
  image_urls?: string[];
  meta_title?: string;
  meta_description?: string;
  featured?: boolean;
  author?: string;
}

// Update Blog Post DTO
export interface UpdateBlogPostDto {
  title?: string;
  content?: string;
  excerpt?: string;
  status?: PostStatus;
  category?: string;
  tags?: string[];
  image_urls?: string[];
  meta_title?: string;
  meta_description?: string;
  featured?: boolean;
  author?: string;
}

// Create Comment DTO
export interface CreateCommentDto {
  content: string;
  parent_comment_id?: string;
}

// Create Category DTO
export interface CreateCategoryDto {
  name: string;
  description?: string;
}

// Blog Query Parameters
export interface BlogQueryParams {
  type?: BlogType;
  page?: number;
  limit?: number;
  search?: string;
  category?: string;
  status?: PostStatus;
}

// Comment Query Parameters
export interface CommentQueryParams {
  page?: number;
  limit?: number;
}

// Paginated Response
export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  total_pages: number;
}

// Rating Response
export interface RatingResponse {
  rating: number;
  average_rating: number;
  rating_count: number;
}

// Image Upload Response
export interface ImageUploadResponse {
  urls: string[];
  message: string;
}

// Blog Stats
export interface BlogStats {
  total_posts: number;
  published_posts: number;
  total_comments: number;
  categories_count: number;
}

// Popular Tag
export interface PopularTag {
  name: string;
  count: number;
}
