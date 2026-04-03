import { IsString, IsNotEmpty, IsOptional } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateAppDto {
  @ApiProperty({ example: 'My App', description: 'App name' })
  @IsNotEmpty()
  @IsString()
  name: string;

  @ApiProperty({ example: 'App description', description: 'App description', required: false })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({ example: 'web', description: 'App type', required: false })
  @IsOptional()
  @IsString()
  type?: string;
}