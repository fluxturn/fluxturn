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
  IJiraConnector,
  PMProject,
  PMTask,
  PMComment,
  PMUser,
  PMAttachment,
  PMLabel,
  PMSprint,
  PMBoard,
  PMSearchOptions,
  PMStatusTransition,
  PMTimeEntry,
  PMWorkspace
} from '../project-management.interface';
import { AuthUtils } from '../../utils/auth.utils';
import { ApiUtils } from '../../utils/api.utils';

interface JiraProject {
  key: string;
  name: string;
  description?: string;
  projectTypeKey: string;
  lead?: { accountId: string };
  projectCategory?: { id: string };
}

interface JiraIssue {
  fields: {
    summary: string;
    description?: any;
    issuetype: { id: string; name: string };
    priority?: { id: string; name: string };
    assignee?: { accountId: string };
    reporter?: { accountId: string };
    project: { key: string };
    parent?: { key: string };
    epic?: { key: string };
    sprint?: any;
    duedate?: string;
    timeoriginalestimate?: number;
    timespent?: number;
    labels?: string[];
    attachment?: any[];
    customfield_10000?: any; // Epic name field (commonly)
    [key: string]: any;
  };
  update?: any;
  transition?: { id: string };
}

@Injectable()
export class JiraConnector extends BaseConnector implements IJiraConnector {
  private baseUrl: string;

  constructor(
    private readonly authUtils: AuthUtils,
    private readonly apiUtils: ApiUtils
  ) {
    super();
  }

  getMetadata(): ConnectorMetadata {
    return {
      name: 'Jira',
      description: 'Atlassian Jira project management and issue tracking platform with agile support',
      version: '1.0.0',
      category: ConnectorCategory.PROJECT_MANAGEMENT,
      type: ConnectorType.JIRA,
      logoUrl: 'https://wac-cdn.atlassian.com/dam/jcr:8f27f4b5-12b8-4dbe-886e-41a5e6d7c8e0/jira-software-icon-blue.svg',
      documentationUrl: 'https://developer.atlassian.com/cloud/jira/platform/rest/v3/',
      authType: AuthType.BASIC_AUTH,
      requiredScopes: [],
      actions: this.getActions(),
      triggers: this.getTriggers(),
      rateLimit: {
        requestsPerSecond: 10,
        requestsPerMinute: 300,
        requestsPerHour: 10000
      },
      webhookSupport: true
    };
  }

  protected async initializeConnection(): Promise<void> {
    try {
      this.baseUrl = this.config.credentials.domain || this.config.credentials.instanceUrl || '';
      if (!this.baseUrl) {
        throw new Error('Jira domain/instanceUrl is required');
      }

      if (!this.baseUrl.startsWith('http')) {
        this.baseUrl = `https://${this.baseUrl}`;
      }

      // Test connection by getting server info
      const response = await this.performRequest({
        method: 'GET',
        endpoint: '/rest/api/3/serverInfo',
        headers: this.getAuthHeaders()
      });

      if (!response) {
        throw new Error('Failed to connect to Jira API');
      }

      this.logger.log('Jira connector initialized successfully');
    } catch (error) {
      this.logger.error('Failed to initialize Jira connection:', error);
      throw new Error(`Jira connection failed: ${error.message}`);
    }
  }

  protected async performConnectionTest(): Promise<boolean> {
    try {
      const response = await this.performRequest({
        method: 'GET',
        endpoint: '/rest/api/3/myself',
        headers: this.getAuthHeaders()
      });
      return !!response;
    } catch (error) {
      this.logger.error('Jira connection test failed:', error);
      return false;
    }
  }

  protected async performHealthCheck(): Promise<void> {
    try {
      await this.performRequest({
        method: 'GET',
        endpoint: '/rest/api/3/serverInfo',
        headers: this.getAuthHeaders()
      });
    } catch (error) {
      throw new Error(`Jira health check failed: ${error.message}`);
    }
  }

  protected async performRequest(request: ConnectorRequest): Promise<any> {
    try {
      const response = await this.apiUtils.executeRequest({
        ...request,
        endpoint: `${this.baseUrl}${request.endpoint}`,
        headers: {
          ...this.getAuthHeaders(),
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          ...request.headers
        }
      });

      if (!response.success) {
        throw new Error(response.error?.message || 'Request failed');
      }

      return response.data;
    } catch (error) {
      this.logger.error('Jira request failed:', error);
      throw error;
    }
  }

