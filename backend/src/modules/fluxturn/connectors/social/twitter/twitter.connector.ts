import { Request } from 'express';
import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { TwitterApi, TweetV2 } from 'twitter-api-v2';
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

@Injectable()
export class TwitterConnector extends BaseConnector implements ISocialConnector {
  private client: TwitterApi;
  private v1Client: TwitterApi | null = null; // OAuth 1.0a client for media uploads

  constructor(
    private readonly connectorConfigService: ConnectorConfigService,
    private readonly configService: ConfigService,
  ) {
    super();
  }

  getMetadata(): ConnectorMetadata {
    return {
      name: 'Twitter/X',
      description: 'Twitter/X social media connector for posting and managing content',
      version: '1.0.0',
      category: ConnectorCategory.SOCIAL,
      type: ConnectorType.TWITTER,
      authType: AuthType.API_KEY,
      actions: [
        {
          id: 'post_tweet',
          name: 'Post Tweet',
          description: 'Post a new tweet with optional media (images, GIFs, or videos)',
          inputSchema: {
            type: 'object',
            properties: {
              text: {
                type: 'string',
                label: 'Tweet Text',
                maxLength: 280,
                description: 'The text content of the tweet (max 280 characters)'
              },
              reply_to: {
                type: 'string',
                label: 'Reply to Tweet ID',
                description: 'Tweet ID to reply to (leave empty to post a new tweet)'
              },
              mediaUploadOption: {
                type: 'string',
                label: 'Media Upload Method',
                enum: ['none', 'url', 'upload'],
                default: 'none',
                description: 'How to attach media: none, url (from URLs), or upload (base64 files)'
              },
              mediaUrls: {
                type: 'array',
                label: 'Media URLs',
                items: { type: 'string' },
                description: 'Array of media URLs (images, GIFs). Required when mediaUploadOption is "url"'
              },
              mediaFiles: {
                type: 'array',
                label: 'Media Files',
                items: {
                  type: 'object',
                  properties: {
                    fileName: { type: 'string', description: 'File name' },
                    fileData: { type: 'string', description: 'Base64 encoded file data (data:image/jpeg;base64,...)' },
                    mimeType: { type: 'string', description: 'MIME type (e.g., image/jpeg, image/png, image/gif, video/mp4)' }
                  }
                },
                description: 'Array of media files with base64 data. Required when mediaUploadOption is "upload"'
              },
              media: {
                type: 'array',
                label: 'Media (Legacy)',
                items: { type: 'string' },
                description: '[LEGACY] Array of media URLs or file paths. Use mediaUrls or mediaFiles instead.'
              }
            },
            required: ['text']
          },
          outputSchema: {
            type: 'object',
            properties: {
              success: { type: 'boolean' },
              data: {
                type: 'object',
                properties: {
                  id: { type: 'string', description: 'Tweet ID' },
                  text: { type: 'string', description: 'Tweet text' }
                }
              },
              error: { type: 'string', description: 'Error message if failed' }
            }
          }
        },
        {
          id: 'get_user_tweets',
          name: 'Get User Tweets',
          description: 'Get tweets from a user timeline',
          inputSchema: {
            type: 'object',
            properties: {
              username: { type: 'string' },
              max_results: { type: 'number', maximum: 100 }
            }
          },
          outputSchema: {
            type: 'object',
            properties: {
              success: { type: 'boolean' },
              data: {
                type: 'object',
                properties: {
                  items: { type: 'array' },
                  pagination: { type: 'object' }
                }
              }
            }
          }
        },
        {
          id: 'search_tweets',
          name: 'Search Tweets',
          description: 'Search for tweets by query',
          inputSchema: {
            type: 'object',
            properties: {
              query: { type: 'string' },
              max_results: { type: 'number', maximum: 100 }
            },
            required: ['query']
          },
          outputSchema: {
            type: 'object',
            properties: {
              success: { type: 'boolean' },
              data: {
                type: 'object',
                properties: {
                  tweets: { type: 'array' },
                  users: { type: 'array' },
                  pagination: { type: 'object' }
                }
              }
            }
          }
        }
      ],
      triggers: [
        {
          id: 'new_tweet',
          name: 'New Tweet',
          description: 'Triggered when you post a new tweet',
          eventType: 'polling',
          inputSchema: {
            type: 'object',
            properties: {
              event: {
                type: 'string',
                label: 'Trigger Event',
                default: 'new_tweet',
                enum: ['new_tweet'],
                description: 'Triggers when you post a new tweet'
              },
              pollingInterval: {
                type: 'number',
                label: 'Polling Interval (minutes)',
                default: 15,
                enum: [1, 2, 5, 10, 15, 30],
                description: 'How often to check for new tweets'
              }
            },
            required: ['event', 'pollingInterval']
          },
          outputSchema: {
            type: 'object',
            properties: {
              id: { type: 'string' },
              text: { type: 'string' },
              author_id: { type: 'string' },
              created_at: { type: 'string' },
              public_metrics: { type: 'object' }
            }
          }
        },
        {
          id: 'new_mention',
          name: 'New Mention',
          description: 'Triggered when someone mentions you on Twitter',
          eventType: 'polling',
          inputSchema: {
            type: 'object',
            properties: {
              event: {
                type: 'string',
                label: 'Trigger Event',
                default: 'new_mention',
                enum: ['new_mention'],
                description: 'Triggers when someone mentions you in a tweet'
              },
              pollingInterval: {
                type: 'number',
                label: 'Polling Interval (minutes)',
                default: 15,
                enum: [1, 2, 5, 10, 15, 30],
                description: 'How often to check for new mentions'
              }
            },
            required: ['event', 'pollingInterval']
          },
          outputSchema: {
            type: 'object',
            properties: {
              id: { type: 'string' },
              text: { type: 'string' },
              author_id: { type: 'string' },
              created_at: { type: 'string' },
              public_metrics: { type: 'object' }
            }
          }
        }
      ],
      requiredScopes: [
        'consumer_key',
        'consumer_secret',
        'access_token',
        'access_token_secret'
      ]
    };
  }

