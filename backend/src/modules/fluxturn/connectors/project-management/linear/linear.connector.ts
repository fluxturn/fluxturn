import { Request } from 'express';
import { Injectable, Logger } from '@nestjs/common';
import { BaseConnector } from '../../base/base.connector';
import {
  ConnectorMetadata,
  ConnectorType,
  ConnectorCategory,
  ConnectorRequest,
  ConnectorResponse,
  AuthType,
  PaginatedRequest,
  ConnectorAction,
  ConnectorTrigger,
  BulkOperationResult
} from '../../types';
import {
  IProjectManagementConnector,
  ILinearConnector,
  PMProject,
  PMTask,
  PMComment,
  PMUser,
  PMAttachment,
  PMLabel,
  PMSearchOptions,
  PMStatusTransition
} from '../project-management.interface';
import { AuthUtils } from '../../utils/auth.utils';
import { ApiUtils } from '../../utils/api.utils';

interface LinearIssue {
  title: string;
  description?: string;
  priority?: number;
  estimate?: number;
  assigneeId?: string;
  teamId: string;
  projectId?: string;
  cycleId?: string;
  parentId?: string;
  labelIds?: string[];
  stateId?: string;
  dueDate?: string;
}

interface LinearProject {
  name: string;
  description?: string;
  teamIds: string[];
  state?: 'planned' | 'started' | 'paused' | 'completed' | 'canceled';
  targetDate?: string;
  color?: string;
  icon?: string;
}

interface LinearCycle {
  name: string;
  description?: string;
  teamId: string;
  startsAt: string;
  endsAt: string;
}

interface LinearComment {
  body: string;
  issueId: string;
}

@Injectable()
export class LinearConnector extends BaseConnector implements ILinearConnector {
  private readonly baseUrl = 'https://api.linear.app/graphql';

  constructor(
    private readonly authUtils: AuthUtils,
    private readonly apiUtils: ApiUtils
  ) {
    super();
  }

  getMetadata(): ConnectorMetadata {
    return {
      name: 'Linear',
      description: 'Linear issue tracking and project management with streamlined workflows',
      version: '1.0.0',
      category: ConnectorCategory.PROJECT_MANAGEMENT,
      type: ConnectorType.LINEAR,
      logoUrl: 'https://linear.app/favicon.ico',
      documentationUrl: 'https://developers.linear.app/docs',
      authType: AuthType.BEARER_TOKEN,
      requiredScopes: [],
      actions: this.getActions(),
      triggers: this.getTriggers(),
      rateLimit: {
        requestsPerMinute: 1000,
        requestsPerHour: 10000
      },
      webhookSupport: true
    };
  }

  protected async initializeConnection(): Promise<void> {
    try {
      // Test connection by getting current user
      const query = `
        query {
          viewer {
            id
            name
            email
          }
        }
      `;

      const response = await this.performGraphQLRequest(query);

      if (!response?.viewer) {
        throw new Error('Failed to connect to Linear API');
      }

      this.logger.log('Linear connector initialized successfully');
    } catch (error) {
      this.logger.error('Failed to initialize Linear connection:', error);
      throw new Error(`Linear connection failed: ${error.message}`);
    }
  }

  protected async performConnectionTest(): Promise<boolean> {
    try {
      const query = `
        query {
          viewer {
            id
          }
        }
      `;

      const response = await this.performGraphQLRequest(query);
      return !!response?.viewer;
    } catch (error) {
      this.logger.error('Linear connection test failed:', error);
      return false;
    }
  }

  protected async performHealthCheck(): Promise<void> {
    try {
      const query = `
        query {
          viewer {
            id
          }
        }
      `;

      await this.performGraphQLRequest(query);
    } catch (error) {
      throw new Error(`Linear health check failed: ${error.message}`);
    }
  }

  protected async performRequest(request: ConnectorRequest): Promise<any> {
    try {
      const response = await this.apiUtils.executeRequest({
        ...request,
        endpoint: this.baseUrl,
        headers: {
          ...this.getAuthHeaders(),
          'Content-Type': 'application/json',
          ...request.headers
        }
      });

      if (!response.success) {
        throw new Error(response.error?.message || 'Request failed');
      }

      return response.data?.data || response.data;
    } catch (error) {
      this.logger.error('Linear request failed:', error);
      throw error;
    }
  }

  private async performGraphQLRequest(query: string, variables?: any): Promise<any> {
    try {
      const response = await this.performRequest({
        method: 'POST',
        endpoint: '',
        body: {
          query,
          variables
        }
      });

      if (response.errors) {
        throw new Error(response.errors[0]?.message || 'GraphQL error');
      }

      return response;
    } catch (error) {
      this.logger.error('Linear GraphQL request failed:', error);
      throw error;
    }
  }

  protected async performAction(actionId: string, input: any): Promise<any> {
    switch (actionId) {
      case 'create_issue':
        return this.createTask(input);
      case 'update_issue':
        return this.updateTask(input.issueId, input.updates);
      case 'create_project':
        return this.createProject(input);
      case 'create_cycle':
        return this.createCycle(input);
      case 'add_comment':
        return this.addComment(input);
      case 'create_label':
        return this.createLabel(input);
      case 'assign_issue':
        return this.assignTask(input.issueId, input.assigneeId);
      default:
        throw new Error(`Unknown action: ${actionId}`);
    }
  }

  protected async cleanup(): Promise<void> {
    this.logger.log('Linear connector cleanup completed');
  }

  // Project Management Interface Implementation
  async createProject(project: PMProject): Promise<ConnectorResponse<PMProject>> {
    try {
      // Get teams first to assign project
      const teams = await this.getTeams();
      if (!teams.success || !teams.data?.length) {
        throw new Error('No teams found');
      }

      const mutation = `
        mutation ProjectCreate($input: ProjectCreateInput!) {
          projectCreate(input: $input) {
            success
            project {
              id
              name
              description
              state
              targetDate
              color
              icon
              url
              createdAt
              updatedAt
              teams {
                nodes {
                  id
                  name
                }
              }
            }
          }
        }
      `;

      const variables = {
        input: {
          name: project.name,
          description: project.description,
          teamIds: project.customFields?.teamIds || [teams.data[0].id],
          state: project.status?.toLowerCase() || 'planned',
          targetDate: project.endDate?.toISOString(),
          color: project.customFields?.color
        }
      };

      const response = await this.performGraphQLRequest(mutation, variables);

      if (!response.projectCreate.success) {
        throw new Error('Failed to create project');
      }

      const result = response.projectCreate.project;
      const mappedProject: PMProject = {
        id: result.id,
        name: result.name,
        description: result.description,
        status: this.capitalizeFirst(result.state),
        endDate: result.targetDate ? new Date(result.targetDate) : undefined,
        teamMembers: result.teams?.nodes?.map((team: any) => team.id) || [],
        customFields: {
          url: result.url,
          color: result.color,
          icon: result.icon,
          state: result.state,
          createdAt: result.createdAt,
          updatedAt: result.updatedAt
        }
      };

      return {
        success: true,
        data: mappedProject,
        metadata: {
          timestamp: new Date(),
          rateLimit: await this.getRateLimitInfo()
        }
      };
    } catch (error) {
      return this.handleError(error as any, 'Failed to create project');
    }
  }

