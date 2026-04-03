import { Controller, Post, Get, Param, Body, Query, Headers, HttpStatus, Logger, HttpException, Inject, forwardRef } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { WorkflowService } from '../../../workflow/workflow.service';
import { WhatsAppTriggerService } from './whatsapp-trigger.service';

/**
 * WhatsApp Webhook Payload Interfaces
 * Based on WhatsApp Business Cloud API webhook structure
 */
interface WhatsAppWebhookEntry {
  id: string;
  changes: Array<{
    value: {
      messaging_product: string;
      metadata?: {
        display_phone_number: string;
        phone_number_id: string;
      };
      // Message events
      messages?: Array<{
        from: string;
        id: string;
        timestamp: string;
        type: 'text' | 'image' | 'audio' | 'video' | 'document' | 'location' | 'contacts' | 'interactive' | 'button' | 'sticker';
        text?: {
          body: string;
        };
        image?: {
          id: string;
          mime_type: string;
          sha256: string;
          caption?: string;
        };
        audio?: {
          id: string;
          mime_type: string;
          sha256: string;
        };
        video?: {
          id: string;
          mime_type: string;
          sha256: string;
          caption?: string;
        };
        document?: {
          id: string;
          filename?: string;
          mime_type: string;
          sha256: string;
          caption?: string;
        };
        location?: {
          latitude: number;
          longitude: number;
          name?: string;
          address?: string;
        };
        contacts?: Array<any>;
        interactive?: {
          type: string;
          button_reply?: {
            id: string;
            title: string;
          };
          list_reply?: {
            id: string;
            title: string;
            description?: string;
          };
        };
        context?: {
          from: string;
          id: string;
        };
      }>;
      // Status updates
      statuses?: Array<{
        id: string;
        status: 'sent' | 'delivered' | 'read' | 'failed';
        timestamp: string;
        recipient_id: string;
        errors?: Array<any>;
      }>;
      // Account updates
      account_update?: {
        ban_info?: any;
        current_limit?: string;
        event?: string;
      };
      // Phone number updates
      phone_number_name_update?: {
        display_name: string;
        decision: string;
        requested_verified_name?: string;
      };
      phone_number_quality_update?: {
        current_limit?: string;
        event?: string;
        previous_limit?: string;
        quality_score?: string;
      };
      // Account review
      account_review_update?: {
        decision: string;
      };
      // Business capability
      business_capability_update?: {
        capabilities?: Array<string>;
      };
      // Template updates
      message_template_quality_update?: {
        current_quality: string;
        previous_quality: string;
      };
      message_template_status_update?: {
        event: string;
        message_template_id?: string;
        message_template_name?: string;
        message_template_language?: string;
        reason?: string;
        disable_info?: any;
      };
      template_category_update?: {
        current_category: string;
        message_template_id?: string;
        message_template_name?: string;
        message_template_language?: string;
        previous_category: string;
      };
      // Security events
      security?: {
        event_type: string;
        timestamp?: string;
      };
    };
    field: string;
  }>;
}

interface WhatsAppWebhookPayload {
  object: string;
  entry: WhatsAppWebhookEntry[];
}

@ApiTags('WhatsApp Webhook')
@Controller('webhooks/whatsapp')
export class WhatsAppWebhookController {
  private readonly logger = new Logger(WhatsAppWebhookController.name);

  constructor(
    @Inject(forwardRef(() => WorkflowService))
    private readonly workflowService: WorkflowService,
    private readonly whatsappTriggerService: WhatsAppTriggerService
  ) {}

  /**
   * Webhook verification endpoint (GET)
   * WhatsApp sends a GET request with hub.mode, hub.verify_token, and hub.challenge
   */
  @Get(':workflowId')
  @ApiOperation({ summary: 'Verify WhatsApp webhook' })
  @ApiResponse({ status: 200, description: 'Webhook verified successfully' })
  @ApiResponse({ status: 403, description: 'Invalid verify token' })
  async verifyWebhook(
    @Param('workflowId') workflowId: string,
    @Query('hub.mode') mode: string,
    @Query('hub.verify_token') verifyToken: string,
    @Query('hub.challenge') challenge: string,
  ) {
    this.logger.log(`Received WhatsApp webhook verification for workflow ${workflowId}`);
    this.logger.debug(`Mode: ${mode}, Verify Token: ${verifyToken ? 'provided' : 'missing'}, Challenge: ${challenge}`);

    // Verify that this is a webhook subscription verification
    if (mode === 'subscribe') {
      // Verify the token matches
      const isValid = this.whatsappTriggerService.validateVerifyToken(workflowId, verifyToken);

      if (isValid) {
        this.logger.log(`Webhook verified successfully for workflow ${workflowId}`);
        // Respond with the challenge to complete verification
        return challenge;
      } else {
        this.logger.warn(`Invalid verify token for workflow ${workflowId}`);
        throw new HttpException('Invalid verify token', HttpStatus.FORBIDDEN);
      }
    }

    this.logger.warn(`Invalid webhook verification mode: ${mode}`);
    throw new HttpException('Invalid webhook verification', HttpStatus.BAD_REQUEST);
  }

