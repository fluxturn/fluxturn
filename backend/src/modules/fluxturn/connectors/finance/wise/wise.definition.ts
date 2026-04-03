// Wise Connector Definition
// International money transfers and multi-currency account management

import { ConnectorCategory, AuthType } from '../../types';

export const WISE_CONNECTOR = {
  name: 'wise',
  display_name: 'Wise',
  category: ConnectorCategory.FINANCE,
  description: 'Send and receive international money transfers with multi-currency accounts',
  auth_type: AuthType.API_KEY,

  auth_fields: [
    {
      key: 'apiToken',
      label: 'API Token',
      type: 'password',
      required: true,
      placeholder: 'Enter your Wise API token',
      description: 'Get your API token from Wise settings',
      helpUrl: 'https://api-docs.wise.com/#authentication',
      helpText: 'How to get your API token',
    },
    {
      key: 'environment',
      label: 'Environment',
      type: 'select',
      required: true,
      default: 'live',
      options: [
        { label: 'Live', value: 'live' },
        { label: 'Test (Sandbox)', value: 'test' },
      ],
      description: 'Select the environment to connect to',
    },
    {
      key: 'privateKey',
      label: 'Private Key (Optional)',
      type: 'password',
      required: false,
      placeholder: '-----BEGIN RSA PRIVATE KEY-----\n...\n-----END RSA PRIVATE KEY-----',
      description: 'RSA private key for Strong Customer Authentication (SCA)',
      helpUrl: 'https://api-docs.wise.com/#strong-customer-authentication-personal-token',
      helpText: 'When is SCA required?',
    },
  ],

  endpoints: {
    live: 'https://api.transferwise.com',
    test: 'https://api.sandbox.transferwise.tech',
  },

  webhook_support: true,
  rate_limits: {
    requests_per_second: 10,
  },

  supported_actions: [
    // Account Actions
    {
      id: 'get_balances',
      name: 'Get Account Balances',
      description: 'Retrieve balances for all account currencies',
      category: 'Account',
      icon: 'wallet',
      api: {
        endpoint: '/v1/borderless-accounts',
        method: 'GET',
        baseUrl: '{environment}',
        headers: {
          'Authorization': 'Bearer {apiToken}',
          'Content-Type': 'application/json',
        },
      },
      inputSchema: {
        profileId: {
          type: 'string',
          required: true,
          label: 'Profile ID',
          description: 'ID of the user profile',
          aiControlled: false,
        },
      },
      outputSchema: {
        balances: {
          type: 'array',
          description: 'Account balances for all currencies',
        },
      },
    },
    {
      id: 'get_currencies',
      name: 'Get Available Currencies',
      description: 'Retrieve currencies available in the borderless account',
      category: 'Account',
      icon: 'coins',
      api: {
        endpoint: '/v1/borderless-accounts/balance-currencies',
        method: 'GET',
        baseUrl: '{environment}',
        headers: {
          'Authorization': 'Bearer {apiToken}',
          'Content-Type': 'application/json',
        },
      },
      inputSchema: {},
      outputSchema: {
        currencies: {
          type: 'array',
          description: 'List of available currencies',
        },
      },
    },
    {
      id: 'get_statement',
      name: 'Get Account Statement',
      description: 'Retrieve account statement for a borderless account',
      category: 'Account',
      icon: 'file-text',
      api: {
        endpoint: '/v3/profiles/{profileId}/borderless-accounts/{borderlessAccountId}/statement.{format}',
        method: 'GET',
        baseUrl: '{environment}',
        headers: {
          'Authorization': 'Bearer {apiToken}',
          'Content-Type': 'application/json',
        },
      },
      inputSchema: {
        profileId: {
          type: 'string',
          required: true,
          label: 'Profile ID',
          description: 'ID of the user profile',
          aiControlled: false,
        },
        borderlessAccountId: {
          type: 'string',
          required: true,
          label: 'Borderless Account ID',
          description: 'ID of the borderless account',
          aiControlled: false,
        },
        currency: {
          type: 'string',
          required: true,
          label: 'Currency',
          placeholder: 'USD',
          description: 'Currency code for the statement',
          aiControlled: false,
        },
        format: {
          type: 'select',
          required: true,
          label: 'Format',
          default: 'json',
          options: [
            { label: 'JSON', value: 'json' },
            { label: 'CSV', value: 'csv' },
            { label: 'PDF', value: 'pdf' },
            { label: 'XML (CAMT.053)', value: 'xml' },
          ],
          description: 'File format for the statement',
          aiControlled: false,
        },
        intervalStart: {
          type: 'string',
          required: false,
          label: 'Interval Start',
          inputType: 'datetime',
          description: 'Start date for the statement (ISO 8601)',
          aiControlled: false,
        },
        intervalEnd: {
          type: 'string',
          required: false,
          label: 'Interval End',
          inputType: 'datetime',
          description: 'End date for the statement (ISO 8601)',
          aiControlled: false,
        },
        lineStyle: {
          type: 'select',
          required: false,
          label: 'Line Style',
          default: 'COMPACT',
          options: [
            { label: 'Compact', value: 'COMPACT' },
            { label: 'Flat', value: 'FLAT' },
          ],
          description: 'Statement line style',
          aiControlled: false,
        },
      },
      outputSchema: {
        statement: {
          type: 'object',
          description: 'Account statement data',
        },
      },
    },

    // Exchange Rate Actions
    {
      id: 'get_exchange_rate',
      name: 'Get Exchange Rate',
      description: 'Retrieve exchange rates between currencies',
      category: 'Exchange Rate',
      icon: 'trending-up',
      api: {
        endpoint: '/v1/rates',
        method: 'GET',
        baseUrl: '{environment}',
        headers: {
          'Authorization': 'Bearer {apiToken}',
          'Content-Type': 'application/json',
        },
      },
      inputSchema: {
        source: {
          type: 'string',
          required: true,
          label: 'Source Currency',
          placeholder: 'USD',
          description: 'Source currency code',
          aiControlled: false,
        },
        target: {
          type: 'string',
          required: true,
          label: 'Target Currency',
          placeholder: 'EUR',
          description: 'Target currency code',
          aiControlled: false,
        },
        time: {
          type: 'string',
          required: false,
          label: 'Time',
          inputType: 'datetime',
          description: 'Point in time to retrieve the exchange rate',
          aiControlled: false,
        },
        from: {
          type: 'string',
          required: false,
          label: 'From Date',
          inputType: 'datetime',
          description: 'Start of date range',
          aiControlled: false,
        },
        to: {
          type: 'string',
          required: false,
          label: 'To Date',
          inputType: 'datetime',
          description: 'End of date range',
          aiControlled: false,
        },
        interval: {
          type: 'select',
          required: false,
          label: 'Interval',
          default: 'day',
          options: [
            { label: 'Day', value: 'day' },
            { label: 'Hour', value: 'hour' },
            { label: 'Minute', value: 'minute' },
          ],
          description: 'Time interval for grouping rates',
          aiControlled: false,
        },
      },
      outputSchema: {
        rates: {
          type: 'array',
          description: 'Exchange rate data',
        },
      },
    },

    // Profile Actions
    {
      id: 'get_profile',
      name: 'Get Profile',
      description: 'Retrieve a user profile by ID',
      category: 'Profile',
      icon: 'user',
      api: {
        endpoint: '/v1/profiles/{profileId}',
        method: 'GET',
        baseUrl: '{environment}',
        headers: {
          'Authorization': 'Bearer {apiToken}',
          'Content-Type': 'application/json',
        },
      },
      inputSchema: {
        profileId: {
          type: 'string',
          required: true,
          label: 'Profile ID',
          description: 'ID of the user profile',
          aiControlled: false,
        },
      },
      outputSchema: {
        profile: {
          type: 'object',
          description: 'User profile information',
        },
      },
    },
    {
      id: 'get_all_profiles',
      name: 'Get All Profiles',
      description: 'Retrieve all user profiles',
      category: 'Profile',
      icon: 'users',
      api: {
        endpoint: '/v1/profiles',
        method: 'GET',
        baseUrl: '{environment}',
        headers: {
          'Authorization': 'Bearer {apiToken}',
          'Content-Type': 'application/json',
        },
      },
      inputSchema: {},
      outputSchema: {
        profiles: {
          type: 'array',
          description: 'List of user profiles',
        },
      },
    },

    // Quote Actions
    {
      id: 'create_quote',
      name: 'Create Quote',
      description: 'Create a quote for a money transfer',
      category: 'Quote',
      icon: 'file-plus',
      api: {
        endpoint: '/v2/quotes',
        method: 'POST',
        baseUrl: '{environment}',
        headers: {
          'Authorization': 'Bearer {apiToken}',
          'Content-Type': 'application/json',
        },
      },
      inputSchema: {
        profileId: {
          type: 'string',
          required: true,
          label: 'Profile ID',
          description: 'ID of the user profile',
          aiControlled: false,
        },
        sourceCurrency: {
          type: 'string',
          required: true,
          label: 'Source Currency',
          placeholder: 'USD',
          description: 'Currency to send',
          aiControlled: false,
        },
        targetCurrency: {
          type: 'string',
          required: true,
          label: 'Target Currency',
          placeholder: 'EUR',
          description: 'Currency to receive',
          aiControlled: false,
        },
        amountType: {
          type: 'select',
          required: true,
          label: 'Amount Type',
          default: 'source',
          options: [
            { label: 'Source (you send)', value: 'source' },
            { label: 'Target (they receive)', value: 'target' },
          ],
          description: 'Whether the amount is to be sent or received',
          aiControlled: false,
        },
        amount: {
          type: 'number',
          required: true,
          label: 'Amount',
          min: 0,
          description: 'Amount of funds for the quote',
          aiControlled: false,
        },
      },
      outputSchema: {
        quote: {
          type: 'object',
          description: 'Quote details including fees and rate',
        },
      },
    },
    {
      id: 'get_quote',
      name: 'Get Quote',
      description: 'Retrieve a quote by ID',
      category: 'Quote',
      icon: 'file-text',
      api: {
        endpoint: '/v2/quotes/{quoteId}',
        method: 'GET',
        baseUrl: '{environment}',
        headers: {
          'Authorization': 'Bearer {apiToken}',
          'Content-Type': 'application/json',
        },
      },
      inputSchema: {
        quoteId: {
          type: 'string',
          required: true,
          label: 'Quote ID',
          description: 'ID of the quote to retrieve',
          aiControlled: false,
        },
      },
      outputSchema: {
        quote: {
          type: 'object',
          description: 'Quote details',
        },
      },
    },

    // Recipient Actions
    {
      id: 'get_all_recipients',
      name: 'Get All Recipients',
      description: 'Retrieve all recipient accounts',
      category: 'Recipient',
      icon: 'users',
      api: {
        endpoint: '/v1/accounts',
        method: 'GET',
        baseUrl: '{environment}',
        headers: {
          'Authorization': 'Bearer {apiToken}',
          'Content-Type': 'application/json',
        },
      },
      inputSchema: {
        profileId: {
          type: 'string',
          required: false,
          label: 'Profile ID',
          description: 'Filter by profile ID',
          aiControlled: false,
        },
        limit: {
          type: 'number',
          required: false,
          label: 'Limit',
          default: 100,
          min: 1,
          max: 1000,
          description: 'Maximum number of recipients to return',
          aiControlled: false,
        },
      },
      outputSchema: {
        recipients: {
          type: 'array',
          description: 'List of recipient accounts',
        },
      },
    },

    // Transfer Actions
    {
      id: 'create_transfer',
      name: 'Create Transfer',
      description: 'Create a new money transfer',
      category: 'Transfer',
      icon: 'send',
      api: {
        endpoint: '/v1/transfers',
        method: 'POST',
        baseUrl: '{environment}',
        headers: {
          'Authorization': 'Bearer {apiToken}',
          'Content-Type': 'application/json',
        },
      },
      inputSchema: {
        quoteId: {
          type: 'string',
          required: true,
          label: 'Quote ID',
          description: 'ID of the quote for this transfer',
          aiControlled: false,
        },
        targetAccountId: {
          type: 'string',
          required: true,
          label: 'Target Account ID',
          description: 'ID of the recipient account',
          aiControlled: false,
        },
        reference: {
          type: 'string',
          required: false,
          label: 'Reference',
          maxLength: 140,
          description: 'Reference text for the recipient',
          aiControlled: false,
        },
      },
      outputSchema: {
        transfer: {
          type: 'object',
          description: 'Transfer details',
        },
      },
    },
    {
      id: 'get_transfer',
      name: 'Get Transfer',
      description: 'Retrieve a transfer by ID',
      category: 'Transfer',
      icon: 'file-text',
      api: {
        endpoint: '/v1/transfers/{transferId}',
        method: 'GET',
        baseUrl: '{environment}',
        headers: {
          'Authorization': 'Bearer {apiToken}',
          'Content-Type': 'application/json',
        },
      },
      inputSchema: {
        transferId: {
          type: 'string',
          required: true,
          label: 'Transfer ID',
          description: 'ID of the transfer to retrieve',
          aiControlled: false,
        },
      },
      outputSchema: {
        transfer: {
          type: 'object',
          description: 'Transfer details',
        },
      },
    },
    {
      id: 'get_all_transfers',
      name: 'Get All Transfers',
      description: 'Retrieve all transfers for a profile',
      category: 'Transfer',
      icon: 'list',
      api: {
        endpoint: '/v1/transfers',
        method: 'GET',
        baseUrl: '{environment}',
        headers: {
          'Authorization': 'Bearer {apiToken}',
          'Content-Type': 'application/json',
        },
      },
      inputSchema: {
        profileId: {
          type: 'string',
          required: true,
          label: 'Profile ID',
          description: 'ID of the user profile',
          aiControlled: false,
        },
        limit: {
          type: 'number',
          required: false,
          label: 'Limit',
          default: 100,
          min: 1,
          max: 1000,
          description: 'Maximum number of transfers to return',
          aiControlled: false,
        },
        offset: {
          type: 'number',
          required: false,
          label: 'Offset',
          default: 0,
          min: 0,
          description: 'Number of transfers to skip',
          aiControlled: false,
        },
        status: {
          type: 'select',
          required: false,
          label: 'Status',
          options: [
            { label: 'Processing', value: 'processing' },
            { label: 'Funds Converted', value: 'funds_converted' },
            { label: 'Outgoing Payment Sent', value: 'outgoing_payment_sent' },
            { label: 'Cancelled', value: 'cancelled' },
            { label: 'Funds Refunded', value: 'funds_refunded' },
            { label: 'Bounced Back', value: 'bounced_back' },
            { label: 'Charged Back', value: 'charged_back' },
          ],
          description: 'Filter by transfer status',
          aiControlled: false,
        },
        sourceCurrency: {
          type: 'string',
          required: false,
          label: 'Source Currency',
          placeholder: 'USD',
          description: 'Filter by source currency',
          aiControlled: false,
        },
        targetCurrency: {
          type: 'string',
          required: false,
          label: 'Target Currency',
          placeholder: 'EUR',
          description: 'Filter by target currency',
          aiControlled: false,
        },
        createdDateStart: {
          type: 'string',
          required: false,
          label: 'Created Date Start',
          inputType: 'datetime',
          description: 'Filter by creation date start',
          aiControlled: false,
        },
        createdDateEnd: {
          type: 'string',
          required: false,
          label: 'Created Date End',
          inputType: 'datetime',
          description: 'Filter by creation date end',
          aiControlled: false,
        },
      },
      outputSchema: {
        transfers: {
          type: 'array',
          description: 'List of transfers',
        },
      },
    },
    {
      id: 'execute_transfer',
      name: 'Execute Transfer',
      description: 'Execute a transfer to send funds',
      category: 'Transfer',
      icon: 'check-circle',
      api: {
        endpoint: '/v3/profiles/{profileId}/transfers/{transferId}/payments',
        method: 'POST',
        baseUrl: '{environment}',
        headers: {
          'Authorization': 'Bearer {apiToken}',
          'Content-Type': 'application/json',
        },
      },
      inputSchema: {
        profileId: {
          type: 'string',
          required: true,
          label: 'Profile ID',
          description: 'ID of the user profile',
          aiControlled: false,
        },
        transferId: {
          type: 'string',
          required: true,
          label: 'Transfer ID',
          description: 'ID of the transfer to execute',
          aiControlled: false,
        },
      },
      outputSchema: {
        payment: {
          type: 'object',
          description: 'Payment execution details',
        },
      },
    },
    {
      id: 'cancel_transfer',
      name: 'Cancel Transfer',
      description: 'Cancel a pending transfer',
      category: 'Transfer',
      icon: 'x-circle',
      api: {
        endpoint: '/v1/transfers/{transferId}/cancel',
        method: 'PUT',
        baseUrl: '{environment}',
        headers: {
          'Authorization': 'Bearer {apiToken}',
          'Content-Type': 'application/json',
        },
      },
      inputSchema: {
        transferId: {
          type: 'string',
          required: true,
          label: 'Transfer ID',
          description: 'ID of the transfer to cancel',
          aiControlled: false,
        },
      },
      outputSchema: {
        transfer: {
          type: 'object',
          description: 'Cancelled transfer details',
        },
      },
    },
  ],

  supported_triggers: [
    {
      id: 'transfer_state_change',
      name: 'Transfer State Changed',
      description: 'Triggers when a transfer status is updated',
      eventType: 'tranferStateChange',
      icon: 'refresh-cw',
      webhookRequired: true,
      inputSchema: {
        profileId: {
          type: 'string',
          required: true,
          label: 'Profile ID',
          description: 'ID of the Wise profile to monitor',
          aiControlled: false,
        },
        event: {
          type: 'select',
          required: true,
          label: 'Event Type',
          default: 'tranferStateChange',
          options: [
            { label: 'Transfer State Changed', value: 'tranferStateChange' },
            { label: 'Transfer Active Cases', value: 'transferActiveCases' },
            { label: 'Balance Credit', value: 'balanceCredit' },
            { label: 'Balance Update', value: 'balanceUpdate' },
          ],
          description: 'Type of event to trigger on',
          aiControlled: false,
        },
      },
      outputSchema: {
        wiseEvent: {
          type: 'object',
          description: 'Wise webhook event data',
          properties: {
            eventType: { type: 'string', description: 'Event type (e.g., transfers#state-change)' },
            subscriptionId: { type: 'string', description: 'Webhook subscription ID' },
            sentAt: { type: 'string', description: 'When the event was sent' },
            transfer: {
              type: 'object',
              description: 'Transfer details (for transfer events)',
              properties: {
                id: { type: 'number', description: 'Transfer ID' },
                currentState: { type: 'string', description: 'Current transfer state' },
                previousState: { type: 'string', description: 'Previous transfer state' },
                profileId: { type: 'number', description: 'Profile ID' },
                occurredAt: { type: 'string', description: 'When the event occurred' },
              },
            },
            balance: {
              type: 'object',
              description: 'Balance details (for balance events)',
              properties: {
                id: { type: 'number', description: 'Balance ID' },
                accountId: { type: 'number', description: 'Account ID' },
                profileId: { type: 'number', description: 'Profile ID' },
                occurredAt: { type: 'string', description: 'When the event occurred' },
              },
            },
          },
        },
      },
    },
    {
      id: 'transfer_active_cases',
      name: 'Transfer Active Cases',
      description: 'Triggers when a transfer\'s list of active cases is updated',
      eventType: 'transferActiveCases',
      icon: 'alert-circle',
      webhookRequired: true,
      inputSchema: {
        profileId: {
          type: 'string',
          required: true,
          label: 'Profile ID',
          description: 'ID of the Wise profile to monitor',
          aiControlled: false,
        },
        event: {
          type: 'select',
          required: true,
          label: 'Event Type',
          default: 'transferActiveCases',
          options: [
            { label: 'Transfer State Changed', value: 'tranferStateChange' },
            { label: 'Transfer Active Cases', value: 'transferActiveCases' },
            { label: 'Balance Credit', value: 'balanceCredit' },
            { label: 'Balance Update', value: 'balanceUpdate' },
          ],
          description: 'Type of event to trigger on',
          aiControlled: false,
        },
      },
      outputSchema: {
        wiseEvent: {
          type: 'object',
          description: 'Wise webhook event data',
        },
      },
    },
    {
      id: 'balance_credit',
      name: 'Balance Credit',
      description: 'Triggers every time a balance account is credited',
      eventType: 'balanceCredit',
      icon: 'trending-up',
      webhookRequired: true,
      inputSchema: {
        profileId: {
          type: 'string',
          required: true,
          label: 'Profile ID',
          description: 'ID of the Wise profile to monitor',
          aiControlled: false,
        },
        event: {
          type: 'select',
          required: true,
          label: 'Event Type',
          default: 'balanceCredit',
          options: [
            { label: 'Transfer State Changed', value: 'tranferStateChange' },
            { label: 'Transfer Active Cases', value: 'transferActiveCases' },
            { label: 'Balance Credit', value: 'balanceCredit' },
            { label: 'Balance Update', value: 'balanceUpdate' },
          ],
          description: 'Type of event to trigger on',
          aiControlled: false,
        },
      },
      outputSchema: {
        wiseEvent: {
          type: 'object',
          description: 'Wise webhook event data',
        },
      },
    },
    {
      id: 'balance_update',
      name: 'Balance Update',
      description: 'Triggers every time a balance account is credited or debited',
      eventType: 'balanceUpdate',
      icon: 'activity',
      webhookRequired: true,
      inputSchema: {
        profileId: {
          type: 'string',
          required: true,
          label: 'Profile ID',
          description: 'ID of the Wise profile to monitor',
          aiControlled: false,
        },
        event: {
          type: 'select',
          required: true,
          label: 'Event Type',
          default: 'balanceUpdate',
          options: [
            { label: 'Transfer State Changed', value: 'tranferStateChange' },
            { label: 'Transfer Active Cases', value: 'transferActiveCases' },
            { label: 'Balance Credit', value: 'balanceCredit' },
            { label: 'Balance Update', value: 'balanceUpdate' },
          ],
          description: 'Type of event to trigger on',
          aiControlled: false,
        },
      },
      outputSchema: {
        wiseEvent: {
          type: 'object',
          description: 'Wise webhook event data',
        },
      },
    },
  ],
};
