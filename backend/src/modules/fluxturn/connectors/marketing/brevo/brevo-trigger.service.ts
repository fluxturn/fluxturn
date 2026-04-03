import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';
import * as crypto from 'crypto';
import {
  ITriggerService,
  TriggerActivationResult,
  TriggerDeactivationResult,
  TriggerStatus,
  TriggerType,
} from '../../../workflow/interfaces/trigger.interface';
import { PlatformService } from '../../../../database/platform.service';

interface BrevoTriggerConfig {
  triggerId?: string;
  webhookType?: 'transactional' | 'marketing';
  credentials?: {
    apiKey?: string;
  };
  actionParams?: {
    triggerId?: string;
    webhookType?: string;
  };
  credentialId?: string;
  connectorConfigId?: string;
}

interface ActiveTrigger {
  webhookId: string;
  webhookUrl: string;
  triggerId: string;
  webhookType: string;
  activatedAt: Date;
}

@Injectable()
export class BrevoTriggerService implements ITriggerService {
  private readonly logger = new Logger(BrevoTriggerService.name);
  private readonly activeTriggers = new Map<string, ActiveTrigger>();

  constructor(
    private readonly configService: ConfigService,
    private readonly platformService: PlatformService
  ) {}

  async activate(workflowId: string, triggerConfig: BrevoTriggerConfig): Promise<TriggerActivationResult> {
    try {
      this.logger.log(`Activating Brevo trigger for workflow ${workflowId}`);

      // Get credentials
      let apiKey = triggerConfig.credentials?.apiKey;

      const credentialId = triggerConfig.credentialId || triggerConfig.connectorConfigId;

      if (!apiKey && credentialId) {
        const credentials = await this.fetchCredentials(credentialId);
        apiKey = credentials?.apiKey || credentials?.api_key;
      }

      if (!apiKey) {
        return {
          success: false,
          message: 'API key is required for Brevo trigger',
          error: 'Missing API key',
        };
      }

      const triggerId = triggerConfig.triggerId || triggerConfig.actionParams?.triggerId || 'email_delivered';
      const webhookType = triggerConfig.webhookType || triggerConfig.actionParams?.webhookType || 'transactional';
      const webhookUrl = this.generateWebhookUrl(workflowId);

      // Map trigger to Brevo events
      const eventMap: Record<string, string[]> = {
        'email_delivered': ['delivered'],
        'email_opened': ['opened', 'uniqueOpened'],
        'email_clicked': ['click'],
        'email_hard_bounce': ['hardBounce', 'hard_bounce'],
        'email_soft_bounce': ['softBounce', 'soft_bounce'],
        'email_spam': ['spam', 'complaint'],
        'email_unsubscribed': ['unsubscribed'],
        'inbound_email': ['inboundEmailProcessed'],
        'contact_created': ['listAddition', 'contact_added'],
        'contact_updated': ['contactUpdated', 'contact_updated'],
      };

      const events = eventMap[triggerId] || ['delivered'];

      let webhookId: string;

      // Check if webhook already exists for this URL
      const existingWebhooks = await axios.get(
        `https://api.brevo.com/v3/webhooks?type=${webhookType}`,
        {
          headers: {
            'api-key': apiKey,
            'Content-Type': 'application/json',
          }
        }
      );

      const existingWebhook = existingWebhooks.data?.webhooks?.find(
        (w: any) => w.url === webhookUrl
      );

      if (existingWebhook) {
        webhookId = existingWebhook.id;
        this.logger.log(`Reusing existing Brevo webhook ${webhookId} for workflow ${workflowId}`);
      } else {
        // Create new webhook via Brevo API
        const response = await axios.post(
          'https://api.brevo.com/v3/webhooks',
          {
            url: webhookUrl,
            events: events,
            type: webhookType,
            description: `Fluxturn workflow ${workflowId}`,
          },
          {
            headers: {
              'api-key': apiKey,
              'Content-Type': 'application/json',
            }
          }
        );
        webhookId = response.data.id;
        this.logger.log(`Created new Brevo webhook ${webhookId} for workflow ${workflowId}`);
      }

      // Store trigger state
      this.activeTriggers.set(workflowId, {
        webhookId,
        webhookUrl,
        triggerId,
        webhookType,
        activatedAt: new Date(),
      });

      await this.storeWebhookData(workflowId, webhookId, webhookUrl, apiKey);

      this.logger.log(`Brevo trigger activated for workflow ${workflowId}`);

      return {
        success: true,
        message: 'Brevo webhook registered successfully',
        data: {
          webhookId,
          webhookUrl,
          events,
          webhookType,
        },
      };

    } catch (error: any) {
      this.logger.error(`Failed to activate Brevo trigger:`, error);

      const errorMessage = error.response?.data?.message || error.message;
      return {
        success: false,
        message: 'Failed to activate Brevo trigger',
        error: errorMessage,
      };
    }
  }

