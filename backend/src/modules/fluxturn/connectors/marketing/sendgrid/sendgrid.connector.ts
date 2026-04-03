import { Request } from 'express';
import { Injectable, Logger } from '@nestjs/common';
import * as sgMail from '@sendgrid/mail';
import * as sgClient from '@sendgrid/client';
import { BaseConnector } from '../../base/base.connector';
import {
  ConnectorConfig,
  ConnectorResponse,
  ConnectorMetadata,
  ConnectorCategory,
  ConnectorType,
  AuthType,
  PaginatedRequest,
  BulkOperation,
  BulkOperationResult
} from '../../types';
import {
  IMarketingConnector,
  MarketingContact,
  MarketingList,
  MarketingSegment,
  EmailCampaign,
  EmailTemplate,
  CampaignStats,
  ABTest
} from '../marketing.interface';

interface SendGridConfig {
  apiKey: string;
}

interface SendGridContact {
  id?: string;
  email: string;
  first_name?: string;
  last_name?: string;
  phone_number?: string;
  custom_fields?: Record<string, any>;
  list_ids?: string[];
  created_at?: string;
  updated_at?: string;
}

interface SendGridList {
  id?: string;
  name: string;
  contact_count?: number;
  _metadata?: {
    self?: string;
  };
}

interface SendGridSegment {
  id?: string;
  name: string;
  list_id?: string;
  contacts_count?: number;
  created_date?: string;
  updated_date?: string;
  sample_updated_at?: string;
  next_sample_update?: string;
  parent_list_id?: string;
  query_dsl?: string;
}

interface SendGridSingleSend {
  id?: string;
  name: string;
  status?: 'draft' | 'scheduled' | 'in_progress' | 'sent' | 'paused' | 'canceled';
  categories?: string[];
  send_at?: string;
  send_to?: {
    list_ids?: string[];
    segment_ids?: string[];
    all?: boolean;
  };
  email_config?: {
    subject: string;
    html_content?: string;
    plain_content?: string;
    generate_plain_content?: boolean;
    editor?: string;
    suppression_group_id?: number;
    custom_unsubscribe_url?: string;
    sender_id?: number;
    ip_pool?: string;
  };
  created_at?: string;
  updated_at?: string;
}

interface SendGridTemplate {
  id?: string;
  name: string;
  generation?: 'legacy' | 'dynamic';
  updated_at?: string;
  versions?: Array<{
    id: string;
    template_id: string;
    active: number;
    name: string;
    html_content?: string;
    plain_content?: string;
    generate_plain_content?: boolean;
    subject: string;
    updated_at: string;
    editor?: string;
    test_data?: string;
  }>;
}

@Injectable()
export class SendGridConnector extends BaseConnector implements IMarketingConnector {
  private mailClient?: typeof sgMail;
  private apiClient?: typeof sgClient;

  constructor() {
    super();
  }

  getMetadata(): ConnectorMetadata {
    return {
      name: 'SendGrid',
      description: 'Email delivery and marketing platform',
      version: '1.0.0',
      category: ConnectorCategory.MARKETING,
      type: ConnectorType.SENDGRID,
      logoUrl: 'https://sendgrid.com/wp-content/themes/sgdotcom/pages/resource/brand/2016/SendGrid-Logomark.png',
      documentationUrl: 'https://docs.sendgrid.com/',
      authType: AuthType.API_KEY,
      requiredScopes: ['mail.send', 'marketing.read', 'marketing.write'],
      rateLimit: {
        requestsPerSecond: 5,
        requestsPerMinute: 300
      },
      actions: [
        {
          id: 'send_email',
          name: 'Send Email',
          description: 'Send a transactional email',
          inputSchema: {
            to: { type: 'string', required: true },
            subject: { type: 'string', required: true },
            content: { type: 'string', required: true },
            from: { type: 'string', required: true }
          },
          outputSchema: {
            messageId: { type: 'string' },
            success: { type: 'boolean' }
          }
        },
        {
          id: 'create_contact',
          name: 'Create Contact',
          description: 'Add a new contact to SendGrid',
          inputSchema: {
            email: { type: 'string', required: true },
            firstName: { type: 'string' },
            lastName: { type: 'string' },
            customFields: { type: 'object' }
          },
          outputSchema: {
            id: { type: 'string' },
            email: { type: 'string' }
          }
        },
        {
          id: 'create_campaign',
          name: 'Create Single Send',
          description: 'Create a new marketing campaign',
          inputSchema: {
            name: { type: 'string', required: true },
            subject: { type: 'string', required: true },
            content: { type: 'string', required: true },
            listIds: { type: 'array' }
          },
          outputSchema: {
            id: { type: 'string' },
            name: { type: 'string' },
            status: { type: 'string' }
          }
        }
      ],
      triggers: [
        {
          id: 'email_delivered',
          name: 'Email Delivered',
          description: 'Triggered when an email is delivered',
          eventType: 'email.delivered',
          outputSchema: {
            messageId: { type: 'string' },
            email: { type: 'string' },
            timestamp: { type: 'date' }
          },
          webhookRequired: true
        },
        {
          id: 'email_opened',
          name: 'Email Opened',
          description: 'Triggered when an email is opened',
          eventType: 'email.opened',
          outputSchema: {
            messageId: { type: 'string' },
            email: { type: 'string' },
            timestamp: { type: 'date' }
          },
          webhookRequired: true
        },
        {
          id: 'email_clicked',
          name: 'Email Clicked',
          description: 'Triggered when a link in an email is clicked',
          eventType: 'email.clicked',
          outputSchema: {
            messageId: { type: 'string' },
            email: { type: 'string' },
            url: { type: 'string' },
            timestamp: { type: 'date' }
          },
          webhookRequired: true
        }
      ],
      webhookSupport: true
    };
  }

  protected async initializeConnection(): Promise<void> {
    const config = this.config.credentials as SendGridConfig;
    
    if (!config.apiKey) {
      throw new Error('SendGrid API key is required');
    }

    this.mailClient = sgMail;
    this.apiClient = sgClient;
    
    this.mailClient.setApiKey(config.apiKey);
    this.apiClient.setApiKey(config.apiKey);

    this.logger.log('SendGrid client initialized successfully');
  }

