// Google Analytics Connector
// Auto-generated from connector.constants.ts

import { ConnectorDefinition } from '../../shared';

export const GOOGLE_ANALYTICS_CONNECTOR: ConnectorDefinition = {
    name: 'google_analytics',
    display_name: 'Google Analytics',
    category: 'analytics',
    description: 'Get reports from Google Analytics 4 and search user activity from Universal Analytics',
    auth_type: 'oauth2',
    auth_fields: [
      {
        key: 'use_manual_oauth',
        label: 'Use Custom OAuth Credentials',
        type: 'boolean',
        required: false,
        default: false,
        description: 'Enable this to use your own Google OAuth credentials instead of centralized OAuth',
        order: 1
      },
      {
        key: 'client_id',
        label: 'OAuth Client ID',
        type: 'string',
        required: false,
        placeholder: 'xxxxx.apps.googleusercontent.com',
        description: 'Your Google OAuth Client ID (optional - leave empty to use centralized OAuth)',
        helpUrl: 'https://console.cloud.google.com/apis/credentials',
        helpText: 'How to get OAuth credentials',
        displayOptions: {
          show: {
            use_manual_oauth: [true]
          }
        },
        order: 2
      },
      {
        key: 'client_secret',
        label: 'OAuth Client Secret',
        type: 'password',
        required: false,
        placeholder: 'GOCSPX-xxxxxxxxxxxxx',
        description: 'Your Google OAuth Client Secret (optional - leave empty to use centralized OAuth)',
        displayOptions: {
          show: {
            use_manual_oauth: [true]
          }
        },
        order: 3
      },
      {
        key: 'redirect_uri',
        label: 'OAuth Redirect URI',
        type: 'string',
        required: false,
        placeholder: 'http://localhost:5005/api/v1/oauth/google/callback',
        description: 'OAuth redirect URI configured in your Google Cloud Console',
        displayOptions: {
          show: {
            use_manual_oauth: [true]
          }
        },
        order: 4
      }
    ],
    endpoints: {
      base_url: 'https://analyticsdata.googleapis.com',
      base_url_ua: 'https://analyticsreporting.googleapis.com',
      ga4_reports: '/v1beta/properties/:propertyId:runReport',
      user_activity: '/v4/userActivity:search'
    },
    webhook_support: false,
    rate_limits: {
      requests_per_second: 10,
      requests_per_day: 25000
    },
    sandbox_available: false,
    verified: true,
    oauth_config: {
      authorization_url: 'https://accounts.google.com/o/oauth2/v2/auth',
      token_url: 'https://oauth2.googleapis.com/token',
      scopes: [
        'https://www.googleapis.com/auth/analytics.readonly',
        'https://www.googleapis.com/auth/analytics'
      ]
    },
    supported_actions: [
      {
        id: 'get_ga4_report',
        name: 'Get GA4 Report',
        description: 'Get analytics data from Google Analytics 4 property',
        category: 'Reports',
        icon: 'bar-chart',
        verified: false,
        inputSchema: {
          propertyId: {
            type: 'string',
            required: true,
            label: 'GA4 Property ID',
            placeholder: '123456789',
            description: 'Your GA4 Property ID (found in Admin → Property Settings)',
            order: 1,
            aiControlled: false
          },
          dateRange: {
            type: 'select',
            required: true,
            label: 'Date Range',
            description: 'Time period for the report',
            default: 'last7days',
            options: [
              { label: 'Today', value: 'today' },
              { label: 'Yesterday', value: 'yesterday' },
              { label: 'Last 7 Days', value: 'last7days' },
              { label: 'Last 30 Days', value: 'last30days' },
              { label: 'Last 90 Days', value: 'last90days' },
              { label: 'This Month', value: 'thisMonth' },
              { label: 'Last Month', value: 'lastMonth' },
              { label: 'This Year', value: 'thisYear' },
              { label: 'Last Year', value: 'lastYear' },
              { label: 'Custom Range', value: 'custom' }
            ],
            order: 2,
            aiControlled: false
          },
          startDate: {
            type: 'string',
            label: 'Start Date',
            placeholder: '2025-01-01',
            description: 'Start date in YYYY-MM-DD format (only for Custom Range)',
            displayOptions: {
              show: {
                dateRange: ['custom']
              }
            },
            order: 3,
            aiControlled: false
          },
          endDate: {
            type: 'string',
            label: 'End Date',
            placeholder: '2025-01-31',
            description: 'End date in YYYY-MM-DD format (only for Custom Range)',
            displayOptions: {
              show: {
                dateRange: ['custom']
              }
            },
            order: 4,
            aiControlled: false
          },
          metrics: {
            type: 'array',
            required: true,
            label: 'Metrics',
            description: 'GA4 metrics to retrieve (e.g., activeUsers, sessions, conversions)',
            default: ['activeUsers', 'sessions'],
            order: 5,
            aiControlled: false
          },
          dimensions: {
            type: 'array',
            label: 'Dimensions',
            description: 'GA4 dimensions to group by (e.g., date, country, city, browser)',
            default: ['date'],
            order: 6,
            aiControlled: false
          },
          returnAll: {
            type: 'boolean',
            label: 'Return All Results',
            description: 'Get all results or limit to a specific number',
            default: false,
            order: 7,
            aiControlled: false
          },
          limit: {
            type: 'number',
            label: 'Limit',
            description: 'Maximum number of results (only when Return All is false)',
            default: 100,
            min: 1,
            max: 100000,
            displayOptions: {
              show: {
                returnAll: [false]
              }
            },
            order: 8,
            aiControlled: false
          },
          simple: {
            type: 'boolean',
            label: 'Simplify Response',
            description: 'Convert nested GA4 response into flat objects',
            default: true,
            order: 9,
            aiControlled: false
          },
          currencyCode: {
            type: 'string',
            label: 'Currency Code',
            placeholder: 'USD',
            description: 'Currency code for monetary values (e.g., USD, EUR, GBP)',
            order: 10,
            aiControlled: false
          }
        },
        outputSchema: {
          type: 'object',
          properties: {
            rows: {
              type: 'array',
              description: 'Array of data rows with dimensions and metrics'
            },
            dimensionHeaders: {
              type: 'array',
              description: 'Dimension column headers'
            },
            metricHeaders: {
              type: 'array',
              description: 'Metric column headers'
            },
            rowCount: {
              type: 'number',
              description: 'Total number of rows'
            }
          }
        }
      },
      {
        id: 'search_user_activity',
        name: 'Search User Activity',
        description: 'Search for user activity data from Universal Analytics',
        category: 'User Activity',
        icon: 'user',
        verified: false,
        inputSchema: {
          viewId: {
            type: 'string',
            required: true,
            label: 'View ID',
            placeholder: '123456789',
            description: 'The View ID from Universal Analytics (found in Admin → View Settings)',
            order: 1,
            aiControlled: false
          },
          userId: {
            type: 'string',
            required: true,
            label: 'User ID',
            placeholder: '1234567890.1234567890',
            description: 'User identifier - can be Client ID (format: 1234567890.1234567890) or custom User ID',
            order: 2,
            aiControlled: false
          },
          returnAll: {
            type: 'boolean',
            label: 'Return All',
            description: 'Whether to return all results or only up to a given limit',
            default: false,
            order: 3,
            aiControlled: false
          },
          limit: {
            type: 'number',
            label: 'Limit',
            description: 'Max number of results to return',
            default: 100,
            min: 1,
            max: 500,
            displayOptions: {
              show: {
                returnAll: [false]
              }
            },
            order: 4,
            aiControlled: false
          },
          activityTypes: {
            type: 'array',
            label: 'Activity Types',
            description: 'Filter by specific activity types (leave empty for all)',
            default: [],
            options: [
              { label: 'Pageview', value: 'PAGEVIEW' },
              { label: 'Event', value: 'EVENT' },
              { label: 'Ecommerce', value: 'ECOMMERCE' },
              { label: 'Goal', value: 'GOAL' },
              { label: 'Screenview', value: 'SCREENVIEW' }
            ],
            order: 5,
            aiControlled: false
          }
        },
        outputSchema: {
          type: 'object',
          properties: {
            sessions: {
              type: 'array',
              description: 'Array of user activity sessions'
            }
          }
        }
      }
    ],
    supported_triggers: []
  };
