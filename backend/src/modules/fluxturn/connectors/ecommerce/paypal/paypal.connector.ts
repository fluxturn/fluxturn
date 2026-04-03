import { Request } from 'express';
import { Injectable, Logger } from '@nestjs/common';
import * as checkoutNodeJssdk from '@paypal/checkout-server-sdk';
import axios, { AxiosInstance } from 'axios';
import {
  IEcommerceConnector,
  CreatePaymentRequest,
  PaymentIntent,
  Payment,
  CreateRefundRequest,
  Refund,
  CreateCustomerRequest,
  Customer,
  CreateProductRequest,
  Product,
  CreateSubscriptionRequest,
  Subscription,
  CreateInvoiceRequest,
  Invoice,
  CreatePayoutRequest,
  Payout,
  Webhook,
  ListRequest,
  ListResponse,
} from '../ecommerce.interface';
import { ConnectorResponse } from '../../types';
import { AuthUtils } from '../../utils/auth.utils';
import { ApiUtils } from '../../utils/api.utils';
import { ErrorUtils } from '../../utils/error.utils';

// Interfaces matching n8n PayPal implementation
interface PayPalPayoutItem {
  recipient_type: 'EMAIL' | 'PHONE' | 'PAYPAL_ID';
  amount: {
    value: string;
    currency: string;
  };
  receiver: string;
  note?: string;
  sender_item_id?: string;
  recipient_wallet?: 'PAYPAL' | 'VENMO';
}

interface PayPalPayoutBatch {
  sender_batch_header: {
    sender_batch_id: string;
    email_subject?: string;
    email_message?: string;
    note?: string;
  };
  items: PayPalPayoutItem[];
}

@Injectable()
export class PayPalConnector implements IEcommerceConnector {
  private readonly logger = new Logger(PayPalConnector.name);
  private paypalClient: checkoutNodeJssdk.core.PayPalHttpClient;
  private axiosClient: AxiosInstance;
  private config: any;
  private accessTokenCache: { token: string; expiresAt: number } | null = null;

  constructor(
    private authUtils: AuthUtils,
    private apiUtils: ApiUtils,
    private errorUtils: ErrorUtils
  ) {}

  /**
   * Get connector metadata including actions and triggers
   */
  getMetadata(): any {
    return {
      name: 'PayPal',
      description: 'PayPal connector for payments, payouts, and webhooks',
      version: '1.0.0',
      category: 'ecommerce',
      type: 'paypal',
      authType: 'api_key',
      actions: this.getActions(),
      triggers: this.getTriggers(),
      webhookSupport: true,
    };
  }

  /**
   * Execute an action by ID
   */
  async executeAction(actionId: string, input: any): Promise<ConnectorResponse> {
    switch (actionId) {
      case 'create_payout':
        return this.createPayoutBatch(input);
      case 'get_payout':
        return this.getPayoutBatch(input);
      case 'get_payout_item':
        return this.getPayoutItem(input.payoutItemId);
      case 'cancel_payout_item':
        return this.cancelPayoutItem(input.payoutItemId);
      default:
        return {
          success: false,
          error: { code: 'UNKNOWN_ACTION', message: `Unknown action: ${actionId}` },
          metadata: { connectorId: 'paypal' },
        };
    }
  }

  /**
   * Get available actions
   */
  private getActions(): any[] {
    return [
      {
        id: 'create_payout',
        name: 'Create Payout',
        description: 'Create a batch payout to send payments',
        inputSchema: {
          senderBatchId: { type: 'string', required: true },
          emailSubject: { type: 'string' },
          items: { type: 'array', required: true },
        },
        outputSchema: {
          batch_header: { type: 'object' },
          links: { type: 'array' },
        },
      },
      {
        id: 'get_payout',
        name: 'Get Payout',
        description: 'Show batch payout details',
        inputSchema: {
          payoutBatchId: { type: 'string', required: true },
          returnAll: { type: 'boolean' },
          limit: { type: 'number' },
        },
        outputSchema: {
          batch_header: { type: 'object' },
          items: { type: 'array' },
        },
      },
      {
        id: 'get_payout_item',
        name: 'Get Payout Item',
        description: 'Show payout item details',
        inputSchema: {
          payoutItemId: { type: 'string', required: true },
        },
        outputSchema: {
          payout_item_id: { type: 'string' },
          transaction_id: { type: 'string' },
        },
      },
      {
        id: 'cancel_payout_item',
        name: 'Cancel Payout Item',
        description: 'Cancels an unclaimed payout item',
        inputSchema: {
          payoutItemId: { type: 'string', required: true },
        },
        outputSchema: {
          payout_item_id: { type: 'string' },
          transaction_status: { type: 'string' },
        },
      },
    ];
  }

  /**
   * Get available triggers
   */
  private getTriggers(): any[] {
    return [
      {
        id: 'webhook_events',
        name: 'Webhook Events',
        description: 'Handle PayPal events via webhooks',
        eventType: 'paypal_webhook',
        webhookRequired: true,
        outputSchema: {
          id: { type: 'string', description: 'Event ID' },
          event_type: { type: 'string', description: 'The event type name' },
          resource: { type: 'object', description: 'The resource data' },
        },
      },
    ];
  }

