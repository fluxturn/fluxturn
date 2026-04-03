import { Controller, Post, Get, Param, Body, Query, Headers, HttpStatus, Logger, Inject, forwardRef } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { WorkflowService } from '../../../workflow/workflow.service';
import { ChargebeeTriggerService } from './chargebee-trigger.service';
import * as crypto from 'crypto';

interface ChargebeeWebhookPayload {
  id: string;
  occurred_at: number;
  source: string;
  user?: string;
  object_type?: string;
  event_type: string;
  api_version: string;
  content?: {
    subscription?: any;
    customer?: any;
    invoice?: any;
    transaction?: any;
    payment_source?: any;
    card?: any;
  };
}

@ApiTags('Chargebee Webhook')
@Controller('webhooks/chargebee')
export class ChargebeeWebhookController {
  private readonly logger = new Logger(ChargebeeWebhookController.name);

  constructor(
    @Inject(forwardRef(() => WorkflowService))
    private readonly workflowService: WorkflowService,
    private readonly chargebeeTriggerService: ChargebeeTriggerService
  ) {}

  @Post(':workflowId')
  @ApiOperation({ summary: 'Handle Chargebee webhook events' })
  @ApiResponse({ status: 200, description: 'Webhook processed successfully' })
  @ApiResponse({ status: 404, description: 'Workflow not found' })
  async handleChargebeeWebhook(
    @Param('workflowId') workflowId: string,
    @Body() payload: ChargebeeWebhookPayload,
    @Headers('x-chargebee-webhook-secret') secretToken?: string
  ) {
    this.logger.log(`Received Chargebee webhook for workflow ${workflowId}`, {
      eventType: payload.event_type,
      objectType: payload.object_type,
      eventId: payload.id
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

      // Find chargebee trigger nodes in the workflow
      const chargebeeTriggerNodes = nodes.filter(
        node => node.type === 'CONNECTOR_TRIGGER' &&
               node.data?.connectorType === 'chargebee'
      );

      if (chargebeeTriggerNodes.length === 0) {
        this.logger.warn(`No Chargebee trigger node found in workflow ${workflowId}`);
        return { status: 'error', message: 'No Chargebee trigger configured' };
      }

      // Check which trigger should handle this event
      let matchingTriggerNode = null;

      for (const triggerNode of chargebeeTriggerNodes) {
        const triggerId = triggerNode.data?.triggerId;
        const triggerConfig = triggerNode.data?.actionParams || {};
        const configuredEvents = triggerConfig.events || [];

        // Check if this trigger is configured for this event type
        if (configuredEvents.includes('*') || configuredEvents.includes(payload.event_type)) {
          // Also check if triggerId matches the event type
          if (triggerId === payload.event_type || triggerId === '*') {
            matchingTriggerNode = triggerNode;
            break;
          }
        }
      }

      if (!matchingTriggerNode) {
        this.logger.debug(`No matching trigger for event type: ${payload.event_type}`);
        return { status: 'ok', message: 'No matching trigger for this event type' };
      }

      // Verify secret token using timing-safe comparison
      const expectedToken = matchingTriggerNode.data?.actionParams?.webhookToken;

      // Try to use ChargebeeTriggerService for validation (preferred method)
      const activeTrigger = this.chargebeeTriggerService.getActiveTrigger(workflowId);

      if (activeTrigger || expectedToken) {
        // Use ChargebeeTriggerService validation if available
        if (activeTrigger) {
          const isValid = this.chargebeeTriggerService.validateSecretToken(workflowId, secretToken);
          if (!isValid) {
            this.logger.warn(`Invalid webhook token for workflow ${workflowId} (via ChargebeeTriggerService)`);
            return { status: 'error', message: 'Invalid webhook token' };
          }
        }
        // Fallback to manual timing-safe comparison
        else if (expectedToken) {
          const secretBuffer = Buffer.from(expectedToken);
          const headerSecretBuffer = Buffer.from(secretToken || '');

          if (
            secretBuffer.byteLength !== headerSecretBuffer.byteLength ||
            !crypto.timingSafeEqual(secretBuffer, headerSecretBuffer)
          ) {
            this.logger.warn(`Invalid webhook token for workflow ${workflowId} (via manual validation)`);
            return { status: 'error', message: 'Invalid webhook token' };
          }
        }
      }

      // Prepare trigger data based on event type
      const triggerData = this.prepareTriggerData(payload);

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
      this.logger.error(`Error processing Chargebee webhook for workflow ${workflowId}:`, error);
      return {
        status: 'error',
        message: 'Failed to process webhook',
        error: error.message
      };
    }
  }

  /**
   * Prepare trigger data based on Chargebee event type
   */
  private prepareTriggerData(payload: ChargebeeWebhookPayload): any {
    const baseData = {
      chargebeeEvent: {
        id: payload.id,
        type: payload.event_type,
        objectType: payload.object_type,
        occurredAt: payload.occurred_at,
        timestamp: new Date(payload.occurred_at * 1000).toISOString(),
        source: payload.source,
        apiVersion: payload.api_version,
      }
    };

    const content = payload.content || {};

    // Handle different event types
    switch (payload.event_type) {
      case 'subscription_created':
      case 'subscription_cancelled':
      case 'subscription_renewed':
      case 'subscription_changed':
      case 'subscription_activated':
      case 'subscription_reactivated':
      case 'subscription_started':
      case 'subscription_deleted':
      case 'subscription_cancellation_scheduled':
      case 'subscription_scheduled_cancellation_removed':
      case 'subscription_trial_ending':
      case 'subscription_cancelling':
      case 'subscription_renewal_reminder':
      case 'subscription_shipping_address_updated':
        return {
          ...baseData,
          chargebeeEvent: {
            ...baseData.chargebeeEvent,
            subscription: content.subscription,
            customer: content.customer,
          }
        };

      case 'customer_created':
      case 'customer_changed':
      case 'customer_deleted':
        return {
          ...baseData,
          chargebeeEvent: {
            ...baseData.chargebeeEvent,
            customer: content.customer,
          }
        };

      case 'invoice_generated':
      case 'invoice_created':
      case 'invoice_updated':
      case 'invoice_deleted':
        return {
          ...baseData,
          chargebeeEvent: {
            ...baseData.chargebeeEvent,
            invoice: content.invoice,
            customer: content.customer,
          }
        };

      case 'payment_succeeded':
      case 'payment_failed':
      case 'payment_refunded':
      case 'payment_initiated':
      case 'refund_initiated':
        return {
          ...baseData,
          chargebeeEvent: {
            ...baseData.chargebeeEvent,
            transaction: content.transaction,
            invoice: content.invoice,
            customer: content.customer,
          }
        };

      case 'transaction_created':
      case 'transaction_updated':
      case 'transaction_deleted':
        return {
          ...baseData,
          chargebeeEvent: {
            ...baseData.chargebeeEvent,
            transaction: content.transaction,
            customer: content.customer,
          }
        };

      case 'card_added':
      case 'card_updated':
      case 'card_deleted':
      case 'card_expired':
      case 'card_expiring':
        return {
          ...baseData,
          chargebeeEvent: {
            ...baseData.chargebeeEvent,
            card: content.card,
            paymentSource: content.payment_source,
            customer: content.customer,
          }
        };

      default:
        // For any other event types, return all content
        return {
          ...baseData,
          chargebeeEvent: {
            ...baseData.chargebeeEvent,
            content: content,
          }
        };
    }
  }

  @Get(':workflowId/info')
  @ApiOperation({ summary: 'Get webhook info for debugging' })
  async getWebhookInfo(@Param('workflowId') workflowId: string) {
    return {
      webhookUrl: `${process.env.APP_URL}/api/v1/webhooks/chargebee/${workflowId}`,
      status: 'ready',
      instructions: {
        setup: 'Use this URL to set up your Chargebee webhook',
        dashboard: 'Go to Settings > Webhooks in your Chargebee dashboard',
        eventTypes: [
          'subscription_created',
          'subscription_cancelled',
          'subscription_renewed',
          'payment_succeeded',
          'payment_failed',
          'invoice_generated',
          'customer_created',
        ],
      }
    };
  }

  @Get('credential/:credentialId/debug')
  @ApiOperation({ summary: 'Debug credential data' })
  async debugCredential(@Param('credentialId') credentialId: string) {
    try {
      const query = `SELECT * FROM connector_configs WHERE id = $1`;
      const result = await this.workflowService['platformService'].query(query, [credentialId]);

      if (result.rows.length === 0) {
        return {
          error: 'Credential not found',
          credentialId
        };
      }

      const credential = result.rows[0];
      return {
        credentialId,
        connectorType: credential.connector_type,
        name: credential.name,
        config: credential.config,
        configKeys: credential.config ? Object.keys(credential.config) : [],
        hasAccountName: !!(credential.config?.accountName),
        hasApiKey: !!(credential.config?.apiKey),
        configStructure: JSON.stringify(credential.config, null, 2)
      };
    } catch (error) {
      return {
        error: 'Failed to fetch credential',
        message: error.message
      };
    }
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
      const chargebeeTriggers = nodes.filter(
        node => node.type === 'CONNECTOR_TRIGGER' && node.data?.connectorType === 'chargebee'
      );

      // Get active trigger info
      const activeTrigger = this.chargebeeTriggerService.getActiveTrigger(workflowId);

      // Check credentials
      let resolvedCredentials = null;

      if (chargebeeTriggers.length > 0) {
        const triggerData = chargebeeTriggers[0].data;

        // Try to extract credentials from various possible locations
        resolvedCredentials = {
          accountName: triggerData?.accountName || triggerData?.actionParams?.accountName,
          apiKey: triggerData?.apiKey || triggerData?.actionParams?.apiKey,
        };
      }

      return {
        workflowId,
        workflowStatus: workflow.status,
        appUrl: process.env.APP_URL,
        isHttps: process.env.APP_URL?.startsWith('https://'),
        expectedWebhookUrl: `${process.env.APP_URL}/api/v1/webhooks/chargebee/${workflowId}`,
        rawTriggerData: chargebeeTriggers.length > 0 ? chargebeeTriggers[0].data : null,
        chargebeeTriggers: chargebeeTriggers.map(t => ({
          nodeId: t.id,
          triggerId: t.data?.triggerId,
          hasCredentialId: !!t.data?.connectorConfigId,
          credentialIdPreview: t.data?.connectorConfigId ? `${t.data.connectorConfigId.substring(0, 20)}...` : 'none',
          hasAccountNameDirect: !!(t.data?.accountName || t.data?.actionParams?.accountName),
          hasApiKeyDirect: !!(t.data?.apiKey || t.data?.actionParams?.apiKey),
          accountNamePreview: resolvedCredentials?.accountName ? `${resolvedCredentials.accountName.substring(0, 10)}...` : 'missing',
          allFields: Object.keys(t.data || {})
        })),
        activeTrigger: activeTrigger ? {
          hasActiveTrigger: true,
          webhookUrl: activeTrigger.webhookUrl,
          webhookId: activeTrigger.webhookId,
          accountName: activeTrigger.accountName,
          activatedAt: activeTrigger.activatedAt,
          eventTypes: activeTrigger.events,
        } : {
          hasActiveTrigger: false,
          reason: 'No active trigger found - workflow may not be activated'
        },
        troubleshooting: {
          step1: 'Check if workflow status is "active"',
          step2: 'Check if APP_URL is HTTPS (Chargebee requirement)',
          step3: 'Check if account name and API key are correct',
          step4: 'Check if Chargebee webhook is registered in your dashboard',
          step5: 'Trigger a test event in Chargebee and check backend logs'
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
