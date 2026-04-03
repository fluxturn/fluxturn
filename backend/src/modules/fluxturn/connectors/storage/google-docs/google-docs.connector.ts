import { Injectable } from '@nestjs/common';
import { BaseConnector } from '../../base/base.connector';
import { IConnector } from '../../base/connector.interface';
import {
  ConnectorMetadata,
  ConnectorType,
  ConnectorCategory,
  ConnectorRequest,
  ConnectorResponse,
  AuthType,
  ConnectorAction,
  ConnectorTrigger,
  OAuthTokens
} from '../../types';
import { AuthUtils } from '../../utils/auth.utils';
import { ApiUtils } from '../../utils/api.utils';
import { GoogleOAuthService } from '../../services/google-oauth.service';

// Google Docs-specific interfaces
export interface DocsCreateRequest {
  title: string;
  content?: string;
}

export interface DocsGetRequest {
  documentId: string;
  suggestionsViewMode?: string;
}

export interface DocsAppendTextRequest {
  documentId: string;
  text: string;
}

export interface DocsInsertTextRequest {
  documentId: string;
  text: string;
  index: number;
}

export interface DocsReplaceTextRequest {
  documentId: string;
  findText: string;
  replaceText: string;
  matchCase?: boolean;
}

export interface DocsDeleteContentRequest {
  documentId: string;
  startIndex: number;
  endIndex: number;
}

export interface DocsFormatTextRequest {
  documentId: string;
  startIndex: number;
  endIndex: number;
  bold?: boolean;
  italic?: boolean;
  underline?: boolean;
  fontSize?: number;
  foregroundColor?: string;
  backgroundColor?: string;
}

export interface DocsInsertTableRequest {
  documentId: string;
  index: number;
  rows: number;
  columns: number;
}

export interface DocsInsertImageRequest {
  documentId: string;
  imageUrl: string;
  index: number;
  width?: number;
  height?: number;
}

export interface DocsCreateNamedRangeRequest {
  documentId: string;
  name: string;
  startIndex: number;
  endIndex: number;
}

@Injectable()
export class GoogleDocsConnector extends BaseConnector implements IConnector {
  private baseUrl = 'https://docs.googleapis.com/v1';
  private driveBaseUrl = 'https://www.googleapis.com/drive/v3';

  constructor(
    private readonly authUtils: AuthUtils,
    private readonly apiUtils: ApiUtils,
    private readonly googleOAuthService: GoogleOAuthService
  ) {
    super();
  }

  getMetadata(): ConnectorMetadata {
    return {
      name: 'Google Docs',
      description: 'Create, edit, and manage Google Docs documents',
      version: '1.0.0',
      category: ConnectorCategory.STORAGE,
      type: ConnectorType.GOOGLE_DOCS,
      logoUrl: 'https://ssl.gstatic.com/docs/documents/images/kix-favicon7.ico',
      documentationUrl: 'https://developers.google.com/docs/api',
      authType: AuthType.OAUTH2,
      requiredScopes: [
        'https://www.googleapis.com/auth/documents',
        'https://www.googleapis.com/auth/drive.file',
        'https://www.googleapis.com/auth/drive.readonly'
      ],
      actions: this.getActions(),
      triggers: this.getTriggers(),
      rateLimit: {
        requestsPerSecond: 10,
        requestsPerMinute: 600
      },
      webhookSupport: false
    };
  }

