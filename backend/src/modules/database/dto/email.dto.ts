import { ApiProperty } from '@nestjs/swagger';
import {
  IsString,
  IsEmail,
  IsOptional,
  IsArray,
  IsObject,
  IsNumber,
  IsBoolean,
  IsNotEmpty,
  ValidateNested,
  IsEnum,
  Min,
  Max,
} from 'class-validator';
import { Type } from 'class-transformer';

export class SendEmailDto {
  @ApiProperty({ 
    example: 'user@example.com',
    description: 'Email address of the recipient',
    oneOf: [
      { type: 'string' },
      { type: 'array', items: { type: 'string' } }
    ]
  })
  @IsNotEmpty()
  to: string | string[];

  @ApiProperty({ 
    example: 'Welcome to Fluxturn!',
    description: 'Email subject'
  })
  @IsNotEmpty()
  @IsString()
  subject: string;

  @ApiProperty({ 
    example: '<h1>Welcome!</h1><p>Thank you for joining Fluxturn.</p>',
    description: 'HTML content of the email'
  })
  @IsNotEmpty()
  @IsString()
  html: string;

  @ApiProperty({ 
    example: 'Welcome! Thank you for joining Fluxturn.',
    description: 'Plain text content of the email',
    required: false
  })
  @IsOptional()
  @IsString()
  text?: string;

  @ApiProperty({
    example: 'noreply@fluxturn.com',
    description: 'Sender email address',
    required: false
  })
  @IsOptional()
  @IsEmail()
  from?: string;

  @ApiProperty({
    example: ['admin@fluxturn.com'],
    description: 'CC recipients',
    required: false,
    type: [String]
  })
  @IsOptional()
  @IsArray()
  @IsEmail({}, { each: true })
  cc?: string[];

  @ApiProperty({ 
    example: ['manager@example.com'],
    description: 'BCC recipients',
    required: false,
    type: [String]
  })
  @IsOptional()
  @IsArray()
  @IsEmail({}, { each: true })
  bcc?: string[];

  @ApiProperty({ 
    example: 'reply@example.com',
    description: 'Reply-to email address',
    required: false
  })
  @IsOptional()
  @IsEmail()
  replyTo?: string;

  @ApiProperty({ 
    example: [{ filename: 'document.pdf', content: 'base64content' }],
    description: 'Email attachments',
    required: false
  })
  @IsOptional()
  @IsArray()
  attachments?: Array<{
    filename: string;
    content: string;
    contentType?: string;
  }>;
}

export class SendTemplatedEmailDto {
  @ApiProperty({ 
    example: 'welcome-email',
    description: 'Template name/ID'
  })
  @IsNotEmpty()
  @IsString()
  templateName: string;

  @ApiProperty({ 
    example: 'user@example.com',
    description: 'Email address of the recipient',
    oneOf: [
      { type: 'string' },
      { type: 'array', items: { type: 'string' } }
    ]
  })
  @IsNotEmpty()
  to: string | string[];

  @ApiProperty({ 
    example: { name: 'John Doe', verificationLink: 'https://fluxturn.com/verify/123' },
    description: 'Template data/variables'
  })
  @IsNotEmpty()
  @IsObject()
  templateData: Record<string, any>;

  @ApiProperty({
    example: 'noreply@fluxturn.com',
    description: 'Sender email address',
    required: false
  })
  @IsOptional()
  @IsEmail()
  from?: string;
}

export class QueueEmailDto extends SendEmailDto {
  @ApiProperty({ 
    example: 'https://sqs.us-east-1.amazonaws.com/123456789/email-queue',
    description: 'SQS queue URL',
    required: false
  })
  @IsOptional()
  @IsString()
  queueUrl?: string;

  @ApiProperty({ 
    example: 60,
    description: 'Delay in seconds before processing',
    required: false,
    minimum: 0,
    maximum: 900
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(900)
  delay?: number;
}

export class BulkEmailDto {
  @ApiProperty({ 
    example: [
      { email: 'user1@example.com', name: 'User 1' },
      { email: 'user2@example.com', name: 'User 2' }
    ],
    description: 'List of recipients with their data'
  })
  @IsNotEmpty()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => BulkEmailRecipient)
  recipients: BulkEmailRecipient[];

  @ApiProperty({ 
    example: 'monthly-newsletter',
    description: 'Template name for bulk email'
  })
  @IsNotEmpty()
  @IsString()
  templateName: string;

  @ApiProperty({ 
    example: { month: 'December', year: 2024 },
    description: 'Common template data for all recipients',
    required: false
  })
  @IsOptional()
  @IsObject()
  commonData?: Record<string, any>;

  @ApiProperty({ 
    example: 10,
    description: 'Number of emails to send per batch',
    required: false,
    minimum: 1,
    maximum: 50
  })
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(50)
  batchSize?: number;
}

class BulkEmailRecipient {
  @ApiProperty({ example: 'user@example.com' })
  @IsNotEmpty()
  @IsEmail()
  email: string;

