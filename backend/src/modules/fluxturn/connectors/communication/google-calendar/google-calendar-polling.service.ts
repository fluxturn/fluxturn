import { Injectable, Logger, Inject, forwardRef } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PlatformService } from '../../../../database/platform.service';
import { WorkflowService } from '../../../workflow/workflow.service';
import { ConnectorsService } from '../../connectors.service';
import axios from 'axios';

/**
 * Google Calendar Polling Service
 * Implements n8n-style polling for Google Calendar triggers
 *
 * How it works:
 * 1. Every X minutes, check all active workflows with Google Calendar triggers
 * 2. For each workflow, fetch events based on trigger type (created, updated, started, ended, cancelled)
 * 3. Filter events based on trigger configuration
 * 4. Deduplicate events to prevent double-processing
 * 5. Execute workflow for each new/updated event
 */
@Injectable()
export class GoogleCalendarPollingService {
  private readonly logger = new Logger(GoogleCalendarPollingService.name);
  private readonly calendarApiUrl = 'https://www.googleapis.com/calendar/v3';

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
  async pollCalendarTriggers() {
    try {
      // Get all active workflows with Google Calendar triggers
      const workflows = await this.getActiveCalendarWorkflows();

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
      this.logger.error('Google Calendar polling cycle failed:', error);
    }
  }

  /**
   * Check if a workflow should be polled based on its polling interval
   */
  private shouldPollWorkflow(workflow: any): boolean {
    const workflowId = workflow.id;
    const calendarTrigger = this.findCalendarTrigger(workflow);

    if (!calendarTrigger) {
      return false;
    }

    // Get polling interval from trigger params (in minutes)
    const params = calendarTrigger.data?.triggerParams || {};
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
   * Poll a single workflow for calendar events
   */
  private async pollWorkflow(workflow: any): Promise<void> {
    const workflowId = workflow.id;

    // Get Calendar trigger node from workflow
    const calendarTrigger = this.findCalendarTrigger(workflow);
    if (!calendarTrigger) {
      this.logger.warn(`Workflow ${workflowId} has no Google Calendar trigger, skipping`);
      return;
    }

    // Fetch credential from database
    const credentialId = calendarTrigger.data?.credentialId || calendarTrigger.data?.connectorConfigId;
    if (!credentialId) {
      this.logger.warn(`Workflow ${workflowId} has no Google Calendar credential configured, skipping`);
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

      // Refresh if expired or expiring within 5 minutes
      if (currentTime >= expirationTime - fiveMinutesInMs) {
        this.logger.log('OAuth token expired or expiring soon, refreshing...');
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

          this.logger.log(`OAuth token refreshed successfully for workflow ${workflowId}`);
        } catch (error) {
          this.logger.error(`Failed to refresh OAuth token:`, error.message);
          return;
        }
      }
    }

    // Support both snake_case and camelCase
    const accessToken = credentials.access_token || credentials.accessToken;

    if (!accessToken) {
      this.logger.warn(
        `Workflow ${workflowId} credentials missing accessToken. ` +
        `Available keys: ${Object.keys(credentials).join(', ')}`
      );
      return;
    }

    // Get or initialize poll state
    let pollState = this.workflowPollState.get(workflowId);
    if (!pollState) {
      pollState = {
        lastTimeChecked: Math.floor(Date.now() / 1000),
        processedEvents: [],
        triggerId: calendarTrigger.data?.triggerId || 'event_created',
      };
      this.workflowPollState.set(workflowId, pollState);
    }

    const now = Math.floor(Date.now() / 1000);
    const params = calendarTrigger.data?.triggerParams || {};
    const triggerId = calendarTrigger.data?.triggerId || params.triggerId || 'event_created';
    const calendarId = params.calendarId || 'primary';

    try {
      let events: any[] = [];

      // Fetch events based on trigger type
      switch (triggerId) {
        case 'event_created':
          events = await this.fetchCreatedEvents(accessToken, calendarId, pollState.lastTimeChecked);
          break;
        case 'event_updated':
          events = await this.fetchUpdatedEvents(accessToken, calendarId, pollState.lastTimeChecked);
          break;
        case 'event_cancelled':
          events = await this.fetchCancelledEvents(accessToken, calendarId, pollState.lastTimeChecked);
          break;
        case 'event_started':
          events = await this.fetchStartedEvents(accessToken, calendarId);
          break;
        case 'event_ended':
          events = await this.fetchEndedEvents(accessToken, calendarId);
          break;
        default:
          this.logger.warn(`Unknown trigger type: ${triggerId}`);
          return;
      }

      if (events.length === 0) {
        pollState.lastTimeChecked = now;
        return;
      }

      this.logger.log(`Found ${events.length} event(s) for workflow "${workflow.name}" (trigger: ${triggerId})`);

      // Filter out duplicates
      const newEvents = this.filterDuplicates(
        events,
        new Set(pollState.processedEvents)
      );

      if (newEvents.length === 0) {
        pollState.lastTimeChecked = now;
        return;
      }

      // Execute workflow for each new event
      for (const event of newEvents) {
        try {
          await this.executeWorkflowForEvent(workflowId, event, triggerId);
        } catch (error) {
          this.logger.error(
            `Failed to execute workflow for event ${event.id}:`,
            error
          );
        }
      }

      // Update poll state
      const newProcessedEvents = newEvents.map(e => e.id);

      pollState.lastTimeChecked = now;
      pollState.processedEvents = newProcessedEvents.slice(-100); // Keep last 100 event IDs

    } catch (error: any) {
      if (error.response?.status === 401) {
        this.logger.error(
          `Google Calendar credentials expired for workflow ${workflowId}. ` +
          `User needs to re-authorize.`
        );
      } else {
        throw error;
      }
    }
  }

