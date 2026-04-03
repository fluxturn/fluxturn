// Typeform Connector Definition
// Synced with typeform.connector.ts implementation

import { ConnectorDefinition } from '../../shared';

export const TYPEFORM_CONNECTOR: ConnectorDefinition = {
  name: 'typeform',
  display_name: 'Typeform',
  category: 'forms',
  description: 'Typeform conversational forms for surveys, quizzes, and data collection',
  auth_type: 'bearer_token',
  verified: false,

  auth_fields: [
    {
      key: 'access_token',
      label: 'Access Token',
      type: 'password',
      required: true,
      placeholder: 'tfp_xxxxxx',
      description: 'Personal access token from Typeform',
      helpUrl: 'https://developer.typeform.com/get-started/personal-access-token/',
      helpText: 'How to create a Personal Access Token'
    }
  ],

  endpoints: {
    base_url: 'https://api.typeform.com'
  },

  webhook_support: true,
  rate_limits: { requests_per_minute: 60 },
  sandbox_available: false,

  supported_actions: [
    {
      id: 'create_form',
      name: 'Create Form',
      description: 'Create a new Typeform',
      category: 'Forms',
      icon: 'file-plus',
      inputSchema: {
        title: {
          type: 'string',
          required: true,
          label: 'Form Title',
          placeholder: 'Customer Feedback Survey',
          description: 'Title of the form',
          aiControlled: true,
          aiDescription: 'Generate a clear, descriptive title for the form that reflects its purpose'
        },
        workspace: {
          type: 'object',
          required: false,
          label: 'Workspace',
          description: 'Workspace to create the form in',
          aiControlled: false
        },
        settings: {
          type: 'object',
          required: false,
          label: 'Form Settings',
          description: 'Form settings (notifications, progress bar, etc.)',
          aiControlled: false
        },
        theme: {
          type: 'object',
          required: false,
          label: 'Theme',
          description: 'Theme configuration for the form',
          aiControlled: false
        },
        fields: {
          type: 'array',
          required: false,
          label: 'Form Fields',
          description: 'Array of form field definitions',
          aiControlled: true,
          aiDescription: 'Generate form fields with appropriate question text, descriptions, and field types based on the form purpose'
        },
        logic: {
          type: 'array',
          required: false,
          label: 'Logic Rules',
          description: 'Array of logic/branching rules',
          aiControlled: false
        }
      },
      outputSchema: {
        id: { type: 'string', description: 'Created form ID' },
        title: { type: 'string', description: 'Form title' },
        _links: { type: 'object', description: 'Form links (display, responses)' }
      }
    },
    {
      id: 'get_responses',
      name: 'Get Responses',
      description: 'Get responses for a form',
      category: 'Responses',
      icon: 'list',
      inputSchema: {
        form_id: {
          type: 'string',
          required: true,
          label: 'Form ID',
          placeholder: 'abc123',
          description: 'ID of the form to get responses for',
          aiControlled: false
        },
        page_size: {
          type: 'number',
          required: false,
          label: 'Page Size',
          default: 25,
          description: 'Number of responses per page (max 1000)',
          aiControlled: false
        },
        since: {
          type: 'string',
          required: false,
          label: 'Since',
          description: 'Return responses after this date-time (ISO 8601)',
          aiControlled: false
        },
        until: {
          type: 'string',
          required: false,
          label: 'Until',
          description: 'Return responses before this date-time (ISO 8601)',
          aiControlled: false
        },
        after: {
          type: 'string',
          required: false,
          label: 'After Token',
          description: 'Pagination token for next page',
          aiControlled: false
        },
        before: {
          type: 'string',
          required: false,
          label: 'Before Token',
          description: 'Pagination token for previous page',
          aiControlled: false
        }
      },
      outputSchema: {
        items: { type: 'array', description: 'Array of responses' },
        total_items: { type: 'number', description: 'Total number of responses' },
        page_count: { type: 'number', description: 'Number of pages' }
      }
    },
    {
      id: 'update_form',
      name: 'Update Form',
      description: 'Update an existing Typeform',
      category: 'Forms',
      icon: 'edit',
      inputSchema: {
        form_id: {
          type: 'string',
          required: true,
          label: 'Form ID',
          placeholder: 'abc123',
          description: 'ID of the form to update',
          aiControlled: false
        },
        title: {
          type: 'string',
          required: false,
          label: 'Title',
          description: 'New title for the form',
          aiControlled: true,
          aiDescription: 'Generate a clear, descriptive title for the form that reflects its purpose'
        },
        settings: {
          type: 'object',
          required: false,
          label: 'Settings',
          description: 'Updated form settings',
          aiControlled: false
        },
        fields: {
          type: 'array',
          required: false,
          label: 'Fields',
          description: 'Updated form fields',
          aiControlled: true,
          aiDescription: 'Generate updated form fields with appropriate question text, descriptions, and field types'
        }
      },
      outputSchema: {
        id: { type: 'string', description: 'Updated form ID' },
        title: { type: 'string', description: 'Form title' }
      }
    },
    {
      id: 'get_analytics',
      name: 'Get Analytics',
      description: 'Get form analytics and insights',
      category: 'Analytics',
      icon: 'bar-chart',
      inputSchema: {
        form_id: {
          type: 'string',
          required: true,
          label: 'Form ID',
          placeholder: 'abc123',
          description: 'ID of the form to get analytics for',
          aiControlled: false
        }
      },
      outputSchema: {
        total_visits: { type: 'number', description: 'Total form visits' },
        unique_visits: { type: 'number', description: 'Unique visitors' },
        submissions: { type: 'number', description: 'Total submissions' },
        completion_rate: { type: 'number', description: 'Form completion rate' }
      }
    }
  ],

  supported_triggers: [
    {
      id: 'form_response',
      name: 'Form Response',
      description: 'Triggered when a new form response is submitted',
      eventType: 'webhook',
      icon: 'check-circle',
      webhookRequired: true,
      inputSchema: {
        form_id: {
          type: 'string',
          required: true,
          label: 'Form ID',
          description: 'Form to monitor for responses',
          aiControlled: false
        }
      },
      outputSchema: {
        form_id: { type: 'string', description: 'Form ID' },
        response_id: { type: 'string', description: 'Response ID' },
        submitted_at: { type: 'string', description: 'Submission timestamp' },
        answers: { type: 'array', description: 'Array of answers' },
        hidden: { type: 'object', description: 'Hidden fields data' },
        calculated: { type: 'object', description: 'Calculated values' }
      }
    }
  ]
};
