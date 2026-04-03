import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  Request,
  HttpCode,
  HttpStatus,
  UseInterceptors,
  UploadedFiles,
  BadRequestException,
} from '@nestjs/common';
import { FilesInterceptor } from '@nestjs/platform-express';
import * as multer from 'multer';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
  ApiConsumes,
  ApiBody,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { AdminRoleGuard } from '../auth/guards/admin-role.guard';
import { Public } from '../../common/decorators/public.decorator';
import { BlogService } from './blog.service';
import {
  CreateBlogPostDto,
  UpdateBlogPostDto,
  CreateCommentDto,
  CreateCategoryDto,
  BlogQueryDto,
  CommentQueryDto,
  RatePostDto,
  BlogPostResponseDto,
  CommentResponseDto,
  PaginatedBlogPostsDto,
  PaginatedCommentsDto,
  CategoryResponseDto,
  RatingResponseDto,
  BlogStatsDto,
  PopularTagDto,
} from './dto';

@ApiTags('Blog')
@Controller('blog')
export class BlogController {
  constructor(private readonly blogService: BlogService) {}

  // =============================================
  // PUBLIC ENDPOINTS
  // =============================================

  @Get('posts')
  @Public()
  @ApiOperation({ summary: 'Get all published blog posts' })
  @ApiResponse({ status: 200, description: 'List of blog posts' })
  async getPosts(@Query() query: BlogQueryDto): Promise<PaginatedBlogPostsDto> {
    return this.blogService.getPosts(null, query);
  }

  @Get('posts/slug/:slug')
  @Public()
  @ApiOperation({ summary: 'Get blog post by slug' })
  @ApiParam({ name: 'slug', description: 'Blog post slug' })
  @ApiResponse({ status: 200, description: 'Blog post details' })
  @ApiResponse({ status: 404, description: 'Blog post not found' })
  async getPostBySlug(@Param('slug') slug: string): Promise<BlogPostResponseDto> {
    return this.blogService.getPostBySlug(null, slug);
  }

  @Get('posts/:id')
  @Public()
  @ApiOperation({ summary: 'Get blog post by ID' })
  @ApiParam({ name: 'id', description: 'Blog post ID' })
  @ApiResponse({ status: 200, description: 'Blog post details' })
  @ApiResponse({ status: 404, description: 'Blog post not found' })
  async getPostById(@Param('id') id: string): Promise<BlogPostResponseDto> {
    return this.blogService.getPostById(null, id);
  }

  @Get('posts/:id/comments')
  @Public()
  @ApiOperation({ summary: 'Get comments for a blog post' })
  @ApiParam({ name: 'id', description: 'Blog post ID' })
  @ApiResponse({ status: 200, description: 'List of comments' })
  async getComments(
    @Param('id') postId: string,
    @Query() query: CommentQueryDto,
  ): Promise<PaginatedCommentsDto> {
    return this.blogService.getComments(null, postId, query);
  }

  @Get('categories')
  @Public()
  @ApiOperation({ summary: 'Get all blog categories' })
  @ApiResponse({ status: 200, description: 'List of categories' })
  async getCategories(): Promise<CategoryResponseDto[]> {
    return this.blogService.getCategories();
  }

  @Get('tags')
  @Public()
  @ApiOperation({ summary: 'Get popular tags' })
  @ApiResponse({ status: 200, description: 'List of popular tags' })
  async getPopularTags(): Promise<PopularTagDto[]> {
    return this.blogService.getPopularTags();
  }

  @Get('stats')
  @Public()
  @ApiOperation({ summary: 'Get blog statistics' })
  @ApiResponse({ status: 200, description: 'Blog statistics' })
  async getBlogStats(): Promise<BlogStatsDto> {
    return this.blogService.getBlogStats();
  }

  // =============================================
  // AUTHENTICATED ENDPOINTS
  // =============================================

  @Post('posts/:id/rate')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT')
  @ApiOperation({ summary: 'Rate a blog post (1-5 stars)' })
  @ApiParam({ name: 'id', description: 'Blog post ID' })
  @ApiResponse({ status: 200, description: 'Rating submitted' })
  async ratePost(
    @Request() req: any,
    @Param('id') id: string,
    @Body() body: RatePostDto,
  ): Promise<RatingResponseDto> {
    const userId = req.user?.userId || req.user?.sub;
    return this.blogService.ratePost(userId, id, body.rating);
  }

  @Post('posts/:id/comments')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT')
  @ApiOperation({ summary: 'Add a comment to a blog post' })
  @ApiParam({ name: 'id', description: 'Blog post ID' })
  @ApiResponse({ status: 201, description: 'Comment created' })
  async createComment(
    @Request() req: any,
    @Param('id') postId: string,
    @Body() dto: CreateCommentDto,
  ): Promise<CommentResponseDto> {
    const userId = req.user?.userId || req.user?.sub;
    return this.blogService.createComment(userId, postId, dto);
  }

