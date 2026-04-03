import {
  Controller,
  Post,
  Body,
  Param,
  HttpCode,
  HttpStatus,
  NotFoundException,
  Logger,
  Inject,
  forwardRef,
  Headers,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiParam } from '@nestjs/swagger';
import { WorkflowService } from '../../../workflow/workflow.service';

/**
 * Pipedrive Webhook Controller
 * Handles Pipedrive webhook events for workflow triggers
 *
 * Pipedrive webhook payload structure:
 * {
 *   "v": 1,
 *   "matches_filters": { "current": [], "previous": [] },
 *   "meta": {
 *     "v": 1,
 *     "action": "added|updated|deleted|merged",
 *     "object": "deal|person|organization|activity|note|pipeline|stage|product|user",
 *     "id": 123,
 *     "company_id": 456,
 *     "user_id": 789,
 *     "host": "yourcompany.pipedrive.com",
 *     "timestamp": 1234567890,
 *     "timestamp_micro": 1234567890123456,
 *     "permitted_user_ids": [789],
 *     "trans_pending": false,
 *     "is_bulk_update": false,
 *     "matches_filters": {},
 *     "webhook_id": "abc123"
 *   },
 *   "current": { ...object data... },
 *   "previous": { ...previous object data for updates... },
 *   "event": "added.deal",
 *   "retry": 0
 * }
 */
@ApiTags('webhooks')
@Controller('webhooks/pipedrive')
export class PipedriveWebhookController {
  private readonly logger = new Logger(PipedriveWebhookController.name);

  // Deduplication cache to prevent infinite loops
  // Key: eventKey (workflowId:objectId:action:timestamp), Value: timestamp when processed
  private readonly processedEvents = new Map<string, number>();
  private readonly EVENT_CACHE_TTL = 60000; // 60 seconds
  private readonly MAX_CACHE_SIZE = 1000;

  constructor(
    @Inject(forwardRef(() => WorkflowService))
    private readonly workflowService: WorkflowService,
  ) {
    // Clean up old events periodically
    setInterval(() => this.cleanupEventCache(), 30000);
  }

