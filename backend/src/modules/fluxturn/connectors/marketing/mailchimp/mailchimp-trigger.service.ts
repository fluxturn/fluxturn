import { Injectable, Logger, Inject, forwardRef } from '@nestjs/common';
import { PlatformService } from '../../../../database/platform.service';
import { WorkflowService } from '../../../workflow/workflow.service';
import { MailchimpWebhookService } from './mailchimp-webhook.service';
import {
  ITriggerService,
  TriggerType,
  TriggerActivationResult,
  TriggerDeactivationResult,
  TriggerStatus,
} from '../../../workflow/interfaces/trigger.interface';

/**
 * Mailchimp Trigger Service
 *
 * Handles Mailchimp-specific trigger logic including:
 * - Webhook creation/deletion on activation/deactivation
 * - Status tracking
 */
@Injectable()
export class MailchimpTriggerService implements ITriggerService {
  private readonly logger = new Logger(MailchimpTriggerService.name);

  constructor(
    private readonly platformService: PlatformService,
    @Inject(forwardRef(() => WorkflowService))
    private readonly workflowService: WorkflowService,
    private readonly mailchimpWebhookService: MailchimpWebhookService,
  ) {}

  getTriggerType(): TriggerType {
    return TriggerType.MAILCHIMP;
  }

  /**
   * Activate Mailchimp trigger for a workflow
   * Creates webhook on Mailchimp
   */
  async activate(workflowId: string, triggerConfig: any): Promise<TriggerActivationResult> {
    try {
      this.logger.log(`Activating Mailchimp trigger for workflow: ${workflowId}`);
      this.logger.debug(`Trigger config: ${JSON.stringify(triggerConfig)}`);

      // Extract credential ID from config
      const credentialId = triggerConfig.credentialId || triggerConfig.connectorConfigId;
      if (!credentialId) {
        return {
          success: false,
          message: 'Mailchimp credential not selected',
          error: 'Missing credentialId in trigger configuration',
        };
      }

      // Extract trigger params from config
      const triggerParams = triggerConfig.triggerParams || triggerConfig.actionParams || {};
      const triggerId = triggerConfig.triggerId;
      const listId = triggerParams.listId || triggerParams.list_id;

      if (!triggerId) {
        return {
          success: false,
          message: 'Mailchimp trigger not fully configured',
          error: 'Missing triggerId in trigger parameters',
        };
      }

      if (!listId) {
        return {
          success: false,
          message: 'Mailchimp list/audience not selected',
          error: 'Missing listId in trigger parameters',
        };
      }

      this.logger.log(`Creating Mailchimp webhook for trigger: ${triggerId}, list: ${listId}`);

      // Create webhook via Mailchimp Webhook Service
      const webhookResult = await this.mailchimpWebhookService.createWebhook(workflowId);

      if (!webhookResult.success) {
        return {
          success: false,
          message: 'Failed to create Mailchimp webhook',
          error: webhookResult.error || 'Unknown error',
        };
      }

      this.logger.log(`Mailchimp webhook created successfully for workflow: ${workflowId}`);

      return {
        success: true,
        message: 'Mailchimp webhook created successfully',
        data: {
          triggerId: triggerConfig.triggerId,
          listId: listId,
          webhooks: webhookResult.webhooks,
        },
      };
    } catch (error) {
      this.logger.error(`Failed to activate Mailchimp trigger: ${error.message}`, error.stack);
      return {
        success: false,
        message: 'Failed to activate Mailchimp trigger',
        error: error.message,
      };
    }
  }

  /**
   * Deactivate Mailchimp trigger for a workflow
   * Deletes webhook from Mailchimp
   */
  async deactivate(workflowId: string): Promise<TriggerDeactivationResult> {
    try {
      this.logger.log(`Deactivating Mailchimp trigger for workflow: ${workflowId}`);

      // Delete webhook via Mailchimp Webhook Service
      const deleteResult = await this.mailchimpWebhookService.deleteWebhook(workflowId);

      if (!deleteResult.success) {
        this.logger.warn(`Failed to delete some Mailchimp webhooks: ${JSON.stringify(deleteResult)}`);
      }

      return {
        success: true,
        message: 'Mailchimp trigger deactivated successfully',
      };
    } catch (error) {
      this.logger.error(`Failed to deactivate Mailchimp trigger: ${error.message}`, error.stack);
      return {
        success: false,
        message: `Failed to deactivate Mailchimp trigger: ${error.message}`,
      };
    }
  }

