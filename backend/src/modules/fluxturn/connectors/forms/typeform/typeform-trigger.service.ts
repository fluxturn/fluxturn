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

interface TypeformTriggerConfig {
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

interface TypeformWebhookConfig {
  formId: string;
  webhookTag: string;
  secretToken: string;
  triggerId: string;
}

interface ActiveTrigger {
  workflowId: string;
  triggerId: string;
  config: TypeformWebhookConfig;
  credentials: any;
}

@Injectable()
export class TypeformTriggerService implements ITriggerService, OnModuleDestroy {
  private readonly logger = new Logger(TypeformTriggerService.name);
  private readonly activeTriggers = new Map<string, ActiveTrigger>();
  private readonly secretTokens = new Map<string, string>();
  private readonly baseUrl = 'https://api.typeform.com';

  constructor(
    private readonly configService: ConfigService,
    private readonly platformService: PlatformService,
  ) {}

  getTriggerType(): TriggerType {
    return TriggerType.TYPEFORM;
  }

  async onModuleDestroy(): Promise<void> {
    this.logger.log('Cleaning up Typeform triggers...');
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
    this.logger.log('Typeform trigger cleanup completed');
  }

  async activate(
    workflowId: string,
    triggerConfig: TypeformTriggerConfig,
  ): Promise<TriggerActivationResult> {
    try {
      const triggerId = triggerConfig.triggerId || triggerConfig.actionParams?.triggerId || 'form_response';
      const formId = triggerConfig.form_id || triggerConfig.formId || triggerConfig.actionParams?.form_id || triggerConfig.actionParams?.formId;

      this.logger.log(`Activating Typeform trigger ${triggerId} for workflow ${workflowId}`);

      if (!formId) {
        return {
          success: false,
          message: 'Form ID is required for Typeform trigger',
          error: 'Missing form_id in trigger configuration',
        };
      }

      // Get credentials
      const credentialId = triggerConfig.credentialId || triggerConfig.connectorConfigId;
      let accessToken: string | undefined;

      if (credentialId) {
        const credentials = await this.getCredentials(credentialId);
        accessToken = credentials?.access_token || credentials?.accessToken;
      }

      if (!accessToken) {
        return {
          success: false,
          message: 'Typeform access token is required',
          error: 'Missing access_token in credentials',
        };
      }

      const appUrl = this.configService.get<string>('APP_URL') || 'http://localhost:3000';
      const webhookUrl = `${appUrl}/api/v1/webhooks/typeform/${workflowId}`;
      const secretToken = this.generateSecretToken();
      const webhookTag = `fluxturn-${workflowId}`;

      // Create webhook via Typeform API
      const response = await axios.put(
        `${this.baseUrl}/forms/${formId}/webhooks/${webhookTag}`,
        {
          url: webhookUrl,
          enabled: true,
          verify_ssl: true,
          secret: secretToken,
        },
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
          },
        },
      );

      if (response.status !== 200 && response.status !== 201) {
        return {
          success: false,
          message: 'Failed to create Typeform webhook',
          error: `API returned status ${response.status}`,
        };
      }

      // Store webhook configuration
      const webhookConfig: TypeformWebhookConfig = {
        formId,
        webhookTag,
        secretToken,
        triggerId,
      };

      this.activeTriggers.set(workflowId, {
        workflowId,
        triggerId,
        config: webhookConfig,
        credentials: { access_token: accessToken },
      });

      this.secretTokens.set(workflowId, secretToken);

      this.logger.log(`Typeform webhook created for form: ${formId}`);

      return {
        success: true,
        message: 'Typeform webhook activated successfully',
        data: {
          formId,
          webhookTag,
          webhookUrl,
        },
      };
    } catch (error) {
      this.logger.error(`Failed to activate Typeform trigger for workflow ${workflowId}:`, error);
      return {
        success: false,
        message: 'Failed to activate Typeform trigger',
        error: error.message,
      };
    }
  }

  async deactivate(workflowId: string): Promise<TriggerDeactivationResult> {
    try {
      this.logger.log(`Deactivating Typeform trigger for workflow ${workflowId}`);

      const activeTrigger = this.activeTriggers.get(workflowId);

      if (activeTrigger) {
        const accessToken = activeTrigger.credentials?.access_token;

        if (accessToken && activeTrigger.config.formId && activeTrigger.config.webhookTag) {
          try {
            await axios.delete(
              `${this.baseUrl}/forms/${activeTrigger.config.formId}/webhooks/${activeTrigger.config.webhookTag}`,
              {
                headers: {
                  Authorization: `Bearer ${accessToken}`,
                },
              },
            );
            this.logger.log(`Typeform webhook ${activeTrigger.config.webhookTag} deleted`);
          } catch (error) {
            this.logger.warn(`Failed to delete webhook ${activeTrigger.config.webhookTag}:`, error.message);
          }
        }

        this.activeTriggers.delete(workflowId);
        this.secretTokens.delete(workflowId);
      }

      return {
        success: true,
        message: 'Typeform trigger deactivated successfully',
      };
    } catch (error) {
      this.logger.error(`Failed to deactivate Typeform trigger for workflow ${workflowId}:`, error);
      this.activeTriggers.delete(workflowId);
      this.secretTokens.delete(workflowId);
      return {
        success: false,
        message: `Failed to deactivate Typeform trigger: ${error.message}`,
      };
    }
  }

  async getStatus(workflowId: string): Promise<TriggerStatus> {
    const activeTrigger = this.activeTriggers.get(workflowId);

    if (!activeTrigger) {
      return {
        active: false,
        type: TriggerType.TYPEFORM,
        message: 'No active trigger found for this workflow',
      };
    }

    return {
      active: true,
      type: TriggerType.TYPEFORM,
      message: 'Typeform trigger is active',
      metadata: {
        triggerId: activeTrigger.triggerId,
        formId: activeTrigger.config.formId,
        webhookTag: activeTrigger.config.webhookTag,
      },
    };
  }

  validateSignature(workflowId: string, payload: string, signature: string): boolean {
    const secretToken = this.secretTokens.get(workflowId);

    if (!secretToken) {
      return true;
    }

    const expectedSignature = crypto
      .createHmac('sha256', secretToken)
      .update(payload)
      .digest('base64');

    const actualSignature = signature.replace('sha256=', '');

    try {
      return crypto.timingSafeEqual(
        Buffer.from(expectedSignature),
        Buffer.from(actualSignature)
      );
    } catch {
      return false;
    }
  }

  getActiveTrigger(workflowId: string): ActiveTrigger | undefined {
    return this.activeTriggers.get(workflowId);
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

  private generateSecretToken(): string {
    return crypto.randomBytes(32).toString('hex');
  }
}
