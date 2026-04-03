import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';

/**
 * Gmail Webhook Service
 * Manages Gmail push notification subscriptions via Gmail API watch()
 *
 * Features:
 * - Register watch on Gmail mailbox
 * - Renew watch before expiration (watches expire after 7 days max)
 * - Stop watch when workflow is deactivated
 * - Handle watch errors and retries
 */
@Injectable()
export class GmailWebhookService {
  private readonly logger = new Logger(GmailWebhookService.name);
  private readonly gmailApiUrl = 'https://gmail.googleapis.com/gmail/v1';

  // Store active watches: workflowId -> watch details
  private activeWatches = new Map<string, GmailWatch>();

  // Watch renewal interval (renew every 6 days, as Gmail watches expire after 7 days)
  private readonly watchRenewalInterval = 6 * 24 * 60 * 60 * 1000; // 6 days in ms

  constructor(private readonly configService: ConfigService) {
    // Start watch renewal background task
    this.startWatchRenewalTask();
  }

  /**
   * Register a Gmail push notification watch for a workflow
   */
  async registerWatch(
    workflowId: string,
    credentials: GmailCredentials,
    options: GmailWatchOptions = {}
  ): Promise<GmailWatchResponse> {
    try {
      this.logger.log(`Registering Gmail watch for workflow: ${workflowId}`);

      // Check if watch already exists
      const existingWatch = this.activeWatches.get(workflowId);
      if (existingWatch && existingWatch.expiresAt > Date.now()) {
        this.logger.log(`Watch already exists for workflow ${workflowId}, skipping`);
        return {
          success: true,
          historyId: existingWatch.historyId,
          expiration: existingWatch.expiresAt,
          message: 'Watch already exists'
        };
      }

      // Get Pub/Sub topic name from config
      const topicName = this.getPubSubTopicName(workflowId);

      // Prepare watch request
      const watchRequest = {
        labelIds: options.labelIds || ['INBOX'],
        labelFilterAction: options.labelFilterAction || 'include',
        topicName: topicName
      };

      // Call Gmail API to register watch
      const response = await axios.post(
        `${this.gmailApiUrl}/users/me/watch`,
        watchRequest,
        {
          headers: {
            'Authorization': `Bearer ${credentials.accessToken}`,
            'Content-Type': 'application/json'
          }
        }
      );

      const watchData = response.data;

      // Store watch details
      const watch: GmailWatch = {
        workflowId,
        historyId: watchData.historyId,
        expiresAt: parseInt(watchData.expiration),
        topicName,
        credentials,
        options,
        createdAt: Date.now()
      };

      this.activeWatches.set(workflowId, watch);

      this.logger.log(
        `✓ Gmail watch registered successfully for workflow ${workflowId}. ` +
        `HistoryId: ${watchData.historyId}, Expires: ${new Date(parseInt(watchData.expiration))}`
      );

      return {
        success: true,
        historyId: watchData.historyId,
        expiration: parseInt(watchData.expiration),
        message: 'Watch registered successfully'
      };

    } catch (error: any) {
      this.logger.error(`Failed to register Gmail watch for workflow ${workflowId}:`, error.response?.data || error.message);

      return {
        success: false,
        error: error.response?.data?.error?.message || error.message,
        message: 'Failed to register watch'
      };
    }
  }

  /**
   * Renew an existing watch
   */
  async renewWatch(workflowId: string): Promise<GmailWatchResponse> {
    const existingWatch = this.activeWatches.get(workflowId);

    if (!existingWatch) {
      this.logger.warn(`No watch found for workflow ${workflowId}, cannot renew`);
      return {
        success: false,
        message: 'No watch found to renew'
      };
    }

    this.logger.log(`Renewing Gmail watch for workflow: ${workflowId}`);

    // Re-register the watch (Gmail doesn't have a separate renew API)
    return this.registerWatch(
      workflowId,
      existingWatch.credentials,
      existingWatch.options
    );
  }

