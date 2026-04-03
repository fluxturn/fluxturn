import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand,
  CopyObjectCommand,
  ListObjectsV2Command,
  HeadObjectCommand,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { v4 as uuidv4 } from 'uuid';
import * as mime from 'mime-types';
import { Readable } from 'stream';

export interface R2UploadOptions {
  bucket?: string;
  path?: string;
  isPublic?: boolean;
  metadata?: Record<string, string>;
  cacheControl?: string;
}

export interface R2UploadResult {
  url: string;
  key: string;
  bucket: string;
  etag: string;
  size: number;
  mimetype: string;
}

@Injectable()
export class R2Service {
  private readonly logger = new Logger(R2Service.name);
  private r2Client: S3Client;
  private defaultBucket: string;
  private accountId: string;
  private publicUrl: string;

  constructor(private configService: ConfigService) {
    this.initializeR2();
  }

  private initializeR2() {
    // Get Cloudflare R2 configuration
    this.accountId = this.configService.get<string>('CLOUDFLARE_ACCOUNT_ID');
    const accessKeyId = this.configService.get<string>('CLOUDFLARE_R2_ACCESS_KEY_ID');
    const secretAccessKey = this.configService.get<string>('CLOUDFLARE_R2_SECRET_ACCESS_KEY');

    this.defaultBucket = this.configService.get<string>('CLOUDFLARE_R2_BUCKET_NAME') || 'infoinlet-dev';

    // R2 endpoint format: https://<ACCOUNT_ID>.r2.cloudflarestorage.com
    const r2Endpoint = `https://${this.accountId}.r2.cloudflarestorage.com`;

    // R2 public URL (if custom domain is configured)
    this.publicUrl = this.configService.get<string>('CLOUDFLARE_R2_PUBLIC_URL') ||
                     `https://pub-${this.accountId}.r2.dev`;

    if (!this.accountId || !accessKeyId || !secretAccessKey) {
      this.logger.warn('Missing Cloudflare R2 configuration. Storage features will be limited.');
      this.logger.warn('Please set: CLOUDFLARE_ACCOUNT_ID, CLOUDFLARE_R2_ACCESS_KEY_ID, CLOUDFLARE_R2_SECRET_ACCESS_KEY');
      // Don't throw error - allow app to start without R2
      return;
    }

    const r2Config = {
      region: 'auto', // R2 uses 'auto' region
      endpoint: r2Endpoint,
      credentials: {
        accessKeyId: accessKeyId!,
        secretAccessKey: secretAccessKey!,
      },
      forcePathStyle: false, // R2 supports virtual-hosted-style requests
    };

    this.r2Client = new S3Client(r2Config);

    this.logger.log('======================================');
    this.logger.log(`R2 Endpoint: ${r2Endpoint}`);
    this.logger.log(`Default Bucket: ${this.defaultBucket}`);
    this.logger.log(`Public URL: ${this.publicUrl}`);
    this.logger.log('======================================');
  }

  async uploadFile(
    file: Express.Multer.File,
    options: R2UploadOptions = {},
  ): Promise<R2UploadResult> {
    if (!this.r2Client) {
      throw new Error('R2 client not initialized. Please configure R2 credentials.');
    }

    console.log('R2Service.uploadFile called');
    console.log('Options:', options);

    // Use the configured bucket
    const bucketName = options?.bucket || this.defaultBucket;

    // Build the path
    let path = options?.path || '';

    console.log('Using R2 bucket:', bucketName);
    console.log('Path:', path);

    // Sanitize filename: replace spaces with underscores, remove special characters
    const sanitizedOriginalName = file.originalname
      .replace(/\s+/g, '_')  // Replace spaces with underscores
      .replace(/[^a-zA-Z0-9_.-]/g, '');  // Remove special characters except underscore, dot, hyphen
    const filename = `${uuidv4()}-${Date.now()}-${sanitizedOriginalName}`;
    const key = path ? `${path}/${filename}` : filename;

    console.log('Generated key:', key);

    const contentType =
      file.mimetype ||
      mime.lookup(file.originalname) ||
      'application/octet-stream';

    // Parse metadata if it's a string (from form-data)
    let metadata = options?.metadata || {};
    if (typeof metadata === 'string') {
      try {
        metadata = JSON.parse(metadata);
      } catch (e) {
        console.error('Failed to parse metadata:', e);
        metadata = {};
      }
    }

    const putObjectParams = {
      Bucket: bucketName,
      Key: key,
      Body: file.buffer,
      ContentType: contentType,
      CacheControl: options?.cacheControl || 'public, max-age=3600',
      Metadata: metadata,
    };

    console.log('Starting R2 upload...');

    try {
      const command = new PutObjectCommand(putObjectParams);
      const response = await this.r2Client.send(command);

      console.log('R2 upload completed');

      // Generate URL
      let url: string;
      if (options?.isPublic) {
        // Public URL for R2 with custom domain or public bucket URL
        url = `${this.publicUrl}/${key}`;
      } else {
        // Generate signed URL for private files (R2 supports up to 7 days like S3)
        const getCommand = new GetObjectCommand({
          Bucket: bucketName,
          Key: key,
        });
        url = await getSignedUrl(this.r2Client, getCommand, {
          expiresIn: 604800, // 7 days (maximum)
        });
      }

      console.log('Generated URL:', url);

      const result: R2UploadResult = {
        url,
        key,
        bucket: bucketName,
        etag: response.ETag || '',
        size: file.size,
        mimetype: contentType,
      };

      console.log('R2 upload result:', result);
      return result;
    } catch (error) {
      console.error('R2 upload failed:', error);
      throw error;
    }
  }

