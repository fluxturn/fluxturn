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

interface GumroadTriggerConfig {
  accessToken?: string;
  resourceName?: string;
  actionParams?: {
    accessToken?: string;
    resourceName?: string;
  };
  connectorConfigId?: string;
  credentialId?: string;
}

interface ActiveTrigger {
  accessToken: string;
  webhookUrl: string;
  resourceName: string;
  activatedAt: Date;
  resourceSubscriptionId?: string;
}

/**
 * Gumroad Trigger Service
 *
 * Manages Gumroad webhook registration and lifecycle for resource subscriptions.
 * Integrates with Gumroad API to automatically set up webhooks
 * for receiving sales, refunds, disputes, and subscription events.
 *
 * Key Features:
 * - Automatic webhook registration with Gumroad API
 * - Resource subscription management (sale, refund, dispute, dispute_won, cancellation)
 * - Webhook lifecycle management (check, create, delete)
 * - Support for multiple event types
 */
@Injectable()
export class GumroadTriggerService implements ITriggerService, OnModuleInit {
  private readonly logger = new Logger(GumroadTriggerService.name);
  private readonly activeTriggers = new Map<string, ActiveTrigger>();

  constructor(
    private readonly configService: ConfigService,
    private readonly platformService: PlatformService
  ) {}

  /**
   * Restore active workflows on module initialization
   */
  async onModuleInit() {
    this.logger.log('Initializing Gumroad Trigger Service...');
    try {
      await this.restoreActiveWorkflows();
    } catch (error) {
      this.logger.error('Failed to restore active workflows:', error);
    }
  }

  /**
   * Restore active Gumroad workflows from database
   */
  private async restoreActiveWorkflows() {
    try {
      // Query for all active workflows with Gumroad triggers
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

          // Find Gumroad trigger nodes
          const gumroadTriggerNodes = nodes.filter(
            (node: any) => node.type === 'CONNECTOR_TRIGGER' &&
                          node.data?.connectorType === 'gumroad'
          );

          if (gumroadTriggerNodes.length === 0) {
            continue; // No Gumroad triggers in this workflow
          }

          const workflowId = row.id;
          const triggerNode = gumroadTriggerNodes[0]; // Use first Gumroad trigger
          const triggerConfig = {
            ...triggerNode.data,
            ...triggerNode.data?.actionParams,
            credentialId: triggerNode.data?.credentialId || triggerNode.data?.connectorConfigId
          };

          this.logger.debug(`Restoring Gumroad trigger for workflow ${workflowId}`);

          // Re-activate the trigger
          const result = await this.activate(workflowId, triggerConfig);

          if (result.success) {
            restoredCount++;
            this.logger.log(`Restored Gumroad trigger for workflow ${workflowId}`);
          } else {
            this.logger.warn(`Failed to restore workflow ${workflowId}: ${result.message}`);
          }
        } catch (error) {
          this.logger.error(`Error restoring workflow ${row.id}:`, error.message);
        }
      }

