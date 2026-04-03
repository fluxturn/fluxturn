import { Injectable, Logger } from '@nestjs/common';
import { BaseConnector } from '../../base/base.connector';
import {
  ConnectorMetadata,
  ConnectorType,
  ConnectorCategory,
  ConnectorRequest,
  ConnectorResponse,
  AuthType,
} from '../../types';

@Injectable()
export class BitlyConnector extends BaseConnector {
  protected readonly logger = new Logger(BitlyConnector.name);
  private readonly baseUrl = 'https://api-ssl.bitly.com/v4';

  getMetadata(): ConnectorMetadata {
    return {
      name: 'Bitly',
      description: 'Shorten URLs, manage links, and track click analytics with Bitly',
      version: '1.0.0',
      category: ConnectorCategory.UTILITY,
      type: ConnectorType.BITLY,
      authType: AuthType.API_KEY,
      actions: [],
      triggers: [],
      webhookSupport: false,
    };
  }

  protected async initializeConnection(): Promise<void> {
    if (!this.config.credentials?.accessToken) {
      throw new Error('Bitly access token is required');
    }
    this.logger.log('Bitly connector initialized');
  }

  protected async performConnectionTest(): Promise<boolean> {
    try {
      const response = await this.performRequest({
        method: 'GET',
        endpoint: '/user',
      });
      return !!response;
    } catch (error) {
      this.logger.error('Bitly connection test failed', error);
      return false;
    }
  }

  protected async performHealthCheck(): Promise<void> {
    if (!this.config?.credentials?.accessToken) {
      throw new Error('Access token not configured');
    }
  }

  protected async performRequest(request: ConnectorRequest): Promise<any> {
    const url = `${this.baseUrl}${request.endpoint}`;
    const headers = {
      'Authorization': `Bearer ${this.config.credentials.accessToken}`,
      'Content-Type': 'application/json',
      ...request.headers,
    };

    try {
      const response = await fetch(url, {
        method: request.method,
        headers,
        body: request.body ? JSON.stringify(request.body) : undefined,
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Bitly API error: ${response.status} - ${errorText}`);
      }

      // Handle 204 No Content responses
      if (response.status === 204) {
        return { success: true };
      }

      return await response.json();
    } catch (error) {
      this.logger.error('Bitly API request failed', error);
      throw error;
    }
  }

  protected async performAction(actionId: string, input: any): Promise<any> {
    switch (actionId) {
      case 'create_link':
        return await this.createLink(input);
      case 'update_link':
        return await this.updateLink(input);
      case 'get_link':
        return await this.getLink(input);
      default:
        throw new Error(`Unknown action: ${actionId}`);
    }
  }

  protected async cleanup(): Promise<void> {
    this.logger.log('Bitly connector cleanup completed');
  }

  // Action implementations
  private async createLink(input: any): Promise<ConnectorResponse> {
    try {
      const body: any = {
        long_url: input.longUrl,
      };

      if (input.title) {
        body.title = input.title;
      }

      if (input.domain) {
        body.domain = input.domain;
      }

      if (input.group) {
        body.group_guid = input.group;
      }

      if (input.tags && input.tags.length > 0) {
        body.tags = input.tags;
      }

      const response = await this.performRequest({
        method: 'POST',
        endpoint: '/bitlinks',
        body,
      });

      return {
        success: true,
        data: response,
      };
    } catch (error) {
      return {
        success: false,
        error: {
          code: 'CREATE_LINK_FAILED',
          message: error.message,
        },
      };
    }
  }

  private async updateLink(input: any): Promise<ConnectorResponse> {
    try {
      const body: any = {};

      if (input.longUrl) {
        body.long_url = input.longUrl;
      }

      if (input.title) {
        body.title = input.title;
      }

      if (input.archived !== undefined) {
        body.archived = input.archived;
      }

      if (input.tags) {
        body.tags = input.tags;
      }

      const response = await this.performRequest({
        method: 'PATCH',
        endpoint: `/bitlinks/${input.linkId}`,
        body,
      });

      return {
        success: true,
        data: response,
      };
    } catch (error) {
      return {
        success: false,
        error: {
          code: 'UPDATE_LINK_FAILED',
          message: error.message,
        },
      };
    }
  }

  private async getLink(input: any): Promise<ConnectorResponse> {
    try {
      const response = await this.performRequest({
        method: 'GET',
        endpoint: `/bitlinks/${input.linkId}`,
      });

      return {
        success: true,
        data: response,
      };
    } catch (error) {
      return {
        success: false,
        error: {
          code: 'GET_LINK_FAILED',
          message: error.message,
        },
      };
    }
  }
}
