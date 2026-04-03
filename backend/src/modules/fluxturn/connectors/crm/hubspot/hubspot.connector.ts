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
  BulkOperationResult,
  OAuthTokens
} from '../../types';
import { AuthUtils } from '../../utils/auth.utils';
import { ApiUtils } from '../../utils/api.utils';

interface HubSpotContact {
  properties: {
    firstname?: string;
    lastname?: string;
    email?: string;
    phone?: string;
    company?: string;
    website?: string;
    jobtitle?: string;
    [key: string]: any;
  };
}

interface HubSpotDeal {
  properties: {
    dealname?: string;
    amount?: string;
    dealstage?: string;
    closedate?: string;
    pipeline?: string;
    dealtype?: string;
    [key: string]: any;
  };
  associations?: any[];
}

@Injectable()
export class HubSpotConnector extends BaseConnector implements ICRMConnector {
  private readonly baseUrl = 'https://api.hubapi.com';

  constructor(
    private readonly authUtils: AuthUtils,
    private readonly apiUtils: ApiUtils
  ) {
    super();
  }

  getMetadata(): ConnectorMetadata {
    return {
      name: 'HubSpot',
      description: 'HubSpot CRM and marketing automation platform with comprehensive inbound marketing tools',
      version: '1.0.0',
      category: ConnectorCategory.CRM,
      type: ConnectorType.HUBSPOT,
      logoUrl: 'https://www.hubspot.com/hubfs/HubSpot_Logos/HubSpot-Inversed-Favicon.png',
      documentationUrl: 'https://developers.hubspot.com/docs/api/overview',
      authType: AuthType.OAUTH2,
      requiredScopes: [
        'contacts',
        'content',
        'crm.objects.contacts.read',
        'crm.objects.contacts.write',
        'crm.objects.deals.read',
        'crm.objects.deals.write',
        'crm.objects.companies.read',
        'crm.objects.companies.write',
        'tickets'
      ],
      actions: this.getActions(),
      triggers: this.getTriggers(),
      rateLimit: {
        requestsPerSecond: 10,
        requestsPerMinute: 600,
        requestsPerDay: 40000
      },
      webhookSupport: true
    };
  }

  protected async initializeConnection(): Promise<void> {
    try {
      // Test the connection by fetching account info
      const response = await this.performRequest({
        method: 'GET',
        endpoint: '/account-info/v3/details',
        headers: this.getAuthHeaders()
      });

      if (!response) {
        throw new Error('Failed to connect to HubSpot API');
      }

      this.logger.log('HubSpot connector initialized successfully');
    } catch (error) {
      this.logger.error('Failed to initialize HubSpot connection:', error);
      throw new Error(`HubSpot connection failed: ${error.message}`);
    }
  }

  protected async performConnectionTest(): Promise<boolean> {
    try {
      const response = await this.performRequest({
        method: 'GET',
        endpoint: '/account-info/v3/details',
        headers: this.getAuthHeaders()
      });
      return !!response;
    } catch (error) {
      this.logger.error('HubSpot connection test failed:', error);
      return false;
    }
  }

  protected async performHealthCheck(): Promise<void> {
    try {
      await this.performRequest({
        method: 'GET',
        endpoint: '/account-info/v3/details',
        headers: this.getAuthHeaders()
      });
    } catch (error) {
      throw new Error(`HubSpot health check failed: ${error.message}`);
    }
  }

  protected async performRequest(request: ConnectorRequest): Promise<any> {
    try {
      const authHeaders = this.getAuthHeaders();

      const response = await this.apiUtils.executeRequest({
        ...request,
        endpoint: `${this.baseUrl}${request.endpoint}`,
        headers: {
          ...authHeaders,
          'Content-Type': 'application/json',
          ...request.headers
        }
      });

      if (!response.success) {
        throw new Error(response.error?.message || 'Request failed');
      }

      return response.data;
    } catch (error) {
      this.logger.error('HubSpot request failed:', error);
      throw error;
    }
  }

