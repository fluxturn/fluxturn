import { Request } from 'express';
import { Injectable, Logger } from '@nestjs/common';
import { BaseConnector } from '../../base/base.connector';
import { ICRMConnector } from '../../base/connector.interface';
import {
  ConnectorMetadata,
  ConnectorType,
  ConnectorCategory,
  ConnectorRequest,
  ConnectorResponse,
  AuthType,
  PaginatedRequest,
  ConnectorAction,
  ConnectorTrigger,
  BulkOperation,
  BulkOperationResult
} from '../../types';
import { AuthUtils } from '../../utils/auth.utils';
import { ApiUtils } from '../../utils/api.utils';

@Injectable()
export class PipedriveConnector extends BaseConnector implements ICRMConnector {
  private baseUrl: string;

  constructor(
    private readonly authUtils: AuthUtils,
    private readonly apiUtils: ApiUtils
  ) {
    super();
  }

  getMetadata(): ConnectorMetadata {
    return {
      name: 'Pipedrive',
      description: 'Pipedrive CRM platform designed for sales teams to manage leads and close deals efficiently',
      version: '1.0.0',
      category: ConnectorCategory.CRM,
      type: ConnectorType.PIPEDRIVE,
      logoUrl: 'https://www.pipedrive.com/img/pipedrive-logo.svg',
      documentationUrl: 'https://developers.pipedrive.com/docs/api/v1',
      authType: AuthType.API_KEY,
      actions: this.getActions(),
      triggers: this.getTriggers(),
      rateLimit: {
        requestsPerSecond: 5,
        requestsPerMinute: 300,
        requestsPerHour: 18000
      },
      webhookSupport: true
    };
  }

  protected async initializeConnection(): Promise<void> {
    try {
      // Set base URL based on company domain
      const companyDomain = this.config.credentials.domain || 'api';
      this.baseUrl = `https://${companyDomain}.pipedrive.com/v1`;

      // Test the connection by fetching user info
      const response = await this.performRequest({
        method: 'GET',
        endpoint: '/users/me',
        queryParams: { api_token: this.config.credentials.apiToken }
      });

      if (!response?.data) {
        throw new Error('Failed to connect to Pipedrive API');
      }

      this.logger.log('Pipedrive connector initialized successfully');
    } catch (error) {
      this.logger.error('Failed to initialize Pipedrive connection:', error);
      throw new Error(`Pipedrive connection failed: ${error.message}`);
    }
  }

  protected async performConnectionTest(): Promise<boolean> {
    try {
      const response = await this.performRequest({
        method: 'GET',
        endpoint: '/users/me',
        queryParams: { api_token: this.config.credentials.apiToken }
      });
      return !!response?.data;
    } catch (error) {
      this.logger.error('Pipedrive connection test failed:', error);
      return false;
    }
  }

  protected async performHealthCheck(): Promise<void> {
    try {
      await this.performRequest({
        method: 'GET',
        endpoint: '/users/me',
        queryParams: { api_token: this.config.credentials.apiToken }
      });
    } catch (error) {
      throw new Error(`Pipedrive health check failed: ${error.message}`);
    }
  }

  protected async performRequest(request: ConnectorRequest): Promise<any> {
    try {
      const queryParams = {
        api_token: this.config.credentials.apiToken,
        ...request.queryParams
      };

      const response = await this.apiUtils.executeRequest({
        ...request,
        endpoint: `${this.baseUrl}${request.endpoint}`,
        queryParams,
        headers: {
          'Content-Type': 'application/json',
          ...request.headers
        }
      });

      if (!response.success) {
        throw new Error(response.error?.message || 'Request failed');
      }

      return response.data;
    } catch (error) {
      this.logger.error('Pipedrive request failed:', error);
      throw error;
    }
  }

  protected async performAction(actionId: string, input: any): Promise<any> {
    switch (actionId) {
      // Activity actions
      case 'create_activity':
      case 'add_activity':
        return this.createActivity(input);
      case 'get_activity':
        return this.getActivity(input.activityId);
      case 'get_activities':
      case 'get_all_activities':
        return this.getActivities(input);
      case 'update_activity':
        return this.updateActivity(input.activityId, input);
      case 'delete_activity':
        return this.deleteActivity(input.activityId);

      // Deal actions
      case 'create_deal':
        return this.createDeal(input);
      case 'get_deal':
        return this.getDeal(input.dealId);
      case 'get_deals':
        return this.getDeals(input);
      case 'update_deal':
        return this.updateDeal(input.dealId, input);
      case 'delete_deal':
        return this.deleteDeal(input.dealId);
      case 'search_deals':
        return this.searchDeals(input.term, input);

      // Person actions
      case 'create_person':
        return this.createContact(input);
      case 'get_person':
        return this.getContact(input.personId);
      case 'get_persons':
        return this.getContacts(input);
      case 'update_person':
        return this.updateContact(input.personId, input);
      case 'delete_person':
        return this.deleteContact(input.personId);
      case 'search_persons':
        return this.searchContacts(input.term, input);

      // Organization actions
      case 'create_organization':
        return this.createCompany(input);
      case 'get_organization':
        return this.getCompany(input.organizationId);
      case 'get_organizations':
        return this.getCompanies(input);
      case 'update_organization':
        return this.updateCompany(input.organizationId, input);
      case 'delete_organization':
        return this.deleteOrganization(input.organizationId);
      case 'search_organizations':
        return this.searchOrganizations(input.term, input);

      // Lead actions
      case 'create_lead':
        return this.createLead(input);
      case 'get_lead':
        return this.getLead(input.leadId);
      case 'get_leads':
        return this.getLeads(input);
      case 'update_lead':
        return this.updateLead(input.leadId, input);
      case 'delete_lead':
        return this.deleteLead(input.leadId);

      // Note actions
      case 'create_note':
        return this.createNote(input);
      case 'get_note':
        return this.getNote(input.noteId);
      case 'get_notes':
        return this.getNotes(input);
      case 'update_note':
        return this.updateNote(input.noteId, input);
      case 'delete_note':
        return this.deleteNote(input.noteId);

      // Pipeline/Stage actions
      case 'get_pipelines':
        return this.getPipelines();
      case 'get_stages':
        return this.getStages(input.pipelineId);
      case 'update_pipeline':
        return this.updatePipeline(input.pipelineId, input);

      // Product actions
      case 'get_products':
        return this.getProducts(input);

      // File actions
      case 'get_file':
        return this.getFile(input.fileId);
      case 'delete_file':
        return this.deleteFile(input.fileId);

      default:
        throw new Error(`Unknown action: ${actionId}`);
    }
  }