  protected async performConnectionTest(): Promise<boolean> {
    try {
      if (!this.apiClient) {
        throw new Error('SendGrid API client not initialized');
      }
      const [response] = await this.apiClient.request({
        method: 'GET',
        url: '/v3/user/profile'
      });
      
      return response.statusCode === 200;
    } catch (error) {
      throw new Error(`SendGrid connection test failed: ${error.message}`);
    }
  }

  protected async performHealthCheck(): Promise<void> {
    try {
      if (!this.apiClient) {
        throw new Error('SendGrid API client not initialized');
      }
      const [response] = await this.apiClient.request({
        method: 'GET',
        url: '/v3/user/profile'
      });
      
      if (response.statusCode !== 200) {
        throw new Error('SendGrid API returned non-200 status');
      }
    } catch (error) {
      throw new Error(`SendGrid health check failed: ${error.message}`);
    }
  }

  protected async performRequest(request: any): Promise<any> {
    try {
      if (!this.apiClient) {
        throw new Error('SendGrid API client not initialized');
      }
      const [response] = await this.apiClient.request(request);
      return response;
    } catch (error) {
      throw error;
    }
  }

  protected async performAction(actionId: string, input: any): Promise<any> {
    switch (actionId) {
      // Email actions
      case 'send_email':
        return this.sendTransactionalEmail(input);

      // Contact actions
      case 'create_contact':
        return this.createContact({
          email: input.email,
          firstName: input.firstName,
          lastName: input.lastName,
          customFields: input.customFields
        });
      case 'update_contact':
        return this.updateContact(input.contactId || input.email, input);
      case 'get_contact':
        return this.getContact(input.contactId);
      case 'get_contacts':
        return this.getContacts(input);
      case 'search_contacts':
        return this.searchContacts(input.query);
      case 'delete_contact':
        return this.deleteContact(input.contactId);
      case 'bulk_import_contacts':
        return this.bulkImportContacts({ items: input.contacts, operation: 'create' });

      // List actions
      case 'create_list':
        return this.createList({ name: input.name, description: input.description });
      case 'update_list':
        return this.updateList(input.listId, { name: input.name });
      case 'get_list':
        return this.getList(input.listId);
      case 'get_lists':
        return this.getLists(input);
      case 'delete_list':
        return this.deleteList(input.listId);
      case 'add_contact_to_list':
        return this.addContactToList(input.listId, input.contactId);
      case 'remove_contact_from_list':
        return this.removeContactFromList(input.listId, input.contactId);

      // Segment actions
      case 'create_segment':
        return this.createSegment({
          name: input.name,
          listId: input.listId,
          criteria: input.criteria
        });
      case 'update_segment':
        return this.updateSegment(input.segmentId, input);
      case 'get_segment':
        return this.getSegment(input.segmentId);
      case 'get_segments':
        return this.getSegments(input);
      case 'delete_segment':
        return this.deleteSegment(input.segmentId);

      // Campaign actions
      case 'create_campaign':
        return this.createCampaign({
          name: input.name,
          subject: input.subject,
          content: input.content,
          fromEmail: input.from || 'noreply@example.com',
          listIds: input.listIds
        });
      case 'update_campaign':
        return this.updateCampaign(input.campaignId, input);
      case 'get_campaign':
        return this.getCampaign(input.campaignId);
      case 'get_campaigns':
        return this.getCampaigns(input);
      case 'delete_campaign':
        return this.deleteCampaign(input.campaignId);
      case 'send_campaign':
        return this.sendCampaign(input.campaignId, input.scheduledAt ? new Date(input.scheduledAt) : undefined);
      case 'pause_campaign':
        return this.pauseCampaign(input.campaignId);
      case 'resume_campaign':
        return this.resumeCampaign(input.campaignId);
      case 'get_campaign_stats':
        return this.getCampaignStats(input.campaignId);

      // Template actions
      case 'create_template':
        return this.createTemplate({
          name: input.name,
          subject: input.subject,
          content: input.content,
          description: input.description
        });
      case 'update_template':
        return this.updateTemplate(input.templateId, input);
      case 'get_template':
        return this.getTemplate(input.templateId);
      case 'get_templates':
        return this.getTemplates(input);
      case 'delete_template':
        return this.deleteTemplate(input.templateId);

      // Sender actions
      case 'get_senders':
        return this.getSenders();

      default:
        throw new Error(`Unknown action: ${actionId}`);
    }
  }

  protected async cleanup(): Promise<void> {
    this.mailClient = undefined;
    this.apiClient = undefined;
  }

  private async sendTransactionalEmail(emailData: {
    to: string;
    subject: string;
    content: string;
    from: string;
    html?: string;
  }): Promise<any> {
    try {
      const msg = {
        to: emailData.to,
        from: emailData.from,
        subject: emailData.subject,
        text: emailData.content,
        html: emailData.html || emailData.content
      };

      if (!this.mailClient) {
        throw new Error('SendGrid mail client not initialized');
      }
      const response = await this.mailClient.send(msg);
      return {
        messageId: (response[0].headers['x-message-id'] || '').toString(),
        success: true
      };
    } catch (error) {
      throw new Error(`Failed to send email: ${error.message}`);
    }
  }

  // IMarketingConnector implementation

