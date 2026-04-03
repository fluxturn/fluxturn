import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  Logger,
  InternalServerErrorException,
} from "@nestjs/common";
import { PlatformService } from "../database/platform.service";
import { v4 as uuidv4 } from 'uuid';

export interface ContentFilter {
  projectId?: string;
  appId?: string;
  userId?: string;
  contentType?: string;
  status?: string;
}

export interface UpdateContentDto {
  title?: string;
  content?: any;
  contentType?: string;
  status?: string;
  metadata?: any;
}

export interface CreateContentDto {
  contentType: string;
  title?: string;
  content: any;
  source?: string;
  sourceDetails?: any;
  parameters?: any;
  metadata?: any;
  status?: string;
  projectId?: string;
  appId?: string;
  organizationId?: string;
  userId?: string;
}

export interface Content {
  id: string;
  organization_id: string | null;
  project_id: string | null;
  app_id: string | null;
  user_id: string | null;
  content_type: string;
  title: string | null;
  content: any;
  source: string | null;
  source_details: any;
  parameters: any;
  metadata: any;
  status: string;
  version: number;
  parent_id: string | null;
  created_at: Date;
  updated_at: Date;
}

@Injectable()
export class ContentService {
  private readonly logger = new Logger(ContentService.name);

  constructor(private readonly platformService: PlatformService) {}

  /**
   * Get all content for a resource (project or app)
   */
  async findAllByResource(
    filters?: {
      contentType?: string;
      status?: string;
      userId?: string;
    },
    projectId?: string,
    appId?: string,
    organizationId?: string
  ): Promise<Content[]> {
    try {
      let query = `
        SELECT 
          c.*,
          u.email as user_email,
          u.full_name as user_name
        FROM contents c
        LEFT JOIN users u ON c.user_id = u.id
        WHERE 1=1
      `;
      const params: any[] = [];
      let paramCount = 0;

      // Add filters
      if (organizationId) {
        paramCount++;
        query += ` AND c.organization_id = $${paramCount}`;
        params.push(organizationId);
      }

      if (projectId) {
        paramCount++;
        query += ` AND c.project_id = $${paramCount}`;
        params.push(projectId);
      }

      // IMPORTANT: Distinguish between app-level and project-level content
      if (appId) {
        // App-level: only return content for this specific app
        paramCount++;
        query += ` AND c.app_id = $${paramCount}`;
        params.push(appId);
      } else if (projectId) {
        // Project-level: only return content where app_id IS NULL
        query += ` AND c.app_id IS NULL`;
      }

      if (filters?.contentType) {
        paramCount++;
        query += ` AND c.content_type = $${paramCount}`;
        params.push(filters.contentType);
      }

      if (filters?.status) {
        paramCount++;
        query += ` AND c.status = $${paramCount}`;
        params.push(filters.status);
      }

      if (filters?.userId) {
        paramCount++;
        query += ` AND c.user_id = $${paramCount}`;
        params.push(filters.userId);
      }

      query += ` ORDER BY c.created_at DESC`;

      const result = await this.platformService.query(query, params);
      
      return result.rows.map(row => ({
        ...row,
        user: row.user_email ? {
          id: row.user_id,
          email: row.user_email,
          name: row.user_name || row.user_email.split('@')[0]
        } : null
      }));
    } catch (error) {
      this.logger.error('Failed to fetch contents:', error);
      throw new InternalServerErrorException('Failed to fetch contents');
    }
  }

  /**
   * Get a single content by ID
   */
  async findOne(id: string): Promise<Content | null> {
    try {
      const query = `
        SELECT 
          c.*,
          u.email as user_email,
          u.full_name as user_name
        FROM contents c
        LEFT JOIN users u ON c.user_id = u.id
        WHERE c.id = $1
      `;

      const result = await this.platformService.query(query, [id]);
      
      if (result.rows.length === 0) {
        return null;
      }

      const row = result.rows[0];
      return {
        ...row,
        user: row.user_email ? {
          id: row.user_id,
          email: row.user_email,
          name: row.user_name || row.user_email.split('@')[0]
        } : null
      };
    } catch (error) {
      this.logger.error(`Failed to fetch content ${id}:`, error);
      throw new InternalServerErrorException('Failed to fetch content');
    }
  }

