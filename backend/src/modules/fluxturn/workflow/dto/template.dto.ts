import { 
  IsString, 
  IsOptional, 
  IsBoolean, 
  IsArray, 
  IsObject,
  IsEnum,
  ValidateNested,
  IsUUID,
  MaxLength
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

// ============================================
// TEMPLATE CATEGORIES
// ============================================

export enum TemplateCategory {
  SOCIAL_MEDIA = 'social_media',
  PRODUCTIVITY = 'productivity',
  BUSINESS = 'business',
  ANALYTICS = 'analytics',
  CONTENT = 'content',
  EDUCATION = 'education',
  HEALTH = 'health',
  CUSTOMER_SUPPORT = 'customer_support',
  LEAD_GENERATION = 'lead_generation',
  MONITORING = 'monitoring',
  PERSONAL = 'personal',
  OTHER = 'other'
}

// ============================================
// CREATE TEMPLATE DTO
// ============================================

export class CreateTemplateDto {
  @ApiProperty({
    description: 'Template name',
    example: 'Smart Social Media Cross-Poster'
  })
  @IsString()
  @MaxLength(255)
  name: string;

  @ApiProperty({
    description: 'Template description',
    example: 'Automatically rewrite and optimize your content for different platforms using AI'
  })
  @IsString()
  description: string;

  @ApiProperty({
    description: 'Template category',
    enum: TemplateCategory,
    example: TemplateCategory.SOCIAL_MEDIA
  })
  @IsEnum(TemplateCategory)
  category: TemplateCategory;


  @ApiProperty({
    description: 'Workflow canvas configuration (same structure as workflow canvas)',
    type: 'object',
    example: {
      nodes: [
        {
          id: 'trigger-node-1',
          type: 'schedule',
          position: { x: 100, y: 150 },
          data: {
            label: 'Daily Schedule',
            trigger: 'schedule',
            schedule: '0 9 * * *',
            timezone: 'UTC',
            description: 'Runs every day at 9 AM UTC'
          }
        },
        {
          id: 'action-node-1',
          type: 'gmail',
          position: { x: 400, y: 150 },
          data: {
            label: 'Send Email',
            connector: 'gmail',
            action: 'send_email',
            config: {
              to: '{{recipient_email}}',
              subject: 'Daily Report',
              body: 'Here is your daily report...',
              attachments: []
            }
          }
        }
      ],
      edges: [
        {
          id: 'edge-1',
          source: 'trigger-node-1',
          target: 'action-node-1',
          sourceHandle: 'source',
          targetHandle: 'target'
        }
      ]
    }
  })
  @IsObject()
  canvas: any;

  @ApiProperty({
    description: 'Workflow steps array (same structure as workflow steps)',
    type: 'array',
    example: [
      {
        id: 'step-1',
        name: 'Send Daily Email',
        type: 'action',
        connector: 'gmail',
        action: 'send_email',
        config: {
          to: '{{recipient_email}}',
          subject: 'Daily Report - {{date}}',
          body: '<h1>Daily Report</h1><p>Your automated report for {{date}}</p>',
          html: true
        },
        order: 1,
        status: 'active'
      },
      {
        id: 'step-2',
        name: 'Log Activity',
        type: 'action',
        connector: 'google_sheets',
        action: 'append_row',
        config: {
          spreadsheetId: '{{sheet_id}}',
          range: 'Sheet1',
          values: [['{{date}}', 'Email sent', '{{recipient_email}}']]
        },
        order: 2,
        status: 'active'
      }
    ],
    default: []
  })
  @IsArray()
  steps: any[];

  @ApiPropertyOptional({
    description: 'Workflow triggers configuration',
    type: 'array',
    example: [
      {
        id: 'trigger-1',
        type: 'schedule',
        name: 'Daily at 9 AM',
        config: {
          schedule: '0 9 * * *',
          timezone: 'UTC'
        },
        enabled: true
      },
      {
        id: 'trigger-2',
        type: 'webhook',
        name: 'On Form Submit',
        config: {
          path: '/form-submit',
          method: 'POST'
        },
        enabled: false
      }
    ],
    default: []
  })
  @IsOptional()
  @IsArray()
  triggers?: any[];

  @ApiPropertyOptional({
    description: 'Workflow conditions',
    type: 'array',
    default: []
  })
  @IsOptional()
  @IsArray()
  conditions?: any[];

  @ApiPropertyOptional({
    description: 'Workflow variables',
    type: 'array',
    default: []
  })
  @IsOptional()
  @IsArray()
  variables?: any[];

  @ApiPropertyOptional({
    description: 'Workflow outputs',
    type: 'array',
    default: []
  })
  @IsOptional()
  @IsArray()
  outputs?: any[];

  @ApiProperty({
    description: 'Required connector types for this template',
    type: [String],
    example: ['telegram', 'openai', 'google_docs']
  })
  @IsArray()
  @IsString({ each: true })
  required_connectors: string[];

  @ApiPropertyOptional({
    description: 'Template tags for search and filtering',
    type: [String],
    example: ['social-media', 'content-distribution', 'ai-writing']
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tags?: string[];

  @ApiPropertyOptional({
    description: 'Whether this template should be publicly available',
    default: false
  })
  @IsOptional()
  @IsBoolean()
  is_public?: boolean;

  @ApiPropertyOptional({
    description: 'Template metadata (additional configuration)',
    type: 'object'
  })
  @IsOptional()
  @IsObject()
  metadata?: Record<string, any>;

  @ApiPropertyOptional({
    description: 'AI prompt used to generate this workflow (if created via AI)',
    example: 'Create a workflow that sends daily email reports from Google Sheets'
  })
  @IsOptional()
  @IsString()
  ai_prompt?: string;
}

// ============================================
// UPDATE TEMPLATE DTO
// ============================================

export class UpdateTemplateDto {
  @ApiPropertyOptional({
    description: 'Updated template name'
  })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  name?: string;

  @ApiPropertyOptional({
    description: 'Updated template description'
  })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({
    description: 'Updated template category',
    enum: TemplateCategory
  })
  @IsOptional()
  @IsEnum(TemplateCategory)
  category?: TemplateCategory;


  @ApiPropertyOptional({
    description: 'Updated workflow canvas'
  })
  @IsOptional()
  @IsObject()
  canvas?: any;

  @ApiPropertyOptional({
    description: 'Updated workflow steps'
  })
  @IsOptional()
  @IsArray()
  steps?: any[];

  @ApiPropertyOptional({
    description: 'Updated triggers'
  })
  @IsOptional()
  @IsArray()
  triggers?: any[];

  @ApiPropertyOptional({
    description: 'Updated conditions'
  })
  @IsOptional()
  @IsArray()
  conditions?: any[];

  @ApiPropertyOptional({
    description: 'Updated variables'
  })
  @IsOptional()
  @IsArray()
  variables?: any[];

  @ApiPropertyOptional({
    description: 'Updated outputs'
  })
  @IsOptional()
  @IsArray()
  outputs?: any[];

  @ApiPropertyOptional({
    description: 'Updated required connectors'
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  required_connectors?: string[];

  @ApiPropertyOptional({
    description: 'Updated tags'
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tags?: string[];

  @ApiPropertyOptional({
    description: 'Updated public status'
  })
  @IsOptional()
  @IsBoolean()
  is_public?: boolean;

  @ApiPropertyOptional({
    description: 'Updated metadata'
  })
  @IsOptional()
  @IsObject()
  metadata?: Record<string, any>;

  @ApiPropertyOptional({
    description: 'Updated AI prompt'
  })
  @IsOptional()
  @IsString()
  ai_prompt?: string;
}

// ============================================
// LIST TEMPLATES DTO
// ============================================

export class ListTemplatesDto {
  @ApiPropertyOptional({
    description: 'Filter by category',
    enum: TemplateCategory
  })
  @IsOptional()
  @IsEnum(TemplateCategory)
  category?: TemplateCategory;

  @ApiPropertyOptional({
    description: 'Search term for name or description',
    example: 'social media'
  })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({
    description: 'Filter by public/private templates',
    default: true
  })
  @IsOptional()
  @IsBoolean()
  is_public?: boolean;

  @ApiPropertyOptional({
    description: 'Filter by required connectors',
    type: [String],
    example: ['telegram', 'openai']
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  connectors?: string[];

  @ApiPropertyOptional({
    description: 'Filter by tags',
    type: [String],
    example: ['social-media', 'automation']
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tags?: string[];

  @ApiPropertyOptional({
    description: 'Filter templates by type',
    enum: ['all', 'popular', 'verified', 'new'],
    default: 'all',
    example: 'popular'
  })
  @IsOptional()
  @IsEnum(['all', 'popular', 'verified', 'new'])
  filter?: 'all' | 'popular' | 'verified' | 'new' = 'all';

  @ApiPropertyOptional({
    description: 'Page number for pagination',
    minimum: 1,
    default: 1
  })
  @IsOptional()
  @Type(() => Number)
  page?: number = 1;

  @ApiPropertyOptional({
    description: 'Number of items per page',
    minimum: 1,
    maximum: 100,
    default: 20
  })
  @IsOptional()
  @Type(() => Number)
  limit?: number = 20;

  @ApiPropertyOptional({
    description: 'Sort field',
    enum: ['name', 'created_at', 'updated_at', 'use_count'],
    default: 'created_at'
  })
  @IsOptional()
  @IsEnum(['name', 'created_at', 'updated_at', 'use_count'])
  sortBy?: string = 'created_at';

  @ApiPropertyOptional({
    description: 'Sort order',
    enum: ['asc', 'desc'],
    default: 'desc'
  })
  @IsOptional()
  @IsEnum(['asc', 'desc'])
  sortOrder?: 'asc' | 'desc' = 'desc';
}

// ============================================
// CREATE WORKFLOW FROM TEMPLATE DTO
// ============================================

export class CreateWorkflowFromTemplateDto {
  @ApiProperty({
    description: 'Template ID to create workflow from',
    example: '123e4567-e89b-12d3-a456-426614174000'
  })
  @IsUUID()
  templateId: string;

  @ApiProperty({
    description: 'Name for the new workflow',
    example: 'My Social Media Automation'
  })
  @IsString()
  @MaxLength(255)
  workflowName: string;

  @ApiPropertyOptional({
    description: 'Description for the new workflow'
  })
  @IsOptional()
  @IsString()
  workflowDescription?: string;

  @ApiPropertyOptional({
    description: 'Custom configuration overrides',
    type: 'object'
  })
  @IsOptional()
  @IsObject()
  customConfig?: Record<string, any>;
}

// ============================================
// TEMPLATE RESPONSE DTOs
// ============================================

export class TemplateResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  name: string;

  @ApiProperty()
  description: string;

  @ApiProperty()
  category: string;


  @ApiProperty()
  canvas: any;

  @ApiProperty()
  steps: any[];

  @ApiPropertyOptional()
  triggers?: any[];

  @ApiPropertyOptional()
  conditions?: any[];

  @ApiPropertyOptional()
  variables?: any[];

  @ApiPropertyOptional()
  outputs?: any[];

  @ApiProperty()
  required_connectors: string[];

  @ApiProperty()
  tags: string[];

  @ApiProperty()
  is_public: boolean;

  @ApiProperty({
    description: 'Whether this template has been verified/tested',
    default: false
  })
  verified: boolean;

  @ApiProperty()
  use_count: number;

  @ApiPropertyOptional()
  created_by?: string;

  @ApiProperty()
  created_at: Date;

  @ApiProperty()
  updated_at: Date;

  @ApiPropertyOptional()
  metadata?: Record<string, any>;

  @ApiPropertyOptional({
    description: 'AI prompt used to generate this workflow'
  })
  ai_prompt?: string;
}

export class TemplateListResponseDto {
  @ApiProperty({ type: [TemplateResponseDto] })
  templates: TemplateResponseDto[];

  @ApiProperty()
  total: number;

  @ApiProperty()
  page: number;

  @ApiProperty()
  limit: number;

  @ApiProperty()
  totalPages: number;
}