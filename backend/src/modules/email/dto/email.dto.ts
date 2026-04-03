import { IsString, IsEmail, IsOptional, IsArray, IsObject, ValidateIf, IsNotEmpty, IsUUID, IsEnum, IsInt, Min, Max } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';

export class SendEmailDto {
  @ApiProperty({ description: 'Recipient email address(es)', oneOf: [{ type: 'string' }, { type: 'array', items: { type: 'string' } }] })
  @ValidateIf((o) => !Array.isArray(o.to))
  @IsEmail()
  @ValidateIf((o) => Array.isArray(o.to))
  @IsArray()
  @IsEmail({}, { each: true })
  to: string | string[];

  @ApiProperty({ description: 'Email subject' })
  @IsString()
  @IsNotEmpty()
  subject: string;

  @ApiPropertyOptional({ description: 'Plain text content' })
  @IsOptional()
  @IsString()
  text?: string;

  @ApiPropertyOptional({ description: 'HTML content' })
  @IsOptional()
  @IsString()
  html?: string;

  @ApiPropertyOptional({ description: 'Template ID' })
  @IsOptional()
  @IsString()
  templateId?: string;

  @ApiPropertyOptional({ description: 'Template data for variables' })
  @IsOptional()
  @IsObject()
  templateData?: Record<string, any>;

  @ApiPropertyOptional({ description: 'Sender email address' })
  @IsOptional()
  @IsEmail()
  from?: string;

  @ApiPropertyOptional({ description: 'CC recipients', oneOf: [{ type: 'string' }, { type: 'array', items: { type: 'string' } }] })
  @IsOptional()
  @ValidateIf((o) => o.cc && !Array.isArray(o.cc))
  @IsEmail()
  @ValidateIf((o) => o.cc && Array.isArray(o.cc))
  @IsArray()
  @IsEmail({}, { each: true })
  cc?: string | string[];

  @ApiPropertyOptional({ description: 'BCC recipients', oneOf: [{ type: 'string' }, { type: 'array', items: { type: 'string' } }] })
  @IsOptional()
  @ValidateIf((o) => o.bcc && !Array.isArray(o.bcc))
  @IsEmail()
  @ValidateIf((o) => o.bcc && Array.isArray(o.bcc))
  @IsArray()
  @IsEmail({}, { each: true })
  bcc?: string | string[];

  @ApiPropertyOptional({ description: 'Reply-to email address' })
  @IsOptional()
  @IsEmail()
  replyTo?: string;

  @ApiPropertyOptional({ description: 'Email attachments' })
  @IsOptional()
  @IsArray()
  attachments?: any[];

  @ApiPropertyOptional({ description: 'Tags for categorization' })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tags?: string[];

  @ApiPropertyOptional({ description: 'Additional metadata' })
  @IsOptional()
  @IsObject()
  metadata?: Record<string, any>;
}

export class SendTemplateEmailDto {
  @ApiProperty({ description: 'Recipient email address(es)', oneOf: [{ type: 'string' }, { type: 'array', items: { type: 'string' } }] })
  @ValidateIf((o) => !Array.isArray(o.to))
  @IsEmail()
  @ValidateIf((o) => Array.isArray(o.to))
  @IsArray()
  @IsEmail({}, { each: true })
  to: string | string[];

  @ApiProperty({ description: 'Email template ID' })
  @IsString()
  @IsNotEmpty()
  templateId: string;

  @ApiProperty({ description: 'Template data for variables' })
  @IsObject()
  @IsNotEmpty()
  templateData: Record<string, any>;

  @ApiPropertyOptional({ description: 'Email subject (overrides template)' })
  @IsOptional()
  @IsString()
  subject?: string;

  @ApiPropertyOptional({ description: 'Sender email address' })
  @IsOptional()
  @IsEmail()
  from?: string;

  @ApiPropertyOptional({ description: 'CC recipients', oneOf: [{ type: 'string' }, { type: 'array', items: { type: 'string' } }] })
  @IsOptional()
  @ValidateIf((o) => o.cc && !Array.isArray(o.cc))
  @IsEmail()
  @ValidateIf((o) => o.cc && Array.isArray(o.cc))
  @IsArray()
  @IsEmail({}, { each: true })
  cc?: string | string[];

