import { Injectable, Logger } from '@nestjs/common';
import { BaseConnector } from '../../base/base.connector';
import {
  ConnectorMetadata,
  ConnectorType,
  ConnectorCategory,
  ConnectorRequest,
  ConnectorResponse,
  AuthType,
  ConnectorAction,
  ConnectorTrigger,
} from '../../types';
import { AuthUtils } from '../../utils/auth.utils';
import { ApiUtils } from '../../utils/api.utils';

@Injectable()
export class ClockifyConnector extends BaseConnector {
  private readonly baseUrl = 'https://api.clockify.me/api/v1';

  constructor(
    private readonly authUtils: AuthUtils,
    private readonly apiUtils: ApiUtils,
  ) {
    super();
  }

  getMetadata(): ConnectorMetadata {
    return {
      name: 'Clockify',
      description: 'Time tracking and timesheet management for teams and freelancers',
      version: '1.0.0',
      category: ConnectorCategory.PRODUCTIVITY,
      type: ConnectorType.CLOCKIFY,
      authType: AuthType.API_KEY,
      actions: this.getActions(),
      triggers: this.getTriggers(),
      webhookSupport: false,
    };
  }

  protected async initializeConnection(): Promise<void> {
    if (!this.config.credentials?.apiKey) {
      throw new Error('API key is required');
    }
    this.logger.log('Clockify connector initialized');
  }

  protected async performConnectionTest(): Promise<boolean> {
    try {
      const response = await this.performRequest({
        method: 'GET',
        endpoint: '/workspaces',
        headers: this.getAuthHeaders(),
      });
      return !!response;
    } catch (error) {
      this.logger.error('Connection test failed:', error);
      return false;
    }
  }

  protected async performHealthCheck(): Promise<void> {
    const isHealthy = await this.performConnectionTest();
    if (!isHealthy) {
      throw new Error('Health check failed');
    }
  }

  protected async performRequest(request: ConnectorRequest): Promise<any> {
    const url = `${this.baseUrl}${request.endpoint}`;

    const response = await this.apiUtils.executeRequest({
      method: request.method,
      endpoint: url,
      headers: request.headers || this.getAuthHeaders(),
      queryParams: request.queryParams,
      body: request.body,
    });

    return response.data;
  }

  protected async performAction(actionId: string, input: any): Promise<any> {
    switch (actionId) {
      // Workspace
      case 'get_all_workspaces':
        return await this.getAllWorkspaces();

      // Time Entries
      case 'create_time_entry':
        return await this.createTimeEntry(input);
      case 'get_time_entry':
        return await this.getTimeEntry(input);
      case 'update_time_entry':
        return await this.updateTimeEntry(input);
      case 'delete_time_entry':
        return await this.deleteTimeEntry(input);

      // Projects
      case 'create_project':
        return await this.createProject(input);
      case 'get_project':
        return await this.getProject(input);
      case 'get_all_projects':
        return await this.getAllProjects(input);
      case 'update_project':
        return await this.updateProject(input);
      case 'delete_project':
        return await this.deleteProject(input);

      // Clients
      case 'create_client':
        return await this.createClient(input);
      case 'get_all_clients':
        return await this.getAllClients(input);

      // Tags
      case 'create_tag':
        return await this.createTag(input);
      case 'get_all_tags':
        return await this.getAllTags(input);

      // Tasks
      case 'create_task':
        return await this.createTask(input);
      case 'get_all_tasks':
        return await this.getAllTasks(input);

      // Users
      case 'get_all_users':
        return await this.getAllUsers(input);

      default:
        throw new Error(`Unknown action: ${actionId}`);
    }
  }

  protected async cleanup(): Promise<void> {
    this.logger.log('Clockify connector cleanup completed');
  }

  private getAuthHeaders(): Record<string, string> {
    return {
      'Content-Type': 'application/json',
      'X-Api-Key': this.config.credentials.apiKey,
    };
  }

