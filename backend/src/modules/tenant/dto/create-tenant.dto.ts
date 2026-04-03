import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsEmail, MinLength, IsNotEmpty } from 'class-validator';

export class CreateTenantDto {
  @ApiProperty({ example: 'Acme Corp', description: 'Organization name' })
  @IsNotEmpty()
  @IsString()
  organizationName: string;

  @ApiProperty({ example: 'Main Project', description: 'Project name' })
  @IsNotEmpty()
  @IsString()
  projectName: string;

  @ApiProperty({ example: 'user@example.com', description: 'Admin email' })
  @IsNotEmpty()
  @IsEmail()
  adminEmail: string;

  @ApiProperty({ example: 'SecurePass123!', description: 'Admin password (min 8 characters)' })
  @IsNotEmpty()
  @IsString()
  @MinLength(8)
  adminPassword: string;
}