import { Injectable, Logger, Inject, forwardRef } from '@nestjs/common';
import { PlatformService } from '../../../../database/platform.service';
import { WorkflowService } from '../../../workflow/workflow.service';
import { GoogleCalendarPollingService } from './google-calendar-polling.service';
import {
  ITriggerService,
  TriggerType,
  TriggerActivationResult,
  TriggerDeactivationResult,
  TriggerStatus,
} from '../../../workflow/interfaces/trigger.interface';

/**
 * Google Calendar Trigger Service
 *
 * Handles Google Calendar-specific trigger logic including:
 * - Polling activation/deactivation
 * - Status tracking
 *
 * This service is completely isolated from the main WorkflowService,
 * following single responsibility principle.
 */
@Injectable()
export class GoogleCalendarTriggerService implements ITriggerService {
  private readonly logger = new Logger(GoogleCalendarTriggerService.name);

  constructor(
    private readonly platformService: PlatformService,
    @Inject(forwardRef(() => WorkflowService))
    private readonly workflowService: WorkflowService,
    @Inject(forwardRef(() => GoogleCalendarPollingService))
    private readonly calendarPollingService: GoogleCalendarPollingService
  ) {}

  getTriggerType(): TriggerType {
    return TriggerType.GOOGLE_CALENDAR;
  }

  /**
   * Activate Google Calendar trigger for a workflow
   *
   * For polling-based triggers:
   * - No explicit activation needed, polling service checks all active workflows
   * - Just verify configuration is valid
   */
  async activate(workflowId: string, triggerConfig: any): Promise<TriggerActivationResult> {
    try {
      this.logger.log(`Activating Google Calendar trigger for workflow: ${workflowId}`);

      // Get workflow
      const workflow = await this.workflowService.getWorkflow(workflowId);
      if (!workflow) {
        return {
          success: false,
          message: 'Workflow not found',
          error: 'Workflow not found',
        };
      }

      // Find Calendar trigger node
      const calendarTrigger = this.findCalendarTrigger(workflow);
      if (!calendarTrigger) {
        return {
          success: false,
          message: 'No Google Calendar trigger found in workflow',
          error: 'No Google Calendar trigger found',
        };
      }

      // Fetch credentials from database
      const credentialId = calendarTrigger.data?.credentialId || calendarTrigger.data?.connectorConfigId;
      if (!credentialId) {
        return {
          success: false,
          message: 'Google Calendar credential not selected',
          error: 'Missing credentialId in trigger configuration',
        };
      }

      // Get credential from database
      const credentialRecord = await this.platformService.query(
        'SELECT * FROM connector_configs WHERE id = $1',
        [credentialId]
      );

      if (credentialRecord.rows.length === 0) {
        return {
          success: false,
          message: 'Google Calendar credential not found',
          error: `Credential ${credentialId} not found in database`,
        };
      }

      const credentials = credentialRecord.rows[0].credentials;
      // Support both snake_case and camelCase
      const accessToken = credentials.access_token || credentials.accessToken;

      if (!accessToken) {
        return {
          success: false,
          message: 'Google Calendar credentials not properly configured',
          error: 'Missing accessToken in credentials',
        };
      }

      // Polling mode: No explicit activation needed
      // The polling service will automatically check this workflow
      const params = calendarTrigger.data?.triggerParams || {};
      const pollingIntervalMinutes = parseInt(params.pollInterval) || parseInt(params.pollingInterval) || 5;
      const triggerId = calendarTrigger.data?.triggerId || params.triggerId || 'event_created';
      const calendarId = params.calendarId || 'primary';

      this.logger.log(
        `Polling mode enabled for workflow ${workflowId} - ` +
        `interval: ${pollingIntervalMinutes} minute(s), ` +
        `trigger: ${triggerId}, calendar: ${calendarId}`
      );

      return {
        success: true,
        message: 'Google Calendar trigger activated (polling mode)',
        data: {
          mode: 'polling',
          pollingInterval: `${pollingIntervalMinutes} minute(s)`,
          triggerId,
          calendarId,
          note: 'Polling service will automatically check for calendar events',
        },
      };
    } catch (error: any) {
      this.logger.error(`Failed to activate Google Calendar trigger for workflow ${workflowId}:`, error);
      return {
        success: false,
        message: 'Failed to activate Google Calendar trigger',
        error: error.message,
      };
    }
  }

  /**
   * Deactivate Google Calendar trigger for a workflow
   *
   * For polling mode: Clear poll state
   */
  async deactivate(workflowId: string): Promise<TriggerDeactivationResult> {
    try {
      this.logger.log(`Deactivating Google Calendar trigger for workflow: ${workflowId}`);

      // Clear polling state
      this.calendarPollingService.clearPollState(workflowId);

      return {
        success: true,
        message: 'Google Calendar trigger deactivated',
      };
    } catch (error: any) {
      this.logger.error(`Failed to deactivate Google Calendar trigger for workflow ${workflowId}:`, error);
      return {
        success: false,
        message: 'Failed to deactivate Google Calendar trigger',
      };
    }
  }

  /**
   * Get Google Calendar trigger status for a workflow
   */
  async getStatus(workflowId: string): Promise<TriggerStatus> {
    try {
      // Check polling status
      const pollingState = this.calendarPollingService.getWorkflowPollState(workflowId);

      if (pollingState) {
        return {
          active: true,
          type: TriggerType.GOOGLE_CALENDAR,
          message: 'Google Calendar trigger active (polling mode)',
          metadata: {
            mode: 'polling',
            lastChecked: new Date(pollingState.lastTimeChecked * 1000),
            triggerId: pollingState.triggerId,
            processedEvents: pollingState.processedEvents.length,
          },
        };
      }

      return {
        active: false,
        type: TriggerType.GOOGLE_CALENDAR,
        message: 'Google Calendar trigger not active',
      };
    } catch (error: any) {
      this.logger.error(`Failed to get Google Calendar trigger status for workflow ${workflowId}:`, error);
      return {
        active: false,
        type: TriggerType.GOOGLE_CALENDAR,
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
      this.logger.log(`Manually triggering Google Calendar poll for workflow ${workflowId}`);
      return await this.calendarPollingService.pollWorkflowManually(workflowId);
    } catch (error: any) {
      this.logger.error(`Failed to manually trigger Google Calendar poll for workflow ${workflowId}:`, error);
      throw error;
    }
  }

  /**
   * Find Google Calendar trigger node in workflow
   */
  private findCalendarTrigger(workflow: any): any | null {
    const canvas = workflow.workflow?.canvas || workflow.canvas;
    if (!canvas || !canvas.nodes) return null;

    return canvas.nodes.find(
      (node: any) =>
        node.type === 'GOOGLE_CALENDAR_TRIGGER' ||
        (node.type === 'CONNECTOR_TRIGGER' &&
         (node.data?.connectorType === 'google_calendar' || node.data?.connectorType === 'google-calendar'))
    );
  }
}