  private getActions(): ConnectorAction[] {
    return [
      // Workspace Actions
      {
        id: 'get_all_workspaces',
        name: 'Get All Workspaces',
        description: 'Get all workspaces for the user',
        inputSchema: {},
        outputSchema: { workspaces: { type: 'array' } },
      },
      // Time Entry Actions
      {
        id: 'create_time_entry',
        name: 'Create Time Entry',
        description: 'Create a new time entry',
        inputSchema: {
          workspaceId: { type: 'string', required: true },
          start: { type: 'string', required: true },
          description: { type: 'string', required: false },
          projectId: { type: 'string', required: false },
          taskId: { type: 'string', required: false },
          billable: { type: 'boolean', required: false },
          tagIds: { type: 'array', required: false },
          end: { type: 'string', required: false },
        },
        outputSchema: { id: { type: 'string' }, description: { type: 'string' }, start: { type: 'string' } },
      },
      {
        id: 'get_time_entry',
        name: 'Get Time Entry',
        description: 'Get a specific time entry',
        inputSchema: {
          workspaceId: { type: 'string', required: true },
          timeEntryId: { type: 'string', required: true },
        },
        outputSchema: { timeEntry: { type: 'object' } },
      },
      {
        id: 'update_time_entry',
        name: 'Update Time Entry',
        description: 'Update an existing time entry',
        inputSchema: {
          workspaceId: { type: 'string', required: true },
          timeEntryId: { type: 'string', required: true },
          start: { type: 'string', required: true },
          description: { type: 'string', required: false },
          end: { type: 'string', required: false },
          billable: { type: 'boolean', required: false },
        },
        outputSchema: { timeEntry: { type: 'object' } },
      },
      {
        id: 'delete_time_entry',
        name: 'Delete Time Entry',
        description: 'Delete a time entry',
        inputSchema: {
          workspaceId: { type: 'string', required: true },
          timeEntryId: { type: 'string', required: true },
        },
        outputSchema: { success: { type: 'boolean' } },
      },
      // Project Actions
      {
        id: 'create_project',
        name: 'Create Project',
        description: 'Create a new project',
        inputSchema: {
          workspaceId: { type: 'string', required: true },
          name: { type: 'string', required: true },
          clientId: { type: 'string', required: false },
          isPublic: { type: 'boolean', required: false },
          billable: { type: 'boolean', required: false },
          color: { type: 'string', required: false },
        },
        outputSchema: { id: { type: 'string' }, name: { type: 'string' } },
      },
      {
        id: 'get_project',
        name: 'Get Project',
        description: 'Get a specific project',
        inputSchema: {
          workspaceId: { type: 'string', required: true },
          projectId: { type: 'string', required: true },
        },
        outputSchema: { project: { type: 'object' } },
      },
      {
        id: 'get_all_projects',
        name: 'Get All Projects',
        description: 'Get all projects in a workspace',
        inputSchema: {
          workspaceId: { type: 'string', required: true },
        },
        outputSchema: { projects: { type: 'array' } },
      },
      {
        id: 'update_project',
        name: 'Update Project',
        description: 'Update an existing project',
        inputSchema: {
          workspaceId: { type: 'string', required: true },
          projectId: { type: 'string', required: true },
          name: { type: 'string', required: false },
          color: { type: 'string', required: false },
        },
        outputSchema: { project: { type: 'object' } },
      },
      {
        id: 'delete_project',
        name: 'Delete Project',
        description: 'Delete a project',
        inputSchema: {
          workspaceId: { type: 'string', required: true },
          projectId: { type: 'string', required: true },
        },
        outputSchema: { success: { type: 'boolean' } },
      },
      // Client Actions
      {
        id: 'create_client',
        name: 'Create Client',
        description: 'Create a new client',
        inputSchema: {
          workspaceId: { type: 'string', required: true },
          name: { type: 'string', required: true },
        },
        outputSchema: { id: { type: 'string' }, name: { type: 'string' } },
      },
      {
        id: 'get_all_clients',
        name: 'Get All Clients',
        description: 'Get all clients in a workspace',
        inputSchema: {
          workspaceId: { type: 'string', required: true },
        },
        outputSchema: { clients: { type: 'array' } },
      },
      // Tag Actions
      {
        id: 'create_tag',
        name: 'Create Tag',
        description: 'Create a new tag',
        inputSchema: {
          workspaceId: { type: 'string', required: true },
          name: { type: 'string', required: true },
        },
        outputSchema: { id: { type: 'string' }, name: { type: 'string' } },
      },
      {
        id: 'get_all_tags',
        name: 'Get All Tags',
        description: 'Get all tags in a workspace',
        inputSchema: {
          workspaceId: { type: 'string', required: true },
        },
        outputSchema: { tags: { type: 'array' } },
      },
      // Task Actions
      {
        id: 'create_task',
        name: 'Create Task',
        description: 'Create a new task in a project',
        inputSchema: {
          workspaceId: { type: 'string', required: true },
          projectId: { type: 'string', required: true },
          name: { type: 'string', required: true },
          assigneeId: { type: 'string', required: false },
          estimate: { type: 'string', required: false },
        },
        outputSchema: { id: { type: 'string' }, name: { type: 'string' } },
      },
      {
        id: 'get_all_tasks',
        name: 'Get All Tasks',
        description: 'Get all tasks in a project',
        inputSchema: {
          workspaceId: { type: 'string', required: true },
          projectId: { type: 'string', required: true },
        },
        outputSchema: { tasks: { type: 'array' } },
      },
      // User Actions
      {
        id: 'get_all_users',
        name: 'Get All Users',
        description: 'Get all users in a workspace',
        inputSchema: {
          workspaceId: { type: 'string', required: true },
        },
        outputSchema: { users: { type: 'array' } },
      },
    ];
  }

