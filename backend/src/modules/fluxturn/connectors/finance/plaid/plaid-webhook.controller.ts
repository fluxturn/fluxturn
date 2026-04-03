// Plaid Webhook Controller
// Handles incoming webhook events from Plaid

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

// Plaid webhook event types
const WEBHOOK_EVENT_TO_TRIGGER: Record<string, string> = {
  // Transactions
  'TRANSACTIONS.SYNC_UPDATES_AVAILABLE': 'transactions_sync_updates',
  'TRANSACTIONS.INITIAL_UPDATE': 'transactions_initial_update',
  'TRANSACTIONS.HISTORICAL_UPDATE': 'transactions_historical_update',
  'TRANSACTIONS.DEFAULT_UPDATE': 'transactions_default_update',
  'TRANSACTIONS.TRANSACTIONS_REMOVED': 'transactions_removed',
  // Item
  'ITEM.ERROR': 'item_error',
  'ITEM.PENDING_EXPIRATION': 'item_pending_expiration',
  'ITEM.USER_PERMISSION_REVOKED': 'item_user_permission_revoked',
  'ITEM.WEBHOOK_UPDATE_ACKNOWLEDGED': 'item_webhook_update',
  // Auth
  'AUTH.AUTOMATICALLY_VERIFIED': 'auth_automatically_verified',
  'AUTH.VERIFICATION_EXPIRED': 'auth_verification_expired',
  'AUTH.DEFAULT_UPDATE': 'auth_default_update',
  // Holdings
  'HOLDINGS.DEFAULT_UPDATE': 'holdings_default_update',
  // Investments Transactions
  'INVESTMENTS_TRANSACTIONS.DEFAULT_UPDATE': 'investments_transactions_default_update',
  // Liabilities
  'LIABILITIES.DEFAULT_UPDATE': 'liabilities_default_update',
  // Income
  'INCOME.VERIFICATION_STATUS_UPDATED': 'income_verification_status_updated',
  // Assets
  'ASSETS.PRODUCT_READY': 'assets_product_ready',
  'ASSETS.ERROR': 'assets_error',
};

@ApiTags('webhooks')
@Controller('webhooks/plaid')
export class PlaidWebhookController {
  private readonly logger = new Logger(PlaidWebhookController.name);

  // Deduplication cache to prevent infinite loops and duplicate processing
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
  @ApiOperation({ summary: 'Receive Plaid webhook events' })
  @ApiResponse({ status: 200, description: 'Webhook processed successfully' })
  @ApiResponse({ status: 400, description: 'Invalid webhook payload' })
  async receiveWebhook(
    @Param('workflowId') workflowId: string,
    @Body() payload: any,
    @Headers() headers: any,
  ) {
    const webhookType = payload?.webhook_type || 'UNKNOWN';
    const webhookCode = payload?.webhook_code || 'UNKNOWN';
    const itemId = payload?.item_id || 'unknown';
    const eventType = `${webhookType}.${webhookCode}`;

    this.logger.log(`Plaid webhook received: Type=${webhookType}, Code=${webhookCode}, ItemId=${itemId}, Workflow=${workflowId}`);

    // Deduplication check using item_id and webhook_code
    const eventKey = this.generateEventKey(workflowId, payload);
    if (this.isEventAlreadyProcessed(eventKey)) {
      this.logger.warn(`Duplicate Plaid event detected, skipping: ${eventKey}`);
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

      // Map webhook event to trigger
      const triggerId = WEBHOOK_EVENT_TO_TRIGGER[eventType];
      if (!triggerId) {
        this.logger.warn(`Unknown Plaid webhook event type: ${eventType}`);
        // Still process unknown events but log them
      }

      // Prepare event data for workflow
      const eventData = {
        plaidEvent: this.prepareEventData(payload),
        triggeredAt: new Date().toISOString(),
        trigger: triggerId || `plaid_${webhookType.toLowerCase()}_${webhookCode.toLowerCase()}`,
        eventType,
        webhookType,
        webhookCode,
      };

      // Execute the workflow
      const result = await this.workflowService.executeWorkflow({
        workflow_id: workflowId,
        input_data: eventData,
      });

      this.logger.log(`Plaid webhook processed successfully. ExecutionId: ${result.id}`);

      return {
        success: true,
        message: 'Webhook processed successfully',
        executionId: result.id,
        triggerId,
      };
    } catch (error) {
      this.logger.error(`Plaid webhook processing error: ${error.message}`, error.stack);
      // Return 200 to prevent Plaid from retrying
      return {
        success: false,
        message: error.message,
      };
    }
  }

  // Generate unique event key for deduplication
  private generateEventKey(workflowId: string, payload: any): string {
    const itemId = payload?.item_id || 'unknown';
    const webhookType = payload?.webhook_type || 'unknown';
    const webhookCode = payload?.webhook_code || 'unknown';
    // For transaction webhooks, also include new_transactions count for better uniqueness
    const txCount = payload?.new_transactions || 0;
    return `${workflowId}:${itemId}:${webhookType}:${webhookCode}:${txCount}`;
  }

  private isEventAlreadyProcessed(eventKey: string): boolean {
    const processedAt = this.processedEvents.get(eventKey);
    if (!processedAt) return false;
    return Date.now() - processedAt < this.EVENT_CACHE_TTL;
  }

  private markEventAsProcessed(eventKey: string): void {
    // Clean up if cache is too large
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
      this.logger.debug(`Cleaned up ${deleted} expired Plaid events from cache`);
    }
  }

  // Prepare standardized event data
  private prepareEventData(payload: any): any {
    const webhookType = payload?.webhook_type || 'UNKNOWN';
    const webhookCode = payload?.webhook_code || 'UNKNOWN';

    const baseData = {
      webhook_type: webhookType,
      webhook_code: webhookCode,
      item_id: payload?.item_id,
      timestamp: new Date().toISOString(),
    };

    // Add type-specific fields
    switch (webhookType) {
      case 'TRANSACTIONS':
        return {
          ...baseData,
          new_transactions: payload?.new_transactions,
          removed_transactions: payload?.removed_transactions,
          initial_update_complete: payload?.initial_update_complete,
          historical_update_complete: payload?.historical_update_complete,
        };

      case 'ITEM':
        return {
          ...baseData,
          error: payload?.error,
          consent_expiration_time: payload?.consent_expiration_time,
          new_webhook: payload?.new_webhook,
        };

      case 'AUTH':
        return {
          ...baseData,
          account_id: payload?.account_id,
        };

      case 'HOLDINGS':
      case 'INVESTMENTS_TRANSACTIONS':
        return {
          ...baseData,
          updated_datetime: payload?.updated_datetime,
        };

      case 'LIABILITIES':
        return {
          ...baseData,
          account_ids_with_updated_liabilities: payload?.account_ids_with_updated_liabilities,
        };

      case 'INCOME':
        return {
          ...baseData,
          user_id: payload?.user_id,
          verification_status: payload?.verification_status,
        };

      case 'ASSETS':
        return {
          ...baseData,
          asset_report_id: payload?.asset_report_id,
        };

      default:
        return {
          ...baseData,
          raw_payload: payload,
        };
    }
  }
}
