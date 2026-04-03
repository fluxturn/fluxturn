import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsEnum,
  IsBoolean,
  IsNumber,
  Min,
  Max,
  ValidateNested,
  IsObject
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export enum DatabaseType {
  POSTGRESQL = 'postgresql',
  MYSQL = 'mysql',
}

export class DatabaseConfigDto {
  @ApiProperty({ example: 'localhost', description: 'Database host' })
  @IsString()
  @IsNotEmpty()
  host: string;

  @ApiProperty({ example: 5432, description: 'Database port' })
  @IsNumber()
  @Min(1)
  @Max(65535)
  port: number;

  @ApiProperty({ example: 'my_database', description: 'Database name' })
  @IsString()
  @IsNotEmpty()
  database: string;

  @ApiPropertyOptional({ example: false, description: 'Enable SSL connection' })
  @IsOptional()
  @IsBoolean()
  ssl_enabled?: boolean;

  @ApiPropertyOptional({ description: 'SSL configuration options' })
  @IsOptional()
  @IsObject()
  ssl_config?: Record<string, any>;

  @ApiPropertyOptional({ example: 10000, description: 'Connection timeout in ms' })
  @IsOptional()
  @IsNumber()
  @Min(1000)
  @Max(60000)
  connection_timeout?: number;

  @ApiPropertyOptional({ example: 10, description: 'Connection pool size' })
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(100)
  pool_size?: number;
}

export class DatabaseCredentialsDto {
  @ApiProperty({ example: 'db_user', description: 'Database username' })
  @IsString()
  @IsNotEmpty()
  user: string;

  @ApiProperty({ example: 'secure_password', description: 'Database password' })
  @IsString()
  @IsNotEmpty()
  password: string;
}

export class CreateConnectionDto {
  @ApiProperty({ example: 'Production DB', description: 'Connection name' })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiPropertyOptional({ description: 'Connection description' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({ enum: DatabaseType, description: 'Database type' })
  @IsEnum(DatabaseType)
  database_type: DatabaseType;

  @ApiProperty({ type: DatabaseConfigDto, description: 'Connection configuration' })
  @ValidateNested()
  @Type(() => DatabaseConfigDto)
  config: DatabaseConfigDto;

  @ApiProperty({ type: DatabaseCredentialsDto, description: 'Database credentials' })
  @ValidateNested()
  @Type(() => DatabaseCredentialsDto)
  credentials: DatabaseCredentialsDto;
}

export class UpdateConnectionDto {
  @ApiPropertyOptional({ description: 'Connection name' })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiPropertyOptional({ description: 'Connection description' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ type: DatabaseConfigDto, description: 'Connection configuration' })
  @IsOptional()
  @ValidateNested()
  @Type(() => DatabaseConfigDto)
  config?: DatabaseConfigDto;

  @ApiPropertyOptional({ type: DatabaseCredentialsDto, description: 'Database credentials' })
  @IsOptional()
  @ValidateNested()
  @Type(() => DatabaseCredentialsDto)
  credentials?: DatabaseCredentialsDto;

  @ApiPropertyOptional({ description: 'Active status' })
  @IsOptional()
  @IsBoolean()
  is_active?: boolean;
}

export class ListConnectionsQueryDto {
  @ApiPropertyOptional({ enum: DatabaseType, description: 'Filter by database type' })
  @IsOptional()
  @IsEnum(DatabaseType)
  database_type?: DatabaseType;

  @ApiPropertyOptional({ description: 'Filter by status' })
  @IsOptional()
  @IsString()
  status?: string;

  @ApiPropertyOptional({ example: 20, description: 'Results per page' })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  @Max(100)
  limit?: number;

  @ApiPropertyOptional({ example: 0, description: 'Results to skip' })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  offset?: number;
}

export class TestConnectionDto {
  @ApiProperty({ enum: DatabaseType, description: 'Database type' })
  @IsEnum(DatabaseType)
  database_type: DatabaseType;

  @ApiProperty({ type: DatabaseConfigDto, description: 'Connection configuration' })
  @ValidateNested()
  @Type(() => DatabaseConfigDto)
  config: DatabaseConfigDto;

  @ApiProperty({ type: DatabaseCredentialsDto, description: 'Database credentials' })
  @ValidateNested()
  @Type(() => DatabaseCredentialsDto)
  credentials: DatabaseCredentialsDto;
}
