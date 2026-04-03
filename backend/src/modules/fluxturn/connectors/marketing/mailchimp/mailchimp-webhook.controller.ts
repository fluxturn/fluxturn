import {
  Controller,
  Post,
  Get,
  Body,
  Param,
  HttpCode,
  HttpStatus,
  NotFoundException,
  Logger,
  Inject,
  forwardRef,
  Headers,
  Query,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiParam } from '@nestjs/swagger';
import { WorkflowService } from '../../../workflow/workflow.service';

/**
 * Mailchimp Webhook Controller
 * Handles Mailchimp webhook events for workflow triggers
 *
 * Mailchimp webhook payload structure:
 * POST format (form-urlencoded, converted to JSON):
 * {
 *   "type": "subscribe|unsubscribe|profile|cleaned|upemail|campaign",
 *   "fired_at": "2024-01-15 10:30:00",
 *   "data": {
 *     "id": "abc123",
 *     "email": "subscriber@example.com",
 *     "email_type": "html",
 *     "ip_opt": "192.168.1.1",
 *     "ip_signup": "",
 *     "web_id": "123456",
 *     "merges": {
 *       "EMAIL": "subscriber@example.com",
 *       "FNAME": "John",
 *       "LNAME": "Doe"
 *     },
 *     "list_id": "abc123def"
 *   }
 * }
 *
 * Event Types:
 * - subscribe: New subscriber added
 * - unsubscribe: Subscriber removed
 * - profile: Profile updated
 * - cleaned: Email cleaned (hard bounce)
 * - upemail: Email address changed
 * - campaign: Campaign sent or cancelled
 */
@ApiTags('webhooks')
@Controller('webhooks/mailchimp')
export class MailchimpWebhookController {
  private readonly logger = new Logger(MailchimpWebhookController.name);

  // Deduplication cache to prevent infinite loops
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