  async createContact(contact: Omit<MarketingContact, 'id'>): Promise<ConnectorResponse<MarketingContact>> {
    try {
      if (!this.apiClient) {
        throw new Error('SendGrid API client is not initialized');
      }

      const contactData: SendGridContact = {
        email: contact.email,
        first_name: contact.firstName,
        last_name: contact.lastName,
        phone_number: contact.phone,
        custom_fields: contact.customFields,
        list_ids: contact.customFields?.listIds || []
      };

      const [response] = await this.apiClient.request({
        method: 'PUT',
        url: '/v3/marketing/contacts',
        body: {
          contacts: [contactData]
        }
      });

      if (response.statusCode !== 202) {
        throw new Error(`Failed to create contact: ${((response.body as any) as any)?.errors?.[0]?.message || 'Unknown error'}`);
      }

      // SendGrid returns a job_id for batch operations
      const jobId = (response.body as any).job_id;
      
      // For immediate response, we'll return the contact data with a generated ID
      const transformedContact: MarketingContact = {
        id: jobId, // Using job_id as temporary ID
        email: contact.email,
        firstName: contact.firstName,
        lastName: contact.lastName,
        phone: contact.phone,
        customFields: contact.customFields,
        status: 'subscribed',
        createdAt: new Date()
      };

      return { success: true, data: transformedContact };
    } catch (error) {
      return this.handleError(error as any, 'Failed to create contact');
    }
  }

  async updateContact(contactId: string, updates: Partial<MarketingContact>): Promise<ConnectorResponse<MarketingContact>> {
    try {
      if (!this.apiClient) {
        throw new Error('SendGrid API client is not initialized');
      }

      // SendGrid requires searching by email to update
      const searchResponse = await this.apiClient.request({
        method: 'POST',
        url: '/v3/marketing/contacts/search',
        body: {
          query: `email = '${updates.email || contactId}'`
        }
      });

      if (searchResponse[0].statusCode !== 200 || !(searchResponse[0].body as any).result?.length) {
        throw new Error('Contact not found');
      }

      const existingContact = (searchResponse[0].body as any).result[0];
      
      const updateData: SendGridContact = {
        email: existingContact.email,
        first_name: updates.firstName || existingContact.first_name,
        last_name: updates.lastName || existingContact.last_name,
        phone_number: updates.phone || existingContact.phone_number,
        custom_fields: { ...existingContact.custom_fields, ...updates.customFields }
      };

      const [response] = await this.apiClient.request({
        method: 'PUT',
        url: '/v3/marketing/contacts',
        body: {
          contacts: [updateData]
        }
      });

      if (response.statusCode !== 202) {
        throw new Error(`Failed to update contact: ${(response.body as any)?.errors?.[0]?.message || 'Unknown error'}`);
      }

      const transformedContact: MarketingContact = {
        id: existingContact.id,
        email: updateData.email,
        firstName: updateData.first_name,
        lastName: updateData.last_name,
        phone: updateData.phone_number,
        customFields: updateData.custom_fields,
        status: 'subscribed',
        updatedAt: new Date()
      };

      return { success: true, data: transformedContact };
    } catch (error) {
      return this.handleError(error as any, 'Failed to update contact');
    }
  }

  async getContact(contactId: string): Promise<ConnectorResponse<MarketingContact>> {
    try {
      if (!this.apiClient) {
        throw new Error('SendGrid API client is not initialized');
      }

      const [response] = await this.apiClient.request({
        method: 'GET',
        url: `/v3/marketing/contacts/${contactId}`
      });

      if (response.statusCode !== 200) {
        throw new Error('Contact not found');
      }

      const contact = (response.body as any);
      const transformedContact: MarketingContact = {
        id: contact.id,
        email: contact.email,
        firstName: contact.first_name,
        lastName: contact.last_name,
        phone: contact.phone_number,
        customFields: contact.custom_fields,
        status: 'subscribed',
        createdAt: contact.created_at ? new Date(contact.created_at) : undefined,
        updatedAt: contact.updated_at ? new Date(contact.updated_at) : undefined
      };

      return { success: true, data: transformedContact };
    } catch (error) {
      return this.handleError(error as any, 'Failed to get contact');
    }
  }

  async getContacts(params?: PaginatedRequest): Promise<ConnectorResponse<MarketingContact[]>> {
    try {
      if (!this.apiClient) {
        throw new Error('SendGrid API client is not initialized');
      }

      const queryParams: any = {
        page_size: params?.pageSize || 50,
        page_token: params?.page ? `page_${params.page}` : undefined
      };

      const [response] = await this.apiClient.request({
        method: 'GET',
        url: '/v3/marketing/contacts',
        qs: queryParams
      });

      if (response.statusCode !== 200) {
        throw new Error('Failed to fetch contacts');
      }

      const contacts: MarketingContact[] = (response.body as any).result.map((contact: SendGridContact) => ({
        id: contact.id,
        email: contact.email,
        firstName: contact.first_name,
        lastName: contact.last_name,
        phone: contact.phone_number,
        customFields: contact.custom_fields,
        status: 'subscribed',
        createdAt: contact.created_at ? new Date(contact.created_at) : undefined,
        updatedAt: contact.updated_at ? new Date(contact.updated_at) : undefined
      }));

      return { 
        success: true, 
        data: contacts,
        metadata: {
          timestamp: new Date(),
          pagination: {
            page: params?.page || 1,
            pageSize: params?.pageSize || 50,
            total: 0,
            hasNext: !!(response.body as any)._metadata?.next
          }
        }
      };
    } catch (error) {
      return this.handleError(error as any, 'Failed to get contacts');
    }
  }

  async deleteContact(contactId: string): Promise<ConnectorResponse<void>> {
    try {
      if (!this.apiClient) {
        throw new Error('SendGrid API client is not initialized');
      }

      const [response] = await this.apiClient.request({
        method: 'DELETE',
        url: '/v3/marketing/contacts',
        qs: {
          ids: contactId
        }
      });

      if (response.statusCode !== 202) {
        throw new Error('Failed to delete contact');
      }

      return { success: true };
    } catch (error) {
      return this.handleError(error as any, 'Failed to delete contact');
    }
  }

