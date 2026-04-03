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
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiParam } from '@nestjs/swagger';
import { Request } from 'express';
import { WorkflowService } from '../../../workflow/workflow.service';
import { QuickBooksTriggerService } from './quickbooks-trigger.service';

interface QuickBooksWebhookPayload {
  eventNotifications: Array<{
    realmId: string;
    dataChangeEvent: {
      entities: Array<{
        name: string; // Invoice, Payment, Customer, etc.
        id: string;
        operation: string; // Create, Update, Delete, Merge, Void
        lastUpdated: string;
      }>;
    };
  }>;
}

@ApiTags('QuickBooks Webhook')
@Controller('webhooks/quickbooks')
export class QuickBooksWebhookController {
  private readonly logger = new Logger(QuickBooksWebhookController.name);

  constructor(
    @Inject(forwardRef(() => WorkflowService))
    private readonly workflowService: WorkflowService,
    private readonly quickbooksTriggerService: QuickBooksTriggerService
  ) {}

  @Post(':workflowId')
  @HttpCode(200)
  @ApiOperation({ summary: 'Handle QuickBooks webhook' })
  @ApiParam({ name: 'workflowId', description: 'Workflow ID' })
  async handleWebhook(
    @Param('workflowId') workflowId: string,
    @Body() payload: QuickBooksWebhookPayload,
    @Headers('intuit-signature') signature: string,
    @Req() req: RawBodyRequest<Request>
  ) {
    this.logger.log(`Received QuickBooks webhook for workflow ${workflowId}`);

    try {
      // Get workflow data
      const workflowData = await this.workflowService.getWorkflow(workflowId);

      if (!workflowData) {
        this.logger.warn(`Workflow ${workflowId} not found`);
        return { success: false, message: 'Workflow not found' };
      }

      // Verify signature if verifier token is configured
      const verifierToken = await this.quickbooksTriggerService.getVerifierToken(workflowId);
      if (verifierToken && signature) {
        const rawBody = req.rawBody?.toString() || JSON.stringify(payload);
        const isValid = this.quickbooksTriggerService.verifySignature(rawBody, signature, verifierToken);
        if (!isValid) {
          this.logger.warn(`Invalid signature for workflow ${workflowId}`);
          throw new UnauthorizedException('Invalid webhook signature');
        }
      }

      // Find matching trigger node
      const canvas = workflowData.canvas;
      const nodes = canvas?.nodes || [];

      const triggerNodes = nodes.filter(
        (node: any) => node.type === 'CONNECTOR_TRIGGER' &&
                      node.data?.connectorType === 'quickbooks'
      );

      if (triggerNodes.length === 0) {
        this.logger.warn(`No QuickBooks trigger node found in workflow ${workflowId}`);
        return { success: false, message: 'No QuickBooks trigger configured' };
      }

      // Process each notification
      const executions: string[] = [];

      for (const notification of payload.eventNotifications || []) {
        const realmId = notification.realmId;

        for (const entity of notification.dataChangeEvent?.entities || []) {
          const eventType = `${entity.name.toLowerCase()}.${entity.operation.toLowerCase()}`;

          // Check if any trigger matches this event
          const matchingTrigger = triggerNodes.find((node: any) => {
            const triggerId = node.data?.triggerId || node.data?.actionParams?.triggerId;
            return this.eventMatchesTrigger(eventType, triggerId);
          });

          if (!matchingTrigger) {
            this.logger.debug(`Event ${eventType} does not match any configured trigger`);
            continue;
          }

          // Prepare trigger data
          const triggerData = {
            quickbooksEvent: {
              eventType,
              entity: {
                name: entity.name,
                id: entity.id,
                operation: entity.operation,
                lastUpdated: entity.lastUpdated,
              },
              realmId,
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
      }

      return {
        success: true,
        message: 'Webhook processed successfully',
        executionIds: executions,
      };

    } catch (error: any) {
      this.logger.error(`Error processing QuickBooks webhook:`, error);

      if (error instanceof UnauthorizedException) {
        throw error;
      }

      return {
        success: false,
        message: 'Failed to process webhook',
        error: error.message,
      };
    }
  }

  private eventMatchesTrigger(eventType: string, triggerId: string): boolean {
    const triggerEventMap: Record<string, string[]> = {
      'invoice_created': ['invoice.create'],
      'invoice_updated': ['invoice.update'],
      'payment_created': ['payment.create'],
      'customer_created': ['customer.create'],
      'customer_updated': ['customer.update'],
      'vendor_created': ['vendor.create'],
      'vendor_updated': ['vendor.update'],
      'item_created': ['item.create'],
      'item_updated': ['item.update'],
    };

    const expectedEvents = triggerEventMap[triggerId] || [];
    return expectedEvents.includes(eventType);
  }
}