  /**
   * Create new content
   */
  async create(data: CreateContentDto, userId?: string): Promise<Content> {
    try {
      const id = uuidv4();
      const now = new Date();

      const query = `
        INSERT INTO contents (
          id,
          organization_id,
          project_id,
          app_id,
          user_id,
          content_type,
          title,
          content,
          source,
          source_details,
          parameters,
          metadata,
          status,
          version,
          created_at,
          updated_at
        ) VALUES (
          $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16
        ) RETURNING *
      `;

      const params = [
        id,
        data.organizationId || null,
        data.projectId || null,
        data.appId || null,
        userId || data.userId || null,
        data.contentType,
        data.title || null,
        JSON.stringify(data.content),
        data.source || null,
        data.sourceDetails ? JSON.stringify(data.sourceDetails) : null,
        data.parameters ? JSON.stringify(data.parameters) : null,
        data.metadata ? JSON.stringify(data.metadata) : null,
        data.status || 'active',
        1, // version
        now,
        now
      ];

      const result = await this.platformService.query(query, params);
      return result.rows[0];
    } catch (error) {
      this.logger.error('Failed to create content:', error);
      throw new InternalServerErrorException('Failed to create content');
    }
  }

  /**
   * Update content
   */
  async update(
    id: string,
    data: UpdateContentDto,
    userId?: string
  ): Promise<Content> {
    try {
      // First check if content exists
      const existing = await this.findOne(id);
      if (!existing) {
        throw new NotFoundException('Content not found');
      }

      // Check authorization if userId is provided
      if (userId && existing.user_id !== userId) {
        throw new ForbiddenException('You can only update your own content');
      }

      // Build update query dynamically
      const updates: string[] = [];
      const params: any[] = [];
      let paramCount = 0;

      if (data.title !== undefined) {
        paramCount++;
        updates.push(`title = $${paramCount}`);
        params.push(data.title);
      }

      if (data.content !== undefined) {
        paramCount++;
        updates.push(`content = $${paramCount}`);
        params.push(JSON.stringify(data.content));
      }

      if (data.contentType !== undefined) {
        paramCount++;
        updates.push(`content_type = $${paramCount}`);
        params.push(data.contentType);
      }

      if (data.status !== undefined) {
        paramCount++;
        updates.push(`status = $${paramCount}`);
        params.push(data.status);
      }

      if (data.metadata !== undefined) {
        paramCount++;
        updates.push(`metadata = $${paramCount}`);
        params.push(JSON.stringify(data.metadata));
      }

      // Always update updated_at
      paramCount++;
      updates.push(`updated_at = $${paramCount}`);
      params.push(new Date());

      // Add ID as last parameter
      paramCount++;
      params.push(id);

      const query = `
        UPDATE contents 
        SET ${updates.join(', ')}
        WHERE id = $${paramCount}
        RETURNING *
      `;

      const result = await this.platformService.query(query, params);
      return result.rows[0];
    } catch (error) {
      if (error instanceof NotFoundException || error instanceof ForbiddenException) {
        throw error;
      }
      this.logger.error(`Failed to update content ${id}:`, error);
      throw new InternalServerErrorException('Failed to update content');
    }
  }

  /**
   * Delete content
   */
  async delete(id: string, userId?: string): Promise<void> {
    try {
      // First check if content exists
      const existing = await this.findOne(id);
      if (!existing) {
        throw new NotFoundException('Content not found');
      }

      // Check authorization if userId is provided
      if (userId && existing.user_id !== userId) {
        throw new ForbiddenException('You can only delete your own content');
      }

      const query = `DELETE FROM contents WHERE id = $1`;
      await this.platformService.query(query, [id]);
    } catch (error) {
      if (error instanceof NotFoundException || error instanceof ForbiddenException) {
        throw error;
      }
      this.logger.error(`Failed to delete content ${id}:`, error);
      throw new InternalServerErrorException('Failed to delete content');
    }
  }

