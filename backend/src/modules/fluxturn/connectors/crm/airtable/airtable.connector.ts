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

interface AirtableRecord {
  id?: string;
  fields: Record<string, any>;
  createdTime?: string;
}

interface AirtableTable {
  id: string;
  name: string;
  primaryFieldId: string;
  fields: Array<{
    id: string;
    name: string;
    type: string;
    options?: any;
  }>;
  views: Array<{
    id: string;
    name: string;
    type: string;
  }>;
}

@Injectable()
export class AirtableConnector extends BaseConnector implements ICRMConnector {
  private readonly baseUrl = 'https://api.airtable.com/v0';
  private baseId: string;

  constructor(
    private readonly authUtils: AuthUtils,
    private readonly apiUtils: ApiUtils
  ) {
    super();
  }

  getMetadata(): ConnectorMetadata {
    return {
      name: 'Airtable',
      description: 'Airtable cloud-based database platform with spreadsheet interface and powerful CRM capabilities',
      version: '1.0.0',
      category: ConnectorCategory.CRM,
      type: ConnectorType.AIRTABLE,
      logoUrl: 'https://airtable.com/images/brand/airtable-logo.svg',
      documentationUrl: 'https://airtable.com/developers/web/api/introduction',
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
      this.baseId = this.config.credentials.baseId;
      if (!this.baseId) {
        throw new Error('Base ID is required for Airtable connection');
      }

      // Test the connection by fetching base metadata
      const response = await this.performRequest({
        method: 'GET',
        endpoint: `/meta/bases/${this.baseId}/tables`,
        headers: this.getAuthHeaders()
      });

      if (!response?.tables) {
        throw new Error('Failed to connect to Airtable API');
      }

      this.logger.log('Airtable connector initialized successfully');
    } catch (error) {
      this.logger.error('Failed to initialize Airtable connection:', error);
      throw new Error(`Airtable connection failed: ${error.message}`);
    }
  }

  protected async performConnectionTest(): Promise<boolean> {
    try {
      const response = await this.performRequest({
        method: 'GET',
        endpoint: `/meta/bases/${this.baseId}/tables`,
        headers: this.getAuthHeaders()
      });
      return !!response?.tables;
    } catch (error) {
      this.logger.error('Airtable connection test failed:', error);
      return false;
    }
  }

  protected async performHealthCheck(): Promise<void> {
    try {
      await this.performRequest({
        method: 'GET',
        endpoint: `/meta/bases/${this.baseId}/tables`,
        headers: this.getAuthHeaders()
      });
    } catch (error) {
      throw new Error(`Airtable health check failed: ${error.message}`);
    }
  }

  protected async performRequest(request: ConnectorRequest): Promise<any> {
    try {
      const response = await this.apiUtils.executeRequest({
        ...request,
        endpoint: `${this.baseUrl}${request.endpoint}`,
        headers: {
          ...this.getAuthHeaders(),
          'Content-Type': 'application/json',
          ...request.headers
        }
      });

      if (!response.success) {
        throw new Error(response.error?.message || 'Request failed');
      }

      return response.data;
    } catch (error) {
      this.logger.error('Airtable request failed:', error);
      throw error;
    }
  }

  protected async performAction(actionId: string, input: any): Promise<any> {
    switch (actionId) {
      case 'create_record':
        return this.createRecord(input.tableName, input.fields, input.typecast);
      case 'update_record':
        return this.updateRecordAdvanced(
          input.tableName,
          input.recordId,
          input.fields,
          input.matchingColumns,
          input.typecast,
          input.updateAllMatches
        );
      case 'upsert_record':
        return this.upsertRecord(
          input.tableName,
          input.fields,
          input.fieldsToMergeOn,
          input.typecast,
          input.updateAllMatches
        );
      case 'get_record':
        return this.getRecord(input.tableName, input.recordId);
      case 'search_records':
        return this.searchRecords(input.tableName, input);
      case 'delete_record':
        return this.deleteRecord(input.tableName, input.recordId);
      case 'get_many_bases':
        return this.listBases();
      case 'get_base_schema':
        return this.getBaseSchema(input.baseId);
      default:
        throw new Error(`Unknown action: ${actionId}`);
    }
  }

  protected async cleanup(): Promise<void> {
    this.logger.log('Airtable connector cleanup completed');
  }

