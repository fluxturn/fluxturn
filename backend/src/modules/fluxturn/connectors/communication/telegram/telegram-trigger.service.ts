import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
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

interface TelegramTriggerConfig {
  botToken?: string;
  updates?: string[];
  webhookToken?: string;
  actionParams?: {
    botToken?: string;
    updates?: string[];
    webhookToken?: string;
  };
  connectorConfigId?: string;
  credentialId?: string;
}

interface ActiveTrigger {
  botToken: string;
  webhookUrl: string;
  secretToken: string;
  updates: string[];
  activatedAt: Date;
  webhookInfo?: any;
}

/**
 * Telegram Trigger Service
 *
 * Manages Telegram bot webhook registration and lifecycle.
 * Integrates with Telegram Bot API to automatically set up webhooks
 * for receiving messages, commands, callback queries, and other updates.
 *
 * Key Features:
 * - Automatic webhook registration with Telegram API
 * - HTTPS URL requirement handling
 * - Secret token generation and validation
 * - Webhook lifecycle management (check, create, delete)
 * - Support for multiple update types
 */
@Injectable()
export class TelegramTriggerService implements ITriggerService, OnModuleInit {
  private readonly logger = new Logger(TelegramTriggerService.name);
  private readonly activeTriggers = new Map<string, ActiveTrigger>();

  constructor(
    private readonly configService: ConfigService,
    private readonly platformService: PlatformService
  ) {}

  /**
   * Restore active workflows on module initialization
   */
  async onModuleInit() {
    this.logger.log('Initializing Telegram Trigger Service...');
    try {
      await this.restoreActiveWorkflows();
    } catch (error) {
      this.logger.error('Failed to restore active workflows:', error);
    }
  }

  /**
   * Restore active Telegram workflows from database
   */
  private async restoreActiveWorkflows() {
    try {
      // Query for all active workflows with Telegram triggers
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

          // Find Telegram trigger nodes
          const telegramTriggerNodes = nodes.filter(
            (node: any) => node.type === 'CONNECTOR_TRIGGER' &&
                          node.data?.connectorType === 'telegram'
          );

          if (telegramTriggerNodes.length === 0) {
            continue; // No Telegram triggers in this workflow
          }

          const workflowId = row.id;
          const triggerNode = telegramTriggerNodes[0]; // Use first Telegram trigger
          const triggerConfig = {
            ...triggerNode.data,
            ...triggerNode.data?.actionParams,
            credentialId: triggerNode.data?.credentialId || triggerNode.data?.connectorConfigId
          };

          this.logger.debug(`Restoring Telegram trigger for workflow ${workflowId}`);

          // Re-activate the trigger
          const result = await this.activate(workflowId, triggerConfig);

          if (result.success) {
            restoredCount++;
            this.logger.log(`✅ Restored Telegram trigger for workflow ${workflowId}`);
          } else {
            this.logger.warn(`❌ Failed to restore workflow ${workflowId}: ${result.message}`);
          }
        } catch (error) {
          this.logger.error(`Error restoring workflow ${row.id}:`, error.message);
        }
      }

