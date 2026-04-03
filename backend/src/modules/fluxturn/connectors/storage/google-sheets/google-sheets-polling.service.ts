import { Injectable, Logger, Inject, forwardRef } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PlatformService } from '../../../../database/platform.service';
import { WorkflowService } from '../../../workflow/workflow.service';
import { ConnectorsService } from '../../connectors.service';
import axios from 'axios';

/**
 * Google Sheets Polling Service
 * Implements n8n-style polling for Google Sheets triggers
 *
 * How it works:
 * 1. Every X minutes, check all active workflows with Google Sheets triggers
 * 2. For each workflow, fetch current sheet data
 * 3. Compare with previous snapshot to detect changes
 * 4. Detect: row added, row updated, or both
 * 5. Execute workflow for each detected change
 */
@Injectable()
export class GoogleSheetsPollingService {
  private readonly logger = new Logger(GoogleSheetsPollingService.name);
  private readonly sheetsApiUrl = 'https://sheets.googleapis.com/v4';

  // Store last snapshot per workflow
  private workflowPollState = new Map<string, WorkflowPollState>();

  constructor(
    private readonly platformService: PlatformService,
    @Inject(forwardRef(() => WorkflowService))
    private readonly workflowService: WorkflowService,
    @Inject(forwardRef(() => ConnectorsService))
    private readonly connectorsService: ConnectorsService
  ) {}

  /**
   * Main polling cron job - runs every minute
   * Each workflow can have its own polling interval (1, 5, 15, 30, 60 minutes)
   */
  @Cron(CronExpression.EVERY_MINUTE)
  async pollSheetsTriggers() {
    try {
      // this.logger.debug('[POLL CYCLE] Starting Google Sheets polling cycle...');

      // Get all active workflows with Google Sheets triggers
      const workflows = await this.getActiveSheetsWorkflows();

      // this.logger.debug(`[POLL CYCLE] Found ${workflows.length} active workflow(s) with Google Sheets triggers`);

      if (workflows.length === 0) {
        return; // No workflows to poll
      }

      for (const workflow of workflows) {
        try {
          // this.logger.debug(`[POLL CYCLE] Checking workflow ${workflow.id} (${workflow.name})`);

          // Check if enough time has passed for this workflow
          if (this.shouldPollWorkflow(workflow)) {
            this.logger.log(`[POLL CYCLE] Polling workflow ${workflow.id} (${workflow.name})`);
            await this.pollWorkflow(workflow);
          } else {
            // this.logger.debug(`[POLL CYCLE] Skipping workflow ${workflow.id} - not time to poll yet`);
          }
        } catch (error) {
          this.logger.error(
            `[POLL CYCLE] Failed to poll workflow ${workflow.id} (${workflow.name}):`,
            error
          );
          // Continue with next workflow even if one fails
        }
      }
    } catch (error) {
      this.logger.error('[POLL CYCLE] Google Sheets polling cycle failed:', error);
    }
  }

  /**
   * Check if a workflow should be polled based on its polling interval
   */
  private shouldPollWorkflow(workflow: any): boolean {
    const workflowId = workflow.id;
    const sheetsTrigger = this.findSheetsTrigger(workflow);

    if (!sheetsTrigger) {
      return false;
    }

    // Get polling interval from trigger params (in minutes)
    const params = sheetsTrigger.data?.triggerParams || {};
    const pollingIntervalMinutes = parseInt(params.pollInterval) || parseInt(params.pollingInterval) || 5;

    // Get last poll time
    const pollState = this.workflowPollState.get(workflowId);
    if (!pollState) {
      return true; // Never polled before, poll now
    }

    const now = Math.floor(Date.now() / 1000);
    const timeSinceLastPoll = now - pollState.lastTimeChecked;
    const pollingIntervalSeconds = pollingIntervalMinutes * 60;

    return timeSinceLastPoll >= pollingIntervalSeconds;
  }

