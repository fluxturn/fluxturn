import {
  Controller,
  Post,
  Param,
  Body,
  Inject,
  forwardRef,
  Logger,
  HttpCode,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiParam } from '@nestjs/swagger';
import { WorkflowService } from '../../../workflow/workflow.service';
import { BrevoTriggerService } from './brevo-trigger.service';

interface BrevoWebhookPayload {
  event?: string;
  email?: string;
  id?: number;
  date?: string;
  ts?: number;
  'message-id'?: string;
  ts_event?: number;
  subject?: string;
  tag?: string;
  sending_ip?: string;
  ts_epoch?: number;
  template_id?: number;
  // For contact events
  listId?: number[];
  // For click events
  link?: string;
  // For bounce events
  reason?: string;
  [key: string]: any;
}

@ApiTags('Brevo Webhook')
@Controller('webhooks/brevo')
export class BrevoWebhookController {
  private readonly logger = new Logger(BrevoWebhookController.name);

  constructor(
    @Inject(forwardRef(() => WorkflowService))
    private readonly workflowService: WorkflowService,
    private readonly brevoTriggerService: BrevoTriggerService
  ) {}

  @Post(':workflowId')
  @HttpCode(200)
  @ApiOperation({ summary: 'Handle Brevo webhook' })
  @ApiParam({ name: 'workflowId', description: 'Workflow ID' })
  async handleWebhook(
    @Param('workflowId') workflowId: string,
    @Body() payload: BrevoWebhookPayload
  ) {
    this.logger.log(`Received Brevo webhook for workflow ${workflowId}`);
    this.logger.debug(`Event type: ${payload.event}`);

    try {
      // Get workflow data
      const workflowData = await this.workflowService.getWorkflow(workflowId);

      if (!workflowData) {
        this.logger.warn(`Workflow ${workflowId} not found`);
        return { success: false, message: 'Workflow not found' };
      }

      // Find matching trigger node
      const canvas = workflowData.canvas;
      const nodes = canvas?.nodes || [];

      const triggerNodes = nodes.filter(
        (node: any) => node.type === 'CONNECTOR_TRIGGER' &&
                      node.data?.connectorType === 'brevo'
      );

      if (triggerNodes.length === 0) {
        this.logger.warn(`No Brevo trigger node found in workflow ${workflowId}`);
        return { success: false, message: 'No Brevo trigger configured' };
      }

      // Check if event matches trigger
      const matchingTrigger = triggerNodes.find((node: any) => {
        const triggerId = node.data?.triggerId || node.data?.actionParams?.triggerId;
        return this.eventMatchesTrigger(payload.event || '', triggerId);
      });

      if (!matchingTrigger) {
        this.logger.debug(`Event ${payload.event} does not match any configured trigger`);
        return { success: true, message: 'Event does not match trigger' };
      }

      // Prepare trigger data
      const triggerData = {
        brevoEvent: {
          event: payload.event,
          email: payload.email,
          messageId: payload['message-id'],
          date: payload.date,
          timestamp: payload.ts_epoch ? new Date(payload.ts_epoch * 1000).toISOString() : new Date().toISOString(),
          subject: payload.subject,
          tag: payload.tag,
          templateId: payload.template_id,
          sendingIp: payload.sending_ip,
          // Event-specific data
          link: payload.link,
          reason: payload.reason,
          listIds: payload.listId,
        }
      };

      // Execute workflow
      const execution = await this.workflowService.executeWorkflow({
        workflow_id: workflowId,
        input_data: triggerData,
        organization_id: workflowData.organization_id,
        project_id: workflowData.project_id,
      });

      this.logger.log(`Workflow ${workflowId} triggered successfully, execution: ${execution.id}`);

      return {
        success: true,
        message: 'Webhook processed successfully',
        executionId: execution.id,
      };

    } catch (error: any) {
      this.logger.error(`Error processing Brevo webhook:`, error);

      return {
        success: false,
        message: 'Failed to process webhook',
        error: error.message,
      };
    }
  }

  private eventMatchesTrigger(eventType: string, triggerId: string): boolean {
    const triggerEventMap: Record<string, string[]> = {
      'email_delivered': ['delivered'],
      'email_opened': ['opened', 'uniqueOpened'],
      'email_clicked': ['click'],
      'email_hard_bounce': ['hardBounce', 'hard_bounce'],
      'email_soft_bounce': ['softBounce', 'soft_bounce'],
      'email_spam': ['spam', 'complaint'],
      'email_unsubscribed': ['unsubscribed'],
      'inbound_email': ['inboundEmailProcessed'],
      'contact_created': ['listAddition', 'contact_added'],
      'contact_updated': ['contactUpdated', 'contact_updated'],
    };

    const expectedEvents = triggerEventMap[triggerId] || [];
    return expectedEvents.includes(eventType);
  }
}
