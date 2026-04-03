import { Injectable, Logger } from '@nestjs/common';
import axios, { AxiosInstance } from 'axios';
import { BaseConnector } from '../../base/base.connector';
import { IConnector } from '../../base/connector.interface';
import {
  ConnectorMetadata,
  ConnectorType,
  ConnectorCategory,
  AuthType,
  ConnectorRequest,
  ConnectorResponse,
} from '../../types/index';

@Injectable()
export class ContentfulConnector extends BaseConnector implements IConnector {
  private deliveryClient: AxiosInstance;
  private previewClient: AxiosInstance;
  private managementClient: AxiosInstance;
  private spaceId: string;

  getMetadata(): ConnectorMetadata {
    return {
      name: 'Contentful',
      description: 'Contentful headless CMS connector',
      version: '1.0.0',
      category: ConnectorCategory.CMS,
      type: ConnectorType.CONTENTFUL,
      logoUrl: 'https://cdn.jsdelivr.net/npm/simple-icons@v9/icons/contentful.svg',
      authType: AuthType.API_KEY,
      actions: [],
      triggers: [],
      rateLimit: {
        requestsPerSecond: 10,
      },
      webhookSupport: true,
    };
  }

  protected async initializeConnection(): Promise<void> {
    const { spaceId, deliveryAccessToken, previewAccessToken, managementAccessToken } = this.config.credentials;

    if (!spaceId) {
      throw new Error('Contentful space ID is required');
    }

    this.spaceId = spaceId;

    // Delivery API client (published content)
    if (deliveryAccessToken) {
      this.deliveryClient = axios.create({
        baseURL: 'https://cdn.contentful.com',
        headers: {
          'Authorization': `Bearer ${deliveryAccessToken}`,
          'Content-Type': 'application/json',
        },
      });
    }

    // Preview API client (draft content)
    if (previewAccessToken) {
      this.previewClient = axios.create({
        baseURL: 'https://preview.contentful.com',
        headers: {
          'Authorization': `Bearer ${previewAccessToken}`,
          'Content-Type': 'application/json',
        },
      });
    }

    // Management API client (create/update content)
    if (managementAccessToken) {
      this.managementClient = axios.create({
        baseURL: 'https://api.contentful.com',
        headers: {
          'Authorization': `Bearer ${managementAccessToken}`,
          'Content-Type': 'application/vnd.contentful.management.v1+json',
        },
      });
    }

    this.logger.log('Contentful connector initialized');
  }

  private getClient(source: string): AxiosInstance {
    if (source === 'previewApi' && this.previewClient) {
      return this.previewClient;
    }
    return this.deliveryClient;
  }

  protected async performConnectionTest(): Promise<boolean> {
    try {
      const client = this.deliveryClient || this.previewClient || this.managementClient;
      if (!client) {
        throw new Error('No Contentful API client configured');
      }
      const response = await client.get(`/spaces/${this.spaceId}`);
      return response.status === 200;
    } catch (error) {
      throw new Error(`Contentful connection test failed: ${error.message}`);
    }
  }

  protected async performHealthCheck(): Promise<void> {
    const client = this.deliveryClient || this.previewClient;
    await client.get(`/spaces/${this.spaceId}`);
  }

  protected async performRequest(request: ConnectorRequest): Promise<any> {
    const client = this.deliveryClient;
    const response = await client.request({
      method: request.method,
      url: request.endpoint,
      data: request.body,
      params: request.queryParams,
    });
    return response.data;
  }

  protected async performAction(actionId: string, input: any): Promise<any> {
    switch (actionId) {
      // Space actions
      case 'get_space':
        return this.getSpace();

      // Entry actions
      case 'get_entry':
        return this.getEntry(input);
      case 'get_entries':
        return this.getEntries(input);
      case 'create_entry':
        return this.createEntry(input);
      case 'update_entry':
        return this.updateEntry(input);
      case 'delete_entry':
        return this.deleteEntry(input.environmentId, input.entryId);
      case 'publish_entry':
        return this.publishEntry(input.environmentId, input.entryId, input.version);
      case 'unpublish_entry':
        return this.unpublishEntry(input.environmentId, input.entryId);
      case 'search_entries':
        return this.searchEntries(input);

      // Asset actions
      case 'get_asset':
        return this.getAsset(input);
      case 'get_assets':
        return this.getAssets(input);
      case 'create_asset':
        return this.createAsset(input);
      case 'process_asset':
        return this.processAsset(input);
      case 'publish_asset':
        return this.publishAsset(input.environmentId, input.assetId, input.version);
      case 'delete_asset':
        return this.deleteAsset(input.environmentId, input.assetId);

      // Content Type actions
      case 'get_content_type':
        return this.getContentType(input);
      case 'get_content_types':
        return this.getContentTypes(input);

      // Locale actions
      case 'get_locales':
        return this.getLocales(input.environmentId);

      // Environment actions
      case 'get_environments':
        return this.getEnvironments();

      default:
        throw new Error(`Unknown action: ${actionId}`);
    }
  }

  protected async cleanup(): Promise<void> {
    this.logger.log('Contentful connector cleanup completed');
  }

