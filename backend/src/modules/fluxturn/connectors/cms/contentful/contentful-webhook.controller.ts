import {
  Controller,
  Post,
  Param,
  Body,
  Headers,
  Inject,
  forwardRef,
  Logger,
  HttpCode,
  UnauthorizedException,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiParam } from '@nestjs/swagger';
import { WorkflowService } from '../../../workflow/workflow.service';
import { ContentfulTriggerService } from './contentful-trigger.service';

interface ContentfulWebhookPayload {
  sys?: {
    type?: string;
    id?: string;
    space?: {
      sys?: {
        type?: string;
        linkType?: string;
        id?: string;
      };
    };
    environment?: {
      sys?: {
        id?: string;
        type?: string;
        linkType?: string;
      };
    };
    contentType?: {
      sys?: {
        type?: string;
        linkType?: string;
        id?: string;
      };
    };
    revision?: number;
    createdAt?: string;
    updatedAt?: string;
    publishedAt?: string;
    firstPublishedAt?: string;
    publishedCounter?: number;
    version?: number;
  };
  fields?: Record<string, any>;
  metadata?: {
    tags?: any[];
  };
  [key: string]: any;
}

@ApiTags('Contentful Webhook')
@Controller('webhooks/contentful')
export class ContentfulWebhookController {
  private readonly logger = new Logger(ContentfulWebhookController.name);

  constructor(
    @Inject(forwardRef(() => WorkflowService))
    private readonly workflowService: WorkflowService,
    private readonly contentfulTriggerService: ContentfulTriggerService
  ) {}

  @Post(':workflowId')
  @HttpCode(200)
  @ApiOperation({ summary: 'Handle Contentful webhook' })
  @ApiParam({ name: 'workflowId', description: 'Workflow ID' })
  async handleWebhook(
    @Param('workflowId') workflowId: string,
    @Body() payload: ContentfulWebhookPayload,
    @Headers('x-contentful-topic') topic: string,
    @Headers('x-contentful-secret') secret: string,
    @Headers('x-contentful-webhook-name') webhookName: string
  ) {
    this.logger.log(`Received Contentful webhook for workflow ${workflowId}`);
    this.logger.debug(`Topic: ${topic}`);

    try {
      // Verify webhook secret
      if (secret) {
        const isValid = await this.contentfulTriggerService.verifyWebhookSecret(workflowId, secret);
        if (!isValid) {
          this.logger.warn(`Invalid webhook secret for workflow ${workflowId}`);
          throw new UnauthorizedException('Invalid webhook secret');
        }
      }

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
                      node.data?.connectorType === 'contentful'
      );

      if (triggerNodes.length === 0) {
        this.logger.warn(`No Contentful trigger node found in workflow ${workflowId}`);
        return { success: false, message: 'No Contentful trigger configured' };
      }

      // Check if event matches trigger
      const matchingTrigger = triggerNodes.find((node: any) => {
        const triggerId = node.data?.triggerId || node.data?.actionParams?.triggerId;
        return this.topicMatchesTrigger(topic || '', triggerId);
      });

      if (!matchingTrigger) {
        this.logger.debug(`Topic ${topic} does not match any configured trigger`);
        return { success: true, message: 'Event does not match trigger' };
      }

      // Determine event type from topic
      const eventType = this.parseEventType(topic);

      // Prepare trigger data
      const triggerData = {
        contentfulEvent: {
          topic: topic,
          eventType: eventType,
          webhookName: webhookName,
          timestamp: new Date().toISOString(),
          sys: payload.sys,
          fields: payload.fields,
          metadata: payload.metadata,
          // Extracted common fields
          entryId: payload.sys?.id,
          contentTypeId: payload.sys?.contentType?.sys?.id,
          spaceId: payload.sys?.space?.sys?.id,
          environmentId: payload.sys?.environment?.sys?.id,
          version: payload.sys?.version,
          revision: payload.sys?.revision,
          createdAt: payload.sys?.createdAt,
          updatedAt: payload.sys?.updatedAt,
          publishedAt: payload.sys?.publishedAt,
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
      if (error instanceof UnauthorizedException) {
        throw error;
      }

      this.logger.error(`Error processing Contentful webhook:`, error);

      return {
        success: false,
        message: 'Failed to process webhook',
        error: error.message,
      };
    }
  }

  private topicMatchesTrigger(topic: string, triggerId: string): boolean {
    const triggerTopicMap: Record<string, string[]> = {
      'entry_created': ['ContentManagement.Entry.create'],
      'entry_updated': ['ContentManagement.Entry.save', 'ContentManagement.Entry.auto_save'],
      'entry_published': ['ContentManagement.Entry.publish'],
      'entry_unpublished': ['ContentManagement.Entry.unpublish'],
      'entry_deleted': ['ContentManagement.Entry.delete'],
      'asset_created': ['ContentManagement.Asset.create'],
      'asset_published': ['ContentManagement.Asset.publish'],
      'asset_deleted': ['ContentManagement.Asset.delete'],
    };

    const expectedTopics = triggerTopicMap[triggerId] || [];
    return expectedTopics.includes(topic);
  }

  private parseEventType(topic: string): string {
    // Topic format: ContentManagement.Entry.publish
    if (!topic) return 'unknown';

    const parts = topic.split('.');
    if (parts.length >= 3) {
      const resourceType = parts[1].toLowerCase(); // Entry, Asset
      const action = parts[2].toLowerCase(); // create, publish, delete, etc.
      return `${resourceType}_${action}`;
    }

    return topic;
  }
}
