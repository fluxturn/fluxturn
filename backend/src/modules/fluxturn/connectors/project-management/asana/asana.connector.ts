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
  IAsanaConnector,
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

interface AsanaTask {
  name: string;
  notes?: string;
  projects?: string[];
  assignee?: string;
  due_date?: string;
  due_time?: string;
  start_date?: string;
  completed?: boolean;
  tags?: string[];
  parent?: string;
  custom_fields?: Record<string, any>;
}

interface AsanaProject {
  name: string;
  notes?: string;
  team?: string;
  workspace?: string;
  privacy_setting?: 'public' | 'private';
  color?: string;
  layout?: 'list' | 'timeline' | 'calendar' | 'board';
  owner?: string;
  custom_fields?: string[];
}

interface AsanaComment {
  text: string;
  target: string;
  type: 'comment';
}

@Injectable()
export class AsanaConnector extends BaseConnector implements IAsanaConnector {
  private readonly baseUrl = 'https://app.asana.com/api/1.0';

  constructor(
    private readonly authUtils: AuthUtils,
    private readonly apiUtils: ApiUtils
  ) {
    super();
  }

  getMetadata(): ConnectorMetadata {
    return {
      name: 'Asana',
      description: 'Asana project management and team collaboration platform with flexible project views',
      version: '1.0.0',
      category: ConnectorCategory.PROJECT_MANAGEMENT,
      type: ConnectorType.ASANA,
      logoUrl: 'https://assets.asana.biz/transform/ba9b63a3-f255-4088-b5fe-14ab4628f50b/logo-app-icon',
      documentationUrl: 'https://developers.asana.com/docs',
      authType: AuthType.BEARER_TOKEN,
      requiredScopes: [],
      actions: this.getActions(),
      triggers: this.getTriggers(),
      rateLimit: {
        requestsPerMinute: 1500,
        requestsPerHour: 100000
      },
      webhookSupport: true
    };
  }

  protected async initializeConnection(): Promise<void> {
    try {
      // Test connection by getting current user
      const response = await this.performRequest({
        method: 'GET',
        endpoint: '/users/me',
        headers: this.getAuthHeaders()
      });

      if (!response) {
        throw new Error('Failed to connect to Asana API');
      }

      this.logger.log('Asana connector initialized successfully');
    } catch (error) {
      this.logger.error('Failed to initialize Asana connection:', error);
      throw new Error(`Asana connection failed: ${error.message}`);
    }
  }

  protected async performConnectionTest(): Promise<boolean> {
    try {
      const response = await this.performRequest({
        method: 'GET',
        endpoint: '/users/me',
        headers: this.getAuthHeaders()
      });
      return !!response;
    } catch (error) {
      this.logger.error('Asana connection test failed:', error);
      return false;
    }
  }

