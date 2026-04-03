import { Injectable, Logger, Inject, forwardRef } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PlatformService } from '../../../../database/platform.service';
import { WorkflowService } from '../../../workflow/workflow.service';
import { ConnectorsService } from '../../connectors.service';
import { TwitterApi } from 'twitter-api-v2';
import axios from 'axios';

/**
 * Twitter Polling Service
 * Implements polling for Twitter triggers (mentions and tweets)
 *
 * How it works:
 * 1. Every minute, check all active workflows with Twitter triggers
 * 2. For each workflow, fetch new tweets/mentions since last check
 * 3. Filter based on trigger type (new_tweet vs new_mention)
 * 4. Deduplicate to prevent double-processing
 * 5. Execute workflow for each new tweet/mention ONCE
 */
@Injectable()
export class TwitterPollingService {
  private readonly logger = new Logger(TwitterPollingService.name);

  // Store last check time per workflow
  private workflowPollState = new Map<string, WorkflowPollState>();

  // Track rate limit state per credential/workflow
  private rateLimitState = new Map<string, RateLimitState>();

  constructor(
    private readonly platformService: PlatformService,
    @Inject(forwardRef(() => WorkflowService))
    private readonly workflowService: WorkflowService,
    @Inject(forwardRef(() => ConnectorsService))
    private readonly connectorsService: ConnectorsService
  ) {}

  /**
   * Main polling cron job - runs every minute
   * Each workflow can have its own polling interval (1, 2, 5, 10, 15, 30 minutes)
   */
  @Cron(CronExpression.EVERY_MINUTE)
  async pollTwitterTriggers() {
    try {
      // Get all active workflows with Twitter triggers
      const workflows = await this.getActiveTwitterWorkflows();

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
      this.logger.error('Twitter polling cycle failed:', error);
    }
  }

