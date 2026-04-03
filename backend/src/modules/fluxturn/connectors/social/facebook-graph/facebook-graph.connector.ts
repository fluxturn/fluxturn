import { Injectable } from '@nestjs/common';
import { BaseConnector } from '../../base/base.connector';
import { ISocialConnector } from '../../base/connector.interface';
import {
  ConnectorMetadata,
  ConnectorResponse,
  ConnectorCategory,
  ConnectorType,
  AuthType,
  ConnectorRequest,
  ConnectorAction,
  ConnectorTrigger,
  PaginatedRequest,
} from '../../types';
import { AuthUtils } from '../../utils/auth.utils';
import { ApiUtils } from '../../utils/api.utils';
import { ConnectorConfigService } from '../../services/connector-config.service';
import { FacebookOAuthService } from '../../services/facebook-oauth.service';

// Facebook Graph API specific interfaces
export interface FacebookGraphNode {
  id: string;
  [key: string]: any; // Flexible for various node types
}

export interface FacebookGraphEdge {
  data: any[];
  paging?: {
    cursors: {
      before: string;
      after: string;
    };
    next?: string;
    previous?: string;
  };
}

export interface FacebookPagePost {
  pageId: string;
  message: string;
  link?: string;
  published?: boolean;
  scheduledPublishTime?: number;
}

export interface FacebookMediaUpload {
  pageId: string;
  url?: string;
  file_url?: string;
  caption?: string;
  title?: string;
  description?: string;
  published?: boolean;
}

@Injectable()
export class FacebookGraphConnector extends BaseConnector implements ISocialConnector {
  private baseUrl = 'https://graph.facebook.com';
  private videoUrl = 'https://graph-video.facebook.com';
  private defaultApiVersion = 'v20.0';

  constructor(
    private readonly authUtils: AuthUtils,
    private readonly apiUtils: ApiUtils,
    private readonly connectorConfigService: ConnectorConfigService,
    private readonly facebookOAuthService: FacebookOAuthService,
  ) {
    super();
  }

  getMetadata(): ConnectorMetadata {
    return {
      name: 'Facebook Graph API',
      description: 'Interact with Facebook pages, posts, photos, videos, and user data via Graph API',
      version: '1.0.0',
      category: ConnectorCategory.SOCIAL,
      type: ConnectorType.FACEBOOK_GRAPH,
      logoUrl: '/assets/connectors/facebook.svg',
      documentationUrl: 'https://developers.facebook.com/docs/graph-api',
      authType: AuthType.OAUTH2,
      requiredScopes: [
        'pages_show_list',
        'pages_read_engagement',
        'pages_manage_posts',
        'pages_manage_metadata',
        'public_profile',
        'pages_read_user_content'
      ],
      actions: this.getActions(),
      triggers: this.getTriggers(),
      rateLimit: {
        requestsPerHour: 200,
        burstLimit: 50
      },
      webhookSupport: true
    };
  }

  protected async initializeConnection(): Promise<void> {
    // Check if token is expired and needs refresh
    const expiresAt = this.config.credentials?.expiresAt;
    if (expiresAt) {
      const expirationTime = new Date(expiresAt).getTime();
      const currentTime = Date.now();
      const oneDayInMs = 24 * 60 * 60 * 1000; // Facebook tokens last 60 days, refresh when < 1 day left

      // Debug logging
      this.logger.debug('Facebook token expiration check:', {
        expiresAt,
        expirationTime,
        currentTime,
        daysUntilExpiry: Math.floor((expirationTime - currentTime) / (24 * 60 * 60 * 1000)),
        isExpired: currentTime >= expirationTime,
      });

      const daysUntilExpiry = Math.floor((expirationTime - currentTime) / (24 * 60 * 60 * 1000));
      if (daysUntilExpiry < 0) {
        this.logger.log(`Facebook token expired ${Math.abs(daysUntilExpiry)} days ago`);
      } else {
        this.logger.log(`Facebook token expires in ${daysUntilExpiry} days`);
      }

      // Refresh if expired or expiring within 1 day
      if (currentTime >= expirationTime - oneDayInMs) {
        this.logger.log('Facebook OAuth token expired or expiring soon, refreshing...');
        try {
          await this.refreshToken();
        } catch (error) {
          this.logger.error('Facebook token refresh failed:', error.message);
          throw new Error(`Token refresh failed: ${error.message}. Please re-authorize the Facebook connection.`);
        }
      }
    }

    // Test connection with /me endpoint
    const response = await this.performRequest({
      method: 'GET',
      endpoint: `${this.baseUrl}/${this.defaultApiVersion}/me`,
      headers: this.getAuthHeaders(),
      queryParams: { fields: 'id,name' }
    });

    if (!response.id) {
      throw new Error('Failed to initialize Facebook Graph API connection');
    }

    this.logger.log(`Facebook Graph API initialized for user: ${response.name} (${response.id})`);
  }

