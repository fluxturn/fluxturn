import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsUUID,
  IsNumber,
  Min,
  Max,
  MinLength,
  MaxLength,
  IsEnum,
  IsArray,
  ValidateNested,
  IsObject,
} from 'class-validator';
import { Type } from 'class-transformer';

// ============= MESSAGE DTOs =============

export class MessageMetadataDto {
  @ApiPropertyOptional({ description: 'Workflow preview data' })
  @IsOptional()
  @IsObject()
  workflowPreview?: any;

  @ApiPropertyOptional({ description: 'Progress steps during generation', type: [Object] })
  @IsOptional()
  @IsArray()
  progressSteps?: any[];

  @ApiPropertyOptional({ description: 'Detected credentials from message', type: [Object] })
  @IsOptional()
  @IsArray()
  credentialsDetected?: any[];

  @ApiPropertyOptional({ description: 'Whether message requires user choice' })
  @IsOptional()
  requiresUserChoice?: boolean;

  @ApiPropertyOptional({ description: 'Quick reply options', type: [String] })
  @IsOptional()
  @IsArray()
  quickReplies?: string[];

  @ApiPropertyOptional({
    description: 'Message type: analysis, execution, or general',
    enum: ['analysis', 'execution', 'general']
  })
  @IsOptional()
  @IsString()
  messageType?: string;

  @ApiPropertyOptional({ description: 'Analysis data with understanding, plan, and estimated nodes' })
  @IsOptional()
  @IsObject()
  analysisData?: any;

  @ApiPropertyOptional({ description: 'Pending prompt for execution' })
  @IsOptional()
  @IsString()
  pendingPrompt?: string;

  @ApiPropertyOptional({ description: 'Workflow result data' })
  @IsOptional()
  @IsObject()
  workflowResult?: any;

  @ApiPropertyOptional({
    description: 'Nodes that need configuration',
    type: [Object]
  })
  @IsOptional()
  @IsArray()
  nodesToConfigure?: any[];
}

export class ChatMessageDto {
  @ApiProperty({
    example: '550e8400-e29b-41d4-a716-446655440000',
    description: 'Message ID',
  })
  @IsUUID()
  id: string;

  @ApiProperty({
    example: 'user',
    enum: ['user', 'assistant', 'system'],
    description: 'Message role',
  })
  @IsEnum(['user', 'assistant', 'system'])
  role: 'user' | 'assistant' | 'system';

  @ApiProperty({
    example: 'Create a workflow to send Slack notifications',
    description: 'Message content',
  })
  @IsString()
  @IsNotEmpty()
  content: string;

  @ApiProperty({
    example: '2024-01-01T12:00:00Z',
    description: 'Message timestamp',
  })
  @IsString()
  timestamp: string;

  @ApiPropertyOptional({ description: 'Additional message metadata' })
  @IsOptional()
  @ValidateNested()
  @Type(() => MessageMetadataDto)
  metadata?: MessageMetadataDto;
}

// ============= CREATE CONVERSATION DTOs =============

export class CreateConversationDto {
  @ApiPropertyOptional({
    example: 'Workflow Builder Chat - Jan 15',
    description: 'Conversation title',
  })
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(255)
  title?: string;

  @ApiPropertyOptional({
    example: '550e8400-e29b-41d4-a716-446655440000',
    description: 'Associated workflow ID',
  })
  @IsOptional()
  @IsUUID()
  workflow_id?: string;

  @ApiPropertyOptional({
    example: '550e8400-e29b-41d4-a716-446655440000',
    description: 'Organization ID',
  })
  @IsOptional()
  @IsUUID()
  organization_id?: string;

  @ApiPropertyOptional({
    example: '550e8400-e29b-41d4-a716-446655440000',
    description: 'Project ID',
  })
  @IsOptional()
  @IsUUID()
  project_id?: string;

  @ApiPropertyOptional({
    type: [ChatMessageDto],
    description: 'Initial messages (optional)',
  })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ChatMessageDto)
  initial_messages?: ChatMessageDto[];
}

