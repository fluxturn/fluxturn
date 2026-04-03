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
import * as jsforce from 'jsforce';

@Injectable()
export class SalesforceConnector extends BaseConnector implements ICRMConnector {
  private connection: jsforce.Connection;

  constructor(
    private readonly authUtils: AuthUtils,
    private readonly apiUtils: ApiUtils
  ) {
    super();
  }

  getMetadata(): ConnectorMetadata {
    return {
      name: 'Salesforce',
      description: 'Salesforce CRM platform integration with comprehensive sales and marketing automation',
      version: '1.0.0',
      category: ConnectorCategory.CRM,
      type: ConnectorType.SALESFORCE,
      logoUrl: 'https://www.salesforce.com/content/dam/web/en_us/www/images/nav/salesforce-logo.svg',
      documentationUrl: 'https://developer.salesforce.com/docs/api-explorer/sobject',
      authType: AuthType.OAUTH2,
      requiredScopes: [
        'api',
        'refresh_token',
        'full',
        'chatter_api'
      ],
      actions: this.getActions(),
      triggers: this.getTriggers(),
      rateLimit: {
        requestsPerMinute: 100,
        requestsPerHour: 5000,
        requestsPerDay: 100000
      },
      webhookSupport: true
    };
  }

  protected async initializeConnection(): Promise<void> {
    try {
      const instanceUrl = this.config.credentials.instanceUrl || 'https://login.salesforce.com';
      
      this.connection = new jsforce.Connection({
        oauth2: {
          clientId: this.config.credentials.clientId,
          clientSecret: this.config.credentials.clientSecret,
          redirectUri: this.config.credentials.redirectUri
        },
        instanceUrl,
        accessToken: this.config.credentials.accessToken,
        refreshToken: this.config.credentials.refreshToken
      });

      // Test connection
      await this.connection.identity();
      this.logger.log('Salesforce connector initialized successfully');
    } catch (error) {
      this.logger.error('Failed to initialize Salesforce connection:', error);
      throw new Error(`Salesforce connection failed: ${error.message}`);
    }
  }

  protected async performConnectionTest(): Promise<boolean> {
    try {
      const result = await this.connection.identity();
      return !!result;
    } catch (error) {
      this.logger.error('Salesforce connection test failed:', error);
      return false;
    }
  }

  protected async performHealthCheck(): Promise<void> {
    try {
      await this.connection.limits();
    } catch (error) {
      throw new Error(`Salesforce health check failed: ${error.message}`);
    }
  }

  protected async performRequest(request: ConnectorRequest): Promise<any> {
    try {
      const headers = {
        'Authorization': `Bearer ${this.connection.accessToken}`,
        'Content-Type': 'application/json',
        ...request.headers
      };

      const response = await this.apiUtils.executeRequest({
        ...request,
        headers,
        endpoint: `${this.connection.instanceUrl}${request.endpoint}`
      });

      if (!response.success) {
        throw new Error(response.error?.message || 'Request failed');
      }

      return response.data;
    } catch (error) {
      this.logger.error('Salesforce request failed:', error);
      throw error;
    }
  }

  protected async performAction(actionId: string, input: any): Promise<any> {
    switch (actionId) {
      // Account actions
      case 'create_account':
        return this.createCompany(input);
      case 'update_account':
        return this.updateCompany(input.accountId, input);
      case 'get_account':
        return this.getCompany(input.accountId);
      case 'get_all_accounts':
        return this.getCompanies({ pageSize: input.limit, filters: input.conditions });

      // Contact actions
      case 'create_contact':
        return this.createContact(input);
      case 'update_contact':
        return this.updateContact(input.contactId, input);
      case 'get_contact':
        return this.getContact(input.contactId);
      case 'get_all_contacts':
        return this.getContacts({ pageSize: input.limit, filters: input.conditions });
      case 'delete_contact':
        return this.deleteContact(input.contactId);

      // Lead actions
      case 'create_lead':
        return this.createLead(input);
      case 'update_lead':
        return this.updateLead(input.leadId, input);
      case 'get_lead':
        return this.getLead(input.leadId || input.id);
      case 'get_all_leads':
        return this.getLeads({ pageSize: input.limit, filters: input.conditions });
      case 'delete_lead':
        return this.deleteLead(input.leadId);

      // Opportunity actions
      case 'create_opportunity':
        return this.createDeal(input);
      case 'update_opportunity':
        return this.updateDeal(input.opportunityId || input.id, input.data || input);
      case 'get_opportunity':
        return this.getDeal(input.opportunityId);
      case 'get_all_opportunities':
        return this.getDeals({ pageSize: input.limit, filters: input.conditions });
      case 'delete_opportunity':
        return this.deleteDeal(input.opportunityId);

      // Case actions
      case 'create_case':
        return this.createCase(input);
      case 'update_case':
        return this.updateCase(input.caseId, input);
      case 'get_case':
        return this.getCase(input.caseId);
      case 'get_all_cases':
        return this.getCases({ pageSize: input.limit, filters: input.conditions });

      // Task actions
      case 'create_task':
        return this.createActivity(input);
      case 'update_task':
        return this.updateActivity(input.taskId, input);
      case 'get_task':
        return this.getTask(input.taskId);
      case 'get_all_tasks':
        return this.getActivities({ pageSize: input.limit, filters: input.conditions });
      case 'delete_task':
        return this.deleteTask(input.taskId);

      // Search actions
      case 'search_records':
        return this.globalSearch(input.searchTerm || input.query, input.objectTypes);
      case 'execute_soql':
        return this.executeSOQL(input.query);

      // Custom object actions
      case 'create_custom_object':
        return this.createCustomObject(input.objectName, input.fields);
      case 'update_custom_object':
        return this.updateCustomObject(input.objectName, input.recordId, input.fields);
      case 'get_custom_object':
        return this.getCustomObject(input.objectName, input.recordId);

      default:
        throw new Error(`Unknown action: ${actionId}`);
    }
  }

