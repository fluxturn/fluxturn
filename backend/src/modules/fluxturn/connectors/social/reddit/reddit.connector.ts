import { Injectable, Logger } from '@nestjs/common';
import axios, { AxiosInstance } from 'axios';
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

@Injectable()
export class RedditConnector extends BaseConnector implements ISocialConnector {
  private client: AxiosInstance;
  private readonly baseUrl = 'https://oauth.reddit.com';

  getMetadata(): ConnectorMetadata {
    return {
      name: 'Reddit',
      description: 'Reddit social media connector for posting and managing content',
      version: '1.0.0',
      category: ConnectorCategory.SOCIAL,
      type: ConnectorType.REDDIT,
      authType: AuthType.OAUTH2,
      actions: [
        {
          id: 'post_create',
          name: 'Create Post',
          description: 'Submit a new post to a subreddit',
          inputSchema: {
            type: 'object',
            properties: {
              subreddit: {
                type: 'string',
                label: 'Subreddit',
                description: 'The subreddit to post to (without r/)',
                required: true
              },
              title: {
                type: 'string',
                label: 'Title',
                description: 'Post title (max 300 characters)',
                maxLength: 300,
                required: true
              },
              kind: {
                type: 'select',
                label: 'Post Type',
                options: [
                  { label: 'Text Post', value: 'self' },
                  { label: 'Link Post', value: 'link' }
                ],
                default: 'self',
                required: true
              },
              text: {
                type: 'text',
                label: 'Text Content',
                description: 'Text content for self posts (supports markdown)'
              },
              url: {
                type: 'string',
                label: 'URL',
                description: 'URL for link posts'
              }
            },
            required: ['subreddit', 'title', 'kind']
          },
          outputSchema: {
            type: 'object',
            properties: {
              success: { type: 'boolean' },
              data: {
                type: 'object',
                properties: {
                  id: { type: 'string' },
                  name: { type: 'string' },
                  url: { type: 'string' }
                }
              }
            }
          }
        },
        {
          id: 'comment_create',
          name: 'Create Comment',
          description: 'Create a comment on a post',
          inputSchema: {
            type: 'object',
            properties: {
              postId: {
                type: 'string',
                label: 'Post ID',
                description: 'Full ID of the post (e.g., t3_xxxxx)',
                required: true
              },
              text: {
                type: 'text',
                label: 'Comment Text',
                description: 'Comment text (supports markdown)',
                required: true
              }
            },
            required: ['postId', 'text']
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
          id: 'post_get_many',
          name: 'Get Posts',
          description: 'Get posts from a subreddit',
          inputSchema: {
            type: 'object',
            properties: {
              subreddit: {
                type: 'string',
                label: 'Subreddit',
                description: 'The subreddit name (without r/)',
                required: true
              },
              category: {
                type: 'select',
                label: 'Category',
                options: [
                  { label: 'Hot', value: 'hot' },
                  { label: 'New', value: 'new' },
                  { label: 'Rising', value: 'rising' },
                  { label: 'Top', value: 'top' }
                ],
                default: 'hot'
              },
              limit: {
                type: 'number',
                label: 'Limit',
                default: 10,
                minimum: 1,
                maximum: 100
              }
            },
            required: ['subreddit']
          },
          outputSchema: {
            type: 'object',
            properties: {
              success: { type: 'boolean' },
              data: {
                type: 'object',
                properties: {
                  posts: { type: 'array' },
                  after: { type: 'string' }
                }
              }
            }
          }
        }
      ],
      triggers: [],
      requiredScopes: ['identity', 'edit', 'history', 'mysubreddits', 'read', 'save', 'submit']
    };
  }

  protected async initializeConnection(): Promise<void> {
    try {
      if (!this.config.credentials) {
        throw new Error('Reddit credentials are required');
      }

      const accessToken = this.config.credentials.accessToken || this.config.credentials.access_token;

      if (!accessToken) {
        throw new Error('Missing required Reddit OAuth2 access token');
      }

      // Initialize axios client with OAuth2 Bearer token
      this.client = axios.create({
        baseURL: this.baseUrl,
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'User-Agent': 'Fluxturn/1.0',
          'Content-Type': 'application/x-www-form-urlencoded'
        }
      });

      this.logger.log('Reddit connector initialized successfully with OAuth2');
    } catch (error) {
      this.logger.error('Failed to initialize Reddit connector:', error);
      throw error;
    }
  }

  protected async performConnectionTest(): Promise<boolean> {
    try {
      if (!this.client) {
        throw new Error('Reddit client not initialized');
      }

      // Test connection by getting user identity
      await this.client.get('/api/v1/me');
      return true;
    } catch (error) {
      this.logger.error('Reddit connection test failed:', error);
      return false;
    }
  }

  protected async performHealthCheck(): Promise<void> {
    try {
      if (!this.client) {
        throw new Error('Reddit client not initialized');
      }
      await this.client.get('/api/v1/me');
    } catch (error) {
      throw new Error(`Reddit health check failed: ${error.message}`);
    }
  }

  protected async performRequest(request: ConnectorRequest): Promise<any> {
    try {
      if (!this.client) {
        throw new Error('Reddit client not initialized');
      }

      const response = await this.client.request({
        method: request.method,
        url: request.endpoint,
        data: request.body,
        params: request.queryParams
      });

      return response.data;
    } catch (error) {
      this.logger.error('Reddit request failed:', error);
      throw error;
    }
  }

