import { Request } from 'express';
import { Injectable } from '@nestjs/common';
import { BaseConnector } from '../../base/base.connector';
import { IStorageConnector } from '../../base/connector.interface';
import {
  ConnectorMetadata,
  ConnectorType,
  ConnectorCategory,
  ConnectorRequest,
  ConnectorResponse,
  AuthType,
  PaginatedRequest,
  ConnectorAction,
  ConnectorTrigger
} from '../../types';
import { AuthUtils } from '../../utils/auth.utils';
import { ApiUtils } from '../../utils/api.utils';
import * as AWS from 'aws-sdk';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { S3Client, GetObjectCommand, PutObjectCommand } from '@aws-sdk/client-s3';
import { Readable } from 'stream';

interface S3FileMetadata {
  key: string;
  size: number;
  lastModified: Date;
  etag: string;
  contentType?: string;
  metadata?: Record<string, string>;
}

interface S3BucketInfo {
  name: string;
  creationDate: Date;
  region?: string;
}

interface MultipartUploadInfo {
  uploadId: string;
  bucket: string;
  key: string;
  partSize: number;
  parts: Array<{ partNumber: number; etag: string }>;
}

@Injectable()
export class AWSS3Connector extends BaseConnector implements IStorageConnector {
  private s3: AWS.S3;
  private s3Client: S3Client;
  private defaultBucket: string;

  constructor(
    private readonly authUtils: AuthUtils,
    private readonly apiUtils: ApiUtils
  ) {
    super();
  }

  getMetadata(): ConnectorMetadata {
    return {
      name: 'AWS S3',
      description: 'Amazon S3 cloud storage and object management',
      version: '1.0.0',
      category: ConnectorCategory.STORAGE,
      type: ConnectorType.AWS_S3,
      logoUrl: 'https://a0.awsstatic.com/libra-css/images/logos/aws_logo_smile_1200x630.png',
      documentationUrl: 'https://docs.aws.amazon.com/s3/',
      authType: AuthType.API_KEY,
      actions: this.getActions(),
      triggers: this.getTriggers(),
      rateLimit: {
        requestsPerSecond: 100,
        requestsPerMinute: 6000,
        requestsPerDay: 8640000
      },
      webhookSupport: true
    };
  }

  protected async initializeConnection(): Promise<void> {
    const credentials = this.config.credentials;
    
    // Configure AWS SDK v2 for main operations
    AWS.config.update({
      accessKeyId: credentials.accessKeyId,
      secretAccessKey: credentials.secretAccessKey,
      region: credentials.region || 'us-east-1'
    });

    this.s3 = new AWS.S3({
      apiVersion: '2006-03-01',
      signatureVersion: 'v4'
    });

    // Configure AWS SDK v3 for presigned URLs
    this.s3Client = new S3Client({
      region: credentials.region || 'us-east-1',
      credentials: {
        accessKeyId: credentials.accessKeyId,
        secretAccessKey: credentials.secretAccessKey
      }
    });

    this.defaultBucket = credentials.defaultBucket || 'default-bucket';

    // Test connection by listing buckets
    try {
      await this.s3.listBuckets().promise();
      this.logger.log('AWS S3 connector initialized successfully');
    } catch (error) {
      throw new Error(`AWS S3 connection failed: ${error.message}`);
    }
  }

  protected async performConnectionTest(): Promise<boolean> {
    try {
      await this.s3.listBuckets().promise();
      return true;
    } catch (error) {
      return false;
    }
  }

  protected async performHealthCheck(): Promise<void> {
    try {
      const response = await this.s3.listBuckets().promise();
      if (!response.Buckets) {
        throw new Error('AWS S3 health check failed: Unable to list buckets');
      }
    } catch (error) {
      throw new Error(`AWS S3 health check failed: ${error.message}`);
    }
  }

  protected async performRequest(request: ConnectorRequest): Promise<any> {
    // AWS SDK handles requests internally, this method is for custom requests
    const response = await this.apiUtils.executeRequest(request, {
      timeout: 30000,
      retries: 3
    });

    if (!response.success) {
      throw new Error(response.error?.message || 'Request failed');
    }

    return response.data;
  }

