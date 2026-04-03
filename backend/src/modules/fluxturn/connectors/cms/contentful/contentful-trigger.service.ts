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

interface ContentfulTriggerConfig {
  triggerId?: string;
  spaceId?: string;
  environmentId?: string;
  contentTypeId?: string;
  credentials?: {
    managementAccessToken?: string;
  };
  actionParams?: {
    triggerId?: string;
    spaceId?: string;
    environmentId?: string;
    contentTypeId?: string;
  };
  credentialId?: string;
  connectorConfigId?: string;
}

interface ActiveTrigger {
  webhookId: string;
  webhookUrl: string;
  triggerId: string;
  spaceId: string;
  secretToken: string;
  activatedAt: Date;
}

@Injectable()
export class ContentfulTriggerService implements ITriggerService {
  private readonly logger = new Logger(ContentfulTriggerService.name);
  private readonly activeTriggers = new Map<string, ActiveTrigger>();

  constructor(
    private readonly configService: ConfigService,
    private readonly platformService: PlatformService
  ) {}

  async activate(workflowId: string, triggerConfig: ContentfulTriggerConfig): Promise<TriggerActivationResult> {
    try {
      this.logger.log(`Activating Contentful trigger for workflow ${workflowId}`);

      // Get credentials
      let managementToken = triggerConfig.credentials?.managementAccessToken;

      const credentialId = triggerConfig.credentialId || triggerConfig.connectorConfigId;

      if (!managementToken && credentialId) {
        const credentials = await this.fetchCredentials(credentialId);
        managementToken = credentials?.managementAccessToken || credentials?.management_access_token;
      }

      if (!managementToken) {
        return {
          success: false,
          message: 'Management access token is required for Contentful trigger',
          error: 'Missing management access token',
        };
      }

      const triggerId = triggerConfig.triggerId || triggerConfig.actionParams?.triggerId || 'entry_published';
      const spaceId = triggerConfig.spaceId || triggerConfig.actionParams?.spaceId;
      const environmentId = triggerConfig.environmentId || triggerConfig.actionParams?.environmentId || 'master';
      const contentTypeId = triggerConfig.contentTypeId || triggerConfig.actionParams?.contentTypeId;

      if (!spaceId) {
        return {
          success: false,
          message: 'Space ID is required for Contentful trigger',
          error: 'Missing space ID',
        };
      }

      const webhookUrl = this.generateWebhookUrl(workflowId);
      const secretToken = this.generateSecretToken();

      // Map trigger to Contentful topics
      const topicMap: Record<string, string[]> = {
        'entry_created': ['Entry.create'],
        'entry_updated': ['Entry.save'],
        'entry_published': ['Entry.publish'],
        'entry_unpublished': ['Entry.unpublish'],
        'entry_deleted': ['Entry.delete'],
        'asset_created': ['Asset.create'],
        'asset_published': ['Asset.publish'],
        'asset_deleted': ['Asset.delete'],
      };

      const topics = topicMap[triggerId] || ['Entry.publish'];

      // Build filters if content type is specified
      const filters: any[] = [];
      if (contentTypeId) {
        filters.push({
          equals: [{ doc: 'sys.contentType.sys.id' }, contentTypeId]
        });
      }
      if (environmentId && environmentId !== 'master') {
        filters.push({
          equals: [{ doc: 'sys.environment.sys.id' }, environmentId]
        });
      }

      // Create webhook via Contentful Management API
      const requestBody: any = {
        name: `Fluxturn-${workflowId.slice(0, 8)}`,
        url: webhookUrl,
        topics: topics,
        headers: [
          { key: 'X-Contentful-Secret', value: secretToken }
        ],
      };

      if (filters.length > 0) {
        requestBody.filters = filters;
      }

      const response = await axios.post(
        `https://api.contentful.com/spaces/${spaceId}/webhook_definitions`,
        requestBody,
        {
          headers: {
            Authorization: `Bearer ${managementToken}`,
            'Content-Type': 'application/vnd.contentful.management.v1+json',
          }
        }
      );

      const webhookId = response.data.sys.id;

      // Store trigger state
      this.activeTriggers.set(workflowId, {
        webhookId,
        webhookUrl,
        triggerId,
        spaceId,
        secretToken,
        activatedAt: new Date(),
      });

      await this.storeWebhookData(workflowId, webhookId, webhookUrl, managementToken, spaceId, secretToken);

      this.logger.log(`Contentful trigger activated for workflow ${workflowId}`);

      return {
        success: true,
        message: 'Contentful webhook registered successfully',
        data: {
          webhookId,
          webhookUrl,
          topics,
          spaceId,
        },
      };

    } catch (error: any) {
      this.logger.error(`Failed to activate Contentful trigger:`, error);

      const errorMessage = error.response?.data?.message || error.response?.data?.details || error.message;
      return {
        success: false,
        message: 'Failed to activate Contentful trigger',
        error: errorMessage,
      };
    }
  }

