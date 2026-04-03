// Todoist Connector Definition
// Converted from n8n Todoist node

import { ConnectorDefinition } from '../../shared';

export const TODOIST_CONNECTOR: ConnectorDefinition = {
  name: 'todoist',
  display_name: 'Todoist',
  category: 'productivity',
  description: 'Manage tasks, projects, sections, comments, labels, and reminders in Todoist',
  auth_type: 'api_key',
  complexity: 'Medium',
  verified: true,

  auth_fields: [
    {
      key: 'apiKey',
      label: 'API Key',
      type: 'password',
      required: true,
      placeholder: 'Enter your Todoist API key',
      description: 'Get your API key from Todoist Settings > Integrations',
      helpUrl: 'https://todoist.com/app/settings/integrations',
      helpText: 'How to get your API key'
    }
  ],

  endpoints: {
    base_url: 'https://api.todoist.com/rest/v2',
    task: {
      list: '/tasks',
      create: '/tasks',
      get: '/tasks/{id}',
      update: '/tasks/{id}',
      close: '/tasks/{id}/close',
      reopen: '/tasks/{id}/reopen',
      delete: '/tasks/{id}',
      quickAdd: '/quick/add'
    },
    project: {
      list: '/projects',
      create: '/projects',
      get: '/projects/{id}',
      update: '/projects/{id}',
      delete: '/projects/{id}'
    },
    section: {
      list: '/sections',
      create: '/sections',
      get: '/sections/{id}',
      update: '/sections/{id}',
      delete: '/sections/{id}'
    },
    comment: {
      list: '/comments',
      create: '/comments',
      get: '/comments/{id}',
      update: '/comments/{id}',
      delete: '/comments/{id}'
    },
    label: {
      list: '/labels',
      create: '/labels',
      get: '/labels/{id}',
      update: '/labels/{id}',
      delete: '/labels/{id}'
    },
    reminder: {
      list: '/reminders',
      create: '/reminders',
      update: '/reminders/{id}',
      delete: '/reminders/{id}'
    }
  },

  webhook_support: false,
  rate_limits: {
    requests_per_minute: 450,
    requests_per_second: 50
  },
  sandbox_available: false,

  supported_actions: [
    // Task Operations
    {
      id: 'task_create',
      name: 'Create Task',
      description: 'Create a new task',
      category: 'Task',
      icon: 'plus',
      verified: false,
      api: {
        endpoint: '/tasks',
        method: 'POST',
        baseUrl: 'https://api.todoist.com/rest/v2',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer {apiKey}'
        },
        paramMapping: {
          content: 'content',
          description: 'description',
          projectId: 'project_id',
          sectionId: 'section_id',
          parentId: 'parent_id',
          order: 'order',
          labels: 'labels',
          priority: 'priority',
          dueString: 'due_string',
          dueDate: 'due_date',
          dueDateTime: 'due_datetime',
          dueLang: 'due_lang',
          assigneeId: 'assignee_id',
          duration: 'duration',
          durationUnit: 'duration_unit'
        }
      },
      inputSchema: {
        content: {
          type: 'string',
          required: true,
          label: 'Task Content',
          placeholder: 'Buy groceries',
          description: 'Task content/name',
          inputType: 'text',
          aiControlled: true,
          aiDescription: 'The name/title of the task'
        },
        description: {
          type: 'string',
          required: false,
          label: 'Description',
          placeholder: 'Task description',
          description: 'A description for the task',
          inputType: 'textarea',
          aiControlled: true,
          aiDescription: 'A detailed description of the task'
        },
        projectId: {
          type: 'string',
          required: false,
          label: 'Project ID',
          placeholder: '2203306141',
          description: 'Task project ID (leave empty for Inbox)',
          aiControlled: false
        },
        sectionId: {
          type: 'string',
          required: false,
          label: 'Section ID',
          placeholder: '7025',
          description: 'ID of the section to add task to'
        },
        parentId: {
          type: 'string',
          required: false,
          label: 'Parent Task ID',
          placeholder: '2995104339',
          description: 'Parent task ID for creating subtasks'
        },
        order: {
          type: 'number',
          required: false,
          label: 'Order',
          description: 'Non-zero integer value to sort tasks',
          default: 0
        },
        labels: {
          type: 'array',
          required: false,
          label: 'Labels',
          description: 'Array of label names (e.g., ["Label1", "Label2"])'
        },
        priority: {
          type: 'number',
          required: false,
          label: 'Priority',
          description: 'Task priority from 1 (normal) to 4 (urgent)',
          default: 1,
          min: 1,
          max: 4
        },
        dueString: {
          type: 'string',
          required: false,
          label: 'Due String',
          placeholder: 'tomorrow at 12:00',
          description: 'Human-defined task due date (e.g., "next Monday", "Tomorrow")',
          inputType: 'text'
        },
        dueDate: {
          type: 'string',
          required: false,
          label: 'Due Date',
          placeholder: 'YYYY-MM-DD',
          description: 'Specific date in YYYY-MM-DD format',
          inputType: 'text'
        },
        dueDateTime: {
          type: 'string',
          required: false,
          label: 'Due Date Time',
          placeholder: '2016-09-01T12:00:00Z',
          description: 'Specific date and time in RFC3339 format in UTC',
          inputType: 'text'
        },
        dueLang: {
          type: 'string',
          required: false,
          label: 'Due String Locale',
          placeholder: 'en',
          description: '2-letter code specifying language in case due_string is not in English',
          inputType: 'text'
        },
        assigneeId: {
          type: 'string',
          required: false,
          label: 'Assignee ID',
          placeholder: '2671355',
          description: 'The responsible user ID (for shared tasks)'
        },
        duration: {
          type: 'number',
          required: false,
          label: 'Duration',
          description: 'A positive integer for the task duration'
        },
        durationUnit: {
          type: 'select',
          required: false,
          label: 'Duration Unit',
          description: 'The unit of time for the duration',
          options: [
            { label: 'Minute', value: 'minute' },
            { label: 'Day', value: 'day' }
          ],
          default: 'minute'
        }
      },
      outputSchema: {
        id: { type: 'string', description: 'Task ID' },
        content: { type: 'string', description: 'Task content' },
        description: { type: 'string', description: 'Task description' },
        project_id: { type: 'string', description: 'Project ID' },
        created_at: { type: 'string', description: 'Creation timestamp' }
      }
    },
    {
      id: 'task_get',
      name: 'Get Task',
      description: 'Get a task by ID',
      category: 'Task',
      icon: 'file-text',
      verified: false,
      api: {
        endpoint: '/tasks/{taskId}',
        method: 'GET',
        baseUrl: 'https://api.todoist.com/rest/v2',
        headers: {
          'Authorization': 'Bearer {apiKey}'
        },
        paramMapping: {
          taskId: 'taskId'
        }
      },
      inputSchema: {
        taskId: {
          type: 'string',
          required: true,
          label: 'Task ID',
          placeholder: '2995104339',
          description: 'The ID of the task to retrieve'
        }
      },
      outputSchema: {
        id: { type: 'string', description: 'Task ID' },
        content: { type: 'string', description: 'Task content' },
        description: { type: 'string', description: 'Task description' }
      }
    },
    {
      id: 'task_getAll',
      name: 'Get Many Tasks',
      description: 'Get many tasks with optional filters',
      category: 'Task',
      icon: 'list',
      verified: false,
      api: {
        endpoint: '/tasks',
        method: 'GET',
        baseUrl: 'https://api.todoist.com/rest/v2',
        headers: {
          'Authorization': 'Bearer {apiKey}'
        },
        paramMapping: {
          projectId: 'project_id',
          sectionId: 'section_id',
          labelId: 'label_id',
          filter: 'filter',
          lang: 'lang',
          ids: 'ids'
        }
      },
      inputSchema: {
        projectId: {
          type: 'string',
          required: false,
          label: 'Project ID',
          description: 'Filter tasks by project ID'
        },
        sectionId: {
          type: 'string',
          required: false,
          label: 'Section ID',
          description: 'Filter tasks by section ID'
        },
        labelId: {
          type: 'string',
          required: false,
          label: 'Label ID',
          description: 'Filter tasks by label ID'
        },
        filter: {
          type: 'string',
          required: false,
          label: 'Filter',
          placeholder: 'today | overdue',
          description: 'Filter by any supported filter (e.g., "today", "overdue")',
          inputType: 'text'
        },
        lang: {
          type: 'string',
          required: false,
          label: 'Language',
          placeholder: 'en',
          description: 'IETF language tag defining filter language'
        },
        ids: {
          type: 'string',
          required: false,
          label: 'IDs',
          placeholder: '2995104339,2995104340',
          description: 'Comma-separated list of task IDs to retrieve'
        }
      },
      outputSchema: {
        tasks: {
          type: 'array',
          description: 'Array of tasks'
        }
      }
    },
    {
      id: 'task_update',
      name: 'Update Task',
      description: 'Update a task',
      category: 'Task',
      icon: 'edit',
      verified: false,
      api: {
        endpoint: '/tasks/{taskId}',
        method: 'POST',
        baseUrl: 'https://api.todoist.com/rest/v2',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer {apiKey}'
        },
        paramMapping: {
          taskId: 'taskId',
          content: 'content',
          description: 'description',
          labels: 'labels',
          priority: 'priority',
          dueString: 'due_string',
          dueDate: 'due_date',
          dueDateTime: 'due_datetime',
          dueLang: 'due_lang',
          assigneeId: 'assignee_id',
          duration: 'duration',
          durationUnit: 'duration_unit'
        }
      },
      inputSchema: {
        taskId: {
          type: 'string',
          required: true,
          label: 'Task ID',
          placeholder: '2995104339',
          description: 'The ID of the task to update',
          aiControlled: false
        },
        content: {
          type: 'string',
          required: false,
          label: 'Task Content',
          description: 'Updated task content',
          inputType: 'text',
          aiControlled: true,
          aiDescription: 'The updated name/title of the task'
        },
        description: {
          type: 'string',
          required: false,
          label: 'Description',
          description: 'Updated task description',
          inputType: 'textarea',
          aiControlled: true,
          aiDescription: 'The updated description of the task'
        },
        labels: {
          type: 'array',
          required: false,
          label: 'Labels',
          description: 'Array of label names',
          aiControlled: false
        },
        priority: {
          type: 'number',
          required: false,
          label: 'Priority',
          description: 'Task priority from 1 (normal) to 4 (urgent)',
          min: 1,
          max: 4
        },
        dueString: {
          type: 'string',
          required: false,
          label: 'Due String',
          placeholder: 'tomorrow at 12:00',
          description: 'Human-defined task due date'
        },
        dueDate: {
          type: 'string',
          required: false,
          label: 'Due Date',
          placeholder: 'YYYY-MM-DD',
          description: 'Specific date in YYYY-MM-DD format'
        },
        dueDateTime: {
          type: 'string',
          required: false,
          label: 'Due Date Time',
          description: 'Specific date and time in RFC3339 format in UTC'
        },
        dueLang: {
          type: 'string',
          required: false,
          label: 'Due String Locale',
          placeholder: 'en',
          description: '2-letter code for language'
        },
        assigneeId: {
          type: 'string',
          required: false,
          label: 'Assignee ID',
          description: 'The responsible user ID'
        },
        duration: {
          type: 'number',
          required: false,
          label: 'Duration',
          description: 'Task duration'
        },
        durationUnit: {
          type: 'select',
          required: false,
          label: 'Duration Unit',
          options: [
            { label: 'Minute', value: 'minute' },
            { label: 'Day', value: 'day' }
          ]
        }
      },
      outputSchema: {
        id: { type: 'string', description: 'Task ID' },
        content: { type: 'string', description: 'Updated task content' }
      }
    },
    {
      id: 'task_close',
      name: 'Close Task',
      description: 'Close a task',
      category: 'Task',
      icon: 'check-circle',
      verified: false,
      api: {
        endpoint: '/tasks/{taskId}/close',
        method: 'POST',
        baseUrl: 'https://api.todoist.com/rest/v2',
        headers: {
          'Authorization': 'Bearer {apiKey}'
        },
        paramMapping: {
          taskId: 'taskId'
        }
      },
      inputSchema: {
        taskId: {
          type: 'string',
          required: true,
          label: 'Task ID',
          placeholder: '2995104339',
          description: 'The ID of the task to close'
        }
      },
      outputSchema: {
        success: { type: 'boolean', description: 'Success status' }
      }
    },
    {
      id: 'task_reopen',
      name: 'Reopen Task',
      description: 'Reopen a task',
      category: 'Task',
      icon: 'rotate-ccw',
      verified: false,
      api: {
        endpoint: '/tasks/{taskId}/reopen',
        method: 'POST',
        baseUrl: 'https://api.todoist.com/rest/v2',
        headers: {
          'Authorization': 'Bearer {apiKey}'
        },
        paramMapping: {
          taskId: 'taskId'
        }
      },
      inputSchema: {
        taskId: {
          type: 'string',
          required: true,
          label: 'Task ID',
          placeholder: '2995104339',
          description: 'The ID of the task to reopen'
        }
      },
      outputSchema: {
        success: { type: 'boolean', description: 'Success status' }
      }
    },
    {
      id: 'task_delete',
      name: 'Delete Task',
      description: 'Delete a task',
      category: 'Task',
      icon: 'trash',
      verified: false,
      api: {
        endpoint: '/tasks/{taskId}',
        method: 'DELETE',
        baseUrl: 'https://api.todoist.com/rest/v2',
        headers: {
          'Authorization': 'Bearer {apiKey}'
        },
        paramMapping: {
          taskId: 'taskId'
        }
      },
      inputSchema: {
        taskId: {
          type: 'string',
          required: true,
          label: 'Task ID',
          placeholder: '2995104339',
          description: 'The ID of the task to delete'
        }
      },
      outputSchema: {
        success: { type: 'boolean', description: 'Success status' }
      }
    },
    {
      id: 'task_move',
      name: 'Move Task',
      description: 'Move a task to a different project or section',
      category: 'Task',
      icon: 'move',
      verified: false,
      api: {
        endpoint: '/tasks/{taskId}',
        method: 'POST',
        baseUrl: 'https://api.todoist.com/rest/v2',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer {apiKey}'
        },
        paramMapping: {
          taskId: 'taskId',
          projectId: 'project_id',
          sectionId: 'section_id',
          parentId: 'parent_id'
        }
      },
      inputSchema: {
        taskId: {
          type: 'string',
          required: true,
          label: 'Task ID',
          placeholder: '2995104339',
          description: 'The ID of the task to move'
        },
        projectId: {
          type: 'string',
          required: true,
          label: 'Project ID',
          placeholder: '2203306141',
          description: 'The destination project ID'
        },
        sectionId: {
          type: 'string',
          required: false,
          label: 'Section ID',
          placeholder: '7025',
          description: 'The destination section ID'
        },
        parentId: {
          type: 'string',
          required: false,
          label: 'Parent Task ID',
          description: 'The destination parent task ID'
        }
      },
      outputSchema: {
        success: { type: 'boolean', description: 'Success status' }
      }
    },
    {
      id: 'task_quickAdd',
      name: 'Quick Add Task',
      description: 'Quick add a task using natural language',
      category: 'Task',
      icon: 'zap',
      verified: false,
      api: {
        endpoint: '/quick/add',
        method: 'POST',
        baseUrl: 'https://api.todoist.com/rest/v2',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer {apiKey}'
        },
        paramMapping: {
          text: 'text',
          note: 'note',
          reminder: 'reminder',
          autoReminder: 'auto_reminder'
        }
      },
      inputSchema: {
        text: {
          type: 'string',
          required: true,
          label: 'Text',
          placeholder: 'Buy milk @Grocery #shopping tomorrow',
          description: 'Natural language text for quick adding task',
          inputType: 'textarea',
          aiControlled: true,
          aiDescription: 'Natural language text for quick adding task (can include @project #label and due date)'
        },
        note: {
          type: 'string',
          required: false,
          label: 'Note',
          description: 'The content of the note',
          inputType: 'textarea',
          aiControlled: true,
          aiDescription: 'Additional note or description for the task'
        },
        reminder: {
          type: 'string',
          required: false,
          label: 'Reminder',
          placeholder: 'tomorrow at 2pm',
          description: 'The date of the reminder in free form text'
        },
        autoReminder: {
          type: 'boolean',
          required: false,
          label: 'Auto Reminder',
          description: 'Add default reminder if task has a due date with time',
          default: false
        }
      },
      outputSchema: {
        id: { type: 'string', description: 'Task ID' },
        content: { type: 'string', description: 'Task content' }
      }
    },

    // Project Operations
    {
      id: 'project_create',
      name: 'Create Project',
      description: 'Create a new project',
      category: 'Project',
      icon: 'folder-plus',
      verified: false,
      api: {
        endpoint: '/projects',
        method: 'POST',
        baseUrl: 'https://api.todoist.com/rest/v2',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer {apiKey}'
        },
        paramMapping: {
          name: 'name',
          parentId: 'parent_id',
          color: 'color',
          isFavorite: 'is_favorite',
          viewStyle: 'view_style'
        }
      },
      inputSchema: {
        name: {
          type: 'string',
          required: true,
          label: 'Project Name',
          placeholder: 'My Project',
          description: 'Name of the project',
          aiControlled: true,
          aiDescription: 'The name of the project'
        },
        parentId: {
          type: 'string',
          required: false,
          label: 'Parent Project ID',
          description: 'Parent project ID for sub-projects',
          aiControlled: false
        },
        color: {
          type: 'select',
          required: false,
          label: 'Color',
          description: 'The color of the project',
          options: [
            { label: 'Berry Red', value: 'berry_red' },
            { label: 'Red', value: 'red' },
            { label: 'Orange', value: 'orange' },
            { label: 'Yellow', value: 'yellow' },
            { label: 'Olive Green', value: 'olive_green' },
            { label: 'Lime Green', value: 'lime_green' },
            { label: 'Green', value: 'green' },
            { label: 'Mint Green', value: 'mint_green' },
            { label: 'Teal', value: 'teal' },
            { label: 'Sky Blue', value: 'sky_blue' },
            { label: 'Light Blue', value: 'light_blue' },
            { label: 'Blue', value: 'blue' },
            { label: 'Grape', value: 'grape' },
            { label: 'Violet', value: 'violet' },
            { label: 'Lavender', value: 'lavender' },
            { label: 'Magenta', value: 'magenta' },
            { label: 'Salmon', value: 'salmon' },
            { label: 'Charcoal', value: 'charcoal' },
            { label: 'Grey', value: 'grey' },
            { label: 'Taupe', value: 'taupe' }
          ]
        },
        isFavorite: {
          type: 'boolean',
          required: false,
          label: 'Is Favorite',
          description: 'Whether the project is a favorite',
          default: false
        },
        viewStyle: {
          type: 'select',
          required: false,
          label: 'View Style',
          description: 'The default view style of the project',
          options: [
            { label: 'List', value: 'list' },
            { label: 'Board', value: 'board' }
          ],
          default: 'list'
        }
      },
      outputSchema: {
        id: { type: 'string', description: 'Project ID' },
        name: { type: 'string', description: 'Project name' }
      }
    },
    {
      id: 'project_get',
      name: 'Get Project',
      description: 'Get a project by ID',
      category: 'Project',
      icon: 'folder',
      verified: false,
      api: {
        endpoint: '/projects/{projectId}',
        method: 'GET',
        baseUrl: 'https://api.todoist.com/rest/v2',
        headers: {
          'Authorization': 'Bearer {apiKey}'
        },
        paramMapping: {
          projectId: 'projectId'
        }
      },
      inputSchema: {
        projectId: {
          type: 'string',
          required: true,
          label: 'Project ID',
          placeholder: '2203306141',
          description: 'The ID of the project to retrieve'
        }
      },
      outputSchema: {
        id: { type: 'string', description: 'Project ID' },
        name: { type: 'string', description: 'Project name' }
      }
    },
    {
      id: 'project_getAll',
      name: 'Get Many Projects',
      description: 'Get many projects',
      category: 'Project',
      icon: 'folders',
      verified: false,
      api: {
        endpoint: '/projects',
        method: 'GET',
        baseUrl: 'https://api.todoist.com/rest/v2',
        headers: {
          'Authorization': 'Bearer {apiKey}'
        }
      },
      inputSchema: {},
      outputSchema: {
        projects: {
          type: 'array',
          description: 'Array of projects'
        }
      }
    },
    {
      id: 'project_update',
      name: 'Update Project',
      description: 'Update a project',
      category: 'Project',
      icon: 'edit',
      verified: false,
      api: {
        endpoint: '/projects/{projectId}',
        method: 'POST',
        baseUrl: 'https://api.todoist.com/rest/v2',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer {apiKey}'
        },
        paramMapping: {
          projectId: 'projectId',
          name: 'name',
          color: 'color',
          isFavorite: 'is_favorite',
          viewStyle: 'view_style'
        }
      },
      inputSchema: {
        projectId: {
          type: 'string',
          required: true,
          label: 'Project ID',
          placeholder: '2203306141',
          description: 'The ID of the project to update',
          aiControlled: false
        },
        name: {
          type: 'string',
          required: false,
          label: 'Project Name',
          description: 'Updated project name',
          aiControlled: true,
          aiDescription: 'The updated name of the project'
        },
        color: {
          type: 'select',
          required: false,
          label: 'Color',
          description: 'The color of the project',
          options: [
            { label: 'Berry Red', value: 'berry_red' },
            { label: 'Red', value: 'red' },
            { label: 'Orange', value: 'orange' },
            { label: 'Yellow', value: 'yellow' },
            { label: 'Blue', value: 'blue' },
            { label: 'Green', value: 'green' }
          ]
        },
        isFavorite: {
          type: 'boolean',
          required: false,
          label: 'Is Favorite',
          description: 'Whether the project is a favorite'
        },
        viewStyle: {
          type: 'select',
          required: false,
          label: 'View Style',
          options: [
            { label: 'List', value: 'list' },
            { label: 'Board', value: 'board' }
          ]
        }
      },
      outputSchema: {
        id: { type: 'string', description: 'Project ID' },
        name: { type: 'string', description: 'Updated project name' }
      }
    },
    {
      id: 'project_delete',
      name: 'Delete Project',
      description: 'Delete a project',
      category: 'Project',
      icon: 'trash',
      verified: false,
      api: {
        endpoint: '/projects/{projectId}',
        method: 'DELETE',
        baseUrl: 'https://api.todoist.com/rest/v2',
        headers: {
          'Authorization': 'Bearer {apiKey}'
        },
        paramMapping: {
          projectId: 'projectId'
        }
      },
      inputSchema: {
        projectId: {
          type: 'string',
          required: true,
          label: 'Project ID',
          placeholder: '2203306141',
          description: 'The ID of the project to delete'
        }
      },
      outputSchema: {
        success: { type: 'boolean', description: 'Success status' }
      }
    },
    {
      id: 'project_archive',
      name: 'Archive Project',
      description: 'Archive a project',
      category: 'Project',
      icon: 'archive',
      verified: false,
      api: {
        endpoint: '/projects/{projectId}',
        method: 'POST',
        baseUrl: 'https://api.todoist.com/rest/v2',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer {apiKey}'
        },
        paramMapping: {
          projectId: 'projectId',
          isArchived: 'is_archived'
        }
      },
      inputSchema: {
        projectId: {
          type: 'string',
          required: true,
          label: 'Project ID',
          placeholder: '2203306141',
          description: 'The ID of the project to archive'
        }
      },
      outputSchema: {
        success: { type: 'boolean', description: 'Success status' }
      }
    },
    {
      id: 'project_unarchive',
      name: 'Unarchive Project',
      description: 'Unarchive a project',
      category: 'Project',
      icon: 'inbox',
      verified: false,
      api: {
        endpoint: '/projects/{projectId}',
        method: 'POST',
        baseUrl: 'https://api.todoist.com/rest/v2',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer {apiKey}'
        },
        paramMapping: {
          projectId: 'projectId',
          isArchived: 'is_archived'
        }
      },
      inputSchema: {
        projectId: {
          type: 'string',
          required: true,
          label: 'Project ID',
          placeholder: '2203306141',
          description: 'The ID of the project to unarchive'
        }
      },
      outputSchema: {
        success: { type: 'boolean', description: 'Success status' }
      }
    },
    {
      id: 'project_getCollaborators',
      name: 'Get Project Collaborators',
      description: 'Get all collaborators of a project',
      category: 'Project',
      icon: 'users',
      verified: false,
      api: {
        endpoint: '/projects/{projectId}/collaborators',
        method: 'GET',
        baseUrl: 'https://api.todoist.com/rest/v2',
        headers: {
          'Authorization': 'Bearer {apiKey}'
        },
        paramMapping: {
          projectId: 'projectId'
        }
      },
      inputSchema: {
        projectId: {
          type: 'string',
          required: true,
          label: 'Project ID',
          placeholder: '2203306141',
          description: 'The ID of the project'
        }
      },
      outputSchema: {
        collaborators: {
          type: 'array',
          description: 'Array of collaborators'
        }
      }
    },

    // Section Operations
    {
      id: 'section_create',
      name: 'Create Section',
      description: 'Create a new section',
      category: 'Section',
      icon: 'layout',
      verified: false,
      api: {
        endpoint: '/sections',
        method: 'POST',
        baseUrl: 'https://api.todoist.com/rest/v2',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer {apiKey}'
        },
        paramMapping: {
          name: 'name',
          projectId: 'project_id',
          order: 'order'
        }
      },
      inputSchema: {
        name: {
          type: 'string',
          required: true,
          label: 'Section Name',
          placeholder: 'To Do',
          description: 'Name of the section',
          aiControlled: true,
          aiDescription: 'The name of the section'
        },
        projectId: {
          type: 'string',
          required: true,
          label: 'Project ID',
          placeholder: '2203306141',
          description: 'Project ID to add section to',
          aiControlled: false
        },
        order: {
          type: 'number',
          required: false,
          label: 'Order',
          description: 'The order of the section',
          default: 0
        }
      },
      outputSchema: {
        id: { type: 'string', description: 'Section ID' },
        name: { type: 'string', description: 'Section name' }
      }
    },
    {
      id: 'section_get',
      name: 'Get Section',
      description: 'Get a section by ID',
      category: 'Section',
      icon: 'layout',
      verified: false,
      api: {
        endpoint: '/sections/{sectionId}',
        method: 'GET',
        baseUrl: 'https://api.todoist.com/rest/v2',
        headers: {
          'Authorization': 'Bearer {apiKey}'
        },
        paramMapping: {
          sectionId: 'sectionId'
        }
      },
      inputSchema: {
        sectionId: {
          type: 'string',
          required: true,
          label: 'Section ID',
          placeholder: '7025',
          description: 'The ID of the section to retrieve'
        }
      },
      outputSchema: {
        id: { type: 'string', description: 'Section ID' },
        name: { type: 'string', description: 'Section name' }
      }
    },
    {
      id: 'section_getAll',
      name: 'Get Many Sections',
      description: 'Get many sections',
      category: 'Section',
      icon: 'layers',
      verified: false,
      api: {
        endpoint: '/sections',
        method: 'GET',
        baseUrl: 'https://api.todoist.com/rest/v2',
        headers: {
          'Authorization': 'Bearer {apiKey}'
        },
        paramMapping: {
          projectId: 'project_id'
        }
      },
      inputSchema: {
        projectId: {
          type: 'string',
          required: false,
          label: 'Project ID',
          placeholder: '2203306141',
          description: 'Filter sections by project ID'
        }
      },
      outputSchema: {
        sections: {
          type: 'array',
          description: 'Array of sections'
        }
      }
    },
    {
      id: 'section_update',
      name: 'Update Section',
      description: 'Update a section',
      category: 'Section',
      icon: 'edit',
      verified: false,
      api: {
        endpoint: '/sections/{sectionId}',
        method: 'POST',
        baseUrl: 'https://api.todoist.com/rest/v2',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer {apiKey}'
        },
        paramMapping: {
          sectionId: 'sectionId',
          name: 'name'
        }
      },
      inputSchema: {
        sectionId: {
          type: 'string',
          required: true,
          label: 'Section ID',
          placeholder: '7025',
          description: 'The ID of the section to update',
          aiControlled: false
        },
        name: {
          type: 'string',
          required: true,
          label: 'Section Name',
          description: 'Updated section name',
          aiControlled: true,
          aiDescription: 'The updated name of the section'
        }
      },
      outputSchema: {
        id: { type: 'string', description: 'Section ID' },
        name: { type: 'string', description: 'Updated section name' }
      }
    },
    {
      id: 'section_delete',
      name: 'Delete Section',
      description: 'Delete a section',
      category: 'Section',
      icon: 'trash',
      verified: false,
      api: {
        endpoint: '/sections/{sectionId}',
        method: 'DELETE',
        baseUrl: 'https://api.todoist.com/rest/v2',
        headers: {
          'Authorization': 'Bearer {apiKey}'
        },
        paramMapping: {
          sectionId: 'sectionId'
        }
      },
      inputSchema: {
        sectionId: {
          type: 'string',
          required: true,
          label: 'Section ID',
          placeholder: '7025',
          description: 'The ID of the section to delete'
        }
      },
      outputSchema: {
        success: { type: 'boolean', description: 'Success status' }
      }
    },

    // Comment Operations
    {
      id: 'comment_create',
      name: 'Create Comment',
      description: 'Create a new comment on a task',
      category: 'Comment',
      icon: 'message-square',
      verified: false,
      api: {
        endpoint: '/comments',
        method: 'POST',
        baseUrl: 'https://api.todoist.com/rest/v2',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer {apiKey}'
        },
        paramMapping: {
          taskId: 'task_id',
          content: 'content'
        }
      },
      inputSchema: {
        taskId: {
          type: 'string',
          required: true,
          label: 'Task ID',
          placeholder: '2995104339',
          description: 'The ID of the task to comment on',
          aiControlled: false
        },
        content: {
          type: 'string',
          required: true,
          label: 'Comment Content',
          placeholder: 'Great job!',
          description: 'Comment content',
          inputType: 'textarea',
          aiControlled: true,
          aiDescription: 'The content of the comment'
        }
      },
      outputSchema: {
        id: { type: 'string', description: 'Comment ID' },
        content: { type: 'string', description: 'Comment content' }
      }
    },
    {
      id: 'comment_get',
      name: 'Get Comment',
      description: 'Get a comment by ID',
      category: 'Comment',
      icon: 'message-square',
      verified: false,
      api: {
        endpoint: '/comments/{commentId}',
        method: 'GET',
        baseUrl: 'https://api.todoist.com/rest/v2',
        headers: {
          'Authorization': 'Bearer {apiKey}'
        },
        paramMapping: {
          commentId: 'commentId'
        }
      },
      inputSchema: {
        commentId: {
          type: 'string',
          required: true,
          label: 'Comment ID',
          placeholder: '2992679862',
          description: 'The ID of the comment to retrieve'
        }
      },
      outputSchema: {
        id: { type: 'string', description: 'Comment ID' },
        content: { type: 'string', description: 'Comment content' }
      }
    },
    {
      id: 'comment_getAll',
      name: 'Get Many Comments',
      description: 'Get many comments',
      category: 'Comment',
      icon: 'message-circle',
      verified: false,
      api: {
        endpoint: '/comments',
        method: 'GET',
        baseUrl: 'https://api.todoist.com/rest/v2',
        headers: {
          'Authorization': 'Bearer {apiKey}'
        },
        paramMapping: {
          taskId: 'task_id',
          projectId: 'project_id'
        }
      },
      inputSchema: {
        taskId: {
          type: 'string',
          required: false,
          label: 'Task ID',
          placeholder: '2995104339',
          description: 'Filter comments by task ID'
        },
        projectId: {
          type: 'string',
          required: false,
          label: 'Project ID',
          placeholder: '2203306141',
          description: 'Filter comments by project ID'
        }
      },
      outputSchema: {
        comments: {
          type: 'array',
          description: 'Array of comments'
        }
      }
    },
    {
      id: 'comment_update',
      name: 'Update Comment',
      description: 'Update a comment',
      category: 'Comment',
      icon: 'edit',
      verified: false,
      api: {
        endpoint: '/comments/{commentId}',
        method: 'POST',
        baseUrl: 'https://api.todoist.com/rest/v2',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer {apiKey}'
        },
        paramMapping: {
          commentId: 'commentId',
          content: 'content'
        }
      },
      inputSchema: {
        commentId: {
          type: 'string',
          required: true,
          label: 'Comment ID',
          placeholder: '2992679862',
          description: 'The ID of the comment to update',
          aiControlled: false
        },
        content: {
          type: 'string',
          required: true,
          label: 'Comment Content',
          description: 'Updated comment content',
          inputType: 'textarea',
          aiControlled: true,
          aiDescription: 'The updated content of the comment'
        }
      },
      outputSchema: {
        id: { type: 'string', description: 'Comment ID' },
        content: { type: 'string', description: 'Updated comment content' }
      }
    },
    {
      id: 'comment_delete',
      name: 'Delete Comment',
      description: 'Delete a comment',
      category: 'Comment',
      icon: 'trash',
      verified: false,
      api: {
        endpoint: '/comments/{commentId}',
        method: 'DELETE',
        baseUrl: 'https://api.todoist.com/rest/v2',
        headers: {
          'Authorization': 'Bearer {apiKey}'
        },
        paramMapping: {
          commentId: 'commentId'
        }
      },
      inputSchema: {
        commentId: {
          type: 'string',
          required: true,
          label: 'Comment ID',
          placeholder: '2992679862',
          description: 'The ID of the comment to delete'
        }
      },
      outputSchema: {
        success: { type: 'boolean', description: 'Success status' }
      }
    },

    // Label Operations
    {
      id: 'label_create',
      name: 'Create Label',
      description: 'Create a new label',
      category: 'Label',
      icon: 'tag',
      verified: false,
      api: {
        endpoint: '/labels',
        method: 'POST',
        baseUrl: 'https://api.todoist.com/rest/v2',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer {apiKey}'
        },
        paramMapping: {
          name: 'name',
          color: 'color',
          order: 'order',
          isFavorite: 'is_favorite'
        }
      },
      inputSchema: {
        name: {
          type: 'string',
          required: true,
          label: 'Label Name',
          placeholder: 'Important',
          description: 'Name of the label',
          aiControlled: true,
          aiDescription: 'The name of the label'
        },
        color: {
          type: 'select',
          required: false,
          label: 'Color',
          description: 'The color of the label',
          options: [
            { label: 'Berry Red', value: 'berry_red' },
            { label: 'Red', value: 'red' },
            { label: 'Orange', value: 'orange' },
            { label: 'Yellow', value: 'yellow' },
            { label: 'Blue', value: 'blue' },
            { label: 'Green', value: 'green' }
          ],
          aiControlled: false
        },
        order: {
          type: 'number',
          required: false,
          label: 'Order',
          description: 'Label order',
          default: 0
        },
        isFavorite: {
          type: 'boolean',
          required: false,
          label: 'Is Favorite',
          description: 'Whether the label is a favorite',
          default: false
        }
      },
      outputSchema: {
        id: { type: 'string', description: 'Label ID' },
        name: { type: 'string', description: 'Label name' }
      }
    },
    {
      id: 'label_get',
      name: 'Get Label',
      description: 'Get a label by ID',
      category: 'Label',
      icon: 'tag',
      verified: false,
      api: {
        endpoint: '/labels/{labelId}',
        method: 'GET',
        baseUrl: 'https://api.todoist.com/rest/v2',
        headers: {
          'Authorization': 'Bearer {apiKey}'
        },
        paramMapping: {
          labelId: 'labelId'
        }
      },
      inputSchema: {
        labelId: {
          type: 'string',
          required: true,
          label: 'Label ID',
          placeholder: '2156154810',
          description: 'The ID of the label to retrieve'
        }
      },
      outputSchema: {
        id: { type: 'string', description: 'Label ID' },
        name: { type: 'string', description: 'Label name' }
      }
    },
    {
      id: 'label_getAll',
      name: 'Get Many Labels',
      description: 'Get many labels',
      category: 'Label',
      icon: 'tags',
      verified: false,
      api: {
        endpoint: '/labels',
        method: 'GET',
        baseUrl: 'https://api.todoist.com/rest/v2',
        headers: {
          'Authorization': 'Bearer {apiKey}'
        }
      },
      inputSchema: {},
      outputSchema: {
        labels: {
          type: 'array',
          description: 'Array of labels'
        }
      }
    },
    {
      id: 'label_update',
      name: 'Update Label',
      description: 'Update a label',
      category: 'Label',
      icon: 'edit',
      verified: false,
      api: {
        endpoint: '/labels/{labelId}',
        method: 'POST',
        baseUrl: 'https://api.todoist.com/rest/v2',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer {apiKey}'
        },
        paramMapping: {
          labelId: 'labelId',
          name: 'name',
          color: 'color',
          order: 'order',
          isFavorite: 'is_favorite'
        }
      },
      inputSchema: {
        labelId: {
          type: 'string',
          required: true,
          label: 'Label ID',
          placeholder: '2156154810',
          description: 'The ID of the label to update',
          aiControlled: false
        },
        name: {
          type: 'string',
          required: false,
          label: 'Label Name',
          description: 'Updated label name',
          aiControlled: true,
          aiDescription: 'The updated name of the label'
        },
        color: {
          type: 'select',
          required: false,
          label: 'Color',
          options: [
            { label: 'Berry Red', value: 'berry_red' },
            { label: 'Red', value: 'red' },
            { label: 'Blue', value: 'blue' }
          ]
        },
        order: {
          type: 'number',
          required: false,
          label: 'Order',
          description: 'Label order'
        },
        isFavorite: {
          type: 'boolean',
          required: false,
          label: 'Is Favorite',
          description: 'Whether the label is a favorite'
        }
      },
      outputSchema: {
        id: { type: 'string', description: 'Label ID' },
        name: { type: 'string', description: 'Updated label name' }
      }
    },
    {
      id: 'label_delete',
      name: 'Delete Label',
      description: 'Delete a label',
      category: 'Label',
      icon: 'trash',
      verified: false,
      api: {
        endpoint: '/labels/{labelId}',
        method: 'DELETE',
        baseUrl: 'https://api.todoist.com/rest/v2',
        headers: {
          'Authorization': 'Bearer {apiKey}'
        },
        paramMapping: {
          labelId: 'labelId'
        }
      },
      inputSchema: {
        labelId: {
          type: 'string',
          required: true,
          label: 'Label ID',
          placeholder: '2156154810',
          description: 'The ID of the label to delete'
        }
      },
      outputSchema: {
        success: { type: 'boolean', description: 'Success status' }
      }
    }
  ],

  supported_triggers: []
};
