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
import { FacebookTriggerService } from './facebook-trigger.service';

/**
 * Facebook Webhook Controller
 * Handles Facebook Graph API webhook verification and event reception
 *
 * Facebook webhook flow:
 * 1. Verification (GET): Facebook sends hub.mode, hub.challenge, hub.verify_token
 * 2. Event Reception (POST): Facebook sends events (comments, posts, etc.)
 */
@ApiTags('webhooks')
@Controller('webhooks/facebook')
export class FacebookWebhookController {
  private readonly logger = new Logger(FacebookWebhookController.name);

  constructor(
    @Inject(forwardRef(() => WorkflowService))
    private readonly workflowService: WorkflowService,
    private readonly facebookTriggerService: FacebookTriggerService
  ) {}

  /**
   * GET /webhooks/facebook/:workflowId
   * Facebook webhook verification endpoint
   *
   * Facebook will call this with:
   * - hub.mode: "subscribe"
   * - hub.challenge: random string to echo back
   * - hub.verify_token: token to verify authenticity
   */
  @Get(':workflowId')
  @ApiOperation({
    summary: 'Facebook webhook verification',
    description: 'Endpoint for Facebook to verify webhook subscription'
  })
  @ApiParam({ name: 'workflowId', description: 'The workflow ID with Facebook trigger' })
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
    this.logger.log(`Facebook webhook verification for workflow: ${workflowId}`);
    this.logger.log(`Mode: ${mode}, Challenge: ${challenge}, Token: ${verifyToken}`);

    // Verify the workflow exists and has a Facebook trigger
    const workflow = await this.workflowService.getWorkflow(workflowId);
    if (!workflow) {
      throw new NotFoundException('Workflow not found');
    }

    // Get canvas from either workflow.canvas or workflow.workflow.canvas
    const canvas = workflow.workflow?.canvas || workflow.canvas;

    // Debug: Log workflow structure
    this.logger.debug(`Workflow canvas: ${JSON.stringify(canvas)}`);
    this.logger.debug(`Workflow nodes count: ${canvas?.nodes?.length || 0}`);
    if (canvas?.nodes) {
      canvas.nodes.forEach((node: any, index: number) => {
        this.logger.debug(`Node ${index}: type=${node.type}, connectorType=${node.data?.connectorType}`);
      });
    }

    // Check if workflow has a Facebook/Instagram trigger node
    const facebookTrigger = canvas?.nodes?.find(
      (node: any) =>
        node.type === 'CONNECTOR_TRIGGER' &&
        (node.data?.connectorType === 'facebook_graph' ||
         node.data?.connectorType === 'facebook' ||
         node.data?.triggerId?.startsWith('instagram_'))
    );

    if (!facebookTrigger) {
      this.logger.error('No Facebook trigger found in workflow');
      throw new BadRequestException('This workflow does not have a Facebook trigger');
    }

    // Try to validate using the active trigger first
    let isValid = this.facebookTriggerService.validateVerifyToken(
      workflowId,
      verifyToken
    );

    // If not valid, check if there's a verify token stored in the trigger node data
    if (!isValid && facebookTrigger.data?.verifyToken) {
      this.logger.log('Using verify token from node configuration');
      isValid = verifyToken === facebookTrigger.data.verifyToken;
      this.logger.log(`Node data verification: ${isValid}`);
    }

    // If still not valid (workflow not active yet and no stored token), generate a deterministic token
    if (!isValid && mode === 'subscribe') {
      this.logger.log('Using deterministic fallback verification');
      // Generate the same deterministic token
      const crypto = require('crypto');
      const defaultToken = crypto
        .createHash('sha256')
        .update(`fluxturn_facebook_${workflowId}`)
        .digest('hex')
        .substring(0, 32);

      isValid = verifyToken === defaultToken;
      this.logger.log(`Fallback verification: ${isValid}, expected: ${defaultToken.substring(0, 10)}..., got: ${verifyToken.substring(0, 10)}...`);
    }

    if (mode === 'subscribe' && isValid) {
      this.logger.log(`Webhook verification successful for workflow: ${workflowId}`);
      // Return the challenge to complete verification
      return challenge;
    }

