import { Injectable, Logger, Inject, forwardRef } from '@nestjs/common';
import { PlatformService } from '../../../../database/platform.service';
import { WorkflowService } from '../../../workflow/workflow.service';
import { PipedriveWebhookService } from './pipedrive-webhook.service';
import {
  ITriggerService,
  TriggerType,
  TriggerActivationResult,
  TriggerDeactivationResult,
  TriggerStatus,
} from '../../../workflow/interfaces/trigger.interface';

/**
 * Pipedrive Trigger Service
 *
 * Handles Pipedrive-specific trigger logic including:
 * - Webhook creation/deletion on activation/deactivation
 * - Status tracking
 */
@Injectable()
export class PipedriveTriggerService implements ITriggerService {
  private readonly logger = new Logger(PipedriveTriggerService.name);

  constructor(
    private readonly platformService: PlatformService,
    @Inject(forwardRef(() => WorkflowService))
    private readonly workflowService: WorkflowService,
    private readonly pipedriveWebhookService: PipedriveWebhookService,
  ) {}

  getTriggerType(): TriggerType {
    return TriggerType.PIPEDRIVE;
  }

  /**
   * Activate Pipedrive trigger for a workflow
   * Creates webhook on Pipedrive
   */
  async activate(workflowId: string, triggerConfig: any): Promise<TriggerActivationResult> {
    try {
      this.logger.log(`Activating Pipedrive trigger for workflow: ${workflowId}`);
      this.logger.debug(`Trigger config: ${JSON.stringify(triggerConfig)}`);

      // Extract credential ID from config
      const credentialId = triggerConfig.credentialId || triggerConfig.connectorConfigId;
      if (!credentialId) {
        return {
          success: false,
          message: 'Pipedrive credential not selected',
          error: 'Missing credentialId in trigger configuration',
        };
      }

      // Extract trigger params from config
      const triggerParams = triggerConfig.triggerParams || triggerConfig.actionParams || {};
      const triggerId = triggerConfig.triggerId;

      if (!triggerId) {
        return {
          success: false,
          message: 'Pipedrive trigger not fully configured',
          error: 'Missing triggerId in trigger parameters',
        };
      }

      this.logger.log(`Creating Pipedrive webhook for trigger: ${triggerId}`);

      // Create webhook via Pipedrive Webhook Service
      const webhookResult = await this.pipedriveWebhookService.createWebhook(workflowId);

      if (!webhookResult.success) {
        return {
          success: false,
          message: 'Failed to create Pipedrive webhook',
          error: webhookResult.error || 'Unknown error',
        };
      }

      this.logger.log(`Pipedrive webhook created successfully for workflow: ${workflowId}`);

      return {
        success: true,
        message: 'Pipedrive webhook created successfully',
        data: {
          triggerId: triggerConfig.triggerId,
          webhooks: webhookResult.webhooks,
        },
      };
    } catch (error) {
      this.logger.error(`Failed to activate Pipedrive trigger: ${error.message}`, error.stack);
      return {
        success: false,
        message: 'Failed to activate Pipedrive trigger',
        error: error.message,
      };
    }
  }

  /**
   * Deactivate Pipedrive trigger for a workflow
   * Deletes webhook from Pipedrive
   */
  async deactivate(workflowId: string): Promise<TriggerDeactivationResult> {
    try {
      this.logger.log(`Deactivating Pipedrive trigger for workflow: ${workflowId}`);

      // Delete webhook via Pipedrive Webhook Service
      const deleteResult = await this.pipedriveWebhookService.deleteWebhook(workflowId);

      if (!deleteResult.success) {
        this.logger.warn(`Failed to delete some Pipedrive webhooks: ${JSON.stringify(deleteResult)}`);
      }

      return {
        success: true,
        message: 'Pipedrive trigger deactivated successfully',
      };
    } catch (error) {
      this.logger.error(`Failed to deactivate Pipedrive trigger: ${error.message}`, error.stack);
      return {
        success: false,
        message: `Failed to deactivate Pipedrive trigger: ${error.message}`,
      };
    }
  }

