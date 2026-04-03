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

interface GitLabTriggerConfig {
  accessToken?: string;
  serverUrl?: string;
  projectId?: string;
  triggerId?: string;
  branch?: string;
  actionParams?: {
    accessToken?: string;
    serverUrl?: string;
    projectId?: string;
    triggerId?: string;
    branch?: string;
  };
  connectorConfigId?: string;
  credentialId?: string;
}

interface ActiveTrigger {
  webhookId: number;
  projectId: string;
  serverUrl: string;
  secretToken: string;
  triggerId: string;
  activatedAt: Date;
}

/**
 * GitLab Trigger Service
 *
 * Manages GitLab webhook registration for real-time event notifications.
 * Supports push, issue, merge request, pipeline, release, tag push,
 * wiki page, and comment events.
 *
 * Key Features:
 * - Automatic webhook registration with GitLab API
 * - Secret token validation for security
 * - Support for multiple event types
 * - Self-hosted GitLab instance support
 */
@Injectable()
export class GitLabTriggerService implements ITriggerService, OnModuleInit {
  private readonly logger = new Logger(GitLabTriggerService.name);
  private readonly activeTriggers = new Map<string, ActiveTrigger>();

  constructor(
    private readonly configService: ConfigService,
    private readonly platformService: PlatformService
  ) {}

  async onModuleInit() {
    this.logger.log('Initializing GitLab Trigger Service...');
    try {
      await this.restoreActiveWorkflows();
    } catch (error) {
      this.logger.error('Failed to restore active workflows:', error);
    }
  }

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

          const gitlabTriggerNodes = nodes.filter(
            (node: any) =>
              node.type === 'CONNECTOR_TRIGGER' &&
              node.data?.connectorType === 'gitlab'
          );

          if (gitlabTriggerNodes.length === 0) continue;

          const workflowId = row.id;
          const triggerNode = gitlabTriggerNodes[0];
          const triggerConfig = {
            ...triggerNode.data,
            ...triggerNode.data?.actionParams,
            credentialId: triggerNode.data?.credentialId || triggerNode.data?.connectorConfigId,
          };

          this.logger.debug(`Restoring GitLab trigger for workflow ${workflowId}`);

          const activationResult = await this.activate(workflowId, triggerConfig);

