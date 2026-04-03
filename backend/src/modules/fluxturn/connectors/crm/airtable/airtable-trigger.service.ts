/**
 * Airtable Trigger Service
 *
 * Implements ITriggerService for Airtable webhook-based triggers.
 * Airtable supports webhooks through their API for record changes.
 *
 * Supported triggers:
 * - record_created: When a new record is created
 * - record_updated: When a record is updated
 * - record_deleted: When a record is deleted
 */

import { Injectable, Logger, Inject, forwardRef } from '@nestjs/common';
import { PlatformService } from '../../../../database/platform.service';
import { WorkflowService } from '../../../workflow/workflow.service';
import {
  ITriggerService,
  TriggerType,
  TriggerActivationResult,
  TriggerDeactivationResult,
  TriggerStatus,
} from '../../../workflow/interfaces/trigger.interface';

@Injectable()
export class AirtableTriggerService implements ITriggerService {
  private readonly logger = new Logger(AirtableTriggerService.name);

  constructor(
    private readonly platformService: PlatformService,
    @Inject(forwardRef(() => WorkflowService))
    private readonly workflowService: WorkflowService,
  ) {}

  getTriggerType(): TriggerType {
    return TriggerType.AIRTABLE;
  }

  async activate(workflowId: string, triggerConfig: any): Promise<TriggerActivationResult> {
    try {
      this.logger.log(`Activating Airtable trigger for workflow: ${workflowId}`);

      // Get credential ID from trigger config
      const credentialId = triggerConfig.credentialId || triggerConfig.connectorConfigId;
      if (!credentialId) {
        return {
          success: false,
          message: 'Airtable credential not selected',
          error: 'Missing credentialId in trigger configuration',
        };
      }

      // Verify the credential exists and has required fields
      const credentialResult = await this.platformService.query(
        `SELECT credentials FROM connector_configs WHERE id = $1`,
        [credentialId],
      );

      if (!credentialResult.rows.length) {
        return {
          success: false,
          message: 'Airtable credential not found',
          error: `Connector config ${credentialId} not found`,
        };
      }

      const credentials = credentialResult.rows[0].credentials;
      if (!credentials?.apiKey) {
        return {
          success: false,
          message: 'Invalid Airtable credentials',
          error: 'apiKey (Personal Access Token) is required',
        };
      }

      // Get the trigger type and table from config
      const triggerId = triggerConfig.triggerId || triggerConfig.trigger_id || 'record_created';
      const tableName = triggerConfig.tableName || triggerConfig.table_name;
      const baseId = credentials.baseId || triggerConfig.baseId;

      // Build webhook URL
      const appBaseUrl = process.env.APP_BASE_URL || 'http://localhost:5005';
      const webhookUrl = `${appBaseUrl}/webhooks/airtable/${workflowId}`;

      // Store webhook configuration in workflow metadata
      await this.storeWebhookConfig(workflowId, {
        credentialId,
        webhookUrl,
        triggerId,
        baseId,
        tableName,
        activatedAt: new Date().toISOString(),
        triggerTypes: this.getTriggerEventTypes(triggerId),
      });

      this.logger.log(`Airtable trigger activated for workflow ${workflowId}`);

      return {
        success: true,
        message: 'Airtable trigger activated successfully. Configure webhook in Airtable.',
        data: {
          webhookUrl,
          triggerId,
          triggerTypes: this.getTriggerEventTypes(triggerId),
          setupInstructions: `
1. Go to Airtable developer hub: https://airtable.com/developers/web/api/webhooks
2. Create a webhook for your base
3. Configure the webhook URL: ${webhookUrl}
4. Select the table and events you want to monitor
5. Include 'dataTypes' for record fields if needed
6. Note: Airtable webhooks require re-registration every 7 days
          `.trim(),
        },
      };
    } catch (error) {
      this.logger.error(`Failed to activate Airtable trigger: ${error.message}`, error.stack);
      return {
        success: false,
        message: 'Failed to activate Airtable trigger',
        error: error.message,
      };
    }
  }

  async deactivate(workflowId: string): Promise<TriggerDeactivationResult> {
    try {
      this.logger.log(`Deactivating Airtable trigger for workflow: ${workflowId}`);

      // Get stored webhook config
      const webhookConfig = await this.getWebhookConfig(workflowId);

      if (!webhookConfig) {
        this.logger.log(`No Airtable webhook config found for workflow ${workflowId}`);
        return {
          success: true,
          message: 'Airtable trigger deactivated (no webhook configured)',
        };
      }

      // Clear webhook config from workflow metadata
      await this.platformService.query(
        `UPDATE workflows
         SET trigger_metadata = trigger_metadata - 'airtable_webhook'
         WHERE id = $1`,
        [workflowId],
      );

      this.logger.log(`Airtable trigger deactivated for workflow ${workflowId}`);

      return {
        success: true,
        message: 'Airtable trigger deactivated successfully. Remember to delete the webhook in Airtable.',
      };
    } catch (error) {
      this.logger.error(`Failed to deactivate Airtable trigger: ${error.message}`, error.stack);
      return {
        success: false,
        message: 'Failed to deactivate Airtable trigger',
      };
    }
  }

  async getStatus(workflowId: string): Promise<TriggerStatus> {
    try {
      const webhookConfig = await this.getWebhookConfig(workflowId);

      if (!webhookConfig) {
        return {
          active: false,
          type: TriggerType.AIRTABLE,
          message: 'No webhook configured',
        };
      }

      return {
        active: true,
        type: TriggerType.AIRTABLE,
        message: 'Webhook configured',
        metadata: {
          webhookUrl: webhookConfig.webhookUrl,
          triggerId: webhookConfig.triggerId,
          triggerTypes: webhookConfig.triggerTypes,
          baseId: webhookConfig.baseId,
          tableName: webhookConfig.tableName,
          activatedAt: webhookConfig.activatedAt,
        },
      };
    } catch (error) {
      this.logger.error(`Failed to get Airtable trigger status: ${error.message}`);
      return {
        active: false,
        type: TriggerType.AIRTABLE,
        message: error.message,
      };
    }
  }

  /**
   * Store webhook configuration in workflow metadata
   */
  private async storeWebhookConfig(workflowId: string, config: any): Promise<void> {
    await this.platformService.query(
      `UPDATE workflows
       SET trigger_metadata = COALESCE(trigger_metadata, '{}'::jsonb) || $2::jsonb
       WHERE id = $1`,
      [workflowId, JSON.stringify({ airtable_webhook: config })],
    );
  }

  /**
   * Get webhook configuration from workflow metadata
   */
  async getWebhookConfig(workflowId: string): Promise<any | null> {
    const result = await this.platformService.query(
      `SELECT trigger_metadata->'airtable_webhook' as webhook_config FROM workflows WHERE id = $1`,
      [workflowId],
    );

    if (!result.rows.length || !result.rows[0].webhook_config) {
      return null;
    }

    return result.rows[0].webhook_config;
  }

  /**
   * Get Airtable event types for a trigger ID
   */
  private getTriggerEventTypes(triggerId: string): string[] {
    const triggerIdToEvents: Record<string, string[]> = {
      record_created: ['airtable:record_created', 'created'],
      record_updated: ['airtable:record_updated', 'changed'],
      record_deleted: ['airtable:record_deleted', 'destroyed'],
    };

    if (triggerId && triggerIdToEvents[triggerId]) {
      return triggerIdToEvents[triggerId];
    }

    // Default to record created events
    return ['airtable:record_created', 'created'];
  }
}
