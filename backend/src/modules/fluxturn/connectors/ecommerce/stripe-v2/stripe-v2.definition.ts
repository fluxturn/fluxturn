// Stripe V2 Connector Definition
// Full definition with actions, triggers, and aiControlled fields

import { ConnectorDefinition } from '../../shared';

export const STRIPE_V2_CONNECTOR: ConnectorDefinition = {
  name: 'stripe_v2',
  display_name: 'Stripe (V2)',
  category: 'ecommerce',
  description: 'Payment processing, customer management, and subscription handling',
  auth_type: 'api_key',
  auth_fields: [
    {
      key: 'secretKey',
      label: 'Secret Key',
      type: 'password',
      required: true,
      placeholder: 'sk_test_...',
      description: 'Your Stripe secret API key',
      helpUrl: 'https://stripe.com/docs/keys',
      helpText: 'How to find your API keys'
    }
  ],
  endpoints: {
    base_url: 'https://api.stripe.com',
    charges: '/v1/charges',
    customers: '/v1/customers',
    subscriptions: '/v1/subscriptions',
    balance: '/v1/balance',
    tokens: '/v1/tokens',
    sources: '/v1/sources',
    coupons: '/v1/coupons',
    invoices: '/v1/invoices',
    products: '/v1/products',
    prices: '/v1/prices',
    payment_intents: '/v1/payment_intents'
  },
  webhook_support: true,
  rate_limits: { requests_per_second: 100 },
  sandbox_available: true,
  verified: false,
  supported_actions: [
    // Customer Actions
    {
      id: 'customer_create',
      name: 'Create Customer',
      description: 'Create a new Stripe customer',
      category: 'Customer',
      icon: 'user-plus',
      verified: false,
      api: {
        endpoint: '/v1/customers',
        method: 'POST',
        baseUrl: 'https://api.stripe.com',
        headers: {
          'Authorization': 'Bearer {secretKey}',
          'Content-Type': 'application/x-www-form-urlencoded'
        }
      },
      inputSchema: {
        name: {
          type: 'string',
          required: true,
          label: 'Name',
          placeholder: 'John Doe',
          description: 'Customer full name',
          aiControlled: true,
          aiDescription: 'Full name of the customer'
        },
        email: {
          type: 'string',
          required: false,
          label: 'Email',
          inputType: 'email',
          placeholder: 'customer@example.com',
          description: 'Customer email address',
          aiControlled: false
        },
        phone: {
          type: 'string',
          label: 'Phone',
          placeholder: '+1234567890',
          description: 'Customer phone number',
          aiControlled: false
        },
        description: {
          type: 'string',
          label: 'Description',
          inputType: 'textarea',
          description: 'An arbitrary string attached to the customer',
          aiControlled: true,
          aiDescription: 'Description or notes about the customer'
        },
        address: {
          type: 'object',
          label: 'Address',
          description: 'Customer address',
          aiControlled: false,
          properties: {
            line1: { type: 'string', label: 'Address Line 1' },
            line2: { type: 'string', label: 'Address Line 2' },
            city: { type: 'string', label: 'City' },
            state: { type: 'string', label: 'State' },
            postal_code: { type: 'string', label: 'Postal Code' },
            country: { type: 'string', label: 'Country' }
          }
        },
        metadata: {
          type: 'object',
          label: 'Metadata',
          description: 'Set of key-value pairs for additional information',
          aiControlled: false
        }
      },
      outputSchema: {
        id: { type: 'string', description: 'Customer ID' },
        email: { type: 'string', description: 'Customer email' },
        name: { type: 'string', description: 'Customer name' },
        created: { type: 'number', description: 'Creation timestamp' }
      }
    },
    {
      id: 'customer_get',
      name: 'Get Customer',
      description: 'Retrieve details of a specific customer',
      category: 'Customer',
      icon: 'user',
      verified: false,
      api: {
        endpoint: '/v1/customers/{customerId}',
        method: 'GET',
        baseUrl: 'https://api.stripe.com',
        headers: {
          'Authorization': 'Bearer {secretKey}'
        }
      },
      inputSchema: {
        customerId: {
          type: 'string',
          required: true,
          label: 'Customer ID',
          placeholder: 'cus_...',
          description: 'The ID of the customer to retrieve',
          aiControlled: false
        }
      },
      outputSchema: {
        id: { type: 'string', description: 'Customer ID' },
        email: { type: 'string', description: 'Customer email' },
        name: { type: 'string', description: 'Customer name' },
        phone: { type: 'string', description: 'Customer phone' },
        created: { type: 'number', description: 'Creation timestamp' }
      }
    },
    {
      id: 'customer_getAll',
      name: 'Get All Customers',
      description: 'List all customers with optional filtering',
      category: 'Customer',
      icon: 'users',
      verified: false,
      api: {
        endpoint: '/v1/customers',
        method: 'GET',
        baseUrl: 'https://api.stripe.com',
        headers: {
          'Authorization': 'Bearer {secretKey}'
        }
      },
      inputSchema: {
        limit: {
          type: 'number',
          label: 'Limit',
          default: 10,
          min: 1,
          max: 100,
          description: 'Number of customers to return (1-100)',
          aiControlled: false
        },
        email: {
          type: 'string',
          label: 'Email Filter',
          inputType: 'email',
          placeholder: 'customer@example.com',
          description: 'Filter by customer email',
          aiControlled: false
        },
        starting_after: {
          type: 'string',
          label: 'Starting After',
          placeholder: 'cus_...',
          description: 'Cursor for pagination (customer ID)',
          aiControlled: false
        }
      },
      outputSchema: {
        data: {
          type: 'array',
          description: 'Array of customer objects'
        },
        has_more: { type: 'boolean', description: 'Whether more customers exist' }
      }
    },
    {
      id: 'customer_update',
      name: 'Update Customer',
      description: 'Update customer information',
      category: 'Customer',
      icon: 'edit',
      verified: false,
      api: {
        endpoint: '/v1/customers/{customerId}',
        method: 'POST',
        baseUrl: 'https://api.stripe.com',
        headers: {
          'Authorization': 'Bearer {secretKey}',
          'Content-Type': 'application/x-www-form-urlencoded'
        }
      },
      inputSchema: {
        customerId: {
          type: 'string',
          required: true,
          label: 'Customer ID',
          placeholder: 'cus_...',
          description: 'The ID of the customer to update',
          aiControlled: false
        },
        name: {
          type: 'string',
          label: 'Name',
          description: 'Customer full name',
          aiControlled: true,
          aiDescription: 'Updated name for the customer'
        },
        email: {
          type: 'string',
          label: 'Email',
          inputType: 'email',
          description: 'Customer email address',
          aiControlled: false
        },
        phone: {
          type: 'string',
          label: 'Phone',
          description: 'Customer phone number',
          aiControlled: false
        },
        description: {
          type: 'string',
          label: 'Description',
          inputType: 'textarea',
          description: 'Customer description',
          aiControlled: true,
          aiDescription: 'Updated description for the customer'
        }
      },
      outputSchema: {
        id: { type: 'string', description: 'Customer ID' },
        email: { type: 'string', description: 'Updated email' },
        name: { type: 'string', description: 'Updated name' }
      }
    },
    {
      id: 'customer_delete',
      name: 'Delete Customer',
      description: 'Permanently delete a customer',
      category: 'Customer',
      icon: 'trash',
      verified: false,
      api: {
        endpoint: '/v1/customers/{customerId}',
        method: 'DELETE',
        baseUrl: 'https://api.stripe.com',
        headers: {
          'Authorization': 'Bearer {secretKey}'
        }
      },
      inputSchema: {
        customerId: {
          type: 'string',
          required: true,
          label: 'Customer ID',
          placeholder: 'cus_...',
          description: 'The ID of the customer to delete',
          aiControlled: false
        }
      },
      outputSchema: {
        id: { type: 'string', description: 'Deleted customer ID' },
        deleted: { type: 'boolean', description: 'Deletion status' }
      }
    },

    // Charge Actions
    {
      id: 'charge_create',
      name: 'Create Charge',
      description: 'Create a new payment charge',
      category: 'Charge',
      icon: 'credit-card',
      verified: false,
      api: {
        endpoint: '/v1/charges',
        method: 'POST',
        baseUrl: 'https://api.stripe.com',
        headers: {
          'Authorization': 'Bearer {secretKey}',
          'Content-Type': 'application/x-www-form-urlencoded'
        }
      },
      inputSchema: {
        amount: {
          type: 'number',
          required: true,
          label: 'Amount',
          min: 50,
          description: 'Amount in cents (minimum 50 cents)',
          placeholder: '1000',
          aiControlled: false
        },
        currency: {
          type: 'select',
          required: true,
          label: 'Currency',
          default: 'usd',
          options: [
            { label: 'USD - US Dollar', value: 'usd' },
            { label: 'EUR - Euro', value: 'eur' },
            { label: 'GBP - British Pound', value: 'gbp' },
            { label: 'CAD - Canadian Dollar', value: 'cad' },
            { label: 'AUD - Australian Dollar', value: 'aud' },
            { label: 'JPY - Japanese Yen', value: 'jpy' }
          ],
          description: 'Three-letter ISO currency code',
          aiControlled: false
        },
        customer: {
          type: 'string',
          label: 'Customer ID',
          placeholder: 'cus_...',
          description: 'The ID of an existing customer (required if no source)',
          aiControlled: false
        },
        source: {
          type: 'string',
          label: 'Source ID',
          placeholder: 'tok_... or card_...',
          description: 'Payment source ID (token or card)',
          aiControlled: false
        },
        description: {
          type: 'string',
          label: 'Description',
          inputType: 'textarea',
          description: 'An arbitrary string describing the charge',
          aiControlled: true,
          aiDescription: 'Description of what this charge is for'
        },
        statementDescriptor: {
          type: 'string',
          label: 'Statement Descriptor',
          placeholder: 'ACME CORP',
          maxLength: 22,
          description: 'Text that appears on customer credit card statement',
          aiControlled: true,
          aiDescription: 'Short description to appear on customer credit card statement (max 22 characters)'
        },
        receiptEmail: {
          type: 'string',
          label: 'Receipt Email',
          inputType: 'email',
          description: 'Email address to send receipt to',
          aiControlled: false
        },
        metadata: {
          type: 'object',
          label: 'Metadata',
          description: 'Set of key-value pairs for additional information',
          aiControlled: false
        }
      },
      outputSchema: {
        id: { type: 'string', description: 'Charge ID' },
        amount: { type: 'number', description: 'Amount charged' },
        currency: { type: 'string', description: 'Currency' },
        status: { type: 'string', description: 'Charge status' },
        paid: { type: 'boolean', description: 'Whether charge was paid' },
        receipt_url: { type: 'string', description: 'Receipt URL' }
      }
    },
    {
      id: 'charge_get',
      name: 'Get Charge',
      description: 'Retrieve details of a specific charge',
      category: 'Charge',
      icon: 'search',
      verified: false,
      api: {
        endpoint: '/v1/charges/{chargeId}',
        method: 'GET',
        baseUrl: 'https://api.stripe.com',
        headers: {
          'Authorization': 'Bearer {secretKey}'
        }
      },
      inputSchema: {
        chargeId: {
          type: 'string',
          required: true,
          label: 'Charge ID',
          placeholder: 'ch_...',
          description: 'The ID of the charge to retrieve',
          aiControlled: false
        }
      },
      outputSchema: {
        id: { type: 'string', description: 'Charge ID' },
        amount: { type: 'number', description: 'Amount charged' },
        status: { type: 'string', description: 'Charge status' },
        paid: { type: 'boolean', description: 'Payment status' }
      }
    },
    {
      id: 'charge_getAll',
      name: 'Get All Charges',
      description: 'List all charges with optional filtering',
      category: 'Charge',
      icon: 'list',
      verified: false,
      api: {
        endpoint: '/v1/charges',
        method: 'GET',
        baseUrl: 'https://api.stripe.com',
        headers: {
          'Authorization': 'Bearer {secretKey}'
        }
      },
      inputSchema: {
        limit: {
          type: 'number',
          label: 'Limit',
          default: 10,
          min: 1,
          max: 100,
          description: 'Number of charges to return (1-100)',
          aiControlled: false
        },
        customer: {
          type: 'string',
          label: 'Customer ID',
          placeholder: 'cus_...',
          description: 'Only return charges for this customer',
          aiControlled: false
        },
        starting_after: {
          type: 'string',
          label: 'Starting After',
          placeholder: 'ch_...',
          description: 'Cursor for pagination (charge ID)',
          aiControlled: false
        }
      },
      outputSchema: {
        data: {
          type: 'array',
          description: 'Array of charge objects'
        },
        has_more: { type: 'boolean', description: 'Whether more charges exist' }
      }
    },
    {
      id: 'charge_update',
      name: 'Update Charge',
      description: 'Update charge metadata or description',
      category: 'Charge',
      icon: 'edit',
      verified: false,
      api: {
        endpoint: '/v1/charges/{chargeId}',
        method: 'POST',
        baseUrl: 'https://api.stripe.com',
        headers: {
          'Authorization': 'Bearer {secretKey}',
          'Content-Type': 'application/x-www-form-urlencoded'
        }
      },
      inputSchema: {
        chargeId: {
          type: 'string',
          required: true,
          label: 'Charge ID',
          placeholder: 'ch_...',
          description: 'The ID of the charge to update',
          aiControlled: false
        },
        description: {
          type: 'string',
          label: 'Description',
          inputType: 'textarea',
          description: 'An arbitrary string describing the charge',
          aiControlled: true,
          aiDescription: 'Updated description for the charge'
        },
        receiptEmail: {
          type: 'string',
          label: 'Receipt Email',
          inputType: 'email',
          description: 'Email address to send receipt to',
          aiControlled: false
        },
        metadata: {
          type: 'object',
          label: 'Metadata',
          description: 'Set of key-value pairs for additional information',
          aiControlled: false
        }
      },
      outputSchema: {
        id: { type: 'string', description: 'Charge ID' },
        description: { type: 'string', description: 'Updated description' }
      }
    },

    // Payment Intent Actions
    {
      id: 'payment_intent_create',
      name: 'Create Payment Intent',
      description: 'Create a PaymentIntent for a payment flow',
      category: 'Payment Intent',
      icon: 'credit-card',
      verified: false,
      api: {
        endpoint: '/v1/payment_intents',
        method: 'POST',
        baseUrl: 'https://api.stripe.com',
        headers: {
          'Authorization': 'Bearer {secretKey}',
          'Content-Type': 'application/x-www-form-urlencoded'
        }
      },
      inputSchema: {
        amount: {
          type: 'number',
          required: true,
          label: 'Amount',
          min: 50,
          description: 'Amount in cents',
          placeholder: '1000',
          aiControlled: false
        },
        currency: {
          type: 'select',
          required: true,
          label: 'Currency',
          default: 'usd',
          options: [
            { label: 'USD - US Dollar', value: 'usd' },
            { label: 'EUR - Euro', value: 'eur' },
            { label: 'GBP - British Pound', value: 'gbp' },
            { label: 'CAD - Canadian Dollar', value: 'cad' },
            { label: 'AUD - Australian Dollar', value: 'aud' },
            { label: 'JPY - Japanese Yen', value: 'jpy' }
          ],
          description: 'Three-letter ISO currency code',
          aiControlled: false
        },
        customer: {
          type: 'string',
          label: 'Customer ID',
          placeholder: 'cus_...',
          description: 'ID of the customer this PaymentIntent is for',
          aiControlled: false
        },
        description: {
          type: 'string',
          label: 'Description',
          inputType: 'textarea',
          description: 'An arbitrary string attached to the PaymentIntent',
          aiControlled: true,
          aiDescription: 'Description of what this payment is for'
        },
        statementDescriptor: {
          type: 'string',
          label: 'Statement Descriptor',
          placeholder: 'ACME CORP',
          maxLength: 22,
          description: 'Text that appears on customer credit card statement',
          aiControlled: true,
          aiDescription: 'Short description to appear on customer credit card statement (max 22 characters)'
        },
        receiptEmail: {
          type: 'string',
          label: 'Receipt Email',
          inputType: 'email',
          description: 'Email address to send the receipt to',
          aiControlled: false
        },
        paymentMethodTypes: {
          type: 'array',
          label: 'Payment Method Types',
          description: 'The list of payment method types the PaymentIntent can use',
          default: ['card'],
          aiControlled: false
        },
        metadata: {
          type: 'object',
          label: 'Metadata',
          description: 'Set of key-value pairs for additional information',
          aiControlled: false
        }
      },
      outputSchema: {
        id: { type: 'string', description: 'PaymentIntent ID' },
        client_secret: { type: 'string', description: 'Client secret for frontend use' },
        amount: { type: 'number', description: 'Amount' },
        currency: { type: 'string', description: 'Currency' },
        status: { type: 'string', description: 'Payment status' }
      }
    },
    {
      id: 'payment_intent_get',
      name: 'Get Payment Intent',
      description: 'Retrieve details of a specific PaymentIntent',
      category: 'Payment Intent',
      icon: 'search',
      verified: false,
      api: {
        endpoint: '/v1/payment_intents/{paymentIntentId}',
        method: 'GET',
        baseUrl: 'https://api.stripe.com',
        headers: {
          'Authorization': 'Bearer {secretKey}'
        }
      },
      inputSchema: {
        paymentIntentId: {
          type: 'string',
          required: true,
          label: 'Payment Intent ID',
          placeholder: 'pi_...',
          description: 'The ID of the PaymentIntent to retrieve',
          aiControlled: false
        }
      },
      outputSchema: {
        id: { type: 'string', description: 'PaymentIntent ID' },
        amount: { type: 'number', description: 'Amount' },
        currency: { type: 'string', description: 'Currency' },
        status: { type: 'string', description: 'Payment status' },
        customer: { type: 'string', description: 'Customer ID' }
      }
    },
    {
      id: 'payment_intent_update',
      name: 'Update Payment Intent',
      description: 'Update a PaymentIntent',
      category: 'Payment Intent',
      icon: 'edit',
      verified: false,
      api: {
        endpoint: '/v1/payment_intents/{paymentIntentId}',
        method: 'POST',
        baseUrl: 'https://api.stripe.com',
        headers: {
          'Authorization': 'Bearer {secretKey}',
          'Content-Type': 'application/x-www-form-urlencoded'
        }
      },
      inputSchema: {
        paymentIntentId: {
          type: 'string',
          required: true,
          label: 'Payment Intent ID',
          placeholder: 'pi_...',
          description: 'The ID of the PaymentIntent to update',
          aiControlled: false
        },
        amount: {
          type: 'number',
          label: 'Amount',
          min: 50,
          description: 'Amount in cents',
          aiControlled: false
        },
        description: {
          type: 'string',
          label: 'Description',
          inputType: 'textarea',
          description: 'An arbitrary string attached to the PaymentIntent',
          aiControlled: true,
          aiDescription: 'Updated description for the payment'
        },
        metadata: {
          type: 'object',
          label: 'Metadata',
          description: 'Set of key-value pairs for additional information',
          aiControlled: false
        }
      },
      outputSchema: {
        id: { type: 'string', description: 'PaymentIntent ID' },
        amount: { type: 'number', description: 'Amount' },
        status: { type: 'string', description: 'Payment status' }
      }
    },
    {
      id: 'payment_intent_confirm',
      name: 'Confirm Payment Intent',
      description: 'Confirm a PaymentIntent to complete the payment',
      category: 'Payment Intent',
      icon: 'check-circle',
      verified: false,
      api: {
        endpoint: '/v1/payment_intents/{paymentIntentId}/confirm',
        method: 'POST',
        baseUrl: 'https://api.stripe.com',
        headers: {
          'Authorization': 'Bearer {secretKey}',
          'Content-Type': 'application/x-www-form-urlencoded'
        }
      },
      inputSchema: {
        paymentIntentId: {
          type: 'string',
          required: true,
          label: 'Payment Intent ID',
          placeholder: 'pi_...',
          description: 'The ID of the PaymentIntent to confirm',
          aiControlled: false
        },
        paymentMethod: {
          type: 'string',
          label: 'Payment Method ID',
          placeholder: 'pm_...',
          description: 'ID of the payment method to use',
          aiControlled: false
        },
        returnUrl: {
          type: 'string',
          label: 'Return URL',
          inputType: 'url',
          placeholder: 'https://example.com/return',
          description: 'URL to redirect the customer after payment',
          aiControlled: false
        }
      },
      outputSchema: {
        id: { type: 'string', description: 'PaymentIntent ID' },
        status: { type: 'string', description: 'Payment status' },
        next_action: { type: 'object', description: 'Next action if additional steps are required' }
      }
    },
    {
      id: 'payment_intent_cancel',
      name: 'Cancel Payment Intent',
      description: 'Cancel a PaymentIntent',
      category: 'Payment Intent',
      icon: 'x-circle',
      verified: false,
      api: {
        endpoint: '/v1/payment_intents/{paymentIntentId}/cancel',
        method: 'POST',
        baseUrl: 'https://api.stripe.com',
        headers: {
          'Authorization': 'Bearer {secretKey}'
        }
      },
      inputSchema: {
        paymentIntentId: {
          type: 'string',
          required: true,
          label: 'Payment Intent ID',
          placeholder: 'pi_...',
          description: 'The ID of the PaymentIntent to cancel',
          aiControlled: false
        },
        cancellationReason: {
          type: 'select',
          label: 'Cancellation Reason',
          options: [
            { label: 'Duplicate', value: 'duplicate' },
            { label: 'Fraudulent', value: 'fraudulent' },
            { label: 'Requested by Customer', value: 'requested_by_customer' },
            { label: 'Abandoned', value: 'abandoned' }
          ],
          description: 'Reason for canceling the PaymentIntent',
          aiControlled: false
        }
      },
      outputSchema: {
        id: { type: 'string', description: 'PaymentIntent ID' },
        status: { type: 'string', description: 'Payment status (should be canceled)' }
      }
    },

    // Invoice Actions
    {
      id: 'invoice_create',
      name: 'Create Invoice',
      description: 'Create a new invoice for a customer',
      category: 'Invoice',
      icon: 'file-text',
      verified: false,
      api: {
        endpoint: '/v1/invoices',
        method: 'POST',
        baseUrl: 'https://api.stripe.com',
        headers: {
          'Authorization': 'Bearer {secretKey}',
          'Content-Type': 'application/x-www-form-urlencoded'
        }
      },
      inputSchema: {
        customer: {
          type: 'string',
          required: true,
          label: 'Customer ID',
          placeholder: 'cus_...',
          description: 'The ID of the customer to invoice',
          aiControlled: false
        },
        description: {
          type: 'string',
          label: 'Description',
          inputType: 'textarea',
          description: 'An arbitrary string describing the invoice',
          aiControlled: true,
          aiDescription: 'Description to appear on the invoice'
        },
        footer: {
          type: 'string',
          label: 'Footer',
          inputType: 'textarea',
          description: 'Footer to be displayed on the invoice',
          aiControlled: true,
          aiDescription: 'Footer text for the invoice (e.g., payment terms, thank you message)'
        },
        statementDescriptor: {
          type: 'string',
          label: 'Statement Descriptor',
          placeholder: 'ACME CORP',
          maxLength: 22,
          description: 'Text that appears on customer credit card statement',
          aiControlled: true,
          aiDescription: 'Short description to appear on customer credit card statement (max 22 characters)'
        },
        collection_method: {
          type: 'select',
          label: 'Collection Method',
          default: 'charge_automatically',
          options: [
            { label: 'Charge Automatically', value: 'charge_automatically' },
            { label: 'Send Invoice', value: 'send_invoice' }
          ],
          description: 'How to collect payment for this invoice',
          aiControlled: false
        },
        days_until_due: {
          type: 'number',
          label: 'Days Until Due',
          default: 30,
          min: 1,
          description: 'Number of days until the invoice is due (for send_invoice)',
          aiControlled: false
        },
        auto_advance: {
          type: 'boolean',
          label: 'Auto Advance',
          default: true,
          description: 'Automatically finalize and send the invoice',
          aiControlled: false
        },
        metadata: {
          type: 'object',
          label: 'Metadata',
          description: 'Set of key-value pairs for additional information',
          aiControlled: false
        }
      },
      outputSchema: {
        id: { type: 'string', description: 'Invoice ID' },
        status: { type: 'string', description: 'Invoice status' },
        amount_due: { type: 'number', description: 'Amount due in cents' },
        hosted_invoice_url: { type: 'string', description: 'URL to view invoice' }
      }
    },
    {
      id: 'invoice_get',
      name: 'Get Invoice',
      description: 'Retrieve details of a specific invoice',
      category: 'Invoice',
      icon: 'search',
      verified: false,
      api: {
        endpoint: '/v1/invoices/{invoiceId}',
        method: 'GET',
        baseUrl: 'https://api.stripe.com',
        headers: {
          'Authorization': 'Bearer {secretKey}'
        }
      },
      inputSchema: {
        invoiceId: {
          type: 'string',
          required: true,
          label: 'Invoice ID',
          placeholder: 'in_...',
          description: 'The ID of the invoice to retrieve',
          aiControlled: false
        }
      },
      outputSchema: {
        id: { type: 'string', description: 'Invoice ID' },
        status: { type: 'string', description: 'Invoice status' },
        amount_due: { type: 'number', description: 'Amount due' },
        customer: { type: 'string', description: 'Customer ID' }
      }
    },
    {
      id: 'invoice_finalize',
      name: 'Finalize Invoice',
      description: 'Finalize an invoice to prepare it for payment',
      category: 'Invoice',
      icon: 'check',
      verified: false,
      api: {
        endpoint: '/v1/invoices/{invoiceId}/finalize',
        method: 'POST',
        baseUrl: 'https://api.stripe.com',
        headers: {
          'Authorization': 'Bearer {secretKey}'
        }
      },
      inputSchema: {
        invoiceId: {
          type: 'string',
          required: true,
          label: 'Invoice ID',
          placeholder: 'in_...',
          description: 'The ID of the invoice to finalize',
          aiControlled: false
        },
        auto_advance: {
          type: 'boolean',
          label: 'Auto Advance',
          default: true,
          description: 'Automatically send the invoice after finalizing',
          aiControlled: false
        }
      },
      outputSchema: {
        id: { type: 'string', description: 'Invoice ID' },
        status: { type: 'string', description: 'Invoice status' }
      }
    },
    {
      id: 'invoice_send',
      name: 'Send Invoice',
      description: 'Send an invoice email to the customer',
      category: 'Invoice',
      icon: 'send',
      verified: false,
      api: {
        endpoint: '/v1/invoices/{invoiceId}/send',
        method: 'POST',
        baseUrl: 'https://api.stripe.com',
        headers: {
          'Authorization': 'Bearer {secretKey}'
        }
      },
      inputSchema: {
        invoiceId: {
          type: 'string',
          required: true,
          label: 'Invoice ID',
          placeholder: 'in_...',
          description: 'The ID of the invoice to send',
          aiControlled: false
        }
      },
      outputSchema: {
        id: { type: 'string', description: 'Invoice ID' },
        status: { type: 'string', description: 'Invoice status' }
      }
    },
    {
      id: 'invoice_void',
      name: 'Void Invoice',
      description: 'Void a finalized invoice',
      category: 'Invoice',
      icon: 'x',
      verified: false,
      api: {
        endpoint: '/v1/invoices/{invoiceId}/void',
        method: 'POST',
        baseUrl: 'https://api.stripe.com',
        headers: {
          'Authorization': 'Bearer {secretKey}'
        }
      },
      inputSchema: {
        invoiceId: {
          type: 'string',
          required: true,
          label: 'Invoice ID',
          placeholder: 'in_...',
          description: 'The ID of the invoice to void',
          aiControlled: false
        }
      },
      outputSchema: {
        id: { type: 'string', description: 'Invoice ID' },
        status: { type: 'string', description: 'Invoice status (should be void)' }
      }
    },

    // Product Actions
    {
      id: 'product_create',
      name: 'Create Product',
      description: 'Create a new product in Stripe',
      category: 'Product',
      icon: 'package',
      verified: false,
      api: {
        endpoint: '/v1/products',
        method: 'POST',
        baseUrl: 'https://api.stripe.com',
        headers: {
          'Authorization': 'Bearer {secretKey}',
          'Content-Type': 'application/x-www-form-urlencoded'
        }
      },
      inputSchema: {
        name: {
          type: 'string',
          required: true,
          label: 'Name',
          placeholder: 'Premium Subscription',
          description: 'The product name',
          aiControlled: true,
          aiDescription: 'Name of the product'
        },
        description: {
          type: 'string',
          label: 'Description',
          inputType: 'textarea',
          description: 'The product description',
          aiControlled: true,
          aiDescription: 'Description of the product for customers'
        },
        active: {
          type: 'boolean',
          label: 'Active',
          default: true,
          description: 'Whether the product is currently available',
          aiControlled: false
        },
        statementDescriptor: {
          type: 'string',
          label: 'Statement Descriptor',
          placeholder: 'ACME CORP',
          maxLength: 22,
          description: 'Text that appears on customer credit card statement',
          aiControlled: true,
          aiDescription: 'Short description to appear on customer credit card statement (max 22 characters)'
        },
        unitLabel: {
          type: 'string',
          label: 'Unit Label',
          placeholder: 'seat',
          description: 'A label for the unit of the product (e.g., seat, license)',
          aiControlled: true,
          aiDescription: 'Label for the unit of the product'
        },
        images: {
          type: 'array',
          label: 'Images',
          description: 'A list of image URLs for the product',
          aiControlled: false
        },
        metadata: {
          type: 'object',
          label: 'Metadata',
          description: 'Set of key-value pairs for additional information',
          aiControlled: false
        }
      },
      outputSchema: {
        id: { type: 'string', description: 'Product ID' },
        name: { type: 'string', description: 'Product name' },
        active: { type: 'boolean', description: 'Whether product is active' }
      }
    },
    {
      id: 'product_get',
      name: 'Get Product',
      description: 'Retrieve details of a specific product',
      category: 'Product',
      icon: 'search',
      verified: false,
      api: {
        endpoint: '/v1/products/{productId}',
        method: 'GET',
        baseUrl: 'https://api.stripe.com',
        headers: {
          'Authorization': 'Bearer {secretKey}'
        }
      },
      inputSchema: {
        productId: {
          type: 'string',
          required: true,
          label: 'Product ID',
          placeholder: 'prod_...',
          description: 'The ID of the product to retrieve',
          aiControlled: false
        }
      },
      outputSchema: {
        id: { type: 'string', description: 'Product ID' },
        name: { type: 'string', description: 'Product name' },
        description: { type: 'string', description: 'Product description' },
        active: { type: 'boolean', description: 'Whether product is active' }
      }
    },
    {
      id: 'product_update',
      name: 'Update Product',
      description: 'Update a product',
      category: 'Product',
      icon: 'edit',
      verified: false,
      api: {
        endpoint: '/v1/products/{productId}',
        method: 'POST',
        baseUrl: 'https://api.stripe.com',
        headers: {
          'Authorization': 'Bearer {secretKey}',
          'Content-Type': 'application/x-www-form-urlencoded'
        }
      },
      inputSchema: {
        productId: {
          type: 'string',
          required: true,
          label: 'Product ID',
          placeholder: 'prod_...',
          description: 'The ID of the product to update',
          aiControlled: false
        },
        name: {
          type: 'string',
          label: 'Name',
          description: 'The product name',
          aiControlled: true,
          aiDescription: 'Updated name for the product'
        },
        description: {
          type: 'string',
          label: 'Description',
          inputType: 'textarea',
          description: 'The product description',
          aiControlled: true,
          aiDescription: 'Updated description for the product'
        },
        active: {
          type: 'boolean',
          label: 'Active',
          description: 'Whether the product is currently available',
          aiControlled: false
        },
        statementDescriptor: {
          type: 'string',
          label: 'Statement Descriptor',
          maxLength: 22,
          description: 'Text that appears on customer credit card statement',
          aiControlled: true,
          aiDescription: 'Updated statement descriptor (max 22 characters)'
        }
      },
      outputSchema: {
        id: { type: 'string', description: 'Product ID' },
        name: { type: 'string', description: 'Updated name' },
        active: { type: 'boolean', description: 'Whether product is active' }
      }
    },
    {
      id: 'product_delete',
      name: 'Delete Product',
      description: 'Delete a product',
      category: 'Product',
      icon: 'trash',
      verified: false,
      api: {
        endpoint: '/v1/products/{productId}',
        method: 'DELETE',
        baseUrl: 'https://api.stripe.com',
        headers: {
          'Authorization': 'Bearer {secretKey}'
        }
      },
      inputSchema: {
        productId: {
          type: 'string',
          required: true,
          label: 'Product ID',
          placeholder: 'prod_...',
          description: 'The ID of the product to delete',
          aiControlled: false
        }
      },
      outputSchema: {
        id: { type: 'string', description: 'Deleted product ID' },
        deleted: { type: 'boolean', description: 'Deletion status' }
      }
    },

    // Subscription Actions
    {
      id: 'subscription_create',
      name: 'Create Subscription',
      description: 'Create a subscription for a customer',
      category: 'Subscription',
      icon: 'repeat',
      verified: false,
      api: {
        endpoint: '/v1/subscriptions',
        method: 'POST',
        baseUrl: 'https://api.stripe.com',
        headers: {
          'Authorization': 'Bearer {secretKey}',
          'Content-Type': 'application/x-www-form-urlencoded'
        }
      },
      inputSchema: {
        customer: {
          type: 'string',
          required: true,
          label: 'Customer ID',
          placeholder: 'cus_...',
          description: 'The ID of the customer to subscribe',
          aiControlled: false
        },
        priceId: {
          type: 'string',
          required: true,
          label: 'Price ID',
          placeholder: 'price_...',
          description: 'The ID of the price to subscribe to',
          aiControlled: false
        },
        quantity: {
          type: 'number',
          label: 'Quantity',
          default: 1,
          min: 1,
          description: 'The quantity of the subscription',
          aiControlled: false
        },
        description: {
          type: 'string',
          label: 'Description',
          inputType: 'textarea',
          description: 'Description for the subscription',
          aiControlled: true,
          aiDescription: 'Description of the subscription'
        },
        trial_period_days: {
          type: 'number',
          label: 'Trial Period (Days)',
          min: 0,
          description: 'Number of trial days before billing starts',
          aiControlled: false
        },
        cancel_at_period_end: {
          type: 'boolean',
          label: 'Cancel at Period End',
          default: false,
          description: 'If true, the subscription will be canceled at the end of the current period',
          aiControlled: false
        },
        metadata: {
          type: 'object',
          label: 'Metadata',
          description: 'Set of key-value pairs for additional information',
          aiControlled: false
        }
      },
      outputSchema: {
        id: { type: 'string', description: 'Subscription ID' },
        status: { type: 'string', description: 'Subscription status' },
        current_period_start: { type: 'number', description: 'Current period start timestamp' },
        current_period_end: { type: 'number', description: 'Current period end timestamp' }
      }
    },
    {
      id: 'subscription_get',
      name: 'Get Subscription',
      description: 'Retrieve details of a specific subscription',
      category: 'Subscription',
      icon: 'search',
      verified: false,
      api: {
        endpoint: '/v1/subscriptions/{subscriptionId}',
        method: 'GET',
        baseUrl: 'https://api.stripe.com',
        headers: {
          'Authorization': 'Bearer {secretKey}'
        }
      },
      inputSchema: {
        subscriptionId: {
          type: 'string',
          required: true,
          label: 'Subscription ID',
          placeholder: 'sub_...',
          description: 'The ID of the subscription to retrieve',
          aiControlled: false
        }
      },
      outputSchema: {
        id: { type: 'string', description: 'Subscription ID' },
        status: { type: 'string', description: 'Subscription status' },
        customer: { type: 'string', description: 'Customer ID' },
        current_period_end: { type: 'number', description: 'Current period end timestamp' }
      }
    },
    {
      id: 'subscription_update',
      name: 'Update Subscription',
      description: 'Update a subscription',
      category: 'Subscription',
      icon: 'edit',
      verified: false,
      api: {
        endpoint: '/v1/subscriptions/{subscriptionId}',
        method: 'POST',
        baseUrl: 'https://api.stripe.com',
        headers: {
          'Authorization': 'Bearer {secretKey}',
          'Content-Type': 'application/x-www-form-urlencoded'
        }
      },
      inputSchema: {
        subscriptionId: {
          type: 'string',
          required: true,
          label: 'Subscription ID',
          placeholder: 'sub_...',
          description: 'The ID of the subscription to update',
          aiControlled: false
        },
        quantity: {
          type: 'number',
          label: 'Quantity',
          min: 1,
          description: 'The quantity of the subscription',
          aiControlled: false
        },
        description: {
          type: 'string',
          label: 'Description',
          inputType: 'textarea',
          description: 'Description for the subscription',
          aiControlled: true,
          aiDescription: 'Updated description for the subscription'
        },
        cancel_at_period_end: {
          type: 'boolean',
          label: 'Cancel at Period End',
          description: 'If true, the subscription will be canceled at the end of the current period',
          aiControlled: false
        },
        metadata: {
          type: 'object',
          label: 'Metadata',
          description: 'Set of key-value pairs for additional information',
          aiControlled: false
        }
      },
      outputSchema: {
        id: { type: 'string', description: 'Subscription ID' },
        status: { type: 'string', description: 'Subscription status' }
      }
    },
    {
      id: 'subscription_cancel',
      name: 'Cancel Subscription',
      description: 'Cancel a subscription',
      category: 'Subscription',
      icon: 'x-circle',
      verified: false,
      api: {
        endpoint: '/v1/subscriptions/{subscriptionId}',
        method: 'DELETE',
        baseUrl: 'https://api.stripe.com',
        headers: {
          'Authorization': 'Bearer {secretKey}'
        }
      },
      inputSchema: {
        subscriptionId: {
          type: 'string',
          required: true,
          label: 'Subscription ID',
          placeholder: 'sub_...',
          description: 'The ID of the subscription to cancel',
          aiControlled: false
        },
        cancelImmediately: {
          type: 'boolean',
          label: 'Cancel Immediately',
          default: false,
          description: 'If true, cancels immediately; otherwise, at period end',
          aiControlled: false
        }
      },
      outputSchema: {
        id: { type: 'string', description: 'Subscription ID' },
        status: { type: 'string', description: 'Subscription status' },
        canceled_at: { type: 'number', description: 'Cancellation timestamp' }
      }
    },

    // Refund Actions
    {
      id: 'refund_create',
      name: 'Create Refund',
      description: 'Refund a charge',
      category: 'Refund',
      icon: 'rotate-ccw',
      verified: false,
      api: {
        endpoint: '/v1/refunds',
        method: 'POST',
        baseUrl: 'https://api.stripe.com',
        headers: {
          'Authorization': 'Bearer {secretKey}',
          'Content-Type': 'application/x-www-form-urlencoded'
        }
      },
      inputSchema: {
        charge: {
          type: 'string',
          label: 'Charge ID',
          placeholder: 'ch_...',
          description: 'The ID of the charge to refund (or use payment_intent)',
          aiControlled: false
        },
        payment_intent: {
          type: 'string',
          label: 'Payment Intent ID',
          placeholder: 'pi_...',
          description: 'The ID of the PaymentIntent to refund (or use charge)',
          aiControlled: false
        },
        amount: {
          type: 'number',
          label: 'Amount',
          min: 1,
          description: 'Amount to refund in cents (defaults to full refund)',
          aiControlled: false
        },
        reason: {
          type: 'select',
          label: 'Reason',
          options: [
            { label: 'Duplicate', value: 'duplicate' },
            { label: 'Fraudulent', value: 'fraudulent' },
            { label: 'Requested by Customer', value: 'requested_by_customer' }
          ],
          description: 'Reason for the refund',
          aiControlled: false
        },
        metadata: {
          type: 'object',
          label: 'Metadata',
          description: 'Set of key-value pairs for additional information',
          aiControlled: false
        }
      },
      outputSchema: {
        id: { type: 'string', description: 'Refund ID' },
        amount: { type: 'number', description: 'Amount refunded' },
        status: { type: 'string', description: 'Refund status' },
        charge: { type: 'string', description: 'Charge ID' }
      }
    },
    {
      id: 'refund_get',
      name: 'Get Refund',
      description: 'Retrieve details of a specific refund',
      category: 'Refund',
      icon: 'search',
      verified: false,
      api: {
        endpoint: '/v1/refunds/{refundId}',
        method: 'GET',
        baseUrl: 'https://api.stripe.com',
        headers: {
          'Authorization': 'Bearer {secretKey}'
        }
      },
      inputSchema: {
        refundId: {
          type: 'string',
          required: true,
          label: 'Refund ID',
          placeholder: 're_...',
          description: 'The ID of the refund to retrieve',
          aiControlled: false
        }
      },
      outputSchema: {
        id: { type: 'string', description: 'Refund ID' },
        amount: { type: 'number', description: 'Amount refunded' },
        status: { type: 'string', description: 'Refund status' }
      }
    },

    // Customer Card Actions
    {
      id: 'card_add',
      name: 'Add Card to Customer',
      description: 'Add a payment card to a customer',
      category: 'Payment Methods',
      icon: 'credit-card',
      verified: false,
      api: {
        endpoint: '/v1/customers/{customerId}/sources',
        method: 'POST',
        baseUrl: 'https://api.stripe.com',
        headers: {
          'Authorization': 'Bearer {secretKey}',
          'Content-Type': 'application/x-www-form-urlencoded'
        }
      },
      inputSchema: {
        customerId: {
          type: 'string',
          required: true,
          label: 'Customer ID',
          placeholder: 'cus_...',
          description: 'The customer to add the card to',
          aiControlled: false
        },
        token: {
          type: 'string',
          required: true,
          label: 'Card Token',
          placeholder: 'tok_...',
          description: 'Token representing the card (from Stripe.js or token API)',
          aiControlled: false
        }
      },
      outputSchema: {
        id: { type: 'string', description: 'Card ID' },
        brand: { type: 'string', description: 'Card brand' },
        last4: { type: 'string', description: 'Last 4 digits' },
        exp_month: { type: 'number', description: 'Expiration month' },
        exp_year: { type: 'number', description: 'Expiration year' }
      }
    },
    {
      id: 'card_get',
      name: 'Get Card',
      description: 'Retrieve details of a customer card',
      category: 'Payment Methods',
      icon: 'search',
      verified: false,
      api: {
        endpoint: '/v1/customers/{customerId}/sources/{cardId}',
        method: 'GET',
        baseUrl: 'https://api.stripe.com',
        headers: {
          'Authorization': 'Bearer {secretKey}'
        }
      },
      inputSchema: {
        customerId: {
          type: 'string',
          required: true,
          label: 'Customer ID',
          placeholder: 'cus_...',
          description: 'The customer ID',
          aiControlled: false
        },
        cardId: {
          type: 'string',
          required: true,
          label: 'Card ID',
          placeholder: 'card_...',
          description: 'The card ID to retrieve',
          aiControlled: false
        }
      },
      outputSchema: {
        id: { type: 'string', description: 'Card ID' },
        brand: { type: 'string', description: 'Card brand' },
        last4: { type: 'string', description: 'Last 4 digits' }
      }
    },
    {
      id: 'card_remove',
      name: 'Remove Card',
      description: 'Remove a card from a customer',
      category: 'Payment Methods',
      icon: 'trash',
      verified: false,
      api: {
        endpoint: '/v1/customers/{customerId}/sources/{cardId}',
        method: 'DELETE',
        baseUrl: 'https://api.stripe.com',
        headers: {
          'Authorization': 'Bearer {secretKey}'
        }
      },
      inputSchema: {
        customerId: {
          type: 'string',
          required: true,
          label: 'Customer ID',
          placeholder: 'cus_...',
          description: 'The customer ID',
          aiControlled: false
        },
        cardId: {
          type: 'string',
          required: true,
          label: 'Card ID',
          placeholder: 'card_...',
          description: 'The card ID to remove',
          aiControlled: false
        }
      },
      outputSchema: {
        id: { type: 'string', description: 'Removed card ID' },
        deleted: { type: 'boolean', description: 'Deletion status' }
      }
    },

    // Token Actions
    {
      id: 'token_create',
      name: 'Create Token',
      description: 'Create a card token for secure payment processing',
      category: 'Tokens',
      icon: 'key',
      verified: false,
      api: {
        endpoint: '/v1/tokens',
        method: 'POST',
        baseUrl: 'https://api.stripe.com',
        headers: {
          'Authorization': 'Bearer {secretKey}',
          'Content-Type': 'application/x-www-form-urlencoded'
        }
      },
      inputSchema: {
        cardNumber: {
          type: 'string',
          required: true,
          label: 'Card Number',
          placeholder: '4242424242424242',
          description: 'Card number without spaces or dashes',
          aiControlled: false
        },
        expMonth: {
          type: 'number',
          required: true,
          label: 'Expiration Month',
          min: 1,
          max: 12,
          placeholder: '12',
          description: 'Two-digit expiration month (1-12)',
          aiControlled: false
        },
        expYear: {
          type: 'number',
          required: true,
          label: 'Expiration Year',
          placeholder: '2025',
          description: 'Four-digit expiration year',
          aiControlled: false
        },
        cvc: {
          type: 'string',
          required: true,
          label: 'CVC',
          placeholder: '123',
          description: 'Card security code',
          aiControlled: false
        }
      },
      outputSchema: {
        id: { type: 'string', description: 'Token ID' },
        card: {
          type: 'object',
          description: 'Card details',
          properties: {
            brand: { type: 'string' },
            last4: { type: 'string' }
          }
        }
      }
    },

    // Balance Action
    {
      id: 'balance_get',
      name: 'Get Balance',
      description: 'Retrieve your Stripe account balance',
      category: 'Account',
      icon: 'dollar-sign',
      verified: false,
      api: {
        endpoint: '/v1/balance',
        method: 'GET',
        baseUrl: 'https://api.stripe.com',
        headers: {
          'Authorization': 'Bearer {secretKey}'
        }
      },
      inputSchema: {},
      outputSchema: {
        available: {
          type: 'array',
          description: 'Funds available for payout'
        },
        pending: {
          type: 'array',
          description: 'Funds not yet available'
        }
      }
    }
  ],
  supported_triggers: [
    // Charge Triggers
    {
      id: 'charge_succeeded',
      name: 'Charge Succeeded',
      description: 'Triggers when a charge is successfully completed',
      eventType: 'charge.succeeded',
      verified: false,
      icon: 'check-circle',
      webhookRequired: true,
      outputSchema: {
        id: { type: 'string', description: 'Charge ID' },
        amount: { type: 'number', description: 'Amount charged' },
        currency: { type: 'string', description: 'Currency' },
        customer: { type: 'string', description: 'Customer ID' },
        status: { type: 'string', description: 'Charge status' },
        receipt_url: { type: 'string', description: 'Receipt URL' }
      }
    },
    {
      id: 'charge_failed',
      name: 'Charge Failed',
      description: 'Triggers when a charge fails',
      eventType: 'charge.failed',
      verified: false,
      icon: 'x-circle',
      webhookRequired: true,
      outputSchema: {
        id: { type: 'string', description: 'Charge ID' },
        amount: { type: 'number', description: 'Attempted amount' },
        currency: { type: 'string', description: 'Currency' },
        customer: { type: 'string', description: 'Customer ID' },
        failure_code: { type: 'string', description: 'Failure code' },
        failure_message: { type: 'string', description: 'Failure message' }
      }
    },
    {
      id: 'charge_refunded',
      name: 'Charge Refunded',
      description: 'Triggers when a charge is refunded',
      eventType: 'charge.refunded',
      verified: false,
      icon: 'rotate-ccw',
      webhookRequired: true,
      outputSchema: {
        id: { type: 'string', description: 'Charge ID' },
        amount: { type: 'number', description: 'Original amount' },
        amount_refunded: { type: 'number', description: 'Amount refunded' },
        currency: { type: 'string', description: 'Currency' },
        customer: { type: 'string', description: 'Customer ID' }
      }
    },

    // Customer Triggers
    {
      id: 'customer_created',
      name: 'Customer Created',
      description: 'Triggers when a new customer is created',
      eventType: 'customer.created',
      verified: false,
      icon: 'user-plus',
      webhookRequired: true,
      outputSchema: {
        id: { type: 'string', description: 'Customer ID' },
        email: { type: 'string', description: 'Customer email' },
        name: { type: 'string', description: 'Customer name' },
        created: { type: 'number', description: 'Creation timestamp' }
      }
    },
    {
      id: 'customer_updated',
      name: 'Customer Updated',
      description: 'Triggers when a customer is updated',
      eventType: 'customer.updated',
      verified: false,
      icon: 'edit',
      webhookRequired: true,
      outputSchema: {
        id: { type: 'string', description: 'Customer ID' },
        email: { type: 'string', description: 'Customer email' },
        name: { type: 'string', description: 'Customer name' }
      }
    },
    {
      id: 'customer_deleted',
      name: 'Customer Deleted',
      description: 'Triggers when a customer is deleted',
      eventType: 'customer.deleted',
      verified: false,
      icon: 'trash',
      webhookRequired: true,
      outputSchema: {
        id: { type: 'string', description: 'Deleted customer ID' }
      }
    },

    // Payment Intent Triggers
    {
      id: 'payment_intent_succeeded',
      name: 'Payment Intent Succeeded',
      description: 'Triggers when a payment intent succeeds',
      eventType: 'payment_intent.succeeded',
      verified: false,
      icon: 'check-circle',
      webhookRequired: true,
      outputSchema: {
        id: { type: 'string', description: 'Payment Intent ID' },
        amount: { type: 'number', description: 'Amount' },
        currency: { type: 'string', description: 'Currency' },
        customer: { type: 'string', description: 'Customer ID' },
        status: { type: 'string', description: 'Payment status' }
      }
    },
    {
      id: 'payment_intent_failed',
      name: 'Payment Intent Failed',
      description: 'Triggers when a payment intent fails',
      eventType: 'payment_intent.payment_failed',
      verified: false,
      icon: 'x-circle',
      webhookRequired: true,
      outputSchema: {
        id: { type: 'string', description: 'Payment Intent ID' },
        amount: { type: 'number', description: 'Amount' },
        customer: { type: 'string', description: 'Customer ID' },
        last_payment_error: {
          type: 'object',
          description: 'Error details'
        }
      }
    },
    {
      id: 'payment_intent_created',
      name: 'Payment Intent Created',
      description: 'Triggers when a payment intent is created',
      eventType: 'payment_intent.created',
      verified: false,
      icon: 'plus-circle',
      webhookRequired: true,
      outputSchema: {
        id: { type: 'string', description: 'Payment Intent ID' },
        amount: { type: 'number', description: 'Amount' },
        currency: { type: 'string', description: 'Currency' },
        status: { type: 'string', description: 'Payment status' }
      }
    },

    // Invoice Triggers
    {
      id: 'invoice_created',
      name: 'Invoice Created',
      description: 'Triggers when an invoice is created',
      eventType: 'invoice.created',
      verified: false,
      icon: 'file-text',
      webhookRequired: true,
      outputSchema: {
        id: { type: 'string', description: 'Invoice ID' },
        customer: { type: 'string', description: 'Customer ID' },
        amount_due: { type: 'number', description: 'Amount due' },
        status: { type: 'string', description: 'Invoice status' }
      }
    },
    {
      id: 'invoice_paid',
      name: 'Invoice Paid',
      description: 'Triggers when an invoice is paid',
      eventType: 'invoice.paid',
      verified: false,
      icon: 'check',
      webhookRequired: true,
      outputSchema: {
        id: { type: 'string', description: 'Invoice ID' },
        customer: { type: 'string', description: 'Customer ID' },
        amount_paid: { type: 'number', description: 'Amount paid' },
        status: { type: 'string', description: 'Invoice status' }
      }
    },
    {
      id: 'invoice_payment_failed',
      name: 'Invoice Payment Failed',
      description: 'Triggers when an invoice payment fails',
      eventType: 'invoice.payment_failed',
      verified: false,
      icon: 'x-circle',
      webhookRequired: true,
      outputSchema: {
        id: { type: 'string', description: 'Invoice ID' },
        customer: { type: 'string', description: 'Customer ID' },
        amount_due: { type: 'number', description: 'Amount due' },
        attempt_count: { type: 'number', description: 'Payment attempt count' }
      }
    },

    // Subscription Triggers
    {
      id: 'subscription_created',
      name: 'Subscription Created',
      description: 'Triggers when a subscription is created',
      eventType: 'customer.subscription.created',
      verified: false,
      icon: 'plus-circle',
      webhookRequired: true,
      outputSchema: {
        id: { type: 'string', description: 'Subscription ID' },
        customer: { type: 'string', description: 'Customer ID' },
        status: { type: 'string', description: 'Subscription status' },
        current_period_end: { type: 'number', description: 'Current period end' }
      }
    },
    {
      id: 'subscription_updated',
      name: 'Subscription Updated',
      description: 'Triggers when a subscription is updated',
      eventType: 'customer.subscription.updated',
      verified: false,
      icon: 'edit',
      webhookRequired: true,
      outputSchema: {
        id: { type: 'string', description: 'Subscription ID' },
        customer: { type: 'string', description: 'Customer ID' },
        status: { type: 'string', description: 'Subscription status' },
        cancel_at_period_end: { type: 'boolean', description: 'Whether canceling at period end' }
      }
    },
    {
      id: 'subscription_deleted',
      name: 'Subscription Canceled',
      description: 'Triggers when a subscription is canceled',
      eventType: 'customer.subscription.deleted',
      verified: false,
      icon: 'x-circle',
      webhookRequired: true,
      outputSchema: {
        id: { type: 'string', description: 'Subscription ID' },
        customer: { type: 'string', description: 'Customer ID' },
        status: { type: 'string', description: 'Subscription status' },
        canceled_at: { type: 'number', description: 'Cancellation timestamp' }
      }
    },
    {
      id: 'subscription_trial_ending',
      name: 'Subscription Trial Ending',
      description: 'Triggers 3 days before a trial ends',
      eventType: 'customer.subscription.trial_will_end',
      verified: false,
      icon: 'clock',
      webhookRequired: true,
      outputSchema: {
        id: { type: 'string', description: 'Subscription ID' },
        customer: { type: 'string', description: 'Customer ID' },
        trial_end: { type: 'number', description: 'Trial end timestamp' }
      }
    },

    // Refund Trigger
    {
      id: 'refund_created',
      name: 'Refund Created',
      description: 'Triggers when a refund is created',
      eventType: 'charge.refund.updated',
      verified: false,
      icon: 'rotate-ccw',
      webhookRequired: true,
      outputSchema: {
        id: { type: 'string', description: 'Refund ID' },
        charge: { type: 'string', description: 'Charge ID' },
        amount: { type: 'number', description: 'Refund amount' },
        status: { type: 'string', description: 'Refund status' }
      }
    }
  ]
};