      if (restoredCount > 0) {
        this.logger.log(`Successfully restored ${restoredCount} Gumroad workflow(s)`);
      } else {
        this.logger.log('No active Gumroad workflows to restore');
      }
    } catch (error) {
      this.logger.error('Failed to restore active workflows:', error);
      throw error;
    }
  }

  /**
   * Activate Gumroad webhook for a workflow
   */
  async activate(workflowId: string, triggerConfig: GumroadTriggerConfig): Promise<TriggerActivationResult> {
    try {
      this.logger.log(`Activating Gumroad trigger for workflow ${workflowId}`);
      this.logger.debug(`Trigger config: ${JSON.stringify(triggerConfig)}`);

      // Extract access token from config - check multiple possible locations
      let accessToken =
        triggerConfig.accessToken ||
        triggerConfig.actionParams?.accessToken;

      // If no direct access token, check for credential ID
      const credentialId = triggerConfig.credentialId || triggerConfig.connectorConfigId;

      if (!accessToken && credentialId) {
        this.logger.log(`Fetching access token from credential: ${credentialId}`);
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

                accessToken = decryptedCredentials.accessToken || decryptedCredentials.access_token;
                this.logger.log(`Access token ${accessToken ? 'found' : 'not found'} in decrypted credentials`);
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
              accessToken = credentials?.accessToken || credentials?.access_token;
              this.logger.log(`Access token ${accessToken ? 'found' : 'not found'} in plain credentials`);
            }
          } else {
            this.logger.warn(`Credential ${credentialId} not found in database`);
          }
        } catch (error) {
          this.logger.error(`Failed to fetch credential ${credentialId}:`, error);
          return {
            success: false,
            message: 'Failed to fetch access token from credential',
            error: error.message,
          };
        }
      }

      if (!accessToken) {
        this.logger.error(`No access token found. credentialId: ${credentialId}, direct token: ${!!triggerConfig.accessToken}`);
        return {
          success: false,
          message: 'Access token is required for Gumroad trigger',
          error: 'Missing access token in trigger configuration. Please select a credential or enter access token directly.',
        };
      }

      // Generate webhook URL
      const webhookUrl = this.generateWebhookUrl(workflowId);

      // Extract resource name (event type)
      const resourceName = triggerConfig.resourceName || triggerConfig.actionParams?.resourceName || 'sale';

      // Check if webhook already exists
      const existingWebhook = await this.checkWebhookExists(accessToken, webhookUrl, resourceName);

      if (existingWebhook.exists) {
        this.logger.log(`Webhook already registered for workflow ${workflowId}`);

        // Store in active triggers
        this.activeTriggers.set(workflowId, {
          accessToken,
          webhookUrl,
          resourceName,
          activatedAt: new Date(),
          resourceSubscriptionId: existingWebhook.id,
        });

        return {
          success: true,
          message: 'Gumroad webhook already registered',
          data: {
            webhookUrl,
            resourceName,
            resourceSubscriptionId: existingWebhook.id,
            alreadyRegistered: true,
          },
        };
      }

      // Set up webhook with Gumroad API
      const webhookResult = await this.setWebhook(accessToken, webhookUrl, resourceName);

      if (!webhookResult.success) {
        return {
          success: false,
          message: 'Failed to register webhook with Gumroad',
          error: webhookResult.error,
        };
      }

      // Store trigger state
      this.activeTriggers.set(workflowId, {
        accessToken,
        webhookUrl,
        resourceName,
        activatedAt: new Date(),
        resourceSubscriptionId: webhookResult.subscriptionId,
      });

      this.logger.log(`Gumroad trigger activated successfully for workflow ${workflowId}`);

      return {
        success: true,
        message: 'Gumroad webhook registered successfully',
        data: {
          webhookUrl,
          resourceName,
          resourceSubscriptionId: webhookResult.subscriptionId,
          setupInstructions: this.getSetupInstructions(workflowId, webhookUrl, resourceName),
        },
      };

    } catch (error: any) {
      this.logger.error(`Failed to activate Gumroad trigger for workflow ${workflowId}:`, error);
      return {
        success: false,
        message: 'Failed to activate Gumroad trigger',
        error: error.message || 'Unknown error occurred',
      };
    }
  }

  /**
   * Deactivate Gumroad webhook for a workflow
   */
  async deactivate(workflowId: string): Promise<TriggerDeactivationResult> {
    try {
      this.logger.log(`Deactivating Gumroad trigger for workflow ${workflowId}`);

      const trigger = this.activeTriggers.get(workflowId);

      if (!trigger) {
        this.logger.warn(`No active Gumroad trigger found for workflow ${workflowId}`);
        return {
          success: true,
          message: 'No active Gumroad trigger found',
        };
      }

      // Delete webhook from Gumroad
      if (trigger.resourceSubscriptionId) {
        await this.deleteWebhook(trigger.accessToken, trigger.resourceSubscriptionId);
      }

      // Remove from active triggers
      this.activeTriggers.delete(workflowId);

      this.logger.log(`Gumroad trigger deactivated successfully for workflow ${workflowId}`);

      return {
        success: true,
        message: 'Gumroad webhook deleted successfully',
      };

    } catch (error: any) {
      this.logger.error(`Failed to deactivate Gumroad trigger for workflow ${workflowId}:`, error);

      // Still remove from active triggers even if API call fails
      this.activeTriggers.delete(workflowId);

      return {
        success: false,
        message: 'Failed to deactivate Gumroad trigger (removed locally)',
      };
    }
  }

  /**
   * Get status of Gumroad trigger for a workflow
   */
  async getStatus(workflowId: string): Promise<TriggerStatus> {
    const trigger = this.activeTriggers.get(workflowId);

    if (!trigger) {
      return {
        active: false,
        type: TriggerType.GUMROAD,
        message: 'Gumroad trigger not active',
      };
    }

    return {
      active: true,
      type: TriggerType.GUMROAD,
      message: 'Gumroad trigger active',
      metadata: {
        webhookUrl: trigger.webhookUrl,
        resourceName: trigger.resourceName,
        activatedAt: trigger.activatedAt,
        resourceSubscriptionId: trigger.resourceSubscriptionId,
      },
    };
  }

  /**
   * Get trigger type identifier
   */
  getTriggerType(): TriggerType {
    return TriggerType.GUMROAD;
  }

  /**
   * Check if webhook exists on Gumroad
   */
  private async checkWebhookExists(accessToken: string, expectedUrl: string, resourceName: string): Promise<{
    exists: boolean;
    id?: string;
  }> {
    try {
      const url = `https://api.gumroad.com/v2/resource_subscriptions?access_token=${accessToken}`;
      const response = await axios.get(url);

      if (!response.data.success) {
        throw new Error('Failed to fetch resource subscriptions');
      }

      const subscriptions = response.data.resource_subscriptions || [];

      // Check if a subscription exists for this URL and resource name
      const existingSubscription = subscriptions.find(
        (sub: any) => sub.post_url === expectedUrl && sub.resource_name === resourceName
      );

      return {
        exists: !!existingSubscription,
        id: existingSubscription?.id,
      };
    } catch (error) {
      this.logger.error('Failed to check webhook existence:', error);
      return { exists: false };
    }
  }

  /**
   * Set webhook on Gumroad
   */
  private async setWebhook(
    accessToken: string,
    webhookUrl: string,
    resourceName: string,
  ): Promise<{ success: boolean; error?: string; subscriptionId?: string }> {
    try {
      const url = 'https://api.gumroad.com/v2/resource_subscriptions';

      const payload = {
        access_token: accessToken,
        post_url: webhookUrl,
        resource_name: resourceName,
      };

      this.logger.debug(`Setting webhook: ${webhookUrl} for resource: ${resourceName}`);

      const response = await axios.put(url, payload);

      if (!response.data.success) {
        throw new Error(response.data.message || 'Failed to set webhook');
      }

      return {
        success: true,
        subscriptionId: response.data.resource_subscription?.id,
      };
    } catch (error: any) {
      this.logger.error('Failed to set webhook:', error);

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
   * Delete webhook from Gumroad
   */
  private async deleteWebhook(accessToken: string, subscriptionId: string): Promise<void> {
    try {
      const url = `https://api.gumroad.com/v2/resource_subscriptions/${subscriptionId}?access_token=${accessToken}`;
      const response = await axios.delete(url);

      if (!response.data.success) {
        throw new Error(response.data.message || 'Failed to delete webhook');
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
    return `${cleanBaseUrl}/api/v1/webhooks/gumroad/${workflowId}`;
  }

  /**
   * Get setup instructions for user
   */
  private getSetupInstructions(workflowId: string, webhookUrl: string, resourceName: string): any {
    return {
      webhookUrl,
      resourceName,
      message: 'Your Gumroad webhook has been automatically registered!',
      steps: [
        'Your Gumroad resource subscription is now active and will receive updates at the webhook URL',
        `Subscribed to: ${resourceName}`,
        'Test the webhook by performing the corresponding action in your Gumroad account',
      ],
      supportedResources: [
        'sale - Triggered when a sale is made',
        'refund - Triggered when a sale is refunded',
        'dispute - Triggered when a dispute is raised',
        'dispute_won - Triggered when a dispute is won',
        'cancellation - Triggered when a subscription is cancelled',
      ],
    };
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
