import { Injectable, Logger, Inject, forwardRef } from '@nestjs/common';
import { PlatformService } from '../../../../database/platform.service';
import { WorkflowService } from '../../../workflow/workflow.service';
import { GmailPollingService } from './gmail-polling.service';
import { GmailWebhookService } from './gmail-webhook.service';
import {
  ITriggerService,
  TriggerType,
  TriggerActivationResult,
  TriggerDeactivationResult,
  TriggerStatus,
} from '../../../workflow/interfaces/trigger.interface';

/**
 * Gmail Trigger Service
 *
 * Handles Gmail-specific trigger logic including:
 * - Polling activation/deactivation
 * - Webhook management (optional)
 * - Status tracking
 *
 * This service is completely isolated from the main WorkflowService,
 * following single responsibility principle.
 */
@Injectable()
export class GmailTriggerService implements ITriggerService {
  private readonly logger = new Logger(GmailTriggerService.name);

  constructor(
    private readonly platformService: PlatformService,
    @Inject(forwardRef(() => WorkflowService))
    private readonly workflowService: WorkflowService,
    private readonly gmailPollingService: GmailPollingService,
    private readonly gmailWebhookService: GmailWebhookService
  ) {}

  getTriggerType(): TriggerType {
    return TriggerType.GMAIL;
  }

  /**
   * Activate Gmail trigger for a workflow
   *
   * For polling-based triggers (default):
   * - No explicit activation needed, polling service checks all active workflows
   * - Just verify configuration is valid
   *
   * For webhook-based triggers (optional):
   * - Register Gmail watch via Gmail API
   * - Setup Pub/Sub subscription
   */
  async activate(workflowId: string, triggerConfig: any): Promise<TriggerActivationResult> {
    try {
      this.logger.log(`Activating Gmail trigger for workflow: ${workflowId}`);

      // Get workflow
      const workflow = await this.workflowService.getWorkflow(workflowId);
      if (!workflow) {
        return {
          success: false,
          message: 'Workflow not found',
          error: 'Workflow not found',
        };
      }

      // Find Gmail trigger node
      const gmailTrigger = this.findGmailTrigger(workflow);
      if (!gmailTrigger) {
        return {
          success: false,
          message: 'No Gmail trigger found in workflow',
          error: 'No Gmail trigger found',
        };
      }

      // Fetch credentials from database
      const credentialId = gmailTrigger.data?.credentialId;
      if (!credentialId) {
        return {
          success: false,
          message: 'Gmail credential not selected',
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
          message: 'Gmail credential not found',
          error: `Credential ${credentialId} not found in database`,
        };
      }

      const credentials = credentialRecord.rows[0].credentials;
      // Support both snake_case and camelCase
      const accessToken = credentials.access_token || credentials.accessToken;

      if (!accessToken) {
        return {
          success: false,
          message: 'Gmail credentials not properly configured',
          error: 'Missing accessToken in credentials',
        };
      }

      // Check if using webhook mode (optional, for real-time notifications)
      const useWebhook = gmailTrigger.data?.useWebhook || false;

      if (useWebhook) {
        // Webhook mode: Register Gmail watch
        this.logger.log(`Activating webhook mode for workflow ${workflowId}`);

        const watchOptions = {
          labelIds: gmailTrigger.data?.filters?.labelIds || ['INBOX'],
          labelFilterAction: gmailTrigger.data?.filters?.labelFilterAction || 'include',
          historyTypes: gmailTrigger.data?.historyTypes || ['messageAdded', 'messageDeleted'],
        };

        const result = await this.gmailWebhookService.registerWatch(
          workflowId,
          credentials,
          watchOptions
        );

        return {
          success: result.success,
          message: result.message,
          data: {
            mode: 'webhook',
            historyId: result.historyId,
            expiration: result.expiration,
          },
          error: result.error,
        };
      } else {
        // Polling mode (default): No explicit activation needed
        // The polling service will automatically check this workflow
        const params = gmailTrigger.data?.triggerParams || {};
        const pollingIntervalMinutes = parseInt(params.pollingInterval) || 5;

        this.logger.log(`Polling mode enabled for workflow ${workflowId} - interval: ${pollingIntervalMinutes} minute(s)`);

        return {
          success: true,
          message: 'Gmail trigger activated (polling mode)',
          data: {
            mode: 'polling',
            pollingInterval: `${pollingIntervalMinutes} minute(s)`,
            note: 'Polling service will automatically check for new emails',
          },
        };
      }
    } catch (error: any) {
      this.logger.error(`Failed to activate Gmail trigger for workflow ${workflowId}:`, error);
      return {
        success: false,
        message: 'Failed to activate Gmail trigger',
        error: error.message,
      };
    }
  }

