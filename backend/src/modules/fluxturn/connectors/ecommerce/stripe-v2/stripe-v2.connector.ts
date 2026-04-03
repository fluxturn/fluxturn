import { BaseConnector } from '../../base/base.connector';
import { Injectable } from '@nestjs/common';
import Stripe from 'stripe';
import {
  ConnectorMetadata,
  ConnectorResponse,
  ConnectorCategory,
  ConnectorType,
  AuthType,
  ConnectorAction,
  ConnectorTrigger,
  ConnectorConfig,
  ConnectorRequest,
  PaginatedRequest,
  WebhookEvent
} from '../../types';
import { createStripeClient, STRIPE_API_VERSION } from '../../config/stripe.config';

@Injectable()
export class StripeV2Connector extends BaseConnector {
  private stripeClient: Stripe;

  getMetadata(): ConnectorMetadata {
    return {
      name: 'stripe',
      description: 'Payment processing, customer management, and subscription handling',
      version: '1.0.0',
      category: ConnectorCategory.ECOMMERCE,
      type: ConnectorType.STRIPE,
      logoUrl: '/assets/connectors/stripe.svg',
      documentationUrl: 'https://stripe.com/docs/api',
      authType: AuthType.API_KEY,
      actions: this.getActions(),
      triggers: this.getTriggers(),
      webhookSupport: true,
      rateLimit: {
        requestsPerSecond: 100
      }
    };
  }

  protected async initializeConnection(): Promise<void> {
    const apiKey = this.config.credentials?.secretKey || this.config.credentials?.apiKey;

    if (!apiKey) {
      throw new Error('Stripe API key (secretKey) is required');
    }

    this.stripeClient = createStripeClient(apiKey);

    this.logger.log('Stripe connector initialized successfully');
  }

  protected async performConnectionTest(): Promise<boolean> {
    try {
      // Test the connection by retrieving account details
      const account = await this.stripeClient.accounts.retrieve();
      this.logger.log(`Connected to Stripe account: ${account.id}`);
      return true;
    } catch (error) {
      this.logger.error('Stripe connection test failed:', error);
      return false;
    }
  }

  protected async performHealthCheck(): Promise<void> {
    if (!this.stripeClient) {
      throw new Error('Stripe client not initialized');
    }
  }

  protected async performRequest(request: ConnectorRequest): Promise<any> {
    // Generic request handler for custom API calls
    const url = `https://api.stripe.com${request.endpoint}`;
    const headers = {
      'Authorization': `Bearer ${this.config.credentials.secretKey || this.config.credentials.apiKey}`,
      'Content-Type': 'application/x-www-form-urlencoded',
      ...request.headers
    };

    const response = await fetch(url, {
      method: request.method,
      headers,
      body: request.body ? new URLSearchParams(request.body).toString() : undefined
    });

    if (!response.ok) {
      throw new Error(`Stripe API error: ${response.statusText}`);
    }

    return response.json();
  }

  protected async performAction(actionId: string, input: any): Promise<any> {
    switch (actionId) {
      // Customer actions
      case 'customer_create':
        return await this.createCustomer(input);
      case 'customer_get':
        return await this.getCustomer(input.customerId);
      case 'customer_getAll':
        return await this.listCustomers(input);
      case 'customer_update':
        return await this.updateCustomer(input.customerId, input);
      case 'customer_delete':
        return await this.deleteCustomer(input.customerId);

      // Charge actions
      case 'charge_create':
        return await this.createCharge(input);
      case 'charge_get':
        return await this.getCharge(input.chargeId);
      case 'charge_getAll':
        return await this.listCharges(input);
      case 'charge_update':
        return await this.updateCharge(input.chargeId, input);

      // Card actions
      case 'card_add':
        return await this.addCard(input.customerId, input.token);
      case 'card_get':
        return await this.getCard(input.customerId, input.cardId);
      case 'card_remove':
        return await this.removeCard(input.customerId, input.cardId);

      // Token actions
      case 'token_create':
        return await this.createToken(input);

      // Balance action
      case 'balance_get':
        return await this.getBalance();

      default:
        throw new Error(`Unknown action: ${actionId}`);
    }
  }

