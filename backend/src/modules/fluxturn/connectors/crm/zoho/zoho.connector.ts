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

@Injectable()
export class ZohoCRMConnector extends BaseConnector implements ICRMConnector {
  private baseUrl: string;

  constructor(
    private readonly authUtils: AuthUtils,
    private readonly apiUtils: ApiUtils
  ) {
    super();
  }

  getMetadata(): ConnectorMetadata {
    return {
      name: 'Zoho CRM',
      description: 'Zoho CRM platform with comprehensive customer relationship management and automation tools',
      version: '1.0.0',
      category: ConnectorCategory.CRM,
      type: ConnectorType.ZOHO_CRM,
      logoUrl: 'https://www.zoho.com/sites/default/files/zoho-logo.svg',
      documentationUrl: 'https://www.zoho.com/crm/developer/docs/api/v2/',
      authType: AuthType.OAUTH2,
      requiredScopes: [
        'ZohoCRM.modules.ALL',
        'ZohoCRM.settings.ALL',
        'ZohoCRM.users.ALL'
      ],
      actions: this.getActions(),
      triggers: this.getTriggers(),
      rateLimit: {
        requestsPerMinute: 100,
        requestsPerHour: 5000,
        requestsPerDay: 200000
      },
      webhookSupport: true
    };
  }

  protected async initializeConnection(): Promise<void> {
    try {
      // Determine the correct API domain based on data center
      // Supports: .com (US), .eu (Europe), .in (India), .com.au (Australia), .jp (Japan), .ca (Canada)
      const apiDomain = this.config.credentials.apiDomain || this.config.credentials.api_domain || this.config.credentials.domain || 'zohoapis.com';
      this.baseUrl = `https://www.${apiDomain}/crm/v2`;

      // Test the connection by fetching user info
      const response = await this.performRequest({
        method: 'GET',
        endpoint: '/users',
        headers: this.getAuthHeaders(),
        queryParams: { type: 'CurrentUser' }
      });

      if (!response?.users) {
        throw new Error('Failed to connect to Zoho CRM API');
      }

      this.logger.log(`Zoho CRM connector initialized successfully with domain: ${apiDomain}`);
    } catch (error) {
      this.logger.error('Failed to initialize Zoho CRM connection:', error);
      throw new Error(`Zoho CRM connection failed: ${error.message}`);
    }
  }

  protected async performConnectionTest(): Promise<boolean> {
    try {
      const response = await this.performRequest({
        method: 'GET',
        endpoint: '/users',
        headers: this.getAuthHeaders(),
        queryParams: { type: 'CurrentUser' }
      });
      return !!response?.users;
    } catch (error) {
      this.logger.error('Zoho CRM connection test failed:', error);
      return false;
    }
  }

  protected async performHealthCheck(): Promise<void> {
    try {
      await this.performRequest({
        method: 'GET',
        endpoint: '/users',
        headers: this.getAuthHeaders(),
        queryParams: { type: 'CurrentUser' }
      });
    } catch (error) {
      throw new Error(`Zoho CRM health check failed: ${error.message}`);
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
      this.logger.error('Zoho CRM request failed:', error);
      throw error;
    }
  }

  protected async performAction(actionId: string, input: any): Promise<any> {
    switch (actionId) {
      // Account Actions
      case 'account_create':
        return this.createAccount(input);
      case 'account_update':
        return this.updateAccount(input.accountId, input);
      case 'account_get':
        return this.getAccount(input.accountId);
      case 'account_get_all':
        return this.getAccounts(input);
      case 'account_delete':
        return this.deleteAccount(input.accountId);
      case 'account_upsert':
        return this.upsertAccount(input);

      // Contact Actions
      case 'contact_create':
      case 'create_contact':
        return this.createContact(input);
      case 'contact_update':
        return this.updateContact(input.contactId, input);
      case 'contact_get':
        return this.getContact(input.contactId);
      case 'contact_get_all':
        return this.getContacts(input);
      case 'contact_delete':
        return this.deleteContact(input.contactId);
      case 'contact_upsert':
        return this.upsertContact(input);

      // Deal Actions
      case 'deal_create':
      case 'create_deal':
        return this.createDeal(input);
      case 'deal_update':
        return this.updateDeal(input.dealId, input);
      case 'deal_get':
        return this.getDeal(input.dealId);
      case 'deal_get_all':
        return this.getDeals(input);
      case 'deal_delete':
        return this.deleteDeal(input.dealId);
      case 'deal_upsert':
        return this.upsertDeal(input);

      // Lead Actions
      case 'lead_create':
      case 'create_lead':
        return this.createLead(input);
      case 'lead_update':
        return this.updateLead(input.leadId, input);
      case 'lead_get':
        return this.getLead(input.leadId);
      case 'lead_get_all':
        return this.getLeads(input);
      case 'lead_delete':
        return this.deleteLead(input.leadId);
      case 'lead_upsert':
        return this.upsertLead(input);
      case 'lead_get_fields':
        return this.getLeadFields();

      // Product Actions
      case 'product_create':
        return this.createProduct(input);
      case 'product_update':
        return this.updateProduct(input.productId, input);
      case 'product_get':
        return this.getProduct(input.productId);
      case 'product_get_all':
        return this.getProducts(input);
      case 'product_delete':
        return this.deleteProduct(input.productId);
      case 'product_upsert':
        return this.upsertProduct(input);

      // Invoice Actions
      case 'invoice_create':
        return this.createInvoice(input);
      case 'invoice_update':
        return this.updateInvoice(input.invoiceId, input);
      case 'invoice_get':
        return this.getInvoice(input.invoiceId);
      case 'invoice_get_all':
        return this.getInvoices(input);
      case 'invoice_delete':
        return this.deleteInvoice(input.invoiceId);
      case 'invoice_upsert':
        return this.upsertInvoice(input);

      // Purchase Order Actions
      case 'purchase_order_create':
        return this.createPurchaseOrder(input);
      case 'purchase_order_update':
        return this.updatePurchaseOrder(input.purchaseOrderId, input);
      case 'purchase_order_get':
        return this.getPurchaseOrder(input.purchaseOrderId);
      case 'purchase_order_get_all':
        return this.getPurchaseOrders(input);
      case 'purchase_order_delete':
        return this.deletePurchaseOrder(input.purchaseOrderId);
      case 'purchase_order_upsert':
        return this.upsertPurchaseOrder(input);

      // Quote Actions
      case 'quote_create':
        return this.createQuote(input);
      case 'quote_update':
        return this.updateQuote(input.quoteId, input);
      case 'quote_get':
        return this.getQuote(input.quoteId);
      case 'quote_get_all':
        return this.getQuotes(input);
      case 'quote_delete':
        return this.deleteQuote(input.quoteId);
      case 'quote_upsert':
        return this.upsertQuote(input);

      // Sales Order Actions
      case 'sales_order_create':
        return this.createSalesOrder(input);
      case 'sales_order_update':
        return this.updateSalesOrder(input.salesOrderId, input);
      case 'sales_order_get':
        return this.getSalesOrder(input.salesOrderId);
      case 'sales_order_get_all':
        return this.getSalesOrders(input);
      case 'sales_order_delete':
        return this.deleteSalesOrder(input.salesOrderId);
      case 'sales_order_upsert':
        return this.upsertSalesOrder(input);

      // Vendor Actions
      case 'vendor_create':
        return this.createVendor(input);
      case 'vendor_update':
        return this.updateVendor(input.vendorId, input);
      case 'vendor_get':
        return this.getVendor(input.vendorId);
      case 'vendor_get_all':
        return this.getVendors(input);
      case 'vendor_delete':
        return this.deleteVendor(input.vendorId);
      case 'vendor_upsert':
        return this.upsertVendor(input);

      // Generic Actions
      case 'search_records':
        return this.searchRecords(input.module, input.criteria);
      case 'get_modules':
        return this.getModules();
      case 'update_record':
        return this.updateRecord(input.module, input.id, input.data);

      default:
        throw new Error(`Unknown action: ${actionId}`);
    }
  }

