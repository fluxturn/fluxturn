import { ApiProperty } from '@nestjs/swagger';
import {
  IsString,
  IsOptional,
  IsNumber,
  IsBoolean,
  IsNotEmpty,
  IsObject,
  IsEnum,
  IsArray,
  Min,
  Max,
  IsUrl,
} from 'class-validator';

export enum StorageProvider {
  AWS_S3 = 's3',
  GOOGLE_CLOUD_STORAGE = 'gcs',
  AZURE_BLOB = 'azure',
  LOCAL = 'local',
}

export enum StorageClass {
  STANDARD = 'STANDARD',
  INFREQUENT_ACCESS = 'STANDARD_IA',
  GLACIER = 'GLACIER',
  DEEP_ARCHIVE = 'DEEP_ARCHIVE',
  INTELLIGENT_TIERING = 'INTELLIGENT_TIERING',
}

export class UploadFileDto {
  @ApiProperty({ 
    example: 'documents/report-2024.pdf',
    description: 'File path in storage'
  })
  @IsNotEmpty()
  @IsString()
  filePath: string;

  @ApiProperty({ 
    example: 'base64encodedcontent...',
    description: 'File content as base64 string'
  })
  @IsNotEmpty()
  @IsString()
  content: string;

  @ApiProperty({ 
    example: 'application/pdf',
    description: 'MIME type of the file',
    required: false
  })
  @IsOptional()
  @IsString()
  contentType?: string;

  @ApiProperty({ 
    example: { userId: '123', uploadedAt: '2024-01-01' },
    description: 'File metadata',
    required: false
  })
  @IsOptional()
  @IsObject()
  metadata?: Record<string, string>;

  @ApiProperty({ 
    example: StorageClass.STANDARD,
    description: 'Storage class for the file',
    required: false,
    enum: StorageClass
  })
  @IsOptional()
  @IsEnum(StorageClass)
  storageClass?: StorageClass;

  @ApiProperty({ 
    example: 'AES256',
    description: 'Server-side encryption',
    required: false
  })
  @IsOptional()
  @IsString()
  encryption?: string;

  @ApiProperty({ 
    example: true,
    description: 'Make file publicly readable',
    required: false
  })
  @IsOptional()
  @IsBoolean()
  public?: boolean;
}

export class DownloadFileDto {
  @ApiProperty({ 
    example: 'documents/report-2024.pdf',
    description: 'File path in storage'
  })
  @IsNotEmpty()
  @IsString()
  filePath: string;

  @ApiProperty({ 
    example: 'v1234567890',
    description: 'Specific version to download',
    required: false
  })
  @IsOptional()
  @IsString()
  versionId?: string;
}

export class DeleteFileDto {
  @ApiProperty({ 
    example: 'documents/report-2024.pdf',
    description: 'File path in storage'
  })
  @IsNotEmpty()
  @IsString()
  filePath: string;

  @ApiProperty({ 
    example: 'v1234567890',
    description: 'Specific version to delete',
    required: false
  })
  @IsOptional()
  @IsString()
  versionId?: string;
}

export class ListFilesDto {
  @ApiProperty({ 
    example: 'documents/',
    description: 'Prefix to filter files',
    required: false
  })
  @IsOptional()
  @IsString()
  prefix?: string;

  @ApiProperty({ 
    example: 100,
    description: 'Maximum number of files to return',
    required: false,
    minimum: 1,
    maximum: 1000
  })
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(1000)
  maxFiles?: number;

  @ApiProperty({ 
    example: 'documents/page2-token',
    description: 'Continuation token for pagination',
    required: false
  })
  @IsOptional()
  @IsString()
  continuationToken?: string;

  @ApiProperty({ 
    example: '/',
    description: 'Delimiter for grouping files',
    required: false
  })
  @IsOptional()
  @IsString()
  delimiter?: string;
}

export class GetPresignedUrlDto {
  @ApiProperty({ 
    example: 'documents/report-2024.pdf',
    description: 'File path in storage'
  })
  @IsNotEmpty()
  @IsString()
  filePath: string;

  @ApiProperty({ 
    example: 'get',
    description: 'Operation type',
    enum: ['get', 'put']
  })
  @IsNotEmpty()
  @IsEnum(['get', 'put'])
  operation: 'get' | 'put';

  @ApiProperty({ 
    example: 3600,
    description: 'URL expiration time in seconds',
    required: false,
    minimum: 1,
    maximum: 604800
  })
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(604800)
  expiresIn?: number;

  @ApiProperty({ 
    example: 'application/pdf',
    description: 'Content type for PUT operations',
    required: false
  })
  @IsOptional()
  @IsString()
  contentType?: string;

  @ApiProperty({ 
    example: { 'response-content-disposition': 'attachment; filename="report.pdf"' },
    description: 'Response parameters for GET operations',
    required: false
  })
  @IsOptional()
  @IsObject()
  responseParams?: Record<string, string>;
}

export class CopyFileDto {
  @ApiProperty({ 
    example: 'documents/original.pdf',
    description: 'Source file path'
  })
  @IsNotEmpty()
  @IsString()
  sourcePath: string;

  @ApiProperty({ 
    example: 'documents/copy.pdf',
    description: 'Destination file path'
  })
  @IsNotEmpty()
  @IsString()
  destinationPath: string;