  async updateProject(projectId: string, updates: Partial<PMProject>): Promise<ConnectorResponse<PMProject>> {
    try {
      const mutation = `
        mutation ProjectUpdate($id: String!, $input: ProjectUpdateInput!) {
          projectUpdate(id: $id, input: $input) {
            success
            project {
              id
              name
              description
              state
              targetDate
              color
              icon
              url
              updatedAt
            }
          }
        }
      `;

      const input: any = {};
      if (updates.name) input.name = updates.name;
      if (updates.description) input.description = updates.description;
      if (updates.status) input.state = updates.status.toLowerCase();
      if (updates.endDate) input.targetDate = updates.endDate.toISOString();

      const variables = { id: projectId, input };

      const response = await this.performGraphQLRequest(mutation, variables);

      if (!response.projectUpdate.success) {
        throw new Error('Failed to update project');
      }

      return this.getProject(projectId);
    } catch (error) {
      return this.handleError(error as any, 'Failed to update project');
    }
  }

  async getProject(projectId: string): Promise<ConnectorResponse<PMProject>> {
    try {
      const query = `
        query Project($id: String!) {
          project(id: $id) {
            id
            name
            description
            state
            targetDate
            color
            icon
            url
            createdAt
            updatedAt
            teams {
              nodes {
                id
                name
              }
            }
            lead {
              id
              name
            }
          }
        }
      `;

      const response = await this.performGraphQLRequest(query, { id: projectId });

      if (!response.project) {
        throw new Error('Project not found');
      }

      const result = response.project;
      const mappedProject: PMProject = {
        id: result.id,
        name: result.name,
        description: result.description,
        status: this.capitalizeFirst(result.state),
        endDate: result.targetDate ? new Date(result.targetDate) : undefined,
        ownerId: result.lead?.id,
        teamMembers: result.teams?.nodes?.map((team: any) => team.id) || [],
        customFields: {
          url: result.url,
          color: result.color,
          icon: result.icon,
          state: result.state,
          createdAt: result.createdAt,
          updatedAt: result.updatedAt
        }
      };

      return {
        success: true,
        data: mappedProject,
        metadata: {
          timestamp: new Date(),
          rateLimit: await this.getRateLimitInfo()
        }
      };
    } catch (error) {
      return this.handleError(error as any, 'Failed to get project');
    }
  }

  async getProjects(options?: PaginatedRequest): Promise<ConnectorResponse<PMProject[]>> {
    try {
      const query = `
        query Projects($first: Int, $after: String) {
          projects(first: $first, after: $after) {
            nodes {
              id
              name
              description
              state
              targetDate
              color
              icon
              url
              createdAt
              updatedAt
              teams {
                nodes {
                  id
                  name
                }
              }
              lead {
                id
                name
              }
            }
            pageInfo {
              hasNextPage
              endCursor
            }
          }
        }
      `;

      const variables = {
        first: options?.pageSize || 50,
        after: options?.page && options.page > 1 ? btoa(`arrayconnection:${(options.page - 1) * (options?.pageSize || 50)}`) : undefined
      };

      const response = await this.performGraphQLRequest(query, variables);

      const mappedProjects: PMProject[] = response.projects.nodes.map((project: any) => ({
        id: project.id,
        name: project.name,
        description: project.description,
        status: this.capitalizeFirst(project.state),
        endDate: project.targetDate ? new Date(project.targetDate) : undefined,
        ownerId: project.lead?.id,
        teamMembers: project.teams?.nodes?.map((team: any) => team.id) || [],
        customFields: {
          url: project.url,
          color: project.color,
          icon: project.icon,
          state: project.state,
          createdAt: project.createdAt,
          updatedAt: project.updatedAt
        }
      }));

      return {
        success: true,
        data: mappedProjects,
        metadata: {
          timestamp: new Date(),
          rateLimit: await this.getRateLimitInfo(),
          pagination: {
            page: options?.page || 1,
            pageSize: options?.pageSize || 50,
            total: 0,
            hasNext: response.projects.pageInfo.hasNextPage
          }
        }
      };
    } catch (error) {
      return this.handleError(error as any, 'Failed to get projects');
    }
  }

  async deleteProject(projectId: string): Promise<ConnectorResponse<{ deleted: boolean }>> {
    try {
      const mutation = `
        mutation ProjectDelete($id: String!) {
          projectDelete(id: $id) {
            success
          }
        }
      `;

      const response = await this.performGraphQLRequest(mutation, { id: projectId });

      return {
        success: true,
        data: { deleted: response.projectDelete.success },
        metadata: {
          timestamp: new Date(),
          rateLimit: await this.getRateLimitInfo()
        }
      };
    } catch (error) {
      return this.handleError(error as any, 'Failed to delete project');
    }
  }

