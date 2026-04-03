import { Injectable, Logger, Inject, forwardRef } from '@nestjs/common';
import { PlatformService } from '../../../../database/platform.service';
import { ConnectorsService } from '../../connectors.service';
import axios from 'axios';

/**
 * Pipedrive Webhook Management Service
 * Manages Pipedrive webhook lifecycle for workflow triggers
 *
 * Responsibilities:
 * 1. Create webhooks on Pipedrive when workflow is activated
 * 2. Delete webhooks when workflow is deactivated
 * 3. Store webhook IDs for tracking
 *
 * Pipedrive Webhook API:
 * - POST /webhooks - Create webhook
 * - GET /webhooks - List webhooks
 * - DELETE /webhooks/:id - Delete webhook
 *
 * Pipedrive Webhook Events format (API v2.0): {action}.{object}
 * Actions: create, change, delete (NOT added, updated, deleted)
 * - create.deal, change.deal, delete.deal
 * - create.person, change.person, delete.person
 * - create.organization, change.organization, delete.organization
 * - create.activity, change.activity, delete.activity
 * - create.note, change.note, delete.note
 * - create.pipeline, create.stage
 * - create.product, change.product
 * - create.user
 * - * (wildcard for all events)
 */
@Injectable()
export class PipedriveWebhookService {
  private readonly logger = new Logger(PipedriveWebhookService.name);
  private readonly pipedriveApiUrl = 'https://api.pipedrive.com/v1';

  constructor(
    private readonly platformService: PlatformService,
    @Inject(forwardRef(() => ConnectorsService))
    private readonly connectorsService: ConnectorsService,
  ) {}