  async deactivate(workflowId: string): Promise<TriggerDeactivationResult> {
    try {
      this.logger.log(`Deactivating Brevo trigger for workflow ${workflowId}`);

      const trigger = this.activeTriggers.get(workflowId);
      const storedData = await this.getStoredWebhookData(workflowId);

      const webhookId = trigger?.webhookId || storedData?.webhookId;
      const apiKey = storedData?.apiKey;

      if (webhookId && apiKey) {
        try {
          await axios.delete(`https://api.brevo.com/v3/webhooks/${webhookId}`, {
            headers: { 'api-key': apiKey }
          });
        } catch (deleteError: any) {
          this.logger.warn(`Failed to delete webhook from Brevo: ${deleteError.message}`);
        }
      }

      this.activeTriggers.delete(workflowId);
      await this.deleteStoredWebhookData(workflowId);

      return {
        success: true,
        message: 'Brevo webhook deleted successfully',
      };

    } catch (error: any) {
      this.logger.error(`Failed to deactivate Brevo trigger:`, error);
      this.activeTriggers.delete(workflowId);

      return {
        success: false,
        message: 'Failed to deactivate Brevo trigger',
      };
    }
  }

  async getStatus(workflowId: string): Promise<TriggerStatus> {
    const trigger = this.activeTriggers.get(workflowId);

    if (!trigger) {
      return {
        active: false,
        type: TriggerType.BREVO,
        message: 'Brevo trigger not active',
      };
    }

    return {
      active: true,
      type: TriggerType.BREVO,
      message: 'Brevo trigger active',
      metadata: {
        webhookId: trigger.webhookId,
        webhookUrl: trigger.webhookUrl,
        triggerId: trigger.triggerId,
        webhookType: trigger.webhookType,
        activatedAt: trigger.activatedAt,
      },
    };
  }

  getTriggerType(): TriggerType {
    return TriggerType.BREVO;
  }

  getActiveTrigger(workflowId: string): ActiveTrigger | undefined {
    return this.activeTriggers.get(workflowId);
  }

  private generateWebhookUrl(workflowId: string): string {
    const baseUrl = this.configService.get<string>('APP_URL') || 'http://localhost:3000';
    return `${baseUrl.replace(/\/$/, '')}/api/v1/webhooks/brevo/${workflowId}`;
  }

  private async fetchCredentials(credentialId: string): Promise<any> {
    try {
      const result = await this.platformService.query(
        'SELECT credentials FROM connector_configs WHERE id = $1',
        [credentialId]
      );
      if (result.rows.length > 0) {
        const credentials = result.rows[0].credentials;
        if (credentials?.iv && credentials?.data) {
          return this.decryptCredentials(credentials);
        }
        return credentials;
      }
      return null;
    } catch (error) {
      this.logger.error('Failed to fetch credentials:', error);
      return null;
    }
  }

  private decryptCredentials(encryptedConfig: any): any {
    const encrypted = encryptedConfig.data || encryptedConfig.encrypted;
    const iv = encryptedConfig.iv;
    const authTag = encryptedConfig.authTag;

    const secretKey = this.configService.get<string>('CONNECTOR_ENCRYPTION_KEY');
    if (!secretKey) throw new Error('CONNECTOR_ENCRYPTION_KEY not set');

    const key = Buffer.from(secretKey.slice(0, 32));
    const decipher = crypto.createDecipheriv('aes-256-gcm', key, Buffer.from(iv, 'hex'));
    decipher.setAuthTag(Buffer.from(authTag, 'hex'));

    let decrypted = decipher.update(encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');

    return JSON.parse(decrypted);
  }

  private async storeWebhookData(workflowId: string, webhookId: string, webhookUrl: string, apiKey: string): Promise<void> {
    try {
      await this.platformService.query(
        `INSERT INTO workflow_triggers (workflow_id, trigger_type, webhook_data, created_at)
         VALUES ($1, $2, $3, NOW())
         ON CONFLICT (workflow_id, trigger_type) DO UPDATE SET webhook_data = $3, updated_at = NOW()`,
        [workflowId, 'brevo', JSON.stringify({ webhookId, webhookUrl, apiKey })]
      );
    } catch (error) {
      this.logger.warn('Failed to store webhook data:', error);
    }
  }

  private async getStoredWebhookData(workflowId: string): Promise<any> {
    try {
      const result = await this.platformService.query(
        'SELECT webhook_data FROM workflow_triggers WHERE workflow_id = $1 AND trigger_type = $2',
        [workflowId, 'brevo']
      );
      if (result.rows.length > 0) {
        return typeof result.rows[0].webhook_data === 'string'
          ? JSON.parse(result.rows[0].webhook_data)
          : result.rows[0].webhook_data;
      }
      return null;
    } catch (error) {
      return null;
    }
  }

  private async deleteStoredWebhookData(workflowId: string): Promise<void> {
    try {
      await this.platformService.query(
        'DELETE FROM workflow_triggers WHERE workflow_id = $1 AND trigger_type = $2',
        [workflowId, 'brevo']
      );
    } catch (error) {
      this.logger.warn('Failed to delete stored webhook data:', error);
    }
  }
}
