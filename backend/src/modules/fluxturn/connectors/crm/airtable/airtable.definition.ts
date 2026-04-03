// Airtable Connector
// Enhanced with detailed actions and triggers based on n8n implementation

import { ConnectorDefinition } from '../../shared';

export const AIRTABLE_CONNECTOR: ConnectorDefinition = {
    name: 'airtable',
    display_name: 'Airtable',
    category: 'crm',
    description: 'Cloud-based database and spreadsheet platform with powerful CRM capabilities, API-first architecture, and extensive collaboration features',
    auth_type: 'bearer_token',

    // Enhanced auth fields with detailed configuration
    auth_fields: [
      {
        key: 'apiKey',
        label: 'Personal Access Token',
        type: 'password',
        required: true,
        placeholder: 'pat***********************************',
        description: 'Your Airtable Personal Access Token',
        helpUrl: 'https://airtable.com/developers/web/guides/personal-access-tokens',
        helpText: 'How to create a Personal Access Token'
      },
      {
        key: 'baseId',
        label: 'Base ID',
        type: 'string',
        required: true,
        placeholder: 'app***************',
        description: 'The ID of your Airtable base (found in the URL or API documentation)',
        helpText: 'Base ID starts with "app" and can be found in your base URL'
      }
    ],

    endpoints: {
      base_url: 'https://api.airtable.com/v0',
      meta_bases: '/meta/bases',
      meta_tables: '/meta/bases/{baseId}/tables',
      records: '/{baseId}/{tableIdOrName}',
      record: '/{baseId}/{tableIdOrName}/{recordId}'
    },

    webhook_support: true,
    rate_limits: {
      requests_per_second: 5,
      requests_per_minute: 300,
      requests_per_hour: 18000
    },
    sandbox_available: false,

    // Detailed action definitions
    supported_actions: [
      {
        id: 'create_record',
        name: 'Create Record',
        description: 'Create a new record in an Airtable table',
        category: 'Records',
        icon: 'plus-circle',
        verified: false,
        api: {
          endpoint: '/{baseId}/{tableName}',
          method: 'POST',
          baseUrl: 'https://api.airtable.com/v0',
          headers: {
            'Authorization': 'Bearer {apiKey}',
            'Content-Type': 'application/json'
          },
          paramMapping: {
            tableName: 'tableName',
            fields: 'fields'
          }
        },
        inputSchema: {
          tableName: {
            type: 'string',
            required: true,
            label: 'Table Name',
            placeholder: 'Contacts',
            description: 'Name or ID of the table where the record will be created',
            aiControlled: false
          },
          fields: {
            type: 'object',
            required: true,
            label: 'Record Fields',
            description: 'Field values for the new record (key-value pairs)',
            inputType: 'json',
            aiControlled: true,
            aiDescription: 'Field values for the new record as key-value pairs'
          },
          typecast: {
            type: 'boolean',
            label: 'Typecast',
            description: 'Automatically convert field values to the correct type (e.g., string values for linked records and select options)',
            default: false,
            aiControlled: false
          }
        },
        outputSchema: {
          id: { type: 'string', description: 'Created record ID' },
          fields: { type: 'object', description: 'Record field values' },
          createdTime: { type: 'string', description: 'Timestamp when record was created' }
        }
      },
      {
        id: 'update_record',
        name: 'Update Record',
        description: 'Update an existing record in Airtable',
        category: 'Records',
        icon: 'edit',
        verified: false,
        api: {
          endpoint: '/{baseId}/{tableName}',
          method: 'PATCH',
          baseUrl: 'https://api.airtable.com/v0',
          headers: {
            'Authorization': 'Bearer {apiKey}',
            'Content-Type': 'application/json'
          }
        },
        inputSchema: {
          tableName: {
            type: 'string',
            required: true,
            label: 'Table Name',
            placeholder: 'Contacts',
            description: 'Name or ID of the table',
            aiControlled: false
          },
          recordId: {
            type: 'string',
            required: false,
            label: 'Record ID',
            placeholder: 'rec***************',
            description: 'ID of the record to update (starts with "rec"). Can be omitted if using column matching.',
            aiControlled: false
          },
          matchingColumns: {
            type: 'array',
            label: 'Columns to Match On',
            description: 'Columns to use for finding the record to update. If "id" is included, recordId must be provided.',
            default: ['id'],
            itemSchema: {
              type: 'string'
            },
            aiControlled: false
          },
          fields: {
            type: 'object',
            required: true,
            label: 'Fields to Update',
            description: 'Field values to update (only include fields that need updating)',
            inputType: 'json',
            aiControlled: true,
            aiDescription: 'Field values to update as key-value pairs'
          },
          typecast: {
            type: 'boolean',
            label: 'Typecast',
            description: 'Automatically convert field values to the correct type',
            default: false,
            aiControlled: false
          },
          updateAllMatches: {
            type: 'boolean',
            label: 'Update All Matches',
            description: 'Whether to update all records matching the criteria. If false, only the first match will be updated.',
            default: false,
            aiControlled: false
          }
        },
        outputSchema: {
          id: { type: 'string', description: 'Updated record ID' },
          fields: { type: 'object', description: 'Updated field values' }
        }
      },
      {
        id: 'upsert_record',
        name: 'Create or Update Record',
        description: 'Create a new record, or update the current one if it already exists (upsert)',
        category: 'Records',
        icon: 'git-merge',
        verified: false,
        api: {
          endpoint: '/{baseId}/{tableName}',
          method: 'PATCH',
          baseUrl: 'https://api.airtable.com/v0',
          headers: {
            'Authorization': 'Bearer {apiKey}',
            'Content-Type': 'application/json'
          }
        },
        inputSchema: {
          tableName: {
            type: 'string',
            required: true,
            label: 'Table Name',
            placeholder: 'Contacts',
            description: 'Name or ID of the table'
          },
          fieldsToMergeOn: {
            type: 'array',
            required: true,
            label: 'Columns to Match On',
            description: 'Columns to use for matching existing records. If no match is found, a new record will be created.',
            itemSchema: {
              type: 'string'
            }
          },
          fields: {
            type: 'object',
            required: true,
            label: 'Record Fields',
            description: 'Field values for the record',
            inputType: 'json'
          },
          typecast: {
            type: 'boolean',
            label: 'Typecast',
            description: 'Automatically convert field values to the correct type',
            default: false
          },
          updateAllMatches: {
            type: 'boolean',
            label: 'Update All Matches',
            description: 'Whether to update all records matching the criteria. If false, only the first match will be updated.',
            default: false
          }
        },
        outputSchema: {
          id: { type: 'string', description: 'Record ID' },
          fields: { type: 'object', description: 'Record field values' },
          createdTime: { type: 'string', description: 'Timestamp when record was created' }
        }
      },
      {
        id: 'get_record',
        name: 'Get Record',
        description: 'Retrieve a single record by ID',
        category: 'Records',
        icon: 'file-text',
        verified: false,
        api: {
          endpoint: '/{baseId}/{tableName}/{recordId}',
          method: 'GET',
          baseUrl: 'https://api.airtable.com/v0',
          headers: {
            'Authorization': 'Bearer {apiKey}'
          }
        },
        inputSchema: {
          tableName: {
            type: 'string',
            required: true,
            label: 'Table Name',
            placeholder: 'Contacts',
            description: 'Name or ID of the table'
          },
          recordId: {
            type: 'string',
            required: true,
            label: 'Record ID',
            placeholder: 'rec***************',
            description: 'ID of the record to retrieve'
          }
        },
        outputSchema: {
          id: { type: 'string', description: 'Record ID' },
          fields: { type: 'object', description: 'Record field values' },
          createdTime: { type: 'string', description: 'Creation timestamp' }
        }
      },
      {
        id: 'search_records',
        name: 'Search Records',
        description: 'Search for specific records or list all with advanced filtering',
        category: 'Records',
        icon: 'search',
        verified: false,
        api: {
          endpoint: '/{baseId}/{tableName}',
          method: 'GET',
          baseUrl: 'https://api.airtable.com/v0',
          headers: {
            'Authorization': 'Bearer {apiKey}'
          }
        },
        inputSchema: {
          tableName: {
            type: 'string',
            required: true,
            label: 'Table Name',
            placeholder: 'Contacts',
            description: 'Name or ID of the table to query'
          },
          filterByFormula: {
            type: 'string',
            label: 'Filter By Formula',
            placeholder: "e.g. NOT({Name} = 'Admin')",
            description: 'Airtable formula to filter records. If empty, all records will be returned.',
            inputType: 'textarea',
            helpUrl: 'https://support.airtable.com/docs/formula-field-reference',
            helpText: 'Formula field reference'
          },
          returnAll: {
            type: 'boolean',
            label: 'Return All',
            description: 'Whether to return all results or only up to a given limit',
            default: true
          },
          limit: {
            type: 'number',
            label: 'Limit',
            description: 'Maximum number of records to return (only used if Return All is false)',
            default: 100,
            min: 1,
            max: 100
          },
          sort: {
            type: 'array',
            label: 'Sort',
            description: 'Defines how the returned records should be ordered',
            itemSchema: {
              field: {
                type: 'string',
                required: true,
                label: 'Field',
                description: 'Name of the field to sort on'
              },
              direction: {
                type: 'select',
                label: 'Direction',
                options: [
                  { label: 'ASC', value: 'asc', description: 'Sort in ascending order (small -> large)' },
                  { label: 'DESC', value: 'desc', description: 'Sort in descending order (large -> small)' }
                ],
                default: 'asc',
                description: 'The sort direction'
              }
            }
          },
          view: {
            type: 'string',
            label: 'View',
            description: 'Name or ID of a view to use for filtering',
            placeholder: 'Grid view'
          },
          fields: {
            type: 'array',
            label: 'Output Fields',
            description: 'The fields you want to include in the output (leave empty for all fields)',
            itemSchema: {
              type: 'string'
            }
          }
        },
        outputSchema: {
          records: {
            type: 'array',
            description: 'Array of matching records',
            properties: {
              id: { type: 'string' },
              fields: { type: 'object' },
              createdTime: { type: 'string' }
            }
          },
          offset: { type: 'string', description: 'Pagination offset for next page' }
        }
      },
      {
        id: 'delete_record',
        name: 'Delete Record',
        description: 'Delete a record from Airtable',
        category: 'Records',
        icon: 'trash-2',
        verified: false,
        api: {
          endpoint: '/{baseId}/{tableName}/{recordId}',
          method: 'DELETE',
          baseUrl: 'https://api.airtable.com/v0',
          headers: {
            'Authorization': 'Bearer {apiKey}'
          }
        },
        inputSchema: {
          tableName: {
            type: 'string',
            required: true,
            label: 'Table Name',
            placeholder: 'Contacts',
            description: 'Name or ID of the table'
          },
          recordId: {
            type: 'string',
            required: true,
            label: 'Record ID',
            placeholder: 'rec***************',
            description: 'ID of the record to delete'
          }
        },
        outputSchema: {
          deleted: { type: 'boolean', description: 'Whether deletion was successful' },
          id: { type: 'string', description: 'ID of deleted record' }
        }
      },
      {
        id: 'get_many_bases',
        name: 'Get Many Bases',
        description: 'List all accessible Airtable bases',
        category: 'Bases',
        icon: 'database',
        verified: false,
        api: {
          endpoint: '/meta/bases',
          method: 'GET',
          baseUrl: 'https://api.airtable.com/v0',
          headers: {
            'Authorization': 'Bearer {apiKey}'
          }
        },
        inputSchema: {},
        outputSchema: {
          bases: {
            type: 'array',
            description: 'List of accessible bases',
            properties: {
              id: { type: 'string', description: 'Base ID' },
              name: { type: 'string', description: 'Base name' },
              permissionLevel: { type: 'string', description: 'Permission level' }
            }
          }
        }
      },
      {
        id: 'get_base_schema',
        name: 'Get Base Schema',
        description: 'Get the schema of the tables in a base',
        category: 'Bases',
        icon: 'layout',
        verified: false,
        api: {
          endpoint: '/meta/bases/{baseId}/tables',
          method: 'GET',
          baseUrl: 'https://api.airtable.com/v0',
          headers: {
            'Authorization': 'Bearer {apiKey}'
          }
        },
        inputSchema: {
          baseId: {
            type: 'string',
            required: false,
            label: 'Base ID',
            placeholder: 'app***************',
            description: 'Base ID (if not provided, uses the base ID from connection configuration)'
          }
        },
        outputSchema: {
          tables: {
            type: 'array',
            description: 'Array of table definitions with complete schema information',
            properties: {
              id: { type: 'string', description: 'Table ID' },
              name: { type: 'string', description: 'Table name' },
              primaryFieldId: { type: 'string', description: 'ID of the primary field' },
              fields: {
                type: 'array',
                description: 'Array of field definitions',
                properties: {
                  id: { type: 'string' },
                  name: { type: 'string' },
                  type: { type: 'string' },
                  options: { type: 'object' }
                }
              },
              views: {
                type: 'array',
                description: 'Array of view definitions',
                properties: {
                  id: { type: 'string' },
                  name: { type: 'string' },
                  type: { type: 'string' }
                }
              }
            }
          }
        }
      }
    ],

    // Detailed trigger definitions
    supported_triggers: [
      {
        id: 'record_created',
        name: 'Record Created',
        description: 'Triggers when a new record is created in a table',
        eventType: 'airtable:record_created',
        verified: false,
        icon: 'plus-circle',
        webhookRequired: true,
        inputSchema: {
          tableName: {
            type: 'string',
            required: true,
            label: 'Table Name',
            placeholder: 'Contacts',
            description: 'Name of the table to monitor for new records'
          }
        },
        outputSchema: {
          record: {
            type: 'object',
            description: 'Created record information',
            properties: {
              id: { type: 'string', description: 'Record ID' },
              fields: { type: 'object', description: 'Record fields' },
              createdTime: { type: 'string', description: 'Creation timestamp' }
            }
          },
          table: { type: 'string', description: 'Table name where record was created' }
        }
      },
      {
        id: 'record_updated',
        name: 'Record Updated',
        description: 'Triggers when a record is updated in a table',
        eventType: 'airtable:record_updated',
        verified: false,
        icon: 'edit',
        webhookRequired: true,
        inputSchema: {
          tableName: {
            type: 'string',
            required: true,
            label: 'Table Name',
            placeholder: 'Contacts',
            description: 'Name of the table to monitor for updates'
          }
        },
        outputSchema: {
          record: {
            type: 'object',
            description: 'Updated record information',
            properties: {
              id: { type: 'string', description: 'Record ID' },
              fields: { type: 'object', description: 'Updated fields' },
              createdTime: { type: 'string', description: 'Creation timestamp' }
            }
          },
          table: { type: 'string', description: 'Table name where record was updated' },
          changedFields: { type: 'array', description: 'List of fields that changed' }
        }
      },
      {
        id: 'record_deleted',
        name: 'Record Deleted',
        description: 'Triggers when a record is deleted from a table',
        eventType: 'airtable:record_deleted',
        verified: false,
        icon: 'trash-2',
        webhookRequired: true,
        inputSchema: {
          tableName: {
            type: 'string',
            required: true,
            label: 'Table Name',
            placeholder: 'Contacts',
            description: 'Name of the table to monitor for deletions'
          }
        },
        outputSchema: {
          recordId: { type: 'string', description: 'ID of the deleted record' },
          table: { type: 'string', description: 'Table name where record was deleted' }
        }
      }
    ]
  };
