import { Injectable, Logger, NotFoundException, BadRequestException, ForbiddenException } from '@nestjs/common';
import { PlatformService } from '../../../database/platform.service';
import {
  CreateTemplateDto,
  UpdateTemplateDto,
  ListTemplatesDto,
  CreateWorkflowFromTemplateDto,
  TemplateResponseDto,
  TemplateListResponseDto
} from '../dto/template.dto';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class TemplateService {
  private readonly logger = new Logger(TemplateService.name);

  constructor(private readonly platformService: PlatformService) {}

  /**
   * Create a new workflow template
   */
  async createTemplate(
    dto: CreateTemplateDto,
    userId: string
  ): Promise<TemplateResponseDto> {
    try {
      const templateId = uuidv4();

      // Build template_definition from the workflow structure
      const templateDefinition = {
        canvas: dto.canvas,
        steps: dto.steps || [],
        triggers: dto.triggers || [],
        conditions: dto.conditions || [],
        variables: dto.variables || [],
        outputs: dto.outputs || [],
      };

      const query = `
        INSERT INTO workflow_templates (
          id,
          name,
          description,
          category,
          template_definition,
          canvas,
          steps,
          triggers,
          conditions,
          variables,
          outputs,
          required_connectors,
          tags,
          is_public,
          metadata,
          ai_prompt,
          created_by
        ) VALUES (
          $1, $2, $3, $4, $5, $6, $7, $8, $9, $10,
          $11, $12, $13, $14, $15, $16, $17
        )
        RETURNING *
      `;

      const values = [
        templateId,
        dto.name,
        dto.description,
        dto.category,
        JSON.stringify(templateDefinition),  // template_definition JSONB
        JSON.stringify(dto.canvas),
        JSON.stringify(dto.steps || []),
        JSON.stringify(dto.triggers || []),
        JSON.stringify(dto.conditions || []),
        JSON.stringify(dto.variables || []),
        JSON.stringify(dto.outputs || []),
        dto.required_connectors || [],  // PostgreSQL array type - don't stringify
        dto.tags || [],  // PostgreSQL array type - don't stringify
        dto.is_public || false,
        JSON.stringify(dto.metadata || {}),
        dto.ai_prompt || null,
        userId
      ];

      const result = await this.platformService.query(query, values);
      const template = result.rows[0];

      this.logger.log(`Template created: ${template.id} by user ${userId}`);

      return this.formatTemplateResponse(template);
    } catch (error) {
      this.logger.error('Failed to create template:', error);
      this.logger.error('Error details:', error.message, error.stack);
      throw new BadRequestException(error.message || 'Failed to create template');
    }
  }

  /**
   * Get a template by ID
   */
  async getTemplate(
    templateId: string,
    userId?: string
  ): Promise<TemplateResponseDto> {
    try {
      const query = `
        SELECT * FROM workflow_templates
        WHERE id = $1
        AND (is_public = true OR created_by = $2)
      `;

      const result = await this.platformService.query(query, [templateId, userId]);

      if (result.rows.length === 0) {
        throw new NotFoundException('Template not found');
      }

      const template = result.rows[0];

      // Increment use count
      await this.incrementUseCount(templateId);

      return this.formatTemplateResponse(template);
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      this.logger.error(`Failed to get template ${templateId}:`, error);
      throw new BadRequestException('Failed to retrieve template');
    }
  }

  /**
   * List templates with filtering and pagination
   */
  async listTemplates(
    dto: ListTemplatesDto,
    userId?: string
  ): Promise<TemplateListResponseDto> {
    try {
      let whereConditions = ['1=1'];
      let values: any[] = [];
      let valueIndex = 1;

      // Public filter - show public templates or user's own templates
      if (dto.is_public !== undefined) {
        whereConditions.push(`(is_public = $${valueIndex} OR created_by = $${valueIndex + 1})`);
        values.push(dto.is_public, userId);
        valueIndex += 2;
      } else {
        whereConditions.push(`(is_public = true OR created_by = $${valueIndex})`);
        values.push(userId);
        valueIndex += 1;
      }

      // Category filter
      if (dto.category) {
        whereConditions.push(`category = $${valueIndex}`);
        values.push(dto.category);
        valueIndex += 1;
      }

      // Search filter
      if (dto.search) {
        whereConditions.push(`(
          name ILIKE $${valueIndex} OR 
          description ILIKE $${valueIndex}
        )`);
        values.push(`%${dto.search}%`);
        valueIndex += 1;
      }

      // Required connectors filter
      if (dto.connectors && dto.connectors.length > 0) {
        whereConditions.push(`required_connectors ?& $${valueIndex}`);
        values.push(dto.connectors);
        valueIndex += 1;
      }

      // Tags filter
      if (dto.tags && dto.tags.length > 0) {
        whereConditions.push(`tags ?& $${valueIndex}`);
        values.push(dto.tags);
        valueIndex += 1;
      }

      // Filter by type (Popular, Verified, New)
      let orderByClause = `${dto.sortBy} ${dto.sortOrder}`;

      if (dto.filter) {
        switch (dto.filter) {
          case 'popular':
            // Filter by popular: order by use_count descending
            orderByClause = `use_count DESC`;
            break;
          case 'verified':
            // Filter by verified: show only verified templates
            whereConditions.push(`verified = true`);
            break;
          case 'new':
            // Filter by new: order by created_at descending
            orderByClause = `created_at DESC`;
            break;
          case 'all':
          default:
            // Use default sorting
            break;
        }
      }

      const whereClause = whereConditions.join(' AND ');
      const offset = (dto.page - 1) * dto.limit;

      // Count total matching templates
      const countQuery = `
        SELECT COUNT(*) as total
        FROM workflow_templates
        WHERE ${whereClause}
      `;

      const countResult = await this.platformService.query(countQuery, values);
      const total = parseInt(countResult.rows[0].total);

      // Get templates with pagination
      const templatesQuery = `
        SELECT * FROM workflow_templates
        WHERE ${whereClause}
        ORDER BY ${orderByClause}
        LIMIT $${valueIndex} OFFSET $${valueIndex + 1}
      `;

      values.push(dto.limit, offset);
      const templatesResult = await this.platformService.query(templatesQuery, values);

      const templates = templatesResult.rows.map(row => this.formatTemplateResponse(row));

      return {
        templates,
        total,
        page: dto.page,
        limit: dto.limit,
        totalPages: Math.ceil(total / dto.limit)
      };
    } catch (error) {
      this.logger.error('Failed to list templates:', error);
      throw new BadRequestException('Failed to list templates');
    }
  }

  /**
   * Update a template
   */
  async updateTemplate(
    templateId: string,
    dto: UpdateTemplateDto,
    userId: string
  ): Promise<TemplateResponseDto> {
    try {
      // Check ownership
      const checkQuery = `
        SELECT created_by FROM workflow_templates
        WHERE id = $1
      `;
      const checkResult = await this.platformService.query(checkQuery, [templateId]);

      if (checkResult.rows.length === 0) {
        throw new NotFoundException('Template not found');
      }

      if (checkResult.rows[0].created_by !== userId) {
        throw new ForbiddenException('You can only update your own templates');
      }

      // Build update query
      let updateFields: string[] = [];
      let values: any[] = [];
      let valueIndex = 1;

      if (dto.name !== undefined) {
        updateFields.push(`name = $${valueIndex}`);
        values.push(dto.name);
        valueIndex++;
      }

      if (dto.description !== undefined) {
        updateFields.push(`description = $${valueIndex}`);
        values.push(dto.description);
        valueIndex++;
      }

      if (dto.category !== undefined) {
        updateFields.push(`category = $${valueIndex}`);
        values.push(dto.category);
        valueIndex++;
      }


      if (dto.canvas !== undefined) {
        updateFields.push(`canvas = $${valueIndex}`);
        values.push(JSON.stringify(dto.canvas));
        valueIndex++;
      }

      if (dto.steps !== undefined) {
        updateFields.push(`steps = $${valueIndex}`);
        values.push(JSON.stringify(dto.steps));
        valueIndex++;
      }

      if (dto.triggers !== undefined) {
        updateFields.push(`triggers = $${valueIndex}`);
        values.push(JSON.stringify(dto.triggers));
        valueIndex++;
      }

      if (dto.conditions !== undefined) {
        updateFields.push(`conditions = $${valueIndex}`);
        values.push(JSON.stringify(dto.conditions));
        valueIndex++;
      }

      if (dto.variables !== undefined) {
        updateFields.push(`variables = $${valueIndex}`);
        values.push(JSON.stringify(dto.variables));
        valueIndex++;
      }

      if (dto.outputs !== undefined) {
        updateFields.push(`outputs = $${valueIndex}`);
        values.push(JSON.stringify(dto.outputs));
        valueIndex++;
      }

      if (dto.required_connectors !== undefined) {
        updateFields.push(`required_connectors = $${valueIndex}`);
        values.push(dto.required_connectors);  // PostgreSQL array type - don't stringify
        valueIndex++;
      }

      if (dto.tags !== undefined) {
        updateFields.push(`tags = $${valueIndex}`);
        values.push(dto.tags);  // PostgreSQL array type - don't stringify
        valueIndex++;
      }

      if (dto.is_public !== undefined) {
        updateFields.push(`is_public = $${valueIndex}`);
        values.push(dto.is_public);
        valueIndex++;
      }

      if (dto.metadata !== undefined) {
        updateFields.push(`metadata = $${valueIndex}`);
        values.push(JSON.stringify(dto.metadata));
        valueIndex++;
      }

      if (dto.ai_prompt !== undefined) {
        updateFields.push(`ai_prompt = $${valueIndex}`);
        values.push(dto.ai_prompt);
        valueIndex++;
      }

      // Always update updated_at
      updateFields.push(`updated_at = NOW()`);

      values.push(templateId);
      const updateQuery = `
        UPDATE workflow_templates
        SET ${updateFields.join(', ')}
        WHERE id = $${valueIndex}
        RETURNING *
      `;

      const result = await this.platformService.query(updateQuery, values);
      
      this.logger.log(`Template updated: ${templateId}`);
      
      return this.formatTemplateResponse(result.rows[0]);
    } catch (error) {
      if (error instanceof NotFoundException || error instanceof ForbiddenException) {
        throw error;
      }
      this.logger.error(`Failed to update template ${templateId}:`, error);
      throw new BadRequestException('Failed to update template');
    }
  }

  /**
   * Delete a template
   */
  async deleteTemplate(templateId: string, userId: string): Promise<void> {
    try {
      // Check ownership
      const checkQuery = `
        SELECT created_by FROM workflow_templates
        WHERE id = $1
      `;
      const checkResult = await this.platformService.query(checkQuery, [templateId]);

      if (checkResult.rows.length === 0) {
        throw new NotFoundException('Template not found');
      }

      if (checkResult.rows[0].created_by !== userId) {
        throw new ForbiddenException('You can only delete your own templates');
      }

      const deleteQuery = `
        DELETE FROM workflow_templates
        WHERE id = $1
      `;

      await this.platformService.query(deleteQuery, [templateId]);
      
      this.logger.log(`Template deleted: ${templateId} by user ${userId}`);
    } catch (error) {
      if (error instanceof NotFoundException || error instanceof ForbiddenException) {
        throw error;
      }
      this.logger.error(`Failed to delete template ${templateId}:`, error);
      throw new BadRequestException('Failed to delete template');
    }
  }

  /**
   * Create a workflow from a template
   */
  async createWorkflowFromTemplate(
    dto: CreateWorkflowFromTemplateDto,
    userId: string
  ): Promise<any> {
    try {
      // Get the template
      const template = await this.getTemplate(dto.templateId, userId);

      // Create workflow data from template
      const workflowData = {
        name: dto.workflowName,
        description: dto.workflowDescription || template.description,
        canvas: template.canvas,
        steps: template.steps || [],
        trigger: template.triggers || [],
        conditions: template.conditions || [],
        variables: template.variables || [],
        outputs: template.outputs || [],
        status: 'draft',
        is_active: true,
        is_template: false,
        metadata: {
          ...template.metadata,
          created_from_template: template.id,
          template_name: template.name,
          ...dto.customConfig
        }
      };

      // Insert workflow
      const workflowId = uuidv4();
      const query = `
        INSERT INTO workflows (
          id,
          user_id,
          name,
          description,
          canvas,
          steps,
          trigger,
          conditions,
          variables,
          outputs,
          status,
          is_active,
          is_template,
          metadata,
          template_id
        ) VALUES (
          $1, $2, $3, $4, $5, $6, $7, $8, $9, $10,
          $11, $12, $13, $14, $15
        )
        RETURNING *
      `;

      const values = [
        workflowId,
        userId,
        workflowData.name,
        workflowData.description,
        JSON.stringify(workflowData.canvas),
        JSON.stringify(workflowData.steps),
        JSON.stringify(workflowData.trigger),
        JSON.stringify(workflowData.conditions),
        JSON.stringify(workflowData.variables),
        JSON.stringify(workflowData.outputs),
        workflowData.status,
        workflowData.is_active,
        workflowData.is_template,
        JSON.stringify(workflowData.metadata),
        dto.templateId
      ];

      const result = await this.platformService.query(query, values);
      const workflow = result.rows[0];

      // Increment template use count
      await this.incrementUseCount(dto.templateId);

      this.logger.log(`Workflow ${workflow.id} created from template ${template.id}`);

      return {
        id: workflow.id,
        name: workflow.name,
        description: workflow.description,
        status: workflow.status,
        created_from_template: template.id,
        template_name: template.name,
        created_at: workflow.created_at
      };
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      this.logger.error('Failed to create workflow from template:', error);
      throw new BadRequestException('Failed to create workflow from template');
    }
  }

  /**
   * Get popular templates
   */
  async getPopularTemplates(limit: number = 10): Promise<TemplateResponseDto[]> {
    try {
      const query = `
        SELECT * FROM workflow_templates
        WHERE is_public = true
        ORDER BY use_count DESC, created_at DESC
        LIMIT $1
      `;

      const result = await this.platformService.query(query, [limit]);
      
      return result.rows.map(row => this.formatTemplateResponse(row));
    } catch (error) {
      this.logger.error('Failed to get popular templates:', error);
      return [];
    }
  }

  /**
   * Get user's templates
   */
  async getUserTemplates(userId: string): Promise<TemplateResponseDto[]> {
    try {
      const query = `
        SELECT * FROM workflow_templates
        WHERE created_by = $1
        ORDER BY created_at DESC
      `;

      const result = await this.platformService.query(query, [userId]);
      
      return result.rows.map(row => this.formatTemplateResponse(row));
    } catch (error) {
      this.logger.error(`Failed to get user templates for ${userId}:`, error);
      return [];
    }
  }

  /**
   * Increment template use count
   */
  private async incrementUseCount(templateId: string): Promise<void> {
    try {
      this.logger.log(`Incrementing use count for template: ${templateId}`);

      const query = `
        UPDATE workflow_templates
        SET use_count = COALESCE(use_count, 0) + 1,
            updated_at = NOW()
        WHERE id = $1
        RETURNING id, use_count
      `;

      const result = await this.platformService.query(query, [templateId]);

      if (result.rows.length > 0) {
        this.logger.log(`Template ${templateId} use count updated to: ${result.rows[0].use_count}`);
      } else {
        this.logger.warn(`Template ${templateId} not found - could not increment use count`);
      }
    } catch (error) {
      // Don't throw error, just log it
      this.logger.error(`Failed to increment use count for template ${templateId}:`, error);
    }
  }

  /**
   * Format template response
   */
  private formatTemplateResponse(row: any): TemplateResponseDto {
    return {
      id: row.id,
      name: row.name,
      description: row.description,
      category: row.category,
      canvas: row.canvas,
      steps: row.steps || [],
      triggers: row.triggers || [],
      conditions: row.conditions || [],
      variables: row.variables || [],
      outputs: row.outputs || [],
      required_connectors: row.required_connectors || [],
      tags: row.tags || [],
      is_public: row.is_public,
      verified: row.verified || false,
      use_count: row.use_count || 0,
      created_by: row.created_by,
      created_at: row.created_at,
      updated_at: row.updated_at,
      metadata: row.metadata || {},
      ai_prompt: row.ai_prompt || null
    };
  }
}