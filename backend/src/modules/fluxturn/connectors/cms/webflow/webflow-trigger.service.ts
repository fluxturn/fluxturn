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

interface WebflowTriggerConfig {
  triggerId?: string;
  siteId?: string;
  collectionId?: string;
  credentials?: {
    accessToken?: string;
  };
  actionParams?: {
    triggerId?: string;
    siteId?: string;
    collectionId?: string;
  };
  credentialId?: string;
  connectorConfigId?: string;
}

interface ActiveTrigger {
  webhookId: string;
  webhookUrl: string;
  triggerId: string;
  siteId: string;
  activatedAt: Date;
}

@Injectable()
export class WebflowTriggerService implements ITriggerService {
  private readonly logger = new Logger(WebflowTriggerService.name);
  private readonly activeTriggers = new Map<string, ActiveTrigger>();

  constructor(
    private readonly configService: ConfigService,
    private readonly platformService: PlatformService
  ) {}

  async activate(workflowId: string, triggerConfig: WebflowTriggerConfig): Promise<TriggerActivationResult> {
    try {
      this.logger.log(`Activating Webflow trigger for workflow ${workflowId}`);

      // Get credentials
      let accessToken = triggerConfig.credentials?.accessToken;

      const credentialId = triggerConfig.credentialId || triggerConfig.connectorConfigId;

      if (!accessToken && credentialId) {
        const credentials = await this.fetchCredentials(credentialId);
        accessToken = credentials?.accessToken || credentials?.access_token;
      }

      if (!accessToken) {
        return {
          success: false,
          message: 'Access token is required for Webflow trigger',
          error: 'Missing access token',
        };
      }

      const triggerId = triggerConfig.triggerId || triggerConfig.actionParams?.triggerId || 'form_submission';
      const siteId = triggerConfig.siteId || triggerConfig.actionParams?.siteId;

      if (!siteId) {
        return {
          success: false,
          message: 'Site ID is required for Webflow trigger',
          error: 'Missing site ID',
        };
      }

      const webhookUrl = this.generateWebhookUrl(workflowId);

      // Map trigger to Webflow trigger types
      const triggerTypeMap: Record<string, string> = {
        'form_submission': 'form_submission',
        'item_created': 'collection_item_created',
        'item_updated': 'collection_item_changed',
        'item_deleted': 'collection_item_deleted',
        'site_published': 'site_publish',
        'page_created': 'page_created',
        'page_metadata_updated': 'page_metadata_updated',
      };

      const triggerType = triggerTypeMap[triggerId] || 'form_submission';

      // Create webhook via Webflow API v2
      const requestBody: any = {
        url: webhookUrl,
        triggerType: triggerType,
      };

      // Add collection filter if specified
      const collectionId = triggerConfig.collectionId || triggerConfig.actionParams?.collectionId;
      if (collectionId && triggerId.startsWith('item_')) {
        requestBody.filter = { 'payload.collectionId': collectionId };
      }

      const response = await axios.post(
        `https://api.webflow.com/v2/sites/${siteId}/webhooks`,
        requestBody,
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
          }
        }
      );

      const webhookId = response.data.id;

      // Store trigger state
      this.activeTriggers.set(workflowId, {
        webhookId,
        webhookUrl,
        triggerId,
        siteId,
        activatedAt: new Date(),
      });

      await this.storeWebhookData(workflowId, webhookId, webhookUrl, accessToken, siteId);

      this.logger.log(`Webflow trigger activated for workflow ${workflowId}`);

      return {
        success: true,
        message: 'Webflow webhook registered successfully',
        data: {
          webhookId,
          webhookUrl,
          triggerType,
          siteId,
        },
      };

    } catch (error: any) {
      this.logger.error(`Failed to activate Webflow trigger:`, error);

      const errorMessage = error.response?.data?.message || error.response?.data?.err || error.message;
      return {
        success: false,
        message: 'Failed to activate Webflow trigger',
        error: errorMessage,
      };
    }
  }

  async deactivate(workflowId: string): Promise<TriggerDeactivationResult> {
    try {
      this.logger.log(`Deactivating Webflow trigger for workflow ${workflowId}`);

      const trigger = this.activeTriggers.get(workflowId);
      const storedData = await this.getStoredWebhookData(workflowId);

      const webhookId = trigger?.webhookId || storedData?.webhookId;
      const accessToken = storedData?.accessToken;
      const siteId = trigger?.siteId || storedData?.siteId;

      if (webhookId && accessToken && siteId) {
        try {
          await axios.delete(`https://api.webflow.com/v2/sites/${siteId}/webhooks/${webhookId}`, {
            headers: { Authorization: `Bearer ${accessToken}` }
          });
        } catch (deleteError: any) {
          this.logger.warn(`Failed to delete webhook from Webflow: ${deleteError.message}`);
        }
      }

      this.activeTriggers.delete(workflowId);
      await this.deleteStoredWebhookData(workflowId);

      return {
        success: true,
        message: 'Webflow webhook deleted successfully',
      };

    } catch (error: any) {
      this.logger.error(`Failed to deactivate Webflow trigger:`, error);
      this.activeTriggers.delete(workflowId);

      return {
        success: false,
        message: 'Failed to deactivate Webflow trigger',
      };
    }
  }

  async getStatus(workflowId: string): Promise<TriggerStatus> {
    const trigger = this.activeTriggers.get(workflowId);

    if (!trigger) {
      return {
        active: false,
        type: TriggerType.WEBFLOW,
        message: 'Webflow trigger not active',
      };
    }

    return {
      active: true,
      type: TriggerType.WEBFLOW,
      message: 'Webflow trigger active',
      metadata: {
        webhookId: trigger.webhookId,
        webhookUrl: trigger.webhookUrl,
        triggerId: trigger.triggerId,
        siteId: trigger.siteId,
        activatedAt: trigger.activatedAt,
      },
    };
  }

  getTriggerType(): TriggerType {
    return TriggerType.WEBFLOW;
  }

  getActiveTrigger(workflowId: string): ActiveTrigger | undefined {
    return this.activeTriggers.get(workflowId);
  }

  private generateWebhookUrl(workflowId: string): string {
    const baseUrl = this.configService.get<string>('APP_URL') || 'http://localhost:3000';
    return `${baseUrl.replace(/\/$/, '')}/api/v1/webhooks/webflow/${workflowId}`;
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

  private async storeWebhookData(workflowId: string, webhookId: string, webhookUrl: string, accessToken: string, siteId: string): Promise<void> {
    try {
      await this.platformService.query(
        `INSERT INTO workflow_triggers (workflow_id, trigger_type, webhook_data, created_at)
         VALUES ($1, $2, $3, NOW())
         ON CONFLICT (workflow_id, trigger_type) DO UPDATE SET webhook_data = $3, updated_at = NOW()`,
        [workflowId, 'webflow', JSON.stringify({ webhookId, webhookUrl, accessToken, siteId })]
      );
    } catch (error) {
      this.logger.warn('Failed to store webhook data:', error);
    }
  }

  private async getStoredWebhookData(workflowId: string): Promise<any> {
    try {
      const result = await this.platformService.query(
        'SELECT webhook_data FROM workflow_triggers WHERE workflow_id = $1 AND trigger_type = $2',
        [workflowId, 'webflow']
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
        [workflowId, 'webflow']
      );
    } catch (error) {
      this.logger.warn('Failed to delete stored webhook data:', error);
    }
  }
}
