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
export class XeroConnector extends BaseConnector implements IConnector {
  private client: AxiosInstance;
  private tenantId: string;

  getMetadata(): ConnectorMetadata {
    return {
      name: 'Xero',
      description: 'Xero cloud accounting software connector',
      version: '1.0.0',
      category: ConnectorCategory.FINANCE,
      type: ConnectorType.XERO,
      logoUrl: 'https://cdn.jsdelivr.net/npm/simple-icons@v9/icons/xero.svg',
      authType: AuthType.OAUTH2,
      actions: [],
      triggers: [],
      rateLimit: {
        requestsPerMinute: 60,
      },
      webhookSupport: true,
    };
  }

  protected async initializeConnection(): Promise<void> {
    const { accessToken, metadata } = this.config.credentials;

    // Tenant ID is obtained from the OAuth flow via the Connections API
    // It's stored in metadata.tenantId after successful OAuth authentication
    const tenantId = metadata?.tenantId || this.config.credentials.tenantId;

    if (!accessToken) {
      throw new Error('Xero access token is required. Please authenticate with Xero OAuth.');
    }

    if (!tenantId) {
      throw new Error('Xero tenant ID is required. Please re-authenticate with Xero OAuth to obtain your organization ID.');
    }

    this.tenantId = tenantId;
    this.client = axios.create({
      baseURL: 'https://api.xero.com/api.xro/2.0',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Xero-tenant-id': tenantId,
        'Accept': 'application/json',
        'Content-Type': 'application/json',
      },
    });

