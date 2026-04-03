import { Injectable, Logger, Inject, forwardRef } from '@nestjs/common';
import { PlatformService } from '../../../../database/platform.service';
import { WorkflowService } from '../../../workflow/workflow.service';
import { TwitterPollingService } from './twitter-polling.service';
import {
  ITriggerService,
  TriggerType,
  TriggerActivationResult,
  TriggerDeactivationResult,
  TriggerStatus,
} from '../../../workflow/interfaces/trigger.interface';

/**
 * Twitter Trigger Service
 *
 * Handles Twitter-specific trigger logic including:
 * - Polling activation/deactivation
 * - Status tracking
 * - Support for multiple trigger events (new_tweet, new_mention)
 *
 * This service is completely isolated from the main WorkflowService,
 * following single responsibility principle.
 */
@Injectable()
export class TwitterTriggerService implements ITriggerService {
  private readonly logger = new Logger(TwitterTriggerService.name);

  constructor(
    private readonly platformService: PlatformService,
    @Inject(forwardRef(() => WorkflowService))
    private readonly workflowService: WorkflowService,
    private readonly twitterPollingService: TwitterPollingService
  ) {}

  getTriggerType(): TriggerType {
    return TriggerType.TWITTER;
  }

  /**
   * Activate Twitter trigger for a workflow
   *
   * For polling-based triggers (Twitter API v2 doesn't offer free webhooks):
   * - Verify configuration is valid
   * - Set up polling state with user-defined interval
   */
  async activate(workflowId: string, triggerConfig: any): Promise<TriggerActivationResult> {
    try {
      this.logger.log(`Activating Twitter trigger for workflow: ${workflowId}`);

      // Get workflow
      const workflow = await this.workflowService.getWorkflow(workflowId);
      if (!workflow) {
        return {
          success: false,
          message: 'Workflow not found',
          error: 'Workflow not found',
        };
      }

      // Find Twitter trigger node
      const twitterTrigger = this.findTwitterTrigger(workflow);
      if (!twitterTrigger) {
        return {
          success: false,
          message: 'No Twitter trigger found in workflow',
          error: 'No Twitter trigger found',
        };
      }

      // Fetch credentials from database
      const credentialId = twitterTrigger.data?.credentialId;
      if (!credentialId) {
        return {
          success: false,
          message: 'Twitter credential not selected',
          error: 'Missing credentialId in trigger configuration',
        };
      }

      // Get credential from database
      const credentialRecord = await this.platformService.query(
        'SELECT * FROM connectors WHERE id = $1',
        [credentialId]
      );

      if (credentialRecord.rows.length === 0) {
        return {
          success: false,
          message: 'Twitter credential not found',
          error: `Credential ${credentialId} not found in database`,
        };
      }

      const credentials = credentialRecord.rows[0].credentials;
      // Support both snake_case and camelCase
      const accessToken = credentials.access_token || credentials.accessToken;

      if (!accessToken) {
        return {
          success: false,
          message: 'Twitter credentials not properly configured',
          error: 'Missing accessToken in credentials',
        };
      }

      // Get trigger parameters
      const params = twitterTrigger.data?.triggerParams || {};
      const pollingIntervalMinutes = parseInt(params.pollingInterval) || 5;
      const triggerEvent = params.event || 'new_mention'; // Default to new_mention

      // Validate trigger event
      if (!['new_tweet', 'new_mention'].includes(triggerEvent)) {
        return {
          success: false,
          message: 'Invalid trigger event',
          error: `Trigger event must be "new_tweet" or "new_mention", got: ${triggerEvent}`,
        };
      }

      this.logger.log(
        `Twitter trigger activated for workflow ${workflowId} - ` +
        `Event: ${triggerEvent}, Polling interval: ${pollingIntervalMinutes} minute(s)`
      );

      return {
        success: true,
        message: 'Twitter trigger activated (polling mode)',
        data: {
          mode: 'polling',
          event: triggerEvent,
          pollingInterval: `${pollingIntervalMinutes} minute(s)`,
          note: 'Polling service will automatically check for new tweets/mentions',
          eventDescription:
            triggerEvent === 'new_mention'
              ? 'Workflow triggers when someone mentions you on Twitter'
              : 'Workflow triggers when you post a new tweet',
        },
      };
    } catch (error: any) {
      this.logger.error(`Failed to activate Twitter trigger for workflow ${workflowId}:`, error);
      return {
        success: false,
        message: 'Failed to activate Twitter trigger',
        error: error.message,
      };
    }
  }

  /**
   * Deactivate Twitter trigger for a workflow
   *
   * Clear polling state to stop checking for new tweets/mentions
   */
  async deactivate(workflowId: string): Promise<TriggerDeactivationResult> {
    try {
      this.logger.log(`Deactivating Twitter trigger for workflow: ${workflowId}`);

      // Clear polling state
      this.twitterPollingService.clearPollState(workflowId);

      return {
        success: true,
        message: 'Twitter trigger deactivated',
      };
    } catch (error: any) {
      this.logger.error(`Failed to deactivate Twitter trigger for workflow ${workflowId}:`, error);
      return {
        success: false,
        message: 'Failed to deactivate Twitter trigger',
      };
    }
  }

  /**
   * Get Twitter trigger status for a workflow
   */
  async getStatus(workflowId: string): Promise<TriggerStatus> {
    try {
      // Check polling status
      const pollingState = this.twitterPollingService.getWorkflowPollState(workflowId);

      if (pollingState) {
        return {
          active: true,
          type: TriggerType.TWITTER,
          message: 'Twitter trigger active (polling mode)',
          metadata: {
            mode: 'polling',
            lastChecked: new Date(pollingState.lastTimeChecked * 1000),
            pollingInterval: '5 minutes (default)',
            possibleDuplicates: pollingState.possibleDuplicates.length,
          },
        };
      }

      return {
        active: false,
        type: TriggerType.TWITTER,
        message: 'Twitter trigger not active',
      };
    } catch (error: any) {
      this.logger.error(`Failed to get Twitter trigger status for workflow ${workflowId}:`, error);
      return {
        active: false,
        type: TriggerType.TWITTER,
        message: 'Error retrieving status',
        metadata: { error: error.message },
      };
    }
  }

  /**
   * Manually trigger a poll for testing
   */
  async triggerManualPoll(workflowId: string): Promise<any> {
    try {
      this.logger.log(`Manually triggering Twitter poll for workflow ${workflowId}`);
      return await this.twitterPollingService.pollWorkflowManually(workflowId);
    } catch (error: any) {
      this.logger.error(`Failed to manually trigger Twitter poll for workflow ${workflowId}:`, error);
      throw error;
    }
  }

  /**
   * Find Twitter trigger node in workflow
   */
  private findTwitterTrigger(workflow: any): any | null {
    const canvas = workflow.workflow?.canvas || workflow.canvas;
    if (!canvas || !canvas.nodes) return null;

    return canvas.nodes.find(
      (node: any) =>
        node.type === 'TWITTER_TRIGGER' ||
        (node.type === 'CONNECTOR_TRIGGER' && node.data?.connectorType === 'twitter')
    );
  }
}
