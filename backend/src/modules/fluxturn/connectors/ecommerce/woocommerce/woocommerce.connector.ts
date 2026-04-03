import { Request } from 'express';
import { Injectable, Logger } from '@nestjs/common';
import { BaseConnector } from '../../base/base.connector';
import { IEcommerceConnector } from '../ecommerce.interface';
import {
  ConnectorConfig,
  ConnectorResponse,
  ConnectorRequest,
  ConnectorMetadata,
  ConnectorCategory,
  ConnectorType,
  AuthType,
  ConnectorAction,
  ConnectorTrigger
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
  OrderItem,
  Coupon,
  Discount,
  Inventory,
  Webhook,
  CreatePaymentRequest,
  CreateCustomerRequest,
  CreateProductRequest,
  CreateOrderRequest,
  CreateCouponRequest,
  UpdateInventoryRequest,
  ListRequest,
  ListResponse
} from '../ecommerce.interface';
import axios, { AxiosInstance } from 'axios';

@Injectable()
export class WooCommerceConnector extends BaseConnector implements IEcommerceConnector {
  private axiosClient: AxiosInstance;
  private baseUrl: string;

  getMetadata(): ConnectorMetadata {
    return {
      name: 'WooCommerce',
      description: 'WooCommerce e-commerce platform for WordPress-based online stores',
      version: '1.0.0',
      category: ConnectorCategory.ECOMMERCE,
      type: ConnectorType.WOOCOMMERCE,
      logoUrl: 'https://woocommerce.com/wp-content/themes/woo/images/logo-woocommerce@2x.png',
      documentationUrl: 'https://woocommerce.github.io/woocommerce-rest-api-docs/',
      authType: AuthType.BASIC_AUTH,
      requiredScopes: ['read', 'write'],
      actions: this.getActions(),
      triggers: this.getTriggers(),
      rateLimit: {
        requestsPerSecond: 10,
        requestsPerMinute: 600,
        burstLimit: 10
      },
      webhookSupport: true
    };
  }

