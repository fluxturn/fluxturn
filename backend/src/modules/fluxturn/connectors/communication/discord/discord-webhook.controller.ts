import { Controller, Post, Get, Param, Body, Headers, Logger, Inject, forwardRef } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { WorkflowService } from '../../../workflow/workflow.service';
import * as crypto from 'crypto';
import { DiscordTriggerService } from './discord-trigger.service';

// Discord Event Types
interface DiscordEventBase {
  t: string; // Event type (e.g., MESSAGE_CREATE)
  s: number; // Sequence number
  op: number; // Opcode
  d: any;    // Event data
}

interface DiscordMessage {
  id: string;
  channel_id: string;
  guild_id?: string;
  author: {
    id: string;
    username: string;
    discriminator: string;
    avatar?: string;
    bot?: boolean;
  };
  content: string;
  timestamp: string;
  edited_timestamp?: string;
  tts: boolean;
  mention_everyone: boolean;
  mentions: any[];
  mention_roles: string[];
  attachments: any[];
  embeds: any[];
  type: number;
}

interface DiscordGuildMember {
  user: {
    id: string;
    username: string;
    discriminator: string;
    avatar?: string;
  };
  nick?: string;
  roles: string[];
  joined_at: string;
  guild_id: string;
}

interface DiscordChannel {
  id: string;
  type: number;
  guild_id?: string;
  name?: string;
  position?: number;
  topic?: string;
  nsfw?: boolean;
  parent_id?: string;
}

interface DiscordInteraction {
  id: string;
  application_id: string;
  type: number;
  token: string;
  version: number;
  guild_id?: string;
  channel_id?: string;
  member?: any;
  user?: any;
  data?: any;
}

// Webhook payload types
interface DiscordWebhookPayload {
  type?: number;  // Interaction type for slash commands
  t?: string;     // Event type for gateway events
  d?: any;        // Data
  // Interaction fields
  id?: string;
  token?: string;
  application_id?: string;
  guild_id?: string;
  channel_id?: string;
  member?: any;
  user?: any;
  data?: any;
}

@ApiTags('Discord Webhook')
@Controller('webhooks/discord')
export class DiscordWebhookController {
  private readonly logger = new Logger(DiscordWebhookController.name);
  private readonly processedEvents = new Map<string, number>(); // Event deduplication cache
  private readonly DEDUP_WINDOW_MS = 60000; // 1 minute deduplication window

  constructor(
    @Inject(forwardRef(() => WorkflowService))
    private readonly workflowService: WorkflowService,
    @Inject(forwardRef(() => DiscordTriggerService))
    private readonly discordTriggerService: DiscordTriggerService
  ) {
    // Clean up old processed events periodically
    setInterval(() => this.cleanupProcessedEvents(), 30000);
  }

