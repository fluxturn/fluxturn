import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as crypto from 'crypto';
import {
  ITriggerService,
  TriggerActivationResult,
  TriggerDeactivationResult,
  TriggerStatus,
  TriggerType,
} from '../../../workflow/interfaces/trigger.interface';
import { PlatformService } from '../../../../database/platform.service';

interface XeroTriggerConfig {
  triggerId?: string;
  webhookKey?: string;
  credentials?: {
    webhookKey?: string;
    accessToken?: string;
  };
  actionParams?: {
    triggerId?: string;
    webhookKey?: string;
  };
  credentialId?: string;
  connectorConfigId?: string;
}

interface ActiveTrigger {
  webhookUrl: string;
  webhookKey: string;
  triggerId: string;
  activatedAt: Date;
}

@Injectable()
export class XeroTriggerService implements ITriggerService {
  private readonly logger = new Logger(XeroTriggerService.name);
  private readonly activeTriggers = new Map<string, ActiveTrigger>();

  constructor(
    private readonly configService: ConfigService,
    private readonly platformService: PlatformService
  ) {}

  async activate(workflowId: string, triggerConfig: XeroTriggerConfig): Promise<TriggerActivationResult> {
    try {
      this.logger.log(`Activating Xero trigger for workflow ${workflowId}`);

      const triggerId = triggerConfig.triggerId || triggerConfig.actionParams?.triggerId || 'invoice_created';
      const webhookUrl = this.generateWebhookUrl(workflowId);

      // Xero webhooks are configured in the Xero Developer Portal
      let webhookKey = triggerConfig.webhookKey ||
                      triggerConfig.actionParams?.webhookKey ||
                      triggerConfig.credentials?.webhookKey;

      const credentialId = triggerConfig.credentialId || triggerConfig.connectorConfigId;

      if (!webhookKey && credentialId) {
        const credentials = await this.fetchCredentials(credentialId);
        webhookKey = credentials?.webhookKey;
      }

      // Store trigger state
      this.activeTriggers.set(workflowId, {
        webhookUrl,
        webhookKey: webhookKey || '',
        triggerId,
        activatedAt: new Date(),
      });

      await this.storeWebhookData(workflowId, webhookUrl, webhookKey || '');

      return {
        success: true,
        message: 'Xero webhook URL generated - manual setup required',
        data: {
          webhookUrl,
          setupRequired: true,
          instructions: [
            '1. Go to the Xero Developer Portal (developer.xero.com)',
            '2. Navigate to your app > Webhooks',
            '3. Add the webhook URL: ' + webhookUrl,
            '4. Select the subscription type: INVOICES, CONTACTS, etc.',
            '5. Copy the Webhook Key and save it to your connector configuration',
            '6. The webhook key is used to validate webhook signatures',
          ],
          supportedEventTypes: this.getSupportedEventTypes(triggerId),
        },
      };

    } catch (error: any) {
      this.logger.error(`Failed to activate Xero trigger:`, error);
      return {
        success: false,
        message: 'Failed to activate Xero trigger',
        error: error.message,
      };
    }
  }

  async deactivate(workflowId: string): Promise<TriggerDeactivationResult> {
    try {
      this.logger.log(`Deactivating Xero trigger for workflow ${workflowId}`);

      this.activeTriggers.delete(workflowId);
      await this.deleteStoredWebhookData(workflowId);

      return {
        success: true,
        message: 'Xero trigger deactivated. Please also remove the webhook from the Xero Developer Portal.',
      };

    } catch (error: any) {
      this.logger.error(`Failed to deactivate Xero trigger:`, error);
      return {
        success: false,
        message: 'Failed to deactivate Xero trigger',
      };
    }
  }

  async getStatus(workflowId: string): Promise<TriggerStatus> {
    const trigger = this.activeTriggers.get(workflowId);

    if (!trigger) {
      return {
        active: false,
        type: TriggerType.XERO,
        message: 'Xero trigger not active',
      };
    }

    return {
      active: true,
      type: TriggerType.XERO,
      message: 'Xero trigger active',
      metadata: {
        webhookUrl: trigger.webhookUrl,
        triggerId: trigger.triggerId,
        hasWebhookKey: !!trigger.webhookKey,
        activatedAt: trigger.activatedAt,
      },
    };
  }

  getTriggerType(): TriggerType {
    return TriggerType.XERO;
  }

  /**
   * Verify Xero webhook signature using HMACSHA256
   */
  verifySignature(payload: string, signature: string, webhookKey: string): boolean {
    if (!webhookKey || !signature) return false;

    try {
      const expectedSignature = crypto
        .createHmac('sha256', webhookKey)
        .update(payload)
        .digest('base64');

      const expectedBuffer = Buffer.from(expectedSignature);
      const providedBuffer = Buffer.from(signature);

      if (expectedBuffer.byteLength !== providedBuffer.byteLength) {
        return false;
      }

      return crypto.timingSafeEqual(expectedBuffer, providedBuffer);
    } catch (error) {
      this.logger.error('Xero signature verification failed:', error);
      return false;
    }
  }

  getActiveTrigger(workflowId: string): ActiveTrigger | undefined {
    return this.activeTriggers.get(workflowId);
  }

  async getWebhookKey(workflowId: string): Promise<string | null> {
    const trigger = this.activeTriggers.get(workflowId);
    if (trigger?.webhookKey) return trigger.webhookKey;

    const storedData = await this.getStoredWebhookData(workflowId);
    return storedData?.webhookKey || null;
  }

  private getSupportedEventTypes(triggerId: string): string[] {
    const eventMap: Record<string, string[]> = {
      'invoice_created': ['INVOICES'],
      'invoice_updated': ['INVOICES'],
      'contact_created': ['CONTACTS'],
      'contact_updated': ['CONTACTS'],
      'payment_created': ['PAYMENTS'],
    };
    return eventMap[triggerId] || ['INVOICES'];
  }

  private generateWebhookUrl(workflowId: string): string {
    const baseUrl = this.configService.get<string>('APP_URL') || 'http://localhost:3000';
    return `${baseUrl.replace(/\/$/, '')}/api/v1/webhooks/xero/${workflowId}`;
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

  private async storeWebhookData(workflowId: string, webhookUrl: string, webhookKey: string): Promise<void> {
    try {
      await this.platformService.query(
        `INSERT INTO workflow_triggers (workflow_id, trigger_type, webhook_data, created_at)
         VALUES ($1, $2, $3, NOW())
         ON CONFLICT (workflow_id, trigger_type) DO UPDATE SET webhook_data = $3, updated_at = NOW()`,
        [workflowId, 'xero', JSON.stringify({ webhookUrl, webhookKey })]
      );
    } catch (error) {
      this.logger.warn('Failed to store webhook data:', error);
    }
  }

  private async getStoredWebhookData(workflowId: string): Promise<any> {
    try {
      const result = await this.platformService.query(
        'SELECT webhook_data FROM workflow_triggers WHERE workflow_id = $1 AND trigger_type = $2',
        [workflowId, 'xero']
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
        [workflowId, 'xero']
      );
    } catch (error) {
      this.logger.warn('Failed to delete stored webhook data:', error);
    }
  }
}
