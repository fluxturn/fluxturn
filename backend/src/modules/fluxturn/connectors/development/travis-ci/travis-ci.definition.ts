// Travis CI Connector Definition
// Ported from n8n to fluxturn

import { ConnectorDefinition } from '../../shared';

export const TRAVIS_CI_CONNECTOR: ConnectorDefinition = {
  name: 'travis_ci',
  display_name: 'Travis CI',
  category: 'development',
  description: 'Continuous integration service for GitHub projects. Monitor and trigger builds.',
  auth_type: 'api_key',
  verified: false,

  auth_fields: [
    {
      key: 'apiToken',
      label: 'API Token',
      type: 'password',
      required: true,
      placeholder: 'Enter your Travis CI API token',
      description: 'Your Travis CI API token',
      helpUrl: 'https://docs.travis-ci.com/user/tutorial/',
      helpText: 'How to get your API token'
    }
  ],

  endpoints: {
    base_url: 'https://api.travis-ci.com'
  },

  webhook_support: false,
  rate_limits: { requests_per_minute: 60 },

  supported_actions: [
    {
      id: 'get_build',
      name: 'Get Build',
      description: 'Get information about a specific build',
      category: 'Build',
      icon: 'file',
      verified: false,
      inputSchema: {
        buildId: {
          type: 'string',
          required: true,
          label: 'Build ID',
          description: 'The build ID',
          placeholder: '12345',
          aiControlled: false
        }
      },
      outputSchema: {}
    },
    {
      id: 'get_all_builds',
      name: 'Get All Builds',
      description: 'Get all builds for current user',
      category: 'Build',
      icon: 'list',
      verified: false,
      inputSchema: {
        returnAll: {
          type: 'boolean',
          label: 'Return All',
          description: 'Return all builds',
          default: false,
          aiControlled: false
        },
        limit: {
          type: 'number',
          label: 'Limit',
          description: 'Number of builds to return',
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
    {
      id: 'cancel_build',
      name: 'Cancel Build',
      description: 'Cancel a build',
      category: 'Build',
      icon: 'x',
      verified: false,
      inputSchema: {
        buildId: {
          type: 'string',
          required: true,
          label: 'Build ID',
          description: 'The build ID to cancel',
          placeholder: '12345',
          aiControlled: false
        }
      },
      outputSchema: {}
    },
    {
      id: 'restart_build',
      name: 'Restart Build',
      description: 'Restart a build',
      category: 'Build',
      icon: 'refresh-cw',
      verified: false,
      inputSchema: {
        buildId: {
          type: 'string',
          required: true,
          label: 'Build ID',
          description: 'The build ID to restart',
          placeholder: '12345',
          aiControlled: false
        }
      },
      outputSchema: {}
    },
    {
      id: 'trigger_build',
      name: 'Trigger Build',
      description: 'Trigger a new build',
      category: 'Build',
      icon: 'play',
      verified: false,
      inputSchema: {
        slug: {
          type: 'string',
          required: true,
          label: 'Repository Slug',
          description: 'Repository slug (owner/repo)',
          placeholder: 'username/repository',
          aiControlled: false
        },
        branch: {
          type: 'string',
          required: true,
          label: 'Branch',
          description: 'Branch name',
          placeholder: 'main',
          aiControlled: false
        },
        message: {
          type: 'string',
          label: 'Message',
          description: 'Build message',
          required: false,
          aiControlled: false
        }
      },
      outputSchema: {}
    }
  ],

  supported_triggers: []
};