  protected async cleanup(): Promise<void> {
    this.logger.log('Pipedrive connector cleanup completed');
  }

  // ICRMConnector implementation
  async createContact(contact: any): Promise<ConnectorResponse> {
    try {
      // Use 'name' directly if provided, otherwise build from firstName/lastName
      const contactName = contact.name || `${contact.firstName || ''} ${contact.lastName || ''}`.trim();

      const pipedriveContact: any = {
        name: contactName,
        email: contact.email ? [{ value: contact.email, primary: true }] : undefined,
        phone: contact.phone ? [{ value: contact.phone, primary: true }] : undefined,
        org_id: contact.organizationId || contact.org_id,
        owner_id: contact.ownerId || contact.owner_id,
        visible_to: contact.visible_to,
        marketing_status: contact.marketing_status || contact.marketingStatus,
      };

      // Add first_name/last_name if provided separately
      if (contact.firstName) pipedriveContact.first_name = contact.firstName;
      if (contact.lastName) pipedriveContact.last_name = contact.lastName;
      if (contact.jobTitle || contact.job_title) {
        pipedriveContact.job_title = contact.jobTitle || contact.job_title;
      }

      // Spread custom fields
      if (contact.customFields) {
        Object.assign(pipedriveContact, contact.customFields);
      }

      const result = await this.performRequest({
        method: 'POST',
        endpoint: '/persons',
        body: pipedriveContact
      });

      return {
        success: true,
        data: result.data,
        metadata: {
          timestamp: new Date(),
          rateLimit: await this.getRateLimitInfo()
        }
      };
    } catch (error) {
      return this.handleError(error as any, 'Failed to create contact');
    }
  }

  async updateContact(contactId: string, updates: any): Promise<ConnectorResponse> {
    try {
      // Use 'name' directly if provided, otherwise build from firstName/lastName if either exists
      let personName: string | undefined;
      if (updates.name) {
        personName = updates.name;
      } else if (updates.firstName || updates.lastName) {
        personName = `${updates.firstName || ''} ${updates.lastName || ''}`.trim();
      }

      const pipedriveUpdates: any = {
        name: personName,
        email: updates.email ? [{ value: updates.email, primary: true }] : undefined,
        phone: updates.phone ? [{ value: updates.phone, primary: true }] : undefined,
        org_id: updates.organizationId || updates.org_id,
        owner_id: updates.ownerId || updates.owner_id,
        visible_to: updates.visible_to,
        marketing_status: updates.marketing_status || updates.marketingStatus,
      };

      // Add first_name/last_name if provided
      if (updates.firstName) pipedriveUpdates.first_name = updates.firstName;
      if (updates.lastName) pipedriveUpdates.last_name = updates.lastName;
      if (updates.jobTitle || updates.job_title) {
        pipedriveUpdates.job_title = updates.jobTitle || updates.job_title;
      }

      // Spread custom fields
      if (updates.customFields) {
        Object.assign(pipedriveUpdates, updates.customFields);
      }

      const result = await this.performRequest({
        method: 'PUT',
        endpoint: `/persons/${contactId}`,
        body: pipedriveUpdates
      });

      return {
        success: true,
        data: result.data,
        metadata: {
          timestamp: new Date(),
          rateLimit: await this.getRateLimitInfo()
        }
      };
    } catch (error) {
      return this.handleError(error as any, 'Failed to update contact');
    }
  }

  async getContact(contactId: string): Promise<ConnectorResponse> {
    try {
      const result = await this.performRequest({
        method: 'GET',
        endpoint: `/persons/${contactId}`
      });

      return {
        success: true,
        data: result.data,
        metadata: {
          timestamp: new Date(),
          rateLimit: await this.getRateLimitInfo()
        }
      };
    } catch (error) {
      return this.handleError(error as any, 'Failed to get contact');
    }
  }

  async searchContacts(query: string, options?: PaginatedRequest): Promise<ConnectorResponse> {
    try {
      const queryParams = {
        term: query,
        item_types: 'person',
        start: options?.page ? ((options.page - 1) * (options?.pageSize || 100)) : 0,
        limit: options?.pageSize || 100
      };

      const result = await this.performRequest({
        method: 'GET',
        endpoint: '/itemSearch',
        queryParams
      });

      const contacts = result.data?.items?.filter((item: any) => item.type === 'person') || [];

      return {
        success: true,
        data: contacts,
        metadata: {
          timestamp: new Date(),
          rateLimit: await this.getRateLimitInfo(),
          pagination: {
            page: options?.page || 1,
            pageSize: options?.pageSize || 100,
            hasNext: result.additional_data?.pagination?.more_items_in_collection || false,
            total: 0
          }
        }
      };
    } catch (error) {
      return this.handleError(error as any, 'Failed to search contacts');
    }
  }

  async getContacts(options?: PaginatedRequest): Promise<ConnectorResponse> {
    try {
      const queryParams = {
        start: options?.page ? ((options.page - 1) * (options?.pageSize || 100)) : 0,
        limit: options?.pageSize || 100,
        sort: 'update_time DESC'
      };

      const result = await this.performRequest({
        method: 'GET',
        endpoint: '/persons',
        queryParams
      });

      return {
        success: true,
        data: result.data || [],
        metadata: {
          timestamp: new Date(),
          rateLimit: await this.getRateLimitInfo(),
          pagination: {
            page: options?.page || 1,
            pageSize: options?.pageSize || 100,
            hasNext: result.additional_data?.pagination?.more_items_in_collection || false,
            total: 0
          }
        }
      };
    } catch (error) {
      return this.handleError(error as any, 'Failed to get contacts');
    }
  }

