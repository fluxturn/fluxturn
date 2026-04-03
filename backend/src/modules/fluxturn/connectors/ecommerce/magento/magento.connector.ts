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
import { AuthUtils } from '../../utils/auth.utils';
import { ApiUtils } from '../../utils/api.utils';

@Injectable()
export class MagentoConnector extends BaseConnector {
  constructor(
    private readonly authUtils: AuthUtils,
    private readonly apiUtils: ApiUtils,
  ) {
    super();
  }

  getMetadata(): ConnectorMetadata {
    return {
      name: 'Magento 2',
      description: 'E-commerce platform for creating online stores and managing products, orders, customers, and inventory',
      version: '1.0.0',
      category: ConnectorCategory.ECOMMERCE,
      type: ConnectorType.MAGENTO,
      authType: AuthType.API_KEY,
      actions: this.getActions(),
      triggers: this.getTriggers(),
      webhookSupport: false,
    };
  }

  protected async initializeConnection(): Promise<void> {
    if (!this.config.credentials?.host) {
      throw new Error('Magento host URL is required');
    }
    if (!this.config.credentials?.accessToken) {
      throw new Error('Access token is required');
    }
    this.logger.log('Magento connector initialized');
  }

  protected async performConnectionTest(): Promise<boolean> {
    try {
      const response = await this.performRequest({
        method: 'GET',
        endpoint: '/rest/default/V1/store/storeConfigs',
        headers: this.getAuthHeaders(),
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
    const host = this.config.credentials.host.replace(/\/$/, '');
    const url = `${host}${request.endpoint}`;

    const response = await this.apiUtils.executeRequest({
      method: request.method,
      endpoint: url,
      headers: request.headers || this.getAuthHeaders(),
      queryParams: request.queryParams,
      body: request.body,
    });

    return response.data;
  }

  protected async performAction(actionId: string, input: any): Promise<any> {
    switch (actionId) {
      // Customer actions
      case 'create_customer':
        return await this.performCreateCustomer(input);
      case 'get_customer':
        return await this.performGetCustomer(input);
      case 'update_customer':
        return await this.performUpdateCustomer(input);
      case 'delete_customer':
        return await this.performDeleteCustomer(input);
      case 'get_all_customers':
        return await this.performGetAllCustomers(input);

      // Product actions
      case 'create_product':
        return await this.performCreateProduct(input);
      case 'get_product':
        return await this.performGetProduct(input);
      case 'update_product':
        return await this.performUpdateProduct(input);
      case 'delete_product':
        return await this.performDeleteProduct(input);
      case 'get_all_products':
        return await this.performGetAllProducts(input);

      // Order actions
      case 'get_order':
        return await this.performGetOrder(input);
      case 'get_all_orders':
        return await this.performGetAllOrders(input);
      case 'cancel_order':
        return await this.performCancelOrder(input);
      case 'ship_order':
        return await this.performShipOrder(input);

      // Invoice actions
      case 'create_invoice':
        return await this.performCreateInvoice(input);

      default:
        throw new Error(`Unknown action: ${actionId}`);
    }
  }

  protected async cleanup(): Promise<void> {
    this.logger.log('Magento connector cleanup completed');
  }

  private getAuthHeaders(): Record<string, string> {
    return {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${this.config.credentials.accessToken}`,
    };
  }

  private getActions(): ConnectorAction[] {
    return [
      // Customer Actions
      {
        id: 'create_customer',
        name: 'Create Customer',
        description: 'Create a new customer',
        inputSchema: {
          email: { type: 'string', required: true },
          firstname: { type: 'string', required: true },
          lastname: { type: 'string', required: true },
          websiteId: { type: 'number', required: false },
          groupId: { type: 'number', required: false },
          storeId: { type: 'number', required: false },
          password: { type: 'string', required: false },
        },
        outputSchema: { customer: { type: 'object' } },
      },
      {
        id: 'get_customer',
        name: 'Get Customer',
        description: 'Get a customer by ID',
        inputSchema: {
          customerId: { type: 'string', required: true },
        },
        outputSchema: { customer: { type: 'object' } },
      },
      {
        id: 'update_customer',
        name: 'Update Customer',
        description: 'Update an existing customer',
        inputSchema: {
          customerId: { type: 'string', required: true },
          email: { type: 'string', required: false },
          firstname: { type: 'string', required: false },
          lastname: { type: 'string', required: false },
        },
        outputSchema: { customer: { type: 'object' } },
      },
      {
        id: 'delete_customer',
        name: 'Delete Customer',
        description: 'Delete a customer',
        inputSchema: {
          customerId: { type: 'string', required: true },
        },
        outputSchema: { success: { type: 'boolean' } },
      },
      {
        id: 'get_all_customers',
        name: 'Get All Customers',
        description: 'Get all customers with optional filtering',
        inputSchema: {
          pageSize: { type: 'number', required: false },
          currentPage: { type: 'number', required: false },
          searchCriteria: { type: 'object', required: false },
        },
        outputSchema: { customers: { type: 'array' } },
      },

      // Product Actions
      {
        id: 'create_product',
        name: 'Create Product',
        description: 'Create a new product',
        inputSchema: {
          sku: { type: 'string', required: true },
          name: { type: 'string', required: true },
          attributeSetId: { type: 'number', required: true },
          price: { type: 'number', required: true },
          status: { type: 'number', required: false },
          visibility: { type: 'number', required: false },
          typeId: { type: 'string', required: false },
          weight: { type: 'number', required: false },
        },
        outputSchema: { product: { type: 'object' } },
      },
      {
        id: 'get_product',
        name: 'Get Product',
        description: 'Get a product by SKU',
        inputSchema: {
          sku: { type: 'string', required: true },
        },
        outputSchema: { product: { type: 'object' } },
      },
      {
        id: 'update_product',
        name: 'Update Product',
        description: 'Update an existing product',
        inputSchema: {
          sku: { type: 'string', required: true },
          name: { type: 'string', required: false },
          price: { type: 'number', required: false },
          status: { type: 'number', required: false },
          visibility: { type: 'number', required: false },
        },
        outputSchema: { product: { type: 'object' } },
      },
      {
        id: 'delete_product',
        name: 'Delete Product',
        description: 'Delete a product by SKU',
        inputSchema: {
          sku: { type: 'string', required: true },
        },
        outputSchema: { success: { type: 'boolean' } },
      },
      {
        id: 'get_all_products',
        name: 'Get All Products',
        description: 'Get all products with optional filtering',
        inputSchema: {
          pageSize: { type: 'number', required: false },
          currentPage: { type: 'number', required: false },
          searchCriteria: { type: 'object', required: false },
        },
        outputSchema: { products: { type: 'array' } },
      },

      // Order Actions
      {
        id: 'get_order',
        name: 'Get Order',
        description: 'Get an order by ID',
        inputSchema: {
          orderId: { type: 'string', required: true },
        },
        outputSchema: { order: { type: 'object' } },
      },
      {
        id: 'get_all_orders',
        name: 'Get All Orders',
        description: 'Get all orders with optional filtering',
        inputSchema: {
          pageSize: { type: 'number', required: false },
          currentPage: { type: 'number', required: false },
          searchCriteria: { type: 'object', required: false },
        },
        outputSchema: { orders: { type: 'array' } },
      },
      {
        id: 'cancel_order',
        name: 'Cancel Order',
        description: 'Cancel an order',
        inputSchema: {
          orderId: { type: 'string', required: true },
        },
        outputSchema: { success: { type: 'boolean' } },
      },
      {
        id: 'ship_order',
        name: 'Ship Order',
        description: 'Ship an order',
        inputSchema: {
          orderId: { type: 'string', required: true },
        },
        outputSchema: { success: { type: 'boolean' } },
      },

      // Invoice Actions
      {
        id: 'create_invoice',
        name: 'Create Invoice',
        description: 'Create an invoice for an order',
        inputSchema: {
          orderId: { type: 'string', required: true },
        },
        outputSchema: { success: { type: 'boolean' } },
      },
    ];
  }

  private getTriggers(): ConnectorTrigger[] {
    return [];
  }

  // Customer Methods
  private async performCreateCustomer(data: any): Promise<any> {
    const { email, firstname, lastname, websiteId, groupId, storeId, password, ...rest } = data;

    const body: any = {
      customer: {
        email,
        firstname,
        lastname,
        website_id: websiteId || 0,
        ...(groupId && { group_id: groupId }),
        ...(storeId && { store_id: storeId }),
        ...rest,
      },
    };

    if (password) {
      body.password = password;
    }

    return await this.performRequest({
      method: 'POST',
      endpoint: '/rest/V1/customers',
      headers: this.getAuthHeaders(),
      body,
    });
  }

  private async performGetCustomer(data: any): Promise<any> {
    const { customerId } = data;

    return await this.performRequest({
      method: 'GET',
      endpoint: `/rest/default/V1/customers/${customerId}`,
      headers: this.getAuthHeaders(),
    });
  }

  private async performUpdateCustomer(data: any): Promise<any> {
    const { customerId, email, firstname, lastname, ...rest } = data;

    const body: any = {
      customer: {
        id: parseInt(customerId, 10),
        email,
        firstname,
        lastname,
        website_id: 0,
        ...rest,
      },
    };

    return await this.performRequest({
      method: 'PUT',
      endpoint: `/rest/V1/customers/${customerId}`,
      headers: this.getAuthHeaders(),
      body,
    });
  }

  private async performDeleteCustomer(data: any): Promise<any> {
    const { customerId } = data;

    await this.performRequest({
      method: 'DELETE',
      endpoint: `/rest/default/V1/customers/${customerId}`,
      headers: this.getAuthHeaders(),
    });

    return { success: true };
  }

  private async performGetAllCustomers(data: any): Promise<any> {
    const { pageSize = 100, currentPage = 1, searchCriteria = {} } = data;

    const qs: any = {
      search_criteria: {
        page_size: pageSize,
        current_page: currentPage,
        ...searchCriteria,
      },
    };

    const response = await this.performRequest({
      method: 'GET',
      endpoint: '/rest/default/V1/customers/search',
      headers: this.getAuthHeaders(),
      queryParams: qs,
    });

    return response.items || [];
  }

  // Product Methods
  private async performCreateProduct(data: any): Promise<any> {
    const { sku, name, attributeSetId, price, status, visibility, typeId, weight, ...rest } = data;

    const body: any = {
      product: {
        sku,
        name,
        attribute_set_id: attributeSetId,
        price,
        status: status || 1,
        visibility: visibility || 4,
        type_id: typeId || 'simple',
        ...(weight && { weight }),
        ...rest,
      },
    };

    return await this.performRequest({
      method: 'POST',
      endpoint: '/rest/default/V1/products',
      headers: this.getAuthHeaders(),
      body,
    });
  }

  private async performGetProduct(data: any): Promise<any> {
    const { sku } = data;

    return await this.performRequest({
      method: 'GET',
      endpoint: `/rest/default/V1/products/${encodeURIComponent(sku)}`,
      headers: this.getAuthHeaders(),
    });
  }

  private async performUpdateProduct(data: any): Promise<any> {
    const { sku, ...updateFields } = data;

    const body: any = {
      product: {
        sku,
        ...updateFields,
      },
    };

    return await this.performRequest({
      method: 'PUT',
      endpoint: `/rest/default/V1/products/${encodeURIComponent(sku)}`,
      headers: this.getAuthHeaders(),
      body,
    });
  }

  private async performDeleteProduct(data: any): Promise<any> {
    const { sku } = data;

    await this.performRequest({
      method: 'DELETE',
      endpoint: `/rest/default/V1/products/${encodeURIComponent(sku)}`,
      headers: this.getAuthHeaders(),
    });

    return { success: true };
  }

  private async performGetAllProducts(data: any): Promise<any> {
    const { pageSize = 100, currentPage = 1, searchCriteria = {} } = data;

    const qs: any = {
      search_criteria: {
        page_size: pageSize,
        current_page: currentPage,
        ...searchCriteria,
      },
    };

    const response = await this.performRequest({
      method: 'GET',
      endpoint: '/rest/default/V1/products',
      headers: this.getAuthHeaders(),
      queryParams: qs,
    });

    return response.items || [];
  }

  // Order Methods
  private async performGetOrder(data: any): Promise<any> {
    const { orderId } = data;

    return await this.performRequest({
      method: 'GET',
      endpoint: `/rest/default/V1/orders/${orderId}`,
      headers: this.getAuthHeaders(),
    });
  }

  private async performGetAllOrders(data: any): Promise<any> {
    const { pageSize = 100, currentPage = 1, searchCriteria = {} } = data;

    const qs: any = {
      search_criteria: {
        page_size: pageSize,
        current_page: currentPage,
        ...searchCriteria,
      },
    };

    const response = await this.performRequest({
      method: 'GET',
      endpoint: '/rest/default/V1/orders',
      headers: this.getAuthHeaders(),
      queryParams: qs,
    });

    return response.items || [];
  }

  private async performCancelOrder(data: any): Promise<any> {
    const { orderId } = data;

    await this.performRequest({
      method: 'POST',
      endpoint: `/rest/default/V1/orders/${orderId}/cancel`,
      headers: this.getAuthHeaders(),
    });

    return { success: true };
  }

  private async performShipOrder(data: any): Promise<any> {
    const { orderId } = data;

    await this.performRequest({
      method: 'POST',
      endpoint: `/rest/default/V1/order/${orderId}/ship`,
      headers: this.getAuthHeaders(),
    });

    return { success: true };
  }

  // Invoice Methods
  private async performCreateInvoice(data: any): Promise<any> {
    const { orderId } = data;

    await this.performRequest({
      method: 'POST',
      endpoint: `/rest/default/V1/order/${orderId}/invoice`,
      headers: this.getAuthHeaders(),
    });

    return { success: true };
  }

  // IEcommerceConnector interface methods
  async createProduct(product: any): Promise<ConnectorResponse> {
    try {
      const data = await this.performCreateProduct(product);
      return {
        success: true,
        data,
      };
    } catch (error) {
      return this.handleError(error, 'Failed to create product');
    }
  }

  async updateProduct(productId: string, updates: any): Promise<ConnectorResponse> {
    try {
      const data = await this.performUpdateProduct({ sku: productId, ...updates });
      return {
        success: true,
        data,
      };
    } catch (error) {
      return this.handleError(error, 'Failed to update product');
    }
  }

  async getProduct(productId: string): Promise<ConnectorResponse> {
    try {
      const data = await this.performGetProduct({ sku: productId });
      return {
        success: true,
        data,
      };
    } catch (error) {
      return this.handleError(error, 'Failed to get product');
    }
  }

  async deleteProduct(productId: string): Promise<ConnectorResponse> {
    try {
      const data = await this.performDeleteProduct({ sku: productId });
      return {
        success: true,
        data,
      };
    } catch (error) {
      return this.handleError(error, 'Failed to delete product');
    }
  }

  async searchProducts(query: any): Promise<ConnectorResponse> {
    try {
      const data = await this.performGetAllProducts(query);
      return {
        success: true,
        data,
      };
    } catch (error) {
      return this.handleError(error, 'Failed to search products');
    }
  }

  async createOrder(order: any): Promise<ConnectorResponse> {
    throw new Error('Creating orders is not supported in Magento 2 API');
  }

  async updateOrder(orderId: string, updates: any): Promise<ConnectorResponse> {
    throw new Error('Updating orders is not supported in Magento 2 API');
  }

  async getOrder(orderId: string): Promise<ConnectorResponse> {
    try {
      const data = await this.performGetOrder({ orderId });
      return {
        success: true,
        data,
      };
    } catch (error) {
      return this.handleError(error, 'Failed to get order');
    }
  }

  async searchOrders(query: any): Promise<ConnectorResponse> {
    try {
      const data = await this.performGetAllOrders(query);
      return {
        success: true,
        data,
      };
    } catch (error) {
      return this.handleError(error, 'Failed to search orders');
    }
  }

  async createCustomer(customer: any): Promise<ConnectorResponse> {
    try {
      const data = await this.performCreateCustomer(customer);
      return {
        success: true,
        data,
      };
    } catch (error) {
      return this.handleError(error, 'Failed to create customer');
    }
  }

  async updateCustomer(customerId: string, updates: any): Promise<ConnectorResponse> {
    try {
      const data = await this.performUpdateCustomer({ customerId, ...updates });
      return {
        success: true,
        data,
      };
    } catch (error) {
      return this.handleError(error, 'Failed to update customer');
    }
  }

  async getCustomer(customerId: string): Promise<ConnectorResponse> {
    try {
      const data = await this.performGetCustomer({ customerId });
      return {
        success: true,
        data,
      };
    } catch (error) {
      return this.handleError(error, 'Failed to get customer');
    }
  }

  async searchCustomers(query: any): Promise<ConnectorResponse> {
    try {
      const data = await this.performGetAllCustomers(query);
      return {
        success: true,
        data,
      };
    } catch (error) {
      return this.handleError(error, 'Failed to search customers');
    }
  }
}