    this.logger.error(`Webhook verification failed for workflow: ${workflowId}`);
    this.logger.error(`Expected token format check failed. Provided: ${verifyToken?.substring(0, 10)}...`);
    throw new BadRequestException('Verification token mismatch');
  }

  /**
   * POST /webhooks/facebook/:workflowId
   * Facebook webhook event receiver
   *
   * Receives events from Facebook:
   * - Page comments
   * - Page posts
   * - Page mentions
   * - Messages, etc.
   */
  @Post(':workflowId')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Receive Facebook webhook events',
    description: 'Endpoint that receives events from Facebook (comments, posts, etc.)'
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
    @Body() payload: FacebookWebhookPayload,
    @Headers('x-hub-signature-256') signature: string,
  ) {
    this.logger.log(`Facebook webhook event received for workflow: ${workflowId}`);
    this.logger.log(`Payload:`, JSON.stringify(payload, null, 2));

    try {
      // Validate the workflow exists
      const workflow = await this.workflowService.getWorkflow(workflowId);
      if (!workflow) {
        throw new NotFoundException('Workflow not found');
      }

      // Get canvas from either workflow.canvas or workflow.workflow.canvas
      const canvas = workflow.workflow?.canvas || workflow.canvas;

      // Find the Facebook/Instagram trigger node
      const facebookTrigger = canvas?.nodes?.find(
        (node: any) =>
          node.type === 'CONNECTOR_TRIGGER' &&
          (node.data?.connectorType === 'facebook_graph' ||
           node.data?.connectorType === 'facebook' ||
           node.data?.triggerId?.startsWith('instagram_'))
      );

      if (!facebookTrigger) {
        throw new BadRequestException('This workflow does not have a Facebook trigger');
      }

      // Verify webhook signature using FacebookTriggerService (optional)
      if (signature) {
        try {
          const isValid = this.facebookTriggerService.validateSignature(
            JSON.stringify(payload),
            signature,
            workflowId
          );
          if (!isValid) {
            this.logger.warn('Invalid webhook signature - proceeding anyway');
          }
        } catch (error) {
          this.logger.warn('Could not validate signature (app secret may not be configured) - proceeding anyway');
        }
      }

      // Check if this is a page or instagram subscription
      if (payload.object !== 'page' && payload.object !== 'instagram') {
        this.logger.warn(`Received unsupported event: ${payload.object}`);
        return { success: true, message: `Event ignored (unsupported object type: ${payload.object})` };
      }

      // Process each entry
      const executionPromises = payload.entry.map(async (entry) => {
        const results = [];

        // Process Instagram events
        if (payload.object === 'instagram') {
          if (entry.changes && entry.changes.length > 0) {
            for (const change of entry.changes) {
              const shouldTrigger = this.shouldTriggerInstagramWorkflow(facebookTrigger, change);

              if (shouldTrigger) {
                // Prepare Instagram event data for workflow
                const eventData = this.prepareInstagramEventData(entry, change);

                this.logger.log(`Triggering workflow for Instagram ${change.field} event`);

                // Execute the workflow with the event data
                const result = await this.workflowService.executeWorkflow({
                  workflow_id: workflowId,
                  input_data: {
                    instagramEvent: eventData,
                    triggeredAt: new Date().toISOString(),
                    trigger: 'instagram_webhook'
                  },
                });

                results.push(result);
              }
            }
          }
        }
        // Process Facebook Page events
        else if (payload.object === 'page') {
          // Process Page changes (posts, comments, feed updates)
          if (entry.changes && entry.changes.length > 0) {
            for (const change of entry.changes) {
              const shouldTrigger = this.shouldTriggerWorkflow(facebookTrigger, change);

              if (shouldTrigger) {
                // Prepare event data for workflow
                const eventData = this.prepareEventData(entry, change);

                this.logger.log(`Triggering workflow for ${change.field} event`);

                // Execute the workflow with the event data
                const result = await this.workflowService.executeWorkflow({
                  workflow_id: workflowId,
                  input_data: {
                    facebookEvent: eventData,
                    triggeredAt: new Date().toISOString(),
                    trigger: 'facebook_webhook'
                  },
                });

                results.push(result);
              }
            }
          }

          // Process Messenger messages
          if (entry.messaging && entry.messaging.length > 0) {
            for (const messagingEvent of entry.messaging) {
              // Always trigger for messaging events (or check config if needed)
              const eventData = this.prepareMessagingEventData(entry, messagingEvent);

              this.logger.log(`Triggering workflow for messaging event`);

              // Execute the workflow with the event data
              const result = await this.workflowService.executeWorkflow({
                workflow_id: workflowId,
                input_data: {
                  facebookEvent: eventData,
                  triggeredAt: new Date().toISOString(),
                  trigger: 'facebook_webhook'
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
      this.logger.error(`Failed to process Facebook webhook:`, error);

      if (error instanceof NotFoundException || error instanceof BadRequestException) {
        throw error;
      }

      // Return 200 to Facebook even on errors (to avoid retries)
      // but log the error for debugging
      return {
        success: false,
        message: `Error: ${error.message}`
      };
    }
  }

  /**
   * Check if this event should trigger the workflow
   */
  private shouldTriggerWorkflow(triggerNode: any, change: FacebookWebhookChange): boolean {
    const config = triggerNode.data || {};

    // Get configured event types from the trigger node
    const events = config.events || [];

    // If no specific events configured, trigger on all
    if (events.length === 0) {
      return true;
    }

    // Check if this event type is in the configured events
    return events.includes(change.field);
  }

  /**
   * Prepare event data in a structured format for the workflow
   */
  private prepareEventData(entry: FacebookWebhookEntry, change: FacebookWebhookChange): any {
    const baseData = {
      pageId: entry.id,
      time: new Date(entry.time * 1000).toISOString(),
      eventType: change.field,
      value: change.value
    };

    // Structure data based on event type
    switch (change.field) {
      case 'feed':
        // New post or post update
        return {
          ...baseData,
          event: 'page_post',
          post: {
            id: change.value.post_id,
            message: change.value.message,
            from: change.value.from,
            created_time: change.value.created_time,
            link: change.value.link
          }
        };

      case 'comments':
        // New comment or comment update
        return {
          ...baseData,
          event: 'page_comment',
          comment: {
            id: change.value.comment_id,
            postId: change.value.post_id,
            parentId: change.value.parent_id,
            message: change.value.message,
            from: change.value.from,
            created_time: change.value.created_time,
            verb: change.value.verb // add, edit, remove
          }
        };

      case 'mention':
        // Page was mentioned in a post
        return {
          ...baseData,
          event: 'page_mention',
          mention: {
            id: change.value.post_id,
            message: change.value.message,
            from: change.value.from,
            created_time: change.value.created_time
          }
        };

      case 'messages':
        // New message received
        return {
          ...baseData,
          event: 'page_message',
          message: {
            id: change.value.mid,
            from: change.value.from,
            to: change.value.to,
            message: change.value.message,
            created_time: change.value.created_time
          }
        };

      default:
        // Generic event
        return {
          ...baseData,
          event: change.field,
          data: change.value
        };
    }
  }

  /**
   * Prepare Messenger event data in a structured format for the workflow
   */
  private prepareMessagingEventData(entry: FacebookWebhookEntry, messagingEvent: any): any {
    const baseData = {
      pageId: entry.id,
      time: new Date(entry.time).toISOString(),
      eventType: 'messaging',
    };

    // Extract sender and recipient
    const sender = messagingEvent.sender;
    const recipient = messagingEvent.recipient;

    // Check what type of messaging event this is
    if (messagingEvent.message) {
      // Regular message
      return {
        ...baseData,
        event: 'messenger_message',
        message: {
          mid: messagingEvent.message.mid,
          text: messagingEvent.message.text,
          attachments: messagingEvent.message.attachments,
          quick_reply: messagingEvent.message.quick_reply,
          from: {
            id: sender.id
          },
          to: {
            id: recipient.id
          },
          timestamp: messagingEvent.timestamp
        }
      };
    } else if (messagingEvent.postback) {
      // Postback button click
      return {
        ...baseData,
        event: 'messenger_postback',
        postback: {
          title: messagingEvent.postback.title,
          payload: messagingEvent.postback.payload,
          from: {
            id: sender.id
          },
          timestamp: messagingEvent.timestamp
        }
      };
    } else if (messagingEvent.delivery) {
      // Message delivery confirmation
      return {
        ...baseData,
        event: 'messenger_delivery',
        delivery: messagingEvent.delivery
      };
    } else if (messagingEvent.read) {
      // Message read confirmation
      return {
        ...baseData,
        event: 'messenger_read',
        read: messagingEvent.read
      };
    } else {
      // Generic messaging event
      return {
        ...baseData,
        event: 'messenger_event',
        data: messagingEvent
      };
    }
  }

  /**
   * Check if this Instagram event should trigger the workflow
   */
  private shouldTriggerInstagramWorkflow(triggerNode: any, change: FacebookWebhookChange): boolean {
    const config = triggerNode.data || {};

    // Get configured event type from the trigger node
    const triggerId = config.triggerId;
    const eventType = config.eventType;

    // If no specific trigger configured, trigger on all
    if (!triggerId && !eventType) {
      return true;
    }

    // Map change.field to trigger IDs
    const fieldToTriggerId: Record<string, string> = {
      'comments': 'instagram_comment',
      'mentions': 'instagram_mention',
      'story_mentions': 'instagram_story_mention',
      'media': 'instagram_media_published'
    };

    const expectedTriggerId = fieldToTriggerId[change.field];

    // Check if this event matches the configured trigger
    return triggerId === expectedTriggerId || eventType === expectedTriggerId || eventType === change.field;
  }

  /**
   * Prepare Instagram event data in a structured format for the workflow
   */
  private prepareInstagramEventData(entry: FacebookWebhookEntry, change: FacebookWebhookChange): any {
    const baseData = {
      instagramAccountId: entry.id,
      time: new Date(entry.time * 1000).toISOString(),
      eventType: change.field,
      value: change.value
    };

    // Structure data based on event type
    switch (change.field) {
      case 'comments':
        // New comment on media
        return {
          ...baseData,
          event: 'instagram_comment',
          comment: {
            id: change.value.id,
            text: change.value.text,
            mediaId: change.value.media?.id,
            from: {
              id: change.value.from?.id,
              username: change.value.from?.username
            },
            timestamp: change.value.timestamp || new Date().toISOString()
          }
        };

      case 'mentions':
        // Account was mentioned in a comment or caption
        return {
          ...baseData,
          event: 'instagram_mention',
          mention: {
            id: change.value.id,
            mediaId: change.value.media_id,
            commentId: change.value.comment_id,
            caption: change.value.caption,
            from: {
              id: change.value.from?.id,
              username: change.value.from?.username
            },
            timestamp: change.value.timestamp || new Date().toISOString()
          }
        };

      case 'story_mentions':
        // Account was mentioned in a story
        return {
          ...baseData,
          event: 'instagram_story_mention',
          storyMention: {
            id: change.value.id,
            mediaId: change.value.media_id,
            mediaUrl: change.value.media_url,
            from: {
              id: change.value.from?.id,
              username: change.value.from?.username
            },
            timestamp: change.value.timestamp || new Date().toISOString()
          }
        };

      case 'media':
        // New media published
        return {
          ...baseData,
          event: 'instagram_media_published',
          media: {
            id: change.value.id,
            mediaType: change.value.media_type, // IMAGE, VIDEO, CAROUSEL_ALBUM
            caption: change.value.caption,
            mediaUrl: change.value.media_url,
            permalink: change.value.permalink,
            timestamp: change.value.timestamp || new Date().toISOString(),
            owner: {
              id: change.value.owner?.id
            }
          }
        };

      default:
        // Generic Instagram event
        return {
          ...baseData,
          event: change.field,
          data: change.value
        };
    }
  }

}

// Type definitions for Facebook webhook payload
interface FacebookWebhookPayload {
  object: 'page' | 'instagram' | 'user' | 'permissions' | 'payments';
  entry: FacebookWebhookEntry[];
}

interface FacebookWebhookEntry {
  id: string; // Page ID
  time: number; // Unix timestamp
  changes?: FacebookWebhookChange[];
  messaging?: any[]; // For Messenger events
}

interface FacebookWebhookChange {
  field: 'feed' | 'comments' | 'mention' | 'messages' | 'messaging_postbacks' | 'ratings' |
         'mentions' | 'story_mentions' | 'media' | string; // Instagram fields added
  value: any;
}
