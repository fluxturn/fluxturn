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

interface JiraTriggerConfig {
  email?: string;
  apiToken?: string;
  domain?: string;
  triggerId?: string;
  projectKey?: string;
  jqlFilter?: string;
  actionParams?: {
    email?: string;
    apiToken?: string;
    domain?: string;
    triggerId?: string;
    projectKey?: string;
    jqlFilter?: string;
  };
  connectorConfigId?: string;
  credentialId?: string;
}

interface ActiveTrigger {
  email: string;
  apiToken: string;
  domain: string;
  webhookUrl: string;
  webhookId?: string;
  triggerId: string;
  projectKey?: string;
  jqlFilter?: string;
  activatedAt: Date;
}

/**
 * Jira Trigger Service
 *
 * Manages Jira webhook subscriptions for workflow triggers.
 * Jira Cloud uses webhooks to notify of events like issue creation, updates, comments, etc.
 *
 * Supported Triggers (11 total):
 * - issue_created, issue_updated, issue_deleted
 * - comment_created, comment_updated, comment_deleted
 * - sprint_created, sprint_started, sprint_closed
 * - project_created, project_updated
 * - worklog_created
 *
 * Jira Webhook Flow:
 * 1. Register webhook via REST API with events and JQL filter
 * 2. Jira sends POST requests to callback URL when events occur
 * 3. Events include issue data, user info, and changelog
 */
@Injectable()
export class JiraTriggerService implements ITriggerService, OnModuleInit {
  private readonly logger = new Logger(JiraTriggerService.name);
  private readonly activeTriggers = new Map<string, ActiveTrigger>();

  constructor(
    private readonly configService: ConfigService,
    private readonly platformService: PlatformService
  ) {}

