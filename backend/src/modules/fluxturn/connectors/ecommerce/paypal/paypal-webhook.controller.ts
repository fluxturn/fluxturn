/**
 * PayPal Webhook Controller
 *
 * Handles incoming webhook events from PayPal.
 * PayPal can send various event types for payments, subscriptions, payouts, etc.
 *
 * Webhook Event Types:
 * - PAYMENT.CAPTURE.COMPLETED: Payment capture completed
 * - PAYMENT.CAPTURE.DENIED: Payment capture denied
 * - CHECKOUT.ORDER.APPROVED: Checkout order approved
 * - BILLING.SUBSCRIPTION.ACTIVATED: Subscription activated
 * - PAYMENT.PAYOUTSBATCH.SUCCESS: Payout batch succeeded
 * - And many more...
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

// PayPal webhook event type categories
const WEBHOOK_EVENT_CATEGORIES: Record<string, string> = {
  // Payment events
  'PAYMENT.CAPTURE.COMPLETED': 'payment_completed',
  'PAYMENT.CAPTURE.DENIED': 'payment_denied',
  'PAYMENT.CAPTURE.PENDING': 'payment_pending',
  'PAYMENT.CAPTURE.REFUNDED': 'payment_refunded',
  'PAYMENT.CAPTURE.REVERSED': 'payment_reversed',
  // Order events
  'CHECKOUT.ORDER.APPROVED': 'order_approved',
  'CHECKOUT.ORDER.COMPLETED': 'order_completed',
  // Subscription events
  'BILLING.SUBSCRIPTION.ACTIVATED': 'subscription_activated',
  'BILLING.SUBSCRIPTION.CANCELLED': 'subscription_cancelled',
  'BILLING.SUBSCRIPTION.CREATED': 'subscription_created',
  'BILLING.SUBSCRIPTION.EXPIRED': 'subscription_expired',
  'BILLING.SUBSCRIPTION.SUSPENDED': 'subscription_suspended',
  'BILLING.SUBSCRIPTION.UPDATED': 'subscription_updated',
  // Payout events
  'PAYMENT.PAYOUTSBATCH.SUCCESS': 'payout_success',
  'PAYMENT.PAYOUTSBATCH.DENIED': 'payout_denied',
};

@ApiTags('webhooks')
@Controller('webhooks/paypal')
export class PayPalWebhookController {
  private readonly logger = new Logger(PayPalWebhookController.name);

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
  @ApiOperation({ summary: 'Receive PayPal webhook events' })
  @ApiResponse({ status: 200, description: 'Webhook processed successfully' })
  @ApiResponse({ status: 400, description: 'Invalid webhook payload' })
  async receiveWebhook(
    @Param('workflowId') workflowId: string,
    @Body() payload: any,
    @Headers() headers: any,
  ) {
    const eventType = payload?.event_type || 'unknown';
    const eventId = payload?.id || `${Date.now()}`;
    const resourceType = payload?.resource_type || 'unknown';

    this.logger.log(`PayPal webhook received: Type=${eventType}, EventId=${eventId}, ResourceType=${resourceType}, Workflow=${workflowId}`);

    // Deduplication check
    const eventKey = this.generateEventKey(workflowId, eventId, eventType);
    if (this.isEventAlreadyProcessed(eventKey)) {
      this.logger.warn(`Duplicate PayPal event detected, skipping: ${eventKey}`);
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

      // Map event type to category
      const triggerId = WEBHOOK_EVENT_CATEGORIES[eventType] || `paypal_${eventType.toLowerCase().replace(/\./g, '_')}`;

      // Prepare event data for workflow
      const eventData = {
        paypalEvent: this.prepareEventData(payload),
        triggeredAt: new Date().toISOString(),
        trigger: triggerId,
        eventType,
        eventId,
        resourceType,
      };

      // Execute the workflow
      const result = await this.workflowService.executeWorkflow({
        workflow_id: workflowId,
        input_data: eventData,
      });

      this.logger.log(`PayPal webhook processed successfully. ExecutionId: ${result.id}`);

      return {
        success: true,
        message: 'Webhook processed successfully',
        executionId: result.id,
        triggerId,
      };
    } catch (error) {
      this.logger.error(`PayPal webhook processing error: ${error.message}`, error.stack);
      // Return 200 to prevent PayPal from retrying indefinitely
      return {
        success: false,
        message: error.message,
      };
    }
  }

  /**
   * Generate unique event key for deduplication
   */
  private generateEventKey(workflowId: string, eventId: string, eventType: string): string {
    return `${workflowId}:${eventId}:${eventType}`;
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
      this.logger.debug(`Cleaned up ${deleted} expired PayPal events from cache`);
    }
  }

  /**
   * Prepare standardized event data from PayPal webhook payload
   */
  private prepareEventData(payload: any): any {
    const baseData = {
      id: payload.id,
      event_type: payload.event_type,
      create_time: payload.create_time,
      resource_type: payload.resource_type,
      event_version: payload.event_version,
      summary: payload.summary,
    };

    // Handle payment events
    if (payload.event_type?.startsWith('PAYMENT.CAPTURE')) {
      return {
        ...baseData,
        payment: {
          id: payload.resource?.id,
          status: payload.resource?.status,
          amount: payload.resource?.amount,
          final_capture: payload.resource?.final_capture,
          create_time: payload.resource?.create_time,
          update_time: payload.resource?.update_time,
        },
        links: payload.resource?.links,
      };
    }

    // Handle order events
    if (payload.event_type?.startsWith('CHECKOUT.ORDER')) {
      return {
        ...baseData,
        order: {
          id: payload.resource?.id,
          status: payload.resource?.status,
          intent: payload.resource?.intent,
          purchase_units: payload.resource?.purchase_units,
          payer: payload.resource?.payer,
          create_time: payload.resource?.create_time,
          update_time: payload.resource?.update_time,
        },
        links: payload.resource?.links,
      };
    }

    // Handle subscription events
    if (payload.event_type?.startsWith('BILLING.SUBSCRIPTION')) {
      return {
        ...baseData,
        subscription: {
          id: payload.resource?.id,
          plan_id: payload.resource?.plan_id,
          status: payload.resource?.status,
          status_update_time: payload.resource?.status_update_time,
          subscriber: payload.resource?.subscriber,
          billing_info: payload.resource?.billing_info,
          create_time: payload.resource?.create_time,
          update_time: payload.resource?.update_time,
        },
        links: payload.resource?.links,
      };
    }

    // Handle payout events
    if (payload.event_type?.startsWith('PAYMENT.PAYOUTSBATCH')) {
      return {
        ...baseData,
        payout: {
          batch_header: payload.resource?.batch_header,
          items: payload.resource?.items,
        },
        links: payload.resource?.links,
      };
    }

    // Default: return raw resource
    return {
      ...baseData,
      resource: payload.resource,
      links: payload.links,
    };
  }
}
