/**
 * Klaviyo Trigger Service
 *
 * Manages Klaviyo trigger activation, deactivation, and status for workflows.
 */
import { Injectable, Logger } from '@nestjs/common';
import {
  ITriggerService,
  TriggerType,
  TriggerActivationResult,
  TriggerDeactivationResult,
  TriggerStatus,
} from '../../../workflow/interfaces/trigger.interface';

interface KlaviyoTriggerConfig {
  triggerId: string;
  listId?: string;
  metricId?: string;
  flowId?: string;
  campaignId?: string;
}

@Injectable()
export class KlaviyoTriggerService implements ITriggerService {
  private readonly logger = new Logger(KlaviyoTriggerService.name);
  private activeTriggers: Map<string, KlaviyoTriggerConfig> = new Map();

  /**
   * Activate a Klaviyo trigger for a workflow
   */
  async activate(
    workflowId: string,
    triggerConfig: KlaviyoTriggerConfig,
  ): Promise<TriggerActivationResult> {
    try {
      this.logger.log(`Activating Klaviyo trigger for workflow: ${workflowId}`);

      if (!triggerConfig.triggerId) {
        return {
          success: false,
          message: 'Trigger ID is required',
          error: 'MISSING_TRIGGER_ID',
        };
      }

      // Validate trigger-specific requirements
      const validationError = this.validateTriggerConfig(triggerConfig);
      if (validationError) {
        return {
          success: false,
          message: validationError,
          error: 'INVALID_CONFIG',
        };
      }

      // Store the trigger configuration
      this.activeTriggers.set(workflowId, triggerConfig);

      this.logger.log(
        `Klaviyo trigger ${triggerConfig.triggerId} activated for workflow ${workflowId}`,
      );

      return {
        success: true,
        message: 'Klaviyo trigger activated successfully',
        data: {
          workflowId,
          triggerId: triggerConfig.triggerId,
          webhookEndpoint: `/webhooks/klaviyo/${workflowId}`,
        },
      };
    } catch (error) {
      this.logger.error(
        `Failed to activate Klaviyo trigger for workflow ${workflowId}: ${error.message}`,
      );
      return {
        success: false,
        message: 'Failed to activate Klaviyo trigger',
        error: error.message,
      };
    }
  }

  /**
   * Deactivate a Klaviyo trigger for a workflow
   */
  async deactivate(workflowId: string): Promise<TriggerDeactivationResult> {
    try {
      this.logger.log(`Deactivating Klaviyo trigger for workflow: ${workflowId}`);

      if (!this.activeTriggers.has(workflowId)) {
        return {
          success: false,
          message: 'No active trigger found for this workflow',
        };
      }

      this.activeTriggers.delete(workflowId);

      this.logger.log(`Klaviyo trigger deactivated for workflow ${workflowId}`);

      return {
        success: true,
        message: 'Klaviyo trigger deactivated successfully',
      };
    } catch (error) {
      this.logger.error(
        `Failed to deactivate Klaviyo trigger for workflow ${workflowId}: ${error.message}`,
      );
      return {
        success: false,
        message: 'Failed to deactivate Klaviyo trigger',
      };
    }
  }

  /**
   * Get the status of a Klaviyo trigger for a workflow
   */
  async getStatus(workflowId: string): Promise<TriggerStatus> {
    const config = this.activeTriggers.get(workflowId);

    if (!config) {
      return {
        active: false,
        type: this.getTriggerType(),
        message: 'No active trigger found for this workflow',
      };
    }

    return {
      active: true,
      type: this.getTriggerType(),
      message: 'Klaviyo trigger is active',
      metadata: {
        triggerId: config.triggerId,
        listId: config.listId,
        metricId: config.metricId,
        flowId: config.flowId,
        campaignId: config.campaignId,
      },
    };
  }

  /**
   * Get the trigger type identifier
   */
  getTriggerType(): TriggerType {
    return TriggerType.KLAVIYO;
  }

  /**
   * Get the trigger configuration for a workflow (internal use)
   */
  getTriggerConfig(workflowId: string): KlaviyoTriggerConfig | undefined {
    return this.activeTriggers.get(workflowId);
  }

  /**
   * Validate trigger-specific configuration requirements
   */
  private validateTriggerConfig(config: KlaviyoTriggerConfig): string | null {
    switch (config.triggerId) {
      case 'list_member_added':
      case 'list_member_removed':
        if (!config.listId) {
          return 'List ID is required for list member triggers';
        }
        break;
      case 'flow_triggered':
        if (!config.flowId) {
          return 'Flow ID is required for flow_triggered trigger';
        }
        break;
      case 'campaign_sent':
        if (!config.campaignId) {
          return 'Campaign ID is required for campaign_sent trigger';
        }
        break;
      // profile_created, profile_updated, event_tracked don't require additional config
    }
    return null;
  }
}
