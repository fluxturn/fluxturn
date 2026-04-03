import { Controller, Post, Get, Param, Body, Headers, Logger, RawBodyRequest, Req, Inject, forwardRef } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { WorkflowService } from '../../../workflow/workflow.service';
import * as crypto from 'crypto';
import { Request } from 'express';

// Slack Event API types
interface SlackEventBase {
  type: string;
  event_ts: string;
}

interface SlackMessageEvent extends SlackEventBase {
  type: 'message';
  channel: string;
  user: string;
  text: string;
  ts: string;
  channel_type: 'channel' | 'group' | 'im' | 'mpim' | 'app_home';
  thread_ts?: string;
  subtype?: string;
}

interface SlackAppMentionEvent extends SlackEventBase {
  type: 'app_mention';
  channel: string;
  user: string;
  text: string;
  ts: string;
}

interface SlackReactionAddedEvent extends SlackEventBase {
  type: 'reaction_added';
  user: string;
  reaction: string;
  item: {
    type: string;
    channel: string;
    ts: string;
  };
  item_user: string;
}

interface SlackChannelCreatedEvent extends SlackEventBase {
  type: 'channel_created';
  channel: {
    id: string;
    name: string;
    created: number;
    creator: string;
  };
}

interface SlackTeamJoinEvent extends SlackEventBase {
  type: 'team_join';
  user: {
    id: string;
    name: string;
    real_name: string;
    profile: {
      email?: string;
      display_name?: string;
      real_name?: string;
    };
  };
}

interface SlackFileSharedEvent extends SlackEventBase {
  type: 'file_shared';
  file_id: string;
  user_id: string;
  file: {
    id: string;
    name: string;
    title: string;
    mimetype: string;
    filetype: string;
    size: number;
    url_private: string;
  };
  channel_id?: string;
}

interface SlackFilePublicEvent extends SlackEventBase {
  type: 'file_public';
  file_id: string;
  user_id: string;
  file: {
    id: string;
    name: string;
    title: string;
    mimetype: string;
    filetype: string;
    size: number;
    url_private: string;
    permalink_public: string;
  };
}

type SlackEvent =
  | SlackMessageEvent
  | SlackAppMentionEvent
  | SlackReactionAddedEvent
  | SlackChannelCreatedEvent
  | SlackTeamJoinEvent
  | SlackFileSharedEvent
  | SlackFilePublicEvent;

interface SlackWebhookPayload {
  type: 'url_verification' | 'event_callback';
  challenge?: string;
  token?: string;
  team_id?: string;
  api_app_id?: string;
  event?: SlackEvent;
  event_id?: string;
  event_time?: number;
}

@ApiTags('Slack Webhook')
@Controller('webhooks/slack')
export class SlackWebhookController {
  private readonly logger = new Logger(SlackWebhookController.name);

  constructor(
    @Inject(forwardRef(() => WorkflowService))
    private readonly workflowService: WorkflowService
  ) {}

