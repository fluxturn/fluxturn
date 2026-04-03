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
import { Dropbox, DropboxAuth, DropboxResponse } from 'dropbox';

interface DropboxFileMetadata {
  name: string;
  path_lower: string;
  path_display: string;
  id: string;
  client_modified: string;
  server_modified: string;
  size: number;
  content_hash?: string;
  media_info?: any;
  sharing_info?: any;
}

interface DropboxFolderMetadata {
  name: string;
  path_lower: string;
  path_display: string;
  id: string;
  sharing_info?: any;
}

interface DropboxSearchMatch {
  match_type: {
    '.tag': string;
  };
  metadata: DropboxFileMetadata | DropboxFolderMetadata;
}

interface ShareLinkSettings {
  access?: 'viewer' | 'editor';
  password?: string;
  expires?: Date;
  audience?: 'public' | 'team' | 'members';
  allow_download?: boolean;
}

@Injectable()
export class DropboxConnector extends BaseConnector implements IStorageConnector {
  private client: Dropbox;
  private accessToken: string | undefined;

  constructor(
    private readonly authUtils: AuthUtils,
    private readonly apiUtils: ApiUtils
  ) {
    super();
  }

  getMetadata(): ConnectorMetadata {
    return {
      name: 'Dropbox',
      description: 'Dropbox cloud storage and file management',
      version: '1.0.0',
      category: ConnectorCategory.STORAGE,
      type: ConnectorType.DROPBOX,
      logoUrl: 'https://www.dropbox.com/static/30168/images/favicon.ico',
      documentationUrl: 'https://www.dropbox.com/developers/documentation',
      authType: AuthType.OAUTH2,
      requiredScopes: [
        'files.content.read',
        'files.content.write',
        'files.metadata.read',
        'files.metadata.write',
        'sharing.read',
        'sharing.write'
      ],
      actions: this.getActions(),
      triggers: this.getTriggers(),
      rateLimit: {
        requestsPerSecond: 5,
        requestsPerMinute: 200,
        requestsPerDay: 100000
      },
      webhookSupport: true
    };
  }

  protected async initializeConnection(): Promise<void> {
    try {
      const credentials = this.config.credentials;
      const authMode = credentials.authMode || 'accessToken';

      // Determine access token based on auth mode
      if (authMode === 'accessToken' || credentials.accessToken) {
        // Direct access token mode - use provided token
        this.accessToken = credentials.accessToken || credentials.access_token;

        if (!this.accessToken) {
          throw new Error('Access token is required for Dropbox connection');
        }

        this.logger.debug(`Using direct access token authentication (mode: ${authMode})`);
      } else if (authMode === 'oauth2') {
        // OAuth2 mode - token should be obtained via OAuth flow
        // The access_token would be set after OAuth callback
        this.accessToken = credentials.access_token || credentials.accessToken;

        if (!this.accessToken) {
          throw new Error('OAuth2 flow not completed. Please authorize the connection first.');
        }

        this.logger.debug('Using OAuth2 authentication');
      }

      this.client = new Dropbox({
        accessToken: this.accessToken,
        fetch: fetch
      });

      // Test the connection
      await this.client.usersGetCurrentAccount();
      this.logger.log('Dropbox connector initialized successfully');
    } catch (error) {
      throw new Error(`Dropbox connection failed: ${error.message}`);
    }
  }

  protected async performConnectionTest(): Promise<boolean> {
    try {
      await this.client.usersGetCurrentAccount();
      return true;
    } catch (error) {
      return false;
    }
  }

