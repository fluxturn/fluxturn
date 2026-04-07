import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { SESService } from './ses.service';
import { TemplateService } from './template.service';
import { PlatformService } from '../database/platform.service';

export interface EmailOptions {
  from?: string;
  to: string | string[];
  cc?: string | string[];
  bcc?: string | string[];
  subject: string;
  text?: string;
  html?: string;
  templateId?: string;
  templateData?: Record<string, any>;
  attachments?: Array<{
    filename: string;
    content: Buffer | string;
    contentType?: string;
  }>;
  tags?: string[];
  metadata?: Record<string, any>;
}

export interface EmailLog {
  id: string;
  organizationId?: string;
  projectId?: string;
  appId?: string;
  to: string[];
  cc?: string[];
  bcc?: string[];
  from: string;
  subject: string;
  templateId?: string;
  templateData?: any;
  status: 'sent' | 'failed' | 'pending';
  messageId?: string;
  error?: string;
  sentAt?: Date;
  createdAt: Date;
  metadata?: any;
}

@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);

  constructor(
    private readonly configService: ConfigService,
    private readonly sesService: SESService,
    private readonly templateService: TemplateService,
    private readonly platformService: PlatformService,
  ) {}

  /**
   * Send an email with optional template and logging
   * Can be used for both platform emails (no projectId/appId) and tenant emails
   */
  async sendEmail(
    options: EmailOptions & {
      organizationId?: string;
      projectId?: string;
      appId?: string;
      skipLogging?: boolean;
    }
  ): Promise<{ success: boolean; messageId?: string; error?: string }> {
    try {
      const { organizationId, projectId, appId, skipLogging, ...emailOptions } = options;

      // Prepare email content
      let html = emailOptions.html;
      let text = emailOptions.text;
      let subject = emailOptions.subject;

      // If template is specified, render it
      if (emailOptions.templateId) {
        const template = await this.getTemplate(emailOptions.templateId, projectId);
        if (template) {
          const rendered = await this.templateService.renderTemplate(
            template.content,
            template.type || 'html',
            emailOptions.templateData || {}
          );
          html = rendered.html;
          text = rendered.text || text;
          // Render subject with template data using simple replacement
          subject = template.subject || subject;
          if (emailOptions.templateData) {
            Object.keys(emailOptions.templateData).forEach(key => {
              const regex = new RegExp(`{{\\s*${key}\\s*}}`, 'g');
              subject = subject.replace(regex, emailOptions.templateData[key]);
            });
          }
        }
      }

      // Normalize recipients
      const to = Array.isArray(emailOptions.to) ? emailOptions.to : [emailOptions.to];
      const cc = emailOptions.cc ? (Array.isArray(emailOptions.cc) ? emailOptions.cc : [emailOptions.cc]) : undefined;
      const bcc = emailOptions.bcc ? (Array.isArray(emailOptions.bcc) ? emailOptions.bcc : [emailOptions.bcc]) : undefined;

      // Send email via SES
      const result = await this.sesService.sendEmail(
        {
          from: emailOptions.from,
          to,
          cc,
          bcc,
          subject,
          text,
          html,
          tags: emailOptions.tags?.map(tag => ({ Name: tag, Value: 'true' })),
        },
        projectId,
        appId
      );

      // Log email if not skipped
      if (!skipLogging) {
        await this.logEmail({
          organizationId,
          projectId,
          appId,
          to,
          cc,
          bcc,
          from: emailOptions.from || this.configService.get('EMAIL_DEFAULT_FROM', 'noreply@localhost'),
          subject,
          templateId: emailOptions.templateId,
          templateData: emailOptions.templateData,
          status: result.status,
          messageId: result.messageId,
          error: result.error,
          sentAt: result.status === 'sent' ? new Date() : undefined,
          metadata: emailOptions.metadata,
        });
      }

      // Update usage count if projectId is provided
      if (projectId && result.status === 'sent') {
        await this.updateUsageCount(projectId, appId);
      }

      return {
        success: result.status === 'sent',
        messageId: result.messageId,
        error: result.error,
      };
    } catch (error) {
      this.logger.error(`Failed to send email: ${error.message}`, error.stack);
      
      // Log failed attempt
      if (!options.skipLogging) {
        await this.logEmail({
          organizationId: options.organizationId,
          projectId: options.projectId,
          appId: options.appId,
          to: Array.isArray(options.to) ? options.to : [options.to],
          from: options.from || this.configService.get('EMAIL_DEFAULT_FROM', 'noreply@localhost'),
          subject: options.subject,
          templateId: options.templateId,
          templateData: options.templateData,
          status: 'failed',
          error: error.message,
          metadata: options.metadata,
        });
      }

      throw error;
    }
  }

  /**
   * Send a simple email without templates
   */
  async sendSimpleEmail(
    to: string | string[],
    subject: string,
    content: { text?: string; html?: string },
    options?: {
      projectId?: string;
      appId?: string;
      from?: string;
      cc?: string | string[];
      bcc?: string | string[];
    }
  ) {
    return this.sendEmail({
      to,
      subject,
      text: content.text,
      html: content.html,
      from: options?.from,
      cc: options?.cc,
      bcc: options?.bcc,
      projectId: options?.projectId,
      appId: options?.appId,
    });
  }

  /**
   * Send email using a template
   */
  async sendTemplateEmail(
    to: string | string[],
    templateId: string,
    templateData: Record<string, any>,
    options?: {
      organizationId?: string;
      projectId?: string;
      appId?: string;
      from?: string;
      subject?: string;
      cc?: string | string[];
      bcc?: string | string[];
    }
  ) {
    return this.sendEmail({
      to,
      subject: options?.subject || 'Email Notification',
      templateId,
      templateData,
      from: options?.from,
      cc: options?.cc,
      bcc: options?.bcc,
      organizationId: options?.organizationId,
      projectId: options?.projectId,
      appId: options?.appId,
    });
  }

  /**
   * Log email to database
   */
  private async logEmail(data: Omit<EmailLog, 'id' | 'createdAt'>): Promise<void> {
    try {
      const query = `
        INSERT INTO email_logs (
          organization_id, project_id, "to", cc, bcc, "from", subject,
          template_id, template_data, status, message_id, error,
          sent_at, metadata, created_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, NOW())
      `;

      const values = [
        data.organizationId || null,
        data.projectId || null,
        data.to,
        data.cc || null,
        data.bcc || null,
        data.from,
        data.subject,
        data.templateId || null,
        data.templateData ? JSON.stringify(data.templateData) : null,
        data.status,
        data.messageId || null,
        data.error || null,
        data.sentAt || null,
        data.metadata ? JSON.stringify(data.metadata) : null,
      ];

      await this.platformService.query(query, values);
    } catch (error) {
      // Don't throw on logging errors, just log them
      this.logger.error(`Failed to log email: ${error.message}`);
    }
  }

  /**
   * Update project usage count
   */
  private async updateUsageCount(projectId: string, appId?: string): Promise<void> {
    try {
      const table = appId ? 'app_usage' : 'project_usage';
      const idColumn = appId ? 'app_id' : 'project_id';
      const idValue = appId || projectId;

      const query = `
        INSERT INTO ${table} (${idColumn}, email_count, month, updated_at)
        VALUES ($1, 1, DATE_TRUNC('month', NOW()), NOW())
        ON CONFLICT (${idColumn}, month)
        DO UPDATE SET 
          email_count = ${table}.email_count + 1,
          updated_at = NOW()
      `;

      await this.platformService.query(query, [idValue]);
    } catch (error) {
      this.logger.error(`Failed to update usage count: ${error.message}`);
    }
  }

  /**
   * Get email template (public method for controller use)
   */
  async getTemplate(templateId: string, projectId?: string, appId?: string): Promise<any> {
    try {
      let query: string;
      let values: any[];

      if (appId) {
        // Try app-specific template first, then project, then platform
        query = `
          SELECT * FROM email_templates 
          WHERE id = $1 
            AND (app_id = $2 
                 OR (app_id IS NULL AND project_id = (SELECT project_id FROM apps WHERE id = $2))
                 OR (app_id IS NULL AND project_id IS NULL))
          ORDER BY 
            CASE 
              WHEN app_id = $2 THEN 1
              WHEN project_id = (SELECT project_id FROM apps WHERE id = $2) THEN 2
              ELSE 3
            END
          LIMIT 1
        `;
        values = [templateId, appId];
      } else if (projectId) {
        // Try project-specific template first, then platform
        query = `
          SELECT * FROM email_templates 
          WHERE id = $1 
            AND (project_id = $2 OR project_id IS NULL)
            AND app_id IS NULL
          ORDER BY project_id DESC NULLS LAST
          LIMIT 1
        `;
        values = [templateId, projectId];
      } else {
        // Get platform template only
        query = `
          SELECT * FROM email_templates 
          WHERE id = $1 
            AND project_id IS NULL 
            AND app_id IS NULL
          LIMIT 1
        `;
        values = [templateId];
      }

      const result = await this.platformService.query(query, values);
      return result.rows[0];
    } catch (error) {
      this.logger.error(`Failed to get template: ${error.message}`);
      return null;
    }
  }

  /**
   * Get all templates for a project or app
   */
  async getTemplates(projectId?: string, appId?: string): Promise<any[]> {
    try {
      let query: string;
      let values: any[] = [];

      if (appId) {
        // Get app, project, and platform templates
        query = `
          SELECT * FROM email_templates 
          WHERE app_id = $1
             OR (app_id IS NULL AND project_id = (SELECT project_id FROM apps WHERE id = $1))
             OR (app_id IS NULL AND project_id IS NULL)
          ORDER BY 
            CASE 
              WHEN app_id = $1 THEN 1
              WHEN project_id = (SELECT project_id FROM apps WHERE id = $1) THEN 2
              ELSE 3
            END,
            created_at DESC
        `;
        values = [appId];
      } else if (projectId) {
        // Get project and platform templates
        query = `
          SELECT * FROM email_templates 
          WHERE (project_id = $1 OR project_id IS NULL)
            AND app_id IS NULL
          ORDER BY project_id DESC NULLS LAST, created_at DESC
        `;
        values = [projectId];
      } else {
        // Get only platform templates
        query = `
          SELECT * FROM email_templates 
          WHERE project_id IS NULL AND app_id IS NULL
          ORDER BY created_at DESC
        `;
      }

      const result = await this.platformService.query(query, values);
      return result.rows;
    } catch (error) {
      this.logger.error(`Failed to get templates: ${error.message}`);
      return [];
    }
  }

  /**
   * Create or update an email template
   */
  async saveTemplate(
    templateData: {
      id: string;
      name: string;
      subject: string;
      content: string;
      type?: 'html' | 'text' | 'mjml';
      metadata?: any;
    },
    projectId?: string,
    appId?: string
  ): Promise<any> {
    try {
      const { id, name, subject, content, type = 'html', metadata = {} } = templateData;

      // Check if template exists
      const existingQuery = `
        SELECT id FROM email_templates 
        WHERE id = $1 
          AND ($2::uuid IS NULL OR project_id = $2)
          AND ($3::uuid IS NULL OR app_id = $3)
      `;
      const existing = await this.platformService.query(existingQuery, [id, projectId || null, appId || null]);

      if (existing.rows.length > 0) {
        // Update existing template
        const updateQuery = `
          UPDATE email_templates 
          SET name = $2, subject = $3, content = $4, type = $5, 
              metadata = $6, updated_at = NOW()
          WHERE id = $1 
            AND ($7::uuid IS NULL OR project_id = $7)
            AND ($8::uuid IS NULL OR app_id = $8)
          RETURNING *
        `;
        const result = await this.platformService.query(updateQuery, [
          id, name, subject, content, type, 
          JSON.stringify(metadata), projectId || null, appId || null
        ]);
        return result.rows[0];
      } else {
        // Create new template
        const insertQuery = `
          INSERT INTO email_templates (
            id, project_id, app_id, name, subject, content, type, metadata, created_at, updated_at
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW(), NOW())
          RETURNING *
        `;
        const result = await this.platformService.query(insertQuery, [
          id, projectId || null, appId || null, name, subject, content, type, JSON.stringify(metadata)
        ]);
        return result.rows[0];
      }
    } catch (error) {
      this.logger.error(`Failed to save template: ${error.message}`);
      throw error;
    }
  }

  /**
   * Get email logs
   */
  async getEmailLogs(
    filters: {
      projectId?: string;
      appId?: string;
      status?: string;
      from?: Date;
      to?: Date;
    },
    pagination: {
      page?: number;
      limit?: number;
      sortBy?: string;
      sortOrder?: 'asc' | 'desc';
    } = {}
  ) {
    try {
      const { page = 1, limit = 20, sortBy = 'created_at', sortOrder = 'desc' } = pagination;
      const offset = (page - 1) * limit;

      let whereConditions: string[] = [];
      let values: any[] = [];
      let paramIndex = 1;

      if (filters.projectId) {
        whereConditions.push(`project_id = $${paramIndex++}`);
        values.push(filters.projectId);
      }

      if (filters.appId) {
        whereConditions.push(`app_id = $${paramIndex++}`);
        values.push(filters.appId);
      }

      if (filters.status) {
        whereConditions.push(`status = $${paramIndex++}`);
        values.push(filters.status);
      }

      if (filters.from) {
        whereConditions.push(`created_at >= $${paramIndex++}`);
        values.push(filters.from);
      }

      if (filters.to) {
        whereConditions.push(`created_at <= $${paramIndex++}`);
        values.push(filters.to);
      }

      const whereClause = whereConditions.length > 0 ? `WHERE ${whereConditions.join(' AND ')}` : '';

      // Get total count
      const countQuery = `SELECT COUNT(*) FROM email_logs ${whereClause}`;
      const countResult = await this.platformService.query(countQuery, values);
      const total = parseInt(countResult.rows[0].count);

      // Get logs
      const query = `
        SELECT * FROM email_logs 
        ${whereClause}
        ORDER BY ${sortBy} ${sortOrder}
        LIMIT $${paramIndex++} OFFSET $${paramIndex}
      `;
      values.push(limit, offset);

      const result = await this.platformService.query(query, values);

      return {
        data: result.rows,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
        },
      };
    } catch (error) {
      this.logger.error(`Failed to get email logs: ${error.message}`);
      throw error;
    }
  }

  /**
   * Get email statistics
   */
  async getEmailStats(projectId?: string, appId?: string) {
    try {
      let whereConditions: string[] = [];
      let values: any[] = [];
      let paramIndex = 1;

      if (projectId) {
        whereConditions.push(`project_id = $${paramIndex++}`);
        values.push(projectId);
      }

      if (appId) {
        whereConditions.push(`app_id = $${paramIndex++}`);
        values.push(appId);
      }

      const whereClause = whereConditions.length > 0 ? `WHERE ${whereConditions.join(' AND ')}` : '';

      const query = `
        SELECT 
          COUNT(*) as total,
          COUNT(CASE WHEN status = 'sent' THEN 1 END) as sent,
          COUNT(CASE WHEN status = 'failed' THEN 1 END) as failed,
          COUNT(CASE WHEN status = 'pending' THEN 1 END) as pending,
          DATE_TRUNC('day', created_at) as date
        FROM email_logs
        ${whereClause}
        GROUP BY DATE_TRUNC('day', created_at)
        ORDER BY date DESC
        LIMIT 30
      `;

      const result = await this.platformService.query(query, values);
      
      return {
        daily: result.rows,
        summary: result.rows.reduce((acc, row) => ({
          total: acc.total + parseInt(row.total),
          sent: acc.sent + parseInt(row.sent),
          failed: acc.failed + parseInt(row.failed),
          pending: acc.pending + parseInt(row.pending),
        }), { total: 0, sent: 0, failed: 0, pending: 0 }),
      };
    } catch (error) {
      this.logger.error(`Failed to get email stats: ${error.message}`);
      throw error;
    }
  }

  /**
   * Get templates list with filtering and pagination
   */
  async getTemplatesList(
    filters: {
      organizationId?: string;
      projectId?: string;
      appId?: string;
      category?: string;
      search?: string;
    },
    pagination: {
      page?: number;
      limit?: number;
    } = {}
  ) {
    try {
      const { page = 1, limit = 20 } = pagination;
      const offset = (page - 1) * limit;

      let whereConditions: string[] = [];
      let values: any[] = [];
      let paramIndex = 1;

      // Organization-level filtering (multi-tenant isolation)
      if (filters.organizationId) {
        whereConditions.push(`(organization_id = $${paramIndex++} OR organization_id IS NULL)`);
        values.push(filters.organizationId);
      }

      if (filters.appId) {
        whereConditions.push(`app_id = $${paramIndex++}`);
        values.push(filters.appId);
      } else if (filters.projectId) {
        whereConditions.push(`(project_id = $${paramIndex++} OR (project_id IS NULL AND app_id IS NULL))`);
        values.push(filters.projectId);
      } else if (!filters.organizationId) {
        // Platform-level templates only (no org, project, or app)
        whereConditions.push(`organization_id IS NULL AND project_id IS NULL AND app_id IS NULL`);
      }

      if (filters.category) {
        whereConditions.push(`category = $${paramIndex++}`);
        values.push(filters.category);
      }

      if (filters.search) {
        whereConditions.push(`(name ILIKE $${paramIndex} OR subject ILIKE $${paramIndex})`);
        values.push(`%${filters.search}%`);
        paramIndex++;
      }

      const whereClause = whereConditions.length > 0 ? `WHERE ${whereConditions.join(' AND ')}` : '';

      // Get total count
      const countQuery = `SELECT COUNT(*) FROM email_templates ${whereClause}`;
      const countResult = await this.platformService.query(countQuery, values);
      const total = parseInt(countResult.rows[0].count);

      // Get templates
      const query = `
        SELECT * FROM email_templates
        ${whereClause}
        ORDER BY created_at DESC
        LIMIT $${paramIndex++} OFFSET $${paramIndex}
      `;
      values.push(limit, offset);

      const result = await this.platformService.query(query, values);

      return {
        data: result.rows,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
        },
      };
    } catch (error) {
      this.logger.error(`Failed to get templates list: ${error.message}`);
      throw error;
    }
  }

  /**
   * Create a new email template
   */
  async createTemplate(
    templateData: {
      name: string;
      subject: string;
      content: string;
      type?: 'html' | 'text' | 'mjml';
      category?: string;
      metadata?: any;
    },
    organizationId?: string,
    projectId?: string,
    appId?: string
  ): Promise<any> {
    try {
      const templateId = `template_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      const { name, subject, content, type = 'html', category = 'general', metadata = {} } = templateData;

      const query = `
        INSERT INTO email_templates (
          template_id, organization_id, project_id, app_id, name, subject, content, type, category, metadata, created_at, updated_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, NOW(), NOW())
        RETURNING *
      `;

      const result = await this.platformService.query(query, [
        templateId,
        organizationId || null,
        projectId || null,
        appId || null,
        name,
        subject,
        content,
        type,
        category,
        JSON.stringify(metadata),
      ]);

      return result.rows[0];
    } catch (error) {
      this.logger.error(`Failed to create template: ${error.message}`);
      throw error;
    }
  }

  /**
   * Update an email template
   */
  async updateTemplate(
    templateId: string,
    updates: {
      name?: string;
      subject?: string;
      content?: string;
      type?: 'html' | 'text' | 'mjml';
      category?: string;
      metadata?: any;
    },
    projectId?: string,
    appId?: string
  ): Promise<any> {
    try {
      const setClauses: string[] = [];
      const values: any[] = [];
      let paramIndex = 1;

      if (updates.name !== undefined) {
        setClauses.push(`name = $${paramIndex++}`);
        values.push(updates.name);
      }

      if (updates.subject !== undefined) {
        setClauses.push(`subject = $${paramIndex++}`);
        values.push(updates.subject);
      }

      if (updates.content !== undefined) {
        setClauses.push(`content = $${paramIndex++}`);
        values.push(updates.content);
      }

      if (updates.type !== undefined) {
        setClauses.push(`type = $${paramIndex++}`);
        values.push(updates.type);
      }

      if (updates.category !== undefined) {
        setClauses.push(`category = $${paramIndex++}`);
        values.push(updates.category);
      }

      if (updates.metadata !== undefined) {
        setClauses.push(`metadata = $${paramIndex++}`);
        values.push(JSON.stringify(updates.metadata));
      }

      if (setClauses.length === 0) {
        return null;
      }

      setClauses.push(`updated_at = NOW()`);

      // Add WHERE conditions
      values.push(templateId);
      const templateIdParam = paramIndex++;

      // Check both id (UUID) and template_id (string identifier)
      // Cast id::text to allow comparison with varchar template_id
      let whereClause = `(id::text = $${templateIdParam} OR template_id = $${templateIdParam})`;

      if (appId) {
        values.push(appId);
        whereClause += ` AND app_id = $${paramIndex++}`;
      } else if (projectId) {
        values.push(projectId);
        whereClause += ` AND project_id = $${paramIndex++} AND app_id IS NULL`;
      } else {
        whereClause += ` AND project_id IS NULL AND app_id IS NULL`;
      }

      const query = `
        UPDATE email_templates
        SET ${setClauses.join(', ')}
        WHERE ${whereClause}
        RETURNING *
      `;

      const result = await this.platformService.query(query, values);
      return result.rows[0] || null;
    } catch (error) {
      this.logger.error(`Failed to update template: ${error.message}`);
      throw error;
    }
  }

  /**
   * Delete an email template
   */
  async deleteTemplate(templateId: string, projectId?: string, appId?: string): Promise<boolean> {
    try {
      // Check both id (UUID) and template_id (string identifier)
      // Cast id::text to allow comparison with varchar template_id
      let whereClause = '(id::text = $1 OR template_id = $1)';
      const values: any[] = [templateId];
      let paramIndex = 2;

      if (appId) {
        whereClause += ` AND app_id = $${paramIndex++}`;
        values.push(appId);
      } else if (projectId) {
        whereClause += ` AND project_id = $${paramIndex++} AND app_id IS NULL`;
        values.push(projectId);
      } else {
        whereClause += ` AND project_id IS NULL AND app_id IS NULL`;
      }

      const query = `DELETE FROM email_templates WHERE ${whereClause}`;
      const result = await this.platformService.query(query, values);
      return (result.rowCount || 0) > 0;
    } catch (error) {
      this.logger.error(`Failed to delete template: ${error.message}`);
      throw error;
    }
  }

  /**
   * Get campaigns with filtering and pagination
   */
  async getCampaigns(
    filters: {
      projectId?: string;
      appId?: string;
      status?: string;
      search?: string;
    },
    pagination: {
      page?: number;
      limit?: number;
    } = {}
  ) {
    try {
      const { page = 1, limit = 20 } = pagination;
      const offset = (page - 1) * limit;

      let whereConditions: string[] = [];
      let values: any[] = [];
      let paramIndex = 1;

      if (filters.projectId) {
        whereConditions.push(`project_id = $${paramIndex++}`);
        values.push(filters.projectId);
      }

      if (filters.appId) {
        whereConditions.push(`app_id = $${paramIndex++}`);
        values.push(filters.appId);
      }

      if (filters.status) {
        whereConditions.push(`status = $${paramIndex++}`);
        values.push(filters.status);
      }

      if (filters.search) {
        whereConditions.push(`(name ILIKE $${paramIndex} OR description ILIKE $${paramIndex})`);
        values.push(`%${filters.search}%`);
        paramIndex++;
      }

      const whereClause = whereConditions.length > 0 ? `WHERE ${whereConditions.join(' AND ')}` : '';

      // Get total count
      const countQuery = `SELECT COUNT(*) FROM email_campaigns ${whereClause}`;
      const countResult = await this.platformService.query(countQuery, values);
      const total = parseInt(countResult.rows[0].count);

      // Get campaigns
      const query = `
        SELECT * FROM email_campaigns
        ${whereClause}
        ORDER BY created_at DESC
        LIMIT $${paramIndex++} OFFSET $${paramIndex}
      `;
      values.push(limit, offset);

      const result = await this.platformService.query(query, values);

      return {
        data: result.rows,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
        },
      };
    } catch (error) {
      this.logger.error(`Failed to get campaigns: ${error.message}`);
      throw error;
    }
  }

  /**
   * Get a single campaign by ID
   */
  async getCampaign(campaignId: string, projectId?: string, appId?: string): Promise<any> {
    try {
      let whereClause = 'id = $1';
      const values: any[] = [campaignId];
      let paramIndex = 2;

      if (projectId) {
        whereClause += ` AND project_id = $${paramIndex++}`;
        values.push(projectId);
      }

      if (appId) {
        whereClause += ` AND app_id = $${paramIndex++}`;
        values.push(appId);
      }

      const query = `SELECT * FROM email_campaigns WHERE ${whereClause}`;
      const result = await this.platformService.query(query, values);
      return result.rows[0] || null;
    } catch (error) {
      this.logger.error(`Failed to get campaign: ${error.message}`);
      return null;
    }
  }

  /**
   * Create a new email campaign
   */
  async createCampaign(campaignData: {
    organizationId: string;
    projectId: string;
    appId?: string;
    name: string;
    description?: string;
    templateId: string;
    subject?: string;
    fromEmail?: string;
    fromName?: string;
    replyTo?: string;
    scheduledAt?: Date;
    metadata?: any;
    createdBy?: string;
  }): Promise<any> {
    try {
      const query = `
        INSERT INTO email_campaigns (
          organization_id, project_id, app_id, name, description, template_id,
          subject, from_email, from_name, reply_to, scheduled_at, metadata,
          created_by, created_at, updated_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, NOW(), NOW())
        RETURNING *
      `;

      const result = await this.platformService.query(query, [
        campaignData.organizationId,
        campaignData.projectId,
        campaignData.appId || null,
        campaignData.name,
        campaignData.description || null,
        campaignData.templateId,
        campaignData.subject || null,
        campaignData.fromEmail || null,
        campaignData.fromName || null,
        campaignData.replyTo || null,
        campaignData.scheduledAt || null,
        JSON.stringify(campaignData.metadata || {}),
        campaignData.createdBy || null,
      ]);

      return result.rows[0];
    } catch (error) {
      this.logger.error(`Failed to create campaign: ${error.message}`);
      throw error;
    }
  }

  /**
   * Update an email campaign
   */
  async updateCampaign(
    campaignId: string,
    updates: {
      name?: string;
      description?: string;
      templateId?: string;
      subject?: string;
      fromEmail?: string;
      fromName?: string;
      replyTo?: string;
      status?: string;
      scheduledAt?: Date;
      metadata?: any;
    },
    projectId?: string,
    appId?: string
  ): Promise<any> {
    try {
      const setClauses: string[] = [];
      const values: any[] = [];
      let paramIndex = 1;

      if (updates.name !== undefined) {
        setClauses.push(`name = $${paramIndex++}`);
        values.push(updates.name);
      }

      if (updates.description !== undefined) {
        setClauses.push(`description = $${paramIndex++}`);
        values.push(updates.description);
      }

      if (updates.templateId !== undefined) {
        setClauses.push(`template_id = $${paramIndex++}`);
        values.push(updates.templateId);
      }

      if (updates.subject !== undefined) {
        setClauses.push(`subject = $${paramIndex++}`);
        values.push(updates.subject);
      }

      if (updates.fromEmail !== undefined) {
        setClauses.push(`from_email = $${paramIndex++}`);
        values.push(updates.fromEmail);
      }

      if (updates.fromName !== undefined) {
        setClauses.push(`from_name = $${paramIndex++}`);
        values.push(updates.fromName);
      }

      if (updates.replyTo !== undefined) {
        setClauses.push(`reply_to = $${paramIndex++}`);
        values.push(updates.replyTo);
      }

      if (updates.status !== undefined) {
        setClauses.push(`status = $${paramIndex++}`);
        values.push(updates.status);
      }

      if (updates.scheduledAt !== undefined) {
        setClauses.push(`scheduled_at = $${paramIndex++}`);
        values.push(updates.scheduledAt);
      }

      if (updates.metadata !== undefined) {
        setClauses.push(`metadata = $${paramIndex++}`);
        values.push(JSON.stringify(updates.metadata));
      }

      if (setClauses.length === 0) {
        return null;
      }

      setClauses.push(`updated_at = NOW()`);

      // Add WHERE conditions
      values.push(campaignId);
      let whereClause = `id = $${paramIndex++}`;

      if (projectId) {
        values.push(projectId);
        whereClause += ` AND project_id = $${paramIndex++}`;
      }

      if (appId) {
        values.push(appId);
        whereClause += ` AND app_id = $${paramIndex++}`;
      }

      const query = `
        UPDATE email_campaigns
        SET ${setClauses.join(', ')}
        WHERE ${whereClause}
        RETURNING *
      `;

      const result = await this.platformService.query(query, values);
      return result.rows[0] || null;
    } catch (error) {
      this.logger.error(`Failed to update campaign: ${error.message}`);
      throw error;
    }
  }

  /**
   * Delete an email campaign
   */
  async deleteCampaign(campaignId: string, projectId?: string, appId?: string): Promise<boolean> {
    try {
      let whereClause = 'id = $1';
      const values: any[] = [campaignId];
      let paramIndex = 2;

      if (projectId) {
        whereClause += ` AND project_id = $${paramIndex++}`;
        values.push(projectId);
      }

      if (appId) {
        whereClause += ` AND app_id = $${paramIndex++}`;
        values.push(appId);
      }

      const query = `DELETE FROM email_campaigns WHERE ${whereClause}`;
      const result = await this.platformService.query(query, values);
      return (result.rowCount || 0) > 0;
    } catch (error) {
      this.logger.error(`Failed to delete campaign: ${error.message}`);
      throw error;
    }
  }

  /**
   * Get email service metrics
   */
  async getMetrics(projectId?: string, appId?: string) {
    try {
      let whereConditions: string[] = [];
      let values: any[] = [];
      let paramIndex = 1;

      if (projectId) {
        whereConditions.push(`project_id = $${paramIndex++}`);
        values.push(projectId);
      }

      if (appId) {
        whereConditions.push(`app_id = $${paramIndex++}`);
        values.push(appId);
      }

      const whereClause = whereConditions.length > 0 ? `WHERE ${whereConditions.join(' AND ')}` : '';

      // Get overall stats
      const statsQuery = `
        SELECT
          COUNT(*) FILTER (WHERE sent_at >= NOW() - INTERVAL '30 days') as total_sent,
          COUNT(*) FILTER (WHERE status = 'sent' AND sent_at >= NOW() - INTERVAL '30 days') as sent_last_30_days,
          COUNT(*) FILTER (WHERE status = 'failed' AND created_at >= NOW() - INTERVAL '30 days') as failed_last_30_days,
          COUNT(*) FILTER (WHERE created_at >= NOW() - INTERVAL '1 day') as sent_today
        FROM email_logs
        ${whereClause}
      `;

      const statsResult = await this.platformService.query(statsQuery, values);
      const stats = statsResult.rows[0];

      // Get template count
      const templateCountQuery = `
        SELECT COUNT(*) as count FROM email_templates ${whereClause}
      `;
      const templateResult = await this.platformService.query(templateCountQuery, values);

      // Get campaign stats
      const campaignQuery = `
        SELECT
          COUNT(*) as total,
          COUNT(*) FILTER (WHERE status = 'draft') as draft,
          COUNT(*) FILTER (WHERE status = 'sent') as sent,
          COUNT(*) FILTER (WHERE status = 'scheduled') as scheduled
        FROM email_campaigns
        ${whereClause}
      `;
      const campaignResult = await this.platformService.query(campaignQuery, values);

      return {
        emails: {
          totalSent: parseInt(stats.total_sent || 0),
          sentLast30Days: parseInt(stats.sent_last_30_days || 0),
          failedLast30Days: parseInt(stats.failed_last_30_days || 0),
          sentToday: parseInt(stats.sent_today || 0),
        },
        templates: {
          total: parseInt(templateResult.rows[0].count || 0),
        },
        campaigns: {
          total: parseInt(campaignResult.rows[0].total || 0),
          draft: parseInt(campaignResult.rows[0].draft || 0),
          sent: parseInt(campaignResult.rows[0].sent || 0),
          scheduled: parseInt(campaignResult.rows[0].scheduled || 0),
        },
      };
    } catch (error) {
      this.logger.error(`Failed to get metrics: ${error.message}`);
      throw error;
    }
  }
}