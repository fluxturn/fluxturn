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
import { CalendlyTriggerService } from './calendly-trigger.service';

interface CalendlyWebhookPayload {
  event: string;
  created_at: string;
  created_by: string;
  payload: {
    event_type?: {
      uuid: string;
      name: string;
      slug: string;
    };
    event?: {
      uuid: string;
      name: string;
      status: string;
      start_time: string;
      end_time: string;
      location?: any;
      invitees_counter?: {
        total: number;
        active: number;
        limit: number;
      };
    };
    invitee?: {
      uuid: string;
      name: string;
      email: string;
      timezone: string;
      created_at: string;
      updated_at: string;
      canceled: boolean;
      cancellation?: {
        canceled_by: string;
        reason: string;
      };
      reschedule?: {
        old_invitee_uri: string;
        new_invitee_uri: string;
      };
    };
    questions_and_answers?: Array<{
      question: string;
      answer: string;
    }>;
    tracking?: {
      utm_campaign?: string;
      utm_source?: string;
      utm_medium?: string;
      utm_content?: string;
      utm_term?: string;
      salesforce_uuid?: string;
    };
    old_invitee?: any;
    new_invitee?: any;
  };
}

@ApiTags('Calendly Webhook')
@Controller('webhooks/calendly')
export class CalendlyWebhookController {
  private readonly logger = new Logger(CalendlyWebhookController.name);

  constructor(
    @Inject(forwardRef(() => WorkflowService))
    private readonly workflowService: WorkflowService,
    private readonly calendlyTriggerService: CalendlyTriggerService
  ) {}

  @Post(':workflowId')
  @HttpCode(200)
  @ApiOperation({ summary: 'Handle Calendly webhook' })
  @ApiParam({ name: 'workflowId', description: 'Workflow ID' })
  async handleWebhook(
    @Param('workflowId') workflowId: string,
    @Body() payload: CalendlyWebhookPayload,
    @Headers('calendly-webhook-signature') signature: string,
    @Req() req: RawBodyRequest<Request>
  ) {
    this.logger.log(`Received Calendly webhook for workflow ${workflowId}`);
    this.logger.debug(`Event type: ${payload.event}`);

    try {
      // Get workflow data
      const workflowData = await this.workflowService.getWorkflow(workflowId);

      if (!workflowData) {
        this.logger.warn(`Workflow ${workflowId} not found`);
        return { success: false, message: 'Workflow not found' };
      }

      // Verify signature if available
      if (signature) {
        const rawBody = req.rawBody?.toString() || JSON.stringify(payload);
        const isValid = this.calendlyTriggerService.verifySignature(workflowId, rawBody, signature);
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
                      node.data?.connectorType === 'calendly'
      );

      if (triggerNodes.length === 0) {
        this.logger.warn(`No Calendly trigger node found in workflow ${workflowId}`);
        return { success: false, message: 'No Calendly trigger configured' };
      }

      // Check if event matches trigger
      const matchingTrigger = triggerNodes.find((node: any) => {
        const triggerId = node.data?.triggerId || node.data?.actionParams?.triggerId;
        return this.eventMatchesTrigger(payload.event, triggerId);
      });

      if (!matchingTrigger) {
        this.logger.debug(`Event ${payload.event} does not match any configured trigger`);
        return { success: true, message: 'Event does not match trigger' };
      }

      // Prepare trigger data
      const triggerData = {
        calendlyEvent: {
          event: payload.event,
          created_at: payload.created_at,
          created_by: payload.created_by,
          timestamp: new Date().toISOString(),
          eventType: payload.payload.event_type,
          scheduledEvent: payload.payload.event,
          invitee: payload.payload.invitee,
          questionsAndAnswers: payload.payload.questions_and_answers,
          tracking: payload.payload.tracking,
          isReschedule: !!payload.payload.invitee?.reschedule,
          isCancellation: payload.payload.invitee?.canceled || false,
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
      this.logger.error(`Error processing Calendly webhook for workflow ${workflowId}:`, error);

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

  private eventMatchesTrigger(event: string, triggerId: string): boolean {
    const triggerEventMap: Record<string, string[]> = {
      'invitee_created': ['invitee.created'],
      'invitee_canceled': ['invitee.canceled'],
      'invitee_rescheduled': ['invitee.created'], // Rescheduled events come as invitee.created with reschedule data
    };

    const expectedEvents = triggerEventMap[triggerId] || [];
    return expectedEvents.includes(event);
  }
}
