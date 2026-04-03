/**
 * Facebook Ads Trigger Service
 *
 * Manages Facebook Ads trigger activation, deactivation, and status for workflows.
 */
import { Injectable, Logger } from '@nestjs/common';
import {
  ITriggerService,
  TriggerType,
  TriggerActivationResult,
  TriggerDeactivationResult,
  TriggerStatus,
} from '../../../workflow/interfaces/trigger.interface';

interface FacebookAdsTriggerConfig {
  triggerId: string;
  adAccountId: string;
  pageId?: string;
  formId?: string;
}

@Injectable()
export class FacebookAdsTriggerService implements ITriggerService {
  private readonly logger = new Logger(FacebookAdsTriggerService.name);
  private activeTriggers: Map<string, FacebookAdsTriggerConfig> = new Map();

  /**
   * Activate a Facebook Ads trigger for a workflow
   */
  async activate(
    workflowId: string,
    triggerConfig: FacebookAdsTriggerConfig,
  ): Promise<TriggerActivationResult> {
    try {
      this.logger.log(`Activating Facebook Ads trigger for workflow: ${workflowId}`);

      if (!triggerConfig.triggerId) {
        return {
          success: false,
          message: 'Trigger ID is required',
          error: 'MISSING_TRIGGER_ID',
        };
      }

      // For new_lead trigger, require pageId and formId
      if (triggerConfig.triggerId === 'new_lead') {
        if (!triggerConfig.pageId || !triggerConfig.formId) {
          return {
            success: false,
            message: 'Page ID and Form ID are required for new_lead trigger',
            error: 'MISSING_PAGE_OR_FORM_ID',
          };
        }
      }

      // For other triggers, require adAccountId
      if (!triggerConfig.adAccountId) {
        return {
          success: false,
          message: 'Ad Account ID is required',
          error: 'MISSING_AD_ACCOUNT_ID',
        };
      }

      // Store the trigger configuration
      this.activeTriggers.set(workflowId, triggerConfig);

      this.logger.log(
        `Facebook Ads trigger ${triggerConfig.triggerId} activated for workflow ${workflowId}`,
      );

      return {
        success: true,
        message: 'Facebook Ads trigger activated successfully',
        data: {
          workflowId,
          triggerId: triggerConfig.triggerId,
          webhookEndpoint: `/webhooks/facebook-ads/${workflowId}`,
        },
      };
    } catch (error) {
      this.logger.error(
        `Failed to activate Facebook Ads trigger for workflow ${workflowId}: ${error.message}`,
      );
      return {
        success: false,
        message: 'Failed to activate Facebook Ads trigger',
        error: error.message,
      };
    }
  }

  /**
   * Deactivate a Facebook Ads trigger for a workflow
   */
  async deactivate(workflowId: string): Promise<TriggerDeactivationResult> {
    try {
      this.logger.log(`Deactivating Facebook Ads trigger for workflow: ${workflowId}`);

      if (!this.activeTriggers.has(workflowId)) {
        return {
          success: false,
          message: 'No active trigger found for this workflow',
        };
      }

      this.activeTriggers.delete(workflowId);

      this.logger.log(`Facebook Ads trigger deactivated for workflow ${workflowId}`);

      return {
        success: true,
        message: 'Facebook Ads trigger deactivated successfully',
      };
    } catch (error) {
      this.logger.error(
        `Failed to deactivate Facebook Ads trigger for workflow ${workflowId}: ${error.message}`,
      );
      return {
        success: false,
        message: 'Failed to deactivate Facebook Ads trigger',
      };
    }
  }

  /**
   * Get the status of a Facebook Ads trigger for a workflow
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
      message: 'Facebook Ads trigger is active',
      metadata: {
        triggerId: config.triggerId,
        adAccountId: config.adAccountId,
        pageId: config.pageId,
        formId: config.formId,
      },
    };
  }

  /**
   * Get the trigger type identifier
   */
  getTriggerType(): TriggerType {
    return TriggerType.FACEBOOK_ADS;
  }

  /**
   * Get the trigger configuration for a workflow (internal use)
   */
  getTriggerConfig(workflowId: string): FacebookAdsTriggerConfig | undefined {
    return this.activeTriggers.get(workflowId);
  }
}
