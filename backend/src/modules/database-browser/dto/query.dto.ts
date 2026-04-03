import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsArray,
  IsObject,
  IsNumber,
  Min,
  Max
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class ExecuteQueryDto {
  @ApiProperty({
    example: 'SELECT * FROM users WHERE id = $1',
    description: 'SQL query to execute'
  })
  @IsString()
  @IsNotEmpty()
  query: string;

  @ApiPropertyOptional({
    example: ['user-uuid-123'],
    description: 'Query parameters for parameterized queries'
  })
  @IsOptional()
  @IsArray()
  params?: any[];

  @ApiPropertyOptional({
    example: 30000,
    description: 'Query timeout in milliseconds'
  })
  @IsOptional()
  @IsNumber()
  @Min(1000)
  @Max(300000)
  timeout?: number;
}

export class SelectRowsDto {
  @ApiPropertyOptional({ example: 'public', description: 'Schema name (defaults to public)' })
  @IsOptional()
  @IsString()
  schema?: string;

  @ApiPropertyOptional({ example: 'users', description: 'Table name (usually from URL path)' })
  @IsOptional()
  @IsString()
  table?: string;

  @ApiPropertyOptional({ example: '*', description: 'Columns to select' })
  @IsOptional()
  @IsString()
  columns?: string;

  @ApiPropertyOptional({
    example: { status: 'active' },
    description: 'WHERE conditions'
  })
  @IsOptional()
  @IsObject()
  where?: Record<string, any>;

  @ApiPropertyOptional({ example: 'created_at DESC', description: 'ORDER BY clause' })
  @IsOptional()
  @IsString()
  order_by?: string;

  @ApiPropertyOptional({ example: 50, description: 'Limit rows' })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  @Max(1000)
  limit?: number;

  @ApiPropertyOptional({ example: 0, description: 'Offset rows' })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  offset?: number;
}

export class InsertRowsDto {
  @ApiPropertyOptional({ example: 'public', description: 'Schema name (defaults to public)' })
  @IsOptional()
  @IsString()
  schema?: string;

  @ApiPropertyOptional({ example: 'users', description: 'Table name (usually from URL path)' })
  @IsOptional()
  @IsString()
  table?: string;

  @ApiProperty({
    example: [{ name: 'John', email: 'john@example.com' }],
    description: 'Rows to insert'
  })
  @IsArray()
  @IsNotEmpty()
  data: Record<string, any>[];

  @ApiPropertyOptional({ example: '*', description: 'Columns to return' })
  @IsOptional()
  @IsString()
  returning?: string;
}

export class UpdateRowsDto {
  @ApiPropertyOptional({ example: 'public', description: 'Schema name (defaults to public)' })
  @IsOptional()
  @IsString()
  schema?: string;

  @ApiPropertyOptional({ example: 'users', description: 'Table name (usually from URL path)' })
  @IsOptional()
  @IsString()
  table?: string;

  @ApiProperty({
    example: { status: 'inactive' },
    description: 'Data to update'
  })
  @IsObject()
  @IsNotEmpty()
  data: Record<string, any>;

  @ApiProperty({
    example: { id: 'user-uuid-123' },
    description: 'WHERE conditions (required for safety)'
  })
  @IsObject()
  @IsNotEmpty()
  where: Record<string, any>;

  @ApiPropertyOptional({ example: '*', description: 'Columns to return' })
  @IsOptional()
  @IsString()
  returning?: string;
}

export class DeleteRowsDto {
  @ApiPropertyOptional({ example: 'public', description: 'Schema name (defaults to public)' })
  @IsOptional()
  @IsString()
  schema?: string;

  @ApiPropertyOptional({ example: 'users', description: 'Table name (usually from URL path)' })
  @IsOptional()
  @IsString()
  table?: string;

  @ApiProperty({
    example: { id: 'user-uuid-123' },
    description: 'WHERE conditions (required for safety)'
  })
  @IsObject()
  @IsNotEmpty()
  where: Record<string, any>;

  @ApiPropertyOptional({ example: '*', description: 'Columns to return' })
  @IsOptional()
  @IsString()
  returning?: string;
}

export class QueryHistoryQueryDto {
  @ApiPropertyOptional({ example: 50, description: 'Results per page' })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  @Max(200)
  limit?: number;

  @ApiPropertyOptional({ example: 0, description: 'Results to skip' })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  offset?: number;
}