  protected async initializeConnection(): Promise<void> {
    try {

      if (!this.config.credentials) {
        throw new Error('Twitter credentials are required');
      }

      // Check if token is expired and needs refresh
      // But don't fail if refresh fails - we'll try the API call first and refresh on 401
      const expiresAt = this.config.credentials.expiresAt;
      if (expiresAt) {
        const expirationTime = new Date(expiresAt).getTime();
        const currentTime = Date.now();
        const fiveMinutesInMs = 5 * 60 * 1000;

        // Only proactively refresh if token is already expired (not just expiring soon)
        if (currentTime >= expirationTime) {
          this.logger.log('Access token is expired, will try to refresh on first API call');
          // Don't refresh here - let the API call fail and then refresh
          // This avoids failing immediately when refresh token might also be invalid
        }
      }

      // Support OAuth 2.0 (new) credentials
      const accessToken = this.config.credentials.accessToken || this.config.credentials.access_token;

      if (!accessToken) {
        throw new Error('Missing required Twitter OAuth2 access token');
      }

      // Initialize with OAuth 2.0 Bearer token for v2 API
      this.client = new TwitterApi(accessToken);

      // Initialize OAuth 1.0a client for media uploads (if credentials available)
      // Media upload API only works with OAuth 1.0a
      const consumerKey = this.config.credentials.consumerKey ||
                          this.config.credentials.consumer_key ||
                          this.config.credentials.apiKey ||
                          this.config.credentials.api_key;
      const consumerSecret = this.config.credentials.consumerSecret ||
                              this.config.credentials.consumer_secret ||
                              this.config.credentials.apiSecret ||
                              this.config.credentials.api_secret;
      const accessTokenV1 = this.config.credentials.accessTokenV1 ||
                            this.config.credentials.access_token_v1 ||
                            this.config.credentials.oauthAccessToken;
      const accessTokenSecretV1 = this.config.credentials.accessTokenSecretV1 ||
                                   this.config.credentials.access_token_secret_v1 ||
                                   this.config.credentials.oauthAccessTokenSecret;

      if (consumerKey && consumerSecret && accessTokenV1 && accessTokenSecretV1) {
        this.v1Client = new TwitterApi({
          appKey: consumerKey,
          appSecret: consumerSecret,
          accessToken: accessTokenV1,
          accessSecret: accessTokenSecretV1,
        });
      }
    } catch (error) {
      this.logger.error('Failed to initialize Twitter connector:', error.message);
      throw error;
    }
  }

  /**
   * Execute an API call with automatic token refresh on 401 errors
   * This implements the "try first, refresh on failure" pattern
   */
  private async executeWithTokenRefresh<T>(
    operation: () => Promise<T>,
    operationName: string = 'API call'
  ): Promise<T> {
    try {
      // First, try the operation with the current token
      return await operation();
    } catch (error: any) {
      // Check if it's an authentication error (401 or token-related)
      const isAuthError =
        error?.code === 401 ||
        error?.status === 401 ||
        error?.response?.status === 401 ||
        error?.data?.status === 401 ||
        error?.message?.toLowerCase()?.includes('unauthorized') ||
        error?.message?.toLowerCase()?.includes('token') ||
        error?.message?.toLowerCase()?.includes('authentication') ||
        error?.message?.toLowerCase()?.includes('credentials');

      if (!isAuthError) {
        // Not an auth error, just throw it
        throw error;
      }

      this.logger.log(`${operationName} failed with auth error, attempting token refresh...`);

      // Try to refresh the token
      try {
        await this.refreshToken();

        // Re-initialize the client with the new token
        const accessToken = this.config.credentials.accessToken || this.config.credentials.access_token;
        if (accessToken) {
          this.client = new TwitterApi(accessToken);
          this.logger.log('Token refreshed successfully, retrying operation...');
        }

        // Retry the operation with the new token
        return await operation();
      } catch (refreshError: any) {
        this.logger.error('Token refresh failed:', refreshError.message);
        throw new Error(
          `Twitter authentication failed. The access token is invalid and could not be refreshed. ` +
          `Please reconnect your Twitter account in Settings. ` +
          `(Original error: ${error.message}, Refresh error: ${refreshError.message})`
        );
      }
    }
  }

  /**
   * Ensure the access token is valid before making API calls
   * Proactively refreshes if expired or expiring within 5 minutes
   */
  private async ensureValidToken(): Promise<void> {
    const expiresAt = this.config.credentials.expiresAt || this.config.credentials.expires_at;

    this.logger.log(`Token expiration check - expiresAt: ${expiresAt}`);

    if (!expiresAt) {
      // No expiration info - token validity will be checked on first API call
      this.logger.log('No token expiration info available, will check on first API call');
      return;
    }

    const expirationTime = new Date(expiresAt).getTime();
    const currentTime = Date.now();
    const fiveMinutesInMs = 5 * 60 * 1000;

    this.logger.log(`Token check - expires: ${new Date(expirationTime).toISOString()}, now: ${new Date(currentTime).toISOString()}, diff: ${(expirationTime - currentTime) / 1000}s`);

    // Only proactively refresh if expired (not just expiring soon)
    // This avoids unnecessary refresh attempts that might fail
    if (currentTime >= expirationTime) {
      this.logger.log('Access token appears expired, will refresh on first API call');
      // Don't refresh here - let executeWithTokenRefresh handle it
    } else {
      this.logger.log('Token appears valid based on expiry time');
    }
  }

