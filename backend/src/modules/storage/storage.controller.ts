import {
  Controller,
  Post,
  Get,
  Delete,
  Param,
  Body,
  UseGuards,
  UseInterceptors,
  UploadedFile,
  UploadedFiles,
  Query,
  Request,
  Res,
  StreamableFile,
  BadRequestException,
} from "@nestjs/common";
import { FileInterceptor, FilesInterceptor } from "@nestjs/platform-express";
import { Response } from "express";
import { JwtOrApiKeyAuthGuard } from "../auth/guards/jwt-or-api-key-auth.guard";
import { StorageService, ProcessingOptions } from "./storage.service";
import {
  ApiTags,
  ApiOperation,
  ApiConsumes,
  ApiBody,
  ApiSecurity,
  ApiHeader,
} from "@nestjs/swagger";

@ApiTags("Storage")
@Controller("storage")
@UseGuards(JwtOrApiKeyAuthGuard)
@ApiSecurity("api_key")
@ApiSecurity("JWT")
@ApiHeader({
  name: 'x-organization-id',
  description: 'Organization ID for multi-tenant context',
  required: false,
})
@ApiHeader({
  name: 'x-project-id',
  description: 'Project ID for multi-tenant context',
  required: false,
})
@ApiHeader({
  name: 'x-app-id',
  description: 'App ID for multi-tenant context (optional)',
  required: false,
})
export class StorageController {
  constructor(private readonly storageService: StorageService) {}

  @Post("buckets/:bucket/upload")
  @UseInterceptors(FileInterceptor("file", {
    limits: { fileSize: 200 * 1024 * 1024 }, // 200MB limit
  }))
  @ApiOperation({ summary: "Upload a file to a specific bucket" })
  @ApiConsumes("multipart/form-data")
  @ApiBody({
    schema: {
      type: "object",
      properties: {
        file: {
          type: "string",
          format: "binary",
        },
        public: {
          type: "boolean",
          description: "Make file publicly accessible",
        },
        process: {
          type: "object",
          description: "Image processing options",
        },
      },
    },
  })
  async uploadFileToBucket(
    @Request() req: any,
    @Param("bucket") bucket: string,
    @UploadedFile() file: Express.Multer.File,
    @Body()
    body: {
      public?: boolean;
      process?: ProcessingOptions;
      metadata?: any;
    }
  ) {
    console.log("Bucket upload endpoint hit");
    console.log("Bucket:", bucket);
    console.log("File:", file);
    console.log("Body:", body);

    // Determine which context ID to use
    const organizationId = req.headers['x-organization-id'] || req.auth?.organizationId;
    const projectId = req.headers["x-project-id"] || req.auth?.projectId;
    const appId = req.headers["x-app-id"] || req.auth?.appId;

    if (!file) {
      throw new BadRequestException("No file provided");
    }

    try {
      // Use the bucket from URL parameter
      const result = await this.storageService.uploadFile(
        organizationId,
        projectId,
        appId,
        file,
        {
          isPublic: body.public,
          process: body.process,
          bucket: bucket, // Virtual bucket from URL
          metadata: body.metadata,
        }
      );
      console.log("Bucket upload completed successfully:", result);
      return result;
    } catch (error) {
      console.error("Bucket upload failed with error:", error);
      throw error;
    }
  }

  @Post("upload")
  @UseInterceptors(FileInterceptor("file", {
    limits: { fileSize: 200 * 1024 * 1024 }, // 200MB limit
  }))
  @ApiOperation({ summary: "Upload a file" })
  @ApiConsumes("multipart/form-data")
  @ApiBody({
    schema: {
      type: "object",
      properties: {
        file: {
          type: "string",
          format: "binary",
        },
        public: {
          type: "boolean",
          description: "Make file publicly accessible",
        },
        process: {
          type: "object",
          description: "Image processing options",
        },
      },
    },
  })
  async uploadFile(
    @Request() req: any,
    @UploadedFile() file: Express.Multer.File,
    @Body()
    body: {
      public?: boolean;
      process?: ProcessingOptions;
      bucket?: string;
      metadata?: any;
    }
  ) {
    console.log("Upload endpoint hit");
    console.log("File:", file);
    console.log("Body:", body);

    // Determine which context ID to use
    const organizationId = req.headers['x-organization-id'] || req.auth?.organizationId;
    const projectId = req.headers["x-project-id"] || req.auth?.projectId;
    const appId = req.headers["x-app-id"] || req.auth?.appId;

    if (!file) {
      throw new BadRequestException("No file provided");
    }

    try {
      const result = await this.storageService.uploadFile(
        organizationId,
        projectId,
        appId,
        file,
        {
          isPublic: body.public,
          process: body.process,
          bucket: body.bucket,
          metadata: body.metadata,
        }
      );
      console.log("Upload completed successfully:", result);
      return result;
    } catch (error) {
      console.error("Upload failed with error:", error);
      throw error;
    }
  }

