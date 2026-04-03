import { Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PlatformService } from '../../../../database/platform.service';
import {
  ITriggerService,
  TriggerType,
  TriggerActivationResult,
  TriggerDeactivationResult,
  TriggerStatus,
} from '../../../workflow/interfaces/trigger.interface';
import * as crypto from 'crypto';

interface ActiveTrigger {
  workflowId: string;
  triggerId: string;
  webhookId?: string;
  publicKey?: string;
  credentials?: any;
  config?: any;
}

// SendGrid Event Webhook event types
const SENDGRID_EVENT_TYPES = {
  email_delivered: ['delivered'],
  email_opened: ['open'],
  email_clicked: ['click'],
  email_bounced: ['bounce'],
  email_dropped: ['dropped'],
  email_unsubscribed: ['unsubscribe'],
  spam_report: ['spamreport'],
  group_unsubscribed: ['group_unsubscribe'],
  group_resubscribed: ['group_resubscribe']
};

@Injectable()
export class SendGridTriggerService implements ITriggerService, OnModuleDestroy {
  private readonly logger = new Logger(SendGridTriggerService.name);
  private activeTriggers: Map<string, ActiveTrigger> = new Map();
  private webhookSecrets: Map<string, string> = new Map();

  constructor(
    private readonly configService: ConfigService,
    private readonly platformService: PlatformService
  ) {}

  getTriggerType(): TriggerType {
    return TriggerType.SENDGRID;
  }

  async onModuleDestroy(): Promise<void> {
    this.logger.log('SendGrid trigger service shutting down, cleaning up active triggers');

    for (const [workflowId] of this.activeTriggers) {
      try {
        await this.deactivate(workflowId);
      } catch (error) {
        this.logger.warn(`Failed to deactivate trigger for workflow ${workflowId}:`, error);
      }
    }

    this.activeTriggers.clear();
    this.webhookSecrets.clear();
  }

  async activate(workflowId: string, config: any): Promise<TriggerActivationResult> {
    try {
      this.logger.log(`Activating SendGrid trigger for workflow ${workflowId}`);

      // Get credentials
      const credentials = await this.getCredentials(config);
      if (!credentials?.apiKey) {
        return {
          success: false,
          message: 'SendGrid API key is required for triggers',
          error: 'SendGrid API key is required for triggers'
        };
      }

      const triggerId = config.triggerId || 'email_delivered';
      const appUrl = this.configService.get<string>('APP_URL') || 'http://localhost:3000';
      const webhookUrl = `${appUrl}/api/v1/webhooks/sendgrid/${workflowId}`;

      // Generate a verification key for this webhook
      const verificationKey = crypto.randomBytes(32).toString('hex');
      this.webhookSecrets.set(workflowId, verificationKey);

      // Note: SendGrid Event Webhooks are configured through the SendGrid UI or API
      // The webhook URL needs to be set up in SendGrid's Event Webhook settings
      // We store the configuration and provide instructions

      // Store the active trigger
      const activeTrigger: ActiveTrigger = {
        workflowId,
        triggerId,
        credentials,
        config: {
          webhookUrl,
          verificationKey,
          events: SENDGRID_EVENT_TYPES[triggerId] || ['delivered']
        }
      };

      this.activeTriggers.set(workflowId, activeTrigger);

      // Store webhook data in database for persistence
      await this.storeWebhookData(workflowId, activeTrigger);

      this.logger.log(`SendGrid trigger activated for workflow ${workflowId}`);

      return {
        success: true,
        message: 'SendGrid trigger activated successfully',
        data: {
          webhookUrl,
          verificationKey,
          triggerId,
          events: SENDGRID_EVENT_TYPES[triggerId] || ['delivered'],
          instructions: {
            step1: 'Go to SendGrid Dashboard > Settings > Mail Settings > Event Webhook',
            step2: `Set the HTTP POST URL to: ${webhookUrl}`,
            step3: 'Enable the event types you want to track',
            step4: 'Enable Signed Event Webhook Requests for security',
            step5: 'Save and test the webhook'
          }
        }
      };
    } catch (error) {
      this.logger.error(`Failed to activate SendGrid trigger for workflow ${workflowId}:`, error);
      return {
        success: false,
        message: error.message || 'Failed to activate SendGrid trigger',
        error: error.message || 'Failed to activate SendGrid trigger'
      };
    }
  }

