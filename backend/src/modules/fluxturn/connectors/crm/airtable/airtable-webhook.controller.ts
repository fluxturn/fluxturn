/**
 * Airtable Webhook Controller
 *
 * Handles incoming webhook events from Airtable.
 * Airtable webhooks can send various event types for record changes.
 *
 * Webhook Event Types:
 * - created: New record created
 * - changed: Record was updated
 * - destroyed: Record was deleted
 */

import {
  Controller,
  Post,
  Body,
  Param,
  HttpCode,
  HttpStatus,
  Logger,
  Inject,
  forwardRef,
  Headers,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { WorkflowService } from '../../../workflow/workflow.service';

// Airtable webhook event to trigger ID mapping
const WEBHOOK_EVENT_TO_TRIGGER: Record<string, string> = {
  // Record events
  'created': 'record_created',
  'changed': 'record_updated',
  'destroyed': 'record_deleted',
  // Alternative event formats
  'airtable:record_created': 'record_created',
  'airtable:record_updated': 'record_updated',
  'airtable:record_deleted': 'record_deleted',
};

@ApiTags('webhooks')
@Controller('webhooks/airtable')
export class AirtableWebhookController {
  private readonly logger = new Logger(AirtableWebhookController.name);

  // Deduplication cache to prevent duplicate processing
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

  @Post(':workflowId')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Receive Airtable webhook events' })
  @ApiResponse({ status: 200, description: 'Webhook processed successfully' })
  @ApiResponse({ status: 400, description: 'Invalid webhook payload' })
  async receiveWebhook(
    @Param('workflowId') workflowId: string,
    @Body() payload: any,
    @Headers() headers: any,
  ) {
    // Airtable sends webhook payloads with base, webhook info and changed data
    const webhookId = payload?.webhook?.id || headers['x-airtable-webhook-id'] || `${Date.now()}`;
    const baseId = payload?.base?.id || 'unknown';

    this.logger.log(`Airtable webhook received: WebhookId=${webhookId}, BaseId=${baseId}, Workflow=${workflowId}`);

    // Handle webhook verification (ping)
    if (payload?.ping) {
      this.logger.log('Airtable webhook ping received');
      return { success: true, message: 'Webhook verified' };
    }

    // Deduplication check using cursor
    const cursor = payload?.cursor || webhookId;
    const eventKey = this.generateEventKey(workflowId, cursor, webhookId);
    if (this.isEventAlreadyProcessed(eventKey)) {
      this.logger.warn(`Duplicate Airtable event detected, skipping: ${eventKey}`);
      return { success: true, message: 'Duplicate event', skipped: true };
    }
    this.markEventAsProcessed(eventKey);

    try {
      // Get the workflow
      const workflow = await this.workflowService.getWorkflow(workflowId);
      if (!workflow) {
        this.logger.warn(`Workflow not found: ${workflowId}`);
        return { success: false, message: 'Workflow not found' };
      }

      // Check if workflow is active
      if (!workflow.is_active) {
        this.logger.log(`Workflow ${workflowId} is not active, skipping webhook`);
        return { success: true, message: 'Workflow not active', skipped: true };
      }

      // Process the payload
      const eventData = this.prepareEventData(payload);

      // Execute the workflow
      const result = await this.workflowService.executeWorkflow({
        workflow_id: workflowId,
        input_data: eventData,
      });

      this.logger.log(`Airtable webhook processed successfully. ExecutionId: ${result.id}`);

      return {
        success: true,
        message: 'Webhook processed successfully',
        executionId: result.id,
        triggerId: eventData.trigger,
      };
    } catch (error) {
      this.logger.error(`Airtable webhook processing error: ${error.message}`, error.stack);
      // Return 200 to prevent Airtable from retrying indefinitely
      return {
        success: false,
        message: error.message,
      };
    }
  }

  /**
   * Generate unique event key for deduplication
   */
  private generateEventKey(workflowId: string, cursor: string, webhookId: string): string {
    return `${workflowId}:${cursor}:${webhookId}`;
  }

  private isEventAlreadyProcessed(eventKey: string): boolean {
    const processedAt = this.processedEvents.get(eventKey);
    if (!processedAt) return false;
    return Date.now() - processedAt < this.EVENT_CACHE_TTL;
  }

  private markEventAsProcessed(eventKey: string): void {
    if (this.processedEvents.size >= this.MAX_CACHE_SIZE) {
      this.cleanupEventCache();
    }
    this.processedEvents.set(eventKey, Date.now());
  }

  private cleanupEventCache(): void {
    const now = Date.now();
    let deleted = 0;
    for (const [key, timestamp] of this.processedEvents.entries()) {
      if (now - timestamp > this.EVENT_CACHE_TTL) {
        this.processedEvents.delete(key);
        deleted++;
      }
    }
    if (deleted > 0) {
      this.logger.debug(`Cleaned up ${deleted} expired Airtable events from cache`);
    }
  }

  /**
   * Prepare standardized event data from Airtable webhook payload
   */
  private prepareEventData(payload: any): any {
    const baseData = {
      triggeredAt: new Date().toISOString(),
      webhookId: payload?.webhook?.id,
      baseId: payload?.base?.id,
      cursor: payload?.cursor,
      timestamp: payload?.timestamp || new Date().toISOString(),
    };

    // Airtable sends payloads with changedTablesById containing the changes
    const changedTables = payload?.changedTablesById || {};
    const tableIds = Object.keys(changedTables);

    if (tableIds.length === 0) {
      return {
        ...baseData,
        trigger: 'airtable_webhook',
        eventType: 'unknown',
        airtableEvent: payload,
      };
    }

    // Process each table's changes
    const allChanges: any[] = [];
    let primaryTrigger = 'record_updated';

    for (const tableId of tableIds) {
      const tableChanges = changedTables[tableId];

      // Process created records
      if (tableChanges.createdRecordsById) {
        const records = Object.entries(tableChanges.createdRecordsById).map(([recordId, record]: [string, any]) => ({
          id: recordId,
          action: 'created',
          tableId,
          fields: record?.cellValuesByFieldId || {},
          createdTime: record?.createdTime,
        }));
        if (records.length > 0) {
          primaryTrigger = 'record_created';
          allChanges.push(...records);
        }
      }

      // Process changed records
      if (tableChanges.changedRecordsById) {
        const records = Object.entries(tableChanges.changedRecordsById).map(([recordId, record]: [string, any]) => ({
          id: recordId,
          action: 'changed',
          tableId,
          current: record?.current?.cellValuesByFieldId || {},
          previous: record?.previous?.cellValuesByFieldId || {},
          unchangedFields: record?.unchanged?.cellValuesByFieldId || {},
        }));
        if (records.length > 0 && primaryTrigger !== 'record_created') {
          primaryTrigger = 'record_updated';
        }
        allChanges.push(...records);
      }

      // Process destroyed records
      if (tableChanges.destroyedRecordIds) {
        const records = tableChanges.destroyedRecordIds.map((recordId: string) => ({
          id: recordId,
          action: 'destroyed',
          tableId,
        }));
        if (records.length > 0 && primaryTrigger !== 'record_created') {
          primaryTrigger = 'record_deleted';
        }
        allChanges.push(...records);
      }

      // Process changed metadata
      if (tableChanges.changedMetadata) {
        allChanges.push({
          action: 'metadata_changed',
          tableId,
          metadata: tableChanges.changedMetadata,
        });
      }
    }

    // Determine the event type based on what changed
    let eventType = 'airtable:record_updated';
    if (allChanges.some(c => c.action === 'created')) {
      eventType = 'airtable:record_created';
    } else if (allChanges.every(c => c.action === 'destroyed')) {
      eventType = 'airtable:record_deleted';
    }

    return {
      ...baseData,
      trigger: primaryTrigger,
      eventType,
      changes: allChanges,
      tableIds,
      airtableEvent: {
        base: payload?.base,
        webhook: payload?.webhook,
        changedTablesById: changedTables,
      },
    };
  }
}