  // Task/Issue Management
  async createTask(task: PMTask): Promise<ConnectorResponse<PMTask>> {
    try {
      // Get team ID if not provided
      let teamId = task.customFields?.teamId;
      if (!teamId) {
        const teams = await this.getTeams();
        if (!teams.success || !teams.data?.length) {
          throw new Error('No teams found');
        }
        teamId = teams.data[0].id;
      }

      const mutation = `
        mutation IssueCreate($input: IssueCreateInput!) {
          issueCreate(input: $input) {
            success
            issue {
              id
              identifier
              title
              description
              priority
              estimate
              url
              createdAt
              updatedAt
              dueDate
              state {
                id
                name
                color
              }
              assignee {
                id
                name
              }
              team {
                id
                name
              }
              project {
                id
                name
              }
              cycle {
                id
                name
              }
              parent {
                id
                identifier
              }
              labels {
                nodes {
                  id
                  name
                  color
                }
              }
            }
          }
        }
      `;

      const variables = {
        input: {
          title: task.title,
          description: task.description,
          priority: this.mapPriorityToNumber(task.priority),
          estimate: task.estimatedHours,
          assigneeId: task.assigneeId,
          teamId: teamId,
          projectId: task.projectId,
          parentId: task.parentTaskId,
          labelIds: task.customFields?.labelIds,
          stateId: task.customFields?.stateId,
          dueDate: task.dueDate?.toISOString()
        }
      };

      const response = await this.performGraphQLRequest(mutation, variables);

      if (!response.issueCreate.success) {
        throw new Error('Failed to create issue');
      }

      const result = response.issueCreate.issue;
      const mappedTask: PMTask = {
        id: result.id,
        title: result.title,
        description: result.description,
        status: result.state?.name,
        priority: this.mapNumberToPriority(result.priority),
        assigneeId: result.assignee?.id,
        projectId: result.project?.id,
        parentTaskId: result.parent?.id,
        dueDate: result.dueDate ? new Date(result.dueDate) : undefined,
        estimatedHours: result.estimate,
        tags: result.labels?.nodes?.map((label: any) => label.name) || [],
        customFields: {
          identifier: result.identifier,
          url: result.url,
          teamId: result.team?.id,
          teamName: result.team?.name,
          cycleId: result.cycle?.id,
          cycleName: result.cycle?.name,
          stateId: result.state?.id,
          stateColor: result.state?.color,
          createdAt: result.createdAt,
          updatedAt: result.updatedAt
        }
      };

      return {
        success: true,
        data: mappedTask,
        metadata: {
          timestamp: new Date(),
          rateLimit: await this.getRateLimitInfo()
        }
      };
    } catch (error) {
      return this.handleError(error as any, 'Failed to create task');
    }
  }

  async updateTask(taskId: string, updates: Partial<PMTask>): Promise<ConnectorResponse<PMTask>> {
    try {
      const mutation = `
        mutation IssueUpdate($id: String!, $input: IssueUpdateInput!) {
          issueUpdate(id: $id, input: $input) {
            success
            issue {
              id
              title
              description
              updatedAt
            }
          }
        }
      `;

      const input: any = {};
      if (updates.title) input.title = updates.title;
      if (updates.description) input.description = updates.description;
      if (updates.priority) input.priority = this.mapPriorityToNumber(updates.priority);
      if (updates.estimatedHours !== undefined) input.estimate = updates.estimatedHours;
      if (updates.assigneeId) input.assigneeId = updates.assigneeId;
      if (updates.projectId) input.projectId = updates.projectId;
      if (updates.parentTaskId) input.parentId = updates.parentTaskId;
      if (updates.dueDate) input.dueDate = updates.dueDate.toISOString();

      const variables = { id: taskId, input };

      const response = await this.performGraphQLRequest(mutation, variables);

      if (!response.issueUpdate.success) {
        throw new Error('Failed to update issue');
      }

      return this.getTask(taskId);
    } catch (error) {
      return this.handleError(error as any, 'Failed to update task');
    }
  }

  async getTask(taskId: string): Promise<ConnectorResponse<PMTask>> {
    try {
      const query = `
        query Issue($id: String!) {
          issue(id: $id) {
            id
            identifier
            title
            description
            priority
            estimate
            url
            createdAt
            updatedAt
            dueDate
            state {
              id
              name
              color
            }
            assignee {
              id
              name
            }
            team {
              id
              name
            }
            project {
              id
              name
            }
            cycle {
              id
              name
            }
            parent {
              id
              identifier
            }
            labels {
              nodes {
                id
                name
                color
              }
            }
          }
        }
      `;

      const response = await this.performGraphQLRequest(query, { id: taskId });

      if (!response.issue) {
        throw new Error('Issue not found');
      }

      const result = response.issue;
      const mappedTask: PMTask = {
        id: result.id,
        title: result.title,
        description: result.description,
        status: result.state?.name,
        priority: this.mapNumberToPriority(result.priority),
        assigneeId: result.assignee?.id,
        projectId: result.project?.id,
        parentTaskId: result.parent?.id,
        dueDate: result.dueDate ? new Date(result.dueDate) : undefined,
        estimatedHours: result.estimate,
        tags: result.labels?.nodes?.map((label: any) => label.name) || [],
        customFields: {
          identifier: result.identifier,
          url: result.url,
          teamId: result.team?.id,
          teamName: result.team?.name,
          cycleId: result.cycle?.id,
          cycleName: result.cycle?.name,
          stateId: result.state?.id,
          stateColor: result.state?.color,
          createdAt: result.createdAt,
          updatedAt: result.updatedAt
        }
      };

      return {
        success: true,
        data: mappedTask,
        metadata: {
          timestamp: new Date(),
          rateLimit: await this.getRateLimitInfo()
        }
      };
    } catch (error) {
      return this.handleError(error as any, 'Failed to get task');
    }
  }

  async getTasks(options?: PMSearchOptions): Promise<ConnectorResponse<PMTask[]>> {
    try {
      const query = `
        query Issues($first: Int, $after: String, $filter: IssueFilter) {
          issues(first: $first, after: $after, filter: $filter) {
            nodes {
              id
              identifier
              title
              description
              priority
              estimate
              url
              createdAt
              updatedAt
              dueDate
              state {
                id
                name
                color
              }
              assignee {
                id
                name
              }
              team {
                id
                name
              }
              project {
                id
                name
              }
              cycle {
                id
                name
              }
              parent {
                id
                identifier
              }
              labels {
                nodes {
                  id
                  name
                  color
                }
              }
            }
            pageInfo {
              hasNextPage
              endCursor
            }
          }
        }
      `;

      const filter: any = {};
      if (options?.projectId) filter.project = { id: { eq: options.projectId } };
      if (options?.assigneeId) filter.assignee = { id: { eq: options.assigneeId } };
      if (options?.status) filter.state = { name: { eq: options.status } };
      if (options?.priority) filter.priority = { eq: this.mapPriorityToNumber(options.priority) };
      if (options?.query) filter.title = { containsIgnoreCase: options.query };

      const variables = {
        first: options?.pageSize || 50,
        after: options?.page && options.page > 1 ? btoa(`arrayconnection:${(options.page - 1) * (options?.pageSize || 50)}`) : undefined,
        filter: Object.keys(filter).length > 0 ? filter : undefined
      };

      const response = await this.performGraphQLRequest(query, variables);

      const mappedTasks: PMTask[] = response.issues.nodes.map((issue: any) => ({
        id: issue.id,
        title: issue.title,
        description: issue.description,
        status: issue.state?.name,
        priority: this.mapNumberToPriority(issue.priority),
        assigneeId: issue.assignee?.id,
        projectId: issue.project?.id,
        parentTaskId: issue.parent?.id,
        dueDate: issue.dueDate ? new Date(issue.dueDate) : undefined,
        estimatedHours: issue.estimate,
        tags: issue.labels?.nodes?.map((label: any) => label.name) || [],
        customFields: {
          identifier: issue.identifier,
          url: issue.url,
          teamId: issue.team?.id,
          teamName: issue.team?.name,
          cycleId: issue.cycle?.id,
          cycleName: issue.cycle?.name,
          stateId: issue.state?.id,
          stateColor: issue.state?.color,
          createdAt: issue.createdAt,
          updatedAt: issue.updatedAt
        }
      }));

      return {
        success: true,
        data: mappedTasks,
        metadata: {
          timestamp: new Date(),
          rateLimit: await this.getRateLimitInfo(),
          pagination: {
            page: options?.page || 1,
            pageSize: options?.pageSize || 50,
            total: 0,
            hasNext: response.issues.pageInfo.hasNextPage
          }
        }
      };
    } catch (error) {
      return this.handleError(error as any, 'Failed to get tasks');
    }
  }