  /**
   * Fetch newly created events
   */
  private async fetchCreatedEvents(
    accessToken: string,
    calendarId: string,
    since: number
  ): Promise<any[]> {
    const timeMin = new Date(since * 1000).toISOString();

    const response = await axios.get(
      `${this.calendarApiUrl}/calendars/${encodeURIComponent(calendarId)}/events`,
      {
        headers: { Authorization: `Bearer ${accessToken}` },
        params: {
          timeMin,
          singleEvents: true,
          orderBy: 'startTime',
          maxResults: 50,
        },
      }
    );

    return (response.data.items || []).filter((event: any) => {
      const created = new Date(event.created).getTime() / 1000;
      return created >= since && event.status !== 'cancelled';
    });
  }

  /**
   * Fetch updated events
   */
  private async fetchUpdatedEvents(
    accessToken: string,
    calendarId: string,
    since: number
  ): Promise<any[]> {
    const timeMin = new Date(since * 1000).toISOString();

    const response = await axios.get(
      `${this.calendarApiUrl}/calendars/${encodeURIComponent(calendarId)}/events`,
      {
        headers: { Authorization: `Bearer ${accessToken}` },
        params: {
          timeMin,
          singleEvents: true,
          orderBy: 'updated',
          maxResults: 50,
        },
      }
    );

    return (response.data.items || []).filter((event: any) => {
      const updated = new Date(event.updated).getTime() / 1000;
      const created = new Date(event.created).getTime() / 1000;
      return updated >= since && updated > created && event.status !== 'cancelled';
    });
  }

  /**
   * Fetch cancelled events
   */
  private async fetchCancelledEvents(
    accessToken: string,
    calendarId: string,
    since: number
  ): Promise<any[]> {
    const timeMin = new Date(since * 1000).toISOString();

    const response = await axios.get(
      `${this.calendarApiUrl}/calendars/${encodeURIComponent(calendarId)}/events`,
      {
        headers: { Authorization: `Bearer ${accessToken}` },
        params: {
          timeMin,
          singleEvents: true,
          showDeleted: true,
          maxResults: 50,
        },
      }
    );

    return (response.data.items || []).filter((event: any) => {
      const updated = new Date(event.updated).getTime() / 1000;
      return event.status === 'cancelled' && updated >= since;
    });
  }