  protected async initializeConnection(): Promise<void> {
    try {
      // Log credentials for debugging (without exposing sensitive data)
      this.logger.log('Initializing Google Docs connector with credentials:', {
        hasAccessToken: !!this.config.credentials.accessToken,
        hasRefreshToken: !!this.config.credentials.refreshToken,
        hasClientId: !!this.config.credentials.clientId,
        hasClientSecret: !!this.config.credentials.clientSecret,
        expiresAt: this.config.credentials.expiresAt
      });

      // Validate required credentials
      if (!this.config.credentials.accessToken) {
        throw new Error('Access token is required');
      }

      if (!this.config.credentials.refreshToken) {
        this.logger.warn('No refresh token available - token refresh will not be possible');
      }

      // Check token expiration and refresh if needed
      const expiresAt = this.config.credentials.expiresAt;
      if (expiresAt) {
        const expirationTime = new Date(expiresAt).getTime();
        const currentTime = Date.now();
        const fiveMinutesInMs = 5 * 60 * 1000;

        // Refresh if expired or expiring within 5 minutes
        if (currentTime >= expirationTime - fiveMinutesInMs) {
          this.logger.log('Access token expired or expiring soon, refreshing...');
          try {
            await this.refreshTokens();
          } catch (refreshError) {
            this.logger.error('Token refresh failed during initialization:', refreshError.message);
            // Don't fail initialization - let the action execution handle it
            this.logger.warn('Continuing with potentially expired token - will retry on first API call');
          }
        }
      }

      this.logger.log('Google Docs connector initialized successfully');
    } catch (error) {
      this.logger.error('Failed to initialize Google Docs connection:', {
        errorMessage: error.message,
        errorStack: error.stack
      });
      throw new Error(`Failed to initialize Google Docs connection: ${error.message}`);
    }
  }

  protected async performConnectionTest(): Promise<boolean> {
    try {
      await this.performRequest({
        method: 'GET',
        endpoint: `${this.driveBaseUrl}/about`,
        headers: this.getAuthHeaders(),
        queryParams: { fields: 'user' }
      });
      return true;
    } catch (error) {
      return false;
    }
  }

  protected async performHealthCheck(): Promise<void> {
    const isHealthy = await this.performConnectionTest();
    if (!isHealthy) {
      throw new Error('Google Docs health check failed');
    }
  }

  protected async performRequest(request: ConnectorRequest): Promise<any> {
    const response = await this.apiUtils.executeRequest(request, {
      timeout: 30000,
      retries: 3
    });

    if (!response.success) {
      throw new Error(response.error?.message || 'Google Docs API request failed');
    }

    return response.data;
  }

  protected async performAction(actionId: string, input: any): Promise<any> {
    switch (actionId) {
      case 'create_document':
        return this.createDocument(input);
      case 'get_document':
        return this.getDocument(input);
      case 'append_text':
        return this.appendText(input);
      case 'insert_text':
        return this.insertText(input);
      case 'replace_text':
        return this.replaceText(input);
      case 'delete_content':
        return this.deleteContent(input);
      case 'format_text':
        return this.formatText(input);
      case 'insert_table':
        return this.insertTable(input);
      case 'insert_image':
        return this.insertImage(input);
      case 'create_named_range':
        return this.createNamedRange(input);
      default:
        throw new Error(`Unknown action: ${actionId}`);
    }
  }

  protected async cleanup(): Promise<void> {
    this.logger.log('Google Docs connector cleanup completed');
  }

  // Google Docs-specific methods
  async createDocument(request: DocsCreateRequest): Promise<ConnectorResponse> {
    try {
      const { title, content } = request;

      // Step 1: Create the document
      const response = await this.performRequest({
        method: 'POST',
        endpoint: `${this.baseUrl}/documents`,
        headers: {
          ...this.getAuthHeaders(),
          'Content-Type': 'application/json'
        },
        body: {
          title
        }
      });

      const documentId = response.documentId;

      // Step 2: If content is provided, insert it into the document
      if (content) {
        this.logger.log(`Inserting content into document: ${documentId}`);

        await this.performRequest({
          method: 'POST',
          endpoint: `${this.baseUrl}/documents/${documentId}:batchUpdate`,
          headers: {
            ...this.getAuthHeaders(),
            'Content-Type': 'application/json'
          },
          body: {
            requests: [
              {
                insertText: {
                  text: content,
                  location: {
                    index: 1  // Insert at the beginning of the document body
                  }
                }
              }
            ]
          }
        });

        this.logger.log('Content inserted successfully');
      }

      return {
        success: true,
        data: {
          documentId: response.documentId,
          title: response.title,
          content: content || '',
          revisionId: response.revisionId,
          documentUrl: `https://docs.google.com/document/d/${response.documentId}/edit`
        }
      };
    } catch (error) {
      return this.handleError(error as any, 'Failed to create document');
    }
  }