  async deleteContact(contactId: string): Promise<ConnectorResponse> {
    try {
      const result = await this.performRequest({
        method: 'DELETE',
        endpoint: `/persons/${contactId}`
      });

      return {
        success: true,
        data: result.data,
        metadata: {
          timestamp: new Date(),
          rateLimit: await this.getRateLimitInfo()
        }
      };
    } catch (error) {
      return this.handleError(error as any, 'Failed to delete contact');
    }
  }

  async createDeal(deal: any): Promise<ConnectorResponse> {
    try {
      const pipedriveDeal = {
        title: deal.title || deal.name,
        value: deal.value || deal.amount,
        currency: deal.currency || 'USD',
        stage_id: deal.stage_id || deal.stageId,
        pipeline_id: deal.pipeline_id || deal.pipelineId,
        person_id: deal.person_id || deal.contactId,
        org_id: deal.org_id || deal.organizationId,
        user_id: deal.user_id || deal.ownerId,
        expected_close_date: deal.expected_close_date || deal.closeDate,
        probability: deal.probability,
        status: deal.status || 'open',
        visible_to: deal.visible_to,
        ...deal.customFields
      };

      const result = await this.performRequest({
        method: 'POST',
        endpoint: '/deals',
        body: pipedriveDeal
      });

      return {
        success: true,
        data: result.data,
        metadata: {
          timestamp: new Date(),
          rateLimit: await this.getRateLimitInfo()
        }
      };
    } catch (error) {
      return this.handleError(error as any, 'Failed to create deal');
    }
  }

  async updateDeal(dealId: string, updates: any): Promise<ConnectorResponse> {
    try {
      const pipedriveUpdates = {
        title: updates.name,
        value: updates.amount,
        currency: updates.currency,
        stage_id: updates.stageId,
        pipeline_id: updates.pipelineId,
        expected_close_date: updates.closeDate,
        probability: updates.probability,
        status: updates.status,
        ...updates.customFields
      };

      const result = await this.performRequest({
        method: 'PUT',
        endpoint: `/deals/${dealId}`,
        body: pipedriveUpdates
      });

      return {
        success: true,
        data: result.data,
        metadata: {
          timestamp: new Date(),
          rateLimit: await this.getRateLimitInfo()
        }
      };
    } catch (error) {
      return this.handleError(error as any, 'Failed to update deal');
    }
  }

  async getDeal(dealId: string): Promise<ConnectorResponse> {
    try {
      const result = await this.performRequest({
        method: 'GET',
        endpoint: `/deals/${dealId}`
      });

      return {
        success: true,
        data: result.data,
        metadata: {
          timestamp: new Date(),
          rateLimit: await this.getRateLimitInfo()
        }
      };
    } catch (error) {
      return this.handleError(error as any, 'Failed to get deal');
    }
  }

  async getDeals(options?: PaginatedRequest): Promise<ConnectorResponse> {
    try {
      const queryParams: any = {
        start: options?.page ? ((options.page - 1) * (options?.pageSize || 100)) : 0,
        limit: options?.pageSize || 100,
        sort: 'update_time DESC'
      };

      if (options?.filters?.status) {
        queryParams.status = options.filters.status;
      }
      if (options?.filters?.stage_id) {
        queryParams.stage_id = options.filters.stage_id;
      }
      if (options?.filters?.pipeline_id) {
        queryParams.pipeline_id = options.filters.pipeline_id;
      }

      const result = await this.performRequest({
        method: 'GET',
        endpoint: '/deals',
        queryParams
      });

      return {
        success: true,
        data: result.data || [],
        metadata: {
          timestamp: new Date(),
          rateLimit: await this.getRateLimitInfo(),
          pagination: {
            page: options?.page || 1,
            pageSize: options?.pageSize || 100,
            hasNext: result.additional_data?.pagination?.more_items_in_collection || false,
            total: 0
          }
        }
      };
    } catch (error) {
      return this.handleError(error as any, 'Failed to get deals');
    }
  }

  async deleteDeal(dealId: string): Promise<ConnectorResponse> {
    try {
      const result = await this.performRequest({
        method: 'DELETE',
        endpoint: `/deals/${dealId}`
      });

      return {
        success: true,
        data: result.data,
        metadata: {
          timestamp: new Date(),
          rateLimit: await this.getRateLimitInfo()
        }
      };
    } catch (error) {
      return this.handleError(error as any, 'Failed to delete deal');
    }
  }

  async createCompany(company: any): Promise<ConnectorResponse> {
    try {
      const pipedriveCompany = {
        name: company.name,
        address: company.address?.street,
        address_locality: company.address?.city,
        address_admin_area_level_1: company.address?.state,
        address_postal_code: company.address?.postalCode,
        address_country: company.address?.country,
        owner_id: company.ownerId,
        ...company.customFields
      };

      const result = await this.performRequest({
        method: 'POST',
        endpoint: '/organizations',
        body: pipedriveCompany
      });

      return {
        success: true,
        data: result.data,
        metadata: {
          timestamp: new Date(),
          rateLimit: await this.getRateLimitInfo()
        }
      };
    } catch (error) {
      return this.handleError(error as any, 'Failed to create company');
    }
  }

