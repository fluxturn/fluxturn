import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNotEmpty, IsOptional, IsArray, IsNumber, Min, Max } from 'class-validator';

export class CreateApiKeyDto {
  @ApiProperty({ example: 'Mobile App Key', description: 'Name for the API key' })
  @IsNotEmpty()
  @IsString()
  name: string;

  @ApiProperty({ 
    example: ['read', 'write'], 
    description: 'Permissions for the API key',
    required: false,
    type: [String]
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  permissions?: string[];

  @ApiProperty({ 
    example: 30, 
    description: 'Days until expiration (1-365 days)',
    required: false,
    minimum: 1,
    maximum: 365
  })
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(365)
  expiresIn?: number;
}