  /**
   * Refresh Facebook OAuth token
   * Note: Facebook uses token exchange instead of refresh tokens
   */
  private async refreshToken(): Promise<void> {
    try {
      const currentToken = this.config.credentials?.accessToken;

      if (!currentToken) {
        throw new Error('No access token available - user must re-authorize');
      }

      this.logger.log('Attempting to refresh Facebook access token...');

      // Use the FacebookOAuthService to exchange for a new long-lived token
      const tokens = await this.facebookOAuthService.refreshAccessToken(currentToken);

      // Calculate new expiration time (Facebook long-lived tokens last ~60 days)
      const newExpiresAt = tokens.expires_in
        ? new Date(Date.now() + tokens.expires_in * 1000).toISOString()
        : null;

      // Update credentials in memory
      this.config.credentials.accessToken = tokens.access_token;

      if (newExpiresAt) {
        this.config.credentials.expiresAt = newExpiresAt;
      }

      this.logger.log('Facebook OAuth token refreshed successfully');

      // Persist the refreshed tokens to the database
      if (this.config.id && this.connectorConfigService) {
        try {
          await this.connectorConfigService.updateRefreshedTokens(this.config.id, {
            accessToken: tokens.access_token,
            expiresAt: newExpiresAt,
          });
          this.logger.log('Facebook refreshed tokens persisted to database');
        } catch (persistError) {
          this.logger.error('Failed to persist Facebook refreshed tokens to database:', persistError.message);
          // Don't throw - we can still proceed with the in-memory tokens
        }
      }
    } catch (error) {
      this.logger.error('Failed to refresh Facebook OAuth token:', error.message);
      throw new Error('Failed to refresh Facebook OAuth token - user may need to re-authorize');
    }
  }

  protected async performConnectionTest(): Promise<boolean> {
    try {
      const response = await this.performRequest({
        method: 'GET',
        endpoint: `${this.baseUrl}/${this.defaultApiVersion}/me`,
        headers: this.getAuthHeaders(),
        queryParams: { fields: 'id' }
      });
      return !!response.id;
    } catch (error) {
      this.logger.error('Facebook connection test failed:', error);
      return false;
    }
  }

  protected async performHealthCheck(): Promise<void> {
    const response = await this.performRequest({
      method: 'GET',
      endpoint: `${this.baseUrl}/${this.defaultApiVersion}/me`,
      headers: this.getAuthHeaders(),
      queryParams: { fields: 'id' }
    });

    if (!response.id) {
      throw new Error('Facebook Graph API health check failed');
    }
  }

  protected async performRequest(request: ConnectorRequest): Promise<any> {
    const response = await this.apiUtils.executeRequest(request, {
      timeout: 30000,
      retries: 3
    });

    if (!response.success) {
      throw new Error(response.error?.message || 'Facebook Graph API request failed');
    }

    return response.data;
  }

  protected async performAction(actionId: string, input: any): Promise<any> {
    const version = input.version || this.defaultApiVersion;

    switch (actionId) {
      case 'http_request':
        return this.httpRequest(input);
      case 'get_node':
        return this.getNode(input.nodeId, input.fields, version);
      case 'get_edge':
        return this.getEdge(input.nodeId, input.edge, input.fields, input.limit, version);
      case 'create_page_post':
        return this.createPagePost(input, version);
      case 'upload_page_photo':
        return this.uploadPagePhoto(input, version);
      case 'upload_page_video':
        return this.uploadPageVideo(input, version);
      case 'get_pages':
        return this.getPages(input.fields, input.limit, version);
      case 'delete_post':
        return this.deletePost(input.postId, version);
      case 'get_page_insights':
        return this.getPageInsights(input, version);
      case 'comment_on_post':
        return this.commentOnPost(input.postId, input.message, version);
      default:
        throw new Error(`Unknown action: ${actionId}`);
    }
  }

