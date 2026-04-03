import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';
import { createVerify } from 'crypto';
import {
  ITriggerService,
  TriggerActivationResult,
  TriggerDeactivationResult,
  TriggerStatus,
  TriggerType,
} from '../../../workflow/interfaces/trigger.interface';
import { PlatformService } from '../../../../database/platform.service';

interface WiseTriggerConfig {
  apiToken?: string;
  environment?: 'live' | 'test';
  profileId?: string;
  event?: string;
  actionParams?: {
    apiToken?: string;
    environment?: string;
    profileId?: string;
    event?: string;
  };
  connectorConfigId?: string;
  credentialId?: string;
}

interface ActiveTrigger {
  apiToken: string;
  environment: string;
  profileId: string;
  webhookUrl: string;
  event: string;
  triggerName: string;
  activatedAt: Date;
  webhookId?: string;
  webhookInfo?: any;
}

// Public keys for webhook signature verification
const livePublicKey = `
-----BEGIN PUBLIC KEY-----
MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEAvO8vXV+JksBzZAY6GhSO
XdoTCfhXaaiZ+qAbtaDBiu2AGkGVpmEygFmWP4Li9m5+Ni85BhVvZOodM9epgW3F
bA5Q1SexvAF1PPjX4JpMstak/QhAgl1qMSqEevL8cmUeTgcMuVWCJmlge9h7B1CS
D4rtlimGZozG39rUBDg6Qt2K+P4wBfLblL0k4C4YUdLnpGYEDIth+i8XsRpFlogx
CAFyH9+knYsDbR43UJ9shtc42Ybd40Afihj8KnYKXzchyQ42aC8aZ/h5hyZ28yVy
Oj3Vos0VdBIs/gAyJ/4yyQFCXYte64I7ssrlbGRaco4nKF3HmaNhxwyKyJafz19e
HwIDAQAB
-----END PUBLIC KEY-----`;

const testPublicKey = `
-----BEGIN PUBLIC KEY-----
MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEAwpb91cEYuyJNQepZAVfP
ZIlPZfNUefH+n6w9SW3fykqKu938cR7WadQv87oF2VuT+fDt7kqeRziTmPSUhqPU
ys/V2Q1rlfJuXbE+Gga37t7zwd0egQ+KyOEHQOpcTwKmtZ81ieGHynAQzsn1We3j
wt760MsCPJ7GMT141ByQM+yW1Bx+4SG3IGjXWyqOWrcXsxAvIXkpUD/jK/L958Cg
nZEgz0BSEh0QxYLITnW1lLokSx/dTianWPFEhMC9BgijempgNXHNfcVirg1lPSyg
z7KqoKUN0oHqWLr2U1A+7kqrl6O2nx3CKs1bj1hToT1+p4kcMoHXA7kA+VBLUpEs
VwIDAQAB
-----END PUBLIC KEY-----`;

/**
 * Wise Trigger Service
 *
 * Manages Wise webhook registration and lifecycle.
 * Integrates with Wise API to automatically set up webhooks
 * for receiving transfer events, balance updates, and active case notifications.
 *
 * Key Features:
 * - Automatic webhook registration with Wise API
 * - RSA signature verification for webhook security
 * - Webhook lifecycle management (check, create, delete)
 * - Support for multiple event types (transfers, balances)
 * - Environment support (live/test)
 */
@Injectable()
export class WiseTriggerService implements ITriggerService, OnModuleInit {
  private readonly logger = new Logger(WiseTriggerService.name);
  private readonly activeTriggers = new Map<string, ActiveTrigger>();

  constructor(
    private readonly configService: ConfigService,
    private readonly platformService: PlatformService
  ) {}

  /**
   * Restore active workflows on module initialization
   */
  async onModuleInit() {
    this.logger.log('Initializing Wise Trigger Service...');
    try {
      await this.restoreActiveWorkflows();
    } catch (error) {
      this.logger.error('Failed to restore active workflows:', error);
    }
  }