  // ICRMConnector implementation
  async createContact(contact: any): Promise<ConnectorResponse> {
    try {
      const tableName = contact.tableName || 'Contacts';
      const airtableRecord: AirtableRecord = {
        fields: {
          'Name': `${contact.firstName || ''} ${contact.lastName || ''}`.trim(),
          'First Name': contact.firstName,
          'Last Name': contact.lastName,
          'Email': contact.email,
          'Phone': contact.phone,
          'Mobile': contact.mobile,
          'Company': contact.company,
          'Job Title': contact.jobTitle,
          'Address': contact.address ? 
            `${contact.address.street || ''}\n${contact.address.city || ''}, ${contact.address.state || ''} ${contact.address.postalCode || ''}\n${contact.address.country || ''}`.trim() 
            : undefined,
          'Notes': contact.description,
          'Source': contact.source,
          ...contact.customFields
        }
      };

      const result = await this.performRequest({
        method: 'POST',
        endpoint: `/${this.baseId}/${encodeURIComponent(tableName)}`,
        body: {
          records: [airtableRecord]
        }
      });

      return {
        success: true,
        data: result.records?.[0],
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
      const tableName = updates.tableName || 'Contacts';
      const airtableUpdates: Partial<AirtableRecord> = {
        id: contactId,
        fields: {
          'Name': updates.firstName || updates.lastName ? 
            `${updates.firstName || ''} ${updates.lastName || ''}`.trim() : undefined,
          'First Name': updates.firstName,
          'Last Name': updates.lastName,
          'Email': updates.email,
          'Phone': updates.phone,
          'Mobile': updates.mobile,
          'Company': updates.company,
          'Job Title': updates.jobTitle,
          'Notes': updates.description,
          ...updates.customFields
        }
      };

      // Remove undefined values
      Object.keys(airtableUpdates.fields!).forEach(key => {
        if (airtableUpdates.fields![key] === undefined) {
          delete airtableUpdates.fields![key];
        }
      });

      const result = await this.performRequest({
        method: 'PATCH',
        endpoint: `/${this.baseId}/${encodeURIComponent(tableName)}`,
        body: {
          records: [airtableUpdates]
        }
      });

      return {
        success: true,
        data: result.records?.[0],
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
      const tableName = 'Contacts'; // Default table name
      const result = await this.performRequest({
        method: 'GET',
        endpoint: `/${this.baseId}/${encodeURIComponent(tableName)}/${contactId}`
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
      const tableName = options?.filters?.tableName || 'Contacts';
      
      // Build filter formula for searching across multiple fields
      const filterFormula = `OR(
        SEARCH("${query}", {Name}),
        SEARCH("${query}", {Email}),
        SEARCH("${query}", {Company})
      )`;

      const queryParams: any = {
        filterByFormula: filterFormula,
        maxRecords: options?.pageSize || 100,
        pageSize: Math.min(options?.pageSize || 100, 100) // Airtable limit
      };

      if (options?.page && options.page > 1) {
        // Airtable uses offset-based pagination
        queryParams.offset = options.filters?.offset;
      }

      const result = await this.performRequest({
        method: 'GET',
        endpoint: `/${this.baseId}/${encodeURIComponent(tableName)}`,
        queryParams
      });

      return {
        success: true,
        data: result.records || [],
        metadata: {
          timestamp: new Date(),
          rateLimit: await this.getRateLimitInfo(),
          pagination: {
            page: options?.page || 1,
            pageSize: options?.pageSize || 100,
            total: 0,
            hasNext: !!result.offset
          }
        }
      };
    } catch (error) {
      return this.handleError(error as any, 'Failed to search contacts');
    }
  }

  async getContacts(options?: PaginatedRequest): Promise<ConnectorResponse> {
    try {
      const tableName = options?.filters?.tableName || 'Contacts';
      const queryParams: any = {
        maxRecords: options?.pageSize || 100,
        pageSize: Math.min(options?.pageSize || 100, 100),
        sort: [{ field: 'Created', direction: 'desc' }]
      };

      if (options?.page && options.page > 1) {
        queryParams.offset = options.filters?.offset;
      }

      if (options?.filters?.view) {
        queryParams.view = options.filters.view;
      }

      const result = await this.performRequest({
        method: 'GET',
        endpoint: `/${this.baseId}/${encodeURIComponent(tableName)}`,
        queryParams
      });

      return {
        success: true,
        data: result.records || [],
        metadata: {
          timestamp: new Date(),
          rateLimit: await this.getRateLimitInfo(),
          pagination: {
            page: options?.page || 1,
            pageSize: options?.pageSize || 100,
            total: 0,
            hasNext: !!result.offset
          }
        }
      };
    } catch (error) {
      return this.handleError(error as any, 'Failed to get contacts');
    }
  }

  async deleteContact(contactId: string): Promise<ConnectorResponse> {
    try {
      const tableName = 'Contacts';
      const result = await this.performRequest({
        method: 'DELETE',
        endpoint: `/${this.baseId}/${encodeURIComponent(tableName)}`,
        queryParams: { 'records[]': contactId }
      });

      return {
        success: true,
        data: result.records?.[0],
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
      const tableName = deal.tableName || 'Deals';
      const airtableRecord: AirtableRecord = {
        fields: {
          'Name': deal.name,
          'Amount': deal.amount,
          'Stage': deal.stage || 'Lead',
          'Close Date': deal.closeDate,
          'Probability': deal.probability,
          'Description': deal.description,
          'Type': deal.type,
          'Source': deal.source,
          'Contact': deal.contactId ? [deal.contactId] : undefined, // Link to contact
          'Company': deal.companyId ? [deal.companyId] : undefined, // Link to company
          ...deal.customFields
        }
      };

      const result = await this.performRequest({
        method: 'POST',
        endpoint: `/${this.baseId}/${encodeURIComponent(tableName)}`,
        body: {
          records: [airtableRecord]
        }
      });

      return {
        success: true,
        data: result.records?.[0],
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
      const tableName = updates.tableName || 'Deals';
      const airtableUpdates: Partial<AirtableRecord> = {
        id: dealId,
        fields: {
          'Name': updates.name,
          'Amount': updates.amount,
          'Stage': updates.stage,
          'Close Date': updates.closeDate,
          'Probability': updates.probability,
          'Description': updates.description,
          'Type': updates.type,
          ...updates.customFields
        }
      };

      // Remove undefined values
      Object.keys(airtableUpdates.fields!).forEach(key => {
        if (airtableUpdates.fields![key] === undefined) {
          delete airtableUpdates.fields![key];
        }
      });

      const result = await this.performRequest({
        method: 'PATCH',
        endpoint: `/${this.baseId}/${encodeURIComponent(tableName)}`,
        body: {
          records: [airtableUpdates]
        }
      });

      return {
        success: true,
        data: result.records?.[0],
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
      const tableName = 'Deals';
      const result = await this.performRequest({
        method: 'GET',
        endpoint: `/${this.baseId}/${encodeURIComponent(tableName)}/${dealId}`
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
      const tableName = options?.filters?.tableName || 'Deals';
      const queryParams: any = {
        maxRecords: options?.pageSize || 100,
        pageSize: Math.min(options?.pageSize || 100, 100),
        sort: [{ field: 'Created', direction: 'desc' }]
      };

      if (options?.page && options.page > 1) {
        queryParams.offset = options.filters?.offset;
      }

      if (options?.filters?.stage) {
        queryParams.filterByFormula = `{Stage} = "${options.filters.stage}"`;
      }

      const result = await this.performRequest({
        method: 'GET',
        endpoint: `/${this.baseId}/${encodeURIComponent(tableName)}`,
        queryParams
      });

      return {
        success: true,
        data: result.records || [],
        metadata: {
          timestamp: new Date(),
          rateLimit: await this.getRateLimitInfo(),
          pagination: {
            page: options?.page || 1,
            pageSize: options?.pageSize || 100,
            total: 0,
            hasNext: !!result.offset
          }
        }
      };
    } catch (error) {
      return this.handleError(error as any, 'Failed to get deals');
    }
  }

  async deleteDeal(dealId: string): Promise<ConnectorResponse> {
    try {
      const tableName = 'Deals';
      const result = await this.performRequest({
        method: 'DELETE',
        endpoint: `/${this.baseId}/${encodeURIComponent(tableName)}`,
        queryParams: { 'records[]': dealId }
      });

      return {
        success: true,
        data: result.records?.[0],
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
      const tableName = company.tableName || 'Companies';
      const airtableRecord: AirtableRecord = {
        fields: {
          'Name': company.name,
          'Website': company.website,
          'Phone': company.phone,
          'Industry': company.industry,
          'Type': company.type,
          'Employees': company.numberOfEmployees,
          'Annual Revenue': company.annualRevenue,
          'Address': company.address ? 
            `${company.address.street || ''}\n${company.address.city || ''}, ${company.address.state || ''} ${company.address.postalCode || ''}\n${company.address.country || ''}`.trim() 
            : undefined,
          'Description': company.description,
          ...company.customFields
        }
      };

      const result = await this.performRequest({
        method: 'POST',
        endpoint: `/${this.baseId}/${encodeURIComponent(tableName)}`,
        body: {
          records: [airtableRecord]
        }
      });

      return {
        success: true,
        data: result.records?.[0],
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
      const tableName = updates.tableName || 'Companies';
      const airtableUpdates: Partial<AirtableRecord> = {
        id: companyId,
        fields: {
          'Name': updates.name,
          'Website': updates.website,
          'Phone': updates.phone,
          'Industry': updates.industry,
          'Type': updates.type,
          'Employees': updates.numberOfEmployees,
          'Annual Revenue': updates.annualRevenue,
          'Description': updates.description,
          ...updates.customFields
        }
      };

      // Remove undefined values
      Object.keys(airtableUpdates.fields!).forEach(key => {
        if (airtableUpdates.fields![key] === undefined) {
          delete airtableUpdates.fields![key];
        }
      });

      const result = await this.performRequest({
        method: 'PATCH',
        endpoint: `/${this.baseId}/${encodeURIComponent(tableName)}`,
        body: {
          records: [airtableUpdates]
        }
      });

      return {
        success: true,
        data: result.records?.[0],
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
      const tableName = 'Companies';
      const result = await this.performRequest({
        method: 'GET',
        endpoint: `/${this.baseId}/${encodeURIComponent(tableName)}/${companyId}`
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
      const tableName = options?.filters?.tableName || 'Companies';
      const queryParams: any = {
        maxRecords: options?.pageSize || 100,
        pageSize: Math.min(options?.pageSize || 100, 100),
        sort: [{ field: 'Created', direction: 'desc' }]
      };

      if (options?.page && options.page > 1) {
        queryParams.offset = options.filters?.offset;
      }

      const result = await this.performRequest({
        method: 'GET',
        endpoint: `/${this.baseId}/${encodeURIComponent(tableName)}`,
        queryParams
      });

      return {
        success: true,
        data: result.records || [],
        metadata: {
          timestamp: new Date(),
          rateLimit: await this.getRateLimitInfo(),
          pagination: {
            page: options?.page || 1,
            pageSize: options?.pageSize || 100,
            total: 0,
            hasNext: !!result.offset
          }
        }
      };
    } catch (error) {
      return this.handleError(error as any, 'Failed to get companies');
    }
  }

  async createActivity(activity: any): Promise<ConnectorResponse> {
    try {
      const tableName = activity.tableName || 'Activities';
      const airtableRecord: AirtableRecord = {
        fields: {
          'Subject': activity.subject,
          'Type': activity.type || 'Task',
          'Due Date': activity.dueDate,
          'Status': activity.status || 'Not Started',
          'Priority': activity.priority || 'Normal',
          'Description': activity.description,
          'Contact': activity.contactId ? [activity.contactId] : undefined,
          'Deal': activity.dealId ? [activity.dealId] : undefined,
          'Company': activity.companyId ? [activity.companyId] : undefined,
          'Completed': activity.completed || false,
          ...activity.customFields
        }
      };

      const result = await this.performRequest({
        method: 'POST',
        endpoint: `/${this.baseId}/${encodeURIComponent(tableName)}`,
        body: {
          records: [airtableRecord]
        }
      });

      return {
        success: true,
        data: result.records?.[0],
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
      const tableName = updates.tableName || 'Activities';
      const airtableUpdates: Partial<AirtableRecord> = {
        id: activityId,
        fields: {
          'Subject': updates.subject,
          'Due Date': updates.dueDate,
          'Status': updates.status,
          'Priority': updates.priority,
          'Description': updates.description,
          'Completed': updates.completed,
          ...updates.customFields
        }
      };

      // Remove undefined values
      Object.keys(airtableUpdates.fields!).forEach(key => {
        if (airtableUpdates.fields![key] === undefined) {
          delete airtableUpdates.fields![key];
        }
      });

      const result = await this.performRequest({
        method: 'PATCH',
        endpoint: `/${this.baseId}/${encodeURIComponent(tableName)}`,
        body: {
          records: [airtableUpdates]
        }
      });

      return {
        success: true,
        data: result.records?.[0],
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
      const tableName = options?.filters?.tableName || 'Activities';
      const queryParams: any = {
        maxRecords: options?.pageSize || 100,
        pageSize: Math.min(options?.pageSize || 100, 100),
        sort: [{ field: 'Due Date', direction: 'asc' }]
      };

      if (options?.page && options.page > 1) {
        queryParams.offset = options.filters?.offset;
      }

      if (options?.filters?.status) {
        queryParams.filterByFormula = `{Status} = "${options.filters.status}"`;
      }

      const result = await this.performRequest({
        method: 'GET',
        endpoint: `/${this.baseId}/${encodeURIComponent(tableName)}`,
        queryParams
      });

      return {
        success: true,
        data: result.records || [],
        metadata: {
          timestamp: new Date(),
          rateLimit: await this.getRateLimitInfo(),
          pagination: {
            page: options?.page || 1,
            pageSize: options?.pageSize || 100,
            total: 0,
            hasNext: !!result.offset
          }
        }
      };
    } catch (error) {
      return this.handleError(error as any, 'Failed to get activities');
    }
  }

  async bulkOperation<T>(operation: BulkOperation<T>): Promise<BulkOperationResult<T>> {
    try {
      const batchSize = Math.min(operation.batchSize || 10, 10); // Airtable limit
      const batches: any[] = [];
      
      for (let i = 0; i < operation.items.length; i += batchSize) {
        batches.push(operation.items.slice(i, i + batchSize));
      }

      const successful: T[] = [];
      const failed: Array<{ item: T; error: any }> = [];

      for (const batch of batches) {
        try {
          let endpoint: string;
          let method: 'POST' | 'PATCH' | 'DELETE' = 'POST';
          
          switch (operation.operation) {
            case 'create':
              endpoint = `/${this.baseId}/Contacts`;
              break;
            case 'update':
              endpoint = `/${this.baseId}/Contacts`;
              method = 'PATCH';
              break;
            case 'delete':
              endpoint = `/${this.baseId}/Contacts`;
              method = 'DELETE';
              break;
          }

          if (method === 'DELETE') {
            // Delete operation uses query parameters
            const recordIds = batch.map((item: any) => item.id);
            await this.performRequest({
              method,
              endpoint,
              queryParams: { 'records[]': recordIds }
            });
            successful.push(...batch);
          } else {
            const result = await this.performRequest({
              method,
              endpoint,
              body: { records: batch }
            });

            if (result.records) {
              successful.push(...batch);
            }
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
      const tableName = this.getTableName(objectType);
      
      const result = await this.performRequest({
        method: 'GET',
        endpoint: `/meta/bases/${this.baseId}/tables`
      });

      const table = result.tables?.find((t: AirtableTable) => 
        t.name.toLowerCase() === tableName.toLowerCase()
      );

      if (!table) {
        throw new Error(`Table ${tableName} not found`);
      }

      return {
        success: true,
        data: table.fields,
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
      const results: any[] = [];
      const tables = objectTypes || ['Contacts', 'Companies', 'Deals'];

      for (const table of tables) {
        try {
          const searchResult = await this.findRecords(table, {
            filterByFormula: `SEARCH("${query}", CONCATENATE({Name}, {Email}, {Description}))`
          });

          if (searchResult.success && searchResult.data) {
            results.push(...searchResult.data.map((item: any) => ({ ...item, table })));
          }
        } catch (error) {
          this.logger.warn(`Failed to search in ${table}:`, error);
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

  // Airtable-specific methods
  async createRecord(tableName: string, fields: any, typecast: boolean = false): Promise<ConnectorResponse> {
    try {
      const body: any = {
        records: [{ fields }]
      };

      if (typecast) {
        body.typecast = true;
      }

      const result = await this.performRequest({
        method: 'POST',
        endpoint: `/${this.baseId}/${encodeURIComponent(tableName)}`,
        body
      });

      return {
        success: true,
        data: result.records?.[0],
        metadata: {
          timestamp: new Date(),
          rateLimit: await this.getRateLimitInfo()
        }
      };
    } catch (error) {
      return this.handleError(error as any, 'Failed to create record');
    }
  }

  async updateRecord(tableName: string, recordId: string, updates: any): Promise<ConnectorResponse> {
    try {
      const result = await this.performRequest({
        method: 'PATCH',
        endpoint: `/${this.baseId}/${encodeURIComponent(tableName)}`,
        body: {
          records: [{ id: recordId, fields: updates }]
        }
      });

      return {
        success: true,
        data: result.records?.[0],
        metadata: {
          timestamp: new Date(),
          rateLimit: await this.getRateLimitInfo()
        }
      };
    } catch (error) {
      return this.handleError(error as any, 'Failed to update record');
    }
  }

  async findRecords(tableName: string, options: any = {}): Promise<ConnectorResponse> {
    try {
      const queryParams: any = {
        maxRecords: options.maxRecords || 100,
        pageSize: Math.min(options.pageSize || 100, 100)
      };

      if (options.filterByFormula) {
        queryParams.filterByFormula = options.filterByFormula;
      }

      if (options.sort) {
        queryParams.sort = Array.isArray(options.sort) ? options.sort : [options.sort];
      }

      if (options.view) {
        queryParams.view = options.view;
      }

      if (options.offset) {
        queryParams.offset = options.offset;
      }

      const result = await this.performRequest({
        method: 'GET',
        endpoint: `/${this.baseId}/${encodeURIComponent(tableName)}`,
        queryParams
      });

      return {
        success: true,
        data: result.records || [],
        metadata: {
          timestamp: new Date(),
          rateLimit: await this.getRateLimitInfo(),
          pagination: {
            page: 1,
            pageSize: 100,
            total: 0,
            hasNext: !!result.offset
          }
        }
      };
    } catch (error) {
      return this.handleError(error as any, 'Failed to find records');
    }
  }

  async deleteRecord(tableName: string, recordId: string): Promise<ConnectorResponse> {
    try {
      const result = await this.performRequest({
        method: 'DELETE',
        endpoint: `/${this.baseId}/${encodeURIComponent(tableName)}`,
        queryParams: { 'records[]': recordId }
      });

      return {
        success: true,
        data: result.records?.[0],
        metadata: {
          timestamp: new Date(),
          rateLimit: await this.getRateLimitInfo()
        }
      };
    } catch (error) {
      return this.handleError(error as any, 'Failed to delete record');
    }
  }

  async getRecord(tableName: string, recordId: string): Promise<ConnectorResponse> {
    try {
      const result = await this.performRequest({
        method: 'GET',
        endpoint: `/${this.baseId}/${encodeURIComponent(tableName)}/${recordId}`
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
      return this.handleError(error as any, 'Failed to get record');
    }
  }

  async listBases(): Promise<ConnectorResponse> {
    try {
      const result = await this.performRequest({
        method: 'GET',
        endpoint: '/meta/bases'
      });

      return {
        success: true,
        data: result.bases || [],
        metadata: {
          timestamp: new Date(),
          rateLimit: await this.getRateLimitInfo()
        }
      };
    } catch (error) {
      return this.handleError(error as any, 'Failed to list bases');
    }
  }

  async getBaseSchema(baseId?: string): Promise<ConnectorResponse> {
    try {
      const targetBaseId = baseId || this.baseId;
      const result = await this.performRequest({
        method: 'GET',
        endpoint: `/meta/bases/${targetBaseId}/tables`
      });

      return {
        success: true,
        data: result.tables || [],
        metadata: {
          timestamp: new Date(),
          rateLimit: await this.getRateLimitInfo()
        }
      };
    } catch (error) {
      return this.handleError(error as any, 'Failed to get base schema');
    }
  }

  // Advanced update with field matching (n8n v2 style)
  async updateRecordAdvanced(
    tableName: string,
    recordId: string | undefined,
    fields: any,
    matchingColumns: string[] = ['id'],
    typecast: boolean = false,
    updateAllMatches: boolean = false
  ): Promise<ConnectorResponse> {
    try {
      const records: any[] = [];

      // If using ID matching
      if (matchingColumns.includes('id')) {
        if (!recordId) {
          throw new Error('Record ID is required when matching on id column');
        }
        records.push({ id: recordId, fields });
      } else {
        // Fetch all records and find matches based on columns
        const allRecords = await this.findRecords(tableName, {
          fields: matchingColumns
        });

        if (!allRecords.success || !allRecords.data) {
          throw new Error('Failed to fetch records for matching');
        }

        const matches = this.findMatchingRecords(
          allRecords.data,
          matchingColumns,
          fields,
          updateAllMatches
        );

        for (const match of matches) {
          // Remove matching columns from fields to update
          const fieldsToUpdate = { ...fields };
          matchingColumns.forEach(col => delete fieldsToUpdate[col]);
          records.push({ id: match.id, fields: fieldsToUpdate });
        }
      }

      if (records.length === 0) {
        return {
          success: false,
          error: {
            code: 'NO_MATCHES',
            message: 'No records found matching the specified criteria'
          }
        };
      }

      const body: any = {
        records,
        typecast
      };

      const result = await this.performRequest({
        method: 'PATCH',
        endpoint: `/${this.baseId}/${encodeURIComponent(tableName)}`,
        body
      });

      return {
        success: true,
        data: result.records || [],
        metadata: {
          timestamp: new Date(),
          rateLimit: await this.getRateLimitInfo()
        }
      };
    } catch (error) {
      return this.handleError(error as any, 'Failed to update record');
    }
  }

  // Upsert operation (n8n v2 style)
  async upsertRecord(
    tableName: string,
    fields: any,
    fieldsToMergeOn: string[],
    typecast: boolean = false,
    updateAllMatches: boolean = false
  ): Promise<ConnectorResponse> {
    try {
      const records: any[] = [{ fields }];
      const body: any = { typecast };

      // If not using ID matching, use performUpsert
      if (!fieldsToMergeOn.includes('id')) {
        body.performUpsert = { fieldsToMergeOn };
      }

      try {
        const result = await this.performRequest({
          method: 'PATCH',
          endpoint: `/${this.baseId}/${encodeURIComponent(tableName)}`,
          body: { ...body, records }
        });

        return {
          success: true,
          data: result.records || [],
          metadata: {
            timestamp: new Date(),
            rateLimit: await this.getRateLimitInfo()
          }
        };
      } catch (error: any) {
        // If update fails with 422 and using ID, try to create instead
        if (error.httpCode === '422' && fieldsToMergeOn.includes('id')) {
          const createBody = {
            records: [{ fields }],
            typecast
          };
          const createResult = await this.performRequest({
            method: 'POST',
            endpoint: `/${this.baseId}/${encodeURIComponent(tableName)}`,
            body: createBody
          });

          return {
            success: true,
            data: createResult.records || [],
            metadata: {
              timestamp: new Date(),
              rateLimit: await this.getRateLimitInfo()
            }
          };
        }

        // Handle "cannot update more than one record" error
        if (error?.description?.includes('Cannot update more than one record')) {
          const conditions = fieldsToMergeOn
            .map((column) => `{${column}} = '${fields[column]}'`)
            .join(',');

          const searchResult = await this.findRecords(tableName, {
            filterByFormula: `AND(${conditions})`,
            fields: fieldsToMergeOn
          });

          if (!searchResult.success || !searchResult.data) {
            throw error;
          }

          const matches = searchResult.data;
          const updateRecords: any[] = [];

          if (updateAllMatches) {
            updateRecords.push(...matches.map((match: any) => ({ id: match.id, fields })));
          } else {
            updateRecords.push({ id: matches[0].id, fields });
          }

          const updateResult = await this.performRequest({
            method: 'PATCH',
            endpoint: `/${this.baseId}/${encodeURIComponent(tableName)}`,
            body: { ...body, records: updateRecords }
          });

          return {
            success: true,
            data: updateResult.records || [],
            metadata: {
              timestamp: new Date(),
              rateLimit: await this.getRateLimitInfo()
            }
          };
        }

        throw error;
      }
    } catch (error) {
      return this.handleError(error as any, 'Failed to upsert record');
    }
  }

  // Enhanced search with all n8n v2 options
  async searchRecords(tableName: string, options: any): Promise<ConnectorResponse> {
    try {
      const queryParams: any = {};

      if (options.filterByFormula) {
        queryParams.filterByFormula = options.filterByFormula;
      }

      if (options.fields && Array.isArray(options.fields)) {
        queryParams.fields = options.fields;
      }

      if (options.sort && Array.isArray(options.sort)) {
        queryParams.sort = options.sort;
      }

      if (options.view) {
        queryParams.view = options.view;
      }

      // Handle pagination
      let allRecords: any[] = [];
      let offset: string | undefined;

      if (options.returnAll !== false) {
        // Fetch all records with pagination
        do {
          if (offset) {
            queryParams.offset = offset;
          }

          const result = await this.performRequest({
            method: 'GET',
            endpoint: `/${this.baseId}/${encodeURIComponent(tableName)}`,
            queryParams
          });

          allRecords = allRecords.concat(result.records || []);
          offset = result.offset;
        } while (offset);

        return {
          success: true,
          data: allRecords,
          metadata: {
            timestamp: new Date(),
            rateLimit: await this.getRateLimitInfo(),
            pagination: {
              page: 1,
              pageSize: allRecords.length,
              total: allRecords.length,
              hasNext: false
            }
          }
        };
      } else {
        // Fetch limited records
        queryParams.maxRecords = options.limit || 100;

        const result = await this.performRequest({
          method: 'GET',
          endpoint: `/${this.baseId}/${encodeURIComponent(tableName)}`,
          queryParams
        });

        return {
          success: true,
          data: result.records || [],
          metadata: {
            timestamp: new Date(),
            rateLimit: await this.getRateLimitInfo(),
            pagination: {
              page: 1,
              pageSize: result.records?.length || 0,
              total: 0,
              hasNext: !!result.offset
            }
          }
        };
      }
    } catch (error) {
      return this.handleError(error as any, 'Failed to search records');
    }
  }

  // Helper method to find matching records
  private findMatchingRecords(
    records: any[],
    matchingColumns: string[],
    fieldsToMatch: any,
    updateAllMatches: boolean
  ): any[] {
    const matches = records.filter(record => {
      return matchingColumns.every(column => {
        const recordValue = record.fields?.[column];
        const matchValue = fieldsToMatch[column];
        return recordValue === matchValue;
      });
    });

    if (updateAllMatches) {
      return matches;
    } else {
      return matches.length > 0 ? [matches[0]] : [];
    }
  }

  async getFields(tableName: string): Promise<ConnectorResponse> {
    try {
      const result = await this.performRequest({
        method: 'GET',
        endpoint: `/meta/bases/${this.baseId}/tables`
      });

      const table = result.tables?.find((t: AirtableTable) => 
        t.name.toLowerCase() === tableName.toLowerCase()
      );

      if (!table) {
        throw new Error(`Table ${tableName} not found`);
      }

      return {
        success: true,
        data: table.fields,
        metadata: {
          timestamp: new Date(),
          rateLimit: await this.getRateLimitInfo()
        }
      };
    } catch (error) {
      return this.handleError(error as any, 'Failed to get fields');
    }
  }

  protected async getRateLimitInfo(): Promise<{ remaining: number; reset: Date } | undefined> {
    // Airtable rate limit info would be extracted from response headers
    // This would need to be implemented based on actual API responses
    return undefined;
  }

  private getAuthHeaders(): Record<string, string> {
    return {
      'Authorization': `Bearer ${this.config.credentials.apiKey}`
    };
  }

  private getTableName(objectType: string): string {
    const tableMap: Record<string, string> = {
      contact: 'Contacts',
      deal: 'Deals',
      company: 'Companies',
      account: 'Companies',
      activity: 'Activities',
      task: 'Activities'
    };
    return tableMap[objectType.toLowerCase()] || objectType;
  }

  private getActions(): ConnectorAction[] {
    return [
      {
        id: 'create_record',
        name: 'Create Record',
        description: 'Create a new record in an Airtable table',
        inputSchema: {
          tableName: { type: 'string', required: true, description: 'Table name' },
          fields: { type: 'object', required: true, description: 'Record fields' },
          typecast: { type: 'boolean', required: false, description: 'Automatically convert field values' }
        },
        outputSchema: {
          id: { type: 'string', description: 'Created record ID' },
          fields: { type: 'object', description: 'Record fields' },
          createdTime: { type: 'string', description: 'Creation timestamp' }
        }
      },
      {
        id: 'update_record',
        name: 'Update Record',
        description: 'Update an existing record with advanced field matching',
        inputSchema: {
          tableName: { type: 'string', required: true, description: 'Table name' },
          recordId: { type: 'string', required: false, description: 'Record ID (optional if using field matching)' },
          fields: { type: 'object', required: true, description: 'Fields to update' },
          matchingColumns: { type: 'array', required: false, description: 'Columns to match on' },
          typecast: { type: 'boolean', required: false, description: 'Automatically convert field values' },
          updateAllMatches: { type: 'boolean', required: false, description: 'Update all matching records' }
        },
        outputSchema: {
          id: { type: 'string', description: 'Updated record ID' },
          fields: { type: 'object', description: 'Updated fields' }
        }
      },
      {
        id: 'upsert_record',
        name: 'Create or Update Record',
        description: 'Create a new record or update if it exists (upsert)',
        inputSchema: {
          tableName: { type: 'string', required: true, description: 'Table name' },
          fields: { type: 'object', required: true, description: 'Record fields' },
          fieldsToMergeOn: { type: 'array', required: true, description: 'Fields to match on for upsert' },
          typecast: { type: 'boolean', required: false, description: 'Automatically convert field values' },
          updateAllMatches: { type: 'boolean', required: false, description: 'Update all matching records' }
        },
        outputSchema: {
          id: { type: 'string', description: 'Record ID' },
          fields: { type: 'object', description: 'Record fields' }
        }
      },
      {
        id: 'get_record',
        name: 'Get Record',
        description: 'Retrieve a single record by ID',
        inputSchema: {
          tableName: { type: 'string', required: true, description: 'Table name' },
          recordId: { type: 'string', required: true, description: 'Record ID' }
        },
        outputSchema: {
          id: { type: 'string', description: 'Record ID' },
          fields: { type: 'object', description: 'Record fields' },
          createdTime: { type: 'string', description: 'Creation timestamp' }
        }
      },
      {
        id: 'search_records',
        name: 'Search Records',
        description: 'Search for records with advanced filtering and sorting',
        inputSchema: {
          tableName: { type: 'string', required: true, description: 'Table name' },
          filterByFormula: { type: 'string', required: false, description: 'Airtable filter formula' },
          returnAll: { type: 'boolean', required: false, description: 'Return all records or limit' },
          limit: { type: 'number', required: false, description: 'Maximum records to return' },
          sort: { type: 'array', required: false, description: 'Sort configuration' },
          view: { type: 'string', required: false, description: 'View name or ID' },
          fields: { type: 'array', required: false, description: 'Fields to include in response' }
        },
        outputSchema: {
          records: { type: 'array', description: 'Array of matching records' },
          offset: { type: 'string', description: 'Pagination offset' }
        }
      },
      {
        id: 'delete_record',
        name: 'Delete Record',
        description: 'Delete a record from Airtable',
        inputSchema: {
          tableName: { type: 'string', required: true, description: 'Table name' },
          recordId: { type: 'string', required: true, description: 'Record ID' }
        },
        outputSchema: {
          deleted: { type: 'boolean', description: 'Whether deletion was successful' },
          id: { type: 'string', description: 'Deleted record ID' }
        }
      },
      {
        id: 'get_many_bases',
        name: 'Get Many Bases',
        description: 'List all accessible Airtable bases',
        inputSchema: {},
        outputSchema: {
          bases: { type: 'array', description: 'List of bases' }
        }
      },
      {
        id: 'get_base_schema',
        name: 'Get Base Schema',
        description: 'Get the schema of all tables in a base',
        inputSchema: {
          baseId: { type: 'string', required: false, description: 'Base ID (optional, uses configured base if not provided)' }
        },
        outputSchema: {
          tables: { type: 'array', description: 'Array of table definitions with complete schema' }
        }
      }
    ];
  }

  private getTriggers(): ConnectorTrigger[] {
    return [
      {
        id: 'record_created',
        name: 'Record Created',
        description: 'Triggered when a new record is created in any table',
        eventType: 'airtable:record_created',
        outputSchema: {
          record: { type: 'object', description: 'Created record information' },
          table: { type: 'string', description: 'Table name' }
        },
        webhookRequired: true
      },
      {
        id: 'record_updated',
        name: 'Record Updated',
        description: 'Triggered when a record is updated',
        eventType: 'airtable:record_updated',
        outputSchema: {
          record: { type: 'object', description: 'Updated record information' },
          table: { type: 'string', description: 'Table name' }
        },
        webhookRequired: true
      },
      {
        id: 'record_deleted',
        name: 'Record Deleted',
        description: 'Triggered when a record is deleted',
        eventType: 'airtable:record_deleted',
        outputSchema: {
          recordId: { type: 'string', description: 'Deleted record ID' },
          table: { type: 'string', description: 'Table name' }
        },
        webhookRequired: true
      }
    ];
  }
}