  protected async cleanup(): Promise<void> {
    this.logger.log('Facebook Graph API connector cleanup completed');
  }

  // ============= ISocialConnector Interface Methods =============

  async postContent(content: any): Promise<ConnectorResponse> {
    try {
      const version = content.version || this.defaultApiVersion;
      const pageId = content.pageId || content.page_id;

      if (!pageId) {
        throw new Error('Page ID is required');
      }

      const body: any = {
        message: content.message
      };

      if (content.link) body.link = content.link;
      if (content.published !== undefined) body.published = content.published;

      const response = await this.performRequest({
        method: 'POST',
        endpoint: `${this.baseUrl}/${version}/${pageId}/feed`,
        headers: {
          ...this.getAuthHeaders(),
          'Content-Type': 'application/json'
        },
        body
      });

      return {
        success: true,
        data: {
          postId: response.id,
          ...response
        }
      };
    } catch (error) {
      return this.handleError(error as any, 'Failed to post content');
    }
  }

  async getPosts(options?: PaginatedRequest): Promise<ConnectorResponse> {
    try {
      const version = options?.filters?.version || this.defaultApiVersion;
      const pageId = options?.filters?.pageId || options?.filters?.page_id;

      if (!pageId) {
        throw new Error('Page ID is required');
      }

      const limit = Math.min(options?.limit || 25, 100);
      const fields = options?.filters?.fields || 'id,message,created_time,permalink_url';

      const queryParams: any = {
        fields: Array.isArray(fields) ? fields.join(',') : fields,
        limit
      };

      if (options?.cursor) {
        queryParams.after = options.cursor;
      }

      const response = await this.performRequest({
        method: 'GET',
        endpoint: `${this.baseUrl}/${version}/${pageId}/feed`,
        headers: this.getAuthHeaders(),
        queryParams
      });

      return {
        success: true,
        data: {
          items: response.data || [],
          pagination: {
            next_cursor: response.paging?.cursors?.after,
            has_more: !!response.paging?.next
          }
        },
        metadata: {
          pagination: {
            hasNext: !!response.paging?.next,
            page: 1,
            pageSize: limit,
            total: 0
          }
        }
      };
    } catch (error) {
      return this.handleError(error as any, 'Failed to get posts');
    }
  }

  async getUserProfile(userId?: string): Promise<ConnectorResponse> {
    try {
      const nodeId = userId || 'me';
      const fields = 'id,name,email,picture';

      return await this.getNode(nodeId, fields.split(','));
    } catch (error) {
      return this.handleError(error as any, 'Failed to get user profile');
    }
  }

  async getConnections(
    type: 'followers' | 'following',
    options?: PaginatedRequest
  ): Promise<ConnectorResponse> {
    try {
      const pageId = options?.filters?.pageId;

      if (!pageId) {
        throw new Error('Page ID is required');
      }

      if (type === 'followers') {
        const response = await this.getNode(pageId, ['id', 'name', 'followers_count', 'fan_count']);

        return {
          success: true,
          data: {
            total_followers: response.data?.followers_count || response.data?.fan_count || 0
          }
        };
      }

      return {
        success: false,
        error: {
          code: 'NOT_SUPPORTED',
          message: 'Following list not available for Facebook pages'
        }
      };
    } catch (error) {
      return this.handleError(error as any, 'Failed to get connections');
    }
  }

  async schedulePost(content: any, scheduledTime: Date): Promise<ConnectorResponse> {
    const scheduledTimestamp = Math.floor(scheduledTime.getTime() / 1000);
    const contentWithSchedule = {
      ...content,
      published: false,
      scheduledPublishTime: scheduledTimestamp
    };

    return this.createPagePost(contentWithSchedule);
  }

  // ============= Facebook Graph API Specific Methods =============