  protected async performAction(actionId: string, input: any): Promise<any> {
    switch (actionId) {
      case 'upload_file':
        return this.uploadFile(input.filePath, input.content, input.metadata);
      case 'download_file':
        return this.downloadFile(input.filePath);
      case 'delete_file':
        return this.deleteFile(input.filePath, input.bucket);
      case 'list_objects':
        return this.listObjects(input.bucket, input.prefix, input.options);
      case 'create_bucket':
        return this.createBucket(input.bucketName, input.region);
      case 'get_presigned_url':
        return this.getPresignedUrl(input.bucket, input.key, input.operation, input.expiresIn);
      case 'copy_object':
        return this.copyObject(input.sourceBucket, input.sourceKey, input.destBucket, input.destKey);
      case 'multipart_upload':
        return this.initiateMultipartUpload(input.bucket, input.key, input.metadata);
      case 'create_folder':
        return this.createFolder(input.folderPath, input.bucket);
      case 'delete_folder':
        return this.deleteFolder(input.folderPath, input.bucket);
      case 'list_folders':
        return this.listFolders(input.bucket, input.prefix);
      case 'list_buckets':
        return this.listBuckets();
      default:
        throw new Error(`Unknown action: ${actionId}`);
    }
  }

  protected async cleanup(): Promise<void> {
    this.logger.log('AWS S3 connector cleanup completed');
  }

  // Core S3 methods
  async uploadFile(filePath: string, content: Buffer | string, metadata?: any): Promise<ConnectorResponse> {
    try {
      const bucket = metadata?.bucket || this.defaultBucket;
      const key = this.normalizeKey(filePath);
      
      const uploadParams: AWS.S3.PutObjectRequest = {
        Bucket: bucket,
        Key: key,
        Body: content,
        ContentType: metadata?.contentType || this.getContentType(key),
        Metadata: metadata?.userMetadata || {},
        ACL: metadata?.acl || 'private',
        ServerSideEncryption: metadata?.encryption || 'AES256',
        StorageClass: metadata?.storageClass || 'STANDARD'
      };

      // Add additional parameters if provided
      if (metadata?.cacheControl) uploadParams.CacheControl = metadata.cacheControl;
      if (metadata?.contentEncoding) uploadParams.ContentEncoding = metadata.contentEncoding;
      if (metadata?.contentLanguage) uploadParams.ContentLanguage = metadata.contentLanguage;
      if (metadata?.expires) uploadParams.Expires = new Date(metadata.expires);

      const response = await this.s3.upload(uploadParams).promise();

      return {
        success: true,
        data: {
          bucket: response.Bucket,
          key: response.Key,
          etag: response.ETag,
          location: response.Location,
          versionId: (response as any).VersionId
        },
        metadata: {
          timestamp: new Date()
        }
      };
    } catch (error) {
      return this.handleError(error as any, 'Failed to upload file');
    }
  }

  async downloadFile(filePath: string, bucket?: string): Promise<ConnectorResponse<Buffer>> {
    try {
      const bucketName = bucket || this.defaultBucket;
      const key = this.normalizeKey(filePath);

      const params = {
        Bucket: bucketName,
        Key: key
      };

      const response = await this.s3.getObject(params).promise();
      const body = response.Body as Buffer;

      return {
        success: true,
        data: body,
        metadata: {
          timestamp: new Date()
        } as any
      };
    } catch (error) {
      return this.handleError(error as any, 'Failed to download file');
    }
  }

  async deleteFile(filePath: string, bucket?: string): Promise<ConnectorResponse> {
    try {
      const bucketName = bucket || this.defaultBucket;
      const key = this.normalizeKey(filePath);

      const params = {
        Bucket: bucketName,
        Key: key
      };

      const response = await this.s3.deleteObject(params).promise();

      return {
        success: true,
        data: {
          deleted: true,
          bucket: bucketName,
          key: key,
          versionId: (response as any).VersionId,
          deleteMarker: response.DeleteMarker
        }
      };
    } catch (error) {
      return this.handleError(error as any, 'Failed to delete file');
    }
  }

