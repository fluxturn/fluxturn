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
export class QuickBooksConnector extends BaseConnector implements IConnector {
  private client: AxiosInstance;
  private baseUrl: string;
  private realmId: string;

  getMetadata(): ConnectorMetadata {
    return {
      name: 'QuickBooks',
      description: 'QuickBooks Online accounting software connector',
      version: '1.0.0',
      category: ConnectorCategory.FINANCE,
      type: ConnectorType.QUICKBOOKS,
      logoUrl: 'https://cdn.jsdelivr.net/npm/simple-icons@v9/icons/quickbooks.svg',
      authType: AuthType.OAUTH2,
      actions: [],
      triggers: [],
      rateLimit: {
        requestsPerMinute: 500,
      },
      webhookSupport: true,
    };
  }

  protected async initializeConnection(): Promise<void> {
    const { accessToken, realmId, environment } = this.config.credentials;

    if (!accessToken || !realmId) {
      throw new Error('QuickBooks access token and realm ID are required');
    }

    this.realmId = realmId;
    this.baseUrl = environment === 'sandbox'
      ? 'https://sandbox-quickbooks.api.intuit.com'
      : 'https://quickbooks.api.intuit.com';

    this.client = axios.create({
      baseURL: `${this.baseUrl}/v3/company/${realmId}`,
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Accept': 'application/json',
        'Content-Type': 'application/json',
      },
    });

