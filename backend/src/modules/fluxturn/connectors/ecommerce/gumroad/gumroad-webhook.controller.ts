import { Controller, Post, Get, Param, Body, Query, Headers, HttpStatus, Logger, Inject, forwardRef } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { WorkflowService } from '../../../workflow/workflow.service';
import { GumroadTriggerService } from './gumroad-trigger.service';

interface GumroadWebhookPayload {
  seller_id: string;
  product_id: string;
  product_name: string;
  permalink: string;
  product_permalink: string;
  email: string;
  price: number;
  gumroad_fee: number;
  currency: string;
  quantity: number;
  discover_fee_charged: boolean;
  can_contact: boolean;
  referrer: string;
  card?: {
    visual: string;
    type: string;
    bin: string;
    expiry_month: string;
    expiry_year: string;
  };
  order_number: number;
  sale_id: string;
  sale_timestamp: string;
  purchaser_id: string;
  subscription_id?: string;
  license_key?: string;
  ip_country: string;
  recurrence?: string;
  is_gift_receiver_purchase?: boolean;
  refunded?: boolean;
  disputed?: boolean;
  dispute_won?: boolean;
  chargebacked?: boolean;
  test?: boolean;
  variants?: string;
  affiliate?: any;
  affiliate_credit_amount_cents?: number;
  // Cancellation specific fields
  cancelled_at?: string;
  ended_at?: string;
  // Subscription specific fields
  user_email?: string;
  charge_occurrence_count?: number;
  // Resource name to identify event type
  resource_name?: string;
}

@ApiTags('Gumroad Webhook')
@Controller('webhooks/gumroad')
export class GumroadWebhookController {
  private readonly logger = new Logger(GumroadWebhookController.name);

  constructor(
    @Inject(forwardRef(() => WorkflowService))
    private readonly workflowService: WorkflowService,
    private readonly gumroadTriggerService: GumroadTriggerService
  ) {}

