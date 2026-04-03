import { Injectable, Logger, Inject, forwardRef } from '@nestjs/common';
import { PlatformService } from '../../../../database/platform.service';
import { WorkflowService } from '../../../workflow/workflow.service';
import { HubSpotWebhookService } from './hubspot-webhook.service';
import {
  ITriggerService,
  TriggerType,
  TriggerActivationResult,
  TriggerDeactivationResult,
  TriggerStatus,
} from '../../../workflow/interfaces/trigger.interface';

/**
 * HubSpot Trigger Service
 *
 * Handles HubSpot-specific trigger logic including:
 * - Webhook subscription management on activation/deactivation
 * - Status tracking
 */
@Injectable()
export class HubSpotTriggerService implements ITriggerService {
  private readonly logger = new Logger(HubSpotTriggerService.name);

  constructor(
    private readonly platformService: PlatformService,
    @Inject(forwardRef(() => WorkflowService))
    private readonly workflowService: WorkflowService,
    private readonly hubspotWebhookService: HubSpotWebhookService,
  ) {}

  getTriggerType(): TriggerType {
    return TriggerType.HUBSPOT;
  }

  /**
   * Activate HubSpot trigger for a workflow
   */
  async activate(workflowId: string, triggerConfig: any): Promise<TriggerActivationResult> {
    try {
      this.logger.log(`Activating HubSpot trigger for workflow: ${workflowId}`);
      this.logger.debug(`Trigger config: ${JSON.stringify(triggerConfig)}`);

      // Extract credential ID from config
      const credentialId = triggerConfig.credentialId || triggerConfig.connectorConfigId;
      if (!credentialId) {
        return {
          success: false,
          message: 'HubSpot credential not selected',
          error: 'Missing credentialId in trigger configuration',
        };
      }

      // Extract trigger params from config
      const triggerParams = triggerConfig.triggerParams || triggerConfig.actionParams || {};
      const triggerId = triggerConfig.triggerId;

      if (!triggerId) {
        return {
          success: false,
          message: 'HubSpot trigger not fully configured',
          error: 'Missing triggerId in trigger parameters',
        };
      }

      this.logger.log(`Creating HubSpot webhook subscription for trigger: ${triggerId}`);

      // Create webhook via HubSpot Webhook Service
      const webhookResult = await this.hubspotWebhookService.createWebhook(workflowId);

      if (!webhookResult.success) {
        return {
          success: false,
          message: 'Failed to create HubSpot webhook subscription',
          error: webhookResult.error || 'Unknown error',
        };
      }

      this.logger.log(`HubSpot webhook created successfully for workflow: ${workflowId}`);

      return {
        success: true,
        message: 'HubSpot webhook subscription created successfully',
        data: {
          triggerId: triggerConfig.triggerId,
          webhooks: webhookResult.webhooks,
        },
      };
    } catch (error) {
      this.logger.error(`Failed to activate HubSpot trigger: ${error.message}`, error.stack);
      return {
        success: false,
        message: 'Failed to activate HubSpot trigger',
        error: error.message,
      };
    }
  }

  /**
   * Deactivate HubSpot trigger for a workflow
   */
  async deactivate(workflowId: string): Promise<TriggerDeactivationResult> {
    try {
      this.logger.log(`Deactivating HubSpot trigger for workflow: ${workflowId}`);

      // Delete webhook via HubSpot Webhook Service
      const deleteResult = await this.hubspotWebhookService.deleteWebhook(workflowId);

      if (!deleteResult.success) {
        this.logger.warn(`Failed to delete some HubSpot webhooks: ${JSON.stringify(deleteResult)}`);
      }

      return {
        success: true,
        message: 'HubSpot trigger deactivated successfully',
      };
    } catch (error) {
      this.logger.error(`Failed to deactivate HubSpot trigger: ${error.message}`, error.stack);
      return {
        success: false,
        message: `Failed to deactivate HubSpot trigger: ${error.message}`,
      };
    }
  }

