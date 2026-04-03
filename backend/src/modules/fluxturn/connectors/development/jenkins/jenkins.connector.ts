import { Injectable, Logger } from '@nestjs/common';
import axios, { AxiosInstance } from 'axios';
import { BaseConnector } from '../../base/base.connector';
import {
  ConnectorMetadata,
  ConnectorResponse,
  ConnectorCategory,
  ConnectorType,
  AuthType,
  ConnectorConfig,
  ConnectorRequest
} from '../../types';

@Injectable()
export class JenkinsConnector extends BaseConnector {
  protected readonly logger = new Logger(JenkinsConnector.name);
  private httpClient: AxiosInstance;
  private baseUrl: string;
  private username: string;
  private apiKey: string;

  getMetadata(): ConnectorMetadata {
    return {
      name: 'Jenkins',
      description: 'Open source automation server for CI/CD',
      version: '1.0.0',
      category: ConnectorCategory.DEVELOPMENT,
      type: ConnectorType.JENKINS,
      authType: AuthType.BASIC_AUTH,
      actions: [
        { id: 'trigger_job', name: 'Trigger Job', description: 'Trigger a Jenkins job', inputSchema: {}, outputSchema: {} },
        { id: 'trigger_job_params', name: 'Trigger Job with Parameters', description: 'Trigger job with parameters', inputSchema: {}, outputSchema: {} },
        { id: 'copy_job', name: 'Copy Job', description: 'Copy a Jenkins job', inputSchema: {}, outputSchema: {} },
        { id: 'create_job', name: 'Create Job', description: 'Create a new job', inputSchema: {}, outputSchema: {} },
        { id: 'get_build', name: 'Get Build', description: 'Get build information', inputSchema: {}, outputSchema: {} },
        { id: 'cancel_quiet_down', name: 'Cancel Quiet Down', description: 'Cancel quiet down', inputSchema: {}, outputSchema: {} },
        { id: 'quiet_down', name: 'Quiet Down', description: 'Enable quiet down mode', inputSchema: {}, outputSchema: {} },
        { id: 'restart', name: 'Restart', description: 'Restart Jenkins', inputSchema: {}, outputSchema: {} }
      ],
      triggers: [],
      webhookSupport: false
    };
  }

  protected async initializeConnection(): Promise<void> {
    if (!this.config.credentials?.username || !this.config.credentials?.apiKey || !this.config.credentials?.baseUrl) {
      throw new Error('Jenkins credentials (username, apiKey, baseUrl) are required');
    }

    this.username = this.config.credentials.username;
    this.apiKey = this.config.credentials.apiKey;
    this.baseUrl = this.config.credentials.baseUrl.replace(/\/$/, ''); // Remove trailing slash

    this.httpClient = axios.create({
      baseURL: this.baseUrl,
      auth: {
        username: this.username,
        password: this.apiKey
      },
      timeout: 30000
    });

    this.logger.log('Jenkins connector initialized');
  }

  protected async performConnectionTest(): Promise<boolean> {
    try {
      const response = await this.httpClient.get('/api/json');
      return response.status === 200;
    } catch (error) {
      this.logger.error('Jenkins connection test failed:', error);
      return false;
    }
  }

  protected async performHealthCheck(): Promise<void> {
    const isHealthy = await this.performConnectionTest();
    if (!isHealthy) {
      throw new Error('Jenkins health check failed');
    }
  }

  protected async performRequest(request: ConnectorRequest): Promise<any> {
    const { method = 'GET', endpoint, body, headers } = request;

    const response = await this.httpClient.request({
      method,
      url: endpoint,
      data: body,
      headers: {
        'Content-Type': 'application/json',
        ...headers
      }
    });

    return response.data;
  }