  async getFile(
    key: string,
    bucket?: string,
  ): Promise<{
    data: Buffer;
    contentType: string;
    metadata: any;
    etag: string;
    lastModified: Date;
  }> {
    const bucketName = bucket || this.defaultBucket;

    try {
      const command = new GetObjectCommand({
        Bucket: bucketName,
        Key: key,
      });

      const response = await this.r2Client.send(command);

      // Convert stream to buffer
      const stream = response.Body as Readable;
      const chunks: Buffer[] = [];

      for await (const chunk of stream) {
        chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
      }

      const data = Buffer.concat(chunks);

      return {
        data,
        contentType: response.ContentType || 'application/octet-stream',
        metadata: response.Metadata || {},
        etag: response.ETag || '',
        lastModified: response.LastModified || new Date(),
      };
    } catch (error) {
      this.logger.error(`Failed to get file ${key} from bucket ${bucketName}:`, error);
      throw error;
    }
  }


  async getFileStream(
    key: string,
    bucket?: string,
    range?: { start: number; end?: number }
  ): Promise<{
    stream: Readable;
    contentType: string;
    contentLength?: number;
    acceptRanges?: string;
    contentRange?: string;
  }> {
    const bucketName = bucket || this.defaultBucket;

    try {
      const command = new GetObjectCommand({
        Bucket: bucketName,
        Key: key,
        Range: range ? `bytes=${range.start}-${range.end || ''}` : undefined,
      });

      const response = await this.r2Client.send(command);
      
      return {
        stream: response.Body as Readable,
        contentType: response.ContentType || 'application/octet-stream',
        contentLength: response.ContentLength,
        acceptRanges: response.AcceptRanges,
        contentRange: response.ContentRange,
      };
    } catch (error) {
      this.logger.error(`Failed to stream file ${key} from bucket ${bucketName}:`, error);
      throw error;
    }
  }


  async deleteFile(key: string, bucket?: string): Promise<void> {
    const bucketName = bucket || this.defaultBucket;

    try {
      const command = new DeleteObjectCommand({
        Bucket: bucketName,
        Key: key,
      });

      await this.r2Client.send(command);
      this.logger.log(`Deleted file: ${key} from bucket: ${bucketName}`);
    } catch (error) {
      this.logger.error(`Failed to delete file ${key}:`, error);
      throw error;
    }
  }

  async listFiles(
    bucket?: string,
    prefix?: string,
    maxResults?: number,
  ): Promise<{
    files: Array<{
      key: string;
      size: number;
      lastModified: Date;
      etag: string;
      url: string;
    }>;
    isTruncated: boolean;
  }> {
    const bucketName = bucket || this.defaultBucket;

    try {
      const command = new ListObjectsV2Command({
        Bucket: bucketName,
        Prefix: prefix,
        MaxKeys: maxResults,
      });

      const response = await this.r2Client.send(command);

      const files = (response.Contents || []).map((file) => ({
        key: file.Key || '',
        size: file.Size || 0,
        lastModified: file.LastModified || new Date(),
        etag: file.ETag || '',
        url: `${this.publicUrl}/${file.Key}`,
      }));

      return {
        files,
        isTruncated: response.IsTruncated || false,
      };
    } catch (error) {
      this.logger.error(`Failed to list files:`, error);
      throw error;
    }
  }

