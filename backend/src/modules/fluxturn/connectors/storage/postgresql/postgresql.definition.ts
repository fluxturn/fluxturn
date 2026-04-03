// Postgresql Connector
// Auto-generated from connector.constants.ts

import { ConnectorDefinition } from '../../shared';

export const POSTGRESQL_CONNECTOR: ConnectorDefinition = {
    name: 'postgresql',
    display_name: 'PostgreSQL',
    category: 'database',
    description: 'PostgreSQL database operations - execute queries, insert, update, delete rows with full PostgreSQL features',
    auth_type: 'credentials',
    auth_fields: [
      {
        key: 'host',
        label: 'Host',
        type: 'string',
        required: true,
        placeholder: 'localhost',
        description: 'PostgreSQL server hostname or IP address',
        default: 'localhost'
      },
      {
        key: 'port',
        label: 'Port',
        type: 'number',
        required: false,
        placeholder: '5432',
        description: 'PostgreSQL server port',
        default: 5432
      },
      {
        key: 'database',
        label: 'Database',
        type: 'string',
        required: true,
        placeholder: 'postgres',
        description: 'Database name to connect to'
      },
      {
        key: 'user',
        label: 'User',
        type: 'string',
        required: true,
        placeholder: 'postgres',
        description: 'PostgreSQL username'
      },
      {
        key: 'password',
        label: 'Password',
        type: 'password',
        required: true,
        placeholder: '',
        description: 'PostgreSQL password'
      },
      {
        key: 'connectionLimit',
        label: 'Maximum Number of Connections',
        type: 'number',
        required: false,
        placeholder: '100',
        description: 'Maximum number of connections in the pool',
        default: 100
      },
      {
        key: 'ssl',
        label: 'Ignore SSL Issues (Insecure)',
        type: 'boolean',
        required: false,
        description: 'Disable SSL certificate validation',
        default: false
      }
    ],
    endpoints: {},
    webhook_support: true,
    rate_limits: { connections: 100 },
    sandbox_available: false,
    verified: true,
    supported_actions: [
      {
        id: 'execute_query',
        name: 'Execute a SQL query',
        description: 'Execute custom SQL query with parameters',
        category: 'Database',
        icon: 'database',
        verified: false,
        inputSchema: {
          query: {
            type: 'string',
            required: true,
            label: 'Query',
            inputType: 'textarea',
            placeholder: 'SELECT * FROM users WHERE id = $1',
            description: 'SQL query to execute. Use $1, $2, etc. for parameters',
            aiControlled: false
          },
          params: {
            type: 'array',
            required: false,
            label: 'Query Parameters',
            description: 'Parameters for the SQL query',
            aiControlled: false,
            itemSchema: {
              value: {
                type: 'string',
                label: 'Parameter Value'
              }
            }
          }
        },
        outputSchema: {
          rows: {
            type: 'array',
            description: 'Query result rows'
          },
          rowCount: {
            type: 'number',
            description: 'Number of rows returned'
          }
        }
      },
      {
        id: 'select_rows',
        name: 'Select rows from a table',
        description: 'Select rows from a table with conditions',
        category: 'Database',
        icon: 'search',
        verified: false,
        inputSchema: {
          schema: {
            type: 'string',
            required: false,
            label: 'Schema',
            placeholder: 'public',
            default: 'public',
            description: 'Database schema',
            loadOptionsResource: 'schemas',
            loadOptionsDescription: 'Fetch schemas from database',
            aiControlled: false
          },
          table: {
            type: 'string',
            required: true,
            label: 'Table Name',
            placeholder: 'users',
            description: 'Name of the table to select from',
            loadOptionsResource: 'tables',
            loadOptionsDependsOn: ['schema'],
            loadOptionsDescription: 'Fetch tables from selected schema',
            aiControlled: false
          },
          columns: {
            type: 'string',
            required: false,
            label: 'Columns',
            placeholder: '*',
            default: '*',
            description: 'Comma-separated column names or * for all columns',
            aiControlled: false
          },
          where: {
            type: 'object',
            required: false,
            label: 'WHERE Conditions',
            description: 'Conditions for filtering rows (key-value pairs)',
            aiControlled: false
          },
          limit: {
            type: 'number',
            required: false,
            label: 'Limit',
            placeholder: '100',
            description: 'Maximum number of rows to return',
            aiControlled: false
          },
          offset: {
            type: 'number',
            required: false,
            label: 'Offset',
            placeholder: '0',
            description: 'Number of rows to skip',
            aiControlled: false
          },
          orderBy: {
            type: 'string',
            required: false,
            label: 'Order By',
            placeholder: 'created_at DESC',
            description: 'Column and direction for sorting',
            aiControlled: false
          }
        },
        outputSchema: {
          rows: {
            type: 'array',
            description: 'Selected rows'
          },
          rowCount: {
            type: 'number',
            description: 'Number of rows selected'
          }
        }
      },
      {
        id: 'insert_rows',
        name: 'Insert rows in a table',
        description: 'Insert one or more rows into a table',
        category: 'Database',
        icon: 'plus',
        verified: false,
        inputSchema: {
          schema: {
            type: 'string',
            required: false,
            label: 'Schema',
            placeholder: 'public',
            default: 'public',
            description: 'Database schema',
            order: 1,
            loadOptionsResource: 'schemas',
            loadOptionsDescription: 'Fetch schemas from database',
            aiControlled: false
          },
          table: {
            type: 'string',
            required: true,
            label: 'Table Name',
            placeholder: 'users',
            description: 'Name of the table to insert into',
            order: 2,
            loadOptionsResource: 'tables',
            loadOptionsDependsOn: ['schema'],
            loadOptionsDescription: 'Fetch tables from selected schema',
            aiControlled: false
          },
          columnMappings: {
            type: 'fixedCollection',
            required: true,
            label: 'Column Mappings',
            description: 'Map data to table columns',
            order: 3,
            placeholder: 'Add Column Mapping',
            aiControlled: false,
            items: {
              mappings: {
                properties: {
                  column: {
                    type: 'string',
                    required: true,
                    label: 'Column',
                    description: 'Column name to insert into',
                    loadOptionsResource: 'table-columns',
                    loadOptionsDependsOn: ['schema', 'table'],
                    loadOptionsDescription: 'Fetch columns from selected table'
                  },
                  value: {
                    type: 'string',
                    required: true,
                    label: 'Value',
                    placeholder: '{{ $json.email }}',
                    description: 'Value or expression to insert'
                  }
                }
              }
            }
          },
          returning: {
            type: 'string',
            required: false,
            label: 'Returning',
            placeholder: '*',
            description: 'Columns to return from inserted rows',
            order: 4,
            aiControlled: false
          }
        },
        outputSchema: {
          rows: {
            type: 'array',
            description: 'Inserted rows (if RETURNING specified)'
          },
          rowCount: {
            type: 'number',
            description: 'Number of rows inserted'
          }
        }
      },
      {
        id: 'upsert_rows',
        name: 'Insert or update rows in a table',
        description: 'Insert rows or update on conflict (UPSERT)',
        category: 'Database',
        icon: 'refresh-cw',
        verified: false,
        inputSchema: {
          schema: {
            type: 'string',
            required: false,
            label: 'Schema',
            placeholder: 'public',
            default: 'public',
            description: 'Database schema',
            order: 1,
            loadOptionsResource: 'schemas',
            loadOptionsDescription: 'Fetch schemas from database',
            aiControlled: false
          },
          table: {
            type: 'string',
            required: true,
            label: 'Table Name',
            placeholder: 'users',
            description: 'Name of the table',
            order: 2,
            loadOptionsResource: 'tables',
            loadOptionsDependsOn: ['schema'],
            loadOptionsDescription: 'Fetch tables from selected schema',
            aiControlled: false
          },
          columnMappings: {
            type: 'fixedCollection',
            required: true,
            label: 'Column Mappings',
            description: 'Map data to table columns',
            order: 3,
            placeholder: 'Add Column Mapping',
            aiControlled: false,
            items: {
              mappings: {
                properties: {
                  column: {
                    type: 'string',
                    required: true,
                    label: 'Column',
                    description: 'Column name',
                    loadOptionsResource: 'table-columns',
                    loadOptionsDependsOn: ['schema', 'table'],
                    loadOptionsDescription: 'Fetch columns from selected table'
                  },
                  value: {
                    type: 'string',
                    required: true,
                    label: 'Value',
                    placeholder: '{{ $json.email }}',
                    description: 'Value or expression'
                  }
                }
              }
            }
          },
          conflictColumns: {
            type: 'fixedCollection',
            required: true,
            label: 'Conflict Columns',
            description: 'Columns to check for conflicts (unique constraint)',
            order: 4,
            placeholder: 'Add Conflict Column',
            aiControlled: false,
            items: {
              columns: {
                properties: {
                  column: {
                    type: 'string',
                    required: true,
                    label: 'Column',
                    description: 'Conflict column name',
                    loadOptionsResource: 'table-columns',
                    loadOptionsDependsOn: ['schema', 'table'],
                    loadOptionsDescription: 'Fetch columns from selected table'
                  }
                }
              }
            }
          },
          updateOnConflict: {
            type: 'boolean',
            required: false,
            label: 'Update on Conflict',
            default: true,
            description: 'Update row if conflict occurs, otherwise ignore',
            order: 5,
            aiControlled: false
          },
          returning: {
            type: 'string',
            required: false,
            label: 'Returning',
            placeholder: '*',
            description: 'Columns to return',
            order: 6,
            aiControlled: false
          }
        },
        outputSchema: {
          rows: {
            type: 'array',
            description: 'Affected rows'
          },
          rowCount: {
            type: 'number',
            description: 'Number of rows affected'
          }
        }
      },
      {
        id: 'update_rows',
        name: 'Update rows in a table',
        description: 'Update rows in a table with conditions',
        category: 'Database',
        icon: 'edit',
        verified: false,
        inputSchema: {
          schema: {
            type: 'string',
            required: false,
            label: 'Schema',
            placeholder: 'public',
            default: 'public',
            description: 'Database schema',
            order: 1,
            loadOptionsResource: 'schemas',
            loadOptionsDescription: 'Fetch schemas from database',
            aiControlled: false
          },
          table: {
            type: 'string',
            required: true,
            label: 'Table Name',
            placeholder: 'users',
            description: 'Name of the table to update',
            order: 2,
            loadOptionsResource: 'tables',
            loadOptionsDependsOn: ['schema'],
            loadOptionsDescription: 'Fetch tables from selected schema',
            aiControlled: false
          },
          columnMappings: {
            type: 'fixedCollection',
            required: true,
            label: 'Column Mappings',
            description: 'Columns to update with new values',
            order: 3,
            placeholder: 'Add Column Mapping',
            aiControlled: false,
            items: {
              mappings: {
                properties: {
                  column: {
                    type: 'string',
                    required: true,
                    label: 'Column',
                    description: 'Column name to update',
                    loadOptionsResource: 'table-columns',
                    loadOptionsDependsOn: ['schema', 'table'],
                    loadOptionsDescription: 'Fetch columns from selected table'
                  },
                  value: {
                    type: 'string',
                    required: true,
                    label: 'Value',
                    placeholder: '{{ $json.newValue }}',
                    description: 'New value or expression'
                  }
                }
              }
            }
          },
          where: {
            type: 'object',
            required: true,
            label: 'WHERE Conditions',
            description: 'Conditions for filtering rows to update',
            order: 4,
            aiControlled: false
          },
          returning: {
            type: 'string',
            required: false,
            label: 'Returning',
            placeholder: '*',
            description: 'Columns to return from updated rows',
            order: 5,
            aiControlled: false
          }
        },
        outputSchema: {
          rows: {
            type: 'array',
            description: 'Updated rows (if RETURNING specified)'
          },
          rowCount: {
            type: 'number',
            description: 'Number of rows updated'
          }
        }
      },
      {
        id: 'delete_rows',
        name: 'Delete table or rows',
        description: 'Delete rows from a table or drop entire table',
        category: 'Database',
        icon: 'trash',
        verified: false,
        inputSchema: {
          operation: {
            type: 'select',
            required: true,
            label: 'Operation',
            default: 'delete_rows',
            options: [
              { label: 'Delete Rows', value: 'delete_rows' },
              { label: 'Drop Table', value: 'drop_table' },
              { label: 'Truncate Table', value: 'truncate_table' }
            ],
            description: 'Type of delete operation',
            aiControlled: false
          },
          schema: {
            type: 'string',
            required: false,
            label: 'Schema',
            placeholder: 'public',
            default: 'public',
            description: 'Database schema',
            loadOptionsResource: 'schemas',
            loadOptionsDescription: 'Fetch schemas from database',
            aiControlled: false
          },
          table: {
            type: 'string',
            required: true,
            loadOptionsResource: 'tables',
            loadOptionsDependsOn: ['schema'],
            loadOptionsDescription: 'Fetch tables from selected schema',
            label: 'Table Name',
            placeholder: 'users',
            description: 'Name of the table',
            aiControlled: false
          },
          where: {
            type: 'object',
            required: false,
            label: 'WHERE Conditions',
            description: 'Conditions for filtering rows to delete (not used for DROP/TRUNCATE)',
            aiControlled: false,
            displayOptions: {
              show: {
                operation: ['delete_rows']
              }
            }
          },
          returning: {
            type: 'string',
            required: false,
            label: 'Returning',
            placeholder: '*',
            description: 'Columns to return from deleted rows',
            aiControlled: false,
            displayOptions: {
              show: {
                operation: ['delete_rows']
              }
            }
          },
          cascade: {
            type: 'boolean',
            required: false,
            label: 'Cascade',
            default: false,
            description: 'Drop dependent objects (for DROP TABLE)',
            aiControlled: false,
            displayOptions: {
              show: {
                operation: ['drop_table']
              }
            }
          }
        },
        outputSchema: {
          rows: {
            type: 'array',
            description: 'Deleted rows (if RETURNING specified)'
          },
          rowCount: {
            type: 'number',
            description: 'Number of rows deleted'
          },
          success: {
            type: 'boolean',
            description: 'Operation success status'
          }
        }
      }
    ],
    supported_triggers: [
      {
        id: 'new_row',
        name: 'On new Postgres event',
        description: 'Triggers when new rows are inserted or updated in a table',
        eventType: 'polling',
        verified: false,
        icon: 'database',
        webhookRequired: false,
        pollingEnabled: true,
        inputSchema: {
          table: {
            type: 'string',
            required: true,
            label: 'Table Name',
            placeholder: 'users',
            description: 'Table to monitor for changes'
          },
          triggerOn: {
            type: 'select',
            required: true,
            label: 'Trigger On',
            default: 'insert',
            options: [
              { label: 'New Rows (INSERT)', value: 'insert' },
              { label: 'Updated Rows (UPDATE)', value: 'update' },
              { label: 'Insert or Update', value: 'insert_update' }
            ],
            description: 'When to trigger the workflow'
          },
          timestampColumn: {
            type: 'string',
            required: true,
            label: 'Timestamp Column',
            placeholder: 'created_at',
            description: 'Column to track when rows were added/updated'
          },
          pollingInterval: {
            type: 'number',
            required: false,
            label: 'Polling Interval (seconds)',
            default: 60,
            min: 10,
            max: 3600,
            description: 'How often to check for new rows'
          },
          columns: {
            type: 'string',
            required: false,
            label: 'Columns to Return',
            placeholder: '*',
            default: '*',
            description: 'Columns to include in trigger data'
          }
        },
        outputSchema: {
          rows: {
            type: 'array',
            description: 'New or updated rows',
            properties: {
              id: { type: 'string' },
              data: { type: 'object' },
              timestamp: { type: 'string' }
            }
          },
          count: {
            type: 'number',
            description: 'Number of new rows'
          },
          lastPolledAt: {
            type: 'string',
            description: 'Timestamp of last poll'
          }
        }
      }
    ]
  };
