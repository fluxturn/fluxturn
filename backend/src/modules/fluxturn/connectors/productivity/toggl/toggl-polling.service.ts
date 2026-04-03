import { Injectable, Logger, Inject, forwardRef } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PlatformService } from '../../../../database/platform.service';
import { WorkflowService } from '../../../workflow/workflow.service';
import { ConnectorsService } from '../../connectors.service';
import axios from 'axios';

/**
 * Toggl Polling Service
 * Implements n8n-style polling for Toggl triggers
 *
 * How it works:
 * 1. Every X minutes, check all active workflows with Toggl triggers
 * 2. For each workflow, fetch new time entries since last check
 * 3. Filter based on trigger configuration
 * 4. Deduplicate time entries to prevent double-processing
 * 5. Execute workflow for each new time entry
 *
 * Based on n8n's TogglTrigger implementation which uses polling
 * Reference: /Users/user/Desktop/n8n/packages/nodes-base/nodes/Toggl/TogglTrigger.node.ts
 */
@Injectable()
export class TogglPollingService {
  private readonly logger = new Logger(TogglPollingService.name);
  private readonly togglApiUrl = 'https://api.track.toggl.com/api/v9';

  // Store last check time per workflow
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
  async pollTogglTriggers() {
    try {
      // Get all active workflows with Toggl triggers
      const workflows = await this.getActiveTogglWorkflows();

      if (workflows.length === 0) {
        return; // No workflows to poll
      }

      for (const workflow of workflows) {
        try {
          // Check if enough time has passed for this workflow
          if (this.shouldPollWorkflow(workflow)) {
            await this.pollWorkflow(workflow);
          }
        } catch (error) {
          this.logger.error(
            `Failed to poll workflow ${workflow.id} (${workflow.name}):`,
            error
          );
          // Continue with next workflow even if one fails
        }
      }
    } catch (error) {
      this.logger.error('Toggl polling cycle failed:', error);
    }
  }

