import {
  Controller,
  Get,
  Patch,
  Delete,
  Param,
  Body,
  Query,
  UseGuards,
  Request,
  HttpCode,
  HttpStatus,
  BadRequestException,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiQuery,
  ApiParam,
  ApiBody,
} from '@nestjs/swagger';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { AdminRoleGuard } from './guards/admin-role.guard';
import { PlatformService } from '../database';
import { IsString, IsOptional, IsIn, IsBoolean, IsNumber, Min } from 'class-validator';
import { Type } from 'class-transformer';

// DTOs
class GetUsersQueryDto {
  @IsOptional()
  @IsString()
  search?: string;

  @IsOptional()
  @IsIn(['admin', 'user', 'all'])
  role?: string;

  @IsOptional()
  @IsIn(['active', 'inactive', 'all'])
  status?: string;

  @IsOptional()
  @IsIn(['name', 'email', 'created_at', 'last_login_at'])
  sortBy?: string;

  @IsOptional()
  @IsIn(['asc', 'desc'])
  sortOrder?: string;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  page?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  limit?: number;
}

class UpdateUserRoleDto {
  @IsString()
  @IsIn(['admin', 'user'])
  role: string;
}

class UpdateUserStatusDto {
  @IsBoolean()
  isActive: boolean;
}

@ApiTags('Admin')
@Controller('admin')
@UseGuards(JwtAuthGuard, AdminRoleGuard)
@ApiBearerAuth()
export class AdminController {
  constructor(private readonly platformService: PlatformService) {}

