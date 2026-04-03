export const MetabaseDefinition = {
  name: 'metabase',
  display_name: 'Metabase',
  category: 'analytics',
  description: 'Business intelligence and analytics platform for querying databases and visualizing data',
  auth_type: 'basic_auth',

  auth_fields: [
    {
      key: 'url',
      label: 'Metabase URL',
      type: 'string',
      required: true,
      placeholder: 'https://metabase.example.com',
      description: 'The URL of your Metabase instance',
    },
    {
      key: 'username',
      label: 'Username',
      type: 'string',
      required: true,
      placeholder: 'your-email@example.com',
      description: 'Your Metabase username or email',
    },
    {
      key: 'password',
      label: 'Password',
      type: 'password',
      required: true,
      placeholder: 'Enter your password',
      description: 'Your Metabase password',
    },
  ],

  endpoints: {
    base_url: '{url}',
    session: '/api/session',
    user: '/api/user/current',
    questions: {
      get: '/api/card/{questionId}',
      getAll: '/api/card/',
      query: '/api/card/{questionId}/query/{format}',
    },
    metrics: {
      get: '/api/metric/{metricId}',
      getAll: '/api/metric/',
    },
    databases: {
      getAll: '/api/database/',
      getFields: '/api/database/{databaseId}/fields',
      add: '/api/database',
    },
    alerts: {
      get: '/api/alert/{alertId}',
      getAll: '/api/alert/',
    },
  },

  webhook_support: false,

  supported_actions: [
    // Questions
    {
      id: 'get_question',
      name: 'Get Question',
      description: 'Get a specific question by ID',
      category: 'Questions',
      icon: 'help-circle',
      api: {
        endpoint: '/api/card/{questionId}',
        method: 'GET',
        baseUrl: '{url}',
        headers: {
          'Content-Type': 'application/json',
          'X-Metabase-Session': '{sessionToken}',
        },
      },
      inputSchema: {
        questionId: {
          type: 'string',
          required: true,
          label: 'Question ID',
          placeholder: '123',
          description: 'The ID of the question to retrieve',
          aiControlled: false,
        },
      },
      outputSchema: {
        question: {
          type: 'object',
          description: 'The question object',
          properties: {
            id: { type: 'number' },
            name: { type: 'string' },
            description: { type: 'string' },
            display: { type: 'string' },
            database_id: { type: 'number' },
            table_id: { type: 'number' },
            created_at: { type: 'string' },
            updated_at: { type: 'string' },
          },
        },
      },
    },
    {
      id: 'get_all_questions',
      name: 'Get All Questions',
      description: 'Get all questions from your Metabase instance',
      category: 'Questions',
      icon: 'list',
      api: {
        endpoint: '/api/card/',
        method: 'GET',
        baseUrl: '{url}',
        headers: {
          'Content-Type': 'application/json',
          'X-Metabase-Session': '{sessionToken}',
        },
      },
      inputSchema: {},
      outputSchema: {
        questions: {
          type: 'array',
          description: 'Array of question objects',
        },
      },
    },
    {
      id: 'get_question_result',
      name: 'Get Question Result',
      description: 'Get the result of a question in a specific format (CSV, JSON, or XLSX)',
      category: 'Questions',
      icon: 'download',
      api: {
        endpoint: '/api/card/{questionId}/query/{format}',
        method: 'POST',
        baseUrl: '{url}',
        headers: {
          'Content-Type': 'application/json',
          'X-Metabase-Session': '{sessionToken}',
        },
        paramMapping: {
          questionId: 'questionId',
          format: 'format',
        },
      },
      inputSchema: {
        questionId: {
          type: 'string',
          required: true,
          label: 'Question ID',
          placeholder: '123',
          description: 'The ID of the question to query',
          aiControlled: false,
        },
        format: {
          type: 'select',
          required: true,
          label: 'Format',
          description: 'The format to return the results in',
          default: 'json',
          options: [
            { label: 'JSON', value: 'json' },
            { label: 'CSV', value: 'csv' },
            { label: 'XLSX', value: 'xlsx' },
          ],
          aiControlled: false,
        },
      },
      outputSchema: {
        result: {
          type: 'object',
          description: 'The query result in the requested format',
        },
      },
    },

    // Metrics
    {
      id: 'get_metric',
      name: 'Get Metric',
      description: 'Get a specific metric by ID',
      category: 'Metrics',
      icon: 'trending-up',
      api: {
        endpoint: '/api/metric/{metricId}',
        method: 'GET',
        baseUrl: '{url}',
        headers: {
          'Content-Type': 'application/json',
          'X-Metabase-Session': '{sessionToken}',
        },
      },
      inputSchema: {
        metricId: {
          type: 'string',
          required: true,
          label: 'Metric ID',
          placeholder: '123',
          description: 'The ID of the metric to retrieve',
          aiControlled: false,
        },
      },
      outputSchema: {
        metric: {
          type: 'object',
          description: 'The metric object',
        },
      },
    },
    {
      id: 'get_all_metrics',
      name: 'Get All Metrics',
      description: 'Get all metrics from your Metabase instance',
      category: 'Metrics',
      icon: 'bar-chart',
      api: {
        endpoint: '/api/metric/',
        method: 'GET',
        baseUrl: '{url}',
        headers: {
          'Content-Type': 'application/json',
          'X-Metabase-Session': '{sessionToken}',
        },
      },
      inputSchema: {},
      outputSchema: {
        metrics: {
          type: 'array',
          description: 'Array of metric objects',
        },
      },
    },

    // Databases
    {
      id: 'get_all_databases',
      name: 'Get All Databases',
      description: 'Get all databases connected to your Metabase instance',
      category: 'Databases',
      icon: 'database',
      api: {
        endpoint: '/api/database/',
        method: 'GET',
        baseUrl: '{url}',
        headers: {
          'Content-Type': 'application/json',
          'X-Metabase-Session': '{sessionToken}',
        },
      },
      inputSchema: {
        simplify: {
          type: 'boolean',
          required: false,
          label: 'Simplify Response',
          description: 'Return a simplified version of the response',
          default: false,
          aiControlled: false,
        },
      },
      outputSchema: {
        databases: {
          type: 'array',
          description: 'Array of database objects',
        },
      },
    },
    {
      id: 'get_database_fields',
      name: 'Get Database Fields',
      description: 'Get all fields from a specific database',
      category: 'Databases',
      icon: 'columns',
      api: {
        endpoint: '/api/database/{databaseId}/fields',
        method: 'GET',
        baseUrl: '{url}',
        headers: {
          'Content-Type': 'application/json',
          'X-Metabase-Session': '{sessionToken}',
        },
      },
      inputSchema: {
        databaseId: {
          type: 'string',
          required: true,
          label: 'Database ID',
          placeholder: '1',
          description: 'The ID of the database',
          aiControlled: false,
        },
      },
      outputSchema: {
        fields: {
          type: 'array',
          description: 'Array of field objects from the database',
        },
      },
    },
    {
      id: 'add_database',
      name: 'Add Database',
      description: 'Add a new datasource to the Metabase instance',
      category: 'Databases',
      icon: 'plus-circle',
      api: {
        endpoint: '/api/database',
        method: 'POST',
        baseUrl: '{url}',
        headers: {
          'Content-Type': 'application/json',
          'X-Metabase-Session': '{sessionToken}',
        },
      },
      inputSchema: {
        name: {
          type: 'string',
          required: true,
          label: 'Database Name',
          placeholder: 'My Database',
          description: 'A name for the database connection',
          aiControlled: false,
        },
        engine: {
          type: 'select',
          required: true,
          label: 'Database Engine',
          description: 'The type of database',
          default: 'postgres',
          options: [
            { label: 'PostgreSQL', value: 'postgres' },
            { label: 'MySQL', value: 'mysql' },
            { label: 'MongoDB', value: 'mongo' },
            { label: 'Redshift', value: 'redshift' },
            { label: 'H2', value: 'h2' },
            { label: 'SQLite', value: 'sqlite' },
          ],
          aiControlled: false,
        },
        host: {
          type: 'string',
          required: false,
          label: 'Host',
          placeholder: 'localhost',
          description: 'Database host (required for postgres, mysql, mongo, redshift)',
          displayOptions: {
            show: {
              engine: ['postgres', 'mysql', 'mongo', 'redshift'],
            },
          },
          aiControlled: false,
        },
        port: {
          type: 'number',
          required: false,
          label: 'Port',
          placeholder: '5432',
          description: 'Database port',
          default: 5432,
          displayOptions: {
            show: {
              engine: ['postgres', 'mysql', 'mongo', 'redshift'],
            },
          },
          aiControlled: false,
        },
        user: {
          type: 'string',
          required: false,
          label: 'Username',
          placeholder: 'admin',
          description: 'Database username',
          displayOptions: {
            show: {
              engine: ['postgres', 'mysql', 'mongo', 'redshift'],
            },
          },
          aiControlled: false,
        },
        password: {
          type: 'string',
          required: false,
          label: 'Password',
          inputType: 'password',
          description: 'Database password',
          displayOptions: {
            show: {
              engine: ['postgres', 'mysql', 'mongo', 'redshift'],
            },
          },
          aiControlled: false,
        },
        dbName: {
          type: 'string',
          required: false,
          label: 'Database Name',
          placeholder: 'mydb',
          description: 'Name of the database to connect to',
          displayOptions: {
            show: {
              engine: ['postgres', 'mysql', 'mongo', 'redshift'],
            },
          },
          aiControlled: false,
        },
        filePath: {
          type: 'string',
          required: false,
          label: 'File Path',
          placeholder: 'file:/path/to/database',
          description: 'Path to database file (required for h2 and sqlite)',
          displayOptions: {
            show: {
              engine: ['h2', 'sqlite'],
            },
          },
          aiControlled: false,
        },
        fullSync: {
          type: 'boolean',
          required: true,
          label: 'Full Sync',
          description: 'Perform a full sync of database schema',
          default: true,
          aiControlled: false,
        },
      },
      outputSchema: {
        database: {
          type: 'object',
          description: 'The created database object',
        },
      },
    },

    // Alerts
    {
      id: 'get_alert',
      name: 'Get Alert',
      description: 'Get a specific alert by ID',
      category: 'Alerts',
      icon: 'bell',
      api: {
        endpoint: '/api/alert/{alertId}',
        method: 'GET',
        baseUrl: '{url}',
        headers: {
          'Content-Type': 'application/json',
          'X-Metabase-Session': '{sessionToken}',
        },
      },
      inputSchema: {
        alertId: {
          type: 'string',
          required: true,
          label: 'Alert ID',
          placeholder: '123',
          description: 'The ID of the alert to retrieve',
          aiControlled: false,
        },
      },
      outputSchema: {
        alert: {
          type: 'object',
          description: 'The alert object',
        },
      },
    },
    {
      id: 'get_all_alerts',
      name: 'Get All Alerts',
      description: 'Get all alerts from your Metabase instance',
      category: 'Alerts',
      icon: 'bell',
      api: {
        endpoint: '/api/alert/',
        method: 'GET',
        baseUrl: '{url}',
        headers: {
          'Content-Type': 'application/json',
          'X-Metabase-Session': '{sessionToken}',
        },
      },
      inputSchema: {},
      outputSchema: {
        alerts: {
          type: 'array',
          description: 'Array of alert objects',
        },
      },
    },
  ],

  supported_triggers: [],
};
