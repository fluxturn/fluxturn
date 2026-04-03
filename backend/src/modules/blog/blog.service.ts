import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { v4 as uuidv4 } from 'uuid';
import { PlatformService } from '../database';
import { R2Service } from '../storage/r2.service';
import {
  CreateBlogPostDto,
  UpdateBlogPostDto,
  CreateCommentDto,
  CreateCategoryDto,
  BlogQueryDto,
  CommentQueryDto,
  BlogPostResponseDto,
  PaginatedBlogPostsDto,
  CommentResponseDto,
  PaginatedCommentsDto,
  CategoryResponseDto,
  RatingResponseDto,
  BlogStatsDto,
  PopularTagDto,
} from './dto';

@Injectable()
export class BlogService {
  private readonly logger = new Logger(BlogService.name);

  constructor(
    private readonly platformService: PlatformService,
    private readonly r2Service: R2Service,
    private configService: ConfigService,
  ) {}

  // =============================================
  // POSTS
  // =============================================

  async getPosts(userId: string | null, query: BlogQueryDto): Promise<PaginatedBlogPostsDto> {
    const { type = 'latest', category, search, status = 'published', page = 1, limit = 10 } = query;
    const offset = (page - 1) * limit;

    let whereClause = 'WHERE 1=1';
    const params: any[] = [];
    let paramIndex = 1;

    // Status filter (for public, only show published)
    if (status) {
      whereClause += ` AND bp.status = $${paramIndex++}`;
      params.push(status);
    }

    // Category filter
    if (category) {
      whereClause += ` AND bp.category = $${paramIndex++}`;
      params.push(category);
    }

    // Search filter
    if (search) {
      whereClause += ` AND (bp.title ILIKE $${paramIndex} OR bp.content ILIKE $${paramIndex} OR bp.excerpt ILIKE $${paramIndex})`;
      params.push(`%${search}%`);
      paramIndex++;
    }

    // Featured filter
    if (type === 'featured') {
      whereClause += ' AND bp.featured = true';
    }

    // Order by
    let orderBy = 'ORDER BY bp.published_at DESC NULLS LAST, bp.created_at DESC';
    if (type === 'popular') {
      orderBy = 'ORDER BY bp.views_count DESC, bp.rating DESC';
    }

    // Get total count
    const countQuery = `SELECT COUNT(*) as total FROM blog_posts bp ${whereClause}`;
    const countResult = await this.platformService.query(countQuery, params);
    const total = parseInt(countResult.rows[0].total, 10);

    // Get posts
    const postsQuery = `
      SELECT
        bp.*,
        u.email as author_email,
        u.full_name as author_name
        ${userId ? `, (SELECT rating FROM blog_ratings WHERE post_id = bp.id AND user_id = $${paramIndex}) as user_rating` : ''}
      FROM blog_posts bp
      LEFT JOIN users u ON bp.user_id = u.id
      ${whereClause}
      ${orderBy}
      LIMIT $${paramIndex + (userId ? 1 : 0)} OFFSET $${paramIndex + (userId ? 2 : 1)}
    `;

    const queryParams = userId
      ? [...params, userId, limit, offset]
      : [...params, limit, offset];

    const postsResult = await this.platformService.query(postsQuery, queryParams);

    return {
      data: postsResult.rows.map(row => this.mapPostRow(row)),
      total,
      page,
      limit,
      total_pages: Math.ceil(total / limit),
    };
  }

  async getPostBySlug(userId: string | null, slug: string): Promise<BlogPostResponseDto> {
    const query = `
      SELECT
        bp.*,
        u.email as author_email,
        u.full_name as author_name
        ${userId ? `, (SELECT rating FROM blog_ratings WHERE post_id = bp.id AND user_id = $2) as user_rating` : ''}
      FROM blog_posts bp
      LEFT JOIN users u ON bp.user_id = u.id
      WHERE bp.slug = $1
    `;

    const params = userId ? [slug, userId] : [slug];
    const result = await this.platformService.query(query, params);

    if (result.rows.length === 0) {
      throw new NotFoundException('Blog post not found');
    }

    // Increment view count
    await this.platformService.query(
      'UPDATE blog_posts SET views_count = views_count + 1 WHERE slug = $1',
      [slug]
    );

    return this.mapPostRow(result.rows[0]);
  }