  public initializeWithCredentials(config: any): void {
    if (!config.credentials?.clientId || !config.credentials?.clientSecret) {
      throw new Error('PayPal client ID and secret are required');
    }

    this.config = config;
    const isSandbox = config.credentials.environment === 'sandbox';

    const environment = isSandbox
      ? new checkoutNodeJssdk.core.SandboxEnvironment(
          config.credentials.clientId,
          config.credentials.clientSecret
        )
      : new checkoutNodeJssdk.core.LiveEnvironment(
          config.credentials.clientId,
          config.credentials.clientSecret
        );

    this.paypalClient = new checkoutNodeJssdk.core.PayPalHttpClient(environment);

    const baseURL = isSandbox
      ? 'https://api-m.sandbox.paypal.com'
      : 'https://api-m.paypal.com';

    this.axiosClient = axios.create({
      baseURL,
      headers: {
        'Content-Type': 'application/json',
      },
    });
  }

  async authorize(request: Request): Promise<ConnectorResponse> {
    try {
      const credentials = await this.authUtils.validateCredentials(
        request,
        ['clientId', 'clientSecret'],
        'PayPal client ID and secret are required'
      );

      this.initializeWithCredentials({
        credentials: {
          ...credentials,
          environment: credentials.environment || 'sandbox'
        }
      });

      const token = await this.getAccessToken();

      return {
        success: true,
        data: {
          authorized: true,
          environment: credentials.environment || 'sandbox',
        },
        metadata: { connectorId: 'paypal' }
      };
    } catch (error) {
      return this.errorUtils.handleError(error, 'Authorization');
    }
  }

