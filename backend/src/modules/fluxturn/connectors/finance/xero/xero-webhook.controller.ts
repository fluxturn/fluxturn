import {
  Controller,
  Post,
  Param,
  Body,
  Headers,
  Inject,
  forwardRef,
  Logger,
  UnauthorizedException,
  HttpCode,
  RawBodyRequest,
  Req,
  Res,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiParam } from '@nestjs/swagger';
import { Request, Response } from 'express';
import { WorkflowService } from '../../../workflow/workflow.service';
import { XeroTriggerService } from './xero-trigger.service';

interface XeroWebhookPayload {
  events: Array<{
    resourceUrl: string;
    resourceId: string;
    tenantId: string;
    tenantType: string;
    eventCategory: string;
    eventType: string;
    eventDateUtc: string;
  }>;
  lastEventSequence: number;
  firstEventSequence: number;
  entropy: string;
}

@ApiTags('Xero Webhook')
@Controller('webhooks/xero')
export class XeroWebhookController {
  private readonly logger = new Logger(XeroWebhookController.name);

  constructor(
    @Inject(forwardRef(() => WorkflowService))
    private readonly workflowService: WorkflowService,
    private readonly xeroTriggerService: XeroTriggerService
  ) {}

  @Post(':workflowId')
  @HttpCode(200)
  @ApiOperation({ summary: 'Handle Xero webhook' })
  @ApiParam({ name: 'workflowId', description: 'Workflow ID' })
  async handleWebhook(
    @Param('workflowId') workflowId: string,
    @Body() payload: XeroWebhookPayload,
    @Headers('x-xero-signature') signature: string,
    @Req() req: RawBodyRequest<Request>,
    @Res() res: Response
  ) {
    this.logger.log(`Received Xero webhook for workflow ${workflowId}`);

    try {
      // Xero requires returning the exact response to verify webhook delivery
      // For intent to receive validation, return 200 with empty body
      if (!payload.events || payload.events.length === 0) {
        this.logger.debug('Xero webhook validation request');
        return res.status(200).send();
      }

      // Get workflow data
      const workflowData = await this.workflowService.getWorkflow(workflowId);

      if (!workflowData) {
        this.logger.warn(`Workflow ${workflowId} not found`);
        return res.status(200).json({ success: false, message: 'Workflow not found' });
      }

      // Verify signature
      const webhookKey = await this.xeroTriggerService.getWebhookKey(workflowId);
      if (webhookKey && signature) {
        const rawBody = req.rawBody?.toString() || JSON.stringify(payload);
        const isValid = this.xeroTriggerService.verifySignature(rawBody, signature, webhookKey);
        if (!isValid) {
          this.logger.warn(`Invalid signature for workflow ${workflowId}`);
          // Xero requires 401 for invalid signatures
          return res.status(401).send();
        }
      }

      // Find matching trigger node
      const canvas = workflowData.canvas;
      const nodes = canvas?.nodes || [];

      const triggerNodes = nodes.filter(
        (node: any) => node.type === 'CONNECTOR_TRIGGER' &&
                      node.data?.connectorType === 'xero'
      );

      if (triggerNodes.length === 0) {
        this.logger.warn(`No Xero trigger node found in workflow ${workflowId}`);
        return res.status(200).json({ success: false, message: 'No Xero trigger configured' });
      }

      // Process each event
      const executions: string[] = [];

      for (const event of payload.events) {
        const eventType = `${event.eventCategory.toLowerCase()}.${event.eventType.toLowerCase()}`;

        // Check if any trigger matches this event
        const matchingTrigger = triggerNodes.find((node: any) => {
          const triggerId = node.data?.triggerId || node.data?.actionParams?.triggerId;
          return this.eventMatchesTrigger(event.eventCategory, event.eventType, triggerId);
        });

        if (!matchingTrigger) {
          this.logger.debug(`Event ${eventType} does not match any configured trigger`);
          continue;
        }

        // Prepare trigger data
        const triggerData = {
          xeroEvent: {
            resourceUrl: event.resourceUrl,
            resourceId: event.resourceId,
            tenantId: event.tenantId,
            tenantType: event.tenantType,
            eventCategory: event.eventCategory,
            eventType: event.eventType,
            eventDateUtc: event.eventDateUtc,
            timestamp: new Date().toISOString(),
          }
        };

        // Execute workflow
        const execution = await this.workflowService.executeWorkflow({
          workflow_id: workflowId,
          input_data: triggerData,
          organization_id: workflowData.organization_id,
          project_id: workflowData.project_id,
        });

        executions.push(execution.id);
        this.logger.log(`Workflow ${workflowId} triggered for ${eventType}, execution: ${execution.id}`);
      }

      return res.status(200).json({
        success: true,
        message: 'Webhook processed successfully',
        executionIds: executions,
      });

    } catch (error: any) {
      this.logger.error(`Error processing Xero webhook:`, error);

      // Xero expects 200 for any error to prevent retries
      return res.status(200).json({
        success: false,
        message: 'Failed to process webhook',
        error: error.message,
      });
    }
  }

  private eventMatchesTrigger(eventCategory: string, eventType: string, triggerId: string): boolean {
    const triggerEventMap: Record<string, { category: string; types: string[] }> = {
      'invoice_created': { category: 'INVOICE', types: ['CREATE'] },
      'invoice_updated': { category: 'INVOICE', types: ['UPDATE'] },
      'contact_created': { category: 'CONTACT', types: ['CREATE'] },
      'contact_updated': { category: 'CONTACT', types: ['UPDATE'] },
      'payment_created': { category: 'PAYMENT', types: ['CREATE'] },
    };

    const expected = triggerEventMap[triggerId];
    if (!expected) return false;

    return expected.category === eventCategory.toUpperCase() &&
           expected.types.includes(eventType.toUpperCase());
  }
}
