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
  ConnectorRequest,
  ConnectorAction
} from '../../types';

@Injectable()
export class NetlifyConnector extends BaseConnector {
  protected readonly logger = new Logger(NetlifyConnector.name);
  private httpClient: AxiosInstance;
  private accessToken: string;
  private readonly baseUrl = 'https://api.netlify.com/api/v1';

  getMetadata(): ConnectorMetadata {
    return {
      name: 'Netlify',
      description: 'Deploy and manage static sites with Netlify. Manage sites, deploys, and builds.',
      version: '1.0.0',
      category: ConnectorCategory.DEVELOPMENT,
      type: ConnectorType.NETLIFY,
      authType: AuthType.API_KEY,
      actions: this.getActions(),
      triggers: [],
      webhookSupport: false
    };
  }

  protected async initializeConnection(): Promise<void> {
    if (!this.config.credentials?.accessToken) {
      throw new Error('Netlify access token is required');
    }

    this.accessToken = this.config.credentials.accessToken;

    this.httpClient = axios.create({
      baseURL: this.baseUrl,
      headers: {
        'Authorization': `Bearer ${this.accessToken}`,
        'Content-Type': 'application/json'
      },
      timeout: 30000
    });

    this.logger.log('Netlify connector initialized successfully');
  }

  protected async performConnectionTest(): Promise<boolean> {
    try {
      const response = await this.httpClient.get('/sites', {
        params: { per_page: 1 }
      });
      return response.status === 200;
    } catch (error) {
      this.logger.error('Netlify connection test failed:', error.message);
      return false;
    }
  }

  protected async performHealthCheck(): Promise<void> {
    const isHealthy = await this.performConnectionTest();
    if (!isHealthy) {
      throw new Error('Netlify health check failed - unable to connect to API');
    }
  }

  protected async performRequest(request: ConnectorRequest): Promise<any> {
    const { method = 'GET', endpoint, body, queryParams, headers } = request;

    try {
      const response = await this.httpClient.request({
        method,
        url: endpoint,
        data: body,
        params: queryParams,
        headers: {
          ...headers
        }
      });

      return response.data;
    } catch (error) {
      this.logger.error(`Netlify API request failed: ${error.message}`);
      throw error;
    }
  }

  protected async performAction(actionId: string, input: any): Promise<any> {
    this.logger.log(`Executing Netlify action: ${actionId}`);

    switch (actionId) {
      case 'cancel_deploy':
        return await this.cancelDeploy(input);
      case 'create_deploy':
        return await this.createDeploy(input);
      case 'get_deploy':
        return await this.getDeploy(input);
      case 'get_all_deploys':
        return await this.getAllDeploys(input);
      case 'delete_site':
        return await this.deleteSite(input);
      case 'get_site':
        return await this.getSite(input);
      case 'get_all_sites':
        return await this.getAllSites(input);
      default:
        throw new Error(`Unknown action: ${actionId}`);
    }
  }

  protected async cleanup(): Promise<void> {
    this.logger.log('Netlify connector cleanup completed');
  }

