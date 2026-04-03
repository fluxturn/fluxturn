import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsObject, IsArray, IsOptional, IsBoolean, IsNumber, IsEnum, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

// Schema Validation DTOs
export class SchemaValidationDto {
  @ApiProperty({ 
    description: 'Database schema to validate',
    example: {
      tables: [
        {
          name: 'users',
          columns: [
            { name: 'id', type: 'uuid', primaryKey: true },
            { name: 'email', type: 'varchar', unique: true },
            { name: 'created_at', type: 'timestamp' }
          ]
        }
      ]
    }
  })
  @IsObject()
  schema: any;
}

export class ValidationIssueDto {
  @ApiProperty({ enum: ['error', 'warning', 'info'] })
  @IsEnum(['error', 'warning', 'info'])
  type: 'error' | 'warning' | 'info';

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  table?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  column?: string;

  @ApiProperty()
  @IsString()
  message: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  suggestion?: string;
}

export class SchemaValidationResultDto {
  @ApiProperty()
  @IsBoolean()
  valid: boolean;

  @ApiProperty({ type: [ValidationIssueDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ValidationIssueDto)
  issues: ValidationIssueDto[];

  @ApiProperty()
  @IsNumber()
  tablesCount: number;

  @ApiProperty()
  @IsNumber()
  columnsCount: number;
}

// Migration Plan DTOs
export class MigrationPlanDto {
  @ApiProperty({ 
    description: 'Database schema to migrate to',
    example: {
      tables: [
        {
          name: 'users',
          columns: [
            { name: 'id', type: 'uuid', primaryKey: true },
            { name: 'email', type: 'varchar', unique: true }
          ]
        }
      ]
    }
  })
  @IsObject()
  schema: any;

  @ApiProperty({ required: false, description: 'Dry run mode - generate plan without saving' })
  @IsOptional()
  @IsBoolean()
  dryRun?: boolean;
}

export class MigrationStepDto {
  @ApiProperty()
  @IsString()
  id: string;

  @ApiProperty({ enum: ['CREATE_TABLE', 'DROP_TABLE', 'ADD_COLUMN', 'DROP_COLUMN', 'ALTER_COLUMN', 'CREATE_INDEX', 'DROP_INDEX'] })
  @IsString()
  type: string;

  @ApiProperty()
  @IsString()
  table: string;

  @ApiProperty()
  @IsString()
  description: string;

  @ApiProperty()
  @IsString()
  sql: string;

  @ApiProperty({ enum: ['pending', 'in_progress', 'completed', 'failed', 'skipped'] })
  @IsString()
  status: string;
}

export class MigrationPlanResultDto {
  @ApiProperty()
  @IsString()
  id: string;

  @ApiProperty({ type: [MigrationStepDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => MigrationStepDto)
  steps: MigrationStepDto[];

  @ApiProperty()
  @IsNumber()
  totalSteps: number;

  @ApiProperty({ enum: ['pending', 'in_progress', 'completed', 'failed', 'cancelled'] })
  @IsString()
  status: string;
}

// Migration Execution DTOs
export class MigrationExecutionResultDto {
  @ApiProperty()
  @IsBoolean()
  success: boolean;

  @ApiProperty()
  @IsNumber()
  completedSteps: number;

  @ApiProperty({ required: false })
  @IsOptional()
  failedStep?: {
    id: string;
    error: string;
  };
}

export class MigrationRollbackResultDto {
  @ApiProperty()
  @IsBoolean()
  success: boolean;

  @ApiProperty()
  @IsString()
  message: string;
}

// Migration History DTOs
export class MigrationHistoryDto {
  @ApiProperty()
  @IsString()
  id: string;

  @ApiProperty()
  @IsString()
  createdAt: string;

  @ApiProperty({ enum: ['pending', 'in_progress', 'completed', 'failed', 'rolled_back'] })
  @IsString()
  status: string;

  @ApiProperty()
  @IsNumber()
  totalSteps: number;

  @ApiProperty()
  @IsNumber()
  completedSteps: number;

  @ApiProperty({ type: [String] })
  @IsArray()
  @IsString({ each: true })
  tablesCreated: string[];

  @ApiProperty({ type: [String], required: false })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tablesModified?: string[];

  @ApiProperty({ type: [String], required: false })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tablesDropped?: string[];
}

// Schema Export DTOs
export class SchemaExportDto {
  @ApiProperty()
  @IsString()
  version: string;

  @ApiProperty({ type: [Object] })
  @IsArray()
  tables: any[];

  @ApiProperty()
  @IsObject()
  metadata: {
    exportedAt: string;
    source: string;
    tablesCount?: number;
    columnsCount?: number;
  };
}