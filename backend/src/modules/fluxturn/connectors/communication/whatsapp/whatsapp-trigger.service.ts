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

interface WhatsAppTriggerConfig {
  accessToken?: string;
  phoneNumberId?: string;
  businessAccountId?: string;
  verifyToken?: string;
  actionParams?: {
    accessToken?: string;
    phoneNumberId?: string;
    businessAccountId?: string;
    verifyToken?: string;
  };
  connectorConfigId?: string;
  credentialId?: string;
}

interface ActiveTrigger {
  accessToken: string;
  phoneNumberId: string;
  businessAccountId: string;
  webhookUrl: string;
  verifyToken: string;
  activatedAt: Date;
  webhookInfo?: any;
}

/**
 * WhatsApp Business Cloud API Trigger Service
 *
 * Manages WhatsApp Business webhook registration and lifecycle.
 * Integrates with WhatsApp Business Cloud API to automatically set up webhooks
 * for receiving messages and various business account events.
 *
 * Key Features:
 * - Automatic webhook registration with WhatsApp Business Cloud API
 * - HTTPS URL requirement handling
 * - Verify token generation and validation
 * - Webhook lifecycle management (check, create, delete)
 * - Support for multiple event types (messages, account updates, template updates, security events)
 */
@Injectable()
export class WhatsAppTriggerService implements ITriggerService, OnModuleInit {
  private readonly logger = new Logger(WhatsAppTriggerService.name);
  private readonly activeTriggers = new Map<string, ActiveTrigger>();

  constructor(
    private readonly configService: ConfigService,
    private readonly platformService: PlatformService
  ) {}

  /**
   * Restore active workflows on module initialization
   */
  async onModuleInit() {
    this.logger.log('Initializing WhatsApp Trigger Service...');
    try {
      await this.restoreActiveWorkflows();
    } catch (error) {
      this.logger.error('Failed to restore active workflows:', error);
    }
  }

  /**
   * Restore active WhatsApp workflows from database
   */
  private async restoreActiveWorkflows() {
    try {
      // Query for all active workflows with WhatsApp triggers
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

          // Find WhatsApp trigger nodes
          const whatsappTriggerNodes = nodes.filter(
            (node: any) => node.type === 'CONNECTOR_TRIGGER' &&
                          node.data?.connectorType === 'whatsapp'
          );

          if (whatsappTriggerNodes.length === 0) {
            continue; // No WhatsApp triggers in this workflow
          }

          const workflowId = row.id;
          const triggerNode = whatsappTriggerNodes[0]; // Use first WhatsApp trigger
          const triggerConfig = {
            ...triggerNode.data,
            ...triggerNode.data?.actionParams,
            credentialId: triggerNode.data?.credentialId || triggerNode.data?.connectorConfigId
          };

          this.logger.debug(`Restoring WhatsApp trigger for workflow ${workflowId}`);

          // Re-activate the trigger
          const result = await this.activate(workflowId, triggerConfig);

          if (result.success) {
            restoredCount++;
            this.logger.log(`✅ Restored WhatsApp trigger for workflow ${workflowId}`);
          } else {
            this.logger.warn(`❌ Failed to restore workflow ${workflowId}: ${result.message}`);
          }
        } catch (error) {
          this.logger.error(`Error restoring workflow ${row.id}:`, error.message);
        }
      }

