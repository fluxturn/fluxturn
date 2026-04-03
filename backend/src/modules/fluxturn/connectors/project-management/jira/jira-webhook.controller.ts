import {
  Controller,
  Post,
  Body,
  Param,
  HttpCode,
  HttpStatus,
  NotFoundException,
  BadRequestException,
  Logger,
  Headers,
  Inject,
  forwardRef,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiParam } from '@nestjs/swagger';
import { WorkflowService } from '../../../workflow/workflow.service';
import { JiraTriggerService } from './jira-trigger.service';

/**
 * Jira Webhook Controller
 *
 * Receives webhook events from Jira Cloud/Server.
 * Jira sends POST requests when configured events occur.
 *
 * Supported events:
 * - jira:issue_created, jira:issue_updated, jira:issue_deleted
 * - comment_created, comment_updated, comment_deleted
 * - sprint_created, sprint_started, sprint_closed
 * - project_created, project_updated
 * - worklog_created
 */
@ApiTags('webhooks')
@Controller('webhooks/jira')
export class JiraWebhookController {
  private readonly logger = new Logger(JiraWebhookController.name);

  constructor(
    @Inject(forwardRef(() => WorkflowService))
    private readonly workflowService: WorkflowService,
    private readonly jiraTriggerService: JiraTriggerService
  ) {}

