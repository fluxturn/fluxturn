import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsOptional, IsNumber, IsEnum, Min } from 'class-validator';
import { Type } from 'class-transformer';

export enum CacheOperation {
  GET = 'get',
  SET = 'set',
  INVALIDATE = 'invalidate',
  REFRESH = 'refresh',
  DELETE = 'delete',
  FLUSH = 'flush'
}

export class CacheOperationDto {
  @ApiProperty({ 
    description: 'Cache key or pattern',
    example: 'users:123' 
  })
  @IsString()
  key: string;

  @ApiProperty({ 
    description: 'Operation type',
    example: CacheOperation.GET,
    enum: CacheOperation
  })
  @IsEnum(CacheOperation)
  operation: CacheOperation;

  @ApiProperty({ 
    description: 'Value to cache (for set operation)',
    required: false 
  })
  @IsOptional()
  value?: any;

  @ApiProperty({ 
    description: 'TTL in seconds',
    example: 3600,
    required: false 
  })
  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  @Min(0)
  ttl?: number;
}

export class CacheInvalidateDto {
  @ApiProperty({ 
    description: 'Cache key pattern to invalidate (supports wildcards)',
    example: 'users:*' 
  })
  @IsString()
  pattern: string;

  @ApiProperty({ 
    description: 'Also invalidate related caches',
    example: true,
    required: false 
  })
  @IsOptional()
  cascade?: boolean = false;
}

export class CacheStatsDto {
  @ApiProperty({ 
    description: 'Get cache statistics for specific pattern',
    example: 'users:*',
    required: false 
  })
  @IsOptional()
  @IsString()
  pattern?: string;

  @ApiProperty({ 
    description: 'Include memory usage stats',
    example: true,
    required: false 
  })
  @IsOptional()
  includeMemory?: boolean = false;
}