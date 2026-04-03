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
import Shopify from 'shopify-api-node';

@Injectable()
export class ShopifyConnector extends BaseConnector implements IEcommerceConnector {
  private shopify: any;

  getMetadata(): ConnectorMetadata {
    return {
      name: 'Shopify',
      description: 'Shopify e-commerce platform for product and order management',
      version: '1.0.0',
      category: ConnectorCategory.ECOMMERCE,
      type: ConnectorType.SHOPIFY,
      logoUrl: 'https://cdn.shopify.com/s/files/1/0040/5487/9044/files/Shopify_Secondary_Inverted_Logo.png',
      documentationUrl: 'https://shopify.dev/docs/api',
      authType: AuthType.BEARER_TOKEN,
      requiredScopes: ['read_products', 'write_products', 'read_orders', 'write_orders', 'read_customers', 'write_customers'],
      actions: this.getActions(),
      triggers: this.getTriggers(),
      rateLimit: {
        requestsPerSecond: 2,
        requestsPerMinute: 40,
        burstLimit: 40
      },
      webhookSupport: true
    };
  }

  protected async initializeConnection(): Promise<void> {
    if (!this.config?.credentials?.accessToken || !this.config?.credentials?.shopSubdomain) {
      throw new Error('Shopify access token and shop subdomain are required');
    }

    this.shopify = new Shopify({
      shopName: this.config.credentials.shopSubdomain,
      accessToken: this.config.credentials.accessToken,
      timeout: 30000,
      autoLimit: {
        calls: 2,
        interval: 1000,
        bucketSize: 40
      }
    });

    this.logger.log('Shopify connector initialized successfully');
  }

  protected async performConnectionTest(): Promise<boolean> {
    try {
      // Test connection by getting shop information
      const shop = await this.shopify.shop.get();
      this.logger.debug(`Connected to Shopify shop: ${shop.name} (${shop.domain})`);
      return true;
    } catch (error) {
      this.logger.error('Shopify connection test failed:', error);
      throw error;
    }
  }

  protected async performHealthCheck(): Promise<void> {
    await this.shopify.shop.get();
  }

  protected async performRequest(request: ConnectorRequest): Promise<any> {
    // This method would be for generic requests - most operations will use specific methods
    throw new Error('Use specific Shopify API methods instead of generic requests');
  }

  protected async performAction(actionId: string, input: any): Promise<any> {
    switch (actionId) {
      // Product operations
      case 'get_all_products':
        return this.getAllProducts(input);
      case 'create_product':
        return this.createProductAction(input);
      case 'get_product':
        return this.getProductById(input);
      case 'update_product':
        return this.updateProductById(input);
      case 'delete_product':
        return this.deleteProductById(input);

      // Order operations
      case 'create_order':
        return this.createOrderAction(input);
      case 'get_order':
        return this.getOrderById(input);
      case 'get_all_orders':
        return this.getAllOrders(input);
      case 'update_order':
        return this.updateOrderById(input);
      case 'delete_order':
        return this.deleteOrderById(input);

      // Other operations
      case 'create_customer':
        return this.createCustomer(input);
      case 'update_inventory':
        return this.updateInventory(input);
      case 'create_discount':
        return this.createCoupon(input);
      case 'fulfill_order':
        return this.fulfillOrder(input.orderId, input.trackingNumber);
      case 'create_collection':
        return this.createCollection(input.name, input.description, input.products);
      default:
        throw new Error(`Unknown action: ${actionId}`);
    }
  }

  protected async cleanup(): Promise<void> {
    // No specific cleanup needed for Shopify
  }