  /**
   * Create Pipedrive webhook for a workflow
   */
  async createWebhook(workflowId: string): Promise<any> {
    this.logger.log(`Creating Pipedrive webhook for workflow ${workflowId}`);

    try {
      const workflow = await this.getWorkflow(workflowId);
      if (!workflow) {
        throw new Error('Workflow not found');
      }

      const pipedriveTriggers = this.findPipedriveTriggers(workflow);
      if (pipedriveTriggers.length === 0) {
        this.logger.warn(`Workflow ${workflowId} has no Pipedrive triggers`);
        return { success: false, message: 'No Pipedrive triggers found' };
      }

      const results = [];

      for (const trigger of pipedriveTriggers) {
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
      this.logger.error(`Failed to create Pipedrive webhook for workflow ${workflowId}:`, error);
      throw error;
    }
  }

  /**
   * Delete Pipedrive webhook for a workflow
   */
  async deleteWebhook(workflowId: string): Promise<any> {
    this.logger.log(`Deleting Pipedrive webhook for workflow ${workflowId}`);

    try {
      const workflow = await this.getWorkflow(workflowId);
      if (!workflow) {
        throw new Error('Workflow not found');
      }

      const pipedriveTriggers = this.findPipedriveTriggers(workflow);
      if (pipedriveTriggers.length === 0) {
        this.logger.warn(`Workflow ${workflowId} has no Pipedrive triggers`);
        return { success: true, message: 'No webhooks to delete' };
      }

      const results = [];

      for (const trigger of pipedriveTriggers) {
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
      this.logger.error(`Failed to delete Pipedrive webhook for workflow ${workflowId}:`, error);
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

    // Get the trigger ID to determine event type
    const triggerId = trigger.data?.triggerId || triggerParams.triggerId;
    if (!triggerId) {
      throw new Error('Trigger ID is required for Pipedrive trigger');
    }

    // Get Pipedrive credentials
    const credentials = await this.connectorsService.getConnectorCredentials(credentialId);
    const apiToken = credentials.apiToken || credentials.api_token || credentials.accessToken;

    if (!apiToken) {
      throw new Error('Pipedrive API token is required');
    }

    // Build webhook URL
    const webhookUrl = this.buildWebhookUrl(workflowId);
    this.logger.log(`Pipedrive webhook URL: ${webhookUrl}`);

    // Map trigger ID to Pipedrive event type
    const eventType = this.mapTriggerIdToEventType(triggerId);
    this.logger.log(`Pipedrive event type for trigger ${triggerId}: ${eventType}`);

    // Check if webhook already exists for this event
    const existingWebhook = await this.findExistingWebhook(webhookUrl, eventType, apiToken);

    if (existingWebhook) {
      this.logger.log(`Webhook already exists for event ${eventType}`);
      return {
        success: true,
        webhookId: existingWebhook.id,
        eventType,
        url: webhookUrl,
        existing: true,
      };
    }

    // Create new webhook
    const webhookData = {
      subscription_url: webhookUrl,
      event_action: eventType.split('.')[0], // e.g., 'added', 'updated', 'deleted'
      event_object: eventType.split('.')[1], // e.g., 'deal', 'person', 'organization'
    };

    // For wildcard event, use '*' for both action and object
    if (eventType === '*') {
      webhookData.event_action = '*';
      webhookData.event_object = '*';
    }

    this.logger.log(`Creating Pipedrive webhook with data: ${JSON.stringify(webhookData)}`);

    try {
      const response = await axios.post(
        `${this.pipedriveApiUrl}/webhooks?api_token=${apiToken}`,
        webhookData,
        {
          headers: {
            'Content-Type': 'application/json',
          },
        },
      );

      if (!response.data.success) {
        throw new Error(response.data.error || 'Failed to create webhook');
      }

      const webhookId = response.data.data.id;

      // Store webhook ID in trigger data
      await this.storeWebhookId(workflowId, trigger.id, webhookId);

      this.logger.log(`Created Pipedrive webhook ${webhookId} for event ${eventType}`);

      return {
        success: true,
        webhookId,
        eventType,
        url: webhookUrl,
      };
    } catch (error) {
      // Log detailed error from Pipedrive API
      const errorMessage = error.response?.data || error.message;
      this.logger.error(`Pipedrive API error: ${JSON.stringify(errorMessage)}`);
      this.logger.error(`Webhook URL attempted: ${webhookUrl}`);
      throw new Error(`Pipedrive webhook creation failed: ${JSON.stringify(errorMessage)}`);
    }
  }

  /**
   * Delete webhook for a specific trigger node
   */
  private async deleteWebhookForTrigger(workflowId: string, trigger: any): Promise<any> {
    const credentialId = trigger.data?.credentialId || trigger.data?.connectorConfigId;
    const webhookId = trigger.data?.webhookId;

    if (!webhookId) {
      this.logger.warn(`No webhook ID found for trigger ${trigger.id}`);
      return { success: true, message: 'No webhook to delete' };
    }

    if (!credentialId) {
      throw new Error('No credential ID configured for trigger');
    }

    // Get Pipedrive credentials
    const credentials = await this.connectorsService.getConnectorCredentials(credentialId);
    const apiToken = credentials.apiToken || credentials.api_token || credentials.accessToken;

    if (!apiToken) {
      throw new Error('Pipedrive API token is required');
    }

    try {
      await axios.delete(`${this.pipedriveApiUrl}/webhooks/${webhookId}?api_token=${apiToken}`);

      // Clear webhook ID from trigger data
      await this.clearWebhookId(workflowId, trigger.id);

      this.logger.log(`Deleted Pipedrive webhook ${webhookId}`);

      return {
        success: true,
        webhookId,
      };
    } catch (error) {
      if (error.response?.status === 404 || error.response?.status === 410) {
        this.logger.warn(`Webhook ${webhookId} not found, already deleted`);
        await this.clearWebhookId(workflowId, trigger.id);
        return { success: true, message: 'Webhook already deleted' };
      }
      throw error;
    }
  }

  /**
   * Map trigger ID to Pipedrive event type
   * Pipedrive API v2.0 uses: create, change, delete (not added, updated, deleted)
   */
  private mapTriggerIdToEventType(triggerId: string): string {
    const mapping: Record<string, string> = {
      // Deal triggers
      'deal_created': 'create.deal',
      'deal_updated': 'change.deal',
      'deal_deleted': 'delete.deal',
      // Person triggers
      'person_created': 'create.person',
      'person_updated': 'change.person',
      'person_deleted': 'delete.person',
      // Organization triggers
      'organization_created': 'create.organization',
      'organization_updated': 'change.organization',
      'organization_deleted': 'delete.organization',
      // Activity triggers
      'activity_created': 'create.activity',
      'activity_updated': 'change.activity',
      'activity_deleted': 'delete.activity',
      // Note triggers
      'note_created': 'create.note',
      'note_updated': 'change.note',
      'note_deleted': 'delete.note',
      // Pipeline/Stage triggers
      'pipeline_created': 'create.pipeline',
      'stage_created': 'create.stage',
      // Product triggers
      'product_created': 'create.product',
      'product_updated': 'change.product',
      // User triggers
      'user_created': 'create.user',
      // Wildcard
      'any_event': '*',
    };

    return mapping[triggerId] || triggerId;
  }

  /**
   * Find existing webhook by callback URL and event type
   */
  private async findExistingWebhook(
    webhookUrl: string,
    eventType: string,
    apiToken: string,
  ): Promise<any> {
    try {
      const response = await axios.get(
        `${this.pipedriveApiUrl}/webhooks?api_token=${apiToken}`,
      );

      if (!response.data.success || !response.data.data) {
        return null;
      }

      const webhooks = response.data.data;

      // Parse event type
      const [eventAction, eventObject] = eventType === '*'
        ? ['*', '*']
        : eventType.split('.');

      return webhooks.find(
        (hook: any) =>
          hook.subscription_url === webhookUrl &&
          hook.event_action === eventAction &&
          hook.event_object === eventObject &&
          hook.is_active === 1,
      );
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
    return `${baseUrl}/${apiPrefix}/webhooks/pipedrive/${workflowId}`;
  }

  /**
   * Store webhook ID in workflow canvas data
   */
  private async storeWebhookId(
    workflowId: string,
    triggerId: string,
    webhookId: string,
  ): Promise<void> {
    const query = `
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

    await this.platformService.query(query, [workflowId, triggerId, webhookId]);
  }

  /**
   * Clear webhook ID from workflow canvas data
   */
  private async clearWebhookId(workflowId: string, triggerId: string): Promise<void> {
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
   * Find Pipedrive trigger nodes in workflow
   */
  private findPipedriveTriggers(workflow: any): any[] {
    const canvas = workflow.workflow?.canvas || workflow.canvas;

    if (!canvas || !canvas.nodes || canvas.nodes.length === 0) {
      return [];
    }

    return canvas.nodes.filter(
      (node: any) =>
        node.type === 'PIPEDRIVE_TRIGGER' ||
        (node.type === 'CONNECTOR_TRIGGER' && node.data?.connectorType === 'pipedrive'),
    );
  }
}
