import { Injectable, Logger, Inject, forwardRef } from '@nestjs/common';
import { PlatformService } from '../../../../database/platform.service';
import { WorkflowService } from '../../../workflow/workflow.service';
import { GoogleSheetsPollingService } from './google-sheets-polling.service';
import {
  ITriggerService,
  TriggerType,
  TriggerActivationResult,
  TriggerDeactivationResult,
  TriggerStatus,
} from '../../../workflow/interfaces/trigger.interface';

/**
 * Google Sheets Trigger Service
 *
 * Handles Google Sheets-specific trigger logic including:
 * - Polling activation/deactivation
 * - Status tracking
 *
 * This service is completely isolated from the main WorkflowService,
 * following single responsibility principle.
 */
@Injectable()
export class GoogleSheetsTriggerService implements ITriggerService {
  private readonly logger = new Logger(GoogleSheetsTriggerService.name);

  constructor(
    private readonly platformService: PlatformService,
    @Inject(forwardRef(() => WorkflowService))
    private readonly workflowService: WorkflowService,
    @Inject(forwardRef(() => GoogleSheetsPollingService))
    private readonly sheetsPollingService: GoogleSheetsPollingService
  ) {}

  getTriggerType(): TriggerType {
    return TriggerType.GOOGLE_SHEETS;
  }

  /**
   * Activate Google Sheets trigger for a workflow
   *
   * For polling-based triggers:
   * - No explicit activation needed, polling service checks all active workflows
   * - Just verify configuration is valid
   */
  async activate(workflowId: string, triggerConfig: any): Promise<TriggerActivationResult> {
    try {
      this.logger.log(`Activating Google Sheets trigger for workflow: ${workflowId}`);

      // Get workflow
      const workflow = await this.workflowService.getWorkflow(workflowId);
      if (!workflow) {
        return {
          success: false,
          message: 'Workflow not found',
          error: 'Workflow not found',
        };
      }

      // Find Sheets trigger node
      const sheetsTrigger = this.findSheetsTrigger(workflow);
      if (!sheetsTrigger) {
        return {
          success: false,
          message: 'No Google Sheets trigger found in workflow',
          error: 'No Google Sheets trigger found',
        };
      }

      // Fetch credentials from database
      const credentialId = sheetsTrigger.data?.credentialId || sheetsTrigger.data?.connectorConfigId;
      if (!credentialId) {
        return {
          success: false,
          message: 'Google Sheets credential not selected',
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
          message: 'Google Sheets credential not found',
          error: `Credential ${credentialId} not found in database`,
        };
      }

      const credentials = credentialRecord.rows[0].credentials;
      // Support both snake_case and camelCase
      const accessToken = credentials.access_token || credentials.accessToken;

      if (!accessToken) {
        return {
          success: false,
          message: 'Google Sheets credentials not properly configured',
          error: 'Missing accessToken in credentials',
        };
      }

      // Polling mode: No explicit activation needed
      // The polling service will automatically check this workflow
      const params = sheetsTrigger.data?.triggerParams || {};
      const pollingIntervalMinutes = parseInt(params.pollInterval) || parseInt(params.pollingInterval) || 5;
      const triggerId = sheetsTrigger.data?.triggerId || params.triggerId || 'row_added_or_updated';
      const spreadsheetId = params.spreadsheetId || 'not configured';
      const sheetName = params.sheet || 'not configured';

      this.logger.log(
        `Polling mode enabled for workflow ${workflowId} - ` +
        `interval: ${pollingIntervalMinutes} minute(s), ` +
        `trigger: ${triggerId}, spreadsheet: ${spreadsheetId}, sheet: ${sheetName}`
      );

      return {
        success: true,
        message: 'Google Sheets trigger activated (polling mode)',
        data: {
          mode: 'polling',
          pollingInterval: `${pollingIntervalMinutes} minute(s)`,
          triggerId,
          spreadsheetId,
          sheetName,
          note: 'Polling service will automatically check for sheet changes',
        },
      };
    } catch (error: any) {
      this.logger.error(`Failed to activate Google Sheets trigger for workflow ${workflowId}:`, error);
      return {
        success: false,
        message: 'Failed to activate Google Sheets trigger',
        error: error.message,
      };
    }
  }

  /**
   * Deactivate Google Sheets trigger for a workflow
   *
   * For polling mode: Clear poll state
   */
  async deactivate(workflowId: string): Promise<TriggerDeactivationResult> {
    try {
      this.logger.log(`Deactivating Google Sheets trigger for workflow: ${workflowId}`);

      // Clear polling state
      this.sheetsPollingService.clearPollState(workflowId);

      return {
        success: true,
        message: 'Google Sheets trigger deactivated',
      };
    } catch (error: any) {
      this.logger.error(`Failed to deactivate Google Sheets trigger for workflow ${workflowId}:`, error);
      return {
        success: false,
        message: 'Failed to deactivate Google Sheets trigger',
      };
    }
  }

  /**
   * Get Google Sheets trigger status for a workflow
   */
  async getStatus(workflowId: string): Promise<TriggerStatus> {
    try {
      // Check polling status
      const pollingState = this.sheetsPollingService.getWorkflowPollState(workflowId);

      if (pollingState) {
        return {
          active: true,
          type: TriggerType.GOOGLE_SHEETS,
          message: 'Google Sheets trigger active (polling mode)',
          metadata: {
            mode: 'polling',
            lastChecked: new Date(pollingState.lastTimeChecked * 1000),
            triggerId: pollingState.triggerId,
            hasSnapshot: !!pollingState.previousSnapshot,
          },
        };
      }

      return {
        active: false,
        type: TriggerType.GOOGLE_SHEETS,
        message: 'Google Sheets trigger not active',
      };
    } catch (error: any) {
      this.logger.error(`Failed to get Google Sheets trigger status for workflow ${workflowId}:`, error);
      return {
        active: false,
        type: TriggerType.GOOGLE_SHEETS,
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
      this.logger.log(`Manually triggering Google Sheets poll for workflow ${workflowId}`);
      return await this.sheetsPollingService.pollWorkflowManually(workflowId);
    } catch (error: any) {
      this.logger.error(`Failed to manually trigger Google Sheets poll for workflow ${workflowId}:`, error);
      throw error;
    }
  }

  /**
   * Find Google Sheets trigger node in workflow
   */
  private findSheetsTrigger(workflow: any): any | null {
    const canvas = workflow.workflow?.canvas || workflow.canvas;
    if (!canvas || !canvas.nodes) return null;

    return canvas.nodes.find(
      (node: any) =>
        node.type === 'GOOGLE_SHEETS_TRIGGER' ||
        (node.type === 'CONNECTOR_TRIGGER' &&
         (node.data?.connectorType === 'google_sheets' || node.data?.connectorType === 'google-sheets'))
    );
  }
}
