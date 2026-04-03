// Zoho CRM Connector Definition
// Based on n8n Zoho CRM implementation

import { ConnectorDefinition } from '../../shared';

export const ZOHO_CONNECTOR: ConnectorDefinition = {
  name: 'zoho',
  display_name: 'Zoho CRM',
  category: 'crm',
  description: 'Zoho CRM platform with comprehensive customer relationship management and automation tools',
  auth_type: 'multiple',
  auth_fields: [
    {
      key: 'authType',
      label: 'Authentication Type',
      type: 'select',
      required: true,
      options: [
        { label: 'OAuth2 (Recommended)', value: 'oauth2', description: 'Connect with one-click OAuth' },
        { label: 'Custom OAuth App', value: 'manual', description: 'Use your own Zoho app credentials' }
      ],
      default: 'oauth2'
    },
    {
      key: 'apiDomain',
      label: 'Data Center',
      type: 'select',
      required: true,
      options: [
        { label: 'United States (.com)', value: 'com' },
        { label: 'Europe (.eu)', value: 'eu' },
        { label: 'India (.in)', value: 'in' },
        { label: 'Australia (.com.au)', value: 'au' },
        { label: 'Japan (.jp)', value: 'jp' },
        { label: 'Canada (.ca)', value: 'ca' }
      ],
      default: 'com',
      description: 'Select your Zoho data center region'
    },
    {
      key: 'clientId',
      label: 'Client ID',
      type: 'string',
      required: true,
      placeholder: 'Your Zoho Client ID',
      displayOptions: { authType: ['manual'] }
    },
    {
      key: 'clientSecret',
      label: 'Client Secret',
      type: 'password',
      required: true,
      placeholder: 'Your Zoho Client Secret',
      displayOptions: { authType: ['manual'] }
    }
  ],
  endpoints: {
    accounts: '/crm/v2/Accounts',
    contacts: '/crm/v2/Contacts',
    deals: '/crm/v2/Deals',
    invoices: '/crm/v2/Invoices',
    leads: '/crm/v2/Leads',
    products: '/crm/v2/Products',
    purchase_orders: '/crm/v2/Purchase_Orders',
    quotes: '/crm/v2/Quotes',
    sales_orders: '/crm/v2/Sales_Orders',
    vendors: '/crm/v2/Vendors',
    settings: '/crm/v2/settings'
  },
  webhook_support: true,
  rate_limits: {
    requests_per_minute: 100,
    requests_per_day: 5000
  },
  sandbox_available: true,
  oauth_config: {
    authorization_url: 'https://accounts.zoho.com/oauth/v2/auth',
    token_url: 'https://accounts.zoho.com/oauth/v2/token',
    scopes: [
      'ZohoCRM.modules.ALL',
      'ZohoCRM.settings.ALL',
      'ZohoCRM.users.READ'
    ]
  },
  supported_actions: [
    // Account Actions
    {
      id: 'account_create',
      name: 'Create Account',
      description: 'Create a new account in Zoho CRM',
      category: 'Account',
      inputSchema: {
        accountName: {
          type: 'string',
          required: true,
          label: 'Account Name',
          description: 'Name of the account',
          aiControlled: true,
          aiDescription: 'The name of the account/company.'
        },
        accountNumber: {
          type: 'string',
          label: 'Account Number',
          description: 'Account number',
          aiControlled: false
        },
        phone: {
          type: 'string',
          label: 'Phone',
          description: 'Phone number',
          aiControlled: false
        },
        website: {
          type: 'string',
          label: 'Website',
          description: 'Website URL',
          aiControlled: false
        },
        industry: {
          type: 'string',
          label: 'Industry',
          description: 'Industry type',
          aiControlled: false
        },
        employees: {
          type: 'number',
          label: 'Employees',
          description: 'Number of employees',
          aiControlled: false
        }
      }
    },
    {
      id: 'account_update',
      name: 'Update Account',
      description: 'Update an existing account',
      category: 'Account',
      inputSchema: {
        accountId: {
          type: 'string',
          required: true,
          label: 'Account ID',
          description: 'ID of the account to update',
          aiControlled: false
        }
      }
    },
    {
      id: 'account_get',
      name: 'Get Account',
      description: 'Retrieve a single account by ID',
      category: 'Account',
      inputSchema: {
        accountId: {
          type: 'string',
          required: true,
          label: 'Account ID',
          description: 'ID of the account to retrieve',
          aiControlled: false
        }
      }
    },
    {
      id: 'account_get_all',
      name: 'Get All Accounts',
      description: 'Retrieve multiple accounts',
      category: 'Account',
      inputSchema: {
        returnAll: {
          type: 'boolean',
          label: 'Return All',
          default: false,
          description: 'Whether to return all results or only up to a limit',
          aiControlled: false
        },
        limit: {
          type: 'number',
          label: 'Limit',
          default: 200,
          description: 'Maximum number of results to return',
          aiControlled: false
        }
      }
    },
    {
      id: 'account_delete',
      name: 'Delete Account',
      description: 'Delete an account',
      category: 'Account',
      inputSchema: {
        accountId: {
          type: 'string',
          required: true,
          label: 'Account ID',
          description: 'ID of the account to delete',
          aiControlled: false
        }
      }
    },
    {
      id: 'account_upsert',
      name: 'Upsert Account',
      description: 'Create or update an account',
      category: 'Account',
      inputSchema: {
        accountName: {
          type: 'string',
          required: true,
          label: 'Account Name',
          description: 'Name of the account',
          aiControlled: true,
          aiDescription: 'The name of the account/company.'
        }
      }
    },

    // Contact Actions
    {
      id: 'contact_create',
      name: 'Create Contact',
      description: 'Create a new contact in Zoho CRM',
      category: 'Contact',
      inputSchema: {
        lastName: {
          type: 'string',
          required: true,
          label: 'Last Name',
          description: 'Last name of the contact',
          aiControlled: true,
          aiDescription: 'The last name of the person.'
        },
        firstName: {
          type: 'string',
          label: 'First Name',
          description: 'First name of the contact',
          aiControlled: true,
          aiDescription: 'The first name of the person.'
        },
        email: {
          type: 'string',
          label: 'Email',
          description: 'Email address',
          aiControlled: false
        },
        phone: {
          type: 'string',
          label: 'Phone',
          description: 'Phone number',
          aiControlled: false
        }
      }
    },
    {
      id: 'contact_update',
      name: 'Update Contact',
      description: 'Update an existing contact',
      category: 'Contact',
      inputSchema: {
        contactId: {
          type: 'string',
          required: true,
          label: 'Contact ID',
          description: 'ID of the contact to update',
          aiControlled: false
        }
      }
    },
    {
      id: 'contact_get',
      name: 'Get Contact',
      description: 'Retrieve a single contact by ID',
      category: 'Contact',
      inputSchema: {
        contactId: {
          type: 'string',
          required: true,
          label: 'Contact ID',
          description: 'ID of the contact to retrieve',
          aiControlled: false
        }
      }
    },
    {
      id: 'contact_get_all',
      name: 'Get All Contacts',
      description: 'Retrieve multiple contacts',
      category: 'Contact',
      inputSchema: {
        returnAll: {
          type: 'boolean',
          label: 'Return All',
          default: false,
          aiControlled: false
        },
        limit: {
          type: 'number',
          label: 'Limit',
          default: 200,
          aiControlled: false
        }
      }
    },
    {
      id: 'contact_delete',
      name: 'Delete Contact',
      description: 'Delete a contact',
      category: 'Contact',
      inputSchema: {
        contactId: {
          type: 'string',
          required: true,
          label: 'Contact ID',
          aiControlled: false
        }
      }
    },
    {
      id: 'contact_upsert',
      name: 'Upsert Contact',
      description: 'Create or update a contact',
      category: 'Contact',
      inputSchema: {
        lastName: {
          type: 'string',
          required: true,
          label: 'Last Name',
          aiControlled: true,
          aiDescription: 'The last name of the person.'
        }
      }
    },

    // Deal Actions
    {
      id: 'deal_create',
      name: 'Create Deal',
      description: 'Create a new deal in Zoho CRM',
      category: 'Deal',
      inputSchema: {
        dealName: {
          type: 'string',
          required: true,
          label: 'Deal Name',
          description: 'Name of the deal',
          aiControlled: true,
          aiDescription: 'The name/title of the deal.'
        },
        stage: {
          type: 'string',
          required: true,
          label: 'Stage',
          description: 'Deal stage',
          aiControlled: false
        },
        amount: {
          type: 'number',
          label: 'Amount',
          description: 'Deal amount',
          aiControlled: false
        },
        closingDate: {
          type: 'string',
          label: 'Closing Date',
          description: 'Expected closing date',
          aiControlled: false
        }
      }
    },
    {
      id: 'deal_update',
      name: 'Update Deal',
      description: 'Update an existing deal',
      category: 'Deal',
      inputSchema: {
        dealId: {
          type: 'string',
          required: true,
          label: 'Deal ID',
          aiControlled: false
        }
      }
    },
    {
      id: 'deal_get',
      name: 'Get Deal',
      description: 'Retrieve a single deal by ID',
      category: 'Deal',
      inputSchema: {
        dealId: {
          type: 'string',
          required: true,
          label: 'Deal ID',
          aiControlled: false
        }
      }
    },
    {
      id: 'deal_get_all',
      name: 'Get All Deals',
      description: 'Retrieve multiple deals',
      category: 'Deal',
      inputSchema: {
        returnAll: {
          type: 'boolean',
          label: 'Return All',
          default: false,
          aiControlled: false
        },
        limit: {
          type: 'number',
          label: 'Limit',
          default: 200,
          aiControlled: false
        }
      }
    },
    {
      id: 'deal_delete',
      name: 'Delete Deal',
      description: 'Delete a deal',
      category: 'Deal',
      inputSchema: {
        dealId: {
          type: 'string',
          required: true,
          label: 'Deal ID',
          aiControlled: false
        }
      }
    },
    {
      id: 'deal_upsert',
      name: 'Upsert Deal',
      description: 'Create or update a deal',
      category: 'Deal',
      inputSchema: {
        dealName: {
          type: 'string',
          required: true,
          label: 'Deal Name',
          aiControlled: true,
          aiDescription: 'The name/title of the deal.'
        },
        stage: {
          type: 'string',
          required: true,
          label: 'Stage',
          aiControlled: false
        }
      }
    },

    // Lead Actions
    {
      id: 'lead_create',
      name: 'Create Lead',
      description: 'Create a new lead in Zoho CRM',
      category: 'Lead',
      inputSchema: {
        lastName: {
          type: 'string',
          required: true,
          label: 'Last Name',
          description: 'Last name of the lead',
          aiControlled: true,
          aiDescription: 'The last name of the person.'
        },
        company: {
          type: 'string',
          required: true,
          label: 'Company',
          description: 'Company name',
          aiControlled: true,
          aiDescription: 'The name of the company.'
        },
        firstName: {
          type: 'string',
          label: 'First Name',
          description: 'First name of the lead',
          aiControlled: true,
          aiDescription: 'The first name of the person.'
        },
        email: {
          type: 'string',
          label: 'Email',
          description: 'Email address',
          aiControlled: false
        },
        phone: {
          type: 'string',
          label: 'Phone',
          description: 'Phone number',
          aiControlled: false
        }
      }
    },
    {
      id: 'lead_update',
      name: 'Update Lead',
      description: 'Update an existing lead',
      category: 'Lead',
      inputSchema: {
        leadId: {
          type: 'string',
          required: true,
          label: 'Lead ID',
          aiControlled: false
        }
      }
    },
    {
      id: 'lead_get',
      name: 'Get Lead',
      description: 'Retrieve a single lead by ID',
      category: 'Lead',
      inputSchema: {
        leadId: {
          type: 'string',
          required: true,
          label: 'Lead ID',
          aiControlled: false
        }
      }
    },
    {
      id: 'lead_get_all',
      name: 'Get All Leads',
      description: 'Retrieve multiple leads',
      category: 'Lead',
      inputSchema: {
        returnAll: {
          type: 'boolean',
          label: 'Return All',
          default: false,
          aiControlled: false
        },
        limit: {
          type: 'number',
          label: 'Limit',
          default: 200,
          aiControlled: false
        }
      }
    },
    {
      id: 'lead_delete',
      name: 'Delete Lead',
      description: 'Delete a lead',
      category: 'Lead',
      inputSchema: {
        leadId: {
          type: 'string',
          required: true,
          label: 'Lead ID',
          aiControlled: false
        }
      }
    },
    {
      id: 'lead_upsert',
      name: 'Upsert Lead',
      description: 'Create or update a lead',
      category: 'Lead',
      inputSchema: {
        lastName: {
          type: 'string',
          required: true,
          label: 'Last Name',
          aiControlled: true,
          aiDescription: 'The last name of the person.'
        },
        company: {
          type: 'string',
          required: true,
          label: 'Company',
          aiControlled: true,
          aiDescription: 'The name of the company.'
        }
      }
    },
    {
      id: 'lead_get_fields',
      name: 'Get Lead Fields',
      description: 'Retrieve all fields for the lead module',
      category: 'Lead',
      inputSchema: {}
    },

    // Product Actions
    {
      id: 'product_create',
      name: 'Create Product',
      description: 'Create a new product in Zoho CRM',
      category: 'Product',
      inputSchema: {
        productName: {
          type: 'string',
          required: true,
          label: 'Product Name',
          description: 'Name of the product',
          aiControlled: true,
          aiDescription: 'The name of the product.'
        },
        unitPrice: {
          type: 'number',
          label: 'Unit Price',
          description: 'Unit price of the product',
          aiControlled: false
        }
      }
    },
    {
      id: 'product_update',
      name: 'Update Product',
      description: 'Update an existing product',
      category: 'Product',
      inputSchema: {
        productId: {
          type: 'string',
          required: true,
          label: 'Product ID',
          aiControlled: false
        }
      }
    },
    {
      id: 'product_get',
      name: 'Get Product',
      description: 'Retrieve a single product by ID',
      category: 'Product',
      inputSchema: {
        productId: {
          type: 'string',
          required: true,
          label: 'Product ID',
          aiControlled: false
        }
      }
    },
    {
      id: 'product_get_all',
      name: 'Get All Products',
      description: 'Retrieve multiple products',
      category: 'Product',
      inputSchema: {
        returnAll: {
          type: 'boolean',
          label: 'Return All',
          default: false,
          aiControlled: false
        },
        limit: {
          type: 'number',
          label: 'Limit',
          default: 200,
          aiControlled: false
        }
      }
    },
    {
      id: 'product_delete',
      name: 'Delete Product',
      description: 'Delete a product',
      category: 'Product',
      inputSchema: {
        productId: {
          type: 'string',
          required: true,
          label: 'Product ID',
          aiControlled: false
        }
      }
    },
    {
      id: 'product_upsert',
      name: 'Upsert Product',
      description: 'Create or update a product',
      category: 'Product',
      inputSchema: {
        productName: {
          type: 'string',
          required: true,
          label: 'Product Name',
          aiControlled: true,
          aiDescription: 'The name of the product.'
        }
      }
    },

    // Invoice Actions
    {
      id: 'invoice_create',
      name: 'Create Invoice',
      description: 'Create a new invoice in Zoho CRM',
      category: 'Invoice',
      inputSchema: {
        subject: {
          type: 'string',
          required: true,
          label: 'Subject',
          description: 'Invoice subject',
          aiControlled: true,
          aiDescription: 'The subject line for this record.'
        },
        productDetails: {
          type: 'array',
          required: true,
          label: 'Product Details',
          description: 'Array of products with quantities',
          aiControlled: false
        }
      }
    },
    {
      id: 'invoice_update',
      name: 'Update Invoice',
      description: 'Update an existing invoice',
      category: 'Invoice',
      inputSchema: {
        invoiceId: {
          type: 'string',
          required: true,
          label: 'Invoice ID',
          aiControlled: false
        }
      }
    },
    {
      id: 'invoice_get',
      name: 'Get Invoice',
      description: 'Retrieve a single invoice by ID',
      category: 'Invoice',
      inputSchema: {
        invoiceId: {
          type: 'string',
          required: true,
          label: 'Invoice ID',
          aiControlled: false
        }
      }
    },
    {
      id: 'invoice_get_all',
      name: 'Get All Invoices',
      description: 'Retrieve multiple invoices',
      category: 'Invoice',
      inputSchema: {
        returnAll: {
          type: 'boolean',
          label: 'Return All',
          default: false,
          aiControlled: false
        },
        limit: {
          type: 'number',
          label: 'Limit',
          default: 200,
          aiControlled: false
        }
      }
    },
    {
      id: 'invoice_delete',
      name: 'Delete Invoice',
      description: 'Delete an invoice',
      category: 'Invoice',
      inputSchema: {
        invoiceId: {
          type: 'string',
          required: true,
          label: 'Invoice ID',
          aiControlled: false
        }
      }
    },
    {
      id: 'invoice_upsert',
      name: 'Upsert Invoice',
      description: 'Create or update an invoice',
      category: 'Invoice',
      inputSchema: {
        subject: {
          type: 'string',
          required: true,
          label: 'Subject',
          aiControlled: true,
          aiDescription: 'The subject line for this record.'
        },
        productDetails: {
          type: 'array',
          required: true,
          label: 'Product Details',
          aiControlled: false
        }
      }
    },

    // Purchase Order Actions
    {
      id: 'purchase_order_create',
      name: 'Create Purchase Order',
      description: 'Create a new purchase order in Zoho CRM',
      category: 'Purchase Order',
      inputSchema: {
        subject: {
          type: 'string',
          required: true,
          label: 'Subject',
          aiControlled: true,
          aiDescription: 'The subject line for this record.'
        },
        vendorId: {
          type: 'string',
          required: true,
          label: 'Vendor ID',
          aiControlled: false
        },
        productDetails: {
          type: 'array',
          required: true,
          label: 'Product Details',
          aiControlled: false
        }
      }
    },
    {
      id: 'purchase_order_update',
      name: 'Update Purchase Order',
      description: 'Update an existing purchase order',
      category: 'Purchase Order',
      inputSchema: {
        purchaseOrderId: {
          type: 'string',
          required: true,
          label: 'Purchase Order ID',
          aiControlled: false
        }
      }
    },
    {
      id: 'purchase_order_get',
      name: 'Get Purchase Order',
      description: 'Retrieve a single purchase order by ID',
      category: 'Purchase Order',
      inputSchema: {
        purchaseOrderId: {
          type: 'string',
          required: true,
          label: 'Purchase Order ID',
          aiControlled: false
        }
      }
    },
    {
      id: 'purchase_order_get_all',
      name: 'Get All Purchase Orders',
      description: 'Retrieve multiple purchase orders',
      category: 'Purchase Order',
      inputSchema: {
        returnAll: {
          type: 'boolean',
          label: 'Return All',
          default: false,
          aiControlled: false
        },
        limit: {
          type: 'number',
          label: 'Limit',
          default: 200,
          aiControlled: false
        }
      }
    },
    {
      id: 'purchase_order_delete',
      name: 'Delete Purchase Order',
      description: 'Delete a purchase order',
      category: 'Purchase Order',
      inputSchema: {
        purchaseOrderId: {
          type: 'string',
          required: true,
          label: 'Purchase Order ID',
          aiControlled: false
        }
      }
    },
    {
      id: 'purchase_order_upsert',
      name: 'Upsert Purchase Order',
      description: 'Create or update a purchase order',
      category: 'Purchase Order',
      inputSchema: {
        subject: {
          type: 'string',
          required: true,
          label: 'Subject',
          aiControlled: true,
          aiDescription: 'The subject line for this record.'
        },
        vendorId: {
          type: 'string',
          required: true,
          label: 'Vendor ID',
          aiControlled: false
        },
        productDetails: {
          type: 'array',
          required: true,
          label: 'Product Details',
          aiControlled: false
        }
      }
    },

    // Quote Actions
    {
      id: 'quote_create',
      name: 'Create Quote',
      description: 'Create a new quote in Zoho CRM',
      category: 'Quote',
      inputSchema: {
        subject: {
          type: 'string',
          required: true,
          label: 'Subject',
          aiControlled: true,
          aiDescription: 'The subject line for this record.'
        },
        productDetails: {
          type: 'array',
          required: true,
          label: 'Product Details',
          aiControlled: false
        }
      }
    },
    {
      id: 'quote_update',
      name: 'Update Quote',
      description: 'Update an existing quote',
      category: 'Quote',
      inputSchema: {
        quoteId: {
          type: 'string',
          required: true,
          label: 'Quote ID',
          aiControlled: false
        }
      }
    },
    {
      id: 'quote_get',
      name: 'Get Quote',
      description: 'Retrieve a single quote by ID',
      category: 'Quote',
      inputSchema: {
        quoteId: {
          type: 'string',
          required: true,
          label: 'Quote ID',
          aiControlled: false
        }
      }
    },
    {
      id: 'quote_get_all',
      name: 'Get All Quotes',
      description: 'Retrieve multiple quotes',
      category: 'Quote',
      inputSchema: {
        returnAll: {
          type: 'boolean',
          label: 'Return All',
          default: false,
          aiControlled: false
        },
        limit: {
          type: 'number',
          label: 'Limit',
          default: 200,
          aiControlled: false
        }
      }
    },
    {
      id: 'quote_delete',
      name: 'Delete Quote',
      description: 'Delete a quote',
      category: 'Quote',
      inputSchema: {
        quoteId: {
          type: 'string',
          required: true,
          label: 'Quote ID',
          aiControlled: false
        }
      }
    },
    {
      id: 'quote_upsert',
      name: 'Upsert Quote',
      description: 'Create or update a quote',
      category: 'Quote',
      inputSchema: {
        subject: {
          type: 'string',
          required: true,
          label: 'Subject',
          aiControlled: true,
          aiDescription: 'The subject line for this record.'
        },
        productDetails: {
          type: 'array',
          required: true,
          label: 'Product Details',
          aiControlled: false
        }
      }
    },

    // Sales Order Actions
    {
      id: 'sales_order_create',
      name: 'Create Sales Order',
      description: 'Create a new sales order in Zoho CRM',
      category: 'Sales Order',
      inputSchema: {
        subject: {
          type: 'string',
          required: true,
          label: 'Subject',
          aiControlled: true,
          aiDescription: 'The subject line for this record.'
        },
        accountId: {
          type: 'string',
          required: true,
          label: 'Account ID',
          aiControlled: false
        },
        productDetails: {
          type: 'array',
          required: true,
          label: 'Product Details',
          aiControlled: false
        }
      }
    },
    {
      id: 'sales_order_update',
      name: 'Update Sales Order',
      description: 'Update an existing sales order',
      category: 'Sales Order',
      inputSchema: {
        salesOrderId: {
          type: 'string',
          required: true,
          label: 'Sales Order ID',
          aiControlled: false
        }
      }
    },
    {
      id: 'sales_order_get',
      name: 'Get Sales Order',
      description: 'Retrieve a single sales order by ID',
      category: 'Sales Order',
      inputSchema: {
        salesOrderId: {
          type: 'string',
          required: true,
          label: 'Sales Order ID',
          aiControlled: false
        }
      }
    },
    {
      id: 'sales_order_get_all',
      name: 'Get All Sales Orders',
      description: 'Retrieve multiple sales orders',
      category: 'Sales Order',
      inputSchema: {
        returnAll: {
          type: 'boolean',
          label: 'Return All',
          default: false,
          aiControlled: false
        },
        limit: {
          type: 'number',
          label: 'Limit',
          default: 200,
          aiControlled: false
        }
      }
    },
    {
      id: 'sales_order_delete',
      name: 'Delete Sales Order',
      description: 'Delete a sales order',
      category: 'Sales Order',
      inputSchema: {
        salesOrderId: {
          type: 'string',
          required: true,
          label: 'Sales Order ID',
          aiControlled: false
        }
      }
    },
    {
      id: 'sales_order_upsert',
      name: 'Upsert Sales Order',
      description: 'Create or update a sales order',
      category: 'Sales Order',
      inputSchema: {
        subject: {
          type: 'string',
          required: true,
          label: 'Subject',
          aiControlled: true,
          aiDescription: 'The subject line for this record.'
        },
        accountId: {
          type: 'string',
          required: true,
          label: 'Account ID',
          aiControlled: false
        },
        productDetails: {
          type: 'array',
          required: true,
          label: 'Product Details',
          aiControlled: false
        }
      }
    },

    // Vendor Actions
    {
      id: 'vendor_create',
      name: 'Create Vendor',
      description: 'Create a new vendor in Zoho CRM',
      category: 'Vendor',
      inputSchema: {
        vendorName: {
          type: 'string',
          required: true,
          label: 'Vendor Name',
          description: 'Name of the vendor',
          aiControlled: true,
          aiDescription: 'The name of the vendor.'
        },
        email: {
          type: 'string',
          label: 'Email',
          description: 'Vendor email address',
          aiControlled: false
        },
        phone: {
          type: 'string',
          label: 'Phone',
          description: 'Vendor phone number',
          aiControlled: false
        }
      }
    },
    {
      id: 'vendor_update',
      name: 'Update Vendor',
      description: 'Update an existing vendor',
      category: 'Vendor',
      inputSchema: {
        vendorId: {
          type: 'string',
          required: true,
          label: 'Vendor ID',
          aiControlled: false
        }
      }
    },
    {
      id: 'vendor_get',
      name: 'Get Vendor',
      description: 'Retrieve a single vendor by ID',
      category: 'Vendor',
      inputSchema: {
        vendorId: {
          type: 'string',
          required: true,
          label: 'Vendor ID',
          aiControlled: false
        }
      }
    },
    {
      id: 'vendor_get_all',
      name: 'Get All Vendors',
      description: 'Retrieve multiple vendors',
      category: 'Vendor',
      inputSchema: {
        returnAll: {
          type: 'boolean',
          label: 'Return All',
          default: false,
          aiControlled: false
        },
        limit: {
          type: 'number',
          label: 'Limit',
          default: 200,
          aiControlled: false
        }
      }
    },
    {
      id: 'vendor_delete',
      name: 'Delete Vendor',
      description: 'Delete a vendor',
      category: 'Vendor',
      inputSchema: {
        vendorId: {
          type: 'string',
          required: true,
          label: 'Vendor ID',
          aiControlled: false
        }
      }
    },
    {
      id: 'vendor_upsert',
      name: 'Upsert Vendor',
      description: 'Create or update a vendor',
      category: 'Vendor',
      inputSchema: {
        vendorName: {
          type: 'string',
          required: true,
          label: 'Vendor Name',
          aiControlled: true,
          aiDescription: 'The name of the vendor.'
        }
      }
    }
  ],
  supported_triggers: [
    {
      id: 'record_created',
      name: 'Record Created',
      description: 'Triggered when a record is created in any module',
      eventType: 'record.created',
      webhookRequired: true,
      outputSchema: {
        record: { type: 'object', description: 'Created record data' },
        module: { type: 'string', description: 'Module name' }
      }
    },
    {
      id: 'record_updated',
      name: 'Record Updated',
      description: 'Triggered when a record is updated',
      eventType: 'record.updated',
      webhookRequired: true,
      outputSchema: {
        record: { type: 'object', description: 'Updated record data' },
        module: { type: 'string', description: 'Module name' }
      }
    },
    {
      id: 'deal_stage_changed',
      name: 'Deal Stage Changed',
      description: 'Triggered when a deal stage is changed',
      eventType: 'deal.stage_changed',
      webhookRequired: true,
      outputSchema: {
        deal: { type: 'object', description: 'Deal data' },
        previousStage: { type: 'string', description: 'Previous stage' },
        newStage: { type: 'string', description: 'New stage' }
      }
    },
    {
      id: 'lead_converted',
      name: 'Lead Converted',
      description: 'Triggered when a lead is converted to a contact/account',
      eventType: 'lead.converted',
      webhookRequired: true,
      outputSchema: {
        lead: { type: 'object', description: 'Converted lead information' },
        contact: { type: 'object', description: 'Created contact information' },
        account: { type: 'object', description: 'Created account information' }
      }
    }
  ]
};
