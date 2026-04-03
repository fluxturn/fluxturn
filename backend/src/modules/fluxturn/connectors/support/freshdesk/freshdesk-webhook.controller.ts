import {
  Controller,
  Post,
  Param,
  Body,
  Headers,
  Logger,
  HttpCode,
  HttpStatus,
  UnauthorizedException,
  Inject,
  forwardRef,
} from '@nestjs/common';
import { FreshdeskTriggerService } from './freshdesk-trigger.service';
import { WorkflowService } from '../../../workflow/workflow.service';

interface FreshdeskTicket {
  id: number;
  subject: string;
  description?: string;
  description_text?: string;
  status: number;
  priority: number;
  source: number;
  requester_id: number;
  responder_id?: number;
  group_id?: number;
  type?: string;
  tags?: string[];
  custom_fields?: Record<string, any>;
  created_at: string;
  updated_at: string;
  due_by?: string;
  fr_due_by?: string;
}

interface FreshdeskWebhookPayload {
  freshdesk_webhook?: {
    ticket_id?: number;
    ticket_subject?: string;
    ticket_description?: string;
    ticket_status?: string;
    ticket_priority?: string;
    ticket_source?: string;
    ticket_type?: string;
    ticket_created_at?: string;
    ticket_updated_at?: string;
    ticket_requester_name?: string;
    ticket_requester_email?: string;
    ticket_agent_name?: string;
    ticket_group_name?: string;
    ticket_tags?: string;
    ticket_url?: string;
    triggered_event?: string;
  };
  ticket?: FreshdeskTicket;
  changes?: Record<string, { from: any; to: any }>;
  actor?: {
    id: number;
    name: string;
    email: string;
    type: string;
  };
}

@Controller('webhooks/freshdesk')
export class FreshdeskWebhookController {
  private readonly logger = new Logger(FreshdeskWebhookController.name);

  constructor(
    private readonly freshdeskTriggerService: FreshdeskTriggerService,
    @Inject(forwardRef(() => WorkflowService))
    private readonly workflowService: WorkflowService,
  ) {}

  @Post(':workflowId')
  @HttpCode(HttpStatus.OK)
  async handleWebhook(
    @Param('workflowId') workflowId: string,
    @Body() payload: FreshdeskWebhookPayload,
    @Headers('x-freshdesk-secret') secretToken: string,
  ) {
    this.logger.log(`Received Freshdesk webhook for workflow ${workflowId}`);

    // Validate secret token if configured
    if (secretToken) {
      const isValid = this.freshdeskTriggerService.validateSecretToken(workflowId, secretToken);

      if (!isValid) {
        this.logger.warn(`Invalid token for workflow ${workflowId}`);
        throw new UnauthorizedException('Invalid webhook token');
      }
    }

    try {
      // Determine trigger type from payload
      const triggerId = this.determineTriggerId(payload);

      // Get active trigger to check if this event matches
      const activeTrigger = this.freshdeskTriggerService.getActiveTrigger(workflowId);

      if (activeTrigger && activeTrigger.triggerId !== triggerId) {
        this.logger.debug(`Event ${triggerId} doesn't match trigger ${activeTrigger.triggerId}, skipping`);
        return {
          success: true,
          message: 'Event filtered out',
        };
      }

      // Prepare event data
      const eventData = this.prepareEventData(payload, triggerId);

      // Execute workflow
      await this.workflowService.executeWorkflow({
        workflow_id: workflowId,
        input_data: {
          freshdeskEvent: eventData,
        },
      });

      this.logger.log(`Successfully triggered workflow ${workflowId} with Freshdesk ${triggerId} event`);

      return {
        success: true,
        message: 'Webhook processed successfully',
        triggerId,
      };
    } catch (error) {
      this.logger.error(`Failed to process Freshdesk webhook for workflow ${workflowId}:`, error);
      throw error;
    }
  }