  async deleteTask(taskId: string): Promise<ConnectorResponse<{ deleted: boolean }>> {
    try {
      const mutation = `
        mutation IssueDelete($id: String!) {
          issueDelete(id: $id) {
            success
          }
        }
      `;

      const response = await this.performGraphQLRequest(mutation, { id: taskId });

      return {
        success: true,
        data: { deleted: response.issueDelete.success },
        metadata: {
          timestamp: new Date(),
          rateLimit: await this.getRateLimitInfo()
        }
      };
    } catch (error) {
      return this.handleError(error as any, 'Failed to delete task');
    }
  }

  async assignTask(taskId: string, assigneeId: string): Promise<ConnectorResponse<PMTask>> {
    try {
      const mutation = `
        mutation IssueUpdate($id: String!, $input: IssueUpdateInput!) {
          issueUpdate(id: $id, input: $input) {
            success
          }
        }
      `;

      const variables = {
        id: taskId,
        input: { assigneeId }
      };

      const response = await this.performGraphQLRequest(mutation, variables);

      if (!response.issueUpdate.success) {
        throw new Error('Failed to assign issue');
      }

      return this.getTask(taskId);
    } catch (error) {
      return this.handleError(error as any, 'Failed to assign task');
    }
  }

  async transitionTask(taskId: string, transition: PMStatusTransition): Promise<ConnectorResponse<PMTask>> {
    try {
      // Get team states to find the target state
      const task = await this.getTask(taskId);
      if (!task.success) {
        throw new Error('Failed to get task');
      }

      const query = `
        query WorkflowStates($filter: WorkflowStateFilter) {
          workflowStates(filter: $filter) {
            nodes {
              id
              name
              color
            }
          }
        }
      `;

      const response = await this.performGraphQLRequest(query, {
        filter: {
          team: { id: { eq: task.data!.customFields?.teamId } }
        }
      });

      const targetState = response.workflowStates.nodes.find((state: any) =>
        state.name.toLowerCase() === transition.to.toLowerCase()
      );

      if (!targetState) {
        throw new Error(`State "${transition.to}" not found`);
      }

      const mutation = `
        mutation IssueUpdate($id: String!, $input: IssueUpdateInput!) {
          issueUpdate(id: $id, input: $input) {
            success
          }
        }
      `;

      await this.performGraphQLRequest(mutation, {
        id: taskId,
        input: { stateId: targetState.id }
      });

      // Add comment if provided
      if (transition.comment) {
        await this.addComment({
          content: transition.comment,
          authorId: '', // Will be set to current user
          taskId: taskId
        });
      }

      return this.getTask(taskId);
    } catch (error) {
      return this.handleError(error as any, 'Failed to transition task');
    }
  }

  // Comments and Collaboration
  async addComment(comment: PMComment): Promise<ConnectorResponse<PMComment>> {
    try {
      const mutation = `
        mutation CommentCreate($input: CommentCreateInput!) {
          commentCreate(input: $input) {
            success
            comment {
              id
              body
              createdAt
              updatedAt
              user {
                id
                name
              }
              issue {
                id
              }
            }
          }
        }
      `;

      const variables = {
        input: {
          body: comment.content,
          issueId: comment.taskId
        }
      };

      const response = await this.performGraphQLRequest(mutation, variables);

      if (!response.commentCreate.success) {
        throw new Error('Failed to create comment');
      }

      const result = response.commentCreate.comment;
      const mappedComment: PMComment = {
        id: result.id,
        content: result.body,
        authorId: result.user?.id,
        taskId: comment.taskId,
        createdAt: new Date(result.createdAt),
        updatedAt: new Date(result.updatedAt)
      };

      return {
        success: true,
        data: mappedComment,
        metadata: {
          timestamp: new Date(),
          rateLimit: await this.getRateLimitInfo()
        }
      };
    } catch (error) {
      return this.handleError(error as any, 'Failed to add comment');
    }
  }

  async updateComment(commentId: string, content: string): Promise<ConnectorResponse<PMComment>> {
    try {
      const mutation = `
        mutation CommentUpdate($id: String!, $input: CommentUpdateInput!) {
          commentUpdate(id: $id, input: $input) {
            success
            comment {
              id
              body
              updatedAt
              user {
                id
                name
              }
            }
          }
        }
      `;

      const variables = {
        id: commentId,
        input: { body: content }
      };

      const response = await this.performGraphQLRequest(mutation, variables);

      if (!response.commentUpdate.success) {
        throw new Error('Failed to update comment');
      }

      const result = response.commentUpdate.comment;
      const mappedComment: PMComment = {
        id: result.id,
        content: result.body,
        authorId: result.user?.id,
        updatedAt: new Date(result.updatedAt)
      };

      return {
        success: true,
        data: mappedComment,
        metadata: {
          timestamp: new Date(),
          rateLimit: await this.getRateLimitInfo()
        }
      };
    } catch (error) {
      return this.handleError(error as any, 'Failed to update comment');
    }
  }

