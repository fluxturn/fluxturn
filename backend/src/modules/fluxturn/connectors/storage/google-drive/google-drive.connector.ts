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

@Injectable()
export class GoogleDriveConnector extends BaseConnector implements IStorageConnector {
  private baseUrl = 'https://www.googleapis.com/drive/v3';
  private uploadUrl = 'https://www.googleapis.com/upload/drive/v3';

  constructor(
    private readonly authUtils: AuthUtils,
    private readonly apiUtils: ApiUtils
  ) {
    super();
  }

  getMetadata(): ConnectorMetadata {
    return {
      name: 'Google Drive',
      description: 'Google Drive cloud storage and file management',
      version: '1.0.0',
      category: ConnectorCategory.STORAGE,
      type: ConnectorType.GOOGLE_DRIVE,
      logoUrl: 'https://developers.google.com/drive/images/drive_icon.png',
      documentationUrl: 'https://developers.google.com/drive/api',
      authType: AuthType.OAUTH2,
      requiredScopes: [
        'https://www.googleapis.com/auth/drive',
        'https://www.googleapis.com/auth/drive.file'
      ],
      actions: this.getActions(),
      triggers: this.getTriggers(),
      rateLimit: {
        requestsPerSecond: 10,
        requestsPerMinute: 1000,
        requestsPerDay: 1000000
      },
      webhookSupport: true
    };
  }

  protected async initializeConnection(): Promise<void> {
    // Test the connection by getting user info
    const testResponse = await this.performRequest({
      method: 'GET',
      endpoint: `${this.baseUrl}/about`,
      headers: this.getAuthHeaders(),
      queryParams: { fields: 'user' }
    });

    if (!testResponse.user) {
      throw new Error('Google Drive connection failed: Unable to get user info');
    }

    this.logger.log('Google Drive connector initialized successfully');
  }

  protected async performConnectionTest(): Promise<boolean> {
    try {
      const response = await this.performRequest({
        method: 'GET',
        endpoint: `${this.baseUrl}/about`,
        headers: this.getAuthHeaders(),
        queryParams: { fields: 'user' }
      });
      return !!response.user;
    } catch (error) {
      return false;
    }
  }

  protected async performHealthCheck(): Promise<void> {
    const response = await this.performRequest({
      method: 'GET',
      endpoint: `${this.baseUrl}/about`,
      headers: this.getAuthHeaders(),
      queryParams: { fields: 'storageQuota' }
    });

    if (!response.storageQuota) {
      throw new Error('Google Drive health check failed: Unable to get storage quota');
    }
  }

