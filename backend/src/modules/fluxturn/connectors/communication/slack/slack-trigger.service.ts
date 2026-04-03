import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as crypto from 'crypto';
import {
  ITriggerService,
  TriggerActivationResult,
  TriggerDeactivationResult,
  TriggerStatus,
  TriggerType,
} from '../../../workflow/interfaces/trigger.interface';
import { PlatformService } from '../../../../database/platform.service';

interface SlackTriggerConfig {
  triggerId?: string;
  channelId?: string;
  watchWholeWorkspace?: boolean;
  resolveIds?: boolean;
  ignoreUserList?: string;
  signingSecret?: string;
  actionParams?: {
    triggerId?: string;
    channelId?: string;
    watchWholeWorkspace?: boolean;
    resolveIds?: boolean;
    ignoreUserList?: string;
    signingSecret?: string;
  };
  connectorConfigId?: string;
  credentialId?: string;
}

interface ActiveTrigger {
  triggerId: string;
  webhookUrl: string;
  channelId?: string;
  watchWholeWorkspace: boolean;
  activatedAt: Date;
  config: SlackTriggerConfig;
}

/**
 * Slack Trigger Service
 *
 * Manages Slack webhook registration and lifecycle.
 * Slack webhooks require manual configuration in the Slack App dashboard
 * (Event Subscriptions), so this service primarily tracks active triggers
 * and provides webhook URLs.
 *
 * Key Features:
 * - Webhook URL generation for Slack events
 * - Trigger lifecycle management
 * - Support for various Slack events (messages, mentions, reactions, etc.)
 * - Active workflow restoration on service restart
 */
@Injectable()
export class SlackTriggerService implements ITriggerService, OnModuleInit {
  private readonly logger = new Logger(SlackTriggerService.name);
  private readonly activeTriggers = new Map<string, ActiveTrigger>();

  constructor(
    private readonly configService: ConfigService,
    private readonly platformService: PlatformService
  ) {}

  /**
   * Restore active workflows on module initialization
   */
  async onModuleInit() {
    this.logger.log('Initializing Slack Trigger Service...');
    try {
      await this.restoreActiveWorkflows();
    } catch (error) {
      this.logger.error('Failed to restore active workflows:', error);
    }
  }

  /**
   * Restore active Slack workflows from database
   */
  private async restoreActiveWorkflows() {
    try {
      const query = `
        SELECT id, canvas, status
        FROM workflows
        WHERE status = 'active'
        AND canvas IS NOT NULL
      `;

      const result = await this.platformService.query(query);
      let restoredCount = 0;

      for (const row of result.rows) {
        try {
          const canvas = row.canvas;
          const nodes = canvas?.nodes || [];

          // Find Slack trigger nodes
          const slackTriggerNodes = nodes.filter(
            (node: any) => node.type === 'CONNECTOR_TRIGGER' &&
                          node.data?.connectorType === 'slack'
          );

          if (slackTriggerNodes.length === 0) {
            continue;
          }

          const workflowId = row.id;
          const triggerNode = slackTriggerNodes[0];
          const triggerConfig: SlackTriggerConfig = {
            ...triggerNode.data,
            ...triggerNode.data?.actionParams,
            triggerId: triggerNode.data?.triggerId,
            credentialId: triggerNode.data?.credentialId || triggerNode.data?.connectorConfigId
          };

          this.logger.debug(`Restoring Slack trigger for workflow ${workflowId}`);

          const activationResult = await this.activate(workflowId, triggerConfig);

          if (activationResult.success) {
            restoredCount++;
            this.logger.log(`Restored Slack trigger for workflow ${workflowId}`);
          } else {
            this.logger.warn(`Failed to restore workflow ${workflowId}: ${activationResult.message}`);
          }
        } catch (error) {
          this.logger.error(`Error restoring workflow ${row.id}:`, error.message);
        }
      }

      if (restoredCount > 0) {
        this.logger.log(`Successfully restored ${restoredCount} Slack workflow(s)`);
      } else {
        this.logger.log('No active Slack workflows to restore');
      }
    } catch (error) {
      this.logger.error('Failed to restore active workflows:', error);
      throw error;
    }
  }

