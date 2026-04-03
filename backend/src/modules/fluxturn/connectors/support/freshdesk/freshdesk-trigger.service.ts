import { Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
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

interface FreshdeskTriggerConfigInput {
  triggerId?: string;
  domain?: string;
  credentialId?: string;
  connectorConfigId?: string;
  actionParams?: {
    triggerId?: string;
    domain?: string;
  };
}

interface FreshdeskTriggerConfig {
  domain: string;
  triggerId: string;
  secretToken: string;
}

interface ActiveTrigger {
  workflowId: string;
  triggerId: string;
  config: FreshdeskTriggerConfig;
  credentials: any;
}

@Injectable()
export class FreshdeskTriggerService implements ITriggerService, OnModuleDestroy {
  private readonly logger = new Logger(FreshdeskTriggerService.name);
  private readonly activeTriggers = new Map<string, ActiveTrigger>();
  private readonly secretTokens = new Map<string, string>();

  constructor(
    private readonly configService: ConfigService,
    private readonly platformService: PlatformService,
  ) {}

  getTriggerType(): TriggerType {
    return TriggerType.FRESHDESK;
  }

  async onModuleDestroy(): Promise<void> {
    this.logger.log('Cleaning up Freshdesk triggers...');
    const deactivationPromises: Promise<TriggerDeactivationResult>[] = [];

    for (const workflowId of this.activeTriggers.keys()) {
      deactivationPromises.push(
        this.deactivate(workflowId).catch((error) => {
          this.logger.error(`Failed to deactivate trigger for workflow ${workflowId}:`, error);
          return { success: false, message: `Cleanup failed: ${error.message}` };
        }),
      );
    }

    await Promise.all(deactivationPromises);
    this.logger.log('Freshdesk trigger cleanup completed');
  }

  async activate(
    workflowId: string,
    triggerConfig: FreshdeskTriggerConfigInput,
  ): Promise<TriggerActivationResult> {
    try {
      const triggerId = triggerConfig.triggerId || triggerConfig.actionParams?.triggerId || 'ticket_created';
      this.logger.log(`Activating Freshdesk trigger ${triggerId} for workflow ${workflowId}`);

      // Get credentials
      const credentialId = triggerConfig.credentialId || triggerConfig.connectorConfigId;
      let domain: string | undefined = triggerConfig.domain || triggerConfig.actionParams?.domain;
      let apiKey: string | undefined;

      if (credentialId) {
        const credentials = await this.getCredentials(credentialId);
        domain = domain || credentials?.domain;
        apiKey = credentials?.api_key || credentials?.apiKey;
      }

      if (!domain || !apiKey) {
        return {
          success: false,
          message: 'Freshdesk domain and API key are required',
          error: 'Missing domain or api_key in credentials',
        };
      }

      const appUrl = this.configService.get<string>('APP_URL') || 'http://localhost:3000';
      const webhookUrl = `${appUrl}/api/v1/webhooks/freshdesk/${workflowId}`;
      const secretToken = this.generateSecretToken();

      // Freshdesk requires manual webhook setup via Automation Rules
      const setupInstructions = this.getSetupInstructions(triggerId, webhookUrl);

      // Store trigger configuration
      const freshdeskConfig: FreshdeskTriggerConfig = {
        domain,
        triggerId,
        secretToken,
      };

      this.activeTriggers.set(workflowId, {
        workflowId,
        triggerId,
        config: freshdeskConfig,
        credentials: { domain, api_key: apiKey },
      });

      this.secretTokens.set(workflowId, secretToken);

      this.logger.log(`Freshdesk trigger activated for domain: ${domain}`);

      return {
        success: true,
        message: 'Freshdesk webhook requires manual setup via Automation Rules',
        data: {
          webhookUrl,
          setupRequired: true,
          instructions: setupInstructions,
        },
      };
    } catch (error) {
      this.logger.error(`Failed to activate Freshdesk trigger for workflow ${workflowId}:`, error);
      return {
        success: false,
        message: 'Failed to activate Freshdesk trigger',
        error: error.message,
      };
    }
  }

  async deactivate(workflowId: string): Promise<TriggerDeactivationResult> {
    try {
      this.logger.log(`Deactivating Freshdesk trigger for workflow ${workflowId}`);

      const activeTrigger = this.activeTriggers.get(workflowId);

      if (activeTrigger) {
        // Freshdesk webhooks are managed via Automation Rules
        // We just need to clean up our local state
        this.activeTriggers.delete(workflowId);
        this.secretTokens.delete(workflowId);
      }

      return {
        success: true,
        message: 'Freshdesk trigger deactivated successfully. Remember to delete the Automation Rule in Freshdesk.',
      };
    } catch (error) {
      this.logger.error(`Failed to deactivate Freshdesk trigger for workflow ${workflowId}:`, error);
      this.activeTriggers.delete(workflowId);
      this.secretTokens.delete(workflowId);
      return {
        success: false,
        message: `Failed to deactivate Freshdesk trigger: ${error.message}`,
      };
    }
  }

  async getStatus(workflowId: string): Promise<TriggerStatus> {
    const activeTrigger = this.activeTriggers.get(workflowId);

    if (!activeTrigger) {
      return {
        active: false,
        type: TriggerType.FRESHDESK,
        message: 'No active trigger found for this workflow',
      };
    }

    return {
      active: true,
      type: TriggerType.FRESHDESK,
      message: 'Freshdesk trigger is active',
      metadata: {
        triggerId: activeTrigger.triggerId,
        domain: activeTrigger.config.domain,
      },
    };
  }

  validateSecretToken(workflowId: string, token: string): boolean {
    const storedToken = this.secretTokens.get(workflowId);

    if (!storedToken) {
      // If no stored token, allow the request (webhook was set up without secret)
      return true;
    }

    // Use timing-safe comparison
    try {
      return crypto.timingSafeEqual(
        Buffer.from(storedToken),
        Buffer.from(token || '')
      );
    } catch {
      return false;
    }
  }

  getActiveTrigger(workflowId: string): ActiveTrigger | undefined {
    return this.activeTriggers.get(workflowId);
  }

  private async getCredentials(credentialId: string): Promise<any> {
    try {
      const query = `SELECT credentials FROM connector_configs WHERE id = $1`;
      const result = await this.platformService.query(query, [credentialId]);

      if (result.rows.length === 0) {
        return null;
      }

      const credentials = result.rows[0].credentials;

      if (credentials?.iv && (credentials?.data || credentials?.encrypted) && credentials?.authTag) {
        return this.decryptCredentials(credentials);
      }

      return credentials;
    } catch (error) {
      this.logger.error(`Failed to fetch credentials ${credentialId}:`, error);
      return null;
    }
  }

  private decryptCredentials(encryptedConfig: any): any {
    try {
      const encrypted = encryptedConfig.data || encryptedConfig.encrypted;
      const iv = encryptedConfig.iv;
      const authTag = encryptedConfig.authTag;

      const secretKey = this.configService.get<string>('CONNECTOR_ENCRYPTION_KEY');
      if (!secretKey) {
        throw new Error('CONNECTOR_ENCRYPTION_KEY not set');
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
      throw error;
    }
  }

  private generateSecretToken(): string {
    return crypto.randomBytes(32).toString('hex');
  }

  private getSetupInstructions(triggerId: string, webhookUrl: string): string[] {
    const eventDescription = this.getEventDescription(triggerId);

    return [
      '1. Go to Freshdesk Admin > Workflows > Automations',
      `2. Create a new rule for "${eventDescription}"`,
      '3. Set your desired conditions (e.g., when ticket is created)',
      '4. Add action: "Trigger Webhook"',
      '5. Configure the webhook:',
      `   - URL: ${webhookUrl}`,
      '   - Request Type: POST',
      '   - Content Type: application/json',
      '   - Include ticket data in the request body',
      '6. Save and enable the automation rule',
    ];
  }

  private getEventDescription(triggerId: string): string {
    const descriptions: Record<string, string> = {
      'ticket_created': 'Ticket Creation',
      'ticket_updated': 'Ticket Update',
      'ticket_resolved': 'Ticket Resolution',
    };

    return descriptions[triggerId] || 'Ticket Event';
  }
}