  private async getNode(
    nodeId: string,
    fields?: string[],
    version: string = this.defaultApiVersion
  ): Promise<ConnectorResponse> {
    try {
      const fieldsParam = fields?.join(',') || 'id,name';

      const response = await this.performRequest({
        method: 'GET',
        endpoint: `${this.baseUrl}/${version}/${nodeId}`,
        headers: this.getAuthHeaders(),
        queryParams: { fields: fieldsParam }
      });

      return {
        success: true,
        data: response
      };
    } catch (error) {
      return this.handleError(error as any, 'Failed to get node');
    }
  }

  private async getEdge(
    nodeId: string,
    edge: string,
    fields?: string[],
    limit: number = 25,
    version: string = this.defaultApiVersion
  ): Promise<ConnectorResponse> {
    try {
      const queryParams: any = { limit };

      if (fields && fields.length > 0) {
        queryParams.fields = fields.join(',');
      }

      const response = await this.performRequest({
        method: 'GET',
        endpoint: `${this.baseUrl}/${version}/${nodeId}/${edge}`,
        headers: this.getAuthHeaders(),
        queryParams
      });

      return {
        success: true,
        data: response,
        metadata: {
          pagination: {
            hasNext: !!response.paging?.next,
            page: 1,
            pageSize: limit,
            total: 0
          }
        }
      };
    } catch (error) {
      return this.handleError(error as any, 'Failed to get edge');
    }
  }

  private async createPagePost(
    request: FacebookPagePost,
    version: string = this.defaultApiVersion
  ): Promise<ConnectorResponse> {
    try {
      // First, get the page access token for the specified page
      const pageAccessToken = await this.getPageAccessToken(request.pageId, version);

      if (!pageAccessToken) {
        throw new Error(`Could not get access token for page ${request.pageId}. Make sure you have admin access to this page.`);
      }

      const body: any = {
        message: request.message
      };

      if (request.link) body.link = request.link;
      if (request.published !== undefined) body.published = request.published;
      if (request.scheduledPublishTime) body.scheduled_publish_time = request.scheduledPublishTime;

      const response = await this.performRequest({
        method: 'POST',
        endpoint: `${this.baseUrl}/${version}/${request.pageId}/feed`,
        headers: {
          'Authorization': `Bearer ${pageAccessToken}`,
          'Content-Type': 'application/json'
        },
        body
      });

      return {
        success: true,
        data: {
          postId: response.id,
          ...response
        }
      };
    } catch (error) {
      return this.handleError(error as any, 'Failed to create page post');
    }
  }

  /**
   * Get the page access token for a specific page
   */
  private async getPageAccessToken(pageId: string, version: string = this.defaultApiVersion): Promise<string | null> {
    try {
      const response = await this.performRequest({
        method: 'GET',
        endpoint: `${this.baseUrl}/${version}/me/accounts`,
        headers: this.getAuthHeaders(),
        queryParams: {
          fields: 'id,name,access_token'
        }
      });

      const pages = response.data || [];
      const page = pages.find((p: any) => p.id === pageId);

      return page?.access_token || null;
    } catch (error) {
      this.logger.error(`Failed to get page access token for page ${pageId}:`, error);
      return null;
    }
  }