  async listObjects(bucket?: string, prefix?: string, options?: PaginatedRequest): Promise<ConnectorResponse> {
    try {
      const bucketName = bucket || this.defaultBucket;
      
      const params: AWS.S3.ListObjectsV2Request = {
        Bucket: bucketName,
        Prefix: prefix || '',
        MaxKeys: options?.pageSize || 1000,
        ContinuationToken: options?.filters?.continuationToken as string,
        Delimiter: options?.filters?.delimiter || undefined
      };

      const response = await this.s3.listObjectsV2(params).promise();

      const objects: S3FileMetadata[] = (response.Contents || []).map(obj => ({
        key: obj.Key!,
        size: obj.Size!,
        lastModified: obj.LastModified!,
        etag: obj.ETag!,
        contentType: undefined, // Not provided in list response
        metadata: undefined // Not provided in list response
      }));

      return {
        success: true,
        data: {
          objects,
          commonPrefixes: response.CommonPrefixes || [],
          totalCount: response.KeyCount,
          isTruncated: response.IsTruncated,
          nextContinuationToken: response.NextContinuationToken,
          pagination: {
            total: 0,
            hasNext: response.IsTruncated || false
          }
        },
        metadata: {
          timestamp: new Date()
        }
      };
    } catch (error) {
      return this.handleError(error as any, 'Failed to list objects');
    }
  }

  async createBucket(bucketName: string, region?: string): Promise<ConnectorResponse> {
    try {
      const params: AWS.S3.CreateBucketRequest = {
        Bucket: bucketName,
        ACL: 'private'
      };

      // Only set CreateBucketConfiguration for regions other than us-east-1
      if (region && region !== 'us-east-1') {
        params.CreateBucketConfiguration = {
          LocationConstraint: region
        };
      }

      const response = await this.s3.createBucket(params).promise();

      return {
        success: true,
        data: {
          bucket: bucketName,
          location: response.Location,
          region: region || 'us-east-1'
        },
        metadata: {
          timestamp: new Date()
        }
      };
    } catch (error) {
      return this.handleError(error as any, 'Failed to create bucket');
    }
  }

  async getPresignedUrl(bucket: string, key: string, operation: 'getObject' | 'putObject' = 'getObject', expiresIn: number = 3600): Promise<ConnectorResponse<string>> {
    try {
      let command;
      
      if (operation === 'getObject') {
        command = new GetObjectCommand({ Bucket: bucket, Key: key });
      } else if (operation === 'putObject') {
        command = new PutObjectCommand({ Bucket: bucket, Key: key });
      } else {
        throw new Error(`Unsupported operation: ${operation}`);
      }

      const url = await getSignedUrl(this.s3Client, command, { expiresIn });

      return {
        success: true,
        data: url,
        metadata: {
          timestamp: new Date()
        } as any
      };
    } catch (error) {
      return this.handleError(error as any, 'Failed to generate presigned URL');
    }
  }

  async copyObject(sourceBucket: string, sourceKey: string, destBucket: string, destKey: string, metadata?: any): Promise<ConnectorResponse> {
    try {
      const params: AWS.S3.CopyObjectRequest = {
        Bucket: destBucket,
        Key: destKey,
        CopySource: `${sourceBucket}/${sourceKey}`,
        ACL: metadata?.acl || 'private',
        ServerSideEncryption: metadata?.encryption || 'AES256',
        StorageClass: metadata?.storageClass || 'STANDARD'
      };

      if (metadata?.userMetadata) {
        params.Metadata = metadata.userMetadata;
        params.MetadataDirective = 'REPLACE';
      }

      const response = await this.s3.copyObject(params).promise();

      return {
        success: true,
        data: {
          sourceBucket,
          sourceKey,
          destBucket,
          destKey,
          etag: response.CopyObjectResult?.ETag,
          lastModified: response.CopyObjectResult?.LastModified,
          versionId: (response as any).VersionId
        },
        metadata: {
          timestamp: new Date()
        }
      };
    } catch (error) {
      return this.handleError(error as any, 'Failed to copy object');
    }
  }

  async initiateMultipartUpload(bucket: string, key: string, metadata?: any): Promise<ConnectorResponse> {
    try {
      const params: AWS.S3.CreateMultipartUploadRequest = {
        Bucket: bucket,
        Key: key,
        ContentType: metadata?.contentType || this.getContentType(key),
        Metadata: metadata?.userMetadata || {},
        ACL: metadata?.acl || 'private',
        ServerSideEncryption: metadata?.encryption || 'AES256',
        StorageClass: metadata?.storageClass || 'STANDARD'
      };

      const response = await this.s3.createMultipartUpload(params).promise();

      return {
        success: true,
        data: {
          uploadId: response.UploadId,
          bucket: response.Bucket,
          key: response.Key,
          serverSideEncryption: response.ServerSideEncryption
        },
        metadata: {
          timestamp: new Date()
        }
      };
    } catch (error) {
      return this.handleError(error as any, 'Failed to initiate multipart upload');
    }
  }

