// Plaid Webhook Service
// Manages webhook URL registration with Plaid Items

import { Injectable, Logger } from '@nestjs/common';
import axios from 'axios';
import { PlatformService } from '../../../../database/platform.service';

interface PlaidWebhookConfig {
  clientId: string;
  secret: string;
  environment: 'sandbox' | 'development' | 'production';
  accessToken: string;
  webhookUrl: string;
}

interface WebhookUpdateResult {
  success: boolean;
  message: string;
  item?: any;
  error?: string;
}

@Injectable()
export class PlaidWebhookService {
  private readonly logger = new Logger(PlaidWebhookService.name);

  constructor(private readonly platformService: PlatformService) {}

  // Get base URL for Plaid API based on environment
  private getBaseUrl(environment: string): string {
    switch (environment) {
      case 'production':
        return 'https://production.plaid.com';
      case 'development':
        return 'https://development.plaid.com';
      default:
        return 'https://sandbox.plaid.com';
    }
  }

  // Update webhook URL for an existing Plaid Item
  async updateItemWebhook(config: PlaidWebhookConfig): Promise<WebhookUpdateResult> {
    const baseUrl = this.getBaseUrl(config.environment);

    try {
      this.logger.log(`Updating Plaid webhook URL for Item`);

      const response = await axios.post(`${baseUrl}/item/webhook/update`, {
        client_id: config.clientId,
        secret: config.secret,
        access_token: config.accessToken,
        webhook: config.webhookUrl,
      });

      this.logger.log(`Plaid webhook URL updated successfully`);

      return {
        success: true,
        message: 'Webhook URL updated successfully',
        item: response.data?.item,
      };
    } catch (error) {
      const errorMessage = error.response?.data?.error_message || error.message;
      this.logger.error(`Failed to update Plaid webhook: ${errorMessage}`);

      return {
        success: false,
        message: 'Failed to update webhook URL',
        error: errorMessage,
      };
    }
  }

  // Get Item info including current webhook URL
  async getItemInfo(
    clientId: string,
    secret: string,
    accessToken: string,
    environment: string,
  ): Promise<any> {
    const baseUrl = this.getBaseUrl(environment);

    try {
      const response = await axios.post(`${baseUrl}/item/get`, {
        client_id: clientId,
        secret: secret,
        access_token: accessToken,
      });

      return {
        success: true,
        item: response.data?.item,
        status: response.data?.status,
      };
    } catch (error) {
      const errorMessage = error.response?.data?.error_message || error.message;
      this.logger.error(`Failed to get Plaid item info: ${errorMessage}`);

      return {
        success: false,
        error: errorMessage,
      };
    }
  }

  // Build webhook URL for a workflow
  buildWebhookUrl(workflowId: string, baseAppUrl: string): string {
    // Ensure no double slashes
    const cleanBaseUrl = baseAppUrl.replace(/\/$/, '');
    return `${cleanBaseUrl}/api/v1/webhooks/plaid/${workflowId}`;
  }

  // Store webhook configuration for a workflow
  async storeWebhookConfig(
    workflowId: string,
    accessToken: string,
    webhookUrl: string,
  ): Promise<void> {
    try {
      // Store in workflow metadata or a separate table
      // For now, we'll update workflow's trigger_metadata
      await this.platformService.query(
        `UPDATE workflows
         SET trigger_metadata = jsonb_set(
           COALESCE(trigger_metadata, '{}')::jsonb,
           '{plaid_webhook}',
           $2::jsonb
         )
         WHERE id = $1`,
        [
          workflowId,
          JSON.stringify({
            accessToken: accessToken.substring(0, 20) + '...', // Store partial for reference
            webhookUrl,
            updatedAt: new Date().toISOString(),
          }),
        ],
      );

      this.logger.log(`Stored Plaid webhook config for workflow ${workflowId}`);
    } catch (error) {
      this.logger.error(`Failed to store webhook config: ${error.message}`);
      throw error;
    }
  }

  // Get stored webhook configuration for a workflow
  async getWebhookConfig(workflowId: string): Promise<any> {
    try {
      const result = await this.platformService.query(
        `SELECT trigger_metadata->'plaid_webhook' as webhook_config
         FROM workflows
         WHERE id = $1`,
        [workflowId],
      );

      return result.rows[0]?.webhook_config || null;
    } catch (error) {
      this.logger.error(`Failed to get webhook config: ${error.message}`);
      return null;
    }
  }

  // Verify webhook is configured for an Item
  async verifyWebhookConfigured(
    clientId: string,
    secret: string,
    accessToken: string,
    environment: string,
    expectedWebhookUrl: string,
  ): Promise<{ configured: boolean; currentUrl?: string }> {
    const itemInfo = await this.getItemInfo(clientId, secret, accessToken, environment);

    if (!itemInfo.success) {
      return { configured: false };
    }

    const currentWebhookUrl = itemInfo.item?.webhook;

    return {
      configured: currentWebhookUrl === expectedWebhookUrl,
      currentUrl: currentWebhookUrl,
    };
  }
}
