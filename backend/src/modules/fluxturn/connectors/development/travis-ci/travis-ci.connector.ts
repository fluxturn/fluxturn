import { Injectable, Logger } from '@nestjs/common';
import axios, { AxiosInstance } from 'axios';
import { BaseConnector } from '../../base/base.connector';
import { IDevelopmentConnector } from '../../base/connector.interface';
import {
  ConnectorMetadata,
  ConnectorResponse,
  ConnectorCategory,
  ConnectorType,
  AuthType,
  ConnectorRequest,
  PaginatedRequest
} from '../../types';

@Injectable()
export class TravisCiConnector extends BaseConnector implements IDevelopmentConnector {
  protected readonly logger = new Logger(TravisCiConnector.name);
  private httpClient: AxiosInstance;
  private readonly baseUrl = 'https://api.travis-ci.com';

  getMetadata(): ConnectorMetadata {
    return {
      name: 'Travis CI',
      description: 'Continuous integration service for GitHub projects. Monitor and trigger builds.',
      version: '1.0.0',
      category: ConnectorCategory.DEVELOPMENT,
      type: ConnectorType.TRAVIS_CI,
      authType: AuthType.API_KEY,
      actions: [
        {
          id: 'get_build',
          name: 'Get Build',
          description: 'Get information about a specific build',
          inputSchema: {
            buildId: {
              type: 'string',
              required: true,
              description: 'The build ID'
            },
            include: {
              type: 'string',
              required: false,
              description: 'List of attributes to eager load (e.g., build.commit)'
            }
          },
          outputSchema: {
            id: { type: 'number', description: 'Build ID' },
            number: { type: 'string', description: 'Build number' },
            state: { type: 'string', description: 'Build state' },
            duration: { type: 'number', description: 'Build duration' },
            started_at: { type: 'string', description: 'Build start time' },
            finished_at: { type: 'string', description: 'Build finish time' }
          }
        },
        {
          id: 'get_all_builds',
          name: 'Get All Builds',
          description: 'Get all builds for current user',
          inputSchema: {
            returnAll: {
              type: 'boolean',
              required: false,
              description: 'Return all builds'
            },
            limit: {
              type: 'number',
              required: false,
              description: 'Number of builds to return (max 500)'
            },
            sortBy: {
              type: 'string',
              required: false,
              description: 'Sort by field (created_at, finished_at, id, number, started_at)'
            },
            order: {
              type: 'string',
              required: false,
              description: 'Sort order (asc, desc)'
            },
            include: {
              type: 'string',
              required: false,
              description: 'List of attributes to eager load'
            }
          },
          outputSchema: {
            builds: { type: 'array', description: 'Array of builds' }
          }
        },
        {
          id: 'cancel_build',
          name: 'Cancel Build',
          description: 'Cancel a build',
          inputSchema: {
            buildId: {
              type: 'string',
              required: true,
              description: 'The build ID to cancel'
            }
          },
          outputSchema: {
            id: { type: 'number', description: 'Build ID' },
            state: { type: 'string', description: 'Build state' }
          }
        },
        {
          id: 'restart_build',
          name: 'Restart Build',
          description: 'Restart a build',
          inputSchema: {
            buildId: {
              type: 'string',
              required: true,
              description: 'The build ID to restart'
            }
          },
          outputSchema: {
            id: { type: 'number', description: 'Build ID' },
            state: { type: 'string', description: 'Build state' }
          }
        },
        {
          id: 'trigger_build',
          name: 'Trigger Build',
          description: 'Trigger a new build',
          inputSchema: {
            slug: {
              type: 'string',
              required: true,
              description: 'Repository slug (owner/repo)'
            },
            branch: {
              type: 'string',
              required: true,
              description: 'Branch name'
            },
            message: {
              type: 'string',
              required: false,
              description: 'Build message'
            },
            mergeMode: {
              type: 'string',
              required: false,
              description: 'Merge mode (merge, deep_merge, deep_merge_append, deep_merge_prepend, replace)'
            }
          },
          outputSchema: {
            request: { type: 'object', description: 'Request details' },
            resource_type: { type: 'string', description: 'Resource type' }
          }
        }
      ],
      triggers: [],
      rateLimit: {
        requestsPerMinute: 60
      },
      webhookSupport: false
    };
  }

