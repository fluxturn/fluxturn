// Wise Connector Implementation
// International money transfers and multi-currency account management

import { Injectable } from '@nestjs/common';
import { createSign } from 'crypto';
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
import { WISE_CONNECTOR } from './wise.definition';

interface WiseCredentials {
  apiToken: string;
  environment?: 'live' | 'test';
  privateKey?: string;
}

@Injectable()
export class WiseConnector extends BaseConnector implements IFinanceConnector {
  private httpClient: AxiosInstance;
  private apiToken: string;
  private environment: string;
  private privateKey?: string;
  private baseUrl: string;

  getMetadata(): ConnectorMetadata {
    return {
      name: 'Wise',
      description: 'Send and receive international money transfers with multi-currency accounts',
      version: '1.0.0',
      category: ConnectorCategory.FINANCE,
      type: ConnectorType.WISE,
      authType: AuthType.API_KEY,
      actions: this.getActions(),
      triggers: this.getTriggers(),
      webhookSupport: true,
    };
  }

  private getActions(): ConnectorAction[] {
    return [
      // Account
      { id: 'get_balances', name: 'Get Account Balances', description: 'Retrieve balances for all account currencies', inputSchema: {}, outputSchema: {} },
      { id: 'get_currencies', name: 'Get Available Currencies', description: 'Retrieve currencies available in the borderless account', inputSchema: {}, outputSchema: {} },
      { id: 'get_statement', name: 'Get Account Statement', description: 'Retrieve account statement for a borderless account', inputSchema: {}, outputSchema: {} },

      // Exchange Rate
      { id: 'get_exchange_rate', name: 'Get Exchange Rate', description: 'Retrieve exchange rates between currencies', inputSchema: {}, outputSchema: {} },

      // Profile
      { id: 'get_profile', name: 'Get Profile', description: 'Retrieve a user profile by ID', inputSchema: {}, outputSchema: {} },
      { id: 'get_all_profiles', name: 'Get All Profiles', description: 'Retrieve all user profiles', inputSchema: {}, outputSchema: {} },

      // Quote
      { id: 'create_quote', name: 'Create Quote', description: 'Create a quote for a money transfer', inputSchema: {}, outputSchema: {} },
      { id: 'get_quote', name: 'Get Quote', description: 'Retrieve a quote by ID', inputSchema: {}, outputSchema: {} },

      // Recipient
      { id: 'get_all_recipients', name: 'Get All Recipients', description: 'Retrieve all recipient accounts', inputSchema: {}, outputSchema: {} },

      // Transfer
      { id: 'create_transfer', name: 'Create Transfer', description: 'Create a new money transfer', inputSchema: {}, outputSchema: {} },
      { id: 'get_transfer', name: 'Get Transfer', description: 'Retrieve a transfer by ID', inputSchema: {}, outputSchema: {} },
      { id: 'get_all_transfers', name: 'Get All Transfers', description: 'Retrieve all transfers for a profile', inputSchema: {}, outputSchema: {} },
      { id: 'execute_transfer', name: 'Execute Transfer', description: 'Execute a transfer to send funds', inputSchema: {}, outputSchema: {} },
      { id: 'cancel_transfer', name: 'Cancel Transfer', description: 'Cancel a pending transfer', inputSchema: {}, outputSchema: {} },
    ];
  }

  private getTriggers(): ConnectorTrigger[] {
    return [
      {
        id: 'transfer_state_change',
        name: 'Transfer State Changed',
        description: 'Triggers when a transfer status is updated',
        eventType: 'tranferStateChange',
        webhookRequired: true,
        inputSchema: {},
        outputSchema: {},
      },
      {
        id: 'transfer_active_cases',
        name: 'Transfer Active Cases',
        description: "Triggers when a transfer's list of active cases is updated",
        eventType: 'transferActiveCases',
        webhookRequired: true,
        inputSchema: {},
        outputSchema: {},
      },
      {
        id: 'balance_credit',
        name: 'Balance Credit',
        description: 'Triggers every time a balance account is credited',
        eventType: 'balanceCredit',
        webhookRequired: true,
        inputSchema: {},
        outputSchema: {},
      },
      {
        id: 'balance_update',
        name: 'Balance Update',
        description: 'Triggers every time a balance account is credited or debited',
        eventType: 'balanceUpdate',
        webhookRequired: true,
        inputSchema: {},
        outputSchema: {},
      },
    ];
  }