  @Get('users')
  @ApiOperation({ summary: 'Get all users with pagination and filters' })
  @ApiQuery({ name: 'search', required: false, description: 'Search by name or email' })
  @ApiQuery({ name: 'role', required: false, enum: ['admin', 'user', 'all'], description: 'Filter by role' })
  @ApiQuery({ name: 'status', required: false, enum: ['active', 'inactive', 'all'], description: 'Filter by status' })
  @ApiQuery({ name: 'sortBy', required: false, enum: ['name', 'email', 'created_at', 'last_login_at'], description: 'Sort field' })
  @ApiQuery({ name: 'sortOrder', required: false, enum: ['asc', 'desc'], description: 'Sort order' })
  @ApiQuery({ name: 'page', required: false, type: Number, description: 'Page number (default: 1)' })
  @ApiQuery({ name: 'limit', required: false, type: Number, description: 'Items per page (default: 20)' })
  @ApiResponse({ status: 200, description: 'List of users with pagination info' })
  async getUsers(@Query() query: GetUsersQueryDto) {
    const {
      search = '',
      role = 'all',
      status = 'all',
      sortBy = 'created_at',
      sortOrder = 'desc',
      page = 1,
      limit = 20,
    } = query;

    const offset = (Number(page) - 1) * Number(limit);

    // Build WHERE clause
    const conditions: string[] = [];
    const params: any[] = [];
    let paramIndex = 1;

    if (search) {
      conditions.push(`(
        LOWER(email) LIKE LOWER($${paramIndex}) OR
        LOWER(full_name) LIKE LOWER($${paramIndex}) OR
        LOWER(first_name) LIKE LOWER($${paramIndex}) OR
        LOWER(last_name) LIKE LOWER($${paramIndex}) OR
        LOWER(username) LIKE LOWER($${paramIndex})
      )`);
      params.push(`%${search}%`);
      paramIndex++;
    }

    if (role && role !== 'all') {
      conditions.push(`role = $${paramIndex}`);
      params.push(role);
      paramIndex++;
    }

    if (status && status !== 'all') {
      conditions.push(`is_active = $${paramIndex}`);
      params.push(status === 'active');
      paramIndex++;
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    // Validate and map sortBy to actual column names
    const sortColumnMap: Record<string, string> = {
      name: 'full_name',
      email: 'email',
      created_at: 'created_at',
      last_login_at: 'last_login_at',
    };
    const sortColumn = sortColumnMap[sortBy] || 'created_at';
    const order = sortOrder === 'asc' ? 'ASC' : 'DESC';

    // Get total count
    const countResult = await this.platformService.query(
      `SELECT COUNT(*) as total FROM users ${whereClause}`,
      params
    );
    const total = parseInt(countResult.rows[0].total, 10);

    // Get users
    const usersResult = await this.platformService.query(
      `SELECT
        id, email, username, first_name, last_name, full_name,
        avatar_url, role, status, is_active, is_email_verified,
        created_at, updated_at, last_login_at
      FROM users
      ${whereClause}
      ORDER BY ${sortColumn} ${order} NULLS LAST
      LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`,
      [...params, Number(limit), offset]
    );

    const users = usersResult.rows.map(row => ({
      id: row.id,
      email: row.email,
      username: row.username,
      firstName: row.first_name,
      lastName: row.last_name,
      fullName: row.full_name || `${row.first_name || ''} ${row.last_name || ''}`.trim(),
      avatarUrl: row.avatar_url,
      role: row.role || 'user',
      status: row.status || 'active',
      isActive: row.is_active !== false,
      isEmailVerified: row.is_email_verified || false,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      lastLoginAt: row.last_login_at,
    }));

    return {
      users,
      pagination: {
        total,
        page: Number(page),
        limit: Number(limit),
        totalPages: Math.ceil(total / Number(limit)),
      },
    };
  }

  @Get('users/:id')
  @ApiOperation({ summary: 'Get a single user by ID' })
  @ApiParam({ name: 'id', description: 'User ID' })
  @ApiResponse({ status: 200, description: 'User details' })
  @ApiResponse({ status: 404, description: 'User not found' })
  async getUserById(@Param('id') id: string) {
    const user = await this.platformService.getUserById(id);

    if (!user) {
      throw new NotFoundException('User not found');
    }

    // Get organization memberships
    const orgsResult = await this.platformService.query(
      `SELECT o.id, o.name, o.slug, om.role as org_role
       FROM organizations o
       JOIN organization_members om ON o.id = om.organization_id
       WHERE om.user_id = $1`,
      [id]
    );

    return {
      ...user,
      organizations: orgsResult.rows.map(row => ({
        id: row.id,
        name: row.name,
        slug: row.slug,
        role: row.org_role,
      })),
    };
  }

  @Patch('users/:id/role')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Update user platform role' })
  @ApiParam({ name: 'id', description: 'User ID' })
  @ApiBody({ type: UpdateUserRoleDto })
  @ApiResponse({ status: 200, description: 'Role updated successfully' })
  @ApiResponse({ status: 400, description: 'Invalid role' })
  @ApiResponse({ status: 404, description: 'User not found' })
  async updateUserRole(
    @Param('id') id: string,
    @Body() body: UpdateUserRoleDto,
    @Request() req: any,
  ) {
    const currentUserId = req.user?.userId || req.user?.sub;

    // Prevent admin from changing their own role
    if (id === currentUserId) {
      throw new BadRequestException('You cannot change your own role');
    }

    const user = await this.platformService.getUserById(id);
    if (!user) {
      throw new NotFoundException('User not found');
    }

    await this.platformService.query(
      `UPDATE users SET role = $1, updated_at = NOW() WHERE id = $2`,
      [body.role, id]
    );

    return {
      success: true,
      message: `User role updated to ${body.role}`,
      userId: id,
      newRole: body.role,
    };
  }

  @Patch('users/:id/status')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Activate or deactivate a user' })
  @ApiParam({ name: 'id', description: 'User ID' })
  @ApiBody({ type: UpdateUserStatusDto })
  @ApiResponse({ status: 200, description: 'Status updated successfully' })
  @ApiResponse({ status: 404, description: 'User not found' })
  async updateUserStatus(
    @Param('id') id: string,
    @Body() body: UpdateUserStatusDto,
    @Request() req: any,
  ) {
    const currentUserId = req.user?.userId || req.user?.sub;

    // Prevent admin from deactivating themselves
    if (id === currentUserId && !body.isActive) {
      throw new BadRequestException('You cannot deactivate your own account');
    }

    const user = await this.platformService.getUserById(id);
    if (!user) {
      throw new NotFoundException('User not found');
    }

    await this.platformService.query(
      `UPDATE users SET is_active = $1, updated_at = NOW() WHERE id = $2`,
      [body.isActive, id]
    );

    return {
      success: true,
      message: body.isActive ? 'User activated' : 'User deactivated',
      userId: id,
      isActive: body.isActive,
    };
  }

  @Delete('users/:id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Delete a user permanently' })
  @ApiParam({ name: 'id', description: 'User ID' })
  @ApiResponse({ status: 200, description: 'User deleted successfully' })
  @ApiResponse({ status: 403, description: 'Cannot delete yourself' })
  @ApiResponse({ status: 404, description: 'User not found' })
  async deleteUser(@Param('id') id: string, @Request() req: any) {
    const currentUserId = req.user?.userId || req.user?.sub;

    // Prevent admin from deleting themselves
    if (id === currentUserId) {
      throw new ForbiddenException('You cannot delete your own account');
    }

    const user = await this.platformService.getUserById(id);
    if (!user) {
      throw new NotFoundException('User not found');
    }

    // Delete user (cascade will handle related records)
    await this.platformService.query(
      `DELETE FROM users WHERE id = $1`,
      [id]
    );

    return {
      success: true,
      message: 'User deleted successfully',
      userId: id,
    };
  }

  @Get('stats')
  @ApiOperation({ summary: 'Get admin dashboard statistics' })
  @ApiResponse({ status: 200, description: 'Admin statistics' })
  async getAdminStats() {
    const [usersResult, orgsResult, activeResult, adminResult] = await Promise.all([
      this.platformService.query('SELECT COUNT(*) as count FROM users'),
      this.platformService.query('SELECT COUNT(*) as count FROM organizations'),
      this.platformService.query('SELECT COUNT(*) as count FROM users WHERE is_active = true'),
      this.platformService.query("SELECT COUNT(*) as count FROM users WHERE role = 'admin'"),
    ]);

    return {
      totalUsers: parseInt(usersResult.rows[0].count, 10),
      totalOrganizations: parseInt(orgsResult.rows[0].count, 10),
      activeUsers: parseInt(activeResult.rows[0].count, 10),
      adminUsers: parseInt(adminResult.rows[0].count, 10),
    };
  }
}
