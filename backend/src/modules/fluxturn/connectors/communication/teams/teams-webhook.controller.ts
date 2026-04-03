import { Controller, Post, Get, Param, Body, Headers, Logger, Query, Inject, forwardRef } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { WorkflowService } from '../../../workflow/workflow.service';
import { TeamsTriggerService } from './teams-trigger.service';

// Microsoft Graph Change Notification types
interface TeamsResourceData {
  id?: string;
  '@odata.type'?: string;
  '@odata.id'?: string;
}

interface TeamsChangeNotification {
  subscriptionId: string;
  subscriptionExpirationDateTime: string;
  changeType: 'created' | 'updated' | 'deleted';
  resource: string;
  resourceData?: TeamsResourceData;
  clientState?: string;
  tenantId?: string;
  encryptedContent?: {
    data: string;
    dataSignature: string;
    dataKey: string;
    encryptionCertificateId: string;
    encryptionCertificateThumbprint: string;
  };
}

interface TeamsWebhookPayload {
  value?: TeamsChangeNotification[];
  validationToken?: string;
}

@ApiTags('Teams Webhook')
@Controller('webhooks/teams')
export class TeamsWebhookController {
  private readonly logger = new Logger(TeamsWebhookController.name);

  constructor(
    @Inject(forwardRef(() => WorkflowService))
    private readonly workflowService: WorkflowService,
    private readonly teamsTriggerService: TeamsTriggerService
  ) {}

  @Post(':workflowId')
  @ApiOperation({ summary: 'Handle Microsoft Teams webhook events' })
  @ApiResponse({ status: 200, description: 'Webhook processed successfully' })
  @ApiResponse({ status: 202, description: 'Validation token acknowledged' })
  @ApiResponse({ status: 404, description: 'Workflow not found' })
  async handleTeamsWebhook(
    @Param('workflowId') workflowId: string,
    @Body() payload: TeamsWebhookPayload,
    @Query('validationToken') validationToken?: string,
    @Headers('client-state') clientState?: string
  ) {
    // Handle subscription validation (Microsoft Graph sends GET with validationToken)
    if (validationToken) {
      this.logger.log(`Teams subscription validation for workflow ${workflowId}`);
      return validationToken;
    }

    this.logger.log(`Received Teams webhook for workflow ${workflowId}`, {
      notificationCount: payload.value?.length || 0,
      hasClientState: !!clientState
    });

    try {
      // Check for notifications
      if (!payload.value || payload.value.length === 0) {
        this.logger.warn('No notifications in payload');
        return { status: 'ok', message: 'No notifications to process' };
      }

      // Find the workflow
      const workflowData = await this.workflowService.getWorkflow(workflowId);
      if (!workflowData) {
        this.logger.warn(`Workflow ${workflowId} not found`);
        return { status: 'error', message: 'Workflow not found' };
      }

      // Validate client state if provided
      if (clientState) {
        const isValid = this.teamsTriggerService.validateClientState(workflowId, clientState);
        if (!isValid) {
          this.logger.warn(`Invalid client state for workflow ${workflowId}`);
          return { status: 'error', message: 'Invalid client state' };
        }
      }

      // Get nodes from canvas
      const nodes = workflowData.workflow?.canvas?.nodes || [];

      // Find Teams trigger nodes in the workflow
      const teamsTriggerNodes = nodes.filter(
        node => node.type === 'CONNECTOR_TRIGGER' &&
               node.data?.connectorType === 'teams'
      );

      if (teamsTriggerNodes.length === 0) {
        this.logger.warn(`No Teams trigger node found in workflow ${workflowId}`);
        return { status: 'error', message: 'No Teams trigger configured' };
      }

      // Process each notification
      const results: any[] = [];
      for (const notification of payload.value) {
        // Find matching trigger for this notification
        let matchingTriggerNode = null;

        for (const triggerNode of teamsTriggerNodes) {
          const triggerId = triggerNode.data?.triggerId;

          if (this.matchesTrigger(triggerId, notification)) {
            matchingTriggerNode = triggerNode;
            break;
          }
        }

        if (!matchingTriggerNode) {
          this.logger.debug(`No matching trigger for notification type: ${notification.changeType}`);
          continue;
        }

        // Apply filters based on trigger configuration
        const triggerConfig = matchingTriggerNode.data?.actionParams || {};
        if (!this.passesFilters(matchingTriggerNode.data?.triggerId, notification, triggerConfig)) {
          this.logger.debug('Notification filtered out by trigger configuration');
          continue;
        }

        // Prepare trigger data based on notification type
        const triggerData = this.prepareTriggerData(
          matchingTriggerNode.data?.triggerId,
          notification
        );

        // Execute workflow with trigger data
        const execution = await this.workflowService.executeWorkflow({
          workflow_id: workflowId,
          input_data: triggerData,
          organization_id: workflowData.organization_id,
          project_id: workflowData.project_id
        });

        results.push({
          subscriptionId: notification.subscriptionId,
          executionId: execution.id,
          executionNumber: execution.execution_number
        });

        this.logger.log(`Workflow ${workflowId} executed successfully`, {
          executionId: execution.id,
          executionNumber: execution.execution_number
        });
      }

      // Microsoft Graph expects 202 Accepted for successful processing
      return {
        status: 'success',
        message: `Processed ${results.length} notification(s)`,
        executions: results
      };

    } catch (error) {
      this.logger.error(`Error processing Teams webhook for workflow ${workflowId}:`, error);
      return {
        status: 'error',
        message: 'Failed to process webhook',
        error: error.message
      };
    }
  }

