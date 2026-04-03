/**
 * Klaviyo Webhook Controller
 *
 * Handles incoming webhook events from Klaviyo (profile events, list changes, etc.)
 */
import {
  Controller,
  Post,
  Body,
  Param,
  Headers,
  Logger,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { KlaviyoTriggerService } from './klaviyo-trigger.service';

interface KlaviyoWebhookEvent {
  type: string;
  data: {
    id: string;
    type: string;
    attributes: Record<string, any>;
    relationships?: Record<string, any>;
  };
  included?: Array<{
    id: string;
    type: string;
    attributes: Record<string, any>;
  }>;
}

interface ProcessedEvent {
  eventType: string;
  workflowId: string;
  data: any;
  timestamp: Date;
}

@Controller('webhooks/klaviyo')
export class KlaviyoWebhookController {
  private readonly logger = new Logger(KlaviyoWebhookController.name);
  private readonly processedEvents: Map<string, number> = new Map();
  private readonly EVENT_CACHE_TTL = 5 * 60 * 1000; // 5 minutes

  constructor(private readonly triggerService: KlaviyoTriggerService) {}

  /**
   * Handle incoming Klaviyo webhook events
   */
  @Post(':workflowId')
  async handleWebhook(
    @Param('workflowId') workflowId: string,
    @Body() payload: KlaviyoWebhookEvent,
    @Headers('x-klaviyo-signature') signature: string,
    @Headers('x-klaviyo-timestamp') timestamp: string,
  ): Promise<{ received: boolean; processed: boolean }> {
    this.logger.log(`Received Klaviyo webhook for workflow: ${workflowId}`);

    try {
      // Verify trigger is active for this workflow
      const status = await this.triggerService.getStatus(workflowId);
      if (!status.active) {
        this.logger.warn(`No active trigger for workflow: ${workflowId}`);
        return { received: true, processed: false };
      }

      // Check for duplicate events
      const eventId = `${workflowId}:${payload.type}:${payload.data?.id}`;
      if (this.isDuplicateEvent(eventId)) {
        this.logger.debug(`Skipping duplicate event: ${eventId}`);
        return { received: true, processed: false };
      }

      this.markEventProcessed(eventId);

      // Process the event based on type
      const processedEvent = await this.processEvent(workflowId, payload);

      // Clean up old events from cache
      this.cleanupEventCache();

      return { received: true, processed: !!processedEvent };
    } catch (error) {
      this.logger.error(`Error processing Klaviyo webhook: ${error.message}`);
      throw new HttpException('Webhook processing failed', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  /**
   * Process a Klaviyo webhook event
   */
  private async processEvent(
    workflowId: string,
    payload: KlaviyoWebhookEvent,
  ): Promise<ProcessedEvent | null> {
    const eventType = this.mapEventType(payload.type);

    if (!eventType) {
      this.logger.warn(`Unknown Klaviyo event type: ${payload.type}`);
      return null;
    }

    const eventData: ProcessedEvent = {
      eventType,
      workflowId,
      data: this.extractEventData(payload),
      timestamp: new Date(),
    };

    this.logger.log(`Processed Klaviyo event for workflow ${workflowId}: ${eventType}`);

    // TODO: Trigger workflow execution with eventData
    return eventData;
  }

  /**
   * Map Klaviyo webhook event types to our trigger event types
   */
  private mapEventType(klaviyoType: string): string | null {
    const eventTypeMap: Record<string, string> = {
      'profile.created': 'profile_created',
      'profile.updated': 'profile_updated',
      'event.tracked': 'event_tracked',
      'event.created': 'event_tracked',
      'list.member.added': 'list_member_added',
      'list.member.removed': 'list_member_removed',
      'campaign.sent': 'campaign_sent',
      'flow.triggered': 'flow_triggered',
      'flow.message.sent': 'flow_triggered',
    };

    return eventTypeMap[klaviyoType] || null;
  }

  /**
   * Extract relevant data from the Klaviyo webhook payload
   */
  private extractEventData(payload: KlaviyoWebhookEvent): any {
    const data = payload.data;

    // Base event data
    const eventData: any = {
      id: data.id,
      type: data.type,
    };

    // Extract profile information
    if (data.type === 'profile' || data.relationships?.profile) {
      eventData.profileId = data.id || data.relationships?.profile?.data?.id;
      eventData.email = data.attributes?.email;
      eventData.firstName = data.attributes?.first_name;
      eventData.lastName = data.attributes?.last_name;
      eventData.phoneNumber = data.attributes?.phone_number;
    }

    // Extract event information
    if (data.type === 'event') {
      eventData.eventName = data.attributes?.metric_name;
      eventData.properties = data.attributes?.event_properties;
      eventData.value = data.attributes?.value;
      eventData.datetime = data.attributes?.datetime;
    }

    // Extract list information
    if (data.relationships?.list) {
      eventData.listId = data.relationships.list.data?.id;
    }

    // Extract flow information
    if (data.relationships?.flow) {
      eventData.flowId = data.relationships.flow.data?.id;
    }

    // Extract campaign information
    if (data.relationships?.campaign) {
      eventData.campaignId = data.relationships.campaign.data?.id;
    }

    // Include any additional attributes
    eventData.attributes = data.attributes;

    // Include any included resources
    if (payload.included?.length) {
      eventData.included = payload.included;
    }

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
