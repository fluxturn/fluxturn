import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  HttpCode,
  HttpStatus,
  NotFoundException,
  BadRequestException,
  Logger,
  Headers,
  Inject,
  forwardRef,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiParam, ApiQuery } from '@nestjs/swagger';
import { WorkflowService } from '../../../workflow/workflow.service';
import { InstagramTriggerService } from './instagram-trigger.service';

/**
 * Instagram Webhook Controller
 * Handles Instagram webhook verification and event reception via Facebook Graph API
 *
 * Instagram webhook flow (same as Facebook):
 * 1. Verification (GET): Facebook sends hub.mode, hub.challenge, hub.verify_token
 * 2. Event Reception (POST): Facebook sends Instagram events (comments, mentions, media)
 */
@ApiTags('webhooks')
@Controller('webhooks/instagram')
export class InstagramWebhookController {
  private readonly logger = new Logger(InstagramWebhookController.name);

  constructor(
    @Inject(forwardRef(() => WorkflowService))
    private readonly workflowService: WorkflowService,
    private readonly instagramTriggerService: InstagramTriggerService
  ) {}

  /**
   * GET /webhooks/instagram/:workflowId
   * Instagram webhook verification endpoint
   *
   * Facebook/Instagram will call this with:
   * - hub.mode: "subscribe"
   * - hub.challenge: random string to echo back
   * - hub.verify_token: token to verify authenticity
   */
  @Get(':workflowId')
  @ApiOperation({
    summary: 'Instagram webhook verification',
    description: 'Endpoint for Instagram/Facebook to verify webhook subscription'
  })
  @ApiParam({ name: 'workflowId', description: 'The workflow ID with Instagram trigger' })
  @ApiQuery({ name: 'hub.mode', required: true })
  @ApiQuery({ name: 'hub.challenge', required: true })
  @ApiQuery({ name: 'hub.verify_token', required: true })
  @ApiResponse({
    status: 200,
    description: 'Returns challenge for successful verification',
    type: String
  })
  @ApiResponse({ status: 403, description: 'Verification failed' })
  async verifyWebhook(
    @Param('workflowId') workflowId: string,
    @Query('hub.mode') mode: string,
    @Query('hub.challenge') challenge: string,
    @Query('hub.verify_token') verifyToken: string,
  ): Promise<string> {
    this.logger.log(`Instagram webhook verification for workflow: ${workflowId}`);
    this.logger.log(`Mode: ${mode}, Challenge: ${challenge?.substring(0, 20)}...`);

    // Verify the workflow exists and has an Instagram trigger
    const workflow = await this.workflowService.getWorkflow(workflowId);
    if (!workflow) {
      throw new NotFoundException('Workflow not found');
    }

    // Get canvas from either workflow.canvas or workflow.workflow.canvas
    const canvas = workflow.workflow?.canvas || workflow.canvas;

    // Check if workflow has an Instagram trigger node
    const instagramTrigger = canvas?.nodes?.find(
      (node: any) =>
        node.type === 'CONNECTOR_TRIGGER' &&
        node.data?.connectorType === 'instagram'
    );

    if (!instagramTrigger) {
      this.logger.error('No Instagram trigger found in workflow');
      throw new BadRequestException('This workflow does not have an Instagram trigger');
    }

    // Try to validate using the active trigger first
    let isValid = this.instagramTriggerService.validateVerifyToken(
      workflowId,
      verifyToken
    );

    // If not valid, check if there's a verify token stored in the trigger node data
    if (!isValid && instagramTrigger.data?.verifyToken) {
      this.logger.log('Using verify token from node configuration');
      isValid = verifyToken === instagramTrigger.data.verifyToken;
    }

    // If still not valid (workflow not active yet), generate a deterministic token
    if (!isValid && mode === 'subscribe') {
      this.logger.log('Using deterministic fallback verification');
      const crypto = require('crypto');
      const defaultToken = crypto
        .createHash('sha256')
        .update(`fluxturn_instagram_${workflowId}`)
        .digest('hex')
        .substring(0, 32);

      isValid = verifyToken === defaultToken;
      this.logger.debug(`Fallback verification: ${isValid}`);
    }

    if (mode === 'subscribe' && isValid) {
      this.logger.log(`Webhook verification successful for workflow: ${workflowId}`);
      return challenge;
    }

    this.logger.error(`Webhook verification failed for workflow: ${workflowId}`);
    throw new BadRequestException('Verification token mismatch');
  }

