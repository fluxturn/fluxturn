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

interface CalendlyTriggerConfig {
  triggerId?: string;
  organizationUri?: string;
  userUri?: string;
  scope?: 'organization' | 'user';
  credentials?: {
    accessToken?: string;
    personalToken?: string;
  };
  actionParams?: {
    triggerId?: string;
    organizationUri?: string;
    userUri?: string;
    scope?: string;
  };
  credentialId?: string;
  connectorConfigId?: string;
}

interface ActiveTrigger {
  webhookUri: string;
  webhookUrl: string;
  signingKey: string;
  triggerId: string;
  scope: string;
  activatedAt: Date;
}

@Injectable()
export class CalendlyTriggerService implements ITriggerService {
  private readonly logger = new Logger(CalendlyTriggerService.name);
  private readonly activeTriggers = new Map<string, ActiveTrigger>();

  constructor(
    private readonly configService: ConfigService,
    private readonly platformService: PlatformService
  ) {}

  async activate(workflowId: string, triggerConfig: CalendlyTriggerConfig): Promise<TriggerActivationResult> {
    try {
      this.logger.log(`Activating Calendly trigger for workflow ${workflowId}`);

      // Extract credentials
      let accessToken = triggerConfig.credentials?.accessToken || triggerConfig.credentials?.personalToken;
      const credentialId = triggerConfig.credentialId || triggerConfig.connectorConfigId;

      if (!accessToken && credentialId) {
        const credentials = await this.fetchCredentials(credentialId);
        accessToken = credentials?.accessToken || credentials?.personalToken || credentials?.access_token;
      }

      if (!accessToken) {
        return {
          success: false,
          message: 'Access token is required for Calendly trigger',
          error: 'Missing access token in trigger configuration',
        };
      }

      // Get organization/user URI
      const scope = triggerConfig.scope || triggerConfig.actionParams?.scope || 'organization';
      let ownerUri = triggerConfig.organizationUri || triggerConfig.actionParams?.organizationUri;

      if (!ownerUri) {
        // Fetch current user to get organization URI
        const userResponse = await axios.get('https://api.calendly.com/users/me', {
          headers: { Authorization: `Bearer ${accessToken}` }
        });
        ownerUri = scope === 'organization'
          ? userResponse.data.resource.current_organization
          : userResponse.data.resource.uri;
      }

      const triggerId = triggerConfig.triggerId || triggerConfig.actionParams?.triggerId || 'invitee_created';
      const webhookUrl = this.generateWebhookUrl(workflowId);
      const signingKey = this.generateSigningKey();

      // Map trigger to Calendly events
      const eventMap: Record<string, string[]> = {
        'invitee_created': ['invitee.created'],
        'invitee_canceled': ['invitee.canceled'],
        'invitee_rescheduled': ['invitee.created'], // Rescheduled shows as new invitee with reschedule flag
      };

      const events = eventMap[triggerId] || ['invitee.created'];

      // Create webhook subscription
      const response = await axios.post(
        'https://api.calendly.com/webhook_subscriptions',
        {
          url: webhookUrl,
          events: events,
          organization: scope === 'organization' ? ownerUri : undefined,
          user: scope === 'user' ? ownerUri : undefined,
          scope: scope,
          signing_key: signingKey,
        },
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
          }
        }
      );

      const webhookUri = response.data.resource.uri;

      // Store trigger state
      this.activeTriggers.set(workflowId, {
        webhookUri,
        webhookUrl,
        signingKey,
        triggerId,
        scope,
        activatedAt: new Date(),
      });

      // Store webhook data in database for persistence
      await this.storeWebhookData(workflowId, webhookUri, signingKey, accessToken);

      this.logger.log(`Calendly trigger activated for workflow ${workflowId}`);

