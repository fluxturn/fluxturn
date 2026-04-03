// Mysql Connector
// Auto-generated from connector.constants.ts

import { ConnectorDefinition } from '../../shared';

export const MYSQL_CONNECTOR: ConnectorDefinition = {
    name: 'mysql',
    display_name: 'MySQL',
    category: 'database',
    description: 'MySQL database operations - execute queries, insert, update, delete rows with full MySQL features',
    auth_type: 'credentials',
    auth_fields: [
      {
        key: 'host',
        label: 'Host',
        type: 'string',
        required: true,
        placeholder: 'localhost',
        description: 'MySQL server hostname or IP address',
        default: 'localhost'
      },
      {
        key: 'port',
        label: 'Port',
        type: 'number',
        required: false,
        placeholder: '3306',
        description: 'MySQL server port',
        default: 3306
      },
      {
        key: 'database',
        label: 'Database',
        type: 'string',
        required: true,
        placeholder: 'mysql',
        description: 'Database name to connect to'
      },
      {
        key: 'user',
        label: 'User',
        type: 'string',
        required: true,
        placeholder: 'root',
        description: 'MySQL username'
      },
      {
        key: 'password',
        label: 'Password',
        type: 'password',
        required: true,
        placeholder: '',
        description: 'MySQL password'
      },
      {
        key: 'connectionLimit',
        label: 'Maximum Number of Connections',
        type: 'number',
        required: false,
        placeholder: '10',
        description: 'Maximum number of connections in the pool',
        default: 10
      },
      {
        key: 'ssl',
        label: 'SSL',
        type: 'boolean',
        required: false,
        description: 'Use SSL for connection',
        default: false
      }
    ],
    endpoints: {},
    webhook_support: false,
    rate_limits: { connections: 10 },
    sandbox_available: false,
    verified: true,
    supported_actions: [
      {
        id: 'execute_query',
        name: 'Execute Query',
        description: 'Execute a SQL query with parameters',
        category: 'Database',
        icon: 'database',
        verified: false,
        inputSchema: {
          query: {
            type: 'string',
            required: true,
            label: 'Query',
            inputType: 'textarea',
            placeholder: 'SELECT * FROM users WHERE id = ?',
            description: 'SQL query to execute. Use ? for parameters',
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
            description: 'Number of rows affected'
          }
        }
      },
      {
        id: 'select_rows',
        name: 'Select',
        description: 'Select rows from a table',
        category: 'Database',
        icon: 'search',
        verified: false,
        inputSchema: {
          table: {
            type: 'string',
            required: true,
            label: 'Table Name',
            placeholder: 'users',
            description: 'Name of the table to select from',
            loadOptionsResource: 'tables',
            loadOptionsDescription: 'Fetch tables from database',
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
            type: 'fixedCollection',
            required: false,
            label: 'WHERE Conditions',
            description: 'Conditions for filtering rows',
            aiControlled: false,
            items: {
              conditions: {
                properties: {
                  column: {
                    type: 'string',
                    required: true,
                    label: 'Column',
                    description: 'Column name',
                    loadOptionsResource: 'table-columns',
                    loadOptionsDependsOn: ['table']
                  },
                  condition: {
                    type: 'select',
                    required: true,
                    label: 'Condition',
                    options: ['equal', 'notEqual', 'like', 'greater', 'less', 'greaterEqual', 'lessEqual', 'isNull', 'isNotNull'],
                    default: 'equal',
                    description: 'Comparison operator'
                  },
                  value: {
                    type: 'string',
                    label: 'Value',
                    description: 'Value to compare'
                  }
                }
              }
            }
          },
          combineConditions: {
            type: 'select',
            required: false,
            label: 'Combine Conditions',
            options: ['AND', 'OR'],
            default: 'AND',
            description: 'How to combine multiple conditions',
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
          sort: {
            type: 'fixedCollection',
            required: false,
            label: 'Sort',
            description: 'Sort results',
            aiControlled: false,
            items: {
              rules: {
                properties: {
                  column: {
                    type: 'string',
                    required: true,
                    label: 'Column',
                    loadOptionsResource: 'table-columns',
                    loadOptionsDependsOn: ['table']
                  },
                  direction: {
                    type: 'select',
                    required: false,
                    label: 'Direction',
                    options: ['ASC', 'DESC'],
                    default: 'ASC'
                  }
                }
              }
            }
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
        name: 'Insert',
        description: 'Insert one or more rows into a table',
        category: 'Database',
        icon: 'plus',
        verified: false,
        inputSchema: {
          table: {
            type: 'string',
            required: true,
            label: 'Table Name',
            placeholder: 'users',
            description: 'Name of the table to insert into',
            order: 1,
            loadOptionsResource: 'tables',
            loadOptionsDescription: 'Fetch tables from database',
            aiControlled: false
          },
          dataMode: {
            type: 'select',
            required: false,
            label: 'Data Mode',
            default: 'autoMapInputData',
            options: ['autoMapInputData', 'defineBelow'],
            description: 'Auto-map input data or define columns manually',
            order: 2,
            aiControlled: false
          },
          columnMappings: {
            type: 'fixedCollection',
            required: false,
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
                    loadOptionsDependsOn: ['table']
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
          priority: {
            type: 'select',
            required: false,
            label: 'Priority',
            options: ['LOW_PRIORITY', 'HIGH_PRIORITY'],
            description: 'Insert priority',
            order: 4,
            aiControlled: false
          },
          skipOnConflict: {
            type: 'boolean',
            required: false,
            label: 'Skip On Conflict',
            default: false,
            description: 'Skip row if unique constraint violated (INSERT IGNORE)',
            order: 5,
            aiControlled: false
          }
        },
        outputSchema: {
          affectedRows: {
            type: 'number',
            description: 'Number of rows inserted'
          },
          insertId: {
            type: 'number',
            description: 'Auto-increment ID of inserted row'
          }
        }
      },
      {
        id: 'upsert_rows',
        name: 'Insert or Update',
        description: 'Insert rows or update on duplicate key',
        category: 'Database',
        icon: 'refresh-cw',
        verified: false,
        inputSchema: {
          table: {
            type: 'string',
            required: true,
            label: 'Table Name',
            placeholder: 'users',
            description: 'Name of the table',
            order: 1,
            loadOptionsResource: 'tables',
            loadOptionsDescription: 'Fetch tables from database',
            aiControlled: false
          },
          dataMode: {
            type: 'select',
            required: false,
            label: 'Data Mode',
            default: 'autoMapInputData',
            options: ['autoMapInputData', 'defineBelow'],
            description: 'Auto-map input data or define columns manually',
            order: 2,
            aiControlled: false
          },
          columnToMatchOn: {
            type: 'string',
            required: true,
            label: 'Column to Match On',
            description: 'Unique column to check for conflicts',
            order: 3,
            loadOptionsResource: 'table-columns',
            loadOptionsDependsOn: ['table'],
            aiControlled: false
          },
          valueToMatchOn: {
            type: 'string',
            required: false,
            label: 'Value to Match On',
            description: 'Value for the matching column (manual mode)',
            order: 4,
            aiControlled: false
          },
          columnMappings: {
            type: 'fixedCollection',
            required: false,
            label: 'Column Mappings',
            description: 'Map data to table columns',
            order: 5,
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
                    loadOptionsDependsOn: ['table']
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
          }
        },
        outputSchema: {
          affectedRows: {
            type: 'number',
            description: 'Number of rows affected'
          },
          insertId: {
            type: 'number',
            description: 'Auto-increment ID if inserted'
          }
        }
      },
      {
        id: 'update_rows',
        name: 'Update',
        description: 'Update rows in a table',
        category: 'Database',
        icon: 'edit',
        verified: false,
        inputSchema: {
          table: {
            type: 'string',
            required: true,
            label: 'Table Name',
            placeholder: 'users',
            description: 'Name of the table to update',
            order: 1,
            loadOptionsResource: 'tables',
            loadOptionsDescription: 'Fetch tables from database',
            aiControlled: false
          },
          dataMode: {
            type: 'select',
            required: false,
            label: 'Data Mode',
            default: 'autoMapInputData',
            options: ['autoMapInputData', 'defineBelow'],
            description: 'Auto-map input data or define columns manually',
            order: 2,
            aiControlled: false
          },
          columnToMatchOn: {
            type: 'string',
            required: true,
            label: 'Column to Match On',
            description: 'Column used to find rows to update',
            order: 3,
            loadOptionsResource: 'table-columns',
            loadOptionsDependsOn: ['table'],
            aiControlled: false
          },
          valueToMatchOn: {
            type: 'string',
            required: true,
            label: 'Value to Match On',
            description: 'Value to match for the update',
            order: 4,
            aiControlled: false
          },
          columnMappings: {
            type: 'fixedCollection',
            required: true,
            label: 'Column Mappings',
            description: 'Map data to table columns for update',
            order: 5,
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
                    loadOptionsDependsOn: ['table']
                  },
                  value: {
                    type: 'string',
                    required: true,
                    label: 'Value',
                    placeholder: '{{ $json.name }}',
                    description: 'New value or expression'
                  }
                }
              }
            }
          }
        },
        outputSchema: {
          affectedRows: {
            type: 'number',
            description: 'Number of rows updated'
          },
          changedRows: {
            type: 'number',
            description: 'Number of rows changed'
          }
        }
      },
      {
        id: 'delete_rows',
        name: 'Delete',
        description: 'Delete rows from a table or drop/truncate table',
        category: 'Database',
        icon: 'trash',
        verified: false,
        inputSchema: {
          deleteCommand: {
            type: 'select',
            required: true,
            label: 'Delete Command',
            default: 'delete',
            options: ['delete', 'truncate', 'drop'],
            description: 'Type of delete operation',
            order: 1,
            aiControlled: false
          },
          table: {
            type: 'string',
            required: true,
            label: 'Table Name',
            description: 'Table name',
            order: 2,
            loadOptionsResource: 'tables',
            loadOptionsDescription: 'Fetch tables from database',
            aiControlled: false
          },
          where: {
            type: 'fixedCollection',
            required: false,
            label: 'WHERE Conditions',
            description: 'Conditions to match rows for deletion',
            order: 3,
            aiControlled: false,
            items: {
              conditions: {
                properties: {
                  column: {
                    type: 'string',
                    required: true,
                    label: 'Column',
                    loadOptionsResource: 'table-columns',
                    loadOptionsDependsOn: ['table']
                  },
                  condition: {
                    type: 'select',
                    required: true,
                    label: 'Condition',
                    options: ['equal', 'notEqual', 'like', 'greater', 'less', 'greaterEqual', 'lessEqual', 'isNull', 'isNotNull'],
                    default: 'equal'
                  },
                  value: {
                    type: 'string',
                    label: 'Value'
                  }
                }
              }
            }
          },
          combineConditions: {
            type: 'select',
            required: false,
            label: 'Combine Conditions',
            options: ['AND', 'OR'],
            default: 'AND',
            order: 4,
            aiControlled: false
          }
        },
        outputSchema: {
          affectedRows: {
            type: 'number',
            description: 'Number of rows deleted'
          },
          success: {
            type: 'boolean',
            description: 'Success status'
          }
        }
      }
    ],
    supported_triggers: [
      {
        id: 'new_row',
        name: 'On New MySQL Event',
        description: 'Triggered when new rows are inserted or updated',
        eventType: 'polling',
        icon: 'database',
        verified: false,
        outputSchema: {
          rows: {
            type: 'array',
            description: 'New rows'
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
