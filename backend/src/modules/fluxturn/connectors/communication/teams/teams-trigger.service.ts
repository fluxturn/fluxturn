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

interface TeamsTriggerConfig {
  triggerId?: string;
  teamId?: string;
  channelId?: string;
  chatId?: string;
  credentialId?: string;
  connectorConfigId?: string;
  actionParams?: {
    teamId?: string;
    channelId?: string;
    chatId?: string;
    triggerId?: string;
  };
}

interface TeamsSubscriptionConfig {
  subscriptionId: string;
  resource: string;
  changeType: string;
  expirationDateTime: string;
  triggerId: string;
}

interface ActiveTrigger {
  workflowId: string;
  triggerId: string;
  config: TeamsSubscriptionConfig;
  credentials: any;
  clientState?: string;
}

@Injectable()
export class TeamsTriggerService implements ITriggerService, OnModuleDestroy {
  private readonly logger = new Logger(TeamsTriggerService.name);
  private readonly activeTriggers = new Map<string, ActiveTrigger>();
  private readonly clientStates = new Map<string, string>();
  private readonly baseUrl = 'https://graph.microsoft.com/v1.0';

  constructor(
    private readonly configService: ConfigService,
    private readonly platformService: PlatformService,
  ) {}

  getTriggerType(): TriggerType {
    return TriggerType.TEAMS;
  }

  async onModuleDestroy(): Promise<void> {
    this.logger.log('Cleaning up Teams triggers...');
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
    this.logger.log('Teams trigger cleanup completed');
  }

  async activate(
    workflowId: string,
    triggerConfig: TeamsTriggerConfig,
  ): Promise<TriggerActivationResult> {
    try {
      const triggerId = triggerConfig.triggerId || triggerConfig.actionParams?.triggerId || 'new_channel_message';

      this.logger.log(`Activating Teams trigger ${triggerId} for workflow ${workflowId}`);

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
          message: 'Teams access token is required',
          error: 'Missing accessToken in credentials',
        };
      }

      const appUrl = this.configService.get<string>('APP_URL') || 'http://localhost:3000';
      const webhookUrl = `${appUrl}/api/v1/webhooks/teams/${workflowId}`;

      // Generate client state for validation
      const clientState = crypto.randomBytes(32).toString('hex');
      this.clientStates.set(workflowId, clientState);

      // Get subscription resource and change type based on trigger
      const { resource, changeType } = this.getSubscriptionConfig(triggerId, triggerConfig);

      // Calculate expiration (max 4230 minutes for channel messages)
      const expirationDateTime = new Date(Date.now() + 4200 * 60 * 1000).toISOString();

