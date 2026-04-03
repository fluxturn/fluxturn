import { Injectable } from '@nestjs/common';
import { BaseConnector } from '../../base/base.connector';
import {
  ConnectorMetadata,
  ConnectorType,
  ConnectorCategory,
  ConnectorRequest,
  ConnectorResponse,
  AuthType,
  ConnectorAction,
  ConnectorTrigger,
} from '../../types';
import {
  IEcommerceConnector,
  CreatePaymentRequest,
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
  ListRequest,
  ListResponse,
  CreateCouponRequest,
  Coupon,
  Payout,
  CreatePayoutRequest,
  PaymentIntent,
} from '../ecommerce.interface';
import { AuthUtils } from '../../utils/auth.utils';
import { ApiUtils } from '../../utils/api.utils';

@Injectable()
export class PaddleConnector extends BaseConnector implements IEcommerceConnector {
  private readonly productionUrl = 'https://vendors.paddle.com/api';
  private readonly sandboxUrl = 'https://sandbox-vendors.paddle.com/api';
  private baseUrl: string;

  constructor(
    private readonly authUtils: AuthUtils,
    private readonly apiUtils: ApiUtils,
  ) {
    super();
  }

  getMetadata(): ConnectorMetadata {
    return {
      name: 'Paddle',
      description: 'Payment processing and subscription management platform for SaaS businesses',
      version: '1.0.0',
      category: ConnectorCategory.ECOMMERCE,
      type: ConnectorType.PADDLE,
      authType: AuthType.API_KEY,
      actions: this.getActions(),
      triggers: this.getTriggers(),
      webhookSupport: true,
    };
  }

  protected async initializeConnection(): Promise<void> {
    if (!this.config.credentials?.vendorId || !this.config.credentials?.vendorAuthCode) {
      throw new Error('Vendor ID and Vendor Auth Code are required');
    }

    const isSandbox = this.config.credentials.sandbox === true || this.config.credentials.sandbox === 'true';
    this.baseUrl = isSandbox ? this.sandboxUrl : this.productionUrl;

    this.logger.log('Paddle connector initialized');
  }

  protected async performConnectionTest(): Promise<boolean> {
    try {
      const response = await this.makePaddleRequest({
        method: 'POST',
        endpoint: '/2.0/product/get_products',
        body: {},
      });
      return !!response;
    } catch (error) {
      this.logger.error('Connection test failed:', error);
      return false;
    }
  }

  protected async performHealthCheck(): Promise<void> {
    const isHealthy = await this.performConnectionTest();
    if (!isHealthy) {
      throw new Error('Health check failed');
    }
  }

  protected async performRequest(request: ConnectorRequest): Promise<any> {
    return await this.makePaddleRequest(request);
  }

  protected async performAction(actionId: string, input: any): Promise<any> {
    switch (actionId) {
      // Coupon Operations
      case 'create_coupon':
        return await this.createCoupon(input);
      case 'get_coupons':
        return await this.listCoupons(input);
      case 'update_coupon':
        return await this.updateCoupon(input.couponId, input);

      // Payment Operations
      case 'get_payments':
        return await this.listPayments(input);
      case 'reschedule_payment':
        return await this.reschedulePayment(input);

      // Plan Operations
      case 'get_plan':
        return await this.getPlan(input.planId);
      case 'get_plans':
        return await this.listPlans(input);

      // Product Operations
      case 'get_products':
        return await this.listProducts(input);

      // User Operations (Subscriptions)
      case 'get_users':
        return await this.listSubscriptions(input.customerId, input);

      default:
        throw new Error(`Unknown action: ${actionId}`);
    }
  }

  protected async cleanup(): Promise<void> {
    this.logger.log('Paddle connector cleanup completed');
  }

  private async makePaddleRequest(request: ConnectorRequest): Promise<any> {
    const url = `${this.baseUrl}${request.endpoint}`;

    const body = {
      ...request.body,
      vendor_id: this.config.credentials.vendorId,
      vendor_auth_code: this.config.credentials.vendorAuthCode,
    };

    const response = await this.apiUtils.executeRequest({
      method: request.method,
      endpoint: url,
      headers: {
        'Content-Type': 'application/json',
        ...request.headers,
      },
      body,
      queryParams: request.queryParams,
    });

    if (!response.data?.success) {
      throw new Error(response.data?.error?.message || 'Paddle API request failed');
    }

    return response.data;
  }

