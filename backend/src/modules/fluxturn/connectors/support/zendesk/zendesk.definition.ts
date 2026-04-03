// Zendesk Connector Definition
// Complete implementation matching n8n Zendesk node

import { ConnectorDefinition } from '../../shared';

export const ZENDESK_CONNECTOR: ConnectorDefinition = {
  name: 'zendesk',
  display_name: 'Zendesk',
  category: 'support',
  description: 'Customer support ticketing system - manage tickets, users, organizations, and ticket fields',
  auth_type: 'api_key',
  auth_fields: [
    {
      key: 'subdomain',
      label: 'Subdomain',
      type: 'string',
      required: true,
      placeholder: 'your-company',
      description: 'Your Zendesk subdomain (e.g., "your-company" from your-company.zendesk.com)'
    },
    {
      key: 'email',
      label: 'Email',
      type: 'string',
      required: true,
      placeholder: 'your-email@company.com',
      description: 'Your Zendesk account email'
    },
    {
      key: 'api_token',
      label: 'API Token',
      type: 'password',
      required: true,
      placeholder: 'Your Zendesk API Token',
      description: 'Generate from Admin > Channels > API',
      helpUrl: 'https://support.zendesk.com/hc/en-us/articles/4408889192858'
    }
  ],
  endpoints: {
    tickets: '/api/v2/tickets',
    users: '/api/v2/users',
    organizations: '/api/v2/organizations',
    ticket_fields: '/api/v2/ticket_fields'
  },
  webhook_support: true,
  rate_limits: { requests_per_minute: 700 },
  sandbox_available: true,

  supported_actions: [
    // TICKET ACTIONS
    {
      id: 'ticket_create',
      name: 'Create Ticket',
      description: 'Create a new support ticket',
      category: 'Tickets',
      inputSchema: {
        description: {
          type: 'string',
          required: true,
          label: 'Description',
          description: 'The first comment on the ticket',
          aiControlled: true,
          aiDescription: 'Detailed description of the support ticket issue'
        },
        subject: {
          type: 'string',
          label: 'Subject',
          description: 'The value of the subject field for this ticket',
          aiControlled: true,
          aiDescription: 'Brief summary/subject line for the ticket'
        },
        status: {
          type: 'select',
          label: 'Status',
          options: [
            { label: 'New', value: 'new' },
            { label: 'Open', value: 'open' },
            { label: 'Pending', value: 'pending' },
            { label: 'On-Hold', value: 'hold' },
            { label: 'Solved', value: 'solved' },
            { label: 'Closed', value: 'closed' }
          ]
        },
        type: {
          type: 'select',
          label: 'Type',
          options: [
            { label: 'Question', value: 'question' },
            { label: 'Incident', value: 'incident' },
            { label: 'Problem', value: 'problem' },
            { label: 'Task', value: 'task' }
          ]
        },
        priority: {
          type: 'select',
          label: 'Priority',
          options: [
            { label: 'Low', value: 'low' },
            { label: 'Normal', value: 'normal' },
            { label: 'High', value: 'high' },
            { label: 'Urgent', value: 'urgent' }
          ]
        },
        group_id: {
          type: 'number',
          label: 'Group ID',
          description: 'The group this ticket is assigned to'
        },
        external_id: {
          type: 'string',
          label: 'External ID',
          description: 'An ID to link Zendesk Support tickets to local records'
        },
        tags: {
          type: 'array',
          label: 'Tags',
          description: 'The array of tags applied to this ticket',
          aiControlled: true,
          aiDescription: 'Tags to categorize the ticket'
        },
        custom_fields: {
          type: 'array',
          label: 'Custom Fields',
          description: 'Custom field values',
          aiControlled: false
        }
      }
    },
    {
      id: 'ticket_update',
      name: 'Update Ticket',
      description: 'Update an existing ticket',
      category: 'Tickets',
      inputSchema: {
        id: {
          type: 'string',
          required: true,
          label: 'Ticket ID',
          description: 'Ticket ID'
        },
        subject: { type: 'string', label: 'Subject' },
        status: {
          type: 'select',
          label: 'Status',
          options: [
            { label: 'New', value: 'new' },
            { label: 'Open', value: 'open' },
            { label: 'Pending', value: 'pending' },
            { label: 'On-Hold', value: 'hold' },
            { label: 'Solved', value: 'solved' },
            { label: 'Closed', value: 'closed' }
          ]
        },
        type: {
          type: 'select',
          label: 'Type',
          options: [
            { label: 'Question', value: 'question' },
            { label: 'Incident', value: 'incident' },
            { label: 'Problem', value: 'problem' },
            { label: 'Task', value: 'task' }
          ]
        },
        priority: {
          type: 'select',
          label: 'Priority',
          options: [
            { label: 'Low', value: 'low' },
            { label: 'Normal', value: 'normal' },
            { label: 'High', value: 'high' },
            { label: 'Urgent', value: 'urgent' }
          ]
        },
        assignee_email: {
          type: 'string',
          label: 'Assignee Email',
          description: 'The email address of the assignee'
        },
        group_id: {
          type: 'number',
          label: 'Group ID'
        },
        tags: {
          type: 'array',
          label: 'Tags'
        },
        custom_fields: {
          type: 'array',
          label: 'Custom Fields'
        },
        public_reply: {
          type: 'string',
          label: 'Public Reply',
          inputType: 'textarea',
          description: 'Public ticket reply',
          aiControlled: true,
          aiDescription: 'Public reply message visible to the customer'
        },
        internal_note: {
          type: 'string',
          label: 'Internal Note',
          inputType: 'textarea',
          description: 'Internal ticket note (accepts HTML)',
          aiControlled: true,
          aiDescription: 'Internal note for support agents only'
        }
      }
    },
    {
      id: 'ticket_get',
      name: 'Get Ticket',
      description: 'Get a ticket by ID',
      category: 'Tickets',
      inputSchema: {
        id: {
          type: 'string',
          required: true,
          label: 'Ticket ID',
          description: 'Ticket ID'
        },
        ticket_type: {
          type: 'select',
          label: 'Ticket Type',
          default: 'regular',
          options: [
            { label: 'Regular', value: 'regular' },
            { label: 'Suspended', value: 'suspended' }
          ]
        }
      }
    },
    {
      id: 'ticket_get_all',
      name: 'Get Many Tickets',
      description: 'Get many tickets',
      category: 'Tickets',
      inputSchema: {
        return_all: {
          type: 'boolean',
          label: 'Return All',
          default: false,
          description: 'Whether to return all results or only up to a limit'
        },
        limit: {
          type: 'number',
          label: 'Limit',
          default: 100,
          min: 1,
          max: 100,
          description: 'Max number of results to return'
        },
        ticket_type: {
          type: 'select',
          label: 'Ticket Type',
          default: 'regular',
          options: [
            { label: 'Regular', value: 'regular' },
            { label: 'Suspended', value: 'suspended' }
          ]
        },
        query: {
          type: 'string',
          label: 'Query',
          description: 'Query syntax to search tickets'
        },
        status: {
          type: 'select',
          label: 'Status',
          options: [
            { label: 'New', value: 'new' },
            { label: 'Open', value: 'open' },
            { label: 'Pending', value: 'pending' },
            { label: 'On-Hold', value: 'hold' },
            { label: 'Solved', value: 'solved' },
            { label: 'Closed', value: 'closed' }
          ]
        },
        group_id: {
          type: 'number',
          label: 'Group ID'
        },
        sort_by: {
          type: 'select',
          label: 'Sort By',
          options: [
            { label: 'Created At', value: 'created_at' },
            { label: 'Updated At', value: 'updated_at' },
            { label: 'Priority', value: 'priority' },
            { label: 'Status', value: 'status' },
            { label: 'Ticket Type', value: 'ticket_type' }
          ]
        },
        sort_order: {
          type: 'select',
          label: 'Sort Order',
          options: [
            { label: 'Ascending', value: 'asc' },
            { label: 'Descending', value: 'desc' }
          ]
        }
      }
    },
    {
      id: 'ticket_delete',
      name: 'Delete Ticket',
      description: 'Delete a ticket',
      category: 'Tickets',
      inputSchema: {
        id: {
          type: 'string',
          required: true,
          label: 'Ticket ID',
          description: 'Ticket ID'
        },
        ticket_type: {
          type: 'select',
          label: 'Ticket Type',
          default: 'regular',
          options: [
            { label: 'Regular', value: 'regular' },
            { label: 'Suspended', value: 'suspended' }
          ]
        }
      }
    },
    {
      id: 'ticket_recover',
      name: 'Recover Ticket',
      description: 'Recover a suspended ticket',
      category: 'Tickets',
      inputSchema: {
        id: {
          type: 'string',
          required: true,
          label: 'Suspended Ticket ID',
          description: 'ID of the suspended ticket to recover'
        }
      }
    },

    // USER ACTIONS
    {
      id: 'user_create',
      name: 'Create User',
      description: 'Create a new user',
      category: 'Users',
      inputSchema: {
        name: {
          type: 'string',
          required: true,
          label: 'Name',
          description: 'The user\'s name',
          aiControlled: true,
          aiDescription: 'Full name of the user'
        },
        email: {
          type: 'string',
          label: 'Email',
          description: 'The user\'s primary email address',
          aiControlled: true,
          aiDescription: 'Email address for the user'
        },
        role: {
          type: 'select',
          label: 'Role',
          options: [
            { label: 'End User', value: 'end-user' },
            { label: 'Agent', value: 'agent' },
            { label: 'Admin', value: 'admin' }
          ],
          aiControlled: false
        },
        organization_id: {
          type: 'number',
          label: 'Organization ID',
          description: 'The ID of the user\'s organization',
          aiControlled: false
        },
        phone: {
          type: 'string',
          label: 'Phone',
          description: 'The user\'s primary phone number',
          aiControlled: true,
          aiDescription: 'Phone number for the user'
        },
        details: {
          type: 'string',
          label: 'Details',
          description: 'Details about the user',
          aiControlled: true,
          aiDescription: 'Additional details about the user'
        },
        notes: {
          type: 'string',
          label: 'Notes',
          description: 'Notes about the user',
          aiControlled: true,
          aiDescription: 'Notes about the user for internal reference'
        },
        tags: {
          type: 'array',
          label: 'Tags',
          aiControlled: true,
          aiDescription: 'Tags to categorize the user'
        },
        external_id: {
          type: 'string',
          label: 'External ID',
          description: 'A unique identifier from another system'
        },
        verified: {
          type: 'boolean',
          label: 'Verified',
          description: 'Whether the user\'s primary identity is verified'
        },
        user_fields: {
          type: 'object',
          label: 'User Fields',
          description: 'Values of custom fields in the user\'s profile'
        }
      }
    },
    {
      id: 'user_update',
      name: 'Update User',
      description: 'Update a user',
      category: 'Users',
      inputSchema: {
        id: {
          type: 'string',
          required: true,
          label: 'User ID',
          description: 'User ID'
        },
        name: { type: 'string', label: 'Name' },
        email: { type: 'string', label: 'Email' },
        role: {
          type: 'select',
          label: 'Role',
          options: [
            { label: 'End User', value: 'end-user' },
            { label: 'Agent', value: 'agent' },
            { label: 'Admin', value: 'admin' }
          ]
        },
        organization_id: { type: 'number', label: 'Organization ID' },
        phone: { type: 'string', label: 'Phone' },
        details: { type: 'string', label: 'Details' },
        notes: { type: 'string', label: 'Notes' },
        tags: { type: 'array', label: 'Tags' },
        verified: { type: 'boolean', label: 'Verified' },
        user_fields: { type: 'object', label: 'User Fields' }
      }
    },
    {
      id: 'user_get',
      name: 'Get User',
      description: 'Get a user by ID',
      category: 'Users',
      inputSchema: {
        id: {
          type: 'string',
          required: true,
          label: 'User ID',
          description: 'User ID'
        }
      }
    },
    {
      id: 'user_get_all',
      name: 'Get Many Users',
      description: 'Get many users',
      category: 'Users',
      inputSchema: {
        return_all: {
          type: 'boolean',
          label: 'Return All',
          default: false
        },
        limit: {
          type: 'number',
          label: 'Limit',
          default: 100,
          min: 1,
          max: 100
        },
        role: {
          type: 'array',
          label: 'Roles',
          description: 'Filter by roles'
        }
      }
    },
    {
      id: 'user_search',
      name: 'Search Users',
      description: 'Search users',
      category: 'Users',
      inputSchema: {
        return_all: {
          type: 'boolean',
          label: 'Return All',
          default: false
        },
        limit: {
          type: 'number',
          label: 'Limit',
          default: 100,
          min: 1,
          max: 100
        },
        query: {
          type: 'string',
          label: 'Query',
          description: 'Search query'
        },
        external_id: {
          type: 'string',
          label: 'External ID'
        }
      }
    },
    {
      id: 'user_delete',
      name: 'Delete User',
      description: 'Delete a user',
      category: 'Users',
      inputSchema: {
        id: {
          type: 'string',
          required: true,
          label: 'User ID',
          description: 'User ID'
        }
      }
    },
    {
      id: 'user_get_organizations',
      name: 'Get User Organizations',
      description: 'Get organizations for a user',
      category: 'Users',
      inputSchema: {
        id: {
          type: 'string',
          required: true,
          label: 'User ID',
          description: 'User ID'
        }
      }
    },
    {
      id: 'user_get_related_data',
      name: 'Get User Related Data',
      description: 'Get data related to a user',
      category: 'Users',
      inputSchema: {
        id: {
          type: 'string',
          required: true,
          label: 'User ID',
          description: 'User ID'
        }
      }
    },

    // ORGANIZATION ACTIONS
    {
      id: 'organization_create',
      name: 'Create Organization',
      description: 'Create a new organization',
      category: 'Organizations',
      inputSchema: {
        name: {
          type: 'string',
          required: true,
          label: 'Name',
          description: 'Organization name',
          aiControlled: true,
          aiDescription: 'Name of the organization'
        },
        details: {
          type: 'string',
          label: 'Details',
          description: 'Details about the organization',
          aiControlled: true,
          aiDescription: 'Additional details about the organization'
        },
        notes: {
          type: 'string',
          label: 'Notes',
          aiControlled: true,
          aiDescription: 'Internal notes about the organization'
        },
        domain_names: {
          type: 'string',
          label: 'Domain Names',
          description: 'Comma-separated domain names',
          aiControlled: false
        },
        tags: {
          type: 'array',
          label: 'Tags',
          aiControlled: true,
          aiDescription: 'Tags to categorize the organization'
        },
        organization_fields: {
          type: 'object',
          label: 'Organization Fields',
          description: 'Custom organization fields'
        }
      }
    },
    {
      id: 'organization_update',
      name: 'Update Organization',
      description: 'Update an organization',
      category: 'Organizations',
      inputSchema: {
        id: {
          type: 'string',
          required: true,
          label: 'Organization ID',
          description: 'Organization ID'
        },
        name: { type: 'string', label: 'Name' },
        details: { type: 'string', label: 'Details' },
        notes: { type: 'string', label: 'Notes' },
        domain_names: { type: 'string', label: 'Domain Names' },
        tags: { type: 'array', label: 'Tags' },
        organization_fields: { type: 'object', label: 'Organization Fields' }
      }
    },
    {
      id: 'organization_get',
      name: 'Get Organization',
      description: 'Get an organization by ID',
      category: 'Organizations',
      inputSchema: {
        id: {
          type: 'string',
          required: true,
          label: 'Organization ID',
          description: 'Organization ID'
        }
      }
    },
    {
      id: 'organization_get_all',
      name: 'Get Many Organizations',
      description: 'Get many organizations',
      category: 'Organizations',
      inputSchema: {
        return_all: {
          type: 'boolean',
          label: 'Return All',
          default: false
        },
        limit: {
          type: 'number',
          label: 'Limit',
          default: 100,
          min: 1,
          max: 100
        }
      }
    },
    {
      id: 'organization_delete',
      name: 'Delete Organization',
      description: 'Delete an organization',
      category: 'Organizations',
      inputSchema: {
        id: {
          type: 'string',
          required: true,
          label: 'Organization ID',
          description: 'Organization ID'
        }
      }
    },
    {
      id: 'organization_count',
      name: 'Count Organizations',
      description: 'Get count of organizations',
      category: 'Organizations',
      inputSchema: {}
    },
    {
      id: 'organization_get_related_data',
      name: 'Get Organization Related Data',
      description: 'Get data related to an organization',
      category: 'Organizations',
      inputSchema: {
        id: {
          type: 'string',
          required: true,
          label: 'Organization ID',
          description: 'Organization ID'
        }
      }
    },

    // TICKET FIELD ACTIONS
    {
      id: 'ticket_field_get',
      name: 'Get Ticket Field',
      description: 'Get a ticket field by ID',
      category: 'Ticket Fields',
      inputSchema: {
        ticket_field_id: {
          type: 'string',
          required: true,
          label: 'Ticket Field ID',
          description: 'Ticket field ID'
        }
      }
    },
    {
      id: 'ticket_field_get_all',
      name: 'Get Many Ticket Fields',
      description: 'Get many ticket fields',
      category: 'Ticket Fields',
      inputSchema: {
        return_all: {
          type: 'boolean',
          label: 'Return All',
          default: false
        },
        limit: {
          type: 'number',
          label: 'Limit',
          default: 100,
          min: 1,
          max: 100
        }
      }
    },

    // ADDITIONAL ACTIONS
    {
      id: 'add_comment',
      name: 'Add Comment',
      description: 'Add a comment to an existing ticket',
      category: 'Tickets',
      inputSchema: {
        ticket_id: {
          type: 'string',
          required: true,
          label: 'Ticket ID',
          description: 'ID of the ticket to add comment to'
        },
        comment: {
          type: 'string',
          required: true,
          label: 'Comment',
          inputType: 'textarea',
          description: 'Comment text to add',
          aiControlled: true,
          aiDescription: 'Comment or reply to add to the ticket'
        },
        public: {
          type: 'boolean',
          label: 'Public',
          default: true,
          description: 'Whether the comment is public (visible to requester) or internal'
        },
        author_id: {
          type: 'number',
          label: 'Author ID',
          description: 'ID of the author (defaults to authenticated user)'
        }
      }
    },
    {
      id: 'search_tickets',
      name: 'Search Tickets',
      description: 'Search tickets using Zendesk query syntax',
      category: 'Tickets',
      inputSchema: {
        query: {
          type: 'string',
          required: true,
          label: 'Search Query',
          description: 'Zendesk search query (e.g., "status:open priority:high")',
          aiControlled: true,
          aiDescription: 'Search query to find tickets'
        },
        sort_by: {
          type: 'select',
          label: 'Sort By',
          options: [
            { label: 'Created At', value: 'created_at' },
            { label: 'Updated At', value: 'updated_at' },
            { label: 'Priority', value: 'priority' },
            { label: 'Status', value: 'status' },
            { label: 'Ticket Type', value: 'ticket_type' }
          ]
        },
        sort_order: {
          type: 'select',
          label: 'Sort Order',
          options: [
            { label: 'Ascending', value: 'asc' },
            { label: 'Descending', value: 'desc' }
          ]
        }
      }
    },
    {
      id: 'get_knowledge_base',
      name: 'Get Knowledge Base Articles',
      description: 'Get or search knowledge base articles from Help Center',
      category: 'Knowledge Base',
      inputSchema: {
        query: {
          type: 'string',
          label: 'Search Query',
          description: 'Optional search query to filter articles',
          aiControlled: true,
          aiDescription: 'Search query to find relevant knowledge base articles'
        }
      }
    }
  ],

  supported_triggers: [
    {
      id: 'ticket_created',
      name: 'Ticket Created',
      description: 'Triggered when a new ticket is created',
      eventType: 'webhook',
      webhookRequired: true,
      outputSchema: {
        ticket: {
          type: 'object',
          properties: {
            id: { type: 'number', description: 'Ticket ID' },
            subject: { type: 'string', description: 'Ticket subject' },
            description: { type: 'string', description: 'Ticket description' },
            status: { type: 'string', description: 'Ticket status' },
            priority: { type: 'string', description: 'Ticket priority' },
            type: { type: 'string', description: 'Ticket type' },
            requester_id: { type: 'number', description: 'Requester user ID' },
            assignee_id: { type: 'number', description: 'Assignee user ID' },
            group_id: { type: 'number', description: 'Group ID' },
            created_at: { type: 'string', description: 'Creation timestamp' },
            updated_at: { type: 'string', description: 'Last update timestamp' }
          }
        }
      }
    },
    {
      id: 'ticket_updated',
      name: 'Ticket Updated',
      description: 'Triggered when a ticket is updated',
      eventType: 'webhook',
      webhookRequired: true,
      outputSchema: {
        ticket: {
          type: 'object',
          properties: {
            id: { type: 'number', description: 'Ticket ID' },
            subject: { type: 'string', description: 'Ticket subject' },
            status: { type: 'string', description: 'Ticket status' },
            priority: { type: 'string', description: 'Ticket priority' },
            updated_at: { type: 'string', description: 'Last update timestamp' }
          }
        }
      }
    },
    {
      id: 'ticket_solved',
      name: 'Ticket Solved',
      description: 'Triggered when a ticket status changes to solved',
      eventType: 'webhook',
      webhookRequired: true,
      outputSchema: {
        ticket: {
          type: 'object',
          properties: {
            id: { type: 'number', description: 'Ticket ID' },
            subject: { type: 'string', description: 'Ticket subject' },
            status: { type: 'string', description: 'Ticket status (solved)' },
            solved_at: { type: 'string', description: 'Solved timestamp' }
          }
        }
      }
    },
    {
      id: 'user_created',
      name: 'User Created',
      description: 'Triggered when a new user is created',
      eventType: 'webhook',
      webhookRequired: true,
      outputSchema: {
        user: {
          type: 'object',
          properties: {
            id: { type: 'number', description: 'User ID' },
            name: { type: 'string', description: 'User name' },
            email: { type: 'string', description: 'User email' },
            role: { type: 'string', description: 'User role' },
            created_at: { type: 'string', description: 'Creation timestamp' }
          }
        }
      }
    },
    {
      id: 'organization_created',
      name: 'Organization Created',
      description: 'Triggered when a new organization is created',
      eventType: 'webhook',
      webhookRequired: true,
      outputSchema: {
        organization: {
          type: 'object',
          properties: {
            id: { type: 'number', description: 'Organization ID' },
            name: { type: 'string', description: 'Organization name' },
            created_at: { type: 'string', description: 'Creation timestamp' }
          }
        }
      }
    }
  ]
};