  // Payment Operations (Shopify handles payments through its checkout)
  async createPayment(request: CreatePaymentRequest): Promise<ConnectorResponse<PaymentIntent>> {
    try {
      // Shopify doesn't directly create payments - they're created through checkout
      // We'll create a draft order instead that can be converted to an invoice
      const draftOrder = await this.shopify.draftOrder.create({
        line_items: [{
          title: request.description || 'Payment',
          price: request.amount.toFixed(2),
          quantity: 1
        }],
        customer: request.customerId ? { id: parseInt(request.customerId) } : undefined,
        currency: request.currency.toUpperCase(),
        note: request.description
      });

      const result: PaymentIntent = {
        id: draftOrder.id.toString(),
        amount: request.amount,
        currency: request.currency.toUpperCase(),
        customerId: request.customerId,
        description: request.description,
        metadata: request.metadata,
        status: 'pending',
        clientSecret: draftOrder.invoice_url || undefined,
        createdAt: new Date(draftOrder.created_at),
        updatedAt: new Date(draftOrder.updated_at)
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
      // Complete the draft order (convert to order)
      const completedOrder = await this.shopify.draftOrder.complete(parseInt(paymentId));

      const result: Payment = {
        id: completedOrder.id.toString(),
        amount: parseFloat(completedOrder.total_price),
        currency: completedOrder.currency,
        status: this.mapOrderStatus((completedOrder as any).financial_status),
        description: completedOrder.note,
        metadata: { orderId: completedOrder.id.toString() },
        createdAt: new Date(completedOrder.created_at),
        updatedAt: new Date(completedOrder.updated_at)
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
      // Cancel the order
      const canceledOrder = await this.shopify.order.cancel(parseInt(paymentId));

      const result: Payment = {
        id: canceledOrder.id.toString(),
        amount: parseFloat(canceledOrder.total_price),
        currency: canceledOrder.currency,
        status: 'failed',
        description: canceledOrder.note || undefined,
        metadata: { orderId: canceledOrder.id.toString() },
        createdAt: new Date(canceledOrder.created_at),
        updatedAt: new Date(canceledOrder.updated_at)
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
      const order = await this.shopify.order.get(parseInt(paymentId));

      const result: Payment = {
        id: order.id.toString(),
        amount: parseFloat(order.total_price),
        currency: order.currency,
        status: this.mapOrderStatus((order as any).financial_status),
        customerId: order.customer?.id?.toString(),
        description: order.note || undefined,
        metadata: { orderId: order.id.toString() },
        createdAt: new Date(order.created_at),
        updatedAt: new Date(order.updated_at)
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
      const orders = await this.shopify.order.list({
        limit: request?.limit || 50,
        financial_status: 'paid'
      });

      const payments: Payment[] = orders.map(order => ({
        id: order.id.toString(),
        amount: parseFloat(order.total_price),
        currency: order.currency,
        status: this.mapOrderStatus((order as any).financial_status),
        customerId: order.customer?.id?.toString(),
        description: order.note || undefined,
        metadata: { orderId: order.id.toString() },
        createdAt: new Date(order.created_at),
        updatedAt: new Date(order.updated_at)
      }));

      const result: ListResponse<Payment> = {
        data: payments,
        hasMore: payments.length === (request?.limit || 50),
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
      const refund = await this.shopify.refund.create(parseInt(request.paymentId), {
        refund_line_items: [{
          line_item_id: request.lineItemId,
          quantity: request.quantity || 1
        }],
        notify: true,
        note: request.reason
      });

      const result: Refund = {
        id: refund.id.toString(),
        paymentId: request.paymentId,
        amount: parseFloat((refund as any).amount || '0'),
        currency: 'USD', // Shopify doesn't provide currency in refund response
        reason: request.reason,
        status: 'succeeded',
        metadata: request.metadata,
        createdAt: new Date(refund.created_at)
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
      // Shopify doesn't have a direct get refund endpoint
      // We'd need to get the order and find the refund
      throw new Error('Get refund operation not supported by Shopify API');
    } catch (error) {
      return this.handleError(error as any, 'Failed to get refund');
    }
  }

  async listRefunds(paymentId?: string, request?: ListRequest): Promise<ConnectorResponse<ListResponse<Refund>>> {
    try {
      if (!paymentId) {
        throw new Error('Order ID is required for listing refunds');
      }

      const order = await this.shopify.order.get(parseInt(paymentId));
      const refunds: Refund[] = (order.refunds || []).map((refund: any) => ({
        id: refund.id.toString(),
        paymentId: paymentId,
        amount: parseFloat((refund as any).amount || '0'),
        currency: order.currency,
        reason: refund.note,
        status: 'succeeded',
        metadata: {},
        createdAt: new Date(refund.created_at)
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
        phone: request.phone,
        addresses: request.address ? [{
          first_name: request.firstName,
          last_name: request.lastName,
          address1: request.address.line1,
          address2: request.address.line2,
          city: request.address.city,
          province: request.address.state,
          zip: request.address.postalCode,
          country: request.address.country,
          phone: request.phone
        }] : undefined,
        tags: request.metadata ? Object.entries(request.metadata).map(([k, v]) => `${k}:${v}`).join(',') : undefined
      };

      const customer = await this.shopify.customer.create(customerData);

      const result: Customer = {
        id: customer.id.toString(),
        email: customer.email,
        firstName: customer.first_name,
        lastName: customer.last_name,
        phone: customer.phone,
        address: customer.default_address ? {
          line1: customer.default_address.address1,
          line2: customer.default_address.address2,
          city: customer.default_address.city,
          state: customer.default_address.province || undefined,
          postalCode: customer.default_address.zip,
          country: customer.default_address.country
        } : undefined,
        metadata: request.metadata,
        createdAt: new Date(customer.created_at),
        updatedAt: new Date(customer.updated_at)
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
      const customer = await this.shopify.customer.get(parseInt(customerId));

      const result: Customer = {
        id: customer.id.toString(),
        email: customer.email,
        firstName: customer.first_name,
        lastName: customer.last_name,
        phone: customer.phone,
        address: customer.default_address ? {
          line1: customer.default_address.address1,
          line2: customer.default_address.address2,
          city: customer.default_address.city,
          state: customer.default_address.province || undefined,
          postalCode: customer.default_address.zip,
          country: customer.default_address.country
        } : undefined,
        metadata: {},
        createdAt: new Date(customer.created_at),
        updatedAt: new Date(customer.updated_at)
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
      if (updates.phone) updateData.phone = updates.phone;

      const customer = await this.shopify.customer.update(parseInt(customerId), updateData);

      const result: Customer = {
        id: customer.id.toString(),
        email: customer.email,
        firstName: customer.first_name,
        lastName: customer.last_name,
        phone: customer.phone,
        address: customer.default_address ? {
          line1: customer.default_address.address1,
          line2: customer.default_address.address2,
          city: customer.default_address.city,
          state: customer.default_address.province || undefined,
          postalCode: customer.default_address.zip,
          country: customer.default_address.country
        } : undefined,
        metadata: {},
        createdAt: new Date(customer.created_at),
        updatedAt: new Date(customer.updated_at)
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
      await this.shopify.customer.delete(parseInt(customerId));

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
      const customers = await this.shopify.customer.list({
        limit: request?.limit || 50
      });

      const customersList: Customer[] = customers.map(customer => ({
        id: customer.id.toString(),
        email: customer.email,
        firstName: customer.first_name,
        lastName: customer.last_name,
        phone: customer.phone,
        address: customer.default_address ? {
          line1: customer.default_address.address1,
          line2: customer.default_address.address2,
          city: customer.default_address.city,
          state: customer.default_address.province || undefined,
          postalCode: customer.default_address.zip,
          country: customer.default_address.country
        } : undefined,
        metadata: {},
        createdAt: new Date(customer.created_at),
        updatedAt: new Date(customer.updated_at)
      }));

      const result: ListResponse<Customer> = {
        data: customersList,
        hasMore: customersList.length === (request?.limit || 50),
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
        title: request.name,
        body_html: request.description,
        vendor: 'Default Vendor',
        product_type: request.category || 'Default',
        images: request.images ? request.images.map(image => ({ src: image })) : undefined,
        variants: [{
          price: request.price?.toFixed(2) || '0.00',
          sku: request.sku,
          inventory_quantity: request.inventory || 0,
          inventory_management: 'shopify'
        }],
        tags: request.metadata ? Object.entries(request.metadata).map(([k, v]) => `${k}:${v}`).join(',') : undefined,
        published: request.active !== false
      };

      const product = await this.shopify.product.create(productData);

      const result: Product = {
        id: product.id.toString(),
        name: product.title,
        description: product.body_html,
        price: parseFloat(product.variants[0]?.price || '0'),
        currency: 'USD', // Shopify doesn't specify currency in product response
        sku: product.variants[0]?.sku,
        inventory: product.variants[0]?.inventory_quantity,
        images: product.images?.map((img: any) => img.src) || [],
        category: product.product_type,
        active: product.status === 'active',
        metadata: request.metadata,
        createdAt: new Date(product.created_at),
        updatedAt: new Date(product.updated_at)
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
      const product = await this.shopify.product.get(parseInt(productId));

      const result: Product = {
        id: product.id.toString(),
        name: product.title,
        description: product.body_html,
        price: parseFloat(product.variants[0]?.price || '0'),
        currency: 'USD',
        sku: product.variants[0]?.sku,
        inventory: product.variants[0]?.inventory_quantity,
        images: product.images?.map((img: any) => img.src) || [],
        category: product.product_type,
        active: product.status === 'active',
        metadata: {},
        createdAt: new Date(product.created_at),
        updatedAt: new Date(product.updated_at)
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

      if (updates.name) updateData.title = updates.name;
      if (updates.description !== undefined) updateData.body_html = updates.description;
      if (updates.category) updateData.product_type = updates.category;
      if (updates.active !== undefined) updateData.published = updates.active;

      const product = await this.shopify.product.update(parseInt(productId), updateData);

      const result: Product = {
        id: product.id.toString(),
        name: product.title,
        description: product.body_html,
        price: parseFloat(product.variants[0]?.price || '0'),
        currency: 'USD',
        sku: product.variants[0]?.sku,
        inventory: product.variants[0]?.inventory_quantity,
        images: product.images?.map((img: any) => img.src) || [],
        category: product.product_type,
        active: product.status === 'active',
        metadata: updates.metadata,
        createdAt: new Date(product.created_at),
        updatedAt: new Date(product.updated_at)
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
      await this.shopify.product.delete(parseInt(productId));

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
      const products = await this.shopify.product.list({
        limit: request?.limit || 50
      });

      const productsList: Product[] = products.map(product => ({
        id: product.id.toString(),
        name: product.title,
        description: product.body_html,
        price: parseFloat(product.variants[0]?.price || '0'),
        currency: 'USD',
        sku: product.variants[0]?.sku,
        inventory: product.variants[0]?.inventory_quantity,
        images: product.images?.map((img: any) => img.src) || [],
        category: product.product_type,
        active: product.status === 'active',
        metadata: {},
        createdAt: new Date(product.created_at),
        updatedAt: new Date(product.updated_at)
      }));

      const result: ListResponse<Product> = {
        data: productsList,
        hasMore: productsList.length === (request?.limit || 50),
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

  /**
   * Get All Products with advanced filtering
   */
  async getAllProducts(input: any): Promise<ConnectorResponse> {
    try {
      const {
        returnAll = false,
        limit = 50,
        collectionId,
        createdAtMin,
        createdAtMax,
        fields,
        handle,
        ids,
        productType,
        publishedStatus = 'any',
        title,
        vendor
      } = input;

      // Build query parameters
      const queryParams: any = {};

      // Add filter parameters
      if (collectionId) queryParams.collection_id = collectionId;
      if (createdAtMin) queryParams.created_at_min = createdAtMin;
      if (createdAtMax) queryParams.created_at_max = createdAtMax;
      if (fields) queryParams.fields = fields;
      if (handle) queryParams.handle = handle;
      if (ids) queryParams.ids = ids;
      if (productType) queryParams.product_type = productType;
      if (publishedStatus && publishedStatus !== 'any') queryParams.published_status = publishedStatus;
      if (title) queryParams.title = title;
      if (vendor) queryParams.vendor = vendor;

      let products: any[];

      if (returnAll) {
        // Get all products with pagination (shopify-api-node handles this automatically)
        products = [];
        let params = { ...queryParams, limit: 250 }; // Max limit per request
        let hasMore = true;
        let lastId: string | undefined;

        while (hasMore) {
          if (lastId) {
            params.since_id = lastId;
          }

          const batch = await this.shopify.product.list(params);

          if (batch.length === 0) {
            hasMore = false;
          } else {
            products.push(...batch);
            lastId = batch[batch.length - 1].id;

            // If we got less than the limit, we've reached the end
            if (batch.length < 250) {
              hasMore = false;
            }
          }
        }
      } else {
        // Get limited number of products
        queryParams.limit = limit;
        products = await this.shopify.product.list(queryParams);
      }

      // Format products for response
      const formattedProducts = products.map(product => ({
        id: product.id.toString(),
        title: product.title,
        body_html: product.body_html,
        vendor: product.vendor,
        product_type: product.product_type,
        created_at: product.created_at,
        handle: product.handle,
        updated_at: product.updated_at,
        published_at: product.published_at,
        template_suffix: product.template_suffix,
        status: product.status,
        published_scope: product.published_scope,
        tags: product.tags,
        admin_graphql_api_id: product.admin_graphql_api_id,
        variants: product.variants,
        options: product.options,
        images: product.images,
        image: product.image
      }));

      return {
        success: true,
        data: formattedProducts
      };

    } catch (error: any) {
      this.logger.error('Get all products failed:', error.message);
      return {
        success: false,
        error: {
          code: 'GET_PRODUCTS_FAILED',
          message: error.message
        }
      };
    }
  }

  /**
   * Create Product (wrapper for action)
   */
  async createProductAction(input: any): Promise<ConnectorResponse> {
    try {
      const { title, bodyHtml, vendor, productType, tags } = input;

      const productData: any = {
        title
      };

      if (bodyHtml !== undefined) {
        productData.body_html = bodyHtml;
      }

      if (vendor) {
        productData.vendor = vendor;
      }

      if (productType) {
        productData.product_type = productType;
      }

      if (tags) {
        productData.tags = tags;
      }

      const product = await this.shopify.product.create(productData);

      return {
        success: true,
        data: product
      };
    } catch (error: any) {
      this.logger.error('Create product failed:', error.message);
      return {
        success: false,
        error: {
          code: 'CREATE_PRODUCT_FAILED',
          message: error.message
        }
      };
    }
  }

  /**
   * Get Product by ID (wrapper for action)
   */
  async getProductById(input: any): Promise<ConnectorResponse> {
    try {
      const { productId, fields } = input;

      const queryParams: any = {};
      if (fields) {
        queryParams.fields = fields;
      }

      const product = await this.shopify.product.get(parseInt(productId), queryParams);

      return {
        success: true,
        data: product
      };
    } catch (error: any) {
      this.logger.error('Get product failed:', error.message);
      return {
        success: false,
        error: {
          code: 'GET_PRODUCT_FAILED',
          message: error.message
        }
      };
    }
  }

  /**
   * Update Product by ID (wrapper for action)
   */
  async updateProductById(input: any): Promise<ConnectorResponse> {
    try {
      const { productId, title, bodyHtml, vendor, productType, tags } = input;

      const updateData: any = {};

      if (title) updateData.title = title;
      if (bodyHtml !== undefined) updateData.body_html = bodyHtml;
      if (vendor) updateData.vendor = vendor;
      if (productType) updateData.product_type = productType;
      if (tags) updateData.tags = tags;

      const product = await this.shopify.product.update(parseInt(productId), updateData);

      return {
        success: true,
        data: product
      };
    } catch (error: any) {
      this.logger.error('Update product failed:', error.message);
      return {
        success: false,
        error: {
          code: 'UPDATE_PRODUCT_FAILED',
          message: error.message
        }
      };
    }
  }

  /**
   * Delete Product by ID (wrapper for action)
   */
  async deleteProductById(input: any): Promise<ConnectorResponse> {
    try {
      const { productId } = input;

      await this.shopify.product.delete(parseInt(productId));

      return {
        success: true,
        data: { success: true }
      };
    } catch (error: any) {
      this.logger.error('Delete product failed:', error.message);
      return {
        success: false,
        error: {
          code: 'DELETE_PRODUCT_FAILED',
          message: error.message
        }
      };
    }
  }

  /**
   * Create Order (wrapper for action)
   */
  async createOrderAction(input: any): Promise<ConnectorResponse> {
    try {
      const { lineItems, email, financialStatus, sendReceipt = false, note } = input;

      const orderData: any = {
        line_items: lineItems,
        send_receipt: sendReceipt
      };

      if (email) {
        orderData.email = email;
      }

      if (financialStatus) {
        orderData.financial_status = financialStatus;
      }

      if (note) {
        orderData.note = note;
      }

      const order = await this.shopify.order.create(orderData);

      return {
        success: true,
        data: order
      };
    } catch (error: any) {
      this.logger.error('Create order failed:', error.message);
      return {
        success: false,
        error: {
          code: 'CREATE_ORDER_FAILED',
          message: error.message
        }
      };
    }
  }

  /**
   * Get Order by ID (wrapper for action)
   */
  async getOrderById(input: any): Promise<ConnectorResponse> {
    try {
      const { orderId, fields } = input;

      const queryParams: any = {};
      if (fields) {
        queryParams.fields = fields;
      }

      const order = await this.shopify.order.get(parseInt(orderId), queryParams);

      return {
        success: true,
        data: order
      };
    } catch (error: any) {
      this.logger.error('Get order failed:', error.message);
      return {
        success: false,
        error: {
          code: 'GET_ORDER_FAILED',
          message: error.message
        }
      };
    }
  }

  /**
   * Get All Orders with filtering
   */
  async getAllOrders(input: any): Promise<ConnectorResponse> {
    try {
      const {
        returnAll = false,
        limit = 50,
        status = 'any',
        financialStatus = 'any',
        fulfillmentStatus = 'any'
      } = input;

      const queryParams: any = {};

      // Add filter parameters
      if (status && status !== 'any') {
        queryParams.status = status;
      }
      if (financialStatus && financialStatus !== 'any') {
        queryParams.financial_status = financialStatus;
      }
      if (fulfillmentStatus && fulfillmentStatus !== 'any') {
        queryParams.fulfillment_status = fulfillmentStatus;
      }

      let orders: any[];

      if (returnAll) {
        // Get all orders with pagination
        orders = [];
        let params = { ...queryParams, limit: 250 }; // Max limit per request
        let hasMore = true;
        let lastId: string | undefined;

        while (hasMore) {
          if (lastId) {
            params.since_id = lastId;
          }

          const batch = await this.shopify.order.list(params);

          if (batch.length === 0) {
            hasMore = false;
          } else {
            orders.push(...batch);
            lastId = batch[batch.length - 1].id;

            // If we got less than the limit, we've reached the end
            if (batch.length < 250) {
              hasMore = false;
            }
          }
        }
      } else {
        // Get limited number of orders
        queryParams.limit = limit;
        orders = await this.shopify.order.list(queryParams);
      }

      return {
        success: true,
        data: orders
      };
    } catch (error: any) {
      this.logger.error('Get all orders failed:', error.message);
      return {
        success: false,
        error: {
          code: 'GET_ORDERS_FAILED',
          message: error.message
        }
      };
    }
  }

  /**
   * Update Order by ID (wrapper for action)
   */
  async updateOrderById(input: any): Promise<ConnectorResponse> {
    try {
      const { orderId, email, note, tags } = input;

      const updateData: any = {};

      if (email) updateData.email = email;
      if (note) updateData.note = note;
      if (tags) updateData.tags = tags;

      const order = await this.shopify.order.update(parseInt(orderId), updateData);

      return {
        success: true,
        data: order
      };
    } catch (error: any) {
      this.logger.error('Update order failed:', error.message);
      return {
        success: false,
        error: {
          code: 'UPDATE_ORDER_FAILED',
          message: error.message
        }
      };
    }
  }

  /**
   * Delete Order by ID (wrapper for action)
   */
  async deleteOrderById(input: any): Promise<ConnectorResponse> {
    try {
      const { orderId } = input;

      await this.shopify.order.delete(parseInt(orderId));

      return {
        success: true,
        data: { success: true }
      };
    } catch (error: any) {
      this.logger.error('Delete order failed:', error.message);
      return {
        success: false,
        error: {
          code: 'DELETE_ORDER_FAILED',
          message: error.message
        }
      };
    }
  }

  // Subscription Operations (Shopify doesn't have native subscriptions)
  async createSubscription(): Promise<ConnectorResponse<Subscription>> {
    throw new Error('Subscriptions are not natively supported by Shopify - use apps like ReCharge');
  }

  async getSubscription(): Promise<ConnectorResponse<Subscription>> {
    throw new Error('Subscriptions are not natively supported by Shopify - use apps like ReCharge');
  }

  async updateSubscription(): Promise<ConnectorResponse<Subscription>> {
    throw new Error('Subscriptions are not natively supported by Shopify - use apps like ReCharge');
  }

  async cancelSubscription(): Promise<ConnectorResponse<Subscription>> {
    throw new Error('Subscriptions are not natively supported by Shopify - use apps like ReCharge');
  }

  async listSubscriptions(): Promise<ConnectorResponse<ListResponse<Subscription>>> {
    throw new Error('Subscriptions are not natively supported by Shopify - use apps like ReCharge');
  }

  // Invoice Operations (Shopify doesn't have separate invoices)
  async createInvoice(): Promise<ConnectorResponse<Invoice>> {
    throw new Error('Invoices are handled through orders in Shopify');
  }

  async getInvoice(): Promise<ConnectorResponse<Invoice>> {
    throw new Error('Invoices are handled through orders in Shopify');
  }

  async updateInvoice(): Promise<ConnectorResponse<Invoice>> {
    throw new Error('Invoices are handled through orders in Shopify');
  }

  async deleteInvoice(): Promise<ConnectorResponse<void>> {
    throw new Error('Invoices are handled through orders in Shopify');
  }

  async finalizeInvoice(): Promise<ConnectorResponse<Invoice>> {
    throw new Error('Invoices are handled through orders in Shopify');
  }

  async payInvoice(): Promise<ConnectorResponse<Invoice>> {
    throw new Error('Invoices are handled through orders in Shopify');
  }

  async listInvoices(): Promise<ConnectorResponse<ListResponse<Invoice>>> {
    throw new Error('Invoices are handled through orders in Shopify');
  }

  // Order Operations
  async createOrder(request: CreateOrderRequest): Promise<ConnectorResponse<Order>> {
    try {
      const orderData = {
        customer: request.customerId ? { id: parseInt(request.customerId) } : undefined,
        line_items: request.items.map(item => ({
          variant_id: parseInt(item.productId),
          quantity: item.quantity,
          price: item.unitPrice.toFixed(2)
        })),
        shipping_address: request.shippingAddress ? {
          first_name: request.shippingAddress.line1.split(' ')[0] || '',
          last_name: request.shippingAddress.line1.split(' ').slice(1).join(' ') || '',
          address1: request.shippingAddress.line1,
          address2: request.shippingAddress.line2,
          city: request.shippingAddress.city,
          province: request.shippingAddress.state,
          zip: request.shippingAddress.postalCode,
          country: request.shippingAddress.country
        } : undefined,
        billing_address: request.billingAddress ? {
          first_name: request.billingAddress.line1.split(' ')[0] || '',
          last_name: request.billingAddress.line1.split(' ').slice(1).join(' ') || '',
          address1: request.billingAddress.line1,
          address2: request.billingAddress.line2,
          city: request.billingAddress.city,
          province: request.billingAddress.state,
          zip: request.billingAddress.postalCode,
          country: request.billingAddress.country
        } : undefined,
        financial_status: 'pending',
        fulfillment_status: null
      };

      const order = await this.shopify.order.create(orderData);

      const result: Order = {
        id: order.id.toString(),
        customerId: order.customer?.id?.toString(),
        status: this.mapFulfillmentStatus(order.fulfillment_status),
        items: order.line_items.map((item: any) => ({
          id: item.id.toString(),
          productId: item.variant_id.toString(),
          productName: item.title,
          quantity: item.quantity,
          unitPrice: parseFloat(item.price),
          totalPrice: parseFloat(item.price) * item.quantity,
          sku: item.sku
        })),
        subtotal: parseFloat(String(order.subtotal_price || 0)),
        tax: parseFloat(String(order.total_tax || 0)),
        shipping: parseFloat(String(order.shipping_lines?.[0]?.price || 0)),
        total: parseFloat(String(order.total_price || 0)),
        currency: order.currency,
        paymentStatus: this.mapPaymentStatus((order as any).financial_status),
        shippingAddress: request.shippingAddress,
        billingAddress: request.billingAddress,
        metadata: request.metadata,
        createdAt: new Date(order.created_at),
        updatedAt: new Date(order.updated_at)
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
      const order = await this.shopify.order.get(parseInt(orderId));

      const result: Order = {
        id: order.id.toString(),
        customerId: order.customer?.id?.toString(),
        status: this.mapFulfillmentStatus(order.fulfillment_status),
        items: order.line_items.map((item: any) => ({
          id: item.id.toString(),
          productId: item.variant_id.toString(),
          productName: item.title,
          quantity: item.quantity,
          unitPrice: parseFloat(item.price),
          totalPrice: parseFloat(item.price) * item.quantity,
          sku: item.sku
        })),
        subtotal: parseFloat(String(order.subtotal_price || 0)),
        tax: parseFloat(String(order.total_tax || 0)),
        shipping: parseFloat(String(order.shipping_lines?.[0]?.price || 0)),
        total: parseFloat(String(order.total_price || 0)),
        currency: order.currency,
        paymentStatus: this.mapPaymentStatus((order as any).financial_status),
        metadata: {},
        createdAt: new Date(order.created_at),
        updatedAt: new Date(order.updated_at)
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

      // Shopify has limited order update capabilities
      if (updates.metadata) {
        updateData.note = JSON.stringify(updates.metadata);
      }

      const order = await this.shopify.order.update(parseInt(orderId), updateData);

      return this.getOrder(order.id.toString());
    } catch (error) {
      return this.handleError(error as any, 'Failed to update order');
    }
  }

  async cancelOrder(orderId: string): Promise<ConnectorResponse<Order>> {
    try {
      const canceledOrder = await this.shopify.order.cancel(parseInt(orderId));

      return this.getOrder(canceledOrder.id.toString());
    } catch (error) {
      return this.handleError(error as any, 'Failed to cancel order');
    }
  }

  async fulfillOrder(orderId: string, trackingNumber?: string): Promise<ConnectorResponse<Order>> {
    try {
      const order = await this.shopify.order.get(parseInt(orderId));
      
      const fulfillmentData = {
        location_id: order.line_items[0]?.fulfillment_service, // Use first item's location
        tracking_number: trackingNumber,
        notify_customer: true,
        line_items: order.line_items.map((item: any) => ({
          id: item.id,
          quantity: item.quantity
        }))
      };

      await this.shopify.fulfillment.create(parseInt(orderId), fulfillmentData);

      return this.getOrder(orderId);
    } catch (error) {
      return this.handleError(error as any, 'Failed to fulfill order');
    }
  }

  async listOrders(customerId?: string, request?: ListRequest): Promise<ConnectorResponse<ListResponse<Order>>> {
    try {
      const params: any = {
        limit: request?.limit || 50
      };

      if (customerId) {
        params.customer_id = parseInt(customerId);
      }

      const orders = await this.shopify.order.list(params);

      const ordersList: Order[] = orders.map(order => ({
        id: order.id.toString(),
        customerId: order.customer?.id?.toString(),
        status: this.mapFulfillmentStatus(order.fulfillment_status),
        items: order.line_items.map((item: any) => ({
          id: item.id.toString(),
          productId: item.variant_id.toString(),
          productName: item.title,
          quantity: item.quantity,
          unitPrice: parseFloat(item.price),
          totalPrice: parseFloat(item.price) * item.quantity,
          sku: item.sku
        })),
        subtotal: parseFloat(String(order.subtotal_price || 0)),
        tax: parseFloat(String(order.total_tax || 0)),
        shipping: parseFloat(String(order.shipping_lines?.[0]?.price || 0)),
        total: parseFloat(String(order.total_price || 0)),
        currency: order.currency,
        paymentStatus: this.mapPaymentStatus((order as any).financial_status),
        metadata: {},
        createdAt: new Date(order.created_at),
        updatedAt: new Date(order.updated_at)
      }));

      const result: ListResponse<Order> = {
        data: ordersList,
        hasMore: ordersList.length === (request?.limit || 50),
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
      // Get the product variant first
      const product = await this.shopify.product.get(parseInt(request.productId));
      const variant = product.variants[0];

      if (!variant) {
        throw new Error('Product variant not found');
      }

      let newQuantity = request.quantity;
      if (request.operation === 'increment') {
        newQuantity = variant.inventory_quantity + request.quantity;
      } else if (request.operation === 'decrement') {
        newQuantity = variant.inventory_quantity - request.quantity;
      }

      // Update the variant
      await this.shopify.productVariant.update(variant.id, {
        inventory_quantity: newQuantity
      });

      const result: Inventory = {
        productId: request.productId,
        sku: variant.sku,
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
      const product = await this.shopify.product.get(parseInt(productId));
      const variant = product.variants[0];

      if (!variant) {
        throw new Error('Product variant not found');
      }

      const result: Inventory = {
        productId: productId,
        sku: variant.sku,
        quantity: variant.inventory_quantity,
        trackQuantity: variant.inventory_management === 'shopify'
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
      const products = await this.shopify.product.list({
        limit: request?.limit || 50
      });

      const inventory: Inventory[] = products
        .filter(product => product.variants && product.variants.length > 0)
        .map(product => {
          const variant = product.variants[0];
          return {
            productId: product.id.toString(),
            sku: variant.sku,
            quantity: variant.inventory_quantity,
            trackQuantity: variant.inventory_management === 'shopify'
          };
        });

      const result: ListResponse<Inventory> = {
        data: inventory,
        hasMore: inventory.length === (request?.limit || 50),
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

  // Coupon/Discount Operations
  async createCoupon(request: any): Promise<ConnectorResponse<Coupon>> {
    try {
      const discountData = {
        code: request.code,
        value: request.value.toString(),
        value_type: request.type === 'percentage' ? 'percentage' : 'fixed_amount',
        usage_limit: request.maxUses,
        starts_at: request.validFrom?.toISOString(),
        ends_at: request.validUntil?.toISOString(),
        minimum_order_amount: '0.00'
      };

      // Create price rule first, then discount code
      const priceRule = await this.shopify.priceRule.create({
        title: `Price Rule for ${request.code}`,
        target_type: 'line_item',
        target_selection: 'all',
        allocation_method: 'across',
        value_type: request.type === 'percentage' ? 'percentage' : 'fixed_amount',
        value: `-${request.value}`,
        customer_selection: 'all',
        starts_at: request.validFrom?.toISOString(),
        ends_at: request.validUntil?.toISOString(),
        usage_limit: request.maxUses
      });

      const discount = await this.shopify.discountCode.create(priceRule.id, {
        code: request.code
      });

      const result: Coupon = {
        id: discount.id.toString(),
        code: discount.code,
        type: request.type,
        value: request.value,
        currency: request.currency,
        description: request.description,
        maxUses: request.maxUses,
        usedCount: discount.usage_count,
        validFrom: request.validFrom,
        validUntil: request.validUntil,
        active: true,
        metadata: request.metadata
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
      // Get all price rules and find the one containing this discount code
      const priceRules = await this.shopify.priceRule.list();
      let discount: any;
      let priceRule: any;
      
      for (const rule of priceRules) {
        try {
          const discountCodes = await this.shopify.discountCode.list(rule.id);
          const found = discountCodes.find((code: any) => code.id.toString() === couponId);
          if (found) {
            discount = found;
            priceRule = rule;
            break;
          }
        } catch (e) {
          // Continue searching
        }
      }
      
      if (!discount) {
        throw new Error('Discount code not found');
      }

      const result: Coupon = {
        id: discount.id.toString(),
        code: discount.code,
        type: priceRule.value_type === 'percentage' ? 'percentage' : 'fixed_amount',
        value: Math.abs(parseFloat(String(priceRule.value))),
        currency: 'USD', // Shopify doesn't specify currency for discount codes
        description: '',
        maxUses: priceRule.usage_limit,
        usedCount: discount.usage_count || 0,
        active: true,
        metadata: {}
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

      // Similar to getCoupon, find the price rule first
      const priceRules = await this.shopify.priceRule.list();
      let priceRuleId: number | undefined;
      
      for (const rule of priceRules) {
        try {
          const discountCodes = await this.shopify.discountCode.list(rule.id);
          const found = discountCodes.find((code: any) => code.id.toString() === couponId);
          if (found) {
            priceRuleId = rule.id;
            break;
          }
        } catch (e) {
          // Continue searching
        }
      }
      
      if (!priceRuleId) {
        throw new Error('Discount code not found');
      }

      // Update the price rule if needed
      if (updates.maxUses) {
        await this.shopify.priceRule.update(priceRuleId, {
          usage_limit: updates.maxUses
        });
      }

      const discount = { id: parseInt(couponId) };

      return this.getCoupon(discount.id.toString());
    } catch (error) {
      return this.handleError(error as any, 'Failed to update coupon');
    }
  }

  async deleteCoupon(couponId: string): Promise<ConnectorResponse<void>> {
    try {
      // Find the price rule containing this discount code
      const priceRules = await this.shopify.priceRule.list();
      let priceRuleId: number | undefined;
      
      for (const rule of priceRules) {
        try {
          const discountCodes = await this.shopify.discountCode.list(rule.id);
          const found = discountCodes.find((code: any) => code.id.toString() === couponId);
          if (found) {
            priceRuleId = rule.id;
            break;
          }
        } catch (e) {
          // Continue searching
        }
      }
      
      if (!priceRuleId) {
        throw new Error('Discount code not found');
      }

      await this.shopify.discountCode.delete(priceRuleId, parseInt(couponId));

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
      // Get all price rules and their discount codes
      const priceRules = await this.shopify.priceRule.list({ limit: request?.limit || 50 });
      const allDiscounts: any[] = [];
      
      for (const rule of priceRules) {
        try {
          const discountCodes = await this.shopify.discountCode.list(rule.id);
          allDiscounts.push(...discountCodes.map((code: any) => ({
            ...code,
            value_type: rule.value_type,
            value: Math.abs(parseFloat(rule.value)),
            usage_limit: rule.usage_limit,
            usage_count: code.usage_count || 0
          })));
        } catch (e) {
          // Skip rules that can't be accessed
        }
      }
      
      const discounts = allDiscounts.slice(0, request?.limit || 50);

      const coupons: Coupon[] = discounts.map((discount: any) => ({
        id: discount.id.toString(),
        code: discount.code,
        type: discount.value_type === 'percentage' ? 'percentage' : 'fixed_amount',
        value: discount.value,
        currency: 'USD', // Shopify doesn't specify currency for discount codes
        description: '',
        maxUses: discount.usage_limit,
        usedCount: discount.usage_count,
        active: true,
        metadata: {}
      }));

      const result: ListResponse<Coupon> = {
        data: coupons,
        hasMore: coupons.length === (request?.limit || 50),
        nextCursor: coupons.length > 0 ? coupons[coupons.length - 1].id : undefined
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

  // Collection Operations
  async createCollection(name: string, description?: string, products?: string[]): Promise<ConnectorResponse<any>> {
    try {
      const collectionData = {
        title: name,
        body_html: description,
        collection_type: 'manual'
      };

      const collection = await this.shopify.customCollection.create(collectionData);

      // Add products to collection if provided
      if (products && products.length > 0) {
        for (const productId of products) {
          await this.shopify.collect.create({
            collection_id: collection.id,
            product_id: parseInt(productId)
          });
        }
      }

      return {
        success: true,
        data: collection,
        metadata: {
          timestamp: new Date(),
          rateLimit: await this.getRateLimitInfo()
        }
      };
    } catch (error) {
      return this.handleError(error as any, 'Failed to create collection');
    }
  }

  async getCollection(collectionId: string): Promise<ConnectorResponse<any>> {
    try {
      const collection = await this.shopify.customCollection.get(parseInt(collectionId));

      return {
        success: true,
        data: collection,
        metadata: {
          timestamp: new Date(),
          rateLimit: await this.getRateLimitInfo()
        }
      };
    } catch (error) {
      return this.handleError(error as any, 'Failed to get collection');
    }
  }

  async updateCollection(collectionId: string, updates: any): Promise<ConnectorResponse<any>> {
    try {
      const updateData: any = {};

      if (updates.name) updateData.title = updates.name;
      if (updates.description !== undefined) updateData.body_html = updates.description;

      const collection = await this.shopify.customCollection.update(parseInt(collectionId), updateData);

      return {
        success: true,
        data: collection,
        metadata: {
          timestamp: new Date(),
          rateLimit: await this.getRateLimitInfo()
        }
      };
    } catch (error) {
      return this.handleError(error as any, 'Failed to update collection');
    }
  }

  async deleteCollection(collectionId: string): Promise<ConnectorResponse<void>> {
    try {
      await this.shopify.customCollection.delete(parseInt(collectionId));

      return {
        success: true,
        metadata: {
          timestamp: new Date(),
          rateLimit: await this.getRateLimitInfo()
        }
      };
    } catch (error) {
      return this.handleError(error as any, 'Failed to delete collection');
    }
  }

  async listCollections(request?: ListRequest): Promise<ConnectorResponse<ListResponse<any>>> {
    try {
      const collections = await this.shopify.customCollection.list({
        limit: request?.limit || 50
      });

      const result: ListResponse<any> = {
        data: collections,
        hasMore: collections.length === (request?.limit || 50),
        nextCursor: collections.length > 0 ? collections[collections.length - 1].id?.toString() : undefined
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
      return this.handleError(error as any, 'Failed to list collections');
    }
  }

  // Webhook Operations
  async createWebhook(url: string, events: string[]): Promise<ConnectorResponse<Webhook>> {
    try {
      const webhookData = {
        webhook: {
          topic: events[0] || 'orders/create', // Shopify webhooks are topic-based
          address: url,
          format: 'json'
        }
      };

      const webhook = await this.shopify.webhook.create(webhookData.webhook);

      const result: Webhook = {
        id: webhook.id.toString(),
        url: webhook.address,
        events: [webhook.topic],
        active: true,
        createdAt: new Date(webhook.created_at),
        updatedAt: new Date(webhook.updated_at)
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
      const webhook = await this.shopify.webhook.get(parseInt(webhookId));

      const result: Webhook = {
        id: webhook.id.toString(),
        url: webhook.address,
        events: [webhook.topic],
        active: true,
        createdAt: new Date(webhook.created_at),
        updatedAt: new Date(webhook.updated_at)
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

      if (updates.url) updateData.address = updates.url;
      if (updates.events && updates.events.length > 0) updateData.topic = updates.events[0];

      const webhook = await this.shopify.webhook.update(parseInt(webhookId), updateData);

      return this.getWebhook(webhook.id.toString());
    } catch (error) {
      return this.handleError(error as any, 'Failed to update webhook');
    }
  }

  async deleteWebhook(webhookId: string): Promise<ConnectorResponse<void>> {
    try {
      await this.shopify.webhook.delete(parseInt(webhookId));

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
      const webhooks = await this.shopify.webhook.list();

      const webhooksList: Webhook[] = webhooks.map(webhook => ({
        id: webhook.id.toString(),
        url: webhook.address,
        events: [webhook.topic],
        active: true,
        createdAt: new Date(webhook.created_at),
        updatedAt: new Date(webhook.updated_at)
      }));

      const result: ListResponse<Webhook> = {
        data: webhooksList,
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
      // Shopify webhook verification implementation
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
  private mapOrderStatus(financialStatus: string): Payment['status'] {
    switch (financialStatus) {
      case 'pending':
        return 'pending';
      case 'authorized':
        return 'processing';
      case 'paid':
        return 'completed';
      case 'partially_paid':
        return 'processing';
      case 'refunded':
        return 'refunded';
      case 'partially_refunded':
        return 'partially_refunded';
      case 'voided':
        return 'failed';
      default:
        return 'pending';
    }
  }

  private mapFulfillmentStatus(fulfillmentStatus: string | null): Order['status'] {
    switch (fulfillmentStatus) {
      case 'fulfilled':
        return 'delivered';
      case 'partial':
        return 'processing';
      case 'restocked':
        return 'cancelled';
      case null:
      case 'unfulfilled':
        return 'pending';
      default:
        return 'pending';
    }
  }

  private mapPaymentStatus(financialStatus: string): Order['paymentStatus'] {
    switch (financialStatus) {
      case 'pending':
        return 'pending';
      case 'paid':
        return 'paid';
      case 'refunded':
      case 'partially_refunded':
        return 'refunded';
      default:
        return 'failed';
    }
  }

  private getActions(): ConnectorAction[] {
    return [
      {
        id: 'get_all_products',
        name: 'Get All Products',
        description: 'Retrieve all products with advanced filtering options',
        inputSchema: {
          returnAll: { type: 'boolean', required: false },
          limit: { type: 'number', required: false },
          collectionId: { type: 'string', required: false },
          createdAtMin: { type: 'string', required: false },
          createdAtMax: { type: 'string', required: false },
          fields: { type: 'string', required: false },
          handle: { type: 'string', required: false },
          ids: { type: 'string', required: false },
          productType: { type: 'string', required: false },
          publishedStatus: { type: 'string', required: false },
          title: { type: 'string', required: false },
          vendor: { type: 'string', required: false }
        },
        outputSchema: {
          products: { type: 'array' }
        }
      },
      {
        id: 'create_product',
        name: 'Create Product',
        description: 'Create a new product in Shopify',
        inputSchema: {
          title: { type: 'string', required: true },
          bodyHtml: { type: 'string', required: false },
          vendor: { type: 'string', required: false },
          productType: { type: 'string', required: false },
          tags: { type: 'string', required: false }
        },
        outputSchema: {
          id: { type: 'string' },
          title: { type: 'string' },
          body_html: { type: 'string' }
        }
      },
      {
        id: 'get_product',
        name: 'Get Product',
        description: 'Get a single product by ID',
        inputSchema: {
          productId: { type: 'string', required: true },
          fields: { type: 'string', required: false }
        },
        outputSchema: {
          id: { type: 'string' },
          title: { type: 'string' }
        }
      },
      {
        id: 'update_product',
        name: 'Update Product',
        description: 'Update an existing product',
        inputSchema: {
          productId: { type: 'string', required: true },
          title: { type: 'string', required: false },
          bodyHtml: { type: 'string', required: false },
          vendor: { type: 'string', required: false },
          productType: { type: 'string', required: false },
          tags: { type: 'string', required: false }
        },
        outputSchema: {
          id: { type: 'string' },
          title: { type: 'string' }
        }
      },
      {
        id: 'delete_product',
        name: 'Delete Product',
        description: 'Delete a product',
        inputSchema: {
          productId: { type: 'string', required: true }
        },
        outputSchema: {
          success: { type: 'boolean' }
        }
      },
      {
        id: 'create_customer',
        name: 'Create Customer',
        description: 'Create a new customer in Shopify',
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
        description: 'Create a new order in Shopify',
        inputSchema: {
          lineItems: { type: 'array', required: true },
          email: { type: 'string', required: false },
          financialStatus: { type: 'string', required: false },
          sendReceipt: { type: 'boolean', required: false },
          note: { type: 'string', required: false }
        },
        outputSchema: {
          id: { type: 'string' },
          total_price: { type: 'string' },
          financial_status: { type: 'string' }
        }
      },
      {
        id: 'get_order',
        name: 'Get Order',
        description: 'Get a single order by ID',
        inputSchema: {
          orderId: { type: 'string', required: true },
          fields: { type: 'string', required: false }
        },
        outputSchema: {
          id: { type: 'string' },
          total_price: { type: 'string' }
        }
      },
      {
        id: 'get_all_orders',
        name: 'Get All Orders',
        description: 'Retrieve all orders with filtering options',
        inputSchema: {
          returnAll: { type: 'boolean', required: false },
          limit: { type: 'number', required: false },
          status: { type: 'string', required: false },
          financialStatus: { type: 'string', required: false },
          fulfillmentStatus: { type: 'string', required: false }
        },
        outputSchema: {
          orders: { type: 'array' }
        }
      },
      {
        id: 'update_order',
        name: 'Update Order',
        description: 'Update an existing order',
        inputSchema: {
          orderId: { type: 'string', required: true },
          email: { type: 'string', required: false },
          note: { type: 'string', required: false },
          tags: { type: 'string', required: false }
        },
        outputSchema: {
          id: { type: 'string' },
          email: { type: 'string' }
        }
      },
      {
        id: 'delete_order',
        name: 'Delete Order',
        description: 'Delete an order',
        inputSchema: {
          orderId: { type: 'string', required: true }
        },
        outputSchema: {
          success: { type: 'boolean' }
        }
      },
      {
        id: 'update_inventory',
        name: 'Update Inventory',
        description: 'Update product inventory levels',
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
        id: 'create_discount',
        name: 'Create Discount',
        description: 'Create a discount code',
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
        id: 'fulfill_order',
        name: 'Fulfill Order',
        description: 'Mark an order as fulfilled',
        inputSchema: {
          orderId: { type: 'string', required: true },
          trackingNumber: { type: 'string', required: false }
        },
        outputSchema: {
          id: { type: 'string' },
          status: { type: 'string' }
        }
      },
      {
        id: 'create_collection',
        name: 'Create Collection',
        description: 'Create a product collection',
        inputSchema: {
          name: { type: 'string', required: true },
          description: { type: 'string', required: false },
          products: { type: 'array', required: false }
        },
        outputSchema: {
          id: { type: 'string' },
          title: { type: 'string' }
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
        eventType: 'orders/create',
        outputSchema: {
          id: { type: 'string' },
          total_price: { type: 'string' },
          financial_status: { type: 'string' }
        },
        webhookRequired: true
      },
      {
        id: 'order_updated',
        name: 'Order Updated',
        description: 'Triggered when an order is updated',
        eventType: 'orders/updated',
        outputSchema: {
          id: { type: 'string' },
          total_price: { type: 'string' },
          financial_status: { type: 'string' }
        },
        webhookRequired: true
      },
      {
        id: 'order_paid',
        name: 'Order Paid',
        description: 'Triggered when an order is paid',
        eventType: 'orders/paid',
        outputSchema: {
          id: { type: 'string' },
          total_price: { type: 'string' }
        },
        webhookRequired: true
      },
      {
        id: 'product_created',
        name: 'Product Created',
        description: 'Triggered when a new product is created',
        eventType: 'products/create',
        outputSchema: {
          id: { type: 'string' },
          title: { type: 'string' },
          status: { type: 'string' }
        },
        webhookRequired: true
      },
      {
        id: 'customer_created',
        name: 'Customer Created',
        description: 'Triggered when a new customer is created',
        eventType: 'customers/create',
        outputSchema: {
          id: { type: 'string' },
          email: { type: 'string' },
          first_name: { type: 'string' }
        },
        webhookRequired: true
      }
    ];
  }
}