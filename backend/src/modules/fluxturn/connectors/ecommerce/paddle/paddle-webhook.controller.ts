import { Controller, Post, Get, Param, Body, Headers, Logger, Inject, forwardRef } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { WorkflowService } from '../../../workflow/workflow.service';
import { PaddleTriggerService } from './paddle-trigger.service';

interface PaddleWebhookPayload {
  alert_id: string;
  alert_name: string;
  balance_currency: string;
  balance_earnings: string;
  balance_fee: string;
  balance_gross: string;
  balance_tax: string;
  checkout_id: string;
  country: string;
  coupon: string;
  currency: string;
  customer_name: string;
  earnings: string;
  email: string;
  event_time: string;
  fee: string;
  ip: string;
  marketing_consent: string;
  order_id: string;
  passthrough: string;
  payment_method: string;
  payment_tax: string;
  product_id: string;
  product_name: string;
  quantity: string;
  receipt_url: string;
  sale_gross: string;
  used_price_override: string;
  p_signature?: string;
  // Subscription specific fields
  subscription_id?: string;
  subscription_plan_id?: string;
  subscription_payment_id?: string;
  status?: string;
  next_bill_date?: string;
  update_url?: string;
  cancel_url?: string;
  paused_at?: string;
  paused_from?: string;
  // User specific fields
  user_id?: string;
  linked_subscriptions?: string;
  // Refund specific fields
  amount?: string;
  refund_type?: string;
  refund_reason?: string;
  // Payment failure fields
  attempt_number?: string;
  next_retry_date?: string;
}

@ApiTags('Paddle Webhook')
@Controller('webhooks/paddle')
export class PaddleWebhookController {
  private readonly logger = new Logger(PaddleWebhookController.name);

  constructor(
    @Inject(forwardRef(() => WorkflowService))
    private readonly workflowService: WorkflowService,
    private readonly paddleTriggerService: PaddleTriggerService
  ) {}

  @Post(':workflowId')
  @ApiOperation({ summary: 'Handle Paddle webhook events' })
  @ApiResponse({ status: 200, description: 'Webhook processed successfully' })
  @ApiResponse({ status: 404, description: 'Workflow not found' })
  async handlePaddleWebhook(
    @Param('workflowId') workflowId: string,
    @Body() payload: PaddleWebhookPayload
  ) {
    this.logger.log(`Received Paddle webhook for workflow ${workflowId}`, {
      alertName: payload.alert_name,
      alertId: payload.alert_id,
      productId: payload.product_id,
    });

    try {
      // Find the workflow
      const workflowData = await this.workflowService.getWorkflow(workflowId);
      if (!workflowData) {
        this.logger.warn(`Workflow ${workflowId} not found`);
        return { status: 'error', message: 'Workflow not found' };
      }

      // Get nodes from canvas
      const nodes = workflowData.workflow?.canvas?.nodes || [];

      // Find paddle trigger nodes in the workflow
      const paddleTriggerNodes = nodes.filter(
        node => node.type === 'CONNECTOR_TRIGGER' &&
               node.data?.connectorType === 'paddle'
      );

      if (paddleTriggerNodes.length === 0) {
        this.logger.warn(`No Paddle trigger node found in workflow ${workflowId}`);
        return { status: 'error', message: 'No Paddle trigger configured' };
      }

      // Map Paddle alert names to trigger IDs
      const eventType = this.mapAlertNameToTriggerId(payload.alert_name);

      // Find matching trigger node based on event type
      let matchingTriggerNode = null;

      for (const triggerNode of paddleTriggerNodes) {
        const triggerId = triggerNode.data?.triggerId;
        const triggerConfig = triggerNode.data?.actionParams || {};

        if (triggerId === eventType) {
          matchingTriggerNode = triggerNode;
          break;
        }

        const configuredEventType = triggerConfig.eventType;
        if (configuredEventType === eventType) {
          matchingTriggerNode = triggerNode;
          break;
        }
      }

      if (!matchingTriggerNode) {
        this.logger.debug(`No matching trigger for event type: ${eventType}`);
        return { status: 'ok', message: 'No matching trigger' };
      }

      // Prepare trigger data based on event type
      const triggerData = this.prepareTriggerData(eventType, payload);

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
      this.logger.error(`Error processing Paddle webhook for workflow ${workflowId}:`, error);
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
      webhookUrl: `${process.env.APP_URL}/api/v1/webhooks/paddle/${workflowId}`,
      status: 'ready',
      supportedEvents: [
        'subscription_created - New subscription created',
        'subscription_updated - Subscription updated',
        'subscription_cancelled - Subscription cancelled',
        'subscription_payment_succeeded - Subscription payment successful',
        'subscription_payment_failed - Subscription payment failed',
        'subscription_payment_refunded - Subscription payment refunded',
        'payment_succeeded - One-time payment successful',
        'payment_refunded - Payment refunded',
      ],
      instructions: {
        setup: 'Configure this webhook URL in your Paddle Dashboard',
        dashboardUrl: 'https://vendors.paddle.com/alerts',
        steps: [
          '1. Go to Paddle Dashboard > Developer Tools > Alerts',
          '2. Add a new Alert Destination',
          '3. Enter the webhook URL above',
          '4. Select the events you want to trigger',
          '5. Save and test the webhook',
        ],
      }
    };
  }

  @Get(':workflowId/debug')
  @ApiOperation({ summary: 'Debug webhook status' })
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
      const paddleTriggers = nodes.filter(
        node => node.type === 'CONNECTOR_TRIGGER' && node.data?.connectorType === 'paddle'
      );

      const activeTrigger = this.paddleTriggerService.getActiveTrigger(workflowId);

