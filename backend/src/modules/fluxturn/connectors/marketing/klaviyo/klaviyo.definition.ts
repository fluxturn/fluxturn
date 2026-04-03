// Klaviyo Connector
// Auto-generated from connector.constants.ts

import { ConnectorDefinition } from '../../shared';

export const KLAVIYO_CONNECTOR: ConnectorDefinition = {
    name: 'klaviyo',
    display_name: 'Klaviyo',
    category: 'marketing',
    description: 'Advanced email and SMS marketing automation platform',
    auth_type: 'api_key',
    auth_fields: [
      {
        key: 'apiKey',
        label: 'API Key',
        type: 'password',
        required: true,
        placeholder: 'pk_...',
        description: 'Your Klaviyo Private API Key',
        helpUrl: 'https://developers.klaviyo.com/en/docs/retrieve_api_credentials',
        helpText: 'How to get your API key'
      }
    ],
    endpoints: {
      base_url: 'https://a.klaviyo.com/api',
      profiles: '/profiles',
      events: '/events',
      lists: '/lists',
      segments: '/segments',
      campaigns: '/campaigns',
      flows: '/flows',
      templates: '/templates',
      metrics: '/metrics',
      images: '/images',
      tags: '/tags',
      catalogs: '/catalogs',
      coupons: '/coupons',
      forms: '/forms'
    },
    webhook_support: true,
    rate_limits: {
      requests_per_second: 10,
      requests_per_minute: 500
    },
    sandbox_available: false,
    supported_actions: [
      // Profile Actions
      {
        id: 'create_profile',
        name: 'Create Profile',
        description: 'Create or update a customer profile',
        category: 'Profiles',
        icon: 'user-plus',
        api: {
          endpoint: '/profiles',
          method: 'POST',
          baseUrl: 'https://a.klaviyo.com/api',
          headers: {
            'Authorization': 'Klaviyo-API-Key {apiKey}',
            'Content-Type': 'application/json',
            'revision': '2024-10-15'
          }
        },
        inputSchema: {
          email: {
            type: 'string',
            required: true,
            label: 'Email',
            inputType: 'email',
            placeholder: 'user@example.com',
            description: 'Profile email address',
            aiControlled: true,
            aiDescription: 'The email address for the profile.'
          },
          phoneNumber: {
            type: 'string',
            label: 'Phone Number',
            placeholder: '+15005550006',
            description: 'Phone number in E.164 format',
            aiControlled: false
          },
          externalId: {
            type: 'string',
            label: 'External ID',
            description: 'External identifier for the profile',
            aiControlled: false
          },
          firstName: {
            type: 'string',
            label: 'First Name',
            aiControlled: true,
            aiDescription: 'The profile first name.'
          },
          lastName: {
            type: 'string',
            label: 'Last Name',
            aiControlled: true,
            aiDescription: 'The profile last name.'
          },
          organization: {
            type: 'string',
            label: 'Organization',
            aiControlled: true,
            aiDescription: 'The organization/company name.'
          },
          title: {
            type: 'string',
            label: 'Title',
            aiControlled: true,
            aiDescription: 'The job title for the profile.'
          },
          image: {
            type: 'string',
            label: 'Image URL',
            inputType: 'url',
            aiControlled: false
          },
          location: {
            type: 'object',
            label: 'Location',
            description: 'Profile location information',
            aiControlled: false
          },
          properties: {
            type: 'object',
            label: 'Custom Properties',
            description: 'Custom profile properties',
            aiControlled: true,
            aiDescription: 'Custom properties object for the profile.'
          }
        },
        outputSchema: {
          id: { type: 'string' },
          email: { type: 'string' },
          phoneNumber: { type: 'string' }
        }
      },
      {
        id: 'get_profile',
        name: 'Get Profile',
        description: 'Get a profile by ID',
        category: 'Profiles',
        icon: 'user',
        api: {
          endpoint: '/profiles/{profileId}',
          method: 'GET',
          baseUrl: 'https://a.klaviyo.com/api',
          headers: {
            'Authorization': 'Klaviyo-API-Key {apiKey}',
            'revision': '2024-10-15'
          }
        },
        inputSchema: {
          profileId: {
            type: 'string',
            required: true,
            label: 'Profile ID',
            description: 'Unique profile identifier',
            aiControlled: false
          },
          additionalFields: {
            type: 'select',
            label: 'Additional Fields',
            options: [
              { label: 'Predictive Analytics', value: 'predictive_analytics' },
              { label: 'Subscriptions', value: 'subscriptions' }
            ],
            description: 'Additional data to include',
            aiControlled: false
          }
        }
      },
      {
        id: 'update_profile',
        name: 'Update Profile',
        description: 'Update an existing profile',
        category: 'Profiles',
        icon: 'user',
        api: {
          endpoint: '/profiles/{profileId}',
          method: 'PATCH',
          baseUrl: 'https://a.klaviyo.com/api',
          headers: {
            'Authorization': 'Klaviyo-API-Key {apiKey}',
            'Content-Type': 'application/json',
            'revision': '2024-10-15'
          }
        },
        inputSchema: {
          profileId: {
            type: 'string',
            required: true,
            label: 'Profile ID',
            aiControlled: false
          },
          email: {
            type: 'string',
            label: 'Email',
            inputType: 'email',
            aiControlled: true,
            aiDescription: 'Updated email address.'
          },
          firstName: {
            type: 'string',
            label: 'First Name',
            aiControlled: true,
            aiDescription: 'Updated first name.'
          },
          lastName: {
            type: 'string',
            label: 'Last Name',
            aiControlled: true,
            aiDescription: 'Updated last name.'
          },
          phoneNumber: {
            type: 'string',
            label: 'Phone Number',
            aiControlled: false
          },
          properties: {
            type: 'object',
            label: 'Custom Properties',
            aiControlled: true,
            aiDescription: 'Updated custom properties object.'
          }
        }
      },
      {
        id: 'get_profiles',
        name: 'Get Profiles',
        description: 'Get a list of profiles',
        category: 'Profiles',
        icon: 'users',
        api: {
          endpoint: '/profiles',
          method: 'GET',
          baseUrl: 'https://a.klaviyo.com/api',
          headers: {
            'Authorization': 'Klaviyo-API-Key {apiKey}',
            'revision': '2024-10-15'
          }
        },
        inputSchema: {
          filter: {
            type: 'string',
            label: 'Filter',
            description: 'Filter expression for profiles',
            aiControlled: false
          },
          pageSize: {
            type: 'number',
            label: 'Page Size',
            default: 20,
            min: 1,
            max: 100,
            aiControlled: false
          }
        }
      },
      {
        id: 'subscribe_profile',
        name: 'Subscribe Profile',
        description: 'Subscribe a profile to email/SMS marketing',
        category: 'Profiles',
        icon: 'mail',
        api: {
          endpoint: '/profile-subscription-bulk-create-jobs',
          method: 'POST',
          baseUrl: 'https://a.klaviyo.com/api',
          headers: {
            'Authorization': 'Klaviyo-API-Key {apiKey}',
            'Content-Type': 'application/json',
            'revision': '2024-10-15'
          }
        },
        inputSchema: {
          email: {
            type: 'string',
            required: true,
            label: 'Email',
            inputType: 'email',
            aiControlled: true,
            aiDescription: 'Email address to subscribe.'
          },
          phoneNumber: {
            type: 'string',
            label: 'Phone Number',
            aiControlled: false
          },
          listId: {
            type: 'string',
            required: true,
            label: 'List ID',
            aiControlled: false
          },
          channels: {
            type: 'select',
            label: 'Channels',
            options: [
              { label: 'Email', value: 'email' },
              { label: 'SMS', value: 'sms' }
            ],
            description: 'Subscription channels',
            aiControlled: false
          }
        }
      },
      {
        id: 'unsubscribe_profile',
        name: 'Unsubscribe Profile',
        description: 'Unsubscribe a profile from email/SMS marketing',
        category: 'Profiles',
        icon: 'mail',
        api: {
          endpoint: '/profile-subscription-bulk-delete-jobs',
          method: 'POST',
          baseUrl: 'https://a.klaviyo.com/api',
          headers: {
            'Authorization': 'Klaviyo-API-Key {apiKey}',
            'Content-Type': 'application/json',
            'revision': '2024-10-15'
          }
        },
        inputSchema: {
          email: {
            type: 'string',
            required: true,
            label: 'Email',
            aiControlled: true,
            aiDescription: 'Email address to unsubscribe.'
          },
          listId: {
            type: 'string',
            required: true,
            label: 'List ID',
            aiControlled: false
          }
        }
      },

      // Event Actions
      {
        id: 'create_event',
        name: 'Create Event',
        description: 'Track a custom event for a profile',
        category: 'Events',
        icon: 'activity',
        api: {
          endpoint: '/events',
          method: 'POST',
          baseUrl: 'https://a.klaviyo.com/api',
          headers: {
            'Authorization': 'Klaviyo-API-Key {apiKey}',
            'Content-Type': 'application/json',
            'revision': '2024-10-15'
          }
        },
        inputSchema: {
          metricName: {
            type: 'string',
            required: true,
            label: 'Event Name',
            placeholder: 'Placed Order',
            description: 'Name of the metric/event',
            aiControlled: true,
            aiDescription: 'The name of the event/metric being tracked.'
          },
          profileEmail: {
            type: 'string',
            required: true,
            label: 'Profile Email',
            inputType: 'email',
            aiControlled: true,
            aiDescription: 'Email address of the profile for this event.'
          },
          profilePhoneNumber: {
            type: 'string',
            label: 'Profile Phone Number',
            aiControlled: false
          },
          profileExternalId: {
            type: 'string',
            label: 'Profile External ID',
            aiControlled: false
          },
          properties: {
            type: 'object',
            label: 'Event Properties',
            description: 'Custom event properties',
            aiControlled: true,
            aiDescription: 'Custom properties object for the event.'
          },
          value: {
            type: 'number',
            label: 'Event Value',
            description: 'Monetary value associated with event',
            aiControlled: false
          },
          uniqueId: {
            type: 'string',
            label: 'Unique ID',
            description: 'Unique identifier for event deduplication',
            aiControlled: false
          },
          time: {
            type: 'string',
            label: 'Event Time',
            description: 'ISO 8601 timestamp (defaults to now)',
            aiControlled: false
          }
        }
      },
      {
        id: 'track_event',
        name: 'Track Event',
        description: 'Track a behavioral event for a profile',
        category: 'Events',
        icon: 'activity',
        api: {
          endpoint: '/events',
          method: 'POST',
          baseUrl: 'https://a.klaviyo.com/api',
          headers: {
            'Authorization': 'Klaviyo-API-Key {apiKey}',
            'Content-Type': 'application/json',
            'revision': '2024-10-15'
          }
        },
        inputSchema: {
          event: {
            type: 'string',
            required: true,
            label: 'Event Name',
            placeholder: 'Viewed Product',
            description: 'Name of the event to track',
            aiControlled: true,
            aiDescription: 'The name of the behavioral event being tracked.'
          },
          profileEmail: {
            type: 'string',
            required: true,
            label: 'Profile Email',
            inputType: 'email',
            aiControlled: true,
            aiDescription: 'Email address of the profile for this event.'
          },
          properties: {
            type: 'object',
            label: 'Event Properties',
            description: 'Custom event properties',
            aiControlled: true,
            aiDescription: 'Custom properties object for the event.'
          },
          value: {
            type: 'number',
            label: 'Event Value',
            description: 'Monetary value associated with event',
            aiControlled: false
          }
        }
      },
      {
        id: 'get_event',
        name: 'Get Event',
        description: 'Get a specific event by ID',
        category: 'Events',
        icon: 'activity',
        api: {
          endpoint: '/events/{eventId}',
          method: 'GET',
          baseUrl: 'https://a.klaviyo.com/api',
          headers: {
            'Authorization': 'Klaviyo-API-Key {apiKey}',
            'revision': '2024-10-15'
          }
        },
        inputSchema: {
          eventId: {
            type: 'string',
            required: true,
            label: 'Event ID',
            aiControlled: false
          }
        }
      },
      {
        id: 'get_events',
        name: 'Get Events',
        description: 'Get a list of events',
        category: 'Events',
        icon: 'activity',
        api: {
          endpoint: '/events',
          method: 'GET',
          baseUrl: 'https://a.klaviyo.com/api',
          headers: {
            'Authorization': 'Klaviyo-API-Key {apiKey}',
            'revision': '2024-10-15'
          }
        },
        inputSchema: {
          filter: {
            type: 'string',
            label: 'Filter',
            description: 'Filter expression for events',
            aiControlled: false
          },
          pageSize: {
            type: 'number',
            label: 'Page Size',
            default: 20,
            min: 1,
            max: 100,
            aiControlled: false
          }
        }
      },
      {
        id: 'get_profile_events',
        name: 'Get Profile Events',
        description: 'Get events for a specific profile',
        category: 'Events',
        icon: 'activity',
        api: {
          endpoint: '/profiles/{profileId}/events',
          method: 'GET',
          baseUrl: 'https://a.klaviyo.com/api',
          headers: {
            'Authorization': 'Klaviyo-API-Key {apiKey}',
            'revision': '2024-10-15'
          }
        },
        inputSchema: {
          profileId: {
            type: 'string',
            required: true,
            label: 'Profile ID',
            aiControlled: false
          },
          pageSize: {
            type: 'number',
            label: 'Page Size',
            default: 20,
            aiControlled: false
          }
        }
      },

      // List Actions
      {
        id: 'create_list',
        name: 'Create List',
        description: 'Create a new list',
        category: 'Lists',
        icon: 'list',
        api: {
          endpoint: '/lists',
          method: 'POST',
          baseUrl: 'https://a.klaviyo.com/api',
          headers: {
            'Authorization': 'Klaviyo-API-Key {apiKey}',
            'Content-Type': 'application/json',
            'revision': '2024-10-15'
          }
        },
        inputSchema: {
          name: {
            type: 'string',
            required: true,
            label: 'List Name',
            aiControlled: true,
            aiDescription: 'The name of the list to create.'
          },
          optInProcess: {
            type: 'select',
            label: 'Opt-in Process',
            default: 'single_opt_in',
            options: [
              { label: 'Single Opt-in', value: 'single_opt_in' },
              { label: 'Double Opt-in', value: 'double_opt_in' },
              { label: 'Double Opt-in SMS', value: 'double_opt_in_sms' }
            ],
            aiControlled: false
          }
        }
      },
      {
        id: 'get_list',
        name: 'Get List',
        description: 'Get a list by ID',
        category: 'Lists',
        icon: 'list',
        api: {
          endpoint: '/lists/{listId}',
          method: 'GET',
          baseUrl: 'https://a.klaviyo.com/api',
          headers: {
            'Authorization': 'Klaviyo-API-Key {apiKey}',
            'revision': '2024-10-15'
          }
        },
        inputSchema: {
          listId: {
            type: 'string',
            required: true,
            label: 'List ID',
            aiControlled: false
          }
        }
      },
      {
        id: 'get_lists',
        name: 'Get Lists',
        description: 'Get all lists',
        category: 'Lists',
        icon: 'list',
        api: {
          endpoint: '/lists',
          method: 'GET',
          baseUrl: 'https://a.klaviyo.com/api',
          headers: {
            'Authorization': 'Klaviyo-API-Key {apiKey}',
            'revision': '2024-10-15'
          }
        },
        inputSchema: {
          filter: {
            type: 'string',
            label: 'Filter',
            aiControlled: false
          },
          pageSize: {
            type: 'number',
            label: 'Page Size',
            default: 20,
            aiControlled: false
          }
        }
      },
      {
        id: 'update_list',
        name: 'Update List',
        description: 'Update a list',
        category: 'Lists',
        icon: 'list',
        api: {
          endpoint: '/lists/{listId}',
          method: 'PATCH',
          baseUrl: 'https://a.klaviyo.com/api',
          headers: {
            'Authorization': 'Klaviyo-API-Key {apiKey}',
            'Content-Type': 'application/json',
            'revision': '2024-10-15'
          }
        },
        inputSchema: {
          listId: {
            type: 'string',
            required: true,
            label: 'List ID',
            aiControlled: false
          },
          name: {
            type: 'string',
            label: 'List Name',
            aiControlled: true,
            aiDescription: 'Updated list name.'
          }
        }
      },
      {
        id: 'delete_list',
        name: 'Delete List',
        description: 'Delete a list',
        category: 'Lists',
        icon: 'trash',
        api: {
          endpoint: '/lists/{listId}',
          method: 'DELETE',
          baseUrl: 'https://a.klaviyo.com/api',
          headers: {
            'Authorization': 'Klaviyo-API-Key {apiKey}',
            'revision': '2024-10-15'
          }
        },
        inputSchema: {
          listId: {
            type: 'string',
            required: true,
            label: 'List ID',
            aiControlled: false
          }
        }
      },
      {
        id: 'add_profile_to_list',
        name: 'Add Profile to List',
        description: 'Add profiles to a list',
        category: 'Lists',
        icon: 'user-plus',
        api: {
          endpoint: '/lists/{listId}/relationships/profiles',
          method: 'POST',
          baseUrl: 'https://a.klaviyo.com/api',
          headers: {
            'Authorization': 'Klaviyo-API-Key {apiKey}',
            'Content-Type': 'application/json',
            'revision': '2024-10-15'
          }
        },
        inputSchema: {
          listId: {
            type: 'string',
            required: true,
            label: 'List ID',
            aiControlled: false
          },
          profileIds: {
            type: 'array',
            required: true,
            label: 'Profile IDs',
            description: 'Array of profile IDs to add',
            aiControlled: false
          }
        }
      },
      {
        id: 'remove_profile_from_list',
        name: 'Remove Profile from List',
        description: 'Remove profiles from a list',
        category: 'Lists',
        icon: 'user-minus',
        api: {
          endpoint: '/lists/{listId}/relationships/profiles',
          method: 'DELETE',
          baseUrl: 'https://a.klaviyo.com/api',
          headers: {
            'Authorization': 'Klaviyo-API-Key {apiKey}',
            'Content-Type': 'application/json',
            'revision': '2024-10-15'
          }
        },
        inputSchema: {
          listId: {
            type: 'string',
            required: true,
            label: 'List ID',
            aiControlled: false
          },
          profileIds: {
            type: 'array',
            required: true,
            label: 'Profile IDs',
            description: 'Array of profile IDs to remove',
            aiControlled: false
          }
        }
      },

      // Segment Actions
      {
        id: 'get_segment',
        name: 'Get Segment',
        description: 'Get a segment by ID',
        category: 'Segments',
        icon: 'filter',
        api: {
          endpoint: '/segments/{segmentId}',
          method: 'GET',
          baseUrl: 'https://a.klaviyo.com/api',
          headers: {
            'Authorization': 'Klaviyo-API-Key {apiKey}',
            'revision': '2024-10-15'
          }
        },
        inputSchema: {
          segmentId: {
            type: 'string',
            required: true,
            label: 'Segment ID',
            aiControlled: false
          }
        }
      },
      {
        id: 'get_segments',
        name: 'Get Segments',
        description: 'Get all segments',
        category: 'Segments',
        icon: 'filter',
        api: {
          endpoint: '/segments',
          method: 'GET',
          baseUrl: 'https://a.klaviyo.com/api',
          headers: {
            'Authorization': 'Klaviyo-API-Key {apiKey}',
            'revision': '2024-10-15'
          }
        },
        inputSchema: {
          filter: {
            type: 'string',
            label: 'Filter',
            aiControlled: false
          },
          pageSize: {
            type: 'number',
            label: 'Page Size',
            default: 20,
            aiControlled: false
          }
        }
      },
      {
        id: 'get_segment_profiles',
        name: 'Get Segment Profiles',
        description: 'Get profiles in a segment',
        category: 'Segments',
        icon: 'users',
        api: {
          endpoint: '/segments/{segmentId}/profiles',
          method: 'GET',
          baseUrl: 'https://a.klaviyo.com/api',
          headers: {
            'Authorization': 'Klaviyo-API-Key {apiKey}',
            'revision': '2024-10-15'
          }
        },
        inputSchema: {
          segmentId: {
            type: 'string',
            required: true,
            label: 'Segment ID',
            aiControlled: false
          },
          pageSize: {
            type: 'number',
            label: 'Page Size',
            default: 20,
            aiControlled: false
          }
        }
      },

      // Campaign Actions
      {
        id: 'create_campaign',
        name: 'Create Campaign',
        description: 'Create a new campaign',
        category: 'Campaigns',
        icon: 'mail',
        api: {
          endpoint: '/campaigns',
          method: 'POST',
          baseUrl: 'https://a.klaviyo.com/api',
          headers: {
            'Authorization': 'Klaviyo-API-Key {apiKey}',
            'Content-Type': 'application/json',
            'revision': '2024-10-15'
          }
        },
        inputSchema: {
          name: {
            type: 'string',
            required: true,
            label: 'Campaign Name',
            aiControlled: true,
            aiDescription: 'The name of the campaign to create.'
          },
          listIds: {
            type: 'array',
            label: 'List IDs',
            description: 'Lists to include in campaign',
            aiControlled: false
          },
          segmentIds: {
            type: 'array',
            label: 'Segment IDs',
            description: 'Segments to include in campaign',
            aiControlled: false
          },
          sendStrategy: {
            type: 'select',
            label: 'Send Strategy',
            options: [
              { label: 'Immediate', value: 'immediate' },
              { label: 'Throttled', value: 'throttled' },
              { label: 'Smart Send Time', value: 'smart_send_time' }
            ],
            aiControlled: false
          }
        }
      },
      {
        id: 'get_campaign',
        name: 'Get Campaign',
        description: 'Get a campaign by ID',
        category: 'Campaigns',
        icon: 'mail',
        api: {
          endpoint: '/campaigns/{campaignId}',
          method: 'GET',
          baseUrl: 'https://a.klaviyo.com/api',
          headers: {
            'Authorization': 'Klaviyo-API-Key {apiKey}',
            'revision': '2024-10-15'
          }
        },
        inputSchema: {
          campaignId: {
            type: 'string',
            required: true,
            label: 'Campaign ID',
            aiControlled: false
          }
        }
      },
      {
        id: 'get_campaigns',
        name: 'Get Campaigns',
        description: 'Get all campaigns',
        category: 'Campaigns',
        icon: 'mail',
        api: {
          endpoint: '/campaigns',
          method: 'GET',
          baseUrl: 'https://a.klaviyo.com/api',
          headers: {
            'Authorization': 'Klaviyo-API-Key {apiKey}',
            'revision': '2024-10-15'
          }
        },
        inputSchema: {
          filter: {
            type: 'string',
            label: 'Filter',
            aiControlled: false
          },
          pageSize: {
            type: 'number',
            label: 'Page Size',
            default: 20,
            aiControlled: false
          }
        }
      },
      {
        id: 'update_campaign',
        name: 'Update Campaign',
        description: 'Update a campaign',
        category: 'Campaigns',
        icon: 'mail',
        api: {
          endpoint: '/campaigns/{campaignId}',
          method: 'PATCH',
          baseUrl: 'https://a.klaviyo.com/api',
          headers: {
            'Authorization': 'Klaviyo-API-Key {apiKey}',
            'Content-Type': 'application/json',
            'revision': '2024-10-15'
          }
        },
        inputSchema: {
          campaignId: {
            type: 'string',
            required: true,
            label: 'Campaign ID',
            aiControlled: false
          },
          name: {
            type: 'string',
            label: 'Campaign Name',
            aiControlled: true,
            aiDescription: 'Updated campaign name.'
          }
        }
      },
      {
        id: 'delete_campaign',
        name: 'Delete Campaign',
        description: 'Delete a campaign',
        category: 'Campaigns',
        icon: 'trash',
        api: {
          endpoint: '/campaigns/{campaignId}',
          method: 'DELETE',
          baseUrl: 'https://a.klaviyo.com/api',
          headers: {
            'Authorization': 'Klaviyo-API-Key {apiKey}',
            'revision': '2024-10-15'
          }
        },
        inputSchema: {
          campaignId: {
            type: 'string',
            required: true,
            label: 'Campaign ID',
            aiControlled: false
          }
        }
      },
      {
        id: 'send_campaign',
        name: 'Send Campaign',
        description: 'Send or schedule a campaign',
        category: 'Campaigns',
        icon: 'send',
        api: {
          endpoint: '/campaign-send-jobs',
          method: 'POST',
          baseUrl: 'https://a.klaviyo.com/api',
          headers: {
            'Authorization': 'Klaviyo-API-Key {apiKey}',
            'Content-Type': 'application/json',
            'revision': '2024-10-15'
          }
        },
        inputSchema: {
          campaignId: {
            type: 'string',
            required: true,
            label: 'Campaign ID',
            aiControlled: false
          },
          scheduledAt: {
            type: 'string',
            label: 'Scheduled At',
            description: 'ISO 8601 timestamp for scheduling',
            aiControlled: false
          }
        }
      },
      {
        id: 'cancel_campaign',
        name: 'Cancel Campaign',
        description: 'Cancel a scheduled campaign',
        category: 'Campaigns',
        icon: 'x',
        api: {
          endpoint: '/campaign-send-jobs/{jobId}/cancel',
          method: 'POST',
          baseUrl: 'https://a.klaviyo.com/api',
          headers: {
            'Authorization': 'Klaviyo-API-Key {apiKey}',
            'revision': '2024-10-15'
          }
        },
        inputSchema: {
          jobId: {
            type: 'string',
            required: true,
            label: 'Campaign Send Job ID',
            aiControlled: false
          }
        }
      },

      // Template Actions
      {
        id: 'create_template',
        name: 'Create Template',
        description: 'Create a new email template',
        category: 'Templates',
        icon: 'file-text',
        api: {
          endpoint: '/templates',
          method: 'POST',
          baseUrl: 'https://a.klaviyo.com/api',
          headers: {
            'Authorization': 'Klaviyo-API-Key {apiKey}',
            'Content-Type': 'application/json',
            'revision': '2024-10-15'
          }
        },
        inputSchema: {
          name: {
            type: 'string',
            required: true,
            label: 'Template Name',
            aiControlled: true,
            aiDescription: 'The name of the email template to create.'
          },
          html: {
            type: 'string',
            required: true,
            label: 'HTML Content',
            inputType: 'textarea',
            aiControlled: true,
            aiDescription: 'The HTML content for the email template.'
          },
          text: {
            type: 'string',
            label: 'Text Content',
            inputType: 'textarea',
            aiControlled: true,
            aiDescription: 'The plain text content for the email template.'
          },
          editorType: {
            type: 'select',
            label: 'Editor Type',
            default: 'CODE',
            options: [
              { label: 'Code', value: 'CODE' },
              { label: 'System Draggable', value: 'SYSTEM_DRAGGABLE' },
              { label: 'User Draggable', value: 'USER_DRAGGABLE' },
              { label: 'Simple', value: 'SIMPLE' }
            ],
            aiControlled: false
          }
        }
      },
      {
        id: 'get_template',
        name: 'Get Template',
        description: 'Get a template by ID',
        category: 'Templates',
        icon: 'file-text',
        api: {
          endpoint: '/templates/{templateId}',
          method: 'GET',
          baseUrl: 'https://a.klaviyo.com/api',
          headers: {
            'Authorization': 'Klaviyo-API-Key {apiKey}',
            'revision': '2024-10-15'
          }
        },
        inputSchema: {
          templateId: {
            type: 'string',
            required: true,
            label: 'Template ID',
            aiControlled: false
          }
        }
      },
      {
        id: 'get_templates',
        name: 'Get Templates',
        description: 'Get all templates',
        category: 'Templates',
        icon: 'file-text',
        api: {
          endpoint: '/templates',
          method: 'GET',
          baseUrl: 'https://a.klaviyo.com/api',
          headers: {
            'Authorization': 'Klaviyo-API-Key {apiKey}',
            'revision': '2024-10-15'
          }
        },
        inputSchema: {
          pageSize: {
            type: 'number',
            label: 'Page Size',
            default: 20,
            aiControlled: false
          }
        }
      },
      {
        id: 'update_template',
        name: 'Update Template',
        description: 'Update a template',
        category: 'Templates',
        icon: 'file-text',
        api: {
          endpoint: '/templates/{templateId}',
          method: 'PATCH',
          baseUrl: 'https://a.klaviyo.com/api',
          headers: {
            'Authorization': 'Klaviyo-API-Key {apiKey}',
            'Content-Type': 'application/json',
            'revision': '2024-10-15'
          }
        },
        inputSchema: {
          templateId: {
            type: 'string',
            required: true,
            label: 'Template ID',
            aiControlled: false
          },
          name: {
            type: 'string',
            label: 'Template Name',
            aiControlled: true,
            aiDescription: 'Updated template name.'
          },
          html: {
            type: 'string',
            label: 'HTML Content',
            inputType: 'textarea',
            aiControlled: true,
            aiDescription: 'Updated HTML content for the email template.'
          }
        }
      },
      {
        id: 'delete_template',
        name: 'Delete Template',
        description: 'Delete a template',
        category: 'Templates',
        icon: 'trash',
        api: {
          endpoint: '/templates/{templateId}',
          method: 'DELETE',
          baseUrl: 'https://a.klaviyo.com/api',
          headers: {
            'Authorization': 'Klaviyo-API-Key {apiKey}',
            'revision': '2024-10-15'
          }
        },
        inputSchema: {
          templateId: {
            type: 'string',
            required: true,
            label: 'Template ID',
            aiControlled: false
          }
        }
      },

      // Flow Actions
      {
        id: 'create_flow',
        name: 'Create Flow',
        description: 'Create an automated email flow',
        category: 'Flows',
        icon: 'git-branch',
        api: {
          endpoint: '/flows',
          method: 'POST',
          baseUrl: 'https://a.klaviyo.com/api',
          headers: {
            'Authorization': 'Klaviyo-API-Key {apiKey}',
            'Content-Type': 'application/json',
            'revision': '2024-10-15'
          }
        },
        inputSchema: {
          name: {
            type: 'string',
            required: true,
            label: 'Flow Name',
            aiControlled: true,
            aiDescription: 'The name of the flow to create.'
          },
          triggerType: {
            type: 'string',
            required: true,
            label: 'Trigger Type',
            description: 'The trigger type for the flow',
            aiControlled: false
          },
          status: {
            type: 'select',
            label: 'Status',
            default: 'draft',
            options: [
              { label: 'Draft', value: 'draft' },
              { label: 'Live', value: 'live' }
            ],
            aiControlled: false
          }
        }
      },
      {
        id: 'get_flow',
        name: 'Get Flow',
        description: 'Get a flow by ID',
        category: 'Flows',
        icon: 'git-branch',
        api: {
          endpoint: '/flows/{flowId}',
          method: 'GET',
          baseUrl: 'https://a.klaviyo.com/api',
          headers: {
            'Authorization': 'Klaviyo-API-Key {apiKey}',
            'revision': '2024-10-15'
          }
        },
        inputSchema: {
          flowId: {
            type: 'string',
            required: true,
            label: 'Flow ID',
            aiControlled: false
          }
        }
      },
      {
        id: 'get_flows',
        name: 'Get Flows',
        description: 'Get all flows',
        category: 'Flows',
        icon: 'git-branch',
        api: {
          endpoint: '/flows',
          method: 'GET',
          baseUrl: 'https://a.klaviyo.com/api',
          headers: {
            'Authorization': 'Klaviyo-API-Key {apiKey}',
            'revision': '2024-10-15'
          }
        },
        inputSchema: {
          filter: {
            type: 'string',
            label: 'Filter',
            aiControlled: false
          },
          pageSize: {
            type: 'number',
            label: 'Page Size',
            default: 20,
            aiControlled: false
          }
        }
      },
      {
        id: 'update_flow_status',
        name: 'Update Flow Status',
        description: 'Update flow status (draft, manual, live)',
        category: 'Flows',
        icon: 'git-branch',
        api: {
          endpoint: '/flows/{flowId}',
          method: 'PATCH',
          baseUrl: 'https://a.klaviyo.com/api',
          headers: {
            'Authorization': 'Klaviyo-API-Key {apiKey}',
            'Content-Type': 'application/json',
            'revision': '2024-10-15'
          }
        },
        inputSchema: {
          flowId: {
            type: 'string',
            required: true,
            label: 'Flow ID',
            aiControlled: false
          },
          status: {
            type: 'select',
            required: true,
            label: 'Status',
            options: [
              { label: 'Draft', value: 'draft' },
              { label: 'Manual', value: 'manual' },
              { label: 'Live', value: 'live' }
            ],
            aiControlled: false
          }
        }
      },
      {
        id: 'delete_flow',
        name: 'Delete Flow',
        description: 'Delete a flow',
        category: 'Flows',
        icon: 'trash',
        api: {
          endpoint: '/flows/{flowId}',
          method: 'DELETE',
          baseUrl: 'https://a.klaviyo.com/api',
          headers: {
            'Authorization': 'Klaviyo-API-Key {apiKey}',
            'revision': '2024-10-15'
          }
        },
        inputSchema: {
          flowId: {
            type: 'string',
            required: true,
            label: 'Flow ID',
            aiControlled: false
          }
        }
      },

      // Metric Actions
      {
        id: 'get_metric',
        name: 'Get Metric',
        description: 'Get a metric by ID',
        category: 'Metrics',
        icon: 'bar-chart',
        api: {
          endpoint: '/metrics/{metricId}',
          method: 'GET',
          baseUrl: 'https://a.klaviyo.com/api',
          headers: {
            'Authorization': 'Klaviyo-API-Key {apiKey}',
            'revision': '2024-10-15'
          }
        },
        inputSchema: {
          metricId: {
            type: 'string',
            required: true,
            label: 'Metric ID',
            aiControlled: false
          }
        }
      },
      {
        id: 'get_metrics',
        name: 'Get Metrics',
        description: 'Get all metrics',
        category: 'Metrics',
        icon: 'bar-chart',
        api: {
          endpoint: '/metrics',
          method: 'GET',
          baseUrl: 'https://a.klaviyo.com/api',
          headers: {
            'Authorization': 'Klaviyo-API-Key {apiKey}',
            'revision': '2024-10-15'
          }
        },
        inputSchema: {
          filter: {
            type: 'string',
            label: 'Filter',
            aiControlled: false
          },
          pageSize: {
            type: 'number',
            label: 'Page Size',
            default: 20,
            aiControlled: false
          }
        }
      },

      // Image Actions
      {
        id: 'upload_image',
        name: 'Upload Image',
        description: 'Upload an image to Klaviyo',
        category: 'Images',
        icon: 'image',
        api: {
          endpoint: '/images',
          method: 'POST',
          baseUrl: 'https://a.klaviyo.com/api',
          headers: {
            'Authorization': 'Klaviyo-API-Key {apiKey}',
            'Content-Type': 'application/json',
            'revision': '2024-10-15'
          }
        },
        inputSchema: {
          imageUrl: {
            type: 'string',
            required: true,
            label: 'Image URL',
            inputType: 'url',
            description: 'URL of the image to upload',
            aiControlled: false
          },
          name: {
            type: 'string',
            label: 'Image Name',
            aiControlled: true,
            aiDescription: 'The name to assign to the uploaded image.'
          }
        }
      },
      {
        id: 'get_images',
        name: 'Get Images',
        description: 'Get all uploaded images',
        category: 'Images',
        icon: 'image',
        api: {
          endpoint: '/images',
          method: 'GET',
          baseUrl: 'https://a.klaviyo.com/api',
          headers: {
            'Authorization': 'Klaviyo-API-Key {apiKey}',
            'revision': '2024-10-15'
          }
        },
        inputSchema: {
          pageSize: {
            type: 'number',
            label: 'Page Size',
            default: 20,
            aiControlled: false
          }
        }
      },

      // Tag Actions
      {
        id: 'create_tag',
        name: 'Create Tag',
        description: 'Create a new tag',
        category: 'Tags',
        icon: 'tag',
        api: {
          endpoint: '/tags',
          method: 'POST',
          baseUrl: 'https://a.klaviyo.com/api',
          headers: {
            'Authorization': 'Klaviyo-API-Key {apiKey}',
            'Content-Type': 'application/json',
            'revision': '2024-10-15'
          }
        },
        inputSchema: {
          name: {
            type: 'string',
            required: true,
            label: 'Tag Name',
            aiControlled: true,
            aiDescription: 'The name of the tag to create.'
          }
        }
      },
      {
        id: 'get_tag',
        name: 'Get Tag',
        description: 'Get a tag by ID',
        category: 'Tags',
        icon: 'tag',
        api: {
          endpoint: '/tags/{tagId}',
          method: 'GET',
          baseUrl: 'https://a.klaviyo.com/api',
          headers: {
            'Authorization': 'Klaviyo-API-Key {apiKey}',
            'revision': '2024-10-15'
          }
        },
        inputSchema: {
          tagId: {
            type: 'string',
            required: true,
            label: 'Tag ID',
            aiControlled: false
          }
        }
      },
      {
        id: 'get_tags',
        name: 'Get Tags',
        description: 'Get all tags',
        category: 'Tags',
        icon: 'tag',
        api: {
          endpoint: '/tags',
          method: 'GET',
          baseUrl: 'https://a.klaviyo.com/api',
          headers: {
            'Authorization': 'Klaviyo-API-Key {apiKey}',
            'revision': '2024-10-15'
          }
        },
        inputSchema: {
          pageSize: {
            type: 'number',
            label: 'Page Size',
            default: 20,
            aiControlled: false
          }
        }
      },
      {
        id: 'delete_tag',
        name: 'Delete Tag',
        description: 'Delete a tag',
        category: 'Tags',
        icon: 'trash',
        api: {
          endpoint: '/tags/{tagId}',
          method: 'DELETE',
          baseUrl: 'https://a.klaviyo.com/api',
          headers: {
            'Authorization': 'Klaviyo-API-Key {apiKey}',
            'revision': '2024-10-15'
          }
        },
        inputSchema: {
          tagId: {
            type: 'string',
            required: true,
            label: 'Tag ID',
            aiControlled: false
          }
        }
      },

      // Catalog Actions
      {
        id: 'create_catalog_item',
        name: 'Create Catalog Item',
        description: 'Create a catalog item (product)',
        category: 'Catalogs',
        icon: 'package',
        api: {
          endpoint: '/catalog-items',
          method: 'POST',
          baseUrl: 'https://a.klaviyo.com/api',
          headers: {
            'Authorization': 'Klaviyo-API-Key {apiKey}',
            'Content-Type': 'application/json',
            'revision': '2024-10-15'
          }
        },
        inputSchema: {
          externalId: {
            type: 'string',
            required: true,
            label: 'External ID',
            description: 'Unique product identifier',
            aiControlled: false
          },
          title: {
            type: 'string',
            required: true,
            label: 'Title',
            aiControlled: true,
            aiDescription: 'The title of the catalog item/product.'
          },
          description: {
            type: 'string',
            label: 'Description',
            inputType: 'textarea',
            aiControlled: true,
            aiDescription: 'The description of the catalog item/product.'
          },
          url: {
            type: 'string',
            label: 'Product URL',
            inputType: 'url',
            aiControlled: false
          },
          imageUrl: {
            type: 'string',
            label: 'Image URL',
            inputType: 'url',
            aiControlled: false
          },
          price: {
            type: 'number',
            label: 'Price',
            aiControlled: false
          },
          published: {
            type: 'boolean',
            label: 'Published',
            default: true,
            aiControlled: false
          }
        }
      },
      {
        id: 'get_catalog_item',
        name: 'Get Catalog Item',
        description: 'Get a catalog item by ID',
        category: 'Catalogs',
        icon: 'package',
        api: {
          endpoint: '/catalog-items/{itemId}',
          method: 'GET',
          baseUrl: 'https://a.klaviyo.com/api',
          headers: {
            'Authorization': 'Klaviyo-API-Key {apiKey}',
            'revision': '2024-10-15'
          }
        },
        inputSchema: {
          itemId: {
            type: 'string',
            required: true,
            label: 'Item ID',
            aiControlled: false
          }
        }
      },
      {
        id: 'get_catalog_items',
        name: 'Get Catalog Items',
        description: 'Get all catalog items',
        category: 'Catalogs',
        icon: 'package',
        api: {
          endpoint: '/catalog-items',
          method: 'GET',
          baseUrl: 'https://a.klaviyo.com/api',
          headers: {
            'Authorization': 'Klaviyo-API-Key {apiKey}',
            'revision': '2024-10-15'
          }
        },
        inputSchema: {
          pageSize: {
            type: 'number',
            label: 'Page Size',
            default: 20,
            aiControlled: false
          }
        }
      },
      {
        id: 'update_catalog_item',
        name: 'Update Catalog Item',
        description: 'Update a catalog item',
        category: 'Catalogs',
        icon: 'package',
        api: {
          endpoint: '/catalog-items/{itemId}',
          method: 'PATCH',
          baseUrl: 'https://a.klaviyo.com/api',
          headers: {
            'Authorization': 'Klaviyo-API-Key {apiKey}',
            'Content-Type': 'application/json',
            'revision': '2024-10-15'
          }
        },
        inputSchema: {
          itemId: {
            type: 'string',
            required: true,
            label: 'Item ID',
            aiControlled: false
          },
          title: {
            type: 'string',
            label: 'Title',
            aiControlled: true,
            aiDescription: 'Updated title for the catalog item/product.'
          },
          price: {
            type: 'number',
            label: 'Price',
            aiControlled: false
          }
        }
      },
      {
        id: 'delete_catalog_item',
        name: 'Delete Catalog Item',
        description: 'Delete a catalog item',
        category: 'Catalogs',
        icon: 'trash',
        api: {
          endpoint: '/catalog-items/{itemId}',
          method: 'DELETE',
          baseUrl: 'https://a.klaviyo.com/api',
          headers: {
            'Authorization': 'Klaviyo-API-Key {apiKey}',
            'revision': '2024-10-15'
          }
        },
        inputSchema: {
          itemId: {
            type: 'string',
            required: true,
            label: 'Item ID',
            aiControlled: false
          }
        }
      },

      // Form Actions
      {
        id: 'get_form',
        name: 'Get Form',
        description: 'Get a form by ID',
        category: 'Forms',
        icon: 'file-text',
        api: {
          endpoint: '/forms/{formId}',
          method: 'GET',
          baseUrl: 'https://a.klaviyo.com/api',
          headers: {
            'Authorization': 'Klaviyo-API-Key {apiKey}',
            'revision': '2024-10-15'
          }
        },
        inputSchema: {
          formId: {
            type: 'string',
            required: true,
            label: 'Form ID',
            aiControlled: false
          }
        }
      },
      {
        id: 'get_forms',
        name: 'Get Forms',
        description: 'Get all forms',
        category: 'Forms',
        icon: 'file-text',
        api: {
          endpoint: '/forms',
          method: 'GET',
          baseUrl: 'https://a.klaviyo.com/api',
          headers: {
            'Authorization': 'Klaviyo-API-Key {apiKey}',
            'revision': '2024-10-15'
          }
        },
        inputSchema: {
          pageSize: {
            type: 'number',
            label: 'Page Size',
            default: 20,
            aiControlled: false
          }
        }
      },

      // Coupon Actions
      {
        id: 'create_coupon',
        name: 'Create Coupon',
        description: 'Create a coupon code',
        category: 'Coupons',
        icon: 'tag',
        api: {
          endpoint: '/coupons',
          method: 'POST',
          baseUrl: 'https://a.klaviyo.com/api',
          headers: {
            'Authorization': 'Klaviyo-API-Key {apiKey}',
            'Content-Type': 'application/json',
            'revision': '2024-10-15'
          }
        },
        inputSchema: {
          code: {
            type: 'string',
            required: true,
            label: 'Coupon Code',
            aiControlled: false
          },
          description: {
            type: 'string',
            label: 'Description',
            aiControlled: true,
            aiDescription: 'The description of the coupon.'
          }
        }
      },
      {
        id: 'get_coupon',
        name: 'Get Coupon',
        description: 'Get a coupon by ID',
        category: 'Coupons',
        icon: 'tag',
        api: {
          endpoint: '/coupons/{couponId}',
          method: 'GET',
          baseUrl: 'https://a.klaviyo.com/api',
          headers: {
            'Authorization': 'Klaviyo-API-Key {apiKey}',
            'revision': '2024-10-15'
          }
        },
        inputSchema: {
          couponId: {
            type: 'string',
            required: true,
            label: 'Coupon ID',
            aiControlled: false
          }
        }
      },
      {
        id: 'get_coupons',
        name: 'Get Coupons',
        description: 'Get all coupons',
        category: 'Coupons',
        icon: 'tag',
        api: {
          endpoint: '/coupons',
          method: 'GET',
          baseUrl: 'https://a.klaviyo.com/api',
          headers: {
            'Authorization': 'Klaviyo-API-Key {apiKey}',
            'revision': '2024-10-15'
          }
        },
        inputSchema: {
          pageSize: {
            type: 'number',
            label: 'Page Size',
            default: 20,
            aiControlled: false
          }
        }
      }
    ],
    supported_triggers: [
      {
        id: 'profile_created',
        name: 'Profile Created',
        description: 'Triggered when a new profile is created',
        eventType: 'profile.created',
        webhookRequired: true,
        outputSchema: {
          profileId: { type: 'string' },
          email: { type: 'string' },
          timestamp: { type: 'string' }
        }
      },
      {
        id: 'profile_updated',
        name: 'Profile Updated',
        description: 'Triggered when a profile is updated',
        eventType: 'profile.updated',
        webhookRequired: true,
        outputSchema: {
          profileId: { type: 'string' },
          email: { type: 'string' },
          changes: { type: 'object' }
        }
      },
      {
        id: 'event_tracked',
        name: 'Event Tracked',
        description: 'Triggered when an event is tracked',
        eventType: 'event.tracked',
        webhookRequired: true,
        outputSchema: {
          eventId: { type: 'string' },
          eventName: { type: 'string' },
          profileId: { type: 'string' },
          properties: { type: 'object' }
        }
      },
      {
        id: 'list_member_added',
        name: 'List Member Added',
        description: 'Triggered when a profile is added to a list',
        eventType: 'list.member_added',
        webhookRequired: true,
        outputSchema: {
          listId: { type: 'string' },
          profileId: { type: 'string' }
        }
      },
      {
        id: 'list_member_removed',
        name: 'List Member Removed',
        description: 'Triggered when a profile is removed from a list',
        eventType: 'list.member_removed',
        webhookRequired: true,
        outputSchema: {
          listId: { type: 'string' },
          profileId: { type: 'string' }
        }
      },
      {
        id: 'campaign_sent',
        name: 'Campaign Sent',
        description: 'Triggered when a campaign is sent',
        eventType: 'campaign.sent',
        webhookRequired: true,
        outputSchema: {
          campaignId: { type: 'string' },
          sentAt: { type: 'string' }
        }
      },
      {
        id: 'flow_triggered',
        name: 'Flow Triggered',
        description: 'Triggered when a flow is activated for a profile',
        eventType: 'flow.triggered',
        webhookRequired: true,
        outputSchema: {
          flowId: { type: 'string' },
          profileId: { type: 'string' }
        }
      }
    ]
  };