  private getActions(): ConnectorAction[] {
    return [
      // Coupon Actions
      {
        id: 'create_coupon',
        name: 'Create Coupon',
        description: 'Create a new coupon code',
        inputSchema: {
          couponType: {
            type: 'select',
            required: true,
            label: 'Coupon Type',
            description: 'Either product (valid for specified products) or checkout (valid for any checkout)',
            options: [
              { label: 'Checkout', value: 'checkout' },
              { label: 'Product', value: 'product' },
            ],
            default: 'checkout',
          },
          productIds: {
            type: 'string',
            required: false,
            label: 'Product IDs',
            description: 'Comma-separated list of product IDs (required if coupon type is product)',
            displayOptions: {
              show: {
                couponType: ['product'],
              },
            },
          },
          discountType: {
            type: 'select',
            required: true,
            label: 'Discount Type',
            description: 'Type of discount',
            options: [
              { label: 'Flat', value: 'flat' },
              { label: 'Percentage', value: 'percentage' },
            ],
            default: 'flat',
          },
          discountAmount: {
            type: 'number',
            required: true,
            label: 'Discount Amount',
            description: 'Discount amount in currency or percentage',
            min: 1,
          },
          currency: {
            type: 'select',
            required: false,
            label: 'Currency',
            description: 'Currency for flat discount',
            default: 'USD',
            options: [
              { label: 'USD', value: 'USD' },
              { label: 'EUR', value: 'EUR' },
              { label: 'GBP', value: 'GBP' },
            ],
            displayOptions: {
              show: {
                discountType: ['flat'],
              },
            },
          },
          couponCode: {
            type: 'string',
            required: false,
            label: 'Coupon Code',
            description: 'Will be randomly generated if not specified',
          },
          couponPrefix: {
            type: 'string',
            required: false,
            label: 'Coupon Prefix',
            description: 'Prefix for generated codes (not valid if coupon code is specified)',
          },
          numberOfCoupons: {
            type: 'number',
            required: false,
            label: 'Number of Coupons',
            description: 'Number of coupons to generate (not valid if coupon code is specified)',
            default: 1,
            min: 1,
          },
          allowedUses: {
            type: 'number',
            required: false,
            label: 'Allowed Uses',
            description: 'Number of times a coupon can be used (default: 999,999)',
            min: 1,
          },
          expires: {
            type: 'string',
            required: false,
            label: 'Expires',
            description: 'The coupon will expire on this date (YYYY-MM-DD format)',
            inputType: 'date',
          },
          group: {
            type: 'string',
            required: false,
            label: 'Group',
            description: 'The name of the coupon group this coupon should be assigned to',
            maxLength: 50,
          },
          description: {
            type: 'string',
            required: false,
            label: 'Description',
            description: 'Description of the coupon (displayed in Seller Dashboard)',
            inputType: 'textarea',
          },
          recurring: {
            type: 'boolean',
            required: false,
            label: 'Recurring',
            description: 'Whether the discount applies to recurring payments after initial purchase',
            default: false,
          },
        },
        outputSchema: {
          couponCodes: { type: 'array', description: 'Array of generated coupon codes' },
        },
      },
      {
        id: 'get_coupons',
        name: 'Get Coupons',
        description: 'Get all coupons for a product',
        inputSchema: {
          productId: {
            type: 'string',
            required: true,
            label: 'Product ID',
            description: 'The specific product/subscription ID',
          },
          limit: {
            type: 'number',
            required: false,
            label: 'Limit',
            description: 'Maximum number of results to return',
            default: 100,
            min: 1,
            max: 500,
          },
        },
        outputSchema: {
          coupons: { type: 'array', description: 'List of coupons' },
        },
      },
      {
        id: 'update_coupon',
        name: 'Update Coupon',
        description: 'Update an existing coupon',
        inputSchema: {
          updateBy: {
            type: 'select',
            required: true,
            label: 'Update By',
            description: 'Update by coupon code or group',
            options: [
              { label: 'Coupon Code', value: 'couponCode' },
              { label: 'Group', value: 'group' },
            ],
            default: 'couponCode',
          },
          couponCode: {
            type: 'string',
            required: false,
            label: 'Coupon Code',
            description: 'Identify the coupon to update',
            displayOptions: {
              show: {
                updateBy: ['couponCode'],
              },
            },
          },
          group: {
            type: 'string',
            required: false,
            label: 'Group',
            description: 'The name of the group of coupons to update',
            displayOptions: {
              show: {
                updateBy: ['group'],
              },
            },
          },
          allowedUses: {
            type: 'number',
            required: false,
            label: 'Allowed Uses',
            description: 'Number of times a coupon can be used',
            min: 1,
          },
          currency: {
            type: 'string',
            required: false,
            label: 'Currency',
            description: 'Currency code',
          },
          newCouponCode: {
            type: 'string',
            required: false,
            label: 'New Coupon Code',
            description: 'New code to rename the coupon to',
          },
          expires: {
            type: 'string',
            required: false,
            label: 'Expires',
            description: 'New expiration date (YYYY-MM-DD format)',
            inputType: 'date',
          },
          newGroup: {
            type: 'string',
            required: false,
            label: 'New Group',
            description: 'New group name to move coupon to',
            maxLength: 50,
          },
          recurring: {
            type: 'boolean',
            required: false,
            label: 'Recurring',
            description: 'Whether discount applies to recurring payments',
          },
          productIds: {
            type: 'string',
            required: false,
            label: 'Product IDs',
            description: 'Comma-separated list of products (blank to remove)',
          },
          discountAmount: {
            type: 'number',
            required: false,
            label: 'Discount Amount',
            description: 'New discount amount',
            min: 0,
          },
        },
        outputSchema: {
          updated: { type: 'boolean', description: 'Whether update was successful' },
        },
      },
      // Payment Actions
      {
        id: 'get_payments',
        name: 'Get Payments',
        description: 'Get all subscription payments',
        inputSchema: {
          subscriptionId: {
            type: 'number',
            required: false,
            label: 'Subscription ID',
            description: 'A specific user subscription ID',
          },
          plan: {
            type: 'string',
            required: false,
            label: 'Plan ID',
            description: 'Filter by product/plan ID (single or comma-separated)',
          },
          state: {
            type: 'select',
            required: false,
            label: 'State',
            description: 'Filter by user subscription status',
            options: [
              { label: 'Active', value: 'active' },
              { label: 'Past Due', value: 'past_due' },
              { label: 'Paused', value: 'paused' },
              { label: 'Trialing', value: 'trialing' },
            ],
          },
          isPaid: {
            type: 'boolean',
            required: false,
            label: 'Is Paid',
            description: 'Filter by paid status',
            default: false,
          },
          from: {
            type: 'string',
            required: false,
            label: 'From Date',
            description: 'Payment starting from date (YYYY-MM-DD)',
            inputType: 'date',
          },
          to: {
            type: 'string',
            required: false,
            label: 'To Date',
            description: 'Payment up until date (YYYY-MM-DD)',
            inputType: 'date',
          },
          isOneOffCharge: {
            type: 'boolean',
            required: false,
            label: 'Is One-Off Charge',
            description: 'Filter one-off charges',
            default: false,
          },
          limit: {
            type: 'number',
            required: false,
            label: 'Limit',
            description: 'Maximum number of results',
            default: 100,
            min: 1,
            max: 500,
          },
        },
        outputSchema: {
          payments: { type: 'array', description: 'List of payments' },
        },
      },
      {
        id: 'reschedule_payment',
        name: 'Reschedule Payment',
        description: 'Reschedule a subscription payment',
        inputSchema: {
          paymentId: {
            type: 'number',
            required: true,
            label: 'Payment ID',
            description: 'The upcoming subscription payment ID',
          },
          date: {
            type: 'string',
            required: true,
            label: 'Date',
            description: 'Date to move the payment to (YYYY-MM-DD)',
            inputType: 'date',
          },
        },
        outputSchema: {
          success: { type: 'boolean', description: 'Whether reschedule was successful' },
        },
      },
      // Plan Actions
      {
        id: 'get_plan',
        name: 'Get Plan',
        description: 'Get a specific subscription plan',
        inputSchema: {
          planId: {
            type: 'string',
            required: true,
            label: 'Plan ID',
            description: 'The subscription plan ID',
          },
        },
        outputSchema: {
          plan: { type: 'object', description: 'Plan details' },
        },
      },
      {
        id: 'get_plans',
        name: 'Get Plans',
        description: 'Get all subscription plans',
        inputSchema: {
          limit: {
            type: 'number',
            required: false,
            label: 'Limit',
            description: 'Maximum number of results',
            default: 100,
            min: 1,
            max: 500,
          },
        },
        outputSchema: {
          plans: { type: 'array', description: 'List of plans' },
        },
      },
      // Product Actions
      {
        id: 'get_products',
        name: 'Get Products',
        description: 'Get all products',
        inputSchema: {
          limit: {
            type: 'number',
            required: false,
            label: 'Limit',
            description: 'Maximum number of results',
            default: 100,
            min: 1,
            max: 500,
          },
        },
        outputSchema: {
          products: { type: 'array', description: 'List of products' },
        },
      },
      // User (Subscription) Actions
      {
        id: 'get_users',
        name: 'Get Users',
        description: 'Get subscription users',
        inputSchema: {
          state: {
            type: 'select',
            required: false,
            label: 'State',
            description: 'Filter by subscription status',
            options: [
              { label: 'Active', value: 'active' },
              { label: 'Past Due', value: 'past_due' },
              { label: 'Paused', value: 'paused' },
              { label: 'Trialing', value: 'trialing' },
            ],
          },
          planId: {
            type: 'string',
            required: false,
            label: 'Plan ID',
            description: 'Filter by subscription plan ID',
          },
          subscriptionId: {
            type: 'string',
            required: false,
            label: 'Subscription ID',
            description: 'A specific user subscription ID',
          },
          limit: {
            type: 'number',
            required: false,
            label: 'Limit',
            description: 'Maximum number of results',
            default: 100,
            min: 1,
            max: 200,
          },
        },
        outputSchema: {
          users: { type: 'array', description: 'List of subscription users' },
        },
      },
    ];
  }