  /**
   * Activate Slack webhook for a workflow
   */
  async activate(workflowId: string, triggerConfig: SlackTriggerConfig): Promise<TriggerActivationResult> {
    try {
      this.logger.log(`Activating Slack trigger for workflow ${workflowId}`);
      this.logger.debug(`Trigger config: ${JSON.stringify(triggerConfig)}`);

      // Extract trigger ID
      const triggerId = triggerConfig.triggerId ||
                       triggerConfig.actionParams?.triggerId ||
                       'message';

      // Validate trigger ID
      const validTriggerIds = [
        'message',
        'app_mention',
        'reaction_added',
        'channel_created',
        'team_join',
        'file_shared',
        'file_public'
      ];

      if (!validTriggerIds.includes(triggerId)) {
        return {
          success: false,
          message: `Invalid trigger ID: ${triggerId}`,
          error: `Supported triggers: ${validTriggerIds.join(', ')}`,
        };
      }

      // Extract configuration
      const channelId = triggerConfig.channelId || triggerConfig.actionParams?.channelId;
      const watchWholeWorkspace = triggerConfig.watchWholeWorkspace ??
                                  triggerConfig.actionParams?.watchWholeWorkspace ??
                                  true;

      // Generate webhook URL
      const webhookUrl = this.generateWebhookUrl(workflowId);

      // Store trigger state
      this.activeTriggers.set(workflowId, {
        triggerId,
        webhookUrl,
        channelId,
        watchWholeWorkspace,
        activatedAt: new Date(),
        config: triggerConfig,
      });

      this.logger.log(`Slack trigger activated successfully for workflow ${workflowId}`);

      return {
        success: true,
        message: 'Slack webhook URL generated successfully',
        data: {
          webhookUrl,
          triggerId,
          triggerName: this.getTriggerName(triggerId),
          channelId,
          watchWholeWorkspace,
          setupInstructions: this.getSetupInstructions(workflowId, webhookUrl, triggerId),
        },
      };

    } catch (error: any) {
      this.logger.error(`Failed to activate Slack trigger for workflow ${workflowId}:`, error);
      return {
        success: false,
        message: 'Failed to activate Slack trigger',
        error: error.message || 'Unknown error occurred',
      };
    }
  }

  /**
   * Deactivate Slack webhook for a workflow
   */
  async deactivate(workflowId: string): Promise<TriggerDeactivationResult> {
    try {
      this.logger.log(`Deactivating Slack trigger for workflow ${workflowId}`);

      const trigger = this.activeTriggers.get(workflowId);

      if (!trigger) {
        this.logger.warn(`No active Slack trigger found for workflow ${workflowId}`);
        return {
          success: true,
          message: 'No active Slack trigger found',
        };
      }

      // Remove from active triggers
      this.activeTriggers.delete(workflowId);

      this.logger.log(`Slack trigger deactivated successfully for workflow ${workflowId}`);

      return {
        success: true,
        message: 'Slack trigger deactivated successfully. Note: The webhook URL in your Slack App Event Subscriptions will no longer trigger workflows.',
      };

    } catch (error: any) {
      this.logger.error(`Failed to deactivate Slack trigger for workflow ${workflowId}:`, error);

      // Still remove from local state
      this.activeTriggers.delete(workflowId);

      return {
        success: false,
        message: 'Failed to deactivate Slack trigger (removed locally)',
      };
    }
  }

