// Plaid Connector Implementation
// Comprehensive financial data API connector

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
import { PLAID_CONNECTOR } from './plaid.definition';

interface PlaidCredentials {
  client_id: string;
  secret: string;
  environment?: 'sandbox' | 'development' | 'production';
}

@Injectable()
export class PlaidConnector extends BaseConnector implements IFinanceConnector {
  private httpClient: AxiosInstance;
  private clientId: string;
  private secret: string;
  private environment: string;
  private baseUrl: string;

  getMetadata(): ConnectorMetadata {
    return {
      name: 'Plaid',
      description: 'Connect to bank accounts and retrieve financial data including transactions, balances, identity, and account verification.',
      version: '1.0.0',
      category: ConnectorCategory.FINANCE,
      type: ConnectorType.PLAID,
      authType: AuthType.API_KEY,
      actions: this.getActions(),
      triggers: this.getTriggers(),
      webhookSupport: true,
    };
  }

  private getActions(): ConnectorAction[] {
    return [
      // Accounts
      { id: 'get_accounts', name: 'Get Accounts', description: 'Retrieve all bank accounts linked to an Item', inputSchema: {}, outputSchema: {} },
      { id: 'get_balance', name: 'Get Account Balance', description: 'Get real-time balance information for accounts', inputSchema: {}, outputSchema: {} },
      // Auth
      { id: 'get_auth', name: 'Get Auth (Account Numbers)', description: 'Retrieve account and routing numbers for ACH transfers', inputSchema: {}, outputSchema: {} },
      // Identity
      { id: 'get_identity', name: 'Get Identity', description: 'Retrieve account holder identity information', inputSchema: {}, outputSchema: {} },
      // Transactions
      { id: 'get_transactions', name: 'Get Transactions', description: 'Retrieve transactions for a date range', inputSchema: {}, outputSchema: {} },
      { id: 'sync_transactions', name: 'Sync Transactions', description: 'Get incremental transaction updates using cursor-based pagination', inputSchema: {}, outputSchema: {} },
      { id: 'refresh_transactions', name: 'Refresh Transactions', description: 'Force a refresh of transaction data', inputSchema: {}, outputSchema: {} },
      { id: 'get_recurring_transactions', name: 'Get Recurring Transactions', description: 'Retrieve recurring transaction patterns', inputSchema: {}, outputSchema: {} },
      // Items
      { id: 'get_item', name: 'Get Item', description: 'Retrieve Item status and metadata', inputSchema: {}, outputSchema: {} },
      { id: 'remove_item', name: 'Remove Item', description: 'Delete an Item and invalidate its access token', inputSchema: {}, outputSchema: {} },
      { id: 'update_item_webhook', name: 'Update Item Webhook', description: 'Update the webhook URL for an Item', inputSchema: {}, outputSchema: {} },
      // Link
      { id: 'create_link_token', name: 'Create Link Token', description: 'Create a Link token for initializing Plaid Link', inputSchema: {}, outputSchema: {} },
      { id: 'exchange_public_token', name: 'Exchange Public Token', description: 'Exchange a public token for an access token', inputSchema: {}, outputSchema: {} },
      // Institutions
      { id: 'get_institutions', name: 'Get Institutions', description: 'Search for institutions supported by Plaid', inputSchema: {}, outputSchema: {} },
      { id: 'get_institution_by_id', name: 'Get Institution by ID', description: 'Get details for a specific institution', inputSchema: {}, outputSchema: {} },
      // Categories
      { id: 'get_categories', name: 'Get Categories', description: 'Get all transaction categories', inputSchema: {}, outputSchema: {} },
    ];
  }