      if (restoredCount > 0) {
        this.logger.log(`Successfully restored ${restoredCount} Telegram workflow(s)`);
      } else {
        this.logger.log('No active Telegram workflows to restore');
      }
    } catch (error) {
      this.logger.error('Failed to restore active workflows:', error);
      throw error;
    }
  }

  /**
   * Activate Telegram webhook for a workflow
   */
  async activate(workflowId: string, triggerConfig: TelegramTriggerConfig): Promise<TriggerActivationResult> {
    try {
      this.logger.log(`Activating Telegram trigger for workflow ${workflowId}`);
      this.logger.debug(`Trigger config: ${JSON.stringify(triggerConfig)}`);

      // Extract bot token from config - check multiple possible locations
      let botToken =
        triggerConfig.botToken ||
        triggerConfig.actionParams?.botToken;

      // If no direct bot token, check for credential ID
      const credentialId = triggerConfig.credentialId || triggerConfig.connectorConfigId;

      if (!botToken && credentialId) {
        this.logger.log(`Fetching bot token from credential: ${credentialId}`);
        try {
          // Fetch credential from database (botToken is in 'credentials' column, not 'config')
          const credentialQuery = `
            SELECT credentials FROM connector_configs
            WHERE id = $1
          `;
          const result = await this.platformService.query(credentialQuery, [credentialId]);

          if (result.rows.length > 0) {
            const credentials = result.rows[0].credentials;
            this.logger.debug(`Credential data (encrypted): ${JSON.stringify(credentials)}`);

            // Check if credentials are encrypted (has iv, data/encrypted, authTag)
            if (credentials && credentials.iv && (credentials.data || credentials.encrypted) && credentials.authTag) {
              this.logger.log('Credentials are encrypted, decrypting...');

              try {
                // Decrypt the credentials
                const decryptedCredentials = this.decryptCredentialConfig(credentials);
                this.logger.debug(`Decrypted credentials keys: ${Object.keys(decryptedCredentials).join(', ')}`);

                botToken = decryptedCredentials.botToken || decryptedCredentials.bot_token || decryptedCredentials.token;
                this.logger.log(`Bot token ${botToken ? 'found' : 'not found'} in decrypted credentials`);
              } catch (decryptError) {
                this.logger.error('Failed to decrypt credentials:', decryptError);
                return {
                  success: false,
                  message: 'Failed to decrypt credentials',
                  error: decryptError.message,
                };
              }
            } else {
              // Credentials are not encrypted (plain text)
              this.logger.debug(`Credentials keys (plain): ${credentials ? Object.keys(credentials).join(', ') : 'null'}`);
              botToken = credentials?.botToken || credentials?.bot_token || credentials?.token;
              this.logger.log(`Bot token ${botToken ? 'found' : 'not found'} in plain credentials`);
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
        this.logger.error(`No bot token found. credentialId: ${credentialId}, direct token: ${!!triggerConfig.botToken}`);
        return {
          success: false,
          message: 'Bot token is required for Telegram trigger',
          error: 'Missing bot token in trigger configuration. Please select a credential or enter bot token directly.',
        };
      }

      // Generate webhook URL - must be HTTPS for Telegram
      const webhookUrl = this.generateWebhookUrl(workflowId);

      // Validate HTTPS requirement
      if (!webhookUrl.startsWith('https://')) {
        return {
          success: false,
          message: 'Telegram requires HTTPS webhook URL',
          error: 'APP_URL must be HTTPS or use ngrok for local development',
          data: {
            currentUrl: webhookUrl,
            suggestion: 'Set APP_URL to an HTTPS URL or use ngrok: ngrok http 3000',
          },
        };
      }

      // Extract allowed updates
      const updates = triggerConfig.updates || triggerConfig.actionParams?.updates || [];
      const allowedUpdates = this.prepareAllowedUpdates(updates);

      // Generate secret token for webhook validation
      const secretToken = this.generateSecretToken(workflowId);

      // Check if webhook already exists
      const existingWebhook = await this.checkWebhookExists(botToken, webhookUrl);

      if (existingWebhook.exists && existingWebhook.url === webhookUrl) {
        this.logger.log(`Webhook already registered for workflow ${workflowId}`);

        // Store in active triggers
        this.activeTriggers.set(workflowId, {
          botToken,
          webhookUrl,
          secretToken,
          updates: allowedUpdates,
          activatedAt: new Date(),
          webhookInfo: existingWebhook.info,
        });

        return {
          success: true,
          message: 'Telegram webhook already registered',
          data: {
            webhookUrl,
            secretToken,
            allowedUpdates,
            webhookInfo: existingWebhook.info,
            alreadyRegistered: true,
          },
        };
      }

      // Set up webhook with Telegram API
      const webhookResult = await this.setWebhook(botToken, webhookUrl, allowedUpdates, secretToken);

      if (!webhookResult.success) {
        return {
          success: false,
          message: 'Failed to register webhook with Telegram',
          error: webhookResult.error,
        };
      }

      // Store trigger state
      this.activeTriggers.set(workflowId, {
        botToken,
        webhookUrl,
        secretToken,
        updates: allowedUpdates,
        activatedAt: new Date(),
        webhookInfo: webhookResult.info,
      });

      this.logger.log(`✅ Telegram trigger activated successfully for workflow ${workflowId}`);

      return {
        success: true,
        message: 'Telegram webhook registered successfully',
        data: {
          webhookUrl,
          secretToken,
          allowedUpdates,
          webhookInfo: webhookResult.info,
          setupInstructions: this.getSetupInstructions(workflowId, webhookUrl, botToken),
        },
      };

    } catch (error: any) {
      this.logger.error(`Failed to activate Telegram trigger for workflow ${workflowId}:`, error);
      return {
        success: false,
        message: 'Failed to activate Telegram trigger',
        error: error.message || 'Unknown error occurred',
      };
    }
  }

  /**
   * Deactivate Telegram webhook for a workflow
   */
  async deactivate(workflowId: string): Promise<TriggerDeactivationResult> {
    try {
      this.logger.log(`Deactivating Telegram trigger for workflow ${workflowId}`);

      const trigger = this.activeTriggers.get(workflowId);

      if (!trigger) {
        this.logger.warn(`No active Telegram trigger found for workflow ${workflowId}`);
        return {
          success: true,
          message: 'No active Telegram trigger found',
        };
      }

      // Delete webhook from Telegram
      await this.deleteWebhook(trigger.botToken);

      // Remove from active triggers
      this.activeTriggers.delete(workflowId);

      this.logger.log(`✅ Telegram trigger deactivated successfully for workflow ${workflowId}`);

      return {
        success: true,
        message: 'Telegram webhook deleted successfully',
      };

    } catch (error: any) {
      this.logger.error(`Failed to deactivate Telegram trigger for workflow ${workflowId}:`, error);

      // Still remove from active triggers even if API call fails
      this.activeTriggers.delete(workflowId);

      return {
        success: false,
        message: 'Failed to deactivate Telegram trigger (removed locally)',
      };
    }
  }

  /**
   * Get status of Telegram trigger for a workflow
   */
  async getStatus(workflowId: string): Promise<TriggerStatus> {
    const trigger = this.activeTriggers.get(workflowId);

    if (!trigger) {
      return {
        active: false,
        type: TriggerType.TELEGRAM,
        message: 'Telegram trigger not active',
      };
    }

    // Optionally verify with Telegram API
    try {
      const webhookInfo = await this.getWebhookInfo(trigger.botToken);

      return {
        active: true,
        type: TriggerType.TELEGRAM,
        message: 'Telegram trigger active',
        metadata: {
          webhookUrl: trigger.webhookUrl,
          allowedUpdates: trigger.updates,
          activatedAt: trigger.activatedAt,
          pendingUpdateCount: webhookInfo.pending_update_count || 0,
          lastErrorDate: webhookInfo.last_error_date,
          lastErrorMessage: webhookInfo.last_error_message,
        },
      };
    } catch (error) {
      return {
        active: true,
        type: TriggerType.TELEGRAM,
        message: 'Telegram trigger active (status check failed)',
        metadata: {
          webhookUrl: trigger.webhookUrl,
          allowedUpdates: trigger.updates,
          activatedAt: trigger.activatedAt,
        },
      };
    }
  }

  /**
   * Get trigger type identifier
   */
  getTriggerType(): TriggerType {
    return TriggerType.TELEGRAM;
  }

  /**
   * Check if webhook exists on Telegram
   */
  private async checkWebhookExists(botToken: string, expectedUrl: string): Promise<{
    exists: boolean;
    url?: string;
    info?: any;
  }> {
    try {
      const info = await this.getWebhookInfo(botToken);
      const currentUrl = info.url || '';

      return {
        exists: currentUrl !== '',
        url: currentUrl,
        info,
      };
    } catch (error) {
      this.logger.error('Failed to check webhook existence:', error);
      return { exists: false };
    }
  }

  /**
   * Get webhook info from Telegram
   */
  private async getWebhookInfo(botToken: string): Promise<any> {
    const url = `https://api.telegram.org/bot${botToken}/getWebhookInfo`;
    const response = await axios.post(url);

    if (!response.data.ok) {
      throw new Error(`Telegram API error: ${response.data.description}`);
    }

    return response.data.result;
  }

  /**
   * Set webhook on Telegram
   */
  private async setWebhook(
    botToken: string,
    webhookUrl: string,
    allowedUpdates: string[],
    secretToken: string,
  ): Promise<{ success: boolean; error?: string; info?: any }> {
    try {
      const url = `https://api.telegram.org/bot${botToken}/setWebhook`;

      const payload: any = {
        url: webhookUrl,
        secret_token: secretToken,
      };

      // Only set allowed_updates if specific types are selected
      if (allowedUpdates.length > 0) {
        payload.allowed_updates = allowedUpdates;
      }

      this.logger.debug(`Setting webhook: ${webhookUrl}`, payload);

      const response = await axios.post(url, payload);

      if (!response.data.ok) {
        throw new Error(response.data.description || 'Failed to set webhook');
      }

      // Get webhook info after setting
      const info = await this.getWebhookInfo(botToken);

      return {
        success: true,
        info,
      };
    } catch (error: any) {
      this.logger.error('Failed to set webhook:', error);

      let errorMessage = error.message;
      if (error.response?.data?.description) {
        errorMessage = error.response.data.description;
      }

      return {
        success: false,
        error: errorMessage,
      };
    }
  }

  /**
   * Delete webhook from Telegram
   */
  private async deleteWebhook(botToken: string): Promise<void> {
    try {
      const url = `https://api.telegram.org/bot${botToken}/deleteWebhook`;
      const response = await axios.post(url, { drop_pending_updates: false });

      if (!response.data.ok) {
        throw new Error(response.data.description || 'Failed to delete webhook');
      }

      this.logger.debug('Webhook deleted successfully');
    } catch (error: any) {
      this.logger.error('Failed to delete webhook:', error);
      throw error;
    }
  }

  /**
   * Generate webhook URL for workflow
   */
  private generateWebhookUrl(workflowId: string): string {
    const baseUrl = this.configService.get<string>('APP_URL') || 'http://localhost:3000';
    const cleanBaseUrl = baseUrl.replace(/\/$/, ''); // Remove trailing slash
    return `${cleanBaseUrl}/api/v1/webhooks/telegram/${workflowId}`;
  }

  /**
   * Generate secret token for webhook validation
   * Only alphanumeric, underscore, and hyphen allowed
   */
  private generateSecretToken(workflowId: string): string {
    // Use workflow ID as base, add timestamp for uniqueness
    const base = `fluxturn_${workflowId}_${Date.now()}`;

    // Remove any characters not allowed by Telegram (only A-Z, a-z, 0-9, _, -)
    const token = base.replace(/[^a-zA-Z0-9_-]+/g, '');

    // Limit to 256 characters (Telegram limit)
    return token.substring(0, 256);
  }

  /**
   * Prepare allowed updates array
   * If '*' or empty, return empty array (means all updates)
   */
  private prepareAllowedUpdates(updates: string[]): string[] {
    if (!updates || updates.length === 0 || updates.includes('*')) {
      return []; // Empty array = all updates
    }

    // Map of supported update types
    const validUpdateTypes = [
      'message',
      'edited_message',
      'channel_post',
      'edited_channel_post',
      'inline_query',
      'chosen_inline_result',
      'callback_query',
      'shipping_query',
      'pre_checkout_query',
      'poll',
      'poll_answer',
      'my_chat_member',
      'chat_member',
      'chat_join_request',
    ];

    return updates.filter(update => validUpdateTypes.includes(update));
  }

  /**
   * Get setup instructions for user
   */
  private getSetupInstructions(workflowId: string, webhookUrl: string, botToken: string): any {
    return {
      webhookUrl,
      message: '✅ Your Telegram webhook has been automatically registered!',
      steps: [
        'Your Telegram bot is now connected and will receive updates at the webhook URL',
        'Make sure your bot has the necessary permissions in the chat/group',
        'Test the webhook by sending a message to your bot',
      ],
      manualSetupCommand: `curl -X POST https://api.telegram.org/bot${botToken}/setWebhook -d "url=${webhookUrl}"`,
      verifyCommand: `curl https://api.telegram.org/bot${botToken}/getWebhookInfo`,
      ngrokHelp: webhookUrl.includes('localhost')
        ? 'For local development, use ngrok: ngrok http 3000, then update APP_URL in .env'
        : null,
    };
  }

  /**
   * Validate webhook secret token (timing-safe comparison)
   */
  validateSecretToken(workflowId: string, providedToken: string | undefined): boolean {
    const trigger = this.activeTriggers.get(workflowId);

    if (!trigger) {
      this.logger.warn(`No active trigger found for workflow ${workflowId}`);
      this.logger.debug(`Active triggers count: ${this.activeTriggers.size}`);
      return false;
    }

    if (!providedToken) {
      this.logger.warn(`No secret token provided for workflow ${workflowId}`);
      return false;
    }

    this.logger.debug(`Expected token (first 10 chars): ${trigger.secretToken.substring(0, 10)}...`);
    this.logger.debug(`Provided token (first 10 chars): ${providedToken.substring(0, 10)}...`);
    this.logger.debug(`Expected length: ${trigger.secretToken.length}, Provided length: ${providedToken.length}`);

    // Timing-safe comparison to prevent timing attacks
    const expectedBuffer = Buffer.from(trigger.secretToken);
    const providedBuffer = Buffer.from(providedToken);

    if (expectedBuffer.byteLength !== providedBuffer.byteLength) {
      this.logger.warn(`Token length mismatch: expected ${expectedBuffer.byteLength}, got ${providedBuffer.byteLength}`);
      return false;
    }

    const isValid = crypto.timingSafeEqual(expectedBuffer, providedBuffer);
    this.logger.debug(`Token validation result: ${isValid}`);
    return isValid;
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
      // The database stores it as {iv, data, authTag}
      // But crypto expects {encrypted, iv, authTag}
      const encrypted = encryptedConfig.data || encryptedConfig.encrypted;
      const iv = encryptedConfig.iv;
      const authTag = encryptedConfig.authTag;

      if (!encrypted || !iv || !authTag) {
        throw new Error('Invalid encrypted credential format');
      }

      // Get encryption key from environment (same as connectors service)
      const secretKey = this.configService.get<string>('CONNECTOR_ENCRYPTION_KEY');

      if (!secretKey) {
        throw new Error('CONNECTOR_ENCRYPTION_KEY not set in environment');
      }

      const algorithm = 'aes-256-gcm';
      // Use same key format as ConnectorsService - first 32 chars of hex string
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