    this.logger.log('Xero connector initialized');
  }

  protected async performConnectionTest(): Promise<boolean> {
    try {
      const response = await this.client.get('/Organisation');
      return response.status === 200;
    } catch (error) {
      throw new Error(`Xero connection test failed: ${error.message}`);
    }
  }

  protected async performHealthCheck(): Promise<void> {
    await this.client.get('/Organisation');
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
        return this.getContacts(input);
      case 'update_contact':
        return this.updateContact(input);

      // Invoice actions
      case 'create_invoice':
        return this.createInvoice(input);
      case 'get_invoice':
        return this.getInvoice(input.invoiceId);
      case 'get_invoices':
        return this.getInvoices(input);
      case 'update_invoice':
        return this.updateInvoice(input);
      case 'email_invoice':
        return this.emailInvoice(input.invoiceId);
      case 'void_invoice':
        return this.voidInvoice(input.invoiceId);

      // Payment actions
      case 'create_payment':
        return this.createPayment(input);
      case 'get_payment':
        return this.getPayment(input.paymentId);
      case 'get_payments':
        return this.getPayments(input);

      // Bank Transaction actions
      case 'create_bank_transaction':
        return this.createBankTransaction(input);
      case 'get_bank_transaction':
        return this.getBankTransaction(input.bankTransactionId);
      case 'get_bank_transactions':
        return this.getBankTransactions(input);

      // Account actions
      case 'get_accounts':
        return this.getAccounts(input);

      // Credit Note actions
      case 'create_credit_note':
        return this.createCreditNote(input);
      case 'get_credit_notes':
        return this.getCreditNotes(input);

      default:
        throw new Error(`Unknown action: ${actionId}`);
    }
  }

  protected async cleanup(): Promise<void> {
    this.logger.log('Xero connector cleanup completed');
  }

  // Contact methods
  private async createContact(input: any): Promise<ConnectorResponse> {
    try {
      const response = await this.client.post('/Contacts', { Contacts: [input] });
      return { success: true, data: response.data.Contacts?.[0] };
    } catch (error) {
      return this.handleError(error, 'Failed to create contact');
    }
  }

  private async getContact(contactId: string): Promise<ConnectorResponse> {
    try {
      const response = await this.client.get(`/Contacts/${contactId}`);
      return { success: true, data: response.data.Contacts?.[0] };
    } catch (error) {
      return this.handleError(error, 'Failed to get contact');
    }
  }

  private async getContacts(input: any): Promise<ConnectorResponse> {
    try {
      const params: any = {};
      if (input.where) params.where = input.where;
      if (input.order) params.order = input.order;
      if (input.page) params.page = input.page;

      const response = await this.client.get('/Contacts', { params });
      return { success: true, data: response.data.Contacts || [] };
    } catch (error) {
      return this.handleError(error, 'Failed to get contacts');
    }
  }

  private async updateContact(input: any): Promise<ConnectorResponse> {
    try {
      const response = await this.client.post(`/Contacts/${input.ContactID}`, { Contacts: [input] });
      return { success: true, data: response.data.Contacts?.[0] };
    } catch (error) {
      return this.handleError(error, 'Failed to update contact');
    }
  }

  // Invoice methods
  private async createInvoice(input: any): Promise<ConnectorResponse> {
    try {
      const response = await this.client.post('/Invoices', { Invoices: [input] });
      return { success: true, data: response.data.Invoices?.[0] };
    } catch (error) {
      return this.handleError(error, 'Failed to create invoice');
    }
  }

  private async getInvoice(invoiceId: string): Promise<ConnectorResponse> {
    try {
      const response = await this.client.get(`/Invoices/${invoiceId}`);
      return { success: true, data: response.data.Invoices?.[0] };
    } catch (error) {
      return this.handleError(error, 'Failed to get invoice');
    }
  }

  private async getInvoices(input: any): Promise<ConnectorResponse> {
    try {
      const params: any = {};
      if (input.where) params.where = input.where;
      if (input.order) params.order = input.order;
      if (input.page) params.page = input.page;
      if (input.Statuses) params.Statuses = input.Statuses;

      const response = await this.client.get('/Invoices', { params });
      return { success: true, data: response.data.Invoices || [] };
    } catch (error) {
      return this.handleError(error, 'Failed to get invoices');
    }
  }

  private async updateInvoice(input: any): Promise<ConnectorResponse> {
    try {
      const response = await this.client.post(`/Invoices/${input.InvoiceID}`, { Invoices: [input] });
      return { success: true, data: response.data.Invoices?.[0] };
    } catch (error) {
      return this.handleError(error, 'Failed to update invoice');
    }
  }

  private async emailInvoice(invoiceId: string): Promise<ConnectorResponse> {
    try {
      await this.client.post(`/Invoices/${invoiceId}/Email`);
      return { success: true, data: { sent: true } };
    } catch (error) {
      return this.handleError(error, 'Failed to email invoice');
    }
  }

  private async voidInvoice(invoiceId: string): Promise<ConnectorResponse> {
    try {
      const response = await this.client.post(`/Invoices/${invoiceId}`, {
        Invoices: [{ InvoiceID: invoiceId, Status: 'VOIDED' }],
      });
      return { success: true, data: response.data.Invoices?.[0] };
    } catch (error) {
      return this.handleError(error, 'Failed to void invoice');
    }
  }

  // Payment methods
  private async createPayment(input: any): Promise<ConnectorResponse> {
    try {
      const response = await this.client.post('/Payments', { Payments: [input] });
      return { success: true, data: response.data.Payments?.[0] };
    } catch (error) {
      return this.handleError(error, 'Failed to create payment');
    }
  }

  private async getPayment(paymentId: string): Promise<ConnectorResponse> {
    try {
      const response = await this.client.get(`/Payments/${paymentId}`);
      return { success: true, data: response.data.Payments?.[0] };
    } catch (error) {
      return this.handleError(error, 'Failed to get payment');
    }
  }

  private async getPayments(input: any): Promise<ConnectorResponse> {
    try {
      const params: any = {};
      if (input.where) params.where = input.where;
      if (input.order) params.order = input.order;

      const response = await this.client.get('/Payments', { params });
      return { success: true, data: response.data.Payments || [] };
    } catch (error) {
      return this.handleError(error, 'Failed to get payments');
    }
  }

  // Bank Transaction methods
  private async createBankTransaction(input: any): Promise<ConnectorResponse> {
    try {
      const response = await this.client.post('/BankTransactions', { BankTransactions: [input] });
      return { success: true, data: response.data.BankTransactions?.[0] };
    } catch (error) {
      return this.handleError(error, 'Failed to create bank transaction');
    }
  }

  private async getBankTransaction(bankTransactionId: string): Promise<ConnectorResponse> {
    try {
      const response = await this.client.get(`/BankTransactions/${bankTransactionId}`);
      return { success: true, data: response.data.BankTransactions?.[0] };
    } catch (error) {
      return this.handleError(error, 'Failed to get bank transaction');
    }
  }

  private async getBankTransactions(input: any): Promise<ConnectorResponse> {
    try {
      const params: any = {};
      if (input.where) params.where = input.where;
      if (input.order) params.order = input.order;
      if (input.page) params.page = input.page;

      const response = await this.client.get('/BankTransactions', { params });
      return { success: true, data: response.data.BankTransactions || [] };
    } catch (error) {
      return this.handleError(error, 'Failed to get bank transactions');
    }
  }

  // Account methods
  private async getAccounts(input: any): Promise<ConnectorResponse> {
    try {
      const params: any = {};
      if (input.where) params.where = input.where;

      const response = await this.client.get('/Accounts', { params });
      return { success: true, data: response.data.Accounts || [] };
    } catch (error) {
      return this.handleError(error, 'Failed to get accounts');
    }
  }

  // Credit Note methods
  private async createCreditNote(input: any): Promise<ConnectorResponse> {
    try {
      const response = await this.client.post('/CreditNotes', { CreditNotes: [input] });
      return { success: true, data: response.data.CreditNotes?.[0] };
    } catch (error) {
      return this.handleError(error, 'Failed to create credit note');
    }
  }

  private async getCreditNotes(input: any): Promise<ConnectorResponse> {
    try {
      const params: any = {};
      if (input.where) params.where = input.where;

      const response = await this.client.get('/CreditNotes', { params });
      return { success: true, data: response.data.CreditNotes || [] };
    } catch (error) {
      return this.handleError(error, 'Failed to get credit notes');
    }
  }
}