  @ApiProperty({ 
    example: 'another-bucket',
    description: 'Destination bucket (if different)',
    required: false
  })
  @IsOptional()
  @IsString()
  destinationBucket?: string;

  @ApiProperty({ 
    example: { newTag: 'value' },
    description: 'Metadata for the copied file',
    required: false
  })
  @IsOptional()
  @IsObject()
  metadata?: Record<string, string>;
}

export class MoveFileDto extends CopyFileDto {}

export class GetFileMetadataDto {
  @ApiProperty({ 
    example: 'documents/report-2024.pdf',
    description: 'File path in storage'
  })
  @IsNotEmpty()
  @IsString()
  filePath: string;

  @ApiProperty({ 
    example: 'v1234567890',
    description: 'Specific version',
    required: false
  })
  @IsOptional()
  @IsString()
  versionId?: string;
}

export class MultipartUploadInitDto {
  @ApiProperty({ 
    example: 'videos/large-video.mp4',
    description: 'File path for multipart upload'
  })
  @IsNotEmpty()
  @IsString()
  filePath: string;

  @ApiProperty({ 
    example: 'video/mp4',
    description: 'Content type of the file'
  })
  @IsNotEmpty()
  @IsString()
  contentType: string;

  @ApiProperty({ 
    example: { uploadedBy: 'user123' },
    description: 'File metadata',
    required: false
  })
  @IsOptional()
  @IsObject()
  metadata?: Record<string, string>;
}

export class MultipartUploadPartDto {
  @ApiProperty({ 
    example: 'abc123xyz',
    description: 'Upload ID from initialization'
  })
  @IsNotEmpty()
  @IsString()
  uploadId: string;

  @ApiProperty({ 
    example: 'videos/large-video.mp4',
    description: 'File path'
  })
  @IsNotEmpty()
  @IsString()
  filePath: string;

  @ApiProperty({ 
    example: 1,
    description: 'Part number (1-10000)',
    minimum: 1,
    maximum: 10000
  })
  @IsNotEmpty()
  @IsNumber()
  @Min(1)
  @Max(10000)
  partNumber: number;

  @ApiProperty({ 
    example: 'base64encodedpartcontent...',
    description: 'Part content as base64'
  })
  @IsNotEmpty()
  @IsString()
  content: string;
}

export class MultipartUploadCompleteDto {
  @ApiProperty({ 
    example: 'abc123xyz',
    description: 'Upload ID from initialization'
  })
  @IsNotEmpty()
  @IsString()
  uploadId: string;

  @ApiProperty({ 
    example: 'videos/large-video.mp4',
    description: 'File path'
  })
  @IsNotEmpty()
  @IsString()
  filePath: string;

  @ApiProperty({ 
    example: [
      { partNumber: 1, etag: 'etag1' },
      { partNumber: 2, etag: 'etag2' }
    ],
    description: 'Array of completed parts'
  })
  @IsNotEmpty()
  @IsArray()
  parts: Array<{
    partNumber: number;
    etag: string;
  }>;
}

export class SetBucketPolicyDto {
  @ApiProperty({ 
    example: 'my-bucket',
    description: 'Bucket name',
    required: false
  })
  @IsOptional()
  @IsString()
  bucket?: string;

  @ApiProperty({ 
    example: {
      Version: '2012-10-17',
      Statement: [{
        Effect: 'Allow',
        Principal: '*',
        Action: 's3:GetObject',
        Resource: 'arn:aws:s3:::my-bucket/public/*'
      }]
    },
    description: 'Bucket policy document'
  })
  @IsNotEmpty()
  @IsObject()
  policy: Record<string, any>;
}

export class CreateFolderDto {
  @ApiProperty({ 
    example: 'documents/2024/january/',
    description: 'Folder path to create'
  })
  @IsNotEmpty()
  @IsString()
  folderPath: string;
}

export class SearchFilesDto {
  @ApiProperty({ 
    example: 'report',
    description: 'Search query'
  })
  @IsNotEmpty()
  @IsString()
  query: string;

  @ApiProperty({ 
    example: 'documents/',
    description: 'Prefix to search within',
    required: false
  })
  @IsOptional()
  @IsString()
  prefix?: string;

  @ApiProperty({ 
    example: ['pdf', 'docx'],
    description: 'File extensions to filter',
    required: false
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  extensions?: string[];

  @ApiProperty({ 
    example: 100,
    description: 'Maximum results',
    required: false,
    minimum: 1,
    maximum: 1000
  })
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(1000)
  maxResults?: number;
}

export class GenerateShareLinkDto {
  @ApiProperty({ 
    example: 'documents/report-2024.pdf',
    description: 'File path to share'
  })
  @IsNotEmpty()
  @IsString()
  filePath: string;

  @ApiProperty({ 
    example: 86400,
    description: 'Link expiration in seconds',
    minimum: 60,
    maximum: 604800
  })
  @IsNotEmpty()
  @IsNumber()
  @Min(60)
  @Max(604800)
  expiresIn: number;

  @ApiProperty({ 
    example: 'password123',
    description: 'Password protection',
    required: false
  })
  @IsOptional()
  @IsString()
  password?: string;

  @ApiProperty({ 
    example: 10,
    description: 'Maximum download count',
    required: false,
    minimum: 1
  })
  @IsOptional()
  @IsNumber()
  @Min(1)
  maxDownloads?: number;
}