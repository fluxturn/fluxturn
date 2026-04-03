/**
 * Segment Trigger Service
 *
 * Implements ITriggerService for Segment webhook-based triggers.
 * Segment can send webhooks via Destinations (webhook destination) or
 * through Personas/Engage for audience-based triggers.
 *
 * Supported triggers:
 * - audience_entered: When a user enters a Segment audience
 * - audience_exited: When a user exits a Segment audience
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
export class SegmentTriggerService implements ITriggerService {
  private readonly logger = new Logger(SegmentTriggerService.name);

  constructor(
    private readonly platformService: PlatformService,
    @Inject(forwardRef(() => WorkflowService))
    private readonly workflowService: WorkflowService,
  ) {}

  getTriggerType(): TriggerType {
    return TriggerType.SEGMENT;
  }

  async activate(workflowId: string, triggerConfig: any): Promise<TriggerActivationResult> {
    try {
      this.logger.log(`Activating Segment trigger for workflow: ${workflowId}`);

      // Get credential ID from trigger config
      const credentialId = triggerConfig.credentialId || triggerConfig.connectorConfigId;
      if (!credentialId) {
        return {
          success: false,
          message: 'Segment credential not selected',
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
          message: 'Segment credential not found',
          error: `Connector config ${credentialId} not found`,
        };
      }

      const credentials = credentialResult.rows[0].credentials;
      if (!credentials?.writeKey) {
        return {
          success: false,
          message: 'Invalid Segment credentials',
          error: 'writeKey is required',
        };
      }

      // Get the trigger type from config
      const triggerId = triggerConfig.triggerId || triggerConfig.trigger_id || 'audience_entered';

      // Build webhook URL
      const appBaseUrl = process.env.APP_BASE_URL || 'http://localhost:5005';
      const webhookUrl = `${appBaseUrl}/webhooks/segment/${workflowId}`;

      // Store webhook configuration in workflow metadata
      await this.storeWebhookConfig(workflowId, {
        credentialId,
        webhookUrl,
        triggerId,
        workspaceId: credentials.workspace_id,
        activatedAt: new Date().toISOString(),
        triggerTypes: this.getTriggerEventTypes(triggerId),
      });

      this.logger.log(`Segment trigger activated for workflow ${workflowId}`);

      return {
        success: true,
        message: 'Segment trigger activated successfully. Configure webhook destination in Segment.',
        data: {
          webhookUrl,
          triggerId,
          triggerTypes: this.getTriggerEventTypes(triggerId),
          setupInstructions: `
1. Go to Segment workspace > Connections > Destinations
2. Add a new "Webhooks (Actions)" destination
3. Configure the webhook URL: ${webhookUrl}
4. For audience triggers, go to Engage > Audiences
5. Select your audience and add the webhook as a destination
6. Events will be sent when users enter/exit the audience
          `.trim(),
        },
      };
    } catch (error) {
      this.logger.error(`Failed to activate Segment trigger: ${error.message}`, error.stack);
      return {
        success: false,
        message: 'Failed to activate Segment trigger',
        error: error.message,
      };
    }
  }

  async deactivate(workflowId: string): Promise<TriggerDeactivationResult> {
    try {
      this.logger.log(`Deactivating Segment trigger for workflow: ${workflowId}`);

      // Get stored webhook config
      const webhookConfig = await this.getWebhookConfig(workflowId);

      if (!webhookConfig) {
        this.logger.log(`No Segment webhook config found for workflow ${workflowId}`);
        return {
          success: true,
          message: 'Segment trigger deactivated (no webhook configured)',
        };
      }

      // Clear webhook config from workflow metadata
      await this.platformService.query(
        `UPDATE workflows
         SET trigger_metadata = trigger_metadata - 'segment_webhook'
         WHERE id = $1`,
        [workflowId],
      );

      this.logger.log(`Segment trigger deactivated for workflow ${workflowId}`);

      return {
        success: true,
        message: 'Segment trigger deactivated successfully. Remember to remove the webhook destination from Segment.',
      };
    } catch (error) {
      this.logger.error(`Failed to deactivate Segment trigger: ${error.message}`, error.stack);
      return {
        success: false,
        message: 'Failed to deactivate Segment trigger',
      };
    }
  }

  async getStatus(workflowId: string): Promise<TriggerStatus> {
    try {
      const webhookConfig = await this.getWebhookConfig(workflowId);

      if (!webhookConfig) {
        return {
          active: false,
          type: TriggerType.SEGMENT,
          message: 'No webhook configured',
        };
      }

      return {
        active: true,
        type: TriggerType.SEGMENT,
        message: 'Webhook configured',
        metadata: {
          webhookUrl: webhookConfig.webhookUrl,
          triggerId: webhookConfig.triggerId,
          triggerTypes: webhookConfig.triggerTypes,
          workspaceId: webhookConfig.workspaceId,
          activatedAt: webhookConfig.activatedAt,
        },
      };
    } catch (error) {
      this.logger.error(`Failed to get Segment trigger status: ${error.message}`);
      return {
        active: false,
        type: TriggerType.SEGMENT,
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
      [workflowId, JSON.stringify({ segment_webhook: config })],
    );
  }

  /**
   * Get webhook configuration from workflow metadata
   */
  async getWebhookConfig(workflowId: string): Promise<any | null> {
    const result = await this.platformService.query(
      `SELECT trigger_metadata->'segment_webhook' as webhook_config FROM workflows WHERE id = $1`,
      [workflowId],
    );

    if (!result.rows.length || !result.rows[0].webhook_config) {
      return null;
    }

    return result.rows[0].webhook_config;
  }

  /**
   * Get Segment event types for a trigger ID
   */
  private getTriggerEventTypes(triggerId: string): string[] {
    const triggerIdToEvents: Record<string, string[]> = {
      audience_entered: ['segment:audience_entered', 'track', 'Audience Entered'],
      audience_exited: ['segment:audience_exited', 'track', 'Audience Exited'],
    };

    if (triggerId && triggerIdToEvents[triggerId]) {
      return triggerIdToEvents[triggerId];
    }

    // Default to audience entered events
    return ['segment:audience_entered', 'track'];
  }
}
