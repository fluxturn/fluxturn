import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsOptional, IsNumber, Min } from 'class-validator';

export class DatabaseQueryDto {
  @ApiProperty({
    description: 'SQL query to execute',
    example: 'SELECT * FROM users WHERE active = true'
  })
  @IsString()
  query: string;

  @ApiProperty({
    description: 'Query parameters for parameterized queries',
    required: false,
    example: ['john@example.com', 25]
  })
  @IsOptional()
  parameters?: any[];

  @ApiProperty({
    description: 'Maximum number of rows to return',
    required: false,
    example: 100,
    default: 1000
  })
  @IsOptional()
  @IsNumber()
  @Min(1)
  limit?: number;
}

export class DatabaseQueryResultDto {
  @ApiProperty({ description: 'Query results as array of objects' })
  rows: any[];

  @ApiProperty({ description: 'Number of rows returned' })
  rowCount: number;

  @ApiProperty({ description: 'Query execution time in milliseconds' })
  executionTime: number;

  @ApiProperty({ description: 'Column information' })
  fields: Array<{
    name: string;
    dataTypeID: number;
    dataTypeSize: number;
    dataTypeModifier: number;
  }>;
}