  async getDocument(request: DocsGetRequest): Promise<ConnectorResponse> {
    try {
      const { documentId, suggestionsViewMode } = request;

      this.logger.log(`Fetching document: ${documentId}`);

      const queryParams: any = {};

      // Only include suggestionsViewMode if provided
      // Valid values: SUGGESTIONS_INLINE, PREVIEW_SUGGESTIONS_ACCEPTED, PREVIEW_WITHOUT_SUGGESTIONS
      if (suggestionsViewMode) {
        queryParams.suggestionsViewMode = suggestionsViewMode;
      }

      const response = await this.performRequest({
        method: 'GET',
        endpoint: `${this.baseUrl}/documents/${documentId}`,
        headers: this.getAuthHeaders(),
        queryParams
      });

      this.logger.log('Document fetched successfully');

      return {
        success: true,
        data: response
      };
    } catch (error) {
      this.logger.error('Get document failed:', {
        errorMessage: error.message,
        errorStatus: error.response?.status,
        errorData: error.response?.data
      });

      // If 401/403, suggest re-authenticating
      if (error.response?.status === 401 || error.response?.status === 403) {
        return {
          success: false,
          error: {
            code: 'AUTHENTICATION_FAILED',
            message: 'Authentication failed. Please re-connect your Google Docs account and ensure the Google Docs API and Google Drive API are enabled in your Google Cloud Console.',
            details: {
              status: error.response?.status,
              error: error.response?.data
            }
          }
        };
      }

      return this.handleError(error as any, 'Failed to get document');
    }
  }

  async appendText(request: DocsAppendTextRequest): Promise<ConnectorResponse> {
    try {
      const { documentId, text } = request;

      this.logger.log(`Appending text to document: ${documentId}`);

      // Get document to find the end index
      const docResponse = await this.getDocument({ documentId });

      // Check if getDocument was successful
      if (!docResponse.success || !docResponse.data || !docResponse.data.body) {
        this.logger.error('Failed to fetch document:', docResponse.error);
        return {
          success: false,
          error: {
            code: 'DOCUMENT_FETCH_FAILED',
            message: 'Failed to retrieve document information',
            details: docResponse.error || {}
          }
        };
      }

      const endIndex = docResponse.data.body.content[docResponse.data.body.content.length - 1].endIndex - 1;

      this.logger.log(`Inserting text at index ${endIndex}`);

      const response = await this.performRequest({
        method: 'POST',
        endpoint: `${this.baseUrl}/documents/${documentId}:batchUpdate`,
        headers: {
          ...this.getAuthHeaders(),
          'Content-Type': 'application/json'
        },
        body: {
          requests: [
            {
              insertText: {
                text,
                location: {
                  index: endIndex
                }
              }
            }
          ]
        }
      });

      this.logger.log('Text appended successfully');

      return {
        success: true,
        data: {
          documentId,
          replies: response.replies
        }
      };
    } catch (error) {
      this.logger.error('Append text failed:', {
        errorMessage: error.message,
        errorStatus: error.response?.status,
        errorData: error.response?.data
      });

      // If 401/403, suggest re-authenticating
      if (error.response?.status === 401 || error.response?.status === 403) {
        return {
          success: false,
          error: {
            code: 'AUTHENTICATION_FAILED',
            message: 'Authentication failed. Please re-connect your Google Docs account and ensure the Google Docs API is enabled in your Google Cloud Console.',
            details: {
              status: error.response?.status,
              error: error.response?.data
            }
          }
        };
      }

      return this.handleError(error as any, 'Failed to append text');
    }
  }

