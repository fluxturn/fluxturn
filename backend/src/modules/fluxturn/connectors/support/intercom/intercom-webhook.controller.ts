/**
 * Intercom Webhook Controller
 *
 * Handles incoming webhook events from Intercom.
 * Intercom sends various event types for conversations, users, and more.
 *
 * Webhook Topics:
 * - conversation.user.created: New conversation created by user
 * - conversation.user.replied: User replied to conversation
 * - conversation.admin.replied: Admin replied to conversation
 * - conversation.admin.closed: Conversation closed by admin
 * - conversation.admin.opened: Conversation reopened by admin
 * - conversation.admin.assigned: Conversation assigned to admin/team
 * - conversation.admin.snoozed: Conversation snoozed
 * - conversation.admin.unsnoozed: Conversation unsnoozed
 * - contact.user.created: New user/contact created
 * - contact.user.deleted: User/contact deleted
 * - contact.tag.created: Tag added to contact
 * - contact.tag.deleted: Tag removed from contact
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

// Intercom webhook event to trigger ID mapping
const WEBHOOK_EVENT_TO_TRIGGER: Record<string, string> = {
  // Conversation events
  'conversation.user.created': 'conversation_opened',
  'conversation.user.replied': 'conversation_replied',
  'conversation.admin.replied': 'conversation_replied',
  'conversation.admin.closed': 'conversation_closed',
  'conversation.admin.opened': 'conversation_opened',
  'conversation.admin.assigned': 'conversation_assigned',
  'conversation.admin.snoozed': 'conversation_snoozed',
  'conversation.admin.unsnoozed': 'conversation_unsnoozed',
  'conversation.admin.noted': 'conversation_noted',
  // User/Contact events
  'contact.user.created': 'user_created',
  'contact.user.deleted': 'user_deleted',
  'contact.tag.created': 'user_tag_added',
  'contact.tag.deleted': 'user_tag_removed',
  'user.created': 'user_created',
  'user.deleted': 'user_deleted',
  'user.tag.created': 'user_tag_added',
  'user.tag.deleted': 'user_tag_removed',
  'contact.user.unsubscribed': 'user_unsubscribed',
  'user.unsubscribed': 'user_unsubscribed',
  // Company events
  'company.created': 'company_created',
  // Lead events
  'contact.lead.created': 'lead_created',
  'contact.lead.converted': 'lead_converted',
  'visitor.signed_up': 'visitor_signed_up',
};

@ApiTags('webhooks')
@Controller('webhooks/intercom')
export class IntercomWebhookController {
  private readonly logger = new Logger(IntercomWebhookController.name);

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
  @ApiOperation({ summary: 'Receive Intercom webhook events' })
  @ApiResponse({ status: 200, description: 'Webhook processed successfully' })
  @ApiResponse({ status: 400, description: 'Invalid webhook payload' })
  async receiveWebhook(
    @Param('workflowId') workflowId: string,
    @Body() payload: any,
    @Headers() headers: any,
  ) {
    const topic = payload?.topic || 'unknown';
    const appId = payload?.app_id || 'unknown';
    const deliveryId = payload?.id || `${Date.now()}`;

    this.logger.log(`Intercom webhook received: Topic=${topic}, AppId=${appId}, Workflow=${workflowId}`);

    // Deduplication check
    const eventKey = this.generateEventKey(workflowId, payload);
    if (this.isEventAlreadyProcessed(eventKey)) {
      this.logger.warn(`Duplicate Intercom event detected, skipping: ${eventKey}`);
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
      const triggerId = WEBHOOK_EVENT_TO_TRIGGER[topic];
      if (!triggerId) {
        this.logger.warn(`Unknown Intercom webhook topic: ${topic}`);
      }

      // Prepare event data for workflow
      const eventData = {
        intercomEvent: this.prepareEventData(payload),
        triggeredAt: new Date().toISOString(),
        trigger: triggerId || `intercom_${topic.replace(/\./g, '_')}`,
        topic,
        deliveryId,
      };

      // Execute the workflow
      const result = await this.workflowService.executeWorkflow({
        workflow_id: workflowId,
        input_data: eventData,
      });

      this.logger.log(`Intercom webhook processed successfully. ExecutionId: ${result.id}`);

      return {
        success: true,
        message: 'Webhook processed successfully',
        executionId: result.id,
        triggerId,
      };
    } catch (error) {
      this.logger.error(`Intercom webhook processing error: ${error.message}`, error.stack);
      // Return 200 to prevent Intercom from retrying indefinitely
      return {
        success: false,
        message: error.message,
      };
    }
  }

  /**
   * Verify webhook signature from Intercom
   * Note: Implement this if using Intercom's webhook signature verification
   */
  private verifyWebhookSignature(payload: any, signature: string, secret: string): boolean {
    // Intercom uses HMAC-SHA1 for webhook signatures
    // Implement verification if needed for security
    // const crypto = require('crypto');
    // const computedSignature = crypto
    //   .createHmac('sha1', secret)
    //   .update(JSON.stringify(payload))
    //   .digest('hex');
    // return signature === computedSignature;
    return true;
  }

  /**
   * Generate unique event key for deduplication
   */
  private generateEventKey(workflowId: string, payload: any): string {
    const topic = payload?.topic || 'unknown';
    const deliveryId = payload?.id || 'unknown';
    const dataId = payload?.data?.item?.id || payload?.data?.id || 'unknown';
    return `${workflowId}:${topic}:${deliveryId}:${dataId}`;
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
      this.logger.debug(`Cleaned up ${deleted} expired Intercom events from cache`);
    }
  }

  /**
   * Prepare standardized event data from Intercom webhook payload
   */
  private prepareEventData(payload: any): any {
    const topic = payload?.topic || 'unknown';
    const data = payload?.data?.item || payload?.data || {};

    const baseData = {
      topic,
      app_id: payload?.app_id,
      delivery_id: payload?.id,
      delivery_status: payload?.delivery_status,
      delivery_attempts: payload?.delivery_attempts,
      first_sent_at: payload?.first_sent_at,
      created_at: payload?.created_at,
      timestamp: new Date().toISOString(),
    };

    // Handle conversation events
    if (topic.startsWith('conversation.')) {
      return {
        ...baseData,
        conversation: {
          id: data.id,
          type: data.type,
          state: data.state,
          created_at: data.created_at,
          updated_at: data.updated_at,
          waiting_since: data.waiting_since,
          snoozed_until: data.snoozed_until,
          source: data.source,
          contacts: data.contacts,
          teammates: data.teammates,
          assignee: data.assignee,
          conversation_message: data.conversation_message,
          conversation_parts: data.conversation_parts,
          open: data.open,
          read: data.read,
          tags: data.tags,
          priority: data.priority,
        },
      };
    }

    // Handle user/contact events
    if (topic.startsWith('contact.') || topic.startsWith('user.')) {
      return {
        ...baseData,
        user: {
          id: data.id,
          type: data.type,
          user_id: data.user_id,
          email: data.email,
          name: data.name,
          phone: data.phone,
          role: data.role,
          created_at: data.created_at,
          updated_at: data.updated_at,
          signed_up_at: data.signed_up_at,
          last_seen_at: data.last_seen_at,
          last_contacted_at: data.last_contacted_at,
          last_email_opened_at: data.last_email_opened_at,
          last_email_clicked_at: data.last_email_clicked_at,
          language_override: data.language_override,
          browser: data.browser,
          browser_language: data.browser_language,
          os: data.os,
          location_data: data.location_data,
          custom_attributes: data.custom_attributes,
          tags: data.tags,
          companies: data.companies,
          social_profiles: data.social_profiles,
          unsubscribed_from_emails: data.unsubscribed_from_emails,
          marked_email_as_spam: data.marked_email_as_spam,
          has_hard_bounced: data.has_hard_bounced,
        },
      };
    }

    // Handle company events
    if (topic.startsWith('company.')) {
      return {
        ...baseData,
        company: {
          id: data.id,
          type: data.type,
          company_id: data.company_id,
          name: data.name,
          created_at: data.created_at,
          updated_at: data.updated_at,
          plan: data.plan,
          size: data.size,
          website: data.website,
          industry: data.industry,
          monthly_spend: data.monthly_spend,
          session_count: data.session_count,
          user_count: data.user_count,
          custom_attributes: data.custom_attributes,
          tags: data.tags,
        },
      };
    }

    // Handle visitor events
    if (topic.startsWith('visitor.')) {
      return {
        ...baseData,
        visitor: {
          id: data.id,
          type: data.type,
          user_id: data.user_id,
          email: data.email,
          name: data.name,
          created_at: data.created_at,
          updated_at: data.updated_at,
        },
      };
    }

    // Default: return raw data
    return {
      ...baseData,
      raw_data: data,
    };
  }
}
