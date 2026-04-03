import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsArray, ValidateNested, IsOptional, IsBoolean, IsIn } from 'class-validator';
import { Type } from 'class-transformer';

export class TableColumnDto {
  @ApiProperty({
    description: 'Column name',
    example: 'email'
  })
  @IsString()
  name: string;

  @ApiProperty({
    description: 'Column data type',
    example: 'VARCHAR(255)',
    enum: [
      'TEXT', 'VARCHAR(255)', 'INTEGER', 'BIGINT', 'DECIMAL', 'NUMERIC',
      'BOOLEAN', 'DATE', 'TIME', 'TIMESTAMP', 'TIMESTAMPTZ', 'UUID',
      'JSON', 'JSONB', 'BYTEA'
    ]
  })
  @IsString()
  type: string;

  @ApiProperty({
    description: 'Whether column allows NULL values',
    required: false,
    default: true
  })
  @IsOptional()
  @IsBoolean()
  nullable?: boolean;

  @ApiProperty({
    description: 'Default value for the column',
    required: false,
    example: 'CURRENT_TIMESTAMP'
  })
  @IsOptional()
  @IsString()
  defaultValue?: string;

  @ApiProperty({
    description: 'Whether column is primary key',
    required: false,
    default: false
  })
  @IsOptional()
  @IsBoolean()
  primaryKey?: boolean;

  @ApiProperty({
    description: 'Whether column values must be unique',
    required: false,
    default: false
  })
  @IsOptional()
  @IsBoolean()
  unique?: boolean;
}

export class CreateTableDto {
  @ApiProperty({
    description: 'Table name',
    example: 'users'
  })
  @IsString()
  name: string;

  @ApiProperty({
    description: 'Table columns',
    type: [TableColumnDto]
  })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => TableColumnDto)
  columns: TableColumnDto[];

  @ApiProperty({
    description: 'Create table if not exists',
    required: false,
    default: false
  })
  @IsOptional()
  @IsBoolean()
  ifNotExists?: boolean;
}

export class TableCreationResultDto {
  @ApiProperty({ description: 'Whether table was created successfully' })
  success: boolean;

  @ApiProperty({ description: 'Table name that was created' })
  tableName: string;

  @ApiProperty({ description: 'Number of columns created' })
  columnCount: number;

  @ApiProperty({ description: 'Result message' })
  message: string;
}