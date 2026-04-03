/**
 * Zoho CRM Webhook Controller
 *
 * Handles incoming webhook events from Zoho CRM.
 * Zoho can send various event types for records, deals, leads, etc.
 *
 * Webhook Event Types:
 * - record.created: Record created in any module
 * - record.updated: Record updated
 * - deal.stage_changed: Deal stage changed
 * - lead.converted: Lead converted to contact/account
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

// Zoho webhook event type categories
const WEBHOOK_EVENT_CATEGORIES: Record<string, string> = {
  // Record events
  'record.created': 'record_created',
  'record.updated': 'record_updated',
  'record.deleted': 'record_deleted',
  // Deal events
  'deal.stage_changed': 'deal_stage_changed',
  'deal.won': 'deal_won',
  'deal.lost': 'deal_lost',
  // Lead events
  'lead.converted': 'lead_converted',
  'lead.created': 'lead_created',
  // Contact events
  'contact.created': 'contact_created',
  'contact.updated': 'contact_updated',
  // Account events
  'account.created': 'account_created',
  'account.updated': 'account_updated',
};

@ApiTags('webhooks')
@Controller('webhooks/zoho')
export class ZohoWebhookController {
  private readonly logger = new Logger(ZohoWebhookController.name);

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
  @ApiOperation({ summary: 'Receive Zoho CRM webhook events' })
  @ApiResponse({ status: 200, description: 'Webhook processed successfully' })
  @ApiResponse({ status: 400, description: 'Invalid webhook payload' })
  async receiveWebhook(
    @Param('workflowId') workflowId: string,
    @Body() payload: any,
    @Headers() headers: any,
  ) {
    // Extract event information from payload
    // Zoho webhooks can have different structures based on configuration
    const eventType = this.extractEventType(payload);
    const eventId = this.extractEventId(payload);
    const module = payload?.module || payload?.Module || 'unknown';

    this.logger.log(`Zoho CRM webhook received: Type=${eventType}, EventId=${eventId}, Module=${module}, Workflow=${workflowId}`);

    // Deduplication check
    const eventKey = this.generateEventKey(workflowId, eventId, eventType);
    if (this.isEventAlreadyProcessed(eventKey)) {
      this.logger.warn(`Duplicate Zoho CRM event detected, skipping: ${eventKey}`);
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

      // Map event type to category
      const triggerId = WEBHOOK_EVENT_CATEGORIES[eventType] || `zoho_${eventType.toLowerCase().replace(/\./g, '_')}`;

      // Prepare event data for workflow
      const eventData = {
        zohoEvent: this.prepareEventData(payload),
        triggeredAt: new Date().toISOString(),
        trigger: triggerId,
        eventType,
        eventId,
        module,
      };

      // Execute the workflow
      const result = await this.workflowService.executeWorkflow({
        workflow_id: workflowId,
        input_data: eventData,
      });

      this.logger.log(`Zoho CRM webhook processed successfully. ExecutionId: ${result.id}`);

      return {
        success: true,
        message: 'Webhook processed successfully',
        executionId: result.id,
        triggerId,
      };
    } catch (error) {
      this.logger.error(`Zoho CRM webhook processing error: ${error.message}`, error.stack);
      // Return 200 to prevent Zoho from retrying indefinitely
      return {
        success: false,
        message: error.message,
      };
    }
  }

  /**
   * Extract event type from various Zoho webhook formats
   */
  private extractEventType(payload: any): string {
    // Check for various Zoho webhook event type fields
    if (payload?.event_type) return payload.event_type;
    if (payload?.eventType) return payload.eventType;
    if (payload?.event) return payload.event;
    if (payload?.action) return payload.action;
    if (payload?.trigger_type) return payload.trigger_type;

    // Infer from payload structure
    if (payload?.data?.record && payload?.action === 'create') return 'record.created';
    if (payload?.data?.record && payload?.action === 'update') return 'record.updated';
    if (payload?.data?.record && payload?.action === 'delete') return 'record.deleted';

    return 'unknown';
  }

  /**
   * Extract event ID from various Zoho webhook formats
   */
  private extractEventId(payload: any): string {
    // Check for various ID fields
    if (payload?.id) return String(payload.id);
    if (payload?.event_id) return String(payload.event_id);
    if (payload?.eventId) return String(payload.eventId);
    if (payload?.data?.id) return String(payload.data.id);
    if (payload?.record?.id) return String(payload.record.id);
    if (payload?.data?.record?.id) return String(payload.data.record.id);

    // Generate timestamp-based ID if none found
    return `${Date.now()}`;
  }

  /**
   * Generate unique event key for deduplication
   */
  private generateEventKey(workflowId: string, eventId: string, eventType: string): string {
    return `${workflowId}:${eventId}:${eventType}`;
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
      this.logger.debug(`Cleaned up ${deleted} expired Zoho CRM events from cache`);
    }
  }

  /**
   * Prepare standardized event data from Zoho webhook payload
   */
  private prepareEventData(payload: any): any {
    const baseData = {
      event_type: this.extractEventType(payload),
      event_id: this.extractEventId(payload),
      module: payload?.module || payload?.Module,
      timestamp: payload?.timestamp || payload?.time || new Date().toISOString(),
    };

    // Handle record events
    if (payload?.data?.record || payload?.record) {
      const record = payload?.data?.record || payload?.record;
      return {
        ...baseData,
        record: {
          id: record.id || record.Id,
          data: record,
          module: payload?.module || payload?.Module,
        },
      };
    }

    // Handle deal stage change events
    if (payload?.deal || (payload?.data && payload?.action?.includes('stage'))) {
      return {
        ...baseData,
        deal: payload?.deal || payload?.data?.record,
        previousStage: payload?.previous_stage || payload?.previousStage || payload?.old_value,
        newStage: payload?.new_stage || payload?.newStage || payload?.new_value,
      };
    }

    // Handle lead conversion events
    if (payload?.lead || payload?.converted_lead || this.extractEventType(payload) === 'lead.converted') {
      return {
        ...baseData,
        lead: payload?.lead || payload?.converted_lead || payload?.data?.lead,
        contact: payload?.contact || payload?.created_contact || payload?.data?.contact,
        account: payload?.account || payload?.created_account || payload?.data?.account,
      };
    }

    // Default: return raw data
    return {
      ...baseData,
      data: payload?.data || payload,
    };
  }
}
