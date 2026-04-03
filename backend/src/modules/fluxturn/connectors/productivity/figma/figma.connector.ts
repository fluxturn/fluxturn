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
export class FigmaConnector extends BaseConnector {
  protected readonly logger = new Logger(FigmaConnector.name);
  private readonly baseUrl = 'https://api.figma.com';

  getMetadata(): ConnectorMetadata {
    return {
      name: 'Figma',
      description: 'Monitor design changes, comments, and updates in Figma files and teams',
      version: '1.0.0',
      category: ConnectorCategory.PRODUCTIVITY,
      type: ConnectorType.FIGMA,
      authType: AuthType.API_KEY,
      actions: [],
      triggers: [],
      webhookSupport: true,
    };
  }

  protected async initializeConnection(): Promise<void> {
    if (!this.config.credentials?.accessToken) {
      throw new Error('Figma access token is required');
    }
    this.logger.log('Figma connector initialized');
  }

  protected async performConnectionTest(): Promise<boolean> {
    try {
      // Test the connection by trying to list webhooks for a team
      // This requires a team ID, so we'll just check if the token is valid by making any authenticated request
      const response = await this.performRequest({
        method: 'GET',
        endpoint: '/v1/me',
      });
      return !!response;
    } catch (error) {
      this.logger.error('Figma connection test failed', error);
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
      'X-FIGMA-TOKEN': this.config.credentials.accessToken,
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
        throw new Error(`Figma API error: ${response.status} - ${errorText}`);
      }

      // Handle 204 No Content responses
      if (response.status === 204) {
        return { success: true };
      }

      return await response.json();
    } catch (error) {
      this.logger.error('Figma API request failed', error);
      throw error;
    }
  }

  protected async performAction(actionId: string, input: any): Promise<any> {
    switch (actionId) {
      case 'get_file':
        return await this.getFile(input);
      case 'get_comments':
        return await this.getComments(input);
      case 'post_comment':
        return await this.postComment(input);
      case 'get_file_versions':
        return await this.getFileVersions(input);
      default:
        throw new Error(`Unknown action: ${actionId}`);
    }
  }

  protected async cleanup(): Promise<void> {
    this.logger.log('Figma connector cleanup completed');
  }

  // Action implementations
  private async getFile(input: any): Promise<ConnectorResponse> {
    try {
      const response = await this.performRequest({
        method: 'GET',
        endpoint: `/v1/files/${input.fileKey}`,
      });

      return {
        success: true,
        data: response,
      };
    } catch (error) {
      return {
        success: false,
        error: {
          code: 'GET_FILE_FAILED',
          message: error.message,
        },
      };
    }
  }

  private async getComments(input: any): Promise<ConnectorResponse> {
    try {
      const response = await this.performRequest({
        method: 'GET',
        endpoint: `/v1/files/${input.fileKey}/comments`,
      });

      return {
        success: true,
        data: response,
      };
    } catch (error) {
      return {
        success: false,
        error: {
          code: 'GET_COMMENTS_FAILED',
          message: error.message,
        },
      };
    }
  }

  private async postComment(input: any): Promise<ConnectorResponse> {
    try {
      const body: any = {
        message: input.message,
      };

      if (input.clientMeta) {
        body.client_meta = input.clientMeta;
      }

      const response = await this.performRequest({
        method: 'POST',
        endpoint: `/v1/files/${input.fileKey}/comments`,
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
          code: 'POST_COMMENT_FAILED',
          message: error.message,
        },
      };
    }
  }

  private async getFileVersions(input: any): Promise<ConnectorResponse> {
    try {
      const response = await this.performRequest({
        method: 'GET',
        endpoint: `/v1/files/${input.fileKey}/versions`,
      });

      return {
        success: true,
        data: response,
      };
    } catch (error) {
      return {
        success: false,
        error: {
          code: 'GET_FILE_VERSIONS_FAILED',
          message: error.message,
        },
      };
    }
  }

  // Webhook methods for triggers
  async createWebhook(teamId: string, eventType: string, webhookUrl: string): Promise<any> {
    try {
      const passcode = this.generatePasscode();

      const body = {
        event_type: eventType,
        team_id: teamId,
        description: `fluxturn-webhook:${webhookUrl}`,
        endpoint: webhookUrl,
        passcode: passcode,
      };

      const response = await this.performRequest({
        method: 'POST',
        endpoint: '/v2/webhooks',
        body,
      });

      return {
        ...response,
        passcode, // Return passcode for storage
      };
    } catch (error) {
      this.logger.error('Failed to create Figma webhook', error);
      throw error;
    }
  }

  async deleteWebhook(webhookId: string): Promise<void> {
    try {
      await this.performRequest({
        method: 'DELETE',
        endpoint: `/v2/webhooks/${webhookId}`,
      });
    } catch (error) {
      this.logger.error('Failed to delete Figma webhook', error);
      throw error;
    }
  }

  async listWebhooks(teamId: string): Promise<any[]> {
    try {
      const response = await this.performRequest({
        method: 'GET',
        endpoint: `/v2/teams/${teamId}/webhooks`,
      });

      return response.webhooks || [];
    } catch (error) {
      this.logger.error('Failed to list Figma webhooks', error);
      throw error;
    }
  }

  private generatePasscode(length: number = 20): string {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let result = '';
    for (let i = 0; i < length; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
  }

  // Process webhook payload
  processWebhookPayload(payload: any): any {
    // Handle PING events
    if (payload.event_type === 'PING') {
      return {
        type: 'ping',
        acknowledged: true,
      };
    }

    // Transform webhook payload to standard format
    return {
      eventType: payload.event_type,
      fileKey: payload.file_key,
      fileName: payload.file_name,
      timestamp: payload.timestamp,
      triggeredBy: payload.triggered_by,
      ...(payload.comment && { comment: payload.comment }),
      ...(payload.version_id && { versionId: payload.version_id }),
      ...(payload.version_label && { versionLabel: payload.version_label }),
      rawPayload: payload,
    };
  }
}
