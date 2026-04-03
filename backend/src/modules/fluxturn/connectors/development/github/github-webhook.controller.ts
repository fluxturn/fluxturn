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
  UnauthorizedException,
  Inject,
  forwardRef,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiParam } from '@nestjs/swagger';
import { WorkflowService } from '../../../workflow/workflow.service';
import * as crypto from 'crypto';

/**
 * GitHub Webhook Controller
 * Handles GitHub webhook events for workflow triggers
 *
 * Supported events:
 * - push: Code pushed to repository
 * - create: Branch or tag created
 * - delete: Branch or tag deleted
 * - commit_comment: Comment on commit
 * - repository: Repository created, deleted, archived, etc.
 */
@ApiTags('webhooks')
@Controller('webhooks/github')
export class GitHubWebhookController {
  private readonly logger = new Logger(GitHubWebhookController.name);

  constructor(
    @Inject(forwardRef(() => WorkflowService))
    private readonly workflowService: WorkflowService,
  ) {}

  /**
   * POST /webhooks/github/:workflowId
   * GitHub webhook endpoint for workflow triggers
   */
  @Post(':workflowId')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Receive GitHub webhook events',
    description: 'Endpoint that receives webhook events from GitHub',
  })
  @ApiParam({ name: 'workflowId', description: 'The workflow ID to trigger' })
  @ApiResponse({
    status: 200,
    description: 'Webhook received and workflow triggered',
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
    @Body() payload: any,
    @Headers('x-github-event') eventType: string,
    @Headers('x-hub-signature-256') signature: string,
    @Headers('x-github-delivery') deliveryId: string,
  ) {
    this.logger.log(
      `GitHub webhook received: Event=${eventType}, Workflow=${workflowId}, Delivery=${deliveryId}`,
    );

    try {
      // Validate the workflow exists
      const workflow = await this.workflowService.getWorkflow(workflowId);
      if (!workflow) {
        throw new NotFoundException('Workflow not found');
      }

      // Find the GitHub trigger node in workflow
      const githubTrigger = this.findGitHubTrigger(workflow, eventType);
      if (!githubTrigger) {
        this.logger.warn(
          `Workflow ${workflowId} does not have a GitHub trigger for event: ${eventType}`,
        );
        return {
          success: false,
          message: `No trigger configured for event type: ${eventType}`,
        };
      }

      // Verify webhook signature if secret is configured
      if (githubTrigger.data?.webhookSecret) {
        const isValid = this.verifySignature(
          payload,
          signature,
          githubTrigger.data.webhookSecret,
        );
        if (!isValid) {
          this.logger.warn('Invalid webhook signature');
          throw new UnauthorizedException('Invalid webhook signature');
        }
      }

      // Handle GitHub ping event
      if (eventType === 'ping') {
        this.logger.log('GitHub ping event received');
        return {
          success: true,
          message: 'Ping received',
        };
      }

      // Check if this event should trigger the workflow
      const shouldTrigger = this.shouldTriggerWorkflow(
        githubTrigger,
        eventType,
        payload,
      );

      if (!shouldTrigger) {
        return {
          success: true,
          message: 'Event received but did not match trigger conditions',
        };
      }

      // Prepare event data for workflow
      const eventData = this.prepareEventData(eventType, payload);

      this.logger.log(
        `Triggering workflow ${workflowId} for GitHub ${eventType} event`,
      );

      // Execute the workflow with the event data
      const result = await this.workflowService.executeWorkflow({
        workflow_id: workflowId,
        input_data: {
          githubEvent: eventData,
          triggeredAt: new Date().toISOString(),
          trigger: `github_${eventType}`,
          eventType,
          deliveryId,
        },
      });

      return {
        success: true,
        message: 'GitHub event processed successfully',
        executionId: result.id,
      };
    } catch (error) {
      this.logger.error(
        `Failed to process GitHub webhook: ${error.message}`,
        error.stack,
      );

      if (
        error instanceof NotFoundException ||
        error instanceof BadRequestException ||
        error instanceof UnauthorizedException
      ) {
        throw error;
      }

      // Return 200 to GitHub even on errors (to avoid retries)
      // but log the error for debugging
      return {
        success: false,
        message: `Error: ${error.message}`,
      };
    }
  }

  /**
   * Find GitHub trigger node in workflow for specific event type
   */
  private findGitHubTrigger(workflow: any, eventType: string): any | null {
    // Support both workflow.workflow.canvas and workflow.canvas structures
    const canvas = workflow.workflow?.canvas || workflow.canvas;

    if (!canvas || !canvas.nodes || canvas.nodes.length === 0) {
      this.logger.warn(`Workflow canvas is empty or missing nodes`);
      return null;
    }

    // Log all nodes for debugging
    this.logger.debug(`Workflow nodes: ${JSON.stringify(canvas.nodes.map((n: any) => ({ type: n.type, connectorType: n.data?.connectorType, triggerId: n.data?.triggerId })))}`);

    // Look for GitHub trigger nodes
    const triggers = canvas.nodes.filter(
      (node: any) =>
        node.type === 'GITHUB_TRIGGER' ||
        (node.type === 'CONNECTOR_TRIGGER' &&
          node.data?.connectorType === 'github'),
    );

    this.logger.debug(`Found ${triggers.length} GitHub trigger nodes`);

    // Find trigger that matches the event type
    for (const trigger of triggers) {
      const triggerId = trigger.data?.triggerId;
      const triggerParams = trigger.data?.triggerParams || {};

      // Map event types to trigger IDs
      const eventToTriggerMap: Record<string, string> = {
        push: 'on_push',
        create: 'on_create',
        delete: 'on_delete',
        commit_comment: 'on_commit_comment',
        repository: 'on_repository',
      };

      if (eventToTriggerMap[eventType] === triggerId) {
        return trigger;
      }
    }

    return null;
  }

  /**
   * Verify GitHub webhook signature
   */
  private verifySignature(
    payload: any,
    signature: string,
    secret: string,
  ): boolean {
    if (!signature) {
      return false;
    }

    try {
      const hmac = crypto.createHmac('sha256', secret);
      const digest = 'sha256=' + hmac.update(JSON.stringify(payload)).digest('hex');
      return crypto.timingSafeEqual(
        Buffer.from(signature),
        Buffer.from(digest),
      );
    } catch (error) {
      this.logger.error('Signature verification error:', error);
      return false;
    }
  }

  /**
   * Check if this event should trigger the workflow
   */
  private shouldTriggerWorkflow(
    triggerNode: any,
    eventType: string,
    payload: any,
  ): boolean {
    const triggerParams = triggerNode.data?.triggerParams || {};

    // Event-specific filtering
    switch (eventType) {
      case 'push':
        // Filter by branch if specified
        if (triggerParams.branch) {
          const ref = payload.ref || '';
          const branch = ref.replace('refs/heads/', '');
          if (branch !== triggerParams.branch) {
            this.logger.log(
              `Push event on branch ${branch} does not match filter ${triggerParams.branch}`,
            );
            return false;
          }
        }
        break;

      case 'create':
      case 'delete':
        // Filter by ref type if specified
        if (triggerParams.refType && triggerParams.refType !== 'all') {
          if (payload.ref_type !== triggerParams.refType) {
            this.logger.log(
              `${eventType} event on ${payload.ref_type} does not match filter ${triggerParams.refType}`,
            );
            return false;
          }
        }
        break;

      case 'repository':
        // Filter by repository actions if specified
        if (triggerParams.actions && triggerParams.actions.length > 0) {
          if (!triggerParams.actions.includes(payload.action)) {
            this.logger.log(
              `Repository action ${payload.action} does not match filters ${triggerParams.actions}`,
            );
            return false;
          }
        }
        break;
    }

    return true;
  }

  /**
   * Prepare event data in a structured format for the workflow
   */
  private prepareEventData(eventType: string, payload: any): any {
    const baseData = {
      eventType,
      timestamp: new Date().toISOString(),
      repository: payload.repository
        ? {
            id: payload.repository.id,
            name: payload.repository.name,
            full_name: payload.repository.full_name,
            url: payload.repository.html_url,
            owner: payload.repository.owner,
          }
        : null,
      sender: payload.sender
        ? {
            login: payload.sender.login,
            id: payload.sender.id,
            avatar_url: payload.sender.avatar_url,
            type: payload.sender.type,
          }
        : null,
    };

    // Add event-specific data
    switch (eventType) {
      case 'push':
        return {
          ...baseData,
          ref: payload.ref,
          before: payload.before,
          after: payload.after,
          commits: payload.commits,
          head_commit: payload.head_commit,
          pusher: payload.pusher,
          compare: payload.compare,
        };

      case 'create':
        return {
          ...baseData,
          ref: payload.ref,
          ref_type: payload.ref_type,
          master_branch: payload.master_branch,
          description: payload.description,
          pusher_type: payload.pusher_type,
        };

      case 'delete':
        return {
          ...baseData,
          ref: payload.ref,
          ref_type: payload.ref_type,
          pusher_type: payload.pusher_type,
        };

      case 'commit_comment':
        return {
          ...baseData,
          action: payload.action,
          comment: {
            id: payload.comment.id,
            body: payload.comment.body,
            commit_id: payload.comment.commit_id,
            path: payload.comment.path,
            position: payload.comment.position,
            line: payload.comment.line,
            html_url: payload.comment.html_url,
            user: payload.comment.user,
            created_at: payload.comment.created_at,
            updated_at: payload.comment.updated_at,
          },
        };

      case 'repository':
        return {
          ...baseData,
          action: payload.action,
          changes: payload.changes,
        };

      default:
        return {
          ...baseData,
          rawPayload: payload,
        };
    }
  }
}