  /**
   * Check if a workflow should be polled based on its polling interval
   */
  private shouldPollWorkflow(workflow: any): boolean {
    const workflowId = workflow.id;
    const twitterTrigger = this.findTwitterTrigger(workflow);

    if (!twitterTrigger) {
      return false;
    }

    // Get polling interval from trigger params (in minutes)
    const params = twitterTrigger.data?.triggerParams || {};
    const pollingIntervalMinutes = parseInt(params.pollingInterval) || 15;

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
   * Poll a single workflow for new tweets/mentions
   */
  private async pollWorkflow(workflow: any): Promise<void> {
    const workflowId = workflow.id;

    // Get Twitter trigger node from workflow
    const twitterTrigger = this.findTwitterTrigger(workflow);
    if (!twitterTrigger) {
      this.logger.warn(`Workflow ${workflowId} has no Twitter trigger, skipping`);
      return;
    }

    // Fetch credential from database
    const credentialId = twitterTrigger.data?.credentialId;
    if (!credentialId) {
      this.logger.warn(`Workflow ${workflowId} has no Twitter credential configured, skipping`);
      return;
    }

    // Check if we're rate limited for this credential
    if (this.isRateLimited(credentialId)) {
      const rateLimitState = this.rateLimitState.get(credentialId);
      const resetTime = new Date(rateLimitState!.resetAt * 1000);
      this.logger.warn(
        `Workflow ${workflowId} is rate limited. Will retry after ${resetTime.toLocaleTimeString()}`
      );
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
    if (this.isTokenExpired(credentials)) {
      this.logger.log(`Twitter token expired for workflow ${workflowId}, refreshing...`);
      try {
        credentials = await this.refreshTwitterToken(credentialId, credentials);
        this.logger.log(`Successfully refreshed Twitter token for workflow ${workflowId}`);
      } catch (error: any) {
        this.logger.error(
          `Failed to refresh Twitter token for workflow ${workflowId}: ${error.message}`
        );
        this.logger.error('User needs to re-authorize the Twitter account');
        return;
      }
    }

    // Support both snake_case and camelCase
    const accessToken = credentials.accessToken || credentials.access_token;

    if (!accessToken) {
      this.logger.warn(
        `Workflow ${workflowId} credentials missing accessToken. ` +
        `Available keys: ${Object.keys(credentials).join(', ')}`
      );
      return;
    }

    // Initialize Twitter client
    const twitterClient = new TwitterApi(accessToken);

    // Get or initialize poll state
    let pollState = this.workflowPollState.get(workflowId);
    const now = Math.floor(Date.now() / 1000);

    if (!pollState) {
      // Initialize poll state - start from 1 hour ago to avoid going back 7 days on first run
      const oneHourAgo = now - (60 * 60);
      pollState = {
        lastTimeChecked: oneHourAgo,
        possibleDuplicates: [],
      };
      this.workflowPollState.set(workflowId, pollState);
      this.logger.log(`Initialized poll state for workflow ${workflowId}, starting from 1 hour ago`);
    }

    const startDate = pollState.lastTimeChecked;

    // Get trigger type from triggerParams
    const params = twitterTrigger.data?.triggerParams || {};
    const triggerEvent = params.event || 'new_mention'; // Default to new_mention

    try {
      let newItems: any[] = [];

      if (triggerEvent === 'new_mention') {
        // Fetch new mentions
        newItems = await this.fetchMentions(twitterClient, startDate);
      } else if (triggerEvent === 'new_tweet') {
        // Fetch new tweets from authenticated user
        newItems = await this.fetchUserTweets(twitterClient, startDate);
      }

      if (newItems.length === 0) {
        pollState.lastTimeChecked = now;
        return;
      }

      this.logger.log(`Found ${newItems.length} new ${triggerEvent}(s) for workflow "${workflow.name}"`);

      // Filter out duplicates
      const filteredItems = this.filterDuplicates(
        newItems,
        new Set(pollState.possibleDuplicates)
      );

      if (filteredItems.length === 0) {
        pollState.lastTimeChecked = now;
        return;
      }

      // Execute workflow for each new item (ONCE per item)
      for (const item of filteredItems) {
        try {
          await this.executeWorkflowForTweet(workflowId, item, triggerEvent);
        } catch (error) {
          this.logger.error(
            `Failed to execute workflow for tweet ${item.id}:`,
            error
          );
        }
      }

      // Update poll state
      const latestDate = this.getLatestTweetDate(filteredItems);
      const newPossibleDuplicates = filteredItems.map(t => t.id);

      pollState.lastTimeChecked = latestDate || now;
      pollState.possibleDuplicates = newPossibleDuplicates;

    } catch (error: any) {
      if (error.code === 401 || error.data?.status === 401) {
        this.logger.error(
          `Twitter credentials expired for workflow ${workflowId}. ` +
          `User needs to re-authorize.`
        );
      } else if (error.code === 429 || error.data?.status === 429 || error.statusCode === 429) {
        // Rate limit exceeded - extract reset time from Twitter's response
        this.handleRateLimit(credentialId, error, triggerEvent);
      } else if (error.code === 400 || error.data?.status === 400) {
        // Bad request - log detailed error info
        this.logger.error(
          `Twitter API returned 400 Bad Request for workflow ${workflowId}:`,
          {
            message: error.message,
            code: error.code,
            data: error.data,
            errors: error.errors,
            triggerEvent: triggerEvent
          }
        );
        throw error;
      } else {
        throw error;
      }
    }
  }

  /**
   * Fetch mentions for authenticated user
   */
  private async fetchMentions(
    client: TwitterApi,
    sinceTimestamp: number
  ): Promise<any[]> {
    try {
      // Get authenticated user
      const me = await client.v2.me();

      // Twitter's recent search API only supports last 7 days
      // Adjust start time if it's older than 7 days
      const now = Math.floor(Date.now() / 1000);
      const sevenDaysAgo = now - (7 * 24 * 60 * 60);

      let adjustedTimestamp = sinceTimestamp;
      if (sinceTimestamp < sevenDaysAgo) {
        this.logger.warn(`Start time is older than 7 days, adjusting to 7 days ago (Twitter API limitation)`);
        adjustedTimestamp = sevenDaysAgo;
      }

      // Convert timestamp to ISO format
      const startTime = new Date(adjustedTimestamp * 1000).toISOString();

      this.logger.log(`Searching for mentions of @${me.data.username} since ${startTime}`);

      // Add timeout to the search - use Promise.race to enforce timeout
      const searchPromise = client.v2.search(`@${me.data.username}`, {
        max_results: 10, // Reduced from 100 to avoid timeouts
        start_time: startTime,
        'tweet.fields': ['created_at', 'author_id', 'text', 'public_metrics', 'conversation_id'],
        'user.fields': ['username', 'name', 'verified'],
        expansions: ['author_id'],
      });

      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error('Twitter search timed out after 30 seconds')), 30000);
      });

      const mentions = await Promise.race([searchPromise, timeoutPromise]) as any;

      this.logger.log(`Search completed, processing results...`);

      const tweets = [];
      for await (const tweet of mentions) {
        // Exclude tweets from the authenticated user (their own tweets)
        if (tweet.author_id !== me.data.id) {
          tweets.push(tweet);
        }
      }

