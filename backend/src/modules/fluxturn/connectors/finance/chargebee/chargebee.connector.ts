// Chargebee Connector Implementation
// Subscription billing and revenue management platform

import { Injectable, Logger } from '@nestjs/common';
import axios, { AxiosInstance } from 'axios';
import { BaseConnector } from '../../base/base.connector';
import { IFinanceConnector } from '../../base/connector.interface';
import {
  ConnectorConfig,
  ConnectorResponse,
  ConnectorMetadata,
  ConnectorType,
  ConnectorCategory,
  AuthType,
  PaginatedRequest,
  ConnectorAction,
  ConnectorTrigger,
  ConnectorRequest,
} from '../../types';
import { CHARGEBEE_CONNECTOR } from './chargebee.definition';

interface ChargebeeCredentials {
  accountName: string;
  apiKey: string;
}

@Injectable()
export class ChargebeeConnector extends BaseConnector implements IFinanceConnector {
  private httpClient: AxiosInstance;
  private accountName: string;
  private apiKey: string;
  private baseUrl: string;

  getMetadata(): ConnectorMetadata {
    return {
      name: 'Chargebee',
      description: 'Subscription billing and revenue management platform for SaaS and subscription businesses',
      version: '1.0.0',
      category: ConnectorCategory.FINANCE,
      type: ConnectorType.CHARGEBEE,
      authType: AuthType.API_KEY,
      actions: this.getActions(),
      triggers: this.getTriggers(),
      webhookSupport: true,
    };
  }

  private getActions(): ConnectorAction[] {
    return [
      // Customer actions
      { id: 'create_customer', name: 'Create Customer', description: 'Create a new customer in Chargebee', inputSchema: {}, outputSchema: {} },
      { id: 'get_customer', name: 'Get Customer', description: 'Retrieve a specific customer by ID', inputSchema: {}, outputSchema: {} },
      { id: 'update_customer', name: 'Update Customer', description: 'Update an existing customer', inputSchema: {}, outputSchema: {} },
      { id: 'list_customers', name: 'List Customers', description: 'Retrieve a list of customers', inputSchema: {}, outputSchema: {} },

      // Invoice actions
      { id: 'list_invoices', name: 'List Invoices', description: 'Retrieve a list of invoices with optional filters', inputSchema: {}, outputSchema: {} },
      { id: 'get_invoice_pdf', name: 'Get Invoice PDF URL', description: 'Get a downloadable URL for an invoice PDF', inputSchema: {}, outputSchema: {} },

      // Subscription actions
      { id: 'get_subscription', name: 'Get Subscription', description: 'Retrieve a specific subscription by ID', inputSchema: {}, outputSchema: {} },
      { id: 'list_subscriptions', name: 'List Subscriptions', description: 'Retrieve a list of subscriptions', inputSchema: {}, outputSchema: {} },
      { id: 'cancel_subscription', name: 'Cancel Subscription', description: 'Cancel an active subscription', inputSchema: {}, outputSchema: {} },
      { id: 'delete_subscription', name: 'Delete Subscription', description: 'Delete a subscription permanently', inputSchema: {}, outputSchema: {} },
    ];
  }

  private getTriggers(): ConnectorTrigger[] {
    return [
      { id: 'subscription_created', name: 'Subscription Created', description: 'Triggers when a new subscription is created', eventType: 'subscription_created', webhookRequired: true, outputSchema: {} },
      { id: 'subscription_cancelled', name: 'Subscription Cancelled', description: 'Triggers when a subscription is cancelled', eventType: 'subscription_cancelled', webhookRequired: true, outputSchema: {} },
      { id: 'subscription_renewed', name: 'Subscription Renewed', description: 'Triggers when a subscription is renewed', eventType: 'subscription_renewed', webhookRequired: true, outputSchema: {} },
      { id: 'payment_succeeded', name: 'Payment Succeeded', description: 'Triggers when a payment is successfully processed', eventType: 'payment_succeeded', webhookRequired: true, outputSchema: {} },
      { id: 'payment_failed', name: 'Payment Failed', description: 'Triggers when a payment fails', eventType: 'payment_failed', webhookRequired: true, outputSchema: {} },
      { id: 'invoice_generated', name: 'Invoice Generated', description: 'Triggers when a new invoice is generated', eventType: 'invoice_generated', webhookRequired: true, outputSchema: {} },
      { id: 'customer_created', name: 'Customer Created', description: 'Triggers when a new customer is created', eventType: 'customer_created', webhookRequired: true, outputSchema: {} },
    ];
  }

