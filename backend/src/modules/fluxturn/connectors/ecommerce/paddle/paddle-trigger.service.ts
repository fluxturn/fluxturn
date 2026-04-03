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

interface PaddleTriggerConfig {
  vendorId?: string;
  vendorAuthCode?: string;
  eventType?: string;
  actionParams?: {
    vendorId?: string;
    vendorAuthCode?: string;
    eventType?: string;
  };
  connectorConfigId?: string;
  credentialId?: string;
}

interface ActiveTrigger {
  vendorId: string;
  webhookUrl: string;
  eventType: string;
  activatedAt: Date;
}

/**
 * Paddle Trigger Service
 *
 * Manages Paddle webhook registration and lifecycle.
 * Paddle webhooks are configured manually in the Paddle dashboard,
 * so this service primarily tracks active triggers and provides webhook URLs.
 *
 * Key Features:
 * - Webhook URL generation for Paddle events
 * - Trigger lifecycle management
 * - Support for subscription and payment events
 */
@Injectable()
export class PaddleTriggerService implements ITriggerService, OnModuleInit {
  private readonly logger = new Logger(PaddleTriggerService.name);
  private readonly activeTriggers = new Map<string, ActiveTrigger>();

  constructor(
    private readonly configService: ConfigService,
    private readonly platformService: PlatformService
  ) {}

  /**
   * Restore active workflows on module initialization
   */
  async onModuleInit() {
    this.logger.log('Initializing Paddle Trigger Service...');
    try {
      await this.restoreActiveWorkflows();
    } catch (error) {
      this.logger.error('Failed to restore active workflows:', error);
    }
  }

  /**
   * Restore active Paddle workflows from database
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

          // Find Paddle trigger nodes
          const paddleTriggerNodes = nodes.filter(
            (node: any) => node.type === 'CONNECTOR_TRIGGER' &&
                          node.data?.connectorType === 'paddle'
          );

          if (paddleTriggerNodes.length === 0) {
            continue;
          }

          const workflowId = row.id;
          const triggerNode = paddleTriggerNodes[0];
          const triggerConfig = {
            ...triggerNode.data,
            ...triggerNode.data?.actionParams,
            credentialId: triggerNode.data?.credentialId || triggerNode.data?.connectorConfigId
          };

          this.logger.debug(`Restoring Paddle trigger for workflow ${workflowId}`);

          const activationResult = await this.activate(workflowId, triggerConfig);

          if (activationResult.success) {
            restoredCount++;
            this.logger.log(`Restored Paddle trigger for workflow ${workflowId}`);
          } else {
            this.logger.warn(`Failed to restore workflow ${workflowId}: ${activationResult.message}`);
          }
        } catch (error) {
          this.logger.error(`Error restoring workflow ${row.id}:`, error.message);
        }
      }

      if (restoredCount > 0) {
        this.logger.log(`Successfully restored ${restoredCount} Paddle workflow(s)`);
      } else {
        this.logger.log('No active Paddle workflows to restore');
      }
    } catch (error) {
      this.logger.error('Failed to restore active workflows:', error);
      throw error;
    }
  }

  /**
   * Activate Paddle webhook for a workflow
   */
  async activate(workflowId: string, triggerConfig: PaddleTriggerConfig): Promise<TriggerActivationResult> {
    try {
      this.logger.log(`Activating Paddle trigger for workflow ${workflowId}`);
      this.logger.debug(`Trigger config: ${JSON.stringify(triggerConfig)}`);

      // Extract vendor ID from config
      let vendorId =
        triggerConfig.vendorId ||
        triggerConfig.actionParams?.vendorId;

      const credentialId = triggerConfig.credentialId || triggerConfig.connectorConfigId;

      if (!vendorId && credentialId) {
        this.logger.log(`Fetching vendor ID from credential: ${credentialId}`);
        try {
          const credentialQuery = `
            SELECT credentials FROM connector_configs
            WHERE id = $1
          `;
          const result = await this.platformService.query(credentialQuery, [credentialId]);

          if (result.rows.length > 0) {
            const credentials = result.rows[0].credentials;

            if (credentials && credentials.iv && (credentials.data || credentials.encrypted) && credentials.authTag) {
              this.logger.log('Credentials are encrypted, decrypting...');
              try {
                const decryptedCredentials = this.decryptCredentialConfig(credentials);
                vendorId = decryptedCredentials.vendorId || decryptedCredentials.vendor_id;
              } catch (decryptError) {
                this.logger.error('Failed to decrypt credentials:', decryptError);
                return {
                  success: false,
                  message: 'Failed to decrypt credentials',
                  error: decryptError.message,
                };
              }
            } else {
              vendorId = credentials?.vendorId || credentials?.vendor_id;
            }
          }
        } catch (error) {
          this.logger.error(`Failed to fetch credential ${credentialId}:`, error);
          return {
            success: false,
            message: 'Failed to fetch vendor ID from credential',
            error: error.message,
          };
        }
      }

      if (!vendorId) {
        return {
          success: false,
          message: 'Vendor ID is required for Paddle trigger',
          error: 'Missing vendor ID in trigger configuration',
        };
      }

      // Generate webhook URL
      const webhookUrl = this.generateWebhookUrl(workflowId);

      // Extract event type
      const eventType = triggerConfig.eventType || triggerConfig.actionParams?.eventType || 'subscription_created';

      // Store trigger state
      this.activeTriggers.set(workflowId, {
        vendorId,
        webhookUrl,
        eventType,
        activatedAt: new Date(),
      });

      this.logger.log(`Paddle trigger activated successfully for workflow ${workflowId}`);

      return {
        success: true,
        message: 'Paddle webhook URL generated successfully',
        data: {
          webhookUrl,
          eventType,
          setupInstructions: this.getSetupInstructions(workflowId, webhookUrl, eventType),
        },
      };

    } catch (error: any) {
      this.logger.error(`Failed to activate Paddle trigger for workflow ${workflowId}:`, error);
      return {
        success: false,
        message: 'Failed to activate Paddle trigger',
        error: error.message || 'Unknown error occurred',
      };
    }
  }