      return {
        success: true,
        message: 'Calendly webhook registered successfully',
        data: {
          webhookUri,
          webhookUrl,
          events,
          scope,
        },
      };

    } catch (error: any) {
      this.logger.error(`Failed to activate Calendly trigger for workflow ${workflowId}:`, error);

      const errorMessage = error.response?.data?.message || error.message;
      return {
        success: false,
        message: 'Failed to activate Calendly trigger',
        error: errorMessage,
      };
    }
  }

  async deactivate(workflowId: string): Promise<TriggerDeactivationResult> {
    try {
      this.logger.log(`Deactivating Calendly trigger for workflow ${workflowId}`);

      const trigger = this.activeTriggers.get(workflowId);
      const storedData = await this.getStoredWebhookData(workflowId);

      const webhookUri = trigger?.webhookUri || storedData?.webhookUri;
      const accessToken = storedData?.accessToken;

      if (webhookUri && accessToken) {
        try {
          await axios.delete(webhookUri, {
            headers: { Authorization: `Bearer ${accessToken}` }
          });
        } catch (deleteError: any) {
          this.logger.warn(`Failed to delete webhook from Calendly: ${deleteError.message}`);
        }
      }

      this.activeTriggers.delete(workflowId);
      await this.deleteStoredWebhookData(workflowId);

      return {
        success: true,
        message: 'Calendly webhook deleted successfully',
      };

    } catch (error: any) {
      this.logger.error(`Failed to deactivate Calendly trigger:`, error);
      this.activeTriggers.delete(workflowId);

      return {
        success: false,
        message: 'Failed to deactivate Calendly trigger',
      };
    }
  }

  async getStatus(workflowId: string): Promise<TriggerStatus> {
    const trigger = this.activeTriggers.get(workflowId);

    if (!trigger) {
      return {
        active: false,
        type: TriggerType.CALENDLY,
        message: 'Calendly trigger not active',
      };
    }

    return {
      active: true,
      type: TriggerType.CALENDLY,
      message: 'Calendly trigger active',
      metadata: {
        webhookUrl: trigger.webhookUrl,
        triggerId: trigger.triggerId,
        scope: trigger.scope,
        activatedAt: trigger.activatedAt,
      },
    };
  }

  getTriggerType(): TriggerType {
    return TriggerType.CALENDLY;
  }

  /**
   * Verify webhook signature
   */
  verifySignature(workflowId: string, payload: string, signature: string): boolean {
    const trigger = this.activeTriggers.get(workflowId);
    if (!trigger) return false;

    try {
      // Calendly uses HMAC-SHA256 signature
      const expectedSignature = crypto
        .createHmac('sha256', trigger.signingKey)
        .update(payload)
        .digest('hex');

      // Timing-safe comparison
      const expectedBuffer = Buffer.from(expectedSignature);
      const providedBuffer = Buffer.from(signature.replace('sha256=', ''));

      if (expectedBuffer.byteLength !== providedBuffer.byteLength) {
        return false;
      }

      return crypto.timingSafeEqual(expectedBuffer, providedBuffer);
    } catch (error) {
      this.logger.error('Signature verification failed:', error);
      return false;
    }
  }

  getActiveTrigger(workflowId: string): ActiveTrigger | undefined {
    return this.activeTriggers.get(workflowId);
  }

  private generateWebhookUrl(workflowId: string): string {
    const baseUrl = this.configService.get<string>('APP_URL') || 'http://localhost:3000';
    return `${baseUrl.replace(/\/$/, '')}/api/v1/webhooks/calendly/${workflowId}`;
  }

  private generateSigningKey(): string {
    return crypto.randomBytes(32).toString('hex');
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

  private async storeWebhookData(workflowId: string, webhookUri: string, signingKey: string, accessToken: string): Promise<void> {
    try {
      await this.platformService.query(
        `INSERT INTO workflow_triggers (workflow_id, trigger_type, webhook_data, created_at)
         VALUES ($1, $2, $3, NOW())
         ON CONFLICT (workflow_id, trigger_type) DO UPDATE SET webhook_data = $3, updated_at = NOW()`,
        [workflowId, 'calendly', JSON.stringify({ webhookUri, signingKey, accessToken })]
      );
    } catch (error) {
      this.logger.warn('Failed to store webhook data:', error);
    }
  }

  private async getStoredWebhookData(workflowId: string): Promise<any> {
    try {
      const result = await this.platformService.query(
        'SELECT webhook_data FROM workflow_triggers WHERE workflow_id = $1 AND trigger_type = $2',
        [workflowId, 'calendly']
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
        [workflowId, 'calendly']
      );
    } catch (error) {
      this.logger.warn('Failed to delete stored webhook data:', error);
    }
  }
}
