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

interface DiscordTriggerConfig {
  botToken?: string;
  guildId?: string;
  channelId?: string;
  events?: string[];
  webhookToken?: string;
  actionParams?: {
    botToken?: string;
    guildId?: string;
    channelId?: string;
    events?: string[];
    webhookToken?: string;
  };
  connectorConfigId?: string;
  credentialId?: string;
}

interface ActiveTrigger {
  botToken: string;
  webhookUrl: string;
  secretToken: string;
  guildId?: string;
  channelId?: string;
  events: string[];
  activatedAt: Date;
}

/**
 * Discord Trigger Service
 *
 * Manages Discord webhook registration and lifecycle for workflow triggers.
 * Discord uses Gateway events for real-time updates, but we'll use webhooks
 * for workflow integration.
 *
 * Key Features:
 * - Webhook URL generation and management
 * - Secret token generation for webhook validation
 * - Support for multiple event types (MESSAGE_CREATE, GUILD_MEMBER_ADD, etc.)
 * - Workflow restoration on service restart
 */
@Injectable()
export class DiscordTriggerService implements ITriggerService, OnModuleInit {
  private readonly logger = new Logger(DiscordTriggerService.name);
  private readonly activeTriggers = new Map<string, ActiveTrigger>();

  constructor(
    private readonly configService: ConfigService,
    private readonly platformService: PlatformService
  ) {}

  /**
   * Restore active workflows on module initialization
   */
  async onModuleInit() {
    this.logger.log('Initializing Discord Trigger Service...');
    try {
      await this.restoreActiveWorkflows();
    } catch (error) {
      this.logger.error('Failed to restore active workflows:', error);
    }
  }

  /**
   * Restore active Discord workflows from database
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

          // Find Discord trigger nodes
          const discordTriggerNodes = nodes.filter(
            (node: any) => node.type === 'CONNECTOR_TRIGGER' &&
                          node.data?.connectorType === 'discord'
          );

          if (discordTriggerNodes.length === 0) {
            continue;
          }

          const workflowId = row.id;
          const triggerNode = discordTriggerNodes[0];
          const triggerConfig = {
            ...triggerNode.data,
            ...triggerNode.data?.actionParams,
            credentialId: triggerNode.data?.credentialId || triggerNode.data?.connectorConfigId
          };

          this.logger.debug(`Restoring Discord trigger for workflow ${workflowId}`);

          const activationResult = await this.activate(workflowId, triggerConfig);

          if (activationResult.success) {
            restoredCount++;
            this.logger.log(`✅ Restored Discord trigger for workflow ${workflowId}`);
          } else {
            this.logger.warn(`❌ Failed to restore workflow ${workflowId}: ${activationResult.message}`);
          }
        } catch (error) {
          this.logger.error(`Error restoring workflow ${row.id}:`, error.message);
        }
      }

      if (restoredCount > 0) {
        this.logger.log(`Successfully restored ${restoredCount} Discord workflow(s)`);
      } else {
        this.logger.log('No active Discord workflows to restore');
      }
    } catch (error) {
      this.logger.error('Failed to restore active workflows:', error);
      throw error;
    }
  }

  /**
   * Activate Discord webhook for a workflow
   */
  async activate(workflowId: string, triggerConfig: DiscordTriggerConfig): Promise<TriggerActivationResult> {
    try {
      this.logger.log(`Activating Discord trigger for workflow ${workflowId}`);
      this.logger.debug(`Trigger config: ${JSON.stringify(triggerConfig)}`);

      // Extract bot token from config
      let botToken =
        triggerConfig.botToken ||
        triggerConfig.actionParams?.botToken;

      // If no direct bot token, check for credential ID
      const credentialId = triggerConfig.credentialId || triggerConfig.connectorConfigId;

      if (!botToken && credentialId) {
        this.logger.log(`Fetching bot token from credential: ${credentialId}`);
        try {
          const credentialQuery = `
            SELECT credentials FROM connector_configs
            WHERE id = $1
          `;
          const result = await this.platformService.query(credentialQuery, [credentialId]);

          if (result.rows.length > 0) {
            const credentials = result.rows[0].credentials;

            // Check if credentials are encrypted
            if (credentials && credentials.iv && (credentials.data || credentials.encrypted) && credentials.authTag) {
              this.logger.log('Credentials are encrypted, decrypting...');
              try {
                const decryptedCredentials = this.decryptCredentialConfig(credentials);
                botToken = decryptedCredentials.botToken || decryptedCredentials.bot_token || decryptedCredentials.token;
              } catch (decryptError) {
                this.logger.error('Failed to decrypt credentials:', decryptError);
                return {
                  success: false,
                  message: 'Failed to decrypt credentials',
                  error: decryptError.message,
                };
              }
            } else {
              botToken = credentials?.botToken || credentials?.bot_token || credentials?.token;
            }
          } else {
            this.logger.warn(`Credential ${credentialId} not found in database`);
          }
        } catch (error) {
          this.logger.error(`Failed to fetch credential ${credentialId}:`, error);
          return {
            success: false,
            message: 'Failed to fetch bot token from credential',
            error: error.message,
          };
        }
      }

      if (!botToken) {
        this.logger.error(`No bot token found. credentialId: ${credentialId}`);
        return {
          success: false,
          message: 'Bot token is required for Discord trigger',
          error: 'Missing bot token in trigger configuration. Please select a credential or enter bot token directly.',
        };
      }

      // Generate webhook URL
      const webhookUrl = this.generateWebhookUrl(workflowId);

      // Generate secret token for webhook validation
      const secretToken = this.generateSecretToken(workflowId);

      // Get configured events
      const events = triggerConfig.events || triggerConfig.actionParams?.events || ['MESSAGE_CREATE'];

      // Store trigger state
      this.activeTriggers.set(workflowId, {
        botToken,
        webhookUrl,
        secretToken,
        guildId: triggerConfig.guildId || triggerConfig.actionParams?.guildId,
        channelId: triggerConfig.channelId || triggerConfig.actionParams?.channelId,
        events,
        activatedAt: new Date(),
      });

      this.logger.log(`✅ Discord trigger activated successfully for workflow ${workflowId}`);

      return {
        success: true,
        message: 'Discord webhook configured successfully',
        data: {
          webhookUrl,
          secretToken,
          events,
          setupInstructions: this.getSetupInstructions(workflowId, webhookUrl),
        },
      };

    } catch (error: any) {
      this.logger.error(`Failed to activate Discord trigger for workflow ${workflowId}:`, error);
      return {
        success: false,
        message: 'Failed to activate Discord trigger',
        error: error.message || 'Unknown error occurred',
      };
    }
  }