  // Space methods
  private async getSpace(): Promise<ConnectorResponse> {
    try {
      const client = this.deliveryClient || this.previewClient;
      const response = await client.get(`/spaces/${this.spaceId}`);
      return { success: true, data: response.data };
    } catch (error) {
      return this.handleError(error, 'Failed to get space');
    }
  }

  // Entry methods
  private async getEntry(input: any): Promise<ConnectorResponse> {
    try {
      const client = this.getClient(input.source);
      const params: any = {};
      if (input.locale) params.locale = input.locale;
      if (input.include) params.include = input.include;

      const response = await client.get(
        `/spaces/${this.spaceId}/environments/${input.environmentId}/entries/${input.entryId}`,
        { params }
      );
      return { success: true, data: input.rawData ? response.data : response.data.fields };
    } catch (error) {
      return this.handleError(error, 'Failed to get entry');
    }
  }

  private async getEntries(input: any): Promise<ConnectorResponse> {
    try {
      const client = this.getClient(input.source);
      const params: any = {};
      if (input.content_type) params.content_type = input.content_type;
      if (input.limit) params.limit = input.limit;
      if (input.skip) params.skip = input.skip;
      if (input.order) params.order = input.order;
      if (input.query) params.query = input.query;
      if (input.select) params.select = input.select;
      if (input.locale) params.locale = input.locale;
      if (input.include) params.include = input.include;

      const response = await client.get(
        `/spaces/${this.spaceId}/environments/${input.environmentId}/entries`,
        { params }
      );
      return {
        success: true,
        data: {
          items: input.rawData ? response.data.items : response.data.items.map((e: any) => e.fields),
          total: response.data.total,
          skip: response.data.skip,
          limit: response.data.limit,
        },
      };
    } catch (error) {
      return this.handleError(error, 'Failed to get entries');
    }
  }

  private async createEntry(input: any): Promise<ConnectorResponse> {
    try {
      if (!this.managementClient) {
        throw new Error('Management API token required for creating entries');
      }

      const response = await this.managementClient.post(
        `/spaces/${this.spaceId}/environments/${input.environmentId}/entries`,
        { fields: input.fields },
        {
          headers: {
            'X-Contentful-Content-Type': input.contentTypeId,
          },
        }
      );
      return { success: true, data: response.data };
    } catch (error) {
      return this.handleError(error, 'Failed to create entry');
    }
  }

  private async updateEntry(input: any): Promise<ConnectorResponse> {
    try {
      if (!this.managementClient) {
        throw new Error('Management API token required for updating entries');
      }

      const response = await this.managementClient.put(
        `/spaces/${this.spaceId}/environments/${input.environmentId}/entries/${input.entryId}`,
        { fields: input.fields },
        {
          headers: {
            'X-Contentful-Version': input.version.toString(),
          },
        }
      );
      return { success: true, data: response.data };
    } catch (error) {
      return this.handleError(error, 'Failed to update entry');
    }
  }

  private async deleteEntry(environmentId: string, entryId: string): Promise<ConnectorResponse> {
    try {
      if (!this.managementClient) {
        throw new Error('Management API token required for deleting entries');
      }

      await this.managementClient.delete(
        `/spaces/${this.spaceId}/environments/${environmentId}/entries/${entryId}`
      );
      return { success: true, data: { deleted: true } };
    } catch (error) {
      return this.handleError(error, 'Failed to delete entry');
    }
  }

  private async publishEntry(environmentId: string, entryId: string, version: number): Promise<ConnectorResponse> {
    try {
      if (!this.managementClient) {
        throw new Error('Management API token required for publishing entries');
      }

      const response = await this.managementClient.put(
        `/spaces/${this.spaceId}/environments/${environmentId}/entries/${entryId}/published`,
        {},
        {
          headers: {
            'X-Contentful-Version': version.toString(),
          },
        }
      );
      return { success: true, data: response.data };
    } catch (error) {
      return this.handleError(error, 'Failed to publish entry');
    }
  }

  private async unpublishEntry(environmentId: string, entryId: string): Promise<ConnectorResponse> {
    try {
      if (!this.managementClient) {
        throw new Error('Management API token required for unpublishing entries');
      }

      const response = await this.managementClient.delete(
        `/spaces/${this.spaceId}/environments/${environmentId}/entries/${entryId}/published`
      );
      return { success: true, data: response.data };
    } catch (error) {
      return this.handleError(error, 'Failed to unpublish entry');
    }
  }

  private async searchEntries(input: any): Promise<ConnectorResponse> {
    return this.getEntries(input);
  }

  // Asset methods
  private async getAsset(input: any): Promise<ConnectorResponse> {
    try {
      const client = this.getClient(input.source);
      const params: any = {};
      if (input.locale) params.locale = input.locale;

      const response = await client.get(
        `/spaces/${this.spaceId}/environments/${input.environmentId}/assets/${input.assetId}`,
        { params }
      );
      return { success: true, data: input.rawData ? response.data : response.data.fields };
    } catch (error) {
      return this.handleError(error, 'Failed to get asset');
    }
  }