  async getComments(taskId: string, options?: PaginatedRequest): Promise<ConnectorResponse<PMComment[]>> {
    try {
      const query = `
        query Comments($filter: CommentFilter, $first: Int, $after: String) {
          comments(filter: $filter, first: $first, after: $after) {
            nodes {
              id
              body
              createdAt
              updatedAt
              user {
                id
                name
              }
              issue {
                id
              }
            }
            pageInfo {
              hasNextPage
              endCursor
            }
          }
        }
      `;

      const variables = {
        filter: {
          issue: { id: { eq: taskId } }
        },
        first: options?.pageSize || 50,
        after: options?.page && options.page > 1 ? btoa(`arrayconnection:${(options.page - 1) * (options?.pageSize || 50)}`) : undefined
      };

      const response = await this.performGraphQLRequest(query, variables);

      const mappedComments: PMComment[] = response.comments.nodes.map((comment: any) => ({
        id: comment.id,
        content: comment.body,
        authorId: comment.user?.id,
        taskId: taskId,
        createdAt: new Date(comment.createdAt),
        updatedAt: new Date(comment.updatedAt)
      }));

      return {
        success: true,
        data: mappedComments,
        metadata: {
          timestamp: new Date(),
          rateLimit: await this.getRateLimitInfo(),
          pagination: {
            page: options?.page || 1,
            pageSize: options?.pageSize || 50,
            total: 0,
            hasNext: response.comments.pageInfo.hasNextPage
          }
        }
      };
    } catch (error) {
      return this.handleError(error as any, 'Failed to get comments');
    }
  }

  async deleteComment(commentId: string): Promise<ConnectorResponse<{ deleted: boolean }>> {
    try {
      const mutation = `
        mutation CommentDelete($id: String!) {
          commentDelete(id: $id) {
            success
          }
        }
      `;

      const response = await this.performGraphQLRequest(mutation, { id: commentId });

      return {
        success: true,
        data: { deleted: response.commentDelete.success },
        metadata: {
          timestamp: new Date(),
          rateLimit: await this.getRateLimitInfo()
        }
      };
    } catch (error) {
      return this.handleError(error as any, 'Failed to delete comment');
    }
  }

  // User Management
  async getUsers(options?: PaginatedRequest): Promise<ConnectorResponse<PMUser[]>> {
    try {
      const query = `
        query Users($first: Int, $after: String) {
          users(first: $first, after: $after) {
            nodes {
              id
              name
              email
              avatarUrl
              isActive
            }
            pageInfo {
              hasNextPage
              endCursor
            }
          }
        }
      `;

      const variables = {
        first: options?.pageSize || 50,
        after: options?.page && options.page > 1 ? btoa(`arrayconnection:${(options.page - 1) * (options?.pageSize || 50)}`) : undefined
      };

      const response = await this.performGraphQLRequest(query, variables);

      const mappedUsers: PMUser[] = response.users.nodes.map((user: any) => ({
        id: user.id,
        name: user.name,
        email: user.email,
        avatar: user.avatarUrl,
        isActive: user.isActive
      }));

      return {
        success: true,
        data: mappedUsers,
        metadata: {
          timestamp: new Date(),
          rateLimit: await this.getRateLimitInfo()
        }
      };
    } catch (error) {
      return this.handleError(error as any, 'Failed to get users');
    }
  }

  async getUser(userId: string): Promise<ConnectorResponse<PMUser>> {
    try {
      const query = `
        query User($id: String!) {
          user(id: $id) {
            id
            name
            email
            avatarUrl
            isActive
          }
        }
      `;

      const response = await this.performGraphQLRequest(query, { id: userId });

      if (!response.user) {
        throw new Error('User not found');
      }

      const result = response.user;
      const mappedUser: PMUser = {
        id: result.id,
        name: result.name,
        email: result.email,
        avatar: result.avatarUrl,
        isActive: result.isActive
      };

      return {
        success: true,
        data: mappedUser,
        metadata: {
          timestamp: new Date(),
          rateLimit: await this.getRateLimitInfo()
        }
      };
    } catch (error) {
      return this.handleError(error as any, 'Failed to get user');
    }
  }

  async getCurrentUser(): Promise<ConnectorResponse<PMUser>> {
    try {
      const query = `
        query {
          viewer {
            id
            name
            email
            avatarUrl
            isActive
          }
        }
      `;

      const response = await this.performGraphQLRequest(query);

      const result = response.viewer;
      const mappedUser: PMUser = {
        id: result.id,
        name: result.name,
        email: result.email,
        avatar: result.avatarUrl,
        isActive: result.isActive
      };

      return {
        success: true,
        data: mappedUser,
        metadata: {
          timestamp: new Date(),
          rateLimit: await this.getRateLimitInfo()
        }
      };
    } catch (error) {
      return this.handleError(error as any, 'Failed to get current user');
    }
  }

  // Labels/Tags
  async createLabel(label: PMLabel): Promise<ConnectorResponse<PMLabel>> {
    try {
      // Get teams first as labels are team-specific
      const teams = await this.getTeams();
      if (!teams.success || !teams.data?.length) {
        throw new Error('No teams found');
      }

      const mutation = `
        mutation IssueLabelCreate($input: IssueLabelCreateInput!) {
          issueLabelCreate(input: $input) {
            success
            issueLabel {
              id
              name
              color
              description
            }
          }
        }
      `;

      const variables = {
        input: {
          name: label.name,
          color: label.color || '#000000',
          description: label.description,
          teamId: teams.data[0].id
        }
      };

      const response = await this.performGraphQLRequest(mutation, variables);

      if (!response.issueLabelCreate.success) {
        throw new Error('Failed to create label');
      }

      const result = response.issueLabelCreate.issueLabel;
      const mappedLabel: PMLabel = {
        id: result.id,
        name: result.name,
        color: result.color,
        description: result.description
      };

      return {
        success: true,
        data: mappedLabel,
        metadata: {
          timestamp: new Date(),
          rateLimit: await this.getRateLimitInfo()
        }
      };
    } catch (error) {
      return this.handleError(error as any, 'Failed to create label');
    }
  }

  async getLabels(): Promise<ConnectorResponse<PMLabel[]>> {
    try {
      const query = `
        query IssueLabels {
          issueLabels {
            nodes {
              id
              name
              color
              description
            }
          }
        }
      `;

      const response = await this.performGraphQLRequest(query);

      const mappedLabels: PMLabel[] = response.issueLabels.nodes.map((label: any) => ({
        id: label.id,
        name: label.name,
        color: label.color,
        description: label.description
      }));

      return {
        success: true,
        data: mappedLabels,
        metadata: {
          timestamp: new Date(),
          rateLimit: await this.getRateLimitInfo()
        }
      };
    } catch (error) {
      return this.handleError(error as any, 'Failed to get labels');
    }
  }