  protected async initializeConnection(): Promise<void> {
    const credentials = (this.config?.credentials || {}) as WiseCredentials;
    const { apiToken, environment = 'live', privateKey } = credentials;

    if (!apiToken) {
      throw new Error('API token is required');
    }

    this.apiToken = apiToken;
    this.environment = environment;
    this.privateKey = privateKey;

    // Set base URL based on environment
    this.baseUrl = environment === 'live'
      ? 'https://api.transferwise.com'
      : 'https://api.sandbox.transferwise.tech';

    this.httpClient = axios.create({
      baseURL: this.baseUrl,
      headers: {
        'Authorization': `Bearer ${this.apiToken}`,
        'Content-Type': 'application/json',
        'user-agent': 'fluxturn',
      },
    });

    this.logger.log(`Wise connector initialized (${environment} environment)`);
  }

  protected async performConnectionTest(): Promise<boolean> {
    try {
      const response = await this.httpClient.get('/v1/profiles');
      return response.status === 200;
    } catch (error) {
      this.logger.error(`Connection test failed: ${error.message}`);
      return false;
    }
  }

  protected async performHealthCheck(): Promise<void> {
    const isConnected = await this.performConnectionTest();
    if (!isConnected) {
      throw new Error('Wise health check failed');
    }
  }

  protected async performRequest(request: ConnectorRequest): Promise<any> {
    try {
      const response = await this.httpClient.request({
        method: request.method,
        url: request.endpoint,
        data: request.body,
        params: request.queryParams,
        headers: request.headers,
      });

      return response.data;
    } catch (error) {
      // Handle SCA (Strong Customer Authentication) requirement
      if (error.response?.status === 403 && error.response?.headers['x-2fa-approval']) {
        return await this.handleSCARequest(error.response, request);
      }

      throw error;
    }
  }

  private async handleSCARequest(response: any, originalRequest: ConnectorRequest): Promise<any> {
    if (!this.privateKey) {
      throw new Error(
        'This request requires Strong Customer Authentication (SCA). Please add a private key to your credentials. ' +
        'See https://api-docs.wise.com/#strong-customer-authentication-personal-token'
      );
    }

    try {
      // Sign the one-time token
      const oneTimeToken = response.headers['x-2fa-approval'] as string;
      const signerObject = createSign('RSA-SHA256').update(oneTimeToken);
      const signature = signerObject.sign(this.privateKey, 'base64');

      // Retry the request with signed token
      const retryResponse = await this.httpClient.request({
        method: originalRequest.method,
        url: originalRequest.endpoint,
        data: originalRequest.body,
        params: originalRequest.queryParams,
        headers: {
          ...originalRequest.headers,
          'X-Signature': signature,
          'x-2fa-approval': oneTimeToken,
        },
      });

      return retryResponse.data;
    } catch (error) {
      throw new Error('SCA request failed. Please check your private key is valid.');
    }
  }

  protected async performAction(actionId: string, input: any): Promise<any> {
    try {
      switch (actionId) {
        // ===== Account =====
        case 'get_balances':
          return await this.getBalancesAction(input);

        case 'get_currencies':
          return await this.getCurrenciesAction();

        case 'get_statement':
          return await this.getStatementAction(input);

        // ===== Exchange Rate =====
        case 'get_exchange_rate':
          return await this.getExchangeRateAction(input);

        // ===== Profile =====
        case 'get_profile':
          return await this.getProfileAction(input);

        case 'get_all_profiles':
          return await this.getAllProfilesAction();

        // ===== Quote =====
        case 'create_quote':
          return await this.createQuoteAction(input);

        case 'get_quote':
          return await this.getQuoteAction(input);

        // ===== Recipient =====
        case 'get_all_recipients':
          return await this.getAllRecipientsAction(input);

        // ===== Transfer =====
        case 'create_transfer':
          return await this.createTransferAction(input);

        case 'get_transfer':
          return await this.getTransferAction(input);

        case 'get_all_transfers':
          return await this.getAllTransfersAction(input);

        case 'execute_transfer':
          return await this.executeTransferAction(input);

        case 'cancel_transfer':
          return await this.cancelTransferAction(input);

        default:
          throw new Error(`Unknown action: ${actionId}`);
      }
    } catch (error) {
      this.logger.error(`Action ${actionId} failed: ${error.message}`);
      throw error;
    }
  }

