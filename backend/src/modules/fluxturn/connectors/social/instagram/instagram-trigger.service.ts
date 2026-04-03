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

interface InstagramTriggerConfig {
  accessToken?: string;
  access_token?: string;
  appSecret?: string;
  appId?: string;
  verifyToken?: string;
  triggerId?: string; // new_media, new_comment, new_mention
  instagramAccountId?: string;
  instagram_account_id?: string;
  actionParams?: {
    accessToken?: string;
    appSecret?: string;
    appId?: string;
    triggerId?: string;
    instagramAccountId?: string;
  };
  connectorConfigId?: string;
  credentialId?: string;
}

interface ActiveTrigger {
  accessToken: string;
  appSecret?: string;
  appId: string;
  verifyToken: string;
  webhookUrl: string;
  subscriptions: string[];
  triggerId: string;
  instagramAccountId: string;
  activatedAt: Date;
  webhookInfo?: any;
}

/**
 * Instagram Trigger Service
 *
 * Manages Instagram webhook subscription and lifecycle using Facebook Graph API.
 * Instagram Business accounts use Facebook's webhook infrastructure.
 *
 * Key Features:
 * - Automatic webhook subscription with Facebook Graph API
 * - Support for new_media, new_comment, and new_mention triggers
 * - Access token and app secret management
 * - Verify token generation and validation
 * - Webhook lifecycle management
 * - Signature verification using app secret
 *
 * Instagram Webhook Flow:
 * 1. Verification (GET): Facebook sends hub.mode, hub.challenge, hub.verify_token
 * 2. Subscription: Subscribe to webhook fields using Graph API
 * 3. Event Reception (POST): Facebook sends events with X-Hub-Signature-256 header
 *
 * Supported Triggers:
 * - new_media: Triggered when new media is published
 * - new_comment: Triggered when a new comment is received
 * - new_mention: Triggered when mentioned in a comment or caption
 */
@Injectable()
export class InstagramTriggerService implements ITriggerService, OnModuleInit {
  private readonly logger = new Logger(InstagramTriggerService.name);
  private readonly activeTriggers = new Map<string, ActiveTrigger>();
  private readonly baseUrl = 'https://graph.facebook.com/v18.0';

  constructor(
    private readonly configService: ConfigService,
    private readonly platformService: PlatformService
  ) {}

  /**
   * Restore active workflows on module initialization
   */
  async onModuleInit() {
    this.logger.log('Initializing Instagram Trigger Service...');
    try {
      await this.restoreActiveWorkflows();
    } catch (error) {
      this.logger.error('Failed to restore active workflows:', error);
    }
  }