  /**
   * Deactivate Paddle webhook for a workflow
   */
  async deactivate(workflowId: string): Promise<TriggerDeactivationResult> {
    try {
      this.logger.log(`Deactivating Paddle trigger for workflow ${workflowId}`);

      const trigger = this.activeTriggers.get(workflowId);

      if (!trigger) {
        this.logger.warn(`No active Paddle trigger found for workflow ${workflowId}`);
        return {
          success: true,
          message: 'No active Paddle trigger found',
        };
      }

      // Remove from active triggers
      this.activeTriggers.delete(workflowId);

      this.logger.log(`Paddle trigger deactivated successfully for workflow ${workflowId}`);

      return {
        success: true,
        message: 'Paddle trigger deactivated successfully. Remember to remove the webhook from your Paddle dashboard.',
      };

    } catch (error: any) {
      this.logger.error(`Failed to deactivate Paddle trigger for workflow ${workflowId}:`, error);

      this.activeTriggers.delete(workflowId);

      return {
        success: false,
        message: 'Failed to deactivate Paddle trigger (removed locally)',
      };
    }
  }

  /**
   * Get status of Paddle trigger for a workflow
   */
  async getStatus(workflowId: string): Promise<TriggerStatus> {
    const trigger = this.activeTriggers.get(workflowId);

    if (!trigger) {
      return {
        active: false,
        type: TriggerType.PADDLE,
        message: 'Paddle trigger not active',
      };
    }

    return {
      active: true,
      type: TriggerType.PADDLE,
      message: 'Paddle trigger active',
      metadata: {
        webhookUrl: trigger.webhookUrl,
        eventType: trigger.eventType,
        activatedAt: trigger.activatedAt,
      },
    };
  }

  /**
   * Get trigger type identifier
   */
  getTriggerType(): TriggerType {
    return TriggerType.PADDLE;
  }

  /**
   * Generate webhook URL for workflow
   */
  private generateWebhookUrl(workflowId: string): string {
    const baseUrl = this.configService.get<string>('APP_URL') || 'http://localhost:3000';
    const cleanBaseUrl = baseUrl.replace(/\/$/, '');
    return `${cleanBaseUrl}/api/v1/webhooks/paddle/${workflowId}`;
  }

  /**
   * Get setup instructions for user
   */
  private getSetupInstructions(workflowId: string, webhookUrl: string, eventType: string): any {
    return {
      webhookUrl,
      eventType,
      message: 'Configure your Paddle webhook in the Paddle Dashboard',
      steps: [
        '1. Go to your Paddle Dashboard > Developer Tools > Alerts',
        '2. Click "Add a new Alert" or edit an existing webhook',
        `3. Enter this URL: ${webhookUrl}`,
        '4. Select the events you want to receive',
        '5. Save the alert configuration',
        '6. Test the webhook using Paddle\'s test feature',
      ],
      supportedEvents: [
        'subscription_created - New subscription created',
        'subscription_updated - Subscription details changed',
        'subscription_cancelled - Subscription cancelled',
        'payment_succeeded - Payment completed successfully',
        'payment_failed - Payment attempt failed',
        'payment_refunded - Payment was refunded',
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
   * Verify Paddle webhook signature
   */
  verifyWebhookSignature(payload: string, signature: string, publicKey: string): boolean {
    try {
      const verifier = crypto.createVerify('RSA-SHA1');
      verifier.update(payload);
      verifier.end();
      return verifier.verify(publicKey, signature, 'base64');
    } catch (error) {
      this.logger.error('Signature verification failed:', error);
      return false;
    }
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
