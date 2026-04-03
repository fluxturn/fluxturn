// Netlify Connector Definition
// Ported from n8n to fluxturn

import { ConnectorDefinition } from '../../shared';

export const NETLIFY_CONNECTOR: ConnectorDefinition = {
  name: 'netlify',
  display_name: 'Netlify',
  category: 'development',
  description: 'Deploy and manage static sites with Netlify. Manage sites, deploys, and builds.',
  auth_type: 'api_key',
  verified: true,

  auth_fields: [
    {
      key: 'accessToken',
      label: 'Access Token',
      type: 'password',
      required: true,
      placeholder: 'Enter your Netlify access token',
      description: 'Your Netlify personal access token',
      helpUrl: 'https://docs.netlify.com/api/get-started/#authentication',
      helpText: 'How to get your access token'
    }
  ],

  endpoints: {
    base_url: 'https://api.netlify.com/api/v1'
  },

  webhook_support: false,
  rate_limits: { requests_per_minute: 60 },

  supported_actions: [
    // Deploy Actions
    {
      id: 'cancel_deploy',
      name: 'Cancel Deploy',
      description: 'Cancel a specific deploy',
      category: 'Deploy',
      icon: 'x',
      verified: false,
      inputSchema: {
        deployId: {
          type: 'string',
          required: true,
          label: 'Deploy ID',
          description: 'ID of the deploy to cancel',
          placeholder: '5e3a8f7b4c6d2a0001234567',
          aiControlled: false
        }
      },
      outputSchema: {}
    },
    {
      id: 'create_deploy',
      name: 'Create Deploy',
      description: 'Create a new deploy for a site',
      category: 'Deploy',
      icon: 'plus',
      verified: false,
      inputSchema: {
        siteId: {
          type: 'string',
          required: true,
          label: 'Site ID',
          description: 'ID of the site to deploy',
          placeholder: '5e3a8f7b4c6d2a0001234567',
          aiControlled: false
        },
        title: {
          type: 'string',
          required: false,
          label: 'Deploy Title',
          description: 'Title for the deploy',
          placeholder: 'Production deploy',
          aiControlled: false
        }
      },
      outputSchema: {}
    },
    {
      id: 'get_deploy',
      name: 'Get Deploy',
      description: 'Get information about a specific deploy',
      category: 'Deploy',
      icon: 'file',
      verified: false,
      inputSchema: {
        siteId: {
          type: 'string',
          required: true,
          label: 'Site ID',
          description: 'ID of the site',
          placeholder: '5e3a8f7b4c6d2a0001234567',
          aiControlled: false
        },
        deployId: {
          type: 'string',
          required: true,
          label: 'Deploy ID',
          description: 'ID of the deploy',
          placeholder: '5e3a8f7b4c6d2a0001234567',
          aiControlled: false
        }
      },
      outputSchema: {}
    },
    {
      id: 'get_all_deploys',
      name: 'Get All Deploys',
      description: 'Get all deploys for a site',
      category: 'Deploy',
      icon: 'list',
      verified: false,
      inputSchema: {
        siteId: {
          type: 'string',
          required: true,
          label: 'Site ID',
          description: 'ID of the site',
          placeholder: '5e3a8f7b4c6d2a0001234567',
          aiControlled: false
        },
        returnAll: {
          type: 'boolean',
          label: 'Return All',
          description: 'Return all deploys',
          default: false,
          aiControlled: false
        },
        limit: {
          type: 'number',
          label: 'Limit',
          description: 'Number of deploys to return',
          default: 50,
          displayOptions: {
            show: {
              returnAll: [false]
            }
          },
          aiControlled: false
        }
      },
      outputSchema: {}
    },
    // Site Actions
    {
      id: 'delete_site',
      name: 'Delete Site',
      description: 'Delete a site',
      category: 'Site',
      icon: 'trash',
      verified: false,
      inputSchema: {
        siteId: {
          type: 'string',
          required: true,
          label: 'Site ID',
          description: 'ID of the site to delete',
          placeholder: '5e3a8f7b4c6d2a0001234567',
          aiControlled: false
        }
      },
      outputSchema: {}
    },
    {
      id: 'get_site',
      name: 'Get Site',
      description: 'Get information about a specific site',
      category: 'Site',
      icon: 'file',
      verified: false,
      inputSchema: {
        siteId: {
          type: 'string',
          required: true,
          label: 'Site ID',
          description: 'ID of the site',
          placeholder: '5e3a8f7b4c6d2a0001234567',
          aiControlled: false
        }
      },
      outputSchema: {}
    },
    {
      id: 'get_all_sites',
      name: 'Get All Sites',
      description: 'Get all sites',
      category: 'Site',
      icon: 'list',
      verified: false,
      inputSchema: {
        returnAll: {
          type: 'boolean',
          label: 'Return All',
          description: 'Return all sites',
          default: false,
          aiControlled: false
        },
        limit: {
          type: 'number',
          label: 'Limit',
          description: 'Number of sites to return',
          default: 50,
          displayOptions: {
            show: {
              returnAll: [false]
            }
          },
          aiControlled: false
        }
      },
      outputSchema: {}
    }
  ],

  supported_triggers: []
};