  private getTriggers(): ConnectorTrigger[] {
    return [
      {
        id: 'subscription_created',
        name: 'Subscription Created',
        description: 'Triggers when a new subscription is created',
        eventType: 'subscription_created',
        webhookRequired: true,
        outputSchema: {
          subscription: { type: 'object', description: 'Subscription details' },
        },
      },
      {
        id: 'subscription_updated',
        name: 'Subscription Updated',
        description: 'Triggers when a subscription is updated',
        eventType: 'subscription_updated',
        webhookRequired: true,
        outputSchema: {
          subscription: { type: 'object', description: 'Updated subscription details' },
        },
      },
      {
        id: 'subscription_cancelled',
        name: 'Subscription Cancelled',
        description: 'Triggers when a subscription is cancelled',
        eventType: 'subscription_cancelled',
        webhookRequired: true,
        outputSchema: {
          subscription: { type: 'object', description: 'Cancelled subscription details' },
        },
      },
      {
        id: 'payment_succeeded',
        name: 'Payment Succeeded',
        description: 'Triggers when a payment is successful',
        eventType: 'payment_succeeded',
        webhookRequired: true,
        outputSchema: {
          payment: { type: 'object', description: 'Payment details' },
        },
      },
      {
        id: 'payment_failed',
        name: 'Payment Failed',
        description: 'Triggers when a payment fails',
        eventType: 'payment_failed',
        webhookRequired: true,
        outputSchema: {
          payment: { type: 'object', description: 'Failed payment details' },
        },
      },
      {
        id: 'payment_refunded',
        name: 'Payment Refunded',
        description: 'Triggers when a payment is refunded',
        eventType: 'payment_refunded',
        webhookRequired: true,
        outputSchema: {
          refund: { type: 'object', description: 'Refund details' },
        },
      },
    ];
  }

