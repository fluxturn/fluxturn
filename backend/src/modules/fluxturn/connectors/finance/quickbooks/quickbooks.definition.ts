import { ConnectorDefinition } from '../../shared';

/**
 * QuickBooks Connector Definition
 *
 * Accounting software for small to medium businesses with comprehensive
 * invoicing, billing, payment tracking, and financial reporting.
 *
 * Resources:
 * - Customers: Customer management
 * - Invoices: Invoice creation and management
 * - Bills: Bill tracking and payments
 * - Payments: Payment processing
 * - Estimates: Quote/estimate management
 * - Items: Product and service items
 * - Vendors: Vendor management
 *
 * Authentication:
 * - OAuth2 (required for QuickBooks Online)
 */
export const QUICKBOOKS_CONNECTOR: ConnectorDefinition = {
  name: 'quickbooks',
  display_name: 'QuickBooks',
  category: 'finance',
  description: 'Accounting software for invoicing, billing, payments, and financial management',

  auth_type: 'multiple',

  oauth_config: {
    authorization_url: 'https://appcenter.intuit.com/connect/oauth2',
    token_url: 'https://oauth.platform.intuit.com/oauth2/v1/tokens/bearer',
    scopes: [
      'com.intuit.quickbooks.accounting',
    ],
  },

  auth_fields: [
    {
      key: 'authType',
      label: 'Authentication Type',
      type: 'select',
      required: true,
      default: 'apiKey',
      options: [
        { label: 'Access Token', value: 'apiKey' },
        { label: 'OAuth2', value: 'oauth2' },
      ],
      description: 'Choose authentication method',
    },
    {
      key: 'environment',
      label: 'Environment',
      type: 'select',
      required: true,
      default: 'production',
      options: [
        { label: 'Production', value: 'production' },
        { label: 'Sandbox', value: 'sandbox' },
      ],
      description: 'QuickBooks environment',
    },
    {
      key: 'realmId',
      label: 'Realm ID (Company ID)',
      type: 'string',
      required: true,
      placeholder: '1234567890',
      description: 'Your QuickBooks company/realm ID. Found in your QuickBooks URL.',
    },
    {
      key: 'accessToken',
      label: 'Access Token',
      type: 'password',
      required: true,
      placeholder: 'Enter your access token',
      description: 'OAuth2 access token from QuickBooks',
      displayOptions: {
        authType: ['apiKey'],
      },
    },
    {
      key: 'refreshToken',
      label: 'Refresh Token',
      type: 'password',
      required: false,
      placeholder: 'Enter your refresh token (optional)',
      description: 'OAuth2 refresh token for automatic token renewal',
      displayOptions: {
        authType: ['apiKey'],
      },
    },
  ],

  endpoints: {
    base_url: 'https://quickbooks.api.intuit.com/v3/company/{companyId}',
    sandbox_url: 'https://sandbox-quickbooks.api.intuit.com/v3/company/{companyId}',
    customers: '/customer',
    invoices: '/invoice',
    bills: '/bill',
    payments: '/payment',
    estimates: '/estimate',
    items: '/item',
    vendors: '/vendor',
  },

  webhook_support: true,
  sandbox_available: true,
  rate_limits: {
    requests_per_minute: 500,
    concurrent_requests: 10,
  },

  supported_actions: [
    // ==================== CUSTOMER OPERATIONS ====================
    {
      id: 'create_customer',
      name: 'Create Customer',
      description: 'Create a new customer in QuickBooks',
      category: 'Customers',
      icon: 'user-plus',
      api: {
        endpoint: '/customer',
        method: 'POST',
        baseUrl: 'https://quickbooks.api.intuit.com/v3/company/{companyId}',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
      },
      inputSchema: {
        DisplayName: {
          type: 'string',
          required: true,
          label: 'Display Name',
          placeholder: 'John Doe',
          description: 'Customer display name (must be unique)',
          aiControlled: true,
          aiDescription: 'The display name for the customer, typically their full name or business name',
        },
        GivenName: {
          type: 'string',
          label: 'First Name',
          placeholder: 'John',
          aiControlled: true,
          aiDescription: 'The customer first name',
        },
        FamilyName: {
          type: 'string',
          label: 'Last Name',
          placeholder: 'Doe',
          aiControlled: true,
          aiDescription: 'The customer last name',
        },
        CompanyName: {
          type: 'string',
          label: 'Company Name',
          placeholder: 'Acme Inc.',
          aiControlled: true,
          aiDescription: 'The name of the customer company or organization',
        },
        PrimaryEmailAddr: {
          type: 'string',
          label: 'Email',
          inputType: 'email',
          placeholder: 'customer@example.com',
          aiControlled: false,
        },
        PrimaryPhone: {
          type: 'string',
          label: 'Phone Number',
          placeholder: '555-555-5555',
          aiControlled: false,
        },
        BillAddr: {
          type: 'object',
          label: 'Billing Address',
          description: 'Customer billing address',
          aiControlled: false,
        },
        Notes: {
          type: 'string',
          label: 'Notes',
          inputType: 'textarea',
          aiControlled: true,
          aiDescription: 'Additional notes or comments about the customer',
        },
      },
      outputSchema: {
        Customer: {
          type: 'object',
          properties: {
            Id: { type: 'string' },
            DisplayName: { type: 'string' },
            Balance: { type: 'number' },
          },
        },
      },
    },

    {
      id: 'get_customer',
      name: 'Get Customer',
      description: 'Get a customer by ID',
      category: 'Customers',
      icon: 'user',
      api: {
        endpoint: '/customer/{customerId}',
        method: 'GET',
        baseUrl: 'https://quickbooks.api.intuit.com/v3/company/{companyId}',
      },
      inputSchema: {
        customerId: {
          type: 'string',
          required: true,
          label: 'Customer ID',
          description: 'QuickBooks customer ID',
          aiControlled: false,
        },
      },
      outputSchema: {
        Customer: { type: 'object' },
      },
    },

    {
      id: 'get_all_customers',
      name: 'Get All Customers',
      description: 'Get all customers with optional filtering',
      category: 'Customers',
      icon: 'users',
      api: {
        endpoint: '/query',
        method: 'GET',
        baseUrl: 'https://quickbooks.api.intuit.com/v3/company/{companyId}',
      },
      inputSchema: {
        limit: {
          type: 'number',
          label: 'Limit',
          default: 100,
          min: 1,
          max: 1000,
          description: 'Maximum number of customers to return',
          aiControlled: false,
        },
        where: {
          type: 'string',
          label: 'Where Clause',
          placeholder: "Active = true",
          description: 'SQL-like where clause for filtering',
          aiControlled: false,
        },
      },
      outputSchema: {
        QueryResponse: {
          type: 'object',
          properties: {
            Customer: { type: 'array' },
            totalCount: { type: 'number' },
          },
        },
      },
    },

    {
      id: 'update_customer',
      name: 'Update Customer',
      description: 'Update an existing customer',
      category: 'Customers',
      icon: 'edit',
      api: {
        endpoint: '/customer',
        method: 'POST',
        baseUrl: 'https://quickbooks.api.intuit.com/v3/company/{companyId}',
      },
      inputSchema: {
        Id: {
          type: 'string',
          required: true,
          label: 'Customer ID',
          aiControlled: false,
        },
        SyncToken: {
          type: 'string',
          required: true,
          label: 'Sync Token',
          description: 'Current sync token of the customer',
          aiControlled: false,
        },
        DisplayName: {
          type: 'string',
          label: 'Display Name',
          aiControlled: true,
          aiDescription: 'The display name for the customer',
        },
        PrimaryEmailAddr: {
          type: 'string',
          label: 'Email',
          inputType: 'email',
          aiControlled: false,
        },
        additionalFields: {
          type: 'object',
          label: 'Additional Fields',
          aiControlled: false,
        },
      },
      outputSchema: {
        Customer: { type: 'object' },
      },
    },

    // ==================== INVOICE OPERATIONS ====================
    {
      id: 'create_invoice',
      name: 'Create Invoice',
      description: 'Create a new invoice',
      category: 'Invoices',
      icon: 'file-text',
      api: {
        endpoint: '/invoice',
        method: 'POST',
        baseUrl: 'https://quickbooks.api.intuit.com/v3/company/{companyId}',
        headers: {
          'Content-Type': 'application/json',
        },
      },
      inputSchema: {
        CustomerRef: {
          type: 'string',
          required: true,
          label: 'Customer ID',
          description: 'Customer to invoice',
          aiControlled: false,
        },
        Line: {
          type: 'array',
          required: true,
          label: 'Line Items',
          description: 'Invoice line items',
          aiControlled: false,
          itemSchema: {
            Amount: {
              type: 'number',
              required: true,
              label: 'Amount',
              aiControlled: false,
            },
            Description: {
              type: 'string',
              label: 'Description',
              aiControlled: true,
              aiDescription: 'Description of the line item',
            },
            DetailType: {
              type: 'string',
              default: 'SalesItemLineDetail',
              aiControlled: false,
            },
          },
        },
        DueDate: {
          type: 'string',
          label: 'Due Date',
          placeholder: '2025-12-31',
          description: 'Invoice due date (YYYY-MM-DD)',
          aiControlled: false,
        },
        DocNumber: {
          type: 'string',
          label: 'Invoice Number',
          description: 'Custom invoice number',
          aiControlled: false,
        },
        CustomerMemo: {
          type: 'string',
          label: 'Customer Memo',
          inputType: 'textarea',
          aiControlled: true,
          aiDescription: 'A memo or note to the customer appearing on the invoice',
        },
        BillEmail: {
          type: 'string',
          label: 'Bill Email',
          inputType: 'email',
          description: 'Email address to send invoice',
          aiControlled: false,
        },
      },
      outputSchema: {
        Invoice: {
          type: 'object',
          properties: {
            Id: { type: 'string' },
            DocNumber: { type: 'string' },
            TotalAmt: { type: 'number' },
            Balance: { type: 'number' },
          },
        },
      },
    },

    {
      id: 'get_invoice',
      name: 'Get Invoice',
      description: 'Get an invoice by ID',
      category: 'Invoices',
      icon: 'file-text',
      api: {
        endpoint: '/invoice/{invoiceId}',
        method: 'GET',
        baseUrl: 'https://quickbooks.api.intuit.com/v3/company/{companyId}',
      },
      inputSchema: {
        invoiceId: {
          type: 'string',
          required: true,
          label: 'Invoice ID',
          aiControlled: false,
        },
      },
      outputSchema: {
        Invoice: { type: 'object' },
      },
    },

    {
      id: 'get_all_invoices',
      name: 'Get All Invoices',
      description: 'Get all invoices with optional filtering',
      category: 'Invoices',
      icon: 'file-text',
      api: {
        endpoint: '/query',
        method: 'GET',
        baseUrl: 'https://quickbooks.api.intuit.com/v3/company/{companyId}',
      },
      inputSchema: {
        limit: {
          type: 'number',
          label: 'Limit',
          default: 100,
          max: 1000,
          aiControlled: false,
        },
        where: {
          type: 'string',
          label: 'Where Clause',
          placeholder: "Balance > '0'",
          aiControlled: false,
        },
      },
      outputSchema: {
        QueryResponse: {
          type: 'object',
          properties: {
            Invoice: { type: 'array' },
          },
        },
      },
    },

    {
      id: 'update_invoice',
      name: 'Update Invoice',
      description: 'Update an existing invoice',
      category: 'Invoices',
      icon: 'edit',
      api: {
        endpoint: '/invoice',
        method: 'POST',
        baseUrl: 'https://quickbooks.api.intuit.com/v3/company/{companyId}',
      },
      inputSchema: {
        Id: {
          type: 'string',
          required: true,
          label: 'Invoice ID',
          aiControlled: false,
        },
        SyncToken: {
          type: 'string',
          required: true,
          label: 'Sync Token',
          aiControlled: false,
        },
        additionalFields: {
          type: 'object',
          label: 'Fields to Update',
          aiControlled: false,
        },
      },
      outputSchema: {
        Invoice: { type: 'object' },
      },
    },

    {
      id: 'delete_invoice',
      name: 'Delete Invoice',
      description: 'Delete an invoice',
      category: 'Invoices',
      icon: 'trash',
      api: {
        endpoint: '/invoice',
        method: 'POST',
        baseUrl: 'https://quickbooks.api.intuit.com/v3/company/{companyId}',
      },
      inputSchema: {
        Id: {
          type: 'string',
          required: true,
          label: 'Invoice ID',
          aiControlled: false,
        },
        SyncToken: {
          type: 'string',
          required: true,
          label: 'Sync Token',
          aiControlled: false,
        },
      },
      outputSchema: {
        success: { type: 'boolean' },
      },
    },

    {
      id: 'send_invoice',
      name: 'Send Invoice',
      description: 'Send an invoice via email',
      category: 'Invoices',
      icon: 'send',
      api: {
        endpoint: '/invoice/{invoiceId}/send',
        method: 'POST',
        baseUrl: 'https://quickbooks.api.intuit.com/v3/company/{companyId}',
      },
      inputSchema: {
        invoiceId: {
          type: 'string',
          required: true,
          label: 'Invoice ID',
          aiControlled: false,
        },
        sendTo: {
          type: 'string',
          label: 'Send To Email',
          inputType: 'email',
          description: 'Override recipient email',
          aiControlled: false,
        },
      },
      outputSchema: {
        Invoice: { type: 'object' },
      },
    },

    {
      id: 'void_invoice',
      name: 'Void Invoice',
      description: 'Void an invoice',
      category: 'Invoices',
      icon: 'x-circle',
      api: {
        endpoint: '/invoice',
        method: 'POST',
        baseUrl: 'https://quickbooks.api.intuit.com/v3/company/{companyId}',
      },
      inputSchema: {
        Id: {
          type: 'string',
          required: true,
          label: 'Invoice ID',
          aiControlled: false,
        },
        SyncToken: {
          type: 'string',
          required: true,
          label: 'Sync Token',
          aiControlled: false,
        },
      },
      outputSchema: {
        Invoice: { type: 'object' },
      },
    },

    // ==================== BILL OPERATIONS ====================
    {
      id: 'create_bill',
      name: 'Create Bill',
      description: 'Create a new bill (accounts payable)',
      category: 'Bills',
      icon: 'file-minus',
      api: {
        endpoint: '/bill',
        method: 'POST',
        baseUrl: 'https://quickbooks.api.intuit.com/v3/company/{companyId}',
      },
      inputSchema: {
        VendorRef: {
          type: 'string',
          required: true,
          label: 'Vendor ID',
          description: 'Vendor for this bill',
          aiControlled: false,
        },
        Line: {
          type: 'array',
          required: true,
          label: 'Line Items',
          aiControlled: false,
          itemSchema: {
            Amount: {
              type: 'number',
              required: true,
              aiControlled: false,
            },
            Description: {
              type: 'string',
              aiControlled: true,
              aiDescription: 'Description of the bill line item',
            },
            DetailType: {
              type: 'string',
              default: 'AccountBasedExpenseLineDetail',
              aiControlled: false,
            },
          },
        },
        DueDate: {
          type: 'string',
          label: 'Due Date',
          placeholder: '2025-12-31',
          aiControlled: false,
        },
        DocNumber: {
          type: 'string',
          label: 'Reference Number',
          aiControlled: false,
        },
      },
      outputSchema: {
        Bill: { type: 'object' },
      },
    },

    {
      id: 'get_bill',
      name: 'Get Bill',
      description: 'Get a bill by ID',
      category: 'Bills',
      icon: 'file-minus',
      api: {
        endpoint: '/bill/{billId}',
        method: 'GET',
        baseUrl: 'https://quickbooks.api.intuit.com/v3/company/{companyId}',
      },
      inputSchema: {
        billId: {
          type: 'string',
          required: true,
          label: 'Bill ID',
          aiControlled: false,
        },
      },
      outputSchema: {
        Bill: { type: 'object' },
      },
    },

    {
      id: 'get_all_bills',
      name: 'Get All Bills',
      description: 'Get all bills',
      category: 'Bills',
      icon: 'file-minus',
      api: {
        endpoint: '/query',
        method: 'GET',
        baseUrl: 'https://quickbooks.api.intuit.com/v3/company/{companyId}',
      },
      inputSchema: {
        limit: {
          type: 'number',
          label: 'Limit',
          default: 100,
          aiControlled: false,
        },
      },
      outputSchema: {
        QueryResponse: {
          type: 'object',
          properties: {
            Bill: { type: 'array' },
          },
        },
      },
    },

    {
      id: 'update_bill',
      name: 'Update Bill',
      description: 'Update an existing bill',
      category: 'Bills',
      icon: 'edit',
      api: {
        endpoint: '/bill',
        method: 'POST',
        baseUrl: 'https://quickbooks.api.intuit.com/v3/company/{companyId}',
      },
      inputSchema: {
        Id: {
          type: 'string',
          required: true,
          label: 'Bill ID',
          aiControlled: false,
        },
        SyncToken: {
          type: 'string',
          required: true,
          label: 'Sync Token',
          aiControlled: false,
        },
        additionalFields: {
          type: 'object',
          label: 'Fields to Update',
          aiControlled: false,
        },
      },
      outputSchema: {
        Bill: { type: 'object' },
      },
    },

    {
      id: 'delete_bill',
      name: 'Delete Bill',
      description: 'Delete a bill',
      category: 'Bills',
      icon: 'trash',
      api: {
        endpoint: '/bill',
        method: 'POST',
        baseUrl: 'https://quickbooks.api.intuit.com/v3/company/{companyId}',
      },
      inputSchema: {
        Id: {
          type: 'string',
          required: true,
          label: 'Bill ID',
          aiControlled: false,
        },
        SyncToken: {
          type: 'string',
          required: true,
          label: 'Sync Token',
          aiControlled: false,
        },
      },
      outputSchema: {
        success: { type: 'boolean' },
      },
    },

    // ==================== PAYMENT OPERATIONS ====================
    {
      id: 'create_payment',
      name: 'Create Payment',
      description: 'Record a customer payment',
      category: 'Payments',
      icon: 'dollar-sign',
      api: {
        endpoint: '/payment',
        method: 'POST',
        baseUrl: 'https://quickbooks.api.intuit.com/v3/company/{companyId}',
      },
      inputSchema: {
        CustomerRef: {
          type: 'string',
          required: true,
          label: 'Customer ID',
          aiControlled: false,
        },
        TotalAmt: {
          type: 'number',
          required: true,
          label: 'Payment Amount',
          aiControlled: false,
        },
        PaymentMethodRef: {
          type: 'string',
          label: 'Payment Method ID',
          aiControlled: false,
        },
        Line: {
          type: 'array',
          label: 'Applied to Invoices',
          description: 'Link payment to specific invoices',
          aiControlled: false,
        },
        PaymentRefNum: {
          type: 'string',
          label: 'Reference Number',
          placeholder: 'Check #1234',
          aiControlled: false,
        },
      },
      outputSchema: {
        Payment: { type: 'object' },
      },
    },

    {
      id: 'get_payment',
      name: 'Get Payment',
      description: 'Get a payment by ID',
      category: 'Payments',
      icon: 'dollar-sign',
      api: {
        endpoint: '/payment/{paymentId}',
        method: 'GET',
        baseUrl: 'https://quickbooks.api.intuit.com/v3/company/{companyId}',
      },
      inputSchema: {
        paymentId: {
          type: 'string',
          required: true,
          label: 'Payment ID',
          aiControlled: false,
        },
      },
      outputSchema: {
        Payment: { type: 'object' },
      },
    },

    {
      id: 'get_all_payments',
      name: 'Get All Payments',
      description: 'Get all payments',
      category: 'Payments',
      icon: 'dollar-sign',
      api: {
        endpoint: '/query',
        method: 'GET',
        baseUrl: 'https://quickbooks.api.intuit.com/v3/company/{companyId}',
      },
      inputSchema: {
        limit: {
          type: 'number',
          label: 'Limit',
          default: 100,
          aiControlled: false,
        },
      },
      outputSchema: {
        QueryResponse: {
          type: 'object',
          properties: {
            Payment: { type: 'array' },
          },
        },
      },
    },

    {
      id: 'void_payment',
      name: 'Void Payment',
      description: 'Void a payment',
      category: 'Payments',
      icon: 'x-circle',
      api: {
        endpoint: '/payment',
        method: 'POST',
        baseUrl: 'https://quickbooks.api.intuit.com/v3/company/{companyId}',
      },
      inputSchema: {
        Id: {
          type: 'string',
          required: true,
          label: 'Payment ID',
          aiControlled: false,
        },
        SyncToken: {
          type: 'string',
          required: true,
          label: 'Sync Token',
          aiControlled: false,
        },
      },
      outputSchema: {
        Payment: { type: 'object' },
      },
    },

    // ==================== ESTIMATE OPERATIONS ====================
    {
      id: 'create_estimate',
      name: 'Create Estimate',
      description: 'Create a new estimate/quote',
      category: 'Estimates',
      icon: 'clipboard',
      api: {
        endpoint: '/estimate',
        method: 'POST',
        baseUrl: 'https://quickbooks.api.intuit.com/v3/company/{companyId}',
      },
      inputSchema: {
        CustomerRef: {
          type: 'string',
          required: true,
          label: 'Customer ID',
          aiControlled: false,
        },
        Line: {
          type: 'array',
          required: true,
          label: 'Line Items',
          aiControlled: false,
        },
        ExpirationDate: {
          type: 'string',
          label: 'Expiration Date',
          placeholder: '2025-12-31',
          aiControlled: false,
        },
        DocNumber: {
          type: 'string',
          label: 'Estimate Number',
          aiControlled: false,
        },
      },
      outputSchema: {
        Estimate: { type: 'object' },
      },
    },

    {
      id: 'get_estimate',
      name: 'Get Estimate',
      description: 'Get an estimate by ID',
      category: 'Estimates',
      icon: 'clipboard',
      api: {
        endpoint: '/estimate/{estimateId}',
        method: 'GET',
        baseUrl: 'https://quickbooks.api.intuit.com/v3/company/{companyId}',
      },
      inputSchema: {
        estimateId: {
          type: 'string',
          required: true,
          label: 'Estimate ID',
          aiControlled: false,
        },
      },
      outputSchema: {
        Estimate: { type: 'object' },
      },
    },

    {
      id: 'get_all_estimates',
      name: 'Get All Estimates',
      description: 'Get all estimates',
      category: 'Estimates',
      icon: 'clipboard',
      api: {
        endpoint: '/query',
        method: 'GET',
        baseUrl: 'https://quickbooks.api.intuit.com/v3/company/{companyId}',
      },
      inputSchema: {
        limit: {
          type: 'number',
          label: 'Limit',
          default: 100,
          aiControlled: false,
        },
      },
      outputSchema: {
        QueryResponse: {
          type: 'object',
          properties: {
            Estimate: { type: 'array' },
          },
        },
      },
    },

    {
      id: 'send_estimate',
      name: 'Send Estimate',
      description: 'Send an estimate via email',
      category: 'Estimates',
      icon: 'send',
      api: {
        endpoint: '/estimate/{estimateId}/send',
        method: 'POST',
        baseUrl: 'https://quickbooks.api.intuit.com/v3/company/{companyId}',
      },
      inputSchema: {
        estimateId: {
          type: 'string',
          required: true,
          label: 'Estimate ID',
          aiControlled: false,
        },
        sendTo: {
          type: 'string',
          label: 'Send To Email',
          inputType: 'email',
          aiControlled: false,
        },
      },
      outputSchema: {
        Estimate: { type: 'object' },
      },
    },

    // ==================== ITEM OPERATIONS ====================
    {
      id: 'create_item',
      name: 'Create Item',
      description: 'Create a new product or service item',
      category: 'Items',
      icon: 'package',
      api: {
        endpoint: '/item',
        method: 'POST',
        baseUrl: 'https://quickbooks.api.intuit.com/v3/company/{companyId}',
      },
      inputSchema: {
        Name: {
          type: 'string',
          required: true,
          label: 'Item Name',
          placeholder: 'Widget',
          aiControlled: true,
          aiDescription: 'The name of the product or service item',
        },
        Type: {
          type: 'select',
          required: true,
          label: 'Item Type',
          options: [
            { label: 'Inventory', value: 'Inventory' },
            { label: 'Service', value: 'Service' },
            { label: 'Non-Inventory', value: 'NonInventory' },
          ],
          aiControlled: false,
        },
        Description: {
          type: 'string',
          label: 'Description',
          inputType: 'textarea',
          aiControlled: true,
          aiDescription: 'A description of the product or service item',
        },
        UnitPrice: {
          type: 'number',
          label: 'Unit Price',
          description: 'Sales price per unit',
          aiControlled: false,
        },
        PurchaseCost: {
          type: 'number',
          label: 'Purchase Cost',
          description: 'Cost to purchase',
          aiControlled: false,
        },
        IncomeAccountRef: {
          type: 'string',
          label: 'Income Account ID',
          aiControlled: false,
        },
        ExpenseAccountRef: {
          type: 'string',
          label: 'Expense Account ID',
          aiControlled: false,
        },
      },
      outputSchema: {
        Item: { type: 'object' },
      },
    },

    {
      id: 'get_item',
      name: 'Get Item',
      description: 'Get an item by ID',
      category: 'Items',
      icon: 'package',
      api: {
        endpoint: '/item/{itemId}',
        method: 'GET',
        baseUrl: 'https://quickbooks.api.intuit.com/v3/company/{companyId}',
      },
      inputSchema: {
        itemId: {
          type: 'string',
          required: true,
          label: 'Item ID',
          aiControlled: false,
        },
      },
      outputSchema: {
        Item: { type: 'object' },
      },
    },

    {
      id: 'get_all_items',
      name: 'Get All Items',
      description: 'Get all items',
      category: 'Items',
      icon: 'package',
      api: {
        endpoint: '/query',
        method: 'GET',
        baseUrl: 'https://quickbooks.api.intuit.com/v3/company/{companyId}',
      },
      inputSchema: {
        limit: {
          type: 'number',
          label: 'Limit',
          default: 100,
          aiControlled: false,
        },
        Type: {
          type: 'select',
          label: 'Item Type',
          options: [
            { label: 'All', value: '' },
            { label: 'Inventory', value: 'Inventory' },
            { label: 'Service', value: 'Service' },
            { label: 'Non-Inventory', value: 'NonInventory' },
          ],
          aiControlled: false,
        },
      },
      outputSchema: {
        QueryResponse: {
          type: 'object',
          properties: {
            Item: { type: 'array' },
          },
        },
      },
    },

    {
      id: 'update_item',
      name: 'Update Item',
      description: 'Update an existing item',
      category: 'Items',
      icon: 'edit',
      api: {
        endpoint: '/item',
        method: 'POST',
        baseUrl: 'https://quickbooks.api.intuit.com/v3/company/{companyId}',
      },
      inputSchema: {
        Id: {
          type: 'string',
          required: true,
          label: 'Item ID',
          aiControlled: false,
        },
        SyncToken: {
          type: 'string',
          required: true,
          label: 'Sync Token',
          aiControlled: false,
        },
        additionalFields: {
          type: 'object',
          label: 'Fields to Update',
          aiControlled: false,
        },
      },
      outputSchema: {
        Item: { type: 'object' },
      },
    },

    // ==================== VENDOR OPERATIONS ====================
    {
      id: 'create_vendor',
      name: 'Create Vendor',
      description: 'Create a new vendor',
      category: 'Vendors',
      icon: 'truck',
      api: {
        endpoint: '/vendor',
        method: 'POST',
        baseUrl: 'https://quickbooks.api.intuit.com/v3/company/{companyId}',
      },
      inputSchema: {
        DisplayName: {
          type: 'string',
          required: true,
          label: 'Display Name',
          placeholder: 'Supplier Inc.',
          aiControlled: true,
          aiDescription: 'The display name for the vendor',
        },
        GivenName: {
          type: 'string',
          label: 'First Name',
          aiControlled: true,
          aiDescription: 'The vendor contact first name',
        },
        FamilyName: {
          type: 'string',
          label: 'Last Name',
          aiControlled: true,
          aiDescription: 'The vendor contact last name',
        },
        CompanyName: {
          type: 'string',
          label: 'Company Name',
          aiControlled: true,
          aiDescription: 'The name of the vendor company',
        },
        PrimaryEmailAddr: {
          type: 'string',
          label: 'Email',
          inputType: 'email',
          aiControlled: false,
        },
        PrimaryPhone: {
          type: 'string',
          label: 'Phone',
          aiControlled: false,
        },
      },
      outputSchema: {
        Vendor: { type: 'object' },
      },
    },

    {
      id: 'get_vendor',
      name: 'Get Vendor',
      description: 'Get a vendor by ID',
      category: 'Vendors',
      icon: 'truck',
      api: {
        endpoint: '/vendor/{vendorId}',
        method: 'GET',
        baseUrl: 'https://quickbooks.api.intuit.com/v3/company/{companyId}',
      },
      inputSchema: {
        vendorId: {
          type: 'string',
          required: true,
          label: 'Vendor ID',
          aiControlled: false,
        },
      },
      outputSchema: {
        Vendor: { type: 'object' },
      },
    },

    {
      id: 'get_all_vendors',
      name: 'Get All Vendors',
      description: 'Get all vendors',
      category: 'Vendors',
      icon: 'truck',
      api: {
        endpoint: '/query',
        method: 'GET',
        baseUrl: 'https://quickbooks.api.intuit.com/v3/company/{companyId}',
      },
      inputSchema: {
        limit: {
          type: 'number',
          label: 'Limit',
          default: 100,
          aiControlled: false,
        },
      },
      outputSchema: {
        QueryResponse: {
          type: 'object',
          properties: {
            Vendor: { type: 'array' },
          },
        },
      },
    },

    {
      id: 'update_vendor',
      name: 'Update Vendor',
      description: 'Update an existing vendor',
      category: 'Vendors',
      icon: 'edit',
      api: {
        endpoint: '/vendor',
        method: 'POST',
        baseUrl: 'https://quickbooks.api.intuit.com/v3/company/{companyId}',
      },
      inputSchema: {
        Id: {
          type: 'string',
          required: true,
          label: 'Vendor ID',
          aiControlled: false,
        },
        SyncToken: {
          type: 'string',
          required: true,
          label: 'Sync Token',
          aiControlled: false,
        },
        additionalFields: {
          type: 'object',
          label: 'Fields to Update',
          aiControlled: false,
        },
      },
      outputSchema: {
        Vendor: { type: 'object' },
      },
    },

    // ==================== REPORT OPERATIONS ====================
    {
      id: 'get_profit_and_loss',
      name: 'Get Profit and Loss Report',
      description: 'Get profit and loss (income statement) report',
      category: 'Reports',
      icon: 'bar-chart',
      api: {
        endpoint: '/reports/ProfitAndLoss',
        method: 'GET',
        baseUrl: 'https://quickbooks.api.intuit.com/v3/company/{companyId}',
      },
      inputSchema: {
        start_date: {
          type: 'string',
          label: 'Start Date',
          placeholder: '2025-01-01',
          aiControlled: false,
        },
        end_date: {
          type: 'string',
          label: 'End Date',
          placeholder: '2025-12-31',
          aiControlled: false,
        },
        summarize_column_by: {
          type: 'select',
          label: 'Summarize By',
          options: [
            { label: 'Total', value: 'Total' },
            { label: 'Month', value: 'Month' },
            { label: 'Quarter', value: 'Quarter' },
            { label: 'Year', value: 'Year' },
          ],
          aiControlled: false,
        },
      },
      outputSchema: {
        Header: { type: 'object' },
        Rows: { type: 'object' },
        Columns: { type: 'object' },
      },
    },

    {
      id: 'get_balance_sheet',
      name: 'Get Balance Sheet Report',
      description: 'Get balance sheet report',
      category: 'Reports',
      icon: 'bar-chart',
      api: {
        endpoint: '/reports/BalanceSheet',
        method: 'GET',
        baseUrl: 'https://quickbooks.api.intuit.com/v3/company/{companyId}',
      },
      inputSchema: {
        date: {
          type: 'string',
          label: 'As Of Date',
          placeholder: '2025-12-31',
          aiControlled: false,
        },
      },
      outputSchema: {
        Header: { type: 'object' },
        Rows: { type: 'object' },
        Columns: { type: 'object' },
      },
    },

    // ==================== EMPLOYEE OPERATIONS ====================
    {
      id: 'get_employee',
      name: 'Get Employee',
      description: 'Get an employee by ID',
      category: 'Employees',
      icon: 'user',
      api: {
        endpoint: '/employee/{employeeId}',
        method: 'GET',
        baseUrl: 'https://quickbooks.api.intuit.com/v3/company/{companyId}',
      },
      inputSchema: {
        employeeId: {
          type: 'string',
          required: true,
          label: 'Employee ID',
          aiControlled: false,
        },
      },
      outputSchema: {
        Employee: { type: 'object' },
      },
    },

    {
      id: 'get_all_employees',
      name: 'Get All Employees',
      description: 'Get all employees',
      category: 'Employees',
      icon: 'users',
      api: {
        endpoint: '/query',
        method: 'GET',
        baseUrl: 'https://quickbooks.api.intuit.com/v3/company/{companyId}',
      },
      inputSchema: {
        limit: {
          type: 'number',
          label: 'Limit',
          default: 100,
          aiControlled: false,
        },
      },
      outputSchema: {
        QueryResponse: {
          type: 'object',
          properties: {
            Employee: { type: 'array' },
          },
        },
      },
    },

    // ==================== TRANSACTION OPERATIONS ====================
    {
      id: 'get_transaction',
      name: 'Get Transaction',
      description: 'Get a purchase transaction by ID',
      category: 'Transactions',
      icon: 'credit-card',
      api: {
        endpoint: '/purchase/{purchaseId}',
        method: 'GET',
        baseUrl: 'https://quickbooks.api.intuit.com/v3/company/{companyId}',
      },
      inputSchema: {
        purchaseId: {
          type: 'string',
          required: true,
          label: 'Transaction ID',
          aiControlled: false,
        },
      },
      outputSchema: {
        Purchase: { type: 'object' },
      },
    },

    {
      id: 'get_all_transactions',
      name: 'Get All Transactions',
      description: 'Get all purchase transactions',
      category: 'Transactions',
      icon: 'credit-card',
      api: {
        endpoint: '/query',
        method: 'GET',
        baseUrl: 'https://quickbooks.api.intuit.com/v3/company/{companyId}',
      },
      inputSchema: {
        limit: {
          type: 'number',
          label: 'Limit',
          default: 100,
          aiControlled: false,
        },
      },
      outputSchema: {
        QueryResponse: {
          type: 'object',
          properties: {
            Purchase: { type: 'array' },
          },
        },
      },
    },
  ],

  supported_triggers: [
    {
      id: 'invoice_created',
      name: 'Invoice Created',
      description: 'Triggers when a new invoice is created',
      eventType: 'invoice.created',
      icon: 'file-text',
      webhookRequired: true,
      outputSchema: {
        eventType: { type: 'string' },
        Invoice: { type: 'object' },
        realmId: { type: 'string' },
      },
    },
    {
      id: 'invoice_updated',
      name: 'Invoice Updated',
      description: 'Triggers when an invoice is updated',
      eventType: 'invoice.updated',
      icon: 'edit',
      webhookRequired: true,
      outputSchema: {
        eventType: { type: 'string' },
        Invoice: { type: 'object' },
        realmId: { type: 'string' },
      },
    },
    {
      id: 'payment_created',
      name: 'Payment Created',
      description: 'Triggers when a payment is received',
      eventType: 'payment.created',
      icon: 'dollar-sign',
      webhookRequired: true,
      outputSchema: {
        eventType: { type: 'string' },
        Payment: { type: 'object' },
        realmId: { type: 'string' },
      },
    },
    {
      id: 'customer_created',
      name: 'Customer Created',
      description: 'Triggers when a new customer is created',
      eventType: 'customer.created',
      icon: 'user-plus',
      webhookRequired: true,
      outputSchema: {
        eventType: { type: 'string' },
        Customer: { type: 'object' },
        realmId: { type: 'string' },
      },
    },
    {
      id: 'customer_updated',
      name: 'Customer Updated',
      description: 'Triggers when a customer is updated',
      eventType: 'customer.updated',
      icon: 'edit',
      webhookRequired: true,
      outputSchema: {
        eventType: { type: 'string' },
        Customer: { type: 'object' },
        realmId: { type: 'string' },
      },
    },
  ],
};