  async searchContacts(query: string): Promise<ConnectorResponse<MarketingContact[]>> {
    try {
      if (!this.apiClient) {
        throw new Error('SendGrid API client is not initialized');
      }

      const [response] = await this.apiClient.request({
        method: 'POST',
        url: '/v3/marketing/contacts/search',
        body: {
          query: query
        }
      });

      if (response.statusCode !== 200) {
        throw new Error('Failed to search contacts');
      }

      const contacts: MarketingContact[] = ((response.body as any).result || []).map((contact: SendGridContact) => ({
        id: contact.id,
        email: contact.email,
        firstName: contact.first_name,
        lastName: contact.last_name,
        phone: contact.phone_number,
        customFields: contact.custom_fields,
        status: 'subscribed',
        createdAt: contact.created_at ? new Date(contact.created_at) : undefined,
        updatedAt: contact.updated_at ? new Date(contact.updated_at) : undefined
      }));

      return {
        success: true,
        data: contacts,
        metadata: {
          timestamp: new Date(),
          pagination: {
            page: 1,
            pageSize: contacts.length,
            total: (response.body as any).contact_count || contacts.length,
            hasNext: false
          }
        }
      };
    } catch (error) {
      return this.handleError(error as any, 'Failed to search contacts');
    }
  }

  async getSenders(): Promise<ConnectorResponse<any[]>> {
    try {
      if (!this.apiClient) {
        throw new Error('SendGrid API client is not initialized');
      }

      const [response] = await this.apiClient.request({
        method: 'GET',
        url: '/v3/marketing/senders'
      });

      if (response.statusCode !== 200) {
        throw new Error('Failed to get senders');
      }

      const senders = (response.body as any) || [];
      return {
        success: true,
        data: senders.map((sender: any) => ({
          id: sender.id,
          nickname: sender.nickname,
          from: {
            email: sender.from?.email,
            name: sender.from?.name
          },
          replyTo: {
            email: sender.reply_to?.email,
            name: sender.reply_to?.name
          },
          address: sender.address,
          city: sender.city,
          country: sender.country,
          verified: sender.verified?.status === true
        }))
      };
    } catch (error) {
      return this.handleError(error as any, 'Failed to get senders');
    }
  }

  async bulkImportContacts(operation: BulkOperation<MarketingContact>): Promise<ConnectorResponse<BulkOperationResult<MarketingContact>>> {
    try {
      if (!this.apiClient) {
        throw new Error('SendGrid API client is not initialized');
      }

      const contacts = operation.items.map(contact => ({
        email: contact.email,
        first_name: contact.firstName,
        last_name: contact.lastName,
        phone_number: contact.phone,
        custom_fields: contact.customFields
      }));

      const [response] = await this.apiClient.request({
        method: 'PUT',
        url: '/v3/marketing/contacts',
        body: {
          contacts
        }
      });

      if (response.statusCode !== 202) {
        throw new Error(`Bulk import failed: ${(response.body as any)?.errors?.[0]?.message || 'Unknown error'}`);
      }

      // SendGrid returns a job_id for tracking
      const jobId = (response.body as any).job_id;

      const result: BulkOperationResult<MarketingContact> = {
        successful: operation.items.map(contact => ({
          ...contact,
          id: `pending_${Math.random().toString(36).substr(2, 9)}`,
          status: 'subscribed' as any,
          createdAt: new Date()
        })),
        failed: [],
        totalProcessed: operation.items.length,
        totalSuccessful: operation.items.length,
        totalFailed: 0
      };

      return { 
        success: true, 
        data: result,
        metadata: {
          timestamp: new Date()
        }
      };
    } catch (error) {
      return this.handleError(error as any, 'Failed to bulk import contacts');
    }
  }

  async createList(list: Omit<MarketingList, 'id'>): Promise<ConnectorResponse<MarketingList>> {
    try {
      if (!this.apiClient) {
        throw new Error('SendGrid API client is not initialized');
      }

      const [response] = await this.apiClient.request({
        method: 'POST',
        url: '/v3/marketing/lists',
        body: {
          name: list.name
        }
      });

      if (response.statusCode !== 201) {
        throw new Error(`Failed to create list: ${(response.body as any)?.errors?.[0]?.message || 'Unknown error'}`);
      }

      const transformedList: MarketingList = {
        id: (response.body as any).id,
        name: (response.body as any).name,
        description: list.description,
        contactCount: (response.body as any).contact_count || 0,
        isActive: true,
        createdAt: new Date()
      };

      return { success: true, data: transformedList };
    } catch (error) {
      return this.handleError(error as any, 'Failed to create list');
    }
  }

  async updateList(listId: string, updates: Partial<MarketingList>): Promise<ConnectorResponse<MarketingList>> {
    try {
      if (!this.apiClient) {
        throw new Error('SendGrid API client is not initialized');
      }

      const [response] = await this.apiClient.request({
        method: 'PATCH',
        url: `/v3/marketing/lists/${listId}`,
        body: {
          name: updates.name
        }
      });

      if (response.statusCode !== 200) {
        throw new Error(`Failed to update list: ${(response.body as any)?.errors?.[0]?.message || 'Unknown error'}`);
      }

      const transformedList: MarketingList = {
        id: (response.body as any).id,
        name: (response.body as any).name,
        description: updates.description,
        contactCount: (response.body as any).contact_count || 0,
        isActive: true,
        updatedAt: new Date()
      };

      return { success: true, data: transformedList };
    } catch (error) {
      return this.handleError(error as any, 'Failed to update list');
    }
  }

  async getList(listId: string): Promise<ConnectorResponse<MarketingList>> {
    try {
      if (!this.apiClient) {
        throw new Error('SendGrid API client not initialized');
      }
      const [response] = await this.apiClient.request({
        method: 'GET',
        url: `/v3/marketing/lists/${listId}`
      });

      if (response.statusCode !== 200) {
        throw new Error('List not found');
      }

      const list = (response.body as any);
      const transformedList: MarketingList = {
        id: list.id,
        name: list.name,
        contactCount: list.contact_count || 0,
        isActive: true
      };

      return { success: true, data: transformedList };
    } catch (error) {
      return this.handleError(error as any, 'Failed to get list');
    }
  }