  @Post("upload-multiple")
  @UseInterceptors(FilesInterceptor("files", 10, {
    limits: { fileSize: 200 * 1024 * 1024 }, // 200MB limit per file
  }))
  @ApiOperation({ summary: "Upload multiple files" })
  @ApiConsumes("multipart/form-data")
  async uploadMultiple(
    @Request() req: any,
    @UploadedFiles() files: Express.Multer.File[],
    @Body() body: { public?: boolean; process?: ProcessingOptions }
  ) {
    const organizationId = req.headers['x-organization-id'] || req.auth?.organizationId;
    const projectId = req.headers["x-project-id"] || req.auth?.projectId;
    const appId = req.headers["x-app-id"] || req.auth?.appId;

    if (!files || files.length === 0) {
      throw new BadRequestException("No files provided");
    }

    const uploads = await Promise.all(
      files.map((file) =>
        this.storageService.uploadFile(organizationId, projectId, appId, file, {
          isPublic: body.public,
          process: body.process,
        })
      )
    );

    return { files: uploads };
  }

  @Get("files")
  @ApiOperation({ summary: "List files" })
  async listFiles(
    @Request() req: any,
    @Query()
    query: {
      prefix?: string;
      contentType?: string;
      limit?: string;
      offset?: string;
    }
  ) {
    const organizationId = req.headers['x-organization-id'] || req.auth?.organizationId;
    const projectId = req.headers["x-project-id"] || req.auth?.projectId;
    const appId = req.headers["x-app-id"] || req.auth?.appId;

    return this.storageService.listFiles(organizationId, projectId, appId, {
      prefix: query.prefix,
      contentType: query.contentType,
      limit: query.limit ? parseInt(query.limit) : undefined,
      offset: query.offset ? parseInt(query.offset) : undefined,
    });
  }

  @Get("files/:id")
  @ApiOperation({ summary: "Get file details" })
  async getFile(@Request() req: any, @Param("id") fileId: string) {
    const organizationId = req.headers['x-organization-id'] || req.auth?.organizationId;
    const projectId = req.headers["x-project-id"] || req.auth?.projectId;
    const appId = req.headers["x-app-id"] || req.auth?.appId;

    return this.storageService.getFile(organizationId, projectId, appId, fileId);
  }

  @Get("files/:id/download")
  @ApiOperation({ summary: "Download a file" })
  async downloadFile(
    @Request() req: any,
    @Param("id") fileId: string,
    @Res({ passthrough: true }) res: Response
  ) {
    const organizationId = req.headers['x-organization-id'] || req.auth?.organizationId;
    const projectId = req.headers["x-project-id"] || req.auth?.projectId;
    const appId = req.headers["x-app-id"] || req.auth?.appId;

    const file = await this.storageService.getFile(organizationId, projectId, appId, fileId);
    const buffer = await this.storageService.downloadFile(
      organizationId,
      projectId,
      appId,
      fileId
    );

    res.set({
      "Content-Type": file.contentType,
      "Content-Disposition": `attachment; filename="${file.filename}"`,
      "Content-Length": buffer.length,
    });

    return new StreamableFile(buffer);
  }

  // @Get("files/:id/stream")
  // @ApiOperation({ summary: "Stream a file" })
  // async streamFile(
  //   @Request() req: any,
  //   @Param("id") fileId: string,
  //   @Res({ passthrough: true }) res: Response
  // ) {
  //   const organizationId = req.headers['x-organization-id'] || req.auth?.organizationId;
  //   const projectId = req.headers["x-project-id"] || req.auth?.projectId;
  //   const appId = req.headers["x-app-id"] || req.auth?.appId;

  //   const file = await this.storageService.getFile(organizationId, projectId, appId, fileId);
  //   const stream = await this.storageService.getFileStream(
  //     organizationId,
  //     projectId,
  //     appId,
  //     fileId
  //   );

  //   res.set({
  //     "Content-Type": file.contentType,
  //     "Content-Disposition": `inline; filename="${file.filename}"`,
  //   });

