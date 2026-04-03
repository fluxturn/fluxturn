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
export class PagerDutyConnector extends BaseConnector implements ISupportConnector {
  private httpClient: AxiosInstance;
  private apiToken: string;
  private authentication: string; // 'apiToken' or 'oAuth2'

  constructor(
    private readonly authUtils: AuthUtils,
    private readonly apiUtils: ApiUtils
  ) {
    super();
  }

  getMetadata(): ConnectorMetadata {
    return {
      name: 'PagerDuty',
      description: 'Incident management platform for IT operations - manage incidents, incident notes, log entries, and users',
      version: '1.0.0',
      category: ConnectorCategory.SUPPORT,
      type: ConnectorType.PAGERDUTY,
      authType: AuthType.API_KEY,
      actions: [
        // Incident Actions
        { id: 'incident_create', name: 'Create Incident', description: 'Create a new incident', inputSchema: {}, outputSchema: {} },
        { id: 'incident_get', name: 'Get Incident', description: 'Get an incident by ID', inputSchema: {}, outputSchema: {} },
        { id: 'incident_get_all', name: 'Get Many Incidents', description: 'Get many incidents', inputSchema: {}, outputSchema: {} },
        { id: 'incident_update', name: 'Update Incident', description: 'Update an existing incident', inputSchema: {}, outputSchema: {} },

        // Incident Note Actions
        { id: 'incident_note_create', name: 'Create Incident Note', description: 'Create a note on an incident', inputSchema: {}, outputSchema: {} },
        { id: 'incident_note_get_all', name: 'Get Many Incident Notes', description: 'Get notes for an incident', inputSchema: {}, outputSchema: {} },

        // Log Entry Actions
        { id: 'log_entry_get', name: 'Get Log Entry', description: 'Get a log entry by ID', inputSchema: {}, outputSchema: {} },
        { id: 'log_entry_get_all', name: 'Get Many Log Entries', description: 'Get many log entries', inputSchema: {}, outputSchema: {} },

        // User Actions
        { id: 'user_get', name: 'Get User', description: 'Get a user by ID', inputSchema: {}, outputSchema: {} },
      ],
      triggers: [
        {
          id: 'incident_triggered',
          eventType: 'webhook',
          outputSchema: {
            type: 'object',
            properties: {
              id: { type: 'string' },
              title: { type: 'string' },
              status: { type: 'string' },
              urgency: { type: 'string' },
              created_at: { type: 'string' }
            }
          },
          name: 'Incident Triggered',
          description: 'Triggered when a new incident is created'
        },
        {
          id: 'incident_acknowledged',
          eventType: 'webhook',
          outputSchema: {
            type: 'object',
            properties: {
              id: { type: 'string' },
              title: { type: 'string' },
              status: { type: 'string' },
              acknowledged_at: { type: 'string' }
            }
          },
          name: 'Incident Acknowledged',
          description: 'Triggered when an incident is acknowledged'
        },
        {
          id: 'incident_resolved',
          eventType: 'webhook',
          outputSchema: {
            type: 'object',
            properties: {
              id: { type: 'string' },
              title: { type: 'string' },
              status: { type: 'string' },
              resolved_at: { type: 'string' }
            }
          },
          name: 'Incident Resolved',
          description: 'Triggered when an incident is resolved'
        }
      ],
      logoUrl: 'https://www.pagerduty.com/wp-content/uploads/2020/03/pagerduty-logo.png',
      documentationUrl: 'https://developer.pagerduty.com/api-reference/',
      rateLimit: {
        requestsPerSecond: 10,
        requestsPerMinute: 960
      },
      webhookSupport: true
    };
  }

