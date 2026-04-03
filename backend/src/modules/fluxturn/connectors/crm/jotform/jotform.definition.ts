import { ConnectorDefinition } from '../../shared';

/**
 * Jotform Connector Definition
 *
 * Jotform is an online form builder that allows users to create forms and collect submissions.
 * This connector provides comprehensive form and submission management capabilities.
 *
 * Authentication: API Key only (no OAuth available)
 * API Documentation: https://api.jotform.com/docs/
 *
 * Features:
 * - Form management (get, list, questions)
 * - Submission management (CRUD operations)
 * - Webhook triggers for real-time form submissions
 * - Multi-region support (US, EU, HIPAA)
 */
export const JOTFORM_CONNECTOR: ConnectorDefinition = {
  name: 'jotform',
  display_name: 'Jotform',
  category: 'forms',
  description: 'Online form builder for creating forms, surveys, and collecting submissions with powerful automation capabilities',
  auth_type: 'api_key',

  auth_fields: [
    {
      key: 'apiKey',
      label: 'API Key',
      type: 'password',
      required: true,
      placeholder: 'Enter your Jotform API Key',
      description: 'Your Jotform API Key from account settings',
      helpUrl: 'https://www.jotform.com/myaccount/api',
      helpText: 'How to get your API Key'
    },
    {
      key: 'apiDomain',
      label: 'API Domain',
      type: 'select',
      required: true,
      default: 'api.jotform.com',
      options: [
        { label: 'Standard (api.jotform.com)', value: 'api.jotform.com' },
        { label: 'EU (eu-api.jotform.com)', value: 'eu-api.jotform.com' },
        { label: 'HIPAA (hipaa-api.jotform.com)', value: 'hipaa-api.jotform.com' }
      ],
      description: 'Select the API domain for your Jotform account region',
      helpText: "Use 'eu-api.jotform.com' if your account is based in Europe, or 'hipaa-api.jotform.com' for HIPAA-compliant accounts"
    }
  ],

  endpoints: {
    base_url: 'https://{apiDomain}',
    user: {
      info: '/user',
      usage: '/user/usage',
      forms: '/user/forms',
      submissions: '/user/submissions'
    },
    form: {
      get: '/form/{formID}',
      questions: '/form/{formID}/questions',
      properties: '/form/{formID}/properties',
      submissions: '/form/{formID}/submissions',
      webhooks: '/form/{formID}/webhooks',
      create: '/form',
      delete: '/form/{formID}'
    },
    submission: {
      get: '/submission/{submissionID}',
      create: '/form/{formID}/submissions',
      update: '/submission/{submissionID}',
      delete: '/submission/{submissionID}'
    }
  },

  webhook_support: true,
  rate_limits: {
    requests_per_day: 1000
  },

  supported_actions: [
    // ============================================
    // FORM OPERATIONS
    // ============================================
    {
      id: 'get_form',
      name: 'Get Form',
      description: 'Retrieve detailed information about a specific form',
      category: 'Forms',
      icon: 'file-text',
      verified: false,
      api: {
        endpoint: '/form/{formID}',
        method: 'GET',
        baseUrl: 'https://{apiDomain}',
        headers: {
          'APIKEY': '{apiKey}'
        },
        paramMapping: {
          formId: 'formID'
        }
      },
      inputSchema: {
        formId: {
          type: 'string',
          required: true,
          label: 'Form ID',
          placeholder: '123456789012345',
          description: 'The unique ID of the form to retrieve',
          aiControlled: false
        }
      },
      outputSchema: {
        id: { type: 'string', description: 'Form ID' },
        title: { type: 'string', description: 'Form title' },
        status: { type: 'string', description: 'Form status (ENABLED/DISABLED)' },
        created_at: { type: 'string', description: 'Creation timestamp' },
        updated_at: { type: 'string', description: 'Last update timestamp' },
        count: { type: 'number', description: 'Number of submissions' },
        new: { type: 'number', description: 'Number of new submissions' },
        url: { type: 'string', description: 'Form URL' }
      }
    },
    {
      id: 'list_forms',
      name: 'List Forms',
      description: 'Get a list of all forms in your account',
      category: 'Forms',
      icon: 'list',
      verified: false,
      api: {
        endpoint: '/user/forms',
        method: 'GET',
        baseUrl: 'https://{apiDomain}',
        headers: {
          'APIKEY': '{apiKey}'
        },
        paramMapping: {
          limit: 'limit',
          offset: 'offset',
          filter: 'filter',
          orderBy: 'orderby'
        }
      },
      inputSchema: {
        limit: {
          type: 'number',
          label: 'Limit',
          default: 20,
          min: 1,
          max: 1000,
          description: 'Maximum number of forms to return (1-1000)',
          displayOptions: {
            hide: {
              returnAll: [true]
            }
          },
          aiControlled: false
        },
        offset: {
          type: 'number',
          label: 'Offset',
          default: 0,
          min: 0,
          description: 'Number of forms to skip for pagination',
          aiControlled: false
        },
        returnAll: {
          type: 'boolean',
          label: 'Return All',
          default: false,
          description: 'Return all forms (ignores limit)',
          aiControlled: false
        },
        filter: {
          type: 'string',
          label: 'Filter',
          placeholder: '{"status":"ENABLED"}',
          description: 'JSON string to filter forms (e.g., {"status":"ENABLED"})',
          aiControlled: false
        },
        orderBy: {
          type: 'select',
          label: 'Order By',
          default: 'created_at',
          options: [
            { label: 'Created Date', value: 'created_at' },
            { label: 'Updated Date', value: 'updated_at' },
            { label: 'Title', value: 'title' },
            { label: 'Count', value: 'count' }
          ],
          description: 'Field to sort forms by',
          aiControlled: false
        }
      },
      outputSchema: {
        forms: {
          type: 'array',
          description: 'Array of form objects',
          properties: {
            id: { type: 'string' },
            title: { type: 'string' },
            status: { type: 'string' },
            count: { type: 'number' },
            url: { type: 'string' }
          }
        },
        totalCount: { type: 'number', description: 'Total number of forms' }
      }
    },
    {
      id: 'get_form_questions',
      name: 'Get Form Questions',
      description: 'Retrieve all questions/fields from a form',
      category: 'Forms',
      icon: 'help-circle',
      verified: false,
      api: {
        endpoint: '/form/{formID}/questions',
        method: 'GET',
        baseUrl: 'https://{apiDomain}',
        headers: {
          'APIKEY': '{apiKey}'
        },
        paramMapping: {
          formId: 'formID'
        }
      },
      inputSchema: {
        formId: {
          type: 'string',
          required: true,
          label: 'Form ID',
          placeholder: '123456789012345',
          description: 'The unique ID of the form',
          aiControlled: false
        }
      },
      outputSchema: {
        questions: {
          type: 'object',
          description: 'Object containing all form questions indexed by question ID',
          properties: {
            qid: { type: 'string', description: 'Question ID' },
            name: { type: 'string', description: 'Question name/identifier' },
            text: { type: 'string', description: 'Question text/label' },
            type: { type: 'string', description: 'Question type (e.g., control_textbox, control_email)' },
            order: { type: 'string', description: 'Question order in form' },
            required: { type: 'string', description: 'Whether question is required (Yes/No)' }
          }
        }
      }
    },
    {
      id: 'get_form_submissions',
      name: 'Get Form Submissions',
      description: 'Retrieve all submissions for a specific form',
      category: 'Forms',
      icon: 'inbox',
      verified: false,
      api: {
        endpoint: '/form/{formID}/submissions',
        method: 'GET',
        baseUrl: 'https://{apiDomain}',
        headers: {
          'APIKEY': '{apiKey}'
        },
        paramMapping: {
          formId: 'formID',
          limit: 'limit',
          offset: 'offset',
          filter: 'filter',
          orderBy: 'orderby'
        }
      },
      inputSchema: {
        formId: {
          type: 'string',
          required: true,
          label: 'Form ID',
          placeholder: '123456789012345',
          description: 'The unique ID of the form',
          aiControlled: false
        },
        limit: {
          type: 'number',
          label: 'Limit',
          default: 20,
          min: 1,
          max: 1000,
          description: 'Maximum number of submissions to return',
          displayOptions: {
            hide: {
              returnAll: [true]
            }
          },
          aiControlled: false
        },
        offset: {
          type: 'number',
          label: 'Offset',
          default: 0,
          min: 0,
          description: 'Number of submissions to skip for pagination',
          aiControlled: false
        },
        returnAll: {
          type: 'boolean',
          label: 'Return All',
          default: false,
          description: 'Return all submissions (ignores limit)',
          aiControlled: false
        },
        filter: {
          type: 'string',
          label: 'Filter',
          placeholder: '{"status":"ACTIVE"}',
          description: 'JSON string to filter submissions',
          aiControlled: false
        },
        orderBy: {
          type: 'select',
          label: 'Order By',
          default: 'created_at',
          options: [
            { label: 'Created Date', value: 'created_at' },
            { label: 'Updated Date', value: 'updated_at' },
            { label: 'ID', value: 'id' }
          ],
          description: 'Field to sort submissions by',
          aiControlled: false
        }
      },
      outputSchema: {
        submissions: {
          type: 'array',
          description: 'Array of submission objects',
          properties: {
            id: { type: 'string' },
            form_id: { type: 'string' },
            ip: { type: 'string' },
            created_at: { type: 'string' },
            status: { type: 'string' },
            answers: { type: 'object' }
          }
        },
        totalCount: { type: 'number', description: 'Total number of submissions' }
      }
    },
    {
      id: 'delete_form',
      name: 'Delete Form',
      description: 'Delete a form permanently',
      category: 'Forms',
      icon: 'trash-2',
      verified: false,
      api: {
        endpoint: '/form/{formID}',
        method: 'DELETE',
        baseUrl: 'https://{apiDomain}',
        headers: {
          'APIKEY': '{apiKey}'
        },
        paramMapping: {
          formId: 'formID'
        }
      },
      inputSchema: {
        formId: {
          type: 'string',
          required: true,
          label: 'Form ID',
          placeholder: '123456789012345',
          description: 'The unique ID of the form to delete',
          aiControlled: false
        }
      },
      outputSchema: {
        success: { type: 'boolean', description: 'Whether deletion was successful' },
        message: { type: 'string', description: 'Status message' }
      }
    },

    // ============================================
    // SUBMISSION OPERATIONS
    // ============================================
    {
      id: 'get_submission',
      name: 'Get Submission',
      description: 'Retrieve a specific form submission by ID',
      category: 'Submissions',
      icon: 'file',
      verified: false,
      api: {
        endpoint: '/submission/{submissionID}',
        method: 'GET',
        baseUrl: 'https://{apiDomain}',
        headers: {
          'APIKEY': '{apiKey}'
        },
        paramMapping: {
          submissionId: 'submissionID'
        }
      },
      inputSchema: {
        submissionId: {
          type: 'string',
          required: true,
          label: 'Submission ID',
          placeholder: '123456789012345',
          description: 'The unique ID of the submission to retrieve',
          aiControlled: false
        }
      },
      outputSchema: {
        id: { type: 'string', description: 'Submission ID' },
        form_id: { type: 'string', description: 'Form ID' },
        ip: { type: 'string', description: 'Submitter IP address' },
        created_at: { type: 'string', description: 'Submission timestamp' },
        updated_at: { type: 'string', description: 'Last update timestamp' },
        status: { type: 'string', description: 'Submission status' },
        answers: { type: 'object', description: 'Submission answers' }
      }
    },
    {
      id: 'create_submission',
      name: 'Create Submission',
      description: 'Create a new form submission programmatically',
      category: 'Submissions',
      icon: 'plus-circle',
      verified: false,
      api: {
        endpoint: '/form/{formID}/submissions',
        method: 'POST',
        baseUrl: 'https://{apiDomain}',
        headers: {
          'APIKEY': '{apiKey}',
          'Content-Type': 'application/x-www-form-urlencoded'
        },
        paramMapping: {
          formId: 'formID'
        }
      },
      inputSchema: {
        formId: {
          type: 'string',
          required: true,
          label: 'Form ID',
          placeholder: '123456789012345',
          description: 'The unique ID of the form',
          aiControlled: false
        },
        submissionData: {
          type: 'object',
          required: true,
          label: 'Submission Data',
          inputType: 'json',
          placeholder: '{"q1_firstName": "John", "q2_lastName": "Doe"}',
          description: 'Form field values as key-value pairs (use question IDs as keys)',
          aiControlled: true,
          aiDescription: 'Generate form submission data with appropriate field values based on the form structure and context'
        }
      },
      outputSchema: {
        submissionID: { type: 'string', description: 'Created submission ID' },
        success: { type: 'boolean', description: 'Whether creation was successful' }
      }
    },
    {
      id: 'update_submission',
      name: 'Update Submission',
      description: 'Update an existing form submission',
      category: 'Submissions',
      icon: 'edit',
      verified: false,
      api: {
        endpoint: '/submission/{submissionID}',
        method: 'POST',
        baseUrl: 'https://{apiDomain}',
        headers: {
          'APIKEY': '{apiKey}',
          'Content-Type': 'application/x-www-form-urlencoded'
        },
        paramMapping: {
          submissionId: 'submissionID'
        }
      },
      inputSchema: {
        submissionId: {
          type: 'string',
          required: true,
          label: 'Submission ID',
          placeholder: '123456789012345',
          description: 'The unique ID of the submission to update',
          aiControlled: false
        },
        submissionData: {
          type: 'object',
          required: true,
          label: 'Updated Data',
          inputType: 'json',
          placeholder: '{"q1_firstName": "Jane"}',
          description: 'Updated field values as key-value pairs',
          aiControlled: true,
          aiDescription: 'Generate updated form field values based on the submission context and required changes'
        }
      },
      outputSchema: {
        success: { type: 'boolean', description: 'Whether update was successful' },
        submissionID: { type: 'string', description: 'Updated submission ID' }
      }
    },
    {
      id: 'delete_submission',
      name: 'Delete Submission',
      description: 'Delete a form submission permanently',
      category: 'Submissions',
      icon: 'trash-2',
      verified: false,
      api: {
        endpoint: '/submission/{submissionID}',
        method: 'DELETE',
        baseUrl: 'https://{apiDomain}',
        headers: {
          'APIKEY': '{apiKey}'
        },
        paramMapping: {
          submissionId: 'submissionID'
        }
      },
      inputSchema: {
        submissionId: {
          type: 'string',
          required: true,
          label: 'Submission ID',
          placeholder: '123456789012345',
          description: 'The unique ID of the submission to delete',
          aiControlled: false
        }
      },
      outputSchema: {
        success: { type: 'boolean', description: 'Whether deletion was successful' },
        message: { type: 'string', description: 'Status message' }
      }
    },

    // ============================================
    // USER OPERATIONS
    // ============================================
    {
      id: 'get_user_info',
      name: 'Get User Info',
      description: 'Retrieve information about the authenticated user account',
      category: 'User',
      icon: 'user',
      verified: false,
      api: {
        endpoint: '/user',
        method: 'GET',
        baseUrl: 'https://{apiDomain}',
        headers: {
          'APIKEY': '{apiKey}'
        }
      },
      inputSchema: {},
      outputSchema: {
        username: { type: 'string', description: 'Username' },
        email: { type: 'string', description: 'Email address' },
        name: { type: 'string', description: 'Full name' },
        account_type: { type: 'string', description: 'Account type/plan' },
        status: { type: 'string', description: 'Account status' },
        created_at: { type: 'string', description: 'Account creation date' },
        usage: { type: 'object', description: 'API usage statistics' }
      }
    },
    {
      id: 'get_user_usage',
      name: 'Get API Usage',
      description: 'Get API usage statistics for the current month',
      category: 'User',
      icon: 'activity',
      verified: false,
      api: {
        endpoint: '/user/usage',
        method: 'GET',
        baseUrl: 'https://{apiDomain}',
        headers: {
          'APIKEY': '{apiKey}'
        }
      },
      inputSchema: {},
      outputSchema: {
        submissions: { type: 'number', description: 'Number of submissions this month' },
        ssl_submissions: { type: 'number', description: 'SSL submissions count' },
        payments: { type: 'number', description: 'Payment transactions count' },
        uploads: { type: 'number', description: 'File uploads size in bytes' },
        api_calls: { type: 'number', description: 'API calls made this month' }
      }
    }
  ],

  supported_triggers: [
    {
      id: 'form_submission',
      name: 'Form Submission',
      description: 'Triggers when a new form submission is received (webhook-based)',
      eventType: 'jotform:form_submission',
      verified: false,
      icon: 'bell',
      webhookRequired: true,
      inputSchema: {
        formId: {
          type: 'string',
          required: true,
          label: 'Form ID',
          placeholder: '123456789012345',
          description: 'The form to monitor for new submissions'
        },
        resolveData: {
          type: 'boolean',
          label: 'Resolve Question Names',
          default: true,
          description: 'Convert question IDs (q1, q2) to friendly question names'
        },
        onlyAnswers: {
          type: 'boolean',
          label: 'Only Return Answers',
          default: true,
          description: 'Return only the form answers without metadata (submissionID, IP, etc.)'
        }
      },
      outputSchema: {
        submissionID: {
          type: 'string',
          description: 'Unique submission ID'
        },
        formID: {
          type: 'string',
          description: 'Form ID'
        },
        ip: {
          type: 'string',
          description: 'Submitter IP address'
        },
        created_at: {
          type: 'string',
          description: 'Submission timestamp'
        },
        status: {
          type: 'string',
          description: 'Submission status'
        },
        answers: {
          type: 'object',
          description: 'Form answers (structure varies based on resolveData and onlyAnswers settings)'
        }
      }
    }
  ]
};
