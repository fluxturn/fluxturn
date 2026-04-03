import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsOptional } from 'class-validator';

export class UpdateOrganizationDto {
  @ApiProperty({ example: 'Updated Company Name', description: 'Organization name', required: false })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiProperty({ example: 'Updated description', description: 'Organization description', required: false })
  @IsOptional()
  @IsString()
  description?: string;
}