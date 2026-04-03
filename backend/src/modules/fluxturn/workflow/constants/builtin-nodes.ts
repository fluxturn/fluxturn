/**
 * Built-in Node Type Definitions
 *
 * These are standalone nodes not tied to external connectors.
 * Following n8n's pattern of in-memory node definitions.
 *
 * NO DATABASE QUERIES - Everything loaded from TypeScript constants.
 */

export interface BuiltinNodeDefinition {
  type: string;
  name: string;
  category: string;
  description: string;
  is_trigger?: boolean;
  is_action?: boolean;
  is_builtin: boolean;
  icon?: string;
  config_schema?: any;
  input_schema?: any;
  output_schema?: any;
  examples?: any[];
}

/**
 * Built-in Trigger Nodes
 */
export const BUILTIN_TRIGGERS: BuiltinNodeDefinition[] = [
  {
    type: 'MANUAL_TRIGGER',
    name: 'Manual Trigger',
    category: 'trigger',
    description: 'Manually execute workflow',
    is_trigger: true,
    is_builtin: true,
    icon: 'play-circle',
    config_schema: {},
    output_schema: {
      triggeredAt: {
        type: 'string',
        description: 'Timestamp when workflow was triggered'
      },
      triggeredBy: {
        type: 'string',
        description: 'User who triggered the workflow'
      }
    }
  },
  {
    type: 'FORM_TRIGGER',
    name: 'Form Trigger',
    category: 'trigger',
    description: 'Trigger when a form is submitted',
    is_trigger: true,
    is_builtin: true,
    icon: 'file-text',
    config_schema: {
      formId: {
        type: 'string',
        required: true,
        label: 'Form ID',
        description: 'ID of the form to monitor for submissions',
        placeholder: 'form-12345'
      }
    },
    output_schema: {
      formData: {
        type: 'object',
        description: 'Submitted form data as key-value pairs'
      },
      submittedAt: {
        type: 'string',
        description: 'Submission timestamp'
      },
      submitterEmail: {
        type: 'string',
        description: 'Email of the person who submitted the form'
      },
      submitterId: {
        type: 'string',
        description: 'ID of the submitter'
      }
    }
  },
  {
    type: 'WEBHOOK_TRIGGER',
    name: 'Webhook Trigger',
    category: 'trigger',
    description: 'Trigger workflow via HTTP webhook',
    is_trigger: true,
    is_builtin: true,
    icon: 'webhook',
    config_schema: {
      path: {
        type: 'string',
        required: false,
        label: 'Webhook Path',
        description: 'Custom path for the webhook URL (optional)',
        placeholder: 'my-webhook'
      },
      authentication: {
        type: 'select',
        label: 'Authentication',
        options: [
          { label: 'None', value: 'none' },
          { label: 'API Key', value: 'apiKey' },
          { label: 'JWT Token', value: 'jwt' },
          { label: 'Basic Auth', value: 'basic' }
        ],
        default: 'none',
        description: 'Authentication method for webhook'
      },
      apiKey: {
        type: 'string',
        label: 'API Key',
        inputType: 'password',
        displayOptions: {
          show: { authentication: ['apiKey'] }
        }
      }
    },
    output_schema: {
      body: {
        type: 'object',
        description: 'Request body payload'
      },
      headers: {
        type: 'object',
        description: 'HTTP request headers'
      },
      query: {
        type: 'object',
        description: 'Query string parameters'
      },
      method: {
        type: 'string',
        description: 'HTTP method (GET, POST, etc.)'
      }
    }
  },
  {
    type: 'CHAT_TRIGGER',
    name: 'Chat Message Trigger',
    category: 'trigger',
    description: 'Trigger workflow when a chat message is received',
    is_trigger: true,
    is_builtin: true,
    icon: 'message-square',
    config_schema: {
      chatInterface: {
        type: 'select',
        label: 'Chat Interface',
        options: [
          { label: 'Web Chat Widget', value: 'web' },
          { label: 'Webhook', value: 'webhook' },
          { label: 'Embedded', value: 'embedded' }
        ],
        default: 'web',
        description: 'How users will send chat messages'
      },
      responseMode: {
        type: 'select',
        label: 'Response Mode',
        options: [
          { label: 'Immediate', value: 'immediate' },
          { label: 'Queued', value: 'queued' }
        ],
        default: 'immediate',
        description: 'How to handle incoming messages'
      }
    },
    output_schema: {
      message: {
        type: 'string',
        description: 'User message text'
      },
      userId: {
        type: 'string',
        description: 'Unique identifier for the user'
      },
      sessionId: {
        type: 'string',
        description: 'Chat session identifier'
      },
      timestamp: {
        type: 'string',
        description: 'Message timestamp'
      },
      metadata: {
        type: 'object',
        description: 'Additional message metadata'
      }
    }
  },
  {
    type: 'SCHEDULE_TRIGGER',
    name: 'Schedule Trigger',
    category: 'trigger',
    description: 'Trigger workflow on a schedule using cron',
    is_trigger: true,
    is_builtin: true,
    icon: 'clock',
    config_schema: {
      cron: {
        type: 'string',
        required: true,
        label: 'Cron Expression',
        description: 'Schedule in cron format',
        placeholder: '0 9 * * *',
        helpText: '0 9 * * * = Every day at 9:00 AM'
      },
      timezone: {
        type: 'string',
        label: 'Timezone',
        default: 'UTC',
        description: 'Timezone for schedule execution',
        placeholder: 'America/New_York'
      }
    },
    output_schema: {
      scheduledTime: {
        type: 'string',
        description: 'Scheduled execution time'
      },
      timezone: {
        type: 'string',
        description: 'Timezone used'
      }
    }
  }
];