  protected async initializeConnection(): Promise<void> {
    const credentials = (this.config?.credentials || {}) as ChargebeeCredentials;
    const { accountName, apiKey } = credentials;

    if (!accountName || !apiKey) {
      throw new Error('Chargebee account name and API key are required');
    }

    this.accountName = accountName;
    this.apiKey = apiKey;
    this.baseUrl = `https://${accountName}.chargebee.com/api/v2`;

    this.httpClient = axios.create({
      baseURL: this.baseUrl,
      auth: {
        username: apiKey,
        password: '', // Chargebee uses API key as username with empty password
      },
      headers: { 'Content-Type': 'application/json' },
    });

    this.logger.log(`Chargebee connector initialized for account: ${accountName}`);
  }

  async initialize(config: ConnectorConfig): Promise<void> {
    this.config = config;
    await this.initializeConnection();
  }

  protected async performConnectionTest(): Promise<boolean> {
    try {
      // Test connection by attempting to list customers with limit 1
      const response = await this.httpClient.get('/customers', {
        params: { limit: 1 },
      });
      return response.status === 200;
    } catch (error) {
      this.logger.error(`Connection test failed: ${error.message}`);
      return false;
    }
  }

  protected async performHealthCheck(): Promise<void> {
    const isConnected = await this.performConnectionTest();
    if (!isConnected) {
      throw new Error('Chargebee health check failed');
    }
  }

  protected async performRequest(request: ConnectorRequest): Promise<any> {
    const response = await this.httpClient.request({
      method: request.method,
      url: request.endpoint,
      data: request.body,
      params: request.queryParams,
      headers: request.headers,
    });
    return response.data;
  }

  protected async performAction(actionId: string, input: any): Promise<any> {
    try {
      switch (actionId) {
        // ===== Customer Actions =====
        case 'create_customer':
          return await this.createCustomerAction(input);

        case 'get_customer':
          return await this.getCustomerAction(input);

        case 'update_customer':
          return await this.updateCustomerAction(input);

        case 'list_customers':
          return await this.listCustomersAction(input);

        // ===== Invoice Actions =====
        case 'list_invoices':
          return await this.listInvoicesAction(input);

        case 'get_invoice_pdf':
          return await this.getInvoicePdfAction(input);

        // ===== Subscription Actions =====
        case 'get_subscription':
          return await this.getSubscriptionAction(input);

        case 'list_subscriptions':
          return await this.listSubscriptionsAction(input);

        case 'cancel_subscription':
          return await this.cancelSubscriptionAction(input);

        case 'delete_subscription':
          return await this.deleteSubscriptionAction(input);

        default:
          throw new Error(`Unknown action: ${actionId}`);
      }
    } catch (error) {
      this.logger.error(`Action ${actionId} failed: ${error.message}`);
      throw error;
    }
  }

  protected async cleanup(): Promise<void> {
    this.logger.log('Chargebee connector cleanup completed');
  }

  // ============= IFinanceConnector Interface Methods =============

  async getAccounts(): Promise<ConnectorResponse> {
    return {
      success: false,
      error: {
        code: 'NOT_SUPPORTED',
        message: 'Chargebee does not support account retrieval. Use list_customers instead.',
      },
    };
  }

  async getTransactions(accountId?: string, options?: PaginatedRequest): Promise<ConnectorResponse> {
    return {
      success: false,
      error: {
        code: 'NOT_SUPPORTED',
        message: 'Use list_invoices action to retrieve billing transactions.',
      },
    };
  }

  async createInvoice(invoice: any): Promise<ConnectorResponse> {
    return {
      success: false,
      error: {
        code: 'NOT_SUPPORTED',
        message: 'Chargebee invoices are automatically generated from subscriptions.',
      },
    };
  }

  async processPayment(payment: any): Promise<ConnectorResponse> {
    return {
      success: false,
      error: {
        code: 'NOT_SUPPORTED',
        message: 'Chargebee handles payments automatically via configured payment gateways.',
      },
    };
  }

  async getReports(reportType: string, dateRange?: any): Promise<ConnectorResponse> {
    return {
      success: false,
      error: {
        code: 'NOT_SUPPORTED',
        message: 'Use specific actions like list_invoices or list_subscriptions for reporting data.',
      },
    };
  }

  // ============= Customer Action Implementations =============

  private async createCustomerAction(input: any): Promise<any> {
    const requestBody: any = {};

    // Map input fields to Chargebee API format
    if (input.id) requestBody.id = input.id;
    if (input.first_name) requestBody.first_name = input.first_name;
    if (input.last_name) requestBody.last_name = input.last_name;
    if (input.email) requestBody.email = input.email;
    if (input.phone) requestBody.phone = input.phone;
    if (input.company) requestBody.company = input.company;
    if (input.auto_collection) requestBody.auto_collection = input.auto_collection;
    if (input.allow_direct_debit !== undefined) requestBody.allow_direct_debit = input.allow_direct_debit;
    if (input.vat_number) requestBody.vat_number = input.vat_number;

    // Handle billing address if provided
    if (input.billing_address) {
      Object.keys(input.billing_address).forEach((key) => {
        requestBody[`billing_address[${key}]`] = input.billing_address[key];
      });
    }

    // Handle custom properties if provided
    if (input.customProperties) {
      input.customProperties.forEach((prop: any) => {
        requestBody[prop.name] = prop.value;
      });
    }

    const response = await this.httpClient.post('/customers', requestBody);
    return response.data;
  }

