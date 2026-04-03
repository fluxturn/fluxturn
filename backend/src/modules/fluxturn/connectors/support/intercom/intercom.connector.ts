import { Request } from 'express';
import { Injectable, Logger } from '@nestjs/common';
import axios, { AxiosInstance } from 'axios';
import { BaseConnector } from '../../base/base.connector';
import { ISupportConnector } from '../../base/connector.interface';
import {
  ConnectorConfig,
  ConnectorResponse,
  ConnectorMetadata,
  PaginatedRequest,
  ConnectorType,
  AuthType,
  ConnectorCategory,
  ConnectorRequest
} from '../../types';
import { AuthUtils } from '../../utils/auth.utils';
import { ApiUtils } from '../../utils/api.utils';

@Injectable()
export class IntercomConnector extends BaseConnector implements ISupportConnector {
  private httpClient: AxiosInstance;
  private accessToken: string;

  constructor(
    private readonly authUtils: AuthUtils,
    private readonly apiUtils: ApiUtils
  ) {
    super();
  }

  getMetadata(): ConnectorMetadata {
    return {
      name: 'Intercom',
      description: 'Intercom support connector for managing conversations and customer engagement',
      version: '1.0.0',
      category: ConnectorCategory.SUPPORT,
      type: ConnectorType.INTERCOM,
      authType: AuthType.BEARER_TOKEN,
      actions: [
        {
          id: 'create_conversation',
          name: 'Create Conversation',
          description: 'Start a new conversation with a user',
          inputSchema: {
            type: 'object',
            properties: {
              user_id: { type: 'string' },
              email: { type: 'string', format: 'email' },
              body: { type: 'string' },
              message_type: { type: 'string', enum: ['email', 'inapp', 'facebook', 'twitter'] },
              subject: { type: 'string' }
            },
            required: ['body'],
            oneOf: [
              { required: ['user_id'] },
              { required: ['email'] }
            ]
          },
          outputSchema: {
            type: 'object',
            properties: {
              success: { type: 'boolean' },
              data: {
                type: 'object',
                properties: {
                  id: { type: 'string' },
                  subject: { type: 'string' },
                  body: { type: 'string' },
                  state: { type: 'string' },
                  created_at: { type: 'number' }
                }
              }
            }
          }
        },
        {
          id: 'reply_to_conversation',
          name: 'Reply to Conversation',
          description: 'Reply to an existing conversation',
          inputSchema: {
            type: 'object',
            properties: {
              conversation_id: { type: 'string' },
              body: { type: 'string' },
              message_type: { type: 'string', enum: ['comment', 'note'] },
              admin_id: { type: 'string' }
            },
            required: ['conversation_id', 'body']
          },
          outputSchema: {
            type: 'object',
            properties: {
              success: { type: 'boolean' },
              data: {
                type: 'object',
                properties: {
                  id: { type: 'string' },
                  body: { type: 'string' },
                  author: { type: 'object' },
                  created_at: { type: 'number' }
                }
              }
            }
          }
        },
        {
          id: 'get_conversations',
          name: 'Get Conversations',
          description: 'Retrieve conversations with filtering',
          inputSchema: {
            type: 'object',
            properties: {
              state: { type: 'string', enum: ['open', 'closed', 'snoozed'] },
              sort: { type: 'string', enum: ['created_at', 'updated_at', 'waiting_since'] },
              order: { type: 'string', enum: ['asc', 'desc'] },
              starting_after: { type: 'string' },
              per_page: { type: 'number', minimum: 1, maximum: 150 }
            }
          },
          outputSchema: {
            type: 'object',
            properties: {
              success: { type: 'boolean' },
              data: {
                type: 'object',
                properties: {
                  conversations: {
                    type: 'array',
                    items: { type: 'object' }
                  },
                  pages: { type: 'object' },
                  total_count: { type: 'number' }
                }
              }
            }
          }
        },
        {
          id: 'create_user',
          name: 'Create User',
          description: 'Create or update a user',
          inputSchema: {
            type: 'object',
            properties: {
              user_id: { type: 'string' },
              email: { type: 'string', format: 'email' },
              name: { type: 'string' },
              phone: { type: 'string' },
              custom_attributes: { type: 'object' },
              signed_up_at: { type: 'number' },
              last_seen_at: { type: 'number' }
            },
            oneOf: [
              { required: ['user_id'] },
              { required: ['email'] }
            ]
          },
          outputSchema: {
            type: 'object',
            properties: {
              success: { type: 'boolean' },
              data: {
                type: 'object',
                properties: {
                  id: { type: 'string' },
                  user_id: { type: 'string' },
                  email: { type: 'string' },
                  name: { type: 'string' },
                  created_at: { type: 'number' },
                  updated_at: { type: 'number' }
                }
              }
            }
          }
        }
      ],
      triggers: [
        {
          id: 'conversation_opened',
          eventType: 'webhook',
          outputSchema: {
            type: 'object',
            properties: {
              id: { type: 'string' },
              state: { type: 'string' },
              subject: { type: 'string' },
              created_at: { type: 'number' }
            }
          },
          name: 'Conversation Opened',
          description: 'Triggered when a new conversation is opened'
        },
        {
          id: 'conversation_closed',
          eventType: 'webhook',
          outputSchema: {
            type: 'object',
            properties: {
              id: { type: 'string' },
              state: { type: 'string' },
              closed_at: { type: 'number' }
            }
          },
          name: 'Conversation Closed',
          description: 'Triggered when a conversation is closed'
        },
        {
          id: 'user_created',
          eventType: 'webhook',
          outputSchema: {
            type: 'object',
            properties: {
              id: { type: 'string' },
              user_id: { type: 'string' },
              email: { type: 'string' },
              created_at: { type: 'number' }
            }
          },
          name: 'User Created',
          description: 'Triggered when a new user is created'
        }
      ],
      logoUrl: 'https://www.intercom.com/favicon.ico',
      documentationUrl: 'https://developers.intercom.com/docs',
      rateLimit: {
        requestsPerSecond: 5,
        requestsPerMinute: 1000,
        requestsPerDay: 100000
      },
      webhookSupport: true
    };
  }

