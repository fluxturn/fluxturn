// Google Sheets Connector
// Auto-generated from connector.constants.ts

import { ConnectorDefinition } from '../../shared';

export const GOOGLE_SHEETS_CONNECTOR: ConnectorDefinition = {
    name: 'google_sheets',
    display_name: 'Google Sheets',
    category: 'storage',
    description: 'Create, read, update, and manage Google Sheets spreadsheets',
    auth_type: 'multiple',
    auth_fields: [
      {
        key: 'authType',
        label: 'Authentication Type',
        type: 'select',
        required: true,
        options: [
          {
            label: 'OAuth2 (Recommended)',
            value: 'oauth2',
            description: 'Connect with your Google account using one-click OAuth'
          },
          {
            label: 'Service Account',
            value: 'service_account',
            description: 'Use a service account JSON key for server-to-server authentication'
          }
        ],
        default: 'oauth2'
      },
      // OAuth2 fields (optional - for custom OAuth apps)
      {
        key: 'clientId',
        label: 'Client ID (Optional)',
        type: 'string',
        required: false,
        placeholder: 'Your Google OAuth Client ID',
        description: 'Leave empty to use one-click OAuth',
        displayOptions: {
          authType: ['oauth2']
        }
      },
      {
        key: 'clientSecret',
        label: 'Client Secret (Optional)',
        type: 'password',
        required: false,
        placeholder: 'Your Google OAuth Client Secret',
        description: 'Leave empty to use one-click OAuth',
        displayOptions: {
          authType: ['oauth2']
        }
      },
      // Service Account fields
      {
        key: 'serviceAccountKey',
        label: 'Service Account JSON Key',
        type: 'textarea',
        required: true,
        placeholder: '{"type": "service_account", "project_id": "...", ...}',
        description: 'Paste the entire JSON key file content from Google Cloud Console',
        helpUrl: 'https://cloud.google.com/iam/docs/creating-managing-service-account-keys',
        helpText: 'How to create a service account key',
        displayOptions: {
          authType: ['service_account']
        }
      }
    ],
    endpoints: {
      base_url: 'https://sheets.googleapis.com/v4/spreadsheets'
    },
    webhook_support: false,
    rate_limits: {
      requests_per_minute: 60,
      requests_per_second: 10
    },
    sandbox_available: false,
    verified: true,
    oauth_config: {
      authorization_url: 'https://accounts.google.com/o/oauth2/v2/auth',
      token_url: 'https://oauth2.googleapis.com/token',
      scopes: [
        'https://www.googleapis.com/auth/spreadsheets',
        'https://www.googleapis.com/auth/drive.readonly',
        'https://www.googleapis.com/auth/drive.file'
      ]
    },
    supported_actions: [
      {
        id: 'append_row',
        name: 'Append Row',
        description: 'Add a new row to the end of a sheet',
        category: 'Sheet Operations',
        icon: 'plus',
        verified: false,
        api: {
          endpoint: '/{spreadsheetId}/values/{range}:append',
          method: 'POST',
          baseUrl: 'https://sheets.googleapis.com/v4/spreadsheets',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': 'Bearer {accessToken}'
          },
          paramMapping: {
            spreadsheetId: 'spreadsheetId',
            sheetName: 'range',
            values: 'values'
          }
        },
        inputSchema: {
          spreadsheetId: {
            type: 'string',
            required: true,
            label: 'Spreadsheet',
            description: 'Select a spreadsheet from your Google Drive',
            loadOptionsResource: 'spreadsheets',
            loadOptionsDescription: 'Fetch spreadsheets from Google Drive',
            order: 1
          },
          sheetName: {
            type: 'string',
            required: true,
            label: 'Sheet',
            description: 'Select a sheet from the spreadsheet',
            loadOptionsResource: 'sheets',
            loadOptionsDependsOn: ['spreadsheetId'],
            loadOptionsDescription: 'Fetch sheets from selected spreadsheet',
            order: 2
          },
          values: {
            type: 'array',
            required: true,
            label: 'Values',
            description: 'Row data as array of values',
            items: { type: 'string' },
            order: 3,
            aiControlled: true,
            aiDescription: 'Array of values to append as a new row in the spreadsheet'
          },
          valueInputOption: {
            type: 'select',
            label: 'Value Input Option',
            description: 'How to interpret the input values',
            default: 'USER_ENTERED',
            options: [
              { label: 'User Entered (Formatted)', value: 'USER_ENTERED' },
              { label: 'Raw', value: 'RAW' }
            ],
            order: 4,
            aiControlled: false
          }
        }
      },
      {
        id: 'update_row',
        name: 'Update Row',
        description: 'Update an existing row in a sheet',
        category: 'Sheet Operations',
        icon: 'edit',
        verified: false,
        api: {
          endpoint: '/{spreadsheetId}/values/{range}',
          method: 'PUT',
          baseUrl: 'https://sheets.googleapis.com/v4/spreadsheets',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': 'Bearer {accessToken}'
          }
        },
        inputSchema: {
          spreadsheetId: {
            type: 'string',
            required: true,
            label: 'Spreadsheet',
            description: 'Select a spreadsheet from your Google Drive',
            loadOptionsResource: 'spreadsheets',
            loadOptionsDescription: 'Fetch spreadsheets from Google Drive',
            order: 1,
            aiControlled: false
          },
          sheetName: {
            type: 'string',
            required: true,
            label: 'Sheet',
            description: 'Select a sheet from the spreadsheet',
            loadOptionsResource: 'sheets',
            loadOptionsDependsOn: ['spreadsheetId'],
            loadOptionsDescription: 'Fetch sheets from selected spreadsheet',
            order: 2,
            aiControlled: false
          },
          range: {
            type: 'string',
            required: true,
            label: 'Range',
            description: 'Cell range in A1 notation (e.g., A2:D2)',
            placeholder: 'A2:D2',
            order: 3,
            aiControlled: false
          },
          values: {
            type: 'array',
            required: true,
            label: 'Values',
            description: 'Row data as array of values',
            items: { type: 'string' },
            order: 4,
            aiControlled: true,
            aiDescription: 'Array of values to update in the specified row range'
          }
        }
      },
      {
        id: 'append_or_update_row',
        name: 'Append or Update Row',
        description: 'Append a new row or update an existing row based on a matching column',
        category: 'Sheet Operations',
        icon: 'edit',
        verified: false,
        api: {
          endpoint: '/{spreadsheetId}/values:batchUpdate',
          method: 'POST',
          baseUrl: 'https://sheets.googleapis.com/v4/spreadsheets',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': 'Bearer {accessToken}'
          }
        },
        inputSchema: {
          spreadsheetId: {
            type: 'string',
            required: true,
            label: 'Spreadsheet',
            description: 'Select a spreadsheet from your Google Drive',
            loadOptionsResource: 'spreadsheets',
            loadOptionsDescription: 'Fetch spreadsheets from Google Drive',
            order: 1
          },
          sheetName: {
            type: 'string',
            required: true,
            label: 'Sheet',
            description: 'Select a sheet from the spreadsheet',
            loadOptionsResource: 'sheets',
            loadOptionsDependsOn: ['spreadsheetId'],
            loadOptionsDescription: 'Fetch sheets from selected spreadsheet',
            order: 2
          },
          columns: {
            type: 'resourceMapper',
            required: true,
            label: 'Columns',
            description: 'Enter values for each column',
            loadColumnsResource: 'columns',
            loadColumnsDependsOn: ['spreadsheetId', 'sheetName'],
            order: 3,
            aiControlled: true,
            aiDescription: 'Column values to append or update in the spreadsheet'
          }
        },
        outputSchema: {
          success: {
            type: 'boolean',
            description: 'Whether the operation succeeded'
          },
          operation: {
            type: 'string',
            description: 'Whether row was "updated" or "appended"'
          },
          rowIndex: {
            type: 'number',
            description: 'The row index that was affected'
          },
          updatedRange: {
            type: 'string',
            description: 'The range that was updated'
          }
        }
      },
      {
        id: 'get_rows',
        name: 'Get Rows',
        description: 'Retrieve rows from a sheet',
        category: 'Sheet Operations',
        icon: 'download',
        verified: false,
        api: {
          endpoint: '/{spreadsheetId}/values/{range}',
          method: 'GET',
          baseUrl: 'https://sheets.googleapis.com/v4/spreadsheets',
          headers: {
            'Authorization': 'Bearer {accessToken}'
          }
        },
        inputSchema: {
          spreadsheetId: {
            type: 'string',
            required: true,
            label: 'Spreadsheet',
            description: 'Select a spreadsheet from your Google Drive',
            loadOptionsResource: 'spreadsheets',
            loadOptionsDescription: 'Fetch spreadsheets from Google Drive',
            order: 1
          },
          sheetName: {
            type: 'string',
            required: true,
            label: 'Sheet',
            description: 'Select a sheet from the spreadsheet',
            loadOptionsResource: 'sheets',
            loadOptionsDependsOn: ['spreadsheetId'],
            loadOptionsDescription: 'Fetch sheets from selected spreadsheet',
            order: 2
          },
          range: {
            type: 'string',
            required: false,
            label: 'Range',
            inputType: 'rangeSelector',
            description: 'Select start and end column/row. Leave empty to get all rows.',
            placeholder: 'A1:D10',
            order: 3
          },
          returnLinkToSheet: {
            type: 'boolean',
            label: 'Return link to sheet',
            description: 'Include spreadsheet URL in output',
            default: false,
            order: 4
          }
        },
        outputSchema: {
          values: {
            type: 'array',
            description: 'Sheet values as array of rows'
          },
          range: {
            type: 'string',
            description: 'The range that was returned'
          },
          spreadsheetUrl: {
            type: 'string',
            description: 'URL to the spreadsheet (if returnLinkToSheet is true)'
          }
        }
      },
      {
        id: 'clear',
        name: 'Clear Range',
        description: 'Clear values from a range',
        category: 'Sheet Operations',
        icon: 'trash',
        verified: false,
        api: {
          endpoint: '/{spreadsheetId}/values/{range}:clear',
          method: 'POST',
          baseUrl: 'https://sheets.googleapis.com/v4/spreadsheets',
          headers: {
            'Authorization': 'Bearer {accessToken}'
          }
        },
        inputSchema: {
          spreadsheetId: {
            type: 'string',
            required: true,
            label: 'Spreadsheet',
            description: 'Select a spreadsheet from your Google Drive',
            loadOptionsResource: 'spreadsheets',
            loadOptionsDescription: 'Fetch spreadsheets from Google Drive',
            order: 1
          },
          sheetName: {
            type: 'string',
            required: true,
            label: 'Sheet',
            description: 'Select a sheet from the spreadsheet',
            loadOptionsResource: 'sheets',
            loadOptionsDependsOn: ['spreadsheetId'],
            loadOptionsDescription: 'Fetch sheets from selected spreadsheet',
            order: 2
          },
          range: {
            type: 'string',
            required: true,
            label: 'Range',
            description: 'Cell range in A1 notation (e.g., A1:D10)',
            placeholder: 'A1:D10',
            order: 3
          }
        }
      },
      {
        id: 'create_spreadsheet',
        name: 'Create Spreadsheet',
        description: 'Create a new spreadsheet',
        category: 'Spreadsheet Operations',
        icon: 'file-plus',
        verified: false,
        api: {
          endpoint: '',
          method: 'POST',
          baseUrl: 'https://sheets.googleapis.com/v4/spreadsheets',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': 'Bearer {accessToken}'
          }
        },
        inputSchema: {
          title: {
            type: 'string',
            required: true,
            label: 'Title',
            description: 'Spreadsheet title',
            placeholder: 'My New Spreadsheet',
            aiControlled: true,
            aiDescription: 'Title for the new spreadsheet'
          },
          sheetTitle: {
            type: 'string',
            label: 'Sheet Title',
            description: 'First sheet name',
            default: 'Sheet1',
            aiControlled: true,
            aiDescription: 'Name for the first sheet in the spreadsheet'
          }
        }
      }
    ],
    supported_triggers: [
      {
        id: 'row_added',
        name: 'Row Added',
        description: 'Triggers when new rows are added',
        eventType: 'polling',
        verified: false,
        icon: 'plus-circle',
        webhookRequired: false,
        pollingEnabled: true,
        inputSchema: {
          spreadsheetId: {
            type: 'string',
            required: true,
            label: 'Spreadsheet',
            description: 'Select a spreadsheet to monitor',
            loadOptionsResource: 'spreadsheets',
            loadOptionsDescription: 'Fetch spreadsheets from Google Drive',
            order: 1
          },
          sheetName: {
            type: 'string',
            required: true,
            label: 'Sheet',
            description: 'Select a sheet to monitor for new rows',
            loadOptionsResource: 'sheets',
            loadOptionsDependsOn: ['spreadsheetId'],
            loadOptionsDescription: 'Fetch sheets from selected spreadsheet',
            order: 2
          },
          pollingInterval: {
            type: 'select',
            label: 'Check Interval',
            description: 'How often to check for new rows',
            default: '5',
            options: [
              { label: 'Every Minute', value: '1' },
              { label: 'Every 5 Minutes', value: '5' },
              { label: 'Every 15 Minutes', value: '15' },
              { label: 'Every 30 Minutes', value: '30' },
              { label: 'Every Hour', value: '60' }
            ],
            order: 3
          }
        },
        outputSchema: {
          type: 'array',
          items: {
            type: 'object',
            description: 'Row data as key-value pairs'
          }
        }
      }
    ]
  };
