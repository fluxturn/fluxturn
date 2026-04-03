import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Stripe from 'stripe';
import * as crypto from 'crypto';
import {
  ITriggerService,
  TriggerActivationResult,
  TriggerDeactivationResult,
  TriggerStatus,
  TriggerType,
} from '../../../workflow/interfaces/trigger.interface';
import { PlatformService } from '../../../../database/platform.service';
import {
  createStripeClient,
  STRIPE_API_VERSION,
  DEFAULT_STRIPE_WEBHOOK_EVENTS,
  SUPPORTED_STRIPE_WEBHOOK_EVENTS
} from '../../config/stripe.config';

interface StripeTriggerConfig {
  secretKey?: string;
  events?: string[];
  actionParams?: {
    secretKey?: string;
    events?: string[];
  };
  connectorConfigId?: string;
  credentialId?: string;
}

interface ActiveTrigger {
  secretKey: string;
  webhookUrl: string;
  webhookId: string;
  webhookSecret: string;
  events: string[];
  activatedAt: Date;
  webhookInfo?: any;
}

/**
 * Stripe Trigger Service
 *
 * Manages Stripe webhook registration and lifecycle.
 * Integrates with Stripe API to automatically set up webhooks
 * for receiving payment events, customer events, and other updates.
 *
 * Key Features:
 * - Automatic webhook endpoint registration with Stripe API
 * - Webhook signature verification
 * - Webhook lifecycle management (create, delete)
 * - Support for multiple event types
 */
@Injectable()
export class StripeTriggerService implements ITriggerService, OnModuleInit {
  private readonly logger = new Logger(StripeTriggerService.name);
  private readonly activeTriggers = new Map<string, ActiveTrigger>();

  constructor(
    private readonly configService: ConfigService,
    private readonly platformService: PlatformService
  ) {}

  /**
   * Restore active workflows on module initialization
   */
  async onModuleInit() {
    this.logger.log('Initializing Stripe Trigger Service...');
    try {
      await this.restoreActiveWorkflows();
    } catch (error) {
      this.logger.error('Failed to restore active workflows:', error);
    }
  }

  /**
   * Restore active Stripe workflows from database
   */
  private async restoreActiveWorkflows() {
    try {
      // Query for all active workflows with Stripe triggers
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

          // Find Stripe trigger nodes
          const stripeTriggerNodes = nodes.filter(
            (node: any) => node.type === 'CONNECTOR_TRIGGER' &&
                          node.data?.connectorType === 'stripe'
          );

          if (stripeTriggerNodes.length === 0) {
            continue; // No Stripe triggers in this workflow
          }

          const workflowId = row.id;
          const triggerNode = stripeTriggerNodes[0]; // Use first Stripe trigger
          const triggerConfig = {
            ...triggerNode.data,
            ...triggerNode.data?.actionParams,
            credentialId: triggerNode.data?.credentialId || triggerNode.data?.connectorConfigId
          };

          this.logger.debug(`Restoring Stripe trigger for workflow ${workflowId}`);

          // Re-activate the trigger
          const activationResult = await this.activate(workflowId, triggerConfig);

          if (activationResult.success) {
            restoredCount++;
            this.logger.log(`✅ Restored Stripe trigger for workflow ${workflowId}`);
          } else {
            this.logger.warn(`❌ Failed to restore workflow ${workflowId}: ${activationResult.message}`);
          }
        } catch (error) {
          this.logger.error(`Error restoring workflow ${row.id}:`, error.message);
        }
      }

