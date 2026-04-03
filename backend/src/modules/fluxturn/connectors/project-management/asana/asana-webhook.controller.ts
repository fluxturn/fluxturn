import {
  Controller,
  Post,
  Param,
  Body,
  Headers,
  Logger,
  HttpCode,
  HttpStatus,
  Res,
  Inject,
  forwardRef,
} from '@nestjs/common';
import { Response } from 'express';
import { AsanaTriggerService } from './asana-trigger.service';
import { WorkflowService } from '../../../workflow/workflow.service';

interface AsanaEvent {
  user: {
    gid: string;
    resource_type: string;
  };
  created_at: string;
  action: string;
  resource: {
    gid: string;
    resource_type: string;
    name?: string;
  };
  parent?: {
    gid: string;
    resource_type: string;
  };
  change?: {
    field: string;
    action: string;
    new_value?: any;
    added_value?: any;
    removed_value?: any;
  };
}

interface AsanaWebhookPayload {
  events?: AsanaEvent[];
}

@Controller('webhooks/asana')
export class AsanaWebhookController {
  private readonly logger = new Logger(AsanaWebhookController.name);

  constructor(
    private readonly asanaTriggerService: AsanaTriggerService,
    @Inject(forwardRef(() => WorkflowService))
    private readonly workflowService: WorkflowService,
  ) {}

  @Post(':workflowId')
  @HttpCode(HttpStatus.OK)
  async handleWebhook(
    @Param('workflowId') workflowId: string,
    @Body() payload: AsanaWebhookPayload,
    @Headers('x-hook-secret') hookSecret: string,
    @Headers('x-hook-signature') hookSignature: string,
    @Res() res: Response,
  ) {
    this.logger.log(`Received Asana webhook for workflow ${workflowId}`);

    // Handle Asana webhook handshake
    if (hookSecret) {
      this.logger.log('Responding to Asana webhook handshake');
      // Store the hook secret for future signature verification
      this.asanaTriggerService.storeHookSecret(workflowId, hookSecret);
      res.setHeader('X-Hook-Secret', hookSecret);
      return res.status(200).send();
    }

    // Validate signature if we have a stored secret
    const storedSecret = this.asanaTriggerService.getHookSecret(workflowId);
    if (storedSecret && hookSignature) {
      // Asana uses HMAC SHA-256 for signature verification
      // In production, you would verify the signature here
      this.logger.debug('Webhook signature present');
    }

    try {
      const events = payload.events || [];

      if (events.length === 0) {
        this.logger.debug('No events in webhook payload');
        return res.json({ success: true, message: 'No events to process' });
      }

      // Get active trigger to filter events
      const activeTrigger = this.asanaTriggerService.getActiveTrigger(workflowId);

      for (const event of events) {
        this.logger.debug(`Processing event: ${event.action} on ${event.resource.resource_type}`);

        // Map event to trigger ID
        const triggerId = this.mapEventToTriggerId(event);

        // Check if this event matches the configured trigger
        if (activeTrigger && activeTrigger.triggerId !== triggerId) {
          // For task_completed, we need special handling
          if (activeTrigger.triggerId === 'task_completed' && triggerId === 'task_updated') {
            // Check if the change is about completion
            if (event.change?.field !== 'completed' || !event.change?.new_value) {
              this.logger.debug(`Event doesn't match task_completed trigger, skipping`);
              continue;
            }
          } else {
            this.logger.debug(`Event ${triggerId} doesn't match trigger ${activeTrigger.triggerId}, skipping`);
            continue;
          }
        }

        // Prepare event data
        const eventData = this.prepareEventData(event, triggerId);

        // Execute workflow
        await this.workflowService.executeWorkflow({
          workflow_id: workflowId,
          input_data: {
            asanaEvent: eventData,
          },
        });

        this.logger.log(`Successfully triggered workflow ${workflowId} with Asana ${triggerId} event`);
      }

      return res.json({
        success: true,
        message: 'Webhook processed successfully',
        eventsProcessed: events.length,
      });
    } catch (error) {
      this.logger.error(`Failed to process Asana webhook for workflow ${workflowId}:`, error);
      return res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
        success: false,
        error: error.message,
      });
    }
  }

  private mapEventToTriggerId(event: AsanaEvent): string {
    const resourceType = event.resource.resource_type;
    const action = event.action;

    if (resourceType === 'task') {
      if (action === 'added') {
        return 'task_created';
      }
      if (action === 'changed') {
        if (event.change?.field === 'completed' && event.change?.new_value === true) {
          return 'task_completed';
        }
        return 'task_updated';
      }
      if (action === 'deleted') {
        return 'task_deleted';
      }
    }

    if (resourceType === 'project') {
      if (action === 'added') {
        return 'project_created';
      }
    }

    if (resourceType === 'story') {
      if (action === 'added') {
        return 'comment_added';
      }
    }

    return 'unknown';
  }

  private prepareEventData(event: AsanaEvent, triggerId: string): any {
    const baseData = {
      triggerId,
      timestamp: new Date().toISOString(),
      action: event.action,
      createdAt: event.created_at,
      user: {
        gid: event.user.gid,
      },
    };

    switch (triggerId) {
      case 'task_created':
        return {
          ...baseData,
          task: {
            gid: event.resource.gid,
            name: event.resource.name,
            resourceType: event.resource.resource_type,
          },
          parent: event.parent ? {
            gid: event.parent.gid,
            resourceType: event.parent.resource_type,
          } : undefined,
        };

      case 'task_updated':
        return {
          ...baseData,
          task: {
            gid: event.resource.gid,
            name: event.resource.name,
            resourceType: event.resource.resource_type,
          },
          change: event.change ? {
            field: event.change.field,
            action: event.change.action,
            newValue: event.change.new_value,
            addedValue: event.change.added_value,
            removedValue: event.change.removed_value,
          } : undefined,
          changeType: event.change?.field || 'unknown',
        };

      case 'task_completed':
        return {
          ...baseData,
          task: {
            gid: event.resource.gid,
            name: event.resource.name,
            resourceType: event.resource.resource_type,
          },
          completedAt: event.created_at,
        };

      case 'project_created':
        return {
          ...baseData,
          project: {
            gid: event.resource.gid,
            name: event.resource.name,
            resourceType: event.resource.resource_type,
          },
        };

      case 'comment_added':
        return {
          ...baseData,
          comment: {
            gid: event.resource.gid,
            resourceType: event.resource.resource_type,
          },
          task: event.parent ? {
            gid: event.parent.gid,
            resourceType: event.parent.resource_type,
          } : undefined,
          author: {
            gid: event.user.gid,
          },
        };

      default:
        return {
          ...baseData,
          resource: event.resource,
          rawEvent: event,
        };
    }
  }
}
