import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';
import { BaseConnector } from '../../base/base.connector';
import { ISocialConnector } from '../../base/connector.interface';
import {
  ConnectorConfig,
  ConnectorResponse,
  ConnectorRequest,
  ConnectorMetadata,
  ConnectorType,
  ConnectorCategory,
  AuthType,
  PaginatedRequest,
} from '../../types';
import { ConnectorConfigService } from '../../services/connector-config.service';
import { TikTokOAuthService } from '../../services/tiktok-oauth.service';

export interface TikTokVideoUploadOptions {
  videoUrl: string;
  title?: string;
  privacyLevel?: 'PUBLIC_TO_EVERYONE' | 'MUTUAL_FOLLOW_FRIENDS' | 'FOLLOWER_OF_CREATOR' | 'SELF_ONLY';
  disableComment?: boolean;
  disableDuet?: boolean;
  disableStitch?: boolean;
  videoCoverTimestampMs?: number;
}

export interface TikTokCreatorInfo {
  creator_avatar_url: string;
  creator_username: string;
  creator_nickname: string;
  privacy_level_options: string[];
  comment_disabled: boolean;
  duet_disabled: boolean;
  stitch_disabled: boolean;
  max_video_post_duration_sec: number;
}

@Injectable()
export class TikTokConnector extends BaseConnector implements ISocialConnector {
  private readonly apiBaseUrl = 'https://open.tiktokapis.com/v2';

  constructor(
    private readonly connectorConfigService: ConnectorConfigService,
    private readonly configService: ConfigService,
    private readonly tiktokOAuthService: TikTokOAuthService,
  ) {
    super();
  }

  getMetadata(): ConnectorMetadata {
    return {
      name: 'TikTok',
      description: 'TikTok connector for posting videos and managing content',
      version: '1.0.0',
      category: ConnectorCategory.SOCIAL,
      type: ConnectorType.TIKTOK,
      authType: AuthType.OAUTH2,
      actions: this.getActions(),
      triggers: this.getTriggers(),
      webhookSupport: false,
      requiredScopes: [
        'user.info.basic',
        'video.publish',
        'video.list'
      ]
    };
  }

  private getActions(): any[] {
    return [
      {
        id: 'post_video',
        name: 'Post Video',
        description: 'Upload and publish a video to TikTok',
        inputSchema: {
          videoUrl: { type: 'string', required: true },
          title: { type: 'string', required: false },
          privacyLevel: { type: 'string', required: false },
          disableComment: { type: 'boolean', required: false },
          disableDuet: { type: 'boolean', required: false },
          disableStitch: { type: 'boolean', required: false },
        },
        outputSchema: {
          publish_id: { type: 'string' },
          status: { type: 'string' },
        },
      },
      {
        id: 'get_videos',
        name: 'Get Videos',
        description: 'Get list of videos from the authenticated user',
        inputSchema: {
          cursor: { type: 'number', required: false },
          maxCount: { type: 'number', required: false },
        },
        outputSchema: {
          videos: { type: 'array' },
          cursor: { type: 'number' },
          has_more: { type: 'boolean' },
        },
      },
      {
        id: 'get_profile',
        name: 'Get Profile',
        description: 'Get the authenticated user profile',
        inputSchema: {},
        outputSchema: {
          open_id: { type: 'string' },
          display_name: { type: 'string' },
          avatar_url: { type: 'string' },
        },
      },
      {
        id: 'get_creator_info',
        name: 'Get Creator Info',
        description: 'Get creator posting capabilities and limitations',
        inputSchema: {},
        outputSchema: {
          creator_avatar_url: { type: 'string' },
          creator_username: { type: 'string' },
          privacy_level_options: { type: 'array' },
        },
      },
    ];
  }

  private getTriggers(): any[] {
    return [
      {
        id: 'new_video',
        name: 'New Video Posted',
        description: 'Triggered when a new video is posted (polling)',
        eventType: 'polling',
        webhookRequired: false,
        outputSchema: {
          id: { type: 'string' },
          title: { type: 'string' },
          create_time: { type: 'number' },
        },
      },
    ];
  }