  /**
   * Restore active Instagram workflows from database
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

          // Find Instagram trigger nodes
          const instagramTriggerNodes = nodes.filter(
            (node: any) => node.type === 'CONNECTOR_TRIGGER' &&
                          node.data?.connectorType === 'instagram'
          );

          if (instagramTriggerNodes.length === 0) {
            continue;
          }

          const workflowId = row.id;
          const triggerNode = instagramTriggerNodes[0];
          const triggerConfig = {
            ...triggerNode.data,
            ...triggerNode.data?.actionParams,
            credentialId: triggerNode.data?.credentialId || triggerNode.data?.connectorConfigId
          };

          this.logger.debug(`Restoring Instagram trigger for workflow ${workflowId}`);

          const activationResult = await this.activate(workflowId, triggerConfig);

          if (activationResult.success) {
            restoredCount++;
            this.logger.log(`Restored Instagram trigger for workflow ${workflowId}`);
          } else {
            this.logger.warn(`Failed to restore workflow ${workflowId}: ${activationResult.message}`);
          }
        } catch (error) {
          this.logger.error(`Error restoring workflow ${row.id}:`, error.message);
        }
      }

      if (restoredCount > 0) {
        this.logger.log(`Successfully restored ${restoredCount} Instagram workflow(s)`);
      } else {
        this.logger.log('No active Instagram workflows to restore');
      }
    } catch (error) {
      this.logger.error('Failed to restore active workflows:', error);
      throw error;
    }
  }

  /**
   * Activate Instagram webhook for a workflow
   */
  async activate(workflowId: string, triggerConfig: InstagramTriggerConfig): Promise<TriggerActivationResult> {
    try {
      this.logger.log(`Activating Instagram trigger for workflow ${workflowId}`);
      this.logger.debug(`Trigger config: ${JSON.stringify(triggerConfig)}`);

      // Extract app ID from trigger config
      let appId =
        triggerConfig.appId ||
        triggerConfig.actionParams?.appId;

      // Extract credentials
      let accessToken =
        triggerConfig.accessToken ||
        triggerConfig.access_token ||
        triggerConfig.actionParams?.accessToken;

      let appSecret =
        triggerConfig.appSecret ||
        triggerConfig.actionParams?.appSecret;

      let instagramAccountId =
        triggerConfig.instagramAccountId ||
        triggerConfig.instagram_account_id ||
        triggerConfig.actionParams?.instagramAccountId;

      // If no direct token, check for credential ID
      const credentialId = triggerConfig.credentialId || triggerConfig.connectorConfigId;

      if ((!accessToken || !instagramAccountId) && credentialId) {
        this.logger.log(`Fetching access token from credential: ${credentialId}`);
        try {
          const credentialQuery = `
            SELECT credentials FROM connector_configs
            WHERE id = $1
          `;
          const result = await this.platformService.query(credentialQuery, [credentialId]);

          if (result.rows.length > 0) {
            const credentials = result.rows[0].credentials;
            this.logger.debug(`Credential data (encrypted): ${JSON.stringify(credentials)}`);

            if (credentials && credentials.iv && (credentials.data || credentials.encrypted) && credentials.authTag) {
              this.logger.log('Credentials are encrypted, decrypting...');

              try {
                const decryptedCredentials = this.decryptCredentialConfig(credentials);
                this.logger.debug(`Decrypted credentials keys: ${Object.keys(decryptedCredentials).join(', ')}`);

                accessToken = accessToken || decryptedCredentials.accessToken ||
                             decryptedCredentials.access_token;
                appSecret = appSecret || decryptedCredentials.appSecret ||
                           decryptedCredentials.app_secret;
                appId = appId || decryptedCredentials.appId ||
                       decryptedCredentials.app_id;
                instagramAccountId = instagramAccountId ||
                                    decryptedCredentials.instagramAccountId ||
                                    decryptedCredentials.instagram_account_id;

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
              this.logger.debug(`Credentials keys (plain): ${credentials ? Object.keys(credentials).join(', ') : 'null'}`);
              accessToken = accessToken || credentials?.accessToken ||
                           credentials?.access_token;
              appSecret = appSecret || credentials?.appSecret ||
                         credentials?.app_secret;
              appId = appId || credentials?.appId || credentials?.app_id;
              instagramAccountId = instagramAccountId ||
                                  credentials?.instagramAccountId ||
                                  credentials?.instagram_account_id;
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
        this.logger.error(`No access token found. credentialId: ${credentialId}`);
        return {
          success: false,
          message: 'Access token is required for Instagram trigger',
          error: 'Missing access token in trigger configuration. Please select a credential or enter token directly.',
        };
      }

      if (!appId) {
        this.logger.error(`No app ID found. credentialId: ${credentialId}`);
        return {
          success: false,
          message: 'App ID is required for Instagram trigger',
          error: 'Missing App ID in trigger configuration. Please enter your Facebook App ID in the trigger settings.',
        };
      }

      if (!instagramAccountId) {
        this.logger.error(`No Instagram account ID found. credentialId: ${credentialId}`);
        return {
          success: false,
          message: 'Instagram account ID is required for Instagram trigger',
          error: 'Missing Instagram account ID in trigger configuration.',
        };
      }

      this.logger.log(`Using App ID: ${appId.substring(0, 8)}... (from trigger config)`);

      // Generate or use existing verify token
      const verifyToken = this.generateVerifyToken(workflowId);

      // Get trigger ID and map to subscriptions
      const triggerId = triggerConfig.triggerId ||
                       triggerConfig.actionParams?.triggerId ||
                       'new_media';

      // Map trigger ID to Instagram subscription fields
      const subscriptions = this.getSubscriptionsForTrigger(triggerId);

      this.logger.log(`Subscribing to Instagram fields: ${subscriptions.join(', ')} for trigger: ${triggerId}`);

      // Build webhook URL
      const appUrl = this.configService.get<string>('APP_URL');
      if (!appUrl) {
        return {
          success: false,
          message: 'APP_URL not configured in environment',
          error: 'APP_URL environment variable is required',
        };
      }

      const webhookUrl = `${appUrl}/api/v1/webhooks/instagram/${workflowId}`;

      // Subscribe to webhooks using Graph API
      try {
        const subscriptionResult = await this.subscribeToWebhook(
          appId,
          accessToken,
          webhookUrl,
          subscriptions,
          verifyToken
        );

        this.logger.log(`Webhook subscription successful`);
        this.logger.debug(`Subscription result: ${JSON.stringify(subscriptionResult)}`);

        // Store activation info
        this.activeTriggers.set(workflowId, {
          accessToken,
          appSecret,
          appId,
          verifyToken,
          webhookUrl,
          subscriptions,
          triggerId,
          instagramAccountId,
          activatedAt: new Date(),
          webhookInfo: subscriptionResult,
        });

        this.logger.log(`Instagram trigger activated successfully for workflow ${workflowId}`);

        return {
          success: true,
          message: 'Instagram webhook activated successfully',
          data: {
            webhookUrl,
            verifyToken,
            triggerId,
            subscriptions,
            ...this.getSetupInstructions(workflowId, webhookUrl, verifyToken),
          },
        };

      } catch (error: any) {
        this.logger.error('Failed to subscribe to webhook:', error.message);
        this.logger.error('Instagram API Error Response:', JSON.stringify(error.response?.data, null, 2));

        const errorMessage = error.response?.data?.error?.message || error.message;
        const errorCode = error.response?.data?.error?.code;

        // Provide helpful error messages for common issues
        let helpfulMessage = errorMessage;
        if (errorCode === 200) {
          helpfulMessage = `Permission Error: Your access token doesn't have the required Instagram permissions. Please generate a new token with the required permissions.`;
        } else if (errorCode === 100) {
          helpfulMessage = `Invalid parameter. Please check that your Instagram account is a Business or Creator account.`;
        }

        return {
          success: false,
          message: 'Failed to subscribe to Instagram webhook',
          error: helpfulMessage,
        };
      }

    } catch (error: any) {
      this.logger.error(`Error activating Instagram trigger for workflow ${workflowId}:`, error);
      return {
        success: false,
        message: 'Failed to activate Instagram trigger',
        error: error.message,
      };
    }
  }

  /**
   * Map trigger ID to Instagram subscription fields
   */
  private getSubscriptionsForTrigger(triggerId: string): string[] {
    switch (triggerId) {
      case 'new_media':
        return ['media'];
      case 'new_comment':
        return ['comments'];
      case 'new_mention':
        return ['mentions'];
      default:
        // Default to media for unknown trigger types
        return ['media'];
    }
  }

  /**
   * Subscribe to Instagram webhook using app-level subscription
   */
  private async subscribeToWebhook(
    appId: string,
    accessToken: string,
    callbackUrl: string,
    subscriptions: string[],
    verifyToken: string
  ): Promise<any> {
    // Use app-level subscription endpoint
    const subscribeUrl = `${this.baseUrl}/${appId}/subscriptions`;

    this.logger.debug(`Subscribing to webhook with fields: ${subscriptions.join(', ')}`);
    this.logger.debug(`Callback URL: ${callbackUrl}`);

    const response = await axios.post(
      subscribeUrl,
      {
        object: 'instagram',
        callback_url: callbackUrl,
        fields: subscriptions.join(','),
        verify_token: verifyToken,
        access_token: accessToken,
      }
    );

    return response.data;
  }

  /**
   * Deactivate Instagram webhook
   */
  async deactivate(workflowId: string): Promise<TriggerDeactivationResult> {
    try {
      this.logger.log(`Deactivating Instagram trigger for workflow ${workflowId}`);

      const trigger = this.activeTriggers.get(workflowId);

      if (!trigger) {
        return {
          success: true,
          message: 'Instagram trigger was not active',
        };
      }

      // Unsubscribe from webhook
      try {
        await this.unsubscribeFromWebhook(trigger.appId, trigger.accessToken);
        this.logger.log('Unsubscribed from Instagram webhook');
      } catch (error: any) {
        this.logger.warn('Failed to unsubscribe from webhook:', error.message);
      }

      // Remove from active triggers
      this.activeTriggers.delete(workflowId);

      this.logger.log(`Instagram trigger deactivated for workflow ${workflowId}`);

      return {
        success: true,
        message: 'Instagram trigger deactivated successfully',
      };

    } catch (error: any) {
      this.logger.error(`Error deactivating Instagram trigger:`, error);
      return {
        success: false,
        message: 'Failed to deactivate Instagram trigger',
      };
    }
  }

  /**
   * Unsubscribe from Instagram webhook using app-level endpoint
   */
  private async unsubscribeFromWebhook(appId: string, accessToken: string): Promise<void> {
    const unsubscribeUrl = `${this.baseUrl}/${appId}/subscriptions`;

    await axios.delete(unsubscribeUrl, {
      params: {
        object: 'instagram',
        access_token: accessToken,
      },
    });
  }

  /**
   * Get trigger status
   */
  async getStatus(workflowId: string): Promise<TriggerStatus> {
    const trigger = this.activeTriggers.get(workflowId);

    return {
      active: !!trigger,
      type: TriggerType.INSTAGRAM,
      message: trigger
        ? `Active - Webhook URL: ${trigger.webhookUrl}`
        : 'Not active',
      metadata: trigger
        ? {
            webhookUrl: trigger.webhookUrl,
            triggerId: trigger.triggerId,
            subscriptions: trigger.subscriptions,
            instagramAccountId: trigger.instagramAccountId,
            activatedAt: trigger.activatedAt,
          }
        : undefined,
    };
  }

  /**
   * Get trigger type
   */
  getTriggerType(): TriggerType {
    return TriggerType.INSTAGRAM;
  }

  /**
   * Generate verify token for webhook verification
   * Note: This is deterministic (no timestamp) so it remains consistent across restarts
   */
  private generateVerifyToken(workflowId: string): string {
    return crypto
      .createHash('sha256')
      .update(`fluxturn_instagram_${workflowId}`)
      .digest('hex')
      .substring(0, 32);
  }

  /**
   * Validate verify token
   */
  validateVerifyToken(workflowId: string, providedToken: string | undefined): boolean {
    const trigger = this.activeTriggers.get(workflowId);

    if (!trigger) {
      this.logger.warn(`No active trigger found for workflow ${workflowId}`);
      this.logger.debug(`Active triggers count: ${this.activeTriggers.size}`);
      return false;
    }

    if (!providedToken) {
      this.logger.warn(`No verify token provided for workflow ${workflowId}`);
      return false;
    }

    this.logger.debug(`Expected token (first 10 chars): ${trigger.verifyToken.substring(0, 10)}...`);
    this.logger.debug(`Provided token (first 10 chars): ${providedToken.substring(0, 10)}...`);

    const isValid = trigger.verifyToken === providedToken;
    this.logger.debug(`Token validation result: ${isValid}`);

    return isValid;
  }

  /**
   * Verify webhook signature
   */
  validateSignature(payload: string, signature: string | undefined, workflowId: string): boolean {
    const trigger = this.activeTriggers.get(workflowId);

    if (!trigger || !trigger.appSecret) {
      this.logger.warn(`No app secret found for workflow ${workflowId}`);
      return true; // Allow if no app secret configured
    }

    if (!signature || !signature.startsWith('sha256=')) {
      this.logger.warn('Invalid signature format');
      return false;
    }

    const signatureHash = signature.split('sha256=')[1];
    const expectedHash = crypto
      .createHmac('sha256', trigger.appSecret)
      .update(payload)
      .digest('hex');

    try {
      return crypto.timingSafeEqual(
        Buffer.from(signatureHash),
        Buffer.from(expectedHash)
      );
    } catch (error) {
      this.logger.error('Signature validation error:', error);
      return false;
    }
  }

  /**
   * Get active trigger info
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

  /**
   * Get setup instructions for user
   */
  private getSetupInstructions(workflowId: string, webhookUrl: string, verifyToken: string): any {
    return {
      steps: [
        '1. Go to Facebook App Dashboard -> Webhooks',
        `2. Add webhook URL: ${webhookUrl}`,
        `3. Enter Verify Token: ${verifyToken}`,
        '4. Subscribe to Instagram fields (comments, mentions, media)',
        '5. Ensure your access token has necessary Instagram permissions',
      ],
      note: 'Instagram webhooks are managed through Facebook App Dashboard',
      webhookUrl,
      verifyToken,
    };
  }

  /**
   * Process incoming webhook event
   */
  processWebhookEvent(workflowId: string, event: any): any {
    const trigger = this.activeTriggers.get(workflowId);

    if (!trigger) {
      this.logger.warn(`No active trigger found for webhook event on workflow ${workflowId}`);
      return null;
    }

    // Transform Instagram webhook event to normalized format
    const entry = event.entry?.[0];
    if (!entry) {
      return null;
    }

    const changes = entry.changes?.[0];
    if (!changes) {
      return null;
    }

    const field = changes.field;
    const value = changes.value;

    // Map to output schema based on trigger type
    switch (trigger.triggerId) {
      case 'new_media':
        return {
          id: value.id || value.media_id,
          media_type: value.media_type,
          media_url: value.media_url,
          caption: value.caption,
          timestamp: value.timestamp || new Date().toISOString(),
        };

      case 'new_comment':
        return {
          id: value.id,
          text: value.text,
          from: {
            id: value.from?.id,
            username: value.from?.username,
          },
          media_id: value.media_id,
          timestamp: value.created_time || new Date().toISOString(),
        };

      case 'new_mention':
        return {
          id: value.id,
          text: value.text,
          from: {
            id: value.from?.id,
            username: value.from?.username,
          },
          media_id: value.media_id,
          timestamp: value.timestamp || new Date().toISOString(),
        };

      default:
        return value;
    }
  }
}
