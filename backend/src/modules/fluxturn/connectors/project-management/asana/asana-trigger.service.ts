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

interface AsanaTriggerConfig {
  triggerId?: string;
  projectId?: string;
  workspaceId?: string;
  credentialId?: string;
  connectorConfigId?: string;
  actionParams?: {
    projectId?: string;
    workspaceId?: string;
    triggerId?: string;
  };
}

interface AsanaWebhookConfig {
  webhookGid: string;
  resourceGid: string;
  secretToken: string;
  triggerId: string;
}

interface ActiveTrigger {
  workflowId: string;
  triggerId: string;
  config: AsanaWebhookConfig;
  credentials: any;
  hookSecret?: string;
}

@Injectable()
export class AsanaTriggerService implements ITriggerService, OnModuleDestroy {
  private readonly logger = new Logger(AsanaTriggerService.name);
  private readonly activeTriggers = new Map<string, ActiveTrigger>();
  private readonly hookSecrets = new Map<string, string>();
  private readonly baseUrl = 'https://app.asana.com/api/1.0';

  constructor(
    private readonly configService: ConfigService,
    private readonly platformService: PlatformService,
  ) {}

  getTriggerType(): TriggerType {
    return TriggerType.ASANA;
  }

  async onModuleDestroy(): Promise<void> {
    this.logger.log('Cleaning up Asana triggers...');
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
    this.logger.log('Asana trigger cleanup completed');
  }

  async activate(
    workflowId: string,
    triggerConfig: AsanaTriggerConfig,
  ): Promise<TriggerActivationResult> {
    try {
      const triggerId = triggerConfig.triggerId || triggerConfig.actionParams?.triggerId || 'task_created';
      const resourceGid = triggerConfig.projectId || triggerConfig.workspaceId ||
                         triggerConfig.actionParams?.projectId || triggerConfig.actionParams?.workspaceId;

      this.logger.log(`Activating Asana trigger ${triggerId} for workflow ${workflowId}`);

      if (!resourceGid) {
        return {
          success: false,
          message: 'Project ID or Workspace ID is required for Asana trigger',
          error: 'Missing projectId or workspaceId in trigger configuration',
        };
      }

      // Get credentials
      const credentialId = triggerConfig.credentialId || triggerConfig.connectorConfigId;
      let accessToken: string | undefined;

      if (credentialId) {
        const credentials = await this.getCredentials(credentialId);
        accessToken = credentials?.accessToken || credentials?.access_token;
      }

      if (!accessToken) {
        return {
          success: false,
          message: 'Asana access token is required',
          error: 'Missing accessToken in credentials',
        };
      }

      const appUrl = this.configService.get<string>('APP_URL') || 'http://localhost:3000';
      const webhookUrl = `${appUrl}/api/v1/webhooks/asana/${workflowId}`;

      // Get filters based on trigger type
      const filters = this.getFiltersForTrigger(triggerId);

      // Create webhook via Asana API
      const response = await axios.post(
        `${this.baseUrl}/webhooks`,
        {
          data: {
            resource: resourceGid,
            target: webhookUrl,
            filters,
          },
        },
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
          },
        },
      );

      if (!response.data?.data?.gid) {
        return {
          success: false,
          message: 'Failed to create Asana webhook',
          error: 'API did not return webhook GID',
        };
      }

      const webhookGid = response.data.data.gid;

      // Store webhook configuration
      const webhookConfig: AsanaWebhookConfig = {
        webhookGid,
        resourceGid,
        secretToken: '',
        triggerId,
      };

      this.activeTriggers.set(workflowId, {
        workflowId,
        triggerId,
        config: webhookConfig,
        credentials: { accessToken },
      });

      this.logger.log(`Asana webhook created with GID: ${webhookGid}`);

      return {
        success: true,
        message: 'Asana webhook activated successfully',
        data: {
          webhookGid,
          webhookUrl,
          resourceGid,
        },
      };
    } catch (error) {
      this.logger.error(`Failed to activate Asana trigger for workflow ${workflowId}:`, error);
      return {
        success: false,
        message: 'Failed to activate Asana trigger',
        error: error.message,
      };
    }
  }

  async deactivate(workflowId: string): Promise<TriggerDeactivationResult> {
    try {
      this.logger.log(`Deactivating Asana trigger for workflow ${workflowId}`);

      const activeTrigger = this.activeTriggers.get(workflowId);

      if (activeTrigger) {
        const accessToken = activeTrigger.credentials?.accessToken;

        if (accessToken && activeTrigger.config.webhookGid) {
          try {
            await axios.delete(
              `${this.baseUrl}/webhooks/${activeTrigger.config.webhookGid}`,
              {
                headers: {
                  Authorization: `Bearer ${accessToken}`,
                },
              },
            );
            this.logger.log(`Asana webhook ${activeTrigger.config.webhookGid} deleted`);
          } catch (error) {
            this.logger.warn(`Failed to delete webhook ${activeTrigger.config.webhookGid}:`, error.message);
          }
        }

        this.activeTriggers.delete(workflowId);
        this.hookSecrets.delete(workflowId);
      }

      return {
        success: true,
        message: 'Asana trigger deactivated successfully',
      };
    } catch (error) {
      this.logger.error(`Failed to deactivate Asana trigger for workflow ${workflowId}:`, error);
      this.activeTriggers.delete(workflowId);
      this.hookSecrets.delete(workflowId);
      return {
        success: false,
        message: `Failed to deactivate Asana trigger: ${error.message}`,
      };
    }
  }

  async getStatus(workflowId: string): Promise<TriggerStatus> {
    const activeTrigger = this.activeTriggers.get(workflowId);

    if (!activeTrigger) {
      return {
        active: false,
        type: TriggerType.ASANA,
        message: 'No active trigger found for this workflow',
      };
    }

    return {
      active: true,
      type: TriggerType.ASANA,
      message: 'Asana trigger is active',
      metadata: {
        triggerId: activeTrigger.triggerId,
        webhookGid: activeTrigger.config.webhookGid,
        resourceGid: activeTrigger.config.resourceGid,
      },
    };
  }

  storeHookSecret(workflowId: string, hookSecret: string): void {
    this.hookSecrets.set(workflowId, hookSecret);
    const activeTrigger = this.activeTriggers.get(workflowId);
    if (activeTrigger) {
      activeTrigger.hookSecret = hookSecret;
    }
  }

  getHookSecret(workflowId: string): string | undefined {
    return this.hookSecrets.get(workflowId);
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

  private getFiltersForTrigger(triggerId: string): Array<{ resource_type: string; action: string }> {
    const filterMap: Record<string, Array<{ resource_type: string; action: string }>> = {
      'task_created': [{ resource_type: 'task', action: 'added' }],
      'task_updated': [{ resource_type: 'task', action: 'changed' }],
      'task_completed': [{ resource_type: 'task', action: 'changed' }],
      'project_created': [{ resource_type: 'project', action: 'added' }],
      'comment_added': [{ resource_type: 'story', action: 'added' }],
    };

    return filterMap[triggerId] || [{ resource_type: 'task', action: 'changed' }];
  }
}
