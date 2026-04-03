// Plaid Trigger Service
// Implements ITriggerService for Plaid webhook-based triggers

import { Injectable, Logger, Inject, forwardRef } from '@nestjs/common';
import { PlatformService } from '../../../../database/platform.service';
import { WorkflowService } from '../../../workflow/workflow.service';
import { PlaidWebhookService } from './plaid-webhook.service';
import {
  ITriggerService,
  TriggerType,
  TriggerActivationResult,
  TriggerDeactivationResult,
  TriggerStatus,
} from '../../../workflow/interfaces/trigger.interface';

@Injectable()
export class PlaidTriggerService implements ITriggerService {
  private readonly logger = new Logger(PlaidTriggerService.name);

  constructor(
    private readonly platformService: PlatformService,
    @Inject(forwardRef(() => WorkflowService))
    private readonly workflowService: WorkflowService,
    private readonly plaidWebhookService: PlaidWebhookService,
  ) {}

  getTriggerType(): TriggerType {
    return TriggerType.PLAID;
  }

  async activate(workflowId: string, triggerConfig: any): Promise<TriggerActivationResult> {
    try {
      this.logger.log(`Activating Plaid trigger for workflow: ${workflowId}`);

      // Get credential ID from trigger config
      const credentialId = triggerConfig.credentialId || triggerConfig.connectorConfigId;
      if (!credentialId) {
        return {
          success: false,
          message: 'Plaid credential not selected',
          error: 'Missing credentialId in trigger configuration',
        };
      }

      // Get access_token from trigger config (Plaid requires per-Item access tokens)
      const accessToken = triggerConfig.access_token || triggerConfig.accessToken;
      if (!accessToken) {
        return {
          success: false,
          message: 'Plaid access token is required for webhook triggers',
          error: 'Missing access_token. Each Plaid Item needs its own access token.',
        };
      }

      // Get connector credentials
      const credentialResult = await this.platformService.query(
        `SELECT credentials FROM connector_configs WHERE id = $1`,
        [credentialId],
      );

      if (!credentialResult.rows.length) {
        return {
          success: false,
          message: 'Plaid credential not found',
          error: `Connector config ${credentialId} not found`,
        };
      }

      const credentials = credentialResult.rows[0].credentials;
      const clientId = credentials.client_id;
      const secret = credentials.secret;
      const environment = credentials.environment || 'sandbox';

      if (!clientId || !secret) {
        return {
          success: false,
          message: 'Invalid Plaid credentials',
          error: 'client_id and secret are required',
        };
      }

      // Build webhook URL for this workflow
      const appBaseUrl = process.env.APP_BASE_URL || 'http://localhost:5005';
      const webhookUrl = this.plaidWebhookService.buildWebhookUrl(workflowId, appBaseUrl);

      // Update the Item's webhook URL in Plaid
      const updateResult = await this.plaidWebhookService.updateItemWebhook({
        clientId,
        secret,
        environment,
        accessToken,
        webhookUrl,
      });

      if (!updateResult.success) {
        return {
          success: false,
          message: 'Failed to configure Plaid webhook',
          error: updateResult.error,
        };
      }

      // Store webhook configuration
      await this.plaidWebhookService.storeWebhookConfig(workflowId, accessToken, webhookUrl);

      this.logger.log(`Plaid trigger activated for workflow ${workflowId}`);

      return {
        success: true,
        message: 'Plaid trigger activated successfully',
        data: {
          webhookUrl,
          itemId: updateResult.item?.item_id,
          environment,
          triggerTypes: this.getActiveTriggerTypes(triggerConfig),
        },
      };
    } catch (error) {
      this.logger.error(`Failed to activate Plaid trigger: ${error.message}`, error.stack);
      return {
        success: false,
        message: 'Failed to activate Plaid trigger',
        error: error.message,
      };
    }
  }

  async deactivate(workflowId: string): Promise<TriggerDeactivationResult> {
    try {
      this.logger.log(`Deactivating Plaid trigger for workflow: ${workflowId}`);

      // Get stored webhook config
      const webhookConfig = await this.plaidWebhookService.getWebhookConfig(workflowId);

      if (!webhookConfig) {
        this.logger.log(`No Plaid webhook config found for workflow ${workflowId}`);
        return {
          success: true,
          message: 'Plaid trigger deactivated (no webhook configured)',
        };
      }

      // Note: Plaid doesn't have a way to completely remove webhooks,
      // but you can set an empty or null webhook URL
      // For now, we just clear the stored config

      // Clear webhook config from workflow metadata
      await this.platformService.query(
        `UPDATE workflows
         SET trigger_metadata = trigger_metadata - 'plaid_webhook'
         WHERE id = $1`,
        [workflowId],
      );

      this.logger.log(`Plaid trigger deactivated for workflow ${workflowId}`);

      return {
        success: true,
        message: 'Plaid trigger deactivated successfully',
      };
    } catch (error) {
      this.logger.error(`Failed to deactivate Plaid trigger: ${error.message}`, error.stack);
      return {
        success: false,
        message: 'Failed to deactivate Plaid trigger',
      };
    }
  }

  async getStatus(workflowId: string): Promise<TriggerStatus> {
    try {
      const webhookConfig = await this.plaidWebhookService.getWebhookConfig(workflowId);

      if (!webhookConfig) {
        return {
          active: false,
          type: TriggerType.PLAID,
          message: 'No webhook configured',
        };
      }

      return {
        active: true,
        type: TriggerType.PLAID,
        message: 'Webhook configured',
        metadata: {
          webhookUrl: webhookConfig.webhookUrl,
          updatedAt: webhookConfig.updatedAt,
        },
      };
    } catch (error) {
      this.logger.error(`Failed to get Plaid trigger status: ${error.message}`);
      return {
        active: false,
        type: TriggerType.PLAID,
        message: error.message,
      };
    }
  }

  // Get list of trigger types configured in the trigger config
  private getActiveTriggerTypes(triggerConfig: any): string[] {
    const triggerId = triggerConfig.triggerId || triggerConfig.trigger_id;

    // Map trigger IDs to event types
    const triggerIdToEvents: Record<string, string[]> = {
      transactions_sync_updates: ['TRANSACTIONS.SYNC_UPDATES_AVAILABLE'],
      transactions_initial_update: ['TRANSACTIONS.INITIAL_UPDATE'],
      transactions_historical_update: ['TRANSACTIONS.HISTORICAL_UPDATE'],
      transactions_default_update: ['TRANSACTIONS.DEFAULT_UPDATE'],
      transactions_removed: ['TRANSACTIONS.TRANSACTIONS_REMOVED'],
      item_error: ['ITEM.ERROR'],
      item_pending_expiration: ['ITEM.PENDING_EXPIRATION'],
      item_user_permission_revoked: ['ITEM.USER_PERMISSION_REVOKED'],
      auth_automatically_verified: ['AUTH.AUTOMATICALLY_VERIFIED'],
      auth_verification_expired: ['AUTH.VERIFICATION_EXPIRED'],
    };

    if (triggerId && triggerIdToEvents[triggerId]) {
      return triggerIdToEvents[triggerId];
    }

    // If no specific trigger, return all transaction events (most common use case)
    return ['TRANSACTIONS'];
  }
}