  async updateCompany(companyId: string, updates: any): Promise<ConnectorResponse> {
    try {
      const pipedriveUpdates = {
        name: updates.name,
        address: updates.address?.street,
        address_locality: updates.address?.city,
        address_admin_area_level_1: updates.address?.state,
        address_postal_code: updates.address?.postalCode,
        address_country: updates.address?.country,
        ...updates.customFields
      };

      const result = await this.performRequest({
        method: 'PUT',
        endpoint: `/organizations/${companyId}`,
        body: pipedriveUpdates
      });

      return {
        success: true,
        data: result.data,
        metadata: {
          timestamp: new Date(),
          rateLimit: await this.getRateLimitInfo()
        }
      };
    } catch (error) {
      return this.handleError(error as any, 'Failed to update company');
    }
  }

  async getCompany(companyId: string): Promise<ConnectorResponse> {
    try {
      const result = await this.performRequest({
        method: 'GET',
        endpoint: `/organizations/${companyId}`
      });

      return {
        success: true,
        data: result.data,
        metadata: {
          timestamp: new Date(),
          rateLimit: await this.getRateLimitInfo()
        }
      };
    } catch (error) {
      return this.handleError(error as any, 'Failed to get company');
    }
  }

  async getCompanies(options?: PaginatedRequest): Promise<ConnectorResponse> {
    try {
      const queryParams = {
        start: options?.page ? ((options.page - 1) * (options?.pageSize || 100)) : 0,
        limit: options?.pageSize || 100,
        sort: 'update_time DESC'
      };

      const result = await this.performRequest({
        method: 'GET',
        endpoint: '/organizations',
        queryParams
      });

      return {
        success: true,
        data: result.data || [],
        metadata: {
          timestamp: new Date(),
          rateLimit: await this.getRateLimitInfo(),
          pagination: {
            page: options?.page || 1,
            pageSize: options?.pageSize || 100,
            hasNext: result.additional_data?.pagination?.more_items_in_collection || false,
            total: 0
          }
        }
      };
    } catch (error) {
      return this.handleError(error as any, 'Failed to get companies');
    }
  }

  async createActivity(activity: any): Promise<ConnectorResponse> {
    try {
      const pipedriveActivity = {
        subject: activity.subject,
        type: activity.type || activity.activity_type || 'call',
        due_date: activity.due_date || activity.dueDate,
        due_time: activity.due_time || activity.dueTime,
        duration: activity.duration,
        user_id: activity.user_id || activity.ownerId,
        deal_id: activity.deal_id || activity.dealId,
        person_id: activity.person_id || activity.contactId,
        org_id: activity.org_id || activity.organizationId,
        note: activity.note || activity.description,
        done: activity.done !== undefined ? activity.done : (activity.completed ? 1 : 0),
        busy_flag: activity.busy_flag,
        public_description: activity.public_description,
        location: activity.location,
        ...activity.customFields
      };

      const result = await this.performRequest({
        method: 'POST',
        endpoint: '/activities',
        body: pipedriveActivity
      });

      return {
        success: true,
        data: result.data,
        metadata: {
          timestamp: new Date(),
          rateLimit: await this.getRateLimitInfo()
        }
      };
    } catch (error) {
      return this.handleError(error as any, 'Failed to create activity');
    }
  }

  async updateActivity(activityId: string, updates: any): Promise<ConnectorResponse> {
    try {
      const pipedriveUpdates = {
        subject: updates.subject,
        due_date: updates.dueDate,
        due_time: updates.dueTime,
        duration: updates.duration,
        note: updates.description,
        done: updates.completed ? 1 : 0,
        ...updates.customFields
      };

      const result = await this.performRequest({
        method: 'PUT',
        endpoint: `/activities/${activityId}`,
        body: pipedriveUpdates
      });

      return {
        success: true,
        data: result.data,
        metadata: {
          timestamp: new Date(),
          rateLimit: await this.getRateLimitInfo()
        }
      };
    } catch (error) {
      return this.handleError(error as any, 'Failed to update activity');
    }
  }

  async getActivities(options?: PaginatedRequest): Promise<ConnectorResponse> {
    try {
      const queryParams: any = {
        start: options?.page ? ((options.page - 1) * (options?.pageSize || 100)) : 0,
        limit: options?.pageSize || 100
      };

      if (options?.filters?.user_id) {
        queryParams.user_id = options.filters.user_id;
      }
      if (options?.filters?.type) {
        queryParams.type = options.filters.type;
      }

      const result = await this.performRequest({
        method: 'GET',
        endpoint: '/activities',
        queryParams
      });

      return {
        success: true,
        data: result.data || [],
        metadata: {
          timestamp: new Date(),
          rateLimit: await this.getRateLimitInfo(),
          pagination: {
            page: options?.page || 1,
            pageSize: options?.pageSize || 100,
            hasNext: result.additional_data?.pagination?.more_items_in_collection || false,
            total: 0
          }
        }
      };
    } catch (error) {
      return this.handleError(error as any, 'Failed to get activities');
    }
  }

  async getActivity(activityId: string): Promise<ConnectorResponse> {
    try {
      const result = await this.performRequest({
        method: 'GET',
        endpoint: `/activities/${activityId}`
      });

      return {
        success: true,
        data: result.data,
        metadata: { timestamp: new Date(), rateLimit: await this.getRateLimitInfo() }
      };
    } catch (error) {
      return this.handleError(error as any, 'Failed to get activity');
    }
  }

  async deleteActivity(activityId: string): Promise<ConnectorResponse> {
    try {
      const result = await this.performRequest({
        method: 'DELETE',
        endpoint: `/activities/${activityId}`
      });

      return {
        success: true,
        data: result.data,
        metadata: { timestamp: new Date(), rateLimit: await this.getRateLimitInfo() }
      };
    } catch (error) {
      return this.handleError(error as any, 'Failed to delete activity');
    }
  }

  async searchDeals(term: string, options?: any): Promise<ConnectorResponse> {
    try {
      const result = await this.performRequest({
        method: 'GET',
        endpoint: '/deals/search',
        queryParams: { term, limit: options?.limit || 100 }
      });

      return {
        success: true,
        data: result.data?.items || [],
        metadata: { timestamp: new Date(), rateLimit: await this.getRateLimitInfo() }
      };
    } catch (error) {
      return this.handleError(error as any, 'Failed to search deals');
    }
  }

