import { Injectable, Logger, Inject, forwardRef } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PlatformService } from '../../../../database/platform.service';
import { WorkflowService } from '../../../workflow/workflow.service';
import { ConnectorsService } from '../../connectors.service';
import axios from 'axios';

/**
 * Gmail Polling Service
 * Implements n8n-style polling for Gmail triggers
 *
 * How it works:
 * 1. Every X minutes, check all active workflows with Gmail triggers
 * 2. For each workflow, fetch new emails since last check
 * 3. Filter emails based on trigger configuration
 * 4. Deduplicate emails to prevent double-processing
 * 5. Execute workflow for each new email
 */
@Injectable()
export class GmailPollingService {
  private readonly logger = new Logger(GmailPollingService.name);
  private readonly gmailApiUrl = 'https://gmail.googleapis.com/gmail/v1';

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
  async pollGmailTriggers() {
    try {
      // Get all active workflows with Gmail triggers
      const workflows = await this.getActiveGmailWorkflows();

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
      this.logger.error('Gmail polling cycle failed:', error);
    }
  }

  /**
   * Check if a workflow should be polled based on its polling interval
   */
  private shouldPollWorkflow(workflow: any): boolean {
    const workflowId = workflow.id;
    const gmailTrigger = this.findGmailTrigger(workflow);

    if (!gmailTrigger) {
      return false;
    }

    // Get polling interval from trigger params (in minutes)
    const params = gmailTrigger.data?.triggerParams || {};
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
   * Poll a single workflow for new emails
   */
  private async pollWorkflow(workflow: any): Promise<void> {
    const workflowId = workflow.id;

    // Get Gmail trigger node from workflow
    const gmailTrigger = this.findGmailTrigger(workflow);
    if (!gmailTrigger) {
      this.logger.warn(`Workflow ${workflowId} has no Gmail trigger, skipping`);
      return;
    }

    // Fetch credential from database
    const credentialId = gmailTrigger.data?.credentialId;
    if (!credentialId) {
      this.logger.warn(`Workflow ${workflowId} has no Gmail credential configured, skipping`);
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

    // Support both snake_case and camelCase
    let accessToken = credentials.access_token || credentials.accessToken;
    const refreshToken = credentials.refresh_token || credentials.refreshToken;
    const expiresAt = credentials.expires_at || credentials.expiresAt;

    if (!accessToken) {
      this.logger.warn(
        `Workflow ${workflowId} credentials missing accessToken. ` +
        `Available keys: ${Object.keys(credentials).join(', ')}`
      );
      return;
    }

    // Check if token is expired and refresh if needed
    if (expiresAt && refreshToken) {
      const expirationTime = new Date(expiresAt).getTime();
      const currentTime = Date.now();
      const fiveMinutesInMs = 5 * 60 * 1000;

      // Refresh if expired or expiring soon (within 5 minutes)
      if (currentTime >= expirationTime - fiveMinutesInMs) {
        this.logger.log(`Access token expired or expiring soon for workflow ${workflowId}, refreshing...`);

        try {
          const newTokens = await this.refreshAccessToken(credentialId, refreshToken, credentials);
          accessToken = newTokens.accessToken;
          this.logger.log(`Successfully refreshed access token for workflow ${workflowId}`);
        } catch (error) {
          this.logger.error(`Failed to refresh access token for workflow ${workflowId}:`, error);
          return; // Skip this poll if token refresh fails
        }
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
          `First poll for workflow "${workflow.name}" - will mark existing emails as seen without triggering`
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

    // Build Gmail API query
    const query = this.buildGmailQuery(gmailTrigger.data, startDate);

    try {
      // Fetch messages from Gmail
      const messages = await this.fetchGmailMessages(accessToken, query);

      if (messages.length === 0) {
        pollState.lastTimeChecked = now;
        return;
      }

      this.logger.log(`Found ${messages.length} email(s) for workflow "${workflow.name}"`);

      // Fetch full message details
      const fullMessages = await this.fetchFullMessages(
        accessToken,
        messages,
        gmailTrigger.data
      );

      // Filter out duplicates
      const newMessages = this.filterDuplicates(
        fullMessages,
        new Set(pollState.possibleDuplicates)
      );

      if (newMessages.length === 0) {
        pollState.lastTimeChecked = now;
        return;
      }

      // IMPORTANT: On first poll, mark all existing emails as seen WITHOUT executing the workflow
      // This prevents the workflow from triggering for all historical emails when first activated
      if (isFirstPoll) {
        this.logger.log(
          `First poll: Marking ${newMessages.length} existing email(s) as seen without triggering workflow`
        );

        // Mark all current emails as duplicates without executing workflow
        const messageIds = newMessages.map(m => m.id);
        const lastEmailDate = this.getLatestEmailDate(newMessages);

        pollState.lastTimeChecked = lastEmailDate || now;
        pollState.possibleDuplicates = messageIds;

        // Persist to database
        await this.savePollStateToDatabase(workflowId, pollState);

        return; // Skip workflow execution on first poll
      }

      // Execute workflow for each new email (only on subsequent polls)
      this.logger.log(`Triggering workflow for ${newMessages.length} new email(s)`);

      for (const message of newMessages) {
        try {
          await this.executeWorkflowForEmail(workflowId, message);
        } catch (error) {
          this.logger.error(
            `Failed to execute workflow for email ${message.id}:`,
            error
          );
        }
      }

      // Update poll state
      const lastEmailDate = this.getLatestEmailDate(newMessages);
      const newPossibleDuplicates = newMessages.map(m => m.id);

      pollState.lastTimeChecked = lastEmailDate || now;

      // IMPORTANT: Append to possibleDuplicates instead of replacing
      // This prevents false triggers when Gmail's "after:" date filter returns old emails
      // Keep only the last 1000 message IDs to prevent memory issues
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
          `Gmail credentials expired for workflow ${workflowId}. ` +
          `User needs to re-authorize.`
        );
      } else {
        throw error;
      }
    }
  }

  /**
   * Get all active workflows with Gmail triggers
   */
  private async getActiveGmailWorkflows(): Promise<any[]> {
    const query = `
      SELECT id, name, status, canvas
      FROM workflows
      WHERE status = 'active'
      AND canvas IS NOT NULL
    `;

    const result = await this.platformService.query(query);

    // Filter workflows that have Gmail trigger nodes
    const gmailWorkflows = result.rows.filter((workflow) => {
      const trigger = this.findGmailTrigger(workflow);
      return trigger !== null;
    });

    return gmailWorkflows;
  }

  /**
   * Find Gmail trigger node in workflow
   */
  private findGmailTrigger(workflow: any): any | null {
    const canvas = workflow.canvas;

    if (!canvas || !canvas.nodes || canvas.nodes.length === 0) {
      return null;
    }

    const trigger = canvas.nodes.find(
      (node: any) =>
        node.type === 'GMAIL_TRIGGER' ||
        (node.type === 'CONNECTOR_TRIGGER' && node.data?.connectorType === 'gmail')
    );

    return trigger;
  }

  /**
   * Build Gmail search query based on trigger filters
   */
  private buildGmailQuery(triggerData: any, startDate: number): any {
    const query: any = {
      maxResults: 50, // n8n doesn't limit this, but we'll be conservative
    };

    // Trigger parameters are stored in triggerParams for CONNECTOR_TRIGGER nodes
    const params = triggerData.triggerParams || triggerData.filters || {};

    // Time filter - only emails received after last check
    const searchParts: string[] = [];

    // Convert Unix timestamp to Gmail date format (YYYY/MM/DD)
    const date = new Date(startDate * 1000);
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const formattedDate = `${year}/${month}/${day}`;

    searchParts.push(`after:${formattedDate}`);

    // Read status filter
    if (params.readStatus === 'unread') {
      searchParts.push('is:unread');
    } else if (params.readStatus === 'read') {
      searchParts.push('is:read');
    }

    // Sender filter
    if (params.sender) {
      searchParts.push(`from:${params.sender}`);
    }

    // Custom search query
    if (params.searchQuery) {
      searchParts.push(params.searchQuery);
    }

    // Label filters
    if (params.labelIds && params.labelIds.length > 0) {
      query.labelIds = params.labelIds;
    }

    // Include spam/trash
    query.includeSpamTrash = params.includeSpamTrash || false;

    // Combine search parts
    if (searchParts.length > 0) {
      query.q = searchParts.join(' ');
    }

    return query;
  }

  /**
   * Fetch messages from Gmail API
   */
  private async fetchGmailMessages(
    accessToken: string,
    query: any
  ): Promise<Array<{ id: string; threadId: string }>> {
    try {
      const response = await axios.get(`${this.gmailApiUrl}/users/me/messages`, {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
        params: query,
      });

      return response.data.messages || [];
    } catch (error: any) {
      if (error.response?.status === 404 || error.response?.data?.error?.code === 404) {
        // No messages found
        return [];
      }
      throw error;
    }
  }

  /**
   * Fetch full message details for each message
   */
  private async fetchFullMessages(
    accessToken: string,
    messages: Array<{ id: string; threadId: string }>,
    triggerData: any
  ): Promise<any[]> {
    const fullMessages: any[] = [];
    // Trigger parameters are stored in triggerParams for CONNECTOR_TRIGGER nodes
    const params = triggerData.triggerParams || triggerData.filters || {};
    const format = params.simple !== false ? 'metadata' : 'full';
    const metadataHeaders = 'From,To,Cc,Bcc,Subject,Date';

    for (const message of messages) {
      try {
        const response = await axios.get(
          `${this.gmailApiUrl}/users/me/messages/${message.id}`,
          {
            headers: {
              Authorization: `Bearer ${accessToken}`,
            },
            params: {
              format,
              metadataHeaders,
            },
          }
        );

        const fullMessage = response.data;

        // Trigger parameters are stored in triggerParams for CONNECTOR_TRIGGER nodes
        const params = triggerData.triggerParams || triggerData.filters || {};

        // Filter out drafts if not included
        const includeDrafts = params.includeDrafts || false;
        if (!includeDrafts && fullMessage.labelIds?.includes('DRAFT')) {
          continue;
        }

        // Filter out sent emails (unless they're also in INBOX)
        if (
          fullMessage.labelIds?.includes('SENT') &&
          !fullMessage.labelIds?.includes('INBOX')
        ) {
          continue;
        }

        // Parse message to extract headers
        const parsed = this.parseMessage(fullMessage);
        fullMessages.push(parsed);
      } catch (error) {
        this.logger.error(`Failed to fetch message ${message.id}:`, error);
      }
    }

    return fullMessages;
  }

  /**
   * Parse Gmail message to extract useful data
   */
  private parseMessage(message: any): any {
    const headers: any = {};

    if (message.payload?.headers) {
      for (const header of message.payload.headers) {
        const key = header.name.toLowerCase();
        headers[key] = header.value;
      }
    }

    return {
      id: message.id,
      threadId: message.threadId,
      labelIds: message.labelIds || [],
      snippet: message.snippet || '',
      internalDate: message.internalDate,
      from: headers.from || '',
      to: headers.to || '',
      cc: headers.cc || '',
      bcc: headers.bcc || '',
      subject: headers.subject || '',
      date: headers.date || '',
      headers,
      payload: message.payload,
    };
  }

  /**
   * Filter out duplicate emails
   */
  private filterDuplicates(
    messages: any[],
    duplicates: Set<string>
  ): any[] {
    return messages.filter((message) => !duplicates.has(message.id));
  }

  /**
   * Get the latest email date from a list of messages
   */
  private getLatestEmailDate(messages: any[]): number {
    let latest = 0;

    for (const message of messages) {
      let date = 0;

      if (message.internalDate) {
        date = Math.floor(parseInt(message.internalDate) / 1000);
      } else if (message.date) {
        date = Math.floor(new Date(message.date).getTime() / 1000);
      }

      if (date > latest) {
        latest = date;
      }
    }

    return latest;
  }

  /**
   * Execute workflow for a specific email
   */
  private async executeWorkflowForEmail(
    workflowId: string,
    email: any
  ): Promise<void> {
    this.logger.log(
      `Executing workflow ${workflowId} for email: ${email.subject} from ${email.from}`
    );

    try {
      // Execute the workflow with email data as input
      const result = await this.workflowService.executeWorkflow({
        workflow_id: workflowId,
        input_data: {
          gmailMessage: email,
          triggeredAt: new Date().toISOString(),
          trigger: 'gmail_polling',
        },
      });

      this.logger.log(
        `Successfully executed workflow ${workflowId} for email ${email.id}. ` +
        `Execution ID: ${result.id}`
      );
    } catch (error) {
      this.logger.error(
        `Failed to execute workflow ${workflowId} for email ${email.id}:`,
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
        delete currentMetadata.gmailPollState;

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
   * Used by GmailTriggerService to check status
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
      const pollState = metadata.gmailPollState;

      if (!pollState || !pollState.lastTimeChecked) {
        return null;
      }

      this.logger.debug(`Loaded Gmail poll state for workflow ${workflowId} from database`);

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
        gmailPollState: {
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

      this.logger.debug(`Saved Gmail poll state for workflow ${workflowId} to database`);
    } catch (error) {
      this.logger.error(`Failed to save poll state to database for workflow ${workflowId}:`, error);
      // Don't throw - failing to save poll state shouldn't break the workflow
    }
  }

  /**
   * Refresh expired Gmail access token using refresh token
   */
  private async refreshAccessToken(
    credentialId: string,
    refreshToken: string,
    currentCredentials: any
  ): Promise<{ accessToken: string; expiresAt: string }> {
    const clientId = currentCredentials.clientId || currentCredentials.client_id;
    const clientSecret = currentCredentials.clientSecret || currentCredentials.client_secret;

    if (!clientId || !clientSecret) {
      throw new Error('Missing OAuth client credentials for token refresh');
    }

    try {
      // Request new access token from Google
      const response = await axios.post(
        'https://oauth2.googleapis.com/token',
        {
          client_id: clientId,
          client_secret: clientSecret,
          refresh_token: refreshToken,
          grant_type: 'refresh_token',
        },
        {
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
          },
        }
      );

      const newAccessToken = response.data.access_token;
      const expiresIn = response.data.expires_in; // seconds
      const newExpiresAt = new Date(Date.now() + expiresIn * 1000).toISOString();

      // Update credentials in database
      const updatedCredentials = {
        ...currentCredentials,
        accessToken: newAccessToken,
        access_token: newAccessToken,
        expiresAt: newExpiresAt,
        expires_at: newExpiresAt,
      };

      // Encrypt and save updated credentials to database
      const encryptedCredentials = this.connectorsService['encryptCredentials'](updatedCredentials);

      await this.platformService.query(
        `UPDATE connector_configs SET credentials = $1, updated_at = NOW() WHERE id = $2`,
        [encryptedCredentials, credentialId]
      );

      this.logger.log(`Refreshed and saved Gmail access token for credential ${credentialId}`);

      return {
        accessToken: newAccessToken,
        expiresAt: newExpiresAt,
      };
    } catch (error) {
      this.logger.error(`Failed to refresh Gmail access token:`, error.response?.data || error.message);
      throw new Error('Token refresh failed - user needs to re-authorize');
    }
  }
}

// Type definitions
interface WorkflowPollState {
  lastTimeChecked: number; // Unix timestamp in seconds
  possibleDuplicates: string[]; // Array of message IDs
}
