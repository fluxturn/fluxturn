// Shopify Connector
// Auto-generated from connector.constants.ts

import { ConnectorDefinition } from '../../shared';

export const SHOPIFY_CONNECTOR: ConnectorDefinition = {
    name: 'shopify',
    display_name: 'Shopify',
    category: 'ecommerce',
    description: 'Shopify store management',
    auth_type: 'multiple',
    auth_types: [
      { value: 'oauth2', label: 'One-Click OAuth (Recommended)' },
      { value: 'bearer_token', label: 'Manual Access Token' }
    ],
    auth_fields: [
      {
        key: 'authType',
        label: 'Authentication Type',
        type: 'select',
        required: true,
        options: [
          { label: 'One-Click OAuth (Recommended)', value: 'oauth2' },
          { label: 'Manual Access Token', value: 'bearer_token' }
        ],
        default: 'oauth2',
        description: 'Choose how to authenticate with Shopify',
        order: 0
      },
      {
        key: 'shopSubdomain',
        label: 'Shop Subdomain',
        type: 'string',
        required: true,
        placeholder: 'your-shop',
        description: 'Your Shopify shop subdomain (without .myshopify.com)',
        displayOptions: {
          authType: ['bearer_token']
        },
        order: 1
      },
      {
        key: 'accessToken',
        label: 'Access Token',
        type: 'password',
        required: true,
        placeholder: 'shpat_xxxxxxxxxxxxx',
        description: 'Admin API access token from Shopify',
        displayOptions: {
          authType: ['bearer_token']
        },
        order: 2
      },
      {
        key: 'appSecretKey',
        label: 'APP Secret Key',
        type: 'password',
        required: true,
        placeholder: 'shpss_xxxxxxxxxxxxx',
        description: 'API secret key for your Shopify app',
        displayOptions: {
          authType: ['bearer_token']
        },
        order: 3
      }
    ],
    endpoints: {
      products: '/admin/api/2024-07/products.json',
      orders: '/admin/api/2024-07/orders.json'
    },
    webhook_support: true,
    rate_limits: { requests_per_second: 2 },
    sandbox_available: true,
    verified: true,
    supported_actions: [
      {
        id: 'get_all_products',
        name: 'Get All Products',
        description: 'Retrieve all products with advanced filtering options',
        category: 'Products',
        icon: 'package',
        verified: false,
        inputSchema: {
          returnAll: {
            type: 'boolean',
            label: 'Return All',
            description: 'Whether to return all results or only up to a given limit',
            default: false,
            order: 1
          },
          limit: {
            type: 'number',
            label: 'Limit',
            description: 'Max number of results to return',
            default: 50,
            min: 1,
            max: 250,
            displayOptions: {
              show: {
                returnAll: [false]
              }
            },
            order: 2
          },
          collectionId: {
            type: 'string',
            label: 'Collection ID',
            placeholder: '1234567890',
            description: 'Filter results by product collection ID',
            order: 3
          },
          createdAtMin: {
            type: 'string',
            label: 'Created At Min',
            placeholder: '2025-01-01T00:00:00Z',
            description: 'Show products created after date (ISO 8601 format)',
            order: 4
          },
          createdAtMax: {
            type: 'string',
            label: 'Created At Max',
            placeholder: '2025-12-31T23:59:59Z',
            description: 'Show products created before date (ISO 8601 format)',
            order: 5
          },
          fields: {
            type: 'string',
            label: 'Fields',
            placeholder: 'id,title,vendor,product_type',
            description: 'Show only certain fields, specified by a comma-separated list',
            order: 6
          },
          handle: {
            type: 'string',
            label: 'Handle',
            placeholder: 'ipod-nano',
            description: 'Filter results by product handle',
            order: 7
          },
          ids: {
            type: 'string',
            label: 'Product IDs',
            placeholder: '632910392,632910393',
            description: 'Return only products specified by comma-separated list of IDs',
            order: 8
          },
          productType: {
            type: 'string',
            label: 'Product Type',
            placeholder: 'Electronics',
            description: 'Filter results by product type',
            order: 9
          },
          publishedStatus: {
            type: 'select',
            label: 'Published Status',
            description: 'Return products by their published status',
            default: 'any',
            options: [
              { label: 'Any', value: 'any' },
              { label: 'Published', value: 'published' },
              { label: 'Unpublished', value: 'unpublished' }
            ],
            order: 10
          },
          title: {
            type: 'string',
            label: 'Title',
            placeholder: 'IPod Nano',
            description: 'Filter results by product title',
            order: 11
          },
          vendor: {
            type: 'string',
            label: 'Vendor',
            placeholder: 'Apple',
            description: 'Filter results by product vendor',
            order: 12
          }
        },
        outputSchema: {
          type: 'object',
          properties: {
            products: {
              type: 'array',
              description: 'Array of product objects'
            }
          }
        }
      },
      {
        id: 'create_order',
        name: 'Create Order',
        description: 'Create a new order in Shopify',
        category: 'Orders',
        icon: 'shopping-cart',
        verified: false,
        inputSchema: {
          lineItems: {
            type: 'array',
            required: true,
            label: 'Line Items',
            description: 'Products to include in the order',
            order: 1,
            aiControlled: false
          },
          email: {
            type: 'string',
            label: 'Email',
            placeholder: 'customer@example.com',
            description: 'Customer email address',
            order: 2,
            aiControlled: false
          },
          financialStatus: {
            type: 'select',
            label: 'Financial Status',
            options: [
              { label: 'Pending', value: 'pending' },
              { label: 'Authorized', value: 'authorized' },
              { label: 'Paid', value: 'paid' }
            ],
            order: 3,
            aiControlled: false
          },
          sendReceipt: {
            type: 'boolean',
            label: 'Send Receipt',
            default: false,
            order: 4,
            aiControlled: false
          },
          note: {
            type: 'string',
            label: 'Note',
            description: 'Additional note for the order',
            order: 5,
            aiControlled: true,
            aiDescription: 'Additional note to add to the order'
          }
        },
        outputSchema: {
          type: 'object',
          properties: {
            order: { type: 'object' }
          }
        }
      },
      {
        id: 'get_order',
        name: 'Get Order',
        description: 'Get a single order by ID',
        category: 'Orders',
        icon: 'search',
        verified: false,
        inputSchema: {
          orderId: {
            type: 'string',
            required: true,
            label: 'Order ID',
            placeholder: '12345',
            description: 'The ID of the order to retrieve',
            order: 1
          },
          fields: {
            type: 'string',
            label: 'Fields',
            placeholder: 'id,email,created_at',
            description: 'Comma-separated list of fields to retrieve',
            order: 2
          }
        },
        outputSchema: {
          type: 'object',
          properties: {
            order: { type: 'object' }
          }
        }
      },
      {
        id: 'get_all_orders',
        name: 'Get All Orders',
        description: 'Retrieve all orders with filtering options',
        category: 'Orders',
        icon: 'list',
        verified: false,
        inputSchema: {
          returnAll: {
            type: 'boolean',
            label: 'Return All',
            default: false,
            order: 1
          },
          limit: {
            type: 'number',
            label: 'Limit',
            default: 50,
            min: 1,
            max: 250,
            displayOptions: {
              show: {
                returnAll: [false]
              }
            },
            order: 2
          },
          status: {
            type: 'select',
            label: 'Status',
            options: [
              { label: 'Any', value: 'any' },
              { label: 'Open', value: 'open' },
              { label: 'Closed', value: 'closed' },
              { label: 'Cancelled', value: 'cancelled' }
            ],
            order: 3
          },
          financialStatus: {
            type: 'select',
            label: 'Financial Status',
            options: [
              { label: 'Any', value: 'any' },
              { label: 'Authorized', value: 'authorized' },
              { label: 'Pending', value: 'pending' },
              { label: 'Paid', value: 'paid' },
              { label: 'Partially Paid', value: 'partially_paid' },
              { label: 'Refunded', value: 'refunded' },
              { label: 'Voided', value: 'voided' }
            ],
            order: 4
          },
          fulfillmentStatus: {
            type: 'select',
            label: 'Fulfillment Status',
            options: [
              { label: 'Any', value: 'any' },
              { label: 'Shipped', value: 'shipped' },
              { label: 'Partial', value: 'partial' },
              { label: 'Unshipped', value: 'unshipped' }
            ],
            order: 5
          }
        },
        outputSchema: {
          type: 'object',
          properties: {
            orders: { type: 'array' }
          }
        }
      },
      {
        id: 'update_order',
        name: 'Update Order',
        description: 'Update an existing order',
        category: 'Orders',
        icon: 'edit',
        verified: false,
        inputSchema: {
          orderId: {
            type: 'string',
            required: true,
            label: 'Order ID',
            placeholder: '12345',
            order: 1,
            aiControlled: false
          },
          email: {
            type: 'string',
            label: 'Email',
            order: 2,
            aiControlled: false
          },
          note: {
            type: 'string',
            label: 'Note',
            order: 3,
            aiControlled: true,
            aiDescription: 'Note to add to the order'
          },
          tags: {
            type: 'string',
            label: 'Tags',
            description: 'Comma-separated tags',
            order: 4,
            aiControlled: true,
            aiDescription: 'Tags to apply to the order (comma-separated)'
          }
        },
        outputSchema: {
          type: 'object',
          properties: {
            order: { type: 'object' }
          }
        }
      },
      {
        id: 'delete_order',
        name: 'Delete Order',
        description: 'Delete an order',
        category: 'Orders',
        icon: 'trash',
        verified: false,
        inputSchema: {
          orderId: {
            type: 'string',
            required: true,
            label: 'Order ID',
            placeholder: '12345',
            order: 1
          }
        },
        outputSchema: {
          type: 'object',
          properties: {
            success: { type: 'boolean' }
          }
        }
      },
      {
        id: 'create_product',
        name: 'Create Product',
        description: 'Create a new product',
        category: 'Products',
        icon: 'package',
        verified: false,
        inputSchema: {
          title: {
            type: 'string',
            required: true,
            label: 'Title',
            placeholder: 'Product Name',
            order: 1
          },
          bodyHtml: {
            type: 'string',
            label: 'Description',
            description: 'Product description (HTML allowed)',
            order: 2
          },
          vendor: {
            type: 'string',
            label: 'Vendor',
            order: 3
          },
          productType: {
            type: 'string',
            label: 'Product Type',
            order: 4
          },
          tags: {
            type: 'string',
            label: 'Tags',
            description: 'Comma-separated tags',
            order: 5
          }
        },
        outputSchema: {
          type: 'object',
          properties: {
            product: { type: 'object' }
          }
        }
      },
      {
        id: 'get_product',
        name: 'Get Product',
        description: 'Get a single product by ID',
        category: 'Products',
        icon: 'search',
        verified: false,
        inputSchema: {
          productId: {
            type: 'string',
            required: true,
            label: 'Product ID',
            placeholder: '12345',
            order: 1
          },
          fields: {
            type: 'string',
            label: 'Fields',
            placeholder: 'id,title,variants',
            description: 'Comma-separated list of fields',
            order: 2
          }
        },
        outputSchema: {
          type: 'object',
          properties: {
            product: { type: 'object' }
          }
        }
      },
      {
        id: 'update_product',
        name: 'Update Product',
        description: 'Update an existing product',
        category: 'Products',
        icon: 'edit',
        verified: false,
        inputSchema: {
          productId: {
            type: 'string',
            required: true,
            label: 'Product ID',
            placeholder: '12345',
            order: 1
          },
          title: {
            type: 'string',
            label: 'Title',
            order: 2
          },
          bodyHtml: {
            type: 'string',
            label: 'Description',
            order: 3
          },
          vendor: {
            type: 'string',
            label: 'Vendor',
            order: 4
          },
          productType: {
            type: 'string',
            label: 'Product Type',
            order: 5
          },
          tags: {
            type: 'string',
            label: 'Tags',
            order: 6
          }
        },
        outputSchema: {
          type: 'object',
          properties: {
            product: { type: 'object' }
          }
        }
      },
      {
        id: 'delete_product',
        name: 'Delete Product',
        description: 'Delete a product',
        category: 'Products',
        icon: 'trash',
        verified: false,
        inputSchema: {
          productId: {
            type: 'string',
            required: true,
            label: 'Product ID',
            placeholder: '12345',
            order: 1
          }
        },
        outputSchema: {
          type: 'object',
          properties: {
            success: { type: 'boolean' }
          }
        }
      }
    ],
    supported_triggers: []
  };
