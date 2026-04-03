import { Request } from 'express';
import { Injectable, Logger } from '@nestjs/common';
import axios, { AxiosInstance } from 'axios';
import { BaseConnector } from '../../base/base.connector';
import { ISupportConnector } from '../../base/connector.interface';
import {
  ConnectorConfig,
  ConnectorResponse,
  ConnectorRequest,
  ConnectorMetadata,
  PaginatedRequest,
  ConnectorType,
  AuthType,
  ConnectorCategory,
} from '../../types';
import { AuthUtils } from '../../utils/auth.utils';
import { ApiUtils } from '../../utils/api.utils';

@Injectable()
export class ZendeskConnector extends BaseConnector implements ISupportConnector {
  private httpClient: AxiosInstance;
  private subdomain: string;
  private apiToken: string;
  private email: string;

  constructor(
    private readonly authUtils: AuthUtils,
    private readonly apiUtils: ApiUtils
  ) {
    super();
  }

  getMetadata(): ConnectorMetadata {
    return {
      name: 'Zendesk',
      description: 'Zendesk support connector for managing tickets, users, organizations, and ticket fields',
      version: '1.0.0',
      category: ConnectorCategory.SUPPORT,
      type: ConnectorType.ZENDESK,
      authType: AuthType.BASIC_AUTH,
      actions: [
        // Ticket Actions
        { id: 'ticket_create', name: 'Create Ticket', description: 'Create a new support ticket', inputSchema: {}, outputSchema: {} },
        { id: 'ticket_update', name: 'Update Ticket', description: 'Update an existing ticket', inputSchema: {}, outputSchema: {} },
        { id: 'ticket_get', name: 'Get Ticket', description: 'Get a ticket by ID', inputSchema: {}, outputSchema: {} },
        { id: 'ticket_get_all', name: 'Get Many Tickets', description: 'Get many tickets', inputSchema: {}, outputSchema: {} },
        { id: 'ticket_delete', name: 'Delete Ticket', description: 'Delete a ticket', inputSchema: {}, outputSchema: {} },
        { id: 'ticket_recover', name: 'Recover Ticket', description: 'Recover a suspended ticket', inputSchema: {}, outputSchema: {} },

        // User Actions
        { id: 'user_create', name: 'Create User', description: 'Create a new user', inputSchema: {}, outputSchema: {} },
        { id: 'user_update', name: 'Update User', description: 'Update a user', inputSchema: {}, outputSchema: {} },
        { id: 'user_get', name: 'Get User', description: 'Get a user by ID', inputSchema: {}, outputSchema: {} },
        { id: 'user_get_all', name: 'Get Many Users', description: 'Get many users', inputSchema: {}, outputSchema: {} },
        { id: 'user_search', name: 'Search Users', description: 'Search users', inputSchema: {}, outputSchema: {} },
        { id: 'user_delete', name: 'Delete User', description: 'Delete a user', inputSchema: {}, outputSchema: {} },
        { id: 'user_get_organizations', name: 'Get User Organizations', description: 'Get organizations for a user', inputSchema: {}, outputSchema: {} },
        { id: 'user_get_related_data', name: 'Get User Related Data', description: 'Get data related to a user', inputSchema: {}, outputSchema: {} },

        // Organization Actions
        { id: 'organization_create', name: 'Create Organization', description: 'Create a new organization', inputSchema: {}, outputSchema: {} },
        { id: 'organization_update', name: 'Update Organization', description: 'Update an organization', inputSchema: {}, outputSchema: {} },
        { id: 'organization_get', name: 'Get Organization', description: 'Get an organization by ID', inputSchema: {}, outputSchema: {} },
        { id: 'organization_get_all', name: 'Get Many Organizations', description: 'Get many organizations', inputSchema: {}, outputSchema: {} },
        { id: 'organization_delete', name: 'Delete Organization', description: 'Delete an organization', inputSchema: {}, outputSchema: {} },
        { id: 'organization_count', name: 'Count Organizations', description: 'Get count of organizations', inputSchema: {}, outputSchema: {} },
        { id: 'organization_get_related_data', name: 'Get Organization Related Data', description: 'Get data related to an organization', inputSchema: {}, outputSchema: {} },

        // Ticket Field Actions
        { id: 'ticket_field_get', name: 'Get Ticket Field', description: 'Get a ticket field by ID', inputSchema: {}, outputSchema: {} },
        { id: 'ticket_field_get_all', name: 'Get Many Ticket Fields', description: 'Get many ticket fields', inputSchema: {}, outputSchema: {} },

        // Additional Actions
        { id: 'add_comment', name: 'Add Comment', description: 'Add a comment to an existing ticket', inputSchema: {}, outputSchema: {} },
        { id: 'search_tickets', name: 'Search Tickets', description: 'Search tickets using Zendesk query syntax', inputSchema: {}, outputSchema: {} },
        { id: 'get_knowledge_base', name: 'Get Knowledge Base Articles', description: 'Get or search knowledge base articles', inputSchema: {}, outputSchema: {} }
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
              priority: { type: 'string' },
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
              priority: { type: 'string' },
              updated_at: { type: 'string' }
            }
          },
          name: 'Ticket Updated',
          description: 'Triggered when a ticket is updated'
        },
        {
          id: 'ticket_solved',
          eventType: 'webhook',
          outputSchema: {
            type: 'object',
            properties: {
              id: { type: 'number' },
              subject: { type: 'string' },
              status: { type: 'string' },
              solved_at: { type: 'string' }
            }
          },
          name: 'Ticket Solved',
          description: 'Triggered when a ticket status changes to solved'
        },
        {
          id: 'user_created',
          eventType: 'webhook',
          outputSchema: {
            type: 'object',
            properties: {
              id: { type: 'number' },
              name: { type: 'string' },
              email: { type: 'string' },
              role: { type: 'string' },
              created_at: { type: 'string' }
            }
          },
          name: 'User Created',
          description: 'Triggered when a new user is created'
        },
        {
          id: 'organization_created',
          eventType: 'webhook',
          outputSchema: {
            type: 'object',
            properties: {
              id: { type: 'number' },
              name: { type: 'string' },
              created_at: { type: 'string' }
            }
          },
          name: 'Organization Created',
          description: 'Triggered when a new organization is created'
        }
      ],
      logoUrl: 'https://d1eipm3vz40hy0.cloudfront.net/assets/favicon-0ea4875e4515090bf7d83833dfca1134.ico',
      documentationUrl: 'https://developer.zendesk.com/api-reference/',
      rateLimit: {
        requestsPerSecond: 10,
        requestsPerMinute: 200,
        requestsPerDay: 10000
      },
      webhookSupport: true
    };
  }

  protected async initializeConnection(): Promise<void> {
    try {
      if (!this.config.credentials) {
        throw new Error('Zendesk credentials are required');
      }

      const { subdomain, email, api_token } = this.config.credentials;

      if (!subdomain || !email || !api_token) {
        throw new Error('Missing required Zendesk credentials (subdomain, email, api_token)');
      }

      this.subdomain = subdomain;
      this.email = email;
      this.apiToken = api_token;

      // Zendesk API authentication format: email/token as username, apiToken as password
      this.httpClient = axios.create({
        baseURL: `https://${subdomain}.zendesk.com/api/v2`,
        auth: {
          username: `${email}/token`,
          password: api_token
        },
        headers: {
          'Content-Type': 'application/json'
        }
      });

      this.logger.log('Zendesk connector initialized successfully');
    } catch (error) {
      this.logger.error('Failed to initialize Zendesk connector:', error);
      throw error;
    }
  }

  protected async performConnectionTest(): Promise<boolean> {
    try {
      if (!this.httpClient) {
        throw new Error('Zendesk client not initialized');
      }

      await this.httpClient.get('/account/settings.json');
      return true;
    } catch (error) {
      this.logger.error('Zendesk connection test failed:', error);
      return false;
    }
  }

  protected async performHealthCheck(): Promise<void> {
    try {
      if (!this.httpClient) {
        throw new Error('Zendesk client not initialized');
      }
      await this.httpClient.get('/account/settings.json');
    } catch (error) {
      throw new Error(`Zendesk health check failed: ${error.message}`);
    }
  }

  protected async performRequest(request: ConnectorRequest): Promise<any> {
    try {
      if (!this.httpClient) {
        throw new Error('Zendesk client not initialized');
      }

      const config = {
        method: request.method,
        url: request.endpoint,
        headers: request.headers,
        data: request.body,
        params: request.queryParams
      };

      const response = await this.httpClient.request(config);
      return response.data;
    } catch (error) {
      this.logger.error('Zendesk request failed:', error);
      throw error;
    }
  }

  protected async performAction(actionId: string, input: any): Promise<any> {
    return this.executeAction(actionId, input);
  }

  protected async cleanup(): Promise<void> {
    this.logger.log('Zendesk connector cleanup completed');
  }

  // ==================== TICKET OPERATIONS ====================

  async createTicket(ticket: any): Promise<ConnectorResponse> {
    try {
      if (!this.httpClient) {
        throw new Error('Zendesk client not initialized');
      }

      const {
        description,
        subject,
        priority,
        type,
        status,
        group_id,
        external_id,
        tags = [],
        custom_fields = []
      } = ticket;

      if (!description) {
        throw new Error('Description is required');
      }

      const ticketData = {
        ticket: {
          comment: { body: description },
          subject,
          priority,
          type,
          status,
          group_id,
          external_id,
          tags,
          custom_fields
        }
      };

      const response = await this.httpClient.post('/tickets.json', ticketData);

      return {
        success: true,
        data: response.data.ticket,
      };
    } catch (error) {
      this.logger.error('Failed to create Zendesk ticket:', error);
      return {
        success: false,
        error: {
          code: error.response?.data?.error_code || 'OPERATION_FAILED',
          message: error.response?.data?.error || error.message
        }
      };
    }
  }

  async updateTicket(ticketId: string, updates: any): Promise<ConnectorResponse> {
    try {
      if (!this.httpClient) {
        throw new Error('Zendesk client not initialized');
      }

      if (!ticketId) {
        throw new Error('Ticket ID is required');
      }

      const updateData: any = { ticket: {} };

      // Map update fields
      const allowedFields = ['subject', 'status', 'priority', 'type', 'assignee_email', 'group_id', 'tags', 'custom_fields', 'external_id'];
      for (const field of allowedFields) {
        if (updates[field] !== undefined) {
          updateData.ticket[field] = updates[field];
        }
      }

      // Handle comments
      if (updates.public_reply) {
        updateData.ticket.comment = {
          body: updates.public_reply,
          public: true
        };
      } else if (updates.internal_note) {
        updateData.ticket.comment = {
          html_body: updates.internal_note,
          public: false
        };
      }

      const response = await this.httpClient.put(`/tickets/${ticketId}.json`, updateData);

      return {
        success: true,
        data: response.data.ticket,
      };
    } catch (error) {
      this.logger.error('Failed to update Zendesk ticket:', error);
      return {
        success: false,
        error: {
          code: error.response?.data?.error_code || 'OPERATION_FAILED',
          message: error.response?.data?.error || error.message
        }
      };
    }
  }

  async getTicket(ticketId: string, ticketType: string = 'regular'): Promise<ConnectorResponse> {
    try {
      if (!this.httpClient) {
        throw new Error('Zendesk client not initialized');
      }

      const endpoint = ticketType === 'regular'
        ? `/tickets/${ticketId}.json`
        : `/suspended_tickets/${ticketId}.json`;

      const response = await this.httpClient.get(endpoint);
      const data = ticketType === 'regular' ? response.data.ticket : response.data.suspended_ticket;

      return {
        success: true,
        data,
      };
    } catch (error) {
      this.logger.error('Failed to get Zendesk ticket:', error);
      return {
        success: false,
        error: {
          code: error.response?.data?.error_code || 'OPERATION_FAILED',
          message: error.response?.data?.error || error.message
        }
      };
    }
  }

  async getTickets(options?: any): Promise<ConnectorResponse> {
    try {
      if (!this.httpClient) {
        throw new Error('Zendesk client not initialized');
      }

      const {
        return_all = false,
        limit = 100,
        ticket_type = 'regular',
        query,
        status,
        group_id,
        sort_by,
        sort_order
      } = options || {};

      const params: any = {};

      if (ticket_type === 'regular') {
        // Use search API for regular tickets with filters
        params.query = 'type:ticket';
        if (query) params.query += ` ${query}`;
        if (status) params.query += ` status:${status}`;
        if (group_id) params.query += ` group:${group_id}`;
        if (sort_by) params.sort_by = sort_by;
        if (sort_order) params.sort_order = sort_order;

        if (!return_all) {
          params.per_page = limit;
        }

        const endpoint = '/search.json';
        const response = await this.httpClient.get(endpoint, { params });

        return {
          success: true,
          data: {
            tickets: response.data.results || [],
            count: response.data.count || 0,
            next_page: response.data.next_page,
            previous_page: response.data.previous_page
          },
        };
      } else {
        // Suspended tickets
        if (!return_all) {
          params.per_page = limit;
        }

        const response = await this.httpClient.get('/suspended_tickets.json', { params });

        return {
          success: true,
          data: {
            tickets: response.data.suspended_tickets || [],
            count: response.data.count || 0
          },
        };
      }
    } catch (error) {
      this.logger.error('Failed to get Zendesk tickets:', error);
      return {
        success: false,
        error: {
          code: error.response?.data?.error_code || 'OPERATION_FAILED',
          message: error.response?.data?.error || error.message
        }
      };
    }
  }

  async deleteTicket(ticketId: string, ticketType: string = 'regular'): Promise<ConnectorResponse> {
    try {
      if (!this.httpClient) {
        throw new Error('Zendesk client not initialized');
      }

      const endpoint = ticketType === 'regular'
        ? `/tickets/${ticketId}.json`
        : `/suspended_tickets/${ticketId}.json`;

      await this.httpClient.delete(endpoint);

      return {
        success: true,
        data: { success: true },
      };
    } catch (error) {
      this.logger.error('Failed to delete Zendesk ticket:', error);
      return {
        success: false,
        error: {
          code: error.response?.data?.error_code || 'OPERATION_FAILED',
          message: error.response?.data?.error || error.message
        }
      };
    }
  }

  async recoverTicket(ticketId: string): Promise<ConnectorResponse> {
    try {
      if (!this.httpClient) {
        throw new Error('Zendesk client not initialized');
      }

      const response = await this.httpClient.put(`/suspended_tickets/${ticketId}/recover.json`, {});

      return {
        success: true,
        data: response.data.ticket,
      };
    } catch (error) {
      this.logger.error('Failed to recover Zendesk ticket:', error);
      return {
        success: false,
        error: {
          code: error.response?.data?.error_code || 'OPERATION_FAILED',
          message: error.response?.data?.error || error.message
        }
      };
    }
  }

  // ==================== USER OPERATIONS ====================

  async createUser(user: any): Promise<ConnectorResponse> {
    try {
      if (!this.httpClient) {
        throw new Error('Zendesk client not initialized');
      }

      const { name, email, role, organization_id, phone, details, notes, tags, external_id, verified, user_fields } = user;

      if (!name) {
        throw new Error('Name is required');
      }

      const userData: any = { user: { name } };

      if (email) userData.user.email = email;
      if (role) userData.user.role = role;
      if (organization_id) userData.user.organization_id = organization_id;
      if (phone) userData.user.phone = phone;
      if (details) userData.user.details = details;
      if (notes) userData.user.notes = notes;
      if (tags) userData.user.tags = tags;
      if (external_id) userData.user.external_id = external_id;
      if (verified !== undefined) userData.user.verified = verified;
      if (user_fields) userData.user.user_fields = user_fields;

      const response = await this.httpClient.post('/users.json', userData);

      return {
        success: true,
        data: response.data.user,
      };
    } catch (error) {
      this.logger.error('Failed to create Zendesk user:', error);
      return {
        success: false,
        error: {
          code: error.response?.data?.error_code || 'OPERATION_FAILED',
          message: error.response?.data?.error || error.message
        }
      };
    }
  }

  async updateUser(userId: string, updates: any): Promise<ConnectorResponse> {
    try {
      if (!this.httpClient) {
        throw new Error('Zendesk client not initialized');
      }

      if (!userId) {
        throw new Error('User ID is required');
      }

      const updateData: any = { user: {} };
      const allowedFields = ['name', 'email', 'role', 'organization_id', 'phone', 'details', 'notes', 'tags', 'verified', 'user_fields'];

      for (const field of allowedFields) {
        if (updates[field] !== undefined) {
          updateData.user[field] = updates[field];
        }
      }

      const response = await this.httpClient.put(`/users/${userId}.json`, updateData);

      return {
        success: true,
        data: response.data.user,
      };
    } catch (error) {
      this.logger.error('Failed to update Zendesk user:', error);
      return {
        success: false,
        error: {
          code: error.response?.data?.error_code || 'OPERATION_FAILED',
          message: error.response?.data?.error || error.message
        }
      };
    }
  }

  async getUser(userId: string): Promise<ConnectorResponse> {
    try {
      if (!this.httpClient) {
        throw new Error('Zendesk client not initialized');
      }

      const response = await this.httpClient.get(`/users/${userId}.json`);

      return {
        success: true,
        data: response.data.user,
      };
    } catch (error) {
      this.logger.error('Failed to get Zendesk user:', error);
      return {
        success: false,
        error: {
          code: error.response?.data?.error_code || 'OPERATION_FAILED',
          message: error.response?.data?.error || error.message
        }
      };
    }
  }

  async getUsers(options?: any): Promise<ConnectorResponse> {
    try {
      if (!this.httpClient) {
        throw new Error('Zendesk client not initialized');
      }

      const { return_all = false, limit = 100, role } = options || {};
      const params: any = {};

      if (!return_all) {
        params.per_page = limit;
      }

      if (role && role.length > 0) {
        params.role = role;
      }

      const response = await this.httpClient.get('/users.json', { params });

      return {
        success: true,
        data: {
          users: response.data.users || [],
          count: response.data.count || 0,
          next_page: response.data.next_page,
          previous_page: response.data.previous_page
        },
      };
    } catch (error) {
      this.logger.error('Failed to get Zendesk users:', error);
      return {
        success: false,
        error: {
          code: error.response?.data?.error_code || 'OPERATION_FAILED',
          message: error.response?.data?.error || error.message
        }
      };
    }
  }

  async searchUsers(options: any): Promise<ConnectorResponse> {
    try {
      if (!this.httpClient) {
        throw new Error('Zendesk client not initialized');
      }

      const { return_all = false, limit = 100, query, external_id } = options;
      const params: any = {};

      if (query) params.query = query;
      if (external_id) params.external_id = external_id;
      if (!return_all) params.per_page = limit;

      const response = await this.httpClient.get('/users/search.json', { params });

      return {
        success: true,
        data: {
          users: response.data.users || [],
          count: response.data.count || 0
        },
      };
    } catch (error) {
      this.logger.error('Failed to search Zendesk users:', error);
      return {
        success: false,
        error: {
          code: error.response?.data?.error_code || 'OPERATION_FAILED',
          message: error.response?.data?.error || error.message
        }
      };
    }
  }

  async deleteUser(userId: string): Promise<ConnectorResponse> {
    try {
      if (!this.httpClient) {
        throw new Error('Zendesk client not initialized');
      }

      const response = await this.httpClient.delete(`/users/${userId}.json`);

      return {
        success: true,
        data: response.data.user,
      };
    } catch (error) {
      this.logger.error('Failed to delete Zendesk user:', error);
      return {
        success: false,
        error: {
          code: error.response?.data?.error_code || 'OPERATION_FAILED',
          message: error.response?.data?.error || error.message
        }
      };
    }
  }

  async getUserOrganizations(userId: string): Promise<ConnectorResponse> {
    try {
      if (!this.httpClient) {
        throw new Error('Zendesk client not initialized');
      }

      const response = await this.httpClient.get(`/users/${userId}/organizations.json`);

      return {
        success: true,
        data: {
          organizations: response.data.organizations || []
        },
      };
    } catch (error) {
      this.logger.error('Failed to get user organizations:', error);
      return {
        success: false,
        error: {
          code: error.response?.data?.error_code || 'OPERATION_FAILED',
          message: error.response?.data?.error || error.message
        }
      };
    }
  }

  async getUserRelatedData(userId: string): Promise<ConnectorResponse> {
    try {
      if (!this.httpClient) {
        throw new Error('Zendesk client not initialized');
      }

      const response = await this.httpClient.get(`/users/${userId}/related.json`);

      return {
        success: true,
        data: response.data.user_related,
      };
    } catch (error) {
      this.logger.error('Failed to get user related data:', error);
      return {
        success: false,
        error: {
          code: error.response?.data?.error_code || 'OPERATION_FAILED',
          message: error.response?.data?.error || error.message
        }
      };
    }
  }

  // ==================== ORGANIZATION OPERATIONS ====================

  async createOrganization(organization: any): Promise<ConnectorResponse> {
    try {
      if (!this.httpClient) {
        throw new Error('Zendesk client not initialized');
      }

      const { name, details, notes, domain_names, tags, organization_fields } = organization;

      if (!name) {
        throw new Error('Name is required');
      }

      const orgData: any = { organization: { name } };

      if (details) orgData.organization.details = details;
      if (notes) orgData.organization.notes = notes;
      if (domain_names) orgData.organization.domain_names = domain_names.split(',').map((d: string) => d.trim());
      if (tags) orgData.organization.tags = tags;
      if (organization_fields) orgData.organization.organization_fields = organization_fields;

      const response = await this.httpClient.post('/organizations.json', orgData);

      return {
        success: true,
        data: response.data.organization,
      };
    } catch (error) {
      this.logger.error('Failed to create Zendesk organization:', error);
      return {
        success: false,
        error: {
          code: error.response?.data?.error_code || 'OPERATION_FAILED',
          message: error.response?.data?.error || error.message
        }
      };
    }
  }

  async updateOrganization(organizationId: string, updates: any): Promise<ConnectorResponse> {
    try {
      if (!this.httpClient) {
        throw new Error('Zendesk client not initialized');
      }

      if (!organizationId) {
        throw new Error('Organization ID is required');
      }

      const updateData: any = { organization: {} };
      const allowedFields = ['name', 'details', 'notes', 'tags', 'organization_fields'];

      for (const field of allowedFields) {
        if (updates[field] !== undefined) {
          updateData.organization[field] = updates[field];
        }
      }

      if (updates.domain_names) {
        updateData.organization.domain_names = updates.domain_names.split(',').map((d: string) => d.trim());
      }

      const response = await this.httpClient.put(`/organizations/${organizationId}.json`, updateData);

      return {
        success: true,
        data: response.data.organization,
      };
    } catch (error) {
      this.logger.error('Failed to update Zendesk organization:', error);
      return {
        success: false,
        error: {
          code: error.response?.data?.error_code || 'OPERATION_FAILED',
          message: error.response?.data?.error || error.message
        }
      };
    }
  }

  async getOrganization(organizationId: string): Promise<ConnectorResponse> {
    try {
      if (!this.httpClient) {
        throw new Error('Zendesk client not initialized');
      }

      const response = await this.httpClient.get(`/organizations/${organizationId}.json`);

      return {
        success: true,
        data: response.data.organization,
      };
    } catch (error) {
      this.logger.error('Failed to get Zendesk organization:', error);
      return {
        success: false,
        error: {
          code: error.response?.data?.error_code || 'OPERATION_FAILED',
          message: error.response?.data?.error || error.message
        }
      };
    }
  }

  async getOrganizations(options?: any): Promise<ConnectorResponse> {
    try {
      if (!this.httpClient) {
        throw new Error('Zendesk client not initialized');
      }

      const { return_all = false, limit = 100 } = options || {};
      const params: any = {};

      if (!return_all) {
        params.per_page = limit;
      }

      const response = await this.httpClient.get('/organizations.json', { params });

      return {
        success: true,
        data: {
          organizations: response.data.organizations || [],
          count: response.data.count || 0,
          next_page: response.data.next_page,
          previous_page: response.data.previous_page
        },
      };
    } catch (error) {
      this.logger.error('Failed to get Zendesk organizations:', error);
      return {
        success: false,
        error: {
          code: error.response?.data?.error_code || 'OPERATION_FAILED',
          message: error.response?.data?.error || error.message
        }
      };
    }
  }

  async deleteOrganization(organizationId: string): Promise<ConnectorResponse> {
    try {
      if (!this.httpClient) {
        throw new Error('Zendesk client not initialized');
      }

      await this.httpClient.delete(`/organizations/${organizationId}.json`);

      return {
        success: true,
        data: { success: true },
      };
    } catch (error) {
      this.logger.error('Failed to delete Zendesk organization:', error);
      return {
        success: false,
        error: {
          code: error.response?.data?.error_code || 'OPERATION_FAILED',
          message: error.response?.data?.error || error.message
        }
      };
    }
  }

  async countOrganizations(): Promise<ConnectorResponse> {
    try {
      if (!this.httpClient) {
        throw new Error('Zendesk client not initialized');
      }

      const response = await this.httpClient.get('/organizations/count.json');

      return {
        success: true,
        data: { count: response.data.count.value },
      };
    } catch (error) {
      this.logger.error('Failed to count Zendesk organizations:', error);
      return {
        success: false,
        error: {
          code: error.response?.data?.error_code || 'OPERATION_FAILED',
          message: error.response?.data?.error || error.message
        }
      };
    }
  }

  async getOrganizationRelatedData(organizationId: string): Promise<ConnectorResponse> {
    try {
      if (!this.httpClient) {
        throw new Error('Zendesk client not initialized');
      }

      const response = await this.httpClient.get(`/organizations/${organizationId}/related.json`);

      return {
        success: true,
        data: response.data.organization_related,
      };
    } catch (error) {
      this.logger.error('Failed to get organization related data:', error);
      return {
        success: false,
        error: {
          code: error.response?.data?.error_code || 'OPERATION_FAILED',
          message: error.response?.data?.error || error.message
        }
      };
    }
  }

  // ==================== TICKET FIELD OPERATIONS ====================

  async getTicketField(ticketFieldId: string): Promise<ConnectorResponse> {
    try {
      if (!this.httpClient) {
        throw new Error('Zendesk client not initialized');
      }

      const response = await this.httpClient.get(`/ticket_fields/${ticketFieldId}.json`);

      return {
        success: true,
        data: response.data.ticket_field,
      };
    } catch (error) {
      this.logger.error('Failed to get Zendesk ticket field:', error);
      return {
        success: false,
        error: {
          code: error.response?.data?.error_code || 'OPERATION_FAILED',
          message: error.response?.data?.error || error.message
        }
      };
    }
  }

  async getTicketFields(options?: any): Promise<ConnectorResponse> {
    try {
      if (!this.httpClient) {
        throw new Error('Zendesk client not initialized');
      }

      const { return_all = false, limit = 100 } = options || {};
      const params: any = {};

      if (!return_all) {
        params.limit = limit;
      }

      const response = await this.httpClient.get('/ticket_fields.json', { params });
      let ticketFields = response.data.ticket_fields || [];

      if (!return_all && ticketFields.length > limit) {
        ticketFields = ticketFields.slice(0, limit);
      }

      return {
        success: true,
        data: {
          ticket_fields: ticketFields,
          count: ticketFields.length
        },
      };
    } catch (error) {
      this.logger.error('Failed to get Zendesk ticket fields:', error);
      return {
        success: false,
        error: {
          code: error.response?.data?.error_code || 'OPERATION_FAILED',
          message: error.response?.data?.error || error.message
        }
      };
    }
  }

  // ==================== LEGACY SUPPORT METHODS ====================

  async addComment(ticketId: string, comment: any): Promise<ConnectorResponse> {
    try {
      if (!this.httpClient) {
        throw new Error('Zendesk client not initialized');
      }

      if (!ticketId || !comment) {
        throw new Error('Ticket ID and comment are required');
      }

      const commentData = {
        ticket: {
          comment: {
            body: comment.body || comment,
            public: comment.public !== false,
            author_id: comment.author_id
          }
        }
      };

      const response = await this.httpClient.put(`/tickets/${ticketId}.json`, commentData);

      return {
        success: true,
        data: response.data.ticket,
      };
    } catch (error) {
      this.logger.error('Failed to add comment to Zendesk ticket:', error);
      return {
        success: false,
        error: {
          code: error.response?.data?.error_code || 'OPERATION_FAILED',
          message: error.response?.data?.error || error.message
        }
      };
    }
  }

  async getKnowledgeBase(query?: string): Promise<ConnectorResponse> {
    try {
      if (!this.httpClient) {
        throw new Error('Zendesk client not initialized');
      }

      let endpoint = '/help_center/articles.json';
      const params: any = {};

      if (query) {
        endpoint = '/help_center/articles/search.json';
        params.query = query;
      }

      const response = await this.httpClient.get(endpoint, { params });

      return {
        success: true,
        data: {
          articles: response.data.articles || response.data.results || [],
          count: response.data.count || 0,
          next_page: response.data.next_page,
          previous_page: response.data.previous_page
        }
      };
    } catch (error) {
      this.logger.error('Failed to get Zendesk knowledge base:', error);
      return {
        success: false,
        error: {
          code: error.response?.data?.error_code || 'OPERATION_FAILED',
          message: error.response?.data?.error || error.message
        }
      };
    }
  }

  async searchTickets(query: string, options?: any): Promise<ConnectorResponse> {
    try {
      if (!this.httpClient) {
        throw new Error('Zendesk client not initialized');
      }

      if (!query) {
        throw new Error('Search query is required');
      }

      const params: any = { query };

      if (options?.sort_by) params.sort_by = options.sort_by;
      if (options?.sort_order) params.sort_order = options.sort_order;

      const response = await this.httpClient.get('/search.json', { params });

      return {
        success: true,
        data: {
          results: response.data.results || [],
          count: response.data.count || 0,
          next_page: response.data.next_page,
          previous_page: response.data.previous_page
        },
      };
    } catch (error) {
      this.logger.error('Failed to search Zendesk tickets:', error);
      return {
        success: false,
        error: {
          code: error.response?.data?.error_code || 'OPERATION_FAILED',
          message: error.response?.data?.error || error.message
        }
      };
    }
  }

  // ==================== ACTION DISPATCHER ====================

  async executeAction(actionId: string, input: any): Promise<ConnectorResponse> {
    switch (actionId) {
      // Ticket actions
      case 'ticket_create':
      case 'create_ticket':
        return this.createTicket(input);
      case 'ticket_update':
      case 'update_ticket':
        return this.updateTicket(input.id, input);
      case 'ticket_get':
        return this.getTicket(input.id, input.ticket_type);
      case 'ticket_get_all':
      case 'get_tickets':
        return this.getTickets(input);
      case 'ticket_delete':
        return this.deleteTicket(input.id, input.ticket_type);
      case 'ticket_recover':
        return this.recoverTicket(input.id);

      // User actions
      case 'user_create':
        return this.createUser(input);
      case 'user_update':
        return this.updateUser(input.id, input);
      case 'user_get':
        return this.getUser(input.id);
      case 'user_get_all':
        return this.getUsers(input);
      case 'user_search':
        return this.searchUsers(input);
      case 'user_delete':
        return this.deleteUser(input.id);
      case 'user_get_organizations':
        return this.getUserOrganizations(input.id);
      case 'user_get_related_data':
        return this.getUserRelatedData(input.id);

      // Organization actions
      case 'organization_create':
        return this.createOrganization(input);
      case 'organization_update':
        return this.updateOrganization(input.id, input);
      case 'organization_get':
        return this.getOrganization(input.id);
      case 'organization_get_all':
        return this.getOrganizations(input);
      case 'organization_delete':
        return this.deleteOrganization(input.id);
      case 'organization_count':
        return this.countOrganizations();
      case 'organization_get_related_data':
        return this.getOrganizationRelatedData(input.id);

      // Ticket field actions
      case 'ticket_field_get':
        return this.getTicketField(input.ticket_field_id);
      case 'ticket_field_get_all':
        return this.getTicketFields(input);

      // Legacy actions
      case 'search_tickets':
        return this.searchTickets(input.query, input);
      case 'add_comment':
        return this.addComment(input.ticket_id, input.comment);
      case 'get_knowledge_base':
        return this.getKnowledgeBase(input.query);

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
    return !!(this.httpClient?.defaults?.baseURL && this.subdomain && this.apiToken && this.email);
  }
}