/**
 * Built-in Action Nodes
 */
export const BUILTIN_ACTIONS: BuiltinNodeDefinition[] = [
  {
    type: 'HTTP_REQUEST',
    name: 'HTTP Request',
    category: 'action',
    description: 'Make HTTP API requests to any endpoint',
    is_action: true,
    is_builtin: true,
    icon: 'globe',
    config_schema: {
      method: {
        type: 'select',
        required: true,
        label: 'Method',
        options: [
          { label: 'GET', value: 'GET' },
          { label: 'POST', value: 'POST' },
          { label: 'PUT', value: 'PUT' },
          { label: 'PATCH', value: 'PATCH' },
          { label: 'DELETE', value: 'DELETE' }
        ],
        default: 'GET'
      },
      url: {
        type: 'string',
        required: true,
        label: 'URL',
        description: 'Full URL of the API endpoint',
        placeholder: 'https://api.example.com/v1/users'
      },
      headers: {
        type: 'object',
        label: 'Headers',
        description: 'HTTP headers as key-value pairs',
        default: { 'Content-Type': 'application/json' }
      },
      body: {
        type: 'string',
        inputType: 'textarea',
        label: 'Request Body',
        description: 'Request body (JSON for POST/PUT/PATCH)',
        displayOptions: {
          show: { method: ['POST', 'PUT', 'PATCH'] }
        }
      },
      authentication: {
        type: 'select',
        label: 'Authentication',
        options: [
          { label: 'None', value: 'none' },
          { label: 'Bearer Token', value: 'bearer' },
          { label: 'API Key', value: 'apiKey' },
          { label: 'Basic Auth', value: 'basic' }
        ],
        default: 'none'
      }
    },
    output_schema: {
      statusCode: {
        type: 'number',
        description: 'HTTP status code'
      },
      body: {
        type: 'object',
        description: 'Response body'
      },
      headers: {
        type: 'object',
        description: 'Response headers'
      }
    }
  },
  {
    type: 'SEND_EMAIL',
    name: 'Send Email',
    category: 'action',
    description: 'Send email via SMTP',
    is_action: true,
    is_builtin: true,
    icon: 'mail',
    config_schema: {
      to: {
        type: 'string',
        required: true,
        label: 'To',
        description: 'Recipient email address',
        placeholder: 'recipient@example.com'
      },
      subject: {
        type: 'string',
        required: true,
        label: 'Subject',
        description: 'Email subject line',
        placeholder: 'Your Subject Here'
      },
      body: {
        type: 'string',
        required: true,
        inputType: 'textarea',
        label: 'Email Body',
        description: 'Email content (supports HTML)',
        placeholder: 'Your message...'
      },
      cc: {
        type: 'string',
        label: 'CC',
        description: 'Carbon copy recipients (comma-separated)',
        placeholder: 'cc@example.com'
      },
      bcc: {
        type: 'string',
        label: 'BCC',
        description: 'Blind carbon copy recipients (comma-separated)',
        placeholder: 'bcc@example.com'
      },
      from: {
        type: 'string',
        label: 'From',
        description: 'Sender email address',
        placeholder: 'sender@example.com'
      }
    },
    output_schema: {
      messageId: {
        type: 'string',
        description: 'Email message ID'
      },
      sentAt: {
        type: 'string',
        description: 'Timestamp when email was sent'
      }
    }
  },
  {
    type: 'TRANSFORM_DATA',
    name: 'Transform Data',
    category: 'action',
    description: 'Transform and manipulate data using JavaScript code',
    is_action: true,
    is_builtin: true,
    icon: 'code',
    config_schema: {
      code: {
        type: 'string',
        required: true,
        inputType: 'code',
        label: 'Transformation Code',
        description: 'JavaScript code to transform input data',
        placeholder: 'return items.map(item => ({ ...item, processed: true }));'
      },
      language: {
        type: 'select',
        label: 'Language',
        options: [
          { label: 'JavaScript', value: 'javascript' },
          { label: 'Python', value: 'python' }
        ],
        default: 'javascript'
      }
    },
    output_schema: {
      result: {
        type: 'any',
        description: 'Transformed data'
      }
    }
  },
  {
    type: 'IF_CONDITION',
    name: 'Condition (IF)',
    category: 'action',
    description: 'Conditional routing based on data evaluation',
    is_action: true,
    is_builtin: true,
    icon: 'git-branch',
    config_schema: {
      conditions: {
        type: 'array',
        label: 'Conditions',
        description: 'List of conditions to evaluate',
        itemSchema: {
          field: {
            type: 'string',
            required: true,
            label: 'Field',
            description: 'Field to check'
          },
          operator: {
            type: 'select',
            required: true,
            label: 'Operator',
            options: [
              { label: 'Equals (=)', value: 'equals' },
              { label: 'Not Equals (≠)', value: 'notEquals' },
              { label: 'Contains', value: 'contains' },
              { label: 'Greater Than (>)', value: 'greaterThan' },
              { label: 'Less Than (<)', value: 'lessThan' },
              { label: 'Greater or Equal (≥)', value: 'greaterThanOrEqual' },
              { label: 'Less or Equal (≤)', value: 'lessThanOrEqual' },
              { label: 'Is Empty', value: 'isEmpty' },
              { label: 'Is Not Empty', value: 'isNotEmpty' }
            ]
          },
          value: {
            type: 'string',
            required: true,
            label: 'Value',
            description: 'Value to compare against'
          }
        }
      },
      combineOperation: {
        type: 'select',
        label: 'Combine Conditions',
        options: [
          { label: 'AND (all must match)', value: 'and' },
          { label: 'OR (any can match)', value: 'or' }
        ],
        default: 'and',
        description: 'How to combine multiple conditions'
      }
    },
    output_schema: {
      matched: {
        type: 'boolean',
        description: 'Whether the condition(s) matched'
      },
      branch: {
        type: 'string',
        description: 'Branch taken: "true" or "false"'
      }
    }
  },
  {
    type: 'DATABASE_QUERY',
    name: 'Database Query',
    category: 'action',
    description: 'Execute SQL queries on PostgreSQL database',
    is_action: true,
    is_builtin: true,
    icon: 'database',
    config_schema: {
      operation: {
        type: 'select',
        required: true,
        label: 'Operation',
        options: [
          { label: 'Select (Read)', value: 'select' },
          { label: 'Insert (Create)', value: 'insert' },
          { label: 'Update (Modify)', value: 'update' },
          { label: 'Delete (Remove)', value: 'delete' },
          { label: 'Custom Query', value: 'custom' }
        ],
        default: 'select'
      },
      query: {
        type: 'string',
        required: true,
        inputType: 'code',
        label: 'SQL Query',
        description: 'SQL query to execute (supports parameterized queries)',
        placeholder: 'SELECT * FROM users WHERE id = $1'
      },
      parameters: {
        type: 'array',
        label: 'Query Parameters',
        description: 'Parameters for prepared statements (prevents SQL injection)',
        itemSchema: {
          value: {
            type: 'string',
            label: 'Parameter Value'
          }
        }
      }
    },
    output_schema: {
      rows: {
        type: 'array',
        description: 'Query result rows'
      },
      rowCount: {
        type: 'number',
        description: 'Number of rows affected/returned'
      }
    }
  },
  {
    type: 'SEND_SLACK',
    name: 'Send Slack Message',
    category: 'action',
    description: 'Send message to Slack channel (built-in)',
    is_action: true,
    is_builtin: true,
    icon: 'message-square',
    config_schema: {
      channel: {
        type: 'string',
        required: true,
        label: 'Channel',
        description: 'Slack channel name or ID',
        placeholder: '#general'
      },
      message: {
        type: 'string',
        required: true,
        inputType: 'textarea',
        label: 'Message',
        description: 'Message text to send',
        placeholder: 'Your message here...'
      },
      username: {
        type: 'string',
        label: 'Bot Username',
        description: 'Display name for the bot',
        placeholder: 'Workflow Bot'
      },
      emoji: {
        type: 'string',
        label: 'Bot Emoji',
        description: 'Bot icon emoji',
        placeholder: ':robot_face:'
      }
    },
    output_schema: {
      messageId: {
        type: 'string',
        description: 'Slack message ID'
      },
      timestamp: {
        type: 'string',
        description: 'Message timestamp'
      }
    }
  },
  {
    type: 'DELAY',
    name: 'Delay/Wait',
    category: 'action',
    description: 'Pause workflow execution for a specified duration',
    is_action: true,
    is_builtin: true,
    icon: 'timer',
    config_schema: {
      amount: {
        type: 'number',
        required: true,
        label: 'Amount',
        description: 'Duration to wait',
        default: 1,
        min: 1
      },
      unit: {
        type: 'select',
        required: true,
        label: 'Unit',
        options: [
          { label: 'Seconds', value: 'seconds' },
          { label: 'Minutes', value: 'minutes' },
          { label: 'Hours', value: 'hours' },
          { label: 'Days', value: 'days' }
        ],
        default: 'seconds'
      }
    },
    output_schema: {
      delayedFor: {
        type: 'number',
        description: 'Milliseconds delayed'
      }
    }
  },
  {
    type: 'SWITCH',
    name: 'Switch',
    category: 'action',
    description: 'Route data to different branches based on rules',
    is_action: true,
    is_builtin: true,
    icon: 'workflow',
    config_schema: {
      mode: {
        type: 'select',
        label: 'Mode',
        options: [
          { label: 'Rules', value: 'rules' },
          { label: 'Expression', value: 'expression' }
        ],
        default: 'rules'
      },
      rules: {
        type: 'array',
        label: 'Routing Rules',
        description: 'Define rules to match and route data'
      }
    },
    output_schema: {
      routed: {
        type: 'any',
        description: 'Data routed to appropriate branch'
      }
    }
  },
  {
    type: 'FILTER',
    name: 'Filter Items',
    category: 'action',
    description: 'Filter array items based on conditions',
    is_action: true,
    is_builtin: true,
    icon: 'filter',
    config_schema: {
      conditions: {
        type: 'array',
        label: 'Filter Conditions',
        itemSchema: {
          field: { type: 'string', required: true },
          operator: { type: 'string', required: true },
          value: { type: 'string', required: true }
        }
      }
    },
    output_schema: {
      filtered: {
        type: 'array',
        description: 'Filtered items'
      },
      count: {
        type: 'number',
        description: 'Number of items after filtering'
      }
    }
  },
  {
    type: 'LOOP',
    name: 'Loop Over Items',
    category: 'action',
    description: 'Iterate over array items one by one',
    is_action: true,
    is_builtin: true,
    icon: 'repeat',
    config_schema: {
      items: {
        type: 'string',
        required: true,
        label: 'Items Expression',
        description: 'Expression resolving to array',
        placeholder: '{{node_1.data.items}}'
      }
    },
    output_schema: {
      item: {
        type: 'any',
        description: 'Current item in iteration'
      },
      index: {
        type: 'number',
        description: 'Current index'
      }
    }
  },
  {
    type: 'WAIT',
    name: 'Wait/Pause',
    category: 'action',
    description: 'Pause workflow execution',
    is_action: true,
    is_builtin: true,
    icon: 'pause-circle',
    config_schema: {
      resume: {
        type: 'select',
        label: 'Resume Mode',
        options: [
          { label: 'After Time Interval', value: 'timeInterval' },
          { label: 'At Specific Time', value: 'specificTime' },
          { label: 'On Webhook', value: 'webhook' },
          { label: 'On Form Submit', value: 'form' }
        ],
        default: 'timeInterval'
      },
      amount: {
        type: 'number',
        label: 'Wait Duration',
        default: 1,
        displayOptions: {
          show: { resume: ['timeInterval'] }
        }
      },
      unit: {
        type: 'select',
        label: 'Time Unit',
        options: [
          { label: 'Seconds', value: 'seconds' },
          { label: 'Minutes', value: 'minutes' },
          { label: 'Hours', value: 'hours' }
        ],
        default: 'seconds',
        displayOptions: {
          show: { resume: ['timeInterval'] }
        }
      }
    }
  },
  {
    type: 'MERGE',
    name: 'Merge Data',
    category: 'action',
    description: 'Combine data from multiple inputs',
    is_action: true,
    is_builtin: true,
    icon: 'git-merge',
    config_schema: {
      mode: {
        type: 'select',
        label: 'Merge Mode',
        options: [
          { label: 'Append', value: 'append' },
          { label: 'Combine', value: 'combine' },
          { label: 'Wait for All', value: 'waitAll' }
        ],
        default: 'append'
      }
    }
  },
  {
    type: 'SPLIT',
    name: 'Split Data',
    category: 'action',
    description: 'Split data into multiple outputs',
    is_action: true,
    is_builtin: true,
    icon: 'git-branch',
    config_schema: {
      mode: {
        type: 'select',
        label: 'Split Mode',
        options: [
          { label: 'Duplicate', value: 'duplicate' },
          { label: 'Round Robin', value: 'roundRobin' },
          { label: 'By Field', value: 'byField' }
        ],
        default: 'duplicate'
      },
      numberOfOutputs: {
        type: 'number',
        label: 'Number of Outputs',
        default: 2,
        min: 2
      }
    }
  },
  {
    type: 'RUN_CODE',
    name: 'Run Custom Code',
    category: 'action',
    description: 'Execute custom JavaScript code',
    is_action: true,
    is_builtin: true,
    icon: 'code-2',
    config_schema: {
      code: {
        type: 'string',
        required: true,
        inputType: 'code',
        label: 'JavaScript Code',
        description: 'Code to execute',
        placeholder: 'return items.map(item => ({ ...item, processed: true }));'
      }
    }
  },
  {
    type: 'SET',
    name: 'Set Fields',
    category: 'action',
    description: 'Add, modify, or remove fields from data',
    is_action: true,
    is_builtin: true,
    icon: 'settings',
    config_schema: {
      fields: {
        type: 'array',
        label: 'Fields to Set',
        itemSchema: {
          name: {
            type: 'string',
            required: true,
            label: 'Field Name'
          },
          value: {
            type: 'string',
            label: 'Field Value'
          }
        }
      }
    }
  }
];

/**
 * Get all built-in node types (triggers + actions)
 */
export const getAllBuiltinNodes = (): BuiltinNodeDefinition[] => {
  return [...BUILTIN_TRIGGERS, ...BUILTIN_ACTIONS];
};

/**
 * Find a built-in node by type (O(n) but small n)
 */
export const getBuiltinNode = (type: string): BuiltinNodeDefinition | undefined => {
  return getAllBuiltinNodes().find(node => node.type === type);
};

/**
 * Get all built-in triggers
 */
export const getBuiltinTriggers = (): BuiltinNodeDefinition[] => {
  return BUILTIN_TRIGGERS;
};

/**
 * Get all built-in actions
 */
export const getBuiltinActions = (): BuiltinNodeDefinition[] => {
  return BUILTIN_ACTIONS;
};

/**
 * Check if a node type is a built-in type
 */
export const isBuiltinNode = (type: string): boolean => {
  return getAllBuiltinNodes().some(node => node.type === type);
};

/**
 * Get built-in nodes by category
 */
export const getBuiltinNodesByCategory = (category: string): BuiltinNodeDefinition[] => {
  return getAllBuiltinNodes().filter(node => node.category === category);
};