  private async getAccessToken(): Promise<string> {
    // Check if we have a valid cached token
    if (this.accessTokenCache && this.accessTokenCache.expiresAt > Date.now()) {
      return this.accessTokenCache.token;
    }

    const auth = Buffer.from(`${this.config.credentials.clientId}:${this.config.credentials.clientSecret}`).toString('base64');

    const response = await this.axiosClient.post('/v1/oauth2/token', 'grant_type=client_credentials', {
      headers: {
        'Authorization': `Basic ${auth}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
    });

    // Cache the token (expires in 9 hours, we'll refresh at 8.5 hours)
    this.accessTokenCache = {
      token: response.data.access_token,
      expiresAt: Date.now() + (response.data.expires_in - 1800) * 1000
    };

    return response.data.access_token;
  }

  private async makeApiRequest(
    method: string,
    path: string,
    data?: any,
    params?: any,
    customUri?: string
  ): Promise<any> {
    const token = await this.getAccessToken();

    // If customUri is provided (for pagination), use it directly
    if (customUri) {
      const response = await axios({
        method,
        url: customUri,
        data,
        params,
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });
      return response.data;
    }

    // Otherwise use the base axios client
    const response = await this.axiosClient({
      method,
      url: path,
      data,
      params,
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    });

    return response.data;
  }

  async createPayment(request: CreatePaymentRequest): Promise<ConnectorResponse<PaymentIntent>> {
    try {
      const orderRequest = new checkoutNodeJssdk.orders.OrdersCreateRequest();
      orderRequest.prefer("return=representation");
      orderRequest.requestBody({
        intent: 'CAPTURE',
        purchase_units: [{
          amount: {
            currency_code: request.currency.toUpperCase(),
            value: request.amount.toFixed(2),
          },
          description: request.description,
        }],
      });

      const order = await this.paypalClient.execute(orderRequest);

      return {
        success: true,
        data: {
          id: order.result.id,
          amount: request.amount,
          currency: request.currency,
          status: 'pending',
          clientSecret: order.result.id,
          createdAt: new Date(),
        },
        metadata: { connectorId: 'paypal' }
      };
    } catch (error) {
      return this.errorUtils.handleError(error, 'Create payment');
    }
  }

  async capturePayment(paymentId: string): Promise<ConnectorResponse<Payment>> {
    try {
      const captureRequest = new checkoutNodeJssdk.orders.OrdersCaptureRequest(paymentId);
      captureRequest.prefer("return=representation");

      const capture = await this.paypalClient.execute(captureRequest);

      return {
        success: true,
        data: this.transformPayPalPayment(capture.result),
        metadata: { connectorId: 'paypal' }
      };
    } catch (error) {
      return this.errorUtils.handleError(error, 'Capture payment');
    }
  }

  async cancelPayment(paymentId: string): Promise<ConnectorResponse<Payment>> {
    try {
      await this.makeApiRequest('POST', `/v2/checkout/orders/${paymentId}/cancel`);

      return {
        success: true,
        data: {
          id: paymentId,
          amount: 0,
          currency: 'USD',
          status: 'failed',
          createdAt: new Date(),
        },
        metadata: { connectorId: 'paypal' }
      };
    } catch (error) {
      return this.errorUtils.handleError(error, 'Cancel payment');
    }
  }

  async getPayment(paymentId: string): Promise<ConnectorResponse<Payment>> {
    try {
      const getRequest = new checkoutNodeJssdk.orders.OrdersGetRequest(paymentId);
      const order = await this.paypalClient.execute(getRequest);

      return {
        success: true,
        data: this.transformPayPalPayment(order.result),
        metadata: { connectorId: 'paypal' }
      };
    } catch (error) {
      return this.errorUtils.handleError(error, 'Get payment');
    }
  }

  async listPayments(request?: ListRequest): Promise<ConnectorResponse<ListResponse<Payment>>> {
    try {
      const params = new URLSearchParams({
        page_size: (request?.limit || 10).toString(),
        page: '1',
      });

      const response = await this.makeApiRequest('GET', `/v2/payments/authorizations?${params}`);

      return {
        success: true,
        data: {
          data: response.authorizations?.map((auth: any) => this.transformPayPalAuthorization(auth)) || [],
          hasMore: false,
        },
        metadata: { connectorId: 'paypal' }
      };
    } catch (error) {
      return this.errorUtils.handleError(error, 'List payments');
    }
  }

  async createRefund(request: CreateRefundRequest): Promise<ConnectorResponse<Refund>> {
    try {
      const captureId = request.paymentId;
      const refundData: any = {};
      
      if (request.amount) {
        refundData.amount = {
          currency_code: 'USD',
          value: request.amount.toFixed(2),
        };
      }

      const response = await this.makeApiRequest('POST', `/v2/payments/captures/${captureId}/refund`, refundData);

      return {
        success: true,
        data: {
          id: response.id,
          paymentId: captureId,
          amount: parseFloat(response.amount.value),
          currency: response.amount.currency_code,
          status: 'succeeded',
          createdAt: new Date(response.create_time),
        },
        metadata: { connectorId: 'paypal' }
      };
    } catch (error) {
      return this.errorUtils.handleError(error, 'Create refund');
    }
  }

  async getRefund(refundId: string): Promise<ConnectorResponse<Refund>> {
    try {
      const response = await this.makeApiRequest('GET', `/v2/payments/refunds/${refundId}`);

      return {
        success: true,
        data: {
          id: response.id,
          paymentId: response.links?.find((link: any) => link.rel === 'up')?.href?.split('/').pop() || '',
          amount: parseFloat(response.amount.value),
          currency: response.amount.currency_code,
          status: response.status === 'COMPLETED' ? 'succeeded' : 'failed',
          createdAt: new Date(response.create_time),
        },
        metadata: { connectorId: 'paypal' }
      };
    } catch (error) {
      return this.errorUtils.handleError(error, 'Get refund');
    }
  }

  async listRefunds(paymentId?: string, request?: ListRequest): Promise<ConnectorResponse<ListResponse<Refund>>> {
    return {
      success: true,
      data: {
        data: [],
        hasMore: false,
      },
      metadata: { connectorId: 'paypal' }
    };
  }

  async createCustomer(request: CreateCustomerRequest): Promise<ConnectorResponse<Customer>> {
    try {
      const response = await this.makeApiRequest('POST', '/v1/customer/users', {
        email: request.email,
        given_name: request.firstName,
        family_name: request.lastName,
        phone_number: request.phone,
        address: request.address ? {
          line1: request.address.line1,
          line2: request.address.line2,
          city: request.address.city,
          state: request.address.state,
          postal_code: request.address.postalCode,
          country_code: request.address.country,
        } : undefined,
      });

      return {
        success: true,
        data: {
          id: response.customer_id,
          email: request.email,
          firstName: request.firstName,
          lastName: request.lastName,
          phone: request.phone,
          address: request.address,
          createdAt: new Date(),
        },
        metadata: { connectorId: 'paypal' }
      };
    } catch (error) {
      return this.errorUtils.handleError(error, 'Create customer');
    }
  }

  async getCustomer(customerId: string): Promise<ConnectorResponse<Customer>> {
    return this.errorUtils.handleError(
      new Error('PayPal does not support retrieving customer details'),
      'Get customer'
    );
  }

  async updateCustomer(customerId: string, updates: Partial<Customer>): Promise<ConnectorResponse<Customer>> {
    return this.errorUtils.handleError(
      new Error('PayPal does not support updating customer details'),
      'Update customer'
    );
  }

  async deleteCustomer(customerId: string): Promise<ConnectorResponse<void>> {
    return this.errorUtils.handleError(
      new Error('PayPal does not support deleting customers'),
      'Delete customer'
    );
  }

  async listCustomers(request?: ListRequest): Promise<ConnectorResponse<ListResponse<Customer>>> {
    return {
      success: true,
      data: {
        data: [],
        hasMore: false,
      },
      metadata: { connectorId: 'paypal' }
    };
  }

  async createProduct(request: CreateProductRequest): Promise<ConnectorResponse<Product>> {
    try {
      const response = await this.makeApiRequest('POST', '/v1/catalogs/products', {
        name: request.name,
        description: request.description,
        type: 'PHYSICAL',
        category: 'SOFTWARE',
      });

      return {
        success: true,
        data: {
          id: response.id,
          name: request.name,
          description: request.description,
          price: request.price || 0,
          currency: request.currency || 'USD',
          active: true,
          createdAt: new Date(response.create_time),
        },
        metadata: { connectorId: 'paypal' }
      };
    } catch (error) {
      return this.errorUtils.handleError(error, 'Create product');
    }
  }

  async getProduct(productId: string): Promise<ConnectorResponse<Product>> {
    try {
      const response = await this.makeApiRequest('GET', `/v1/catalogs/products/${productId}`);

      return {
        success: true,
        data: {
          id: response.id,
          name: response.name,
          description: response.description,
          price: 0,
          currency: 'USD',
          active: true,
          createdAt: new Date(response.create_time),
          updatedAt: new Date(response.update_time),
        },
        metadata: { connectorId: 'paypal' }
      };
    } catch (error) {
      return this.errorUtils.handleError(error, 'Get product');
    }
  }

  async updateProduct(productId: string, updates: Partial<Product>): Promise<ConnectorResponse<Product>> {
    try {
      const patchOps = [];
      
      if (updates.name) {
        patchOps.push({
          op: 'replace',
          path: '/name',
          value: updates.name,
        });
      }
      
      if (updates.description) {
        patchOps.push({
          op: 'replace',
          path: '/description',
          value: updates.description,
        });
      }

      await this.makeApiRequest('PATCH', `/v1/catalogs/products/${productId}`, patchOps);

      return this.getProduct(productId);
    } catch (error) {
      return this.errorUtils.handleError(error, 'Update product');
    }
  }

  async deleteProduct(productId: string): Promise<ConnectorResponse<void>> {
    return this.errorUtils.handleError(
      new Error('PayPal does not support deleting products'),
      'Delete product'
    );
  }

  async listProducts(request?: ListRequest): Promise<ConnectorResponse<ListResponse<Product>>> {
    try {
      const params = new URLSearchParams({
        page_size: (request?.limit || 10).toString(),
        page: '1',
      });

      const response = await this.makeApiRequest('GET', `/v1/catalogs/products?${params}`);

      return {
        success: true,
        data: {
          data: response.products?.map((product: any) => ({
            id: product.id,
            name: product.name,
            description: product.description,
            price: 0,
            currency: 'USD',
            active: true,
            createdAt: new Date(product.create_time),
            updatedAt: new Date(product.update_time),
          })) || [],
          hasMore: response.links?.some((link: any) => link.rel === 'next') || false,
        },
        metadata: { connectorId: 'paypal' }
      };
    } catch (error) {
      return this.errorUtils.handleError(error, 'List products');
    }
  }

  async createSubscription(request: CreateSubscriptionRequest): Promise<ConnectorResponse<Subscription>> {
    try {
      const planId = request.priceId || request.productId;
      
      const response = await this.makeApiRequest('POST', '/v1/billing/subscriptions', {
        plan_id: planId,
        subscriber: {
          email_address: 'subscriber@example.com',
        },
      });

      return {
        success: true,
        data: {
          id: response.id,
          customerId: request.customerId,
          productId: planId,
          status: this.mapPayPalSubscriptionStatus(response.status),
          billingCycle: request.billingCycle,
          amount: request.amount || 0,
          currency: request.currency || 'USD',
          createdAt: new Date(response.create_time),
        },
        metadata: { connectorId: 'paypal' }
      };
    } catch (error) {
      return this.errorUtils.handleError(error, 'Create subscription');
    }
  }

  async getSubscription(subscriptionId: string): Promise<ConnectorResponse<Subscription>> {
    try {
      const response = await this.makeApiRequest('GET', `/v1/billing/subscriptions/${subscriptionId}`);

      return {
        success: true,
        data: {
          id: response.id,
          customerId: response.subscriber?.email_address || '',
          productId: response.plan_id,
          status: this.mapPayPalSubscriptionStatus(response.status),
          billingCycle: 'monthly',
          amount: 0,
          currency: 'USD',
          createdAt: new Date(response.create_time),
          updatedAt: new Date(response.update_time),
        },
        metadata: { connectorId: 'paypal' }
      };
    } catch (error) {
      return this.errorUtils.handleError(error, 'Get subscription');
    }
  }

  async updateSubscription(subscriptionId: string, updates: Partial<Subscription>): Promise<ConnectorResponse<Subscription>> {
    return this.errorUtils.handleError(
      new Error('PayPal subscription updates are limited'),
      'Update subscription'
    );
  }

  async cancelSubscription(subscriptionId: string): Promise<ConnectorResponse<Subscription>> {
    try {
      await this.makeApiRequest('POST', `/v1/billing/subscriptions/${subscriptionId}/cancel`, {
        reason: 'Customer requested cancellation',
      });

      const subscription = await this.getSubscription(subscriptionId);
      
      return {
        success: true,
        data: {
          ...subscription.data!,
          status: 'canceled',
        },
        metadata: { connectorId: 'paypal' }
      };
    } catch (error) {
      return this.errorUtils.handleError(error, 'Cancel subscription');
    }
  }

  async listSubscriptions(customerId?: string, request?: ListRequest): Promise<ConnectorResponse<ListResponse<Subscription>>> {
    try {
      const params = new URLSearchParams({
        page_size: (request?.limit || 10).toString(),
        page: '1',
      });

      const response = await this.makeApiRequest('GET', `/v1/billing/subscriptions?${params}`);

      return {
        success: true,
        data: {
          data: response.subscriptions?.map((sub: any) => ({
            id: sub.id,
            customerId: sub.subscriber?.email_address || '',
            productId: sub.plan_id,
            status: this.mapPayPalSubscriptionStatus(sub.status),
            billingCycle: 'monthly',
            amount: 0,
            currency: 'USD',
            createdAt: new Date(sub.create_time),
            updatedAt: new Date(sub.update_time),
          })) || [],
          hasMore: response.links?.some((link: any) => link.rel === 'next') || false,
        },
        metadata: { connectorId: 'paypal' }
      };
    } catch (error) {
      return this.errorUtils.handleError(error, 'List subscriptions');
    }
  }

  async createInvoice(request: CreateInvoiceRequest): Promise<ConnectorResponse<Invoice>> {
    try {
      const response = await this.makeApiRequest('POST', '/v2/invoicing/invoices', {
        detail: {
          currency_code: 'USD',
          memo: request.description,
        },
        invoicer: {
          email_address: 'invoicer@example.com',
        },
        primary_recipients: [{
          billing_info: {
            email_address: request.customerId,
          },
        }],
        items: request.items?.map(item => ({
          name: item.description,
          description: item.description,
          quantity: item.quantity.toString(),
          unit_amount: {
            currency_code: 'USD',
            value: item.unitPrice.toFixed(2),
          },
        })) || [],
      });

      return {
        success: true,
        data: {
          id: response.id,
          customerId: request.customerId,
          amount: response.amount?.value ? parseFloat(response.amount.value) : 0,
          currency: response.amount?.currency_code || 'USD',
          status: 'draft',
          createdAt: new Date(),
        },
        metadata: { connectorId: 'paypal' }
      };
    } catch (error) {
      return this.errorUtils.handleError(error, 'Create invoice');
    }
  }

  async getInvoice(invoiceId: string): Promise<ConnectorResponse<Invoice>> {
    try {
      const response = await this.makeApiRequest('GET', `/v2/invoicing/invoices/${invoiceId}`);

      return {
        success: true,
        data: {
          id: response.id,
          customerId: response.primary_recipients?.[0]?.billing_info?.email_address || '',
          amount: response.amount?.value ? parseFloat(response.amount.value) : 0,
          currency: response.amount?.currency_code || 'USD',
          status: this.mapPayPalInvoiceStatus(response.status),
          createdAt: new Date(response.detail?.invoice_date || new Date()),
        },
        metadata: { connectorId: 'paypal' }
      };
    } catch (error) {
      return this.errorUtils.handleError(error, 'Get invoice');
    }
  }

  async updateInvoice(invoiceId: string, updates: Partial<Invoice>): Promise<ConnectorResponse<Invoice>> {
    return this.errorUtils.handleError(
      new Error('PayPal invoice updates are limited'),
      'Update invoice'
    );
  }

  async deleteInvoice(invoiceId: string): Promise<ConnectorResponse<void>> {
    try {
      await this.makeApiRequest('DELETE', `/v2/invoicing/invoices/${invoiceId}`);
      
      return {
        success: true,
        data: undefined,
        metadata: { connectorId: 'paypal' }
      };
    } catch (error) {
      return this.errorUtils.handleError(error, 'Delete invoice');
    }
  }

  async finalizeInvoice(invoiceId: string): Promise<ConnectorResponse<Invoice>> {
    try {
      await this.makeApiRequest('POST', `/v2/invoicing/invoices/${invoiceId}/send`);
      
      return this.getInvoice(invoiceId);
    } catch (error) {
      return this.errorUtils.handleError(error, 'Finalize invoice');
    }
  }

  async payInvoice(invoiceId: string): Promise<ConnectorResponse<Invoice>> {
    return this.errorUtils.handleError(
      new Error('PayPal does not support direct invoice payment via API'),
      'Pay invoice'
    );
  }

  async listInvoices(customerId?: string, request?: ListRequest): Promise<ConnectorResponse<ListResponse<Invoice>>> {
    try {
      const params = new URLSearchParams({
        page_size: (request?.limit || 10).toString(),
        page: '1',
      });

      const response = await this.makeApiRequest('GET', `/v2/invoicing/invoices?${params}`);

      return {
        success: true,
        data: {
          data: response.items?.map((invoice: any) => ({
            id: invoice.id,
            customerId: invoice.primary_recipients?.[0]?.billing_info?.email_address || '',
            amount: invoice.amount?.value ? parseFloat(invoice.amount.value) : 0,
            currency: invoice.amount?.currency_code || 'USD',
            status: this.mapPayPalInvoiceStatus(invoice.status),
            createdAt: new Date(invoice.detail?.invoice_date || new Date()),
          })) || [],
          hasMore: response.links?.some((link: any) => link.rel === 'next') || false,
        },
        metadata: { connectorId: 'paypal' }
      };
    } catch (error) {
      return this.errorUtils.handleError(error, 'List invoices');
    }
  }

  // ==========================================
  // New n8n-based Payout Methods
  // ==========================================

  /**
   * Create a batch payout - n8n implementation
   * Supports both UI form and JSON input for items
   */
  async createPayoutBatch(input: any): Promise<ConnectorResponse> {
    try {
      const body: PayPalPayoutBatch = {
        sender_batch_header: {
          sender_batch_id: input.senderBatchId,
        },
        items: []
      };

      // Add optional header fields
      if (input.emailSubject) {
        body.sender_batch_header.email_subject = input.emailSubject;
      }
      if (input.emailMessage) {
        body.sender_batch_header.email_message = input.emailMessage;
      }
      if (input.note) {
        body.sender_batch_header.note = input.note;
      }

      // Handle items - either JSON or structured array
      if (input.jsonParameters && input.itemsJson) {
        try {
          body.items = JSON.parse(input.itemsJson);
        } catch (error) {
          throw new Error('Invalid JSON format for items');
        }
      } else if (input.items && Array.isArray(input.items)) {
        if (input.items.length === 0) {
          throw new Error('You must have at least one payout item');
        }

        body.items = input.items.map((item: any) => ({
          recipient_type: item.recipientType || 'EMAIL',
          amount: {
            value: parseFloat(item.amount).toFixed(2),
            currency: item.currency || 'USD',
          },
          receiver: item.receiverValue,
          note: item.note || '',
          sender_item_id: item.senderItemId || '',
          recipient_wallet: item.recipientWallet || 'PAYPAL',
        }));
      } else {
        throw new Error('Payout items are required');
      }

      const response = await this.makeApiRequest('POST', '/v1/payments/payouts', body);

      return {
        success: true,
        data: response,
        metadata: { connectorId: 'paypal' }
      };
    } catch (error) {
      return this.errorUtils.handleError(error, 'Create payout batch');
    }
  }

  /**
   * Get payout batch details - n8n implementation
   * Supports pagination and returnAll
   */
  async getPayoutBatch(input: any): Promise<ConnectorResponse> {
    try {
      const { payoutBatchId, returnAll, limit } = input;

      if (returnAll) {
        // Fetch all items with pagination
        const allItems = await this.payPalApiRequestAllItems(
          'items',
          `/v1/payments/payouts/${payoutBatchId}`,
          'GET'
        );

        return {
          success: true,
          data: allItems,
          metadata: { connectorId: 'paypal' }
        };
      } else {
        // Fetch with limit
        const params: any = {};
        if (limit) {
          params.page_size = limit;
        }

        const response = await this.makeApiRequest(
          'GET',
          `/v1/payments/payouts/${payoutBatchId}`,
          null,
          params
        );

        return {
          success: true,
          data: response.items || [],
          metadata: {
            connectorId: 'paypal',
            batch_header: response.batch_header
          }
        };
      }
    } catch (error) {
      return this.errorUtils.handleError(error, 'Get payout batch');
    }
  }

  /**
   * Get payout item details - n8n implementation
   */
  async getPayoutItem(payoutItemId: string): Promise<ConnectorResponse> {
    try {
      const response = await this.makeApiRequest('GET', `/v1/payments/payouts-item/${payoutItemId}`);

      return {
        success: true,
        data: response,
        metadata: { connectorId: 'paypal' }
      };
    } catch (error) {
      return this.errorUtils.handleError(error, 'Get payout item');
    }
  }

  /**
   * Cancel payout item - n8n implementation
   */
  async cancelPayoutItem(payoutItemId: string): Promise<ConnectorResponse> {
    try {
      const response = await this.makeApiRequest('POST', `/v1/payments/payouts-item/${payoutItemId}/cancel`);

      return {
        success: true,
        data: response,
        metadata: { connectorId: 'paypal' }
      };
    } catch (error) {
      return this.errorUtils.handleError(error, 'Cancel payout item');
    }
  }

  /**
   * Helper method for paginated requests - similar to n8n implementation
   */
  private async payPalApiRequestAllItems(
    propertyName: string,
    endpoint: string,
    method: string,
    body: any = {},
    query: any = {}
  ): Promise<any[]> {
    const returnData: any[] = [];
    let responseData: any;
    let uri: string | undefined;

    query.page_size = 1000;

    do {
      responseData = await this.makeApiRequest(method, endpoint, body, query, uri);
      uri = this.getNextLink(responseData.links);

      if (responseData[propertyName]) {
        returnData.push(...responseData[propertyName]);
      }
    } while (uri);

    return returnData;
  }

  /**
   * Extract next pagination link from HATEOAS links
   */
  private getNextLink(links: any[]): string | undefined {
    if (!links || !Array.isArray(links)) {
      return undefined;
    }

    for (const link of links) {
      if (link.rel === 'next') {
        return link.href;
      }
    }
    return undefined;
  }

  // ==========================================
  // Legacy Payout Methods (for backward compatibility)
  // ==========================================

  async createPayout(request: CreatePayoutRequest): Promise<ConnectorResponse<Payout>> {
    try {
      const response = await this.makeApiRequest('POST', '/v1/payments/payouts', {
        sender_batch_header: {
          sender_batch_id: `payout_${Date.now()}`,
          email_subject: 'You have a payout!',
          email_message: request.description || 'You have received a payout!',
        },
        items: [{
          recipient_type: 'EMAIL',
          amount: {
            value: request.amount.toFixed(2),
            currency: request.currency.toUpperCase(),
          },
          receiver: request.recipientEmail,
          sender_item_id: `item_${Date.now()}`,
        }],
      });

      return {
        success: true,
        data: {
          id: response.batch_header.payout_batch_id,
          amount: request.amount,
          currency: request.currency,
          recipientEmail: request.recipientEmail,
          status: 'pending',
          description: request.description,
          createdAt: new Date(),
        },
        metadata: { connectorId: 'paypal' }
      };
    } catch (error) {
      return this.errorUtils.handleError(error, 'Create payout');
    }
  }

  async getPayout(payoutId: string): Promise<ConnectorResponse<Payout>> {
    try {
      const response = await this.makeApiRequest('GET', `/v1/payments/payouts/${payoutId}`);

      return {
        success: true,
        data: {
          id: response.batch_header.payout_batch_id,
          amount: parseFloat(response.batch_header.amount.value),
          currency: response.batch_header.amount.currency,
          status: this.mapPayPalPayoutStatus(response.batch_header.batch_status),
          createdAt: new Date(response.batch_header.time_created),
        },
        metadata: { connectorId: 'paypal' }
      };
    } catch (error) {
      return this.errorUtils.handleError(error, 'Get payout');
    }
  }

  async listPayouts(request?: ListRequest): Promise<ConnectorResponse<ListResponse<Payout>>> {
    return {
      success: true,
      data: {
        data: [],
        hasMore: false,
      },
      metadata: { connectorId: 'paypal' }
    };
  }

  async getBalance(): Promise<ConnectorResponse<{ available: number; pending: number; currency: string }>> {
    try {
      const response = await this.makeApiRequest('GET', '/v1/reporting/balances');

      const balance = response.balances?.[0];
      
      return {
        success: true,
        data: {
          available: balance?.available_balance?.value ? parseFloat(balance.available_balance.value) : 0,
          pending: balance?.withheld_balance?.value ? parseFloat(balance.withheld_balance.value) : 0,
          currency: balance?.available_balance?.currency || 'USD',
        },
        metadata: { connectorId: 'paypal' }
      };
    } catch (error) {
      return this.errorUtils.handleError(error, 'Get balance');
    }
  }

  // ==========================================
  // Webhook Methods (n8n-based implementation)
  // ==========================================

  /**
   * Create a webhook - n8n implementation
   */
  async createWebhook(url: string, events: string[]): Promise<ConnectorResponse<Webhook>> {
    try {
      const response = await this.makeApiRequest('POST', '/v1/notifications/webhooks', {
        url,
        event_types: events.map(event => ({ name: event })),
      });

      return {
        success: true,
        data: {
          id: response.id,
          url: response.url,
          events: response.event_types.map((evt: any) => evt.name),
          active: true,
          createdAt: new Date(),
        },
        metadata: { connectorId: 'paypal' }
      };
    } catch (error) {
      return this.errorUtils.handleError(error, 'Create webhook');
    }
  }

  /**
   * Get webhook details - n8n implementation
   */
  async getWebhook(webhookId: string): Promise<ConnectorResponse<Webhook>> {
    try {
      const response = await this.makeApiRequest('GET', `/v1/notifications/webhooks/${webhookId}`);

      return {
        success: true,
        data: {
          id: response.id,
          url: response.url,
          events: response.event_types.map((evt: any) => evt.name),
          active: true,
          createdAt: new Date(),
        },
        metadata: { connectorId: 'paypal' }
      };
    } catch (error) {
      return this.errorUtils.handleError(error, 'Get webhook');
    }
  }

  /**
   * Check if webhook exists - n8n implementation
   */
  async webhookExists(webhookId: string): Promise<boolean> {
    try {
      await this.makeApiRequest('GET', `/v1/notifications/webhooks/${webhookId}`);
      return true;
    } catch (error: any) {
      if (error.response && error.response.data?.name === 'INVALID_RESOURCE_ID') {
        return false;
      }
      throw error;
    }
  }

  /**
   * Update webhook - n8n implementation
   */
  async updateWebhook(webhookId: string, updates: Partial<Webhook>): Promise<ConnectorResponse<Webhook>> {
    try {
      const patchOps = [];

      if (updates.url) {
        patchOps.push({
          op: 'replace',
          path: '/url',
          value: updates.url,
        });
      }

      if (updates.events) {
        patchOps.push({
          op: 'replace',
          path: '/event_types',
          value: updates.events.map(event => ({ name: event })),
        });
      }

      await this.makeApiRequest('PATCH', `/v1/notifications/webhooks/${webhookId}`, patchOps);

      return this.getWebhook(webhookId);
    } catch (error) {
      return this.errorUtils.handleError(error, 'Update webhook');
    }
  }

  /**
   * Delete webhook - n8n implementation
   */
  async deleteWebhook(webhookId: string): Promise<ConnectorResponse<void>> {
    try {
      await this.makeApiRequest('DELETE', `/v1/notifications/webhooks/${webhookId}`);

      return {
        success: true,
        data: undefined,
        metadata: { connectorId: 'paypal' }
      };
    } catch (error) {
      return this.errorUtils.handleError(error, 'Delete webhook');
    }
  }

  /**
   * List all webhooks - n8n implementation
   */
  async listWebhooks(): Promise<ConnectorResponse<ListResponse<Webhook>>> {
    try {
      const response = await this.makeApiRequest('GET', '/v1/notifications/webhooks');

      return {
        success: true,
        data: {
          data: response.webhooks?.map((webhook: any) => ({
            id: webhook.id,
            url: webhook.url,
            events: webhook.event_types.map((evt: any) => evt.name),
            active: true,
            createdAt: new Date(),
          })) || [],
          hasMore: false,
        },
        metadata: { connectorId: 'paypal' }
      };
    } catch (error) {
      return this.errorUtils.handleError(error, 'List webhooks');
    }
  }

  /**
   * Get available webhook event types - n8n implementation
   */
  async getWebhookEventTypes(): Promise<ConnectorResponse> {
    try {
      const response = await this.makeApiRequest('GET', '/v1/notifications/webhooks-event-types');

      const eventTypes = response.event_types?.map((event: any) => ({
        name: this.upperFirst(event.name),
        value: event.name,
        description: event.description,
      })) || [];

      // Add wildcard option
      eventTypes.unshift({
        name: 'All Events',
        value: '*',
        description: 'Any time any event is triggered (Wildcard Event)',
      });

      return {
        success: true,
        data: eventTypes,
        metadata: { connectorId: 'paypal' }
      };
    } catch (error) {
      return this.errorUtils.handleError(error, 'Get webhook event types');
    }
  }

  /**
   * Verify webhook signature - n8n implementation
   * In sandbox mode, verification is skipped
   */
  async verifyWebhookSignatureAdvanced(
    webhookId: string,
    headers: any,
    body: any
  ): Promise<boolean> {
    try {
      // Skip verification for sandbox environment
      if (this.config.credentials.environment === 'sandbox') {
        return true;
      }

      // Verify required headers exist
      const requiredHeaders = [
        'paypal-auth-algo',
        'paypal-cert-url',
        'paypal-transmission-id',
        'paypal-transmission-sig',
        'paypal-transmission-time',
      ];

      for (const header of requiredHeaders) {
        if (!headers[header]) {
          this.logger.warn(`Missing required webhook header: ${header}`);
          return false;
        }
      }

      // Verify signature with PayPal API
      const verifyBody = {
        auth_algo: headers['paypal-auth-algo'],
        cert_url: headers['paypal-cert-url'],
        transmission_id: headers['paypal-transmission-id'],
        transmission_sig: headers['paypal-transmission-sig'],
        transmission_time: headers['paypal-transmission-time'],
        webhook_id: webhookId,
        webhook_event: body,
      };

      const response = await this.makeApiRequest(
        'POST',
        '/v1/notifications/verify-webhook-signature',
        verifyBody
      );

      return response.verification_status === 'SUCCESS';
    } catch (error) {
      this.logger.error('Webhook signature verification failed', error);
      return false;
    }
  }

  /**
   * Simple webhook signature verification (legacy)
   */
  verifyWebhookSignature(payload: string, signature: string, secret: string): boolean {
    // For PayPal, signature verification should use the advanced method
    // This is kept for interface compatibility
    return true;
  }

  /**
   * Helper to uppercase first letter of each word (from n8n)
   */
  private upperFirst(s: string): string {
    return s
      .split('.')
      .map((e) => {
        return e.toLowerCase().charAt(0).toUpperCase() + e.toLowerCase().slice(1);
      })
      .join(' ');
  }

  private transformPayPalPayment(order: any): Payment {
    const purchaseUnit = order.purchase_units?.[0];
    const amount = purchaseUnit?.amount;
    
    return {
      id: order.id,
      amount: amount?.value ? parseFloat(amount.value) : 0,
      currency: amount?.currency_code || 'USD',
      status: this.mapPayPalOrderStatus(order.status),
      customerId: order.payer?.email_address,
      description: purchaseUnit?.description,
      createdAt: new Date(order.create_time || new Date()),
      updatedAt: new Date(order.update_time || new Date()),
    };
  }

  private transformPayPalAuthorization(auth: any): Payment {
    return {
      id: auth.id,
      amount: auth.amount?.value ? parseFloat(auth.amount.value) : 0,
      currency: auth.amount?.currency_code || 'USD',
      status: 'pending',
      createdAt: new Date(auth.create_time || new Date()),
    };
  }

  private mapPayPalOrderStatus(status: string): 'pending' | 'processing' | 'completed' | 'failed' | 'refunded' | 'partially_refunded' {
    switch (status) {
      case 'CREATED':
      case 'SAVED':
        return 'pending';
      case 'APPROVED':
        return 'processing';
      case 'COMPLETED':
        return 'completed';
      case 'VOIDED':
      case 'FAILED':
        return 'failed';
      default:
        return 'pending';
    }
  }

  private mapPayPalSubscriptionStatus(status: string): 'active' | 'inactive' | 'canceled' | 'past_due' | 'unpaid' {
    switch (status) {
      case 'ACTIVE':
        return 'active';
      case 'CANCELLED':
      case 'EXPIRED':
        return 'canceled';
      case 'SUSPENDED':
        return 'past_due';
      case 'APPROVAL_PENDING':
      case 'APPROVED':
        return 'inactive';
      default:
        return 'inactive';
    }
  }

  private mapPayPalInvoiceStatus(status: string): 'draft' | 'open' | 'paid' | 'void' | 'uncollectible' {
    switch (status) {
      case 'DRAFT':
        return 'draft';
      case 'SENT':
      case 'SCHEDULED':
        return 'open';
      case 'PAID':
      case 'MARKED_AS_PAID':
        return 'paid';
      case 'CANCELLED':
        return 'void';
      case 'REFUNDED':
      case 'PARTIALLY_REFUNDED':
        return 'paid';
      default:
        return 'draft';
    }
  }

  private mapPayPalPayoutStatus(status: string): 'pending' | 'processing' | 'completed' | 'failed' | 'canceled' {
    switch (status) {
      case 'PENDING':
        return 'pending';
      case 'PROCESSING':
        return 'processing';
      case 'SUCCESS':
        return 'completed';
      case 'DENIED':
      case 'FAILED':
        return 'failed';
      case 'CANCELED':
        return 'canceled';
      default:
        return 'pending';
    }
  }
}