// Smtp Connector
// Auto-generated from connector.constants.ts

import { ConnectorDefinition } from '../../shared';

export const SMTP_CONNECTOR: ConnectorDefinition = {
    name: 'smtp',
    display_name: 'SMTP (Send Email)',
    category: 'communication',
    description: 'Send emails using SMTP protocol',
    auth_type: 'custom',
    auth_fields: [
      {
        key: 'host',
        label: 'SMTP Host',
        type: 'string',
        required: true,
        placeholder: 'smtp.gmail.com',
        description: 'SMTP server hostname'
      },
      {
        key: 'port',
        label: 'Port',
        type: 'number',
        required: true,
        default: 465,
        description: 'SMTP server port (465 for SSL, 587 for TLS, 25 for plain)'
      },
      {
        key: 'secure',
        label: 'SSL/TLS (auto-detected)',
        type: 'boolean',
        required: false,
        description: 'Auto-detected based on port: 465=SSL, 587=STARTTLS. Only change for non-standard ports.'
      },
      {
        key: 'user',
        label: 'Username',
        type: 'string',
        required: false,
        placeholder: 'your-email@example.com',
        description: 'SMTP authentication username (usually your email address)'
      },
      {
        key: 'password',
        label: 'Password',
        type: 'password',
        required: false,
        placeholder: '',
        description: 'SMTP authentication password or app password'
      },
      {
        key: 'disableStartTls',
        label: 'Disable STARTTLS',
        type: 'boolean',
        required: false,
        default: false,
        description: 'Disable STARTTLS (only for non-SSL connections)',
        displayOptions: {
          secure: [false],
        }
      },
      {
        key: 'hostName',
        label: 'Client Hostname',
        type: 'string',
        required: false,
        placeholder: '',
        description: 'Optional: The hostname of the client (used for identifying to the server)'
      }
    ],
    endpoints: {
      base_url: 'smtp://{host}:{port}'
    },
    webhook_support: false,
    rate_limits: { requests_per_minute: 100 },
    sandbox_available: false,
    verified: true,
    supported_actions: [
      {
        id: 'send_email',
        name: 'Send Email',
        description: 'Send an email using SMTP protocol',
        category: 'Email',
        icon: 'envelope',
        verified: false,
        inputSchema: {
          fromEmail: {
            type: 'string',
            required: true,
            label: 'From Email',
            inputType: 'email',
            placeholder: 'sender@example.com',
            description: 'Email address of the sender. You can also specify a name: John Doe <john@example.com>',
            aiControlled: false
          },
          toEmail: {
            type: 'string',
            required: true,
            label: 'To Email',
            inputType: 'email',
            placeholder: 'recipient@example.com',
            description: 'Email address of the recipient. You can also specify a name: Jane Doe <jane@example.com>',
            aiControlled: true,
            aiDescription: 'The recipient email address. Can include name: Jane Doe <jane@example.com>'
          },
          subject: {
            type: 'string',
            required: true,
            label: 'Subject',
            placeholder: 'Email subject',
            description: 'Subject line of the email',
            aiControlled: true,
            aiDescription: 'A clear, concise email subject line that summarizes the email content.'
          },
          emailFormat: {
            type: 'select',
            label: 'Email Format',
            required: true,
            default: 'text',
            options: [
              { label: 'Text', value: 'text' },
              { label: 'HTML', value: 'html' },
              { label: 'Both', value: 'both' }
            ],
            description: 'Format of the email content',
            aiControlled: false
          },
          text: {
            type: 'string',
            required: false,
            label: 'Text Content',
            inputType: 'textarea',
            placeholder: 'Plain text email content...',
            description: 'Plain text version of the email',
            aiControlled: true,
            aiDescription: 'The plain text email body content.',
            displayOptions: {
              emailFormat: ['text', 'both'],
            }
          },
          html: {
            type: 'string',
            required: false,
            label: 'HTML Content',
            inputType: 'textarea',
            placeholder: '<h1>HTML email content...</h1>',
            description: 'HTML version of the email',
            aiControlled: true,
            aiDescription: 'The HTML email body content with formatting.',
            displayOptions: {
              emailFormat: ['html', 'both'],
            }
          },
          ccEmail: {
            type: 'string',
            required: false,
            label: 'CC Email',
            inputType: 'email',
            placeholder: 'cc@example.com',
            description: 'Carbon copy recipient email address(es). Use comma to separate multiple addresses',
            aiControlled: false
          },
          bccEmail: {
            type: 'string',
            required: false,
            label: 'BCC Email',
            inputType: 'email',
            placeholder: 'bcc@example.com',
            description: 'Blind carbon copy recipient email address(es). Use comma to separate multiple addresses',
            aiControlled: false
          },
          replyTo: {
            type: 'string',
            required: false,
            label: 'Reply To',
            inputType: 'email',
            placeholder: 'reply@example.com',
            description: 'Email address to send replies to',
            aiControlled: false
          },
          attachments: {
            type: 'string',
            required: false,
            label: 'Attachments',
            placeholder: 'attachment1,attachment2',
            description: 'Comma-separated list of binary property names containing file attachments',
            aiControlled: false
          },
          allowUnauthorizedCerts: {
            type: 'boolean',
            required: false,
            label: 'Allow Unauthorized Certificates',
            default: false,
            description: 'Allow connection even if SSL certificate validation fails (not recommended for production)',
            aiControlled: false
          }
        },
        outputSchema: {
          messageId: {
            type: 'string',
            description: 'Unique message ID assigned by the SMTP server'
          },
          accepted: {
            type: 'array',
            description: 'Array of email addresses that were accepted'
          },
          rejected: {
            type: 'array',
            description: 'Array of email addresses that were rejected'
          },
          response: {
            type: 'string',
            description: 'Server response message'
          }
        }
      }
    ]
  };