  async deleteOrganization(orgId: string): Promise<ConnectorResponse> {
    try {
      const result = await this.performRequest({
        method: 'DELETE',
        endpoint: `/organizations/${orgId}`
      });

      return {
        success: true,
        data: result.data,
        metadata: { timestamp: new Date(), rateLimit: await this.getRateLimitInfo() }
      };
    } catch (error) {
      return this.handleError(error as any, 'Failed to delete organization');
    }
  }

  async searchOrganizations(term: string, options?: any): Promise<ConnectorResponse> {
    try {
      const result = await this.performRequest({
        method: 'GET',
        endpoint: '/organizations/search',
        queryParams: { term, limit: options?.limit || 100 }
      });

      return {
        success: true,
        data: result.data?.items || [],
        metadata: { timestamp: new Date(), rateLimit: await this.getRateLimitInfo() }
      };
    } catch (error) {
      return this.handleError(error as any, 'Failed to search organizations');
    }
  }

  // Lead methods
  async createLead(lead: any): Promise<ConnectorResponse> {
    try {
      const result = await this.performRequest({
        method: 'POST',
        endpoint: '/leads',
        body: {
          title: lead.title,
          person_id: lead.person_id,
          organization_id: lead.organization_id,
          value: lead.value ? { amount: lead.value, currency: lead.currency || 'USD' } : undefined,
          expected_close_date: lead.expected_close_date,
          label_ids: lead.label_ids,
          owner_id: lead.owner_id,
          ...lead
        }
      });

      return {
        success: true,
        data: result.data,
        metadata: { timestamp: new Date(), rateLimit: await this.getRateLimitInfo() }
      };
    } catch (error) {
      return this.handleError(error as any, 'Failed to create lead');
    }
  }

  async getLead(leadId: string): Promise<ConnectorResponse> {
    try {
      const result = await this.performRequest({
        method: 'GET',
        endpoint: `/leads/${leadId}`
      });

      return {
        success: true,
        data: result.data,
        metadata: { timestamp: new Date(), rateLimit: await this.getRateLimitInfo() }
      };
    } catch (error) {
      return this.handleError(error as any, 'Failed to get lead');
    }
  }

  async getLeads(options?: any): Promise<ConnectorResponse> {
    try {
      const result = await this.performRequest({
        method: 'GET',
        endpoint: '/leads',
        queryParams: {
          limit: options?.limit || 100,
          start: options?.start || 0
        }
      });

      return {
        success: true,
        data: result.data || [],
        metadata: { timestamp: new Date(), rateLimit: await this.getRateLimitInfo() }
      };
    } catch (error) {
      return this.handleError(error as any, 'Failed to get leads');
    }
  }

  async updateLead(leadId: string, updates: any): Promise<ConnectorResponse> {
    try {
      const result = await this.performRequest({
        method: 'PATCH',
        endpoint: `/leads/${leadId}`,
        body: updates
      });

      return {
        success: true,
        data: result.data,
        metadata: { timestamp: new Date(), rateLimit: await this.getRateLimitInfo() }
      };
    } catch (error) {
      return this.handleError(error as any, 'Failed to update lead');
    }
  }

  async deleteLead(leadId: string): Promise<ConnectorResponse> {
    try {
      const result = await this.performRequest({
        method: 'DELETE',
        endpoint: `/leads/${leadId}`
      });

      return {
        success: true,
        data: result.data,
        metadata: { timestamp: new Date(), rateLimit: await this.getRateLimitInfo() }
      };
    } catch (error) {
      return this.handleError(error as any, 'Failed to delete lead');
    }
  }

  // Note methods
  async createNote(note: any): Promise<ConnectorResponse> {
    try {
      const result = await this.performRequest({
        method: 'POST',
        endpoint: '/notes',
        body: {
          content: note.content,
          deal_id: note.deal_id,
          person_id: note.person_id,
          org_id: note.org_id,
          lead_id: note.lead_id,
          pinned_to_deal_flag: note.pinned_to_deal_flag,
          pinned_to_person_flag: note.pinned_to_person_flag,
          pinned_to_organization_flag: note.pinned_to_organization_flag,
          pinned_to_lead_flag: note.pinned_to_lead_flag,
          ...note
        }
      });

      return {
        success: true,
        data: result.data,
        metadata: { timestamp: new Date(), rateLimit: await this.getRateLimitInfo() }
      };
    } catch (error) {
      return this.handleError(error as any, 'Failed to create note');
    }
  }

  async getNote(noteId: string): Promise<ConnectorResponse> {
    try {
      const result = await this.performRequest({
        method: 'GET',
        endpoint: `/notes/${noteId}`
      });

      return {
        success: true,
        data: result.data,
        metadata: { timestamp: new Date(), rateLimit: await this.getRateLimitInfo() }
      };
    } catch (error) {
      return this.handleError(error as any, 'Failed to get note');
    }
  }

  async getNotes(options?: any): Promise<ConnectorResponse> {
    try {
      const result = await this.performRequest({
        method: 'GET',
        endpoint: '/notes',
        queryParams: {
          limit: options?.limit || 100,
          start: options?.start || 0,
          deal_id: options?.deal_id,
          person_id: options?.person_id,
          org_id: options?.org_id,
          lead_id: options?.lead_id
        }
      });

      return {
        success: true,
        data: result.data || [],
        metadata: { timestamp: new Date(), rateLimit: await this.getRateLimitInfo() }
      };
    } catch (error) {
      return this.handleError(error as any, 'Failed to get notes');
    }
  }

  async updateNote(noteId: string, updates: any): Promise<ConnectorResponse> {
    try {
      const result = await this.performRequest({
        method: 'PUT',
        endpoint: `/notes/${noteId}`,
        body: updates
      });

      return {
        success: true,
        data: result.data,
        metadata: { timestamp: new Date(), rateLimit: await this.getRateLimitInfo() }
      };
    } catch (error) {
      return this.handleError(error as any, 'Failed to update note');
    }
  }