  // IEcommerceConnector Implementation
  async createPayment(request: CreatePaymentRequest): Promise<ConnectorResponse<PaymentIntent>> {
    throw new Error('Direct payment creation not supported. Use Paddle Checkout instead.');
  }

  async capturePayment(paymentId: string): Promise<ConnectorResponse<Payment>> {
    throw new Error('Payment capture not directly supported by Paddle API');
  }

  async cancelPayment(paymentId: string): Promise<ConnectorResponse<Payment>> {
    throw new Error('Payment cancellation not directly supported by Paddle API');
  }

  async getPayment(paymentId: string): Promise<ConnectorResponse<Payment>> {
    try {
      const response = await this.makePaddleRequest({
        method: 'POST',
        endpoint: '/2.0/subscription/payments',
        body: { payment_id: paymentId },
      });

      return {
        success: true,
        data: this.transformPayment(response.response[0]),
      };
    } catch (error) {
      return {
        success: false,
        error: {
          code: 'GET_PAYMENT_FAILED',
          message: error.message,
        },
      };
    }
  }

  async listPayments(request?: ListRequest): Promise<ConnectorResponse<ListResponse<Payment>>> {
    try {
      const body: any = {};

      if (request?.filters) {
        if (request.filters.subscriptionId) body.subscription_id = request.filters.subscriptionId;
        if (request.filters.plan) body.plan = request.filters.plan;
        if (request.filters.state) body.state = request.filters.state;
        if (request.filters.isPaid !== undefined) body.is_paid = request.filters.isPaid ? 1 : 0;
        if (request.filters.from) body.from = request.filters.from;
        if (request.filters.to) body.to = request.filters.to;
        if (request.filters.isOneOffCharge !== undefined) body.is_one_off_charge = request.filters.isOneOffCharge;
      }

      const response = await this.makePaddleRequest({
        method: 'POST',
        endpoint: '/2.0/subscription/payments',
        body,
      });

      const payments = response.response.map((p: any) => this.transformPayment(p));
      const limit = request?.limit || 100;

      return {
        success: true,
        data: {
          data: payments.slice(0, limit),
          hasMore: payments.length > limit,
          totalCount: payments.length,
        },
      };
    } catch (error) {
      return {
        success: false,
        error: {
          code: 'LIST_PAYMENTS_FAILED',
          message: error.message,
        },
      };
    }
  }

