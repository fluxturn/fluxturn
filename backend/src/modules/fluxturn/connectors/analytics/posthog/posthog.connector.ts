import { Injectable } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { BaseConnector } from '../../base/base.connector';
import {
  ConnectorMetadata,
  ConnectorType,
  ConnectorCategory,
  ConnectorRequest,
  ConnectorResponse,
  AuthType,
  ConnectorAction,
  ConnectorTrigger,
} from '../../types';
import { firstValueFrom } from 'rxjs';

@Injectable()
export class PostHogConnector extends BaseConnector {
  private baseUrl: string;

  constructor(private readonly httpService: HttpService) {
    super();
  }

  getMetadata(): ConnectorMetadata {
    return {
      name: 'PostHog',
      description: 'Product analytics platform for tracking events, users, and feature flags',
      version: '1.0.0',
      category: ConnectorCategory.ANALYTICS,
      type: ConnectorType.POSTHOG,
      authType: AuthType.API_KEY,
      actions: this.getActions(),
      triggers: this.getTriggers(),
      webhookSupport: true,
    };
  }

  protected async initializeConnection(): Promise<void> {
    if (!this.config.credentials?.apiKey) {
      throw new Error('API key is required');
    }
    if (!this.config.credentials?.url) {
      throw new Error('Instance URL is required');
    }
    this.baseUrl = this.config.credentials.url;
    this.logger.log('PostHog connector initialized');
  }

  protected async performConnectionTest(): Promise<boolean> {
    try {
      // PostHog doesn't have a dedicated health endpoint, so we'll test with a minimal batch request
      const response = await this.performRequest({
        method: 'POST',
        endpoint: '/batch',
        headers: this.getAuthHeaders(),
        body: {
          api_key: this.config.credentials.apiKey,
          batch: [],
        },
      });
      return !!response;
    } catch (error) {
      this.logger.error('Connection test failed:', error);
      return false;
    }
  }

  protected async performHealthCheck(): Promise<void> {
    const isHealthy = await this.performConnectionTest();
    if (!isHealthy) {
      throw new Error('Health check failed');
    }
  }

  protected async performRequest(request: ConnectorRequest): Promise<any> {
    const url = `${this.baseUrl}${request.endpoint}`;

    const response = await firstValueFrom(
      this.httpService.request({
        url,
        method: request.method,
        headers: request.headers || this.getAuthHeaders(),
        params: request.queryParams,
        data: request.body,
      }),
    );

    return response.data;
  }

  protected async performAction(actionId: string, input: any): Promise<any> {
    switch (actionId) {
      // Event
      case 'create_event':
        return await this.createEvent(input);

      // Alias
      case 'create_alias':
        return await this.createAlias(input);

      // Identity
      case 'create_identity':
        return await this.createIdentity(input);

      // Track
      case 'track_page':
        return await this.trackPage(input);
      case 'track_screen':
        return await this.trackScreen(input);

      default:
        throw new Error(`Unknown action: ${actionId}`);
    }
  }

  protected async cleanup(): Promise<void> {
    this.logger.log('PostHog connector cleanup completed');
  }

  private getAuthHeaders(): Record<string, string> {
    return {
      'Content-Type': 'application/json',
    };
  }

