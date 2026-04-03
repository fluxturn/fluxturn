import { Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
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

interface JotformTriggerConfig {
  triggerId?: string;
  form_id?: string;
  formId?: string;
  credentialId?: string;
  connectorConfigId?: string;
  actionParams?: {
    form_id?: string;
    formId?: string;
    triggerId?: string;
  };
}

interface JotformWebhookConfig {
  formId: string;
  webhookId: string;
  webhookUrl: string;
  triggerId: string;
}

interface ActiveTrigger {
  workflowId: string;
  triggerId: string;
  config: JotformWebhookConfig;
  credentials: any;
}

@Injectable()
export class JotformTriggerService implements ITriggerService, OnModuleDestroy {
  private readonly logger = new Logger(JotformTriggerService.name);
  private readonly activeTriggers = new Map<string, ActiveTrigger>();
  private readonly baseUrl = 'https://api.jotform.com';

  constructor(
    private readonly configService: ConfigService,
    private readonly platformService: PlatformService,
  ) {}

  getTriggerType(): TriggerType {
    return TriggerType.JOTFORM;
  }

  async onModuleDestroy(): Promise<void> {
    this.logger.log('Cleaning up Jotform triggers...');
    const deactivationPromises: Promise<TriggerDeactivationResult>[] = [];

    for (const workflowId of this.activeTriggers.keys()) {
      deactivationPromises.push(
        this.deactivate(workflowId).catch((error) => {
          this.logger.error(`Failed to deactivate trigger for workflow ${workflowId}:`, error);
          return { success: false, message: `Cleanup failed: ${error.message}` };
        }),
      );
    }

    await Promise.all(deactivationPromises);
    this.logger.log('Jotform trigger cleanup completed');
  }

  async activate(
    workflowId: string,
    triggerConfig: JotformTriggerConfig,
  ): Promise<TriggerActivationResult> {
    try {
      const triggerId = triggerConfig.triggerId || triggerConfig.actionParams?.triggerId || 'form_submission';
      const formId = triggerConfig.form_id || triggerConfig.formId || triggerConfig.actionParams?.form_id || triggerConfig.actionParams?.formId;

      this.logger.log(`Activating Jotform trigger ${triggerId} for workflow ${workflowId}`);

      if (!formId) {
        return {
          success: false,
          message: 'Form ID is required for Jotform trigger',
          error: 'Missing form_id in trigger configuration',
        };
      }

      // Get credentials
      const credentialId = triggerConfig.credentialId || triggerConfig.connectorConfigId;
      let apiKey: string | undefined;
      let apiDomain: string = 'api.jotform.com';

      if (credentialId) {
        const credentials = await this.getCredentials(credentialId);
        apiKey = credentials?.apiKey;
        apiDomain = credentials?.apiDomain || 'api.jotform.com';
      }

      if (!apiKey) {
        return {
          success: false,
          message: 'Jotform API key is required',
          error: 'Missing apiKey in credentials',
        };
      }

      const appUrl = this.configService.get<string>('APP_URL') || 'http://localhost:3000';
      const webhookUrl = `${appUrl}/api/v1/webhooks/jotform/${workflowId}`;
      const baseUrl = `https://${apiDomain}`;

      // Check if webhook already exists for this form
      // Jotform returns webhooks as an object with numeric keys like {"0": "url1", "1": "url2"}
      const existingWebhooks = await this.getFormWebhooks(baseUrl, formId, apiKey);
      const existingWebhookKey = Object.keys(existingWebhooks).find(
        key => existingWebhooks[key] === webhookUrl
      );

      let webhookId: string;

      if (existingWebhookKey) {
        // Webhook already exists, reuse it
        webhookId = existingWebhookKey;
        this.logger.log(`Reusing existing Jotform webhook for form: ${formId}`);
      } else {
        // Create new webhook via Jotform API
        const response = await axios.post(
          `${baseUrl}/form/${formId}/webhooks`,
          `webhookURL=${encodeURIComponent(webhookUrl)}`,
          {
            headers: {
              'APIKEY': apiKey,
              'Content-Type': 'application/x-www-form-urlencoded',
            },
          },
        );

        if (response.data?.responseCode !== 200) {
          return {
            success: false,
            message: 'Failed to create Jotform webhook',
            error: response.data?.message || `API returned status ${response.status}`,
          };
        }

        webhookId = response.data?.content || `fluxturn-${workflowId}`;
        this.logger.log(`Jotform webhook created for form: ${formId}`);
      }

      // Store webhook configuration
      const webhookConfig: JotformWebhookConfig = {
        formId,
        webhookId: String(webhookId),
        webhookUrl,
        triggerId,
      };

      this.activeTriggers.set(workflowId, {
        workflowId,
        triggerId,
        config: webhookConfig,
        credentials: { apiKey, apiDomain },
      });

      return {
        success: true,
        message: 'Jotform webhook activated successfully',
        data: {
          formId,
          webhookId,
          webhookUrl,
        },
      };
    } catch (error) {
      this.logger.error(`Failed to activate Jotform trigger for workflow ${workflowId}:`, error);
      return {
        success: false,
        message: 'Failed to activate Jotform trigger',
        error: error.message,
      };
    }
  }

  async deactivate(workflowId: string): Promise<TriggerDeactivationResult> {
    try {
      this.logger.log(`Deactivating Jotform trigger for workflow ${workflowId}`);

      const activeTrigger = this.activeTriggers.get(workflowId);

      if (activeTrigger) {
        const apiKey = activeTrigger.credentials?.apiKey;
        const apiDomain = activeTrigger.credentials?.apiDomain || 'api.jotform.com';
        const baseUrl = `https://${apiDomain}`;

        if (apiKey && activeTrigger.config.formId && activeTrigger.config.webhookId) {
          try {
            await axios.delete(
              `${baseUrl}/form/${activeTrigger.config.formId}/webhooks/${activeTrigger.config.webhookId}`,
              {
                headers: {
                  'APIKEY': apiKey,
                },
              },
            );
            this.logger.log(`Jotform webhook ${activeTrigger.config.webhookId} deleted`);
          } catch (error) {
            this.logger.warn(`Failed to delete webhook ${activeTrigger.config.webhookId}:`, error.message);
          }
        }

        this.activeTriggers.delete(workflowId);
      }

      return {
        success: true,
        message: 'Jotform trigger deactivated successfully',
      };
    } catch (error) {
      this.logger.error(`Failed to deactivate Jotform trigger for workflow ${workflowId}:`, error);
      this.activeTriggers.delete(workflowId);
      return {
        success: false,
        message: `Failed to deactivate Jotform trigger: ${error.message}`,
      };
    }
  }

  async getStatus(workflowId: string): Promise<TriggerStatus> {
    const activeTrigger = this.activeTriggers.get(workflowId);

    if (!activeTrigger) {
      return {
        active: false,
        type: TriggerType.JOTFORM,
        message: 'No active trigger found for this workflow',
      };
    }

    return {
      active: true,
      type: TriggerType.JOTFORM,
      message: 'Jotform trigger is active',
      metadata: {
        triggerId: activeTrigger.triggerId,
        formId: activeTrigger.config.formId,
        webhookId: activeTrigger.config.webhookId,
      },
    };
  }

  getActiveTrigger(workflowId: string): ActiveTrigger | undefined {
    return this.activeTriggers.get(workflowId);
  }

  private async getFormWebhooks(baseUrl: string, formId: string, apiKey: string): Promise<any> {
    try {
      const response = await axios.get(
        `${baseUrl}/form/${formId}/webhooks`,
        {
          headers: {
            'APIKEY': apiKey,
          },
        },
      );
      return response.data?.content || {};
    } catch (error) {
      this.logger.warn(`Failed to get existing webhooks for form ${formId}:`, error.message);
      return {};
    }
  }

  private async getCredentials(credentialId: string): Promise<any> {
    try {
      const query = `SELECT credentials FROM connector_configs WHERE id = $1`;
      const result = await this.platformService.query(query, [credentialId]);

      if (result.rows.length === 0) {
        return null;
      }

      const credentials = result.rows[0].credentials;

      if (credentials?.iv && (credentials?.data || credentials?.encrypted) && credentials?.authTag) {
        return this.decryptCredentials(credentials);
      }

      return credentials;
    } catch (error) {
      this.logger.error(`Failed to fetch credentials ${credentialId}:`, error);
      return null;
    }
  }

  private decryptCredentials(encryptedConfig: any): any {
    try {
      const encrypted = encryptedConfig.data || encryptedConfig.encrypted;
      const iv = encryptedConfig.iv;
      const authTag = encryptedConfig.authTag;

      const secretKey = this.configService.get<string>('CONNECTOR_ENCRYPTION_KEY');
      if (!secretKey) {
        throw new Error('CONNECTOR_ENCRYPTION_KEY not set');
      }

      const algorithm = 'aes-256-gcm';
      const key = Buffer.from(secretKey.slice(0, 32));

      const decipher = crypto.createDecipheriv(algorithm, key, Buffer.from(iv, 'hex'));
      decipher.setAuthTag(Buffer.from(authTag, 'hex'));

      let decrypted = decipher.update(encrypted, 'hex', 'utf8');
      decrypted += decipher.final('utf8');

      return JSON.parse(decrypted);
    } catch (error) {
      this.logger.error('Credential decryption failed:', error);
      throw error;
    }
  }
}
