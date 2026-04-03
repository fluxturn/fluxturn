// Chargebee Connector Definition
// Subscription billing and revenue management platform

import { ConnectorDefinition } from '../../shared';

export const CHARGEBEE_CONNECTOR: ConnectorDefinition = {
  name: 'chargebee',
  display_name: 'Chargebee',
  category: 'finance',
  description: 'Subscription billing and revenue management platform for SaaS and subscription businesses',
  auth_type: 'api_key',
  verified: false,

  // Authentication fields for Chargebee
  auth_fields: [
    {
      key: 'accountName',
      label: 'Account Name',
      type: 'string',
      required: true,
      placeholder: 'your-account',
      description: 'Your Chargebee account name (subdomain)',
      helpUrl: 'https://www.chargebee.com/docs/2.0/api.html#api_authentication',
      helpText: 'Find your account name in the Chargebee dashboard URL'
    },
    {
      key: 'apiKey',
      label: 'API Key',
      type: 'password',
      required: true,
      placeholder: 'Enter your Chargebee API Key',
      description: 'Your Chargebee API key from Settings > Configure Chargebee > API Keys',
      helpUrl: 'https://www.chargebee.com/docs/2.0/api_keys.html'
    }
  ],

  endpoints: {
    base_url: 'https://{accountName}.chargebee.com/api/v2',
    customers: '/customers',
    customer_create: '/customers',
    invoices: '/invoices',
    invoice_pdf: '/invoices/{invoiceId}/pdf',
    subscriptions: '/subscriptions',
    subscription_cancel: '/subscriptions/{subscriptionId}/cancel',
    subscription_delete: '/subscriptions/{subscriptionId}/delete'
  },

  webhook_support: true,
  sandbox_available: true,

  rate_limits: {
    requests_per_minute: 160,
    requests_per_second: 10
  },

  // ============= SUPPORTED ACTIONS =============
  supported_actions: [
    // ===== Customer Actions =====
    {
      id: 'create_customer',
      name: 'Create Customer',
      description: 'Create a new customer in Chargebee',
      category: 'Customers',
      icon: 'user-plus',
      verified: false,
      api: {
        endpoint: '/customers',
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      },
      inputSchema: {
        id: {
          type: 'string',
          required: false,
          label: 'Customer ID',
          placeholder: 'customer_123',
          description: 'ID for the new customer. If not given, this will be auto-generated.',
          aiControlled: false
        },
        first_name: {
          type: 'string',
          required: false,
          label: 'First Name',
          placeholder: 'John',
          description: 'The first name of the customer',
          aiControlled: false
        },
        last_name: {
          type: 'string',
          required: false,
          label: 'Last Name',
          placeholder: 'Doe',
          description: 'The last name of the customer',
          aiControlled: false
        },
        email: {
          type: 'string',
          required: false,
          label: 'Email',
          placeholder: 'john.doe@example.com',
          description: 'The email address of the customer',
          aiControlled: false
        },
        phone: {
          type: 'string',
          required: false,
          label: 'Phone',
          placeholder: '+1-234-567-8900',
          description: 'The phone number of the customer',
          aiControlled: false
        },
        company: {
          type: 'string',
          required: false,
          label: 'Company',
          placeholder: 'Acme Inc.',
          description: 'The company of the customer',
          aiControlled: false
        },
        auto_collection: {
          type: 'select',
          required: false,
          label: 'Auto Collection',
          default: 'on',
          options: [
            { label: 'On', value: 'on' },
            { label: 'Off', value: 'off' }
          ],
          description: 'Whether automatic collection of charges is enabled',
          aiControlled: false
        },
        allow_direct_debit: {
          type: 'boolean',
          required: false,
          label: 'Allow Direct Debit',
          default: false,
          description: 'Whether direct debit is allowed for this customer',
          aiControlled: false
        },
        vat_number: {
          type: 'string',
          required: false,
          label: 'VAT Number',
          placeholder: 'EU123456789',
          description: 'VAT/Tax registration number',
          aiControlled: false
        },
        billing_address: {
          type: 'object',
          required: false,
          label: 'Billing Address',
          description: 'Billing address object',
          aiControlled: false,
          properties: {
            first_name: { type: 'string' },
            last_name: { type: 'string' },
            line1: { type: 'string' },
            line2: { type: 'string' },
            city: { type: 'string' },
            state: { type: 'string' },
            zip: { type: 'string' },
            country: { type: 'string' }
          }
        }
      },
      outputSchema: {
        customer: {
          type: 'object',
          description: 'Created customer object',
          properties: {
            id: { type: 'string' },
            first_name: { type: 'string' },
            last_name: { type: 'string' },
            email: { type: 'string' },
            phone: { type: 'string' },
            company: { type: 'string' },
            created_at: { type: 'number' }
          }
        }
      }
    },

    // ===== Invoice Actions =====
    {
      id: 'list_invoices',
      name: 'List Invoices',
      description: 'Retrieve a list of invoices with optional filters',
      category: 'Invoices',
      icon: 'file-text',
      verified: false,
      api: {
        endpoint: '/invoices',
        method: 'GET',
        headers: { 'Content-Type': 'application/json' }
      },
      inputSchema: {
        limit: {
          type: 'number',
          required: false,
          label: 'Limit',
          default: 10,
          min: 1,
          max: 100,
          description: 'Maximum number of invoices to return (1-100)',
          aiControlled: false
        },
        sort_by: {
          type: 'select',
          required: false,
          label: 'Sort By',
          default: 'date_desc',
          options: [
            { label: 'Date (Descending)', value: 'date_desc' },
            { label: 'Date (Ascending)', value: 'date_asc' },
            { label: 'Updated At (Descending)', value: 'updated_at_desc' },
            { label: 'Updated At (Ascending)', value: 'updated_at_asc' }
          ],
          description: 'How to sort the invoices',
          aiControlled: false
        },
        date_filter: {
          type: 'select',
          required: false,
          label: 'Date Filter Operation',
          options: [
            { label: 'Is', value: 'is' },
            { label: 'Is Not', value: 'is_not' },
            { label: 'After', value: 'after' },
            { label: 'Before', value: 'before' }
          ],
          description: 'Filter invoices by date',
          aiControlled: false
        },
        date_value: {
          type: 'string',
          required: false,
          label: 'Date Value',
          placeholder: '2024-01-01',
          description: 'Date value for the filter (YYYY-MM-DD or timestamp)',
          aiControlled: false
        },
        total_filter: {
          type: 'select',
          required: false,
          label: 'Total Amount Filter',
          options: [
            { label: 'Is', value: 'is' },
            { label: 'Is Not', value: 'is_not' },
            { label: 'Greater Than', value: 'gt' },
            { label: 'Greater or Equal', value: 'gte' },
            { label: 'Less Than', value: 'lt' },
            { label: 'Less or Equal', value: 'lte' }
          ],
          description: 'Filter invoices by total amount',
          aiControlled: false
        },
        total_value: {
          type: 'number',
          required: false,
          label: 'Total Amount Value',
          placeholder: '0',
          description: 'Amount value for the filter (in cents)',
          aiControlled: false
        }
      },
      outputSchema: {
        list: {
          type: 'array',
          description: 'List of invoices',
          properties: {
            invoice: {
              type: 'object',
              properties: {
                id: { type: 'string' },
                customer_id: { type: 'string' },
                subscription_id: { type: 'string' },
                status: { type: 'string' },
                total: { type: 'number' },
                date: { type: 'number' },
                due_date: { type: 'number' }
              }
            }
          }
        },
        next_offset: { type: 'string', description: 'Offset for next page' }
      }
    },

    {
      id: 'get_invoice_pdf',
      name: 'Get Invoice PDF URL',
      description: 'Get a downloadable URL for an invoice PDF',
      category: 'Invoices',
      icon: 'download',
      verified: false,
      api: {
        endpoint: '/invoices/{invoiceId}/pdf',
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      },
      inputSchema: {
        invoiceId: {
          type: 'string',
          required: true,
          label: 'Invoice ID',
          placeholder: 'inv_123456',
          description: 'The ID of the invoice to get the PDF for',
          aiControlled: false
        },
        disposition_type: {
          type: 'select',
          required: false,
          label: 'Disposition Type',
          default: 'attachment',
          options: [
            { label: 'Attachment (Download)', value: 'attachment' },
            { label: 'Inline (View)', value: 'inline' }
          ],
          description: 'How the PDF should be served',
          aiControlled: false
        }
      },
      outputSchema: {
        download: {
          type: 'object',
          properties: {
            download_url: { type: 'string', description: 'URL to download the PDF' },
            valid_till: { type: 'number', description: 'Unix timestamp when URL expires' },
            mime_type: { type: 'string', description: 'MIME type of the file' }
          }
        }
      }
    },

    // ===== Subscription Actions =====
    {
      id: 'cancel_subscription',
      name: 'Cancel Subscription',
      description: 'Cancel an active subscription',
      category: 'Subscriptions',
      icon: 'x-circle',
      verified: false,
      api: {
        endpoint: '/subscriptions/{subscriptionId}/cancel',
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      },
      inputSchema: {
        subscriptionId: {
          type: 'string',
          required: true,
          label: 'Subscription ID',
          placeholder: 'sub_123456',
          description: 'The ID of the subscription to cancel',
          aiControlled: false
        },
        end_of_term: {
          type: 'boolean',
          required: false,
          label: 'Cancel at End of Term',
          default: false,
          description: 'If true, subscription will be cancelled at the end of the current billing period. If false, cancels immediately.',
          aiControlled: false
        },
        cancel_reason_code: {
          type: 'string',
          required: false,
          label: 'Cancel Reason Code',
          placeholder: 'not_paid',
          description: 'Reason code for cancellation',
          aiControlled: false
        },
        credit_option_for_current_term_charges: {
          type: 'select',
          required: false,
          label: 'Credit Option',
          options: [
            { label: 'None', value: 'none' },
            { label: 'Prorate', value: 'prorate' },
            { label: 'Full', value: 'full' }
          ],
          description: 'How to handle credits for current term charges',
          aiControlled: false
        }
      },
      outputSchema: {
        subscription: {
          type: 'object',
          description: 'Cancelled subscription object',
          properties: {
            id: { type: 'string' },
            customer_id: { type: 'string' },
            status: { type: 'string' },
            cancelled_at: { type: 'number' }
          }
        },
        credit_notes: {
          type: 'array',
          description: 'Credit notes generated during cancellation'
        }
      }
    },

    {
      id: 'delete_subscription',
      name: 'Delete Subscription',
      description: 'Delete a subscription permanently',
      category: 'Subscriptions',
      icon: 'trash-2',
      verified: false,
      api: {
        endpoint: '/subscriptions/{subscriptionId}/delete',
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      },
      inputSchema: {
        subscriptionId: {
          type: 'string',
          required: true,
          label: 'Subscription ID',
          placeholder: 'sub_123456',
          description: 'The ID of the subscription to delete',
          aiControlled: false
        }
      },
      outputSchema: {
        subscription: {
          type: 'object',
          description: 'Deleted subscription object',
          properties: {
            id: { type: 'string' },
            customer_id: { type: 'string' },
            status: { type: 'string' },
            deleted: { type: 'boolean' }
          }
        }
      }
    },

    {
      id: 'list_subscriptions',
      name: 'List Subscriptions',
      description: 'Retrieve a list of subscriptions',
      category: 'Subscriptions',
      icon: 'list',
      verified: false,
      api: {
        endpoint: '/subscriptions',
        method: 'GET',
        headers: { 'Content-Type': 'application/json' }
      },
      inputSchema: {
        limit: {
          type: 'number',
          required: false,
          label: 'Limit',
          default: 10,
          min: 1,
          max: 100,
          description: 'Maximum number of subscriptions to return',
          aiControlled: false
        },
        status: {
          type: 'select',
          required: false,
          label: 'Status Filter',
          options: [
            { label: 'All', value: '' },
            { label: 'Active', value: 'active' },
            { label: 'In Trial', value: 'in_trial' },
            { label: 'Cancelled', value: 'cancelled' },
            { label: 'Non Renewing', value: 'non_renewing' }
          ],
          description: 'Filter by subscription status',
          aiControlled: false
        },
        customer_id: {
          type: 'string',
          required: false,
          label: 'Customer ID',
          placeholder: 'cust_123',
          description: 'Filter by customer ID',
          aiControlled: false
        }
      },
      outputSchema: {
        list: {
          type: 'array',
          description: 'List of subscriptions'
        },
        next_offset: { type: 'string' }
      }
    },

    {
      id: 'get_subscription',
      name: 'Get Subscription',
      description: 'Retrieve a specific subscription by ID',
      category: 'Subscriptions',
      icon: 'file',
      verified: false,
      api: {
        endpoint: '/subscriptions/{subscriptionId}',
        method: 'GET',
        headers: { 'Content-Type': 'application/json' }
      },
      inputSchema: {
        subscriptionId: {
          type: 'string',
          required: true,
          label: 'Subscription ID',
          placeholder: 'sub_123456',
          description: 'The ID of the subscription to retrieve',
          aiControlled: false
        }
      },
      outputSchema: {
        subscription: {
          type: 'object',
          description: 'Subscription details'
        }
      }
    },

    // ===== Customer Additional Actions =====
    {
      id: 'get_customer',
      name: 'Get Customer',
      description: 'Retrieve a specific customer by ID',
      category: 'Customers',
      icon: 'user',
      verified: false,
      api: {
        endpoint: '/customers/{customerId}',
        method: 'GET',
        headers: { 'Content-Type': 'application/json' }
      },
      inputSchema: {
        customerId: {
          type: 'string',
          required: true,
          label: 'Customer ID',
          placeholder: 'cust_123',
          description: 'The ID of the customer to retrieve',
          aiControlled: false
        }
      },
      outputSchema: {
        customer: { type: 'object', description: 'Customer details' }
      }
    },

    {
      id: 'update_customer',
      name: 'Update Customer',
      description: 'Update an existing customer',
      category: 'Customers',
      icon: 'edit',
      verified: false,
      api: {
        endpoint: '/customers/{customerId}',
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      },
      inputSchema: {
        customerId: {
          type: 'string',
          required: true,
          label: 'Customer ID',
          description: 'The ID of the customer to update',
          aiControlled: false
        },
        first_name: {
          type: 'string',
          required: false,
          label: 'First Name',
          aiControlled: false
        },
        last_name: {
          type: 'string',
          required: false,
          label: 'Last Name',
          aiControlled: false
        },
        email: {
          type: 'string',
          required: false,
          label: 'Email',
          aiControlled: false
        },
        phone: {
          type: 'string',
          required: false,
          label: 'Phone',
          aiControlled: false
        },
        company: {
          type: 'string',
          required: false,
          label: 'Company',
          aiControlled: false
        }
      },
      outputSchema: {
        customer: { type: 'object', description: 'Updated customer object' }
      }
    },

    {
      id: 'list_customers',
      name: 'List Customers',
      description: 'Retrieve a list of customers',
      category: 'Customers',
      icon: 'users',
      verified: false,
      api: {
        endpoint: '/customers',
        method: 'GET',
        headers: { 'Content-Type': 'application/json' }
      },
      inputSchema: {
        limit: {
          type: 'number',
          required: false,
          label: 'Limit',
          default: 10,
          min: 1,
          max: 100,
          description: 'Maximum number of customers to return',
          aiControlled: false
        }
      },
      outputSchema: {
        list: { type: 'array', description: 'List of customers' },
        next_offset: { type: 'string' }
      }
    }
  ],

  // ============= SUPPORTED TRIGGERS =============
  supported_triggers: [
    {
      id: 'subscription_created',
      name: 'Subscription Created',
      description: 'Triggers when a new subscription is created',
      eventType: 'subscription_created',
      icon: 'plus-circle',
      verified: false,
      webhookRequired: true,
      inputSchema: {},
      outputSchema: {
        subscription: { type: 'object', description: 'Created subscription data' },
        customer: { type: 'object', description: 'Associated customer data' }
      }
    },
    {
      id: 'subscription_cancelled',
      name: 'Subscription Cancelled',
      description: 'Triggers when a subscription is cancelled',
      eventType: 'subscription_cancelled',
      icon: 'x-circle',
      verified: false,
      webhookRequired: true,
      inputSchema: {},
      outputSchema: {
        subscription: { type: 'object', description: 'Cancelled subscription data' }
      }
    },
    {
      id: 'subscription_renewed',
      name: 'Subscription Renewed',
      description: 'Triggers when a subscription is renewed',
      eventType: 'subscription_renewed',
      icon: 'refresh-cw',
      verified: false,
      webhookRequired: true,
      inputSchema: {},
      outputSchema: {
        subscription: { type: 'object', description: 'Renewed subscription data' }
      }
    },
    {
      id: 'payment_succeeded',
      name: 'Payment Succeeded',
      description: 'Triggers when a payment is successfully processed',
      eventType: 'payment_succeeded',
      icon: 'check-circle',
      verified: false,
      webhookRequired: true,
      inputSchema: {},
      outputSchema: {
        transaction: { type: 'object', description: 'Payment transaction data' },
        invoice: { type: 'object', description: 'Associated invoice data' }
      }
    },
    {
      id: 'payment_failed',
      name: 'Payment Failed',
      description: 'Triggers when a payment fails',
      eventType: 'payment_failed',
      icon: 'alert-circle',
      verified: false,
      webhookRequired: true,
      inputSchema: {},
      outputSchema: {
        transaction: { type: 'object', description: 'Failed payment data' },
        invoice: { type: 'object', description: 'Associated invoice data' }
      }
    },
    {
      id: 'invoice_generated',
      name: 'Invoice Generated',
      description: 'Triggers when a new invoice is generated',
      eventType: 'invoice_generated',
      icon: 'file-text',
      verified: false,
      webhookRequired: true,
      inputSchema: {},
      outputSchema: {
        invoice: { type: 'object', description: 'Generated invoice data' }
      }
    },
    {
      id: 'customer_created',
      name: 'Customer Created',
      description: 'Triggers when a new customer is created',
      eventType: 'customer_created',
      icon: 'user-plus',
      verified: false,
      webhookRequired: true,
      inputSchema: {},
      outputSchema: {
        customer: { type: 'object', description: 'Created customer data' }
      }
    }
  ]
};