  protected async initializeConnection(): Promise<void> {
    try {
      if (!this.config.credentials) {
        throw new Error('TikTok credentials are required');
      }

      // Debug: Log credential keys to understand the structure
      this.logger.log(`Credential keys: ${Object.keys(this.config.credentials).join(', ')}`);

      // Check for accessToken in various locations
      const rawAccessToken = this.config.credentials.accessToken || this.config.credentials.access_token;
      this.logger.log(`Raw accessToken present: ${!!rawAccessToken}, type: ${typeof rawAccessToken}, length: ${rawAccessToken?.length || 0}`);
      if (rawAccessToken && typeof rawAccessToken === 'string') {
        this.logger.log(`Token starts with: ${rawAccessToken.substring(0, 40)}...`);
      }

      // Decrypt tokens if they are encrypted (contain ':' separator from encryption)
      this.decryptCredentialsIfNeeded();

      // Check if token is expired and needs refresh
      const expiresAt = this.config.credentials.expiresAt || this.config.credentials.expires_at;
      if (expiresAt) {
        const expirationTime = new Date(expiresAt).getTime();
        const currentTime = Date.now();
        const fiveMinutesInMs = 5 * 60 * 1000;

        // Refresh if expired or expiring within 5 minutes
        if (currentTime >= expirationTime - fiveMinutesInMs) {
          try {
            await this.refreshToken();
          } catch (error) {
            this.logger.error('Token refresh failed:', error.message);
            throw new Error(`Token refresh failed: ${error.message}. Please re-authorize the TikTok connection.`);
          }
        }
      }

      const accessToken = this.config.credentials.accessToken || this.config.credentials.access_token;
      if (!accessToken) {
        throw new Error('Missing required TikTok OAuth2 access token');
      }

      this.logger.log('TikTok connector initialized successfully');
    } catch (error) {
      this.logger.error('Failed to initialize TikTok connector:', error.message);
      throw error;
    }
  }

  /**
   * Decrypt credentials if they are encrypted (TikTok OAuth uses iv:encrypted format)
   */
  private decryptCredentialsIfNeeded(): void {
    const creds = this.config.credentials;

    // Check and decrypt accessToken
    if (creds.accessToken && this.isEncrypted(creds.accessToken)) {
      try {
        creds.accessToken = this.tiktokOAuthService.decryptToken(creds.accessToken);
        this.logger.log('Decrypted TikTok access token');
      } catch (error) {
        this.logger.warn('Failed to decrypt access token:', error.message);
      }
    }

    // Check and decrypt refreshToken
    if (creds.refreshToken && this.isEncrypted(creds.refreshToken)) {
      try {
        creds.refreshToken = this.tiktokOAuthService.decryptToken(creds.refreshToken);
        this.logger.log('Decrypted TikTok refresh token');
      } catch (error) {
        this.logger.warn('Failed to decrypt refresh token:', error.message);
      }
    }

    // Also check snake_case variants
    if (creds.access_token && this.isEncrypted(creds.access_token)) {
      try {
        creds.access_token = this.tiktokOAuthService.decryptToken(creds.access_token);
      } catch (error) {
        this.logger.warn('Failed to decrypt access_token:', error.message);
      }
    }

    if (creds.refresh_token && this.isEncrypted(creds.refresh_token)) {
      try {
        creds.refresh_token = this.tiktokOAuthService.decryptToken(creds.refresh_token);
      } catch (error) {
        this.logger.warn('Failed to decrypt refresh_token:', error.message);
      }
    }
  }

  /**
   * Check if a token string appears to be encrypted (TikTok uses iv:encrypted format)
   */
  private isEncrypted(token: string): boolean {
    if (!token || typeof token !== 'string') return false;
    // TikTok encryption format is "iv:encrypted" where iv is 32 hex chars
    const parts = token.split(':');
    return parts.length === 2 && parts[0].length === 32 && /^[a-f0-9]+$/i.test(parts[0]);
  }