  /**
   * Restore active Wise workflows from database
   */
  private async restoreActiveWorkflows() {
    try {
      // Query for all active workflows with Wise triggers
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

          // Find Wise trigger nodes
          const wiseTriggerNodes = nodes.filter(
            (node: any) => node.type === 'CONNECTOR_TRIGGER' &&
                          node.data?.connectorType === 'wise'
          );

          if (wiseTriggerNodes.length === 0) {
            continue; // No Wise triggers in this workflow
          }

          const workflowId = row.id;
          const triggerNode = wiseTriggerNodes[0]; // Use first Wise trigger
          const triggerConfig = {
            ...triggerNode.data,
            ...triggerNode.data?.actionParams,
            credentialId: triggerNode.data?.credentialId || triggerNode.data?.connectorConfigId
          };

          this.logger.debug(`Restoring Wise trigger for workflow ${workflowId}`);

          // Re-activate the trigger
          const result = await this.activate(workflowId, triggerConfig);

          if (result.success) {
            restoredCount++;
            this.logger.log(`Successfully restored Wise trigger for workflow ${workflowId}`);
          } else {
            this.logger.warn(`Failed to restore workflow ${workflowId}: ${result.message}`);
          }
        } catch (error) {
          this.logger.error(`Error restoring workflow ${row.id}:`, error.message);
        }
      }