  protected async cleanup(): Promise<void> {
    this.logger.log('Stripe connector cleanup completed');
  }

  // Webhook Methods
  async setupWebhook(events: string[]): Promise<ConnectorResponse<string>> {
    try {
      if (!this.stripeClient) {
        throw new Error('Stripe client not initialized');
      }

      // Get the webhook URL from the configuration
      // Format: https://your-domain.com/api/v1/connectors/webhook/stripe
      const webhookUrl = this.config.webhookConfig?.url;

      if (!webhookUrl) {
        throw new Error('Webhook URL not configured');
      }

      this.logger.log(`Setting up Stripe webhook at ${webhookUrl} for events: ${events.join(', ')}`);

      // Create webhook endpoint in Stripe
      const webhook = await this.stripeClient.webhookEndpoints.create({
        url: webhookUrl,
        enabled_events: events as Stripe.WebhookEndpointCreateParams.EnabledEvent[],
        description: `Fluxturn Webhook - ${this.config.name}`,
        api_version: STRIPE_API_VERSION
      });

      this.logger.log(`Stripe webhook created with ID: ${webhook.id}`);

      // Store webhook ID and secret for later verification
      return {
        success: true,
        data: webhook.id,
        metadata: {
          webhookId: webhook.id,
          webhookSecret: webhook.secret,
          events: webhook.enabled_events
        }
      };
    } catch (error) {
      this.logger.error('Failed to setup Stripe webhook:', error);
      return {
        success: false,
        error: {
          code: 'WEBHOOK_SETUP_FAILED',
          message: error.message,
          details: error
        }
      };
    }
  }

  async processWebhook(payload: any, headers: Record<string, string>): Promise<WebhookEvent[]> {
    try {
      // Get the Stripe signature from headers
      const signature = headers['stripe-signature'];

      if (!signature) {
        throw new Error('Missing Stripe signature header');
      }

      // Get the webhook secret from config metadata
      const webhookSecret = this.config.webhookConfig?.secret;

      if (!webhookSecret) {
        throw new Error('Webhook secret not configured');
      }

      this.logger.log('Processing Stripe webhook event');

      // Verify the webhook signature
      let event: Stripe.Event;
      try {
        // Stripe expects the raw body as a string or Buffer
        const rawBody = typeof payload === 'string' ? payload : JSON.stringify(payload);
        event = this.stripeClient.webhooks.constructEvent(
          rawBody,
          signature,
          webhookSecret
        );
      } catch (err) {
        this.logger.error('Webhook signature verification failed:', err);
        throw new Error(`Webhook signature verification failed: ${err.message}`);
      }

      this.logger.log(`Verified Stripe event: ${event.type} (${event.id})`);

      // Process the event and return it in the expected format
      return [{
        id: event.id,
        eventType: event.type,
        timestamp: new Date(event.created * 1000),
        data: event.data.object,
        connectorId: this.config.id,
        projectId: this.config.settings?.projectId || ''
      }];
    } catch (error) {
      this.logger.error('Failed to process Stripe webhook:', error);
      throw error;
    }
  }

  // Customer Methods
  private async createCustomer(data: any): Promise<any> {
    const customerData: any = {
      name: data.name
    };

    // Add optional fields
    if (data.email) customerData.email = data.email;
    if (data.phone) customerData.phone = data.phone;
    if (data.description) customerData.description = data.description;
    if (data.address) customerData.address = data.address;

    const customer = await this.stripeClient.customers.create(customerData);
    return customer;
  }

  private async getCustomer(customerId: string): Promise<any> {
    return await this.stripeClient.customers.retrieve(customerId);
  }

  private async listCustomers(params: any = {}): Promise<any> {
    return await this.stripeClient.customers.list({
      limit: params.limit || 10,
      email: params.email
    });
  }