  async getLists(params?: PaginatedRequest): Promise<ConnectorResponse<MarketingList[]>> {
    try {
      if (!this.apiClient) {
        throw new Error('SendGrid API client not initialized');
      }
      const queryParams: any = {
        page_size: params?.pageSize || 50
      };

      const [response] = await this.apiClient.request({
        method: 'GET',
        url: '/v3/marketing/lists',
        qs: queryParams
      });

      if (response.statusCode !== 200) {
        throw new Error('Failed to fetch lists');
      }

      const lists: MarketingList[] = (response.body as any).result.map((list: SendGridList) => ({
        id: list.id,
        name: list.name,
        contactCount: list.contact_count || 0,
        isActive: true
      }));

      return { 
        success: true, 
        data: lists,
        metadata: {
          timestamp: new Date(),
          pagination: {
            page: params?.page || 1,
            pageSize: params?.pageSize || 50,
            total: 0,
            hasNext: !!(response.body as any)._metadata?.next
          }
        }
      };
    } catch (error) {
      return this.handleError(error as any, 'Failed to get lists');
    }
  }

  async deleteList(listId: string): Promise<ConnectorResponse<void>> {
    try {
      if (!this.apiClient) {
        throw new Error('SendGrid API client not initialized');
      }
      const [response] = await this.apiClient.request({
        method: 'DELETE',
        url: `/v3/marketing/lists/${listId}`
      });

      if (response.statusCode !== 202) {
        throw new Error('Failed to delete list');
      }

      return { success: true };
    } catch (error) {
      return this.handleError(error as any, 'Failed to delete list');
    }
  }

  async addContactToList(listId: string, contactId: string): Promise<ConnectorResponse<void>> {
    try {
      if (!this.apiClient) {
        throw new Error('SendGrid API client not initialized');
      }
      const [response] = await this.apiClient.request({
        method: 'PUT',
        url: `/v3/marketing/lists/${listId}/contacts`,
        body: {
          contact_ids: [contactId]
        }
      });

      if (response.statusCode !== 202) {
        throw new Error('Failed to add contact to list');
      }

      return { success: true };
    } catch (error) {
      return this.handleError(error as any, 'Failed to add contact to list');
    }
  }

  async removeContactFromList(listId: string, contactId: string): Promise<ConnectorResponse<void>> {
    try {
      if (!this.apiClient) {
        throw new Error('SendGrid API client not initialized');
      }
      const [response] = await this.apiClient.request({
        method: 'DELETE',
        url: `/v3/marketing/lists/${listId}/contacts`,
        qs: {
          contact_ids: contactId
        }
      });

      if (response.statusCode !== 202) {
        throw new Error('Failed to remove contact from list');
      }

      return { success: true };
    } catch (error) {
      return this.handleError(error as any, 'Failed to remove contact from list');
    }
  }

  async createSegment(segment: Omit<MarketingSegment, 'id'>): Promise<ConnectorResponse<MarketingSegment>> {
    try {
      if (!segment.listId) {
        throw new Error('List ID is required for SendGrid segments');
      }

      if (!this.apiClient) {
        throw new Error('SendGrid API client not initialized');
      }
      const [response] = await this.apiClient.request({
        method: 'POST',
        url: '/v3/marketing/segments',
        body: {
          name: segment.name,
          parent_list_id: segment.listId,
          query_dsl: JSON.stringify(segment.criteria)
        }
      });

      if (response.statusCode !== 201) {
        throw new Error(`Failed to create segment: ${(response.body as any)?.errors?.[0]?.message || 'Unknown error'}`);
      }

      const transformedSegment: MarketingSegment = {
        id: (response.body as any).id,
        name: (response.body as any).name,
        listId: (response.body as any).parent_list_id,
        criteria: segment.criteria,
        contactCount: (response.body as any).contacts_count || 0,
        isActive: true,
        createdAt: (response.body as any).created_date ? new Date((response.body as any).created_date) : new Date()
      };

      return { success: true, data: transformedSegment };
    } catch (error) {
      return this.handleError(error as any, 'Failed to create segment');
    }
  }

  async updateSegment(segmentId: string, updates: Partial<MarketingSegment>): Promise<ConnectorResponse<MarketingSegment>> {
    try {
      const updateData: any = {};
      if (updates.name) updateData.name = updates.name;
      if (updates.criteria) updateData.query_dsl = JSON.stringify(updates.criteria);

      if (!this.apiClient) {
        throw new Error('SendGrid API client not initialized');
      }
      const [response] = await this.apiClient.request({
        method: 'PATCH',
        url: `/v3/marketing/segments/${segmentId}`,
        body: updateData
      });

      if (response.statusCode !== 200) {
        throw new Error(`Failed to update segment: ${(response.body as any)?.errors?.[0]?.message || 'Unknown error'}`);
      }

      const transformedSegment: MarketingSegment = {
        id: (response.body as any).id,
        name: (response.body as any).name,
        listId: (response.body as any).parent_list_id,
        criteria: {},
        contactCount: (response.body as any).contacts_count || 0,
        isActive: true
      };

      return { success: true, data: transformedSegment };
    } catch (error) {
      return this.handleError(error as any, 'Failed to update segment');
    }
  }

  async getSegment(segmentId: string): Promise<ConnectorResponse<MarketingSegment>> {
    try {
      if (!this.apiClient) {
        throw new Error('SendGrid API client not initialized');
      }
      const [response] = await this.apiClient.request({
        method: 'GET',
        url: `/v3/marketing/segments/${segmentId}`
      });

      if (response.statusCode !== 200) {
        throw new Error('Segment not found');
      }

      const segment = (response.body as any);
      const transformedSegment: MarketingSegment = {
        id: segment.id,
        name: segment.name,
        listId: segment.parent_list_id,
        criteria: {},
        contactCount: segment.contacts_count || 0,
        isActive: true,
        createdAt: segment.created_date ? new Date(segment.created_date) : undefined
      };

      return { success: true, data: transformedSegment };
    } catch (error) {
      return this.handleError(error as any, 'Failed to get segment');
    }
  }

