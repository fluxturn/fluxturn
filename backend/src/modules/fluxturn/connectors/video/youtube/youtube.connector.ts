import { Request } from 'express';
import { Injectable } from '@nestjs/common';
import { BaseConnector } from '../../base/base.connector';
import { ConnectorMetadata, ConnectorType, ConnectorCategory, AuthType, ConnectorResponse, ConnectorRequest } from '../../types';
import { AuthUtils } from '../../utils/auth.utils';
import { ApiUtils } from '../../utils/api.utils';

@Injectable()
export class YouTubeConnector extends BaseConnector {
  constructor(
    private readonly authUtils: AuthUtils,
    private readonly apiUtils: ApiUtils
  ) {
    super();
  }

  getMetadata(): ConnectorMetadata {
    return {
      name: 'YouTube (Disabled - requires googleapis)',
      type: ConnectorType.YOUTUBE_API,
      category: ConnectorCategory.VIDEO,
      authType: AuthType.OAUTH2,
      version: '1.0.0',
      description: 'This connector requires googleapis package which is not installed',
      logoUrl: 'https://www.youtube.com/about/static/svgs/icons/brand-resources/YouTube_icon_full-color.svg',
      documentationUrl: 'https://developers.google.com/youtube/v3',
      actions: [],
      triggers: [],
      rateLimit: {
        requestsPerSecond: 1,
        requestsPerMinute: 60,
        requestsPerDay: 10000
      },
      webhookSupport: false
    };
  }

  protected async initializeConnection(): Promise<void> {
    throw new Error('YouTube connector disabled - googleapis package not installed');
  }

  protected async performConnectionTest(): Promise<boolean> {
    return false;
  }

  protected async performHealthCheck(): Promise<void> {
    throw new Error('YouTube connector disabled - googleapis package not installed');
  }

  protected async performRequest(request: ConnectorRequest): Promise<any> {
    throw new Error('YouTube connector disabled - googleapis package not installed');
  }

  protected async performAction(actionId: string, input: any): Promise<any> {
    throw new Error('YouTube connector disabled - googleapis package not installed');
  }

  async executeRequest(request: ConnectorRequest): Promise<ConnectorResponse> {
    throw new Error('YouTube connector disabled - googleapis package not installed');
  }

  async executeAction(actionId: string, input: any): Promise<ConnectorResponse> {
    return {
      success: false,
      error: {
        code: 'CONNECTOR_DISABLED',
        message: 'YouTube connector disabled - googleapis package not installed'
      }
    };
  }

  protected async cleanup(): Promise<void> {
    // No cleanup needed for disabled connector
  }
}
