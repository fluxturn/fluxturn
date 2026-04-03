import { ConnectorDefinition } from '../../shared';

export const TOGGL_CONNECTOR: ConnectorDefinition = {
  name: 'toggl',
  display_name: 'Toggl Track',
  category: 'productivity',
  description: 'Time tracking tool for individuals and teams to track work hours and projects',
  auth_type: 'api_key',
  verified: false,

  auth_fields: [
    {
      key: 'apiToken',
      label: 'API Token',
      type: 'password',
      required: true,
      placeholder: 'Enter your Toggl API token',
      description: 'Your Toggl API token from Profile Settings',
      helpUrl: 'https://support.toggl.com/en/articles/3116844-where-is-my-api-key-located',
      helpText: 'How to find your API token',
    },
  ],

  endpoints: {
    base_url: 'https://api.track.toggl.com/api/v9',
    me: '/me',
    time_entries: '/me/time_entries',
    projects: '/me/projects',
    workspaces: '/me/workspaces',
    tags: '/me/tags',
  },

  webhook_support: false,

  rate_limits: {
    requests_per_second: 1,
  },

  supported_actions: [
    // Time Entry Actions
    {
      id: 'create_time_entry',
      name: 'Create Time Entry',
      description: 'Create a new time entry',
      category: 'Time Entry',
      icon: 'clock',
      verified: false,
      api: {
        endpoint: '/workspaces/{workspace_id}/time_entries',
        method: 'POST',
        baseUrl: 'https://api.track.toggl.com/api/v9',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Basic {apiToken}:api_token',
        },
        paramMapping: {
          workspaceId: 'workspace_id',
          description: 'description',
          start: 'start',
          duration: 'duration',
          projectId: 'project_id',
          taskId: 'task_id',
          billable: 'billable',
          tags: 'tags',
        },
      },
      inputSchema: {
        workspaceId: {
          type: 'number',
          required: true,
          label: 'Workspace ID',
          description: 'The workspace to create the time entry in',
          aiControlled: false,
        },
        description: {
          type: 'string',
          required: false,
          label: 'Description',
          inputType: 'textarea',
          description: 'Time entry description',
          aiControlled: true,
          aiDescription: 'A brief description of the work being tracked for this time entry',
        },
        start: {
          type: 'string',
          required: true,
          label: 'Start Time',
          description: 'Start time in ISO 8601 format (e.g., 2024-01-09T10:00:00Z)',
          aiControlled: false,
        },
        duration: {
          type: 'number',
          required: true,
          label: 'Duration',
          description: 'Duration in seconds (use -1 for running timer)',
          default: -1,
          aiControlled: false,
        },
        projectId: {
          type: 'number',
          required: false,
          label: 'Project ID',
          description: 'Project to associate with this time entry',
          aiControlled: false,
        },
        taskId: {
          type: 'number',
          required: false,
          label: 'Task ID',
          description: 'Task to associate with this time entry',
          aiControlled: false,
        },
        billable: {
          type: 'boolean',
          required: false,
          label: 'Billable',
          description: 'Is this time entry billable?',
          default: false,
          aiControlled: false,
        },
        tags: {
          type: 'array',
          required: false,
          label: 'Tags',
          description: 'Array of tag names',
          aiControlled: false,
        },
      },
      outputSchema: {
        id: { type: 'number', description: 'Time entry ID' },
        description: { type: 'string' },
        start: { type: 'string' },
        stop: { type: 'string' },
        duration: { type: 'number' },
        project_id: { type: 'number' },
        task_id: { type: 'number' },
        billable: { type: 'boolean' },
        tags: { type: 'array' },
      },
    },
    {
      id: 'get_time_entry',
      name: 'Get Time Entry',
      description: 'Get a specific time entry',
      category: 'Time Entry',
      icon: 'clock',
      verified: false,
      api: {
        endpoint: '/me/time_entries/{time_entry_id}',
        method: 'GET',
        baseUrl: 'https://api.track.toggl.com/api/v9',
        headers: {
          'Authorization': 'Basic {apiToken}:api_token',
        },
      },
      inputSchema: {
        timeEntryId: {
          type: 'number',
          required: true,
          label: 'Time Entry ID',
          aiControlled: false,
        },
      },
      outputSchema: {
        timeEntry: { type: 'object' },
      },
    },
    {
      id: 'update_time_entry',
      name: 'Update Time Entry',
      description: 'Update an existing time entry',
      category: 'Time Entry',
      icon: 'edit',
      verified: false,
      api: {
        endpoint: '/workspaces/{workspace_id}/time_entries/{time_entry_id}',
        method: 'PUT',
        baseUrl: 'https://api.track.toggl.com/api/v9',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Basic {apiToken}:api_token',
        },
      },
      inputSchema: {
        workspaceId: {
          type: 'number',
          required: true,
          label: 'Workspace ID',
          aiControlled: false,
        },
        timeEntryId: {
          type: 'number',
          required: true,
          label: 'Time Entry ID',
          aiControlled: false,
        },
        description: {
          type: 'string',
          required: false,
          label: 'Description',
          inputType: 'textarea',
          aiControlled: true,
          aiDescription: 'A brief description of the work being tracked for this time entry',
        },
        start: {
          type: 'string',
          required: false,
          label: 'Start Time',
          description: 'Start time in ISO 8601 format',
          aiControlled: false,
        },
        duration: {
          type: 'number',
          required: false,
          label: 'Duration',
          description: 'Duration in seconds',
          aiControlled: false,
        },
        billable: {
          type: 'boolean',
          required: false,
          label: 'Billable',
          aiControlled: false,
        },
        tags: {
          type: 'array',
          required: false,
          label: 'Tags',
          aiControlled: false,
        },
      },
      outputSchema: {
        timeEntry: { type: 'object' },
      },
    },
    {
      id: 'delete_time_entry',
      name: 'Delete Time Entry',
      description: 'Delete a time entry',
      category: 'Time Entry',
      icon: 'trash',
      verified: false,
      api: {
        endpoint: '/workspaces/{workspace_id}/time_entries/{time_entry_id}',
        method: 'DELETE',
        baseUrl: 'https://api.track.toggl.com/api/v9',
        headers: {
          'Authorization': 'Basic {apiToken}:api_token',
        },
      },
      inputSchema: {
        workspaceId: {
          type: 'number',
          required: true,
          label: 'Workspace ID',
          aiControlled: false,
        },
        timeEntryId: {
          type: 'number',
          required: true,
          label: 'Time Entry ID',
          aiControlled: false,
        },
      },
      outputSchema: {
        success: { type: 'boolean' },
      },
    },
    {
      id: 'stop_time_entry',
      name: 'Stop Time Entry',
      description: 'Stop a running time entry',
      category: 'Time Entry',
      icon: 'stop-circle',
      verified: false,
      api: {
        endpoint: '/workspaces/{workspace_id}/time_entries/{time_entry_id}/stop',
        method: 'PATCH',
        baseUrl: 'https://api.track.toggl.com/api/v9',
        headers: {
          'Authorization': 'Basic {apiToken}:api_token',
        },
      },
      inputSchema: {
        workspaceId: {
          type: 'number',
          required: true,
          label: 'Workspace ID',
          aiControlled: false,
        },
        timeEntryId: {
          type: 'number',
          required: true,
          label: 'Time Entry ID',
          aiControlled: false,
        },
      },
      outputSchema: {
        timeEntry: { type: 'object' },
      },
    },
    // Project Actions
    {
      id: 'create_project',
      name: 'Create Project',
      description: 'Create a new project',
      category: 'Project',
      icon: 'folder',
      verified: false,
      api: {
        endpoint: '/workspaces/{workspace_id}/projects',
        method: 'POST',
        baseUrl: 'https://api.track.toggl.com/api/v9',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Basic {apiToken}:api_token',
        },
      },
      inputSchema: {
        workspaceId: {
          type: 'number',
          required: true,
          label: 'Workspace ID',
          aiControlled: false,
        },
        name: {
          type: 'string',
          required: true,
          label: 'Project Name',
          aiControlled: true,
          aiDescription: 'A descriptive name for the project',
        },
        isPrivate: {
          type: 'boolean',
          required: false,
          label: 'Private Project',
          default: true,
          aiControlled: false,
        },
        clientId: {
          type: 'number',
          required: false,
          label: 'Client ID',
          aiControlled: false,
        },
        active: {
          type: 'boolean',
          required: false,
          label: 'Active',
          default: true,
          aiControlled: false,
        },
        color: {
          type: 'string',
          required: false,
          label: 'Color',
          description: 'Hex color code (e.g., #FF5733)',
          aiControlled: false,
        },
      },
      outputSchema: {
        id: { type: 'number' },
        name: { type: 'string' },
        workspace_id: { type: 'number' },
        client_id: { type: 'number' },
        active: { type: 'boolean' },
        color: { type: 'string' },
      },
    },
    {
      id: 'get_project',
      name: 'Get Project',
      description: 'Get a specific project',
      category: 'Project',
      icon: 'folder',
      verified: false,
      api: {
        endpoint: '/workspaces/{workspace_id}/projects/{project_id}',
        method: 'GET',
        baseUrl: 'https://api.track.toggl.com/api/v9',
        headers: {
          'Authorization': 'Basic {apiToken}:api_token',
        },
      },
      inputSchema: {
        workspaceId: {
          type: 'number',
          required: true,
          label: 'Workspace ID',
          aiControlled: false,
        },
        projectId: {
          type: 'number',
          required: true,
          label: 'Project ID',
          aiControlled: false,
        },
      },
      outputSchema: {
        project: { type: 'object' },
      },
    },
    {
      id: 'get_all_projects',
      name: 'Get All Projects',
      description: 'Get all projects in a workspace',
      category: 'Project',
      icon: 'folder',
      verified: false,
      api: {
        endpoint: '/workspaces/{workspace_id}/projects',
        method: 'GET',
        baseUrl: 'https://api.track.toggl.com/api/v9',
        headers: {
          'Authorization': 'Basic {apiToken}:api_token',
        },
      },
      inputSchema: {
        workspaceId: {
          type: 'number',
          required: true,
          label: 'Workspace ID',
          aiControlled: false,
        },
      },
      outputSchema: {
        projects: { type: 'array' },
      },
    },
    // Workspace Actions
    {
      id: 'get_all_workspaces',
      name: 'Get All Workspaces',
      description: 'Get all workspaces for the user',
      category: 'Workspace',
      icon: 'briefcase',
      verified: false,
      api: {
        endpoint: '/me/workspaces',
        method: 'GET',
        baseUrl: 'https://api.track.toggl.com/api/v9',
        headers: {
          'Authorization': 'Basic {apiToken}:api_token',
        },
      },
      inputSchema: {},
      outputSchema: {
        workspaces: {
          type: 'array',
          description: 'List of workspaces',
        },
      },
    },
  ],

  supported_triggers: [
    {
      id: 'new_time_entry',
      name: 'New Time Entry',
      description: 'Triggers when a new time entry is created',
      eventType: 'time_entry.created',
      icon: 'clock',
      pollingEnabled: true,
      webhookRequired: false,
      inputSchema: {
        pollingInterval: {
          type: 'select',
          required: false,
          label: 'Polling Interval',
          description: 'How often to check for new time entries',
          default: '5',
          options: [
            { label: 'Every minute', value: '1' },
            { label: 'Every 5 minutes', value: '5' },
            { label: 'Every 15 minutes', value: '15' },
            { label: 'Every 30 minutes', value: '30' },
            { label: 'Every hour', value: '60' },
          ],
          aiControlled: false,
        },
      },
      outputSchema: {
        id: { type: 'number', description: 'Time entry ID' },
        description: { type: 'string', description: 'Time entry description' },
        start: { type: 'string', description: 'Start time in ISO 8601 format' },
        stop: { type: 'string', description: 'Stop time in ISO 8601 format (null if running)' },
        duration: { type: 'number', description: 'Duration in seconds (negative if running)' },
        workspace_id: { type: 'number', description: 'Workspace ID' },
        project_id: { type: 'number', description: 'Project ID (if assigned)' },
        task_id: { type: 'number', description: 'Task ID (if assigned)' },
        billable: { type: 'boolean', description: 'Whether the time entry is billable' },
        tags: {
          type: 'array',
          description: 'Tags assigned to the time entry',
        },
        at: { type: 'string', description: 'Timestamp when the entry was last updated' },
      },
    },
  ],
};