  /**
   * Fetch events that are starting now (within the last 2 minutes)
   */
  private async fetchStartedEvents(
    accessToken: string,
    calendarId: string
  ): Promise<any[]> {
    const now = new Date();
    const twoMinutesAgo = new Date(now.getTime() - 2 * 60 * 1000);
    const fiveMinutesFromNow = new Date(now.getTime() + 5 * 60 * 1000);

    const response = await axios.get(
      `${this.calendarApiUrl}/calendars/${encodeURIComponent(calendarId)}/events`,
      {
        headers: { Authorization: `Bearer ${accessToken}` },
        params: {
          timeMin: twoMinutesAgo.toISOString(),
          timeMax: fiveMinutesFromNow.toISOString(),
          singleEvents: true,
          orderBy: 'startTime',
          maxResults: 20,
        },
      }
    );

    return (response.data.items || []).filter((event: any) => {
      const start = new Date(event.start?.dateTime || event.start?.date);
      return start <= now && start >= twoMinutesAgo && event.status !== 'cancelled';
    });
  }

  /**
   * Fetch events that ended recently (within the last 2 minutes)
   */
  private async fetchEndedEvents(
    accessToken: string,
    calendarId: string
  ): Promise<any[]> {
    const now = new Date();
    const twoMinutesAgo = new Date(now.getTime() - 2 * 60 * 1000);

    const response = await axios.get(
      `${this.calendarApiUrl}/calendars/${encodeURIComponent(calendarId)}/events`,
      {
        headers: { Authorization: `Bearer ${accessToken}` },
        params: {
          timeMin: twoMinutesAgo.toISOString(),
          timeMax: now.toISOString(),
          singleEvents: true,
          orderBy: 'startTime',
          maxResults: 20,
        },
      }
    );

    return (response.data.items || []).filter((event: any) => {
      const end = new Date(event.end?.dateTime || event.end?.date);
      return end <= now && end >= twoMinutesAgo && event.status !== 'cancelled';
    });
  }

  /**
   * Get all active workflows with Google Calendar triggers
   */
  private async getActiveCalendarWorkflows(): Promise<any[]> {
    const query = `
      SELECT id, name, status, canvas
      FROM workflows
      WHERE status = 'active'
      AND canvas IS NOT NULL
    `;

    const result = await this.platformService.query(query);

    // Filter workflows that have Calendar trigger nodes
    const calendarWorkflows = result.rows.filter((workflow) => {
      const trigger = this.findCalendarTrigger(workflow);
      return trigger !== null;
    });

    return calendarWorkflows;
  }

  /**
   * Find Google Calendar trigger node in workflow
   */
  private findCalendarTrigger(workflow: any): any | null {
    const canvas = workflow.canvas;

    if (!canvas || !canvas.nodes || canvas.nodes.length === 0) {
      return null;
    }

    const trigger = canvas.nodes.find(
      (node: any) =>
        node.type === 'GOOGLE_CALENDAR_TRIGGER' ||
        (node.type === 'CONNECTOR_TRIGGER' &&
         (node.data?.connectorType === 'google_calendar' || node.data?.connectorType === 'google-calendar'))
    );

    return trigger;
  }

  /**
   * Filter out duplicate events
   */
  private filterDuplicates(
    events: any[],
    duplicates: Set<string>
  ): any[] {
    return events.filter((event) => !duplicates.has(event.id));
  }

  /**
   * Execute workflow for a specific calendar event
   */
  private async executeWorkflowForEvent(
    workflowId: string,
    event: any,
    triggerId: string
  ): Promise<void> {
    this.logger.log(
      `Executing workflow ${workflowId} for event: ${event.summary} (${triggerId})`
    );

    try {
      // Execute the workflow with event data as input
      const result = await this.workflowService.executeWorkflow({
        workflow_id: workflowId,
        input_data: {
          calendarEvent: event,
          triggeredAt: new Date().toISOString(),
          trigger: `google_calendar_${triggerId}`,
          eventId: event.id,
          eventSummary: event.summary,
          eventStart: event.start,
          eventEnd: event.end,
        },
      });

      this.logger.log(
        `Successfully executed workflow ${workflowId} for event ${event.id}. ` +
        `Execution ID: ${result.id}`
      );
    } catch (error) {
      this.logger.error(
        `Failed to execute workflow ${workflowId} for event ${event.id}:`,
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
   * Used by GoogleCalendarTriggerService to check status
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
  processedEvents: string[]; // Array of event IDs
  triggerId: string; // Type of trigger (event_created, event_updated, etc.)
}
