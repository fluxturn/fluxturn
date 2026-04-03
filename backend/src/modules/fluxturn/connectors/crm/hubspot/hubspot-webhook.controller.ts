import {
  Controller,
  Post,
  Body,
  Param,
  HttpCode,
  HttpStatus,
  NotFoundException,
  Logger,
  Inject,
  forwardRef,
  Headers,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiParam } from '@nestjs/swagger';
import { WorkflowService } from '../../../workflow/workflow.service';

/**
 * HubSpot Webhook Controller
 * Handles HubSpot webhook events for workflow triggers
 *
 * HubSpot webhook payload structure:
 * [
 *   {
 *     "objectId": 123,
 *     "propertyName": "lifecyclestage",
 *     "propertyValue": "lead",
 *     "changeSource": "INTEGRATION",
 *     "eventId": 456,
 *     "subscriptionId": 789,
 *     "portalId": 62515,
 *     "appId": 54321,
 *     "occurredAt": 1567109311959,
 *     "subscriptionType": "contact.propertyChange",
 *     "attemptNumber": 0
 *   }
 * ]
 */
@ApiTags('webhooks')
@Controller('webhooks/hubspot')
export class HubSpotWebhookController {
  private readonly logger = new Logger(HubSpotWebhookController.name);

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

  /**
   * POST /webhooks/hubspot/:workflowId
   * HubSpot webhook endpoint for workflow triggers
   */
  @Post(':workflowId')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Receive HubSpot webhook events',
    description: 'Endpoint that receives webhook events from HubSpot',
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
    // HubSpot sends an array of events
    const events = Array.isArray(payload) ? payload : [payload];

    this.logger.log(`HubSpot webhook received: ${events.length} event(s), Workflow=${workflowId}`);

    const results = [];

    for (const event of events) {
      try {
        const result = await this.processEvent(workflowId, event);
        results.push(result);
      } catch (error) {
        this.logger.error(`Failed to process HubSpot event: ${error.message}`);
        results.push({
          success: false,
          eventId: event.eventId,
          error: error.message,
        });
      }
    }

    return {
      success: true,
      message: `Processed ${results.length} HubSpot event(s)`,
      results,
    };
  }

  /**
   * Process a single HubSpot event
   */
  private async processEvent(workflowId: string, event: any): Promise<any> {
    const eventType = event.subscriptionType || 'unknown';
    const objectId = event.objectId;
    const eventId = event.eventId;

    this.logger.log(`Processing HubSpot event: ${eventType}, objectId=${objectId}`);

    // Check if this event originated from API (our own workflow actions)
    // This prevents infinite loops
    if (event.changeSource === 'INTEGRATION' || event.changeSource === 'API') {
      this.logger.log(`Skipping API-originated event: ${eventType}, objectId=${objectId}`);
      return {
        success: true,
        message: 'Skipped API-originated event (prevents workflow loop)',
        skipped: true,
      };
    }

    // Generate unique event key for deduplication
    const eventKey = `${workflowId}:${eventType}:${objectId}:${eventId}`;

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

      // Find the HubSpot trigger node in workflow
      const hubspotTrigger = this.findHubSpotTrigger(workflow, eventType);
      if (!hubspotTrigger) {
        this.logger.warn(
          `Workflow ${workflowId} does not have a HubSpot trigger for event: ${eventType}`,
        );
        return {
          success: false,
          message: `No trigger configured for event type: ${eventType}`,
        };
      }

      // Check if this event should trigger the workflow
      const shouldTrigger = this.shouldTriggerWorkflow(hubspotTrigger, eventType, event);

      if (!shouldTrigger) {
        return {
          success: true,
          message: 'Event received but did not match trigger conditions',
        };
      }

      // Prepare event data for workflow
      const eventData = this.prepareEventData(eventType, event);

      this.logger.log(`Triggering workflow ${workflowId} for HubSpot ${eventType} event`);

      // Execute the workflow with the event data
      const result = await this.workflowService.executeWorkflow({
        workflow_id: workflowId,
        input_data: {
          hubspotEvent: eventData,
          triggeredAt: new Date().toISOString(),
          trigger: `hubspot_${eventType.replace('.', '_')}`,
          eventType,
        },
      });

      return {
        success: true,
        message: 'HubSpot event processed successfully',
        executionId: result.id,
      };
    } catch (error) {
      this.logger.error(`Failed to process HubSpot webhook: ${error.message}`, error.stack);

      if (error instanceof NotFoundException) {
        throw error;
      }

      // Return 200 to HubSpot even on errors (to avoid retries)
      return {
        success: false,
        message: `Error: ${error.message}`,
      };
    }
  }

  /**
   * Find HubSpot trigger node in workflow for specific event type
   */
  private findHubSpotTrigger(workflow: any, eventType: string): any | null {
    const canvas = workflow.workflow?.canvas || workflow.canvas;

    if (!canvas || !canvas.nodes || canvas.nodes.length === 0) {
      this.logger.warn(`Workflow canvas is empty or missing nodes`);
      return null;
    }

    // Look for HubSpot trigger nodes
    const triggers = canvas.nodes.filter(
      (node: any) =>
        node.type === 'HUBSPOT_TRIGGER' ||
        (node.type === 'CONNECTOR_TRIGGER' && node.data?.connectorType === 'hubspot'),
    );

    this.logger.debug(`Found ${triggers.length} HubSpot trigger nodes`);

    // Map HubSpot event types to trigger IDs
    const eventToTriggerMap: Record<string, string> = {
      // Company events
      'company.creation': 'company_created',
      'company.deletion': 'company_deleted',
      'company.propertyChange': 'company_property_changed',
      // Contact events
      'contact.creation': 'contact_created',
      'contact.deletion': 'contact_deleted',
      'contact.propertyChange': 'contact_property_changed',
      // Deal events
      'deal.creation': 'deal_created',
      'deal.deletion': 'deal_deleted',
      'deal.propertyChange': 'deal_property_changed',
      // Ticket events
      'ticket.creation': 'ticket_created',
      'ticket.deletion': 'ticket_deleted',
      'ticket.propertyChange': 'ticket_property_changed',
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
    event: any,
  ): boolean {
    const triggerParams = triggerNode.data?.triggerParams || triggerNode.data?.actionParams || {};

    // Filter by property name if specified (for propertyChange events)
    if (triggerParams.propertyName && eventType.includes('propertyChange')) {
      if (event.propertyName !== triggerParams.propertyName) {
        this.logger.log(
          `Property ${event.propertyName} does not match filter ${triggerParams.propertyName}`,
        );
        return false;
      }
    }

    return true;
  }

  /**
   * Prepare event data in a structured format for the workflow
   */
  private prepareEventData(eventType: string, event: any): any {
    const [objectType, action] = eventType.split('.');

    const baseData = {
      eventType,
      objectType,
      action,
      objectId: event.objectId,
      portalId: event.portalId,
      appId: event.appId,
      eventId: event.eventId,
      subscriptionId: event.subscriptionId,
      occurredAt: event.occurredAt ? new Date(event.occurredAt).toISOString() : new Date().toISOString(),
      attemptNumber: event.attemptNumber || 0,
    };

    // Add property change specific data
    if (action === 'propertyChange') {
      return {
        ...baseData,
        propertyName: event.propertyName,
        propertyValue: event.propertyValue,
        changeSource: event.changeSource,
      };
    }

    // For creation/deletion events, include the full event data
    return {
      ...baseData,
      changeSource: event.changeSource,
      rawEvent: event,
    };
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

    // If still too large, remove oldest entries
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
