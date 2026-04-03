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

interface MondayTriggerConfig {
  triggerId?: string;
  boardId?: string;
  credentialId?: string;
  connectorConfigId?: string;
  actionParams?: {
    boardId?: string;
    triggerId?: string;
  };
}

interface MondayWebhookConfig {
  webhookId: string;
  boardId: string;
  secretToken: string;
  triggerId: string;
}

interface ActiveTrigger {
  workflowId: string;
  triggerId: string;
  config: MondayWebhookConfig;
  credentials: any;
}

@Injectable()
export class MondayTriggerService implements ITriggerService, OnModuleDestroy {
  private readonly logger = new Logger(MondayTriggerService.name);
  private readonly activeTriggers = new Map<string, ActiveTrigger>();
  private readonly secretTokens = new Map<string, string>();
  private readonly baseUrl = 'https://api.monday.com/v2';

  constructor(
    private readonly configService: ConfigService,
    private readonly platformService: PlatformService,
  ) {}

  getTriggerType(): TriggerType {
    return TriggerType.MONDAY;
  }

  async onModuleDestroy(): Promise<void> {
    this.logger.log('Cleaning up Monday.com triggers...');
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
    this.logger.log('Monday.com trigger cleanup completed');
  }

  async activate(
    workflowId: string,
    triggerConfig: MondayTriggerConfig,
  ): Promise<TriggerActivationResult> {
    try {
      const triggerId = triggerConfig.triggerId || triggerConfig.actionParams?.triggerId || 'item_created';
      const boardId = triggerConfig.boardId || triggerConfig.actionParams?.boardId;

      this.logger.log(`Activating Monday.com trigger ${triggerId} for workflow ${workflowId}`);

      if (!boardId) {
        return {
          success: false,
          message: 'Board ID is required for Monday.com trigger',
          error: 'Missing boardId in trigger configuration',
        };
      }

      // Get credentials
      const credentialId = triggerConfig.credentialId || triggerConfig.connectorConfigId;
      let apiKey: string | undefined;

      if (credentialId) {
        const credentials = await this.getCredentials(credentialId);
        apiKey = credentials?.apiKey || credentials?.api_key;
      }

      if (!apiKey) {
        return {
          success: false,
          message: 'Monday.com API key is required',
          error: 'Missing API key in credentials',
        };
      }

      const appUrl = this.configService.get<string>('APP_URL') || 'http://localhost:3000';
      const webhookUrl = `${appUrl}/api/v1/webhooks/monday/${workflowId}`;
      const secretToken = this.generateSecretToken();

      // Map trigger ID to Monday.com event type
      const eventType = this.mapTriggerIdToEvent(triggerId);

      // Create webhook via Monday.com GraphQL API
      const mutation = `
        mutation {
          create_webhook (
            board_id: ${boardId}
            url: "${webhookUrl}"
            event: ${eventType}
          ) {
            id
            board_id
          }
        }
      `;

      const response = await this.makeGraphQLRequest(mutation, apiKey);

      if (!response.data?.create_webhook?.id) {
        return {
          success: false,
          message: 'Failed to create Monday.com webhook',
          error: response.errors?.[0]?.message || 'Unknown error',
        };
      }

      const webhookId = response.data.create_webhook.id;

      // Store webhook configuration
      const webhookConfig: MondayWebhookConfig = {
        webhookId,
        boardId,
        secretToken,
        triggerId,
      };

      this.activeTriggers.set(workflowId, {
        workflowId,
        triggerId,
        config: webhookConfig,
        credentials: { apiKey },
      });

      this.secretTokens.set(workflowId, secretToken);

      this.logger.log(`Monday.com webhook created with ID: ${webhookId}`);

      return {
        success: true,
        message: 'Monday.com webhook activated successfully',
        data: {
          webhookId,
          webhookUrl,
          boardId,
          eventType,
        },
      };
    } catch (error) {
      this.logger.error(`Failed to activate Monday.com trigger for workflow ${workflowId}:`, error);
      return {
        success: false,
        message: 'Failed to activate Monday.com trigger',
        error: error.message,
      };
    }
  }

  async deactivate(workflowId: string): Promise<TriggerDeactivationResult> {
    try {
      this.logger.log(`Deactivating Monday.com trigger for workflow ${workflowId}`);

      const activeTrigger = this.activeTriggers.get(workflowId);

      if (activeTrigger) {
        const apiKey = activeTrigger.credentials?.apiKey;

        if (apiKey && activeTrigger.config.webhookId) {
          // Delete webhook via Monday.com GraphQL API
          const mutation = `
            mutation {
              delete_webhook (id: ${activeTrigger.config.webhookId}) {
                id
              }
            }
          `;

          try {
            await this.makeGraphQLRequest(mutation, apiKey);
            this.logger.log(`Monday.com webhook ${activeTrigger.config.webhookId} deleted`);
          } catch (error) {
            this.logger.warn(`Failed to delete webhook ${activeTrigger.config.webhookId}:`, error.message);
          }
        }

        this.activeTriggers.delete(workflowId);
        this.secretTokens.delete(workflowId);
      }

      return {
        success: true,
        message: 'Monday.com trigger deactivated successfully',
      };
    } catch (error) {
      this.logger.error(`Failed to deactivate Monday.com trigger for workflow ${workflowId}:`, error);
      // Still clean up local state
      this.activeTriggers.delete(workflowId);
      this.secretTokens.delete(workflowId);
      return {
        success: false,
        message: `Failed to deactivate Monday.com trigger: ${error.message}`,
      };
    }
  }

  async getStatus(workflowId: string): Promise<TriggerStatus> {
    const activeTrigger = this.activeTriggers.get(workflowId);

    if (!activeTrigger) {
      return {
        active: false,
        type: TriggerType.MONDAY,
        message: 'No active trigger found for this workflow',
      };
    }

    return {
      active: true,
      type: TriggerType.MONDAY,
      message: 'Monday.com trigger is active',
      metadata: {
        triggerId: activeTrigger.triggerId,
        webhookId: activeTrigger.config.webhookId,
        boardId: activeTrigger.config.boardId,
      },
    };
  }

  validateSecretToken(workflowId: string, token: string): boolean {
    const storedToken = this.secretTokens.get(workflowId);

    if (!storedToken) {
      return true;
    }

    try {
      return crypto.timingSafeEqual(
        Buffer.from(storedToken),
        Buffer.from(token || '')
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

  private mapTriggerIdToEvent(triggerId: string): string {
    const eventMap: Record<string, string> = {
      'item_created': 'create_pulse',
      'item_updated': 'change_column_value',
      'status_changed': 'change_status_column_value',
      'board_created': 'create_board',
    };

    return eventMap[triggerId] || 'create_pulse';
  }

  private generateSecretToken(): string {
    return crypto.randomBytes(32).toString('hex');
  }

  private async makeGraphQLRequest(query: string, apiKey: string): Promise<any> {
    const response = await axios.post(
      this.baseUrl,
      { query },
      {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': apiKey,
          'API-Version': '2024-01',
        },
      },
    );

    if (response.data.errors) {
      throw new Error(response.data.errors[0]?.message || 'Monday.com API error');
    }

    return response.data;
  }
}