  /**
   * Deactivate Discord webhook for a workflow
   */
  async deactivate(workflowId: string): Promise<TriggerDeactivationResult> {
    try {
      this.logger.log(`Deactivating Discord trigger for workflow ${workflowId}`);

      const trigger = this.activeTriggers.get(workflowId);

      if (!trigger) {
        this.logger.warn(`No active Discord trigger found for workflow ${workflowId}`);
        return {
          success: true,
          message: 'No active Discord trigger found',
        };
      }

      // Remove from active triggers
      this.activeTriggers.delete(workflowId);

      this.logger.log(`✅ Discord trigger deactivated successfully for workflow ${workflowId}`);

      return {
        success: true,
        message: 'Discord webhook deactivated successfully',
      };

    } catch (error: any) {
      this.logger.error(`Failed to deactivate Discord trigger for workflow ${workflowId}:`, error);

      // Still remove from active triggers even if something fails
      this.activeTriggers.delete(workflowId);

      return {
        success: false,
        message: 'Failed to deactivate Discord trigger (removed locally)',
      };
    }
  }

  /**
   * Get status of Discord trigger for a workflow
   */
  async getStatus(workflowId: string): Promise<TriggerStatus> {
    const trigger = this.activeTriggers.get(workflowId);

    if (!trigger) {
      return {
        active: false,
        type: TriggerType.DISCORD,
        message: 'Discord trigger not active',
      };
    }

    return {
      active: true,
      type: TriggerType.DISCORD,
      message: 'Discord trigger active',
      metadata: {
        webhookUrl: trigger.webhookUrl,
        events: trigger.events,
        guildId: trigger.guildId,
        channelId: trigger.channelId,
        activatedAt: trigger.activatedAt,
      },
    };
  }

  /**
   * Get trigger type identifier
   */
  getTriggerType(): TriggerType {
    return TriggerType.DISCORD;
  }

  /**
   * Generate webhook URL for workflow
   */
  private generateWebhookUrl(workflowId: string): string {
    const baseUrl = this.configService.get<string>('APP_URL') || 'http://localhost:3000';
    const cleanBaseUrl = baseUrl.replace(/\/$/, '');
    return `${cleanBaseUrl}/api/v1/webhooks/discord/${workflowId}`;
  }

  /**
   * Generate secret token for webhook validation
   */
  private generateSecretToken(workflowId: string): string {
    const base = `fluxturn_discord_${workflowId}_${Date.now()}`;
    const token = base.replace(/[^a-zA-Z0-9_-]+/g, '');
    return token.substring(0, 256);
  }

  /**
   * Get setup instructions for user
   */
  private getSetupInstructions(workflowId: string, webhookUrl: string): any {
    return {
      webhookUrl,
      message: '✅ Your Discord webhook URL has been generated!',
      steps: [
        '1. Go to Discord Developer Portal (https://discord.com/developers/applications)',
        '2. Select your application',
        '3. Navigate to "Bot" settings',
        '4. Enable "MESSAGE CONTENT INTENT" if you need message content',
        '5. Under "OAuth2" > "URL Generator", select "bot" scope and required permissions',
        '6. Add the bot to your server using the generated URL',
        '7. For webhooks, configure your bot to forward events to: ' + webhookUrl,
      ],
      notes: [
        'Discord bots typically use Gateway events, not HTTP webhooks',
        'You may need a Discord bot framework (like discord.js) to forward events to this webhook',
        'Alternatively, use Discord\'s Interaction Endpoint URL for slash commands',
      ],
    };
  }

  /**
   * Validate webhook secret token (timing-safe comparison)
   */
  validateSecretToken(workflowId: string, providedToken: string | undefined): boolean {
    const trigger = this.activeTriggers.get(workflowId);

    if (!trigger) {
      this.logger.warn(`No active trigger found for workflow ${workflowId}`);
      return false;
    }

    if (!providedToken) {
      this.logger.warn(`No secret token provided for workflow ${workflowId}`);
      return false;
    }

    // Timing-safe comparison
    const expectedBuffer = Buffer.from(trigger.secretToken);
    const providedBuffer = Buffer.from(providedToken);

    if (expectedBuffer.byteLength !== providedBuffer.byteLength) {
      return false;
    }

    return crypto.timingSafeEqual(expectedBuffer, providedBuffer);
  }

  /**
   * Get active trigger info for webhook controller
   */
  getActiveTrigger(workflowId: string): ActiveTrigger | undefined {
    return this.activeTriggers.get(workflowId);
  }

  /**
   * Decrypt credential config
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
}
