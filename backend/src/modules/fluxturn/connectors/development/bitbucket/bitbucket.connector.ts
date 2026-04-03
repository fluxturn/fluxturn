import { Injectable, Logger } from '@nestjs/common';
import axios, { AxiosInstance } from 'axios';
import { BaseConnector } from '../../base/base.connector';
import {
  ConnectorMetadata,
  ConnectorResponse,
  ConnectorCategory,
  ConnectorType,
  AuthType
} from '../../types';

@Injectable()
export class BitbucketConnector extends BaseConnector {
  protected readonly logger = new Logger(BitbucketConnector.name);
  private httpClient: AxiosInstance;

  getMetadata(): ConnectorMetadata {
    return {
      name: 'Bitbucket',
      description: 'Git repository hosting and collaboration platform',
      version: '1.0.0',
      category: ConnectorCategory.DEVELOPMENT,
      type: ConnectorType.BITBUCKET,
      authType: AuthType.BASIC_AUTH,
      actions: [
        { id: 'get_repository', name: 'Get Repository', description: 'Get repository information', inputSchema: {}, outputSchema: {} },
        { id: 'list_repositories', name: 'List Repositories', description: 'List all repositories', inputSchema: {}, outputSchema: {} },
        { id: 'list_workspaces', name: 'List Workspaces', description: 'List all workspaces', inputSchema: {}, outputSchema: {} }
      ],
      triggers: [],
      webhookSupport: true
    };
  }

  protected async initializeConnection(): Promise<void> {
    if (!this.config.credentials?.username || !this.config.credentials?.appPassword) {
      throw new Error('Bitbucket credentials (username, appPassword) are required');
    }

    this.httpClient = axios.create({
      baseURL: 'https://api.bitbucket.org/2.0',
      auth: {
        username: this.config.credentials.username,
        password: this.config.credentials.appPassword
      },
      timeout: 30000
    });

    this.logger.log('Bitbucket connector initialized');
  }

  protected async performConnectionTest(): Promise<boolean> {
    try {
      const response = await this.httpClient.get('/user');
      return response.status === 200;
    } catch (error) {
      this.logger.error('Bitbucket connection test failed:', error);
      return false;
    }
  }

  protected async performHealthCheck(): Promise<void> {
    const isHealthy = await this.performConnectionTest();
    if (!isHealthy) {
      throw new Error('Bitbucket health check failed');
    }
  }

  protected async performRequest(request: any): Promise<any> {
    const { method = 'GET', endpoint, body, headers } = request;
    const response = await this.httpClient.request({
      method,
      url: endpoint,
      data: body,
      headers
    });
    return response.data;
  }

  protected async performAction(actionId: string, input: any): Promise<any> {
    switch (actionId) {
      case 'get_repository':
        return await this.getRepository(input);
      case 'list_repositories':
        return await this.listRepositories(input);
      case 'list_workspaces':
        return await this.listWorkspaces(input);
      default:
        throw new Error(`Unknown action: ${actionId}`);
    }
  }

  protected async cleanup(): Promise<void> {
    this.logger.log('Bitbucket connector cleanup completed');
  }

  private async getRepository(input: any): Promise<ConnectorResponse> {
    try {
      const { workspace, repository } = input;
      const response = await this.httpClient.get(`/repositories/${workspace}/${repository}`);
      return {
        success: true,
        data: response.data
      };
    } catch (error) {
      return this.handleError(error, 'Failed to get repository');
    }
  }

  private async listRepositories(input: any): Promise<ConnectorResponse> {
    try {
      const { workspace } = input;
      const response = await this.httpClient.get(`/repositories/${workspace}`);
      return {
        success: true,
        data: response.data.values || response.data
      };
    } catch (error) {
      return this.handleError(error, 'Failed to list repositories');
    }
  }

  private async listWorkspaces(input: any): Promise<ConnectorResponse> {
    try {
      const response = await this.httpClient.get('/workspaces');
      return {
        success: true,
        data: response.data.values || response.data
      };
    } catch (error) {
      return this.handleError(error, 'Failed to list workspaces');
    }
  }
}
