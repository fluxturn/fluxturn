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

interface FacebookTriggerConfig {
  pageAccessToken?: string;
  appSecret?: string;
  appId?: string;
  verifyToken?: string;
  subscriptions?: string[]; // feed, messages, etc.
  eventType?: string; // messages, feed, etc.
  triggerId?: string; // page_message_received, page_post_created, etc.
  actionParams?: {
    pageAccessToken?: string;
    appSecret?: string;
    appId?: string;
    verifyToken?: string;
    subscriptions?: string[];
  };
  connectorConfigId?: string;
  credentialId?: string;
}

interface ActiveTrigger {
  pageAccessToken: string;
  appSecret?: string;
  appId: string;
  verifyToken: string;
  webhookUrl: string;
  subscriptions: string[];
  activatedAt: Date;
  webhookInfo?: any;
}

/**
 * Facebook Trigger Service
 *
 * Manages Facebook Graph API webhook subscription and lifecycle.
 * Integrates with Facebook Graph API to automatically set up webhooks
 * for receiving page events (feed, comments, messages, etc.).
 *
 * Key Features:
 * - Automatic webhook subscription with Facebook Graph API
 * - Page access token and app secret management
 * - Verify token generation and validation
 * - Webhook lifecycle management
 * - Support for multiple subscription types
 * - Signature verification using app secret
 *
 * Facebook Webhook Flow:
 * 1. Verification (GET): Facebook sends hub.mode, hub.challenge, hub.verify_token
 * 2. Subscription: Subscribe to webhook fields using Graph API
 * 3. Event Reception (POST): Facebook sends events with X-Hub-Signature-256 header
 */
@Injectable()
export class FacebookTriggerService implements ITriggerService, OnModuleInit {
  private readonly logger = new Logger(FacebookTriggerService.name);
  private readonly activeTriggers = new Map<string, ActiveTrigger>();

  constructor(
    private readonly configService: ConfigService,
    private readonly platformService: PlatformService
  ) {}

  /**
   * Restore active workflows on module initialization
   */
  async onModuleInit() {
    this.logger.log('Initializing Facebook Trigger Service...');
    try {
      await this.restoreActiveWorkflows();
    } catch (error) {
      this.logger.error('Failed to restore active workflows:', error);
    }
  }

