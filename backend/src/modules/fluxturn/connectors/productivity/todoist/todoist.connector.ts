import { Injectable, Logger } from '@nestjs/common';
import { BaseConnector } from '../../base/base.connector';
import {
  ConnectorMetadata,
  ConnectorType,
  ConnectorCategory,
  ConnectorRequest,
  ConnectorResponse,
  AuthType,
} from '../../types';

@Injectable()
export class TodoistConnector extends BaseConnector {
  protected readonly logger = new Logger(TodoistConnector.name);
  private readonly baseUrl = 'https://api.todoist.com/rest/v2';

  getMetadata(): ConnectorMetadata {
    return {
      name: 'Todoist',
      description: 'Manage tasks, projects, sections, comments, labels, and reminders in Todoist',
      version: '1.0.0',
      category: ConnectorCategory.PRODUCTIVITY,
      type: ConnectorType.TODOIST,
      authType: AuthType.API_KEY,
      actions: [],
      triggers: [],
      webhookSupport: false,
    };
  }

  protected async initializeConnection(): Promise<void> {
    if (!this.config.credentials?.apiKey) {
      throw new Error('Todoist API key is required');
    }
    this.logger.log('Todoist connector initialized');
  }

  protected async performConnectionTest(): Promise<boolean> {
    try {
      const response = await this.performRequest({
        method: 'GET',
        endpoint: '/labels',
      });
      return !!response;
    } catch (error) {
      this.logger.error('Todoist connection test failed', error);
      return false;
    }
  }

  protected async performHealthCheck(): Promise<void> {
    if (!this.config?.credentials?.apiKey) {
      throw new Error('API key not configured');
    }
  }