  async deleteNote(noteId: string): Promise<ConnectorResponse> {
    try {
      const result = await this.performRequest({
        method: 'DELETE',
        endpoint: `/notes/${noteId}`
      });

      return {
        success: true,
        data: result.data,
        metadata: { timestamp: new Date(), rateLimit: await this.getRateLimitInfo() }
      };
    } catch (error) {
      return this.handleError(error as any, 'Failed to delete note');
    }
  }

  // Product methods
  async getProducts(options?: any): Promise<ConnectorResponse> {
    try {
      const result = await this.performRequest({
        method: 'GET',
        endpoint: '/products',
        queryParams: {
          limit: options?.limit || 100,
          start: options?.start || 0
        }
      });

      return {
        success: true,
        data: result.data || [],
        metadata: { timestamp: new Date(), rateLimit: await this.getRateLimitInfo() }
      };
    } catch (error) {
      return this.handleError(error as any, 'Failed to get products');
    }
  }

  // File methods
  async getFile(fileId: string): Promise<ConnectorResponse> {
    try {
      const result = await this.performRequest({
        method: 'GET',
        endpoint: `/files/${fileId}`
      });

      return {
        success: true,
        data: result.data,
        metadata: { timestamp: new Date(), rateLimit: await this.getRateLimitInfo() }
      };
    } catch (error) {
      return this.handleError(error as any, 'Failed to get file');
    }
  }

  async deleteFile(fileId: string): Promise<ConnectorResponse> {
    try {
      const result = await this.performRequest({
        method: 'DELETE',
        endpoint: `/files/${fileId}`
      });

      return {
        success: true,
        data: result.data,
        metadata: { timestamp: new Date(), rateLimit: await this.getRateLimitInfo() }
      };
    } catch (error) {
      return this.handleError(error as any, 'Failed to delete file');
    }
  }

  async bulkOperation<T>(operation: BulkOperation<T>): Promise<BulkOperationResult<T>> {
    try {
      // Pipedrive doesn't have native bulk operations, so we'll process items individually
      const successful: T[] = [];
      const failed: Array<{ item: T; error: any }> = [];

      for (const item of operation.items) {
        try {
          let result;
          switch (operation.operation) {
            case 'create':
              // Assume items are contacts by default
              result = await this.createContact(item);
              break;
            case 'update':
              result = await this.updateContact((item as any).id, item);
              break;
            case 'delete':
              result = await this.deleteContact((item as any).id);
              break;
          }

          if (result.success) {
            successful.push(item);
          } else {
            failed.push({
              item,
              error: result.error || { code: 'UNKNOWN_ERROR', error: undefined }
            });
          }
        } catch (error) {
          if (operation.continueOnError) {
            failed.push({
              item,
              error: { code: 'BULK_OPERATION_FAILED', message: error.message }
            });
          } else {
            throw error;
          }
        }
      }

      return {
        successful,
        failed,
        totalProcessed: operation.items.length,
        totalSuccessful: successful.length,
        totalFailed: failed.length
      };
    } catch (error) {
      this.logger.error('Bulk operation failed:', error);
      throw error;
    }
  }

  async getCustomFields(objectType: string): Promise<ConnectorResponse> {
    try {
      let endpoint: string;
      switch (objectType.toLowerCase()) {
        case 'person':
        case 'contact':
          endpoint = '/personFields';
          break;
        case 'deal':
          endpoint = '/dealFields';
          break;
        case 'organization':
        case 'company':
          endpoint = '/organizationFields';
          break;
        case 'activity':
          endpoint = '/activityFields';
          break;
        default:
          throw new Error(`Unsupported object type: ${objectType}`);
      }

      const result = await this.performRequest({
        method: 'GET',
        endpoint
      });

      const customFields = result.data?.filter((field: any) => !field.bulk_edit_allowed === false) || [];

      return {
        success: true,
        data: customFields,
        metadata: {
          timestamp: new Date(),
          rateLimit: await this.getRateLimitInfo()
        }
      };
    } catch (error) {
      return this.handleError(error as any, 'Failed to get custom fields');
    }
  }

  async globalSearch(query: string, objectTypes?: string[]): Promise<ConnectorResponse> {
    try {
      const itemTypes = objectTypes?.join(',') || 'person,organization,deal,product';
      
      const result = await this.performRequest({
        method: 'GET',
        endpoint: '/itemSearch',
        queryParams: {
          term: query,
          item_types: itemTypes,
          limit: 100
        }
      });

      return {
        success: true,
        data: result.data?.items || [],
        metadata: {
          timestamp: new Date(),
          rateLimit: await this.getRateLimitInfo()
        }
      };
    } catch (error) {
      return this.handleError(error as any, 'Failed to perform global search');
    }
  }

  // Pipedrive-specific methods
  async updatePipeline(pipelineId: string, updates: any): Promise<ConnectorResponse> {
    try {
      const result = await this.performRequest({
        method: 'PUT',
        endpoint: `/pipelines/${pipelineId}`,
        body: updates
      });

      return {
        success: true,
        data: result.data,
        metadata: {
          timestamp: new Date(),
          rateLimit: await this.getRateLimitInfo()
        }
      };
    } catch (error) {
      return this.handleError(error as any, 'Failed to update pipeline');
    }
  }

  async getPipelines(): Promise<ConnectorResponse> {
    try {
      const result = await this.performRequest({
        method: 'GET',
        endpoint: '/pipelines'
      });

      return {
        success: true,
        data: result.data || [],
        metadata: {
          timestamp: new Date(),
          rateLimit: await this.getRateLimitInfo()
        }
      };
    } catch (error) {
      return this.handleError(error as any, 'Failed to get pipelines');
    }
  }