  async insertText(request: DocsInsertTextRequest): Promise<ConnectorResponse> {
    try {
      const { documentId, text, index } = request;

      const response = await this.performRequest({
        method: 'POST',
        endpoint: `${this.baseUrl}/documents/${documentId}:batchUpdate`,
        headers: {
          ...this.getAuthHeaders(),
          'Content-Type': 'application/json'
        },
        body: {
          requests: [
            {
              insertText: {
                text,
                location: {
                  index
                }
              }
            }
          ]
        }
      });

      return {
        success: true,
        data: {
          documentId,
          replies: response.replies
        }
      };
    } catch (error) {
      return this.handleError(error as any, 'Failed to insert text');
    }
  }

  async replaceText(request: DocsReplaceTextRequest): Promise<ConnectorResponse> {
    try {
      const { documentId, findText, replaceText, matchCase = false } = request;

      const response = await this.performRequest({
        method: 'POST',
        endpoint: `${this.baseUrl}/documents/${documentId}:batchUpdate`,
        headers: {
          ...this.getAuthHeaders(),
          'Content-Type': 'application/json'
        },
        body: {
          requests: [
            {
              replaceAllText: {
                containsText: {
                  text: findText,
                  matchCase
                },
                replaceText
              }
            }
          ]
        }
      });

      const occurrencesChanged = response.replies?.[0]?.replaceAllText?.occurrencesChanged || 0;

      return {
        success: true,
        data: {
          documentId,
          occurrencesChanged
        }
      };
    } catch (error) {
      return this.handleError(error as any, 'Failed to replace text');
    }
  }

  async deleteContent(request: DocsDeleteContentRequest): Promise<ConnectorResponse> {
    try {
      const { documentId, startIndex, endIndex } = request;

      const response = await this.performRequest({
        method: 'POST',
        endpoint: `${this.baseUrl}/documents/${documentId}:batchUpdate`,
        headers: {
          ...this.getAuthHeaders(),
          'Content-Type': 'application/json'
        },
        body: {
          requests: [
            {
              deleteContentRange: {
                range: {
                  startIndex,
                  endIndex
                }
              }
            }
          ]
        }
      });

      return {
        success: true,
        data: {
          documentId,
          success: true
        }
      };
    } catch (error) {
      return this.handleError(error as any, 'Failed to delete content');
    }
  }

  async formatText(request: DocsFormatTextRequest): Promise<ConnectorResponse> {
    try {
      const {
        documentId,
        startIndex,
        endIndex,
        bold,
        italic,
        underline,
        fontSize,
        foregroundColor,
        backgroundColor
      } = request;

      const textStyle: any = {};
      const fields: string[] = [];

      if (bold !== undefined) {
        textStyle.bold = bold;
        fields.push('bold');
      }
      if (italic !== undefined) {
        textStyle.italic = italic;
        fields.push('italic');
      }
      if (underline !== undefined) {
        textStyle.underline = underline;
        fields.push('underline');
      }
      if (fontSize) {
        textStyle.fontSize = { magnitude: fontSize, unit: 'PT' };
        fields.push('fontSize');
      }
      if (foregroundColor) {
        textStyle.foregroundColor = {
          color: { rgbColor: this.hexToRgb(foregroundColor) }
        };
        fields.push('foregroundColor');
      }
      if (backgroundColor) {
        textStyle.backgroundColor = {
          color: { rgbColor: this.hexToRgb(backgroundColor) }
        };
        fields.push('backgroundColor');
      }

      const response = await this.performRequest({
        method: 'POST',
        endpoint: `${this.baseUrl}/documents/${documentId}:batchUpdate`,
        headers: {
          ...this.getAuthHeaders(),
          'Content-Type': 'application/json'
        },
        body: {
          requests: [
            {
              updateTextStyle: {
                range: {
                  startIndex,
                  endIndex
                },
                textStyle,
                fields: fields.join(',')
              }
            }
          ]
        }
      });

      return {
        success: true,
        data: {
          documentId,
          success: true
        }
      };
    } catch (error) {
      return this.handleError(error as any, 'Failed to format text');
    }
  }

