import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsOptional, IsNumber, IsArray, IsBoolean, IsObject, Min, Max, IsEnum } from 'class-validator';
import { Type } from 'class-transformer';

export class SearchDto {
  @ApiProperty({ 
    description: 'Search query text',
    example: 'user registration' 
  })
  @IsString()
  query: string;

  @ApiProperty({ 
    description: 'Tables to search in',
    example: ['users', 'posts'],
    required: false 
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tables?: string[];

  @ApiProperty({ 
    description: 'Fields to search in',
    example: ['title', 'content', 'description'],
    required: false 
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  fields?: string[];

  @ApiProperty({ 
    description: 'Number of results to return',
    example: 10,
    required: false,
    minimum: 1,
    maximum: 100
  })
  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  @Min(1)
  @Max(100)
  limit?: number = 10;

  @ApiProperty({ 
    description: 'Offset for pagination',
    example: 0,
    required: false 
  })
  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  @Min(0)
  offset?: number = 0;

  @ApiProperty({ 
    description: 'Include highlights in results',
    example: true,
    required: false 
  })
  @IsOptional()
  @IsBoolean()
  highlight?: boolean;
}

export class VectorSearchDto {
  @ApiProperty({ 
    description: 'Text to generate embeddings from',
    example: 'How to implement user authentication' 
  })
  @IsString()
  text: string;

  @ApiProperty({ 
    description: 'Collection/table to search',
    example: 'posts' 
  })
  @IsString()
  collection: string;

  @ApiProperty({ 
    description: 'Number of similar results',
    example: 5,
    required: false 
  })
  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  @Min(1)
  @Max(50)
  limit?: number = 5;

  @ApiProperty({ 
    description: 'Minimum similarity score (0-1)',
    example: 0.7,
    required: false 
  })
  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  @Min(0)
  @Max(1)
  minScore?: number = 0.5;
}