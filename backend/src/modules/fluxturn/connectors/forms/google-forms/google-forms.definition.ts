// Google Forms Connector
// Comprehensive Google Forms integration for form management and response collection

import { ConnectorDefinition } from '../../shared';

export const GOOGLE_FORMS_CONNECTOR: ConnectorDefinition = {
  name: 'google_forms',
  display_name: 'Google Forms',
  category: 'forms',
  description: 'Google Forms integration for creating forms, managing questions, and collecting responses with real-time notifications',
  auth_type: 'oauth2',
  auth_fields: [
    {
      key: 'use_manual_oauth',
      label: 'Use Custom OAuth Credentials',
      type: 'boolean',
      required: false,
      default: false,
      description: 'Enable this to use your own Google OAuth credentials instead of centralized OAuth',
      order: 1
    },
    {
      key: 'client_id',
      label: 'OAuth Client ID',
      type: 'string',
      required: false,
      placeholder: 'xxxxx.apps.googleusercontent.com',
      description: 'Your Google OAuth Client ID (optional - leave empty to use centralized OAuth)',
      helpUrl: 'https://console.cloud.google.com/apis/credentials',
      helpText: 'How to get OAuth credentials',
      displayOptions: {
        show: {
          use_manual_oauth: [true]
        }
      },
      order: 2
    },
    {
      key: 'client_secret',
      label: 'OAuth Client Secret',
      type: 'password',
      required: false,
      placeholder: 'GOCSPX-xxxxxxxxxxxxx',
      description: 'Your Google OAuth Client Secret (optional - leave empty to use centralized OAuth)',
      displayOptions: {
        show: {
          use_manual_oauth: [true]
        }
      },
      order: 3
    },
    {
      key: 'redirect_uri',
      label: 'OAuth Redirect URI',
      type: 'string',
      required: false,
      placeholder: 'http://localhost:5005/api/v1/oauth/google/callback',
      description: 'OAuth redirect URI configured in your Google Cloud Console',
      displayOptions: {
        show: {
          use_manual_oauth: [true]
        }
      },
      order: 4
    }
  ],
  oauth_config: {
    authorization_url: 'https://accounts.google.com/o/oauth2/v2/auth',
    token_url: 'https://oauth2.googleapis.com/token',
    scopes: [
      'https://www.googleapis.com/auth/forms.body',
      'https://www.googleapis.com/auth/forms.body.readonly',
      'https://www.googleapis.com/auth/forms.responses.readonly'
    ]
  },
  endpoints: {
    base_url: 'https://forms.googleapis.com/v1',
    forms: '/forms',
    form: '/forms/{formId}',
    responses: '/forms/{formId}/responses',
    response: '/forms/{formId}/responses/{responseId}',
    watches: '/forms/{formId}/watches'
  },
  webhook_support: true, // Via Cloud Pub/Sub
  rate_limits: {
    read_requests_per_minute: 975,
    write_requests_per_minute: 375
  },
  sandbox_available: false,
  verified: false,
  supported_actions: [
    // Form Actions
    {
      id: 'form_create',
      name: 'Create Form',
      description: 'Create a new Google Form',
      category: 'Form',
      icon: 'file-plus',
      verified: false,
      api: {
        endpoint: '/forms',
        method: 'POST',
        baseUrl: 'https://forms.googleapis.com/v1',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer {accessToken}'
        },
        paramMapping: {
          title: 'info.title'
        }
      },
      inputSchema: {
        title: {
          type: 'string',
          required: true,
          label: 'Form Title',
          placeholder: 'Customer Feedback Survey',
          description: 'The title of the form (Google Forms API only allows title during creation. Use batchUpdate to add description and questions after creation.)',
          aiControlled: true,
          aiDescription: 'Generate a clear, descriptive form title that reflects the purpose of the form'
        }
      },
      outputSchema: {
        formId: { type: 'string', description: 'Created form ID' },
        responderUri: { type: 'string', description: 'URL for users to fill the form' },
        formUri: { type: 'string', description: 'URL to edit the form' }
      }
    },
    {
      id: 'form_get',
      name: 'Get Form',
      description: 'Retrieve a form by ID',
      category: 'Form',
      icon: 'file-text',
      verified: false,
      api: {
        endpoint: '/forms/{formId}',
        method: 'GET',
        baseUrl: 'https://forms.googleapis.com/v1',
        headers: {
          'Authorization': 'Bearer {accessToken}'
        },
        paramMapping: {
          formId: 'formId'
        }
      },
      inputSchema: {
        formId: {
          type: 'string',
          required: true,
          label: 'Form ID',
          placeholder: '1FAIpQLSe...',
          description: 'The ID of the form to retrieve',
          aiControlled: false
        }
      },
      outputSchema: {
        form: { type: 'object', description: 'Form information including all questions and settings' }
      }
    },
    {
      id: 'form_update',
      name: 'Update Form',
      description: 'Update form title, description, or settings',
      category: 'Form',
      icon: 'edit',
      verified: false,
      api: {
        endpoint: '/forms/{formId}:batchUpdate',
        method: 'POST',
        baseUrl: 'https://forms.googleapis.com/v1',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer {accessToken}'
        },
        paramMapping: {
          formId: 'formId',
          requests: 'requests'
        }
      },
      inputSchema: {
        formId: {
          type: 'string',
          required: true,
          label: 'Form ID',
          placeholder: '1FAIpQLSe...',
          description: 'The ID of the form to update',
          aiControlled: false
        },
        title: {
          type: 'string',
          label: 'Form Title',
          description: 'New form title',
          aiControlled: true,
          aiDescription: 'Generate a clear, descriptive form title that reflects the purpose of the form'
        },
        description: {
          type: 'string',
          label: 'Description',
          inputType: 'textarea',
          description: 'New form description',
          aiControlled: true,
          aiDescription: 'Generate a helpful form description that explains the purpose of the form and provides instructions to respondents'
        }
      },
      outputSchema: {
        success: { type: 'boolean', description: 'Whether update was successful' },
        form: { type: 'object', description: 'Updated form information' }
      }
    },

    // Question Actions
    {
      id: 'question_create',
      name: 'Add Question',
      description: 'Add a question to a form',
      category: 'Question',
      icon: 'help-circle',
      verified: false,
      api: {
        endpoint: '/forms/{formId}:batchUpdate',
        method: 'POST',
        baseUrl: 'https://forms.googleapis.com/v1',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer {accessToken}'
        },
        paramMapping: {
          formId: 'formId',
          requests: 'requests'
        }
      },
      inputSchema: {
        formId: {
          type: 'string',
          required: true,
          label: 'Form ID',
          placeholder: '1FAIpQLSe...',
          description: 'The ID of the form',
          aiControlled: false
        },
        questionTitle: {
          type: 'string',
          required: true,
          label: 'Question Title',
          placeholder: 'What is your name?',
          description: 'The question text',
          aiControlled: true,
          aiDescription: 'Generate a clear, well-phrased question that is easy for respondents to understand'
        },
        questionType: {
          type: 'select',
          required: true,
          label: 'Question Type',
          default: 'RADIO',
          options: [
            { label: 'Multiple Choice', value: 'RADIO' },
            { label: 'Checkboxes', value: 'CHECKBOX' },
            { label: 'Dropdown', value: 'DROP_DOWN' },
            { label: 'Short Answer', value: 'SHORT_ANSWER' },
            { label: 'Paragraph', value: 'PARAGRAPH' },
            { label: 'Linear Scale', value: 'SCALE' },
            { label: 'Multiple Choice Grid', value: 'GRID' },
            { label: 'Checkbox Grid', value: 'CHECKBOX_GRID' },
            { label: 'Date', value: 'DATE' },
            { label: 'Time', value: 'TIME' }
          ],
          description: 'Type of question',
          aiControlled: false
        },
        required: {
          type: 'boolean',
          label: 'Required',
          default: false,
          description: 'Whether this question is required',
          aiControlled: false
        },
        options: {
          type: 'array',
          label: 'Options',
          description: 'Answer options (for multiple choice, checkboxes, dropdown)',
          itemSchema: {
            value: { type: 'string' }
          },
          displayOptions: {
            show: {
              questionType: ['RADIO', 'CHECKBOX', 'DROP_DOWN']
            }
          },
          aiControlled: true,
          aiDescription: 'Generate appropriate answer options that cover the likely responses for this question'
        },
        description: {
          type: 'string',
          label: 'Description',
          inputType: 'textarea',
          placeholder: 'Additional help text...',
          description: 'Help text for the question',
          aiControlled: true,
          aiDescription: 'Generate helpful description text that clarifies the question or provides additional guidance to respondents'
        }
      },
      outputSchema: {
        questionId: { type: 'string', description: 'Created question ID' },
        success: { type: 'boolean', description: 'Whether creation was successful' }
      }
    },

    // Response Actions
    {
      id: 'responses_list',
      name: 'List Responses',
      description: 'Get all responses for a form',
      category: 'Response',
      icon: 'list',
      verified: false,
      api: {
        endpoint: '/forms/{formId}/responses',
        method: 'GET',
        baseUrl: 'https://forms.googleapis.com/v1',
        headers: {
          'Authorization': 'Bearer {accessToken}'
        },
        paramMapping: {
          formId: 'formId',
          pageSize: 'pageSize',
          pageToken: 'pageToken',
          filter: 'filter'
        }
      },
      inputSchema: {
        formId: {
          type: 'string',
          required: true,
          label: 'Form ID',
          placeholder: '1FAIpQLSe...',
          description: 'The ID of the form',
          aiControlled: false
        },
        returnAll: {
          type: 'boolean',
          label: 'Return All',
          default: false,
          description: 'Whether to return all responses',
          aiControlled: false
        },
        limit: {
          type: 'number',
          label: 'Limit',
          default: 100,
          min: 1,
          max: 1000,
          description: 'Maximum number of responses to return',
          displayOptions: {
            show: {
              returnAll: [false]
            }
          },
          aiControlled: false
        },
        filter: {
          type: 'string',
          label: 'Filter',
          placeholder: 'timestamp > "2024-01-01T00:00:00Z"',
          description: 'Filter expression (optional)',
          aiControlled: false
        }
      },
      outputSchema: {
        responses: { type: 'array', description: 'Array of form responses' },
        nextPageToken: { type: 'string', description: 'Token for next page of results' }
      }
    },
    {
      id: 'response_get',
      name: 'Get Response',
      description: 'Get a specific response by ID',
      category: 'Response',
      icon: 'file-text',
      verified: false,
      api: {
        endpoint: '/forms/{formId}/responses/{responseId}',
        method: 'GET',
        baseUrl: 'https://forms.googleapis.com/v1',
        headers: {
          'Authorization': 'Bearer {accessToken}'
        },
        paramMapping: {
          formId: 'formId',
          responseId: 'responseId'
        }
      },
      inputSchema: {
        formId: {
          type: 'string',
          required: true,
          label: 'Form ID',
          placeholder: '1FAIpQLSe...',
          aiControlled: false
        },
        responseId: {
          type: 'string',
          required: true,
          label: 'Response ID',
          placeholder: 'ACYDBNj...',
          description: 'The ID of the response',
          aiControlled: false
        }
      },
      outputSchema: {
        response: { type: 'object', description: 'Response data including all answers' }
      }
    },

    // Watch Actions (for setting up Cloud Pub/Sub)
    {
      id: 'watch_create',
      name: 'Create Watch',
      description: 'Set up a watch to receive form response notifications',
      category: 'Watch',
      icon: 'eye',
      verified: false,
      api: {
        endpoint: '/forms/{formId}/watches',
        method: 'POST',
        baseUrl: 'https://forms.googleapis.com/v1',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer {accessToken}'
        },
        paramMapping: {
          formId: 'formId',
          watch: 'watch'
        }
      },
      inputSchema: {
        formId: {
          type: 'string',
          required: true,
          label: 'Form ID',
          placeholder: '1FAIpQLSe...',
          aiControlled: false
        },
        eventType: {
          type: 'select',
          required: true,
          label: 'Event Type',
          default: 'RESPONSES',
          options: [
            { label: 'New Responses', value: 'RESPONSES' },
            { label: 'Schema Changes', value: 'SCHEMA' }
          ],
          description: 'Type of events to watch for',
          aiControlled: false
        },
        topicName: {
          type: 'string',
          required: true,
          label: 'Pub/Sub Topic',
          placeholder: 'projects/my-project/topics/form-responses',
          description: 'Google Cloud Pub/Sub topic name',
          aiControlled: false
        }
      },
      outputSchema: {
        watchId: { type: 'string', description: 'Created watch ID' },
        expireTime: { type: 'string', description: 'When the watch expires' }
      }
    },
    {
      id: 'watch_renew',
      name: 'Renew Watch',
      description: 'Renew an existing watch before it expires',
      category: 'Watch',
      icon: 'refresh-cw',
      verified: false,
      api: {
        endpoint: '/forms/{formId}/watches/{watchId}:renew',
        method: 'POST',
        baseUrl: 'https://forms.googleapis.com/v1',
        headers: {
          'Authorization': 'Bearer {accessToken}'
        },
        paramMapping: {
          formId: 'formId',
          watchId: 'watchId'
        }
      },
      inputSchema: {
        formId: {
          type: 'string',
          required: true,
          label: 'Form ID',
          placeholder: '1FAIpQLSe...',
          aiControlled: false
        },
        watchId: {
          type: 'string',
          required: true,
          label: 'Watch ID',
          description: 'The ID of the watch to renew',
          aiControlled: false
        }
      },
      outputSchema: {
        expireTime: { type: 'string', description: 'New expiration time' }
      }
    },
    {
      id: 'watch_delete',
      name: 'Delete Watch',
      description: 'Delete a watch to stop receiving notifications',
      category: 'Watch',
      icon: 'eye-off',
      verified: false,
      api: {
        endpoint: '/forms/{formId}/watches/{watchId}',
        method: 'DELETE',
        baseUrl: 'https://forms.googleapis.com/v1',
        headers: {
          'Authorization': 'Bearer {accessToken}'
        },
        paramMapping: {
          formId: 'formId',
          watchId: 'watchId'
        }
      },
      inputSchema: {
        formId: {
          type: 'string',
          required: true,
          label: 'Form ID',
          placeholder: '1FAIpQLSe...',
          aiControlled: false
        },
        watchId: {
          type: 'string',
          required: true,
          label: 'Watch ID',
          description: 'The ID of the watch to delete',
          aiControlled: false
        }
      },
      outputSchema: {
        success: { type: 'boolean', description: 'Whether deletion was successful' }
      }
    }
  ],
  supported_triggers: [
    {
      id: 'response_received',
      name: 'New Response Received',
      description: 'Triggered when a new form response is submitted',
      eventType: 'RESPONSES',
      verified: false,
      icon: 'inbox',
      webhookRequired: true,
      inputSchema: {
        formId: {
          type: 'string',
          required: true,
          label: 'Form ID',
          placeholder: '1FAIpQLSe...',
          description: 'The ID of the form to monitor',
          aiControlled: false
        },
        pubsubTopic: {
          type: 'string',
          required: true,
          label: 'Pub/Sub Topic',
          placeholder: 'projects/my-project/topics/form-responses',
          description: 'Google Cloud Pub/Sub topic for notifications',
          aiControlled: false
        }
      },
      outputSchema: {
        responseId: { type: 'string', description: 'Response ID' },
        formId: { type: 'string', description: 'Form ID' },
        respondentEmail: { type: 'string', description: 'Respondent email (if collected)' },
        createTime: { type: 'string', description: 'When the response was submitted' },
        lastSubmittedTime: { type: 'string', description: 'Last submission time' },
        answers: { type: 'object', description: 'Response answers' }
      }
    },
    {
      id: 'form_schema_changed',
      name: 'Form Schema Changed',
      description: 'Triggered when the form structure is modified',
      eventType: 'SCHEMA',
      verified: false,
      icon: 'settings',
      webhookRequired: true,
      inputSchema: {
        formId: {
          type: 'string',
          required: true,
          label: 'Form ID',
          placeholder: '1FAIpQLSe...',
          description: 'The ID of the form to monitor',
          aiControlled: false
        },
        pubsubTopic: {
          type: 'string',
          required: true,
          label: 'Pub/Sub Topic',
          placeholder: 'projects/my-project/topics/form-schema',
          description: 'Google Cloud Pub/Sub topic for notifications',
          aiControlled: false
        }
      },
      outputSchema: {
        formId: { type: 'string', description: 'Form ID' },
        revisionId: { type: 'string', description: 'New revision ID' },
        changeTime: { type: 'string', description: 'When the change occurred' },
        changes: { type: 'array', description: 'Description of changes made' }
      }
    }
  ]
};