  private async getAssets(input: any): Promise<ConnectorResponse> {
    try {
      const client = this.getClient(input.source);
      const params: any = {};
      if (input.limit) params.limit = input.limit;
      if (input.skip) params.skip = input.skip;
      if (input.mimetype_group) params.mimetype_group = input.mimetype_group;
      if (input.order) params.order = input.order;
      if (input.query) params.query = input.query;

      const response = await client.get(
        `/spaces/${this.spaceId}/environments/${input.environmentId}/assets`,
        { params }
      );
      return {
        success: true,
        data: {
          items: input.rawData ? response.data.items : response.data.items.map((a: any) => a.fields),
          total: response.data.total,
          skip: response.data.skip,
          limit: response.data.limit,
        },
      };
    } catch (error) {
      return this.handleError(error, 'Failed to get assets');
    }
  }

  private async createAsset(input: any): Promise<ConnectorResponse> {
    try {
      if (!this.managementClient) {
        throw new Error('Management API token required for creating assets');
      }

      const locale = input.locale || 'en-US';
      const response = await this.managementClient.post(
        `/spaces/${this.spaceId}/environments/${input.environmentId}/assets`,
        {
          fields: {
            title: { [locale]: input.title },
            description: { [locale]: input.description },
            file: {
              [locale]: {
                contentType: input.contentType,
                fileName: input.fileName,
                upload: input.uploadUrl,
              },
            },
          },
        }
      );
      return { success: true, data: response.data };
    } catch (error) {
      return this.handleError(error, 'Failed to create asset');
    }
  }

  private async processAsset(input: any): Promise<ConnectorResponse> {
    try {
      if (!this.managementClient) {
        throw new Error('Management API token required for processing assets');
      }

      await this.managementClient.put(
        `/spaces/${this.spaceId}/environments/${input.environmentId}/assets/${input.assetId}/files/${input.locale}/process`,
        {},
        {
          headers: {
            'X-Contentful-Version': input.version.toString(),
          },
        }
      );
      return { success: true, data: { processing: true } };
    } catch (error) {
      return this.handleError(error, 'Failed to process asset');
    }
  }

  private async publishAsset(environmentId: string, assetId: string, version: number): Promise<ConnectorResponse> {
    try {
      if (!this.managementClient) {
        throw new Error('Management API token required for publishing assets');
      }

      const response = await this.managementClient.put(
        `/spaces/${this.spaceId}/environments/${environmentId}/assets/${assetId}/published`,
        {},
        {
          headers: {
            'X-Contentful-Version': version.toString(),
          },
        }
      );
      return { success: true, data: response.data };
    } catch (error) {
      return this.handleError(error, 'Failed to publish asset');
    }
  }

  private async deleteAsset(environmentId: string, assetId: string): Promise<ConnectorResponse> {
    try {
      if (!this.managementClient) {
        throw new Error('Management API token required for deleting assets');
      }

      await this.managementClient.delete(
        `/spaces/${this.spaceId}/environments/${environmentId}/assets/${assetId}`
      );
      return { success: true, data: { deleted: true } };
    } catch (error) {
      return this.handleError(error, 'Failed to delete asset');
    }
  }

  // Content Type methods
  private async getContentType(input: any): Promise<ConnectorResponse> {
    try {
      const client = this.deliveryClient || this.previewClient;
      const response = await client.get(
        `/spaces/${this.spaceId}/environments/${input.environmentId}/content_types/${input.contentTypeId}`
      );
      return { success: true, data: input.rawData ? response.data : response.data.fields };
    } catch (error) {
      return this.handleError(error, 'Failed to get content type');
    }
  }

  private async getContentTypes(input: any): Promise<ConnectorResponse> {
    try {
      const client = this.deliveryClient || this.previewClient;
      const params: any = {};
      if (input.limit) params.limit = input.limit;

      const response = await client.get(
        `/spaces/${this.spaceId}/environments/${input.environmentId}/content_types`,
        { params }
      );
      return {
        success: true,
        data: {
          items: response.data.items,
          total: response.data.total,
        },
      };
    } catch (error) {
      return this.handleError(error, 'Failed to get content types');
    }
  }

  // Locale methods
  private async getLocales(environmentId: string): Promise<ConnectorResponse> {
    try {
      const client = this.deliveryClient || this.previewClient;
      const response = await client.get(
        `/spaces/${this.spaceId}/environments/${environmentId}/locales`
      );
      return {
        success: true,
        data: {
          items: response.data.items,
          total: response.data.total,
        },
      };
    } catch (error) {
      return this.handleError(error, 'Failed to get locales');
    }
  }

  // Environment methods
  private async getEnvironments(): Promise<ConnectorResponse> {
    try {
      if (!this.managementClient) {
        throw new Error('Management API token required for getting environments');
      }

      const response = await this.managementClient.get(
        `/spaces/${this.spaceId}/environments`
      );
      return {
        success: true,
        data: {
          items: response.data.items,
          total: response.data.total,
        },
      };
    } catch (error) {
      return this.handleError(error, 'Failed to get environments');
    }
  }
}
