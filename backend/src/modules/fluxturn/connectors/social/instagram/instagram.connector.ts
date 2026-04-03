import { Request } from 'express';
import { Injectable, Logger } from '@nestjs/common';
import axios, { AxiosInstance } from 'axios';
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
} from '../../types';

@Injectable()
export class InstagramConnector extends BaseConnector implements ISocialConnector {
  private httpClient: AxiosInstance;
  private accessToken: string;
  private instagramAccountId: string;
  private baseUrl = 'https://graph.facebook.com/v18.0';

  getMetadata(): ConnectorMetadata {
    return {
      name: 'Instagram',
      description: 'Instagram Business API for posting and managing visual content',
      version: '2.0.0',
      category: ConnectorCategory.SOCIAL,
      type: ConnectorType.INSTAGRAM,
      authType: AuthType.OAUTH2,
      actions: [
        {
          id: 'publish_image',
          name: 'Publish Image',
          description: 'Publish a single image or carousel album to Instagram',
          inputSchema: {
            type: 'object',
            properties: {
              image_url: {
                type: 'string',
                description: 'Publicly accessible URL of the image to publish (JPEG or PNG, max 8MB)'
              },
              caption: {
                type: 'string',
                maxLength: 2200,
                description: 'Caption text for the post (max 2,200 characters)'
              },
              location_id: {
                type: 'string',
                description: 'Facebook Page ID representing a location'
              },
              is_carousel: {
                type: 'boolean',
                description: 'Publish as a carousel album (multiple images)'
              },
              children: {
                type: 'array',
                description: 'Additional images for carousel (2-10 total images)',
                items: {
                  type: 'object',
                  properties: {
                    image_url: { type: 'string', description: 'URL of the carousel image' }
                  }
                }
              }
            },
            required: ['image_url']
          },
          outputSchema: {
            type: 'object',
            properties: {
              success: { type: 'boolean' },
              data: {
                type: 'object',
                properties: {
                  id: { type: 'string', description: 'Published media ID' },
                  container_id: { type: 'string', description: 'Container ID used for publishing' }
                }
              }
            }
          }
        },
        {
          id: 'publish_reel',
          name: 'Publish Reel',
          description: 'Publish a video reel to Instagram',
          inputSchema: {
            type: 'object',
            properties: {
              video_url: {
                type: 'string',
                description: 'Publicly accessible URL of the video (MP4 format, H.264 codec, max 1GB, 4-90 seconds)'
              },
              caption: {
                type: 'string',
                maxLength: 2200,
                description: 'Caption text for the reel (max 2,200 characters)'
              },
              share_to_feed: {
                type: 'boolean',
                description: 'Also share this reel to your main Instagram feed'
              },
              cover_url: {
                type: 'string',
                description: 'URL of a custom cover image for the reel (optional, JPEG format)'
              },
              location_id: {
                type: 'string',
                description: 'Facebook Page ID representing a location'
              },
              thumb_offset: {
                type: 'number',
                description: 'Frame offset in milliseconds for auto-generated thumbnail'
              }
            },
            required: ['video_url']
          },
          outputSchema: {
            type: 'object',
            properties: {
              success: { type: 'boolean' },
              data: {
                type: 'object',
                properties: {
                  id: { type: 'string', description: 'Published reel ID' },
                  container_id: { type: 'string', description: 'Container ID used for publishing' }
                }
              }
            }
          }
        },
        {
          id: 'publish_story',
          name: 'Publish Story',
          description: 'Publish a photo or video story to Instagram',
          inputSchema: {
            type: 'object',
            properties: {
              content_type: {
                type: 'string',
                enum: ['photo', 'video'],
                description: 'Photo or video content'
              },
              image_url: {
                type: 'string',
                description: 'Publicly accessible URL of the image (JPEG/PNG, 1080x1920 recommended)'
              },
              video_url: {
                type: 'string',
                description: 'Publicly accessible URL of the video (MP4, H.264, max 60 seconds)'
              }
            },
            required: ['content_type']
          },
          outputSchema: {
            type: 'object',
            properties: {
              success: { type: 'boolean' },
              data: {
                type: 'object',
                properties: {
                  id: { type: 'string', description: 'Published story ID' },
                  container_id: { type: 'string', description: 'Container ID used for publishing' }
                }
              }
            }
          }
        },
        {
          id: 'get_media',
          name: 'Get Media',
          description: 'Retrieve published Instagram media posts',
          inputSchema: {
            type: 'object',
            properties: {
              limit: { type: 'number', maximum: 50, description: 'Maximum number of posts to retrieve (1-50)' },
              fields: { type: 'string', description: 'Comma-separated list of fields to retrieve' }
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
          id: 'get_media_insights',
          name: 'Get Media Insights',
          description: 'Get insights and analytics for Instagram media',
          inputSchema: {
            type: 'object',
            properties: {
              media_id: { type: 'string', description: 'ID of the media to get insights for' },
              metric: { type: 'string', description: 'Comma-separated list of metrics to retrieve' }
            },
            required: ['media_id']
          },
          outputSchema: {
            type: 'object',
            properties: {
              success: { type: 'boolean' },
              data: {
                type: 'array',
                items: {
                  type: 'object',
                  properties: {
                    name: { type: 'string' },
                    period: { type: 'string' },
                    values: { type: 'array' }
                  }
                }
              }
            }
          }
        }
      ],
      triggers: [
        {
          id: 'new_media',
          name: 'New Media Posted',
          description: 'Triggered when new media is published to Instagram',
          eventType: 'webhook',
          outputSchema: {
            type: 'object',
            properties: {
              id: { type: 'string', description: 'Media ID' },
              media_type: { type: 'string', description: 'Type of media (IMAGE, VIDEO, CAROUSEL_ALBUM)' },
              media_url: { type: 'string', description: 'Media URL' },
              caption: { type: 'string', description: 'Caption text' },
              timestamp: { type: 'string', description: 'Publish timestamp' }
            }
          }
        },
        {
          id: 'new_comment',
          name: 'New Comment',
          description: 'Triggered when a new comment is received on your media',
          eventType: 'webhook',
          outputSchema: {
            type: 'object',
            properties: {
              id: { type: 'string', description: 'Comment ID' },
              text: { type: 'string', description: 'Comment text' },
              from: {
                type: 'object',
                description: 'Commenter information',
                properties: {
                  id: { type: 'string' },
                  username: { type: 'string' }
                }
              },
              media_id: { type: 'string', description: 'Media ID the comment is on' },
              timestamp: { type: 'string', description: 'Comment timestamp' }
            }
          }
        },
        {
          id: 'new_mention',
          name: 'New Mention',
          description: 'Triggered when you are mentioned in a comment or caption',
          eventType: 'webhook',
          outputSchema: {
            type: 'object',
            properties: {
              id: { type: 'string', description: 'Mention ID' },
              text: { type: 'string', description: 'Mention text' },
              from: {
                type: 'object',
                description: 'Mentioner information',
                properties: {
                  id: { type: 'string' },
                  username: { type: 'string' }
                }
              },
              media_id: { type: 'string', description: 'Media ID (if in caption)' },
              timestamp: { type: 'string', description: 'Mention timestamp' }
            }
          }
        }
      ],
      requiredScopes: [
        'instagram_basic',
        'instagram_content_publish',
        'pages_read_engagement',
        'pages_show_list'
      ]
    };
  }

  protected async initializeConnection(): Promise<void> {
    if (!this.config.credentials) {
      throw new Error('Instagram credentials are required');
    }

    const { access_token, instagram_account_id } = this.config.credentials;

    if (!access_token || !instagram_account_id) {
      throw new Error('Missing required Instagram credentials (access_token, instagram_account_id)');
    }

    this.accessToken = access_token;
    this.instagramAccountId = instagram_account_id;

    this.httpClient = axios.create({
      baseURL: this.baseUrl,
      params: {
        access_token: this.accessToken
      }
    });

    this.logger.log('Instagram connector initialized successfully');
  }

  async initialize(config: ConnectorConfig): Promise<void> {
    this.config = config;
    await this.initializeConnection();
  }

  protected async performConnectionTest(): Promise<boolean> {
    if (!this.httpClient || !this.instagramAccountId) {
      throw new Error('Instagram connector not initialized');
    }

    const response = await this.httpClient.get(
      `/${this.instagramAccountId}?fields=account_type,username,name`
    );

    return response.status === 200;
  }

  protected async performHealthCheck(): Promise<void> {
    await this.performConnectionTest();
  }

  protected async performRequest(request: any): Promise<any> {
    return await this.httpClient.request(request);
  }

  protected async performAction(actionId: string, input: any): Promise<any> {
    return await this.executeAction(actionId, input);
  }

  protected async cleanup(): Promise<void> {
    // No cleanup needed
  }

  async postContent(content: any): Promise<ConnectorResponse> {
    try {
      if (!this.httpClient || !this.instagramAccountId) {
        throw new Error('Instagram connector not initialized');
      }

      const { image_url, video_url, caption, media_type = 'IMAGE', children, is_carousel } = content;

      if (!image_url && !video_url && (!children || children.length === 0)) {
        throw new Error('At least one media URL is required');
      }

      if (caption && caption.length > 2200) {
        throw new Error('Caption exceeds 2200 character limit');
      }

      // Step 1: Create media container
      let mediaData: any = {};

      if (is_carousel || (media_type === 'CAROUSEL_ALBUM' && children && children.length > 0)) {
        // Create carousel album
        const childrenIds: any[] = [];

        // Add first image if provided
        if (image_url) {
          const firstChildData: any = {
            image_url: image_url,
            is_carousel_item: true
          };

          const firstChildResponse = await this.httpClient.post(
            `/${this.instagramAccountId}/media`,
            firstChildData
          );

          childrenIds.push(firstChildResponse.data.id);
        }

        // Add additional children
        if (children && children.length > 0) {
          for (const child of children) {
            const childData: any = {
              image_url: child.image_url || child.media_url,
              is_carousel_item: true
            };

            const childResponse = await this.httpClient.post(
              `/${this.instagramAccountId}/media`,
              childData
            );

            childrenIds.push(childResponse.data.id);
          }
        }

        mediaData = {
          media_type: 'CAROUSEL_ALBUM',
          children: childrenIds.join(','),
          caption: caption || ''
        };
      } else {
        // Single media post
        mediaData = {
          media_type: video_url ? 'VIDEO' : 'IMAGE',
          caption: caption || ''
        };

        if (video_url) {
          mediaData.video_url = video_url;
        } else {
          mediaData.image_url = image_url;
        }

        // Add location if provided
        if (content.location_id) {
          mediaData.location_id = content.location_id;
        }

        // Add user tags if provided
        if (content.user_tags && content.user_tags.length > 0) {
          mediaData.user_tags = content.user_tags;
        }
      }

      const containerResponse = await this.httpClient.post(
        `/${this.instagramAccountId}/media`,
        mediaData
      );

      const containerId = containerResponse.data.id;

      // Step 2: Publish the media
      const publishResponse = await this.httpClient.post(
        `/${this.instagramAccountId}/media_publish`,
        {
          creation_id: containerId
        }
      );

      return {
        success: true,
        data: {
          id: publishResponse.data.id,
          container_id: containerId
        },
      };
    } catch (error) {
      this.logger.error('Failed to post to Instagram:', error);
      return {
        success: false,
        error: error.response?.data?.error?.message || error.message,
      };
    }
  }

  async publishReel(content: any): Promise<ConnectorResponse> {
    try {
      if (!this.httpClient || !this.instagramAccountId) {
        throw new Error('Instagram connector not initialized');
      }

      const { video_url, caption, share_to_feed = true, cover_url, location_id, thumb_offset } = content;

      if (!video_url) {
        throw new Error('Video URL is required for reels');
      }

      if (caption && caption.length > 2200) {
        throw new Error('Caption exceeds 2200 character limit');
      }

      // Step 1: Create reel container
      const reelData: any = {
        media_type: 'REELS',
        video_url: video_url,
        caption: caption || '',
        share_to_feed: share_to_feed
      };

      // Add optional fields
      if (cover_url) {
        reelData.cover_url = cover_url;
      }

      if (location_id) {
        reelData.location_id = location_id;
      }

      if (thumb_offset !== undefined) {
        reelData.thumb_offset = thumb_offset;
      }

      this.logger.log('Creating Instagram reel container with data:', JSON.stringify(reelData, null, 2));

      const containerResponse = await this.httpClient.post(
        `/${this.instagramAccountId}/media`,
        reelData
      );

      const containerId = containerResponse.data.id;
      this.logger.log(`Reel container created: ${containerId}`);

      // Step 2: Publish the reel
      const publishResponse = await this.httpClient.post(
        `/${this.instagramAccountId}/media_publish`,
        {
          creation_id: containerId
        }
      );

      this.logger.log('Reel published successfully:', publishResponse.data);

      return {
        success: true,
        data: {
          id: publishResponse.data.id,
          container_id: containerId
        },
      };
    } catch (error) {
      this.logger.error('Failed to publish Instagram reel:', error);
      return {
        success: false,
        error: error.response?.data?.error?.message || error.message,
      };
    }
  }

  async createStory(content: any): Promise<ConnectorResponse> {
    try {
      if (!this.httpClient || !this.instagramAccountId) {
        throw new Error('Instagram connector not initialized');
      }

      const { image_url, video_url, media_type = 'STORIES', content_type = 'photo' } = content;

      // Determine which URL to use based on content_type
      const mediaUrl = content_type === 'video' ? video_url : image_url;

      if (!mediaUrl) {
        throw new Error(`${content_type === 'video' ? 'Video' : 'Image'} URL is required for stories`);
      }

      const storyData: any = {
        media_type: 'STORIES',
      };

      if (content_type === 'video' || video_url) {
        storyData.video_url = video_url || mediaUrl;
      } else {
        storyData.image_url = image_url || mediaUrl;
      }

      this.logger.log('Creating Instagram story with data:', JSON.stringify(storyData, null, 2));

      // Create story container
      const containerResponse = await this.httpClient.post(
        `/${this.instagramAccountId}/media`,
        storyData
      );

      const containerId = containerResponse.data.id;
      this.logger.log(`Story container created: ${containerId}`);

      // Publish story
      const publishResponse = await this.httpClient.post(
        `/${this.instagramAccountId}/media_publish`,
        {
          creation_id: containerId
        }
      );

      this.logger.log('Story published successfully:', publishResponse.data);

      return {
        success: true,
        data: {
          id: publishResponse.data.id,
          container_id: containerId
        },
      };
    } catch (error) {
      this.logger.error('Failed to create Instagram story:', error);
      return {
        success: false,
        error: error.response?.data?.error?.message || error.message,
      };
    }
  }

  async getPosts(options?: PaginatedRequest): Promise<ConnectorResponse> {
    try {
      if (!this.httpClient || !this.instagramAccountId) {
        throw new Error('Instagram connector not initialized');
      }

      const limit = Math.min(options?.limit || 25, 50);
      const fields = 'id,media_type,media_url,caption,timestamp,like_count,comments_count,permalink';

      let url = `/${this.instagramAccountId}/media?fields=${fields}&limit=${limit}`;
      
      if (options?.cursor) {
        url += `&after=${options.cursor}`;
      }

      const response = await this.httpClient.get(url);

      return {
        success: true,
        data: {
          items: response.data.data || [],
          pagination: {
            next_cursor: response.data.paging?.cursors?.after,
            has_more: !!response.data.paging?.next
          }
        },
      };
    } catch (error) {
      this.logger.error('Failed to get Instagram media:', error);
      return {
        success: false,
        error: error.response?.data?.error?.message || error.message,
      };
    }
  }

  async getUserProfile(userId?: string): Promise<ConnectorResponse> {
    try {
      if (!this.httpClient || !this.instagramAccountId) {
        throw new Error('Instagram connector not initialized');
      }

      const id = userId || this.instagramAccountId;
      const fields = 'account_type,id,media_count,followers_count,follows_count,name,profile_picture_url,username,website,biography';

      const response = await this.httpClient.get(
        `/${id}?fields=${fields}`
      );

      return {
        success: true,
        data: response.data,
      };
    } catch (error) {
      this.logger.error('Failed to get Instagram profile:', error);
      return {
        success: false,
        error: error.response?.data?.error?.message || error.message,
      };
    }
  }

  async getConnections(type: 'followers' | 'following', options?: PaginatedRequest): Promise<ConnectorResponse> {
    // Instagram Graph API doesn't provide access to followers/following lists
    try {
      if (!this.httpClient || !this.instagramAccountId) {
        throw new Error('Instagram connector not initialized');
      }

      const response = await this.httpClient.get(
        `/${this.instagramAccountId}?fields=followers_count,follows_count`
      );

      return {
        success: true,
        data: {
          followers_count: response.data.followers_count,
          follows_count: response.data.follows_count,
        }
      };
    } catch (error) {
      this.logger.error(`Failed to get Instagram ${type}:`, error);
      return {
        success: false,
        error: {
          code: 'CONNECTION_ERROR',
          message: error.response?.data?.error?.message || error.message
        }
      };
    }
  }

  async schedulePost(content: any, scheduledTime: Date): Promise<ConnectorResponse> {
    // Instagram doesn't support scheduled posts through the Graph API
    return {
      success: false,
      error: {
        code: 'NOT_SUPPORTED',
        message: 'Scheduled posts not supported by Instagram Graph API'
      },
    };
  }

  async getMediaInsights(mediaId: string, metric?: string): Promise<ConnectorResponse> {
    try {
      if (!this.httpClient) {
        throw new Error('Instagram connector not initialized');
      }

      const metrics = metric || 'impressions,reach,engagement,saves,profile_visits,website_clicks';
      
      const response = await this.httpClient.get(
        `/${mediaId}/insights?metric=${metrics}`
      );

      return {
        success: true,
        data: response.data.data || [],
      };
    } catch (error) {
      this.logger.error('Failed to get Instagram media insights:', error);
      return {
        success: false,
        error: error.response?.data?.error?.message || error.message,
      };
    }
  }

  async executeAction(actionId: string, input: any): Promise<ConnectorResponse> {
    switch (actionId) {
      // New action IDs
      case 'publish_image':
        return this.postContent(input);
      case 'publish_reel':
        return this.publishReel(input);
      case 'publish_story':
        return this.createStory(input);

      // Legacy action IDs (for backward compatibility)
      case 'create_media_post':
        return this.postContent(input);
      case 'create_story':
        return this.createStory(input);

      // Analytics actions
      case 'get_media':
        return this.getPosts(input);
      case 'get_media_insights':
        return this.getMediaInsights(input.media_id, input.metric);

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
}