  /**
   * POST /webhooks/pipedrive/:workflowId
   * Pipedrive webhook endpoint for workflow triggers
   */
  @Post(':workflowId')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Receive Pipedrive webhook events',
    description: 'Endpoint that receives webhook events from Pipedrive',
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
    @Headers() headers: any,
  ) {
    const meta = payload?.meta || {};
    const eventAction = meta.action || 'unknown';
    // v2.0 uses "entity", v1 uses "object"
    const eventObject = meta.object || meta.entity || 'unknown';
    const eventType = `${eventAction}.${eventObject}`;

    this.logger.log(`Pipedrive webhook received: Event=${eventType}, Workflow=${workflowId}`);

    // Check if this event originated from API (our own workflow actions)
    // This prevents infinite loops when workflow creates/updates Pipedrive records
    // v2.0 uses meta.change_source, v1 uses current.origin
    const current = payload?.current || payload?.data || {};
    const changeSource = meta.change_source || current.origin;

    if (changeSource === 'api' || changeSource === 'API') {
      this.logger.log(`Skipping API-originated event to prevent loop: ${eventType}, objectId=${meta.id || meta.entity_id}`);
      return {
        success: true,
        message: 'Skipped API-originated event (prevents workflow loop)',
        skipped: true,
      };
    }

    // Generate unique event key for deduplication
    const eventKey = this.generateEventKey(workflowId, meta);

    // Check if this event was already processed (prevents infinite loops)
    if (this.isEventAlreadyProcessed(eventKey)) {
      this.logger.warn(`Duplicate event detected, skipping: ${eventKey}`);
      return {
        success: true,
        message: 'Event already processed (duplicate)',
        skipped: true,
      };
    }

    // Mark event as processed
    this.markEventAsProcessed(eventKey);

    try {
      // Validate the workflow exists
      const workflow = await this.workflowService.getWorkflow(workflowId);
      if (!workflow) {
        throw new NotFoundException('Workflow not found');
      }

      // Find the Pipedrive trigger node in workflow
      const pipedriveTrigger = this.findPipedriveTrigger(workflow, eventType);
      if (!pipedriveTrigger) {
        this.logger.warn(
          `Workflow ${workflowId} does not have a Pipedrive trigger for event: ${eventType}`,
        );
        return {
          success: false,
          message: `No trigger configured for event type: ${eventType}`,
        };
      }

      // Check if this event should trigger the workflow
      const shouldTrigger = this.shouldTriggerWorkflow(pipedriveTrigger, eventType, payload);

      if (!shouldTrigger) {
        return {
          success: true,
          message: 'Event received but did not match trigger conditions',
        };
      }

      // Prepare event data for workflow
      const eventData = this.prepareEventData(eventType, payload);

      this.logger.log(`Triggering workflow ${workflowId} for Pipedrive ${eventType} event`);

      // Execute the workflow with the event data
      const result = await this.workflowService.executeWorkflow({
        workflow_id: workflowId,
        input_data: {
          pipedriveEvent: eventData,
          triggeredAt: new Date().toISOString(),
          trigger: `pipedrive_${eventType.replace('.', '_')}`,
          eventType,
        },
      });

      return {
        success: true,
        message: 'Pipedrive event processed successfully',
        executionId: result.id,
      };
    } catch (error) {
      this.logger.error(`Failed to process Pipedrive webhook: ${error.message}`, error.stack);

      if (error instanceof NotFoundException) {
        throw error;
      }

      // Return 200 to Pipedrive even on errors (to avoid retries)
      return {
        success: false,
        message: `Error: ${error.message}`,
      };
    }
  }

  /**
   * Find Pipedrive trigger node in workflow for specific event type
   */
  private findPipedriveTrigger(workflow: any, eventType: string): any | null {
    const canvas = workflow.workflow?.canvas || workflow.canvas;

    if (!canvas || !canvas.nodes || canvas.nodes.length === 0) {
      this.logger.warn(`Workflow canvas is empty or missing nodes`);
      return null;
    }

    // Look for Pipedrive trigger nodes
    const triggers = canvas.nodes.filter(
      (node: any) =>
        node.type === 'PIPEDRIVE_TRIGGER' ||
        (node.type === 'CONNECTOR_TRIGGER' && node.data?.connectorType === 'pipedrive'),
    );

    this.logger.debug(`Found ${triggers.length} Pipedrive trigger nodes`);

    // Map Pipedrive event types to trigger IDs
    // Supports both v1 (added/updated/deleted) and v2 (create/change/delete) formats
    const eventToTriggerMap: Record<string, string> = {
      // Deal events - v1 format
      'added.deal': 'deal_created',
      'updated.deal': 'deal_updated',
      'deleted.deal': 'deal_deleted',
      'merged.deal': 'deal_merged',
      // Deal events - v2 format
      'create.deal': 'deal_created',
      'change.deal': 'deal_updated',
      'delete.deal': 'deal_deleted',
      // Person events - v1 format
      'added.person': 'person_created',
      'updated.person': 'person_updated',
      'deleted.person': 'person_deleted',
      // Person events - v2 format
      'create.person': 'person_created',
      'change.person': 'person_updated',
      'delete.person': 'person_deleted',
      // Organization events - v1 format
      'added.organization': 'organization_created',
      'updated.organization': 'organization_updated',
      'deleted.organization': 'organization_deleted',
      // Organization events - v2 format
      'create.organization': 'organization_created',
      'change.organization': 'organization_updated',
      'delete.organization': 'organization_deleted',
      // Activity events - v1 format
      'added.activity': 'activity_created',
      'updated.activity': 'activity_updated',
      'deleted.activity': 'activity_deleted',
      // Activity events - v2 format
      'create.activity': 'activity_created',
      'change.activity': 'activity_updated',
      'delete.activity': 'activity_deleted',
      // Note events - v1 format
      'added.note': 'note_created',
      'updated.note': 'note_updated',
      'deleted.note': 'note_deleted',
      // Note events - v2 format
      'create.note': 'note_created',
      'change.note': 'note_updated',
      'delete.note': 'note_deleted',
      // Pipeline/Stage events - v1 format
      'added.pipeline': 'pipeline_created',
      'added.stage': 'stage_created',
      // Pipeline/Stage events - v2 format
      'create.pipeline': 'pipeline_created',
      'create.stage': 'stage_created',
      // Product events - v1 format
      'added.product': 'product_created',
      'updated.product': 'product_updated',
      // Product events - v2 format
      'create.product': 'product_created',
      'change.product': 'product_updated',
      // User events - v1 format
      'added.user': 'user_created',
      // User events - v2 format
      'create.user': 'user_created',
    };

    const expectedTriggerId = eventToTriggerMap[eventType];

    // Find trigger that matches the event type
    for (const trigger of triggers) {
      const triggerId = trigger.data?.triggerId;

      // Direct match
      if (triggerId === expectedTriggerId) {
        return trigger;
      }

      // Wildcard "any event" trigger
      if (triggerId === 'any_event') {
        return trigger;
      }
    }

    // No match found
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
    const triggerParams = triggerNode.data?.triggerParams || triggerNode.data?.actionParams || {};

    // Filter by pipeline ID if specified (for deal events)
    if (triggerParams.pipelineId && eventType.includes('deal')) {
      const dealPipelineId = payload?.current?.pipeline_id;
      if (dealPipelineId && dealPipelineId.toString() !== triggerParams.pipelineId.toString()) {
        this.logger.log(
          `Deal pipeline ${dealPipelineId} does not match filter ${triggerParams.pipelineId}`,
        );
        return false;
      }
    }

    // Filter by stage ID if specified (for deal events)
    if (triggerParams.stageId && eventType.includes('deal')) {
      const dealStageId = payload?.current?.stage_id;
      if (dealStageId && dealStageId.toString() !== triggerParams.stageId.toString()) {
        this.logger.log(`Deal stage ${dealStageId} does not match filter ${triggerParams.stageId}`);
        return false;
      }
    }

    // Filter by user ID if specified
    if (triggerParams.userId) {
      const eventUserId = payload?.meta?.user_id || payload?.current?.user_id;
      if (eventUserId && eventUserId.toString() !== triggerParams.userId.toString()) {
        this.logger.log(`Event user ${eventUserId} does not match filter ${triggerParams.userId}`);
        return false;
      }
    }

    return true;
  }

  /**
   * Prepare event data in a structured format for the workflow
   */
  private prepareEventData(eventType: string, payload: any): any {
    const meta = payload?.meta || {};
    const current = payload?.current || {};
    const previous = payload?.previous || {};

    const [action, object] = eventType.split('.');

    const baseData = {
      eventType,
      action,
      object,
      timestamp: this.parseTimestamp(meta.timestamp),
      webhookId: meta.webhook_id,
      companyId: meta.company_id,
      userId: meta.user_id,
      objectId: meta.id,
      isBulkUpdate: meta.is_bulk_update || false,
    };

    // Add object-specific data based on entity type
    switch (object) {
      case 'deal':
        return {
          ...baseData,
          deal: {
            id: current.id,
            title: current.title,
            value: current.value,
            currency: current.currency,
            status: current.status,
            stage_id: current.stage_id,
            pipeline_id: current.pipeline_id,
            person_id: current.person_id,
            org_id: current.org_id,
            user_id: current.user_id,
            expected_close_date: current.expected_close_date,
            add_time: current.add_time,
            update_time: current.update_time,
            won_time: current.won_time,
            lost_time: current.lost_time,
            close_time: current.close_time,
            lost_reason: current.lost_reason,
            probability: current.probability,
            ...current,
          },
          previous: previous,
        };

      case 'person':
        return {
          ...baseData,
          person: {
            id: current.id,
            name: current.name,
            first_name: current.first_name,
            last_name: current.last_name,
            email: current.email,
            phone: current.phone,
            org_id: current.org_id,
            owner_id: current.owner_id,
            add_time: current.add_time,
            update_time: current.update_time,
            visible_to: current.visible_to,
            ...current,
          },
          previous: previous,
        };

      case 'organization':
        return {
          ...baseData,
          organization: {
            id: current.id,
            name: current.name,
            owner_id: current.owner_id,
            address: current.address,
            address_subpremise: current.address_subpremise,
            address_street_number: current.address_street_number,
            address_route: current.address_route,
            address_locality: current.address_locality,
            address_admin_area_level_1: current.address_admin_area_level_1,
            address_admin_area_level_2: current.address_admin_area_level_2,
            address_country: current.address_country,
            address_postal_code: current.address_postal_code,
            add_time: current.add_time,
            update_time: current.update_time,
            visible_to: current.visible_to,
            ...current,
          },
          previous: previous,
        };

      case 'activity':
        return {
          ...baseData,
          activity: {
            id: current.id,
            subject: current.subject,
            type: current.type,
            done: current.done,
            due_date: current.due_date,
            due_time: current.due_time,
            duration: current.duration,
            deal_id: current.deal_id,
            person_id: current.person_id,
            org_id: current.org_id,
            user_id: current.user_id,
            note: current.note,
            location: current.location,
            add_time: current.add_time,
            update_time: current.update_time,
            marked_as_done_time: current.marked_as_done_time,
            ...current,
          },
          previous: previous,
        };

      case 'note':
        return {
          ...baseData,
          note: {
            id: current.id,
            content: current.content,
            deal_id: current.deal_id,
            person_id: current.person_id,
            org_id: current.org_id,
            lead_id: current.lead_id,
            user_id: current.user_id,
            add_time: current.add_time,
            update_time: current.update_time,
            pinned_to_deal_flag: current.pinned_to_deal_flag,
            pinned_to_person_flag: current.pinned_to_person_flag,
            pinned_to_organization_flag: current.pinned_to_organization_flag,
            pinned_to_lead_flag: current.pinned_to_lead_flag,
            ...current,
          },
          previous: previous,
        };

      case 'pipeline':
        return {
          ...baseData,
          pipeline: {
            id: current.id,
            name: current.name,
            url_title: current.url_title,
            order_nr: current.order_nr,
            active: current.active,
            deal_probability: current.deal_probability,
            add_time: current.add_time,
            update_time: current.update_time,
            ...current,
          },
          previous: previous,
        };

      case 'stage':
        return {
          ...baseData,
          stage: {
            id: current.id,
            name: current.name,
            pipeline_id: current.pipeline_id,
            order_nr: current.order_nr,
            active_flag: current.active_flag,
            deal_probability: current.deal_probability,
            rotten_flag: current.rotten_flag,
            rotten_days: current.rotten_days,
            add_time: current.add_time,
            update_time: current.update_time,
            ...current,
          },
          previous: previous,
        };

      case 'product':
        return {
          ...baseData,
          product: {
            id: current.id,
            name: current.name,
            code: current.code,
            description: current.description,
            unit: current.unit,
            tax: current.tax,
            active_flag: current.active_flag,
            selectable: current.selectable,
            first_char: current.first_char,
            visible_to: current.visible_to,
            owner_id: current.owner_id,
            add_time: current.add_time,
            update_time: current.update_time,
            ...current,
          },
          previous: previous,
        };

      case 'user':
        return {
          ...baseData,
          user: {
            id: current.id,
            name: current.name,
            email: current.email,
            phone: current.phone,
            role_id: current.role_id,
            active_flag: current.active_flag,
            is_admin: current.is_admin,
            timezone_name: current.timezone_name,
            locale: current.locale,
            created: current.created,
            modified: current.modified,
            ...current,
          },
          previous: previous,
        };

      default:
        return {
          ...baseData,
          current: current,
          previous: previous,
          rawPayload: payload,
        };
    }
  }

  /**
   * Safely parse timestamp from Pipedrive webhook
   * Handles invalid/missing values gracefully
   */
  private parseTimestamp(timestamp: any): string {
    if (timestamp && typeof timestamp === 'number' && !isNaN(timestamp)) {
      try {
        return new Date(timestamp * 1000).toISOString();
      } catch {
        return new Date().toISOString();
      }
    }
    return new Date().toISOString();
  }

  /**
   * Generate event key for deduplication
   * Uses workflowId + object + objectId + action (without timestamp)
   * This prevents loops when workflow updates trigger new webhooks
   */
  private generateEventKey(workflowId: string, meta: any): string {
    // v2.0 uses entity_id and entity, v1 uses id and object
    const objectId = meta.id || meta.entity_id || 'unknown';
    const action = meta.action || 'unknown';
    const object = meta.object || meta.entity || 'unknown';
    // Don't include timestamp - we want to dedupe same object+action within TTL window
    return `${workflowId}:${object}:${objectId}:${action}`;
  }

  /**
   * Check if an event has already been processed
   */
  private isEventAlreadyProcessed(eventKey: string): boolean {
    const processedAt = this.processedEvents.get(eventKey);
    if (!processedAt) {
      return false;
    }
    // Check if the event is still within TTL
    return Date.now() - processedAt < this.EVENT_CACHE_TTL;
  }

  /**
   * Mark an event as processed
   */
  private markEventAsProcessed(eventKey: string): void {
    this.processedEvents.set(eventKey, Date.now());
  }

  /**
   * Clean up old events from cache to prevent memory leaks
   */
  private cleanupEventCache(): void {
    const now = Date.now();
    let deleted = 0;

    for (const [key, timestamp] of this.processedEvents.entries()) {
      if (now - timestamp > this.EVENT_CACHE_TTL) {
        this.processedEvents.delete(key);
        deleted++;
      }
    }

    // If still too large, remove oldest entries
    if (this.processedEvents.size > this.MAX_CACHE_SIZE) {
      const entries = Array.from(this.processedEvents.entries())
        .sort((a, b) => a[1] - b[1]);
      const toRemove = entries.slice(0, entries.length - this.MAX_CACHE_SIZE);
      for (const [key] of toRemove) {
        this.processedEvents.delete(key);
        deleted++;
      }
    }

    if (deleted > 0) {
      this.logger.debug(`Cleaned up ${deleted} old events from cache`);
    }
  }
}