  //   return new StreamableFile(stream);
  // }
  @Get("files/:id/stream")
  @ApiOperation({ summary: "Stream a file" })
  async streamFile(
    @Request() req: any,
    @Param("id") fileId: string,
    @Res({ passthrough: true }) res: Response
  ) {
    const organizationId = req.headers['x-organization-id'] || req.query['x-organization-id'] || req.auth?.organizationId;
    const projectId = req.headers["x-project-id"] || req.query['x-project-id'] || req.auth?.projectId;
    const appId = req.headers["x-app-id"] || req.query['x-app-id'] || req.auth?.appId;

    // Parse range header if present
    let range: { start: number; end?: number } | undefined;
    const rangeHeader = req.headers.range;
    
    if (rangeHeader) {
      const matches = rangeHeader.match(/bytes=(\d+)-(\d*)/);
      if (matches) {
        range = {
          start: parseInt(matches[1]),
          end: matches[2] ? parseInt(matches[2]) : undefined
        };
      }
    }

    const file = await this.storageService.getFile(organizationId, projectId, appId, fileId);
    const { stream, metadata } = await this.storageService.getFileStream(
      organizationId,
      projectId,
      appId,
      fileId,
      range
    );

    // Set appropriate headers based on whether this is a range request
    const headers: any = {
      "Content-Type": file.contentType,
      "Content-Disposition": `inline; filename="${file.filename}"`,
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, HEAD',
      'Access-Control-Allow-Headers': 'Range',
      'Accept-Ranges': 'bytes',
      'Cache-Control': 'no-cache',
    };

    if (range && metadata.contentRange) {
      // Partial content response
      res.status(206);
      headers['Content-Range'] = metadata.contentRange;
      headers['Content-Length'] = metadata.contentLength;
    } else if (!range && file.size) {
      // Full content response
      headers['Content-Length'] = file.size;
    }

    res.set(headers);

    return new StreamableFile(stream);
  }

  @Delete("files/:id")
  @ApiOperation({ summary: "Delete a file" })
  async deleteFile(@Request() req: any, @Param("id") fileId: string) {
    const organizationId = req.headers['x-organization-id'] || req.auth?.organizationId;
    const projectId = req.headers["x-project-id"] || req.auth?.projectId;
    const appId = req.headers["x-app-id"] || req.auth?.appId;

    await this.storageService.deleteFile(organizationId, projectId, appId, fileId);
    return { deleted: true, id: fileId };
  }

  @Post("files/:id/copy")
  @ApiOperation({ summary: "Copy a file" })
  async copyFile(
    @Request() req: any,
    @Param("id") fileId: string,
    @Body("filename") filename: string
  ) {
    const organizationId = req.headers['x-organization-id'] || req.auth?.organizationId;
    const projectId = req.headers["x-project-id"] || req.auth?.projectId;
    const appId = req.headers["x-app-id"] || req.auth?.appId;

    if (!filename) {
      throw new BadRequestException("Filename is required");
    }

    return this.storageService.copyFile(organizationId, projectId, appId, fileId, filename);
  }

  @Get("signed-url/:id")
  @ApiOperation({ summary: "Get a signed URL for a file" })
  async getSignedUrl(
    @Request() req: any,
    @Param("id") fileId: string,
    @Query("expires") expires?: string
  ) {
    const organizationId = req.headers['x-organization-id'] || req.auth?.organizationId;
    const projectId = req.headers["x-project-id"] || req.auth?.projectId;
    const appId = req.headers["x-app-id"] || req.auth?.appId;

    const expiresIn = expires ? parseInt(expires) : 3600;
    const url = await this.storageService.getSignedUrl(
      organizationId,
      projectId,
      appId,
      fileId,
      expiresIn
    );

    return { url, expires: expiresIn };
  }

  @Post("upload-url")
  @ApiOperation({ summary: "Get a pre-signed upload URL" })
  async getUploadUrl(
    @Request() req: any,
    @Body() body: { filename: string; contentType?: string; expires?: number }
  ) {
    const organizationId = req.headers['x-organization-id'] || req.auth?.organizationId;
    const projectId = req.headers["x-project-id"] || req.auth?.projectId;
    const appId = req.headers["x-app-id"] || req.auth?.appId;

    if (!body.filename) {
      throw new BadRequestException("Filename is required");
    }

    return this.storageService.getUploadUrl(
      organizationId,
      projectId,
      appId,
      body.filename,
      body.contentType || "application/octet-stream",
      body.expires || 3600
    );
  }

  @Post("confirm-upload/:id")
  @ApiOperation({ summary: "Confirm a pre-signed upload" })
  async confirmUpload(@Request() req: any, @Param("id") fileId: string) {
    const organizationId = req.headers['x-organization-id'] || req.auth?.organizationId;
    const projectId = req.headers["x-project-id"] || req.auth?.projectId;
    const appId = req.headers["x-app-id"] || req.auth?.appId;

    return this.storageService.confirmUpload(organizationId, projectId, appId, fileId);
  }

  @Get("stats")
  @ApiOperation({ summary: "Get storage statistics" })
  async getStats(@Request() req: any) {
    const organizationId = req.headers['x-organization-id'] || req.auth?.organizationId;
    const projectId = req.headers["x-project-id"] || req.auth?.projectId;
    const appId = req.headers["x-app-id"] || req.auth?.appId;

    return this.storageService.getStorageStats(organizationId, projectId, appId);
  }

  // Admin endpoints
  @Get("admin/files")
  @UseGuards(JwtOrApiKeyAuthGuard)
  @ApiOperation({ summary: "List all files (admin)" })
  async adminListFiles(
    @Query() query: { projectId?: string; limit?: string; offset?: string }
  ) {
    // Admin implementation would go here
    return { message: "Admin file listing not implemented yet" };
  }
}
