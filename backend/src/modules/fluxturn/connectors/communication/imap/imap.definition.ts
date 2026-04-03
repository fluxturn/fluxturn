// Imap Connector
// Auto-generated from connector.constants.ts

import { ConnectorDefinition } from '../../shared';

export const IMAP_CONNECTOR: ConnectorDefinition = {
    name: 'imap',
    display_name: 'IMAP (Email Trigger)',
    category: 'communication',
    description: 'Receive emails using IMAP protocol - triggers workflow when new emails arrive',
    auth_type: 'custom',
    auth_fields: [
      {
        key: 'user',
        label: 'User',
        type: 'string',
        required: true,
        placeholder: 'user@example.com',
        description: 'IMAP username (usually your email address)'
      },
      {
        key: 'password',
        label: 'Password',
        type: 'password',
        required: true,
        placeholder: 'Enter password',
        description: 'IMAP password or app-specific password'
      },
      {
        key: 'host',
        label: 'Host',
        type: 'string',
        required: true,
        placeholder: 'imap.gmail.com',
        description: 'IMAP server hostname (e.g., imap.gmail.com, outlook.office365.com)'
      },
      {
        key: 'port',
        label: 'Port',
        type: 'number',
        required: true,
        default: 993,
        placeholder: '993',
        description: 'IMAP server port (usually 993 for SSL/TLS, 143 for STARTTLS)'
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
        default: false,
        description: 'Allow connection even if SSL certificate validation fails (not recommended for production)'
      }
    ],
    endpoints: {
      base_url: 'imap://{host}:{port}'
    },
    webhook_support: false,
    rate_limits: { requests_per_minute: 60 },
    sandbox_available: false,
    verified: true,
    supported_triggers: [
      {
        id: 'new_email',
        name: 'New Email',
        description: 'Triggers when a new email is received in the mailbox',
        eventType: 'email_received',
        verified: false,
        icon: 'Mail',
        pollingEnabled: true,
        webhookRequired: false,
        inputSchema: {
          mailbox: {
            type: 'string',
            required: false,
            label: 'Mailbox Name',
            default: 'INBOX',
            placeholder: 'INBOX',
            description: 'Name of the mailbox to monitor (e.g., INBOX, Sent, Drafts)',
            aiControlled: false
          },
          postProcessAction: {
            type: 'select',
            required: true,
            label: 'Post-Process Action',
            default: 'read',
            options: [
              { label: 'Mark as Read', value: 'read' },
              { label: 'Nothing', value: 'nothing' }
            ],
            description: 'What to do after the email has been received. If "Nothing" is selected, the email will be processed multiple times',
            aiControlled: false
          },
          format: {
            type: 'select',
            required: true,
            label: 'Email Format',
            default: 'simple',
            options: [
              { label: 'Simple', value: 'simple' },
              { label: 'Resolved', value: 'resolved' },
              { label: 'RAW', value: 'raw' }
            ],
            description: 'Simple: Returns full email with text/HTML. Resolved: Fully parsed with attachments as binary. RAW: Base64-encoded raw email',
            aiControlled: false
          },
          downloadAttachments: {
            type: 'boolean',
            required: false,
            label: 'Download Attachments',
            default: false,
            description: 'Whether to download email attachments (only for Simple and Resolved formats)',
            displayOptions: {
              show: {
                format: ['simple', 'resolved']
              }
            },
            aiControlled: false
          },
          dataPropertyAttachmentsPrefixName: {
            type: 'string',
            required: false,
            label: 'Attachment Prefix',
            default: 'attachment_',
            placeholder: 'attachment_',
            description: 'Prefix for binary property names containing attachments (e.g., attachment_0, attachment_1)',
            displayOptions: {
              show: {
                downloadAttachments: [true]
              }
            },
            aiControlled: false
          },
          customEmailConfig: {
            type: 'string',
            required: false,
            label: 'Custom Email Rules',
            default: '["UNSEEN"]',
            placeholder: '["UNSEEN"]',
            inputType: 'textarea',
            description: 'Custom IMAP search criteria as JSON array. Default: ["UNSEEN"] (unread emails). Example: ["ALL"], ["SINCE", "01-Jan-2025"]',
            aiControlled: false
          },
          forceReconnect: {
            type: 'number',
            required: false,
            label: 'Force Reconnect (minutes)',
            default: 60,
            placeholder: '60',
            description: 'Interval in minutes to force IMAP reconnection (helps with connection stability)',
            aiControlled: false
          },
          pollInterval: {
            type: 'number',
            required: false,
            label: 'Poll Interval (seconds)',
            default: 60,
            min: 10,
            placeholder: '60',
            description: 'How often to check for new emails (in seconds, minimum 10)',
            aiControlled: false
          }
        },
        outputSchema: {
          emailEvent: {
            type: 'object',
            description: 'Email data',
            properties: {
              from: { type: 'string', description: 'Sender email address' },
              to: { type: 'string', description: 'Recipient email address' },
              subject: { type: 'string', description: 'Email subject' },
              date: { type: 'string', description: 'Email date' },
              textPlain: { type: 'string', description: 'Plain text content' },
              textHtml: { type: 'string', description: 'HTML content' },
              cc: { type: 'string', description: 'CC recipients' },
              metadata: { type: 'object', description: 'Additional email headers' },
              attributes: {
                type: 'object',
                description: 'Email attributes',
                properties: {
                  uid: { type: 'number', description: 'Unique message ID' }
                }
              }
            }
          }
        }
      }
    ],
    supported_actions: []
  };