  /**
   * Poll a single workflow for sheet changes
   */
  private async pollWorkflow(workflow: any): Promise<void> {
    const workflowId = workflow.id;

    this.logger.debug(`[POLL] Starting poll for workflow ${workflowId}`);

    // Get Sheets trigger node from workflow
    const sheetsTrigger = this.findSheetsTrigger(workflow);
    if (!sheetsTrigger) {
      this.logger.warn(`[POLL] Workflow ${workflowId} has no Google Sheets trigger, skipping`);
      return;
    }

    this.logger.debug(`[POLL] Found trigger node:`, JSON.stringify({
      type: sheetsTrigger.type,
      triggerId: sheetsTrigger.data?.triggerId,
      credentialId: sheetsTrigger.data?.credentialId || sheetsTrigger.data?.connectorConfigId
    }));

    // Fetch credential from database
    const credentialId = sheetsTrigger.data?.credentialId || sheetsTrigger.data?.connectorConfigId;
    if (!credentialId) {
      this.logger.warn(`[POLL] Workflow ${workflowId} has no Google Sheets credential configured, skipping`);
      return;
    }

    // Fetch and decrypt credentials using ConnectorsService
    let credentials;
    try {
      credentials = await this.connectorsService.getConnectorCredentials(credentialId);
    } catch (error: any) {
      this.logger.warn(
        `Failed to fetch credential ${credentialId} for workflow ${workflowId}: ${error.message}`
      );
      return;
    }

    // Check if token is expired and refresh if needed
    const expiresAt = credentials.expiresAt;
    if (expiresAt) {
      const expirationTime = new Date(expiresAt).getTime();
      const currentTime = Date.now();
      const fiveMinutesInMs = 5 * 60 * 1000;

      this.logger.debug(`[POLL] Token expiration check - Current: ${new Date(currentTime).toISOString()}, Expires: ${new Date(expirationTime).toISOString()}`);

      // Refresh if expired or expiring within 5 minutes
      if (currentTime >= expirationTime - fiveMinutesInMs) {
        this.logger.log(`[POLL] OAuth token expired or expiring soon, refreshing...`);
        try {
          const refreshedTokens = await this.refreshAccessToken(credentials);

          // Update credentials in memory
          credentials.accessToken = refreshedTokens.accessToken;
          credentials.access_token = refreshedTokens.accessToken;
          if (refreshedTokens.refreshToken) {
            credentials.refreshToken = refreshedTokens.refreshToken;
            credentials.refresh_token = refreshedTokens.refreshToken;
          }
          credentials.expiresAt = refreshedTokens.expiresAt;

          // Update in database
          await this.platformService.query(
            'UPDATE connector_configs SET credentials = $1, updated_at = NOW() WHERE id = $2',
            [credentials, credentialId]
          );

          this.logger.log(`[POLL] OAuth token refreshed successfully for workflow ${workflowId}`);
        } catch (error) {
          this.logger.error(`[POLL] Failed to refresh OAuth token:`, error.message);
          return;
        }
      }
    }

    // Support both snake_case and camelCase
    const accessToken = credentials.access_token || credentials.accessToken;

    if (!accessToken) {
      this.logger.warn(
        `[POLL] Workflow ${workflowId} credentials missing accessToken. ` +
        `Available keys: ${Object.keys(credentials).join(', ')}`
      );
      return;
    }

    const params = sheetsTrigger.data?.triggerParams || {};
    const spreadsheetId = params.spreadsheetId;
    const sheetName = params.sheet;
    const triggerId = sheetsTrigger.data?.triggerId || params.triggerId || 'row_added_or_updated';

    this.logger.debug(`[POLL] Trigger configuration:`, JSON.stringify({
      spreadsheetId,
      sheetName,
      triggerId,
      allParams: params
    }));

    if (!spreadsheetId || !sheetName) {
      this.logger.warn(`[POLL] Workflow ${workflowId} missing spreadsheet or sheet configuration`);
      return;
    }

    // Get or initialize poll state
    let pollState = this.workflowPollState.get(workflowId);
    if (!pollState) {
      pollState = {
        lastTimeChecked: Math.floor(Date.now() / 1000),
        previousSnapshot: null,
        triggerId,
      };
      this.workflowPollState.set(workflowId, pollState);
    }

    const now = Math.floor(Date.now() / 1000);

    try {
      // Fetch current sheet data
      this.logger.debug(`[POLL] Fetching sheet data for ${spreadsheetId}/${sheetName}`);
      const currentData = await this.fetchSheetData(accessToken, spreadsheetId, sheetName);

      this.logger.debug(`[POLL] Fetched ${currentData?.length || 0} rows`);

      if (!currentData || currentData.length === 0) {
        this.logger.debug(`[POLL] No data found in sheet, skipping`);
        pollState.lastTimeChecked = now;
        return;
      }

      // First time polling - just store snapshot
      if (!pollState.previousSnapshot) {
        pollState.previousSnapshot = this.createSnapshot(currentData);
        pollState.lastTimeChecked = now;
        this.logger.log(`[POLL] Initial snapshot stored for workflow "${workflow.name}" (${currentData.length} rows)`);
        return;
      }

      this.logger.debug(`[POLL] Comparing with previous snapshot (${pollState.previousSnapshot.rowCount} rows)`);

      // Detect changes based on trigger type
      const changes = this.detectChanges(
        pollState.previousSnapshot,
        currentData,
        triggerId
      );

      this.logger.debug(`[POLL] Detected ${changes.length} change(s) for trigger type: ${triggerId}`);

      if (changes.length === 0) {
        this.logger.debug(`[POLL] No changes detected, updating last check time`);
        pollState.lastTimeChecked = now;
        return;
      }

      this.logger.log(`[POLL] Found ${changes.length} change(s) for workflow "${workflow.name}" (trigger: ${triggerId})`);

      // Execute workflow for each change
      for (const change of changes) {
        try {
          this.logger.log(`[POLL] Executing workflow for row ${change.rowIndex} (${change.type})`);
          await this.executeWorkflowForChange(workflowId, change, spreadsheetId, sheetName);
        } catch (error) {
          this.logger.error(
            `[POLL] Failed to execute workflow for change at row ${change.rowIndex}:`,
            error
          );
        }
      }

      // Update snapshot
      pollState.previousSnapshot = this.createSnapshot(currentData);
      pollState.lastTimeChecked = now;
      this.logger.debug(`[POLL] Updated snapshot with ${currentData.length} rows`);

    } catch (error: any) {
      if (error.response?.status === 401) {
        this.logger.error(
          `[POLL] Google Sheets credentials expired for workflow ${workflowId}. ` +
          `User needs to re-authorize.`
        );
      } else {
        this.logger.error(`[POLL] Error during poll:`, error);
        throw error;
      }
    }
  }