  protected async performRequest(request: ConnectorRequest): Promise<any> {
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
        return this.handleUploadFile(input);
      case 'download_file':
        // Support both fileId (dropdown) and fileIdExpression (from previous node)
        const fileId = input.fileIdExpression || input.fileId;
        return this.downloadFile(fileId, input);
      case 'list_files':
        return this.listFiles(undefined, input);
      case 'delete_file':
        return this.deleteFile(input.fileId, input);
      case 'create_directory':
        return this.createDirectory(input.folderName || 'folder', input);
      case 'get_file_metadata':
        return this.getFileMetadata(input.fileId);
      case 'share_file':
        return this.shareFile(input.fileId, input);
      default:
        throw new Error(`Unknown action: ${actionId}`);
    }
  }

  /**
   * Map MIME type to file extension
   */
  private getExtensionFromMimeType(mimeType: string): string {
    const mimeTypeMap: Record<string, string> = {
      // Images
      'image/jpeg': '.jpg',
      'image/jpg': '.jpg',
      'image/png': '.png',
      'image/gif': '.gif',
      'image/bmp': '.bmp',
      'image/webp': '.webp',
      'image/svg+xml': '.svg',
      'image/tiff': '.tiff',
      'image/x-icon': '.ico',

      // Documents
      'application/pdf': '.pdf',
      'application/msword': '.doc',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document': '.docx',
      'application/vnd.ms-excel': '.xls',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': '.xlsx',
      'application/vnd.ms-powerpoint': '.ppt',
      'application/vnd.openxmlformats-officedocument.presentationml.presentation': '.pptx',
      'text/plain': '.txt',
      'text/csv': '.csv',
      'text/html': '.html',
      'text/css': '.css',
      'text/javascript': '.js',
      'application/json': '.json',
      'application/xml': '.xml',

      // Archives
      'application/zip': '.zip',
      'application/x-rar-compressed': '.rar',
      'application/x-7z-compressed': '.7z',
      'application/x-tar': '.tar',
      'application/gzip': '.gz',

      // Videos
      'video/mp4': '.mp4',
      'video/mpeg': '.mpeg',
      'video/quicktime': '.mov',
      'video/x-msvideo': '.avi',
      'video/x-flv': '.flv',
      'video/webm': '.webm',

      // Audio
      'audio/mpeg': '.mp3',
      'audio/wav': '.wav',
      'audio/ogg': '.ogg',
      'audio/webm': '.weba',
      'audio/aac': '.aac',
      'audio/flac': '.flac',

      // Google Workspace
      'application/vnd.google-apps.document': '',
      'application/vnd.google-apps.spreadsheet': '',
      'application/vnd.google-apps.presentation': '',

      // Default
      'application/octet-stream': '.bin',
    };

    return mimeTypeMap[mimeType] || '';
  }

  /**
   * Ensure fileName has the correct extension based on MIME type
   */
  private ensureFileExtension(fileName: string, mimeType: string): string {
    // If fileName already has an extension, keep it
    const hasExtension = fileName.includes('.') && fileName.lastIndexOf('.') > fileName.lastIndexOf('/');

    if (hasExtension) {
      return fileName;
    }

    // Add extension based on MIME type
    const extension = this.getExtensionFromMimeType(mimeType);
    if (extension) {
      return fileName + extension;
    }

    return fileName;
  }

  private async handleUploadFile(input: any): Promise<any> {
    const inputSource = input.inputSource || 'direct';

    let fileContent: Buffer;
    let fileName: string;
    let mimeType: string;

    if (inputSource === 'binary') {
      // Get binary data from previous node
      const binaryPropertyName = input.binaryPropertyName || 'data';

      // Check if binary data exists in input
      if (!input.binary || !input.binary[binaryPropertyName]) {
        throw new Error(
          `No binary data found with property name "${binaryPropertyName}". ` +
          `Make sure the previous node (like HTTP Request) outputs binary data.`
        );
      }

      const binaryData = input.binary[binaryPropertyName];

      this.logger.log(`Binary data structure:`, {
        keys: Object.keys(binaryData),
        hasData: !!binaryData.data,
        dataType: typeof binaryData.data,
        dataLength: binaryData.data?.length,
        mimeType: binaryData.mimeType,
        fileName: binaryData.fileName
      });

      // Extract data from binary format
      const base64Data = binaryData.data;
      mimeType = binaryData.mimeType || 'application/octet-stream';

      // Validate base64 data
      if (!base64Data || typeof base64Data !== 'string') {
        throw new Error(`Invalid binary data: expected base64 string, got ${typeof base64Data}`);
      }

      // Get fileName and ensure it has the correct extension
      const rawFileName = input.fileName || binaryData.fileName || 'file';
      fileName = this.ensureFileExtension(rawFileName, mimeType);

      // Convert base64 to Buffer
      fileContent = Buffer.from(base64Data, 'base64');

      // Log file signature (first 4 bytes) for debugging
      const signature = fileContent.slice(0, 4).toString('hex').toUpperCase();
      this.logger.log(`File signature: ${signature} (JPG should start with FFD8FF, PNG with 89504E47)`);
      this.logger.log(`Uploading from binary data: ${fileName} (${mimeType}, ${fileContent.length} bytes)`);
    } else {
      // Direct content input
      mimeType = input.mimeType || 'application/octet-stream';
      const rawFileName = input.fileName || 'file';
      fileName = this.ensureFileExtension(rawFileName, mimeType);

      fileContent = Buffer.isBuffer(input.content)
        ? input.content
        : Buffer.from(input.content || '', 'utf8');

      this.logger.log(`Uploading from direct content: ${fileName} (${mimeType}, ${fileContent.length} bytes)`);
    }

    // Call the uploadFile method with prepared data
    return this.uploadFile(fileName, fileContent, {
      ...input,
      fileName,
      mimeType
    });
  }

  protected async cleanup(): Promise<void> {
    this.logger.log('Google Drive connector cleanup completed');
  }

  // IStorageConnector implementation
  async uploadFile(filePath: string, content: Buffer | string, metadata?: any): Promise<ConnectorResponse> {
    try {
      // Generate unique upload ID to track duplicates
      const uploadId = `upload_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      this.logger.log(`🔵 Starting upload - ID: ${uploadId}`);

      // Handle new parameter format or legacy format
      const fileName = metadata?.fileName || filePath.split('/').pop() || 'untitled';
      const driveId = metadata?.driveId || 'root';
      const folderId = metadata?.folderId;
      const mimeType = metadata?.mimeType || 'application/octet-stream';
      const description = metadata?.description;

      // Determine parent
      let parents: string[] | undefined;
      if (folderId) {
        parents = [folderId];
      } else if (driveId && driveId !== 'root') {
        parents = [driveId];
      }

      // Create file metadata
      // Note: mimeType in metadata helps Google Drive recognize the file type
      const fileMetadata: any = {
        name: fileName,
        mimeType,
      };

      // Only add optional fields if they exist
      if (parents) {
        fileMetadata.parents = parents;
      }
      if (description) {
        fileMetadata.description = description;
      }

      this.logger.log(`Uploading file to Google Drive:`, {
        fileName,
        mimeType,
        size: Buffer.isBuffer(content) ? content.length : Buffer.byteLength(content),
        hasParents: !!parents,
        driveId,
        folderId
      });

      // Upload file with content using multipart/related format
      // See: https://developers.google.com/drive/api/guides/manage-uploads#multipart
      const boundary = '-------314159265358979323846';

      // Build multipart body according to RFC 2046
      // Format: --boundary\r\n{headers}\r\n\r\n{content}\r\n--boundary\r\n...--boundary--
      const parts: Buffer[] = [];

      // Part 1: File metadata (JSON)
      parts.push(Buffer.from(`--${boundary}\r\n`, 'utf8'));
      parts.push(Buffer.from('Content-Type: application/json; charset=UTF-8\r\n\r\n', 'utf8'));
      parts.push(Buffer.from(JSON.stringify(fileMetadata) + '\r\n', 'utf8'));

      // Part 2: File content (binary)
      parts.push(Buffer.from(`--${boundary}\r\n`, 'utf8'));
      parts.push(Buffer.from(`Content-Type: ${mimeType}\r\n\r\n`, 'utf8'));

      // Ensure content is a Buffer
      const contentBuffer = Buffer.isBuffer(content) ? content : Buffer.from(content, 'utf8');
      parts.push(contentBuffer);

      // Closing boundary
      parts.push(Buffer.from(`\r\n--${boundary}--\r\n`, 'utf8'));

      // Concatenate all parts
      const bodyBuffer = Buffer.concat(parts);

      // Log multipart body structure for debugging
      const headerPreview = bodyBuffer.slice(0, 200).toString('utf8').replace(/\r/g, '\\r').replace(/\n/g, '\\n');
      this.logger.log(`Multipart body preview (first 200 chars): ${headerPreview}`);
      this.logger.log(`Multipart upload body size: ${bodyBuffer.length} bytes (content: ${contentBuffer.length} bytes)`);
      this.logger.log(`Expected body size: metadata + content + boundaries = ~${bodyBuffer.length - contentBuffer.length} + ${contentBuffer.length}`);

      // Calculate timeout based on file size
      // Base: 30s + 1 minute per 10MB
      const fileSizeMB = contentBuffer.length / (1024 * 1024);
      const calculatedTimeout = Math.max(60000, 30000 + (fileSizeMB / 10) * 60000); // Min 60s
      const timeoutMinutes = (calculatedTimeout / 60000).toFixed(1);

      this.logger.log(`File size: ${fileSizeMB.toFixed(2)} MB, Timeout: ${timeoutMinutes} minutes`);
      this.logger.log(`Upload URL: ${this.uploadUrl}/files?uploadType=multipart&supportsAllDrives=true`);

      const response = await this.performRequest({
        method: 'POST',
        endpoint: `${this.uploadUrl}/files?uploadType=multipart&supportsAllDrives=true`,
        headers: {
          ...this.getAuthHeaders(),
          'Content-Type': `multipart/related; boundary="${boundary}"`,
          'Content-Length': bodyBuffer.length.toString()
        },
        body: bodyBuffer,
        timeout: calculatedTimeout
      });

      this.logger.log(`✅ Upload successful - ID: ${uploadId}`);
      this.logger.log(`   File: ${response.name} (${response.id})`);

      // Google Drive API doesn't always return size in upload response
      // We'll verify by fetching metadata if size is missing
      if (response.size) {
        const uploadedSize = parseInt(response.size);
        if (uploadedSize === contentBuffer.length) {
          this.logger.log(`✅ File size verified: ${uploadedSize} bytes`);
        } else {
          this.logger.warn(`⚠️  Size mismatch! Uploaded: ${uploadedSize}, Expected: ${contentBuffer.length}`);
        }
      } else {
        this.logger.log(`✅ Upload completed (size verification skipped - API didn't return size)`);
      }

      this.logger.log(`🟢 Upload finished - ID: ${uploadId}`);

      return {
        success: true,
        data: {
          id: response.id,
          name: response.name,
          size: response.size,
          mimeType: response.mimeType,
          webViewLink: response.webViewLink,
          webContentLink: response.webContentLink
        }
      };
    } catch (error) {
      return this.handleError(error as any, 'Failed to upload file');
    }
  }

  async downloadFile(fileId: string, options?: any): Promise<ConnectorResponse<Buffer>> {
    try {
      // Get file metadata first to check if it's a Google native file
      const metadata = await this.performRequest({
        method: 'GET',
        endpoint: `${this.baseUrl}/files/${fileId}`,
        headers: this.getAuthHeaders(),
        queryParams: {
          fields: 'id,name,mimeType,size',
          supportsAllDrives: true
        }
      });

      const isGoogleNativeFile = metadata.mimeType?.startsWith('application/vnd.google-apps.');
      const convertGoogleDocs = options?.convertGoogleDocs || false;
      const conversionFormat = options?.conversionFormat || 'application/pdf';

      let downloadUrl = `${this.baseUrl}/files/${fileId}`;
      let queryParams: any = {
        alt: 'media',
        supportsAllDrives: true
      };

      // If it's a Google native file and conversion is requested
      if (isGoogleNativeFile && convertGoogleDocs) {
        downloadUrl = `${this.baseUrl}/files/${fileId}/export`;
        queryParams = {
          mimeType: conversionFormat,
          supportsAllDrives: true
        };
      }

      // Build URL with query params
      const queryString = Object.entries(queryParams)
        .map(([key, value]) => `${key}=${encodeURIComponent(String(value))}`)
        .join('&');

      const response = await this.apiUtils.downloadFile(
        `${downloadUrl}?${queryString}`,
        this.getAuthHeaders() as Record<string, string>
      );

      if (!response.success) {
        throw new Error(response.error?.message || 'Download failed');
      }

      return {
        success: true,
        data: response.data,
        metadata: {
          fileName: metadata.name,
          mimeType: isGoogleNativeFile && convertGoogleDocs ? conversionFormat : metadata.mimeType,
          size: metadata.size ? parseInt(metadata.size) : response.data.length,
          timestamp: new Date()
        } as any
      };
    } catch (error) {
      return this.handleError(error as any, 'Failed to download file');
    }
  }

  async listFiles(directoryPath?: string, options?: any): Promise<ConnectorResponse> {
    try {
      const driveId = options?.driveId;
      const folderId = options?.folderId;
      const searchQuery = options?.searchQuery;
      const fileTypes = options?.fileTypes || 'all';
      const includeTrashed = options?.includeTrashed || false;
      const limit = options?.limit || 100;

      // Build query
      let queryParts: string[] = [];

      // Trashed filter
      if (!includeTrashed) {
        queryParts.push('trashed=false');
      }

      // Folder filter
      if (folderId) {
        queryParts.push(`'${folderId}' in parents`);
      } else if (driveId && driveId !== 'root') {
        queryParts.push(`'${driveId}' in parents`);
      }

      // File type filter
      const mimeTypeMap: Record<string, string> = {
        'folder': "mimeType='application/vnd.google-apps.folder'",
        'document': "mimeType='application/vnd.google-apps.document'",
        'spreadsheet': "mimeType='application/vnd.google-apps.spreadsheet'",
        'presentation': "mimeType='application/vnd.google-apps.presentation'",
        'image': "mimeType contains 'image/'",
        'video': "mimeType contains 'video/'",
        'pdf': "mimeType='application/pdf'"
      };

      if (fileTypes !== 'all' && mimeTypeMap[fileTypes]) {
        queryParts.push(mimeTypeMap[fileTypes]);
      }

      // Custom search query (advanced)
      if (searchQuery) {
        queryParts.push(searchQuery);
      }

      const query = queryParts.length > 0 ? queryParts.join(' and ') : undefined;

      const params: any = {
        q: query,
        pageSize: Math.min(limit, 1000),
        pageToken: options?.pageToken,
        fields: 'nextPageToken, files(id, name, size, mimeType, modifiedTime, createdTime, webViewLink, webContentLink, parents, owners, shared)',
        orderBy: 'modifiedTime desc',
        supportsAllDrives: true,
        includeItemsFromAllDrives: true
      };

      const response = await this.performRequest({
        method: 'GET',
        endpoint: `${this.baseUrl}/files`,
        headers: this.getAuthHeaders(),
        queryParams: params
      });

      return {
        success: true,
        data: {
          files: response.files || [],
          nextPageToken: response.nextPageToken,
          pagination: {
            total: response.files?.length || 0,
            hasNext: !!response.nextPageToken
          }
        },
        metadata: {
          timestamp: new Date()
        }
      };
    } catch (error) {
      return this.handleError(error as any, 'Failed to list files');
    }
  }

  async deleteFile(fileId: string, options?: any): Promise<ConnectorResponse> {
    try {
      const permanentDelete = options?.permanentDelete || false;

      if (permanentDelete) {
        // Permanently delete
        await this.performRequest({
          method: 'DELETE',
          endpoint: `${this.baseUrl}/files/${fileId}`,
          headers: this.getAuthHeaders(),
          queryParams: {
            supportsAllDrives: true
          }
        });
      } else {
        // Move to trash
        await this.performRequest({
          method: 'PATCH',
          endpoint: `${this.baseUrl}/files/${fileId}`,
          headers: {
            ...this.getAuthHeaders(),
            'Content-Type': 'application/json'
          },
          queryParams: {
            supportsAllDrives: true
          },
          body: {
            trashed: true
          }
        });
      }

      return {
        success: true,
        data: { deleted: true, fileId, permanentDelete }
      };
    } catch (error) {
      return this.handleError(error as any, 'Failed to delete file');
    }
  }

  async createDirectory(directoryPath: string, options?: any): Promise<ConnectorResponse> {
    try {
      // Handle new parameter format or legacy format
      const folderName = options?.folderName || directoryPath.split('/').pop() || 'Untitled Folder';
      const driveId = options?.driveId || 'root';
      const parentFolderId = options?.parentFolderId;
      const folderColor = options?.folderColor;

      // Determine parent
      let parents: string[] | undefined;
      if (parentFolderId) {
        parents = [parentFolderId];
      } else if (driveId && driveId !== 'root') {
        parents = [driveId];
      }

      const folderMetadata: any = {
        name: folderName,
        mimeType: 'application/vnd.google-apps.folder',
        parents
      };

      // Add folder color if provided
      if (folderColor) {
        folderMetadata.folderColorRgb = folderColor;
      }

      const response = await this.performRequest({
        method: 'POST',
        endpoint: `${this.baseUrl}/files`,
        headers: {
          ...this.getAuthHeaders(),
          'Content-Type': 'application/json'
        },
        queryParams: {
          supportsAllDrives: true
        },
        body: folderMetadata
      });

      return {
        success: true,
        data: {
          id: response.id,
          name: response.name,
          webViewLink: response.webViewLink
        }
      };
    } catch (error) {
      return this.handleError(error as any, 'Failed to create directory');
    }
  }

  async getFileMetadata(fileId: string): Promise<ConnectorResponse> {
    try {
      const response = await this.performRequest({
        method: 'GET',
        endpoint: `${this.baseUrl}/files/${fileId}`,
        headers: this.getAuthHeaders(),
        queryParams: {
          fields: 'id, name, size, mimeType, modifiedTime, createdTime, webViewLink, webContentLink, parents, owners, permissions, shared',
          supportsAllDrives: true
        }
      });

      return {
        success: true,
        data: response
      };
    } catch (error) {
      return this.handleError(error as any, 'Failed to get file metadata');
    }
  }

  async shareFile(fileId: string, permissions?: any): Promise<ConnectorResponse<string>> {
    try {
      const permissionType = permissions?.permissionType || 'anyone';
      const role = permissions?.role || 'reader';
      const emailAddress = permissions?.emailAddress;
      const domain = permissions?.domain;
      const sendNotificationEmail = permissions?.sendNotificationEmail !== false;
      const emailMessage = permissions?.emailMessage;

      // Build permission data
      const permissionData: any = {
        role,
        type: permissionType
      };

      // Add email or domain based on type
      if (permissionType === 'user' || permissionType === 'group') {
        if (!emailAddress) {
          throw new Error('Email address is required for user/group permissions');
        }
        permissionData.emailAddress = emailAddress;
      } else if (permissionType === 'domain') {
        if (!domain) {
          throw new Error('Domain is required for domain permissions');
        }
        permissionData.domain = domain;
      }

      // Query params
      const queryParams: any = {
        supportsAllDrives: true
      };

      if (sendNotificationEmail && (permissionType === 'user' || permissionType === 'group')) {
        queryParams.sendNotificationEmail = true;
        if (emailMessage) {
          queryParams.emailMessage = emailMessage;
        }
      }

      const response = await this.performRequest({
        method: 'POST',
        endpoint: `${this.baseUrl}/files/${fileId}/permissions`,
        headers: {
          ...this.getAuthHeaders(),
          'Content-Type': 'application/json'
        },
        queryParams,
        body: permissionData
      });

      // Get the updated file to return the web view link
      const fileResponse = await this.getFileMetadata(fileId);
      const shareableLink = fileResponse.data?.webViewLink;

      return {
        success: true,
        data: shareableLink,
        metadata: {
          permissionId: response.id,
          timestamp: new Date()
        } as any
      };
    } catch (error) {
      return this.handleError(error as any, 'Failed to share file');
    }
  }

  // Helper methods
  private async getFolderId(path: string): Promise<string | null> {
    const pathParts = path.split('/').filter(part => part.length > 0);
    let currentParentId = 'root';

    for (const folderName of pathParts) {
      const query = `name='${folderName}' and '${currentParentId}' in parents and mimeType='application/vnd.google-apps.folder' and trashed=false`;
      
      const response = await this.performRequest({
        method: 'GET',
        endpoint: `${this.baseUrl}/files`,
        headers: this.getAuthHeaders(),
        queryParams: {
          q: query,
          fields: 'files(id, name)'
        }
      });

      if (response.files.length === 0) {
        return null;
      }

      currentParentId = response.files[0].id;
    }

    return currentParentId === 'root' ? null : currentParentId;
  }

  private async getOrCreateParentFolder(filePath: string): Promise<string | null> {
    const pathParts = filePath.split('/').filter(part => part.length > 0);
    pathParts.pop(); // Remove filename
    
    if (pathParts.length === 0) {
      return null; // Root directory
    }

    let currentParentId = 'root';

    for (const folderName of pathParts) {
      const query = `name='${folderName}' and '${currentParentId}' in parents and mimeType='application/vnd.google-apps.folder' and trashed=false`;
      
      const response = await this.performRequest({
        method: 'GET',
        endpoint: `${this.baseUrl}/files`,
        headers: this.getAuthHeaders(),
        queryParams: {
          q: query,
          fields: 'files(id, name)'
        }
      });

      if (response.files.length === 0) {
        // Create the folder
        const folderMetadata = {
          name: folderName,
          mimeType: 'application/vnd.google-apps.folder',
          parents: [currentParentId]
        };

        const createResponse = await this.performRequest({
          method: 'POST',
          endpoint: `${this.baseUrl}/files`,
          headers: {
            ...this.getAuthHeaders(),
            'Content-Type': 'application/json'
          },
          body: folderMetadata
        });

        currentParentId = createResponse.id;
      } else {
        currentParentId = response.files[0].id;
      }
    }

    return currentParentId;
  }

  private getAuthHeaders(): Record<string, string> {
    return this.authUtils.createAuthHeaders(AuthType.OAUTH2, this.config.credentials);
  }

  private getActions(): ConnectorAction[] {
    return [
      {
        id: 'upload_file',
        name: 'Upload File',
        description: 'Upload a file to Google Drive',
        inputSchema: {
          driveId: {
            type: 'string',
            label: 'Drive',
            description: 'Select drive to upload to',
            loadOptionsResource: 'drives',
            loadOptionsDescription: 'Fetch available drives',
            default: 'root',
            order: 1
          },
          folderId: {
            type: 'string',
            label: 'Parent Folder',
            description: 'Select parent folder (optional)',
            loadOptionsResource: 'folders',
            loadOptionsDependsOn: ['driveId'],
            loadOptionsDescription: 'Fetch folders from selected drive',
            order: 2
          },
          inputSource: {
            type: 'select',
            label: 'Input Source',
            description: 'Choose where to get the file from',
            default: 'direct',
            options: [
              { label: 'Direct Content', value: 'direct' },
              { label: 'Binary Data from Previous Node', value: 'binary' }
            ],
            order: 3
          },
          fileName: {
            type: 'string',
            label: 'File Name',
            placeholder: 'example.pdf',
            description: 'Name of the file to upload (auto-detected from binary data if not specified)',
            displayOptions: {
              show: {
                inputSource: ['direct', 'binary']
              }
            },
            order: 4
          },
          content: {
            type: 'string',
            label: 'File Content',
            inputType: 'textarea',
            description: 'File content (text, buffer, or base64 string)',
            required: true,
            displayOptions: {
              show: {
                inputSource: ['direct']
              }
            },
            order: 5
          },
          binaryPropertyName: {
            type: 'string',
            label: 'Binary Property Name',
            placeholder: 'data',
            description: 'Name of the binary property from previous node (usually "data")',
            default: 'data',
            displayOptions: {
              show: {
                inputSource: ['binary']
              }
            },
            order: 6
          },
          mimeType: {
            type: 'string',
            label: 'MIME Type',
            placeholder: 'application/pdf',
            description: 'File MIME type (auto-detected from binary data if not specified)',
            displayOptions: {
              show: {
                inputSource: ['direct']
              }
            },
            order: 7
          },
          description: {
            type: 'string',
            label: 'Description',
            inputType: 'textarea',
            description: 'File description (optional)',
            order: 8
          }
        },
        outputSchema: {
          id: { type: 'string', description: 'Google Drive file ID' },
          name: { type: 'string', description: 'File name' },
          size: { type: 'string', description: 'File size' },
          mimeType: { type: 'string', description: 'File MIME type' },
          webViewLink: { type: 'string', description: 'Link to view file in browser' },
          webContentLink: { type: 'string', description: 'Link to download file' }
        }
      },
      {
        id: 'download_file',
        name: 'Download File',
        description: 'Download a file from Google Drive - supports all formats including MP4, AVI, MOV videos, images, PDFs, and documents',
        inputSchema: {
          inputMode: {
            type: 'select',
            label: 'Input Mode',
            description: 'Choose how to specify the file',
            required: true,
            options: [
              { label: 'Select from Dropdown', value: 'dropdown' },
              { label: 'Use File ID from Previous Node', value: 'expression' }
            ],
            default: 'dropdown',
            order: 1
          },
          fileId: {
            type: 'string',
            required: true,
            label: 'File',
            description: 'Select file to download',
            loadOptionsResource: 'files',
            loadOptionsDescription: 'Select from available files',
            displayOptions: {
              show: {
                inputMode: ['dropdown']
              }
            },
            order: 2
          },
          fileIdExpression: {
            type: 'string',
            required: true,
            label: 'File ID Expression',
            placeholder: '={{$node["File Created"].json.id}}',
            description: 'File ID from previous node output (e.g., trigger node)',
            inputType: 'text',
            displayOptions: {
              show: {
                inputMode: ['expression']
              }
            },
            order: 2
          },
          convertGoogleDocs: {
            type: 'boolean',
            label: 'Convert Google Docs',
            description: 'Convert Google native files (Docs, Sheets, Slides) to downloadable format. Keep FALSE for videos, images, PDFs',
            default: false,
            order: 3
          },
          conversionFormat: {
            type: 'select',
            label: 'Conversion Format',
            description: 'Format to convert Google native files (only used if Convert Google Docs is enabled)',
            options: [
              { label: 'PDF', value: 'application/pdf' },
              { label: 'Microsoft Word', value: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' },
              { label: 'Microsoft Excel', value: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' },
              { label: 'Microsoft PowerPoint', value: 'application/vnd.openxmlformats-officedocument.presentationml.presentation' },
              { label: 'HTML', value: 'text/html' },
              { label: 'Plain Text', value: 'text/plain' }
            ],
            default: 'application/pdf',
            displayOptions: {
              show: {
                convertGoogleDocs: [true]
              }
            },
            order: 4
          }
        },
        outputSchema: {
          data: { type: 'buffer', description: 'Binary file content (MP4 video, image, PDF, document, etc.) - automatically passed to next node as binary data' },
          fileName: { type: 'string', description: 'File name with extension (e.g., video.mp4)' },
          mimeType: { type: 'string', description: 'File MIME type (e.g., video/mp4, image/jpeg, application/pdf)' },
          size: { type: 'number', description: 'File size in bytes' }
        }
      },
      {
        id: 'list_files',
        name: 'Search Files',
        description: 'Search and list files in Google Drive',
        inputSchema: {
          driveId: {
            type: 'string',
            label: 'Drive',
            description: 'Select drive to search in',
            loadOptionsResource: 'drives',
            loadOptionsDescription: 'Fetch available drives',
            order: 1
          },
          folderId: {
            type: 'string',
            label: 'Folder',
            description: 'Search in specific folder (optional)',
            loadOptionsResource: 'folders',
            loadOptionsDependsOn: ['driveId'],
            loadOptionsDescription: 'Fetch folders from selected drive',
            order: 2
          },
          searchQuery: {
            type: 'string',
            label: 'Search Query',
            placeholder: 'name contains "report"',
            description: 'Google Drive query string (optional, advanced)',
            order: 3
          },
          fileTypes: {
            type: 'select',
            label: 'File Type Filter',
            description: 'Filter by file type',
            options: [
              { label: 'All Files', value: 'all' },
              { label: 'Folders Only', value: 'folder' },
              { label: 'Documents', value: 'document' },
              { label: 'Spreadsheets', value: 'spreadsheet' },
              { label: 'Presentations', value: 'presentation' },
              { label: 'Images', value: 'image' },
              { label: 'Videos', value: 'video' },
              { label: 'PDFs', value: 'pdf' }
            ],
            default: 'all',
            order: 4
          },
          includeTrashed: {
            type: 'boolean',
            label: 'Include Trashed Files',
            description: 'Include files in trash',
            default: false,
            order: 5
          },
          limit: {
            type: 'number',
            label: 'Limit',
            description: 'Maximum number of files to return',
            default: 100,
            min: 1,
            max: 1000,
            order: 6
          }
        },
        outputSchema: {
          files: { type: 'array', description: 'List of files and folders' },
          nextPageToken: { type: 'string', description: 'Token for next page' }
        }
      },
      {
        id: 'delete_file',
        name: 'Delete File',
        description: 'Delete or trash a file from Google Drive',
        inputSchema: {
          fileId: {
            type: 'string',
            required: true,
            label: 'File',
            description: 'Select file to delete',
            loadOptionsResource: 'files',
            loadOptionsDescription: 'Fetch files from drive',
            order: 1
          },
          permanentDelete: {
            type: 'boolean',
            label: 'Permanent Delete',
            description: 'Permanently delete (true) or move to trash (false)',
            default: false,
            order: 2
          }
        },
        outputSchema: {
          deleted: { type: 'boolean', description: 'Whether file was deleted successfully' },
          fileId: { type: 'string', description: 'ID of deleted file' }
        }
      },
      {
        id: 'create_directory',
        name: 'Create Folder',
        description: 'Create a new folder in Google Drive',
        inputSchema: {
          driveId: {
            type: 'string',
            required: true,
            label: 'Drive',
            description: 'Select drive to create folder in',
            loadOptionsResource: 'drives',
            loadOptionsDescription: 'Fetch available drives',
            default: 'root',
            order: 1
          },
          parentFolderId: {
            type: 'string',
            label: 'Parent Folder',
            description: 'Select parent folder (optional, defaults to root)',
            loadOptionsResource: 'folders',
            loadOptionsDependsOn: ['driveId'],
            loadOptionsDescription: 'Fetch folders from selected drive',
            order: 2
          },
          folderName: {
            type: 'string',
            required: true,
            label: 'Folder Name',
            placeholder: 'My Folder',
            description: 'Name of the folder to create',
            order: 3
          },
          folderColor: {
            type: 'select',
            label: 'Folder Color',
            description: 'Folder color (optional)',
            options: [
              { label: 'Default', value: '' },
              { label: 'Red', value: '#ac725e' },
              { label: 'Orange', value: '#d06b64' },
              { label: 'Yellow', value: '#f83a22' },
              { label: 'Green', value: '#16a765' },
              { label: 'Teal', value: '#42d692' },
              { label: 'Blue', value: '#4986e7' },
              { label: 'Purple', value: '#9a9cff' },
              { label: 'Pink', value: '#b99aff' },
              { label: 'Gray', value: '#8f8f8f' }
            ],
            default: '',
            order: 4
          }
        },
        outputSchema: {
          id: { type: 'string', description: 'Folder ID' },
          name: { type: 'string', description: 'Folder name' },
          webViewLink: { type: 'string', description: 'Link to view folder in browser' }
        }
      },
      {
        id: 'share_file',
        name: 'Share File',
        description: 'Share a file or folder and get shareable link',
        inputSchema: {
          fileId: {
            type: 'string',
            required: true,
            label: 'File/Folder',
            description: 'Select file or folder to share',
            loadOptionsResource: 'files',
            loadOptionsDescription: 'Fetch files from drive',
            order: 1
          },
          permissionType: {
            type: 'select',
            required: true,
            label: 'Share With',
            description: 'Who can access this file',
            options: [
              { label: 'Anyone with the link', value: 'anyone' },
              { label: 'Specific people (email)', value: 'user' },
              { label: 'Group (email)', value: 'group' },
              { label: 'Domain', value: 'domain' }
            ],
            default: 'anyone',
            order: 2
          },
          role: {
            type: 'select',
            required: true,
            label: 'Role',
            description: 'Permission level',
            options: [
              { label: 'Viewer (can view only)', value: 'reader' },
              { label: 'Commenter (can comment)', value: 'commenter' },
              { label: 'Editor (can edit)', value: 'writer' }
            ],
            default: 'reader',
            order: 3
          },
          emailAddress: {
            type: 'string',
            label: 'Email Address',
            placeholder: 'user@example.com',
            description: 'Email address (required for user/group type)',
            order: 4
          },
          domain: {
            type: 'string',
            label: 'Domain',
            placeholder: 'example.com',
            description: 'Domain name (required for domain type)',
            order: 5
          },
          sendNotificationEmail: {
            type: 'boolean',
            label: 'Send Notification Email',
            description: 'Send email notification to the user',
            default: true,
            order: 6
          },
          emailMessage: {
            type: 'string',
            label: 'Email Message',
            inputType: 'textarea',
            description: 'Custom message in notification email',
            order: 7
          }
        },
        outputSchema: {
          shareableLink: { type: 'string', description: 'Shareable link to the file' },
          permissionId: { type: 'string', description: 'Permission ID' }
        }
      },
      {
        id: 'get_file_metadata',
        name: 'Get File Metadata',
        description: 'Get detailed metadata about a file or folder',
        inputSchema: {
          fileId: {
            type: 'string',
            required: true,
            label: 'File/Folder',
            description: 'Select file or folder',
            loadOptionsResource: 'files',
            loadOptionsDescription: 'Fetch files from drive',
            order: 1
          }
        },
        outputSchema: {
          id: { type: 'string', description: 'File ID' },
          name: { type: 'string', description: 'File name' },
          mimeType: { type: 'string', description: 'MIME type' },
          size: { type: 'string', description: 'File size' },
          createdTime: { type: 'string', description: 'Creation timestamp' },
          modifiedTime: { type: 'string', description: 'Last modified timestamp' },
          webViewLink: { type: 'string', description: 'Web view link' },
          webContentLink: { type: 'string', description: 'Download link' },
          owners: { type: 'array', description: 'File owners' },
          permissions: { type: 'array', description: 'File permissions' }
        }
      }
    ];
  }

  private getTriggers(): ConnectorTrigger[] {
    return [
      {
        id: 'file_created',
        name: 'File Created',
        description: 'Triggered when a new file is created',
        eventType: 'sync',
        outputSchema: {
          id: { type: 'string', description: 'File ID - use this to download or access the file' },
          name: { type: 'string', description: 'File name including extension' },
          mimeType: { type: 'string', description: 'File MIME type (e.g., video/mp4, image/jpeg)' },
          size: { type: 'number', description: 'File size in bytes' },
          createdTime: { type: 'string', description: 'Creation timestamp (ISO 8601)' },
          modifiedTime: { type: 'string', description: 'Last modified timestamp (ISO 8601)' },
          webViewLink: { type: 'string', description: 'Link to view file in Google Drive' },
          webContentLink: { type: 'string', description: 'Link to download file content' },
          owners: { type: 'array', description: 'Array of file owners' },
          parents: { type: 'array', description: 'Parent folder IDs' },
          kind: { type: 'string', description: 'Resource kind (drive#file)' }
        },
        webhookRequired: true
      },
      {
        id: 'file_updated',
        name: 'File Updated',
        description: 'Triggered when a file is modified',
        eventType: 'sync',
        outputSchema: {
          id: { type: 'string', description: 'File ID - use this to download or access the file' },
          name: { type: 'string', description: 'File name including extension' },
          mimeType: { type: 'string', description: 'File MIME type (e.g., video/mp4, image/jpeg)' },
          size: { type: 'number', description: 'File size in bytes' },
          createdTime: { type: 'string', description: 'Creation timestamp (ISO 8601)' },
          modifiedTime: { type: 'string', description: 'Last modified timestamp (ISO 8601)' },
          webViewLink: { type: 'string', description: 'Link to view file in Google Drive' },
          webContentLink: { type: 'string', description: 'Link to download file content' },
          owners: { type: 'array', description: 'Array of file owners' },
          parents: { type: 'array', description: 'Parent folder IDs' },
          kind: { type: 'string', description: 'Resource kind (drive#file)' }
        },
        webhookRequired: true
      },
      {
        id: 'file_deleted',
        name: 'File Deleted',
        description: 'Triggered when a file is deleted',
        eventType: 'sync',
        outputSchema: {
          id: { type: 'string', description: 'File ID of deleted file' },
          name: { type: 'string', description: 'File name that was deleted' }
        },
        webhookRequired: true
      }
    ];
  }

  // ============= Resource Loading Methods for Dynamic UI =============

  /**
   * Fetch list of drives (My Drive + Shared Drives)
   */
  async getDrives(): Promise<Array<{ label: string; value: string }>> {
    try {
      const drives = [
        { label: 'My Drive', value: 'root' }
      ];

      // Fetch shared drives
      const response = await this.performRequest({
        method: 'GET',
        endpoint: `${this.baseUrl}/drives`,
        headers: this.getAuthHeaders(),
        queryParams: {
          pageSize: 100,
          fields: 'drives(id, name)'
        }
      });

      if (response.drives && response.drives.length > 0) {
        response.drives.forEach((drive: any) => {
          drives.push({
            label: drive.name,
            value: drive.id
          });
        });
      }

      return drives;
    } catch (error) {
      this.logger.error('Failed to fetch drives:', error);
      return [{ label: 'My Drive', value: 'root' }];
    }
  }

  /**
   * Fetch folders from a specific drive or parent folder
   */
  async getFolders(driveId?: string, parentFolderId?: string): Promise<Array<{ label: string; value: string }>> {
    try {
      this.logger.log(`🔍 getFolders called with driveId: ${driveId}, parentFolderId: ${parentFolderId}`);

      let query = "mimeType='application/vnd.google-apps.folder' and trashed=false";

      if (parentFolderId) {
        query += ` and '${parentFolderId}' in parents`;
        this.logger.log(`   Query mode: Folders in specific parent folder ${parentFolderId}`);
      } else if (driveId && driveId !== 'root') {
        query += ` and '${driveId}' in parents`;
        this.logger.log(`   Query mode: Folders in shared drive ${driveId}`);
      } else {
        query += " and 'root' in parents";
        this.logger.log(`   Query mode: Folders in My Drive root`);
      }

      this.logger.log(`   Google Drive Query: ${query}`);

      const response = await this.performRequest({
        method: 'GET',
        endpoint: `${this.baseUrl}/files`,
        headers: this.getAuthHeaders(),
        queryParams: {
          q: query,
          pageSize: 100,
          fields: 'files(id, name)',
          orderBy: 'name',
          supportsAllDrives: true,
          includeItemsFromAllDrives: true
        }
      });

      this.logger.log(`   Google Drive API Response: ${JSON.stringify(response).substring(0, 200)}`);

      if (!response.files || response.files.length === 0) {
        this.logger.warn(`   ⚠️  No folders found (empty response)`);
        return [];
      }

      const folders = response.files.map((folder: any) => ({
        label: folder.name,
        value: folder.id
      }));

      this.logger.log(`   ✅ Found ${folders.length} folders`);
      this.logger.log(`   Sample folders: ${JSON.stringify(folders.slice(0, 3))}`);

      return folders;
    } catch (error) {
      this.logger.error(`❌ Failed to fetch folders (driveId: ${driveId}, parentFolderId: ${parentFolderId}):`, error);
      this.logger.error(`   Error message: ${error.message}`);
      if (error.response) {
        this.logger.error(`   API Response: ${JSON.stringify(error.response.data)}`);
      }
      return [];
    }
  }

  /**
   * Fetch files from a specific folder
   */
  async getFilesInFolder(folderId?: string): Promise<Array<{ label: string; value: string }>> {
    try {
      let query = "mimeType!='application/vnd.google-apps.folder' and trashed=false";

      if (folderId) {
        query += ` and '${folderId}' in parents`;
      } else {
        query += " and 'root' in parents";
      }

      const response = await this.performRequest({
        method: 'GET',
        endpoint: `${this.baseUrl}/files`,
        headers: this.getAuthHeaders(),
        queryParams: {
          q: query,
          pageSize: 100,
          fields: 'files(id, name, mimeType)',
          orderBy: 'name',
          supportsAllDrives: true,
          includeItemsFromAllDrives: true
        }
      });

      if (!response.files || response.files.length === 0) {
        return [];
      }

      return response.files.map((file: any) => ({
        label: file.name,
        value: file.id
      }));
    } catch (error) {
      this.logger.error('Failed to fetch files:', error);
      return [];
    }
  }
}