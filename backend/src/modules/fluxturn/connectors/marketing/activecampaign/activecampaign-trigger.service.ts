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

interface ActiveCampaignTriggerConfig {
  triggerId?: string;
  credentials?: {
    apiKey?: string;
    baseUrl?: string;
  };
  actionParams?: {
    triggerId?: string;
  };
  credentialId?: string;
  connectorConfigId?: string;
}

interface ActiveTrigger {
  webhookId: string;
  webhookUrl: string;
  triggerId: string;
  activatedAt: Date;
}

@Injectable()
export class ActiveCampaignTriggerService implements ITriggerService {
  private readonly logger = new Logger(ActiveCampaignTriggerService.name);
  private readonly activeTriggers = new Map<string, ActiveTrigger>();

  constructor(
    private readonly configService: ConfigService,
    private readonly platformService: PlatformService
  ) {}

  async activate(workflowId: string, triggerConfig: ActiveCampaignTriggerConfig): Promise<TriggerActivationResult> {
    try {
      this.logger.log(`Activating ActiveCampaign trigger for workflow ${workflowId}`);

      // Get credentials
      let apiKey = triggerConfig.credentials?.apiKey;
      let baseUrl = triggerConfig.credentials?.baseUrl;

      const credentialId = triggerConfig.credentialId || triggerConfig.connectorConfigId;

      if (!apiKey && credentialId) {
        const credentials = await this.fetchCredentials(credentialId);
        apiKey = credentials?.apiKey || credentials?.api_key;
        baseUrl = credentials?.baseUrl || credentials?.base_url || credentials?.accountUrl;
      }

      if (!apiKey || !baseUrl) {
        return {
          success: false,
          message: 'API key and base URL are required for ActiveCampaign trigger',
          error: 'Missing credentials',
        };
      }

      const triggerId = triggerConfig.triggerId || triggerConfig.actionParams?.triggerId || 'contact_added';
      const webhookUrl = this.generateWebhookUrl(workflowId);

      // Map trigger to ActiveCampaign events
      const eventMap: Record<string, string[]> = {
        'contact_added': ['subscribe'],
        'contact_updated': ['update'],
        'contact_unsubscribed': ['unsubscribe'],
        'deal_created': ['deal_add'],
        'deal_updated': ['deal_update'],
        'deal_stage_changed': ['deal_update'],
        'campaign_sent': ['sent'],
        'email_opened': ['open'],
        'email_clicked': ['click'],
        'email_bounced': ['bounce'],
      };

      const events = eventMap[triggerId] || ['subscribe'];

      // Create webhook via ActiveCampaign API
      const response = await axios.post(
        `${baseUrl}/api/3/webhooks`,
        {
          webhook: {
            name: `Fluxturn-${workflowId}`,
            url: webhookUrl,
            events: events,
            sources: ['public', 'admin', 'api', 'system'],
          }
        },
        {
          headers: {
            'Api-Token': apiKey,
            'Content-Type': 'application/json',
          }
        }
      );

      const webhookId = response.data.webhook.id;

      // Store trigger state
      this.activeTriggers.set(workflowId, {
        webhookId,
        webhookUrl,
        triggerId,
        activatedAt: new Date(),
      });

      await this.storeWebhookData(workflowId, webhookId, webhookUrl, apiKey, baseUrl);

      this.logger.log(`ActiveCampaign trigger activated for workflow ${workflowId}`);

      return {
        success: true,
        message: 'ActiveCampaign webhook registered successfully',
        data: {
          webhookId,
          webhookUrl,
          events,
        },
      };

    } catch (error: any) {
      this.logger.error(`Failed to activate ActiveCampaign trigger:`, error);

      const errorMessage = error.response?.data?.message || error.message;
      return {
        success: false,
        message: 'Failed to activate ActiveCampaign trigger',
        error: errorMessage,
      };
    }
  }

  async deactivate(workflowId: string): Promise<TriggerDeactivationResult> {
    try {
      this.logger.log(`Deactivating ActiveCampaign trigger for workflow ${workflowId}`);

      const trigger = this.activeTriggers.get(workflowId);
      const storedData = await this.getStoredWebhookData(workflowId);

      const webhookId = trigger?.webhookId || storedData?.webhookId;
      const apiKey = storedData?.apiKey;
      const baseUrl = storedData?.baseUrl;

      if (webhookId && apiKey && baseUrl) {
        try {
          await axios.delete(`${baseUrl}/api/3/webhooks/${webhookId}`, {
            headers: { 'Api-Token': apiKey }
          });
        } catch (deleteError: any) {
          this.logger.warn(`Failed to delete webhook from ActiveCampaign: ${deleteError.message}`);
        }
      }

      this.activeTriggers.delete(workflowId);
      await this.deleteStoredWebhookData(workflowId);

      return {
        success: true,
        message: 'ActiveCampaign webhook deleted successfully',
      };

    } catch (error: any) {
      this.logger.error(`Failed to deactivate ActiveCampaign trigger:`, error);
      this.activeTriggers.delete(workflowId);

      return {
        success: false,
        message: 'Failed to deactivate ActiveCampaign trigger',
      };
    }
  }

  async getStatus(workflowId: string): Promise<TriggerStatus> {
    const trigger = this.activeTriggers.get(workflowId);

    if (!trigger) {
      return {
        active: false,
        type: TriggerType.ACTIVECAMPAIGN,
        message: 'ActiveCampaign trigger not active',
      };
    }

    return {
      active: true,
      type: TriggerType.ACTIVECAMPAIGN,
      message: 'ActiveCampaign trigger active',
      metadata: {
        webhookId: trigger.webhookId,
        webhookUrl: trigger.webhookUrl,
        triggerId: trigger.triggerId,
        activatedAt: trigger.activatedAt,
      },
    };
  }

  getTriggerType(): TriggerType {
    return TriggerType.ACTIVECAMPAIGN;
  }

  getActiveTrigger(workflowId: string): ActiveTrigger | undefined {
    return this.activeTriggers.get(workflowId);
  }

  private generateWebhookUrl(workflowId: string): string {
    const baseUrl = this.configService.get<string>('APP_URL') || 'http://localhost:3000';
    return `${baseUrl.replace(/\/$/, '')}/api/v1/webhooks/activecampaign/${workflowId}`;
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

  private async storeWebhookData(workflowId: string, webhookId: string, webhookUrl: string, apiKey: string, baseUrl: string): Promise<void> {
    try {
      await this.platformService.query(
        `INSERT INTO workflow_triggers (workflow_id, trigger_type, webhook_data, created_at)
         VALUES ($1, $2, $3, NOW())
         ON CONFLICT (workflow_id, trigger_type) DO UPDATE SET webhook_data = $3, updated_at = NOW()`,
        [workflowId, 'activecampaign', JSON.stringify({ webhookId, webhookUrl, apiKey, baseUrl })]
      );
    } catch (error) {
      this.logger.warn('Failed to store webhook data:', error);
    }
  }

  private async getStoredWebhookData(workflowId: string): Promise<any> {
    try {
      const result = await this.platformService.query(
        'SELECT webhook_data FROM workflow_triggers WHERE workflow_id = $1 AND trigger_type = $2',
        [workflowId, 'activecampaign']
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
        [workflowId, 'activecampaign']
      );
    } catch (error) {
      this.logger.warn('Failed to delete stored webhook data:', error);
    }
  }
}
