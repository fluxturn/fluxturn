/**
 * Zoho CRM Trigger Service
 *
 * Implements ITriggerService for Zoho CRM webhook-based triggers.
 * Zoho CRM can send webhooks for various CRM events.
 *
 * Supported triggers:
 * - record_created: Triggered when a record is created in any module
 * - record_updated: Triggered when a record is updated
 * - deal_stage_changed: Triggered when a deal stage is changed
 * - lead_converted: Triggered when a lead is converted
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
export class ZohoTriggerService implements ITriggerService {
  private readonly logger = new Logger(ZohoTriggerService.name);

  constructor(
    private readonly platformService: PlatformService,
    @Inject(forwardRef(() => WorkflowService))
    private readonly workflowService: WorkflowService,
  ) {}

  getTriggerType(): TriggerType {
    return TriggerType.ZOHO;
  }

  async activate(workflowId: string, triggerConfig: any): Promise<TriggerActivationResult> {
    try {
      this.logger.log(`Activating Zoho CRM trigger for workflow: ${workflowId}`);

      // Get credential ID from trigger config
      const credentialId = triggerConfig.credentialId || triggerConfig.connectorConfigId;
      if (!credentialId) {
        return {
          success: false,
          message: 'Zoho CRM credential not selected',
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
          message: 'Zoho CRM credential not found',
          error: `Connector config ${credentialId} not found`,
        };
      }

      const credentials = credentialResult.rows[0].credentials;
      if (!credentials?.accessToken && !credentials?.access_token) {
        return {
          success: false,
          message: 'Invalid Zoho CRM credentials',
          error: 'OAuth access token is required',
        };
      }

      // Get the trigger type from config
      const triggerId = triggerConfig.triggerId || triggerConfig.trigger_id || 'record_created';
      const module = triggerConfig.module || 'All';
      const apiDomain = credentials.apiDomain || credentials.api_domain || 'com';

      // Build webhook URL
      const appBaseUrl = process.env.APP_BASE_URL || 'http://localhost:5005';
      const webhookUrl = `${appBaseUrl}/webhooks/zoho/${workflowId}`;

      // Store webhook configuration in workflow metadata
      await this.storeWebhookConfig(workflowId, {
        credentialId,
        webhookUrl,
        triggerId,
        module,
        apiDomain,
        activatedAt: new Date().toISOString(),
        triggerTypes: this.getTriggerEventTypes(triggerId),
      });

      this.logger.log(`Zoho CRM trigger activated for workflow ${workflowId}`);

      return {
        success: true,
        message: 'Zoho CRM trigger activated successfully. Configure webhook in Zoho CRM settings.',
        data: {
          webhookUrl,
          triggerId,
          module,
          triggerTypes: this.getTriggerEventTypes(triggerId),
          setupInstructions: `
1. Go to Zoho CRM Settings: https://crm.zoho.${apiDomain}/crm/org/settings/automation/workflow-rules
2. Create a new Workflow Rule or Webhook
3. Select the module you want to monitor (${module})
4. Choose the trigger event (${this.getTriggerDescription(triggerId)})
5. Add a webhook action with URL: ${webhookUrl}
6. Set the HTTP method to POST
7. Configure the payload to include record data
8. Save and activate the workflow rule
          `.trim(),
        },
      };
    } catch (error) {
      this.logger.error(`Failed to activate Zoho CRM trigger: ${error.message}`, error.stack);
      return {
        success: false,
        message: 'Failed to activate Zoho CRM trigger',
        error: error.message,
      };
    }
  }

  async deactivate(workflowId: string): Promise<TriggerDeactivationResult> {
    try {
      this.logger.log(`Deactivating Zoho CRM trigger for workflow: ${workflowId}`);

      // Get stored webhook config
      const webhookConfig = await this.getWebhookConfig(workflowId);

      if (!webhookConfig) {
        this.logger.log(`No Zoho CRM webhook config found for workflow ${workflowId}`);
        return {
          success: true,
          message: 'Zoho CRM trigger deactivated (no webhook configured)',
        };
      }

      // Clear webhook config from workflow metadata
      await this.platformService.query(
        `UPDATE workflows
         SET trigger_metadata = trigger_metadata - 'zoho_webhook'
         WHERE id = $1`,
        [workflowId],
      );

      this.logger.log(`Zoho CRM trigger deactivated for workflow ${workflowId}`);

      return {
        success: true,
        message: 'Zoho CRM trigger deactivated successfully. Remember to remove the webhook from Zoho CRM settings.',
      };
    } catch (error) {
      this.logger.error(`Failed to deactivate Zoho CRM trigger: ${error.message}`, error.stack);
      return {
        success: false,
        message: 'Failed to deactivate Zoho CRM trigger',
      };
    }
  }

  async getStatus(workflowId: string): Promise<TriggerStatus> {
    try {
      const webhookConfig = await this.getWebhookConfig(workflowId);

      if (!webhookConfig) {
        return {
          active: false,
          type: TriggerType.ZOHO,
          message: 'No webhook configured',
        };
      }

      return {
        active: true,
        type: TriggerType.ZOHO,
        message: 'Webhook configured',
        metadata: {
          webhookUrl: webhookConfig.webhookUrl,
          triggerId: webhookConfig.triggerId,
          module: webhookConfig.module,
          apiDomain: webhookConfig.apiDomain,
          activatedAt: webhookConfig.activatedAt,
        },
      };
    } catch (error) {
      this.logger.error(`Failed to get Zoho CRM trigger status: ${error.message}`);
      return {
        active: false,
        type: TriggerType.ZOHO,
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
      [workflowId, JSON.stringify({ zoho_webhook: config })],
    );
  }

  /**
   * Get webhook configuration from workflow metadata
   */
  async getWebhookConfig(workflowId: string): Promise<any | null> {
    const result = await this.platformService.query(
      `SELECT trigger_metadata->'zoho_webhook' as webhook_config FROM workflows WHERE id = $1`,
      [workflowId],
    );

    if (!result.rows.length || !result.rows[0].webhook_config) {
      return null;
    }

    return result.rows[0].webhook_config;
  }

  /**
   * Get trigger event types for selected trigger
   */
  private getTriggerEventTypes(triggerId: string): string[] {
    const eventMap: Record<string, string[]> = {
      record_created: ['zoho_webhook', 'record.created'],
      record_updated: ['zoho_webhook', 'record.updated'],
      deal_stage_changed: ['zoho_webhook', 'deal.stage_changed'],
      lead_converted: ['zoho_webhook', 'lead.converted'],
    };
    return eventMap[triggerId] || ['zoho_webhook', triggerId];
  }

  /**
   * Get human-readable description for trigger
   */
  private getTriggerDescription(triggerId: string): string {
    const descriptionMap: Record<string, string> = {
      record_created: 'Record Created',
      record_updated: 'Record Updated',
      deal_stage_changed: 'Deal Stage Changed',
      lead_converted: 'Lead Converted',
    };
    return descriptionMap[triggerId] || triggerId;
  }
}
