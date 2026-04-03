import { Request } from 'express';
import { BaseConnector } from '../../base/base.connector';
import { ConnectorMetadata, ConnectorType, ConnectorCategory, AuthType, ConnectorResponse } from '../../types';

export class GoogleAdsConnector extends BaseConnector {
  getMetadata(): ConnectorMetadata {
    return {
      name: 'Google Ads (Disabled - requires googleapis)',
      type: ConnectorType.GOOGLE_ADS,
      category: ConnectorCategory.MARKETING,
      authType: AuthType.OAUTH2,
      version: '1.0.0',
      description: 'This connector requires googleapis package which is not installed',
      logoUrl: '',
      documentationUrl: '',
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
    throw new Error('Google Ads connector disabled - googleapis package not installed');
  }

  protected async performConnectionTest(): Promise<boolean> {
    return false;
  }

  protected async performHealthCheck(): Promise<void> {
    throw new Error('Google Ads connector disabled - googleapis package not installed');
  }

  protected async performRequest(request: any): Promise<any> {
    throw new Error('Google Ads connector disabled - googleapis package not installed');
  }

  protected async performAction(actionId: string, input: any): Promise<any> {
    throw new Error('Google Ads connector disabled - googleapis package not installed');
  }

  async executeAction(actionId: string, input: any): Promise<ConnectorResponse> {
    return {
      success: false,
      error: {
        code: 'CONNECTOR_DISABLED',
        message: 'Google Ads connector disabled - googleapis package not installed'
      }
    };
  }

  protected async cleanup(): Promise<void> {
    // No cleanup needed for disabled connector
  }
}