  /**
   * Stop a watch (unsubscribe from notifications)
   */
  async stopWatch(workflowId: string): Promise<void> {
    try {
      const watch = this.activeWatches.get(workflowId);

      if (!watch) {
        this.logger.warn(`No active watch found for workflow ${workflowId}`);
        return;
      }

      this.logger.log(`Stopping Gmail watch for workflow: ${workflowId}`);

      // Call Gmail API to stop watch
      await axios.post(
        `${this.gmailApiUrl}/users/me/stop`,
        {},
        {
          headers: {
            'Authorization': `Bearer ${watch.credentials.accessToken}`,
            'Content-Type': 'application/json'
          }
        }
      );

      // Remove from active watches
      this.activeWatches.delete(workflowId);

      this.logger.log(`✓ Gmail watch stopped for workflow ${workflowId}`);

    } catch (error: any) {
      this.logger.error(`Failed to stop Gmail watch for workflow ${workflowId}:`, error.response?.data || error.message);

      // Remove from active watches anyway
      this.activeWatches.delete(workflowId);
    }
  }

  /**
   * Get watch status for a workflow
   */
  getWatchStatus(workflowId: string): GmailWatch | null {
    return this.activeWatches.get(workflowId) || null;
  }

  /**
   * List all active watches
   */
  listActiveWatches(): Map<string, GmailWatch> {
    return new Map(this.activeWatches);
  }

  /**
   * Fetch Gmail history changes since a specific historyId
   * This is used to get the actual message details when a notification is received
   */
  async fetchHistory(
    credentials: GmailCredentials,
    startHistoryId: string,
    options: {
      historyTypes?: string[];
      labelId?: string;
      maxResults?: number;
    } = {}
  ): Promise<any> {
    try {
      const params: any = {
        startHistoryId,
        historyTypes: options.historyTypes || ['messageAdded', 'messageDeleted'],
        maxResults: options.maxResults || 100
      };

      if (options.labelId) {
        params.labelId = options.labelId;
      }

      const response = await axios.get(
        `${this.gmailApiUrl}/users/me/history`,
        {
          headers: {
            'Authorization': `Bearer ${credentials.accessToken}`
          },
          params
        }
      );

      return response.data;

    } catch (error: any) {
      this.logger.error('Failed to fetch Gmail history:', error.response?.data || error.message);
      throw error;
    }
  }

  /**
   * Get Pub/Sub topic name for a workflow
   * Format: projects/{project-id}/topics/gmail-notifications-{workflowId}
   */
  private getPubSubTopicName(workflowId: string): string {
    const projectId = this.configService.get<string>('GOOGLE_CLOUD_PROJECT_ID');

    if (!projectId) {
      this.logger.warn('GOOGLE_CLOUD_PROJECT_ID not configured, using default');
      return `projects/fluxturn/topics/gmail-notifications-${workflowId}`;
    }

    return `projects/${projectId}/topics/gmail-notifications`;
  }

  /**
   * Background task to renew watches before they expire
   */
  private startWatchRenewalTask(): void {
    // Check for watches to renew every hour
    setInterval(async () => {
      this.logger.log('Running watch renewal task...');

      const now = Date.now();
      const renewalThreshold = now + this.watchRenewalInterval;

      for (const [workflowId, watch] of this.activeWatches.entries()) {
        // Renew if expiring within 6 days
        if (watch.expiresAt < renewalThreshold) {
          this.logger.log(
            `Watch for workflow ${workflowId} expires soon ` +
            `(${new Date(watch.expiresAt)}), renewing...`
          );

          await this.renewWatch(workflowId);
        }
      }

      this.logger.log(`Watch renewal task completed. Active watches: ${this.activeWatches.size}`);
    }, 60 * 60 * 1000); // Run every hour
  }
}

// Type definitions
export interface GmailCredentials {
  accessToken: string;
  refreshToken?: string;
  expiresAt?: number;
}

export interface GmailWatchOptions {
  labelIds?: string[];
  labelFilterAction?: 'include' | 'exclude';
  historyTypes?: string[];
}

export interface GmailWatchResponse {
  success: boolean;
  historyId?: string;
  expiration?: number;
  error?: string;
  message: string;
}

export interface GmailWatch {
  workflowId: string;
  historyId: string;
  expiresAt: number;
  topicName: string;
  credentials: GmailCredentials;
  options: GmailWatchOptions;
  createdAt: number;
}
