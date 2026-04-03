import { Controller, Post, Get, Param, Body, Headers, Logger, Inject, forwardRef, RawBodyRequest, Req } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { Request } from 'express';
import { WorkflowService } from '../../../workflow/workflow.service';
import { SendGridTriggerService } from './sendgrid-trigger.service';

// SendGrid webhook event types
interface SendGridEvent {
  email: string;
  timestamp: number;
  'smtp-id'?: string;
  event: string;
  category?: string[];
  sg_event_id: string;
  sg_message_id: string;
  response?: string;
  attempt?: string;
  useragent?: string;
  ip?: string;
  url?: string;
  reason?: string;
  status?: string;
  asm_group_id?: number;
  unique_args?: Record<string, any>;
  marketing_campaign_id?: number;
  marketing_campaign_name?: string;
  marketing_campaign_version?: string;
  marketing_campaign_split_id?: number;
}

// Map SendGrid event types to trigger IDs
const EVENT_TO_TRIGGER_MAP: Record<string, string> = {
  delivered: 'email_delivered',
  open: 'email_opened',
  click: 'email_clicked',
  bounce: 'email_bounced',
  dropped: 'email_dropped',
  unsubscribe: 'email_unsubscribed',
  spamreport: 'spam_report',
  group_unsubscribe: 'group_unsubscribed',
  group_resubscribe: 'group_resubscribed',
  deferred: 'email_deferred',
  processed: 'email_processed'
};

@ApiTags('SendGrid Webhook')
@Controller('webhooks/sendgrid')
export class SendGridWebhookController {
  private readonly logger = new Logger(SendGridWebhookController.name);

  constructor(
    @Inject(forwardRef(() => WorkflowService))
    private readonly workflowService: WorkflowService,
    private readonly sendGridTriggerService: SendGridTriggerService
  ) {}

  @Post(':workflowId')
  @ApiOperation({ summary: 'Handle SendGrid Event Webhook' })
  @ApiResponse({ status: 200, description: 'Webhook processed successfully' })
  @ApiResponse({ status: 404, description: 'Workflow not found' })
  async handleSendGridWebhook(
    @Param('workflowId') workflowId: string,
    @Body() events: SendGridEvent[],
    @Headers('x-twilio-email-event-webhook-signature') signature?: string,
    @Headers('x-twilio-email-event-webhook-timestamp') timestamp?: string,
    @Req() req?: RawBodyRequest<Request>
  ) {
    this.logger.log(`Received SendGrid webhook for workflow ${workflowId}`, {
      eventCount: events?.length || 0,
      hasSignature: !!signature
    });

    try {
      // Validate events array
      if (!events || !Array.isArray(events) || events.length === 0) {
        this.logger.warn('No events in SendGrid webhook payload');
        return { status: 'ok', message: 'No events to process' };
      }

      // Validate signature if provided
      if (signature && timestamp) {
        const rawBody = req?.rawBody?.toString() || JSON.stringify(events);
        const isValid = this.sendGridTriggerService.validateSignature(rawBody, signature, timestamp, workflowId);
        if (!isValid) {
          this.logger.warn(`Invalid signature for SendGrid webhook ${workflowId}`);
          return { status: 'error', message: 'Invalid signature' };
        }
      }

      // Get the workflow
      const workflowData = await this.workflowService.getWorkflow(workflowId);
      if (!workflowData) {
        this.logger.warn(`Workflow ${workflowId} not found`);
        return { status: 'error', message: 'Workflow not found' };
      }

      // Get nodes from canvas
      const nodes = workflowData.workflow?.canvas?.nodes || [];

      // Find SendGrid trigger nodes in the workflow
      const sendGridTriggerNodes = nodes.filter(
        node => node.type === 'CONNECTOR_TRIGGER' &&
               node.data?.connectorType === 'sendgrid'
      );

      if (sendGridTriggerNodes.length === 0) {
        this.logger.warn(`No SendGrid trigger node found in workflow ${workflowId}`);
        return { status: 'error', message: 'No SendGrid trigger configured' };
      }

      // Process each event
      const results: any[] = [];

      for (const event of events) {
        const eventType = event.event?.toLowerCase();
        const triggerId = EVENT_TO_TRIGGER_MAP[eventType];

        if (!triggerId) {
          this.logger.debug(`Unknown SendGrid event type: ${eventType}`);
          continue;
        }

        // Find matching trigger node
        let matchingTriggerNode = null;

        for (const triggerNode of sendGridTriggerNodes) {
          const nodeTriggerId = triggerNode.data?.triggerId;

          if (nodeTriggerId === triggerId || !nodeTriggerId) {
            matchingTriggerNode = triggerNode;
            break;
          }
        }

        if (!matchingTriggerNode) {
          this.logger.debug(`No matching trigger for event type: ${eventType}`);
          continue;
        }

        // Prepare trigger data
        const triggerData = this.prepareTriggerData(event, triggerId);

        // Execute workflow
        try {
          const execution = await this.workflowService.executeWorkflow({
            workflow_id: workflowId,
            input_data: triggerData,
            organization_id: workflowData.organization_id,
            project_id: workflowData.project_id
          });

          results.push({
            eventId: event.sg_event_id,
            eventType: eventType,
            executionId: execution.id,
            executionNumber: execution.execution_number
          });

          this.logger.log(`Workflow ${workflowId} executed for event ${eventType}`, {
            executionId: execution.id
          });
        } catch (execError) {
          this.logger.error(`Failed to execute workflow for event ${event.sg_event_id}:`, execError);
          results.push({
            eventId: event.sg_event_id,
            eventType: eventType,
            error: execError.message
          });
        }
      }

      return {
        status: 'success',
        message: `Processed ${results.length} event(s)`,
        executions: results
      };

    } catch (error) {
      this.logger.error(`Error processing SendGrid webhook for workflow ${workflowId}:`, error);
      return {
        status: 'error',
        message: 'Failed to process webhook',
        error: error.message
      };
    }
  }