  /**
   * GET /webhooks/mailchimp/:workflowId
   * Mailchimp sends GET request to verify webhook URL during setup
   */
  @Get(':workflowId')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Verify Mailchimp webhook URL',
    description: 'Mailchimp sends a GET request to verify the webhook URL during setup',
  })
  @ApiParam({ name: 'workflowId', description: 'The workflow ID' })
  verifyWebhook(
    @Param('workflowId') workflowId: string,
    @Query() query: any,
  ) {
    this.logger.log(`Mailchimp webhook verification for workflow ${workflowId}`);
    return '';  // Mailchimp expects empty 200 response
  }

  /**
   * POST /webhooks/mailchimp/:workflowId
   * Mailchimp webhook endpoint for workflow triggers
   * Note: Mailchimp sends form-urlencoded data which NestJS can parse to JSON
   */
  @Post(':workflowId')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Receive Mailchimp webhook events',
    description: 'Endpoint that receives webhook events from Mailchimp',
  })
  @ApiParam({ name: 'workflowId', description: 'The workflow ID to trigger' })
  @ApiResponse({
    status: 200,
    description: 'Webhook received and workflow triggered',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean' },
        message: { type: 'string' },
        executionId: { type: 'string' },
      },
    },
  })
  async receiveWebhook(
    @Param('workflowId') workflowId: string,
    @Body() payload: any,
    @Headers() headers: any,
  ) {
    const eventType = payload?.type || 'unknown';

    this.logger.log(`Mailchimp webhook received: Type=${eventType}, Workflow=${workflowId}`);

    // Check if this event originated from API (our own workflow actions)
    // This prevents infinite loops when workflow modifies Mailchimp data
    // Mailchimp doesn't have explicit API source, but we can check sources config
    // For now, we rely on deduplication cache

    // Generate unique event key for deduplication
    const eventKey = this.generateEventKey(workflowId, eventType, payload);

    // Check if this event was already processed
    if (this.isEventAlreadyProcessed(eventKey)) {
      this.logger.warn(`Duplicate event detected, skipping: ${eventKey}`);
      return {
        success: true,
        message: 'Event already processed (duplicate)',
        skipped: true,
      };
    }

    // Mark event as processed
    this.markEventAsProcessed(eventKey);

    try {
      // Validate the workflow exists
      const workflow = await this.workflowService.getWorkflow(workflowId);
      if (!workflow) {
        throw new NotFoundException('Workflow not found');
      }

      // Find the Mailchimp trigger node in workflow
      const mailchimpTrigger = this.findMailchimpTrigger(workflow, eventType);
      if (!mailchimpTrigger) {
        this.logger.warn(
          `Workflow ${workflowId} does not have a Mailchimp trigger for event: ${eventType}`,
        );
        return {
          success: false,
          message: `No trigger configured for event type: ${eventType}`,
        };
      }

      // Check if this event should trigger the workflow
      const shouldTrigger = this.shouldTriggerWorkflow(mailchimpTrigger, eventType, payload);

      if (!shouldTrigger) {
        return {
          success: true,
          message: 'Event received but did not match trigger conditions',
        };
      }

      // Prepare event data for workflow
      const eventData = this.prepareEventData(eventType, payload);

      this.logger.log(`Triggering workflow ${workflowId} for Mailchimp ${eventType} event`);

      // Execute the workflow with the event data
      const result = await this.workflowService.executeWorkflow({
        workflow_id: workflowId,
        input_data: {
          mailchimpEvent: eventData,
          triggeredAt: new Date().toISOString(),
          trigger: `mailchimp_${eventType}`,
          eventType,
        },
      });

      return {
        success: true,
        message: 'Mailchimp event processed successfully',
        executionId: result.id,
      };
    } catch (error) {
      this.logger.error(`Failed to process Mailchimp webhook: ${error.message}`, error.stack);

      if (error instanceof NotFoundException) {
        throw error;
      }

      // Return 200 to Mailchimp even on errors (to avoid retries)
      return {
        success: false,
        message: `Error: ${error.message}`,
      };
    }
  }

  /**
   * Find Mailchimp trigger node in workflow for specific event type
   */
  private findMailchimpTrigger(workflow: any, eventType: string): any | null {
    const canvas = workflow.workflow?.canvas || workflow.canvas;

    if (!canvas || !canvas.nodes || canvas.nodes.length === 0) {
      this.logger.warn(`Workflow canvas is empty or missing nodes`);
      return null;
    }

    // Look for Mailchimp trigger nodes
    const triggers = canvas.nodes.filter(
      (node: any) =>
        node.type === 'MAILCHIMP_TRIGGER' ||
        (node.type === 'CONNECTOR_TRIGGER' && node.data?.connectorType === 'mailchimp'),
    );

    this.logger.debug(`Found ${triggers.length} Mailchimp trigger nodes`);

    // Map Mailchimp event types to trigger IDs
    const eventToTriggerMap: Record<string, string> = {
      'subscribe': 'subscriber_added',
      'unsubscribe': 'subscriber_removed',
      'cleaned': 'subscriber_cleaned',
      'profile': 'subscriber_profile_updated',
      'upemail': 'subscriber_email_changed',
      'campaign': 'campaign_sent',
    };

    const expectedTriggerId = eventToTriggerMap[eventType];

    // Find trigger that matches the event type
    for (const trigger of triggers) {
      const triggerId = trigger.data?.triggerId;

      // Direct match
      if (triggerId === expectedTriggerId) {
        return trigger;
      }

      // Wildcard "any event" trigger
      if (triggerId === 'any_event') {
        return trigger;
      }
    }

    // No match found
    this.logger.log(`No trigger configured for event type: ${eventType}`);
    return null;
  }

  /**
   * Check if this event should trigger the workflow
   */
  private shouldTriggerWorkflow(
    triggerNode: any,
    eventType: string,
    payload: any,
  ): boolean {
    const triggerParams = triggerNode.data?.triggerParams || triggerNode.data?.actionParams || {};

    // Filter by list ID if specified
    if (triggerParams.listId) {
      const eventListId = payload?.data?.list_id;
      if (eventListId && eventListId !== triggerParams.listId) {
        this.logger.log(`List ID ${eventListId} does not match filter ${triggerParams.listId}`);
        return false;
      }
    }

    // Filter by source if specified
    if (triggerParams.sources && triggerParams.sources !== 'all') {
      // Mailchimp doesn't expose source in webhook, so we skip source filtering
      // This could be implemented by checking the sources configuration on webhook creation
    }

    return true;
  }

  /**
   * Prepare event data in a structured format for the workflow
   */
  private prepareEventData(eventType: string, payload: any): any {
    const data = payload?.data || {};
    const firedAt = this.parseFiredAt(payload?.fired_at);

    const baseData = {
      type: eventType,
      firedAt: firedAt,
      listId: data.list_id,
    };

    switch (eventType) {
      case 'subscribe':
        return {
          ...baseData,
          subscriber: {
            id: data.id,
            email: data.email,
            emailType: data.email_type,
            webId: data.web_id,
            ipOptIn: data.ip_opt,
            ipSignup: data.ip_signup,
            merges: data.merges || {},
            firstName: data.merges?.FNAME || data.fname,
            lastName: data.merges?.LNAME || data.lname,
          },
        };

      case 'unsubscribe':
        return {
          ...baseData,
          subscriber: {
            id: data.id,
            email: data.email,
            reason: data.reason,
            campaignId: data.campaign_id,
            action: data.action, // 'unsub' or 'abuse'
            merges: data.merges || {},
          },
        };

      case 'cleaned':
        return {
          ...baseData,
          subscriber: {
            id: data.id,
            email: data.email,
            reason: data.reason, // 'hard' or 'abuse'
            campaignId: data.campaign_id,
          },
        };

      case 'profile':
        return {
          ...baseData,
          subscriber: {
            id: data.id,
            email: data.email,
            emailType: data.email_type,
            merges: data.merges || {},
            firstName: data.merges?.FNAME,
            lastName: data.merges?.LNAME,
          },
        };

      case 'upemail':
        return {
          ...baseData,
          oldEmail: data.old_email,
          newEmail: data.new_email || data.email,
          subscriber: {
            id: data.id,
            email: data.new_email || data.email,
          },
        };

      case 'campaign':
        return {
          ...baseData,
          campaign: {
            id: data.id,
            subject: data.subject,
            status: data.status, // 'sent' or 'cancelled'
            reason: data.reason,
          },
        };

      default:
        return {
          ...baseData,
          data: data,
          rawPayload: payload,
        };
    }
  }

  /**
   * Parse fired_at timestamp from Mailchimp webhook
   * Format: "2024-01-15 10:30:00"
   */
  private parseFiredAt(firedAt: string | undefined): string {
    if (!firedAt) {
      return new Date().toISOString();
    }

    try {
      // Mailchimp format: "YYYY-MM-DD HH:MM:SS"
      const date = new Date(firedAt.replace(' ', 'T') + 'Z');
      if (!isNaN(date.getTime())) {
        return date.toISOString();
      }
    } catch {
      // Fall through to default
    }

    return new Date().toISOString();
  }

  /**
   * Generate event key for deduplication
   */
  private generateEventKey(workflowId: string, eventType: string, payload: any): string {
    const data = payload?.data || {};
    const subscriberId = data.id || data.email || 'unknown';
    const listId = data.list_id || 'unknown';
    // Use fired_at to allow same event type on same subscriber after some time
    const firedAt = payload?.fired_at || 'unknown';
    return `${workflowId}:${eventType}:${listId}:${subscriberId}:${firedAt}`;
  }

  /**
   * Check if an event has already been processed
   */
  private isEventAlreadyProcessed(eventKey: string): boolean {
    const processedAt = this.processedEvents.get(eventKey);
    if (!processedAt) {
      return false;
    }
    return Date.now() - processedAt < this.EVENT_CACHE_TTL;
  }

  /**
   * Mark an event as processed
   */
  private markEventAsProcessed(eventKey: string): void {
    this.processedEvents.set(eventKey, Date.now());
  }

  /**
   * Clean up old events from cache
   */
  private cleanupEventCache(): void {
    const now = Date.now();
    let deleted = 0;

    for (const [key, timestamp] of this.processedEvents.entries()) {
      if (now - timestamp > this.EVENT_CACHE_TTL) {
        this.processedEvents.delete(key);
        deleted++;
      }
    }

    // Limit cache size
    if (this.processedEvents.size > this.MAX_CACHE_SIZE) {
      const entries = Array.from(this.processedEvents.entries())
        .sort((a, b) => a[1] - b[1]);
      const toRemove = entries.slice(0, entries.length - this.MAX_CACHE_SIZE);
      for (const [key] of toRemove) {
        this.processedEvents.delete(key);
        deleted++;
      }
    }

    if (deleted > 0) {
      this.logger.debug(`Cleaned up ${deleted} old events from cache`);
    }
  }
}
