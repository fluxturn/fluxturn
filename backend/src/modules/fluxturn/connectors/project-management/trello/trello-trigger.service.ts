import { Injectable, Logger, Inject, forwardRef } from '@nestjs/common';
import { PlatformService } from '../../../../database/platform.service';
import { WorkflowService } from '../../../workflow/workflow.service';
import { TrelloWebhookService } from './trello-webhook.service';
import {
  ITriggerService,
  TriggerType,
  TriggerActivationResult,
  TriggerDeactivationResult,
  TriggerStatus,
} from '../../../workflow/interfaces/trigger.interface';

/**
 * Trello Trigger Service
 *
 * Handles Trello-specific trigger logic including:
 * - Webhook creation/deletion on activation/deactivation
 * - Status tracking
 */
@Injectable()
export class TrelloTriggerService implements ITriggerService {
  private readonly logger = new Logger(TrelloTriggerService.name);

  constructor(
    private readonly platformService: PlatformService,
    @Inject(forwardRef(() => WorkflowService))
    private readonly workflowService: WorkflowService,
    private readonly trelloWebhookService: TrelloWebhookService,
  ) {}

  getTriggerType(): TriggerType {
    return TriggerType.TRELLO;
  }

  /**
   * Activate Trello trigger for a workflow
   * Creates webhook on Trello
   */
  async activate(workflowId: string, triggerConfig: any): Promise<TriggerActivationResult> {
    try {
      this.logger.log(`Activating Trello trigger for workflow: ${workflowId}`);
      this.logger.debug(`Trigger config: ${JSON.stringify(triggerConfig)}`);

      // Extract credential ID from config
      const credentialId = triggerConfig.credentialId || triggerConfig.connectorConfigId;
      if (!credentialId) {
        return {
          success: false,
          message: 'Trello credential not selected',
          error: 'Missing credentialId in trigger configuration',
        };
      }

      // Extract trigger params from config
      const triggerParams = triggerConfig.triggerParams || triggerConfig.actionParams || {};
      if (!triggerParams.boardId) {
        return {
          success: false,
          message: 'Trello trigger not fully configured',
          error: 'Missing boardId in trigger parameters',
        };
      }

      this.logger.log(`Creating Trello webhook for board ${triggerParams.boardId}`);

      // Create webhook via Trello Webhook Service
      const webhookResult = await this.trelloWebhookService.createWebhook(workflowId);

      if (!webhookResult.success) {
        return {
          success: false,
          message: 'Failed to create Trello webhook',
          error: webhookResult.error || 'Unknown error',
        };
      }

      this.logger.log(`Trello webhook created successfully for workflow: ${workflowId}`);

      return {
        success: true,
        message: 'Trello webhook created successfully',
        data: {
          triggerId: triggerConfig.triggerId,
          webhooks: webhookResult.webhooks,
          boardId: triggerParams.boardId,
        },
      };
    } catch (error) {
      this.logger.error(`Failed to activate Trello trigger: ${error.message}`, error.stack);
      return {
        success: false,
        message: 'Failed to activate Trello trigger',
        error: error.message,
      };
    }
  }

  /**
   * Deactivate Trello trigger for a workflow
   * Deletes webhook from Trello
   */
  async deactivate(workflowId: string): Promise<TriggerDeactivationResult> {
    try {
      this.logger.log(`Deactivating Trello trigger for workflow: ${workflowId}`);

      // Delete webhook via Trello Webhook Service
      const deleteResult = await this.trelloWebhookService.deleteWebhook(workflowId);

      if (!deleteResult.success) {
        this.logger.warn(`Failed to delete some Trello webhooks: ${JSON.stringify(deleteResult)}`);
      }

      return {
        success: true,
        message: 'Trello trigger deactivated successfully',
      };
    } catch (error) {
      this.logger.error(`Failed to deactivate Trello trigger: ${error.message}`, error.stack);
      return {
        success: false,
        message: `Failed to deactivate Trello trigger: ${error.message}`,
      };
    }
  }

  /**
   * Get Trello trigger status for a workflow
   */
  async getStatus(workflowId: string): Promise<TriggerStatus> {
    try {
      // Check if workflow has active Trello triggers
      const query = `
        SELECT canvas FROM workflows WHERE id = $1
      `;
      const result = await this.platformService.query(query, [workflowId]);

      if (result.rows.length === 0) {
        return {
          active: false,
          type: TriggerType.TRELLO,
          message: 'Workflow not found',
        };
      }

      const canvas = result.rows[0].canvas;
      const trelloTriggers = canvas?.nodes?.filter(
        (node: any) =>
          node.type === 'TRELLO_TRIGGER' ||
          (node.type === 'CONNECTOR_TRIGGER' && node.data?.connectorType === 'trello'),
      );

      if (!trelloTriggers || trelloTriggers.length === 0) {
        return {
          active: false,
          type: TriggerType.TRELLO,
          message: 'No Trello triggers found',
        };
      }

      // Check if webhooks are registered
      const hasWebhooks = trelloTriggers.some((trigger: any) => trigger.data?.webhookId);

      return {
        active: hasWebhooks,
        type: TriggerType.TRELLO,
        message: hasWebhooks ? 'Trello webhooks active' : 'Trello webhooks not registered',
        metadata: {
          triggerCount: trelloTriggers.length,
          webhookCount: trelloTriggers.filter((t: any) => t.data?.webhookId).length,
        },
      };
    } catch (error) {
      this.logger.error(`Failed to get Trello trigger status: ${error.message}`, error.stack);
      return {
        active: false,
        type: TriggerType.TRELLO,
        message: `Error checking status: ${error.message}`,
      };
    }
  }

  /**
   * Restore Trello triggers on service startup
   */
  async restoreActiveTriggers(): Promise<void> {
    try {
      this.logger.log('Restoring active Trello workflows...');

      // Find all active workflows with Trello triggers
      const query = `
        SELECT id, canvas FROM workflows
        WHERE is_active = true
        AND (
          canvas->'nodes' @> '[{"type": "TRELLO_TRIGGER"}]'::jsonb
          OR canvas->'nodes' @> '[{"type": "CONNECTOR_TRIGGER", "data": {"connectorType": "trello"}}]'::jsonb
        )
      `;

      const result = await this.platformService.query(query);

      if (result.rows.length === 0) {
        this.logger.log('No active Trello workflows to restore');
        return;
      }

      this.logger.log(`Found ${result.rows.length} active Trello workflow(s) to restore`);

      for (const workflow of result.rows) {
        try {
          // Check if webhook already exists
          const canvas = workflow.canvas;
          const triggers = canvas?.nodes?.filter(
            (node: any) =>
              node.type === 'TRELLO_TRIGGER' ||
              (node.type === 'CONNECTOR_TRIGGER' && node.data?.connectorType === 'trello'),
          );

          const hasExistingWebhook = triggers?.some((t: any) => t.data?.webhookId);

          if (hasExistingWebhook) {
            this.logger.log(`Webhook already registered for workflow ${workflow.id}`);
          } else {
            this.logger.log(`Creating webhook for workflow ${workflow.id}`);
            await this.trelloWebhookService.createWebhook(workflow.id);
          }

          this.logger.log(`Restored Trello trigger for workflow ${workflow.id}`);
        } catch (error) {
          this.logger.error(
            `Failed to restore Trello trigger for workflow ${workflow.id}: ${error.message}`,
          );
        }
      }

      this.logger.log(`Successfully restored ${result.rows.length} Trello workflow(s)`);
    } catch (error) {
      this.logger.error(`Failed to restore Trello triggers: ${error.message}`, error.stack);
    }
  }
}
