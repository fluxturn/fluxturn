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
export class SplunkConnector extends BaseConnector {
  private baseUrl: string;

  constructor(
    private readonly authUtils: AuthUtils,
    private readonly apiUtils: ApiUtils,
  ) {
    super();
  }

  getMetadata(): ConnectorMetadata {
    return {
      name: 'Splunk',
      description: 'Search, monitor and analyze machine-generated big data',
      version: '1.0.0',
      category: ConnectorCategory.ANALYTICS,
      type: ConnectorType.SPLUNK,
      authType: AuthType.BEARER_TOKEN,
      actions: this.getActions(),
      triggers: this.getTriggers(),
      webhookSupport: false,
    };
  }

  protected async initializeConnection(): Promise<void> {
    if (!this.config.credentials?.authToken) {
      throw new Error('Auth token is required');
    }
    if (!this.config.credentials?.baseUrl) {
      throw new Error('Base URL is required');
    }
    this.baseUrl = this.config.credentials.baseUrl;
    this.logger.log('Splunk connector initialized');
  }

  protected async performConnectionTest(): Promise<boolean> {
    try {
      const response = await this.performRequest({
        method: 'GET',
        endpoint: '/services/alerts/fired_alerts',
        headers: this.getAuthHeaders(),
        queryParams: { output_mode: 'json' },
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
      // Alert
      case 'get_fired_alerts':
        return await this.getFiredAlerts();
      case 'get_alert_metrics':
        return await this.getAlertMetrics();

      // Search
      case 'create_search_job':
        return await this.createSearchJob(input);
      case 'get_search_job':
        return await this.getSearchJob(input);
      case 'get_all_search_jobs':
        return await this.getAllSearchJobs(input);
      case 'get_search_results':
        return await this.getSearchResults(input);
      case 'delete_search_job':
        return await this.deleteSearchJob(input);

      // Report
      case 'create_report':
        return await this.createReport(input);
      case 'get_report':
        return await this.getReport(input);
      case 'get_all_reports':
        return await this.getAllReports(input);
      case 'delete_report':
        return await this.deleteReport(input);

      // User
      case 'create_user':
        return await this.createUser(input);
      case 'get_user':
        return await this.getUser(input);
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
    this.logger.log('Splunk connector cleanup completed');
  }

  private getAuthHeaders(): Record<string, string> {
    return {
      'Content-Type': 'application/x-www-form-urlencoded',
      Authorization: `Bearer ${this.config.credentials.authToken}`,
    };
  }

  private getActions(): ConnectorAction[] {
    return [
      // Alert Actions
      {
        id: 'get_fired_alerts',
        name: 'Get Fired Alerts',
        description: 'Retrieve a fired alerts report',
        inputSchema: {},
        outputSchema: { alerts: { type: 'array' } },
      },
      {
        id: 'get_alert_metrics',
        name: 'Get Alert Metrics',
        description: 'Retrieve alert metrics',
        inputSchema: {},
        outputSchema: { metrics: { type: 'object' } },
      },

      // Search Actions
      {
        id: 'create_search_job',
        name: 'Create Search Job',
        description: 'Create a new search job',
        inputSchema: {
          search: { type: 'string', required: true },
          earliestTime: { type: 'string', required: false },
          latestTime: { type: 'string', required: false },
          indexEarliest: { type: 'string', required: false },
          indexLatest: { type: 'string', required: false },
          adhocSearchLevel: { type: 'string', required: false },
          execMode: { type: 'string', required: false },
          maxTime: { type: 'number', required: false },
          timeout: { type: 'number', required: false },
        },
        outputSchema: { job: { type: 'object' } },
      },
      {
        id: 'get_search_job',
        name: 'Get Search Job',
        description: 'Retrieve a search job',
        inputSchema: {
          searchJobId: { type: 'string', required: true },
        },
        outputSchema: { job: { type: 'object' } },
      },
      {
        id: 'get_all_search_jobs',
        name: 'Get All Search Jobs',
        description: 'Retrieve many search jobs',
        inputSchema: {
          returnAll: { type: 'boolean', required: false },
          limit: { type: 'number', required: false },
        },
        outputSchema: { jobs: { type: 'array' } },
      },
      {
        id: 'get_search_results',
        name: 'Get Search Results',
        description: 'Get the result of a search job',
        inputSchema: {
          searchJobId: { type: 'string', required: true },
          returnAll: { type: 'boolean', required: false },
          limit: { type: 'number', required: false },
        },
        outputSchema: { results: { type: 'array' } },
      },
      {
        id: 'delete_search_job',
        name: 'Delete Search Job',
        description: 'Delete a search job',
        inputSchema: {
          searchJobId: { type: 'string', required: true },
        },
        outputSchema: { success: { type: 'boolean' } },
      },

      // Report Actions
      {
        id: 'create_report',
        name: 'Create Report',
        description: 'Create a search report from a search job',
        inputSchema: {
          searchJobId: { type: 'string', required: true },
          name: { type: 'string', required: true },
        },
        outputSchema: { report: { type: 'object' } },
      },
      {
        id: 'get_report',
        name: 'Get Report',
        description: 'Retrieve a search report',
        inputSchema: {
          reportId: { type: 'string', required: true },
        },
        outputSchema: { report: { type: 'object' } },
      },
      {
        id: 'get_all_reports',
        name: 'Get All Reports',
        description: 'Retrieve many search reports',
        inputSchema: {
          returnAll: { type: 'boolean', required: false },
          limit: { type: 'number', required: false },
          addOrphanField: { type: 'boolean', required: false },
          listDefaultActionArgs: { type: 'boolean', required: false },
        },
        outputSchema: { reports: { type: 'array' } },
      },
      {
        id: 'delete_report',
        name: 'Delete Report',
        description: 'Delete a search report',
        inputSchema: {
          reportId: { type: 'string', required: true },
        },
        outputSchema: { success: { type: 'boolean' } },
      },

      // User Actions
      {
        id: 'create_user',
        name: 'Create User',
        description: 'Create a new user',
        inputSchema: {
          name: { type: 'string', required: true },
          password: { type: 'string', required: true },
          roles: { type: 'array', required: true },
          email: { type: 'string', required: false },
          realname: { type: 'string', required: false },
        },
        outputSchema: { user: { type: 'object' } },
      },
      {
        id: 'get_user',
        name: 'Get User',
        description: 'Retrieve a user',
        inputSchema: {
          userId: { type: 'string', required: true },
        },
        outputSchema: { user: { type: 'object' } },
      },
      {
        id: 'get_all_users',
        name: 'Get All Users',
        description: 'Retrieve many users',
        inputSchema: {
          returnAll: { type: 'boolean', required: false },
          limit: { type: 'number', required: false },
        },
        outputSchema: { users: { type: 'array' } },
      },
      {
        id: 'update_user',
        name: 'Update User',
        description: 'Update a user',
        inputSchema: {
          userId: { type: 'string', required: true },
          email: { type: 'string', required: false },
          realname: { type: 'string', required: false },
          roles: { type: 'array', required: false },
        },
        outputSchema: { user: { type: 'object' } },
      },
      {
        id: 'delete_user',
        name: 'Delete User',
        description: 'Delete a user',
        inputSchema: {
          userId: { type: 'string', required: true },
        },
        outputSchema: { success: { type: 'boolean' } },
      },
    ];
  }

  private getTriggers(): ConnectorTrigger[] {
    return [];
  }

  // Alert Methods
  private async getFiredAlerts(): Promise<any> {
    return await this.performRequest({
      method: 'GET',
      endpoint: '/services/alerts/fired_alerts',
      headers: this.getAuthHeaders(),
      queryParams: { output_mode: 'json' },
    });
  }

  private async getAlertMetrics(): Promise<any> {
    return await this.performRequest({
      method: 'GET',
      endpoint: '/services/alerts/metric_alerts',
      headers: this.getAuthHeaders(),
      queryParams: { output_mode: 'json' },
    });
  }

  // Search Methods
  private async createSearchJob(data: any): Promise<any> {
    const { search, earliestTime, latestTime, ...additionalFields } = data;

    const body: any = { search };

    if (earliestTime) {
      body.earliest_time = this.toUnixEpoch(earliestTime);
    }
    if (latestTime) {
      body.latest_time = this.toUnixEpoch(latestTime);
    }

    Object.assign(body, additionalFields);

    // First create the job
    const createResponse = await this.performRequest({
      method: 'POST',
      endpoint: '/services/search/jobs',
      headers: this.getAuthHeaders(),
      body,
    });

    // Extract job ID from response
    const jobId = createResponse?.response?.sid || createResponse?.sid;

    if (!jobId) {
      throw new Error('Failed to create search job - no job ID returned');
    }

    // Get the job details
    return await this.performRequest({
      method: 'GET',
      endpoint: `/services/search/jobs/${jobId}`,
      headers: this.getAuthHeaders(),
      queryParams: { output_mode: 'json' },
    });
  }

  private async getSearchJob(data: any): Promise<any> {
    const { searchJobId } = data;

    return await this.performRequest({
      method: 'GET',
      endpoint: `/services/search/jobs/${searchJobId}`,
      headers: this.getAuthHeaders(),
      queryParams: { output_mode: 'json' },
    });
  }

  private async getAllSearchJobs(data: any): Promise<any> {
    const { returnAll = false, limit = 50 } = data;

    const queryParams: any = { output_mode: 'json' };
    if (!returnAll) {
      queryParams.count = limit;
    } else {
      queryParams.count = 0;
    }

    return await this.performRequest({
      method: 'GET',
      endpoint: '/services/search/jobs',
      headers: this.getAuthHeaders(),
      queryParams,
    });
  }

  private async getSearchResults(data: any): Promise<any> {
    const { searchJobId, returnAll = false, limit = 50, keyValueMatch } = data;

    const queryParams: any = { output_mode: 'json' };

    if (!returnAll) {
      queryParams.count = limit;
    } else {
      queryParams.count = 0;
    }

    if (keyValueMatch?.key && keyValueMatch?.value) {
      queryParams.search = `search ${keyValueMatch.key}=${keyValueMatch.value}`;
    }

    return await this.performRequest({
      method: 'GET',
      endpoint: `/services/search/jobs/${searchJobId}/results`,
      headers: this.getAuthHeaders(),
      queryParams,
    });
  }

  private async deleteSearchJob(data: any): Promise<any> {
    const { searchJobId } = data;

    await this.performRequest({
      method: 'DELETE',
      endpoint: `/services/search/jobs/${searchJobId}`,
      headers: this.getAuthHeaders(),
    });

    return { success: true };
  }

  // Report Methods
  private async createReport(data: any): Promise<any> {
    const { searchJobId, name } = data;

    // First get the search job details
    const searchJob = await this.getSearchJob({ searchJobId });
    const jobData = Array.isArray(searchJob) ? searchJob[0] : searchJob;

    const body: any = {
      name,
      search: jobData.search,
      alert_type: 'always',
      'dispatch.earliest_time': jobData.earliestTime,
      'dispatch.latest_time': jobData.latestTime,
      is_scheduled: jobData.isScheduled,
      cron_schedule: jobData.cronSchedule,
    };

    return await this.performRequest({
      method: 'POST',
      endpoint: '/services/saved/searches',
      headers: this.getAuthHeaders(),
      body,
    });
  }

  private async getReport(data: any): Promise<any> {
    const { reportId } = data;

    return await this.performRequest({
      method: 'GET',
      endpoint: `/services/saved/searches/${reportId}`,
      headers: this.getAuthHeaders(),
      queryParams: { output_mode: 'json' },
    });
  }

  private async getAllReports(data: any): Promise<any> {
    const { returnAll = false, limit = 50, addOrphanField, listDefaultActionArgs } = data;

    const queryParams: any = { output_mode: 'json' };

    if (!returnAll) {
      queryParams.count = limit;
    } else {
      queryParams.count = 0;
    }

    if (addOrphanField !== undefined) {
      queryParams.add_orphan_field = addOrphanField;
    }

    if (listDefaultActionArgs !== undefined) {
      queryParams.listDefaultActionArgs = listDefaultActionArgs;
    }

    return await this.performRequest({
      method: 'GET',
      endpoint: '/services/saved/searches',
      headers: this.getAuthHeaders(),
      queryParams,
    });
  }

  private async deleteReport(data: any): Promise<any> {
    const { reportId } = data;

    await this.performRequest({
      method: 'DELETE',
      endpoint: `/services/saved/searches/${reportId}`,
      headers: this.getAuthHeaders(),
    });

    return { success: true };
  }

  // User Methods
  private async createUser(data: any): Promise<any> {
    const { name, password, roles, email, realname } = data;

    const body: any = {
      name,
      password,
      roles,
    };

    if (email) {
      body.email = email;
    }

    if (realname) {
      body.realname = realname;
    }

    return await this.performRequest({
      method: 'POST',
      endpoint: '/services/authentication/users',
      headers: this.getAuthHeaders(),
      body,
    });
  }

  private async getUser(data: any): Promise<any> {
    const { userId } = data;

    return await this.performRequest({
      method: 'GET',
      endpoint: `/services/authentication/users/${userId}`,
      headers: this.getAuthHeaders(),
      queryParams: { output_mode: 'json' },
    });
  }

  private async getAllUsers(data: any): Promise<any> {
    const { returnAll = false, limit = 50 } = data;

    const queryParams: any = { output_mode: 'json' };

    if (!returnAll) {
      queryParams.count = limit;
    } else {
      queryParams.count = 0;
    }

    return await this.performRequest({
      method: 'GET',
      endpoint: '/services/authentication/users',
      headers: this.getAuthHeaders(),
      queryParams,
    });
  }

  private async updateUser(data: any): Promise<any> {
    const { userId, ...updateData } = data;

    return await this.performRequest({
      method: 'POST',
      endpoint: `/services/authentication/users/${userId}`,
      headers: this.getAuthHeaders(),
      body: updateData,
    });
  }

  private async deleteUser(data: any): Promise<any> {
    const { userId } = data;

    await this.performRequest({
      method: 'DELETE',
      endpoint: `/services/authentication/users/${userId}`,
      headers: this.getAuthHeaders(),
    });

    return { success: true };
  }

  // Helper Methods
  private toUnixEpoch(timestamp: string): number {
    return Date.parse(timestamp) / 1000;
  }
}
