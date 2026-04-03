// Freshdesk Connector Definition
// Synced with freshdesk.connector.ts implementation

import { ConnectorDefinition } from '../../shared';

export const FRESHDESK_CONNECTOR: ConnectorDefinition = {
  name: 'freshdesk',
  display_name: 'Freshdesk',
  category: 'support',
  description: 'Freshdesk helpdesk and ticketing system for customer support management',
  auth_type: 'api_key',
  verified: false,

  auth_fields: [
    {
      key: 'domain',
      label: 'Freshdesk Domain',
      type: 'string',
      required: true,
      placeholder: 'your-company',
      description: 'Your Freshdesk subdomain (e.g., "your-company" from your-company.freshdesk.com)'
    },
    {
      key: 'api_key',
      label: 'API Key',
      type: 'password',
      required: true,
      placeholder: 'xxxxxx',
      description: 'API key from Freshdesk profile settings',
      helpUrl: 'https://support.freshdesk.com/support/solutions/articles/215517',
      helpText: 'How to find your API key'
    }
  ],

  endpoints: {
    base_url: 'https://{domain}.freshdesk.com/api/v2'
  },

  webhook_support: true,
  rate_limits: { requests_per_minute: 100 },
  sandbox_available: true,

  supported_actions: [
    {
      id: 'create_ticket',
      name: 'Create Ticket',
      description: 'Create a new support ticket',
      category: 'Tickets',
      icon: 'plus',
      inputSchema: {
        subject: {
          type: 'string',
          required: true,
          label: 'Subject',
          placeholder: 'Unable to login to account',
          description: 'Ticket subject line',
          aiControlled: true,
          aiDescription: 'The subject line of the support ticket'
        },
        description: {
          type: 'string',
          required: true,
          label: 'Description',
          inputType: 'textarea',
          description: 'Detailed description of the issue (HTML supported)',
          aiControlled: true,
          aiDescription: 'The detailed description of the support issue'
        },
        priority: {
          type: 'select',
          required: true,
          label: 'Priority',
          default: 1,
          options: [
            { label: 'Low', value: 1 },
            { label: 'Medium', value: 2 },
            { label: 'High', value: 3 },
            { label: 'Urgent', value: 4 }
          ],
          description: 'Ticket priority level',
          aiControlled: false
        },
        status: {
          type: 'select',
          required: true,
          label: 'Status',
          default: 2,
          options: [
            { label: 'Open', value: 2 },
            { label: 'Pending', value: 3 },
            { label: 'Resolved', value: 4 },
            { label: 'Closed', value: 5 }
          ],
          description: 'Ticket status',
          aiControlled: false
        },
        email: {
          type: 'string',
          required: false,
          label: 'Requester Email',
          placeholder: 'customer@example.com',
          description: 'Email of the person raising the ticket',
          aiControlled: false
        },
        name: {
          type: 'string',
          required: false,
          label: 'Requester Name',
          description: 'Name of the requester',
          aiControlled: false
        },
        tags: {
          type: 'array',
          required: false,
          label: 'Tags',
          description: 'Tags to categorize the ticket',
          aiControlled: false
        },
        custom_fields: {
          type: 'object',
          required: false,
          label: 'Custom Fields',
          description: 'Custom field values',
          aiControlled: false
        }
      },
      outputSchema: {
        id: { type: 'number', description: 'Created ticket ID' },
        subject: { type: 'string', description: 'Ticket subject' },
        status: { type: 'number', description: 'Ticket status' },
        priority: { type: 'number', description: 'Ticket priority' },
        created_at: { type: 'string', description: 'Creation timestamp' }
      }
    },
    {
      id: 'update_ticket',
      name: 'Update Ticket',
      description: 'Update an existing ticket',
      category: 'Tickets',
      icon: 'edit',
      inputSchema: {
        ticket_id: {
          type: 'string',
          required: true,
          label: 'Ticket ID',
          placeholder: '12345',
          description: 'ID of the ticket to update',
          aiControlled: false
        },
        priority: {
          type: 'select',
          required: false,
          label: 'Priority',
          options: [
            { label: 'Low', value: 1 },
            { label: 'Medium', value: 2 },
            { label: 'High', value: 3 },
            { label: 'Urgent', value: 4 }
          ],
          description: 'New priority level',
          aiControlled: false
        },
        status: {
          type: 'select',
          required: false,
          label: 'Status',
          options: [
            { label: 'Open', value: 2 },
            { label: 'Pending', value: 3 },
            { label: 'Resolved', value: 4 },
            { label: 'Closed', value: 5 }
          ],
          description: 'New status',
          aiControlled: false
        },
        tags: {
          type: 'array',
          required: false,
          label: 'Tags',
          description: 'Updated tags',
          aiControlled: false
        },
        custom_fields: {
          type: 'object',
          required: false,
          label: 'Custom Fields',
          description: 'Updated custom field values',
          aiControlled: false
        },
        responder_id: {
          type: 'number',
          required: false,
          label: 'Responder ID',
          description: 'Agent to assign the ticket to',
          aiControlled: false
        },
        group_id: {
          type: 'number',
          required: false,
          label: 'Group ID',
          description: 'Group to assign the ticket to',
          aiControlled: false
        }
      },
      outputSchema: {
        id: { type: 'number', description: 'Updated ticket ID' },
        status: { type: 'number', description: 'New status' },
        updated_at: { type: 'string', description: 'Update timestamp' }
      }
    },
    {
      id: 'get_tickets',
      name: 'Get Tickets',
      description: 'Retrieve tickets with filtering options',
      category: 'Tickets',
      icon: 'list',
      inputSchema: {
        page: {
          type: 'number',
          required: false,
          label: 'Page',
          default: 1,
          description: 'Page number for pagination',
          aiControlled: false
        },
        per_page: {
          type: 'number',
          required: false,
          label: 'Per Page',
          default: 30,
          description: 'Number of tickets per page (max 100)',
          aiControlled: false
        },
        order_by: {
          type: 'string',
          required: false,
          label: 'Order By',
          placeholder: 'created_at',
          description: 'Field to order results by',
          aiControlled: false
        },
        order_type: {
          type: 'select',
          required: false,
          label: 'Order Direction',
          default: 'desc',
          options: [
            { label: 'Ascending', value: 'asc' },
            { label: 'Descending', value: 'desc' }
          ],
          description: 'Sort order',
          aiControlled: false
        },
        updated_since: {
          type: 'string',
          required: false,
          label: 'Updated Since',
          description: 'Filter tickets updated after this date-time (ISO 8601)',
          aiControlled: false
        }
      },
      outputSchema: {
        tickets: { type: 'array', description: 'List of tickets' },
        has_more: { type: 'boolean', description: 'Whether more tickets are available' },
        page: { type: 'number', description: 'Current page number' }
      }
    },
    {
      id: 'search_tickets',
      name: 'Search Tickets',
      description: 'Search tickets using query string',
      category: 'Tickets',
      icon: 'search',
      inputSchema: {
        query: {
          type: 'string',
          required: true,
          label: 'Search Query',
          placeholder: 'status:2 AND priority:4',
          description: 'Freshdesk search query syntax',
          aiControlled: false
        },
        page: {
          type: 'number',
          required: false,
          label: 'Page',
          default: 1,
          description: 'Page number for pagination',
          aiControlled: false
        }
      },
      outputSchema: {
        results: { type: 'array', description: 'Search results' },
        total: { type: 'number', description: 'Total number of matches' }
      }
    },
    {
      id: 'delete_ticket',
      name: 'Delete Ticket',
      description: 'Delete a ticket from Freshdesk',
      category: 'Tickets',
      icon: 'trash-2',
      inputSchema: {
        ticket_id: {
          type: 'string',
          required: true,
          label: 'Ticket ID',
          placeholder: '12345',
          description: 'ID of the ticket to delete',
          aiControlled: false
        }
      },
      outputSchema: {
        deleted: { type: 'boolean', description: 'Whether the ticket was deleted' }
      }
    },
    {
      id: 'create_contact',
      name: 'Create Contact',
      description: 'Create a new contact in Freshdesk',
      category: 'Contacts',
      icon: 'user-plus',
      inputSchema: {
        name: {
          type: 'string',
          required: true,
          label: 'Name',
          placeholder: 'John Doe',
          description: 'Full name of the contact',
          aiControlled: true,
          aiDescription: 'The full name of the contact'
        },
        email: {
          type: 'string',
          required: false,
          label: 'Email',
          placeholder: 'john@example.com',
          description: 'Email address (required if phone not provided)',
          aiControlled: false
        },
        phone: {
          type: 'string',
          required: false,
          label: 'Phone',
          description: 'Phone number (required if email not provided)',
          aiControlled: false
        },
        mobile: {
          type: 'string',
          required: false,
          label: 'Mobile',
          description: 'Mobile phone number',
          aiControlled: false
        },
        twitter_id: {
          type: 'string',
          required: false,
          label: 'Twitter ID',
          description: 'Twitter handle',
          aiControlled: false
        },
        company_id: {
          type: 'number',
          required: false,
          label: 'Company ID',
          description: 'ID of the company this contact belongs to',
          aiControlled: false
        },
        custom_fields: {
          type: 'object',
          required: false,
          label: 'Custom Fields',
          description: 'Custom field values',
          aiControlled: false
        }
      },
      outputSchema: {
        id: { type: 'number', description: 'Created contact ID' },
        name: { type: 'string', description: 'Contact name' },
        email: { type: 'string', description: 'Contact email' },
        created_at: { type: 'string', description: 'Creation timestamp' }
      }
    },
    {
      id: 'get_contact',
      name: 'Get Contact',
      description: 'Get details of a specific contact',
      category: 'Contacts',
      icon: 'user',
      inputSchema: {
        contact_id: {
          type: 'string',
          required: true,
          label: 'Contact ID',
          placeholder: '12345',
          description: 'ID of the contact to retrieve',
          aiControlled: false
        }
      },
      outputSchema: {
        id: { type: 'number', description: 'Contact ID' },
        name: { type: 'string', description: 'Contact name' },
        email: { type: 'string', description: 'Contact email' },
        phone: { type: 'string', description: 'Contact phone' },
        company_id: { type: 'number', description: 'Associated company ID' }
      }
    },
    {
      id: 'update_contact',
      name: 'Update Contact',
      description: 'Update an existing contact',
      category: 'Contacts',
      icon: 'user-check',
      inputSchema: {
        contact_id: {
          type: 'string',
          required: true,
          label: 'Contact ID',
          placeholder: '12345',
          description: 'ID of the contact to update',
          aiControlled: false
        },
        name: {
          type: 'string',
          required: false,
          label: 'Name',
          description: 'Updated name',
          aiControlled: true,
          aiDescription: 'The updated name for the contact'
        },
        email: {
          type: 'string',
          required: false,
          label: 'Email',
          description: 'Updated email address',
          aiControlled: false
        },
        phone: {
          type: 'string',
          required: false,
          label: 'Phone',
          description: 'Updated phone number',
          aiControlled: false
        },
        mobile: {
          type: 'string',
          required: false,
          label: 'Mobile',
          description: 'Updated mobile number',
          aiControlled: false
        },
        custom_fields: {
          type: 'object',
          required: false,
          label: 'Custom Fields',
          description: 'Updated custom field values',
          aiControlled: false
        }
      },
      outputSchema: {
        id: { type: 'number', description: 'Updated contact ID' },
        updated_at: { type: 'string', description: 'Update timestamp' }
      }
    },
    {
      id: 'delete_contact',
      name: 'Delete Contact',
      description: 'Delete a contact from Freshdesk',
      category: 'Contacts',
      icon: 'user-minus',
      inputSchema: {
        contact_id: {
          type: 'string',
          required: true,
          label: 'Contact ID',
          placeholder: '12345',
          description: 'ID of the contact to delete',
          aiControlled: false
        }
      },
      outputSchema: {
        deleted: { type: 'boolean', description: 'Whether the contact was deleted' }
      }
    },
    {
      id: 'list_contacts',
      name: 'List Contacts',
      description: 'List all contacts with filtering options',
      category: 'Contacts',
      icon: 'users',
      inputSchema: {
        page: {
          type: 'number',
          required: false,
          label: 'Page',
          default: 1,
          description: 'Page number for pagination',
          aiControlled: false
        },
        per_page: {
          type: 'number',
          required: false,
          label: 'Per Page',
          default: 30,
          description: 'Number of contacts per page (max 100)',
          aiControlled: false
        },
        email: {
          type: 'string',
          required: false,
          label: 'Email Filter',
          description: 'Filter contacts by email',
          aiControlled: false
        },
        phone: {
          type: 'string',
          required: false,
          label: 'Phone Filter',
          description: 'Filter contacts by phone',
          aiControlled: false
        },
        company_id: {
          type: 'number',
          required: false,
          label: 'Company ID',
          description: 'Filter contacts by company',
          aiControlled: false
        }
      },
      outputSchema: {
        contacts: { type: 'array', description: 'List of contacts' },
        has_more: { type: 'boolean', description: 'Whether more contacts are available' }
      }
    }
  ],

  supported_triggers: [
    {
      id: 'ticket_created',
      name: 'Ticket Created',
      description: 'Triggered when a new ticket is created',
      eventType: 'webhook',
      icon: 'plus-circle',
      webhookRequired: true,
      outputSchema: {
        id: { type: 'number', description: 'Ticket ID' },
        subject: { type: 'string', description: 'Ticket subject' },
        description: { type: 'string', description: 'Ticket description' },
        status: { type: 'string', description: 'Ticket status' },
        priority: { type: 'number', description: 'Ticket priority' },
        created_at: { type: 'string', description: 'Creation timestamp' }
      }
    },
    {
      id: 'ticket_updated',
      name: 'Ticket Updated',
      description: 'Triggered when a ticket is updated',
      eventType: 'webhook',
      icon: 'edit-2',
      webhookRequired: true,
      outputSchema: {
        id: { type: 'number', description: 'Ticket ID' },
        subject: { type: 'string', description: 'Ticket subject' },
        status: { type: 'string', description: 'Ticket status' },
        updated_at: { type: 'string', description: 'Update timestamp' }
      }
    },
    {
      id: 'ticket_resolved',
      name: 'Ticket Resolved',
      description: 'Triggered when a ticket is resolved',
      eventType: 'webhook',
      icon: 'check-circle',
      webhookRequired: true,
      outputSchema: {
        id: { type: 'number', description: 'Ticket ID' },
        subject: { type: 'string', description: 'Ticket subject' },
        status: { type: 'string', description: 'Ticket status' },
        resolved_at: { type: 'string', description: 'Resolution timestamp' }
      }
    }
  ]
};