  @Get(':workflowId')
  @ApiOperation({ summary: 'Handle Microsoft Graph subscription validation' })
  @ApiResponse({ status: 200, description: 'Validation token returned' })
  async handleValidation(
    @Param('workflowId') workflowId: string,
    @Query('validationToken') validationToken?: string
  ) {
    // Microsoft Graph sends a GET request with validationToken for subscription validation
    if (validationToken) {
      this.logger.log(`Teams subscription validation (GET) for workflow ${workflowId}`);
      return validationToken;
    }

    return { status: 'error', message: 'No validation token provided' };
  }

  @Get(':workflowId/info')
  @ApiOperation({ summary: 'Get webhook info for debugging' })
  async getWebhookInfo(@Param('workflowId') workflowId: string) {
    const status = await this.teamsTriggerService.getStatus(workflowId);

    return {
      webhookUrl: `${process.env.APP_URL}/api/v1/webhooks/teams/${workflowId}`,
      status: status.active ? 'active' : 'inactive',
      subscriptionStatus: status,
      instructions: {
        setup: 'Teams webhooks are automatically configured when the workflow is activated',
        notes: [
          'Microsoft Graph subscriptions expire after ~4230 minutes',
          'Subscriptions are automatically created when the trigger is activated',
          'The webhook URL must be publicly accessible over HTTPS',
          'Ensure your Azure AD app has the required permissions'
        ],
        requiredPermissions: [
          'ChannelMessage.Read.All (for channel messages)',
          'Chat.Read (for chat messages)',
          'Team.ReadBasic.All (for team events)',
          'Channel.ReadBasic.All (for channel events)'
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
      const teamsTriggers = nodes.filter(
        node => node.type === 'CONNECTOR_TRIGGER' && node.data?.connectorType === 'teams'
      );

      const triggerStatus = await this.teamsTriggerService.getStatus(workflowId);
      const activeTrigger = this.teamsTriggerService.getActiveTrigger(workflowId);

      return {
        workflowId,
        workflowStatus: workflow.status,
        appUrl: process.env.APP_URL,
        isHttps: process.env.APP_URL?.startsWith('https://'),
        expectedWebhookUrl: `${process.env.APP_URL}/api/v1/webhooks/teams/${workflowId}`,
        triggerStatus,
        activeTrigger: activeTrigger ? {
          triggerId: activeTrigger.triggerId,
          subscriptionId: activeTrigger.config?.subscriptionId,
          resource: activeTrigger.config?.resource,
          expirationDateTime: activeTrigger.config?.expirationDateTime
        } : null,
        teamsTriggers: teamsTriggers.map(t => ({
          nodeId: t.id,
          triggerId: t.data?.triggerId,
          hasCredentialId: !!t.data?.connectorConfigId,
          config: t.data?.actionParams || {}
        })),
        troubleshooting: {
          step1: 'Check if workflow status is "active"',
          step2: 'Check if APP_URL is HTTPS (Microsoft Graph requirement)',
          step3: 'Check if Azure AD app has required permissions',
          step4: 'Check if subscription is active and not expired',
          step5: 'Verify webhook URL is publicly accessible',
          step6: 'Check Microsoft Graph subscription status in Azure portal'
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

  private matchesTrigger(triggerId: string, notification: TeamsChangeNotification): boolean {
    const resource = notification.resource.toLowerCase();
    const changeType = notification.changeType;

    switch (triggerId) {
      case 'new_channel':
        return resource.includes('/channels') && changeType === 'created';

      case 'new_channel_message':
        return resource.includes('/messages') &&
               resource.includes('/channels/') &&
               changeType === 'created';

      case 'new_chat_message':
        return resource.includes('/chats/') &&
               resource.includes('/messages') &&
               changeType === 'created';

      case 'new_team_member':
        return resource.includes('/members') && changeType === 'created';

      default:
        return false;
    }
  }

  private passesFilters(
    triggerId: string,
    notification: TeamsChangeNotification,
    config: any
  ): boolean {
    // Channel message trigger filters
    if (triggerId === 'new_channel_message') {
      // Check if monitoring specific team
      if (config.teamId && !notification.resource.includes(config.teamId)) {
        return false;
      }

      // Check if monitoring specific channel
      if (config.channelId && !notification.resource.includes(config.channelId)) {
        return false;
      }
    }

    // Team member trigger filters
    if (triggerId === 'new_team_member') {
      if (config.teamId && !notification.resource.includes(config.teamId)) {
        return false;
      }
    }

    return true;
  }

  private prepareTriggerData(triggerId: string, notification: TeamsChangeNotification): any {
    const baseData = {
      teamsEvent: {
        subscriptionId: notification.subscriptionId,
        changeType: notification.changeType,
        resource: notification.resource,
        tenantId: notification.tenantId,
        subscriptionExpirationDateTime: notification.subscriptionExpirationDateTime,
        timestamp: new Date().toISOString()
      }
    };

    // Extract IDs from resource path
    const resourceParts = notification.resource.split('/');
    const resourceData = notification.resourceData || {};

    switch (triggerId) {
      case 'new_channel':
        return {
          teamsEvent: {
            ...baseData.teamsEvent,
            type: 'channel.created',
            channelId: resourceData.id,
            teamId: this.extractIdFromResource(notification.resource, 'teams')
          }
        };

      case 'new_channel_message':
        return {
          teamsEvent: {
            ...baseData.teamsEvent,
            type: 'channelMessage.created',
            messageId: resourceData.id,
            teamId: this.extractIdFromResource(notification.resource, 'teams'),
            channelId: this.extractIdFromResource(notification.resource, 'channels')
          }
        };

      case 'new_chat_message':
        return {
          teamsEvent: {
            ...baseData.teamsEvent,
            type: 'chatMessage.created',
            messageId: resourceData.id,
            chatId: this.extractIdFromResource(notification.resource, 'chats')
          }
        };

      case 'new_team_member':
        return {
          teamsEvent: {
            ...baseData.teamsEvent,
            type: 'teamMember.added',
            memberId: resourceData.id,
            teamId: this.extractIdFromResource(notification.resource, 'teams')
          }
        };

      default:
        return baseData;
    }
  }

  private extractIdFromResource(resource: string, type: string): string | null {
    // Extract ID from paths like /teams/{teamId}/channels/{channelId}/messages
    const regex = new RegExp(`/${type}/([^/]+)`);
    const match = resource.match(regex);
    return match ? match[1] : null;
  }
}
