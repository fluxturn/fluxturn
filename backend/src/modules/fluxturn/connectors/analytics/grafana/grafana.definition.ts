// Grafana Connector Definition
// Based on n8n Grafana implementation

import { ConnectorDefinition } from '../../shared';

export const GRAFANA_CONNECTOR: ConnectorDefinition = {
  name: 'grafana',
  display_name: 'Grafana',
  category: 'analytics',
  description: 'Open source analytics and monitoring platform',
  auth_type: 'api_key',
  auth_fields: [
    {
      key: 'apiKey',
      label: 'API Key',
      type: 'password',
      required: true,
      placeholder: 'Enter your Grafana API Key',
      description: 'API key or service account token for authentication',
      helpUrl: 'https://grafana.com/docs/grafana/latest/administration/api-keys/',
      helpText: 'How to create an API key'
    },
    {
      key: 'baseUrl',
      label: 'Base URL',
      type: 'string',
      required: true,
      placeholder: 'https://your-grafana-instance.com',
      description: 'The base URL of your Grafana instance',
      helpText: 'Include protocol (http:// or https://) and exclude trailing slash'
    }
  ],
  endpoints: {
    base_url: '{baseUrl}/api',
    dashboards: '/dashboards/db',
    dashboard_uid: '/dashboards/uid/{uid}',
    search: '/search',
    teams: '/teams',
    team_search: '/teams/search',
    org_users: '/org/users'
  },
  webhook_support: false,
  rate_limits: { requests_per_second: 10 },
  sandbox_available: false,
  supported_actions: [
    // Dashboard actions
    {
      id: 'create_dashboard',
      name: 'Create Dashboard',
      description: 'Create a new dashboard',
      category: 'Dashboard',
      icon: 'layout-dashboard',
      api: {
        endpoint: '/dashboards/db',
        method: 'POST',
        baseUrl: '{baseUrl}/api',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer {apiKey}'
        }
      },
      inputSchema: {
        title: {
          type: 'string',
          required: true,
          label: 'Title',
          placeholder: 'My Dashboard',
          description: 'Title of the dashboard to create',
          aiControlled: true,
          aiDescription: 'The title for the new Grafana dashboard'
        },
        folderId: {
          type: 'string',
          required: false,
          label: 'Folder ID',
          placeholder: '0',
          description: 'ID of the folder to create the dashboard in (leave empty for General folder)',
          aiControlled: false
        }
      },
      outputSchema: {
        id: { type: 'number', description: 'Dashboard ID' },
        uid: { type: 'string', description: 'Dashboard UID' },
        url: { type: 'string', description: 'Dashboard URL' },
        status: { type: 'string', description: 'Status of the operation' },
        version: { type: 'number', description: 'Dashboard version' }
      }
    },
    {
      id: 'get_dashboard',
      name: 'Get Dashboard',
      description: 'Get a dashboard by UID or URL',
      category: 'Dashboard',
      icon: 'layout-dashboard',
      api: {
        endpoint: '/dashboards/uid/{uid}',
        method: 'GET',
        baseUrl: '{baseUrl}/api',
        headers: {
          'Authorization': 'Bearer {apiKey}'
        }
      },
      inputSchema: {
        dashboardUidOrUrl: {
          type: 'string',
          required: true,
          label: 'Dashboard UID or URL',
          placeholder: 'cIBgcSjkk or https://grafana.com/d/cIBgcSjkk/dashboard-name',
          description: 'Unique identifier or full URL of the dashboard to retrieve',
          aiControlled: false
        }
      },
      outputSchema: {
        dashboard: { type: 'object', description: 'Dashboard object' },
        meta: { type: 'object', description: 'Dashboard metadata' }
      }
    },
    {
      id: 'get_all_dashboards',
      name: 'Get All Dashboards',
      description: 'Get all dashboards with optional filters',
      category: 'Dashboard',
      icon: 'layout-dashboard',
      api: {
        endpoint: '/search',
        method: 'GET',
        baseUrl: '{baseUrl}/api',
        headers: {
          'Authorization': 'Bearer {apiKey}'
        }
      },
      inputSchema: {
        returnAll: {
          type: 'boolean',
          required: false,
          label: 'Return All',
          default: false,
          description: 'Whether to return all results or only up to a given limit',
          aiControlled: false
        },
        limit: {
          type: 'number',
          required: false,
          label: 'Limit',
          default: 50,
          min: 1,
          max: 100,
          description: 'Max number of results to return',
          displayOptions: {
            show: {
              returnAll: [false]
            }
          },
          aiControlled: false
        },
        query: {
          type: 'string',
          required: false,
          label: 'Search Query',
          placeholder: 'Dashboard name',
          description: 'Search query to filter dashboards',
          aiControlled: false
        }
      },
      outputSchema: {
        dashboards: { type: 'array', description: 'Array of dashboard objects' }
      }
    },
    {
      id: 'update_dashboard',
      name: 'Update Dashboard',
      description: 'Update an existing dashboard',
      category: 'Dashboard',
      icon: 'layout-dashboard',
      api: {
        endpoint: '/dashboards/db',
        method: 'POST',
        baseUrl: '{baseUrl}/api',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer {apiKey}'
        }
      },
      inputSchema: {
        dashboardUidOrUrl: {
          type: 'string',
          required: true,
          label: 'Dashboard UID or URL',
          placeholder: 'cIBgcSjkk',
          description: 'Unique identifier or URL of the dashboard to update',
          aiControlled: false
        },
        title: {
          type: 'string',
          required: false,
          label: 'Title',
          placeholder: 'Updated Dashboard Title',
          description: 'New title for the dashboard',
          aiControlled: true,
          aiDescription: 'The new title for the Grafana dashboard'
        },
        folderId: {
          type: 'string',
          required: false,
          label: 'Folder ID',
          placeholder: '0',
          description: 'ID of the folder to move the dashboard to',
          aiControlled: false
        }
      },
      outputSchema: {
        id: { type: 'number', description: 'Dashboard ID' },
        uid: { type: 'string', description: 'Dashboard UID' },
        url: { type: 'string', description: 'Dashboard URL' },
        status: { type: 'string', description: 'Status of the operation' },
        version: { type: 'number', description: 'Dashboard version' }
      }
    },
    {
      id: 'delete_dashboard',
      name: 'Delete Dashboard',
      description: 'Delete a dashboard by UID or URL',
      category: 'Dashboard',
      icon: 'layout-dashboard',
      api: {
        endpoint: '/dashboards/uid/{uid}',
        method: 'DELETE',
        baseUrl: '{baseUrl}/api',
        headers: {
          'Authorization': 'Bearer {apiKey}'
        }
      },
      inputSchema: {
        dashboardUidOrUrl: {
          type: 'string',
          required: true,
          label: 'Dashboard UID or URL',
          placeholder: 'cIBgcSjkk',
          description: 'Unique identifier or URL of the dashboard to delete',
          aiControlled: false
        }
      },
      outputSchema: {
        title: { type: 'string', description: 'Deleted dashboard title' },
        message: { type: 'string', description: 'Confirmation message' }
      }
    },

    // Team actions
    {
      id: 'create_team',
      name: 'Create Team',
      description: 'Create a new team',
      category: 'Team',
      icon: 'users',
      api: {
        endpoint: '/teams',
        method: 'POST',
        baseUrl: '{baseUrl}/api',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer {apiKey}'
        }
      },
      inputSchema: {
        name: {
          type: 'string',
          required: true,
          label: 'Name',
          placeholder: 'Engineering',
          description: 'Name of the team to create',
          aiControlled: true,
          aiDescription: 'The name for the new Grafana team'
        },
        email: {
          type: 'string',
          required: false,
          label: 'Email',
          placeholder: 'engineering@company.com',
          description: 'Email address for the team',
          aiControlled: false
        }
      },
      outputSchema: {
        teamId: { type: 'number', description: 'Created team ID' },
        message: { type: 'string', description: 'Confirmation message' }
      }
    },
    {
      id: 'get_team',
      name: 'Get Team',
      description: 'Get a team by ID',
      category: 'Team',
      icon: 'users',
      api: {
        endpoint: '/teams/{teamId}',
        method: 'GET',
        baseUrl: '{baseUrl}/api',
        headers: {
          'Authorization': 'Bearer {apiKey}'
        }
      },
      inputSchema: {
        teamId: {
          type: 'string',
          required: true,
          label: 'Team ID',
          placeholder: '1',
          description: 'ID of the team to retrieve',
          aiControlled: false
        }
      },
      outputSchema: {
        id: { type: 'number', description: 'Team ID' },
        name: { type: 'string', description: 'Team name' },
        email: { type: 'string', description: 'Team email' },
        orgId: { type: 'number', description: 'Organization ID' },
        memberCount: { type: 'number', description: 'Number of team members' }
      }
    },
    {
      id: 'get_all_teams',
      name: 'Get All Teams',
      description: 'Get all teams with optional filters',
      category: 'Team',
      icon: 'users',
      api: {
        endpoint: '/teams/search',
        method: 'GET',
        baseUrl: '{baseUrl}/api',
        headers: {
          'Authorization': 'Bearer {apiKey}'
        }
      },
      inputSchema: {
        returnAll: {
          type: 'boolean',
          required: false,
          label: 'Return All',
          default: false,
          description: 'Whether to return all results or only up to a given limit',
          aiControlled: false
        },
        limit: {
          type: 'number',
          required: false,
          label: 'Limit',
          default: 50,
          min: 1,
          description: 'Max number of results to return',
          displayOptions: {
            show: {
              returnAll: [false]
            }
          },
          aiControlled: false
        },
        name: {
          type: 'string',
          required: false,
          label: 'Team Name',
          placeholder: 'Engineering',
          description: 'Filter teams by name',
          aiControlled: false
        }
      },
      outputSchema: {
        teams: { type: 'array', description: 'Array of team objects' }
      }
    },
    {
      id: 'update_team',
      name: 'Update Team',
      description: 'Update an existing team',
      category: 'Team',
      icon: 'users',
      api: {
        endpoint: '/teams/{teamId}',
        method: 'PUT',
        baseUrl: '{baseUrl}/api',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer {apiKey}'
        }
      },
      inputSchema: {
        teamId: {
          type: 'string',
          required: true,
          label: 'Team ID',
          placeholder: '1',
          description: 'ID of the team to update',
          aiControlled: false
        },
        name: {
          type: 'string',
          required: false,
          label: 'Name',
          placeholder: 'Engineering Team',
          description: 'New name for the team',
          aiControlled: true,
          aiDescription: 'The new name for the Grafana team'
        },
        email: {
          type: 'string',
          required: false,
          label: 'Email',
          placeholder: 'engineering@company.com',
          description: 'New email address for the team',
          aiControlled: false
        }
      },
      outputSchema: {
        message: { type: 'string', description: 'Confirmation message' }
      }
    },
    {
      id: 'delete_team',
      name: 'Delete Team',
      description: 'Delete a team by ID',
      category: 'Team',
      icon: 'users',
      api: {
        endpoint: '/teams/{teamId}',
        method: 'DELETE',
        baseUrl: '{baseUrl}/api',
        headers: {
          'Authorization': 'Bearer {apiKey}'
        }
      },
      inputSchema: {
        teamId: {
          type: 'string',
          required: true,
          label: 'Team ID',
          placeholder: '1',
          description: 'ID of the team to delete',
          aiControlled: false
        }
      },
      outputSchema: {
        message: { type: 'string', description: 'Confirmation message' }
      }
    },

    // Team member actions
    {
      id: 'add_team_member',
      name: 'Add Team Member',
      description: 'Add a user to a team',
      category: 'Team Member',
      icon: 'user-plus',
      api: {
        endpoint: '/teams/{teamId}/members',
        method: 'POST',
        baseUrl: '{baseUrl}/api',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer {apiKey}'
        }
      },
      inputSchema: {
        teamId: {
          type: 'string',
          required: true,
          label: 'Team ID',
          placeholder: '1',
          description: 'ID of the team',
          aiControlled: false
        },
        userId: {
          type: 'string',
          required: true,
          label: 'User ID',
          placeholder: '2',
          description: 'ID of the user to add to the team',
          aiControlled: false
        }
      },
      outputSchema: {
        message: { type: 'string', description: 'Confirmation message' }
      }
    },
    {
      id: 'remove_team_member',
      name: 'Remove Team Member',
      description: 'Remove a user from a team',
      category: 'Team Member',
      icon: 'user-minus',
      api: {
        endpoint: '/teams/{teamId}/members/{memberId}',
        method: 'DELETE',
        baseUrl: '{baseUrl}/api',
        headers: {
          'Authorization': 'Bearer {apiKey}'
        }
      },
      inputSchema: {
        teamId: {
          type: 'string',
          required: true,
          label: 'Team ID',
          placeholder: '1',
          description: 'ID of the team',
          aiControlled: false
        },
        memberId: {
          type: 'string',
          required: true,
          label: 'Member ID',
          placeholder: '2',
          description: 'ID of the member to remove from the team',
          aiControlled: false
        }
      },
      outputSchema: {
        message: { type: 'string', description: 'Confirmation message' }
      }
    },
    {
      id: 'get_all_team_members',
      name: 'Get All Team Members',
      description: 'Get all members of a team',
      category: 'Team Member',
      icon: 'users',
      api: {
        endpoint: '/teams/{teamId}/members',
        method: 'GET',
        baseUrl: '{baseUrl}/api',
        headers: {
          'Authorization': 'Bearer {apiKey}'
        }
      },
      inputSchema: {
        teamId: {
          type: 'string',
          required: true,
          label: 'Team ID',
          placeholder: '1',
          description: 'ID of the team',
          aiControlled: false
        },
        returnAll: {
          type: 'boolean',
          required: false,
          label: 'Return All',
          default: false,
          description: 'Whether to return all results or only up to a given limit',
          aiControlled: false
        },
        limit: {
          type: 'number',
          required: false,
          label: 'Limit',
          default: 50,
          min: 1,
          description: 'Max number of results to return',
          displayOptions: {
            show: {
              returnAll: [false]
            }
          },
          aiControlled: false
        }
      },
      outputSchema: {
        members: { type: 'array', description: 'Array of team member objects' }
      }
    },

    // User actions
    {
      id: 'get_all_users',
      name: 'Get All Users',
      description: 'Get all users in the current organization',
      category: 'User',
      icon: 'users',
      api: {
        endpoint: '/org/users',
        method: 'GET',
        baseUrl: '{baseUrl}/api',
        headers: {
          'Authorization': 'Bearer {apiKey}'
        }
      },
      inputSchema: {
        returnAll: {
          type: 'boolean',
          required: false,
          label: 'Return All',
          default: false,
          description: 'Whether to return all results or only up to a given limit',
          aiControlled: false
        },
        limit: {
          type: 'number',
          required: false,
          label: 'Limit',
          default: 50,
          min: 1,
          description: 'Max number of results to return',
          displayOptions: {
            show: {
              returnAll: [false]
            }
          },
          aiControlled: false
        }
      },
      outputSchema: {
        users: { type: 'array', description: 'Array of user objects' }
      }
    },
    {
      id: 'update_user',
      name: 'Update User',
      description: 'Update a user in the current organization',
      category: 'User',
      icon: 'user',
      api: {
        endpoint: '/org/users/{userId}',
        method: 'PATCH',
        baseUrl: '{baseUrl}/api',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer {apiKey}'
        }
      },
      inputSchema: {
        userId: {
          type: 'string',
          required: true,
          label: 'User ID',
          placeholder: '2',
          description: 'ID of the user to update',
          aiControlled: false
        },
        role: {
          type: 'select',
          required: false,
          label: 'Role',
          default: 'Viewer',
          description: 'New role for the user',
          options: [
            { label: 'Admin', value: 'Admin' },
            { label: 'Editor', value: 'Editor' },
            { label: 'Viewer', value: 'Viewer' }
          ],
          aiControlled: false
        }
      },
      outputSchema: {
        message: { type: 'string', description: 'Confirmation message' }
      }
    },
    {
      id: 'delete_user',
      name: 'Delete User',
      description: 'Delete a user from the current organization',
      category: 'User',
      icon: 'user-minus',
      api: {
        endpoint: '/org/users/{userId}',
        method: 'DELETE',
        baseUrl: '{baseUrl}/api',
        headers: {
          'Authorization': 'Bearer {apiKey}'
        }
      },
      inputSchema: {
        userId: {
          type: 'string',
          required: true,
          label: 'User ID',
          placeholder: '2',
          description: 'ID of the user to delete',
          aiControlled: false
        }
      },
      outputSchema: {
        message: { type: 'string', description: 'Confirmation message' }
      }
    }
  ],
  supported_triggers: []
};
