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
export class ActiveCampaignConnector extends BaseConnector implements IConnector {
  private client: AxiosInstance;

  getMetadata(): ConnectorMetadata {
    return {
      name: 'ActiveCampaign',
      description: 'ActiveCampaign marketing automation and CRM connector',
      version: '1.0.0',
      category: ConnectorCategory.MARKETING,
      type: ConnectorType.ACTIVECAMPAIGN,
      logoUrl: 'https://cdn.jsdelivr.net/npm/simple-icons@v9/icons/activecampaign.svg',
      authType: AuthType.API_KEY,
      actions: [],
      triggers: [],
      rateLimit: {
        requestsPerSecond: 5,
      },
      webhookSupport: true,
    };
  }

  protected async initializeConnection(): Promise<void> {
    const { apiKey, apiUrl } = this.config.credentials;

    if (!apiKey || !apiUrl) {
      throw new Error('ActiveCampaign API key and API URL are required');
    }

    const baseUrl = apiUrl.endsWith('/api/3')
      ? apiUrl
      : `${apiUrl.replace(/\/$/, '')}/api/3`;

    this.client = axios.create({
      baseURL: baseUrl,
      headers: {
        'Api-Token': apiKey,
        'Content-Type': 'application/json',
      },
    });

    this.logger.log('ActiveCampaign connector initialized');
  }

  protected async performConnectionTest(): Promise<boolean> {
    try {
      const response = await this.client.get('/users/me');
      return response.status === 200;
    } catch (error) {
      throw new Error(`ActiveCampaign connection test failed: ${error.message}`);
    }
  }

