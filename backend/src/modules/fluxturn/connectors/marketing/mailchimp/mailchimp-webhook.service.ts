import { Injectable, Logger, Inject, forwardRef } from '@nestjs/common';
import { PlatformService } from '../../../../database/platform.service';
import { ConnectorsService } from '../../connectors.service';
import axios from 'axios';

/**
 * Mailchimp Webhook Management Service
 * Manages Mailchimp webhook lifecycle for workflow triggers
 *
 * Responsibilities:
 * 1. Create webhooks on Mailchimp when workflow is activated
 * 2. Delete webhooks when workflow is deactivated
 * 3. Store webhook IDs for tracking
 *
 * Mailchimp Webhook API:
 * - POST /lists/{list_id}/webhooks - Create webhook
 * - GET /lists/{list_id}/webhooks - List webhooks
 * - DELETE /lists/{list_id}/webhooks/{webhook_id} - Delete webhook
 *
 * Mailchimp Webhook Events:
 * - subscribe: New subscriber added
 * - unsubscribe: Subscriber removed
 * - profile: Profile updated
 * - cleaned: Email cleaned (hard bounce)
 * - upemail: Email address changed
 * - campaign: Campaign sent or cancelled
 */
@Injectable()
export class MailchimpWebhookService {
  private readonly logger = new Logger(MailchimpWebhookService.name);

  constructor(
    private readonly platformService: PlatformService,
    @Inject(forwardRef(() => ConnectorsService))
    private readonly connectorsService: ConnectorsService,
  ) {}

  /**
   * Build the Mailchimp API base URL
   */
  private getMailchimpApiUrl(apiKey: string): string {
    // Extract datacenter from API key (format: key-dc)
    const parts = apiKey.split('-');
    const dc = parts.length > 1 ? parts[parts.length - 1] : 'us1';
    return `https://${dc}.api.mailchimp.com/3.0`;
  }

  /**
   * Create Mailchimp webhook for a workflow
   */
  async createWebhook(workflowId: string): Promise<any> {
    this.logger.log(`Creating Mailchimp webhook for workflow ${workflowId}`);

    try {
      const workflow = await this.getWorkflow(workflowId);
      if (!workflow) {
        throw new Error('Workflow not found');
      }

      const mailchimpTriggers = this.findMailchimpTriggers(workflow);
      if (mailchimpTriggers.length === 0) {
        this.logger.warn(`Workflow ${workflowId} has no Mailchimp triggers`);
        return { success: false, message: 'No Mailchimp triggers found' };
      }

      const results = [];

      for (const trigger of mailchimpTriggers) {
        try {
          const result = await this.createWebhookForTrigger(workflowId, trigger);
          results.push(result);
        } catch (error) {
          this.logger.error(`Failed to create webhook for trigger ${trigger.id}:`, error);
          results.push({
            success: false,
            triggerId: trigger.id,
            error: error.message,
          });
        }
      }

      return {
        success: true,
        webhooks: results,
      };
    } catch (error) {
      this.logger.error(`Failed to create Mailchimp webhook for workflow ${workflowId}:`, error);
      throw error;
    }
  }

  /**
   * Delete Mailchimp webhook for a workflow
   */
  async deleteWebhook(workflowId: string): Promise<any> {
    this.logger.log(`Deleting Mailchimp webhook for workflow ${workflowId}`);

    try {
      const workflow = await this.getWorkflow(workflowId);
      if (!workflow) {
        throw new Error('Workflow not found');
      }

      const mailchimpTriggers = this.findMailchimpTriggers(workflow);
      if (mailchimpTriggers.length === 0) {
        this.logger.warn(`Workflow ${workflowId} has no Mailchimp triggers`);
        return { success: true, message: 'No webhooks to delete' };
      }

      const results = [];

      for (const trigger of mailchimpTriggers) {
        try {
          const result = await this.deleteWebhookForTrigger(workflowId, trigger);
          results.push(result);
        } catch (error) {
          this.logger.error(`Failed to delete webhook for trigger ${trigger.id}:`, error);
          results.push({
            success: false,
            triggerId: trigger.id,
            error: error.message,
          });
        }
      }

      return {
        success: true,
        webhooks: results,
      };
    } catch (error) {
      this.logger.error(`Failed to delete Mailchimp webhook for workflow ${workflowId}:`, error);
      throw error;
    }
  }