  // =============================================
  // ADMIN-ONLY ENDPOINTS (users.role = 'admin')
  // =============================================

  @Get('my-posts')
  @UseGuards(JwtAuthGuard, AdminRoleGuard)
  @ApiBearerAuth('JWT')
  @ApiOperation({ summary: "Get current admin's blog posts" })
  @ApiResponse({ status: 200, description: 'List of admin posts' })
  @ApiResponse({ status: 403, description: 'Admin access required' })
  async getMyPosts(
    @Request() req: any,
    @Query() query: BlogQueryDto,
  ): Promise<PaginatedBlogPostsDto> {
    const userId = req.user?.userId || req.user?.sub;
    return this.blogService.getMyPosts(userId, query);
  }

  @Post('posts')
  @UseGuards(JwtAuthGuard, AdminRoleGuard)
  @ApiBearerAuth('JWT')
  @ApiOperation({ summary: 'Create a new blog post (Admin only)' })
  @ApiResponse({ status: 201, description: 'Blog post created' })
  @ApiResponse({ status: 403, description: 'Admin access required' })
  async createPost(
    @Request() req: any,
    @Body() dto: CreateBlogPostDto,
  ): Promise<BlogPostResponseDto> {
    const userId = req.user?.userId || req.user?.sub;
    return this.blogService.createPost(userId, dto);
  }

  @Put('posts/:id')
  @UseGuards(JwtAuthGuard, AdminRoleGuard)
  @ApiBearerAuth('JWT')
  @ApiOperation({ summary: 'Update blog post by ID (Admin only)' })
  @ApiParam({ name: 'id', description: 'Blog post ID' })
  @ApiResponse({ status: 200, description: 'Blog post updated' })
  @ApiResponse({ status: 403, description: 'Admin access required' })
  @ApiResponse({ status: 404, description: 'Blog post not found' })
  async updatePost(
    @Request() req: any,
    @Param('id') id: string,
    @Body() dto: UpdateBlogPostDto,
  ): Promise<BlogPostResponseDto> {
    const userId = req.user?.userId || req.user?.sub;
    return this.blogService.updatePost(userId, id, dto);
  }

  @Delete('posts/:id')
  @UseGuards(JwtAuthGuard, AdminRoleGuard)
  @ApiBearerAuth('JWT')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete blog post by ID (Admin only)' })
  @ApiParam({ name: 'id', description: 'Blog post ID' })
  @ApiResponse({ status: 204, description: 'Blog post deleted' })
  @ApiResponse({ status: 403, description: 'Admin access required' })
  async deletePost(@Request() req: any, @Param('id') id: string): Promise<void> {
    const userId = req.user?.userId || req.user?.sub;
    return this.blogService.deletePost(userId, id);
  }

  @Post('images/upload')
  @UseGuards(JwtAuthGuard, AdminRoleGuard)
  @ApiBearerAuth('JWT')
  @ApiOperation({ summary: 'Upload images for blog posts (Admin only)' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        files: {
          type: 'array',
          items: {
            type: 'string',
            format: 'binary',
          },
        },
      },
    },
  })
  @ApiResponse({ status: 201, description: 'Images uploaded' })
  @ApiResponse({ status: 403, description: 'Admin access required' })
  @UseInterceptors(
    FilesInterceptor('files', 10, {
      storage: multer.memoryStorage(),
      fileFilter: (req, file, cb) => {
        if (!file.mimetype.match(/\/(jpg|jpeg|png|gif|webp)$/)) {
          return cb(new BadRequestException('Only image files are allowed'), false);
        }
        cb(null, true);
      },
      limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
    }),
  )
  async uploadImages(
    @Request() req: any,
    @UploadedFiles() files: Express.Multer.File[],
  ): Promise<{ urls: string[]; message: string }> {
    if (!files || files.length === 0) {
      throw new BadRequestException('No files uploaded');
    }
    const userId = req.user?.userId || req.user?.sub;
    return this.blogService.uploadImages(userId, files);
  }

  @Post('categories')
  @UseGuards(JwtAuthGuard, AdminRoleGuard)
  @ApiBearerAuth('JWT')
  @ApiOperation({ summary: 'Create a new blog category (Admin only)' })
  @ApiResponse({ status: 201, description: 'Category created' })
  @ApiResponse({ status: 403, description: 'Admin access required' })
  async createCategory(@Body() dto: CreateCategoryDto): Promise<CategoryResponseDto> {
    return this.blogService.createCategory(dto);
  }

  @Delete('categories/:id')
  @UseGuards(JwtAuthGuard, AdminRoleGuard)
  @ApiBearerAuth('JWT')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete blog category (Admin only)' })
  @ApiParam({ name: 'id', description: 'Category ID' })
  @ApiResponse({ status: 204, description: 'Category deleted' })
  @ApiResponse({ status: 403, description: 'Admin access required' })
  async deleteCategory(@Param('id') id: string): Promise<void> {
    return this.blogService.deleteCategory(id);
  }
}
