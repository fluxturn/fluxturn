import { Injectable, Logger, Inject, forwardRef } from '@nestjs/common';
import { PlatformService } from '../../../../database/platform.service';
import { ConnectorsService } from '../../connectors.service';
import axios from 'axios';

/**
 * GitHub Webhook Management Service
 * Manages GitHub webhook lifecycle for workflow triggers
 *
 * Responsibilities:
 * 1. Create webhooks on GitHub when workflow is activated
 * 2. Delete webhooks when workflow is deactivated
 * 3. Update webhooks when trigger configuration changes
 * 4. Store webhook IDs for tracking
 */
@Injectable()
export class GitHubWebhookService {
  private readonly logger = new Logger(GitHubWebhookService.name);
  private readonly githubApiUrl = 'https://api.github.com';

  constructor(
    private readonly platformService: PlatformService,
    @Inject(forwardRef(() => ConnectorsService))
    private readonly connectorsService: ConnectorsService,
  ) {}

  /**
   * Create GitHub webhook for a workflow
   */
  async createWebhook(workflowId: string): Promise<any> {
    this.logger.log(`Creating GitHub webhook for workflow ${workflowId}`);

    try {
      // Get workflow from database
      const workflow = await this.getWorkflow(workflowId);
      if (!workflow) {
        throw new Error('Workflow not found');
      }

      // Find GitHub trigger nodes
      const githubTriggers = this.findGitHubTriggers(workflow);
      if (githubTriggers.length === 0) {
        this.logger.warn(`Workflow ${workflowId} has no GitHub triggers`);
        return { success: false, message: 'No GitHub triggers found' };
      }

      const results = [];

      // Create webhook for each GitHub trigger
      for (const trigger of githubTriggers) {
        try {
          const result = await this.createWebhookForTrigger(
            workflowId,
            trigger,
          );
          results.push(result);
        } catch (error) {
          this.logger.error(
            `Failed to create webhook for trigger ${trigger.id}:`,
            error,
          );
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
      this.logger.error(
        `Failed to create GitHub webhook for workflow ${workflowId}:`,
        error,
      );
      throw error;
    }
  }

  /**
   * Delete GitHub webhook for a workflow
   */
  async deleteWebhook(workflowId: string): Promise<any> {
    this.logger.log(`Deleting GitHub webhook for workflow ${workflowId}`);

    try {
      // Get workflow from database
      const workflow = await this.getWorkflow(workflowId);
      if (!workflow) {
        throw new Error('Workflow not found');
      }

      // Find GitHub trigger nodes
      const githubTriggers = this.findGitHubTriggers(workflow);
      if (githubTriggers.length === 0) {
        this.logger.warn(`Workflow ${workflowId} has no GitHub triggers`);
        return { success: true, message: 'No webhooks to delete' };
      }

      const results = [];

      // Delete webhook for each GitHub trigger
      for (const trigger of githubTriggers) {
        try {
          const result = await this.deleteWebhookForTrigger(
            workflowId,
            trigger,
          );
          results.push(result);
        } catch (error) {
          this.logger.error(
            `Failed to delete webhook for trigger ${trigger.id}:`,
            error,
          );
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
      this.logger.error(
        `Failed to delete GitHub webhook for workflow ${workflowId}:`,
        error,
      );
      throw error;
    }
  }

  /**
   * Create webhook for a specific trigger node
   */
  private async createWebhookForTrigger(
    workflowId: string,
    trigger: any,
  ): Promise<any> {
    const triggerParams = trigger.data?.triggerParams || {};
    const credentialId = trigger.data?.credentialId;

    if (!credentialId) {
      throw new Error('No credential ID configured for trigger');
    }

    // Get repository info from trigger params
    const owner = triggerParams.owner;
    const repository = triggerParams.repository;

    if (!owner || !repository) {
      throw new Error('Owner and repository are required');
    }

    // Get GitHub credentials
    const credentials = await this.connectorsService.getConnectorCredentials(
      credentialId,
    );
    // Support multiple field name formats: accessToken (OAuth), access_token (snake_case), personal_access_token (GitHub PAT)
    const accessToken = credentials.accessToken || credentials.access_token || credentials.personal_access_token;

    if (!accessToken) {
      throw new Error('GitHub access token not found in credentials');
    }

    // Determine events to subscribe to based on trigger type
    const events = this.getWebhookEvents(trigger.data?.triggerId);

    // Build webhook URL
    const webhookUrl = this.buildWebhookUrl(workflowId);

    // Check if webhook already exists
    const existingWebhook = await this.findExistingWebhook(
      owner,
      repository,
      webhookUrl,
      accessToken,
    );

    if (existingWebhook) {
      this.logger.log(
        `Webhook already exists for ${owner}/${repository}, updating...`,
      );
      return await this.updateWebhook(
        owner,
        repository,
        existingWebhook.id,
        events,
        accessToken,
      );
    }

    // Create new webhook
    const endpoint = `/repos/${owner}/${repository}/hooks`;

    const webhookData = {
      name: 'web',
      active: true,
      events,
      config: {
        url: webhookUrl,
        content_type: 'json',
        insecure_ssl: '0',
        secret: triggerParams.webhookSecret || '',
      },
    };

    const response = await axios.post(
      `${this.githubApiUrl}${endpoint}`,
      webhookData,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          Accept: 'application/vnd.github.v3+json',
          'User-Agent': 'FluxTurn-Automation/1.0.0',
        },
      },
    );

    const webhookId = response.data.id;

    // Store webhook ID in trigger data
    await this.storeWebhookId(workflowId, trigger.id, webhookId);

    this.logger.log(
      `Created GitHub webhook ${webhookId} for ${owner}/${repository}`,
    );

    return {
      success: true,
      webhookId,
      owner,
      repository,
      events,
      url: webhookUrl,
    };
  }

  /**
   * Delete webhook for a specific trigger node
   */
  private async deleteWebhookForTrigger(
    workflowId: string,
    trigger: any,
  ): Promise<any> {
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

    // Get repository info
    const owner = triggerParams.owner;
    const repository = triggerParams.repository;

    if (!owner || !repository) {
      throw new Error('Owner and repository are required');
    }

    // Get GitHub credentials
    const credentials = await this.connectorsService.getConnectorCredentials(
      credentialId,
    );
    // Support multiple field name formats: accessToken (OAuth), access_token (snake_case), personal_access_token (GitHub PAT)
    const accessToken = credentials.accessToken || credentials.access_token || credentials.personal_access_token;

    if (!accessToken) {
      throw new Error('GitHub access token not found in credentials');
    }

    // Delete webhook
    const endpoint = `/repos/${owner}/${repository}/hooks/${webhookId}`;

    try {
      await axios.delete(`${this.githubApiUrl}${endpoint}`, {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          Accept: 'application/vnd.github.v3+json',
          'User-Agent': 'FluxTurn-Automation/1.0.0',
        },
      });

      // Clear webhook ID from trigger data
      await this.clearWebhookId(workflowId, trigger.id);

      this.logger.log(
        `Deleted GitHub webhook ${webhookId} for ${owner}/${repository}`,
      );

      return {
        success: true,
        webhookId,
        owner,
        repository,
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
   * Find existing webhook by URL
   */
  private async findExistingWebhook(
    owner: string,
    repository: string,
    webhookUrl: string,
    accessToken: string,
  ): Promise<any> {
    const endpoint = `/repos/${owner}/${repository}/hooks`;

    try {
      const response = await axios.get(`${this.githubApiUrl}${endpoint}`, {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          Accept: 'application/vnd.github.v3+json',
          'User-Agent': 'FluxTurn-Automation/1.0.0',
        },
      });

      const webhooks = response.data;
      return webhooks.find((hook: any) => hook.config?.url === webhookUrl);
    } catch (error) {
      this.logger.error('Failed to fetch existing webhooks:', error);
      return null;
    }
  }

  /**
   * Update existing webhook
   */
  private async updateWebhook(
    owner: string,
    repository: string,
    webhookId: number,
    events: string[],
    accessToken: string,
  ): Promise<any> {
    const endpoint = `/repos/${owner}/${repository}/hooks/${webhookId}`;

    const response = await axios.patch(
      `${this.githubApiUrl}${endpoint}`,
      {
        events,
        active: true,
      },
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          Accept: 'application/vnd.github.v3+json',
          'User-Agent': 'FluxTurn-Automation/1.0.0',
        },
      },
    );

    return {
      success: true,
      webhookId: response.data.id,
      owner,
      repository,
      events,
      updated: true,
    };
  }

  /**
   * Get webhook events based on trigger type
   */
  private getWebhookEvents(triggerId: string): string[] {
    const eventMap: Record<string, string[]> = {
      on_push: ['push'],
      on_create: ['create'],
      on_delete: ['delete'],
      on_commit_comment: ['commit_comment'],
      on_repository: ['repository'],
    };

    return eventMap[triggerId] || ['push'];
  }

  /**
   * Build webhook URL for workflow
   */
  private buildWebhookUrl(workflowId: string): string {
    // Get base URL from environment or configuration
    const baseUrl =
      process.env.APP_URL || process.env.BACKEND_URL || 'http://localhost:3000';
    // Use API_PREFIX from environment, default to 'api/v1'
    const apiPrefix = process.env.API_PREFIX || 'api/v1';
    return `${baseUrl}/${apiPrefix}/webhooks/github/${workflowId}`;
  }

  /**
   * Store webhook ID in workflow canvas data
   */
  private async storeWebhookId(
    workflowId: string,
    triggerId: string,
    webhookId: number,
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

    await this.platformService.query(query, [
      workflowId,
      triggerId,
      webhookId.toString(),
    ]);
  }

  /**
   * Clear webhook ID from workflow canvas data
   */
  private async clearWebhookId(
    workflowId: string,
    triggerId: string,
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
   * Find GitHub trigger nodes in workflow
   */
  private findGitHubTriggers(workflow: any): any[] {
    // Support both workflow.workflow.canvas and workflow.canvas structures
    const canvas = workflow.workflow?.canvas || workflow.canvas;

    if (!canvas || !canvas.nodes || canvas.nodes.length === 0) {
      return [];
    }

    return canvas.nodes.filter(
      (node: any) =>
        node.type === 'GITHUB_TRIGGER' ||
        (node.type === 'CONNECTOR_TRIGGER' &&
          node.data?.connectorType === 'github'),
    );
  }

  /**
   * Check if webhook exists on GitHub
   */
  async checkWebhookExists(
    workflowId: string,
    triggerId: string,
  ): Promise<boolean> {
    try {
      const workflow = await this.getWorkflow(workflowId);
      if (!workflow) {
        return false;
      }

      // Support both workflow.workflow.canvas and workflow.canvas structures
      const canvas = workflow.workflow?.canvas || workflow.canvas;
      const trigger = canvas?.nodes?.find(
        (node: any) => node.id === triggerId,
      );

      if (!trigger || !trigger.data?.webhookId) {
        return false;
      }

      const webhookId = trigger.data.webhookId;
      const triggerParams = trigger.data?.triggerParams || {};
      const owner = triggerParams.owner;
      const repository = triggerParams.repository;
      const credentialId = trigger.data?.credentialId;

      if (!owner || !repository || !credentialId) {
        return false;
      }

      // Get credentials
      const credentials = await this.connectorsService.getConnectorCredentials(
        credentialId,
      );
      const accessToken = credentials.accessToken || credentials.access_token;

      // Check if webhook exists
      const endpoint = `/repos/${owner}/${repository}/hooks/${webhookId}`;

      try {
        await axios.get(`${this.githubApiUrl}${endpoint}`, {
          headers: {
            Authorization: `Bearer ${accessToken}`,
            Accept: 'application/vnd.github.v3+json',
            'User-Agent': 'FluxTurn-Automation/1.0.0',
          },
        });

        return true;
      } catch (error) {
        if (error.response?.status === 404) {
          return false;
        }
        throw error;
      }
    } catch (error) {
      this.logger.error('Failed to check webhook existence:', error);
      return false;
    }
  }
}