          if (activationResult.success) {
            restoredCount++;
            this.logger.log(`✅ Restored GitLab trigger for workflow ${workflowId}`);
          } else {
            this.logger.warn(`❌ Failed to restore workflow ${workflowId}: ${activationResult.message}`);
          }
        } catch (error) {
          this.logger.error(`Error restoring workflow ${row.id}:`, error.message);
        }
      }

      if (restoredCount > 0) {
        this.logger.log(`Successfully restored ${restoredCount} GitLab workflow(s)`);
      } else {
        this.logger.log('No active GitLab workflows to restore');
      }
    } catch (error) {
      this.logger.error('Failed to restore active workflows:', error);
      throw error;
    }
  }

  async activate(workflowId: string, triggerConfig: GitLabTriggerConfig): Promise<TriggerActivationResult> {
    try {
      this.logger.log(`Activating GitLab trigger for workflow ${workflowId}`);
      this.logger.debug(`Trigger config: ${JSON.stringify(triggerConfig)}`);

      let accessToken = triggerConfig.accessToken || triggerConfig.actionParams?.accessToken;
      let serverUrl = triggerConfig.serverUrl || triggerConfig.actionParams?.serverUrl || 'https://gitlab.com';
      const projectId = triggerConfig.projectId || triggerConfig.actionParams?.projectId;
      const triggerId = triggerConfig.triggerId || triggerConfig.actionParams?.triggerId || 'on_push';

      const credentialId = triggerConfig.credentialId || triggerConfig.connectorConfigId;

      if (!accessToken && credentialId) {
        this.logger.log(`Fetching access token from credential: ${credentialId}`);
        try {
          const credentialQuery = `
            SELECT credentials FROM connector_configs
            WHERE id = $1
          `;
          const result = await this.platformService.query(credentialQuery, [credentialId]);

          if (result.rows.length > 0) {
            const credentials = result.rows[0].credentials;

            if (credentials && credentials.iv && (credentials.data || credentials.encrypted) && credentials.authTag) {
              const decryptedCredentials = this.decryptCredentialConfig(credentials);
              accessToken = decryptedCredentials.accessToken || decryptedCredentials.access_token;
              serverUrl = decryptedCredentials.serverUrl || serverUrl;
            } else {
              accessToken = credentials?.accessToken || credentials?.access_token;
              serverUrl = credentials?.serverUrl || serverUrl;
            }
          }
        } catch (error) {
          this.logger.error(`Failed to fetch credential ${credentialId}:`, error);
          return {
            success: false,
            message: 'Failed to fetch GitLab credentials',
            error: error.message,
          };
        }
      }

      if (!accessToken) {
        return {
          success: false,
          message: 'GitLab access token is required',
          error: 'Missing access token in trigger configuration',
        };
      }

      if (!projectId) {
        return {
          success: false,
          message: 'GitLab project ID is required',
          error: 'Missing project ID in trigger configuration',
        };
      }

      // Check if already active
      if (this.activeTriggers.has(workflowId)) {
        this.logger.log(`GitLab trigger already active for workflow ${workflowId}`);
        return {
          success: true,
          message: 'GitLab webhook already registered',
          data: { alreadyActive: true },
        };
      }

      const webhookUrl = this.generateWebhookUrl(workflowId);
      const secretToken = this.generateSecretToken(workflowId);

      // Create webhook
      const webhookResult = await this.createWebhook(
        serverUrl,
        accessToken,
        projectId,
        webhookUrl,
        secretToken,
        triggerId
      );

      if (!webhookResult.success) {
        return {
          success: false,
          message: 'Failed to create GitLab webhook',
          error: webhookResult.error,
        };
      }

      this.activeTriggers.set(workflowId, {
        webhookId: webhookResult.webhookId,
        projectId,
        serverUrl,
        secretToken,
        triggerId,
        activatedAt: new Date(),
      });

      // Store webhook info in database for persistence
      await this.storeWebhookInfo(workflowId, webhookResult.webhookId, secretToken, projectId, serverUrl);

      this.logger.log(`✅ GitLab trigger activated successfully for workflow ${workflowId}`);

      return {
        success: true,
        message: 'GitLab webhook registered successfully',
        data: {
          webhookUrl,
          webhookId: webhookResult.webhookId,
          projectId,
          triggerId,
          events: this.getEventsForTrigger(triggerId),
        },
      };
    } catch (error: any) {
      this.logger.error(`Failed to activate GitLab trigger for workflow ${workflowId}:`, error);
      return {
        success: false,
        message: 'Failed to activate GitLab trigger',
        error: error.message,
      };
    }
  }

  async deactivate(workflowId: string): Promise<TriggerDeactivationResult> {
    try {
      this.logger.log(`Deactivating GitLab trigger for workflow ${workflowId}`);

      const trigger = this.activeTriggers.get(workflowId);

      if (!trigger) {
        // Try to load from database
        const storedInfo = await this.getStoredWebhookInfo(workflowId);
        if (!storedInfo) {
          this.logger.warn(`No active GitLab trigger found for workflow ${workflowId}`);
          return {
            success: true,
            message: 'No active GitLab trigger found',
          };
        }

        // Delete webhook using stored info
        await this.deleteWebhookFromStorage(workflowId, storedInfo);
      } else {
        // Delete webhook from GitLab
        await this.deleteWebhook(workflowId, trigger);
      }

      this.activeTriggers.delete(workflowId);
      await this.deleteStoredWebhookInfo(workflowId);

      this.logger.log(`✅ GitLab trigger deactivated successfully for workflow ${workflowId}`);

      return {
        success: true,
        message: 'GitLab webhook deleted successfully',
      };
    } catch (error: any) {
      this.logger.error(`Failed to deactivate GitLab trigger for workflow ${workflowId}:`, error);
      this.activeTriggers.delete(workflowId);

      return {
        success: false,
        message: 'Failed to deactivate GitLab trigger (removed locally)',
      };
    }
  }

  async getStatus(workflowId: string): Promise<TriggerStatus> {
    const trigger = this.activeTriggers.get(workflowId);

    if (!trigger) {
      return {
        active: false,
        type: TriggerType.GITLAB,
        message: 'GitLab trigger not active',
      };
    }

    return {
      active: true,
      type: TriggerType.GITLAB,
      message: 'GitLab webhook active',
      metadata: {
        webhookId: trigger.webhookId,
        projectId: trigger.projectId,
        serverUrl: trigger.serverUrl,
        triggerId: trigger.triggerId,
        activatedAt: trigger.activatedAt,
      },
    };
  }

  getTriggerType(): TriggerType {
    return TriggerType.GITLAB;
  }

  validateSecretToken(workflowId: string, providedToken: string | undefined): boolean {
    const trigger = this.activeTriggers.get(workflowId);

    if (!trigger) {
      this.logger.warn(`No active trigger found for workflow ${workflowId}`);
      return false;
    }

    if (!providedToken) {
      this.logger.warn(`No secret token provided for workflow ${workflowId}`);
      return false;
    }

    const expectedBuffer = Buffer.from(trigger.secretToken);
    const providedBuffer = Buffer.from(providedToken);

    if (expectedBuffer.byteLength !== providedBuffer.byteLength) {
      return false;
    }

    return crypto.timingSafeEqual(expectedBuffer, providedBuffer);
  }

  getActiveTrigger(workflowId: string): ActiveTrigger | undefined {
    return this.activeTriggers.get(workflowId);
  }

  private async createWebhook(
    serverUrl: string,
    accessToken: string,
    projectId: string,
    webhookUrl: string,
    secretToken: string,
    triggerId: string
  ): Promise<{ success: boolean; webhookId?: number; error?: string }> {
    try {
      const events = this.getEventsForTrigger(triggerId);
      const apiUrl = `${serverUrl}/api/v4/projects/${encodeURIComponent(projectId)}/hooks`;

      const webhookConfig: any = {
        url: webhookUrl,
        token: secretToken,
        ...events,
      };

      const response = await axios.post(apiUrl, webhookConfig, {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
      });

      return {
        success: true,
        webhookId: response.data.id,
      };
    } catch (error: any) {
      this.logger.error('Failed to create GitLab webhook:', error);
      return {
        success: false,
        error: error.response?.data?.message || error.message,
      };
    }
  }

  private async deleteWebhook(workflowId: string, trigger: ActiveTrigger): Promise<void> {
    try {
      const credentialId = await this.getCredentialIdForWorkflow(workflowId);
      if (!credentialId) {
        this.logger.warn('No credential found for webhook deletion');
        return;
      }

      const credentials = await this.getDecryptedCredentials(credentialId);
      if (!credentials) return;

      const apiUrl = `${trigger.serverUrl}/api/v4/projects/${encodeURIComponent(trigger.projectId)}/hooks/${trigger.webhookId}`;

      await axios.delete(apiUrl, {
        headers: {
          'Authorization': `Bearer ${credentials.accessToken || credentials.access_token}`,
        },
      });

      this.logger.debug('GitLab webhook deleted successfully');
    } catch (error: any) {
      this.logger.error('Failed to delete GitLab webhook:', error);
      throw error;
    }
  }

  private async deleteWebhookFromStorage(workflowId: string, storedInfo: any): Promise<void> {
    try {
      const credentialId = await this.getCredentialIdForWorkflow(workflowId);
      if (!credentialId) return;

      const credentials = await this.getDecryptedCredentials(credentialId);
      if (!credentials) return;

      const apiUrl = `${storedInfo.serverUrl}/api/v4/projects/${encodeURIComponent(storedInfo.projectId)}/hooks/${storedInfo.webhookId}`;

      await axios.delete(apiUrl, {
        headers: {
          'Authorization': `Bearer ${credentials.accessToken || credentials.access_token}`,
        },
      });
    } catch (error) {
      this.logger.error('Failed to delete webhook from storage:', error);
    }
  }

  private getEventsForTrigger(triggerId: string): Record<string, boolean> {
    const eventMap: Record<string, Record<string, boolean>> = {
      'on_push': { push_events: true },
      'on_issue': { issues_events: true },
      'on_merge_request': { merge_requests_events: true },
      'on_pipeline': { pipeline_events: true },
      'on_release': { releases_events: true },
      'on_tag_push': { tag_push_events: true },
      'on_wiki_page': { wiki_page_events: true },
      'on_comment': { note_events: true },
    };

    return eventMap[triggerId] || { push_events: true };
  }

  private generateWebhookUrl(workflowId: string): string {
    const baseUrl = this.configService.get<string>('APP_URL') || 'http://localhost:3000';
    const cleanBaseUrl = baseUrl.replace(/\/$/, '');
    return `${cleanBaseUrl}/api/v1/webhooks/gitlab/${workflowId}`;
  }

  private generateSecretToken(workflowId: string): string {
    return crypto.randomBytes(32).toString('hex');
  }

  private async storeWebhookInfo(
    workflowId: string,
    webhookId: number,
    secretToken: string,
    projectId: string,
    serverUrl: string
  ): Promise<void> {
    try {
      const query = `
        UPDATE workflows
        SET metadata = COALESCE(metadata, '{}'::jsonb) || $2::jsonb
        WHERE id = $1
      `;

      const webhookInfo = {
        gitlab_webhook: {
          webhookId,
          secretToken,
          projectId,
          serverUrl,
        },
      };

      await this.platformService.query(query, [workflowId, JSON.stringify(webhookInfo)]);
    } catch (error) {
      this.logger.error('Failed to store webhook info:', error);
    }
  }

  private async getStoredWebhookInfo(workflowId: string): Promise<any | null> {
    try {
      const query = `
        SELECT metadata->'gitlab_webhook' as webhook_info
        FROM workflows
        WHERE id = $1
      `;

      const result = await this.platformService.query(query, [workflowId]);
      return result.rows[0]?.webhook_info || null;
    } catch (error) {
      this.logger.error('Failed to get stored webhook info:', error);
      return null;
    }
  }

  private async deleteStoredWebhookInfo(workflowId: string): Promise<void> {
    try {
      const query = `
        UPDATE workflows
        SET metadata = metadata - 'gitlab_webhook'
        WHERE id = $1
      `;

      await this.platformService.query(query, [workflowId]);
    } catch (error) {
      this.logger.error('Failed to delete stored webhook info:', error);
    }
  }

  private async getCredentialIdForWorkflow(workflowId: string): Promise<string | null> {
    try {
      const query = `
        SELECT canvas FROM workflows WHERE id = $1
      `;

      const result = await this.platformService.query(query, [workflowId]);
      if (result.rows.length === 0) return null;

      const canvas = result.rows[0].canvas;
      const nodes = canvas?.nodes || [];
      const triggerNode = nodes.find(
        (node: any) =>
          node.type === 'CONNECTOR_TRIGGER' &&
          node.data?.connectorType === 'gitlab'
      );

      return triggerNode?.data?.credentialId || triggerNode?.data?.connectorConfigId || null;
    } catch (error) {
      this.logger.error('Failed to get credential ID:', error);
      return null;
    }
  }

  private async getDecryptedCredentials(credentialId: string): Promise<any | null> {
    try {
      const query = `
        SELECT credentials FROM connector_configs WHERE id = $1
      `;

      const result = await this.platformService.query(query, [credentialId]);
      if (result.rows.length === 0) return null;

      const credentials = result.rows[0].credentials;

      if (credentials && credentials.iv && (credentials.data || credentials.encrypted) && credentials.authTag) {
        return this.decryptCredentialConfig(credentials);
      }

      return credentials;
    } catch (error) {
      this.logger.error('Failed to get credentials:', error);
      return null;
    }
  }

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