  protected async performAction(actionId: string, input: any): Promise<any> {
    switch (actionId) {
      case 'create_contact':
        return this.createContact(input);
      case 'create_deal':
        return this.createDeal(input);
      case 'create_company':
        return this.createCompany(input);
      case 'update_company':
        return this.updateCompany(input.companyId, input);
      case 'get_company':
        return this.getCompany(input.companyId);
      case 'delete_company':
        return this.deleteCompany(input.companyId);
      case 'search_companies':
        return this.searchCompanies(input);
      case 'add_to_list':
        return this.addToList(input.listId, input.contacts);
      case 'track_event':
        return this.trackEvent(input.eventName, input.properties, input.email);
      case 'get_companies':
        return this.getCompanies(input.options);
      case 'create_ticket':
        return this.createTicket(input);
      default:
        throw new Error(`Unknown action: ${actionId}`);
    }
  }

  protected async cleanup(): Promise<void> {
    this.logger.log('HubSpot connector cleanup completed');
  }

  // ICRMConnector implementation
  async createContact(contact: any): Promise<ConnectorResponse> {
    try {
      const hubspotContact: HubSpotContact = {
        properties: {
          firstname: contact.firstName,
          lastname: contact.lastName,
          email: contact.email,
          phone: contact.phone,
          company: contact.company,
          website: contact.website,
          jobtitle: contact.jobTitle,
          lifecyclestage: contact.lifecycleStage || 'lead',
          hs_lead_status: contact.leadStatus,
          mobilephone: contact.mobile,
          address: contact.address?.street,
          city: contact.address?.city,
          state: contact.address?.state,
          zip: contact.address?.postalCode,
          country: contact.address?.country,
          ...contact.customProperties
        }
      };

      const result = await this.performRequest({
        method: 'POST',
        endpoint: '/crm/v3/objects/contacts',
        body: hubspotContact
      });

      return {
        success: true,
        data: result,
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
      const hubspotUpdates = {
        properties: {
          firstname: updates.firstName,
          lastname: updates.lastName,
          email: updates.email,
          phone: updates.phone,
          company: updates.company,
          jobtitle: updates.jobTitle,
          lifecyclestage: updates.lifecycleStage,
          ...updates.customProperties
        }
      };

      const result = await this.performRequest({
        method: 'PATCH',
        endpoint: `/crm/v3/objects/contacts/${contactId}`,
        body: hubspotUpdates
      });

      return {
        success: true,
        data: result,
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
        endpoint: `/crm/v3/objects/contacts/${contactId}`,
        queryParams: {
          properties: [
            'firstname', 'lastname', 'email', 'phone', 'company', 
            'jobtitle', 'lifecyclestage', 'createdate', 'lastmodifieddate'
          ].join(',')
        }
      });

      return {
        success: true,
        data: result,
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
      const searchRequest = {
        filterGroups: [
          {
            filters: [
              {
                propertyName: 'email',
                operator: 'CONTAINS_TOKEN',
                value: query
              }
            ]
          },
          {
            filters: [
              {
                propertyName: 'firstname',
                operator: 'CONTAINS_TOKEN',
                value: query
              }
            ]
          },
          {
            filters: [
              {
                propertyName: 'lastname',
                operator: 'CONTAINS_TOKEN',
                value: query
              }
            ]
          }
        ],
        properties: [
          'firstname', 'lastname', 'email', 'phone', 'company', 
          'jobtitle', 'lifecyclestage'
        ],
        limit: options?.pageSize || 100,
        after: options?.page ? ((options.page - 1) * (options?.pageSize || 100)).toString() : undefined
      };

      const result = await this.performRequest({
        method: 'POST',
        endpoint: '/crm/v3/objects/contacts/search',
        body: searchRequest
      });

      return {
        success: true,
        data: result.results,
        metadata: {
          timestamp: new Date(),
          rateLimit: await this.getRateLimitInfo(),
          pagination: {
            page: options?.page || 1,
            pageSize: options?.pageSize || 100,
            hasNext: !!result.paging?.next,
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
      const queryParams: any = {
        limit: options?.pageSize || 100,
        properties: [
          'firstname', 'lastname', 'email', 'phone', 'company', 
          'jobtitle', 'lifecyclestage', 'createdate', 'lastmodifieddate'
        ].join(',')
      };

      if (options?.page && options.page > 1) {
        queryParams.after = ((options.page - 1) * (options?.pageSize || 100)).toString();
      }

      const result = await this.performRequest({
        method: 'GET',
        endpoint: '/crm/v3/objects/contacts',
        queryParams
      });

      return {
        success: true,
        data: result.results,
        metadata: {
          timestamp: new Date(),
          rateLimit: await this.getRateLimitInfo(),
          pagination: {
            page: options?.page || 1,
            pageSize: options?.pageSize || 100,
            hasNext: !!result.paging?.next,
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
      await this.performRequest({
        method: 'DELETE',
        endpoint: `/crm/v3/objects/contacts/${contactId}`
      });

      return {
        success: true,
        data: { deleted: true, id: contactId },
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
      const hubspotDeal: HubSpotDeal = {
        properties: {
          dealname: deal.name,
          amount: deal.amount?.toString(),
          dealstage: deal.stage || 'appointmentscheduled',
          closedate: deal.closeDate,
          pipeline: deal.pipeline || 'default',
          dealtype: deal.type,
          hubspot_owner_id: deal.ownerId,
          description: deal.description,
          ...deal.customProperties
        }
      };

      // Add associations if provided
      if (deal.contactId || deal.companyId) {
        hubspotDeal.associations = [];
        if (deal.contactId) {
          hubspotDeal.associations.push({
            to: { id: deal.contactId },
            types: [{ associationCategory: 'HUBSPOT_DEFINED', associationTypeId: 3 }]
          });
        }
        if (deal.companyId) {
          hubspotDeal.associations.push({
            to: { id: deal.companyId },
            types: [{ associationCategory: 'HUBSPOT_DEFINED', associationTypeId: 5 }]
          });
        }
      }

      const result = await this.performRequest({
        method: 'POST',
        endpoint: '/crm/v3/objects/deals',
        body: hubspotDeal
      });

      return {
        success: true,
        data: result,
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
      const hubspotUpdates = {
        properties: {
          dealname: updates.name,
          amount: updates.amount?.toString(),
          dealstage: updates.stage,
          closedate: updates.closeDate,
          dealtype: updates.type,
          description: updates.description,
          ...updates.customProperties
        }
      };

      const result = await this.performRequest({
        method: 'PATCH',
        endpoint: `/crm/v3/objects/deals/${dealId}`,
        body: hubspotUpdates
      });

      return {
        success: true,
        data: result,
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
        endpoint: `/crm/v3/objects/deals/${dealId}`,
        queryParams: {
          properties: [
            'dealname', 'amount', 'dealstage', 'closedate', 'pipeline',
            'dealtype', 'description', 'createdate', 'lastmodifieddate'
          ].join(',')
        }
      });

      return {
        success: true,
        data: result,
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
        limit: options?.pageSize || 100,
        properties: [
          'dealname', 'amount', 'dealstage', 'closedate', 'pipeline',
          'dealtype', 'description', 'createdate', 'lastmodifieddate'
        ].join(',')
      };

      if (options?.page && options.page > 1) {
        queryParams.after = ((options.page - 1) * (options?.pageSize || 100)).toString();
      }

      const result = await this.performRequest({
        method: 'GET',
        endpoint: '/crm/v3/objects/deals',
        queryParams
      });

      return {
        success: true,
        data: result.results,
        metadata: {
          timestamp: new Date(),
          rateLimit: await this.getRateLimitInfo(),
          pagination: {
            page: options?.page || 1,
            pageSize: options?.pageSize || 100,
            hasNext: !!result.paging?.next,
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
      await this.performRequest({
        method: 'DELETE',
        endpoint: `/crm/v3/objects/deals/${dealId}`
      });

      return {
        success: true,
        data: { deleted: true, id: dealId },
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
      // Build properties object, handling both flat and nested input formats
      const properties: Record<string, any> = {};

      // Required field
      if (company.name) properties.name = company.name;

      // Domain can come from domain or website
      if (company.domain) properties.domain = company.domain;
      else if (company.website) properties.domain = company.website;

      // Basic fields (flat format from definition schema)
      if (company.phone) properties.phone = company.phone;
      if (company.industry) properties.industry = company.industry;
      if (company.type) properties.type = company.type;
      if (company.description) properties.description = company.description;

      // Address fields - support both flat (from definition) and nested formats
      if (company.city) properties.city = company.city;
      else if (company.address?.city) properties.city = company.address.city;

      if (company.state) properties.state = company.state;
      else if (company.address?.state) properties.state = company.address.state;

      if (company.zip) properties.zip = company.zip;
      else if (company.postalCode) properties.zip = company.postalCode;
      else if (company.address?.postalCode) properties.zip = company.address.postalCode;

      if (company.country) properties.country = company.country;
      else if (company.address?.country) properties.country = company.address.country;

      if (company.address?.street) properties.address = company.address.street;
      else if (company.streetAddress) properties.address = company.streetAddress;

      // Numeric fields
      if (company.numberOfEmployees != null) {
        properties.numberofemployees = company.numberOfEmployees.toString();
      }
      if (company.annualRevenue != null) {
        properties.annualrevenue = company.annualRevenue.toString();
      }

      // Merge additional fields / custom properties
      if (company.additionalFields && typeof company.additionalFields === 'object') {
        Object.assign(properties, company.additionalFields);
      }
      if (company.customProperties && typeof company.customProperties === 'object') {
        Object.assign(properties, company.customProperties);
      }

      // Remove undefined/null values
      Object.keys(properties).forEach(key => {
        if (properties[key] === undefined || properties[key] === null || properties[key] === '') {
          delete properties[key];
        }
      });

      const hubspotCompany = { properties };

      const result = await this.performRequest({
        method: 'POST',
        endpoint: '/crm/v3/objects/companies',
        body: hubspotCompany
      });

      return {
        success: true,
        data: result,
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
      // Build properties object, handling both flat and nested input formats
      const properties: Record<string, any> = {};

      // Basic fields
      if (updates.name) properties.name = updates.name;
      if (updates.domain) properties.domain = updates.domain;
      else if (updates.website) properties.domain = updates.website;
      if (updates.phone) properties.phone = updates.phone;
      if (updates.industry) properties.industry = updates.industry;
      if (updates.type) properties.type = updates.type;
      if (updates.description) properties.description = updates.description;

      // Address fields - support both flat and nested formats
      if (updates.city) properties.city = updates.city;
      if (updates.state) properties.state = updates.state;
      if (updates.zip) properties.zip = updates.zip;
      else if (updates.postalCode) properties.zip = updates.postalCode;
      if (updates.country) properties.country = updates.country;
      if (updates.streetAddress) properties.address = updates.streetAddress;

      // Numeric fields
      if (updates.numberOfEmployees != null) {
        properties.numberofemployees = updates.numberOfEmployees.toString();
      }
      if (updates.annualRevenue != null) {
        properties.annualrevenue = updates.annualRevenue.toString();
      }

      // Merge additional fields / custom properties
      if (updates.additionalFields && typeof updates.additionalFields === 'object') {
        Object.assign(properties, updates.additionalFields);
      }
      if (updates.customProperties && typeof updates.customProperties === 'object') {
        Object.assign(properties, updates.customProperties);
      }

      const hubspotUpdates = { properties };

      const result = await this.performRequest({
        method: 'PATCH',
        endpoint: `/crm/v3/objects/companies/${companyId}`,
        body: hubspotUpdates
      });

      return {
        success: true,
        data: result,
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
        endpoint: `/crm/v3/objects/companies/${companyId}`,
        queryParams: {
          properties: [
            'name', 'domain', 'phone', 'industry', 'type',
            'numberofemployees', 'annualrevenue', 'description',
            'createdate', 'lastmodifieddate'
          ].join(',')
        }
      });

      return {
        success: true,
        data: result,
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
      const queryParams: any = {
        limit: options?.pageSize || 100,
        properties: [
          'name', 'domain', 'phone', 'industry', 'type',
          'numberofemployees', 'annualrevenue', 'description',
          'createdate', 'lastmodifieddate'
        ].join(',')
      };

      if (options?.page && options.page > 1) {
        queryParams.after = ((options.page - 1) * (options?.pageSize || 100)).toString();
      }

      const result = await this.performRequest({
        method: 'GET',
        endpoint: '/crm/v3/objects/companies',
        queryParams
      });

      return {
        success: true,
        data: result.results,
        metadata: {
          timestamp: new Date(),
          rateLimit: await this.getRateLimitInfo(),
          pagination: {
            page: options?.page || 1,
            pageSize: options?.pageSize || 100,
            hasNext: !!result.paging?.next,
            total: 0
          }
        }
      };
    } catch (error) {
      return this.handleError(error as any, 'Failed to get companies');
    }
  }

  async deleteCompany(companyId: string): Promise<ConnectorResponse> {
    try {
      await this.performRequest({
        method: 'DELETE',
        endpoint: `/crm/v3/objects/companies/${companyId}`
      });

      return {
        success: true,
        data: { deleted: true, companyId },
        metadata: {
          timestamp: new Date(),
          rateLimit: await this.getRateLimitInfo()
        }
      };
    } catch (error) {
      return this.handleError(error as any, 'Failed to delete company');
    }
  }

  async searchCompanies(input: any): Promise<ConnectorResponse> {
    try {
      const filterGroups: any[] = [];

      // Build filter for domain search
      if (input.domain) {
        filterGroups.push({
          filters: [{
            propertyName: 'domain',
            operator: 'CONTAINS_TOKEN',
            value: input.domain
          }]
        });
      }

      // Build filter for name search
      if (input.name) {
        filterGroups.push({
          filters: [{
            propertyName: 'name',
            operator: 'CONTAINS_TOKEN',
            value: input.name
          }]
        });
      }

      const searchBody: any = {
        filterGroups: filterGroups.length > 0 ? filterGroups : undefined,
        limit: input.limit || 10,
        properties: input.properties?.split(',').map((p: string) => p.trim()) || [
          'name', 'domain', 'phone', 'industry', 'type',
          'numberofemployees', 'annualrevenue', 'description'
        ]
      };

      // Remove undefined filterGroups
      if (!searchBody.filterGroups || searchBody.filterGroups.length === 0) {
        delete searchBody.filterGroups;
      }

      const result = await this.performRequest({
        method: 'POST',
        endpoint: '/crm/v3/objects/companies/search',
        body: searchBody
      });

      return {
        success: true,
        data: {
          results: result.results || [],
          total: result.total || 0
        },
        metadata: {
          timestamp: new Date(),
          rateLimit: await this.getRateLimitInfo()
        }
      };
    } catch (error) {
      return this.handleError(error as any, 'Failed to search companies');
    }
  }

  async createActivity(activity: any): Promise<ConnectorResponse> {
    try {
      const hubspotActivity = {
        engagement: {
          active: true,
          type: activity.type || 'TASK'
        },
        associations: {
          contactIds: activity.contactIds || [],
          companyIds: activity.companyIds || [],
          dealIds: activity.dealIds || []
        },
        metadata: {
          subject: activity.subject,
          body: activity.description,
          status: activity.status || 'NOT_STARTED',
          forObjectType: 'CONTACT'
        }
      };

      const result = await this.performRequest({
        method: 'POST',
        endpoint: '/engagements/v1/engagements',
        body: hubspotActivity
      });

      return {
        success: true,
        data: result,
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
      const hubspotUpdates = {
        engagement: {
          active: true
        },
        metadata: {
          subject: updates.subject,
          body: updates.description,
          status: updates.status
        }
      };

      const result = await this.performRequest({
        method: 'PATCH',
        endpoint: `/engagements/v1/engagements/${activityId}`,
        body: hubspotUpdates
      });

      return {
        success: true,
        data: result,
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
        limit: options?.pageSize || 100,
        offset: options?.page ? ((options.page - 1) * (options?.pageSize || 100)) : 0
      };

      const result = await this.performRequest({
        method: 'GET',
        endpoint: '/engagements/v1/engagements/paged',
        queryParams
      });

      return {
        success: true,
        data: result.results,
        metadata: {
          timestamp: new Date(),
          rateLimit: await this.getRateLimitInfo(),
          pagination: {
            page: options?.page || 1,
            pageSize: options?.pageSize || 100,
            hasNext: result.hasMore,
            total: 0
          }
        }
      };
    } catch (error) {
      return this.handleError(error as any, 'Failed to get activities');
    }
  }

  async bulkOperation<T>(operation: BulkOperation<T>): Promise<BulkOperationResult<T>> {
    try {
      const batchSize = Math.min(operation.batchSize || 100, 100); // HubSpot limit
      const batches: any[] = [];
      
      for (let i = 0; i < operation.items.length; i += batchSize) {
        batches.push(operation.items.slice(i, i + batchSize));
      }

      const successful: T[] = [];
      const failed: Array<{ item: T; error: any }> = [];

      for (const batch of batches) {
        try {
          let endpoint: string;
          let method: 'POST' | 'PATCH' = 'POST';
          
          switch (operation.operation) {
            case 'create':
              endpoint = '/crm/v3/objects/contacts/batch/create';
              break;
            case 'update':
              endpoint = '/crm/v3/objects/contacts/batch/update';
              method = 'PATCH';
              break;
            default:
              throw new Error(`Unsupported bulk operation: ${operation.operation}`);
          }

          const result = await this.performRequest({
            method,
            endpoint,
            body: { inputs: batch }
          });

          if (result.results) {
            successful.push(...batch);
          }
        } catch (error) {
          if (operation.continueOnError) {
            batch.forEach(item => {
              failed.push({
                item,
                error: { code: 'BULK_OPERATION_FAILED', message: error.message }
              });
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
      const result = await this.performRequest({
        method: 'GET',
        endpoint: `/crm/v3/properties/${objectType}`
      });

      const customFields = result.results.filter((field: any) => 
        field.name.startsWith('hs_') === false && field.hubspotDefined === false
      );

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
      const searchRequest = {
        query,
        limit: 100,
        after: 0,
        sorts: [{ propertyName: 'hs_lastmodifieddate', direction: 'DESCENDING' }],
        properties: ['name', 'email', 'phone', 'company'],
        filterGroups: []
      };

      const results: any[] = [];
      const types = objectTypes || ['contacts', 'companies', 'deals'];

      for (const type of types) {
        try {
          const result = await this.performRequest({
            method: 'POST',
            endpoint: `/crm/v3/objects/${type}/search`,
            body: {
              ...searchRequest,
              filterGroups: [
                {
                  filters: [
                    {
                      propertyName: type === 'contacts' ? 'email' : 'name',
                      operator: 'CONTAINS_TOKEN',
                      value: query
                    }
                  ]
                }
              ]
            }
          });

          results.push(...result.results.map((item: any) => ({ ...item, objectType: type })));
        } catch (error) {
          this.logger.warn(`Failed to search in ${type}:`, error);
        }
      }

      return {
        success: true,
        data: results,
        metadata: {
          timestamp: new Date(),
          rateLimit: await this.getRateLimitInfo()
        }
      };
    } catch (error) {
      return this.handleError(error as any, 'Failed to perform global search');
    }
  }

  // HubSpot-specific methods
  async addToList(listId: string, contacts: string[]): Promise<ConnectorResponse> {
    try {
      const result = await this.performRequest({
        method: 'POST',
        endpoint: `/contacts/v1/lists/${listId}/add`,
        body: {
          vids: contacts
        }
      });

      return {
        success: true,
        data: result,
        metadata: {
          timestamp: new Date(),
          rateLimit: await this.getRateLimitInfo()
        }
      };
    } catch (error) {
      return this.handleError(error as any, 'Failed to add contacts to list');
    }
  }

  async trackEvent(eventName: string, properties: any, email: string): Promise<ConnectorResponse> {
    try {
      const result = await this.performRequest({
        method: 'POST',
        endpoint: '/events/v3/send',
        body: {
          email,
          eventName,
          properties,
          occurredAt: new Date().toISOString()
        }
      });

      return {
        success: true,
        data: result,
        metadata: {
          timestamp: new Date(),
          rateLimit: await this.getRateLimitInfo()
        }
      };
    } catch (error) {
      return this.handleError(error as any, 'Failed to track event');
    }
  }

  async createTicket(ticket: any): Promise<ConnectorResponse> {
    try {
      const hubspotTicket = {
        properties: {
          subject: ticket.subject,
          content: ticket.description,
          hs_pipeline: ticket.pipeline || 'default',
          hs_pipeline_stage: ticket.stage || 'new',
          hs_ticket_priority: ticket.priority || 'MEDIUM',
          source_type: ticket.source || 'EMAIL',
          hubspot_owner_id: ticket.ownerId,
          ...ticket.customProperties
        }
      };

      const result = await this.performRequest({
        method: 'POST',
        endpoint: '/crm/v3/objects/tickets',
        body: hubspotTicket
      });

      return {
        success: true,
        data: result,
        metadata: {
          timestamp: new Date(),
          rateLimit: await this.getRateLimitInfo()
        }
      };
    } catch (error) {
      return this.handleError(error as any, 'Failed to create ticket');
    }
  }

  async refreshTokens(): Promise<OAuthTokens> {
    try {
      const refreshToken = this.config.credentials.refreshToken;
      if (!refreshToken) {
        throw new Error('No refresh token available');
      }

      const clientId = this.config.credentials.clientId;
      const clientSecret = this.config.credentials.clientSecret;
      if (!clientId || !clientSecret) {
        throw new Error('Client ID and Secret are required for token refresh');
      }

      const result = await this.apiUtils.post('https://api.hubapi.com/oauth/v1/token', {
        grant_type: 'refresh_token',
        client_id: clientId,
        client_secret: clientSecret,
        refresh_token: refreshToken
      });

      if (!result.success) {
        throw new Error(result.error?.message || 'Token refresh failed');
      }

      return {
        accessToken: result.data.access_token,
        refreshToken: result.data.refresh_token || refreshToken,
        expiresAt: result.data.expires_in ? new Date(Date.now() + (result.data.expires_in * 1000)) : undefined,
        tokenType: result.data.token_type
      };
    } catch (error) {
      this.logger.error('Token refresh failed:', error);
      throw error;
    }
  }

  protected async getRateLimitInfo(): Promise<{ remaining: number; reset: Date } | undefined> {
    // HubSpot rate limit info is typically returned in response headers
    // This would need to be implemented based on actual API responses
    return undefined;
  }

  private getAuthHeaders(): Record<string, string> {
    const authType = this.config.credentials.authType;

    // OAuth2 access token
    if (this.config.credentials.accessToken) {
      return {
        'Authorization': `Bearer ${this.config.credentials.accessToken}`
      };
    }

    // Private App Token (recommended for server-to-server)
    if (authType === 'appToken' && this.config.credentials.appToken) {
      return {
        'Authorization': `Bearer ${this.config.credentials.appToken}`
      };
    }

    // API Key (legacy, but still supported as Bearer token for Private Apps)
    if (authType === 'apiKey' && this.config.credentials.apiKey) {
      return {
        'Authorization': `Bearer ${this.config.credentials.apiKey}`
      };
    }

    return {};
  }

  private getActions(): ConnectorAction[] {
    return [
      {
        id: 'create_contact',
        name: 'Create Contact',
        description: 'Create a new contact in HubSpot',
        inputSchema: {
          firstName: { type: 'string', description: 'Contact first name' },
          lastName: { type: 'string', description: 'Contact last name' },
          email: { type: 'string', required: true, description: 'Contact email address' },
          phone: { type: 'string', description: 'Contact phone number' },
          company: { type: 'string', description: 'Company name' }
        },
        outputSchema: {
          id: { type: 'string', description: 'Created contact ID' },
          success: { type: 'boolean', description: 'Whether creation was successful' }
        }
      },
      {
        id: 'create_deal',
        name: 'Create Deal',
        description: 'Create a new deal in HubSpot',
        inputSchema: {
          name: { type: 'string', required: true, description: 'Deal name' },
          amount: { type: 'number', description: 'Deal amount' },
          stage: { type: 'string', description: 'Deal stage' },
          closeDate: { type: 'string', description: 'Expected close date' }
        },
        outputSchema: {
          id: { type: 'string', description: 'Created deal ID' }
        }
      },
      {
        id: 'create_company',
        name: 'Create Company',
        description: 'Create a new company in HubSpot',
        inputSchema: {
          name: { type: 'string', required: true, description: 'Company name' },
          domain: { type: 'string', description: 'Company website domain' },
          phone: { type: 'string', description: 'Company phone number' },
          industry: { type: 'string', description: 'Industry' },
          type: { type: 'string', description: 'Company type' },
          numberOfEmployees: { type: 'number', description: 'Number of employees' },
          annualRevenue: { type: 'number', description: 'Annual revenue' },
          description: { type: 'string', description: 'Company description' }
        },
        outputSchema: {
          id: { type: 'string', description: 'Created company ID' },
          success: { type: 'boolean', description: 'Whether creation was successful' }
        }
      },
      {
        id: 'update_company',
        name: 'Update Company',
        description: 'Update an existing company in HubSpot',
        inputSchema: {
          companyId: { type: 'string', required: true, description: 'Company ID to update' },
          name: { type: 'string', description: 'Company name' },
          domain: { type: 'string', description: 'Company website domain' },
          phone: { type: 'string', description: 'Company phone number' },
          industry: { type: 'string', description: 'Industry' },
          numberOfEmployees: { type: 'number', description: 'Number of employees' },
          annualRevenue: { type: 'number', description: 'Annual revenue' },
          description: { type: 'string', description: 'Company description' }
        },
        outputSchema: {
          id: { type: 'string', description: 'Updated company ID' },
          success: { type: 'boolean', description: 'Whether update was successful' }
        }
      },
      {
        id: 'get_company',
        name: 'Get Company',
        description: 'Retrieve a company by ID from HubSpot',
        inputSchema: {
          companyId: { type: 'string', required: true, description: 'Company ID' }
        },
        outputSchema: {
          company: { type: 'object', description: 'Company information' }
        }
      },
      {
        id: 'delete_company',
        name: 'Delete Company',
        description: 'Delete a company from HubSpot',
        inputSchema: {
          companyId: { type: 'string', required: true, description: 'Company ID to delete' }
        },
        outputSchema: {
          deleted: { type: 'boolean', description: 'Whether deletion was successful' }
        }
      },
      {
        id: 'search_companies',
        name: 'Search Companies',
        description: 'Search companies by domain or name',
        inputSchema: {
          domain: { type: 'string', description: 'Search by company domain' },
          name: { type: 'string', description: 'Search by company name' },
          limit: { type: 'number', description: 'Maximum results to return' },
          properties: { type: 'string', description: 'Comma-separated properties to return' }
        },
        outputSchema: {
          results: { type: 'array', description: 'Array of matching companies' },
          total: { type: 'number', description: 'Total number of matches' }
        }
      },
      {
        id: 'add_to_list',
        name: 'Add to List',
        description: 'Add contacts to a HubSpot list',
        inputSchema: {
          listId: { type: 'string', required: true, description: 'List ID' },
          contacts: { type: 'array', required: true, description: 'Array of contact IDs' }
        },
        outputSchema: {
          success: { type: 'boolean', description: 'Whether operation was successful' }
        }
      },
      {
        id: 'track_event',
        name: 'Track Event',
        description: 'Track a custom event for a contact',
        inputSchema: {
          eventName: { type: 'string', required: true, description: 'Event name' },
          email: { type: 'string', required: true, description: 'Contact email' },
          properties: { type: 'object', description: 'Event properties' }
        },
        outputSchema: {
          success: { type: 'boolean', description: 'Whether tracking was successful' }
        }
      },
      {
        id: 'get_companies',
        name: 'Get Companies',
        description: 'Retrieve companies from HubSpot',
        inputSchema: {
          options: { type: 'object', description: 'Pagination and filtering options' }
        },
        outputSchema: {
          companies: { type: 'array', description: 'List of companies' }
        }
      },
      {
        id: 'create_ticket',
        name: 'Create Ticket',
        description: 'Create a support ticket in HubSpot',
        inputSchema: {
          subject: { type: 'string', required: true, description: 'Ticket subject' },
          description: { type: 'string', description: 'Ticket description' },
          priority: { type: 'string', description: 'Ticket priority' }
        },
        outputSchema: {
          id: { type: 'string', description: 'Created ticket ID' }
        }
      }
    ];
  }

  private getTriggers(): ConnectorTrigger[] {
    return [
      {
        id: 'contact_created',
        name: 'Contact Created',
        description: 'Triggered when a new contact is created',
        eventType: 'contact.propertyChange',
        outputSchema: {
          contact: { type: 'object', description: 'Created contact information' }
        },
        webhookRequired: true
      },
      {
        id: 'deal_stage_changed',
        name: 'Deal Stage Changed',
        description: 'Triggered when a deal stage is updated',
        eventType: 'deal.propertyChange',
        outputSchema: {
          deal: { type: 'object', description: 'Updated deal information' }
        },
        webhookRequired: true
      },
      {
        id: 'contact_updated',
        name: 'Contact Updated',
        description: 'Triggered when a contact is updated',
        eventType: 'contact.propertyChange',
        outputSchema: {
          contact: { type: 'object', description: 'Updated contact information' }
        },
        webhookRequired: true
      },
      {
        id: 'company_created',
        name: 'Company Created',
        description: 'Triggered when a new company is created',
        eventType: 'company.propertyChange',
        outputSchema: {
          company: { type: 'object', description: 'Created company information' }
        },
        webhookRequired: true
      }
    ];
  }
}