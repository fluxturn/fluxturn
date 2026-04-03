import { Injectable, Logger } from '@nestjs/common';
import axios, { AxiosInstance } from 'axios';
import { BaseConnector } from '../../base/base.connector';
import { IConnector } from '../../base/connector.interface';
import {
  ConnectorMetadata,
  ConnectorType,
  ConnectorCategory,
  AuthType,
  ConnectorRequest,
  ConnectorResponse,
} from '../../types/index';

@Injectable()
export class CalendlyConnector extends BaseConnector implements IConnector {
  private client: AxiosInstance;
  private currentUserUri: string;

  getMetadata(): ConnectorMetadata {
    return {
      name: 'Calendly',
      description: 'Calendly scheduling platform connector',
      version: '1.0.0',
      category: ConnectorCategory.COMMUNICATION,
      type: ConnectorType.CALENDLY,
      logoUrl: 'https://cdn.jsdelivr.net/npm/simple-icons@v9/icons/calendly.svg',
      authType: AuthType.OAUTH2,
      actions: [],
      triggers: [],
      rateLimit: {
        requestsPerSecond: 5,
      },
      webhookSupport: true,
    };
  }

  protected async initializeConnection(): Promise<void> {
    const { accessToken, personalToken, authType } = this.config.credentials;
    const token = authType === 'personalToken' ? personalToken : accessToken;

    if (!token) {
      throw new Error('Calendly access token is required');
    }

    this.client = axios.create({
      baseURL: 'https://api.calendly.com',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    });

    // Get current user URI for subsequent requests
    const userResponse = await this.client.get('/users/me');
    this.currentUserUri = userResponse.data.resource.uri;

    this.logger.log('Calendly connector initialized');
  }

  protected async performConnectionTest(): Promise<boolean> {
    try {
      const response = await this.client.get('/users/me');
      return response.status === 200;
    } catch (error) {
      throw new Error(`Calendly connection test failed: ${error.message}`);
    }
  }

  protected async performHealthCheck(): Promise<void> {
    await this.client.get('/users/me');
  }

  protected async performRequest(request: ConnectorRequest): Promise<any> {
    const response = await this.client.request({
      method: request.method,
      url: request.endpoint,
      data: request.body,
      params: request.queryParams,
    });
    return response.data;
  }

  protected async performAction(actionId: string, input: any): Promise<any> {
    switch (actionId) {
      // User actions
      case 'get_current_user':
        return this.getCurrentUser();
      case 'get_user':
        return this.getUser(input.userUri);

      // Event Type actions
      case 'get_event_types':
        return this.getEventTypes(input);
      case 'get_event_type':
        return this.getEventType(input.eventTypeUri);

      // Scheduled Event actions
      case 'get_scheduled_events':
        return this.getScheduledEvents(input);
      case 'get_scheduled_event':
        return this.getScheduledEvent(input.eventUri);
      case 'cancel_scheduled_event':
        return this.cancelScheduledEvent(input.eventUri, input.reason);

      // Invitee actions
      case 'get_invitees':
        return this.getInvitees(input.eventUri, input);
      case 'get_invitee':
        return this.getInvitee(input.inviteeUri);

      // Webhook actions
      case 'create_webhook':
        return this.createWebhook(input);
      case 'get_webhooks':
        return this.getWebhooks(input);
      case 'delete_webhook':
        return this.deleteWebhook(input.webhookUri);

      // Organization actions
      case 'get_organization':
        return this.getOrganization(input.organizationUri);
      case 'get_organization_memberships':
        return this.getOrganizationMemberships(input);

      default:
        throw new Error(`Unknown action: ${actionId}`);
    }
  }

  protected async cleanup(): Promise<void> {
    this.logger.log('Calendly connector cleanup completed');
  }

  // User methods
  private async getCurrentUser(): Promise<ConnectorResponse> {
    try {
      const response = await this.client.get('/users/me');
      return { success: true, data: response.data.resource };
    } catch (error) {
      return this.handleError(error, 'Failed to get current user');
    }
  }

  private async getUser(userUri: string): Promise<ConnectorResponse> {
    try {
      // Extract user ID from URI
      const userId = userUri.split('/').pop();
      const response = await this.client.get(`/users/${userId}`);
      return { success: true, data: response.data.resource };
    } catch (error) {
      return this.handleError(error, 'Failed to get user');
    }
  }

  // Event Type methods
  private async getEventTypes(input: any): Promise<ConnectorResponse> {
    try {
      const params: any = {
        user: input.user || this.currentUserUri,
      };
      if (input.active !== undefined) params.active = input.active;
      if (input.count) params.count = input.count;
      if (input.sort) params.sort = input.sort;

      const response = await this.client.get('/event_types', { params });
      return { success: true, data: response.data.collection };
    } catch (error) {
      return this.handleError(error, 'Failed to get event types');
    }
  }