  protected async performRequest(request: ConnectorRequest): Promise<any> {
    const url = `${this.baseUrl}${request.endpoint}`;
    const headers = {
      'Authorization': `Bearer ${this.config.credentials.apiKey}`,
      'Content-Type': 'application/json',
      ...request.headers,
    };

    try {
      const response = await fetch(url, {
        method: request.method,
        headers,
        body: request.body ? JSON.stringify(request.body) : undefined,
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Todoist API error: ${response.status} - ${errorText}`);
      }

      // Handle 204 No Content responses
      if (response.status === 204) {
        return { success: true };
      }

      return await response.json();
    } catch (error) {
      this.logger.error('Todoist API request failed', error);
      throw error;
    }
  }

  protected async performAction(actionId: string, input: any): Promise<any> {
    switch (actionId) {
      // Task operations
      case 'task_create':
        return await this.createTask(input);
      case 'task_get':
        return await this.getTask(input);
      case 'task_getAll':
        return await this.getTasks(input);
      case 'task_update':
        return await this.updateTask(input);
      case 'task_close':
        return await this.closeTask(input);
      case 'task_reopen':
        return await this.reopenTask(input);
      case 'task_delete':
        return await this.deleteTask(input);
      case 'task_move':
        return await this.moveTask(input);
      case 'task_quickAdd':
        return await this.quickAddTask(input);

      // Project operations
      case 'project_create':
        return await this.createProject(input);
      case 'project_get':
        return await this.getProject(input);
      case 'project_getAll':
        return await this.getProjects(input);
      case 'project_update':
        return await this.updateProject(input);
      case 'project_delete':
        return await this.deleteProject(input);
      case 'project_archive':
        return await this.archiveProject(input);
      case 'project_unarchive':
        return await this.unarchiveProject(input);
      case 'project_getCollaborators':
        return await this.getProjectCollaborators(input);

      // Section operations
      case 'section_create':
        return await this.createSection(input);
      case 'section_get':
        return await this.getSection(input);
      case 'section_getAll':
        return await this.getSections(input);
      case 'section_update':
        return await this.updateSection(input);
      case 'section_delete':
        return await this.deleteSection(input);

      // Comment operations
      case 'comment_create':
        return await this.createComment(input);
      case 'comment_get':
        return await this.getComment(input);
      case 'comment_getAll':
        return await this.getComments(input);
      case 'comment_update':
        return await this.updateComment(input);
      case 'comment_delete':
        return await this.deleteComment(input);

      // Label operations
      case 'label_create':
        return await this.createLabel(input);
      case 'label_get':
        return await this.getLabel(input);
      case 'label_getAll':
        return await this.getLabels(input);
      case 'label_update':
        return await this.updateLabel(input);
      case 'label_delete':
        return await this.deleteLabel(input);

      default:
        throw new Error(`Unknown action: ${actionId}`);
    }
  }

  protected async cleanup(): Promise<void> {
    this.logger.log('Todoist connector cleanup completed');
  }

  // Task Operations
  private async createTask(input: any): Promise<any> {
    const body: any = {
      content: input.content,
    };

    if (input.description) body.description = input.description;
    if (input.projectId) body.project_id = input.projectId;
    if (input.sectionId) body.section_id = input.sectionId;
    if (input.parentId) body.parent_id = input.parentId;
    if (input.order) body.order = input.order;
    if (input.labels) body.labels = input.labels;
    if (input.priority) body.priority = input.priority;
    if (input.dueString) body.due_string = input.dueString;
    if (input.dueDate) body.due_date = input.dueDate;
    if (input.dueDateTime) body.due_datetime = input.dueDateTime;
    if (input.dueLang) body.due_lang = input.dueLang;
    if (input.assigneeId) body.assignee_id = input.assigneeId;
    if (input.duration) body.duration = input.duration;
    if (input.durationUnit) body.duration_unit = input.durationUnit;

    return await this.performRequest({
      method: 'POST',
      endpoint: '/tasks',
      body,
    });
  }

  private async getTask(input: any): Promise<any> {
    return await this.performRequest({
      method: 'GET',
      endpoint: `/tasks/${input.taskId}`,
    });
  }

  private async getTasks(input: any): Promise<any> {
    const queryParams = new URLSearchParams();

    if (input.projectId) queryParams.append('project_id', input.projectId);
    if (input.sectionId) queryParams.append('section_id', input.sectionId);
    if (input.labelId) queryParams.append('label_id', input.labelId);
    if (input.filter) queryParams.append('filter', input.filter);
    if (input.lang) queryParams.append('lang', input.lang);
    if (input.ids) queryParams.append('ids', input.ids);

    const queryString = queryParams.toString();
    const endpoint = queryString ? `/tasks?${queryString}` : '/tasks';

    return await this.performRequest({
      method: 'GET',
      endpoint,
    });
  }

  private async updateTask(input: any): Promise<any> {
    const body: any = {};

    if (input.content) body.content = input.content;
    if (input.description) body.description = input.description;
    if (input.labels) body.labels = input.labels;
    if (input.priority) body.priority = input.priority;
    if (input.dueString) body.due_string = input.dueString;
    if (input.dueDate) body.due_date = input.dueDate;
    if (input.dueDateTime) body.due_datetime = input.dueDateTime;
    if (input.dueLang) body.due_lang = input.dueLang;
    if (input.assigneeId) body.assignee_id = input.assigneeId;
    if (input.duration) body.duration = input.duration;
    if (input.durationUnit) body.duration_unit = input.durationUnit;

    return await this.performRequest({
      method: 'POST',
      endpoint: `/tasks/${input.taskId}`,
      body,
    });
  }

  private async closeTask(input: any): Promise<any> {
    return await this.performRequest({
      method: 'POST',
      endpoint: `/tasks/${input.taskId}/close`,
    });
  }

  private async reopenTask(input: any): Promise<any> {
    return await this.performRequest({
      method: 'POST',
      endpoint: `/tasks/${input.taskId}/reopen`,
    });
  }

  private async deleteTask(input: any): Promise<any> {
    return await this.performRequest({
      method: 'DELETE',
      endpoint: `/tasks/${input.taskId}`,
    });
  }

  private async moveTask(input: any): Promise<any> {
    const body: any = {
      project_id: input.projectId,
    };

    if (input.sectionId) body.section_id = input.sectionId;
    if (input.parentId) body.parent_id = input.parentId;

    return await this.performRequest({
      method: 'POST',
      endpoint: `/tasks/${input.taskId}`,
      body,
    });
  }

  private async quickAddTask(input: any): Promise<any> {
    const body: any = {
      text: input.text,
    };

    if (input.note) body.note = input.note;
    if (input.reminder) body.reminder = input.reminder;
    if (input.autoReminder !== undefined) body.auto_reminder = input.autoReminder;

    return await this.performRequest({
      method: 'POST',
      endpoint: '/quick/add',
      body,
    });
  }

  // Project Operations
  private async createProject(input: any): Promise<any> {
    const body: any = {
      name: input.name,
    };

    if (input.parentId) body.parent_id = input.parentId;
    if (input.color) body.color = input.color;
    if (input.isFavorite !== undefined) body.is_favorite = input.isFavorite;
    if (input.viewStyle) body.view_style = input.viewStyle;

    return await this.performRequest({
      method: 'POST',
      endpoint: '/projects',
      body,
    });
  }

  private async getProject(input: any): Promise<any> {
    return await this.performRequest({
      method: 'GET',
      endpoint: `/projects/${input.projectId}`,
    });
  }

  private async getProjects(input: any): Promise<any> {
    return await this.performRequest({
      method: 'GET',
      endpoint: '/projects',
    });
  }

  private async updateProject(input: any): Promise<any> {
    const body: any = {};

    if (input.name) body.name = input.name;
    if (input.color) body.color = input.color;
    if (input.isFavorite !== undefined) body.is_favorite = input.isFavorite;
    if (input.viewStyle) body.view_style = input.viewStyle;

    return await this.performRequest({
      method: 'POST',
      endpoint: `/projects/${input.projectId}`,
      body,
    });
  }

  private async deleteProject(input: any): Promise<any> {
    return await this.performRequest({
      method: 'DELETE',
      endpoint: `/projects/${input.projectId}`,
    });
  }

  private async archiveProject(input: any): Promise<any> {
    return await this.performRequest({
      method: 'POST',
      endpoint: `/projects/${input.projectId}`,
      body: { is_archived: true },
    });
  }

  private async unarchiveProject(input: any): Promise<any> {
    return await this.performRequest({
      method: 'POST',
      endpoint: `/projects/${input.projectId}`,
      body: { is_archived: false },
    });
  }

  private async getProjectCollaborators(input: any): Promise<any> {
    return await this.performRequest({
      method: 'GET',
      endpoint: `/projects/${input.projectId}/collaborators`,
    });
  }

  // Section Operations
  private async createSection(input: any): Promise<any> {
    const body: any = {
      name: input.name,
      project_id: input.projectId,
    };

    if (input.order) body.order = input.order;

    return await this.performRequest({
      method: 'POST',
      endpoint: '/sections',
      body,
    });
  }

  private async getSection(input: any): Promise<any> {
    return await this.performRequest({
      method: 'GET',
      endpoint: `/sections/${input.sectionId}`,
    });
  }

  private async getSections(input: any): Promise<any> {
    const queryParams = new URLSearchParams();

    if (input.projectId) queryParams.append('project_id', input.projectId);

    const queryString = queryParams.toString();
    const endpoint = queryString ? `/sections?${queryString}` : '/sections';

    return await this.performRequest({
      method: 'GET',
      endpoint,
    });
  }

  private async updateSection(input: any): Promise<any> {
    return await this.performRequest({
      method: 'POST',
      endpoint: `/sections/${input.sectionId}`,
      body: { name: input.name },
    });
  }

  private async deleteSection(input: any): Promise<any> {
    return await this.performRequest({
      method: 'DELETE',
      endpoint: `/sections/${input.sectionId}`,
    });
  }

  // Comment Operations
  private async createComment(input: any): Promise<any> {
    const body: any = {
      task_id: input.taskId,
      content: input.content,
    };

    return await this.performRequest({
      method: 'POST',
      endpoint: '/comments',
      body,
    });
  }

  private async getComment(input: any): Promise<any> {
    return await this.performRequest({
      method: 'GET',
      endpoint: `/comments/${input.commentId}`,
    });
  }

  private async getComments(input: any): Promise<any> {
    const queryParams = new URLSearchParams();

    if (input.taskId) queryParams.append('task_id', input.taskId);
    if (input.projectId) queryParams.append('project_id', input.projectId);

    const queryString = queryParams.toString();
    const endpoint = queryString ? `/comments?${queryString}` : '/comments';

    return await this.performRequest({
      method: 'GET',
      endpoint,
    });
  }

  private async updateComment(input: any): Promise<any> {
    return await this.performRequest({
      method: 'POST',
      endpoint: `/comments/${input.commentId}`,
      body: { content: input.content },
    });
  }

  private async deleteComment(input: any): Promise<any> {
    return await this.performRequest({
      method: 'DELETE',
      endpoint: `/comments/${input.commentId}`,
    });
  }

  // Label Operations
  private async createLabel(input: any): Promise<any> {
    const body: any = {
      name: input.name,
    };

    if (input.color) body.color = input.color;
    if (input.order) body.order = input.order;
    if (input.isFavorite !== undefined) body.is_favorite = input.isFavorite;

    return await this.performRequest({
      method: 'POST',
      endpoint: '/labels',
      body,
    });
  }

  private async getLabel(input: any): Promise<any> {
    return await this.performRequest({
      method: 'GET',
      endpoint: `/labels/${input.labelId}`,
    });
  }

  private async getLabels(input: any): Promise<any> {
    return await this.performRequest({
      method: 'GET',
      endpoint: '/labels',
    });
  }

  private async updateLabel(input: any): Promise<any> {
    const body: any = {};

    if (input.name) body.name = input.name;
    if (input.color) body.color = input.color;
    if (input.order !== undefined) body.order = input.order;
    if (input.isFavorite !== undefined) body.is_favorite = input.isFavorite;

    return await this.performRequest({
      method: 'POST',
      endpoint: `/labels/${input.labelId}`,
      body,
    });
  }

  private async deleteLabel(input: any): Promise<any> {
    return await this.performRequest({
      method: 'DELETE',
      endpoint: `/labels/${input.labelId}`,
    });
  }
}