  async createRefund(request: CreateRefundRequest): Promise<ConnectorResponse<Refund>> {
    throw new Error('Refund creation not directly supported by Paddle API v2.0');
  }

  async getRefund(refundId: string): Promise<ConnectorResponse<Refund>> {
    throw new Error('Refund retrieval not directly supported by Paddle API v2.0');
  }

  async listRefunds(paymentId?: string, request?: ListRequest): Promise<ConnectorResponse<ListResponse<Refund>>> {
    throw new Error('Refund listing not directly supported by Paddle API v2.0');
  }

  async createCustomer(request: CreateCustomerRequest): Promise<ConnectorResponse<Customer>> {
    throw new Error('Customer creation not directly supported. Customers are created automatically through Paddle Checkout.');
  }

  async getCustomer(customerId: string): Promise<ConnectorResponse<Customer>> {
    throw new Error('Customer retrieval not directly supported by Paddle API v2.0');
  }

  async updateCustomer(customerId: string, updates: Partial<Customer>): Promise<ConnectorResponse<Customer>> {
    throw new Error('Customer updates not directly supported by Paddle API v2.0');
  }

  async deleteCustomer(customerId: string): Promise<ConnectorResponse<void>> {
    throw new Error('Customer deletion not supported by Paddle API');
  }

  async listCustomers(request?: ListRequest): Promise<ConnectorResponse<ListResponse<Customer>>> {
    throw new Error('Customer listing not directly supported by Paddle API v2.0');
  }

  async createProduct(request: CreateProductRequest): Promise<ConnectorResponse<Product>> {
    throw new Error('Product creation must be done through Paddle Dashboard');
  }

  async getProduct(productId: string): Promise<ConnectorResponse<Product>> {
    try {
      const response = await this.makePaddleRequest({
        method: 'POST',
        endpoint: '/2.0/product/get_products',
        body: {},
      });

      const product = response.response?.products?.find((p: any) => p.id === parseInt(productId));

      if (!product) {
        return {
          success: false,
          error: {
            code: 'PRODUCT_NOT_FOUND',
            message: 'Product not found',
          },
        };
      }

      return {
        success: true,
        data: this.transformProduct(product),
      };
    } catch (error) {
      return {
        success: false,
        error: {
          code: 'GET_PRODUCT_FAILED',
          message: error.message,
        },
      };
    }
  }

  async updateProduct(productId: string, updates: Partial<Product>): Promise<ConnectorResponse<Product>> {
    throw new Error('Product updates must be done through Paddle Dashboard');
  }

  async deleteProduct(productId: string): Promise<ConnectorResponse<void>> {
    throw new Error('Product deletion must be done through Paddle Dashboard');
  }

  async listProducts(request?: ListRequest): Promise<ConnectorResponse<ListResponse<Product>>> {
    try {
      const response = await this.makePaddleRequest({
        method: 'POST',
        endpoint: '/2.0/product/get_products',
        body: {},
      });

      const products = response.response?.products?.map((p: any) => this.transformProduct(p)) || [];
      const limit = request?.limit || 100;

      return {
        success: true,
        data: {
          data: products.slice(0, limit),
          hasMore: products.length > limit,
          totalCount: products.length,
        },
      };
    } catch (error) {
      return {
        success: false,
        error: {
          code: 'LIST_PRODUCTS_FAILED',
          message: error.message,
        },
      };
    }
  }

