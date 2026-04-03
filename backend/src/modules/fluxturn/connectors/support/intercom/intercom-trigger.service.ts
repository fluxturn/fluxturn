/**
 * Intercom Trigger Service
 *
 * Implements ITriggerService for Intercom webhook-based triggers.
 * Intercom webhooks are configured in the Intercom Developer Hub,
 * so this service manages the workflow-to-webhook mapping.
 *
 * Supported triggers:
 * - conversation_opened: When a new conversation is opened
 * - conversation_closed: When a conversation is closed
 * - user_created: When a new user is created
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
export class IntercomTriggerService implements ITriggerService {
  private readonly logger = new Logger(IntercomTriggerService.name);

  constructor(
    private readonly platformService: PlatformService,
    @Inject(forwardRef(() => WorkflowService))
    private readonly workflowService: WorkflowService,
  ) {}

  getTriggerType(): TriggerType {
    return TriggerType.INTERCOM;
  }

  async activate(workflowId: string, triggerConfig: any): Promise<TriggerActivationResult> {
    try {
      this.logger.log(`Activating Intercom trigger for workflow: ${workflowId}`);

      // Get credential ID from trigger config
      const credentialId = triggerConfig.credentialId || triggerConfig.connectorConfigId;
      if (!credentialId) {
        return {
          success: false,
          message: 'Intercom credential not selected',
          error: 'Missing credentialId in trigger configuration',
        };
      }

      // Verify the credential exists and has access token
      const credentialResult = await this.platformService.query(
        `SELECT credentials FROM connector_configs WHERE id = $1`,
        [credentialId],
      );

      if (!credentialResult.rows.length) {
        return {
          success: false,
          message: 'Intercom credential not found',
          error: `Connector config ${credentialId} not found`,
        };
      }

      const credentials = credentialResult.rows[0].credentials;
      if (!credentials?.access_token) {
        return {
          success: false,
          message: 'Invalid Intercom credentials',
          error: 'access_token is required',
        };
      }

      // Get the trigger type from config
      const triggerId = triggerConfig.triggerId || triggerConfig.trigger_id || 'conversation_opened';

      // Build webhook URL
      const appBaseUrl = process.env.APP_BASE_URL || 'http://localhost:5005';
      const webhookUrl = `${appBaseUrl}/webhooks/intercom/${workflowId}`;

      // Store webhook configuration in workflow metadata
      await this.storeWebhookConfig(workflowId, {
        credentialId,
        webhookUrl,
        triggerId,
        activatedAt: new Date().toISOString(),
        triggerTypes: this.getTriggerEventTypes(triggerId),
      });

      this.logger.log(`Intercom trigger activated for workflow ${workflowId}`);

      return {
        success: true,
        message: 'Intercom trigger activated successfully. Configure webhook URL in Intercom Developer Hub.',
        data: {
          webhookUrl,
          triggerId,
          triggerTypes: this.getTriggerEventTypes(triggerId),
          setupInstructions: 'Add the webhook URL in your Intercom Developer Hub under Webhooks settings.',
        },
      };
    } catch (error) {
      this.logger.error(`Failed to activate Intercom trigger: ${error.message}`, error.stack);
      return {
        success: false,
        message: 'Failed to activate Intercom trigger',
        error: error.message,
      };
    }
  }

  async deactivate(workflowId: string): Promise<TriggerDeactivationResult> {
    try {
      this.logger.log(`Deactivating Intercom trigger for workflow: ${workflowId}`);

      // Get stored webhook config
      const webhookConfig = await this.getWebhookConfig(workflowId);

      if (!webhookConfig) {
        this.logger.log(`No Intercom webhook config found for workflow ${workflowId}`);
        return {
          success: true,
          message: 'Intercom trigger deactivated (no webhook configured)',
        };
      }

      // Clear webhook config from workflow metadata
      await this.platformService.query(
        `UPDATE workflows
         SET trigger_metadata = trigger_metadata - 'intercom_webhook'
         WHERE id = $1`,
        [workflowId],
      );

      this.logger.log(`Intercom trigger deactivated for workflow ${workflowId}`);

      return {
        success: true,
        message: 'Intercom trigger deactivated successfully',
      };
    } catch (error) {
      this.logger.error(`Failed to deactivate Intercom trigger: ${error.message}`, error.stack);
      return {
        success: false,
        message: 'Failed to deactivate Intercom trigger',
      };
    }
  }

  async getStatus(workflowId: string): Promise<TriggerStatus> {
    try {
      const webhookConfig = await this.getWebhookConfig(workflowId);

      if (!webhookConfig) {
        return {
          active: false,
          type: TriggerType.INTERCOM,
          message: 'No webhook configured',
        };
      }

      return {
        active: true,
        type: TriggerType.INTERCOM,
        message: 'Webhook configured',
        metadata: {
          webhookUrl: webhookConfig.webhookUrl,
          triggerId: webhookConfig.triggerId,
          triggerTypes: webhookConfig.triggerTypes,
          activatedAt: webhookConfig.activatedAt,
        },
      };
    } catch (error) {
      this.logger.error(`Failed to get Intercom trigger status: ${error.message}`);
      return {
        active: false,
        type: TriggerType.INTERCOM,
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
      [workflowId, JSON.stringify({ intercom_webhook: config })],
    );
  }

  /**
   * Get webhook configuration from workflow metadata
   */
  async getWebhookConfig(workflowId: string): Promise<any | null> {
    const result = await this.platformService.query(
      `SELECT trigger_metadata->'intercom_webhook' as webhook_config FROM workflows WHERE id = $1`,
      [workflowId],
    );

    if (!result.rows.length || !result.rows[0].webhook_config) {
      return null;
    }

    return result.rows[0].webhook_config;
  }

  /**
   * Get Intercom event types for a trigger ID
   */
  private getTriggerEventTypes(triggerId: string): string[] {
    const triggerIdToEvents: Record<string, string[]> = {
      conversation_opened: ['conversation.user.created', 'conversation.user.replied'],
      conversation_closed: ['conversation.admin.closed'],
      conversation_replied: ['conversation.user.replied', 'conversation.admin.replied'],
      conversation_assigned: ['conversation.admin.assigned'],
      conversation_snoozed: ['conversation.admin.snoozed'],
      conversation_unsnoozed: ['conversation.admin.unsnoozed'],
      user_created: ['contact.user.created', 'user.created'],
      user_deleted: ['contact.user.deleted', 'user.deleted'],
      user_tag_added: ['contact.tag.created', 'user.tag.created'],
      user_tag_removed: ['contact.tag.deleted', 'user.tag.deleted'],
      user_unsubscribed: ['contact.user.unsubscribed', 'user.unsubscribed'],
    };

    if (triggerId && triggerIdToEvents[triggerId]) {
      return triggerIdToEvents[triggerId];
    }

    // Default to conversation events
    return ['conversation.user.created'];
  }
}