  async deactivate(workflowId: string): Promise<TriggerDeactivationResult> {
    try {
      this.logger.log(`Deactivating Contentful trigger for workflow ${workflowId}`);

      const trigger = this.activeTriggers.get(workflowId);
      const storedData = await this.getStoredWebhookData(workflowId);

      const webhookId = trigger?.webhookId || storedData?.webhookId;
      const managementToken = storedData?.managementToken;
      const spaceId = trigger?.spaceId || storedData?.spaceId;

      if (webhookId && managementToken && spaceId) {
        try {
          await axios.delete(`https://api.contentful.com/spaces/${spaceId}/webhook_definitions/${webhookId}`, {
            headers: { Authorization: `Bearer ${managementToken}` }
          });
        } catch (deleteError: any) {
          this.logger.warn(`Failed to delete webhook from Contentful: ${deleteError.message}`);
        }
      }

      this.activeTriggers.delete(workflowId);
      await this.deleteStoredWebhookData(workflowId);

      return {
        success: true,
        message: 'Contentful webhook deleted successfully',
      };

    } catch (error: any) {
      this.logger.error(`Failed to deactivate Contentful trigger:`, error);
      this.activeTriggers.delete(workflowId);

      return {
        success: false,
        message: 'Failed to deactivate Contentful trigger',
      };
    }
  }

  async getStatus(workflowId: string): Promise<TriggerStatus> {
    const trigger = this.activeTriggers.get(workflowId);

    if (!trigger) {
      return {
        active: false,
        type: TriggerType.CONTENTFUL,
        message: 'Contentful trigger not active',
      };
    }

    return {
      active: true,
      type: TriggerType.CONTENTFUL,
      message: 'Contentful trigger active',
      metadata: {
        webhookId: trigger.webhookId,
        webhookUrl: trigger.webhookUrl,
        triggerId: trigger.triggerId,
        spaceId: trigger.spaceId,
        activatedAt: trigger.activatedAt,
      },
    };
  }

  getTriggerType(): TriggerType {
    return TriggerType.CONTENTFUL;
  }

  getActiveTrigger(workflowId: string): ActiveTrigger | undefined {
    return this.activeTriggers.get(workflowId);
  }

  async verifyWebhookSecret(workflowId: string, providedSecret: string): Promise<boolean> {
    const storedData = await this.getStoredWebhookData(workflowId);
    const secretToken = storedData?.secretToken;

    if (!secretToken || !providedSecret) {
      return false;
    }

    try {
      return crypto.timingSafeEqual(
        Buffer.from(secretToken),
        Buffer.from(providedSecret)
      );
    } catch {
      return false;
    }
  }

  private generateWebhookUrl(workflowId: string): string {
    const baseUrl = this.configService.get<string>('APP_URL') || 'http://localhost:3000';
    return `${baseUrl.replace(/\/$/, '')}/api/v1/webhooks/contentful/${workflowId}`;
  }

  private generateSecretToken(): string {
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

  private async storeWebhookData(
    workflowId: string,
    webhookId: string,
    webhookUrl: string,
    managementToken: string,
    spaceId: string,
    secretToken: string
  ): Promise<void> {
    try {
      await this.platformService.query(
        `INSERT INTO workflow_triggers (workflow_id, trigger_type, webhook_data, created_at)
         VALUES ($1, $2, $3, NOW())
         ON CONFLICT (workflow_id, trigger_type) DO UPDATE SET webhook_data = $3, updated_at = NOW()`,
        [workflowId, 'contentful', JSON.stringify({ webhookId, webhookUrl, managementToken, spaceId, secretToken })]
      );
    } catch (error) {
      this.logger.warn('Failed to store webhook data:', error);
    }
  }

  private async getStoredWebhookData(workflowId: string): Promise<any> {
    try {
      const result = await this.platformService.query(
        'SELECT webhook_data FROM workflow_triggers WHERE workflow_id = $1 AND trigger_type = $2',
        [workflowId, 'contentful']
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
        [workflowId, 'contentful']
      );
    } catch (error) {
      this.logger.warn('Failed to delete stored webhook data:', error);
    }
  }
}