  private async uploadPagePhoto(
    request: any,
    version: string = this.defaultApiVersion
  ): Promise<ConnectorResponse> {
    try {
      // Get page access token
      const pageAccessToken = await this.getPageAccessToken(request.pageId, version);

      if (!pageAccessToken) {
        throw new Error(`Could not get access token for page ${request.pageId}. Make sure you have admin access to this page.`);
      }

      const uploadOption = request.photoUploadOption || 'url';
      const axios = require('axios');
      const FormData = require('form-data');

      // Handle file upload from device
      if (uploadOption === 'upload' && request.photoFile && request.photoFile.length > 0) {
        const photoFile = request.photoFile[0];

        if (!photoFile.fileData) {
          throw new Error('No file data provided for upload');
        }

        // Extract base64 data from data URL
        let buffer: Buffer;
        let mimeType = photoFile.mimeType || 'image/jpeg';

        if (typeof photoFile.fileData === 'string' && photoFile.fileData.startsWith('data:')) {
          const base64Match = photoFile.fileData.match(/^data:(.+?);base64,(.+)$/);
          if (base64Match) {
            mimeType = base64Match[1];
            buffer = Buffer.from(base64Match[2], 'base64');
          } else {
            throw new Error('Invalid base64 data URL format');
          }
        } else if (Buffer.isBuffer(photoFile.fileData)) {
          buffer = photoFile.fileData;
        } else {
          throw new Error('Unsupported file data format');
        }

        // Validate file size (Facebook limit: 4MB for photos)
        const fileSizeInMB = buffer.length / (1024 * 1024);
        if (fileSizeInMB > 4) {
          throw new Error(`Photo exceeds 4MB limit (${fileSizeInMB.toFixed(2)}MB)`);
        }

        this.logger.log(`Uploading photo to Facebook - size: ${buffer.length}, type: ${mimeType}`);

        // Use multipart/form-data for binary upload
        const formData = new FormData();
        formData.append('source', buffer, {
          filename: photoFile.fileName || 'photo.jpg',
          contentType: mimeType,
        });
        formData.append('published', (request.published ?? true).toString());
        if (request.caption) {
          formData.append('caption', request.caption);
        }

        const response = await axios.post(
          `${this.baseUrl}/${version}/${request.pageId}/photos`,
          formData,
          {
            headers: {
              'Authorization': `Bearer ${pageAccessToken}`,
              ...formData.getHeaders(),
            },
            timeout: 60000,
          }
        );

        return {
          success: true,
          data: response.data
        };
      }

      // Handle URL-based upload (original behavior)
      if (!request.url) {
        throw new Error('Photo URL is required when upload method is "url"');
      }

      const body: any = {
        url: request.url,
        published: request.published ?? true
      };

      if (request.caption) body.caption = request.caption;

      const response = await this.performRequest({
        method: 'POST',
        endpoint: `${this.baseUrl}/${version}/${request.pageId}/photos`,
        headers: {
          'Authorization': `Bearer ${pageAccessToken}`
        },
        body
      });

      return {
        success: true,
        data: response
      };
    } catch (error) {
      return this.handleError(error as any, 'Failed to upload photo');
    }
  }

  private async uploadPageVideo(
    request: any,
    version: string = this.defaultApiVersion
  ): Promise<ConnectorResponse> {
    try {
      // Get page access token
      const pageAccessToken = await this.getPageAccessToken(request.pageId, version);

      if (!pageAccessToken) {
        throw new Error(`Could not get access token for page ${request.pageId}. Make sure you have admin access to this page.`);
      }

      const uploadOption = request.videoUploadOption || 'url';
      const axios = require('axios');
      const FormData = require('form-data');

      // Handle file upload from device
      if (uploadOption === 'upload' && request.videoFile && request.videoFile.length > 0) {
        const videoFile = request.videoFile[0];

        if (!videoFile.fileData) {
          throw new Error('No file data provided for upload');
        }

        // Extract base64 data from data URL
        let buffer: Buffer;
        let mimeType = videoFile.mimeType || 'video/mp4';

        if (typeof videoFile.fileData === 'string' && videoFile.fileData.startsWith('data:')) {
          const base64Match = videoFile.fileData.match(/^data:(.+?);base64,(.+)$/);
          if (base64Match) {
            mimeType = base64Match[1];
            buffer = Buffer.from(base64Match[2], 'base64');
          } else {
            throw new Error('Invalid base64 data URL format');
          }
        } else if (Buffer.isBuffer(videoFile.fileData)) {
          buffer = videoFile.fileData;
        } else {
          throw new Error('Unsupported file data format');
        }

        // Validate file size (Facebook limit: 1GB for videos via API)
        const fileSizeInMB = buffer.length / (1024 * 1024);
        if (fileSizeInMB > 1024) {
          throw new Error(`Video exceeds 1GB limit (${fileSizeInMB.toFixed(2)}MB)`);
        }

        this.logger.log(`Uploading video to Facebook - size: ${fileSizeInMB.toFixed(2)}MB, type: ${mimeType}`);

        // Use multipart/form-data for binary upload
        const formData = new FormData();
        formData.append('source', buffer, {
          filename: videoFile.fileName || 'video.mp4',
          contentType: mimeType,
        });
        formData.append('published', (request.published ?? true).toString());
        if (request.title) {
          formData.append('title', request.title);
        }
        if (request.description) {
          formData.append('description', request.description);
        }

        const response = await axios.post(
          `${this.videoUrl}/${version}/${request.pageId}/videos`,
          formData,
          {
            headers: {
              'Authorization': `Bearer ${pageAccessToken}`,
              ...formData.getHeaders(),
            },
            timeout: 300000, // 5 minutes timeout for video uploads
            maxContentLength: Infinity,
            maxBodyLength: Infinity,
          }
        );

        return {
          success: true,
          data: response.data
        };
      }

      // Handle URL-based upload (original behavior)
      if (!request.file_url && !request.url) {
        throw new Error('Video URL is required when upload method is "url"');
      }

      const body: any = {
        file_url: request.file_url || request.url,
        published: request.published ?? true
      };

      if (request.title) body.title = request.title;
      if (request.description) body.description = request.description;

      // Use video upload endpoint
      const response = await this.performRequest({
        method: 'POST',
        endpoint: `${this.videoUrl}/${version}/${request.pageId}/videos`,
        headers: {
          'Authorization': `Bearer ${pageAccessToken}`
        },
        body
      });

      return {
        success: true,
        data: response
      };
    } catch (error) {
      return this.handleError(error as any, 'Failed to upload video');
    }
  }