  private getTriggers(): ConnectorTrigger[] {
    return [
      {
        id: 'new_time_entry',
        name: 'New Time Entry',
        description: 'Triggers when a new time entry is created',
        eventType: 'time_entry.created',
        pollingEnabled: true,
        webhookRequired: false,
        inputSchema: {
          workspaceId: { type: 'string', required: true },
          pollingInterval: { type: 'string', required: false },
        },
        outputSchema: {
          id: { type: 'string' },
          description: { type: 'string' },
          userId: { type: 'string' },
          workspaceId: { type: 'string' },
          projectId: { type: 'string' },
          taskId: { type: 'string' },
          billable: { type: 'boolean' },
          timeInterval: { type: 'object' },
          tags: { type: 'array' },
        },
      },
    ];
  }

  // Workspace Methods
  private async getAllWorkspaces(): Promise<any> {
    return await this.performRequest({
      method: 'GET',
      endpoint: '/workspaces',
      headers: this.getAuthHeaders(),
    });
  }

  // Time Entry Methods
  private async createTimeEntry(data: any): Promise<any> {
    const { workspaceId, ...timeEntryData } = data;

    return await this.performRequest({
      method: 'POST',
      endpoint: `/workspaces/${workspaceId}/time-entries`,
      headers: this.getAuthHeaders(),
      body: timeEntryData,
    });
  }

  private async getTimeEntry(data: any): Promise<any> {
    const { workspaceId, timeEntryId } = data;

    return await this.performRequest({
      method: 'GET',
      endpoint: `/workspaces/${workspaceId}/time-entries/${timeEntryId}`,
      headers: this.getAuthHeaders(),
    });
  }

  private async updateTimeEntry(data: any): Promise<any> {
    const { workspaceId, timeEntryId, ...updateData } = data;

    return await this.performRequest({
      method: 'PUT',
      endpoint: `/workspaces/${workspaceId}/time-entries/${timeEntryId}`,
      headers: this.getAuthHeaders(),
      body: updateData,
    });
  }

