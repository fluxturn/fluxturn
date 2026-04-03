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

interface ClickUpTriggerConfig {
  triggerId?: string;
  teamId?: string;
  spaceId?: string;
  folderId?: string;
  listId?: string;
  credentialId?: string;
  connectorConfigId?: string;
  actionParams?: {
    teamId?: string;
    spaceId?: string;
    folderId?: string;
    listId?: string;
    triggerId?: string;
  };
}

interface ClickUpWebhookConfig {
  webhookId: string;
  teamId: string;
  events: string[];
  triggerId: string;
}

interface ActiveTrigger {
  workflowId: string;
  triggerId: string;
  config: ClickUpWebhookConfig;
  credentials: any;
  hookSecret?: string;
}

@Injectable()
export class ClickUpTriggerService implements ITriggerService, OnModuleDestroy {
  private readonly logger = new Logger(ClickUpTriggerService.name);
  private readonly activeTriggers = new Map<string, ActiveTrigger>();
  private readonly hookSecrets = new Map<string, string>();
  private readonly baseUrl = 'https://api.clickup.com/api/v2';

  constructor(
    private readonly configService: ConfigService,
    private readonly platformService: PlatformService,
  ) {}

  getTriggerType(): TriggerType {
    return TriggerType.CLICKUP;
  }

  async onModuleDestroy(): Promise<void> {
    this.logger.log('Cleaning up ClickUp triggers...');
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
    this.logger.log('ClickUp trigger cleanup completed');
  }

  async activate(
    workflowId: string,
    triggerConfig: ClickUpTriggerConfig,
  ): Promise<TriggerActivationResult> {
    try {
      const triggerId = triggerConfig.triggerId || triggerConfig.actionParams?.triggerId || 'task_created';
      const teamId = triggerConfig.teamId || triggerConfig.actionParams?.teamId;

      this.logger.log(`Activating ClickUp trigger ${triggerId} for workflow ${workflowId}`);

      if (!teamId) {
        return {
          success: false,
          message: 'Team ID (workspace) is required for ClickUp trigger',
          error: 'Missing teamId in trigger configuration',
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
          message: 'ClickUp access token is required',
          error: 'Missing accessToken in credentials',
        };
      }

      const appUrl = this.configService.get<string>('APP_URL') || 'http://localhost:3000';
      const webhookUrl = `${appUrl}/api/v1/webhooks/clickup/${workflowId}`;

      // Get events based on trigger type
      const events = this.getEventsForTrigger(triggerId);

      // Build webhook request body
      const webhookBody: any = {
        endpoint: webhookUrl,
        events,
      };

      // Add optional filters
      if (triggerConfig.spaceId || triggerConfig.actionParams?.spaceId) {
        webhookBody.space_id = triggerConfig.spaceId || triggerConfig.actionParams?.spaceId;
      }
      if (triggerConfig.folderId || triggerConfig.actionParams?.folderId) {
        webhookBody.folder_id = triggerConfig.folderId || triggerConfig.actionParams?.folderId;
      }
      if (triggerConfig.listId || triggerConfig.actionParams?.listId) {
        webhookBody.list_id = triggerConfig.listId || triggerConfig.actionParams?.listId;
      }

      // Create webhook via ClickUp API
      const response = await axios.post(
        `${this.baseUrl}/team/${teamId}/webhook`,
        webhookBody,
        {
          headers: {
            Authorization: accessToken,
            'Content-Type': 'application/json',
          },
        },
      );

      if (!response.data?.id) {
        return {
          success: false,
          message: 'Failed to create ClickUp webhook',
          error: 'API did not return webhook ID',
        };
      }

      const webhookId = response.data.id;

      // Store webhook configuration
      const webhookConfig: ClickUpWebhookConfig = {
        webhookId,
        teamId,
        events,
        triggerId,
      };

      this.activeTriggers.set(workflowId, {
        workflowId,
        triggerId,
        config: webhookConfig,
        credentials: { accessToken },
      });

      this.logger.log(`ClickUp webhook created with ID: ${webhookId}`);

      return {
        success: true,
        message: 'ClickUp webhook activated successfully',
        data: {
          webhookId,
          webhookUrl,
          teamId,
          events,
        },
      };
    } catch (error) {
      this.logger.error(`Failed to activate ClickUp trigger for workflow ${workflowId}:`, error);
      return {
        success: false,
        message: 'Failed to activate ClickUp trigger',
        error: error.message,
      };
    }
  }