  @Post(':workflowId')
  @ApiOperation({ summary: 'Handle Slack webhook events' })
  @ApiResponse({ status: 200, description: 'Webhook processed successfully' })
  @ApiResponse({ status: 404, description: 'Workflow not found' })
  async handleSlackWebhook(
    @Param('workflowId') workflowId: string,
    @Body() payload: SlackWebhookPayload,
    @Headers('x-slack-signature') signature?: string,
    @Headers('x-slack-request-timestamp') timestamp?: string,
    @Req() request?: RawBodyRequest<Request>
  ) {
    this.logger.log(`Received Slack webhook for workflow ${workflowId}`, {
      type: payload.type,
      eventType: payload.event?.type,
      teamId: payload.team_id
    });

    try {
      // Handle URL verification challenge
      if (payload.type === 'url_verification') {
        this.logger.log(`Slack URL verification for workflow ${workflowId}`);
        return { challenge: payload.challenge };
      }

      // Handle event callback
      if (payload.type !== 'event_callback' || !payload.event) {
        this.logger.warn(`Invalid payload type: ${payload.type}`);
        return { status: 'error', message: 'Invalid payload type' };
      }

      // Find the workflow
      const workflowData = await this.workflowService.getWorkflow(workflowId);
      if (!workflowData) {
        this.logger.warn(`Workflow ${workflowId} not found`);
        return { status: 'error', message: 'Workflow not found' };
      }

      // Get nodes from canvas
      const nodes = workflowData.workflow?.canvas?.nodes || [];

      // Find Slack trigger nodes in the workflow
      const slackTriggerNodes = nodes.filter(
        node => node.type === 'CONNECTOR_TRIGGER' &&
               node.data?.connectorType === 'slack'
      );

      if (slackTriggerNodes.length === 0) {
        this.logger.warn(`No Slack trigger node found in workflow ${workflowId}`);
        return { status: 'error', message: 'No Slack trigger configured' };
      }

      // Find matching trigger for this event
      let matchingTriggerNode = null;
      const event = payload.event;

      for (const triggerNode of slackTriggerNodes) {
        const triggerId = triggerNode.data?.triggerId;
        const triggerConfig = triggerNode.data?.actionParams || {};

        // Match event type to trigger
        if (this.matchesTrigger(triggerId, event, triggerConfig)) {
          matchingTriggerNode = triggerNode;
          break;
        }
      }

      if (!matchingTriggerNode) {
        this.logger.debug('No matching trigger for this event type');
        return { status: 'ok', message: 'No matching trigger' };
      }

      // Verify Slack signature if available
      const shouldVerifySignature = matchingTriggerNode.data?.actionParams?.verifySignature !== false;
      if (shouldVerifySignature && signature && timestamp) {
        const isValid = await this.verifySlackSignature(
          signature,
          timestamp,
          request?.rawBody || JSON.stringify(payload),
          matchingTriggerNode.data?.actionParams?.signingSecret
        );

        if (!isValid) {
          this.logger.warn(`Invalid Slack signature for workflow ${workflowId}`);
          return { status: 'error', message: 'Invalid signature' };
        }
      }

      // Apply filters based on trigger configuration
      const triggerId = matchingTriggerNode.data?.triggerId;
      const triggerConfig = matchingTriggerNode.data?.actionParams || {};

      if (!this.passesFilters(triggerId, event, triggerConfig)) {
        this.logger.debug('Event filtered out by trigger configuration');
        return { status: 'ok', message: 'Event filtered' };
      }

      // Prepare trigger data based on event type
      const triggerData = this.prepareTriggerData(triggerId, event, triggerConfig);

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
      this.logger.error(`Error processing Slack webhook for workflow ${workflowId}:`, error);
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
      webhookUrl: `${process.env.APP_URL}/api/v1/webhooks/slack/${workflowId}`,
      status: 'ready',
      instructions: {
        setup: 'Configure this URL in your Slack App Event Subscriptions',
        steps: [
          '1. Go to https://api.slack.com/apps',
          '2. Select your app',
          '3. Navigate to Event Subscriptions',
          '4. Enable Events',
          `5. Enter Request URL: ${process.env.APP_URL}/api/v1/webhooks/slack/${workflowId}`,
          '6. Subscribe to the events you need (message.channels, app_mention, etc.)',
          '7. Save Changes and reinstall the app to your workspace'
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
      const slackTriggers = nodes.filter(
        node => node.type === 'CONNECTOR_TRIGGER' && node.data?.connectorType === 'slack'
      );

      return {
        workflowId,
        workflowStatus: workflow.status,
        appUrl: process.env.APP_URL,
        isHttps: process.env.APP_URL?.startsWith('https://'),
        expectedWebhookUrl: `${process.env.APP_URL}/api/v1/webhooks/slack/${workflowId}`,
        slackTriggers: slackTriggers.map(t => ({
          nodeId: t.id,
          triggerId: t.data?.triggerId,
          hasCredentialId: !!t.data?.connectorConfigId,
          config: t.data?.actionParams || {}
        })),
        troubleshooting: {
          step1: 'Check if workflow status is "active"',
          step2: 'Check if APP_URL is HTTPS (Slack requirement)',
          step3: 'Check if Slack App has correct Event Subscriptions enabled',
          step4: 'Check if webhook URL matches expected URL',
          step5: 'Check if signing secret is configured (optional but recommended)',
          step6: 'Send a test message to verify webhook is working'
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

  private matchesTrigger(triggerId: string, event: SlackEvent, config: any): boolean {
    switch (triggerId) {
      case 'message':
        return event.type === 'message' && !event.subtype;

      case 'app_mention':
        return event.type === 'app_mention';

      case 'reaction_added':
        return event.type === 'reaction_added';

      case 'channel_created':
        return event.type === 'channel_created';

      case 'team_join':
        return event.type === 'team_join';

      case 'file_shared':
        return event.type === 'file_shared';

      case 'file_public':
        return event.type === 'file_public';

      default:
        return false;
    }
  }

  private passesFilters(triggerId: string, event: SlackEvent, config: any): boolean {
    // Message trigger filters
    if (triggerId === 'message' && event.type === 'message') {
      const messageEvent = event as SlackMessageEvent;

      // Check watchWholeWorkspace filter
      const watchWholeWorkspace = config.watchWholeWorkspace !== false;
      if (!watchWholeWorkspace && config.channelId) {
        if (messageEvent.channel !== config.channelId) {
          return false;
        }
      }

      // Check ignoreUserList filter
      if (config.ignoreUserList) {
        const ignoredUsers = config.ignoreUserList.split(',').map((u: string) => u.trim());
        if (ignoredUsers.includes(messageEvent.user)) {
          return false;
        }
      }
    }

    // Reaction filter
    if (triggerId === 'reaction_added' && event.type === 'reaction_added' && config.reactionName) {
      const reactionEvent = event as SlackReactionAddedEvent;
      if (reactionEvent.reaction !== config.reactionName.replace(/:/g, '')) {
        return false;
      }
    }

    return true;
  }

  private prepareTriggerData(triggerId: string, event: SlackEvent, config: any): any {
    const baseData = {
      slackEvent: {
        type: event.type,
        event_ts: event.event_ts,
        timestamp: new Date(parseFloat(event.event_ts) * 1000).toISOString()
      }
    };

    switch (triggerId) {
      case 'message':
        const messageEvent = event as SlackMessageEvent;
        return {
          slackEvent: {
            ...baseData.slackEvent,
            channel: messageEvent.channel,
            user: messageEvent.user,
            text: messageEvent.text,
            ts: messageEvent.ts,
            channel_type: messageEvent.channel_type,
            thread_ts: messageEvent.thread_ts,
            subtype: messageEvent.subtype
          }
        };

      case 'app_mention':
        const mentionEvent = event as SlackAppMentionEvent;
        return {
          slackEvent: {
            ...baseData.slackEvent,
            channel: mentionEvent.channel,
            user: mentionEvent.user,
            text: mentionEvent.text,
            ts: mentionEvent.ts
          }
        };

      case 'reaction_added':
        const reactionEvent = event as SlackReactionAddedEvent;
        return {
          slackEvent: {
            ...baseData.slackEvent,
            user: reactionEvent.user,
            reaction: reactionEvent.reaction,
            item: reactionEvent.item,
            item_user: reactionEvent.item_user
          }
        };

      case 'channel_created':
        const channelEvent = event as SlackChannelCreatedEvent;
        return {
          slackEvent: {
            ...baseData.slackEvent,
            channel: channelEvent.channel
          }
        };

      case 'team_join':
        const teamJoinEvent = event as SlackTeamJoinEvent;
        return {
          slackEvent: {
            ...baseData.slackEvent,
            user: teamJoinEvent.user
          }
        };

      case 'file_shared':
        const fileSharedEvent = event as SlackFileSharedEvent;
        return {
          slackEvent: {
            ...baseData.slackEvent,
            file_id: fileSharedEvent.file_id,
            user_id: fileSharedEvent.user_id,
            file: fileSharedEvent.file,
            channel_id: fileSharedEvent.channel_id
          }
        };

      case 'file_public':
        const filePublicEvent = event as SlackFilePublicEvent;
        return {
          slackEvent: {
            ...baseData.slackEvent,
            file_id: filePublicEvent.file_id,
            user_id: filePublicEvent.user_id,
            file: filePublicEvent.file
          }
        };

      default:
        return baseData;
    }
  }

  private async verifySlackSignature(
    signature: string,
    timestamp: string,
    body: string | Buffer,
    signingSecret?: string
  ): Promise<boolean> {
    if (!signingSecret) {
      // If no signing secret configured, skip verification
      return true;
    }

    // Check timestamp to prevent replay attacks (5 minutes tolerance)
    const requestTimestamp = parseInt(timestamp, 10);
    const currentTimestamp = Math.floor(Date.now() / 1000);
    if (Math.abs(currentTimestamp - requestTimestamp) > 60 * 5) {
      this.logger.warn('Slack webhook timestamp is too old');
      return false;
    }

    // Compute expected signature
    const sigBasestring = `v0:${timestamp}:${body}`;
    const expectedSignature = 'v0=' + crypto
      .createHmac('sha256', signingSecret)
      .update(sigBasestring)
      .digest('hex');

    // Timing-safe comparison
    try {
      const signatureBuffer = Buffer.from(signature);
      const expectedBuffer = Buffer.from(expectedSignature);

      if (signatureBuffer.length !== expectedBuffer.length) {
        return false;
      }

      return crypto.timingSafeEqual(signatureBuffer, expectedBuffer);
    } catch (error) {
      this.logger.error('Error verifying Slack signature:', error);
      return false;
    }
  }
}
