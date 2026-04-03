// Woocommerce Connector
// Auto-generated from connector.constants.ts

import { ConnectorDefinition } from '../../shared';

export const WOOCOMMERCE_CONNECTOR: ConnectorDefinition = {
    name: 'woocommerce',
    display_name: 'WooCommerce',
    category: 'ecommerce',
    description: 'WooCommerce WordPress integration',
    auth_type: 'basic',
    auth_fields: [
      {
        key: 'username',
        label: 'Consumer Key',
        type: 'string',
        required: true,
        placeholder: 'ck_xxxxxxxxxxxxx',
        description: 'Your WooCommerce Consumer Key',
        order: 1
      },
      {
        key: 'password',
        label: 'Consumer Secret',
        type: 'password',
        required: true,
        placeholder: 'cs_xxxxxxxxxxxxx',
        description: 'Your WooCommerce Consumer Secret',
        order: 2
      },
      {
        key: 'domain',
        label: 'Store URL',
        type: 'string',
        required: true,
        placeholder: 'https://yourstore.com',
        description: 'Your WooCommerce store URL',
        order: 3
      }
    ],
    endpoints: {
      products: '/wp-json/wc/v3/products',
      orders: '/wp-json/wc/v3/orders'
    },
    webhook_support: true,
    rate_limits: { requests_per_minute: 60 },
    sandbox_available: false,
    verified: false,
    supported_actions: [
      {
        id: 'get_order',
        name: 'Get Order',
        description: 'Get order details from WooCommerce',
        category: 'Orders',
        icon: 'shopping-cart',
        verified: false,
        inputSchema: {
          orderId: {
            type: 'string',
            required: true,
            label: 'Order ID',
            placeholder: '123',
            description: 'The ID of the order to retrieve',
            order: 1,
            aiControlled: false
          }
        },
        outputSchema: {
          type: 'object',
          properties: {
            id: { type: 'number', description: 'Order ID' },
            status: { type: 'string', description: 'Order status' },
            total: { type: 'string', description: 'Order total' },
            currency: { type: 'string', description: 'Currency code' },
            customer_id: { type: 'number', description: 'Customer ID' },
            billing: { type: 'object', description: 'Billing details' },
            shipping: { type: 'object', description: 'Shipping details' },
            line_items: { type: 'array', description: 'Order items' },
            date_created: { type: 'string', description: 'Order creation date' }
          }
        }
      },
      {
        id: 'create_product',
        name: 'Create Product',
        description: 'Create a new product in WooCommerce',
        category: 'Products',
        icon: 'package',
        verified: false,
        inputSchema: {
          name: {
            type: 'string',
            required: true,
            label: 'Product Name',
            placeholder: 'My Product',
            description: 'The name of the product',
            order: 1,
            aiControlled: true,
            aiDescription: 'The name/title of the product'
          },
          description: {
            type: 'string',
            label: 'Description',
            description: 'Product description',
            inputType: 'textarea',
            order: 2,
            aiControlled: true,
            aiDescription: 'The description of the product'
          },
          price: {
            type: 'number',
            label: 'Price',
            placeholder: '29.99',
            description: 'Regular price of the product',
            min: 0,
            order: 3,
            aiControlled: false
          },
          sku: {
            type: 'string',
            label: 'SKU',
            placeholder: 'PROD-001',
            description: 'Stock Keeping Unit',
            order: 4,
            aiControlled: false
          },
          inventory: {
            type: 'number',
            label: 'Stock Quantity',
            description: 'Number of items in stock',
            min: 0,
            order: 5,
            aiControlled: false
          },
          category: {
            type: 'string',
            label: 'Category',
            placeholder: 'Electronics',
            description: 'Product category name',
            order: 6,
            aiControlled: false
          },
          images: {
            type: 'array',
            label: 'Image URLs',
            description: 'Array of image URLs',
            order: 7,
            aiControlled: false
          }
        },
        outputSchema: {
          type: 'object',
          properties: {
            id: { type: 'string' },
            name: { type: 'string' },
            price: { type: 'number' }
          }
        }
      },
      {
        id: 'create_customer',
        name: 'Create Customer',
        description: 'Create a new customer in WooCommerce',
        category: 'Customers',
        icon: 'user',
        verified: false,
        inputSchema: {
          email: {
            type: 'string',
            required: true,
            label: 'Email',
            placeholder: 'customer@example.com',
            description: 'Customer email address',
            inputType: 'email',
            order: 1,
            aiControlled: false
          },
          firstName: {
            type: 'string',
            label: 'First Name',
            placeholder: 'John',
            order: 2,
            aiControlled: false
          },
          lastName: {
            type: 'string',
            label: 'Last Name',
            placeholder: 'Doe',
            order: 3,
            aiControlled: false
          },
          phone: {
            type: 'string',
            label: 'Phone',
            placeholder: '+1234567890',
            order: 4,
            aiControlled: false
          }
        },
        outputSchema: {
          type: 'object',
          properties: {
            id: { type: 'string' },
            email: { type: 'string' }
          }
        }
      },
      {
        id: 'create_order',
        name: 'Create Order',
        description: 'Create a new order in WooCommerce',
        category: 'Orders',
        icon: 'shopping-cart',
        verified: false,
        inputSchema: {
          customerId: {
            type: 'string',
            label: 'Customer ID',
            placeholder: '123',
            description: 'ID of the customer placing the order',
            order: 1,
            aiControlled: false
          },
          items: {
            type: 'array',
            required: true,
            label: 'Line Items',
            description: 'Array of products to include in the order',
            order: 2,
            aiControlled: false
          }
        },
        outputSchema: {
          type: 'object',
          properties: {
            id: { type: 'string' },
            total: { type: 'number' },
            status: { type: 'string' }
          }
        }
      },
      {
        id: 'update_stock',
        name: 'Update Stock',
        description: 'Update product stock levels',
        category: 'Products',
        icon: 'database',
        verified: false,
        inputSchema: {
          productId: {
            type: 'string',
            required: true,
            label: 'Product ID',
            placeholder: '123',
            description: 'ID of the product to update',
            order: 1,
            aiControlled: false
          },
          quantity: {
            type: 'number',
            required: true,
            label: 'Quantity',
            placeholder: '100',
            description: 'New stock quantity',
            min: 0,
            order: 2,
            aiControlled: false
          },
          operation: {
            type: 'select',
            label: 'Operation',
            description: 'How to apply the quantity change',
            default: 'set',
            options: [
              { label: 'Set', value: 'set' },
              { label: 'Increment', value: 'increment' },
              { label: 'Decrement', value: 'decrement' }
            ],
            order: 3,
            aiControlled: false
          }
        },
        outputSchema: {
          type: 'object',
          properties: {
            productId: { type: 'string' },
            quantity: { type: 'number' }
          }
        }
      },
      {
        id: 'create_coupon',
        name: 'Create Coupon',
        description: 'Create a discount coupon',
        category: 'Coupons',
        icon: 'tag',
        verified: false,
        inputSchema: {
          code: {
            type: 'string',
            required: true,
            label: 'Coupon Code',
            placeholder: 'SUMMER2024',
            description: 'Unique coupon code',
            order: 1,
            aiControlled: false
          },
          type: {
            type: 'select',
            required: true,
            label: 'Discount Type',
            description: 'Type of discount',
            options: [
              { label: 'Percentage', value: 'percentage' },
              { label: 'Fixed Amount', value: 'fixed_amount' }
            ],
            order: 2,
            aiControlled: false
          },
          value: {
            type: 'number',
            required: true,
            label: 'Discount Value',
            placeholder: '10',
            description: 'Discount amount (percentage or fixed)',
            min: 0,
            order: 3,
            aiControlled: false
          },
          description: {
            type: 'string',
            label: 'Description',
            description: 'Coupon description',
            order: 4,
            aiControlled: true,
            aiDescription: 'Description of the coupon'
          }
        },
        outputSchema: {
          type: 'object',
          properties: {
            id: { type: 'string' },
            code: { type: 'string' },
            type: { type: 'string' }
          }
        }
      },
      {
        id: 'create_category',
        name: 'Create Category',
        description: 'Create a product category',
        category: 'Products',
        icon: 'folder',
        verified: false,
        inputSchema: {
          name: {
            type: 'string',
            required: true,
            label: 'Category Name',
            placeholder: 'Electronics',
            description: 'Name of the category',
            order: 1,
            aiControlled: true,
            aiDescription: 'The name of the category'
          },
          description: {
            type: 'string',
            label: 'Description',
            description: 'Category description',
            order: 2,
            aiControlled: true,
            aiDescription: 'Description of the category'
          },
          parentId: {
            type: 'string',
            label: 'Parent Category ID',
            placeholder: '123',
            description: 'ID of parent category (optional)',
            order: 3,
            aiControlled: false
          }
        },
        outputSchema: {
          type: 'object',
          properties: {
            id: { type: 'string' },
            name: { type: 'string' }
          }
        }
      }
    ],
    supported_triggers: [
      {
        id: 'order_created',
        name: 'Order Created',
        description: 'Triggered when a new order is created',
        eventType: 'order.created',
        verified: false,
        icon: 'shopping-cart',
        webhookRequired: true,
        outputSchema: {
          id: { type: 'string', description: 'Order ID' },
          total: { type: 'string', description: 'Order total' },
          status: { type: 'string', description: 'Order status' },
          currency: { type: 'string', description: 'Currency code' },
          customerId: { type: 'string', description: 'Customer ID' }
        }
      },
      {
        id: 'order_updated',
        name: 'Order Updated',
        description: 'Triggered when an order is updated',
        eventType: 'order.updated',
        verified: false,
        icon: 'edit',
        webhookRequired: true,
        outputSchema: {
          id: { type: 'string', description: 'Order ID' },
          total: { type: 'string', description: 'Order total' },
          status: { type: 'string', description: 'Order status' }
        }
      },
      {
        id: 'product_created',
        name: 'Product Created',
        description: 'Triggered when a new product is created',
        eventType: 'product.created',
        verified: false,
        icon: 'package',
        webhookRequired: true,
        outputSchema: {
          id: { type: 'string', description: 'Product ID' },
          name: { type: 'string', description: 'Product name' },
          status: { type: 'string', description: 'Product status' }
        }
      },
      {
        id: 'customer_created',
        name: 'Customer Created',
        description: 'Triggered when a new customer is created',
        eventType: 'customer.created',
        verified: false,
        icon: 'user',
        webhookRequired: true,
        outputSchema: {
          id: { type: 'string', description: 'Customer ID' },
          email: { type: 'string', description: 'Customer email' },
          first_name: { type: 'string', description: 'First name' }
        }
      },
      {
        id: 'coupon_created',
        name: 'Coupon Created',
        description: 'Triggered when a new coupon is created',
        eventType: 'coupon.created',
        verified: false,
        icon: 'tag',
        webhookRequired: true,
        outputSchema: {
          id: { type: 'string', description: 'Coupon ID' },
          code: { type: 'string', description: 'Coupon code' },
          amount: { type: 'string', description: 'Discount amount' }
        }
      }
    ]
  };