  @ApiPropertyOptional({ description: 'BCC recipients', oneOf: [{ type: 'string' }, { type: 'array', items: { type: 'string' } }] })
  @IsOptional()
  @ValidateIf((o) => o.bcc && !Array.isArray(o.bcc))
  @IsEmail()
  @ValidateIf((o) => o.bcc && Array.isArray(o.bcc))
  @IsArray()
  @IsEmail({}, { each: true })
  bcc?: string | string[];
}

export class GetEmailLogsDto {
  @ApiPropertyOptional({ description: 'Project ID' })
  @IsOptional()
  @IsUUID()
  projectId?: string;

  @ApiPropertyOptional({ description: 'App ID' })
  @IsOptional()
  @IsUUID()
  appId?: string;

  @ApiPropertyOptional({ description: 'Email status filter', enum: ['sent', 'failed', 'pending'] })
  @IsOptional()
  @IsEnum(['sent', 'failed', 'pending'])
  status?: 'sent' | 'failed' | 'pending';

  @ApiPropertyOptional({ description: 'Filter by sender email' })
  @IsOptional()
  @IsEmail()
  from?: string;

  @ApiPropertyOptional({ description: 'Filter by recipient email' })
  @IsOptional()
  @IsEmail()
  to?: string;

  @ApiPropertyOptional({ description: 'Page number', minimum: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number;

  @ApiPropertyOptional({ description: 'Items per page', minimum: 1, maximum: 100 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number;

  @ApiPropertyOptional({ description: 'Field to sort by' })
  @IsOptional()
  @IsString()
  sortBy?: string;

  @ApiPropertyOptional({ description: 'Sort order', enum: ['asc', 'desc'] })
  @IsOptional()
  @IsEnum(['asc', 'desc'])
  sortOrder?: 'asc' | 'desc';
}

export class CreateTemplateDto {
  @ApiProperty({ description: 'Template name' })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({ description: 'Email subject line' })
  @IsString()
  @IsNotEmpty()
  subject: string;

  @ApiProperty({ description: 'Template content (HTML or text)' })
  @IsString()
  @IsNotEmpty()
  content: string;

  @ApiPropertyOptional({ description: 'Template type', enum: ['html', 'text', 'mjml'] })
  @IsOptional()
  @IsEnum(['html', 'text', 'mjml'])
  type?: 'html' | 'text' | 'mjml';

  @ApiPropertyOptional({ description: 'Template category', enum: ['welcome-onboarding', 'transactional', 'marketing', 'notifications', 'newsletters', 'abandoned-cart', 'support', 'general'] })
  @IsOptional()
  @IsEnum(['welcome-onboarding', 'transactional', 'marketing', 'notifications', 'newsletters', 'abandoned-cart', 'support', 'general'])
  category?: string;

  @ApiPropertyOptional({ description: 'Additional metadata' })
  @IsOptional()
  @IsObject()
  metadata?: Record<string, any>;
}

export class UpdateTemplateDto {
  @ApiPropertyOptional({ description: 'Template name' })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiPropertyOptional({ description: 'Email subject line' })
  @IsOptional()
  @IsString()
  subject?: string;

  @ApiPropertyOptional({ description: 'Template content (HTML or text)' })
  @IsOptional()
  @IsString()
  content?: string;

  @ApiPropertyOptional({ description: 'Template type', enum: ['html', 'text', 'mjml'] })
  @IsOptional()
  @IsEnum(['html', 'text', 'mjml'])
  type?: 'html' | 'text' | 'mjml';

  @ApiPropertyOptional({ description: 'Template category', enum: ['welcome-onboarding', 'transactional', 'marketing', 'notifications', 'newsletters', 'abandoned-cart', 'support', 'general'] })
  @IsOptional()
  @IsEnum(['welcome-onboarding', 'transactional', 'marketing', 'notifications', 'newsletters', 'abandoned-cart', 'support', 'general'])
  category?: string;

  @ApiPropertyOptional({ description: 'Additional metadata' })
  @IsOptional()
  @IsObject()
  metadata?: Record<string, any>;
}

export class GetTemplatesDto {
  @ApiPropertyOptional({ description: 'Filter by category', enum: ['welcome-onboarding', 'transactional', 'marketing', 'notifications', 'newsletters', 'abandoned-cart', 'support'] })
  @IsOptional()
  @IsEnum(['welcome-onboarding', 'transactional', 'marketing', 'notifications', 'newsletters', 'abandoned-cart', 'support'])
  category?: string;

  @ApiPropertyOptional({ description: 'Search by name' })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({ description: 'Page number', minimum: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number;

  @ApiPropertyOptional({ description: 'Items per page', minimum: 1, maximum: 100 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number;
}

export class CreateCampaignDto {
  @ApiProperty({ description: 'Campaign name' })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiPropertyOptional({ description: 'Campaign description' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({ description: 'Template ID to use' })
  @IsString()
  @IsNotEmpty()
  templateId: string;

  @ApiPropertyOptional({ description: 'Email subject (overrides template)' })
  @IsOptional()
  @IsString()
  subject?: string;

  @ApiPropertyOptional({ description: 'From email address' })
  @IsOptional()
  @IsEmail()
  fromEmail?: string;

  @ApiPropertyOptional({ description: 'From name' })
  @IsOptional()
  @IsString()
  fromName?: string;

  @ApiPropertyOptional({ description: 'Reply-to email address' })
  @IsOptional()
  @IsEmail()
  replyTo?: string;

  @ApiPropertyOptional({ description: 'Schedule campaign for later' })
  @IsOptional()
  @IsString()
  scheduledAt?: string;

  @ApiPropertyOptional({ description: 'Additional metadata' })
  @IsOptional()
  @IsObject()
  metadata?: Record<string, any>;
}

export class UpdateCampaignDto {
  @ApiPropertyOptional({ description: 'Campaign name' })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiPropertyOptional({ description: 'Campaign description' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ description: 'Template ID to use' })
  @IsOptional()
  @IsString()
  templateId?: string;

  @ApiPropertyOptional({ description: 'Email subject (overrides template)' })
  @IsOptional()
  @IsString()
  subject?: string;

  @ApiPropertyOptional({ description: 'From email address' })
  @IsOptional()
  @IsEmail()
  fromEmail?: string;

  @ApiPropertyOptional({ description: 'From name' })
  @IsOptional()
  @IsString()
  fromName?: string;

  @ApiPropertyOptional({ description: 'Reply-to email address' })
  @IsOptional()
  @IsEmail()
  replyTo?: string;

  @ApiPropertyOptional({ description: 'Campaign status', enum: ['draft', 'scheduled', 'sending', 'sent', 'paused', 'cancelled'] })
  @IsOptional()
  @IsEnum(['draft', 'scheduled', 'sending', 'sent', 'paused', 'cancelled'])
  status?: 'draft' | 'scheduled' | 'sending' | 'sent' | 'paused' | 'cancelled';

  @ApiPropertyOptional({ description: 'Schedule campaign for later' })
  @IsOptional()
  @IsString()
  scheduledAt?: string;

  @ApiPropertyOptional({ description: 'Additional metadata' })
  @IsOptional()
  @IsObject()
  metadata?: Record<string, any>;
}

export class GetCampaignsDto {
  @ApiPropertyOptional({ description: 'Filter by status', enum: ['draft', 'scheduled', 'sending', 'sent', 'paused', 'cancelled'] })
  @IsOptional()
  @IsEnum(['draft', 'scheduled', 'sending', 'sent', 'paused', 'cancelled'])
  status?: 'draft' | 'scheduled' | 'sending' | 'sent' | 'paused' | 'cancelled';

  @ApiPropertyOptional({ description: 'Search by name' })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({ description: 'Page number', minimum: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number;

  @ApiPropertyOptional({ description: 'Items per page', minimum: 1, maximum: 100 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number;
}
