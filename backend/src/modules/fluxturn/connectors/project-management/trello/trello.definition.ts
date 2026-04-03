// Trello Connector
// Comprehensive connector definition with all Trello API capabilities

import { ConnectorDefinition } from '../../shared';

export const TRELLO_CONNECTOR: ConnectorDefinition = {
  name: 'trello',
  display_name: 'Trello',
  category: 'project_management',
  description: 'Trello is a kanban-style project management tool for organizing tasks, projects, and team collaboration with boards, lists, and cards.',
  auth_type: 'api_key',
  verified: false,
  auth_fields: [
    {
      key: 'apiKey',
      label: 'API Key',
      type: 'string',
      required: true,
      placeholder: 'Enter your Trello API key',
      description: 'Your Trello API key from developer settings',
      helpUrl: 'https://trello.com/power-ups/admin',
      helpText: 'Get your API key from Trello Developer Portal'
    },
    {
      key: 'accessToken',
      label: 'Access Token',
      type: 'password',
      required: true,
      placeholder: 'Enter your Trello access token',
      description: 'Your Trello access token for API authentication',
      helpUrl: 'https://trello.com/power-ups/admin',
      helpText: 'Generate a token after getting your API key'
    }
  ],
  endpoints: {
    base_url: 'https://api.trello.com/1',
    boards: '/boards',
    lists: '/lists',
    cards: '/cards',
    members: '/members',
    checklists: '/checklists',
    labels: '/labels',
    actions: '/actions',
    search: '/search'
  },
  webhook_support: true,
  rate_limits: {
    requests_per_second: 10,
    requests_per_minute: 300,
    requests_per_hour: 1000
  },
  sandbox_available: false,

  // ============================================
  // SUPPORTED ACTIONS - Complete Trello API Coverage
  // ============================================
  supported_actions: [
    // ==========================================
    // CARD ACTIONS
    // ==========================================
    {
      id: 'create_card',
      name: 'Create Card',
      description: 'Create a new card in a Trello list',
      category: 'Cards',
      icon: 'plus-square',
      api: {
        endpoint: '/cards',
        method: 'POST',
        baseUrl: 'https://api.trello.com/1',
        headers: { 'Content-Type': 'application/json' },
        paramMapping: {
          name: 'name',
          desc: 'desc',
          idList: 'idList',
          idMembers: 'idMembers',
          idLabels: 'idLabels',
          due: 'due',
          dueComplete: 'dueComplete',
          pos: 'pos',
          urlSource: 'urlSource',
          idCardSource: 'idCardSource'
        }
      },
      inputSchema: {
        name: {
          type: 'string',
          required: true,
          label: 'Card Name',
          placeholder: 'Enter card name',
          description: 'The name/title of the card',
          aiControlled: true,
          aiDescription: 'Name/title of the card to create'
        },
        idList: {
          type: 'string',
          required: true,
          label: 'List ID',
          placeholder: 'Enter the list ID',
          description: 'The ID of the list to create the card in',
          aiControlled: false
        },
        desc: {
          type: 'string',
          required: false,
          label: 'Description',
          inputType: 'textarea',
          placeholder: 'Enter card description',
          description: 'The description of the card (supports Markdown)',
          aiControlled: true,
          aiDescription: 'Card description (supports Markdown)'
        },
        pos: {
          type: 'select',
          required: false,
          label: 'Position',
          default: 'bottom',
          options: [
            { label: 'Top', value: 'top' },
            { label: 'Bottom', value: 'bottom' }
          ],
          description: 'Position of the card in the list',
          aiControlled: false
        },
        due: {
          type: 'string',
          required: false,
          label: 'Due Date',
          placeholder: '2024-12-31T23:59:59.000Z',
          description: 'Due date in ISO format',
          aiControlled: false
        },
        dueComplete: {
          type: 'boolean',
          required: false,
          label: 'Due Complete',
          default: false,
          description: 'Whether the due date is marked as complete',
          aiControlled: false
        },
        idMembers: {
          type: 'string',
          required: false,
          label: 'Member IDs',
          placeholder: 'member1,member2',
          description: 'Comma-separated list of member IDs to assign',
          aiControlled: false
        },
        idLabels: {
          type: 'string',
          required: false,
          label: 'Label IDs',
          placeholder: 'label1,label2',
          description: 'Comma-separated list of label IDs to attach',
          aiControlled: false
        },
        urlSource: {
          type: 'string',
          required: false,
          label: 'URL Source',
          placeholder: 'https://example.com',
          description: 'URL to attach to the card',
          aiControlled: false
        },
        idCardSource: {
          type: 'string',
          required: false,
          label: 'Source Card ID',
          placeholder: 'Enter card ID to copy from',
          description: 'ID of a card to copy (creates a copy)',
          aiControlled: false
        }
      },
      outputSchema: {
        id: { type: 'string', description: 'Created card ID' },
        name: { type: 'string', description: 'Card name' },
        url: { type: 'string', description: 'Card URL' },
        shortUrl: { type: 'string', description: 'Short URL' },
        idList: { type: 'string', description: 'List ID' },
        idBoard: { type: 'string', description: 'Board ID' }
      }
    },
    {
      id: 'update_card',
      name: 'Update Card',
      description: 'Update an existing card\'s properties',
      category: 'Cards',
      icon: 'edit',
      api: {
        endpoint: '/cards/{cardId}',
        method: 'PUT',
        baseUrl: 'https://api.trello.com/1',
        headers: { 'Content-Type': 'application/json' },
        paramMapping: {
          name: 'name',
          desc: 'desc',
          closed: 'closed',
          idList: 'idList',
          idBoard: 'idBoard',
          pos: 'pos',
          due: 'due',
          dueComplete: 'dueComplete',
          idMembers: 'idMembers',
          idLabels: 'idLabels',
          cover: 'cover'
        }
      },
      inputSchema: {
        cardId: {
          type: 'string',
          required: true,
          label: 'Card ID',
          placeholder: 'Enter the card ID',
          description: 'The ID of the card to update',
          aiControlled: false
        },
        name: {
          type: 'string',
          required: false,
          label: 'Card Name',
          placeholder: 'Enter new card name',
          description: 'New name for the card',
          aiControlled: true,
          aiDescription: 'Updated name/title for the card'
        },
        desc: {
          type: 'string',
          required: false,
          label: 'Description',
          inputType: 'textarea',
          placeholder: 'Enter new description',
          description: 'New description for the card',
          aiControlled: true,
          aiDescription: 'Updated description for the card'
        },
        closed: {
          type: 'boolean',
          required: false,
          label: 'Archived',
          default: false,
          description: 'Set to true to archive the card',
          aiControlled: false
        },
        idList: {
          type: 'string',
          required: false,
          label: 'List ID',
          placeholder: 'Enter list ID to move card',
          description: 'Move card to a different list',
          aiControlled: false
        },
        idBoard: {
          type: 'string',
          required: false,
          label: 'Board ID',
          placeholder: 'Enter board ID to move card',
          description: 'Move card to a different board',
          aiControlled: false
        },
        pos: {
          type: 'string',
          required: false,
          label: 'Position',
          placeholder: 'top, bottom, or number',
          description: 'Position of the card (top, bottom, or positive number)',
          aiControlled: false
        },
        due: {
          type: 'string',
          required: false,
          label: 'Due Date',
          placeholder: '2024-12-31T23:59:59.000Z',
          description: 'Due date in ISO format (null to remove)',
          aiControlled: false
        },
        dueComplete: {
          type: 'boolean',
          required: false,
          label: 'Due Complete',
          description: 'Whether the due date is marked as complete',
          aiControlled: false
        },
        idMembers: {
          type: 'string',
          required: false,
          label: 'Member IDs',
          placeholder: 'member1,member2',
          description: 'Comma-separated list of member IDs',
          aiControlled: false
        },
        idLabels: {
          type: 'string',
          required: false,
          label: 'Label IDs',
          placeholder: 'label1,label2',
          description: 'Comma-separated list of label IDs',
          aiControlled: false
        }
      },
      outputSchema: {
        id: { type: 'string', description: 'Card ID' },
        name: { type: 'string', description: 'Updated card name' },
        desc: { type: 'string', description: 'Updated description' },
        closed: { type: 'boolean', description: 'Archive status' },
        url: { type: 'string', description: 'Card URL' }
      }
    },
    {
      id: 'get_card',
      name: 'Get Card',
      description: 'Retrieve details of a specific card',
      category: 'Cards',
      icon: 'file-text',
      api: {
        endpoint: '/cards/{cardId}',
        method: 'GET',
        baseUrl: 'https://api.trello.com/1',
        headers: { 'Content-Type': 'application/json' }
      },
      inputSchema: {
        cardId: {
          type: 'string',
          required: true,
          label: 'Card ID',
          placeholder: 'Enter the card ID',
          description: 'The ID of the card to retrieve'
        },
        fields: {
          type: 'string',
          required: false,
          label: 'Fields',
          placeholder: 'name,desc,due,idList',
          default: 'all',
          description: 'Comma-separated list of fields to return'
        },
        members: {
          type: 'boolean',
          required: false,
          label: 'Include Members',
          default: true,
          description: 'Include member information'
        },
        labels: {
          type: 'boolean',
          required: false,
          label: 'Include Labels',
          default: true,
          description: 'Include label information'
        },
        checklists: {
          type: 'select',
          required: false,
          label: 'Include Checklists',
          default: 'none',
          options: [
            { label: 'None', value: 'none' },
            { label: 'All', value: 'all' }
          ],
          description: 'Include checklist information'
        },
        attachments: {
          type: 'boolean',
          required: false,
          label: 'Include Attachments',
          default: false,
          description: 'Include attachment information'
        }
      },
      outputSchema: {
        id: { type: 'string', description: 'Card ID' },
        name: { type: 'string', description: 'Card name' },
        desc: { type: 'string', description: 'Card description' },
        due: { type: 'string', description: 'Due date' },
        dueComplete: { type: 'boolean', description: 'Due complete status' },
        closed: { type: 'boolean', description: 'Archive status' },
        idList: { type: 'string', description: 'List ID' },
        idBoard: { type: 'string', description: 'Board ID' },
        url: { type: 'string', description: 'Card URL' },
        members: { type: 'array', description: 'Card members' },
        labels: { type: 'array', description: 'Card labels' }
      }
    },
    {
      id: 'get_cards',
      name: 'Get Cards',
      description: 'Get all cards from a board or list',
      category: 'Cards',
      icon: 'list',
      api: {
        endpoint: '/boards/{boardId}/cards',
        method: 'GET',
        baseUrl: 'https://api.trello.com/1',
        headers: { 'Content-Type': 'application/json' }
      },
      inputSchema: {
        boardId: {
          type: 'string',
          required: false,
          label: 'Board ID',
          placeholder: 'Enter board ID',
          description: 'Get all cards from this board'
        },
        listId: {
          type: 'string',
          required: false,
          label: 'List ID',
          placeholder: 'Enter list ID',
          description: 'Get all cards from this list (overrides boardId)'
        },
        filter: {
          type: 'select',
          required: false,
          label: 'Filter',
          default: 'visible',
          options: [
            { label: 'All', value: 'all' },
            { label: 'Visible', value: 'visible' },
            { label: 'Open', value: 'open' },
            { label: 'Closed', value: 'closed' }
          ],
          description: 'Filter cards by status'
        },
        fields: {
          type: 'string',
          required: false,
          label: 'Fields',
          placeholder: 'name,desc,due,idList',
          default: 'all',
          description: 'Comma-separated list of fields to return'
        },
        limit: {
          type: 'number',
          required: false,
          label: 'Limit',
          default: 100,
          min: 1,
          max: 1000,
          description: 'Maximum number of cards to return'
        }
      },
      outputSchema: {
        cards: {
          type: 'array',
          description: 'Array of cards',
          properties: {
            id: { type: 'string' },
            name: { type: 'string' },
            desc: { type: 'string' },
            due: { type: 'string' },
            idList: { type: 'string' }
          }
        }
      }
    },
    {
      id: 'delete_card',
      name: 'Delete Card',
      description: 'Permanently delete a card',
      category: 'Cards',
      icon: 'trash-2',
      api: {
        endpoint: '/cards/{cardId}',
        method: 'DELETE',
        baseUrl: 'https://api.trello.com/1',
        headers: { 'Content-Type': 'application/json' }
      },
      inputSchema: {
        cardId: {
          type: 'string',
          required: true,
          label: 'Card ID',
          placeholder: 'Enter the card ID',
          description: 'The ID of the card to delete (permanent action)'
        }
      },
      outputSchema: {
        success: { type: 'boolean', description: 'Whether deletion was successful' }
      }
    },
    {
      id: 'archive_card',
      name: 'Archive Card',
      description: 'Archive (close) a card',
      category: 'Cards',
      icon: 'archive',
      api: {
        endpoint: '/cards/{cardId}',
        method: 'PUT',
        baseUrl: 'https://api.trello.com/1',
        headers: { 'Content-Type': 'application/json' }
      },
      inputSchema: {
        cardId: {
          type: 'string',
          required: true,
          label: 'Card ID',
          placeholder: 'Enter the card ID',
          description: 'The ID of the card to archive'
        },
        closed: {
          type: 'boolean',
          required: false,
          label: 'Archive',
          default: true,
          description: 'Set to true to archive, false to unarchive'
        }
      },
      outputSchema: {
        id: { type: 'string', description: 'Card ID' },
        closed: { type: 'boolean', description: 'Archive status' }
      }
    },
    {
      id: 'move_card',
      name: 'Move Card',
      description: 'Move a card to a different list or board',
      category: 'Cards',
      icon: 'move',
      api: {
        endpoint: '/cards/{cardId}',
        method: 'PUT',
        baseUrl: 'https://api.trello.com/1',
        headers: { 'Content-Type': 'application/json' },
        paramMapping: {
          idList: 'idList',
          idBoard: 'idBoard',
          pos: 'pos'
        }
      },
      inputSchema: {
        cardId: {
          type: 'string',
          required: true,
          label: 'Card ID',
          placeholder: 'Enter the card ID',
          description: 'The ID of the card to move'
        },
        idList: {
          type: 'string',
          required: true,
          label: 'Target List ID',
          placeholder: 'Enter the target list ID',
          description: 'The ID of the list to move the card to'
        },
        idBoard: {
          type: 'string',
          required: false,
          label: 'Target Board ID',
          placeholder: 'Enter board ID (if moving to another board)',
          description: 'The ID of the board (required if moving to another board)'
        },
        pos: {
          type: 'select',
          required: false,
          label: 'Position',
          default: 'bottom',
          options: [
            { label: 'Top', value: 'top' },
            { label: 'Bottom', value: 'bottom' }
          ],
          description: 'Position in the target list'
        }
      },
      outputSchema: {
        id: { type: 'string', description: 'Card ID' },
        idList: { type: 'string', description: 'New list ID' },
        idBoard: { type: 'string', description: 'Board ID' }
      }
    },
    {
      id: 'copy_card',
      name: 'Copy Card',
      description: 'Create a copy of an existing card',
      category: 'Cards',
      icon: 'copy',
      api: {
        endpoint: '/cards',
        method: 'POST',
        baseUrl: 'https://api.trello.com/1',
        headers: { 'Content-Type': 'application/json' },
        paramMapping: {
          idCardSource: 'idCardSource',
          idList: 'idList',
          keepFromSource: 'keepFromSource',
          name: 'name'
        }
      },
      inputSchema: {
        idCardSource: {
          type: 'string',
          required: true,
          label: 'Source Card ID',
          placeholder: 'Enter the card ID to copy',
          description: 'The ID of the card to copy'
        },
        idList: {
          type: 'string',
          required: true,
          label: 'Target List ID',
          placeholder: 'Enter the target list ID',
          description: 'The ID of the list to create the copy in'
        },
        name: {
          type: 'string',
          required: false,
          label: 'New Name',
          placeholder: 'Enter new name (optional)',
          description: 'New name for the copied card'
        },
        keepFromSource: {
          type: 'string',
          required: false,
          label: 'Keep From Source',
          placeholder: 'attachments,checklists,comments,due,labels,members,stickers',
          default: 'all',
          description: 'Comma-separated list of properties to keep'
        }
      },
      outputSchema: {
        id: { type: 'string', description: 'New card ID' },
        name: { type: 'string', description: 'Card name' },
        url: { type: 'string', description: 'Card URL' }
      }
    },
    {
      id: 'set_due_date',
      name: 'Set Due Date',
      description: 'Set or update the due date on a card',
      category: 'Cards',
      icon: 'calendar',
      api: {
        endpoint: '/cards/{cardId}',
        method: 'PUT',
        baseUrl: 'https://api.trello.com/1',
        headers: { 'Content-Type': 'application/json' },
        paramMapping: {
          due: 'due',
          dueReminder: 'dueReminder'
        }
      },
      inputSchema: {
        cardId: {
          type: 'string',
          required: true,
          label: 'Card ID',
          placeholder: 'Enter the card ID',
          description: 'The ID of the card'
        },
        due: {
          type: 'string',
          required: true,
          label: 'Due Date',
          placeholder: '2024-12-31T23:59:59.000Z',
          description: 'Due date in ISO format (set to null to remove)'
        },
        dueReminder: {
          type: 'select',
          required: false,
          label: 'Due Reminder',
          options: [
            { label: 'None', value: null },
            { label: 'At time of due date', value: 0 },
            { label: '5 minutes before', value: 5 },
            { label: '10 minutes before', value: 10 },
            { label: '15 minutes before', value: 15 },
            { label: '1 hour before', value: 60 },
            { label: '2 hours before', value: 120 },
            { label: '1 day before', value: 1440 },
            { label: '2 days before', value: 2880 }
          ],
          description: 'When to send a reminder (in minutes before due)'
        }
      },
      outputSchema: {
        id: { type: 'string', description: 'Card ID' },
        due: { type: 'string', description: 'Due date' },
        dueReminder: { type: 'number', description: 'Reminder setting' }
      }
    },
    {
      id: 'complete_due_date',
      name: 'Complete Due Date',
      description: 'Mark a card\'s due date as complete or incomplete',
      category: 'Cards',
      icon: 'check-circle',
      api: {
        endpoint: '/cards/{cardId}',
        method: 'PUT',
        baseUrl: 'https://api.trello.com/1',
        headers: { 'Content-Type': 'application/json' },
        paramMapping: {
          dueComplete: 'dueComplete'
        }
      },
      inputSchema: {
        cardId: {
          type: 'string',
          required: true,
          label: 'Card ID',
          placeholder: 'Enter the card ID',
          description: 'The ID of the card'
        },
        dueComplete: {
          type: 'boolean',
          required: true,
          label: 'Due Complete',
          default: true,
          description: 'Set to true to mark as complete, false to mark incomplete'
        }
      },
      outputSchema: {
        id: { type: 'string', description: 'Card ID' },
        dueComplete: { type: 'boolean', description: 'Completion status' }
      }
    },

    // ==========================================
    // CARD MEMBER ACTIONS
    // ==========================================
    {
      id: 'add_member',
      name: 'Add Member to Card',
      description: 'Add a member to a card',
      category: 'Card Members',
      icon: 'user-plus',
      api: {
        endpoint: '/cards/{cardId}/idMembers',
        method: 'POST',
        baseUrl: 'https://api.trello.com/1',
        headers: { 'Content-Type': 'application/json' },
        paramMapping: {
          memberId: 'value'
        }
      },
      inputSchema: {
        cardId: {
          type: 'string',
          required: true,
          label: 'Card ID',
          placeholder: 'Enter the card ID',
          description: 'The ID of the card'
        },
        memberId: {
          type: 'string',
          required: true,
          label: 'Member ID',
          placeholder: 'Enter the member ID',
          description: 'The ID of the member to add'
        }
      },
      outputSchema: {
        success: { type: 'boolean', description: 'Whether member was added' }
      }
    },
    {
      id: 'remove_member_from_card',
      name: 'Remove Member from Card',
      description: 'Remove a member from a card',
      category: 'Card Members',
      icon: 'user-minus',
      api: {
        endpoint: '/cards/{cardId}/idMembers/{memberId}',
        method: 'DELETE',
        baseUrl: 'https://api.trello.com/1',
        headers: { 'Content-Type': 'application/json' }
      },
      inputSchema: {
        cardId: {
          type: 'string',
          required: true,
          label: 'Card ID',
          placeholder: 'Enter the card ID',
          description: 'The ID of the card'
        },
        memberId: {
          type: 'string',
          required: true,
          label: 'Member ID',
          placeholder: 'Enter the member ID',
          description: 'The ID of the member to remove'
        }
      },
      outputSchema: {
        success: { type: 'boolean', description: 'Whether member was removed' }
      }
    },
    {
      id: 'get_card_members',
      name: 'Get Card Members',
      description: 'Get all members assigned to a card',
      category: 'Card Members',
      icon: 'users',
      api: {
        endpoint: '/cards/{cardId}/members',
        method: 'GET',
        baseUrl: 'https://api.trello.com/1',
        headers: { 'Content-Type': 'application/json' }
      },
      inputSchema: {
        cardId: {
          type: 'string',
          required: true,
          label: 'Card ID',
          placeholder: 'Enter the card ID',
          description: 'The ID of the card'
        }
      },
      outputSchema: {
        members: {
          type: 'array',
          description: 'Array of members',
          properties: {
            id: { type: 'string' },
            fullName: { type: 'string' },
            username: { type: 'string' }
          }
        }
      }
    },

    // ==========================================
    // LABEL ACTIONS
    // ==========================================
    {
      id: 'add_label_to_card',
      name: 'Add Label to Card',
      description: 'Add a label to a card',
      category: 'Labels',
      icon: 'tag',
      api: {
        endpoint: '/cards/{cardId}/idLabels',
        method: 'POST',
        baseUrl: 'https://api.trello.com/1',
        headers: { 'Content-Type': 'application/json' },
        paramMapping: {
          value: 'value'
        }
      },
      inputSchema: {
        cardId: {
          type: 'string',
          required: true,
          label: 'Card ID',
          placeholder: 'Enter the card ID',
          description: 'The ID of the card'
        },
        value: {
          type: 'string',
          required: true,
          label: 'Label ID',
          placeholder: 'Enter the label ID',
          description: 'The ID of the label to add'
        }
      },
      outputSchema: {
        success: { type: 'boolean', description: 'Whether label was added' }
      }
    },
    {
      id: 'remove_label_from_card',
      name: 'Remove Label from Card',
      description: 'Remove a label from a card',
      category: 'Labels',
      icon: 'tag',
      api: {
        endpoint: '/cards/{cardId}/idLabels/{labelId}',
        method: 'DELETE',
        baseUrl: 'https://api.trello.com/1',
        headers: { 'Content-Type': 'application/json' }
      },
      inputSchema: {
        cardId: {
          type: 'string',
          required: true,
          label: 'Card ID',
          placeholder: 'Enter the card ID',
          description: 'The ID of the card'
        },
        labelId: {
          type: 'string',
          required: true,
          label: 'Label ID',
          placeholder: 'Enter the label ID',
          description: 'The ID of the label to remove'
        }
      },
      outputSchema: {
        success: { type: 'boolean', description: 'Whether label was removed' }
      }
    },
    {
      id: 'create_label',
      name: 'Create Label',
      description: 'Create a new label on a board',
      category: 'Labels',
      icon: 'tag',
      api: {
        endpoint: '/boards/{boardId}/labels',
        method: 'POST',
        baseUrl: 'https://api.trello.com/1',
        headers: { 'Content-Type': 'application/json' },
        paramMapping: {
          name: 'name',
          color: 'color'
        }
      },
      inputSchema: {
        boardId: {
          type: 'string',
          required: true,
          label: 'Board ID',
          placeholder: 'Enter the board ID',
          description: 'The ID of the board'
        },
        name: {
          type: 'string',
          required: true,
          label: 'Label Name',
          placeholder: 'Enter label name',
          description: 'Name for the label'
        },
        color: {
          type: 'select',
          required: true,
          label: 'Color',
          options: [
            { label: 'Green', value: 'green' },
            { label: 'Yellow', value: 'yellow' },
            { label: 'Orange', value: 'orange' },
            { label: 'Red', value: 'red' },
            { label: 'Purple', value: 'purple' },
            { label: 'Blue', value: 'blue' },
            { label: 'Sky', value: 'sky' },
            { label: 'Lime', value: 'lime' },
            { label: 'Pink', value: 'pink' },
            { label: 'Black', value: 'black' },
            { label: 'No Color', value: null }
          ],
          description: 'Color for the label'
        }
      },
      outputSchema: {
        id: { type: 'string', description: 'Label ID' },
        name: { type: 'string', description: 'Label name' },
        color: { type: 'string', description: 'Label color' }
      }
    },
    {
      id: 'update_label',
      name: 'Update Label',
      description: 'Update a label\'s name or color',
      category: 'Labels',
      icon: 'edit',
      api: {
        endpoint: '/labels/{labelId}',
        method: 'PUT',
        baseUrl: 'https://api.trello.com/1',
        headers: { 'Content-Type': 'application/json' },
        paramMapping: {
          name: 'name',
          color: 'color'
        }
      },
      inputSchema: {
        labelId: {
          type: 'string',
          required: true,
          label: 'Label ID',
          placeholder: 'Enter the label ID',
          description: 'The ID of the label to update'
        },
        name: {
          type: 'string',
          required: false,
          label: 'Label Name',
          placeholder: 'Enter new label name',
          description: 'New name for the label'
        },
        color: {
          type: 'select',
          required: false,
          label: 'Color',
          options: [
            { label: 'Green', value: 'green' },
            { label: 'Yellow', value: 'yellow' },
            { label: 'Orange', value: 'orange' },
            { label: 'Red', value: 'red' },
            { label: 'Purple', value: 'purple' },
            { label: 'Blue', value: 'blue' },
            { label: 'Sky', value: 'sky' },
            { label: 'Lime', value: 'lime' },
            { label: 'Pink', value: 'pink' },
            { label: 'Black', value: 'black' },
            { label: 'No Color', value: null }
          ],
          description: 'New color for the label'
        }
      },
      outputSchema: {
        id: { type: 'string', description: 'Label ID' },
        name: { type: 'string', description: 'Updated name' },
        color: { type: 'string', description: 'Updated color' }
      }
    },
    {
      id: 'delete_label',
      name: 'Delete Label',
      description: 'Delete a label from a board',
      category: 'Labels',
      icon: 'trash-2',
      api: {
        endpoint: '/labels/{labelId}',
        method: 'DELETE',
        baseUrl: 'https://api.trello.com/1',
        headers: { 'Content-Type': 'application/json' }
      },
      inputSchema: {
        labelId: {
          type: 'string',
          required: true,
          label: 'Label ID',
          placeholder: 'Enter the label ID',
          description: 'The ID of the label to delete'
        }
      },
      outputSchema: {
        success: { type: 'boolean', description: 'Whether deletion was successful' }
      }
    },
    {
      id: 'get_board_labels',
      name: 'Get Board Labels',
      description: 'Get all labels on a board',
      category: 'Labels',
      icon: 'tags',
      api: {
        endpoint: '/boards/{boardId}/labels',
        method: 'GET',
        baseUrl: 'https://api.trello.com/1',
        headers: { 'Content-Type': 'application/json' }
      },
      inputSchema: {
        boardId: {
          type: 'string',
          required: true,
          label: 'Board ID',
          placeholder: 'Enter the board ID',
          description: 'The ID of the board'
        },
        limit: {
          type: 'number',
          required: false,
          label: 'Limit',
          default: 50,
          min: 1,
          max: 1000,
          description: 'Maximum number of labels to return'
        }
      },
      outputSchema: {
        labels: {
          type: 'array',
          description: 'Array of labels',
          properties: {
            id: { type: 'string' },
            name: { type: 'string' },
            color: { type: 'string' }
          }
        }
      }
    },

    // ==========================================
    // COMMENT ACTIONS
    // ==========================================
    {
      id: 'add_comment',
      name: 'Add Comment',
      description: 'Add a comment to a card',
      category: 'Comments',
      icon: 'message-circle',
      api: {
        endpoint: '/cards/{cardId}/actions/comments',
        method: 'POST',
        baseUrl: 'https://api.trello.com/1',
        headers: { 'Content-Type': 'application/json' },
        paramMapping: {
          text: 'text'
        }
      },
      inputSchema: {
        cardId: {
          type: 'string',
          required: true,
          label: 'Card ID',
          placeholder: 'Enter the card ID',
          description: 'The ID of the card'
        },
        text: {
          type: 'string',
          required: true,
          label: 'Comment Text',
          inputType: 'textarea',
          placeholder: 'Enter your comment',
          description: 'The comment text'
        }
      },
      outputSchema: {
        id: { type: 'string', description: 'Comment ID' },
        date: { type: 'string', description: 'Comment date' },
        text: { type: 'string', description: 'Comment text' }
      }
    },
    {
      id: 'update_comment',
      name: 'Update Comment',
      description: 'Update an existing comment',
      category: 'Comments',
      icon: 'edit',
      api: {
        endpoint: '/actions/{commentId}',
        method: 'PUT',
        baseUrl: 'https://api.trello.com/1',
        headers: { 'Content-Type': 'application/json' },
        paramMapping: {
          text: 'text'
        }
      },
      inputSchema: {
        commentId: {
          type: 'string',
          required: true,
          label: 'Comment ID',
          placeholder: 'Enter the comment ID',
          description: 'The ID of the comment (action ID)'
        },
        text: {
          type: 'string',
          required: true,
          label: 'New Comment Text',
          inputType: 'textarea',
          placeholder: 'Enter updated comment',
          description: 'The updated comment text'
        }
      },
      outputSchema: {
        id: { type: 'string', description: 'Comment ID' },
        text: { type: 'string', description: 'Updated text' }
      }
    },
    {
      id: 'delete_comment',
      name: 'Delete Comment',
      description: 'Delete a comment from a card',
      category: 'Comments',
      icon: 'trash-2',
      api: {
        endpoint: '/actions/{commentId}',
        method: 'DELETE',
        baseUrl: 'https://api.trello.com/1',
        headers: { 'Content-Type': 'application/json' }
      },
      inputSchema: {
        commentId: {
          type: 'string',
          required: true,
          label: 'Comment ID',
          placeholder: 'Enter the comment ID',
          description: 'The ID of the comment to delete'
        }
      },
      outputSchema: {
        success: { type: 'boolean', description: 'Whether deletion was successful' }
      }
    },
    {
      id: 'get_card_comments',
      name: 'Get Card Comments',
      description: 'Get all comments on a card',
      category: 'Comments',
      icon: 'message-square',
      api: {
        endpoint: '/cards/{cardId}/actions',
        method: 'GET',
        baseUrl: 'https://api.trello.com/1',
        headers: { 'Content-Type': 'application/json' }
      },
      inputSchema: {
        cardId: {
          type: 'string',
          required: true,
          label: 'Card ID',
          placeholder: 'Enter the card ID',
          description: 'The ID of the card'
        },
        limit: {
          type: 'number',
          required: false,
          label: 'Limit',
          default: 50,
          min: 1,
          max: 1000,
          description: 'Maximum number of comments to return'
        }
      },
      outputSchema: {
        comments: {
          type: 'array',
          description: 'Array of comments',
          properties: {
            id: { type: 'string' },
            date: { type: 'string' },
            text: { type: 'string' },
            memberCreator: { type: 'object' }
          }
        }
      }
    },

    // ==========================================
    // CHECKLIST ACTIONS
    // ==========================================
    {
      id: 'create_checklist',
      name: 'Create Checklist',
      description: 'Create a new checklist on a card',
      category: 'Checklists',
      icon: 'check-square',
      api: {
        endpoint: '/checklists',
        method: 'POST',
        baseUrl: 'https://api.trello.com/1',
        headers: { 'Content-Type': 'application/json' },
        paramMapping: {
          name: 'name',
          cardId: 'idCard',
          pos: 'pos',
          idChecklistSource: 'idChecklistSource'
        }
      },
      inputSchema: {
        cardId: {
          type: 'string',
          required: true,
          label: 'Card ID',
          placeholder: 'Enter the card ID',
          description: 'The ID of the card to add the checklist to'
        },
        name: {
          type: 'string',
          required: true,
          label: 'Checklist Name',
          placeholder: 'Enter checklist name',
          description: 'Name for the checklist'
        },
        pos: {
          type: 'select',
          required: false,
          label: 'Position',
          default: 'bottom',
          options: [
            { label: 'Top', value: 'top' },
            { label: 'Bottom', value: 'bottom' }
          ],
          description: 'Position of the checklist'
        },
        idChecklistSource: {
          type: 'string',
          required: false,
          label: 'Source Checklist ID',
          placeholder: 'Enter checklist ID to copy',
          description: 'ID of a checklist to copy'
        }
      },
      outputSchema: {
        id: { type: 'string', description: 'Checklist ID' },
        name: { type: 'string', description: 'Checklist name' },
        idCard: { type: 'string', description: 'Card ID' }
      }
    },
    {
      id: 'update_checklist',
      name: 'Update Checklist',
      description: 'Update a checklist\'s name or position',
      category: 'Checklists',
      icon: 'edit',
      api: {
        endpoint: '/checklists/{checklistId}',
        method: 'PUT',
        baseUrl: 'https://api.trello.com/1',
        headers: { 'Content-Type': 'application/json' },
        paramMapping: {
          name: 'name',
          pos: 'pos'
        }
      },
      inputSchema: {
        checklistId: {
          type: 'string',
          required: true,
          label: 'Checklist ID',
          placeholder: 'Enter the checklist ID',
          description: 'The ID of the checklist to update'
        },
        name: {
          type: 'string',
          required: false,
          label: 'Checklist Name',
          placeholder: 'Enter new name',
          description: 'New name for the checklist'
        },
        pos: {
          type: 'string',
          required: false,
          label: 'Position',
          placeholder: 'top, bottom, or number',
          description: 'New position for the checklist'
        }
      },
      outputSchema: {
        id: { type: 'string', description: 'Checklist ID' },
        name: { type: 'string', description: 'Updated name' }
      }
    },
    {
      id: 'delete_checklist',
      name: 'Delete Checklist',
      description: 'Delete a checklist from a card',
      category: 'Checklists',
      icon: 'trash-2',
      api: {
        endpoint: '/checklists/{checklistId}',
        method: 'DELETE',
        baseUrl: 'https://api.trello.com/1',
        headers: { 'Content-Type': 'application/json' }
      },
      inputSchema: {
        checklistId: {
          type: 'string',
          required: true,
          label: 'Checklist ID',
          placeholder: 'Enter the checklist ID',
          description: 'The ID of the checklist to delete'
        }
      },
      outputSchema: {
        success: { type: 'boolean', description: 'Whether deletion was successful' }
      }
    },
    {
      id: 'get_checklists',
      name: 'Get Checklists',
      description: 'Get all checklists on a card',
      category: 'Checklists',
      icon: 'list',
      api: {
        endpoint: '/cards/{cardId}/checklists',
        method: 'GET',
        baseUrl: 'https://api.trello.com/1',
        headers: { 'Content-Type': 'application/json' }
      },
      inputSchema: {
        cardId: {
          type: 'string',
          required: true,
          label: 'Card ID',
          placeholder: 'Enter the card ID',
          description: 'The ID of the card'
        }
      },
      outputSchema: {
        checklists: {
          type: 'array',
          description: 'Array of checklists',
          properties: {
            id: { type: 'string' },
            name: { type: 'string' },
            checkItems: { type: 'array' }
          }
        }
      }
    },
    {
      id: 'add_checklist_item',
      name: 'Add Checklist Item',
      description: 'Add an item to a checklist',
      category: 'Checklists',
      icon: 'plus',
      api: {
        endpoint: '/checklists/{checklistId}/checkItems',
        method: 'POST',
        baseUrl: 'https://api.trello.com/1',
        headers: { 'Content-Type': 'application/json' },
        paramMapping: {
          name: 'name',
          pos: 'pos',
          checked: 'checked',
          due: 'due',
          idMember: 'idMember'
        }
      },
      inputSchema: {
        checklistId: {
          type: 'string',
          required: true,
          label: 'Checklist ID',
          placeholder: 'Enter the checklist ID',
          description: 'The ID of the checklist'
        },
        name: {
          type: 'string',
          required: true,
          label: 'Item Name',
          placeholder: 'Enter item name',
          description: 'Name/text for the checklist item'
        },
        pos: {
          type: 'select',
          required: false,
          label: 'Position',
          default: 'bottom',
          options: [
            { label: 'Top', value: 'top' },
            { label: 'Bottom', value: 'bottom' }
          ],
          description: 'Position of the item in the checklist'
        },
        checked: {
          type: 'boolean',
          required: false,
          label: 'Checked',
          default: false,
          description: 'Whether the item is checked/complete'
        },
        due: {
          type: 'string',
          required: false,
          label: 'Due Date',
          placeholder: '2024-12-31',
          description: 'Due date for the item (ISO format)'
        },
        idMember: {
          type: 'string',
          required: false,
          label: 'Assigned Member ID',
          placeholder: 'Enter member ID',
          description: 'ID of member to assign to this item'
        }
      },
      outputSchema: {
        id: { type: 'string', description: 'Check item ID' },
        name: { type: 'string', description: 'Item name' },
        state: { type: 'string', description: 'Item state (complete/incomplete)' }
      }
    },
    {
      id: 'update_checklist_item',
      name: 'Update Checklist Item',
      description: 'Update a checklist item (name, state, position)',
      category: 'Checklists',
      icon: 'edit',
      api: {
        endpoint: '/cards/{cardId}/checkItem/{checkItemId}',
        method: 'PUT',
        baseUrl: 'https://api.trello.com/1',
        headers: { 'Content-Type': 'application/json' },
        paramMapping: {
          name: 'name',
          state: 'state',
          pos: 'pos',
          due: 'due',
          idMember: 'idMember'
        }
      },
      inputSchema: {
        cardId: {
          type: 'string',
          required: true,
          label: 'Card ID',
          placeholder: 'Enter the card ID',
          description: 'The ID of the card'
        },
        checkItemId: {
          type: 'string',
          required: true,
          label: 'Check Item ID',
          placeholder: 'Enter the check item ID',
          description: 'The ID of the checklist item'
        },
        name: {
          type: 'string',
          required: false,
          label: 'Item Name',
          placeholder: 'Enter new item name',
          description: 'New name for the item'
        },
        state: {
          type: 'select',
          required: false,
          label: 'State',
          options: [
            { label: 'Complete', value: 'complete' },
            { label: 'Incomplete', value: 'incomplete' }
          ],
          description: 'Check state of the item'
        },
        pos: {
          type: 'string',
          required: false,
          label: 'Position',
          placeholder: 'top, bottom, or number',
          description: 'Position of the item'
        },
        due: {
          type: 'string',
          required: false,
          label: 'Due Date',
          placeholder: '2024-12-31',
          description: 'Due date for the item'
        },
        idMember: {
          type: 'string',
          required: false,
          label: 'Assigned Member ID',
          placeholder: 'Enter member ID',
          description: 'ID of member to assign'
        }
      },
      outputSchema: {
        id: { type: 'string', description: 'Check item ID' },
        name: { type: 'string', description: 'Updated name' },
        state: { type: 'string', description: 'Updated state' }
      }
    },
    {
      id: 'delete_checklist_item',
      name: 'Delete Checklist Item',
      description: 'Delete an item from a checklist',
      category: 'Checklists',
      icon: 'trash-2',
      api: {
        endpoint: '/checklists/{checklistId}/checkItems/{checkItemId}',
        method: 'DELETE',
        baseUrl: 'https://api.trello.com/1',
        headers: { 'Content-Type': 'application/json' }
      },
      inputSchema: {
        checklistId: {
          type: 'string',
          required: true,
          label: 'Checklist ID',
          placeholder: 'Enter the checklist ID',
          description: 'The ID of the checklist'
        },
        checkItemId: {
          type: 'string',
          required: true,
          label: 'Check Item ID',
          placeholder: 'Enter the check item ID',
          description: 'The ID of the item to delete'
        }
      },
      outputSchema: {
        success: { type: 'boolean', description: 'Whether deletion was successful' }
      }
    },

    // ==========================================
    // ATTACHMENT ACTIONS
    // ==========================================
    {
      id: 'add_attachment',
      name: 'Add Attachment',
      description: 'Add an attachment to a card',
      category: 'Attachments',
      icon: 'paperclip',
      api: {
        endpoint: '/cards/{cardId}/attachments',
        method: 'POST',
        baseUrl: 'https://api.trello.com/1',
        headers: { 'Content-Type': 'application/json' },
        paramMapping: {
          url: 'url',
          name: 'name',
          mimeType: 'mimeType',
          setCover: 'setCover'
        }
      },
      inputSchema: {
        cardId: {
          type: 'string',
          required: true,
          label: 'Card ID',
          placeholder: 'Enter the card ID',
          description: 'The ID of the card'
        },
        url: {
          type: 'string',
          required: true,
          label: 'URL',
          placeholder: 'https://example.com/file.pdf',
          description: 'URL of the attachment'
        },
        name: {
          type: 'string',
          required: false,
          label: 'Name',
          placeholder: 'Enter attachment name',
          description: 'Name for the attachment'
        },
        mimeType: {
          type: 'string',
          required: false,
          label: 'MIME Type',
          placeholder: 'application/pdf',
          description: 'MIME type of the attachment'
        },
        setCover: {
          type: 'boolean',
          required: false,
          label: 'Set as Cover',
          default: false,
          description: 'Set this attachment as the card cover (images only)'
        }
      },
      outputSchema: {
        id: { type: 'string', description: 'Attachment ID' },
        name: { type: 'string', description: 'Attachment name' },
        url: { type: 'string', description: 'Attachment URL' }
      }
    },
    {
      id: 'get_attachments',
      name: 'Get Attachments',
      description: 'Get all attachments on a card',
      category: 'Attachments',
      icon: 'paperclip',
      api: {
        endpoint: '/cards/{cardId}/attachments',
        method: 'GET',
        baseUrl: 'https://api.trello.com/1',
        headers: { 'Content-Type': 'application/json' }
      },
      inputSchema: {
        cardId: {
          type: 'string',
          required: true,
          label: 'Card ID',
          placeholder: 'Enter the card ID',
          description: 'The ID of the card'
        }
      },
      outputSchema: {
        attachments: {
          type: 'array',
          description: 'Array of attachments',
          properties: {
            id: { type: 'string' },
            name: { type: 'string' },
            url: { type: 'string' },
            bytes: { type: 'number' },
            mimeType: { type: 'string' }
          }
        }
      }
    },
    {
      id: 'delete_attachment',
      name: 'Delete Attachment',
      description: 'Delete an attachment from a card',
      category: 'Attachments',
      icon: 'trash-2',
      api: {
        endpoint: '/cards/{cardId}/attachments/{attachmentId}',
        method: 'DELETE',
        baseUrl: 'https://api.trello.com/1',
        headers: { 'Content-Type': 'application/json' }
      },
      inputSchema: {
        cardId: {
          type: 'string',
          required: true,
          label: 'Card ID',
          placeholder: 'Enter the card ID',
          description: 'The ID of the card'
        },
        attachmentId: {
          type: 'string',
          required: true,
          label: 'Attachment ID',
          placeholder: 'Enter the attachment ID',
          description: 'The ID of the attachment to delete'
        }
      },
      outputSchema: {
        success: { type: 'boolean', description: 'Whether deletion was successful' }
      }
    },

    // ==========================================
    // BOARD ACTIONS
    // ==========================================
    {
      id: 'create_board',
      name: 'Create Board',
      description: 'Create a new Trello board',
      category: 'Boards',
      icon: 'layout',
      api: {
        endpoint: '/boards',
        method: 'POST',
        baseUrl: 'https://api.trello.com/1',
        headers: { 'Content-Type': 'application/json' },
        paramMapping: {
          name: 'name',
          desc: 'desc',
          defaultLists: 'defaultLists',
          defaultLabels: 'defaultLabels',
          idOrganization: 'idOrganization',
          prefs_permissionLevel: 'prefs_permissionLevel',
          prefs_voting: 'prefs_voting',
          prefs_comments: 'prefs_comments',
          prefs_background: 'prefs_background'
        }
      },
      inputSchema: {
        name: {
          type: 'string',
          required: true,
          label: 'Board Name',
          placeholder: 'Enter board name',
          description: 'Name for the board'
        },
        desc: {
          type: 'string',
          required: false,
          label: 'Description',
          inputType: 'textarea',
          placeholder: 'Enter board description',
          description: 'Description for the board'
        },
        defaultLists: {
          type: 'boolean',
          required: false,
          label: 'Create Default Lists',
          default: true,
          description: 'Create default lists (To Do, Doing, Done)'
        },
        defaultLabels: {
          type: 'boolean',
          required: false,
          label: 'Create Default Labels',
          default: true,
          description: 'Create default labels'
        },
        idOrganization: {
          type: 'string',
          required: false,
          label: 'Organization ID',
          placeholder: 'Enter organization/workspace ID',
          description: 'ID of the organization to create the board in'
        },
        prefs_permissionLevel: {
          type: 'select',
          required: false,
          label: 'Permission Level',
          default: 'private',
          options: [
            { label: 'Private', value: 'private' },
            { label: 'Organization', value: 'org' },
            { label: 'Public', value: 'public' }
          ],
          description: 'Who can see the board'
        },
        prefs_background: {
          type: 'select',
          required: false,
          label: 'Background',
          default: 'blue',
          options: [
            { label: 'Blue', value: 'blue' },
            { label: 'Orange', value: 'orange' },
            { label: 'Green', value: 'green' },
            { label: 'Red', value: 'red' },
            { label: 'Purple', value: 'purple' },
            { label: 'Pink', value: 'pink' },
            { label: 'Lime', value: 'lime' },
            { label: 'Sky', value: 'sky' },
            { label: 'Grey', value: 'grey' }
          ],
          description: 'Background color for the board'
        }
      },
      outputSchema: {
        id: { type: 'string', description: 'Board ID' },
        name: { type: 'string', description: 'Board name' },
        url: { type: 'string', description: 'Board URL' },
        shortUrl: { type: 'string', description: 'Short URL' }
      }
    },
    {
      id: 'update_board',
      name: 'Update Board',
      description: 'Update a board\'s settings',
      category: 'Boards',
      icon: 'edit',
      api: {
        endpoint: '/boards/{boardId}',
        method: 'PUT',
        baseUrl: 'https://api.trello.com/1',
        headers: { 'Content-Type': 'application/json' },
        paramMapping: {
          name: 'name',
          desc: 'desc',
          closed: 'closed',
          prefs_permissionLevel: 'prefs/permissionLevel',
          prefs_background: 'prefs/background'
        }
      },
      inputSchema: {
        boardId: {
          type: 'string',
          required: true,
          label: 'Board ID',
          placeholder: 'Enter the board ID',
          description: 'The ID of the board to update'
        },
        name: {
          type: 'string',
          required: false,
          label: 'Board Name',
          placeholder: 'Enter new board name',
          description: 'New name for the board'
        },
        desc: {
          type: 'string',
          required: false,
          label: 'Description',
          inputType: 'textarea',
          placeholder: 'Enter new description',
          description: 'New description for the board'
        },
        closed: {
          type: 'boolean',
          required: false,
          label: 'Closed/Archived',
          description: 'Set to true to close/archive the board'
        },
        prefs_permissionLevel: {
          type: 'select',
          required: false,
          label: 'Permission Level',
          options: [
            { label: 'Private', value: 'private' },
            { label: 'Organization', value: 'org' },
            { label: 'Public', value: 'public' }
          ],
          description: 'Who can see the board'
        },
        prefs_background: {
          type: 'select',
          required: false,
          label: 'Background',
          options: [
            { label: 'Blue', value: 'blue' },
            { label: 'Orange', value: 'orange' },
            { label: 'Green', value: 'green' },
            { label: 'Red', value: 'red' },
            { label: 'Purple', value: 'purple' },
            { label: 'Pink', value: 'pink' },
            { label: 'Lime', value: 'lime' },
            { label: 'Sky', value: 'sky' },
            { label: 'Grey', value: 'grey' }
          ],
          description: 'Background color for the board'
        }
      },
      outputSchema: {
        id: { type: 'string', description: 'Board ID' },
        name: { type: 'string', description: 'Updated name' },
        closed: { type: 'boolean', description: 'Closed status' }
      }
    },
    {
      id: 'get_board',
      name: 'Get Board',
      description: 'Get details of a specific board',
      category: 'Boards',
      icon: 'layout',
      api: {
        endpoint: '/boards/{boardId}',
        method: 'GET',
        baseUrl: 'https://api.trello.com/1',
        headers: { 'Content-Type': 'application/json' }
      },
      inputSchema: {
        boardId: {
          type: 'string',
          required: true,
          label: 'Board ID',
          placeholder: 'Enter the board ID',
          description: 'The ID of the board'
        },
        fields: {
          type: 'string',
          required: false,
          label: 'Fields',
          placeholder: 'name,desc,url,closed',
          default: 'all',
          description: 'Comma-separated list of fields to return'
        },
        lists: {
          type: 'select',
          required: false,
          label: 'Include Lists',
          default: 'none',
          options: [
            { label: 'None', value: 'none' },
            { label: 'Open', value: 'open' },
            { label: 'Closed', value: 'closed' },
            { label: 'All', value: 'all' }
          ],
          description: 'Include lists in response'
        },
        members: {
          type: 'select',
          required: false,
          label: 'Include Members',
          default: 'none',
          options: [
            { label: 'None', value: 'none' },
            { label: 'All', value: 'all' }
          ],
          description: 'Include members in response'
        }
      },
      outputSchema: {
        id: { type: 'string', description: 'Board ID' },
        name: { type: 'string', description: 'Board name' },
        desc: { type: 'string', description: 'Description' },
        url: { type: 'string', description: 'Board URL' },
        closed: { type: 'boolean', description: 'Closed status' },
        lists: { type: 'array', description: 'Board lists' },
        members: { type: 'array', description: 'Board members' }
      }
    },
    {
      id: 'get_boards',
      name: 'Get Boards',
      description: 'Get all boards for the authenticated user',
      category: 'Boards',
      icon: 'layout',
      api: {
        endpoint: '/members/me/boards',
        method: 'GET',
        baseUrl: 'https://api.trello.com/1',
        headers: { 'Content-Type': 'application/json' }
      },
      inputSchema: {
        filter: {
          type: 'select',
          required: false,
          label: 'Filter',
          default: 'open',
          options: [
            { label: 'All', value: 'all' },
            { label: 'Open', value: 'open' },
            { label: 'Closed', value: 'closed' },
            { label: 'Starred', value: 'starred' }
          ],
          description: 'Filter boards by status'
        },
        fields: {
          type: 'string',
          required: false,
          label: 'Fields',
          placeholder: 'name,desc,url,closed',
          default: 'name,desc,url,closed,dateLastActivity',
          description: 'Comma-separated list of fields to return'
        }
      },
      outputSchema: {
        boards: {
          type: 'array',
          description: 'Array of boards',
          properties: {
            id: { type: 'string' },
            name: { type: 'string' },
            desc: { type: 'string' },
            url: { type: 'string' },
            closed: { type: 'boolean' }
          }
        }
      }
    },
    {
      id: 'delete_board',
      name: 'Delete Board',
      description: 'Permanently delete a board',
      category: 'Boards',
      icon: 'trash-2',
      api: {
        endpoint: '/boards/{boardId}',
        method: 'DELETE',
        baseUrl: 'https://api.trello.com/1',
        headers: { 'Content-Type': 'application/json' }
      },
      inputSchema: {
        boardId: {
          type: 'string',
          required: true,
          label: 'Board ID',
          placeholder: 'Enter the board ID',
          description: 'The ID of the board to delete (permanent action)'
        }
      },
      outputSchema: {
        success: { type: 'boolean', description: 'Whether deletion was successful' }
      }
    },

    // ==========================================
    // LIST ACTIONS
    // ==========================================
    {
      id: 'create_list',
      name: 'Create List',
      description: 'Create a new list on a board',
      category: 'Lists',
      icon: 'list',
      api: {
        endpoint: '/lists',
        method: 'POST',
        baseUrl: 'https://api.trello.com/1',
        headers: { 'Content-Type': 'application/json' },
        paramMapping: {
          name: 'name',
          boardId: 'idBoard',
          pos: 'pos'
        }
      },
      inputSchema: {
        boardId: {
          type: 'string',
          required: true,
          label: 'Board ID',
          placeholder: 'Enter the board ID',
          description: 'The ID of the board to create the list on'
        },
        name: {
          type: 'string',
          required: true,
          label: 'List Name',
          placeholder: 'Enter list name',
          description: 'Name for the list'
        },
        pos: {
          type: 'select',
          required: false,
          label: 'Position',
          default: 'bottom',
          options: [
            { label: 'Top', value: 'top' },
            { label: 'Bottom', value: 'bottom' }
          ],
          description: 'Position of the list on the board'
        }
      },
      outputSchema: {
        id: { type: 'string', description: 'List ID' },
        name: { type: 'string', description: 'List name' },
        boardId: { type: 'string', description: 'Board ID' }
      }
    },
    {
      id: 'update_list',
      name: 'Update List',
      description: 'Update a list\'s name, position, or status',
      category: 'Lists',
      icon: 'edit',
      api: {
        endpoint: '/lists/{listId}',
        method: 'PUT',
        baseUrl: 'https://api.trello.com/1',
        headers: { 'Content-Type': 'application/json' },
        paramMapping: {
          name: 'name',
          closed: 'closed',
          pos: 'pos',
          idBoard: 'idBoard'
        }
      },
      inputSchema: {
        listId: {
          type: 'string',
          required: true,
          label: 'List ID',
          placeholder: 'Enter the list ID',
          description: 'The ID of the list to update'
        },
        name: {
          type: 'string',
          required: false,
          label: 'List Name',
          placeholder: 'Enter new list name',
          description: 'New name for the list'
        },
        closed: {
          type: 'boolean',
          required: false,
          label: 'Archived',
          description: 'Set to true to archive the list'
        },
        pos: {
          type: 'string',
          required: false,
          label: 'Position',
          placeholder: 'top, bottom, or number',
          description: 'New position for the list'
        },
        idBoard: {
          type: 'string',
          required: false,
          label: 'Board ID',
          placeholder: 'Enter board ID to move list',
          description: 'Move list to a different board'
        }
      },
      outputSchema: {
        id: { type: 'string', description: 'List ID' },
        name: { type: 'string', description: 'Updated name' },
        closed: { type: 'boolean', description: 'Archived status' }
      }
    },
    {
      id: 'archive_list',
      name: 'Archive List',
      description: 'Archive (close) a list',
      category: 'Lists',
      icon: 'archive',
      api: {
        endpoint: '/lists/{listId}/closed',
        method: 'PUT',
        baseUrl: 'https://api.trello.com/1',
        headers: { 'Content-Type': 'application/json' },
        paramMapping: {
          value: 'value'
        }
      },
      inputSchema: {
        listId: {
          type: 'string',
          required: true,
          label: 'List ID',
          placeholder: 'Enter the list ID',
          description: 'The ID of the list to archive'
        },
        value: {
          type: 'boolean',
          required: false,
          label: 'Archive',
          default: true,
          description: 'Set to true to archive, false to unarchive'
        }
      },
      outputSchema: {
        id: { type: 'string', description: 'List ID' },
        closed: { type: 'boolean', description: 'Archived status' }
      }
    },
    {
      id: 'get_lists',
      name: 'Get Lists',
      description: 'Get all lists on a board',
      category: 'Lists',
      icon: 'list',
      api: {
        endpoint: '/boards/{boardId}/lists',
        method: 'GET',
        baseUrl: 'https://api.trello.com/1',
        headers: { 'Content-Type': 'application/json' }
      },
      inputSchema: {
        boardId: {
          type: 'string',
          required: true,
          label: 'Board ID',
          placeholder: 'Enter the board ID',
          description: 'The ID of the board'
        },
        filter: {
          type: 'select',
          required: false,
          label: 'Filter',
          default: 'open',
          options: [
            { label: 'All', value: 'all' },
            { label: 'Open', value: 'open' },
            { label: 'Closed', value: 'closed' }
          ],
          description: 'Filter lists by status'
        }
      },
      outputSchema: {
        lists: {
          type: 'array',
          description: 'Array of lists',
          properties: {
            id: { type: 'string' },
            name: { type: 'string' },
            closed: { type: 'boolean' },
            pos: { type: 'number' }
          }
        }
      }
    },
    {
      id: 'move_all_cards',
      name: 'Move All Cards',
      description: 'Move all cards from one list to another',
      category: 'Lists',
      icon: 'move',
      api: {
        endpoint: '/lists/{listId}/moveAllCards',
        method: 'POST',
        baseUrl: 'https://api.trello.com/1',
        headers: { 'Content-Type': 'application/json' },
        paramMapping: {
          idBoard: 'idBoard',
          idList: 'idList'
        }
      },
      inputSchema: {
        listId: {
          type: 'string',
          required: true,
          label: 'Source List ID',
          placeholder: 'Enter the source list ID',
          description: 'The ID of the list to move cards from'
        },
        idBoard: {
          type: 'string',
          required: true,
          label: 'Destination Board ID',
          placeholder: 'Enter the destination board ID',
          description: 'The ID of the board to move cards to'
        },
        idList: {
          type: 'string',
          required: true,
          label: 'Destination List ID',
          placeholder: 'Enter the destination list ID',
          description: 'The ID of the list to move cards to'
        }
      },
      outputSchema: {
        success: { type: 'boolean', description: 'Whether move was successful' }
      }
    },
    {
      id: 'archive_all_cards',
      name: 'Archive All Cards',
      description: 'Archive all cards in a list',
      category: 'Lists',
      icon: 'archive',
      api: {
        endpoint: '/lists/{listId}/archiveAllCards',
        method: 'POST',
        baseUrl: 'https://api.trello.com/1',
        headers: { 'Content-Type': 'application/json' }
      },
      inputSchema: {
        listId: {
          type: 'string',
          required: true,
          label: 'List ID',
          placeholder: 'Enter the list ID',
          description: 'The ID of the list to archive all cards from'
        }
      },
      outputSchema: {
        success: { type: 'boolean', description: 'Whether archiving was successful' }
      }
    },

    // ==========================================
    // MEMBER ACTIONS
    // ==========================================
    {
      id: 'get_member',
      name: 'Get Member',
      description: 'Get details of a member',
      category: 'Members',
      icon: 'user',
      api: {
        endpoint: '/members/{memberId}',
        method: 'GET',
        baseUrl: 'https://api.trello.com/1',
        headers: { 'Content-Type': 'application/json' }
      },
      inputSchema: {
        memberId: {
          type: 'string',
          required: true,
          label: 'Member ID',
          placeholder: 'Enter member ID or "me"',
          default: 'me',
          description: 'The ID of the member (use "me" for current user)'
        },
        fields: {
          type: 'string',
          required: false,
          label: 'Fields',
          placeholder: 'fullName,username,email,avatarUrl',
          default: 'fullName,username,email,avatarUrl',
          description: 'Comma-separated list of fields to return'
        }
      },
      outputSchema: {
        id: { type: 'string', description: 'Member ID' },
        fullName: { type: 'string', description: 'Full name' },
        username: { type: 'string', description: 'Username' },
        email: { type: 'string', description: 'Email' },
        avatarUrl: { type: 'string', description: 'Avatar URL' }
      }
    },
    {
      id: 'get_board_members',
      name: 'Get Board Members',
      description: 'Get all members of a board',
      category: 'Members',
      icon: 'users',
      api: {
        endpoint: '/boards/{boardId}/members',
        method: 'GET',
        baseUrl: 'https://api.trello.com/1',
        headers: { 'Content-Type': 'application/json' }
      },
      inputSchema: {
        boardId: {
          type: 'string',
          required: true,
          label: 'Board ID',
          placeholder: 'Enter the board ID',
          description: 'The ID of the board'
        }
      },
      outputSchema: {
        members: {
          type: 'array',
          description: 'Array of members',
          properties: {
            id: { type: 'string' },
            fullName: { type: 'string' },
            username: { type: 'string' }
          }
        }
      }
    },
    {
      id: 'add_member_to_board',
      name: 'Add Member to Board',
      description: 'Add a member to a board',
      category: 'Members',
      icon: 'user-plus',
      api: {
        endpoint: '/boards/{boardId}/members/{memberId}',
        method: 'PUT',
        baseUrl: 'https://api.trello.com/1',
        headers: { 'Content-Type': 'application/json' },
        paramMapping: {
          type: 'type'
        }
      },
      inputSchema: {
        boardId: {
          type: 'string',
          required: true,
          label: 'Board ID',
          placeholder: 'Enter the board ID',
          description: 'The ID of the board'
        },
        memberId: {
          type: 'string',
          required: true,
          label: 'Member ID',
          placeholder: 'Enter the member ID',
          description: 'The ID of the member to add'
        },
        type: {
          type: 'select',
          required: false,
          label: 'Member Type',
          default: 'normal',
          options: [
            { label: 'Normal', value: 'normal' },
            { label: 'Admin', value: 'admin' },
            { label: 'Observer', value: 'observer' }
          ],
          description: 'The type/role of the member'
        }
      },
      outputSchema: {
        success: { type: 'boolean', description: 'Whether member was added' }
      }
    },
    {
      id: 'remove_member_from_board',
      name: 'Remove Member from Board',
      description: 'Remove a member from a board',
      category: 'Members',
      icon: 'user-minus',
      api: {
        endpoint: '/boards/{boardId}/members/{memberId}',
        method: 'DELETE',
        baseUrl: 'https://api.trello.com/1',
        headers: { 'Content-Type': 'application/json' }
      },
      inputSchema: {
        boardId: {
          type: 'string',
          required: true,
          label: 'Board ID',
          placeholder: 'Enter the board ID',
          description: 'The ID of the board'
        },
        memberId: {
          type: 'string',
          required: true,
          label: 'Member ID',
          placeholder: 'Enter the member ID',
          description: 'The ID of the member to remove'
        }
      },
      outputSchema: {
        success: { type: 'boolean', description: 'Whether member was removed' }
      }
    },

    // ==========================================
    // SEARCH ACTION
    // ==========================================
    {
      id: 'search',
      name: 'Search',
      description: 'Search for cards, boards, members, or organizations',
      category: 'Search',
      icon: 'search',
      api: {
        endpoint: '/search',
        method: 'GET',
        baseUrl: 'https://api.trello.com/1',
        headers: { 'Content-Type': 'application/json' }
      },
      inputSchema: {
        query: {
          type: 'string',
          required: true,
          label: 'Search Query',
          placeholder: 'Enter search terms',
          description: 'The search query'
        },
        modelTypes: {
          type: 'string',
          required: false,
          label: 'Model Types',
          placeholder: 'cards,boards',
          default: 'cards,boards',
          description: 'Comma-separated types to search (cards, boards, organizations, members)'
        },
        idBoards: {
          type: 'string',
          required: false,
          label: 'Board IDs',
          placeholder: 'board1,board2',
          description: 'Comma-separated board IDs to limit search scope'
        },
        cards_limit: {
          type: 'number',
          required: false,
          label: 'Cards Limit',
          default: 10,
          min: 1,
          max: 1000,
          description: 'Maximum number of cards to return'
        },
        boards_limit: {
          type: 'number',
          required: false,
          label: 'Boards Limit',
          default: 10,
          min: 1,
          max: 1000,
          description: 'Maximum number of boards to return'
        },
        partial: {
          type: 'boolean',
          required: false,
          label: 'Partial Match',
          default: true,
          description: 'Enable partial matching of search query'
        }
      },
      outputSchema: {
        cards: { type: 'array', description: 'Matching cards' },
        boards: { type: 'array', description: 'Matching boards' },
        members: { type: 'array', description: 'Matching members' },
        organizations: { type: 'array', description: 'Matching organizations' }
      }
    }
  ],

  // ============================================
  // SUPPORTED TRIGGERS
  // ============================================
  supported_triggers: [
    {
      id: 'card_created',
      name: 'Card Created',
      description: 'Triggers when a new card is created on a board',
      eventType: 'createCard',
      icon: 'plus-square',
      webhookRequired: true,
      inputSchema: {
        boardId: {
          type: 'string',
          required: true,
          label: 'Board ID',
          placeholder: 'Enter the board ID to watch',
          description: 'The board to monitor for new cards'
        }
      },
      outputSchema: {
        card: {
          type: 'object',
          description: 'The created card',
          properties: {
            id: { type: 'string' },
            name: { type: 'string' },
            desc: { type: 'string' },
            idList: { type: 'string' },
            url: { type: 'string' }
          }
        },
        list: {
          type: 'object',
          description: 'The list the card was created in',
          properties: {
            id: { type: 'string' },
            name: { type: 'string' }
          }
        },
        member: {
          type: 'object',
          description: 'The member who created the card',
          properties: {
            id: { type: 'string' },
            fullName: { type: 'string' },
            username: { type: 'string' }
          }
        }
      }
    },
    {
      id: 'card_updated',
      name: 'Card Updated',
      description: 'Triggers when a card is updated (name, description, due date, etc.)',
      eventType: 'updateCard',
      icon: 'edit',
      webhookRequired: true,
      inputSchema: {
        boardId: {
          type: 'string',
          required: true,
          label: 'Board ID',
          placeholder: 'Enter the board ID to watch',
          description: 'The board to monitor for card updates'
        }
      },
      outputSchema: {
        card: {
          type: 'object',
          description: 'The updated card',
          properties: {
            id: { type: 'string' },
            name: { type: 'string' },
            desc: { type: 'string' },
            due: { type: 'string' },
            closed: { type: 'boolean' }
          }
        },
        old: {
          type: 'object',
          description: 'Previous values of changed fields'
        },
        member: {
          type: 'object',
          description: 'The member who made the update'
        }
      }
    },
    {
      id: 'card_moved',
      name: 'Card Moved',
      description: 'Triggers when a card is moved to a different list',
      eventType: 'updateCard:idList',
      icon: 'move',
      webhookRequired: true,
      inputSchema: {
        boardId: {
          type: 'string',
          required: true,
          label: 'Board ID',
          placeholder: 'Enter the board ID to watch',
          description: 'The board to monitor for card moves'
        },
        listId: {
          type: 'string',
          required: false,
          label: 'Target List ID',
          placeholder: 'Enter list ID (optional)',
          description: 'Only trigger when moved to this specific list'
        }
      },
      outputSchema: {
        card: {
          type: 'object',
          description: 'The moved card',
          properties: {
            id: { type: 'string' },
            name: { type: 'string' }
          }
        },
        listBefore: {
          type: 'object',
          description: 'The previous list',
          properties: {
            id: { type: 'string' },
            name: { type: 'string' }
          }
        },
        listAfter: {
          type: 'object',
          description: 'The new list',
          properties: {
            id: { type: 'string' },
            name: { type: 'string' }
          }
        },
        member: {
          type: 'object',
          description: 'The member who moved the card'
        }
      }
    },
    {
      id: 'card_archived',
      name: 'Card Archived',
      description: 'Triggers when a card is archived (closed)',
      eventType: 'updateCard:closed',
      icon: 'archive',
      webhookRequired: true,
      inputSchema: {
        boardId: {
          type: 'string',
          required: true,
          label: 'Board ID',
          placeholder: 'Enter the board ID to watch',
          description: 'The board to monitor for archived cards'
        }
      },
      outputSchema: {
        card: {
          type: 'object',
          description: 'The archived card',
          properties: {
            id: { type: 'string' },
            name: { type: 'string' },
            closed: { type: 'boolean' }
          }
        },
        member: {
          type: 'object',
          description: 'The member who archived the card'
        }
      }
    },
    {
      id: 'comment_added',
      name: 'Comment Added',
      description: 'Triggers when a comment is added to a card',
      eventType: 'commentCard',
      icon: 'message-circle',
      webhookRequired: true,
      inputSchema: {
        boardId: {
          type: 'string',
          required: true,
          label: 'Board ID',
          placeholder: 'Enter the board ID to watch',
          description: 'The board to monitor for new comments'
        }
      },
      outputSchema: {
        comment: {
          type: 'object',
          description: 'The comment',
          properties: {
            id: { type: 'string' },
            text: { type: 'string' },
            date: { type: 'string' }
          }
        },
        card: {
          type: 'object',
          description: 'The card the comment was added to',
          properties: {
            id: { type: 'string' },
            name: { type: 'string' }
          }
        },
        member: {
          type: 'object',
          description: 'The member who added the comment'
        }
      }
    },
    {
      id: 'member_added_to_card',
      name: 'Member Added to Card',
      description: 'Triggers when a member is added to a card',
      eventType: 'addMemberToCard',
      icon: 'user-plus',
      webhookRequired: true,
      inputSchema: {
        boardId: {
          type: 'string',
          required: true,
          label: 'Board ID',
          placeholder: 'Enter the board ID to watch',
          description: 'The board to monitor'
        }
      },
      outputSchema: {
        card: {
          type: 'object',
          description: 'The card',
          properties: {
            id: { type: 'string' },
            name: { type: 'string' }
          }
        },
        memberAdded: {
          type: 'object',
          description: 'The member who was added',
          properties: {
            id: { type: 'string' },
            fullName: { type: 'string' },
            username: { type: 'string' }
          }
        },
        memberWhoAdded: {
          type: 'object',
          description: 'The member who performed the action'
        }
      }
    },
    {
      id: 'member_removed_from_card',
      name: 'Member Removed from Card',
      description: 'Triggers when a member is removed from a card',
      eventType: 'removeMemberFromCard',
      icon: 'user-minus',
      webhookRequired: true,
      inputSchema: {
        boardId: {
          type: 'string',
          required: true,
          label: 'Board ID',
          placeholder: 'Enter the board ID to watch',
          description: 'The board to monitor'
        }
      },
      outputSchema: {
        card: {
          type: 'object',
          description: 'The card',
          properties: {
            id: { type: 'string' },
            name: { type: 'string' }
          }
        },
        memberRemoved: {
          type: 'object',
          description: 'The member who was removed'
        },
        memberWhoRemoved: {
          type: 'object',
          description: 'The member who performed the action'
        }
      }
    },
    {
      id: 'label_added_to_card',
      name: 'Label Added to Card',
      description: 'Triggers when a label is added to a card',
      eventType: 'addLabelToCard',
      icon: 'tag',
      webhookRequired: true,
      inputSchema: {
        boardId: {
          type: 'string',
          required: true,
          label: 'Board ID',
          placeholder: 'Enter the board ID to watch',
          description: 'The board to monitor'
        },
        labelId: {
          type: 'string',
          required: false,
          label: 'Label ID',
          placeholder: 'Enter specific label ID (optional)',
          description: 'Only trigger for this specific label'
        }
      },
      outputSchema: {
        card: {
          type: 'object',
          description: 'The card',
          properties: {
            id: { type: 'string' },
            name: { type: 'string' }
          }
        },
        label: {
          type: 'object',
          description: 'The label that was added',
          properties: {
            id: { type: 'string' },
            name: { type: 'string' },
            color: { type: 'string' }
          }
        },
        member: {
          type: 'object',
          description: 'The member who added the label'
        }
      }
    },
    {
      id: 'checklist_completed',
      name: 'Checklist Completed',
      description: 'Triggers when all items in a checklist are completed',
      eventType: 'updateCheckItemStateOnCard',
      icon: 'check-square',
      webhookRequired: true,
      inputSchema: {
        boardId: {
          type: 'string',
          required: true,
          label: 'Board ID',
          placeholder: 'Enter the board ID to watch',
          description: 'The board to monitor'
        }
      },
      outputSchema: {
        card: {
          type: 'object',
          description: 'The card',
          properties: {
            id: { type: 'string' },
            name: { type: 'string' }
          }
        },
        checklist: {
          type: 'object',
          description: 'The completed checklist',
          properties: {
            id: { type: 'string' },
            name: { type: 'string' }
          }
        },
        checkItem: {
          type: 'object',
          description: 'The last completed item',
          properties: {
            id: { type: 'string' },
            name: { type: 'string' },
            state: { type: 'string' }
          }
        }
      }
    },
    {
      id: 'due_date_approaching',
      name: 'Due Date Approaching',
      description: 'Triggers when a card\'s due date is approaching',
      eventType: 'poll:due_date',
      icon: 'clock',
      webhookRequired: false,
      pollingEnabled: true,
      inputSchema: {
        boardId: {
          type: 'string',
          required: true,
          label: 'Board ID',
          placeholder: 'Enter the board ID to watch',
          description: 'The board to monitor'
        },
        hoursBeforeDue: {
          type: 'number',
          required: false,
          label: 'Hours Before Due',
          default: 24,
          min: 1,
          max: 168,
          description: 'Trigger this many hours before due date'
        }
      },
      outputSchema: {
        card: {
          type: 'object',
          description: 'The card with approaching due date',
          properties: {
            id: { type: 'string' },
            name: { type: 'string' },
            due: { type: 'string' },
            dueComplete: { type: 'boolean' }
          }
        },
        hoursUntilDue: {
          type: 'number',
          description: 'Hours remaining until due date'
        }
      }
    },
    {
      id: 'attachment_added',
      name: 'Attachment Added',
      description: 'Triggers when an attachment is added to a card',
      eventType: 'addAttachmentToCard',
      icon: 'paperclip',
      webhookRequired: true,
      inputSchema: {
        boardId: {
          type: 'string',
          required: true,
          label: 'Board ID',
          placeholder: 'Enter the board ID to watch',
          description: 'The board to monitor'
        }
      },
      outputSchema: {
        card: {
          type: 'object',
          description: 'The card',
          properties: {
            id: { type: 'string' },
            name: { type: 'string' }
          }
        },
        attachment: {
          type: 'object',
          description: 'The attachment that was added',
          properties: {
            id: { type: 'string' },
            name: { type: 'string' },
            url: { type: 'string' },
            mimeType: { type: 'string' }
          }
        },
        member: {
          type: 'object',
          description: 'The member who added the attachment'
        }
      }
    },
    {
      id: 'list_created',
      name: 'List Created',
      description: 'Triggers when a new list is created on a board',
      eventType: 'createList',
      icon: 'list',
      webhookRequired: true,
      inputSchema: {
        boardId: {
          type: 'string',
          required: true,
          label: 'Board ID',
          placeholder: 'Enter the board ID to watch',
          description: 'The board to monitor'
        }
      },
      outputSchema: {
        list: {
          type: 'object',
          description: 'The created list',
          properties: {
            id: { type: 'string' },
            name: { type: 'string' },
            idBoard: { type: 'string' }
          }
        },
        member: {
          type: 'object',
          description: 'The member who created the list'
        }
      }
    },
    {
      id: 'board_updated',
      name: 'Board Updated',
      description: 'Triggers when a board is updated',
      eventType: 'updateBoard',
      icon: 'layout',
      webhookRequired: true,
      inputSchema: {
        boardId: {
          type: 'string',
          required: true,
          label: 'Board ID',
          placeholder: 'Enter the board ID to watch',
          description: 'The board to monitor'
        }
      },
      outputSchema: {
        board: {
          type: 'object',
          description: 'The updated board',
          properties: {
            id: { type: 'string' },
            name: { type: 'string' },
            desc: { type: 'string' },
            closed: { type: 'boolean' }
          }
        },
        old: {
          type: 'object',
          description: 'Previous values of changed fields'
        },
        member: {
          type: 'object',
          description: 'The member who made the update'
        }
      }
    }
  ]
};