  @ApiProperty({ 
    example: { name: 'John Doe', customField: 'value' },
    description: 'Recipient-specific template data',
    required: false
  })
  @IsOptional()
  @IsObject()
  data?: Record<string, any>;
}

export class VerifyEmailDto {
  @ApiProperty({ 
    example: 'admin@example.com',
    description: 'Email address to verify for sending'
  })
  @IsNotEmpty()
  @IsEmail()
  email: string;
}

export class CreateEmailTemplateDto {
  @ApiProperty({ 
    example: 'welcome-email',
    description: 'Template identifier'
  })
  @IsNotEmpty()
  @IsString()
  name: string;

  @ApiProperty({ 
    example: 'Welcome to {{companyName}}!',
    description: 'Email subject template'
  })
  @IsNotEmpty()
  @IsString()
  subject: string;

  @ApiProperty({ 
    example: '<h1>Welcome {{userName}}!</h1><p>Thank you for joining {{companyName}}.</p>',
    description: 'HTML template content'
  })
  @IsNotEmpty()
  @IsString()
  htmlTemplate: string;

  @ApiProperty({ 
    example: 'Welcome {{userName}}! Thank you for joining {{companyName}}.',
    description: 'Plain text template content',
    required: false
  })
  @IsOptional()
  @IsString()
  textTemplate?: string;
}

export class SendToQueueDto {
  @ApiProperty({ 
    example: { action: 'PROCESS_ORDER', orderId: '12345' },
    description: 'Message body to send to queue'
  })
  @IsNotEmpty()
  @IsObject()
  body: Record<string, any>;

  @ApiProperty({ 
    example: 'https://sqs.us-east-1.amazonaws.com/123456789/my-queue',
    description: 'SQS queue URL'
  })
  @IsNotEmpty()
  @IsString()
  queueUrl: string;

  @ApiProperty({ 
    example: { correlationId: 'abc-123' },
    description: 'Message attributes',
    required: false
  })
  @IsOptional()
  @IsObject()
  attributes?: Record<string, any>;

  @ApiProperty({ 
    example: 'order-group',
    description: 'Message group ID for FIFO queues',
    required: false
  })
  @IsOptional()
  @IsString()
  messageGroupId?: string;

  @ApiProperty({ 
    example: 60,
    description: 'Delay in seconds',
    required: false,
    minimum: 0,
    maximum: 900
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(900)
  delaySeconds?: number;
}

export class ReceiveFromQueueDto {
  @ApiProperty({ 
    example: 'https://sqs.us-east-1.amazonaws.com/123456789/my-queue',
    description: 'SQS queue URL'
  })
  @IsNotEmpty()
  @IsString()
  queueUrl: string;

  @ApiProperty({ 
    example: 10,
    description: 'Maximum number of messages to receive',
    required: false,
    minimum: 1,
    maximum: 10
  })
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(10)
  maxMessages?: number;

  @ApiProperty({ 
    example: 30,
    description: 'Visibility timeout in seconds',
    required: false,
    minimum: 0,
    maximum: 43200
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(43200)
  visibilityTimeout?: number;

  @ApiProperty({ 
    example: 20,
    description: 'Long polling wait time in seconds',
    required: false,
    minimum: 0,
    maximum: 20
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(20)
  waitTimeSeconds?: number;
}

export class DeleteFromQueueDto {
  @ApiProperty({ 
    example: 'https://sqs.us-east-1.amazonaws.com/123456789/my-queue',
    description: 'SQS queue URL'
  })
  @IsNotEmpty()
  @IsString()
  queueUrl: string;

  @ApiProperty({ 
    example: 'receipt-handle-string',
    description: 'Receipt handle of the message to delete'
  })
  @IsNotEmpty()
  @IsString()
  receiptHandle: string;
}