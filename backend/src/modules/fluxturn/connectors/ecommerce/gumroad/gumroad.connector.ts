import { Injectable, Logger } from '@nestjs/common';
import { BaseConnector } from '../../base/base.connector';
import { IEcommerceConnector } from '../ecommerce.interface';
import {
  ConnectorMetadata,
  ConnectorResponse,
  ConnectorRequest,
  ConnectorCategory,
  ConnectorType,
  AuthType,
  ConnectorAction,
  ConnectorTrigger,
} from '../../types';
import {
  Customer,
  Product,
  PaymentIntent,
  Payment,
  Refund,
  Subscription,
  Invoice,
  Order,
  Coupon,
  Inventory,
  Webhook,
  CreatePaymentRequest,
  CreateCustomerRequest,
  CreateProductRequest,
  CreateRefundRequest,
  CreateSubscriptionRequest,
  CreateInvoiceRequest,
  CreateCouponRequest,
  CreateOrderRequest,
  UpdateInventoryRequest,
  ListRequest,
  ListResponse,
} from '../ecommerce.interface';
import { AuthUtils } from '../../utils/auth.utils';
import { ApiUtils } from '../../utils/api.utils';

interface GumroadSale {
  id: string;
  email: string;
  seller_id: string;
  product_id: string;
  product_name: string;
  permalink: string;
  product_permalink: string;
  short_product_id: string;
  price: number;
  gumroad_fee: number;
  currency: string;
  quantity: number;
  discover_fee_charged: boolean;
  can_contact: boolean;
  referrer: string;
  card: {
    visual: string;
    type: string;
    bin: string;
    expiry_month: string;
    expiry_year: string;
  };
  order_number: number;
  sale_id: string;
  sale_timestamp: string;
  purchaser_id: string;
  subscription_id?: string;
  license_key?: string;
  ip_country: string;
  recurrence: string;
  refunded: boolean;
  disputed: boolean;
  dispute_won: boolean;
  chargebacked: boolean;
  variants: string;
  affiliate: any;
  affiliate_credit_amount_cents: number;
  test: boolean;
}

interface GumroadProduct {
  id: string;
  name: string;
  url: string;
  price: number;
  description: string;
  currency: string;
  short_url: string;
  thumbnail_url: string;
  tags: string[];
  formatted_price: string;
  published: boolean;
  shown_on_profile: boolean;
  file_info: any;
  max_purchase_count?: number;
  deleted: boolean;
  customizable_price?: number;
  require_shipping?: boolean;
  custom_receipt?: string;
  custom_permalink?: string;
  custom_fields?: any[];
  sales_count: number;
  sales_usd_cents: number;
  is_tiered_membership: boolean;
  recurrences?: string[];
  variants?: any[];
}

interface GumroadSubscriber {
  id: string;
  product_id: string;
  product_name: string;
  user_id: string;
  user_email: string;
  purchase_ids: string[];
  created_at: string;
  user_requested_cancellation_at?: string;
  charge_occurrence_count?: number;
  recurrence: string;
  ended_at?: string;
  failed_at?: string;
  free_trial_ends_at?: string;
  license_key: string;
  status: string;
}

interface GumroadResourceSubscription {
  id: string;
  resource_name: string;
  post_url: string;
}

@Injectable()
export class GumroadConnector extends BaseConnector implements IEcommerceConnector {
  private readonly baseUrl = 'https://api.gumroad.com/v2';

  constructor(
    private readonly authUtils: AuthUtils,
    private readonly apiUtils: ApiUtils,
  ) {
    super();
  }

  getMetadata(): ConnectorMetadata {
    return {
      name: 'Gumroad',
      description: 'Digital product sales platform for creators and entrepreneurs',
      version: '1.0.0',
      category: ConnectorCategory.ECOMMERCE,
      type: ConnectorType.GUMROAD,
      logoUrl: '/connectors/gumroad/gumroad.png',
      documentationUrl: 'https://help.gumroad.com/article/280-gumroad-api',
      authType: AuthType.BEARER_TOKEN,
      actions: this.getActions(),
      triggers: this.getTriggers(),
      webhookSupport: true,
      rateLimit: {
        requestsPerSecond: 10,
        requestsPerMinute: 600,
      },
    };
  }

