import { Controller, Post, Get, Param, Body, Headers, Logger, RawBodyRequest, Req, Inject, forwardRef } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { Request } from 'express';
import { WorkflowService } from '../../../workflow/workflow.service';
import { StripeTriggerService } from './stripe-trigger.service';

@ApiTags('Stripe Webhook')
@Controller('webhooks/stripe')
export class StripeWebhookController {
  private readonly logger = new Logger(StripeWebhookController.name);

  constructor(
    @Inject(forwardRef(() => WorkflowService))
    private readonly workflowService: WorkflowService,
    private readonly stripeTriggerService: StripeTriggerService
  ) {}

  @Post(':workflowId')
  @ApiOperation({ summary: 'Handle Stripe webhook events' })
  @ApiResponse({ status: 200, description: 'Webhook processed successfully' })
  @ApiResponse({ status: 404, description: 'Workflow not found' })
  async handleStripeWebhook(
    @Param('workflowId') workflowId: string,
    @Req() req: RawBodyRequest<Request>,
    @Headers('stripe-signature') signature?: string
  ) {
    this.logger.log(`Received Stripe webhook for workflow ${workflowId}`);

    try {
      // Get raw body for signature verification
      const payload = req.rawBody || req.body;

      // Validate webhook signature
      const verification = this.stripeTriggerService.validateWebhookSignature(
        workflowId,
        payload,
        signature
      );

      if (!verification.valid) {
        this.logger.warn(`Invalid Stripe webhook signature for workflow ${workflowId}: ${verification.error}`);
        return {
          status: 'error',
          message: 'Invalid webhook signature',
          error: verification.error
        };
      }

      const event = verification.event;
      if (!event) {
        this.logger.warn(`No event data in webhook for workflow ${workflowId}`);
        return {
          status: 'error',
          message: 'No event data'
        };
      }

      this.logger.log(`Valid Stripe webhook signature for workflow ${workflowId}, event: ${event.type}`);

      // Find the workflow
      const workflowData = await this.workflowService.getWorkflow(workflowId);
      if (!workflowData) {
        this.logger.warn(`Workflow ${workflowId} not found`);
        return { status: 'error', message: 'Workflow not found' };
      }

      // Get nodes from canvas
      const nodes = workflowData.workflow?.canvas?.nodes || [];

      // Find Stripe trigger nodes in the workflow
      const stripeTriggerNodes = nodes.filter(
        node => node.type === 'CONNECTOR_TRIGGER' &&
               node.data?.connectorType === 'stripe'
      );

      if (stripeTriggerNodes.length === 0) {
        this.logger.warn(`No Stripe trigger node found in workflow ${workflowId}`);
        return { status: 'error', message: 'No Stripe trigger configured' };
      }

      // Find matching trigger based on event type
      let matchingTriggerNode = null;

      for (const triggerNode of stripeTriggerNodes) {
        const triggerId = triggerNode.data?.triggerId;
        const triggerEventType = this.getTriggerEventType(triggerId);

        // Check if this trigger matches the event type
        if (triggerEventType === event.type) {
          matchingTriggerNode = triggerNode;
          break;
        }
      }

      if (!matchingTriggerNode) {
        this.logger.debug(`No matching trigger for event type: ${event.type}`);
        // Still return success to acknowledge receipt
        return { status: 'ok', message: 'Event received but no matching trigger' };
      }

      // Prepare trigger data based on event type
      const triggerData = this.prepareTriggerData(event);

      // Execute workflow with trigger data
      const execution = await this.workflowService.executeWorkflow({
        workflow_id: workflowId,
        input_data: triggerData,
        organization_id: workflowData.organization_id,
        project_id: workflowData.project_id
      });

      this.logger.log(`Workflow ${workflowId} executed successfully for event ${event.type}`, {
        executionId: execution.id,
        executionNumber: execution.execution_number
      });

      return {
        status: 'success',
        message: 'Webhook processed successfully',
        executionId: execution.id,
        executionNumber: execution.execution_number,
        eventType: event.type
      };

    } catch (error) {
      this.logger.error(`Error processing Stripe webhook for workflow ${workflowId}:`, error);
      return {
        status: 'error',
        message: 'Failed to process webhook',
        error: error.message
      };
    }
  }

