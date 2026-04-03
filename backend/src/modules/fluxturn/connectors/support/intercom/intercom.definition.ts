// Intercom Connector Definition
// Synced with intercom.connector.ts implementation

import { ConnectorDefinition } from '../../shared';

export const INTERCOM_CONNECTOR: ConnectorDefinition = {
  name: 'intercom',
  display_name: 'Intercom',
  category: 'support',
  description: 'Intercom customer messaging platform for conversations, users, and engagement',
  auth_type: 'bearer_token',
  verified: false,

  auth_fields: [
    {
      key: 'access_token',
      label: 'Access Token',
      type: 'password',
      required: true,
      placeholder: 'dG9rOjxxxxxxxx',
      description: 'Access token from Intercom developer hub',
      helpUrl: 'https://developers.intercom.com/building-apps/docs/authentication-types',
      helpText: 'How to get your access token'
    }
  ],

  endpoints: {
    base_url: 'https://api.intercom.io'
  },

  webhook_support: true,
  rate_limits: { requests_per_minute: 1000 },
  sandbox_available: true,

  supported_actions: [
    {
      id: 'create_conversation',
      name: 'Create Conversation',
      description: 'Start a new conversation with a user',
      category: 'Conversations',
      icon: 'message-square',
      inputSchema: {
        user_id: {
          type: 'string',
          required: false,
          label: 'User ID',
          placeholder: '5ffc9c1234567890',
          description: 'Intercom user ID (either user_id or email required)',
          aiControlled: false
        },
        email: {
          type: 'string',
          required: false,
          label: 'Email',
          placeholder: 'user@example.com',
          description: 'User email address (either user_id or email required)',
          aiControlled: false
        },
        body: {
          type: 'string',
          required: true,
          label: 'Message Body',
          inputType: 'textarea',
          placeholder: 'Hello! How can we help you today?',
          description: 'Initial message content',
          aiControlled: true,
          aiDescription: 'The content of the message to send'
        },
        message_type: {
          type: 'select',
          required: false,
          label: 'Message Type',
          default: 'email',
          options: [
            { label: 'Email', value: 'email' },
            { label: 'In-App', value: 'inapp' },
            { label: 'Facebook', value: 'facebook' },
            { label: 'Twitter', value: 'twitter' }
          ],
          description: 'Type of message to send',
          aiControlled: false
        },
        subject: {
          type: 'string',
          required: false,
          label: 'Subject',
          placeholder: 'Welcome to our platform',
          description: 'Email subject (only for email message type)',
          aiControlled: true,
          aiDescription: 'The subject line for the email'
        }
      },
      outputSchema: {
        id: { type: 'string', description: 'Conversation ID' },
        subject: { type: 'string', description: 'Conversation subject' },
        body: { type: 'string', description: 'Message body' },
        state: { type: 'string', description: 'Conversation state' },
        created_at: { type: 'number', description: 'Creation timestamp' }
      }
    },
    {
      id: 'reply_to_conversation',
      name: 'Reply to Conversation',
      description: 'Reply to an existing conversation',
      category: 'Conversations',
      icon: 'corner-up-left',
      inputSchema: {
        conversation_id: {
          type: 'string',
          required: true,
          label: 'Conversation ID',
          placeholder: '1234567890',
          description: 'ID of the conversation to reply to',
          aiControlled: false
        },
        body: {
          type: 'string',
          required: true,
          label: 'Reply Message',
          inputType: 'textarea',
          placeholder: 'Thank you for reaching out!',
          description: 'Reply message content',
          aiControlled: true,
          aiDescription: 'The content of the reply message'
        },
        message_type: {
          type: 'select',
          required: false,
          label: 'Message Type',
          default: 'comment',
          options: [
            { label: 'Comment', value: 'comment' },
            { label: 'Note', value: 'note' }
          ],
          description: 'Type of reply (comment is visible to user, note is internal)',
          aiControlled: false
        },
        admin_id: {
          type: 'string',
          required: false,
          label: 'Admin ID',
          description: 'ID of the admin sending the reply',
          aiControlled: false
        }
      },
      outputSchema: {
        id: { type: 'string', description: 'Reply ID' },
        body: { type: 'string', description: 'Reply body' },
        author: { type: 'object', description: 'Reply author' },
        created_at: { type: 'number', description: 'Reply timestamp' }
      }
    },
    {
      id: 'get_conversations',
      name: 'Get Conversations',
      description: 'Retrieve conversations with filtering',
      category: 'Conversations',
      icon: 'list',
      inputSchema: {
        state: {
          type: 'select',
          required: false,
          label: 'State',
          options: [
            { label: 'Open', value: 'open' },
            { label: 'Closed', value: 'closed' },
            { label: 'Snoozed', value: 'snoozed' }
          ],
          description: 'Filter by conversation state',
          aiControlled: false
        },
        sort: {
          type: 'select',
          required: false,
          label: 'Sort By',
          options: [
            { label: 'Created At', value: 'created_at' },
            { label: 'Updated At', value: 'updated_at' },
            { label: 'Waiting Since', value: 'waiting_since' }
          ],
          description: 'Field to sort by',
          aiControlled: false
        },
        order: {
          type: 'select',
          required: false,
          label: 'Order',
          default: 'desc',
          options: [
            { label: 'Ascending', value: 'asc' },
            { label: 'Descending', value: 'desc' }
          ],
          description: 'Sort order',
          aiControlled: false
        },
        per_page: {
          type: 'number',
          required: false,
          label: 'Per Page',
          default: 20,
          description: 'Number of conversations per page (max 150)',
          aiControlled: false
        }
      },
      outputSchema: {
        conversations: { type: 'array', description: 'List of conversations' },
        pages: { type: 'object', description: 'Pagination information' },
        total_count: { type: 'number', description: 'Total number of conversations' }
      }
    },
    {
      id: 'create_user',
      name: 'Create User',
      description: 'Create or update a user in Intercom',
      category: 'Users',
      icon: 'user-plus',
      inputSchema: {
        user_id: {
          type: 'string',
          required: false,
          label: 'User ID',
          placeholder: 'user_123',
          description: 'External user ID (either user_id or email required)',
          aiControlled: false
        },
        email: {
          type: 'string',
          required: false,
          label: 'Email',
          placeholder: 'user@example.com',
          description: 'User email address (either user_id or email required)',
          aiControlled: false
        },
        name: {
          type: 'string',
          required: false,
          label: 'Name',
          placeholder: 'John Doe',
          description: 'User full name',
          aiControlled: false
        },
        phone: {
          type: 'string',
          required: false,
          label: 'Phone',
          placeholder: '+1234567890',
          description: 'User phone number',
          aiControlled: false
        },
        custom_attributes: {
          type: 'object',
          required: false,
          label: 'Custom Attributes',
          description: 'Custom user attributes',
          aiControlled: false
        },
        signed_up_at: {
          type: 'number',
          required: false,
          label: 'Signed Up At',
          description: 'Unix timestamp of when user signed up',
          aiControlled: false
        },
        last_seen_at: {
          type: 'number',
          required: false,
          label: 'Last Seen At',
          description: 'Unix timestamp of when user was last seen',
          aiControlled: false
        }
      },
      outputSchema: {
        id: { type: 'string', description: 'Intercom user ID' },
        user_id: { type: 'string', description: 'External user ID' },
        email: { type: 'string', description: 'User email' },
        name: { type: 'string', description: 'User name' },
        created_at: { type: 'number', description: 'Creation timestamp' },
        updated_at: { type: 'number', description: 'Update timestamp' }
      }
    }
  ],

  supported_triggers: [
    {
      id: 'conversation_opened',
      name: 'Conversation Opened',
      description: 'Triggered when a new conversation is opened',
      eventType: 'webhook',
      icon: 'message-circle',
      webhookRequired: true,
      outputSchema: {
        id: { type: 'string', description: 'Conversation ID' },
        state: { type: 'string', description: 'Conversation state' },
        subject: { type: 'string', description: 'Conversation subject' },
        created_at: { type: 'number', description: 'Creation timestamp' }
      }
    },
    {
      id: 'conversation_closed',
      name: 'Conversation Closed',
      description: 'Triggered when a conversation is closed',
      eventType: 'webhook',
      icon: 'x-circle',
      webhookRequired: true,
      outputSchema: {
        id: { type: 'string', description: 'Conversation ID' },
        state: { type: 'string', description: 'Conversation state (closed)' },
        closed_at: { type: 'number', description: 'Closure timestamp' }
      }
    },
    {
      id: 'user_created',
      name: 'User Created',
      description: 'Triggered when a new user is created',
      eventType: 'webhook',
      icon: 'user-plus',
      webhookRequired: true,
      outputSchema: {
        id: { type: 'string', description: 'Intercom user ID' },
        user_id: { type: 'string', description: 'External user ID' },
        email: { type: 'string', description: 'User email' },
        created_at: { type: 'number', description: 'Creation timestamp' }
      }
    }
  ]
};