  private getTriggers(): ConnectorTrigger[] {
    return [
      { id: 'transactions_sync_updates', name: 'Transaction Updates Available', description: 'Triggers when new transaction data is available', eventType: 'TRANSACTIONS.SYNC_UPDATES_AVAILABLE', webhookRequired: true, outputSchema: {} },
      { id: 'transactions_initial_update', name: 'Initial Transactions Ready', description: 'Triggers when initial transaction pull is complete', eventType: 'TRANSACTIONS.INITIAL_UPDATE', webhookRequired: true, outputSchema: {} },
      { id: 'transactions_historical_update', name: 'Historical Transactions Ready', description: 'Triggers when historical transaction data is ready', eventType: 'TRANSACTIONS.HISTORICAL_UPDATE', webhookRequired: true, outputSchema: {} },
      { id: 'transactions_default_update', name: 'New Transactions', description: 'Triggers when new transactions are detected', eventType: 'TRANSACTIONS.DEFAULT_UPDATE', webhookRequired: true, outputSchema: {} },
      { id: 'transactions_removed', name: 'Transactions Removed', description: 'Triggers when transactions are removed', eventType: 'TRANSACTIONS.TRANSACTIONS_REMOVED', webhookRequired: true, outputSchema: {} },
      { id: 'item_error', name: 'Item Error', description: 'Triggers when an error occurs with an Item', eventType: 'ITEM.ERROR', webhookRequired: true, outputSchema: {} },
      { id: 'item_pending_expiration', name: 'Item Pending Expiration', description: 'Triggers when Item access is about to expire', eventType: 'ITEM.PENDING_EXPIRATION', webhookRequired: true, outputSchema: {} },
      { id: 'item_user_permission_revoked', name: 'User Permission Revoked', description: 'Triggers when user revokes permission', eventType: 'ITEM.USER_PERMISSION_REVOKED', webhookRequired: true, outputSchema: {} },
      { id: 'auth_automatically_verified', name: 'Auth Automatically Verified', description: 'Triggers when account numbers are automatically verified', eventType: 'AUTH.AUTOMATICALLY_VERIFIED', webhookRequired: true, outputSchema: {} },
      { id: 'auth_verification_expired', name: 'Auth Verification Expired', description: 'Triggers when auth verification expires', eventType: 'AUTH.VERIFICATION_EXPIRED', webhookRequired: true, outputSchema: {} },
    ];
  }

  protected async initializeConnection(): Promise<void> {
    const credentials = (this.config?.credentials || {}) as PlaidCredentials;
    const { client_id, secret, environment = 'sandbox' } = credentials;

    // Store credentials if provided (some actions like get_categories don't need them)
    this.clientId = client_id || '';
    this.secret = secret || '';
    this.environment = environment;

    // Set base URL based on environment
    switch (environment) {
      case 'production':
        this.baseUrl = 'https://production.plaid.com';
        break;
      case 'development':
        this.baseUrl = 'https://development.plaid.com';
        break;
      default:
        this.baseUrl = 'https://sandbox.plaid.com';
    }

    this.httpClient = axios.create({
      baseURL: this.baseUrl,
      headers: { 'Content-Type': 'application/json' },
    });

    this.logger.log(`Plaid connector initialized (${environment} environment, credentials: ${client_id ? 'yes' : 'no'})`);
  }

  // Helper to check if credentials are available
  private requireCredentials(): void {
    if (!this.clientId || !this.secret) {
      throw new Error('Plaid client_id and secret are required for this action');
    }
  }

  async initialize(config: ConnectorConfig): Promise<void> {
    this.config = config;
    await this.initializeConnection();
  }