  protected async performAction(actionId: string, input: any): Promise<any> {
    switch (actionId) {
      case 'trigger_job':
        return await this.triggerJob(input);
      case 'trigger_job_params':
        return await this.triggerJobWithParams(input);
      case 'copy_job':
        return await this.copyJob(input);
      case 'create_job':
        return await this.createJob(input);
      case 'get_build':
        return await this.getBuild(input);
      case 'cancel_quiet_down':
        return await this.cancelQuietDown();
      case 'quiet_down':
        return await this.quietDown();
      case 'restart':
        return await this.restart(input);
      default:
        throw new Error(`Unknown action: ${actionId}`);
    }
  }

  protected async cleanup(): Promise<void> {
    this.logger.log('Jenkins connector cleanup completed');
  }

  // Jenkins-specific methods
  private async triggerJob(input: any): Promise<ConnectorResponse> {
    try {
      const { job } = input;
      await this.httpClient.post(`/job/${encodeURIComponent(job)}/build`);
      return {
        success: true,
        data: { message: `Job ${job} triggered successfully` }
      };
    } catch (error) {
      return this.handleError(error, 'Failed to trigger job');
    }
  }

  private async triggerJobWithParams(input: any): Promise<ConnectorResponse> {
    try {
      const { job, parameters } = input;
      const params = parameters ? JSON.parse(parameters) : {};

      await this.httpClient.post(
        `/job/${encodeURIComponent(job)}/buildWithParameters`,
        null,
        { params }
      );

      return {
        success: true,
        data: { message: `Job ${job} triggered with parameters` }
      };
    } catch (error) {
      return this.handleError(error, 'Failed to trigger job with parameters');
    }
  }

  private async copyJob(input: any): Promise<ConnectorResponse> {
    try {
      const { job, newJob } = input;

      await this.httpClient.post(
        `/createItem`,
        null,
        {
          params: {
            name: newJob,
            mode: 'copy',
            from: job
          }
        }
      );

      return {
        success: true,
        data: { message: `Job copied from ${job} to ${newJob}` }
      };
    } catch (error) {
      return this.handleError(error, 'Failed to copy job');
    }
  }

  private async createJob(input: any): Promise<ConnectorResponse> {
    try {
      const { newJob, config } = input;

      await this.httpClient.post(
        `/createItem`,
        config,
        {
          params: { name: newJob },
          headers: { 'Content-Type': 'application/xml' }
        }
      );

      return {
        success: true,
        data: { message: `Job ${newJob} created successfully` }
      };
    } catch (error) {
      return this.handleError(error, 'Failed to create job');
    }
  }

  private async getBuild(input: any): Promise<ConnectorResponse> {
    try {
      const { job, buildNumber } = input;

      const response = await this.httpClient.get(
        `/job/${encodeURIComponent(job)}/${buildNumber}/api/json`
      );

      return {
        success: true,
        data: response.data
      };
    } catch (error) {
      return this.handleError(error, 'Failed to get build');
    }
  }

  private async cancelQuietDown(): Promise<ConnectorResponse> {
    try {
      await this.httpClient.post('/cancelQuietDown');
      return {
        success: true,
        data: { message: 'Quiet down cancelled' }
      };
    } catch (error) {
      return this.handleError(error, 'Failed to cancel quiet down');
    }
  }

  private async quietDown(): Promise<ConnectorResponse> {
    try {
      await this.httpClient.post('/quietDown');
      return {
        success: true,
        data: { message: 'Quiet down mode enabled' }
      };
    } catch (error) {
      return this.handleError(error, 'Failed to enable quiet down');
    }
  }

  private async restart(input: any): Promise<ConnectorResponse> {
    try {
      const { safe = true } = input;
      const endpoint = safe ? '/safeRestart' : '/restart';

      await this.httpClient.post(endpoint);

      return {
        success: true,
        data: { message: `Jenkins ${safe ? 'safe ' : ''}restart initiated` }
      };
    } catch (error) {
      return this.handleError(error, 'Failed to restart Jenkins');
    }
  }
}