  /**
   * Get status of Slack trigger for a workflow
   */
  async getStatus(workflowId: string): Promise<TriggerStatus> {
    const trigger = this.activeTriggers.get(workflowId);

    if (!trigger) {
      return {
        active: false,
        type: TriggerType.SLACK,
        message: 'Slack trigger not active',
      };
    }

    return {
      active: true,
      type: TriggerType.SLACK,
      message: 'Slack trigger active',
      metadata: {
        webhookUrl: trigger.webhookUrl,
        triggerId: trigger.triggerId,
        triggerName: this.getTriggerName(trigger.triggerId),
        channelId: trigger.channelId,
        watchWholeWorkspace: trigger.watchWholeWorkspace,
        activatedAt: trigger.activatedAt,
      },
    };
  }

  /**
   * Get trigger type identifier
   */
  getTriggerType(): TriggerType {
    return TriggerType.SLACK;
  }

  /**
   * Generate webhook URL for workflow
   */
  private generateWebhookUrl(workflowId: string): string {
    const baseUrl = this.configService.get<string>('APP_URL') || 'http://localhost:3000';
    const cleanBaseUrl = baseUrl.replace(/\/$/, '');
    return `${cleanBaseUrl}/api/v1/webhooks/slack/${workflowId}`;
  }

  /**
   * Get human-readable trigger name
   */
  private getTriggerName(triggerId: string): string {
    const triggerNames: Record<string, string> = {
      'message': 'New Message Posted to Channel',
      'app_mention': 'Bot / App Mention',
      'reaction_added': 'Reaction Added',
      'channel_created': 'New Public Channel Created',
      'team_join': 'New User',
      'file_shared': 'File Shared',
      'file_public': 'File Made Public',
    };
    return triggerNames[triggerId] || triggerId;
  }

  /**
   * Get required Slack event subscription for a trigger
   */
  private getRequiredSlackEvent(triggerId: string): string {
    const eventMapping: Record<string, string> = {
      'message': 'message.channels, message.groups, message.im, message.mpim',
      'app_mention': 'app_mention',
      'reaction_added': 'reaction_added',
      'channel_created': 'channel_created',
      'team_join': 'team_join',
      'file_shared': 'file_shared',
      'file_public': 'file_public',
    };
    return eventMapping[triggerId] || triggerId;
  }

  /**
   * Get setup instructions for user
   */
  private getSetupInstructions(workflowId: string, webhookUrl: string, triggerId: string): any {
    const requiredEvent = this.getRequiredSlackEvent(triggerId);

    return {
      webhookUrl,
      triggerId,
      triggerName: this.getTriggerName(triggerId),
      requiredSlackEvents: requiredEvent,
      message: 'Configure your Slack App Event Subscriptions to receive events',
      steps: [
        '1. Go to https://api.slack.com/apps and select your app',
        '2. Navigate to "Event Subscriptions" in the left sidebar',
        '3. Toggle "Enable Events" to ON',
        `4. Enter this Request URL: ${webhookUrl}`,
        '5. Wait for Slack to verify the URL (should show "Verified")',
        '6. Under "Subscribe to bot events", click "Add Bot User Event"',
        `7. Add the required event(s): ${requiredEvent}`,
        '8. Click "Save Changes" at the bottom',
        '9. If prompted, reinstall the app to your workspace',
        '10. Make sure the bot is added to the channels you want to monitor',
      ],
      requiredScopes: this.getRequiredScopes(triggerId),
      troubleshooting: [
        'Ensure APP_URL is using HTTPS (Slack requires secure connections)',
        'Verify the bot has been added to the channels you want to monitor',
        'Check that all required OAuth scopes are granted',
        'For message events, ensure "message.channels" scope is subscribed',
        'Test by sending a message in a channel where the bot is present',
      ],
    };
  }

