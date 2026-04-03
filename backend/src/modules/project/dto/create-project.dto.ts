import { IsString, IsNotEmpty, IsOptional, IsUUID } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateProjectDto {
  @ApiProperty({ example: 'My Project', description: 'Project name' })
  @IsNotEmpty()
  @IsString()
  name: string;

  @ApiProperty({ example: 'Project description', description: 'Project description', required: false })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({ example: 'uuid', description: 'Organization ID', required: false })
  @IsOptional()
  @IsUUID()
  organizationId?: string;
}