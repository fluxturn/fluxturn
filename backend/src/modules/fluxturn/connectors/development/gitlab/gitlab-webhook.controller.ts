import {
  Controller,
  Post,
  Param,
  Body,
  Headers,
  Logger,
  HttpCode,
  HttpStatus,
  UnauthorizedException,
  Inject,
  forwardRef,
} from '@nestjs/common';
import { GitLabTriggerService } from './gitlab-trigger.service';
import { WorkflowService } from '../../../workflow/workflow.service';

interface GitLabWebhookPayload {
  object_kind: string;
  event_type?: string;
  event_name?: string;
  ref?: string;
  before?: string;
  after?: string;
  user_name?: string;
  user_email?: string;
  project?: {
    id: number;
    name: string;
    path_with_namespace: string;
    web_url: string;
  };
  commits?: any[];
  object_attributes?: any;
  user?: any;
  changes?: any;
  merge_request?: any;
  issue?: any;
}

/**
 * GitLab Webhook Controller
 *
 * Handles incoming webhook events from GitLab.
 * Routes events to the appropriate workflow based on workflow ID.
 *
 * Supported Events:
 * - Push Hook: Code pushed to repository
 * - Issue Hook: Issue created/updated/closed
 * - Merge Request Hook: MR created/updated/merged
 * - Pipeline Hook: Pipeline status changes
 * - Release Hook: Release created
 * - Tag Push Hook: Tag pushed
 * - Wiki Page Hook: Wiki page changes
 * - Note Hook: Comments on issues/MRs/commits
 */
@Controller('webhooks/gitlab')
export class GitLabWebhookController {
  private readonly logger = new Logger(GitLabWebhookController.name);

  constructor(
    private readonly gitlabTriggerService: GitLabTriggerService,
    @Inject(forwardRef(() => WorkflowService))
    private readonly workflowService: WorkflowService
  ) {}

  @Post(':workflowId')
  @HttpCode(HttpStatus.OK)
  async handleWebhook(
    @Param('workflowId') workflowId: string,
    @Body() payload: GitLabWebhookPayload,
    @Headers('x-gitlab-event') eventType: string,
    @Headers('x-gitlab-token') token: string
  ) {
    this.logger.log(`Received GitLab webhook for workflow ${workflowId}`);
    this.logger.debug(`Event type: ${eventType}`);
    this.logger.debug(`Object kind: ${payload.object_kind}`);

    // Validate secret token
    const isValid = this.gitlabTriggerService.validateSecretToken(workflowId, token);

    if (!isValid) {
      this.logger.warn(`Invalid token for workflow ${workflowId}`);
      throw new UnauthorizedException('Invalid webhook token');
    }

    try {
      // Map GitLab event type to trigger ID
      const triggerId = this.mapEventToTriggerId(eventType, payload.object_kind);

      // Get the active trigger to check if this event matches
      const activeTrigger = this.gitlabTriggerService.getActiveTrigger(workflowId);

      if (activeTrigger && activeTrigger.triggerId !== triggerId) {
        this.logger.debug(`Event ${triggerId} doesn't match trigger ${activeTrigger.triggerId}, skipping`);
        return { success: true, message: 'Event filtered out' };
      }

      // Prepare event data
      const eventData = this.prepareEventData(payload, eventType, triggerId);

      // Execute workflow
      await this.workflowService.executeWorkflow({
        workflow_id: workflowId,
        input_data: {
          gitlabEvent: eventData,
        },
      });

      this.logger.log(`✅ Successfully triggered workflow ${workflowId} with GitLab ${triggerId} event`);

      return {
        success: true,
        message: 'Webhook processed successfully',
        triggerId,
      };
    } catch (error) {
      this.logger.error(`Failed to process GitLab webhook for workflow ${workflowId}:`, error);
      throw error;
    }
  }

  private mapEventToTriggerId(eventType: string, objectKind: string): string {
    // Map GitLab event headers to trigger IDs
    const eventMap: Record<string, string> = {
      'Push Hook': 'on_push',
      'Tag Push Hook': 'on_tag_push',
      'Issue Hook': 'on_issue',
      'Merge Request Hook': 'on_merge_request',
      'Pipeline Hook': 'on_pipeline',
      'Release Hook': 'on_release',
      'Wiki Page Hook': 'on_wiki_page',
      'Note Hook': 'on_comment',
    };

    // Try header first, then fallback to object_kind
    if (eventMap[eventType]) {
      return eventMap[eventType];
    }

    // Fallback mapping using object_kind
    const objectKindMap: Record<string, string> = {
      'push': 'on_push',
      'tag_push': 'on_tag_push',
      'issue': 'on_issue',
      'merge_request': 'on_merge_request',
      'pipeline': 'on_pipeline',
      'release': 'on_release',
      'wiki_page': 'on_wiki_page',
      'note': 'on_comment',
    };

    return objectKindMap[objectKind] || 'on_push';
  }