  async createSubscription(request: CreateSubscriptionRequest): Promise<ConnectorResponse<Subscription>> {
    throw new Error('Subscription creation not directly supported. Use Paddle Checkout instead.');
  }

  async getSubscription(subscriptionId: string): Promise<ConnectorResponse<Subscription>> {
    try {
      const response = await this.makePaddleRequest({
        method: 'POST',
        endpoint: '/2.0/subscription/users',
        body: { subscription_id: subscriptionId },
      });

      return {
        success: true,
        data: this.transformSubscription(response.response[0]),
      };
    } catch (error) {
      return {
        success: false,
        error: {
          code: 'GET_SUBSCRIPTION_FAILED',
          message: error.message,
        },
      };
    }
  }

  async updateSubscription(subscriptionId: string, updates: Partial<Subscription>): Promise<ConnectorResponse<Subscription>> {
    throw new Error('Subscription updates must be done through Paddle Dashboard or API update endpoints');
  }

  async cancelSubscription(subscriptionId: string): Promise<ConnectorResponse<Subscription>> {
    try {
      const response = await this.makePaddleRequest({
        method: 'POST',
        endpoint: '/2.0/subscription/users_cancel',
        body: { subscription_id: subscriptionId },
      });

      return {
        success: true,
        data: this.transformSubscription(response.response),
      };
    } catch (error) {
      return {
        success: false,
        error: {
          code: 'CANCEL_SUBSCRIPTION_FAILED',
          message: error.message,
        },
      };
    }
  }

  async listSubscriptions(customerId?: string, request?: ListRequest): Promise<ConnectorResponse<ListResponse<Subscription>>> {
    try {
      const body: any = {};

      if (request?.filters) {
        if (request.filters.state) body.state = request.filters.state;
        if (request.filters.planId) body.plan_id = request.filters.planId;
        if (request.filters.subscriptionId) body.subscription_id = request.filters.subscriptionId;
      }

      if (request?.limit) {
        body.results_per_page = request.limit;
      }

      const response = await this.makePaddleRequest({
        method: 'POST',
        endpoint: '/2.0/subscription/users',
        body,
      });

      const subscriptions = response.response.map((s: any) => this.transformSubscription(s));

      return {
        success: true,
        data: {
          data: subscriptions,
          hasMore: false,
          totalCount: subscriptions.length,
        },
      };
    } catch (error) {
      return {
        success: false,
        error: {
          code: 'LIST_SUBSCRIPTIONS_FAILED',
          message: error.message,
        },
      };
    }
  }

  async createInvoice(request: CreateInvoiceRequest): Promise<ConnectorResponse<Invoice>> {
    throw new Error('Invoice creation not directly supported by Paddle API');
  }

  async getInvoice(invoiceId: string): Promise<ConnectorResponse<Invoice>> {
    throw new Error('Invoice retrieval not directly supported by Paddle API');
  }

  async updateInvoice(invoiceId: string, updates: Partial<Invoice>): Promise<ConnectorResponse<Invoice>> {
    throw new Error('Invoice updates not directly supported by Paddle API');
  }

  async deleteInvoice(invoiceId: string): Promise<ConnectorResponse<void>> {
    throw new Error('Invoice deletion not directly supported by Paddle API');
  }

  async finalizeInvoice(invoiceId: string): Promise<ConnectorResponse<Invoice>> {
    throw new Error('Invoice finalization not directly supported by Paddle API');
  }

  async payInvoice(invoiceId: string): Promise<ConnectorResponse<Invoice>> {
    throw new Error('Invoice payment not directly supported by Paddle API');
  }

  async listInvoices(customerId?: string, request?: ListRequest): Promise<ConnectorResponse<ListResponse<Invoice>>> {
    throw new Error('Invoice listing not directly supported by Paddle API');
  }

