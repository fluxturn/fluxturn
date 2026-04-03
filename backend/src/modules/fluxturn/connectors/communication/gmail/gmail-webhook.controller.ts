import {
  Controller,
  Post,
  Body,
  Param,
  HttpCode,
  HttpStatus,
  NotFoundException,
  BadRequestException,
  Logger,
  Headers,
  Inject,
  forwardRef,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiParam } from '@nestjs/swagger';
import { WorkflowService } from '../../../workflow/workflow.service';
import * as crypto from 'crypto';

/**
 * Gmail Webhook Controller
 * Handles Gmail push notifications via Google Cloud Pub/Sub
 *
 * Gmail webhook flow:
 * 1. Register watch on Gmail mailbox using Gmail API
 * 2. Gmail sends push notifications to Cloud Pub/Sub topic
 * 3. Pub/Sub pushes notifications to this endpoint
 * 4. We verify, parse, and trigger workflows
 */
@ApiTags('webhooks')
@Controller('webhooks/gmail')
export class GmailWebhookController {
  private readonly logger = new Logger(GmailWebhookController.name);

  constructor(
    @Inject(forwardRef(() => WorkflowService))
    private readonly workflowService: WorkflowService,
  ) {}

  /**
   * POST /webhooks/gmail/:workflowId
   * Gmail Pub/Sub push notification endpoint
   *
   * Receives notifications when:
   * - New email received
   * - Email sent
   * - Email labels changed
   * - Email deleted
   */
  @Post(':workflowId')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Receive Gmail push notifications',
    description: 'Endpoint that receives push notifications from Gmail via Cloud Pub/Sub'
  })
  @ApiParam({ name: 'workflowId', description: 'The workflow ID to trigger' })
  @ApiResponse({
    status: 200,
    description: 'Notification received and workflow triggered',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean' },
        message: { type: 'string' },
        executionId: { type: 'string' }
      }
    }
  })
  async receiveNotification(
    @Param('workflowId') workflowId: string,
    @Body() payload: GmailPubSubPayload,
    @Headers('authorization') authHeader: string,
  ) {
    this.logger.log(`Gmail notification received for workflow: ${workflowId}`);

    try {
      // Validate the workflow exists
      const workflow = await this.workflowService.getWorkflow(workflowId);
      if (!workflow) {
        throw new NotFoundException('Workflow not found');
      }

      // Find the Gmail trigger node
      const gmailTrigger = workflow.canvas?.nodes?.find(
        (node: any) => node.type === 'GMAIL_TRIGGER' || node.type === 'CONNECTOR_TRIGGER'
      );

      if (!gmailTrigger) {
        throw new BadRequestException('This workflow does not have a Gmail trigger');
      }

      // Verify Pub/Sub authentication token (optional but recommended)
      if (authHeader) {
        const isValid = await this.verifyPubSubToken(authHeader, gmailTrigger.data);
        if (!isValid) {
          this.logger.warn('Invalid Pub/Sub authentication token');
          // Continue anyway - token verification is optional
        }
      }

      // Decode the Pub/Sub message
      if (!payload.message || !payload.message.data) {
        throw new BadRequestException('Invalid Pub/Sub payload');
      }

      const decodedData = this.decodePubSubMessage(payload.message.data);
      this.logger.log(`Decoded notification:`, JSON.stringify(decodedData, null, 2));

      // Parse Gmail notification
      const gmailNotification = this.parseGmailNotification(decodedData);

      // Check if this event should trigger the workflow
      const shouldTrigger = this.shouldTriggerWorkflow(gmailTrigger, gmailNotification);

      if (!shouldTrigger) {
        return {
          success: true,
          message: 'Event received but did not match trigger conditions'
        };
      }

      // Fetch the actual message details from Gmail
      const messageDetails = await this.fetchMessageDetails(
        gmailTrigger.data,
        gmailNotification.historyId
      );

      // Prepare event data for workflow
      const eventData = this.prepareEventData(gmailNotification, messageDetails);

      this.logger.log(`Triggering workflow for Gmail event`);

      // Execute the workflow with the event data
      const result = await this.workflowService.executeWorkflow({
        workflow_id: workflowId,
        input_data: {
          gmailEvent: eventData,
          triggeredAt: new Date().toISOString(),
          trigger: 'gmail_webhook'
        },
      });

      return {
        success: true,
        message: 'Gmail event processed successfully',
        executionId: result.id
      };

    } catch (error) {
      this.logger.error(`Failed to process Gmail notification:`, error);

      if (error instanceof NotFoundException || error instanceof BadRequestException) {
        throw error;
      }

      // Return 200 to Pub/Sub even on errors (to avoid retries)
      // but log the error for debugging
      return {
        success: false,
        message: `Error: ${error.message}`
      };
    }
  }

  /**
   * Verify Pub/Sub authentication token
   * This is optional but recommended for security
   */
  private async verifyPubSubToken(authHeader: string, triggerConfig: any): Promise<boolean> {
    try {
      // Extract token from "Bearer <token>" format
      const token = authHeader.replace('Bearer ', '');

      // In production, you would verify this token with Google's OAuth2 API
      // or use a shared secret configured in the trigger
      const expectedToken = triggerConfig?.pubsubToken;

      if (expectedToken) {
        return token === expectedToken;
      }

      // If no token configured, accept all (not recommended for production)
      return true;
    } catch (error) {
      this.logger.error('Token verification error:', error);
      return false;
    }
  }

  /**
   * Decode base64-encoded Pub/Sub message
   */
  private decodePubSubMessage(encodedData: string): any {
    try {
      const decoded = Buffer.from(encodedData, 'base64').toString('utf-8');
      return JSON.parse(decoded);
    } catch (error) {
      this.logger.error('Failed to decode Pub/Sub message:', error);
      throw new BadRequestException('Invalid message encoding');
    }
  }

  /**
   * Parse Gmail notification from Pub/Sub message
   */
  private parseGmailNotification(data: any): GmailNotification {
    return {
      emailAddress: data.emailAddress,
      historyId: data.historyId,
      timestamp: new Date().toISOString()
    };
  }

  /**
   * Check if this event should trigger the workflow
   */
  private shouldTriggerWorkflow(triggerNode: any, notification: GmailNotification): boolean {
    const config = triggerNode.data || {};

    // Get configured event types from the trigger node
    const eventTypes = config.eventTypes || ['email_received'];

    // If no specific event types configured, trigger on all
    if (eventTypes.length === 0 || eventTypes.includes('all')) {
      return true;
    }

    // For now, we'll trigger on all events since Gmail notifications
    // don't specify the exact event type (we need to fetch history to determine that)
    // This can be enhanced to filter based on history analysis
    return true;
  }

  /**
   * Fetch message details from Gmail API
   * This requires making a call to Gmail API using the stored credentials
   */
  private async fetchMessageDetails(triggerConfig: any, historyId: string): Promise<any> {
    try {
      // In a real implementation, you would:
      // 1. Get the stored Gmail credentials from the trigger config
      // 2. Make a request to Gmail API to fetch the history changes
      // 3. Extract the actual message details

      // For now, return a placeholder
      // This will be implemented when integrating with the Gmail connector
      this.logger.log(`Would fetch Gmail history from historyId: ${historyId}`);

      return {
        historyId,
        messages: [],
        // Real implementation would fetch actual message data here
      };
    } catch (error) {
      this.logger.error('Failed to fetch message details:', error);
      return null;
    }
  }

  /**
   * Prepare event data in a structured format for the workflow
   */
  private prepareEventData(notification: GmailNotification, messageDetails: any): any {
    const baseData = {
      emailAddress: notification.emailAddress,
      historyId: notification.historyId,
      timestamp: notification.timestamp,
      eventType: 'gmail_notification'
    };

    // If we have message details, include them
    if (messageDetails && messageDetails.messages) {
      return {
        ...baseData,
        messages: messageDetails.messages,
        hasNewMessages: messageDetails.messages.length > 0
      };
    }

    return baseData;
  }
}

// Type definitions for Gmail Pub/Sub payload
interface GmailPubSubPayload {
  message: {
    data: string; // base64-encoded JSON
    messageId: string;
    message_id: string;
    publishTime: string;
    publish_time: string;
  };
  subscription: string;
}

interface GmailNotification {
  emailAddress: string;
  historyId: string;
  timestamp: string;
}
