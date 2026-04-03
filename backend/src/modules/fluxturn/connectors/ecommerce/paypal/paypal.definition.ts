// PayPal Connector Definition
// Based on n8n PayPal implementation

import { ConnectorDefinition } from '../../shared';

export const PAYPAL_CONNECTOR: ConnectorDefinition = {
  name: 'paypal',
  display_name: 'PayPal',
  category: 'ecommerce',
  description: 'Consume PayPal API for payments, payouts, and webhooks',
  auth_type: 'api_key',
  auth_fields: [
    {
      key: 'clientId',
      label: 'Client ID',
      type: 'string',
      required: true,
      placeholder: 'Enter your PayPal Client ID',
      description: 'Your PayPal REST API Client ID'
    },
    {
      key: 'clientSecret',
      label: 'Client Secret',
      type: 'password',
      required: true,
      placeholder: 'Enter your PayPal Client Secret',
      description: 'Your PayPal REST API Client Secret'
    },
    {
      key: 'environment',
      label: 'Environment',
      type: 'select',
      required: true,
      default: 'sandbox',
      options: [
        { label: 'Sandbox', value: 'sandbox' },
        { label: 'Live', value: 'live' }
      ],
      description: 'Use sandbox for testing or live for production'
    }
  ],
  endpoints: {
    sandbox: 'https://api-m.sandbox.paypal.com',
    live: 'https://api-m.paypal.com',
    oauth: '/v1/oauth2/token',
    payouts: '/v1/payments/payouts',
    payoutItems: '/v1/payments/payouts-item',
    orders: '/v2/checkout/orders',
    payments: '/v2/payments',
    webhooks: '/v1/notifications/webhooks'
  },
  webhook_support: true,
  rate_limits: { requests_per_minute: 60 },
  sandbox_available: true,

  // Actions based on n8n implementation
  supported_actions: [
    // Payout Actions
    {
      id: 'create_payout',
      name: 'Create Payout',
      description: 'Create a batch payout to send payments',
      category: 'Payout',
      icon: 'send',
      api: {
        endpoint: '/v1/payments/payouts',
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer {accessToken}'
        }
      },
      inputSchema: {
        senderBatchId: {
          type: 'string',
          required: true,
          label: 'Sender Batch ID',
          placeholder: 'batch_123456',
          description: 'A sender-specified ID number. Tracks the payout in an accounting system.',
          aiControlled: false
        },
        emailSubject: {
          type: 'string',
          label: 'Email Subject',
          placeholder: 'You have a payout!',
          description: 'The subject line for the email that PayPal sends when payment completes',
          maxLength: 255,
          aiControlled: true,
          aiDescription: 'Generate a friendly and professional email subject line for a PayPal payout notification'
        },
        emailMessage: {
          type: 'string',
          label: 'Email Message',
          inputType: 'textarea',
          placeholder: 'You have received a payout',
          description: 'The email message that PayPal sends when the payout item completes',
          aiControlled: true,
          aiDescription: 'Generate a friendly and professional email message body for a PayPal payout notification'
        },
        note: {
          type: 'string',
          label: 'Note',
          inputType: 'textarea',
          placeholder: 'Payout batch note',
          description: 'Note for the payout batch',
          maxLength: 1000,
          aiControlled: true,
          aiDescription: 'Generate a descriptive note for the payout batch explaining its purpose'
        },
        jsonParameters: {
          type: 'boolean',
          label: 'JSON Parameters',
          default: false,
          description: 'Use JSON format for payout items',
          aiControlled: false
        },
        items: {
          type: 'array',
          required: true,
          label: 'Payout Items',
          description: 'Array of payout items',
          aiControlled: false,
          displayOptions: {
            show: {
              jsonParameters: [false]
            }
          },
          itemSchema: {
            recipientType: {
              type: 'select',
              required: true,
              label: 'Recipient Type',
              default: 'email',
              options: [
                { label: 'Email', value: 'EMAIL', description: 'The unencrypted email' },
                { label: 'Phone', value: 'PHONE', description: 'The unencrypted phone number' },
                { label: 'PayPal ID', value: 'PAYPAL_ID', description: 'The encrypted PayPal account number' }
              ],
              description: 'The ID type that identifies the recipient',
              aiControlled: false
            },
            receiverValue: {
              type: 'string',
              required: true,
              label: 'Receiver',
              placeholder: 'recipient@example.com',
              description: 'The receiver of the payment (email, phone, or PayPal ID)',
              maxLength: 127,
              aiControlled: false
            },
            currency: {
              type: 'select',
              required: true,
              label: 'Currency',
              default: 'USD',
              options: [
                { label: 'US Dollar', value: 'USD' },
                { label: 'Euro', value: 'EUR' },
                { label: 'British Pound', value: 'GBP' },
                { label: 'Canadian Dollar', value: 'CAD' },
                { label: 'Australian Dollar', value: 'AUD' },
                { label: 'Brazilian Real', value: 'BRL' },
                { label: 'Czech Koruna', value: 'CZK' },
                { label: 'Danish Krone', value: 'DKK' }
              ],
              aiControlled: false
            },
            amount: {
              type: 'number',
              required: true,
              label: 'Amount',
              placeholder: '10.00',
              description: 'The payout amount',
              min: 0.01,
              aiControlled: false
            },
            note: {
              type: 'string',
              label: 'Note',
              inputType: 'textarea',
              placeholder: 'Payment for services',
              description: 'The sender-specified note for notifications',
              maxLength: 4000,
              aiControlled: true,
              aiDescription: 'Generate a descriptive note for this payout item explaining the payment purpose'
            },
            senderItemId: {
              type: 'string',
              label: 'Sender Item ID',
              placeholder: 'item_123',
              description: 'The sender-specified ID for tracking',
              aiControlled: false
            },
            recipientWallet: {
              type: 'select',
              label: 'Recipient Wallet',
              default: 'PAYPAL',
              options: [
                { label: 'PayPal', value: 'PAYPAL' },
                { label: 'Venmo', value: 'VENMO' }
              ],
              description: 'The wallet type for the recipient',
              aiControlled: false
            }
          }
        },
        itemsJson: {
          type: 'string',
          label: 'Items (JSON)',
          inputType: 'textarea',
          description: 'JSON array of payout items',
          aiControlled: false,
          displayOptions: {
            show: {
              jsonParameters: [true]
            }
          }
        }
      },
      outputSchema: {
        batch_header: {
          type: 'object',
          description: 'Batch header with payout details',
          properties: {
            payout_batch_id: { type: 'string' },
            batch_status: { type: 'string' },
            sender_batch_header: { type: 'object' }
          }
        },
        links: {
          type: 'array',
          description: 'HATEOAS links'
        }
      }
    },
    {
      id: 'get_payout',
      name: 'Get Payout',
      description: 'Show batch payout details',
      category: 'Payout',
      icon: 'search',
      api: {
        endpoint: '/v1/payments/payouts/{payoutBatchId}',
        method: 'GET',
        headers: {
          'Authorization': 'Bearer {accessToken}'
        }
      },
      inputSchema: {
        payoutBatchId: {
          type: 'string',
          required: true,
          label: 'Payout Batch ID',
          placeholder: 'XXXXXXXXXXXX',
          description: 'The ID of the payout for which to show details',
          aiControlled: false
        },
        returnAll: {
          type: 'boolean',
          label: 'Return All',
          default: false,
          description: 'Whether to return all items or only up to a given limit',
          aiControlled: false
        },
        limit: {
          type: 'number',
          label: 'Limit',
          default: 100,
          min: 1,
          max: 1000,
          description: 'Max number of results to return',
          aiControlled: false,
          displayOptions: {
            show: {
              returnAll: [false]
            }
          }
        }
      },
      outputSchema: {
        batch_header: { type: 'object' },
        items: { type: 'array' }
      }
    },

    // Payout Item Actions
    {
      id: 'get_payout_item',
      name: 'Get Payout Item',
      description: 'Show payout item details',
      category: 'Payout Item',
      icon: 'file',
      api: {
        endpoint: '/v1/payments/payouts-item/{payoutItemId}',
        method: 'GET',
        headers: {
          'Authorization': 'Bearer {accessToken}'
        }
      },
      inputSchema: {
        payoutItemId: {
          type: 'string',
          required: true,
          label: 'Payout Item ID',
          placeholder: 'XXXXXXXXXXXX',
          description: 'The ID of the payout item for which to show details',
          aiControlled: false
        }
      },
      outputSchema: {
        payout_item_id: { type: 'string' },
        transaction_id: { type: 'string' },
        transaction_status: { type: 'string' },
        payout_item: { type: 'object' }
      }
    },
    {
      id: 'cancel_payout_item',
      name: 'Cancel Payout Item',
      description: 'Cancels an unclaimed payout item',
      category: 'Payout Item',
      icon: 'x',
      api: {
        endpoint: '/v1/payments/payouts-item/{payoutItemId}/cancel',
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer {accessToken}'
        }
      },
      inputSchema: {
        payoutItemId: {
          type: 'string',
          required: true,
          label: 'Payout Item ID',
          placeholder: 'XXXXXXXXXXXX',
          description: 'The ID of the payout item to cancel',
          aiControlled: false
        }
      },
      outputSchema: {
        payout_item_id: { type: 'string' },
        transaction_status: { type: 'string' },
        links: { type: 'array' }
      }
    }
  ],

  // Triggers based on n8n PayPalTrigger implementation
  supported_triggers: [
    {
      id: 'webhook_events',
      name: 'Webhook Events',
      description: 'Handle PayPal events via webhooks',
      eventType: 'paypal_webhook',
      icon: 'bell',
      webhookRequired: true,
      inputSchema: {
        events: {
          type: 'array',
          required: true,
          label: 'Event Types',
          description: 'The events to listen to',
          aiControlled: false,
          itemSchema: {
            type: 'select',
            options: [
              { label: 'All Events (*)', value: '*' },
              { label: 'Payment Capture Completed', value: 'PAYMENT.CAPTURE.COMPLETED' },
              { label: 'Payment Capture Denied', value: 'PAYMENT.CAPTURE.DENIED' },
              { label: 'Payment Capture Pending', value: 'PAYMENT.CAPTURE.PENDING' },
              { label: 'Payment Capture Refunded', value: 'PAYMENT.CAPTURE.REFUNDED' },
              { label: 'Payment Capture Reversed', value: 'PAYMENT.CAPTURE.REVERSED' },
              { label: 'Checkout Order Approved', value: 'CHECKOUT.ORDER.APPROVED' },
              { label: 'Checkout Order Completed', value: 'CHECKOUT.ORDER.COMPLETED' },
              { label: 'Billing Subscription Activated', value: 'BILLING.SUBSCRIPTION.ACTIVATED' },
              { label: 'Billing Subscription Cancelled', value: 'BILLING.SUBSCRIPTION.CANCELLED' },
              { label: 'Billing Subscription Created', value: 'BILLING.SUBSCRIPTION.CREATED' },
              { label: 'Billing Subscription Expired', value: 'BILLING.SUBSCRIPTION.EXPIRED' },
              { label: 'Billing Subscription Suspended', value: 'BILLING.SUBSCRIPTION.SUSPENDED' },
              { label: 'Billing Subscription Updated', value: 'BILLING.SUBSCRIPTION.UPDATED' },
              { label: 'Payout Item Succeeded', value: 'PAYMENT.PAYOUTSBATCH.SUCCESS' },
              { label: 'Payout Item Denied', value: 'PAYMENT.PAYOUTSBATCH.DENIED' }
            ]
          }
        }
      },
      outputSchema: {
        id: { type: 'string', description: 'Event ID' },
        event_type: { type: 'string', description: 'The event type name' },
        create_time: { type: 'string', description: 'When the event was created' },
        resource_type: { type: 'string', description: 'The resource type' },
        resource: {
          type: 'object',
          description: 'The resource data that triggered the event'
        },
        summary: { type: 'string', description: 'Event summary' },
        links: { type: 'array', description: 'HATEOAS links' }
      }
    }
  ]
};
