import { ConnectorDefinition } from '../../shared';

/**
 * Xero Connector Definition
 *
 * Cloud-based accounting software for small and medium businesses
 * with invoicing, bank reconciliation, and financial reporting.
 *
 * Resources:
 * - Contacts: Customer and supplier management
 * - Invoices: Sales invoice management
 * - Bank Transactions: Bank transaction tracking
 * - Accounts: Chart of accounts
 *
 * Authentication:
 * - OAuth2 (required)
 */
export const XERO_CONNECTOR: ConnectorDefinition = {
  name: 'xero',
  display_name: 'Xero',
  category: 'finance',
  description: 'Cloud accounting software for invoicing, bank reconciliation, and financial reporting',

  auth_type: 'oauth2',

  oauth_config: {
    authorization_url: 'https://login.xero.com/identity/connect/authorize',
    token_url: 'https://identity.xero.com/connect/token',
    scopes: [
      'openid',
      'profile',
      'email',
      'accounting.transactions',
      'accounting.contacts',
      'accounting.settings',
      'offline_access',
    ],
  },

  // User provides their own Xero app credentials
  // Tenant ID is fetched automatically after OAuth via GET https://api.xero.com/connections
  auth_fields: [
    {
      key: 'clientId',
      label: 'Client ID',
      type: 'string',
      required: true,
      placeholder: 'XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX',
      description: 'Your Xero app Client ID',
      helpUrl: 'https://developer.xero.com/app/manage',
      helpText: 'Get from Xero Developer Portal',
    },
    {
      key: 'clientSecret',
      label: 'Client Secret',
      type: 'password',
      required: true,
      placeholder: 'XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX',
      description: 'Your Xero app Client Secret',
    },
  ],

  endpoints: {
    base_url: 'https://api.xero.com/api.xro/2.0',
    contacts: '/Contacts',
    invoices: '/Invoices',
    bankTransactions: '/BankTransactions',
    accounts: '/Accounts',
  },

  webhook_support: true,
  rate_limits: {
    requests_per_minute: 60,
  },

  supported_actions: [
    // ==================== CONTACT OPERATIONS ====================
    {
      id: 'create_contact',
      name: 'Create Contact',
      description: 'Create a new contact in Xero',
      category: 'Contacts',
      icon: 'user-plus',
      api: {
        endpoint: '/Contacts',
        method: 'POST',
        baseUrl: 'https://api.xero.com/api.xro/2.0',
        headers: {
          'Content-Type': 'application/json',
          'Xero-tenant-id': '{tenantId}',
        },
      },
      inputSchema: {
        Name: {
          type: 'string',
          required: true,
          label: 'Contact Name',
          placeholder: 'John Doe',
          description: 'Full name of the contact',
          aiControlled: true,
          aiDescription: 'Full name of the contact (person or company)',
        },
        EmailAddress: {
          type: 'string',
          label: 'Email Address',
          inputType: 'email',
          placeholder: 'contact@example.com',
          aiControlled: false,
        },
        FirstName: {
          type: 'string',
          label: 'First Name',
          aiControlled: true,
          aiDescription: 'First name of the contact person',
        },
        LastName: {
          type: 'string',
          label: 'Last Name',
          aiControlled: true,
          aiDescription: 'Last name of the contact person',
        },
        CompanyNumber: {
          type: 'string',
          label: 'Company Number',
          aiControlled: false,
        },
        ContactStatus: {
          type: 'select',
          label: 'Contact Status',
          options: [
            { label: 'Active', value: 'ACTIVE' },
            { label: 'Archived', value: 'ARCHIVED' },
          ],
          default: 'ACTIVE',
          aiControlled: false,
        },
        IsCustomer: {
          type: 'boolean',
          label: 'Is Customer',
          default: true,
          aiControlled: false,
        },
        IsSupplier: {
          type: 'boolean',
          label: 'Is Supplier',
          default: false,
          aiControlled: false,
        },
        Phones: {
          type: 'array',
          label: 'Phone Numbers',
          aiControlled: false,
          itemSchema: {
            PhoneType: {
              type: 'select',
              options: [
                { label: 'Default', value: 'DEFAULT' },
                { label: 'Mobile', value: 'MOBILE' },
                { label: 'Fax', value: 'FAX' },
              ],
            },
            PhoneNumber: {
              type: 'string',
            },
          },
        },
        Addresses: {
          type: 'array',
          label: 'Addresses',
          aiControlled: false,
          itemSchema: {
            AddressType: {
              type: 'select',
              options: [
                { label: 'PO Box', value: 'POBOX' },
                { label: 'Street', value: 'STREET' },
              ],
            },
            AddressLine1: { type: 'string' },
            City: { type: 'string' },
            Region: { type: 'string' },
            PostalCode: { type: 'string' },
            Country: { type: 'string' },
          },
        },
      },
      outputSchema: {
        Contacts: {
          type: 'array',
          description: 'Created contact details',
        },
      },
    },

    {
      id: 'get_contact',
      name: 'Get Contact',
      description: 'Get a contact by ID',
      category: 'Contacts',
      icon: 'user',
      api: {
        endpoint: '/Contacts/{contactId}',
        method: 'GET',
        baseUrl: 'https://api.xero.com/api.xro/2.0',
        headers: {
          'Xero-tenant-id': '{tenantId}',
        },
      },
      inputSchema: {
        contactId: {
          type: 'string',
          required: true,
          label: 'Contact ID',
          description: 'Xero contact ID (GUID)',
          aiControlled: false,
        },
      },
      outputSchema: {
        Contacts: { type: 'array' },
      },
    },

    {
      id: 'get_all_contacts',
      name: 'Get All Contacts',
      description: 'Get all contacts with optional filtering',
      category: 'Contacts',
      icon: 'users',
      api: {
        endpoint: '/Contacts',
        method: 'GET',
        baseUrl: 'https://api.xero.com/api.xro/2.0',
        headers: {
          'Xero-tenant-id': '{tenantId}',
        },
      },
      inputSchema: {
        where: {
          type: 'string',
          label: 'Filter',
          placeholder: 'ContactStatus=="ACTIVE"',
          description: 'Filter contacts using Xero filter syntax',
          aiControlled: false,
        },
        order: {
          type: 'string',
          label: 'Order By',
          placeholder: 'Name ASC',
          aiControlled: false,
        },
        page: {
          type: 'number',
          label: 'Page',
          default: 1,
          aiControlled: false,
        },
        includeArchived: {
          type: 'boolean',
          label: 'Include Archived',
          default: false,
          aiControlled: false,
        },
      },
      outputSchema: {
        Contacts: { type: 'array' },
      },
    },

    {
      id: 'update_contact',
      name: 'Update Contact',
      description: 'Update an existing contact',
      category: 'Contacts',
      icon: 'edit',
      api: {
        endpoint: '/Contacts/{contactId}',
        method: 'POST',
        baseUrl: 'https://api.xero.com/api.xro/2.0',
        headers: {
          'Content-Type': 'application/json',
          'Xero-tenant-id': '{tenantId}',
        },
      },
      inputSchema: {
        contactId: {
          type: 'string',
          required: true,
          label: 'Contact ID',
          aiControlled: false,
        },
        Name: {
          type: 'string',
          label: 'Contact Name',
          aiControlled: true,
          aiDescription: 'Full name of the contact (person or company)',
        },
        EmailAddress: {
          type: 'string',
          label: 'Email Address',
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
        Contacts: { type: 'array' },
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
        endpoint: '/Invoices',
        method: 'POST',
        baseUrl: 'https://api.xero.com/api.xro/2.0',
        headers: {
          'Content-Type': 'application/json',
          'Xero-tenant-id': '{tenantId}',
        },
      },
      inputSchema: {
        Type: {
          type: 'select',
          required: true,
          label: 'Invoice Type',
          options: [
            { label: 'Accounts Receivable (Sales)', value: 'ACCREC' },
            { label: 'Accounts Payable (Bills)', value: 'ACCPAY' },
          ],
          aiControlled: false,
        },
        Contact: {
          type: 'string',
          required: true,
          label: 'Contact ID',
          description: 'Contact ID to associate with invoice',
          aiControlled: false,
        },
        LineItems: {
          type: 'array',
          required: true,
          label: 'Line Items',
          aiControlled: false,
          itemSchema: {
            Description: {
              type: 'string',
              required: true,
              label: 'Description',
              aiControlled: true,
              aiDescription: 'Description of the line item product or service',
            },
            Quantity: {
              type: 'number',
              default: 1,
              label: 'Quantity',
              aiControlled: false,
            },
            UnitAmount: {
              type: 'number',
              required: true,
              label: 'Unit Amount',
              aiControlled: false,
            },
            AccountCode: {
              type: 'string',
              label: 'Account Code',
              placeholder: '200',
              aiControlled: false,
            },
            TaxType: {
              type: 'string',
              label: 'Tax Type',
              placeholder: 'OUTPUT',
              aiControlled: false,
            },
          },
        },
        Date: {
          type: 'string',
          label: 'Invoice Date',
          placeholder: '2025-01-18',
          aiControlled: false,
        },
        DueDate: {
          type: 'string',
          label: 'Due Date',
          placeholder: '2025-02-18',
          aiControlled: false,
        },
        Reference: {
          type: 'string',
          label: 'Reference',
          description: 'Reference number for the invoice',
          aiControlled: true,
          aiDescription: 'Reference number or identifier for the invoice',
        },
        Status: {
          type: 'select',
          label: 'Status',
          options: [
            { label: 'Draft', value: 'DRAFT' },
            { label: 'Submitted', value: 'SUBMITTED' },
            { label: 'Authorised', value: 'AUTHORISED' },
          ],
          default: 'DRAFT',
          aiControlled: false,
        },
        CurrencyCode: {
          type: 'string',
          label: 'Currency',
          placeholder: 'USD',
          description: 'ISO 4217 currency code',
          aiControlled: false,
        },
      },
      outputSchema: {
        Invoices: {
          type: 'array',
          description: 'Created invoice details',
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
        endpoint: '/Invoices/{invoiceId}',
        method: 'GET',
        baseUrl: 'https://api.xero.com/api.xro/2.0',
        headers: {
          'Xero-tenant-id': '{tenantId}',
        },
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
        Invoices: { type: 'array' },
      },
    },

    {
      id: 'get_all_invoices',
      name: 'Get All Invoices',
      description: 'Get all invoices with optional filtering',
      category: 'Invoices',
      icon: 'file-text',
      api: {
        endpoint: '/Invoices',
        method: 'GET',
        baseUrl: 'https://api.xero.com/api.xro/2.0',
        headers: {
          'Xero-tenant-id': '{tenantId}',
        },
      },
      inputSchema: {
        where: {
          type: 'string',
          label: 'Filter',
          placeholder: 'Status=="AUTHORISED"',
          aiControlled: false,
        },
        order: {
          type: 'string',
          label: 'Order By',
          placeholder: 'Date DESC',
          aiControlled: false,
        },
        page: {
          type: 'number',
          label: 'Page',
          default: 1,
          aiControlled: false,
        },
        ContactIDs: {
          type: 'string',
          label: 'Contact IDs',
          description: 'Comma-separated contact IDs to filter by',
          aiControlled: false,
        },
        Statuses: {
          type: 'string',
          label: 'Statuses',
          placeholder: 'AUTHORISED,PAID',
          description: 'Comma-separated statuses to filter by',
          aiControlled: false,
        },
      },
      outputSchema: {
        Invoices: { type: 'array' },
      },
    },

    {
      id: 'update_invoice',
      name: 'Update Invoice',
      description: 'Update an existing invoice',
      category: 'Invoices',
      icon: 'edit',
      api: {
        endpoint: '/Invoices/{invoiceId}',
        method: 'POST',
        baseUrl: 'https://api.xero.com/api.xro/2.0',
        headers: {
          'Content-Type': 'application/json',
          'Xero-tenant-id': '{tenantId}',
        },
      },
      inputSchema: {
        invoiceId: {
          type: 'string',
          required: true,
          label: 'Invoice ID',
          aiControlled: false,
        },
        Status: {
          type: 'select',
          label: 'Status',
          options: [
            { label: 'Draft', value: 'DRAFT' },
            { label: 'Submitted', value: 'SUBMITTED' },
            { label: 'Authorised', value: 'AUTHORISED' },
            { label: 'Voided', value: 'VOIDED' },
          ],
          aiControlled: false,
        },
        DueDate: {
          type: 'string',
          label: 'Due Date',
          aiControlled: false,
        },
        Reference: {
          type: 'string',
          label: 'Reference',
          aiControlled: true,
          aiDescription: 'Reference number or identifier for the invoice',
        },
        additionalFields: {
          type: 'object',
          label: 'Additional Fields',
          aiControlled: false,
        },
      },
      outputSchema: {
        Invoices: { type: 'array' },
      },
    },

    {
      id: 'void_invoice',
      name: 'Void Invoice',
      description: 'Void an invoice',
      category: 'Invoices',
      icon: 'x-circle',
      api: {
        endpoint: '/Invoices/{invoiceId}',
        method: 'POST',
        baseUrl: 'https://api.xero.com/api.xro/2.0',
        headers: {
          'Content-Type': 'application/json',
          'Xero-tenant-id': '{tenantId}',
        },
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
        Invoices: { type: 'array' },
      },
    },

    // ==================== BANK TRANSACTION OPERATIONS ====================
    {
      id: 'create_bank_transaction',
      name: 'Create Bank Transaction',
      description: 'Create a new bank transaction',
      category: 'Bank Transactions',
      icon: 'credit-card',
      api: {
        endpoint: '/BankTransactions',
        method: 'POST',
        baseUrl: 'https://api.xero.com/api.xro/2.0',
        headers: {
          'Content-Type': 'application/json',
          'Xero-tenant-id': '{tenantId}',
        },
      },
      inputSchema: {
        Type: {
          type: 'select',
          required: true,
          label: 'Transaction Type',
          options: [
            { label: 'Receive Money', value: 'RECEIVE' },
            { label: 'Spend Money', value: 'SPEND' },
            { label: 'Receive Prepayment', value: 'RECEIVE-PREPAYMENT' },
            { label: 'Spend Prepayment', value: 'SPEND-PREPAYMENT' },
            { label: 'Receive Overpayment', value: 'RECEIVE-OVERPAYMENT' },
            { label: 'Spend Overpayment', value: 'SPEND-OVERPAYMENT' },
          ],
          aiControlled: false,
        },
        Contact: {
          type: 'string',
          required: true,
          label: 'Contact ID',
          aiControlled: false,
        },
        BankAccount: {
          type: 'string',
          required: true,
          label: 'Bank Account ID',
          aiControlled: false,
        },
        LineItems: {
          type: 'array',
          required: true,
          label: 'Line Items',
          aiControlled: false,
          itemSchema: {
            Description: {
              type: 'string',
              aiControlled: true,
              aiDescription: 'Description of the bank transaction line item',
            },
            Quantity: { type: 'number', default: 1, aiControlled: false },
            UnitAmount: { type: 'number', aiControlled: false },
            AccountCode: { type: 'string', aiControlled: false },
          },
        },
        Date: {
          type: 'string',
          label: 'Transaction Date',
          placeholder: '2025-01-18',
          aiControlled: false,
        },
        Reference: {
          type: 'string',
          label: 'Reference',
          aiControlled: true,
          aiDescription: 'Reference number or identifier for the bank transaction',
        },
      },
      outputSchema: {
        BankTransactions: { type: 'array' },
      },
    },

    {
      id: 'get_bank_transaction',
      name: 'Get Bank Transaction',
      description: 'Get a bank transaction by ID',
      category: 'Bank Transactions',
      icon: 'credit-card',
      api: {
        endpoint: '/BankTransactions/{transactionId}',
        method: 'GET',
        baseUrl: 'https://api.xero.com/api.xro/2.0',
        headers: {
          'Xero-tenant-id': '{tenantId}',
        },
      },
      inputSchema: {
        transactionId: {
          type: 'string',
          required: true,
          label: 'Transaction ID',
          aiControlled: false,
        },
      },
      outputSchema: {
        BankTransactions: { type: 'array' },
      },
    },

    {
      id: 'get_all_bank_transactions',
      name: 'Get All Bank Transactions',
      description: 'Get all bank transactions',
      category: 'Bank Transactions',
      icon: 'credit-card',
      api: {
        endpoint: '/BankTransactions',
        method: 'GET',
        baseUrl: 'https://api.xero.com/api.xro/2.0',
        headers: {
          'Xero-tenant-id': '{tenantId}',
        },
      },
      inputSchema: {
        where: {
          type: 'string',
          label: 'Filter',
          aiControlled: false,
        },
        order: {
          type: 'string',
          label: 'Order By',
          aiControlled: false,
        },
        page: {
          type: 'number',
          label: 'Page',
          default: 1,
          aiControlled: false,
        },
      },
      outputSchema: {
        BankTransactions: { type: 'array' },
      },
    },

    // ==================== ACCOUNT OPERATIONS ====================
    {
      id: 'get_accounts',
      name: 'Get Accounts',
      description: 'Get chart of accounts',
      category: 'Accounts',
      icon: 'book',
      api: {
        endpoint: '/Accounts',
        method: 'GET',
        baseUrl: 'https://api.xero.com/api.xro/2.0',
        headers: {
          'Xero-tenant-id': '{tenantId}',
        },
      },
      inputSchema: {
        where: {
          type: 'string',
          label: 'Filter',
          placeholder: 'Type=="REVENUE"',
          aiControlled: false,
        },
        order: {
          type: 'string',
          label: 'Order By',
          aiControlled: false,
        },
      },
      outputSchema: {
        Accounts: { type: 'array' },
      },
    },

    {
      id: 'get_account',
      name: 'Get Account',
      description: 'Get an account by ID',
      category: 'Accounts',
      icon: 'book',
      api: {
        endpoint: '/Accounts/{accountId}',
        method: 'GET',
        baseUrl: 'https://api.xero.com/api.xro/2.0',
        headers: {
          'Xero-tenant-id': '{tenantId}',
        },
      },
      inputSchema: {
        accountId: {
          type: 'string',
          required: true,
          label: 'Account ID',
          aiControlled: false,
        },
      },
      outputSchema: {
        Accounts: { type: 'array' },
      },
    },

    // ==================== PAYMENT OPERATIONS ====================
    {
      id: 'create_payment',
      name: 'Create Payment',
      description: 'Create a payment for an invoice',
      category: 'Payments',
      icon: 'dollar-sign',
      api: {
        endpoint: '/Payments',
        method: 'POST',
        baseUrl: 'https://api.xero.com/api.xro/2.0',
        headers: {
          'Content-Type': 'application/json',
          'Xero-tenant-id': '{tenantId}',
        },
      },
      inputSchema: {
        Invoice: {
          type: 'string',
          required: true,
          label: 'Invoice ID',
          aiControlled: false,
        },
        Account: {
          type: 'string',
          required: true,
          label: 'Account ID',
          description: 'Bank account for the payment',
          aiControlled: false,
        },
        Amount: {
          type: 'number',
          required: true,
          label: 'Amount',
          aiControlled: false,
        },
        Date: {
          type: 'string',
          label: 'Payment Date',
          placeholder: '2025-01-18',
          aiControlled: false,
        },
        Reference: {
          type: 'string',
          label: 'Reference',
          aiControlled: true,
          aiDescription: 'Reference number or identifier for the payment',
        },
      },
      outputSchema: {
        Payments: { type: 'array' },
      },
    },

    {
      id: 'get_payments',
      name: 'Get Payments',
      description: 'Get all payments',
      category: 'Payments',
      icon: 'dollar-sign',
      api: {
        endpoint: '/Payments',
        method: 'GET',
        baseUrl: 'https://api.xero.com/api.xro/2.0',
        headers: {
          'Xero-tenant-id': '{tenantId}',
        },
      },
      inputSchema: {
        where: {
          type: 'string',
          label: 'Filter',
          aiControlled: false,
        },
        order: {
          type: 'string',
          label: 'Order By',
          aiControlled: false,
        },
      },
      outputSchema: {
        Payments: { type: 'array' },
      },
    },

    // ==================== CREDIT NOTE OPERATIONS ====================
    {
      id: 'create_credit_note',
      name: 'Create Credit Note',
      description: 'Create a credit note',
      category: 'Credit Notes',
      icon: 'file-minus',
      api: {
        endpoint: '/CreditNotes',
        method: 'POST',
        baseUrl: 'https://api.xero.com/api.xro/2.0',
        headers: {
          'Content-Type': 'application/json',
          'Xero-tenant-id': '{tenantId}',
        },
      },
      inputSchema: {
        Type: {
          type: 'select',
          required: true,
          label: 'Type',
          options: [
            { label: 'Accounts Receivable', value: 'ACCRECCREDIT' },
            { label: 'Accounts Payable', value: 'ACCPAYCREDIT' },
          ],
          aiControlled: false,
        },
        Contact: {
          type: 'string',
          required: true,
          label: 'Contact ID',
          aiControlled: false,
        },
        LineItems: {
          type: 'array',
          required: true,
          label: 'Line Items',
          aiControlled: false,
        },
        Date: {
          type: 'string',
          label: 'Date',
          aiControlled: false,
        },
      },
      outputSchema: {
        CreditNotes: { type: 'array' },
      },
    },

    {
      id: 'get_credit_notes',
      name: 'Get Credit Notes',
      description: 'Get all credit notes',
      category: 'Credit Notes',
      icon: 'file-minus',
      api: {
        endpoint: '/CreditNotes',
        method: 'GET',
        baseUrl: 'https://api.xero.com/api.xro/2.0',
        headers: {
          'Xero-tenant-id': '{tenantId}',
        },
      },
      inputSchema: {
        where: {
          type: 'string',
          label: 'Filter',
          aiControlled: false,
        },
      },
      outputSchema: {
        CreditNotes: { type: 'array' },
      },
    },

    // ==================== ORGANISATION ====================
    {
      id: 'get_organisation',
      name: 'Get Organisation',
      description: 'Get organisation details',
      category: 'Organisation',
      icon: 'building',
      api: {
        endpoint: '/Organisation',
        method: 'GET',
        baseUrl: 'https://api.xero.com/api.xro/2.0',
        headers: {
          'Xero-tenant-id': '{tenantId}',
        },
      },
      inputSchema: {},
      outputSchema: {
        Organisations: { type: 'array' },
      },
    },
  ],

  supported_triggers: [
    {
      id: 'invoice_created',
      name: 'Invoice Created',
      description: 'Triggers when a new invoice is created',
      eventType: 'INVOICE.CREATE',
      icon: 'file-text',
      webhookRequired: true,
      outputSchema: {
        eventCategory: { type: 'string' },
        eventType: { type: 'string' },
        resourceId: { type: 'string' },
        tenantId: { type: 'string' },
      },
    },
    {
      id: 'invoice_updated',
      name: 'Invoice Updated',
      description: 'Triggers when an invoice is updated',
      eventType: 'INVOICE.UPDATE',
      icon: 'edit',
      webhookRequired: true,
      outputSchema: {
        eventCategory: { type: 'string' },
        eventType: { type: 'string' },
        resourceId: { type: 'string' },
        tenantId: { type: 'string' },
      },
    },
    {
      id: 'contact_created',
      name: 'Contact Created',
      description: 'Triggers when a new contact is created',
      eventType: 'CONTACT.CREATE',
      icon: 'user-plus',
      webhookRequired: true,
      outputSchema: {
        eventCategory: { type: 'string' },
        eventType: { type: 'string' },
        resourceId: { type: 'string' },
        tenantId: { type: 'string' },
      },
    },
    {
      id: 'contact_updated',
      name: 'Contact Updated',
      description: 'Triggers when a contact is updated',
      eventType: 'CONTACT.UPDATE',
      icon: 'edit',
      webhookRequired: true,
      outputSchema: {
        eventCategory: { type: 'string' },
        eventType: { type: 'string' },
        resourceId: { type: 'string' },
        tenantId: { type: 'string' },
      },
    },
    {
      id: 'payment_created',
      name: 'Payment Created',
      description: 'Triggers when a payment is created',
      eventType: 'PAYMENT.CREATE',
      icon: 'dollar-sign',
      webhookRequired: true,
      outputSchema: {
        eventCategory: { type: 'string' },
        eventType: { type: 'string' },
        resourceId: { type: 'string' },
        tenantId: { type: 'string' },
      },
    },
  ],
};