  protected async cleanup(): Promise<void> {
    this.logger.log('Wise connector cleanup completed');
  }

  // ============= IFinanceConnector Interface Methods =============

  async getAccounts(): Promise<ConnectorResponse> {
    return {
      success: false,
      error: {
        code: 'PROFILE_ID_REQUIRED',
        message: 'Profile ID is required. Use executeAction with get_balances action.',
      },
    };
  }

  async getTransactions(accountId?: string, options?: PaginatedRequest): Promise<ConnectorResponse> {
    return {
      success: false,
      error: {
        code: 'USE_GET_STATEMENT',
        message: 'Use executeAction with get_statement action to retrieve transactions.',
      },
    };
  }

  async createInvoice(invoice: any): Promise<ConnectorResponse> {
    return {
      success: false,
      error: {
        code: 'NOT_SUPPORTED',
        message: 'Wise does not support invoice creation',
      },
    };
  }

  async processPayment(payment: any): Promise<ConnectorResponse> {
    return {
      success: false,
      error: {
        code: 'USE_TRANSFER',
        message: 'Use create_transfer and execute_transfer actions to process payments.',
      },
    };
  }

  async getReports(reportType: string, dateRange?: any): Promise<ConnectorResponse> {
    return {
      success: false,
      error: {
        code: 'USE_GET_STATEMENT',
        message: 'Use get_statement action for account reports.',
      },
    };
  }

  // ============= Action Implementations =============

  // Account Actions
  private async getBalancesAction(input: any): Promise<any> {
    const { profileId } = input;
    const response = await this.performRequest({
      method: 'GET',
      endpoint: '/v1/borderless-accounts',
      queryParams: { profileId },
    });
    return response;
  }

  private async getCurrenciesAction(): Promise<any> {
    const response = await this.performRequest({
      method: 'GET',
      endpoint: '/v1/borderless-accounts/balance-currencies',
    });
    return response;
  }

  private async getStatementAction(input: any): Promise<any> {
    const {
      profileId,
      borderlessAccountId,
      currency,
      format = 'json',
      intervalStart,
      intervalEnd,
      lineStyle,
    } = input;

    const endpoint = `/v3/profiles/${profileId}/borderless-accounts/${borderlessAccountId}/statement.${format}`;

    const queryParams: any = { currency };

    if (lineStyle) {
      queryParams.type = lineStyle;
    }

    // Set date range (default to last month if not provided)
    if (intervalStart && intervalEnd) {
      queryParams.intervalStart = intervalStart;
      queryParams.intervalEnd = intervalEnd;
    } else {
      const now = new Date();
      const lastMonth = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      queryParams.intervalStart = lastMonth.toISOString();
      queryParams.intervalEnd = now.toISOString();
    }

    const response = await this.performRequest({
      method: 'GET',
      endpoint,
      queryParams,
    });

    return response;
  }

  // Exchange Rate Actions
  private async getExchangeRateAction(input: any): Promise<any> {
    const { source, target, time, from, to, interval } = input;

    const queryParams: any = { source, target };

    if (interval) {
      queryParams.group = interval;
    }

    if (time) {
      queryParams.time = time;
    } else if (from && to) {
      queryParams.from = from;
      queryParams.to = to;
    } else {
      // Default to last month
      const now = new Date();
      const lastMonth = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      queryParams.from = lastMonth.toISOString();
      queryParams.to = now.toISOString();
    }

    const response = await this.performRequest({
      method: 'GET',
      endpoint: '/v1/rates',
      queryParams,
    });

    return response;
  }

  // Profile Actions
  private async getProfileAction(input: any): Promise<any> {
    const { profileId } = input;
    const response = await this.performRequest({
      method: 'GET',
      endpoint: `/v1/profiles/${profileId}`,
    });
    return response;
  }

  private async getAllProfilesAction(): Promise<any> {
    const response = await this.performRequest({
      method: 'GET',
      endpoint: '/v1/profiles',
    });
    return response;
  }

  // Quote Actions
  private async createQuoteAction(input: any): Promise<any> {
    const { profileId, sourceCurrency, targetCurrency, amountType, amount } = input;

    const body: any = {
      profile: profileId,
      sourceCurrency: sourceCurrency.toUpperCase(),
      targetCurrency: targetCurrency.toUpperCase(),
    };

    if (amountType === 'source') {
      body.sourceAmount = amount;
    } else {
      body.targetAmount = amount;
    }

    const response = await this.performRequest({
      method: 'POST',
      endpoint: '/v2/quotes',
      body,
    });

    return response;
  }