  // ===== Action Definitions =====
  private getActions(): ConnectorAction[] {
    return [
      {
        id: 'cancel_deploy',
        name: 'Cancel Deploy',
        description: 'Cancel a specific deploy',
        inputSchema: {
          deployId: {
            type: 'string',
            required: true,
            description: 'ID of the deploy to cancel'
          }
        },
        outputSchema: {
          id: { type: 'string', description: 'Deploy ID' },
          state: { type: 'string', description: 'Deploy state' },
          error_message: { type: 'string', description: 'Error message if failed' }
        }
      },
      {
        id: 'create_deploy',
        name: 'Create Deploy',
        description: 'Create a new deploy for a site',
        inputSchema: {
          siteId: {
            type: 'string',
            required: true,
            description: 'ID of the site to deploy'
          },
          title: {
            type: 'string',
            required: false,
            description: 'Title for the deploy'
          },
          branch: {
            type: 'string',
            required: false,
            description: 'Branch to deploy from'
          }
        },
        outputSchema: {
          id: { type: 'string', description: 'Deploy ID' },
          site_id: { type: 'string', description: 'Site ID' },
          deploy_url: { type: 'string', description: 'Deploy URL' },
          state: { type: 'string', description: 'Deploy state' },
          created_at: { type: 'string', description: 'Creation timestamp' }
        }
      },
      {
        id: 'get_deploy',
        name: 'Get Deploy',
        description: 'Get information about a specific deploy',
        inputSchema: {
          siteId: {
            type: 'string',
            required: true,
            description: 'ID of the site'
          },
          deployId: {
            type: 'string',
            required: true,
            description: 'ID of the deploy'
          }
        },
        outputSchema: {
          id: { type: 'string', description: 'Deploy ID' },
          site_id: { type: 'string', description: 'Site ID' },
          state: { type: 'string', description: 'Deploy state' },
          deploy_url: { type: 'string', description: 'Deploy URL' },
          created_at: { type: 'string', description: 'Creation timestamp' },
          updated_at: { type: 'string', description: 'Last update timestamp' }
        }
      },
      {
        id: 'get_all_deploys',
        name: 'Get All Deploys',
        description: 'Get all deploys for a site',
        inputSchema: {
          siteId: {
            type: 'string',
            required: true,
            description: 'ID of the site'
          },
          returnAll: {
            type: 'boolean',
            required: false,
            description: 'Return all deploys (default: false)'
          },
          limit: {
            type: 'number',
            required: false,
            description: 'Number of deploys to return (default: 50)'
          }
        },
        outputSchema: {
          deploys: {
            type: 'array',
            description: 'Array of deploy objects'
          }
        }
      },
      {
        id: 'delete_site',
        name: 'Delete Site',
        description: 'Delete a site',
        inputSchema: {
          siteId: {
            type: 'string',
            required: true,
            description: 'ID of the site to delete'
          }
        },
        outputSchema: {
          success: { type: 'boolean', description: 'Whether deletion was successful' },
          message: { type: 'string', description: 'Confirmation message' }
        }
      },
      {
        id: 'get_site',
        name: 'Get Site',
        description: 'Get information about a specific site',
        inputSchema: {
          siteId: {
            type: 'string',
            required: true,
            description: 'ID of the site'
          }
        },
        outputSchema: {
          id: { type: 'string', description: 'Site ID' },
          name: { type: 'string', description: 'Site name' },
          url: { type: 'string', description: 'Site URL' },
          admin_url: { type: 'string', description: 'Admin URL' },
          state: { type: 'string', description: 'Site state' },
          created_at: { type: 'string', description: 'Creation timestamp' },
          updated_at: { type: 'string', description: 'Last update timestamp' }
        }
      },
      {
        id: 'get_all_sites',
        name: 'Get All Sites',
        description: 'Get all sites',
        inputSchema: {
          returnAll: {
            type: 'boolean',
            required: false,
            description: 'Return all sites (default: false)'
          },
          limit: {
            type: 'number',
            required: false,
            description: 'Number of sites to return (default: 50)'
          }
        },
        outputSchema: {
          sites: {
            type: 'array',
            description: 'Array of site objects'
          }
        }
      }
    ];
  }

  // ===== Deploy Actions =====

  /**
   * Cancel a specific deploy
   * Based on n8n implementation: Netlify.node.ts lines 92-100
   */
  private async cancelDeploy(input: any): Promise<ConnectorResponse> {
    try {
      const { deployId } = input;

      if (!deployId) {
        throw new Error('Deploy ID is required');
      }

      const response = await this.httpClient.post(`/deploys/${deployId}/cancel`);

      return {
        success: true,
        data: response.data
      };
    } catch (error) {
      return this.handleError(error, 'Failed to cancel deploy');
    }
  }

  /**
   * Create a new deploy for a site
   * Based on n8n implementation: Netlify.node.ts lines 103-121
   */
  private async createDeploy(input: any): Promise<ConnectorResponse> {
    try {
      const { siteId, title, branch } = input;

      if (!siteId) {
        throw new Error('Site ID is required');
      }

      const body: any = {};
      const queryParams: any = {};

      // Add optional fields
      if (title) {
        queryParams.title = title;
      }
      if (branch) {
        body.branch = branch;
      }

      const response = await this.httpClient.post(
        `/sites/${siteId}/deploys`,
        body,
        { params: queryParams }
      );

      return {
        success: true,
        data: response.data
      };
    } catch (error) {
      return this.handleError(error, 'Failed to create deploy');
    }
  }