  async addLabelToTask(taskId: string, labelId: string): Promise<ConnectorResponse<boolean>> {
    try {
      // Get current task labels
      const task = await this.getTask(taskId);
      if (!task.success) {
        throw new Error('Failed to get task');
      }

      const currentLabelIds = task.data!.customFields?.labelIds || [];
      const newLabelIds = [...currentLabelIds, labelId];

      const mutation = `
        mutation IssueUpdate($id: String!, $input: IssueUpdateInput!) {
          issueUpdate(id: $id, input: $input) {
            success
          }
        }
      `;

      const variables = {
        id: taskId,
        input: { labelIds: newLabelIds }
      };

      const response = await this.performGraphQLRequest(mutation, variables);

      return {
        success: true,
        data: response.issueUpdate.success,
        metadata: {
          timestamp: new Date(),
          rateLimit: await this.getRateLimitInfo()
        }
      };
    } catch (error) {
      return this.handleError(error as any, 'Failed to add label to task');
    }
  }

  async removeLabelFromTask(taskId: string, labelId: string): Promise<ConnectorResponse<boolean>> {
    try {
      // Get current task labels
      const task = await this.getTask(taskId);
      if (!task.success) {
        throw new Error('Failed to get task');
      }

      const currentLabelIds = task.data!.customFields?.labelIds || [];
      const newLabelIds = currentLabelIds.filter(id => id !== labelId);

      const mutation = `
        mutation IssueUpdate($id: String!, $input: IssueUpdateInput!) {
          issueUpdate(id: $id, input: $input) {
            success
          }
        }
      `;

      const variables = {
        id: taskId,
        input: { labelIds: newLabelIds }
      };

      const response = await this.performGraphQLRequest(mutation, variables);

      return {
        success: true,
        data: response.issueUpdate.success,
        metadata: {
          timestamp: new Date(),
          rateLimit: await this.getRateLimitInfo()
        }
      };
    } catch (error) {
      return this.handleError(error as any, 'Failed to remove label from task');
    }
  }

  // Attachments
  async addAttachment(taskId: string, attachment: PMAttachment): Promise<ConnectorResponse<PMAttachment>> {
    try {
      const mutation = `
        mutation AttachmentCreate($input: AttachmentCreateInput!) {
          attachmentCreate(input: $input) {
            success
            attachment {
              id
              title
              url
              subtitle
              metadata
              createdAt
            }
          }
        }
      `;

      const variables = {
        input: {
          title: attachment.name,
          url: attachment.url,
          issueId: taskId,
          subtitle: attachment.mimeType
        }
      };

      const response = await this.performGraphQLRequest(mutation, variables);

      if (!response.attachmentCreate.success) {
        throw new Error('Failed to create attachment');
      }

      const result = response.attachmentCreate.attachment;
      const mappedAttachment: PMAttachment = {
        id: result.id,
        name: result.title,
        url: result.url,
        mimeType: result.subtitle,
        uploadedAt: new Date(result.createdAt)
      };

      return {
        success: true,
        data: mappedAttachment,
        metadata: {
          timestamp: new Date(),
          rateLimit: await this.getRateLimitInfo()
        }
      };
    } catch (error) {
      return this.handleError(error as any, 'Failed to add attachment');
    }
  }

  async getAttachments(taskId: string): Promise<ConnectorResponse<PMAttachment[]>> {
    try {
      const query = `
        query Attachments($filter: AttachmentFilter) {
          attachments(filter: $filter) {
            nodes {
              id
              title
              url
              subtitle
              metadata
              createdAt
            }
          }
        }
      `;

      const variables = {
        filter: {
          issue: { id: { eq: taskId } }
        }
      };

      const response = await this.performGraphQLRequest(query, variables);

      const mappedAttachments: PMAttachment[] = response.attachments.nodes.map((attachment: any) => ({
        id: attachment.id,
        name: attachment.title,
        url: attachment.url,
        mimeType: attachment.subtitle,
        uploadedAt: new Date(attachment.createdAt)
      }));

      return {
        success: true,
        data: mappedAttachments,
        metadata: {
          timestamp: new Date(),
          rateLimit: await this.getRateLimitInfo()
        }
      };
    } catch (error) {
      return this.handleError(error as any, 'Failed to get attachments');
    }
  }

  async deleteAttachment(attachmentId: string): Promise<ConnectorResponse<{ deleted: boolean }>> {
    try {
      const mutation = `
        mutation AttachmentDelete($id: String!) {
          attachmentDelete(id: $id) {
            success
          }
        }
      `;

      const response = await this.performGraphQLRequest(mutation, { id: attachmentId });

      return {
        success: true,
        data: { deleted: response.attachmentDelete.success },
        metadata: {
          timestamp: new Date(),
          rateLimit: await this.getRateLimitInfo()
        }
      };
    } catch (error) {
      return this.handleError(error as any, 'Failed to delete attachment');
    }
  }

  // Search and Filtering
  async searchTasks(options: PMSearchOptions): Promise<ConnectorResponse<PMTask[]>> {
    return this.getTasks(options);
  }

  async searchProjects(query: string, options?: PaginatedRequest): Promise<ConnectorResponse<PMProject[]>> {
    try {
      const queryGQL = `
        query Projects($first: Int, $after: String, $filter: ProjectFilter) {
          projects(first: $first, after: $after, filter: $filter) {
            nodes {
              id
              name
              description
              state
              targetDate
              color
              icon
              url
              createdAt
              updatedAt
            }
            pageInfo {
              hasNextPage
              endCursor
            }
          }
        }
      `;

      const variables = {
        first: options?.pageSize || 50,
        after: options?.page && options.page > 1 ? btoa(`arrayconnection:${(options.page - 1) * (options?.pageSize || 50)}`) : undefined,
        filter: {
          name: { containsIgnoreCase: query }
        }
      };

      const response = await this.performGraphQLRequest(queryGQL, variables);

      const mappedProjects: PMProject[] = response.projects.nodes.map((project: any) => ({
        id: project.id,
        name: project.name,
        description: project.description,
        status: this.capitalizeFirst(project.state),
        endDate: project.targetDate ? new Date(project.targetDate) : undefined,
        customFields: {
          url: project.url,
          color: project.color,
          icon: project.icon,
          state: project.state,
          createdAt: project.createdAt,
          updatedAt: project.updatedAt
        }
      }));

      return {
        success: true,
        data: mappedProjects,
        metadata: {
          timestamp: new Date(),
          rateLimit: await this.getRateLimitInfo()
        }
      };
    } catch (error) {
      return this.handleError(error as any, 'Failed to search projects');
    }
  }

