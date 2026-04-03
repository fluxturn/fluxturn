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
import { WebflowTriggerService } from './webflow-trigger.service';

interface WebflowWebhookPayload {
  triggerType?: string;
  site?: {
    id: string;
    name: string;
    shortName: string;
  };
  payload?: {
    _id?: string;
    name?: string;
    slug?: string;
    // Form submission fields
    formId?: string;
    formName?: string;
    data?: Record<string, any>;
    submittedAt?: string;
    // Collection item fields
    collectionId?: string;
    'collection-id'?: string;
    isDraft?: boolean;
    isArchived?: boolean;
    // Page fields
    pageId?: string;
    title?: string;
    // Timestamps
    'created-on'?: string;
    'updated-on'?: string;
    'published-on'?: string;
    [key: string]: any;
  };
  [key: string]: any;
}

@ApiTags('Webflow Webhook')
@Controller('webhooks/webflow')
export class WebflowWebhookController {
  private readonly logger = new Logger(WebflowWebhookController.name);

  constructor(
    @Inject(forwardRef(() => WorkflowService))
    private readonly workflowService: WorkflowService,
    private readonly webflowTriggerService: WebflowTriggerService
  ) {}

  @Post(':workflowId')
  @HttpCode(200)
  @ApiOperation({ summary: 'Handle Webflow webhook' })
  @ApiParam({ name: 'workflowId', description: 'Workflow ID' })
  async handleWebhook(
    @Param('workflowId') workflowId: string,
    @Body() payload: WebflowWebhookPayload
  ) {
    this.logger.log(`Received Webflow webhook for workflow ${workflowId}`);
    this.logger.debug(`Trigger type: ${payload.triggerType}`);

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
                      node.data?.connectorType === 'webflow'
      );

      if (triggerNodes.length === 0) {
        this.logger.warn(`No Webflow trigger node found in workflow ${workflowId}`);
        return { success: false, message: 'No Webflow trigger configured' };
      }

      // Check if event matches trigger
      const matchingTrigger = triggerNodes.find((node: any) => {
        const triggerId = node.data?.triggerId || node.data?.actionParams?.triggerId;
        return this.eventMatchesTrigger(payload.triggerType || '', triggerId);
      });

      if (!matchingTrigger) {
        this.logger.debug(`Trigger type ${payload.triggerType} does not match any configured trigger`);
        return { success: true, message: 'Event does not match trigger' };
      }

      // Prepare trigger data based on trigger type
      const triggerData = {
        webflowEvent: {
          triggerType: payload.triggerType,
          site: payload.site,
          timestamp: new Date().toISOString(),
          ...(payload.triggerType === 'form_submission' && {
            formSubmission: {
              formId: payload.payload?.formId,
              formName: payload.payload?.formName,
              data: payload.payload?.data,
              submittedAt: payload.payload?.submittedAt,
            }
          }),
          ...(payload.triggerType?.includes('collection_item') && {
            collectionItem: {
              itemId: payload.payload?._id,
              collectionId: payload.payload?.collectionId || payload.payload?.['collection-id'],
              name: payload.payload?.name,
              slug: payload.payload?.slug,
              isDraft: payload.payload?.isDraft,
              isArchived: payload.payload?.isArchived,
              createdOn: payload.payload?.['created-on'],
              updatedOn: payload.payload?.['updated-on'],
              publishedOn: payload.payload?.['published-on'],
              data: payload.payload,
            }
          }),
          ...(payload.triggerType === 'site_publish' && {
            publish: {
              publishedAt: new Date().toISOString(),
            }
          }),
          ...(payload.triggerType?.includes('page') && {
            page: {
              pageId: payload.payload?.pageId || payload.payload?._id,
              title: payload.payload?.title,
              slug: payload.payload?.slug,
            }
          }),
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
      this.logger.error(`Error processing Webflow webhook:`, error);

      return {
        success: false,
        message: 'Failed to process webhook',
        error: error.message,
      };
    }
  }

  private eventMatchesTrigger(triggerType: string, triggerId: string): boolean {
    const triggerEventMap: Record<string, string[]> = {
      'form_submission': ['form_submission'],
      'item_created': ['collection_item_created'],
      'item_updated': ['collection_item_changed', 'collection_item_updated'],
      'item_deleted': ['collection_item_deleted', 'collection_item_unpublished'],
      'site_published': ['site_publish'],
      'page_created': ['page_created'],
      'page_metadata_updated': ['page_metadata_updated'],
    };

    const expectedEvents = triggerEventMap[triggerId] || [];
    return expectedEvents.includes(triggerType);
  }
}
