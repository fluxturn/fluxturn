import { Injectable, Logger, Inject, forwardRef } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PlatformService } from '../../../../database/platform.service';
import { WorkflowService } from '../../../workflow/workflow.service';
import { ConnectorsService } from '../../connectors.service';
import axios from 'axios';

/**
 * Clockify Polling Service
 * Implements n8n-style polling for Clockify triggers
 *
 * How it works:
 * 1. Every X minutes, check all active workflows with Clockify triggers
 * 2. For each workflow, fetch new time entries since last check
 * 3. Filter based on trigger configuration
 * 4. Deduplicate time entries to prevent double-processing
 * 5. Execute workflow for each new time entry
 *
 * Based on n8n's ClockifyTrigger implementation which uses polling
 * Reference: /Users/user/Desktop/n8n/packages/nodes-base/nodes/Clockify/ClockifyTrigger.node.ts
 */
@Injectable()
export class ClockifyPollingService {
  private readonly logger = new Logger(ClockifyPollingService.name);
  private readonly clockifyApiUrl = 'https://api.clockify.me/api/v1';

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
  async pollClockifyTriggers() {
    try {
      // Get all active workflows with Clockify triggers
      const workflows = await this.getActiveClockifyWorkflows();

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
      this.logger.error('Clockify polling cycle failed:', error);
    }
  }

  /**
   * Check if a workflow should be polled based on its polling interval
   */
  private shouldPollWorkflow(workflow: any): boolean {
    const workflowId = workflow.id;
    const clockifyTrigger = this.findClockifyTrigger(workflow);

    if (!clockifyTrigger) {
      return false;
    }

    // Get polling interval from trigger params (in minutes)
    const params = clockifyTrigger.data?.triggerParams || {};
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

    // Get Clockify trigger node from workflow
    const clockifyTrigger = this.findClockifyTrigger(workflow);
    if (!clockifyTrigger) {
      this.logger.warn(`Workflow ${workflowId} has no Clockify trigger, skipping`);
      return;
    }

    // Fetch credential from database
    const credentialId = clockifyTrigger.data?.credentialId;
    if (!credentialId) {
      this.logger.warn(`Workflow ${workflowId} has no Clockify credential configured, skipping`);
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

    // Get API key from credentials
    const apiKey = credentials.apiKey || credentials.api_key;
    if (!apiKey) {
      this.logger.warn(
        `Workflow ${workflowId} credentials missing apiKey. ` +
        `Available keys: ${Object.keys(credentials).join(', ')}`
      );
      return;
    }

    // Get workspace ID from trigger params
    const params = clockifyTrigger.data?.triggerParams || {};
    const workspaceId = params.workspaceId;

    if (!workspaceId) {
      this.logger.warn(`Workflow ${workflowId} missing workspaceId in trigger params`);
      return;
    }

    // Get user ID (required for time entries endpoint)
    let userId = params.userId;
    if (!userId) {
      // Fetch user ID from Clockify API
      try {
        const userInfo = await this.fetchUserInfo(apiKey);
        userId = userInfo.id;
      } catch (error) {
        this.logger.error(`Failed to fetch user info for workflow ${workflowId}:`, error);
        return;
      }
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
      // Fetch time entries from Clockify
      const timeEntries = await this.fetchClockifyTimeEntries(
        apiKey,
        workspaceId,
        userId,
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
      // This prevents false triggers when Clockify's date filter returns old entries
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
          `Clockify credentials expired for workflow ${workflowId}. ` +
          `User needs to re-authorize.`
        );
      } else {
        throw error;
      }
    }
  }

  /**
   * Get all active workflows with Clockify triggers
   */
  private async getActiveClockifyWorkflows(): Promise<any[]> {
    const query = `
      SELECT id, name, status, canvas
      FROM workflows
      WHERE status = 'active'
      AND canvas IS NOT NULL
    `;

    const result = await this.platformService.query(query);

    // Filter workflows that have Clockify trigger nodes
    const clockifyWorkflows = result.rows.filter((workflow) => {
      const trigger = this.findClockifyTrigger(workflow);
      return trigger !== null;
    });

    return clockifyWorkflows;
  }

  /**
   * Find Clockify trigger node in workflow
   */
  private findClockifyTrigger(workflow: any): any | null {
    const canvas = workflow.canvas;

    if (!canvas || !canvas.nodes || canvas.nodes.length === 0) {
      return null;
    }

    const trigger = canvas.nodes.find(
      (node: any) =>
        node.type === 'CLOCKIFY_TRIGGER' ||
        (node.type === 'CONNECTOR_TRIGGER' && node.data?.connectorType === 'clockify')
    );

    return trigger;
  }

  /**
   * Fetch user info from Clockify API
   */
  private async fetchUserInfo(apiKey: string): Promise<any> {
    try {
      const response = await axios.get(`${this.clockifyApiUrl}/user`, {
        headers: {
          'X-Api-Key': apiKey,
        },
      });

      return response.data;
    } catch (error: any) {
      this.logger.error('Failed to fetch user info from Clockify:', error.message);
      throw error;
    }
  }

  /**
   * Fetch time entries from Clockify API
   */
  private async fetchClockifyTimeEntries(
    apiKey: string,
    workspaceId: string,
    userId: string,
    startDate: number,
    endDate: number
  ): Promise<any[]> {
    try {
      // Convert Unix timestamps to ISO 8601 format
      const startISO = new Date(startDate * 1000).toISOString();
      const endISO = new Date(endDate * 1000).toISOString();

      const response = await axios.get(
        `${this.clockifyApiUrl}/workspaces/${workspaceId}/user/${userId}/time-entries`,
        {
          headers: {
            'X-Api-Key': apiKey,
          },
          params: {
            start: startISO,
            end: endISO,
            hydrated: true,
            'in-progress': false, // Only get completed time entries
          },
        }
      );

      return response.data || [];
    } catch (error: any) {
      if (error.response?.status === 404 || error.response?.data?.error?.code === 404) {
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
    duplicates: Set<string>
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

      // Use timeInterval.start as the reference date
      if (timeEntry.timeInterval?.start) {
        date = Math.floor(new Date(timeEntry.timeInterval.start).getTime() / 1000);
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
          clockifyTimeEntry: timeEntry,
          triggeredAt: new Date().toISOString(),
          trigger: 'clockify_polling',
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
        delete currentMetadata.clockifyPollState;

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
   * Used by ClockifyTriggerService to check status
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
      const pollState = metadata.clockifyPollState;

      if (!pollState || !pollState.lastTimeChecked) {
        return null;
      }

      this.logger.debug(`Loaded Clockify poll state for workflow ${workflowId} from database`);

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
        clockifyPollState: {
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

      this.logger.debug(`Saved Clockify poll state for workflow ${workflowId} to database`);
    } catch (error) {
      this.logger.error(`Failed to save poll state to database for workflow ${workflowId}:`, error);
      // Don't throw - failing to save poll state shouldn't break the workflow
    }
  }
}

// Type definitions
interface WorkflowPollState {
  lastTimeChecked: number; // Unix timestamp in seconds
  possibleDuplicates: string[]; // Array of time entry IDs
}