  async deactivate(workflowId: string): Promise<TriggerDeactivationResult> {
    try {
      this.logger.log(`Deactivating ClickUp trigger for workflow ${workflowId}`);

      const activeTrigger = this.activeTriggers.get(workflowId);

      if (activeTrigger) {
        const accessToken = activeTrigger.credentials?.accessToken;

        if (accessToken && activeTrigger.config.webhookId) {
          try {
            await axios.delete(
              `${this.baseUrl}/webhook/${activeTrigger.config.webhookId}`,
              {
                headers: {
                  Authorization: accessToken,
                },
              },
            );
            this.logger.log(`ClickUp webhook ${activeTrigger.config.webhookId} deleted`);
          } catch (error) {
            this.logger.warn(`Failed to delete webhook ${activeTrigger.config.webhookId}:`, error.message);
          }
        }

        this.activeTriggers.delete(workflowId);
        this.hookSecrets.delete(workflowId);
      }

      return {
        success: true,
        message: 'ClickUp trigger deactivated successfully',
      };
    } catch (error) {
      this.logger.error(`Failed to deactivate ClickUp trigger for workflow ${workflowId}:`, error);
      this.activeTriggers.delete(workflowId);
      this.hookSecrets.delete(workflowId);
      return {
        success: false,
        message: `Failed to deactivate ClickUp trigger: ${error.message}`,
      };
    }
  }

  async getStatus(workflowId: string): Promise<TriggerStatus> {
    const activeTrigger = this.activeTriggers.get(workflowId);

    if (!activeTrigger) {
      return {
        active: false,
        type: TriggerType.CLICKUP,
        message: 'No active trigger found for this workflow',
      };
    }

    return {
      active: true,
      type: TriggerType.CLICKUP,
      message: 'ClickUp trigger is active',
      metadata: {
        triggerId: activeTrigger.triggerId,
        webhookId: activeTrigger.config.webhookId,
        teamId: activeTrigger.config.teamId,
        events: activeTrigger.config.events,
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

  /**
   * Map trigger IDs to ClickUp webhook event types
   * ClickUp event types: taskCreated, taskUpdated, taskDeleted, taskPriorityUpdated,
   * taskStatusUpdated, taskAssigneeUpdated, taskDueDateUpdated, taskTagUpdated,
   * taskMoved, taskCommentPosted, taskCommentUpdated, taskTimeEstimateUpdated,
   * taskTimeTrackedUpdated, listCreated, listUpdated, listDeleted,
   * folderCreated, folderUpdated, folderDeleted, spaceCreated, spaceUpdated, spaceDeleted,
   * goalCreated, goalUpdated, goalDeleted, keyResultCreated, keyResultUpdated, keyResultDeleted
   */
  private getEventsForTrigger(triggerId: string): string[] {
    const eventMap: Record<string, string[]> = {
      'task_created': ['taskCreated'],
      'task_updated': ['taskUpdated'],
      'task_deleted': ['taskDeleted'],
      'task_status_updated': ['taskStatusUpdated'],
      'task_priority_updated': ['taskPriorityUpdated'],
      'task_assignee_updated': ['taskAssigneeUpdated'],
      'task_comment_posted': ['taskCommentPosted'],
      'list_created': ['listCreated'],
      'goal_created': ['goalCreated'],
      'goal_updated': ['goalUpdated'],
    };

    return eventMap[triggerId] || ['taskUpdated'];
  }
}