    this.logger.log('QuickBooks connector initialized');
  }

  protected async performConnectionTest(): Promise<boolean> {
    try {
      const response = await this.client.get('/companyinfo/' + this.realmId);
      return response.status === 200;
    } catch (error) {
      throw new Error(`QuickBooks connection test failed: ${error.message}`);
    }
  }

  protected async performHealthCheck(): Promise<void> {
    await this.client.get('/companyinfo/' + this.realmId);
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
      // Customer actions
      case 'create_customer':
        return this.createCustomer(input);
      case 'get_customer':
        return this.getCustomer(input.customerId);
      case 'get_customers':
        return this.getCustomers(input);
      case 'update_customer':
        return this.updateCustomer(input);

      // Invoice actions
      case 'create_invoice':
        return this.createInvoice(input);
      case 'get_invoice':
        return this.getInvoice(input.invoiceId);
      case 'get_invoices':
        return this.getInvoices(input);
      case 'send_invoice':
        return this.sendInvoice(input.invoiceId, input.email);
      case 'void_invoice':
        return this.voidInvoice(input);

      // Payment actions
      case 'create_payment':
        return this.createPayment(input);
      case 'get_payment':
        return this.getPayment(input.paymentId);
      case 'get_payments':
        return this.getPayments(input);

      // Bill actions
      case 'create_bill':
        return this.createBill(input);
      case 'get_bill':
        return this.getBill(input.billId);
      case 'get_bills':
        return this.getBills(input);

      // Item actions
      case 'create_item':
        return this.createItem(input);
      case 'get_item':
        return this.getItem(input.itemId);
      case 'get_items':
        return this.getItems(input);

      // Vendor actions
      case 'create_vendor':
        return this.createVendor(input);
      case 'get_vendor':
        return this.getVendor(input.vendorId);
      case 'get_vendors':
        return this.getVendors(input);

      // Query action
      case 'query':
        return this.executeQuery(input.query);

      default:
        throw new Error(`Unknown action: ${actionId}`);
    }
  }

  protected async cleanup(): Promise<void> {
    this.logger.log('QuickBooks connector cleanup completed');
  }

  // Customer methods
  private async createCustomer(input: any): Promise<ConnectorResponse> {
    try {
      const response = await this.client.post('/customer', input);
      return { success: true, data: response.data.Customer };
    } catch (error) {
      return this.handleError(error, 'Failed to create customer');
    }
  }

  private async getCustomer(customerId: string): Promise<ConnectorResponse> {
    try {
      const response = await this.client.get(`/customer/${customerId}`);
      return { success: true, data: response.data.Customer };
    } catch (error) {
      return this.handleError(error, 'Failed to get customer');
    }
  }

  private async getCustomers(input: any): Promise<ConnectorResponse> {
    try {
      let query = 'SELECT * FROM Customer';
      if (input.maxResults) query += ` MAXRESULTS ${input.maxResults}`;
      if (input.startPosition) query += ` STARTPOSITION ${input.startPosition}`;

      const response = await this.client.get('/query', {
        params: { query },
      });
      return { success: true, data: response.data.QueryResponse.Customer || [] };
    } catch (error) {
      return this.handleError(error, 'Failed to get customers');
    }
  }

  private async updateCustomer(input: any): Promise<ConnectorResponse> {
    try {
      const response = await this.client.post('/customer', input);
      return { success: true, data: response.data.Customer };
    } catch (error) {
      return this.handleError(error, 'Failed to update customer');
    }
  }

  // Invoice methods
  private async createInvoice(input: any): Promise<ConnectorResponse> {
    try {
      const response = await this.client.post('/invoice', input);
      return { success: true, data: response.data.Invoice };
    } catch (error) {
      return this.handleError(error, 'Failed to create invoice');
    }
  }

  private async getInvoice(invoiceId: string): Promise<ConnectorResponse> {
    try {
      const response = await this.client.get(`/invoice/${invoiceId}`);
      return { success: true, data: response.data.Invoice };
    } catch (error) {
      return this.handleError(error, 'Failed to get invoice');
    }
  }

  private async getInvoices(input: any): Promise<ConnectorResponse> {
    try {
      let query = 'SELECT * FROM Invoice';
      if (input.maxResults) query += ` MAXRESULTS ${input.maxResults}`;
      if (input.startPosition) query += ` STARTPOSITION ${input.startPosition}`;

      const response = await this.client.get('/query', { params: { query } });
      return { success: true, data: response.data.QueryResponse.Invoice || [] };
    } catch (error) {
      return this.handleError(error, 'Failed to get invoices');
    }
  }

  private async sendInvoice(invoiceId: string, email?: string): Promise<ConnectorResponse> {
    try {
      const params = email ? { sendTo: email } : {};
      const response = await this.client.post(`/invoice/${invoiceId}/send`, null, { params });
      return { success: true, data: response.data.Invoice };
    } catch (error) {
      return this.handleError(error, 'Failed to send invoice');
    }
  }

  private async voidInvoice(input: any): Promise<ConnectorResponse> {
    try {
      const response = await this.client.post('/invoice', {
        ...input,
        void: true,
      });
      return { success: true, data: response.data.Invoice };
    } catch (error) {
      return this.handleError(error, 'Failed to void invoice');
    }
  }

  // Payment methods
  private async createPayment(input: any): Promise<ConnectorResponse> {
    try {
      const response = await this.client.post('/payment', input);
      return { success: true, data: response.data.Payment };
    } catch (error) {
      return this.handleError(error, 'Failed to create payment');
    }
  }

  private async getPayment(paymentId: string): Promise<ConnectorResponse> {
    try {
      const response = await this.client.get(`/payment/${paymentId}`);
      return { success: true, data: response.data.Payment };
    } catch (error) {
      return this.handleError(error, 'Failed to get payment');
    }
  }

  private async getPayments(input: any): Promise<ConnectorResponse> {
    try {
      let query = 'SELECT * FROM Payment';
      if (input.maxResults) query += ` MAXRESULTS ${input.maxResults}`;

      const response = await this.client.get('/query', { params: { query } });
      return { success: true, data: response.data.QueryResponse.Payment || [] };
    } catch (error) {
      return this.handleError(error, 'Failed to get payments');
    }
  }

  // Bill methods
  private async createBill(input: any): Promise<ConnectorResponse> {
    try {
      const response = await this.client.post('/bill', input);
      return { success: true, data: response.data.Bill };
    } catch (error) {
      return this.handleError(error, 'Failed to create bill');
    }
  }

  private async getBill(billId: string): Promise<ConnectorResponse> {
    try {
      const response = await this.client.get(`/bill/${billId}`);
      return { success: true, data: response.data.Bill };
    } catch (error) {
      return this.handleError(error, 'Failed to get bill');
    }
  }

  private async getBills(input: any): Promise<ConnectorResponse> {
    try {
      let query = 'SELECT * FROM Bill';
      if (input.maxResults) query += ` MAXRESULTS ${input.maxResults}`;

      const response = await this.client.get('/query', { params: { query } });
      return { success: true, data: response.data.QueryResponse.Bill || [] };
    } catch (error) {
      return this.handleError(error, 'Failed to get bills');
    }
  }

  // Item methods
  private async createItem(input: any): Promise<ConnectorResponse> {
    try {
      const response = await this.client.post('/item', input);
      return { success: true, data: response.data.Item };
    } catch (error) {
      return this.handleError(error, 'Failed to create item');
    }
  }

  private async getItem(itemId: string): Promise<ConnectorResponse> {
    try {
      const response = await this.client.get(`/item/${itemId}`);
      return { success: true, data: response.data.Item };
    } catch (error) {
      return this.handleError(error, 'Failed to get item');
    }
  }

  private async getItems(input: any): Promise<ConnectorResponse> {
    try {
      let query = 'SELECT * FROM Item';
      if (input.maxResults) query += ` MAXRESULTS ${input.maxResults}`;

      const response = await this.client.get('/query', { params: { query } });
      return { success: true, data: response.data.QueryResponse.Item || [] };
    } catch (error) {
      return this.handleError(error, 'Failed to get items');
    }
  }

  // Vendor methods
  private async createVendor(input: any): Promise<ConnectorResponse> {
    try {
      const response = await this.client.post('/vendor', input);
      return { success: true, data: response.data.Vendor };
    } catch (error) {
      return this.handleError(error, 'Failed to create vendor');
    }
  }

  private async getVendor(vendorId: string): Promise<ConnectorResponse> {
    try {
      const response = await this.client.get(`/vendor/${vendorId}`);
      return { success: true, data: response.data.Vendor };
    } catch (error) {
      return this.handleError(error, 'Failed to get vendor');
    }
  }

  private async getVendors(input: any): Promise<ConnectorResponse> {
    try {
      let query = 'SELECT * FROM Vendor';
      if (input.maxResults) query += ` MAXRESULTS ${input.maxResults}`;

      const response = await this.client.get('/query', { params: { query } });
      return { success: true, data: response.data.QueryResponse.Vendor || [] };
    } catch (error) {
      return this.handleError(error, 'Failed to get vendors');
    }
  }

  // Query method
  private async executeQuery(query: string): Promise<ConnectorResponse> {
    try {
      const response = await this.client.get('/query', { params: { query } });
      return { success: true, data: response.data.QueryResponse };
    } catch (error) {
      return this.handleError(error, 'Failed to execute query');
    }
  }
}