      // Create subscription via Microsoft Graph API
      const response = await axios.post(
        `${this.baseUrl}/subscriptions`,
        {
          changeType,
          notificationUrl: webhookUrl,
          resource,
          expirationDateTime,
          clientState,
        },
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
          },
        },
      );

      if (!response.data?.id) {
        return {
          success: false,
          message: 'Failed to create Teams subscription',
          error: 'API did not return subscription ID',
        };
      }

      const subscriptionId = response.data.id;

      // Store subscription configuration
      const subscriptionConfig: TeamsSubscriptionConfig = {
        subscriptionId,
        resource,
        changeType,
        expirationDateTime,
        triggerId,
      };

      this.activeTriggers.set(workflowId, {
        workflowId,
        triggerId,
        config: subscriptionConfig,
        credentials: { accessToken },
        clientState,
      });

      this.logger.log(`Teams subscription created with ID: ${subscriptionId}`);

      return {
        success: true,
        message: 'Teams trigger activated successfully',
        data: {
          subscriptionId,
          webhookUrl,
          resource,
          expirationDateTime,
        },
      };
    } catch (error) {
      this.logger.error(`Failed to activate Teams trigger for workflow ${workflowId}:`, error);
      return {
        success: false,
        message: 'Failed to activate Teams trigger',
        error: error.response?.data?.error?.message || error.message,
      };
    }
  }

  async deactivate(workflowId: string): Promise<TriggerDeactivationResult> {
    try {
      this.logger.log(`Deactivating Teams trigger for workflow ${workflowId}`);

      const activeTrigger = this.activeTriggers.get(workflowId);

      if (activeTrigger) {
        const accessToken = activeTrigger.credentials?.accessToken;

        if (accessToken && activeTrigger.config.subscriptionId) {
          try {
            await axios.delete(
              `${this.baseUrl}/subscriptions/${activeTrigger.config.subscriptionId}`,
              {
                headers: {
                  Authorization: `Bearer ${accessToken}`,
                },
              },
            );
            this.logger.log(`Teams subscription ${activeTrigger.config.subscriptionId} deleted`);
          } catch (error) {
            this.logger.warn(`Failed to delete subscription ${activeTrigger.config.subscriptionId}:`, error.message);
          }
        }

        this.activeTriggers.delete(workflowId);
        this.clientStates.delete(workflowId);
      }

      return {
        success: true,
        message: 'Teams trigger deactivated successfully',
      };
    } catch (error) {
      this.logger.error(`Failed to deactivate Teams trigger for workflow ${workflowId}:`, error);
      this.activeTriggers.delete(workflowId);
      this.clientStates.delete(workflowId);
      return {
        success: false,
        message: `Failed to deactivate Teams trigger: ${error.message}`,
      };
    }
  }

  async getStatus(workflowId: string): Promise<TriggerStatus> {
    const activeTrigger = this.activeTriggers.get(workflowId);

    if (!activeTrigger) {
      return {
        active: false,
        type: TriggerType.TEAMS,
        message: 'No active trigger found for this workflow',
      };
    }

    // Check if subscription is expired
    const expirationDate = new Date(activeTrigger.config.expirationDateTime);
    const isExpired = expirationDate < new Date();

    return {
      active: !isExpired,
      type: TriggerType.TEAMS,
      message: isExpired ? 'Subscription expired, needs renewal' : 'Teams trigger is active',
      metadata: {
        triggerId: activeTrigger.triggerId,
        subscriptionId: activeTrigger.config.subscriptionId,
        resource: activeTrigger.config.resource,
        expirationDateTime: activeTrigger.config.expirationDateTime,
      },
    };
  }

  validateClientState(workflowId: string, clientState: string): boolean {
    const storedState = this.clientStates.get(workflowId);
    return storedState === clientState;
  }

  getClientState(workflowId: string): string | undefined {
    return this.clientStates.get(workflowId);
  }

  getActiveTrigger(workflowId: string): ActiveTrigger | undefined {
    return this.activeTriggers.get(workflowId);
  }

  async renewSubscription(workflowId: string): Promise<TriggerActivationResult> {
    const activeTrigger = this.activeTriggers.get(workflowId);

    if (!activeTrigger) {
      return {
        success: false,
        message: 'No active trigger found to renew',
        error: 'Trigger not found',
      };
    }

    try {
      const newExpiration = new Date(Date.now() + 4200 * 60 * 1000).toISOString();

      await axios.patch(
        `${this.baseUrl}/subscriptions/${activeTrigger.config.subscriptionId}`,
        {
          expirationDateTime: newExpiration,
        },
        {
          headers: {
            Authorization: `Bearer ${activeTrigger.credentials.accessToken}`,
            'Content-Type': 'application/json',
          },
        },
      );

      activeTrigger.config.expirationDateTime = newExpiration;

      this.logger.log(`Teams subscription ${activeTrigger.config.subscriptionId} renewed`);

      return {
        success: true,
        message: 'Subscription renewed successfully',
        data: {
          subscriptionId: activeTrigger.config.subscriptionId,
          newExpiration,
        },
      };
    } catch (error) {
      this.logger.error(`Failed to renew subscription for workflow ${workflowId}:`, error);
      return {
        success: false,
        message: 'Failed to renew subscription',
        error: error.message,
      };
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

  private getSubscriptionConfig(
    triggerId: string,
    triggerConfig: TeamsTriggerConfig,
  ): { resource: string; changeType: string } {
    const teamId = triggerConfig.teamId || triggerConfig.actionParams?.teamId;
    const channelId = triggerConfig.channelId || triggerConfig.actionParams?.channelId;
    const chatId = triggerConfig.chatId || triggerConfig.actionParams?.chatId;

    const configMap: Record<string, { resource: string; changeType: string }> = {
      'new_channel': {
        resource: teamId ? `/teams/${teamId}/channels` : '/teams/getAllChannels',
        changeType: 'created',
      },
      'new_channel_message': {
        resource: teamId && channelId
          ? `/teams/${teamId}/channels/${channelId}/messages`
          : '/teams/getAllMessages',
        changeType: 'created',
      },
      'new_chat_message': {
        resource: chatId ? `/chats/${chatId}/messages` : '/chats/getAllMessages',
        changeType: 'created',
      },
      'new_team_member': {
        resource: teamId ? `/teams/${teamId}/members` : '/teams/getAllMembers',
        changeType: 'created',
      },
    };

    return configMap[triggerId] || {
      resource: '/teams/getAllMessages',
      changeType: 'created',
    };
  }
}