  /**
   * Create webhook for a specific trigger node
   */
  private async createWebhookForTrigger(workflowId: string, trigger: any): Promise<any> {
    const triggerParams = trigger.data?.triggerParams || trigger.data?.actionParams || {};
    const credentialId = trigger.data?.credentialId || trigger.data?.connectorConfigId;

    if (!credentialId) {
      throw new Error('No credential ID configured for trigger');
    }

    // Get the trigger ID and list ID
    const triggerId = trigger.data?.triggerId || triggerParams.triggerId;
    const listId = triggerParams.listId || triggerParams.list_id;

    if (!triggerId) {
      throw new Error('Trigger ID is required for Mailchimp trigger');
    }

    if (!listId) {
      throw new Error('List ID is required for Mailchimp trigger');
    }

    // Get Mailchimp credentials
    const credentials = await this.connectorsService.getConnectorCredentials(credentialId);
    const apiKey = credentials.apiKey || credentials.api_key;

    if (!apiKey) {
      throw new Error('Mailchimp API key is required');
    }

    const apiUrl = this.getMailchimpApiUrl(apiKey);

    // Build webhook URL
    const webhookUrl = this.buildWebhookUrl(workflowId);
    this.logger.log(`Mailchimp webhook URL: ${webhookUrl}`);

    // Map trigger ID to Mailchimp events
    const events = this.mapTriggerIdToEvents(triggerId);
    this.logger.log(`Mailchimp events for trigger ${triggerId}: ${JSON.stringify(events)}`);

    // Get sources (user, admin, api)
    const sources = this.getEventSources(triggerParams.sources);

    // Check if webhook already exists
    const existingWebhook = await this.findExistingWebhook(listId, webhookUrl, apiKey);

    if (existingWebhook) {
      this.logger.log(`Webhook already exists for list ${listId}`);
      return {
        success: true,
        webhookId: existingWebhook.id,
        listId,
        url: webhookUrl,
        existing: true,
      };
    }

    // Create new webhook
    const webhookData = {
      url: webhookUrl,
      events: events,
      sources: sources,
    };

    this.logger.log(`Creating Mailchimp webhook with data: ${JSON.stringify(webhookData)}`);

    try {
      const response = await axios.post(
        `${apiUrl}/lists/${listId}/webhooks`,
        webhookData,
        {
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Basic ${Buffer.from(`anystring:${apiKey}`).toString('base64')}`,
          },
        },
      );

      const webhookId = response.data.id;

      // Store webhook ID in trigger data
      await this.storeWebhookData(workflowId, trigger.id, webhookId, listId);

      this.logger.log(`Created Mailchimp webhook ${webhookId} for list ${listId}`);

      return {
        success: true,
        webhookId,
        listId,
        events,
        url: webhookUrl,
      };
    } catch (error) {
      const errorMessage = error.response?.data || error.message;
      this.logger.error(`Mailchimp API error: ${JSON.stringify(errorMessage)}`);
      throw new Error(`Mailchimp webhook creation failed: ${JSON.stringify(errorMessage)}`);
    }
  }

  /**
   * Delete webhook for a specific trigger node
   */
  private async deleteWebhookForTrigger(workflowId: string, trigger: any): Promise<any> {
    const credentialId = trigger.data?.credentialId || trigger.data?.connectorConfigId;
    const webhookId = trigger.data?.webhookId;
    const listId = trigger.data?.listId || trigger.data?.triggerParams?.listId;

    if (!webhookId || !listId) {
      this.logger.warn(`No webhook ID or list ID found for trigger ${trigger.id}`);
      return { success: true, message: 'No webhook to delete' };
    }

    if (!credentialId) {
      throw new Error('No credential ID configured for trigger');
    }

    // Get Mailchimp credentials
    const credentials = await this.connectorsService.getConnectorCredentials(credentialId);
    const apiKey = credentials.apiKey || credentials.api_key;

    if (!apiKey) {
      throw new Error('Mailchimp API key is required');
    }

    const apiUrl = this.getMailchimpApiUrl(apiKey);

    try {
      await axios.delete(
        `${apiUrl}/lists/${listId}/webhooks/${webhookId}`,
        {
          headers: {
            'Authorization': `Basic ${Buffer.from(`anystring:${apiKey}`).toString('base64')}`,
          },
        },
      );

      // Clear webhook data from trigger
      await this.clearWebhookData(workflowId, trigger.id);

      this.logger.log(`Deleted Mailchimp webhook ${webhookId}`);

      return {
        success: true,
        webhookId,
      };
    } catch (error) {
      if (error.response?.status === 404) {
        this.logger.warn(`Webhook ${webhookId} not found, already deleted`);
        await this.clearWebhookData(workflowId, trigger.id);
        return { success: true, message: 'Webhook already deleted' };
      }
      throw error;
    }
  }

  /**
   * Map trigger ID to Mailchimp event types
   * Mailchimp webhook events object has boolean properties
   */
  private mapTriggerIdToEvents(triggerId: string): Record<string, boolean> {
    const allEvents = {
      subscribe: false,
      unsubscribe: false,
      profile: false,
      cleaned: false,
      upemail: false,
      campaign: false,
    };

    const mapping: Record<string, string[]> = {
      'subscriber_added': ['subscribe'],
      'subscriber_removed': ['unsubscribe'],
      'subscriber_cleaned': ['cleaned'],
      'subscriber_profile_updated': ['profile'],
      'subscriber_email_changed': ['upemail'],
      'campaign_sent': ['campaign'],
      'any_event': ['subscribe', 'unsubscribe', 'profile', 'cleaned', 'upemail', 'campaign'],
    };

    const events = mapping[triggerId] || [];

    // Enable matching events
    events.forEach(event => {
      if (event in allEvents) {
        allEvents[event] = true;
      }
    });

    return allEvents;
  }

  /**
   * Get event sources configuration
   */
  private getEventSources(sourcesConfig: string): Record<string, boolean> {
    const allSources = {
      user: true,
      admin: true,
      api: true,
    };

    if (!sourcesConfig || sourcesConfig === 'all') {
      return allSources;
    }

    // If specific source, enable only that one
    return {
      user: sourcesConfig === 'user',
      admin: sourcesConfig === 'admin',
      api: sourcesConfig === 'api',
    };
  }

  /**
   * Find existing webhook by URL
   */
  private async findExistingWebhook(listId: string, webhookUrl: string, apiKey: string): Promise<any> {
    const apiUrl = this.getMailchimpApiUrl(apiKey);

    try {
      const response = await axios.get(
        `${apiUrl}/lists/${listId}/webhooks`,
        {
          headers: {
            'Authorization': `Basic ${Buffer.from(`anystring:${apiKey}`).toString('base64')}`,
          },
        },
      );

      if (!response.data.webhooks) {
        return null;
      }

      return response.data.webhooks.find((hook: any) => hook.url === webhookUrl);
    } catch (error) {
      this.logger.error('Failed to fetch existing webhooks:', error);
      return null;
    }
  }

  /**
   * Build webhook URL for workflow
   */
  private buildWebhookUrl(workflowId: string): string {
    const baseUrl = process.env.APP_URL || process.env.BACKEND_URL || 'http://localhost:3000';
    const apiPrefix = process.env.API_PREFIX || 'api/v1';
    return `${baseUrl}/${apiPrefix}/webhooks/mailchimp/${workflowId}`;
  }

  /**
   * Store webhook data in workflow canvas
   */
  private async storeWebhookData(
    workflowId: string,
    triggerId: string,
    webhookId: string,
    listId: string,
  ): Promise<void> {
    const query = `
      UPDATE workflows
      SET canvas = jsonb_set(
        jsonb_set(
          canvas,
          '{nodes}',
          (
            SELECT jsonb_agg(
              CASE
                WHEN node->>'id' = $2
                THEN jsonb_set(
                  jsonb_set(node, '{data,webhookId}', to_jsonb($3::text)),
                  '{data,listId}', to_jsonb($4::text)
                )
                ELSE node
              END
            )
            FROM jsonb_array_elements(canvas->'nodes') AS node
          )
        ),
        '{nodes}',
        (
          SELECT jsonb_agg(
            CASE
              WHEN node->>'id' = $2
              THEN jsonb_set(node, '{data,webhookId}', to_jsonb($3::text))
              ELSE node
            END
          )
          FROM jsonb_array_elements(canvas->'nodes') AS node
        )
      )
      WHERE id = $1
    `;

    // Simpler version - just store webhookId
    const simpleQuery = `
      UPDATE workflows
      SET canvas = jsonb_set(
        canvas,
        '{nodes}',
        (
          SELECT jsonb_agg(
            CASE
              WHEN node->>'id' = $2
              THEN jsonb_set(node, '{data,webhookId}', to_jsonb($3::text))
              ELSE node
            END
          )
          FROM jsonb_array_elements(canvas->'nodes') AS node
        )
      )
      WHERE id = $1
    `;

    await this.platformService.query(simpleQuery, [workflowId, triggerId, webhookId]);
  }

  /**
   * Clear webhook data from workflow canvas
   */
  private async clearWebhookData(workflowId: string, triggerId: string): Promise<void> {
    const query = `
      UPDATE workflows
      SET canvas = jsonb_set(
        canvas,
        '{nodes}',
        (
          SELECT jsonb_agg(
            CASE
              WHEN node->>'id' = $2
              THEN node #- '{data,webhookId}'
              ELSE node
            END
          )
          FROM jsonb_array_elements(canvas->'nodes') AS node
        )
      )
      WHERE id = $1
    `;

    await this.platformService.query(query, [workflowId, triggerId]);
  }

  /**
   * Get workflow from database
   */
  private async getWorkflow(workflowId: string): Promise<any> {
    const query = `SELECT * FROM workflows WHERE id = $1`;
    const result = await this.platformService.query(query, [workflowId]);
    return result.rows[0];
  }

  /**
   * Find Mailchimp trigger nodes in workflow
   */
  private findMailchimpTriggers(workflow: any): any[] {
    const canvas = workflow.workflow?.canvas || workflow.canvas;

    if (!canvas || !canvas.nodes || canvas.nodes.length === 0) {
      return [];
    }

    return canvas.nodes.filter(
      (node: any) =>
        node.type === 'MAILCHIMP_TRIGGER' ||
        (node.type === 'CONNECTOR_TRIGGER' && node.data?.connectorType === 'mailchimp'),
    );
  }
}