  async getStages(pipelineId?: string): Promise<ConnectorResponse> {
    try {
      const queryParams = pipelineId ? { pipeline_id: pipelineId } : {};
      
      const result = await this.performRequest({
        method: 'GET',
        endpoint: '/stages',
        queryParams
      });

      return {
        success: true,
        data: result.data || [],
        metadata: {
          timestamp: new Date(),
          rateLimit: await this.getRateLimitInfo()
        }
      };
    } catch (error) {
      return this.handleError(error as any, 'Failed to get stages');
    }
  }

  protected async getRateLimitInfo(): Promise<{ remaining: number; reset: Date } | undefined> {
    // Pipedrive rate limit info would be extracted from response headers
    // This would need to be implemented based on actual API responses
    return undefined;
  }

  private getActions(): ConnectorAction[] {
    return [
      // Activity actions
      { id: 'create_activity', name: 'Create Activity', description: 'Create a new activity', inputSchema: { subject: { type: 'string', required: true }, type: { type: 'string', required: false, description: 'Activity type (call, meeting, task, etc.). Defaults to call' }, due_date: { type: 'string' }, due_time: { type: 'string' }, duration: { type: 'string' }, deal_id: { type: 'number' }, person_id: { type: 'number' }, org_id: { type: 'number' }, note: { type: 'string' }, done: { type: 'number' } }, outputSchema: { id: { type: 'number' }, subject: { type: 'string' } } },
      { id: 'get_activity', name: 'Get Activity', description: 'Get an activity by ID', inputSchema: { activityId: { type: 'number', required: true } }, outputSchema: { id: { type: 'number' }, subject: { type: 'string' } } },
      { id: 'get_activities', name: 'Get Activities', description: 'Get all activities', inputSchema: { limit: { type: 'number' }, start: { type: 'number' } }, outputSchema: { data: { type: 'array' } } },
      { id: 'get_all_activities', name: 'Get All Activities', description: 'Get all activities (alias)', inputSchema: { limit: { type: 'number' }, start: { type: 'number' } }, outputSchema: { data: { type: 'array' } } },
      { id: 'update_activity', name: 'Update Activity', description: 'Update an activity', inputSchema: { activityId: { type: 'number', required: true }, subject: { type: 'string' } }, outputSchema: { id: { type: 'number' }, subject: { type: 'string' } } },
      { id: 'delete_activity', name: 'Delete Activity', description: 'Delete an activity', inputSchema: { activityId: { type: 'number', required: true } }, outputSchema: { success: { type: 'boolean' } } },
      // Deal actions
      { id: 'create_deal', name: 'Create Deal', description: 'Create a new deal', inputSchema: { title: { type: 'string', required: true }, value: { type: 'number' }, stage_id: { type: 'number' } }, outputSchema: { id: { type: 'number' }, title: { type: 'string' } } },
      { id: 'get_deal', name: 'Get Deal', description: 'Get a deal by ID', inputSchema: { dealId: { type: 'number', required: true } }, outputSchema: { id: { type: 'number' }, title: { type: 'string' } } },
      { id: 'get_deals', name: 'Get Deals', description: 'Get all deals', inputSchema: { limit: { type: 'number' }, start: { type: 'number' } }, outputSchema: { data: { type: 'array' } } },
      { id: 'update_deal', name: 'Update Deal', description: 'Update a deal', inputSchema: { dealId: { type: 'number', required: true }, title: { type: 'string' }, value: { type: 'number' } }, outputSchema: { id: { type: 'number' }, title: { type: 'string' } } },
      { id: 'delete_deal', name: 'Delete Deal', description: 'Delete a deal', inputSchema: { dealId: { type: 'number', required: true } }, outputSchema: { success: { type: 'boolean' } } },
      { id: 'search_deals', name: 'Search Deals', description: 'Search for deals', inputSchema: { term: { type: 'string', required: true }, limit: { type: 'number' } }, outputSchema: { data: { type: 'array' } } },
      // Person actions
      { id: 'create_person', name: 'Create Person', description: 'Create a new person', inputSchema: { name: { type: 'string', required: true }, email: { type: 'string' }, phone: { type: 'string' } }, outputSchema: { id: { type: 'number' }, name: { type: 'string' } } },
      { id: 'get_person', name: 'Get Person', description: 'Get a person by ID', inputSchema: { personId: { type: 'number', required: true } }, outputSchema: { id: { type: 'number' }, name: { type: 'string' } } },
      { id: 'get_persons', name: 'Get Persons', description: 'Get all persons', inputSchema: { limit: { type: 'number' }, start: { type: 'number' } }, outputSchema: { data: { type: 'array' } } },
      { id: 'update_person', name: 'Update Person', description: 'Update a person', inputSchema: { personId: { type: 'number', required: true }, name: { type: 'string' } }, outputSchema: { id: { type: 'number' }, name: { type: 'string' } } },
      { id: 'delete_person', name: 'Delete Person', description: 'Delete a person', inputSchema: { personId: { type: 'number', required: true } }, outputSchema: { success: { type: 'boolean' } } },
      { id: 'search_persons', name: 'Search Persons', description: 'Search for persons', inputSchema: { term: { type: 'string', required: true }, limit: { type: 'number' } }, outputSchema: { data: { type: 'array' } } },
      // Organization actions
      { id: 'create_organization', name: 'Create Organization', description: 'Create a new organization', inputSchema: { name: { type: 'string', required: true } }, outputSchema: { id: { type: 'number' }, name: { type: 'string' } } },
      { id: 'get_organization', name: 'Get Organization', description: 'Get an organization by ID', inputSchema: { organizationId: { type: 'number', required: true } }, outputSchema: { id: { type: 'number' }, name: { type: 'string' } } },
      { id: 'get_organizations', name: 'Get Organizations', description: 'Get all organizations', inputSchema: { limit: { type: 'number' }, start: { type: 'number' } }, outputSchema: { data: { type: 'array' } } },
      { id: 'update_organization', name: 'Update Organization', description: 'Update an organization', inputSchema: { organizationId: { type: 'number', required: true }, name: { type: 'string' } }, outputSchema: { id: { type: 'number' }, name: { type: 'string' } } },
      { id: 'delete_organization', name: 'Delete Organization', description: 'Delete an organization', inputSchema: { organizationId: { type: 'number', required: true } }, outputSchema: { success: { type: 'boolean' } } },
      { id: 'search_organizations', name: 'Search Organizations', description: 'Search for organizations', inputSchema: { term: { type: 'string', required: true }, limit: { type: 'number' } }, outputSchema: { data: { type: 'array' } } },
      // Lead actions
      { id: 'create_lead', name: 'Create Lead', description: 'Create a new lead', inputSchema: { title: { type: 'string', required: true }, person_id: { type: 'string' }, organization_id: { type: 'string' } }, outputSchema: { id: { type: 'string' }, title: { type: 'string' } } },
      { id: 'get_lead', name: 'Get Lead', description: 'Get a lead by ID', inputSchema: { leadId: { type: 'string', required: true } }, outputSchema: { id: { type: 'string' }, title: { type: 'string' } } },
      { id: 'get_leads', name: 'Get Leads', description: 'Get all leads', inputSchema: { limit: { type: 'number' }, start: { type: 'number' } }, outputSchema: { data: { type: 'array' } } },
      { id: 'update_lead', name: 'Update Lead', description: 'Update a lead', inputSchema: { leadId: { type: 'string', required: true }, title: { type: 'string' } }, outputSchema: { id: { type: 'string' }, title: { type: 'string' } } },
      { id: 'delete_lead', name: 'Delete Lead', description: 'Delete a lead', inputSchema: { leadId: { type: 'string', required: true } }, outputSchema: { success: { type: 'boolean' } } },
      // Note actions
      { id: 'create_note', name: 'Create Note', description: 'Create a new note', inputSchema: { content: { type: 'string', required: true }, deal_id: { type: 'number' }, person_id: { type: 'number' }, org_id: { type: 'number' } }, outputSchema: { id: { type: 'number' }, content: { type: 'string' } } },
      { id: 'get_note', name: 'Get Note', description: 'Get a note by ID', inputSchema: { noteId: { type: 'number', required: true } }, outputSchema: { id: { type: 'number' }, content: { type: 'string' } } },
      { id: 'get_notes', name: 'Get Notes', description: 'Get all notes', inputSchema: { limit: { type: 'number' }, start: { type: 'number' }, deal_id: { type: 'number' }, person_id: { type: 'number' } }, outputSchema: { data: { type: 'array' } } },
      { id: 'update_note', name: 'Update Note', description: 'Update a note', inputSchema: { noteId: { type: 'number', required: true }, content: { type: 'string' } }, outputSchema: { id: { type: 'number' }, content: { type: 'string' } } },
      { id: 'delete_note', name: 'Delete Note', description: 'Delete a note', inputSchema: { noteId: { type: 'number', required: true } }, outputSchema: { success: { type: 'boolean' } } },
      // Pipeline/Stage actions
      { id: 'get_pipelines', name: 'Get Pipelines', description: 'Get all pipelines', inputSchema: {}, outputSchema: { data: { type: 'array' } } },
      { id: 'get_stages', name: 'Get Stages', description: 'Get all stages', inputSchema: { pipelineId: { type: 'number' } }, outputSchema: { data: { type: 'array' } } },
      { id: 'update_pipeline', name: 'Update Pipeline', description: 'Update a pipeline', inputSchema: { pipelineId: { type: 'number', required: true }, name: { type: 'string' } }, outputSchema: { id: { type: 'number' }, name: { type: 'string' } } },
      // Product actions
      { id: 'get_products', name: 'Get Products', description: 'Get all products', inputSchema: { limit: { type: 'number' }, start: { type: 'number' } }, outputSchema: { data: { type: 'array' } } },
      // File actions
      { id: 'get_file', name: 'Get File', description: 'Get a file by ID', inputSchema: { fileId: { type: 'number', required: true } }, outputSchema: { id: { type: 'number' }, name: { type: 'string' } } },
      { id: 'delete_file', name: 'Delete File', description: 'Delete a file', inputSchema: { fileId: { type: 'number', required: true } }, outputSchema: { success: { type: 'boolean' } } },
    ];
  }

