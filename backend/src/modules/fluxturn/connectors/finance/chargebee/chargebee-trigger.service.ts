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

interface ChargebeeTriggerConfig {
  accountName?: string;
  apiKey?: string;
  events?: string[];
  webhookToken?: string;
  actionParams?: {
    accountName?: string;
    apiKey?: string;
    events?: string[];
    webhookToken?: string;
  };
  connectorConfigId?: string;
  credentialId?: string;
}

interface ActiveTrigger {
  accountName: string;
  apiKey: string;
  webhookUrl: string;
  webhookId: string;
  secretToken: string;
  events: string[];
  activatedAt: Date;
  webhookInfo?: any;
}

/**
 * Chargebee Trigger Service
 *
 * Manages Chargebee webhook registration and lifecycle.
 * Integrates with Chargebee API to automatically set up webhooks
 * for receiving subscription, invoice, customer, and payment events.
 *
 * Key Features:
 * - Automatic webhook registration with Chargebee API
 * - HTTPS URL requirement handling
 * - Secret token generation and validation
 * - Webhook lifecycle management (check, create, delete)
 * - Support for multiple event types
 */
@Injectable()
export class ChargebeeTriggerService implements ITriggerService, OnModuleInit {
  private readonly logger = new Logger(ChargebeeTriggerService.name);
  private readonly activeTriggers = new Map<string, ActiveTrigger>();

  constructor(
    private readonly configService: ConfigService,
    private readonly platformService: PlatformService
  ) {}

  /**
   * Restore active workflows on module initialization
   */
  async onModuleInit() {
    this.logger.log('Initializing Chargebee Trigger Service...');
    try {
      await this.restoreActiveWorkflows();
    } catch (error) {
      this.logger.error('Failed to restore active workflows:', error);
    }
  }

  /**
   * Restore active Chargebee workflows from database
   */
  private async restoreActiveWorkflows() {
    try {
      // Query for all active workflows with Chargebee triggers
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

          // Find Chargebee trigger nodes
          const chargebeeTriggerNodes = nodes.filter(
            (node: any) => node.type === 'CONNECTOR_TRIGGER' &&
                          node.data?.connectorType === 'chargebee'
          );

          if (chargebeeTriggerNodes.length === 0) {
            continue; // No Chargebee triggers in this workflow
          }

          const workflowId = row.id;
          const triggerNode = chargebeeTriggerNodes[0]; // Use first Chargebee trigger
          const triggerConfig = {
            ...triggerNode.data,
            ...triggerNode.data?.actionParams,
            credentialId: triggerNode.data?.credentialId || triggerNode.data?.connectorConfigId
          };

          this.logger.debug(`Restoring Chargebee trigger for workflow ${workflowId}`);

          // Re-activate the trigger
          const result = await this.activate(workflowId, triggerConfig);

          if (result.success) {
            restoredCount++;
            this.logger.log(`Successfully restored Chargebee trigger for workflow ${workflowId}`);
          } else {
            this.logger.warn(`Failed to restore workflow ${workflowId}: ${result.message}`);
          }
        } catch (error) {
          this.logger.error(`Error restoring workflow ${row.id}:`, error.message);
        }
      }

