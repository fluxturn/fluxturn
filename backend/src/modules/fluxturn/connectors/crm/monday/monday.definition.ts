// Monday.com Connector Definition
// Synced with monday.connector.ts implementation

import { ConnectorDefinition } from '../../shared';

export const MONDAY_CONNECTOR: ConnectorDefinition = {
  name: 'monday',
  display_name: 'Monday.com',
  category: 'crm',
  description: 'Monday.com work management platform with customizable boards, automation, and team collaboration features',
  auth_type: 'api_key',
  verified: false,

  auth_fields: [
    {
      key: 'apiKey',
      label: 'API Key',
      type: 'password',
      required: true,
      placeholder: 'eyJhbGciOiJIUzI1NiJ9...',
      description: 'API key from Monday.com developer settings',
      helpUrl: 'https://monday.com/developers/v2#authentication-section-title',
      helpText: 'How to get your API key'
    }
  ],

  endpoints: {
    base_url: 'https://api.monday.com/v2'
  },

  webhook_support: true,
  rate_limits: { requests_per_minute: 60, complexity_per_minute: 10000 },
  sandbox_available: false,

  supported_actions: [
    {
      id: 'create_item',
      name: 'Create Item',
      description: 'Create a new item in a Monday.com board',
      category: 'Items',
      icon: 'plus',
      inputSchema: {
        boardId: {
          type: 'string',
          required: true,
          label: 'Board ID',
          placeholder: '1234567890',
          description: 'The ID of the board to create the item in',
          aiControlled: false
        },
        name: {
          type: 'string',
          required: true,
          label: 'Item Name',
          placeholder: 'New Task',
          description: 'Name of the item',
          aiControlled: true,
          aiDescription: 'The name/title of the item'
        },
        groupId: {
          type: 'string',
          required: false,
          label: 'Group ID',
          description: 'The group to place the item in',
          aiControlled: false
        },
        columnValues: {
          type: 'object',
          required: false,
          label: 'Column Values',
          description: 'JSON object with column values to set',
          aiControlled: false
        }
      },
      outputSchema: {
        id: { type: 'string', description: 'Created item ID' },
        name: { type: 'string', description: 'Item name' },
        column_values: { type: 'array', description: 'Column values of the item' }
      }
    },
    {
      id: 'update_item',
      name: 'Update Item',
      description: 'Update an existing item in Monday.com',
      category: 'Items',
      icon: 'edit',
      inputSchema: {
        itemId: {
          type: 'string',
          required: true,
          label: 'Item ID',
          placeholder: '1234567890',
          description: 'ID of the item to update',
          aiControlled: false
        },
        boardId: {
          type: 'string',
          required: true,
          label: 'Board ID',
          description: 'ID of the board containing the item',
          aiControlled: false
        },
        columnValues: {
          type: 'object',
          required: true,
          label: 'Column Values',
          description: 'JSON object with column values to update',
          aiControlled: false
        }
      },
      outputSchema: {
        id: { type: 'string', description: 'Updated item ID' },
        name: { type: 'string', description: 'Item name' },
        column_values: { type: 'array', description: 'Updated column values' }
      }
    },
    {
      id: 'create_board',
      name: 'Create Board',
      description: 'Create a new board in Monday.com',
      category: 'Boards',
      icon: 'layout',
      inputSchema: {
        name: {
          type: 'string',
          required: true,
          label: 'Board Name',
          placeholder: 'Project Tasks',
          description: 'Name for the new board',
          aiControlled: true,
          aiDescription: 'The name/title of the board'
        },
        boardKind: {
          type: 'select',
          required: false,
          label: 'Board Type',
          default: 'public',
          options: [
            { label: 'Public', value: 'public' },
            { label: 'Private', value: 'private' },
            { label: 'Shareable', value: 'share' }
          ],
          description: 'Visibility of the board',
          aiControlled: false
        },
        templateId: {
          type: 'string',
          required: false,
          label: 'Template ID',
          description: 'Optional template to use for the board',
          aiControlled: false
        }
      },
      outputSchema: {
        id: { type: 'string', description: 'Created board ID' },
        name: { type: 'string', description: 'Board name' }
      }
    },
    {
      id: 'add_column',
      name: 'Add Column',
      description: 'Add a new column to a Monday.com board',
      category: 'Boards',
      icon: 'columns',
      inputSchema: {
        boardId: {
          type: 'string',
          required: true,
          label: 'Board ID',
          placeholder: '1234567890',
          description: 'ID of the board to add the column to',
          aiControlled: false
        },
        title: {
          type: 'string',
          required: true,
          label: 'Column Title',
          placeholder: 'Status',
          description: 'Title for the new column',
          aiControlled: true,
          aiDescription: 'The title of the column'
        },
        columnType: {
          type: 'select',
          required: true,
          label: 'Column Type',
          options: [
            { label: 'Text', value: 'text' },
            { label: 'Status', value: 'status' },
            { label: 'Date', value: 'date' },
            { label: 'Numbers', value: 'numbers' },
            { label: 'Dropdown', value: 'dropdown' },
            { label: 'People', value: 'people' },
            { label: 'Checkbox', value: 'checkbox' },
            { label: 'Timeline', value: 'timeline' },
            { label: 'Long Text', value: 'long_text' },
            { label: 'Email', value: 'email' },
            { label: 'Phone', value: 'phone' },
            { label: 'Link', value: 'link' }
          ],
          description: 'Type of column to create',
          aiControlled: false
        }
      },
      outputSchema: {
        id: { type: 'string', description: 'Created column ID' },
        title: { type: 'string', description: 'Column title' },
        type: { type: 'string', description: 'Column type' }
      }
    },
    {
      id: 'get_boards',
      name: 'Get Boards',
      description: 'Retrieve boards from Monday.com',
      category: 'Boards',
      icon: 'list',
      inputSchema: {
        limit: {
          type: 'number',
          required: false,
          label: 'Limit',
          default: 25,
          description: 'Maximum number of boards to retrieve (max 100)'
        },
        page: {
          type: 'number',
          required: false,
          label: 'Page',
          default: 1,
          description: 'Page number for pagination'
        }
      },
      outputSchema: {
        boards: { type: 'array', description: 'List of boards' },
        hasNext: { type: 'boolean', description: 'Whether more boards are available' }
      }
    },
    {
      id: 'create_update',
      name: 'Create Update',
      description: 'Add an update/comment to a Monday.com item',
      category: 'Updates',
      icon: 'message-square',
      inputSchema: {
        itemId: {
          type: 'string',
          required: true,
          label: 'Item ID',
          placeholder: '1234567890',
          description: 'ID of the item to add the update to',
          aiControlled: false
        },
        body: {
          type: 'string',
          required: true,
          label: 'Update Content',
          inputType: 'textarea',
          placeholder: 'Task completed successfully!',
          description: 'Content of the update/comment',
          aiControlled: true,
          aiDescription: 'The content of the update/comment'
        }
      },
      outputSchema: {
        id: { type: 'string', description: 'Created update ID' },
        body: { type: 'string', description: 'Update content' },
        created_at: { type: 'string', description: 'Creation timestamp' }
      }
    },
    {
      id: 'delete_item',
      name: 'Delete Item',
      description: 'Delete an item from a Monday.com board',
      category: 'Items',
      icon: 'trash-2',
      inputSchema: {
        itemId: {
          type: 'string',
          required: true,
          label: 'Item ID',
          placeholder: '1234567890',
          description: 'ID of the item to delete'
        }
      },
      outputSchema: {
        id: { type: 'string', description: 'Deleted item ID' },
        deleted: { type: 'boolean', description: 'Whether the item was deleted' }
      }
    },
    {
      id: 'move_item',
      name: 'Move Item to Group',
      description: 'Move an item to a different group within the board',
      category: 'Items',
      icon: 'move',
      inputSchema: {
        itemId: {
          type: 'string',
          required: true,
          label: 'Item ID',
          placeholder: '1234567890',
          description: 'ID of the item to move'
        },
        groupId: {
          type: 'string',
          required: true,
          label: 'Target Group ID',
          placeholder: 'group_title',
          description: 'ID of the group to move the item to'
        }
      },
      outputSchema: {
        id: { type: 'string', description: 'Moved item ID' },
        group: { type: 'object', description: 'New group information' }
      }
    },
    {
      id: 'get_item',
      name: 'Get Item',
      description: 'Get details of a specific item',
      category: 'Items',
      icon: 'search',
      inputSchema: {
        itemId: {
          type: 'string',
          required: true,
          label: 'Item ID',
          placeholder: '1234567890',
          description: 'ID of the item to retrieve'
        }
      },
      outputSchema: {
        id: { type: 'string', description: 'Item ID' },
        name: { type: 'string', description: 'Item name' },
        column_values: { type: 'array', description: 'Column values' },
        board: { type: 'object', description: 'Board information' },
        group: { type: 'object', description: 'Group information' }
      }
    },
    {
      id: 'get_columns',
      name: 'Get Board Columns',
      description: 'Get all columns from a board',
      category: 'Boards',
      icon: 'columns',
      inputSchema: {
        boardId: {
          type: 'string',
          required: true,
          label: 'Board ID',
          placeholder: '1234567890',
          description: 'ID of the board'
        }
      },
      outputSchema: {
        columns: { type: 'array', description: 'List of columns' }
      }
    },
    {
      id: 'get_groups',
      name: 'Get Board Groups',
      description: 'Get all groups from a board',
      category: 'Boards',
      icon: 'folder',
      inputSchema: {
        boardId: {
          type: 'string',
          required: true,
          label: 'Board ID',
          placeholder: '1234567890',
          description: 'ID of the board'
        }
      },
      outputSchema: {
        groups: { type: 'array', description: 'List of groups' }
      }
    },
    {
      id: 'change_column_value',
      name: 'Change Column Value',
      description: 'Change a single column value for an item',
      category: 'Items',
      icon: 'edit-3',
      inputSchema: {
        boardId: {
          type: 'string',
          required: true,
          label: 'Board ID',
          placeholder: '1234567890',
          description: 'ID of the board',
          aiControlled: false
        },
        itemId: {
          type: 'string',
          required: true,
          label: 'Item ID',
          placeholder: '1234567890',
          description: 'ID of the item',
          aiControlled: false
        },
        columnId: {
          type: 'string',
          required: true,
          label: 'Column ID',
          placeholder: 'status',
          description: 'ID of the column to change',
          aiControlled: false
        },
        value: {
          type: 'object',
          required: true,
          label: 'Value',
          description: 'New value for the column (JSON format)',
          aiControlled: false
        }
      },
      outputSchema: {
        id: { type: 'string', description: 'Item ID' },
        column_values: { type: 'array', description: 'Updated column values' }
      }
    },
    {
      id: 'change_multiple_columns',
      name: 'Change Multiple Column Values',
      description: 'Change multiple column values for an item at once',
      category: 'Items',
      icon: 'edit-3',
      inputSchema: {
        boardId: {
          type: 'string',
          required: true,
          label: 'Board ID',
          placeholder: '1234567890',
          description: 'ID of the board',
          aiControlled: false
        },
        itemId: {
          type: 'string',
          required: true,
          label: 'Item ID',
          placeholder: '1234567890',
          description: 'ID of the item',
          aiControlled: false
        },
        columnValues: {
          type: 'object',
          required: true,
          label: 'Column Values',
          description: 'JSON object with column IDs as keys and values',
          aiControlled: false
        }
      },
      outputSchema: {
        id: { type: 'string', description: 'Item ID' },
        column_values: { type: 'array', description: 'Updated column values' }
      }
    }
  ],

  supported_triggers: [
    {
      id: 'item_created',
      name: 'Item Created',
      description: 'Triggered when a new item is created in a board',
      eventType: 'create_pulse',
      icon: 'plus-circle',
      webhookRequired: true,
      inputSchema: {
        boardId: {
          type: 'string',
          required: true,
          label: 'Board ID',
          description: 'Board to monitor for new items'
        }
      },
      outputSchema: {
        item: { type: 'object', description: 'Created item data' },
        board: { type: 'object', description: 'Board information' },
        userId: { type: 'string', description: 'ID of user who created the item' }
      }
    },
    {
      id: 'item_updated',
      name: 'Item Updated',
      description: 'Triggered when an item column value is changed',
      eventType: 'change_column_value',
      icon: 'edit-2',
      webhookRequired: true,
      inputSchema: {
        boardId: {
          type: 'string',
          required: true,
          label: 'Board ID',
          description: 'Board to monitor for updates'
        },
        columnId: {
          type: 'string',
          required: false,
          label: 'Column ID',
          description: 'Specific column to monitor (optional)'
        }
      },
      outputSchema: {
        item: { type: 'object', description: 'Updated item data' },
        previousValue: { type: 'object', description: 'Previous column value' },
        newValue: { type: 'object', description: 'New column value' },
        columnId: { type: 'string', description: 'Changed column ID' }
      }
    },
    {
      id: 'status_changed',
      name: 'Status Changed',
      description: 'Triggered when an item status column is changed',
      eventType: 'change_status_column_value',
      icon: 'check-circle',
      webhookRequired: true,
      inputSchema: {
        boardId: {
          type: 'string',
          required: true,
          label: 'Board ID',
          description: 'Board to monitor for status changes'
        },
        columnId: {
          type: 'string',
          required: false,
          label: 'Status Column ID',
          description: 'Specific status column to monitor (optional)'
        }
      },
      outputSchema: {
        item: { type: 'object', description: 'Item data' },
        previousStatus: { type: 'string', description: 'Previous status label' },
        newStatus: { type: 'string', description: 'New status label' },
        columnId: { type: 'string', description: 'Status column ID' }
      }
    },
    {
      id: 'board_created',
      name: 'Board Created',
      description: 'Triggered when a new board is created in the workspace',
      eventType: 'create_board',
      icon: 'layout',
      webhookRequired: true,
      outputSchema: {
        board: { type: 'object', description: 'Created board data' },
        userId: { type: 'string', description: 'ID of user who created the board' }
      }
    }
  ]
};
