import {
  Controller,
  Get,
  Param,
  Query,
  UseGuards,
  Request,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiSecurity, ApiQuery } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { AuditService, AuditLogFilters, PaginationOptions } from './audit.service';

@ApiTags('Audit Logs')
@Controller('audit-logs')
@UseGuards(JwtAuthGuard)
@ApiSecurity('JWT')
export class AuditController {
  constructor(private readonly auditService: AuditService) {}

  @Get()
  @ApiOperation({ summary: 'List audit logs with filtering and pagination' })
  @ApiQuery({ name: 'action', required: false })
  @ApiQuery({ name: 'userId', required: false })
  @ApiQuery({ name: 'resourceType', required: false })
  @ApiQuery({ name: 'dateFrom', required: false })
  @ApiQuery({ name: 'dateTo', required: false })
  @ApiQuery({ name: 'search', required: false })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'sortBy', required: false })
  @ApiQuery({ name: 'sortOrder', required: false, enum: ['ASC', 'DESC'] })
  async list(
    @Request() req: any,
    @Query('action') action?: string,
    @Query('userId') userId?: string,
    @Query('resourceType') resourceType?: string,
    @Query('dateFrom') dateFrom?: string,
    @Query('dateTo') dateTo?: string,
    @Query('search') search?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('sortBy') sortBy?: string,
    @Query('sortOrder') sortOrder?: string,
  ) {
    const orgId = this.extractOrgId(req);

    const filters: AuditLogFilters = {
      action,
      userId,
      resourceType,
      dateFrom,
      dateTo,
      search,
    };

    const pagination: PaginationOptions = {
      page: page ? parseInt(page, 10) : 1,
      limit: limit ? Math.min(parseInt(limit, 10), 100) : 25,
      sortBy: sortBy || 'created_at',
      sortOrder: (sortOrder === 'ASC' ? 'ASC' : 'DESC') as 'ASC' | 'DESC',
    };

    return this.auditService.query(orgId, filters, pagination);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a single audit log entry' })
  async getById(@Param('id') id: string, @Request() req: any) {
    const orgId = this.extractOrgId(req);
    const entry = await this.auditService.getById(id, orgId);

    if (!entry) {
      throw new NotFoundException('Audit log entry not found');
    }

    return entry;
  }

  @Get('resource/:type/:id')
  @ApiOperation({ summary: 'Get audit logs for a specific resource' })
  async getByResource(
    @Param('type') resourceType: string,
    @Param('id') resourceId: string,
    @Request() req: any,
  ) {
    const orgId = this.extractOrgId(req);
    return this.auditService.getByResource(resourceType, resourceId, orgId);
  }

  /**
   * Extract organization ID from request headers or user context.
   */
  private extractOrgId(req: any): string {
    const orgId =
      req.headers?.['x-organization-id'] ||
      req.user?.organizationId;

    if (!orgId) {
      throw new BadRequestException(
        'Organization ID is required. Pass it via the x-organization-id header.',
      );
    }

    return orgId;
  }
}