  /**
   * POST /webhooks/instagram/:workflowId
   * Instagram webhook event receiver
   *
   * Receives events from Instagram via Facebook:
   * - New comments
   * - Mentions
   * - New media published
   */
  @Post(':workflowId')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Receive Instagram webhook events',
    description: 'Endpoint that receives events from Instagram (comments, mentions, media)'
  })
  @ApiParam({ name: 'workflowId', description: 'The workflow ID to trigger' })
  @ApiResponse({
    status: 200,
    description: 'Event received and workflow triggered',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean' },
        message: { type: 'string' },
        executionId: { type: 'string' }
      }
    }
  })
  async receiveWebhook(
    @Param('workflowId') workflowId: string,
    @Body() payload: InstagramWebhookPayload,
    @Headers('x-hub-signature-256') signature: string,
  ) {
    this.logger.log(`Instagram webhook event received for workflow: ${workflowId}`);
    this.logger.debug(`Payload: ${JSON.stringify(payload, null, 2)}`);

    try {
      // Validate the workflow exists
      const workflow = await this.workflowService.getWorkflow(workflowId);
      if (!workflow) {
        throw new NotFoundException('Workflow not found');
      }

      // Get canvas from either workflow.canvas or workflow.workflow.canvas
      const canvas = workflow.workflow?.canvas || workflow.canvas;

      // Find the Instagram trigger node
      const instagramTrigger = canvas?.nodes?.find(
        (node: any) =>
          node.type === 'CONNECTOR_TRIGGER' &&
          node.data?.connectorType === 'instagram'
      );

      if (!instagramTrigger) {
        throw new BadRequestException('This workflow does not have an Instagram trigger');
      }

      // Verify webhook signature (optional)
      if (signature) {
        try {
          const isValid = this.instagramTriggerService.validateSignature(
            JSON.stringify(payload),
            signature,
            workflowId
          );
          if (!isValid) {
            this.logger.warn('Invalid webhook signature - proceeding anyway');
          }
        } catch (error) {
          this.logger.warn('Could not validate signature - proceeding anyway');
        }
      }

      // Check if this is an Instagram subscription
      if (payload.object !== 'instagram') {
        this.logger.warn(`Received unsupported event: ${payload.object}`);
        return { success: true, message: `Event ignored (unsupported object type: ${payload.object})` };
      }

      // Process each entry
      const executionPromises = payload.entry.map(async (entry) => {
        const results = [];

        if (entry.changes && entry.changes.length > 0) {
          for (const change of entry.changes) {
            const shouldTrigger = this.shouldTriggerWorkflow(instagramTrigger, change);

            if (shouldTrigger) {
              // Use trigger service to process and normalize the event
              const eventData = this.instagramTriggerService.processWebhookEvent(
                workflowId,
                { entry: [{ ...entry, changes: [change] }] }
              );

              // Prepare full event data for workflow
              const preparedEventData = eventData || this.prepareEventData(entry, change);

              this.logger.log(`Triggering workflow for Instagram ${change.field} event`);

              // Execute the workflow with the event data
              const result = await this.workflowService.executeWorkflow({
                workflow_id: workflowId,
                input_data: {
                  instagramEvent: preparedEventData,
                  triggeredAt: new Date().toISOString(),
                  trigger: 'instagram_webhook'
                },
              });

              results.push(result);
            }
          }
        }

        return results.length > 0 ? results : null;
      });

      const results = await Promise.all(executionPromises);
      const executedResults = results.filter(r => r !== null).flat();

      if (executedResults.length > 0) {
        return {
          success: true,
          message: `Processed ${executedResults.length} event(s)`,
          executionIds: executedResults.map(r => r.id)
        };
      } else {
        return {
          success: true,
          message: 'Event received but did not match trigger conditions'
        };
      }

    } catch (error) {
      this.logger.error(`Failed to process Instagram webhook:`, error);

      if (error instanceof NotFoundException || error instanceof BadRequestException) {
        throw error;
      }

      // Return 200 to Facebook even on errors (to avoid retries)
      return {
        success: false,
        message: `Error: ${error.message}`
      };
    }
  }

  /**
   * Check if this event should trigger the workflow
   */
  private shouldTriggerWorkflow(triggerNode: any, change: InstagramWebhookChange): boolean {
    const config = triggerNode.data || {};
    const triggerId = config.triggerId;

    // If no specific trigger configured, trigger on all
    if (!triggerId) {
      return true;
    }

    // Map change.field to trigger IDs
    const fieldToTriggerId: Record<string, string> = {
      'comments': 'new_comment',
      'mentions': 'new_mention',
      'media': 'new_media'
    };

    const expectedTriggerId = fieldToTriggerId[change.field];

    return triggerId === expectedTriggerId;
  }

  /**
   * Prepare event data in a structured format for the workflow
   */
  private prepareEventData(entry: InstagramWebhookEntry, change: InstagramWebhookChange): any {
    const baseData = {
      instagramAccountId: entry.id,
      time: new Date(entry.time * 1000).toISOString(),
      eventType: change.field,
      value: change.value
    };

    switch (change.field) {
      case 'comments':
        return {
          ...baseData,
          event: 'new_comment',
          comment: {
            id: change.value.id,
            text: change.value.text,
            mediaId: change.value.media?.id || change.value.media_id,
            from: {
              id: change.value.from?.id,
              username: change.value.from?.username
            },
            timestamp: change.value.timestamp || baseData.time
          }
        };

      case 'mentions':
        return {
          ...baseData,
          event: 'new_mention',
          mention: {
            id: change.value.id,
            text: change.value.text,
            mediaId: change.value.media_id,
            commentId: change.value.comment_id,
            from: {
              id: change.value.from?.id,
              username: change.value.from?.username
            },
            timestamp: change.value.timestamp || baseData.time
          }
        };

      case 'media':
        return {
          ...baseData,
          event: 'new_media',
          media: {
            id: change.value.id || change.value.media_id,
            mediaType: change.value.media_type,
            mediaUrl: change.value.media_url,
            caption: change.value.caption,
            permalink: change.value.permalink,
            timestamp: change.value.timestamp || baseData.time
          }
        };

      default:
        return {
          ...baseData,
          event: change.field,
          data: change.value
        };
    }
  }
}

// Type definitions for Instagram webhook payload
interface InstagramWebhookPayload {
  object: 'instagram';
  entry: InstagramWebhookEntry[];
}

interface InstagramWebhookEntry {
  id: string; // Instagram Account ID
  time: number; // Unix timestamp
  changes?: InstagramWebhookChange[];
}

interface InstagramWebhookChange {
  field: 'comments' | 'mentions' | 'media' | string;
  value: any;
}