  async getSegments(params?: PaginatedRequest): Promise<ConnectorResponse<MarketingSegment[]>> {
    try {
      const queryParams: any = {};
      if (params?.filters?.listId) {
        queryParams.parent_list_id = params.filters.listId;
      }

      if (!this.apiClient) {
        throw new Error('SendGrid API client not initialized');
      }
      const [response] = await this.apiClient.request({
        method: 'GET',
        url: '/v3/marketing/segments',
        qs: queryParams
      });

      if (response.statusCode !== 200) {
        throw new Error('Failed to fetch segments');
      }

      const segments: MarketingSegment[] = (response.body as any).results.map((segment: SendGridSegment) => ({
        id: segment.id,
        name: segment.name,
        listId: segment.parent_list_id,
        contactCount: segment.contacts_count || 0,
        isActive: true,
        createdAt: segment.created_date ? new Date(segment.created_date) : undefined
      }));

      return { 
        success: true, 
        data: segments,
        metadata: {
          timestamp: new Date(),
          pagination: {
            page: params?.page || 1,
            pageSize: params?.pageSize || 50,
            total: 0,
            hasNext: false
          }
        }
      };
    } catch (error) {
      return this.handleError(error as any, 'Failed to get segments');
    }
  }

  async deleteSegment(segmentId: string): Promise<ConnectorResponse<void>> {
    try {
      if (!this.apiClient) {
        throw new Error('SendGrid API client not initialized');
      }
      const [response] = await this.apiClient.request({
        method: 'DELETE',
        url: `/v3/marketing/segments/${segmentId}`
      });

      if (response.statusCode !== 204) {
        throw new Error('Failed to delete segment');
      }

      return { success: true };
    } catch (error) {
      return this.handleError(error as any, 'Failed to delete segment');
    }
  }

  async createCampaign(campaign: Omit<EmailCampaign, 'id'>): Promise<ConnectorResponse<EmailCampaign>> {
    try {
      const singleSendData: Partial<SendGridSingleSend> = {
        name: campaign.name,
        send_to: {
          list_ids: campaign.listIds,
          segment_ids: campaign.segmentIds
        },
        email_config: {
          subject: campaign.subject,
          html_content: campaign.content,
          generate_plain_content: true
        }
      };

      if (!this.apiClient) {
        throw new Error('SendGrid API client not initialized');
      }
      const [response] = await this.apiClient.request({
        method: 'POST',
        url: '/v3/marketing/singlesends',
        body: singleSendData
      });

      if (response.statusCode !== 201) {
        throw new Error(`Failed to create campaign: ${(response.body as any)?.errors?.[0]?.message || 'Unknown error'}`);
      }

      const transformedCampaign: EmailCampaign = {
        id: (response.body as any).id,
        name: (response.body as any).name,
        subject: (response.body as any).email_config?.subject || '',
        content: (response.body as any).email_config?.html_content || '',
        fromEmail: (response.body as any).email_config?.sender?.email || '',
        listIds: (response.body as any).send_to?.list_ids,
        segmentIds: (response.body as any).send_to?.segment_ids,
        status: (response.body as any).status as any,
        createdAt: (response.body as any).created_at ? new Date((response.body as any).created_at) : new Date()
      };

      return { success: true, data: transformedCampaign };
    } catch (error) {
      return this.handleError(error as any, 'Failed to create campaign');
    }
  }

  async updateCampaign(campaignId: string, updates: Partial<EmailCampaign>): Promise<ConnectorResponse<EmailCampaign>> {
    try {
      const updateData: any = {};
      
      if (updates.name) updateData.name = updates.name;
      
      if (updates.subject || updates.content) {
        updateData.email_config = {};
        if (updates.subject) updateData.email_config.subject = updates.subject;
        if (updates.content) updateData.email_config.html_content = updates.content;
      }

      if (updates.listIds || updates.segmentIds) {
        updateData.send_to = {};
        if (updates.listIds) updateData.send_to.list_ids = updates.listIds;
        if (updates.segmentIds) updateData.send_to.segment_ids = updates.segmentIds;
      }

      if (!this.apiClient) {
        throw new Error('SendGrid API client not initialized');
      }
      const [response] = await this.apiClient.request({
        method: 'PATCH',
        url: `/v3/marketing/singlesends/${campaignId}`,
        body: updateData
      });

      if (response.statusCode !== 200) {
        throw new Error(`Failed to update campaign: ${(response.body as any)?.errors?.[0]?.message || 'Unknown error'}`);
      }

      const transformedCampaign: EmailCampaign = {
        id: (response.body as any).id,
        name: (response.body as any).name,
        subject: (response.body as any).email_config?.subject || '',
        content: (response.body as any).email_config?.html_content || '',
        fromEmail: (response.body as any).email_config?.sender?.email || '',
        listIds: (response.body as any).send_to?.list_ids,
        segmentIds: (response.body as any).send_to?.segment_ids,
        status: (response.body as any).status as any,
        updatedAt: new Date()
      };

      return { success: true, data: transformedCampaign };
    } catch (error) {
      return this.handleError(error as any, 'Failed to update campaign');
    }
  }

  async getCampaign(campaignId: string): Promise<ConnectorResponse<EmailCampaign>> {
    try {
      if (!this.apiClient) {
        throw new Error('SendGrid API client not initialized');
      }
      const [response] = await this.apiClient.request({
        method: 'GET',
        url: `/v3/marketing/singlesends/${campaignId}`
      });

      if (response.statusCode !== 200) {
        throw new Error('Campaign not found');
      }

      const campaign = (response.body as any);
      const transformedCampaign: EmailCampaign = {
        id: campaign.id,
        name: campaign.name,
        subject: campaign.email_config?.subject || '',
        content: campaign.email_config?.html_content || '',
        fromEmail: (campaign.email_config as any)?.sender?.email || '',
        listIds: campaign.send_to?.list_ids,
        segmentIds: campaign.send_to?.segment_ids,
        status: campaign.status as any,
        createdAt: campaign.created_at ? new Date(campaign.created_at) : undefined,
        sentAt: campaign.send_at ? new Date(campaign.send_at) : undefined
      };

      return { success: true, data: transformedCampaign };
    } catch (error) {
      return this.handleError(error as any, 'Failed to get campaign');
    }
  }

