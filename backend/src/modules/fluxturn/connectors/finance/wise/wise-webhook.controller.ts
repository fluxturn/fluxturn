import { Controller, Post, Get, Param, Body, Headers, Logger, Inject, forwardRef, Req } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { WorkflowService } from '../../../workflow/workflow.service';
import { WiseTriggerService } from './wise-trigger.service';

interface WiseWebhookEvent {
  data: {
    resource: {
      id: number;
      type: string;
      profile_id?: number;
      account_id?: number;
    };
    current_state?: string;
    previous_state?: string;
    occurred_at: string;
  };
  subscription_id: string;
  event_type: string;
  schema_version: string;
  sent_at: string;
}

@ApiTags('Wise Webhook')
@Controller('webhooks/wise')
export class WiseWebhookController {
  private readonly logger = new Logger(WiseWebhookController.name);

  constructor(
    @Inject(forwardRef(() => WorkflowService))
    private readonly workflowService: WorkflowService,
    private readonly wiseTriggerService: WiseTriggerService
  ) {}

  @Post(':workflowId')
  @ApiOperation({ summary: 'Handle Wise webhook events' })
  @ApiResponse({ status: 200, description: 'Webhook processed successfully' })
  @ApiResponse({ status: 404, description: 'Workflow not found' })
  async handleWiseWebhook(
    @Param('workflowId') workflowId: string,
    @Body() event: WiseWebhookEvent,
    @Headers('x-signature') signature?: string,
    @Headers('x-test-notification') testNotification?: string,
    @Req() req?: any
  ) {
    this.logger.log(`Received Wise webhook for workflow ${workflowId}`, {
      eventType: event.event_type,
      subscriptionId: event.subscription_id,
      isTestNotification: testNotification === 'true'
    });

    try {
      // Handle test notifications
      if (testNotification === 'true') {
        this.logger.log(`Received test notification for workflow ${workflowId}`);
        return {
          status: 'success',
          message: 'Test notification received'
        };
      }

      // Find the workflow
      const workflowData = await this.workflowService.getWorkflow(workflowId);
      if (!workflowData) {
        this.logger.warn(`Workflow ${workflowId} not found`);
        return { status: 'error', message: 'Workflow not found' };
      }

      // Get nodes from canvas
      const nodes = workflowData.workflow?.canvas?.nodes || [];

      // Find Wise trigger nodes in the workflow
      const wiseTriggerNodes = nodes.filter(
        node => node.type === 'CONNECTOR_TRIGGER' &&
               node.data?.connectorType === 'wise'
      );

      if (wiseTriggerNodes.length === 0) {
        this.logger.warn(`No Wise trigger node found in workflow ${workflowId}`);
        return { status: 'error', message: 'No Wise trigger configured' };
      }

      // Get active trigger for signature verification
      const activeTrigger = this.wiseTriggerService.getActiveTrigger(workflowId);

      if (!activeTrigger) {
        this.logger.warn(`No active trigger found for workflow ${workflowId}`);
        return { status: 'error', message: 'Trigger not active' };
      }

      // Verify webhook signature
      const rawBody = req?.rawBody || JSON.stringify(event);
      const isValidSignature = this.wiseTriggerService.validateSignature(workflowId, signature, rawBody);

      if (!isValidSignature) {
        this.logger.warn(`Invalid webhook signature for workflow ${workflowId}`);
        return { status: 'error', message: 'Invalid signature' };
      }

      // Check which trigger should handle this event
      let matchingTriggerNode = null;

      for (const triggerNode of wiseTriggerNodes) {
        const triggerConfig = triggerNode.data?.actionParams || {};
        const configuredEvent = triggerConfig.event;

        // Map event type to our event names
        const eventMapping: Record<string, string> = {
          'transfers#state-change': 'tranferStateChange',
          'transfers#active-cases': 'transferActiveCases',
          'balances#credit': 'balanceCredit',
          'balances#update': 'balanceUpdate',
        };

        const mappedEventType = eventMapping[event.event_type];

        if (configuredEvent === mappedEventType) {
          matchingTriggerNode = triggerNode;
          break;
        }
      }

      if (!matchingTriggerNode) {
        this.logger.debug('No matching trigger for this event type');
        return { status: 'ok', message: 'No matching trigger' };
      }

      // Prepare trigger data based on event type
      let triggerData: any = {
        wiseEvent: {
          eventType: event.event_type,
          subscriptionId: event.subscription_id,
          schemaVersion: event.schema_version,
          sentAt: event.sent_at,
          timestamp: new Date().toISOString()
        }
      };

      // Handle different event types
      if (event.event_type === 'transfers#state-change') {
        triggerData.wiseEvent = {
          ...triggerData.wiseEvent,
          type: 'transfer_state_change',
          transfer: {
            id: event.data.resource.id,
            type: event.data.resource.type,
            profileId: event.data.resource.profile_id,
            currentState: event.data.current_state,
            previousState: event.data.previous_state,
            occurredAt: event.data.occurred_at
          }
        };
      } else if (event.event_type === 'transfers#active-cases') {
        triggerData.wiseEvent = {
          ...triggerData.wiseEvent,
          type: 'transfer_active_cases',
          transfer: {
            id: event.data.resource.id,
            type: event.data.resource.type,
            profileId: event.data.resource.profile_id,
            occurredAt: event.data.occurred_at
          }
        };
      } else if (event.event_type === 'balances#credit') {
        triggerData.wiseEvent = {
          ...triggerData.wiseEvent,
          type: 'balance_credit',
          balance: {
            id: event.data.resource.id,
            type: event.data.resource.type,
            accountId: event.data.resource.account_id,
            profileId: event.data.resource.profile_id,
            occurredAt: event.data.occurred_at
          }
        };
      } else if (event.event_type === 'balances#update') {
        triggerData.wiseEvent = {
          ...triggerData.wiseEvent,
          type: 'balance_update',
          balance: {
            id: event.data.resource.id,
            type: event.data.resource.type,
            accountId: event.data.resource.account_id,
            profileId: event.data.resource.profile_id,
            occurredAt: event.data.occurred_at
          }
        };
      }

      // Store the full event data
      triggerData.wiseEvent.rawData = event;

      // Execute workflow with trigger data
      const execution = await this.workflowService.executeWorkflow({
        workflow_id: workflowId,
        input_data: triggerData,
        organization_id: workflowData.organization_id,
        project_id: workflowData.project_id
      });

      this.logger.log(`Workflow ${workflowId} executed successfully`, {
        executionId: execution.id,
        executionNumber: execution.execution_number
      });

      return {
        status: 'success',
        message: 'Webhook processed successfully',
        executionId: execution.id,
        executionNumber: execution.execution_number
      };

    } catch (error) {
      this.logger.error(`Error processing Wise webhook for workflow ${workflowId}:`, error);
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
    return {
      webhookUrl: `${process.env.APP_URL}/api/v1/webhooks/wise/${workflowId}`,
      status: 'ready',
      instructions: {
        setup: 'Webhook is automatically registered when workflow is activated',
        supportedEvents: [
          'transfers#state-change - Transfer status changes',
          'transfers#active-cases - Transfer active cases updates',
          'balances#credit - Balance credited',
          'balances#update - Balance updated'
        ],
        security: 'Webhooks are verified using RSA-SHA1 signature verification'
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
      const wiseTriggers = nodes.filter(
        node => node.type === 'CONNECTOR_TRIGGER' && node.data?.connectorType === 'wise'
      );

      // Get active trigger info
      const activeTrigger = this.wiseTriggerService.getActiveTrigger(workflowId);

      return {
        workflowId,
        workflowStatus: workflow.status,
        appUrl: process.env.APP_URL,
        expectedWebhookUrl: `${process.env.APP_URL}/api/v1/webhooks/wise/${workflowId}`,
        wiseTriggers: wiseTriggers.map(t => ({
          nodeId: t.id,
          triggerId: t.data?.triggerId,
          event: t.data?.actionParams?.event,
          profileId: t.data?.actionParams?.profileId,
          environment: t.data?.actionParams?.environment || 'live',
          hasCredentialId: !!t.data?.connectorConfigId,
          credentialIdPreview: t.data?.connectorConfigId ? `${t.data.connectorConfigId.substring(0, 20)}...` : 'none',
        })),
        activeTrigger: activeTrigger ? {
          hasActiveTrigger: true,
          webhookUrl: activeTrigger.webhookUrl,
          webhookId: activeTrigger.webhookId,
          event: activeTrigger.event,
          triggerName: activeTrigger.triggerName,
          profileId: activeTrigger.profileId,
          environment: activeTrigger.environment,
          activatedAt: activeTrigger.activatedAt
        } : {
          hasActiveTrigger: false,
          reason: 'No active trigger found - workflow may not be activated'
        },
        troubleshooting: {
          step1: 'Check if workflow status is "active"',
          step2: 'Check if API token has correct permissions',
          step3: 'Check if profile ID is correct',
          step4: 'Check if webhook URL matches expected URL',
          step5: 'Perform an action in Wise to trigger the webhook and check backend logs'
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
}
