// Redis Trigger Service
// Handles Redis pub/sub channel subscriptions for workflow triggers

import { Injectable, Logger, Inject, forwardRef } from '@nestjs/common';
import { PlatformService } from '../../../../database/platform.service';
import { WorkflowService } from '../../../workflow/workflow.service';
import {
  ITriggerService,
  TriggerType,
  TriggerActivationResult,
  TriggerDeactivationResult,
  TriggerStatus,
} from '../../../workflow/interfaces/trigger.interface';
import Redis from 'ioredis';

interface RedisSubscription {
  client: Redis;
  channels: string[];
  workflowId: string;
}

@Injectable()
export class RedisTriggerService implements ITriggerService {
  private readonly logger = new Logger(RedisTriggerService.name);
  private subscriptions: Map<string, RedisSubscription> = new Map();

  constructor(
    private readonly platformService: PlatformService,
    @Inject(forwardRef(() => WorkflowService))
    private readonly workflowService: WorkflowService,
  ) {}

  getTriggerType(): TriggerType {
    return TriggerType.REDIS;
  }

  async activate(workflowId: string, triggerConfig: any): Promise<TriggerActivationResult> {
    try {
      this.logger.log(`Activating Redis trigger for workflow: ${workflowId}`);

      const credentialId = triggerConfig.credentialId || triggerConfig.connectorConfigId;
      if (!credentialId) {
        return {
          success: false,
          message: 'Redis credential not selected',
          error: 'Missing credentialId',
        };
      }

      // Get credentials from database
      const credentials = await this.getCredentials(credentialId);
      if (!credentials) {
        return {
          success: false,
          message: 'Redis credentials not found',
          error: 'Invalid credentialId',
        };
      }

      // Parse channels from config
      const channelsConfig = triggerConfig.channels || triggerConfig.inputData?.channels || '';
      const channels = channelsConfig
        .split(',')
        .map((c: string) => c.trim())
        .filter((c: string) => c.length > 0);

      if (channels.length === 0) {
        return {
          success: false,
          message: 'No channels specified',
          error: 'Missing channels configuration',
        };
      }

      // Check if already subscribed
      if (this.subscriptions.has(workflowId)) {
        await this.deactivate(workflowId);
      }

      // Create Redis subscriber client
      const subscriberClient = new Redis({
        host: credentials.host,
        port: credentials.port,
        password: credentials.password || undefined,
        username: credentials.username || undefined,
        db: credentials.database || 0,
        tls: credentials.ssl ? {} : undefined,
        retryStrategy: (times) => {
          if (times > 3) return null;
          return Math.min(times * 100, 3000);
        },
      });

      // Get trigger options
      const jsonParseBody = triggerConfig.jsonParseBody || triggerConfig.inputData?.jsonParseBody || false;
      const onlyMessage = triggerConfig.onlyMessage || triggerConfig.inputData?.onlyMessage || false;

      // Set up message handler
      subscriberClient.on('pmessage', async (pattern, channel, message) => {
        await this.handleMessage(workflowId, channel, message, jsonParseBody, onlyMessage);
      });

      subscriberClient.on('message', async (channel, message) => {
        await this.handleMessage(workflowId, channel, message, jsonParseBody, onlyMessage);
      });

      // Subscribe to channels (use psubscribe for pattern matching)
      const hasWildcard = channels.some((c: string) => c.includes('*'));
      if (hasWildcard) {
        await subscriberClient.psubscribe(...channels);
        this.logger.log(`Subscribed to Redis patterns: ${channels.join(', ')}`);
      } else {
        await subscriberClient.subscribe(...channels);
        this.logger.log(`Subscribed to Redis channels: ${channels.join(', ')}`);
      }

      // Store subscription
      this.subscriptions.set(workflowId, {
        client: subscriberClient,
        channels,
        workflowId,
      });

      return {
        success: true,
        message: `Successfully subscribed to Redis channels: ${channels.join(', ')}`,
        data: {
          channels,
          subscriptionId: workflowId,
        },
      };
    } catch (error: any) {
      this.logger.error(`Failed to activate Redis trigger: ${error.message}`);
      return {
        success: false,
        message: 'Failed to activate Redis trigger',
        error: error.message,
      };
    }
  }

  async deactivate(workflowId: string): Promise<TriggerDeactivationResult> {
    try {
      this.logger.log(`Deactivating Redis trigger for workflow: ${workflowId}`);

      const subscription = this.subscriptions.get(workflowId);
      if (!subscription) {
        return {
          success: true,
          message: 'No active subscription found',
        };
      }

      // Unsubscribe and disconnect
      try {
        await subscription.client.unsubscribe();
        await subscription.client.punsubscribe();
        await subscription.client.quit();
      } catch (error) {
        // Force disconnect if quit fails
        try {
          subscription.client.disconnect();
        } catch {
          // Ignore
        }
      }

      // Remove from map
      this.subscriptions.delete(workflowId);

      return {
        success: true,
        message: 'Redis trigger deactivated successfully',
      };
    } catch (error: any) {
      this.logger.error(`Failed to deactivate Redis trigger: ${error.message}`);
      return {
        success: false,
        message: error.message,
      };
    }
  }

  async getStatus(workflowId: string): Promise<TriggerStatus> {
    const subscription = this.subscriptions.get(workflowId);

    return {
      active: !!subscription,
      type: TriggerType.REDIS,
      message: subscription
        ? `Subscribed to channels: ${subscription.channels.join(', ')}`
        : 'Not subscribed',
      metadata: subscription
        ? {
            channels: subscription.channels,
            connectedAt: new Date().toISOString(),
          }
        : undefined,
    };
  }

  private async handleMessage(
    workflowId: string,
    channel: string,
    message: string,
    jsonParseBody: boolean,
    onlyMessage: boolean,
  ): Promise<void> {
    try {
      this.logger.log(`Received message on channel ${channel} for workflow ${workflowId}`);

      // Parse message if configured
      let parsedMessage: any = message;
      if (jsonParseBody) {
        try {
          parsedMessage = JSON.parse(message);
        } catch {
          // Keep as string if not valid JSON
        }
      }

      // Prepare event data
      const eventData = onlyMessage
        ? { message: parsedMessage }
        : { channel, message: parsedMessage };

      const triggerData = {
        redisEvent: eventData,
        triggeredAt: new Date().toISOString(),
        trigger: 'redis_channel_message',
        eventType: 'redis.message',
      };

      // Execute workflow
      try {
        await this.workflowService.executeWorkflow({
          workflow_id: workflowId,
          input_data: triggerData,
        });
        this.logger.log(`Workflow ${workflowId} executed for Redis message`);
      } catch (error: any) {
        this.logger.error(`Failed to execute workflow ${workflowId}: ${error.message}`);
      }
    } catch (error: any) {
      this.logger.error(`Error handling Redis message: ${error.message}`);
    }
  }

  private async getCredentials(credentialId: string): Promise<any> {
    try {
      const query = `
        SELECT config, credentials
        FROM connector_configs
        WHERE id = $1 AND is_active = true
      `;
      const result = await this.platformService.query(query, [credentialId]);

      if (result.rows.length === 0) {
        return null;
      }

      const row = result.rows[0];
      return {
        ...row.config,
        ...row.credentials,
      };
    } catch (error: any) {
      this.logger.error(`Failed to get credentials: ${error.message}`);
      return null;
    }
  }
}
