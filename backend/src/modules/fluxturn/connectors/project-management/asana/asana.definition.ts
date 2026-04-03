// Asana Connector Definition
// Synced with asana.connector.ts implementation

import { ConnectorDefinition } from '../../shared';

export const ASANA_CONNECTOR: ConnectorDefinition = {
  name: 'asana',
  display_name: 'Asana',
  category: 'project_management',
  description: 'Asana project management platform for task tracking, team collaboration, and workflow automation',
  auth_type: 'bearer_token',
  verified: false,

  auth_fields: [
    {
      key: 'accessToken',
      label: 'Personal Access Token',
      type: 'password',
      required: true,
      placeholder: '1/1234567890123456:abcdef...',
      description: 'Personal access token from Asana developer settings',
      helpUrl: 'https://developers.asana.com/docs/personal-access-token',
      helpText: 'How to create a Personal Access Token'
    }
  ],

  endpoints: {
    base_url: 'https://app.asana.com/api/1.0'
  },

  webhook_support: true,
  rate_limits: { requests_per_minute: 1500, requests_per_hour: 100000 },
  sandbox_available: false,

  supported_actions: [
    {
      id: 'create_task',
      name: 'Create Task',
      description: 'Create a new task in Asana',
      category: 'Tasks',
      icon: 'plus',
      inputSchema: {
        title: {
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
          required: false,
          label: 'Description',
          inputType: 'textarea',
          description: 'Task notes/description',
          aiControlled: true,
          aiDescription: 'Detailed description or notes for the task'
        },
        projectId: {
          type: 'string',
          required: false,
          label: 'Project ID',
          description: 'Project to add the task to',
          aiControlled: false
        },
        assigneeId: {
          type: 'string',
          required: false,
          label: 'Assignee ID',
          description: 'User ID to assign the task to',
          aiControlled: false
        },
        dueDate: {
          type: 'string',
          required: false,
          label: 'Due Date',
          placeholder: 'YYYY-MM-DD',
          description: 'Task due date',
          aiControlled: false
        }
      },
      outputSchema: {
        id: { type: 'string', description: 'Created task ID (gid)' },
        permalink_url: { type: 'string', description: 'Task URL' },
        name: { type: 'string', description: 'Task name' }
      }
    },
    {
      id: 'update_task',
      name: 'Update Task',
      description: 'Update an existing task in Asana',
      category: 'Tasks',
      icon: 'edit',
      inputSchema: {
        taskId: {
          type: 'string',
          required: true,
          label: 'Task ID',
          placeholder: '1234567890',
          description: 'ID of the task to update'
        },
        updates: {
          type: 'object',
          required: true,
          label: 'Updates',
          description: 'Fields to update (title, description, assigneeId, dueDate, status)'
        }
      },
      outputSchema: {
        success: { type: 'boolean', description: 'Whether update was successful' },
        task: { type: 'object', description: 'Updated task data' }
      }
    },
    {
      id: 'create_project',
      name: 'Create Project',
      description: 'Create a new project in Asana',
      category: 'Projects',
      icon: 'folder-plus',
      inputSchema: {
        name: {
          type: 'string',
          required: true,
          label: 'Project Name',
          placeholder: 'Q1 Marketing Campaign',
          description: 'Name of the project',
          aiControlled: true,
          aiDescription: 'Name of the project to create'
        },
        description: {
          type: 'string',
          required: false,
          label: 'Description',
          inputType: 'textarea',
          description: 'Project notes/description',
          aiControlled: true,
          aiDescription: 'Project description or notes'
        },
        workspaceId: {
          type: 'string',
          required: false,
          label: 'Workspace ID',
          placeholder: '1234567890',
          description: 'Workspace to create the project in (required if Team ID not specified)',
          aiControlled: false
        },
        teamId: {
          type: 'string',
          required: false,
          label: 'Team ID',
          placeholder: '1234567890',
          description: 'Team to create the project in (required if Workspace ID not specified)',
          aiControlled: false
        }
      },
      outputSchema: {
        id: { type: 'string', description: 'Created project ID (gid)' },
        permalink_url: { type: 'string', description: 'Project URL' }
      }
    },
    {
      id: 'add_comment',
      name: 'Add Comment',
      description: 'Add a comment to a task',
      category: 'Comments',
      icon: 'message-square',
      inputSchema: {
        taskId: {
          type: 'string',
          required: true,
          label: 'Task ID',
          placeholder: '1234567890',
          description: 'ID of the task to comment on',
          aiControlled: false
        },
        content: {
          type: 'string',
          required: true,
          label: 'Comment',
          inputType: 'textarea',
          placeholder: 'Great progress on this task!',
          description: 'Comment text',
          aiControlled: true,
          aiDescription: 'The comment text to add to the task'
        }
      },
      outputSchema: {
        id: { type: 'string', description: 'Comment ID (story gid)' },
        created_at: { type: 'string', description: 'Comment creation timestamp' }
      }
    },
    {
      id: 'create_section',
      name: 'Create Section',
      description: 'Create a section in a project',
      category: 'Projects',
      icon: 'layout',
      inputSchema: {
        name: {
          type: 'string',
          required: true,
          label: 'Section Name',
          placeholder: 'In Progress',
          description: 'Name of the section'
        },
        projectId: {
          type: 'string',
          required: true,
          label: 'Project ID',
          placeholder: '1234567890',
          description: 'Project to add the section to'
        }
      },
      outputSchema: {
        id: { type: 'string', description: 'Created section ID (gid)' },
        name: { type: 'string', description: 'Section name' }
      }
    },
    {
      id: 'assign_task',
      name: 'Assign Task',
      description: 'Assign a task to a user',
      category: 'Tasks',
      icon: 'user-plus',
      inputSchema: {
        taskId: {
          type: 'string',
          required: true,
          label: 'Task ID',
          placeholder: '1234567890',
          description: 'ID of the task to assign'
        },
        assigneeId: {
          type: 'string',
          required: true,
          label: 'Assignee ID',
          placeholder: '1234567890',
          description: 'User ID to assign the task to'
        }
      },
      outputSchema: {
        success: { type: 'boolean', description: 'Whether assignment was successful' },
        task: { type: 'object', description: 'Updated task data' }
      }
    },
    {
      id: 'add_tag',
      name: 'Add Tag',
      description: 'Add a tag to a task',
      category: 'Tasks',
      icon: 'tag',
      inputSchema: {
        taskId: {
          type: 'string',
          required: true,
          label: 'Task ID',
          placeholder: '1234567890',
          description: 'ID of the task'
        },
        tagId: {
          type: 'string',
          required: true,
          label: 'Tag ID',
          placeholder: '1234567890',
          description: 'ID of the tag to add'
        }
      },
      outputSchema: {
        success: { type: 'boolean', description: 'Whether tag was added successfully' }
      }
    },
    {
      id: 'delete_task',
      name: 'Delete Task',
      description: 'Delete a task from Asana',
      category: 'Tasks',
      icon: 'trash-2',
      inputSchema: {
        taskId: {
          type: 'string',
          required: true,
          label: 'Task ID',
          placeholder: '1234567890',
          description: 'ID of the task to delete'
        }
      },
      outputSchema: {
        deleted: { type: 'boolean', description: 'Whether the task was deleted' }
      }
    },
    {
      id: 'get_task',
      name: 'Get Task',
      description: 'Get details of a specific task',
      category: 'Tasks',
      icon: 'search',
      inputSchema: {
        taskId: {
          type: 'string',
          required: true,
          label: 'Task ID',
          placeholder: '1234567890',
          description: 'ID of the task to retrieve'
        }
      },
      outputSchema: {
        id: { type: 'string', description: 'Task ID (gid)' },
        name: { type: 'string', description: 'Task name' },
        notes: { type: 'string', description: 'Task description/notes' },
        completed: { type: 'boolean', description: 'Whether the task is completed' },
        assignee: { type: 'object', description: 'Assigned user' },
        due_on: { type: 'string', description: 'Due date' },
        permalink_url: { type: 'string', description: 'Task URL' }
      }
    },
    {
      id: 'get_tasks',
      name: 'Get Tasks',
      description: 'Get tasks from a project or workspace',
      category: 'Tasks',
      icon: 'list',
      inputSchema: {
        projectId: {
          type: 'string',
          required: false,
          label: 'Project ID',
          placeholder: '1234567890',
          description: 'Get tasks from a specific project'
        },
        assigneeId: {
          type: 'string',
          required: false,
          label: 'Assignee ID',
          description: 'Filter by assignee'
        },
        status: {
          type: 'select',
          required: false,
          label: 'Status',
          options: [
            { label: 'All', value: '' },
            { label: 'Completed', value: 'Completed' },
            { label: 'In Progress', value: 'In Progress' }
          ],
          description: 'Filter by completion status'
        },
        limit: {
          type: 'number',
          required: false,
          label: 'Limit',
          default: 100,
          description: 'Maximum number of tasks to return'
        }
      },
      outputSchema: {
        tasks: { type: 'array', description: 'Array of tasks' }
      }
    },
    {
      id: 'create_subtask',
      name: 'Create Subtask',
      description: 'Create a subtask under a parent task',
      category: 'Tasks',
      icon: 'plus-circle',
      inputSchema: {
        parentTaskId: {
          type: 'string',
          required: true,
          label: 'Parent Task ID',
          placeholder: '1234567890',
          description: 'ID of the parent task',
          aiControlled: false
        },
        title: {
          type: 'string',
          required: true,
          label: 'Subtask Name',
          placeholder: 'Review documentation',
          description: 'Name of the subtask',
          aiControlled: true,
          aiDescription: 'Name/title of the subtask'
        },
        description: {
          type: 'string',
          required: false,
          label: 'Description',
          inputType: 'textarea',
          description: 'Subtask notes/description',
          aiControlled: true,
          aiDescription: 'Description or notes for the subtask'
        },
        assigneeId: {
          type: 'string',
          required: false,
          label: 'Assignee ID',
          description: 'User ID to assign the subtask to',
          aiControlled: false
        },
        dueDate: {
          type: 'string',
          required: false,
          label: 'Due Date',
          placeholder: 'YYYY-MM-DD',
          description: 'Subtask due date',
          aiControlled: false
        }
      },
      outputSchema: {
        id: { type: 'string', description: 'Created subtask ID (gid)' },
        name: { type: 'string', description: 'Subtask name' },
        permalink_url: { type: 'string', description: 'Subtask URL' }
      }
    },
    {
      id: 'get_subtasks',
      name: 'Get Subtasks',
      description: 'Get all subtasks of a parent task',
      category: 'Tasks',
      icon: 'list',
      inputSchema: {
        taskId: {
          type: 'string',
          required: true,
          label: 'Task ID',
          placeholder: '1234567890',
          description: 'ID of the parent task'
        }
      },
      outputSchema: {
        subtasks: { type: 'array', description: 'Array of subtasks' }
      }
    },
    {
      id: 'search_tasks',
      name: 'Search Tasks',
      description: 'Search for tasks in a workspace',
      category: 'Tasks',
      icon: 'search',
      inputSchema: {
        workspaceId: {
          type: 'string',
          required: true,
          label: 'Workspace ID',
          placeholder: '1234567890',
          description: 'Workspace to search in'
        },
        query: {
          type: 'string',
          required: false,
          label: 'Search Query',
          placeholder: 'marketing campaign',
          description: 'Text to search for in task names'
        },
        projectId: {
          type: 'string',
          required: false,
          label: 'Project ID',
          description: 'Filter by project'
        },
        assigneeId: {
          type: 'string',
          required: false,
          label: 'Assignee ID',
          description: 'Filter by assignee'
        },
        completed: {
          type: 'boolean',
          required: false,
          label: 'Completed',
          description: 'Filter by completion status'
        }
      },
      outputSchema: {
        tasks: { type: 'array', description: 'Array of matching tasks' }
      }
    }
  ],

  supported_triggers: [
    {
      id: 'task_created',
      name: 'Task Created',
      description: 'Triggered when a new task is created',
      eventType: 'asana:task_created',
      icon: 'plus-circle',
      webhookRequired: true,
      inputSchema: {
        projectId: {
          type: 'string',
          required: false,
          label: 'Project ID',
          description: 'Monitor tasks in a specific project (optional)'
        }
      },
      outputSchema: {
        task: { type: 'object', description: 'Created task information' },
        gid: { type: 'string', description: 'Task ID' },
        name: { type: 'string', description: 'Task name' },
        created_at: { type: 'string', description: 'Creation timestamp' }
      }
    },
    {
      id: 'task_updated',
      name: 'Task Updated',
      description: 'Triggered when a task is updated',
      eventType: 'asana:task_updated',
      icon: 'edit-2',
      webhookRequired: true,
      inputSchema: {
        projectId: {
          type: 'string',
          required: false,
          label: 'Project ID',
          description: 'Monitor tasks in a specific project (optional)'
        }
      },
      outputSchema: {
        task: { type: 'object', description: 'Updated task information' },
        change_type: { type: 'string', description: 'Type of change made' }
      }
    },
    {
      id: 'task_completed',
      name: 'Task Completed',
      description: 'Triggered when a task is marked as complete',
      eventType: 'asana:task_completed',
      icon: 'check-circle',
      webhookRequired: true,
      inputSchema: {
        projectId: {
          type: 'string',
          required: false,
          label: 'Project ID',
          description: 'Monitor tasks in a specific project (optional)'
        }
      },
      outputSchema: {
        task: { type: 'object', description: 'Completed task information' },
        completed_at: { type: 'string', description: 'Completion timestamp' }
      }
    },
    {
      id: 'project_created',
      name: 'Project Created',
      description: 'Triggered when a new project is created',
      eventType: 'asana:project_created',
      icon: 'folder-plus',
      webhookRequired: true,
      outputSchema: {
        project: { type: 'object', description: 'Created project information' },
        gid: { type: 'string', description: 'Project ID' },
        name: { type: 'string', description: 'Project name' }
      }
    },
    {
      id: 'comment_added',
      name: 'Comment Added',
      description: 'Triggered when a comment is added to a task',
      eventType: 'asana:comment_added',
      icon: 'message-circle',
      webhookRequired: true,
      inputSchema: {
        projectId: {
          type: 'string',
          required: false,
          label: 'Project ID',
          description: 'Monitor comments in a specific project (optional)'
        }
      },
      outputSchema: {
        comment: { type: 'object', description: 'Added comment information' },
        task: { type: 'object', description: 'Task the comment was added to' },
        author: { type: 'object', description: 'Comment author' }
      }
    }
  ]
};
