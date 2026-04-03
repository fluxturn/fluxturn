import { ConnectorDefinition } from '../../shared';

/**
 * Calendly Connector Definition
 *
 * Scheduling platform for meetings and appointments.
 * Primarily trigger-based - receives webhook events when
 * invitees schedule or cancel meetings.
 *
 * Resources:
 * - Events: Scheduled event types
 * - Invitees: People who schedule meetings
 * - Users: Calendly users
 *
 * Authentication:
 * - OAuth2 or Personal Access Token
 */
export const CALENDLY_CONNECTOR: ConnectorDefinition = {
  name: 'calendly',
  display_name: 'Calendly',
  category: 'communication',
  description: 'Scheduling platform for meetings and appointments with webhook triggers',

  auth_type: 'multiple',

  oauth_config: {
    authorization_url: 'https://auth.calendly.com/oauth/authorize',
    token_url: 'https://auth.calendly.com/oauth/token',
    scopes: [],
  },

  auth_fields: [
    {
      key: 'authType',
      label: 'Authentication Type',
      type: 'select',
      required: true,
      default: 'personalToken',
      options: [
        { label: 'Personal Access Token', value: 'personalToken' },
        { label: 'OAuth2', value: 'oauth2' },
      ],
    },
    {
      key: 'personalToken',
      label: 'Personal Access Token',
      type: 'password',
      required: true,
      placeholder: 'eyJraWQiOiIxY2...',
      description: 'Get from Calendly Integrations page',
      helpUrl: 'https://calendly.com/integrations/api_webhooks',
      displayOptions: {
        authType: ['personalToken'],
      },
    },
  ],

  endpoints: {
    base_url: 'https://api.calendly.com',
    users: '/users',
    event_types: '/event_types',
    scheduled_events: '/scheduled_events',
    invitees: '/invitees',
    webhooks: '/webhook_subscriptions',
  },

  webhook_support: true,
  rate_limits: {
    requests_per_second: 5,
  },

  supported_actions: [
    // ==================== USER OPERATIONS ====================
    {
      id: 'get_current_user',
      name: 'Get Current User',
      description: 'Get the currently authenticated user',
      category: 'Users',
      icon: 'user',
      api: {
        endpoint: '/users/me',
        method: 'GET',
        baseUrl: 'https://api.calendly.com',
        headers: {
          'Content-Type': 'application/json',
        },
      },
      inputSchema: {},
      outputSchema: {
        resource: {
          type: 'object',
          properties: {
            uri: { type: 'string' },
            name: { type: 'string' },
            email: { type: 'string' },
            scheduling_url: { type: 'string' },
            timezone: { type: 'string' },
          },
        },
      },
    },

    {
      id: 'get_user',
      name: 'Get User',
      description: 'Get a user by URI',
      category: 'Users',
      icon: 'user',
      api: {
        endpoint: '/users/{userUri}',
        method: 'GET',
        baseUrl: 'https://api.calendly.com',
      },
      inputSchema: {
        userUri: {
          type: 'string',
          required: true,
          label: 'User URI',
          placeholder: 'https://api.calendly.com/users/...',
          aiControlled: false,
        },
      },
      outputSchema: {
        resource: { type: 'object' },
      },
    },

    // ==================== EVENT TYPE OPERATIONS ====================
    {
      id: 'get_event_types',
      name: 'Get Event Types',
      description: 'Get all event types for a user',
      category: 'Event Types',
      icon: 'calendar',
      api: {
        endpoint: '/event_types',
        method: 'GET',
        baseUrl: 'https://api.calendly.com',
      },
      inputSchema: {
        user: {
          type: 'string',
          required: true,
          label: 'User URI',
          description: 'User URI to get event types for',
          aiControlled: false,
        },
        active: {
          type: 'boolean',
          label: 'Active Only',
          default: true,
          aiControlled: false,
        },
        count: {
          type: 'number',
          label: 'Count',
          default: 20,
          max: 100,
          aiControlled: false,
        },
        sort: {
          type: 'select',
          label: 'Sort',
          options: [
            { label: 'Name (A-Z)', value: 'name:asc' },
            { label: 'Name (Z-A)', value: 'name:desc' },
          ],
          aiControlled: false,
        },
      },
      outputSchema: {
        collection: {
          type: 'array',
          description: 'List of event types',
        },
        pagination: { type: 'object' },
      },
    },

    {
      id: 'get_event_type',
      name: 'Get Event Type',
      description: 'Get a specific event type',
      category: 'Event Types',
      icon: 'calendar',
      api: {
        endpoint: '/event_types/{eventTypeUri}',
        method: 'GET',
        baseUrl: 'https://api.calendly.com',
      },
      inputSchema: {
        eventTypeUri: {
          type: 'string',
          required: true,
          label: 'Event Type URI',
          aiControlled: false,
        },
      },
      outputSchema: {
        resource: { type: 'object' },
      },
    },

    // ==================== SCHEDULED EVENT OPERATIONS ====================
    {
      id: 'get_scheduled_events',
      name: 'Get Scheduled Events',
      description: 'Get scheduled events for a user',
      category: 'Scheduled Events',
      icon: 'calendar',
      api: {
        endpoint: '/scheduled_events',
        method: 'GET',
        baseUrl: 'https://api.calendly.com',
      },
      inputSchema: {
        user: {
          type: 'string',
          required: true,
          label: 'User URI',
          aiControlled: false,
        },
        status: {
          type: 'select',
          label: 'Status',
          options: [
            { label: 'Active', value: 'active' },
            { label: 'Canceled', value: 'canceled' },
          ],
          aiControlled: false,
        },
        min_start_time: {
          type: 'string',
          label: 'Min Start Time',
          placeholder: '2025-01-01T00:00:00Z',
          description: 'ISO 8601 datetime',
          aiControlled: false,
        },
        max_start_time: {
          type: 'string',
          label: 'Max Start Time',
          placeholder: '2025-12-31T23:59:59Z',
          aiControlled: false,
        },
        count: {
          type: 'number',
          label: 'Count',
          default: 20,
          max: 100,
          aiControlled: false,
        },
        sort: {
          type: 'select',
          label: 'Sort',
          options: [
            { label: 'Start Time (Ascending)', value: 'start_time:asc' },
            { label: 'Start Time (Descending)', value: 'start_time:desc' },
          ],
          aiControlled: false,
        },
      },
      outputSchema: {
        collection: { type: 'array' },
        pagination: { type: 'object' },
      },
    },

    {
      id: 'get_scheduled_event',
      name: 'Get Scheduled Event',
      description: 'Get a specific scheduled event',
      category: 'Scheduled Events',
      icon: 'calendar',
      api: {
        endpoint: '/scheduled_events/{eventUri}',
        method: 'GET',
        baseUrl: 'https://api.calendly.com',
      },
      inputSchema: {
        eventUri: {
          type: 'string',
          required: true,
          label: 'Event URI',
          aiControlled: false,
        },
      },
      outputSchema: {
        resource: { type: 'object' },
      },
    },

    {
      id: 'cancel_scheduled_event',
      name: 'Cancel Scheduled Event',
      description: 'Cancel a scheduled event',
      category: 'Scheduled Events',
      icon: 'x-circle',
      api: {
        endpoint: '/scheduled_events/{eventUri}/cancellation',
        method: 'POST',
        baseUrl: 'https://api.calendly.com',
        headers: {
          'Content-Type': 'application/json',
        },
      },
      inputSchema: {
        eventUri: {
          type: 'string',
          required: true,
          label: 'Event URI',
          aiControlled: false,
        },
        reason: {
          type: 'string',
          label: 'Cancellation Reason',
          inputType: 'textarea',
          aiControlled: false,
        },
      },
      outputSchema: {
        resource: { type: 'object' },
      },
    },

    // ==================== INVITEE OPERATIONS ====================
    {
      id: 'get_invitees',
      name: 'Get Event Invitees',
      description: 'Get invitees for a scheduled event',
      category: 'Invitees',
      icon: 'users',
      api: {
        endpoint: '/scheduled_events/{eventUri}/invitees',
        method: 'GET',
        baseUrl: 'https://api.calendly.com',
      },
      inputSchema: {
        eventUri: {
          type: 'string',
          required: true,
          label: 'Event URI',
          aiControlled: false,
        },
        status: {
          type: 'select',
          label: 'Status',
          options: [
            { label: 'Active', value: 'active' },
            { label: 'Canceled', value: 'canceled' },
          ],
          aiControlled: false,
        },
        count: {
          type: 'number',
          label: 'Count',
          default: 20,
          aiControlled: false,
        },
      },
      outputSchema: {
        collection: { type: 'array' },
        pagination: { type: 'object' },
      },
    },

    {
      id: 'get_invitee',
      name: 'Get Invitee',
      description: 'Get a specific invitee',
      category: 'Invitees',
      icon: 'user',
      api: {
        endpoint: '/invitees/{inviteeUri}',
        method: 'GET',
        baseUrl: 'https://api.calendly.com',
      },
      inputSchema: {
        inviteeUri: {
          type: 'string',
          required: true,
          label: 'Invitee URI',
          aiControlled: false,
        },
      },
      outputSchema: {
        resource: { type: 'object' },
      },
    },

    // ==================== WEBHOOK OPERATIONS ====================
    {
      id: 'create_webhook',
      name: 'Create Webhook Subscription',
      description: 'Create a webhook subscription',
      category: 'Webhooks',
      icon: 'link',
      api: {
        endpoint: '/webhook_subscriptions',
        method: 'POST',
        baseUrl: 'https://api.calendly.com',
        headers: {
          'Content-Type': 'application/json',
        },
      },
      inputSchema: {
        url: {
          type: 'string',
          required: true,
          label: 'Webhook URL',
          inputType: 'url',
          placeholder: 'https://your-server.com/webhook',
          aiControlled: false,
        },
        events: {
          type: 'array',
          required: true,
          label: 'Events',
          description: 'Events to subscribe to',
          itemSchema: {
            type: 'select',
            options: [
              { label: 'Invitee Created', value: 'invitee.created' },
              { label: 'Invitee Canceled', value: 'invitee.canceled' },
            ],
          },
          aiControlled: false,
        },
        user: {
          type: 'string',
          required: true,
          label: 'User URI',
          aiControlled: false,
        },
        scope: {
          type: 'select',
          required: true,
          label: 'Scope',
          options: [
            { label: 'User', value: 'user' },
            { label: 'Organization', value: 'organization' },
          ],
          aiControlled: false,
        },
        organization: {
          type: 'string',
          label: 'Organization URI',
          description: 'Required if scope is organization',
          aiControlled: false,
        },
        signing_key: {
          type: 'string',
          label: 'Signing Key',
          description: 'Custom signing key for webhook verification',
          aiControlled: false,
        },
      },
      outputSchema: {
        resource: {
          type: 'object',
          properties: {
            uri: { type: 'string' },
            callback_url: { type: 'string' },
            events: { type: 'array' },
          },
        },
      },
    },

    {
      id: 'get_webhooks',
      name: 'Get Webhook Subscriptions',
      description: 'Get all webhook subscriptions',
      category: 'Webhooks',
      icon: 'link',
      api: {
        endpoint: '/webhook_subscriptions',
        method: 'GET',
        baseUrl: 'https://api.calendly.com',
      },
      inputSchema: {
        user: {
          type: 'string',
          label: 'User URI',
          aiControlled: false,
        },
        organization: {
          type: 'string',
          label: 'Organization URI',
          aiControlled: false,
        },
        scope: {
          type: 'select',
          required: true,
          label: 'Scope',
          options: [
            { label: 'User', value: 'user' },
            { label: 'Organization', value: 'organization' },
          ],
          aiControlled: false,
        },
      },
      outputSchema: {
        collection: { type: 'array' },
      },
    },

    {
      id: 'delete_webhook',
      name: 'Delete Webhook Subscription',
      description: 'Delete a webhook subscription',
      category: 'Webhooks',
      icon: 'trash',
      api: {
        endpoint: '/webhook_subscriptions/{webhookUri}',
        method: 'DELETE',
        baseUrl: 'https://api.calendly.com',
      },
      inputSchema: {
        webhookUri: {
          type: 'string',
          required: true,
          label: 'Webhook URI',
          aiControlled: false,
        },
      },
      outputSchema: {
        success: { type: 'boolean' },
      },
    },

    // ==================== ORGANIZATION OPERATIONS ====================
    {
      id: 'get_organization',
      name: 'Get Organization',
      description: 'Get organization details',
      category: 'Organization',
      icon: 'building',
      api: {
        endpoint: '/organizations/{organizationUri}',
        method: 'GET',
        baseUrl: 'https://api.calendly.com',
      },
      inputSchema: {
        organizationUri: {
          type: 'string',
          required: true,
          label: 'Organization URI',
          aiControlled: false,
        },
      },
      outputSchema: {
        resource: { type: 'object' },
      },
    },

    {
      id: 'get_organization_memberships',
      name: 'Get Organization Memberships',
      description: 'Get organization members',
      category: 'Organization',
      icon: 'users',
      api: {
        endpoint: '/organization_memberships',
        method: 'GET',
        baseUrl: 'https://api.calendly.com',
      },
      inputSchema: {
        organization: {
          type: 'string',
          required: true,
          label: 'Organization URI',
          aiControlled: false,
        },
        count: {
          type: 'number',
          label: 'Count',
          default: 20,
          aiControlled: false,
        },
      },
      outputSchema: {
        collection: { type: 'array' },
      },
    },
  ],

  supported_triggers: [
    {
      id: 'invitee_created',
      name: 'Invitee Created',
      description: 'Triggers when someone schedules a meeting',
      eventType: 'invitee.created',
      icon: 'calendar',
      webhookRequired: true,
      outputSchema: {
        event: { type: 'string', description: 'Event type' },
        created_at: { type: 'string' },
        created_by: { type: 'string' },
        payload: {
          type: 'object',
          properties: {
            event_type: { type: 'object' },
            event: { type: 'object' },
            invitee: { type: 'object' },
            questions_and_answers: { type: 'array' },
            tracking: { type: 'object' },
            old_invitee: { type: 'object' },
            new_invitee: { type: 'object' },
          },
        },
      },
    },
    {
      id: 'invitee_canceled',
      name: 'Invitee Canceled',
      description: 'Triggers when someone cancels a scheduled meeting',
      eventType: 'invitee.canceled',
      icon: 'x-circle',
      webhookRequired: true,
      outputSchema: {
        event: { type: 'string' },
        created_at: { type: 'string' },
        payload: {
          type: 'object',
          properties: {
            event_type: { type: 'object' },
            event: { type: 'object' },
            invitee: { type: 'object' },
            cancellation: {
              type: 'object',
              properties: {
                canceled_by: { type: 'string' },
                reason: { type: 'string' },
              },
            },
          },
        },
      },
    },
  ],
};
