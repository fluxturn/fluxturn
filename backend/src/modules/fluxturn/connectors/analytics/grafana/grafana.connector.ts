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
export class GrafanaConnector extends BaseConnector {
  protected readonly logger = new Logger(GrafanaConnector.name);
  private baseUrl: string;

  constructor(
    private readonly authUtils: AuthUtils,
    private readonly apiUtils: ApiUtils,
  ) {
    super();
  }

  getMetadata(): ConnectorMetadata {
    return {
      name: 'Grafana',
      description: 'Open source analytics and monitoring platform',
      version: '1.0.0',
      category: ConnectorCategory.ANALYTICS,
      type: ConnectorType.GRAFANA,
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
    if (!this.config.credentials?.baseUrl) {
      throw new Error('Base URL is required');
    }

    // Remove trailing slash if present
    this.baseUrl = this.config.credentials.baseUrl.endsWith('/')
      ? this.config.credentials.baseUrl.slice(0, -1)
      : this.config.credentials.baseUrl;

    this.logger.log('Grafana connector initialized');
  }

  protected async performConnectionTest(): Promise<boolean> {
    try {
      const response = await this.performRequest({
        method: 'GET',
        endpoint: '/api/org',
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
      // Dashboard operations
      case 'create_dashboard':
        return await this.createDashboard(input);
      case 'get_dashboard':
        return await this.getDashboard(input);
      case 'get_all_dashboards':
        return await this.getAllDashboards(input);
      case 'update_dashboard':
        return await this.updateDashboard(input);
      case 'delete_dashboard':
        return await this.deleteDashboard(input);

      // Team operations
      case 'create_team':
        return await this.createTeam(input);
      case 'get_team':
        return await this.getTeam(input);
      case 'get_all_teams':
        return await this.getAllTeams(input);
      case 'update_team':
        return await this.updateTeam(input);
      case 'delete_team':
        return await this.deleteTeam(input);

      // Team member operations
      case 'add_team_member':
        return await this.addTeamMember(input);
      case 'remove_team_member':
        return await this.removeTeamMember(input);
      case 'get_all_team_members':
        return await this.getAllTeamMembers(input);

      // User operations
      case 'get_all_users':
        return await this.getAllUsers(input);
      case 'update_user':
        return await this.updateUser(input);
      case 'delete_user':
        return await this.deleteUser(input);

      default:
        throw new Error(`Unknown action: ${actionId}`);
    }
  }

  protected async cleanup(): Promise<void> {
    this.logger.log('Grafana connector cleanup completed');
  }

  private getAuthHeaders(): Record<string, string> {
    return {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${this.config.credentials.apiKey}`,
    };
  }

  private getActions(): ConnectorAction[] {
    return [
      // Dashboard actions
      {
        id: 'create_dashboard',
        name: 'Create Dashboard',
        description: 'Create a new dashboard',
        inputSchema: {
          title: { type: 'string', required: true },
          folderId: { type: 'string', required: false },
        },
        outputSchema: {
          id: { type: 'number' },
          uid: { type: 'string' },
          url: { type: 'string' },
          status: { type: 'string' },
          version: { type: 'number' },
        },
      },
      {
        id: 'get_dashboard',
        name: 'Get Dashboard',
        description: 'Get a dashboard by UID or URL',
        inputSchema: {
          dashboardUidOrUrl: { type: 'string', required: true },
        },
        outputSchema: {
          dashboard: { type: 'object' },
          meta: { type: 'object' },
        },
      },
      {
        id: 'get_all_dashboards',
        name: 'Get All Dashboards',
        description: 'Get all dashboards with optional filters',
        inputSchema: {
          returnAll: { type: 'boolean', required: false },
          limit: { type: 'number', required: false },
          query: { type: 'string', required: false },
        },
        outputSchema: {
          dashboards: { type: 'array' },
        },
      },
      {
        id: 'update_dashboard',
        name: 'Update Dashboard',
        description: 'Update an existing dashboard',
        inputSchema: {
          dashboardUidOrUrl: { type: 'string', required: true },
          title: { type: 'string', required: false },
          folderId: { type: 'string', required: false },
        },
        outputSchema: {
          id: { type: 'number' },
          uid: { type: 'string' },
          url: { type: 'string' },
          status: { type: 'string' },
          version: { type: 'number' },
        },
      },
      {
        id: 'delete_dashboard',
        name: 'Delete Dashboard',
        description: 'Delete a dashboard by UID or URL',
        inputSchema: {
          dashboardUidOrUrl: { type: 'string', required: true },
        },
        outputSchema: {
          title: { type: 'string' },
          message: { type: 'string' },
        },
      },

      // Team actions
      {
        id: 'create_team',
        name: 'Create Team',
        description: 'Create a new team',
        inputSchema: {
          name: { type: 'string', required: true },
          email: { type: 'string', required: false },
        },
        outputSchema: {
          teamId: { type: 'number' },
          message: { type: 'string' },
        },
      },
      {
        id: 'get_team',
        name: 'Get Team',
        description: 'Get a team by ID',
        inputSchema: {
          teamId: { type: 'string', required: true },
        },
        outputSchema: {
          id: { type: 'number' },
          name: { type: 'string' },
          email: { type: 'string' },
          orgId: { type: 'number' },
          memberCount: { type: 'number' },
        },
      },
      {
        id: 'get_all_teams',
        name: 'Get All Teams',
        description: 'Get all teams with optional filters',
        inputSchema: {
          returnAll: { type: 'boolean', required: false },
          limit: { type: 'number', required: false },
          name: { type: 'string', required: false },
        },
        outputSchema: {
          teams: { type: 'array' },
        },
      },
      {
        id: 'update_team',
        name: 'Update Team',
        description: 'Update an existing team',
        inputSchema: {
          teamId: { type: 'string', required: true },
          name: { type: 'string', required: false },
          email: { type: 'string', required: false },
        },
        outputSchema: {
          message: { type: 'string' },
        },
      },
      {
        id: 'delete_team',
        name: 'Delete Team',
        description: 'Delete a team by ID',
        inputSchema: {
          teamId: { type: 'string', required: true },
        },
        outputSchema: {
          message: { type: 'string' },
        },
      },

      // Team member actions
      {
        id: 'add_team_member',
        name: 'Add Team Member',
        description: 'Add a user to a team',
        inputSchema: {
          teamId: { type: 'string', required: true },
          userId: { type: 'string', required: true },
        },
        outputSchema: {
          message: { type: 'string' },
        },
      },
      {
        id: 'remove_team_member',
        name: 'Remove Team Member',
        description: 'Remove a user from a team',
        inputSchema: {
          teamId: { type: 'string', required: true },
          memberId: { type: 'string', required: true },
        },
        outputSchema: {
          message: { type: 'string' },
        },
      },
      {
        id: 'get_all_team_members',
        name: 'Get All Team Members',
        description: 'Get all members of a team',
        inputSchema: {
          teamId: { type: 'string', required: true },
          returnAll: { type: 'boolean', required: false },
          limit: { type: 'number', required: false },
        },
        outputSchema: {
          members: { type: 'array' },
        },
      },

      // User actions
      {
        id: 'get_all_users',
        name: 'Get All Users',
        description: 'Get all users in the current organization',
        inputSchema: {
          returnAll: { type: 'boolean', required: false },
          limit: { type: 'number', required: false },
        },
        outputSchema: {
          users: { type: 'array' },
        },
      },
      {
        id: 'update_user',
        name: 'Update User',
        description: 'Update a user in the current organization',
        inputSchema: {
          userId: { type: 'string', required: true },
          role: { type: 'string', required: false },
        },
        outputSchema: {
          message: { type: 'string' },
        },
      },
      {
        id: 'delete_user',
        name: 'Delete User',
        description: 'Delete a user from the current organization',
        inputSchema: {
          userId: { type: 'string', required: true },
        },
        outputSchema: {
          message: { type: 'string' },
        },
      },
    ];
  }

  private getTriggers(): ConnectorTrigger[] {
    return [];
  }

  // Dashboard methods
  private async createDashboard(data: any): Promise<any> {
    const body: any = {
      dashboard: {
        id: null,
        title: data.title,
      },
    };

    if (data.folderId !== undefined && data.folderId !== '') {
      body.folderId = data.folderId;
    }

    return await this.performRequest({
      method: 'POST',
      endpoint: '/api/dashboards/db',
      headers: this.getAuthHeaders(),
      body,
    });
  }

  private async getDashboard(data: any): Promise<any> {
    const uid = this.deriveUid(data.dashboardUidOrUrl);

    return await this.performRequest({
      method: 'GET',
      endpoint: `/api/dashboards/uid/${uid}`,
      headers: this.getAuthHeaders(),
    });
  }

  private async getAllDashboards(data: any): Promise<any> {
    const queryParams: any = {
      type: 'dash-db',
    };

    if (data.query) {
      queryParams.query = data.query;
    }

    if (!data.returnAll && data.limit) {
      queryParams.limit = data.limit;
    }

    return await this.performRequest({
      method: 'GET',
      endpoint: '/api/search',
      headers: this.getAuthHeaders(),
      queryParams,
    });
  }

  private async updateDashboard(data: any): Promise<any> {
    const uid = this.deriveUid(data.dashboardUidOrUrl);

    // Ensure dashboard exists
    const existing = await this.performRequest({
      method: 'GET',
      endpoint: `/api/dashboards/uid/${uid}`,
      headers: this.getAuthHeaders(),
    });

    const body: any = {
      overwrite: true,
      dashboard: {
        uid,
        title: data.title || existing.dashboard.title,
      },
    };

    if (data.folderId !== undefined && data.folderId !== '') {
      body.folderId = data.folderId;
    }

    return await this.performRequest({
      method: 'POST',
      endpoint: '/api/dashboards/db',
      headers: this.getAuthHeaders(),
      body,
    });
  }

  private async deleteDashboard(data: any): Promise<any> {
    const uid = this.deriveUid(data.dashboardUidOrUrl);

    return await this.performRequest({
      method: 'DELETE',
      endpoint: `/api/dashboards/uid/${uid}`,
      headers: this.getAuthHeaders(),
    });
  }

  // Team methods
  private async createTeam(data: any): Promise<any> {
    const body: any = {
      name: data.name,
    };

    if (data.email) {
      body.email = data.email;
    }

    return await this.performRequest({
      method: 'POST',
      endpoint: '/api/teams',
      headers: this.getAuthHeaders(),
      body,
    });
  }

  private async getTeam(data: any): Promise<any> {
    return await this.performRequest({
      method: 'GET',
      endpoint: `/api/teams/${data.teamId}`,
      headers: this.getAuthHeaders(),
    });
  }

  private async getAllTeams(data: any): Promise<any> {
    const queryParams: any = {};

    if (data.name) {
      queryParams.name = data.name;
    }

    const response = await this.performRequest({
      method: 'GET',
      endpoint: '/api/teams/search',
      headers: this.getAuthHeaders(),
      queryParams,
    });

    let teams = response.teams || [];

    if (!data.returnAll && data.limit) {
      teams = teams.slice(0, data.limit);
    }

    return { teams };
  }

  private async updateTeam(data: any): Promise<any> {
    // Check if team exists
    const existing = await this.performRequest({
      method: 'GET',
      endpoint: `/api/teams/${data.teamId}`,
      headers: this.getAuthHeaders(),
    });

    const body: any = {
      email: data.email || existing.email,
    };

    if (data.name) {
      body.name = data.name;
    }

    return await this.performRequest({
      method: 'PUT',
      endpoint: `/api/teams/${data.teamId}`,
      headers: this.getAuthHeaders(),
      body,
    });
  }

  private async deleteTeam(data: any): Promise<any> {
    return await this.performRequest({
      method: 'DELETE',
      endpoint: `/api/teams/${data.teamId}`,
      headers: this.getAuthHeaders(),
    });
  }

  // Team member methods
  private async addTeamMember(data: any): Promise<any> {
    const body = {
      userId: parseInt(data.userId, 10),
    };

    return await this.performRequest({
      method: 'POST',
      endpoint: `/api/teams/${data.teamId}/members`,
      headers: this.getAuthHeaders(),
      body,
    });
  }

  private async removeTeamMember(data: any): Promise<any> {
    return await this.performRequest({
      method: 'DELETE',
      endpoint: `/api/teams/${data.teamId}/members/${data.memberId}`,
      headers: this.getAuthHeaders(),
    });
  }

  private async getAllTeamMembers(data: any): Promise<any> {
    // Check if team exists
    await this.performRequest({
      method: 'GET',
      endpoint: `/api/teams/${data.teamId}`,
      headers: this.getAuthHeaders(),
    });

    let members = await this.performRequest({
      method: 'GET',
      endpoint: `/api/teams/${data.teamId}/members`,
      headers: this.getAuthHeaders(),
    });

    if (!data.returnAll && data.limit) {
      members = members.slice(0, data.limit);
    }

    return members;
  }

  // User methods
  private async getAllUsers(data: any): Promise<any> {
    let users = await this.performRequest({
      method: 'GET',
      endpoint: '/api/org/users',
      headers: this.getAuthHeaders(),
    });

    if (!data.returnAll && data.limit) {
      users = users.slice(0, data.limit);
    }

    return users;
  }

  private async updateUser(data: any): Promise<any> {
    const body: any = {};

    if (data.role) {
      body.role = data.role;
    }

    return await this.performRequest({
      method: 'PATCH',
      endpoint: `/api/org/users/${data.userId}`,
      headers: this.getAuthHeaders(),
      body,
    });
  }

  private async deleteUser(data: any): Promise<any> {
    return await this.performRequest({
      method: 'DELETE',
      endpoint: `/api/org/users/${data.userId}`,
      headers: this.getAuthHeaders(),
    });
  }

  // Helper methods
  private deriveUid(uidOrUrl: string): string {
    if (!uidOrUrl.startsWith('http')) {
      return uidOrUrl;
    }

    const urlSegments = uidOrUrl.split('/');
    const dIndex = urlSegments.indexOf('d');

    if (dIndex === -1 || dIndex === urlSegments.length - 1) {
      throw new Error('Failed to derive UID from URL');
    }

    const uid = urlSegments[dIndex + 1];

    if (!uid) {
      throw new Error('Failed to derive UID from URL');
    }

    return uid;
  }

  // IAnalyticsConnector interface implementation
  async trackEvent(event: any): Promise<ConnectorResponse> {
    throw new Error('Track event not supported by Grafana connector');
  }

  async trackPageView(pageView: any): Promise<ConnectorResponse> {
    throw new Error('Track page view not supported by Grafana connector');
  }

  async identifyUser(user: any): Promise<ConnectorResponse> {
    throw new Error('Identify user not supported by Grafana connector');
  }

  async getAnalytics(query: any): Promise<ConnectorResponse> {
    throw new Error('Get analytics not supported by Grafana connector');
  }
}
