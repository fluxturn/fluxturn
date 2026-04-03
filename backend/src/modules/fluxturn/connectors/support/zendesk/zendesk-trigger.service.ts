/**
 * Zendesk Trigger Service
 *
 * Implements ITriggerService for Zendesk webhook-based triggers.
 * Zendesk webhooks are configured in Zendesk Admin Center under
 * Apps and integrations > Webhooks.
 *
 * Supported triggers:
 * - ticket_created: When a new ticket is created
 * - ticket_updated: When a ticket is updated
 * - ticket_solved: When a ticket status changes to solved
 * - user_created: When a new user is created
 * - organization_created: When a new organization is created
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
export class ZendeskTriggerService implements ITriggerService {
  private readonly logger = new Logger(ZendeskTriggerService.name);

  constructor(
    private readonly platformService: PlatformService,
    @Inject(forwardRef(() => WorkflowService))
    private readonly workflowService: WorkflowService,
  ) {}

  getTriggerType(): TriggerType {
    return TriggerType.ZENDESK;
  }

  async activate(workflowId: string, triggerConfig: any): Promise<TriggerActivationResult> {
    try {
      this.logger.log(`Activating Zendesk trigger for workflow: ${workflowId}`);

      // Get credential ID from trigger config
      const credentialId = triggerConfig.credentialId || triggerConfig.connectorConfigId;
      if (!credentialId) {
        return {
          success: false,
          message: 'Zendesk credential not selected',
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
          message: 'Zendesk credential not found',
          error: `Connector config ${credentialId} not found`,
        };
      }

      const credentials = credentialResult.rows[0].credentials;
      if (!credentials?.subdomain || !credentials?.email || !credentials?.api_token) {
        return {
          success: false,
          message: 'Invalid Zendesk credentials',
          error: 'subdomain, email, and api_token are required',
        };
      }

      // Get the trigger type from config
      const triggerId = triggerConfig.triggerId || triggerConfig.trigger_id || 'ticket_created';

      // Build webhook URL
      const appBaseUrl = process.env.APP_BASE_URL || 'http://localhost:5005';
      const webhookUrl = `${appBaseUrl}/webhooks/zendesk/${workflowId}`;

      // Store webhook configuration in workflow metadata
      await this.storeWebhookConfig(workflowId, {
        credentialId,
        webhookUrl,
        triggerId,
        subdomain: credentials.subdomain,
        activatedAt: new Date().toISOString(),
        triggerTypes: this.getTriggerEventTypes(triggerId),
      });

      this.logger.log(`Zendesk trigger activated for workflow ${workflowId}`);

      return {
        success: true,
        message: 'Zendesk trigger activated successfully. Configure webhook in Zendesk Admin Center.',
        data: {
          webhookUrl,
          triggerId,
          triggerTypes: this.getTriggerEventTypes(triggerId),
          setupInstructions: `
1. Go to Zendesk Admin Center > Apps and integrations > Webhooks
2. Click "Create webhook"
3. Enter the webhook URL: ${webhookUrl}
4. Select the events you want to trigger on
5. Save the webhook
6. Create a trigger in Admin Center > Business rules > Triggers
7. Configure conditions and set the action to "Notify target" with your webhook
          `.trim(),
        },
      };
    } catch (error) {
      this.logger.error(`Failed to activate Zendesk trigger: ${error.message}`, error.stack);
      return {
        success: false,
        message: 'Failed to activate Zendesk trigger',
        error: error.message,
      };
    }
  }

  async deactivate(workflowId: string): Promise<TriggerDeactivationResult> {
    try {
      this.logger.log(`Deactivating Zendesk trigger for workflow: ${workflowId}`);

      // Get stored webhook config
      const webhookConfig = await this.getWebhookConfig(workflowId);

      if (!webhookConfig) {
        this.logger.log(`No Zendesk webhook config found for workflow ${workflowId}`);
        return {
          success: true,
          message: 'Zendesk trigger deactivated (no webhook configured)',
        };
      }

      // Clear webhook config from workflow metadata
      await this.platformService.query(
        `UPDATE workflows
         SET trigger_metadata = trigger_metadata - 'zendesk_webhook'
         WHERE id = $1`,
        [workflowId],
      );

      this.logger.log(`Zendesk trigger deactivated for workflow ${workflowId}`);

      return {
        success: true,
        message: 'Zendesk trigger deactivated successfully. Remember to remove the webhook from Zendesk Admin Center.',
      };
    } catch (error) {
      this.logger.error(`Failed to deactivate Zendesk trigger: ${error.message}`, error.stack);
      return {
        success: false,
        message: 'Failed to deactivate Zendesk trigger',
      };
    }
  }

  async getStatus(workflowId: string): Promise<TriggerStatus> {
    try {
      const webhookConfig = await this.getWebhookConfig(workflowId);

      if (!webhookConfig) {
        return {
          active: false,
          type: TriggerType.ZENDESK,
          message: 'No webhook configured',
        };
      }

      return {
        active: true,
        type: TriggerType.ZENDESK,
        message: 'Webhook configured',
        metadata: {
          webhookUrl: webhookConfig.webhookUrl,
          triggerId: webhookConfig.triggerId,
          triggerTypes: webhookConfig.triggerTypes,
          subdomain: webhookConfig.subdomain,
          activatedAt: webhookConfig.activatedAt,
        },
      };
    } catch (error) {
      this.logger.error(`Failed to get Zendesk trigger status: ${error.message}`);
      return {
        active: false,
        type: TriggerType.ZENDESK,
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
      [workflowId, JSON.stringify({ zendesk_webhook: config })],
    );
  }

  /**
   * Get webhook configuration from workflow metadata
   */
  async getWebhookConfig(workflowId: string): Promise<any | null> {
    const result = await this.platformService.query(
      `SELECT trigger_metadata->'zendesk_webhook' as webhook_config FROM workflows WHERE id = $1`,
      [workflowId],
    );

    if (!result.rows.length || !result.rows[0].webhook_config) {
      return null;
    }

    return result.rows[0].webhook_config;
  }

  /**
   * Get Zendesk event types for a trigger ID
   */
  private getTriggerEventTypes(triggerId: string): string[] {
    const triggerIdToEvents: Record<string, string[]> = {
      ticket_created: ['zen:event-type:ticket.created'],
      ticket_updated: ['zen:event-type:ticket.updated', 'zen:event-type:ticket.changed'],
      ticket_solved: ['zen:event-type:ticket.status.changed.solved'],
      user_created: ['zen:event-type:user.created'],
      organization_created: ['zen:event-type:organization.created'],
    };

    if (triggerId && triggerIdToEvents[triggerId]) {
      return triggerIdToEvents[triggerId];
    }

    // Default to ticket created events
    return ['zen:event-type:ticket.created'];
  }
}