  protected async performAction(actionId: string, input: any): Promise<any> {
    switch (actionId) {
      case 'create_issue':
        // Map action input to PMTask format
        const taskInput = {
          title: input.summary,
          description: input.description,
          projectId: input.projectId,
          priority: input.priority,
          assigneeId: input.assignee,
          tags: input.labels ? input.labels.split(',').map((l: string) => l.trim()).filter(Boolean) : undefined,
          dueDate: input.dueDate ? new Date(input.dueDate) : undefined,
          parentTaskId: input.parentKey,
          customFields: {
            issueTypeId: input.issueTypeId,
            projectKey: input.projectId
          }
        };
        return this.createTask(taskInput);
      case 'update_issue':
        return this.updateTask(input.issueKey || input.issueId, input);
      case 'search_issues':
        return this.searchTasks(input);
      case 'create_project':
        return this.createProject(input);
      case 'add_comment':
        const commentInput = {
          taskId: input.issueKey || input.taskId,
          content: input.body || input.content,
          authorId: input.authorId
        };
        return this.addComment(commentInput);
      case 'transition_issue':
        return this.transitionIssue(input.issueKey || input.issueId, input.transitionId, input.comment);
      case 'create_sprint':
        return this.createSprint(input);
      case 'get_backlog':
        return this.getBacklog(input.projectId);
      default:
        throw new Error(`Unknown action: ${actionId}`);
    }
  }

  protected async cleanup(): Promise<void> {
    this.logger.log('Jira connector cleanup completed');
  }