  /**
   * Deactivate Gmail trigger for a workflow
   *
   * For polling mode: Clear poll state
   * For webhook mode: Stop Gmail watch
   */
  async deactivate(workflowId: string): Promise<TriggerDeactivationResult> {
    try {
      this.logger.log(`Deactivating Gmail trigger for workflow: ${workflowId}`);

      // Clear polling state (both memory and database)
      await this.gmailPollingService.clearPollState(workflowId);

      // Stop webhook if active
      await this.gmailWebhookService.stopWatch(workflowId);

      return {
        success: true,
        message: 'Gmail trigger deactivated',
      };
    } catch (error: any) {
      this.logger.error(`Failed to deactivate Gmail trigger for workflow ${workflowId}:`, error);
      return {
        success: false,
        message: 'Failed to deactivate Gmail trigger',
      };
    }
  }

  /**
   * Get Gmail trigger status for a workflow
   */
  async getStatus(workflowId: string): Promise<TriggerStatus> {
    try {
      // Check webhook status
      const webhookStatus = this.gmailWebhookService.getWatchStatus(workflowId);

      // Check polling status
      const pollingState = this.gmailPollingService.getWorkflowPollState(workflowId);

      if (webhookStatus) {
        return {
          active: true,
          type: TriggerType.GMAIL,
          message: 'Gmail trigger active (webhook mode)',
          metadata: {
            mode: 'webhook',
            historyId: webhookStatus.historyId,
            expiresAt: new Date(webhookStatus.expiresAt),
            createdAt: new Date(webhookStatus.createdAt),
            topicName: webhookStatus.topicName,
          },
        };
      }

      if (pollingState) {
        return {
          active: true,
          type: TriggerType.GMAIL,
          message: 'Gmail trigger active (polling mode)',
          metadata: {
            mode: 'polling',
            lastChecked: new Date(pollingState.lastTimeChecked * 1000),
            pollingInterval: '5 minutes',
            possibleDuplicates: pollingState.possibleDuplicates.length,
          },
        };
      }

      return {
        active: false,
        type: TriggerType.GMAIL,
        message: 'Gmail trigger not active',
      };
    } catch (error: any) {
      this.logger.error(`Failed to get Gmail trigger status for workflow ${workflowId}:`, error);
      return {
        active: false,
        type: TriggerType.GMAIL,
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
      this.logger.log(`Manually triggering Gmail poll for workflow ${workflowId}`);
      return await this.gmailPollingService.pollWorkflowManually(workflowId);
    } catch (error: any) {
      this.logger.error(`Failed to manually trigger Gmail poll for workflow ${workflowId}:`, error);
      throw error;
    }
  }

  /**
   * Find Gmail trigger node in workflow
   */
  private findGmailTrigger(workflow: any): any | null {
    const canvas = workflow.workflow?.canvas || workflow.canvas;
    if (!canvas || !canvas.nodes) return null;

    return canvas.nodes.find(
      (node: any) =>
        node.type === 'GMAIL_TRIGGER' ||
        (node.type === 'CONNECTOR_TRIGGER' && node.data?.connectorType === 'gmail')
    );
  }
}
