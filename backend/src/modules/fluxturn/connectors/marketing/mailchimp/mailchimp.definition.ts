// Mailchimp Connector
// Comprehensive connector definition with all Mailchimp API capabilities
// Ported from n8n Mailchimp node

import { ConnectorDefinition } from '../../shared';

export const MAILCHIMP_CONNECTOR: ConnectorDefinition = {
  name: 'mailchimp',
  display_name: 'Mailchimp',
  category: 'marketing',
  description: 'Mailchimp is an email marketing and automation platform that helps businesses manage mailing lists, create campaigns, and analyze engagement.',
  auth_type: 'api_key',
  auth_types: [
    { value: 'api_key', label: 'API Key' },
    { value: 'oauth2', label: 'OAuth2' }
  ],
  verified: false,

  auth_fields: [
    {
      key: 'apiKey',
      label: 'API Key',
      type: 'password',
      required: true,
      placeholder: 'xxxxxxxxxxxxxxxx-us6',
      description: 'Your Mailchimp API key. The datacenter (e.g., us6) is extracted from the suffix after the hyphen.',
      helpUrl: 'https://mailchimp.com/help/about-api-keys/',
      helpText: 'How to get your API key'
    }
  ],

  oauth_config: {
    authorization_url: 'https://login.mailchimp.com/oauth2/authorize',
    token_url: 'https://login.mailchimp.com/oauth2/token',
    scopes: []
  },

  endpoints: {
    base_url: 'https://{datacenter}.api.mailchimp.com/3.0',
    lists: '/lists',
    members: '/lists/{listId}/members',
    campaigns: '/campaigns',
    templates: '/templates',
    webhooks: '/lists/{listId}/webhooks'
  },

  webhook_support: true,

  rate_limits: {
    requests_per_second: 10,
    requests_per_minute: 600
  },

  sandbox_available: false,

  // ============================================
  // SUPPORTED ACTIONS - Complete Mailchimp API Coverage
  // ============================================
  supported_actions: [
    // ==========================================
    // MEMBER ACTIONS
    // ==========================================
    {
      id: 'create_member',
      name: 'Create Member',
      description: 'Add a new subscriber to a list/audience',
      category: 'Members',
      icon: 'user-plus',
      verified: false,
      api: {
        endpoint: '/lists/{listId}/members',
        method: 'POST',
        baseUrl: 'https://{datacenter}.api.mailchimp.com/3.0',
        headers: { 'Content-Type': 'application/json' }
      },
      inputSchema: {
        listId: {
          type: 'string',
          required: true,
          label: 'List/Audience ID',
          placeholder: 'abc123def4',
          description: 'The unique ID for the list/audience',
          aiControlled: false
        },
        email: {
          type: 'string',
          required: true,
          label: 'Email Address',
          placeholder: 'subscriber@example.com',
          description: 'Email address of the subscriber',
          aiControlled: true,
          aiDescription: 'The email address to subscribe'
        },
        status: {
          type: 'select',
          required: true,
          label: 'Status',
          default: 'subscribed',
          options: [
            { label: 'Subscribed', value: 'subscribed' },
            { label: 'Unsubscribed', value: 'unsubscribed' },
            { label: 'Cleaned', value: 'cleaned' },
            { label: 'Pending', value: 'pending' },
            { label: 'Transactional', value: 'transactional' }
          ],
          description: 'Subscription status',
          aiControlled: false
        },
        emailType: {
          type: 'select',
          required: false,
          label: 'Email Type',
          default: 'html',
          options: [
            { label: 'HTML', value: 'html' },
            { label: 'Plain Text', value: 'text' }
          ],
          description: 'Preferred email format',
          aiControlled: false
        },
        language: {
          type: 'string',
          required: false,
          label: 'Language',
          placeholder: 'en',
          description: 'Subscriber language code (ISO 639-1)',
          aiControlled: false
        },
        vip: {
          type: 'boolean',
          required: false,
          label: 'VIP Status',
          default: false,
          description: 'Mark subscriber as VIP',
          aiControlled: false
        },
        tags: {
          type: 'string',
          required: false,
          label: 'Tags',
          placeholder: 'tag1, tag2, tag3',
          description: 'Comma-separated list of tags to assign',
          aiControlled: true,
          aiDescription: 'Tags to assign to the subscriber (comma-separated)'
        },
        firstName: {
          type: 'string',
          required: false,
          label: 'First Name',
          placeholder: 'John',
          description: 'Subscriber first name (FNAME merge field)',
          aiControlled: true,
          aiDescription: 'First name of the subscriber'
        },
        lastName: {
          type: 'string',
          required: false,
          label: 'Last Name',
          placeholder: 'Doe',
          description: 'Subscriber last name (LNAME merge field)',
          aiControlled: true,
          aiDescription: 'Last name of the subscriber'
        },
        birthday: {
          type: 'string',
          required: false,
          label: 'Birthday',
          placeholder: 'MM/DD',
          description: 'Birthday in MM/DD format',
          aiControlled: false
        },
        latitude: {
          type: 'number',
          required: false,
          label: 'Latitude',
          description: 'Geographic latitude',
          aiControlled: false
        },
        longitude: {
          type: 'number',
          required: false,
          label: 'Longitude',
          description: 'Geographic longitude',
          aiControlled: false
        },
        ipSignup: {
          type: 'string',
          required: false,
          label: 'Signup IP',
          placeholder: '192.168.1.1',
          description: 'IP address at signup',
          aiControlled: false
        },
        ipOptIn: {
          type: 'string',
          required: false,
          label: 'Opt-in IP',
          placeholder: '192.168.1.1',
          description: 'IP address at opt-in confirmation',
          aiControlled: false
        },
        timestampSignup: {
          type: 'string',
          required: false,
          label: 'Signup Timestamp',
          placeholder: '2024-01-15 10:30:00',
          description: 'Date and time of signup (YYYY-MM-DD HH:MM:SS)',
          aiControlled: false
        },
        timestampOptIn: {
          type: 'string',
          required: false,
          label: 'Opt-in Timestamp',
          placeholder: '2024-01-15 10:35:00',
          description: 'Date and time of opt-in confirmation',
          aiControlled: false
        }
      },
      outputSchema: {
        success: { type: 'boolean', description: 'Whether the operation was successful' },
        data: {
          type: 'object',
          description: 'Created member data',
          properties: {
            id: { type: 'string', description: 'Member ID (MD5 hash of email)' },
            email_address: { type: 'string', description: 'Email address' },
            status: { type: 'string', description: 'Subscription status' }
          }
        }
      }
    },
    {
      id: 'get_member',
      name: 'Get Member',
      description: 'Get information about a specific subscriber',
      category: 'Members',
      icon: 'user',
      verified: false,
      api: {
        endpoint: '/lists/{listId}/members/{subscriberHash}',
        method: 'GET',
        baseUrl: 'https://{datacenter}.api.mailchimp.com/3.0'
      },
      inputSchema: {
        listId: {
          type: 'string',
          required: true,
          label: 'List/Audience ID',
          description: 'The unique ID for the list/audience',
          aiControlled: false
        },
        email: {
          type: 'string',
          required: true,
          label: 'Email Address',
          placeholder: 'subscriber@example.com',
          description: 'Email address of the subscriber',
          aiControlled: false
        }
      },
      outputSchema: {
        success: { type: 'boolean' },
        data: { type: 'object', description: 'Member data' }
      }
    },
    {
      id: 'get_all_members',
      name: 'Get All Members',
      description: 'Get all subscribers from a list/audience',
      category: 'Members',
      icon: 'users',
      verified: false,
      api: {
        endpoint: '/lists/{listId}/members',
        method: 'GET',
        baseUrl: 'https://{datacenter}.api.mailchimp.com/3.0'
      },
      inputSchema: {
        listId: {
          type: 'string',
          required: true,
          label: 'List/Audience ID',
          description: 'The unique ID for the list/audience',
          aiControlled: false
        },
        returnAll: {
          type: 'boolean',
          required: false,
          label: 'Return All',
          default: false,
          description: 'Return all results (handles pagination automatically)',
          aiControlled: false
        },
        limit: {
          type: 'number',
          required: false,
          label: 'Limit',
          default: 100,
          min: 1,
          max: 1000,
          description: 'Maximum number of results to return',
          aiControlled: false
        },
        status: {
          type: 'select',
          required: false,
          label: 'Status Filter',
          options: [
            { label: 'All', value: '' },
            { label: 'Subscribed', value: 'subscribed' },
            { label: 'Unsubscribed', value: 'unsubscribed' },
            { label: 'Cleaned', value: 'cleaned' },
            { label: 'Pending', value: 'pending' },
            { label: 'Transactional', value: 'transactional' }
          ],
          description: 'Filter by subscription status',
          aiControlled: false
        },
        emailType: {
          type: 'select',
          required: false,
          label: 'Email Type Filter',
          options: [
            { label: 'All', value: '' },
            { label: 'HTML', value: 'html' },
            { label: 'Plain Text', value: 'text' }
          ],
          description: 'Filter by email type preference',
          aiControlled: false
        },
        sinceLastChanged: {
          type: 'string',
          required: false,
          label: 'Since Last Changed',
          placeholder: '2024-01-01T00:00:00Z',
          description: 'Return members changed after this date (ISO 8601)',
          aiControlled: false
        },
        beforeLastChanged: {
          type: 'string',
          required: false,
          label: 'Before Last Changed',
          placeholder: '2024-12-31T23:59:59Z',
          description: 'Return members changed before this date (ISO 8601)',
          aiControlled: false
        }
      },
      outputSchema: {
        success: { type: 'boolean' },
        data: { type: 'array', description: 'List of members' },
        total_items: { type: 'number', description: 'Total count' }
      }
    },
    {
      id: 'update_member',
      name: 'Update Member',
      description: 'Update an existing subscriber',
      category: 'Members',
      icon: 'edit',
      verified: false,
      api: {
        endpoint: '/lists/{listId}/members/{subscriberHash}',
        method: 'PATCH',
        baseUrl: 'https://{datacenter}.api.mailchimp.com/3.0',
        headers: { 'Content-Type': 'application/json' }
      },
      inputSchema: {
        listId: {
          type: 'string',
          required: true,
          label: 'List/Audience ID',
          description: 'The unique ID for the list/audience',
          aiControlled: false
        },
        email: {
          type: 'string',
          required: true,
          label: 'Email Address',
          description: 'Email address of the subscriber to update',
          aiControlled: false
        },
        status: {
          type: 'select',
          required: false,
          label: 'Status',
          options: [
            { label: 'Subscribed', value: 'subscribed' },
            { label: 'Unsubscribed', value: 'unsubscribed' },
            { label: 'Cleaned', value: 'cleaned' },
            { label: 'Pending', value: 'pending' }
          ],
          description: 'New subscription status',
          aiControlled: false
        },
        emailType: {
          type: 'select',
          required: false,
          label: 'Email Type',
          options: [
            { label: 'HTML', value: 'html' },
            { label: 'Plain Text', value: 'text' }
          ],
          description: 'Preferred email format',
          aiControlled: false
        },
        language: {
          type: 'string',
          required: false,
          label: 'Language',
          description: 'Language code (ISO 639-1)',
          aiControlled: false
        },
        vip: {
          type: 'boolean',
          required: false,
          label: 'VIP Status',
          description: 'VIP status',
          aiControlled: false
        },
        firstName: {
          type: 'string',
          required: false,
          label: 'First Name',
          description: 'Updated first name',
          aiControlled: true,
          aiDescription: 'New first name for the subscriber'
        },
        lastName: {
          type: 'string',
          required: false,
          label: 'Last Name',
          description: 'Updated last name',
          aiControlled: true,
          aiDescription: 'New last name for the subscriber'
        },
        skipMergeValidation: {
          type: 'boolean',
          required: false,
          label: 'Skip Merge Validation',
          default: false,
          description: 'Skip validation of required merge fields',
          aiControlled: false
        }
      },
      outputSchema: {
        success: { type: 'boolean' },
        data: { type: 'object', description: 'Updated member data' }
      }
    },
    {
      id: 'delete_member',
      name: 'Delete Member',
      description: 'Permanently delete a subscriber from a list',
      category: 'Members',
      icon: 'trash',
      verified: false,
      api: {
        endpoint: '/lists/{listId}/members/{subscriberHash}',
        method: 'DELETE',
        baseUrl: 'https://{datacenter}.api.mailchimp.com/3.0'
      },
      inputSchema: {
        listId: {
          type: 'string',
          required: true,
          label: 'List/Audience ID',
          description: 'The unique ID for the list/audience',
          aiControlled: false
        },
        email: {
          type: 'string',
          required: true,
          label: 'Email Address',
          description: 'Email address of the subscriber to delete',
          aiControlled: false
        }
      },
      outputSchema: {
        success: { type: 'boolean' }
      }
    },

    // ==========================================
    // MEMBER TAG ACTIONS
    // ==========================================
    {
      id: 'add_member_tags',
      name: 'Add Tags to Member',
      description: 'Add tags to a list member',
      category: 'Member Tags',
      icon: 'tag',
      verified: false,
      api: {
        endpoint: '/lists/{listId}/members/{subscriberHash}/tags',
        method: 'POST',
        baseUrl: 'https://{datacenter}.api.mailchimp.com/3.0',
        headers: { 'Content-Type': 'application/json' }
      },
      inputSchema: {
        listId: {
          type: 'string',
          required: true,
          label: 'List/Audience ID',
          description: 'The unique ID for the list/audience',
          aiControlled: false
        },
        email: {
          type: 'string',
          required: true,
          label: 'Email Address',
          description: 'Email address of the subscriber',
          aiControlled: false
        },
        tags: {
          type: 'string',
          required: true,
          label: 'Tags',
          placeholder: 'tag1, tag2, tag3',
          description: 'Comma-separated list of tags to add',
          aiControlled: true,
          aiDescription: 'Tags to add to the subscriber (comma-separated)'
        },
        isSyncing: {
          type: 'boolean',
          required: false,
          label: 'Is Syncing',
          default: false,
          description: 'Set to true to prevent automation triggering',
          aiControlled: false
        }
      },
      outputSchema: {
        success: { type: 'boolean' }
      }
    },
    {
      id: 'remove_member_tags',
      name: 'Remove Tags from Member',
      description: 'Remove tags from a list member',
      category: 'Member Tags',
      icon: 'tag',
      verified: false,
      api: {
        endpoint: '/lists/{listId}/members/{subscriberHash}/tags',
        method: 'POST',
        baseUrl: 'https://{datacenter}.api.mailchimp.com/3.0',
        headers: { 'Content-Type': 'application/json' }
      },
      inputSchema: {
        listId: {
          type: 'string',
          required: true,
          label: 'List/Audience ID',
          description: 'The unique ID for the list/audience',
          aiControlled: false
        },
        email: {
          type: 'string',
          required: true,
          label: 'Email Address',
          description: 'Email address of the subscriber',
          aiControlled: false
        },
        tags: {
          type: 'string',
          required: true,
          label: 'Tags',
          placeholder: 'tag1, tag2, tag3',
          description: 'Comma-separated list of tags to remove',
          aiControlled: true,
          aiDescription: 'Tags to remove from the subscriber (comma-separated)'
        },
        isSyncing: {
          type: 'boolean',
          required: false,
          label: 'Is Syncing',
          default: false,
          description: 'Set to true to prevent automation triggering',
          aiControlled: false
        }
      },
      outputSchema: {
        success: { type: 'boolean' }
      }
    },

    // ==========================================
    // CAMPAIGN ACTIONS
    // ==========================================
    {
      id: 'get_campaign',
      name: 'Get Campaign',
      description: 'Get information about a specific campaign',
      category: 'Campaigns',
      icon: 'mail',
      verified: false,
      api: {
        endpoint: '/campaigns/{campaignId}',
        method: 'GET',
        baseUrl: 'https://{datacenter}.api.mailchimp.com/3.0'
      },
      inputSchema: {
        campaignId: {
          type: 'string',
          required: true,
          label: 'Campaign ID',
          description: 'The unique ID for the campaign',
          aiControlled: false
        }
      },
      outputSchema: {
        success: { type: 'boolean' },
        data: { type: 'object', description: 'Campaign data' }
      }
    },
    {
      id: 'get_all_campaigns',
      name: 'Get All Campaigns',
      description: 'Get all campaigns with optional filtering',
      category: 'Campaigns',
      icon: 'mail',
      verified: false,
      api: {
        endpoint: '/campaigns',
        method: 'GET',
        baseUrl: 'https://{datacenter}.api.mailchimp.com/3.0'
      },
      inputSchema: {
        returnAll: {
          type: 'boolean',
          required: false,
          label: 'Return All',
          default: false,
          description: 'Return all results (handles pagination automatically)',
          aiControlled: false
        },
        limit: {
          type: 'number',
          required: false,
          label: 'Limit',
          default: 10,
          min: 1,
          max: 1000,
          description: 'Maximum number of results to return',
          aiControlled: false
        },
        status: {
          type: 'select',
          required: false,
          label: 'Status Filter',
          options: [
            { label: 'All', value: '' },
            { label: 'Save (Draft)', value: 'save' },
            { label: 'Sending', value: 'sending' },
            { label: 'Sent', value: 'sent' },
            { label: 'Scheduled', value: 'schedule' }
          ],
          description: 'Filter by campaign status',
          aiControlled: false
        },
        listId: {
          type: 'string',
          required: false,
          label: 'List/Audience ID',
          description: 'Filter by list/audience ID',
          aiControlled: false
        },
        sinceCreateTime: {
          type: 'string',
          required: false,
          label: 'Since Create Time',
          placeholder: '2024-01-01T00:00:00Z',
          description: 'Return campaigns created after this date (ISO 8601)',
          aiControlled: false
        },
        beforeCreateTime: {
          type: 'string',
          required: false,
          label: 'Before Create Time',
          placeholder: '2024-12-31T23:59:59Z',
          description: 'Return campaigns created before this date (ISO 8601)',
          aiControlled: false
        },
        sinceSendTime: {
          type: 'string',
          required: false,
          label: 'Since Send Time',
          description: 'Return campaigns sent after this date (ISO 8601)',
          aiControlled: false
        },
        beforeSendTime: {
          type: 'string',
          required: false,
          label: 'Before Send Time',
          description: 'Return campaigns sent before this date (ISO 8601)',
          aiControlled: false
        },
        sortField: {
          type: 'select',
          required: false,
          label: 'Sort Field',
          default: 'create_time',
          options: [
            { label: 'Create Time', value: 'create_time' },
            { label: 'Send Time', value: 'send_time' }
          ],
          description: 'Field to sort by',
          aiControlled: false
        },
        sortDirection: {
          type: 'select',
          required: false,
          label: 'Sort Direction',
          default: 'DESC',
          options: [
            { label: 'Ascending', value: 'ASC' },
            { label: 'Descending', value: 'DESC' }
          ],
          description: 'Sort direction',
          aiControlled: false
        }
      },
      outputSchema: {
        success: { type: 'boolean' },
        data: { type: 'array', description: 'List of campaigns' },
        total_items: { type: 'number', description: 'Total count' }
      }
    },
    {
      id: 'send_campaign',
      name: 'Send Campaign',
      description: 'Send a campaign immediately',
      category: 'Campaigns',
      icon: 'send',
      verified: false,
      api: {
        endpoint: '/campaigns/{campaignId}/actions/send',
        method: 'POST',
        baseUrl: 'https://{datacenter}.api.mailchimp.com/3.0'
      },
      inputSchema: {
        campaignId: {
          type: 'string',
          required: true,
          label: 'Campaign ID',
          description: 'The unique ID for the campaign to send',
          aiControlled: false
        }
      },
      outputSchema: {
        success: { type: 'boolean' }
      }
    },
    {
      id: 'delete_campaign',
      name: 'Delete Campaign',
      description: 'Delete a campaign',
      category: 'Campaigns',
      icon: 'trash',
      verified: false,
      api: {
        endpoint: '/campaigns/{campaignId}',
        method: 'DELETE',
        baseUrl: 'https://{datacenter}.api.mailchimp.com/3.0'
      },
      inputSchema: {
        campaignId: {
          type: 'string',
          required: true,
          label: 'Campaign ID',
          description: 'The unique ID for the campaign to delete',
          aiControlled: false
        }
      },
      outputSchema: {
        success: { type: 'boolean' }
      }
    },
    {
      id: 'replicate_campaign',
      name: 'Replicate Campaign',
      description: 'Create a copy of an existing campaign',
      category: 'Campaigns',
      icon: 'copy',
      verified: false,
      api: {
        endpoint: '/campaigns/{campaignId}/actions/replicate',
        method: 'POST',
        baseUrl: 'https://{datacenter}.api.mailchimp.com/3.0'
      },
      inputSchema: {
        campaignId: {
          type: 'string',
          required: true,
          label: 'Campaign ID',
          description: 'The unique ID for the campaign to replicate',
          aiControlled: false
        }
      },
      outputSchema: {
        success: { type: 'boolean' },
        data: { type: 'object', description: 'New campaign data' }
      }
    },
    {
      id: 'resend_campaign',
      name: 'Resend Campaign',
      description: 'Create a Resend to Non-Openers version of a campaign',
      category: 'Campaigns',
      icon: 'refresh-cw',
      verified: false,
      api: {
        endpoint: '/campaigns/{campaignId}/actions/create-resend',
        method: 'POST',
        baseUrl: 'https://{datacenter}.api.mailchimp.com/3.0'
      },
      inputSchema: {
        campaignId: {
          type: 'string',
          required: true,
          label: 'Campaign ID',
          description: 'The unique ID for the campaign to resend',
          aiControlled: false
        }
      },
      outputSchema: {
        success: { type: 'boolean' },
        data: { type: 'object', description: 'New resend campaign data' }
      }
    },

    // ==========================================
    // LIST GROUP ACTIONS
    // ==========================================
    {
      id: 'get_list_groups',
      name: 'Get List Groups',
      description: 'Get all interest groups (categories) for a list',
      category: 'List Groups',
      icon: 'folder',
      verified: false,
      api: {
        endpoint: '/lists/{listId}/interest-categories/{categoryId}/interests',
        method: 'GET',
        baseUrl: 'https://{datacenter}.api.mailchimp.com/3.0'
      },
      inputSchema: {
        listId: {
          type: 'string',
          required: true,
          label: 'List/Audience ID',
          description: 'The unique ID for the list/audience',
          aiControlled: false
        },
        categoryId: {
          type: 'string',
          required: true,
          label: 'Interest Category ID',
          description: 'The unique ID for the interest category/group',
          aiControlled: false
        },
        returnAll: {
          type: 'boolean',
          required: false,
          label: 'Return All',
          default: false,
          description: 'Return all results',
          aiControlled: false
        },
        limit: {
          type: 'number',
          required: false,
          label: 'Limit',
          default: 100,
          min: 1,
          max: 1000,
          description: 'Maximum number of results to return',
          aiControlled: false
        }
      },
      outputSchema: {
        success: { type: 'boolean' },
        data: { type: 'array', description: 'List of interest groups' }
      }
    },

    // ==========================================
    // LIST ACTIONS
    // ==========================================
    {
      id: 'get_lists',
      name: 'Get Lists',
      description: 'Get all lists/audiences',
      category: 'Lists',
      icon: 'list',
      verified: false,
      api: {
        endpoint: '/lists',
        method: 'GET',
        baseUrl: 'https://{datacenter}.api.mailchimp.com/3.0'
      },
      inputSchema: {
        returnAll: {
          type: 'boolean',
          required: false,
          label: 'Return All',
          default: false,
          description: 'Return all results',
          aiControlled: false
        },
        limit: {
          type: 'number',
          required: false,
          label: 'Limit',
          default: 100,
          description: 'Maximum number of results',
          aiControlled: false
        }
      },
      outputSchema: {
        success: { type: 'boolean' },
        data: { type: 'array', description: 'List of audiences' }
      }
    }
  ],

  // ============================================
  // SUPPORTED TRIGGERS - Webhook-based events
  // ============================================
  supported_triggers: [
    // ==========================================
    // SUBSCRIBER TRIGGERS
    // ==========================================
    {
      id: 'subscriber_added',
      name: 'Subscriber Added',
      description: 'Triggers when a new subscriber is added to a list',
      eventType: 'subscribe',
      icon: 'user-plus',
      verified: false,
      webhookRequired: true,
      pollingEnabled: false,
      inputSchema: {
        listId: {
          type: 'string',
          required: true,
          label: 'List/Audience ID',
          description: 'Select the list to watch for new subscribers'
        },
        sources: {
          type: 'select',
          required: false,
          label: 'Event Sources',
          default: 'all',
          options: [
            { label: 'All Sources', value: 'all' },
            { label: 'User Actions', value: 'user' },
            { label: 'Admin Actions', value: 'admin' },
            { label: 'API Actions', value: 'api' }
          ],
          description: 'Filter by event source'
        }
      },
      outputSchema: {
        mailchimpEvent: {
          type: 'object',
          description: 'Mailchimp webhook event data',
          properties: {
            type: { type: 'string', description: 'Event type (subscribe)' },
            data: {
              type: 'object',
              properties: {
                id: { type: 'string', description: 'Member ID' },
                email: { type: 'string', description: 'Email address' },
                email_type: { type: 'string', description: 'Email type preference' },
                list_id: { type: 'string', description: 'List ID' },
                merges: { type: 'object', description: 'Merge field values' }
              }
            }
          }
        },
        subscriber: { type: 'object', description: 'Subscriber data' },
        triggeredAt: { type: 'string', description: 'Timestamp when triggered' }
      }
    },
    {
      id: 'subscriber_removed',
      name: 'Subscriber Unsubscribed',
      description: 'Triggers when a subscriber unsubscribes from a list',
      eventType: 'unsubscribe',
      icon: 'user-minus',
      verified: false,
      webhookRequired: true,
      pollingEnabled: false,
      inputSchema: {
        listId: {
          type: 'string',
          required: true,
          label: 'List/Audience ID',
          description: 'Select the list to watch for unsubscribes'
        },
        sources: {
          type: 'select',
          required: false,
          label: 'Event Sources',
          default: 'all',
          options: [
            { label: 'All Sources', value: 'all' },
            { label: 'User Actions', value: 'user' },
            { label: 'Admin Actions', value: 'admin' },
            { label: 'API Actions', value: 'api' }
          ],
          description: 'Filter by event source'
        }
      },
      outputSchema: {
        mailchimpEvent: { type: 'object', description: 'Mailchimp webhook event data' },
        subscriber: { type: 'object', description: 'Subscriber data' },
        triggeredAt: { type: 'string', description: 'Timestamp when triggered' }
      }
    },
    {
      id: 'subscriber_cleaned',
      name: 'Subscriber Cleaned',
      description: 'Triggers when a subscriber email is cleaned from a list (hard bounce)',
      eventType: 'cleaned',
      icon: 'trash-2',
      verified: false,
      webhookRequired: true,
      pollingEnabled: false,
      inputSchema: {
        listId: {
          type: 'string',
          required: true,
          label: 'List/Audience ID',
          description: 'Select the list to watch for cleaned emails'
        },
        sources: {
          type: 'select',
          required: false,
          label: 'Event Sources',
          default: 'all',
          options: [
            { label: 'All Sources', value: 'all' },
            { label: 'User Actions', value: 'user' },
            { label: 'Admin Actions', value: 'admin' },
            { label: 'API Actions', value: 'api' }
          ],
          description: 'Filter by event source'
        }
      },
      outputSchema: {
        mailchimpEvent: { type: 'object', description: 'Mailchimp webhook event data' },
        subscriber: { type: 'object', description: 'Cleaned subscriber data' },
        reason: { type: 'string', description: 'Reason for cleaning (e.g., hard_bounce)' },
        triggeredAt: { type: 'string', description: 'Timestamp when triggered' }
      }
    },
    {
      id: 'subscriber_profile_updated',
      name: 'Subscriber Profile Updated',
      description: 'Triggers when a subscriber updates their profile',
      eventType: 'profile',
      icon: 'edit',
      verified: false,
      webhookRequired: true,
      pollingEnabled: false,
      inputSchema: {
        listId: {
          type: 'string',
          required: true,
          label: 'List/Audience ID',
          description: 'Select the list to watch for profile updates'
        },
        sources: {
          type: 'select',
          required: false,
          label: 'Event Sources',
          default: 'all',
          options: [
            { label: 'All Sources', value: 'all' },
            { label: 'User Actions', value: 'user' },
            { label: 'Admin Actions', value: 'admin' },
            { label: 'API Actions', value: 'api' }
          ],
          description: 'Filter by event source'
        }
      },
      outputSchema: {
        mailchimpEvent: { type: 'object', description: 'Mailchimp webhook event data' },
        subscriber: { type: 'object', description: 'Updated subscriber data' },
        triggeredAt: { type: 'string', description: 'Timestamp when triggered' }
      }
    },
    {
      id: 'subscriber_email_changed',
      name: 'Subscriber Email Changed',
      description: 'Triggers when a subscriber changes their email address',
      eventType: 'upemail',
      icon: 'at-sign',
      verified: false,
      webhookRequired: true,
      pollingEnabled: false,
      inputSchema: {
        listId: {
          type: 'string',
          required: true,
          label: 'List/Audience ID',
          description: 'Select the list to watch for email changes'
        },
        sources: {
          type: 'select',
          required: false,
          label: 'Event Sources',
          default: 'all',
          options: [
            { label: 'All Sources', value: 'all' },
            { label: 'User Actions', value: 'user' },
            { label: 'Admin Actions', value: 'admin' },
            { label: 'API Actions', value: 'api' }
          ],
          description: 'Filter by event source'
        }
      },
      outputSchema: {
        mailchimpEvent: { type: 'object', description: 'Mailchimp webhook event data' },
        oldEmail: { type: 'string', description: 'Previous email address' },
        newEmail: { type: 'string', description: 'New email address' },
        subscriber: { type: 'object', description: 'Subscriber data' },
        triggeredAt: { type: 'string', description: 'Timestamp when triggered' }
      }
    },

    // ==========================================
    // CAMPAIGN TRIGGERS
    // ==========================================
    {
      id: 'campaign_sent',
      name: 'Campaign Sent',
      description: 'Triggers when a campaign is sent or cancelled',
      eventType: 'campaign',
      icon: 'send',
      verified: false,
      webhookRequired: true,
      pollingEnabled: false,
      inputSchema: {
        listId: {
          type: 'string',
          required: true,
          label: 'List/Audience ID',
          description: 'Select the list to watch for campaign events'
        },
        sources: {
          type: 'select',
          required: false,
          label: 'Event Sources',
          default: 'all',
          options: [
            { label: 'All Sources', value: 'all' },
            { label: 'User Actions', value: 'user' },
            { label: 'Admin Actions', value: 'admin' },
            { label: 'API Actions', value: 'api' }
          ],
          description: 'Filter by event source'
        }
      },
      outputSchema: {
        mailchimpEvent: { type: 'object', description: 'Mailchimp webhook event data' },
        campaign: {
          type: 'object',
          description: 'Campaign data',
          properties: {
            id: { type: 'string', description: 'Campaign ID' },
            subject: { type: 'string', description: 'Campaign subject' },
            status: { type: 'string', description: 'Campaign status (sent/cancelled)' }
          }
        },
        triggeredAt: { type: 'string', description: 'Timestamp when triggered' }
      }
    }
  ]
};