  /**
   * Get HubSpot trigger status for a workflow
   */
  async getStatus(workflowId: string): Promise<TriggerStatus> {
    try {
      // Check if workflow has active HubSpot triggers
      const query = `
        SELECT canvas FROM workflows WHERE id = $1
      `;
      const result = await this.platformService.query(query, [workflowId]);

      if (result.rows.length === 0) {
        return {
          active: false,
          type: TriggerType.HUBSPOT,
          message: 'Workflow not found',
        };
      }

      const canvas = result.rows[0].canvas;
      const hubspotTriggers = canvas?.nodes?.filter(
        (node: any) =>
          node.type === 'HUBSPOT_TRIGGER' ||
          (node.type === 'CONNECTOR_TRIGGER' && node.data?.connectorType === 'hubspot'),
      );

      if (!hubspotTriggers || hubspotTriggers.length === 0) {
        return {
          active: false,
          type: TriggerType.HUBSPOT,
          message: 'No HubSpot triggers found',
        };
      }

      // Check if webhooks are configured
      const hasWebhooks = hubspotTriggers.some((trigger: any) => trigger.data?.webhookConfig);

      return {
        active: hasWebhooks,
        type: TriggerType.HUBSPOT,
        message: hasWebhooks ? 'HubSpot webhooks active' : 'HubSpot webhooks not configured',
        metadata: {
          triggerCount: hubspotTriggers.length,
          webhookCount: hubspotTriggers.filter((t: any) => t.data?.webhookConfig).length,
        },
      };
    } catch (error) {
      this.logger.error(`Failed to get HubSpot trigger status: ${error.message}`, error.stack);
      return {
        active: false,
        type: TriggerType.HUBSPOT,
        message: `Error checking status: ${error.message}`,
      };
    }
  }

  /**
   * Restore HubSpot triggers on service startup
   */
  async restoreActiveTriggers(): Promise<void> {
    try {
      this.logger.log('Restoring active HubSpot workflows...');

      // Find all active workflows with HubSpot triggers
      const query = `
        SELECT id, canvas FROM workflows
        WHERE is_active = true
        AND (
          canvas->'nodes' @> '[{"type": "HUBSPOT_TRIGGER"}]'::jsonb
          OR canvas->'nodes' @> '[{"type": "CONNECTOR_TRIGGER", "data": {"connectorType": "hubspot"}}]'::jsonb
        )
      `;

      const result = await this.platformService.query(query);

      if (result.rows.length === 0) {
        this.logger.log('No active HubSpot workflows to restore');
        return;
      }

      this.logger.log(`Found ${result.rows.length} active HubSpot workflow(s) to restore`);

      for (const workflow of result.rows) {
        try {
          // Check if webhook already configured
          const canvas = workflow.canvas;
          const triggers = canvas?.nodes?.filter(
            (node: any) =>
              node.type === 'HUBSPOT_TRIGGER' ||
              (node.type === 'CONNECTOR_TRIGGER' && node.data?.connectorType === 'hubspot'),
          );

          const hasExistingWebhook = triggers?.some((t: any) => t.data?.webhookConfig);

          if (hasExistingWebhook) {
            this.logger.log(`Webhook already configured for workflow ${workflow.id}`);
          } else {
            this.logger.log(`Creating webhook config for workflow ${workflow.id}`);
            await this.hubspotWebhookService.createWebhook(workflow.id);
          }

          this.logger.log(`Restored HubSpot trigger for workflow ${workflow.id}`);
        } catch (error) {
          this.logger.error(
            `Failed to restore HubSpot trigger for workflow ${workflow.id}: ${error.message}`,
          );
        }
      }

      this.logger.log(`Successfully restored ${result.rows.length} HubSpot workflow(s)`);
    } catch (error) {
      this.logger.error(`Failed to restore HubSpot triggers: ${error.message}`, error.stack);
    }
  }
}
