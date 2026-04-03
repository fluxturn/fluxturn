import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEmail, IsString, IsOptional, IsBoolean, IsArray, IsObject, IsDateString, IsEnum, MinLength, MaxLength } from 'class-validator';
import { Type } from 'class-transformer';

export class CreateUserDto {
  @ApiProperty({ description: 'User email address', example: 'john.doe@example.com' })
  @IsEmail()
  email: string;

  @ApiProperty({ description: 'User password', example: 'SecurePass123!' })
  @IsString()
  @MinLength(8)
  password: string;

  @ApiProperty({ description: 'User first name', example: 'John' })
  @IsString()
  @MaxLength(255)
  firstName: string;

  @ApiProperty({ description: 'User last name', example: 'Doe' })
  @IsString()
  @MaxLength(255)
  lastName: string;

  @ApiPropertyOptional({ description: 'Organization ID', example: '123e4567-e89b-12d3-a456-426614174000' })
  @IsOptional()
  @IsString()
  organizationId?: string;

  @ApiPropertyOptional({ description: 'User role', example: 'member', enum: ['owner', 'admin', 'member'] })
  @IsOptional()
  @IsEnum(['owner', 'admin', 'member'])
  role?: 'owner' | 'admin' | 'member';
}

export class CreateOrganizationDto {
  @ApiProperty({ description: 'Organization name', example: 'Acme Corporation' })
  @IsString()
  @MaxLength(255)
  name: string;