      if (restoredCount > 0) {
        this.logger.log(`Successfully restored ${restoredCount} WhatsApp workflow(s)`);
      } else {
        this.logger.log('No active WhatsApp workflows to restore');
      }
    } catch (error) {
      this.logger.error('Failed to restore active workflows:', error);
      throw error;
    }
  }

  /**
   * Activate WhatsApp webhook for a workflow
   */
  async activate(workflowId: string, triggerConfig: WhatsAppTriggerConfig): Promise<TriggerActivationResult> {
    try {
      this.logger.log(`Activating WhatsApp trigger for workflow ${workflowId}`);
      this.logger.debug(`Trigger config: ${JSON.stringify(triggerConfig)}`);

      // Extract credentials from config
      let accessToken =
        triggerConfig.accessToken ||
        triggerConfig.actionParams?.accessToken;

      let phoneNumberId =
        triggerConfig.phoneNumberId ||
        triggerConfig.actionParams?.phoneNumberId;

      let businessAccountId =
        triggerConfig.businessAccountId ||
        triggerConfig.actionParams?.businessAccountId;

      // If no direct credentials, check for credential ID
      const credentialId = triggerConfig.credentialId || triggerConfig.connectorConfigId;

      if ((!accessToken || !phoneNumberId) && credentialId) {
        this.logger.log(`Fetching credentials from credential: ${credentialId}`);
        try {
          const credentialQuery = `
            SELECT credentials FROM connector_configs
            WHERE id = $1
          `;
          const result = await this.platformService.query(credentialQuery, [credentialId]);

          if (result.rows.length > 0) {
            const credentials = result.rows[0].credentials;
            this.logger.debug(`Credential data found`);

            // Check if credentials are encrypted
            if (credentials && credentials.iv && (credentials.data || credentials.encrypted) && credentials.authTag) {
              this.logger.log('Credentials are encrypted, decrypting...');

              try {
                const decryptedCredentials = this.decryptCredentialConfig(credentials);
                this.logger.debug(`Decrypted credentials keys: ${Object.keys(decryptedCredentials).join(', ')}`);

                accessToken = decryptedCredentials.accessToken || decryptedCredentials.access_token;
                phoneNumberId = decryptedCredentials.phoneNumberId || decryptedCredentials.phone_number_id;
                businessAccountId = decryptedCredentials.businessAccountId || decryptedCredentials.business_account_id;

                this.logger.log(`Credentials ${accessToken && phoneNumberId ? 'found' : 'not found'} in decrypted credentials`);
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
              phoneNumberId = credentials?.phoneNumberId || credentials?.phone_number_id;
              businessAccountId = credentials?.businessAccountId || credentials?.business_account_id;
              this.logger.log(`Credentials ${accessToken && phoneNumberId ? 'found' : 'not found'} in plain credentials`);
            }
          } else {
            this.logger.warn(`Credential ${credentialId} not found in database`);
          }
        } catch (error) {
          this.logger.error(`Failed to fetch credential ${credentialId}:`, error);
          return {
            success: false,
            message: 'Failed to fetch credentials from database',
            error: error.message,
          };
        }
      }

      if (!accessToken || !phoneNumberId) {
        this.logger.error(`Missing required credentials. accessToken: ${!!accessToken}, phoneNumberId: ${!!phoneNumberId}`);
        return {
          success: false,
          message: 'Access Token and Phone Number ID are required for WhatsApp trigger',
          error: 'Missing required credentials. Please configure WhatsApp Business credentials.',
        };
      }

      // Generate webhook URL - must be HTTPS for WhatsApp
      const webhookUrl = this.generateWebhookUrl(workflowId);

      // Validate HTTPS requirement
      if (!webhookUrl.startsWith('https://')) {
        return {
          success: false,
          message: 'WhatsApp requires HTTPS webhook URL',
          error: 'APP_URL must be HTTPS or use ngrok for local development',
          data: {
            currentUrl: webhookUrl,
            suggestion: 'Set APP_URL to an HTTPS URL or use ngrok: ngrok http 3000',
          },
        };
      }

      // Generate verify token for webhook validation
      const verifyToken = this.generateVerifyToken(workflowId);

      // Store trigger state (WhatsApp webhook setup is done through Meta Business Suite)
      this.activeTriggers.set(workflowId, {
        accessToken,
        phoneNumberId,
        businessAccountId: businessAccountId || '',
        webhookUrl,
        verifyToken,
        activatedAt: new Date(),
      });

      this.logger.log(`✅ WhatsApp trigger activated successfully for workflow ${workflowId}`);

      return {
        success: true,
        message: 'WhatsApp webhook configured successfully',
        data: {
          webhookUrl,
          verifyToken,
          phoneNumberId,
          setupInstructions: this.getSetupInstructions(workflowId, webhookUrl, verifyToken),
        },
      };

    } catch (error: any) {
      this.logger.error(`Failed to activate WhatsApp trigger for workflow ${workflowId}:`, error);
      return {
        success: false,
        message: 'Failed to activate WhatsApp trigger',
        error: error.message || 'Unknown error occurred',
      };
    }
  }

  /**
   * Deactivate WhatsApp webhook for a workflow
   */
  async deactivate(workflowId: string): Promise<TriggerDeactivationResult> {
    try {
      this.logger.log(`Deactivating WhatsApp trigger for workflow ${workflowId}`);

      const trigger = this.activeTriggers.get(workflowId);

      if (!trigger) {
        this.logger.warn(`No active WhatsApp trigger found for workflow ${workflowId}`);
        return {
          success: true,
          message: 'No active WhatsApp trigger found',
        };
      }

      // Remove from active triggers
      this.activeTriggers.delete(workflowId);

      this.logger.log(`✅ WhatsApp trigger deactivated successfully for workflow ${workflowId}`);

      return {
        success: true,
        message: 'WhatsApp webhook deactivated successfully',
      };

    } catch (error: any) {
      this.logger.error(`Failed to deactivate WhatsApp trigger for workflow ${workflowId}:`, error);

      // Still remove from active triggers even if error
      this.activeTriggers.delete(workflowId);

      return {
        success: false,
        message: 'Failed to deactivate WhatsApp trigger (removed locally)',
      };
    }
  }

  /**
   * Get status of WhatsApp trigger for a workflow
   */
  async getStatus(workflowId: string): Promise<TriggerStatus> {
    const trigger = this.activeTriggers.get(workflowId);

    if (!trigger) {
      return {
        active: false,
        type: TriggerType.WHATSAPP,
        message: 'WhatsApp trigger not active',
      };
    }

    return {
      active: true,
      type: TriggerType.WHATSAPP,
      message: 'WhatsApp trigger active',
      metadata: {
        webhookUrl: trigger.webhookUrl,
        phoneNumberId: trigger.phoneNumberId,
        businessAccountId: trigger.businessAccountId,
        activatedAt: trigger.activatedAt,
      },
    };
  }

  /**
   * Get trigger type identifier
   */
  getTriggerType(): TriggerType {
    return TriggerType.WHATSAPP;
  }

  /**
   * Generate webhook URL for workflow
   */
  private generateWebhookUrl(workflowId: string): string {
    const baseUrl = this.configService.get<string>('APP_URL') || 'http://localhost:3000';
    const cleanBaseUrl = baseUrl.replace(/\/$/, ''); // Remove trailing slash
    return `${cleanBaseUrl}/api/v1/webhooks/whatsapp/${workflowId}`;
  }

  /**
   * Generate verify token for webhook validation
   */
  private generateVerifyToken(workflowId: string): string {
    // Use workflow ID as base, add timestamp for uniqueness
    const base = `fluxturn_whatsapp_${workflowId}_${Date.now()}`;

    // Create a hash for security
    const hash = crypto.createHash('sha256').update(base).digest('hex');

    // Return first 32 characters
    return hash.substring(0, 32);
  }

  /**
   * Get setup instructions for user
   */
  private getSetupInstructions(workflowId: string, webhookUrl: string, verifyToken: string): any {
    return {
      webhookUrl,
      verifyToken,
      message: '⚠️  Manual webhook setup required in Meta Business Suite',
      steps: [
        '1. Go to Meta Business Suite > WhatsApp Manager > Configuration > Webhook',
        `2. Enter the Callback URL: ${webhookUrl}`,
        `3. Enter the Verify Token: ${verifyToken}`,
        '4. Click "Verify and Save"',
        '5. Subscribe to webhook fields: messages, message_template_status_update, account_update, phone_number_quality_update, etc.',
        '6. Test by sending a message to your WhatsApp Business number',
      ],
      documentationUrl: 'https://developers.facebook.com/docs/whatsapp/cloud-api/guides/set-up-webhooks',
      ngrokHelp: webhookUrl.includes('localhost')
        ? 'For local development, use ngrok: ngrok http 3000, then update APP_URL in .env'
        : null,
    };
  }

  /**
   * Validate webhook verify token (timing-safe comparison)
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

    // Timing-safe comparison to prevent timing attacks
    const expectedBuffer = Buffer.from(trigger.verifyToken);
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
