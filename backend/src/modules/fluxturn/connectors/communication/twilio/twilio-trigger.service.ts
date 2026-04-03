import { Injectable, Logger, Inject, forwardRef } from '@nestjs/common';
import { PlatformService } from '../../../../database/platform.service';
import { WorkflowService } from '../../../workflow/workflow.service';
import { TwilioWebhookService } from './twilio-webhook.service';
import {
  ITriggerService,
  TriggerType,
  TriggerActivationResult,
  TriggerDeactivationResult,
  TriggerStatus,
} from '../../../workflow/interfaces/trigger.interface';

/**
 * Twilio Trigger Service
 *
 * Handles Twilio-specific trigger logic including:
 * - Event Streams Sink/Subscription creation on activation
 * - Sink/Subscription deletion on deactivation
 * - Status tracking
 */
@Injectable()
export class TwilioTriggerService implements ITriggerService {
  private readonly logger = new Logger(TwilioTriggerService.name);

  constructor(
    private readonly platformService: PlatformService,
    @Inject(forwardRef(() => WorkflowService))
    private readonly workflowService: WorkflowService,
    private readonly twilioWebhookService: TwilioWebhookService,
  ) {}

  getTriggerType(): TriggerType {
    return TriggerType.TWILIO;
  }

  /**
   * Activate Twilio trigger for a workflow
   * Creates Event Streams Sink and Subscription on Twilio
   */
  async activate(workflowId: string, triggerConfig: any): Promise<TriggerActivationResult> {
    try {
      this.logger.log(`Activating Twilio trigger for workflow: ${workflowId}`);
      this.logger.debug(`Trigger config: ${JSON.stringify(triggerConfig)}`);

      // Extract credential ID from config
      const credentialId = triggerConfig.credentialId || triggerConfig.connectorConfigId;
      if (!credentialId) {
        return {
          success: false,
          message: 'Twilio credential not selected',
          error: 'Missing credentialId in trigger configuration',
        };
      }

      this.logger.log(`Creating Twilio Event Streams webhook for workflow ${workflowId}`);

      // Create webhook via Twilio Webhook Service
      const webhookResult = await this.twilioWebhookService.createWebhook(workflowId);

      if (!webhookResult.success) {
        return {
          success: false,
          message: 'Failed to create Twilio webhook',
          error: webhookResult.error || 'Unknown error',
        };
      }

      this.logger.log(`Twilio webhook created successfully for workflow: ${workflowId}`);

      return {
        success: true,
        message: 'Twilio webhook created successfully',
        data: {
          triggerId: triggerConfig.triggerId,
          webhooks: webhookResult.webhooks,
        },
      };
    } catch (error) {
      this.logger.error(`Failed to activate Twilio trigger: ${error.message}`, error.stack);
      return {
        success: false,
        message: 'Failed to activate Twilio trigger',
        error: error.message,
      };
    }
  }

  /**
   * Deactivate Twilio trigger for a workflow
   * Deletes Event Streams Sink and Subscription from Twilio
   */
  async deactivate(workflowId: string): Promise<TriggerDeactivationResult> {
    try {
      this.logger.log(`Deactivating Twilio trigger for workflow: ${workflowId}`);

      // Delete webhook via Twilio Webhook Service
      const deleteResult = await this.twilioWebhookService.deleteWebhook(workflowId);

      if (!deleteResult.success) {
        this.logger.warn(`Failed to delete some Twilio webhooks: ${JSON.stringify(deleteResult)}`);
      }

      return {
        success: true,
        message: 'Twilio trigger deactivated successfully',
      };
    } catch (error) {
      this.logger.error(`Failed to deactivate Twilio trigger: ${error.message}`, error.stack);
      return {
        success: false,
        message: `Failed to deactivate Twilio trigger: ${error.message}`,
      };
    }
  }

  /**
   * Get Twilio trigger status for a workflow
   */
  async getStatus(workflowId: string): Promise<TriggerStatus> {
    try {
      // Check if workflow has active Twilio triggers
      const query = `
        SELECT canvas FROM workflows WHERE id = $1
      `;
      const result = await this.platformService.query(query, [workflowId]);

      if (result.rows.length === 0) {
        return {
          active: false,
          type: TriggerType.TWILIO,
          message: 'Workflow not found',
        };
      }

      const canvas = result.rows[0].canvas;
      const twilioTriggers = canvas?.nodes?.filter(
        (node: any) =>
          node.type === 'TWILIO_TRIGGER' ||
          (node.type === 'CONNECTOR_TRIGGER' && node.data?.connectorType === 'twilio'),
      );

      if (!twilioTriggers || twilioTriggers.length === 0) {
        return {
          active: false,
          type: TriggerType.TWILIO,
          message: 'No Twilio triggers found',
        };
      }

      // Check if webhooks are registered (sinkId present)
      const hasWebhooks = twilioTriggers.some((trigger: any) => trigger.data?.sinkId);

      return {
        active: hasWebhooks,
        type: TriggerType.TWILIO,
        message: hasWebhooks ? 'Twilio webhooks active' : 'Twilio webhooks not registered',
        metadata: {
          triggerCount: twilioTriggers.length,
          webhookCount: twilioTriggers.filter((t: any) => t.data?.sinkId).length,
        },
      };
    } catch (error) {
      this.logger.error(`Failed to get Twilio trigger status: ${error.message}`, error.stack);
      return {
        active: false,
        type: TriggerType.TWILIO,
        message: `Error checking status: ${error.message}`,
      };
    }
  }

  /**
   * Restore Twilio triggers on service startup
   */
  async restoreActiveTriggers(): Promise<void> {
    try {
      this.logger.log('Restoring active Twilio workflows...');

      // Find all active workflows with Twilio triggers
      const query = `
        SELECT id, canvas FROM workflows
        WHERE is_active = true
        AND (
          canvas->'nodes' @> '[{"type": "TWILIO_TRIGGER"}]'::jsonb
          OR canvas->'nodes' @> '[{"type": "CONNECTOR_TRIGGER", "data": {"connectorType": "twilio"}}]'::jsonb
        )
      `;

      const result = await this.platformService.query(query);

      if (result.rows.length === 0) {
        this.logger.log('No active Twilio workflows to restore');
        return;
      }

      this.logger.log(`Found ${result.rows.length} active Twilio workflow(s) to restore`);

      for (const workflow of result.rows) {
        try {
          // Check if webhook already exists
          const canvas = workflow.canvas;
          const triggers = canvas?.nodes?.filter(
            (node: any) =>
              node.type === 'TWILIO_TRIGGER' ||
              (node.type === 'CONNECTOR_TRIGGER' && node.data?.connectorType === 'twilio'),
          );

          const hasExistingWebhook = triggers?.some((t: any) => t.data?.sinkId);

          if (hasExistingWebhook) {
            this.logger.log(`Webhook already registered for workflow ${workflow.id}`);
          } else {
            this.logger.log(`Creating webhook for workflow ${workflow.id}`);
            await this.twilioWebhookService.createWebhook(workflow.id);
          }

          this.logger.log(`Restored Twilio trigger for workflow ${workflow.id}`);
        } catch (error) {
          this.logger.error(
            `Failed to restore Twilio trigger for workflow ${workflow.id}: ${error.message}`,
          );
        }
      }

      this.logger.log(`Successfully restored ${result.rows.length} Twilio workflow(s)`);
    } catch (error) {
      this.logger.error(`Failed to restore Twilio triggers: ${error.message}`, error.stack);
    }
  }
}
