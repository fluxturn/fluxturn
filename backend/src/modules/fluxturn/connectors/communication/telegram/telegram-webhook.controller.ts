import { Controller, Post, Get, Param, Body, Query, Headers, HttpStatus, Logger, Inject, forwardRef } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { WorkflowService } from '../../../workflow/workflow.service';
import { TelegramTriggerService } from './telegram-trigger.service';
import * as crypto from 'crypto';

interface TelegramUpdate {
  update_id: number;
  message?: {
    message_id: number;
    from: {
      id: number;
      is_bot: boolean;
      first_name: string;
      username?: string;
      language_code?: string;
    };
    chat: {
      id: number;
      first_name?: string;
      username?: string;
      type: 'private' | 'group' | 'supergroup' | 'channel';
      title?: string;
    };
    date: number;
    text?: string;
    entities?: Array<{
      offset: number;
      length: number;
      type: string;
    }>;
    photo?: Array<{
      file_id: string;
      file_unique_id: string;
      file_size?: number;
      width: number;
      height: number;
    }>;
    document?: {
      file_id: string;
      file_unique_id: string;
      file_name?: string;
      mime_type?: string;
      file_size?: number;
    };
    caption?: string;
    new_chat_members?: Array<{
      id: number;
      is_bot: boolean;
      first_name: string;
      username?: string;
    }>;
    left_chat_member?: {
      id: number;
      is_bot: boolean;
      first_name: string;
      username?: string;
    };
  };
  callback_query?: {
    id: string;
    from: {
      id: number;
      first_name: string;
      username?: string;
    };
    message?: any;
    inline_message_id?: string;
    data?: string;
  };
}

@ApiTags('Telegram Webhook')
@Controller('webhooks/telegram')
export class TelegramWebhookController {
  private readonly logger = new Logger(TelegramWebhookController.name);

  constructor(
    @Inject(forwardRef(() => WorkflowService))
    private readonly workflowService: WorkflowService,
    private readonly telegramTriggerService: TelegramTriggerService
  ) {}

