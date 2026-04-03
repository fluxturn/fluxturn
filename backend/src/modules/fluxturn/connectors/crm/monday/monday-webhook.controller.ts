import {
  Controller,
  Post,
  Param,
  Body,
  Headers,
  Logger,
  HttpCode,
  HttpStatus,
  UnauthorizedException,
  Res,
  Inject,
  forwardRef,
} from '@nestjs/common';
import { Response } from 'express';
import { MondayTriggerService } from './monday-trigger.service';
import { WorkflowService } from '../../../workflow/workflow.service';

interface MondayWebhookPayload {
  event?: {
    type?: string;
    pulseId?: number;
    pulseName?: string;
    boardId?: number;
    columnId?: string;
    columnTitle?: string;
    columnType?: string;
    value?: any;
    previousValue?: any;
    userId?: number;
    originalTriggerUuid?: string;
    isTopGroup?: boolean;
    triggerTime?: string;
    subscriptionId?: number;
    app?: string;
  };
  challenge?: string;
}

@Controller('webhooks/monday')
export class MondayWebhookController {
  private readonly logger = new Logger(MondayWebhookController.name);

  constructor(
    private readonly mondayTriggerService: MondayTriggerService,
    @Inject(forwardRef(() => WorkflowService))
    private readonly workflowService: WorkflowService,
  ) {}

  @Post(':workflowId')
  @HttpCode(HttpStatus.OK)
  async handleWebhook(
    @Param('workflowId') workflowId: string,
    @Body() payload: MondayWebhookPayload,
    @Headers('authorization') authorization: string,
    @Res() res: Response,
  ) {
    this.logger.log(`Received Monday.com webhook for workflow ${workflowId}`);

    // Handle Monday.com challenge verification
    if (payload.challenge) {
      this.logger.log('Responding to Monday.com challenge verification');
      return res.json({ challenge: payload.challenge });
    }

    this.logger.debug(`Event type: ${payload.event?.type}`);
    this.logger.debug(`Board ID: ${payload.event?.boardId}`);

    try {
      // Map Monday.com event type to trigger ID
      const triggerId = this.mapEventToTriggerId(payload.event?.type);

      // Get the active trigger to check if this event matches
      const activeTrigger = this.mondayTriggerService.getActiveTrigger(workflowId);

      if (activeTrigger && activeTrigger.triggerId !== triggerId) {
        this.logger.debug(`Event ${triggerId} doesn't match trigger ${activeTrigger.triggerId}, skipping`);
        return res.json({ success: true, message: 'Event filtered out' });
      }

      // Prepare event data
      const eventData = this.prepareEventData(payload, triggerId);

      // Execute workflow
      await this.workflowService.executeWorkflow({
        workflow_id: workflowId,
        input_data: {
          mondayEvent: eventData,
        },
      });

      this.logger.log(`Successfully triggered workflow ${workflowId} with Monday.com ${triggerId} event`);

      return res.json({
        success: true,
        message: 'Webhook processed successfully',
        triggerId,
      });
    } catch (error) {
      this.logger.error(`Failed to process Monday.com webhook for workflow ${workflowId}:`, error);
      return res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
        success: false,
        error: error.message,
      });
    }
  }

  private mapEventToTriggerId(eventType: string | undefined): string {
    if (!eventType) return 'item_created';

    const eventMap: Record<string, string> = {
      'create_pulse': 'item_created',
      'change_column_value': 'item_updated',
      'change_status_column_value': 'status_changed',
      'create_board': 'board_created',
      'change_subitem_column_value': 'item_updated',
      'create_subitem': 'item_created',
      'delete_pulse': 'item_deleted',
      'update_column_value': 'item_updated',
    };

    return eventMap[eventType] || 'item_created';
  }

  private prepareEventData(payload: MondayWebhookPayload, triggerId: string): any {
    const event = payload.event || {};

    const baseData = {
      triggerId,
      timestamp: new Date().toISOString(),
      eventType: event.type,
      boardId: event.boardId,
      userId: event.userId,
      subscriptionId: event.subscriptionId,
    };

    switch (triggerId) {
      case 'item_created':
        return {
          ...baseData,
          item: {
            id: event.pulseId,
            name: event.pulseName,
            boardId: event.boardId,
          },
          board: {
            id: event.boardId,
          },
        };

      case 'item_updated':
        return {
          ...baseData,
          item: {
            id: event.pulseId,
            name: event.pulseName,
            boardId: event.boardId,
          },
          column: {
            id: event.columnId,
            title: event.columnTitle,
            type: event.columnType,
          },
          previousValue: event.previousValue,
          newValue: event.value,
        };

      case 'status_changed':
        return {
          ...baseData,
          item: {
            id: event.pulseId,
            name: event.pulseName,
            boardId: event.boardId,
          },
          columnId: event.columnId,
          previousStatus: this.extractStatusLabel(event.previousValue),
          newStatus: this.extractStatusLabel(event.value),
        };

      case 'board_created':
        return {
          ...baseData,
          board: {
            id: event.boardId,
          },
        };

      case 'item_deleted':
        return {
          ...baseData,
          item: {
            id: event.pulseId,
            name: event.pulseName,
            boardId: event.boardId,
          },
          deleted: true,
        };

      default:
        return {
          ...baseData,
          rawEvent: event,
        };
    }
  }

  private extractStatusLabel(value: any): string | null {
    if (!value) return null;

    // Monday.com status values come as JSON objects
    if (typeof value === 'object' && value.label) {
      return value.label.text || value.label;
    }

    if (typeof value === 'string') {
      try {
        const parsed = JSON.parse(value);
        return parsed.label?.text || parsed.label || null;
      } catch {
        return value;
      }
    }

    return null;
  }
}