  async uploadPart(bucket: string, key: string, uploadId: string, partNumber: number, body: Buffer): Promise<ConnectorResponse> {
    try {
      const params: AWS.S3.UploadPartRequest = {
        Bucket: bucket,
        Key: key,
        UploadId: uploadId,
        PartNumber: partNumber,
        Body: body
      };

      const response = await this.s3.uploadPart(params).promise();

      return {
        success: true,
        data: {
          etag: response.ETag,
          partNumber,
          serverSideEncryption: response.ServerSideEncryption
        },
        metadata: {
          timestamp: new Date()
        }
      };
    } catch (error) {
      return this.handleError(error as any, 'Failed to upload part');
    }
  }

  async completeMultipartUpload(bucket: string, key: string, uploadId: string, parts: Array<{ partNumber: number; etag: string }>): Promise<ConnectorResponse> {
    try {
      const params: AWS.S3.CompleteMultipartUploadRequest = {
        Bucket: bucket,
        Key: key,
        UploadId: uploadId,
        MultipartUpload: {
          Parts: parts.map(part => ({
            ETag: part.etag,
            PartNumber: part.partNumber
          }))
        }
      };

      const response = await this.s3.completeMultipartUpload(params).promise();

      return {
        success: true,
        data: {
          bucket: response.Bucket,
          key: response.Key,
          etag: response.ETag,
          location: response.Location,
          versionId: (response as any).VersionId
        },
        metadata: {
          timestamp: new Date()
        }
      };
    } catch (error) {
      return this.handleError(error as any, 'Failed to complete multipart upload');
    }
  }

  // IStorageConnector implementation
  async listFiles(directoryPath?: string, options?: PaginatedRequest): Promise<ConnectorResponse> {
    return this.listObjects(undefined, directoryPath, options);
  }

  async createDirectory(directoryPath: string): Promise<ConnectorResponse> {
    try {
      // S3 doesn't have real directories, but we can create a placeholder object
      const key = this.normalizeKey(directoryPath);
      const folderKey = key.endsWith('/') ? key : `${key}/`;
      
      const params = {
        Bucket: this.defaultBucket,
        Key: folderKey,
        Body: '',
        ContentType: 'application/x-directory'
      };

      await this.s3.upload(params).promise();

      return {
        success: true,
        data: {
          bucket: this.defaultBucket,
          key: folderKey,
          path: directoryPath
        },
        metadata: {
          timestamp: new Date()
        }
      };
    } catch (error) {
      return this.handleError(error as any, 'Failed to create directory');
    }
  }

  async getFileMetadata(filePath: string, bucket?: string): Promise<ConnectorResponse> {
    try {
      const bucketName = bucket || this.defaultBucket;
      const key = this.normalizeKey(filePath);

      const params = {
        Bucket: bucketName,
        Key: key
      };

      const response = await this.s3.headObject(params).promise();

      return {
        success: true,
        data: {
          bucket: bucketName,
          key: key,
          contentType: response.ContentType,
          contentLength: response.ContentLength,
          lastModified: response.LastModified,
          etag: response.ETag,
          versionId: (response as any).VersionId,
          serverSideEncryption: response.ServerSideEncryption,
          storageClass: response.StorageClass,
          metadata: response.Metadata
        },
        metadata: {
          timestamp: new Date()
        }
      };
    } catch (error) {
      return this.handleError(error as any, 'Failed to get file metadata');
    }
  }

  async shareFile(filePath: string, permissions?: any): Promise<ConnectorResponse<string>> {
    try {
      const bucket = permissions?.bucket || this.defaultBucket;
      const key = this.normalizeKey(filePath);
      const expiresIn = permissions?.expiresIn || 3600; // 1 hour default

      return this.getPresignedUrl(bucket, key, 'getObject', expiresIn);
    } catch (error) {
      return this.handleError(error as any, 'Failed to share file');
    }
  }