  private prepareEventData(payload: GitLabWebhookPayload, eventType: string, triggerId: string): any {
    const baseData = {
      eventType,
      triggerId,
      timestamp: new Date().toISOString(),
      object_kind: payload.object_kind,
      project: payload.project,
    };

    switch (triggerId) {
      case 'on_push':
        return {
          ...baseData,
          ref: payload.ref,
          before: payload.before,
          after: payload.after,
          userName: payload.user_name,
          userEmail: payload.user_email,
          commits: payload.commits || [],
          totalCommitsCount: payload.commits?.length || 0,
          branch: this.extractBranchName(payload.ref),
        };

      case 'on_tag_push':
        return {
          ...baseData,
          ref: payload.ref,
          before: payload.before,
          after: payload.after,
          userName: payload.user_name,
          tagName: this.extractTagName(payload.ref),
          isCreated: payload.before === '0000000000000000000000000000000000000000',
          isDeleted: payload.after === '0000000000000000000000000000000000000000',
        };

      case 'on_issue':
        return {
          ...baseData,
          user: payload.user,
          object_attributes: payload.object_attributes,
          changes: payload.changes,
          action: payload.object_attributes?.action,
          issueId: payload.object_attributes?.id,
          issueIid: payload.object_attributes?.iid,
          title: payload.object_attributes?.title,
          description: payload.object_attributes?.description,
          state: payload.object_attributes?.state,
          url: payload.object_attributes?.url,
        };

      case 'on_merge_request':
        return {
          ...baseData,
          user: payload.user,
          object_attributes: payload.object_attributes,
          changes: payload.changes,
          action: payload.object_attributes?.action,
          mrId: payload.object_attributes?.id,
          mrIid: payload.object_attributes?.iid,
          title: payload.object_attributes?.title,
          description: payload.object_attributes?.description,
          sourceBranch: payload.object_attributes?.source_branch,
          targetBranch: payload.object_attributes?.target_branch,
          state: payload.object_attributes?.state,
          mergeStatus: payload.object_attributes?.merge_status,
          url: payload.object_attributes?.url,
        };

      case 'on_pipeline':
        return {
          ...baseData,
          user: payload.user,
          object_attributes: payload.object_attributes,
          pipelineId: payload.object_attributes?.id,
          ref: payload.object_attributes?.ref,
          sha: payload.object_attributes?.sha,
          status: payload.object_attributes?.status,
          stages: payload.object_attributes?.stages,
          duration: payload.object_attributes?.duration,
          createdAt: payload.object_attributes?.created_at,
          finishedAt: payload.object_attributes?.finished_at,
        };

      case 'on_release':
        return {
          ...baseData,
          tag: (payload as any).tag,
          name: (payload as any).name,
          description: (payload as any).description,
          url: (payload as any).url,
          action: (payload as any).action,
          releasedAt: (payload as any).released_at,
          createdAt: (payload as any).created_at,
        };

      case 'on_wiki_page':
        return {
          ...baseData,
          user: payload.user,
          wiki: (payload as any).wiki,
          object_attributes: payload.object_attributes,
          title: payload.object_attributes?.title,
          content: payload.object_attributes?.content,
          format: payload.object_attributes?.format,
          slug: payload.object_attributes?.slug,
          url: payload.object_attributes?.url,
          action: payload.object_attributes?.action,
        };

      case 'on_comment':
        return {
          ...baseData,
          user: payload.user,
          object_attributes: payload.object_attributes,
          noteId: payload.object_attributes?.id,
          note: payload.object_attributes?.note,
          noteableType: payload.object_attributes?.noteable_type,
          url: payload.object_attributes?.url,
          createdAt: payload.object_attributes?.created_at,
          issue: payload.issue,
          merge_request: payload.merge_request,
        };

      default:
        return {
          ...baseData,
          rawPayload: payload,
        };
    }
  }

  private extractBranchName(ref: string | undefined): string | null {
    if (!ref) return null;
    const match = ref.match(/^refs\/heads\/(.+)$/);
    return match ? match[1] : null;
  }

  private extractTagName(ref: string | undefined): string | null {
    if (!ref) return null;
    const match = ref.match(/^refs\/tags\/(.+)$/);
    return match ? match[1] : null;
  }
}
