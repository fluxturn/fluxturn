// Paddle Connector Definition
// Based on n8n Paddle implementation

import { ConnectorDefinition } from '../../shared';

export const PADDLE_CONNECTOR: ConnectorDefinition = {
  name: 'paddle',
  display_name: 'Paddle',
  category: 'ecommerce',
  description: 'Payment processing and subscription management platform for SaaS businesses',
  auth_type: 'api_key',
  auth_fields: [
    {
      key: 'vendorId',
      label: 'Vendor ID',
      type: 'string',
      required: true,
      placeholder: 'Enter your Paddle Vendor ID',
      description: 'Your Paddle Vendor ID found in Developer Tools > Authentication'
    },
    {
      key: 'vendorAuthCode',
      label: 'Vendor Auth Code',
      type: 'password',
      required: true,
      placeholder: 'Enter your Paddle Vendor Auth Code',
      description: 'Your Paddle API authentication code'
    },
    {
      key: 'sandbox',
      label: 'Use Sandbox',
      type: 'boolean',
      required: false,
      default: false,
      description: 'Enable to use Paddle Sandbox environment for testing'
    }
  ],
  endpoints: {
    production: 'https://vendors.paddle.com/api',
    sandbox: 'https://sandbox-vendors.paddle.com/api',
    coupons: {
      create: '/2.1/product/create_coupon',
      list: '/2.0/product/list_coupons',
      update: '/2.1/product/update_coupon'
    },
    payments: {
      list: '/2.0/subscription/payments',
      reschedule: '/2.0/subscription/payments_reschedule'
    },
    plans: {
      list: '/2.0/subscription/plans',
      get: '/2.0/subscription/plans'
    },
    products: {
      list: '/2.0/product/get_products'
    },
    subscriptions: {
      list: '/2.0/subscription/users',
      cancel: '/2.0/subscription/users_cancel'
    }
  },
  webhook_support: true,
  rate_limits: { requests_per_minute: 60 },
  sandbox_available: true,

  // Actions based on n8n implementation
  supported_actions: [
    // Coupon Actions
    {
      id: 'create_coupon',
      name: 'Create Coupon',
      description: 'Create a new coupon code',
      category: 'Coupon',
      icon: 'tag',
      api: {
        endpoint: '/2.1/product/create_coupon',
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        }
      },
      inputSchema: {
        couponType: {
          type: 'select',
          required: true,
          label: 'Coupon Type',
          description: 'Either product (valid for specified products) or checkout (valid for any checkout)',
          options: [
            { label: 'Checkout', value: 'checkout' },
            { label: 'Product', value: 'product' }
          ],
          default: 'checkout',
          aiControlled: false
        },
        productIds: {
          type: 'string',
          required: false,
          label: 'Product IDs',
          placeholder: '123,456,789',
          description: 'Comma-separated list of product IDs (required if coupon type is product)',
          displayOptions: {
            show: {
              couponType: ['product']
            }
          },
          aiControlled: false
        },
        discountType: {
          type: 'select',
          required: true,
          label: 'Discount Type',
          description: 'Type of discount',
          options: [
            { label: 'Flat', value: 'flat' },
            { label: 'Percentage', value: 'percentage' }
          ],
          default: 'flat',
          aiControlled: false
        },
        discountAmount: {
          type: 'number',
          required: true,
          label: 'Discount Amount',
          description: 'Discount amount in currency or percentage',
          min: 1,
          aiControlled: false
        },
        currency: {
          type: 'select',
          required: false,
          label: 'Currency',
          description: 'Currency for flat discount (must match your balance currency)',
          default: 'USD',
          options: [
            { label: 'USD', value: 'USD' },
            { label: 'EUR', value: 'EUR' },
            { label: 'GBP', value: 'GBP' },
            { label: 'AUD', value: 'AUD' },
            { label: 'CAD', value: 'CAD' },
            { label: 'JPY', value: 'JPY' },
            { label: 'CNY', value: 'CNY' },
            { label: 'INR', value: 'INR' },
            { label: 'BRL', value: 'BRL' },
            { label: 'CHF', value: 'CHF' }
          ],
          displayOptions: {
            show: {
              discountType: ['flat']
            }
          },
          aiControlled: false
        },
        couponCode: {
          type: 'string',
          required: false,
          label: 'Coupon Code',
          placeholder: 'SAVE20',
          description: 'Specific coupon code (will be randomly generated if not specified)',
          aiControlled: false
        },
        couponPrefix: {
          type: 'string',
          required: false,
          label: 'Coupon Prefix',
          placeholder: 'PROMO',
          description: 'Prefix for generated codes (not valid if coupon code is specified)',
          maxLength: 10,
          aiControlled: false
        },
        numberOfCoupons: {
          type: 'number',
          required: false,
          label: 'Number of Coupons',
          description: 'Number of coupons to generate (not valid if coupon code is specified)',
          default: 1,
          min: 1,
          max: 1000,
          aiControlled: false
        },
        allowedUses: {
          type: 'number',
          required: false,
          label: 'Allowed Uses',
          description: 'Number of times a coupon can be used (default: 999,999)',
          min: 1,
          aiControlled: false
        },
        expires: {
          type: 'string',
          required: false,
          label: 'Expires',
          description: 'The coupon will expire on this date at 00:00:00 UTC (YYYY-MM-DD format)',
          inputType: 'date',
          aiControlled: false
        },
        group: {
          type: 'string',
          required: false,
          label: 'Group',
          placeholder: 'summer-sale',
          description: 'The name of the coupon group this coupon should be assigned to',
          maxLength: 50,
          aiControlled: false
        },
        description: {
          type: 'string',
          required: false,
          label: 'Description',
          inputType: 'textarea',
          placeholder: 'Summer sale discount',
          description: 'Description of the coupon (displayed in Seller Dashboard)',
          aiControlled: false
        },
        recurring: {
          type: 'boolean',
          required: false,
          label: 'Recurring',
          description: 'Whether the discount applies to recurring payments after initial purchase',
          default: false,
          aiControlled: false
        }
      },
      outputSchema: {
        couponCodes: {
          type: 'array',
          description: 'Array of generated coupon codes'
        }
      }
    },
    {
      id: 'get_coupons',
      name: 'Get Coupons',
      description: 'Get all coupons for a product',
      category: 'Coupon',
      icon: 'list',
      api: {
        endpoint: '/2.0/product/list_coupons',
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        }
      },
      inputSchema: {
        productId: {
          type: 'string',
          required: true,
          label: 'Product ID',
          placeholder: '12345',
          description: 'The specific product/subscription ID',
          aiControlled: false
        },
        returnAll: {
          type: 'boolean',
          required: false,
          label: 'Return All',
          description: 'Whether to return all results or limit',
          default: false,
          aiControlled: false
        },
        limit: {
          type: 'number',
          required: false,
          label: 'Limit',
          description: 'Maximum number of results to return',
          default: 100,
          min: 1,
          max: 500,
          displayOptions: {
            show: {
              returnAll: [false]
            }
          },
          aiControlled: false
        }
      },
      outputSchema: {
        coupons: {
          type: 'array',
          description: 'List of coupons'
        }
      }
    },
    {
      id: 'update_coupon',
      name: 'Update Coupon',
      description: 'Update an existing coupon',
      category: 'Coupon',
      icon: 'edit',
      api: {
        endpoint: '/2.1/product/update_coupon',
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        }
      },
      inputSchema: {
        updateBy: {
          type: 'select',
          required: true,
          label: 'Update By',
          description: 'Update by coupon code or group',
          options: [
            { label: 'Coupon Code', value: 'couponCode' },
            { label: 'Group', value: 'group' }
          ],
          default: 'couponCode',
          aiControlled: false
        },
        couponCode: {
          type: 'string',
          required: false,
          label: 'Coupon Code',
          placeholder: 'SAVE20',
          description: 'Identify the coupon to update',
          displayOptions: {
            show: {
              updateBy: ['couponCode']
            }
          },
          aiControlled: false
        },
        group: {
          type: 'string',
          required: false,
          label: 'Group',
          placeholder: 'summer-sale',
          description: 'The name of the group of coupons to update',
          displayOptions: {
            show: {
              updateBy: ['group']
            }
          },
          aiControlled: false
        },
        allowedUses: {
          type: 'number',
          required: false,
          label: 'Allowed Uses',
          description: 'Number of times a coupon can be used',
          min: 1,
          aiControlled: false
        },
        currency: {
          type: 'string',
          required: false,
          label: 'Currency',
          placeholder: 'USD',
          description: 'Currency code',
          aiControlled: false
        },
        newCouponCode: {
          type: 'string',
          required: false,
          label: 'New Coupon Code',
          placeholder: 'NEWSAVE20',
          description: 'New code to rename the coupon to',
          aiControlled: false
        },
        expires: {
          type: 'string',
          required: false,
          label: 'Expires',
          description: 'New expiration date (YYYY-MM-DD format)',
          inputType: 'date',
          aiControlled: false
        },
        newGroup: {
          type: 'string',
          required: false,
          label: 'New Group',
          placeholder: 'winter-sale',
          description: 'New group name to move coupon to',
          maxLength: 50,
          aiControlled: false
        },
        recurring: {
          type: 'boolean',
          required: false,
          label: 'Recurring',
          description: 'Whether discount applies to recurring payments',
          aiControlled: false
        },
        productIds: {
          type: 'string',
          required: false,
          label: 'Product IDs',
          placeholder: '123,456',
          description: 'Comma-separated list of products (blank to remove associated products)',
          aiControlled: false
        },
        discountAmount: {
          type: 'number',
          required: false,
          label: 'Discount Amount',
          description: 'New discount amount',
          min: 0,
          aiControlled: false
        }
      },
      outputSchema: {
        updated: {
          type: 'boolean',
          description: 'Whether update was successful'
        }
      }
    },
    // Payment Actions
    {
      id: 'get_payments',
      name: 'Get Payments',
      description: 'Get all subscription payments',
      category: 'Payment',
      icon: 'credit-card',
      api: {
        endpoint: '/2.0/subscription/payments',
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        }
      },
      inputSchema: {
        returnAll: {
          type: 'boolean',
          required: false,
          label: 'Return All',
          description: 'Whether to return all results or limit',
          default: false,
          aiControlled: false
        },
        limit: {
          type: 'number',
          required: false,
          label: 'Limit',
          description: 'Maximum number of results',
          default: 100,
          min: 1,
          max: 500,
          displayOptions: {
            show: {
              returnAll: [false]
            }
          },
          aiControlled: false
        },
        subscriptionId: {
          type: 'number',
          required: false,
          label: 'Subscription ID',
          placeholder: '123456',
          description: 'A specific user subscription ID',
          aiControlled: false
        },
        plan: {
          type: 'string',
          required: false,
          label: 'Plan ID',
          placeholder: '12345',
          description: 'Filter by product/plan ID (single or comma-separated)',
          aiControlled: false
        },
        state: {
          type: 'select',
          required: false,
          label: 'State',
          description: 'Filter by user subscription status',
          options: [
            { label: 'Active', value: 'active' },
            { label: 'Past Due', value: 'past_due' },
            { label: 'Paused', value: 'paused' },
            { label: 'Trialing', value: 'trialing' }
          ],
          aiControlled: false
        },
        isPaid: {
          type: 'boolean',
          required: false,
          label: 'Is Paid',
          description: 'Filter by paid status',
          default: false,
          aiControlled: false
        },
        from: {
          type: 'string',
          required: false,
          label: 'From Date',
          description: 'Payment starting from date (YYYY-MM-DD)',
          inputType: 'date',
          aiControlled: false
        },
        to: {
          type: 'string',
          required: false,
          label: 'To Date',
          description: 'Payment up until date (YYYY-MM-DD)',
          inputType: 'date',
          aiControlled: false
        },
        isOneOffCharge: {
          type: 'boolean',
          required: false,
          label: 'Is One-Off Charge',
          description: 'Filter one-off charges',
          default: false,
          aiControlled: false
        }
      },
      outputSchema: {
        payments: {
          type: 'array',
          description: 'List of payments'
        }
      }
    },
    {
      id: 'reschedule_payment',
      name: 'Reschedule Payment',
      description: 'Reschedule a subscription payment',
      category: 'Payment',
      icon: 'calendar',
      api: {
        endpoint: '/2.0/subscription/payments_reschedule',
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        }
      },
      inputSchema: {
        paymentId: {
          type: 'number',
          required: true,
          label: 'Payment ID',
          placeholder: '123456',
          description: 'The upcoming subscription payment ID',
          aiControlled: false
        },
        date: {
          type: 'string',
          required: true,
          label: 'Date',
          description: 'Date to move the payment to (YYYY-MM-DD)',
          inputType: 'date',
          aiControlled: false
        }
      },
      outputSchema: {
        success: {
          type: 'boolean',
          description: 'Whether reschedule was successful'
        }
      }
    },
    // Plan Actions
    {
      id: 'get_plan',
      name: 'Get Plan',
      description: 'Get a specific subscription plan',
      category: 'Plan',
      icon: 'package',
      api: {
        endpoint: '/2.0/subscription/plans',
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        }
      },
      inputSchema: {
        planId: {
          type: 'string',
          required: true,
          label: 'Plan ID',
          placeholder: '12345',
          description: 'The subscription plan ID',
          aiControlled: false
        }
      },
      outputSchema: {
        plan: {
          type: 'object',
          description: 'Plan details'
        }
      }
    },
    {
      id: 'get_plans',
      name: 'Get Plans',
      description: 'Get all subscription plans',
      category: 'Plan',
      icon: 'list',
      api: {
        endpoint: '/2.0/subscription/plans',
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        }
      },
      inputSchema: {
        returnAll: {
          type: 'boolean',
          required: false,
          label: 'Return All',
          description: 'Whether to return all results or limit',
          default: false,
          aiControlled: false
        },
        limit: {
          type: 'number',
          required: false,
          label: 'Limit',
          description: 'Maximum number of results',
          default: 100,
          min: 1,
          max: 500,
          displayOptions: {
            show: {
              returnAll: [false]
            }
          },
          aiControlled: false
        }
      },
      outputSchema: {
        plans: {
          type: 'array',
          description: 'List of plans'
        }
      }
    },
    // Product Actions
    {
      id: 'get_products',
      name: 'Get Products',
      description: 'Get all products',
      category: 'Product',
      icon: 'shopping-bag',
      api: {
        endpoint: '/2.0/product/get_products',
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        }
      },
      inputSchema: {
        returnAll: {
          type: 'boolean',
          required: false,
          label: 'Return All',
          description: 'Whether to return all results or limit',
          default: false,
          aiControlled: false
        },
        limit: {
          type: 'number',
          required: false,
          label: 'Limit',
          description: 'Maximum number of results',
          default: 100,
          min: 1,
          max: 500,
          displayOptions: {
            show: {
              returnAll: [false]
            }
          },
          aiControlled: false
        }
      },
      outputSchema: {
        products: {
          type: 'array',
          description: 'List of products'
        }
      }
    },
    // User (Subscription) Actions
    {
      id: 'get_users',
      name: 'Get Users',
      description: 'Get subscription users',
      category: 'User',
      icon: 'users',
      api: {
        endpoint: '/2.0/subscription/users',
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        }
      },
      inputSchema: {
        returnAll: {
          type: 'boolean',
          required: false,
          label: 'Return All',
          description: 'Whether to return all results or limit',
          default: false,
          aiControlled: false
        },
        limit: {
          type: 'number',
          required: false,
          label: 'Limit',
          description: 'Maximum number of results',
          default: 100,
          min: 1,
          max: 200,
          displayOptions: {
            show: {
              returnAll: [false]
            }
          },
          aiControlled: false
        },
        state: {
          type: 'select',
          required: false,
          label: 'State',
          description: 'Filter by subscription status',
          options: [
            { label: 'Active', value: 'active' },
            { label: 'Past Due', value: 'past_due' },
            { label: 'Paused', value: 'paused' },
            { label: 'Trialing', value: 'trialing' }
          ],
          aiControlled: false
        },
        planId: {
          type: 'string',
          required: false,
          label: 'Plan ID',
          placeholder: '12345',
          description: 'Filter by subscription plan ID',
          aiControlled: false
        },
        subscriptionId: {
          type: 'string',
          required: false,
          label: 'Subscription ID',
          placeholder: '123456',
          description: 'A specific user subscription ID',
          aiControlled: false
        }
      },
      outputSchema: {
        users: {
          type: 'array',
          description: 'List of subscription users'
        }
      }
    }
  ],

  // Triggers based on Paddle webhook events
  supported_triggers: [
    {
      id: 'subscription_created',
      name: 'Subscription Created',
      description: 'Triggers when a new subscription is created',
      eventType: 'subscription_created',
      webhookRequired: true,
      outputSchema: {
        subscription: {
          type: 'object',
          description: 'Subscription details',
          properties: {
            subscription_id: { type: 'string' },
            user_id: { type: 'string' },
            subscription_plan_id: { type: 'string' },
            status: { type: 'string' },
            signup_date: { type: 'string' }
          }
        }
      }
    },
    {
      id: 'subscription_updated',
      name: 'Subscription Updated',
      description: 'Triggers when a subscription is updated',
      eventType: 'subscription_updated',
      webhookRequired: true,
      outputSchema: {
        subscription: {
          type: 'object',
          description: 'Updated subscription details',
          properties: {
            subscription_id: { type: 'string' },
            user_id: { type: 'string' },
            status: { type: 'string' },
            update_date: { type: 'string' }
          }
        }
      }
    },
    {
      id: 'subscription_cancelled',
      name: 'Subscription Cancelled',
      description: 'Triggers when a subscription is cancelled',
      eventType: 'subscription_cancelled',
      webhookRequired: true,
      outputSchema: {
        subscription: {
          type: 'object',
          description: 'Cancelled subscription details',
          properties: {
            subscription_id: { type: 'string' },
            user_id: { type: 'string' },
            cancellation_date: { type: 'string' }
          }
        }
      }
    },
    {
      id: 'payment_succeeded',
      name: 'Payment Succeeded',
      description: 'Triggers when a payment is successful',
      eventType: 'payment_succeeded',
      webhookRequired: true,
      outputSchema: {
        payment: {
          type: 'object',
          description: 'Payment details',
          properties: {
            payment_id: { type: 'string' },
            subscription_id: { type: 'string' },
            amount: { type: 'number' },
            currency: { type: 'string' },
            date: { type: 'string' }
          }
        }
      }
    },
    {
      id: 'payment_failed',
      name: 'Payment Failed',
      description: 'Triggers when a payment fails',
      eventType: 'payment_failed',
      webhookRequired: true,
      outputSchema: {
        payment: {
          type: 'object',
          description: 'Failed payment details',
          properties: {
            payment_id: { type: 'string' },
            subscription_id: { type: 'string' },
            amount: { type: 'number' },
            currency: { type: 'string' },
            reason: { type: 'string' }
          }
        }
      }
    },
    {
      id: 'payment_refunded',
      name: 'Payment Refunded',
      description: 'Triggers when a payment is refunded',
      eventType: 'payment_refunded',
      webhookRequired: true,
      outputSchema: {
        refund: {
          type: 'object',
          description: 'Refund details',
          properties: {
            refund_id: { type: 'string' },
            payment_id: { type: 'string' },
            amount: { type: 'number' },
            currency: { type: 'string' },
            refund_date: { type: 'string' }
          }
        }
      }
    }
  ]
};