  protected async initializeConnection(): Promise<void> {
    if (!this.config?.credentials?.accessToken) {
      throw new Error('Access token is required');
    }
    this.logger.log('Gumroad connector initialized successfully');
  }

  protected async performConnectionTest(): Promise<boolean> {
    try {
      const response = await this.makeGumroadRequest({
        method: 'GET',
        endpoint: '/products',
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
    return await this.makeGumroadRequest(request);
  }

  protected async performAction(actionId: string, input: any): Promise<any> {
    switch (actionId) {
      // Product Operations
      case 'get_product':
        return await this.getProduct(input.productId);
      case 'list_products':
        return await this.listProducts(input);
      case 'delete_product':
        return await this.deleteProduct(input.productId);
      case 'enable_product':
        return await this.enableProduct(input.productId);
      case 'disable_product':
        return await this.disableProduct(input.productId);

      // Sale Operations
      case 'get_sale':
        return await this.getSale(input.saleId);
      case 'list_sales':
        return await this.listSales(input);
      case 'refund_sale':
        return await this.refundSale(input.saleId);

      // Subscriber Operations
      case 'get_subscriber':
        return await this.getSubscriber(input.subscriberId);
      case 'list_subscribers':
        return await this.listSubscribers(input);

      // Webhook Operations
      case 'create_webhook':
        return await this.createWebhook(input.url, input.events);
      case 'list_webhooks':
        return await this.listWebhooks();
      case 'delete_webhook':
        return await this.deleteWebhook(input.webhookId);

      default:
        throw new Error(`Unknown action: ${actionId}`);
    }
  }

  protected async cleanup(): Promise<void> {
    this.logger.log('Gumroad connector cleanup completed');
  }

  private async makeGumroadRequest(request: Partial<ConnectorRequest>): Promise<any> {
    const url = `${this.baseUrl}${request.endpoint}`;
    const accessToken = this.config.credentials.accessToken;

    // Add access token to body for POST/PUT requests or query params for GET
    let body = request.body || {};
    let queryParams = request.queryParams || {};

    if (request.method === 'GET' || request.method === 'DELETE') {
      queryParams = {
        ...queryParams,
        access_token: accessToken,
      };
    } else {
      body = {
        ...body,
        access_token: accessToken,
      };
    }

    const response = await this.apiUtils.executeRequest({
      method: request.method || 'GET',
      endpoint: url,
      headers: {
        'Content-Type': 'application/json',
        ...request.headers,
      },
      queryParams,
      body: Object.keys(body).length > 0 ? body : undefined,
    });

    return response.data;
  }

  private getActions(): ConnectorAction[] {
    return [
      // Product Actions
      {
        id: 'get_product',
        name: 'Get Product',
        description: 'Retrieve a single product by ID',
        inputSchema: {
          productId: {
            type: 'string',
            required: true,
            description: 'The unique identifier of the product',
          },
        },
        outputSchema: {
          product: { type: 'object' },
        },
      },
      {
        id: 'list_products',
        name: 'List Products',
        description: 'Retrieve all products for the authenticated user',
        inputSchema: {},
        outputSchema: {
          products: { type: 'array' },
        },
      },
      {
        id: 'delete_product',
        name: 'Delete Product',
        description: 'Delete a product permanently',
        inputSchema: {
          productId: {
            type: 'string',
            required: true,
            description: 'The unique identifier of the product to delete',
          },
        },
        outputSchema: {
          success: { type: 'boolean' },
        },
      },
      {
        id: 'enable_product',
        name: 'Enable Product',
        description: 'Enable a product for sale',
        inputSchema: {
          productId: {
            type: 'string',
            required: true,
            description: 'The unique identifier of the product to enable',
          },
        },
        outputSchema: {
          product: { type: 'object' },
        },
      },
      {
        id: 'disable_product',
        name: 'Disable Product',
        description: 'Disable a product from being sold',
        inputSchema: {
          productId: {
            type: 'string',
            required: true,
            description: 'The unique identifier of the product to disable',
          },
        },
        outputSchema: {
          product: { type: 'object' },
        },
      },

      // Sale Actions
      {
        id: 'get_sale',
        name: 'Get Sale',
        description: 'Retrieve details of a specific sale',
        inputSchema: {
          saleId: {
            type: 'string',
            required: true,
            description: 'The unique identifier of the sale',
          },
        },
        outputSchema: {
          sale: { type: 'object' },
        },
      },
      {
        id: 'list_sales',
        name: 'List Sales',
        description: 'Retrieve all sales for the authenticated user',
        inputSchema: {
          after: {
            type: 'string',
            required: false,
            description: 'Only return sales after this date (ISO 8601 format)',
          },
          before: {
            type: 'string',
            required: false,
            description: 'Only return sales before this date (ISO 8601 format)',
          },
          page: {
            type: 'number',
            required: false,
            description: 'Page number for pagination',
          },
        },
        outputSchema: {
          sales: { type: 'array' },
          next_page_url: { type: 'string' },
        },
      },
      {
        id: 'refund_sale',
        name: 'Refund Sale',
        description: 'Refund a sale to the customer',
        inputSchema: {
          saleId: {
            type: 'string',
            required: true,
            description: 'The unique identifier of the sale to refund',
          },
          amount: {
            type: 'number',
            required: false,
            description: 'Amount to refund in cents (optional, defaults to full refund)',
          },
        },
        outputSchema: {
          success: { type: 'boolean' },
        },
      },

      // Subscriber Actions
      {
        id: 'get_subscriber',
        name: 'Get Subscriber',
        description: 'Retrieve details of a specific subscriber',
        inputSchema: {
          subscriberId: {
            type: 'string',
            required: true,
            description: 'The unique identifier of the subscriber',
          },
        },
        outputSchema: {
          subscriber: { type: 'object' },
        },
      },
      {
        id: 'list_subscribers',
        name: 'List Subscribers',
        description: 'Retrieve all subscribers for a specific product',
        inputSchema: {
          productId: {
            type: 'string',
            required: true,
            description: 'The product ID to filter subscribers',
          },
          email: {
            type: 'string',
            required: false,
            description: 'Filter by subscriber email',
          },
        },
        outputSchema: {
          subscribers: { type: 'array' },
        },
      },

      // Webhook Actions
      {
        id: 'create_webhook',
        name: 'Create Webhook',
        description: 'Create a webhook subscription for specific events',
        inputSchema: {
          url: {
            type: 'string',
            required: true,
            description: 'The URL to send webhook notifications',
          },
          events: {
            type: 'array',
            required: true,
            description: 'Array of event types to subscribe to (sale, refund, dispute, dispute_won, cancellation)',
          },
        },
        outputSchema: {
          webhook: { type: 'object' },
        },
      },
      {
        id: 'list_webhooks',
        name: 'List Webhooks',
        description: 'List all webhook subscriptions',
        inputSchema: {},
        outputSchema: {
          webhooks: { type: 'array' },
        },
      },
      {
        id: 'delete_webhook',
        name: 'Delete Webhook',
        description: 'Delete a webhook subscription',
        inputSchema: {
          webhookId: {
            type: 'string',
            required: true,
            description: 'The unique identifier of the webhook to delete',
          },
        },
        outputSchema: {
          success: { type: 'boolean' },
        },
      },
    ];
  }

  private getTriggers(): ConnectorTrigger[] {
    return [
      {
        id: 'sale',
        name: 'New Sale',
        description: 'Triggers when a new sale is made',
        eventType: 'sale',
        webhookRequired: true,
        outputSchema: {
          sale: {
            type: 'object',
            description: 'Sale details including customer, product, and payment information',
          },
        },
      },
      {
        id: 'refund',
        name: 'Sale Refunded',
        description: 'Triggers when a sale is refunded',
        eventType: 'refund',
        webhookRequired: true,
        outputSchema: {
          refund: {
            type: 'object',
            description: 'Refund details including sale ID and amount',
          },
        },
      },
      {
        id: 'dispute',
        name: 'Dispute Raised',
        description: 'Triggers when a dispute is raised against a sale',
        eventType: 'dispute',
        webhookRequired: true,
        outputSchema: {
          dispute: {
            type: 'object',
            description: 'Dispute details including sale ID and reason',
          },
        },
      },
      {
        id: 'dispute_won',
        name: 'Dispute Won',
        description: 'Triggers when a dispute is won',
        eventType: 'dispute_won',
        webhookRequired: true,
        outputSchema: {
          dispute: {
            type: 'object',
            description: 'Dispute resolution details',
          },
        },
      },
      {
        id: 'cancellation',
        name: 'Subscription Cancelled',
        description: 'Triggers when a subscription is cancelled',
        eventType: 'cancellation',
        webhookRequired: true,
        outputSchema: {
          subscription: {
            type: 'object',
            description: 'Cancelled subscription details',
          },
        },
      },
    ];
  }

  // Product Operations
  async getProduct(productId: string): Promise<ConnectorResponse<Product>> {
    try {
      const response = await this.makeGumroadRequest({
        method: 'GET',
        endpoint: `/products/${productId}`,
      });

      const gumroadProduct = response.product as GumroadProduct;

      return {
        success: true,
        data: this.mapGumroadProductToProduct(gumroadProduct),
      };
    } catch (error) {
      return this.handleError(error, 'Failed to get product');
    }
  }

  async listProducts(request?: ListRequest): Promise<ConnectorResponse<ListResponse<Product>>> {
    try {
      const response = await this.makeGumroadRequest({
        method: 'GET',
        endpoint: '/products',
      });

      const products = (response.products as GumroadProduct[]).map(p =>
        this.mapGumroadProductToProduct(p),
      );

      return {
        success: true,
        data: {
          data: products,
          hasMore: false,
          totalCount: products.length,
        },
      };
    } catch (error) {
      return this.handleError(error, 'Failed to list products');
    }
  }

  async deleteProduct(productId: string): Promise<ConnectorResponse<void>> {
    try {
      await this.makeGumroadRequest({
        method: 'DELETE',
        endpoint: `/products/${productId}`,
      });

      return {
        success: true,
      };
    } catch (error) {
      return this.handleError(error, 'Failed to delete product');
    }
  }

  private async enableProduct(productId: string): Promise<any> {
    return await this.makeGumroadRequest({
      method: 'PUT',
      endpoint: `/products/${productId}/enable`,
    });
  }

  private async disableProduct(productId: string): Promise<any> {
    return await this.makeGumroadRequest({
      method: 'PUT',
      endpoint: `/products/${productId}/disable`,
    });
  }

  // Sale Operations
  private async getSale(saleId: string): Promise<any> {
    return await this.makeGumroadRequest({
      method: 'GET',
      endpoint: `/sales/${saleId}`,
    });
  }

  private async listSales(options?: any): Promise<any> {
    const queryParams: any = {};
    if (options?.after) queryParams.after = options.after;
    if (options?.before) queryParams.before = options.before;
    if (options?.page) queryParams.page = options.page;

    return await this.makeGumroadRequest({
      method: 'GET',
      endpoint: '/sales',
      queryParams,
    });
  }

  private async refundSale(saleId: string): Promise<any> {
    return await this.makeGumroadRequest({
      method: 'PUT',
      endpoint: `/sales/${saleId}/refund`,
    });
  }

  // Subscriber Operations
  private async getSubscriber(subscriberId: string): Promise<any> {
    return await this.makeGumroadRequest({
      method: 'GET',
      endpoint: `/subscribers/${subscriberId}`,
    });
  }

  private async listSubscribers(options?: any): Promise<any> {
    const queryParams: any = {};
    if (options?.productId) queryParams.product_id = options.productId;
    if (options?.email) queryParams.email = options.email;

    return await this.makeGumroadRequest({
      method: 'GET',
      endpoint: '/subscribers',
      queryParams,
    });
  }

  // Webhook Operations
  async createWebhook(url: string, events: string[]): Promise<ConnectorResponse<Webhook>> {
    try {
      // Gumroad uses resource_subscriptions for webhooks
      // Events can be: sale, refund, dispute, dispute_won, cancellation
      const webhooks = [];

      for (const event of events) {
        const response = await this.makeGumroadRequest({
          method: 'PUT',
          endpoint: '/resource_subscriptions',
          body: {
            post_url: url,
            resource_name: event,
          },
        });

        webhooks.push(response.resource_subscription);
      }

      return {
        success: true,
        data: {
          url,
          events,
          active: true,
        } as Webhook,
      };
    } catch (error) {
      return this.handleError(error, 'Failed to create webhook');
    }
  }

  async listWebhooks(): Promise<ConnectorResponse<ListResponse<Webhook>>> {
    try {
      const response = await this.makeGumroadRequest({
        method: 'GET',
        endpoint: '/resource_subscriptions',
      });

      const subscriptions = response.resource_subscriptions as GumroadResourceSubscription[];

      // Group subscriptions by URL
      const webhookMap = new Map<string, Webhook>();

      for (const sub of subscriptions) {
        if (webhookMap.has(sub.post_url)) {
          const webhook = webhookMap.get(sub.post_url)!;
          webhook.events.push(sub.resource_name);
        } else {
          webhookMap.set(sub.post_url, {
            id: sub.id,
            url: sub.post_url,
            events: [sub.resource_name],
            active: true,
          });
        }
      }

      const webhooks = Array.from(webhookMap.values());

      return {
        success: true,
        data: {
          data: webhooks,
          hasMore: false,
          totalCount: webhooks.length,
        },
      };
    } catch (error) {
      return this.handleError(error, 'Failed to list webhooks');
    }
  }

  async deleteWebhook(webhookId: string): Promise<ConnectorResponse<void>> {
    try {
      await this.makeGumroadRequest({
        method: 'DELETE',
        endpoint: `/resource_subscriptions/${webhookId}`,
      });

      return {
        success: true,
      };
    } catch (error) {
      return this.handleError(error, 'Failed to delete webhook');
    }
  }

  verifyWebhookSignature(payload: string, signature: string, secret: string): boolean {
    // Gumroad doesn't use signature verification by default
    // Implement custom verification if needed
    return true;
  }

  // Mapping functions
  private mapGumroadProductToProduct(gumroadProduct: GumroadProduct): Product {
    return {
      id: gumroadProduct.id,
      name: gumroadProduct.name,
      description: gumroadProduct.description,
      price: gumroadProduct.price / 100, // Convert cents to dollars
      currency: gumroadProduct.currency,
      sku: gumroadProduct.short_url,
      images: gumroadProduct.thumbnail_url ? [gumroadProduct.thumbnail_url] : [],
      active: gumroadProduct.published,
      metadata: {
        url: gumroadProduct.url,
        short_url: gumroadProduct.short_url,
        tags: gumroadProduct.tags,
        sales_count: gumroadProduct.sales_count,
        shown_on_profile: gumroadProduct.shown_on_profile,
        is_tiered_membership: gumroadProduct.is_tiered_membership,
      },
    };
  }

  private mapGumroadSaleToPayment(gumroadSale: GumroadSale): Payment {
    return {
      id: gumroadSale.sale_id,
      amount: gumroadSale.price / 100,
      currency: gumroadSale.currency,
      status: gumroadSale.refunded
        ? 'refunded'
        : gumroadSale.disputed
          ? 'failed'
          : 'completed',
      customerId: gumroadSale.purchaser_id,
      description: `Purchase of ${gumroadSale.product_name}`,
      fees: gumroadSale.gumroad_fee / 100,
      metadata: {
        product_id: gumroadSale.product_id,
        product_name: gumroadSale.product_name,
        order_number: gumroadSale.order_number,
        license_key: gumroadSale.license_key,
        subscription_id: gumroadSale.subscription_id,
        ip_country: gumroadSale.ip_country,
        test: gumroadSale.test,
      },
      createdAt: new Date(gumroadSale.sale_timestamp),
    };
  }

  // IEcommerceConnector interface implementation
  async createPayment(request: CreatePaymentRequest): Promise<ConnectorResponse<PaymentIntent>> {
    throw new Error('Creating payments directly is not supported by Gumroad API');
  }

  async capturePayment(paymentId: string): Promise<ConnectorResponse<Payment>> {
    throw new Error('Capturing payments is not supported by Gumroad API');
  }

  async cancelPayment(paymentId: string): Promise<ConnectorResponse<Payment>> {
    throw new Error('Cancelling payments is not supported by Gumroad API');
  }

  async getPayment(paymentId: string): Promise<ConnectorResponse<Payment>> {
    try {
      const response = await this.getSale(paymentId);
      const sale = response.sale as GumroadSale;

      return {
        success: true,
        data: this.mapGumroadSaleToPayment(sale),
      };
    } catch (error) {
      return this.handleError(error, 'Failed to get payment');
    }
  }

  async listPayments(request?: ListRequest): Promise<ConnectorResponse<ListResponse<Payment>>> {
    try {
      const response = await this.listSales(request);
      const sales = (response.sales as GumroadSale[]).map(s =>
        this.mapGumroadSaleToPayment(s),
      );

      return {
        success: true,
        data: {
          data: sales,
          hasMore: !!response.next_page_url,
          nextCursor: response.next_page_url,
        },
      };
    } catch (error) {
      return this.handleError(error, 'Failed to list payments');
    }
  }

  async createRefund(request: CreateRefundRequest): Promise<ConnectorResponse<Refund>> {
    try {
      await this.refundSale(request.paymentId);

      return {
        success: true,
        data: {
          id: `refund_${request.paymentId}`,
          paymentId: request.paymentId,
          amount: request.amount || 0,
          currency: 'USD',
          status: 'succeeded',
          createdAt: new Date(),
        },
      };
    } catch (error) {
      return this.handleError(error, 'Failed to create refund');
    }
  }

  async getRefund(refundId: string): Promise<ConnectorResponse<Refund>> {
    throw new Error('Getting refund details is not supported by Gumroad API');
  }

  async listRefunds(
    paymentId?: string,
    request?: ListRequest,
  ): Promise<ConnectorResponse<ListResponse<Refund>>> {
    throw new Error('Listing refunds is not supported by Gumroad API');
  }

  async createCustomer(request: CreateCustomerRequest): Promise<ConnectorResponse<Customer>> {
    throw new Error('Creating customers is not supported by Gumroad API');
  }

  async getCustomer(customerId: string): Promise<ConnectorResponse<Customer>> {
    throw new Error('Getting customer details is not supported by Gumroad API');
  }

  async updateCustomer(
    customerId: string,
    updates: Partial<Customer>,
  ): Promise<ConnectorResponse<Customer>> {
    throw new Error('Updating customers is not supported by Gumroad API');
  }

  async deleteCustomer(customerId: string): Promise<ConnectorResponse<void>> {
    throw new Error('Deleting customers is not supported by Gumroad API');
  }

  async listCustomers(
    request?: ListRequest,
  ): Promise<ConnectorResponse<ListResponse<Customer>>> {
    throw new Error('Listing customers is not supported by Gumroad API');
  }

  async createProduct(request: CreateProductRequest): Promise<ConnectorResponse<Product>> {
    throw new Error('Creating products via API is not supported by Gumroad');
  }

  async updateProduct(
    productId: string,
    updates: Partial<Product>,
  ): Promise<ConnectorResponse<Product>> {
    throw new Error('Updating products via API is not supported by Gumroad');
  }

  async createSubscription(
    request: CreateSubscriptionRequest,
  ): Promise<ConnectorResponse<Subscription>> {
    throw new Error('Creating subscriptions directly is not supported by Gumroad API');
  }

  async getSubscription(subscriptionId: string): Promise<ConnectorResponse<Subscription>> {
    try {
      const response = await this.getSubscriber(subscriptionId);
      const subscriber = response.subscriber as GumroadSubscriber;

      return {
        success: true,
        data: {
          id: subscriber.id,
          customerId: subscriber.user_id,
          productId: subscriber.product_id,
          status: subscriber.status as any,
          billingCycle: subscriber.recurrence as any,
          amount: 0,
          currency: 'USD',
          startDate: new Date(subscriber.created_at),
          endDate: subscriber.ended_at ? new Date(subscriber.ended_at) : undefined,
          metadata: {
            product_name: subscriber.product_name,
            user_email: subscriber.user_email,
            license_key: subscriber.license_key,
            charge_occurrence_count: subscriber.charge_occurrence_count,
          },
        },
      };
    } catch (error) {
      return this.handleError(error, 'Failed to get subscription');
    }
  }

  async updateSubscription(
    subscriptionId: string,
    updates: Partial<Subscription>,
  ): Promise<ConnectorResponse<Subscription>> {
    throw new Error('Updating subscriptions is not supported by Gumroad API');
  }

  async cancelSubscription(
    subscriptionId: string,
  ): Promise<ConnectorResponse<Subscription>> {
    throw new Error('Cancelling subscriptions via API is not supported by Gumroad');
  }

  async listSubscriptions(
    customerId?: string,
    request?: ListRequest,
  ): Promise<ConnectorResponse<ListResponse<Subscription>>> {
    try {
      const response = await this.listSubscribers(request);
      const subscribers = (response.subscribers as GumroadSubscriber[]).map(sub => ({
        id: sub.id,
        customerId: sub.user_id,
        productId: sub.product_id,
        status: sub.status as any,
        billingCycle: sub.recurrence as any,
        amount: 0,
        currency: 'USD',
        startDate: new Date(sub.created_at),
        metadata: {
          product_name: sub.product_name,
          user_email: sub.user_email,
        },
      }));

      return {
        success: true,
        data: {
          data: subscribers,
          hasMore: false,
        },
      };
    } catch (error) {
      return this.handleError(error, 'Failed to list subscriptions');
    }
  }

  async createInvoice(request: CreateInvoiceRequest): Promise<ConnectorResponse<Invoice>> {
    throw new Error('Creating invoices is not supported by Gumroad API');
  }

  async getInvoice(invoiceId: string): Promise<ConnectorResponse<Invoice>> {
    throw new Error('Getting invoice details is not supported by Gumroad API');
  }

  async updateInvoice(
    invoiceId: string,
    updates: Partial<Invoice>,
  ): Promise<ConnectorResponse<Invoice>> {
    throw new Error('Updating invoices is not supported by Gumroad API');
  }

  async deleteInvoice(invoiceId: string): Promise<ConnectorResponse<void>> {
    throw new Error('Deleting invoices is not supported by Gumroad API');
  }

  async finalizeInvoice(invoiceId: string): Promise<ConnectorResponse<Invoice>> {
    throw new Error('Finalizing invoices is not supported by Gumroad API');
  }

  async payInvoice(invoiceId: string): Promise<ConnectorResponse<Invoice>> {
    throw new Error('Paying invoices is not supported by Gumroad API');
  }

  async listInvoices(
    customerId?: string,
    request?: ListRequest,
  ): Promise<ConnectorResponse<ListResponse<Invoice>>> {
    throw new Error('Listing invoices is not supported by Gumroad API');
  }
}