  async getPostById(userId: string | null, id: string): Promise<BlogPostResponseDto> {
    const query = `
      SELECT
        bp.*,
        u.email as author_email,
        u.full_name as author_name
        ${userId ? `, (SELECT rating FROM blog_ratings WHERE post_id = bp.id AND user_id = $2) as user_rating` : ''}
      FROM blog_posts bp
      LEFT JOIN users u ON bp.user_id = u.id
      WHERE bp.id = $1
    `;

    const params = userId ? [id, userId] : [id];
    const result = await this.platformService.query(query, params);

    if (result.rows.length === 0) {
      throw new NotFoundException('Blog post not found');
    }

    return this.mapPostRow(result.rows[0]);
  }

  async getMyPosts(userId: string, query: BlogQueryDto): Promise<PaginatedBlogPostsDto> {
    const { status, page = 1, limit = 10 } = query;
    const offset = (page - 1) * limit;

    let whereClause = 'WHERE bp.user_id = $1';
    const params: any[] = [userId];
    let paramIndex = 2;

    if (status) {
      whereClause += ` AND bp.status = $${paramIndex++}`;
      params.push(status);
    }

    const countQuery = `SELECT COUNT(*) as total FROM blog_posts bp ${whereClause}`;
    const countResult = await this.platformService.query(countQuery, params);
    const total = parseInt(countResult.rows[0].total, 10);

    const postsQuery = `
      SELECT bp.*
      FROM blog_posts bp
      ${whereClause}
      ORDER BY bp.created_at DESC
      LIMIT $${paramIndex++} OFFSET $${paramIndex}
    `;

    const postsResult = await this.platformService.query(postsQuery, [...params, limit, offset]);

    return {
      data: postsResult.rows.map(row => this.mapPostRow(row)),
      total,
      page,
      limit,
      total_pages: Math.ceil(total / limit),
    };
  }

  async createPost(userId: string, dto: CreateBlogPostDto): Promise<BlogPostResponseDto> {
    const slug = await this.generateUniqueSlug(dto.title);

    const query = `
      INSERT INTO blog_posts (
        user_id, title, slug, excerpt, content, image_urls, status,
        category, tags, featured, meta_title, meta_description, author,
        published_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
      RETURNING *
    `;

    const publishedAt = dto.status === 'published' ? new Date() : null;

    const result = await this.platformService.query(query, [
      userId,
      dto.title,
      slug,
      dto.excerpt || null,
      dto.content,
      dto.image_urls || [],
      dto.status || 'draft',
      dto.category || null,
      dto.tags || [],
      dto.featured || false,
      dto.meta_title || dto.title,
      dto.meta_description || dto.excerpt || null,
      dto.author || null,
      publishedAt,
    ]);

    return this.mapPostRow(result.rows[0]);
  }