  private async getCustomerAction(input: any): Promise<any> {
    const { customerId } = input;
    const response = await this.httpClient.get(`/customers/${customerId}`);
    return response.data;
  }

  private async updateCustomerAction(input: any): Promise<any> {
    const { customerId, ...updateData } = input;
    const response = await this.httpClient.post(`/customers/${customerId}`, updateData);
    return response.data;
  }

  private async listCustomersAction(input: any): Promise<any> {
    const params: any = {};
    if (input.limit) params.limit = input.limit;
    if (input.offset) params.offset = input.offset;

    const response = await this.httpClient.get('/customers', { params });
    return response.data;
  }

  // ============= Invoice Action Implementations =============

  private async listInvoicesAction(input: any): Promise<any> {
    const params: any = {};

    // Basic pagination
    if (input.limit) {
      params.limit = input.limit;
    }

    // Sorting
    if (input.sort_by) {
      const [field, direction] = input.sort_by.split('_');
      params['sort_by[desc]'] = field;
    } else {
      params['sort_by[desc]'] = 'date'; // Default sort
    }

    // Date filter
    if (input.date_filter && input.date_value) {
      let dateValue = input.date_value;
      // Convert date string to Unix timestamp if needed
      if (typeof dateValue === 'string' && dateValue.includes('-')) {
        dateValue = Math.floor(new Date(dateValue).getTime() / 1000);
      }
      params[`date[${input.date_filter}]`] = dateValue;
    }

    // Total amount filter
    if (input.total_filter && input.total_value !== undefined) {
      params[`total[${input.total_filter}]`] = input.total_value;
    }

    const response = await this.httpClient.get('/invoices', { params });
    return response.data;
  }

  private async getInvoicePdfAction(input: any): Promise<any> {
    const { invoiceId, disposition_type } = input;
    const requestBody: any = {};

    if (disposition_type) {
      requestBody.disposition_type = disposition_type;
    }

    const response = await this.httpClient.post(`/invoices/${invoiceId}/pdf`, requestBody);
    return response.data;
  }

  // ============= Subscription Action Implementations =============

  private async getSubscriptionAction(input: any): Promise<any> {
    const { subscriptionId } = input;
    const response = await this.httpClient.get(`/subscriptions/${subscriptionId}`);
    return response.data;
  }

  private async listSubscriptionsAction(input: any): Promise<any> {
    const params: any = {};

    if (input.limit) params.limit = input.limit;
    if (input.offset) params.offset = input.offset;

    // Status filter
    if (input.status && input.status !== '') {
      params['status[is]'] = input.status;
    }

    // Customer ID filter
    if (input.customer_id) {
      params['customer_id[is]'] = input.customer_id;
    }

    const response = await this.httpClient.get('/subscriptions', { params });
    return response.data;
  }

  private async cancelSubscriptionAction(input: any): Promise<any> {
    const { subscriptionId, ...cancelData } = input;
    const requestBody: any = {};

    if (cancelData.end_of_term !== undefined) {
      requestBody.end_of_term = cancelData.end_of_term;
    }
    if (cancelData.cancel_reason_code) {
      requestBody.cancel_reason_code = cancelData.cancel_reason_code;
    }
    if (cancelData.credit_option_for_current_term_charges) {
      requestBody.credit_option_for_current_term_charges = cancelData.credit_option_for_current_term_charges;
    }

    const response = await this.httpClient.post(`/subscriptions/${subscriptionId}/cancel`, requestBody);
    return response.data;
  }

  private async deleteSubscriptionAction(input: any): Promise<any> {
    const { subscriptionId } = input;
    const response = await this.httpClient.post(`/subscriptions/${subscriptionId}/delete`, {});
    return response.data;
  }

  // ============= Legacy executeAction for backward compatibility =============

  async executeAction(actionId: string, input: any): Promise<ConnectorResponse> {
    try {
      const result = await this.performAction(actionId, input);
      return {
        success: true,
        data: result,
      };
    } catch (error) {
      const errorData = error.response?.data || {};
      return {
        success: false,
        error: {
          code: errorData.error_code || errorData.type || 'CHARGEBEE_ERROR',
          message: errorData.message || errorData.error_msg || error.message,
          details: errorData,
        },
      };
    }
  }
}
