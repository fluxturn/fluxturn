// Gmail Connector
// Auto-generated from connector.constants.ts

import { ConnectorDefinition } from '../../shared';

export const GMAIL_CONNECTOR: ConnectorDefinition = {
    name: 'gmail',
    display_name: 'Gmail',
    category: 'communication',
    description: 'Send and receive emails via Gmail',
    auth_type: 'multiple',
    auth_fields: [
      {
        key: 'authType',
        label: 'Authentication Type',
        type: 'select',
        required: true,
        options: [
          {
            label: 'OAuth2 (Recommended)',
            value: 'oauth2',
            description: 'Connect with your Google account using one-click OAuth'
          },
          {
            label: 'Service Account',
            value: 'service_account',
            description: 'Use a service account JSON key for server-to-server authentication'
          }
        ],
        default: 'oauth2'
      },
      // OAuth2 fields (optional - for custom OAuth apps)
      {
        key: 'clientId',
        label: 'Client ID (Optional)',
        type: 'string',
        required: false,
        placeholder: 'Your Google OAuth Client ID',
        description: 'Leave empty to use one-click OAuth',
        displayOptions: {
          authType: ['oauth2']
        }
      },
      {
        key: 'clientSecret',
        label: 'Client Secret (Optional)',
        type: 'password',
        required: false,
        placeholder: 'Your Google OAuth Client Secret',
        description: 'Leave empty to use one-click OAuth',
        displayOptions: {
          authType: ['oauth2']
        }
      },
      // Service Account fields
      {
        key: 'serviceAccountKey',
        label: 'Service Account JSON Key',
        type: 'textarea',
        required: true,
        placeholder: '{"type": "service_account", "project_id": "...", ...}',
        description: 'Paste the entire JSON key file content from Google Cloud Console',
        helpUrl: 'https://cloud.google.com/iam/docs/creating-managing-service-account-keys',
        helpText: 'How to create a service account key',
        displayOptions: {
          authType: ['service_account']
        }
      },
      {
        key: 'delegatedEmail',
        label: 'Delegated Email (Optional)',
        type: 'string',
        required: false,
        placeholder: 'user@yourdomain.com',
        description: 'Email to impersonate (requires domain-wide delegation)',
        displayOptions: {
          authType: ['service_account']
        }
      }
    ],
    endpoints: {
      base_url: 'https://gmail.googleapis.com',
      messages: {
        send: '/gmail/v1/users/me/messages/send',
        list: '/gmail/v1/users/me/messages',
        get: '/gmail/v1/users/me/messages/{id}',
        delete: '/gmail/v1/users/me/messages/{id}',
        modify: '/gmail/v1/users/me/messages/{id}/modify'
      },
      labels: {
        list: '/gmail/v1/users/me/labels',
        create: '/gmail/v1/users/me/labels'
      },
      drafts: {
        create: '/gmail/v1/users/me/drafts',
        send: '/gmail/v1/users/me/drafts/send'
      }
    },
    webhook_support: true,
    rate_limits: { requests_per_second: 25 },
    sandbox_available: true,
    verified: true,
    oauth_config: {
      authorization_url: 'https://accounts.google.com/o/oauth2/v2/auth',
      token_url: 'https://oauth2.googleapis.com/token',
      scopes: [
        'https://www.googleapis.com/auth/gmail.send',
        'https://www.googleapis.com/auth/gmail.readonly',
        'https://www.googleapis.com/auth/gmail.modify'
      ]
    },
    supported_actions: [
      {
        id: 'send_email',
        name: 'Send Email',
        description: 'Send an email via Gmail',
        category: 'Email',
        icon: 'mail',
        verified: false,
        api: {
          endpoint: '/gmail/v1/users/me/messages/send',
          method: 'POST',
          baseUrl: 'https://gmail.googleapis.com',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': 'Bearer {access_token}'
          },
          paramMapping: {
            to: 'to',
            subject: 'subject',
            body: 'body',
            cc: 'cc',
            bcc: 'bcc',
            attachments: 'attachments'
          }
        },
        inputSchema: {
          to: {
            type: 'string',
            required: true,
            label: 'To',
            placeholder: 'recipient@example.com',
            description: 'Recipient email addresses (comma-separated)',
            aiControlled: true,
            aiDescription: 'The recipient email address(es). Use comma-separated list for multiple recipients.'
          },
          subject: {
            type: 'string',
            required: true,
            label: 'Subject',
            description: 'Email subject line',
            aiControlled: true,
            aiDescription: 'A clear, concise email subject line that summarizes the email content.'
          },
          body: {
            type: 'string',
            required: true,
            label: 'Body',
            inputType: 'richtext',
            description: 'Email body content (supports HTML)',
            aiControlled: true,
            aiDescription: 'The email body content. Can include HTML formatting for rich text emails.'
          },
          cc: {
            type: 'string',
            label: 'CC',
            placeholder: 'cc@example.com',
            description: 'CC recipients (comma-separated)',
            aiControlled: false
          },
          bcc: {
            type: 'string',
            label: 'BCC',
            placeholder: 'bcc@example.com',
            description: 'BCC recipients (comma-separated)',
            aiControlled: false
          },
          attachments: {
            type: 'array',
            label: 'Attachments',
            description: 'File attachments (optional)',
            aiControlled: false,
            items: {
              type: 'object',
              properties: {
                filename: { type: 'string' },
                mimeType: { type: 'string' },
                data: { type: 'string' }
              }
            }
          }
        }
      },
      {
        id: 'search_emails',
        name: 'Search Emails',
        description: 'Search for emails using Gmail search syntax',
        category: 'Email',
        icon: 'search',
        verified: false,
        api: {
          endpoint: '/gmail/v1/users/me/messages',
          method: 'GET',
          baseUrl: 'https://gmail.googleapis.com',
          headers: {
            'Authorization': 'Bearer {access_token}'
          },
          paramMapping: {
            query: 'q',
            maxResults: 'maxResults',
            labelIds: 'labelIds'
          }
        },
        inputSchema: {
          query: {
            type: 'string',
            required: true,
            label: 'Search Query',
            placeholder: 'from:sender@example.com subject:important',
            description: 'Gmail search query (supports Gmail search operators)',
            aiControlled: true,
            aiDescription: 'The search query to find emails using Gmail search syntax'
          },
          maxResults: {
            type: 'number',
            label: 'Max Results',
            default: 10,
            min: 1,
            max: 100,
            description: 'Maximum number of emails to return',
            aiControlled: false
          },
          labelIds: {
            type: 'array',
            label: 'Label IDs',
            description: 'Filter by label IDs (optional)',
            items: { type: 'string' },
            aiControlled: false
          }
        }
      },
      {
        id: 'get_email',
        name: 'Get Email',
        description: 'Get a specific email by ID',
        category: 'Email',
        icon: 'mail-open',
        verified: false,
        api: {
          endpoint: '/gmail/v1/users/me/messages/{id}',
          method: 'GET',
          baseUrl: 'https://gmail.googleapis.com',
          headers: {
            'Authorization': 'Bearer {access_token}'
          },
          paramMapping: {
            messageId: 'id',
            format: 'format'
          }
        },
        inputSchema: {
          messageId: {
            type: 'string',
            required: true,
            label: 'Message ID',
            description: 'Gmail message ID to retrieve',
            aiControlled: false
          },
          format: {
            type: 'select',
            label: 'Format',
            options: [
              { label: 'Full', value: 'full' },
              { label: 'Metadata', value: 'metadata' },
              { label: 'Minimal', value: 'minimal' },
              { label: 'Raw', value: 'raw' }
            ],
            default: 'full',
            description: 'Response format',
            aiControlled: false
          }
        }
      },
      {
        id: 'delete_email',
        name: 'Delete Email',
        description: 'Delete an email permanently',
        category: 'Email',
        icon: 'trash',
        verified: false,
        api: {
          endpoint: '/gmail/v1/users/me/messages/{id}',
          method: 'DELETE',
          baseUrl: 'https://gmail.googleapis.com',
          headers: {
            'Authorization': 'Bearer {access_token}'
          },
          paramMapping: {
            messageId: 'id'
          }
        },
        inputSchema: {
          messageId: {
            type: 'string',
            required: true,
            label: 'Message ID',
            description: 'Gmail message ID to delete',
            aiControlled: false
          }
        }
      },
      {
        id: 'add_label',
        name: 'Add Label to Email',
        description: 'Add labels to an email',
        category: 'Labels',
        icon: 'tag',
        verified: false,
        api: {
          endpoint: '/gmail/v1/users/me/messages/{id}/modify',
          method: 'POST',
          baseUrl: 'https://gmail.googleapis.com',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': 'Bearer {access_token}'
          },
          paramMapping: {
            messageId: 'id',
            addLabelIds: 'addLabelIds'
          }
        },
        inputSchema: {
          messageId: {
            type: 'string',
            required: true,
            label: 'Message ID',
            description: 'Gmail message ID',
            aiControlled: false
          },
          addLabelIds: {
            type: 'array',
            required: true,
            label: 'Label IDs',
            description: 'Label IDs to add',
            items: { type: 'string' },
            aiControlled: false
          }
        }
      },
      {
        id: 'remove_label',
        name: 'Remove Label from Email',
        description: 'Remove labels from an email',
        category: 'Labels',
        icon: 'tag-off',
        verified: false,
        api: {
          endpoint: '/gmail/v1/users/me/messages/{id}/modify',
          method: 'POST',
          baseUrl: 'https://gmail.googleapis.com',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': 'Bearer {access_token}'
          },
          paramMapping: {
            messageId: 'id',
            removeLabelIds: 'removeLabelIds'
          }
        },
        inputSchema: {
          messageId: {
            type: 'string',
            required: true,
            label: 'Message ID',
            description: 'Gmail message ID',
            aiControlled: false
          },
          removeLabelIds: {
            type: 'array',
            required: true,
            label: 'Label IDs',
            description: 'Label IDs to remove',
            items: { type: 'string' },
            aiControlled: false
          }
        }
      },
      {
        id: 'create_draft',
        name: 'Create Draft',
        description: 'Create an email draft',
        category: 'Drafts',
        icon: 'file-text',
        verified: false,
        api: {
          endpoint: '/gmail/v1/users/me/drafts',
          method: 'POST',
          baseUrl: 'https://gmail.googleapis.com',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': 'Bearer {access_token}'
          },
          paramMapping: {
            to: 'to',
            subject: 'subject',
            body: 'body'
          }
        },
        inputSchema: {
          to: {
            type: 'string',
            required: true,
            label: 'To',
            placeholder: 'recipient@example.com',
            aiControlled: true,
            aiDescription: 'The recipient email address for the draft.'
          },
          subject: {
            type: 'string',
            required: true,
            label: 'Subject',
            aiControlled: true,
            aiDescription: 'A clear, concise email subject line.'
          },
          body: {
            type: 'string',
            required: true,
            label: 'Body',
            inputType: 'richtext',
            aiControlled: true,
            aiDescription: 'The email body content for the draft.'
          }
        }
      }
    ],
    supported_triggers: [
      {
        id: 'email_received',
        name: 'Email Received',
        description: 'Triggered when a new email is received (polling mode)',
        eventType: 'message',
        verified: false,
        icon: 'mail',
        webhookRequired: false,
        pollingEnabled: true,
        inputSchema: {
          readStatus: {
            type: 'select',
            label: 'Read Status',
            description: 'Filter by read status',
            required: false,
            options: [
              { value: 'all', label: 'All emails' },
              { value: 'unread', label: 'Unread only' },
              { value: 'read', label: 'Read only' }
            ],
            default: 'all'
          },
          sender: {
            type: 'string',
            label: 'From',
            description: 'Filter by sender email address (e.g., user@example.com)',
            placeholder: 'sender@example.com',
            required: false
          },
          labelIds: {
            type: 'array',
            label: 'Labels',
            description: 'Filter by Gmail label IDs (e.g., INBOX, IMPORTANT)',
            required: false,
            items: { type: 'string' }
          },
          searchQuery: {
            type: 'string',
            label: 'Search Query',
            description: 'Custom Gmail search query (uses Gmail search syntax)',
            placeholder: 'subject:important OR from:boss@company.com',
            required: false
          },
          includeSpamTrash: {
            type: 'boolean',
            label: 'Include Spam/Trash',
            description: 'Include emails from Spam and Trash folders',
            required: false,
            default: false
          },
          pollingInterval: {
            type: 'select',
            label: 'Polling Interval',
            description: 'How often to check for new emails',
            required: false,
            options: [
              { value: '1', label: 'Every minute' },
              { value: '5', label: 'Every 5 minutes' },
              { value: '15', label: 'Every 15 minutes' },
              { value: '30', label: 'Every 30 minutes' },
              { value: '60', label: 'Every hour' }
            ],
            default: '5'
          },
          simple: {
            type: 'boolean',
            label: 'Simple Mode',
            description: 'Return simplified message data (metadata only, faster)',
            required: false,
            default: true
          }
        },
        outputSchema: {
          messageId: { type: 'string', description: 'Message ID' },
          threadId: { type: 'string', description: 'Thread ID' },
          from: { type: 'string', description: 'Sender email address' },
          to: { type: 'string', description: 'Recipient email addresses' },
          cc: { type: 'string', description: 'CC email addresses' },
          bcc: { type: 'string', description: 'BCC email addresses' },
          subject: { type: 'string', description: 'Email subject' },
          snippet: { type: 'string', description: 'Email preview text' },
          date: { type: 'string', description: 'Email date' },
          labelIds: { type: 'array', items: { type: 'string' }, description: 'Gmail labels' },
          internalDate: { type: 'string', description: 'Internal Gmail timestamp' },
          headers: { type: 'object', description: 'Email headers' },
          payload: { type: 'object', description: 'Full email payload (if simple=false)' }
        }
      },
      {
        id: 'email_sent',
        name: 'Email Sent',
        description: 'Triggered when an email is sent from your account',
        eventType: 'sent',
        verified: false,
        icon: 'send',
        webhookRequired: false,
        pollingEnabled: true,
        inputSchema: {
          pollingInterval: {
            type: 'select',
            label: 'Polling Interval',
            description: 'How often to check for sent emails',
            required: false,
            options: [
              { value: '5', label: 'Every 5 minutes' },
              { value: '15', label: 'Every 15 minutes' },
              { value: '30', label: 'Every 30 minutes' },
              { value: '60', label: 'Every hour' }
            ],
            default: '5'
          }
        },
        outputSchema: {
          messageId: { type: 'string', description: 'Sent message ID' },
          to: { type: 'array', items: { type: 'string' }, description: 'Recipient addresses' },
          subject: { type: 'string', description: 'Email subject' },
          timestamp: { type: 'string', description: 'Sent timestamp' }
        }
      }
    ]
  };
