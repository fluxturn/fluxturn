import { Injectable, Logger } from '@nestjs/common';
import { BaseConnector } from '../../base/base.connector';
import { ISocialConnector } from '../../base/connector.interface';
import {
  ConnectorConfig,
  ConnectorResponse,
  ConnectorMetadata,
  ConnectorType,
  ConnectorCategory,
  AuthType,
  PaginatedRequest,
  ConnectorRequest,
} from '../../types';
import axios from 'axios';

@Injectable()
export class YoutubeConnector extends BaseConnector implements ISocialConnector {
  private accessToken: string;
  private baseUrl = 'https://www.googleapis.com/youtube/v3';

  getMetadata(): ConnectorMetadata {
    return {
      name: 'YouTube',
      description: 'YouTube Data API v3 for managing videos, playlists, channels, and more',
      version: '1.0.0',
      category: ConnectorCategory.SOCIAL,
      type: ConnectorType.YOUTUBE,
      authType: AuthType.OAUTH2,
      actions: [
        {
          id: 'playlist_get',
          name: 'Get a Playlist',
          description: 'Retrieve detailed information about a YouTube playlist',
          inputSchema: {
            type: 'object',
            properties: {
              playlistId: { type: 'string', required: true },
              part: { type: 'array', required: true }
            }
          },
          outputSchema: {
            type: 'object',
            properties: {
              kind: { type: 'string' },
              etag: { type: 'string' },
              items: { type: 'array' }
            }
          }
        },
        {
          id: 'playlist_create',
          name: 'Create Playlist',
          description: 'Create a new YouTube playlist',
          inputSchema: {
            type: 'object',
            properties: {
              title: { type: 'string', required: true },
              options: { type: 'object' }
            }
          },
          outputSchema: {
            type: 'object',
            properties: {
              kind: { type: 'string' },
              etag: { type: 'string' },
              id: { type: 'string' },
              snippet: { type: 'object' }
            }
          }
        },
        {
          id: 'playlist_getAll',
          name: 'Get Many Playlists',
          description: 'Retrieve multiple YouTube playlists with filters',
          inputSchema: {
            type: 'object',
            properties: {
              part: { type: 'array', required: true },
              returnAll: { type: 'boolean' },
              limit: { type: 'number' },
              filters: { type: 'object' },
              options: { type: 'object' }
            }
          },
          outputSchema: {
            type: 'object',
            properties: {
              kind: { type: 'string' },
              etag: { type: 'string' },
              items: { type: 'array' }
            }
          }
        },
        {
          id: 'playlist_delete',
          name: 'Delete Playlist',
          description: 'Permanently delete a YouTube playlist',
          inputSchema: {
            type: 'object',
            properties: {
              playlistId: { type: 'string', required: true },
              options: { type: 'object' }
            }
          },
          outputSchema: {
            type: 'object',
            properties: {
              success: { type: 'boolean' }
            }
          }
        },
        {
          id: 'video_get',
          name: 'Get a Video',
          description: 'Retrieve detailed information about a YouTube video',
          inputSchema: {
            type: 'object',
            properties: {
              videoId: { type: 'string', required: true },
              part: { type: 'array', required: true }
            }
          },
          outputSchema: {
            type: 'object',
            properties: {
              kind: { type: 'string' },
              etag: { type: 'string' },
              items: { type: 'array' }
            }
          }
        },
        {
          id: 'video_delete',
          name: 'Delete a Video',
          description: 'Permanently delete a YouTube video',
          inputSchema: {
            type: 'object',
            properties: {
              videoId: { type: 'string', required: true }
            }
          },
          outputSchema: {
            type: 'object',
            properties: {
              success: { type: 'boolean' }
            }
          }
        },
        {
          id: 'video_getAll',
          name: 'Get Many Videos',
          description: 'Search and retrieve multiple YouTube videos with filters',
          inputSchema: {
            type: 'object',
            properties: {
              returnAll: { type: 'boolean' },
              limit: { type: 'number' },
              filters: { type: 'object' },
              options: { type: 'object' }
            }
          },
          outputSchema: {
            type: 'object',
            properties: {
              kind: { type: 'string' },
              etag: { type: 'string' },
              items: { type: 'array' }
            }
          }
        },
        {
          id: 'channel_get',
          name: 'Get a Channel',
          description: 'Retrieve detailed information about a YouTube channel',
          inputSchema: {
            type: 'object',
            properties: {
              channelId: { type: 'string', required: true },
              part: { type: 'array', required: true }
            }
          },
          outputSchema: {
            type: 'object',
            properties: {
              kind: { type: 'string' },
              etag: { type: 'string' },
              items: { type: 'array' }
            }
          }
        },
        {
          id: 'channel_getAll',
          name: 'Get Many Channels',
          description: 'Retrieve multiple YouTube channels with filters',
          inputSchema: {
            type: 'object',
            properties: {
              part: { type: 'array', required: true },
              returnAll: { type: 'boolean' },
              limit: { type: 'number' },
              filters: { type: 'object' },
              options: { type: 'object' }
            }
          },
          outputSchema: {
            type: 'object',
            properties: {
              kind: { type: 'string' },
              etag: { type: 'string' },
              items: { type: 'array' }
            }
          }
        },
        {
          id: 'playlist_update',
          name: 'Update Playlist',
          description: 'Update an existing YouTube playlist',
          inputSchema: {
            type: 'object',
            properties: {
              playlistId: { type: 'string', required: true },
              title: { type: 'string', required: true },
              updateFields: { type: 'object' }
            }
          },
          outputSchema: {
            type: 'object',
            properties: {
              kind: { type: 'string' },
              etag: { type: 'string' },
              id: { type: 'string' }
            }
          }
        },
        {
          id: 'playlistItem_add',
          name: 'Add Playlist Item',
          description: 'Add a video to a YouTube playlist',
          inputSchema: {
            type: 'object',
            properties: {
              playlistId: { type: 'string', required: true },
              videoId: { type: 'string', required: true },
              options: { type: 'object' }
            }
          },
          outputSchema: {
            type: 'object',
            properties: {
              kind: { type: 'string' },
              etag: { type: 'string' },
              id: { type: 'string' }
            }
          }
        },
        {
          id: 'playlistItem_delete',
          name: 'Delete Playlist Item',
          description: 'Remove a video from a YouTube playlist',
          inputSchema: {
            type: 'object',
            properties: {
              playlistItemId: { type: 'string', required: true },
              options: { type: 'object' }
            }
          },
          outputSchema: {
            type: 'object',
            properties: {
              success: { type: 'boolean' }
            }
          }
        },
        {
          id: 'playlistItem_get',
          name: 'Get a Playlist Item',
          description: 'Retrieve information about a specific playlist item',
          inputSchema: {
            type: 'object',
            properties: {
              playlistItemId: { type: 'string', required: true },
              part: { type: 'array', required: true },
              options: { type: 'object' }
            }
          },
          outputSchema: {
            type: 'object',
            properties: {
              kind: { type: 'string' },
              etag: { type: 'string' },
              items: { type: 'array' }
            }
          }
        },
        {
          id: 'playlistItem_getAll',
          name: 'Get Many Playlist Items',
          description: 'Retrieve all items from a YouTube playlist',
          inputSchema: {
            type: 'object',
            properties: {
              playlistId: { type: 'string', required: true },
              part: { type: 'array', required: true },
              returnAll: { type: 'boolean' },
              limit: { type: 'number' },
              options: { type: 'object' }
            }
          },
          outputSchema: {
            type: 'object',
            properties: {
              kind: { type: 'string' },
              etag: { type: 'string' },
              items: { type: 'array' }
            }
          }
        },
        {
          id: 'video_rate',
          name: 'Rate a Video',
          description: 'Like, dislike, or remove rating from a YouTube video',
          inputSchema: {
            type: 'object',
            properties: {
              videoId: { type: 'string', required: true },
              rating: { type: 'string', required: true }
            }
          },
          outputSchema: {
            type: 'object',
            properties: {
              success: { type: 'boolean' }
            }
          }
        },
        {
          id: 'video_update',
          name: 'Update a Video',
          description: 'Update metadata for a YouTube video',
          inputSchema: {
            type: 'object',
            properties: {
              videoId: { type: 'string', required: true },
              title: { type: 'string', required: true },
              categoryId: { type: 'string', required: true },
              updateFields: { type: 'object' }
            }
          },
          outputSchema: {
            type: 'object',
            properties: {
              kind: { type: 'string' },
              etag: { type: 'string' },
              id: { type: 'string' }
            }
          }
        },
        {
          id: 'video_upload',
          name: 'Upload a Video',
          description: 'Upload a video file to YouTube',
          inputSchema: {
            type: 'object',
            properties: {
              title: { type: 'string', required: true },
              categoryId: { type: 'string', required: true },
              binaryProperty: { type: 'string', required: true },
              options: { type: 'object' }
            }
          },
          outputSchema: {
            type: 'object',
            properties: {
              kind: { type: 'string' },
              etag: { type: 'string' },
              id: { type: 'string' }
            }
          }
        }
      ],
      triggers: [],
      requiredScopes: [
        'https://www.googleapis.com/auth/youtube',
        'https://www.googleapis.com/auth/youtube.readonly',
        'https://www.googleapis.com/auth/youtube.force-ssl'
      ]
    };
  }

