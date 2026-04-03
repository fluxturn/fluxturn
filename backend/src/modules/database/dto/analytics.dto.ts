import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsOptional, IsArray, IsObject, IsEnum, IsNumber, Min, Max } from 'class-validator';
import { Type } from 'class-transformer';

export enum AnalyticsQueryType {
  EVENTS = 'events',
  AGGREGATIONS = 'aggregations',
  TIMESERIES = 'timeseries',
  FUNNEL = 'funnel',
  RETENTION = 'retention'
}

export enum AggregationFunction {
  COUNT = 'count',
  SUM = 'sum',
  AVG = 'avg',
  MIN = 'min',
  MAX = 'max',
  DISTINCT = 'distinct'
}

export class AnalyticsQueryDto {
  @ApiProperty({ 
    description: 'Analytics query type',
    example: AnalyticsQueryType.EVENTS,
    enum: AnalyticsQueryType
  })
  @IsEnum(AnalyticsQueryType)
  type: AnalyticsQueryType;

  @ApiProperty({ 
    description: 'Start date for analytics (ISO 8601)',
    example: '2024-01-01T00:00:00Z',
    required: false 
  })
  @IsOptional()
  @IsString()
  startDate?: string;

  @ApiProperty({ 
    description: 'End date for analytics (ISO 8601)',
    example: '2024-12-31T23:59:59Z',
    required: false 
  })
  @IsOptional()
  @IsString()
  endDate?: string;

  @ApiProperty({ 
    description: 'Group by fields',
    example: ['event_type', 'user_id'],
    required: false 
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  groupBy?: string[];

  @ApiProperty({ 
    description: 'Metrics to calculate',
    example: [AggregationFunction.COUNT, AggregationFunction.SUM],
    enum: AggregationFunction,
    isArray: true,
    required: false 
  })
  @IsOptional()
  @IsArray()
  @IsEnum(AggregationFunction, { each: true })
  metrics?: AggregationFunction[];

  @ApiProperty({ 
    description: 'Additional filters',
    example: { event_type: 'page_view', user_id: '123' },
    required: false 
  })
  @IsOptional()
  @IsObject()
  filters?: Record<string, any>;

  @ApiProperty({ 
    description: 'Table to query',
    example: 'events',
    required: false 
  })
  @IsOptional()
  @IsString()
  table?: string;

  @ApiProperty({ 
    description: 'Limit number of results',
    example: 100,
    required: false 
  })
  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  @Min(1)
  @Max(10000)
  limit?: number = 100;
}

export class EventTrackingDto {
  @ApiProperty({ 
    description: 'Event type/name',
    example: 'page_view' 
  })
  @IsString()
  eventType: string;

  @ApiProperty({ 
    description: 'User ID associated with event',
    example: 'user_123',
    required: false 
  })
  @IsOptional()
  @IsString()
  userId?: string;

  @ApiProperty({ 
    description: 'Session ID',
    example: 'session_abc123',
    required: false 
  })
  @IsOptional()
  @IsString()
  sessionId?: string;

  @ApiProperty({ 
    description: 'Event properties',
    example: { page: '/home', duration: 5.2 },
    required: false 
  })
  @IsOptional()
  @IsObject()
  properties?: Record<string, any>;

  @ApiProperty({ 
    description: 'Event timestamp (ISO 8601)',
    example: '2024-01-01T12:00:00Z',
    required: false 
  })
  @IsOptional()
  @IsString()
  timestamp?: string;
}