  protected async performAction(actionId: string, input: any): Promise<any> {
    switch (actionId) {
      case 'post_create':
        return this.createPost(input);
      case 'comment_create':
        return this.createComment(input);
      case 'post_get_many':
        return this.getPosts(input);
      default:
        throw new Error(`Unknown action: ${actionId}`);
    }
  }

  protected async cleanup(): Promise<void> {
    this.logger.log('Reddit connector cleanup completed');
  }

  async createPost(input: any): Promise<ConnectorResponse> {
    try {
      if (!this.client) {
        throw new Error('Reddit client not initialized');
      }

      this.logger.log('createPost input:', JSON.stringify(input));

      let { subreddit, title, kind, text, url } = input;

      if (!subreddit || !title) {
        throw new Error('Missing required fields: subreddit and title are required');
      }

      // Auto-detect kind if not provided
      if (!kind) {
        if (text) {
          kind = 'self';
          this.logger.log('Auto-detected kind as "self" (text post)');
        } else if (url) {
          kind = 'link';
          this.logger.log('Auto-detected kind as "link" (link post)');
        } else {
          kind = 'self'; // Default to text post
          this.logger.log('No content provided, defaulting to "self" (text post)');
        }
      }

      // Build form data for Reddit API
      const formData = new URLSearchParams();
      formData.append('sr', subreddit);
      formData.append('title', title);
      formData.append('kind', kind);

      if (kind === 'self' && text) {
        formData.append('text', text);
      } else if (kind === 'link' && url) {
        formData.append('url', url);
      }

      formData.append('sendreplies', 'true');
      formData.append('resubmit', 'true');

      this.logger.log(`Creating ${kind} post in r/${subreddit}: ${title}`);

      const response = await this.client.post('/api/submit', formData.toString());

      if (response.data?.json?.errors && response.data.json.errors.length > 0) {
        const errorMsg = response.data.json.errors.map((e: any) => e[1]).join(', ');
        throw new Error(`Reddit API error: ${errorMsg}`);
      }

      const postData = response.data?.json?.data;

      return {
        success: true,
        data: {
          id: postData?.id,
          name: postData?.name,
          url: postData?.url,
          permalink: `https://reddit.com${postData?.url}`
        }
      };
    } catch (error: any) {
      this.logger.error('Failed to create Reddit post:', error);
      return {
        success: false,
        error: error.response?.data || error.message
      };
    }
  }

  async createComment(input: any): Promise<ConnectorResponse> {
    try {
      if (!this.client) {
        throw new Error('Reddit client not initialized');
      }

      const { postId, text } = input;

      if (!postId || !text) {
        throw new Error('Missing required fields: postId and text are required');
      }

      const formData = new URLSearchParams();
      formData.append('thing_id', postId);
      formData.append('text', text);

      this.logger.log(`Creating comment on post ${postId}`);

      const response = await this.client.post('/api/comment', formData.toString());

      if (response.data?.json?.errors && response.data.json.errors.length > 0) {
        const errorMsg = response.data.json.errors.map((e: any) => e[1]).join(', ');
        throw new Error(`Reddit API error: ${errorMsg}`);
      }

      return {
        success: true,
        data: response.data?.json?.data?.things?.[0]?.data || response.data
      };
    } catch (error: any) {
      this.logger.error('Failed to create Reddit comment:', error);
      return {
        success: false,
        error: error.response?.data || error.message
      };
    }
  }

  async getPosts(input: any): Promise<ConnectorResponse> {
    try {
      if (!this.client) {
        throw new Error('Reddit client not initialized');
      }

      const { subreddit, category = 'hot', limit = 10 } = input;

      if (!subreddit) {
        throw new Error('Subreddit is required');
      }

      this.logger.log(`Fetching ${category} posts from r/${subreddit}`);

      const response = await this.client.get(`/r/${subreddit}/${category}`, {
        params: { limit: Math.min(limit, 100) }
      });

      const posts = response.data?.data?.children?.map((child: any) => child.data) || [];

      return {
        success: true,
        data: {
          posts,
          after: response.data?.data?.after,
          before: response.data?.data?.before
        }
      };
    } catch (error: any) {
      this.logger.error('Failed to get Reddit posts:', error);
      return {
        success: false,
        error: error.response?.data || error.message
      };
    }
  }

  async postContent(content: any): Promise<ConnectorResponse> {
    return this.createPost(content);
  }

  async getUserProfile(userId?: string): Promise<ConnectorResponse> {
    try {
      if (!this.client) {
        throw new Error('Reddit client not initialized');
      }

      const response = await this.client.get('/api/v1/me');

      return {
        success: true,
        data: response.data
      };
    } catch (error: any) {
      this.logger.error('Failed to get Reddit user profile:', error);
      return {
        success: false,
        error: error.response?.data || error.message
      };
    }
  }

  async getConnections(type: 'followers' | 'following', options?: PaginatedRequest): Promise<ConnectorResponse> {
    return {
      success: false,
      error: { code: 'NOT_SUPPORTED', message: 'Reddit does not support followers/following via API' }
    };
  }

  async schedulePost(content: any, scheduledTime: Date): Promise<ConnectorResponse> {
    return {
      success: false,
      error: { code: 'NOT_SUPPORTED', message: 'Scheduled posts not supported by Reddit API' }
    };
  }

  async executeAction(actionId: string, input: any): Promise<ConnectorResponse> {
    switch (actionId) {
      case 'post_create':
        return this.createPost(input);
      case 'comment_create':
        return this.createComment(input);
      case 'post_get_many':
        return this.getPosts(input);
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