      if (restoredCount > 0) {
        this.logger.log(`Successfully restored ${restoredCount} Stripe workflow(s)`);
      } else {
        this.logger.log('No active Stripe workflows to restore');
      }
    } catch (error) {
      this.logger.error('Failed to restore active workflows:', error);
      throw error;
    }
  }

  /**
   * Activate Stripe webhook for a workflow
   */
  async activate(workflowId: string, triggerConfig: StripeTriggerConfig): Promise<TriggerActivationResult> {
    try {
      this.logger.log(`Activating Stripe trigger for workflow ${workflowId}`);
      this.logger.debug(`Trigger config: ${JSON.stringify(triggerConfig)}`);

      // Extract secret key from config - check multiple possible locations
      let secretKey =
        triggerConfig.secretKey ||
        triggerConfig.actionParams?.secretKey;

      // If no direct secret key, check for credential ID
      const credentialId = triggerConfig.credentialId || triggerConfig.connectorConfigId;

      if (!secretKey && credentialId) {
        this.logger.log(`Fetching secret key from credential: ${credentialId}`);
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

                secretKey = decryptedCredentials.secretKey || decryptedCredentials.secret_key || decryptedCredentials.apiKey;
                this.logger.log(`Secret key ${secretKey ? 'found' : 'not found'} in decrypted credentials`);
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
              secretKey = credentials?.secretKey || credentials?.secret_key || credentials?.apiKey;
              this.logger.log(`Secret key ${secretKey ? 'found' : 'not found'} in plain credentials`);
            }
          } else {
            this.logger.warn(`Credential ${credentialId} not found in database`);
          }
        } catch (error) {
          this.logger.error(`Failed to fetch credential ${credentialId}:`, error);
          return {
            success: false,
            message: 'Failed to fetch secret key from credential',
            error: error.message,
          };
        }
      }

      if (!secretKey) {
        this.logger.error(`No secret key found. credentialId: ${credentialId}, direct key: ${!!triggerConfig.secretKey}`);
        return {
          success: false,
          message: 'Secret key is required for Stripe trigger',
          error: 'Missing secret key in trigger configuration. Please select a credential or enter secret key directly.',
        };
      }

      // Initialize Stripe client
      const stripe = createStripeClient(secretKey);

      // Generate webhook URL
      const webhookUrl = this.generateWebhookUrl(workflowId);

      // Extract allowed events
      const events = triggerConfig.events || triggerConfig.actionParams?.events || [];
      const enabledEvents = this.prepareEnabledEvents(events);

      // Check if webhook endpoint already exists for this URL
      const existingWebhooks = await stripe.webhookEndpoints.list({ limit: 100 });
      const existingWebhook = existingWebhooks.data.find(wh => wh.url === webhookUrl);

      if (existingWebhook) {
        this.logger.log(`Webhook endpoint already exists for workflow ${workflowId}`);

        // Store in active triggers
        this.activeTriggers.set(workflowId, {
          secretKey,
          webhookUrl,
          webhookId: existingWebhook.id,
          webhookSecret: existingWebhook.secret,
          events: enabledEvents,
          activatedAt: new Date(),
          webhookInfo: existingWebhook,
        });

        return {
          success: true,
          message: 'Stripe webhook already registered',
          data: {
            webhookUrl,
            webhookId: existingWebhook.id,
            webhookSecret: existingWebhook.secret,
            enabledEvents,
            webhookInfo: existingWebhook,
            alreadyRegistered: true,
          },
        };
      }

      // Create webhook endpoint with Stripe API
      this.logger.log(`Creating webhook endpoint: ${webhookUrl}`);
      this.logger.log(`Enabled events: ${enabledEvents.join(', ')}`);

      const webhookEndpoint = await stripe.webhookEndpoints.create({
        url: webhookUrl,
        enabled_events: enabledEvents as Stripe.WebhookEndpointCreateParams.EnabledEvent[],
        description: `Fluxturn Workflow - ${workflowId}`,
        api_version: STRIPE_API_VERSION,
      });

      // Store trigger state
      this.activeTriggers.set(workflowId, {
        secretKey,
        webhookUrl,
        webhookId: webhookEndpoint.id,
        webhookSecret: webhookEndpoint.secret,
        events: enabledEvents,
        activatedAt: new Date(),
        webhookInfo: webhookEndpoint,
      });

      this.logger.log(`✅ Stripe trigger activated successfully for workflow ${workflowId}`);
      this.logger.log(`Webhook ID: ${webhookEndpoint.id}`);
      this.logger.log(`Webhook Secret: ${webhookEndpoint.secret.substring(0, 15)}...`);

      return {
        success: true,
        message: 'Stripe webhook registered successfully',
        data: {
          webhookUrl,
          webhookId: webhookEndpoint.id,
          webhookSecret: webhookEndpoint.secret,
          enabledEvents,
          webhookInfo: webhookEndpoint,
          setupInstructions: this.getSetupInstructions(workflowId, webhookUrl, webhookEndpoint.id),
        },
      };

    } catch (error: any) {
      this.logger.error(`Failed to activate Stripe trigger for workflow ${workflowId}:`, error);
      return {
        success: false,
        message: 'Failed to activate Stripe trigger',
        error: error.message || 'Unknown error occurred',
      };
    }
  }

  /**
   * Deactivate Stripe webhook for a workflow
   */
  async deactivate(workflowId: string): Promise<TriggerDeactivationResult> {
    try {
      this.logger.log(`Deactivating Stripe trigger for workflow ${workflowId}`);

      const trigger = this.activeTriggers.get(workflowId);

      if (!trigger) {
        this.logger.warn(`No active Stripe trigger found for workflow ${workflowId}`);
        return {
          success: true,
          message: 'No active Stripe trigger found',
        };
      }

      // Initialize Stripe client
      const stripe = createStripeClient(trigger.secretKey);

      // Delete webhook endpoint from Stripe
      await stripe.webhookEndpoints.del(trigger.webhookId);

      // Remove from active triggers
      this.activeTriggers.delete(workflowId);

      this.logger.log(`✅ Stripe trigger deactivated successfully for workflow ${workflowId}`);

      return {
        success: true,
        message: 'Stripe webhook deleted successfully',
      };

    } catch (error: any) {
      this.logger.error(`Failed to deactivate Stripe trigger for workflow ${workflowId}:`, error);

      // Still remove from active triggers even if API call fails
      this.activeTriggers.delete(workflowId);

      return {
        success: false,
        message: 'Failed to deactivate Stripe trigger (removed locally)',
      };
    }
  }

  /**
   * Get status of Stripe trigger for a workflow
   */
  async getStatus(workflowId: string): Promise<TriggerStatus> {
    const trigger = this.activeTriggers.get(workflowId);

    if (!trigger) {
      return {
        active: false,
        type: TriggerType.STRIPE,
        message: 'Stripe trigger not active',
      };
    }

    // Optionally verify with Stripe API
    try {
      const stripe = createStripeClient(trigger.secretKey);

      const webhookEndpoint = await stripe.webhookEndpoints.retrieve(trigger.webhookId);

      return {
        active: true,
        type: TriggerType.STRIPE,
        message: 'Stripe trigger active',
        metadata: {
          webhookUrl: trigger.webhookUrl,
          webhookId: trigger.webhookId,
          enabledEvents: trigger.events,
          activatedAt: trigger.activatedAt,
          status: webhookEndpoint.status,
        },
      };
    } catch (error) {
      return {
        active: true,
        type: TriggerType.STRIPE,
        message: 'Stripe trigger active (status check failed)',
        metadata: {
          webhookUrl: trigger.webhookUrl,
          webhookId: trigger.webhookId,
          enabledEvents: trigger.events,
          activatedAt: trigger.activatedAt,
        },
      };
    }
  }

  /**
   * Get trigger type identifier
   */
  getTriggerType(): TriggerType {
    return TriggerType.STRIPE;
  }

  /**
   * Generate webhook URL for workflow
   */
  private generateWebhookUrl(workflowId: string): string {
    const baseUrl = this.configService.get<string>('APP_URL') || 'http://localhost:3000';
    const cleanBaseUrl = baseUrl.replace(/\/$/, ''); // Remove trailing slash
    return `${cleanBaseUrl}/api/v1/webhooks/stripe/${workflowId}`;
  }

  /**
   * Prepare enabled events array
   * If '*' or empty, return all common events
   */
  private prepareEnabledEvents(events: string[]): string[] {
    if (!events || events.length === 0 || events.includes('*')) {
      // Return default Stripe events from centralized config
      return [...DEFAULT_STRIPE_WEBHOOK_EVENTS];
    }

    // Filter events against supported event types from centralized config
    return events.filter(event => SUPPORTED_STRIPE_WEBHOOK_EVENTS.includes(event as any));
  }

  /**
   * Get setup instructions for user
   */
  private getSetupInstructions(workflowId: string, webhookUrl: string, webhookId: string): any {
    return {
      webhookUrl,
      webhookId,
      message: '✅ Your Stripe webhook has been automatically registered!',
      steps: [
        'Your Stripe account is now connected and will receive events at the webhook URL',
        'The webhook endpoint was created in your Stripe Dashboard',
        'Test the webhook by creating a test event in Stripe Dashboard',
        'View webhook logs in Stripe Dashboard > Developers > Webhooks',
      ],
      verifyInstructions: 'You can verify this webhook in your Stripe Dashboard under Developers > Webhooks',
    };
  }

  /**
   * Validate webhook signature
   */
  validateWebhookSignature(
    workflowId: string,
    payload: string | Buffer,
    signature: string | undefined
  ): { valid: boolean; event?: Stripe.Event; error?: string } {
    const trigger = this.activeTriggers.get(workflowId);

    if (!trigger) {
      this.logger.warn(`No active trigger found for workflow ${workflowId}`);
      return { valid: false, error: 'No active trigger found' };
    }

    if (!signature) {
      this.logger.warn(`No signature provided for workflow ${workflowId}`);
      return { valid: false, error: 'No signature provided' };
    }

    try {
      // Initialize Stripe client
      const stripe = createStripeClient(trigger.secretKey);

      // Verify webhook signature
      const event = stripe.webhooks.constructEvent(
        payload,
        signature,
        trigger.webhookSecret
      );

      this.logger.log(`✅ Valid webhook signature for workflow ${workflowId}, event: ${event.type}`);
      return { valid: true, event };
    } catch (error: any) {
      this.logger.error(`❌ Invalid webhook signature for workflow ${workflowId}:`, error.message);
      return { valid: false, error: error.message };
    }
  }

  /**
   * Get webhook secret for a workflow (for manual verification)
   */
  getWebhookSecret(workflowId: string): string | undefined {
    const trigger = this.activeTriggers.get(workflowId);
    return trigger?.webhookSecret;
  }

  /**
   * Decrypt credential config using the same method as ConnectorsService
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
      this.logger.error('Failed to decrypt credential config:', error);
      throw error;
    }
  }
}
