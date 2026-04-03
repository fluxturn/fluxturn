import { ApiProperty } from '@nestjs/swagger';
import { IsOptional, IsNumber, IsString, IsObject, Min, Max } from 'class-validator';
import { Type, Transform } from 'class-transformer';

export class TableDataQueryDto {
  @ApiProperty({
    description: 'Page number for pagination',
    required: false,
    default: 1,
    minimum: 1
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  page?: number = 1;

  @ApiProperty({
    description: 'Number of records per page',
    required: false,
    default: 50,
    minimum: 1,
    maximum: 1000
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  @Max(1000)
  limit?: number = 50;

  @ApiProperty({
    description: 'Column to sort by',
    required: false
  })
  @IsOptional()
  @IsString()
  sortBy?: string;

  @ApiProperty({
    description: 'Sort direction',
    required: false,
    enum: ['ASC', 'DESC'],
    default: 'ASC'
  })
  @IsOptional()
  @IsString()
  sortDirection?: 'ASC' | 'DESC' = 'ASC';

  @ApiProperty({
    description: 'Search term for filtering',
    required: false
  })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiProperty({
    description: 'Column filters as key-value pairs',
    required: false,
    example: { 'status': 'active', 'category': 'premium' }
  })
  @IsOptional()
  @IsObject()
  filters?: Record<string, any>;
}

export class TableDataResultDto {
  @ApiProperty({ description: 'Table data rows' })
  data: any[];

  @ApiProperty({ description: 'Total number of records' })
  total: number;

  @ApiProperty({ description: 'Current page number' })
  page: number;

  @ApiProperty({ description: 'Records per page' })
  limit: number;

  @ApiProperty({ description: 'Total number of pages' })
  totalPages: number;

  @ApiProperty({ description: 'Whether there are more pages' })
  hasNext: boolean;

  @ApiProperty({ description: 'Whether there are previous pages' })
  hasPrev: boolean;
}

export class CreateTableRowDto {
  @ApiProperty({
    description: 'Row data as key-value pairs',
    example: { 'name': 'John Doe', 'email': 'john@example.com', 'status': 'active' }
  })
  @IsObject()
  data: Record<string, any>;
}

export class UpdateTableRowDto {
  @ApiProperty({
    description: 'Row data to update as key-value pairs',
    example: { 'name': 'Jane Doe', 'status': 'inactive' }
  })
  @IsObject()
  data: Record<string, any>;
}

export class TableRowResultDto {
  @ApiProperty({ description: 'Operation success status' })
  success: boolean;

  @ApiProperty({ description: 'Affected row data or ID' })
  row: any;

  @ApiProperty({ description: 'Result message' })
  message: string;
}