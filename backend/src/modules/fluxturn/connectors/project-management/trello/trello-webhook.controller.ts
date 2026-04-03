import {
  Controller,
  Post,
  Head,
  Body,
  Param,
  HttpCode,
  HttpStatus,
  NotFoundException,
  Logger,
  Inject,
  forwardRef,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiParam } from '@nestjs/swagger';
import { WorkflowService } from '../../../workflow/workflow.service';

/**
 * Trello Webhook Controller
 * Handles Trello webhook events for workflow triggers
 *
 * Supported events:
 * - createCard: Card created on board
 * - updateCard: Card updated (moved, edited, etc.)
 * - deleteCard: Card deleted
 * - addMemberToCard: Member added to card
 * - createList: List created
 * - updateList: List updated
 * - createBoard: Board created
 * - addMemberToBoard: Member added to board
 * - commentCard: Comment added to card
 */
@ApiTags('webhooks')
@Controller('webhooks/trello')
export class TrelloWebhookController {
  private readonly logger = new Logger(TrelloWebhookController.name);

  constructor(
    @Inject(forwardRef(() => WorkflowService))
    private readonly workflowService: WorkflowService,
  ) {}

  /**
   * HEAD /webhooks/trello/:workflowId
   * Trello sends a HEAD request to verify the webhook URL is valid
   */
  @Head(':workflowId')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Verify Trello webhook endpoint',
    description: 'Trello sends HEAD request to verify webhook URL',
  })
  @ApiParam({ name: 'workflowId', description: 'The workflow ID' })
  async verifyWebhook(@Param('workflowId') workflowId: string) {
    this.logger.log(`Trello webhook verification request for workflow: ${workflowId}`);
    // Return 200 OK to confirm the endpoint exists
    return;
  }

  /**
   * POST /webhooks/trello/:workflowId
   * Trello webhook endpoint for workflow triggers
   */
  @Post(':workflowId')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Receive Trello webhook events',
    description: 'Endpoint that receives webhook events from Trello',
  })
  @ApiParam({ name: 'workflowId', description: 'The workflow ID to trigger' })
  @ApiResponse({
    status: 200,
    description: 'Webhook received and workflow triggered',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean' },
        message: { type: 'string' },
        executionId: { type: 'string' },
      },
    },
  })
  async receiveWebhook(
    @Param('workflowId') workflowId: string,
    @Body() payload: any,
  ) {
    const eventType = payload?.action?.type || 'unknown';
    this.logger.log(`Trello webhook received: Event=${eventType}, Workflow=${workflowId}`);

    try {
      // Validate the workflow exists
      const workflow = await this.workflowService.getWorkflow(workflowId);
      if (!workflow) {
        throw new NotFoundException('Workflow not found');
      }

      // Find the Trello trigger node in workflow
      const trelloTrigger = this.findTrelloTrigger(workflow, eventType);
      if (!trelloTrigger) {
        this.logger.warn(
          `Workflow ${workflowId} does not have a Trello trigger for event: ${eventType}`,
        );
        return {
          success: false,
          message: `No trigger configured for event type: ${eventType}`,
        };
      }

      // Check if this event should trigger the workflow
      const shouldTrigger = this.shouldTriggerWorkflow(trelloTrigger, eventType, payload);

      if (!shouldTrigger) {
        return {
          success: true,
          message: 'Event received but did not match trigger conditions',
        };
      }

      // Prepare event data for workflow
      const eventData = this.prepareEventData(eventType, payload);

      this.logger.log(`Triggering workflow ${workflowId} for Trello ${eventType} event`);

      // Execute the workflow with the event data
      const result = await this.workflowService.executeWorkflow({
        workflow_id: workflowId,
        input_data: {
          trelloEvent: eventData,
          triggeredAt: new Date().toISOString(),
          trigger: `trello_${eventType}`,
          eventType,
        },
      });

      return {
        success: true,
        message: 'Trello event processed successfully',
        executionId: result.id,
      };
    } catch (error) {
      this.logger.error(`Failed to process Trello webhook: ${error.message}`, error.stack);

      if (error instanceof NotFoundException) {
        throw error;
      }

      // Return 200 to Trello even on errors (to avoid retries)
      return {
        success: false,
        message: `Error: ${error.message}`,
      };
    }
  }

  /**
   * Find Trello trigger node in workflow for specific event type
   */
  private findTrelloTrigger(workflow: any, eventType: string): any | null {
    const canvas = workflow.workflow?.canvas || workflow.canvas;

    if (!canvas || !canvas.nodes || canvas.nodes.length === 0) {
      this.logger.warn(`Workflow canvas is empty or missing nodes`);
      return null;
    }

    // Look for Trello trigger nodes
    const triggers = canvas.nodes.filter(
      (node: any) =>
        node.type === 'TRELLO_TRIGGER' ||
        (node.type === 'CONNECTOR_TRIGGER' && node.data?.connectorType === 'trello'),
    );

    this.logger.debug(`Found ${triggers.length} Trello trigger nodes`);

    // Map Trello action types to trigger IDs
    const eventToTriggerMap: Record<string, string> = {
      createCard: 'card_created',
      updateCard: 'card_updated',
      deleteCard: 'card_deleted',
      addMemberToCard: 'member_added_to_card',
      removeMemberFromCard: 'member_removed_from_card',
      moveCardToBoard: 'card_moved',
      moveCardFromBoard: 'card_moved',
      createList: 'list_created',
      updateList: 'list_updated',
      moveListToBoard: 'list_moved',
      moveListFromBoard: 'list_moved',
      commentCard: 'comment_added',
      addChecklistToCard: 'checklist_added',
      updateCheckItemStateOnCard: 'checklist_item_completed',
      addLabelToCard: 'label_added',
      removeLabelFromCard: 'label_removed',
      addAttachmentToCard: 'attachment_added',
    };

    // Find trigger that matches the event type
    for (const trigger of triggers) {
      const triggerId = trigger.data?.triggerId;

      // Direct match
      if (eventToTriggerMap[eventType] === triggerId) {
        return trigger;
      }

      // Generic "any card event" trigger
      if (triggerId === 'any_card_event' && eventType.includes('Card')) {
        return trigger;
      }

      // Generic "any board event" trigger
      if (triggerId === 'any_board_event') {
        return trigger;
      }
    }

    // No match found - do NOT fallback to avoid infinite loops
    // Only trigger for explicitly configured event types
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

    // Filter by board ID if specified
    if (triggerParams.boardId) {
      const eventBoardId = payload?.model?.id || payload?.action?.data?.board?.id;
      if (eventBoardId && eventBoardId !== triggerParams.boardId) {
        this.logger.log(`Event from board ${eventBoardId} does not match filter ${triggerParams.boardId}`);
        return false;
      }
    }

    // Filter by list ID if specified
    if (triggerParams.listId) {
      const eventListId = payload?.action?.data?.list?.id || payload?.action?.data?.listAfter?.id;
      if (eventListId && eventListId !== triggerParams.listId) {
        this.logger.log(`Event from list ${eventListId} does not match filter ${triggerParams.listId}`);
        return false;
      }
    }

    return true;
  }

  /**
   * Prepare event data in a structured format for the workflow
   */
  private prepareEventData(eventType: string, payload: any): any {
    const action = payload?.action || {};
    const model = payload?.model || {};

    const baseData = {
      eventType,
      timestamp: action?.date || new Date().toISOString(),
      board: {
        id: model?.id || action?.data?.board?.id,
        name: model?.name || action?.data?.board?.name,
        url: model?.url,
      },
      member: action?.memberCreator
        ? {
            id: action.memberCreator.id,
            fullName: action.memberCreator.fullName,
            username: action.memberCreator.username,
            avatarUrl: action.memberCreator.avatarUrl,
          }
        : null,
    };

    // Add event-specific data
    switch (eventType) {
      case 'createCard':
      case 'updateCard':
      case 'deleteCard':
        return {
          ...baseData,
          card: {
            id: action?.data?.card?.id,
            name: action?.data?.card?.name,
            desc: action?.data?.card?.desc,
            shortLink: action?.data?.card?.shortLink,
            url: action?.data?.card?.id
              ? `https://trello.com/c/${action.data.card.shortLink}`
              : null,
          },
          list: action?.data?.list
            ? {
                id: action.data.list.id,
                name: action.data.list.name,
              }
            : action?.data?.listAfter
            ? {
                id: action.data.listAfter.id,
                name: action.data.listAfter.name,
              }
            : null,
          listBefore: action?.data?.listBefore
            ? {
                id: action.data.listBefore.id,
                name: action.data.listBefore.name,
              }
            : null,
          old: action?.data?.old || null,
        };

      case 'commentCard':
        return {
          ...baseData,
          card: {
            id: action?.data?.card?.id,
            name: action?.data?.card?.name,
            shortLink: action?.data?.card?.shortLink,
          },
          comment: {
            text: action?.data?.text,
          },
        };

      case 'addMemberToCard':
      case 'removeMemberFromCard':
        return {
          ...baseData,
          card: {
            id: action?.data?.card?.id,
            name: action?.data?.card?.name,
          },
          addedMember: action?.data?.member
            ? {
                id: action.data.member.id,
                name: action.data.member.name,
              }
            : null,
        };

      case 'createList':
      case 'updateList':
        return {
          ...baseData,
          list: {
            id: action?.data?.list?.id,
            name: action?.data?.list?.name,
          },
        };

      case 'addChecklistToCard':
      case 'updateCheckItemStateOnCard':
        return {
          ...baseData,
          card: {
            id: action?.data?.card?.id,
            name: action?.data?.card?.name,
          },
          checklist: {
            id: action?.data?.checklist?.id,
            name: action?.data?.checklist?.name,
          },
          checkItem: action?.data?.checkItem
            ? {
                id: action.data.checkItem.id,
                name: action.data.checkItem.name,
                state: action.data.checkItem.state,
              }
            : null,
        };

      case 'addLabelToCard':
      case 'removeLabelFromCard':
        return {
          ...baseData,
          card: {
            id: action?.data?.card?.id,
            name: action?.data?.card?.name,
          },
          label: {
            id: action?.data?.label?.id,
            name: action?.data?.label?.name,
            color: action?.data?.label?.color,
          },
        };

      default:
        return {
          ...baseData,
          rawAction: action,
          rawModel: model,
        };
    }
  }
}