  @Get(':workflowId/info')
  @ApiOperation({ summary: 'Get webhook configuration info' })
  async getWebhookInfo(@Param('workflowId') workflowId: string) {
    const status = await this.sendGridTriggerService.getStatus(workflowId);
    const appUrl = process.env.APP_URL || 'http://localhost:3000';

    return {
      webhookUrl: `${appUrl}/api/v1/webhooks/sendgrid/${workflowId}`,
      status: status.active ? 'active' : 'inactive',
      triggerStatus: status,
      supportedEvents: Object.keys(EVENT_TO_TRIGGER_MAP),
      setup: {
        instructions: [
          '1. Go to SendGrid Dashboard > Settings > Mail Settings',
          '2. Click on "Event Webhook"',
          `3. Set the HTTP POST URL to: ${appUrl}/api/v1/webhooks/sendgrid/${workflowId}`,
          '4. Select the events you want to receive',
          '5. (Optional) Enable "Signed Event Webhook Requests" for security',
          '6. Set "Event Webhook Status" to Enabled',
          '7. Click "Save"'
        ],
        note: 'SendGrid webhooks are configured at the account level, not per-recipient'
      }
    };
  }

  @Get(':workflowId/debug')
  @ApiOperation({ summary: 'Debug webhook configuration' })
  async debugWebhook(@Param('workflowId') workflowId: string) {
    try {
      const workflow = await this.workflowService.getWorkflow(workflowId);

      if (!workflow) {
        return {
          error: 'Workflow not found',
          workflowId
        };
      }

      const nodes = workflow.workflow?.canvas?.nodes || [];
      const sendGridTriggers = nodes.filter(
        node => node.type === 'CONNECTOR_TRIGGER' && node.data?.connectorType === 'sendgrid'
      );

      const triggerStatus = await this.sendGridTriggerService.getStatus(workflowId);
      const activeTrigger = this.sendGridTriggerService.getActiveTrigger(workflowId);

      return {
        workflowId,
        workflowStatus: workflow.status,
        appUrl: process.env.APP_URL,
        expectedWebhookUrl: `${process.env.APP_URL}/api/v1/webhooks/sendgrid/${workflowId}`,
        triggerStatus,
        activeTrigger: activeTrigger ? {
          triggerId: activeTrigger.triggerId,
          events: activeTrigger.config?.events
        } : null,
        sendGridTriggers: sendGridTriggers.map(t => ({
          nodeId: t.id,
          triggerId: t.data?.triggerId,
          hasCredentialId: !!t.data?.connectorConfigId,
          config: t.data?.actionParams || {}
        })),
        troubleshooting: {
          step1: 'Check if workflow status is "active"',
          step2: 'Verify webhook URL is configured in SendGrid Dashboard',
          step3: 'Ensure SendGrid Event Webhook is enabled',
          step4: 'Check SendGrid Activity Feed for webhook delivery status',
          step5: 'Test with SendGrid\'s "Test Your Integration" feature'
        }
      };
    } catch (error) {
      return {
        error: 'Debug failed',
        message: error.message,
        stack: error.stack
      };
    }
  }

  // Helper methods

  private prepareTriggerData(event: SendGridEvent, triggerId: string): any {
    const baseData = {
      sendGridEvent: {
        eventId: event.sg_event_id,
        messageId: event.sg_message_id,
        email: event.email,
        event: event.event,
        timestamp: event.timestamp ? new Date(event.timestamp * 1000).toISOString() : new Date().toISOString(),
        smtpId: event['smtp-id'],
        category: event.category,
        uniqueArgs: event.unique_args,
        campaign: event.marketing_campaign_name ? {
          id: event.marketing_campaign_id,
          name: event.marketing_campaign_name,
          version: event.marketing_campaign_version,
          splitId: event.marketing_campaign_split_id
        } : undefined
      }
    };

    // Add event-specific data
    switch (triggerId) {
      case 'email_opened':
        return {
          sendGridEvent: {
            ...baseData.sendGridEvent,
            type: 'open',
            userAgent: event.useragent,
            ip: event.ip
          }
        };

      case 'email_clicked':
        return {
          sendGridEvent: {
            ...baseData.sendGridEvent,
            type: 'click',
            url: event.url,
            userAgent: event.useragent,
            ip: event.ip
          }
        };

      case 'email_bounced':
        return {
          sendGridEvent: {
            ...baseData.sendGridEvent,
            type: 'bounce',
            reason: event.reason,
            status: event.status
          }
        };

      case 'email_dropped':
        return {
          sendGridEvent: {
            ...baseData.sendGridEvent,
            type: 'dropped',
            reason: event.reason
          }
        };

      case 'email_unsubscribed':
      case 'group_unsubscribed':
      case 'group_resubscribed':
        return {
          sendGridEvent: {
            ...baseData.sendGridEvent,
            type: triggerId.replace('email_', '').replace('group_', 'group_'),
            asmGroupId: event.asm_group_id
          }
        };

      case 'spam_report':
        return {
          sendGridEvent: {
            ...baseData.sendGridEvent,
            type: 'spam_report'
          }
        };

      default:
        return baseData;
    }
  }
}
