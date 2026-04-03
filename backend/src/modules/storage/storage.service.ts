import { Injectable, Logger, NotFoundException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
// import { GCSService } from './gcs.service'; // Disabled - using S3
// import { S3Service } from "./s3.service"; // Disabled - using R2
import { R2Service } from "./r2.service";
import { StorageImageProcessingService } from "./image-processing.service";
import { Readable } from "stream";
import * as path from "path";
import { v4 as uuidv4 } from "uuid";
import { PlatformService } from "../database/platform.service";

export interface StorageFile {
  id: string;
  projectId: string;
  key: string;
  bucket: string;
  filename: string;
  size: number;
  contentType: string;
  url?: string;
  metadata?: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
}

export interface ProcessingOptions {
  resize?: {
    width: number;
    height: number;
    fit?: "contain" | "cover" | "fill" | "inside" | "outside";
  };
  optimize?: boolean;
  format?: "jpeg" | "png" | "webp" | "avif";
  quality?: number;
  thumbnail?: boolean;
  watermark?: { text?: string; image?: string; position?: string };
}

export interface UploadOptions {
  bucket?: string;
  contentType?: string;
  metadata?: Record<string, any>;
  isPublic?: boolean;
}

@Injectable()
export class StorageService {
  private readonly logger = new Logger(StorageService.name);
  private readonly defaultBucket: string;

  constructor(
    private storageService: R2Service, // Changed from S3Service to R2Service
    private imageProcessing: StorageImageProcessingService,
    private readonly platformService: PlatformService,
    private readonly configService: ConfigService
  ) {
    this.defaultBucket = this.configService.get<string>('CLOUDFLARE_R2_BUCKET_NAME') || 'fluxturn-uploads';
  }

  async uploadFile(
    organizationId: string,
    projectId: string,
    appId: string,
    file: Express.Multer.File | Buffer,
    options: UploadOptions & { process?: ProcessingOptions } = {}
  ): Promise<StorageFile> {
    console.log("StorageService.uploadFile called");
    console.log("Options:", options);
    try {
      let buffer: Buffer;
      let filename: string;
      let contentType: string;

      if (Buffer.isBuffer(file)) {
        buffer = file;
        filename = options.metadata?.filename || `file-${Date.now()}`;
        contentType = options.contentType || "application/octet-stream";
      } else {
        // Handle both memory and disk storage
        console.log(
          "File type check - has buffer:",
          !!file.buffer,
          "has path:",
          !!file.path
        );
        if (file.buffer) {
          // Memory storage
          buffer = file.buffer;
        } else if (file.path) {
          // Disk storage - read file from path
          console.log("Reading file from disk:", file.path);
          const fs = await import("fs");
          buffer = await fs.promises.readFile(file.path);
          console.log("File read successfully, buffer size:", buffer.length);
        } else {
          throw new Error("No file data available");
        }
        filename = file.originalname;
        contentType = file.mimetype;
      }

      // Process image if needed
      if (options.process && this.isImage(contentType)) {
        buffer = await this.imageProcessing.process(buffer, options.process);

        // Update content type if format changed
        if (options.process.format) {
          contentType = `image/${options.process.format}`;
          filename = this.changeFileExtension(filename, options.process.format);
        }
      }

      // Upload to R2
      // Parse metadata if it's a string (from HTTP body)
      let parsedMetadata = options.metadata;
      if (typeof parsedMetadata === "string") {
        try {
          parsedMetadata = JSON.parse(parsedMetadata);
        } catch (e) {
          console.error("Failed to parse metadata in storage service:", e);
          parsedMetadata = {};
        }
      }

      const contextId = appId || projectId;

      // For user avatars and organization-level files, use organization path
      const storagePath = contextId
        ? `projects/${contextId}`
        : `organizations/${organizationId}`;

      if (!contextId && !organizationId) {
        throw new Error("No organization, project, or app context provided");
      }

      const gcsOptions: any = {
        path: storagePath,
        isPublic: options.isPublic !== false, // Default to public (true), unless explicitly set to false
        metadata: {
          ...(contextId && { projectId: contextId }),
          ...(organizationId && { organizationId }),
          ...(parsedMetadata || {}),
        },
      };

      // Only set bucket if explicitly provided in options (virtual bucket)
      if (options.bucket) {
        gcsOptions.bucket = options.bucket;
      }

      console.log("Uploading to R2 with options:", gcsOptions);
      const uploadResult = await this.storageService.uploadFile(
        {
          buffer,
          originalname: filename,
          mimetype: contentType,
          size: buffer.length,
        } as Express.Multer.File,
        gcsOptions
      );
      console.log("R2 upload result:", uploadResult);

      const storageObject = {
        key: uploadResult.key,
        bucket: uploadResult.bucket,
        size: uploadResult.size,
        contentType: uploadResult.mimetype,
        etag: uploadResult.etag,
        url: uploadResult.url,
      };

      // Save to database
      const storage_files = await this.saveFileRecord(
        organizationId,
        contextId,
        storageObject,
        filename,
        appId
      );

      // Generate thumbnail if requested
      if (options.process?.thumbnail && this.isImage(contentType)) {
        await this.generateThumbnail(organizationId, contextId, storage_files);
      }

      return storage_files;
    } catch (error) {
      this.logger.error("Failed to upload file:", error);
      throw error;
    }
  }

  /**
   * Upload file for platform-level resources (user avatars, etc.)
   * Does not require org/project/app context and does not save to database
   */
  async uploadFileForPlatform(
    file: Express.Multer.File | Buffer,
    folder: string, // e.g., 'avatars', 'platform-assets'
    options: UploadOptions & { process?: ProcessingOptions } = {}
  ): Promise<{ url: string; key: string; size: number }> {
    console.log("StorageService.uploadFileForPlatform called");
    console.log("Folder:", folder);
    console.log("Options:", options);

    try {
      let buffer: Buffer;
      let filename: string;
      let contentType: string;

      if (Buffer.isBuffer(file)) {
        buffer = file;
        filename = options.metadata?.filename || `file-${Date.now()}`;
        contentType = options.contentType || "application/octet-stream";
      } else {
        // Handle both memory and disk storage
        if (file.buffer) {
          buffer = file.buffer;
        } else if (file.path) {
          const fs = await import("fs");
          buffer = await fs.promises.readFile(file.path);
        } else {
          throw new Error("No file data available");
        }
        filename = file.originalname;
        contentType = file.mimetype;
      }

      // Process image if needed
      if (options.process && this.isImage(contentType)) {
        buffer = await this.imageProcessing.process(buffer, options.process);
        if (options.process.format) {
          contentType = `image/${options.process.format}`;
          filename = this.changeFileExtension(filename, options.process.format);
        }
      }

      // Parse metadata if it's a string
      let parsedMetadata = options.metadata;
      if (typeof parsedMetadata === "string") {
        try {
          parsedMetadata = JSON.parse(parsedMetadata);
        } catch (e) {
          console.error("Failed to parse metadata:", e);
          parsedMetadata = {};
        }
      }

      const gcsOptions: any = {
        path: `platform/${folder}`, // Platform-level path
        isPublic: options.isPublic !== undefined ? options.isPublic : true, // Default to public for avatars
        metadata: parsedMetadata || {},
      };

      if (options.bucket) {
        gcsOptions.bucket = options.bucket;
      }

      console.log("Uploading to R2 with options:", gcsOptions);
      const uploadResult = await this.storageService.uploadFile(
        {
          buffer,
          originalname: filename,
          mimetype: contentType,
          size: buffer.length,
        } as Express.Multer.File,
        gcsOptions
      );
      console.log("R2 upload result:", uploadResult);

      return {
        url: uploadResult.url,
        key: uploadResult.key,
        size: uploadResult.size,
      };
    } catch (error) {
      this.logger.error("Failed to upload platform file:", error);
      throw error;
    }
  }

  async uploadStream(
    organizationId: string,
    projectId: string,
    appId: string,
    stream: Readable,
    filename: string,
    options: UploadOptions = {}
  ): Promise<StorageFile> {
    try {
      const contextId = appId || projectId;
      if (!contextId && !organizationId) {
        throw new Error("No organization, project, or app context provided");
      }

      // Convert stream to buffer for R2
      const chunks: Buffer[] = [];
      for await (const chunk of stream) {
        chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
      }
      const buffer = Buffer.concat(chunks);

      const uploadResult = await this.storageService.uploadFile(
        {
          buffer,
          originalname: filename,
          mimetype: options.contentType || "application/octet-stream",
          size: buffer.length,
        } as Express.Multer.File,
        {
          bucket: options.bucket,
          path: `projects/${contextId}`,
          isPublic: options.isPublic || false,
          metadata: {
            projectId: contextId,
            ...options.metadata,
          },
        }
      );

      const storageObject = {
        key: uploadResult.key,
        bucket: uploadResult.bucket,
        size: uploadResult.size,
        contentType: uploadResult.mimetype,
        etag: uploadResult.etag,
        url: uploadResult.url,
      };

      return this.saveFileRecord(organizationId, contextId, storageObject, filename, appId);
    } catch (error) {
      this.logger.error("Failed to upload stream:", error);
      throw error;
    }
  }

  async getFile(
    organizationId: string,
    projectId: string,
    appId: string,
    fileId: string
  ): Promise<StorageFile> {
    const result = await this.platformService.query<any>(`
      SELECT * FROM file_metadata WHERE id = $1 AND (project_id = $2 OR app_id = $3)
    `, [fileId, projectId, appId]);

    if (result.rows.length === 0) {
      throw new NotFoundException("File not found");
    }

    const file = result.rows[0];
    return {
      id: file.id,
      projectId: file.project_id || file.app_id,
      key: file.s3_key,
      bucket: file.s3_bucket,
      filename: file.filename,
      size: Number(file.size),
      contentType: file.content_type || "",
      url: file.s3_url || undefined,
      metadata: file.metadata || {},
      createdAt: file.created_at,
      updatedAt: file.updated_at,
    };
  }

  async downloadFile(
    organizationId: string,
    projectId: string,
    appId: string,
    fileId: string
  ): Promise<Buffer> {
    const file = await this.getFile(organizationId, projectId, appId, fileId);
    const result = await this.storageService.getFile(file.key, file.bucket);
    return result.data;
  }

  // async getFileStream(
  //   organizationId: string,
  //   projectId: string,
  //   appId: string,
  //   fileId: string
  // ): Promise<Readable> {
  //   const file = await this.getFile(organizationId, projectId, appId, fileId);
  //   const result = await this.storageService.getFile(file.key, file.bucket);
  //   return Readable.from(result.data);
  // }

  async getFileStream(
    organizationId: string,
    projectId: string,
    appId: string,
    fileId: string,
    range?: { start: number; end?: number }
  ): Promise<{ stream: Readable; metadata: any }> {
    const file = await this.getFile(organizationId, projectId, appId, fileId);
    const result = await this.storageService.getFileStream(file.key, file.bucket, range);
    return {
      stream: result.stream,
      metadata: {
        contentType: result.contentType,
        contentLength: result.contentLength,
        acceptRanges: result.acceptRanges,
        contentRange: result.contentRange,
      }
    };
  }

  async deleteFile(
    organizationId: string,
    projectId: string,
    appId: string,
    fileId: string
  ): Promise<void> {
    const file = await this.getFile(organizationId, projectId, appId, fileId);

    // Delete from R2
    await this.storageService.deleteFile(file.key, file.bucket);

    // Delete from database
    await this.platformService.query(`
      DELETE FROM file_metadata WHERE id = $1 AND (project_id = $2 OR app_id = $3)
    `, [fileId, projectId, appId]);
  }

  async listFiles(
    organizationId: string,
    projectId: string,
    appId: string,
    options?: {
      limit?: number;
      offset?: number;
      prefix?: string;
      contentType?: string;
    }
  ): Promise<{ files: StorageFile[]; total: number }> {
    const limit = options?.limit || 20;
    const offset = options?.offset || 0;

    let whereClause = 'WHERE (project_id = $1 OR app_id = $2)';
    const params: any[] = [projectId, appId];
    let paramIndex = 3;

    if (options?.prefix) {
      whereClause += ` AND s3_key LIKE $${paramIndex}`;
      params.push(`${options.prefix}%`);
      paramIndex++;
    }

    if (options?.contentType) {
      whereClause += ` AND content_type = $${paramIndex}`;
      params.push(options.contentType);
      paramIndex++;
    }

    const [filesResult, countResult] = await Promise.all([
      this.platformService.query<any>(`
        SELECT * FROM file_metadata 
        ${whereClause}
        ORDER BY created_at DESC
        LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
      `, [...params, limit, offset]),
      this.platformService.query<any>(`
        SELECT COUNT(*) as total FROM file_metadata ${whereClause}
      `, params)
    ]);

    const files = filesResult.rows.map(file => ({
      id: file.id,
      projectId: file.project_id || file.app_id,
      key: file.s3_key,
      bucket: file.s3_bucket,
      filename: file.filename,
      size: Number(file.size),
      contentType: file.content_type || "",
      url: file.s3_url || undefined,
      metadata: file.metadata || {},
      createdAt: file.created_at,
      updatedAt: file.updated_at,
    }));

    return {
      files,
      total: parseInt(countResult.rows[0]?.total || '0'),
    };
  }

  async getSignedUrl(
    organizationId: string,
    projectId: string,
    appId: string,
    fileId: string,
    expires: number = 3600
  ): Promise<string> {
    const file = await this.getFile(organizationId, projectId, appId, fileId);
    return this.storageService.getSignedUrl("read", {
      key: file.key,
      bucket: file.bucket,
      expires: Date.now() + expires * 1000,
    });
  }

  async getUploadUrl(
    organizationId: string,
    projectId: string,
    appId: string,
    filename: string,
    contentType: string,
    expires: number = 3600
  ): Promise<{ url: string; key: string; fileId: string }> {
    const contextId = appId || projectId;
    if (!contextId && !organizationId) {
      throw new Error("No organization, project, or app context provided");
    }
    const key = contextId
      ? `projects/${contextId}/${filename}`
      : `organizations/${organizationId}/${filename}`;
    const url = await this.storageService.getSignedUrl("write", {
      key,
      expires: Date.now() + expires * 1000,
      contentType,
    });

    // Pre-create file record
    const fileId = this.generateId();
    await this.platformService.query(`
      INSERT INTO file_metadata (id, filename, s3_key, s3_bucket, content_type, size, organization_id, project_id, app_id)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
    `, [fileId, filename, key, this.defaultBucket, contentType, 0, organizationId, projectId, appId]);

    return { url, key, fileId };
  }

  async confirmUpload(
    organizationId: string,
    projectId: string,
    appId: string,
    fileId: string
  ): Promise<StorageFile> {
    const file = await this.getFile(organizationId, projectId, appId, fileId);

    // Get file stats from R2
    let fileData;
    try {
      fileData = await this.storageService.getFile(file.key, file.bucket);
    } catch (error) {
      throw new Error("File not found in storage");
    }

    // Update file record with actual stats
    await this.platformService.query(`
      UPDATE file_metadata 
      SET size = $1, updated_at = NOW()
      WHERE id = $2 AND (project_id = $3 OR app_id = $4)
    `, [fileData.size || file.size, fileId, projectId, appId]);

    return this.getFile(organizationId, projectId, appId, fileId);
  }

  async copyFile(
    organizationId: string,
    projectId: string,
    appId: string,
    fileId: string,
    newFilename: string
  ): Promise<StorageFile> {
    const file = await this.getFile(organizationId, projectId, appId, fileId);
    const contextId = appId || projectId;
    if (!contextId && !organizationId) {
      throw new Error("No organization, project, or app context provided");
    }
    const newKey = contextId
      ? `projects/${contextId}/${newFilename}`
      : `organizations/${organizationId}/${newFilename}`;

    const copyResult = await this.storageService.copyFile(file.key, newKey, {
      sourceBucket: file.bucket,
      destBucket: file.bucket,
    });

    const storageObject = {
      key: copyResult.key,
      bucket: copyResult.bucket,
      etag: copyResult.etag,
      url: copyResult.url,
    };

    return this.saveFileRecord(organizationId, contextId, storageObject, newFilename, appId);
  }

  async getStorageStats(
    organizationId: string,
    projectId: string,
    appId: string
  ): Promise<{
    totalFiles: number;
    totalSize: number;
    byContentType: Record<string, { count: number; size: number }>;
  }> {
    const result = await this.platformService.query<any>(`
      SELECT content_type, COUNT(*) as count, SUM(size) as total_size
      FROM file_metadata 
      WHERE project_id = $1 OR app_id = $2
      GROUP BY content_type
    `, [projectId, appId]);

    const byContentType: Record<string, { count: number; size: number }> = {};
    let totalFiles = 0;
    let totalSize = 0;

    for (const row of result.rows) {
      const contentType = row.content_type || "unknown";
      const count = parseInt(row.count);
      const size = parseInt(row.total_size || '0');

      byContentType[contentType] = { count, size };
      totalFiles += count;
      totalSize += size;
    }

    return { totalFiles, totalSize, byContentType };
  }

  private async saveFileRecord(
    organizationId: string,
    contextId: string,
    storageObject: any,
    filename: string,
    appId?: string
  ): Promise<StorageFile> {
    const id = this.generateId();
    const metadata = storageObject.metadata || {};

    // Determine if contextId is a project or app ID
    const isAppId = appId || (contextId && contextId.startsWith('app_'));
    
    const result = await this.platformService.query<any>(`
      INSERT INTO file_metadata (
        id, filename, original_filename, s3_key, s3_bucket, s3_url, 
        content_type, size, organization_id, project_id, app_id, metadata
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
      RETURNING *
    `, [
      id,
      filename,
      filename, // original_filename
      storageObject.key,
      storageObject.bucket,
      storageObject.url || null,
      storageObject.contentType || 'application/octet-stream',
      storageObject.size || 0,
      organizationId,
      isAppId ? null : contextId,
      isAppId ? contextId : null,
      JSON.stringify(metadata)
    ]);

    const file = result.rows[0];
    return {
      id: file.id,
      projectId: file.project_id || file.app_id,
      key: file.s3_key,
      bucket: file.s3_bucket,
      filename: file.filename,
      size: Number(file.size),
      contentType: file.content_type || "",
      url: file.s3_url || undefined,
      metadata: file.metadata || {},
      createdAt: file.created_at,
      updatedAt: file.updated_at,
    };
  }

  private async generateThumbnail(
    organizationId: string,
    projectId: string,
    file: StorageFile
  ): Promise<void> {
    const thumbnailKey = `projects/${projectId}/thumbnails/${file.id}_thumb.jpg`;
    const result = await this.storageService.getFile(file.key, file.bucket);
    const buffer = result.data;

    const processedBuffer = await this.imageProcessing.process(buffer, {
      resize: { width: 200, height: 200, fit: "cover" },
      format: "jpeg",
      quality: 80,
    });

    const contentType = "image/jpeg";

    const uploadResult = await this.storageService.uploadFile(
      {
        buffer: processedBuffer,
        originalname: thumbnailKey,
        mimetype: contentType,
        size: processedBuffer.length,
      } as Express.Multer.File,
      {
        path: `projects/${projectId}/thumbnails`,
        metadata: {
          ...file.metadata,
          isThumbnail: "true",
          originalId: file.id,
        },
      }
    );

    const storageObject = {
      key: uploadResult.key,
      bucket: uploadResult.bucket,
      size: uploadResult.size,
      contentType: uploadResult.mimetype,
      etag: uploadResult.etag,
      url: uploadResult.url,
    };

    await this.saveFileRecord(
      organizationId,
      projectId,
      storageObject,
      `${file.filename}_thumb.jpg`
    );
  }

  private isImage(contentType: string): boolean {
    return contentType.startsWith("image/");
  }

  private changeFileExtension(filename: string, newExtension: string): string {
    const baseName = path.basename(filename, path.extname(filename));
    return `${baseName}.${newExtension}`;
  }

  private generateId(): string {
    return uuidv4();
  }

  // Folder management methods (R2 doesn't have real folders, but we can create placeholder objects)
  async createFolder(path: string, bucket?: string): Promise<void> {
    return this.storageService.createFolder(path, bucket);
  }

  async deleteFolder(path: string, bucket?: string): Promise<void> {
    return this.storageService.deleteFolder(path, bucket);
  }
}