// ============= UPDATE CONVERSATION DTOs =============

export class UpdateConversationDto {
  @ApiPropertyOptional({
    example: 'Updated Conversation Title',
    description: 'New conversation title',
  })
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(255)
  title?: string;

  @ApiPropertyOptional({
    example: 'active',
    enum: ['active', 'archived', 'completed', 'deleted'],
    description: 'Conversation status',
  })
  @IsOptional()
  @IsEnum(['active', 'archived', 'completed', 'deleted'])
  status?: string;

  @ApiPropertyOptional({
    description: 'Conversation context metadata',
  })
  @IsOptional()
  @IsObject()
  context?: any;
}

// ============= ADD MESSAGE DTO =============

export class AddMessageDto {
  @ApiProperty({
    example: 'user',
    enum: ['user', 'assistant', 'system'],
    description: 'Message role',
  })
  @IsEnum(['user', 'assistant', 'system'])
  role: 'user' | 'assistant' | 'system';

  @ApiProperty({
    example: 'Can you add error handling to this workflow?',
    description: 'Message content',
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(10000)
  content: string;

  @ApiPropertyOptional({
    description: 'Message metadata (workflow preview, progress, etc.)',
  })
  @IsOptional()
  @ValidateNested()
  @Type(() => MessageMetadataDto)
  metadata?: MessageMetadataDto;
}

// ============= LIST CONVERSATIONS QUERY DTO =============

export class ListConversationsQueryDto {
  @ApiPropertyOptional({
    description: 'Page number',
    minimum: 1,
    default: 1,
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  page?: number;

  @ApiPropertyOptional({
    description: 'Items per page',
    minimum: 1,
    maximum: 100,
    default: 20,
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  @Max(100)
  limit?: number;

  @ApiPropertyOptional({
    enum: ['created_at', 'updated_at', 'last_message_at', 'title'],
    default: 'last_message_at',
  })
  @IsOptional()
  @IsEnum(['created_at', 'updated_at', 'last_message_at', 'title'])
  sort_by?: string;

  @ApiPropertyOptional({
    enum: ['asc', 'desc'],
    default: 'desc',
  })
  @IsOptional()
  @IsEnum(['asc', 'desc'])
  sort_order?: string;

  @ApiPropertyOptional({
    enum: ['active', 'archived', 'completed', 'deleted'],
    description: 'Filter by status',
  })
  @IsOptional()
  @IsEnum(['active', 'archived', 'completed', 'deleted'])
  status?: string;

  @ApiPropertyOptional({
    description: 'Filter by workflow ID',
  })
  @IsOptional()
  @IsUUID()
  workflow_id?: string;

  @ApiPropertyOptional({
    description: 'Filter by project ID',
  })
  @IsOptional()
  @IsUUID()
  project_id?: string;
}

// ============= RESPONSE DTOs =============

export class ConversationResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  user_id: string;

  @ApiPropertyOptional()
  workflow_id?: string;

  @ApiProperty()
  title: string;

  @ApiProperty({ type: [ChatMessageDto] })
  messages: ChatMessageDto[];

  @ApiProperty()
  status: string;

  @ApiProperty()
  context: any;

  @ApiPropertyOptional()
  current_workflow?: any;

  @ApiPropertyOptional({ type: [Object] })
  workflow_versions?: any[];

  @ApiProperty()
  message_count: number;

  @ApiPropertyOptional()
  last_message_at?: string;

  @ApiPropertyOptional()
  project_id?: string;

  @ApiProperty()
  created_at: string;

  @ApiProperty()
  updated_at: string;
}

export class PaginatedConversationsDto {
  @ApiProperty({ type: [ConversationResponseDto] })
  conversations: ConversationResponseDto[];

  @ApiProperty()
  total: number;

  @ApiProperty()
  limit: number;

  @ApiProperty()
  offset: number;

  @ApiProperty()
  page: number;
}