  private async getPages(
    fields?: string[],
    limit: number = 25,
    version: string = this.defaultApiVersion
  ): Promise<ConnectorResponse> {
    try {
      const fieldsParam = fields?.join(',') || 'id,name,access_token,category';

      const response = await this.performRequest({
        method: 'GET',
        endpoint: `${this.baseUrl}/${version}/me/accounts`,
        headers: this.getAuthHeaders(),
        queryParams: {
          fields: fieldsParam,
          limit
        }
      });

      return {
        success: true,
        data: response.data || [],
        metadata: {
          pagination: {
            hasNext: !!response.paging?.next,
            page: 1,
            pageSize: limit,
            total: 0
          }
        }
      };
    } catch (error) {
      return this.handleError(error as any, 'Failed to get pages');
    }
  }

  private async deletePost(
    postId: string,
    version: string = this.defaultApiVersion
  ): Promise<ConnectorResponse> {
    try {
      const response = await this.performRequest({
        method: 'DELETE',
        endpoint: `${this.baseUrl}/${version}/${postId}`,
        headers: this.getAuthHeaders()
      });

      return {
        success: true,
        data: { deleted: response.success, postId }
      };
    } catch (error) {
      return this.handleError(error as any, 'Failed to delete post');
    }
  }

  private async commentOnPost(
    postId: string,
    message: string,
    version: string = this.defaultApiVersion
  ): Promise<ConnectorResponse> {
    try {
      const response = await this.performRequest({
        method: 'POST',
        endpoint: `${this.baseUrl}/${version}/${postId}/comments`,
        headers: this.getAuthHeaders(),
        queryParams: { message }
      });

      return {
        success: true,
        data: {
          commentId: response.id,
          ...response
        }
      };
    } catch (error) {
      return this.handleError(error as any, 'Failed to comment on post');
    }
  }

  private async getPageInsights(
    params: {
      pageId: string;
      metric?: string[];
      period?: string;
      since?: string;
      until?: string;
    },
    version: string = this.defaultApiVersion
  ): Promise<ConnectorResponse> {
    try {
      const queryParams: any = {};

      if (params.metric) queryParams.metric = params.metric.join(',');
      if (params.period) queryParams.period = params.period;
      if (params.since) queryParams.since = params.since;
      if (params.until) queryParams.until = params.until;

      const response = await this.performRequest({
        method: 'GET',
        endpoint: `${this.baseUrl}/${version}/${params.pageId}/insights`,
        headers: this.getAuthHeaders(),
        queryParams
      });

      return {
        success: true,
        data: response.data || []
      };
    } catch (error) {
      return this.handleError(error as any, 'Failed to get page insights');
    }
  }