  private async updateCustomer(customerId: string, data: any): Promise<any> {
    const updateData: any = {};
    if (data.name) updateData.name = data.name;
    if (data.email) updateData.email = data.email;
    if (data.phone) updateData.phone = data.phone;
    if (data.description) updateData.description = data.description;

    return await this.stripeClient.customers.update(customerId, updateData);
  }

  private async deleteCustomer(customerId: string): Promise<any> {
    return await this.stripeClient.customers.del(customerId);
  }

  // Charge Methods
  private async createCharge(data: any): Promise<any> {
    const chargeData: any = {
      amount: data.amount,
      currency: data.currency
    };

    // Add customer or source (at least one is required)
    if (data.customer) chargeData.customer = data.customer;
    if (data.source) chargeData.source = data.source;
    if (data.description) chargeData.description = data.description;
    if (data.receiptEmail) chargeData.receipt_email = data.receiptEmail;

    return await this.stripeClient.charges.create(chargeData);
  }

  private async getCharge(chargeId: string): Promise<any> {
    return await this.stripeClient.charges.retrieve(chargeId);
  }

  private async listCharges(params: any = {}): Promise<any> {
    const listParams: any = {
      limit: params.limit || 10
    };
    if (params.customer) listParams.customer = params.customer;

    return await this.stripeClient.charges.list(listParams);
  }

  private async updateCharge(chargeId: string, data: any): Promise<any> {
    const updateData: any = {};
    if (data.description) updateData.description = data.description;
    if (data.receiptEmail) updateData.receipt_email = data.receiptEmail;

    return await this.stripeClient.charges.update(chargeId, updateData);
  }

  // Card Methods
  private async addCard(customerId: string, token: string): Promise<any> {
    return await this.stripeClient.customers.createSource(customerId, {
      source: token
    });
  }

  private async getCard(customerId: string, cardId: string): Promise<any> {
    return await this.stripeClient.customers.retrieveSource(customerId, cardId);
  }

  private async removeCard(customerId: string, cardId: string): Promise<any> {
    return await this.stripeClient.customers.deleteSource(customerId, cardId);
  }

  // Token Methods
  private async createToken(data: any): Promise<any> {
    return await this.stripeClient.tokens.create({
      card: {
        number: data.cardNumber,
        exp_month: data.expMonth,
        exp_year: data.expYear,
        cvc: data.cvc
      }
    });
  }

  // Balance Method
  private async getBalance(): Promise<any> {
    return await this.stripeClient.balance.retrieve();
  }

