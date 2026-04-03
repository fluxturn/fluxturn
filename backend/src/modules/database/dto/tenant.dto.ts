import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEmail, IsString, IsOptional, IsBoolean, IsArray, IsObject, IsDateString, MinLength, MaxLength } from 'class-validator';

export class CreateTenantUserDto {
  @ApiProperty({ description: 'User email address', example: 'user@example.com' })
  @IsEmail()
  email: string;

  @ApiPropertyOptional({ description: 'User password', example: 'SecurePass123!' })
  @IsOptional()
  @IsString()
  @MinLength(8)
  password?: string;

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

  @ApiPropertyOptional({ description: 'User metadata', example: { role: 'customer', plan: 'premium' } })
  @IsOptional()
  @IsObject()
  metadata?: Record<string, any>;
}

export class CreateTenantSessionDto {
  @ApiProperty({ description: 'User ID', example: '123e4567-e89b-12d3-a456-426614174000' })
  @IsString()
  userId: string;

  @ApiProperty({ description: 'Session token', example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...' })
  @IsString()
  token: string;

  @ApiPropertyOptional({ description: 'Refresh token', example: 'refresh_token_abc123' })
  @IsOptional()
  @IsString()
  refreshToken?: string;

  @ApiProperty({ description: 'Token expiration date', example: '2024-12-31T23:59:59.999Z' })
  @IsDateString()
  expiresAt: Date;

  @ApiPropertyOptional({ description: 'Client IP address', example: '192.168.1.1' })
  @IsOptional()
  @IsString()
  ipAddress?: string;

  @ApiPropertyOptional({ description: 'User agent string' })
  @IsOptional()
  @IsString()
  userAgent?: string;
}

export class CreateTenantTeamDto {
  @ApiProperty({ description: 'Team name', example: 'Development Team' })
  @IsString()
  @MaxLength(255)
  name: string;

  @ApiPropertyOptional({ description: 'Team description', example: 'Our core development team' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ description: 'Team settings', example: { maxMembers: 10, isPublic: false } })
  @IsOptional()
  @IsObject()
  settings?: Record<string, any>;
}

export class CreateTenantTeamMemberDto {
  @ApiProperty({ description: 'Team ID', example: '123e4567-e89b-12d3-a456-426614174000' })
  @IsString()
  teamId: string;

  @ApiProperty({ description: 'User ID', example: '123e4567-e89b-12d3-a456-426614174000' })
  @IsString()
  userId: string;

  @ApiProperty({ description: 'Member role', example: 'developer' })
  @IsString()
  @MaxLength(100)
  role: string;

  @ApiPropertyOptional({ description: 'Member permissions', example: ['read', 'write', 'deploy'] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  permissions?: string[];
}

export class CreateTenantProfileDto {
  @ApiProperty({ description: 'User ID', example: '123e4567-e89b-12d3-a456-426614174000' })
  @IsString()
  userId: string;

  @ApiPropertyOptional({ description: 'Display name', example: 'John Doe' })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  displayName?: string;

  @ApiPropertyOptional({ description: 'Avatar URL', example: 'https://example.com/avatar.jpg' })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  avatar?: string;

  @ApiPropertyOptional({ description: 'User bio', example: 'Senior Software Developer' })
  @IsOptional()
  @IsString()
  bio?: string;

  @ApiPropertyOptional({ description: 'Website URL', example: 'https://johndoe.dev' })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  website?: string;

  @ApiPropertyOptional({ description: 'Location', example: 'San Francisco, CA' })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  location?: string;

  @ApiPropertyOptional({ description: 'Timezone', example: 'America/Los_Angeles' })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  timezone?: string;

  @ApiPropertyOptional({ description: 'User preferences', example: { theme: 'dark', notifications: true } })
  @IsOptional()
  @IsObject()
  preferences?: Record<string, any>;
}

export class UpdateTenantUserDto {
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

  @ApiPropertyOptional({ description: 'User metadata', example: { role: 'customer', plan: 'premium' } })
  @IsOptional()
  @IsObject()
  metadata?: Record<string, any>;

  @ApiPropertyOptional({ description: 'Email verification status', example: true })
  @IsOptional()
  @IsBoolean()
  isEmailVerified?: boolean;

  @ApiPropertyOptional({ description: 'User active status', example: true })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

export class UpdateTenantTeamDto {
  @ApiPropertyOptional({ description: 'Team name', example: 'Development Team' })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  name?: string;

  @ApiPropertyOptional({ description: 'Team description', example: 'Our core development team' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ description: 'Team settings', example: { maxMembers: 10, isPublic: false } })
  @IsOptional()
  @IsObject()
  settings?: Record<string, any>;

  @ApiPropertyOptional({ description: 'Team active status', example: true })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

export class UpdateTenantProfileDto {
  @ApiPropertyOptional({ description: 'Display name', example: 'John Doe' })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  displayName?: string;

  @ApiPropertyOptional({ description: 'Avatar URL', example: 'https://example.com/avatar.jpg' })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  avatar?: string;

  @ApiPropertyOptional({ description: 'User bio', example: 'Senior Software Developer' })
  @IsOptional()
  @IsString()
  bio?: string;

  @ApiPropertyOptional({ description: 'Website URL', example: 'https://johndoe.dev' })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  website?: string;

  @ApiPropertyOptional({ description: 'Location', example: 'San Francisco, CA' })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  location?: string;

  @ApiPropertyOptional({ description: 'Timezone', example: 'America/Los_Angeles' })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  timezone?: string;

  @ApiPropertyOptional({ description: 'User preferences', example: { theme: 'dark', notifications: true } })
  @IsOptional()
  @IsObject()
  preferences?: Record<string, any>;
}

export class TenantCredentialsDto {
  @ApiProperty({ description: 'User email address', example: 'user@example.com' })
  @IsEmail()
  email: string;

  @ApiProperty({ description: 'User password', example: 'SecurePass123!' })
  @IsString()
  password: string;
}

export class TenantQueryDto {
  @ApiProperty({ description: 'SQL query string', example: 'SELECT * FROM tenant_users WHERE email = $1' })
  @IsString()
  query: string;

  @ApiPropertyOptional({ description: 'Query parameters', example: ['user@example.com'] })
  @IsOptional()
  @IsArray()
  params?: any[];

  @ApiPropertyOptional({ description: 'Use transaction', example: false })
  @IsOptional()
  @IsBoolean()
  transaction?: boolean;

  @ApiPropertyOptional({ description: 'Query timeout in milliseconds', example: 30000 })
  @IsOptional()
  timeout?: number;
}

export class TenantDatabaseInfoDto {
  @ApiProperty({ description: 'Database name', example: 'app_123e4567_e89b_12d3_a456_426614174000' })
  @IsString()
  databaseName: string;

  @ApiProperty({ description: 'Service role key', example: 'service_abc123...' })
  @IsString()
  serviceRoleKey: string;

  @ApiProperty({ description: 'Anonymous key', example: 'anon_xyz789...' })
  @IsString()
  anonKey: string;

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
}

export class ValidateSessionTokenDto {
  @ApiProperty({ description: 'Session token', example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...' })
  @IsString()
  token: string;
}

export class InvalidateSessionDto {
  @ApiProperty({ description: 'Session token to invalidate', example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...' })
  @IsString()
  token: string;
}

export class TenantHealthCheckDto {
  @ApiProperty({ description: 'Database name', example: 'app_123e4567_e89b_12d3_a456_426614174000' })
  @IsString()
  databaseName: string;
}