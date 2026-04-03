import { Injectable, Logger, Inject, forwardRef } from '@nestjs/common';
import { PlatformService } from '../../../../database/platform.service';
import { ConnectorsService } from '../../connectors.service';
import axios from 'axios';

/**
 * Trello Webhook Management Service
 * Manages Trello webhook lifecycle for workflow triggers
 *
 * Responsibilities:
 * 1. Create webhooks on Trello when workflow is activated
 * 2. Delete webhooks when workflow is deactivated
 * 3. Store webhook IDs for tracking
 */
@Injectable()
export class TrelloWebhookService {
  private readonly logger = new Logger(TrelloWebhookService.name);
  private readonly trelloApiUrl = 'https://api.trello.com/1';

  constructor(
    private readonly platformService: PlatformService,
    @Inject(forwardRef(() => ConnectorsService))
    private readonly connectorsService: ConnectorsService,
  ) {}

  /**
   * Create Trello webhook for a workflow
   */
  async createWebhook(workflowId: string): Promise<any> {
    this.logger.log(`Creating Trello webhook for workflow ${workflowId}`);

    try {
      const workflow = await this.getWorkflow(workflowId);
      if (!workflow) {
        throw new Error('Workflow not found');
      }

      const trelloTriggers = this.findTrelloTriggers(workflow);
      if (trelloTriggers.length === 0) {
        this.logger.warn(`Workflow ${workflowId} has no Trello triggers`);
        return { success: false, message: 'No Trello triggers found' };
      }

      const results = [];

      for (const trigger of trelloTriggers) {
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
      this.logger.error(`Failed to create Trello webhook for workflow ${workflowId}:`, error);
      throw error;
    }
  }

  /**
   * Delete Trello webhook for a workflow
   */
  async deleteWebhook(workflowId: string): Promise<any> {
    this.logger.log(`Deleting Trello webhook for workflow ${workflowId}`);

    try {
      const workflow = await this.getWorkflow(workflowId);
      if (!workflow) {
        throw new Error('Workflow not found');
      }

      const trelloTriggers = this.findTrelloTriggers(workflow);
      if (trelloTriggers.length === 0) {
        this.logger.warn(`Workflow ${workflowId} has no Trello triggers`);
        return { success: true, message: 'No webhooks to delete' };
      }

      const results = [];

      for (const trigger of trelloTriggers) {
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
      this.logger.error(`Failed to delete Trello webhook for workflow ${workflowId}:`, error);
      throw error;
    }
  }

  /**
   * Create webhook for a specific trigger node
   */
  private async createWebhookForTrigger(workflowId: string, trigger: any): Promise<any> {
    const triggerParams = trigger.data?.triggerParams || {};
    const credentialId = trigger.data?.credentialId;

    if (!credentialId) {
      throw new Error('No credential ID configured for trigger');
    }

    // Get board ID from trigger params
    const boardId = triggerParams.boardId;
    if (!boardId) {
      throw new Error('Board ID is required for Trello trigger');
    }

    // Get Trello credentials
    const credentials = await this.connectorsService.getConnectorCredentials(credentialId);
    const apiKey = credentials.apiKey || credentials.api_key;
    const accessToken = credentials.accessToken || credentials.access_token || credentials.token;

    if (!apiKey || !accessToken) {
      throw new Error('Trello API key and access token are required');
    }

    // Build webhook URL
    const webhookUrl = this.buildWebhookUrl(workflowId);
    this.logger.log(`Trello webhook URL: ${webhookUrl}`);

    // Check if webhook already exists
    const existingWebhook = await this.findExistingWebhook(boardId, webhookUrl, apiKey, accessToken);

    if (existingWebhook) {
      this.logger.log(`Webhook already exists for board ${boardId}`);
      return {
        success: true,
        webhookId: existingWebhook.id,
        boardId,
        url: webhookUrl,
        existing: true,
      };
    }

    // Create new webhook
    // Trello requires a description and callbackURL
    const webhookData = {
      description: `FluxTurn Workflow: ${workflowId}`,
      callbackURL: webhookUrl,
      idModel: boardId, // The board to watch
    };

    this.logger.log(`Creating Trello webhook with data: ${JSON.stringify(webhookData)}`);

    try {
      // Trello API expects query params for auth and JSON body for webhook data
      const response = await axios.post(
        `${this.trelloApiUrl}/webhooks?key=${apiKey}&token=${accessToken}`,
        webhookData,
        {
          headers: {
            'Content-Type': 'application/json',
          },
        },
      );

      const webhookId = response.data.id;

      // Store webhook ID in trigger data
      await this.storeWebhookId(workflowId, trigger.id, webhookId);

      this.logger.log(`Created Trello webhook ${webhookId} for board ${boardId}`);

      return {
        success: true,
        webhookId,
        boardId,
        url: webhookUrl,
      };
    } catch (error) {
      // Log detailed error from Trello API
      const errorMessage = error.response?.data || error.message;
      this.logger.error(`Trello API error: ${JSON.stringify(errorMessage)}`);
      this.logger.error(`Webhook URL attempted: ${webhookUrl}`);
      throw new Error(`Trello webhook creation failed: ${JSON.stringify(errorMessage)}`);
    }
  }

  /**
   * Delete webhook for a specific trigger node
   */
  private async deleteWebhookForTrigger(workflowId: string, trigger: any): Promise<any> {
    const triggerParams = trigger.data?.triggerParams || {};
    const credentialId = trigger.data?.credentialId;
    const webhookId = trigger.data?.webhookId;

    if (!webhookId) {
      this.logger.warn(`No webhook ID found for trigger ${trigger.id}`);
      return { success: true, message: 'No webhook to delete' };
    }

    if (!credentialId) {
      throw new Error('No credential ID configured for trigger');
    }

    // Get Trello credentials
    const credentials = await this.connectorsService.getConnectorCredentials(credentialId);
    const apiKey = credentials.apiKey || credentials.api_key;
    const accessToken = credentials.accessToken || credentials.access_token || credentials.token;

    if (!apiKey || !accessToken) {
      throw new Error('Trello API key and access token are required');
    }

    try {
      await axios.delete(`${this.trelloApiUrl}/webhooks/${webhookId}`, {
        params: {
          key: apiKey,
          token: accessToken,
        },
      });

      // Clear webhook ID from trigger data
      await this.clearWebhookId(workflowId, trigger.id);

      this.logger.log(`Deleted Trello webhook ${webhookId}`);

      return {
        success: true,
        webhookId,
        boardId: triggerParams.boardId,
      };
    } catch (error) {
      if (error.response?.status === 404) {
        this.logger.warn(`Webhook ${webhookId} not found, already deleted`);
        await this.clearWebhookId(workflowId, trigger.id);
        return { success: true, message: 'Webhook already deleted' };
      }
      throw error;
    }
  }

  /**
   * Find existing webhook by callback URL
   */
  private async findExistingWebhook(
    boardId: string,
    webhookUrl: string,
    apiKey: string,
    accessToken: string,
  ): Promise<any> {
    try {
      const response = await axios.get(`${this.trelloApiUrl}/tokens/${accessToken}/webhooks`, {
        params: {
          key: apiKey,
        },
      });

      const webhooks = response.data;
      return webhooks.find(
        (hook: any) => hook.callbackURL === webhookUrl && hook.idModel === boardId,
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
    return `${baseUrl}/${apiPrefix}/webhooks/trello/${workflowId}`;
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
   * Find Trello trigger nodes in workflow
   */
  private findTrelloTriggers(workflow: any): any[] {
    const canvas = workflow.workflow?.canvas || workflow.canvas;

    if (!canvas || !canvas.nodes || canvas.nodes.length === 0) {
      return [];
    }

    return canvas.nodes.filter(
      (node: any) =>
        node.type === 'TRELLO_TRIGGER' ||
        (node.type === 'CONNECTOR_TRIGGER' && node.data?.connectorType === 'trello'),
    );
  }
}
