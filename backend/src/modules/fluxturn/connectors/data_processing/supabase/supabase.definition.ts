// Supabase Connector Definition
// Ported from n8n to fluxturn

import { ConnectorDefinition } from '../../shared';

export const SUPABASE_CONNECTOR: ConnectorDefinition = {
  name: 'supabase',
  display_name: 'Supabase',
  category: 'data_processing',
  description: 'Add, get, delete and update data in Supabase tables. Supabase is an open source Firebase alternative with PostgreSQL database.',
  auth_type: 'api_key',
  verified: false,

  auth_fields: [
    {
      key: 'host',
      label: 'Host',
      type: 'string',
      required: true,
      placeholder: 'https://your_account.supabase.co',
      description: 'The host URL of your Supabase project',
      helpUrl: 'https://supabase.com/docs'
    },
    {
      key: 'serviceRole',
      label: 'Service Role Secret',
      type: 'password',
      required: true,
      placeholder: 'Enter your service role secret',
      description: 'Your Supabase service role secret key',
      helpUrl: 'https://supabase.com/docs/guides/api'
    }
  ],

  endpoints: {
    base_url: '{host}/rest/v1',
    tables: '/'
  },

  webhook_support: false,
  rate_limits: { requests_per_minute: 60 },

  supported_actions: [
    {
      id: 'create_row',
      name: 'Create Row',
      description: 'Create a new row in a Supabase table',
      category: 'Row',
      icon: 'plus',
      verified: false,
      api: {
        endpoint: '/{tableId}',
        method: 'POST',
        baseUrl: '{host}/rest/v1',
        headers: {
          'Content-Type': 'application/json',
          'apikey': '{serviceRole}',
          'Authorization': 'Bearer {serviceRole}',
          'Prefer': 'return=representation'
        }
      },
      inputSchema: {
        tableId: {
          type: 'string',
          required: true,
          label: 'Table Name',
          description: 'The name of the table to insert data into',
          placeholder: 'users',
          aiControlled: false
        },
        useCustomSchema: {
          type: 'boolean',
          label: 'Use Custom Schema',
          description: 'Whether to use a database schema different from the default "public" schema',
          default: false,
          required: false,
          aiControlled: false
        },
        schema: {
          type: 'string',
          label: 'Schema',
          description: 'Name of database schema to use for table',
          default: 'public',
          required: false,
          displayOptions: {
            show: {
              useCustomSchema: [true]
            }
          },
          aiControlled: false
        },
        dataToSend: {
          type: 'select',
          label: 'Data to Send',
          description: 'Choose how to send data to Supabase',
          required: true,
          default: 'autoMapInputData',
          options: [
            {
              label: 'Auto-Map Input Data to Columns',
              value: 'autoMapInputData'
            },
            {
              label: 'Define Below for Each Column',
              value: 'defineBelow'
            }
          ],
          aiControlled: false
        },
        inputsToIgnore: {
          type: 'string',
          label: 'Inputs to Ignore',
          description: 'Comma-separated list of input properties to ignore',
          placeholder: 'field1,field2',
          required: false,
          displayOptions: {
            show: {
              dataToSend: ['autoMapInputData']
            }
          },
          aiControlled: false
        },
        fieldsUi: {
          type: 'string',
          inputType: 'textarea',
          label: 'Fields',
          description: 'JSON object with field names and values to insert',
          placeholder: '{\n  "name": "John Doe",\n  "email": "john@example.com"\n}',
          required: false,
          displayOptions: {
            show: {
              dataToSend: ['defineBelow']
            }
          },
          aiControlled: false
        }
      },
      outputSchema: {
        id: { type: 'string', description: 'Created row ID' },
        data: { type: 'object', description: 'Created row data' }
      }
    },
    {
      id: 'delete_row',
      name: 'Delete Row',
      description: 'Delete rows from a Supabase table',
      category: 'Row',
      icon: 'trash',
      verified: false,
      api: {
        endpoint: '/{tableId}',
        method: 'DELETE',
        baseUrl: '{host}/rest/v1',
        headers: {
          'Content-Type': 'application/json',
          'apikey': '{serviceRole}',
          'Authorization': 'Bearer {serviceRole}',
          'Prefer': 'return=representation'
        }
      },
      inputSchema: {
        tableId: {
          type: 'string',
          required: true,
          label: 'Table Name',
          description: 'The name of the table to delete rows from',
          placeholder: 'users',
          aiControlled: false
        },
        useCustomSchema: {
          type: 'boolean',
          label: 'Use Custom Schema',
          description: 'Whether to use a database schema different from the default "public" schema',
          default: false,
          required: false,
          aiControlled: false
        },
        schema: {
          type: 'string',
          label: 'Schema',
          description: 'Name of database schema to use for table',
          default: 'public',
          required: false,
          displayOptions: {
            show: {
              useCustomSchema: [true]
            }
          },
          aiControlled: false
        },
        filterType: {
          type: 'select',
          label: 'Select Type',
          description: 'How to filter rows to delete',
          required: true,
          default: 'manual',
          options: [
            { label: 'Manually', value: 'manual' },
            { label: 'String', value: 'string' }
          ],
          aiControlled: false
        },
        matchType: {
          type: 'select',
          label: 'Match Type',
          description: 'How to match the filters',
          required: false,
          default: 'allFilters',
          options: [
            { label: 'All Select Conditions', value: 'allFilters' },
            { label: 'Any Select Condition', value: 'anyFilter' }
          ],
          displayOptions: {
            show: {
              filterType: ['manual']
            }
          },
          aiControlled: false
        },
        filters: {
          type: 'string',
          inputType: 'textarea',
          label: 'Select Conditions',
          description: 'JSON array of filter conditions',
          placeholder: '[{"column": "id", "operator": "eq", "value": "123"}]',
          required: false,
          displayOptions: {
            show: {
              filterType: ['manual']
            }
          },
          aiControlled: false
        },
        filterString: {
          type: 'string',
          label: 'Filter String',
          description: 'Filter string (e.g., id=eq.123)',
          placeholder: 'id=eq.123',
          required: false,
          displayOptions: {
            show: {
              filterType: ['string']
            }
          },
          aiControlled: false
        }
      },
      outputSchema: {
        deleted: { type: 'array', description: 'Deleted rows' }
      }
    },
    {
      id: 'get_row',
      name: 'Get Row',
      description: 'Get a row from a Supabase table',
      category: 'Row',
      icon: 'file',
      verified: false,
      api: {
        endpoint: '/{tableId}',
        method: 'GET',
        baseUrl: '{host}/rest/v1',
        headers: {
          'Content-Type': 'application/json',
          'apikey': '{serviceRole}',
          'Authorization': 'Bearer {serviceRole}'
        }
      },
      inputSchema: {
        tableId: {
          type: 'string',
          required: true,
          label: 'Table Name',
          description: 'The name of the table to get row from',
          placeholder: 'users',
          aiControlled: false
        },
        useCustomSchema: {
          type: 'boolean',
          label: 'Use Custom Schema',
          description: 'Whether to use a database schema different from the default "public" schema',
          default: false,
          required: false,
          aiControlled: false
        },
        schema: {
          type: 'string',
          label: 'Schema',
          description: 'Name of database schema to use for table',
          default: 'public',
          required: false,
          displayOptions: {
            show: {
              useCustomSchema: [true]
            }
          },
          aiControlled: false
        },
        filters: {
          type: 'string',
          inputType: 'textarea',
          label: 'Select Conditions',
          description: 'JSON array of filter conditions to find the row',
          placeholder: '[{"column": "id", "operator": "eq", "value": "123"}]',
          required: true,
          aiControlled: false
        }
      },
      outputSchema: {
        data: { type: 'array', description: 'Retrieved rows' }
      }
    },
    {
      id: 'get_all_rows',
      name: 'Get Many Rows',
      description: 'Get many rows from a Supabase table',
      category: 'Row',
      icon: 'list',
      verified: false,
      api: {
        endpoint: '/{tableId}',
        method: 'GET',
        baseUrl: '{host}/rest/v1',
        headers: {
          'Content-Type': 'application/json',
          'apikey': '{serviceRole}',
          'Authorization': 'Bearer {serviceRole}'
        }
      },
      inputSchema: {
        tableId: {
          type: 'string',
          required: true,
          label: 'Table Name',
          description: 'The name of the table to get rows from',
          placeholder: 'users',
          aiControlled: false
        },
        useCustomSchema: {
          type: 'boolean',
          label: 'Use Custom Schema',
          description: 'Whether to use a database schema different from the default "public" schema',
          default: false,
          required: false,
          aiControlled: false
        },
        schema: {
          type: 'string',
          label: 'Schema',
          description: 'Name of database schema to use for table',
          default: 'public',
          required: false,
          displayOptions: {
            show: {
              useCustomSchema: [true]
            }
          },
          aiControlled: false
        },
        returnAll: {
          type: 'boolean',
          label: 'Return All',
          description: 'Whether to return all results or only up to a given limit',
          default: false,
          required: false,
          aiControlled: false
        },
        limit: {
          type: 'number',
          label: 'Limit',
          description: 'Max number of results to return',
          default: 50,
          min: 1,
          max: 1000,
          required: false,
          displayOptions: {
            show: {
              returnAll: [false]
            }
          },
          aiControlled: false
        },
        filterType: {
          type: 'select',
          label: 'Select Type',
          description: 'How to filter rows',
          required: false,
          default: 'manual',
          options: [
            { label: 'Manually', value: 'manual' },
            { label: 'String', value: 'string' }
          ],
          aiControlled: false
        },
        matchType: {
          type: 'select',
          label: 'Match Type',
          description: 'How to match the filters',
          required: false,
          default: 'allFilters',
          options: [
            { label: 'All Select Conditions', value: 'allFilters' },
            { label: 'Any Select Condition', value: 'anyFilter' }
          ],
          displayOptions: {
            show: {
              filterType: ['manual']
            }
          },
          aiControlled: false
        },
        filters: {
          type: 'string',
          inputType: 'textarea',
          label: 'Select Conditions',
          description: 'JSON array of filter conditions',
          placeholder: '[{"column": "status", "operator": "eq", "value": "active"}]',
          required: false,
          displayOptions: {
            show: {
              filterType: ['manual']
            }
          },
          aiControlled: false
        },
        filterString: {
          type: 'string',
          label: 'Filter String',
          description: 'Filter string (e.g., status=eq.active)',
          placeholder: 'status=eq.active',
          required: false,
          displayOptions: {
            show: {
              filterType: ['string']
            }
          },
          aiControlled: false
        }
      },
      outputSchema: {
        data: { type: 'array', description: 'Retrieved rows' }
      }
    },
    {
      id: 'update_row',
      name: 'Update Row',
      description: 'Update rows in a Supabase table',
      category: 'Row',
      icon: 'edit',
      verified: false,
      api: {
        endpoint: '/{tableId}',
        method: 'PATCH',
        baseUrl: '{host}/rest/v1',
        headers: {
          'Content-Type': 'application/json',
          'apikey': '{serviceRole}',
          'Authorization': 'Bearer {serviceRole}',
          'Prefer': 'return=representation'
        }
      },
      inputSchema: {
        tableId: {
          type: 'string',
          required: true,
          label: 'Table Name',
          description: 'The name of the table to update rows in',
          placeholder: 'users',
          aiControlled: false
        },
        useCustomSchema: {
          type: 'boolean',
          label: 'Use Custom Schema',
          description: 'Whether to use a database schema different from the default "public" schema',
          default: false,
          required: false,
          aiControlled: false
        },
        schema: {
          type: 'string',
          label: 'Schema',
          description: 'Name of database schema to use for table',
          default: 'public',
          required: false,
          displayOptions: {
            show: {
              useCustomSchema: [true]
            }
          },
          aiControlled: false
        },
        filterType: {
          type: 'select',
          label: 'Select Type',
          description: 'How to filter rows to update',
          required: true,
          default: 'manual',
          options: [
            { label: 'Manually', value: 'manual' },
            { label: 'String', value: 'string' }
          ],
          aiControlled: false
        },
        matchType: {
          type: 'select',
          label: 'Match Type',
          description: 'How to match the filters',
          required: false,
          default: 'allFilters',
          options: [
            { label: 'All Select Conditions', value: 'allFilters' },
            { label: 'Any Select Condition', value: 'anyFilter' }
          ],
          displayOptions: {
            show: {
              filterType: ['manual']
            }
          },
          aiControlled: false
        },
        filters: {
          type: 'string',
          inputType: 'textarea',
          label: 'Select Conditions',
          description: 'JSON array of filter conditions',
          placeholder: '[{"column": "id", "operator": "eq", "value": "123"}]',
          required: false,
          displayOptions: {
            show: {
              filterType: ['manual']
            }
          },
          aiControlled: false
        },
        filterString: {
          type: 'string',
          label: 'Filter String',
          description: 'Filter string (e.g., id=eq.123)',
          placeholder: 'id=eq.123',
          required: false,
          displayOptions: {
            show: {
              filterType: ['string']
            }
          },
          aiControlled: false
        },
        dataToSend: {
          type: 'select',
          label: 'Data to Send',
          description: 'Choose how to send data to Supabase',
          required: true,
          default: 'autoMapInputData',
          options: [
            {
              label: 'Auto-Map Input Data to Columns',
              value: 'autoMapInputData'
            },
            {
              label: 'Define Below for Each Column',
              value: 'defineBelow'
            }
          ],
          aiControlled: false
        },
        inputsToIgnore: {
          type: 'string',
          label: 'Inputs to Ignore',
          description: 'Comma-separated list of input properties to ignore',
          placeholder: 'field1,field2',
          required: false,
          displayOptions: {
            show: {
              dataToSend: ['autoMapInputData']
            }
          },
          aiControlled: false
        },
        fieldsUi: {
          type: 'string',
          inputType: 'textarea',
          label: 'Fields',
          description: 'JSON object with field names and values to update',
          placeholder: '{\n  "name": "John Doe",\n  "email": "john@example.com"\n}',
          required: false,
          displayOptions: {
            show: {
              dataToSend: ['defineBelow']
            }
          },
          aiControlled: false
        }
      },
      outputSchema: {
        data: { type: 'array', description: 'Updated rows' }
      }
    }
  ],

  supported_triggers: []
};