  private async getQuoteAction(input: any): Promise<any> {
    const { quoteId } = input;
    const response = await this.performRequest({
      method: 'GET',
      endpoint: `/v2/quotes/${quoteId}`,
    });
    return response;
  }

  // Recipient Actions
  private async getAllRecipientsAction(input: any): Promise<any> {
    const queryParams: any = {};

    if (input.profileId) {
      queryParams.profileId = input.profileId;
    }

    const response = await this.performRequest({
      method: 'GET',
      endpoint: '/v1/accounts',
      queryParams,
    });

    // Apply limit if specified
    if (input.limit && Array.isArray(response)) {
      return response.slice(0, input.limit);
    }

    return response;
  }

  // Transfer Actions
  private async createTransferAction(input: any): Promise<any> {
    const { quoteId, targetAccountId, reference } = input;

    // Generate unique transaction ID
    const customerTransactionId = this.generateUUID();

    const body: any = {
      quoteUuid: quoteId,
      targetAccount: targetAccountId,
      customerTransactionId,
    };

    if (reference) {
      body.details = { reference };
    }

    const response = await this.performRequest({
      method: 'POST',
      endpoint: '/v1/transfers',
      body,
    });

    return response;
  }

  private async getTransferAction(input: any): Promise<any> {
    const { transferId } = input;
    const response = await this.performRequest({
      method: 'GET',
      endpoint: `/v1/transfers/${transferId}`,
    });
    return response;
  }

  private async getAllTransfersAction(input: any): Promise<any> {
    const {
      profileId,
      limit,
      offset,
      status,
      sourceCurrency,
      targetCurrency,
      createdDateStart,
      createdDateEnd,
    } = input;

    const queryParams: any = {
      profile: profileId,
    };

    if (limit) queryParams.limit = limit;
    if (offset) queryParams.offset = offset;
    if (status) queryParams.status = status;
    if (sourceCurrency) queryParams.sourceCurrency = sourceCurrency;
    if (targetCurrency) queryParams.targetCurrency = targetCurrency;

    // Set date range (default to last month if not provided)
    if (createdDateStart && createdDateEnd) {
      queryParams.createdDateStart = createdDateStart;
      queryParams.createdDateEnd = createdDateEnd;
    } else {
      const now = new Date();
      const lastMonth = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      queryParams.createdDateStart = lastMonth.toISOString();
      queryParams.createdDateEnd = now.toISOString();
    }

    const response = await this.performRequest({
      method: 'GET',
      endpoint: '/v1/transfers',
      queryParams,
    });

    return response;
  }

  private async executeTransferAction(input: any): Promise<any> {
    const { profileId, transferId } = input;

    const endpoint = `/v3/profiles/${profileId}/transfers/${transferId}/payments`;

    const response = await this.performRequest({
      method: 'POST',
      endpoint,
      body: { type: 'BALANCE' },
    });

    // In sandbox/test environment, simulate transfer completion
    if (this.environment === 'test') {
      await this.simulateTransferCompletion(transferId);
    }

    return response;
  }

  private async cancelTransferAction(input: any): Promise<any> {
    const { transferId } = input;
    const response = await this.performRequest({
      method: 'PUT',
      endpoint: `/v1/transfers/${transferId}/cancel`,
    });
    return response;
  }

  // Helper Methods
  private async simulateTransferCompletion(transferId: string): Promise<void> {
    try {
      const testEndpoints = [
        'processing',
        'funds_converted',
        'outgoing_payment_sent',
      ];

      for (const endpoint of testEndpoints) {
        await this.performRequest({
          method: 'GET',
          endpoint: `/v1/simulation/transfers/${transferId}/${endpoint}`,
        });
      }
    } catch (error) {
      this.logger.warn(`Simulation endpoints failed: ${error.message}`);
    }
  }

  private generateUUID(): string {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
      const r = (Math.random() * 16) | 0;
      const v = c === 'x' ? r : (r & 0x3) | 0x8;
      return v.toString(16);
    });
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
          code: errorData.error_code || 'WISE_ERROR',
          message: errorData.error_message || error.message,
          details: errorData,
        },
      };
    }
  }
}
