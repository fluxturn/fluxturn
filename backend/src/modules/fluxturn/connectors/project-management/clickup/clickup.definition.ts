// ClickUp Connector
// Comprehensive ClickUp project management integration

import { ConnectorDefinition } from '../../shared';

export const CLICKUP_CONNECTOR: ConnectorDefinition = {
  name: 'clickup',
  display_name: 'ClickUp',
  category: 'project_management',
  description: 'Comprehensive ClickUp integration for task management, lists, folders, goals, time tracking, and team collaboration',
  auth_type: 'multiple',
  auth_fields: [
    {
      key: 'authMode',
      label: 'Authentication Mode',
      type: 'select',
      required: true,
      default: 'oneclick',
      options: [
        { label: 'One-Click OAuth (Use Platform Credentials)', value: 'oneclick' },
        { label: 'Manual OAuth (Use Your Own ClickUp App)', value: 'manual' }
      ],
      description: 'Choose between platform-managed OAuth or your own ClickUp OAuth app',
      helpText: 'One-Click OAuth is easier and recommended for most users. Use Manual OAuth if you need custom configuration or branding.'
    },
    {
      key: 'clientId',
      label: 'Client ID',
      type: 'string',
      required: false,
      placeholder: 'Enter your ClickUp App Client ID',
      description: 'OAuth2 Client ID from your ClickUp App',
      helpUrl: 'https://clickup.com/api/developer-portal/myapps',
      helpText: 'Create a ClickUp App at clickup.com/api/developer-portal/myapps',
      displayOptions: { authMode: ['manual'] }
    },
    {
      key: 'clientSecret',
      label: 'Client Secret',
      type: 'password',
      required: false,
      placeholder: 'Enter your ClickUp App Client Secret',
      description: 'OAuth2 Client Secret from your ClickUp App',
      helpUrl: 'https://clickup.com/api/developer-portal/myapps',
      helpText: 'Find App Secret in your ClickUp App settings',
      displayOptions: { authMode: ['manual'] }
    },
    {
      key: 'redirectUrl',
      label: 'OAuth Redirect URL',
      type: 'string',
      required: false,
      placeholder: 'https://your-domain.com/oauth/callback',
      description: 'The redirect URL configured in your ClickUp App',
      helpUrl: 'https://clickup.com/api/developer-portal/myapps',
      helpText: 'Must match the redirect URL in your ClickUp App OAuth settings',
      displayOptions: { authMode: ['manual'] }
    }
  ],
  oauth_config: {
    authorization_url: 'https://app.clickup.com/api',
    token_url: 'https://api.clickup.com/api/v2/oauth/token',
    scopes: [] // ClickUp OAuth doesn't use scopes
  },
  endpoints: {
    base_url: 'https://api.clickup.com/api/v2',
    authorization: '/oauth/authorize',
    token: '/oauth/token',
    user: '/user',
    workspaces: '/team',
    spaces: '/team/{team_id}/space',
    folders: '/space/{space_id}/folder',
    lists: '/folder/{folder_id}/list',
    tasks: '/list/{list_id}/task',
    goals: '/team/{team_id}/goal',
    time_entries: '/team/{team_id}/time_entries'
  },
  webhook_support: true,
  rate_limits: {
    requests_per_minute: 100, // Default tier
    requests_per_minute_team: 1000, // Team tier
    requests_per_minute_enterprise: 10000 // Enterprise tier
  },
  sandbox_available: false,
  supported_actions: [
    // Task Actions
    {
      id: 'task_create',
      name: 'Create Task',
      description: 'Create a new task in ClickUp',
      category: 'Task',
      icon: 'plus-circle',
      verified: false,
      api: {
        endpoint: '/list/{list_id}/task',
        method: 'POST',
        baseUrl: 'https://api.clickup.com/api/v2',
        headers: {
          'Content-Type': 'application/json'
        },
        paramMapping: {
          listId: 'list_id',
          name: 'name',
          description: 'description',
          assignees: 'assignees',
          tags: 'tags',
          status: 'status',
          priority: 'priority',
          dueDate: 'due_date',
          startDate: 'start_date'
        }
      },
      inputSchema: {
        listId: {
          type: 'string',
          required: true,
          label: 'List ID',
          placeholder: '123456789',
          description: 'The ID of the list to create the task in',
          aiControlled: false
        },
        name: {
          type: 'string',
          required: true,
          label: 'Task Name',
          placeholder: 'Complete project documentation',
          description: 'Name of the task',
          aiControlled: true,
          aiDescription: 'Name/title of the task to create'
        },
        description: {
          type: 'string',
          label: 'Description',
          inputType: 'textarea',
          placeholder: 'Task description...',
          description: 'Task description (supports Markdown)',
          aiControlled: true,
          aiDescription: 'Detailed description of the task'
        },
        status: {
          type: 'string',
          label: 'Status',
          placeholder: 'to do',
          description: 'Task status name',
          aiControlled: false
        },
        priority: {
          type: 'select',
          label: 'Priority',
          options: [
            { label: 'Urgent', value: 1 },
            { label: 'High', value: 2 },
            { label: 'Normal', value: 3 },
            { label: 'Low', value: 4 }
          ],
          description: 'Task priority level',
          aiControlled: false
        },
        dueDate: {
          type: 'number',
          label: 'Due Date',
          placeholder: '1621550400000',
          description: 'Due date in Unix milliseconds timestamp',
          aiControlled: false
        },
        startDate: {
          type: 'number',
          label: 'Start Date',
          placeholder: '1621464000000',
          description: 'Start date in Unix milliseconds timestamp',
          aiControlled: false
        },
        assignees: {
          type: 'array',
          label: 'Assignees',
          description: 'Array of user IDs to assign',
          itemSchema: {
            value: { type: 'number' }
          },
          aiControlled: false
        },
        tags: {
          type: 'array',
          label: 'Tags',
          description: 'Array of tag names',
          itemSchema: {
            value: { type: 'string' }
          },
          aiControlled: true,
          aiDescription: 'Tags to apply to the task'
        }
      },
      outputSchema: {
        id: { type: 'string', description: 'Created task ID' },
        name: { type: 'string', description: 'Task name' },
        url: { type: 'string', description: 'Task URL' }
      }
    },
    {
      id: 'task_update',
      name: 'Update Task',
      description: 'Update an existing task',
      category: 'Task',
      icon: 'edit',
      verified: false,
      api: {
        endpoint: '/task/{task_id}',
        method: 'PUT',
        baseUrl: 'https://api.clickup.com/api/v2',
        headers: {
          'Content-Type': 'application/json'
        },
        paramMapping: {
          taskId: 'task_id',
          name: 'name',
          description: 'description',
          status: 'status',
          priority: 'priority'
        }
      },
      inputSchema: {
        taskId: {
          type: 'string',
          required: true,
          label: 'Task ID',
          placeholder: '9hz',
          description: 'The ID of the task to update'
        },
        name: {
          type: 'string',
          label: 'Task Name',
          description: 'Updated task name'
        },
        description: {
          type: 'string',
          label: 'Description',
          inputType: 'textarea',
          description: 'Updated task description'
        },
        status: {
          type: 'string',
          label: 'Status',
          description: 'Updated status'
        },
        priority: {
          type: 'select',
          label: 'Priority',
          options: [
            { label: 'Urgent', value: 1 },
            { label: 'High', value: 2 },
            { label: 'Normal', value: 3 },
            { label: 'Low', value: 4 }
          ]
        }
      },
      outputSchema: {
        id: { type: 'string', description: 'Task ID' },
        success: { type: 'boolean', description: 'Whether update was successful' }
      }
    },
    {
      id: 'task_get',
      name: 'Get Task',
      description: 'Retrieve a task by ID',
      category: 'Task',
      icon: 'file-text',
      verified: false,
      api: {
        endpoint: '/task/{task_id}',
        method: 'GET',
        baseUrl: 'https://api.clickup.com/api/v2',
        paramMapping: {
          taskId: 'task_id'
        }
      },
      inputSchema: {
        taskId: {
          type: 'string',
          required: true,
          label: 'Task ID',
          placeholder: '9hz'
        }
      },
      outputSchema: {
        task: { type: 'object', description: 'Task information' }
      }
    },
    {
      id: 'task_delete',
      name: 'Delete Task',
      description: 'Delete a task',
      category: 'Task',
      icon: 'trash-2',
      verified: false,
      api: {
        endpoint: '/task/{task_id}',
        method: 'DELETE',
        baseUrl: 'https://api.clickup.com/api/v2',
        paramMapping: {
          taskId: 'task_id'
        }
      },
      inputSchema: {
        taskId: {
          type: 'string',
          required: true,
          label: 'Task ID',
          placeholder: '9hz'
        }
      },
      outputSchema: {
        success: { type: 'boolean', description: 'Whether deletion was successful' }
      }
    },
    {
      id: 'task_get_all',
      name: 'Get All Tasks',
      description: 'Get tasks from a list',
      category: 'Task',
      icon: 'list',
      verified: false,
      api: {
        endpoint: '/list/{list_id}/task',
        method: 'GET',
        baseUrl: 'https://api.clickup.com/api/v2',
        paramMapping: {
          listId: 'list_id',
          archived: 'archived',
          subtasks: 'subtasks'
        }
      },
      inputSchema: {
        listId: {
          type: 'string',
          required: true,
          label: 'List ID',
          placeholder: '123456789'
        },
        archived: {
          type: 'boolean',
          label: 'Include Archived',
          default: false,
          description: 'Include archived tasks'
        },
        subtasks: {
          type: 'boolean',
          label: 'Include Subtasks',
          default: false,
          description: 'Include subtasks'
        }
      },
      outputSchema: {
        tasks: { type: 'array', description: 'List of tasks' }
      }
    },

    // List Actions
    {
      id: 'list_create',
      name: 'Create List',
      description: 'Create a new list in a folder',
      category: 'List',
      icon: 'list',
      verified: false,
      api: {
        endpoint: '/folder/{folder_id}/list',
        method: 'POST',
        baseUrl: 'https://api.clickup.com/api/v2',
        headers: {
          'Content-Type': 'application/json'
        },
        paramMapping: {
          folderId: 'folder_id',
          name: 'name',
          content: 'content'
        }
      },
      inputSchema: {
        folderId: {
          type: 'string',
          required: true,
          label: 'Folder ID',
          placeholder: '123456789',
          description: 'The ID of the folder'
        },
        name: {
          type: 'string',
          required: true,
          label: 'List Name',
          placeholder: 'Sprint Tasks'
        },
        content: {
          type: 'string',
          label: 'Description',
          inputType: 'textarea',
          placeholder: 'List description...'
        }
      },
      outputSchema: {
        id: { type: 'string', description: 'Created list ID' },
        name: { type: 'string', description: 'List name' }
      }
    },
    {
      id: 'list_update',
      name: 'Update List',
      description: 'Update a list',
      category: 'List',
      icon: 'edit',
      verified: false,
      api: {
        endpoint: '/list/{list_id}',
        method: 'PUT',
        baseUrl: 'https://api.clickup.com/api/v2',
        headers: {
          'Content-Type': 'application/json'
        },
        paramMapping: {
          listId: 'list_id',
          name: 'name',
          content: 'content'
        }
      },
      inputSchema: {
        listId: {
          type: 'string',
          required: true,
          label: 'List ID',
          placeholder: '123456789'
        },
        name: {
          type: 'string',
          label: 'List Name'
        },
        content: {
          type: 'string',
          label: 'Description',
          inputType: 'textarea'
        }
      },
      outputSchema: {
        success: { type: 'boolean', description: 'Whether update was successful' }
      }
    },
    {
      id: 'list_get',
      name: 'Get List',
      description: 'Get a list by ID',
      category: 'List',
      icon: 'file-text',
      verified: false,
      api: {
        endpoint: '/list/{list_id}',
        method: 'GET',
        baseUrl: 'https://api.clickup.com/api/v2',
        paramMapping: {
          listId: 'list_id'
        }
      },
      inputSchema: {
        listId: {
          type: 'string',
          required: true,
          label: 'List ID',
          placeholder: '123456789'
        }
      },
      outputSchema: {
        list: { type: 'object', description: 'List information' }
      }
    },
    {
      id: 'list_delete',
      name: 'Delete List',
      description: 'Delete a list',
      category: 'List',
      icon: 'trash-2',
      verified: false,
      api: {
        endpoint: '/list/{list_id}',
        method: 'DELETE',
        baseUrl: 'https://api.clickup.com/api/v2',
        paramMapping: {
          listId: 'list_id'
        }
      },
      inputSchema: {
        listId: {
          type: 'string',
          required: true,
          label: 'List ID',
          placeholder: '123456789'
        }
      },
      outputSchema: {
        success: { type: 'boolean', description: 'Whether deletion was successful' }
      }
    },

    // Folder Actions
    {
      id: 'folder_create',
      name: 'Create Folder',
      description: 'Create a new folder in a space',
      category: 'Folder',
      icon: 'folder-plus',
      verified: false,
      api: {
        endpoint: '/space/{space_id}/folder',
        method: 'POST',
        baseUrl: 'https://api.clickup.com/api/v2',
        headers: {
          'Content-Type': 'application/json'
        },
        paramMapping: {
          spaceId: 'space_id',
          name: 'name'
        }
      },
      inputSchema: {
        spaceId: {
          type: 'string',
          required: true,
          label: 'Space ID',
          placeholder: '123456789'
        },
        name: {
          type: 'string',
          required: true,
          label: 'Folder Name',
          placeholder: 'Q4 2024'
        }
      },
      outputSchema: {
        id: { type: 'string', description: 'Created folder ID' },
        name: { type: 'string', description: 'Folder name' }
      }
    },
    {
      id: 'folder_update',
      name: 'Update Folder',
      description: 'Update a folder',
      category: 'Folder',
      icon: 'edit',
      verified: false,
      api: {
        endpoint: '/folder/{folder_id}',
        method: 'PUT',
        baseUrl: 'https://api.clickup.com/api/v2',
        headers: {
          'Content-Type': 'application/json'
        },
        paramMapping: {
          folderId: 'folder_id',
          name: 'name'
        }
      },
      inputSchema: {
        folderId: {
          type: 'string',
          required: true,
          label: 'Folder ID',
          placeholder: '123456789'
        },
        name: {
          type: 'string',
          required: true,
          label: 'Folder Name'
        }
      },
      outputSchema: {
        success: { type: 'boolean', description: 'Whether update was successful' }
      }
    },
    {
      id: 'folder_get',
      name: 'Get Folder',
      description: 'Get a folder by ID',
      category: 'Folder',
      icon: 'folder',
      verified: false,
      api: {
        endpoint: '/folder/{folder_id}',
        method: 'GET',
        baseUrl: 'https://api.clickup.com/api/v2',
        paramMapping: {
          folderId: 'folder_id'
        }
      },
      inputSchema: {
        folderId: {
          type: 'string',
          required: true,
          label: 'Folder ID',
          placeholder: '123456789'
        }
      },
      outputSchema: {
        folder: { type: 'object', description: 'Folder information' }
      }
    },
    {
      id: 'folder_delete',
      name: 'Delete Folder',
      description: 'Delete a folder',
      category: 'Folder',
      icon: 'trash-2',
      verified: false,
      api: {
        endpoint: '/folder/{folder_id}',
        method: 'DELETE',
        baseUrl: 'https://api.clickup.com/api/v2',
        paramMapping: {
          folderId: 'folder_id'
        }
      },
      inputSchema: {
        folderId: {
          type: 'string',
          required: true,
          label: 'Folder ID',
          placeholder: '123456789'
        }
      },
      outputSchema: {
        success: { type: 'boolean', description: 'Whether deletion was successful' }
      }
    },

    // Comment Actions
    {
      id: 'comment_create',
      name: 'Create Comment',
      description: 'Add a comment to a task',
      category: 'Comment',
      icon: 'message-circle',
      verified: false,
      api: {
        endpoint: '/task/{task_id}/comment',
        method: 'POST',
        baseUrl: 'https://api.clickup.com/api/v2',
        headers: {
          'Content-Type': 'application/json'
        },
        paramMapping: {
          taskId: 'task_id',
          commentText: 'comment_text'
        }
      },
      inputSchema: {
        taskId: {
          type: 'string',
          required: true,
          label: 'Task ID',
          placeholder: '9hz'
        },
        commentText: {
          type: 'string',
          required: true,
          label: 'Comment',
          inputType: 'textarea',
          placeholder: 'Add your comment...'
        }
      },
      outputSchema: {
        id: { type: 'string', description: 'Created comment ID' }
      }
    },

    // Goal Actions
    {
      id: 'goal_create',
      name: 'Create Goal',
      description: 'Create a new goal',
      category: 'Goal',
      icon: 'target',
      verified: false,
      api: {
        endpoint: '/team/{team_id}/goal',
        method: 'POST',
        baseUrl: 'https://api.clickup.com/api/v2',
        headers: {
          'Content-Type': 'application/json'
        },
        paramMapping: {
          teamId: 'team_id',
          name: 'name',
          description: 'description',
          dueDate: 'due_date'
        }
      },
      inputSchema: {
        teamId: {
          type: 'string',
          required: true,
          label: 'Team ID',
          placeholder: '123',
          description: 'The workspace/team ID'
        },
        name: {
          type: 'string',
          required: true,
          label: 'Goal Name',
          placeholder: 'Increase customer satisfaction'
        },
        description: {
          type: 'string',
          label: 'Description',
          inputType: 'textarea',
          placeholder: 'Goal description...'
        },
        dueDate: {
          type: 'number',
          label: 'Due Date',
          placeholder: '1621550400000',
          description: 'Goal due date in Unix milliseconds'
        }
      },
      outputSchema: {
        id: { type: 'string', description: 'Created goal ID' },
        name: { type: 'string', description: 'Goal name' }
      }
    },
    {
      id: 'goal_update',
      name: 'Update Goal',
      description: 'Update a goal',
      category: 'Goal',
      icon: 'edit',
      verified: false,
      api: {
        endpoint: '/goal/{goal_id}',
        method: 'PUT',
        baseUrl: 'https://api.clickup.com/api/v2',
        headers: {
          'Content-Type': 'application/json'
        },
        paramMapping: {
          goalId: 'goal_id',
          name: 'name',
          description: 'description'
        }
      },
      inputSchema: {
        goalId: {
          type: 'string',
          required: true,
          label: 'Goal ID',
          placeholder: 'e53a033c-...'
        },
        name: {
          type: 'string',
          label: 'Goal Name'
        },
        description: {
          type: 'string',
          label: 'Description',
          inputType: 'textarea'
        }
      },
      outputSchema: {
        success: { type: 'boolean', description: 'Whether update was successful' }
      }
    },
    {
      id: 'goal_get',
      name: 'Get Goal',
      description: 'Get a goal by ID',
      category: 'Goal',
      icon: 'file-text',
      verified: false,
      api: {
        endpoint: '/goal/{goal_id}',
        method: 'GET',
        baseUrl: 'https://api.clickup.com/api/v2',
        paramMapping: {
          goalId: 'goal_id'
        }
      },
      inputSchema: {
        goalId: {
          type: 'string',
          required: true,
          label: 'Goal ID',
          placeholder: 'e53a033c-...'
        }
      },
      outputSchema: {
        goal: { type: 'object', description: 'Goal information' }
      }
    },
    {
      id: 'goal_delete',
      name: 'Delete Goal',
      description: 'Delete a goal',
      category: 'Goal',
      icon: 'trash-2',
      verified: false,
      api: {
        endpoint: '/goal/{goal_id}',
        method: 'DELETE',
        baseUrl: 'https://api.clickup.com/api/v2',
        paramMapping: {
          goalId: 'goal_id'
        }
      },
      inputSchema: {
        goalId: {
          type: 'string',
          required: true,
          label: 'Goal ID',
          placeholder: 'e53a033c-...'
        }
      },
      outputSchema: {
        success: { type: 'boolean', description: 'Whether deletion was successful' }
      }
    },

    // Time Entry Actions
    {
      id: 'time_entry_create',
      name: 'Create Time Entry',
      description: 'Create a time tracking entry',
      category: 'Time Tracking',
      icon: 'clock',
      verified: false,
      api: {
        endpoint: '/team/{team_id}/time_entries',
        method: 'POST',
        baseUrl: 'https://api.clickup.com/api/v2',
        headers: {
          'Content-Type': 'application/json'
        },
        paramMapping: {
          teamId: 'team_id',
          taskId: 'tid',
          start: 'start',
          end: 'end',
          duration: 'duration'
        }
      },
      inputSchema: {
        teamId: {
          type: 'string',
          required: true,
          label: 'Team ID',
          placeholder: '123'
        },
        taskId: {
          type: 'string',
          label: 'Task ID',
          placeholder: '9hz',
          description: 'Optional task ID to associate with'
        },
        start: {
          type: 'number',
          label: 'Start Time',
          placeholder: '1621464000000',
          description: 'Start time in Unix milliseconds'
        },
        duration: {
          type: 'number',
          label: 'Duration',
          placeholder: '3600000',
          description: 'Duration in milliseconds'
        }
      },
      outputSchema: {
        id: { type: 'string', description: 'Created time entry ID' }
      }
    }
  ],
  supported_triggers: [
    {
      id: 'task_created',
      name: 'Task Created',
      description: 'Triggered when a new task is created',
      eventType: 'taskCreated',
      verified: false,
      icon: 'plus-circle',
      webhookRequired: true,
      inputSchema: {
        listId: {
          type: 'string',
          label: 'List ID',
          placeholder: '123456789',
          description: 'Filter by specific list (optional)'
        }
      },
      outputSchema: {
        taskId: { type: 'string', description: 'Task ID' },
        name: { type: 'string', description: 'Task name' },
        description: { type: 'string', description: 'Task description' },
        status: { type: 'string', description: 'Task status' },
        creator: { type: 'object', description: 'Task creator' },
        assignees: { type: 'array', description: 'Task assignees' },
        url: { type: 'string', description: 'Task URL' }
      }
    },
    {
      id: 'task_updated',
      name: 'Task Updated',
      description: 'Triggered when a task is updated',
      eventType: 'taskUpdated',
      verified: false,
      icon: 'edit',
      webhookRequired: true,
      inputSchema: {
        listId: {
          type: 'string',
          label: 'List ID',
          placeholder: '123456789',
          description: 'Filter by specific list (optional)'
        }
      },
      outputSchema: {
        taskId: { type: 'string', description: 'Task ID' },
        name: { type: 'string', description: 'Task name' },
        changes: { type: 'object', description: 'Changed fields' },
        url: { type: 'string', description: 'Task URL' }
      }
    },
    {
      id: 'task_deleted',
      name: 'Task Deleted',
      description: 'Triggered when a task is deleted',
      eventType: 'taskDeleted',
      verified: false,
      icon: 'trash-2',
      webhookRequired: true,
      outputSchema: {
        taskId: { type: 'string', description: 'Deleted task ID' }
      }
    },
    {
      id: 'task_status_updated',
      name: 'Task Status Updated',
      description: 'Triggered when a task status changes',
      eventType: 'taskStatusUpdated',
      verified: false,
      icon: 'activity',
      webhookRequired: true,
      outputSchema: {
        taskId: { type: 'string', description: 'Task ID' },
        name: { type: 'string', description: 'Task name' },
        oldStatus: { type: 'string', description: 'Previous status' },
        newStatus: { type: 'string', description: 'New status' },
        url: { type: 'string', description: 'Task URL' }
      }
    },
    {
      id: 'task_priority_updated',
      name: 'Task Priority Updated',
      description: 'Triggered when a task priority changes',
      eventType: 'taskPriorityUpdated',
      verified: false,
      icon: 'alert-circle',
      webhookRequired: true,
      outputSchema: {
        taskId: { type: 'string', description: 'Task ID' },
        name: { type: 'string', description: 'Task name' },
        oldPriority: { type: 'number', description: 'Previous priority' },
        newPriority: { type: 'number', description: 'New priority' },
        url: { type: 'string', description: 'Task URL' }
      }
    },
    {
      id: 'task_assignee_updated',
      name: 'Task Assignee Updated',
      description: 'Triggered when task assignees change',
      eventType: 'taskAssigneeUpdated',
      verified: false,
      icon: 'user-plus',
      webhookRequired: true,
      outputSchema: {
        taskId: { type: 'string', description: 'Task ID' },
        name: { type: 'string', description: 'Task name' },
        assigneesAdded: { type: 'array', description: 'Added assignees' },
        assigneesRemoved: { type: 'array', description: 'Removed assignees' },
        url: { type: 'string', description: 'Task URL' }
      }
    },
    {
      id: 'task_comment_posted',
      name: 'Task Comment Posted',
      description: 'Triggered when a comment is added to a task',
      eventType: 'taskCommentPosted',
      verified: false,
      icon: 'message-circle',
      webhookRequired: true,
      outputSchema: {
        taskId: { type: 'string', description: 'Task ID' },
        commentId: { type: 'string', description: 'Comment ID' },
        comment: { type: 'string', description: 'Comment text' },
        author: { type: 'object', description: 'Comment author' },
        url: { type: 'string', description: 'Task URL' }
      }
    },
    {
      id: 'list_created',
      name: 'List Created',
      description: 'Triggered when a new list is created',
      eventType: 'listCreated',
      verified: false,
      icon: 'list',
      webhookRequired: true,
      outputSchema: {
        listId: { type: 'string', description: 'List ID' },
        name: { type: 'string', description: 'List name' },
        folderId: { type: 'string', description: 'Parent folder ID' }
      }
    },
    {
      id: 'goal_created',
      name: 'Goal Created',
      description: 'Triggered when a new goal is created',
      eventType: 'goalCreated',
      verified: false,
      icon: 'target',
      webhookRequired: true,
      outputSchema: {
        goalId: { type: 'string', description: 'Goal ID' },
        name: { type: 'string', description: 'Goal name' },
        description: { type: 'string', description: 'Goal description' }
      }
    },
    {
      id: 'goal_updated',
      name: 'Goal Updated',
      description: 'Triggered when a goal is updated',
      eventType: 'goalUpdated',
      verified: false,
      icon: 'edit',
      webhookRequired: true,
      outputSchema: {
        goalId: { type: 'string', description: 'Goal ID' },
        name: { type: 'string', description: 'Goal name' },
        changes: { type: 'object', description: 'Changed fields' }
      }
    }
  ]
};
