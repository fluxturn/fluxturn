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

interface QuickBooksTriggerConfig {
  triggerId?: string;
  verifierToken?: string;
  credentials?: {
    verifierToken?: string;
    accessToken?: string;
  };
  actionParams?: {
    triggerId?: string;
    verifierToken?: string;
  };
  credentialId?: string;
  connectorConfigId?: string;
}

interface ActiveTrigger {
  webhookUrl: string;
  verifierToken: string;
  triggerId: string;
  activatedAt: Date;
}

@Injectable()
export class QuickBooksTriggerService implements ITriggerService {
  private readonly logger = new Logger(QuickBooksTriggerService.name);
  private readonly activeTriggers = new Map<string, ActiveTrigger>();

  constructor(
    private readonly configService: ConfigService,
    private readonly platformService: PlatformService
  ) {}

  async activate(workflowId: string, triggerConfig: QuickBooksTriggerConfig): Promise<TriggerActivationResult> {
    try {
      this.logger.log(`Activating QuickBooks trigger for workflow ${workflowId}`);

      const triggerId = triggerConfig.triggerId || triggerConfig.actionParams?.triggerId || 'invoice_created';
      const webhookUrl = this.generateWebhookUrl(workflowId);

      // QuickBooks webhooks are configured manually in the developer portal
      // We provide instructions and store the verifier token
      let verifierToken = triggerConfig.verifierToken ||
                         triggerConfig.actionParams?.verifierToken ||
                         triggerConfig.credentials?.verifierToken;

      const credentialId = triggerConfig.credentialId || triggerConfig.connectorConfigId;

      if (!verifierToken && credentialId) {
        const credentials = await this.fetchCredentials(credentialId);
        verifierToken = credentials?.verifierToken || credentials?.webhookVerifierToken;
      }

      // Store trigger state (verifier token may be added later)
      this.activeTriggers.set(workflowId, {
        webhookUrl,
        verifierToken: verifierToken || '',
        triggerId,
        activatedAt: new Date(),
      });

      await this.storeWebhookData(workflowId, webhookUrl, verifierToken || '');

      return {
        success: true,
        message: 'QuickBooks webhook URL generated - manual setup required',
        data: {
          webhookUrl,
          setupRequired: true,
          instructions: [
            '1. Go to the Intuit Developer Portal (developer.intuit.com)',
            '2. Navigate to your app > Webhooks',
            '3. Add the webhook URL: ' + webhookUrl,
            '4. Select the entities to track: Invoice, Payment, Customer, Vendor, etc.',
            '5. Copy the Verifier Token and save it to your connector configuration',
            '6. The verifier token is used to validate webhook payloads',
          ],
          supportedEntities: this.getSupportedEntities(triggerId),
        },
      };

    } catch (error: any) {
      this.logger.error(`Failed to activate QuickBooks trigger:`, error);
      return {
        success: false,
        message: 'Failed to activate QuickBooks trigger',
        error: error.message,
      };
    }
  }

  async deactivate(workflowId: string): Promise<TriggerDeactivationResult> {
    try {
      this.logger.log(`Deactivating QuickBooks trigger for workflow ${workflowId}`);

      this.activeTriggers.delete(workflowId);
      await this.deleteStoredWebhookData(workflowId);

      return {
        success: true,
        message: 'QuickBooks trigger deactivated. Please also remove the webhook from the Intuit Developer Portal.',
      };

    } catch (error: any) {
      this.logger.error(`Failed to deactivate QuickBooks trigger:`, error);
      return {
        success: false,
        message: 'Failed to deactivate QuickBooks trigger',
      };
    }
  }

  async getStatus(workflowId: string): Promise<TriggerStatus> {
    const trigger = this.activeTriggers.get(workflowId);

    if (!trigger) {
      return {
        active: false,
        type: TriggerType.QUICKBOOKS,
        message: 'QuickBooks trigger not active',
      };
    }

    return {
      active: true,
      type: TriggerType.QUICKBOOKS,
      message: 'QuickBooks trigger active',
      metadata: {
        webhookUrl: trigger.webhookUrl,
        triggerId: trigger.triggerId,
        hasVerifierToken: !!trigger.verifierToken,
        activatedAt: trigger.activatedAt,
      },
    };
  }

  getTriggerType(): TriggerType {
    return TriggerType.QUICKBOOKS;
  }

  /**
   * Verify QuickBooks webhook signature using HMAC-SHA256
   */
  verifySignature(payload: string, signature: string, verifierToken: string): boolean {
    if (!verifierToken || !signature) return false;

    try {
      const expectedSignature = crypto
        .createHmac('sha256', verifierToken)
        .update(payload)
        .digest('base64');

      const expectedBuffer = Buffer.from(expectedSignature);
      const providedBuffer = Buffer.from(signature);

      if (expectedBuffer.byteLength !== providedBuffer.byteLength) {
        return false;
      }

      return crypto.timingSafeEqual(expectedBuffer, providedBuffer);
    } catch (error) {
      this.logger.error('QuickBooks signature verification failed:', error);
      return false;
    }
  }

  getActiveTrigger(workflowId: string): ActiveTrigger | undefined {
    return this.activeTriggers.get(workflowId);
  }

  async getVerifierToken(workflowId: string): Promise<string | null> {
    const trigger = this.activeTriggers.get(workflowId);
    if (trigger?.verifierToken) return trigger.verifierToken;

    const storedData = await this.getStoredWebhookData(workflowId);
    return storedData?.verifierToken || null;
  }

  private getSupportedEntities(triggerId: string): string[] {
    const entityMap: Record<string, string[]> = {
      'invoice_created': ['Invoice'],
      'invoice_updated': ['Invoice'],
      'payment_created': ['Payment'],
      'customer_created': ['Customer'],
      'customer_updated': ['Customer'],
      'vendor_created': ['Vendor'],
      'vendor_updated': ['Vendor'],
      'item_created': ['Item'],
      'item_updated': ['Item'],
    };
    return entityMap[triggerId] || ['Invoice', 'Payment', 'Customer'];
  }

  private generateWebhookUrl(workflowId: string): string {
    const baseUrl = this.configService.get<string>('APP_URL') || 'http://localhost:3000';
    return `${baseUrl.replace(/\/$/, '')}/api/v1/webhooks/quickbooks/${workflowId}`;
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

  private async storeWebhookData(workflowId: string, webhookUrl: string, verifierToken: string): Promise<void> {
    try {
      await this.platformService.query(
        `INSERT INTO workflow_triggers (workflow_id, trigger_type, webhook_data, created_at)
         VALUES ($1, $2, $3, NOW())
         ON CONFLICT (workflow_id, trigger_type) DO UPDATE SET webhook_data = $3, updated_at = NOW()`,
        [workflowId, 'quickbooks', JSON.stringify({ webhookUrl, verifierToken })]
      );
    } catch (error) {
      this.logger.warn('Failed to store webhook data:', error);
    }
  }

  private async getStoredWebhookData(workflowId: string): Promise<any> {
    try {
      const result = await this.platformService.query(
        'SELECT webhook_data FROM workflow_triggers WHERE workflow_id = $1 AND trigger_type = $2',
        [workflowId, 'quickbooks']
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
        [workflowId, 'quickbooks']
      );
    } catch (error) {
      this.logger.warn('Failed to delete stored webhook data:', error);
    }
  }
}
