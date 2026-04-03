// Stripe Connector
// Auto-generated from connector.constants.ts

import { ConnectorDefinition } from '../../shared';

export const STRIPE_CONNECTOR: ConnectorDefinition = {
    name: 'stripe',
    display_name: 'Stripe',
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
      coupons: '/v1/coupons'
    },
    webhook_support: true,
    rate_limits: { requests_per_second: 100 },
    sandbox_available: true,
    verified: true,
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
            aiControlled: true,
            aiDescription: 'Email address for the customer'
          },
          phone: {
            type: 'string',
            label: 'Phone',
            placeholder: '+1234567890',
            description: 'Customer phone number',
            aiControlled: true,
            aiDescription: 'Phone number for the customer'
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
            properties: {
              line1: { type: 'string', label: 'Address Line 1' },
              line2: { type: 'string', label: 'Address Line 2' },
              city: { type: 'string', label: 'City' },
              state: { type: 'string', label: 'State' },
              postal_code: { type: 'string', label: 'Postal Code' },
              country: { type: 'string', label: 'Country' }
            }
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
            description: 'The ID of the customer to retrieve'
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
            description: 'Number of customers to return (1-100)'
          },
          email: {
            type: 'string',
            label: 'Email Filter',
            inputType: 'email',
            placeholder: 'customer@example.com',
            description: 'Filter by customer email'
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
            description: 'The ID of the customer to update'
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
            aiControlled: true,
            aiDescription: 'Updated email address for the customer'
          },
          phone: {
            type: 'string',
            label: 'Phone',
            description: 'Customer phone number',
            aiControlled: true,
            aiDescription: 'Updated phone number for the customer'
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
            description: 'The ID of the customer to delete'
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
            placeholder: '1000'
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
            description: 'Three-letter ISO currency code'
          },
          customer: {
            type: 'string',
            label: 'Customer ID',
            placeholder: 'cus_...',
            description: 'The ID of an existing customer (required if no source)'
          },
          source: {
            type: 'string',
            label: 'Source ID',
            placeholder: 'tok_... or card_...',
            description: 'Payment source ID (token or card)'
          },
          description: {
            type: 'string',
            label: 'Description',
            inputType: 'textarea',
            description: 'An arbitrary string describing the charge',
            aiControlled: true,
            aiDescription: 'Description of what this charge is for'
          },
          receiptEmail: {
            type: 'string',
            label: 'Receipt Email',
            inputType: 'email',
            description: 'Email address to send receipt to',
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
            description: 'The ID of the charge to retrieve'
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
            description: 'Number of charges to return (1-100)'
          },
          customer: {
            type: 'string',
            label: 'Customer ID',
            placeholder: 'cus_...',
            description: 'Only return charges for this customer'
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
            description: 'The ID of the charge to update'
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
          }
        },
        outputSchema: {
          id: { type: 'string', description: 'Charge ID' },
          description: { type: 'string', description: 'Updated description' }
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
            description: 'The customer to add the card to'
          },
          token: {
            type: 'string',
            required: true,
            label: 'Card Token',
            placeholder: 'tok_...',
            description: 'Token representing the card (from Stripe.js or token API)'
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
            description: 'The customer ID'
          },
          cardId: {
            type: 'string',
            required: true,
            label: 'Card ID',
            placeholder: 'card_...',
            description: 'The card ID to retrieve'
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
            description: 'The customer ID'
          },
          cardId: {
            type: 'string',
            required: true,
            label: 'Card ID',
            placeholder: 'card_...',
            description: 'The card ID to remove'
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
            description: 'Card number without spaces or dashes'
          },
          expMonth: {
            type: 'number',
            required: true,
            label: 'Expiration Month',
            min: 1,
            max: 12,
            placeholder: '12',
            description: 'Two-digit expiration month (1-12)'
          },
          expYear: {
            type: 'number',
            required: true,
            label: 'Expiration Year',
            placeholder: '2025',
            description: 'Four-digit expiration year'
          },
          cvc: {
            type: 'string',
            required: true,
            label: 'CVC',
            placeholder: '123',
            description: 'Card security code'
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
      }
    ]
  };