  @Post(':workflowId')
  @ApiOperation({ summary: 'Handle Gumroad webhook events' })
  @ApiResponse({ status: 200, description: 'Webhook processed successfully' })
  @ApiResponse({ status: 404, description: 'Workflow not found' })
  async handleGumroadWebhook(
    @Param('workflowId') workflowId: string,
    @Body() payload: GumroadWebhookPayload
  ) {
    this.logger.log(`Received Gumroad webhook for workflow ${workflowId}`, {
      saleId: payload.sale_id,
      productId: payload.product_id,
      resourceName: payload.resource_name,
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

      // Find gumroad trigger nodes in the workflow
      const gumroadTriggerNodes = nodes.filter(
        node => node.type === 'CONNECTOR_TRIGGER' &&
               node.data?.connectorType === 'gumroad'
      );

      if (gumroadTriggerNodes.length === 0) {
        this.logger.warn(`No Gumroad trigger node found in workflow ${workflowId}`);
        return { status: 'error', message: 'No Gumroad trigger configured' };
      }

      // Determine event type from payload or resource_name
      const eventType = this.determineEventType(payload);

      // Find matching trigger node based on event type
      let matchingTriggerNode = null;

      for (const triggerNode of gumroadTriggerNodes) {
        const triggerId = triggerNode.data?.triggerId;
        const triggerConfig = triggerNode.data?.actionParams || {};

        // Match trigger based on event type
        if (triggerId === eventType) {
          matchingTriggerNode = triggerNode;
          break;
        }

        // Fallback: match by resource_name if configured
        const configuredResourceName = triggerConfig.resourceName;
        if (configuredResourceName === eventType) {
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
      this.logger.error(`Error processing Gumroad webhook for workflow ${workflowId}:`, error);
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
      webhookUrl: `${process.env.APP_URL}/api/v1/webhooks/gumroad/${workflowId}`,
      status: 'ready',
      supportedEvents: [
        'sale - New sale event',
        'refund - Sale refunded event',
        'dispute - Dispute raised event',
        'dispute_won - Dispute won event',
        'cancellation - Subscription cancelled event',
      ],
      instructions: {
        setup: 'This webhook URL is automatically registered when you activate a workflow with a Gumroad trigger',
        manualSetup: 'To manually register a webhook, use the Gumroad API to create a resource subscription',
        apiEndpoint: 'PUT https://api.gumroad.com/v2/resource_subscriptions',
        requiredParams: {
          access_token: 'Your Gumroad access token',
          post_url: `${process.env.APP_URL}/api/v1/webhooks/gumroad/${workflowId}`,
          resource_name: 'sale | refund | dispute | dispute_won | cancellation',
        },
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
      const gumroadTriggers = nodes.filter(
        node => node.type === 'CONNECTOR_TRIGGER' && node.data?.connectorType === 'gumroad'
      );

      // Get active trigger info
      const activeTrigger = this.gumroadTriggerService.getActiveTrigger(workflowId);

      return {
        workflowId,
        workflowStatus: workflow.status,
        appUrl: process.env.APP_URL,
        expectedWebhookUrl: `${process.env.APP_URL}/api/v1/webhooks/gumroad/${workflowId}`,
        gumroadTriggers: gumroadTriggers.map(t => ({
          nodeId: t.id,
          triggerId: t.data?.triggerId,
          resourceName: t.data?.actionParams?.resourceName,
          hasCredentialId: !!t.data?.connectorConfigId,
          credentialIdPreview: t.data?.connectorConfigId ? `${t.data.connectorConfigId.substring(0, 20)}...` : 'none',
          hasAccessTokenDirect: !!(t.data?.accessToken || t.data?.actionParams?.accessToken),
          allFields: Object.keys(t.data || {})
        })),
        activeTrigger: activeTrigger ? {
          hasActiveTrigger: true,
          webhookUrl: activeTrigger.webhookUrl,
          resourceName: activeTrigger.resourceName,
          activatedAt: activeTrigger.activatedAt,
          resourceSubscriptionId: activeTrigger.resourceSubscriptionId,
        } : {
          hasActiveTrigger: false,
          reason: 'No active trigger found - workflow may not be activated'
        },
        troubleshooting: {
          step1: 'Check if workflow status is "active"',
          step2: 'Check if access token is valid',
          step3: 'Check if resource subscription is created in Gumroad',
          step4: 'Make a test sale/refund and check backend logs',
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
   * Determine event type from webhook payload
   */
  private determineEventType(payload: GumroadWebhookPayload): string {
    // Check if resource_name is provided (preferred method)
    if (payload.resource_name) {
      return payload.resource_name;
    }

    // Fallback: infer from payload properties
    if (payload.refunded) {
      return 'refund';
    }

    if (payload.disputed && !payload.dispute_won) {
      return 'dispute';
    }

    if (payload.dispute_won) {
      return 'dispute_won';
    }

    if (payload.cancelled_at || payload.ended_at) {
      return 'cancellation';
    }

    // Default to sale
    return 'sale';
  }

  /**
   * Prepare trigger data based on event type
   */
  private prepareTriggerData(eventType: string, payload: GumroadWebhookPayload): any {
    const baseData = {
      gumroadEvent: {
        type: eventType,
        timestamp: new Date().toISOString(),
      }
    };

    switch (eventType) {
      case 'sale':
        return {
          ...baseData,
          gumroadEvent: {
            ...baseData.gumroadEvent,
            sale: {
              id: payload.sale_id,
              email: payload.email,
              sellerId: payload.seller_id,
              productId: payload.product_id,
              productName: payload.product_name,
              permalink: payload.permalink,
              productPermalink: payload.product_permalink,
              price: payload.price,
              gumroadFee: payload.gumroad_fee,
              currency: payload.currency,
              quantity: payload.quantity,
              orderNumber: payload.order_number,
              saleTimestamp: payload.sale_timestamp,
              purchaserId: payload.purchaser_id,
              subscriptionId: payload.subscription_id,
              licenseKey: payload.license_key,
              ipCountry: payload.ip_country,
              recurrence: payload.recurrence,
              test: payload.test,
              card: payload.card,
              variants: payload.variants,
              canContact: payload.can_contact,
              referrer: payload.referrer,
            }
          }
        };

      case 'refund':
        return {
          ...baseData,
          gumroadEvent: {
            ...baseData.gumroadEvent,
            refund: {
              id: payload.sale_id,
              saleId: payload.sale_id,
              email: payload.email,
              productId: payload.product_id,
              productName: payload.product_name,
              price: payload.price,
              currency: payload.currency,
              orderNumber: payload.order_number,
              refundedAt: payload.sale_timestamp,
            }
          }
        };

      case 'dispute':
        return {
          ...baseData,
          gumroadEvent: {
            ...baseData.gumroadEvent,
            dispute: {
              id: payload.sale_id,
              saleId: payload.sale_id,
              email: payload.email,
              productId: payload.product_id,
              productName: payload.product_name,
              price: payload.price,
              currency: payload.currency,
              orderNumber: payload.order_number,
              disputedAt: payload.sale_timestamp,
            }
          }
        };

      case 'dispute_won':
        return {
          ...baseData,
          gumroadEvent: {
            ...baseData.gumroadEvent,
            dispute: {
              id: payload.sale_id,
              saleId: payload.sale_id,
              email: payload.email,
              productId: payload.product_id,
              productName: payload.product_name,
              price: payload.price,
              currency: payload.currency,
              orderNumber: payload.order_number,
              resolvedAt: payload.sale_timestamp,
              won: true,
            }
          }
        };

      case 'cancellation':
        return {
          ...baseData,
          gumroadEvent: {
            ...baseData.gumroadEvent,
            subscription: {
              id: payload.subscription_id,
              productId: payload.product_id,
              productName: payload.product_name,
              userEmail: payload.user_email || payload.email,
              cancelledAt: payload.cancelled_at || payload.ended_at,
              endedAt: payload.ended_at,
              licenseKey: payload.license_key,
              chargeOccurrenceCount: payload.charge_occurrence_count,
            }
          }
        };

      default:
        // Generic event data
        return {
          ...baseData,
          gumroadEvent: {
            ...baseData.gumroadEvent,
            rawPayload: payload,
          }
        };
    }
  }
}
