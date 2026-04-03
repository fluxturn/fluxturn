import { Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
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

interface SalesforceTriggerConfig {
  triggerId?: string;
  objectType?: string;
  credentialId?: string;
  connectorConfigId?: string;
  instanceUrl?: string;
  actionParams?: {
    objectType?: string;
    triggerId?: string;
  };
}

interface SalesforceWebhookConfig {
  outboundMessageId?: string;
  platformEventChannel?: string;
  streamingChannel?: string;
  objectType: string;
  triggerId: string;
  instanceUrl: string;
}

interface ActiveTrigger {
  workflowId: string;
  triggerId: string;
  config: SalesforceWebhookConfig;
  credentials: any;
  pollingInterval?: NodeJS.Timeout;
}

@Injectable()
export class SalesforceTriggerService implements ITriggerService, OnModuleDestroy {
  private readonly logger = new Logger(SalesforceTriggerService.name);
  private readonly activeTriggers = new Map<string, ActiveTrigger>();
  private readonly lastPolledTimestamps = new Map<string, string>();

  constructor(
    private readonly configService: ConfigService,
    private readonly platformService: PlatformService,
  ) {}

  getTriggerType(): TriggerType {
    return TriggerType.SALESFORCE;
  }

  async onModuleDestroy(): Promise<void> {
    this.logger.log('Cleaning up Salesforce triggers...');
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
    this.logger.log('Salesforce trigger cleanup completed');
  }

  async activate(
    workflowId: string,
    triggerConfig: SalesforceTriggerConfig,
  ): Promise<TriggerActivationResult> {
    try {
      const triggerId = triggerConfig.triggerId || triggerConfig.actionParams?.triggerId || 'record_created';
      const objectType = triggerConfig.objectType || triggerConfig.actionParams?.objectType || 'Contact';

      this.logger.log(`Activating Salesforce trigger ${triggerId} for workflow ${workflowId}`);

      // Get credentials
      const credentialId = triggerConfig.credentialId || triggerConfig.connectorConfigId;
      let credentials: any = null;

      if (credentialId) {
        credentials = await this.getCredentials(credentialId);
      }

      const accessToken = credentials?.accessToken || credentials?.access_token;
      const instanceUrl = triggerConfig.instanceUrl || credentials?.instanceUrl || credentials?.instance_url;

      if (!accessToken || !instanceUrl) {
        return {
          success: false,
          message: 'Salesforce access token and instance URL are required',
          error: 'Missing accessToken or instanceUrl in credentials',
        };
      }

      // For Salesforce, we use polling-based triggers since outbound messages
      // require Salesforce admin configuration. Platform Events could be used
      // for more advanced setups.

      // Store configuration
      const webhookConfig: SalesforceWebhookConfig = {
        objectType,
        triggerId,
        instanceUrl,
      };

      // Initialize last polled timestamp
      this.lastPolledTimestamps.set(workflowId, new Date().toISOString());

      // Set up polling interval (every 60 seconds)
      const pollingInterval = setInterval(async () => {
        await this.pollForChanges(workflowId);
      }, 60000);

      this.activeTriggers.set(workflowId, {
        workflowId,
        triggerId,
        config: webhookConfig,
        credentials: { accessToken, instanceUrl },
        pollingInterval,
      });

      this.logger.log(`Salesforce polling trigger activated for ${objectType} ${triggerId}`);

      return {
        success: true,
        message: 'Salesforce trigger activated successfully',
        data: {
          triggerId,
          objectType,
          pollingEnabled: true,
          pollingIntervalMs: 60000,
        },
      };
    } catch (error) {
      this.logger.error(`Failed to activate Salesforce trigger for workflow ${workflowId}:`, error);
      return {
        success: false,
        message: 'Failed to activate Salesforce trigger',
        error: error.message,
      };
    }
  }

  async deactivate(workflowId: string): Promise<TriggerDeactivationResult> {
    try {
      this.logger.log(`Deactivating Salesforce trigger for workflow ${workflowId}`);

      const activeTrigger = this.activeTriggers.get(workflowId);

      if (activeTrigger) {
        // Clear polling interval
        if (activeTrigger.pollingInterval) {
          clearInterval(activeTrigger.pollingInterval);
        }

        this.activeTriggers.delete(workflowId);
        this.lastPolledTimestamps.delete(workflowId);
      }

      return {
        success: true,
        message: 'Salesforce trigger deactivated successfully',
      };
    } catch (error) {
      this.logger.error(`Failed to deactivate Salesforce trigger for workflow ${workflowId}:`, error);
      this.activeTriggers.delete(workflowId);
      this.lastPolledTimestamps.delete(workflowId);
      return {
        success: false,
        message: `Failed to deactivate Salesforce trigger: ${error.message}`,
      };
    }
  }

  async getStatus(workflowId: string): Promise<TriggerStatus> {
    const activeTrigger = this.activeTriggers.get(workflowId);

    if (!activeTrigger) {
      return {
        active: false,
        type: TriggerType.SALESFORCE,
        message: 'No active trigger found for this workflow',
      };
    }

    return {
      active: true,
      type: TriggerType.SALESFORCE,
      message: 'Salesforce trigger is active',
      metadata: {
        triggerId: activeTrigger.triggerId,
        objectType: activeTrigger.config.objectType,
        instanceUrl: activeTrigger.config.instanceUrl,
        pollingEnabled: !!activeTrigger.pollingInterval,
        lastPolled: this.lastPolledTimestamps.get(workflowId),
      },
    };
  }

  getActiveTrigger(workflowId: string): ActiveTrigger | undefined {
    return this.activeTriggers.get(workflowId);
  }

  private async pollForChanges(workflowId: string): Promise<void> {
    const activeTrigger = this.activeTriggers.get(workflowId);
    if (!activeTrigger) return;

    try {
      const lastPolled = this.lastPolledTimestamps.get(workflowId) || new Date(0).toISOString();
      const { triggerId, config, credentials } = activeTrigger;
      const { objectType, instanceUrl } = config;

      // Build SOQL query based on trigger type
      const query = this.buildPollQuery(triggerId, objectType, lastPolled);

      const response = await axios.get(
        `${instanceUrl}/services/data/v58.0/query`,
        {
          params: { q: query },
          headers: {
            Authorization: `Bearer ${credentials.accessToken}`,
          },
        },
      );

      const records = response.data?.records || [];

      if (records.length > 0) {
        this.logger.log(`Found ${records.length} new records for workflow ${workflowId}`);
        // In a full implementation, this would emit events to the workflow engine
        // For now, we just log the changes
      }

      // Update last polled timestamp
      this.lastPolledTimestamps.set(workflowId, new Date().toISOString());
    } catch (error) {
      this.logger.error(`Polling failed for workflow ${workflowId}:`, error.message);
    }
  }

  private buildPollQuery(triggerId: string, objectType: string, lastPolled: string): string {
    const baseFields = 'Id, Name, CreatedDate, LastModifiedDate';

    switch (triggerId) {
      case 'record_created':
        return `SELECT ${baseFields} FROM ${objectType} WHERE CreatedDate > ${lastPolled} ORDER BY CreatedDate ASC`;
      case 'record_updated':
        return `SELECT ${baseFields} FROM ${objectType} WHERE LastModifiedDate > ${lastPolled} AND CreatedDate < ${lastPolled} ORDER BY LastModifiedDate ASC`;
      case 'record_deleted':
        // Deleted records need to query the RecycleBin
        return `SELECT Id, Name FROM ${objectType} WHERE IsDeleted = true AND SystemModstamp > ${lastPolled} ALL ROWS`;
      case 'opportunity_stage_changed':
        return `SELECT Id, Name, StageName, LastModifiedDate FROM Opportunity WHERE LastModifiedDate > ${lastPolled} ORDER BY LastModifiedDate ASC`;
      case 'lead_converted':
        return `SELECT Id, Name, IsConverted, ConvertedDate FROM Lead WHERE IsConverted = true AND ConvertedDate > ${lastPolled} ORDER BY ConvertedDate ASC`;
      case 'case_escalated':
        return `SELECT Id, CaseNumber, Subject, IsEscalated, LastModifiedDate FROM Case WHERE IsEscalated = true AND LastModifiedDate > ${lastPolled} ORDER BY LastModifiedDate ASC`;
      default:
        return `SELECT ${baseFields} FROM ${objectType} WHERE LastModifiedDate > ${lastPolled} ORDER BY LastModifiedDate ASC`;
    }
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
}