  private async httpRequest(input: {
    hostUrl?: string;
    method: string;
    node: string;
    edge?: string;
    version?: string;
    options?: {
      fields?: {
        field?: Array<{ name: string }>;
      };
      queryParameters?: {
        parameter?: Array<{ name: string; value: string }>;
      };
      queryParametersJson?: string;
    };
    body?: Record<string, any>;
  }): Promise<ConnectorResponse> {
    try {
      // Following n8n's exact pattern
      const hostUrl = input.hostUrl || 'graph.facebook.com';
      let version = input.version || '';
      const method = (input.method || 'GET').toUpperCase();
      const node = input.node || '';
      const edge = input.edge || '';
      const options = input.options || {};

      // Validate required fields
      if (!node) {
        throw new Error('Node is required');
      }

      // Add trailing slash to version if provided (like n8n)
      if (version !== '') {
        version += '/';
      } else {
        version = this.defaultApiVersion + '/';
      }

      // Construct the URL - exactly like n8n: https://{hostUrl}/{version}{node}/{edge}
      let endpoint = `https://${hostUrl}/${version}${node}`;
      if (edge) {
        endpoint = `${endpoint}/${edge}`;
      }

      // Build query parameters object
      const queryParams: Record<string, any> = {};

      // Add access token to query params (following n8n pattern)
      if (this.config.credentials?.accessToken) {
        queryParams.access_token = this.config.credentials.accessToken;
      }

      // Process fields array into comma-separated string (like n8n)
      if (options.fields?.field && options.fields.field.length > 0) {
        const fieldsCsv = options.fields.field.map(field => field.name).join(',');
        if (fieldsCsv) {
          queryParams.fields = fieldsCsv;
        }
      }

      // Handle query parameters - use JSON OR array, not both
      // Priority: if JSON is provided and valid, use it; otherwise use array
      let useJson = false;
      if (options.queryParametersJson) {
        try {
          const jsonString = typeof options.queryParametersJson === 'string'
            ? options.queryParametersJson.trim()
            : JSON.stringify(options.queryParametersJson);

          // Only use JSON if it's not empty and not just '{}'
          if (jsonString && jsonString !== '{}' && jsonString !== '') {
            const jsonParams = JSON.parse(jsonString);
            if (Object.keys(jsonParams).length > 0) {
              Object.assign(queryParams, jsonParams);
              useJson = true;
            }
          }
        } catch (error) {
          // If JSON parse fails, fall through to use array method
          this.logger.warn('Query Parameters JSON parse failed, using array method instead');
        }
      }

      // Only process array if JSON wasn't used
      if (!useJson && options.queryParameters?.parameter && options.queryParameters.parameter.length > 0) {
        for (const param of options.queryParameters.parameter) {
          if (param.name && param.value) {
            queryParams[param.name] = param.value;
          }
        }
      }

      // Build request configuration
      const requestConfig: ConnectorRequest = {
        method: method as any,
        endpoint
      };

      // For POST/PUT/PATCH requests, send params as query string (Facebook Graph API style)
      // Facebook accepts POST params as either query params or form-data, so we use query params for simplicity
      if (['POST', 'PUT', 'PATCH'].includes(method)) {
        requestConfig.queryParams = queryParams;

        // If there's explicit body data, send it as JSON
        if (input.body && Object.keys(input.body).length > 0) {
          requestConfig.body = input.body;
          requestConfig.headers = {
            'Content-Type': 'application/json'
          };
        }
      } else {
        // For GET/DELETE, keep all params as query params
        requestConfig.queryParams = queryParams;
      }

      const response = await this.performRequest(requestConfig);

      return {
        success: true,
        data: response
      };
    } catch (error) {
      return this.handleError(error as any, 'HTTP request failed');
    }
  }

  private getAuthHeaders(): Record<string, string> {
    return this.authUtils.createAuthHeaders(AuthType.BEARER_TOKEN, this.config.credentials);
  }