  /**
   * Get information about a specific deploy
   * Based on n8n implementation: Netlify.node.ts lines 123-132
   */
  private async getDeploy(input: any): Promise<ConnectorResponse> {
    try {
      const { siteId, deployId } = input;

      if (!siteId || !deployId) {
        throw new Error('Site ID and Deploy ID are required');
      }

      const response = await this.httpClient.get(`/sites/${siteId}/deploys/${deployId}`);

      return {
        success: true,
        data: response.data
      };
    } catch (error) {
      return this.handleError(error, 'Failed to get deploy');
    }
  }

  /**
   * Get all deploys for a site
   * Based on n8n implementation: Netlify.node.ts lines 135-154
   * Supports pagination with returnAll flag or limit parameter
   */
  private async getAllDeploys(input: any): Promise<ConnectorResponse> {
    try {
      const { siteId, returnAll = false, limit = 50 } = input;

      if (!siteId) {
        throw new Error('Site ID is required');
      }

      let deploys: any[] = [];

      if (returnAll) {
        // Paginate through all deploys
        deploys = await this.getAllItems(`/sites/${siteId}/deploys`);
      } else {
        // Get limited number of deploys
        const response = await this.httpClient.get(`/sites/${siteId}/deploys`, {
          params: { per_page: limit }
        });
        deploys = response.data;
      }

      return {
        success: true,
        data: deploys
      };
    } catch (error) {
      return this.handleError(error, 'Failed to get deploys');
    }
  }

  // ===== Site Actions =====

  /**
   * Delete a site
   * Based on n8n implementation: Netlify.node.ts lines 157-160
   */
  private async deleteSite(input: any): Promise<ConnectorResponse> {
    try {
      const { siteId } = input;

      if (!siteId) {
        throw new Error('Site ID is required');
      }

      await this.httpClient.delete(`/sites/${siteId}`);

      return {
        success: true,
        data: {
          success: true,
          message: `Site ${siteId} deleted successfully`
        }
      };
    } catch (error) {
      return this.handleError(error, 'Failed to delete site');
    }
  }

  /**
   * Get information about a specific site
   * Based on n8n implementation: Netlify.node.ts lines 162-165
   */
  private async getSite(input: any): Promise<ConnectorResponse> {
    try {
      const { siteId } = input;

      if (!siteId) {
        throw new Error('Site ID is required');
      }

      const response = await this.httpClient.get(`/sites/${siteId}`);

      return {
        success: true,
        data: response.data
      };
    } catch (error) {
      return this.handleError(error, 'Failed to get site');
    }
  }

  /**
   * Get all sites
   * Based on n8n implementation: Netlify.node.ts lines 167-187
   * Supports pagination with returnAll flag or limit parameter
   */
  private async getAllSites(input: any): Promise<ConnectorResponse> {
    try {
      const { returnAll = false, limit = 50 } = input;

      let sites: any[] = [];

      if (returnAll) {
        // Paginate through all sites
        sites = await this.getAllItems('/sites', { filter: 'all' });
      } else {
        // Get limited number of sites
        const response = await this.httpClient.get('/sites', {
          params: {
            filter: 'all',
            per_page: limit
          }
        });
        sites = response.data;
      }

      return {
        success: true,
        data: sites
      };
    } catch (error) {
      return this.handleError(error, 'Failed to get sites');
    }
  }

  // ===== Helper Methods =====

  /**
   * Paginate through all items using Netlify's link header pagination
   * Based on n8n implementation: GenericFunctions.ts lines 52-75
   */
  private async getAllItems(endpoint: string, baseParams: any = {}): Promise<any[]> {
    const returnData: any[] = [];
    let page = 0;
    const perPage = 100;

    try {
      let hasMore = true;

      while (hasMore) {
        const response = await this.httpClient.get(endpoint, {
          params: {
            ...baseParams,
            page,
            per_page: perPage
          }
        });

        const items = response.data;
        returnData.push(...items);

        // Check if there are more pages using the Link header
        const linkHeader = response.headers.link || response.headers.Link;
        hasMore = linkHeader && linkHeader.includes('next');

        page++;

        // Safety check to prevent infinite loops
        if (page > 1000) {
          this.logger.warn('Pagination safety limit reached (1000 pages)');
          break;
        }
      }

      return returnData;
    } catch (error) {
      this.logger.error('Failed to paginate items:', error.message);
      throw error;
    }
  }
}