  /**
   * Check if a workflow should be polled based on its polling interval
   */
  private shouldPollWorkflow(workflow: any): boolean {
    const workflowId = workflow.id;
    const togglTrigger = this.findTogglTrigger(workflow);

    if (!togglTrigger) {
      return false;
    }

    // Get polling interval from trigger params (in minutes)
    const params = togglTrigger.data?.triggerParams || {};
    const pollingIntervalMinutes = parseInt(params.pollingInterval) || 5;

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
   * Poll a single workflow for new time entries
   */
  private async pollWorkflow(workflow: any): Promise<void> {
    const workflowId = workflow.id;

    // Get Toggl trigger node from workflow
    const togglTrigger = this.findTogglTrigger(workflow);
    if (!togglTrigger) {
      this.logger.warn(`Workflow ${workflowId} has no Toggl trigger, skipping`);
      return;
    }

    // Fetch credential from database
    const credentialId = togglTrigger.data?.credentialId;
    if (!credentialId) {
      this.logger.warn(`Workflow ${workflowId} has no Toggl credential configured, skipping`);
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

    // Get API token from credentials
    const apiToken = credentials.apiToken || credentials.api_token;
    if (!apiToken) {
      this.logger.warn(
        `Workflow ${workflowId} credentials missing apiToken. ` +
        `Available keys: ${Object.keys(credentials).join(', ')}`
      );
      return;
    }

    // Get or initialize poll state
    let pollState = this.workflowPollState.get(workflowId);
    let isFirstPoll = false;

    if (!pollState) {
      // Try to load from database first (survives backend restarts)
      pollState = await this.loadPollStateFromDatabase(workflowId);

      if (!pollState) {
        // Truly first poll - initialize new state
        const now = Math.floor(Date.now() / 1000);
        pollState = {
          lastTimeChecked: now,
          possibleDuplicates: [],
        };
        isFirstPoll = true;

        this.logger.log(
          `First poll for workflow "${workflow.name}" - will mark existing time entries as seen without triggering`
        );
      } else {
        this.logger.log(
          `Loaded poll state from database for workflow "${workflow.name}"`
        );
      }

      this.workflowPollState.set(workflowId, pollState);
    }

    const now = Math.floor(Date.now() / 1000);
    const startDate = pollState.lastTimeChecked;

    try {
      // Fetch time entries from Toggl
      const timeEntries = await this.fetchTogglTimeEntries(
        apiToken,
        startDate,
        now
      );

      if (timeEntries.length === 0) {
        pollState.lastTimeChecked = now;
        return;
      }

      this.logger.log(`Found ${timeEntries.length} time entry/entries for workflow "${workflow.name}"`);

      // Filter out duplicates
      const newTimeEntries = this.filterDuplicates(
        timeEntries,
        new Set(pollState.possibleDuplicates)
      );

      if (newTimeEntries.length === 0) {
        pollState.lastTimeChecked = now;
        return;
      }

      // IMPORTANT: On first poll, mark all existing time entries as seen WITHOUT executing the workflow
      // This prevents the workflow from triggering for all historical time entries when first activated
      if (isFirstPoll) {
        this.logger.log(
          `First poll: Marking ${newTimeEntries.length} existing time entry/entries as seen without triggering workflow`
        );

        // Mark all current time entries as duplicates without executing workflow
        const timeEntryIds = newTimeEntries.map(t => t.id);
        const lastTimeEntryDate = this.getLatestTimeEntryDate(newTimeEntries);

        pollState.lastTimeChecked = lastTimeEntryDate || now;
        pollState.possibleDuplicates = timeEntryIds;

        // Persist to database
        await this.savePollStateToDatabase(workflowId, pollState);

        return; // Skip workflow execution on first poll
      }

      // Execute workflow for each new time entry (only on subsequent polls)
      this.logger.log(`Triggering workflow for ${newTimeEntries.length} new time entry/entries`);

      for (const timeEntry of newTimeEntries) {
        try {
          await this.executeWorkflowForTimeEntry(workflowId, timeEntry);
        } catch (error) {
          this.logger.error(
            `Failed to execute workflow for time entry ${timeEntry.id}:`,
            error
          );
        }
      }

      // Update poll state
      const lastTimeEntryDate = this.getLatestTimeEntryDate(newTimeEntries);
      const newPossibleDuplicates = newTimeEntries.map(t => t.id);

      pollState.lastTimeChecked = lastTimeEntryDate || now;

      // IMPORTANT: Append to possibleDuplicates instead of replacing
      // This prevents false triggers when Toggl's date filter returns old entries
      // Keep only the last 1000 time entry IDs to prevent memory issues
      const maxDuplicatesToKeep = 1000;
      pollState.possibleDuplicates = [
        ...pollState.possibleDuplicates,
        ...newPossibleDuplicates
      ].slice(-maxDuplicatesToKeep);

      // Persist poll state to database
      await this.savePollStateToDatabase(workflowId, pollState);

    } catch (error: any) {
      if (error.response?.status === 401) {
        this.logger.error(
          `Toggl credentials expired for workflow ${workflowId}. ` +
          `User needs to re-authorize.`
        );
      } else {
        throw error;
      }
    }
  }

  /**
   * Get all active workflows with Toggl triggers
   */
  private async getActiveTogglWorkflows(): Promise<any[]> {
    const query = `
      SELECT id, name, status, canvas
      FROM workflows
      WHERE status = 'active'
      AND canvas IS NOT NULL
    `;

    const result = await this.platformService.query(query);

    // Filter workflows that have Toggl trigger nodes
    const togglWorkflows = result.rows.filter((workflow) => {
      const trigger = this.findTogglTrigger(workflow);
      return trigger !== null;
    });

    return togglWorkflows;
  }

  /**
   * Find Toggl trigger node in workflow
   */
  private findTogglTrigger(workflow: any): any | null {
    const canvas = workflow.canvas;

    if (!canvas || !canvas.nodes || canvas.nodes.length === 0) {
      return null;
    }

    const trigger = canvas.nodes.find(
      (node: any) =>
        node.type === 'TOGGL_TRIGGER' ||
        (node.type === 'CONNECTOR_TRIGGER' && node.data?.connectorType === 'toggl')
    );

    return trigger;
  }

  /**
   * Fetch time entries from Toggl API
   */
  private async fetchTogglTimeEntries(
    apiToken: string,
    startDate: number,
    endDate: number
  ): Promise<any[]> {
    try {
      // Convert Unix timestamps to ISO 8601 format
      const startISO = new Date(startDate * 1000).toISOString();
      const endISO = new Date(endDate * 1000).toISOString();

      // Toggl API uses Basic auth with format: {apiToken}:api_token
      const authHeader = `Basic ${Buffer.from(`${apiToken}:api_token`).toString('base64')}`;

      const response = await axios.get(
        `${this.togglApiUrl}/me/time_entries`,
        {
          headers: {
            'Authorization': authHeader,
          },
          params: {
            start_date: startISO,
            end_date: endISO,
          },
        }
      );

      return response.data || [];
    } catch (error: any) {
      if (error.response?.status === 404) {
        // No time entries found
        return [];
      }
      throw error;
    }
  }

  /**
   * Filter out duplicate time entries
   */
  private filterDuplicates(
    timeEntries: any[],
    duplicates: Set<number>
  ): any[] {
    return timeEntries.filter((timeEntry) => !duplicates.has(timeEntry.id));
  }

  /**
   * Get the latest time entry date from a list of time entries
   */
  private getLatestTimeEntryDate(timeEntries: any[]): number {
    let latest = 0;

    for (const timeEntry of timeEntries) {
      let date = 0;

      // Use start as the reference date
      if (timeEntry.start) {
        date = Math.floor(new Date(timeEntry.start).getTime() / 1000);
      }

      if (date > latest) {
        latest = date;
      }
    }

    return latest;
  }

  /**
   * Execute workflow for a specific time entry
   */
  private async executeWorkflowForTimeEntry(
    workflowId: string,
    timeEntry: any
  ): Promise<void> {
    this.logger.log(
      `Executing workflow ${workflowId} for time entry: ${timeEntry.description || timeEntry.id}`
    );

    try {
      // Execute the workflow with time entry data as input
      const result = await this.workflowService.executeWorkflow({
        workflow_id: workflowId,
        input_data: {
          togglTimeEntry: timeEntry,
          triggeredAt: new Date().toISOString(),
          trigger: 'toggl_polling',
        },
      });

      this.logger.log(
        `Successfully executed workflow ${workflowId} for time entry ${timeEntry.id}. ` +
        `Execution ID: ${result.id}`
      );
    } catch (error) {
      this.logger.error(
        `Failed to execute workflow ${workflowId} for time entry ${timeEntry.id}:`,
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
  async clearPollState(workflowId: string): Promise<void> {
    // Clear from memory
    this.workflowPollState.delete(workflowId);

    // Clear from database
    try {
      const getQuery = `SELECT metadata FROM workflows WHERE id = $1`;
      const result = await this.platformService.query(getQuery, [workflowId]);

      if (result.rows.length > 0) {
        const currentMetadata = result.rows[0].metadata || {};
        delete currentMetadata.togglPollState;

        const updateQuery = `
          UPDATE workflows
          SET metadata = $1, updated_at = NOW()
          WHERE id = $2
        `;

        await this.platformService.query(updateQuery, [
          JSON.stringify(currentMetadata),
          workflowId,
        ]);
      }

      this.logger.log(`Cleared poll state for workflow ${workflowId} (memory & database)`);
    } catch (error) {
      this.logger.error(`Failed to clear poll state from database for workflow ${workflowId}:`, error);
    }
  }

  /**
   * Get poll state for a workflow
   * Used by TogglTriggerService to check status
   */
  getWorkflowPollState(workflowId: string): WorkflowPollState | null {
    return this.workflowPollState.get(workflowId) || null;
  }

  /**
   * Load poll state from database
   * Allows poll state to survive backend restarts
   */
  private async loadPollStateFromDatabase(workflowId: string): Promise<WorkflowPollState | null> {
    try {
      const query = `
        SELECT metadata FROM workflows
        WHERE id = $1 AND metadata IS NOT NULL
      `;

      const result = await this.platformService.query(query, [workflowId]);

      if (result.rows.length === 0 || !result.rows[0].metadata) {
        return null;
      }

      const metadata = result.rows[0].metadata;
      const pollState = metadata.togglPollState;

      if (!pollState || !pollState.lastTimeChecked) {
        return null;
      }

      this.logger.debug(`Loaded Toggl poll state for workflow ${workflowId} from database`);

      return {
        lastTimeChecked: pollState.lastTimeChecked,
        possibleDuplicates: pollState.possibleDuplicates || [],
      };
    } catch (error) {
      this.logger.error(`Failed to load poll state from database for workflow ${workflowId}:`, error);
      return null;
    }
  }

  /**
   * Save poll state to database
   * Persists poll state so it survives backend restarts
   */
  private async savePollStateToDatabase(workflowId: string, pollState: WorkflowPollState): Promise<void> {
    try {
      // First, get current metadata
      const getQuery = `
        SELECT metadata FROM workflows
        WHERE id = $1
      `;

      const result = await this.platformService.query(getQuery, [workflowId]);

      if (result.rows.length === 0) {
        this.logger.warn(`Workflow ${workflowId} not found, cannot save poll state`);
        return;
      }

      const currentMetadata = result.rows[0].metadata || {};

      // Update with new poll state
      const updatedMetadata = {
        ...currentMetadata,
        togglPollState: {
          lastTimeChecked: pollState.lastTimeChecked,
          possibleDuplicates: pollState.possibleDuplicates,
          updatedAt: new Date().toISOString(),
        },
      };

      // Save back to database
      const updateQuery = `
        UPDATE workflows
        SET metadata = $1, updated_at = NOW()
        WHERE id = $2
      `;

      await this.platformService.query(updateQuery, [
        JSON.stringify(updatedMetadata),
        workflowId,
      ]);

      this.logger.debug(`Saved Toggl poll state for workflow ${workflowId} to database`);
    } catch (error) {
      this.logger.error(`Failed to save poll state to database for workflow ${workflowId}:`, error);
      // Don't throw - failing to save poll state shouldn't break the workflow
    }
  }
}

// Type definitions
interface WorkflowPollState {
  lastTimeChecked: number; // Unix timestamp in seconds
  possibleDuplicates: number[]; // Array of time entry IDs
}