  // Linear-specific methods
  async createCycle(cycle: { name: string; description?: string; startDate: Date; endDate: Date; teamId: string }): Promise<ConnectorResponse<any>> {
    try {
      const mutation = `
        mutation CycleCreate($input: CycleCreateInput!) {
          cycleCreate(input: $input) {
            success
            cycle {
              id
              name
              description
              startsAt
              endsAt
              team {
                id
                name
              }
            }
          }
        }
      `;

      const variables = {
        input: {
          name: cycle.name,
          description: cycle.description,
          teamId: cycle.teamId,
          startsAt: cycle.startDate.toISOString(),
          endsAt: cycle.endDate.toISOString()
        }
      };

      const response = await this.performGraphQLRequest(mutation, variables);

      if (!response.cycleCreate.success) {
        throw new Error('Failed to create cycle');
      }

      const result = response.cycleCreate.cycle;

      return {
        success: true,
        data: {
          id: result.id,
          name: result.name,
          description: result.description,
          startDate: new Date(result.startsAt),
          endDate: new Date(result.endsAt),
          teamId: cycle.teamId,
          teamName: result.team?.name
        },
        metadata: {
          timestamp: new Date(),
          rateLimit: await this.getRateLimitInfo()
        }
      };
    } catch (error) {
      return this.handleError(error as any, 'Failed to create cycle');
    }
  }

  async getCycles(teamId?: string): Promise<ConnectorResponse<any[]>> {
    try {
      const query = `
        query Cycles($filter: CycleFilter) {
          cycles(filter: $filter) {
            nodes {
              id
              name
              description
              startsAt
              endsAt
              team {
                id
                name
              }
            }
          }
        }
      `;

      const variables = teamId ? {
        filter: {
          team: { id: { eq: teamId } }
        }
      } : {};

      const response = await this.performGraphQLRequest(query, variables);

      const mappedCycles = response.cycles.nodes.map((cycle: any) => ({
        id: cycle.id,
        name: cycle.name,
        description: cycle.description,
        startDate: new Date(cycle.startsAt),
        endDate: new Date(cycle.endsAt),
        teamId: cycle.team?.id,
        teamName: cycle.team?.name
      }));

      return {
        success: true,
        data: mappedCycles,
        metadata: {
          timestamp: new Date(),
          rateLimit: await this.getRateLimitInfo()
        }
      };
    } catch (error) {
      return this.handleError(error as any, 'Failed to get cycles');
    }
  }

  async addIssueToCycle(issueId: string, cycleId: string): Promise<ConnectorResponse<boolean>> {
    try {
      const mutation = `
        mutation IssueUpdate($id: String!, $input: IssueUpdateInput!) {
          issueUpdate(id: $id, input: $input) {
            success
          }
        }
      `;

      const variables = {
        id: issueId,
        input: { cycleId }
      };

      const response = await this.performGraphQLRequest(mutation, variables);

      return {
        success: true,
        data: response.issueUpdate.success,
        metadata: {
          timestamp: new Date(),
          rateLimit: await this.getRateLimitInfo()
        }
      };
    } catch (error) {
      return this.handleError(error as any, 'Failed to add issue to cycle');
    }
  }

  async getTeams(): Promise<ConnectorResponse<any[]>> {
    try {
      const query = `
        query Teams {
          teams {
            nodes {
              id
              name
              key
              description
            }
          }
        }
      `;

      const response = await this.performGraphQLRequest(query);

      const mappedTeams = response.teams.nodes.map((team: any) => ({
        id: team.id,
        name: team.name,
        key: team.key,
        description: team.description
      }));

      return {
        success: true,
        data: mappedTeams,
        metadata: {
          timestamp: new Date(),
          rateLimit: await this.getRateLimitInfo()
        }
      };
    } catch (error) {
      return this.handleError(error as any, 'Failed to get teams');
    }
  }

  async getTeam(teamId: string): Promise<ConnectorResponse<any>> {
    try {
      const query = `
        query Team($id: String!) {
          team(id: $id) {
            id
            name
            key
            description
          }
        }
      `;

      const response = await this.performGraphQLRequest(query, { id: teamId });

      if (!response.team) {
        throw new Error('Team not found');
      }

      const result = response.team;

      return {
        success: true,
        data: {
          id: result.id,
          name: result.name,
          key: result.key,
          description: result.description
        },
        metadata: {
          timestamp: new Date(),
          rateLimit: await this.getRateLimitInfo()
        }
      };
    } catch (error) {
      return this.handleError(error as any, 'Failed to get team');
    }
  }

  async createIssueRelation(issueId: string, relatedIssueId: string, type: string): Promise<ConnectorResponse<any>> {
    try {
      const mutation = `
        mutation IssueRelationCreate($input: IssueRelationCreateInput!) {
          issueRelationCreate(input: $input) {
            success
            issueRelation {
              id
              type
              issue {
                id
                identifier
              }
              relatedIssue {
                id
                identifier
              }
            }
          }
        }
      `;

      const variables = {
        input: {
          issueId,
          relatedIssueId,
          type: type.toUpperCase()
        }
      };

      const response = await this.performGraphQLRequest(mutation, variables);

      if (!response.issueRelationCreate.success) {
        throw new Error('Failed to create issue relation');
      }

      const result = response.issueRelationCreate.issueRelation;

      return {
        success: true,
        data: {
          id: result.id,
          type: result.type,
          issueId: result.issue?.id,
          relatedIssueId: result.relatedIssue?.id
        },
        metadata: {
          timestamp: new Date(),
          rateLimit: await this.getRateLimitInfo()
        }
      };
    } catch (error) {
      return this.handleError(error as any, 'Failed to create issue relation');
    }
  }

  async getIssueHistory(issueId: string): Promise<ConnectorResponse<any[]>> {
    try {
      const query = `
        query IssueHistory($id: String!) {
          issue(id: $id) {
            history {
              nodes {
                id
                createdAt
                actor {
                  id
                  name
                }
                changes {
                  field
                  from
                  to
                }
              }
            }
          }
        }
      `;

      const response = await this.performGraphQLRequest(query, { id: issueId });

      if (!response.issue) {
        throw new Error('Issue not found');
      }

      const mappedHistory = response.issue.history.nodes.map((entry: any) => ({
        id: entry.id,
        createdAt: new Date(entry.createdAt),
        actor: {
          id: entry.actor?.id,
          name: entry.actor?.name
        },
        changes: entry.changes
      }));

      return {
        success: true,
        data: mappedHistory,
        metadata: {
          timestamp: new Date(),
          rateLimit: await this.getRateLimitInfo()
        }
      };
    } catch (error) {
      return this.handleError(error as any, 'Failed to get issue history');
    }
  }