      if (restoredCount > 0) {
        this.logger.log(`Successfully restored ${restoredCount} Chargebee workflow(s)`);
      } else {
        this.logger.log('No active Chargebee workflows to restore');
      }
    } catch (error) {
      this.logger.error('Failed to restore active workflows:', error);
      throw error;
    }
  }

  /**
   * Activate Chargebee webhook for a workflow
   */
  async activate(workflowId: string, triggerConfig: ChargebeeTriggerConfig): Promise<TriggerActivationResult> {
    try {
      this.logger.log(`Activating Chargebee trigger for workflow ${workflowId}`);
      this.logger.debug(`Trigger config: ${JSON.stringify(triggerConfig)}`);

      // Extract credentials from config - check multiple possible locations
      let accountName =
        triggerConfig.accountName ||
        triggerConfig.actionParams?.accountName;

      let apiKey =
        triggerConfig.apiKey ||
        triggerConfig.actionParams?.apiKey;

      // If no direct credentials, check for credential ID
      const credentialId = triggerConfig.credentialId || triggerConfig.connectorConfigId;

      if ((!accountName || !apiKey) && credentialId) {
        this.logger.log(`Fetching credentials from credential: ${credentialId}`);
        try {
          // Fetch credential from database
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

                accountName = decryptedCredentials.accountName;
                apiKey = decryptedCredentials.apiKey;
                this.logger.log(`Credentials ${accountName && apiKey ? 'found' : 'not found'} in decrypted credentials`);
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
              accountName = credentials?.accountName;
              apiKey = credentials?.apiKey;
              this.logger.log(`Credentials ${accountName && apiKey ? 'found' : 'not found'} in plain credentials`);
            }
          } else {
            this.logger.warn(`Credential ${credentialId} not found in database`);
          }
        } catch (error) {
          this.logger.error(`Failed to fetch credential ${credentialId}:`, error);
          return {
            success: false,
            message: 'Failed to fetch credentials',
            error: error.message,
          };
        }
      }

      if (!accountName || !apiKey) {
        this.logger.error(`Missing credentials. credentialId: ${credentialId}, has accountName: ${!!accountName}, has apiKey: ${!!apiKey}`);
        return {
          success: false,
          message: 'Account name and API key are required for Chargebee trigger',
          error: 'Missing credentials in trigger configuration. Please select a credential or enter credentials directly.',
        };
      }

      // Generate webhook URL - must be HTTPS for Chargebee
      const webhookUrl = this.generateWebhookUrl(workflowId);

      // Validate HTTPS requirement
      if (!webhookUrl.startsWith('https://')) {
        return {
          success: false,
          message: 'Chargebee requires HTTPS webhook URL',
          error: 'APP_URL must be HTTPS or use ngrok for local development',
          data: {
            currentUrl: webhookUrl,
            suggestion: 'Set APP_URL to an HTTPS URL or use ngrok: ngrok http 3000',
          },
        };
      }

      // Extract event types
      const events = triggerConfig.events || triggerConfig.actionParams?.events || [];
      const eventTypes = this.prepareEventTypes(events);

      // Generate secret token for webhook validation
      const secretToken = this.generateSecretToken(workflowId);

      // Check if webhook already exists
      const existingWebhook = await this.checkWebhookExists(accountName, apiKey, webhookUrl);

      if (existingWebhook.exists && existingWebhook.webhookId) {
        this.logger.log(`Webhook already registered for workflow ${workflowId}`);

        // Store in active triggers
        this.activeTriggers.set(workflowId, {
          accountName,
          apiKey,
          webhookUrl,
          webhookId: existingWebhook.webhookId,
          secretToken,
          events: eventTypes,
          activatedAt: new Date(),
          webhookInfo: existingWebhook.info,
        });

        return {
          success: true,
          message: 'Chargebee webhook already registered',
          data: {
            webhookUrl,
            webhookId: existingWebhook.webhookId,
            secretToken,
            eventTypes,
            webhookInfo: existingWebhook.info,
            alreadyRegistered: true,
          },
        };
      }

      // Create webhook with Chargebee API
      const webhookResult = await this.createWebhook(accountName, apiKey, webhookUrl, eventTypes);

      if (!webhookResult.success) {
        return {
          success: false,
          message: 'Failed to register webhook with Chargebee',
          error: webhookResult.error,
        };
      }

      // Store trigger state
      this.activeTriggers.set(workflowId, {
        accountName,
        apiKey,
        webhookUrl,
        webhookId: webhookResult.webhookId,
        secretToken,
        events: eventTypes,
        activatedAt: new Date(),
        webhookInfo: webhookResult.info,
      });

      this.logger.log(`Chargebee trigger activated successfully for workflow ${workflowId}`);

      return {
        success: true,
        message: 'Chargebee webhook registered successfully',
        data: {
          webhookUrl,
          webhookId: webhookResult.webhookId,
          secretToken,
          eventTypes,
          webhookInfo: webhookResult.info,
          setupInstructions: this.getSetupInstructions(workflowId, webhookUrl, accountName),
        },
      };

    } catch (error: any) {
      this.logger.error(`Failed to activate Chargebee trigger for workflow ${workflowId}:`, error);
      return {
        success: false,
        message: 'Failed to activate Chargebee trigger',
        error: error.message || 'Unknown error occurred',
      };
    }
  }

  /**
   * Deactivate Chargebee webhook for a workflow
   */
  async deactivate(workflowId: string): Promise<TriggerDeactivationResult> {
    try {
      this.logger.log(`Deactivating Chargebee trigger for workflow ${workflowId}`);

      const trigger = this.activeTriggers.get(workflowId);

      if (!trigger) {
        this.logger.warn(`No active Chargebee trigger found for workflow ${workflowId}`);
        return {
          success: true,
          message: 'No active Chargebee trigger found',
        };
      }

      // Delete webhook from Chargebee
      await this.deleteWebhook(trigger.accountName, trigger.apiKey, trigger.webhookId);

      // Remove from active triggers
      this.activeTriggers.delete(workflowId);

      this.logger.log(`Chargebee trigger deactivated successfully for workflow ${workflowId}`);

      return {
        success: true,
        message: 'Chargebee webhook deleted successfully',
      };

    } catch (error: any) {
      this.logger.error(`Failed to deactivate Chargebee trigger for workflow ${workflowId}:`, error);

      // Still remove from active triggers even if API call fails
      this.activeTriggers.delete(workflowId);

      return {
        success: false,
        message: 'Failed to deactivate Chargebee trigger (removed locally)',
      };
    }
  }

  /**
   * Get status of Chargebee trigger for a workflow
   */
  async getStatus(workflowId: string): Promise<TriggerStatus> {
    const trigger = this.activeTriggers.get(workflowId);

    if (!trigger) {
      return {
        active: false,
        type: TriggerType.CHARGEBEE,
        message: 'Chargebee trigger not active',
      };
    }

    // Optionally verify with Chargebee API
    try {
      const webhookInfo = await this.getWebhookInfo(trigger.accountName, trigger.apiKey, trigger.webhookId);

      return {
        active: true,
        type: TriggerType.CHARGEBEE,
        message: 'Chargebee trigger active',
        metadata: {
          webhookUrl: trigger.webhookUrl,
          webhookId: trigger.webhookId,
          eventTypes: trigger.events,
          activatedAt: trigger.activatedAt,
          webhookStatus: webhookInfo.status,
        },
      };
    } catch (error) {
      return {
        active: true,
        type: TriggerType.CHARGEBEE,
        message: 'Chargebee trigger active (status check failed)',
        metadata: {
          webhookUrl: trigger.webhookUrl,
          webhookId: trigger.webhookId,
          eventTypes: trigger.events,
          activatedAt: trigger.activatedAt,
        },
      };
    }
  }

  /**
   * Get trigger type identifier
   */
  getTriggerType(): TriggerType {
    return TriggerType.CHARGEBEE;
  }

  /**
   * Check if webhook exists on Chargebee
   */
  private async checkWebhookExists(accountName: string, apiKey: string, expectedUrl: string): Promise<{
    exists: boolean;
    webhookId?: string;
    info?: any;
  }> {
    try {
      const webhooks = await this.listWebhooks(accountName, apiKey);

      // Find webhook with matching URL
      const matchingWebhook = webhooks.find((wh: any) => wh.webhook_url === expectedUrl);

      if (matchingWebhook) {
        return {
          exists: true,
          webhookId: matchingWebhook.id,
          info: matchingWebhook,
        };
      }

      return { exists: false };
    } catch (error) {
      this.logger.error('Failed to check webhook existence:', error);
      return { exists: false };
    }
  }

  /**
   * List all webhooks from Chargebee
   */
  private async listWebhooks(accountName: string, apiKey: string): Promise<any[]> {
    const url = `https://${accountName}.chargebee.com/api/v2/webhooks`;
    const auth = Buffer.from(`${apiKey}:`).toString('base64');

    const response = await axios.get(url, {
      headers: {
        'Authorization': `Basic ${auth}`,
        'Content-Type': 'application/json',
      },
    });

    return response.data.list?.map((item: any) => item.webhook) || [];
  }

  /**
   * Get webhook info from Chargebee
   */
  private async getWebhookInfo(accountName: string, apiKey: string, webhookId: string): Promise<any> {
    const url = `https://${accountName}.chargebee.com/api/v2/webhooks/${webhookId}`;
    const auth = Buffer.from(`${apiKey}:`).toString('base64');

    const response = await axios.get(url, {
      headers: {
        'Authorization': `Basic ${auth}`,
        'Content-Type': 'application/json',
      },
    });

    return response.data.webhook;
  }

  /**
   * Create webhook on Chargebee
   */
  private async createWebhook(
    accountName: string,
    apiKey: string,
    webhookUrl: string,
    eventTypes: string[],
  ): Promise<{ success: boolean; error?: string; webhookId?: string; info?: any }> {
    try {
      const url = `https://${accountName}.chargebee.com/api/v2/webhooks`;
      const auth = Buffer.from(`${apiKey}:`).toString('base64');

      const payload: any = {
        webhook_url: webhookUrl,
        event_types: eventTypes,
      };

      this.logger.debug(`Creating webhook: ${webhookUrl}`, payload);

      const response = await axios.post(url, payload, {
        headers: {
          'Authorization': `Basic ${auth}`,
          'Content-Type': 'application/json',
        },
      });

      const webhook = response.data.webhook;

      return {
        success: true,
        webhookId: webhook.id,
        info: webhook,
      };
    } catch (error: any) {
      this.logger.error('Failed to create webhook:', error);

      let errorMessage = error.message;
      if (error.response?.data?.message) {
        errorMessage = error.response.data.message;
      }

      return {
        success: false,
        error: errorMessage,
      };
    }
  }

  /**
   * Delete webhook from Chargebee
   */
  private async deleteWebhook(accountName: string, apiKey: string, webhookId: string): Promise<void> {
    try {
      const url = `https://${accountName}.chargebee.com/api/v2/webhooks/${webhookId}/delete`;
      const auth = Buffer.from(`${apiKey}:`).toString('base64');

      const response = await axios.post(url, {}, {
        headers: {
          'Authorization': `Basic ${auth}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.data.webhook) {
        throw new Error('Failed to delete webhook');
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
    return `${cleanBaseUrl}/api/v1/webhooks/chargebee/${workflowId}`;
  }

  /**
   * Generate secret token for webhook validation
   */
  private generateSecretToken(workflowId: string): string {
    // Use workflow ID as base, add timestamp for uniqueness
    const base = `fluxturn_${workflowId}_${Date.now()}`;

    // Create a hash for additional security
    const hash = crypto.createHash('sha256').update(base).digest('hex');

    // Limit to 64 characters
    return hash.substring(0, 64);
  }

  /**
   * Prepare event types array
   * Map trigger event types to Chargebee event types
   */
  private prepareEventTypes(events: string[]): string[] {
    if (!events || events.length === 0 || events.includes('*')) {
      // Return all supported event types
      return [
        'subscription_created',
        'subscription_cancelled',
        'subscription_renewed',
        'payment_succeeded',
        'payment_failed',
        'invoice_generated',
        'customer_created',
      ];
    }

    return events;
  }

  /**
   * Get setup instructions for user
   */
  private getSetupInstructions(workflowId: string, webhookUrl: string, accountName: string): any {
    return {
      webhookUrl,
      message: 'Your Chargebee webhook has been automatically registered!',
      steps: [
        'Your Chargebee account is now connected and will receive events at the webhook URL',
        'Events will be automatically sent when subscriptions, invoices, customers, or payments change',
        'You can view and manage webhooks in your Chargebee dashboard under Settings > Webhooks',
      ],
      dashboardUrl: `https://${accountName}.chargebee.com/settings/webhooks`,
      verifyUrl: `https://${accountName}.chargebee.com/api/v2/webhooks`,
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
