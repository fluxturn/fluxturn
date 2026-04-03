// POP3 Connector
// Email reading using POP3 protocol

import { ConnectorDefinition } from '../../shared';

export const POP3_CONNECTOR: ConnectorDefinition = {
  name: 'pop3',
  display_name: 'POP3 (Email Reader)',
  category: 'communication',
  description: 'Read emails using POP3 protocol',
  auth_type: 'custom',
  auth_fields: [
    {
      key: 'user',
      label: 'User',
      type: 'string',
      required: true,
      placeholder: 'user@example.com',
      description: 'POP3 username (usually your email address)'
    },
    {
      key: 'password',
      label: 'Password',
      type: 'password',
      required: true,
      placeholder: 'Enter password',
      description: 'POP3 password or app-specific password'
    },
    {
      key: 'host',
      label: 'Host',
      type: 'string',
      required: true,
      placeholder: 'pop.gmail.com',
      description: 'POP3 server hostname (e.g., pop.gmail.com, outlook.office365.com)'
    },
    {
      key: 'port',
      label: 'Port',
      type: 'number',
      required: true,
      default: 995,
      placeholder: '995',
      description: 'POP3 server port (usually 995 for SSL/TLS, 110 for non-SSL)'
    },
    {
      key: 'secure',
      label: 'SSL/TLS',
      type: 'boolean',
      required: false,
      default: true,
      description: 'Use SSL/TLS for secure connection'
    },
    {
      key: 'allowUnauthorizedCerts',
      label: 'Allow Self-Signed Certificates',
      type: 'boolean',
      required: false,
      default: true,
      description: 'Allow connection even if SSL certificate validation fails (not recommended for production)'
    }
  ],
  verified: true,
  endpoints: {
    base_url: 'pop3://{host}:{port}'
  },
  webhook_support: false,
  rate_limits: { requests_per_minute: 30 },
  sandbox_available: false,
  supported_triggers: [],
  supported_actions: [
    {
      id: 'read_email',
      name: 'Read Email',
      description: 'Read a specific email by message number',
      category: 'Email',
      icon: 'Mail',
      verified: false,
      api: {
        endpoint: '/retr',
        method: 'GET',
        baseUrl: 'pop3://{host}:{port}',
        headers: {},
        paramMapping: {
          messageNumber: 'msgnum',
          deleteAfterRead: 'delete'
        }
      },
      inputSchema: {
        messageNumber: {
          type: 'string',
          required: true,
          label: 'Message Number',
          placeholder: '1 or {{$json.number}}',
          description: 'The message number to retrieve (1 for first message). Supports expressions like {{$json.number}}',
          default: '1',
          aiControlled: false
        },
        deleteAfterRead: {
          type: 'boolean',
          required: false,
          label: 'Delete After Reading',
          default: false,
          description: 'Delete the message from server after reading',
          aiControlled: false
        }
      },
      outputSchema: {
        from: {
          type: 'string',
          description: 'Sender email address'
        },
        to: {
          type: 'string',
          description: 'Recipient email address'
        },
        subject: {
          type: 'string',
          description: 'Email subject'
        },
        date: {
          type: 'string',
          description: 'Email date'
        },
        body: {
          type: 'string',
          description: 'Email body (plain text or HTML)'
        },
        rawMessage: {
          type: 'string',
          description: 'Full raw email content'
        }
      }
    },
    {
      id: 'list_messages',
      name: 'List Messages',
      description: 'List all messages in the mailbox',
      category: 'Email',
      icon: 'List',
      verified: false,
      api: {
        endpoint: '/list',
        method: 'GET',
        baseUrl: 'pop3://{host}:{port}',
        headers: {},
        paramMapping: {}
      },
      inputSchema: {},
      outputSchema: {
        messageCount: {
          type: 'number',
          description: 'Total number of messages'
        },
        messages: {
          type: 'array',
          description: 'List of message numbers and sizes',
          properties: {
            number: { type: 'number', description: 'Message number' },
            size: { type: 'number', description: 'Message size in bytes' }
          }
        }
      }
    }
  ]
};