  protected async cleanup(): Promise<void> {
    if (this.connection) {
      await this.connection.logout();
    }
    this.logger.log('Salesforce connector cleanup completed');
  }

  // ICRMConnector implementation
  async createContact(contact: any): Promise<ConnectorResponse> {
    try {
      const result = await this.connection.sobject('Contact').create({
        FirstName: contact.firstName,
        LastName: contact.lastName,
        Email: contact.email,
        Phone: contact.phone,
        AccountId: contact.accountId,
        Title: contact.title,
        Department: contact.department,
        MobilePhone: contact.mobile,
        MailingStreet: contact.address?.street,
        MailingCity: contact.address?.city,
        MailingState: contact.address?.state,
        MailingPostalCode: contact.address?.postalCode,
        MailingCountry: contact.address?.country,
        ...contact.customFields
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
      const result = await this.connection.sobject('Contact').update({
        Id: contactId,
        FirstName: updates.firstName,
        LastName: updates.lastName,
        Email: updates.email,
        Phone: updates.phone,
        Title: updates.title,
        Department: updates.department,
        MobilePhone: updates.mobile,
        ...updates.customFields
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
      const result = await this.connection.sobject('Contact').retrieve(contactId);

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
      const soqlQuery = `SELECT Id, FirstName, LastName, Email, Phone, Title, Account.Name 
                        FROM Contact 
                        WHERE Name LIKE '%${query}%' OR Email LIKE '%${query}%'
                        LIMIT ${options?.pageSize || 100}
                        OFFSET ${((options?.page || 1) - 1) * (options?.pageSize || 100)}`;

      const result = await this.connection.query(soqlQuery);

      return {
        success: true,
        data: result.records,
        metadata: {
          timestamp: new Date(),
          rateLimit: await this.getRateLimitInfo(),
          pagination: {
            page: options?.page || 1,
            pageSize: options?.pageSize || 100,
            total: 0,
            hasNext: !result.done
          }
        }
      };
    } catch (error) {
      return this.handleError(error as any, 'Failed to search contacts');
    }
  }

  async getContacts(options?: PaginatedRequest): Promise<ConnectorResponse> {
    try {
      const soqlQuery = `SELECT Id, FirstName, LastName, Email, Phone, Title, Account.Name 
                        FROM Contact 
                        ORDER BY LastModifiedDate DESC
                        LIMIT ${options?.pageSize || 100}
                        OFFSET ${((options?.page || 1) - 1) * (options?.pageSize || 100)}`;

      const result = await this.connection.query(soqlQuery);

      return {
        success: true,
        data: result.records,
        metadata: {
          timestamp: new Date(),
          rateLimit: await this.getRateLimitInfo(),
          pagination: {
            page: options?.page || 1,
            pageSize: options?.pageSize || 100,
            total: 0,
            hasNext: !result.done
          }
        }
      };
    } catch (error) {
      return this.handleError(error as any, 'Failed to get contacts');
    }
  }

  async deleteContact(contactId: string): Promise<ConnectorResponse> {
    try {
      const result = await this.connection.sobject('Contact').destroy(contactId);

      return {
        success: true,
        data: result,
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
      const result = await this.connection.sobject('Opportunity').create({
        Name: deal.name,
        Amount: deal.amount,
        StageName: deal.stage || 'Prospecting',
        CloseDate: deal.closeDate || new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        AccountId: deal.accountId,
        ContactId: deal.contactId,
        Probability: deal.probability,
        Description: deal.description,
        Type: deal.type,
        LeadSource: deal.leadSource,
        ...deal.customFields
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
      const result = await this.connection.sobject('Opportunity').update({
        Id: dealId,
        Name: updates.name,
        Amount: updates.amount,
        StageName: updates.stage,
        CloseDate: updates.closeDate,
        Probability: updates.probability,
        Description: updates.description,
        ...updates.customFields
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
      const result = await this.connection.sobject('Opportunity').retrieve(dealId);

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
      const soqlQuery = `SELECT Id, Name, Amount, StageName, CloseDate, Account.Name, Probability 
                        FROM Opportunity 
                        ORDER BY LastModifiedDate DESC
                        LIMIT ${options?.pageSize || 100}
                        OFFSET ${((options?.page || 1) - 1) * (options?.pageSize || 100)}`;

      const result = await this.connection.query(soqlQuery);

      return {
        success: true,
        data: result.records,
        metadata: {
          timestamp: new Date(),
          rateLimit: await this.getRateLimitInfo(),
          pagination: {
            page: options?.page || 1,
            pageSize: options?.pageSize || 100,
            total: 0,
            hasNext: !result.done
          }
        }
      };
    } catch (error) {
      return this.handleError(error as any, 'Failed to get deals');
    }
  }

  async deleteDeal(dealId: string): Promise<ConnectorResponse> {
    try {
      const result = await this.connection.sobject('Opportunity').destroy(dealId);

      return {
        success: true,
        data: result,
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
      const result = await this.connection.sobject('Account').create({
        Name: company.name,
        Website: company.website,
        Phone: company.phone,
        Industry: company.industry,
        Type: company.type,
        NumberOfEmployees: company.numberOfEmployees,
        AnnualRevenue: company.annualRevenue,
        BillingStreet: company.address?.street,
        BillingCity: company.address?.city,
        BillingState: company.address?.state,
        BillingPostalCode: company.address?.postalCode,
        BillingCountry: company.address?.country,
        Description: company.description,
        ...company.customFields
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
      const result = await this.connection.sobject('Account').update({
        Id: companyId,
        Name: updates.name,
        Website: updates.website,
        Phone: updates.phone,
        Industry: updates.industry,
        Type: updates.type,
        NumberOfEmployees: updates.numberOfEmployees,
        AnnualRevenue: updates.annualRevenue,
        Description: updates.description,
        ...updates.customFields
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
      const result = await this.connection.sobject('Account').retrieve(companyId);

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
      const soqlQuery = `SELECT Id, Name, Website, Phone, Industry, Type, NumberOfEmployees 
                        FROM Account 
                        ORDER BY LastModifiedDate DESC
                        LIMIT ${options?.pageSize || 100}
                        OFFSET ${((options?.page || 1) - 1) * (options?.pageSize || 100)}`;

      const result = await this.connection.query(soqlQuery);

      return {
        success: true,
        data: result.records,
        metadata: {
          timestamp: new Date(),
          rateLimit: await this.getRateLimitInfo(),
          pagination: {
            page: options?.page || 1,
            pageSize: options?.pageSize || 100,
            total: 0,
            hasNext: !result.done
          }
        }
      };
    } catch (error) {
      return this.handleError(error as any, 'Failed to get companies');
    }
  }

  async createActivity(activity: any): Promise<ConnectorResponse> {
    try {
      const result = await this.connection.sobject('Task').create({
        Subject: activity.subject,
        Description: activity.description,
        ActivityDate: activity.dueDate,
        Priority: activity.priority || 'Normal',
        Status: activity.status || 'Not Started',
        WhoId: activity.contactId,
        WhatId: activity.relatedToId,
        Type: activity.type,
        CallType: activity.callType,
        CallDurationInSeconds: activity.callDuration,
        ...activity.customFields
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
      const result = await this.connection.sobject('Task').update({
        Id: activityId,
        Subject: updates.subject,
        Description: updates.description,
        ActivityDate: updates.dueDate,
        Priority: updates.priority,
        Status: updates.status,
        ...updates.customFields
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
      const soqlQuery = `SELECT Id, Subject, Description, ActivityDate, Priority, Status, Who.Name, What.Name
                        FROM Task
                        ORDER BY ActivityDate DESC
                        LIMIT ${options?.pageSize || 100}
                        OFFSET ${((options?.page || 1) - 1) * (options?.pageSize || 100)}`;

      const result = await this.connection.query(soqlQuery);

      return {
        success: true,
        data: result.records,
        metadata: {
          timestamp: new Date(),
          rateLimit: await this.getRateLimitInfo(),
          pagination: {
            page: options?.page || 1,
            pageSize: options?.pageSize || 100,
            total: 0,
            hasNext: !result.done
          }
        }
      };
    } catch (error) {
      return this.handleError(error as any, 'Failed to get activities');
    }
  }

  async getTask(taskId: string): Promise<ConnectorResponse> {
    try {
      const result = await this.connection.sobject('Task').retrieve(taskId);

      return {
        success: true,
        data: result,
        metadata: {
          timestamp: new Date(),
          rateLimit: await this.getRateLimitInfo()
        }
      };
    } catch (error) {
      return this.handleError(error as any, 'Failed to get task');
    }
  }

  async deleteTask(taskId: string): Promise<ConnectorResponse> {
    try {
      const result = await this.connection.sobject('Task').destroy(taskId);

      return {
        success: true,
        data: result,
        metadata: {
          timestamp: new Date(),
          rateLimit: await this.getRateLimitInfo()
        }
      };
    } catch (error) {
      return this.handleError(error as any, 'Failed to delete task');
    }
  }

  // Lead CRUD operations
  async createLead(lead: any): Promise<ConnectorResponse> {
    try {
      const result = await this.connection.sobject('Lead').create({
        FirstName: lead.firstName,
        LastName: lead.lastName,
        Company: lead.company,
        Email: lead.email,
        Phone: lead.phone,
        Status: lead.status || 'Open',
        LeadSource: lead.leadSource,
        Title: lead.title,
        Industry: lead.industry,
        Website: lead.website,
        Description: lead.description,
        ...lead.customFields
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
      return this.handleError(error as any, 'Failed to create lead');
    }
  }

  async updateLead(leadId: string, updates: any): Promise<ConnectorResponse> {
    try {
      const result = await this.connection.sobject('Lead').update({
        Id: leadId,
        FirstName: updates.firstName,
        LastName: updates.lastName,
        Company: updates.company,
        Email: updates.email,
        Phone: updates.phone,
        Status: updates.status,
        LeadSource: updates.leadSource,
        Title: updates.title,
        ...updates.customFields
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
      return this.handleError(error as any, 'Failed to update lead');
    }
  }

  async getLeads(options?: PaginatedRequest): Promise<ConnectorResponse> {
    try {
      const soqlQuery = `SELECT Id, FirstName, LastName, Company, Email, Phone, Status, LeadSource
                        FROM Lead
                        ORDER BY LastModifiedDate DESC
                        LIMIT ${options?.pageSize || 100}
                        OFFSET ${((options?.page || 1) - 1) * (options?.pageSize || 100)}`;

      const result = await this.connection.query(soqlQuery);

      return {
        success: true,
        data: result.records,
        metadata: {
          timestamp: new Date(),
          rateLimit: await this.getRateLimitInfo(),
          pagination: {
            page: options?.page || 1,
            pageSize: options?.pageSize || 100,
            total: 0,
            hasNext: !result.done
          }
        }
      };
    } catch (error) {
      return this.handleError(error as any, 'Failed to get leads');
    }
  }

  async deleteLead(leadId: string): Promise<ConnectorResponse> {
    try {
      const result = await this.connection.sobject('Lead').destroy(leadId);

      return {
        success: true,
        data: result,
        metadata: {
          timestamp: new Date(),
          rateLimit: await this.getRateLimitInfo()
        }
      };
    } catch (error) {
      return this.handleError(error as any, 'Failed to delete lead');
    }
  }

  // Case CRUD operations
  async createCase(caseData: any): Promise<ConnectorResponse> {
    try {
      const result = await this.connection.sobject('Case').create({
        Subject: caseData.subject,
        Description: caseData.description,
        Status: caseData.status || 'New',
        Priority: caseData.priority || 'Medium',
        Origin: caseData.origin,
        AccountId: caseData.accountId,
        ContactId: caseData.contactId,
        Type: caseData.type,
        Reason: caseData.reason,
        ...caseData.customFields
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
      return this.handleError(error as any, 'Failed to create case');
    }
  }

  async updateCase(caseId: string, updates: any): Promise<ConnectorResponse> {
    try {
      const result = await this.connection.sobject('Case').update({
        Id: caseId,
        Subject: updates.subject,
        Description: updates.description,
        Status: updates.status,
        Priority: updates.priority,
        Origin: updates.origin,
        Type: updates.type,
        Reason: updates.reason,
        ...updates.customFields
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
      return this.handleError(error as any, 'Failed to update case');
    }
  }

  async getCase(caseId: string): Promise<ConnectorResponse> {
    try {
      const result = await this.connection.sobject('Case').retrieve(caseId);

      return {
        success: true,
        data: result,
        metadata: {
          timestamp: new Date(),
          rateLimit: await this.getRateLimitInfo()
        }
      };
    } catch (error) {
      return this.handleError(error as any, 'Failed to get case');
    }
  }

  async getCases(options?: PaginatedRequest): Promise<ConnectorResponse> {
    try {
      const soqlQuery = `SELECT Id, CaseNumber, Subject, Description, Status, Priority, Origin, Account.Name, Contact.Name
                        FROM Case
                        ORDER BY LastModifiedDate DESC
                        LIMIT ${options?.pageSize || 100}
                        OFFSET ${((options?.page || 1) - 1) * (options?.pageSize || 100)}`;

      const result = await this.connection.query(soqlQuery);

      return {
        success: true,
        data: result.records,
        metadata: {
          timestamp: new Date(),
          rateLimit: await this.getRateLimitInfo(),
          pagination: {
            page: options?.page || 1,
            pageSize: options?.pageSize || 100,
            total: 0,
            hasNext: !result.done
          }
        }
      };
    } catch (error) {
      return this.handleError(error as any, 'Failed to get cases');
    }
  }

  // Custom Object operations
  async createCustomObject(objectName: string, fields: any): Promise<ConnectorResponse> {
    try {
      const result = await this.connection.sobject(objectName).create(fields);

      return {
        success: true,
        data: result,
        metadata: {
          timestamp: new Date(),
          rateLimit: await this.getRateLimitInfo()
        }
      };
    } catch (error) {
      return this.handleError(error as any, `Failed to create ${objectName} record`);
    }
  }

  async updateCustomObject(objectName: string, recordId: string, fields: any): Promise<ConnectorResponse> {
    try {
      const result = await this.connection.sobject(objectName).update({
        Id: recordId,
        ...fields
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
      return this.handleError(error as any, `Failed to update ${objectName} record`);
    }
  }

  async getCustomObject(objectName: string, recordId: string): Promise<ConnectorResponse> {
    try {
      const result = await this.connection.sobject(objectName).retrieve(recordId);

      return {
        success: true,
        data: result,
        metadata: {
          timestamp: new Date(),
          rateLimit: await this.getRateLimitInfo()
        }
      };
    } catch (error) {
      return this.handleError(error as any, `Failed to get ${objectName} record`);
    }
  }

  async bulkOperation<T>(operation: BulkOperation<T>): Promise<BulkOperationResult<T>> {
    try {
      const batchSize = operation.batchSize || 200;
      const batches: any[] = [];
      
      for (let i = 0; i < operation.items.length; i += batchSize) {
        batches.push(operation.items.slice(i, i + batchSize));
      }

      const successful: T[] = [];
      const failed: Array<{ item: T; error: any }> = [];

      for (const batch of batches) {
        try {
          let result;
          switch (operation.operation) {
            case 'create':
              result = await this.connection.sobject('Contact').create(batch);
              break;
            case 'update':
              result = await this.connection.sobject('Contact').update(batch);
              break;
            case 'delete':
              result = await this.connection.sobject('Contact').destroy(batch.map((item: any) => item.Id));
              break;
          }

          if (Array.isArray(result)) {
            result.forEach((res: any, index: number) => {
              if (res.success) {
                successful.push(batch[index]);
              } else {
                failed.push({
                  item: batch[index],
                  error: { code: 'BULK_OPERATION_FAILED', message: res.errors?.[0]?.message }
                });
              }
            });
          } else {
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
      const describe = await this.connection.sobject(objectType).describe();
      const customFields = describe.fields.filter(field => field.custom);

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
      const searchQuery = `FIND {${query}} IN ALL FIELDS RETURNING ${objectTypes?.join(', ') || 'Contact, Account, Opportunity, Lead'}`;
      const result = await this.connection.search(searchQuery);

      return {
        success: true,
        data: result.searchRecords,
        metadata: {
          timestamp: new Date(),
          rateLimit: await this.getRateLimitInfo()
        }
      };
    } catch (error) {
      return this.handleError(error as any, 'Failed to perform global search');
    }
  }

  // Salesforce-specific methods
  async executeSOQL(query: string): Promise<ConnectorResponse> {
    try {
      const result = await this.connection.query(query);

      return {
        success: true,
        data: result.records,
        metadata: {
          timestamp: new Date(),
          rateLimit: await this.getRateLimitInfo(),
          pagination: {
            page: 1,
            pageSize: 100,
            total: 0,
            hasNext: !result.done
          }
        }
      };
    } catch (error) {
      return this.handleError(error as any, 'Failed to execute SOQL query');
    }
  }

  async getLead(leadId: string): Promise<ConnectorResponse> {
    try {
      const result = await this.connection.sobject('Lead').retrieve(leadId);

      return {
        success: true,
        data: result,
        metadata: {
          timestamp: new Date(),
          rateLimit: await this.getRateLimitInfo()
        }
      };
    } catch (error) {
      return this.handleError(error as any, 'Failed to get lead');
    }
  }

  async refreshTokens(): Promise<OAuthTokens> {
    try {
      const refreshToken = this.config.credentials.refreshToken;
      if (!refreshToken) {
        throw new Error('No refresh token available');
      }

      const result = await this.connection.oauth2.refreshToken(refreshToken);
      
      return {
        accessToken: result.access_token,
        refreshToken: result.refresh_token || refreshToken,
        expiresAt: (result as any).expires_in ? new Date(Date.now() + ((result as any).expires_in * 1000)) : undefined,
        tokenType: result.token_type
      };
    } catch (error) {
      this.logger.error('Token refresh failed:', error);
      throw error;
    }
  }

  protected async getRateLimitInfo(): Promise<{ remaining: number; reset: Date } | undefined> {
    try {
      const limits = await this.connection.limits();
      const dailyApiRequests = limits?.DailyApiRequests;
      
      if (dailyApiRequests) {
        return {
          remaining: dailyApiRequests.Remaining,
          reset: new Date(Date.now() + 24 * 60 * 60 * 1000) // Reset in 24 hours
        };
      }
    } catch (error) {
      this.logger.warn('Failed to get rate limit info:', error);
    }
    
    return undefined;
  }

  private getActions(): ConnectorAction[] {
    return [
      // Account actions
      {
        id: 'create_account',
        name: 'Create Account',
        description: 'Create a new account/company in Salesforce',
        inputSchema: {
          name: { type: 'string', required: true, description: 'Account name' },
          website: { type: 'string', description: 'Company website' },
          phone: { type: 'string', description: 'Company phone' },
          industry: { type: 'string', description: 'Industry type' }
        },
        outputSchema: {
          id: { type: 'string', description: 'Created account ID' },
          success: { type: 'boolean', description: 'Whether creation was successful' }
        }
      },
      {
        id: 'update_account',
        name: 'Update Account',
        description: 'Update an existing account in Salesforce',
        inputSchema: {
          accountId: { type: 'string', required: true, description: 'Account ID' },
          name: { type: 'string', description: 'Account name' },
          website: { type: 'string', description: 'Website URL' },
          phone: { type: 'string', description: 'Phone number' }
        },
        outputSchema: {
          success: { type: 'boolean', description: 'Whether update was successful' }
        }
      },
      {
        id: 'get_account',
        name: 'Get Account',
        description: 'Retrieve an account by ID',
        inputSchema: {
          accountId: { type: 'string', required: true, description: 'Account ID' }
        },
        outputSchema: {
          account: { type: 'object', description: 'Account information' }
        }
      },
      {
        id: 'get_all_accounts',
        name: 'Get All Accounts',
        description: 'Retrieve a list of accounts',
        inputSchema: {
          limit: { type: 'number', description: 'Maximum records to return' },
          conditions: { type: 'string', description: 'SOQL WHERE clause conditions' }
        },
        outputSchema: {
          accounts: { type: 'array', description: 'List of accounts' }
        }
      },
      // Contact actions
      {
        id: 'create_contact',
        name: 'Create Contact',
        description: 'Create a new contact in Salesforce',
        inputSchema: {
          firstName: { type: 'string', description: 'Contact first name' },
          lastName: { type: 'string', required: true, description: 'Contact last name' },
          email: { type: 'string', description: 'Contact email address' },
          phone: { type: 'string', description: 'Contact phone number' },
          accountId: { type: 'string', description: 'Associated account ID' }
        },
        outputSchema: {
          id: { type: 'string', description: 'Created contact ID' },
          success: { type: 'boolean', description: 'Whether creation was successful' }
        }
      },
      {
        id: 'update_contact',
        name: 'Update Contact',
        description: 'Update an existing contact',
        inputSchema: {
          contactId: { type: 'string', required: true, description: 'Contact ID' },
          firstName: { type: 'string', description: 'First name' },
          lastName: { type: 'string', description: 'Last name' },
          email: { type: 'string', description: 'Email address' }
        },
        outputSchema: {
          success: { type: 'boolean', description: 'Whether update was successful' }
        }
      },
      {
        id: 'get_contact',
        name: 'Get Contact',
        description: 'Retrieve a contact by ID',
        inputSchema: {
          contactId: { type: 'string', required: true, description: 'Contact ID' }
        },
        outputSchema: {
          contact: { type: 'object', description: 'Contact information' }
        }
      },
      {
        id: 'get_all_contacts',
        name: 'Get All Contacts',
        description: 'Retrieve a list of contacts',
        inputSchema: {
          limit: { type: 'number', description: 'Maximum records to return' },
          conditions: { type: 'string', description: 'SOQL WHERE clause conditions' }
        },
        outputSchema: {
          contacts: { type: 'array', description: 'List of contacts' }
        }
      },
      {
        id: 'delete_contact',
        name: 'Delete Contact',
        description: 'Delete a contact from Salesforce',
        inputSchema: {
          contactId: { type: 'string', required: true, description: 'Contact ID' }
        },
        outputSchema: {
          success: { type: 'boolean', description: 'Whether deletion was successful' }
        }
      },
      // Lead actions
      {
        id: 'create_lead',
        name: 'Create Lead',
        description: 'Create a new lead in Salesforce',
        inputSchema: {
          firstName: { type: 'string', description: 'First name' },
          lastName: { type: 'string', required: true, description: 'Last name' },
          company: { type: 'string', required: true, description: 'Company name' },
          email: { type: 'string', description: 'Email address' },
          phone: { type: 'string', description: 'Phone number' },
          status: { type: 'string', description: 'Lead status' }
        },
        outputSchema: {
          id: { type: 'string', description: 'Created lead ID' },
          success: { type: 'boolean', description: 'Whether creation was successful' }
        }
      },
      {
        id: 'update_lead',
        name: 'Update Lead',
        description: 'Update an existing lead',
        inputSchema: {
          leadId: { type: 'string', required: true, description: 'Lead ID' },
          firstName: { type: 'string', description: 'First name' },
          lastName: { type: 'string', description: 'Last name' },
          status: { type: 'string', description: 'Lead status' }
        },
        outputSchema: {
          success: { type: 'boolean', description: 'Whether update was successful' }
        }
      },
      {
        id: 'get_lead',
        name: 'Get Lead',
        description: 'Retrieve a lead by ID',
        inputSchema: {
          leadId: { type: 'string', required: true, description: 'Lead ID' }
        },
        outputSchema: {
          lead: { type: 'object', description: 'Lead information' }
        }
      },
      {
        id: 'get_all_leads',
        name: 'Get All Leads',
        description: 'Retrieve a list of leads',
        inputSchema: {
          limit: { type: 'number', description: 'Maximum records to return' },
          conditions: { type: 'string', description: 'SOQL WHERE clause conditions' }
        },
        outputSchema: {
          leads: { type: 'array', description: 'List of leads' }
        }
      },
      {
        id: 'delete_lead',
        name: 'Delete Lead',
        description: 'Delete a lead from Salesforce',
        inputSchema: {
          leadId: { type: 'string', required: true, description: 'Lead ID' }
        },
        outputSchema: {
          success: { type: 'boolean', description: 'Whether deletion was successful' }
        }
      },
      // Opportunity actions
      {
        id: 'create_opportunity',
        name: 'Create Opportunity',
        description: 'Create a new opportunity in Salesforce',
        inputSchema: {
          name: { type: 'string', required: true, description: 'Opportunity name' },
          amount: { type: 'number', description: 'Deal amount' },
          stageName: { type: 'string', required: true, description: 'Stage name' },
          closeDate: { type: 'string', required: true, description: 'Close date (YYYY-MM-DD)' },
          accountId: { type: 'string', description: 'Associated account ID' }
        },
        outputSchema: {
          id: { type: 'string', description: 'Created opportunity ID' },
          success: { type: 'boolean', description: 'Whether creation was successful' }
        }
      },
      {
        id: 'update_opportunity',
        name: 'Update Opportunity',
        description: 'Update an existing opportunity',
        inputSchema: {
          opportunityId: { type: 'string', required: true, description: 'Opportunity ID' },
          name: { type: 'string', description: 'Opportunity name' },
          amount: { type: 'number', description: 'Deal amount' },
          stageName: { type: 'string', description: 'Stage name' }
        },
        outputSchema: {
          success: { type: 'boolean', description: 'Whether update was successful' }
        }
      },
      {
        id: 'get_opportunity',
        name: 'Get Opportunity',
        description: 'Retrieve an opportunity by ID',
        inputSchema: {
          opportunityId: { type: 'string', required: true, description: 'Opportunity ID' }
        },
        outputSchema: {
          opportunity: { type: 'object', description: 'Opportunity information' }
        }
      },
      {
        id: 'get_all_opportunities',
        name: 'Get All Opportunities',
        description: 'Retrieve a list of opportunities',
        inputSchema: {
          limit: { type: 'number', description: 'Maximum records to return' },
          conditions: { type: 'string', description: 'SOQL WHERE clause conditions' }
        },
        outputSchema: {
          opportunities: { type: 'array', description: 'List of opportunities' }
        }
      },
      {
        id: 'delete_opportunity',
        name: 'Delete Opportunity',
        description: 'Delete an opportunity from Salesforce',
        inputSchema: {
          opportunityId: { type: 'string', required: true, description: 'Opportunity ID' }
        },
        outputSchema: {
          success: { type: 'boolean', description: 'Whether deletion was successful' }
        }
      },
      // Case actions
      {
        id: 'create_case',
        name: 'Create Case',
        description: 'Create a new case (support ticket) in Salesforce',
        inputSchema: {
          subject: { type: 'string', required: true, description: 'Case subject' },
          description: { type: 'string', description: 'Case description' },
          status: { type: 'string', description: 'Case status' },
          priority: { type: 'string', description: 'Priority level' },
          origin: { type: 'string', description: 'Case origin' }
        },
        outputSchema: {
          id: { type: 'string', description: 'Created case ID' },
          caseNumber: { type: 'string', description: 'Case number' }
        }
      },
      {
        id: 'update_case',
        name: 'Update Case',
        description: 'Update an existing case',
        inputSchema: {
          caseId: { type: 'string', required: true, description: 'Case ID' },
          subject: { type: 'string', description: 'Subject' },
          status: { type: 'string', description: 'Status' },
          priority: { type: 'string', description: 'Priority' }
        },
        outputSchema: {
          success: { type: 'boolean', description: 'Whether update was successful' }
        }
      },
      {
        id: 'get_case',
        name: 'Get Case',
        description: 'Retrieve a case by ID',
        inputSchema: {
          caseId: { type: 'string', required: true, description: 'Case ID' }
        },
        outputSchema: {
          case: { type: 'object', description: 'Case information' }
        }
      },
      {
        id: 'get_all_cases',
        name: 'Get All Cases',
        description: 'Retrieve a list of cases',
        inputSchema: {
          limit: { type: 'number', description: 'Maximum records to return' },
          conditions: { type: 'string', description: 'SOQL WHERE clause conditions' }
        },
        outputSchema: {
          cases: { type: 'array', description: 'List of cases' }
        }
      },
      // Task actions
      {
        id: 'create_task',
        name: 'Create Task',
        description: 'Create a new task/activity in Salesforce',
        inputSchema: {
          subject: { type: 'string', required: true, description: 'Task subject' },
          description: { type: 'string', description: 'Task description' },
          dueDate: { type: 'string', description: 'Due date (ISO format)' },
          priority: { type: 'string', description: 'Priority' },
          status: { type: 'string', description: 'Status' },
          contactId: { type: 'string', description: 'Associated contact ID' }
        },
        outputSchema: {
          id: { type: 'string', description: 'Created task ID' },
          success: { type: 'boolean', description: 'Whether creation was successful' }
        }
      },
      {
        id: 'update_task',
        name: 'Update Task',
        description: 'Update an existing task',
        inputSchema: {
          taskId: { type: 'string', required: true, description: 'Task ID' },
          subject: { type: 'string', description: 'Subject' },
          status: { type: 'string', description: 'Status' },
          priority: { type: 'string', description: 'Priority' }
        },
        outputSchema: {
          success: { type: 'boolean', description: 'Whether update was successful' }
        }
      },
      {
        id: 'get_task',
        name: 'Get Task',
        description: 'Retrieve a task by ID',
        inputSchema: {
          taskId: { type: 'string', required: true, description: 'Task ID' }
        },
        outputSchema: {
          task: { type: 'object', description: 'Task information' }
        }
      },
      {
        id: 'get_all_tasks',
        name: 'Get All Tasks',
        description: 'Retrieve a list of tasks',
        inputSchema: {
          limit: { type: 'number', description: 'Maximum records to return' },
          conditions: { type: 'string', description: 'SOQL WHERE clause conditions' }
        },
        outputSchema: {
          tasks: { type: 'array', description: 'List of tasks' }
        }
      },
      {
        id: 'delete_task',
        name: 'Delete Task',
        description: 'Delete a task from Salesforce',
        inputSchema: {
          taskId: { type: 'string', required: true, description: 'Task ID' }
        },
        outputSchema: {
          success: { type: 'boolean', description: 'Whether deletion was successful' }
        }
      },
      // Search actions
      {
        id: 'search_records',
        name: 'Search Records',
        description: 'Search across multiple objects using SOSL',
        inputSchema: {
          searchTerm: { type: 'string', required: true, description: 'Search term' },
          objectTypes: { type: 'array', description: 'Object types to search' }
        },
        outputSchema: {
          searchRecords: { type: 'array', description: 'Matching records' }
        }
      },
      {
        id: 'execute_soql',
        name: 'Execute SOQL Query',
        description: 'Execute a custom SOQL query',
        inputSchema: {
          query: { type: 'string', required: true, description: 'SOQL query to execute' }
        },
        outputSchema: {
          records: { type: 'array', description: 'Query results' },
          totalSize: { type: 'number', description: 'Total number of records' },
          done: { type: 'boolean', description: 'Whether all records were retrieved' }
        }
      },
      // Custom Object actions
      {
        id: 'create_custom_object',
        name: 'Create Custom Object Record',
        description: 'Create a record in a custom Salesforce object',
        inputSchema: {
          objectName: { type: 'string', required: true, description: 'Object API name' },
          fields: { type: 'object', required: true, description: 'Field values as JSON' }
        },
        outputSchema: {
          id: { type: 'string', description: 'Created record ID' },
          success: { type: 'boolean', description: 'Whether creation was successful' }
        }
      },
      {
        id: 'update_custom_object',
        name: 'Update Custom Object Record',
        description: 'Update a record in a custom Salesforce object',
        inputSchema: {
          objectName: { type: 'string', required: true, description: 'Object API name' },
          recordId: { type: 'string', required: true, description: 'Record ID' },
          fields: { type: 'object', required: true, description: 'Field values as JSON' }
        },
        outputSchema: {
          success: { type: 'boolean', description: 'Whether update was successful' }
        }
      },
      {
        id: 'get_custom_object',
        name: 'Get Custom Object Record',
        description: 'Retrieve a custom object record by ID',
        inputSchema: {
          objectName: { type: 'string', required: true, description: 'Object API name' },
          recordId: { type: 'string', required: true, description: 'Record ID' }
        },
        outputSchema: {
          record: { type: 'object', description: 'Record data' }
        }
      }
    ];
  }

  private getTriggers(): ConnectorTrigger[] {
    return [
      {
        id: 'record_created',
        name: 'Record Created',
        description: 'Triggered when a new record is created in Salesforce',
        eventType: 'record.created',
        outputSchema: {
          recordId: { type: 'string', description: 'Created record ID' },
          objectType: { type: 'string', description: 'Object type' },
          record: { type: 'object', description: 'Complete record data' },
          createdDate: { type: 'string', description: 'Creation timestamp' }
        },
        webhookRequired: true
      },
      {
        id: 'record_updated',
        name: 'Record Updated',
        description: 'Triggered when a record is updated in Salesforce',
        eventType: 'record.updated',
        outputSchema: {
          recordId: { type: 'string', description: 'Updated record ID' },
          objectType: { type: 'string', description: 'Object type' },
          record: { type: 'object', description: 'Updated record data' },
          updatedFields: { type: 'array', description: 'List of changed fields' },
          lastModifiedDate: { type: 'string', description: 'Last modified timestamp' }
        },
        webhookRequired: true
      },
      {
        id: 'record_deleted',
        name: 'Record Deleted',
        description: 'Triggered when a record is deleted from Salesforce',
        eventType: 'record.deleted',
        outputSchema: {
          recordId: { type: 'string', description: 'Deleted record ID' },
          objectType: { type: 'string', description: 'Object type' },
          deletedDate: { type: 'string', description: 'Deletion timestamp' }
        },
        webhookRequired: true
      },
      {
        id: 'opportunity_stage_changed',
        name: 'Opportunity Stage Changed',
        description: 'Triggered when an opportunity stage is changed',
        eventType: 'opportunity.stage_changed',
        outputSchema: {
          opportunityId: { type: 'string', description: 'Opportunity ID' },
          name: { type: 'string', description: 'Opportunity name' },
          previousStage: { type: 'string', description: 'Previous stage name' },
          newStage: { type: 'string', description: 'New stage name' },
          amount: { type: 'number', description: 'Opportunity amount' },
          closeDate: { type: 'string', description: 'Expected close date' }
        },
        webhookRequired: true
      },
      {
        id: 'lead_converted',
        name: 'Lead Converted',
        description: 'Triggered when a lead is converted to account/contact/opportunity',
        eventType: 'lead.converted',
        outputSchema: {
          leadId: { type: 'string', description: 'Converted lead ID' },
          accountId: { type: 'string', description: 'Created account ID' },
          contactId: { type: 'string', description: 'Created contact ID' },
          opportunityId: { type: 'string', description: 'Created opportunity ID' },
          convertedDate: { type: 'string', description: 'Conversion timestamp' }
        },
        webhookRequired: true
      },
      {
        id: 'case_escalated',
        name: 'Case Escalated',
        description: 'Triggered when a case is escalated',
        eventType: 'case.escalated',
        outputSchema: {
          caseId: { type: 'string', description: 'Case ID' },
          caseNumber: { type: 'string', description: 'Case number' },
          subject: { type: 'string', description: 'Case subject' },
          priority: { type: 'string', description: 'Case priority' },
          status: { type: 'string', description: 'Case status' },
          escalatedDate: { type: 'string', description: 'Escalation timestamp' }
        },
        webhookRequired: true
      }
    ];
  }
}