  protected async initializeConnection(): Promise<void> {
    try {
      if (!this.config.credentials) {
        throw new Error('PagerDuty credentials are required');
      }

      // Support both API Token and OAuth2 authentication
      // Definition uses 'authType' with values 'api_token' or 'oauth2'
      this.authentication = this.config.credentials.authType || 'api_token';

      if (this.authentication === 'api_token') {
        const { apiToken } = this.config.credentials;
        if (!apiToken) {
          throw new Error('Missing required PagerDuty API token');
        }
        this.apiToken = apiToken;

        this.httpClient = axios.create({
          baseURL: 'https://api.pagerduty.com',
          headers: {
            'Accept': 'application/vnd.pagerduty+json;version=2',
            'Content-Type': 'application/json',
            'Authorization': `Token token=${apiToken}`
          }
        });
      } else {
        // OAuth2 authentication
        const { accessToken } = this.config.credentials;
        if (!accessToken) {
          throw new Error('Missing required OAuth2 access token');
        }

        this.httpClient = axios.create({
          baseURL: 'https://api.pagerduty.com',
          headers: {
            'Accept': 'application/vnd.pagerduty+json;version=2',
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${accessToken}`
          }
        });
      }

      this.logger.log('PagerDuty connector initialized successfully');
    } catch (error) {
      this.logger.error('Failed to initialize PagerDuty connector:', error);
      throw error;
    }
  }

  protected async performConnectionTest(): Promise<boolean> {
    try {
      if (!this.httpClient) {
        throw new Error('PagerDuty client not initialized');
      }

      // Test connection by fetching abilities (lightweight endpoint)
      await this.httpClient.get('/abilities');
      return true;
    } catch (error) {
      this.logger.error('PagerDuty connection test failed:', error);
      return false;
    }
  }

  protected async performHealthCheck(): Promise<void> {
    try {
      if (!this.httpClient) {
        throw new Error('PagerDuty client not initialized');
      }
      await this.httpClient.get('/abilities');
    } catch (error) {
      throw new Error(`PagerDuty health check failed: ${error.message}`);
    }
  }

  protected async performRequest(request: ConnectorRequest): Promise<any> {
    try {
      if (!this.httpClient) {
        throw new Error('PagerDuty client not initialized');
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
      this.logger.error('PagerDuty request failed:', error);
      throw error;
    }
  }

  protected async performAction(actionId: string, input: any): Promise<any> {
    return this.executeAction(actionId, input);
  }

  protected async cleanup(): Promise<void> {
    this.logger.log('PagerDuty connector cleanup completed');
  }

  // Helper method to convert keys to snake_case
  private keysToSnakeCase(obj: any): any {
    if (Array.isArray(obj)) {
      return obj.map(item => this.keysToSnakeCase(item));
    }

    if (obj !== null && typeof obj === 'object') {
      return Object.keys(obj).reduce((result, key) => {
        const snakeKey = key.replace(/([A-Z])/g, '_$1').toLowerCase();
        result[snakeKey] = this.keysToSnakeCase(obj[key]);
        return result;
      }, {} as any);
    }

    return obj;
  }

  // Helper method for pagination
  private async pagerDutyApiRequestAllItems(
    propertyName: string,
    method: string,
    endpoint: string,
    body: any = {},
    query: any = {}
  ): Promise<any[]> {
    const returnData: any[] = [];
    let responseData;
    query.limit = 100;
    query.offset = 0;

    do {
      responseData = await this.performRequest({
        method: method as any,
        endpoint,
        body,
        queryParams: query
      });
      query.offset++;
      returnData.push(...(responseData[propertyName] || []));
    } while (responseData.more);

    return returnData;
  }

  // ==================== INCIDENT OPERATIONS ====================

  async createTicket(incident: any): Promise<ConnectorResponse> {
    try {
      if (!this.httpClient) {
        throw new Error('PagerDuty client not initialized');
      }

      const {
        title,
        serviceId,
        email,
        details,
        priorityId,
        escalationPolicyId,
        urgency,
        incidentKey,
        conferenceBridge
      } = incident;

      if (!title || !serviceId || !email) {
        throw new Error('Title, Service ID, and Email are required');
      }

      const body: any = {
        type: 'incident',
        title,
        service: {
          id: serviceId,
          type: 'service_reference'
        }
      };

      if (details) {
        body.body = {
          type: 'incident_body',
          details
        };
      }

      if (priorityId) {
        body.priority = {
          id: priorityId,
          type: 'priority_reference'
        };
      }

      if (escalationPolicyId) {
        body.escalation_policy = {
          id: escalationPolicyId,
          type: 'escalation_policy_reference'
        };
      }

      if (urgency) {
        body.urgency = urgency;
      }

      if (incidentKey) {
        body.incident_key = incidentKey;
      }

      if (conferenceBridge) {
        body.conference_bridge = {
          conference_number: conferenceBridge.conferenceNumber,
          conference_url: conferenceBridge.conferenceUrl
        };
      }

      const response = await this.httpClient.post(
        '/incidents',
        { incident: body },
        { headers: { From: email } }
      );

      return {
        success: true,
        data: response.data.incident
      };
    } catch (error) {
      this.logger.error('Failed to create PagerDuty incident:', error);
      return {
        success: false,
        error: {
          code: error.response?.data?.error?.code || 'OPERATION_FAILED',
          message: error.response?.data?.error?.message || error.message
        }
      };
    }
  }

  async getTicket(incidentId: string): Promise<ConnectorResponse> {
    try {
      if (!this.httpClient) {
        throw new Error('PagerDuty client not initialized');
      }

      const response = await this.httpClient.get(`/incidents/${incidentId}`);

      return {
        success: true,
        data: response.data.incident
      };
    } catch (error) {
      this.logger.error('Failed to get PagerDuty incident:', error);
      return {
        success: false,
        error: {
          code: error.response?.data?.error?.code || 'OPERATION_FAILED',
          message: error.response?.data?.error?.message || error.message
        }
      };
    }
  }

  async getTickets(options?: any): Promise<ConnectorResponse> {
    try {
      if (!this.httpClient) {
        throw new Error('PagerDuty client not initialized');
      }

      const {
        return_all = false,
        limit = 100,
        userIds,
        teamIds,
        include,
        sortBy,
        statuses,
        urgencies,
        timeZone,
        since,
        until,
        dateRange,
        incidentKey,
        serviceIds
      } = options || {};

      const qs: any = {};

      if (userIds) {
        qs.user_ids = userIds.split(',');
      }
      if (teamIds) {
        qs.team_ids = teamIds.split(',');
      }
      if (include) {
        qs.include = include.map((e: string) => e.replace(/([A-Z])/g, '_$1').toLowerCase());
      }
      if (sortBy) {
        qs.sort_by = sortBy;
      }
      if (statuses && statuses.length > 0) {
        qs.statuses = statuses;
      }
      if (urgencies && urgencies.length > 0) {
        qs.urgencies = urgencies;
      }
      if (timeZone) {
        qs.time_zone = timeZone;
      }
      if (since) {
        qs.since = since;
      }
      if (until) {
        qs.until = until;
      }
      if (dateRange) {
        qs.date_range = dateRange;
      }
      if (incidentKey) {
        qs.incident_key = incidentKey;
      }
      if (serviceIds && serviceIds.length > 0) {
        qs.service_ids = serviceIds;
      }

      let responseData;
      if (return_all) {
        responseData = await this.pagerDutyApiRequestAllItems(
          'incidents',
          'GET',
          '/incidents',
          {},
          qs
        );
      } else {
        qs.limit = limit;
        const response = await this.performRequest({
          method: 'GET',
          endpoint: '/incidents',
          queryParams: qs
        });
        responseData = response.incidents;
      }

      return {
        success: true,
        data: {
          incidents: responseData,
          count: Array.isArray(responseData) ? responseData.length : 0
        }
      };
    } catch (error) {
      this.logger.error('Failed to get PagerDuty incidents:', error);
      return {
        success: false,
        error: {
          code: error.response?.data?.error?.code || 'OPERATION_FAILED',
          message: error.response?.data?.error?.message || error.message
        }
      };
    }
  }

  async updateTicket(incidentId: string, updates: any): Promise<ConnectorResponse> {
    try {
      if (!this.httpClient) {
        throw new Error('PagerDuty client not initialized');
      }

      if (!incidentId) {
        throw new Error('Incident ID is required');
      }

      const { email, conferenceBridge, ...updateFields } = updates;

      if (!email) {
        throw new Error('Email is required for updating incidents');
      }

      const body: any = {
        type: 'incident'
      };

      if (updateFields.title) {
        body.title = updateFields.title;
      }
      if (updateFields.escalationLevel !== undefined) {
        body.escalation_level = updateFields.escalationLevel;
      }
      if (updateFields.details) {
        body.body = {
          type: 'incident_body',
          details: updateFields.details
        };
      }
      if (updateFields.priorityId) {
        body.priority = {
          id: updateFields.priorityId,
          type: 'priority_reference'
        };
      }
      if (updateFields.escalationPolicyId) {
        body.escalation_policy = {
          id: updateFields.escalationPolicyId,
          type: 'escalation_policy_reference'
        };
      }
      if (updateFields.urgency) {
        body.urgency = updateFields.urgency;
      }
      if (updateFields.resolution) {
        body.resolution = updateFields.resolution;
      }
      if (updateFields.status) {
        body.status = updateFields.status;
      }
      if (conferenceBridge) {
        body.conference_bridge = {
          conference_number: conferenceBridge.conferenceNumber,
          conference_url: conferenceBridge.conferenceUrl
        };
      }

      const response = await this.httpClient.put(
        `/incidents/${incidentId}`,
        { incident: body },
        { headers: { From: email } }
      );

      return {
        success: true,
        data: response.data.incident
      };
    } catch (error) {
      this.logger.error('Failed to update PagerDuty incident:', error);
      return {
        success: false,
        error: {
          code: error.response?.data?.error?.code || 'OPERATION_FAILED',
          message: error.response?.data?.error?.message || error.message
        }
      };
    }
  }

  // ==================== INCIDENT NOTE OPERATIONS ====================

  async addComment(incidentId: string, comment: any): Promise<ConnectorResponse> {
    try {
      if (!this.httpClient) {
        throw new Error('PagerDuty client not initialized');
      }

      const { content, email } = comment;

      if (!incidentId || !content || !email) {
        throw new Error('Incident ID, content, and email are required');
      }

      const body = { content };

      const response = await this.httpClient.post(
        `/incidents/${incidentId}/notes`,
        { note: body },
        { headers: { From: email } }
      );

      return {
        success: true,
        data: response.data.note
      };
    } catch (error) {
      this.logger.error('Failed to create PagerDuty incident note:', error);
      return {
        success: false,
        error: {
          code: error.response?.data?.error?.code || 'OPERATION_FAILED',
          message: error.response?.data?.error?.message || error.message
        }
      };
    }
  }

  async getIncidentNotes(incidentId: string, options?: any): Promise<ConnectorResponse> {
    try {
      if (!this.httpClient) {
        throw new Error('PagerDuty client not initialized');
      }

      const { return_all = false, limit = 100 } = options || {};

      let responseData;
      const qs: any = {};

      if (return_all) {
        responseData = await this.pagerDutyApiRequestAllItems(
          'notes',
          'GET',
          `/incidents/${incidentId}/notes`,
          {},
          qs
        );
      } else {
        qs.limit = limit;
        const response = await this.performRequest({
          method: 'GET',
          endpoint: `/incidents/${incidentId}/notes`,
          queryParams: qs
        });
        responseData = response.notes;
      }

      return {
        success: true,
        data: {
          notes: responseData,
          count: Array.isArray(responseData) ? responseData.length : 0
        }
      };
    } catch (error) {
      this.logger.error('Failed to get PagerDuty incident notes:', error);
      return {
        success: false,
        error: {
          code: error.response?.data?.error?.code || 'OPERATION_FAILED',
          message: error.response?.data?.error?.message || error.message
        }
      };
    }
  }

  // ==================== LOG ENTRY OPERATIONS ====================

  async getLogEntry(logEntryId: string): Promise<ConnectorResponse> {
    try {
      if (!this.httpClient) {
        throw new Error('PagerDuty client not initialized');
      }

      const response = await this.httpClient.get(`/log_entries/${logEntryId}`);

      return {
        success: true,
        data: response.data.log_entry
      };
    } catch (error) {
      this.logger.error('Failed to get PagerDuty log entry:', error);
      return {
        success: false,
        error: {
          code: error.response?.data?.error?.code || 'OPERATION_FAILED',
          message: error.response?.data?.error?.message || error.message
        }
      };
    }
  }

  async getLogEntries(options?: any): Promise<ConnectorResponse> {
    try {
      if (!this.httpClient) {
        throw new Error('PagerDuty client not initialized');
      }

      const {
        return_all = false,
        limit = 100,
        include,
        isOverview,
        since,
        until,
        timeZone
      } = options || {};

      const qs: any = {};

      if (include) {
        qs.include = include;
      }
      if (isOverview !== undefined) {
        qs.is_overview = isOverview;
      }
      if (since) {
        qs.since = since;
      }
      if (until) {
        qs.until = until;
      }
      if (timeZone) {
        qs.time_zone = timeZone;
      }

      let responseData;
      if (return_all) {
        responseData = await this.pagerDutyApiRequestAllItems(
          'log_entries',
          'GET',
          '/log_entries',
          {},
          qs
        );
      } else {
        qs.limit = limit;
        const response = await this.performRequest({
          method: 'GET',
          endpoint: '/log_entries',
          queryParams: qs
        });
        responseData = response.log_entries;
      }

      return {
        success: true,
        data: {
          log_entries: responseData,
          count: Array.isArray(responseData) ? responseData.length : 0
        }
      };
    } catch (error) {
      this.logger.error('Failed to get PagerDuty log entries:', error);
      return {
        success: false,
        error: {
          code: error.response?.data?.error?.code || 'OPERATION_FAILED',
          message: error.response?.data?.error?.message || error.message
        }
      };
    }
  }

  // ==================== USER OPERATIONS ====================

  async getUser(userId: string): Promise<ConnectorResponse> {
    try {
      if (!this.httpClient) {
        throw new Error('PagerDuty client not initialized');
      }

      const response = await this.httpClient.get(`/users/${userId}`);

      return {
        success: true,
        data: response.data.user
      };
    } catch (error) {
      this.logger.error('Failed to get PagerDuty user:', error);
      return {
        success: false,
        error: {
          code: error.response?.data?.error?.code || 'OPERATION_FAILED',
          message: error.response?.data?.error?.message || error.message
        }
      };
    }
  }

  // ==================== LEGACY SUPPORT METHODS (ISupportConnector) ====================

  async getKnowledgeBase(query?: string): Promise<ConnectorResponse> {
    // PagerDuty doesn't have a knowledge base feature
    return {
      success: false,
      error: {
        code: 'NOT_SUPPORTED',
        message: 'Knowledge base is not supported by PagerDuty'
      }
    };
  }

  async searchTickets(query: string, options?: any): Promise<ConnectorResponse> {
    // Use getTickets with query parameter
    return this.getTickets({ ...options, incidentKey: query });
  }

  // ==================== ACTION DISPATCHER ====================

  async executeAction(actionId: string, input: any): Promise<ConnectorResponse> {
    switch (actionId) {
      // Incident actions
      case 'incident_create':
      case 'create_ticket':
        return this.createTicket(input);
      case 'incident_get':
        return this.getTicket(input.incidentId || input.id);
      case 'incident_get_all':
      case 'get_tickets':
        return this.getTickets(input);
      case 'incident_update':
      case 'update_ticket':
        return this.updateTicket(input.incidentId || input.id, input);

      // Incident note actions
      case 'incident_note_create':
      case 'add_comment':
        return this.addComment(input.incidentId || input.id, input);
      case 'incident_note_get_all':
        return this.getIncidentNotes(input.incidentId || input.id, input);

      // Log entry actions
      case 'log_entry_get':
        return this.getLogEntry(input.logEntryId || input.id);
      case 'log_entry_get_all':
        return this.getLogEntries(input);

      // User actions
      case 'user_get':
        return this.getUser(input.userId || input.id);

      // Legacy actions
      case 'search_tickets':
        return this.searchTickets(input.query, input);
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
    return !!(this.httpClient?.defaults?.baseURL);
  }
}