  private getActions(): ConnectorAction[] {
    return [
      {
        id: 'create_event',
        name: 'Create Event',
        description: 'Capture an analytics event',
        inputSchema: {
          eventName: { type: 'string', required: true },
          distinctId: { type: 'string', required: true },
          properties: { type: 'object', required: false },
          timestamp: { type: 'string', required: false },
        },
        outputSchema: { status: { type: 'number' }, success: { type: 'boolean' } },
      },
      {
        id: 'create_alias',
        name: 'Create Alias',
        description: 'Create an alias to associate two distinct IDs',
        inputSchema: {
          distinctId: { type: 'string', required: true },
          alias: { type: 'string', required: true },
          context: { type: 'object', required: false },
          timestamp: { type: 'string', required: false },
        },
        outputSchema: { status: { type: 'number' }, success: { type: 'boolean' } },
      },
      {
        id: 'create_identity',
        name: 'Create Identity',
        description: 'Identify a user and set their properties',
        inputSchema: {
          distinctId: { type: 'string', required: true },
          properties: { type: 'object', required: false },
          messageId: { type: 'string', required: false },
          timestamp: { type: 'string', required: false },
        },
        outputSchema: { status: { type: 'number' }, success: { type: 'boolean' } },
      },
      {
        id: 'track_page',
        name: 'Track Page View',
        description: 'Track a page view event',
        inputSchema: {
          name: { type: 'string', required: true },
          distinctId: { type: 'string', required: true },
          category: { type: 'string', required: false },
          properties: { type: 'object', required: false },
          context: { type: 'object', required: false },
          messageId: { type: 'string', required: false },
          timestamp: { type: 'string', required: false },
        },
        outputSchema: { status: { type: 'number' }, success: { type: 'boolean' } },
      },
      {
        id: 'track_screen',
        name: 'Track Screen View',
        description: 'Track a screen view event',
        inputSchema: {
          name: { type: 'string', required: true },
          distinctId: { type: 'string', required: true },
          category: { type: 'string', required: false },
          properties: { type: 'object', required: false },
          context: { type: 'object', required: false },
          messageId: { type: 'string', required: false },
          timestamp: { type: 'string', required: false },
        },
        outputSchema: { status: { type: 'number' }, success: { type: 'boolean' } },
      },
    ];
  }

  private getTriggers(): ConnectorTrigger[] {
    return [];
  }

  // Event Methods
  private async createEvent(data: any): Promise<any> {
    const { eventName, distinctId, properties, timestamp } = data;

    const events = [
      {
        event: eventName,
        properties: {
          distinct_id: distinctId,
          ...(properties || {}),
        },
        ...(timestamp && { timestamp }),
      },
    ];

    return await this.performRequest({
      method: 'POST',
      endpoint: '/capture',
      headers: this.getAuthHeaders(),
      body: {
        api_key: this.config.credentials.apiKey,
        batch: events,
      },
    });
  }

  // Alias Methods
  private async createAlias(data: any): Promise<any> {
    const { distinctId, alias, context, timestamp } = data;

    const event = {
      type: 'alias',
      event: '$create_alias',
      properties: {
        distinct_id: distinctId,
        alias,
      },
      context: context || {},
      ...(timestamp && { timestamp }),
    };

    return await this.performRequest({
      method: 'POST',
      endpoint: '/batch',
      headers: this.getAuthHeaders(),
      body: {
        api_key: this.config.credentials.apiKey,
        ...event,
      },
    });
  }

  // Identity Methods
  private async createIdentity(data: any): Promise<any> {
    const { distinctId, properties, messageId, timestamp } = data;

    const event = {
      event: '$identify',
      distinct_id: distinctId,
      properties: properties || {},
      ...(messageId && { messageId }),
      ...(timestamp && { timestamp }),
    };

    return await this.performRequest({
      method: 'POST',
      endpoint: '/batch',
      headers: this.getAuthHeaders(),
      body: {
        api_key: this.config.credentials.apiKey,
        ...event,
      },
    });
  }

  // Track Methods
  private async trackPage(data: any): Promise<any> {
    const { name, distinctId, category, properties, context, messageId, timestamp } = data;

    const event = {
      type: 'page',
      event: '$page',
      name,
      distinct_id: distinctId,
      ...(category && { category }),
      properties: properties || {},
      context: context || {},
      ...(messageId && { messageId }),
      ...(timestamp && { timestamp }),
    };

    return await this.performRequest({
      method: 'POST',
      endpoint: '/batch',
      headers: this.getAuthHeaders(),
      body: {
        api_key: this.config.credentials.apiKey,
        ...event,
      },
    });
  }

  private async trackScreen(data: any): Promise<any> {
    const { name, distinctId, category, properties, context, messageId, timestamp } = data;

    const event = {
      type: 'screen',
      event: '$screen',
      name,
      distinct_id: distinctId,
      ...(category && { category }),
      properties: properties || {},
      context: context || {},
      ...(messageId && { messageId }),
      ...(timestamp && { timestamp }),
    };

    return await this.performRequest({
      method: 'POST',
      endpoint: '/batch',
      headers: this.getAuthHeaders(),
      body: {
        api_key: this.config.credentials.apiKey,
        ...event,
      },
    });
  }
}
