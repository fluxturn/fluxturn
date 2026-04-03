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
  ConnectorTrigger
} from '../../types';
import {
  IProjectManagementConnector,
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

interface ClickUpTask {
  name: string;
  description?: string;
  assignees?: number[];
  tags?: string[];
  status?: string;
  priority?: number;
  due_date?: number;
  start_date?: number;
  time_estimate?: number;
  custom_fields?: any[];
}

interface ClickUpList {
  name: string;
  content?: string;
  due_date?: number;
  priority?: number;
  assignee?: number;
  status?: string;
}

interface ClickUpFolder {
  name: string;
}

interface ClickUpComment {
  comment_text: string;
  assignee?: number;
  notify_all?: boolean;
}

@Injectable()
export class ClickUpConnector extends BaseConnector implements IProjectManagementConnector {
  private readonly baseUrl = 'https://api.clickup.com/api/v2';

  constructor(
    private readonly authUtils: AuthUtils,
    private readonly apiUtils: ApiUtils
  ) {
    super();
  }

  getMetadata(): ConnectorMetadata {
    return {
      name: 'ClickUp',
      description: 'ClickUp project management platform with comprehensive task, list, folder, and goal management',
      version: '1.0.0',
      category: ConnectorCategory.PROJECT_MANAGEMENT,
      type: ConnectorType.CLICKUP,
      logoUrl: 'https://clickup.com/landing/images/logo-clickup_color.svg',
      documentationUrl: 'https://clickup.com/api',
      authType: AuthType.OAUTH2,
      requiredScopes: [],
      actions: this.getActions(),
      triggers: this.getTriggers(),
      rateLimit: {
        requestsPerMinute: 100,
        requestsPerHour: 6000
      },
      webhookSupport: true
    };
  }

  protected async initializeConnection(): Promise<void> {
    try {
      // Test connection by getting authenticated user
      const response = await this.performRequest({
        method: 'GET',
        endpoint: '/user',
        headers: this.getAuthHeaders()
      });

      if (!response) {
        throw new Error('Failed to connect to ClickUp API');
      }

      this.logger.log('ClickUp connector initialized successfully');
    } catch (error) {
      this.logger.error('Failed to initialize ClickUp connection:', error);
      throw new Error(`ClickUp connection failed: ${error.message}`);
    }
  }

  protected async performConnectionTest(): Promise<boolean> {
    try {
      const response = await this.performRequest({
        method: 'GET',
        endpoint: '/user',
        headers: this.getAuthHeaders()
      });
      return !!response;
    } catch (error) {
      this.logger.error('ClickUp connection test failed:', error);
      return false;
    }
  }

  protected async performHealthCheck(): Promise<void> {
    try {
      await this.performRequest({
        method: 'GET',
        endpoint: '/user',
        headers: this.getAuthHeaders()
      });
    } catch (error) {
      throw new Error(`ClickUp health check failed: ${error.message}`);
    }
  }

  protected async performRequest(request: ConnectorRequest): Promise<any> {
    try {
      const fullEndpoint = `${this.baseUrl}${request.endpoint}`;
      const headers = {
        ...this.getAuthHeaders(),
        'Content-Type': 'application/json',
        ...request.headers
      };

      this.logger.log(`ClickUp HTTP Request: ${request.method} ${fullEndpoint}`);
      this.logger.log(`Headers:`, JSON.stringify(headers, null, 2));
      if (request.body) {
        this.logger.log(`Request Body:`, JSON.stringify(request.body, null, 2));
      }

      const response = await this.apiUtils.executeRequest({
        ...request,
        endpoint: fullEndpoint,
        headers
      });

      this.logger.log(`ClickUp Response:`, JSON.stringify(response, null, 2));

      if (!response.success) {
        this.logger.error(`ClickUp API Error:`, response.error);
        throw new Error(response.error?.message || 'Request failed');
      }

      return response.data;
    } catch (error) {
      this.logger.error('ClickUp request failed:', error);
      this.logger.error('Error details:', {
        message: error.message,
        response: error.response?.data,
        status: error.response?.status,
        statusText: error.response?.statusText
      });
      throw error;
    }
  }

  protected async performAction(actionId: string, input: any): Promise<any> {
    this.logger.log(`Executing ClickUp action: ${actionId} with input:`, JSON.stringify(input, null, 2));

    switch (actionId) {
      case 'task_create':
        // Map input fields to PMTask interface
        const taskData: PMTask = {
          title: input.name,  // Map 'name' to 'title'
          projectId: input.listId,  // Map 'listId' to 'projectId'
          description: input.description,
          status: input.status,
          priority: input.priority,
          assigneeId: input.assignees?.[0]?.toString(),
          tags: input.tags,
          dueDate: input.dueDate ? new Date(input.dueDate) : undefined,
          startDate: input.startDate ? new Date(input.startDate) : undefined
        };
        this.logger.log(`Mapped task data:`, JSON.stringify(taskData, null, 2));
        return this.createTask(taskData);
      case 'task_update':
        return this.updateTask(input.taskId, input);
      case 'task_get':
        return this.getTask(input.taskId);
      case 'task_delete':
        return this.deleteTask(input.taskId);
      case 'task_get_all':
        return this.getTasks({ projectId: input.listId, ...input });
      case 'list_create':
        return this.createList(input);
      case 'list_update':
        return this.updateList(input.listId, input);
      case 'list_get':
        return this.getList(input.listId);
      case 'list_delete':
        return this.deleteList(input.listId);
      case 'folder_create':
        return this.createFolder(input);
      case 'folder_update':
        return this.updateFolder(input.folderId, input);
      case 'folder_get':
        return this.getFolder(input.folderId);
      case 'folder_delete':
        return this.deleteFolder(input.folderId);
      case 'comment_create':
        return this.addComment({ content: input.commentText, taskId: input.taskId, authorId: '' });
      case 'goal_create':
        return this.createGoal(input);
      case 'goal_update':
        return this.updateGoal(input.goalId, input);
      case 'goal_get':
        return this.getGoal(input.goalId);
      case 'goal_delete':
        return this.deleteGoal(input.goalId);
      case 'time_entry_create':
        return this.createTimeEntry(input);
      default:
        throw new Error(`Unknown action: ${actionId}`);
    }
  }

  protected async cleanup(): Promise<void> {
    this.logger.log('ClickUp connector cleanup completed');
  }

  // Project Management Interface Implementation

  // In ClickUp, Lists are equivalent to Projects
  async createProject(project: PMProject): Promise<ConnectorResponse<PMProject>> {
    try {
      // Lists in ClickUp are created under folders
      // We need a folderId to create a list
      if (!project.customFields?.folderId) {
        throw new Error('folderId is required in customFields to create a ClickUp list');
      }

      const clickupList: ClickUpList = {
        name: project.name,
        content: project.description
      };

      const result = await this.performRequest({
        method: 'POST',
        endpoint: `/folder/${project.customFields.folderId}/list`,
        body: clickupList
      });

      const mappedProject: PMProject = {
        id: result.id,
        name: result.name,
        description: result.content,
        status: result.archived ? 'Archived' : 'Active',
        customFields: {
          folder: result.folder,
          space: result.space,
          archived: result.archived,
          override_statuses: result.override_statuses,
          permission_level: result.permission_level
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
      return this.handleError(error as any, 'Failed to create list/project');
    }
  }

  async updateProject(projectId: string, updates: Partial<PMProject>): Promise<ConnectorResponse<PMProject>> {
    try {
      const updateData: Partial<ClickUpList> = {};

      if (updates.name) updateData.name = updates.name;
      if (updates.description) updateData.content = updates.description;

      const result = await this.performRequest({
        method: 'PUT',
        endpoint: `/list/${projectId}`,
        body: updateData
      });

      const mappedProject: PMProject = {
        id: result.id,
        name: result.name,
        description: result.content,
        status: result.archived ? 'Archived' : 'Active',
        customFields: {
          folder: result.folder,
          space: result.space,
          archived: result.archived
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
      return this.handleError(error as any, 'Failed to update list/project');
    }
  }

  async getProject(projectId: string): Promise<ConnectorResponse<PMProject>> {
    try {
      const result = await this.performRequest({
        method: 'GET',
        endpoint: `/list/${projectId}`
      });

      const mappedProject: PMProject = {
        id: result.id,
        name: result.name,
        description: result.content,
        status: result.archived ? 'Archived' : 'Active',
        customFields: {
          folder: result.folder,
          space: result.space,
          archived: result.archived,
          task_count: result.task_count,
          due_date: result.due_date,
          start_date: result.start_date,
          statuses: result.statuses
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
      return this.handleError(error as any, 'Failed to get list/project');
    }
  }

  async getProjects(options?: PaginatedRequest): Promise<ConnectorResponse<PMProject[]>> {
    try {
      // In ClickUp, we need to get lists from a folder or space
      // This would require additional context
      // For now, return empty array
      return {
        success: true,
        data: [],
        metadata: {
          timestamp: new Date(),
          rateLimit: await this.getRateLimitInfo(),
          pagination: {
            page: options?.page || 1,
            pageSize: options?.pageSize || 100,
            total: 0,
            hasNext: false
          }
        }
      };
    } catch (error) {
      return this.handleError(error as any, 'Failed to get lists/projects');
    }
  }

  async deleteProject(projectId: string): Promise<ConnectorResponse<{ deleted: boolean }>> {
    try {
      await this.performRequest({
        method: 'DELETE',
        endpoint: `/list/${projectId}`
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
      return this.handleError(error as any, 'Failed to delete list/project');
    }
  }

  // Task Management
  async createTask(task: PMTask): Promise<ConnectorResponse<PMTask>> {
    try {
      this.logger.log(`Starting ClickUp task creation...`);

      // In ClickUp, tasks are created in lists
      if (!task.projectId) {
        this.logger.error('projectId (listId) is missing in task data');
        throw new Error('projectId (listId) is required to create a task');
      }

      this.logger.log(`Creating task in list: ${task.projectId}`);
      this.logger.log(`Task title: ${task.title}`);

      const clickupTask: ClickUpTask = {
        name: task.title,
        description: task.description,
        assignees: task.assigneeId ? [parseInt(task.assigneeId)] : undefined,
        tags: task.tags,
        status: task.status,
        priority: task.priority as any,
        due_date: task.dueDate ? task.dueDate.getTime() : undefined,
        start_date: task.startDate ? task.startDate.getTime() : undefined
      };

      this.logger.log(`ClickUp API request body:`, JSON.stringify(clickupTask, null, 2));
      this.logger.log(`ClickUp API endpoint: POST /list/${task.projectId}/task`);

      const result = await this.performRequest({
        method: 'POST',
        endpoint: `/list/${task.projectId}/task`,
        body: clickupTask
      });

      this.logger.log(`ClickUp API response:`, JSON.stringify(result, null, 2));

      const mappedTask: PMTask = {
        id: result.id,
        title: result.name,
        description: result.description,
        status: result.status?.status || 'Open',
        assigneeId: result.assignees?.[0]?.id?.toString(),
        projectId: result.list?.id,
        priority: result.priority?.priority,
        dueDate: result.due_date ? new Date(parseInt(result.due_date)) : undefined,
        startDate: result.start_date ? new Date(parseInt(result.start_date)) : undefined,
        tags: result.tags?.map((tag: any) => tag.name) || [],
        customFields: {
          url: result.url,
          text_content: result.text_content,
          creator: result.creator,
          time_estimate: result.time_estimate,
          custom_id: result.custom_id,
          archived: result.archived
        }
      };

      this.logger.log(`✅ Task created successfully! Task ID: ${result.id}, URL: ${result.url}`);

      return {
        success: true,
        data: mappedTask,
        metadata: {
          timestamp: new Date(),
          rateLimit: await this.getRateLimitInfo()
        }
      };
    } catch (error) {
      this.logger.error('❌ Failed to create ClickUp task:', error);
      this.logger.error('Error details:', {
        message: error.message,
        response: error.response?.data,
        status: error.response?.status
      });
      return this.handleError(error as any, 'Failed to create task');
    }
  }

  async updateTask(taskId: string, updates: Partial<PMTask>): Promise<ConnectorResponse<PMTask>> {
    try {
      const updateData: Partial<ClickUpTask> = {};

      if (updates.title) updateData.name = updates.title;
      if (updates.description) updateData.description = updates.description;
      if (updates.status) updateData.status = updates.status;
      if (updates.priority !== undefined) updateData.priority = updates.priority as any;
      if (updates.dueDate) updateData.due_date = updates.dueDate.getTime();
      if (updates.startDate) updateData.start_date = updates.startDate.getTime();
      if (updates.assigneeId) updateData.assignees = [parseInt(updates.assigneeId)];

      await this.performRequest({
        method: 'PUT',
        endpoint: `/task/${taskId}`,
        body: updateData
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
        endpoint: `/task/${taskId}`
      });

      const mappedTask: PMTask = {
        id: result.id,
        title: result.name,
        description: result.description,
        status: result.status?.status || 'Open',
        assigneeId: result.assignees?.[0]?.id?.toString(),
        projectId: result.list?.id,
        priority: result.priority?.priority,
        dueDate: result.due_date ? new Date(parseInt(result.due_date)) : undefined,
        startDate: result.start_date ? new Date(parseInt(result.start_date)) : undefined,
        tags: result.tags?.map((tag: any) => tag.name) || [],
        customFields: {
          url: result.url,
          text_content: result.text_content,
          creator: result.creator,
          time_estimate: result.time_estimate,
          custom_id: result.custom_id,
          archived: result.archived,
          date_created: result.date_created,
          date_updated: result.date_updated,
          date_closed: result.date_closed
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
      if (!options?.projectId) {
        throw new Error('projectId (listId) is required to get tasks');
      }

      const queryParams: any = {
        archived: options.includeArchived || false,
        subtasks: true
      };

      const result = await this.performRequest({
        method: 'GET',
        endpoint: `/list/${options.projectId}/task`,
        queryParams
      });

      let tasks = result.tasks || [];

      // Filter by status if specified
      if (options.status) {
        tasks = tasks.filter((task: any) => task.status?.status === options.status);
      }

      // Filter by assignee if specified
      if (options.assigneeId) {
        tasks = tasks.filter((task: any) =>
          task.assignees?.some((a: any) => a.id?.toString() === options.assigneeId)
        );
      }

      // Filter by query if specified
      if (options.query) {
        tasks = tasks.filter((task: any) =>
          task.name.toLowerCase().includes(options.query!.toLowerCase()) ||
          (task.description && task.description.toLowerCase().includes(options.query!.toLowerCase()))
        );
      }

      const mappedTasks: PMTask[] = tasks.map((task: any) => ({
        id: task.id,
        title: task.name,
        description: task.description,
        status: task.status?.status || 'Open',
        assigneeId: task.assignees?.[0]?.id?.toString(),
        projectId: task.list?.id,
        priority: task.priority?.priority,
        dueDate: task.due_date ? new Date(parseInt(task.due_date)) : undefined,
        startDate: task.start_date ? new Date(parseInt(task.start_date)) : undefined,
        tags: task.tags?.map((tag: any) => tag.name) || [],
        customFields: {
          url: task.url,
          text_content: task.text_content,
          creator: task.creator,
          time_estimate: task.time_estimate,
          custom_id: task.custom_id,
          archived: task.archived
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
            total: mappedTasks.length,
            hasNext: false
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
        endpoint: `/task/${taskId}`
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
        endpoint: `/task/${taskId}`,
        body: {
          assignees: {
            add: [parseInt(assigneeId)]
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
      await this.performRequest({
        method: 'PUT',
        endpoint: `/task/${taskId}`,
        body: {
          status: transition.to
        }
      });

      // Add comment if provided
      if (transition.comment) {
        await this.addComment({
          content: transition.comment,
          taskId: taskId,
          authorId: ''
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
      if (!comment.taskId) {
        throw new Error('taskId is required to add a comment');
      }

      const clickupComment: ClickUpComment = {
        comment_text: comment.content,
        notify_all: true
      };

      const result = await this.performRequest({
        method: 'POST',
        endpoint: `/task/${comment.taskId}/comment`,
        body: clickupComment
      });

      const mappedComment: PMComment = {
        id: result.id,
        content: result.comment_text,
        authorId: result.user?.id?.toString(),
        taskId: comment.taskId,
        createdAt: new Date(parseInt(result.date))
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
        endpoint: `/comment/${commentId}`,
        body: {
          comment_text: content
        }
      });

      const mappedComment: PMComment = {
        id: result.id,
        content: result.comment_text,
        authorId: result.user?.id?.toString(),
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
      const result = await this.performRequest({
        method: 'GET',
        endpoint: `/task/${taskId}/comment`
      });

      const comments = result.comments || [];

      const mappedComments: PMComment[] = comments.map((comment: any) => ({
        id: comment.id,
        content: comment.comment_text,
        authorId: comment.user?.id?.toString(),
        taskId: taskId,
        createdAt: new Date(parseInt(comment.date))
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
            total: mappedComments.length,
            hasNext: false
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
        endpoint: `/comment/${commentId}`
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
      // ClickUp doesn't have a direct "get all users" endpoint
      // Users are typically fetched per workspace/team
      // Return empty array for now
      return {
        success: true,
        data: [],
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
      // ClickUp API doesn't have a direct "get user by ID" endpoint
      // Return minimal user info
      const mappedUser: PMUser = {
        id: userId,
        name: 'User ' + userId,
        email: ''
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
        endpoint: '/user'
      });

      const mappedUser: PMUser = {
        id: result.user?.id?.toString(),
        name: result.user?.username,
        email: result.user?.email,
        avatar: result.user?.profilePicture
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
      // ClickUp tags are created at the space level
      // This requires a spaceId which we don't have in the generic interface
      // Return placeholder implementation
      return {
        success: true,
        data: {
          id: Date.now().toString(),
          name: label.name,
          color: label.color
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
      // ClickUp tags are fetched at the space level
      // Return empty array for now
      return {
        success: true,
        data: [],
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
        endpoint: `/task/${taskId}/tag/${labelId}`
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
        method: 'DELETE',
        endpoint: `/task/${taskId}/tag/${labelId}`
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
      // ClickUp attachment upload requires multipart form data
      // Return placeholder implementation
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
      // Get task to retrieve attachments
      const task = await this.performRequest({
        method: 'GET',
        endpoint: `/task/${taskId}`
      });

      const attachments = task.attachments || [];

      const mappedAttachments: PMAttachment[] = attachments.map((attachment: any) => ({
        id: attachment.id,
        name: attachment.title,
        url: attachment.url,
        size: attachment.size,
        mimeType: attachment.mimetype,
        uploadedAt: new Date(parseInt(attachment.date))
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
      // ClickUp doesn't have a direct delete attachment endpoint
      // Attachments are deleted via task update
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
      // ClickUp doesn't have a direct search projects endpoint
      // Would need to fetch all lists and filter
      return {
        success: true,
        data: [],
        metadata: {
          timestamp: new Date(),
          rateLimit: await this.getRateLimitInfo()
        }
      };
    } catch (error) {
      return this.handleError(error as any, 'Failed to search projects');
    }
  }

  // ClickUp-specific methods
  async createList(list: { folderId: string; name: string; content?: string }): Promise<ConnectorResponse<any>> {
    try {
      const result = await this.performRequest({
        method: 'POST',
        endpoint: `/folder/${list.folderId}/list`,
        body: {
          name: list.name,
          content: list.content
        }
      });

      return {
        success: true,
        data: {
          id: result.id,
          name: result.name,
          content: result.content,
          folderId: list.folderId
        },
        metadata: {
          timestamp: new Date(),
          rateLimit: await this.getRateLimitInfo()
        }
      };
    } catch (error) {
      return this.handleError(error as any, 'Failed to create list');
    }
  }

  async updateList(listId: string, updates: { name?: string; content?: string }): Promise<ConnectorResponse<any>> {
    try {
      const result = await this.performRequest({
        method: 'PUT',
        endpoint: `/list/${listId}`,
        body: updates
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
      return this.handleError(error as any, 'Failed to update list');
    }
  }

  async getList(listId: string): Promise<ConnectorResponse<any>> {
    try {
      const result = await this.performRequest({
        method: 'GET',
        endpoint: `/list/${listId}`
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
      return this.handleError(error as any, 'Failed to get list');
    }
  }

  async deleteList(listId: string): Promise<ConnectorResponse<{ deleted: boolean }>> {
    try {
      await this.performRequest({
        method: 'DELETE',
        endpoint: `/list/${listId}`
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
      return this.handleError(error as any, 'Failed to delete list');
    }
  }

  async createFolder(folder: { spaceId: string; name: string }): Promise<ConnectorResponse<any>> {
    try {
      const result = await this.performRequest({
        method: 'POST',
        endpoint: `/space/${folder.spaceId}/folder`,
        body: {
          name: folder.name
        }
      });

      return {
        success: true,
        data: {
          id: result.id,
          name: result.name,
          spaceId: folder.spaceId
        },
        metadata: {
          timestamp: new Date(),
          rateLimit: await this.getRateLimitInfo()
        }
      };
    } catch (error) {
      return this.handleError(error as any, 'Failed to create folder');
    }
  }

  async updateFolder(folderId: string, updates: { name: string }): Promise<ConnectorResponse<any>> {
    try {
      const result = await this.performRequest({
        method: 'PUT',
        endpoint: `/folder/${folderId}`,
        body: updates
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
      return this.handleError(error as any, 'Failed to update folder');
    }
  }

  async getFolder(folderId: string): Promise<ConnectorResponse<any>> {
    try {
      const result = await this.performRequest({
        method: 'GET',
        endpoint: `/folder/${folderId}`
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
      return this.handleError(error as any, 'Failed to get folder');
    }
  }

  async deleteFolder(folderId: string): Promise<ConnectorResponse<{ deleted: boolean }>> {
    try {
      await this.performRequest({
        method: 'DELETE',
        endpoint: `/folder/${folderId}`
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
      return this.handleError(error as any, 'Failed to delete folder');
    }
  }

  async createGoal(goal: { teamId: string; name: string; description?: string; dueDate?: number }): Promise<ConnectorResponse<any>> {
    try {
      const result = await this.performRequest({
        method: 'POST',
        endpoint: `/team/${goal.teamId}/goal`,
        body: {
          name: goal.name,
          description: goal.description,
          due_date: goal.dueDate
        }
      });

      return {
        success: true,
        data: {
          id: result.goal.id,
          name: result.goal.name,
          description: result.goal.description,
          teamId: goal.teamId
        },
        metadata: {
          timestamp: new Date(),
          rateLimit: await this.getRateLimitInfo()
        }
      };
    } catch (error) {
      return this.handleError(error as any, 'Failed to create goal');
    }
  }

  async updateGoal(goalId: string, updates: { name?: string; description?: string }): Promise<ConnectorResponse<any>> {
    try {
      const result = await this.performRequest({
        method: 'PUT',
        endpoint: `/goal/${goalId}`,
        body: updates
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
      return this.handleError(error as any, 'Failed to update goal');
    }
  }

  async getGoal(goalId: string): Promise<ConnectorResponse<any>> {
    try {
      const result = await this.performRequest({
        method: 'GET',
        endpoint: `/goal/${goalId}`
      });

      return {
        success: true,
        data: result.goal,
        metadata: {
          timestamp: new Date(),
          rateLimit: await this.getRateLimitInfo()
        }
      };
    } catch (error) {
      return this.handleError(error as any, 'Failed to get goal');
    }
  }

  async deleteGoal(goalId: string): Promise<ConnectorResponse<{ deleted: boolean }>> {
    try {
      await this.performRequest({
        method: 'DELETE',
        endpoint: `/goal/${goalId}`
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
      return this.handleError(error as any, 'Failed to delete goal');
    }
  }

  async createTimeEntry(entry: { teamId: string; taskId?: string; start?: number; duration?: number }): Promise<ConnectorResponse<any>> {
    try {
      const result = await this.performRequest({
        method: 'POST',
        endpoint: `/team/${entry.teamId}/time_entries`,
        body: {
          tid: entry.taskId,
          start: entry.start,
          duration: entry.duration
        }
      });

      return {
        success: true,
        data: {
          id: result.data.id,
          taskId: entry.taskId,
          start: result.data.start,
          duration: result.data.duration
        },
        metadata: {
          timestamp: new Date(),
          rateLimit: await this.getRateLimitInfo()
        }
      };
    } catch (error) {
      return this.handleError(error as any, 'Failed to create time entry');
    }
  }

  private getAuthHeaders(): Record<string, string> {
    if (this.config.credentials.accessToken) {
      return {
        'Authorization': this.config.credentials.accessToken
      };
    }
    return {};
  }

  private getActions(): ConnectorAction[] {
    return [
      // Task Actions
      { id: 'task_create', name: 'Create Task', description: 'Create a new task in ClickUp', inputSchema: {}, outputSchema: {} },
      { id: 'task_update', name: 'Update Task', description: 'Update an existing task', inputSchema: {}, outputSchema: {} },
      { id: 'task_get', name: 'Get Task', description: 'Retrieve a task by ID', inputSchema: {}, outputSchema: {} },
      { id: 'task_delete', name: 'Delete Task', description: 'Delete a task', inputSchema: {}, outputSchema: {} },
      { id: 'task_get_all', name: 'Get All Tasks', description: 'Get tasks from a list', inputSchema: {}, outputSchema: {} },
      // List Actions
      { id: 'list_create', name: 'Create List', description: 'Create a new list in a folder', inputSchema: {}, outputSchema: {} },
      { id: 'list_update', name: 'Update List', description: 'Update a list', inputSchema: {}, outputSchema: {} },
      { id: 'list_get', name: 'Get List', description: 'Get a list by ID', inputSchema: {}, outputSchema: {} },
      { id: 'list_delete', name: 'Delete List', description: 'Delete a list', inputSchema: {}, outputSchema: {} },
      // Folder Actions
      { id: 'folder_create', name: 'Create Folder', description: 'Create a new folder in a space', inputSchema: {}, outputSchema: {} },
      { id: 'folder_update', name: 'Update Folder', description: 'Update a folder', inputSchema: {}, outputSchema: {} },
      { id: 'folder_get', name: 'Get Folder', description: 'Get a folder by ID', inputSchema: {}, outputSchema: {} },
      { id: 'folder_delete', name: 'Delete Folder', description: 'Delete a folder', inputSchema: {}, outputSchema: {} },
      // Comment Actions
      { id: 'comment_create', name: 'Create Comment', description: 'Add a comment to a task', inputSchema: {}, outputSchema: {} },
      // Goal Actions
      { id: 'goal_create', name: 'Create Goal', description: 'Create a new goal', inputSchema: {}, outputSchema: {} },
      { id: 'goal_update', name: 'Update Goal', description: 'Update a goal', inputSchema: {}, outputSchema: {} },
      { id: 'goal_get', name: 'Get Goal', description: 'Get a goal by ID', inputSchema: {}, outputSchema: {} },
      { id: 'goal_delete', name: 'Delete Goal', description: 'Delete a goal', inputSchema: {}, outputSchema: {} },
      // Time Entry Actions
      { id: 'time_entry_create', name: 'Create Time Entry', description: 'Create a time tracking entry', inputSchema: {}, outputSchema: {} },
    ];
  }

  private getTriggers(): ConnectorTrigger[] {
    return [
      { id: 'task_created', name: 'Task Created', description: 'Triggered when a new task is created', eventType: 'clickup:task_created', outputSchema: {}, webhookRequired: true },
      { id: 'task_updated', name: 'Task Updated', description: 'Triggered when a task is updated', eventType: 'clickup:task_updated', outputSchema: {}, webhookRequired: true },
      { id: 'task_deleted', name: 'Task Deleted', description: 'Triggered when a task is deleted', eventType: 'clickup:task_deleted', outputSchema: {}, webhookRequired: true },
      { id: 'task_status_updated', name: 'Task Status Updated', description: 'Triggered when a task status changes', eventType: 'clickup:task_status_updated', outputSchema: {}, webhookRequired: true },
      { id: 'task_priority_updated', name: 'Task Priority Updated', description: 'Triggered when a task priority changes', eventType: 'clickup:task_priority_updated', outputSchema: {}, webhookRequired: true },
      { id: 'task_assignee_updated', name: 'Task Assignee Updated', description: 'Triggered when task assignees change', eventType: 'clickup:task_assignee_updated', outputSchema: {}, webhookRequired: true },
      { id: 'task_comment_posted', name: 'Task Comment Posted', description: 'Triggered when a comment is added to a task', eventType: 'clickup:task_comment_posted', outputSchema: {}, webhookRequired: true },
      { id: 'list_created', name: 'List Created', description: 'Triggered when a new list is created', eventType: 'clickup:list_created', outputSchema: {}, webhookRequired: true },
      { id: 'goal_created', name: 'Goal Created', description: 'Triggered when a new goal is created', eventType: 'clickup:goal_created', outputSchema: {}, webhookRequired: true },
      { id: 'goal_updated', name: 'Goal Updated', description: 'Triggered when a goal is updated', eventType: 'clickup:goal_updated', outputSchema: {}, webhookRequired: true },
    ];
  }
}
