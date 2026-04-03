// Plaid Connector Definition
// Comprehensive financial data API for banking, transactions, and identity verification

import { ConnectorDefinition } from '../../shared';

export const PLAID_CONNECTOR: ConnectorDefinition = {
  name: 'plaid',
  display_name: 'Plaid',
  category: 'finance',
  description: 'Connect to bank accounts and retrieve financial data including transactions, balances, identity, and account verification.',
  auth_type: 'api_key',
  verified: false,

  // Authentication fields for Plaid
  auth_fields: [
    {
      key: 'client_id',
      label: 'Client ID',
      type: 'string',
      required: true,
      placeholder: 'Enter your Plaid Client ID',
      description: 'Your Plaid Client ID from the dashboard',
      helpUrl: 'https://dashboard.plaid.com/developers/keys',
      helpText: 'Find your keys in Plaid Dashboard'
    },
    {
      key: 'secret',
      label: 'Secret',
      type: 'password',
      required: true,
      placeholder: 'Enter your Plaid Secret',
      description: 'Your Plaid Secret key for the selected environment'
    },
    {
      key: 'environment',
      label: 'Environment',
      type: 'select',
      required: true,
      default: 'sandbox',
      options: [
        { label: 'Sandbox (Testing)', value: 'sandbox' },
        { label: 'Development', value: 'development' },
        { label: 'Production', value: 'production' }
      ],
      description: 'Plaid environment to connect to'
    }
  ],

  endpoints: {
    base_url: 'https://sandbox.plaid.com',
    sandbox_url: 'https://sandbox.plaid.com',
    development_url: 'https://development.plaid.com',
    production_url: 'https://production.plaid.com',
    accounts: '/accounts/get',
    balance: '/accounts/balance/get',
    auth: '/auth/get',
    identity: '/identity/get',
    transactions_get: '/transactions/get',
    transactions_sync: '/transactions/sync',
    transactions_refresh: '/transactions/refresh',
    transactions_recurring: '/transactions/recurring/get',
    item_get: '/item/get',
    item_remove: '/item/remove',
    link_token_create: '/link/token/create',
    token_exchange: '/item/public_token/exchange',
    institutions_get: '/institutions/get',
    institutions_get_by_id: '/institutions/get_by_id',
    categories_get: '/categories/get',
    webhooks_update: '/item/webhook/update'
  },

  webhook_support: true,
  sandbox_available: true,

  rate_limits: {
    requests_per_minute: 60,
    requests_per_second: 5
  },

  // ============= SUPPORTED ACTIONS =============
  supported_actions: [
    // ===== Accounts =====
    {
      id: 'get_accounts',
      name: 'Get Accounts',
      description: 'Retrieve all bank accounts linked to an Item',
      category: 'Accounts',
      icon: 'bank',
      verified: false,
      api: {
        endpoint: '/accounts/get',
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      },
      inputSchema: {
        access_token: {
          type: 'string',
          required: true,
          label: 'Access Token',
          placeholder: 'access-sandbox-...',
          description: 'The access token for the Item',
          aiControlled: false
        },
        account_ids: {
          type: 'array',
          required: false,
          label: 'Account IDs',
          description: 'Optional array of account IDs to filter results',
          aiControlled: false
        }
      },
      outputSchema: {
        accounts: { type: 'array', description: 'List of accounts' },
        item: { type: 'object', description: 'Item metadata' },
        request_id: { type: 'string', description: 'Request ID for debugging' }
      }
    },

    // ===== Balance =====
    {
      id: 'get_balance',
      name: 'Get Account Balance',
      description: 'Get real-time balance information for accounts',
      category: 'Balance',
      icon: 'dollar-sign',
      verified: false,
      api: {
        endpoint: '/accounts/balance/get',
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      },
      inputSchema: {
        access_token: {
          type: 'string',
          required: true,
          label: 'Access Token',
          description: 'The access token for the Item',
          aiControlled: false
        },
        account_ids: {
          type: 'array',
          required: false,
          label: 'Account IDs',
          description: 'Optional array of account IDs to filter',
          aiControlled: false
        }
      },
      outputSchema: {
        accounts: {
          type: 'array',
          description: 'Accounts with balance info',
          properties: {
            account_id: { type: 'string' },
            balances: {
              type: 'object',
              properties: {
                available: { type: 'number' },
                current: { type: 'number' },
                limit: { type: 'number' },
                iso_currency_code: { type: 'string' }
              }
            }
          }
        }
      }
    },

    // ===== Auth (Account & Routing Numbers) =====
    {
      id: 'get_auth',
      name: 'Get Auth (Account Numbers)',
      description: 'Retrieve account and routing numbers for ACH transfers',
      category: 'Auth',
      icon: 'key',
      verified: false,
      api: {
        endpoint: '/auth/get',
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      },
      inputSchema: {
        access_token: {
          type: 'string',
          required: true,
          label: 'Access Token',
          description: 'The access token for the Item',
          aiControlled: false
        },
        account_ids: {
          type: 'array',
          required: false,
          label: 'Account IDs',
          description: 'Optional array of account IDs to filter',
          aiControlled: false
        }
      },
      outputSchema: {
        accounts: { type: 'array' },
        numbers: {
          type: 'object',
          properties: {
            ach: { type: 'array', description: 'ACH account/routing numbers' },
            eft: { type: 'array', description: 'EFT numbers (Canada)' },
            international: { type: 'array', description: 'IBAN/BIC' },
            bacs: { type: 'array', description: 'UK BACS numbers' }
          }
        }
      }
    },

    // ===== Identity =====
    {
      id: 'get_identity',
      name: 'Get Identity',
      description: 'Retrieve account holder identity information',
      category: 'Identity',
      icon: 'user',
      verified: false,
      api: {
        endpoint: '/identity/get',
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      },
      inputSchema: {
        access_token: {
          type: 'string',
          required: true,
          label: 'Access Token',
          description: 'The access token for the Item',
          aiControlled: false
        },
        account_ids: {
          type: 'array',
          required: false,
          label: 'Account IDs',
          description: 'Optional array of account IDs to filter',
          aiControlled: false
        }
      },
      outputSchema: {
        accounts: {
          type: 'array',
          description: 'Accounts with owner info',
          properties: {
            owners: {
              type: 'array',
              properties: {
                names: { type: 'array' },
                addresses: { type: 'array' },
                emails: { type: 'array' },
                phone_numbers: { type: 'array' }
              }
            }
          }
        }
      }
    },

    // ===== Transactions =====
    {
      id: 'get_transactions',
      name: 'Get Transactions',
      description: 'Retrieve transactions for a date range',
      category: 'Transactions',
      icon: 'list',
      verified: false,
      api: {
        endpoint: '/transactions/get',
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      },
      inputSchema: {
        access_token: {
          type: 'string',
          required: true,
          label: 'Access Token',
          description: 'The access token for the Item',
          aiControlled: false
        },
        start_date: {
          type: 'string',
          required: true,
          label: 'Start Date',
          placeholder: 'YYYY-MM-DD',
          description: 'Start date for transactions (format: YYYY-MM-DD)',
          aiControlled: false
        },
        end_date: {
          type: 'string',
          required: true,
          label: 'End Date',
          placeholder: 'YYYY-MM-DD',
          description: 'End date for transactions (format: YYYY-MM-DD)',
          aiControlled: false
        },
        account_ids: {
          type: 'array',
          required: false,
          label: 'Account IDs',
          description: 'Optional array of account IDs to filter',
          aiControlled: false
        },
        count: {
          type: 'number',
          required: false,
          label: 'Count',
          default: 100,
          description: 'Number of transactions to return (max 500)',
          aiControlled: false
        },
        offset: {
          type: 'number',
          required: false,
          label: 'Offset',
          default: 0,
          description: 'Offset for pagination',
          aiControlled: false
        }
      },
      outputSchema: {
        transactions: { type: 'array', description: 'List of transactions' },
        total_transactions: { type: 'number' },
        accounts: { type: 'array' }
      }
    },

    {
      id: 'sync_transactions',
      name: 'Sync Transactions',
      description: 'Get incremental transaction updates using cursor-based pagination',
      category: 'Transactions',
      icon: 'refresh-cw',
      verified: false,
      api: {
        endpoint: '/transactions/sync',
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      },
      inputSchema: {
        access_token: {
          type: 'string',
          required: true,
          label: 'Access Token',
          description: 'The access token for the Item',
          aiControlled: false
        },
        cursor: {
          type: 'string',
          required: false,
          label: 'Cursor',
          description: 'Cursor from previous sync call. Use "now" to start fresh.',
          aiControlled: false
        },
        count: {
          type: 'number',
          required: false,
          label: 'Count',
          default: 100,
          description: 'Number of updates to return (max 500)',
          aiControlled: false
        }
      },
      outputSchema: {
        added: { type: 'array', description: 'New transactions' },
        modified: { type: 'array', description: 'Modified transactions' },
        removed: { type: 'array', description: 'Removed transaction IDs' },
        next_cursor: { type: 'string', description: 'Cursor for next sync' },
        has_more: { type: 'boolean', description: 'More data available' }
      }
    },

    {
      id: 'refresh_transactions',
      name: 'Refresh Transactions',
      description: 'Force a refresh of transaction data',
      category: 'Transactions',
      icon: 'refresh-cw',
      verified: false,
      api: {
        endpoint: '/transactions/refresh',
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      },
      inputSchema: {
        access_token: {
          type: 'string',
          required: true,
          label: 'Access Token',
          description: 'The access token for the Item',
          aiControlled: false
        }
      },
      outputSchema: {
        request_id: { type: 'string', description: 'Request ID' }
      }
    },

    {
      id: 'get_recurring_transactions',
      name: 'Get Recurring Transactions',
      description: 'Retrieve recurring transaction patterns',
      category: 'Transactions',
      icon: 'repeat',
      verified: false,
      api: {
        endpoint: '/transactions/recurring/get',
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      },
      inputSchema: {
        access_token: {
          type: 'string',
          required: true,
          label: 'Access Token',
          description: 'The access token for the Item',
          aiControlled: false
        },
        account_ids: {
          type: 'array',
          required: false,
          label: 'Account IDs',
          description: 'Optional array of account IDs to filter',
          aiControlled: false
        }
      },
      outputSchema: {
        inflow_streams: { type: 'array', description: 'Recurring income' },
        outflow_streams: { type: 'array', description: 'Recurring expenses' }
      }
    },

    // ===== Item Management =====
    {
      id: 'get_item',
      name: 'Get Item',
      description: 'Retrieve Item status and metadata',
      category: 'Items',
      icon: 'info',
      verified: false,
      api: {
        endpoint: '/item/get',
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      },
      inputSchema: {
        access_token: {
          type: 'string',
          required: true,
          label: 'Access Token',
          description: 'The access token for the Item',
          aiControlled: false
        }
      },
      outputSchema: {
        item: {
          type: 'object',
          properties: {
            item_id: { type: 'string' },
            institution_id: { type: 'string' },
            webhook: { type: 'string' },
            error: { type: 'object' },
            available_products: { type: 'array' },
            billed_products: { type: 'array' },
            consent_expiration_time: { type: 'string' }
          }
        },
        status: { type: 'object' }
      }
    },

    {
      id: 'remove_item',
      name: 'Remove Item',
      description: 'Delete an Item and invalidate its access token',
      category: 'Items',
      icon: 'trash-2',
      verified: false,
      api: {
        endpoint: '/item/remove',
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      },
      inputSchema: {
        access_token: {
          type: 'string',
          required: true,
          label: 'Access Token',
          description: 'The access token for the Item to remove',
          aiControlled: false
        }
      },
      outputSchema: {
        request_id: { type: 'string', description: 'Request ID' }
      }
    },

    {
      id: 'update_item_webhook',
      name: 'Update Item Webhook',
      description: 'Update the webhook URL for an Item',
      category: 'Items',
      icon: 'link',
      verified: false,
      api: {
        endpoint: '/item/webhook/update',
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      },
      inputSchema: {
        access_token: {
          type: 'string',
          required: true,
          label: 'Access Token',
          description: 'The access token for the Item',
          aiControlled: false
        },
        webhook: {
          type: 'string',
          required: true,
          label: 'Webhook URL',
          placeholder: 'https://your-domain.com/webhooks/plaid',
          description: 'The new webhook URL',
          aiControlled: false
        }
      },
      outputSchema: {
        item: { type: 'object', description: 'Updated Item' }
      }
    },

    // ===== Link Token =====
    {
      id: 'create_link_token',
      name: 'Create Link Token',
      description: 'Create a Link token for initializing Plaid Link',
      category: 'Link',
      icon: 'link-2',
      verified: false,
      api: {
        endpoint: '/link/token/create',
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      },
      inputSchema: {
        user_client_user_id: {
          type: 'string',
          required: true,
          label: 'User Client User ID',
          description: 'A unique identifier for your end-user',
          aiControlled: false
        },
        products: {
          type: 'array',
          required: true,
          label: 'Products',
          default: ['transactions'],
          description: 'Products to enable (transactions, auth, identity, etc.)',
          aiControlled: false
        },
        country_codes: {
          type: 'array',
          required: true,
          label: 'Country Codes',
          default: ['US'],
          description: 'Country codes to enable (e.g., US, CA, GB)',
          aiControlled: false
        },
        language: {
          type: 'string',
          required: false,
          label: 'Language',
          default: 'en',
          description: 'Language for Plaid Link UI',
          aiControlled: false
        },
        webhook: {
          type: 'string',
          required: false,
          label: 'Webhook URL',
          description: 'Webhook URL for this Link session',
          aiControlled: false
        },
        redirect_uri: {
          type: 'string',
          required: false,
          label: 'Redirect URI',
          description: 'Redirect URI for OAuth flows',
          aiControlled: false
        },
        access_token: {
          type: 'string',
          required: false,
          label: 'Access Token (for update mode)',
          description: 'Provide to launch Link in update mode for existing Item',
          aiControlled: false
        }
      },
      outputSchema: {
        link_token: { type: 'string', description: 'Token for Plaid Link' },
        expiration: { type: 'string', description: 'Token expiration time' },
        request_id: { type: 'string' }
      }
    },

    {
      id: 'exchange_public_token',
      name: 'Exchange Public Token',
      description: 'Exchange a public token for an access token',
      category: 'Link',
      icon: 'key',
      verified: false,
      api: {
        endpoint: '/item/public_token/exchange',
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      },
      inputSchema: {
        public_token: {
          type: 'string',
          required: true,
          label: 'Public Token',
          description: 'Public token received from Plaid Link',
          aiControlled: false
        }
      },
      outputSchema: {
        access_token: { type: 'string', description: 'Access token for API calls' },
        item_id: { type: 'string', description: 'Item ID' },
        request_id: { type: 'string' }
      }
    },

    // ===== Institutions =====
    {
      id: 'get_institutions',
      name: 'Get Institutions',
      description: 'Search for institutions supported by Plaid',
      category: 'Institutions',
      icon: 'building',
      verified: false,
      api: {
        endpoint: '/institutions/get',
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      },
      inputSchema: {
        count: {
          type: 'number',
          required: true,
          label: 'Count',
          default: 10,
          description: 'Number of institutions to return',
          aiControlled: false
        },
        offset: {
          type: 'number',
          required: true,
          label: 'Offset',
          default: 0,
          description: 'Offset for pagination',
          aiControlled: false
        },
        country_codes: {
          type: 'array',
          required: true,
          label: 'Country Codes',
          default: ['US'],
          description: 'Country codes to filter institutions',
          aiControlled: false
        }
      },
      outputSchema: {
        institutions: { type: 'array', description: 'List of institutions' },
        total: { type: 'number', description: 'Total count' }
      }
    },

    {
      id: 'get_institution_by_id',
      name: 'Get Institution by ID',
      description: 'Get details for a specific institution',
      category: 'Institutions',
      icon: 'building',
      verified: false,
      api: {
        endpoint: '/institutions/get_by_id',
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      },
      inputSchema: {
        institution_id: {
          type: 'string',
          required: true,
          label: 'Institution ID',
          placeholder: 'ins_...',
          description: 'The institution ID',
          aiControlled: false
        },
        country_codes: {
          type: 'array',
          required: true,
          label: 'Country Codes',
          default: ['US'],
          description: 'Country codes',
          aiControlled: false
        }
      },
      outputSchema: {
        institution: { type: 'object', description: 'Institution details' }
      }
    },

    // ===== Categories =====
    {
      id: 'get_categories',
      name: 'Get Categories',
      description: 'Get all transaction categories',
      category: 'Categories',
      icon: 'tag',
      verified: false,
      api: {
        endpoint: '/categories/get',
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      },
      inputSchema: {},
      outputSchema: {
        categories: { type: 'array', description: 'List of categories' }
      }
    }
  ],

  // ============= SUPPORTED TRIGGERS =============
  supported_triggers: [
    {
      id: 'transactions_sync_updates',
      name: 'Transaction Updates Available',
      description: 'Triggers when new transaction data is available for sync',
      eventType: 'TRANSACTIONS.SYNC_UPDATES_AVAILABLE',
      icon: 'refresh-cw',
      verified: false,
      webhookRequired: true,
      inputSchema: {
        access_token: {
          type: 'string',
          required: false,
          label: 'Access Token',
          description: 'Filter events for specific access token',
          aiControlled: false
        }
      },
      outputSchema: {
        webhook_type: { type: 'string' },
        webhook_code: { type: 'string' },
        item_id: { type: 'string' },
        initial_update_complete: { type: 'boolean' },
        historical_update_complete: { type: 'boolean' }
      }
    },
    {
      id: 'transactions_initial_update',
      name: 'Initial Transactions Ready',
      description: 'Triggers when initial transaction pull is complete',
      eventType: 'TRANSACTIONS.INITIAL_UPDATE',
      icon: 'check-circle',
      verified: false,
      webhookRequired: true,
      inputSchema: {},
      outputSchema: {
        webhook_type: { type: 'string' },
        webhook_code: { type: 'string' },
        item_id: { type: 'string' },
        new_transactions: { type: 'number' }
      }
    },
    {
      id: 'transactions_historical_update',
      name: 'Historical Transactions Ready',
      description: 'Triggers when historical transaction data is ready',
      eventType: 'TRANSACTIONS.HISTORICAL_UPDATE',
      icon: 'clock',
      verified: false,
      webhookRequired: true,
      inputSchema: {},
      outputSchema: {
        webhook_type: { type: 'string' },
        webhook_code: { type: 'string' },
        item_id: { type: 'string' },
        new_transactions: { type: 'number' }
      }
    },
    {
      id: 'transactions_default_update',
      name: 'New Transactions',
      description: 'Triggers when new transactions are detected',
      eventType: 'TRANSACTIONS.DEFAULT_UPDATE',
      icon: 'plus-circle',
      verified: false,
      webhookRequired: true,
      inputSchema: {},
      outputSchema: {
        webhook_type: { type: 'string' },
        webhook_code: { type: 'string' },
        item_id: { type: 'string' },
        new_transactions: { type: 'number' }
      }
    },
    {
      id: 'transactions_removed',
      name: 'Transactions Removed',
      description: 'Triggers when transactions are removed',
      eventType: 'TRANSACTIONS.TRANSACTIONS_REMOVED',
      icon: 'minus-circle',
      verified: false,
      webhookRequired: true,
      inputSchema: {},
      outputSchema: {
        webhook_type: { type: 'string' },
        webhook_code: { type: 'string' },
        item_id: { type: 'string' },
        removed_transactions: { type: 'array' }
      }
    },
    {
      id: 'item_error',
      name: 'Item Error',
      description: 'Triggers when an error occurs with an Item',
      eventType: 'ITEM.ERROR',
      icon: 'alert-triangle',
      verified: false,
      webhookRequired: true,
      inputSchema: {},
      outputSchema: {
        webhook_type: { type: 'string' },
        webhook_code: { type: 'string' },
        item_id: { type: 'string' },
        error: {
          type: 'object',
          properties: {
            error_type: { type: 'string' },
            error_code: { type: 'string' },
            error_message: { type: 'string' }
          }
        }
      }
    },
    {
      id: 'item_pending_expiration',
      name: 'Item Pending Expiration',
      description: 'Triggers when Item access is about to expire',
      eventType: 'ITEM.PENDING_EXPIRATION',
      icon: 'alert-circle',
      verified: false,
      webhookRequired: true,
      inputSchema: {},
      outputSchema: {
        webhook_type: { type: 'string' },
        webhook_code: { type: 'string' },
        item_id: { type: 'string' },
        consent_expiration_time: { type: 'string' }
      }
    },
    {
      id: 'item_user_permission_revoked',
      name: 'User Permission Revoked',
      description: 'Triggers when user revokes permission',
      eventType: 'ITEM.USER_PERMISSION_REVOKED',
      icon: 'user-x',
      verified: false,
      webhookRequired: true,
      inputSchema: {},
      outputSchema: {
        webhook_type: { type: 'string' },
        webhook_code: { type: 'string' },
        item_id: { type: 'string' }
      }
    },
    {
      id: 'auth_automatically_verified',
      name: 'Auth Automatically Verified',
      description: 'Triggers when account numbers are automatically verified',
      eventType: 'AUTH.AUTOMATICALLY_VERIFIED',
      icon: 'check',
      verified: false,
      webhookRequired: true,
      inputSchema: {},
      outputSchema: {
        webhook_type: { type: 'string' },
        webhook_code: { type: 'string' },
        item_id: { type: 'string' },
        account_id: { type: 'string' }
      }
    },
    {
      id: 'auth_verification_expired',
      name: 'Auth Verification Expired',
      description: 'Triggers when auth verification expires',
      eventType: 'AUTH.VERIFICATION_EXPIRED',
      icon: 'x-circle',
      verified: false,
      webhookRequired: true,
      inputSchema: {},
      outputSchema: {
        webhook_type: { type: 'string' },
        webhook_code: { type: 'string' },
        item_id: { type: 'string' },
        account_id: { type: 'string' }
      }
    }
  ]
};