  private async getEventType(eventTypeUri: string): Promise<ConnectorResponse> {
    try {
      const eventTypeId = eventTypeUri.split('/').pop();
      const response = await this.client.get(`/event_types/${eventTypeId}`);
      return { success: true, data: response.data.resource };
    } catch (error) {
      return this.handleError(error, 'Failed to get event type');
    }
  }

  // Scheduled Event methods
  private async getScheduledEvents(input: any): Promise<ConnectorResponse> {
    try {
      const params: any = {
        user: input.user || this.currentUserUri,
      };
      if (input.status) params.status = input.status;
      if (input.min_start_time) params.min_start_time = input.min_start_time;
      if (input.max_start_time) params.max_start_time = input.max_start_time;
      if (input.count) params.count = input.count;
      if (input.sort) params.sort = input.sort;

      const response = await this.client.get('/scheduled_events', { params });
      return { success: true, data: response.data.collection };
    } catch (error) {
      return this.handleError(error, 'Failed to get scheduled events');
    }
  }

  private async getScheduledEvent(eventUri: string): Promise<ConnectorResponse> {
    try {
      const eventId = eventUri.split('/').pop();
      const response = await this.client.get(`/scheduled_events/${eventId}`);
      return { success: true, data: response.data.resource };
    } catch (error) {
      return this.handleError(error, 'Failed to get scheduled event');
    }
  }

  private async cancelScheduledEvent(eventUri: string, reason?: string): Promise<ConnectorResponse> {
    try {
      const eventId = eventUri.split('/').pop();
      const body = reason ? { reason } : {};
      const response = await this.client.post(`/scheduled_events/${eventId}/cancellation`, body);
      return { success: true, data: response.data.resource };
    } catch (error) {
      return this.handleError(error, 'Failed to cancel scheduled event');
    }
  }

  // Invitee methods
  private async getInvitees(eventUri: string, input: any): Promise<ConnectorResponse> {
    try {
      const eventId = eventUri.split('/').pop();
      const params: any = {};
      if (input.status) params.status = input.status;
      if (input.count) params.count = input.count;

      const response = await this.client.get(`/scheduled_events/${eventId}/invitees`, { params });
      return { success: true, data: response.data.collection };
    } catch (error) {
      return this.handleError(error, 'Failed to get invitees');
    }
  }

  private async getInvitee(inviteeUri: string): Promise<ConnectorResponse> {
    try {
      // Parse event ID and invitee ID from URI
      const parts = inviteeUri.split('/');
      const inviteeId = parts.pop();
      const eventId = parts[parts.indexOf('scheduled_events') + 1];

      const response = await this.client.get(`/scheduled_events/${eventId}/invitees/${inviteeId}`);
      return { success: true, data: response.data.resource };
    } catch (error) {
      return this.handleError(error, 'Failed to get invitee');
    }
  }

  // Webhook methods
  private async createWebhook(input: any): Promise<ConnectorResponse> {
    try {
      const body = {
        url: input.url,
        events: input.events,
        user: input.user || this.currentUserUri,
        scope: input.scope,
        organization: input.organization,
        signing_key: input.signing_key,
      };

      const response = await this.client.post('/webhook_subscriptions', body);
      return { success: true, data: response.data.resource };
    } catch (error) {
      return this.handleError(error, 'Failed to create webhook');
    }
  }

  private async getWebhooks(input: any): Promise<ConnectorResponse> {
    try {
      const params: any = {
        scope: input.scope,
      };
      if (input.user) params.user = input.user;
      if (input.organization) params.organization = input.organization;

      const response = await this.client.get('/webhook_subscriptions', { params });
      return { success: true, data: response.data.collection };
    } catch (error) {
      return this.handleError(error, 'Failed to get webhooks');
    }
  }

  private async deleteWebhook(webhookUri: string): Promise<ConnectorResponse> {
    try {
      const webhookId = webhookUri.split('/').pop();
      await this.client.delete(`/webhook_subscriptions/${webhookId}`);
      return { success: true, data: { deleted: true } };
    } catch (error) {
      return this.handleError(error, 'Failed to delete webhook');
    }
  }

  // Organization methods
  private async getOrganization(organizationUri: string): Promise<ConnectorResponse> {
    try {
      const orgId = organizationUri.split('/').pop();
      const response = await this.client.get(`/organizations/${orgId}`);
      return { success: true, data: response.data.resource };
    } catch (error) {
      return this.handleError(error, 'Failed to get organization');
    }
  }

  private async getOrganizationMemberships(input: any): Promise<ConnectorResponse> {
    try {
      const params: any = {
        organization: input.organization,
      };
      if (input.count) params.count = input.count;

      const response = await this.client.get('/organization_memberships', { params });
      return { success: true, data: response.data.collection };
    } catch (error) {
      return this.handleError(error, 'Failed to get organization memberships');
    }
  }
}