  private determineTriggerId(payload: FreshdeskWebhookPayload): string {
    // Check for explicit triggered event
    const triggeredEvent = payload.freshdesk_webhook?.triggered_event?.toLowerCase();

    if (triggeredEvent) {
      if (triggeredEvent.includes('create') || triggeredEvent.includes('new')) {
        return 'ticket_created';
      }
      if (triggeredEvent.includes('resolv')) {
        return 'ticket_resolved';
      }
      if (triggeredEvent.includes('update') || triggeredEvent.includes('change')) {
        return 'ticket_updated';
      }
    }

    // Check ticket status for resolution
    if (payload.ticket) {
      const status = payload.ticket.status;
      // Status 4 = Resolved, Status 5 = Closed
      if (status === 4 || status === 5) {
        // Check if status changed to resolved
        if (payload.changes?.status) {
          return 'ticket_resolved';
        }
      }
    }

    // Check for changes indicating update
    if (payload.changes && Object.keys(payload.changes).length > 0) {
      return 'ticket_updated';
    }

    // Default to created if ticket is present without changes
    if (payload.ticket || payload.freshdesk_webhook?.ticket_id) {
      return 'ticket_created';
    }

    return 'ticket_updated';
  }

  private prepareEventData(payload: FreshdeskWebhookPayload, triggerId: string): any {
    const baseData = {
      triggerId,
      timestamp: new Date().toISOString(),
    };

    // Handle webhook format
    if (payload.freshdesk_webhook) {
      const webhook = payload.freshdesk_webhook;
      return {
        ...baseData,
        ticket: {
          id: webhook.ticket_id,
          subject: webhook.ticket_subject,
          description: webhook.ticket_description,
          status: webhook.ticket_status,
          priority: webhook.ticket_priority,
          source: webhook.ticket_source,
          type: webhook.ticket_type,
          created_at: webhook.ticket_created_at,
          updated_at: webhook.ticket_updated_at,
          url: webhook.ticket_url,
          tags: webhook.ticket_tags?.split(',').map(t => t.trim()) || [],
        },
        requester: {
          name: webhook.ticket_requester_name,
          email: webhook.ticket_requester_email,
        },
        agent: {
          name: webhook.ticket_agent_name,
        },
        group: {
          name: webhook.ticket_group_name,
        },
        triggeredEvent: webhook.triggered_event,
      };
    }

    // Handle direct ticket format
    if (payload.ticket) {
      const ticket = payload.ticket;
      return {
        ...baseData,
        ticket: {
          id: ticket.id,
          subject: ticket.subject,
          description: ticket.description_text || ticket.description,
          status: this.mapStatusToLabel(ticket.status),
          statusCode: ticket.status,
          priority: this.mapPriorityToLabel(ticket.priority),
          priorityCode: ticket.priority,
          source: this.mapSourceToLabel(ticket.source),
          sourceCode: ticket.source,
          type: ticket.type,
          tags: ticket.tags || [],
          custom_fields: ticket.custom_fields || {},
          requester_id: ticket.requester_id,
          responder_id: ticket.responder_id,
          group_id: ticket.group_id,
          created_at: ticket.created_at,
          updated_at: ticket.updated_at,
          due_by: ticket.due_by,
        },
        changes: payload.changes,
        actor: payload.actor,
      };
    }

    return {
      ...baseData,
      rawPayload: payload,
    };
  }

  private mapStatusToLabel(status: number): string {
    const statusMap: Record<number, string> = {
      2: 'Open',
      3: 'Pending',
      4: 'Resolved',
      5: 'Closed',
      6: 'Waiting on Customer',
      7: 'Waiting on Third Party',
    };
    return statusMap[status] || `Status ${status}`;
  }

  private mapPriorityToLabel(priority: number): string {
    const priorityMap: Record<number, string> = {
      1: 'Low',
      2: 'Medium',
      3: 'High',
      4: 'Urgent',
    };
    return priorityMap[priority] || `Priority ${priority}`;
  }

  private mapSourceToLabel(source: number): string {
    const sourceMap: Record<number, string> = {
      1: 'Email',
      2: 'Portal',
      3: 'Phone',
      7: 'Chat',
      8: 'Mobihelp',
      9: 'Feedback Widget',
      10: 'Outbound Email',
    };
    return sourceMap[source] || `Source ${source}`;
  }
}
