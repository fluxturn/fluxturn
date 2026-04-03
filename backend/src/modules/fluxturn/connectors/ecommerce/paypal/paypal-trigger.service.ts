/**
 * PayPal Trigger Service
 *
 * Implements ITriggerService for PayPal webhook-based triggers.
 * PayPal can send webhooks for various payment events.
 *
 * Supported triggers:
 * - webhook_events: Handle PayPal events via webhooks (payment, subscription, etc.)
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
export class PayPalTriggerService implements ITriggerService {
  private readonly logger = new Logger(PayPalTriggerService.name);

  constructor(
    private readonly platformService: PlatformService,
    @Inject(forwardRef(() => WorkflowService))
    private readonly workflowService: WorkflowService,
  ) {}

  getTriggerType(): TriggerType {
    return TriggerType.PAYPAL;
  }

  async activate(workflowId: string, triggerConfig: any): Promise<TriggerActivationResult> {
    try {
      this.logger.log(`Activating PayPal trigger for workflow: ${workflowId}`);

      // Get credential ID from trigger config
      const credentialId = triggerConfig.credentialId || triggerConfig.connectorConfigId;
      if (!credentialId) {
        return {
          success: false,
          message: 'PayPal credential not selected',
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
          message: 'PayPal credential not found',
          error: `Connector config ${credentialId} not found`,
        };
      }

      const credentials = credentialResult.rows[0].credentials;
      if (!credentials?.clientId || !credentials?.clientSecret) {
        return {
          success: false,
          message: 'Invalid PayPal credentials',
          error: 'clientId and clientSecret are required',
        };
      }

      // Get the trigger type and events from config
      const triggerId = triggerConfig.triggerId || triggerConfig.trigger_id || 'webhook_events';
      const events = triggerConfig.events || ['*'];
      const environment = credentials.environment || 'sandbox';

      // Build webhook URL
      const appBaseUrl = process.env.APP_BASE_URL || 'http://localhost:5005';
      const webhookUrl = `${appBaseUrl}/webhooks/paypal/${workflowId}`;

      // Store webhook configuration in workflow metadata
      await this.storeWebhookConfig(workflowId, {
        credentialId,
        webhookUrl,
        triggerId,
        events,
        environment,
        activatedAt: new Date().toISOString(),
        triggerTypes: this.getTriggerEventTypes(events),
      });

      this.logger.log(`PayPal trigger activated for workflow ${workflowId}`);

      return {
        success: true,
        message: 'PayPal trigger activated successfully. Configure webhook in PayPal Developer Dashboard.',
        data: {
          webhookUrl,
          triggerId,
          events,
          triggerTypes: this.getTriggerEventTypes(events),
          setupInstructions: `
1. Go to PayPal Developer Dashboard: https://developer.paypal.com/dashboard/applications/${environment}
2. Select your application
3. Scroll to "Webhooks" section
4. Click "Add Webhook"
5. Enter the webhook URL: ${webhookUrl}
6. Select the events you want to listen to
7. Save the webhook
8. Note the Webhook ID for signature verification
          `.trim(),
        },
      };
    } catch (error) {
      this.logger.error(`Failed to activate PayPal trigger: ${error.message}`, error.stack);
      return {
        success: false,
        message: 'Failed to activate PayPal trigger',
        error: error.message,
      };
    }
  }

  async deactivate(workflowId: string): Promise<TriggerDeactivationResult> {
    try {
      this.logger.log(`Deactivating PayPal trigger for workflow: ${workflowId}`);

      // Get stored webhook config
      const webhookConfig = await this.getWebhookConfig(workflowId);

      if (!webhookConfig) {
        this.logger.log(`No PayPal webhook config found for workflow ${workflowId}`);
        return {
          success: true,
          message: 'PayPal trigger deactivated (no webhook configured)',
        };
      }

      // Clear webhook config from workflow metadata
      await this.platformService.query(
        `UPDATE workflows
         SET trigger_metadata = trigger_metadata - 'paypal_webhook'
         WHERE id = $1`,
        [workflowId],
      );

      this.logger.log(`PayPal trigger deactivated for workflow ${workflowId}`);

      return {
        success: true,
        message: 'PayPal trigger deactivated successfully. Remember to remove the webhook from PayPal Developer Dashboard.',
      };
    } catch (error) {
      this.logger.error(`Failed to deactivate PayPal trigger: ${error.message}`, error.stack);
      return {
        success: false,
        message: 'Failed to deactivate PayPal trigger',
      };
    }
  }

  async getStatus(workflowId: string): Promise<TriggerStatus> {
    try {
      const webhookConfig = await this.getWebhookConfig(workflowId);

      if (!webhookConfig) {
        return {
          active: false,
          type: TriggerType.PAYPAL,
          message: 'No webhook configured',
        };
      }

      return {
        active: true,
        type: TriggerType.PAYPAL,
        message: 'Webhook configured',
        metadata: {
          webhookUrl: webhookConfig.webhookUrl,
          triggerId: webhookConfig.triggerId,
          events: webhookConfig.events,
          environment: webhookConfig.environment,
          activatedAt: webhookConfig.activatedAt,
        },
      };
    } catch (error) {
      this.logger.error(`Failed to get PayPal trigger status: ${error.message}`);
      return {
        active: false,
        type: TriggerType.PAYPAL,
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
      [workflowId, JSON.stringify({ paypal_webhook: config })],
    );
  }

  /**
   * Get webhook configuration from workflow metadata
   */
  async getWebhookConfig(workflowId: string): Promise<any | null> {
    const result = await this.platformService.query(
      `SELECT trigger_metadata->'paypal_webhook' as webhook_config FROM workflows WHERE id = $1`,
      [workflowId],
    );

    if (!result.rows.length || !result.rows[0].webhook_config) {
      return null;
    }

    return result.rows[0].webhook_config;
  }

  /**
   * Get PayPal event types for selected events
   */
  private getTriggerEventTypes(events: string[]): string[] {
    if (events.includes('*')) {
      return ['paypal_webhook', 'all_events'];
    }
    return ['paypal_webhook', ...events];
  }
}