  protected async initializeConnection(): Promise<void> {
    const apiToken = this.config.credentials?.apiToken;

    if (!apiToken) {
      throw new Error('Travis CI API token is required');
    }

    this.httpClient = axios.create({
      baseURL: this.baseUrl,
      headers: {
        'Travis-API-Version': '3',
        'Accept': 'application/json',
        'Content-Type': 'application/json',
        'Authorization': `token ${apiToken}`
      },
      timeout: 30000
    });

    this.logger.log('Travis CI connector initialized');
  }

  protected async performConnectionTest(): Promise<boolean> {
    try {
      // Test by getting builds with limit 1
      const response = await this.httpClient.get('/builds', {
        params: { limit: 1 }
      });
      this.logger.log('Travis CI connection test successful');
      return response.status === 200;
    } catch (error) {
      this.logger.error(`Travis CI connection test failed: ${error.message}`);
      throw new Error(`Travis CI connection test failed: ${error.message}`);
    }
  }

  protected async performHealthCheck(): Promise<void> {
    const isHealthy = await this.performConnectionTest();
    if (!isHealthy) {
      throw new Error('Travis CI health check failed');
    }
  }

  protected async performRequest(request: ConnectorRequest): Promise<any> {
    try {
      const response = await this.httpClient.request({
        method: request.method,
        url: request.endpoint,
        params: request.queryParams,
        data: request.body,
        headers: request.headers
      });
      return response.data;
    } catch (error) {
      const message = error.response?.data?.error_message || error.message;
      throw new Error(`Travis CI API request failed: ${message}`);
    }
  }

  protected async performAction(actionId: string, input: any): Promise<any> {
    switch (actionId) {
      case 'get_build':
        return await this.getBuild(input);
      case 'get_all_builds':
        return await this.getAllBuilds(input);
      case 'cancel_build':
        return await this.cancelBuild(input);
      case 'restart_build':
        return await this.restartBuild(input);
      case 'trigger_build':
        return await this.triggerBuild(input);
      default:
        throw new Error(`Unknown action: ${actionId}`);
    }
  }

  protected async cleanup(): Promise<void> {
    this.logger.log('Travis CI connector cleanup completed');
  }

  // IDevelopmentConnector implementation
  async createRepository(repository: any): Promise<ConnectorResponse> {
    return {
      success: false,
      error: {
        code: 'NOT_SUPPORTED',
        message: 'Travis CI does not support repository creation'
      }
    };
  }

  async createTask(owner: string, repo: string, task: any): Promise<ConnectorResponse> {
    return {
      success: false,
      error: {
        code: 'NOT_SUPPORTED',
        message: 'Travis CI does not support task creation'
      }
    };
  }

  async getRepository(owner: string, repo: string): Promise<ConnectorResponse> {
    return {
      success: false,
      error: {
        code: 'NOT_SUPPORTED',
        message: 'Travis CI does not support repository retrieval'
      }
    };
  }

  async getCode(owner: string, repo: string, path: string, ref?: string): Promise<ConnectorResponse> {
    return {
      success: false,
      error: {
        code: 'NOT_SUPPORTED',
        message: 'Travis CI does not support code retrieval'
      }
    };
  }

  async deployProject(owner: string, repo: string, deployment: any): Promise<ConnectorResponse> {
    // Travis CI can trigger builds which can be used for deployment
    try {
      const slug = `${owner}/${repo}`;
      const result = await this.triggerBuild({
        slug,
        branch: deployment.branch || 'main',
        message: deployment.message || 'Deployment build'
      });

      return {
        success: true,
        data: result,
        metadata: { timestamp: new Date() }
      };
    } catch (error) {
      return this.handleError(error as any, 'Failed to trigger Travis CI build');
    }
  }