  async updatePost(userId: string, postId: string, dto: UpdateBlogPostDto): Promise<BlogPostResponseDto> {
    // Check ownership
    const post = await this.getPostById(null, postId);
    if (post.user_id !== userId) {
      throw new ForbiddenException('You can only edit your own posts');
    }

    const updates: string[] = [];
    const params: any[] = [];
    let paramIndex = 1;

    if (dto.title !== undefined) {
      updates.push(`title = $${paramIndex++}`);
      params.push(dto.title);
      // Update slug if title changes
      const newSlug = await this.generateUniqueSlug(dto.title, postId);
      updates.push(`slug = $${paramIndex++}`);
      params.push(newSlug);
    }
    if (dto.content !== undefined) {
      updates.push(`content = $${paramIndex++}`);
      params.push(dto.content);
    }
    if (dto.excerpt !== undefined) {
      updates.push(`excerpt = $${paramIndex++}`);
      params.push(dto.excerpt);
    }
    if (dto.category !== undefined) {
      updates.push(`category = $${paramIndex++}`);
      params.push(dto.category);
    }
    if (dto.tags !== undefined) {
      updates.push(`tags = $${paramIndex++}`);
      params.push(dto.tags);
    }
    if (dto.image_urls !== undefined) {
      updates.push(`image_urls = $${paramIndex++}`);
      params.push(dto.image_urls);
    }
    if (dto.status !== undefined) {
      updates.push(`status = $${paramIndex++}`);
      params.push(dto.status);
      // Set published_at if publishing
      if (dto.status === 'published' && post.status !== 'published') {
        updates.push(`published_at = $${paramIndex++}`);
        params.push(new Date());
      }
    }
    if (dto.featured !== undefined) {
      updates.push(`featured = $${paramIndex++}`);
      params.push(dto.featured);
    }
    if (dto.meta_title !== undefined) {
      updates.push(`meta_title = $${paramIndex++}`);
      params.push(dto.meta_title);
    }
    if (dto.meta_description !== undefined) {
      updates.push(`meta_description = $${paramIndex++}`);
      params.push(dto.meta_description);
    }
    if (dto.author !== undefined) {
      updates.push(`author = $${paramIndex++}`);
      params.push(dto.author);
    }

    updates.push(`updated_at = $${paramIndex++}`);
    params.push(new Date());

    params.push(postId);

    const query = `
      UPDATE blog_posts
      SET ${updates.join(', ')}
      WHERE id = $${paramIndex}
      RETURNING *
    `;

    const result = await this.platformService.query(query, params);
    return this.mapPostRow(result.rows[0]);
  }

  async deletePost(userId: string, postId: string): Promise<void> {
    const post = await this.getPostById(null, postId);
    if (post.user_id !== userId) {
      throw new ForbiddenException('You can only delete your own posts');
    }

    await this.platformService.query('DELETE FROM blog_posts WHERE id = $1', [postId]);
  }

  // =============================================
  // RATINGS
  // =============================================

  async ratePost(userId: string, postId: string, rating: number): Promise<RatingResponseDto> {
    if (rating < 1 || rating > 5) {
      throw new BadRequestException('Rating must be between 1 and 5');
    }

    // Upsert rating
    await this.platformService.query(
      `INSERT INTO blog_ratings (post_id, user_id, rating)
       VALUES ($1, $2, $3)
       ON CONFLICT (post_id, user_id)
       DO UPDATE SET rating = $3`,
      [postId, userId, rating]
    );

    // Recalculate average
    const avgResult = await this.platformService.query(
      `SELECT AVG(rating)::numeric(3,2) as avg_rating, COUNT(*) as rating_count
       FROM blog_ratings WHERE post_id = $1`,
      [postId]
    );

    const avgRating = parseFloat(avgResult.rows[0].avg_rating) || 0;
    const ratingCount = parseInt(avgResult.rows[0].rating_count, 10) || 0;

    // Update post
    await this.platformService.query(
      'UPDATE blog_posts SET rating = $1, rating_count = $2 WHERE id = $3',
      [avgRating, ratingCount, postId]
    );

    return {
      rating,
      average_rating: avgRating,
      rating_count: ratingCount,
    };
  }

  // =============================================
  // COMMENTS
  // =============================================

