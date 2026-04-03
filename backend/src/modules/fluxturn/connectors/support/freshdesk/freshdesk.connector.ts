import { Request } from 'express';
import { Injectable, Logger } from '@nestjs/common';
import axios, { AxiosInstance } from 'axios';
import { BaseConnector } from '../../base/base.connector';
import { ISupportConnector } from '../../base/connector.interface';
import {
  ConnectorConfig,
  ConnectorResponse,
  ConnectorMetadata,
  ConnectorType,
  ConnectorCategory,
  AuthType,
  PaginatedRequest,
  ConnectorRequest
} from '../../types';
import { AuthUtils } from '../../utils/auth.utils';
import { ApiUtils } from '../../utils/api.utils';

@Injectable()
export class FreshdeskConnector extends BaseConnector implements ISupportConnector {
  private httpClient: AxiosInstance;
  private domain: string;
  private apiKey: string;

  constructor(
    private readonly authUtils: AuthUtils,
    private readonly apiUtils: ApiUtils
  ) {
    super();
  }

  getMetadata(): ConnectorMetadata {
    return {
      name: 'Freshdesk',
      description: 'Freshdesk support connector for managing tickets and customer support',
      version: '1.0.0',
      category: ConnectorCategory.SUPPORT,
      type: ConnectorType.FRESHDESK,
      authType: AuthType.API_KEY,
      actions: [
        {
          id: 'create_ticket',
          name: 'Create Ticket',
          description: 'Create a new support ticket',
          inputSchema: {
            type: 'object',
            properties: {
              subject: { type: 'string' },
              description: { type: 'string' },
              priority: { type: 'number', enum: [1, 2, 3, 4] },
              status: { type: 'number', enum: [2, 3, 4, 5, 6, 7] },
              type: { type: 'string' },
              email: { type: 'string', format: 'email' },
              name: { type: 'string' },
              phone: { type: 'string' },
              tags: { type: 'array', items: { type: 'string' } },
              custom_fields: { type: 'object' },
              requester_id: { type: 'number' },
              responder_id: { type: 'number' },
              group_id: { type: 'number' }
            },
            required: ['subject', 'description', 'priority', 'status']
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
          id: 'update_ticket',
          name: 'Update Ticket',
          description: 'Update an existing ticket',
          inputSchema: {
            type: 'object',
            properties: {
              ticket_id: { type: 'string' },
              priority: { type: 'number', enum: [1, 2, 3, 4] },
              status: { type: 'number', enum: [2, 3, 4, 5, 6, 7] },
              tags: { type: 'array', items: { type: 'string' } },
              custom_fields: { type: 'object' },
              responder_id: { type: 'number' },
              group_id: { type: 'number' }
            },
            required: ['ticket_id']
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
          id: 'get_tickets',
          name: 'Get Tickets',
          description: 'Retrieve tickets with filtering options',
          inputSchema: {
            type: 'object',
            properties: {
              page: { type: 'number', minimum: 1 },
              per_page: { type: 'number', minimum: 1, maximum: 100 },
              order_by: { type: 'string' },
              order_type: { type: 'string', enum: ['asc', 'desc'] },
              include: { type: 'string' },
              updated_since: { type: 'string', format: 'date-time' }
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
          id: 'search_tickets',
          name: 'Search Tickets',
          description: 'Search tickets using query string',
          inputSchema: {
            type: 'object',
            properties: {
              query: { type: 'string' },
              page: { type: 'number', minimum: 1 }
            },
            required: ['query']
          },
          outputSchema: {
            type: 'object',
            properties: {
              success: { type: 'boolean' },
              data: { type: 'object' }
            }
          }
        }
      ],
      triggers: [
        {
          id: 'ticket_created',
          eventType: 'webhook',
          outputSchema: {
            type: 'object',
            properties: {
              id: { type: 'number' },
              subject: { type: 'string' },
              description: { type: 'string' },
              status: { type: 'string' },
              priority: { type: 'number' },
              created_at: { type: 'string' }
            }
          },
          name: 'Ticket Created',
          description: 'Triggered when a new ticket is created'
        },
        {
          id: 'ticket_updated',
          eventType: 'webhook',
          outputSchema: {
            type: 'object',
            properties: {
              id: { type: 'number' },
              subject: { type: 'string' },
              status: { type: 'string' },
              updated_at: { type: 'string' }
            }
          },
          name: 'Ticket Updated',
          description: 'Triggered when a ticket is updated'
        },
        {
          id: 'ticket_resolved',
          eventType: 'webhook',
          outputSchema: {
            type: 'object',
            properties: {
              id: { type: 'number' },
              subject: { type: 'string' },
              status: { type: 'string' },
              resolved_at: { type: 'string' }
            }
          },
          name: 'Ticket Resolved',
          description: 'Triggered when a ticket is resolved'
        }
      ],
      logoUrl: 'https://www.freshdesk.com/favicon.ico',
      documentationUrl: 'https://developers.freshdesk.com/api/',
      rateLimit: {
        requestsPerSecond: 1,
        requestsPerMinute: 200,
        requestsPerDay: 10000
      },
      webhookSupport: true
    };
  }

  protected async initializeConnection(): Promise<void> {
    const config = this.config;
    
    if (!config.credentials) {
      throw new Error('Freshdesk credentials are required');
    }

    const { domain, api_key } = config.credentials;

    if (!domain || !api_key) {
      throw new Error('Missing required Freshdesk credentials (domain, api_key)');
    }

    this.domain = domain;
    this.apiKey = api_key;

    this.httpClient = axios.create({
      baseURL: `https://${domain}.freshdesk.com/api/v2`,
      auth: {
        username: api_key,
        password: 'X'
      },
      headers: {
        'Content-Type': 'application/json'
      }
    });

    this.logger.log('Freshdesk connector initialized successfully');
  }

  protected async performConnectionTest(): Promise<boolean> {
    try {
      if (!this.httpClient) {
        return false;
      }

      // Test connection by getting account info
      await this.httpClient.get('/agents/me');
      return true;
    } catch (error) {
      this.logger.error('Freshdesk connection test failed:', error);
      return false;
    }
  }

  protected async performHealthCheck(): Promise<void> {
    if (!this.httpClient) {
      throw new Error('Freshdesk client not initialized');
    }

    try {
      await this.httpClient.get('/agents/me');
    } catch (error) {
      throw new Error(`Freshdesk health check failed: ${error.message}`);
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
    this.logger.log('Freshdesk connector cleanup completed');
  }


  async createTicket(ticket: any): Promise<ConnectorResponse> {
    try {
      if (!this.httpClient) {
        throw new Error('Freshdesk client not initialized');
      }

      const {
        subject,
        description,
        priority = 1,
        status = 2,
        type,
        email,
        name,
        phone,
        tags = [],
        custom_fields = {},
        requester_id,
        responder_id,
        group_id
      } = ticket;

      if (!subject || !description) {
        throw new Error('Subject and description are required');
      }

      const ticketData: any = {
        subject: subject,
        description: description,
        priority: priority,
        status: status,
        tags: tags,
        custom_fields: custom_fields
      };

      if (type) ticketData.type = type;
      if (requester_id) ticketData.requester_id = requester_id;
      if (responder_id) ticketData.responder_id = responder_id;
      if (group_id) ticketData.group_id = group_id;

      // Handle requester information
      if (!requester_id) {
        if (email) {
          ticketData.email = email;
          if (name) ticketData.name = name;
          if (phone) ticketData.phone = phone;
        } else {
          throw new Error('Either requester_id or email is required');
        }
      }

      const response = await this.httpClient.post('/tickets', ticketData);

      return {
        success: true,
        data: response.data,
      };
    } catch (error) {
      this.logger.error('Failed to create Freshdesk ticket:', error);
      return {
        success: false,
        error: error.response?.data?.description || error.message,
      };
    }
  }

  async updateTicket(ticketId: string, updates: any): Promise<ConnectorResponse> {
    try {
      if (!this.httpClient) {
        throw new Error('Freshdesk client not initialized');
      }

      if (!ticketId) {
        throw new Error('Ticket ID is required');
      }

      const updateData: any = {};

      // Map allowed update fields
      const allowedFields = ['priority', 'status', 'tags', 'custom_fields', 'responder_id', 'group_id'];
      for (const field of allowedFields) {
        if (updates[field] !== undefined) {
          updateData[field] = updates[field];
        }
      }

      if (Object.keys(updateData).length === 0) {
        throw new Error('At least one field must be provided for update');
      }

      const response = await this.httpClient.put(`/tickets/${ticketId}`, updateData);

      return {
        success: true,
        data: response.data,
      };
    } catch (error) {
      this.logger.error('Failed to update Freshdesk ticket:', error);
      return {
        success: false,
        error: error.response?.data?.description || error.message,
      };
    }
  }

  async getTickets(options?: PaginatedRequest): Promise<ConnectorResponse> {
    try {
      if (!this.httpClient) {
        throw new Error('Freshdesk client not initialized');
      }

      const params: any = {};

      if (options?.limit) {
        params.per_page = Math.min(options.limit, 100);
      }

      if (options?.offset) {
        params.page = Math.floor(options.offset / (options.limit || 30)) + 1;
      }

      // Add additional query parameters from filters
      if (options?.filters) {
        Object.assign(params, options.filters);
      }

      // Also add any other filter parameters passed at root level
      if (options) {
        const { limit, offset, filters, ...rootFilters } = options as any;
        Object.assign(params, rootFilters);
      }

      const response = await this.httpClient.get('/tickets', { params });

      // Check for pagination info in headers
      const linkHeader = response.headers.link;
      let hasMore = false;
      if (linkHeader && linkHeader.includes('rel="next"')) {
        hasMore = true;
      }

      return {
        success: true,
        data: {
          tickets: response.data || [],
          has_more: hasMore,
          page: params.page || 1,
          per_page: params.per_page || 30
        },
      };
    } catch (error) {
      this.logger.error('Failed to get Freshdesk tickets:', error);
      return {
        success: false,
        error: error.response?.data?.description || error.message,
      };
    }
  }

  async addComment(ticketId: string, comment: any): Promise<ConnectorResponse> {
    try {
      if (!this.httpClient) {
        throw new Error('Freshdesk client not initialized');
      }

      if (!ticketId || !comment) {
        throw new Error('Ticket ID and comment are required');
      }

      const conversationData = {
        body: comment.body || comment,
        private: comment.private || false,
        user_id: comment.user_id,
        incoming: comment.incoming || false
      };

      const response = await this.httpClient.post(`/tickets/${ticketId}/conversations`, conversationData);

      return {
        success: true,
        data: response.data,
      };
    } catch (error) {
      this.logger.error('Failed to add comment to Freshdesk ticket:', error);
      return {
        success: false,
        error: error.response?.data?.description || error.message,
      };
    }
  }

  async getKnowledgeBase(query?: string): Promise<ConnectorResponse> {
    try {
      if (!this.httpClient) {
        throw new Error('Freshdesk client not initialized');
      }

      let endpoint = '/solutions/articles';
      const params: any = {};

      if (query) {
        endpoint = '/search/solutions';
        params.term = query;
      }

      const response = await this.httpClient.get(endpoint, { params });

      return {
        success: true,
        data: {
          articles: response.data || [],
          total: response.headers['x-total-count'] || response.data.length
        }
      };
    } catch (error) {
      this.logger.error('Failed to get Freshdesk knowledge base:', error);
      return {
        success: false,
        error: error.response?.data?.description || error.message,
      };
    }
  }

  async searchTickets(query: string, options?: any): Promise<ConnectorResponse> {
    try {
      if (!this.httpClient) {
        throw new Error('Freshdesk client not initialized');
      }

      if (!query) {
        throw new Error('Search query is required');
      }

      const params: any = {
        query: query
      };

      if (options?.page) {
        params.page = options.page;
      }

      const response = await this.httpClient.get('/search/tickets', { params });

      return {
        success: true,
        data: {
          results: response.data.results || [],
          total: response.data.total || 0
        },
      };
    } catch (error) {
      this.logger.error('Failed to search Freshdesk tickets:', error);
      return {
        success: false,
        error: error.response?.data?.description || error.message,
      };
    }
  }

  async getAgents(options?: PaginatedRequest): Promise<ConnectorResponse> {
    try {
      if (!this.httpClient) {
        throw new Error('Freshdesk client not initialized');
      }

      const params: any = {};

      if (options?.limit) {
        params.per_page = Math.min(options.limit, 100);
      }

      if (options?.offset) {
        params.page = Math.floor(options.offset / (options.limit || 30)) + 1;
      }

      const response = await this.httpClient.get('/agents', { params });

      return {
        success: true,
        data: {
          agents: response.data || [],
          total: response.headers['x-total-count']
        },
      };
    } catch (error) {
      this.logger.error('Failed to get Freshdesk agents:', error);
      return {
        success: false,
        error: error.response?.data?.description || error.message,
      };
    }
  }

  async getGroups(): Promise<ConnectorResponse> {
    try {
      if (!this.httpClient) {
        throw new Error('Freshdesk client not initialized');
      }

      const response = await this.httpClient.get('/groups');

      return {
        success: true,
        data: {
          groups: response.data || []
        },
      };
    } catch (error) {
      this.logger.error('Failed to get Freshdesk groups:', error);
      return {
        success: false,
        error: error.response?.data?.description || error.message,
      };
    }
  }

  isInitialized(): boolean {
    return !!(this.httpClient?.defaults?.baseURL && this.domain && this.apiKey);
  }

  async executeAction(actionId: string, input: any): Promise<ConnectorResponse> {
    switch (actionId) {
      case 'create_ticket':
        return this.createTicket(input);
      case 'update_ticket':
        return this.updateTicket(input.ticket_id, input);
      case 'get_tickets':
        return this.getTickets(input);
      case 'search_tickets':
        return this.searchTickets(input.query, input);
      case 'add_comment':
        return this.addComment(input.ticket_id, input.comment);
      case 'get_knowledge_base':
        return this.getKnowledgeBase(input.query);
      case 'get_agents':
        return this.getAgents(input);
      case 'get_groups':
        return this.getGroups();
      case 'delete_ticket':
        return this.deleteTicket(input.ticket_id);
      case 'create_contact':
        return this.createContact(input);
      case 'get_contact':
        return this.getContact(input.contact_id);
      case 'update_contact':
        return this.updateContact(input.contact_id, input);
      case 'delete_contact':
        return this.deleteContact(input.contact_id);
      case 'list_contacts':
        return this.listContacts(input);
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

  async deleteTicket(ticketId: string): Promise<ConnectorResponse> {
    try {
      if (!this.httpClient) {
        throw new Error('Freshdesk client not initialized');
      }

      if (!ticketId) {
        throw new Error('Ticket ID is required');
      }

      await this.httpClient.delete(`/tickets/${ticketId}`);

      return {
        success: true,
        data: {
          deleted: true,
          ticket_id: ticketId
        },
      };
    } catch (error) {
      this.logger.error('Failed to delete Freshdesk ticket:', error);
      return {
        success: false,
        error: error.response?.data?.description || error.message,
      };
    }
  }

  async createContact(contact: any): Promise<ConnectorResponse> {
    try {
      if (!this.httpClient) {
        throw new Error('Freshdesk client not initialized');
      }

      const { name, email, phone, mobile, twitter_id, company_id, custom_fields } = contact;

      if (!name) {
        throw new Error('Name is required');
      }

      if (!email && !phone) {
        throw new Error('Either email or phone is required');
      }

      const contactData: any = { name };

      if (email) contactData.email = email;
      if (phone) contactData.phone = phone;
      if (mobile) contactData.mobile = mobile;
      if (twitter_id) contactData.twitter_id = twitter_id;
      if (company_id) contactData.company_id = company_id;
      if (custom_fields) contactData.custom_fields = custom_fields;

      const response = await this.httpClient.post('/contacts', contactData);

      return {
        success: true,
        data: response.data,
      };
    } catch (error) {
      this.logger.error('Failed to create Freshdesk contact:', error);
      return {
        success: false,
        error: error.response?.data?.description || error.message,
      };
    }
  }

  async getContact(contactId: string): Promise<ConnectorResponse> {
    try {
      if (!this.httpClient) {
        throw new Error('Freshdesk client not initialized');
      }

      if (!contactId) {
        throw new Error('Contact ID is required');
      }

      const response = await this.httpClient.get(`/contacts/${contactId}`);

      return {
        success: true,
        data: response.data,
      };
    } catch (error) {
      this.logger.error('Failed to get Freshdesk contact:', error);
      return {
        success: false,
        error: error.response?.data?.description || error.message,
      };
    }
  }

  async updateContact(contactId: string, updates: any): Promise<ConnectorResponse> {
    try {
      if (!this.httpClient) {
        throw new Error('Freshdesk client not initialized');
      }

      if (!contactId) {
        throw new Error('Contact ID is required');
      }

      const updateData: any = {};

      const allowedFields = ['name', 'email', 'phone', 'mobile', 'twitter_id', 'company_id', 'custom_fields'];
      for (const field of allowedFields) {
        if (updates[field] !== undefined) {
          updateData[field] = updates[field];
        }
      }

      if (Object.keys(updateData).length === 0) {
        throw new Error('At least one field must be provided for update');
      }

      const response = await this.httpClient.put(`/contacts/${contactId}`, updateData);

      return {
        success: true,
        data: response.data,
      };
    } catch (error) {
      this.logger.error('Failed to update Freshdesk contact:', error);
      return {
        success: false,
        error: error.response?.data?.description || error.message,
      };
    }
  }

  async deleteContact(contactId: string): Promise<ConnectorResponse> {
    try {
      if (!this.httpClient) {
        throw new Error('Freshdesk client not initialized');
      }

      if (!contactId) {
        throw new Error('Contact ID is required');
      }

      await this.httpClient.delete(`/contacts/${contactId}`);

      return {
        success: true,
        data: {
          deleted: true,
          contact_id: contactId
        },
      };
    } catch (error) {
      this.logger.error('Failed to delete Freshdesk contact:', error);
      return {
        success: false,
        error: error.response?.data?.description || error.message,
      };
    }
  }

  async listContacts(options?: any): Promise<ConnectorResponse> {
    try {
      if (!this.httpClient) {
        throw new Error('Freshdesk client not initialized');
      }

      const params: any = {};

      if (options?.page) params.page = options.page;
      if (options?.per_page) params.per_page = Math.min(options.per_page, 100);
      if (options?.email) params.email = options.email;
      if (options?.phone) params.phone = options.phone;
      if (options?.company_id) params.company_id = options.company_id;

      const response = await this.httpClient.get('/contacts', { params });

      const linkHeader = response.headers.link;
      let hasMore = false;
      if (linkHeader && linkHeader.includes('rel="next"')) {
        hasMore = true;
      }

      return {
        success: true,
        data: {
          contacts: response.data || [],
          has_more: hasMore,
          page: params.page || 1
        },
      };
    } catch (error) {
      this.logger.error('Failed to list Freshdesk contacts:', error);
      return {
        success: false,
        error: error.response?.data?.description || error.message,
      };
    }
  }
}