  async onModuleInit() {
    this.logger.log('Initializing Jira Trigger Service...');
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

          const jiraTriggerNodes = nodes.filter(
            (node: any) =>
              node.type === 'CONNECTOR_TRIGGER' &&
              node.data?.connectorType === 'jira'
          );

          if (jiraTriggerNodes.length === 0) {
            continue;
          }

          const workflowId = row.id;
          const triggerNode = jiraTriggerNodes[0];
          const triggerConfig = {
            ...triggerNode.data,
            ...triggerNode.data?.actionParams,
            credentialId: triggerNode.data?.credentialId || triggerNode.data?.connectorConfigId,
          };

          this.logger.debug(`Restoring Jira trigger for workflow ${workflowId}`);

          const activationResult = await this.activate(workflowId, triggerConfig);

          if (activationResult.success) {
            restoredCount++;
            this.logger.log(`Restored Jira trigger for workflow ${workflowId}`);
          } else {
            this.logger.warn(`Failed to restore workflow ${workflowId}: ${activationResult.message}`);
          }
        } catch (error) {
          this.logger.error(`Error restoring workflow ${row.id}:`, error.message);
        }
      }

      if (restoredCount > 0) {
        this.logger.log(`Successfully restored ${restoredCount} Jira workflow(s)`);
      } else {
        this.logger.log('No active Jira workflows to restore');
      }
    } catch (error) {
      this.logger.error('Failed to restore active workflows:', error);
      throw error;
    }
  }

  async activate(workflowId: string, triggerConfig: JiraTriggerConfig): Promise<TriggerActivationResult> {
    try {
      this.logger.log(`Activating Jira trigger for workflow ${workflowId}`);
      this.logger.debug(`Trigger config: ${JSON.stringify(triggerConfig)}`);

      let email = triggerConfig.email || triggerConfig.actionParams?.email;
      let apiToken = triggerConfig.apiToken || triggerConfig.actionParams?.apiToken;
      let domain = triggerConfig.domain || triggerConfig.actionParams?.domain;

      const credentialId = triggerConfig.credentialId || triggerConfig.connectorConfigId;

      if ((!email || !apiToken || !domain) && credentialId) {
        this.logger.log(`Fetching credentials from: ${credentialId}`);
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
                email = email || decryptedCredentials.email;
                apiToken = apiToken || decryptedCredentials.apiToken || decryptedCredentials.password;
                domain = domain || decryptedCredentials.domain;
              } catch (decryptError) {
                this.logger.error('Failed to decrypt credentials:', decryptError);
                return {
                  success: false,
                  message: 'Failed to decrypt credentials',
                  error: decryptError.message,
                };
              }
            } else {
              email = email || credentials?.email;
              apiToken = apiToken || credentials?.apiToken || credentials?.password;
              domain = domain || credentials?.domain;
            }
          }
        } catch (error) {
          this.logger.error(`Failed to fetch credential ${credentialId}:`, error);
          return {
            success: false,
            message: 'Failed to fetch credentials',
            error: error.message,
          };
        }
      }

      if (!email) {
        return {
          success: false,
          message: 'Email is required for Jira trigger',
          error: 'Missing email in trigger configuration',
        };
      }

      if (!apiToken) {
        return {
          success: false,
          message: 'API Token is required for Jira trigger',
          error: 'Missing API token in trigger configuration',
        };
      }

      if (!domain) {
        return {
          success: false,
          message: 'Jira domain is required for Jira trigger',
          error: 'Missing domain in trigger configuration',
        };
      }

      const triggerId = triggerConfig.triggerId ||
                       triggerConfig.actionParams?.triggerId ||
                       'issue_created';

      const projectKey = triggerConfig.projectKey ||
                        triggerConfig.actionParams?.projectKey;

      const jqlFilter = triggerConfig.jqlFilter ||
                       triggerConfig.actionParams?.jqlFilter;

      const appUrl = this.configService.get<string>('APP_URL');
      if (!appUrl) {
        return {
          success: false,
          message: 'APP_URL not configured in environment',
          error: 'APP_URL environment variable is required',
        };
      }

      const webhookUrl = `${appUrl}/api/v1/webhooks/jira/${workflowId}`;
      const events = this.getEventsForTrigger(triggerId);

      this.logger.log(`Subscribing to Jira events: ${events.join(', ')} for trigger: ${triggerId}`);

      try {
        const webhookId = await this.registerWebhook(
          domain,
          email,
          apiToken,
          webhookUrl,
          events,
          jqlFilter || (projectKey ? `project = ${projectKey}` : undefined)
        );

        this.activeTriggers.set(workflowId, {
          email,
          apiToken,
          domain,
          webhookUrl,
          webhookId,
          triggerId,
          projectKey,
          jqlFilter,
          activatedAt: new Date(),
        });

        this.logger.log(`Jira trigger activated successfully for workflow ${workflowId}`);

        return {
          success: true,
          message: 'Jira webhook activated successfully',
          data: {
            webhookUrl,
            webhookId,
            triggerId,
            events,
            projectKey,
            ...this.getSetupInstructions(workflowId, webhookUrl, events),
          },
        };
      } catch (error: any) {
        this.logger.error('Failed to register webhook:', error.message);
        this.logger.error('Jira API Error:', JSON.stringify(error.response?.data, null, 2));

        const errorMessage = error.response?.data?.errorMessages?.[0] ||
                            error.response?.data?.message ||
                            error.message;

        return {
          success: false,
          message: 'Failed to register Jira webhook',
          error: errorMessage,
        };
      }
    } catch (error: any) {
      this.logger.error(`Error activating Jira trigger for workflow ${workflowId}:`, error);
      return {
        success: false,
        message: 'Failed to activate Jira trigger',
        error: error.message,
      };
    }
  }

  private getEventsForTrigger(triggerId: string): string[] {
    const eventMap: Record<string, string[]> = {
      'issue_created': ['jira:issue_created'],
      'issue_updated': ['jira:issue_updated'],
      'issue_deleted': ['jira:issue_deleted'],
      'comment_created': ['comment_created'],
      'comment_updated': ['comment_updated'],
      'comment_deleted': ['comment_deleted'],
      'sprint_created': ['sprint_created'],
      'sprint_started': ['sprint_started'],
      'sprint_closed': ['sprint_closed'],
      'project_created': ['project_created'],
      'project_updated': ['project_updated'],
      'worklog_created': ['worklog_created'],
    };

    return eventMap[triggerId] || ['jira:issue_created'];
  }

  private async registerWebhook(
    domain: string,
    email: string,
    apiToken: string,
    callbackUrl: string,
    events: string[],
    jqlFilter?: string
  ): Promise<string | undefined> {
    const baseUrl = `https://${domain}/rest/api/3`;
    const auth = Buffer.from(`${email}:${apiToken}`).toString('base64');

    const webhookPayload: any = {
      name: `Fluxturn Webhook - ${new Date().toISOString()}`,
      url: callbackUrl,
      events: events,
      excludeBody: false,
    };

    if (jqlFilter) {
      webhookPayload.filters = {
        'issue-related-events-section': jqlFilter,
      };
    }

    try {
      const response = await axios.post(
        `${baseUrl}/webhook`,
        webhookPayload,
        {
          headers: {
            'Authorization': `Basic ${auth}`,
            'Content-Type': 'application/json',
            'Accept': 'application/json',
          },
        }
      );

      return response.data?.webhookRegistrationResult?.[0]?.createdWebhookId?.toString() ||
             response.data?.id?.toString();
    } catch (error: any) {
      // If webhook API fails, log but still allow activation
      // Some Jira instances require manual webhook setup
      if (error.response?.status === 403 || error.response?.status === 404) {
        this.logger.warn('Webhook API not available - manual setup may be required');
        return undefined;
      }
      throw error;
    }
  }

  async deactivate(workflowId: string): Promise<TriggerDeactivationResult> {
    try {
      this.logger.log(`Deactivating Jira trigger for workflow ${workflowId}`);

      const trigger = this.activeTriggers.get(workflowId);

      if (!trigger) {
        return {
          success: true,
          message: 'Jira trigger was not active',
        };
      }

      if (trigger.webhookId) {
        try {
          await this.deleteWebhook(trigger.domain, trigger.email, trigger.apiToken, trigger.webhookId);
          this.logger.log('Deleted Jira webhook');
        } catch (error: any) {
          this.logger.warn('Failed to delete webhook:', error.message);
        }
      }

      this.activeTriggers.delete(workflowId);

      this.logger.log(`Jira trigger deactivated for workflow ${workflowId}`);

      return {
        success: true,
        message: 'Jira trigger deactivated successfully',
      };
    } catch (error: any) {
      this.logger.error(`Error deactivating Jira trigger:`, error);
      return {
        success: false,
        message: 'Failed to deactivate Jira trigger',
      };
    }
  }

  private async deleteWebhook(
    domain: string,
    email: string,
    apiToken: string,
    webhookId: string
  ): Promise<void> {
    const baseUrl = `https://${domain}/rest/api/3`;
    const auth = Buffer.from(`${email}:${apiToken}`).toString('base64');

    await axios.delete(`${baseUrl}/webhook/${webhookId}`, {
      headers: {
        'Authorization': `Basic ${auth}`,
        'Content-Type': 'application/json',
      },
    });
  }

  async getStatus(workflowId: string): Promise<TriggerStatus> {
    const trigger = this.activeTriggers.get(workflowId);

    return {
      active: !!trigger,
      type: TriggerType.JIRA,
      message: trigger
        ? `Active - Webhook URL: ${trigger.webhookUrl}`
        : 'Not active',
      metadata: trigger
        ? {
            webhookUrl: trigger.webhookUrl,
            webhookId: trigger.webhookId,
            triggerId: trigger.triggerId,
            domain: trigger.domain,
            projectKey: trigger.projectKey,
            activatedAt: trigger.activatedAt,
          }
        : undefined,
    };
  }

  getTriggerType(): TriggerType {
    return TriggerType.JIRA;
  }

  getActiveTrigger(workflowId: string): ActiveTrigger | undefined {
    return this.activeTriggers.get(workflowId);
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

  private getSetupInstructions(workflowId: string, webhookUrl: string, events: string[]): any {
    return {
      steps: [
        '1. Go to Jira Settings -> System -> Webhooks (or use the automatic registration)',
        `2. Create a new webhook with URL: ${webhookUrl}`,
        `3. Select events: ${events.join(', ')}`,
        '4. Optionally add JQL filter to limit which issues trigger the webhook',
        '5. Save the webhook',
      ],
      note: 'Webhooks can be registered automatically via Jira REST API or manually via Jira admin',
      webhookUrl,
      events,
    };
  }

  processWebhookEvent(workflowId: string, event: any): any {
    const trigger = this.activeTriggers.get(workflowId);

    if (!trigger) {
      this.logger.warn(`No active trigger found for workflow ${workflowId}`);
      return null;
    }

    const webhookEvent = event.webhookEvent || event.eventType;

    switch (trigger.triggerId) {
      case 'issue_created':
      case 'issue_updated':
      case 'issue_deleted':
        return {
          event: trigger.triggerId,
          issue: {
            id: event.issue?.id,
            key: event.issue?.key,
            self: event.issue?.self,
            fields: event.issue?.fields,
          },
          user: event.user,
          changelog: event.changelog,
          timestamp: event.timestamp || new Date().toISOString(),
        };

      case 'comment_created':
      case 'comment_updated':
      case 'comment_deleted':
        return {
          event: trigger.triggerId,
          comment: event.comment,
          issue: {
            id: event.issue?.id,
            key: event.issue?.key,
          },
          user: event.user,
          timestamp: event.timestamp || new Date().toISOString(),
        };

      case 'sprint_created':
      case 'sprint_started':
      case 'sprint_closed':
        return {
          event: trigger.triggerId,
          sprint: event.sprint,
          timestamp: event.timestamp || new Date().toISOString(),
        };

      case 'project_created':
      case 'project_updated':
        return {
          event: trigger.triggerId,
          project: event.project,
          user: event.user,
          timestamp: event.timestamp || new Date().toISOString(),
        };

      case 'worklog_created':
        return {
          event: trigger.triggerId,
          worklog: event.worklog,
          issue: {
            id: event.issue?.id,
            key: event.issue?.key,
          },
          user: event.user,
          timestamp: event.timestamp || new Date().toISOString(),
        };

      default:
        return event;
    }
  }

  shouldTrigger(workflowId: string, event: any): boolean {
    const trigger = this.activeTriggers.get(workflowId);

    if (!trigger) {
      return false;
    }

    const webhookEvent = event.webhookEvent || event.eventType;
    const expectedEvents = this.getEventsForTrigger(trigger.triggerId);

    if (!expectedEvents.includes(webhookEvent)) {
      return false;
    }

    // Check project filter
    if (trigger.projectKey && event.issue?.fields?.project?.key) {
      if (event.issue.fields.project.key !== trigger.projectKey) {
        return false;
      }
    }

    return true;
  }
}