  async insertTable(request: DocsInsertTableRequest): Promise<ConnectorResponse> {
    try {
      const { documentId, index, rows, columns } = request;

      const response = await this.performRequest({
        method: 'POST',
        endpoint: `${this.baseUrl}/documents/${documentId}:batchUpdate`,
        headers: {
          ...this.getAuthHeaders(),
          'Content-Type': 'application/json'
        },
        body: {
          requests: [
            {
              insertTable: {
                rows,
                columns,
                location: {
                  index
                }
              }
            }
          ]
        }
      });

      return {
        success: true,
        data: {
          documentId,
          tableId: response.replies?.[0]?.insertTable?.tableObjectId
        }
      };
    } catch (error) {
      return this.handleError(error as any, 'Failed to insert table');
    }
  }

  async insertImage(request: DocsInsertImageRequest): Promise<ConnectorResponse> {
    try {
      const { documentId, imageUrl, index, width, height } = request;

      const imageProperties: any = {
        sourceUri: imageUrl
      };

      if (width && height) {
        imageProperties.imageProperties = {
          contentUri: imageUrl
        };
      }

      const response = await this.performRequest({
        method: 'POST',
        endpoint: `${this.baseUrl}/documents/${documentId}:batchUpdate`,
        headers: {
          ...this.getAuthHeaders(),
          'Content-Type': 'application/json'
        },
        body: {
          requests: [
            {
              insertInlineImage: {
                uri: imageUrl,
                location: {
                  index
                },
                objectSize: width && height ? {
                  height: { magnitude: height, unit: 'PT' },
                  width: { magnitude: width, unit: 'PT' }
                } : undefined
              }
            }
          ]
        }
      });

      return {
        success: true,
        data: {
          documentId,
          objectId: response.replies?.[0]?.insertInlineImage?.objectId
        }
      };
    } catch (error) {
      return this.handleError(error as any, 'Failed to insert image');
    }
  }

  async createNamedRange(request: DocsCreateNamedRangeRequest): Promise<ConnectorResponse> {
    try {
      const { documentId, name, startIndex, endIndex } = request;

      const response = await this.performRequest({
        method: 'POST',
        endpoint: `${this.baseUrl}/documents/${documentId}:batchUpdate`,
        headers: {
          ...this.getAuthHeaders(),
          'Content-Type': 'application/json'
        },
        body: {
          requests: [
            {
              createNamedRange: {
                name,
                range: {
                  startIndex,
                  endIndex
                }
              }
            }
          ]
        }
      });

      return {
        success: true,
        data: {
          documentId,
          namedRangeId: response.replies?.[0]?.createNamedRange?.namedRangeId
        }
      };
    } catch (error) {
      return this.handleError(error as any, 'Failed to create named range');
    }
  }

  async refreshTokens(): Promise<OAuthTokens> {
    try {
      // Check if GoogleOAuthService is configured
      if (!this.googleOAuthService.isConfigured()) {
        this.logger.error('Token refresh failed: Google OAuth service is not configured');
        throw new Error('Google OAuth is not configured. Please configure GOOGLE_OAUTH_CLIENT_ID and GOOGLE_OAUTH_CLIENT_SECRET in your environment variables.');
      }

      // Get the refresh token (already decrypted by ConnectorsService)
      const refreshToken = this.config.credentials.refreshToken;
      if (!refreshToken) {
        this.logger.error('Token refresh failed: No refresh token available');
        throw new Error('No refresh token available');
      }

      this.logger.log('Refreshing OAuth token using GoogleOAuthService...');

      // Use the centralized Google OAuth service to refresh the token
      const tokenResponse = await this.googleOAuthService.refreshAccessToken(refreshToken);

      // Calculate expiration
      const expiresAt = new Date(Date.now() + (tokenResponse.expires_in * 1000));

      const tokens: OAuthTokens = {
        accessToken: tokenResponse.access_token,
        refreshToken: tokenResponse.refresh_token || refreshToken,
        expiresAt: expiresAt,
        scope: tokenResponse.scope,
        tokenType: tokenResponse.token_type
      };

      // Update stored credentials with decrypted tokens
      // Note: The ConnectorsService will handle encryption when saving to database
      this.config.credentials.accessToken = tokens.accessToken;
      this.config.credentials.refreshToken = tokens.refreshToken;
      this.config.credentials.expiresAt = expiresAt.toISOString();

      this.logger.log('OAuth token refreshed successfully');

      return tokens;
    } catch (error) {
      this.logger.error('Failed to refresh token:', {
        errorMessage: error.message,
        errorResponse: error.response?.data,
        errorStatus: error.response?.status
      });
      throw new Error(`Failed to refresh tokens: ${error.response?.data?.error_description || error.message}`);
    }
  }

