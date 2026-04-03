// Magento 2 Connector Definition

import { ConnectorDefinition } from '../../shared';

export const MAGENTO_CONNECTOR: ConnectorDefinition = {
  name: 'magento',
  display_name: 'Magento 2',
  category: 'ecommerce',
  description: 'E-commerce platform for creating online stores and managing products, orders, customers, and inventory',
  auth_type: 'bearer_token',
  auth_fields: [
    {
      key: 'host',
      label: 'Magento Host URL',
      type: 'string',
      required: true,
      placeholder: 'https://your-store.com',
      description: 'The URL of your Magento store (without trailing slash)',
      order: 0
    },
    {
      key: 'accessToken',
      label: 'Access Token',
      type: 'password',
      required: true,
      placeholder: 'Enter your Magento access token',
      description: 'Admin API access token from Magento Admin > System > Integrations',
      helpUrl: 'https://devdocs.magento.com/guides/v2.4/get-started/authentication/gs-authentication-token.html',
      helpText: 'How to create an access token',
      order: 1
    }
  ],
  endpoints: {
    customers: '/rest/default/V1/customers',
    products: '/rest/default/V1/products',
    orders: '/rest/default/V1/orders',
    invoices: '/rest/default/V1/invoices'
  },
  webhook_support: false,
  rate_limits: { requests_per_second: 10 },
  sandbox_available: false,
  verified: false,
  supported_actions: [
    // Customer Actions
    {
      id: 'create_customer',
      name: 'Create Customer',
      description: 'Create a new customer in Magento',
      category: 'Customers',
      icon: 'user-plus',
      verified: false,
      inputSchema: {
        email: {
          type: 'string',
          required: true,
          label: 'Email',
          placeholder: 'customer@example.com',
          description: 'Email address of the customer',
          order: 1,
          aiControlled: false
        },
        firstname: {
          type: 'string',
          required: true,
          label: 'First Name',
          placeholder: 'John',
          description: 'First name of the customer',
          order: 2,
          aiControlled: true,
          aiDescription: 'First name of the customer'
        },
        lastname: {
          type: 'string',
          required: true,
          label: 'Last Name',
          placeholder: 'Doe',
          description: 'Last name of the customer',
          order: 3,
          aiControlled: true,
          aiDescription: 'Last name of the customer'
        },
        websiteId: {
          type: 'number',
          label: 'Website ID',
          placeholder: '0',
          description: 'Website ID (0 for default)',
          default: 0,
          order: 4,
          aiControlled: false
        },
        groupId: {
          type: 'number',
          label: 'Group ID',
          placeholder: '1',
          description: 'Customer group ID',
          order: 5,
          aiControlled: false
        },
        storeId: {
          type: 'number',
          label: 'Store ID',
          placeholder: '1',
          description: 'Store view ID',
          order: 6,
          aiControlled: false
        },
        password: {
          type: 'password',
          label: 'Password',
          placeholder: 'Enter customer password',
          description: 'Customer account password',
          order: 7,
          aiControlled: false
        }
      },
      outputSchema: {
        type: 'object',
        properties: {
          customer: {
            type: 'object',
            description: 'Created customer object'
          }
        }
      }
    },
    {
      id: 'get_customer',
      name: 'Get Customer',
      description: 'Get a customer by ID',
      category: 'Customers',
      icon: 'user',
      verified: false,
      inputSchema: {
        customerId: {
          type: 'string',
          required: true,
          label: 'Customer ID',
          placeholder: '123',
          description: 'The ID of the customer to retrieve',
          order: 1,
          aiControlled: false
        }
      },
      outputSchema: {
        type: 'object',
        properties: {
          customer: {
            type: 'object',
            description: 'Customer object'
          }
        }
      }
    },
    {
      id: 'update_customer',
      name: 'Update Customer',
      description: 'Update an existing customer',
      category: 'Customers',
      icon: 'edit',
      verified: false,
      inputSchema: {
        customerId: {
          type: 'string',
          required: true,
          label: 'Customer ID',
          placeholder: '123',
          description: 'The ID of the customer to update',
          order: 1,
          aiControlled: false
        },
        email: {
          type: 'string',
          label: 'Email',
          placeholder: 'customer@example.com',
          order: 2,
          aiControlled: false
        },
        firstname: {
          type: 'string',
          label: 'First Name',
          order: 3,
          aiControlled: true,
          aiDescription: 'First name of the customer'
        },
        lastname: {
          type: 'string',
          label: 'Last Name',
          order: 4,
          aiControlled: true,
          aiDescription: 'Last name of the customer'
        }
      },
      outputSchema: {
        type: 'object',
        properties: {
          customer: {
            type: 'object',
            description: 'Updated customer object'
          }
        }
      }
    },
    {
      id: 'delete_customer',
      name: 'Delete Customer',
      description: 'Delete a customer by ID',
      category: 'Customers',
      icon: 'trash',
      verified: false,
      inputSchema: {
        customerId: {
          type: 'string',
          required: true,
          label: 'Customer ID',
          placeholder: '123',
          description: 'The ID of the customer to delete',
          order: 1,
          aiControlled: false
        }
      },
      outputSchema: {
        type: 'object',
        properties: {
          success: {
            type: 'boolean',
            description: 'Whether the deletion was successful'
          }
        }
      }
    },
    {
      id: 'get_all_customers',
      name: 'Get All Customers',
      description: 'Retrieve all customers with filtering options',
      category: 'Customers',
      icon: 'users',
      verified: false,
      inputSchema: {
        pageSize: {
          type: 'number',
          label: 'Page Size',
          description: 'Number of results per page',
          default: 100,
          min: 1,
          max: 1000,
          order: 1,
          aiControlled: false
        },
        currentPage: {
          type: 'number',
          label: 'Current Page',
          description: 'Page number to retrieve',
          default: 1,
          min: 1,
          order: 2,
          aiControlled: false
        },
        searchCriteria: {
          type: 'object',
          label: 'Search Criteria',
          description: 'Advanced search criteria (JSON object)',
          order: 3,
          aiControlled: false
        }
      },
      outputSchema: {
        type: 'object',
        properties: {
          customers: {
            type: 'array',
            description: 'Array of customer objects'
          }
        }
      }
    },

    // Product Actions
    {
      id: 'create_product',
      name: 'Create Product',
      description: 'Create a new product in Magento',
      category: 'Products',
      icon: 'package',
      verified: false,
      inputSchema: {
        sku: {
          type: 'string',
          required: true,
          label: 'SKU',
          placeholder: 'PROD-001',
          description: 'Stock-keeping unit (unique identifier)',
          order: 1,
          aiControlled: false
        },
        name: {
          type: 'string',
          required: true,
          label: 'Product Name',
          placeholder: 'Product Name',
          description: 'Name of the product',
          order: 2,
          aiControlled: true,
          aiDescription: 'Product name for display in the catalog'
        },
        attributeSetId: {
          type: 'number',
          required: true,
          label: 'Attribute Set ID',
          placeholder: '4',
          description: 'Attribute set ID (default is usually 4)',
          default: 4,
          order: 3,
          aiControlled: false
        },
        price: {
          type: 'number',
          required: true,
          label: 'Price',
          placeholder: '99.99',
          description: 'Product price',
          min: 0,
          order: 4,
          aiControlled: false
        },
        status: {
          type: 'select',
          label: 'Status',
          description: 'Product status',
          default: 1,
          options: [
            { label: 'Enabled', value: 1 },
            { label: 'Disabled', value: 2 }
          ],
          order: 5,
          aiControlled: false
        },
        visibility: {
          type: 'select',
          label: 'Visibility',
          description: 'Product visibility',
          default: 4,
          options: [
            { label: 'Not Visible', value: 1 },
            { label: 'Catalog', value: 2 },
            { label: 'Search', value: 3 },
            { label: 'Catalog & Search', value: 4 }
          ],
          order: 6,
          aiControlled: false
        },
        typeId: {
          type: 'select',
          label: 'Product Type',
          description: 'Type of product',
          default: 'simple',
          options: [
            { label: 'Simple', value: 'simple' },
            { label: 'Virtual', value: 'virtual' },
            { label: 'Downloadable', value: 'downloadable' },
            { label: 'Configurable', value: 'configurable' }
          ],
          order: 7,
          aiControlled: false
        },
        weight: {
          type: 'number',
          label: 'Weight',
          placeholder: '1.0',
          description: 'Product weight in pounds',
          min: 0,
          order: 8,
          aiControlled: false
        }
      },
      outputSchema: {
        type: 'object',
        properties: {
          product: {
            type: 'object',
            description: 'Created product object'
          }
        }
      }
    },
    {
      id: 'get_product',
      name: 'Get Product',
      description: 'Get a product by SKU',
      category: 'Products',
      icon: 'search',
      verified: false,
      inputSchema: {
        sku: {
          type: 'string',
          required: true,
          label: 'SKU',
          placeholder: 'PROD-001',
          description: 'Stock-keeping unit of the product',
          order: 1,
          aiControlled: false
        }
      },
      outputSchema: {
        type: 'object',
        properties: {
          product: {
            type: 'object',
            description: 'Product object'
          }
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
        sku: {
          type: 'string',
          required: true,
          label: 'SKU',
          placeholder: 'PROD-001',
          description: 'Stock-keeping unit of the product',
          order: 1,
          aiControlled: false
        },
        name: {
          type: 'string',
          label: 'Product Name',
          order: 2,
          aiControlled: true,
          aiDescription: 'Product name for display in the catalog'
        },
        price: {
          type: 'number',
          label: 'Price',
          placeholder: '99.99',
          min: 0,
          order: 3,
          aiControlled: false
        },
        status: {
          type: 'select',
          label: 'Status',
          options: [
            { label: 'Enabled', value: 1 },
            { label: 'Disabled', value: 2 }
          ],
          order: 4,
          aiControlled: false
        },
        visibility: {
          type: 'select',
          label: 'Visibility',
          options: [
            { label: 'Not Visible', value: 1 },
            { label: 'Catalog', value: 2 },
            { label: 'Search', value: 3 },
            { label: 'Catalog & Search', value: 4 }
          ],
          order: 5,
          aiControlled: false
        }
      },
      outputSchema: {
        type: 'object',
        properties: {
          product: {
            type: 'object',
            description: 'Updated product object'
          }
        }
      }
    },
    {
      id: 'delete_product',
      name: 'Delete Product',
      description: 'Delete a product by SKU',
      category: 'Products',
      icon: 'trash',
      verified: false,
      inputSchema: {
        sku: {
          type: 'string',
          required: true,
          label: 'SKU',
          placeholder: 'PROD-001',
          description: 'Stock-keeping unit of the product to delete',
          order: 1,
          aiControlled: false
        }
      },
      outputSchema: {
        type: 'object',
        properties: {
          success: {
            type: 'boolean',
            description: 'Whether the deletion was successful'
          }
        }
      }
    },
    {
      id: 'get_all_products',
      name: 'Get All Products',
      description: 'Retrieve all products with filtering options',
      category: 'Products',
      icon: 'list',
      verified: false,
      inputSchema: {
        pageSize: {
          type: 'number',
          label: 'Page Size',
          description: 'Number of results per page',
          default: 100,
          min: 1,
          max: 1000,
          order: 1,
          aiControlled: false
        },
        currentPage: {
          type: 'number',
          label: 'Current Page',
          description: 'Page number to retrieve',
          default: 1,
          min: 1,
          order: 2,
          aiControlled: false
        },
        searchCriteria: {
          type: 'object',
          label: 'Search Criteria',
          description: 'Advanced search criteria (JSON object)',
          order: 3,
          aiControlled: false
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

    // Order Actions
    {
      id: 'get_order',
      name: 'Get Order',
      description: 'Get an order by ID',
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
          order: {
            type: 'object',
            description: 'Order object'
          }
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
        pageSize: {
          type: 'number',
          label: 'Page Size',
          description: 'Number of results per page',
          default: 100,
          min: 1,
          max: 1000,
          order: 1,
          aiControlled: false
        },
        currentPage: {
          type: 'number',
          label: 'Current Page',
          description: 'Page number to retrieve',
          default: 1,
          min: 1,
          order: 2,
          aiControlled: false
        },
        searchCriteria: {
          type: 'object',
          label: 'Search Criteria',
          description: 'Advanced search criteria (JSON object)',
          order: 3,
          aiControlled: false
        }
      },
      outputSchema: {
        type: 'object',
        properties: {
          orders: {
            type: 'array',
            description: 'Array of order objects'
          }
        }
      }
    },
    {
      id: 'cancel_order',
      name: 'Cancel Order',
      description: 'Cancel an order',
      category: 'Orders',
      icon: 'x-circle',
      verified: false,
      inputSchema: {
        orderId: {
          type: 'string',
          required: true,
          label: 'Order ID',
          placeholder: '123',
          description: 'The ID of the order to cancel',
          order: 1,
          aiControlled: false
        }
      },
      outputSchema: {
        type: 'object',
        properties: {
          success: {
            type: 'boolean',
            description: 'Whether the cancellation was successful'
          }
        }
      }
    },
    {
      id: 'ship_order',
      name: 'Ship Order',
      description: 'Mark an order as shipped',
      category: 'Orders',
      icon: 'truck',
      verified: false,
      inputSchema: {
        orderId: {
          type: 'string',
          required: true,
          label: 'Order ID',
          placeholder: '123',
          description: 'The ID of the order to ship',
          order: 1,
          aiControlled: false
        }
      },
      outputSchema: {
        type: 'object',
        properties: {
          success: {
            type: 'boolean',
            description: 'Whether the shipping was successful'
          }
        }
      }
    },

    // Invoice Actions
    {
      id: 'create_invoice',
      name: 'Create Invoice',
      description: 'Create an invoice for an order',
      category: 'Invoices',
      icon: 'file-text',
      verified: false,
      inputSchema: {
        orderId: {
          type: 'string',
          required: true,
          label: 'Order ID',
          placeholder: '123',
          description: 'The ID of the order to invoice',
          order: 1,
          aiControlled: false
        }
      },
      outputSchema: {
        type: 'object',
        properties: {
          success: {
            type: 'boolean',
            description: 'Whether the invoice was created successfully'
          }
        }
      }
    }
  ],
  supported_triggers: []
};