  /**
   * Get required OAuth scopes for a trigger
   */
  private getRequiredScopes(triggerId: string): string[] {
    const baseScopes = ['app_mentions:read'];

    const scopeMapping: Record<string, string[]> = {
      'message': ['channels:history', 'groups:history', 'im:history', 'mpim:history'],
      'app_mention': ['app_mentions:read'],
      'reaction_added': ['reactions:read'],
      'channel_created': ['channels:read'],
      'team_join': ['users:read'],
      'file_shared': ['files:read'],
      'file_public': ['files:read'],
    };

    const combinedScopes = [...baseScopes, ...(scopeMapping[triggerId] || [])];
    return Array.from(new Set(combinedScopes));
  }

  /**
   * Get active trigger info for webhook controller
   */
  getActiveTrigger(workflowId: string): ActiveTrigger | undefined {
    return this.activeTriggers.get(workflowId);
  }

  /**
   * Check if a workflow has an active trigger
   */
  isActive(workflowId: string): boolean {
    return this.activeTriggers.has(workflowId);
  }

  /**
   * Get all active triggers (for debugging/monitoring)
   */
  getAllActiveTriggers(): Map<string, ActiveTrigger> {
    return new Map(this.activeTriggers);
  }

  /**
   * Get count of active triggers
   */
  getActiveTriggersCount(): number {
    return this.activeTriggers.size;
  }

  /**
   * Verify Slack webhook signature
   */
  verifySlackSignature(
    signature: string,
    timestamp: string,
    body: string | Buffer,
    signingSecret: string
  ): boolean {
    try {
      // Check timestamp to prevent replay attacks (5 minutes tolerance)
      const requestTimestamp = parseInt(timestamp, 10);
      const currentTimestamp = Math.floor(Date.now() / 1000);
      if (Math.abs(currentTimestamp - requestTimestamp) > 60 * 5) {
        this.logger.warn('Slack webhook timestamp is too old');
        return false;
      }

      // Compute expected signature
      const sigBasestring = `v0:${timestamp}:${body}`;
      const expectedSignature = 'v0=' + crypto
        .createHmac('sha256', signingSecret)
        .update(sigBasestring)
        .digest('hex');

      // Timing-safe comparison
      const signatureBuffer = Buffer.from(signature);
      const expectedBuffer = Buffer.from(expectedSignature);

      if (signatureBuffer.length !== expectedBuffer.length) {
        return false;
      }

      return crypto.timingSafeEqual(signatureBuffer, expectedBuffer);
    } catch (error) {
      this.logger.error('Error verifying Slack signature:', error);
      return false;
    }
  }

  /**
   * Decrypt credential config (for fetching signing secret from stored credentials)
   */
  private decryptCredentialConfig(encryptedConfig: any): any {
    try {
      const encrypted = encryptedConfig.data || encryptedConfig.encrypted;
      const iv = encryptedConfig.iv;
      const authTag = encryptedConfig.authTag;

      if (!encrypted || !iv || !authTag) {
        throw new Error('Invalid encrypted credential format');
      }

      const secretKey = this.configService.get<string>('CONNECTOR_ENCRYPTION_KEY');

      if (!secretKey) {
        throw new Error('CONNECTOR_ENCRYPTION_KEY not set in environment');
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
      throw new Error(`Failed to decrypt credential: ${error.message}`);
    }
  }

  /**
   * Get signing secret from credentials
   */
  async getSigningSecretFromCredentials(credentialId: string): Promise<string | null> {
    try {
      const query = `
        SELECT credentials FROM connector_configs
        WHERE id = $1
      `;
      const result = await this.platformService.query(query, [credentialId]);

      if (result.rows.length === 0) {
        return null;
      }

      const credentials = result.rows[0].credentials;

      // Check if credentials are encrypted
      if (credentials && credentials.iv && (credentials.data || credentials.encrypted) && credentials.authTag) {
        const decrypted = this.decryptCredentialConfig(credentials);
        return decrypted.signingSecret || decrypted.signing_secret || null;
      }

      return credentials?.signingSecret || credentials?.signing_secret || null;
    } catch (error) {
      this.logger.error(`Failed to get signing secret from credential ${credentialId}:`, error);
      return null;
    }
  }
}
