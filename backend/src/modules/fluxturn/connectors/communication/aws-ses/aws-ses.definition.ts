// Amazon SES Connector
// Email delivery service with tracking via SNS webhooks

import { ConnectorDefinition } from '../../shared';

export const AWS_SES_CONNECTOR: ConnectorDefinition = {
    name: 'aws_ses',
    display_name: 'Amazon SES',
    category: 'communication',
    description: 'Send transactional and marketing emails with delivery tracking via Amazon Simple Email Service',
    auth_type: 'api_key',

    auth_fields: [
      {
        key: 'accessKeyId',
        label: 'AWS Access Key ID',
        type: 'string',
        required: true,
        placeholder: 'AKIAIOSFODNN7EXAMPLE',
        description: 'Your AWS Access Key ID'
      },
      {
        key: 'secretAccessKey',
        label: 'AWS Secret Access Key',
        type: 'password',
        required: true,
        placeholder: 'wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY',
        description: 'Your AWS Secret Access Key'
      },
      {
        key: 'region',
        label: 'AWS Region',
        type: 'select',
        required: true,
        default: 'us-east-1',
        options: [
          { label: 'US East (N. Virginia)', value: 'us-east-1' },
          { label: 'US East (Ohio)', value: 'us-east-2' },
          { label: 'US West (N. California)', value: 'us-west-1' },
          { label: 'US West (Oregon)', value: 'us-west-2' },
          { label: 'EU (Ireland)', value: 'eu-west-1' },
          { label: 'EU (London)', value: 'eu-west-2' },
          { label: 'EU (Frankfurt)', value: 'eu-central-1' },
          { label: 'Asia Pacific (Mumbai)', value: 'ap-south-1' },
          { label: 'Asia Pacific (Singapore)', value: 'ap-southeast-1' },
          { label: 'Asia Pacific (Sydney)', value: 'ap-southeast-2' },
          { label: 'Asia Pacific (Tokyo)', value: 'ap-northeast-1' }
        ],
        description: 'AWS region where your SES is configured'
      },
      {
        key: 'configurationSetName',
        label: 'Configuration Set (Optional)',
        type: 'string',
        required: false,
        placeholder: 'my-tracking-config-set',
        description: 'SES Configuration Set for tracking (required for open/click tracking)'
      }
    ],

    endpoints: {
      base_url: 'https://email.{region}.amazonaws.com'
    },

    webhook_support: true,
    rate_limits: {
      sandbox: {
        emails_per_second: 1,
        emails_per_day: 200
      },
      production: {
        note: 'Based on your SES sending limits'
      }
    },
    sandbox_available: true,
    verified: false,

    supported_actions: [
      // ==================== SEND EMAIL ====================
      {
        id: 'send_email',
        name: 'Send Email',
        description: 'Send a transactional email with HTML/text content',
        category: 'Email',
        icon: 'send',
        verified: false,
        api: {
          endpoint: '/SendEmail',
          method: 'POST',
          baseUrl: 'https://email.{region}.amazonaws.com'
        },
        inputSchema: {
          fromEmail: {
            type: 'string',
            required: true,
            label: 'From Email',
            inputType: 'email',
            placeholder: 'sender@yourdomain.com',
            description: 'Verified sender email address',
            order: 1,
            aiControlled: false
          },
          fromName: {
            type: 'string',
            required: false,
            label: 'From Name',
            placeholder: 'Your Company',
            description: 'Sender display name',
            order: 2,
            aiControlled: false
          },
          toEmail: {
            type: 'string',
            required: true,
            label: 'To Email',
            inputType: 'email',
            placeholder: 'recipient@example.com',
            description: 'Recipient email (comma-separated for multiple)',
            order: 3,
            aiControlled: false
          },
          ccEmail: {
            type: 'string',
            required: false,
            label: 'CC',
            inputType: 'email',
            placeholder: 'cc@example.com',
            description: 'CC recipients (comma-separated)',
            order: 4,
            aiControlled: false
          },
          bccEmail: {
            type: 'string',
            required: false,
            label: 'BCC',
            inputType: 'email',
            placeholder: 'bcc@example.com',
            description: 'BCC recipients (comma-separated)',
            order: 5,
            aiControlled: false
          },
          replyTo: {
            type: 'string',
            required: false,
            label: 'Reply-To',
            inputType: 'email',
            placeholder: 'reply@yourdomain.com',
            description: 'Reply-to email address',
            order: 6,
            aiControlled: false
          },
          subject: {
            type: 'string',
            required: true,
            label: 'Subject',
            placeholder: 'Your email subject',
            description: 'Email subject line',
            order: 7,
            aiControlled: true,
            aiDescription: 'Generate a clear, engaging email subject line that accurately summarizes the email content'
          },
          bodyType: {
            type: 'select',
            required: true,
            label: 'Body Type',
            default: 'html',
            options: [
              { label: 'HTML', value: 'html' },
              { label: 'Plain Text', value: 'text' },
              { label: 'Both', value: 'both' }
            ],
            description: 'Email body format',
            order: 8,
            aiControlled: false
          },
          htmlBody: {
            type: 'string',
            required: false,
            label: 'HTML Body',
            inputType: 'textarea',
            placeholder: '<html><body><h1>Hello!</h1></body></html>',
            description: 'HTML content of the email',
            displayOptions: {
              show: {
                bodyType: ['html', 'both']
              }
            },
            order: 9,
            aiControlled: true,
            aiDescription: 'Generate well-formatted HTML email content with proper structure, styling, and responsive design'
          },
          textBody: {
            type: 'string',
            required: false,
            label: 'Text Body',
            inputType: 'textarea',
            placeholder: 'Plain text version of your email',
            description: 'Plain text content of the email',
            displayOptions: {
              show: {
                bodyType: ['text', 'both']
              }
            },
            order: 10,
            aiControlled: true,
            aiDescription: 'Generate clear, readable plain text email content'
          }
        },
        outputSchema: {
          messageId: {
            type: 'string',
            description: 'SES Message ID for tracking'
          },
          status: {
            type: 'string',
            description: 'Send status (sent/failed)'
          }
        }
      },

      // ==================== SEND TEMPLATED EMAIL ====================
      {
        id: 'send_templated_email',
        name: 'Send Templated Email',
        description: 'Send email using an SES template with dynamic data',
        category: 'Email',
        icon: 'file-text',
        verified: false,
        api: {
          endpoint: '/SendTemplatedEmail',
          method: 'POST',
          baseUrl: 'https://email.{region}.amazonaws.com'
        },
        inputSchema: {
          fromEmail: {
            type: 'string',
            required: true,
            label: 'From Email',
            inputType: 'email',
            placeholder: 'sender@yourdomain.com',
            description: 'Verified sender email address',
            order: 1,
            aiControlled: false
          },
          toEmail: {
            type: 'string',
            required: true,
            label: 'To Email',
            inputType: 'email',
            placeholder: 'recipient@example.com',
            description: 'Recipient email address',
            order: 2,
            aiControlled: false
          },
          templateName: {
            type: 'string',
            required: true,
            label: 'Template Name',
            placeholder: 'MyEmailTemplate',
            description: 'Name of the SES email template',
            order: 3,
            aiControlled: false
          },
          templateData: {
            type: 'object',
            required: true,
            label: 'Template Data',
            description: 'JSON object with template variables',
            placeholder: '{"name": "John", "orderNumber": "12345"}',
            order: 4,
            aiControlled: false
          }
        },
        outputSchema: {
          messageId: {
            type: 'string',
            description: 'SES Message ID'
          },
          status: {
            type: 'string',
            description: 'Send status'
          }
        }
      },

      // ==================== SEND BULK EMAIL ====================
      {
        id: 'send_bulk_email',
        name: 'Send Bulk Templated Email',
        description: 'Send personalized emails to multiple recipients using a template',
        category: 'Email',
        icon: 'users',
        verified: false,
        api: {
          endpoint: '/SendBulkTemplatedEmail',
          method: 'POST',
          baseUrl: 'https://email.{region}.amazonaws.com'
        },
        inputSchema: {
          fromEmail: {
            type: 'string',
            required: true,
            label: 'From Email',
            inputType: 'email',
            placeholder: 'sender@yourdomain.com',
            description: 'Verified sender email address',
            order: 1,
            aiControlled: false
          },
          templateName: {
            type: 'string',
            required: true,
            label: 'Template Name',
            placeholder: 'MyBulkTemplate',
            description: 'Name of the SES email template',
            order: 2,
            aiControlled: false
          },
          recipients: {
            type: 'array',
            required: true,
            label: 'Recipients',
            description: 'Array of recipient objects with email and template data',
            items: {
              type: 'object',
              properties: {
                email: { type: 'string', description: 'Recipient email' },
                templateData: { type: 'object', description: 'Template variables for this recipient' }
              }
            },
            order: 3,
            aiControlled: false
          },
          defaultTemplateData: {
            type: 'object',
            required: false,
            label: 'Default Template Data',
            description: 'Default values for template variables',
            order: 4,
            aiControlled: false
          }
        },
        outputSchema: {
          successful: {
            type: 'number',
            description: 'Number of emails queued successfully'
          },
          failed: {
            type: 'number',
            description: 'Number of failed emails'
          },
          messageIds: {
            type: 'array',
            description: 'Array of SES Message IDs'
          }
        }
      },

      // ==================== GET SEND STATISTICS ====================
      {
        id: 'get_send_statistics',
        name: 'Get Send Statistics',
        description: 'Get email sending statistics for the last 2 weeks',
        category: 'Analytics',
        icon: 'bar-chart',
        verified: false,
        api: {
          endpoint: '/GetSendStatistics',
          method: 'GET',
          baseUrl: 'https://email.{region}.amazonaws.com'
        },
        inputSchema: {},
        outputSchema: {
          deliveryAttempts: {
            type: 'number',
            description: 'Total delivery attempts'
          },
          bounces: {
            type: 'number',
            description: 'Total bounces'
          },
          complaints: {
            type: 'number',
            description: 'Total complaints'
          },
          rejects: {
            type: 'number',
            description: 'Total rejects'
          },
          dataPoints: {
            type: 'array',
            description: 'Statistics grouped by time period'
          }
        }
      }
    ],

    supported_triggers: [
      // ==================== BOUNCE NOTIFICATION ====================
      {
        id: 'bounce',
        name: 'Email Bounced',
        description: 'Triggers when an email bounces (hard or soft bounce)',
        eventType: 'ses:bounce',
        verified: false,
        icon: 'alert-triangle',
        webhookRequired: true,
        inputSchema: {
          bounceType: {
            type: 'select',
            label: 'Bounce Type',
            description: 'Filter by bounce type',
            default: 'all',
            options: [
              { label: 'All Bounces', value: 'all' },
              { label: 'Hard Bounce (Permanent)', value: 'Permanent' },
              { label: 'Soft Bounce (Transient)', value: 'Transient' },
              { label: 'Undetermined', value: 'Undetermined' }
            ]
          }
        },
        outputSchema: {
          bounceType: {
            type: 'string',
            description: 'Type of bounce (Permanent, Transient, Undetermined)'
          },
          bounceSubType: {
            type: 'string',
            description: 'Subtype (General, NoEmail, Suppressed, etc.)'
          },
          bouncedRecipients: {
            type: 'array',
            description: 'List of bounced email addresses'
          },
          timestamp: {
            type: 'string',
            description: 'When the bounce occurred'
          },
          messageId: {
            type: 'string',
            description: 'Original SES Message ID'
          }
        }
      },

      // ==================== COMPLAINT NOTIFICATION ====================
      {
        id: 'complaint',
        name: 'Spam Complaint',
        description: 'Triggers when a recipient marks email as spam',
        eventType: 'ses:complaint',
        verified: false,
        icon: 'flag',
        webhookRequired: true,
        inputSchema: {},
        outputSchema: {
          complainedRecipients: {
            type: 'array',
            description: 'List of recipients who complained'
          },
          complaintFeedbackType: {
            type: 'string',
            description: 'Type of complaint (abuse, auth-failure, etc.)'
          },
          timestamp: {
            type: 'string',
            description: 'When the complaint was received'
          },
          messageId: {
            type: 'string',
            description: 'Original SES Message ID'
          }
        }
      },

      // ==================== DELIVERY NOTIFICATION ====================
      {
        id: 'delivery',
        name: 'Email Delivered',
        description: 'Triggers when an email is successfully delivered',
        eventType: 'ses:delivery',
        verified: false,
        icon: 'check-circle',
        webhookRequired: true,
        inputSchema: {},
        outputSchema: {
          recipients: {
            type: 'array',
            description: 'List of recipients who received the email'
          },
          timestamp: {
            type: 'string',
            description: 'When the email was delivered'
          },
          processingTimeMillis: {
            type: 'number',
            description: 'Time taken to deliver in milliseconds'
          },
          messageId: {
            type: 'string',
            description: 'SES Message ID'
          },
          smtpResponse: {
            type: 'string',
            description: 'SMTP response from receiving server'
          }
        }
      },

      // ==================== OPEN TRACKING ====================
      {
        id: 'open',
        name: 'Email Opened',
        description: 'Triggers when a recipient opens the email (requires Configuration Set)',
        eventType: 'ses:open',
        verified: false,
        icon: 'eye',
        webhookRequired: true,
        inputSchema: {},
        outputSchema: {
          recipient: {
            type: 'string',
            description: 'Recipient email address'
          },
          timestamp: {
            type: 'string',
            description: 'When the email was opened'
          },
          userAgent: {
            type: 'string',
            description: 'Email client/browser user agent'
          },
          ipAddress: {
            type: 'string',
            description: 'IP address of the opener'
          },
          messageId: {
            type: 'string',
            description: 'SES Message ID'
          }
        }
      },

      // ==================== CLICK TRACKING ====================
      {
        id: 'click',
        name: 'Link Clicked',
        description: 'Triggers when a recipient clicks a link (requires Configuration Set)',
        eventType: 'ses:click',
        verified: false,
        icon: 'mouse-pointer',
        webhookRequired: true,
        inputSchema: {},
        outputSchema: {
          recipient: {
            type: 'string',
            description: 'Recipient email address'
          },
          link: {
            type: 'string',
            description: 'URL that was clicked'
          },
          linkTags: {
            type: 'object',
            description: 'Tags associated with the link'
          },
          timestamp: {
            type: 'string',
            description: 'When the link was clicked'
          },
          userAgent: {
            type: 'string',
            description: 'Browser user agent'
          },
          ipAddress: {
            type: 'string',
            description: 'IP address of the clicker'
          },
          messageId: {
            type: 'string',
            description: 'SES Message ID'
          }
        }
      }
    ]
  };
