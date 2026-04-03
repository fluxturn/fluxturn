/**
 * Facebook Ads Webhook Controller
 *
 * Handles incoming webhook events from Facebook Ads (Lead Ads, Campaign notifications, etc.)
 */
import { Controller, Post, Get, Body, Param, Query, Headers, Logger, HttpException, HttpStatus } from '@nestjs/common';
import { FacebookAdsTriggerService } from './facebook-ads-trigger.service';

interface FacebookWebhookEvent {
  object: string;
  entry: Array<{
    id: string;
    time: number;
    changes?: Array<{
      field: string;
      value: any;
    }>;
    messaging?: Array<any>;
    leadgen_id?: string;
    page_id?: string;
    form_id?: string;
    created_time?: number;
    field_data?: Array<{
      name: string;
      values: string[];
    }>;
  }>;
}

interface ProcessedEvent {
  eventType: string;
  workflowId: string;
  data: any;
  timestamp: Date;
}

@Controller('webhooks/facebook-ads')
export class FacebookAdsWebhookController {
  private readonly logger = new Logger(FacebookAdsWebhookController.name);
  private readonly processedEvents: Map<string, number> = new Map();
  private readonly EVENT_CACHE_TTL = 5 * 60 * 1000; // 5 minutes

  constructor(private readonly triggerService: FacebookAdsTriggerService) {}

  /**
   * Webhook verification endpoint (Facebook requires this for setup)
   */
  @Get(':workflowId')
  verifyWebhook(
    @Param('workflowId') workflowId: string,
    @Query('hub.mode') mode: string,
    @Query('hub.verify_token') verifyToken: string,
    @Query('hub.challenge') challenge: string,
  ): string {
    this.logger.log(`Webhook verification request for workflow: ${workflowId}`);

    // In production, verify the token against stored workflow configuration
    if (mode === 'subscribe') {
      this.logger.log(`Webhook verified for workflow: ${workflowId}`);
      return challenge;
    }

    throw new HttpException('Verification failed', HttpStatus.FORBIDDEN);
  }

  /**
   * Handle incoming Facebook Ads webhook events
   */
  @Post(':workflowId')
  async handleWebhook(
    @Param('workflowId') workflowId: string,
    @Body() payload: FacebookWebhookEvent,
    @Headers('x-hub-signature-256') signature: string,
  ): Promise<{ received: boolean; processed: number }> {
    this.logger.log(`Received Facebook Ads webhook for workflow: ${workflowId}`);

    try {
      // Verify trigger is active for this workflow
      const status = await this.triggerService.getStatus(workflowId);
      if (!status.active) {
        this.logger.warn(`No active trigger for workflow: ${workflowId}`);
        return { received: true, processed: 0 };
      }

      const processedEvents: ProcessedEvent[] = [];

      // Process each entry in the webhook payload
      for (const entry of payload.entry) {
        // Handle Lead Gen events (Facebook Lead Ads)
        if (entry.leadgen_id) {
          const event = await this.processLeadGenEvent(workflowId, entry);
          if (event) {
            processedEvents.push(event);
          }
        }

        // Handle Change events (Campaign status, delivery issues, etc.)
        if (entry.changes) {
          for (const change of entry.changes) {
            const event = await this.processChangeEvent(workflowId, entry.id, change);
            if (event) {
              processedEvents.push(event);
            }
          }
        }
      }

      // Clean up old events from cache
      this.cleanupEventCache();

      return { received: true, processed: processedEvents.length };
    } catch (error) {
      this.logger.error(`Error processing Facebook Ads webhook: ${error.message}`);
      throw new HttpException('Webhook processing failed', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  /**
   * Process a lead gen event from Facebook Lead Ads
   */
  private async processLeadGenEvent(
    workflowId: string,
    entry: any,
  ): Promise<ProcessedEvent | null> {
    const eventId = `${workflowId}:leadgen:${entry.leadgen_id}`;

    // Check for duplicate events
    if (this.isDuplicateEvent(eventId)) {
      this.logger.debug(`Skipping duplicate lead gen event: ${eventId}`);
      return null;
    }

    this.markEventProcessed(eventId);

    const eventData = {
      eventType: 'new_lead',
      workflowId,
      data: {
        leadgenId: entry.leadgen_id,
        pageId: entry.page_id,
        formId: entry.form_id,
        createdTime: entry.created_time,
        fieldData: entry.field_data,
      },
      timestamp: new Date(),
    };

    this.logger.log(`Processed lead gen event for workflow ${workflowId}: ${entry.leadgen_id}`);

    // TODO: Trigger workflow execution with eventData
    return eventData;
  }

  /**
   * Process a change event (campaign status, delivery issues, etc.)
   */
  private async processChangeEvent(
    workflowId: string,
    entryId: string,
    change: { field: string; value: any },
  ): Promise<ProcessedEvent | null> {
    const eventId = `${workflowId}:${change.field}:${entryId}:${Date.now()}`;

    // Check for duplicate events
    if (this.isDuplicateEvent(eventId)) {
      this.logger.debug(`Skipping duplicate change event: ${eventId}`);
      return null;
    }

    this.markEventProcessed(eventId);

    // Map Facebook field names to our event types
    const eventTypeMap: Record<string, string> = {
      campaign: 'campaign_delivery_issue',
      ad_status: 'ad_disapproved',
      budget: 'budget_spent',
      leadgen: 'new_lead',
    };

    const eventType = eventTypeMap[change.field] || change.field;

    const eventData: ProcessedEvent = {
      eventType,
      workflowId,
      data: {
        field: change.field,
        value: change.value,
        entryId,
      },
      timestamp: new Date(),
    };

    this.logger.log(`Processed change event for workflow ${workflowId}: ${change.field}`);

    // TODO: Trigger workflow execution with eventData
    return eventData;
  }

  /**
   * Check if an event has already been processed (deduplication)
   */
  private isDuplicateEvent(eventId: string): boolean {
    return this.processedEvents.has(eventId);
  }

  /**
   * Mark an event as processed
   */
  private markEventProcessed(eventId: string): void {
    this.processedEvents.set(eventId, Date.now());
  }

  /**
   * Clean up old events from the cache
   */
  private cleanupEventCache(): void {
    const now = Date.now();
    for (const [eventId, timestamp] of this.processedEvents.entries()) {
      if (now - timestamp > this.EVENT_CACHE_TTL) {
        this.processedEvents.delete(eventId);
      }
    }
  }
}
