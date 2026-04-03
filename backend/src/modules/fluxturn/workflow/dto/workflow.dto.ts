import { 
  IsString, 
  IsOptional, 
  IsNumber, 
  Min, 
  Max, 
  IsObject,
  IsArray,
  ValidateNested,
  IsEnum,
  IsBoolean,
  IsUUID
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

// ============================================
// CREATE WORKFLOW DTOs
// ============================================

export class CreateWorkflowDto {
  @ApiPropertyOptional({
    description: 'Natural language prompt describing the workflow',
    example: 'When a new order comes in, send notification and create invoice'
  })
  @IsOptional()
  @IsString()
  prompt?: string;

  @ApiPropertyOptional({
    description: 'Workflow definition object',
    type: 'object'
  })
  @IsOptional()
  @IsObject()
  workflow?: any;

  @ApiPropertyOptional({
    description: 'Workflow name',
    example: 'Order Processing Workflow'
  })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiPropertyOptional({
    description: 'Workflow description',
    example: 'Handles new order processing and notifications'
  })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({
    description: 'Template ID if creating from a template',
    example: '98bd9772-68d1-4913-8f88-1df077669d12'
  })
  @IsOptional()
  @IsString()
  template_id?: string;

  @ApiPropertyOptional({
    description: 'Whether this workflow was AI-generated (for billing limits)',
    example: true
  })
  @IsOptional()
  @IsBoolean()
  is_ai_generated?: boolean;
}

// ============================================
// EXECUTE WORKFLOW DTOs
// ============================================

export class ExecuteWorkflowDto {
  @ApiPropertyOptional({
    description: 'Input data for workflow execution',
    type: 'object',
    example: { orderId: '12345', customerEmail: 'customer@example.com' }
  })
  @IsOptional()
  @IsObject()
  input_data?: Record<string, any>;
}

// ============================================
// WORKFLOW PROCESSING DTOs
// ============================================

export class ProcessPromptDto {
  @ApiProperty({
    description: 'Natural language prompt to process',
    example: 'Check my emails daily and prioritize urgent ones'
  })
  @IsString()
  prompt: string;

  @ApiPropertyOptional({
    description: 'Industry context for better understanding',
    example: 'communication'
  })
  @IsOptional()
  @IsString()
  industry?: string;

  @ApiPropertyOptional({
    description: 'Specific use case',
    example: 'email_management'
  })
  @IsOptional()
  @IsString()
  useCase?: string;

  @ApiPropertyOptional({
    description: 'Maximum number of suggestions to return',
    minimum: 1,
    maximum: 10,
    default: 3
  })
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(10)
  maxSuggestions?: number;

  @ApiPropertyOptional({
    description: 'Workflow generation strategy',
    enum: ['AI_ONLY', 'TEMPLATE_ONLY', 'HYBRID'],
    example: 'AI_ONLY'
  })
  @IsOptional()
  @IsEnum(['AI_ONLY', 'TEMPLATE_ONLY', 'HYBRID'])
  strategy?: string;

  @ApiPropertyOptional({
    description: 'Maximum retries for workflow generation',
    minimum: 1,
    maximum: 5,
    default: 2
  })
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(5)
  maxRetries?: number;

  @ApiPropertyOptional({
    description: 'Session ID for conversation memory (allows refining workflows across multiple prompts)',
    example: 'user_123_1734567890'
  })
  @IsOptional()
  @IsString()
  sessionId?: string;
}

// ============================================
// CONNECTOR DTOs
// ============================================

export class GenerateConnectorDto {
  @ApiProperty({
    description: 'Name of the service to create connector for',
    example: 'CustomCRM'
  })
  @IsString()
  service_name: string;

  @ApiProperty({
    description: 'Description of the connector functionality',
    example: 'Connector for our internal CRM system'
  })
  @IsString()
  description: string;

  @ApiPropertyOptional({
    description: 'Example actions the connector should support',
    type: [String],
    example: ['create_contact', 'update_deal', 'get_tasks']
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  example_actions?: string[];
}

// ============================================
// SEARCH DTOs
// ============================================

export class FindSimilarWorkflowsDto {
  @ApiProperty({
    description: 'Prompt to find similar workflows for',
    example: 'Send daily reports'
  })
  @IsString()
  prompt: string;

  @ApiPropertyOptional({
    description: 'Maximum number of similar workflows to return',
    minimum: 1,
    maximum: 20,
    default: 5
  })
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(20)
  limit?: number;
}

// ============================================
// LIST/FILTER DTOs
// ============================================

export enum WorkflowStatus {
  DRAFT = 'draft',
  ACTIVE = 'active',
  PAUSED = 'paused',
  COMPLETED = 'completed',
  FAILED = 'failed',
  SCHEDULED = 'scheduled'
}

export class ListWorkflowsDto {
  @ApiPropertyOptional({
    description: 'Filter by workflow status',
    enum: WorkflowStatus
  })
  @IsOptional()
  @IsEnum(WorkflowStatus)
  status?: WorkflowStatus;

  @ApiPropertyOptional({
    description: 'Search term for workflow name or description',
    example: 'blog'
  })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({
    description: 'Page number for pagination',
    minimum: 1,
    default: 1
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  page?: number;

  @ApiPropertyOptional({
    description: 'Number of items per page',
    minimum: 1,
    maximum: 100,
    default: 20
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  @Max(100)
  limit?: number;
}

// ============================================
// CONNECTOR LIST DTOs
// ============================================

export class ListConnectorsDto {
  @ApiPropertyOptional({
    description: 'Filter by connector type',
    example: 'communication'
  })
  @IsOptional()
  @IsString()
  type?: string;

  @ApiPropertyOptional({
    description: 'Search term for connector name or description',
    example: 'email'
  })
  @IsOptional()
  @IsString()
  search?: string;
}

// ============================================
// ANALYZE DTOs
// ============================================

export class AnalyzePromptDto {
  @ApiProperty({
    description: 'Prompt to analyze for workflow requirements',
    example: 'Every morning at 9 AM, check for new leads and assign to sales team'
  })
  @IsString()
  prompt: string;

  @ApiProperty({
    description: 'Conversation ID for context',
    example: '03cf7605-efd8-4f0f-bbb3-8a2baae5b5d9'
  })
  @IsString()
  conversationId: string;
}

// ============================================
// UPDATE WORKFLOW DTOs
// ============================================

export class UpdateWorkflowDto {
  @ApiPropertyOptional({
    description: 'Updated workflow name'
  })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiPropertyOptional({
    description: 'Updated workflow description'
  })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({
    description: 'Updated workflow definition',
    type: 'object'
  })
  @IsOptional()
  @IsObject()
  workflow?: any;

  @ApiPropertyOptional({
    description: 'Updated workflow status',
    enum: WorkflowStatus
  })
  @IsOptional()
  @IsEnum(WorkflowStatus)
  status?: WorkflowStatus;

  @ApiPropertyOptional({
    description: 'Template ID if this workflow was created from a template',
    example: '98bd9772-68d1-4913-8f88-1df077669d12'
  })
  @IsOptional()
  @IsString()
  template_id?: string;

  @ApiPropertyOptional({
    description: 'Whether this workflow was AI-generated (for billing limits)',
    example: true
  })
  @IsOptional()
  @IsBoolean()
  is_ai_generated?: boolean;
}

// ============================================
// WORKFLOW STEP DTOs
// ============================================

export class WorkflowStepDto {
  @ApiProperty({
    description: 'Step ID',
    example: 'step_1'
  })
  @IsString()
  id: string;

  @ApiProperty({
    description: 'Connector to use',
    example: 'gmail'
  })
  @IsString()
  connector: string;

  @ApiProperty({
    description: 'Action to perform',
    example: 'send_email'
  })
  @IsString()
  action: string;

  @ApiPropertyOptional({
    description: 'Step parameters',
    type: 'object'
  })
  @IsOptional()
  @IsObject()
  params?: Record<string, any>;

  @ApiPropertyOptional({
    description: 'Condition for step execution'
  })
  @IsOptional()
  @IsString()
  condition?: string;

  @ApiPropertyOptional({
    description: 'Error handling strategy',
    enum: ['stop', 'continue', 'retry', 'fallback']
  })
  @IsOptional()
  @IsEnum(['stop', 'continue', 'retry', 'fallback'])
  onError?: string;

  @ApiPropertyOptional({
    description: 'Execute in parallel with other steps'
  })
  @IsOptional()
  @IsBoolean()
  parallel?: boolean;
}

// ============================================
// WORKFLOW TRIGGER DTOs
// ============================================

export class WorkflowTriggerDto {
  @ApiProperty({
    description: 'Trigger type',
    enum: ['webhook', 'schedule', 'email', 'form_submission', 'database', 'api', 'manual']
  })
  @IsEnum(['webhook', 'schedule', 'email', 'form_submission', 'database', 'api', 'manual'])
  type: string;

  @ApiPropertyOptional({
    description: 'Trigger source'
  })
  @IsOptional()
  @IsString()
  source?: string;

  @ApiPropertyOptional({
    description: 'Cron expression for scheduled triggers',
    example: '0 9 * * 1'
  })
  @IsOptional()
  @IsString()
  cron?: string;

  @ApiPropertyOptional({
    description: 'Webhook URL for webhook triggers'
  })
  @IsOptional()
  @IsString()
  webhook?: string;
}

// ============================================
// COMPLETE WORKFLOW DEFINITION DTO
// ============================================

export class WorkflowDefinitionDto {
  @ApiProperty({
    description: 'Workflow name'
  })
  @IsString()
  name: string;

  @ApiProperty({
    description: 'Workflow description'
  })
  @IsString()
  description: string;

  @ApiProperty({
    description: 'Workflow triggers',
    type: [WorkflowTriggerDto]
  })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => WorkflowTriggerDto)
  triggers: WorkflowTriggerDto[];

  @ApiProperty({
    description: 'Workflow steps',
    type: [WorkflowStepDto]
  })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => WorkflowStepDto)
  steps: WorkflowStepDto[];

  @ApiPropertyOptional({
    description: 'Workflow variables',
    type: 'array'
  })
  @IsOptional()
  @IsArray()
  variables?: any[];

  @ApiPropertyOptional({
    description: 'Workflow outputs',
    type: 'array'
  })
  @IsOptional()
  @IsArray()
  outputs?: any[];
}