  protected async initializeConnection(): Promise<void> {
    if (!this.config.credentials) {
      throw new Error('YouTube credentials are required');
    }

    const { accessToken, refreshToken, expiresAt } = this.config.credentials;

    if (!accessToken) {
      throw new Error('Missing required YouTube credentials (accessToken)');
    }

    // Check if token is expired or expiring soon (within 5 minutes)
    if (expiresAt && refreshToken) {
      const expirationTime = new Date(expiresAt).getTime();
      const currentTime = Date.now();
      const fiveMinutesInMs = 5 * 60 * 1000;

      if (currentTime >= expirationTime - fiveMinutesInMs) {
        this.logger.log('YouTube access token expired or expiring soon, refreshing...');
        await this.refreshAccessToken();
        return;
      }
    }

    this.accessToken = accessToken;
    this.logger.log('YouTube connector initialized successfully');
  }

  /**
   * Refresh the YouTube access token using the refresh token
   */
  private async refreshAccessToken(): Promise<void> {
    const { refreshToken } = this.config.credentials;

    if (!refreshToken) {
      throw new Error('No refresh token available to refresh access token');
    }

    try {
      // Get OAuth settings from connector definition or use defaults
      // Check multiple possible env var names for Google OAuth credentials
      const clientId = process.env.YOUTUBE_CLIENT_ID
        || process.env.GOOGLE_CLIENT_ID
        || process.env.GOOGLE_OAUTH_CLIENT_ID;
      const clientSecret = process.env.YOUTUBE_CLIENT_SECRET
        || process.env.GOOGLE_CLIENT_SECRET
        || process.env.GOOGLE_OAUTH_CLIENT_SECRET;

      if (!clientId || !clientSecret) {
        throw new Error('YouTube/Google OAuth client credentials not configured. Set GOOGLE_OAUTH_CLIENT_ID and GOOGLE_OAUTH_CLIENT_SECRET in your .env file.');
      }

      const response = await axios.post(
        'https://oauth2.googleapis.com/token',
        new URLSearchParams({
          client_id: clientId,
          client_secret: clientSecret,
          refresh_token: refreshToken,
          grant_type: 'refresh_token',
        }).toString(),
        {
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
          },
        }
      );

      const { access_token, expires_in } = response.data;

      // Update credentials in memory
      this.accessToken = access_token;
      this.config.credentials.accessToken = access_token;
      this.config.credentials.expiresAt = new Date(
        Date.now() + expires_in * 1000
      ).toISOString();

      this.logger.log('YouTube access token refreshed successfully');
    } catch (error: any) {
      this.logger.error(`Failed to refresh YouTube access token: ${error.message}`);
      throw new Error(`Failed to refresh YouTube token: ${error.message}`);
    }
  }

  async initialize(config: ConnectorConfig): Promise<void> {
    this.config = config;
    await this.initializeConnection();
  }

  protected async performConnectionTest(): Promise<boolean> {
    try {
      if (!this.accessToken) {
        throw new Error('YouTube connector not initialized');
      }

      // Test connection by fetching the authenticated user's channel
      const response = await axios.get(
        `${this.baseUrl}/channels`,
        {
          params: {
            part: 'snippet',
            mine: true
          },
          headers: {
            'Authorization': `Bearer ${this.accessToken}`,
            'Accept': 'application/json'
          }
        }
      );

      return response.status === 200;
    } catch (error) {
      this.logger.error('YouTube connection test failed:', error.response?.data || error.message);
      return false;
    }
  }

  protected async performHealthCheck(): Promise<void> {
    const isHealthy = await this.performConnectionTest();
    if (!isHealthy) {
      throw new Error('YouTube connector health check failed');
    }
  }

  protected async performRequest(request: ConnectorRequest): Promise<any> {
    return await axios.request({
      method: request.method,
      url: request.endpoint,
      headers: request.headers,
      params: request.queryParams,
      data: request.body,
      timeout: request.timeout
    });
  }

  protected async performAction(actionId: string, input: any): Promise<any> {
    return await this.executeAction(actionId, input);
  }

  protected async cleanup(): Promise<void> {
    this.logger.log('YouTube connector cleanup completed');
  }

  // ISocialConnector interface methods
  async postContent(content: any): Promise<ConnectorResponse> {
    return {
      success: false,
      error: {
        code: 'NOT_IMPLEMENTED',
        message: 'Post content not implemented for YouTube connector'
      }
    };
  }

  async getPosts(options?: PaginatedRequest): Promise<ConnectorResponse> {
    return {
      success: false,
      error: {
        code: 'NOT_IMPLEMENTED',
        message: 'Get posts not implemented for YouTube connector'
      }
    };
  }

  async getUserProfile(userId?: string): Promise<ConnectorResponse> {
    try {
      if (!this.accessToken) {
        throw new Error('YouTube connector not initialized');
      }

      const params: any = {
        part: 'snippet,statistics,contentDetails'
      };

      if (userId) {
        params.id = userId;
      } else {
        params.mine = true;
      }

      const response = await axios.get(
        `${this.baseUrl}/channels`,
        {
          params,
          headers: {
            'Authorization': `Bearer ${this.accessToken}`,
            'Accept': 'application/json'
          }
        }
      );

      return {
        success: true,
        data: response.data
      };
    } catch (error) {
      this.logger.error('Failed to get YouTube channel:', error);
      return {
        success: false,
        error: {
          code: 'GET_PROFILE_FAILED',
          message: error.response?.data?.error?.message || error.message
        }
      };
    }
  }

  async getConnections(type: 'followers' | 'following', options?: PaginatedRequest): Promise<ConnectorResponse> {
    try {
      if (!this.accessToken) {
        throw new Error('YouTube connector not initialized');
      }

      if (type === 'followers') {
        // Get subscriber count from channel statistics
        const channelResponse = await this.getUserProfile();
        if (channelResponse.success && channelResponse.data?.items?.[0]) {
          const subscriberCount = channelResponse.data.items[0].statistics?.subscriberCount;
          return {
            success: true,
            data: {
              total_followers: subscriberCount ? parseInt(subscriberCount) : 0
            }
          };
        }
      } else if (type === 'following') {
        // Get list of subscriptions (channels the user is subscribed to)
        const params: any = {
          part: 'snippet',
          mine: true,
          maxResults: options?.limit || 25
        };

        if (options?.cursor) {
          params.pageToken = options.cursor;
        }

        const response = await axios.get(
          `${this.baseUrl}/subscriptions`,
          {
            params,
            headers: {
              'Authorization': `Bearer ${this.accessToken}`,
              'Accept': 'application/json'
            }
          }
        );

        return {
          success: true,
          data: {
            items: response.data.items || [],
            pagination: {
              next_cursor: response.data.nextPageToken,
              has_more: !!response.data.nextPageToken
            }
          }
        };
      }

      return {
        success: false,
        error: {
          code: 'INVALID_TYPE',
          message: `Invalid connection type: ${type}`
        }
      };
    } catch (error) {
      this.logger.error('Failed to get YouTube connections:', error);
      return {
        success: false,
        error: {
          code: 'GET_CONNECTIONS_FAILED',
          message: error.response?.data?.error?.message || error.message
        }
      };
    }
  }

  async schedulePost(content: any, scheduledTime: Date): Promise<ConnectorResponse> {
    return {
      success: false,
      error: {
        code: 'NOT_IMPLEMENTED',
        message: 'Schedule post not implemented for YouTube connector'
      }
    };
  }

  // Playlist Operations

  // Create Playlist
  async createPlaylist(title: string, options?: any): Promise<ConnectorResponse> {
    try {
      if (!this.accessToken) {
        throw new Error('YouTube connector not initialized');
      }

      const params: any = {
        part: 'snippet,status'
      };

      const body: any = {
        snippet: {
          title
        }
      };

      // Add optional snippet fields
      if (options?.description) {
        body.snippet.description = options.description;
      }
      if (options?.tags) {
        // Split comma-separated tags into array
        body.snippet.tags = options.tags.split(',').map((tag: string) => tag.trim());
      }
      if (options?.defaultLanguage) {
        body.snippet.defaultLanguage = options.defaultLanguage;
      }

      // Add status (privacy) if provided
      if (options?.privacyStatus) {
        body.status = {
          privacyStatus: options.privacyStatus
        };
      }

      // Add query string parameters
      if (options?.onBehalfOfContentOwner) {
        params.onBehalfOfContentOwner = options.onBehalfOfContentOwner;
      }
      if (options?.onBehalfOfContentOwnerChannel) {
        params.onBehalfOfContentOwnerChannel = options.onBehalfOfContentOwnerChannel;
      }

      const response = await axios.post(
        `${this.baseUrl}/playlists`,
        body,
        {
          params,
          headers: {
            'Authorization': `Bearer ${this.accessToken}`,
            'Accept': 'application/json',
            'Content-Type': 'application/json'
          }
        }
      );

      return {
        success: true,
        data: response.data
      };
    } catch (error) {
      this.logger.error('Failed to create YouTube playlist:', error);
      return {
        success: false,
        error: {
          code: 'CREATE_PLAYLIST_FAILED',
          message: error.response?.data?.error?.message || error.message
        }
      };
    }
  }

  // Get a Playlist
  async getPlaylist(playlistId: string, part: string | string[], options?: any): Promise<ConnectorResponse> {
    try {
      if (!this.accessToken) {
        throw new Error('YouTube connector not initialized');
      }

      // Normalize part to array
      let parts: string[] = Array.isArray(part) ? part : [part];

      // Handle '*' to request all parts
      if (parts.includes('*')) {
        parts = ['id', 'snippet', 'contentDetails', 'status', 'player', 'localizations'];
      }

      const params: any = {
        part: parts.join(','),
        id: playlistId
      };

      // Add optional parameters
      if (options?.onBehalfOfContentOwner) {
        params.onBehalfOfContentOwner = options.onBehalfOfContentOwner;
      }
      if (options?.onBehalfOfContentOwnerChannel) {
        params.onBehalfOfContentOwnerChannel = options.onBehalfOfContentOwnerChannel;
      }

      const response = await axios.get(
        `${this.baseUrl}/playlists`,
        {
          params,
          headers: {
            'Authorization': `Bearer ${this.accessToken}`,
            'Accept': 'application/json'
          }
        }
      );

      return {
        success: true,
        data: response.data
      };
    } catch (error) {
      this.logger.error('Failed to get YouTube playlist:', error);
      return {
        success: false,
        error: {
          code: 'GET_PLAYLIST_FAILED',
          message: error.response?.data?.error?.message || error.message
        }
      };
    }
  }

  // Get Many Playlists
  async getManyPlaylists(part: string | string[], returnAll: boolean, limit: number, filters?: any, options?: any): Promise<ConnectorResponse> {
    try {
      if (!this.accessToken) {
        throw new Error('YouTube connector not initialized');
      }

      // Normalize part to array
      let parts: string[] = Array.isArray(part) ? part : [part];

      // Handle '*' to request all parts
      if (parts.includes('*')) {
        parts = ['contentDetails', 'id', 'localizations', 'player', 'snippet', 'status'];
      }

      const params: any = {
        part: parts.join(','),
        mine: true
      };

      // Apply filters
      if (filters) {
        if (filters.channelId) {
          params.channelId = filters.channelId;
        }
        if (filters.id) {
          params.id = filters.id;
        }

        // If channelId or id is specified, remove mine parameter
        if (filters.channelId || filters.id) {
          delete params.mine;
        }
      }

      // Apply options
      if (options) {
        if (options.onBehalfOfContentOwner) {
          params.onBehalfOfContentOwner = options.onBehalfOfContentOwner;
        }
        if (options.onBehalfOfContentOwnerChannel) {
          params.onBehalfOfContentOwnerChannel = options.onBehalfOfContentOwnerChannel;
        }
      }

      if (returnAll) {
        // Fetch all pages
        let allItems: any[] = [];
        let nextPageToken: string | undefined = undefined;

        do {
          if (nextPageToken) {
            params.pageToken = nextPageToken;
          }

          const response = await axios.get(
            `${this.baseUrl}/playlists`,
            {
              params: { ...params, maxResults: 50 },
              headers: {
                'Authorization': `Bearer ${this.accessToken}`,
                'Accept': 'application/json'
              }
            }
          );

          allItems = allItems.concat(response.data.items || []);
          nextPageToken = response.data.nextPageToken;

        } while (nextPageToken);

        return {
          success: true,
          data: allItems
        };
      } else {
        // Fetch limited results
        params.maxResults = Math.min(limit || 25, 50);

        const response = await axios.get(
          `${this.baseUrl}/playlists`,
          {
            params,
            headers: {
              'Authorization': `Bearer ${this.accessToken}`,
              'Accept': 'application/json'
            }
          }
        );

        return {
          success: true,
          data: response.data.items || response.data
        };
      }
    } catch (error) {
      this.logger.error('Failed to get many YouTube playlists:', error);
      return {
        success: false,
        error: {
          code: 'GET_MANY_PLAYLISTS_FAILED',
          message: error.response?.data?.error?.message || error.message
        }
      };
    }
  }

  // Delete Playlist
  async deletePlaylist(playlistId: string, options?: any): Promise<ConnectorResponse> {
    try {
      if (!this.accessToken) {
        throw new Error('YouTube connector not initialized');
      }

      const params: any = {
        id: playlistId
      };

      // Add optional parameters
      if (options?.onBehalfOfContentOwner) {
        params.onBehalfOfContentOwner = options.onBehalfOfContentOwner;
      }

      await axios.delete(
        `${this.baseUrl}/playlists`,
        {
          params,
          headers: {
            'Authorization': `Bearer ${this.accessToken}`,
            'Accept': 'application/json'
          }
        }
      );

      return {
        success: true,
        data: { success: true }
      };
    } catch (error) {
      this.logger.error('Failed to delete YouTube playlist:', error);
      return {
        success: false,
        error: {
          code: 'DELETE_PLAYLIST_FAILED',
          message: error.response?.data?.error?.message || error.message
        }
      };
    }
  }

  // Video Operations

  // Get a Video
  async getVideo(videoId: string, part: string | string[], options?: any): Promise<ConnectorResponse> {
    try {
      if (!this.accessToken) {
        throw new Error('YouTube connector not initialized');
      }

      // Normalize part to array
      let parts: string[] = Array.isArray(part) ? part : [part];

      // Handle '*' to request all parts
      if (parts.includes('*')) {
        parts = [
          'contentDetails',
          'id',
          'liveStreamingDetails',
          'localizations',
          'player',
          'recordingDetails',
          'snippet',
          'statistics',
          'status',
          'topicDetails',
        ];
      }

      const params: any = {
        part: parts.join(','),
        id: videoId
      };

      // Add optional parameters
      if (options?.onBehalfOfContentOwner) {
        params.onBehalfOfContentOwner = options.onBehalfOfContentOwner;
      }

      const response = await axios.get(
        `${this.baseUrl}/videos`,
        {
          params,
          headers: {
            'Authorization': `Bearer ${this.accessToken}`,
            'Accept': 'application/json'
          }
        }
      );

      return {
        success: true,
        data: response.data.items || response.data
      };
    } catch (error) {
      this.logger.error('Failed to get YouTube video:', error);
      return {
        success: false,
        error: {
          code: 'GET_VIDEO_FAILED',
          message: error.response?.data?.error?.message || error.message
        }
      };
    }
  }

  // Delete a Video
  async deleteVideo(videoId: string, options?: any): Promise<ConnectorResponse> {
    try {
      if (!this.accessToken) {
        throw new Error('YouTube connector not initialized');
      }

      const params: any = {
        id: videoId
      };

      // Add optional parameters
      if (options?.onBehalfOfContentOwner) {
        params.onBehalfOfContentOwner = options.onBehalfOfContentOwner;
      }

      await axios.delete(
        `${this.baseUrl}/videos`,
        {
          params,
          headers: {
            'Authorization': `Bearer ${this.accessToken}`,
            'Accept': 'application/json'
          }
        }
      );

      return {
        success: true,
        data: { success: true }
      };
    } catch (error) {
      this.logger.error('Failed to delete YouTube video:', error);
      return {
        success: false,
        error: {
          code: 'DELETE_VIDEO_FAILED',
          message: error.response?.data?.error?.message || error.message
        }
      };
    }
  }

  // Get Many Videos
  async getManyVideos(returnAll: boolean, limit: number, filters?: any, options?: any): Promise<ConnectorResponse> {
    try {
      if (!this.accessToken) {
        throw new Error('YouTube connector not initialized');
      }

      const params: any = {
        part: 'snippet',
        type: 'video',
        forMine: true
      };

      // Apply filters
      if (filters) {
        if (filters.channelId) {
          params.channelId = filters.channelId;
        }
        if (filters.forDeveloper !== undefined) {
          params.forDeveloper = filters.forDeveloper;
        }
        if (filters.publishedAfter) {
          params.publishedAfter = filters.publishedAfter;
        }
        if (filters.publishedBefore) {
          params.publishedBefore = filters.publishedBefore;
        }
        if (filters.q) {
          params.q = filters.q;
        }
        if (filters.regionCode) {
          params.regionCode = filters.regionCode;
        }
        if (filters.relatedToVideoId) {
          params.relatedToVideoId = filters.relatedToVideoId;
        }
        if (filters.videoCategoryId) {
          params.videoCategoryId = filters.videoCategoryId;
        }
        if (filters.videoSyndicated !== undefined) {
          params.videoSyndicated = filters.videoSyndicated;
        }
        if (filters.videoType) {
          params.videoType = filters.videoType;
        }

        // If any filter is applied, remove forMine
        if (Object.keys(filters).length > 0) {
          delete params.forMine;
        }
      }

      // Apply options
      if (options) {
        if (options.order) {
          params.order = options.order;
        }
        if (options.safeSearch) {
          params.safeSearch = options.safeSearch;
        }
      }

      // Validate conflicting parameters
      if (params.relatedToVideoId && params.forDeveloper !== undefined) {
        return {
          success: false,
          error: {
            code: 'INVALID_PARAMETERS',
            message: "When using the parameter 'relatedToVideoId' the parameter 'forDeveloper' cannot be set"
          }
        };
      }

      if (returnAll) {
        // Fetch all pages
        let allItems: any[] = [];
        let nextPageToken: string | undefined = undefined;

        do {
          if (nextPageToken) {
            params.pageToken = nextPageToken;
          }

          const response = await axios.get(
            `${this.baseUrl}/search`,
            {
              params: { ...params, maxResults: 50 },
              headers: {
                'Authorization': `Bearer ${this.accessToken}`,
                'Accept': 'application/json'
              }
            }
          );

          allItems = allItems.concat(response.data.items || []);
          nextPageToken = response.data.nextPageToken;

        } while (nextPageToken);

        return {
          success: true,
          data: allItems
        };
      } else {
        // Fetch limited results
        params.maxResults = Math.min(limit || 25, 50);

        const response = await axios.get(
          `${this.baseUrl}/search`,
          {
            params,
            headers: {
              'Authorization': `Bearer ${this.accessToken}`,
              'Accept': 'application/json'
            }
          }
        );

        return {
          success: true,
          data: response.data.items || response.data
        };
      }
    } catch (error) {
      this.logger.error('Failed to get many YouTube videos:', error);
      return {
        success: false,
        error: {
          code: 'GET_MANY_VIDEOS_FAILED',
          message: error.response?.data?.error?.message || error.message
        }
      };
    }
  }

  // Channel Operations

  // Get a Channel
  async getChannel(channelId: string, part: string | string[]): Promise<ConnectorResponse> {
    try {
      if (!this.accessToken) {
        throw new Error('YouTube connector not initialized');
      }

      // Normalize part to array
      let parts: string[] = Array.isArray(part) ? part : [part];

      // Handle '*' to request all parts
      if (parts.includes('*')) {
        parts = [
          'brandingSettings',
          'contentDetails',
          'contentOwnerDetails',
          'id',
          'localizations',
          'snippet',
          'statistics',
          'status',
          'topicDetails',
        ];
      }

      const params: any = {
        part: parts.join(','),
        id: channelId
      };

      const response = await axios.get(
        `${this.baseUrl}/channels`,
        {
          params,
          headers: {
            'Authorization': `Bearer ${this.accessToken}`,
            'Accept': 'application/json'
          }
        }
      );

      return {
        success: true,
        data: response.data.items || response.data
      };
    } catch (error) {
      this.logger.error('Failed to get YouTube channel:', error);
      return {
        success: false,
        error: {
          code: 'GET_CHANNEL_FAILED',
          message: error.response?.data?.error?.message || error.message
        }
      };
    }
  }

  // Get Many Channels
  async getManyChannels(part: string | string[], returnAll: boolean, limit: number, filters?: any, options?: any): Promise<ConnectorResponse> {
    try {
      if (!this.accessToken) {
        throw new Error('YouTube connector not initialized');
      }

      // Normalize part to array
      let parts: string[] = Array.isArray(part) ? part : [part];

      // Handle '*' to request all parts
      if (parts.includes('*')) {
        parts = [
          'brandingSettings',
          'contentDetails',
          'contentOwnerDetails',
          'id',
          'localizations',
          'snippet',
          'statistics',
          'status',
          'topicDetails',
        ];
      }

      const params: any = {
        part: parts.join(','),
        mine: true
      };

      // Apply filters
      if (filters) {
        if (filters.categoryId) {
          params.categoryId = filters.categoryId;
        }
        if (filters.forUsername) {
          params.forUsername = filters.forUsername;
        }
        if (filters.id) {
          params.id = filters.id;
        }
        if (filters.managedByMe !== undefined) {
          params.managedByMe = filters.managedByMe;
        }

        // If any filter is specified, remove mine parameter
        if (filters.categoryId || filters.forUsername || filters.id || filters.managedByMe) {
          delete params.mine;
        }
      }

      // Apply options
      if (options) {
        if (options.hl) {
          params.hl = options.hl;
        }
        if (options.onBehalfOfContentOwner) {
          params.onBehalfOfContentOwner = options.onBehalfOfContentOwner;
        }
      }

      if (returnAll) {
        // Fetch all pages
        let allItems: any[] = [];
        let nextPageToken: string | undefined = undefined;

        do {
          if (nextPageToken) {
            params.pageToken = nextPageToken;
          }

          const response = await axios.get(
            `${this.baseUrl}/channels`,
            {
              params: { ...params, maxResults: 50 },
              headers: {
                'Authorization': `Bearer ${this.accessToken}`,
                'Accept': 'application/json'
              }
            }
          );

          allItems = allItems.concat(response.data.items || []);
          nextPageToken = response.data.nextPageToken;

        } while (nextPageToken);

        return {
          success: true,
          data: allItems
        };
      } else {
        // Fetch limited results
        params.maxResults = Math.min(limit || 25, 50);

        const response = await axios.get(
          `${this.baseUrl}/channels`,
          {
            params,
            headers: {
              'Authorization': `Bearer ${this.accessToken}`,
              'Accept': 'application/json'
            }
          }
        );

        return {
          success: true,
          data: response.data.items || response.data
        };
      }
    } catch (error) {
      this.logger.error('Failed to get many YouTube channels:', error);
      return {
        success: false,
        error: {
          code: 'GET_MANY_CHANNELS_FAILED',
          message: error.response?.data?.error?.message || error.message
        }
      };
    }
  }

  // Update Playlist
  async updatePlaylist(playlistId: string, title: string, updateFields?: any): Promise<ConnectorResponse> {
    try {
      if (!this.accessToken) {
        throw new Error('YouTube connector not initialized');
      }

      const params: any = {
        part: 'snippet,status'
      };

      const body: any = {
        id: playlistId,
        snippet: {
          title
        },
        status: {}
      };

      // Add optional snippet fields
      if (updateFields?.description) {
        body.snippet.description = updateFields.description;
      }
      if (updateFields?.tags) {
        body.snippet.tags = updateFields.tags.split(',').map((tag: string) => tag.trim());
      }
      if (updateFields?.defaultLanguage) {
        body.snippet.defaultLanguage = updateFields.defaultLanguage;
      }

      // Add status fields
      if (updateFields?.privacyStatus) {
        body.status.privacyStatus = updateFields.privacyStatus;
      }

      // Add query string parameters
      if (updateFields?.onBehalfOfContentOwner) {
        params.onBehalfOfContentOwner = updateFields.onBehalfOfContentOwner;
      }

      const response = await axios.put(
        `${this.baseUrl}/playlists`,
        body,
        {
          params,
          headers: {
            'Authorization': `Bearer ${this.accessToken}`,
            'Accept': 'application/json',
            'Content-Type': 'application/json'
          }
        }
      );

      return {
        success: true,
        data: response.data
      };
    } catch (error) {
      this.logger.error('Failed to update YouTube playlist:', error);
      return {
        success: false,
        error: {
          code: 'UPDATE_PLAYLIST_FAILED',
          message: error.response?.data?.error?.message || error.message
        }
      };
    }
  }

  // Playlist Item Operations

  // Add Playlist Item
  async addPlaylistItem(playlistId: string, videoId: string, options?: any): Promise<ConnectorResponse> {
    try {
      if (!this.accessToken) {
        throw new Error('YouTube connector not initialized');
      }

      const params: any = {
        part: 'snippet,contentDetails'
      };

      const body: any = {
        snippet: {
          playlistId,
          resourceId: {
            kind: 'youtube#video',
            videoId
          }
        },
        contentDetails: {}
      };

      // Add optional snippet fields
      if (options?.position !== undefined) {
        body.snippet.position = options.position;
      }

      // Add content details
      if (options?.note) {
        body.contentDetails.note = options.note;
      }
      if (options?.startAt) {
        body.contentDetails.startAt = options.startAt;
      }
      if (options?.endAt) {
        body.contentDetails.endAt = options.endAt;
      }

      // Add query string parameters
      if (options?.onBehalfOfContentOwner) {
        params.onBehalfOfContentOwner = options.onBehalfOfContentOwner;
      }

      const response = await axios.post(
        `${this.baseUrl}/playlistItems`,
        body,
        {
          params,
          headers: {
            'Authorization': `Bearer ${this.accessToken}`,
            'Accept': 'application/json',
            'Content-Type': 'application/json'
          }
        }
      );

      return {
        success: true,
        data: response.data
      };
    } catch (error) {
      this.logger.error('Failed to add YouTube playlist item:', error);
      return {
        success: false,
        error: {
          code: 'ADD_PLAYLIST_ITEM_FAILED',
          message: error.response?.data?.error?.message || error.message
        }
      };
    }
  }

  // Delete Playlist Item
  async deletePlaylistItem(playlistItemId: string, options?: any): Promise<ConnectorResponse> {
    try {
      if (!this.accessToken) {
        throw new Error('YouTube connector not initialized');
      }

      const params: any = {
        id: playlistItemId
      };

      // Add optional parameters
      if (options?.onBehalfOfContentOwner) {
        params.onBehalfOfContentOwner = options.onBehalfOfContentOwner;
      }

      await axios.delete(
        `${this.baseUrl}/playlistItems`,
        {
          params,
          headers: {
            'Authorization': `Bearer ${this.accessToken}`,
            'Accept': 'application/json'
          }
        }
      );

      return {
        success: true,
        data: { success: true }
      };
    } catch (error) {
      this.logger.error('Failed to delete YouTube playlist item:', error);
      return {
        success: false,
        error: {
          code: 'DELETE_PLAYLIST_ITEM_FAILED',
          message: error.response?.data?.error?.message || error.message
        }
      };
    }
  }

  // Get a Playlist Item
  async getPlaylistItem(playlistItemId: string, part: string | string[], options?: any): Promise<ConnectorResponse> {
    try {
      if (!this.accessToken) {
        throw new Error('YouTube connector not initialized');
      }

      // Normalize part to array
      let parts: string[] = Array.isArray(part) ? part : [part];

      // Handle '*' to request all parts
      if (parts.includes('*')) {
        parts = ['contentDetails', 'id', 'snippet', 'status'];
      }

      const params: any = {
        part: parts.join(','),
        id: playlistItemId
      };

      // Add optional parameters
      if (options?.onBehalfOfContentOwner) {
        params.onBehalfOfContentOwner = options.onBehalfOfContentOwner;
      }

      const response = await axios.get(
        `${this.baseUrl}/playlistItems`,
        {
          params,
          headers: {
            'Authorization': `Bearer ${this.accessToken}`,
            'Accept': 'application/json'
          }
        }
      );

      return {
        success: true,
        data: response.data.items || response.data
      };
    } catch (error) {
      this.logger.error('Failed to get YouTube playlist item:', error);
      return {
        success: false,
        error: {
          code: 'GET_PLAYLIST_ITEM_FAILED',
          message: error.response?.data?.error?.message || error.message
        }
      };
    }
  }

  // Get Many Playlist Items
  async getManyPlaylistItems(playlistId: string, part: string | string[], returnAll: boolean, limit: number, options?: any): Promise<ConnectorResponse> {
    try {
      if (!this.accessToken) {
        throw new Error('YouTube connector not initialized');
      }

      // Normalize part to array
      let parts: string[] = Array.isArray(part) ? part : [part];

      // Handle '*' to request all parts
      if (parts.includes('*')) {
        parts = ['contentDetails', 'id', 'snippet', 'status'];
      }

      const params: any = {
        part: parts.join(','),
        playlistId
      };

      // Apply options
      if (options?.onBehalfOfContentOwner) {
        params.onBehalfOfContentOwner = options.onBehalfOfContentOwner;
      }

      if (returnAll) {
        // Fetch all pages
        let allItems: any[] = [];
        let nextPageToken: string | undefined = undefined;

        do {
          if (nextPageToken) {
            params.pageToken = nextPageToken;
          }

          const response = await axios.get(
            `${this.baseUrl}/playlistItems`,
            {
              params: { ...params, maxResults: 50 },
              headers: {
                'Authorization': `Bearer ${this.accessToken}`,
                'Accept': 'application/json'
              }
            }
          );

          allItems = allItems.concat(response.data.items || []);
          nextPageToken = response.data.nextPageToken;

        } while (nextPageToken);

        return {
          success: true,
          data: allItems
        };
      } else {
        // Fetch limited results
        params.maxResults = Math.min(limit || 25, 50);

        const response = await axios.get(
          `${this.baseUrl}/playlistItems`,
          {
            params,
            headers: {
              'Authorization': `Bearer ${this.accessToken}`,
              'Accept': 'application/json'
            }
          }
        );

        return {
          success: true,
          data: response.data.items || response.data
        };
      }
    } catch (error) {
      this.logger.error('Failed to get many YouTube playlist items:', error);
      return {
        success: false,
        error: {
          code: 'GET_MANY_PLAYLIST_ITEMS_FAILED',
          message: error.response?.data?.error?.message || error.message
        }
      };
    }
  }

  // Rate a Video
  async rateVideo(videoId: string, rating: string): Promise<ConnectorResponse> {
    try {
      if (!this.accessToken) {
        throw new Error('YouTube connector not initialized');
      }

      const params: any = {
        id: videoId,
        rating
      };

      await axios.post(
        `${this.baseUrl}/videos/rate`,
        null,
        {
          params,
          headers: {
            'Authorization': `Bearer ${this.accessToken}`,
            'Accept': 'application/json'
          }
        }
      );

      return {
        success: true,
        data: { success: true }
      };
    } catch (error) {
      this.logger.error('Failed to rate YouTube video:', error);
      return {
        success: false,
        error: {
          code: 'RATE_VIDEO_FAILED',
          message: error.response?.data?.error?.message || error.message
        }
      };
    }
  }

  // Update a Video
  async updateVideo(videoId: string, title: string, categoryId: string, updateFields?: any): Promise<ConnectorResponse> {
    try {
      if (!this.accessToken) {
        throw new Error('YouTube connector not initialized');
      }

      const params: any = {
        part: 'snippet,status,recordingDetails'
      };

      const body: any = {
        id: videoId,
        snippet: {
          title,
          categoryId
        },
        status: {},
        recordingDetails: {}
      };

      // Add optional snippet fields
      if (updateFields?.description) {
        body.snippet.description = updateFields.description;
      }
      if (updateFields?.tags) {
        body.snippet.tags = updateFields.tags.split(',').map((tag: string) => tag.trim());
      }
      if (updateFields?.defaultLanguage) {
        body.snippet.defaultLanguage = updateFields.defaultLanguage;
      }

      // Add status fields
      if (updateFields?.privacyStatus) {
        body.status.privacyStatus = updateFields.privacyStatus;
      }
      if (updateFields?.embeddable !== undefined) {
        body.status.embeddable = updateFields.embeddable;
      }
      if (updateFields?.publicStatsViewable !== undefined) {
        body.status.publicStatsViewable = updateFields.publicStatsViewable;
      }
      if (updateFields?.publishAt) {
        body.status.publishAt = updateFields.publishAt;
      }
      if (updateFields?.selfDeclaredMadeForKids !== undefined) {
        body.status.selfDeclaredMadeForKids = updateFields.selfDeclaredMadeForKids;
      }
      if (updateFields?.license) {
        body.status.license = updateFields.license;
      }

      // Add recording details
      if (updateFields?.recordingDate) {
        body.recordingDetails.recordingDate = updateFields.recordingDate;
      }

      const response = await axios.put(
        `${this.baseUrl}/videos`,
        body,
        {
          params,
          headers: {
            'Authorization': `Bearer ${this.accessToken}`,
            'Accept': 'application/json',
            'Content-Type': 'application/json'
          }
        }
      );

      return {
        success: true,
        data: response.data
      };
    } catch (error) {
      this.logger.error('Failed to update YouTube video:', error);
      return {
        success: false,
        error: {
          code: 'UPDATE_VIDEO_FAILED',
          message: error.response?.data?.error?.message || error.message
        }
      };
    }
  }

  // Upload a Video
  async uploadVideo(title: string, categoryId: string, binaryPropertyName: string, options?: any): Promise<ConnectorResponse> {
    try {
      if (!this.accessToken) {
        throw new Error('YouTube connector not initialized');
      }

      this.logger.log('Starting YouTube video upload:', {
        title,
        categoryId,
        binaryPropertyName: typeof binaryPropertyName === 'string' ? binaryPropertyName.substring(0, 100) : 'binary data',
        hasOptions: !!options,
        hasVideoUrl: !!options?.videoUrl
      });

      // Validate required fields
      if (!title || !categoryId) {
        return {
          success: false,
          error: {
            code: 'MISSING_REQUIRED_FIELDS',
            message: 'Title and category ID are required for video upload'
          }
        };
      }

      // Get binary data from workflow context or URL
      let videoBuffer: Buffer;
      let videoMimeType: string = 'video/mp4';
      let videoFileName: string = 'video.mp4';

      // Check if videoUrl is provided in options (for PromotAtOnce and direct URL uploads)
      if (options?.videoUrl && typeof options.videoUrl === 'string') {
        this.logger.log('Downloading video from URL:', options.videoUrl);

        try {
          const videoResponse = await axios.get(options.videoUrl, {
            responseType: 'arraybuffer',
            timeout: 300000, // 5 minutes timeout for download
            maxContentLength: 500 * 1024 * 1024, // 500MB max
          });

          videoBuffer = Buffer.from(videoResponse.data);
          videoMimeType = String(videoResponse.headers['content-type'] || 'video/mp4');

          // Extract filename from URL
          const urlParts = options.videoUrl.split('/');
          const urlFileName = urlParts[urlParts.length - 1].split('?')[0];
          if (urlFileName && urlFileName.includes('.')) {
            videoFileName = urlFileName;
          }

          this.logger.log('Video downloaded successfully:', {
            size: videoBuffer.length,
            mimeType: videoMimeType,
            fileName: videoFileName
          });
        } catch (downloadError: any) {
          this.logger.error('Failed to download video from URL:', downloadError.message);
          return {
            success: false,
            error: {
              code: 'VIDEO_DOWNLOAD_FAILED',
              message: `Failed to download video from URL: ${downloadError.message}`
            }
          };
        }
      }
      // Check if binaryPropertyName is actually binary data or a reference
      else if (typeof binaryPropertyName === 'string' && binaryPropertyName.startsWith('$node')) {
        return {
          success: false,
          error: {
            code: 'BINARY_DATA_NOT_RESOLVED',
            message: `Binary property "${binaryPropertyName}" was not resolved. Make sure the previous node outputs binary data and the expression is correct.`
          }
        };
      }
      // Check if binaryPropertyName contains actual binary data object
      else if (typeof binaryPropertyName === 'object' && binaryPropertyName !== null) {
        // Binary data object structure: { data: Buffer, mimeType: string, fileName: string }
        if (Buffer.isBuffer(binaryPropertyName)) {
          videoBuffer = binaryPropertyName;
        } else {
          // Type assertion for binary data object
          const binaryData = binaryPropertyName as any;

          if (binaryData.data) {
            videoBuffer = Buffer.isBuffer(binaryData.data)
              ? binaryData.data
              : Buffer.from(binaryData.data);
            videoMimeType = binaryData.mimeType || videoMimeType;
            videoFileName = binaryData.fileName || videoFileName;
          } else {
            return {
              success: false,
              error: {
                code: 'INVALID_BINARY_DATA',
                message: 'Binary data object does not contain valid video data'
              }
            };
          }
        }
      } else {
        return {
          success: false,
          error: {
            code: 'BINARY_DATA_REQUIRED',
            message: 'Video file binary data or videoUrl is required. Please provide a valid binary data input or a URL to the video file.'
          }
        };
      }

      this.logger.log('Video data received:', {
        size: videoBuffer.length,
        mimeType: videoMimeType,
        fileName: videoFileName
      });

      // Prepare video metadata
      const videoMetadata: any = {
        snippet: {
          title: title,
          categoryId: categoryId
        },
        status: {
          privacyStatus: options?.privacyStatus || 'private',
          selfDeclaredMadeForKids: options?.selfDeclaredMadeForKids || false
        }
      };

      // Add optional metadata fields
      if (options?.description) {
        videoMetadata.snippet.description = options.description;
      }
      if (options?.tags) {
        videoMetadata.snippet.tags = Array.isArray(options.tags)
          ? options.tags
          : options.tags.split(',').map((tag: string) => tag.trim());
      }
      if (options?.defaultLanguage) {
        videoMetadata.snippet.defaultLanguage = options.defaultLanguage;
      }
      if (options?.embeddable !== undefined) {
        videoMetadata.status.embeddable = options.embeddable;
      }
      if (options?.license) {
        videoMetadata.status.license = options.license;
      }
      if (options?.publicStatsViewable !== undefined) {
        videoMetadata.status.publicStatsViewable = options.publicStatsViewable;
      }
      if (options?.publishAt) {
        videoMetadata.status.publishAt = options.publishAt;
      }
      if (options?.recordingDate) {
        videoMetadata.recordingDetails = {
          recordingDate: options.recordingDate
        };
      }

      this.logger.log('Video metadata prepared:', videoMetadata);

      // Step 1: Initialize resumable upload session
      this.logger.log('Initializing resumable upload session...');

      const initResponse = await axios.post(
        'https://www.googleapis.com/upload/youtube/v3/videos',
        videoMetadata,
        {
          params: {
            uploadType: 'resumable',
            part: 'snippet,status' + (options?.recordingDate ? ',recordingDetails' : '')
          },
          headers: {
            'Authorization': `Bearer ${this.accessToken}`,
            'Content-Type': 'application/json',
            'X-Upload-Content-Length': videoBuffer.length.toString(),
            'X-Upload-Content-Type': videoMimeType
          }
        }
      );

      const uploadUrl = initResponse.headers['location'];
      if (!uploadUrl) {
        throw new Error('Failed to get upload URL from YouTube');
      }

      this.logger.log('Upload session initialized, uploading video...');

      // Step 2: Upload the video file
      const uploadResponse = await axios.put(
        uploadUrl,
        videoBuffer,
        {
          headers: {
            'Content-Type': videoMimeType,
            'Content-Length': videoBuffer.length.toString()
          },
          maxContentLength: Infinity,
          maxBodyLength: Infinity,
          timeout: 600000 // 10 minutes timeout for large videos
        }
      );

      const videoData = uploadResponse.data;

      this.logger.log('Video uploaded successfully:', {
        videoId: videoData.id,
        title: videoData.snippet?.title
      });

      return {
        success: true,
        data: {
          videoId: videoData.id,
          title: videoData.snippet?.title,
          description: videoData.snippet?.description,
          channelId: videoData.snippet?.channelId,
          channelTitle: videoData.snippet?.channelTitle,
          categoryId: videoData.snippet?.categoryId,
          privacyStatus: videoData.status?.privacyStatus,
          uploadStatus: videoData.status?.uploadStatus,
          videoUrl: `https://www.youtube.com/watch?v=${videoData.id}`,
          thumbnails: videoData.snippet?.thumbnails,
          publishedAt: videoData.snippet?.publishedAt,
          tags: videoData.snippet?.tags,
          ...videoData
        }
      };
    } catch (error) {
      this.logger.error('Failed to upload YouTube video:', {
        errorMessage: error.message,
        errorStatus: error.response?.status,
        errorData: error.response?.data
      });

      return {
        success: false,
        error: {
          code: 'UPLOAD_VIDEO_FAILED',
          message: error.response?.data?.error?.message || error.message,
          details: {
            status: error.response?.status,
            data: error.response?.data
          }
        }
      };
    }
  }

  async executeAction(actionId: string, input: any): Promise<ConnectorResponse> {
    switch (actionId) {
      // Playlist actions
      case 'playlist_get':
        return this.getPlaylist(
          input.playlistId,
          input.part || ['*'],
          input.options
        );
      case 'playlist_create':
        return this.createPlaylist(
          input.title,
          input.options
        );
      case 'playlist_getAll':
        return this.getManyPlaylists(
          input.part || ['*'],
          input.returnAll || false,
          input.limit || 25,
          input.filters,
          input.options
        );
      case 'playlist_delete':
        return this.deletePlaylist(
          input.playlistId,
          input.options
        );
      // Video actions
      case 'video_get':
        return this.getVideo(
          input.videoId,
          input.part || ['*'],
          input.options
        );
      case 'video_delete':
        return this.deleteVideo(
          input.videoId,
          input.options
        );
      case 'video_getAll':
        return this.getManyVideos(
          input.returnAll || false,
          input.limit || 25,
          input.filters,
          input.options
        );
      // Channel actions
      case 'channel_get':
        return this.getChannel(
          input.channelId,
          input.part || ['*']
        );
      case 'channel_getAll':
        return this.getManyChannels(
          input.part || ['*'],
          input.returnAll || false,
          input.limit || 25,
          input.filters,
          input.options
        );
      // Playlist update action
      case 'playlist_update':
        return this.updatePlaylist(
          input.playlistId,
          input.title,
          input.updateFields
        );
      // Playlist item actions
      case 'playlistItem_add':
        return this.addPlaylistItem(
          input.playlistId,
          input.videoId,
          input.options
        );
      case 'playlistItem_delete':
        return this.deletePlaylistItem(
          input.playlistItemId,
          input.options
        );
      case 'playlistItem_get':
        return this.getPlaylistItem(
          input.playlistItemId,
          input.part || ['*'],
          input.options
        );
      case 'playlistItem_getAll':
        return this.getManyPlaylistItems(
          input.playlistId,
          input.part || ['*'],
          input.returnAll || false,
          input.limit || 25,
          input.options
        );
      // Video actions
      case 'video_rate':
        return this.rateVideo(
          input.videoId,
          input.rating
        );
      case 'video_update':
        return this.updateVideo(
          input.videoId,
          input.title,
          input.categoryId,
          input.updateFields
        );
      case 'video_upload':
        return this.uploadVideo(
          input.title,
          input.categoryId,
          input.binaryProperty,
          input.options
        );
      default:
        return {
          success: false,
          error: {
            code: 'UNKNOWN_ACTION',
            message: `Unknown action: ${actionId}`
          }
        };
    }
  }
}