  async createCoupon(request: CreateCouponRequest): Promise<ConnectorResponse<Coupon>> {
    try {
      const body: any = {
        coupon_type: request.metadata?.couponType || 'checkout',
        discount_type: request.type === 'percentage' ? 'percentage' : 'flat',
        discount_amount: request.value,
      };

      if (request.type === 'fixed_amount' && request.currency) {
        body.currency = request.currency;
      }

      if (request.code) {
        body.coupon_code = request.code;
      }

      if (request.metadata?.couponPrefix) {
        body.coupon_prefix = request.metadata.couponPrefix;
      }

      if (request.metadata?.numberOfCoupons) {
        body.num_coupons = request.metadata.numberOfCoupons;
      }

      if (request.maxUses) {
        body.allowed_uses = request.maxUses;
      }

      if (request.validUntil) {
        body.expires = new Date(request.validUntil).toISOString().split('T')[0];
      }

      if (request.metadata?.group) {
        body.group = request.metadata.group;
      }

      if (request.description) {
        body.description = request.description;
      }

      if (request.metadata?.recurring) {
        body.recurring = 1;
      }

      if (request.metadata?.productIds) {
        body.product_ids = request.metadata.productIds;
      }

      const response = await this.makePaddleRequest({
        method: 'POST',
        endpoint: '/2.1/product/create_coupon',
        body,
      });

      return {
        success: true,
        data: {
          code: response.response.coupon_codes?.[0] || request.code,
          type: request.type || 'percentage',
          value: request.value,
          currency: request.currency,
          description: request.description,
          maxUses: request.maxUses,
          validFrom: request.validFrom,
          validUntil: request.validUntil,
          active: true,
          metadata: request.metadata,
        },
      };
    } catch (error) {
      return {
        success: false,
        error: {
          code: 'CREATE_COUPON_FAILED',
          message: error.message,
        },
      };
    }
  }

  async getCoupon(couponId: string): Promise<ConnectorResponse<Coupon>> {
    throw new Error('Individual coupon retrieval not directly supported. Use listCoupons with productId.');
  }

  async updateCoupon(couponId: string, updates: Partial<Coupon>): Promise<ConnectorResponse<Coupon>> {
    try {
      const body: any = {};

      if (updates.metadata?.updateBy === 'group') {
        body.group = updates.metadata.group;
      } else {
        body.coupon_code = couponId;
      }

      if (updates.maxUses) {
        body.allowed_uses = updates.maxUses;
      }

      if (updates.currency) {
        body.currency = updates.currency;
      }

      if (updates.metadata?.newCouponCode) {
        body.new_coupon_code = updates.metadata.newCouponCode;
      }

      if (updates.validUntil) {
        body.expires = new Date(updates.validUntil).toISOString().split('T')[0];
      }

      if (updates.metadata?.newGroup) {
        body.new_group = updates.metadata.newGroup;
      }

      if (updates.metadata?.recurring !== undefined) {
        body.recurring = updates.metadata.recurring ? 1 : 0;
      }

      if (updates.metadata?.productIds) {
        body.product_ids = updates.metadata.productIds;
      }

      if (updates.value) {
        body.discount_amount = updates.value;
      }

      const response = await this.makePaddleRequest({
        method: 'POST',
        endpoint: '/2.1/product/update_coupon',
        body,
      });

      return {
        success: true,
        data: {
          code: couponId,
          type: updates.type || 'percentage',
          ...updates,
        } as Coupon,
      };
    } catch (error) {
      return {
        success: false,
        error: {
          code: 'UPDATE_COUPON_FAILED',
          message: error.message,
        },
      };
    }
  }

  async deleteCoupon(couponId: string): Promise<ConnectorResponse<void>> {
    throw new Error('Coupon deletion not directly supported by Paddle API');
  }

  async listCoupons(request?: ListRequest): Promise<ConnectorResponse<ListResponse<Coupon>>> {
    try {
      if (!request?.filters?.productId) {
        return {
          success: false,
          error: {
            code: 'PRODUCT_ID_REQUIRED',
            message: 'Product ID is required to list coupons',
          },
        };
      }

      const response = await this.makePaddleRequest({
        method: 'POST',
        endpoint: '/2.0/product/list_coupons',
        body: { product_id: request.filters.productId },
      });

      const coupons = response.response.map((c: any) => this.transformCoupon(c));
      const limit = request?.limit || 100;

      return {
        success: true,
        data: {
          data: coupons.slice(0, limit),
          hasMore: coupons.length > limit,
          totalCount: coupons.length,
        },
      };
    } catch (error) {
      return {
        success: false,
        error: {
          code: 'LIST_COUPONS_FAILED',
          message: error.message,
        },
      };
    }
  }

  // Additional Paddle-specific methods
  private async getPlan(planId: string): Promise<any> {
    try {
      const response = await this.makePaddleRequest({
        method: 'POST',
        endpoint: '/2.0/subscription/plans',
        body: { plan: planId },
      });

      return {
        success: true,
        data: response.response,
      };
    } catch (error) {
      return {
        success: false,
        error: {
          code: 'GET_PLAN_FAILED',
          message: error.message,
        },
      };
    }
  }

