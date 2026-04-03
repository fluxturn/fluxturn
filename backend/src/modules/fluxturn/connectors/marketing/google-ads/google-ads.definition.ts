// Google Ads Connector
// Comprehensive Google Ads integration for campaign management and advertising analytics

import { ConnectorDefinition } from '../../shared';

export const GOOGLE_ADS_CONNECTOR: ConnectorDefinition = {
  name: 'google_ads',
  display_name: 'Google Ads',
  category: 'marketing',
  description: 'Google Ads integration for campaign management, ad creation, keyword management, and performance analytics. Requires OAuth2 authentication AND a Developer Token.',
  auth_type: 'multiple',
  auth_fields: [
    {
      key: 'authType',
      type: 'select',
      label: 'Authentication Type',
      required: true,
      default: 'oauth2',
      options: [
        { label: 'OAuth2 (Recommended - One-Click)', value: 'oauth2' },
        { label: 'Manual OAuth (Bring Your Own Credentials)', value: 'manual' }
      ],
      description: 'Choose how to authenticate with Google Ads'
    },
    {
      key: 'clientId',
      label: 'Client ID',
      type: 'string',
      required: true,
      placeholder: 'YOUR_CLIENT_ID.apps.googleusercontent.com',
      description: 'Your Google OAuth Client ID',
      helpUrl: 'https://developers.google.com/google-ads/api/docs/oauth/overview',
      helpText: 'How to create OAuth credentials',
      displayOptions: {
        authType: ['manual']
      }
    },
    {
      key: 'clientSecret',
      label: 'Client Secret',
      type: 'password',
      required: true,
      placeholder: 'Enter client secret',
      description: 'Your Google OAuth Client Secret',
      displayOptions: {
        authType: ['manual']
      }
    },
    {
      key: 'developerToken',
      label: 'Developer Token',
      type: 'password',
      required: true,
      placeholder: 'Enter your developer token',
      description: 'Google Ads API Developer Token (required for all authentication types)',
      helpUrl: 'https://developers.google.com/google-ads/api/docs/first-call/dev-token',
      helpText: 'How to get a Developer Token'
    },
    {
      key: 'customerId',
      label: 'Customer ID',
      type: 'string',
      required: false,
      placeholder: '1234567890',
      description: 'Your Google Ads Customer ID (without dashes). Can be set per action if not provided here.',
      helpUrl: 'https://support.google.com/google-ads/answer/1704344',
      helpText: 'How to find your Customer ID'
    },
    {
      key: 'loginCustomerId',
      label: 'Login Customer ID',
      type: 'string',
      required: false,
      placeholder: '1234567890',
      description: 'Manager account Customer ID (required if accessing client accounts)',
      helpUrl: 'https://developers.google.com/google-ads/api/docs/concepts/call-structure#cid'
    }
  ],
  oauth_config: {
    authorization_url: 'https://accounts.google.com/o/oauth2/v2/auth',
    token_url: 'https://oauth2.googleapis.com/token',
    scopes: [
      'https://www.googleapis.com/auth/adwords'
    ]
  },
  endpoints: {
    base_url: 'https://googleads.googleapis.com',
    api_version: '/v22',
    search: '/v22/customers/{customer_id}/googleAds:search',
    searchStream: '/v22/customers/{customer_id}/googleAds:searchStream',
    campaigns: '/v22/customers/{customer_id}/campaigns',
    campaign: '/v22/customers/{customer_id}/campaigns/{campaign_id}',
    adGroups: '/v22/customers/{customer_id}/adGroups',
    ads: '/v22/customers/{customer_id}/ads',
    keywords: '/v22/customers/{customer_id}/adGroupCriteria',
    reports: '/v22/customers/{customer_id}/googleAds:search'
  },
  webhook_support: false, // Google Ads API is polling-based
  rate_limits: {
    requests_per_day: 15000,
    operations_per_request: 5000
  },
  sandbox_available: true,
  supported_actions: [
    // Campaign Actions
    {
      id: 'campaign_get',
      name: 'Get Campaign',
      description: 'Retrieve a campaign by ID',
      category: 'Campaign',
      icon: 'target',
      verified: false,
      api: {
        endpoint: '/v22/customers/{customer_id}/googleAds:search',
        method: 'POST',
        baseUrl: 'https://googleads.googleapis.com',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer {accessToken}',
          'developer-token': '{developerToken}',
          'login-customer-id': '{loginCustomerId}'
        },
        paramMapping: {
          customerId: 'customer_id',
          campaignId: 'campaign_id',
          query: 'query'
        }
      },
      inputSchema: {
        customerId: {
          type: 'string',
          required: true,
          label: 'Customer ID',
          placeholder: '1234567890',
          description: 'Google Ads Customer ID (without dashes)',
          aiControlled: false
        },
        campaignId: {
          type: 'string',
          required: true,
          label: 'Campaign ID',
          placeholder: '12345678',
          description: 'The campaign ID to retrieve',
          aiControlled: false
        }
      },
      outputSchema: {
        campaign: { type: 'object', description: 'Campaign information' }
      }
    },
    {
      id: 'campaign_get_all',
      name: 'Get All Campaigns',
      description: 'Retrieve all campaigns for a customer',
      category: 'Campaign',
      icon: 'list',
      verified: false,
      api: {
        endpoint: '/v22/customers/{customer_id}/googleAds:search',
        method: 'POST',
        baseUrl: 'https://googleads.googleapis.com',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer {accessToken}',
          'developer-token': '{developerToken}',
          'login-customer-id': '{loginCustomerId}'
        },
        paramMapping: {
          customerId: 'customer_id',
          query: 'query'
        }
      },
      inputSchema: {
        customerId: {
          type: 'string',
          required: true,
          label: 'Customer ID',
          placeholder: '1234567890',
          description: 'Google Ads Customer ID',
          aiControlled: false
        },
        returnAll: {
          type: 'boolean',
          label: 'Return All',
          default: false,
          description: 'Return all campaigns',
          aiControlled: false
        },
        limit: {
          type: 'number',
          label: 'Limit',
          default: 100,
          min: 1,
          max: 10000,
          description: 'Maximum number of campaigns to return',
          displayOptions: {
            show: {
              returnAll: [false]
            }
          },
          aiControlled: false
        },
        fields: {
          type: 'array',
          label: 'Fields',
          description: 'Campaign fields to retrieve',
          itemSchema: {
            value: {
              type: 'select',
              options: [
                { label: 'Campaign ID', value: 'campaign.id' },
                { label: 'Campaign Name', value: 'campaign.name' },
                { label: 'Status', value: 'campaign.status' },
                { label: 'Budget', value: 'campaign_budget.amount_micros' },
                { label: 'Start Date', value: 'campaign.start_date' },
                { label: 'End Date', value: 'campaign.end_date' },
                { label: 'Metrics', value: 'metrics' }
              ]
            }
          },
          aiControlled: false
        }
      },
      outputSchema: {
        campaigns: { type: 'array', description: 'List of campaigns' },
        totalResults: { type: 'number', description: 'Total number of campaigns' }
      }
    },
    {
      id: 'campaign_create',
      name: 'Create Campaign',
      description: 'Create a new campaign',
      category: 'Campaign',
      icon: 'plus-circle',
      verified: false,
      api: {
        endpoint: '/v22/customers/{customer_id}/campaigns:mutate',
        method: 'POST',
        baseUrl: 'https://googleads.googleapis.com',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer {accessToken}',
          'developer-token': '{developerToken}',
          'login-customer-id': '{loginCustomerId}'
        },
        paramMapping: {
          customerId: 'customer_id',
          operations: 'operations'
        }
      },
      inputSchema: {
        customerId: {
          type: 'string',
          required: true,
          label: 'Customer ID',
          placeholder: '1234567890',
          aiControlled: false
        },
        name: {
          type: 'string',
          required: true,
          label: 'Campaign Name',
          placeholder: 'My Campaign',
          description: 'Name of the campaign',
          aiControlled: true,
          aiDescription: 'Generate a descriptive and compelling campaign name that reflects the campaign goals and target audience'
        },
        advertisingChannelType: {
          type: 'select',
          required: true,
          label: 'Advertising Channel',
          default: 'SEARCH',
          options: [
            { label: 'Search', value: 'SEARCH' },
            { label: 'Display', value: 'DISPLAY' },
            { label: 'Shopping', value: 'SHOPPING' },
            { label: 'Video', value: 'VIDEO' },
            { label: 'Multi-Channel', value: 'MULTI_CHANNEL' }
          ],
          description: 'Type of advertising channel',
          aiControlled: false
        },
        status: {
          type: 'select',
          label: 'Status',
          default: 'PAUSED',
          options: [
            { label: 'Enabled', value: 'ENABLED' },
            { label: 'Paused', value: 'PAUSED' }
          ],
          description: 'Campaign status',
          aiControlled: false
        },
        budgetId: {
          type: 'string',
          required: true,
          label: 'Budget ID',
          placeholder: '12345',
          description: 'ID of the campaign budget',
          aiControlled: false
        },
        biddingStrategyType: {
          type: 'select',
          label: 'Bidding Strategy',
          default: 'MANUAL_CPC',
          options: [
            { label: 'Manual CPC', value: 'MANUAL_CPC' },
            { label: 'Maximize Clicks', value: 'MAXIMIZE_CLICKS' },
            { label: 'Maximize Conversions', value: 'MAXIMIZE_CONVERSIONS' },
            { label: 'Target CPA', value: 'TARGET_CPA' },
            { label: 'Target ROAS', value: 'TARGET_ROAS' }
          ],
          aiControlled: false
        },
        startDate: {
          type: 'string',
          label: 'Start Date',
          placeholder: '2024-12-01',
          description: 'Campaign start date (YYYY-MM-DD)',
          aiControlled: false
        },
        endDate: {
          type: 'string',
          label: 'End Date',
          placeholder: '2024-12-31',
          description: 'Campaign end date (YYYY-MM-DD)',
          aiControlled: false
        }
      },
      outputSchema: {
        campaignId: { type: 'string', description: 'Created campaign resource name' },
        success: { type: 'boolean', description: 'Whether creation was successful' }
      }
    },
    {
      id: 'campaign_update',
      name: 'Update Campaign',
      description: 'Update an existing campaign',
      category: 'Campaign',
      icon: 'edit',
      verified: false,
      api: {
        endpoint: '/v22/customers/{customer_id}/campaigns:mutate',
        method: 'POST',
        baseUrl: 'https://googleads.googleapis.com',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer {accessToken}',
          'developer-token': '{developerToken}',
          'login-customer-id': '{loginCustomerId}'
        },
        paramMapping: {
          customerId: 'customer_id',
          operations: 'operations'
        }
      },
      inputSchema: {
        customerId: {
          type: 'string',
          required: true,
          label: 'Customer ID',
          placeholder: '1234567890',
          aiControlled: false
        },
        campaignId: {
          type: 'string',
          required: true,
          label: 'Campaign ID',
          placeholder: '12345678',
          aiControlled: false
        },
        name: {
          type: 'string',
          label: 'Campaign Name',
          description: 'New campaign name',
          aiControlled: true,
          aiDescription: 'Generate an updated campaign name that reflects the campaign goals and target audience'
        },
        status: {
          type: 'select',
          label: 'Status',
          options: [
            { label: 'Enabled', value: 'ENABLED' },
            { label: 'Paused', value: 'PAUSED' },
            { label: 'Removed', value: 'REMOVED' }
          ],
          aiControlled: false
        }
      },
      outputSchema: {
        success: { type: 'boolean', description: 'Whether update was successful' }
      }
    },

    // Ad Group Actions
    {
      id: 'ad_group_create',
      name: 'Create Ad Group',
      description: 'Create a new ad group in a campaign',
      category: 'Ad Group',
      icon: 'folder-plus',
      verified: false,
      api: {
        endpoint: '/v22/customers/{customer_id}/adGroups:mutate',
        method: 'POST',
        baseUrl: 'https://googleads.googleapis.com',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer {accessToken}',
          'developer-token': '{developerToken}',
          'login-customer-id': '{loginCustomerId}'
        },
        paramMapping: {
          customerId: 'customer_id',
          operations: 'operations'
        }
      },
      inputSchema: {
        customerId: {
          type: 'string',
          required: true,
          label: 'Customer ID',
          placeholder: '1234567890',
          aiControlled: false
        },
        campaignId: {
          type: 'string',
          required: true,
          label: 'Campaign ID',
          placeholder: '12345678',
          description: 'Campaign to create the ad group in',
          aiControlled: false
        },
        name: {
          type: 'string',
          required: true,
          label: 'Ad Group Name',
          placeholder: 'My Ad Group',
          aiControlled: true,
          aiDescription: 'Generate a descriptive ad group name that reflects the theme or targeting of the ads within this group'
        },
        status: {
          type: 'select',
          label: 'Status',
          default: 'ENABLED',
          options: [
            { label: 'Enabled', value: 'ENABLED' },
            { label: 'Paused', value: 'PAUSED' }
          ],
          aiControlled: false
        },
        cpcBidMicros: {
          type: 'number',
          label: 'CPC Bid (micros)',
          placeholder: '1000000',
          description: 'Cost per click bid in micros (e.g., 1000000 = $1.00)',
          aiControlled: false
        }
      },
      outputSchema: {
        adGroupId: { type: 'string', description: 'Created ad group resource name' },
        success: { type: 'boolean', description: 'Whether creation was successful' }
      }
    },
    {
      id: 'ad_group_get_all',
      name: 'Get All Ad Groups',
      description: 'Get all ad groups for a campaign',
      category: 'Ad Group',
      icon: 'list',
      verified: false,
      api: {
        endpoint: '/v22/customers/{customer_id}/googleAds:search',
        method: 'POST',
        baseUrl: 'https://googleads.googleapis.com',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer {accessToken}',
          'developer-token': '{developerToken}',
          'login-customer-id': '{loginCustomerId}'
        },
        paramMapping: {
          customerId: 'customer_id',
          campaignId: 'campaign_id',
          query: 'query'
        }
      },
      inputSchema: {
        customerId: {
          type: 'string',
          required: true,
          label: 'Customer ID',
          placeholder: '1234567890',
          aiControlled: false
        },
        campaignId: {
          type: 'string',
          label: 'Campaign ID',
          placeholder: '12345678',
          description: 'Filter by campaign ID (optional)',
          aiControlled: false
        }
      },
      outputSchema: {
        adGroups: { type: 'array', description: 'List of ad groups' }
      }
    },

    // Keyword Actions
    {
      id: 'keyword_create',
      name: 'Add Keyword',
      description: 'Add a keyword to an ad group',
      category: 'Keyword',
      icon: 'key',
      verified: false,
      api: {
        endpoint: '/v22/customers/{customer_id}/adGroupCriteria:mutate',
        method: 'POST',
        baseUrl: 'https://googleads.googleapis.com',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer {accessToken}',
          'developer-token': '{developerToken}',
          'login-customer-id': '{loginCustomerId}'
        },
        paramMapping: {
          customerId: 'customer_id',
          operations: 'operations'
        }
      },
      inputSchema: {
        customerId: {
          type: 'string',
          required: true,
          label: 'Customer ID',
          placeholder: '1234567890',
          aiControlled: false
        },
        adGroupId: {
          type: 'string',
          required: true,
          label: 'Ad Group ID',
          placeholder: '12345678',
          description: 'Ad group to add the keyword to',
          aiControlled: false
        },
        keyword: {
          type: 'string',
          required: true,
          label: 'Keyword',
          placeholder: 'running shoes',
          description: 'Keyword text',
          aiControlled: true,
          aiDescription: 'Generate a relevant keyword phrase that targets the intended audience and aligns with the ad group theme'
        },
        matchType: {
          type: 'select',
          required: true,
          label: 'Match Type',
          default: 'EXACT',
          options: [
            { label: 'Exact', value: 'EXACT' },
            { label: 'Phrase', value: 'PHRASE' },
            { label: 'Broad', value: 'BROAD' }
          ],
          description: 'Keyword match type',
          aiControlled: false
        },
        status: {
          type: 'select',
          label: 'Status',
          default: 'ENABLED',
          options: [
            { label: 'Enabled', value: 'ENABLED' },
            { label: 'Paused', value: 'PAUSED' }
          ],
          aiControlled: false
        },
        cpcBidMicros: {
          type: 'number',
          label: 'CPC Bid Override (micros)',
          placeholder: '1500000',
          description: 'Optional keyword-level bid override in micros',
          aiControlled: false
        }
      },
      outputSchema: {
        keywordId: { type: 'string', description: 'Created keyword resource name' },
        success: { type: 'boolean', description: 'Whether creation was successful' }
      }
    },
    {
      id: 'keyword_get_all',
      name: 'Get All Keywords',
      description: 'Get all keywords for an ad group',
      category: 'Keyword',
      icon: 'list',
      verified: false,
      api: {
        endpoint: '/v22/customers/{customer_id}/googleAds:search',
        method: 'POST',
        baseUrl: 'https://googleads.googleapis.com',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer {accessToken}',
          'developer-token': '{developerToken}',
          'login-customer-id': '{loginCustomerId}'
        },
        paramMapping: {
          customerId: 'customer_id',
          adGroupId: 'ad_group_id',
          query: 'query'
        }
      },
      inputSchema: {
        customerId: {
          type: 'string',
          required: true,
          label: 'Customer ID',
          placeholder: '1234567890',
          aiControlled: false
        },
        adGroupId: {
          type: 'string',
          label: 'Ad Group ID',
          placeholder: '12345678',
          description: 'Filter by ad group ID (optional)',
          aiControlled: false
        }
      },
      outputSchema: {
        keywords: { type: 'array', description: 'List of keywords with performance metrics' }
      }
    },

    // Reporting Actions
    {
      id: 'report_campaign_performance',
      name: 'Get Campaign Performance Report',
      description: 'Retrieve campaign performance metrics',
      category: 'Report',
      icon: 'bar-chart',
      verified: false,
      api: {
        endpoint: '/v22/customers/{customer_id}/googleAds:search',
        method: 'POST',
        baseUrl: 'https://googleads.googleapis.com',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer {accessToken}',
          'developer-token': '{developerToken}',
          'login-customer-id': '{loginCustomerId}'
        },
        paramMapping: {
          customerId: 'customer_id',
          query: 'query'
        }
      },
      inputSchema: {
        customerId: {
          type: 'string',
          required: true,
          label: 'Customer ID',
          placeholder: '1234567890',
          aiControlled: false
        },
        dateRange: {
          type: 'select',
          required: true,
          label: 'Date Range',
          default: 'LAST_30_DAYS',
          options: [
            { label: 'Today', value: 'TODAY' },
            { label: 'Yesterday', value: 'YESTERDAY' },
            { label: 'Last 7 Days', value: 'LAST_7_DAYS' },
            { label: 'Last 30 Days', value: 'LAST_30_DAYS' },
            { label: 'This Month', value: 'THIS_MONTH' },
            { label: 'Last Month', value: 'LAST_MONTH' },
            { label: 'Custom', value: 'CUSTOM_DATE' }
          ],
          aiControlled: false
        },
        startDate: {
          type: 'string',
          label: 'Start Date',
          placeholder: '2024-01-01',
          description: 'Start date (YYYY-MM-DD) - for custom date range',
          displayOptions: {
            show: {
              dateRange: ['CUSTOM_DATE']
            }
          },
          aiControlled: false
        },
        endDate: {
          type: 'string',
          label: 'End Date',
          placeholder: '2024-12-31',
          description: 'End date (YYYY-MM-DD) - for custom date range',
          displayOptions: {
            show: {
              dateRange: ['CUSTOM_DATE']
            }
          },
          aiControlled: false
        },
        metrics: {
          type: 'array',
          label: 'Metrics',
          description: 'Performance metrics to include',
          itemSchema: {
            value: {
              type: 'select',
              options: [
                { label: 'Impressions', value: 'metrics.impressions' },
                { label: 'Clicks', value: 'metrics.clicks' },
                { label: 'Cost', value: 'metrics.cost_micros' },
                { label: 'Conversions', value: 'metrics.conversions' },
                { label: 'CTR', value: 'metrics.ctr' },
                { label: 'CPC', value: 'metrics.average_cpc' },
                { label: 'Conversion Rate', value: 'metrics.conversions_from_interactions_rate' }
              ]
            }
          },
          aiControlled: false
        }
      },
      outputSchema: {
        results: { type: 'array', description: 'Campaign performance data' },
        summary: { type: 'object', description: 'Aggregated metrics' }
      }
    }
  ],
  supported_triggers: []  // Google Ads API doesn't support webhooks - use polling instead
};