      this.logger.log(`Found ${tweets.length} mentions (excluding own tweets)`);
      return tweets;
    } catch (error: any) {
      this.logger.error('Failed to fetch Twitter mentions:', error.message);
      // Return empty array on error to avoid breaking the polling cycle
      return [];
    }
  }

  /**
   * Fetch tweets from authenticated user's timeline
   */
  private async fetchUserTweets(
    client: TwitterApi,
    sinceTimestamp: number
  ): Promise<any[]> {
    try {
      // Get authenticated user
      const me = await client.v2.me();

      // Twitter's userTimeline endpoint also has time limitations
      // Adjust start time if it's too old
      const now = Math.floor(Date.now() / 1000);
      const thirtyDaysAgo = now - (30 * 24 * 60 * 60);

      let adjustedTimestamp = sinceTimestamp;
      if (sinceTimestamp < thirtyDaysAgo) {
        this.logger.warn(`Start time is older than 30 days, adjusting to 30 days ago`);
        adjustedTimestamp = thirtyDaysAgo;
      }

      // Convert timestamp to ISO format
      const startTime = new Date(adjustedTimestamp * 1000).toISOString();

      this.logger.log(`Fetching tweets for user ${me.data.username} since ${startTime}`);

      // Fetch user's tweets with timeout
      const timelinePromise = client.v2.userTimeline(me.data.id, {
        max_results: 10, // Reduced from 100 to avoid timeouts
        start_time: startTime,
        'tweet.fields': ['created_at', 'author_id', 'text', 'public_metrics', 'conversation_id'],
        exclude: ['retweets', 'replies'], // Only original tweets
      });

      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error('Twitter timeline fetch timed out after 30 seconds')), 30000);
      });

      const timeline = await Promise.race([timelinePromise, timeoutPromise]) as any;

      this.logger.log(`Timeline fetch completed, processing results...`);

      const tweets = [];
      for await (const tweet of timeline) {
        tweets.push(tweet);
      }

      this.logger.log(`Found ${tweets.length} tweets from timeline`);
      return tweets;
    } catch (error: any) {
      this.logger.error('Failed to fetch user tweets:', error.message);
      // Return empty array on error to avoid breaking the polling cycle
      return [];
    }
  }

  /**
   * Get all active workflows with Twitter triggers
   */
  private async getActiveTwitterWorkflows(): Promise<any[]> {
    const query = `
      SELECT id, name, status, canvas
      FROM workflows
      WHERE status = 'active'
      AND canvas IS NOT NULL
    `;

    const result = await this.platformService.query(query);

    // Filter workflows that have Twitter trigger nodes
    const twitterWorkflows = result.rows.filter((workflow) => {
      const trigger = this.findTwitterTrigger(workflow);
      return trigger !== null;
    });

    return twitterWorkflows;
  }

  /**
   * Find Twitter trigger node in workflow
   */
  private findTwitterTrigger(workflow: any): any | null {
    const canvas = workflow.canvas;

    if (!canvas || !canvas.nodes || canvas.nodes.length === 0) {
      return null;
    }

    const trigger = canvas.nodes.find(
      (node: any) =>
        node.type === 'TWITTER_TRIGGER' ||
        (node.type === 'CONNECTOR_TRIGGER' && node.data?.connectorType === 'twitter')
    );

    return trigger;
  }

  /**
   * Filter out duplicate tweets
   */
  private filterDuplicates(
    tweets: any[],
    duplicates: Set<string>
  ): any[] {
    return tweets.filter((tweet) => !duplicates.has(tweet.id));
  }

  /**
   * Get the latest tweet date from a list of tweets
   */
  private getLatestTweetDate(tweets: any[]): number {
    let latest = 0;

    for (const tweet of tweets) {
      let date = 0;

      if (tweet.created_at) {
        date = Math.floor(new Date(tweet.created_at).getTime() / 1000);
      }

      if (date > latest) {
        latest = date;
      }
    }

    return latest;
  }

  /**
   * Execute workflow for a specific tweet (ONCE only)
   */
  private async executeWorkflowForTweet(
    workflowId: string,
    tweet: any,
    triggerEvent: string
  ): Promise<void> {
    this.logger.log(
      `Executing workflow ${workflowId} for ${triggerEvent}: ${tweet.text?.substring(0, 50)}...`
    );

    try {
      // Execute the workflow with tweet data as input
      const result = await this.workflowService.executeWorkflow({
        workflow_id: workflowId,
        input_data: {
          tweet: tweet,
          triggeredAt: new Date().toISOString(),
          trigger: triggerEvent,
          triggerType: 'twitter_polling',
        },
      });

      this.logger.log(
        `Successfully executed workflow ${workflowId} for tweet ${tweet.id}. ` +
        `Execution ID: ${result.id}`
      );
    } catch (error) {
      this.logger.error(
        `Failed to execute workflow ${workflowId} for tweet ${tweet.id}:`,
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
   * Used by TwitterTriggerService to check status
   */
  getWorkflowPollState(workflowId: string): WorkflowPollState | null {
    return this.workflowPollState.get(workflowId) || null;
  }

  /**
   * Check if Twitter OAuth2 token is expired
   */
  private isTokenExpired(credentials: any): boolean {
    const expiresAt = credentials.expiresAt || credentials.expires_at;
    if (!expiresAt) {
      return false; // No expiry info, assume valid
    }

    const expiryTime = new Date(expiresAt).getTime();
    const now = Date.now();

    // Refresh if expired or expiring within 5 minutes
    return expiryTime < now + 5 * 60 * 1000;
  }

  /**
   * Check if a credential is currently rate limited
   */
  private isRateLimited(credentialId: string): boolean {
    const rateLimitState = this.rateLimitState.get(credentialId);
    if (!rateLimitState) {
      return false;
    }

    const now = Math.floor(Date.now() / 1000);
    if (now >= rateLimitState.resetAt) {
      // Rate limit has expired, clear it
      this.rateLimitState.delete(credentialId);
      return false;
    }

    return true;
  }

  /**
   * Handle rate limit error from Twitter API
   */
  private handleRateLimit(credentialId: string, error: any, triggerEvent: string): void {
    // Try to extract rate limit reset time from error
    // Twitter API returns x-rate-limit-reset header with unix timestamp
    let resetAt = Math.floor(Date.now() / 1000) + 900; // Default to 15 minutes from now

    // Check if error has rateLimit info
    if (error.rateLimit?.reset) {
      resetAt = error.rateLimit.reset;
    } else if (error.data?.['x-rate-limit-reset']) {
      resetAt = parseInt(error.data['x-rate-limit-reset']);
    }

    const resetTime = new Date(resetAt * 1000);

    this.rateLimitState.set(credentialId, {
      resetAt: resetAt,
      endpoint: triggerEvent,
    });

    this.logger.error(
      `Twitter API rate limit exceeded for ${triggerEvent}. ` +
      `Polling suspended until ${resetTime.toLocaleString()}. ` +
      `Consider increasing polling interval to reduce API calls.`
    );
  }

  /**
   * Refresh expired Twitter OAuth2 token
   */
  private async refreshTwitterToken(credentialId: string, credentials: any): Promise<any> {
    const refreshToken = credentials.refreshToken || credentials.refresh_token;
    const clientId = credentials.clientId || credentials.client_id;
    const clientSecret = credentials.clientSecret || credentials.client_secret;

    if (!refreshToken) {
      throw new Error('No refresh token available');
    }

    if (!clientId || !clientSecret) {
      throw new Error('Missing client credentials for token refresh');
    }

    this.logger.log('Refreshing Twitter OAuth2 token...');

    // Twitter OAuth2 token refresh endpoint
    const tokenUrl = 'https://api.twitter.com/2/oauth2/token';

    // Create Basic Auth header
    const basicAuth = Buffer.from(`${clientId}:${clientSecret}`).toString('base64');

    try {
      const response = await axios.post(
        tokenUrl,
        new URLSearchParams({
          grant_type: 'refresh_token',
          refresh_token: refreshToken,
        }).toString(),
        {
          headers: {
            'Authorization': `Basic ${basicAuth}`,
            'Content-Type': 'application/x-www-form-urlencoded',
          },
        }
      );

      const { access_token, refresh_token, expires_in } = response.data;

      // Calculate new expiry time
      const expiresAt = new Date(Date.now() + expires_in * 1000).toISOString();

      // Update credentials in database
      const newCredentials = {
        ...credentials,
        accessToken: access_token,
        access_token: access_token,
        refreshToken: refresh_token || refreshToken, // Some responses don't include new refresh token
        refresh_token: refresh_token || refreshToken,
        expiresAt: expiresAt,
        expires_at: expiresAt,
      };

      // Update in database via ConnectorsService
      await this.platformService.query(
        `UPDATE connectors SET credentials = $1, updated_at = NOW() WHERE id = $2`,
        [JSON.stringify(newCredentials), credentialId]
      );

      this.logger.log('Twitter token refreshed and saved to database');

      return newCredentials;
    } catch (error: any) {
      this.logger.error('Twitter token refresh failed:', error.response?.data || error.message);
      throw new Error(`Token refresh failed: ${error.response?.data?.error || error.message}`);
    }
  }
}

// Type definitions
interface WorkflowPollState {
  lastTimeChecked: number; // Unix timestamp in seconds
  possibleDuplicates: string[]; // Array of tweet IDs
}

interface RateLimitState {
  resetAt: number; // Unix timestamp when rate limit resets
  endpoint: string; // Which endpoint is rate limited (new_mention or new_tweet)
}