  protected async initializeConnection(): Promise<void> {
    if (!this.config?.credentials?.username || !this.config?.credentials?.password || !this.config?.credentials?.domain) {
      throw new Error('WooCommerce consumer key, consumer secret, and domain are required');
    }

    this.baseUrl = this.config.credentials.domain.startsWith('http')
      ? this.config.credentials.domain
      : `https://${this.config.credentials.domain}`;

    // Ensure the domain ends with the WooCommerce REST API path
    if (!this.baseUrl.includes('/wp-json/wc/v3')) {
      this.baseUrl = `${this.baseUrl.replace(/\/$/, '')}/wp-json/wc/v3`;
    }

    // Check if using HTTPS - WooCommerce requires query string auth for HTTP (non-HTTPS)
    const isHttps = this.baseUrl.toLowerCase().startsWith('https://');

    if (isHttps) {
      // Use Basic Auth for HTTPS connections
      this.axiosClient = axios.create({
        baseURL: this.baseUrl,
        timeout: 30000,
        auth: {
          username: this.config.credentials.username, // Consumer Key
          password: this.config.credentials.password   // Consumer Secret
        },
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        }
      });
    } else {
      // For HTTP (localhost), use query string authentication
      // WooCommerce requires this for non-HTTPS connections
      this.axiosClient = axios.create({
        baseURL: this.baseUrl,
        timeout: 30000,
        params: {
          consumer_key: this.config.credentials.username,
          consumer_secret: this.config.credentials.password
        },
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        }
      });
    }

    this.logger.log(`WooCommerce connector initialized (${isHttps ? 'HTTPS/Basic Auth' : 'HTTP/Query String Auth'})`);
  }

  protected async performConnectionTest(): Promise<boolean> {
    try {
      // Test connection by getting system status or store info
      const response = await this.axiosClient.get('/system_status');
      this.logger.debug(`Connected to WooCommerce store: ${response.data.environment?.site_url || 'Unknown'}`);
      return true;
    } catch (error) {
      // Fallback to products endpoint if system_status is not accessible
      try {
        await this.axiosClient.get('/products?per_page=1');
        this.logger.debug('WooCommerce connection test passed via products endpoint');
        return true;
      } catch (fallbackError) {
        this.logger.error('WooCommerce connection test failed:', error);
        throw error;
      }
    }
  }

  protected async performHealthCheck(): Promise<void> {
    await this.axiosClient.get('/products?per_page=1');
  }

  protected async performRequest(request: ConnectorRequest): Promise<any> {
    const config = {
      method: request.method,
      url: request.endpoint,
      headers: request.headers,
      data: request.body,
      params: request.queryParams
    };

    const response = await this.axiosClient.request(config);
    return response.data;
  }

  protected async performAction(actionId: string, input: any): Promise<any> {
    switch (actionId) {
      case 'get_order':
        return this.getOrder(input.orderId);
      case 'create_product':
        return this.createProduct(input);
      case 'create_customer':
        return this.createCustomer(input);
      case 'create_order':
        return this.createOrder(input);
      case 'update_stock':
        return this.updateInventory(input);
      case 'create_coupon':
        return this.createCoupon(input);
      case 'create_category':
        return this.createCategory(input.name, input.description, input.parentId);
      default:
        throw new Error(`Unknown action: ${actionId}`);
    }
  }

  protected async cleanup(): Promise<void> {
    // No specific cleanup needed for WooCommerce
  }

  // Payment Operations (WooCommerce handles payments through gateways)
  async createPayment(request: CreatePaymentRequest): Promise<ConnectorResponse<PaymentIntent>> {
    try {
      // WooCommerce doesn't have direct payment creation - payments are created through orders
      // We'll create an order instead that represents the payment intent
      const orderData = {
        status: 'pending',
        currency: request.currency.toUpperCase(),
        customer_id: request.customerId ? parseInt(request.customerId) : undefined,
        line_items: [{
          name: request.description || 'Payment',
          product_id: 0, // Virtual product
          quantity: 1,
          total: request.amount.toFixed(2)
        }],
        shipping_total: '0.00',
        shipping_tax: '0.00',
        fee_lines: [],
        coupon_lines: [],
        meta_data: request.metadata ? Object.entries(request.metadata).map(([key, value]) => ({
          key,
          value: typeof value === 'string' ? value : JSON.stringify(value)
        })) : []
      };

      const response = await this.axiosClient.post('/orders', orderData);
      const order = response.data;

      const result: PaymentIntent = {
        id: order.id.toString(),
        amount: request.amount,
        currency: request.currency.toUpperCase(),
        customerId: request.customerId,
        description: request.description,
        metadata: request.metadata,
        status: 'pending',
        clientSecret: order.payment_url || undefined,
        createdAt: new Date(order.date_created),
        updatedAt: new Date(order.date_modified)
      };

      return {
        success: true,
        data: result,
        metadata: {
          timestamp: new Date(),
          rateLimit: await this.getRateLimitInfo()
        }
      };
    } catch (error) {
      return this.handleError(error as any, 'Failed to create payment');
    }
  }

  async capturePayment(paymentId: string): Promise<ConnectorResponse<Payment>> {
    try {
      // Update order status to completed (indicating payment capture)
      const updateData = {
        status: 'completed'
      };

      const response = await this.axiosClient.put(`/orders/${paymentId}`, updateData);
      const order = response.data;

      const result: Payment = {
        id: order.id.toString(),
        amount: parseFloat(order.total),
        currency: order.currency,
        status: this.mapOrderStatus(order.status),
        customerId: order.customer_id?.toString(),
        description: order.customer_note,
        metadata: this.extractMetadata(order.meta_data),
        createdAt: new Date(order.date_created),
        updatedAt: new Date(order.date_modified)
      };

      return {
        success: true,
        data: result,
        metadata: {
          timestamp: new Date(),
          rateLimit: await this.getRateLimitInfo()
        }
      };
    } catch (error) {
      return this.handleError(error as any, 'Failed to capture payment');
    }
  }

  async cancelPayment(paymentId: string): Promise<ConnectorResponse<Payment>> {
    try {
      // Update order status to cancelled
      const updateData = {
        status: 'cancelled'
      };

      const response = await this.axiosClient.put(`/orders/${paymentId}`, updateData);
      const order = response.data;

      const result: Payment = {
        id: order.id.toString(),
        amount: parseFloat(order.total),
        currency: order.currency,
        status: 'failed',
        customerId: order.customer_id?.toString(),
        description: order.customer_note,
        metadata: this.extractMetadata(order.meta_data),
        createdAt: new Date(order.date_created),
        updatedAt: new Date(order.date_modified)
      };

      return {
        success: true,
        data: result,
        metadata: {
          timestamp: new Date(),
          rateLimit: await this.getRateLimitInfo()
        }
      };
    } catch (error) {
      return this.handleError(error as any, 'Failed to cancel payment');
    }
  }

  async getPayment(paymentId: string): Promise<ConnectorResponse<Payment>> {
    try {
      const response = await this.axiosClient.get(`/orders/${paymentId}`);
      const order = response.data;

      const result: Payment = {
        id: order.id.toString(),
        amount: parseFloat(order.total),
        currency: order.currency,
        status: this.mapOrderStatus(order.status),
        customerId: order.customer_id?.toString(),
        description: order.customer_note,
        metadata: this.extractMetadata(order.meta_data),
        createdAt: new Date(order.date_created),
        updatedAt: new Date(order.date_modified)
      };

      return {
        success: true,
        data: result,
        metadata: {
          timestamp: new Date(),
          rateLimit: await this.getRateLimitInfo()
        }
      };
    } catch (error) {
      return this.handleError(error as any, 'Failed to get payment');
    }
  }

  async listPayments(request?: ListRequest): Promise<ConnectorResponse<ListResponse<Payment>>> {
    try {
      const params = {
        per_page: request?.limit || 10,
        page: 1,
        status: 'completed' // Only get paid orders
      };

      const response = await this.axiosClient.get('/orders', { params });
      const orders = response.data;

      const payments: Payment[] = orders.map((order: any) => ({
        id: order.id.toString(),
        amount: parseFloat(order.total),
        currency: order.currency,
        status: this.mapOrderStatus(order.status),
        customerId: order.customer_id?.toString(),
        description: order.customer_note,
        metadata: this.extractMetadata(order.meta_data),
        createdAt: new Date(order.date_created),
        updatedAt: new Date(order.date_modified)
      }));

      const result: ListResponse<Payment> = {
        data: payments,
        hasMore: payments.length === (request?.limit || 10),
        nextCursor: payments.length > 0 ? payments[payments.length - 1].id : undefined
      };

      return {
        success: true,
        data: result,
        metadata: {
          timestamp: new Date(),
          rateLimit: await this.getRateLimitInfo()
        }
      };
    } catch (error) {
      return this.handleError(error as any, 'Failed to list payments');
    }
  }

  // Refund Operations
  async createRefund(request: any): Promise<ConnectorResponse<Refund>> {
    try {
      const refundData = {
        amount: request.amount?.toFixed(2),
        reason: request.reason || 'Refund via API',
        api_refund: false // Set to true if you want WooCommerce to process the refund automatically
      };

      const response = await this.axiosClient.post(`/orders/${request.paymentId}/refunds`, refundData);
      const refund = response.data;

      const result: Refund = {
        id: refund.id.toString(),
        paymentId: request.paymentId,
        amount: parseFloat(refund.amount),
        currency: 'USD', // WooCommerce doesn't provide currency in refund response
        reason: refund.reason,
        status: 'succeeded',
        metadata: request.metadata,
        createdAt: new Date(refund.date_created)
      };

      return {
        success: true,
        data: result,
        metadata: {
          timestamp: new Date(),
          rateLimit: await this.getRateLimitInfo()
        }
      };
    } catch (error) {
      return this.handleError(error as any, 'Failed to create refund');
    }
  }

  async getRefund(refundId: string): Promise<ConnectorResponse<Refund>> {
    try {
      // WooCommerce requires both order ID and refund ID, so we'll need to search
      // This is a limitation of the API structure
      throw new Error('Get refund by ID not supported - use listRefunds with order ID');
    } catch (error) {
      return this.handleError(error as any, 'Failed to get refund');
    }
  }

  async listRefunds(paymentId?: string, request?: ListRequest): Promise<ConnectorResponse<ListResponse<Refund>>> {
    try {
      if (!paymentId) {
        throw new Error('Order ID is required for listing refunds');
      }

      const response = await this.axiosClient.get(`/orders/${paymentId}/refunds`);
      const refunds: Refund[] = response.data.map((refund: any) => ({
        id: refund.id.toString(),
        paymentId: paymentId,
        amount: parseFloat(refund.amount),
        currency: 'USD',
        reason: refund.reason,
        status: 'succeeded',
        metadata: {},
        createdAt: new Date(refund.date_created)
      }));

      const result: ListResponse<Refund> = {
        data: refunds,
        hasMore: false,
        nextCursor: undefined
      };

      return {
        success: true,
        data: result,
        metadata: {
          timestamp: new Date(),
          rateLimit: await this.getRateLimitInfo()
        }
      };
    } catch (error) {
      return this.handleError(error as any, 'Failed to list refunds');
    }
  }

  // Customer Operations
  async createCustomer(request: CreateCustomerRequest): Promise<ConnectorResponse<Customer>> {
    try {
      const customerData = {
        email: request.email,
        first_name: request.firstName,
        last_name: request.lastName,
        billing: request.address ? {
          first_name: request.firstName,
          last_name: request.lastName,
          address_1: request.address.line1,
          address_2: request.address.line2,
          city: request.address.city,
          state: request.address.state,
          postcode: request.address.postalCode,
          country: request.address.country,
          email: request.email,
          phone: request.phone
        } : {},
        shipping: request.address ? {
          first_name: request.firstName,
          last_name: request.lastName,
          address_1: request.address.line1,
          address_2: request.address.line2,
          city: request.address.city,
          state: request.address.state,
          postcode: request.address.postalCode,
          country: request.address.country
        } : {},
        meta_data: request.metadata ? Object.entries(request.metadata).map(([key, value]) => ({
          key,
          value: typeof value === 'string' ? value : JSON.stringify(value)
        })) : []
      };

      const response = await this.axiosClient.post('/customers', customerData);
      const customer = response.data;

      const result: Customer = {
        id: customer.id.toString(),
        email: customer.email,
        firstName: customer.first_name,
        lastName: customer.last_name,
        phone: customer.billing?.phone,
        address: customer.billing ? {
          line1: customer.billing.address_1,
          line2: customer.billing.address_2,
          city: customer.billing.city,
          state: customer.billing.state,
          postalCode: customer.billing.postcode,
          country: customer.billing.country
        } : undefined,
        metadata: this.extractMetadata(customer.meta_data),
        createdAt: new Date(customer.date_created),
        updatedAt: new Date(customer.date_modified)
      };

      return {
        success: true,
        data: result,
        metadata: {
          timestamp: new Date(),
          rateLimit: await this.getRateLimitInfo()
        }
      };
    } catch (error) {
      return this.handleError(error as any, 'Failed to create customer');
    }
  }

  async getCustomer(customerId: string): Promise<ConnectorResponse<Customer>> {
    try {
      const response = await this.axiosClient.get(`/customers/${customerId}`);
      const customer = response.data;

      const result: Customer = {
        id: customer.id.toString(),
        email: customer.email,
        firstName: customer.first_name,
        lastName: customer.last_name,
        phone: customer.billing?.phone,
        address: customer.billing ? {
          line1: customer.billing.address_1,
          line2: customer.billing.address_2,
          city: customer.billing.city,
          state: customer.billing.state,
          postalCode: customer.billing.postcode,
          country: customer.billing.country
        } : undefined,
        metadata: this.extractMetadata(customer.meta_data),
        createdAt: new Date(customer.date_created),
        updatedAt: new Date(customer.date_modified)
      };

      return {
        success: true,
        data: result,
        metadata: {
          timestamp: new Date(),
          rateLimit: await this.getRateLimitInfo()
        }
      };
    } catch (error) {
      return this.handleError(error as any, 'Failed to get customer');
    }
  }

  async updateCustomer(customerId: string, updates: Partial<Customer>): Promise<ConnectorResponse<Customer>> {
    try {
      const updateData: any = {};

      if (updates.email) updateData.email = updates.email;
      if (updates.firstName) updateData.first_name = updates.firstName;
      if (updates.lastName) updateData.last_name = updates.lastName;

      if (updates.address || updates.phone) {
        updateData.billing = {};
        if (updates.phone) updateData.billing.phone = updates.phone;
        if (updates.address) {
          updateData.billing.address_1 = updates.address.line1;
          updateData.billing.address_2 = updates.address.line2;
          updateData.billing.city = updates.address.city;
          updateData.billing.state = updates.address.state;
          updateData.billing.postcode = updates.address.postalCode;
          updateData.billing.country = updates.address.country;
        }
      }

      if (updates.metadata) {
        updateData.meta_data = Object.entries(updates.metadata).map(([key, value]) => ({
          key,
          value: typeof value === 'string' ? value : JSON.stringify(value)
        }));
      }

      const response = await this.axiosClient.put(`/customers/${customerId}`, updateData);
      const customer = response.data;

      const result: Customer = {
        id: customer.id.toString(),
        email: customer.email,
        firstName: customer.first_name,
        lastName: customer.last_name,
        phone: customer.billing?.phone,
        address: customer.billing ? {
          line1: customer.billing.address_1,
          line2: customer.billing.address_2,
          city: customer.billing.city,
          state: customer.billing.state,
          postalCode: customer.billing.postcode,
          country: customer.billing.country
        } : undefined,
        metadata: this.extractMetadata(customer.meta_data),
        createdAt: new Date(customer.date_created),
        updatedAt: new Date(customer.date_modified)
      };

      return {
        success: true,
        data: result,
        metadata: {
          timestamp: new Date(),
          rateLimit: await this.getRateLimitInfo()
        }
      };
    } catch (error) {
      return this.handleError(error as any, 'Failed to update customer');
    }
  }

  async deleteCustomer(customerId: string): Promise<ConnectorResponse<void>> {
    try {
      await this.axiosClient.delete(`/customers/${customerId}?force=true`);

      return {
        success: true,
        metadata: {
          timestamp: new Date(),
          rateLimit: await this.getRateLimitInfo()
        }
      };
    } catch (error) {
      return this.handleError(error as any, 'Failed to delete customer');
    }
  }

  async listCustomers(request?: ListRequest): Promise<ConnectorResponse<ListResponse<Customer>>> {
    try {
      const params = {
        per_page: request?.limit || 10,
        page: 1
      };

      const response = await this.axiosClient.get('/customers', { params });
      const customers = response.data;

      const customersList: Customer[] = customers.map((customer: any) => ({
        id: customer.id.toString(),
        email: customer.email,
        firstName: customer.first_name,
        lastName: customer.last_name,
        phone: customer.billing?.phone,
        address: customer.billing ? {
          line1: customer.billing.address_1,
          line2: customer.billing.address_2,
          city: customer.billing.city,
          state: customer.billing.state,
          postalCode: customer.billing.postcode,
          country: customer.billing.country
        } : undefined,
        metadata: this.extractMetadata(customer.meta_data),
        createdAt: new Date(customer.date_created),
        updatedAt: new Date(customer.date_modified)
      }));

      const result: ListResponse<Customer> = {
        data: customersList,
        hasMore: customersList.length === (request?.limit || 10),
        nextCursor: customersList.length > 0 ? customersList[customersList.length - 1].id : undefined
      };

      return {
        success: true,
        data: result,
        metadata: {
          timestamp: new Date(),
          rateLimit: await this.getRateLimitInfo()
        }
      };
    } catch (error) {
      return this.handleError(error as any, 'Failed to list customers');
    }
  }

  // Product Operations
  async createProduct(request: CreateProductRequest): Promise<ConnectorResponse<Product>> {
    try {
      const productData = {
        name: request.name,
        description: request.description,
        short_description: request.description,
        type: 'simple',
        regular_price: request.price?.toFixed(2) || '0.00',
        sku: request.sku,
        manage_stock: request.inventory !== undefined,
        stock_quantity: request.inventory || 0,
        in_stock: (request.inventory || 0) > 0,
        images: request.images ? request.images.map(src => ({ src })) : [],
        categories: request.category ? [{ name: request.category }] : [],
        status: request.active !== false ? 'publish' : 'draft',
        meta_data: request.metadata ? Object.entries(request.metadata).map(([key, value]) => ({
          key,
          value: typeof value === 'string' ? value : JSON.stringify(value)
        })) : []
      };

      const response = await this.axiosClient.post('/products', productData);
      const product = response.data;

      const result: Product = {
        id: product.id.toString(),
        name: product.name,
        description: product.description,
        price: parseFloat(product.regular_price || '0'),
        currency: 'USD', // WooCommerce doesn't specify currency in product response
        sku: product.sku,
        inventory: product.stock_quantity,
        images: product.images?.map((img: any) => img.src) || [],
        category: product.categories?.[0]?.name,
        active: product.status === 'publish',
        metadata: this.extractMetadata(product.meta_data),
        createdAt: new Date(product.date_created),
        updatedAt: new Date(product.date_modified)
      };

      return {
        success: true,
        data: result,
        metadata: {
          timestamp: new Date(),
          rateLimit: await this.getRateLimitInfo()
        }
      };
    } catch (error) {
      return this.handleError(error as any, 'Failed to create product');
    }
  }

  async getProduct(productId: string): Promise<ConnectorResponse<Product>> {
    try {
      const response = await this.axiosClient.get(`/products/${productId}`);
      const product = response.data;

      const result: Product = {
        id: product.id.toString(),
        name: product.name,
        description: product.description,
        price: parseFloat(product.regular_price || '0'),
        currency: 'USD',
        sku: product.sku,
        inventory: product.stock_quantity,
        images: product.images?.map((img: any) => img.src) || [],
        category: product.categories?.[0]?.name,
        active: product.status === 'publish',
        metadata: this.extractMetadata(product.meta_data),
        createdAt: new Date(product.date_created),
        updatedAt: new Date(product.date_modified)
      };

      return {
        success: true,
        data: result,
        metadata: {
          timestamp: new Date(),
          rateLimit: await this.getRateLimitInfo()
        }
      };
    } catch (error) {
      return this.handleError(error as any, 'Failed to get product');
    }
  }

  async updateProduct(productId: string, updates: Partial<Product>): Promise<ConnectorResponse<Product>> {
    try {
      const updateData: any = {};

      if (updates.name) updateData.name = updates.name;
      if (updates.description !== undefined) updateData.description = updates.description;
      if (updates.price !== undefined) updateData.regular_price = updates.price.toFixed(2);
      if (updates.sku) updateData.sku = updates.sku;
      if (updates.inventory !== undefined) {
        updateData.stock_quantity = updates.inventory;
        updateData.manage_stock = true;
        updateData.in_stock = updates.inventory > 0;
      }
      if (updates.images) updateData.images = updates.images.map(src => ({ src }));
      if (updates.category) updateData.categories = [{ name: updates.category }];
      if (updates.active !== undefined) updateData.status = updates.active ? 'publish' : 'draft';

      if (updates.metadata) {
        updateData.meta_data = Object.entries(updates.metadata).map(([key, value]) => ({
          key,
          value: typeof value === 'string' ? value : JSON.stringify(value)
        }));
      }

      const response = await this.axiosClient.put(`/products/${productId}`, updateData);
      const product = response.data;

      const result: Product = {
        id: product.id.toString(),
        name: product.name,
        description: product.description,
        price: parseFloat(product.regular_price || '0'),
        currency: 'USD',
        sku: product.sku,
        inventory: product.stock_quantity,
        images: product.images?.map((img: any) => img.src) || [],
        category: product.categories?.[0]?.name,
        active: product.status === 'publish',
        metadata: this.extractMetadata(product.meta_data),
        createdAt: new Date(product.date_created),
        updatedAt: new Date(product.date_modified)
      };

      return {
        success: true,
        data: result,
        metadata: {
          timestamp: new Date(),
          rateLimit: await this.getRateLimitInfo()
        }
      };
    } catch (error) {
      return this.handleError(error as any, 'Failed to update product');
    }
  }

  async deleteProduct(productId: string): Promise<ConnectorResponse<void>> {
    try {
      await this.axiosClient.delete(`/products/${productId}?force=true`);

      return {
        success: true,
        metadata: {
          timestamp: new Date(),
          rateLimit: await this.getRateLimitInfo()
        }
      };
    } catch (error) {
      return this.handleError(error as any, 'Failed to delete product');
    }
  }

  async listProducts(request?: ListRequest): Promise<ConnectorResponse<ListResponse<Product>>> {
    try {
      const params = {
        per_page: request?.limit || 10,
        page: 1
      };

      const response = await this.axiosClient.get('/products', { params });
      const products = response.data;

      const productsList: Product[] = products.map((product: any) => ({
        id: product.id.toString(),
        name: product.name,
        description: product.description,
        price: parseFloat(product.regular_price || '0'),
        currency: 'USD',
        sku: product.sku,
        inventory: product.stock_quantity,
        images: product.images?.map((img: any) => img.src) || [],
        category: product.categories?.[0]?.name,
        active: product.status === 'publish',
        metadata: this.extractMetadata(product.meta_data),
        createdAt: new Date(product.date_created),
        updatedAt: new Date(product.date_modified)
      }));

      const result: ListResponse<Product> = {
        data: productsList,
        hasMore: productsList.length === (request?.limit || 10),
        nextCursor: productsList.length > 0 ? productsList[productsList.length - 1].id : undefined
      };

      return {
        success: true,
        data: result,
        metadata: {
          timestamp: new Date(),
          rateLimit: await this.getRateLimitInfo()
        }
      };
    } catch (error) {
      return this.handleError(error as any, 'Failed to list products');
    }
  }

  // Subscription Operations (WooCommerce Subscriptions plugin required)
  async createSubscription(): Promise<ConnectorResponse<Subscription>> {
    throw new Error('Subscriptions require WooCommerce Subscriptions plugin - not implemented');
  }

  async getSubscription(): Promise<ConnectorResponse<Subscription>> {
    throw new Error('Subscriptions require WooCommerce Subscriptions plugin - not implemented');
  }

  async updateSubscription(): Promise<ConnectorResponse<Subscription>> {
    throw new Error('Subscriptions require WooCommerce Subscriptions plugin - not implemented');
  }

  async cancelSubscription(): Promise<ConnectorResponse<Subscription>> {
    throw new Error('Subscriptions require WooCommerce Subscriptions plugin - not implemented');
  }

  async listSubscriptions(): Promise<ConnectorResponse<ListResponse<Subscription>>> {
    throw new Error('Subscriptions require WooCommerce Subscriptions plugin - not implemented');
  }

  // Invoice Operations (WooCommerce handles invoices through orders)
  async createInvoice(): Promise<ConnectorResponse<Invoice>> {
    throw new Error('Invoices are handled through orders in WooCommerce');
  }

  async getInvoice(): Promise<ConnectorResponse<Invoice>> {
    throw new Error('Invoices are handled through orders in WooCommerce');
  }

  async updateInvoice(): Promise<ConnectorResponse<Invoice>> {
    throw new Error('Invoices are handled through orders in WooCommerce');
  }

  async deleteInvoice(): Promise<ConnectorResponse<void>> {
    throw new Error('Invoices are handled through orders in WooCommerce');
  }

  async finalizeInvoice(): Promise<ConnectorResponse<Invoice>> {
    throw new Error('Invoices are handled through orders in WooCommerce');
  }

  async payInvoice(): Promise<ConnectorResponse<Invoice>> {
    throw new Error('Invoices are handled through orders in WooCommerce');
  }

  async listInvoices(): Promise<ConnectorResponse<ListResponse<Invoice>>> {
    throw new Error('Invoices are handled through orders in WooCommerce');
  }

  // Order Operations
  async createOrder(request: CreateOrderRequest): Promise<ConnectorResponse<Order>> {
    try {
      const orderData = {
        customer_id: request.customerId ? parseInt(request.customerId) : undefined,
        line_items: request.items.map(item => ({
          product_id: parseInt(item.productId),
          quantity: item.quantity,
          total: (item.unitPrice * item.quantity).toFixed(2)
        })),
        billing: request.billingAddress ? {
          first_name: request.billingAddress.line1.split(' ')[0] || '',
          last_name: request.billingAddress.line1.split(' ').slice(1).join(' ') || '',
          address_1: request.billingAddress.line1,
          address_2: request.billingAddress.line2,
          city: request.billingAddress.city,
          state: request.billingAddress.state,
          postcode: request.billingAddress.postalCode,
          country: request.billingAddress.country
        } : {},
        shipping: request.shippingAddress ? {
          first_name: request.shippingAddress.line1.split(' ')[0] || '',
          last_name: request.shippingAddress.line1.split(' ').slice(1).join(' ') || '',
          address_1: request.shippingAddress.line1,
          address_2: request.shippingAddress.line2,
          city: request.shippingAddress.city,
          state: request.shippingAddress.state,
          postcode: request.shippingAddress.postalCode,
          country: request.shippingAddress.country
        } : {},
        status: 'pending',
        meta_data: request.metadata ? Object.entries(request.metadata).map(([key, value]) => ({
          key,
          value: typeof value === 'string' ? value : JSON.stringify(value)
        })) : []
      };

      const response = await this.axiosClient.post('/orders', orderData);
      const order = response.data;

      const result: Order = {
        id: order.id.toString(),
        customerId: order.customer_id?.toString(),
        status: this.mapWooOrderStatus(order.status),
        items: order.line_items.map((item: any) => ({
          id: item.id.toString(),
          productId: item.product_id.toString(),
          productName: item.name,
          quantity: item.quantity,
          unitPrice: parseFloat(item.price),
          totalPrice: parseFloat(item.total),
          sku: item.sku
        })),
        subtotal: parseFloat(order.total) - parseFloat(order.total_tax || '0') - parseFloat(order.shipping_total || '0'),
        tax: parseFloat(order.total_tax || '0'),
        shipping: parseFloat(order.shipping_total || '0'),
        total: parseFloat(order.total),
        currency: order.currency,
        paymentStatus: this.mapPaymentStatus(order.status),
        shippingAddress: request.shippingAddress,
        billingAddress: request.billingAddress,
        metadata: this.extractMetadata(order.meta_data),
        createdAt: new Date(order.date_created),
        updatedAt: new Date(order.date_modified)
      };

      return {
        success: true,
        data: result,
        metadata: {
          timestamp: new Date(),
          rateLimit: await this.getRateLimitInfo()
        }
      };
    } catch (error) {
      return this.handleError(error as any, 'Failed to create order');
    }
  }

  async getOrder(orderId: string): Promise<ConnectorResponse<Order>> {
    try {
      const response = await this.axiosClient.get(`/orders/${orderId}`);
      const order = response.data;

      const result: Order = {
        id: order.id.toString(),
        customerId: order.customer_id?.toString(),
        status: this.mapWooOrderStatus(order.status),
        items: order.line_items.map((item: any) => ({
          id: item.id.toString(),
          productId: item.product_id.toString(),
          productName: item.name,
          quantity: item.quantity,
          unitPrice: parseFloat(item.price),
          totalPrice: parseFloat(item.total),
          sku: item.sku
        })),
        subtotal: parseFloat(order.total) - parseFloat(order.total_tax || '0') - parseFloat(order.shipping_total || '0'),
        tax: parseFloat(order.total_tax || '0'),
        shipping: parseFloat(order.shipping_total || '0'),
        total: parseFloat(order.total),
        currency: order.currency,
        paymentStatus: this.mapPaymentStatus(order.status),
        metadata: this.extractMetadata(order.meta_data),
        createdAt: new Date(order.date_created),
        updatedAt: new Date(order.date_modified)
      };

      return {
        success: true,
        data: result,
        metadata: {
          timestamp: new Date(),
          rateLimit: await this.getRateLimitInfo()
        }
      };
    } catch (error) {
      return this.handleError(error as any, 'Failed to get order');
    }
  }

  async updateOrder(orderId: string, updates: Partial<Order>): Promise<ConnectorResponse<Order>> {
    try {
      const updateData: any = {};

      if (updates.status) {
        updateData.status = this.mapToWooOrderStatus(updates.status);
      }

      if (updates.metadata) {
        updateData.meta_data = Object.entries(updates.metadata).map(([key, value]) => ({
          key,
          value: typeof value === 'string' ? value : JSON.stringify(value)
        }));
      }

      const response = await this.axiosClient.put(`/orders/${orderId}`, updateData);
      const order = response.data;

      return this.getOrder(order.id.toString());
    } catch (error) {
      return this.handleError(error as any, 'Failed to update order');
    }
  }

  async cancelOrder(orderId: string): Promise<ConnectorResponse<Order>> {
    try {
      const updateData = {
        status: 'cancelled'
      };

      const response = await this.axiosClient.put(`/orders/${orderId}`, updateData);
      return this.getOrder(response.data.id.toString());
    } catch (error) {
      return this.handleError(error as any, 'Failed to cancel order');
    }
  }

  async fulfillOrder(orderId: string, trackingNumber?: string): Promise<ConnectorResponse<Order>> {
    try {
      const updateData: any = {
        status: 'completed'
      };

      if (trackingNumber) {
        updateData.meta_data = [{
          key: 'tracking_number',
          value: trackingNumber
        }];
      }

      const response = await this.axiosClient.put(`/orders/${orderId}`, updateData);
      return this.getOrder(response.data.id.toString());
    } catch (error) {
      return this.handleError(error as any, 'Failed to fulfill order');
    }
  }

  async listOrders(customerId?: string, request?: ListRequest): Promise<ConnectorResponse<ListResponse<Order>>> {
    try {
      const params: any = {
        per_page: request?.limit || 10,
        page: 1
      };

      if (customerId) {
        params.customer = parseInt(customerId);
      }

      const response = await this.axiosClient.get('/orders', { params });
      const orders = response.data;

      const ordersList: Order[] = orders.map((order: any) => ({
        id: order.id.toString(),
        customerId: order.customer_id?.toString(),
        status: this.mapWooOrderStatus(order.status),
        items: order.line_items.map((item: any) => ({
          id: item.id.toString(),
          productId: item.product_id.toString(),
          productName: item.name,
          quantity: item.quantity,
          unitPrice: parseFloat(item.price),
          totalPrice: parseFloat(item.total),
          sku: item.sku
        })),
        subtotal: parseFloat(order.total) - parseFloat(order.total_tax || '0') - parseFloat(order.shipping_total || '0'),
        tax: parseFloat(order.total_tax || '0'),
        shipping: parseFloat(order.shipping_total || '0'),
        total: parseFloat(order.total),
        currency: order.currency,
        paymentStatus: this.mapPaymentStatus(order.status),
        metadata: this.extractMetadata(order.meta_data),
        createdAt: new Date(order.date_created),
        updatedAt: new Date(order.date_modified)
      }));

      const result: ListResponse<Order> = {
        data: ordersList,
        hasMore: ordersList.length === (request?.limit || 10),
        nextCursor: ordersList.length > 0 ? ordersList[ordersList.length - 1].id : undefined
      };

      return {
        success: true,
        data: result,
        metadata: {
          timestamp: new Date(),
          rateLimit: await this.getRateLimitInfo()
        }
      };
    } catch (error) {
      return this.handleError(error as any, 'Failed to list orders');
    }
  }

  // Inventory Operations
  async updateInventory(request: UpdateInventoryRequest): Promise<ConnectorResponse<Inventory>> {
    try {
      const product = await this.axiosClient.get(`/products/${request.productId}`);
      const currentStock = product.data.stock_quantity || 0;

      let newQuantity = request.quantity;
      if (request.operation === 'increment') {
        newQuantity = currentStock + request.quantity;
      } else if (request.operation === 'decrement') {
        newQuantity = currentStock - request.quantity;
      }

      const updateData = {
        stock_quantity: newQuantity,
        manage_stock: true,
        in_stock: newQuantity > 0
      };

      await this.axiosClient.put(`/products/${request.productId}`, updateData);

      const result: Inventory = {
        productId: request.productId,
        sku: request.sku || product.data.sku,
        quantity: newQuantity,
        trackQuantity: true
      };

      return {
        success: true,
        data: result,
        metadata: {
          timestamp: new Date(),
          rateLimit: await this.getRateLimitInfo()
        }
      };
    } catch (error) {
      return this.handleError(error as any, 'Failed to update inventory');
    }
  }

  async getInventory(productId: string): Promise<ConnectorResponse<Inventory>> {
    try {
      const response = await this.axiosClient.get(`/products/${productId}`);
      const product = response.data;

      const result: Inventory = {
        productId: productId,
        sku: product.sku,
        quantity: product.stock_quantity || 0,
        trackQuantity: product.manage_stock || false
      };

      return {
        success: true,
        data: result,
        metadata: {
          timestamp: new Date(),
          rateLimit: await this.getRateLimitInfo()
        }
      };
    } catch (error) {
      return this.handleError(error as any, 'Failed to get inventory');
    }
  }

  async listInventory(request?: ListRequest): Promise<ConnectorResponse<ListResponse<Inventory>>> {
    try {
      const params = {
        per_page: request?.limit || 10,
        page: 1,
        manage_stock: true // Only get products with stock management enabled
      };

      const response = await this.axiosClient.get('/products', { params });
      const products = response.data;

      const inventory: Inventory[] = products.map((product: any) => ({
        productId: product.id.toString(),
        sku: product.sku,
        quantity: product.stock_quantity || 0,
        trackQuantity: product.manage_stock || false
      }));

      const result: ListResponse<Inventory> = {
        data: inventory,
        hasMore: inventory.length === (request?.limit || 10),
        nextCursor: inventory.length > 0 ? inventory[inventory.length - 1].productId : undefined
      };

      return {
        success: true,
        data: result,
        metadata: {
          timestamp: new Date(),
          rateLimit: await this.getRateLimitInfo()
        }
      };
    } catch (error) {
      return this.handleError(error as any, 'Failed to list inventory');
    }
  }

  // Coupon Operations
  async createCoupon(request: any): Promise<ConnectorResponse<Coupon>> {
    try {
      const couponData = {
        code: request.code,
        discount_type: request.type === 'percentage' ? 'percent' : 'fixed_cart',
        amount: request.value.toString(),
        description: request.description,
        usage_limit: request.maxUses,
        date_expires: request.validUntil?.toISOString().split('T')[0],
        minimum_amount: '0.00',
        meta_data: request.metadata ? Object.entries(request.metadata).map(([key, value]) => ({
          key,
          value: typeof value === 'string' ? value : JSON.stringify(value)
        })) : []
      };

      const response = await this.axiosClient.post('/coupons', couponData);
      const coupon = response.data;

      const result: Coupon = {
        id: coupon.id.toString(),
        code: coupon.code,
        type: coupon.discount_type === 'percent' ? 'percentage' : 'fixed_amount',
        value: parseFloat(coupon.amount),
        currency: request.currency,
        description: coupon.description,
        maxUses: coupon.usage_limit,
        usedCount: coupon.usage_count,
        validFrom: request.validFrom,
        validUntil: coupon.date_expires ? new Date(coupon.date_expires) : undefined,
        active: true,
        metadata: this.extractMetadata(coupon.meta_data)
      };

      return {
        success: true,
        data: result,
        metadata: {
          timestamp: new Date(),
          rateLimit: await this.getRateLimitInfo()
        }
      };
    } catch (error) {
      return this.handleError(error as any, 'Failed to create coupon');
    }
  }

  async getCoupon(couponId: string): Promise<ConnectorResponse<Coupon>> {
    try {
      const response = await this.axiosClient.get(`/coupons/${couponId}`);
      const coupon = response.data;

      const result: Coupon = {
        id: coupon.id.toString(),
        code: coupon.code,
        type: coupon.discount_type === 'percent' ? 'percentage' : 'fixed_amount',
        value: parseFloat(coupon.amount),
        description: coupon.description,
        maxUses: coupon.usage_limit,
        usedCount: coupon.usage_count,
        validUntil: coupon.date_expires ? new Date(coupon.date_expires) : undefined,
        active: true,
        metadata: this.extractMetadata(coupon.meta_data)
      };

      return {
        success: true,
        data: result,
        metadata: {
          timestamp: new Date(),
          rateLimit: await this.getRateLimitInfo()
        }
      };
    } catch (error) {
      return this.handleError(error as any, 'Failed to get coupon');
    }
  }

  async updateCoupon(couponId: string, updates: Partial<Coupon>): Promise<ConnectorResponse<Coupon>> {
    try {
      const updateData: any = {};

      if (updates.description !== undefined) updateData.description = updates.description;
      if (updates.maxUses !== undefined) updateData.usage_limit = updates.maxUses;
      if (updates.validUntil) updateData.date_expires = updates.validUntil.toISOString().split('T')[0];

      if (updates.metadata) {
        updateData.meta_data = Object.entries(updates.metadata).map(([key, value]) => ({
          key,
          value: typeof value === 'string' ? value : JSON.stringify(value)
        }));
      }

      const response = await this.axiosClient.put(`/coupons/${couponId}`, updateData);
      return this.getCoupon(response.data.id.toString());
    } catch (error) {
      return this.handleError(error as any, 'Failed to update coupon');
    }
  }

  async deleteCoupon(couponId: string): Promise<ConnectorResponse<void>> {
    try {
      await this.axiosClient.delete(`/coupons/${couponId}?force=true`);

      return {
        success: true,
        metadata: {
          timestamp: new Date(),
          rateLimit: await this.getRateLimitInfo()
        }
      };
    } catch (error) {
      return this.handleError(error as any, 'Failed to delete coupon');
    }
  }

  async listCoupons(request?: ListRequest): Promise<ConnectorResponse<ListResponse<Coupon>>> {
    try {
      const params = {
        per_page: request?.limit || 10,
        page: 1
      };

      const response = await this.axiosClient.get('/coupons', { params });
      const coupons = response.data;

      const couponsList: Coupon[] = coupons.map((coupon: any) => ({
        id: coupon.id.toString(),
        code: coupon.code,
        type: coupon.discount_type === 'percent' ? 'percentage' : 'fixed_amount',
        value: parseFloat(coupon.amount),
        description: coupon.description,
        maxUses: coupon.usage_limit,
        usedCount: coupon.usage_count,
        validUntil: coupon.date_expires ? new Date(coupon.date_expires) : undefined,
        active: true,
        metadata: this.extractMetadata(coupon.meta_data)
      }));

      const result: ListResponse<Coupon> = {
        data: couponsList,
        hasMore: couponsList.length === (request?.limit || 10),
        nextCursor: couponsList.length > 0 ? couponsList[couponsList.length - 1].id : undefined
      };

      return {
        success: true,
        data: result,
        metadata: {
          timestamp: new Date(),
          rateLimit: await this.getRateLimitInfo()
        }
      };
    } catch (error) {
      return this.handleError(error as any, 'Failed to list coupons');
    }
  }

  // Category Operations
  async createCategory(name: string, description?: string, parentId?: string): Promise<ConnectorResponse<any>> {
    try {
      const categoryData = {
        name,
        description: description || '',
        parent: parentId ? parseInt(parentId) : 0
      };

      const response = await this.axiosClient.post('/products/categories', categoryData);

      return {
        success: true,
        data: response.data,
        metadata: {
          timestamp: new Date(),
          rateLimit: await this.getRateLimitInfo()
        }
      };
    } catch (error) {
      return this.handleError(error as any, 'Failed to create category');
    }
  }

  async getCategory(categoryId: string): Promise<ConnectorResponse<any>> {
    try {
      const response = await this.axiosClient.get(`/products/categories/${categoryId}`);

      return {
        success: true,
        data: response.data,
        metadata: {
          timestamp: new Date(),
          rateLimit: await this.getRateLimitInfo()
        }
      };
    } catch (error) {
      return this.handleError(error as any, 'Failed to get category');
    }
  }

  async updateCategory(categoryId: string, updates: any): Promise<ConnectorResponse<any>> {
    try {
      const updateData: any = {};

      if (updates.name) updateData.name = updates.name;
      if (updates.description !== undefined) updateData.description = updates.description;
      if (updates.parentId !== undefined) updateData.parent = updates.parentId ? parseInt(updates.parentId) : 0;

      const response = await this.axiosClient.put(`/products/categories/${categoryId}`, updateData);

      return {
        success: true,
        data: response.data,
        metadata: {
          timestamp: new Date(),
          rateLimit: await this.getRateLimitInfo()
        }
      };
    } catch (error) {
      return this.handleError(error as any, 'Failed to update category');
    }
  }

  async deleteCategory(categoryId: string): Promise<ConnectorResponse<void>> {
    try {
      await this.axiosClient.delete(`/products/categories/${categoryId}?force=true`);

      return {
        success: true,
        metadata: {
          timestamp: new Date(),
          rateLimit: await this.getRateLimitInfo()
        }
      };
    } catch (error) {
      return this.handleError(error as any, 'Failed to delete category');
    }
  }

  async listCategories(request?: ListRequest): Promise<ConnectorResponse<ListResponse<any>>> {
    try {
      const params = {
        per_page: request?.limit || 10,
        page: 1
      };

      const response = await this.axiosClient.get('/products/categories', { params });

      const result: ListResponse<any> = {
        data: response.data,
        hasMore: response.data.length === (request?.limit || 10),
        nextCursor: response.data.length > 0 ? response.data[response.data.length - 1].id?.toString() : undefined
      };

      return {
        success: true,
        data: result,
        metadata: {
          timestamp: new Date(),
          rateLimit: await this.getRateLimitInfo()
        }
      };
    } catch (error) {
      return this.handleError(error as any, 'Failed to list categories');
    }
  }

  // Webhook Operations
  async createWebhook(url: string, events: string[]): Promise<ConnectorResponse<Webhook>> {
    try {
      const webhookData = {
        name: 'API Webhook',
        status: 'active',
        topic: events[0] || 'order.created', // WooCommerce uses specific topic format
        delivery_url: url
      };

      const response = await this.axiosClient.post('/webhooks', webhookData);
      const webhook = response.data;

      const result: Webhook = {
        id: webhook.id.toString(),
        url: webhook.delivery_url,
        events: [webhook.topic],
        active: webhook.status === 'active',
        createdAt: new Date(webhook.date_created),
        updatedAt: new Date(webhook.date_modified)
      };

      return {
        success: true,
        data: result,
        metadata: {
          timestamp: new Date(),
          rateLimit: await this.getRateLimitInfo()
        }
      };
    } catch (error) {
      return this.handleError(error as any, 'Failed to create webhook');
    }
  }

  async getWebhook(webhookId: string): Promise<ConnectorResponse<Webhook>> {
    try {
      const response = await this.axiosClient.get(`/webhooks/${webhookId}`);
      const webhook = response.data;

      const result: Webhook = {
        id: webhook.id.toString(),
        url: webhook.delivery_url,
        events: [webhook.topic],
        active: webhook.status === 'active',
        createdAt: new Date(webhook.date_created),
        updatedAt: new Date(webhook.date_modified)
      };

      return {
        success: true,
        data: result,
        metadata: {
          timestamp: new Date(),
          rateLimit: await this.getRateLimitInfo()
        }
      };
    } catch (error) {
      return this.handleError(error as any, 'Failed to get webhook');
    }
  }

  async updateWebhook(webhookId: string, updates: Partial<Webhook>): Promise<ConnectorResponse<Webhook>> {
    try {
      const updateData: any = {};

      if (updates.url) updateData.delivery_url = updates.url;
      if (updates.events && updates.events.length > 0) updateData.topic = updates.events[0];
      if (updates.active !== undefined) updateData.status = updates.active ? 'active' : 'paused';

      const response = await this.axiosClient.put(`/webhooks/${webhookId}`, updateData);
      return this.getWebhook(response.data.id.toString());
    } catch (error) {
      return this.handleError(error as any, 'Failed to update webhook');
    }
  }

  async deleteWebhook(webhookId: string): Promise<ConnectorResponse<void>> {
    try {
      await this.axiosClient.delete(`/webhooks/${webhookId}?force=true`);

      return {
        success: true,
        metadata: {
          timestamp: new Date(),
          rateLimit: await this.getRateLimitInfo()
        }
      };
    } catch (error) {
      return this.handleError(error as any, 'Failed to delete webhook');
    }
  }

  async listWebhooks(): Promise<ConnectorResponse<ListResponse<Webhook>>> {
    try {
      const response = await this.axiosClient.get('/webhooks');

      const webhooks: Webhook[] = response.data.map((webhook: any) => ({
        id: webhook.id.toString(),
        url: webhook.delivery_url,
        events: [webhook.topic],
        active: webhook.status === 'active',
        createdAt: new Date(webhook.date_created),
        updatedAt: new Date(webhook.date_modified)
      }));

      const result: ListResponse<Webhook> = {
        data: webhooks,
        hasMore: false,
        nextCursor: undefined
      };

      return {
        success: true,
        data: result,
        metadata: {
          timestamp: new Date(),
          rateLimit: await this.getRateLimitInfo()
        }
      };
    } catch (error) {
      return this.handleError(error as any, 'Failed to list webhooks');
    }
  }

  verifyWebhookSignature(payload: string, signature: string, secret: string): boolean {
    try {
      // WooCommerce webhook verification implementation
      const crypto = require('crypto');
      const hmac = crypto.createHmac('sha256', secret);
      hmac.update(payload, 'utf8');
      const hash = hmac.digest('base64');
      return hash === signature;
    } catch (error) {
      this.logger.warn('Webhook signature verification failed:', error);
      return false;
    }
  }

  // Helper methods
  private extractMetadata(metaData: any[]): Record<string, any> {
    if (!metaData || !Array.isArray(metaData)) return {};
    
    const metadata: Record<string, any> = {};
    metaData.forEach(item => {
      if (item.key && item.value !== undefined) {
        try {
          metadata[item.key] = JSON.parse(item.value);
        } catch {
          metadata[item.key] = item.value;
        }
      }
    });
    return metadata;
  }

  private mapOrderStatus(status: string): Payment['status'] {
    switch (status) {
      case 'pending':
        return 'pending';
      case 'processing':
        return 'processing';
      case 'completed':
        return 'completed';
      case 'cancelled':
      case 'failed':
        return 'failed';
      case 'refunded':
        return 'refunded';
      default:
        return 'pending';
    }
  }

  private mapWooOrderStatus(status: string): Order['status'] {
    switch (status) {
      case 'pending':
        return 'pending';
      case 'processing':
        return 'processing';
      case 'completed':
        return 'delivered';
      case 'cancelled':
        return 'cancelled';
      case 'refunded':
        return 'refunded';
      default:
        return 'pending';
    }
  }

  private mapToWooOrderStatus(status: Order['status']): string {
    switch (status) {
      case 'pending':
        return 'pending';
      case 'processing':
        return 'processing';
      case 'shipped':
        return 'processing';
      case 'delivered':
        return 'completed';
      case 'cancelled':
        return 'cancelled';
      case 'refunded':
        return 'refunded';
      default:
        return 'pending';
    }
  }

  private mapPaymentStatus(status: string): Order['paymentStatus'] {
    switch (status) {
      case 'pending':
        return 'pending';
      case 'processing':
      case 'completed':
        return 'paid';
      case 'refunded':
        return 'refunded';
      default:
        return 'failed';
    }
  }

  private getActions(): ConnectorAction[] {
    return [
      {
        id: 'get_order',
        name: 'Get Order',
        description: 'Get order details from WooCommerce',
        inputSchema: {
          orderId: { type: 'string', required: true }
        },
        outputSchema: {
          id: { type: 'number' },
          status: { type: 'string' },
          total: { type: 'string' },
          currency: { type: 'string' },
          customer_id: { type: 'number' },
          billing: { type: 'object' },
          shipping: { type: 'object' },
          line_items: { type: 'array' },
          date_created: { type: 'string' }
        }
      },
      {
        id: 'create_product',
        name: 'Create Product',
        description: 'Create a new product in WooCommerce',
        inputSchema: {
          name: { type: 'string', required: true },
          description: { type: 'string', required: false },
          price: { type: 'number', required: false },
          sku: { type: 'string', required: false }
        },
        outputSchema: {
          id: { type: 'string' },
          name: { type: 'string' },
          price: { type: 'number' }
        }
      },
      {
        id: 'create_customer',
        name: 'Create Customer',
        description: 'Create a new customer in WooCommerce',
        inputSchema: {
          email: { type: 'string', required: true },
          firstName: { type: 'string', required: false },
          lastName: { type: 'string', required: false }
        },
        outputSchema: {
          id: { type: 'string' },
          email: { type: 'string' }
        }
      },
      {
        id: 'create_order',
        name: 'Create Order',
        description: 'Create a new order in WooCommerce',
        inputSchema: {
          customerId: { type: 'string', required: false },
          items: { type: 'array', required: true }
        },
        outputSchema: {
          id: { type: 'string' },
          total: { type: 'number' },
          status: { type: 'string' }
        }
      },
      {
        id: 'update_stock',
        name: 'Update Stock',
        description: 'Update product stock levels',
        inputSchema: {
          productId: { type: 'string', required: true },
          quantity: { type: 'number', required: true },
          operation: { type: 'string', required: false }
        },
        outputSchema: {
          productId: { type: 'string' },
          quantity: { type: 'number' }
        }
      },
      {
        id: 'create_coupon',
        name: 'Create Coupon',
        description: 'Create a discount coupon',
        inputSchema: {
          code: { type: 'string', required: true },
          type: { type: 'string', required: true },
          value: { type: 'number', required: true }
        },
        outputSchema: {
          id: { type: 'string' },
          code: { type: 'string' },
          type: { type: 'string' }
        }
      },
      {
        id: 'create_category',
        name: 'Create Category',
        description: 'Create a product category',
        inputSchema: {
          name: { type: 'string', required: true },
          description: { type: 'string', required: false },
          parentId: { type: 'string', required: false }
        },
        outputSchema: {
          id: { type: 'string' },
          name: { type: 'string' }
        }
      }
    ];
  }

  private getTriggers(): ConnectorTrigger[] {
    return [
      {
        id: 'order_created',
        name: 'Order Created',
        description: 'Triggered when a new order is created',
        eventType: 'order.created',
        outputSchema: {
          id: { type: 'string' },
          total: { type: 'string' },
          status: { type: 'string' }
        },
        webhookRequired: true
      },
      {
        id: 'order_updated',
        name: 'Order Updated',
        description: 'Triggered when an order is updated',
        eventType: 'order.updated',
        outputSchema: {
          id: { type: 'string' },
          total: { type: 'string' },
          status: { type: 'string' }
        },
        webhookRequired: true
      },
      {
        id: 'product_created',
        name: 'Product Created',
        description: 'Triggered when a new product is created',
        eventType: 'product.created',
        outputSchema: {
          id: { type: 'string' },
          name: { type: 'string' },
          status: { type: 'string' }
        },
        webhookRequired: true
      },
      {
        id: 'customer_created',
        name: 'Customer Created',
        description: 'Triggered when a new customer is created',
        eventType: 'customer.created',
        outputSchema: {
          id: { type: 'string' },
          email: { type: 'string' },
          first_name: { type: 'string' }
        },
        webhookRequired: true
      },
      {
        id: 'coupon_created',
        name: 'Coupon Created',
        description: 'Triggered when a new coupon is created',
        eventType: 'coupon.created',
        outputSchema: {
          id: { type: 'string' },
          code: { type: 'string' },
          amount: { type: 'string' }
        },
        webhookRequired: true
      }
    ];
  }
}