  @Post(':workflowId')
  @ApiOperation({ summary: 'Handle Discord webhook events' })
  @ApiResponse({ status: 200, description: 'Webhook processed successfully' })
  @ApiResponse({ status: 404, description: 'Workflow not found' })
  async handleDiscordWebhook(
    @Param('workflowId') workflowId: string,
    @Body() payload: DiscordWebhookPayload,
    @Headers('x-signature-ed25519') signature?: string,
    @Headers('x-signature-timestamp') timestamp?: string,
    @Headers('x-discord-secret') secretToken?: string
  ) {
    this.logger.log(`Received Discord webhook for workflow ${workflowId}`, {
      eventType: payload.t || `interaction_type_${payload.type}`,
      hasSignature: !!signature
    });

    try {
      // Handle Discord Interaction Endpoint verification (ping)
      if (payload.type === 1) {
        this.logger.log(`Discord ping verification for workflow ${workflowId}`);
        return { type: 1 }; // PONG response
      }

      // Validate secret token if provided
      if (secretToken) {
        const isValid = this.discordTriggerService.validateSecretToken(workflowId, secretToken);
        if (!isValid) {
          this.logger.warn(`Invalid secret token for workflow ${workflowId}`);
          return { status: 'error', message: 'Invalid secret token' };
        }
      }

      // Find the workflow
      const workflowData = await this.workflowService.getWorkflow(workflowId);
      if (!workflowData) {
        this.logger.warn(`Workflow ${workflowId} not found`);
        return { status: 'error', message: 'Workflow not found' };
      }

      // Get nodes from canvas
      const nodes = workflowData.workflow?.canvas?.nodes || [];

      // Find Discord trigger nodes in the workflow
      const discordTriggerNodes = nodes.filter(
        node => node.type === 'CONNECTOR_TRIGGER' &&
               node.data?.connectorType === 'discord'
      );

      if (discordTriggerNodes.length === 0) {
        this.logger.warn(`No Discord trigger node found in workflow ${workflowId}`);
        return { status: 'error', message: 'No Discord trigger configured' };
      }

      // Determine event type
      const eventType = this.getEventType(payload);

      // Deduplicate events
      const eventId = this.getEventId(payload);
      if (eventId && this.isDuplicateEvent(eventId)) {
        this.logger.debug(`Duplicate event ${eventId} ignored`);
        return { status: 'ok', message: 'Duplicate event ignored' };
      }
      if (eventId) {
        this.markEventProcessed(eventId);
      }

      // Find matching trigger for this event
      let matchingTriggerNode = null;

      for (const triggerNode of discordTriggerNodes) {
        const triggerId = triggerNode.data?.triggerId;
        const triggerConfig = triggerNode.data?.actionParams || {};

        if (this.matchesTrigger(triggerId, eventType, triggerConfig)) {
          matchingTriggerNode = triggerNode;
          break;
        }
      }

      if (!matchingTriggerNode) {
        this.logger.debug(`No matching trigger for event type: ${eventType}`);
        return { status: 'ok', message: 'No matching trigger' };
      }

      // Apply filters
      const triggerId = matchingTriggerNode.data?.triggerId;
      const triggerConfig = matchingTriggerNode.data?.actionParams || {};

      if (!this.passesFilters(triggerId, payload, triggerConfig)) {
        this.logger.debug('Event filtered out by trigger configuration');
        return { status: 'ok', message: 'Event filtered' };
      }

      // Prepare trigger data
      const triggerData = this.prepareTriggerData(triggerId, payload, triggerConfig);

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

      // For interactions, we need to respond appropriately
      if (payload.type && payload.type > 1) {
        return {
          type: 4, // CHANNEL_MESSAGE_WITH_SOURCE
          data: {
            content: 'Processing your request...',
            flags: 64 // Ephemeral flag
          }
        };
      }

      return {
        status: 'success',
        message: 'Webhook processed successfully',
        executionId: execution.id,
        executionNumber: execution.execution_number
      };

    } catch (error) {
      this.logger.error(`Error processing Discord webhook for workflow ${workflowId}:`, error);
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
    const trigger = this.discordTriggerService.getActiveTrigger(workflowId);

    return {
      webhookUrl: `${process.env.APP_URL}/api/v1/webhooks/discord/${workflowId}`,
      status: trigger ? 'active' : 'inactive',
      triggerInfo: trigger ? {
        events: trigger.events,
        guildId: trigger.guildId,
        channelId: trigger.channelId,
        activatedAt: trigger.activatedAt
      } : null,
      instructions: {
        setup: 'Configure your Discord bot to forward events to this webhook URL',
        steps: [
          '1. Create a Discord Application at https://discord.com/developers/applications',
          '2. Add a Bot to your application',
          '3. Enable necessary intents (MESSAGE CONTENT INTENT for message content)',
          '4. Use a bot framework (discord.js, discord.py) to forward events to this webhook',
          `5. Webhook URL: ${process.env.APP_URL}/api/v1/webhooks/discord/${workflowId}`,
          '6. Include X-Discord-Secret header with your secret token for validation'
        ],
        alternativeSetup: [
          'For Interaction Endpoint URL (slash commands):',
          `Set this URL in your Discord app settings: ${process.env.APP_URL}/api/v1/webhooks/discord/${workflowId}`
        ]
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
      const discordTriggers = nodes.filter(
        node => node.type === 'CONNECTOR_TRIGGER' && node.data?.connectorType === 'discord'
      );

      const trigger = this.discordTriggerService.getActiveTrigger(workflowId);

      return {
        workflowId,
        workflowStatus: workflow.status,
        appUrl: process.env.APP_URL,
        isHttps: process.env.APP_URL?.startsWith('https://'),
        expectedWebhookUrl: `${process.env.APP_URL}/api/v1/webhooks/discord/${workflowId}`,
        triggerServiceActive: !!trigger,
        discordTriggers: discordTriggers.map(t => ({
          nodeId: t.id,
          triggerId: t.data?.triggerId,
          hasCredentialId: !!t.data?.connectorConfigId,
          config: t.data?.actionParams || {}
        })),
        troubleshooting: {
          step1: 'Check if workflow status is "active"',
          step2: 'Ensure your Discord bot is running and forwarding events',
          step3: 'Verify bot has necessary permissions and intents',
          step4: 'Check if X-Discord-Secret header matches the secret token',
          step5: 'For interactions, ensure the webhook URL is set as Interaction Endpoint URL',
          step6: 'Test by sending a message in a channel the bot can see'
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

  // Helper methods

  private getEventType(payload: DiscordWebhookPayload): string {
    // Gateway event
    if (payload.t) {
      return payload.t;
    }
    // Interaction type
    if (payload.type) {
      switch (payload.type) {
        case 2: return 'APPLICATION_COMMAND';
        case 3: return 'MESSAGE_COMPONENT';
        case 4: return 'APPLICATION_COMMAND_AUTOCOMPLETE';
        case 5: return 'MODAL_SUBMIT';
        default: return `INTERACTION_TYPE_${payload.type}`;
      }
    }
    return 'UNKNOWN';
  }

  private getEventId(payload: DiscordWebhookPayload): string | null {
    // For gateway events
    if (payload.d?.id) {
      return `${payload.t || 'event'}_${payload.d.id}`;
    }
    // For interactions
    if (payload.id) {
      return `interaction_${payload.id}`;
    }
    return null;
  }

  private isDuplicateEvent(eventId: string): boolean {
    return this.processedEvents.has(eventId);
  }

  private markEventProcessed(eventId: string): void {
    this.processedEvents.set(eventId, Date.now());
  }

  private cleanupProcessedEvents(): void {
    const now = Date.now();
    for (const [eventId, timestamp] of this.processedEvents.entries()) {
      if (now - timestamp > this.DEDUP_WINDOW_MS) {
        this.processedEvents.delete(eventId);
      }
    }
  }

  private matchesTrigger(triggerId: string, eventType: string, config: any): boolean {
    switch (triggerId) {
      case 'message_received':
        return eventType === 'MESSAGE_CREATE';

      case 'member_joined':
        return eventType === 'GUILD_MEMBER_ADD';

      case 'channel_created':
        return eventType === 'CHANNEL_CREATE';

      case 'interaction':
      case 'slash_command':
        return eventType === 'APPLICATION_COMMAND';

      case 'button_click':
      case 'message_component':
        return eventType === 'MESSAGE_COMPONENT';

      default:
        // Allow custom event type matching
        return eventType === triggerId || eventType === config.eventType;
    }
  }

  private passesFilters(triggerId: string, payload: DiscordWebhookPayload, config: any): boolean {
    const data = payload.d || payload;

    // Message trigger filters
    if (triggerId === 'message_received' && payload.t === 'MESSAGE_CREATE') {
      // Ignore bot messages if configured
      if (config.ignoreBots !== false && data.author?.bot) {
        return false;
      }

      // Filter by channel ID
      if (config.channelId && data.channel_id !== config.channelId) {
        return false;
      }

      // Filter by guild ID
      if (config.guildId && data.guild_id !== config.guildId) {
        return false;
      }

      // Filter by content pattern
      if (config.contentPattern) {
        const regex = new RegExp(config.contentPattern, 'i');
        if (!regex.test(data.content || '')) {
          return false;
        }
      }
    }

    // Member joined filters
    if (triggerId === 'member_joined' && payload.t === 'GUILD_MEMBER_ADD') {
      // Filter by guild ID
      if (config.guildId && data.guild_id !== config.guildId) {
        return false;
      }
    }

    // Channel created filters
    if (triggerId === 'channel_created' && payload.t === 'CHANNEL_CREATE') {
      // Filter by guild ID
      if (config.guildId && data.guild_id !== config.guildId) {
        return false;
      }

      // Filter by channel type
      if (config.channelType !== undefined && data.type !== config.channelType) {
        return false;
      }
    }

    return true;
  }

  private prepareTriggerData(triggerId: string, payload: DiscordWebhookPayload, config: any): any {
    const data = payload.d || payload;

    const baseData = {
      discordEvent: {
        type: payload.t || `interaction_type_${payload.type}`,
        timestamp: new Date().toISOString()
      }
    };

    switch (triggerId) {
      case 'message_received':
        return {
          discordEvent: {
            ...baseData.discordEvent,
            messageId: data.id,
            channelId: data.channel_id,
            guildId: data.guild_id,
            author: data.author,
            content: data.content,
            timestamp: data.timestamp,
            attachments: data.attachments,
            embeds: data.embeds,
            mentions: data.mentions,
            mentionRoles: data.mention_roles,
            referencedMessage: data.referenced_message
          }
        };

      case 'member_joined':
        return {
          discordEvent: {
            ...baseData.discordEvent,
            user: data.user,
            guildId: data.guild_id,
            nick: data.nick,
            roles: data.roles,
            joinedAt: data.joined_at
          }
        };

      case 'channel_created':
        return {
          discordEvent: {
            ...baseData.discordEvent,
            channelId: data.id,
            channelName: data.name,
            channelType: data.type,
            guildId: data.guild_id,
            parentId: data.parent_id,
            position: data.position,
            topic: data.topic,
            nsfw: data.nsfw
          }
        };

      case 'interaction':
      case 'slash_command':
        return {
          discordEvent: {
            ...baseData.discordEvent,
            interactionId: payload.id,
            interactionType: payload.type,
            applicationId: payload.application_id,
            guildId: payload.guild_id,
            channelId: payload.channel_id,
            member: payload.member,
            user: payload.user,
            commandData: payload.data,
            token: payload.token
          }
        };

      default:
        return {
          discordEvent: {
            ...baseData.discordEvent,
            ...data
          }
        };
    }
  }

  /**
   * Verify Discord signature for Interaction Endpoint
   */
  private verifyDiscordSignature(
    signature: string,
    timestamp: string,
    body: string,
    publicKey: string
  ): boolean {
    try {
      const message = Buffer.from(timestamp + body);
      const sig = Buffer.from(signature, 'hex');
      const key = Buffer.from(publicKey, 'hex');

      // Use crypto.verify with Ed25519
      return crypto.verify(null, message, { key, format: 'der', type: 'spki' }, sig);
    } catch (error) {
      this.logger.error('Discord signature verification failed:', error);
      return false;
    }
  }
}