  /**
   * POST /webhooks/jira/:workflowId
   * Jira webhook event receiver
   *
   * Receives events from Jira:
   * - Issue events (created, updated, deleted)
   * - Comment events (created, updated, deleted)
   * - Sprint events (created, started, closed)
   * - Project events (created, updated)
   * - Worklog events (created)
   */
  @Post(':workflowId')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Receive Jira webhook events',
    description: 'Endpoint that receives events from Jira (issues, comments, sprints, projects, worklogs)',
  })
  @ApiParam({ name: 'workflowId', description: 'The workflow ID to trigger' })
  @ApiResponse({
    status: 200,
    description: 'Event received and workflow triggered',
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
    @Body() payload: JiraWebhookPayload,
    @Headers('x-atlassian-webhook-identifier') webhookIdentifier?: string,
    @Headers('user-agent') userAgent?: string
  ) {
    this.logger.log(`Jira webhook event received for workflow: ${workflowId}`);
    this.logger.debug(`Event type: ${payload.webhookEvent}`);
    this.logger.debug(`Payload: ${JSON.stringify(payload, null, 2)}`);

    try {
      // Validate the workflow exists
      const workflow = await this.workflowService.getWorkflow(workflowId);
      if (!workflow) {
        throw new NotFoundException('Workflow not found');
      }

      // Get canvas from either workflow.canvas or workflow.workflow.canvas
      const canvas = workflow.workflow?.canvas || workflow.canvas;

      // Find the Jira trigger node
      const jiraTrigger = canvas?.nodes?.find(
        (node: any) =>
          node.type === 'CONNECTOR_TRIGGER' &&
          node.data?.connectorType === 'jira'
      );

      if (!jiraTrigger) {
        throw new BadRequestException('This workflow does not have a Jira trigger');
      }

      // Check if this event should trigger the workflow
      const shouldTrigger = this.jiraTriggerService.shouldTrigger(workflowId, payload);

      if (!shouldTrigger) {
        // Also check based on configured trigger type
        const configuredTriggerId = jiraTrigger.data?.triggerId;
        const eventMatches = this.doesEventMatchTrigger(payload.webhookEvent, configuredTriggerId);

        if (!eventMatches) {
          return {
            success: true,
            message: `Event ${payload.webhookEvent} does not match trigger ${configuredTriggerId}`,
          };
        }
      }

      // Process the event
      let eventData = this.jiraTriggerService.processWebhookEvent(workflowId, payload);

      if (!eventData) {
        eventData = this.prepareEventData(payload, jiraTrigger.data?.triggerId);
      }

      this.logger.log(`Triggering workflow for Jira ${payload.webhookEvent} event`);

      // Execute the workflow with the event data
      const result = await this.workflowService.executeWorkflow({
        workflow_id: workflowId,
        input_data: {
          jiraEvent: eventData,
          triggeredAt: new Date().toISOString(),
          trigger: 'jira_webhook',
          webhookEvent: payload.webhookEvent,
        },
      });

      return {
        success: true,
        message: `Processed Jira ${payload.webhookEvent} event`,
        executionId: result.id,
      };
    } catch (error) {
      this.logger.error(`Failed to process Jira webhook:`, error);

      if (error instanceof NotFoundException || error instanceof BadRequestException) {
        throw error;
      }

      // Return 200 to Jira even on errors (to avoid retries)
      return {
        success: false,
        message: `Error: ${error.message}`,
      };
    }
  }

  /**
   * Check if the webhook event matches the configured trigger
   */
  private doesEventMatchTrigger(webhookEvent: string, triggerId?: string): boolean {
    if (!triggerId) {
      return true; // No specific trigger = match all
    }

    const eventToTriggerMap: Record<string, string> = {
      'jira:issue_created': 'issue_created',
      'jira:issue_updated': 'issue_updated',
      'jira:issue_deleted': 'issue_deleted',
      'comment_created': 'comment_created',
      'comment_updated': 'comment_updated',
      'comment_deleted': 'comment_deleted',
      'sprint_created': 'sprint_created',
      'sprint_started': 'sprint_started',
      'sprint_closed': 'sprint_closed',
      'project_created': 'project_created',
      'project_updated': 'project_updated',
      'worklog_created': 'worklog_created',
    };

    const mappedTriggerId = eventToTriggerMap[webhookEvent];
    return mappedTriggerId === triggerId;
  }

  /**
   * Prepare event data in a structured format for the workflow
   */
  private prepareEventData(payload: JiraWebhookPayload, triggerId?: string): any {
    const baseData = {
      webhookEvent: payload.webhookEvent,
      timestamp: payload.timestamp || new Date().toISOString(),
    };

    // Handle issue events
    if (payload.webhookEvent?.startsWith('jira:issue')) {
      return {
        ...baseData,
        event: triggerId || this.mapEventToTriggerId(payload.webhookEvent),
        issue: this.formatIssue(payload.issue),
        user: this.formatUser(payload.user),
        changelog: payload.changelog,
      };
    }

    // Handle comment events
    if (payload.webhookEvent?.includes('comment')) {
      return {
        ...baseData,
        event: triggerId || 'comment_event',
        comment: this.formatComment(payload.comment),
        issue: this.formatIssue(payload.issue),
        user: this.formatUser(payload.user),
      };
    }

    // Handle sprint events
    if (payload.webhookEvent?.includes('sprint')) {
      return {
        ...baseData,
        event: triggerId || 'sprint_event',
        sprint: payload.sprint,
      };
    }

    // Handle project events
    if (payload.webhookEvent?.includes('project')) {
      return {
        ...baseData,
        event: triggerId || 'project_event',
        project: payload.project,
        user: this.formatUser(payload.user),
      };
    }

    // Handle worklog events
    if (payload.webhookEvent?.includes('worklog')) {
      return {
        ...baseData,
        event: triggerId || 'worklog_created',
        worklog: payload.worklog,
        issue: this.formatIssue(payload.issue),
        user: this.formatUser(payload.user),
      };
    }

    // Default: return raw payload
    return {
      ...baseData,
      event: triggerId || payload.webhookEvent,
      data: payload,
    };
  }

  /**
   * Map Jira webhook event to trigger ID
   */
  private mapEventToTriggerId(webhookEvent: string): string {
    const map: Record<string, string> = {
      'jira:issue_created': 'issue_created',
      'jira:issue_updated': 'issue_updated',
      'jira:issue_deleted': 'issue_deleted',
    };
    return map[webhookEvent] || webhookEvent;
  }

  /**
   * Format issue data
   */
  private formatIssue(issue: any): any {
    if (!issue) return null;

    return {
      id: issue.id,
      key: issue.key,
      self: issue.self,
      summary: issue.fields?.summary,
      description: this.extractTextFromAdf(issue.fields?.description),
      status: issue.fields?.status?.name,
      statusId: issue.fields?.status?.id,
      priority: issue.fields?.priority?.name,
      priorityId: issue.fields?.priority?.id,
      issueType: issue.fields?.issuetype?.name,
      issueTypeId: issue.fields?.issuetype?.id,
      project: {
        id: issue.fields?.project?.id,
        key: issue.fields?.project?.key,
        name: issue.fields?.project?.name,
      },
      assignee: issue.fields?.assignee ? {
        accountId: issue.fields.assignee.accountId,
        displayName: issue.fields.assignee.displayName,
        emailAddress: issue.fields.assignee.emailAddress,
      } : null,
      reporter: issue.fields?.reporter ? {
        accountId: issue.fields.reporter.accountId,
        displayName: issue.fields.reporter.displayName,
        emailAddress: issue.fields.reporter.emailAddress,
      } : null,
      labels: issue.fields?.labels || [],
      dueDate: issue.fields?.duedate,
      created: issue.fields?.created,
      updated: issue.fields?.updated,
    };
  }

  /**
   * Format user data
   */
  private formatUser(user: any): any {
    if (!user) return null;

    return {
      accountId: user.accountId,
      displayName: user.displayName,
      emailAddress: user.emailAddress,
      active: user.active,
      avatarUrl: user.avatarUrls?.['48x48'],
    };
  }

  /**
   * Format comment data
   */
  private formatComment(comment: any): any {
    if (!comment) return null;

    return {
      id: comment.id,
      self: comment.self,
      body: this.extractTextFromAdf(comment.body),
      author: this.formatUser(comment.author),
      updateAuthor: this.formatUser(comment.updateAuthor),
      created: comment.created,
      updated: comment.updated,
    };
  }

  /**
   * Extract plain text from Atlassian Document Format (ADF)
   */
  private extractTextFromAdf(adf: any): string {
    if (!adf) return '';
    if (typeof adf === 'string') return adf;

    const extractText = (node: any): string => {
      if (!node) return '';

      if (node.type === 'text') {
        return node.text || '';
      }

      if (node.content && Array.isArray(node.content)) {
        return node.content.map(extractText).join('');
      }

      return '';
    };

    return extractText(adf).trim();
  }
}

// Type definitions for Jira webhook payload
interface JiraWebhookPayload {
  webhookEvent: string;
  timestamp?: string | number;
  issue?: any;
  user?: any;
  changelog?: any;
  comment?: any;
  sprint?: any;
  project?: any;
  worklog?: any;
}