  private getActions(): ConnectorAction[] {
    return [
      {
        id: 'http_request',
        name: 'HTTP Request',
        description: 'Make any custom HTTP request to Facebook Graph API',
        inputSchema: {
          type: 'object',
          properties: {
            method: { type: 'string' },
            resource: { type: 'string' },
            version: { type: 'string' },
            queryParameters: { type: 'object' },
            body: { type: 'object' }
          }
        },
        outputSchema: {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            data: { type: 'object' }
          }
        }
      },
      {
        id: 'get_node',
        name: 'Get Node Data',
        description: 'Retrieve data from any Facebook Graph API node',
        inputSchema: {
          type: 'object',
          properties: {
            nodeId: { type: 'string' },
            fields: { type: 'array' },
            version: { type: 'string' }
          }
        },
        outputSchema: {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            data: { type: 'object' }
          }
        }
      },
      {
        id: 'get_edge',
        name: 'Get Edge Data',
        description: 'Retrieve connections from a node',
        inputSchema: {
          type: 'object',
          properties: {
            nodeId: { type: 'string' },
            edge: { type: 'string' },
            fields: { type: 'array' },
            limit: { type: 'number' }
          }
        },
        outputSchema: {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            data: { type: 'object' }
          }
        }
      },
      {
        id: 'create_page_post',
        name: 'Create Page Post',
        description: 'Publish a post to a Facebook page',
        inputSchema: {
          type: 'object',
          properties: {
            pageId: { type: 'string' },
            message: { type: 'string' },
            link: { type: 'string' },
            published: { type: 'boolean' }
          }
        },
        outputSchema: {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            data: { type: 'object' }
          }
        }
      },
      {
        id: 'upload_page_photo',
        name: 'Upload Page Photo',
        description: 'Upload a photo to a Facebook page',
        inputSchema: {
          type: 'object',
          properties: {
            pageId: { type: 'string' },
            url: { type: 'string' },
            caption: { type: 'string' },
            published: { type: 'boolean' }
          }
        },
        outputSchema: {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            data: { type: 'object' }
          }
        }
      },
      {
        id: 'upload_page_video',
        name: 'Upload Page Video',
        description: 'Upload a video to a Facebook page',
        inputSchema: {
          type: 'object',
          properties: {
            pageId: { type: 'string' },
            file_url: { type: 'string' },
            title: { type: 'string' },
            description: { type: 'string' },
            published: { type: 'boolean' }
          }
        },
        outputSchema: {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            data: { type: 'object' }
          }
        }
      },
      {
        id: 'get_pages',
        name: 'Get User Pages',
        description: 'List all Facebook pages managed by the user',
        inputSchema: {
          type: 'object',
          properties: {
            fields: { type: 'array' },
            limit: { type: 'number' }
          }
        },
        outputSchema: {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            data: { type: 'array' }
          }
        }
      },
      {
        id: 'delete_post',
        name: 'Delete Post',
        description: 'Delete a Facebook post',
        inputSchema: {
          type: 'object',
          properties: {
            postId: { type: 'string' }
          }
        },
        outputSchema: {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            data: { type: 'object' }
          }
        }
      },
      {
        id: 'comment_on_post',
        name: 'Comment on Post',
        description: 'Add a comment to a Facebook post',
        inputSchema: {
          type: 'object',
          properties: {
            postId: { type: 'string' },
            message: { type: 'string' }
          }
        },
        outputSchema: {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            data: { type: 'object' }
          }
        }
      },
      {
        id: 'get_page_insights',
        name: 'Get Page Insights',
        description: 'Retrieve analytics for a Facebook page',
        inputSchema: {
          type: 'object',
          properties: {
            pageId: { type: 'string' },
            metric: { type: 'array' },
            period: { type: 'string' }
          }
        },
        outputSchema: {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            data: { type: 'array' }
          }
        }
      }
    ];
  }

  private getTriggers(): ConnectorTrigger[] {
    return [
      {
        id: 'page_post_published',
        name: 'Page Post Published',
        description: 'Triggers when a new post is published',
        eventType: 'feed',
        outputSchema: {
          type: 'object',
          properties: {
            postId: { type: 'string' },
            message: { type: 'string' },
            createdTime: { type: 'string' },
            from: { type: 'object' }
          }
        },
        webhookRequired: true
      },
      {
        id: 'page_comment_received',
        name: 'Page Comment Received',
        description: 'Triggers when a comment is posted',
        eventType: 'comments',
        outputSchema: {
          type: 'object',
          properties: {
            commentId: { type: 'string' },
            message: { type: 'string' },
            postId: { type: 'string' },
            from: { type: 'object' }
          }
        },
        webhookRequired: true
      },
      {
        id: 'page_message_received',
        name: 'Page Message Received',
        description: 'Triggers when a message is sent to a page',
        eventType: 'messages',
        outputSchema: {
          type: 'object',
          properties: {
            messageId: { type: 'string' },
            text: { type: 'string' },
            from: { type: 'object' }
          }
        },
        webhookRequired: true
      }
    ];
  }
}