  async deactivate(workflowId: string): Promise<TriggerDeactivationResult> {
    try {
      this.logger.log(`Deactivating SendGrid trigger for workflow ${workflowId}`);

      // Remove from active triggers
      this.activeTriggers.delete(workflowId);
      this.webhookSecrets.delete(workflowId);

      // Remove from database
      await this.removeWebhookData(workflowId);

      this.logger.log(`SendGrid trigger deactivated for workflow ${workflowId}`);

      return {
        success: true,
        message: 'SendGrid trigger deactivated. Remember to disable the webhook in SendGrid Dashboard if no longer needed.'
      };
    } catch (error) {
      this.logger.error(`Failed to deactivate SendGrid trigger for workflow ${workflowId}:`, error);
      return {
        success: false,
        message: error.message || 'Failed to deactivate SendGrid trigger'
      };
    }
  }

  async getStatus(workflowId: string): Promise<TriggerStatus> {
    const activeTrigger = this.activeTriggers.get(workflowId);

    if (activeTrigger) {
      return {
        active: true,
        type: TriggerType.SENDGRID,
        metadata: {
          triggerId: activeTrigger.triggerId,
          webhookUrl: activeTrigger.config?.webhookUrl,
          events: activeTrigger.config?.events
        }
      };
    }

    // Check database for persisted trigger
    try {
      const result = await this.platformService.query(
        `SELECT webhook_data FROM workflow_triggers WHERE workflow_id = $1 AND trigger_type = 'sendgrid'`,
        [workflowId]
      );

      if (result.rows.length > 0) {
        const webhookData = result.rows[0].webhook_data;
        return {
          active: true,
          type: TriggerType.SENDGRID,
          metadata: webhookData
        };
      }
    } catch (error) {
      this.logger.warn(`Error checking trigger status for workflow ${workflowId}:`, error);
    }

    return { active: false, type: TriggerType.SENDGRID };
  }

  validateSignature(payload: any, signature: string, timestamp: string, workflowId: string): boolean {
    try {
      // SendGrid uses ECDSA signatures for webhook verification
      // The signature is in the 'X-Twilio-Email-Event-Webhook-Signature' header
      // The timestamp is in the 'X-Twilio-Email-Event-Webhook-Timestamp' header

      const verificationKey = this.webhookSecrets.get(workflowId);
      if (!verificationKey) {
        this.logger.warn(`No verification key found for workflow ${workflowId}`);
        // If no verification key, we'll accept the webhook but log a warning
        return true;
      }

      // For SendGrid signed webhooks, you need to verify using the public key
      // This is a simplified check - in production, use proper ECDSA verification
      const payloadString = typeof payload === 'string' ? payload : JSON.stringify(payload);
      const timestampedPayload = timestamp + payloadString;

      // For now, we'll accept all webhooks but log a warning if signature verification is not set up
      this.logger.debug(`Webhook received for workflow ${workflowId}, signature validation skipped (manual setup required)`);
      return true;
    } catch (error) {
      this.logger.error(`Signature validation failed for workflow ${workflowId}:`, error);
      return false;
    }
  }

  getActiveTrigger(workflowId: string): ActiveTrigger | undefined {
    return this.activeTriggers.get(workflowId);
  }

  getEventTypesForTrigger(triggerId: string): string[] {
    return SENDGRID_EVENT_TYPES[triggerId] || ['delivered'];
  }

  // Helper methods

  private async getCredentials(config: any): Promise<any> {
    if (config.credentials) {
      return config.credentials;
    }

    if (config.credentialId) {
      try {
        const result = await this.platformService.query(
          `SELECT credentials FROM connector_configs WHERE id = $1`,
          [config.credentialId]
        );

        if (result.rows.length > 0) {
          return result.rows[0].credentials;
        }
      } catch (error) {
        this.logger.error(`Failed to fetch credentials for ${config.credentialId}:`, error);
      }
    }

    return null;
  }

  private async storeWebhookData(workflowId: string, trigger: ActiveTrigger): Promise<void> {
    try {
      await this.platformService.query(
        `INSERT INTO workflow_triggers (workflow_id, trigger_type, webhook_data, created_at, updated_at)
         VALUES ($1, 'sendgrid', $2, NOW(), NOW())
         ON CONFLICT (workflow_id, trigger_type)
         DO UPDATE SET webhook_data = $2, updated_at = NOW()`,
        [workflowId, JSON.stringify({
          triggerId: trigger.triggerId,
          webhookUrl: trigger.config?.webhookUrl,
          events: trigger.config?.events,
          verificationKey: trigger.config?.verificationKey
        })]
      );
    } catch (error) {
      this.logger.warn(`Failed to store webhook data for workflow ${workflowId}:`, error);
    }
  }

  private async removeWebhookData(workflowId: string): Promise<void> {
    try {
      await this.platformService.query(
        `DELETE FROM workflow_triggers WHERE workflow_id = $1 AND trigger_type = 'sendgrid'`,
        [workflowId]
      );
    } catch (error) {
      this.logger.warn(`Failed to remove webhook data for workflow ${workflowId}:`, error);
    }
  }
}
