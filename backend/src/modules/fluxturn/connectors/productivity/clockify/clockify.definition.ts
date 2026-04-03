import { ConnectorDefinition } from '../../shared';

export const CLOCKIFY_CONNECTOR: ConnectorDefinition = {
  name: 'clockify',
  display_name: 'Clockify',
  category: 'productivity',
  description: 'Time tracking and timesheet management for teams and freelancers',
  auth_type: 'api_key',
  verified: false,

  auth_fields: [
    {
      key: 'apiKey',
      label: 'API Key',
      type: 'password',
      required: true,
      placeholder: 'Enter your Clockify API key',
      description: 'Your Clockify API key from Settings > Profile settings',
      helpUrl: 'https://clockify.me/help/users/api',
      helpText: 'How to get your API key',
    },
  ],

  endpoints: {
    base_url: 'https://api.clockify.me/api/v1',
    workspaces: '/workspaces',
    time_entries: '/workspaces/{workspaceId}/time-entries',
    projects: '/workspaces/{workspaceId}/projects',
    clients: '/workspaces/{workspaceId}/clients',
    tags: '/workspaces/{workspaceId}/tags',
    tasks: '/workspaces/{workspaceId}/projects/{projectId}/tasks',
    users: '/workspaces/{workspaceId}/users',
  },

  webhook_support: false,

  rate_limits: {
    requests_per_second: 10,
  },

  supported_actions: [
    // Workspace Actions
    {
      id: 'get_all_workspaces',
      name: 'Get All Workspaces',
      description: 'Get all workspaces for the user',
      category: 'Workspace',
      icon: 'briefcase',
      verified: false,
      api: {
        endpoint: '/workspaces',
        method: 'GET',
        baseUrl: 'https://api.clockify.me/api/v1',
        headers: {
          'Content-Type': 'application/json',
          'X-Api-Key': '{apiKey}',
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
    // Time Entry Actions
    {
      id: 'create_time_entry',
      name: 'Create Time Entry',
      description: 'Create a new time entry',
      category: 'Time Entry',
      icon: 'clock',
      verified: false,
      api: {
        endpoint: '/workspaces/{workspaceId}/time-entries',
        method: 'POST',
        baseUrl: 'https://api.clockify.me/api/v1',
        headers: {
          'Content-Type': 'application/json',
          'X-Api-Key': '{apiKey}',
        },
        paramMapping: {
          workspaceId: 'workspaceId',
          start: 'start',
          billable: 'billable',
          description: 'description',
          projectId: 'projectId',
          taskId: 'taskId',
          tagIds: 'tagIds',
        },
      },
      inputSchema: {
        workspaceId: {
          type: 'string',
          required: true,
          label: 'Workspace ID',
          description: 'The workspace to create the time entry in',
          aiControlled: false,
        },
        start: {
          type: 'string',
          required: true,
          label: 'Start Time',
          description: 'Start time in ISO 8601 format (e.g., 2024-01-09T10:00:00Z)',
          aiControlled: false,
        },
        description: {
          type: 'string',
          required: false,
          label: 'Description',
          inputType: 'textarea',
          description: 'Time entry description',
          aiControlled: true,
          aiDescription: 'Description of the time entry explaining what work was done',
        },
        projectId: {
          type: 'string',
          required: false,
          label: 'Project ID',
          description: 'Project to associate with this time entry',
          aiControlled: false,
        },
        taskId: {
          type: 'string',
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
        tagIds: {
          type: 'array',
          required: false,
          label: 'Tag IDs',
          description: 'Array of tag IDs',
          aiControlled: false,
        },
        end: {
          type: 'string',
          required: false,
          label: 'End Time',
          description: 'End time in ISO 8601 format (leave empty for ongoing)',
          aiControlled: false,
        },
      },
      outputSchema: {
        id: { type: 'string', description: 'Time entry ID' },
        description: { type: 'string' },
        start: { type: 'string' },
        end: { type: 'string' },
        projectId: { type: 'string' },
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
        endpoint: '/workspaces/{workspaceId}/time-entries/{timeEntryId}',
        method: 'GET',
        baseUrl: 'https://api.clockify.me/api/v1',
        headers: {
          'Content-Type': 'application/json',
          'X-Api-Key': '{apiKey}',
        },
      },
      inputSchema: {
        workspaceId: {
          type: 'string',
          required: true,
          label: 'Workspace ID',
          aiControlled: false,
        },
        timeEntryId: {
          type: 'string',
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
        endpoint: '/workspaces/{workspaceId}/time-entries/{timeEntryId}',
        method: 'PUT',
        baseUrl: 'https://api.clockify.me/api/v1',
        headers: {
          'Content-Type': 'application/json',
          'X-Api-Key': '{apiKey}',
        },
      },
      inputSchema: {
        workspaceId: {
          type: 'string',
          required: true,
          label: 'Workspace ID',
          aiControlled: false,
        },
        timeEntryId: {
          type: 'string',
          required: true,
          label: 'Time Entry ID',
          aiControlled: false,
        },
        start: {
          type: 'string',
          required: true,
          label: 'Start Time',
          description: 'Start time in ISO 8601 format',
          aiControlled: false,
        },
        description: {
          type: 'string',
          required: false,
          label: 'Description',
          inputType: 'textarea',
          aiControlled: true,
          aiDescription: 'Description of the time entry explaining what work was done',
        },
        end: {
          type: 'string',
          required: false,
          label: 'End Time',
          aiControlled: false,
        },
        billable: {
          type: 'boolean',
          required: false,
          label: 'Billable',
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
        endpoint: '/workspaces/{workspaceId}/time-entries/{timeEntryId}',
        method: 'DELETE',
        baseUrl: 'https://api.clockify.me/api/v1',
        headers: {
          'X-Api-Key': '{apiKey}',
        },
      },
      inputSchema: {
        workspaceId: {
          type: 'string',
          required: true,
          label: 'Workspace ID',
          aiControlled: false,
        },
        timeEntryId: {
          type: 'string',
          required: true,
          label: 'Time Entry ID',
          aiControlled: false,
        },
      },
      outputSchema: {
        success: { type: 'boolean' },
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
        endpoint: '/workspaces/{workspaceId}/projects',
        method: 'POST',
        baseUrl: 'https://api.clockify.me/api/v1',
        headers: {
          'Content-Type': 'application/json',
          'X-Api-Key': '{apiKey}',
        },
      },
      inputSchema: {
        workspaceId: {
          type: 'string',
          required: true,
          label: 'Workspace ID',
          aiControlled: false,
        },
        name: {
          type: 'string',
          required: true,
          label: 'Project Name',
          aiControlled: true,
          aiDescription: 'Name of the project to create',
        },
        clientId: {
          type: 'string',
          required: false,
          label: 'Client ID',
          aiControlled: false,
        },
        isPublic: {
          type: 'boolean',
          required: false,
          label: 'Public Project',
          default: true,
          aiControlled: false,
        },
        billable: {
          type: 'boolean',
          required: false,
          label: 'Billable',
          default: false,
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
        id: { type: 'string' },
        name: { type: 'string' },
        clientId: { type: 'string' },
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
        endpoint: '/workspaces/{workspaceId}/projects/{projectId}',
        method: 'GET',
        baseUrl: 'https://api.clockify.me/api/v1',
        headers: {
          'X-Api-Key': '{apiKey}',
        },
      },
      inputSchema: {
        workspaceId: {
          type: 'string',
          required: true,
          label: 'Workspace ID',
          aiControlled: false,
        },
        projectId: {
          type: 'string',
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
        endpoint: '/workspaces/{workspaceId}/projects',
        method: 'GET',
        baseUrl: 'https://api.clockify.me/api/v1',
        headers: {
          'X-Api-Key': '{apiKey}',
        },
      },
      inputSchema: {
        workspaceId: {
          type: 'string',
          required: true,
          label: 'Workspace ID',
          aiControlled: false,
        },
      },
      outputSchema: {
        projects: { type: 'array' },
      },
    },
    {
      id: 'update_project',
      name: 'Update Project',
      description: 'Update an existing project',
      category: 'Project',
      icon: 'edit',
      verified: false,
      api: {
        endpoint: '/workspaces/{workspaceId}/projects/{projectId}',
        method: 'PUT',
        baseUrl: 'https://api.clockify.me/api/v1',
        headers: {
          'Content-Type': 'application/json',
          'X-Api-Key': '{apiKey}',
        },
      },
      inputSchema: {
        workspaceId: {
          type: 'string',
          required: true,
          label: 'Workspace ID',
          aiControlled: false,
        },
        projectId: {
          type: 'string',
          required: true,
          label: 'Project ID',
          aiControlled: false,
        },
        name: {
          type: 'string',
          required: false,
          label: 'Project Name',
          aiControlled: true,
          aiDescription: 'Updated name for the project',
        },
        color: {
          type: 'string',
          required: false,
          label: 'Color',
          aiControlled: false,
        },
      },
      outputSchema: {
        project: { type: 'object' },
      },
    },
    {
      id: 'delete_project',
      name: 'Delete Project',
      description: 'Delete a project',
      category: 'Project',
      icon: 'trash',
      verified: false,
      api: {
        endpoint: '/workspaces/{workspaceId}/projects/{projectId}',
        method: 'DELETE',
        baseUrl: 'https://api.clockify.me/api/v1',
        headers: {
          'X-Api-Key': '{apiKey}',
        },
      },
      inputSchema: {
        workspaceId: {
          type: 'string',
          required: true,
          label: 'Workspace ID',
          aiControlled: false,
        },
        projectId: {
          type: 'string',
          required: true,
          label: 'Project ID',
          aiControlled: false,
        },
      },
      outputSchema: {
        success: { type: 'boolean' },
      },
    },
    // Client Actions
    {
      id: 'create_client',
      name: 'Create Client',
      description: 'Create a new client',
      category: 'Client',
      icon: 'user',
      verified: false,
      api: {
        endpoint: '/workspaces/{workspaceId}/clients',
        method: 'POST',
        baseUrl: 'https://api.clockify.me/api/v1',
        headers: {
          'Content-Type': 'application/json',
          'X-Api-Key': '{apiKey}',
        },
      },
      inputSchema: {
        workspaceId: {
          type: 'string',
          required: true,
          label: 'Workspace ID',
          aiControlled: false,
        },
        name: {
          type: 'string',
          required: true,
          label: 'Client Name',
          aiControlled: true,
          aiDescription: 'Name of the client to create',
        },
      },
      outputSchema: {
        id: { type: 'string' },
        name: { type: 'string' },
      },
    },
    {
      id: 'get_all_clients',
      name: 'Get All Clients',
      description: 'Get all clients in a workspace',
      category: 'Client',
      icon: 'users',
      verified: false,
      api: {
        endpoint: '/workspaces/{workspaceId}/clients',
        method: 'GET',
        baseUrl: 'https://api.clockify.me/api/v1',
        headers: {
          'X-Api-Key': '{apiKey}',
        },
      },
      inputSchema: {
        workspaceId: {
          type: 'string',
          required: true,
          label: 'Workspace ID',
          aiControlled: false,
        },
      },
      outputSchema: {
        clients: { type: 'array' },
      },
    },
    // Tag Actions
    {
      id: 'create_tag',
      name: 'Create Tag',
      description: 'Create a new tag',
      category: 'Tag',
      icon: 'tag',
      verified: false,
      api: {
        endpoint: '/workspaces/{workspaceId}/tags',
        method: 'POST',
        baseUrl: 'https://api.clockify.me/api/v1',
        headers: {
          'Content-Type': 'application/json',
          'X-Api-Key': '{apiKey}',
        },
      },
      inputSchema: {
        workspaceId: {
          type: 'string',
          required: true,
          label: 'Workspace ID',
          aiControlled: false,
        },
        name: {
          type: 'string',
          required: true,
          label: 'Tag Name',
          aiControlled: true,
          aiDescription: 'Name of the tag to create',
        },
      },
      outputSchema: {
        id: { type: 'string' },
        name: { type: 'string' },
      },
    },
    {
      id: 'get_all_tags',
      name: 'Get All Tags',
      description: 'Get all tags in a workspace',
      category: 'Tag',
      icon: 'tags',
      verified: false,
      api: {
        endpoint: '/workspaces/{workspaceId}/tags',
        method: 'GET',
        baseUrl: 'https://api.clockify.me/api/v1',
        headers: {
          'X-Api-Key': '{apiKey}',
        },
      },
      inputSchema: {
        workspaceId: {
          type: 'string',
          required: true,
          label: 'Workspace ID',
          aiControlled: false,
        },
      },
      outputSchema: {
        tags: { type: 'array' },
      },
    },
    // Task Actions
    {
      id: 'create_task',
      name: 'Create Task',
      description: 'Create a new task in a project',
      category: 'Task',
      icon: 'check-square',
      verified: false,
      api: {
        endpoint: '/workspaces/{workspaceId}/projects/{projectId}/tasks',
        method: 'POST',
        baseUrl: 'https://api.clockify.me/api/v1',
        headers: {
          'Content-Type': 'application/json',
          'X-Api-Key': '{apiKey}',
        },
      },
      inputSchema: {
        workspaceId: {
          type: 'string',
          required: true,
          label: 'Workspace ID',
          aiControlled: false,
        },
        projectId: {
          type: 'string',
          required: true,
          label: 'Project ID',
          aiControlled: false,
        },
        name: {
          type: 'string',
          required: true,
          label: 'Task Name',
          aiControlled: true,
          aiDescription: 'Name of the task to create',
        },
        assigneeId: {
          type: 'string',
          required: false,
          label: 'Assignee ID',
          aiControlled: false,
        },
        estimate: {
          type: 'string',
          required: false,
          label: 'Estimate',
          description: 'Estimated time in format PT{H}H{M}M (e.g., PT2H30M)',
          aiControlled: false,
        },
      },
      outputSchema: {
        id: { type: 'string' },
        name: { type: 'string' },
        projectId: { type: 'string' },
      },
    },
    {
      id: 'get_all_tasks',
      name: 'Get All Tasks',
      description: 'Get all tasks in a project',
      category: 'Task',
      icon: 'list',
      verified: false,
      api: {
        endpoint: '/workspaces/{workspaceId}/projects/{projectId}/tasks',
        method: 'GET',
        baseUrl: 'https://api.clockify.me/api/v1',
        headers: {
          'X-Api-Key': '{apiKey}',
        },
      },
      inputSchema: {
        workspaceId: {
          type: 'string',
          required: true,
          label: 'Workspace ID',
          aiControlled: false,
        },
        projectId: {
          type: 'string',
          required: true,
          label: 'Project ID',
          aiControlled: false,
        },
      },
      outputSchema: {
        tasks: { type: 'array' },
      },
    },
    // User Actions
    {
      id: 'get_all_users',
      name: 'Get All Users',
      description: 'Get all users in a workspace',
      category: 'User',
      icon: 'users',
      verified: false,
      api: {
        endpoint: '/workspaces/{workspaceId}/users',
        method: 'GET',
        baseUrl: 'https://api.clockify.me/api/v1',
        headers: {
          'X-Api-Key': '{apiKey}',
        },
      },
      inputSchema: {
        workspaceId: {
          type: 'string',
          required: true,
          label: 'Workspace ID',
          aiControlled: false,
        },
      },
      outputSchema: {
        users: { type: 'array' },
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
        workspaceId: {
          type: 'string',
          required: true,
          label: 'Workspace ID',
          description: 'The workspace to monitor for new time entries',
          aiControlled: false,
        },
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
        id: { type: 'string', description: 'Time entry ID' },
        description: { type: 'string', description: 'Time entry description' },
        userId: { type: 'string', description: 'User ID who created the time entry' },
        workspaceId: { type: 'string', description: 'Workspace ID' },
        projectId: { type: 'string', description: 'Project ID (if assigned)' },
        taskId: { type: 'string', description: 'Task ID (if assigned)' },
        billable: { type: 'boolean', description: 'Whether the time entry is billable' },
        timeInterval: {
          type: 'object',
          description: 'Time interval information',
          properties: {
            start: { type: 'string', description: 'Start time in ISO 8601 format' },
            end: { type: 'string', description: 'End time in ISO 8601 format' },
            duration: { type: 'string', description: 'Duration in ISO 8601 format' },
          },
        },
        tags: {
          type: 'array',
          description: 'Tags assigned to the time entry',
        },
      },
    },
  ],
};