  protected async performHealthCheck(): Promise<void> {
    await this.client.get('/users/me');
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
      // Contact actions
      case 'create_contact':
        return this.createContact(input);
      case 'get_contact':
        return this.getContact(input.contactId);
      case 'get_contacts':
      case 'get_all_contacts':
        return this.getContacts(input);
      case 'update_contact':
        return this.updateContact(input.contactId, input);
      case 'delete_contact':
        return this.deleteContact(input.contactId);

      // Contact Tag actions
      case 'add_tag_to_contact':
        return this.addTagToContact(input.contactId, input.tagId);
      case 'remove_tag_from_contact':
        return this.removeTagFromContact(input.contactTagId);

      // Contact List actions
      case 'add_contact_to_list':
        return this.addContactToList(input.contactId, input.listId, input.status);
      case 'remove_contact_from_list':
        return this.removeContactFromList(input.contactListId);

      // Deal actions
      case 'create_deal':
        return this.createDeal(input);
      case 'get_deal':
        return this.getDeal(input.dealId);
      case 'get_deals':
      case 'get_all_deals':
        return this.getDeals(input);
      case 'update_deal':
        return this.updateDeal(input.dealId, input);
      case 'delete_deal':
        return this.deleteDeal(input.dealId);

      // Account actions
      case 'create_account':
        return this.createAccount(input);
      case 'get_account':
        return this.getAccount(input.accountId);
      case 'get_accounts':
      case 'get_all_accounts':
        return this.getAccounts(input);
      case 'update_account':
        return this.updateAccount(input.accountId, input);

      // Tag actions
      case 'create_tag':
        return this.createTag(input);
      case 'get_tags':
      case 'get_all_tags':
        return this.getTags(input);

      // List actions
      case 'create_list':
        return this.createList(input);
      case 'get_lists':
      case 'get_all_lists':
        return this.getLists(input);

      default:
        throw new Error(`Unknown action: ${actionId}`);
    }
  }

  protected async cleanup(): Promise<void> {
    this.logger.log('ActiveCampaign connector cleanup completed');
  }

  // Contact methods
  private async createContact(input: any): Promise<ConnectorResponse> {
    try {
      const response = await this.client.post('/contacts', { contact: input });
      return { success: true, data: response.data.contact };
    } catch (error: any) {
      // Extract actual error message from ActiveCampaign API response
      const apiError = error.response?.data?.errors?.[0]?.title
        || error.response?.data?.message
        || error.message;
      return this.handleError(error, `Failed to create contact: ${apiError}`);
    }
  }

  private async getContact(contactId: string): Promise<ConnectorResponse> {
    try {
      const response = await this.client.get(`/contacts/${contactId}`);
      return { success: true, data: response.data.contact };
    } catch (error) {
      return this.handleError(error, 'Failed to get contact');
    }
  }

  private async getContacts(input: any): Promise<ConnectorResponse> {
    try {
      const params: any = {};
      if (input.email) params.email = input.email;
      if (input.limit) params.limit = input.limit;
      if (input.offset) params.offset = input.offset;
      if (input.search) params.search = input.search;

      const response = await this.client.get('/contacts', { params });
      return { success: true, data: response.data.contacts || [] };
    } catch (error) {
      return this.handleError(error, 'Failed to get contacts');
    }
  }

  private async updateContact(contactId: string, input: any): Promise<ConnectorResponse> {
    try {
      const { contactId: _, ...data } = input;
      const response = await this.client.put(`/contacts/${contactId}`, { contact: data });
      return { success: true, data: response.data.contact };
    } catch (error) {
      return this.handleError(error, 'Failed to update contact');
    }
  }

  private async deleteContact(contactId: string): Promise<ConnectorResponse> {
    try {
      await this.client.delete(`/contacts/${contactId}`);
      return { success: true, data: { deleted: true } };
    } catch (error) {
      return this.handleError(error, 'Failed to delete contact');
    }
  }

  // Contact Tag methods
  private async addTagToContact(contactId: string, tagId: string): Promise<ConnectorResponse> {
    try {
      const response = await this.client.post('/contactTags', {
        contactTag: {
          contact: contactId,
          tag: tagId,
        },
      });
      return { success: true, data: response.data.contactTag };
    } catch (error) {
      return this.handleError(error, 'Failed to add tag to contact');
    }
  }

  private async removeTagFromContact(contactTagId: string): Promise<ConnectorResponse> {
    try {
      await this.client.delete(`/contactTags/${contactTagId}`);
      return { success: true, data: { deleted: true } };
    } catch (error) {
      return this.handleError(error, 'Failed to remove tag from contact');
    }
  }

  // Contact List methods
  private async addContactToList(contactId: string, listId: string, status: number = 1): Promise<ConnectorResponse> {
    try {
      const response = await this.client.post('/contactLists', {
        contactList: {
          contact: contactId,
          list: listId,
          status,
        },
      });
      return { success: true, data: response.data.contactList };
    } catch (error) {
      return this.handleError(error, 'Failed to add contact to list');
    }
  }

  private async removeContactFromList(contactListId: string): Promise<ConnectorResponse> {
    try {
      await this.client.delete(`/contactLists/${contactListId}`);
      return { success: true, data: { deleted: true } };
    } catch (error) {
      return this.handleError(error, 'Failed to remove contact from list');
    }
  }

  // Deal methods
  private async createDeal(input: any): Promise<ConnectorResponse> {
    try {
      const response = await this.client.post('/deals', { deal: input });
      return { success: true, data: response.data.deal };
    } catch (error) {
      return this.handleError(error, 'Failed to create deal');
    }
  }

  private async getDeal(dealId: string): Promise<ConnectorResponse> {
    try {
      const response = await this.client.get(`/deals/${dealId}`);
      return { success: true, data: response.data.deal };
    } catch (error) {
      return this.handleError(error, 'Failed to get deal');
    }
  }

  private async getDeals(input: any): Promise<ConnectorResponse> {
    try {
      const params: any = {};
      if (input.limit) params.limit = input.limit;
      if (input.offset) params.offset = input.offset;
      if (input.search) params.search = input.search;

      const response = await this.client.get('/deals', { params });
      return { success: true, data: response.data.deals || [] };
    } catch (error) {
      return this.handleError(error, 'Failed to get deals');
    }
  }

  private async updateDeal(dealId: string, input: any): Promise<ConnectorResponse> {
    try {
      const { dealId: _, ...data } = input;
      const response = await this.client.put(`/deals/${dealId}`, { deal: data });
      return { success: true, data: response.data.deal };
    } catch (error) {
      return this.handleError(error, 'Failed to update deal');
    }
  }

  private async deleteDeal(dealId: string): Promise<ConnectorResponse> {
    try {
      await this.client.delete(`/deals/${dealId}`);
      return { success: true, data: { deleted: true } };
    } catch (error) {
      return this.handleError(error, 'Failed to delete deal');
    }
  }

  // Account methods
  private async createAccount(input: any): Promise<ConnectorResponse> {
    try {
      const response = await this.client.post('/accounts', { account: input });
      return { success: true, data: response.data.account };
    } catch (error) {
      return this.handleError(error, 'Failed to create account');
    }
  }

  private async getAccount(accountId: string): Promise<ConnectorResponse> {
    try {
      const response = await this.client.get(`/accounts/${accountId}`);
      return { success: true, data: response.data.account };
    } catch (error) {
      return this.handleError(error, 'Failed to get account');
    }
  }

  private async getAccounts(input: any): Promise<ConnectorResponse> {
    try {
      const params: any = {};
      if (input.limit) params.limit = input.limit;
      if (input.offset) params.offset = input.offset;
      if (input.search) params.search = input.search;

      const response = await this.client.get('/accounts', { params });
      return { success: true, data: response.data.accounts || [] };
    } catch (error) {
      return this.handleError(error, 'Failed to get accounts');
    }
  }

  private async updateAccount(accountId: string, input: any): Promise<ConnectorResponse> {
    try {
      const { accountId: _, ...data } = input;
      const response = await this.client.put(`/accounts/${accountId}`, { account: data });
      return { success: true, data: response.data.account };
    } catch (error) {
      return this.handleError(error, 'Failed to update account');
    }
  }

  // Tag methods
  private async createTag(input: any): Promise<ConnectorResponse> {
    try {
      const response = await this.client.post('/tags', { tag: input });
      return { success: true, data: response.data.tag };
    } catch (error) {
      return this.handleError(error, 'Failed to create tag');
    }
  }

  private async getTags(input: any): Promise<ConnectorResponse> {
    try {
      const params: any = {};
      if (input.limit) params.limit = input.limit;
      if (input.search) params.search = input.search;

      const response = await this.client.get('/tags', { params });
      return { success: true, data: response.data.tags || [] };
    } catch (error) {
      return this.handleError(error, 'Failed to get tags');
    }
  }

  // List methods
  private async createList(input: any): Promise<ConnectorResponse> {
    try {
      const response = await this.client.post('/lists', { list: input });
      return { success: true, data: response.data.list };
    } catch (error) {
      return this.handleError(error, 'Failed to create list');
    }
  }

  private async getLists(input: any): Promise<ConnectorResponse> {
    try {
      const params: any = {};
      if (input.limit) params.limit = input.limit;

      const response = await this.client.get('/lists', { params });
      return { success: true, data: response.data.lists || [] };
    } catch (error) {
      return this.handleError(error, 'Failed to get lists');
    }
  }
}