  // Action Definitions with proper schemas
  private getActions(): ConnectorAction[] {
    return [
      {
        id: 'customer_create',
        name: 'Create Customer',
        description: 'Create a new Stripe customer',
        inputSchema: {
          name: {
            type: 'string',
            required: true,
            description: 'Full name or business name of the customer'
          },
          email: {
            type: 'string',
            required: false,
            description: 'Customer email address'
          },
          phone: {
            type: 'string',
            required: false,
            description: 'Customer phone number'
          },
          description: {
            type: 'string',
            required: false,
            description: 'Arbitrary text to describe the customer'
          },
          address: {
            type: 'object',
            required: false,
            description: 'Customer address'
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
        inputSchema: {
          customerId: {
            type: 'string',
            required: true,
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
        inputSchema: {
          limit: {
            type: 'number',
            required: false,
            description: 'Number of customers to return (1-100)',
            validation: { min: 1, max: 100 }
          },
          email: {
            type: 'string',
            required: false,
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
        inputSchema: {
          customerId: {
            type: 'string',
            required: true,
            description: 'The ID of the customer to update'
          },
          name: {
            type: 'string',
            required: false,
            description: 'Customer full name'
          },
          email: {
            type: 'string',
            required: false,
            description: 'Customer email address'
          },
          phone: {
            type: 'string',
            required: false,
            description: 'Customer phone number'
          },
          description: {
            type: 'string',
            required: false,
            description: 'Customer description'
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
        inputSchema: {
          customerId: {
            type: 'string',
            required: true,
            description: 'The ID of the customer to delete'
          }
        },
        outputSchema: {
          id: { type: 'string', description: 'Deleted customer ID' },
          deleted: { type: 'boolean', description: 'Deletion status' }
        }
      },
      {
        id: 'charge_create',
        name: 'Create Charge',
        description: 'Create a new payment charge',
        inputSchema: {
          amount: {
            type: 'number',
            required: true,
            description: 'Amount in cents (minimum 50 cents)',
            validation: { min: 50 }
          },
          currency: {
            type: 'string',
            required: true,
            enum: ['usd', 'eur', 'gbp', 'cad', 'aud', 'jpy'],
            description: 'Three-letter ISO currency code'
          },
          customer: {
            type: 'string',
            required: false,
            description: 'Customer ID (required if no source)'
          },
          source: {
            type: 'string',
            required: false,
            description: 'Payment source ID (token or card)'
          },
          description: {
            type: 'string',
            required: false,
            description: 'Charge description'
          },
          receiptEmail: {
            type: 'string',
            required: false,
            description: 'Email address to send receipt to'
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
        inputSchema: {
          chargeId: {
            type: 'string',
            required: true,
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
        inputSchema: {
          limit: {
            type: 'number',
            required: false,
            description: 'Number of charges to return (1-100)',
            validation: { min: 1, max: 100 }
          },
          customer: {
            type: 'string',
            required: false,
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
        inputSchema: {
          chargeId: {
            type: 'string',
            required: true,
            description: 'The ID of the charge to update'
          },
          description: {
            type: 'string',
            required: false,
            description: 'Charge description'
          },
          receiptEmail: {
            type: 'string',
            required: false,
            description: 'Email address to send receipt to'
          }
        },
        outputSchema: {
          id: { type: 'string', description: 'Charge ID' },
          description: { type: 'string', description: 'Updated description' }
        }
      },
      {
        id: 'card_add',
        name: 'Add Card to Customer',
        description: 'Add a payment card to a customer',
        inputSchema: {
          customerId: {
            type: 'string',
            required: true,
            description: 'The customer to add the card to'
          },
          token: {
            type: 'string',
            required: true,
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
        inputSchema: {
          customerId: {
            type: 'string',
            required: true,
            description: 'The customer ID'
          },
          cardId: {
            type: 'string',
            required: true,
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
        inputSchema: {
          customerId: {
            type: 'string',
            required: true,
            description: 'The customer ID'
          },
          cardId: {
            type: 'string',
            required: true,
            description: 'The card ID to remove'
          }
        },
        outputSchema: {
          id: { type: 'string', description: 'Removed card ID' },
          deleted: { type: 'boolean', description: 'Deletion status' }
        }
      },
      {
        id: 'token_create',
        name: 'Create Token',
        description: 'Create a card token for secure payment processing',
        inputSchema: {
          cardNumber: {
            type: 'string',
            required: true,
            description: 'Card number without spaces or dashes'
          },
          expMonth: {
            type: 'number',
            required: true,
            description: 'Two-digit expiration month (1-12)',
            validation: { min: 1, max: 12 }
          },
          expYear: {
            type: 'number',
            required: true,
            description: 'Four-digit expiration year'
          },
          cvc: {
            type: 'string',
            required: true,
            description: 'Card security code'
          }
        },
        outputSchema: {
          id: { type: 'string', description: 'Token ID' },
          card: {
            type: 'object',
            description: 'Card details'
          }
        }
      },
      {
        id: 'balance_get',
        name: 'Get Balance',
        description: 'Retrieve your Stripe account balance',
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
    ];
  }

  // Trigger Definitions
  private getTriggers(): ConnectorTrigger[] {
    return [
      {
        id: 'charge_succeeded',
        name: 'Charge Succeeded',
        description: 'Triggers when a charge succeeds',
        eventType: 'charge.succeeded',
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
        description: 'Triggers when a customer is created',
        eventType: 'customer.created',
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
    ];
  }
}
