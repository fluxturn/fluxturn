import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNotEmpty, IsOptional } from 'class-validator';

export class OAuthCallbackDto {
  @ApiProperty({
    description: 'Authorization code from OAuth provider',
    example: 'abc123def456',
  })
  @IsString()
  @IsNotEmpty()
  code: string;

  @ApiProperty({
    description: 'State parameter for CSRF protection',
    required: false,
  })
  @IsString()
  @IsOptional()
  state?: string;
}

export class OAuthTokenResponseDto {
  @ApiProperty({
    description: 'JWT access token',
  })
  accessToken: string;

  @ApiProperty({
    description: 'JWT refresh token',
  })
  refreshToken: string;

  @ApiProperty({
    description: 'User information',
  })
  user: {
    id: string;
    email: string;
    username?: string;
    firstName?: string;
    lastName?: string;
    fullName?: string;
    organizationId?: string;
    projectId?: string;
    avatarUrl?: string;
  };
}

export class OAuthProviderDto {
  @ApiProperty({
    description: 'OAuth provider name',
    enum: ['github', 'google', 'facebook', 'twitter', 'apple'],
    example: 'github',
  })
  @IsString()
  @IsNotEmpty()
  provider: 'github' | 'google' | 'facebook' | 'twitter' | 'apple';
}