  protected async performHealthCheck(): Promise<void> {
    try {
      const response = await this.client.usersGetCurrentAccount();
      if (!response.result.account_id) {
        throw new Error('Dropbox health check failed: Unable to get account info');
      }
    } catch (error) {
      throw new Error(`Dropbox health check failed: ${error.message}`);
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
      // Definition-aligned action IDs
      case 'file_upload':
        return this.uploadFile(input.path || input.filePath, input.content || input.binaryData, input.metadata || { mode: input.mode, autorename: input.autorename });
      case 'file_download':
        return this.downloadFile(input.path || input.filePath);
      case 'file_delete':
        return this.deleteFile(input.path || input.filePath);
      case 'file_copy':
        return this.copyFile(input.fromPath, input.toPath);
      case 'file_move':
        return this.moveFile(input.fromPath, input.toPath);
      case 'file_search':
        return this.searchFiles(input.query, { path: input.path, maxResults: input.maxResults, filenameOnly: input.filenameOnly });
      case 'folder_create':
        return this.createFolder(input.path || input.folderPath);
      case 'folder_list':
        return this.listFiles(input.path, { pageSize: input.limit, filters: { recursive: input.recursive, includeDeleted: input.includeDeleted } });
      // Legacy action IDs (for backward compatibility)
      case 'upload_file':
        return this.uploadFile(input.filePath, input.content, input.metadata);
      case 'download_file':
        return this.downloadFile(input.filePath);
      case 'delete_file':
        return this.deleteFile(input.filePath);
      case 'create_folder':
        return this.createFolder(input.folderPath);
      case 'share_link':
        return this.shareLink(input.filePath, input.settings);
      case 'search_files':
        return this.searchFiles(input.query, input.options);
      case 'move_file':
        return this.moveFile(input.fromPath, input.toPath);
      case 'copy_file':
        return this.copyFile(input.fromPath, input.toPath);
      case 'get_metadata':
        return this.getFileMetadataDetails(input.filePath);
      default:
        throw new Error(`Unknown action: ${actionId}`);
    }
  }

  protected async cleanup(): Promise<void> {
    this.logger.log('Dropbox connector cleanup completed');
  }

  // Core Dropbox methods
  async uploadFile(filePath: string, content: Buffer | string, metadata?: any): Promise<ConnectorResponse> {
    try {
      const path = this.normalizePath(filePath);
      const fileContent = Buffer.isBuffer(content) ? content : Buffer.from(content, 'utf8');
      
      // For large files, use upload session
      if (fileContent.length > 8 * 1024 * 1024) { // 8MB threshold
        const result = await this.uploadLargeFile(path, fileContent, metadata);
        if (!result) {
          throw new Error('Upload failed');
        }
        return result;
      }

      const uploadArgs = {
        path,
        mode: metadata?.mode || { '.tag': 'add' },
        autorename: metadata?.autorename || false,
        client_modified: metadata?.clientModified ? (typeof metadata.clientModified === 'string' ? metadata.clientModified : new Date(metadata.clientModified).toISOString()) : undefined,
        mute: metadata?.mute || false,
        strict_conflict: metadata?.strictConflict || false
      };

      const response = await this.client.filesUpload({
        ...uploadArgs,
        contents: fileContent
      });

      return {
        success: true,
        data: {
          name: response.result.name,
          path: response.result.path_display,
          id: response.result.id,
          size: response.result.size,
          hash: response.result.content_hash,
          clientModified: response.result.client_modified,
          serverModified: response.result.server_modified
        },
        metadata: {
          timestamp: new Date()
        }
      };
    } catch (error) {
      return this.handleError(error as any, 'Failed to upload file');
    }
  }

  async downloadFile(filePath: string): Promise<ConnectorResponse<Buffer>> {
    try {
      const path = this.normalizePath(filePath);
      
      const response = await this.client.filesDownload({ path });
      const fileBlob = (response.result as any).fileBinary;
      
      // Convert to Buffer
      const buffer = Buffer.from(await fileBlob.arrayBuffer());

      return {
        success: true,
        data: buffer,
        metadata: {
          timestamp: new Date()
        }
      };
    } catch (error) {
      return this.handleError(error as any, 'Failed to download file');
    }
  }

  async deleteFile(filePath: string): Promise<ConnectorResponse> {
    try {
      const path = this.normalizePath(filePath);
      
      const response = await this.client.filesDeleteV2({ path });

      return {
        success: true,
        data: {
          deleted: true,
          path: path,
          metadata: response.result.metadata
        },
        metadata: {
          timestamp: new Date()
        }
      };
    } catch (error) {
      return this.handleError(error as any, 'Failed to delete file');
    }
  }

  async createFolder(folderPath: string): Promise<ConnectorResponse> {
    try {
      const path = this.normalizePath(folderPath);
      
      const response = await this.client.filesCreateFolderV2({
        path,
        autorename: false
      });

      return {
        success: true,
        data: {
          name: response.result.metadata.name,
          path: response.result.metadata.path_display,
          id: response.result.metadata.id
        },
        metadata: {
          timestamp: new Date()
        }
      };
    } catch (error) {
      return this.handleError(error as any, 'Failed to create folder');
    }
  }