  async createFolder(folderPath: string, bucket?: string): Promise<ConnectorResponse> {
    try {
      const bucketName = bucket || this.defaultBucket;
      const key = this.normalizeKey(folderPath);
      const folderKey = key.endsWith('/') ? key : `${key}/`;

      const params = {
        Bucket: bucketName,
        Key: folderKey,
        Body: '',
        ContentType: 'application/x-directory'
      };

      await this.s3.upload(params).promise();

      return {
        success: true,
        data: {
          bucket: bucketName,
          key: folderKey,
          path: folderPath
        },
        metadata: {
          timestamp: new Date()
        }
      };
    } catch (error) {
      return this.handleError(error as any, 'Failed to create folder');
    }
  }

  async deleteFolder(folderPath: string, bucket?: string): Promise<ConnectorResponse> {
    try {
      const bucketName = bucket || this.defaultBucket;
      const key = this.normalizeKey(folderPath);
      const prefix = key.endsWith('/') ? key : `${key}/`;

      // First, list all objects with the prefix
      let continuationToken: string | undefined;
      let totalDeleted = 0;

      do {
        const listParams: AWS.S3.ListObjectsV2Request = {
          Bucket: bucketName,
          Prefix: prefix,
          ContinuationToken: continuationToken
        };

        const listResponse = await this.s3.listObjectsV2(listParams).promise();
        const objects = listResponse.Contents || [];

        if (objects.length > 0) {
          // Delete all objects
          const deleteParams: AWS.S3.DeleteObjectsRequest = {
            Bucket: bucketName,
            Delete: {
              Objects: objects.map(obj => ({ Key: obj.Key! })),
              Quiet: true
            }
          };

          await this.s3.deleteObjects(deleteParams).promise();
          totalDeleted += objects.length;
        }

        continuationToken = listResponse.NextContinuationToken;
      } while (continuationToken);

      return {
        success: true,
        data: {
          deleted: true,
          deletedCount: totalDeleted,
          bucket: bucketName,
          prefix: prefix
        },
        metadata: {
          timestamp: new Date()
        }
      };
    } catch (error) {
      return this.handleError(error as any, 'Failed to delete folder');
    }
  }

  async listFolders(bucket?: string, prefix?: string): Promise<ConnectorResponse> {
    try {
      const bucketName = bucket || this.defaultBucket;
      const normalizedPrefix = prefix ? this.normalizeKey(prefix) : '';
      const prefixWithSlash = normalizedPrefix && !normalizedPrefix.endsWith('/') ? `${normalizedPrefix}/` : normalizedPrefix;

      const params: AWS.S3.ListObjectsV2Request = {
        Bucket: bucketName,
        Prefix: prefixWithSlash,
        Delimiter: '/'
      };

      const response = await this.s3.listObjectsV2(params).promise();

      const folders = (response.CommonPrefixes || []).map(cp => ({
        prefix: cp.Prefix,
        name: cp.Prefix?.replace(prefixWithSlash, '').replace(/\/$/, '')
      }));

      return {
        success: true,
        data: {
          folders,
          bucket: bucketName,
          parentPrefix: prefixWithSlash
        },
        metadata: {
          timestamp: new Date()
        }
      };
    } catch (error) {
      return this.handleError(error as any, 'Failed to list folders');
    }
  }

  async listBuckets(): Promise<ConnectorResponse> {
    try {
      const response = await this.s3.listBuckets().promise();

      const buckets = (response.Buckets || []).map(bucket => ({
        name: bucket.Name,
        creationDate: bucket.CreationDate
      }));

      return {
        success: true,
        data: {
          buckets,
          owner: response.Owner ? {
            displayName: response.Owner.DisplayName,
            id: response.Owner.ID
          } : undefined
        },
        metadata: {
          timestamp: new Date()
        }
      };
    } catch (error) {
      return this.handleError(error as any, 'Failed to list buckets');
    }
  }

  // Helper methods
  private normalizeKey(filePath: string): string {
    // Remove leading slash and normalize path
    return filePath.replace(/^\/+/, '').replace(/\/+/g, '/');
  }