  async getTasks(owner: string, repo: string, options?: PaginatedRequest): Promise<ConnectorResponse> {
    return {
      success: false,
      error: {
        code: 'NOT_SUPPORTED',
        message: 'Travis CI does not support task retrieval'
      }
    };
  }

  // Travis CI specific action implementations
  private async getBuild(input: any): Promise<any> {
    try {
      const { buildId, include } = input;
      const params: any = {};

      if (include) {
        params.include = include;
      }

      const response = await this.httpClient.get(`/build/${buildId}`, { params });
      return response.data;
    } catch (error) {
      const message = error.response?.data?.error_message || error.message;
      throw new Error(`Failed to get build: ${message}`);
    }
  }

  private async getAllBuilds(input: any): Promise<any> {
    try {
      const { returnAll, limit, sortBy, order, include } = input;

      const params: any = {};

      // Build sort parameter
      if (sortBy && order) {
        params.sort_by = `${sortBy}:${order}`;
      } else if (sortBy) {
        params.sort_by = sortBy;
      }

      if (include) {
        params.include = include;
      }

      if (returnAll) {
        // Fetch all builds using pagination
        return await this.getAllBuildsWithPagination(params);
      } else {
        params.limit = limit || 50;
        const response = await this.httpClient.get('/builds', { params });
        return response.data.builds;
      }
    } catch (error) {
      const message = error.response?.data?.error_message || error.message;
      throw new Error(`Failed to get builds: ${message}`);
    }
  }

  private async getAllBuildsWithPagination(params: any): Promise<any[]> {
    const allBuilds: any[] = [];
    let hasMore = true;
    let queryParams = { ...params };

    while (hasMore) {
      const response = await this.httpClient.get('/builds', { params: queryParams });
      const builds = response.data.builds || [];
      allBuilds.push(...builds);

      // Check if there are more pages
      const pagination = response.data['@pagination'];
      if (pagination && !pagination.is_last) {
        const nextHref = pagination.next?.['@href'];
        if (nextHref) {
          // Parse next page parameters from URL
          const url = new URL(nextHref, this.baseUrl);
          queryParams = Object.fromEntries(url.searchParams);
        } else {
          hasMore = false;
        }
      } else {
        hasMore = false;
      }
    }

    return allBuilds;
  }

  private async cancelBuild(input: any): Promise<any> {
    try {
      const { buildId } = input;
      const response = await this.httpClient.post(`/build/${buildId}/cancel`);
      return response.data;
    } catch (error) {
      const message = error.response?.data?.error_message || error.message;
      throw new Error(`Failed to cancel build: ${message}`);
    }
  }

  private async restartBuild(input: any): Promise<any> {
    try {
      const { buildId } = input;
      const response = await this.httpClient.post(`/build/${buildId}/restart`);
      return response.data;
    } catch (error) {
      const message = error.response?.data?.error_message || error.message;
      throw new Error(`Failed to restart build: ${message}`);
    }
  }

  private async triggerBuild(input: any): Promise<any> {
    try {
      const { slug, branch, message, mergeMode } = input;

      // URL encode the slug (replace / with %2F)
      const encodedSlug = slug.replace(/\//g, '%2F');

      const requestBody: any = {
        request: {
          branch
        }
      };

      if (message) {
        requestBody.request.message = message;
      }

      if (mergeMode) {
        requestBody.request.merge_mode = mergeMode;
      }

      const response = await this.httpClient.post(
        `/repo/${encodedSlug}/requests`,
        requestBody
      );

      return response.data;
    } catch (error) {
      const message = error.response?.data?.error_message || error.message;
      throw new Error(`Failed to trigger build: ${message}`);
    }
  }
}