  async shareLink(filePath: string, settings?: ShareLinkSettings): Promise<ConnectorResponse<string>> {
    try {
      const path = this.normalizePath(filePath);
      
      const shareSettings: any = {
        access: settings?.access || 'viewer',
        password: settings?.password,
        expires: settings?.expires ? (typeof settings.expires === 'string' ? settings.expires : settings.expires.toISOString()) : undefined,
        audience: settings?.audience || 'public',
        allow_download: settings?.allow_download !== false
      };

      const response = await this.client.sharingCreateSharedLinkWithSettings({
        path,
        settings: shareSettings
      });

      return {
        success: true,
        data: response.result.url,
        metadata: {
          timestamp: new Date()
        }
      };
    } catch (error) {
      return this.handleError(error as any, 'Failed to create share link');
    }
  }

  async searchFiles(query: string, options?: any): Promise<ConnectorResponse> {
    try {
      const searchArgs = {
        query,
        options: {
          path: options?.path || '',
          max_results: options?.maxResults || 100,
          order_by: options?.orderBy || { '.tag': 'relevance' },
          file_status: options?.fileStatus || { '.tag': 'active' },
          filename_only: options?.filenameOnly || false
        }
      };

      const response = await this.client.filesSearchV2(searchArgs);

      const matches = response.result.matches.map((match: any) => ({
        matchType: match.match_type['.tag'],
        metadata: match.metadata
      }));

      return {
        success: true,
        data: {
          matches,
          hasMore: response.result.has_more,
          cursor: response.result.cursor
        },
        metadata: {
          timestamp: new Date()
        }
      };
    } catch (error) {
      return this.handleError(error as any, 'Failed to search files');
    }
  }

  async moveFile(fromPath: string, toPath: string): Promise<ConnectorResponse> {
    try {
      const fromPathNormalized = this.normalizePath(fromPath);
      const toPathNormalized = this.normalizePath(toPath);
      
      const response = await this.client.filesMoveV2({
        from_path: fromPathNormalized,
        to_path: toPathNormalized,
        allow_shared_folder: false,
        autorename: false,
        allow_ownership_transfer: false
      });

      return {
        success: true,
        data: {
          moved: true,
          fromPath: fromPathNormalized,
          toPath: toPathNormalized,
          metadata: response.result.metadata
        },
        metadata: {
          timestamp: new Date()
        }
      };
    } catch (error) {
      return this.handleError(error as any, 'Failed to move file');
    }
  }

  async copyFile(fromPath: string, toPath: string): Promise<ConnectorResponse> {
    try {
      const fromPathNormalized = this.normalizePath(fromPath);
      const toPathNormalized = this.normalizePath(toPath);
      
      const response = await this.client.filesCopyV2({
        from_path: fromPathNormalized,
        to_path: toPathNormalized,
        allow_shared_folder: false,
        autorename: false,
        allow_ownership_transfer: false
      });

      return {
        success: true,
        data: {
          copied: true,
          fromPath: fromPathNormalized,
          toPath: toPathNormalized,
          metadata: response.result.metadata
        },
        metadata: {
          timestamp: new Date()
        }
      };
    } catch (error) {
      return this.handleError(error as any, 'Failed to copy file');
    }
  }

  async getFileMetadataDetails(filePath: string): Promise<ConnectorResponse> {
    try {
      const path = this.normalizePath(filePath);
      
      const response = await this.client.filesGetMetadata({
        path,
        include_media_info: true,
        include_deleted: false,
        include_has_explicit_shared_members: true
      });

      return {
        success: true,
        data: response.result,
        metadata: {
          timestamp: new Date()
        }
      };
    } catch (error) {
      return this.handleError(error as any, 'Failed to get metadata');
    }
  }