  @Post(':workflowId')
  @ApiOperation({ summary: 'Handle Telegram webhook events' })
  @ApiResponse({ status: 200, description: 'Webhook processed successfully' })
  @ApiResponse({ status: 404, description: 'Workflow not found' })
  async handleTelegramWebhook(
    @Param('workflowId') workflowId: string,
    @Body() update: TelegramUpdate,
    @Headers('x-telegram-bot-api-secret-token') secretToken?: string
  ) {
    this.logger.log(`Received Telegram webhook for workflow ${workflowId}`, {
      updateId: update.update_id,
      hasMessage: !!update.message,
      hasCallbackQuery: !!update.callback_query
    });

    try {
      // Find the workflow
      const workflowData = await this.workflowService.getWorkflow(workflowId);
      if (!workflowData) {
        this.logger.warn(`Workflow ${workflowId} not found`);
        return { status: 'error', message: 'Workflow not found' };
      }

      // Get nodes from canvas
      const nodes = workflowData.workflow?.canvas?.nodes || [];

      // Find telegram trigger nodes in the workflow
      const telegramTriggerNodes = nodes.filter(
        node => node.type === 'CONNECTOR_TRIGGER' &&
               node.data?.connectorType === 'telegram'
      );

      if (telegramTriggerNodes.length === 0) {
        this.logger.warn(`No Telegram trigger node found in workflow ${workflowId}`);
        return { status: 'error', message: 'No Telegram trigger configured' };
      }

      // Check which trigger should handle this update
      let matchingTriggerNode = null;

      for (const triggerNode of telegramTriggerNodes) {
        const triggerId = triggerNode.data?.triggerId;
        const triggerConfig = triggerNode.data?.actionParams || {};

        // Check if this trigger matches the update type
        if (update.message) {
          // Handle message triggers
          if (triggerId === 'new_message') {
            // Check message type filter
            const messageType = triggerConfig.messageType || 'all';
            if (messageType === 'text' && !update.message.text) continue;
            if (messageType === 'photo' && !update.message.photo) continue;
            if (messageType === 'document' && !update.message.document) continue;

            // Check chat type filter
            const chatType = triggerConfig.chatType || 'all';
            if (chatType !== 'all' && update.message.chat.type !== chatType) continue;

            matchingTriggerNode = triggerNode;
            break;
          } else if (triggerId === 'new_command') {
            // Check if message starts with command
            const command = triggerConfig.command || '/start';
            const cleanCommand = command.startsWith('/') ? command : '/' + command;
            if (update.message.text && update.message.text.startsWith(cleanCommand)) {
              matchingTriggerNode = triggerNode;
              break;
            }
          }
        } else if (update.callback_query && triggerId === 'callback_query') {
          // Check callback query prefix if configured
          const dataPrefix = triggerConfig.dataPrefix;
          if (!dataPrefix || update.callback_query.data?.startsWith(dataPrefix)) {
            matchingTriggerNode = triggerNode;
            break;
          }
        } else if (update.message?.new_chat_members && triggerId === 'new_chat_member') {
          matchingTriggerNode = triggerNode;
          break;
        } else if (update.message?.left_chat_member && triggerId === 'chat_member_left') {
          matchingTriggerNode = triggerNode;
          break;
        }
      }

      if (!matchingTriggerNode) {
        this.logger.debug('No matching trigger for this update type');
        return { status: 'ok', message: 'No matching trigger' };
      }

      // Verify secret token using timing-safe comparison
      const expectedToken = matchingTriggerNode.data?.actionParams?.webhookToken;

      // Try to use TelegramTriggerService for validation (preferred method)
      const activeTrigger = this.telegramTriggerService.getActiveTrigger(workflowId);

      if (activeTrigger || expectedToken) {
        // Use TelegramTriggerService validation if available
        if (activeTrigger) {
          const isValid = this.telegramTriggerService.validateSecretToken(workflowId, secretToken);
          if (!isValid) {
            this.logger.warn(`Invalid webhook token for workflow ${workflowId} (via TelegramTriggerService)`);
            return { status: 'error', message: 'Invalid webhook token' };
          }
        }
        // Fallback to manual timing-safe comparison
        else if (expectedToken) {
          const secretBuffer = Buffer.from(expectedToken);
          const headerSecretBuffer = Buffer.from(secretToken || '');

          if (
            secretBuffer.byteLength !== headerSecretBuffer.byteLength ||
            !crypto.timingSafeEqual(secretBuffer, headerSecretBuffer)
          ) {
            this.logger.warn(`Invalid webhook token for workflow ${workflowId} (via manual validation)`);
            return { status: 'error', message: 'Invalid webhook token' };
          }
        }
      }

      // Prepare trigger data based on update type
      let triggerData: any = {
        telegramEvent: {
          updateId: update.update_id,
          timestamp: new Date().toISOString()
        }
      };

      // Handle different update types based on the matching trigger
      const triggerId = matchingTriggerNode.data?.triggerId;
      const triggerConfig = matchingTriggerNode.data?.actionParams || {};

      if (update.message) {
        if (triggerId === 'new_message') {
          triggerData.telegramEvent = {
            ...triggerData.telegramEvent,
            type: 'message',
            message: {
              messageId: update.message.message_id,
              text: update.message.text,
              date: update.message.date,
              from: {
                id: update.message.from.id,
                firstName: update.message.from.first_name,
                username: update.message.from.username,
                isBot: update.message.from.is_bot
              },
              chat: {
                id: update.message.chat.id,
                type: update.message.chat.type,
                username: update.message.chat.username,
                firstName: update.message.chat.first_name,
                title: update.message.chat.title
              },
              entities: update.message.entities,
              photo: update.message.photo,
              caption: update.message.caption
            }
          };
        } else if (triggerId === 'new_command') {
          // Extract command and arguments
          const text = update.message.text || '';
          const parts = text.split(' ');
          const command = parts[0];
          const args = parts.slice(1).join(' ');

          triggerData.telegramEvent = {
            ...triggerData.telegramEvent,
            type: 'command',
            command: command,
            arguments: triggerConfig.includeArgs !== false ? args : undefined,
            message: {
              messageId: update.message.message_id,
              text: update.message.text,
              from: {
                id: update.message.from.id,
                firstName: update.message.from.first_name,
                username: update.message.from.username
              },
              chat: {
                id: update.message.chat.id,
                type: update.message.chat.type
              }
            }
          };
        } else if (triggerId === 'new_chat_member' && update.message.new_chat_members) {
          triggerData.telegramEvent = {
            ...triggerData.telegramEvent,
            type: 'new_chat_members',
            chat: {
              id: update.message.chat.id,
              type: update.message.chat.type,
              title: update.message.chat.title
            },
            newMembers: update.message.new_chat_members.map(member => ({
              id: member.id,
              firstName: member.first_name,
              username: member.username,
              isBot: member.is_bot
            })),
            from: {
              id: update.message.from.id,
              firstName: update.message.from.first_name,
              username: update.message.from.username
            }
          };
        } else if (triggerId === 'chat_member_left' && update.message.left_chat_member) {
          triggerData.telegramEvent = {
            ...triggerData.telegramEvent,
            type: 'left_chat_member',
            chat: {
              id: update.message.chat.id,
              type: update.message.chat.type,
              title: update.message.chat.title
            },
            leftMember: {
              id: update.message.left_chat_member.id,
              firstName: update.message.left_chat_member.first_name,
              username: update.message.left_chat_member.username,
              isBot: update.message.left_chat_member.is_bot
            }
          };
        }
      } else if (update.callback_query && triggerId === 'callback_query') {
        triggerData.telegramEvent = {
          ...triggerData.telegramEvent,
          type: 'callback_query',
          callbackQuery: {
            id: update.callback_query.id,
            data: update.callback_query.data,
            from: {
              id: update.callback_query.from.id,
              firstName: update.callback_query.from.first_name,
              username: update.callback_query.from.username
            },
            message: update.callback_query.message,
            inlineMessageId: update.callback_query.inline_message_id
          }
        };
      }

      // Execute workflow with trigger data
      const execution = await this.workflowService.executeWorkflow({
        workflow_id: workflowId,
        input_data: triggerData,
        organization_id: workflowData.organization_id,
        project_id: workflowData.project_id
      });

      this.logger.log(`Workflow ${workflowId} executed successfully`, {
        executionId: execution.id,
        executionNumber: execution.execution_number
      });

      return {
        status: 'success',
        message: 'Webhook processed successfully',
        executionId: execution.id,
        executionNumber: execution.execution_number
      };

    } catch (error) {
      this.logger.error(`Error processing Telegram webhook for workflow ${workflowId}:`, error);
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
    return {
      webhookUrl: `${process.env.APP_URL}/api/v1/webhooks/telegram/${workflowId}`,
      status: 'ready',
      instructions: {
        setup: 'Use this URL to set up your Telegram bot webhook',
        command: `curl -X POST https://api.telegram.org/bot<YOUR_BOT_TOKEN>/setWebhook -d "url=${process.env.APP_URL}/api/v1/webhooks/telegram/${workflowId}"`,
        withSecret: `curl -X POST https://api.telegram.org/bot<YOUR_BOT_TOKEN>/setWebhook -d "url=${process.env.APP_URL}/api/v1/webhooks/telegram/${workflowId}&secret_token=YOUR_SECRET"`
      }
    };
  }

  @Get('credential/:credentialId/debug')
  @ApiOperation({ summary: 'Debug credential data' })
  async debugCredential(@Param('credentialId') credentialId: string) {
    try {
      const query = `SELECT * FROM connector_configs WHERE id = $1`;
      const result = await this.workflowService['platformService'].query(query, [credentialId]);

      if (result.rows.length === 0) {
        return {
          error: 'Credential not found',
          credentialId
        };
      }

      const credential = result.rows[0];
      return {
        credentialId,
        connectorType: credential.connector_type,
        name: credential.name,
        config: credential.config,
        configKeys: credential.config ? Object.keys(credential.config) : [],
        hasBotToken: !!(credential.config?.botToken),
        configStructure: JSON.stringify(credential.config, null, 2)
      };
    } catch (error) {
      return {
        error: 'Failed to fetch credential',
        message: error.message
      };
    }
  }

  @Get(':workflowId/debug')
  @ApiOperation({ summary: 'Debug webhook status' })
  async debugWebhook(@Param('workflowId') workflowId: string) {
    try {
      // Get workflow
      const workflow = await this.workflowService.getWorkflow(workflowId);

      if (!workflow) {
        return {
          error: 'Workflow not found',
          workflowId
        };
      }

      // Get trigger nodes
      const nodes = workflow.workflow?.canvas?.nodes || [];
      const telegramTriggers = nodes.filter(
        node => node.type === 'CONNECTOR_TRIGGER' && node.data?.connectorType === 'telegram'
      );

      // Get active trigger info
      const activeTrigger = this.telegramTriggerService.getActiveTrigger(workflowId);

      // Check Telegram webhook status if we have a bot token
      let telegramWebhookStatus = null;
      let resolvedBotToken = null;

      if (telegramTriggers.length > 0) {
        const triggerData = telegramTriggers[0].data;

        // Try to extract bot token from various possible locations
        resolvedBotToken =
          triggerData?.botToken ||
          triggerData?.actionParams?.botToken;

        if (resolvedBotToken) {
          try {
            const response = await fetch(`https://api.telegram.org/bot${resolvedBotToken}/getWebhookInfo`);
            telegramWebhookStatus = await response.json();
          } catch (err) {
            telegramWebhookStatus = { error: 'Failed to fetch from Telegram', message: err.message };
          }
        }
      }

      return {
        workflowId,
        workflowStatus: workflow.status,
        appUrl: process.env.APP_URL,
        isHttps: process.env.APP_URL?.startsWith('https://'),
        expectedWebhookUrl: `${process.env.APP_URL}/api/v1/webhooks/telegram/${workflowId}`,
        rawTriggerData: telegramTriggers.length > 0 ? telegramTriggers[0].data : null,
        telegramTriggers: telegramTriggers.map(t => ({
          nodeId: t.id,
          triggerId: t.data?.triggerId,
          hasCredentialId: !!t.data?.connectorConfigId,
          credentialIdPreview: t.data?.connectorConfigId ? `${t.data.connectorConfigId.substring(0, 20)}...` : 'none',
          hasBotTokenDirect: !!(t.data?.botToken || t.data?.actionParams?.botToken),
          botTokenPreview: resolvedBotToken ? `${resolvedBotToken.substring(0, 10)}...` : 'missing',
          allFields: Object.keys(t.data || {})
        })),
        activeTrigger: activeTrigger ? {
          hasActiveTrigger: true,
          webhookUrl: activeTrigger.webhookUrl,
          activatedAt: activeTrigger.activatedAt
        } : {
          hasActiveTrigger: false,
          reason: 'No active trigger found - workflow may not be activated'
        },
        telegramWebhookStatus,
        troubleshooting: {
          step1: 'Check if workflow status is "active"',
          step2: 'Check if APP_URL is HTTPS (Telegram requirement)',
          step3: 'Check if bot token is correct',
          step4: 'Check if Telegram webhook URL matches expected URL',
          step5: 'Send a test message to your bot and check backend logs'
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
