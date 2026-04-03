import { Injectable, Logger, Inject, forwardRef } from '@nestjs/common';
import { PlatformService } from '../../../../database/platform.service';
import { WorkflowService } from '../../../workflow/workflow.service';
import { GitHubWebhookService } from './github-webhook.service';
import {
  ITriggerService,
  TriggerType,
  TriggerActivationResult,
  TriggerDeactivationResult,
  TriggerStatus,
} from '../../../workflow/interfaces/trigger.interface';

/**
 * GitHub Trigger Service
 *
 * Handles GitHub-specific trigger logic including:
 * - Webhook creation/deletion on activation/deactivation
 * - Status tracking
 *
 * This service is completely isolated from the main WorkflowService,
 * following single responsibility principle.
 */
@Injectable()
export class GitHubTriggerService implements ITriggerService {
  private readonly logger = new Logger(GitHubTriggerService.name);

  constructor(
    private readonly platformService: PlatformService,
    @Inject(forwardRef(() => WorkflowService))
    private readonly workflowService: WorkflowService,
    private readonly githubWebhookService: GitHubWebhookService
  ) {}

  getTriggerType(): TriggerType {
    return TriggerType.GITHUB;
  }

  /**
   * Activate GitHub trigger for a workflow
   * Creates webhook on GitHub
   */
  async activate(workflowId: string, triggerConfig: any): Promise<TriggerActivationResult> {
    try {
      this.logger.log(`Activating GitHub trigger for workflow: ${workflowId}`);
      this.logger.debug(`Trigger config: ${JSON.stringify(triggerConfig)}`);

      // Extract credential ID from config
      const credentialId = triggerConfig.credentialId || triggerConfig.connectorConfigId;
      if (!credentialId) {
        return {
          success: false,
          message: 'GitHub credential not selected',
          error: 'Missing credentialId in trigger configuration',
        };
      }

      // Extract trigger params from config
      const triggerParams = triggerConfig.triggerParams || triggerConfig.actionParams || {};
      if (!triggerParams.owner || !triggerParams.repository) {
        return {
          success: false,
          message: 'GitHub trigger not fully configured',
          error: 'Missing owner or repository in trigger parameters',
        };
      }

      this.logger.log(`Creating GitHub webhook for ${triggerParams.owner}/${triggerParams.repository}`);

      // Create webhook via GitHub Webhook Service
      const webhookResult = await this.githubWebhookService.createWebhook(workflowId);

      if (!webhookResult.success) {
        return {
          success: false,
          message: 'Failed to create GitHub webhook',
          error: webhookResult.error || 'Unknown error',
        };
      }

      this.logger.log(`GitHub webhook created successfully for workflow: ${workflowId}`);

      return {
        success: true,
        message: 'GitHub webhook created successfully',
        data: {
          triggerId: triggerConfig.triggerId,
          webhooks: webhookResult.webhooks,
          owner: triggerParams.owner,
          repository: triggerParams.repository,
        },
      };
    } catch (error) {
      this.logger.error(`Failed to activate GitHub trigger: ${error.message}`, error.stack);
      return {
        success: false,
        message: 'Failed to activate GitHub trigger',
        error: error.message,
      };
    }
  }

  /**
   * Deactivate GitHub trigger for a workflow
   * Deletes webhook from GitHub
   */
  async deactivate(workflowId: string): Promise<TriggerDeactivationResult> {
    try {
      this.logger.log(`Deactivating GitHub trigger for workflow: ${workflowId}`);

      // Delete webhook via GitHub Webhook Service
      const webhookResult = await this.githubWebhookService.deleteWebhook(workflowId);

      if (!webhookResult.success) {
        return {
          success: false,
          message: `Failed to delete GitHub webhook: ${webhookResult.error || 'Unknown error'}`,
        };
      }

      this.logger.log(`GitHub webhook deleted successfully for workflow: ${workflowId}`);

      return {
        success: true,
        message: 'GitHub webhook deleted successfully',
      };
    } catch (error) {
      this.logger.error(`Failed to deactivate GitHub trigger: ${error.message}`, error.stack);
      return {
        success: false,
        message: `Failed to deactivate GitHub trigger: ${error.message}`,
      };
    }
  }

  /**
   * Get status of GitHub trigger for a workflow
   */
  async getStatus(workflowId: string): Promise<TriggerStatus> {
    try {
      const workflow = await this.workflowService.getWorkflow(workflowId);
      if (!workflow) {
        return {
          active: false,
          type: TriggerType.GITHUB,
          message: 'Workflow not found',
        };
      }

      const githubTrigger = this.findGitHubTrigger(workflow);
      if (!githubTrigger) {
        return {
          active: false,
          type: TriggerType.GITHUB,
          message: 'No GitHub trigger found',
        };
      }

      // Check if webhook exists
      const webhookId = githubTrigger.data?.webhookId;
      if (!webhookId) {
        return {
          active: false,
          type: TriggerType.GITHUB,
          message: 'Webhook not created',
        };
      }

      // Could optionally verify webhook exists on GitHub
      // const exists = await this.githubWebhookService.checkWebhookExists(workflowId, githubTrigger.id);

      return {
        active: true,
        type: TriggerType.GITHUB,
        message: 'GitHub webhook active',
        metadata: {
          webhookId,
        },
      };
    } catch (error) {
      this.logger.error(`Failed to get GitHub trigger status: ${error.message}`);
      return {
        active: false,
        type: TriggerType.GITHUB,
        message: `Error checking status: ${error.message}`,
      };
    }
  }

  /**
   * Find GitHub trigger node in workflow
   */
  private findGitHubTrigger(workflow: any): any | null {
    // Support both workflow.workflow.canvas and workflow.canvas structures
    const canvas = workflow.workflow?.canvas || workflow.canvas;

    if (!canvas || !canvas.nodes || canvas.nodes.length === 0) {
      return null;
    }

    return canvas.nodes.find(
      (node: any) =>
        node.type === 'GITHUB_TRIGGER' ||
        (node.type === 'CONNECTOR_TRIGGER' && node.data?.connectorType === 'github')
    );
  }
}