  @Get(':workflowId/info')
  @ApiOperation({ summary: 'Get webhook info for debugging' })
  async getWebhookInfo(@Param('workflowId') workflowId: string) {
    const webhookUrl = `${process.env.APP_URL}/api/v1/webhooks/stripe/${workflowId}`;
    const webhookSecret = this.stripeTriggerService.getWebhookSecret(workflowId);

    return {
      webhookUrl,
      webhookSecret: webhookSecret ? `${webhookSecret.substring(0, 15)}...` : 'Not activated yet',
      status: webhookSecret ? 'active' : 'pending',
      instructions: {
        setup: 'This webhook is automatically registered when you activate your workflow',
        manual: 'If you need to manually configure it in Stripe Dashboard:',
        steps: [
          '1. Go to Stripe Dashboard > Developers > Webhooks',
          `2. Add endpoint with URL: ${webhookUrl}`,
          '3. Select the events you want to listen to',
          '4. Copy the webhook secret and save it in your workflow configuration'
        ],
        verify: 'Send a test event from Stripe Dashboard to verify the webhook'
      }
    };
  }

  @Get(':workflowId/debug')
  @ApiOperation({ summary: 'Debug webhook status' })
  async debugWebhook(@Param('workflowId') workflowId: string) {
    try {
      // Get workflow
      const workflow = await this.workflowService.getWorkflow(workflowId);

      if (!workflow) {
        return {
          error: 'Workflow not found',
          workflowId
        };
      }

      // Get trigger nodes
      const nodes = workflow.workflow?.canvas?.nodes || [];
      const stripeTriggers = nodes.filter(
        node => node.type === 'CONNECTOR_TRIGGER' && node.data?.connectorType === 'stripe'
      );

      // Get webhook secret
      const webhookSecret = this.stripeTriggerService.getWebhookSecret(workflowId);

      return {
        workflowId,
        workflowStatus: workflow.status,
        appUrl: process.env.APP_URL,
        expectedWebhookUrl: `${process.env.APP_URL}/api/v1/webhooks/stripe/${workflowId}`,
        hasWebhookSecret: !!webhookSecret,
        webhookSecretPreview: webhookSecret ? `${webhookSecret.substring(0, 15)}...` : 'none',
        stripeTriggers: stripeTriggers.map(t => ({
          nodeId: t.id,
          triggerId: t.data?.triggerId,
          triggerName: t.data?.triggerName,
          hasCredentialId: !!t.data?.connectorConfigId,
          credentialIdPreview: t.data?.connectorConfigId ? `${t.data.connectorConfigId.substring(0, 20)}...` : 'none',
          eventType: this.getTriggerEventType(t.data?.triggerId),
        })),
        troubleshooting: {
          step1: 'Check if workflow status is "active"',
          step2: 'Check if Stripe credentials are configured',
          step3: 'Check if webhook secret is set (shown above)',
          step4: 'Send a test event from Stripe Dashboard',
          step5: 'Check backend logs for webhook processing'
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

  /**
   * Map trigger ID to Stripe event type
   */
  private getTriggerEventType(triggerId: string): string {
    const eventTypeMap: Record<string, string> = {
      'charge_succeeded': 'charge.succeeded',
      'charge_failed': 'charge.failed',
      'customer_created': 'customer.created',
      'customer_updated': 'customer.updated',
      'customer_deleted': 'customer.deleted',
      'payment_intent_succeeded': 'payment_intent.succeeded',
      'payment_intent_failed': 'payment_intent.failed',
    };

    return eventTypeMap[triggerId] || triggerId;
  }

  /**
   * Prepare trigger data from Stripe event
   */
  private prepareTriggerData(event: any): any {
    return {
      stripeEvent: {
        id: event.id,
        type: event.type,
        created: event.created,
        livemode: event.livemode,
        data: event.data.object,
        previousAttributes: event.data.previous_attributes,
      }
    };
  }
}