  async getCampaigns(params?: PaginatedRequest): Promise<ConnectorResponse<EmailCampaign[]>> {
    try {
      const queryParams: any = {
        page_size: params?.pageSize || 50
      };

      if (!this.apiClient) {
        throw new Error('SendGrid API client not initialized');
      }
      const [response] = await this.apiClient.request({
        method: 'GET',
        url: '/v3/marketing/singlesends',
        qs: queryParams
      });

      if (response.statusCode !== 200) {
        throw new Error('Failed to fetch campaigns');
      }

      const campaigns: EmailCampaign[] = (response.body as any).result.map((campaign: SendGridSingleSend) => ({
        id: campaign.id,
        name: campaign.name,
        subject: campaign.email_config?.subject || '',
        content: campaign.email_config?.html_content || '',
        fromEmail: (campaign.email_config as any)?.sender?.email || '',
        listIds: campaign.send_to?.list_ids,
        segmentIds: campaign.send_to?.segment_ids,
        status: campaign.status as any,
        createdAt: campaign.created_at ? new Date(campaign.created_at) : undefined,
        sentAt: campaign.send_at ? new Date(campaign.send_at) : undefined
      }));

      return { 
        success: true, 
        data: campaigns,
        metadata: {
          timestamp: new Date(),
          pagination: {
            page: params?.page || 1,
            pageSize: params?.pageSize || 50,
            total: 0,
            hasNext: !!(response.body as any)._metadata?.next
          }
        }
      };
    } catch (error) {
      return this.handleError(error as any, 'Failed to get campaigns');
    }
  }

  async deleteCampaign(campaignId: string): Promise<ConnectorResponse<void>> {
    try {
      if (!this.apiClient) {
        throw new Error('SendGrid API client not initialized');
      }
      const [response] = await this.apiClient.request({
        method: 'DELETE',
        url: `/v3/marketing/singlesends/${campaignId}`
      });

      if (response.statusCode !== 204) {
        throw new Error('Failed to delete campaign');
      }

      return { success: true };
    } catch (error) {
      return this.handleError(error as any, 'Failed to delete campaign');
    }
  }

  async sendCampaign(campaignId: string, scheduledAt?: Date): Promise<ConnectorResponse<void>> {
    try {
      const url = scheduledAt 
        ? `/v3/marketing/singlesends/${campaignId}/schedule`
        : `/v3/marketing/singlesends/${campaignId}/schedule`;

      const body = scheduledAt 
        ? { send_at: scheduledAt.toISOString() }
        : { send_at: 'now' };

      if (!this.apiClient) {
        throw new Error('SendGrid API client not initialized');
      }
      const [response] = await this.apiClient.request({
        method: 'PUT',
        url,
        body
      });

      if (response.statusCode !== 202) {
        throw new Error(`Failed to send campaign: ${(response.body as any)?.errors?.[0]?.message || 'Unknown error'}`);
      }

      return { success: true };
    } catch (error) {
      return this.handleError(error as any, 'Failed to send campaign');
    }
  }

  async pauseCampaign(campaignId: string): Promise<ConnectorResponse<void>> {
    try {
      if (!this.apiClient) {
        throw new Error('SendGrid API client not initialized');
      }
      const [response] = await this.apiClient.request({
        method: 'DELETE',
        url: `/v3/marketing/singlesends/${campaignId}/schedule`
      });

      if (response.statusCode !== 204) {
        throw new Error('Failed to pause campaign');
      }

      return { success: true };
    } catch (error) {
      return this.handleError(error as any, 'Failed to pause campaign');
    }
  }

  async resumeCampaign(campaignId: string): Promise<ConnectorResponse<void>> {
    try {
      // SendGrid doesn't have a direct resume - you need to reschedule
      await this.sendCampaign(campaignId);
      return { success: true };
    } catch (error) {
      return this.handleError(error as any, 'Failed to resume campaign');
    }
  }

  async getCampaignStats(campaignId: string): Promise<ConnectorResponse<CampaignStats>> {
    try {
      if (!this.apiClient) {
        throw new Error('SendGrid API client not initialized');
      }
      const [response] = await this.apiClient.request({
        method: 'GET',
        url: `/v3/marketing/singlesends/${campaignId}/stats`
      });

      if (response.statusCode !== 200) {
        throw new Error('Failed to get campaign stats');
      }

      const stats = (response.body as any).results?.[0]?.stats;
      if (!stats) {
        throw new Error('No stats available for this campaign');
      }

      const campaignStats: CampaignStats = {
        sent: stats.requests,
        delivered: stats.delivered,
        opens: stats.unique_opens,
        uniqueOpens: stats.unique_opens,
        clicks: stats.unique_clicks,
        uniqueClicks: stats.unique_clicks,
        unsubscribes: stats.unsubscribes,
        bounces: stats.bounces + stats.invalid_emails,
        openRate: stats.requests > 0 ? (stats.unique_opens / stats.requests) * 100 : 0,
        clickRate: stats.requests > 0 ? (stats.unique_clicks / stats.requests) * 100 : 0,
        unsubscribeRate: stats.requests > 0 ? (stats.unsubscribes / stats.requests) * 100 : 0,
        bounceRate: stats.requests > 0 ? ((stats.bounces + stats.invalid_emails) / stats.requests) * 100 : 0
      };

      return { success: true, data: campaignStats };
    } catch (error) {
      return this.handleError(error as any, 'Failed to get campaign stats');
    }
  }

