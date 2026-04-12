import { IsOptional, IsString, IsEnum } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export enum DeadLetterStatus {
  PENDING = 'pending',
  RETRIED = 'retried',
  DISCARDED = 'discarded',
}

export class ListDeadLetterDto {
  @ApiPropertyOptional({ description: 'Filter by workflow ID' })
  @IsOptional()
  @IsString()
  workflow_id?: string;

  @ApiPropertyOptional({ enum: DeadLetterStatus, description: 'Filter by status' })
  @IsOptional()
  @IsEnum(DeadLetterStatus)
  status?: DeadLetterStatus;

  @ApiPropertyOptional({ description: 'Start date (ISO 8601)' })
  @IsOptional()
  @IsString()
  date_from?: string;

  @ApiPropertyOptional({ description: 'End date (ISO 8601)' })
  @IsOptional()
  @IsString()
  date_to?: string;

  @ApiPropertyOptional({ description: 'Max results to return', default: '50' })
  @IsOptional()
  @IsString()
  limit?: string;

  @ApiPropertyOptional({ description: 'Offset for pagination', default: '0' })
  @IsOptional()
  @IsString()
  offset?: string;
}