  protected async cleanup(): Promise<void> {
    this.logger.log('Zoho CRM connector cleanup completed');
  }

  // ICRMConnector implementation
  async createContact(contact: any): Promise<ConnectorResponse> {
    try {
      const zohoContact = {
        First_Name: contact.firstName,
        Last_Name: contact.lastName,
        Email: contact.email,
        Phone: contact.phone,
        Mobile: contact.mobile,
        Title: contact.title,
        Department: contact.department,
        Account_Name: contact.company,
        Mailing_Street: contact.address?.street,
        Mailing_City: contact.address?.city,
        Mailing_State: contact.address?.state,
        Mailing_Zip: contact.address?.postalCode,
        Mailing_Country: contact.address?.country,
        Description: contact.description,
        Lead_Source: contact.leadSource,
        Owner: contact.ownerId ? { id: contact.ownerId } : undefined,
        ...contact.customFields
      };

      const result = await this.performRequest({
        method: 'POST',
        endpoint: '/Contacts',
        body: {
          data: [zohoContact]
        }
      });

      return {
        success: true,
        data: result.data?.[0],
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
      const zohoUpdates = {
        id: contactId,
        First_Name: updates.firstName,
        Last_Name: updates.lastName,
        Email: updates.email,
        Phone: updates.phone,
        Mobile: updates.mobile,
        Title: updates.title,
        Department: updates.department,
        Description: updates.description,
        ...updates.customFields
      };

      const result = await this.performRequest({
        method: 'PUT',
        endpoint: '/Contacts',
        body: {
          data: [zohoUpdates]
        }
      });

      return {
        success: true,
        data: result.data?.[0],
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
        endpoint: `/Contacts/${contactId}`
      });

      return {
        success: true,
        data: result.data?.[0],
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
      const criteria = `(First_Name:starts_with:${query}) or (Last_Name:starts_with:${query}) or (Email:starts_with:${query})`;
      
      const queryParams: any = {
        criteria,
        page: options?.page || 1,
        per_page: options?.pageSize || 200
      };

      const result = await this.performRequest({
        method: 'GET',
        endpoint: '/Contacts/search',
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
            pageSize: options?.pageSize || 200,
            total: 0,
            hasNext: result.info?.more_records || false
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
        page: options?.page || 1,
        per_page: options?.pageSize || 200,
        sort_order: 'desc',
        sort_by: 'Modified_Time'
      };

      if (options?.filters) {
        const filters = Object.entries(options.filters)
          .map(([key, value]) => `${key}:equals:${value}`)
          .join(' and ');
        queryParams.criteria = filters;
      }

      const result = await this.performRequest({
        method: 'GET',
        endpoint: '/Contacts',
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
            pageSize: options?.pageSize || 200,
            total: 0,
            hasNext: result.info?.more_records || false
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
        endpoint: `/Contacts/${contactId}`
      });

      return {
        success: true,
        data: result.data?.[0],
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
      const zohoDeal = {
        Deal_Name: deal.name,
        Amount: deal.amount,
        Stage: deal.stage || 'Qualification',
        Closing_Date: deal.closeDate,
        Probability: deal.probability,
        Description: deal.description,
        Type: deal.type,
        Lead_Source: deal.leadSource,
        Contact_Name: deal.contactId ? { id: deal.contactId } : undefined,
        Account_Name: deal.accountId ? { id: deal.accountId } : undefined,
        Owner: deal.ownerId ? { id: deal.ownerId } : undefined,
        ...deal.customFields
      };

      const result = await this.performRequest({
        method: 'POST',
        endpoint: '/Deals',
        body: {
          data: [zohoDeal]
        }
      });

      return {
        success: true,
        data: result.data?.[0],
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
      const zohoUpdates = {
        id: dealId,
        Deal_Name: updates.name,
        Amount: updates.amount,
        Stage: updates.stage,
        Closing_Date: updates.closeDate,
        Probability: updates.probability,
        Description: updates.description,
        Type: updates.type,
        ...updates.customFields
      };

      const result = await this.performRequest({
        method: 'PUT',
        endpoint: '/Deals',
        body: {
          data: [zohoUpdates]
        }
      });

      return {
        success: true,
        data: result.data?.[0],
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
        endpoint: `/Deals/${dealId}`
      });

      return {
        success: true,
        data: result.data?.[0],
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
        page: options?.page || 1,
        per_page: options?.pageSize || 200,
        sort_order: 'desc',
        sort_by: 'Modified_Time'
      };

      if (options?.filters) {
        const filters = Object.entries(options.filters)
          .map(([key, value]) => `${key}:equals:${value}`)
          .join(' and ');
        queryParams.criteria = filters;
      }

      const result = await this.performRequest({
        method: 'GET',
        endpoint: '/Deals',
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
            pageSize: options?.pageSize || 200,
            total: 0,
            hasNext: result.info?.more_records || false
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
        endpoint: `/Deals/${dealId}`
      });

      return {
        success: true,
        data: result.data?.[0],
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
      const zohoAccount = {
        Account_Name: company.name,
        Website: company.website,
        Phone: company.phone,
        Industry: company.industry,
        Account_Type: company.type,
        Employees: company.numberOfEmployees,
        Annual_Revenue: company.annualRevenue,
        Billing_Street: company.address?.street,
        Billing_City: company.address?.city,
        Billing_State: company.address?.state,
        Billing_Code: company.address?.postalCode,
        Billing_Country: company.address?.country,
        Description: company.description,
        Owner: company.ownerId ? { id: company.ownerId } : undefined,
        ...company.customFields
      };

      const result = await this.performRequest({
        method: 'POST',
        endpoint: '/Accounts',
        body: {
          data: [zohoAccount]
        }
      });

      return {
        success: true,
        data: result.data?.[0],
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
      const zohoUpdates = {
        id: companyId,
        Account_Name: updates.name,
        Website: updates.website,
        Phone: updates.phone,
        Industry: updates.industry,
        Account_Type: updates.type,
        Employees: updates.numberOfEmployees,
        Annual_Revenue: updates.annualRevenue,
        Description: updates.description,
        ...updates.customFields
      };

      const result = await this.performRequest({
        method: 'PUT',
        endpoint: '/Accounts',
        body: {
          data: [zohoUpdates]
        }
      });

      return {
        success: true,
        data: result.data?.[0],
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
        endpoint: `/Accounts/${companyId}`
      });

      return {
        success: true,
        data: result.data?.[0],
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
        page: options?.page || 1,
        per_page: options?.pageSize || 200,
        sort_order: 'desc',
        sort_by: 'Modified_Time'
      };

      if (options?.filters) {
        const filters = Object.entries(options.filters)
          .map(([key, value]) => `${key}:equals:${value}`)
          .join(' and ');
        queryParams.criteria = filters;
      }

      const result = await this.performRequest({
        method: 'GET',
        endpoint: '/Accounts',
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
            pageSize: options?.pageSize || 200,
            total: 0,
            hasNext: result.info?.more_records || false
          }
        }
      };
    } catch (error) {
      return this.handleError(error as any, 'Failed to get companies');
    }
  }

  // Account Methods
  async createAccount(account: any): Promise<ConnectorResponse> {
    try {
      const zohoAccount = {
        Account_Name: account.accountName,
        Account_Number: account.accountNumber,
        Phone: account.phone,
        Website: account.website,
        Industry: account.industry,
        Employees: account.employees,
        Annual_Revenue: account.annualRevenue,
        Account_Type: account.accountType,
        Billing_Street: account.billingStreet,
        Billing_City: account.billingCity,
        Billing_State: account.billingState,
        Billing_Code: account.billingCode,
        Billing_Country: account.billingCountry,
        Shipping_Street: account.shippingStreet,
        Shipping_City: account.shippingCity,
        Shipping_State: account.shippingState,
        Shipping_Code: account.shippingCode,
        Shipping_Country: account.shippingCountry,
        Description: account.description,
        Owner: account.ownerId ? { id: account.ownerId } : undefined,
        ...account.customFields
      };

      const result = await this.performRequest({
        method: 'POST',
        endpoint: '/Accounts',
        body: {
          data: [zohoAccount]
        }
      });

      return {
        success: true,
        data: result.data?.[0],
        metadata: {
          timestamp: new Date(),
          rateLimit: await this.getRateLimitInfo()
        }
      };
    } catch (error) {
      return this.handleError(error as any, 'Failed to create account');
    }
  }

  async updateAccount(accountId: string, updates: any): Promise<ConnectorResponse> {
    try {
      const zohoUpdates = {
        id: accountId,
        Account_Name: updates.accountName,
        Account_Number: updates.accountNumber,
        Phone: updates.phone,
        Website: updates.website,
        Industry: updates.industry,
        Employees: updates.employees,
        Annual_Revenue: updates.annualRevenue,
        Account_Type: updates.accountType,
        Description: updates.description,
        ...updates.customFields
      };

      const result = await this.performRequest({
        method: 'PUT',
        endpoint: '/Accounts',
        body: {
          data: [zohoUpdates]
        }
      });

      return {
        success: true,
        data: result.data?.[0],
        metadata: {
          timestamp: new Date(),
          rateLimit: await this.getRateLimitInfo()
        }
      };
    } catch (error) {
      return this.handleError(error as any, 'Failed to update account');
    }
  }

  async getAccount(accountId: string): Promise<ConnectorResponse> {
    try {
      const result = await this.performRequest({
        method: 'GET',
        endpoint: `/Accounts/${accountId}`
      });

      return {
        success: true,
        data: result.data?.[0],
        metadata: {
          timestamp: new Date(),
          rateLimit: await this.getRateLimitInfo()
        }
      };
    } catch (error) {
      return this.handleError(error as any, 'Failed to get account');
    }
  }

  async getAccounts(options?: any): Promise<ConnectorResponse> {
    try {
      const queryParams: any = {
        page: options?.page || 1,
        per_page: options?.limit || 200,
        sort_order: 'desc',
        sort_by: 'Modified_Time'
      };

      if (options?.filters) {
        const filters = Object.entries(options.filters)
          .map(([key, value]) => `${key}:equals:${value}`)
          .join(' and ');
        queryParams.criteria = filters;
      }

      let data: any[] = [];
      if (options?.returnAll) {
        data = await this.getAllRecords('/Accounts', queryParams);
      } else {
        const result = await this.performRequest({
          method: 'GET',
          endpoint: '/Accounts',
          queryParams
        });
        data = result.data || [];
      }

      return {
        success: true,
        data,
        metadata: {
          timestamp: new Date(),
          rateLimit: await this.getRateLimitInfo()
        }
      };
    } catch (error) {
      return this.handleError(error as any, 'Failed to get accounts');
    }
  }

  async deleteAccount(accountId: string): Promise<ConnectorResponse> {
    try {
      const result = await this.performRequest({
        method: 'DELETE',
        endpoint: `/Accounts/${accountId}`
      });

      return {
        success: true,
        data: result.data?.[0],
        metadata: {
          timestamp: new Date(),
          rateLimit: await this.getRateLimitInfo()
        }
      };
    } catch (error) {
      return this.handleError(error as any, 'Failed to delete account');
    }
  }

  async upsertAccount(account: any): Promise<ConnectorResponse> {
    try {
      const zohoAccount = {
        Account_Name: account.accountName,
        ...account
      };

      const result = await this.performRequest({
        method: 'POST',
        endpoint: '/Accounts/upsert',
        body: {
          data: [zohoAccount]
        }
      });

      return {
        success: true,
        data: result.data?.[0],
        metadata: {
          timestamp: new Date(),
          rateLimit: await this.getRateLimitInfo()
        }
      };
    } catch (error) {
      return this.handleError(error as any, 'Failed to upsert account');
    }
  }

  // Contact Methods (update existing ones)
  async upsertContact(contact: any): Promise<ConnectorResponse> {
    try {
      const zohoContact = {
        Last_Name: contact.lastName,
        First_Name: contact.firstName,
        Email: contact.email,
        Phone: contact.phone,
        Mobile: contact.mobile,
        ...contact
      };

      const result = await this.performRequest({
        method: 'POST',
        endpoint: '/Contacts/upsert',
        body: {
          data: [zohoContact]
        }
      });

      return {
        success: true,
        data: result.data?.[0],
        metadata: {
          timestamp: new Date(),
          rateLimit: await this.getRateLimitInfo()
        }
      };
    } catch (error) {
      return this.handleError(error as any, 'Failed to upsert contact');
    }
  }

  // Deal Methods (update existing ones)
  async upsertDeal(deal: any): Promise<ConnectorResponse> {
    try {
      const zohoDeal = {
        Deal_Name: deal.dealName || deal.name,
        Stage: deal.stage,
        Amount: deal.amount,
        Closing_Date: deal.closingDate || deal.closeDate,
        ...deal
      };

      const result = await this.performRequest({
        method: 'POST',
        endpoint: '/Deals/upsert',
        body: {
          data: [zohoDeal]
        }
      });

      return {
        success: true,
        data: result.data?.[0],
        metadata: {
          timestamp: new Date(),
          rateLimit: await this.getRateLimitInfo()
        }
      };
    } catch (error) {
      return this.handleError(error as any, 'Failed to upsert deal');
    }
  }

  // Lead Methods
  async updateLead(leadId: string, updates: any): Promise<ConnectorResponse> {
    try {
      const zohoUpdates = {
        id: leadId,
        First_Name: updates.firstName,
        Last_Name: updates.lastName,
        Email: updates.email,
        Phone: updates.phone,
        Company: updates.company,
        Lead_Status: updates.status,
        Lead_Source: updates.source,
        Industry: updates.industry,
        Description: updates.description,
        ...updates.customFields
      };

      const result = await this.performRequest({
        method: 'PUT',
        endpoint: '/Leads',
        body: {
          data: [zohoUpdates]
        }
      });

      return {
        success: true,
        data: result.data?.[0],
        metadata: {
          timestamp: new Date(),
          rateLimit: await this.getRateLimitInfo()
        }
      };
    } catch (error) {
      return this.handleError(error as any, 'Failed to update lead');
    }
  }

  async getLead(leadId: string): Promise<ConnectorResponse> {
    try {
      const result = await this.performRequest({
        method: 'GET',
        endpoint: `/Leads/${leadId}`
      });

      return {
        success: true,
        data: result.data?.[0],
        metadata: {
          timestamp: new Date(),
          rateLimit: await this.getRateLimitInfo()
        }
      };
    } catch (error) {
      return this.handleError(error as any, 'Failed to get lead');
    }
  }

  async getLeads(options?: any): Promise<ConnectorResponse> {
    try {
      const queryParams: any = {
        page: options?.page || 1,
        per_page: options?.limit || 200,
        sort_order: 'desc',
        sort_by: 'Modified_Time'
      };

      let data: any[] = [];
      if (options?.returnAll) {
        data = await this.getAllRecords('/Leads', queryParams);
      } else {
        const result = await this.performRequest({
          method: 'GET',
          endpoint: '/Leads',
          queryParams
        });
        data = result.data || [];
      }

      return {
        success: true,
        data,
        metadata: {
          timestamp: new Date(),
          rateLimit: await this.getRateLimitInfo()
        }
      };
    } catch (error) {
      return this.handleError(error as any, 'Failed to get leads');
    }
  }

  async deleteLead(leadId: string): Promise<ConnectorResponse> {
    try {
      const result = await this.performRequest({
        method: 'DELETE',
        endpoint: `/Leads/${leadId}`
      });

      return {
        success: true,
        data: result.data?.[0],
        metadata: {
          timestamp: new Date(),
          rateLimit: await this.getRateLimitInfo()
        }
      };
    } catch (error) {
      return this.handleError(error as any, 'Failed to delete lead');
    }
  }

  async upsertLead(lead: any): Promise<ConnectorResponse> {
    try {
      const zohoLead = {
        Last_Name: lead.lastName,
        Company: lead.company,
        First_Name: lead.firstName,
        Email: lead.email,
        Phone: lead.phone,
        Lead_Status: lead.status,
        ...lead
      };

      const result = await this.performRequest({
        method: 'POST',
        endpoint: '/Leads/upsert',
        body: {
          data: [zohoLead]
        }
      });

      return {
        success: true,
        data: result.data?.[0],
        metadata: {
          timestamp: new Date(),
          rateLimit: await this.getRateLimitInfo()
        }
      };
    } catch (error) {
      return this.handleError(error as any, 'Failed to upsert lead');
    }
  }

  async getLeadFields(): Promise<ConnectorResponse> {
    try {
      const result = await this.performRequest({
        method: 'GET',
        endpoint: '/settings/fields',
        queryParams: { module: 'Leads' }
      });

      return {
        success: true,
        data: result.fields || [],
        metadata: {
          timestamp: new Date(),
          rateLimit: await this.getRateLimitInfo()
        }
      };
    } catch (error) {
      return this.handleError(error as any, 'Failed to get lead fields');
    }
  }

  // Product Methods
  async createProduct(product: any): Promise<ConnectorResponse> {
    try {
      const zohoProduct = {
        Product_Name: product.productName,
        Unit_Price: product.unitPrice,
        Product_Category: product.category,
        Product_Active: product.active,
        Manufacturer: product.manufacturer,
        Qty_in_Stock: product.qtyInStock,
        Taxable: product.taxable,
        Commission_Rate: product.commissionRate,
        Description: product.description,
        ...product.customFields
      };

      const result = await this.performRequest({
        method: 'POST',
        endpoint: '/Products',
        body: {
          data: [zohoProduct]
        }
      });

      return {
        success: true,
        data: result.data?.[0],
        metadata: {
          timestamp: new Date(),
          rateLimit: await this.getRateLimitInfo()
        }
      };
    } catch (error) {
      return this.handleError(error as any, 'Failed to create product');
    }
  }

  async updateProduct(productId: string, updates: any): Promise<ConnectorResponse> {
    try {
      const zohoUpdates = {
        id: productId,
        Product_Name: updates.productName,
        Unit_Price: updates.unitPrice,
        Product_Category: updates.category,
        Product_Active: updates.active,
        ...updates.customFields
      };

      const result = await this.performRequest({
        method: 'PUT',
        endpoint: '/Products',
        body: {
          data: [zohoUpdates]
        }
      });

      return {
        success: true,
        data: result.data?.[0],
        metadata: {
          timestamp: new Date(),
          rateLimit: await this.getRateLimitInfo()
        }
      };
    } catch (error) {
      return this.handleError(error as any, 'Failed to update product');
    }
  }

  async getProduct(productId: string): Promise<ConnectorResponse> {
    try {
      const result = await this.performRequest({
        method: 'GET',
        endpoint: `/Products/${productId}`
      });

      return {
        success: true,
        data: result.data?.[0],
        metadata: {
          timestamp: new Date(),
          rateLimit: await this.getRateLimitInfo()
        }
      };
    } catch (error) {
      return this.handleError(error as any, 'Failed to get product');
    }
  }

  async getProducts(options?: any): Promise<ConnectorResponse> {
    try {
      const queryParams: any = {
        page: options?.page || 1,
        per_page: options?.limit || 200
      };

      let data: any[] = [];
      if (options?.returnAll) {
        data = await this.getAllRecords('/Products', queryParams);
      } else {
        const result = await this.performRequest({
          method: 'GET',
          endpoint: '/Products',
          queryParams
        });
        data = result.data || [];
      }

      return {
        success: true,
        data,
        metadata: {
          timestamp: new Date(),
          rateLimit: await this.getRateLimitInfo()
        }
      };
    } catch (error) {
      return this.handleError(error as any, 'Failed to get products');
    }
  }

  async deleteProduct(productId: string): Promise<ConnectorResponse> {
    try {
      const result = await this.performRequest({
        method: 'DELETE',
        endpoint: `/Products/${productId}`
      });

      return {
        success: true,
        data: result.data?.[0],
        metadata: {
          timestamp: new Date(),
          rateLimit: await this.getRateLimitInfo()
        }
      };
    } catch (error) {
      return this.handleError(error as any, 'Failed to delete product');
    }
  }

  async upsertProduct(product: any): Promise<ConnectorResponse> {
    try {
      const zohoProduct = {
        Product_Name: product.productName,
        ...product
      };

      const result = await this.performRequest({
        method: 'POST',
        endpoint: '/Products/upsert',
        body: {
          data: [zohoProduct]
        }
      });

      return {
        success: true,
        data: result.data?.[0],
        metadata: {
          timestamp: new Date(),
          rateLimit: await this.getRateLimitInfo()
        }
      };
    } catch (error) {
      return this.handleError(error as any, 'Failed to upsert product');
    }
  }

  // Invoice Methods
  async createInvoice(invoice: any): Promise<ConnectorResponse> {
    try {
      const zohoInvoice = {
        Subject: invoice.subject,
        Product_Details: invoice.productDetails,
        Account_Name: invoice.accountId ? { id: invoice.accountId } : undefined,
        Invoice_Date: invoice.invoiceDate,
        Due_Date: invoice.dueDate,
        Description: invoice.description,
        ...invoice.customFields
      };

      const result = await this.performRequest({
        method: 'POST',
        endpoint: '/Invoices',
        body: {
          data: [zohoInvoice]
        }
      });

      return {
        success: true,
        data: result.data?.[0],
        metadata: {
          timestamp: new Date(),
          rateLimit: await this.getRateLimitInfo()
        }
      };
    } catch (error) {
      return this.handleError(error as any, 'Failed to create invoice');
    }
  }

  async updateInvoice(invoiceId: string, updates: any): Promise<ConnectorResponse> {
    try {
      const zohoUpdates = {
        id: invoiceId,
        Subject: updates.subject,
        Product_Details: updates.productDetails,
        ...updates.customFields
      };

      const result = await this.performRequest({
        method: 'PUT',
        endpoint: '/Invoices',
        body: {
          data: [zohoUpdates]
        }
      });

      return {
        success: true,
        data: result.data?.[0],
        metadata: {
          timestamp: new Date(),
          rateLimit: await this.getRateLimitInfo()
        }
      };
    } catch (error) {
      return this.handleError(error as any, 'Failed to update invoice');
    }
  }

  async getInvoice(invoiceId: string): Promise<ConnectorResponse> {
    try {
      const result = await this.performRequest({
        method: 'GET',
        endpoint: `/Invoices/${invoiceId}`
      });

      return {
        success: true,
        data: result.data?.[0],
        metadata: {
          timestamp: new Date(),
          rateLimit: await this.getRateLimitInfo()
        }
      };
    } catch (error) {
      return this.handleError(error as any, 'Failed to get invoice');
    }
  }

  async getInvoices(options?: any): Promise<ConnectorResponse> {
    try {
      const queryParams: any = {
        page: options?.page || 1,
        per_page: options?.limit || 200
      };

      let data: any[] = [];
      if (options?.returnAll) {
        data = await this.getAllRecords('/Invoices', queryParams);
      } else {
        const result = await this.performRequest({
          method: 'GET',
          endpoint: '/Invoices',
          queryParams
        });
        data = result.data || [];
      }

      return {
        success: true,
        data,
        metadata: {
          timestamp: new Date(),
          rateLimit: await this.getRateLimitInfo()
        }
      };
    } catch (error) {
      return this.handleError(error as any, 'Failed to get invoices');
    }
  }

  async deleteInvoice(invoiceId: string): Promise<ConnectorResponse> {
    try {
      const result = await this.performRequest({
        method: 'DELETE',
        endpoint: `/Invoices/${invoiceId}`
      });

      return {
        success: true,
        data: result.data?.[0],
        metadata: {
          timestamp: new Date(),
          rateLimit: await this.getRateLimitInfo()
        }
      };
    } catch (error) {
      return this.handleError(error as any, 'Failed to delete invoice');
    }
  }

  async upsertInvoice(invoice: any): Promise<ConnectorResponse> {
    try {
      const zohoInvoice = {
        Subject: invoice.subject,
        Product_Details: invoice.productDetails,
        ...invoice
      };

      const result = await this.performRequest({
        method: 'POST',
        endpoint: '/Invoices/upsert',
        body: {
          data: [zohoInvoice]
        }
      });

      return {
        success: true,
        data: result.data?.[0],
        metadata: {
          timestamp: new Date(),
          rateLimit: await this.getRateLimitInfo()
        }
      };
    } catch (error) {
      return this.handleError(error as any, 'Failed to upsert invoice');
    }
  }

  // Purchase Order Methods
  async createPurchaseOrder(order: any): Promise<ConnectorResponse> {
    try {
      const zohoOrder = {
        Subject: order.subject,
        Vendor_Name: { id: order.vendorId },
        Product_Details: order.productDetails,
        PO_Date: order.poDate,
        Due_Date: order.dueDate,
        Status: order.status,
        ...order.customFields
      };

      const result = await this.performRequest({
        method: 'POST',
        endpoint: '/Purchase_Orders',
        body: {
          data: [zohoOrder]
        }
      });

      return {
        success: true,
        data: result.data?.[0],
        metadata: {
          timestamp: new Date(),
          rateLimit: await this.getRateLimitInfo()
        }
      };
    } catch (error) {
      return this.handleError(error as any, 'Failed to create purchase order');
    }
  }

  async updatePurchaseOrder(orderId: string, updates: any): Promise<ConnectorResponse> {
    try {
      const zohoUpdates = {
        id: orderId,
        Subject: updates.subject,
        Status: updates.status,
        ...updates.customFields
      };

      const result = await this.performRequest({
        method: 'PUT',
        endpoint: '/Purchase_Orders',
        body: {
          data: [zohoUpdates]
        }
      });

      return {
        success: true,
        data: result.data?.[0],
        metadata: {
          timestamp: new Date(),
          rateLimit: await this.getRateLimitInfo()
        }
      };
    } catch (error) {
      return this.handleError(error as any, 'Failed to update purchase order');
    }
  }

  async getPurchaseOrder(orderId: string): Promise<ConnectorResponse> {
    try {
      const result = await this.performRequest({
        method: 'GET',
        endpoint: `/Purchase_Orders/${orderId}`
      });

      return {
        success: true,
        data: result.data?.[0],
        metadata: {
          timestamp: new Date(),
          rateLimit: await this.getRateLimitInfo()
        }
      };
    } catch (error) {
      return this.handleError(error as any, 'Failed to get purchase order');
    }
  }

  async getPurchaseOrders(options?: any): Promise<ConnectorResponse> {
    try {
      const queryParams: any = {
        page: options?.page || 1,
        per_page: options?.limit || 200
      };

      let data: any[] = [];
      if (options?.returnAll) {
        data = await this.getAllRecords('/Purchase_Orders', queryParams);
      } else {
        const result = await this.performRequest({
          method: 'GET',
          endpoint: '/Purchase_Orders',
          queryParams
        });
        data = result.data || [];
      }

      return {
        success: true,
        data,
        metadata: {
          timestamp: new Date(),
          rateLimit: await this.getRateLimitInfo()
        }
      };
    } catch (error) {
      return this.handleError(error as any, 'Failed to get purchase orders');
    }
  }

  async deletePurchaseOrder(orderId: string): Promise<ConnectorResponse> {
    try {
      const result = await this.performRequest({
        method: 'DELETE',
        endpoint: `/Purchase_Orders/${orderId}`
      });

      return {
        success: true,
        data: result.data?.[0],
        metadata: {
          timestamp: new Date(),
          rateLimit: await this.getRateLimitInfo()
        }
      };
    } catch (error) {
      return this.handleError(error as any, 'Failed to delete purchase order');
    }
  }

  async upsertPurchaseOrder(order: any): Promise<ConnectorResponse> {
    try {
      const zohoOrder = {
        Subject: order.subject,
        Vendor_Name: { id: order.vendorId },
        Product_Details: order.productDetails,
        ...order
      };

      const result = await this.performRequest({
        method: 'POST',
        endpoint: '/Purchase_Orders/upsert',
        body: {
          data: [zohoOrder]
        }
      });

      return {
        success: true,
        data: result.data?.[0],
        metadata: {
          timestamp: new Date(),
          rateLimit: await this.getRateLimitInfo()
        }
      };
    } catch (error) {
      return this.handleError(error as any, 'Failed to upsert purchase order');
    }
  }

  // Quote Methods
  async createQuote(quote: any): Promise<ConnectorResponse> {
    try {
      const zohoQuote = {
        Subject: quote.subject,
        Product_Details: quote.productDetails,
        Quote_Stage: quote.stage,
        Valid_Till: quote.validTill,
        ...quote.customFields
      };

      const result = await this.performRequest({
        method: 'POST',
        endpoint: '/Quotes',
        body: {
          data: [zohoQuote]
        }
      });

      return {
        success: true,
        data: result.data?.[0],
        metadata: {
          timestamp: new Date(),
          rateLimit: await this.getRateLimitInfo()
        }
      };
    } catch (error) {
      return this.handleError(error as any, 'Failed to create quote');
    }
  }

  async updateQuote(quoteId: string, updates: any): Promise<ConnectorResponse> {
    try {
      const zohoUpdates = {
        id: quoteId,
        Subject: updates.subject,
        Quote_Stage: updates.stage,
        ...updates.customFields
      };

      const result = await this.performRequest({
        method: 'PUT',
        endpoint: '/Quotes',
        body: {
          data: [zohoUpdates]
        }
      });

      return {
        success: true,
        data: result.data?.[0],
        metadata: {
          timestamp: new Date(),
          rateLimit: await this.getRateLimitInfo()
        }
      };
    } catch (error) {
      return this.handleError(error as any, 'Failed to update quote');
    }
  }

  async getQuote(quoteId: string): Promise<ConnectorResponse> {
    try {
      const result = await this.performRequest({
        method: 'GET',
        endpoint: `/Quotes/${quoteId}`
      });

      return {
        success: true,
        data: result.data?.[0],
        metadata: {
          timestamp: new Date(),
          rateLimit: await this.getRateLimitInfo()
        }
      };
    } catch (error) {
      return this.handleError(error as any, 'Failed to get quote');
    }
  }

  async getQuotes(options?: any): Promise<ConnectorResponse> {
    try {
      const queryParams: any = {
        page: options?.page || 1,
        per_page: options?.limit || 200
      };

      let data: any[] = [];
      if (options?.returnAll) {
        data = await this.getAllRecords('/Quotes', queryParams);
      } else {
        const result = await this.performRequest({
          method: 'GET',
          endpoint: '/Quotes',
          queryParams
        });
        data = result.data || [];
      }

      return {
        success: true,
        data,
        metadata: {
          timestamp: new Date(),
          rateLimit: await this.getRateLimitInfo()
        }
      };
    } catch (error) {
      return this.handleError(error as any, 'Failed to get quotes');
    }
  }

  async deleteQuote(quoteId: string): Promise<ConnectorResponse> {
    try {
      const result = await this.performRequest({
        method: 'DELETE',
        endpoint: `/Quotes/${quoteId}`
      });

      return {
        success: true,
        data: result.data?.[0],
        metadata: {
          timestamp: new Date(),
          rateLimit: await this.getRateLimitInfo()
        }
      };
    } catch (error) {
      return this.handleError(error as any, 'Failed to delete quote');
    }
  }

  async upsertQuote(quote: any): Promise<ConnectorResponse> {
    try {
      const zohoQuote = {
        Subject: quote.subject,
        Product_Details: quote.productDetails,
        ...quote
      };

      const result = await this.performRequest({
        method: 'POST',
        endpoint: '/Quotes/upsert',
        body: {
          data: [zohoQuote]
        }
      });

      return {
        success: true,
        data: result.data?.[0],
        metadata: {
          timestamp: new Date(),
          rateLimit: await this.getRateLimitInfo()
        }
      };
    } catch (error) {
      return this.handleError(error as any, 'Failed to upsert quote');
    }
  }

  // Sales Order Methods
  async createSalesOrder(order: any): Promise<ConnectorResponse> {
    try {
      const zohoOrder = {
        Subject: order.subject,
        Account_Name: { id: order.accountId },
        Product_Details: order.productDetails,
        Status: order.status,
        Due_Date: order.dueDate,
        Contact_Name: order.contactId ? { id: order.contactId } : undefined,
        ...order.customFields
      };

      const result = await this.performRequest({
        method: 'POST',
        endpoint: '/Sales_Orders',
        body: {
          data: [zohoOrder]
        }
      });

      return {
        success: true,
        data: result.data?.[0],
        metadata: {
          timestamp: new Date(),
          rateLimit: await this.getRateLimitInfo()
        }
      };
    } catch (error) {
      return this.handleError(error as any, 'Failed to create sales order');
    }
  }

  async updateSalesOrder(orderId: string, updates: any): Promise<ConnectorResponse> {
    try {
      const zohoUpdates = {
        id: orderId,
        Subject: updates.subject,
        Status: updates.status,
        ...updates.customFields
      };

      const result = await this.performRequest({
        method: 'PUT',
        endpoint: '/Sales_Orders',
        body: {
          data: [zohoUpdates]
        }
      });

      return {
        success: true,
        data: result.data?.[0],
        metadata: {
          timestamp: new Date(),
          rateLimit: await this.getRateLimitInfo()
        }
      };
    } catch (error) {
      return this.handleError(error as any, 'Failed to update sales order');
    }
  }

  async getSalesOrder(orderId: string): Promise<ConnectorResponse> {
    try {
      const result = await this.performRequest({
        method: 'GET',
        endpoint: `/Sales_Orders/${orderId}`
      });

      return {
        success: true,
        data: result.data?.[0],
        metadata: {
          timestamp: new Date(),
          rateLimit: await this.getRateLimitInfo()
        }
      };
    } catch (error) {
      return this.handleError(error as any, 'Failed to get sales order');
    }
  }

  async getSalesOrders(options?: any): Promise<ConnectorResponse> {
    try {
      const queryParams: any = {
        page: options?.page || 1,
        per_page: options?.limit || 200
      };

      let data: any[] = [];
      if (options?.returnAll) {
        data = await this.getAllRecords('/Sales_Orders', queryParams);
      } else {
        const result = await this.performRequest({
          method: 'GET',
          endpoint: '/Sales_Orders',
          queryParams
        });
        data = result.data || [];
      }

      return {
        success: true,
        data,
        metadata: {
          timestamp: new Date(),
          rateLimit: await this.getRateLimitInfo()
        }
      };
    } catch (error) {
      return this.handleError(error as any, 'Failed to get sales orders');
    }
  }

  async deleteSalesOrder(orderId: string): Promise<ConnectorResponse> {
    try {
      const result = await this.performRequest({
        method: 'DELETE',
        endpoint: `/Sales_Orders/${orderId}`
      });

      return {
        success: true,
        data: result.data?.[0],
        metadata: {
          timestamp: new Date(),
          rateLimit: await this.getRateLimitInfo()
        }
      };
    } catch (error) {
      return this.handleError(error as any, 'Failed to delete sales order');
    }
  }

  async upsertSalesOrder(order: any): Promise<ConnectorResponse> {
    try {
      const zohoOrder = {
        Subject: order.subject,
        Account_Name: { id: order.accountId },
        Product_Details: order.productDetails,
        ...order
      };

      const result = await this.performRequest({
        method: 'POST',
        endpoint: '/Sales_Orders/upsert',
        body: {
          data: [zohoOrder]
        }
      });

      return {
        success: true,
        data: result.data?.[0],
        metadata: {
          timestamp: new Date(),
          rateLimit: await this.getRateLimitInfo()
        }
      };
    } catch (error) {
      return this.handleError(error as any, 'Failed to upsert sales order');
    }
  }

  // Vendor Methods
  async createVendor(vendor: any): Promise<ConnectorResponse> {
    try {
      const zohoVendor = {
        Vendor_Name: vendor.vendorName,
        Email: vendor.email,
        Phone: vendor.phone,
        Website: vendor.website,
        Category: vendor.category,
        Description: vendor.description,
        ...vendor.customFields
      };

      const result = await this.performRequest({
        method: 'POST',
        endpoint: '/Vendors',
        body: {
          data: [zohoVendor]
        }
      });

      return {
        success: true,
        data: result.data?.[0],
        metadata: {
          timestamp: new Date(),
          rateLimit: await this.getRateLimitInfo()
        }
      };
    } catch (error) {
      return this.handleError(error as any, 'Failed to create vendor');
    }
  }

  async updateVendor(vendorId: string, updates: any): Promise<ConnectorResponse> {
    try {
      const zohoUpdates = {
        id: vendorId,
        Vendor_Name: updates.vendorName,
        Email: updates.email,
        Phone: updates.phone,
        Website: updates.website,
        ...updates.customFields
      };

      const result = await this.performRequest({
        method: 'PUT',
        endpoint: '/Vendors',
        body: {
          data: [zohoUpdates]
        }
      });

      return {
        success: true,
        data: result.data?.[0],
        metadata: {
          timestamp: new Date(),
          rateLimit: await this.getRateLimitInfo()
        }
      };
    } catch (error) {
      return this.handleError(error as any, 'Failed to update vendor');
    }
  }

  async getVendor(vendorId: string): Promise<ConnectorResponse> {
    try {
      const result = await this.performRequest({
        method: 'GET',
        endpoint: `/Vendors/${vendorId}`
      });

      return {
        success: true,
        data: result.data?.[0],
        metadata: {
          timestamp: new Date(),
          rateLimit: await this.getRateLimitInfo()
        }
      };
    } catch (error) {
      return this.handleError(error as any, 'Failed to get vendor');
    }
  }

  async getVendors(options?: any): Promise<ConnectorResponse> {
    try {
      const queryParams: any = {
        page: options?.page || 1,
        per_page: options?.limit || 200
      };

      let data: any[] = [];
      if (options?.returnAll) {
        data = await this.getAllRecords('/Vendors', queryParams);
      } else {
        const result = await this.performRequest({
          method: 'GET',
          endpoint: '/Vendors',
          queryParams
        });
        data = result.data || [];
      }

      return {
        success: true,
        data,
        metadata: {
          timestamp: new Date(),
          rateLimit: await this.getRateLimitInfo()
        }
      };
    } catch (error) {
      return this.handleError(error as any, 'Failed to get vendors');
    }
  }

  async deleteVendor(vendorId: string): Promise<ConnectorResponse> {
    try {
      const result = await this.performRequest({
        method: 'DELETE',
        endpoint: `/Vendors/${vendorId}`
      });

      return {
        success: true,
        data: result.data?.[0],
        metadata: {
          timestamp: new Date(),
          rateLimit: await this.getRateLimitInfo()
        }
      };
    } catch (error) {
      return this.handleError(error as any, 'Failed to delete vendor');
    }
  }

  async upsertVendor(vendor: any): Promise<ConnectorResponse> {
    try {
      const zohoVendor = {
        Vendor_Name: vendor.vendorName,
        ...vendor
      };

      const result = await this.performRequest({
        method: 'POST',
        endpoint: '/Vendors/upsert',
        body: {
          data: [zohoVendor]
        }
      });

      return {
        success: true,
        data: result.data?.[0],
        metadata: {
          timestamp: new Date(),
          rateLimit: await this.getRateLimitInfo()
        }
      };
    } catch (error) {
      return this.handleError(error as any, 'Failed to upsert vendor');
    }
  }

  // Helper method to get all records with pagination
  private async getAllRecords(endpoint: string, queryParams: any): Promise<any[]> {
    const allRecords: any[] = [];
    let page = 1;
    let hasMore = true;

    while (hasMore) {
      const result = await this.performRequest({
        method: 'GET',
        endpoint,
        queryParams: { ...queryParams, page }
      });

      if (result.data && result.data.length > 0) {
        allRecords.push(...result.data);
        hasMore = result.info?.more_records || false;
        page++;
      } else {
        hasMore = false;
      }
    }

    return allRecords;
  }

  async createActivity(activity: any): Promise<ConnectorResponse> {
    try {
      const zohoActivity = {
        Subject: activity.subject,
        Activity_Type: activity.type || 'Task',
        Due_Date: activity.dueDate,
        Status: activity.status || 'Not Started',
        Priority: activity.priority || 'Normal',
        Description: activity.description,
        What_Id: activity.relatedToId ? { id: activity.relatedToId } : undefined,
        Who_Id: activity.contactId ? { id: activity.contactId } : undefined,
        Owner: activity.ownerId ? { id: activity.ownerId } : undefined,
        ...activity.customFields
      };

      const result = await this.performRequest({
        method: 'POST',
        endpoint: '/Tasks',
        body: {
          data: [zohoActivity]
        }
      });

      return {
        success: true,
        data: result.data?.[0],
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
      const zohoUpdates = {
        id: activityId,
        Subject: updates.subject,
        Due_Date: updates.dueDate,
        Status: updates.status,
        Priority: updates.priority,
        Description: updates.description,
        ...updates.customFields
      };

      const result = await this.performRequest({
        method: 'PUT',
        endpoint: '/Tasks',
        body: {
          data: [zohoUpdates]
        }
      });

      return {
        success: true,
        data: result.data?.[0],
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
        page: options?.page || 1,
        per_page: options?.pageSize || 200,
        sort_order: 'desc',
        sort_by: 'Modified_Time'
      };

      if (options?.filters) {
        const filters = Object.entries(options.filters)
          .map(([key, value]) => `${key}:equals:${value}`)
          .join(' and ');
        queryParams.criteria = filters;
      }

      const result = await this.performRequest({
        method: 'GET',
        endpoint: '/Tasks',
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
            pageSize: options?.pageSize || 200,
            total: 0,
            hasNext: result.info?.more_records || false
          }
        }
      };
    } catch (error) {
      return this.handleError(error as any, 'Failed to get activities');
    }
  }

  async bulkOperation<T>(operation: BulkOperation<T>): Promise<BulkOperationResult<T>> {
    try {
      const batchSize = Math.min(operation.batchSize || 100, 100); // Zoho limit
      const batches: any[] = [];
      
      for (let i = 0; i < operation.items.length; i += batchSize) {
        batches.push(operation.items.slice(i, i + batchSize));
      }

      const successful: T[] = [];
      const failed: Array<{ item: T; error: any }> = [];

      for (const batch of batches) {
        try {
          let endpoint: string;
          let method: 'POST' | 'PUT' | 'DELETE' = 'POST';
          
          switch (operation.operation) {
            case 'create':
              endpoint = '/Contacts';
              break;
            case 'update':
              endpoint = '/Contacts';
              method = 'PUT';
              break;
            case 'delete':
              endpoint = '/Contacts';
              method = 'DELETE';
              break;
          }

          const result = await this.performRequest({
            method,
            endpoint,
            body: { data: batch }
          });

          if (result.data) {
            result.data.forEach((item: any, index: number) => {
              if (item.status === 'success') {
                successful.push(batch[index]);
              } else {
                failed.push({
                  item: batch[index],
                  error: { code: item.code, message: item.message }
                });
              }
            });
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
      const moduleName = this.getModuleName(objectType);
      
      const result = await this.performRequest({
        method: 'GET',
        endpoint: `/settings/fields`,
        queryParams: { module: moduleName }
      });

      const customFields = result.fields?.filter((field: any) => 
        field.system_mandatory === false && field.custom_field === true
      ) || [];

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
      const searchParams: any = {
        criteria: query,
        page: 1,
        per_page: 200
      };

      const results: any[] = [];
      const modules = objectTypes || ['Contacts', 'Accounts', 'Deals', 'Leads'];

      for (const module of modules) {
        try {
          const result = await this.performRequest({
            method: 'GET',
            endpoint: `/${module}/search`,
            queryParams: {
              ...searchParams,
              criteria: `(${this.getSearchFields(module).map(field => 
                `${field}:starts_with:${query}`).join(') or (')})`
            }
          });

          if (result.data) {
            results.push(...result.data.map((item: any) => ({ ...item, module })));
          }
        } catch (error) {
          this.logger.warn(`Failed to search in ${module}:`, error);
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

  // Zoho CRM-specific methods
  async createLead(lead: any): Promise<ConnectorResponse> {
    try {
      const zohoLead = {
        First_Name: lead.firstName,
        Last_Name: lead.lastName,
        Email: lead.email,
        Phone: lead.phone,
        Company: lead.company,
        Title: lead.title,
        Industry: lead.industry,
        Lead_Status: lead.status || 'Not Contacted',
        Lead_Source: lead.source,
        Rating: lead.rating,
        Website: lead.website,
        Description: lead.description,
        Owner: lead.ownerId ? { id: lead.ownerId } : undefined,
        ...lead.customFields
      };

      const result = await this.performRequest({
        method: 'POST',
        endpoint: '/Leads',
        body: {
          data: [zohoLead]
        }
      });

      return {
        success: true,
        data: result.data?.[0],
        metadata: {
          timestamp: new Date(),
          rateLimit: await this.getRateLimitInfo()
        }
      };
    } catch (error) {
      return this.handleError(error as any, 'Failed to create lead');
    }
  }

  async searchRecords(module: string, criteria: string): Promise<ConnectorResponse> {
    try {
      const result = await this.performRequest({
        method: 'GET',
        endpoint: `/${module}/search`,
        queryParams: { criteria }
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
      return this.handleError(error as any, 'Failed to search records');
    }
  }

  async getModules(): Promise<ConnectorResponse> {
    try {
      const result = await this.performRequest({
        method: 'GET',
        endpoint: '/settings/modules'
      });

      return {
        success: true,
        data: result.modules || [],
        metadata: {
          timestamp: new Date(),
          rateLimit: await this.getRateLimitInfo()
        }
      };
    } catch (error) {
      return this.handleError(error as any, 'Failed to get modules');
    }
  }

  async updateRecord(module: string, recordId: string, data: any): Promise<ConnectorResponse> {
    try {
      const result = await this.performRequest({
        method: 'PUT',
        endpoint: `/${module}`,
        body: {
          data: [{ id: recordId, ...data }]
        }
      });

      return {
        success: true,
        data: result.data?.[0],
        metadata: {
          timestamp: new Date(),
          rateLimit: await this.getRateLimitInfo()
        }
      };
    } catch (error) {
      return this.handleError(error as any, 'Failed to update record');
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

      const refreshUrl = `https://accounts.zoho.com/oauth/v2/token`;
      
      const result = await this.apiUtils.post(refreshUrl, {
        refresh_token: refreshToken,
        client_id: clientId,
        client_secret: clientSecret,
        grant_type: 'refresh_token'
      });

      if (!result.success) {
        throw new Error(result.error?.message || 'Token refresh failed');
      }

      return {
        accessToken: result.data.access_token,
        refreshToken: refreshToken, // Zoho doesn't provide new refresh token
        expiresAt: result.data.expires_in ? new Date(Date.now() + (result.data.expires_in * 1000)) : undefined,
        tokenType: result.data.token_type
      };
    } catch (error) {
      this.logger.error('Token refresh failed:', error);
      throw error;
    }
  }

  protected async getRateLimitInfo(): Promise<{ remaining: number; reset: Date } | undefined> {
    // Zoho rate limit info would be extracted from response headers
    // This would need to be implemented based on actual API responses
    return undefined;
  }

  private getAuthHeaders(): Record<string, string> {
    return {
      'Authorization': `Zoho-oauthtoken ${this.config.credentials.accessToken}`
    };
  }

  private getModuleName(objectType: string): string {
    const moduleMap: Record<string, string> = {
      contact: 'Contacts',
      deal: 'Deals',
      company: 'Accounts',
      account: 'Accounts',
      lead: 'Leads',
      task: 'Tasks',
      activity: 'Tasks'
    };
    return moduleMap[objectType.toLowerCase()] || objectType;
  }

  private getSearchFields(module: string): string[] {
    const fieldMap: Record<string, string[]> = {
      'Contacts': ['First_Name', 'Last_Name', 'Email'],
      'Accounts': ['Account_Name', 'Website', 'Phone'],
      'Deals': ['Deal_Name', 'Account_Name'],
      'Leads': ['First_Name', 'Last_Name', 'Email', 'Company']
    };
    return fieldMap[module] || ['Name'];
  }

  private getActions(): ConnectorAction[] {
    return [
      {
        id: 'create_lead',
        name: 'Create Lead',
        description: 'Create a new lead in Zoho CRM',
        inputSchema: {
          firstName: { type: 'string', description: 'Lead first name' },
          lastName: { type: 'string', required: true, description: 'Lead last name' },
          email: { type: 'string', description: 'Lead email address' },
          company: { type: 'string', description: 'Lead company' },
          phone: { type: 'string', description: 'Lead phone number' }
        },
        outputSchema: {
          id: { type: 'string', description: 'Created lead ID' },
          success: { type: 'boolean', description: 'Whether creation was successful' }
        }
      },
      {
        id: 'create_contact',
        name: 'Create Contact',
        description: 'Create a new contact in Zoho CRM',
        inputSchema: {
          firstName: { type: 'string', description: 'Contact first name' },
          lastName: { type: 'string', required: true, description: 'Contact last name' },
          email: { type: 'string', description: 'Contact email address' },
          phone: { type: 'string', description: 'Contact phone number' }
        },
        outputSchema: {
          id: { type: 'string', description: 'Created contact ID' }
        }
      },
      {
        id: 'create_deal',
        name: 'Create Deal',
        description: 'Create a new deal in Zoho CRM',
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
        id: 'search_records',
        name: 'Search Records',
        description: 'Search records in any Zoho CRM module',
        inputSchema: {
          module: { type: 'string', required: true, description: 'Module name (Contacts, Deals, etc.)' },
          criteria: { type: 'string', required: true, description: 'Search criteria' }
        },
        outputSchema: {
          records: { type: 'array', description: 'Matching records' }
        }
      },
      {
        id: 'get_modules',
        name: 'Get Modules',
        description: 'Retrieve all available modules',
        inputSchema: {},
        outputSchema: {
          modules: { type: 'array', description: 'List of available modules' }
        }
      },
      {
        id: 'update_record',
        name: 'Update Record',
        description: 'Update a record in any module',
        inputSchema: {
          module: { type: 'string', required: true, description: 'Module name' },
          id: { type: 'string', required: true, description: 'Record ID' },
          data: { type: 'object', required: true, description: 'Data to update' }
        },
        outputSchema: {
          success: { type: 'boolean', description: 'Whether update was successful' }
        }
      }
    ];
  }

  private getTriggers(): ConnectorTrigger[] {
    return [
      {
        id: 'record_created',
        name: 'Record Created',
        description: 'Triggered when a record is created in any module',
        eventType: 'record.created',
        outputSchema: {
          record: { type: 'object', description: 'Created record information' },
          module: { type: 'string', description: 'Module name' }
        },
        webhookRequired: true
      },
      {
        id: 'record_updated',
        name: 'Record Updated',
        description: 'Triggered when a record is updated',
        eventType: 'record.updated',
        outputSchema: {
          record: { type: 'object', description: 'Updated record information' },
          module: { type: 'string', description: 'Module name' }
        },
        webhookRequired: true
      },
      {
        id: 'deal_stage_changed',
        name: 'Deal Stage Changed',
        description: 'Triggered when a deal stage is changed',
        eventType: 'deal.stage_changed',
        outputSchema: {
          deal: { type: 'object', description: 'Deal information' },
          previousStage: { type: 'string', description: 'Previous stage' },
          newStage: { type: 'string', description: 'New stage' }
        },
        webhookRequired: true
      },
      {
        id: 'lead_converted',
        name: 'Lead Converted',
        description: 'Triggered when a lead is converted',
        eventType: 'lead.converted',
        outputSchema: {
          lead: { type: 'object', description: 'Converted lead information' },
          contact: { type: 'object', description: 'Created contact information' },
          account: { type: 'object', description: 'Created account information' }
        },
        webhookRequired: true
      }
    ];
  }
}