  private async listPlans(request?: ListRequest): Promise<any> {
    try {
      const response = await this.makePaddleRequest({
        method: 'POST',
        endpoint: '/2.0/subscription/plans',
        body: {},
      });

      const plans = response.response;
      const limit = request?.limit || 100;

      return {
        success: true,
        data: plans.slice(0, limit),
      };
    } catch (error) {
      return {
        success: false,
        error: {
          code: 'LIST_PLANS_FAILED',
          message: error.message,
        },
      };
    }
  }

  private async reschedulePayment(input: any): Promise<any> {
    try {
      const response = await this.makePaddleRequest({
        method: 'POST',
        endpoint: '/2.0/subscription/payments_reschedule',
        body: {
          payment_id: input.paymentId,
          date: input.date,
        },
      });

      return {
        success: true,
        data: response.response,
      };
    } catch (error) {
      return {
        success: false,
        error: {
          code: 'RESCHEDULE_PAYMENT_FAILED',
          message: error.message,
        },
      };
    }
  }

  // Transform methods
  private transformPayment(paddlePayment: any): Payment {
    return {
      id: paddlePayment.id?.toString(),
      amount: parseFloat(paddlePayment.amount || 0),
      currency: paddlePayment.currency || 'USD',
      status: this.mapPaymentStatus(paddlePayment.is_paid, paddlePayment.is_one_off_charge),
      customerId: paddlePayment.subscription_id?.toString(),
      description: paddlePayment.receipt_url,
      metadata: {
        payout_date: paddlePayment.payout_date,
        is_one_off_charge: paddlePayment.is_one_off_charge,
      },
      createdAt: new Date(paddlePayment.date),
    };
  }

  private transformProduct(paddleProduct: any): Product {
    return {
      id: paddleProduct.id?.toString(),
      name: paddleProduct.name,
      description: paddleProduct.description,
      price: parseFloat(paddleProduct.base_price || 0),
      currency: paddleProduct.currency || 'USD',
      sku: paddleProduct.id?.toString(),
      active: true,
      metadata: {
        icon: paddleProduct.icon,
      },
    };
  }

  private transformSubscription(paddleSubscription: any): Subscription {
    return {
      id: paddleSubscription.subscription_id?.toString(),
      customerId: paddleSubscription.user_id?.toString(),
      productId: paddleSubscription.subscription_plan_id?.toString(),
      status: this.mapSubscriptionStatus(paddleSubscription.state),
      billingCycle: 'monthly', // Paddle doesn't expose this directly
      amount: parseFloat(paddleSubscription.next_payment?.amount || 0),
      currency: paddleSubscription.next_payment?.currency || 'USD',
      startDate: new Date(paddleSubscription.signup_date),
      endDate: paddleSubscription.next_payment?.date ? new Date(paddleSubscription.next_payment.date) : undefined,
      metadata: {
        payment_information: paddleSubscription.payment_information,
        quantity: paddleSubscription.quantity,
      },
      createdAt: new Date(paddleSubscription.signup_date),
      updatedAt: new Date(paddleSubscription.last_modified),
    };
  }

  private transformCoupon(paddleCoupon: any): Coupon {
    return {
      id: paddleCoupon.coupon,
      code: paddleCoupon.coupon,
      type: paddleCoupon.discount_type === 'percentage' ? 'percentage' : 'fixed_amount',
      value: parseFloat(paddleCoupon.discount_amount || 0),
      currency: paddleCoupon.discount_currency,
      description: paddleCoupon.description,
      maxUses: paddleCoupon.allowed_uses,
      usedCount: paddleCoupon.times_used,
      validUntil: paddleCoupon.expires ? new Date(paddleCoupon.expires) : undefined,
      active: !paddleCoupon.expired,
      metadata: {
        product_ids: paddleCoupon.product_ids,
        is_recurring: paddleCoupon.is_recurring,
      },
    };
  }

  private mapPaymentStatus(isPaid: number | boolean, isOneOff: boolean): Payment['status'] {
    if (isPaid) return 'completed';
    if (isOneOff) return 'pending';
    return 'processing';
  }

  private mapSubscriptionStatus(state: string): Subscription['status'] {
    const statusMap: Record<string, Subscription['status']> = {
      active: 'active',
      past_due: 'past_due',
      trialing: 'active',
      paused: 'inactive',
      deleted: 'canceled',
    };
    return statusMap[state] || 'inactive';
  }
}
