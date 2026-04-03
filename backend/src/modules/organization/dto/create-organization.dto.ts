import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNotEmpty, IsOptional } from 'class-validator';

export class CreateOrganizationDto {
  @ApiProperty({ example: 'My Company', description: 'Organization name' })
  @IsNotEmpty()
  @IsString()
  name: string;

  @ApiProperty({ example: 'Main Project', description: 'Initial project name', required: false })
  @IsOptional()
  @IsString()
  projectName?: string;
}