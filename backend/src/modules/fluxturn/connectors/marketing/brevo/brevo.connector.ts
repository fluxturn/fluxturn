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
export class BrevoConnector extends BaseConnector implements IConnector {
  private client: AxiosInstance;

  getMetadata(): ConnectorMetadata {
    return {
      name: 'Brevo',
      description: 'Brevo (formerly Sendinblue) email marketing and CRM connector',
      version: '1.0.0',
      category: ConnectorCategory.MARKETING,
      type: ConnectorType.BREVO,
      logoUrl: 'https://cdn.jsdelivr.net/npm/simple-icons@v9/icons/brevo.svg',
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
    const apiKey = this.config.credentials?.apiKey?.trim();

    if (!apiKey) {
      throw new Error('Brevo API key is required');
    }

    this.client = axios.create({
      baseURL: 'https://api.brevo.com/v3',
      headers: {
        'api-key': apiKey,
        'Content-Type': 'application/json',
      },
    });

    this.logger.log('Brevo connector initialized');
  }

  protected async performConnectionTest(): Promise<boolean> {
    try {
      const response = await this.client.get('/account');
      return response.status === 200;
    } catch (error) {
      throw new Error(`Brevo connection test failed: ${error.message}`);
    }
  }

  protected async performHealthCheck(): Promise<void> {
    await this.client.get('/account');
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
        return this.getContact(input.identifier);
      case 'get_all_contacts':
        return this.getContacts(input);
      case 'update_contact':
        return this.updateContact(input.identifier, input);
      case 'delete_contact':
        return this.deleteContact(input.identifier);

      // Email actions
      case 'send_transactional_email':
        return this.sendTransactionalEmail(input);
      case 'send_email_template':
        return this.sendEmailTemplate(input);
      case 'get_email_events':
        return this.getEmailEvents(input);

      // List actions
      case 'create_list':
        return this.createList(input);
      case 'get_lists':
        return this.getLists(input);
      case 'get_list':
        return this.getList(input.listId);
      case 'update_list':
        return this.updateList(input.listId, input);
      case 'delete_list':
        return this.deleteList(input.listId);
      case 'add_contacts_to_list':
        return this.addContactsToList(input.listId, input.emails);
      case 'remove_contacts_from_list':
        return this.removeContactsFromList(input.listId, input.emails);
      case 'get_folders':
        return this.getFolders(input);

      // Sender actions
      case 'get_senders':
        return this.getSenders(input);
      case 'create_sender':
        return this.createSender(input);
      case 'update_sender':
        return this.updateSender(input.senderId, input);
      case 'delete_sender':
        return this.deleteSender(input.senderId);

      // Attribute actions
      case 'get_attributes':
        return this.getAttributes();
      case 'create_attribute':
        return this.createAttribute(input);
      case 'delete_attribute':
        return this.deleteAttribute(input.attributeCategory, input.attributeName);

      // Account actions
      case 'get_account':
        return this.getAccount();

      default:
        throw new Error(`Unknown action: ${actionId}`);
    }
  }

  protected async cleanup(): Promise<void> {
    this.logger.log('Brevo connector cleanup completed');
  }

  // Contact methods
  private async createContact(input: any): Promise<ConnectorResponse> {
    try {
      const response = await this.client.post('/contacts', input);
      return { success: true, data: response.data };
    } catch (error) {
      return this.handleError(error, 'Failed to create contact');
    }
  }

  private async getContact(identifier: string): Promise<ConnectorResponse> {
    try {
      const response = await this.client.get(`/contacts/${encodeURIComponent(identifier)}`);
      return { success: true, data: response.data };
    } catch (error) {
      return this.handleError(error, 'Failed to get contact');
    }
  }

  private async getContacts(input: any): Promise<ConnectorResponse> {
    try {
      const params: any = {};
      if (input.limit) params.limit = input.limit;
      if (input.offset) params.offset = input.offset;
      if (input.modifiedSince) params.modifiedSince = input.modifiedSince;

      const response = await this.client.get('/contacts', { params });
      return { success: true, data: response.data.contacts || [] };
    } catch (error) {
      return this.handleError(error, 'Failed to get contacts');
    }
  }

  private async updateContact(identifier: string, input: any): Promise<ConnectorResponse> {
    try {
      const { identifier: _, ...data } = input;
      await this.client.put(`/contacts/${encodeURIComponent(identifier)}`, data);
      return { success: true, data: { updated: true } };
    } catch (error) {
      return this.handleError(error, 'Failed to update contact');
    }
  }

  private async deleteContact(identifier: string): Promise<ConnectorResponse> {
    try {
      await this.client.delete(`/contacts/${encodeURIComponent(identifier)}`);
      return { success: true, data: { deleted: true } };
    } catch (error) {
      return this.handleError(error, 'Failed to delete contact');
    }
  }

  // Email methods
  private async sendTransactionalEmail(input: any): Promise<ConnectorResponse> {
    try {
      const response = await this.client.post('/smtp/email', input);
      return { success: true, data: response.data };
    } catch (error) {
      return this.handleError(error, 'Failed to send transactional email');
    }
  }

  private async sendEmailTemplate(input: any): Promise<ConnectorResponse> {
    try {
      const response = await this.client.post('/smtp/email', {
        templateId: input.templateId,
        to: input.to,
        params: input.params,
        replyTo: input.replyTo,
        attachment: input.attachment,
        headers: input.headers,
        tags: input.tags,
      });
      return { success: true, data: response.data };
    } catch (error) {
      return this.handleError(error, 'Failed to send email template');
    }
  }

