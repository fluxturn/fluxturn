import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNotEmpty, IsOptional, IsNumber } from 'class-validator';

export class SendToQueueDto {
  @ApiProperty({ description: 'Queue URL or name' })
  @IsString()
  @IsNotEmpty()
  queueUrl: string;

  @ApiProperty({ description: 'Message body' })
  @IsString()
  @IsNotEmpty()
  messageBody: string;

  @ApiProperty({ description: 'Message group ID (for FIFO queues)', required: false })
  @IsString()
  @IsOptional()
  messageGroupId?: string;

  @ApiProperty({ description: 'Message deduplication ID (for FIFO queues)', required: false })
  @IsString()
  @IsOptional()
  messageDeduplicationId?: string;
}

export class ReceiveFromQueueDto {
  @ApiProperty({ description: 'Queue URL or name' })
  @IsString()
  @IsNotEmpty()
  queueUrl: string;

  @ApiProperty({ description: 'Maximum number of messages to receive', required: false, default: 1 })
  @IsNumber()
  @IsOptional()
  maxNumberOfMessages?: number;

  @ApiProperty({ description: 'Visibility timeout in seconds', required: false, default: 30 })
  @IsNumber()
  @IsOptional()
  visibilityTimeout?: number;

  @ApiProperty({ description: 'Wait time in seconds', required: false, default: 0 })
  @IsNumber()
  @IsOptional()
  waitTimeSeconds?: number;
}

export class DeleteFromQueueDto {
  @ApiProperty({ description: 'Queue URL or name' })
  @IsString()
  @IsNotEmpty()
  queueUrl: string;

  @ApiProperty({ description: 'Receipt handle from received message' })
  @IsString()
  @IsNotEmpty()
  receiptHandle: string;
}