  /**
   * Restore active Facebook workflows from database
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

          // Find Facebook/Instagram trigger nodes
          const facebookTriggerNodes = nodes.filter(
            (node: any) => node.type === 'CONNECTOR_TRIGGER' &&
                          (node.data?.connectorType === 'facebook' ||
                           node.data?.connectorType === 'facebook_graph' ||
                           node.data?.triggerId?.startsWith('instagram_'))
          );

          if (facebookTriggerNodes.length === 0) {
            continue;
          }

          const workflowId = row.id;
          const triggerNode = facebookTriggerNodes[0];
          const triggerConfig = {
            ...triggerNode.data,
            ...triggerNode.data?.actionParams,
            credentialId: triggerNode.data?.credentialId || triggerNode.data?.connectorConfigId
          };

          this.logger.debug(`Restoring Facebook trigger for workflow ${workflowId}`);

          const result = await this.activate(workflowId, triggerConfig);

          if (result.success) {
            restoredCount++;
            this.logger.log(`✅ Restored Facebook trigger for workflow ${workflowId}`);
          } else {
            this.logger.warn(`❌ Failed to restore workflow ${workflowId}: ${result.message}`);
          }
        } catch (error) {
          this.logger.error(`Error restoring workflow ${row.id}:`, error.message);
        }
      }

      if (restoredCount > 0) {
        this.logger.log(`Successfully restored ${restoredCount} Facebook workflow(s)`);
      } else {
        this.logger.log('No active Facebook workflows to restore');
      }
    } catch (error) {
      this.logger.error('Failed to restore active workflows:', error);
      throw error;
    }
  }

  /**
   * Activate Facebook webhook for a workflow
   */
  async activate(workflowId: string, triggerConfig: FacebookTriggerConfig): Promise<TriggerActivationResult> {
    try {
      this.logger.log(`Activating Facebook trigger for workflow ${workflowId}`);
      this.logger.debug(`Trigger config: ${JSON.stringify(triggerConfig)}`);

      // Extract appId from trigger config (comes from inputSchema)
      let appId =
        triggerConfig.appId ||
        triggerConfig.actionParams?.appId;

      // Extract credentials
      let pageAccessToken =
        triggerConfig.pageAccessToken ||
        triggerConfig.actionParams?.pageAccessToken;

      let appSecret =
        triggerConfig.appSecret ||
        triggerConfig.actionParams?.appSecret;

      // If no direct token, check for credential ID
      const credentialId = triggerConfig.credentialId || triggerConfig.connectorConfigId;

      if (!pageAccessToken && credentialId) {
        this.logger.log(`Fetching page access token from credential: ${credentialId}`);
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

                pageAccessToken = decryptedCredentials.pageAccessToken ||
                                 decryptedCredentials.accessToken ||
                                 decryptedCredentials.access_token;
                appSecret = appSecret || decryptedCredentials.appSecret || decryptedCredentials.app_secret;

                this.logger.log(`Page access token ${pageAccessToken ? 'found' : 'not found'} in decrypted credentials`);
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
              pageAccessToken = credentials?.pageAccessToken || credentials?.accessToken || credentials?.access_token;
              appSecret = appSecret || credentials?.appSecret || credentials?.app_secret;
              this.logger.log(`Page access token ${pageAccessToken ? 'found' : 'not found'} in plain credentials`);
            }
          } else {
            this.logger.warn(`Credential ${credentialId} not found in database`);
          }
        } catch (error) {
          this.logger.error(`Failed to fetch credential ${credentialId}:`, error);
          return {
            success: false,
            message: 'Failed to fetch page access token from credential',
            error: error.message,
          };
        }
      }

      if (!pageAccessToken) {
        this.logger.error(`No page access token found. credentialId: ${credentialId}`);
        return {
          success: false,
          message: 'Page access token is required for Facebook trigger',
          error: 'Missing page access token in trigger configuration. Please select a credential or enter token directly.',
        };
      }

      if (!appId) {
        this.logger.error(`No app ID found. credentialId: ${credentialId}`);
        return {
          success: false,
          message: 'App ID is required for Facebook/Instagram trigger',
          error: 'Missing App ID in trigger configuration. Please enter your Facebook App ID in the trigger settings.',
        };
      }

      this.logger.log(`Using App ID: ${appId.substring(0, 8)}... (from trigger config)`);

      // Generate or use existing verify token
      const verifyToken = this.generateVerifyToken(workflowId);

      // Get subscriptions based on trigger type
      // Note: 'comments' is not a valid subscription field - use 'feed' for posts/comments
      let subscriptions = triggerConfig.subscriptions ||
                         triggerConfig.actionParams?.subscriptions;

      // If no explicit subscriptions, determine based on event type or trigger ID
      if (!subscriptions) {
        const eventType = triggerConfig.eventType;
        const triggerId = triggerConfig.triggerId;

        // Instagram event types
        if (eventType === 'instagram_comment' || triggerId?.includes('instagram_comment')) {
          subscriptions = ['comments'];
        } else if (eventType === 'instagram_mention' || triggerId?.includes('instagram_mention')) {
          subscriptions = ['mentions'];
        } else if (eventType === 'instagram_story_mention' || triggerId?.includes('instagram_story_mention')) {
          subscriptions = ['story_mentions'];
        } else if (eventType === 'instagram_media_published' || triggerId?.includes('instagram_media')) {
          subscriptions = ['media'];
        }
        // Facebook page event types
        else if (eventType === 'messages' || triggerId?.includes('message')) {
          subscriptions = ['messages'];
        } else if (eventType === 'feed' || triggerId?.includes('post') || triggerId?.includes('feed')) {
          subscriptions = ['feed'];
        } else {
          // Default to feed only (most common and usually has permissions)
          subscriptions = ['feed'];
        }
      }

      this.logger.log(`Subscribing to Facebook fields: ${subscriptions.join(', ')}`);

      // Build webhook URL
      const appUrl = this.configService.get<string>('APP_URL');
      if (!appUrl) {
        return {
          success: false,
          message: 'APP_URL not configured in environment',
          error: 'APP_URL environment variable is required',
        };
      }

      const webhookUrl = `${appUrl}/api/v1/webhooks/facebook/${workflowId}`;

      // Subscribe to webhooks using Graph API
      try {
        const subscriptionResult = await this.subscribeToWebhook(
          appId,
          pageAccessToken,
          webhookUrl,
          subscriptions,
          verifyToken
        );

        this.logger.log(`Webhook subscription successful`);
        this.logger.debug(`Subscription result: ${JSON.stringify(subscriptionResult)}`);

        // Store activation info
        this.activeTriggers.set(workflowId, {
          pageAccessToken,
          appSecret,
          appId,
          verifyToken,
          webhookUrl,
          subscriptions,
          activatedAt: new Date(),
          webhookInfo: subscriptionResult,
        });

        this.logger.log(`✅ Facebook trigger activated successfully for workflow ${workflowId}`);

        return {
          success: true,
          message: 'Facebook webhook activated successfully',
          data: {
            webhookUrl,
            verifyToken,
            subscriptions,
            ...this.getSetupInstructions(workflowId, webhookUrl, verifyToken),
          },
        };

      } catch (error: any) {
        this.logger.error('Failed to subscribe to webhook:', error.message);
        this.logger.error('Facebook API Error Response:', JSON.stringify(error.response?.data, null, 2));
        this.logger.error('Request URL:', error.config?.url);
        this.logger.error('Request Data:', JSON.stringify(error.config?.data, null, 2));

        const errorMessage = error.response?.data?.error?.message || error.message;
        const errorCode = error.response?.data?.error?.code;

        // Provide helpful error messages for common issues
        let helpfulMessage = errorMessage;
        if (errorCode === 200 && errorMessage.includes('pages_messaging')) {
          helpfulMessage = `Permission Error: Your page access token doesn't have the 'pages_messaging' permission. Please generate a new token with the required permissions in your Facebook App settings.`;
        } else if (errorCode === 100 && errorMessage.includes('Param subscribed_fields')) {
          helpfulMessage = `Invalid subscription field. Please check that the trigger type matches your token's permissions.`;
        }

        return {
          success: false,
          message: 'Failed to subscribe to Facebook webhook',
          error: helpfulMessage,
        };
      }

    } catch (error: any) {
      this.logger.error(`Error activating Facebook trigger for workflow ${workflowId}:`, error);
      return {
        success: false,
        message: 'Failed to activate Facebook trigger',
        error: error.message,
      };
    }
  }

  /**
   * Subscribe to Facebook webhook using app-level subscription
   * Following n8n pattern: POST /{app-id}/subscriptions
   */
  private async subscribeToWebhook(
    appId: string,
    pageAccessToken: string,
    callbackUrl: string,
    subscriptions: string[],
    verifyToken: string
  ): Promise<any> {
    // Use app-level subscription endpoint (like n8n)
    // This allows managing webhooks for pages, Instagram, etc.
    const subscribeUrl = `https://graph.facebook.com/v18.0/${appId}/subscriptions`;

    this.logger.debug(`Subscribing to webhook with fields: ${subscriptions.join(', ')}`);
    this.logger.debug(`Callback URL: ${callbackUrl}`);

    // Determine object type based on subscriptions
    // Instagram subscriptions: comments, mentions, story_mentions, media
    // Page subscriptions: feed, messages
    const isInstagramSubscription = subscriptions.some(s =>
      ['comments', 'mentions', 'story_mentions', 'media'].includes(s)
    );
    const object = isInstagramSubscription ? 'instagram' : 'page';

    this.logger.log(`Subscribing to ${object} webhooks`);

    const response = await axios.post(
      subscribeUrl,
      {
        object: object,
        callback_url: callbackUrl,
        fields: subscriptions.join(','),
        verify_token: verifyToken,
        access_token: pageAccessToken,
      }
    );

    return response.data;
  }

  /**
   * Deactivate Facebook webhook
   */
  async deactivate(workflowId: string): Promise<TriggerDeactivationResult> {
    try {
      this.logger.log(`Deactivating Facebook trigger for workflow ${workflowId}`);

      const trigger = this.activeTriggers.get(workflowId);

      if (!trigger) {
        return {
          success: true,
          message: 'Facebook trigger was not active',
        };
      }

      // Unsubscribe from webhook
      try {
        await this.unsubscribeFromWebhook(trigger.appId, trigger.pageAccessToken);
        this.logger.log('Unsubscribed from Facebook webhook');
      } catch (error: any) {
        this.logger.warn('Failed to unsubscribe from webhook:', error.message);
      }

      // Remove from active triggers
      this.activeTriggers.delete(workflowId);

      this.logger.log(`✅ Facebook trigger deactivated for workflow ${workflowId}`);

      return {
        success: true,
        message: 'Facebook trigger deactivated successfully',
      };

    } catch (error: any) {
      this.logger.error(`Error deactivating Facebook trigger:`, error);
      return {
        success: false,
        message: 'Failed to deactivate Facebook trigger',
      };
    }
  }

  /**
   * Unsubscribe from Facebook webhook using app-level endpoint
   */
  private async unsubscribeFromWebhook(appId: string, pageAccessToken: string): Promise<void> {
    const unsubscribeUrl = `https://graph.facebook.com/v18.0/${appId}/subscriptions`;

    await axios.delete(unsubscribeUrl, {
      params: {
        access_token: pageAccessToken,
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
      type: TriggerType.FACEBOOK,
      message: trigger
        ? `Active - Webhook URL: ${trigger.webhookUrl}`
        : 'Not active',
      metadata: trigger
        ? {
            webhookUrl: trigger.webhookUrl,
            subscriptions: trigger.subscriptions,
            activatedAt: trigger.activatedAt,
          }
        : undefined,
    };
  }

  /**
   * Get trigger type
   */
  getTriggerType(): TriggerType {
    return TriggerType.FACEBOOK;
  }

  /**
   * Generate verify token for webhook verification
   * Note: This is deterministic (no timestamp) so it remains consistent across restarts
   */
  private generateVerifyToken(workflowId: string): string {
    return crypto
      .createHash('sha256')
      .update(`fluxturn_facebook_${workflowId}`)
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
        '1. Go to Facebook App Dashboard → Webhooks',
        `2. Add webhook URL: ${webhookUrl}`,
        `3. Enter Verify Token: ${verifyToken}`,
        '4. Subscribe to desired fields (feed, comments, messages, etc.)',
        '5. Ensure your Page Access Token has necessary permissions',
      ],
      note: 'Facebook webhooks must be configured manually in the Facebook App Dashboard',
      webhookUrl,
      verifyToken,
    };
  }
}