  private async getEmailEvents(input: any): Promise<ConnectorResponse> {
    try {
      const params: any = {};
      if (input.limit) params.limit = input.limit;
      if (input.offset) params.offset = input.offset;
      if (input.startDate) params.startDate = input.startDate;
      if (input.endDate) params.endDate = input.endDate;
      if (input.email) params.email = input.email;
      if (input.event) params.event = input.event;
      if (input.messageId) params.messageId = input.messageId;

      const response = await this.client.get('/smtp/statistics/events', { params });
      return { success: true, data: response.data };
    } catch (error) {
      return this.handleError(error, 'Failed to get email events');
    }
  }

  // List methods
  private async createList(input: any): Promise<ConnectorResponse> {
    try {
      const response = await this.client.post('/contacts/lists', input);
      return { success: true, data: response.data };
    } catch (error) {
      return this.handleError(error, 'Failed to create list');
    }
  }

  private async getLists(input: any): Promise<ConnectorResponse> {
    try {
      const params: any = {};
      if (input.limit) params.limit = input.limit;
      if (input.offset) params.offset = input.offset;

      const response = await this.client.get('/contacts/lists', { params });
      return { success: true, data: response.data.lists || [] };
    } catch (error) {
      return this.handleError(error, 'Failed to get lists');
    }
  }

  private async getList(listId: string): Promise<ConnectorResponse> {
    try {
      const response = await this.client.get(`/contacts/lists/${listId}`);
      return { success: true, data: response.data };
    } catch (error) {
      return this.handleError(error, 'Failed to get list');
    }
  }

  private async updateList(listId: string, input: any): Promise<ConnectorResponse> {
    try {
      const { listId: _, ...data } = input;
      await this.client.put(`/contacts/lists/${listId}`, data);
      return { success: true, data: { updated: true } };
    } catch (error) {
      return this.handleError(error, 'Failed to update list');
    }
  }

  private async deleteList(listId: string): Promise<ConnectorResponse> {
    try {
      await this.client.delete(`/contacts/lists/${listId}`);
      return { success: true, data: { deleted: true } };
    } catch (error) {
      return this.handleError(error, 'Failed to delete list');
    }
  }

  private async addContactsToList(listId: string, emails: string[]): Promise<ConnectorResponse> {
    try {
      await this.client.post(`/contacts/lists/${listId}/contacts/add`, { emails });
      return { success: true, data: { added: true } };
    } catch (error) {
      return this.handleError(error, 'Failed to add contacts to list');
    }
  }

  private async removeContactsFromList(listId: string, emails: string[]): Promise<ConnectorResponse> {
    try {
      await this.client.post(`/contacts/lists/${listId}/contacts/remove`, { emails });
      return { success: true, data: { removed: true } };
    } catch (error) {
      return this.handleError(error, 'Failed to remove contacts from list');
    }
  }

  private async getFolders(input: any): Promise<ConnectorResponse> {
    try {
      const params: any = {};
      if (input.limit) params.limit = input.limit;
      if (input.offset) params.offset = input.offset;

      const response = await this.client.get('/contacts/folders', { params });
      return { success: true, data: response.data };
    } catch (error) {
      return this.handleError(error, 'Failed to get folders');
    }
  }

  // Sender methods
  private async getSenders(input: any): Promise<ConnectorResponse> {
    try {
      const params: any = {};
      if (input.ip) params.ip = input.ip;
      if (input.domain) params.domain = input.domain;

      const response = await this.client.get('/senders', { params });
      return { success: true, data: response.data.senders || [] };
    } catch (error) {
      return this.handleError(error, 'Failed to get senders');
    }
  }

  private async createSender(input: any): Promise<ConnectorResponse> {
    try {
      const response = await this.client.post('/senders', input);
      return { success: true, data: response.data };
    } catch (error) {
      return this.handleError(error, 'Failed to create sender');
    }
  }

  private async updateSender(senderId: number, input: any): Promise<ConnectorResponse> {
    try {
      const { senderId: _, ...data } = input;
      await this.client.put(`/senders/${senderId}`, data);
      return { success: true, data: { updated: true } };
    } catch (error) {
      return this.handleError(error, 'Failed to update sender');
    }
  }

  private async deleteSender(senderId: number): Promise<ConnectorResponse> {
    try {
      await this.client.delete(`/senders/${senderId}`);
      return { success: true, data: { deleted: true } };
    } catch (error) {
      return this.handleError(error, 'Failed to delete sender');
    }
  }

  // Attribute methods
  private async getAttributes(): Promise<ConnectorResponse> {
    try {
      const response = await this.client.get('/contacts/attributes');
      return { success: true, data: response.data.attributes || [] };
    } catch (error) {
      return this.handleError(error, 'Failed to get attributes');
    }
  }

  private async createAttribute(input: any): Promise<ConnectorResponse> {
    try {
      await this.client.post(`/contacts/attributes/${input.attributeCategory}/${input.attributeName}`, {
        type: input.type,
        value: input.value,
        enumeration: input.enumeration,
      });
      return { success: true, data: { created: true } };
    } catch (error) {
      return this.handleError(error, 'Failed to create attribute');
    }
  }

  private async deleteAttribute(category: string, name: string): Promise<ConnectorResponse> {
    try {
      await this.client.delete(`/contacts/attributes/${category}/${name}`);
      return { success: true, data: { deleted: true } };
    } catch (error) {
      return this.handleError(error, 'Failed to delete attribute');
    }
  }

  // Account methods
  private async getAccount(): Promise<ConnectorResponse> {
    try {
      const response = await this.client.get('/account');
      return { success: true, data: response.data };
    } catch (error) {
      return this.handleError(error, 'Failed to get account');
    }
  }
}