  // Project Management
  async createProject(project: PMProject): Promise<ConnectorResponse<PMProject>> {
    try {
      const jiraProject: JiraProject = {
        key: project.customFields?.key || project.name.toUpperCase().replace(/[^A-Z0-9]/g, '').substring(0, 10),
        name: project.name,
        description: project.description,
        projectTypeKey: project.customFields?.projectType || 'software',
        lead: project.ownerId ? { accountId: project.ownerId } : undefined,
        projectCategory: project.customFields?.categoryId ? { id: project.customFields.categoryId } : undefined
      };

      const result = await this.performRequest({
        method: 'POST',
        endpoint: '/rest/api/3/project',
        body: jiraProject
      });

      const mappedProject: PMProject = {
        id: result.id,
        name: result.name,
        description: result.description,
        status: result.projectCategory?.name,
        ownerId: result.lead?.accountId,
        customFields: {
          key: result.key,
          projectType: result.projectTypeKey,
          url: result.self
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
      const updateData: Partial<JiraProject> = {};
      
      if (updates.name) updateData.name = updates.name;
      if (updates.description) updateData.description = updates.description;
      if (updates.ownerId) updateData.lead = { accountId: updates.ownerId };

      const result = await this.performRequest({
        method: 'PUT',
        endpoint: `/rest/api/3/project/${projectId}`,
        body: updateData
      });

      return {
        success: true,
        data: result,
        metadata: {
          timestamp: new Date(),
          rateLimit: await this.getRateLimitInfo()
        }
      };
    } catch (error) {
      return this.handleError(error as any, 'Failed to update project');
    }
  }

  async getProject(projectId: string): Promise<ConnectorResponse<PMProject>> {
    try {
      const result = await this.performRequest({
        method: 'GET',
        endpoint: `/rest/api/3/project/${projectId}`,
        queryParams: {
          expand: 'description,lead,projectCategory,issueTypes'
        }
      });

      const mappedProject: PMProject = {
        id: result.id,
        name: result.name,
        description: result.description,
        status: result.projectCategory?.name,
        ownerId: result.lead?.accountId,
        customFields: {
          key: result.key,
          projectType: result.projectTypeKey,
          url: result.self,
          issueTypes: result.issueTypes
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
      const queryParams: any = {
        maxResults: options?.pageSize || 50,
        startAt: options?.page ? ((options.page - 1) * (options?.pageSize || 50)) : 0,
        expand: 'description,lead,projectCategory'
      };

      const result = await this.performRequest({
        method: 'GET',
        endpoint: '/rest/api/3/project/search',
        queryParams
      });

      const mappedProjects: PMProject[] = result.values.map((project: any) => ({
        id: project.id,
        name: project.name,
        description: project.description,
        status: project.projectCategory?.name,
        ownerId: project.lead?.accountId,
        customFields: {
          key: project.key,
          projectType: project.projectTypeKey,
          url: project.self
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
            hasNext: result.startAt + result.maxResults < result.total
          }
        }
      };
    } catch (error) {
      return this.handleError(error as any, 'Failed to get projects');
    }
  }

  async deleteProject(projectId: string): Promise<ConnectorResponse<{ deleted: boolean }>> {
    try {
      await this.performRequest({
        method: 'DELETE',
        endpoint: `/rest/api/3/project/${projectId}`
      });

      return {
        success: true,
        data: { deleted: true },
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
      const jiraIssue: JiraIssue = {
        fields: {
          summary: task.title,
          description: task.description ? {
            type: 'doc',
            version: 1,
            content: [{
              type: 'paragraph',
              content: [{ type: 'text', text: task.description }]
            }]
          } : undefined,
          issuetype: { id: task.customFields?.issueTypeId || '10001', name: task.customFields?.issueType || 'Task' },
          priority: task.priority ? { id: this.mapPriorityToId(task.priority), name: task.priority } : undefined,
          assignee: task.assigneeId ? { accountId: task.assigneeId } : undefined,
          project: { key: task.projectId || task.customFields?.projectKey },
          parent: task.parentTaskId ? { key: task.parentTaskId } : undefined,
          duedate: task.dueDate ? task.dueDate.toISOString().split('T')[0] : undefined,
          timeoriginalestimate: task.estimatedHours ? task.estimatedHours * 3600 : undefined,
          labels: task.tags || []
        }
      };

      const result = await this.performRequest({
        method: 'POST',
        endpoint: '/rest/api/3/issue',
        body: jiraIssue
      });

      const mappedTask: PMTask = {
        id: result.id,
        title: result.key,
        description: task.description,
        status: 'To Do',
        priority: task.priority,
        assigneeId: task.assigneeId,
        projectId: task.projectId,
        customFields: {
          key: result.key,
          url: result.self
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
      const updateFields: any = {};
      
      if (updates.title) updateFields.summary = updates.title;
      if (updates.description) {
        updateFields.description = {
          type: 'doc',
          version: 1,
          content: [{
            type: 'paragraph',
            content: [{ type: 'text', text: updates.description }]
          }]
        };
      }
      if (updates.priority) updateFields.priority = { id: this.mapPriorityToId(updates.priority) };
      if (updates.assigneeId) updateFields.assignee = { accountId: updates.assigneeId };
      if (updates.dueDate) updateFields.duedate = updates.dueDate.toISOString().split('T')[0];
      if (updates.estimatedHours) updateFields.timeoriginalestimate = updates.estimatedHours * 3600;
      if (updates.tags) updateFields.labels = updates.tags;

      await this.performRequest({
        method: 'PUT',
        endpoint: `/rest/api/3/issue/${taskId}`,
        body: { fields: updateFields }
      });

      // Get updated issue
      return this.getTask(taskId);
    } catch (error) {
      return this.handleError(error as any, 'Failed to update task');
    }
  }

  async getTask(taskId: string): Promise<ConnectorResponse<PMTask>> {
    try {
      const result = await this.performRequest({
        method: 'GET',
        endpoint: `/rest/api/3/issue/${taskId}`,
        queryParams: {
          expand: 'names,renderedFields'
        }
      });

      const mappedTask: PMTask = {
        id: result.id,
        title: result.fields.summary,
        description: result.renderedFields?.description || result.fields.description,
        status: result.fields.status?.name,
        priority: result.fields.priority?.name,
        assigneeId: result.fields.assignee?.accountId,
        projectId: result.fields.project?.key,
        parentTaskId: result.fields.parent?.key,
        dueDate: result.fields.duedate ? new Date(result.fields.duedate) : undefined,
        estimatedHours: result.fields.timeoriginalestimate ? result.fields.timeoriginalestimate / 3600 : undefined,
        actualHours: result.fields.timespent ? result.fields.timespent / 3600 : undefined,
        tags: result.fields.labels || [],
        customFields: {
          key: result.key,
          url: result.self,
          issueType: result.fields.issuetype?.name,
          reporter: result.fields.reporter?.accountId,
          created: result.fields.created,
          updated: result.fields.updated
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
      let jql = '';
      const conditions: string[] = [];

      if (options?.projectId) conditions.push(`project = "${options.projectId}"`);
      if (options?.assigneeId) conditions.push(`assignee = "${options.assigneeId}"`);
      if (options?.status) conditions.push(`status = "${options.status}"`);
      if (options?.priority) conditions.push(`priority = "${options.priority}"`);
      if (options?.labels?.length) {
        conditions.push(`labels in (${options.labels.map(l => `"${l}"`).join(', ')})`);
      }
      if (options?.query) conditions.push(`text ~ "${options.query}"`);

      jql = conditions.join(' AND ');
      if (!jql) jql = 'order by created DESC';

      const queryParams: any = {
        jql,
        maxResults: options?.pageSize || 50,
        startAt: options?.page ? ((options.page - 1) * (options?.pageSize || 50)) : 0,
        expand: 'names,renderedFields'
      };

      const result = await this.performRequest({
        method: 'GET',
        endpoint: '/rest/api/3/search',
        queryParams
      });

      const mappedTasks: PMTask[] = result.issues.map((issue: any) => ({
        id: issue.id,
        title: issue.fields.summary,
        description: issue.renderedFields?.description || issue.fields.description,
        status: issue.fields.status?.name,
        priority: issue.fields.priority?.name,
        assigneeId: issue.fields.assignee?.accountId,
        projectId: issue.fields.project?.key,
        parentTaskId: issue.fields.parent?.key,
        dueDate: issue.fields.duedate ? new Date(issue.fields.duedate) : undefined,
        estimatedHours: issue.fields.timeoriginalestimate ? issue.fields.timeoriginalestimate / 3600 : undefined,
        actualHours: issue.fields.timespent ? issue.fields.timespent / 3600 : undefined,
        tags: issue.fields.labels || [],
        customFields: {
          key: issue.key,
          url: issue.self,
          issueType: issue.fields.issuetype?.name,
          reporter: issue.fields.reporter?.accountId,
          created: issue.fields.created,
          updated: issue.fields.updated
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
            hasNext: result.startAt + result.maxResults < result.total
          }
        }
      };
    } catch (error) {
      return this.handleError(error as any, 'Failed to get tasks');
    }
  }

  async deleteTask(taskId: string): Promise<ConnectorResponse<{ deleted: boolean }>> {
    try {
      await this.performRequest({
        method: 'DELETE',
        endpoint: `/rest/api/3/issue/${taskId}`
      });

      return {
        success: true,
        data: { deleted: true },
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
      await this.performRequest({
        method: 'PUT',
        endpoint: `/rest/api/3/issue/${taskId}/assignee`,
        body: { accountId: assigneeId }
      });

      return this.getTask(taskId);
    } catch (error) {
      return this.handleError(error as any, 'Failed to assign task');
    }
  }

  async transitionTask(taskId: string, transition: PMStatusTransition): Promise<ConnectorResponse<PMTask>> {
    try {
      // Get available transitions first
      const transitionsResponse = await this.getIssueTransitions(taskId);
      if (!transitionsResponse.success) {
        throw new Error('Failed to get available transitions');
      }

      const availableTransition = transitionsResponse.data?.find(t => 
        t.name.toLowerCase() === transition.to.toLowerCase()
      );

      if (!availableTransition) {
        throw new Error(`Transition to "${transition.to}" not available`);
      }

      const transitionData: any = {
        transition: { id: availableTransition.id }
      };

      if (transition.comment) {
        transitionData.update = {
          comment: [{
            add: {
              body: {
                type: 'doc',
                version: 1,
                content: [{
                  type: 'paragraph',
                  content: [{ type: 'text', text: transition.comment }]
                }]
              }
            }
          }]
        };
      }

      await this.performRequest({
        method: 'POST',
        endpoint: `/rest/api/3/issue/${taskId}/transitions`,
        body: transitionData
      });

      return this.getTask(taskId);
    } catch (error) {
      return this.handleError(error as any, 'Failed to transition task');
    }
  }

  // Comments and Collaboration
  async addComment(comment: PMComment): Promise<ConnectorResponse<PMComment>> {
    try {
      const jiraComment = {
        body: {
          type: 'doc',
          version: 1,
          content: [{
            type: 'paragraph',
            content: [{ type: 'text', text: comment.content }]
          }]
        }
      };

      const result = await this.performRequest({
        method: 'POST',
        endpoint: `/rest/api/3/issue/${comment.taskId}/comment`,
        body: jiraComment
      });

      const mappedComment: PMComment = {
        id: result.id,
        content: comment.content,
        authorId: result.author.accountId,
        taskId: comment.taskId,
        createdAt: new Date(result.created),
        updatedAt: new Date(result.updated)
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
      const updateData = {
        body: {
          type: 'doc',
          version: 1,
          content: [{
            type: 'paragraph',
            content: [{ type: 'text', text: content }]
          }]
        }
      };

      const result = await this.performRequest({
        method: 'PUT',
        endpoint: `/rest/api/3/comment/${commentId}`,
        body: updateData
      });

      const mappedComment: PMComment = {
        id: result.id,
        content: content,
        authorId: result.author.accountId,
        createdAt: new Date(result.created),
        updatedAt: new Date(result.updated)
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
      const queryParams: any = {
        maxResults: options?.pageSize || 50,
        startAt: options?.page ? ((options.page - 1) * (options?.pageSize || 50)) : 0,
        expand: 'renderedBody'
      };

      const result = await this.performRequest({
        method: 'GET',
        endpoint: `/rest/api/3/issue/${taskId}/comment`,
        queryParams
      });

      const mappedComments: PMComment[] = result.comments.map((comment: any) => ({
        id: comment.id,
        content: comment.renderedBody || comment.body,
        authorId: comment.author.accountId,
        taskId: taskId,
        createdAt: new Date(comment.created),
        updatedAt: new Date(comment.updated)
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
            hasNext: result.startAt + result.maxResults < result.total
          }
        }
      };
    } catch (error) {
      return this.handleError(error as any, 'Failed to get comments');
    }
  }

  async deleteComment(commentId: string): Promise<ConnectorResponse<{ deleted: boolean }>> {
    try {
      await this.performRequest({
        method: 'DELETE',
        endpoint: `/rest/api/3/comment/${commentId}`
      });

      return {
        success: true,
        data: { deleted: true },
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
      const queryParams: any = {
        maxResults: options?.pageSize || 50,
        startAt: options?.page ? ((options.page - 1) * (options?.pageSize || 50)) : 0
      };

      const result = await this.performRequest({
        method: 'GET',
        endpoint: '/rest/api/3/users/search',
        queryParams
      });

      const mappedUsers: PMUser[] = result.map((user: any) => ({
        id: user.accountId,
        name: user.displayName,
        email: user.emailAddress,
        avatar: user.avatarUrls?.['48x48'],
        isActive: user.active
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
      const result = await this.performRequest({
        method: 'GET',
        endpoint: `/rest/api/3/user`,
        queryParams: { accountId: userId }
      });

      const mappedUser: PMUser = {
        id: result.accountId,
        name: result.displayName,
        email: result.emailAddress,
        avatar: result.avatarUrls?.['48x48'],
        isActive: result.active
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
      const result = await this.performRequest({
        method: 'GET',
        endpoint: '/rest/api/3/myself'
      });

      const mappedUser: PMUser = {
        id: result.accountId,
        name: result.displayName,
        email: result.emailAddress,
        avatar: result.avatarUrls?.['48x48'],
        isActive: result.active
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
      // Jira doesn't have a direct label creation API - labels are created when used
      // This is a placeholder implementation
      return {
        success: true,
        data: {
          id: label.name,
          name: label.name,
          color: label.color,
          description: label.description
        },
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
      const result = await this.performRequest({
        method: 'GET',
        endpoint: '/rest/api/3/label'
      });

      const mappedLabels: PMLabel[] = result.values.map((label: any) => ({
        id: label.id,
        name: label.label,
        description: label.label
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
      // Get current task to preserve existing labels
      const taskResponse = await this.getTask(taskId);
      if (!taskResponse.success) {
        throw new Error('Failed to get current task');
      }

      const currentLabels = taskResponse.data?.tags || [];
      const newLabels = [...currentLabels, labelId];

      await this.performRequest({
        method: 'PUT',
        endpoint: `/rest/api/3/issue/${taskId}`,
        body: {
          fields: {
            labels: newLabels
          }
        }
      });

      return {
        success: true,
        data: true,
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
      // Get current task to get existing labels
      const taskResponse = await this.getTask(taskId);
      if (!taskResponse.success) {
        throw new Error('Failed to get current task');
      }

      const currentLabels = taskResponse.data?.tags || [];
      const newLabels = currentLabels.filter(label => label !== labelId);

      await this.performRequest({
        method: 'PUT',
        endpoint: `/rest/api/3/issue/${taskId}`,
        body: {
          fields: {
            labels: newLabels
          }
        }
      });

      return {
        success: true,
        data: true,
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
      // This would require multipart form data upload
      // For now, return a placeholder implementation
      return {
        success: true,
        data: {
          id: `${taskId}-${Date.now()}`,
          name: attachment.name,
          url: attachment.url,
          size: attachment.size,
          mimeType: attachment.mimeType,
          uploadedAt: new Date()
        },
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
      const task = await this.getTask(taskId);
      if (!task.success) {
        throw new Error('Failed to get task');
      }

      // Extract attachments from task data
      const attachments: PMAttachment[] = task.data?.attachments || [];

      return {
        success: true,
        data: attachments,
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
      await this.performRequest({
        method: 'DELETE',
        endpoint: `/rest/api/3/attachment/${attachmentId}`
      });

      return {
        success: true,
        data: { deleted: true },
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
      const queryParams: any = {
        query,
        maxResults: options?.pageSize || 50,
        startAt: options?.page ? ((options.page - 1) * (options?.pageSize || 50)) : 0,
        expand: 'description,lead,projectCategory'
      };

      const result = await this.performRequest({
        method: 'GET',
        endpoint: '/rest/api/3/project/search',
        queryParams
      });

      const mappedProjects: PMProject[] = result.values.map((project: any) => ({
        id: project.id,
        name: project.name,
        description: project.description,
        status: project.projectCategory?.name,
        ownerId: project.lead?.accountId,
        customFields: {
          key: project.key,
          projectType: project.projectTypeKey,
          url: project.self
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
            hasNext: result.startAt + result.maxResults < result.total
          }
        }
      };
    } catch (error) {
      return this.handleError(error as any, 'Failed to search projects');
    }
  }

  // Jira-specific methods
  async createEpic(epic: PMTask & { epicName: string }): Promise<ConnectorResponse<PMTask>> {
    try {
      const jiraEpic: JiraIssue = {
        fields: {
          summary: epic.title,
          description: epic.description ? {
            type: 'doc',
            version: 1,
            content: [{
              type: 'paragraph',
              content: [{ type: 'text', text: epic.description }]
            }]
          } : undefined,
          issuetype: { id: '10000', name: 'Epic' }, // Epic issue type ID
          project: { key: epic.projectId || epic.customFields?.projectKey },
          customfield_10000: epic.epicName, // Epic name field
          priority: epic.priority ? { id: this.mapPriorityToId(epic.priority), name: epic.priority } : undefined,
          assignee: epic.assigneeId ? { accountId: epic.assigneeId } : undefined,
          labels: epic.tags || []
        }
      };

      const result = await this.performRequest({
        method: 'POST',
        endpoint: '/rest/api/3/issue',
        body: jiraEpic
      });

      return {
        success: true,
        data: {
          id: result.id,
          title: epic.title,
          description: epic.description,
          status: 'To Do',
          priority: epic.priority,
          assigneeId: epic.assigneeId,
          projectId: epic.projectId,
          customFields: {
            key: result.key,
            url: result.self,
            epicName: epic.epicName,
            issueType: 'Epic'
          }
        },
        metadata: {
          timestamp: new Date(),
          rateLimit: await this.getRateLimitInfo()
        }
      };
    } catch (error) {
      return this.handleError(error as any, 'Failed to create epic');
    }
  }

  async addToEpic(taskId: string, epicId: string): Promise<ConnectorResponse<boolean>> {
    try {
      await this.performRequest({
        method: 'PUT',
        endpoint: `/rest/api/3/issue/${taskId}`,
        body: {
          fields: {
            parent: { key: epicId }
          }
        }
      });

      return {
        success: true,
        data: true,
        metadata: {
          timestamp: new Date(),
          rateLimit: await this.getRateLimitInfo()
        }
      };
    } catch (error) {
      return this.handleError(error as any, 'Failed to add task to epic');
    }
  }

  async createSprint(sprint: PMSprint): Promise<ConnectorResponse<PMSprint>> {
    try {
      // Get board ID for the project first
      const boardsResponse = await this.getBoards(sprint.projectId);
      if (!boardsResponse.success || !boardsResponse.data?.length) {
        throw new Error('No boards found for project');
      }

      const boardId = boardsResponse.data[0].id;

      const jiraSprint = {
        name: sprint.name,
        goal: sprint.goal,
        startDate: sprint.startDate.toISOString(),
        endDate: sprint.endDate.toISOString(),
        originBoardId: parseInt(boardId!)
      };

      const result = await this.performRequest({
        method: 'POST',
        endpoint: '/rest/agile/1.0/sprint',
        body: jiraSprint
      });

      const mappedSprint: PMSprint = {
        id: result.id.toString(),
        name: result.name,
        goal: result.goal,
        startDate: new Date(result.startDate),
        endDate: new Date(result.endDate),
        status: result.state,
        projectId: sprint.projectId
      };

      return {
        success: true,
        data: mappedSprint,
        metadata: {
          timestamp: new Date(),
          rateLimit: await this.getRateLimitInfo()
        }
      };
    } catch (error) {
      return this.handleError(error as any, 'Failed to create sprint');
    }
  }

  async addToSprint(taskId: string, sprintId: string): Promise<ConnectorResponse<boolean>> {
    try {
      await this.performRequest({
        method: 'POST',
        endpoint: `/rest/agile/1.0/sprint/${sprintId}/issue`,
        body: {
          issues: [taskId]
        }
      });

      return {
        success: true,
        data: true,
        metadata: {
          timestamp: new Date(),
          rateLimit: await this.getRateLimitInfo()
        }
      };
    } catch (error) {
      return this.handleError(error as any, 'Failed to add task to sprint');
    }
  }

  async getBacklog(projectId: string): Promise<ConnectorResponse<PMTask[]>> {
    try {
      // Get board for project first
      const boardsResponse = await this.getBoards(projectId);
      if (!boardsResponse.success || !boardsResponse.data?.length) {
        throw new Error('No boards found for project');
      }

      const boardId = boardsResponse.data[0].id;

      const result = await this.performRequest({
        method: 'GET',
        endpoint: `/rest/agile/1.0/board/${boardId}/backlog`,
        queryParams: {
          maxResults: 100
        }
      });

      const mappedTasks: PMTask[] = result.issues.map((issue: any) => ({
        id: issue.id,
        title: issue.fields.summary,
        description: issue.fields.description,
        status: issue.fields.status?.name,
        priority: issue.fields.priority?.name,
        assigneeId: issue.fields.assignee?.accountId,
        projectId: issue.fields.project?.key,
        customFields: {
          key: issue.key,
          url: issue.self,
          issueType: issue.fields.issuetype?.name
        }
      }));

      return {
        success: true,
        data: mappedTasks,
        metadata: {
          timestamp: new Date(),
          rateLimit: await this.getRateLimitInfo()
        }
      };
    } catch (error) {
      return this.handleError(error as any, 'Failed to get backlog');
    }
  }

  async getBoard(boardId: string): Promise<ConnectorResponse<PMBoard>> {
    try {
      const result = await this.performRequest({
        method: 'GET',
        endpoint: `/rest/agile/1.0/board/${boardId}`
      });

      const mappedBoard: PMBoard = {
        id: result.id.toString(),
        name: result.name,
        type: result.type,
        projectId: result.location?.projectKey
      };

      return {
        success: true,
        data: mappedBoard,
        metadata: {
          timestamp: new Date(),
          rateLimit: await this.getRateLimitInfo()
        }
      };
    } catch (error) {
      return this.handleError(error as any, 'Failed to get board');
    }
  }

  async getBoards(projectId?: string): Promise<ConnectorResponse<PMBoard[]>> {
    try {
      const queryParams: any = {
        maxResults: 50
      };

      if (projectId) {
        queryParams.projectKeyOrId = projectId;
      }

      const result = await this.performRequest({
        method: 'GET',
        endpoint: '/rest/agile/1.0/board',
        queryParams
      });

      const mappedBoards: PMBoard[] = result.values.map((board: any) => ({
        id: board.id.toString(),
        name: board.name,
        type: board.type,
        projectId: board.location?.projectKey,
        customFields: {
          url: board.self,
          location: board.location
        }
      }));

      return {
        success: true,
        data: mappedBoards,
        metadata: {
          timestamp: new Date(),
          rateLimit: await this.getRateLimitInfo()
        }
      };
    } catch (error) {
      return this.handleError(error as any, 'Failed to get boards');
    }
  }

  async transitionIssue(issueId: string, transitionId: string, comment?: string): Promise<ConnectorResponse<PMTask>> {
    try {
      const transitionData: any = {
        transition: { id: transitionId }
      };

      if (comment) {
        transitionData.update = {
          comment: [{
            add: {
              body: {
                type: 'doc',
                version: 1,
                content: [{
                  type: 'paragraph',
                  content: [{ type: 'text', text: comment }]
                }]
              }
            }
          }]
        };
      }

      await this.performRequest({
        method: 'POST',
        endpoint: `/rest/api/3/issue/${issueId}/transitions`,
        body: transitionData
      });

      return this.getTask(issueId);
    } catch (error) {
      return this.handleError(error as any, 'Failed to transition issue');
    }
  }

  async getIssueTransitions(issueId: string): Promise<ConnectorResponse<Array<{ id: string; name: string }>>> {
    try {
      const result = await this.performRequest({
        method: 'GET',
        endpoint: `/rest/api/3/issue/${issueId}/transitions`
      });

      const transitions = result.transitions.map((transition: any) => ({
        id: transition.id,
        name: transition.name
      }));

      return {
        success: true,
        data: transitions,
        metadata: {
          timestamp: new Date(),
          rateLimit: await this.getRateLimitInfo()
        }
      };
    } catch (error) {
      return this.handleError(error as any, 'Failed to get issue transitions');
    }
  }

  // Helper methods
  private mapPriorityToId(priority: string): string {
    const priorityMap: Record<string, string> = {
      'Highest': '1',
      'High': '2',
      'Medium': '3',
      'Low': '4',
      'Lowest': '5'
    };
    return priorityMap[priority] || '3';
  }

  private getAuthHeaders(): Record<string, string> {
    if (this.config.credentials.username && this.config.credentials.password) {
      const auth = Buffer.from(`${this.config.credentials.username}:${this.config.credentials.password}`).toString('base64');
      return { 'Authorization': `Basic ${auth}` };
    } else if (this.config.credentials.accessToken) {
      return { 'Authorization': `Bearer ${this.config.credentials.accessToken}` };
    }
    return {};
  }

  private getActions(): ConnectorAction[] {
    return [
      {
        id: 'create_issue',
        name: 'Create Issue',
        description: 'Create a new issue in Jira',
        inputSchema: {
          summary: { type: 'string', required: true, description: 'Issue summary' },
          description: { type: 'string', description: 'Issue description' },
          projectId: { type: 'string', required: true, description: 'Project key' },
          issueTypeId: { type: 'string', required: true, description: 'Issue type ID' },
          priority: { type: 'string', description: 'Issue priority' },
          assignee: { type: 'string', description: 'Assignee account ID' },
          labels: { type: 'string', description: 'Comma-separated labels' },
          dueDate: { type: 'string', description: 'Due date (YYYY-MM-DD)' },
          parentKey: { type: 'string', description: 'Parent issue key for subtasks' }
        },
        outputSchema: {
          id: { type: 'string', description: 'Created issue ID' },
          key: { type: 'string', description: 'Issue key' }
        }
      },
      {
        id: 'update_issue',
        name: 'Update Issue',
        description: 'Update an existing issue in Jira',
        inputSchema: {
          issueId: { type: 'string', required: true, description: 'Issue ID or key' },
          updates: { type: 'object', required: true, description: 'Fields to update' }
        },
        outputSchema: {
          success: { type: 'boolean', description: 'Whether update was successful' }
        }
      },
      {
        id: 'search_issues',
        name: 'Search Issues',
        description: 'Search for issues using JQL',
        inputSchema: {
          options: { type: 'object', description: 'Search options including JQL' }
        },
        outputSchema: {
          issues: { type: 'array', description: 'List of matching issues' }
        }
      },
      {
        id: 'create_project',
        name: 'Create Project',
        description: 'Create a new project in Jira',
        inputSchema: {
          name: { type: 'string', required: true, description: 'Project name' },
          key: { type: 'string', required: true, description: 'Project key' },
          projectType: { type: 'string', description: 'Project type' }
        },
        outputSchema: {
          id: { type: 'string', description: 'Created project ID' }
        }
      },
      {
        id: 'add_comment',
        name: 'Add Comment',
        description: 'Add a comment to an issue',
        inputSchema: {
          taskId: { type: 'string', required: true, description: 'Issue ID or key' },
          content: { type: 'string', required: true, description: 'Comment content' }
        },
        outputSchema: {
          id: { type: 'string', description: 'Comment ID' }
        }
      },
      {
        id: 'transition_issue',
        name: 'Transition Issue',
        description: 'Transition an issue to a new status',
        inputSchema: {
          issueId: { type: 'string', required: true, description: 'Issue ID or key' },
          transitionId: { type: 'string', required: true, description: 'Transition ID' },
          comment: { type: 'string', description: 'Optional comment' }
        },
        outputSchema: {
          success: { type: 'boolean', description: 'Whether transition was successful' }
        }
      },
      {
        id: 'create_sprint',
        name: 'Create Sprint',
        description: 'Create a new sprint',
        inputSchema: {
          name: { type: 'string', required: true, description: 'Sprint name' },
          projectId: { type: 'string', required: true, description: 'Project key' },
          startDate: { type: 'string', required: true, description: 'Sprint start date' },
          endDate: { type: 'string', required: true, description: 'Sprint end date' },
          goal: { type: 'string', description: 'Sprint goal' }
        },
        outputSchema: {
          id: { type: 'string', description: 'Sprint ID' }
        }
      },
      {
        id: 'get_backlog',
        name: 'Get Backlog',
        description: 'Get backlog items for a project',
        inputSchema: {
          projectId: { type: 'string', required: true, description: 'Project key' }
        },
        outputSchema: {
          issues: { type: 'array', description: 'Backlog issues' }
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
        eventType: 'jira:issue_created',
        outputSchema: {
          issue: { type: 'object', description: 'Created issue information' }
        },
        webhookRequired: true
      },
      {
        id: 'issue_updated',
        name: 'Issue Updated',
        description: 'Triggered when an issue is updated',
        eventType: 'jira:issue_updated',
        outputSchema: {
          issue: { type: 'object', description: 'Updated issue information' }
        },
        webhookRequired: true
      },
      {
        id: 'issue_transitioned',
        name: 'Issue Transitioned',
        description: 'Triggered when an issue status changes',
        eventType: 'jira:issue_transitioned',
        outputSchema: {
          issue: { type: 'object', description: 'Transitioned issue information' }
        },
        webhookRequired: true
      },
      {
        id: 'comment_created',
        name: 'Comment Created',
        description: 'Triggered when a comment is added to an issue',
        eventType: 'jira:comment_created',
        outputSchema: {
          comment: { type: 'object', description: 'Created comment information' }
        },
        webhookRequired: true
      },
      {
        id: 'sprint_started',
        name: 'Sprint Started',
        description: 'Triggered when a sprint is started',
        eventType: 'jira:sprint_started',
        outputSchema: {
          sprint: { type: 'object', description: 'Started sprint information' }
        },
        webhookRequired: true
      }
    ];
  }
}