  /**
   * Fetch sheet data from Google Sheets API
   */
  private async fetchSheetData(
    accessToken: string,
    spreadsheetId: string,
    sheetName: string
  ): Promise<any[][]> {
    const range = `${sheetName}`;

    const response = await axios.get(
      `${this.sheetsApiUrl}/spreadsheets/${spreadsheetId}/values/${encodeURIComponent(range)}`,
      {
        headers: { Authorization: `Bearer ${accessToken}` },
      }
    );

    return response.data.values || [];
  }

  /**
   * Create snapshot of sheet data for comparison
   */
  private createSnapshot(data: any[][]): SheetSnapshot {
    return {
      rowCount: data.length,
      rows: data.map((row, index) => ({
        index,
        values: row,
        hash: this.hashRow(row)
      }))
    };
  }

  /**
   * Hash a row for comparison (simple JSON stringify)
   */
  private hashRow(row: any[]): string {
    return JSON.stringify(row);
  }

  /**
   * Detect changes between snapshots based on trigger type
   */
  private detectChanges(
    previousSnapshot: SheetSnapshot,
    currentData: any[][],
    triggerId: string
  ): RowChange[] {
    const changes: RowChange[] = [];
    const currentSnapshot = this.createSnapshot(currentData);

    // Skip header row (index 0)
    const previousRows = previousSnapshot.rows.slice(1);
    const currentRows = currentSnapshot.rows.slice(1);

    switch (triggerId) {
      case 'row_added':
        // Only detect new rows
        if (currentRows.length > previousRows.length) {
          for (let i = previousRows.length; i < currentRows.length; i++) {
            changes.push({
              type: 'added',
              rowIndex: currentRows[i].index + 1, // +1 for 1-based index
              values: currentRows[i].values,
              previousValues: null
            });
          }
        }
        break;

      case 'row_updated':
        // Only detect updated rows
        const minLength = Math.min(previousRows.length, currentRows.length);
        for (let i = 0; i < minLength; i++) {
          if (previousRows[i].hash !== currentRows[i].hash) {
            changes.push({
              type: 'updated',
              rowIndex: currentRows[i].index + 1,
              values: currentRows[i].values,
              previousValues: previousRows[i].values
            });
          }
        }
        break;

      case 'row_added_or_updated':
        // Detect both added and updated rows
        // Check for updated rows
        const minLen = Math.min(previousRows.length, currentRows.length);
        for (let i = 0; i < minLen; i++) {
          if (previousRows[i].hash !== currentRows[i].hash) {
            changes.push({
              type: 'updated',
              rowIndex: currentRows[i].index + 1,
              values: currentRows[i].values,
              previousValues: previousRows[i].values
            });
          }
        }

        // Check for new rows
        if (currentRows.length > previousRows.length) {
          for (let i = previousRows.length; i < currentRows.length; i++) {
            changes.push({
              type: 'added',
              rowIndex: currentRows[i].index + 1,
              values: currentRows[i].values,
              previousValues: null
            });
          }
        }
        break;
    }

    return changes;
  }

