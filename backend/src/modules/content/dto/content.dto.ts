import { IsEnum, IsObject, IsOptional, IsString } from "class-validator";

export class ContentFilterDto {
  @IsOptional()
  @IsString()
  contentType?: string;

  @IsOptional()
  @IsEnum(["active", "archived", "deleted"])
  status?: string;
}

export class CreateContentDto {
  @IsString()
  contentType: string;

  @IsOptional()
  @IsString()
  title?: string;

  @IsObject()
  content: any;

  @IsOptional()
  @IsString()
  source?: string;

  @IsOptional()
  @IsObject()
  sourceDetails?: any;

  @IsOptional()
  @IsObject()
  parameters?: any;

  @IsOptional()
  @IsObject()
  metadata?: any;

  @IsOptional()
  @IsEnum(["active", "archived", "deleted"])
  status?: string;
}

export class UpdateContentRequestDto {
  @IsOptional()
  @IsString()
  title?: string;

  @IsOptional()
  @IsObject()
  content?: any;

  @IsOptional()
  @IsString()
  contentType?: string;

  @IsOptional()
  @IsEnum(["active", "archived", "deleted"])
  status?: string;

  @IsOptional()
  @IsObject()
  metadata?: any;
}