  private getTriggers(): ConnectorTrigger[] {
    return [
      {
        id: 'deal_updated',
        name: 'Deal Updated',
        description: 'Triggered when a deal is updated',
        eventType: 'updated.deal',
        outputSchema: {
          deal: { type: 'object', description: 'Updated deal information' }
        },
        webhookRequired: true
      },
      {
        id: 'person_created',
        name: 'Person Created',
        description: 'Triggered when a new person is created',
        eventType: 'added.person',
        outputSchema: {
          person: { type: 'object', description: 'Created person information' }
        },
        webhookRequired: true
      },
      {
        id: 'deal_stage_changed',
        name: 'Deal Stage Changed',
        description: 'Triggered when a deal moves to a different stage',
        eventType: 'updated.deal',
        outputSchema: {
          deal: { type: 'object', description: 'Deal with updated stage' },
          previousStage: { type: 'object', description: 'Previous stage information' },
          newStage: { type: 'object', description: 'New stage information' }
        },
        webhookRequired: true
      },
      {
        id: 'activity_created',
        name: 'Activity Created',
        description: 'Triggered when a new activity is created',
        eventType: 'added.activity',
        outputSchema: {
          activity: { type: 'object', description: 'Created activity information' }
        },
        webhookRequired: true
      },
      {
        id: 'organization_updated',
        name: 'Organization Updated',
        description: 'Triggered when an organization is updated',
        eventType: 'updated.organization',
        outputSchema: {
          organization: { type: 'object', description: 'Updated organization information' }
        },
        webhookRequired: true
      }
    ];
  }
}