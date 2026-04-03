// Mixpanel Connector
// Complete implementation matching Mixpanel API v2

import { ConnectorDefinition } from '../../shared';

export const MIXPANEL_CONNECTOR: ConnectorDefinition = {
  name: 'mixpanel',
  display_name: 'Mixpanel',
  category: 'analytics',
  description: 'Mixpanel product analytics platform for tracking events and user profiles',
  auth_type: 'api_key',
  auth_fields: [
    {
      key: 'projectToken',
      label: 'Project Token',
      type: 'password',
      required: true,
      placeholder: 'Enter your project token',
      description: 'Your Mixpanel project token for event tracking',
      helpUrl: 'https://help.mixpanel.com/hc/en-us/articles/115004490503-Project-Settings',
      helpText: 'How to find your project token'
    },
    {
      key: 'serviceAccountUsername',
      label: 'Service Account Username',
      type: 'string',
      required: false,
      placeholder: 'service-account-username',
      description: 'Service account username for API access (required for query operations)'
    },
    {
      key: 'serviceAccountSecret',
      label: 'Service Account Secret',
      type: 'password',
      required: false,
      placeholder: 'Enter service account secret',
      description: 'Service account secret for API access (required for query operations)'
    },
    {
      key: 'projectId',
      label: 'Project ID',
      type: 'string',
      required: false,
      placeholder: 'Enter your project ID',
      description: 'Your Mixpanel project ID (required for query operations)'
    },
    {
      key: 'region',
      label: 'Data Residency',
      type: 'select',
      required: false,
      default: 'us',
      options: [
        { label: 'US (Standard)', value: 'us' },
        { label: 'EU', value: 'eu' },
        { label: 'India', value: 'in' }
      ],
      description: 'Your Mixpanel data residency region'
    }
  ],
  endpoints: {
    us: {
      track: 'https://api.mixpanel.com/track',
      import: 'https://api.mixpanel.com/import',
      engage: 'https://api.mixpanel.com/engage',
      query: 'https://mixpanel.com/api'
    },
    eu: {
      track: 'https://api-eu.mixpanel.com/track',
      import: 'https://api-eu.mixpanel.com/import',
      engage: 'https://api-eu.mixpanel.com/engage',
      query: 'https://eu.mixpanel.com/api'
    },
    in: {
      track: 'https://api-in.mixpanel.com/track',
      import: 'https://api-in.mixpanel.com/import',
      engage: 'https://api-in.mixpanel.com/engage',
      query: 'https://in.mixpanel.com/api'
    }
  },
  webhook_support: false,
  rate_limits: {
    events_per_second: 30000,
    events_per_minute: 120000,
    queries_per_hour: 60,
    concurrent_queries: 5
  },
  sandbox_available: false,

  supported_actions: [
    // Event Operations
    {
      id: 'track_event',
      name: 'Track Event',
      description: 'Track a single event (last 5 days only)',
      category: 'Events',
      icon: 'activity',
      api: {
        endpoint: '/track',
        method: 'POST',
        baseUrl: 'https://api.mixpanel.com',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'Accept': 'application/json'
        },
        paramMapping: {
          event: 'event',
          properties: 'properties'
        }
      },
      inputSchema: {
        event: {
          type: 'string',
          required: true,
          label: 'Event Name',
          placeholder: 'Signup',
          description: 'Name of the event to track',
          aiControlled: false
        },
        distinctId: {
          type: 'string',
          required: true,
          label: 'Distinct ID',
          placeholder: 'user-123',
          description: 'Unique identifier for the user',
          aiControlled: false
        },
        properties: {
          type: 'object',
          required: false,
          label: 'Event Properties',
          description: 'Additional properties to track with the event (max 255 properties)',
          placeholder: '{ "plan": "premium", "signup_source": "organic" }',
          aiControlled: false
        },
        time: {
          type: 'number',
          required: false,
          label: 'Timestamp',
          description: 'Unix timestamp in seconds or milliseconds (defaults to now)',
          aiControlled: false
        },
        insertId: {
          type: 'string',
          required: false,
          label: 'Insert ID',
          description: 'Unique ID for event deduplication (max 36 bytes, alphanumeric + hyphens)',
          maxLength: 36,
          aiControlled: false
        },
        ip: {
          type: 'string',
          required: false,
          label: 'IP Address',
          description: 'IP address for GeoIP enrichment (use "0" to skip)',
          placeholder: '136.24.0.114',
          aiControlled: false
        }
      },
      outputSchema: {
        success: { type: 'boolean', description: 'Whether the event was tracked successfully' },
        status: { type: 'number', description: 'HTTP status code' },
        error: { type: 'string', description: 'Error message if failed' }
      }
    },
    {
      id: 'import_events',
      name: 'Import Events',
      description: 'Import historical events (supports events older than 5 days)',
      category: 'Events',
      icon: 'download',
      api: {
        endpoint: '/import',
        method: 'POST',
        baseUrl: 'https://api.mixpanel.com',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        }
      },
      inputSchema: {
        events: {
          type: 'array',
          required: true,
          label: 'Events',
          description: 'Array of events to import (max 2000 events, 10MB uncompressed)',
          aiControlled: false,
          itemSchema: {
            event: {
              type: 'string',
              required: true,
              label: 'Event Name',
              placeholder: 'Purchase',
              aiControlled: false
            },
            distinctId: {
              type: 'string',
              required: true,
              label: 'Distinct ID',
              placeholder: 'user-456',
              aiControlled: false
            },
            time: {
              type: 'number',
              required: true,
              label: 'Timestamp',
              description: 'Unix timestamp in seconds or milliseconds',
              aiControlled: false
            },
            properties: {
              type: 'object',
              required: false,
              label: 'Properties',
              description: 'Event properties',
              aiControlled: false
            },
            insertId: {
              type: 'string',
              required: false,
              label: 'Insert ID',
              maxLength: 36,
              aiControlled: false
            }
          }
        },
        strict: {
          type: 'boolean',
          required: false,
          label: 'Strict Validation',
          default: true,
          description: 'Enable strict validation (recommended)',
          aiControlled: false
        }
      },
      outputSchema: {
        success: { type: 'boolean' },
        code: { type: 'number', description: 'Response code' },
        num_records_imported: { type: 'number', description: 'Number of events imported' },
        status: { type: 'string', description: 'Import status message' }
      }
    },

    // Profile Operations
    {
      id: 'profile_set',
      name: 'Set Profile Properties',
      description: 'Create or update user profile properties',
      category: 'Profiles',
      icon: 'user',
      api: {
        endpoint: '/engage',
        method: 'POST',
        baseUrl: 'https://api.mixpanel.com',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'Accept': 'application/json'
        }
      },
      inputSchema: {
        distinctId: {
          type: 'string',
          required: true,
          label: 'Distinct ID',
          placeholder: 'user-123',
          description: 'Unique identifier for the user',
          aiControlled: false
        },
        properties: {
          type: 'object',
          required: true,
          label: 'Profile Properties',
          description: 'Properties to set on the profile (creates profile if not exists)',
          placeholder: '{ "$name": "John Doe", "$email": "john@example.com", "plan": "premium" }',
          aiControlled: false
        },
        ip: {
          type: 'string',
          required: false,
          label: 'IP Address',
          description: 'IP address for GeoIP enrichment',
          placeholder: '136.24.0.114',
          aiControlled: false
        },
        time: {
          type: 'number',
          required: false,
          label: 'Timestamp',
          description: 'Unix timestamp in seconds',
          aiControlled: false
        },
        ignoreTime: {
          type: 'boolean',
          required: false,
          label: 'Ignore Time',
          default: false,
          description: 'If true, Mixpanel will not update $last_seen',
          aiControlled: false
        }
      },
      outputSchema: {
        success: { type: 'boolean' },
        status: { type: 'number' }
      }
    },
    {
      id: 'profile_set_once',
      name: 'Set Profile Properties Once',
      description: 'Set profile properties only if they do not exist',
      category: 'Profiles',
      icon: 'user-plus',
      api: {
        endpoint: '/engage',
        method: 'POST',
        baseUrl: 'https://api.mixpanel.com'
      },
      inputSchema: {
        distinctId: {
          type: 'string',
          required: true,
          label: 'Distinct ID',
          placeholder: 'user-123',
          aiControlled: false
        },
        properties: {
          type: 'object',
          required: true,
          label: 'Profile Properties',
          description: 'Properties to set only if they don\'t exist',
          placeholder: '{ "first_seen_source": "organic" }',
          aiControlled: false
        },
        ip: {
          type: 'string',
          required: false,
          label: 'IP Address',
          aiControlled: false
        },
        time: {
          type: 'number',
          required: false,
          label: 'Timestamp',
          aiControlled: false
        }
      },
      outputSchema: {
        success: { type: 'boolean' },
        status: { type: 'number' }
      }
    },
    {
      id: 'profile_increment',
      name: 'Increment Profile Property',
      description: 'Increment or decrement numeric profile properties',
      category: 'Profiles',
      icon: 'plus-circle',
      api: {
        endpoint: '/engage',
        method: 'POST',
        baseUrl: 'https://api.mixpanel.com'
      },
      inputSchema: {
        distinctId: {
          type: 'string',
          required: true,
          label: 'Distinct ID',
          placeholder: 'user-123',
          aiControlled: false
        },
        properties: {
          type: 'object',
          required: true,
          label: 'Properties to Increment',
          description: 'Numeric properties with increment values (use negative for decrement)',
          placeholder: '{ "login_count": 1, "credits": -5 }',
          aiControlled: false
        },
        time: {
          type: 'number',
          required: false,
          label: 'Timestamp',
          aiControlled: false
        }
      },
      outputSchema: {
        success: { type: 'boolean' },
        status: { type: 'number' }
      }
    },
    {
      id: 'profile_append',
      name: 'Append to List Property',
      description: 'Append values to a list property',
      category: 'Profiles',
      icon: 'list',
      api: {
        endpoint: '/engage',
        method: 'POST',
        baseUrl: 'https://api.mixpanel.com'
      },
      inputSchema: {
        distinctId: {
          type: 'string',
          required: true,
          label: 'Distinct ID',
          placeholder: 'user-123',
          aiControlled: false
        },
        properties: {
          type: 'object',
          required: true,
          label: 'Values to Append',
          description: 'Properties with values to append to lists',
          placeholder: '{ "recent_purchases": "Product A", "tags": "vip" }',
          aiControlled: false
        },
        time: {
          type: 'number',
          required: false,
          label: 'Timestamp',
          aiControlled: false
        }
      },
      outputSchema: {
        success: { type: 'boolean' },
        status: { type: 'number' }
      }
    },
    {
      id: 'profile_union',
      name: 'Union to List Property',
      description: 'Add values to a list property without duplicates',
      category: 'Profiles',
      icon: 'git-merge',
      api: {
        endpoint: '/engage',
        method: 'POST',
        baseUrl: 'https://api.mixpanel.com'
      },
      inputSchema: {
        distinctId: {
          type: 'string',
          required: true,
          label: 'Distinct ID',
          placeholder: 'user-123',
          aiControlled: false
        },
        properties: {
          type: 'object',
          required: true,
          label: 'Values to Union',
          description: 'Properties with values to union (no duplicates)',
          placeholder: '{ "interests": ["analytics", "product"], "visited_pages": ["/pricing", "/features"] }',
          aiControlled: false
        },
        time: {
          type: 'number',
          required: false,
          label: 'Timestamp',
          aiControlled: false
        }
      },
      outputSchema: {
        success: { type: 'boolean' },
        status: { type: 'number' }
      }
    },
    {
      id: 'profile_remove',
      name: 'Remove from List Property',
      description: 'Remove values from a list property',
      category: 'Profiles',
      icon: 'minus-circle',
      api: {
        endpoint: '/engage',
        method: 'POST',
        baseUrl: 'https://api.mixpanel.com'
      },
      inputSchema: {
        distinctId: {
          type: 'string',
          required: true,
          label: 'Distinct ID',
          placeholder: 'user-123',
          aiControlled: false
        },
        properties: {
          type: 'object',
          required: true,
          label: 'Values to Remove',
          description: 'Properties with values to remove from lists',
          placeholder: '{ "interests": "sports", "tags": "trial" }',
          aiControlled: false
        },
        time: {
          type: 'number',
          required: false,
          label: 'Timestamp',
          aiControlled: false
        }
      },
      outputSchema: {
        success: { type: 'boolean' },
        status: { type: 'number' }
      }
    },
    {
      id: 'profile_unset',
      name: 'Delete Profile Properties',
      description: 'Remove specific properties from a profile',
      category: 'Profiles',
      icon: 'x-circle',
      api: {
        endpoint: '/engage',
        method: 'POST',
        baseUrl: 'https://api.mixpanel.com'
      },
      inputSchema: {
        distinctId: {
          type: 'string',
          required: true,
          label: 'Distinct ID',
          placeholder: 'user-123',
          aiControlled: false
        },
        properties: {
          type: 'array',
          required: true,
          label: 'Properties to Delete',
          description: 'Array of property names to remove',
          placeholder: '["temp_token", "old_preference"]',
          aiControlled: false
        },
        time: {
          type: 'number',
          required: false,
          label: 'Timestamp',
          aiControlled: false
        }
      },
      outputSchema: {
        success: { type: 'boolean' },
        status: { type: 'number' }
      }
    },
    {
      id: 'profile_delete',
      name: 'Delete Profile',
      description: 'Permanently delete a user profile',
      category: 'Profiles',
      icon: 'trash-2',
      api: {
        endpoint: '/engage',
        method: 'POST',
        baseUrl: 'https://api.mixpanel.com'
      },
      inputSchema: {
        distinctId: {
          type: 'string',
          required: true,
          label: 'Distinct ID',
          placeholder: 'user-123',
          description: 'User profile to delete',
          aiControlled: false
        },
        time: {
          type: 'number',
          required: false,
          label: 'Timestamp',
          aiControlled: false
        },
        ignoreAlias: {
          type: 'boolean',
          required: false,
          label: 'Ignore Alias',
          default: false,
          description: 'If true, delete the profile with this exact distinct_id',
          aiControlled: false
        }
      },
      outputSchema: {
        success: { type: 'boolean' },
        status: { type: 'number' }
      }
    },

    // Query Operations
    {
      id: 'query_profiles',
      name: 'Query Profiles',
      description: 'Query user profiles with filtering',
      category: 'Query',
      icon: 'search',
      api: {
        endpoint: '/api/query/engage',
        method: 'POST',
        baseUrl: 'https://mixpanel.com',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        }
      },
      inputSchema: {
        where: {
          type: 'string',
          required: false,
          label: 'Where Clause',
          description: 'Selector expression for filtering profiles',
          placeholder: 'properties["$email"] == "user@example.com"',
          inputType: 'textarea',
          aiControlled: false
        },
        sessionId: {
          type: 'string',
          required: false,
          label: 'Session ID',
          description: 'For pagination (from previous response)',
          aiControlled: false
        },
        page: {
          type: 'number',
          required: false,
          label: 'Page Number',
          description: 'Page number (starts at 0)',
          default: 0,
          min: 0,
          aiControlled: false
        },
        pageSize: {
          type: 'number',
          required: false,
          label: 'Page Size',
          description: 'Number of profiles per page',
          default: 1000,
          min: 1,
          max: 1000,
          aiControlled: false
        }
      },
      outputSchema: {
        results: {
          type: 'array',
          description: 'Array of matching profiles'
        },
        page: { type: 'number' },
        page_size: { type: 'number' },
        session_id: { type: 'string', description: 'Use for next page' },
        total: { type: 'number', description: 'Total matching profiles' }
      }
    },
    {
      id: 'query_insights',
      name: 'Query Insights',
      description: 'Get insights data (trends and compositions)',
      category: 'Query',
      icon: 'trending-up',
      api: {
        endpoint: '/api/2.0/insights',
        method: 'GET',
        baseUrl: 'https://mixpanel.com'
      },
      inputSchema: {
        fromDate: {
          type: 'string',
          required: true,
          label: 'From Date',
          description: 'Start date (YYYY-MM-DD)',
          placeholder: '2024-01-01',
          aiControlled: false
        },
        toDate: {
          type: 'string',
          required: true,
          label: 'To Date',
          description: 'End date (YYYY-MM-DD)',
          placeholder: '2024-01-31',
          aiControlled: false
        },
        events: {
          type: 'array',
          required: true,
          label: 'Events',
          description: 'Array of event names to query',
          placeholder: '["Signup", "Purchase"]',
          aiControlled: false
        },
        type: {
          type: 'select',
          required: false,
          label: 'Analysis Type',
          default: 'general',
          options: [
            { label: 'General (Total)', value: 'general' },
            { label: 'Unique', value: 'unique' },
            { label: 'Average', value: 'average' }
          ],
          description: 'Type of analysis to perform',
          aiControlled: false
        },
        unit: {
          type: 'select',
          required: false,
          label: 'Time Unit',
          default: 'day',
          options: [
            { label: 'Minute', value: 'minute' },
            { label: 'Hour', value: 'hour' },
            { label: 'Day', value: 'day' },
            { label: 'Week', value: 'week' },
            { label: 'Month', value: 'month' }
          ],
          description: 'Time unit for grouping results',
          aiControlled: false
        }
      },
      outputSchema: {
        data: { type: 'object', description: 'Insights data' },
        series: { type: 'array', description: 'Time series data' }
      }
    },
    {
      id: 'query_funnels',
      name: 'Query Funnels',
      description: 'Analyze conversion funnels',
      category: 'Query',
      icon: 'filter',
      api: {
        endpoint: '/api/2.0/funnels',
        method: 'GET',
        baseUrl: 'https://mixpanel.com'
      },
      inputSchema: {
        funnelId: {
          type: 'number',
          required: true,
          label: 'Funnel ID',
          description: 'ID of the saved funnel',
          placeholder: '12345',
          aiControlled: false
        },
        fromDate: {
          type: 'string',
          required: true,
          label: 'From Date',
          description: 'Start date (YYYY-MM-DD)',
          placeholder: '2024-01-01',
          aiControlled: false
        },
        toDate: {
          type: 'string',
          required: true,
          label: 'To Date',
          description: 'End date (YYYY-MM-DD)',
          placeholder: '2024-01-31',
          aiControlled: false
        },
        unit: {
          type: 'select',
          required: false,
          label: 'Time Unit',
          default: 'day',
          options: [
            { label: 'Day', value: 'day' },
            { label: 'Week', value: 'week' },
            { label: 'Month', value: 'month' }
          ],
          aiControlled: false
        },
        interval: {
          type: 'number',
          required: false,
          label: 'Interval',
          description: 'Number of time units',
          default: 1,
          min: 1,
          aiControlled: false
        }
      },
      outputSchema: {
        data: { type: 'object', description: 'Funnel analysis data' },
        meta: {
          type: 'object',
          description: 'Metadata including conversion rates',
          properties: {
            overall_conv_ratio: { type: 'number' }
          }
        }
      }
    },
    {
      id: 'query_retention',
      name: 'Query Retention',
      description: 'Analyze user retention cohorts',
      category: 'Query',
      icon: 'users',
      api: {
        endpoint: '/api/2.0/retention',
        method: 'GET',
        baseUrl: 'https://mixpanel.com'
      },
      inputSchema: {
        fromDate: {
          type: 'string',
          required: true,
          label: 'From Date',
          description: 'Start date (YYYY-MM-DD)',
          placeholder: '2024-01-01',
          aiControlled: false
        },
        toDate: {
          type: 'string',
          required: true,
          label: 'To Date',
          description: 'End date (YYYY-MM-DD)',
          placeholder: '2024-01-31',
          aiControlled: false
        },
        retentionType: {
          type: 'select',
          required: false,
          label: 'Retention Type',
          default: 'birth',
          options: [
            { label: 'Birth (First Time)', value: 'birth' },
            { label: 'Compounded (Any Time)', value: 'compounded' }
          ],
          aiControlled: false
        },
        bornEvent: {
          type: 'string',
          required: false,
          label: 'Born Event',
          description: 'Event that starts the cohort',
          placeholder: 'Signup',
          aiControlled: false
        },
        event: {
          type: 'string',
          required: false,
          label: 'Return Event',
          description: 'Event to measure for retention',
          placeholder: 'Login',
          aiControlled: false
        },
        unit: {
          type: 'select',
          required: false,
          label: 'Time Unit',
          default: 'day',
          options: [
            { label: 'Day', value: 'day' },
            { label: 'Week', value: 'week' },
            { label: 'Month', value: 'month' }
          ],
          aiControlled: false
        }
      },
      outputSchema: {
        data: { type: 'array', description: 'Retention cohort data' },
        series: { type: 'array', description: 'Time series' }
      }
    },
    {
      id: 'export_events',
      name: 'Export Raw Events',
      description: 'Export raw event data for a date range',
      category: 'Export',
      icon: 'download-cloud',
      api: {
        endpoint: '/api/2.0/export',
        method: 'GET',
        baseUrl: 'https://data.mixpanel.com'
      },
      inputSchema: {
        fromDate: {
          type: 'string',
          required: true,
          label: 'From Date',
          description: 'Start date (YYYY-MM-DD)',
          placeholder: '2024-01-01',
          aiControlled: false
        },
        toDate: {
          type: 'string',
          required: true,
          label: 'To Date',
          description: 'End date (YYYY-MM-DD)',
          placeholder: '2024-01-31',
          aiControlled: false
        },
        event: {
          type: 'array',
          required: false,
          label: 'Events',
          description: 'Filter by specific events (leave empty for all)',
          placeholder: '["Signup", "Purchase"]',
          aiControlled: false
        },
        where: {
          type: 'string',
          required: false,
          label: 'Where Clause',
          description: 'Filter expression',
          inputType: 'textarea',
          placeholder: 'properties["$browser"] == "Chrome"',
          aiControlled: false
        },
        limit: {
          type: 'number',
          required: false,
          label: 'Limit',
          description: 'Maximum number of events to return',
          min: 1,
          aiControlled: false
        }
      },
      outputSchema: {
        events: { type: 'array', description: 'Array of raw event data' },
        format: { type: 'string', description: 'NDJSON format' }
      }
    }
  ],

  supported_triggers: []
};