  private async refreshToken(): Promise<void> {
    try {
      const refreshToken = this.config.credentials.refreshToken || this.config.credentials.refresh_token;

      // Try to get client credentials from multiple sources:
      // 1. Config settings (stored with connector config)
      // 2. Credentials (stored during OAuth flow)
      // 3. Environment variables (fallback)
      const clientId = this.config.settings?.client_id ||
                       (this.config as any).config?.client_id ||
                       this.config.credentials.clientId ||
                       this.configService.get<string>('TWITTER_OAUTH_CLIENT_ID');

      const clientSecret = this.config.credentials.clientSecret ||
                           this.config.credentials.client_secret ||
                           this.configService.get<string>('TWITTER_OAUTH_CLIENT_SECRET');

      this.logger.log(`Token refresh - refreshToken exists: ${!!refreshToken}, clientId exists: ${!!clientId}, clientSecret exists: ${!!clientSecret}`);

      if (!refreshToken) {
        throw new Error('No refresh token available - user must re-authorize');
      }

      if (!clientId || !clientSecret) {
        throw new Error('Missing client credentials for token refresh. Please check TWITTER_OAUTH_CLIENT_ID and TWITTER_OAUTH_CLIENT_SECRET in environment variables.');
      }

      // Use axios to refresh the token
      const axios = require('axios');
      const tokenRequestBody = new URLSearchParams({
        grant_type: 'refresh_token',
        refresh_token: refreshToken,
        client_id: clientId,
      });

      // Twitter requires Basic Auth for token refresh
      const authString = Buffer.from(`${clientId}:${clientSecret}`).toString('base64');

      const tokenResponse = await axios.post(
        'https://api.twitter.com/2/oauth2/token',
        tokenRequestBody.toString(),
        {
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
            'Accept': 'application/json',
            'Authorization': `Basic ${authString}`,
          },
        }
      );

      const tokens = tokenResponse.data;

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
        } catch (persistError) {
          this.logger.warn('Failed to persist refreshed tokens:', persistError.message);
        }
      }
    } catch (error) {
      this.logger.error('Failed to refresh OAuth token:', error.response?.data || error.message);
      throw new Error('Failed to refresh OAuth token - user may need to re-authorize');
    }
  }

  protected async performConnectionTest(): Promise<boolean> {
    try {
      if (!this.client) {
        throw new Error('Twitter client not initialized');
      }
      await this.client.v2.me();
      return true;
    } catch (error) {
      return false;
    }
  }

  protected async performHealthCheck(): Promise<void> {
    try {
      if (!this.client) {
        throw new Error('Twitter client not initialized');
      }
      await this.client.v2.me();
    } catch (error) {
      throw new Error(`Twitter health check failed: ${error.message}`);
    }
  }

  protected async performRequest(request: ConnectorRequest): Promise<any> {
    if (!this.client) {
      throw new Error('Twitter client not initialized');
    }
    throw new Error('Direct request method not supported for Twitter API');
  }

  protected async performAction(actionId: string, input: any): Promise<any> {
    switch (actionId) {
      case 'post_tweet':
      case 'create_tweet':
        return this.postContent(input);
      case 'like_tweet':
        return this.likeTweet(input.tweetId);
      case 'retweet':
        return this.retweet(input.tweetId);
      case 'delete_tweet':
        return this.deleteTweet(input.tweetId);
      case 'get_user_tweets':
        return this.getUserProfile(input.username);
      case 'search_tweets':
        return this.searchTweets(input.query, input);
      default:
        throw new Error(`Unknown action: ${actionId}`);
    }
  }

  protected async cleanup(): Promise<void> {
    // Cleanup resources if needed
  }

  async postContent(content: any): Promise<ConnectorResponse> {
    try {
      if (!this.client) {
        throw new Error('Twitter client not initialized');
      }

      const { text, mediaFiles, mediaUrls, media, reply_to, videoUrl } = content;

      if (!text) {
        throw new Error('Tweet text is required');
      }

      if (text.length > 280) {
        throw new Error('Tweet text exceeds 280 character limit');
      }

      let tweetData: any = { text };

      if (reply_to) {
        tweetData.reply = { in_reply_to_tweet_id: reply_to };
      }

      // Handle media uploads
      const mediaIds: any[] = [];

      // Priority 1: Handle direct file uploads (from device)
      if (mediaFiles && mediaFiles.length > 0) {
        for (const mediaFile of mediaFiles) {
          try {
            let mediaId: string;

            if (mediaFile.fileData) {
              // Check if it's base64 data URL
              if (typeof mediaFile.fileData === 'string' && mediaFile.fileData.startsWith('data:')) {
                const base64Match = mediaFile.fileData.match(/^data:(.+?);base64,(.+)$/);
                if (base64Match) {
                  const mimeType = base64Match[1];
                  const base64Data = base64Match[2];
                  const buffer = Buffer.from(base64Data, 'base64');

                  const fileSizeInMB = buffer.length / (1024 * 1024);
                  if (fileSizeInMB > 5) {
                    throw new Error(`Image ${mediaFile.fileName || 'file'} exceeds 5MB limit (${fileSizeInMB.toFixed(2)}MB)`);
                  }

                  // Try v2 media upload first (OAuth 2.0 with media.write scope)
                  try {
                    mediaId = await this.uploadMediaV2(buffer, mimeType || mediaFile.mimeType || 'image/jpeg');
                  } catch (v2Error: any) {
                    // If v2 fails and we have v1Client, try v1
                    if (this.v1Client) {
                      mediaId = await this.v1Client.v1.uploadMedia(buffer, {
                        mimeType: mimeType || mediaFile.mimeType || 'image/jpeg'
                      });
                    } else {
                      throw v2Error;
                    }
                  }
                } else {
                  throw new Error('Invalid base64 data URL format');
                }
              } else if (typeof mediaFile.fileData === 'string' && this.isFilePath(mediaFile.fileData)) {
                const fs = require('fs');
                if (!fs.existsSync(mediaFile.fileData)) {
                  throw new Error(`File not found: ${mediaFile.fileData}`);
                }
                const fileBuffer = fs.readFileSync(mediaFile.fileData);

                const mimeType = this.getMimeTypeFromPath(mediaFile.fileData);
                const sizeLimit = this.getMediaSizeLimit(mimeType);
                const fileSizeInMB = fileBuffer.length / (1024 * 1024);

                if (fileSizeInMB > sizeLimit) {
                  throw new Error(`File exceeds ${sizeLimit}MB limit for ${mimeType} (${fileSizeInMB.toFixed(2)}MB)`);
                }

                // Try v2 media upload first (OAuth 2.0 with media.write scope)
                try {
                  mediaId = await this.uploadMediaV2(fileBuffer, mimeType);
                } catch (v2Error: any) {
                  if (this.v1Client) {
                    mediaId = await this.v1Client.v1.uploadMedia(fileBuffer, { mimeType });
                  } else {
                    throw v2Error;
                  }
                }
              } else if (Buffer.isBuffer(mediaFile.fileData)) {
                const mimeType = mediaFile.mimeType || 'image/jpeg';
                const sizeLimit = this.getMediaSizeLimit(mimeType);
                const fileSizeInMB = mediaFile.fileData.length / (1024 * 1024);

                if (fileSizeInMB > sizeLimit) {
                  throw new Error(`Buffer exceeds ${sizeLimit}MB limit for ${mimeType} (${fileSizeInMB.toFixed(2)}MB)`);
                }

                // Try v2 media upload first (OAuth 2.0 with media.write scope)
                try {
                  mediaId = await this.uploadMediaV2(mediaFile.fileData, mimeType);
                } catch (v2Error: any) {
                  if (this.v1Client) {
                    mediaId = await this.v1Client.v1.uploadMedia(mediaFile.fileData, { mimeType });
                  } else {
                    throw v2Error;
                  }
                }
              } else {
                // Try v2 first, fall back to v1
                try {
                  mediaId = await this.uploadMediaV2(mediaFile.fileData, 'image/jpeg');
                } catch (v2Error: any) {
                  if (this.v1Client) {
                    mediaId = await this.v1Client.v1.uploadMedia(mediaFile.fileData);
                  } else {
                    throw v2Error;
                  }
                }
              }

              mediaIds.push(mediaId);
            }
          } catch (mediaError) {
            // Check if it's a 403 permission error
            const errorMsg = mediaError.message || '';
            if (errorMsg.includes('403') || errorMsg.includes('Forbidden')) {
              throw new Error(`Media upload failed: Permission denied. Please re-authorize your Twitter connection to enable media uploads.`);
            }
            throw new Error(`Media upload failed for ${mediaFile.fileName || 'file'}: ${mediaError.message}`);
          }
        }
      }

      // Handle URL-based media (can be combined with file uploads, up to 4 total)
      if (mediaUrls && mediaIds.length < 4) {
        const urlArray = Array.isArray(mediaUrls) ? mediaUrls : [mediaUrls];
        const validUrls = urlArray.filter(url => url && typeof url === 'string' && url.trim().length > 0);

        if (validUrls.length > 0) {
          // Limit URLs to not exceed 4 total media items
          const remainingSlots = 4 - mediaIds.length;
          const urlsToProcess = validUrls.slice(0, remainingSlots);

          for (const mediaUrl of urlsToProcess) {
          try {
            const trimmedUrl = mediaUrl.trim();
            if (!trimmedUrl.startsWith('http://') && !trimmedUrl.startsWith('https://')) {
              throw new Error(`Invalid URL format: ${trimmedUrl}. URL must start with http:// or https://`);
            }

            const axios = require('axios');

            try {
              const response = await axios.get(trimmedUrl, {
                responseType: 'arraybuffer',
                timeout: 60000,
                maxContentLength: 50 * 1024 * 1024,
                headers: {
                  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                  'Accept': 'image/*,*/*;q=0.8',
                  'Accept-Language': 'en-US,en;q=0.9',
                  'Accept-Encoding': 'gzip, deflate, br',
                  'Connection': 'keep-alive',
                  'Sec-Fetch-Dest': 'image',
                  'Sec-Fetch-Mode': 'no-cors',
                  'Sec-Fetch-Site': 'cross-site',
                },
                maxRedirects: 5,
                validateStatus: (status: number) => status < 400,
              });

              const imageBuffer = Buffer.from(response.data);
              const contentType = response.headers['content-type'] || 'image/jpeg';

              const sizeLimit = this.getMediaSizeLimit(contentType);
              const fileSizeInMB = imageBuffer.length / (1024 * 1024);
              if (fileSizeInMB > sizeLimit) {
                throw new Error(`Media exceeds ${sizeLimit}MB limit for ${contentType} (${fileSizeInMB.toFixed(2)}MB)`);
              }

              try {
                // Try v2 media upload first (works with OAuth 2.0 + media.write scope)
                // Fall back to v1 if v1Client available
                let mediaId: string;

                try {
                  // Use Twitter API v2 media upload endpoint
                  mediaId = await this.uploadMediaV2(imageBuffer, contentType);
                } catch (v2Error: any) {
                  // If v2 fails and we have v1Client, try v1
                  if (this.v1Client) {
                    mediaId = await this.v1Client.v1.uploadMedia(imageBuffer, {
                      mimeType: contentType
                    });
                  } else {
                    throw v2Error;
                  }
                }

                mediaIds.push(mediaId);
              } catch (uploadError: any) {
                // Twitter API upload failed
                const twitterError = uploadError.data?.detail || uploadError.message || 'Unknown error';
                throw new Error(`Twitter media upload failed: ${twitterError}. Please re-authorize your Twitter connection to grant media upload permission (media.write scope).`);
              }
            } catch (downloadError: any) {
              const statusCode = downloadError.response?.status;
              if (statusCode === 403) {
                throw new Error(`Access denied (403) for image URL: ${trimmedUrl}. The image host may be blocking external access. Try using a publicly accessible image URL or upload the image directly.`);
              } else if (statusCode === 404) {
                throw new Error(`Image not found (404): ${trimmedUrl}`);
              } else if (statusCode) {
                throw new Error(`Failed to download image (HTTP ${statusCode}): ${trimmedUrl}`);
              }
              throw downloadError;
            }
          } catch (mediaError: any) {
            throw new Error(mediaError.message || `Failed to upload image from URL`);
          }
        }
        }
      }

      // Handle video URL upload
      if (mediaIds.length === 0 && videoUrl && typeof videoUrl === 'string' && videoUrl.trim().length > 0) {
        try {
          const trimmedUrl = videoUrl.trim();
          if (!trimmedUrl.startsWith('http://') && !trimmedUrl.startsWith('https://')) {
            throw new Error(`Invalid video URL format: ${trimmedUrl}. URL must start with http:// or https://`);
          }

          this.logger.log(`Downloading video from URL: ${trimmedUrl}`);
          const axios = require('axios');

          const response = await axios.get(trimmedUrl, {
            responseType: 'arraybuffer',
            timeout: 120000, // 2 minutes for video download
            maxContentLength: 512 * 1024 * 1024, // 512MB max for videos
            headers: {
              'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
              'Accept': 'video/*,*/*;q=0.8',
            },
            maxRedirects: 5,
            validateStatus: (status: number) => status < 400,
          });

          const videoBuffer = Buffer.from(response.data);
          const contentType = response.headers['content-type'] || 'video/mp4';

          const fileSizeInMB = videoBuffer.length / (1024 * 1024);
          this.logger.log(`Video downloaded: ${fileSizeInMB.toFixed(2)}MB, type: ${contentType}`);

          if (fileSizeInMB > 512) {
            throw new Error(`Video exceeds 512MB limit (${fileSizeInMB.toFixed(2)}MB)`);
          }

          // Upload video using v2 chunked upload
          const mediaId = await this.uploadMediaV2(videoBuffer, contentType.startsWith('video/') ? contentType : 'video/mp4');
          mediaIds.push(mediaId);
          this.logger.log(`Video uploaded successfully, media_id: ${mediaId}`);

        } catch (videoError: any) {
          const statusCode = videoError.response?.status;
          if (statusCode === 403) {
            throw new Error(`Access denied (403) for video URL: ${videoUrl}. The video host may be blocking external access.`);
          } else if (statusCode === 404) {
            throw new Error(`Video not found (404): ${videoUrl}`);
          } else if (statusCode) {
            throw new Error(`Failed to download video (HTTP ${statusCode}): ${videoUrl}`);
          }
          throw new Error(`Video upload failed: ${videoError.message}`);
        }
      }

      // BACKWARD COMPATIBILITY: Handle old 'media' field (URLs or file paths)
      // Only process if no media was uploaded via files or URLs
      if (mediaIds.length === 0 && media && media.length > 0) {
        for (const mediaItem of media) {
          try {
            let mediaId: string;

            // Check if it's a URL (need to download first)
            if (typeof mediaItem === 'string' && (mediaItem.startsWith('http://') || mediaItem.startsWith('https://'))) {
              const axios = require('axios');
              const response = await axios.get(mediaItem, {
                responseType: 'arraybuffer',
                timeout: 30000,
                maxContentLength: 15 * 1024 * 1024,
                headers: {
                  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                  'Accept': 'image/*,*/*',
                  'Accept-Language': 'en-US,en;q=0.9',
                  'Referer': new URL(mediaItem).origin + '/',
                },
              });

              const imageBuffer = Buffer.from(response.data);
              const contentType = response.headers['content-type'] || 'image/jpeg';

              mediaId = await (this.v1Client || this.client).v1.uploadMedia(imageBuffer, {
                mimeType: contentType
              });
            }
            // Check if it's a file path (local file)
            else if (typeof mediaItem === 'string') {
              const fs = require('fs');
              if (fs.existsSync(mediaItem)) {
                mediaId = await (this.v1Client || this.client).v1.uploadMedia(mediaItem);
              } else {
                throw new Error(`File not found: ${mediaItem}`);
              }
            }
            // Buffer or other format
            else if (Buffer.isBuffer(mediaItem)) {
              mediaId = await (this.v1Client || this.client).v1.uploadMedia(mediaItem);
            } else {
              throw new Error('Unsupported media format in legacy media array');
            }

            mediaIds.push(mediaId);
          } catch (mediaError) {
            throw new Error(`Legacy media upload failed: ${mediaError.message}`);
          }
        }
      }

      // Attach media IDs to tweet
      if (mediaIds.length > 0) {
        tweetData.media = { media_ids: mediaIds };
      }

      // Use executeWithTokenRefresh to handle token expiration gracefully
      const tweet = await this.executeWithTokenRefresh(
        async () => this.client.v2.tweet(tweetData),
        'Post tweet'
      );

      return {
        success: true,
        data: tweet.data,
      };
    } catch (error: any) {
      this.logger.error('Failed to post tweet:', error.message);
      return {
        success: false,
        error: error.message,
      };
    }
  }

  async getPosts(options?: PaginatedRequest): Promise<ConnectorResponse> {
    try {
      if (!this.client) {
        throw new Error('Twitter client not initialized');
      }

      const maxResults = Math.min(options?.limit || 20, 100);
      const me = await this.client.v2.me();
      
      const tweets = await this.client.v2.userTimeline(me.data.id, {
        max_results: maxResults,
        pagination_token: options?.cursor,
        'tweet.fields': ['created_at', 'public_metrics', 'author_id']
      });

      return {
        success: true,
        data: {
          items: tweets.data?.data || [],
          pagination: {
            next_token: tweets.data?.meta?.next_token,
            result_count: tweets.data?.meta?.result_count
          }
        },
      };
    } catch (error) {
      this.logger.error('Failed to get tweets:', error);
      return {
        success: false,
        error: error.message,
      };
    }
  }

  async getUserProfile(userId?: string): Promise<ConnectorResponse> {
    try {
      if (!this.client) {
        throw new Error('Twitter client not initialized');
      }

      let user;
      if (userId) {
        user = await this.client.v2.user(userId, {
          'user.fields': ['created_at', 'description', 'public_metrics', 'verified']
        });
      } else {
        user = await this.client.v2.me({
          'user.fields': ['created_at', 'description', 'public_metrics', 'verified']
        });
      }

      return {
        success: true,
        data: user.data,
      };
    } catch (error) {
      this.logger.error('Failed to get user profile:', error);
      return {
        success: false,
        error: error.message,
      };
    }
  }

  async getConnections(type: 'followers' | 'following', options?: PaginatedRequest): Promise<ConnectorResponse> {
    try {
      if (!this.client) {
        throw new Error('Twitter client not initialized');
      }

      const me = await this.client.v2.me();
      const maxResults = Math.min(options?.limit || 100, 1000);

      let result;
      if (type === 'followers') {
        result = await this.client.v2.followers(me.data.id, {
          max_results: maxResults,
          pagination_token: options?.cursor,
          'user.fields': ['created_at', 'description', 'public_metrics']
        });
      } else {
        result = await this.client.v2.following(me.data.id, {
          max_results: maxResults,
          pagination_token: options?.cursor,
          'user.fields': ['created_at', 'description', 'public_metrics']
        });
      }

      return {
        success: true,
        data: {
          items: result.data || [],
          pagination: {
            next_token: result.meta?.next_token,
            result_count: result.meta?.result_count
          }
        },
      };
    } catch (error) {
      this.logger.error(`Failed to get ${type}:`, error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  async schedulePost(content: any, scheduledTime: Date): Promise<ConnectorResponse> {
    // Twitter API doesn't support scheduled tweets directly
    // This would require a third-party service or custom scheduling implementation
    return {
      success: false,
      error: {
        code: 'NOT_SUPPORTED',
        message: 'Scheduled tweets not supported by Twitter API'
      },
    };
  }

  async searchTweets(query: string, options?: any): Promise<ConnectorResponse> {
    try {
      if (!this.client) {
        throw new Error('Twitter client not initialized');
      }

      const maxResults = Math.min(options?.max_results || 20, 100);

      const searchResult = await this.client.v2.search(query, {
        max_results: maxResults,
        next_token: options?.next_token,
        'tweet.fields': ['created_at', 'author_id', 'public_metrics'],
        'user.fields': ['username', 'name', 'verified']
      });

      return {
        success: true,
        data: {
          tweets: searchResult.data?.data || [],
          users: searchResult.includes?.users || [],
          pagination: {
            next_token: searchResult.data?.meta?.next_token,
            result_count: searchResult.data?.meta?.result_count
          }
        },
      };
    } catch (error) {
      this.logger.error('Failed to search tweets:', error);
      return {
        success: false,
        error: error.message,
      };
    }
  }

  async likeTweet(tweetId: string): Promise<ConnectorResponse> {
    try {
      if (!this.client) {
        throw new Error('Twitter client not initialized');
      }

      if (!tweetId) {
        throw new Error('Tweet ID is required');
      }

      // Get authenticated user ID
      this.logger.log('Getting authenticated user info...');
      const me = await this.client.v2.me();
      this.logger.log('Authenticated user ID:', me.data.id);

      // Like the tweet
      this.logger.log(`Attempting to like tweet ${tweetId} as user ${me.data.id}`);
      const result = await this.client.v2.like(me.data.id, tweetId);

      return {
        success: true,
        data: {
          liked: result.data?.liked || false,
          tweet_id: tweetId,
          user_id: me.data.id
        },
      };
    } catch (error: any) {
      this.logger.error('Failed to like tweet:', error);
      this.logger.error('Twitter API error details:', {
        message: error.message,
        code: error.code,
        data: error.data,
        errors: error.errors,
        rateLimit: error.rateLimit,
        type: error.type
      });
      return {
        success: false,
        error: error.message,
      };
    }
  }

  async retweet(tweetId: string): Promise<ConnectorResponse> {
    try {
      if (!this.client) {
        throw new Error('Twitter client not initialized');
      }

      if (!tweetId) {
        throw new Error('Tweet ID is required');
      }

      // Get authenticated user ID
      const me = await this.client.v2.me();

      // Retweet
      const result = await this.client.v2.retweet(me.data.id, tweetId);

      return {
        success: true,
        data: {
          retweeted: result.data?.retweeted || false,
          tweet_id: tweetId,
          user_id: me.data.id
        },
      };
    } catch (error) {
      this.logger.error('Failed to retweet:', error);
      return {
        success: false,
        error: error.message,
      };
    }
  }

  async deleteTweet(tweetId: string): Promise<ConnectorResponse> {
    try {
      if (!this.client) {
        throw new Error('Twitter client not initialized');
      }

      if (!tweetId) {
        throw new Error('Tweet ID is required');
      }

      // Delete the tweet
      const result = await this.client.v2.deleteTweet(tweetId);

      return {
        success: true,
        data: {
          deleted: result.data?.deleted || false,
          tweet_id: tweetId
        },
      };
    } catch (error) {
      this.logger.error('Failed to delete tweet:', error);
      return {
        success: false,
        error: error.message,
      };
    }
  }

  async executeAction(actionId: string, input: any): Promise<ConnectorResponse> {
    switch (actionId) {
      case 'post_tweet':
      case 'create_tweet':
        return this.postContent(input);
      case 'like_tweet':
        return this.likeTweet(input.tweetId);
      case 'retweet':
        return this.retweet(input.tweetId);
      case 'delete_tweet':
        return this.deleteTweet(input.tweetId);
      case 'get_user_tweets':
        return this.getPosts(input);
      case 'search_tweets':
        return this.searchTweets(input.query, input);
      case 'get_tweet':
        return this.getTweet(input.tweetId, input.tweetFields);
      default:
        return {
          success: false,
          error: {
            code: 'UNKNOWN_ACTION',
            message: `Unknown action: ${actionId}`
          },
        };
    }
  }

  /**
   * Get a single tweet by ID with its metrics
   */
  async getTweet(tweetId: string, tweetFields?: string): Promise<ConnectorResponse> {
    try {
      if (!this.client) {
        throw new Error('Twitter client not initialized');
      }

      if (!tweetId) {
        throw new Error('Tweet ID is required');
      }

      // Parse tweet fields or use defaults
      const fields = tweetFields?.split(',').map(f => f.trim()) ||
        ['public_metrics', 'created_at', 'author_id'];

      // Use executeWithTokenRefresh to handle token expiration
      const tweet = await this.executeWithTokenRefresh(
        async () => this.client.v2.singleTweet(tweetId, {
          'tweet.fields': fields as any,
        }),
        'Get tweet'
      );

      if (!tweet.data) {
        return {
          success: false,
          error: {
            code: 'TWEET_NOT_FOUND',
            message: `Tweet ${tweetId} not found or not accessible`,
          },
        };
      }

      return {
        success: true,
        data: tweet.data,
      };
    } catch (error: any) {
      this.logger.error('Failed to get tweet:', error.message);
      return {
        success: false,
        error: {
          code: 'GET_TWEET_FAILED',
          message: error.message,
        },
      };
    }
  }

  /**
   * Check if a string looks like a file path (Unix or Windows)
   */
  private isFilePath(str: string): boolean {
    // Unix absolute path
    if (str.startsWith('/')) return true;
    // Windows absolute path (C:\, D:\, etc.)
    if (/^[A-Za-z]:[\\\/]/.test(str)) return true;
    // Windows UNC path (\\server\share)
    if (str.startsWith('\\\\')) return true;
    return false;
  }

  /**
   * Get MIME type from file extension
   */
  private getMimeTypeFromPath(filePath: string): string {
    const ext = filePath.toLowerCase().split('.').pop();
    const mimeTypes: Record<string, string> = {
      'jpg': 'image/jpeg',
      'jpeg': 'image/jpeg',
      'png': 'image/png',
      'gif': 'image/gif',
      'webp': 'image/webp',
      'mp4': 'video/mp4',
      'mov': 'video/quicktime',
      'srt': 'text/plain',
    };
    return mimeTypes[ext || ''] || 'application/octet-stream';
  }

  /**
   * Get media size limit based on MIME type (in MB)
   * Twitter limits:
   * - Images: 5MB
   * - GIFs: 15MB
   * - Videos: 512MB (but we use 15MB for chunked upload simplicity)
   */
  private getMediaSizeLimit(mimeType: string): number {
    if (mimeType === 'image/gif') return 15;
    if (mimeType.startsWith('video/')) return 512;
    return 5; // Default for images
  }

  /**
   * Upload media using Twitter API v2 media upload endpoints
   * Uses OAuth 2.0 user context with media.write scope
   * New dedicated endpoints (as of Jan 2025):
   * - INIT: POST https://api.x.com/2/media/upload/initialize
   * - APPEND: POST https://api.x.com/2/media/upload/{id}/append
   * - FINALIZE: POST https://api.x.com/2/media/upload/{id}/finalize
   */
  private async uploadMediaV2(buffer: Buffer, mimeType: string, isRetry: boolean = false): Promise<string> {
    const axios = require('axios');

    // Get the access token from the client
    let accessToken = this.config.credentials.accessToken || this.config.credentials.access_token;

    if (!accessToken) {
      throw new Error('No access token available for media upload');
    }

    // Determine media category based on mime type
    let mediaCategory = 'tweet_image';
    if (mimeType.startsWith('video/')) {
      mediaCategory = 'tweet_video';
    } else if (mimeType === 'image/gif') {
      mediaCategory = 'tweet_gif';
    }

    const getHeaders = () => ({
      'Authorization': `Bearer ${this.config.credentials.accessToken || this.config.credentials.access_token}`,
      'Content-Type': 'application/json',
    });

    try {
      // Step 1: INIT - Initialize the upload
      this.logger.log(`Twitter v2 media upload INIT - size: ${buffer.length}, type: ${mimeType}${isRetry ? ' (retry after token refresh)' : ''}`);

      const initResponse = await axios.post(
        'https://api.x.com/2/media/upload/initialize',
        {
          media_type: mimeType,
          total_bytes: buffer.length,
          media_category: mediaCategory,
        },
        { headers: getHeaders(), timeout: 60000 }
      );

      const mediaId = initResponse.data.data?.id || initResponse.data.media_id_string;
      if (!mediaId) {
        throw new Error('No media ID returned from INIT request');
      }
      this.logger.log(`Twitter v2 media upload INIT success - media_id: ${mediaId}`);

      // Step 2: APPEND - Upload the media data in chunks
      const chunkSize = 5 * 1024 * 1024; // 5MB chunks
      let segmentIndex = 0;

      for (let offset = 0; offset < buffer.length; offset += chunkSize) {
        const chunk = buffer.slice(offset, Math.min(offset + chunkSize, buffer.length));

        this.logger.log(`Twitter v2 media upload APPEND - segment ${segmentIndex}, size: ${chunk.length}`);

        // Use multipart/form-data for the binary chunk
        const FormData = require('form-data');
        const formData = new FormData();
        formData.append('media', chunk, {
          filename: `chunk_${segmentIndex}`,
          contentType: 'application/octet-stream',
        });
        formData.append('segment_index', segmentIndex.toString());

        await axios.post(
          `https://api.x.com/2/media/upload/${mediaId}/append`,
          formData,
          {
            headers: {
              'Authorization': `Bearer ${this.config.credentials.accessToken || this.config.credentials.access_token}`,
              ...formData.getHeaders(),
            },
            timeout: 300000, // 5 minutes timeout for video chunk uploads
          }
        );

        segmentIndex++;
      }

      this.logger.log(`Twitter v2 media upload APPEND complete - ${segmentIndex} segments`);

      // Step 3: FINALIZE - Complete the upload
      const finalizeResponse = await axios.post(
        `https://api.x.com/2/media/upload/${mediaId}/finalize`,
        {},
        { headers: getHeaders(), timeout: 120000 } // 2 minutes for finalize
      );

      const finalizedId = finalizeResponse.data.data?.id || finalizeResponse.data.media_id_string || mediaId;
      this.logger.log(`Twitter v2 media upload FINALIZE success - media_id: ${finalizedId}`);

      // Check if processing is required (for videos/gifs)
      const processingInfo = finalizeResponse.data.data?.processing_info || finalizeResponse.data.processing_info;
      if (processingInfo && processingInfo.state !== 'succeeded') {
        this.logger.log(`Media requires processing, waiting...`);
        await this.waitForMediaProcessingV2(finalizedId, accessToken);
      }

      return finalizedId;

    } catch (error: any) {
      const status = error.response?.status;
      const errorData = error.response?.data;
      const errorDetail = errorData?.errors?.[0]?.message || errorData?.detail || errorData?.error || error.message;

      this.logger.error(`Twitter v2 media upload failed (${status}): ${errorDetail}`);

      // If 401 and not already a retry, try to refresh token and retry
      if (status === 401 && !isRetry) {
        this.logger.log('Media upload got 401, attempting token refresh and retry...');
        try {
          await this.refreshToken();
          // Re-initialize the Twitter client with new token
          const newAccessToken = this.config.credentials.accessToken || this.config.credentials.access_token;
          if (newAccessToken) {
            this.client = new TwitterApi(newAccessToken);
            this.logger.log('Token refreshed successfully, retrying media upload...');
          }
          // Retry the upload with the new token
          return await this.uploadMediaV2(buffer, mimeType, true);
        } catch (refreshError: any) {
          this.logger.error('Token refresh failed during media upload:', refreshError.message);
          throw new Error(
            `Twitter authentication failed during media upload. ` +
            `The access token is invalid and could not be refreshed. ` +
            `Please reconnect your Twitter account in Settings.`
          );
        }
      }

      if (status === 403) {
        throw new Error(`Media upload forbidden (403). Please ensure your Twitter connection has 'media.write' scope. Re-authorize your connection to enable media uploads.`);
      }

      if (status === 401) {
        // This is a retry that still failed
        throw new Error(`Media upload still unauthorized (401) after token refresh. Please reconnect your Twitter account in Settings.`);
      }

      throw new Error(`Twitter media upload failed: ${errorDetail}`);
    }
  }

  /**
   * Wait for media processing to complete (v2 API)
   * Endpoint: GET https://api.x.com/2/media/upload?command=STATUS&media_id={id}
   */
  private async waitForMediaProcessingV2(mediaId: string, accessToken: string): Promise<void> {
    const axios = require('axios');
    const maxWaitTime = 60000; // 60 seconds max
    const checkInterval = 2000; // Check every 2 seconds
    let elapsed = 0;

    while (elapsed < maxWaitTime) {
      const statusResponse = await axios.get(
        `https://api.x.com/2/media/upload?command=STATUS&media_id=${mediaId}`,
        {
          headers: { 'Authorization': `Bearer ${accessToken}` },
          timeout: 10000,
        }
      );

      // v2 API returns data in data field or directly
      const responseData = statusResponse.data.data || statusResponse.data;
      const processingInfo = responseData.processing_info;

      if (!processingInfo) {
        // Processing complete (no processing_info means done)
        return;
      }

      if (processingInfo.state === 'succeeded') {
        return;
      }

      if (processingInfo.state === 'failed') {
        throw new Error(`Media processing failed: ${processingInfo.error?.message || 'Unknown error'}`);
      }

      // Wait and check again
      const waitTime = processingInfo.check_after_secs ? processingInfo.check_after_secs * 1000 : checkInterval;
      await new Promise(resolve => setTimeout(resolve, waitTime));
      elapsed += waitTime;
    }

    throw new Error('Media processing timed out');
  }

  /**
   * Get file extension from MIME type
   */
  private getExtensionFromMimeType(mimeType: string): string {
    const extensions: Record<string, string> = {
      'image/jpeg': 'jpg',
      'image/png': 'png',
      'image/gif': 'gif',
      'image/webp': 'webp',
      'video/mp4': 'mp4',
      'video/quicktime': 'mov',
    };
    return extensions[mimeType] || 'bin';
  }
}