  /**
   * Get Pipedrive trigger status for a workflow
   */
  async getStatus(workflowId: string): Promise<TriggerStatus> {
    try {
      // Check if workflow has active Pipedrive triggers
      const query = `
        SELECT canvas FROM workflows WHERE id = $1
      `;
      const result = await this.platformService.query(query, [workflowId]);

      if (result.rows.length === 0) {
        return {
          active: false,
          type: TriggerType.PIPEDRIVE,
          message: 'Workflow not found',
        };
      }

      const canvas = result.rows[0].canvas;
      const pipedriveTriggers = canvas?.nodes?.filter(
        (node: any) =>
          node.type === 'PIPEDRIVE_TRIGGER' ||
          (node.type === 'CONNECTOR_TRIGGER' && node.data?.connectorType === 'pipedrive'),
      );

      if (!pipedriveTriggers || pipedriveTriggers.length === 0) {
        return {
          active: false,
          type: TriggerType.PIPEDRIVE,
          message: 'No Pipedrive triggers found',
        };
      }

      // Check if webhooks are registered
      const hasWebhooks = pipedriveTriggers.some((trigger: any) => trigger.data?.webhookId);

      return {
        active: hasWebhooks,
        type: TriggerType.PIPEDRIVE,
        message: hasWebhooks ? 'Pipedrive webhooks active' : 'Pipedrive webhooks not registered',
        metadata: {
          triggerCount: pipedriveTriggers.length,
          webhookCount: pipedriveTriggers.filter((t: any) => t.data?.webhookId).length,
        },
      };
    } catch (error) {
      this.logger.error(`Failed to get Pipedrive trigger status: ${error.message}`, error.stack);
      return {
        active: false,
        type: TriggerType.PIPEDRIVE,
        message: `Error checking status: ${error.message}`,
      };
    }
  }

  /**
   * Restore Pipedrive triggers on service startup
   */
  async restoreActiveTriggers(): Promise<void> {
    try {
      this.logger.log('Restoring active Pipedrive workflows...');

      // Find all active workflows with Pipedrive triggers
      const query = `
        SELECT id, canvas FROM workflows
        WHERE is_active = true
        AND (
          canvas->'nodes' @> '[{"type": "PIPEDRIVE_TRIGGER"}]'::jsonb
          OR canvas->'nodes' @> '[{"type": "CONNECTOR_TRIGGER", "data": {"connectorType": "pipedrive"}}]'::jsonb
        )
      `;

      const result = await this.platformService.query(query);

      if (result.rows.length === 0) {
        this.logger.log('No active Pipedrive workflows to restore');
        return;
      }

      this.logger.log(`Found ${result.rows.length} active Pipedrive workflow(s) to restore`);

      for (const workflow of result.rows) {
        try {
          // Check if webhook already exists
          const canvas = workflow.canvas;
          const triggers = canvas?.nodes?.filter(
            (node: any) =>
              node.type === 'PIPEDRIVE_TRIGGER' ||
              (node.type === 'CONNECTOR_TRIGGER' && node.data?.connectorType === 'pipedrive'),
          );

          const hasExistingWebhook = triggers?.some((t: any) => t.data?.webhookId);

          if (hasExistingWebhook) {
            this.logger.log(`Webhook already registered for workflow ${workflow.id}`);
          } else {
            this.logger.log(`Creating webhook for workflow ${workflow.id}`);
            await this.pipedriveWebhookService.createWebhook(workflow.id);
          }

          this.logger.log(`Restored Pipedrive trigger for workflow ${workflow.id}`);
        } catch (error) {
          this.logger.error(
            `Failed to restore Pipedrive trigger for workflow ${workflow.id}: ${error.message}`,
          );
        }
      }

      this.logger.log(`Successfully restored ${result.rows.length} Pipedrive workflow(s)`);
    } catch (error) {
      this.logger.error(`Failed to restore Pipedrive triggers: ${error.message}`, error.stack);
    }
  }
}