  private async deleteTimeEntry(data: any): Promise<any> {
    const { workspaceId, timeEntryId } = data;

    await this.performRequest({
      method: 'DELETE',
      endpoint: `/workspaces/${workspaceId}/time-entries/${timeEntryId}`,
      headers: this.getAuthHeaders(),
    });

    return { success: true };
  }

  // Project Methods
  private async createProject(data: any): Promise<any> {
    const { workspaceId, ...projectData } = data;

    return await this.performRequest({
      method: 'POST',
      endpoint: `/workspaces/${workspaceId}/projects`,
      headers: this.getAuthHeaders(),
      body: projectData,
    });
  }

  private async getProject(data: any): Promise<any> {
    const { workspaceId, projectId } = data;

    return await this.performRequest({
      method: 'GET',
      endpoint: `/workspaces/${workspaceId}/projects/${projectId}`,
      headers: this.getAuthHeaders(),
    });
  }

  private async getAllProjects(data: any): Promise<any> {
    const { workspaceId } = data;

    return await this.performRequest({
      method: 'GET',
      endpoint: `/workspaces/${workspaceId}/projects`,
      headers: this.getAuthHeaders(),
    });
  }

  private async updateProject(data: any): Promise<any> {
    const { workspaceId, projectId, ...updateData } = data;

    return await this.performRequest({
      method: 'PUT',
      endpoint: `/workspaces/${workspaceId}/projects/${projectId}`,
      headers: this.getAuthHeaders(),
      body: updateData,
    });
  }

  private async deleteProject(data: any): Promise<any> {
    const { workspaceId, projectId } = data;

    await this.performRequest({
      method: 'DELETE',
      endpoint: `/workspaces/${workspaceId}/projects/${projectId}`,
      headers: this.getAuthHeaders(),
    });

    return { success: true };
  }

  // Client Methods
  private async createClient(data: any): Promise<any> {
    const { workspaceId, ...clientData } = data;

    return await this.performRequest({
      method: 'POST',
      endpoint: `/workspaces/${workspaceId}/clients`,
      headers: this.getAuthHeaders(),
      body: clientData,
    });
  }

  private async getAllClients(data: any): Promise<any> {
    const { workspaceId } = data;

    return await this.performRequest({
      method: 'GET',
      endpoint: `/workspaces/${workspaceId}/clients`,
      headers: this.getAuthHeaders(),
    });
  }

  // Tag Methods
  private async createTag(data: any): Promise<any> {
    const { workspaceId, ...tagData } = data;

    return await this.performRequest({
      method: 'POST',
      endpoint: `/workspaces/${workspaceId}/tags`,
      headers: this.getAuthHeaders(),
      body: tagData,
    });
  }

  private async getAllTags(data: any): Promise<any> {
    const { workspaceId } = data;

    return await this.performRequest({
      method: 'GET',
      endpoint: `/workspaces/${workspaceId}/tags`,
      headers: this.getAuthHeaders(),
    });
  }

  // Task Methods
  private async createTask(data: any): Promise<any> {
    const { workspaceId, projectId, ...taskData } = data;

    return await this.performRequest({
      method: 'POST',
      endpoint: `/workspaces/${workspaceId}/projects/${projectId}/tasks`,
      headers: this.getAuthHeaders(),
      body: taskData,
    });
  }

  private async getAllTasks(data: any): Promise<any> {
    const { workspaceId, projectId } = data;

    return await this.performRequest({
      method: 'GET',
      endpoint: `/workspaces/${workspaceId}/projects/${projectId}/tasks`,
      headers: this.getAuthHeaders(),
    });
  }

  // User Methods
  private async getAllUsers(data: any): Promise<any> {
    const { workspaceId } = data;

    return await this.performRequest({
      method: 'GET',
      endpoint: `/workspaces/${workspaceId}/users`,
      headers: this.getAuthHeaders(),
    });
  }
}
