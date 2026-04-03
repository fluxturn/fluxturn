import {
  Controller,
  Post,
  Body,
  Param,
  HttpCode,
  HttpStatus,
  NotFoundException,
  Logger,
  Headers,
  Inject,
  forwardRef,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiParam } from '@nestjs/swagger';
import { WorkflowService } from '../../../workflow/workflow.service';

/**
 * Twilio Webhook Controller
 * Handles Twilio webhook events for workflow triggers
 *
 * Supported events:
 * - SMS received (inbound message)
 * - Call received/completed
 * - WhatsApp message received
 * - Message status updates
 */
@ApiTags('webhooks')
@Controller('webhooks/twilio')
export class TwilioWebhookController {
  private readonly logger = new Logger(TwilioWebhookController.name);

  constructor(
    @Inject(forwardRef(() => WorkflowService))
    private readonly workflowService: WorkflowService,
  ) {}

  /**
   * POST /webhooks/twilio/:workflowId
   * Twilio webhook endpoint for workflow triggers
   * Handles both Event Streams webhooks and direct SMS/Voice webhooks
   */
  @Post(':workflowId')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Receive Twilio webhook events',
    description: 'Endpoint that receives webhook events from Twilio',
  })
  @ApiParam({ name: 'workflowId', description: 'The workflow ID to trigger' })
  @ApiResponse({
    status: 200,
    description: 'Webhook received and workflow triggered',
  })
  async receiveWebhook(
    @Param('workflowId') workflowId: string,
    @Body() payload: any,
    @Headers() headers: any,
  ) {
    // Determine event type from payload
    const eventType = this.determineEventType(payload);
    this.logger.log(`Twilio webhook received: Event=${eventType}, Workflow=${workflowId}`);

    try {
      // Validate the workflow exists
      const workflow = await this.workflowService.getWorkflow(workflowId);
      if (!workflow) {
        throw new NotFoundException('Workflow not found');
      }

      // Find the Twilio trigger node in workflow
      const twilioTrigger = this.findTwilioTrigger(workflow, eventType);
      if (!twilioTrigger) {
        this.logger.warn(
          `Workflow ${workflowId} does not have a Twilio trigger for event: ${eventType}`,
        );
        return {
          success: false,
          message: `No trigger configured for event type: ${eventType}`,
        };
      }

      // Check if this event should trigger the workflow
      const shouldTrigger = this.shouldTriggerWorkflow(twilioTrigger, eventType, payload);

      if (!shouldTrigger) {
        return {
          success: true,
          message: 'Event received but did not match trigger conditions',
        };
      }

      // Prepare event data for workflow
      const eventData = this.prepareEventData(eventType, payload);

      this.logger.log(`Triggering workflow ${workflowId} for Twilio ${eventType} event`);

      // Execute the workflow with the event data
      const result = await this.workflowService.executeWorkflow({
        workflow_id: workflowId,
        input_data: {
          twilioEvent: eventData,
          triggeredAt: new Date().toISOString(),
          trigger: `twilio_${eventType}`,
          eventType,
        },
      });

      return {
        success: true,
        message: 'Twilio event processed successfully',
        executionId: result.id,
      };
    } catch (error) {
      this.logger.error(`Failed to process Twilio webhook: ${error.message}`, error.stack);

      if (error instanceof NotFoundException) {
        throw error;
      }

      // Return 200 to Twilio even on errors (to avoid retries)
      return {
        success: false,
        message: `Error: ${error.message}`,
      };
    }
  }

  /**
   * Determine event type from Twilio webhook payload
   */
  private determineEventType(payload: any): string {
    // Event Streams format (Sinks/Subscriptions)
    if (payload.type) {
      return payload.type;
    }

    // Direct webhook format - check for message or call indicators
    if (payload.MessageSid || payload.SmsMessageSid) {
      // Check if it's WhatsApp
      if (payload.From?.startsWith('whatsapp:') || payload.To?.startsWith('whatsapp:')) {
        return 'whatsapp_received';
      }
      // Check if it's a status callback
      if (payload.MessageStatus) {
        return 'message_status';
      }
      return 'sms_received';
    }

    if (payload.CallSid) {
      if (payload.CallStatus) {
        return 'call_status';
      }
      return 'call_received';
    }

    return 'unknown';
  }

  /**
   * Find Twilio trigger node in workflow for specific event type
   */
  private findTwilioTrigger(workflow: any, eventType: string): any | null {
    const canvas = workflow.workflow?.canvas || workflow.canvas;

    if (!canvas || !canvas.nodes || canvas.nodes.length === 0) {
      this.logger.warn(`Workflow canvas is empty or missing nodes`);
      return null;
    }

    // Look for Twilio trigger nodes
    const triggers = canvas.nodes.filter(
      (node: any) =>
        node.type === 'TWILIO_TRIGGER' ||
        (node.type === 'CONNECTOR_TRIGGER' && node.data?.connectorType === 'twilio'),
    );

    this.logger.debug(`Found ${triggers.length} Twilio trigger nodes`);

    // Map Twilio event types to trigger IDs
    const eventToTriggerMap: Record<string, string> = {
      'sms_received': 'sms_received',
      'com.twilio.messaging.inbound-message.received': 'sms_received',
      'whatsapp_received': 'whatsapp_received',
      'call_received': 'call_received',
      'call_status': 'call_received',
      'com.twilio.voice.insights.call-summary.complete': 'call_received',
      'message_status': 'message_status_updated',
      'com.twilio.messaging.message.delivered': 'message_status_updated',
    };

    const expectedTriggerId = eventToTriggerMap[eventType];

    // Find trigger that matches the event type
    for (const trigger of triggers) {
      const triggerId = trigger.data?.triggerId;

      // Direct match
      if (triggerId === expectedTriggerId) {
        return trigger;
      }

      // Generic "any message" trigger
      if (triggerId === 'any_message' && eventType.includes('message')) {
        return trigger;
      }
    }

    // No match found - do NOT fallback to avoid infinite loops
    this.logger.log(`No trigger configured for event type: ${eventType}`);
    return null;
  }

  /**
   * Check if this event should trigger the workflow
   */
  private shouldTriggerWorkflow(
    triggerNode: any,
    eventType: string,
    payload: any,
  ): boolean {
    const triggerParams = triggerNode.data?.triggerParams || {};

    // Filter by phone number if specified
    if (triggerParams.phoneNumber) {
      const eventToNumber = payload.To || payload.Called;
      if (eventToNumber && !eventToNumber.includes(triggerParams.phoneNumber)) {
        this.logger.log(`Event to ${eventToNumber} does not match filter ${triggerParams.phoneNumber}`);
        return false;
      }
    }

    // Filter by status if specified (for message_status_updated trigger)
    if (triggerParams.statusFilter && triggerParams.statusFilter !== 'all') {
      const messageStatus = payload.MessageStatus?.toLowerCase();
      if (messageStatus && messageStatus !== triggerParams.statusFilter) {
        this.logger.log(`Status ${messageStatus} does not match filter ${triggerParams.statusFilter}`);
        return false;
      }
    }

    return true;
  }

  /**
   * Prepare event data in a structured format for the workflow
   */
  private prepareEventData(eventType: string, payload: any): any {
    const baseData = {
      eventType,
      timestamp: new Date().toISOString(),
      raw: payload,
    };

    // Handle SMS/WhatsApp message received
    if (eventType === 'sms_received' || eventType === 'whatsapp_received') {
      return {
        ...baseData,
        messageSid: payload.MessageSid || payload.SmsMessageSid,
        from: payload.From,
        to: payload.To,
        body: payload.Body,
        numMedia: parseInt(payload.NumMedia || '0', 10),
        mediaUrls: this.extractMediaUrls(payload),
        fromCity: payload.FromCity,
        fromState: payload.FromState,
        fromCountry: payload.FromCountry,
        fromZip: payload.FromZip,
        toCity: payload.ToCity,
        toState: payload.ToState,
        toCountry: payload.ToCountry,
        toZip: payload.ToZip,
        // WhatsApp specific
        profileName: payload.ProfileName,
      };
    }

    // Handle call events
    if (eventType === 'call_received' || eventType === 'call_status') {
      return {
        ...baseData,
        callSid: payload.CallSid,
        from: payload.From || payload.Caller,
        to: payload.To || payload.Called,
        status: payload.CallStatus,
        direction: payload.Direction,
        duration: payload.CallDuration ? parseInt(payload.CallDuration, 10) : null,
        startTime: payload.StartTime,
        endTime: payload.EndTime,
        fromCity: payload.CallerCity || payload.FromCity,
        fromState: payload.CallerState || payload.FromState,
        fromCountry: payload.CallerCountry || payload.FromCountry,
        toCity: payload.CalledCity || payload.ToCity,
        toState: payload.CalledState || payload.ToState,
        toCountry: payload.CalledCountry || payload.ToCountry,
      };
    }

    // Handle message status updates
    if (eventType === 'message_status') {
      return {
        ...baseData,
        messageSid: payload.MessageSid,
        messageStatus: payload.MessageStatus,
        from: payload.From,
        to: payload.To,
        errorCode: payload.ErrorCode,
        errorMessage: payload.ErrorMessage,
      };
    }

    // Event Streams format - extract from nested data
    if (payload.data) {
      return {
        ...baseData,
        ...payload.data,
      };
    }

    // Default: return raw payload
    return baseData;
  }

  /**
   * Extract media URLs from payload
   */
  private extractMediaUrls(payload: any): string[] {
    const urls: string[] = [];
    const numMedia = parseInt(payload.NumMedia || '0', 10);

    for (let i = 0; i < numMedia; i++) {
      const url = payload[`MediaUrl${i}`];
      if (url) {
        urls.push(url);
      }
    }

    return urls;
  }
}
