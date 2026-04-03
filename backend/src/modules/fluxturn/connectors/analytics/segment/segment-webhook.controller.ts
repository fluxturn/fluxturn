/**
 * Segment Webhook Controller
 *
 * Handles incoming webhook events from Segment.
 * Segment can send various event types including track, identify, page,
 * screen, group, and alias events, as well as audience membership changes.
 *
 * Webhook Event Types:
 * - track: User action tracked
 * - identify: User identification
 * - page: Page view
 * - screen: Screen view (mobile)
 * - group: Group membership
 * - alias: User alias
 * - Audience Entered: User entered an audience
 * - Audience Exited: User exited an audience
 */

import {
  Controller,
  Post,
  Body,
  Param,
  HttpCode,
  HttpStatus,
  Logger,
  Inject,
  forwardRef,
  Headers,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { WorkflowService } from '../../../workflow/workflow.service';

// Segment webhook event to trigger ID mapping
const WEBHOOK_EVENT_TO_TRIGGER: Record<string, string> = {
  // Audience events
  'Audience Entered': 'audience_entered',
  'audience_entered': 'audience_entered',
  'segment:audience_entered': 'audience_entered',
  'Audience Exited': 'audience_exited',
  'audience_exited': 'audience_exited',
  'segment:audience_exited': 'audience_exited',
  // Standard Segment events
  'track': 'track_event',
  'identify': 'identify_user',
  'page': 'page_view',
  'screen': 'screen_view',
  'group': 'group_membership',
  'alias': 'user_alias',
};

@ApiTags('webhooks')
@Controller('webhooks/segment')
export class SegmentWebhookController {
  private readonly logger = new Logger(SegmentWebhookController.name);

  // Deduplication cache to prevent duplicate processing
  private readonly processedEvents = new Map<string, number>();
  private readonly EVENT_CACHE_TTL = 60000; // 60 seconds
  private readonly MAX_CACHE_SIZE = 1000;

  constructor(
    @Inject(forwardRef(() => WorkflowService))
    private readonly workflowService: WorkflowService,
  ) {
    // Clean up old events periodically
    setInterval(() => this.cleanupEventCache(), 30000);
  }

  @Post(':workflowId')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Receive Segment webhook events' })
  @ApiResponse({ status: 200, description: 'Webhook processed successfully' })
  @ApiResponse({ status: 400, description: 'Invalid webhook payload' })
  async receiveWebhook(
    @Param('workflowId') workflowId: string,
    @Body() payload: any,
    @Headers() headers: any,
  ) {
    const eventType = payload?.type || payload?.event || 'unknown';
    const eventName = payload?.event || payload?.name || eventType;
    const userId = payload?.userId || payload?.anonymousId || 'unknown';
    const messageId = payload?.messageId || `${Date.now()}`;

    this.logger.log(`Segment webhook received: Type=${eventType}, Event=${eventName}, UserId=${userId}, Workflow=${workflowId}`);

    // Deduplication check
    const eventKey = this.generateEventKey(workflowId, payload, messageId);
    if (this.isEventAlreadyProcessed(eventKey)) {
      this.logger.warn(`Duplicate Segment event detected, skipping: ${eventKey}`);
      return { success: true, message: 'Duplicate event', skipped: true };
    }
    this.markEventAsProcessed(eventKey);

    try {
      // Get the workflow
      const workflow = await this.workflowService.getWorkflow(workflowId);
      if (!workflow) {
        this.logger.warn(`Workflow not found: ${workflowId}`);
        return { success: false, message: 'Workflow not found' };
      }

      // Check if workflow is active
      if (!workflow.is_active) {
        this.logger.log(`Workflow ${workflowId} is not active, skipping webhook`);
        return { success: true, message: 'Workflow not active', skipped: true };
      }

      // Map webhook event to trigger
      const triggerId = WEBHOOK_EVENT_TO_TRIGGER[eventName] || WEBHOOK_EVENT_TO_TRIGGER[eventType] || this.inferTriggerFromPayload(payload);
      if (!triggerId) {
        this.logger.warn(`Unknown Segment webhook type: ${eventType}/${eventName}`);
      }

      // Prepare event data for workflow
      const eventData = {
        segmentEvent: this.prepareEventData(payload),
        triggeredAt: new Date().toISOString(),
        trigger: triggerId || `segment_${eventType.replace(/[:.]/g, '_')}`,
        eventType,
        eventName,
        messageId,
      };

      // Execute the workflow
      const result = await this.workflowService.executeWorkflow({
        workflow_id: workflowId,
        input_data: eventData,
      });

      this.logger.log(`Segment webhook processed successfully. ExecutionId: ${result.id}`);

      return {
        success: true,
        message: 'Webhook processed successfully',
        executionId: result.id,
        triggerId,
      };
    } catch (error) {
      this.logger.error(`Segment webhook processing error: ${error.message}`, error.stack);
      // Return 200 to prevent Segment from retrying indefinitely
      return {
        success: false,
        message: error.message,
      };
    }
  }

  /**
   * Infer trigger type from payload structure
   */
  private inferTriggerFromPayload(payload: any): string | null {
    // Check for audience-related events
    if (payload.event) {
      const event = payload.event.toLowerCase();
      if (event.includes('audience') && event.includes('entered')) {
        return 'audience_entered';
      }
      if (event.includes('audience') && event.includes('exited')) {
        return 'audience_exited';
      }
    }

    // Check by type
    if (payload.type === 'track') return 'track_event';
    if (payload.type === 'identify') return 'identify_user';
    if (payload.type === 'page') return 'page_view';
    if (payload.type === 'screen') return 'screen_view';
    if (payload.type === 'group') return 'group_membership';

    return null;
  }

  /**
   * Generate unique event key for deduplication
   */
  private generateEventKey(workflowId: string, payload: any, messageId: string): string {
    const eventType = payload?.type || 'unknown';
    const userId = payload?.userId || payload?.anonymousId || 'unknown';
    return `${workflowId}:${eventType}:${messageId}:${userId}`;
  }

  private isEventAlreadyProcessed(eventKey: string): boolean {
    const processedAt = this.processedEvents.get(eventKey);
    if (!processedAt) return false;
    return Date.now() - processedAt < this.EVENT_CACHE_TTL;
  }

  private markEventAsProcessed(eventKey: string): void {
    if (this.processedEvents.size >= this.MAX_CACHE_SIZE) {
      this.cleanupEventCache();
    }
    this.processedEvents.set(eventKey, Date.now());
  }

  private cleanupEventCache(): void {
    const now = Date.now();
    let deleted = 0;
    for (const [key, timestamp] of this.processedEvents.entries()) {
      if (now - timestamp > this.EVENT_CACHE_TTL) {
        this.processedEvents.delete(key);
        deleted++;
      }
    }
    if (deleted > 0) {
      this.logger.debug(`Cleaned up ${deleted} expired Segment events from cache`);
    }
  }

  /**
   * Prepare standardized event data from Segment webhook payload
   */
  private prepareEventData(payload: any): any {
    const baseData = {
      type: payload.type,
      event: payload.event,
      messageId: payload.messageId,
      timestamp: payload.timestamp || new Date().toISOString(),
      sentAt: payload.sentAt,
      receivedAt: payload.receivedAt,
      originalTimestamp: payload.originalTimestamp,
      writeKey: payload.writeKey,
      userId: payload.userId,
      anonymousId: payload.anonymousId,
    };

    // Handle track events
    if (payload.type === 'track') {
      return {
        ...baseData,
        event: payload.event,
        properties: payload.properties || {},
        context: this.sanitizeContext(payload.context),
      };
    }

    // Handle identify events
    if (payload.type === 'identify') {
      return {
        ...baseData,
        traits: payload.traits || {},
        context: this.sanitizeContext(payload.context),
      };
    }

    // Handle page events
    if (payload.type === 'page') {
      return {
        ...baseData,
        name: payload.name,
        category: payload.category,
        properties: payload.properties || {},
        context: this.sanitizeContext(payload.context),
      };
    }

    // Handle screen events
    if (payload.type === 'screen') {
      return {
        ...baseData,
        name: payload.name,
        category: payload.category,
        properties: payload.properties || {},
        context: this.sanitizeContext(payload.context),
      };
    }

    // Handle group events
    if (payload.type === 'group') {
      return {
        ...baseData,
        groupId: payload.groupId,
        traits: payload.traits || {},
        context: this.sanitizeContext(payload.context),
      };
    }

    // Handle audience events (from Personas/Engage)
    if (payload.event?.toLowerCase().includes('audience')) {
      return {
        ...baseData,
        audienceId: payload.properties?.audience_key || payload.context?.personas?.computation_id,
        audienceName: payload.properties?.audience_name || payload.event,
        traits: payload.traits || payload.properties || {},
        context: this.sanitizeContext(payload.context),
      };
    }

    // Default: return sanitized payload
    return {
      ...baseData,
      properties: payload.properties,
      traits: payload.traits,
      context: this.sanitizeContext(payload.context),
    };
  }

  /**
   * Sanitize context object to remove sensitive information
   */
  private sanitizeContext(context: any): any {
    if (!context) return {};

    return {
      app: context.app,
      campaign: context.campaign,
      device: context.device,
      ip: context.ip,
      library: context.library,
      locale: context.locale,
      location: context.location,
      network: context.network,
      os: context.os,
      page: context.page,
      referrer: context.referrer,
      screen: context.screen,
      timezone: context.timezone,
      userAgent: context.userAgent,
      personas: context.personas,
    };
  }
}
