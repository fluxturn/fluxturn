import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsOptional,
  IsArray,
  IsBoolean,
  IsEnum,
  IsNumber,
  Min,
  Max,
  IsUUID,
  MinLength,
  MaxLength,
} from 'class-validator';
import { Transform, Type } from 'class-transformer';

// Enums
export type PostStatus = 'draft' | 'published' | 'archived';
export type BlogType = 'latest' | 'popular' | 'featured' | 'all';

// Create Blog Post DTO
export class CreateBlogPostDto {
  @ApiProperty({ description: 'Blog post title' })
  @IsString()
  @MinLength(3)
  @MaxLength(255)
  title: string;

  @ApiProperty({ description: 'Blog post content (HTML allowed)' })
  @IsString()
  @MinLength(10)
  content: string;

  @ApiPropertyOptional({ description: 'Short excerpt' })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  excerpt?: string;

  @ApiPropertyOptional({ description: 'Category name' })
  @IsOptional()
  @IsString()
  category?: string;

  @ApiPropertyOptional({ description: 'Tags array', type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tags?: string[];

  @ApiPropertyOptional({ description: 'Image URLs', type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  image_urls?: string[];

  @ApiPropertyOptional({ description: 'Post status', enum: ['draft', 'published', 'archived'] })
  @IsOptional()
  @IsEnum(['draft', 'published', 'archived'])
  status?: PostStatus;

  @ApiPropertyOptional({ description: 'Featured post' })
  @IsOptional()
  @IsBoolean()
  featured?: boolean;

  @ApiPropertyOptional({ description: 'SEO meta title' })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  meta_title?: string;

  @ApiPropertyOptional({ description: 'SEO meta description' })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  meta_description?: string;

  @ApiPropertyOptional({ description: 'Author name override' })
  @IsOptional()
  @IsString()
  author?: string;
}

// Update Blog Post DTO
export class UpdateBlogPostDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MinLength(3)
  @MaxLength(255)
  title?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  content?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  excerpt?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  category?: string;

  @ApiPropertyOptional({ type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tags?: string[];

  @ApiPropertyOptional({ type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  image_urls?: string[];

  @ApiPropertyOptional({ enum: ['draft', 'published', 'archived'] })
  @IsOptional()
  @IsEnum(['draft', 'published', 'archived'])
  status?: PostStatus;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  featured?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  meta_title?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  meta_description?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  author?: string;
}

// Blog Query DTO
export class BlogQueryDto {
  @ApiPropertyOptional({ enum: ['latest', 'popular', 'featured', 'all'] })
  @IsOptional()
  @IsEnum(['latest', 'popular', 'featured', 'all'])
  type?: BlogType;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  category?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({ enum: ['draft', 'published', 'archived'] })
  @IsOptional()
  @IsEnum(['draft', 'published', 'archived'])
  status?: PostStatus;

  @ApiPropertyOptional({ default: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  page?: number = 1;

  @ApiPropertyOptional({ default: 10 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  @Max(100)
  limit?: number = 10;
}

// Comment Query DTO
export class CommentQueryDto {
  @ApiPropertyOptional({ default: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  page?: number = 1;

  @ApiPropertyOptional({ default: 20 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  @Max(100)
  limit?: number = 20;
}

// Create Comment DTO
export class CreateCommentDto {
  @ApiProperty({ description: 'Comment content' })
  @IsString()
  @MinLength(1)
  @MaxLength(2000)
  content: string;

  @ApiPropertyOptional({ description: 'Parent comment ID for replies' })
  @IsOptional()
  @IsUUID()
  parent_comment_id?: string;
}

// Create Category DTO
export class CreateCategoryDto {
  @ApiProperty()
  @IsString()
  @MinLength(2)
  @MaxLength(100)
  name: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(500)
  description?: string;
}

// Rate Post DTO
export class RatePostDto {
  @ApiProperty({ description: 'Rating from 1 to 5', minimum: 1, maximum: 5 })
  @IsNumber()
  @Min(1)
  @Max(5)
  rating: number;
}

// Response DTOs
export interface BlogPostResponseDto {
  id: string;
  user_id: string;
  title: string;
  slug: string;
  excerpt: string;
  content: string;
  image_urls: string[];
  status: PostStatus;
  category: string;
  tags: string[];
  featured: boolean;
  meta_title: string;
  meta_description: string;
  author: string;
  rating: number;
  rating_count: number;
  views_count: number;
  comments_count: number;
  published_at: string;
  created_at: string;
  updated_at: string;
  user_rating?: number;
}

export interface PaginatedBlogPostsDto {
  data: BlogPostResponseDto[];
  total: number;
  page: number;
  limit: number;
  total_pages: number;
}

export interface CommentResponseDto {
  id: string;
  post_id: string;
  user_id: string;
  parent_comment_id: string | null;
  content: string;
  author_name: string;
  created_at: string;
  updated_at: string;
  replies?: CommentResponseDto[];
}

export interface PaginatedCommentsDto {
  data: CommentResponseDto[];
  total: number;
  page: number;
  limit: number;
  total_pages: number;
}

export interface CategoryResponseDto {
  id: string;
  name: string;
  slug: string;
  description: string;
  created_at: string;
}

export interface RatingResponseDto {
  rating: number;
  average_rating: number;
  rating_count: number;
}

export interface ImageUploadResponseDto {
  urls: string[];
  message: string;
}

export interface BlogStatsDto {
  total_posts: number;
  published_posts: number;
  total_comments: number;
  categories_count: number;
}

export interface PopularTagDto {
  name: string;
  count: number;
}