  /**
   * Get Mailchimp trigger status for a workflow
   */
  async getStatus(workflowId: string): Promise<TriggerStatus> {
    try {
      // Check if workflow has active Mailchimp triggers
      const query = `
        SELECT canvas FROM workflows WHERE id = $1
      `;
      const result = await this.platformService.query(query, [workflowId]);

      if (result.rows.length === 0) {
        return {
          active: false,
          type: TriggerType.MAILCHIMP,
          message: 'Workflow not found',
        };
      }

      const canvas = result.rows[0].canvas;
      const mailchimpTriggers = canvas?.nodes?.filter(
        (node: any) =>
          node.type === 'MAILCHIMP_TRIGGER' ||
          (node.type === 'CONNECTOR_TRIGGER' && node.data?.connectorType === 'mailchimp'),
      );

      if (!mailchimpTriggers || mailchimpTriggers.length === 0) {
        return {
          active: false,
          type: TriggerType.MAILCHIMP,
          message: 'No Mailchimp triggers found',
        };
      }

      // Check if webhooks are registered
      const hasWebhooks = mailchimpTriggers.some((trigger: any) => trigger.data?.webhookId);

      return {
        active: hasWebhooks,
        type: TriggerType.MAILCHIMP,
        message: hasWebhooks ? 'Mailchimp webhooks active' : 'Mailchimp webhooks not registered',
        metadata: {
          triggerCount: mailchimpTriggers.length,
          webhookCount: mailchimpTriggers.filter((t: any) => t.data?.webhookId).length,
        },
      };
    } catch (error) {
      this.logger.error(`Failed to get Mailchimp trigger status: ${error.message}`, error.stack);
      return {
        active: false,
        type: TriggerType.MAILCHIMP,
        message: `Error checking status: ${error.message}`,
      };
    }
  }

  /**
   * Restore Mailchimp triggers on service startup
   */
  async restoreActiveTriggers(): Promise<void> {
    try {
      this.logger.log('Restoring active Mailchimp workflows...');

      // Find all active workflows with Mailchimp triggers
      const query = `
        SELECT id, canvas FROM workflows
        WHERE is_active = true
        AND (
          canvas->'nodes' @> '[{"type": "MAILCHIMP_TRIGGER"}]'::jsonb
          OR canvas->'nodes' @> '[{"type": "CONNECTOR_TRIGGER", "data": {"connectorType": "mailchimp"}}]'::jsonb
        )
      `;

      const result = await this.platformService.query(query);

      if (result.rows.length === 0) {
        this.logger.log('No active Mailchimp workflows to restore');
        return;
      }

      this.logger.log(`Found ${result.rows.length} active Mailchimp workflow(s) to restore`);

      for (const workflow of result.rows) {
        try {
          // Check if webhook already exists
          const canvas = workflow.canvas;
          const triggers = canvas?.nodes?.filter(
            (node: any) =>
              node.type === 'MAILCHIMP_TRIGGER' ||
              (node.type === 'CONNECTOR_TRIGGER' && node.data?.connectorType === 'mailchimp'),
          );

          const hasExistingWebhook = triggers?.some((t: any) => t.data?.webhookId);

          if (hasExistingWebhook) {
            this.logger.log(`Webhook already registered for workflow ${workflow.id}`);
          } else {
            this.logger.log(`Creating webhook for workflow ${workflow.id}`);
            await this.mailchimpWebhookService.createWebhook(workflow.id);
          }

          this.logger.log(`Restored Mailchimp trigger for workflow ${workflow.id}`);
        } catch (error) {
          this.logger.error(
            `Failed to restore Mailchimp trigger for workflow ${workflow.id}: ${error.message}`,
          );
        }
      }

      this.logger.log(`Successfully restored ${result.rows.length} Mailchimp workflow(s)`);
    } catch (error) {
      this.logger.error(`Failed to restore Mailchimp triggers: ${error.message}`, error.stack);
    }
  }
}