  @ApiPropertyOptional({ description: 'Organization description', example: 'A leading technology company' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({ description: 'Owner user ID', example: '123e4567-e89b-12d3-a456-426614174000' })
  @IsString()
  ownerId: string;

  @ApiPropertyOptional({ description: 'Organization settings', example: { theme: 'dark', timezone: 'UTC' } })
  @IsOptional()
  @IsObject()
  settings?: Record<string, any>;
}

export class CreateProjectDto {
  @ApiProperty({ description: 'Project name', example: 'My Web App' })
  @IsString()
  @MaxLength(255)
  name: string;

  @ApiPropertyOptional({ description: 'Project description', example: 'A modern web application' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({ description: 'Organization ID', example: '123e4567-e89b-12d3-a456-426614174000' })
  @IsString()
  organizationId: string;

  @ApiPropertyOptional({ description: 'Project settings', example: { environment: 'production' } })
  @IsOptional()
  @IsObject()
  settings?: Record<string, any>;
}

export class CreateAppDto {
  @ApiProperty({ description: 'App name', example: 'Mobile App' })
  @IsString()
  @MaxLength(255)
  name: string;

  @ApiPropertyOptional({ description: 'App description', example: 'A mobile application for iOS and Android' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({ description: 'Project ID', example: '123e4567-e89b-12d3-a456-426614174000' })
  @IsString()
  projectId: string;

  @ApiProperty({ description: 'App type', example: 'mobile' })
  @IsString()
  @MaxLength(100)
  type: string;

  @ApiPropertyOptional({ description: 'App settings', example: { platform: 'react-native' } })
  @IsOptional()
  @IsObject()
  settings?: Record<string, any>;
}

export class CreateApiKeyDto {
  @ApiProperty({ description: 'API key name', example: 'Production API Key' })
  @IsString()
  @MaxLength(255)
  name: string;

  @ApiPropertyOptional({ description: 'Project ID', example: '123e4567-e89b-12d3-a456-426614174000' })
  @IsOptional()
  @IsString()
  projectId?: string;

  @ApiPropertyOptional({ description: 'App ID', example: '123e4567-e89b-12d3-a456-426614174000' })
  @IsOptional()
  @IsString()
  appId?: string;

  @ApiProperty({ description: 'Organization ID', example: '123e4567-e89b-12d3-a456-426614174000' })
  @IsString()
  organizationId: string;

  @ApiProperty({ description: 'API key permissions', example: ['read', 'write'] })
  @IsArray()
  @IsString({ each: true })
  permissions: string[];

  @ApiPropertyOptional({ description: 'Expiration date', example: '2024-12-31T23:59:59.999Z' })
  @IsOptional()
  @IsDateString()
  expiresAt?: Date;
}

export class CreateInvitationDto {
  @ApiProperty({ description: 'Invited user email', example: 'jane.doe@example.com' })
  @IsEmail()
  email: string;

  @ApiProperty({ description: 'Organization ID', example: '123e4567-e89b-12d3-a456-426614174000' })
  @IsString()
  organizationId: string;

  @ApiProperty({ description: 'User ID of inviter', example: '123e4567-e89b-12d3-a456-426614174000' })
  @IsString()
  invitedById: string;

  @ApiProperty({ description: 'Role for invited user', example: 'member', enum: ['admin', 'member'] })
  @IsEnum(['admin', 'member'])
  role: 'admin' | 'member';

  @ApiPropertyOptional({ description: 'Invitation expiration date', example: '2024-12-31T23:59:59.999Z' })
  @IsOptional()
  @IsDateString()
  expiresAt?: Date;
}

export class UserCredentialsDto {
  @ApiProperty({ description: 'User email address', example: 'john.doe@example.com' })
  @IsEmail()
  email: string;

  @ApiProperty({ description: 'User password', example: 'SecurePass123!' })
  @IsString()
  password: string;
}

export class ValidateApiKeyDto {
  @ApiProperty({ description: 'API key to validate', example: 'cgx_1234567890abcdef' })
  @IsString()
  key: string;
}

export class UpdateUserDto {
  @ApiPropertyOptional({ description: 'User first name', example: 'John' })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  firstName?: string;

  @ApiPropertyOptional({ description: 'User last name', example: 'Doe' })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  lastName?: string;

  @ApiPropertyOptional({ description: 'Email verification status', example: true })
  @IsOptional()
  @IsBoolean()
  isEmailVerified?: boolean;

  @ApiPropertyOptional({ description: 'User active status', example: true })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

export class UpdateOrganizationDto {
  @ApiPropertyOptional({ description: 'Organization name', example: 'Acme Corporation' })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  name?: string;

  @ApiPropertyOptional({ description: 'Organization description', example: 'A leading technology company' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ description: 'Organization settings', example: { theme: 'dark', timezone: 'UTC' } })
  @IsOptional()
  @IsObject()
  settings?: Record<string, any>;

  @ApiPropertyOptional({ description: 'Organization active status', example: true })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

export class UpdateProjectDto {
  @ApiPropertyOptional({ description: 'Project name', example: 'My Web App' })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  name?: string;

  @ApiPropertyOptional({ description: 'Project description', example: 'A modern web application' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ description: 'Project settings', example: { environment: 'production' } })
  @IsOptional()
  @IsObject()
  settings?: Record<string, any>;

  @ApiPropertyOptional({ description: 'Project active status', example: true })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

export class UpdateAppDto {
  @ApiPropertyOptional({ description: 'App name', example: 'Mobile App' })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  name?: string;

  @ApiPropertyOptional({ description: 'App description', example: 'A mobile application for iOS and Android' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ description: 'App settings', example: { platform: 'react-native' } })
  @IsOptional()
  @IsObject()
  settings?: Record<string, any>;

  @ApiPropertyOptional({ description: 'App active status', example: true })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

export class PlatformQueryDto {
  @ApiProperty({ description: 'SQL query string', example: 'SELECT * FROM users WHERE email = $1' })
  @IsString()
  query: string;

  @ApiPropertyOptional({ description: 'Query parameters', example: ['john.doe@example.com'] })
  @IsOptional()
  @IsArray()
  params?: any[];

  @ApiPropertyOptional({ description: 'Query timeout in milliseconds', example: 30000 })
  @IsOptional()
  timeout?: number;
}

export class CreateAuditLogDto {
  @ApiPropertyOptional({ description: 'User ID', example: '123e4567-e89b-12d3-a456-426614174000' })
  @IsOptional()
  @IsString()
  userId?: string;

  @ApiPropertyOptional({ description: 'Organization ID', example: '123e4567-e89b-12d3-a456-426614174000' })
  @IsOptional()
  @IsString()
  organizationId?: string;

  @ApiPropertyOptional({ description: 'Project ID', example: '123e4567-e89b-12d3-a456-426614174000' })
  @IsOptional()
  @IsString()
  projectId?: string;

  @ApiPropertyOptional({ description: 'App ID', example: '123e4567-e89b-12d3-a456-426614174000' })
  @IsOptional()
  @IsString()
  appId?: string;

  @ApiProperty({ description: 'Action performed', example: 'CREATE_USER' })
  @IsString()
  action: string;

  @ApiProperty({ description: 'Resource type', example: 'user' })
  @IsString()
  resourceType: string;

  @ApiPropertyOptional({ description: 'Resource ID', example: '123e4567-e89b-12d3-a456-426614174000' })
  @IsOptional()
  @IsString()
  resourceId?: string;

  @ApiPropertyOptional({ description: 'Additional details', example: { email: 'john.doe@example.com' } })
  @IsOptional()
  @IsObject()
  details?: Record<string, any>;

  @ApiPropertyOptional({ description: 'IP address', example: '192.168.1.1' })
  @IsOptional()
  @IsString()
  ipAddress?: string;

  @ApiPropertyOptional({ description: 'User agent string' })
  @IsOptional()
  @IsString()
  userAgent?: string;
}