  // Helper methods
  private hexToRgb(hex: string): { red: number; green: number; blue: number } {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result
      ? {
          red: parseInt(result[1], 16) / 255,
          green: parseInt(result[2], 16) / 255,
          blue: parseInt(result[3], 16) / 255
        }
      : { red: 0, green: 0, blue: 0 };
  }

  private getAuthHeaders(): Record<string, string> {
    if (!this.config.credentials.accessToken) {
      this.logger.error('Cannot create auth headers: accessToken is missing');
      throw new Error('Access token is required for authentication');
    }
    return this.authUtils.createAuthHeaders(AuthType.BEARER_TOKEN, this.config.credentials);
  }

  private getActions(): ConnectorAction[] {
    return [
      {
        id: 'create_document',
        name: 'Create Document',
        description: 'Create a new Google Docs document with optional content',
        inputSchema: {
          title: { type: 'string', required: true, description: 'Document title', label: 'Document Title' },
          content: { type: 'string', required: false, description: 'Initial content for the document', label: 'Content', inputType: 'textarea' }
        },
        outputSchema: {
          documentId: { type: 'string', description: 'Document ID' },
          documentUrl: { type: 'string', description: 'Document URL' }
        }
      },
      {
        id: 'get_document',
        name: 'Get Document',
        description: 'Retrieve a Google Docs document content',
        inputSchema: {
          documentId: { type: 'string', required: true, description: 'Document ID' },
          suggestionsViewMode: { type: 'string', description: 'Suggestions view mode' }
        },
        outputSchema: {
          documentId: { type: 'string', description: 'The unique document identifier' },
          title: { type: 'string', description: 'The title of the document' },
          revisionId: { type: 'string', description: 'The current revision ID of the document' },
          body: {
            type: 'object',
            description: 'The document body containing all the content',
            properties: {
              content: {
                type: 'array',
                description: 'Array of structural elements that make up the document'
              }
            }
          },
          inlineObjects: { type: 'object', description: 'Inline objects embedded in the document (images, etc.)' },
          lists: { type: 'object', description: 'Lists defined in the document' },
          namedRanges: { type: 'object', description: 'Named ranges in the document' },
          suggestionsViewMode: { type: 'string', description: 'The suggestions view mode' }
        }
      },
      {
        id: 'append_text',
        name: 'Append Text',
        description: 'Append text to the end of a document',
        inputSchema: {
          documentId: { type: 'string', required: true, description: 'Document ID' },
          text: { type: 'string', required: true, description: 'Text to append' }
        },
        outputSchema: {
          documentId: { type: 'string', description: 'Document ID' }
        }
      },
      {
        id: 'insert_text',
        name: 'Insert Text',
        description: 'Insert text at a specific location',
        inputSchema: {
          documentId: { type: 'string', required: true, description: 'Document ID' },
          text: { type: 'string', required: true, description: 'Text to insert' },
          index: { type: 'number', required: true, description: 'Insert position' }
        },
        outputSchema: {
          documentId: { type: 'string', description: 'Document ID' }
        }
      },
      {
        id: 'replace_text',
        name: 'Replace Text',
        description: 'Replace all instances of text',
        inputSchema: {
          documentId: { type: 'string', required: true, description: 'Document ID' },
          findText: { type: 'string', required: true, description: 'Text to find' },
          replaceText: { type: 'string', required: true, description: 'Replacement text' },
          matchCase: { type: 'boolean', description: 'Case sensitive' }
        },
        outputSchema: {
          occurrencesChanged: { type: 'number', description: 'Number of replacements' }
        }
      },
      {
        id: 'delete_content',
        name: 'Delete Content',
        description: 'Delete content from a range',
        inputSchema: {
          documentId: { type: 'string', required: true, description: 'Document ID' },
          startIndex: { type: 'number', required: true, description: 'Start index' },
          endIndex: { type: 'number', required: true, description: 'End index' }
        },
        outputSchema: {
          success: { type: 'boolean', description: 'Deletion success' }
        }
      },
      {
        id: 'format_text',
        name: 'Format Text',
        description: 'Apply text formatting',
        inputSchema: {
          documentId: { type: 'string', required: true, description: 'Document ID' },
          startIndex: { type: 'number', required: true, description: 'Start index' },
          endIndex: { type: 'number', required: true, description: 'End index' },
          bold: { type: 'boolean', description: 'Bold' },
          italic: { type: 'boolean', description: 'Italic' },
          fontSize: { type: 'number', description: 'Font size' }
        },
        outputSchema: {
          success: { type: 'boolean', description: 'Format success' }
        }
      },
      {
        id: 'insert_table',
        name: 'Insert Table',
        description: 'Insert a table',
        inputSchema: {
          documentId: { type: 'string', required: true, description: 'Document ID' },
          index: { type: 'number', required: true, description: 'Insert position' },
          rows: { type: 'number', required: true, description: 'Number of rows' },
          columns: { type: 'number', required: true, description: 'Number of columns' }
        },
        outputSchema: {
          tableId: { type: 'string', description: 'Table ID' }
        }
      },
      {
        id: 'insert_image',
        name: 'Insert Image',
        description: 'Insert an image from URL',
        inputSchema: {
          documentId: { type: 'string', required: true, description: 'Document ID' },
          imageUrl: { type: 'string', required: true, description: 'Image URL' },
          index: { type: 'number', required: true, description: 'Insert position' },
          width: { type: 'number', description: 'Image width' },
          height: { type: 'number', description: 'Image height' }
        },
        outputSchema: {
          objectId: { type: 'string', description: 'Image object ID' }
        }
      },
      {
        id: 'create_named_range',
        name: 'Create Named Range',
        description: 'Create a named range',
        inputSchema: {
          documentId: { type: 'string', required: true, description: 'Document ID' },
          name: { type: 'string', required: true, description: 'Range name' },
          startIndex: { type: 'number', required: true, description: 'Start index' },
          endIndex: { type: 'number', required: true, description: 'End index' }
        },
        outputSchema: {
          namedRangeId: { type: 'string', description: 'Named range ID' }
        }
      }
    ];
  }

  private getTriggers(): ConnectorTrigger[] {
    return [
      {
        id: 'document_created',
        name: 'Document Created',
        description: 'Triggers when a new document is created (polling)',
        eventType: 'polling',
        inputSchema: {
          folderId: { type: 'string', description: 'Folder ID to monitor', default: 'root' },
          pollInterval: { type: 'number', default: 5, description: 'Polling interval in minutes' }
        },
        outputSchema: {
          documentId: { type: 'string', description: 'Document ID' },
          title: { type: 'string', description: 'Document title' }
        },
        webhookRequired: false,
        pollingEnabled: true
      },
      {
        id: 'document_updated',
        name: 'Document Updated',
        description: 'Triggers when a document is modified (polling)',
        eventType: 'polling',
        inputSchema: {
          documentId: { type: 'string', description: 'Specific document ID (optional)' },
          folderId: { type: 'string', description: 'Folder ID to monitor' },
          pollInterval: { type: 'number', default: 5 }
        },
        outputSchema: {
          documentId: { type: 'string', description: 'Document ID' },
          modifiedTime: { type: 'string', description: 'Last modified timestamp' }
        },
        webhookRequired: false,
        pollingEnabled: true
      }
    ];
  }
}