      if (restoredCount > 0) {
        this.logger.log(`Successfully restored ${restoredCount} Wise workflow(s)`);
      } else {
        this.logger.log('No active Wise workflows to restore');
      }
    } catch (error) {
      this.logger.error('Failed to restore active workflows:', error);
      throw error;
    }
  }

  /**
   * Activate Wise webhook for a workflow
   */
  async activate(workflowId: string, triggerConfig: WiseTriggerConfig): Promise<TriggerActivationResult> {
    try {
      this.logger.log(`Activating Wise trigger for workflow ${workflowId}`);
      this.logger.debug(`Trigger config: ${JSON.stringify(triggerConfig)}`);

      // Extract API token from config - check multiple possible locations
      let apiToken =
        triggerConfig.apiToken ||
        triggerConfig.actionParams?.apiToken;

      // Extract environment
      let environment =
        triggerConfig.environment ||
        triggerConfig.actionParams?.environment ||
        'live';

      // Extract profile ID
      let profileId =
        triggerConfig.profileId ||
        triggerConfig.actionParams?.profileId;

      // Extract event
      let event =
        triggerConfig.event ||
        triggerConfig.actionParams?.event;

      // If no direct API token, check for credential ID
      const credentialId = triggerConfig.credentialId || triggerConfig.connectorConfigId;

      if (!apiToken && credentialId) {
        this.logger.log(`Fetching API token from credential: ${credentialId}`);
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

                apiToken = decryptedCredentials.apiToken || decryptedCredentials.api_token;
                environment = decryptedCredentials.environment || environment;
                this.logger.log(`API token ${apiToken ? 'found' : 'not found'} in decrypted credentials`);
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
              apiToken = credentials?.apiToken || credentials?.api_token;
              environment = credentials?.environment || environment;
              this.logger.log(`API token ${apiToken ? 'found' : 'not found'} in plain credentials`);
            }
          } else {
            this.logger.warn(`Credential ${credentialId} not found in database`);
          }
        } catch (error) {
          this.logger.error(`Failed to fetch credential ${credentialId}:`, error);
          return {
            success: false,
            message: 'Failed to fetch API token from credential',
            error: error.message,
          };
        }
      }

      if (!apiToken) {
        this.logger.error(`No API token found. credentialId: ${credentialId}, direct token: ${!!triggerConfig.apiToken}`);
        return {
          success: false,
          message: 'API token is required for Wise trigger',
          error: 'Missing API token in trigger configuration. Please select a credential or enter API token directly.',
        };
      }

      if (!profileId) {
        return {
          success: false,
          message: 'Profile ID is required for Wise trigger',
          error: 'Please provide a Wise profile ID',
        };
      }

      if (!event) {
        return {
          success: false,
          message: 'Event type is required for Wise trigger',
          error: 'Please select an event type',
        };
      }

      // Generate webhook URL
      const webhookUrl = this.generateWebhookUrl(workflowId);

      // Get trigger name from event
      const triggerName = this.getTriggerName(event);

      // Check if webhook already exists
      const existingWebhook = await this.checkWebhookExists(apiToken, environment, profileId, webhookUrl, triggerName);

      if (existingWebhook.exists && existingWebhook.webhookId) {
        this.logger.log(`Webhook already registered for workflow ${workflowId}`);

        // Store in active triggers
        this.activeTriggers.set(workflowId, {
          apiToken,
          environment,
          profileId,
          webhookUrl,
          event,
          triggerName,
          activatedAt: new Date(),
          webhookId: existingWebhook.webhookId,
          webhookInfo: existingWebhook.info,
        });

        return {
          success: true,
          message: 'Wise webhook already registered',
          data: {
            webhookUrl,
            webhookId: existingWebhook.webhookId,
            event,
            triggerName,
            webhookInfo: existingWebhook.info,
            alreadyRegistered: true,
          },
        };
      }

      // Create new webhook with Wise API
      const webhookResult = await this.createWebhook(apiToken, environment, profileId, webhookUrl, triggerName);

      if (!webhookResult.success) {
        return {
          success: false,
          message: 'Failed to register webhook with Wise',
          error: webhookResult.error,
        };
      }

      // Store trigger state
      this.activeTriggers.set(workflowId, {
        apiToken,
        environment,
        profileId,
        webhookUrl,
        event,
        triggerName,
        activatedAt: new Date(),
        webhookId: webhookResult.webhookId,
        webhookInfo: webhookResult.info,
      });

      this.logger.log(`Wise trigger activated successfully for workflow ${workflowId}`);

      return {
        success: true,
        message: 'Wise webhook registered successfully',
        data: {
          webhookUrl,
          webhookId: webhookResult.webhookId,
          event,
          triggerName,
          webhookInfo: webhookResult.info,
          setupInstructions: this.getSetupInstructions(workflowId, webhookUrl),
        },
      };

    } catch (error: any) {
      this.logger.error(`Failed to activate Wise trigger for workflow ${workflowId}:`, error);
      return {
        success: false,
        message: 'Failed to activate Wise trigger',
        error: error.message || 'Unknown error occurred',
      };
    }
  }

  /**
   * Deactivate Wise webhook for a workflow
   */
  async deactivate(workflowId: string): Promise<TriggerDeactivationResult> {
    try {
      this.logger.log(`Deactivating Wise trigger for workflow ${workflowId}`);

      const trigger = this.activeTriggers.get(workflowId);

      if (!trigger) {
        this.logger.warn(`No active Wise trigger found for workflow ${workflowId}`);
        return {
          success: true,
          message: 'No active Wise trigger found',
        };
      }

      // Delete webhook from Wise
      if (trigger.webhookId) {
        await this.deleteWebhook(trigger.apiToken, trigger.environment, trigger.profileId, trigger.webhookId);
      }

      // Remove from active triggers
      this.activeTriggers.delete(workflowId);

      this.logger.log(`Wise trigger deactivated successfully for workflow ${workflowId}`);

      return {
        success: true,
        message: 'Wise webhook deleted successfully',
      };

    } catch (error: any) {
      this.logger.error(`Failed to deactivate Wise trigger for workflow ${workflowId}:`, error);

      // Still remove from active triggers even if API call fails
      this.activeTriggers.delete(workflowId);

      return {
        success: false,
        message: 'Failed to deactivate Wise trigger (removed locally)',
      };
    }
  }

  /**
   * Get status of Wise trigger for a workflow
   */
  async getStatus(workflowId: string): Promise<TriggerStatus> {
    const trigger = this.activeTriggers.get(workflowId);

    if (!trigger) {
      return {
        active: false,
        type: TriggerType.WISE,
        message: 'Wise trigger not active',
      };
    }

    // Optionally verify with Wise API
    try {
      const webhooks = await this.listWebhooks(trigger.apiToken, trigger.environment, trigger.profileId);
      const webhook = webhooks.find((w: any) => w.id === trigger.webhookId);

      return {
        active: true,
        type: TriggerType.WISE,
        message: 'Wise trigger active',
        metadata: {
          webhookUrl: trigger.webhookUrl,
          webhookId: trigger.webhookId,
          event: trigger.event,
          triggerName: trigger.triggerName,
          profileId: trigger.profileId,
          environment: trigger.environment,
          activatedAt: trigger.activatedAt,
          webhookExists: !!webhook,
        },
      };
    } catch (error) {
      return {
        active: true,
        type: TriggerType.WISE,
        message: 'Wise trigger active (status check failed)',
        metadata: {
          webhookUrl: trigger.webhookUrl,
          webhookId: trigger.webhookId,
          event: trigger.event,
          activatedAt: trigger.activatedAt,
        },
      };
    }
  }

  /**
   * Get trigger type identifier
   */
  getTriggerType(): TriggerType {
    return TriggerType.WISE;
  }

  /**
   * Check if webhook exists on Wise
   */
  private async checkWebhookExists(
    apiToken: string,
    environment: string,
    profileId: string,
    expectedUrl: string,
    triggerName: string
  ): Promise<{
    exists: boolean;
    webhookId?: string;
    info?: any;
  }> {
    try {
      const webhooks = await this.listWebhooks(apiToken, environment, profileId);

      for (const webhook of webhooks) {
        if (
          webhook.delivery?.url === expectedUrl &&
          webhook.scope?.id === parseInt(profileId) &&
          webhook.trigger_on === triggerName
        ) {
          return {
            exists: true,
            webhookId: webhook.id,
            info: webhook,
          };
        }
      }

      return { exists: false };
    } catch (error) {
      this.logger.error('Failed to check webhook existence:', error);
      return { exists: false };
    }
  }

  /**
   * List webhooks from Wise
   */
  private async listWebhooks(apiToken: string, environment: string, profileId: string): Promise<any[]> {
    const baseUrl = environment === 'live'
      ? 'https://api.transferwise.com'
      : 'https://api.sandbox.transferwise.tech';

    const url = `${baseUrl}/v3/profiles/${profileId}/subscriptions`;

    const response = await axios.get(url, {
      headers: {
        'Authorization': `Bearer ${apiToken}`,
        'Content-Type': 'application/json',
      },
    });

    return response.data;
  }

  /**
   * Create webhook on Wise
   */
  private async createWebhook(
    apiToken: string,
    environment: string,
    profileId: string,
    webhookUrl: string,
    triggerName: string,
  ): Promise<{ success: boolean; error?: string; webhookId?: string; info?: any }> {
    try {
      const baseUrl = environment === 'live'
        ? 'https://api.transferwise.com'
        : 'https://api.sandbox.transferwise.tech';

      const url = `${baseUrl}/v3/profiles/${profileId}/subscriptions`;

      const payload = {
        name: 'Fluxturn Webhook',
        trigger_on: triggerName,
        delivery: {
          version: '2.0.0',
          url: webhookUrl,
        },
      };

      this.logger.debug(`Creating webhook: ${webhookUrl}`, payload);

      const response = await axios.post(url, payload, {
        headers: {
          'Authorization': `Bearer ${apiToken}`,
          'Content-Type': 'application/json',
        },
      });

      return {
        success: true,
        webhookId: response.data.id,
        info: response.data,
      };
    } catch (error: any) {
      this.logger.error('Failed to create webhook:', error);

      let errorMessage = error.message;
      if (error.response?.data?.errors) {
        errorMessage = JSON.stringify(error.response.data.errors);
      }

      return {
        success: false,
        error: errorMessage,
      };
    }
  }

  /**
   * Delete webhook from Wise
   */
  private async deleteWebhook(apiToken: string, environment: string, profileId: string, webhookId: string): Promise<void> {
    try {
      const baseUrl = environment === 'live'
        ? 'https://api.transferwise.com'
        : 'https://api.sandbox.transferwise.tech';

      const url = `${baseUrl}/v3/profiles/${profileId}/subscriptions/${webhookId}`;

      await axios.delete(url, {
        headers: {
          'Authorization': `Bearer ${apiToken}`,
          'Content-Type': 'application/json',
        },
      });

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
    return `${cleanBaseUrl}/api/v1/webhooks/wise/${workflowId}`;
  }

  /**
   * Get Wise trigger name from event
   */
  private getTriggerName(event: string): string {
    const events: Record<string, string> = {
      tranferStateChange: 'transfers#state-change',
      transferActiveCases: 'transfers#active-cases',
      balanceCredit: 'balances#credit',
      balanceUpdate: 'balances#update',
    };
    return events[event] || event;
  }

  /**
   * Get setup instructions for user
   */
  private getSetupInstructions(workflowId: string, webhookUrl: string): any {
    return {
      webhookUrl,
      message: 'Your Wise webhook has been automatically registered!',
      steps: [
        'Your Wise account is now connected and will receive updates at the webhook URL',
        'Webhooks are registered with RSA signature verification for security',
        'Test the webhook by performing an action in your Wise account',
      ],
    };
  }

  /**
   * Validate webhook signature using RSA public key
   */
  validateSignature(workflowId: string, signature: string | undefined, rawBody: string): boolean {
    const trigger = this.activeTriggers.get(workflowId);

    if (!trigger) {
      this.logger.warn(`No active trigger found for workflow ${workflowId}`);
      this.logger.debug(`Active triggers count: ${this.activeTriggers.size}`);
      return false;
    }

    if (!signature) {
      this.logger.warn(`No signature provided for workflow ${workflowId}`);
      return false;
    }

    try {
      const publicKey = trigger.environment === 'live' ? livePublicKey : testPublicKey;

      const verifier = createVerify('RSA-SHA1');
      verifier.update(rawBody);
      const verified = verifier.verify(publicKey, signature, 'base64');

      this.logger.debug(`Signature validation result: ${verified}`);
      return verified;
    } catch (error) {
      this.logger.error('Signature validation error:', error);
      return false;
    }
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
      const crypto = require('crypto');

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
