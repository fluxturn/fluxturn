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
export class SentryIoConnector extends BaseConnector {
  private readonly baseUrl = 'https://sentry.io';

  constructor(
    private readonly authUtils: AuthUtils,
    private readonly apiUtils: ApiUtils,
  ) {
    super();
  }

  getMetadata(): ConnectorMetadata {
    return {
      name: 'sentry_io',
      description: 'Error tracking and performance monitoring platform',
      version: '1.0.0',
      category: ConnectorCategory.SUPPORT,
      type: ConnectorType.SENTRY_IO,
      authType: AuthType.BEARER_TOKEN,
      actions: this.getActions(),
      triggers: this.getTriggers(),
      webhookSupport: false,
    };
  }

  protected async initializeConnection(): Promise<void> {
    if (!this.config.credentials?.token) {
      throw new Error('Access token is required');
    }
    this.logger.log('Sentry.io connector initialized');
  }

  protected async performConnectionTest(): Promise<boolean> {
    try {
      const response = await this.performRequest({
        method: 'GET',
        endpoint: '/api/0/organizations/',
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
    const url = request.endpoint.startsWith('http')
      ? request.endpoint
      : `${this.baseUrl}${request.endpoint}`;

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
      // Event operations
      case 'get_event':
        return await this.getEvent(input);
      case 'get_all_events':
        return await this.getAllEvents(input);

      // Issue operations
      case 'get_issue':
        return await this.getIssue(input);
      case 'get_all_issues':
        return await this.getAllIssues(input);
      case 'update_issue':
        return await this.updateIssue(input);
      case 'delete_issue':
        return await this.deleteIssue(input);

      // Organization operations
      case 'get_organization':
        return await this.getOrganization(input);
      case 'get_all_organizations':
        return await this.getAllOrganizations(input);
      case 'create_organization':
        return await this.createOrganization(input);
      case 'update_organization':
        return await this.updateOrganization(input);

      // Project operations
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

      // Release operations
      case 'create_release':
        return await this.createRelease(input);
      case 'get_release':
        return await this.getRelease(input);
      case 'get_all_releases':
        return await this.getAllReleases(input);
      case 'update_release':
        return await this.updateRelease(input);
      case 'delete_release':
        return await this.deleteRelease(input);

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

      default:
        throw new Error(`Unknown action: ${actionId}`);
    }
  }

  protected async cleanup(): Promise<void> {
    this.logger.log('Sentry.io connector cleanup completed');
  }

  private getAuthHeaders(): Record<string, string> {
    return {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${this.config.credentials.token}`,
    };
  }

  private getActions(): ConnectorAction[] {
    return [
      // Event actions
      {
        id: 'get_event',
        name: 'Get Event',
        description: 'Get an event by ID',
        inputSchema: {
          organizationSlug: { type: 'string', required: true },
          projectSlug: { type: 'string', required: true },
          eventId: { type: 'string', required: true },
        },
        outputSchema: { event: { type: 'object' } },
      },
      {
        id: 'get_all_events',
        name: 'Get All Events',
        description: 'Get all events for a project',
        inputSchema: {
          organizationSlug: { type: 'string', required: true },
          projectSlug: { type: 'string', required: true },
          full: { type: 'boolean', required: false },
          limit: { type: 'number', required: false },
        },
        outputSchema: { events: { type: 'array' } },
      },

      // Issue actions
      {
        id: 'get_issue',
        name: 'Get Issue',
        description: 'Get an issue by ID',
        inputSchema: {
          issueId: { type: 'string', required: true },
        },
        outputSchema: { issue: { type: 'object' } },
      },
      {
        id: 'get_all_issues',
        name: 'Get All Issues',
        description: 'Get all issues for a project',
        inputSchema: {
          organizationSlug: { type: 'string', required: true },
          projectSlug: { type: 'string', required: true },
          statsPeriod: { type: 'string', required: false },
          shortIdLookup: { type: 'boolean', required: false },
          query: { type: 'string', required: false },
          limit: { type: 'number', required: false },
        },
        outputSchema: { issues: { type: 'array' } },
      },
      {
        id: 'update_issue',
        name: 'Update Issue',
        description: 'Update an issue',
        inputSchema: {
          issueId: { type: 'string', required: true },
          status: { type: 'string', required: false },
          assignedTo: { type: 'string', required: false },
          hasSeen: { type: 'boolean', required: false },
          isBookmarked: { type: 'boolean', required: false },
          isSubscribed: { type: 'boolean', required: false },
          isPublic: { type: 'boolean', required: false },
        },
        outputSchema: { issue: { type: 'object' } },
      },
      {
        id: 'delete_issue',
        name: 'Delete Issue',
        description: 'Delete an issue',
        inputSchema: {
          issueId: { type: 'string', required: true },
        },
        outputSchema: { success: { type: 'boolean' } },
      },

      // Organization actions
      {
        id: 'get_organization',
        name: 'Get Organization',
        description: 'Get an organization by slug',
        inputSchema: {
          organizationSlug: { type: 'string', required: true },
        },
        outputSchema: { organization: { type: 'object' } },
      },
      {
        id: 'get_all_organizations',
        name: 'Get All Organizations',
        description: 'Get all organizations',
        inputSchema: {
          member: { type: 'boolean', required: false },
          owner: { type: 'boolean', required: false },
          limit: { type: 'number', required: false },
        },
        outputSchema: { organizations: { type: 'array' } },
      },
      {
        id: 'create_organization',
        name: 'Create Organization',
        description: 'Create a new organization',
        inputSchema: {
          name: { type: 'string', required: true },
          agreeTerms: { type: 'boolean', required: true },
          slug: { type: 'string', required: false },
        },
        outputSchema: { organization: { type: 'object' } },
      },
      {
        id: 'update_organization',
        name: 'Update Organization',
        description: 'Update an organization',
        inputSchema: {
          organizationSlug: { type: 'string', required: true },
          name: { type: 'string', required: false },
          slug: { type: 'string', required: false },
        },
        outputSchema: { organization: { type: 'object' } },
      },

      // Project actions
      {
        id: 'create_project',
        name: 'Create Project',
        description: 'Create a new project',
        inputSchema: {
          organizationSlug: { type: 'string', required: true },
          teamSlug: { type: 'string', required: true },
          name: { type: 'string', required: true },
          slug: { type: 'string', required: false },
        },
        outputSchema: { project: { type: 'object' } },
      },
      {
        id: 'get_project',
        name: 'Get Project',
        description: 'Get a project by slug',
        inputSchema: {
          organizationSlug: { type: 'string', required: true },
          projectSlug: { type: 'string', required: true },
        },
        outputSchema: { project: { type: 'object' } },
      },
      {
        id: 'get_all_projects',
        name: 'Get All Projects',
        description: 'Get all projects',
        inputSchema: {
          limit: { type: 'number', required: false },
        },
        outputSchema: { projects: { type: 'array' } },
      },
      {
        id: 'update_project',
        name: 'Update Project',
        description: 'Update a project',
        inputSchema: {
          organizationSlug: { type: 'string', required: true },
          projectSlug: { type: 'string', required: true },
          name: { type: 'string', required: false },
          slug: { type: 'string', required: false },
          platform: { type: 'string', required: false },
          isBookmarked: { type: 'boolean', required: false },
        },
        outputSchema: { project: { type: 'object' } },
      },
      {
        id: 'delete_project',
        name: 'Delete Project',
        description: 'Delete a project',
        inputSchema: {
          organizationSlug: { type: 'string', required: true },
          projectSlug: { type: 'string', required: true },
        },
        outputSchema: { success: { type: 'boolean' } },
      },

      // Release actions
      {
        id: 'create_release',
        name: 'Create Release',
        description: 'Create a new release',
        inputSchema: {
          organizationSlug: { type: 'string', required: true },
          version: { type: 'string', required: true },
          url: { type: 'string', required: true },
          projects: { type: 'array', required: true },
          dateReleased: { type: 'string', required: false },
          commits: { type: 'array', required: false },
          refs: { type: 'array', required: false },
        },
        outputSchema: { release: { type: 'object' } },
      },
      {
        id: 'get_release',
        name: 'Get Release',
        description: 'Get a release by version',
        inputSchema: {
          organizationSlug: { type: 'string', required: true },
          version: { type: 'string', required: true },
        },
        outputSchema: { release: { type: 'object' } },
      },
      {
        id: 'get_all_releases',
        name: 'Get All Releases',
        description: 'Get all releases for an organization',
        inputSchema: {
          organizationSlug: { type: 'string', required: true },
          query: { type: 'string', required: false },
          limit: { type: 'number', required: false },
        },
        outputSchema: { releases: { type: 'array' } },
      },
      {
        id: 'update_release',
        name: 'Update Release',
        description: 'Update a release',
        inputSchema: {
          organizationSlug: { type: 'string', required: true },
          version: { type: 'string', required: true },
          url: { type: 'string', required: false },
          dateReleased: { type: 'string', required: false },
          commits: { type: 'array', required: false },
          refs: { type: 'array', required: false },
        },
        outputSchema: { release: { type: 'object' } },
      },
      {
        id: 'delete_release',
        name: 'Delete Release',
        description: 'Delete a release',
        inputSchema: {
          organizationSlug: { type: 'string', required: true },
          version: { type: 'string', required: true },
        },
        outputSchema: { success: { type: 'boolean' } },
      },

      // Team actions
      {
        id: 'create_team',
        name: 'Create Team',
        description: 'Create a new team',
        inputSchema: {
          organizationSlug: { type: 'string', required: true },
          name: { type: 'string', required: true },
          slug: { type: 'string', required: false },
        },
        outputSchema: { team: { type: 'object' } },
      },
      {
        id: 'get_team',
        name: 'Get Team',
        description: 'Get a team by slug',
        inputSchema: {
          organizationSlug: { type: 'string', required: true },
          teamSlug: { type: 'string', required: true },
        },
        outputSchema: { team: { type: 'object' } },
      },
      {
        id: 'get_all_teams',
        name: 'Get All Teams',
        description: 'Get all teams for an organization',
        inputSchema: {
          organizationSlug: { type: 'string', required: true },
          limit: { type: 'number', required: false },
        },
        outputSchema: { teams: { type: 'array' } },
      },
      {
        id: 'update_team',
        name: 'Update Team',
        description: 'Update a team',
        inputSchema: {
          organizationSlug: { type: 'string', required: true },
          teamSlug: { type: 'string', required: true },
          name: { type: 'string', required: false },
          slug: { type: 'string', required: false },
        },
        outputSchema: { team: { type: 'object' } },
      },
      {
        id: 'delete_team',
        name: 'Delete Team',
        description: 'Delete a team',
        inputSchema: {
          organizationSlug: { type: 'string', required: true },
          teamSlug: { type: 'string', required: true },
        },
        outputSchema: { success: { type: 'boolean' } },
      },
    ];
  }

  private getTriggers(): ConnectorTrigger[] {
    return [];
  }

  // Event Methods
  private async getEvent(data: any): Promise<any> {
    const { organizationSlug, projectSlug, eventId } = data;

    return await this.performRequest({
      method: 'GET',
      endpoint: `/api/0/projects/${organizationSlug}/${projectSlug}/events/${eventId}/`,
      headers: this.getAuthHeaders(),
    });
  }

  private async getAllEvents(data: any): Promise<any> {
    const { organizationSlug, projectSlug, full = false, limit } = data;

    const queryParams: any = { full };
    if (limit) {
      queryParams.limit = limit;
    }

    return await this.performRequest({
      method: 'GET',
      endpoint: `/api/0/projects/${organizationSlug}/${projectSlug}/events/`,
      headers: this.getAuthHeaders(),
      queryParams,
    });
  }

  // Issue Methods
  private async getIssue(data: any): Promise<any> {
    const { issueId } = data;

    return await this.performRequest({
      method: 'GET',
      endpoint: `/api/0/issues/${issueId}/`,
      headers: this.getAuthHeaders(),
    });
  }

  private async getAllIssues(data: any): Promise<any> {
    const { organizationSlug, projectSlug, statsPeriod, shortIdLookup, query, limit } = data;

    const queryParams: any = {};
    if (statsPeriod) queryParams.statsPeriod = statsPeriod;
    if (shortIdLookup !== undefined) queryParams.shortIdLookup = shortIdLookup;
    if (query) queryParams.query = query;
    if (limit) queryParams.limit = limit;

    return await this.performRequest({
      method: 'GET',
      endpoint: `/api/0/projects/${organizationSlug}/${projectSlug}/issues/`,
      headers: this.getAuthHeaders(),
      queryParams,
    });
  }

  private async updateIssue(data: any): Promise<any> {
    const { issueId, status, assignedTo, hasSeen, isBookmarked, isSubscribed, isPublic } = data;

    const body: any = {};
    if (status) body.status = status;
    if (assignedTo) body.assignedTo = assignedTo;
    if (hasSeen !== undefined) body.hasSeen = hasSeen;
    if (isBookmarked !== undefined) body.isBookmarked = isBookmarked;
    if (isSubscribed !== undefined) body.isSubscribed = isSubscribed;
    if (isPublic !== undefined) body.isPublic = isPublic;

    return await this.performRequest({
      method: 'PUT',
      endpoint: `/api/0/issues/${issueId}/`,
      headers: this.getAuthHeaders(),
      body,
    });
  }

  private async deleteIssue(data: any): Promise<any> {
    const { issueId } = data;

    await this.performRequest({
      method: 'DELETE',
      endpoint: `/api/0/issues/${issueId}/`,
      headers: this.getAuthHeaders(),
    });

    return { success: true };
  }

  // Organization Methods
  private async getOrganization(data: any): Promise<any> {
    const { organizationSlug } = data;

    return await this.performRequest({
      method: 'GET',
      endpoint: `/api/0/organizations/${organizationSlug}/`,
      headers: this.getAuthHeaders(),
    });
  }

  private async getAllOrganizations(data: any): Promise<any> {
    const { member, owner, limit } = data;

    const queryParams: any = {};
    if (member !== undefined) queryParams.member = member;
    if (owner !== undefined) queryParams.owner = owner;
    if (limit) queryParams.limit = limit;

    return await this.performRequest({
      method: 'GET',
      endpoint: '/api/0/organizations/',
      headers: this.getAuthHeaders(),
      queryParams,
    });
  }

  private async createOrganization(data: any): Promise<any> {
    const { name, agreeTerms, slug } = data;

    const body: any = { name, agreeTerms };
    if (slug) body.slug = slug;

    return await this.performRequest({
      method: 'POST',
      endpoint: '/api/0/organizations/',
      headers: this.getAuthHeaders(),
      body,
    });
  }

  private async updateOrganization(data: any): Promise<any> {
    const { organizationSlug, name, slug } = data;

    const body: any = {};
    if (name) body.name = name;
    if (slug) body.slug = slug;

    return await this.performRequest({
      method: 'PUT',
      endpoint: `/api/0/organizations/${organizationSlug}/`,
      headers: this.getAuthHeaders(),
      body,
    });
  }

  // Project Methods
  private async createProject(data: any): Promise<any> {
    const { organizationSlug, teamSlug, name, slug } = data;

    const body: any = { name };
    if (slug) body.slug = slug;

    return await this.performRequest({
      method: 'POST',
      endpoint: `/api/0/teams/${organizationSlug}/${teamSlug}/projects/`,
      headers: this.getAuthHeaders(),
      body,
    });
  }

  private async getProject(data: any): Promise<any> {
    const { organizationSlug, projectSlug } = data;

    return await this.performRequest({
      method: 'GET',
      endpoint: `/api/0/projects/${organizationSlug}/${projectSlug}/`,
      headers: this.getAuthHeaders(),
    });
  }

  private async getAllProjects(data: any): Promise<any> {
    const { limit } = data;

    const queryParams: any = {};
    if (limit) queryParams.limit = limit;

    return await this.performRequest({
      method: 'GET',
      endpoint: '/api/0/projects/',
      headers: this.getAuthHeaders(),
      queryParams,
    });
  }

  private async updateProject(data: any): Promise<any> {
    const { organizationSlug, projectSlug, name, slug, platform, isBookmarked } = data;

    const body: any = {};
    if (name) body.name = name;
    if (slug) body.slug = slug;
    if (platform) body.platform = platform;
    if (isBookmarked !== undefined) body.isBookmarked = isBookmarked;

    return await this.performRequest({
      method: 'PUT',
      endpoint: `/api/0/projects/${organizationSlug}/${projectSlug}/`,
      headers: this.getAuthHeaders(),
      body,
    });
  }

  private async deleteProject(data: any): Promise<any> {
    const { organizationSlug, projectSlug } = data;

    await this.performRequest({
      method: 'DELETE',
      endpoint: `/api/0/projects/${organizationSlug}/${projectSlug}/`,
      headers: this.getAuthHeaders(),
    });

    return { success: true };
  }

  // Release Methods
  private async createRelease(data: any): Promise<any> {
    const { organizationSlug, version, url, projects, dateReleased, commits, refs } = data;

    const body: any = { version, url, projects };
    if (dateReleased) body.dateReleased = dateReleased;
    if (commits) body.commits = commits;
    if (refs) body.refs = refs;

    return await this.performRequest({
      method: 'POST',
      endpoint: `/api/0/organizations/${organizationSlug}/releases/`,
      headers: this.getAuthHeaders(),
      body,
    });
  }

  private async getRelease(data: any): Promise<any> {
    const { organizationSlug, version } = data;

    return await this.performRequest({
      method: 'GET',
      endpoint: `/api/0/organizations/${organizationSlug}/releases/${version}/`,
      headers: this.getAuthHeaders(),
    });
  }

  private async getAllReleases(data: any): Promise<any> {
    const { organizationSlug, query, limit } = data;

    const queryParams: any = {};
    if (query) queryParams.query = query;
    if (limit) queryParams.limit = limit;

    return await this.performRequest({
      method: 'GET',
      endpoint: `/api/0/organizations/${organizationSlug}/releases/`,
      headers: this.getAuthHeaders(),
      queryParams,
    });
  }

  private async updateRelease(data: any): Promise<any> {
    const { organizationSlug, version, url, dateReleased, commits, refs } = data;

    const body: any = {};
    if (url) body.url = url;
    if (dateReleased) body.dateReleased = dateReleased;
    if (commits) body.commits = commits;
    if (refs) body.refs = refs;

    return await this.performRequest({
      method: 'PUT',
      endpoint: `/api/0/organizations/${organizationSlug}/releases/${version}/`,
      headers: this.getAuthHeaders(),
      body,
    });
  }

  private async deleteRelease(data: any): Promise<any> {
    const { organizationSlug, version } = data;

    await this.performRequest({
      method: 'DELETE',
      endpoint: `/api/0/organizations/${organizationSlug}/releases/${version}/`,
      headers: this.getAuthHeaders(),
    });

    return { success: true };
  }

  // Team Methods
  private async createTeam(data: any): Promise<any> {
    const { organizationSlug, name, slug } = data;

    const body: any = { name };
    if (slug) body.slug = slug;

    return await this.performRequest({
      method: 'POST',
      endpoint: `/api/0/organizations/${organizationSlug}/teams/`,
      headers: this.getAuthHeaders(),
      body,
    });
  }

  private async getTeam(data: any): Promise<any> {
    const { organizationSlug, teamSlug } = data;

    return await this.performRequest({
      method: 'GET',
      endpoint: `/api/0/teams/${organizationSlug}/${teamSlug}/`,
      headers: this.getAuthHeaders(),
    });
  }

  private async getAllTeams(data: any): Promise<any> {
    const { organizationSlug, limit } = data;

    const queryParams: any = {};
    if (limit) queryParams.limit = limit;

    return await this.performRequest({
      method: 'GET',
      endpoint: `/api/0/organizations/${organizationSlug}/teams/`,
      headers: this.getAuthHeaders(),
      queryParams,
    });
  }

  private async updateTeam(data: any): Promise<any> {
    const { organizationSlug, teamSlug, name, slug } = data;

    const body: any = {};
    if (name) body.name = name;
    if (slug) body.slug = slug;

    return await this.performRequest({
      method: 'PUT',
      endpoint: `/api/0/teams/${organizationSlug}/${teamSlug}/`,
      headers: this.getAuthHeaders(),
      body,
    });
  }

  private async deleteTeam(data: any): Promise<any> {
    const { organizationSlug, teamSlug } = data;

    await this.performRequest({
      method: 'DELETE',
      endpoint: `/api/0/teams/${organizationSlug}/${teamSlug}/`,
      headers: this.getAuthHeaders(),
    });

    return { success: true };
  }
}