  private async ensureValidToken(): Promise<void> {
    const expiresAt = this.config.credentials.expiresAt || this.config.credentials.expires_at;

    if (!expiresAt) {
      this.logger.warn('No token expiration info available for TikTok');
      return;
    }

    const expirationTime = new Date(expiresAt).getTime();
    const currentTime = Date.now();
    const fiveMinutesInMs = 5 * 60 * 1000;

    if (currentTime >= expirationTime - fiveMinutesInMs) {
      this.logger.log('TikTok access token expired or expiring soon, refreshing...');
      await this.refreshToken();
    }
  }

  private async refreshToken(): Promise<void> {
    try {
      const refreshToken = this.config.credentials.refreshToken || this.config.credentials.refresh_token;

      if (!refreshToken) {
        throw new Error('No refresh token available - user must re-authorize');
      }

      const tokens = await this.tiktokOAuthService.refreshAccessToken(refreshToken);

      // Calculate new expiration time
      const newExpiresAt = tokens.expires_in
        ? new Date(Date.now() + tokens.expires_in * 1000).toISOString()
        : null;

      // Update credentials with new tokens in memory
      this.config.credentials.accessToken = tokens.access_token;
      if (tokens.refresh_token) {
        this.config.credentials.refreshToken = tokens.refresh_token;
      }
      this.config.credentials.expiresAt = newExpiresAt;

      // Persist the refreshed tokens to the database
      if (this.config.id && this.connectorConfigService) {
        try {
          await this.connectorConfigService.updateRefreshedTokens(this.config.id, {
            accessToken: tokens.access_token,
            refreshToken: tokens.refresh_token || refreshToken,
            expiresAt: newExpiresAt,
          });
          this.logger.log('TikTok tokens persisted to database');
        } catch (persistError) {
          this.logger.warn('Failed to persist refreshed TikTok tokens:', persistError.message);
        }
      }

      this.logger.log('TikTok token refreshed successfully');
    } catch (error) {
      this.logger.error('Failed to refresh TikTok OAuth token:', error.message);
      throw new Error('Failed to refresh OAuth token - user may need to re-authorize');
    }
  }

  private getAccessToken(): string {
    return this.config.credentials.accessToken || this.config.credentials.access_token;
  }

  protected async performConnectionTest(): Promise<boolean> {
    try {
      await this.ensureValidToken();
      const profile = await this.getUserProfile();
      return profile.success;
    } catch (error) {
      this.logger.error('TikTok connection test failed:', error.message);
      return false;
    }
  }

  protected async performHealthCheck(): Promise<void> {
    const accessToken = this.getAccessToken();
    if (!accessToken) {
      throw new Error('TikTok access token not configured');
    }

    const profile = await this.getUserProfile();
    if (!profile.success) {
      throw new Error('TikTok health check failed: Unable to fetch user profile');
    }
  }

  protected async performRequest(request: ConnectorRequest): Promise<any> {
    await this.ensureValidToken();
    const accessToken = this.getAccessToken();

    const response = await axios({
      method: request.method,
      url: `${this.apiBaseUrl}${request.endpoint}`,
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
        ...request.headers,
      },
      data: request.body,
      params: request.queryParams,
      timeout: request.timeout || 30000,
    });