      return {
        workflowId,
        workflowStatus: workflow.status,
        appUrl: process.env.APP_URL,
        expectedWebhookUrl: `${process.env.APP_URL}/api/v1/webhooks/paddle/${workflowId}`,
        paddleTriggers: paddleTriggers.map(t => ({
          nodeId: t.id,
          triggerId: t.data?.triggerId,
          eventType: t.data?.actionParams?.eventType,
          hasCredentialId: !!t.data?.connectorConfigId,
          allFields: Object.keys(t.data || {})
        })),
        activeTrigger: activeTrigger ? {
          hasActiveTrigger: true,
          webhookUrl: activeTrigger.webhookUrl,
          eventType: activeTrigger.eventType,
          activatedAt: activeTrigger.activatedAt,
        } : {
          hasActiveTrigger: false,
          reason: 'No active trigger found - workflow may not be activated'
        },
        troubleshooting: {
          step1: 'Check if workflow status is "active"',
          step2: 'Verify webhook is configured in Paddle Dashboard',
          step3: 'Check if the alert destination URL matches the expected webhook URL',
          step4: 'Use Paddle\'s webhook simulator to test',
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
   * Map Paddle alert names to trigger IDs
   */
  private mapAlertNameToTriggerId(alertName: string): string {
    const alertMapping: Record<string, string> = {
      'subscription_created': 'subscription_created',
      'subscription_updated': 'subscription_updated',
      'subscription_cancelled': 'subscription_cancelled',
      'subscription_payment_succeeded': 'payment_succeeded',
      'subscription_payment_failed': 'payment_failed',
      'subscription_payment_refunded': 'payment_refunded',
      'payment_succeeded': 'payment_succeeded',
      'payment_refunded': 'payment_refunded',
      'locker_processed': 'subscription_created',
      'new_audience_member': 'subscription_created',
    };

    return alertMapping[alertName] || alertName;
  }

  /**
   * Prepare trigger data based on event type
   */
  private prepareTriggerData(eventType: string, payload: PaddleWebhookPayload): any {
    const baseData = {
      paddleEvent: {
        type: eventType,
        alertName: payload.alert_name,
        alertId: payload.alert_id,
        timestamp: payload.event_time || new Date().toISOString(),
      }
    };

    switch (eventType) {
      case 'subscription_created':
      case 'subscription_updated':
        return {
          ...baseData,
          paddleEvent: {
            ...baseData.paddleEvent,
            subscription: {
              subscriptionId: payload.subscription_id,
              subscriptionPlanId: payload.subscription_plan_id,
              userId: payload.user_id,
              email: payload.email,
              productId: payload.product_id,
              productName: payload.product_name,
              status: payload.status,
              nextBillDate: payload.next_bill_date,
              updateUrl: payload.update_url,
              cancelUrl: payload.cancel_url,
              checkoutId: payload.checkout_id,
              quantity: payload.quantity,
              marketingConsent: payload.marketing_consent,
              passthrough: payload.passthrough,
            }
          }
        };

      case 'subscription_cancelled':
        return {
          ...baseData,
          paddleEvent: {
            ...baseData.paddleEvent,
            subscription: {
              subscriptionId: payload.subscription_id,
              subscriptionPlanId: payload.subscription_plan_id,
              userId: payload.user_id,
              email: payload.email,
              productId: payload.product_id,
              productName: payload.product_name,
              status: 'deleted',
              cancellationEffectiveDate: payload.event_time,
              pausedAt: payload.paused_at,
              pausedFrom: payload.paused_from,
            }
          }
        };

      case 'payment_succeeded':
        return {
          ...baseData,
          paddleEvent: {
            ...baseData.paddleEvent,
            payment: {
              paymentId: payload.subscription_payment_id || payload.order_id,
              subscriptionId: payload.subscription_id,
              subscriptionPlanId: payload.subscription_plan_id,
              orderId: payload.order_id,
              checkoutId: payload.checkout_id,
              userId: payload.user_id,
              email: payload.email,
              productId: payload.product_id,
              productName: payload.product_name,
              amount: payload.sale_gross,
              currency: payload.currency,
              earnings: payload.earnings,
              fee: payload.fee,
              tax: payload.payment_tax,
              paymentMethod: payload.payment_method,
              receiptUrl: payload.receipt_url,
              country: payload.country,
              coupon: payload.coupon,
            }
          }
        };

      case 'payment_failed':
        return {
          ...baseData,
          paddleEvent: {
            ...baseData.paddleEvent,
            payment: {
              paymentId: payload.subscription_payment_id,
              subscriptionId: payload.subscription_id,
              subscriptionPlanId: payload.subscription_plan_id,
              userId: payload.user_id,
              email: payload.email,
              amount: payload.amount,
              currency: payload.currency,
              attemptNumber: payload.attempt_number,
              nextRetryDate: payload.next_retry_date,
              status: 'failed',
            }
          }
        };

      case 'payment_refunded':
        return {
          ...baseData,
          paddleEvent: {
            ...baseData.paddleEvent,
            refund: {
              refundId: payload.alert_id,
              orderId: payload.order_id,
              subscriptionId: payload.subscription_id,
              subscriptionPaymentId: payload.subscription_payment_id,
              userId: payload.user_id,
              email: payload.email,
              amount: payload.amount,
              currency: payload.currency,
              refundType: payload.refund_type,
              refundReason: payload.refund_reason,
              grossRefund: payload.balance_gross,
              feeRefund: payload.balance_fee,
              taxRefund: payload.balance_tax,
            }
          }
        };

      default:
        return {
          ...baseData,
          paddleEvent: {
            ...baseData.paddleEvent,
            rawPayload: payload,
          }
        };
    }
  }
}