  async createTemplate(template: Omit<EmailTemplate, 'id'>): Promise<ConnectorResponse<EmailTemplate>> {
    try {
      if (!this.apiClient) {
        throw new Error('SendGrid API client is not initialized');
      }

      const [response] = await this.apiClient.request({
        method: 'POST',
        url: '/v3/templates',
        body: {
          name: template.name,
          generation: 'dynamic'
        }
      });

      if (response.statusCode !== 201) {
        throw new Error(`Failed to create template: ${(response.body as any)?.errors?.[0]?.message || 'Unknown error'}`);
      }

      // Create a version for the template
      const versionResponse = await this.apiClient.request({
        method: 'POST',
        url: `/v3/templates/${(response.body as any).id}/versions`,
        body: {
          name: template.name,
          subject: template.subject || 'Default Subject',
          html_content: template.content,
          generate_plain_content: true,
          active: 1
        }
      });

      const transformedTemplate: EmailTemplate = {
        id: (response.body as any).id,
        name: (response.body as any).name,
        subject: template.subject,
        content: template.content,
        description: template.description,
        isActive: true,
        createdAt: new Date()
      };

      return { success: true, data: transformedTemplate };
    } catch (error) {
      return this.handleError(error as any, 'Failed to create template');
    }
  }

  async updateTemplate(templateId: string, updates: Partial<EmailTemplate>): Promise<ConnectorResponse<EmailTemplate>> {
    try {
      if (!this.apiClient) {
        throw new Error('SendGrid API client not initialized');
      }
      // Update template name
      if (updates.name) {
        await this.apiClient.request({
          method: 'PATCH',
          url: `/v3/templates/${templateId}`,
          body: {
            name: updates.name
          }
        });
      }

      // Update the active version
      const versionsResponse = await this.apiClient.request({
        method: 'GET',
        url: `/v3/templates/${templateId}/versions`
      });

      const activeVersion = ((versionsResponse[0].body as any).versions || []).find((v: any) => v.active === 1);
      
      if (activeVersion && (updates.subject || updates.content)) {
        const updateData: any = {};
        if (updates.subject) updateData.subject = updates.subject;
        if (updates.content) updateData.html_content = updates.content;

        await this.apiClient.request({
          method: 'PATCH',
          url: `/v3/templates/${templateId}/versions/${activeVersion.id}`,
          body: updateData
        });
      }

      const transformedTemplate: EmailTemplate = {
        id: templateId,
        name: updates.name || '',
        subject: updates.subject,
        content: updates.content || '',
        description: updates.description,
        isActive: true,
        updatedAt: new Date()
      };

      return { success: true, data: transformedTemplate };
    } catch (error) {
      return this.handleError(error as any, 'Failed to update template');
    }
  }

  async getTemplate(templateId: string): Promise<ConnectorResponse<EmailTemplate>> {
    try {
      if (!this.apiClient) {
        throw new Error('SendGrid API client not initialized');
      }
      const [response] = await this.apiClient.request({
        method: 'GET',
        url: `/v3/templates/${templateId}`
      });

      if (response.statusCode !== 200) {
        throw new Error('Template not found');
      }

      const template = (response.body as any);
      const activeVersion = template.versions?.find((v: any) => v.active === 1);

      const transformedTemplate: EmailTemplate = {
        id: template.id,
        name: template.name,
        subject: activeVersion?.subject,
        content: activeVersion?.html_content,
        isActive: true,
        createdAt: template.updated_at ? new Date(template.updated_at) : undefined
      };

      return { success: true, data: transformedTemplate };
    } catch (error) {
      return this.handleError(error as any, 'Failed to get template');
    }
  }

  async getTemplates(params?: PaginatedRequest): Promise<ConnectorResponse<EmailTemplate[]>> {
    try {
      const queryParams: any = {
        generations: 'dynamic',
        page_size: params?.pageSize || 50
      };

      if (!this.apiClient) {
        throw new Error('SendGrid API client not initialized');
      }
      const [response] = await this.apiClient.request({
        method: 'GET',
        url: '/v3/templates',
        qs: queryParams
      });

      if (response.statusCode !== 200) {
        throw new Error('Failed to fetch templates');
      }

      const templates: EmailTemplate[] = (response.body as any).result.map((template: SendGridTemplate) => {
        const activeVersion = template.versions?.find((v: any) => v.active === 1);
        return {
          id: template.id,
          name: template.name,
          subject: activeVersion?.subject,
          content: activeVersion?.html_content,
          isActive: true,
          createdAt: template.updated_at ? new Date(template.updated_at) : undefined
        };
      });

      return { 
        success: true, 
        data: templates,
        metadata: {
          timestamp: new Date(),
          pagination: {
            page: params?.page || 1,
            pageSize: params?.pageSize || 50,
            total: 0,
            hasNext: !!(response.body as any)._metadata?.next
          }
        }
      };
    } catch (error) {
      return this.handleError(error as any, 'Failed to get templates');
    }
  }

  async deleteTemplate(templateId: string): Promise<ConnectorResponse<void>> {
    try {
      if (!this.apiClient) {
        throw new Error('SendGrid API client not initialized');
      }
      const [response] = await this.apiClient.request({
        method: 'DELETE',
        url: `/v3/templates/${templateId}`
      });

      if (response.statusCode !== 204) {
        throw new Error('Failed to delete template');
      }

      return { success: true };
    } catch (error) {
      return this.handleError(error as any, 'Failed to delete template');
    }
  }

  async createABTest(test: Omit<ABTest, 'id'>): Promise<ConnectorResponse<ABTest>> {
    try {
      // SendGrid A/B testing is integrated into Single Sends
      // This is a simplified implementation - full A/B testing requires more complex setup
      throw new Error('A/B testing in SendGrid requires specialized Single Send configuration');
    } catch (error) {
      return this.handleError(error as any, 'Failed to create A/B test');
    }
  }

  async getABTest(testId: string): Promise<ConnectorResponse<ABTest>> {
    try {
      throw new Error('A/B test retrieval not implemented for SendGrid');
    } catch (error) {
      return this.handleError(error as any, 'Failed to get A/B test');
    }
  }

  async getABTestResults(testId: string): Promise<ConnectorResponse<Record<string, any>>> {
    try {
      throw new Error('A/B test results not implemented for SendGrid');
    } catch (error) {
      return this.handleError(error as any, 'Failed to get A/B test results');
    }
  }
}