  // Helper methods
  private mapPriorityToNumber(priority?: string): number {
    const priorityMap: Record<string, number> = {
      'Low': 1,
      'Medium': 2,
      'High': 3,
      'Urgent': 4,
      'Critical': 5
    };
    return priority ? priorityMap[priority] || 2 : 2;
  }

  private mapNumberToPriority(priority?: number): string {
    const priorityMap: Record<number, string> = {
      1: 'Low',
      2: 'Medium',
      3: 'High',
      4: 'Urgent',
      5: 'Critical'
    };
    return priority ? priorityMap[priority] || 'Medium' : 'Medium';
  }

  private capitalizeFirst(str: string): string {
    return str.charAt(0).toUpperCase() + str.slice(1);
  }

  private getAuthHeaders(): Record<string, string> {
    if (this.config.credentials.accessToken) {
      return {
        'Authorization': `Bearer ${this.config.credentials.accessToken}`
      };
    }
    return {};
  }

  private getActions(): ConnectorAction[] {
    return [
      {
        id: 'create_issue',
        name: 'Create Issue',
        description: 'Create a new issue in Linear',
        inputSchema: {
          title: { type: 'string', required: true, description: 'Issue title' },
          description: { type: 'string', description: 'Issue description' },
          teamId: { type: 'string', description: 'Team ID (defaults to first team)' },
          priority: { type: 'string', description: 'Issue priority' },
          assigneeId: { type: 'string', description: 'Assignee user ID' },
          projectId: { type: 'string', description: 'Project ID' },
          cycleId: { type: 'string', description: 'Cycle ID' }
        },
        outputSchema: {
          id: { type: 'string', description: 'Created issue ID' },
          identifier: { type: 'string', description: 'Issue identifier' },
          url: { type: 'string', description: 'Issue URL' }
        }
      },
      {
        id: 'update_issue',
        name: 'Update Issue',
        description: 'Update an existing issue in Linear',
        inputSchema: {
          issueId: { type: 'string', required: true, description: 'Issue ID' },
          updates: { type: 'object', required: true, description: 'Fields to update' }
        },
        outputSchema: {
          success: { type: 'boolean', description: 'Whether update was successful' }
        }
      },
      {
        id: 'create_project',
        name: 'Create Project',
        description: 'Create a new project in Linear',
        inputSchema: {
          name: { type: 'string', required: true, description: 'Project name' },
          description: { type: 'string', description: 'Project description' },
          teamIds: { type: 'array', description: 'Team IDs' }
        },
        outputSchema: {
          id: { type: 'string', description: 'Created project ID' }
        }
      },
      {
        id: 'create_cycle',
        name: 'Create Cycle',
        description: 'Create a new cycle in Linear',
        inputSchema: {
          name: { type: 'string', required: true, description: 'Cycle name' },
          teamId: { type: 'string', required: true, description: 'Team ID' },
          startDate: { type: 'string', required: true, description: 'Start date (ISO format)' },
          endDate: { type: 'string', required: true, description: 'End date (ISO format)' },
          description: { type: 'string', description: 'Cycle description' }
        },
        outputSchema: {
          id: { type: 'string', description: 'Created cycle ID' }
        }
      },
      {
        id: 'add_comment',
        name: 'Add Comment',
        description: 'Add a comment to an issue',
        inputSchema: {
          taskId: { type: 'string', required: true, description: 'Issue ID' },
          content: { type: 'string', required: true, description: 'Comment content' }
        },
        outputSchema: {
          id: { type: 'string', description: 'Comment ID' }
        }
      },
      {
        id: 'create_label',
        name: 'Create Label',
        description: 'Create a new label',
        inputSchema: {
          name: { type: 'string', required: true, description: 'Label name' },
          color: { type: 'string', description: 'Label color (hex)' },
          description: { type: 'string', description: 'Label description' }
        },
        outputSchema: {
          id: { type: 'string', description: 'Created label ID' }
        }
      },
      {
        id: 'assign_issue',
        name: 'Assign Issue',
        description: 'Assign an issue to a user',
        inputSchema: {
          issueId: { type: 'string', required: true, description: 'Issue ID' },
          assigneeId: { type: 'string', required: true, description: 'User ID' }
        },
        outputSchema: {
          success: { type: 'boolean', description: 'Whether assignment was successful' }
        }
      }
    ];
  }

  private getTriggers(): ConnectorTrigger[] {
    return [
      {
        id: 'issue_created',
        name: 'Issue Created',
        description: 'Triggered when a new issue is created',
        eventType: 'linear:issue_created',
        outputSchema: {
          issue: { type: 'object', description: 'Created issue information' }
        },
        webhookRequired: true
      },
      {
        id: 'issue_updated',
        name: 'Issue Updated',
        description: 'Triggered when an issue is updated',
        eventType: 'linear:issue_updated',
        outputSchema: {
          issue: { type: 'object', description: 'Updated issue information' }
        },
        webhookRequired: true
      },
      {
        id: 'issue_completed',
        name: 'Issue Completed',
        description: 'Triggered when an issue is completed',
        eventType: 'linear:issue_completed',
        outputSchema: {
          issue: { type: 'object', description: 'Completed issue information' }
        },
        webhookRequired: true
      },
      {
        id: 'project_created',
        name: 'Project Created',
        description: 'Triggered when a new project is created',
        eventType: 'linear:project_created',
        outputSchema: {
          project: { type: 'object', description: 'Created project information' }
        },
        webhookRequired: true
      },
      {
        id: 'comment_created',
        name: 'Comment Created',
        description: 'Triggered when a comment is added to an issue',
        eventType: 'linear:comment_created',
        outputSchema: {
          comment: { type: 'object', description: 'Created comment information' }
        },
        webhookRequired: true
      },
      {
        id: 'cycle_created',
        name: 'Cycle Created',
        description: 'Triggered when a new cycle is created',
        eventType: 'linear:cycle_created',
        outputSchema: {
          cycle: { type: 'object', description: 'Created cycle information' }
        },
        webhookRequired: true
      }
    ];
  }
}