  async getComments(userId: string | null, postId: string, query: CommentQueryDto): Promise<PaginatedCommentsDto> {
    const { page = 1, limit = 20 } = query;
    const offset = (page - 1) * limit;

    // Get top-level comments count
    const countResult = await this.platformService.query(
      'SELECT COUNT(*) as total FROM blog_comments WHERE post_id = $1 AND parent_comment_id IS NULL',
      [postId]
    );
    const total = parseInt(countResult.rows[0].total, 10);

    // Get top-level comments
    const commentsResult = await this.platformService.query(
      `SELECT c.*, u.full_name as author_name, u.email as author_email
       FROM blog_comments c
       LEFT JOIN users u ON c.user_id = u.id
       WHERE c.post_id = $1 AND c.parent_comment_id IS NULL
       ORDER BY c.created_at DESC
       LIMIT $2 OFFSET $3`,
      [postId, limit, offset]
    );

    // Get all replies for these comments
    const commentIds = commentsResult.rows.map(c => c.id);
    let repliesMap: Record<string, CommentResponseDto[]> = {};

    if (commentIds.length > 0) {
      const repliesResult = await this.platformService.query(
        `SELECT c.*, u.full_name as author_name, u.email as author_email
         FROM blog_comments c
         LEFT JOIN users u ON c.user_id = u.id
         WHERE c.parent_comment_id = ANY($1)
         ORDER BY c.created_at ASC`,
        [commentIds]
      );

      repliesMap = repliesResult.rows.reduce((acc, reply) => {
        const parentId = reply.parent_comment_id;
        if (!acc[parentId]) acc[parentId] = [];
        acc[parentId].push(this.mapCommentRow(reply));
        return acc;
      }, {} as Record<string, CommentResponseDto[]>);
    }

    const comments = commentsResult.rows.map(row => ({
      ...this.mapCommentRow(row),
      replies: repliesMap[row.id] || [],
    }));

    return {
      data: comments,
      total,
      page,
      limit,
      total_pages: Math.ceil(total / limit),
    };
  }

  async createComment(userId: string, postId: string, dto: CreateCommentDto): Promise<CommentResponseDto> {
    // Get user info
    const userResult = await this.platformService.query(
      'SELECT full_name, email FROM users WHERE id = $1',
      [userId]
    );
    const user = userResult.rows[0];

    const query = `
      INSERT INTO blog_comments (post_id, user_id, parent_comment_id, content, author_name)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING *
    `;

    const result = await this.platformService.query(query, [
      postId,
      userId,
      dto.parent_comment_id || null,
      dto.content,
      user?.full_name || user?.email?.split('@')[0] || 'Anonymous',
    ]);

    // Update comment count
    await this.platformService.query(
      'UPDATE blog_posts SET comments_count = comments_count + 1 WHERE id = $1',
      [postId]
    );

    return this.mapCommentRow(result.rows[0]);
  }

  // =============================================
  // CATEGORIES
  // =============================================

  async getCategories(): Promise<CategoryResponseDto[]> {
    const result = await this.platformService.query(
      'SELECT * FROM blog_categories ORDER BY name ASC'
    );
    return result.rows.map(row => ({
      id: row.id,
      name: row.name,
      slug: row.slug,
      description: row.description,
      created_at: row.created_at,
    }));
  }

  async createCategory(dto: CreateCategoryDto): Promise<CategoryResponseDto> {
    const slug = this.generateSlug(dto.name);

    const result = await this.platformService.query(
      `INSERT INTO blog_categories (name, slug, description)
       VALUES ($1, $2, $3)
       RETURNING *`,
      [dto.name, slug, dto.description || null]
    );

    const row = result.rows[0];
    return {
      id: row.id,
      name: row.name,
      slug: row.slug,
      description: row.description,
      created_at: row.created_at,
    };
  }

  async deleteCategory(id: string): Promise<void> {
    await this.platformService.query('DELETE FROM blog_categories WHERE id = $1', [id]);
  }

  // =============================================
  // TAGS & STATS
  // =============================================

  async getPopularTags(): Promise<PopularTagDto[]> {
    const result = await this.platformService.query(`
      SELECT tag, COUNT(*) as count
      FROM blog_posts, unnest(tags) as tag
      WHERE status = 'published'
      GROUP BY tag
      ORDER BY count DESC
      LIMIT 20
    `);

    return result.rows.map(row => ({
      name: row.tag,
      count: parseInt(row.count, 10),
    }));
  }

  async getBlogStats(): Promise<BlogStatsDto> {
    const [posts, published, comments, categories] = await Promise.all([
      this.platformService.query('SELECT COUNT(*) as count FROM blog_posts'),
      this.platformService.query("SELECT COUNT(*) as count FROM blog_posts WHERE status = 'published'"),
      this.platformService.query('SELECT COUNT(*) as count FROM blog_comments'),
      this.platformService.query('SELECT COUNT(*) as count FROM blog_categories'),
    ]);

    return {
      total_posts: parseInt(posts.rows[0].count, 10),
      published_posts: parseInt(published.rows[0].count, 10),
      total_comments: parseInt(comments.rows[0].count, 10),
      categories_count: parseInt(categories.rows[0].count, 10),
    };
  }