  /**
   * Create a new version of content
   */
  async createVersion(
    parentId: string,
    data: Partial<CreateContentDto>,
    userId?: string
  ): Promise<Content> {
    try {
      // Get parent content
      const parent = await this.findOne(parentId);
      if (!parent) {
        throw new NotFoundException('Parent content not found');
      }

      // Create new version
      const newVersion = await this.create({
        ...data,
        contentType: data.contentType || parent.content_type,
        title: data.title || parent.title,
        content: data.content || parent.content,
        source: data.source || parent.source,
        sourceDetails: data.sourceDetails || parent.source_details,
        parameters: data.parameters || parent.parameters,
        metadata: {
          ...parent.metadata,
          ...data.metadata,
          parentVersion: parent.version
        },
        projectId: parent.project_id,
        appId: parent.app_id,
        organizationId: parent.organization_id,
        userId: userId || parent.user_id
      }, userId);

      // Update parent_id for the new version
      const updateQuery = `
        UPDATE contents 
        SET parent_id = $1, version = $2
        WHERE id = $3
        RETURNING *
      `;

      const result = await this.platformService.query(updateQuery, [
        parentId,
        parent.version + 1,
        newVersion.id
      ]);

      return result.rows[0];
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      this.logger.error(`Failed to create version for ${parentId}:`, error);
      throw new InternalServerErrorException('Failed to create content version');
    }
  }

  /**
   * Get content versions
   */
  async getVersions(contentId: string): Promise<Content[]> {
    try {
      const query = `
        SELECT * FROM contents 
        WHERE parent_id = $1 OR id = $1
        ORDER BY version DESC, created_at DESC
      `;

      const result = await this.platformService.query(query, [contentId]);
      return result.rows;
    } catch (error) {
      this.logger.error(`Failed to fetch versions for ${contentId}:`, error);
      throw new InternalServerErrorException('Failed to fetch content versions');
    }
  }

  /**
   * Archive content (soft delete)
   */
  async archive(id: string, userId?: string): Promise<Content> {
    return this.update(id, { status: 'archived' }, userId);
  }

  /**
   * Restore archived content
   */
  async restore(id: string, userId?: string): Promise<Content> {
    return this.update(id, { status: 'active' }, userId);
  }

  /**
   * Get content statistics
   */
  async getStatistics(
    projectId?: string,
    appId?: string,
    organizationId?: string
  ): Promise<any> {
    try {
      let whereClause = 'WHERE 1=1';
      const params: any[] = [];
      let paramCount = 0;

      if (organizationId) {
        paramCount++;
        whereClause += ` AND organization_id = $${paramCount}`;
        params.push(organizationId);
      }

      if (projectId) {
        paramCount++;
        whereClause += ` AND project_id = $${paramCount}`;
        params.push(projectId);
      }

      if (appId) {
        paramCount++;
        whereClause += ` AND app_id = $${paramCount}`;
        params.push(appId);
      }

      const query = `
        SELECT 
          COUNT(*) as total,
          COUNT(DISTINCT user_id) as unique_users,
          COUNT(DISTINCT content_type) as content_types,
          SUM(CASE WHEN status = 'active' THEN 1 ELSE 0 END) as active,
          SUM(CASE WHEN status = 'archived' THEN 1 ELSE 0 END) as archived,
          SUM(CASE WHEN created_at > NOW() - INTERVAL '7 days' THEN 1 ELSE 0 END) as last_7_days,
          SUM(CASE WHEN created_at > NOW() - INTERVAL '30 days' THEN 1 ELSE 0 END) as last_30_days
        FROM contents
        ${whereClause}
      `;

      const result = await this.platformService.query(query, params);
      return result.rows[0];
    } catch (error) {
      this.logger.error('Failed to fetch content statistics:', error);
      throw new InternalServerErrorException('Failed to fetch statistics');
    }
  }
}