    return response.data;
  }

  protected async performAction(actionId: string, input: any): Promise<any> {
    switch (actionId) {
      case 'post_video':
        return this.postContent(input);
      case 'get_videos':
        return this.getPosts(input);
      case 'get_profile':
        return this.getUserProfile();
      case 'get_creator_info':
        return this.getCreatorInfo();
      default:
        throw new Error(`Unknown action: ${actionId}`);
    }
  }

  protected async cleanup(): Promise<void> {
    this.logger.log('TikTok connector cleanup completed');
  }

  /**
   * Post video content to TikTok using Content Posting API
   */
  async postContent(content: TikTokVideoUploadOptions | any): Promise<ConnectorResponse> {
    try {
      await this.ensureValidToken();
      const accessToken = this.getAccessToken();

      const { videoUrl, title, privacyLevel, disableComment, disableDuet, disableStitch } = content;

      if (!videoUrl) {
        throw new Error('Video URL is required for TikTok posting');
      }

      this.logger.log(`Posting video to TikTok from URL: ${videoUrl}`);

      // Step 1: Query creator info to get available options
      const creatorInfoResult = await this.getCreatorInfo();
      if (!creatorInfoResult.success) {
        throw new Error('Failed to get creator info: ' + (creatorInfoResult.error?.message || 'Unknown error'));
      }

      const creatorInfo = creatorInfoResult.data as TikTokCreatorInfo;

      // Validate privacy level
      const selectedPrivacy = privacyLevel || 'PUBLIC_TO_EVERYONE';
      if (!creatorInfo.privacy_level_options.includes(selectedPrivacy)) {
        this.logger.warn(`Privacy level ${selectedPrivacy} not available, using first available option`);
      }

      // Step 2: Initialize video upload
      const initResponse = await axios.post(
        `${this.apiBaseUrl}/post/publish/video/init/`,
        {
          post_info: {
            title: title || '',
            privacy_level: selectedPrivacy,
            disable_comment: disableComment || false,
            disable_duet: disableDuet || creatorInfo.duet_disabled,
            disable_stitch: disableStitch || creatorInfo.stitch_disabled,
          },
          source_info: {
            source: 'PULL_FROM_URL',
            video_url: videoUrl,
          },
        },
        {
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json; charset=UTF-8',
          },
          timeout: 60000,
        }
      );

      const responseData = initResponse.data.data || initResponse.data;

      if (initResponse.data.error?.code && initResponse.data.error.code !== 'ok') {
        throw new Error(initResponse.data.error.message || 'Failed to initialize video upload');
      }

      const publishId = responseData.publish_id;
      this.logger.log(`TikTok video upload initiated with publish_id: ${publishId}`);

      // Step 3: Poll for upload status
      const status = await this.pollPublishStatus(publishId, accessToken);

      return {
        success: true,
        data: {
          publish_id: publishId,
          status: status,
          message: 'Video upload initiated successfully. TikTok is processing the video.',
        },
      };
    } catch (error: any) {
      const errorMsg = error.response?.data?.error?.message ||
                       error.response?.data?.error_description ||
                       error.message;
      this.logger.error('Failed to post video to TikTok:', errorMsg);
      return {
        success: false,
        error: {
          code: 'POST_FAILED',
          message: errorMsg,
        },
      };
    }
  }

  /**
   * Poll for video publish status
   */
  private async pollPublishStatus(publishId: string, accessToken: string): Promise<string> {
    const maxAttempts = 30;
    const pollInterval = 5000; // 5 seconds

    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      try {
        const statusResponse = await axios.post(
          `${this.apiBaseUrl}/post/publish/status/fetch/`,
          { publish_id: publishId },
          {
            headers: {
              'Authorization': `Bearer ${accessToken}`,
              'Content-Type': 'application/json',
            },
            timeout: 30000,
          }
        );

        const statusData = statusResponse.data.data || statusResponse.data;
        const status = statusData.status;

        this.logger.log(`TikTok publish status (attempt ${attempt + 1}): ${status}`);

        if (status === 'PUBLISH_COMPLETE') {
          return status;
        }

        if (status === 'FAILED') {
          throw new Error(statusData.fail_reason || 'Video publishing failed');
        }

        // Wait before next poll
        await new Promise(resolve => setTimeout(resolve, pollInterval));
      } catch (error: any) {
        if (attempt === maxAttempts - 1) {
          throw error;
        }
        await new Promise(resolve => setTimeout(resolve, pollInterval));
      }
    }

    return 'PROCESSING'; // Still processing after max attempts
  }

  /**
   * Get user's videos from TikTok
   */
  async getPosts(options?: PaginatedRequest & { maxCount?: number }): Promise<ConnectorResponse> {
    try {
      await this.ensureValidToken();
      const accessToken = this.getAccessToken();

      const maxCount = Math.min(options?.maxCount || options?.limit || 20, 20);
      const cursor = options?.cursor ? parseInt(options.cursor) : undefined;

      const response = await axios.post(
        `${this.apiBaseUrl}/video/list/`,
        {
          max_count: maxCount,
          cursor: cursor,
        },
        {
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
          },
          params: {
            fields: 'id,title,create_time,cover_image_url,share_url,video_description,duration,height,width,like_count,comment_count,share_count,view_count',
          },
          timeout: 30000,
        }
      );

      const responseData = response.data.data || response.data;

      if (response.data.error?.code && response.data.error.code !== 'ok') {
        throw new Error(response.data.error.message || 'Failed to get videos');
      }

      return {
        success: true,
        data: {
          items: responseData.videos || [],
          pagination: {
            cursor: responseData.cursor,
            has_more: responseData.has_more,
          },
        },
      };
    } catch (error: any) {
      const errorMsg = error.response?.data?.error?.message || error.message;
      this.logger.error('Failed to get TikTok videos:', errorMsg);
      return {
        success: false,
        error: {
          code: 'GET_VIDEOS_FAILED',
          message: errorMsg,
        },
      };
    }
  }

  /**
   * Get user profile information
   */
  async getUserProfile(userId?: string): Promise<ConnectorResponse> {
    try {
      await this.ensureValidToken();
      const accessToken = this.getAccessToken();

      const response = await axios.get(`${this.apiBaseUrl}/user/info/`, {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
        },
        params: {
          fields: 'open_id,union_id,avatar_url,avatar_url_100,avatar_large_url,display_name,bio_description,profile_deep_link,is_verified,follower_count,following_count,likes_count,video_count',
        },
        timeout: 30000,
      });

      const userData = response.data.data?.user || response.data.data || response.data;

      if (response.data.error?.code && response.data.error.code !== 'ok') {
        throw new Error(response.data.error.message || 'Failed to get user profile');
      }

      return {
        success: true,
        data: userData,
      };
    } catch (error: any) {
      const errorMsg = error.response?.data?.error?.message || error.message;
      this.logger.error('Failed to get TikTok user profile:', errorMsg);
      return {
        success: false,
        error: {
          code: 'GET_PROFILE_FAILED',
          message: errorMsg,
        },
      };
    }
  }

  /**
   * Get creator info for posting capabilities
   */
  async getCreatorInfo(): Promise<ConnectorResponse<TikTokCreatorInfo>> {
    try {
      await this.ensureValidToken();
      const accessToken = this.getAccessToken();

      const response = await axios.post(
        `${this.apiBaseUrl}/post/publish/creator_info/query/`,
        {},
        {
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
          },
          timeout: 30000,
        }
      );

      const creatorData = response.data.data || response.data;

      if (response.data.error?.code && response.data.error.code !== 'ok') {
        throw new Error(response.data.error.message || 'Failed to get creator info');
      }

      return {
        success: true,
        data: creatorData,
      };
    } catch (error: any) {
      const errorMsg = error.response?.data?.error?.message || error.message;
      this.logger.error('Failed to get TikTok creator info:', errorMsg);
      return {
        success: false,
        error: {
          code: 'GET_CREATOR_INFO_FAILED',
          message: errorMsg,
        },
      };
    }
  }

  /**
   * Get connections (followers/following) - Not fully supported by TikTok API
   */
  async getConnections(type: 'followers' | 'following', options?: PaginatedRequest): Promise<ConnectorResponse> {
    return {
      success: false,
      error: {
        code: 'NOT_IMPLEMENTED',
        message: 'TikTok API does not expose follower/following lists publicly',
      },
    };
  }

  /**
   * Schedule post - Not supported by TikTok API
   */
  async schedulePost(content: any, scheduledTime: Date): Promise<ConnectorResponse> {
    return {
      success: false,
      error: {
        code: 'NOT_SUPPORTED',
        message: 'Scheduled posts are not supported by TikTok API',
      },
    };
  }

  async executeAction(actionId: string, input: any): Promise<ConnectorResponse> {
    switch (actionId) {
      case 'post_video':
        return this.postContent(input);
      case 'get_videos':
        return this.getPosts(input);
      case 'get_profile':
        return this.getUserProfile();
      case 'get_creator_info':
        return this.getCreatorInfo();
      default:
        return {
          success: false,
          error: {
            code: 'UNKNOWN_ACTION',
            message: `Unknown action: ${actionId}`,
          },
        };
    }
  }
}