  // =============================================
  // IMAGE UPLOAD
  // =============================================

  async uploadImages(userId: string, files: Express.Multer.File[]): Promise<{ urls: string[]; message: string }> {
    const urls: string[] = [];

    for (const file of files) {
      try {
        let processedBuffer = file.buffer;
        let contentType = file.mimetype;
        let filename = `${uuidv4()}.webp`;

        try {
          // Dynamic import for sharp
          const sharp = (await import('sharp')).default;

          // Resize and convert to webp
          processedBuffer = await sharp(file.buffer)
            .resize(1200, 800, { fit: 'inside', withoutEnlargement: true })
            .webp({ quality: 80 })
            .toBuffer();

          contentType = 'image/webp';
        } catch (sharpError) {
          this.logger.warn(`Sharp processing failed, uploading original: ${sharpError.message}`);
          // Fallback: use original file
          filename = `${uuidv4()}-${file.originalname}`;
        }

        // Upload to R2
        const uploadResult = await this.r2Service.uploadFile(
          {
            buffer: processedBuffer,
            originalname: filename,
            mimetype: contentType,
            size: processedBuffer.length,
          } as Express.Multer.File,
          {
            path: 'blog/images',
            isPublic: true,
            metadata: {
              uploadedBy: userId,
              originalName: file.originalname,
            },
          }
        );

        urls.push(uploadResult.url);
        this.logger.log(`Image uploaded to R2: ${uploadResult.url}`);
      } catch (error) {
        this.logger.error(`Failed to upload image: ${error.message}`);
        throw new BadRequestException(`Failed to upload image: ${error.message}`);
      }
    }

    return {
      urls,
      message: `${urls.length} image(s) uploaded successfully`,
    };
  }

  // =============================================
  // HELPERS
  // =============================================

  private generateSlug(title: string): string {
    return title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '');
  }

  private async generateUniqueSlug(title: string, excludeId?: string): Promise<string> {
    let slug = this.generateSlug(title);
    let suffix = 0;

    while (true) {
      const checkSlug = suffix === 0 ? slug : `${slug}-${suffix}`;
      const query = excludeId
        ? 'SELECT id FROM blog_posts WHERE slug = $1 AND id != $2'
        : 'SELECT id FROM blog_posts WHERE slug = $1';
      const params = excludeId ? [checkSlug, excludeId] : [checkSlug];

      const result = await this.platformService.query(query, params);
      if (result.rows.length === 0) {
        return checkSlug;
      }
      suffix++;
    }
  }

  private mapPostRow(row: any): BlogPostResponseDto {
    return {
      id: row.id,
      user_id: row.user_id,
      title: row.title,
      slug: row.slug,
      excerpt: row.excerpt,
      content: row.content,
      image_urls: row.image_urls || [],
      status: row.status,
      category: row.category,
      tags: row.tags || [],
      featured: row.featured,
      meta_title: row.meta_title,
      meta_description: row.meta_description,
      author: row.author || row.author_name || row.author_email?.split('@')[0] || 'Anonymous',
      rating: parseFloat(row.rating) || 0,
      rating_count: row.rating_count || 0,
      views_count: row.views_count || 0,
      comments_count: row.comments_count || 0,
      published_at: row.published_at,
      created_at: row.created_at,
      updated_at: row.updated_at,
      user_rating: row.user_rating || null,
    };
  }

  private mapCommentRow(row: any): CommentResponseDto {
    return {
      id: row.id,
      post_id: row.post_id,
      user_id: row.user_id,
      parent_comment_id: row.parent_comment_id,
      content: row.content,
      author_name: row.author_name || row.author_email?.split('@')[0] || 'Anonymous',
      created_at: row.created_at,
      updated_at: row.updated_at,
    };
  }
}
