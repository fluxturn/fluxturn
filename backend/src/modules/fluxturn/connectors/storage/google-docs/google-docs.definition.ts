// Google Docs Connector
// Auto-generated from connector.constants.ts

import { ConnectorDefinition } from '../../shared';

export const GOOGLE_DOCS_CONNECTOR: ConnectorDefinition = {
    name: 'google_docs',
    display_name: 'Google Docs',
    category: 'storage',
    description: 'Create, edit, and manage Google Docs documents',
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
    oauth_config: {
      authorization_url: 'https://accounts.google.com/o/oauth2/v2/auth',
      token_url: 'https://oauth2.googleapis.com/token',
      scopes: [
        'https://www.googleapis.com/auth/documents',
        'https://www.googleapis.com/auth/drive.file',
        'https://www.googleapis.com/auth/drive.readonly'
      ]
    },
    endpoints: {
      base_url: 'https://docs.googleapis.com/v1',
      drive_base_url: 'https://www.googleapis.com/drive/v3'
    },
    webhook_support: false,
    rate_limits: {
      requests_per_second: 10,
      requests_per_minute: 600
    },
    sandbox_available: false,
    verified: true,
    supported_actions: [
      {
        id: 'create_document',
        name: 'Create Document',
        description: 'Create a new Google Docs document',
        category: 'Documents',
        verified: false,
        api: {
          endpoint: '/documents',
          method: 'POST',
          baseUrl: 'https://docs.googleapis.com/v1',
          headers: {
            'Authorization': 'Bearer {accessToken}',
            'Content-Type': 'application/json'
          },
          paramMapping: {
            title: 'title'
          }
        },
        inputSchema: {
          title: {
            type: 'string',
            required: true,
            label: 'Document Title',
            placeholder: 'My New Document',
            description: 'Title of the new document',
            aiControlled: true,
            aiDescription: 'Title for the new Google Docs document'
          }
        },
        outputSchema: {
          documentId: { type: 'string', description: 'ID of the created document' },
          title: { type: 'string', description: 'Document title' },
          revisionId: { type: 'string', description: 'Revision ID' },
          documentUrl: { type: 'string', description: 'URL to access the document' }
        }
      },
      {
        id: 'get_document',
        name: 'Get Document',
        description: 'Retrieve a Google Docs document content',
        category: 'Documents',
        verified: false,
        api: {
          endpoint: '/documents/{documentId}',
          method: 'GET',
          baseUrl: 'https://docs.googleapis.com/v1',
          headers: {
            'Authorization': 'Bearer {accessToken}'
          },
          paramMapping: {
            documentId: 'documentId'
          }
        },
        inputSchema: {
          documentId: {
            type: 'string',
            required: true,
            label: 'Document ID',
            placeholder: '1abc2def3ghiJKLmnop4qrs',
            description: 'ID of the document to retrieve'
          },
          suggestionsViewMode: {
            type: 'select',
            label: 'Suggestions View Mode',
            description: 'How to view suggestions (optional)',
            options: [
              { label: 'Suggestions Inline', value: 'SUGGESTIONS_INLINE' },
              { label: 'Preview Suggestions Accepted', value: 'PREVIEW_SUGGESTIONS_ACCEPTED' },
              { label: 'Preview Without Suggestions', value: 'PREVIEW_WITHOUT_SUGGESTIONS' }
            ]
          }
        },
        outputSchema: {
          documentId: { type: 'string', description: 'Document ID' },
          title: { type: 'string', description: 'Document title' },
          body: { type: 'object', description: 'Document body content' },
          revisionId: { type: 'string', description: 'Current revision ID' },
          suggestedChanges: { type: 'object', description: 'Suggested changes if any' }
        }
      },
      {
        id: 'append_text',
        name: 'Append Text',
        description: 'Append text to the end of a document',
        category: 'Content',
        verified: false,
        api: {
          endpoint: '/documents/{documentId}:batchUpdate',
          method: 'POST',
          baseUrl: 'https://docs.googleapis.com/v1',
          headers: {
            'Authorization': 'Bearer {accessToken}',
            'Content-Type': 'application/json'
          }
        },
        inputSchema: {
          documentId: {
            type: 'string',
            required: true,
            label: 'Document ID',
            placeholder: '1abc2def3ghiJKLmnop4qrs',
            description: 'ID of the document',
            aiControlled: false
          },
          text: {
            type: 'string',
            required: true,
            label: 'Text',
            inputType: 'textarea',
            placeholder: 'Text to append to the document',
            description: 'Content to add at the end of the document',
            aiControlled: true,
            aiDescription: 'Text content to append to the document'
          }
        },
        outputSchema: {
          documentId: { type: 'string', description: 'Document ID' },
          replies: { type: 'array', description: 'Batch update replies' }
        }
      },
      {
        id: 'insert_text',
        name: 'Insert Text',
        description: 'Insert text at a specific location in the document',
        category: 'Content',
        verified: false,
        api: {
          endpoint: '/documents/{documentId}:batchUpdate',
          method: 'POST',
          baseUrl: 'https://docs.googleapis.com/v1',
          headers: {
            'Authorization': 'Bearer {accessToken}',
            'Content-Type': 'application/json'
          }
        },
        inputSchema: {
          documentId: {
            type: 'string',
            required: true,
            label: 'Document ID',
            placeholder: '1abc2def3ghiJKLmnop4qrs',
            description: 'ID of the document',
            aiControlled: false
          },
          text: {
            type: 'string',
            required: true,
            label: 'Text',
            inputType: 'textarea',
            placeholder: 'Text to insert',
            description: 'Content to insert',
            aiControlled: true,
            aiDescription: 'Text content to insert at the specified position'
          },
          index: {
            type: 'number',
            required: true,
            label: 'Insert Index',
            placeholder: 1,
            min: 1,
            description: 'Position in the document to insert text (1 = beginning)',
            aiControlled: false
          }
        },
        outputSchema: {
          documentId: { type: 'string', description: 'Document ID' },
          replies: { type: 'array', description: 'Batch update replies' }
        }
      },
      {
        id: 'replace_text',
        name: 'Replace Text',
        description: 'Replace all instances of text in the document',
        category: 'Content',
        verified: false,
        api: {
          endpoint: '/documents/{documentId}:batchUpdate',
          method: 'POST',
          baseUrl: 'https://docs.googleapis.com/v1',
          headers: {
            'Authorization': 'Bearer {accessToken}',
            'Content-Type': 'application/json'
          }
        },
        inputSchema: {
          documentId: {
            type: 'string',
            required: true,
            label: 'Document ID',
            placeholder: '1abc2def3ghiJKLmnop4qrs',
            description: 'ID of the document'
          },
          findText: {
            type: 'string',
            required: true,
            label: 'Find Text',
            placeholder: 'old text',
            description: 'Text to find and replace',
            aiControlled: true,
            aiDescription: 'Text pattern to search for in the document'
          },
          replaceText: {
            type: 'string',
            required: true,
            label: 'Replace With',
            placeholder: 'new text',
            description: 'Text to replace with',
            aiControlled: true,
            aiDescription: 'Replacement text'
          },
          matchCase: {
            type: 'boolean',
            label: 'Match Case',
            default: false,
            description: 'Whether the search is case sensitive'
          }
        },
        outputSchema: {
          documentId: { type: 'string', description: 'Document ID' },
          occurrencesChanged: { type: 'number', description: 'Number of replacements made' }
        }
      },
      {
        id: 'delete_content',
        name: 'Delete Content',
        description: 'Delete content from a specific range in the document',
        category: 'Content',
        verified: false,
        api: {
          endpoint: '/documents/{documentId}:batchUpdate',
          method: 'POST',
          baseUrl: 'https://docs.googleapis.com/v1',
          headers: {
            'Authorization': 'Bearer {accessToken}',
            'Content-Type': 'application/json'
          }
        },
        inputSchema: {
          documentId: {
            type: 'string',
            required: true,
            label: 'Document ID',
            placeholder: '1abc2def3ghiJKLmnop4qrs',
            description: 'ID of the document'
          },
          startIndex: {
            type: 'number',
            required: true,
            label: 'Start Index',
            placeholder: 1,
            min: 1,
            description: 'Starting position of content to delete'
          },
          endIndex: {
            type: 'number',
            required: true,
            label: 'End Index',
            placeholder: 100,
            min: 1,
            description: 'Ending position of content to delete'
          }
        },
        outputSchema: {
          documentId: { type: 'string', description: 'Document ID' },
          success: { type: 'boolean', description: 'Whether deletion was successful' }
        }
      },
      {
        id: 'format_text',
        name: 'Format Text',
        description: 'Apply text formatting to a range of text',
        category: 'Formatting',
        verified: false,
        api: {
          endpoint: '/documents/{documentId}:batchUpdate',
          method: 'POST',
          baseUrl: 'https://docs.googleapis.com/v1',
          headers: {
            'Authorization': 'Bearer {accessToken}',
            'Content-Type': 'application/json'
          }
        },
        inputSchema: {
          documentId: {
            type: 'string',
            required: true,
            label: 'Document ID',
            placeholder: '1abc2def3ghiJKLmnop4qrs',
            description: 'ID of the document'
          },
          startIndex: {
            type: 'number',
            required: true,
            label: 'Start Index',
            placeholder: 1,
            min: 1,
            description: 'Starting position of text to format'
          },
          endIndex: {
            type: 'number',
            required: true,
            label: 'End Index',
            placeholder: 100,
            min: 1,
            description: 'Ending position of text to format'
          },
          bold: {
            type: 'boolean',
            label: 'Bold',
            description: 'Make text bold'
          },
          italic: {
            type: 'boolean',
            label: 'Italic',
            description: 'Make text italic'
          },
          underline: {
            type: 'boolean',
            label: 'Underline',
            description: 'Underline text'
          },
          fontSize: {
            type: 'number',
            label: 'Font Size (pt)',
            placeholder: 11,
            min: 1,
            max: 96,
            description: 'Font size in points'
          },
          foregroundColor: {
            type: 'string',
            label: 'Text Color',
            placeholder: '#000000',
            description: 'Text color in hex format'
          },
          backgroundColor: {
            type: 'string',
            label: 'Background Color',
            placeholder: '#FFFFFF',
            description: 'Background color in hex format'
          }
        },
        outputSchema: {
          documentId: { type: 'string', description: 'Document ID' },
          success: { type: 'boolean', description: 'Whether formatting was successful' }
        }
      },
      {
        id: 'insert_table',
        name: 'Insert Table',
        description: 'Insert a table at a specific location',
        category: 'Tables',
        verified: false,
        api: {
          endpoint: '/documents/{documentId}:batchUpdate',
          method: 'POST',
          baseUrl: 'https://docs.googleapis.com/v1',
          headers: {
            'Authorization': 'Bearer {accessToken}',
            'Content-Type': 'application/json'
          }
        },
        inputSchema: {
          documentId: {
            type: 'string',
            required: true,
            label: 'Document ID',
            placeholder: '1abc2def3ghiJKLmnop4qrs',
            description: 'ID of the document'
          },
          index: {
            type: 'number',
            required: true,
            label: 'Insert Index',
            placeholder: 1,
            min: 1,
            description: 'Position to insert the table'
          },
          rows: {
            type: 'number',
            required: true,
            label: 'Number of Rows',
            placeholder: 3,
            min: 1,
            max: 20,
            description: 'Number of rows in the table'
          },
          columns: {
            type: 'number',
            required: true,
            label: 'Number of Columns',
            placeholder: 3,
            min: 1,
            max: 20,
            description: 'Number of columns in the table'
          }
        },
        outputSchema: {
          documentId: { type: 'string', description: 'Document ID' },
          tableId: { type: 'string', description: 'ID of the created table' }
        }
      },
      {
        id: 'insert_image',
        name: 'Insert Image',
        description: 'Insert an image from a URL into the document',
        category: 'Media',
        verified: false,
        api: {
          endpoint: '/documents/{documentId}:batchUpdate',
          method: 'POST',
          baseUrl: 'https://docs.googleapis.com/v1',
          headers: {
            'Authorization': 'Bearer {accessToken}',
            'Content-Type': 'application/json'
          }
        },
        inputSchema: {
          documentId: {
            type: 'string',
            required: true,
            label: 'Document ID',
            placeholder: '1abc2def3ghiJKLmnop4qrs',
            description: 'ID of the document'
          },
          imageUrl: {
            type: 'string',
            required: true,
            label: 'Image URL',
            placeholder: 'https://example.com/image.jpg',
            description: 'URL of the image to insert'
          },
          index: {
            type: 'number',
            required: true,
            label: 'Insert Index',
            placeholder: 1,
            min: 1,
            description: 'Position to insert the image'
          },
          width: {
            type: 'number',
            label: 'Width (pixels)',
            placeholder: 400,
            min: 1,
            description: 'Image width in pixels (optional)'
          },
          height: {
            type: 'number',
            label: 'Height (pixels)',
            placeholder: 300,
            min: 1,
            description: 'Image height in pixels (optional)'
          }
        },
        outputSchema: {
          documentId: { type: 'string', description: 'Document ID' },
          objectId: { type: 'string', description: 'ID of the inserted image' }
        }
      },
      {
        id: 'create_named_range',
        name: 'Create Named Range',
        description: 'Create a named range for a section of the document',
        category: 'Content',
        verified: false,
        api: {
          endpoint: '/documents/{documentId}:batchUpdate',
          method: 'POST',
          baseUrl: 'https://docs.googleapis.com/v1',
          headers: {
            'Authorization': 'Bearer {accessToken}',
            'Content-Type': 'application/json'
          }
        },
        inputSchema: {
          documentId: {
            type: 'string',
            required: true,
            label: 'Document ID',
            placeholder: '1abc2def3ghiJKLmnop4qrs',
            description: 'ID of the document'
          },
          name: {
            type: 'string',
            required: true,
            label: 'Range Name',
            placeholder: 'introduction',
            description: 'Name for the range',
            aiControlled: true,
            aiDescription: 'Name identifier for the named range'
          },
          startIndex: {
            type: 'number',
            required: true,
            label: 'Start Index',
            placeholder: 1,
            min: 1,
            description: 'Starting position of the range'
          },
          endIndex: {
            type: 'number',
            required: true,
            label: 'End Index',
            placeholder: 100,
            min: 1,
            description: 'Ending position of the range'
          }
        },
        outputSchema: {
          documentId: { type: 'string', description: 'Document ID' },
          namedRangeId: { type: 'string', description: 'ID of the created named range' }
        }
      }
    ],
    supported_triggers: [
      {
        id: 'document_created',
        name: 'Document Created',
        description: 'Triggers when a new document is created',
        eventType: 'polling',
        verified: false,
        pollingEnabled: true,
        inputSchema: {
          folderId: {
            type: 'string',
            label: 'Folder ID',
            placeholder: 'root',
            default: 'root',
            description: 'Monitor documents in this folder (use "root" for My Drive)'
          },
          pollInterval: {
            type: 'number',
            label: 'Poll Interval (minutes)',
            default: 5,
            min: 1,
            max: 60,
            description: 'How often to check for new documents'
          }
        },
        outputSchema: {
          documentId: { type: 'string', description: 'ID of the created document' },
          title: { type: 'string', description: 'Document title' },
          createdTime: { type: 'string', description: 'Creation timestamp' },
          webViewLink: { type: 'string', description: 'Link to view the document' },
          mimeType: { type: 'string', description: 'MIME type' }
        }
      },
      {
        id: 'document_updated',
        name: 'Document Updated',
        description: 'Triggers when a document is modified',
        eventType: 'polling',
        verified: false,
        pollingEnabled: true,
        inputSchema: {
          documentId: {
            type: 'string',
            label: 'Document ID',
            placeholder: '1abc2def3ghiJKLmnop4qrs',
            description: 'Monitor this specific document (leave empty to monitor all)'
          },
          folderId: {
            type: 'string',
            label: 'Folder ID',
            placeholder: 'root',
            description: 'Monitor documents in this folder'
          },
          pollInterval: {
            type: 'number',
            label: 'Poll Interval (minutes)',
            default: 5,
            min: 1,
            max: 60
          }
        },
        outputSchema: {
          documentId: { type: 'string', description: 'ID of the updated document' },
          title: { type: 'string', description: 'Document title' },
          modifiedTime: { type: 'string', description: 'Last modified timestamp' },
          lastModifyingUser: { type: 'object', description: 'User who made the change' },
          revisionId: { type: 'string', description: 'Current revision ID' }
        }
      }
    ]
  };
