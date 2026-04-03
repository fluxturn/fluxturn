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
export class WebflowConnector extends BaseConnector implements IConnector {
  private client: AxiosInstance;

  getMetadata(): ConnectorMetadata {
    return {
      name: 'Webflow',
      description: 'Webflow website builder and CMS connector',
      version: '1.0.0',
      category: ConnectorCategory.CMS,
      type: ConnectorType.WEBFLOW,
      logoUrl: 'https://cdn.jsdelivr.net/npm/simple-icons@v9/icons/webflow.svg',
      authType: AuthType.OAUTH2,
      actions: [],
      triggers: [],
      rateLimit: {
        requestsPerMinute: 60,
      },
      webhookSupport: true,
    };
  }

  protected async initializeConnection(): Promise<void> {
    const { accessToken } = this.config.credentials;

    if (!accessToken) {
      throw new Error('Webflow access token is required');
    }

    this.client = axios.create({
      baseURL: 'https://api.webflow.com/v2',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'accept-version': '2.0.0',
        'Content-Type': 'application/json',
      },
    });

    this.logger.log('Webflow connector initialized');
  }

  protected async performConnectionTest(): Promise<boolean> {
    try {
      const response = await this.client.get('/token/authorized_by');
      return response.status === 200;
    } catch (error) {
      throw new Error(`Webflow connection test failed: ${error.message}`);
    }
  }

  protected async performHealthCheck(): Promise<void> {
    await this.client.get('/token/authorized_by');
  }

  protected async performRequest(request: ConnectorRequest): Promise<any> {
    const response = await this.client.request({
      method: request.method,
      url: request.endpoint,
      data: request.body,
      params: request.queryParams,
    });
    return response.data;
  }

  protected async performAction(actionId: string, input: any): Promise<any> {
    switch (actionId) {
      // Site actions
      case 'get_sites':
        return this.getSites();
      case 'get_site':
        return this.getSite(input.siteId);
      case 'publish_site':
        return this.publishSite(input.siteId, input.domains);

      // Collection actions
      case 'get_collections':
        return this.getCollections(input.siteId);
      case 'get_collection':
        return this.getCollection(input.collectionId);

      // Collection Item actions
      case 'get_items':
        return this.getItems(input.collectionId, input);
      case 'get_item':
        return this.getItem(input.collectionId, input.itemId);
      case 'create_item':
        return this.createItem(input.collectionId, input);
      case 'update_item':
        return this.updateItem(input.collectionId, input.itemId, input);
      case 'delete_item':
        return this.deleteItem(input.collectionId, input.itemId);
      case 'publish_item':
        return this.publishItem(input.collectionId, input.itemId);
      case 'unpublish_item':
        return this.unpublishItem(input.collectionId, input.itemId);

      // Form actions
      case 'get_forms':
        return this.getForms(input.siteId);
      case 'get_form_submissions':
        return this.getFormSubmissions(input.formId, input);

      // User actions
      case 'get_user':
        return this.getAuthorizedUser();

      default:
        throw new Error(`Unknown action: ${actionId}`);
    }
  }

  protected async cleanup(): Promise<void> {
    this.logger.log('Webflow connector cleanup completed');
  }

  // Site methods
  private async getSites(): Promise<ConnectorResponse> {
    try {
      const response = await this.client.get('/sites');
      return { success: true, data: response.data.sites || [] };
    } catch (error) {
      return this.handleError(error, 'Failed to get sites');
    }
  }

  private async getSite(siteId: string): Promise<ConnectorResponse> {
    try {
      const response = await this.client.get(`/sites/${siteId}`);
      return { success: true, data: response.data };
    } catch (error) {
      return this.handleError(error, 'Failed to get site');
    }
  }

  private async publishSite(siteId: string, domains?: string[]): Promise<ConnectorResponse> {
    try {
      const body = domains ? { customDomains: domains } : {};
      const response = await this.client.post(`/sites/${siteId}/publish`, body);
      return { success: true, data: response.data };
    } catch (error) {
      return this.handleError(error, 'Failed to publish site');
    }
  }

  // Collection methods
  private async getCollections(siteId: string): Promise<ConnectorResponse> {
    try {
      const response = await this.client.get(`/sites/${siteId}/collections`);
      return { success: true, data: response.data.collections || [] };
    } catch (error) {
      return this.handleError(error, 'Failed to get collections');
    }
  }

  private async getCollection(collectionId: string): Promise<ConnectorResponse> {
    try {
      const response = await this.client.get(`/collections/${collectionId}`);
      return { success: true, data: response.data };
    } catch (error) {
      return this.handleError(error, 'Failed to get collection');
    }
  }

  // Collection Item methods
  private async getItems(collectionId: string, input: any): Promise<ConnectorResponse> {
    try {
      const params: any = {};
      if (input.limit) params.limit = input.limit;
      if (input.offset) params.offset = input.offset;

      const response = await this.client.get(`/collections/${collectionId}/items`, { params });
      return { success: true, data: response.data.items || [] };
    } catch (error) {
      return this.handleError(error, 'Failed to get items');
    }
  }

  private async getItem(collectionId: string, itemId: string): Promise<ConnectorResponse> {
    try {
      const response = await this.client.get(`/collections/${collectionId}/items/${itemId}`);
      return { success: true, data: response.data };
    } catch (error) {
      return this.handleError(error, 'Failed to get item');
    }
  }

  private async createItem(collectionId: string, input: any): Promise<ConnectorResponse> {
    try {
      const { collectionId: _, ...fieldData } = input;
      const response = await this.client.post(`/collections/${collectionId}/items`, {
        fieldData,
        isArchived: input.isArchived || false,
        isDraft: input.isDraft || false,
      });
      return { success: true, data: response.data };
    } catch (error) {
      return this.handleError(error, 'Failed to create item');
    }
  }

  private async updateItem(collectionId: string, itemId: string, input: any): Promise<ConnectorResponse> {
    try {
      const { collectionId: _, itemId: __, ...fieldData } = input;
      const response = await this.client.patch(`/collections/${collectionId}/items/${itemId}`, {
        fieldData,
        isArchived: input.isArchived,
        isDraft: input.isDraft,
      });
      return { success: true, data: response.data };
    } catch (error) {
      return this.handleError(error, 'Failed to update item');
    }
  }

  private async deleteItem(collectionId: string, itemId: string): Promise<ConnectorResponse> {
    try {
      await this.client.delete(`/collections/${collectionId}/items/${itemId}`);
      return { success: true, data: { deleted: true } };
    } catch (error) {
      return this.handleError(error, 'Failed to delete item');
    }
  }

  private async publishItem(collectionId: string, itemId: string): Promise<ConnectorResponse> {
    try {
      const response = await this.client.post(`/collections/${collectionId}/items/publish`, {
        itemIds: [itemId],
      });
      return { success: true, data: response.data };
    } catch (error) {
      return this.handleError(error, 'Failed to publish item');
    }
  }

  private async unpublishItem(collectionId: string, itemId: string): Promise<ConnectorResponse> {
    try {
      const response = await this.client.patch(`/collections/${collectionId}/items/${itemId}`, {
        isDraft: true,
      });
      return { success: true, data: response.data };
    } catch (error) {
      return this.handleError(error, 'Failed to unpublish item');
    }
  }

  // Form methods
  private async getForms(siteId: string): Promise<ConnectorResponse> {
    try {
      const response = await this.client.get(`/sites/${siteId}/forms`);
      return { success: true, data: response.data.forms || [] };
    } catch (error) {
      return this.handleError(error, 'Failed to get forms');
    }
  }

  private async getFormSubmissions(formId: string, input: any): Promise<ConnectorResponse> {
    try {
      const params: any = {};
      if (input.limit) params.limit = input.limit;
      if (input.offset) params.offset = input.offset;

      const response = await this.client.get(`/forms/${formId}/submissions`, { params });
      return { success: true, data: response.data.submissions || [] };
    } catch (error) {
      return this.handleError(error, 'Failed to get form submissions');
    }
  }

  // User methods
  private async getAuthorizedUser(): Promise<ConnectorResponse> {
    try {
      const response = await this.client.get('/token/authorized_by');
      return { success: true, data: response.data };
    } catch (error) {
      return this.handleError(error, 'Failed to get authorized user');
    }
  }
}