  // IStorageConnector implementation
  async listFiles(directoryPath?: string, options?: PaginatedRequest): Promise<ConnectorResponse> {
    try {
      const path = directoryPath ? this.normalizePath(directoryPath) : '';
      
      const listArgs = {
        path,
        recursive: options?.filters?.recursive || false,
        include_media_info: options?.filters?.includeMediaInfo || false,
        include_deleted: options?.filters?.includeDeleted || false,
        include_has_explicit_shared_members: options?.filters?.includeSharedMembers || false,
        limit: options?.pageSize || 100
      };

      const response = await this.client.filesListFolder(listArgs);

      // Continue fetching if there are more results
      let allEntries = [...response.result.entries];
      let cursor = response.result.cursor;

      while (response.result.has_more && options?.filters?.fetchAll) {
        const continueResponse = await this.client.filesListFolderContinue({ cursor });
        allEntries.push(...continueResponse.result.entries);
        cursor = continueResponse.result.cursor;
        
        if (!continueResponse.result.has_more) break;
      }

      return {
        success: true,
        data: {
          entries: allEntries,
          hasMore: response.result.has_more,
          cursor: cursor,
          pagination: {
            page: 0,
            pageSize: allEntries.length,
            total: 0,
            hasNext: response.result.has_more
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

  async createDirectory(directoryPath: string): Promise<ConnectorResponse> {
    return this.createFolder(directoryPath);
  }

  async getFileMetadata(filePath: string): Promise<ConnectorResponse> {
    return this.getFileMetadataDetails(filePath);
  }

  async shareFile(filePath: string, permissions?: any): Promise<ConnectorResponse<string>> {
    const settings: ShareLinkSettings = {
      access: permissions?.access || 'viewer',
      password: permissions?.password,
      expires: permissions?.expires ? (typeof permissions.expires === 'string' ? permissions.expires : new Date(permissions.expires).toISOString()) : undefined,
      audience: permissions?.audience || 'public',
      allow_download: permissions?.allowDownload !== false
    };
    
    return this.shareLink(filePath, settings);
  }

  // Helper methods
  private async uploadLargeFile(path: string, content: Buffer, metadata?: any): Promise<ConnectorResponse | undefined> {
    try {
      const chunkSize = 8 * 1024 * 1024; // 8MB chunks
      let offset = 0;
      
      // Start upload session
      const sessionStartResponse = await this.client.filesUploadSessionStart({
        contents: content.slice(0, Math.min(chunkSize, content.length))
      });
      
      const sessionId = sessionStartResponse.result.session_id;
      offset += Math.min(chunkSize, content.length);

      // Upload remaining chunks
      while (offset < content.length) {
        const chunk = content.slice(offset, Math.min(offset + chunkSize, content.length));
        const isLastChunk = offset + chunk.length >= content.length;
        
        if (isLastChunk) {
          // Finish upload session
          const finishResponse = await this.client.filesUploadSessionFinish({
            cursor: {
              session_id: sessionId,
              offset: offset
            },
            commit: {
              path,
              mode: metadata?.mode || { '.tag': 'add' },
              autorename: metadata?.autorename || false,
              client_modified: metadata?.clientModified ? (typeof metadata.clientModified === 'string' ? metadata.clientModified : new Date(metadata.clientModified).toISOString()) : undefined,
              mute: metadata?.mute || false
            },
            contents: chunk
          });

          return {
            success: true,
            data: {
              name: finishResponse.result.name,
              path: finishResponse.result.path_display,
              id: finishResponse.result.id,
              size: finishResponse.result.size,
              hash: finishResponse.result.content_hash,
              clientModified: finishResponse.result.client_modified,
              serverModified: finishResponse.result.server_modified
            },
            metadata: {
              timestamp: new Date()
            }
          };
        } else {
          // Append to session
          await this.client.filesUploadSessionAppendV2({
            cursor: {
              session_id: sessionId,
              offset: offset
            },
            contents: chunk
          });
          
          offset += chunk.length;
        }
      }
    } catch (error) {
      return this.handleError(error as any, 'Failed to upload large file');
    }
  }

  private normalizePath(path: string): string {
    // Dropbox paths must start with / and not end with /
    if (!path.startsWith('/')) {
      path = '/' + path;
    }
    if (path.length > 1 && path.endsWith('/')) {
      path = path.slice(0, -1);
    }
    return path;
  }

  private getActions(): ConnectorAction[] {
    return [
      {
        id: 'file_upload',
        name: 'Upload File',
        description: 'Upload a file to Dropbox',
        inputSchema: {
          path: { type: 'string', required: true, description: 'Dropbox file path' },
          content: { type: 'string', required: true, description: 'File content as buffer or string' },
          mode: { type: 'string', description: 'Upload mode: add, overwrite, update' },
          autorename: { type: 'boolean', description: 'Auto rename if file exists' }
        },
        outputSchema: {
          name: { type: 'string', description: 'File name' },
          path: { type: 'string', description: 'Dropbox file path' },
          id: { type: 'string', description: 'Dropbox file ID' },
          size: { type: 'number', description: 'File size in bytes' }
        }
      },
      {
        id: 'file_download',
        name: 'Download File',
        description: 'Download a file from Dropbox',
        inputSchema: {
          path: { type: 'string', required: true, description: 'Dropbox file path' }
        },
        outputSchema: {
          content: { type: 'string', description: 'File content as buffer' }
        }
      },
      {
        id: 'file_delete',
        name: 'Delete File/Folder',
        description: 'Delete a file or folder from Dropbox',
        inputSchema: {
          path: { type: 'string', required: true, description: 'Path to file or folder to delete' }
        },
        outputSchema: {
          deleted: { type: 'boolean', description: 'Whether deletion was successful' },
          path: { type: 'string', description: 'Deleted path' }
        }
      },
      {
        id: 'file_copy',
        name: 'Copy File',
        description: 'Copy a file to another location',
        inputSchema: {
          fromPath: { type: 'string', required: true, description: 'Source path' },
          toPath: { type: 'string', required: true, description: 'Destination path' }
        },
        outputSchema: {
          copied: { type: 'boolean', description: 'Whether file was copied successfully' }
        }
      },
      {
        id: 'file_move',
        name: 'Move File',
        description: 'Move a file to another location',
        inputSchema: {
          fromPath: { type: 'string', required: true, description: 'Source path' },
          toPath: { type: 'string', required: true, description: 'Destination path' }
        },
        outputSchema: {
          moved: { type: 'boolean', description: 'Whether file was moved successfully' }
        }
      },
      {
        id: 'file_search',
        name: 'Search Files',
        description: 'Search for files in Dropbox',
        inputSchema: {
          query: { type: 'string', required: true, description: 'Search query' },
          path: { type: 'string', description: 'Path to search in' },
          maxResults: { type: 'number', description: 'Maximum results to return' },
          filenameOnly: { type: 'boolean', description: 'Search filenames only' }
        },
        outputSchema: {
          matches: { type: 'array', description: 'Search results' },
          hasMore: { type: 'boolean', description: 'Whether there are more results' }
        }
      },
      {
        id: 'folder_create',
        name: 'Create Folder',
        description: 'Create a new folder in Dropbox',
        inputSchema: {
          path: { type: 'string', required: true, description: 'Dropbox folder path' }
        },
        outputSchema: {
          name: { type: 'string', description: 'Folder name' },
          path: { type: 'string', description: 'Dropbox folder path' },
          id: { type: 'string', description: 'Dropbox folder ID' }
        }
      },
      {
        id: 'folder_list',
        name: 'List Folder Contents',
        description: 'List files and folders in a directory',
        inputSchema: {
          path: { type: 'string', description: 'Folder path (empty for root)' },
          recursive: { type: 'boolean', description: 'List recursively' },
          includeDeleted: { type: 'boolean', description: 'Include deleted files' },
          limit: { type: 'number', description: 'Maximum items to return' }
        },
        outputSchema: {
          entries: { type: 'array', description: 'Files and folders' },
          hasMore: { type: 'boolean', description: 'Whether there are more results' }
        }
      }
    ];
  }

  private getTriggers(): ConnectorTrigger[] {
    return [
      {
        id: 'file_added',
        name: 'On File Added',
        description: 'Triggers when a new file is added to a folder (polling)',
        eventType: 'file_added',
        pollingEnabled: true,
        webhookRequired: false,
        inputSchema: {
          path: { type: 'string', required: true, description: 'Folder path to monitor' },
          recursive: { type: 'boolean', description: 'Watch subfolders' },
          pollInterval: { type: 'number', description: 'Poll interval in minutes' }
        },
        outputSchema: {
          id: { type: 'string', description: 'File ID' },
          name: { type: 'string', description: 'File name' },
          path_display: { type: 'string', description: 'Full file path' },
          size: { type: 'number', description: 'File size in bytes' },
          client_modified: { type: 'string', description: 'Last modification time' },
          server_modified: { type: 'string', description: 'Server modification time' }
        }
      },
      {
        id: 'file_modified',
        name: 'On File Modified',
        description: 'Triggers when a file is modified (polling)',
        eventType: 'file_modified',
        pollingEnabled: true,
        webhookRequired: false,
        inputSchema: {
          path: { type: 'string', required: true, description: 'Folder path to monitor' },
          recursive: { type: 'boolean', description: 'Watch subfolders' },
          pollInterval: { type: 'number', description: 'Poll interval in minutes' }
        },
        outputSchema: {
          id: { type: 'string', description: 'File ID' },
          name: { type: 'string', description: 'File name' },
          path_display: { type: 'string', description: 'Full file path' },
          size: { type: 'number', description: 'File size in bytes' },
          client_modified: { type: 'string', description: 'Last modification time' },
          server_modified: { type: 'string', description: 'Server modification time' }
        }
      }
    ];
  }
}