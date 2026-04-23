import { Injectable, Logger } from '@nestjs/common';
import { PlatformService } from '../../database/platform.service';
import { AuditLog } from '../../database/interfaces/platform.interface';

export type AuditAction =
  | 'workflow.created'
  | 'workflow.updated'
  | 'workflow.deleted'
  | 'workflow.executed'
  | 'credential.created'
  | 'credential.updated'
  | 'member.invited'
  | 'member.removed'
  | 'settings.changed';

export interface AuditLogFilters {
  action?: string;
  userId?: string;
  resourceType?: string;
  dateFrom?: string;
  dateTo?: string;
  search?: string;
}

export interface PaginationOptions {
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'ASC' | 'DESC';
}

export interface PaginatedResult<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

@Injectable()
export class AuditService {
  private readonly logger = new Logger(AuditService.name);

  constructor(private readonly platformService: PlatformService) {}

  /**
   * Write an audit log entry.
   */
  async log(
    action: AuditAction | string,
    userId: string,
    resourceType: string,
    resourceId?: string,
    metadata?: {
      organizationId?: string;
      projectId?: string;
      details?: Record<string, any>;
      ipAddress?: string;
      userAgent?: string;
    },
  ): Promise<AuditLog> {
    return this.platformService.createAuditLog({
      userId,
      organizationId: metadata?.organizationId,
      projectId: metadata?.projectId,
      action,
      resourceType,
      resourceId,
      details: metadata?.details || {},
      ipAddress: metadata?.ipAddress,
      userAgent: metadata?.userAgent,
    });
  }

  /**
   * Query audit logs with filtering and pagination.
   */
  async query(
    orgId: string,
    filters: AuditLogFilters = {},
    pagination: PaginationOptions = {},
  ): Promise<PaginatedResult<AuditLog>> {
    const {
      page = 1,
      limit = 25,
      sortBy = 'created_at',
      sortOrder = 'DESC',
    } = pagination;

    const offset = (page - 1) * limit;

    // Build WHERE clause
    const conditions: string[] = ['organization_id = $1'];
    const params: any[] = [orgId];
    let paramIndex = 2;

    if (filters.action) {
      conditions.push(`action = $${paramIndex}`);
      params.push(filters.action);
      paramIndex++;
    }

    if (filters.userId) {
      conditions.push(`user_id = $${paramIndex}`);
      params.push(filters.userId);
      paramIndex++;
    }

    if (filters.resourceType) {
      conditions.push(`resource_type = $${paramIndex}`);
      params.push(filters.resourceType);
      paramIndex++;
    }

    if (filters.dateFrom) {
      conditions.push(`created_at >= $${paramIndex}`);
      params.push(filters.dateFrom);
      paramIndex++;
    }

    if (filters.dateTo) {
      conditions.push(`created_at <= $${paramIndex}`);
      params.push(filters.dateTo);
      paramIndex++;
    }

    if (filters.search) {
      conditions.push(`(action ILIKE $${paramIndex} OR resource_type ILIKE $${paramIndex} OR details::text ILIKE $${paramIndex})`);
      params.push(`%${filters.search}%`);
      paramIndex++;
    }

    const whereClause = conditions.join(' AND ');

    // Allowlist for sort columns
    const allowedSortColumns = ['created_at', 'action', 'resource_type', 'user_id'];
    const safeSortBy = allowedSortColumns.includes(sortBy) ? sortBy : 'created_at';
    const safeSortOrder = sortOrder === 'ASC' ? 'ASC' : 'DESC';

    // Count total
    const countResult = await this.platformService.query<{ count: string }>(
      `SELECT COUNT(*) as count FROM audit_logs WHERE ${whereClause}`,
      params,
    );
    const total = parseInt(countResult.rows[0]?.count || '0', 10);

    // Fetch page
    const dataResult = await this.platformService.query<any>(
      `SELECT * FROM audit_logs WHERE ${whereClause} ORDER BY ${safeSortBy} ${safeSortOrder} LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`,
      [...params, limit, offset],
    );

    const data = dataResult.rows.map(this.mapRow);

    return {
      data,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  /**
   * Get a single audit log entry by ID.
   */
  async getById(id: string, orgId: string): Promise<AuditLog | null> {
    const result = await this.platformService.query<any>(
      `SELECT * FROM audit_logs WHERE id = $1 AND organization_id = $2`,
      [id, orgId],
    );

    if (result.rows.length === 0) {
      return null;
    }

    return this.mapRow(result.rows[0]);
  }

  /**
   * Get all audit entries for a specific resource.
   */
  async getByResource(
    resourceType: string,
    resourceId: string,
    orgId: string,
  ): Promise<AuditLog[]> {
    const result = await this.platformService.query<any>(
      `SELECT * FROM audit_logs WHERE resource_type = $1 AND resource_id = $2 AND organization_id = $3 ORDER BY created_at DESC`,
      [resourceType, resourceId, orgId],
    );

    return result.rows.map(this.mapRow);
  }

  /**
   * Map a database row (snake_case) to the AuditLog interface (camelCase).
   */
  private mapRow(row: any): AuditLog {
    return {
      id: row.id,
      userId: row.user_id,
      organizationId: row.organization_id,
      projectId: row.project_id,
      action: row.action,
      resourceType: row.resource_type,
      resourceId: row.resource_id,
      details: typeof row.details === 'string' ? JSON.parse(row.details) : (row.details || {}),
      ipAddress: row.ip_address,
      userAgent: row.user_agent,
      createdAt: row.created_at,
    };
  }
}
