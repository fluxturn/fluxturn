// Bitbucket Connector Definition
// Ported from n8n to fluxturn

import { ConnectorDefinition } from '../../shared';

export const BITBUCKET_CONNECTOR: ConnectorDefinition = {
  name: 'bitbucket',
  display_name: 'Bitbucket',
  category: 'development',
  description: 'Git repository hosting and collaboration platform. Manage repositories, pull requests, and webhooks.',
  auth_type: 'basic_auth',
  verified: true,

  auth_fields: [
    {
      key: 'username',
      label: 'Username',
      type: 'string',
      required: true,
      placeholder: 'your-username',
      description: 'Your Bitbucket username'
    },
    {
      key: 'appPassword',
      label: 'App Password',
      type: 'password',
      required: true,
      placeholder: 'Enter your app password',
      description: 'Bitbucket app password',
      helpUrl: 'https://support.atlassian.com/bitbucket-cloud/docs/app-passwords/',
      helpText: 'How to create an app password'
    }
  ],

  endpoints: {
    base_url: 'https://api.bitbucket.org/2.0'
  },

  webhook_support: true,
  rate_limits: { requests_per_minute: 60 },

  supported_actions: [
    {
      id: 'get_repository',
      name: 'Get Repository',
      description: 'Get repository information',
      category: 'Repository',
      icon: 'file',
      verified: false,
      inputSchema: {
        workspace: {
          type: 'string',
          required: true,
          label: 'Workspace',
          description: 'Workspace slug',
          placeholder: 'my-workspace',
          aiControlled: false
        },
        repository: {
          type: 'string',
          required: true,
          label: 'Repository',
          description: 'Repository slug',
          placeholder: 'my-repo',
          aiControlled: false
        }
      },
      outputSchema: {}
    },
    {
      id: 'list_repositories',
      name: 'List Repositories',
      description: 'List all repositories',
      category: 'Repository',
      icon: 'list',
      verified: false,
      inputSchema: {
        workspace: {
          type: 'string',
          required: true,
          label: 'Workspace',
          description: 'Workspace slug',
          placeholder: 'my-workspace',
          aiControlled: false
        }
      },
      outputSchema: {}
    },
    {
      id: 'list_workspaces',
      name: 'List Workspaces',
      description: 'List all workspaces',
      category: 'Workspace',
      icon: 'list',
      verified: false,
      inputSchema: {},
      outputSchema: {}
    }
  ],

  supported_triggers: [
    {
      id: 'repository_event',
      name: 'Repository Event',
      description: 'Triggers on repository events',
      eventType: 'repository',
      webhookRequired: true,
      inputSchema: {
        workspace: {
          type: 'string',
          required: true,
          label: 'Workspace',
          description: 'Workspace slug',
          aiControlled: false
        },
        repository: {
          type: 'string',
          required: true,
          label: 'Repository',
          description: 'Repository slug',
          aiControlled: false
        },
        events: {
          type: 'array',
          required: true,
          label: 'Events',
          description: 'Events to listen for',
          itemSchema: {
            type: 'string'
          },
          aiControlled: false
        }
      },
      outputSchema: {}
    }
  ]
};