  async copyFile(
    sourceKey: string,
    destKey: string,
    options?: {
      sourceBucket?: string;
      destBucket?: string;
    },
  ): Promise<{ key: string; bucket: string; etag: string; url: string }> {
    const sourceBucket = options?.sourceBucket || this.defaultBucket;
    const destBucket = options?.destBucket || this.defaultBucket;

    try {
      const command = new CopyObjectCommand({
        Bucket: destBucket,
        CopySource: `${sourceBucket}/${sourceKey}`,
        Key: destKey,
      });

      const response = await this.r2Client.send(command);

      return {
        key: destKey,
        bucket: destBucket,
        etag: response.CopyObjectResult?.ETag || '',
        url: `${this.publicUrl}/${destKey}`,
      };
    } catch (error) {
      this.logger.error(`Failed to copy file:`, error);
      throw error;
    }
  }

  async getSignedUrl(
    action: 'read' | 'write' | 'delete',
    options: {
      key: string;
      bucket?: string;
      expires?: number;
      contentType?: string;
    },
  ): Promise<string> {
    const bucketName = options.bucket || this.defaultBucket;
    const expiresIn = options.expires
      ? Math.floor((options.expires - Date.now()) / 1000)
      : 3600; // 1 hour default

    try {
      let command;

      switch (action) {
        case 'read':
          command = new GetObjectCommand({
            Bucket: bucketName,
            Key: options.key,
          });
          break;
        case 'write':
          command = new PutObjectCommand({
            Bucket: bucketName,
            Key: options.key,
            ContentType: options.contentType,
          });
          break;
        case 'delete':
          command = new DeleteObjectCommand({
            Bucket: bucketName,
            Key: options.key,
          });
          break;
      }

      const url = await getSignedUrl(this.r2Client, command, {
        expiresIn,
      });

      return url;
    } catch (error) {
      this.logger.error(`Failed to generate signed URL:`, error);
      throw error;
    }
  }

  async getClusterStatus() {
    try {
      // Don't make R2 API calls for health check - just return config status
      // This avoids unnecessary Class B operations
      return {
        healthy: true,
        buckets: [this.defaultBucket],
        accountId: this.accountId,
        defaultBucket: this.defaultBucket,
        publicUrl: this.publicUrl,
      };
    } catch (error: any) {
      this.logger.error('R2 health check failed:', error);
      return {
        healthy: false,
        error: error.message,
      };
    }
  }

  // Helper method to create folders (R2 doesn't have real folders, but we can create placeholder objects)
  async createFolder(path: string, bucket?: string): Promise<void> {
    const bucketName = bucket || this.defaultBucket;
    const folderKey = path.endsWith('/') ? path : `${path}/`;

    try {
      const command = new PutObjectCommand({
        Bucket: bucketName,
        Key: folderKey,
        Body: '',
        ContentType: 'application/x-directory',
      });

      await this.r2Client.send(command);
      this.logger.log(`Created folder: ${folderKey} in bucket: ${bucketName}`);
    } catch (error) {
      this.logger.error(`Failed to create folder ${path}:`, error);
      throw error;
    }
  }

  // Helper method to delete folders (deletes all objects with the prefix)
  async deleteFolder(path: string, bucket?: string): Promise<void> {
    const bucketName = bucket || this.defaultBucket;
    const prefix = path.endsWith('/') ? path : `${path}/`;

    try {
      // List all objects with the prefix
      const listCommand = new ListObjectsV2Command({
        Bucket: bucketName,
        Prefix: prefix,
      });

      const response = await this.r2Client.send(listCommand);

      if (response.Contents && response.Contents.length > 0) {
        // Delete all objects
        for (const object of response.Contents) {
          if (object.Key) {
            await this.deleteFile(object.Key, bucketName);
          }
        }
      }

      this.logger.log(`Deleted folder: ${prefix} from bucket: ${bucketName}`);
    } catch (error) {
      this.logger.error(`Failed to delete folder ${path}:`, error);
      throw error;
    }
  }
}