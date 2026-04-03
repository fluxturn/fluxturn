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
import { ActiveCampaignTriggerService } from './activecampaign-trigger.service';

interface ActiveCampaignWebhookPayload {
  type?: string;
  date_time?: string;
  initiated_by?: string;
  initiated_from?: string;
  list?: string;
  contact?: {
    id?: string;
    email?: string;
    first_name?: string;
    last_name?: string;
    phone?: string;
    tags?: string;
    ip?: string;
    fields?: Record<string, any>;
  };
  deal?: {
    id?: string;
    title?: string;
    value?: string;
    currency?: string;
    stage?: string;
    owner?: string;
    contact?: string;
  };
  campaign?: {
    id?: string;
    name?: string;
    type?: string;
  };
  [key: string]: any;
}

@ApiTags('ActiveCampaign Webhook')
@Controller('webhooks/activecampaign')
export class ActiveCampaignWebhookController {
  private readonly logger = new Logger(ActiveCampaignWebhookController.name);

  constructor(
    @Inject(forwardRef(() => WorkflowService))
    private readonly workflowService: WorkflowService,
    private readonly activecampaignTriggerService: ActiveCampaignTriggerService
  ) {}

  @Post(':workflowId')
  @HttpCode(200)
  @ApiOperation({ summary: 'Handle ActiveCampaign webhook' })
  @ApiParam({ name: 'workflowId', description: 'Workflow ID' })
  async handleWebhook(
    @Param('workflowId') workflowId: string,
    @Body() payload: ActiveCampaignWebhookPayload
  ) {
    this.logger.log(`Received ActiveCampaign webhook for workflow ${workflowId}`);
    this.logger.debug(`Event type: ${payload.type}`);

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
                      node.data?.connectorType === 'activecampaign'
      );

      if (triggerNodes.length === 0) {
        this.logger.warn(`No ActiveCampaign trigger node found in workflow ${workflowId}`);
        return { success: false, message: 'No ActiveCampaign trigger configured' };
      }

      // Check if event matches trigger
      const matchingTrigger = triggerNodes.find((node: any) => {
        const triggerId = node.data?.triggerId || node.data?.actionParams?.triggerId;
        return this.eventMatchesTrigger(payload.type || '', triggerId);
      });

      if (!matchingTrigger) {
        this.logger.debug(`Event ${payload.type} does not match any configured trigger`);
        return { success: true, message: 'Event does not match trigger' };
      }

      // Prepare trigger data
      const triggerData = {
        activecampaignEvent: {
          type: payload.type,
          dateTime: payload.date_time,
          initiatedBy: payload.initiated_by,
          initiatedFrom: payload.initiated_from,
          list: payload.list,
          contact: payload.contact ? {
            id: payload.contact.id,
            email: payload.contact.email,
            firstName: payload.contact.first_name,
            lastName: payload.contact.last_name,
            phone: payload.contact.phone,
            tags: payload.contact.tags,
            ip: payload.contact.ip,
            fields: payload.contact.fields,
          } : undefined,
          deal: payload.deal ? {
            id: payload.deal.id,
            title: payload.deal.title,
            value: payload.deal.value,
            currency: payload.deal.currency,
            stage: payload.deal.stage,
            owner: payload.deal.owner,
            contactId: payload.deal.contact,
          } : undefined,
          campaign: payload.campaign,
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

      this.logger.log(`Workflow ${workflowId} triggered successfully, execution: ${execution.id}`);

      return {
        success: true,
        message: 'Webhook processed successfully',
        executionId: execution.id,
      };

    } catch (error: any) {
      this.logger.error(`Error processing ActiveCampaign webhook:`, error);

      return {
        success: false,
        message: 'Failed to process webhook',
        error: error.message,
      };
    }
  }

  private eventMatchesTrigger(eventType: string, triggerId: string): boolean {
    const triggerEventMap: Record<string, string[]> = {
      'contact_added': ['subscribe', 'contact_add'],
      'contact_updated': ['update', 'contact_update'],
      'contact_unsubscribed': ['unsubscribe'],
      'deal_created': ['deal_add'],
      'deal_updated': ['deal_update'],
      'deal_stage_changed': ['deal_update', 'deal_stage_update'],
      'campaign_sent': ['sent'],
      'email_opened': ['open'],
      'email_clicked': ['click'],
      'email_bounced': ['bounce'],
    };

    const expectedEvents = triggerEventMap[triggerId] || [];
    return expectedEvents.includes(eventType);
  }
}