  /**
   * Webhook event handler (POST)
   * Receives WhatsApp webhook events
   */
  @Post(':workflowId')
  @ApiOperation({ summary: 'Handle WhatsApp webhook events' })
  @ApiResponse({ status: 200, description: 'Webhook processed successfully' })
  @ApiResponse({ status: 404, description: 'Workflow not found' })
  async handleWhatsAppWebhook(
    @Param('workflowId') workflowId: string,
    @Body() payload: WhatsAppWebhookPayload,
    @Headers('x-hub-signature-256') signature?: string
  ) {
    this.logger.log(`Received WhatsApp webhook event for workflow ${workflowId}`);
    this.logger.debug(`Payload: ${JSON.stringify(payload, null, 2)}`);

    try {
      // Find the workflow
      const workflowData = await this.workflowService.getWorkflow(workflowId);
      if (!workflowData) {
        this.logger.warn(`Workflow ${workflowId} not found`);
        return { status: 'error', message: 'Workflow not found' };
      }

      // Get nodes from canvas
      const nodes = workflowData.workflow?.canvas?.nodes || [];

      // Find WhatsApp trigger nodes in the workflow
      const whatsappTriggerNodes = nodes.filter(
        node => node.type === 'CONNECTOR_TRIGGER' &&
               node.data?.connectorType === 'whatsapp'
      );

      if (whatsappTriggerNodes.length === 0) {
        this.logger.warn(`No WhatsApp trigger node found in workflow ${workflowId}`);
        return { status: 'error', message: 'No WhatsApp trigger configured' };
      }

      // Process each entry in the webhook payload
      const executionResults = [];

      for (const entry of payload.entry) {
        for (const change of entry.changes) {
          const { value, field } = change;

          // Determine event type and find matching trigger
          let matchingTriggerNode = null;
          let triggerData: any = null;

          // Check for different event types
          if (value.messages && value.messages.length > 0) {
            // Message event
            const message = value.messages[0];
            const triggerNode = whatsappTriggerNodes.find(
              node => node.data?.triggerId === 'on_message'
            );

            if (triggerNode) {
              const messageTypeFilter = triggerNode.data?.actionParams?.messageType || 'all';

              // Apply message type filter
              if (messageTypeFilter === 'all' || messageTypeFilter === message.type) {
                matchingTriggerNode = triggerNode;
                triggerData = {
                  whatsappEvent: {
                    type: 'message',
                    messageId: message.id,
                    from: message.from,
                    timestamp: message.timestamp,
                    messageType: message.type,
                    text: message.text,
                    image: message.image,
                    audio: message.audio,
                    video: message.video,
                    document: message.document,
                    location: message.location,
                    contacts: message.contacts,
                    interactive: message.interactive,
                    context: message.context,
                    metadata: value.metadata
                  }
                };
              }
            }
          } else if (value.account_update) {
            // Account update event
            const triggerNode = whatsappTriggerNodes.find(
              node => node.data?.triggerId === 'on_account_update'
            );

            if (triggerNode) {
              matchingTriggerNode = triggerNode;
              triggerData = {
                whatsappEvent: {
                  type: 'account_update',
                  accountId: entry.id,
                  event: value.account_update.event,
                  banInfo: value.account_update.ban_info,
                  currentLimit: value.account_update.current_limit,
                  timestamp: new Date().toISOString(),
                  changes: value.account_update
                }
              };
            }
          } else if (value.phone_number_name_update) {
            // Phone number name update
            const triggerNode = whatsappTriggerNodes.find(
              node => node.data?.triggerId === 'on_phone_number_name_update'
            );

            if (triggerNode) {
              matchingTriggerNode = triggerNode;
              triggerData = {
                whatsappEvent: {
                  type: 'phone_number_name_update',
                  phoneNumberId: value.metadata?.phone_number_id,
                  displayName: value.phone_number_name_update.display_name,
                  decision: value.phone_number_name_update.decision,
                  verifiedName: value.phone_number_name_update.requested_verified_name,
                  timestamp: new Date().toISOString()
                }
              };
            }
          } else if (value.phone_number_quality_update) {
            // Phone number quality update
            const triggerNode = whatsappTriggerNodes.find(
              node => node.data?.triggerId === 'on_phone_number_quality_update'
            );

            if (triggerNode) {
              matchingTriggerNode = triggerNode;
              triggerData = {
                whatsappEvent: {
                  type: 'phone_number_quality_update',
                  phoneNumberId: value.metadata?.phone_number_id,
                  currentQuality: value.phone_number_quality_update.quality_score,
                  currentLimit: value.phone_number_quality_update.current_limit,
                  previousLimit: value.phone_number_quality_update.previous_limit,
                  event: value.phone_number_quality_update.event,
                  timestamp: new Date().toISOString()
                }
              };
            }
          } else if (value.account_review_update) {
            // Account review update
            const triggerNode = whatsappTriggerNodes.find(
              node => node.data?.triggerId === 'on_account_review_update'
            );

            if (triggerNode) {
              matchingTriggerNode = triggerNode;
              triggerData = {
                whatsappEvent: {
                  type: 'account_review_update',
                  accountId: entry.id,
                  reviewStatus: value.account_review_update.decision,
                  decision: value.account_review_update.decision,
                  timestamp: new Date().toISOString()
                }
              };
            }
          } else if (value.business_capability_update) {
            // Business capability update
            const triggerNode = whatsappTriggerNodes.find(
              node => node.data?.triggerId === 'on_business_capability_update'
            );

            if (triggerNode) {
              matchingTriggerNode = triggerNode;
              triggerData = {
                whatsappEvent: {
                  type: 'business_capability_update',
                  accountId: entry.id,
                  capabilities: value.business_capability_update.capabilities,
                  timestamp: new Date().toISOString()
                }
              };
            }
          } else if (value.message_template_quality_update) {
            // Message template quality update
            const triggerNode = whatsappTriggerNodes.find(
              node => node.data?.triggerId === 'on_message_template_quality_update'
            );

            if (triggerNode) {
              matchingTriggerNode = triggerNode;
              triggerData = {
                whatsappEvent: {
                  type: 'message_template_quality_update',
                  currentQuality: value.message_template_quality_update.current_quality,
                  previousQuality: value.message_template_quality_update.previous_quality,
                  timestamp: new Date().toISOString()
                }
              };
            }
          } else if (value.message_template_status_update) {
            // Message template status update
            const triggerNode = whatsappTriggerNodes.find(
              node => node.data?.triggerId === 'on_message_template_status_update'
            );

            if (triggerNode) {
              matchingTriggerNode = triggerNode;
              triggerData = {
                whatsappEvent: {
                  type: 'message_template_status_update',
                  templateId: value.message_template_status_update.message_template_id,
                  templateName: value.message_template_status_update.message_template_name,
                  status: value.message_template_status_update.event,
                  reason: value.message_template_status_update.reason,
                  language: value.message_template_status_update.message_template_language,
                  disableInfo: value.message_template_status_update.disable_info,
                  timestamp: new Date().toISOString()
                }
              };
            }
          } else if (value.template_category_update) {
            // Template category update
            const triggerNode = whatsappTriggerNodes.find(
              node => node.data?.triggerId === 'on_template_category_update'
            );

            if (triggerNode) {
              matchingTriggerNode = triggerNode;
              triggerData = {
                whatsappEvent: {
                  type: 'template_category_update',
                  templateId: value.template_category_update.message_template_id,
                  templateName: value.template_category_update.message_template_name,
                  category: value.template_category_update.current_category,
                  previousCategory: value.template_category_update.previous_category,
                  language: value.template_category_update.message_template_language,
                  timestamp: new Date().toISOString()
                }
              };
            }
          } else if (value.security) {
            // Security event
            const triggerNode = whatsappTriggerNodes.find(
              node => node.data?.triggerId === 'on_security'
            );

            if (triggerNode) {
              matchingTriggerNode = triggerNode;
              triggerData = {
                whatsappEvent: {
                  type: 'security',
                  eventType: value.security.event_type,
                  phoneNumberId: value.metadata?.phone_number_id,
                  details: value.security,
                  timestamp: value.security.timestamp || new Date().toISOString()
                }
              };
            }
          }

          // Execute workflow if matching trigger found
          if (matchingTriggerNode && triggerData) {
            this.logger.log(`Executing workflow ${workflowId} for ${triggerData.whatsappEvent.type} event`);

            const execution = await this.workflowService.executeWorkflow({
              workflow_id: workflowId,
              input_data: triggerData,
              organization_id: workflowData.organization_id,
              project_id: workflowData.project_id
            });

            executionResults.push({
              eventType: triggerData.whatsappEvent.type,
              executionId: execution.id,
              executionNumber: execution.execution_number,
              status: 'success'
            });

            this.logger.log(`Workflow ${workflowId} executed successfully`, {
              executionId: execution.id,
              executionNumber: execution.execution_number,
              eventType: triggerData.whatsappEvent.type
            });
          } else {
            this.logger.debug(`No matching trigger for event type in field: ${field}`);
          }
        }
      }

      // Return success response
      return {
        status: 'success',
        message: 'Webhook processed successfully',
        executions: executionResults
      };

    } catch (error) {
      this.logger.error(`Error processing WhatsApp webhook for workflow ${workflowId}:`, error);
      return {
        status: 'error',
        message: 'Failed to process webhook',
        error: error.message
      };
    }
  }

