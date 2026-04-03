import { ConnectorDefinition } from '../../shared';

/**
 * Snowflake Connector Definition
 *
 * Cloud data warehouse for analytics and data storage.
 * Supports SQL queries, data insertion, and updates.
 *
 * Operations:
 * - Execute Query: Run custom SQL queries
 * - Insert: Insert rows into tables
 * - Update: Update existing rows
 * - Delete: Delete rows from tables
 *
 * Authentication:
 * - Username/Password
 * - Key-Pair authentication
 */
export const SNOWFLAKE_CONNECTOR: ConnectorDefinition = {
  name: 'snowflake',
  display_name: 'Snowflake',
  category: 'database',
  description: 'Cloud data warehouse for analytics and data storage with SQL support',

  auth_type: 'custom',

  auth_fields: [
    {
      key: 'account',
      label: 'Account',
      type: 'string',
      required: true,
      placeholder: 'xy12345.us-east-1',
      description: 'Your Snowflake account identifier',
      helpUrl: 'https://docs.snowflake.com/en/user-guide/admin-account-identifier',
    },
    {
      key: 'database',
      label: 'Database',
      type: 'string',
      required: true,
      placeholder: 'MY_DATABASE',
      description: 'The database to connect to',
    },
    {
      key: 'warehouse',
      label: 'Warehouse',
      type: 'string',
      required: true,
      placeholder: 'COMPUTE_WH',
      description: 'The virtual warehouse to use for queries',
    },
    {
      key: 'authentication',
      label: 'Authentication Method',
      type: 'select',
      required: true,
      default: 'password',
      options: [
        { label: 'Username/Password', value: 'password' },
        { label: 'Key-Pair', value: 'keyPair' },
      ],
    },
    {
      key: 'username',
      label: 'Username',
      type: 'string',
      required: true,
      placeholder: 'my_user',
    },
    {
      key: 'password',
      label: 'Password',
      type: 'password',
      required: true,
      displayOptions: {
        show: {
          authentication: ['password'],
        },
      },
    },
    {
      key: 'privateKey',
      label: 'Private Key',
      type: 'password',
      required: true,
      inputType: 'textarea',
      placeholder: '-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----',
      description: 'PEM-encoded private key for key-pair authentication',
      helpUrl: 'https://docs.snowflake.com/en/user-guide/key-pair-auth',
      displayOptions: {
        show: {
          authentication: ['keyPair'],
        },
      },
    },
    {
      key: 'passphrase',
      label: 'Passphrase',
      type: 'password',
      description: 'Passphrase for encrypted private key (optional)',
      displayOptions: {
        show: {
          authentication: ['keyPair'],
        },
      },
    },
    {
      key: 'schema',
      label: 'Schema',
      type: 'string',
      placeholder: 'PUBLIC',
      description: 'Default schema to use',
    },
    {
      key: 'role',
      label: 'Role',
      type: 'string',
      placeholder: 'ACCOUNTADMIN',
      description: 'Security role to use for the session',
    },
    {
      key: 'clientSessionKeepAlive',
      label: 'Keep Session Alive',
      type: 'boolean',
      default: false,
      description: 'Keep the connection alive indefinitely',
    },
  ],

  endpoints: {
    base_url: 'https://{account}.snowflakecomputing.com',
  },

  webhook_support: false,
  rate_limits: {
    concurrent_queries: 8,
  },

  supported_actions: [
    // ==================== QUERY OPERATIONS ====================
    {
      id: 'execute_query',
      name: 'Execute Query',
      description: 'Execute a custom SQL query',
      category: 'Queries',
      icon: 'terminal',
      api: {
        endpoint: '/query',
        method: 'POST',
        baseUrl: 'snowflake://execute',
      },
      inputSchema: {
        query: {
          type: 'string',
          required: true,
          label: 'SQL Query',
          inputType: 'textarea',
          placeholder: 'SELECT * FROM my_table WHERE id = ?',
          description: 'The SQL query to execute. Use ? for parameterized queries.',
          aiControlled: false,
        },
        parameters: {
          type: 'array',
          label: 'Query Parameters',
          description: 'Values to bind to ? placeholders in the query',
          itemSchema: {
            type: 'string',
          },
          aiControlled: false,
        },
        warehouse: {
          type: 'string',
          label: 'Warehouse Override',
          description: 'Override the default warehouse for this query',
          aiControlled: false,
        },
        database: {
          type: 'string',
          label: 'Database Override',
          description: 'Override the default database for this query',
          aiControlled: false,
        },
        schema: {
          type: 'string',
          label: 'Schema Override',
          description: 'Override the default schema for this query',
          aiControlled: false,
        },
        timeout: {
          type: 'number',
          label: 'Query Timeout (seconds)',
          default: 60,
          description: 'Maximum time to wait for query completion',
          aiControlled: false,
        },
      },
      outputSchema: {
        rows: {
          type: 'array',
          description: 'Query result rows',
        },
        rowCount: { type: 'number' },
        columns: {
          type: 'array',
          description: 'Column metadata',
        },
      },
    },

    {
      id: 'insert',
      name: 'Insert Rows',
      description: 'Insert one or more rows into a table',
      category: 'Data Operations',
      icon: 'plus-circle',
      api: {
        endpoint: '/insert',
        method: 'POST',
        baseUrl: 'snowflake://execute',
      },
      inputSchema: {
        table: {
          type: 'string',
          required: true,
          label: 'Table Name',
          placeholder: 'MY_TABLE',
          description: 'The table to insert into',
          aiControlled: false,
        },
        columns: {
          type: 'string',
          required: true,
          label: 'Columns',
          placeholder: 'id,name,email',
          description: 'Comma-separated list of columns to insert',
          aiControlled: false,
        },
        data: {
          type: 'array',
          required: true,
          label: 'Data',
          description: 'Array of objects with column values to insert',
          itemSchema: {
            type: 'object',
          },
          aiControlled: false,
        },
        database: {
          type: 'string',
          label: 'Database',
          aiControlled: false,
        },
        schema: {
          type: 'string',
          label: 'Schema',
          aiControlled: false,
        },
      },
      outputSchema: {
        insertedCount: { type: 'number' },
        success: { type: 'boolean' },
      },
    },

    {
      id: 'update',
      name: 'Update Rows',
      description: 'Update rows in a table',
      category: 'Data Operations',
      icon: 'edit',
      api: {
        endpoint: '/update',
        method: 'POST',
        baseUrl: 'snowflake://execute',
      },
      inputSchema: {
        table: {
          type: 'string',
          required: true,
          label: 'Table Name',
          placeholder: 'MY_TABLE',
          aiControlled: false,
        },
        updateKey: {
          type: 'string',
          required: true,
          label: 'Update Key',
          default: 'id',
          description: 'Column to use for matching rows (e.g., id)',
          aiControlled: false,
        },
        columns: {
          type: 'string',
          required: true,
          label: 'Columns to Update',
          placeholder: 'name,email,updated_at',
          description: 'Comma-separated list of columns to update',
          aiControlled: false,
        },
        data: {
          type: 'array',
          required: true,
          label: 'Data',
          description: 'Array of objects with column values (must include update key)',
          itemSchema: {
            type: 'object',
          },
          aiControlled: false,
        },
        database: {
          type: 'string',
          label: 'Database',
          aiControlled: false,
        },
        schema: {
          type: 'string',
          label: 'Schema',
          aiControlled: false,
        },
      },
      outputSchema: {
        updatedCount: { type: 'number' },
        success: { type: 'boolean' },
      },
    },

    {
      id: 'delete',
      name: 'Delete Rows',
      description: 'Delete rows from a table',
      category: 'Data Operations',
      icon: 'trash',
      api: {
        endpoint: '/delete',
        method: 'POST',
        baseUrl: 'snowflake://execute',
      },
      inputSchema: {
        table: {
          type: 'string',
          required: true,
          label: 'Table Name',
          aiControlled: false,
        },
        whereClause: {
          type: 'string',
          required: true,
          label: 'WHERE Clause',
          placeholder: 'id = ? AND status = ?',
          description: 'Condition for deletion (use ? for parameters)',
          aiControlled: false,
        },
        parameters: {
          type: 'array',
          label: 'Parameters',
          description: 'Values for WHERE clause parameters',
          itemSchema: {
            type: 'string',
          },
          aiControlled: false,
        },
        database: {
          type: 'string',
          label: 'Database',
          aiControlled: false,
        },
        schema: {
          type: 'string',
          label: 'Schema',
          aiControlled: false,
        },
      },
      outputSchema: {
        deletedCount: { type: 'number' },
        success: { type: 'boolean' },
      },
    },

    // ==================== TABLE OPERATIONS ====================
    {
      id: 'list_tables',
      name: 'List Tables',
      description: 'List all tables in a schema',
      category: 'Schema',
      icon: 'table',
      api: {
        endpoint: '/query',
        method: 'POST',
        baseUrl: 'snowflake://execute',
      },
      inputSchema: {
        database: {
          type: 'string',
          label: 'Database',
          description: 'Database to list tables from (defaults to connected database)',
          aiControlled: false,
        },
        schema: {
          type: 'string',
          label: 'Schema',
          description: 'Schema to list tables from',
          aiControlled: false,
        },
        pattern: {
          type: 'string',
          label: 'Table Name Pattern',
          placeholder: '%_PROD',
          description: 'Optional LIKE pattern to filter table names',
          aiControlled: false,
        },
      },
      outputSchema: {
        tables: {
          type: 'array',
          description: 'List of table names',
        },
      },
    },

    {
      id: 'describe_table',
      name: 'Describe Table',
      description: 'Get column information for a table',
      category: 'Schema',
      icon: 'info',
      api: {
        endpoint: '/query',
        method: 'POST',
        baseUrl: 'snowflake://execute',
      },
      inputSchema: {
        table: {
          type: 'string',
          required: true,
          label: 'Table Name',
          aiControlled: false,
        },
        database: {
          type: 'string',
          label: 'Database',
          aiControlled: false,
        },
        schema: {
          type: 'string',
          label: 'Schema',
          aiControlled: false,
        },
      },
      outputSchema: {
        columns: {
          type: 'array',
          description: 'List of column definitions',
        },
      },
    },

    {
      id: 'create_table',
      name: 'Create Table',
      description: 'Create a new table',
      category: 'Schema',
      icon: 'plus-square',
      api: {
        endpoint: '/query',
        method: 'POST',
        baseUrl: 'snowflake://execute',
      },
      inputSchema: {
        table: {
          type: 'string',
          required: true,
          label: 'Table Name',
          aiControlled: false,
        },
        columns: {
          type: 'array',
          required: true,
          label: 'Columns',
          description: 'Column definitions',
          itemSchema: {
            name: {
              type: 'string',
              required: true,
              label: 'Column Name',
            },
            dataType: {
              type: 'select',
              required: true,
              label: 'Data Type',
              options: [
                { label: 'VARCHAR', value: 'VARCHAR' },
                { label: 'NUMBER', value: 'NUMBER' },
                { label: 'INTEGER', value: 'INTEGER' },
                { label: 'FLOAT', value: 'FLOAT' },
                { label: 'BOOLEAN', value: 'BOOLEAN' },
                { label: 'DATE', value: 'DATE' },
                { label: 'TIMESTAMP', value: 'TIMESTAMP' },
                { label: 'VARIANT', value: 'VARIANT' },
                { label: 'ARRAY', value: 'ARRAY' },
                { label: 'OBJECT', value: 'OBJECT' },
              ],
            },
            nullable: {
              type: 'boolean',
              label: 'Nullable',
              default: true,
            },
            defaultValue: {
              type: 'string',
              label: 'Default Value',
            },
          },
          aiControlled: false,
        },
        primaryKey: {
          type: 'string',
          label: 'Primary Key',
          placeholder: 'id',
          description: 'Column name for primary key',
          aiControlled: false,
        },
        ifNotExists: {
          type: 'boolean',
          label: 'If Not Exists',
          default: true,
          description: 'Only create if table does not exist',
          aiControlled: false,
        },
        database: {
          type: 'string',
          label: 'Database',
          aiControlled: false,
        },
        schema: {
          type: 'string',
          label: 'Schema',
          aiControlled: false,
        },
      },
      outputSchema: {
        success: { type: 'boolean' },
        tableName: { type: 'string' },
      },
    },

    {
      id: 'drop_table',
      name: 'Drop Table',
      description: 'Drop (delete) a table',
      category: 'Schema',
      icon: 'trash-2',
      api: {
        endpoint: '/query',
        method: 'POST',
        baseUrl: 'snowflake://execute',
      },
      inputSchema: {
        table: {
          type: 'string',
          required: true,
          label: 'Table Name',
          aiControlled: false,
        },
        ifExists: {
          type: 'boolean',
          label: 'If Exists',
          default: true,
          description: 'Only drop if table exists',
          aiControlled: false,
        },
        cascade: {
          type: 'boolean',
          label: 'Cascade',
          default: false,
          description: 'Drop dependent objects',
          aiControlled: false,
        },
        database: {
          type: 'string',
          label: 'Database',
          aiControlled: false,
        },
        schema: {
          type: 'string',
          label: 'Schema',
          aiControlled: false,
        },
      },
      outputSchema: {
        success: { type: 'boolean' },
      },
    },

    // ==================== WAREHOUSE OPERATIONS ====================
    {
      id: 'list_warehouses',
      name: 'List Warehouses',
      description: 'List all available warehouses',
      category: 'Warehouse',
      icon: 'server',
      api: {
        endpoint: '/query',
        method: 'POST',
        baseUrl: 'snowflake://execute',
      },
      inputSchema: {},
      outputSchema: {
        warehouses: {
          type: 'array',
          description: 'List of warehouse names',
        },
      },
    },

    {
      id: 'resume_warehouse',
      name: 'Resume Warehouse',
      description: 'Resume a suspended warehouse',
      category: 'Warehouse',
      icon: 'play',
      api: {
        endpoint: '/query',
        method: 'POST',
        baseUrl: 'snowflake://execute',
      },
      inputSchema: {
        warehouse: {
          type: 'string',
          required: true,
          label: 'Warehouse Name',
          aiControlled: false,
        },
      },
      outputSchema: {
        success: { type: 'boolean' },
      },
    },

    {
      id: 'suspend_warehouse',
      name: 'Suspend Warehouse',
      description: 'Suspend an active warehouse',
      category: 'Warehouse',
      icon: 'pause',
      api: {
        endpoint: '/query',
        method: 'POST',
        baseUrl: 'snowflake://execute',
      },
      inputSchema: {
        warehouse: {
          type: 'string',
          required: true,
          label: 'Warehouse Name',
          aiControlled: false,
        },
      },
      outputSchema: {
        success: { type: 'boolean' },
      },
    },

    // ==================== DATABASE OPERATIONS ====================
    {
      id: 'list_databases',
      name: 'List Databases',
      description: 'List all available databases',
      category: 'Database',
      icon: 'database',
      api: {
        endpoint: '/query',
        method: 'POST',
        baseUrl: 'snowflake://execute',
      },
      inputSchema: {},
      outputSchema: {
        databases: {
          type: 'array',
          description: 'List of database names',
        },
      },
    },

    {
      id: 'list_schemas',
      name: 'List Schemas',
      description: 'List all schemas in a database',
      category: 'Database',
      icon: 'folder',
      api: {
        endpoint: '/query',
        method: 'POST',
        baseUrl: 'snowflake://execute',
      },
      inputSchema: {
        database: {
          type: 'string',
          label: 'Database',
          aiControlled: false,
        },
      },
      outputSchema: {
        schemas: {
          type: 'array',
          description: 'List of schema names',
        },
      },
    },

    // ==================== STAGING OPERATIONS ====================
    {
      id: 'list_stages',
      name: 'List Stages',
      description: 'List all stages for data loading',
      category: 'Staging',
      icon: 'upload-cloud',
      api: {
        endpoint: '/query',
        method: 'POST',
        baseUrl: 'snowflake://execute',
      },
      inputSchema: {
        database: {
          type: 'string',
          label: 'Database',
          aiControlled: false,
        },
        schema: {
          type: 'string',
          label: 'Schema',
          aiControlled: false,
        },
      },
      outputSchema: {
        stages: {
          type: 'array',
          description: 'List of stage names',
        },
      },
    },

    {
      id: 'copy_into_table',
      name: 'Copy Into Table',
      description: 'Load data from a stage into a table',
      category: 'Staging',
      icon: 'copy',
      api: {
        endpoint: '/query',
        method: 'POST',
        baseUrl: 'snowflake://execute',
      },
      inputSchema: {
        table: {
          type: 'string',
          required: true,
          label: 'Target Table',
          aiControlled: false,
        },
        stage: {
          type: 'string',
          required: true,
          label: 'Stage',
          placeholder: '@my_stage/path/',
          description: 'Stage path to load from',
          aiControlled: false,
        },
        fileFormat: {
          type: 'select',
          label: 'File Format',
          default: 'CSV',
          options: [
            { label: 'CSV', value: 'CSV' },
            { label: 'JSON', value: 'JSON' },
            { label: 'PARQUET', value: 'PARQUET' },
            { label: 'AVRO', value: 'AVRO' },
            { label: 'ORC', value: 'ORC' },
          ],
          aiControlled: false,
        },
        pattern: {
          type: 'string',
          label: 'File Pattern',
          placeholder: '.*\\.csv',
          description: 'Regex pattern to filter files',
          aiControlled: false,
        },
        onError: {
          type: 'select',
          label: 'On Error',
          default: 'ABORT_STATEMENT',
          options: [
            { label: 'Abort Statement', value: 'ABORT_STATEMENT' },
            { label: 'Continue', value: 'CONTINUE' },
            { label: 'Skip File', value: 'SKIP_FILE' },
          ],
          aiControlled: false,
        },
        database: {
          type: 'string',
          label: 'Database',
          aiControlled: false,
        },
        schema: {
          type: 'string',
          label: 'Schema',
          aiControlled: false,
        },
      },
      outputSchema: {
        rowsLoaded: { type: 'number' },
        rowsWithErrors: { type: 'number' },
        success: { type: 'boolean' },
      },
    },
  ],

  supported_triggers: [],
};