  /**
   * Get all active workflows with Google Sheets triggers
   */
  private async getActiveSheetsWorkflows(): Promise<any[]> {
    const query = `
      SELECT id, name, status, canvas
      FROM workflows
      WHERE status = 'active'
      AND canvas IS NOT NULL
    `;

    const result = await this.platformService.query(query);

    // Filter workflows that have Sheets trigger nodes
    const sheetsWorkflows = result.rows.filter((workflow) => {
      const trigger = this.findSheetsTrigger(workflow);
      return trigger !== null;
    });

    return sheetsWorkflows;
  }

  /**
   * Find Google Sheets trigger node in workflow
   */
  private findSheetsTrigger(workflow: any): any | null {
    const canvas = workflow.canvas;

    if (!canvas || !canvas.nodes || canvas.nodes.length === 0) {
      return null;
    }

    const trigger = canvas.nodes.find(
      (node: any) =>
        node.type === 'GOOGLE_SHEETS_TRIGGER' ||
        (node.type === 'CONNECTOR_TRIGGER' &&
         (node.data?.connectorType === 'google_sheets' || node.data?.connectorType === 'google-sheets'))
    );

    return trigger;
  }

  /**
   * Execute workflow for a specific row change
   */
  private async executeWorkflowForChange(
    workflowId: string,
    change: RowChange,
    spreadsheetId: string,
    sheetName: string
  ): Promise<void> {
    this.logger.log(
      `Executing workflow ${workflowId} for row ${change.rowIndex} (${change.type})`
    );

    try {
      // Execute the workflow with row data as input
      const result = await this.workflowService.executeWorkflow({
        workflow_id: workflowId,
        input_data: {
          sheetData: {
            spreadsheetId,
            sheet: sheetName,
            rowIndex: change.rowIndex,
            values: change.values,
            eventType: change.type,
            previousValues: change.previousValues,
          },
          triggeredAt: new Date().toISOString(),
          trigger: `google_sheets_${change.type}`,
        },
      });

      this.logger.log(
        `Successfully executed workflow ${workflowId} for row ${change.rowIndex}. ` +
        `Execution ID: ${result.id}`
      );
    } catch (error) {
      this.logger.error(
        `Failed to execute workflow ${workflowId} for row ${change.rowIndex}:`,
        error
      );
      throw error;
    }
  }

  /**
   * Manually trigger a poll for a specific workflow
   * Useful for testing or manual execution
   */
  async pollWorkflowManually(workflowId: string): Promise<any> {
    const query = `SELECT * FROM workflows WHERE id = $1`;
    const result = await this.platformService.query(query, [workflowId]);

    if (result.rows.length === 0) {
      throw new Error('Workflow not found');
    }

    const workflow = result.rows[0];
    await this.pollWorkflow(workflow);

    return {
      success: true,
      message: 'Manual poll completed',
    };
  }

  /**
   * Clear poll state for a workflow
   * Useful when resetting a workflow
   */
  clearPollState(workflowId: string): void {
    this.workflowPollState.delete(workflowId);
    this.logger.log(`Cleared poll state for workflow ${workflowId}`);
  }

  /**
   * Get poll state for a workflow
   * Used by GoogleSheetsTriggerService to check status
   */
  getWorkflowPollState(workflowId: string): WorkflowPollState | null {
    return this.workflowPollState.get(workflowId) || null;
  }

  /**
   * Refresh OAuth access token using refresh token
   */
  private async refreshAccessToken(credentials: any): Promise<any> {
    const axios = require('axios');

    const refreshToken = credentials.refreshToken || credentials.refresh_token;
    const clientId = credentials.clientId;
    const clientSecret = credentials.clientSecret;

    if (!refreshToken) {
      throw new Error('No refresh token available');
    }

    if (!clientId || !clientSecret) {
      throw new Error('Client ID and Secret are required for token refresh');
    }

    const params = new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      refresh_token: refreshToken,
      grant_type: 'refresh_token'
    });

    const response = await axios.post(
      'https://oauth2.googleapis.com/token',
      params.toString(),
      {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        timeout: 10000
      }
    );

    const tokens = response.data;

    return {
      accessToken: tokens.access_token,
      refreshToken: tokens.refresh_token || refreshToken,
      expiresAt: new Date(Date.now() + (tokens.expires_in * 1000)).toISOString(),
      tokenType: tokens.token_type,
      scope: tokens.scope
    };
  }
}

// Type definitions
interface WorkflowPollState {
  lastTimeChecked: number; // Unix timestamp in seconds
  previousSnapshot: SheetSnapshot | null;
  triggerId: string; // Type of trigger (row_added, row_updated, row_added_or_updated)
}

interface SheetSnapshot {
  rowCount: number;
  rows: Array<{
    index: number;
    values: any[];
    hash: string;
  }>;
}

interface RowChange {
  type: 'added' | 'updated';
  rowIndex: number;
  values: any[];
  previousValues: any[] | null;
}
