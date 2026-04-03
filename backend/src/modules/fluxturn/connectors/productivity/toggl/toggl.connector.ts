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
export class TogglConnector extends BaseConnector {
  private readonly baseUrl = 'https://api.track.toggl.com/api/v9';

  constructor(
    private readonly authUtils: AuthUtils,
    private readonly apiUtils: ApiUtils,
  ) {
    super();
  }

  getMetadata(): ConnectorMetadata {
    return {
      name: 'Toggl Track',
      description: 'Time tracking tool for individuals and teams to track work hours and projects',
      version: '1.0.0',
      category: ConnectorCategory.PRODUCTIVITY,
      type: ConnectorType.TOGGL,
      authType: AuthType.API_KEY,
      actions: this.getActions(),
      triggers: this.getTriggers(),
      webhookSupport: false,
    };
  }

  protected async initializeConnection(): Promise<void> {
    if (!this.config.credentials?.apiToken) {
      throw new Error('API token is required');
    }
    this.logger.log('Toggl connector initialized');
  }

  protected async performConnectionTest(): Promise<boolean> {
    try {
      const response = await this.performRequest({
        method: 'GET',
        endpoint: '/me',
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
      // Time Entry Actions
      case 'create_time_entry':
        return await this.createTimeEntry(input);
      case 'get_time_entry':
        return await this.getTimeEntry(input);
      case 'update_time_entry':
        return await this.updateTimeEntry(input);
      case 'delete_time_entry':
        return await this.deleteTimeEntry(input);
      case 'stop_time_entry':
        return await this.stopTimeEntry(input);

      // Project Actions
      case 'create_project':
        return await this.createProject(input);
      case 'get_project':
        return await this.getProject(input);
      case 'get_all_projects':
        return await this.getAllProjects(input);

      // Workspace Actions
      case 'get_all_workspaces':
        return await this.getAllWorkspaces();

      default:
        throw new Error(`Unknown action: ${actionId}`);
    }
  }

  protected async cleanup(): Promise<void> {
    this.logger.log('Toggl connector cleanup completed');
  }

  private getAuthHeaders(): Record<string, string> {
    // Toggl uses Basic auth with {apiToken}:api_token format
    const apiToken = this.config.credentials.apiToken;
    const basicAuth = Buffer.from(`${apiToken}:api_token`).toString('base64');

    return {
      'Content-Type': 'application/json',
      'Authorization': `Basic ${basicAuth}`,
    };
  }

  private getActions(): ConnectorAction[] {
    return [
      // Time Entry Actions
      {
        id: 'create_time_entry',
        name: 'Create Time Entry',
        description: 'Create a new time entry',
        inputSchema: {
          workspaceId: { type: 'number', required: true },
          description: { type: 'string', required: false },
          start: { type: 'string', required: true },
          duration: { type: 'number', required: true },
          projectId: { type: 'number', required: false },
          taskId: { type: 'number', required: false },
          billable: { type: 'boolean', required: false },
          tags: { type: 'array', required: false },
        },
        outputSchema: {
          id: { type: 'number' },
          description: { type: 'string' },
          start: { type: 'string' },
          stop: { type: 'string' },
          duration: { type: 'number' },
          project_id: { type: 'number' },
          billable: { type: 'boolean' },
        },
      },
      {
        id: 'get_time_entry',
        name: 'Get Time Entry',
        description: 'Get a specific time entry',
        inputSchema: {
          timeEntryId: { type: 'number', required: true },
        },
        outputSchema: {
          timeEntry: { type: 'object' },
        },
      },
      {
        id: 'update_time_entry',
        name: 'Update Time Entry',
        description: 'Update an existing time entry',
        inputSchema: {
          workspaceId: { type: 'number', required: true },
          timeEntryId: { type: 'number', required: true },
          description: { type: 'string', required: false },
          start: { type: 'string', required: false },
          duration: { type: 'number', required: false },
          billable: { type: 'boolean', required: false },
          tags: { type: 'array', required: false },
        },
        outputSchema: {
          timeEntry: { type: 'object' },
        },
      },
      {
        id: 'delete_time_entry',
        name: 'Delete Time Entry',
        description: 'Delete a time entry',
        inputSchema: {
          workspaceId: { type: 'number', required: true },
          timeEntryId: { type: 'number', required: true },
        },
        outputSchema: {
          success: { type: 'boolean' },
        },
      },
      {
        id: 'stop_time_entry',
        name: 'Stop Time Entry',
        description: 'Stop a running time entry',
        inputSchema: {
          workspaceId: { type: 'number', required: true },
          timeEntryId: { type: 'number', required: true },
        },
        outputSchema: {
          timeEntry: { type: 'object' },
        },
      },
      // Project Actions
      {
        id: 'create_project',
        name: 'Create Project',
        description: 'Create a new project',
        inputSchema: {
          workspaceId: { type: 'number', required: true },
          name: { type: 'string', required: true },
          isPrivate: { type: 'boolean', required: false },
          clientId: { type: 'number', required: false },
          active: { type: 'boolean', required: false },
          color: { type: 'string', required: false },
        },
        outputSchema: {
          id: { type: 'number' },
          name: { type: 'string' },
          workspace_id: { type: 'number' },
          active: { type: 'boolean' },
          color: { type: 'string' },
        },
      },
      {
        id: 'get_project',
        name: 'Get Project',
        description: 'Get a specific project',
        inputSchema: {
          workspaceId: { type: 'number', required: true },
          projectId: { type: 'number', required: true },
        },
        outputSchema: {
          project: { type: 'object' },
        },
      },
      {
        id: 'get_all_projects',
        name: 'Get All Projects',
        description: 'Get all projects in a workspace',
        inputSchema: {
          workspaceId: { type: 'number', required: true },
        },
        outputSchema: {
          projects: { type: 'array' },
        },
      },
      // Workspace Actions
      {
        id: 'get_all_workspaces',
        name: 'Get All Workspaces',
        description: 'Get all workspaces for the user',
        inputSchema: {},
        outputSchema: {
          workspaces: { type: 'array' },
        },
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
          pollingInterval: { type: 'string', required: false },
        },
        outputSchema: {
          id: { type: 'number' },
          description: { type: 'string' },
          start: { type: 'string' },
          stop: { type: 'string' },
          duration: { type: 'number' },
          workspace_id: { type: 'number' },
          project_id: { type: 'number' },
          task_id: { type: 'number' },
          billable: { type: 'boolean' },
          tags: { type: 'array' },
          at: { type: 'string' },
        },
      },
    ];
  }

  // Time Entry Methods
  private async createTimeEntry(data: any): Promise<any> {
    const { workspaceId, ...timeEntryData } = data;

    const body: any = {
      description: timeEntryData.description || '',
      start: timeEntryData.start,
      duration: timeEntryData.duration,
      workspace_id: workspaceId,
      created_with: 'Fluxturn App',
    };

    if (timeEntryData.projectId) body.project_id = timeEntryData.projectId;
    if (timeEntryData.taskId) body.task_id = timeEntryData.taskId;
    if (timeEntryData.billable !== undefined) body.billable = timeEntryData.billable;
    if (timeEntryData.tags) body.tags = timeEntryData.tags;

    return await this.performRequest({
      method: 'POST',
      endpoint: `/workspaces/${workspaceId}/time_entries`,
      headers: this.getAuthHeaders(),
      body,
    });
  }

  private async getTimeEntry(data: any): Promise<any> {
    const { timeEntryId } = data;

    return await this.performRequest({
      method: 'GET',
      endpoint: `/me/time_entries/${timeEntryId}`,
      headers: this.getAuthHeaders(),
    });
  }

  private async updateTimeEntry(data: any): Promise<any> {
    const { workspaceId, timeEntryId, ...updateData } = data;

    const body: any = {};
    if (updateData.description !== undefined) body.description = updateData.description;
    if (updateData.start) body.start = updateData.start;
    if (updateData.duration !== undefined) body.duration = updateData.duration;
    if (updateData.billable !== undefined) body.billable = updateData.billable;
    if (updateData.tags) body.tags = updateData.tags;

    return await this.performRequest({
      method: 'PUT',
      endpoint: `/workspaces/${workspaceId}/time_entries/${timeEntryId}`,
      headers: this.getAuthHeaders(),
      body,
    });
  }

  private async deleteTimeEntry(data: any): Promise<any> {
    const { workspaceId, timeEntryId } = data;

    await this.performRequest({
      method: 'DELETE',
      endpoint: `/workspaces/${workspaceId}/time_entries/${timeEntryId}`,
      headers: this.getAuthHeaders(),
    });

    return { success: true };
  }

  private async stopTimeEntry(data: any): Promise<any> {
    const { workspaceId, timeEntryId } = data;

    return await this.performRequest({
      method: 'PATCH',
      endpoint: `/workspaces/${workspaceId}/time_entries/${timeEntryId}/stop`,
      headers: this.getAuthHeaders(),
    });
  }

  // Project Methods
  private async createProject(data: any): Promise<any> {
    const { workspaceId, ...projectData } = data;

    const body: any = {
      name: projectData.name,
    };

    if (projectData.isPrivate !== undefined) body.is_private = projectData.isPrivate;
    if (projectData.clientId) body.client_id = projectData.clientId;
    if (projectData.active !== undefined) body.active = projectData.active;
    if (projectData.color) body.color = projectData.color;

    return await this.performRequest({
      method: 'POST',
      endpoint: `/workspaces/${workspaceId}/projects`,
      headers: this.getAuthHeaders(),
      body,
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

  // Workspace Methods
  private async getAllWorkspaces(): Promise<any> {
    return await this.performRequest({
      method: 'GET',
      endpoint: '/me/workspaces',
      headers: this.getAuthHeaders(),
    });
  }
}
