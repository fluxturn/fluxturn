import { Request } from 'express';
import { Injectable, Logger } from '@nestjs/common';
import { FacebookAdsApi, Page, Ad, AdSet, Campaign } from 'facebook-nodejs-business-sdk';
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
import axios from 'axios';

@Injectable()
export class FacebookConnector extends BaseConnector implements ISocialConnector {
  private accessToken: string;
  private pageId: string;
  private baseUrl = 'https://graph.facebook.com/v18.0';

  getMetadata(): ConnectorMetadata {
    return {
      name: 'Facebook',
      description: 'Facebook social media connector for posting and managing content',
      version: '1.0.0',
      category: ConnectorCategory.SOCIAL,
      type: ConnectorType.FACEBOOK,
      authType: AuthType.OAUTH2,
      actions: [
        {
          id: 'post_to_page',
          name: 'Post to Page',
          description: 'Post content to Facebook page',
          inputSchema: {
            type: 'object',
            properties: {
              message: { type: 'string' },
              link: { type: 'string' },
              photo: { type: 'string' },
              video: { type: 'string' },
              scheduled_publish_time: { type: 'number' }
            }
          },
          outputSchema: {
            type: 'object',
            properties: {
              success: { type: 'boolean' },
              data: {
                type: 'object',
                properties: {
                  id: { type: 'string' },
                  post_id: { type: 'string' }
                }
              }
            }
          }
        },
        {
          id: 'get_page_posts',
          name: 'Get Page Posts',
          description: 'Get posts from Facebook page',
          inputSchema: {
            type: 'object',
            properties: {
              limit: { type: 'number', maximum: 100 },
              fields: { type: 'string' }
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
          id: 'get_page_insights',
          name: 'Get Page Insights',
          description: 'Get Facebook page analytics',
          inputSchema: {
            type: 'object',
            properties: {
              metric: { type: 'string' },
              period: { type: 'string', enum: ['day', 'week', 'days_28'] }
            }
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
          id: 'new_post',
          name: 'New Post',
          description: 'Triggered when a new post is created',
          eventType: 'webhook',
          outputSchema: {
            type: 'object',
            properties: {
              id: { type: 'string' },
              message: { type: 'string' },
              created_time: { type: 'string' }
            }
          }
        },
        {
          id: 'new_comment',
          name: 'New Comment',
          description: 'Triggered when a new comment is received',
          eventType: 'webhook',
          outputSchema: {
            type: 'object',
            properties: {
              id: { type: 'string' },
              message: { type: 'string' },
              from: { type: 'object' }
            }
          }
        }
      ],
      requiredScopes: [
        'access_token',
        'page_id'
      ]
    };
  }

  protected async initializeConnection(): Promise<void> {
    if (!this.config.credentials) {
      throw new Error('Facebook credentials are required');
    }

    const { access_token, page_id } = this.config.credentials;

    if (!access_token || !page_id) {
      throw new Error('Missing required Facebook credentials (access_token, page_id)');
    }

    this.accessToken = access_token;
    this.pageId = page_id;

    // Initialize Facebook Business SDK
    FacebookAdsApi.init(access_token);

    this.logger.log('Facebook connector initialized successfully');
  }

  async initialize(config: ConnectorConfig): Promise<void> {
    this.config = config;
    await this.initializeConnection();
  }

  protected async performConnectionTest(): Promise<boolean> {
    if (!this.accessToken || !this.pageId) {
      throw new Error('Facebook connector not initialized');
    }

    const response = await axios.get(
      `${this.baseUrl}/${this.pageId}?fields=name,id&access_token=${this.accessToken}`
    );

    return response.status === 200;
  }

  protected async performHealthCheck(): Promise<void> {
    await this.performConnectionTest();
  }

  protected async performRequest(request: any): Promise<any> {
    return await axios.request(request);
  }

  protected async performAction(actionId: string, input: any): Promise<any> {
    return await this.executeAction(actionId, input);
  }

  protected async cleanup(): Promise<void> {
    // No cleanup needed
  }

  async postContent(content: any): Promise<ConnectorResponse> {
    try {
      if (!this.accessToken || !this.pageId) {
        throw new Error('Facebook connector not initialized');
      }

      const { message, link, photo, video, scheduled_publish_time } = content;

      if (!message && !link && !photo && !video) {
        throw new Error('At least one content field (message, link, photo, video) is required');
      }

      let postData: any = {};
      let endpoint = `${this.baseUrl}/${this.pageId}/feed`;

      if (photo) {
        endpoint = `${this.baseUrl}/${this.pageId}/photos`;
        postData.url = photo;
        if (message) postData.caption = message;
      } else if (video) {
        endpoint = `${this.baseUrl}/${this.pageId}/videos`;
        postData.file_url = video;
        if (message) postData.description = message;
      } else {
        if (message) postData.message = message;
        if (link) postData.link = link;
      }

      if (scheduled_publish_time) {
        postData.published = false;
        postData.scheduled_publish_time = scheduled_publish_time;
      }

      postData.access_token = this.accessToken;

      const response = await axios.post(endpoint, postData);

      return {
        success: true,
        data: response.data
      };
    } catch (error) {
      this.logger.error('Failed to post to Facebook:', error);
      return {
        success: false,
        error: error.response?.data?.error?.message || error.message,
      };
    }
  }

  async getPosts(options?: PaginatedRequest): Promise<ConnectorResponse> {
    try {
      if (!this.accessToken || !this.pageId) {
        throw new Error('Facebook connector not initialized');
      }

      const limit = Math.min(options?.limit || 25, 100);
      const fields = 'id,message,created_time,type,link,full_picture,reactions.summary(true),comments.summary(true),shares';

      let url = `${this.baseUrl}/${this.pageId}/posts?fields=${fields}&limit=${limit}&access_token=${this.accessToken}`;
      
      if (options?.cursor) {
        url += `&after=${options.cursor}`;
      }

      const response = await axios.get(url);

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
      this.logger.error('Failed to get Facebook posts:', error);
      return {
        success: false,
        error: error.response?.data?.error?.message || error.message,
      };
    }
  }

  async getUserProfile(userId?: string): Promise<ConnectorResponse> {
    try {
      if (!this.accessToken || !this.pageId) {
        throw new Error('Facebook connector not initialized');
      }

      const id = userId || this.pageId;
      const fields = 'id,name,about,category,fan_count,followers_count,picture,cover,website';

      const response = await axios.get(
        `${this.baseUrl}/${id}?fields=${fields}&access_token=${this.accessToken}`
      );

      return {
        success: true,
        data: response.data,
      };
    } catch (error) {
      this.logger.error('Failed to get Facebook profile:', error);
      return {
        success: false,
        error: error.response?.data?.error?.message || error.message,
      };
    }
  }

  async getConnections(type: 'followers' | 'following', options?: PaginatedRequest): Promise<ConnectorResponse> {
    // Facebook doesn't provide direct access to page followers list for privacy reasons
    // We can only get follower count from page insights
    try {
      if (!this.accessToken || !this.pageId) {
        throw new Error('Facebook connector not initialized');
      }

      if (type === 'followers') {
        const response = await axios.get(
          `${this.baseUrl}/${this.pageId}?fields=followers_count,fan_count&access_token=${this.accessToken}`
        );

        return {
          success: true,
          data: {
            total_followers: response.data.followers_count || response.data.fan_count,
          },
        };
      } else {
        return {
          success: false,
          error: {
            code: 'NOT_SUPPORTED',
            message: 'Following list not available for Facebook pages'
          },
        };
      }
    } catch (error) {
      this.logger.error('Failed to get Facebook connections:', error);
      return {
        success: false,
        error: error.response?.data?.error?.message || error.message,
      };
    }
  }

  async schedulePost(content: any, scheduledTime: Date): Promise<ConnectorResponse> {
    const scheduledTimestamp = Math.floor(scheduledTime.getTime() / 1000);
    const contentWithSchedule = {
      ...content,
      scheduled_publish_time: scheduledTimestamp
    };

    return this.postContent(contentWithSchedule);
  }

  async getPageInsights(metric?: string, period: string = 'day'): Promise<ConnectorResponse> {
    try {
      if (!this.accessToken || !this.pageId) {
        throw new Error('Facebook connector not initialized');
      }

      const metrics = metric || 'page_impressions,page_reach,page_engaged_users,page_video_views';
      
      const response = await axios.get(
        `${this.baseUrl}/${this.pageId}/insights?metric=${metrics}&period=${period}&access_token=${this.accessToken}`
      );

      return {
        success: true,
        data: response.data.data || [],
      };
    } catch (error) {
      this.logger.error('Failed to get Facebook insights:', error);
      return {
        success: false,
        error: error.response?.data?.error?.message || error.message,
      };
    }
  }

  async executeAction(actionId: string, input: any): Promise<ConnectorResponse> {
    switch (actionId) {
      case 'post_to_page':
        return this.postContent(input);
      case 'get_page_posts':
        return this.getPosts(input);
      case 'get_page_insights':
        return this.getPageInsights(input.metric, input.period);
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