  protected async performConnectionTest(): Promise<boolean> {
    try {
      // If no credentials, test with public categories endpoint
      if (!this.clientId || !this.secret) {
        const response = await this.httpClient.post('/categories/get', {});
        return response.status === 200;
      }

      // Test with institutions endpoint (requires credentials but not access_token)
      const response = await this.httpClient.post('/institutions/get', {
        client_id: this.clientId,
        secret: this.secret,
        count: 1,
        offset: 0,
        country_codes: ['US'],
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
      throw new Error('Plaid health check failed');
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
      // get_categories is a public endpoint that doesn't require credentials
      if (actionId === 'get_categories') {
        return await this.getCategoriesAction();
      }

      // All other actions require credentials
      this.requireCredentials();

      const requestBody = {
        client_id: this.clientId,
        secret: this.secret,
        ...input,
      };

      switch (actionId) {
        // ===== Accounts =====
        case 'get_accounts':
          return await this.getAccountsAction(requestBody);

        case 'get_balance':
          return await this.getBalanceAction(requestBody);

        // ===== Auth =====
        case 'get_auth':
          return await this.getAuthAction(requestBody);

        // ===== Identity =====
        case 'get_identity':
          return await this.getIdentityAction(requestBody);

        // ===== Transactions =====
        case 'get_transactions':
          return await this.getTransactionsAction(requestBody);

        case 'sync_transactions':
          return await this.syncTransactionsAction(requestBody);

        case 'refresh_transactions':
          return await this.refreshTransactionsAction(requestBody);

        case 'get_recurring_transactions':
          return await this.getRecurringTransactionsAction(requestBody);

        // ===== Items =====
        case 'get_item':
          return await this.getItemAction(requestBody);

        case 'remove_item':
          return await this.removeItemAction(requestBody);

        case 'update_item_webhook':
          return await this.updateItemWebhookAction(requestBody);

        // ===== Link =====
        case 'create_link_token':
          return await this.createLinkTokenAction(requestBody, input);

        case 'exchange_public_token':
          return await this.exchangePublicTokenAction(requestBody);

        // ===== Institutions =====
        case 'get_institutions':
          return await this.getInstitutionsAction(requestBody);

        case 'get_institution_by_id':
          return await this.getInstitutionByIdAction(requestBody);

        default:
          throw new Error(`Unknown action: ${actionId}`);
      }
    } catch (error) {
      this.logger.error(`Action ${actionId} failed: ${error.message}`);
      throw error;
    }
  }

  protected async cleanup(): Promise<void> {
    this.logger.log('Plaid connector cleanup completed');
  }

  // ============= IFinanceConnector Interface Methods =============

  async getAccounts(): Promise<ConnectorResponse> {
    return {
      success: false,
      error: {
        code: 'ACCESS_TOKEN_REQUIRED',
        message: 'Access token is required. Use executeAction with get_accounts action.',
      },
    };
  }

  async getTransactions(accountId?: string, options?: PaginatedRequest): Promise<ConnectorResponse> {
    return {
      success: false,
      error: {
        code: 'ACCESS_TOKEN_REQUIRED',
        message: 'Access token is required. Use executeAction with get_transactions action.',
      },
    };
  }

  async createInvoice(invoice: any): Promise<ConnectorResponse> {
    return {
      success: false,
      error: {
        code: 'NOT_SUPPORTED',
        message: 'Plaid does not support invoice creation',
      },
    };
  }

  async processPayment(payment: any): Promise<ConnectorResponse> {
    return {
      success: false,
      error: {
        code: 'NOT_SUPPORTED',
        message: 'Plaid does not directly process payments. Use the Transfer API for ACH transfers.',
      },
    };
  }

  async getReports(reportType: string, dateRange?: any): Promise<ConnectorResponse> {
    return {
      success: false,
      error: {
        code: 'NOT_SUPPORTED',
        message: 'Use specific actions like get_transactions or get_recurring_transactions for reports.',
      },
    };
  }

  // ============= Action Implementations =============

  private async getAccountsAction(body: any): Promise<any> {
    const response = await this.httpClient.post('/accounts/get', {
      client_id: this.clientId,
      secret: this.secret,
      access_token: body.access_token,
      options: body.account_ids ? { account_ids: body.account_ids } : undefined,
    });
    return response.data;
  }

  private async getBalanceAction(body: any): Promise<any> {
    const response = await this.httpClient.post('/accounts/balance/get', {
      client_id: this.clientId,
      secret: this.secret,
      access_token: body.access_token,
      options: body.account_ids ? { account_ids: body.account_ids } : undefined,
    });
    return response.data;
  }

  private async getAuthAction(body: any): Promise<any> {
    const response = await this.httpClient.post('/auth/get', {
      client_id: this.clientId,
      secret: this.secret,
      access_token: body.access_token,
      options: body.account_ids ? { account_ids: body.account_ids } : undefined,
    });
    return response.data;
  }

  private async getIdentityAction(body: any): Promise<any> {
    const response = await this.httpClient.post('/identity/get', {
      client_id: this.clientId,
      secret: this.secret,
      access_token: body.access_token,
      options: body.account_ids ? { account_ids: body.account_ids } : undefined,
    });
    return response.data;
  }

  private async getTransactionsAction(body: any): Promise<any> {
    const requestData: any = {
      client_id: this.clientId,
      secret: this.secret,
      access_token: body.access_token,
      start_date: body.start_date,
      end_date: body.end_date,
    };

    // Add options if provided
    const options: any = {};
    if (body.account_ids) options.account_ids = body.account_ids;
    if (body.count) options.count = body.count;
    if (body.offset) options.offset = body.offset;
    if (Object.keys(options).length > 0) {
      requestData.options = options;
    }

    const response = await this.httpClient.post('/transactions/get', requestData);
    return response.data;
  }

  private async syncTransactionsAction(body: any): Promise<any> {
    const requestData: any = {
      client_id: this.clientId,
      secret: this.secret,
      access_token: body.access_token,
    };

    if (body.cursor) requestData.cursor = body.cursor;
    if (body.count) requestData.count = body.count;

    const response = await this.httpClient.post('/transactions/sync', requestData);
    return response.data;
  }

  private async refreshTransactionsAction(body: any): Promise<any> {
    const response = await this.httpClient.post('/transactions/refresh', {
      client_id: this.clientId,
      secret: this.secret,
      access_token: body.access_token,
    });
    return response.data;
  }

  private async getRecurringTransactionsAction(body: any): Promise<any> {
    const requestData: any = {
      client_id: this.clientId,
      secret: this.secret,
      access_token: body.access_token,
    };

    if (body.account_ids) {
      requestData.options = { account_ids: body.account_ids };
    }

    const response = await this.httpClient.post('/transactions/recurring/get', requestData);
    return response.data;
  }

  private async getItemAction(body: any): Promise<any> {
    const response = await this.httpClient.post('/item/get', {
      client_id: this.clientId,
      secret: this.secret,
      access_token: body.access_token,
    });
    return response.data;
  }

  private async removeItemAction(body: any): Promise<any> {
    const response = await this.httpClient.post('/item/remove', {
      client_id: this.clientId,
      secret: this.secret,
      access_token: body.access_token,
    });
    return response.data;
  }

  private async updateItemWebhookAction(body: any): Promise<any> {
    const response = await this.httpClient.post('/item/webhook/update', {
      client_id: this.clientId,
      secret: this.secret,
      access_token: body.access_token,
      webhook: body.webhook,
    });
    return response.data;
  }

  private async createLinkTokenAction(body: any, input: any): Promise<any> {
    const requestData: any = {
      client_id: this.clientId,
      secret: this.secret,
      client_name: 'Fluxturn',
      user: {
        client_user_id: input.user_client_user_id || body.user_client_user_id,
      },
      products: input.products || body.products || ['transactions'],
      country_codes: input.country_codes || body.country_codes || ['US'],
      language: input.language || body.language || 'en',
    };

    // Optional parameters
    if (input.webhook || body.webhook) {
      requestData.webhook = input.webhook || body.webhook;
    }
    if (input.redirect_uri || body.redirect_uri) {
      requestData.redirect_uri = input.redirect_uri || body.redirect_uri;
    }
    if (input.access_token || body.access_token) {
      // Update mode - link existing item
      requestData.access_token = input.access_token || body.access_token;
    }

    const response = await this.httpClient.post('/link/token/create', requestData);
    return response.data;
  }

  private async exchangePublicTokenAction(body: any): Promise<any> {
    const response = await this.httpClient.post('/item/public_token/exchange', {
      client_id: this.clientId,
      secret: this.secret,
      public_token: body.public_token,
    });
    return response.data;
  }

  private async getInstitutionsAction(body: any): Promise<any> {
    const response = await this.httpClient.post('/institutions/get', {
      client_id: this.clientId,
      secret: this.secret,
      count: body.count || 10,
      offset: body.offset || 0,
      country_codes: body.country_codes || ['US'],
    });
    return response.data;
  }

  private async getInstitutionByIdAction(body: any): Promise<any> {
    const response = await this.httpClient.post('/institutions/get_by_id', {
      client_id: this.clientId,
      secret: this.secret,
      institution_id: body.institution_id,
      country_codes: body.country_codes || ['US'],
    });
    return response.data;
  }

  private async getCategoriesAction(): Promise<any> {
    const response = await this.httpClient.post('/categories/get', {});
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
          code: errorData.error_code || 'PLAID_ERROR',
          message: errorData.error_message || error.message,
          details: errorData,
        },
      };
    }
  }
}