  @Get(':workflowId/info')
  @ApiOperation({ summary: 'Get webhook info for debugging' })
  async getWebhookInfo(@Param('workflowId') workflowId: string) {
    const activeTrigger = this.whatsappTriggerService.getActiveTrigger(workflowId);

    return {
      webhookUrl: `${process.env.APP_URL}/api/v1/webhooks/whatsapp/${workflowId}`,
      verifyToken: activeTrigger?.verifyToken || 'Not activated',
      status: activeTrigger ? 'active' : 'inactive',
      instructions: {
        setup: 'Configure this webhook in Meta Business Suite',
        steps: [
          '1. Go to Meta Business Suite > WhatsApp Manager > Configuration > Webhook',
          '2. Enter the Callback URL shown above',
          '3. Enter the Verify Token shown above',
          '4. Click "Verify and Save"',
          '5. Subscribe to webhook fields'
        ],
        documentationUrl: 'https://developers.facebook.com/docs/whatsapp/cloud-api/guides/set-up-webhooks'
      }
    };
  }

  @Get(':workflowId/debug')
  @ApiOperation({ summary: 'Debug webhook status' })
  async debugWebhook(@Param('workflowId') workflowId: string) {
    try {
      const workflow = await this.workflowService.getWorkflow(workflowId);

      if (!workflow) {
        return {
          error: 'Workflow not found',
          workflowId
        };
      }

      const nodes = workflow.workflow?.canvas?.nodes || [];
      const whatsappTriggers = nodes.filter(
        node => node.type === 'CONNECTOR_TRIGGER' && node.data?.connectorType === 'whatsapp'
      );

      const activeTrigger = this.whatsappTriggerService.getActiveTrigger(workflowId);

      return {
        workflowId,
        workflowStatus: workflow.status,
        appUrl: process.env.APP_URL,
        isHttps: process.env.APP_URL?.startsWith('https://'),
        expectedWebhookUrl: `${process.env.APP_URL}/api/v1/webhooks/whatsapp/${workflowId}`,
        whatsappTriggers: whatsappTriggers.map(t => ({
          nodeId: t.id,
          triggerId: t.data?.triggerId,
          triggerName: t.data?.actionName,
          hasCredentialId: !!t.data?.connectorConfigId,
          credentialId: t.data?.connectorConfigId
        })),
        activeTrigger: activeTrigger ? {
          hasActiveTrigger: true,
          webhookUrl: activeTrigger.webhookUrl,
          verifyToken: activeTrigger.verifyToken,
          phoneNumberId: activeTrigger.phoneNumberId,
          activatedAt: activeTrigger.activatedAt
        } : {
          hasActiveTrigger: false,
          reason: 'No active trigger found - workflow may not be activated'
        },
        troubleshooting: {
          step1: 'Check if workflow status is "active"',
          step2: 'Check if APP_URL is HTTPS (WhatsApp requirement)',
          step3: 'Check if access token and phone number ID are configured',
          step4: 'Verify webhook in Meta Business Suite',
          step5: 'Send a test message to your WhatsApp Business number'
        }
      };
    } catch (error) {
      return {
        error: 'Debug failed',
        message: error.message,
        stack: error.stack
      };
    }
  }
}
