/**
 * Zendesk Webhook Controller
 *
 * Handles incoming webhook events from Zendesk.
 * Zendesk can send webhooks for various event types including tickets,
 * users, organizations, and more.
 *
 * Webhook Event Types:
 * - zen:event-type:ticket.created: New ticket created
 * - zen:event-type:ticket.updated: Ticket was updated
 * - zen:event-type:ticket.changed: Ticket field changed
 * - zen:event-type:ticket.status.changed.solved: Ticket solved
 * - zen:event-type:user.created: New user created
 * - zen:event-type:organization.created: New organization created
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

// Zendesk webhook event to trigger ID mapping
const WEBHOOK_EVENT_TO_TRIGGER: Record<string, string> = {
  // Ticket events
  'zen:event-type:ticket.created': 'ticket_created',
  'zen:event-type:ticket.updated': 'ticket_updated',
  'zen:event-type:ticket.changed': 'ticket_updated',
  'zen:event-type:ticket.status.changed.solved': 'ticket_solved',
  'zen:event-type:ticket.status.changed.open': 'ticket_updated',
  'zen:event-type:ticket.status.changed.pending': 'ticket_updated',
  'zen:event-type:ticket.status.changed.hold': 'ticket_updated',
  'zen:event-type:ticket.status.changed.closed': 'ticket_updated',
  'zen:event-type:ticket.CommentAdded': 'ticket_updated',
  // User events
  'zen:event-type:user.created': 'user_created',
  'zen:event-type:user.updated': 'user_updated',
  // Organization events
  'zen:event-type:organization.created': 'organization_created',
  'zen:event-type:organization.updated': 'organization_updated',
};

@ApiTags('webhooks')
@Controller('webhooks/zendesk')
export class ZendeskWebhookController {
  private readonly logger = new Logger(ZendeskWebhookController.name);

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
  @ApiOperation({ summary: 'Receive Zendesk webhook events' })
  @ApiResponse({ status: 200, description: 'Webhook processed successfully' })
  @ApiResponse({ status: 400, description: 'Invalid webhook payload' })
  async receiveWebhook(
    @Param('workflowId') workflowId: string,
    @Body() payload: any,
    @Headers() headers: any,
  ) {
    const eventType = payload?.type || payload?.event_type || 'unknown';
    const ticketId = payload?.ticket?.id || payload?.id || 'unknown';
    const webhookId = headers['x-zendesk-webhook-id'] || `${Date.now()}`;

    this.logger.log(`Zendesk webhook received: Type=${eventType}, TicketId=${ticketId}, Workflow=${workflowId}`);

    // Deduplication check
    const eventKey = this.generateEventKey(workflowId, payload, webhookId);
    if (this.isEventAlreadyProcessed(eventKey)) {
      this.logger.warn(`Duplicate Zendesk event detected, skipping: ${eventKey}`);
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
      const triggerId = WEBHOOK_EVENT_TO_TRIGGER[eventType] || this.inferTriggerFromPayload(payload);
      if (!triggerId) {
        this.logger.warn(`Unknown Zendesk webhook type: ${eventType}`);
      }

      // Prepare event data for workflow
      const eventData = {
        zendeskEvent: this.prepareEventData(payload),
        triggeredAt: new Date().toISOString(),
        trigger: triggerId || `zendesk_${eventType.replace(/[:.]/g, '_')}`,
        eventType,
        webhookId,
      };

      // Execute the workflow
      const result = await this.workflowService.executeWorkflow({
        workflow_id: workflowId,
        input_data: eventData,
      });

      this.logger.log(`Zendesk webhook processed successfully. ExecutionId: ${result.id}`);

      return {
        success: true,
        message: 'Webhook processed successfully',
        executionId: result.id,
        triggerId,
      };
    } catch (error) {
      this.logger.error(`Zendesk webhook processing error: ${error.message}`, error.stack);
      // Return 200 to prevent Zendesk from retrying indefinitely
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
    if (payload.ticket) {
      if (payload.ticket.status === 'solved') {
        return 'ticket_solved';
      }
      return payload.ticket.created_at === payload.ticket.updated_at ? 'ticket_created' : 'ticket_updated';
    }
    if (payload.user) {
      return 'user_created';
    }
    if (payload.organization) {
      return 'organization_created';
    }
    return null;
  }

  /**
   * Generate unique event key for deduplication
   */
  private generateEventKey(workflowId: string, payload: any, webhookId: string): string {
    const eventType = payload?.type || payload?.event_type || 'unknown';
    const ticketId = payload?.ticket?.id || payload?.id || 'unknown';
    return `${workflowId}:${eventType}:${webhookId}:${ticketId}`;
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
      this.logger.debug(`Cleaned up ${deleted} expired Zendesk events from cache`);
    }
  }

  /**
   * Prepare standardized event data from Zendesk webhook payload
   */
  private prepareEventData(payload: any): any {
    const eventType = payload?.type || payload?.event_type || 'unknown';

    const baseData = {
      event_type: eventType,
      webhook_id: payload?.webhook_id,
      account_id: payload?.account_id,
      timestamp: new Date().toISOString(),
    };

    // Handle ticket events
    if (payload.ticket) {
      return {
        ...baseData,
        ticket: {
          id: payload.ticket.id,
          subject: payload.ticket.subject,
          description: payload.ticket.description,
          status: payload.ticket.status,
          priority: payload.ticket.priority,
          type: payload.ticket.type,
          requester_id: payload.ticket.requester_id,
          submitter_id: payload.ticket.submitter_id,
          assignee_id: payload.ticket.assignee_id,
          organization_id: payload.ticket.organization_id,
          group_id: payload.ticket.group_id,
          brand_id: payload.ticket.brand_id,
          external_id: payload.ticket.external_id,
          tags: payload.ticket.tags,
          custom_fields: payload.ticket.custom_fields,
          via: payload.ticket.via,
          satisfaction_rating: payload.ticket.satisfaction_rating,
          created_at: payload.ticket.created_at,
          updated_at: payload.ticket.updated_at,
          due_at: payload.ticket.due_at,
          url: payload.ticket.url,
        },
        requester: payload.requester ? {
          id: payload.requester.id,
          name: payload.requester.name,
          email: payload.requester.email,
        } : undefined,
        assignee: payload.assignee ? {
          id: payload.assignee.id,
          name: payload.assignee.name,
          email: payload.assignee.email,
        } : undefined,
        current_user: payload.current_user ? {
          id: payload.current_user.id,
          name: payload.current_user.name,
          email: payload.current_user.email,
        } : undefined,
      };
    }

    // Handle user events
    if (payload.user) {
      return {
        ...baseData,
        user: {
          id: payload.user.id,
          name: payload.user.name,
          email: payload.user.email,
          role: payload.user.role,
          phone: payload.user.phone,
          organization_id: payload.user.organization_id,
          external_id: payload.user.external_id,
          tags: payload.user.tags,
          verified: payload.user.verified,
          active: payload.user.active,
          shared: payload.user.shared,
          locale: payload.user.locale,
          time_zone: payload.user.time_zone,
          created_at: payload.user.created_at,
          updated_at: payload.user.updated_at,
          last_login_at: payload.user.last_login_at,
          url: payload.user.url,
        },
      };
    }

    // Handle organization events
    if (payload.organization) {
      return {
        ...baseData,
        organization: {
          id: payload.organization.id,
          name: payload.organization.name,
          details: payload.organization.details,
          notes: payload.organization.notes,
          domain_names: payload.organization.domain_names,
          external_id: payload.organization.external_id,
          group_id: payload.organization.group_id,
          shared_comments: payload.organization.shared_comments,
          shared_tickets: payload.organization.shared_tickets,
          tags: payload.organization.tags,
          created_at: payload.organization.created_at,
          updated_at: payload.organization.updated_at,
          url: payload.organization.url,
        },
      };
    }

    // Default: return raw data
    return {
      ...baseData,
      raw_data: payload,
    };
  }
}