  protected async initializeConnection(): Promise<void> {
    const config = this.config;
    
    if (!config.credentials) {
      throw new Error('Intercom credentials are required');
    }

    const { access_token } = config.credentials;

    if (!access_token) {
      throw new Error('Missing required Intercom access token');
    }

    this.accessToken = access_token;

    this.httpClient = axios.create({
      baseURL: 'https://api.intercom.io',
      headers: {
        'Authorization': `Bearer ${access_token}`,
        'Accept': 'application/json',
        'Content-Type': 'application/json',
        'Intercom-Version': '2.9'
      }
    });

    this.logger.log('Intercom connector initialized successfully');
  }

  protected async performConnectionTest(): Promise<boolean> {
    try {
      if (!this.httpClient) {
        return false;
      }

      await this.httpClient.get('/me');
      return true;
    } catch (error) {
      this.logger.error('Intercom connection test failed:', error);
      return false;
    }
  }

  protected async performHealthCheck(): Promise<void> {
    if (!this.httpClient) {
      throw new Error('Intercom client not initialized');
    }

    try {
      await this.httpClient.get('/me');
    } catch (error) {
      throw new Error(`Intercom health check failed: ${error.message}`);
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
    return this.executeAction(actionId, input);
  }

  protected async cleanup(): Promise<void> {
    this.logger.log('Intercom connector cleanup completed');
  }


  async createTicket(ticket: any): Promise<ConnectorResponse> {
    // In Intercom, tickets are conversations
    return this.createConversation(ticket);
  }

  async createConversation(data: any): Promise<ConnectorResponse> {
    try {
      if (!this.httpClient) {
        throw new Error('Intercom client not initialized');
      }

      const { user_id, email, body, message_type = 'email', subject } = data;

      if (!body) {
        throw new Error('Message body is required');
      }

      if (!user_id && !email) {
        throw new Error('Either user_id or email is required');
      }

      const conversationData: any = {
        body: body,
        message_type: message_type
      };

      // Set the user context
      if (user_id) {
        conversationData.from = {
          type: 'user',
          user_id: user_id
        };
      } else if (email) {
        conversationData.from = {
          type: 'user',
          email: email
        };
      }

      if (subject && message_type === 'email') {
        conversationData.subject = subject;
      }

      const response = await this.httpClient.post('/conversations', conversationData);

      return {
        success: true,
        data: response.data,
      };
    } catch (error) {
      this.logger.error('Failed to create Intercom conversation:', error);
      return {
        success: false,
        error: {
          code: error.response?.data?.errors?.[0]?.code || 'OPERATION_FAILED',
          message: error.response?.data?.errors?.[0]?.message || error.message
        }
      };
    }
  }

  async updateTicket(ticketId: string, updates: any): Promise<ConnectorResponse> {
    try {
      if (!this.httpClient) {
        throw new Error('Intercom client not initialized');
      }

      const { state, assignee_id } = updates;

      const updateData: any = {};

      if (state) {
        updateData.state = state;
      }

      if (assignee_id) {
        updateData.assignee = { id: assignee_id };
      }

      const response = await this.httpClient.put(`/conversations/${ticketId}`, updateData);

      return {
        success: true,
        data: response.data,
      };
    } catch (error) {
      this.logger.error('Failed to update Intercom conversation:', error);
      return {
        success: false,
        error: {
          code: error.response?.data?.errors?.[0]?.code || 'OPERATION_FAILED',
          message: error.response?.data?.errors?.[0]?.message || error.message
        }
      };
    }
  }

  async getTickets(options?: PaginatedRequest): Promise<ConnectorResponse> {
    return this.getConversations(options);
  }

  async getConversations(options?: PaginatedRequest): Promise<ConnectorResponse> {
    try {
      if (!this.httpClient) {
        throw new Error('Intercom client not initialized');
      }

      const params: any = {};

      if (options?.limit) {
        params.per_page = Math.min(options.limit, 150);
      }

      if (options?.cursor) {
        params.starting_after = options.cursor;
      }

      // Add filtering options
      if (options?.filters) {
        Object.assign(params, options.filters);
      }

      const response = await this.httpClient.get('/conversations', { params });

      return {
        success: true,
        data: {
          conversations: response.data.conversations || [],
          pages: response.data.pages,
          total_count: response.data.total_count
        },
      };
    } catch (error) {
      this.logger.error('Failed to get Intercom conversations:', error);
      return {
        success: false,
        error: {
          code: error.response?.data?.errors?.[0]?.code || 'OPERATION_FAILED',
          message: error.response?.data?.errors?.[0]?.message || error.message
        }
      };
    }
  }

  async addComment(ticketId: string, comment: any): Promise<ConnectorResponse> {
    try {
      if (!this.httpClient) {
        throw new Error('Intercom client not initialized');
      }

      if (!ticketId || !comment) {
        throw new Error('Conversation ID and message are required');
      }

      const messageData = {
        message_type: comment.message_type || 'comment',
        type: 'admin',
        body: comment.body || comment,
        admin_id: comment.admin_id
      };

      const response = await this.httpClient.post(`/conversations/${ticketId}/reply`, messageData);

      return {
        success: true,
        data: response.data,
      };
    } catch (error) {
      this.logger.error('Failed to add reply to Intercom conversation:', error);
      return {
        success: false,
        error: {
          code: error.response?.data?.errors?.[0]?.code || 'OPERATION_FAILED',
          message: error.response?.data?.errors?.[0]?.message || error.message
        }
      };
    }
  }

  async getKnowledgeBase(query?: string): Promise<ConnectorResponse> {
    try {
      if (!this.httpClient) {
        throw new Error('Intercom client not initialized');
      }

      let endpoint = '/articles';
      const params: any = {};

      if (query) {
        endpoint = '/articles/search';
        params.phrase = query;
      }

      const response = await this.httpClient.get(endpoint, { params });

      return {
        success: true,
        data: {
          articles: response.data.articles || response.data.data || [],
          total_count: response.data.total_count,
          pages: response.data.pages
        }
      };
    } catch (error) {
      this.logger.error('Failed to get Intercom knowledge base:', error);
      return {
        success: false,
        error: {
          code: error.response?.data?.errors?.[0]?.code || 'OPERATION_FAILED',
          message: error.response?.data?.errors?.[0]?.message || error.message
        }
      };
    }
  }

  async createUser(userData: any): Promise<ConnectorResponse> {
    try {
      if (!this.httpClient) {
        throw new Error('Intercom client not initialized');
      }

      const {
        user_id,
        email,
        name,
        phone,
        custom_attributes = {},
        signed_up_at,
        last_seen_at
      } = userData;

      if (!user_id && !email) {
        throw new Error('Either user_id or email is required');
      }

      const userPayload: any = {
        custom_attributes
      };

      if (user_id) userPayload.user_id = user_id;
      if (email) userPayload.email = email;
      if (name) userPayload.name = name;
      if (phone) userPayload.phone = phone;
      if (signed_up_at) userPayload.signed_up_at = signed_up_at;
      if (last_seen_at) userPayload.last_seen_at = last_seen_at;

      const response = await this.httpClient.post('/users', userPayload);

      return {
        success: true,
        data: response.data,
      };
    } catch (error) {
      this.logger.error('Failed to create Intercom user:', error);
      return {
        success: false,
        error: {
          code: error.response?.data?.errors?.[0]?.code || 'OPERATION_FAILED',
          message: error.response?.data?.errors?.[0]?.message || error.message
        }
      };
    }
  }

  async searchConversations(query: string, options?: any): Promise<ConnectorResponse> {
    try {
      if (!this.httpClient) {
        throw new Error('Intercom client not initialized');
      }

      const searchData = {
        query: {
          operator: 'AND',
          value: [
            {
              field: 'conversation_message.body',
              operator: '~',
              value: query
            }
          ]
        }
      };

      if (options?.sort) {
        searchData['sort'] = options.sort;
      }

      if (options?.pagination) {
        searchData['pagination'] = options.pagination;
      }

      const response = await this.httpClient.post('/conversations/search', searchData);

      return {
        success: true,
        data: {
          conversations: response.data.conversations || [],
          total_count: response.data.total_count,
          pages: response.data.pages
        },
      };
    } catch (error) {
      this.logger.error('Failed to search Intercom conversations:', error);
      return {
        success: false,
        error: {
          code: error.response?.data?.errors?.[0]?.code || 'OPERATION_FAILED',
          message: error.response?.data?.errors?.[0]?.message || error.message
        }
      };
    }
  }

  async executeAction(actionId: string, input: any): Promise<ConnectorResponse> {
    switch (actionId) {
      case 'create_conversation':
        return this.createConversation(input);
      case 'reply_to_conversation':
        return this.addComment(input.conversation_id, input);
      case 'get_conversations':
        return this.getConversations(input);
      case 'create_user':
        return this.createUser(input);
      case 'search_conversations':
        return this.searchConversations(input.query, input);
      case 'create_ticket':
        return this.createTicket(input);
      case 'update_ticket':
        return this.updateTicket(input.conversation_id || input.ticket_id, input);
      case 'get_tickets':
        return this.getTickets(input);
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

  isInitialized(): boolean {
    return !!(this.httpClient?.defaults?.baseURL && this.accessToken);
  }
}