  protected async performHealthCheck(): Promise<void> {
    try {
      await this.performRequest({
        method: 'GET',
        endpoint: '/users/me',
        headers: this.getAuthHeaders()
      });
    } catch (error) {
      throw new Error(`Asana health check failed: ${error.message}`);
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
          ...request.headers
        }
      });

      if (!response.success) {
        // Extract the actual Asana error message from the response
        const asanaErrors = response.error?.details?.errors;
        const errorMessage = asanaErrors?.[0]?.message || response.error?.message || 'Request failed';
        const error = new Error(errorMessage);
        (error as any).code = response.error?.code || 'ASANA_ERROR';
        (error as any).statusCode = response.error?.statusCode;
        (error as any).details = response.error?.details;
        throw error;
      }

      return response.data?.data || response.data;
    } catch (error) {
      this.logger.error('Asana request failed:', error);
      throw error;
    }
  }

  protected async performAction(actionId: string, input: any): Promise<any> {
    switch (actionId) {
      case 'create_task':
        return this.createTask(input);
      case 'update_task':
        return this.updateTask(input.taskId, input.updates);
      case 'create_project':
        return this.createProject(input);
      case 'add_comment':
        return this.addComment(input);
      case 'create_section':
        return this.createSection(input);
      case 'assign_task':
        return this.assignTask(input.taskId, input.assigneeId);
      case 'add_tag':
        return this.addLabelToTask(input.taskId, input.tagId);
      case 'delete_task':
        return this.deleteTask(input.taskId);
      case 'get_task':
        return this.getTask(input.taskId);
      case 'get_tasks':
        return this.getTasks(input);
      case 'create_subtask':
        return this.createSubtask(input);
      case 'get_subtasks':
        return this.getSubtasks(input.taskId);
      case 'search_tasks':
        return this.searchTasksAdvanced(input);
      default:
        throw new Error(`Unknown action: ${actionId}`);
    }
  }

  protected async cleanup(): Promise<void> {
    this.logger.log('Asana connector cleanup completed');
  }

  // Project Management Interface Implementation
  async createProject(project: PMProject): Promise<ConnectorResponse<PMProject>> {
    try {
      // Get team or workspace from input (one is required by Asana API)
      const teamId = project.customFields?.teamId || (project as any).teamId;
      const workspaceId = project.customFields?.workspaceId || (project as any).workspaceId;

      if (!teamId && !workspaceId) {
        return {
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Either workspaceId or teamId is required to create an Asana project',
            details: { field: 'workspaceId or teamId' }
          }
        };
      }

      const asanaProject: AsanaProject = {
        name: project.name,
        notes: project.description,
        privacy_setting: 'public',
        layout: 'list',
        owner: project.ownerId,
        ...(teamId && { team: teamId }),
        ...(workspaceId && !teamId && { workspace: workspaceId })
      };

      const result = await this.performRequest({
        method: 'POST',
        endpoint: '/projects',
        body: { data: asanaProject }
      });

      const mappedProject: PMProject = {
        id: result.gid,
        name: result.name,
        description: result.notes,
        status: result.archived ? 'Archived' : 'Active',
        ownerId: result.owner?.gid,
        customFields: {
          permalink_url: result.permalink_url,
          color: result.color,
          layout: result.layout,
          team: result.team?.gid,
          created_at: result.created_at,
          modified_at: result.modified_at
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
      const updateData: Partial<AsanaProject> = {};
      
      if (updates.name) updateData.name = updates.name;
      if (updates.description) updateData.notes = updates.description;
      if (updates.ownerId) updateData.owner = updates.ownerId;

      const result = await this.performRequest({
        method: 'PUT',
        endpoint: `/projects/${projectId}`,
        body: { data: updateData }
      });

      const mappedProject: PMProject = {
        id: result.gid,
        name: result.name,
        description: result.notes,
        status: result.archived ? 'Archived' : 'Active',
        ownerId: result.owner?.gid,
        customFields: {
          permalink_url: result.permalink_url,
          color: result.color,
          layout: result.layout,
          team: result.team?.gid,
          modified_at: result.modified_at
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
      return this.handleError(error as any, 'Failed to update project');
    }
  }

  async getProject(projectId: string): Promise<ConnectorResponse<PMProject>> {
    try {
      const result = await this.performRequest({
        method: 'GET',
        endpoint: `/projects/${projectId}`,
        queryParams: {
          opt_fields: 'name,notes,owner,team,color,layout,permalink_url,archived,created_at,modified_at'
        }
      });

      const mappedProject: PMProject = {
        id: result.gid,
        name: result.name,
        description: result.notes,
        status: result.archived ? 'Archived' : 'Active',
        ownerId: result.owner?.gid,
        customFields: {
          permalink_url: result.permalink_url,
          color: result.color,
          layout: result.layout,
          team: result.team?.gid,
          created_at: result.created_at,
          modified_at: result.modified_at
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
        limit: options?.pageSize || 100,
        opt_fields: 'name,notes,owner,team,color,layout,permalink_url,archived,created_at,modified_at'
      };

      if (options?.page && options.page > 1) {
        // Asana uses offset-based pagination
        queryParams.offset = (options.page - 1) * (options?.pageSize || 100);
      }

      const result = await this.performRequest({
        method: 'GET',
        endpoint: '/projects',
        queryParams
      });

      const mappedProjects: PMProject[] = result.map((project: any) => ({
        id: project.gid,
        name: project.name,
        description: project.notes,
        status: project.archived ? 'Archived' : 'Active',
        ownerId: project.owner?.gid,
        customFields: {
          permalink_url: project.permalink_url,
          color: project.color,
          layout: project.layout,
          team: project.team?.gid,
          created_at: project.created_at,
          modified_at: project.modified_at
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
            pageSize: options?.pageSize || 100,
            total: 0,
            hasNext: mappedProjects.length === (options?.pageSize || 100)
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
        endpoint: `/projects/${projectId}`
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
      const asanaTask: AsanaTask = {
        name: task.title,
        notes: task.description,
        projects: task.projectId ? [task.projectId] : undefined,
        assignee: task.assigneeId,
        due_date: task.dueDate ? task.dueDate.toISOString().split('T')[0] : undefined,
        start_date: task.startDate ? task.startDate.toISOString().split('T')[0] : undefined,
        parent: task.parentTaskId,
        tags: task.tags
      };

      const result = await this.performRequest({
        method: 'POST',
        endpoint: '/tasks',
        body: { data: asanaTask }
      });

      const mappedTask: PMTask = {
        id: result.gid,
        title: result.name,
        description: result.notes,
        status: result.completed ? 'Completed' : 'In Progress',
        assigneeId: result.assignee?.gid,
        projectId: result.projects?.[0]?.gid,
        parentTaskId: result.parent?.gid,
        dueDate: result.due_on ? new Date(result.due_on) : undefined,
        startDate: result.start_on ? new Date(result.start_on) : undefined,
        tags: result.tags?.map((tag: any) => tag.name) || [],
        customFields: {
          permalink_url: result.permalink_url,
          completed: result.completed,
          completed_at: result.completed_at,
          created_at: result.created_at,
          modified_at: result.modified_at
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
      const updateData: Partial<AsanaTask> = {};
      
      if (updates.title) updateData.name = updates.title;
      if (updates.description) updateData.notes = updates.description;
      if (updates.assigneeId) updateData.assignee = updates.assigneeId;
      if (updates.dueDate) updateData.due_date = updates.dueDate.toISOString().split('T')[0];
      if (updates.startDate) updateData.start_date = updates.startDate.toISOString().split('T')[0];
      if (updates.status) updateData.completed = updates.status === 'Completed';

      const result = await this.performRequest({
        method: 'PUT',
        endpoint: `/tasks/${taskId}`,
        body: { data: updateData }
      });

      return this.getTask(taskId);
    } catch (error) {
      return this.handleError(error as any, 'Failed to update task');
    }
  }

  async getTask(taskId: string): Promise<ConnectorResponse<PMTask>> {
    try {
      const result = await this.performRequest({
        method: 'GET',
        endpoint: `/tasks/${taskId}`,
        queryParams: {
          opt_fields: 'name,notes,assignee,projects,parent,completed,due_on,start_on,tags,permalink_url,completed_at,created_at,modified_at'
        }
      });

      const mappedTask: PMTask = {
        id: result.gid,
        title: result.name,
        description: result.notes,
        status: result.completed ? 'Completed' : 'In Progress',
        assigneeId: result.assignee?.gid,
        projectId: result.projects?.[0]?.gid,
        parentTaskId: result.parent?.gid,
        dueDate: result.due_on ? new Date(result.due_on) : undefined,
        startDate: result.start_on ? new Date(result.start_on) : undefined,
        tags: result.tags?.map((tag: any) => tag.name) || [],
        customFields: {
          permalink_url: result.permalink_url,
          completed: result.completed,
          completed_at: result.completed_at,
          created_at: result.created_at,
          modified_at: result.modified_at
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
      const queryParams: any = {
        limit: options?.pageSize || 100,
        opt_fields: 'name,notes,assignee,projects,parent,completed,due_on,start_on,tags,permalink_url,completed_at,created_at,modified_at'
      };

      if (options?.projectId) {
        // Get tasks for specific project
        queryParams.project = options.projectId;
      }

      if (options?.assigneeId) {
        queryParams.assignee = options.assigneeId;
      }

      if (options?.page && options.page > 1) {
        queryParams.offset = (options.page - 1) * (options?.pageSize || 100);
      }

      const endpoint = options?.projectId ? `/projects/${options.projectId}/tasks` : '/tasks';
      const result = await this.performRequest({
        method: 'GET',
        endpoint,
        queryParams
      });

      let tasks = result;
      
      // Filter by completion status if specified
      if (options?.status) {
        const isCompleted = options.status === 'Completed';
        tasks = tasks.filter((task: any) => task.completed === isCompleted);
      }

      // Filter by search query
      if (options?.query) {
        tasks = tasks.filter((task: any) => 
          task.name.toLowerCase().includes(options.query!.toLowerCase()) ||
          (task.notes && task.notes.toLowerCase().includes(options.query!.toLowerCase()))
        );
      }

      const mappedTasks: PMTask[] = tasks.map((task: any) => ({
        id: task.gid,
        title: task.name,
        description: task.notes,
        status: task.completed ? 'Completed' : 'In Progress',
        assigneeId: task.assignee?.gid,
        projectId: task.projects?.[0]?.gid,
        parentTaskId: task.parent?.gid,
        dueDate: task.due_on ? new Date(task.due_on) : undefined,
        startDate: task.start_on ? new Date(task.start_on) : undefined,
        tags: task.tags?.map((tag: any) => tag.name) || [],
        customFields: {
          permalink_url: task.permalink_url,
          completed: task.completed,
          completed_at: task.completed_at,
          created_at: task.created_at,
          modified_at: task.modified_at
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
            pageSize: options?.pageSize || 100,
            total: 0,
            hasNext: mappedTasks.length === (options?.pageSize || 100)
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
        endpoint: `/tasks/${taskId}`
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
        endpoint: `/tasks/${taskId}`,
        body: {
          data: {
            assignee: assigneeId
          }
        }
      });

      return this.getTask(taskId);
    } catch (error) {
      return this.handleError(error as any, 'Failed to assign task');
    }
  }

  async transitionTask(taskId: string, transition: PMStatusTransition): Promise<ConnectorResponse<PMTask>> {
    try {
      const completed = transition.to === 'Completed';
      
      await this.performRequest({
        method: 'PUT',
        endpoint: `/tasks/${taskId}`,
        body: {
          data: {
            completed: completed
          }
        }
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
      const asanaComment: AsanaComment = {
        text: comment.content,
        target: comment.taskId!,
        type: 'comment'
      };

      const result = await this.performRequest({
        method: 'POST',
        endpoint: '/stories',
        body: { data: asanaComment }
      });

      const mappedComment: PMComment = {
        id: result.gid,
        content: comment.content,
        authorId: result.created_by?.gid,
        taskId: comment.taskId,
        createdAt: new Date(result.created_at)
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
      const result = await this.performRequest({
        method: 'PUT',
        endpoint: `/stories/${commentId}`,
        body: {
          data: {
            text: content
          }
        }
      });

      const mappedComment: PMComment = {
        id: result.gid,
        content: content,
        authorId: result.created_by?.gid,
        updatedAt: new Date()
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
        limit: options?.pageSize || 100,
        opt_fields: 'text,created_by,created_at,type'
      };

      if (options?.page && options.page > 1) {
        queryParams.offset = (options.page - 1) * (options?.pageSize || 100);
      }

      const result = await this.performRequest({
        method: 'GET',
        endpoint: `/tasks/${taskId}/stories`,
        queryParams
      });

      // Filter only comment stories
      const comments = result.filter((story: any) => story.type === 'comment');

      const mappedComments: PMComment[] = comments.map((story: any) => ({
        id: story.gid,
        content: story.text,
        authorId: story.created_by?.gid,
        taskId: taskId,
        createdAt: new Date(story.created_at)
      }));

      return {
        success: true,
        data: mappedComments,
        metadata: {
          timestamp: new Date(),
          rateLimit: await this.getRateLimitInfo(),
          pagination: {
            page: options?.page || 1,
            pageSize: options?.pageSize || 100,
            total: 0,
            hasNext: mappedComments.length === (options?.pageSize || 100)
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
        endpoint: `/stories/${commentId}`
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
        limit: options?.pageSize || 100,
        opt_fields: 'name,email,photo'
      };

      if (options?.page && options.page > 1) {
        queryParams.offset = (options.page - 1) * (options?.pageSize || 100);
      }

      const result = await this.performRequest({
        method: 'GET',
        endpoint: '/users',
        queryParams
      });

      const mappedUsers: PMUser[] = result.map((user: any) => ({
        id: user.gid,
        name: user.name,
        email: user.email,
        avatar: user.photo?.image_128x128
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
        endpoint: `/users/${userId}`,
        queryParams: {
          opt_fields: 'name,email,photo'
        }
      });

      const mappedUser: PMUser = {
        id: result.gid,
        name: result.name,
        email: result.email,
        avatar: result.photo?.image_128x128
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
        endpoint: '/users/me',
        queryParams: {
          opt_fields: 'name,email,photo'
        }
      });

      const mappedUser: PMUser = {
        id: result.gid,
        name: result.name,
        email: result.email,
        avatar: result.photo?.image_128x128
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
      const result = await this.performRequest({
        method: 'POST',
        endpoint: '/tags',
        body: {
          data: {
            name: label.name,
            color: label.color || 'light-green',
            notes: label.description
          }
        }
      });

      const mappedLabel: PMLabel = {
        id: result.gid,
        name: result.name,
        color: result.color,
        description: result.notes
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
      const result = await this.performRequest({
        method: 'GET',
        endpoint: '/tags',
        queryParams: {
          opt_fields: 'name,color,notes'
        }
      });

      const mappedLabels: PMLabel[] = result.map((tag: any) => ({
        id: tag.gid,
        name: tag.name,
        color: tag.color,
        description: tag.notes
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
      await this.performRequest({
        method: 'POST',
        endpoint: `/tasks/${taskId}/addTag`,
        body: {
          data: {
            tag: labelId
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
      await this.performRequest({
        method: 'POST',
        endpoint: `/tasks/${taskId}/removeTag`,
        body: {
          data: {
            tag: labelId
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
      const result = await this.performRequest({
        method: 'GET',
        endpoint: `/attachments`,
        queryParams: {
          parent: taskId,
          opt_fields: 'name,download_url,size,host,created_at'
        }
      });

      const mappedAttachments: PMAttachment[] = result.map((attachment: any) => ({
        id: attachment.gid,
        name: attachment.name,
        url: attachment.download_url,
        size: attachment.size,
        uploadedAt: new Date(attachment.created_at)
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
      await this.performRequest({
        method: 'DELETE',
        endpoint: `/attachments/${attachmentId}`
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
      const result = await this.performRequest({
        method: 'GET',
        endpoint: '/projects',
        queryParams: {
          limit: options?.pageSize || 100,
          opt_fields: 'name,notes,owner,team,color,layout,permalink_url,archived,created_at,modified_at'
        }
      });

      // Filter by query
      const filteredProjects = result.filter((project: any) =>
        project.name.toLowerCase().includes(query.toLowerCase()) ||
        (project.notes && project.notes.toLowerCase().includes(query.toLowerCase()))
      );

      const mappedProjects: PMProject[] = filteredProjects.map((project: any) => ({
        id: project.gid,
        name: project.name,
        description: project.notes,
        status: project.archived ? 'Archived' : 'Active',
        ownerId: project.owner?.gid,
        customFields: {
          permalink_url: project.permalink_url,
          color: project.color,
          layout: project.layout,
          team: project.team?.gid,
          created_at: project.created_at,
          modified_at: project.modified_at
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

  async createSubtask(input: { parentTaskId: string; title: string; description?: string; assigneeId?: string; dueDate?: string }): Promise<ConnectorResponse<PMTask>> {
    try {
      const asanaTask: AsanaTask = {
        name: input.title,
        notes: input.description,
        parent: input.parentTaskId,
        assignee: input.assigneeId,
        due_date: input.dueDate
      };

      const result = await this.performRequest({
        method: 'POST',
        endpoint: '/tasks',
        body: { data: asanaTask }
      });

      const mappedTask: PMTask = {
        id: result.gid,
        title: result.name,
        description: result.notes,
        status: result.completed ? 'Completed' : 'In Progress',
        assigneeId: result.assignee?.gid,
        parentTaskId: result.parent?.gid,
        dueDate: result.due_on ? new Date(result.due_on) : undefined,
        customFields: {
          permalink_url: result.permalink_url,
          completed: result.completed,
          created_at: result.created_at
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
      return this.handleError(error as any, 'Failed to create subtask');
    }
  }

  async getSubtasks(taskId: string): Promise<ConnectorResponse<PMTask[]>> {
    try {
      const result = await this.performRequest({
        method: 'GET',
        endpoint: `/tasks/${taskId}/subtasks`,
        queryParams: {
          opt_fields: 'name,notes,assignee,completed,due_on,start_on,permalink_url,created_at,modified_at'
        }
      });

      const mappedSubtasks: PMTask[] = result.map((task: any) => ({
        id: task.gid,
        title: task.name,
        description: task.notes,
        status: task.completed ? 'Completed' : 'In Progress',
        assigneeId: task.assignee?.gid,
        parentTaskId: taskId,
        dueDate: task.due_on ? new Date(task.due_on) : undefined,
        startDate: task.start_on ? new Date(task.start_on) : undefined,
        customFields: {
          permalink_url: task.permalink_url,
          completed: task.completed,
          created_at: task.created_at,
          modified_at: task.modified_at
        }
      }));

      return {
        success: true,
        data: mappedSubtasks,
        metadata: {
          timestamp: new Date(),
          rateLimit: await this.getRateLimitInfo()
        }
      };
    } catch (error) {
      return this.handleError(error as any, 'Failed to get subtasks');
    }
  }

  async searchTasksAdvanced(input: { workspaceId: string; query?: string; projectId?: string; assigneeId?: string; completed?: boolean }): Promise<ConnectorResponse<PMTask[]>> {
    try {
      const queryParams: any = {
        opt_fields: 'name,notes,assignee,projects,parent,completed,due_on,start_on,tags,permalink_url,created_at,modified_at'
      };

      // Use Asana's search API for workspaces
      let endpoint = `/workspaces/${input.workspaceId}/tasks/search`;

      if (input.query) {
        queryParams['text'] = input.query;
      }

      if (input.projectId) {
        queryParams['projects.any'] = input.projectId;
      }

      if (input.assigneeId) {
        queryParams['assignee.any'] = input.assigneeId;
      }

      if (input.completed !== undefined) {
        queryParams['completed'] = input.completed;
      }

      const result = await this.performRequest({
        method: 'GET',
        endpoint,
        queryParams
      });

      const mappedTasks: PMTask[] = result.map((task: any) => ({
        id: task.gid,
        title: task.name,
        description: task.notes,
        status: task.completed ? 'Completed' : 'In Progress',
        assigneeId: task.assignee?.gid,
        projectId: task.projects?.[0]?.gid,
        parentTaskId: task.parent?.gid,
        dueDate: task.due_on ? new Date(task.due_on) : undefined,
        startDate: task.start_on ? new Date(task.start_on) : undefined,
        tags: task.tags?.map((tag: any) => tag.name) || [],
        customFields: {
          permalink_url: task.permalink_url,
          completed: task.completed,
          created_at: task.created_at,
          modified_at: task.modified_at
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
      return this.handleError(error as any, 'Failed to search tasks');
    }
  }

  // Asana-specific methods
  async createSection(section: { name: string; projectId: string }): Promise<ConnectorResponse<any>> {
    try {
      const result = await this.performRequest({
        method: 'POST',
        endpoint: '/sections',
        body: {
          data: {
            name: section.name,
            project: section.projectId
          }
        }
      });

      return {
        success: true,
        data: {
          id: result.gid,
          name: result.name,
          projectId: section.projectId,
          created_at: result.created_at
        },
        metadata: {
          timestamp: new Date(),
          rateLimit: await this.getRateLimitInfo()
        }
      };
    } catch (error) {
      return this.handleError(error as any, 'Failed to create section');
    }
  }

  async getSections(projectId: string): Promise<ConnectorResponse<any[]>> {
    try {
      const result = await this.performRequest({
        method: 'GET',
        endpoint: `/projects/${projectId}/sections`,
        queryParams: {
          opt_fields: 'name,created_at'
        }
      });

      const mappedSections = result.map((section: any) => ({
        id: section.gid,
        name: section.name,
        projectId: projectId,
        created_at: section.created_at
      }));

      return {
        success: true,
        data: mappedSections,
        metadata: {
          timestamp: new Date(),
          rateLimit: await this.getRateLimitInfo()
        }
      };
    } catch (error) {
      return this.handleError(error as any, 'Failed to get sections');
    }
  }

  async addTaskToSection(taskId: string, sectionId: string): Promise<ConnectorResponse<boolean>> {
    try {
      await this.performRequest({
        method: 'POST',
        endpoint: `/sections/${sectionId}/addTask`,
        body: {
          data: {
            task: taskId
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
      return this.handleError(error as any, 'Failed to add task to section');
    }
  }

  async createPortfolio(portfolio: { name: string; members?: string[] }): Promise<ConnectorResponse<any>> {
    try {
      const result = await this.performRequest({
        method: 'POST',
        endpoint: '/portfolios',
        body: {
          data: {
            name: portfolio.name,
            members: portfolio.members
          }
        }
      });

      return {
        success: true,
        data: {
          id: result.gid,
          name: result.name,
          created_at: result.created_at
        },
        metadata: {
          timestamp: new Date(),
          rateLimit: await this.getRateLimitInfo()
        }
      };
    } catch (error) {
      return this.handleError(error as any, 'Failed to create portfolio');
    }
  }

  async getPortfolios(): Promise<ConnectorResponse<any[]>> {
    try {
      const result = await this.performRequest({
        method: 'GET',
        endpoint: '/portfolios',
        queryParams: {
          opt_fields: 'name,created_at'
        }
      });

      const mappedPortfolios = result.map((portfolio: any) => ({
        id: portfolio.gid,
        name: portfolio.name,
        created_at: portfolio.created_at
      }));

      return {
        success: true,
        data: mappedPortfolios,
        metadata: {
          timestamp: new Date(),
          rateLimit: await this.getRateLimitInfo()
        }
      };
    } catch (error) {
      return this.handleError(error as any, 'Failed to get portfolios');
    }
  }

  async addProjectToPortfolio(portfolioId: string, projectId: string): Promise<ConnectorResponse<boolean>> {
    try {
      await this.performRequest({
        method: 'POST',
        endpoint: `/portfolios/${portfolioId}/addItem`,
        body: {
          data: {
            item: projectId
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
      return this.handleError(error as any, 'Failed to add project to portfolio');
    }
  }

  async getCustomFields(projectId: string): Promise<ConnectorResponse<any[]>> {
    try {
      const result = await this.performRequest({
        method: 'GET',
        endpoint: `/projects/${projectId}/custom_field_settings`,
        queryParams: {
          opt_fields: 'custom_field.name,custom_field.type,custom_field.enum_options'
        }
      });

      const mappedFields = result.map((fieldSetting: any) => ({
        id: fieldSetting.custom_field.gid,
        name: fieldSetting.custom_field.name,
        type: fieldSetting.custom_field.type,
        options: fieldSetting.custom_field.enum_options
      }));

      return {
        success: true,
        data: mappedFields,
        metadata: {
          timestamp: new Date(),
          rateLimit: await this.getRateLimitInfo()
        }
      };
    } catch (error) {
      return this.handleError(error as any, 'Failed to get custom fields');
    }
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
        id: 'create_task',
        name: 'Create Task',
        description: 'Create a new task in Asana',
        inputSchema: {
          title: { type: 'string', required: true, description: 'Task name' },
          description: { type: 'string', description: 'Task notes' },
          projectId: { type: 'string', description: 'Project ID' },
          assigneeId: { type: 'string', description: 'Assignee user ID' },
          dueDate: { type: 'string', description: 'Due date (YYYY-MM-DD)' }
        },
        outputSchema: {
          id: { type: 'string', description: 'Created task ID' },
          permalink_url: { type: 'string', description: 'Task URL' }
        }
      },
      {
        id: 'update_task',
        name: 'Update Task',
        description: 'Update an existing task in Asana',
        inputSchema: {
          taskId: { type: 'string', required: true, description: 'Task ID' },
          updates: { type: 'object', required: true, description: 'Fields to update' }
        },
        outputSchema: {
          success: { type: 'boolean', description: 'Whether update was successful' }
        }
      },
      {
        id: 'create_project',
        name: 'Create Project',
        description: 'Create a new project in Asana',
        inputSchema: {
          name: { type: 'string', required: true, description: 'Project name' },
          description: { type: 'string', description: 'Project notes' },
          teamId: { type: 'string', description: 'Team ID' }
        },
        outputSchema: {
          id: { type: 'string', description: 'Created project ID' }
        }
      },
      {
        id: 'add_comment',
        name: 'Add Comment',
        description: 'Add a comment to a task',
        inputSchema: {
          taskId: { type: 'string', required: true, description: 'Task ID' },
          content: { type: 'string', required: true, description: 'Comment text' }
        },
        outputSchema: {
          id: { type: 'string', description: 'Comment ID' }
        }
      },
      {
        id: 'create_section',
        name: 'Create Section',
        description: 'Create a section in a project',
        inputSchema: {
          name: { type: 'string', required: true, description: 'Section name' },
          projectId: { type: 'string', required: true, description: 'Project ID' }
        },
        outputSchema: {
          id: { type: 'string', description: 'Section ID' }
        }
      },
      {
        id: 'assign_task',
        name: 'Assign Task',
        description: 'Assign a task to a user',
        inputSchema: {
          taskId: { type: 'string', required: true, description: 'Task ID' },
          assigneeId: { type: 'string', required: true, description: 'User ID' }
        },
        outputSchema: {
          success: { type: 'boolean', description: 'Whether assignment was successful' }
        }
      },
      {
        id: 'add_tag',
        name: 'Add Tag',
        description: 'Add a tag to a task',
        inputSchema: {
          taskId: { type: 'string', required: true, description: 'Task ID' },
          tagId: { type: 'string', required: true, description: 'Tag ID' }
        },
        outputSchema: {
          success: { type: 'boolean', description: 'Whether tag was added successfully' }
        }
      },
      {
        id: 'delete_task',
        name: 'Delete Task',
        description: 'Delete a task from Asana',
        inputSchema: {
          taskId: { type: 'string', required: true, description: 'Task ID to delete' }
        },
        outputSchema: {
          deleted: { type: 'boolean', description: 'Whether task was deleted successfully' }
        }
      },
      {
        id: 'get_task',
        name: 'Get Task',
        description: 'Get details of a specific task',
        inputSchema: {
          taskId: { type: 'string', required: true, description: 'Task ID' }
        },
        outputSchema: {
          id: { type: 'string', description: 'Task ID' },
          title: { type: 'string', description: 'Task name' },
          description: { type: 'string', description: 'Task notes' },
          status: { type: 'string', description: 'Task status' }
        }
      },
      {
        id: 'get_tasks',
        name: 'Get Tasks',
        description: 'Get tasks from a project',
        inputSchema: {
          projectId: { type: 'string', required: true, description: 'Project ID' }
        },
        outputSchema: {
          tasks: { type: 'array', description: 'List of tasks' }
        }
      },
      {
        id: 'create_subtask',
        name: 'Create Subtask',
        description: 'Create a subtask under a parent task',
        inputSchema: {
          parentTaskId: { type: 'string', required: true, description: 'Parent task ID' },
          title: { type: 'string', required: true, description: 'Subtask name' },
          description: { type: 'string', description: 'Subtask notes' },
          assigneeId: { type: 'string', description: 'Assignee user ID' },
          dueDate: { type: 'string', description: 'Due date (YYYY-MM-DD)' }
        },
        outputSchema: {
          id: { type: 'string', description: 'Created subtask ID' },
          parentTaskId: { type: 'string', description: 'Parent task ID' }
        }
      },
      {
        id: 'get_subtasks',
        name: 'Get Subtasks',
        description: 'Get all subtasks of a task',
        inputSchema: {
          taskId: { type: 'string', required: true, description: 'Task ID' }
        },
        outputSchema: {
          subtasks: { type: 'array', description: 'List of subtasks' }
        }
      },
      {
        id: 'search_tasks',
        name: 'Search Tasks',
        description: 'Search for tasks in a workspace',
        inputSchema: {
          workspaceId: { type: 'string', required: true, description: 'Workspace ID' },
          query: { type: 'string', description: 'Search query' },
          projectId: { type: 'string', description: 'Filter by project ID' },
          assigneeId: { type: 'string', description: 'Filter by assignee ID' },
          completed: { type: 'boolean', description: 'Filter by completion status' }
        },
        outputSchema: {
          tasks: { type: 'array', description: 'List of matching tasks' }
        }
      }
    ];
  }

  private getTriggers(): ConnectorTrigger[] {
    return [
      {
        id: 'task_created',
        name: 'Task Created',
        description: 'Triggered when a new task is created',
        eventType: 'asana:task_created',
        outputSchema: {
          task: { type: 'object', description: 'Created task information' }
        },
        webhookRequired: true
      },
      {
        id: 'task_updated',
        name: 'Task Updated',
        description: 'Triggered when a task is updated',
        eventType: 'asana:task_updated',
        outputSchema: {
          task: { type: 'object', description: 'Updated task information' }
        },
        webhookRequired: true
      },
      {
        id: 'task_completed',
        name: 'Task Completed',
        description: 'Triggered when a task is marked as complete',
        eventType: 'asana:task_completed',
        outputSchema: {
          task: { type: 'object', description: 'Completed task information' }
        },
        webhookRequired: true
      },
      {
        id: 'project_created',
        name: 'Project Created',
        description: 'Triggered when a new project is created',
        eventType: 'asana:project_created',
        outputSchema: {
          project: { type: 'object', description: 'Created project information' }
        },
        webhookRequired: true
      },
      {
        id: 'comment_added',
        name: 'Comment Added',
        description: 'Triggered when a comment is added to a task',
        eventType: 'asana:comment_added',
        outputSchema: {
          comment: { type: 'object', description: 'Added comment information' }
        },
        webhookRequired: true
      }
    ];
  }
}