  private getContentType(key: string): string {
    const extension = key.split('.').pop()?.toLowerCase();
    const mimeTypes: Record<string, string> = {
      'jpg': 'image/jpeg',
      'jpeg': 'image/jpeg',
      'png': 'image/png',
      'gif': 'image/gif',
      'pdf': 'application/pdf',
      'txt': 'text/plain',
      'html': 'text/html',
      'css': 'text/css',
      'js': 'application/javascript',
      'json': 'application/json',
      'xml': 'application/xml',
      'zip': 'application/zip',
      'mp4': 'video/mp4',
      'mp3': 'audio/mpeg'
    };
    
    return mimeTypes[extension || ''] || 'application/octet-stream';
  }

  private getActions(): ConnectorAction[] {
    return [
      {
        id: 'upload_file',
        name: 'Upload File',
        description: 'Upload a file to S3',
        inputSchema: {
          filePath: { type: 'string', required: true, description: 'S3 object key' },
          content: { type: 'string', required: true, description: 'File content as buffer or string' },
          metadata: { type: 'object', description: 'File metadata including bucket, contentType, ACL' }
        },
        outputSchema: {
          bucket: { type: 'string', description: 'S3 bucket name' },
          key: { type: 'string', description: 'S3 object key' },
          etag: { type: 'string', description: 'File ETag' },
          location: { type: 'string', description: 'S3 object URL' }
        }
      },
      {
        id: 'download_file',
        name: 'Download File',
        description: 'Download a file from S3',
        inputSchema: {
          filePath: { type: 'string', required: true, description: 'S3 object key' },
          bucket: { type: 'string', description: 'S3 bucket name (optional)' }
        },
        outputSchema: {
          content: { type: 'string', description: 'File content as buffer' }
        }
      },
      {
        id: 'list_objects',
        name: 'List Objects',
        description: 'List objects in an S3 bucket',
        inputSchema: {
          bucket: { type: 'string', description: 'S3 bucket name (optional)' },
          prefix: { type: 'string', description: 'Object key prefix filter' },
          options: { type: 'object', description: 'Pagination and filtering options' }
        },
        outputSchema: {
          objects: { type: 'array', description: 'List of S3 objects' }
        }
      },
      {
        id: 'create_bucket',
        name: 'Create Bucket',
        description: 'Create a new S3 bucket',
        inputSchema: {
          bucketName: { type: 'string', required: true, description: 'S3 bucket name' },
          region: { type: 'string', description: 'AWS region' }
        },
        outputSchema: {
          bucket: { type: 'string', description: 'Created bucket name' },
          location: { type: 'string', description: 'Bucket location' }
        }
      },
      {
        id: 'get_presigned_url',
        name: 'Get Presigned URL',
        description: 'Generate a presigned URL for temporary access',
        inputSchema: {
          bucket: { type: 'string', required: true, description: 'S3 bucket name' },
          key: { type: 'string', required: true, description: 'S3 object key' },
          operation: { type: 'string', description: 'Operation: getObject or putObject' },
          expiresIn: { type: 'number', description: 'URL expiration time in seconds' }
        },
        outputSchema: {
          url: { type: 'string', description: 'Presigned URL' }
        }
      },
      {
        id: 'copy_object',
        name: 'Copy Object',
        description: 'Copy an object within or between S3 buckets',
        inputSchema: {
          sourceBucket: { type: 'string', required: true, description: 'Source bucket name' },
          sourceKey: { type: 'string', required: true, description: 'Source object key' },
          destBucket: { type: 'string', required: true, description: 'Destination bucket name' },
          destKey: { type: 'string', required: true, description: 'Destination object key' }
        },
        outputSchema: {
          etag: { type: 'string', description: 'Copied object ETag' }
        }
      }
    ];
  }

  private getTriggers(): ConnectorTrigger[] {
    return [
      {
        id: 'object_created',
        name: 'Object Created',
        description: 'Triggered when an object is created in S3',
        eventType: 'webhook',
        outputSchema: {
          bucket: { type: 'string', description: 'S3 bucket name' },
          key: { type: 'string', description: 'S3 object key' },
          eventName: { type: 'string', description: 'S3 event name' }
        },
        webhookRequired: true
      },
      {
        id: 'object_removed',
        name: 'Object Removed',
        description: 'Triggered when an object is deleted from S3',
        eventType: 'webhook',
        outputSchema: {
          bucket: { type: 'string', description: 'S3 bucket name' },
          key: { type: 'string', description: 'S3 object key' },
          eventName: { type: 'string', description: 'S3 event name' }
        },
        webhookRequired: true
      }
    ];
  }
}