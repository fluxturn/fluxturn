// Bitly Connector Definition
// Converted from n8n Bitly node

import { ConnectorDefinition } from '../../shared';

export const BITLY_CONNECTOR: ConnectorDefinition = {
  name: 'bitly',
  display_name: 'Bitly',
  category: 'utility',
  description: 'Shorten URLs, manage links, and track click analytics with Bitly',
  auth_type: 'api_key',
  complexity: 'Simple',
  verified: true,

  auth_fields: [
    {
      key: 'accessToken',
      label: 'Access Token',
      type: 'password',
      required: true,
      placeholder: 'Enter your Bitly access token',
      description: 'Get your access token from Bitly settings',
      helpUrl: 'https://bitly.com/a/settings/api',
      helpText: 'How to get access token'
    }
  ],

  endpoints: {
    base_url: 'https://api-ssl.bitly.com/v4',
    bitlinks: '/bitlinks',
    groups: '/groups',
    user: '/user'
  },

  webhook_support: false,
  rate_limits: {
    requests_per_minute: 100,
    requests_per_second: 5
  },
  sandbox_available: false,

  supported_actions: [
    {
      id: 'create_link',
      name: 'Create Link',
      description: 'Create a new short link (bitlink)',
      category: 'Link',
      icon: 'link',
      verified: false,
      api: {
        endpoint: '/bitlinks',
        method: 'POST',
        baseUrl: 'https://api-ssl.bitly.com/v4',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer {accessToken}'
        },
        paramMapping: {
          longUrl: 'long_url',
          title: 'title',
          domain: 'domain',
          group: 'group_guid',
          tags: 'tags'
        }
      },
      inputSchema: {
        longUrl: {
          type: 'string',
          required: true,
          label: 'Long URL',
          placeholder: 'https://example.com/very/long/url',
          description: 'The URL you want to shorten',
          inputType: 'url',
          aiControlled: false
        },
        title: {
          type: 'string',
          required: false,
          label: 'Title',
          placeholder: 'My Link',
          description: 'Title for the short link',
          inputType: 'text',
          aiControlled: true,
          aiDescription: 'A descriptive title for the shortened link that helps identify its purpose or content'
        },
        domain: {
          type: 'string',
          required: false,
          label: 'Domain',
          placeholder: 'bit.ly',
          description: 'Custom domain to use (default: bit.ly)',
          inputType: 'text',
          aiControlled: false
        },
        group: {
          type: 'string',
          required: false,
          label: 'Group GUID',
          placeholder: 'Ba1bc23dE4F',
          description: 'The GUID of the group to which this link belongs',
          inputType: 'text',
          aiControlled: false
        },
        tags: {
          type: 'array',
          required: false,
          label: 'Tags',
          description: 'Tags to organize your links',
          itemSchema: {
            type: 'string'
          },
          aiControlled: true,
          aiDescription: 'Relevant tags to categorize and organize the link for easy filtering and discovery'
        }
      },
      outputSchema: {
        id: {
          type: 'string',
          description: 'Bitlink ID'
        },
        link: {
          type: 'string',
          description: 'Short URL'
        },
        long_url: {
          type: 'string',
          description: 'Original long URL'
        },
        created_at: {
          type: 'string',
          description: 'Creation timestamp'
        }
      }
    },
    {
      id: 'update_link',
      name: 'Update Link',
      description: 'Update an existing bitlink',
      category: 'Link',
      icon: 'edit',
      verified: false,
      api: {
        endpoint: '/bitlinks/{id}',
        method: 'PATCH',
        baseUrl: 'https://api-ssl.bitly.com/v4',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer {accessToken}'
        },
        paramMapping: {
          linkId: 'id',
          longUrl: 'long_url',
          title: 'title',
          archived: 'archived',
          tags: 'tags'
        }
      },
      inputSchema: {
        linkId: {
          type: 'string',
          required: true,
          label: 'Bitlink ID',
          placeholder: 'bit.ly/abc123',
          description: 'The ID of the bitlink to update',
          inputType: 'text',
          aiControlled: false
        },
        longUrl: {
          type: 'string',
          required: false,
          label: 'New Long URL',
          placeholder: 'https://example.com/new/url',
          description: 'Update the long URL',
          inputType: 'url',
          aiControlled: false
        },
        title: {
          type: 'string',
          required: false,
          label: 'Title',
          placeholder: 'Updated Title',
          description: 'Update the title',
          inputType: 'text',
          aiControlled: true,
          aiDescription: 'A descriptive title for the shortened link that helps identify its purpose or content'
        },
        archived: {
          type: 'boolean',
          required: false,
          label: 'Archived',
          description: 'Archive or unarchive the bitlink',
          default: false,
          aiControlled: false
        },
        tags: {
          type: 'array',
          required: false,
          label: 'Tags',
          description: 'Update tags',
          itemSchema: {
            type: 'string'
          },
          aiControlled: true,
          aiDescription: 'Relevant tags to categorize and organize the link for easy filtering and discovery'
        }
      },
      outputSchema: {
        id: {
          type: 'string',
          description: 'Bitlink ID'
        },
        link: {
          type: 'string',
          description: 'Short URL'
        },
        long_url: {
          type: 'string',
          description: 'Long URL'
        },
        archived: {
          type: 'boolean',
          description: 'Archive status'
        }
      }
    },
    {
      id: 'get_link',
      name: 'Get Link',
      description: 'Get information about a bitlink',
      category: 'Link',
      icon: 'info',
      verified: false,
      api: {
        endpoint: '/bitlinks/{id}',
        method: 'GET',
        baseUrl: 'https://api-ssl.bitly.com/v4',
        headers: {
          'Authorization': 'Bearer {accessToken}'
        },
        paramMapping: {
          linkId: 'id'
        }
      },
      inputSchema: {
        linkId: {
          type: 'string',
          required: true,
          label: 'Bitlink ID',
          placeholder: 'bit.ly/abc123',
          description: 'The ID of the bitlink to retrieve',
          inputType: 'text',
          aiControlled: false
        }
      },
      outputSchema: {
        id: {
          type: 'string',
          description: 'Bitlink ID'
        },
        link: {
          type: 'string',
          description: 'Short URL'
        },
        long_url: {
          type: 'string',
          description: 'Long URL'
        },
        title: {
          type: 'string',
          description: 'Link title'
        },
        archived: {
          type: 'boolean',
          description: 'Archive status'
        },
        created_at: {
          type: 'string',
          description: 'Creation timestamp'
        },
        tags: {
          type: 'array',
          description: 'Link tags'
        }
      }
    }
  ],

  supported_triggers: []
};
