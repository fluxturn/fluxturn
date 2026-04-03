// Google Drive Connector
// Auto-generated from connector.constants.ts

import { ConnectorDefinition } from '../../shared';

export const GOOGLE_DRIVE_CONNECTOR: ConnectorDefinition = {
    name: 'google_drive',
    display_name: 'Google Drive',
    category: 'storage',
    description: 'Upload, download, share, and manage files in Google Drive',
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
      base_url: 'https://www.googleapis.com/drive/v3'
    },
    webhook_support: false,
    rate_limits: {
      requests_per_minute: 1000,
      requests_per_second: 20
    },
    sandbox_available: false,
    verified: true,
    oauth_config: {
      authorization_url: 'https://accounts.google.com/o/oauth2/v2/auth',
      token_url: 'https://oauth2.googleapis.com/token',
      scopes: [
        'https://www.googleapis.com/auth/drive',
        'https://www.googleapis.com/auth/drive.file'
      ]
    },
    supported_actions: [
      {
        id: 'upload_file',
        name: 'Upload File',
        description: 'Upload a file to Google Drive',
        category: 'File Operations',
        icon: 'upload',
        verified: false,
        inputSchema: {
          driveId: {
            type: 'string',
            label: 'Drive',
            description: 'Select drive to upload to',
            loadOptionsResource: 'drives',
            loadOptionsDescription: 'Fetch available drives',
            default: 'root',
            order: 1,
            aiControlled: false
          },
          folderId: {
            type: 'string',
            label: 'Parent Folder',
            description: 'Select parent folder (optional)',
            loadOptionsResource: 'folders',
            loadOptionsDependsOn: ['driveId'],
            loadOptionsDescription: 'Fetch folders from selected drive',
            order: 2,
            aiControlled: false
          },
          inputSource: {
            type: 'select',
            label: 'Input Source',
            description: 'Choose where to get the file from',
            default: 'direct',
            options: [
              { label: 'Direct Content', value: 'direct' },
              { label: 'Binary Data from Previous Node', value: 'binary' }
            ],
            order: 3,
            aiControlled: false
          },
          fileName: {
            type: 'string',
            label: 'File Name',
            placeholder: 'example.pdf',
            description: 'Name of the file to upload (auto-detected from binary data if not specified)',
            displayOptions: {
              show: {
                inputSource: ['direct', 'binary']
              }
            },
            order: 4,
            aiControlled: true,
            aiDescription: 'The name for the file to upload'
          },
          content: {
            type: 'string',
            label: 'File Content',
            inputType: 'textarea',
            description: 'File content (text, buffer, or base64 string)',
            required: true,
            displayOptions: {
              show: {
                inputSource: ['direct']
              }
            },
            order: 5,
            aiControlled: false
          },
          binaryPropertyName: {
            type: 'string',
            label: 'Binary Property Name',
            placeholder: 'data',
            description: 'Name of the binary property from previous node (usually "data")',
            default: 'data',
            displayOptions: {
              show: {
                inputSource: ['binary']
              }
            },
            order: 6,
            aiControlled: false
          },
          mimeType: {
            type: 'string',
            label: 'MIME Type',
            placeholder: 'application/pdf',
            description: 'File MIME type (auto-detected from binary data if not specified)',
            displayOptions: {
              show: {
                inputSource: ['direct']
              }
            },
            order: 7,
            aiControlled: false
          },
          description: {
            type: 'string',
            label: 'Description',
            inputType: 'textarea',
            description: 'File description (optional)',
            order: 8,
            aiControlled: true,
            aiDescription: 'A description for the uploaded file'
          }
        }
      },
      {
        id: 'download_file',
        name: 'Download File',
        description: 'Download a file from Google Drive',
        category: 'File Operations',
        icon: 'download',
        verified: false,
        inputSchema: {
          fileId: {
            type: 'string',
            required: true,
            label: 'File',
            description: 'Select file to download',
            loadOptionsResource: 'files',
            loadOptionsDescription: 'Fetch files from drive',
            order: 1,
            aiControlled: false
          },
          convertGoogleDocs: {
            type: 'boolean',
            label: 'Convert Google Docs',
            description: 'Convert Google native files (Docs, Sheets, Slides) to downloadable format',
            default: false,
            order: 2,
            aiControlled: false
          },
          conversionFormat: {
            type: 'select',
            label: 'Conversion Format',
            description: 'Format to convert Google native files',
            options: [
              { label: 'PDF', value: 'application/pdf' },
              { label: 'Microsoft Word', value: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' },
              { label: 'Microsoft Excel', value: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' },
              { label: 'Microsoft PowerPoint', value: 'application/vnd.openxmlformats-officedocument.presentationml.presentation' },
              { label: 'HTML', value: 'text/html' },
              { label: 'Plain Text', value: 'text/plain' }
            ],
            default: 'application/pdf',
            order: 3,
            aiControlled: false
          }
        }
      },
      {
        id: 'list_files',
        name: 'Search Files',
        description: 'Search and list files in Google Drive',
        category: 'File Operations',
        icon: 'search',
        verified: false,
        inputSchema: {
          driveId: {
            type: 'string',
            label: 'Drive',
            description: 'Select drive to search in',
            loadOptionsResource: 'drives',
            loadOptionsDescription: 'Fetch available drives',
            order: 1,
            aiControlled: false
          },
          folderId: {
            type: 'string',
            label: 'Folder',
            description: 'Search in specific folder (optional)',
            loadOptionsResource: 'folders',
            loadOptionsDependsOn: ['driveId'],
            loadOptionsDescription: 'Fetch folders from selected drive',
            order: 2,
            aiControlled: false
          },
          searchQuery: {
            type: 'string',
            label: 'Search Query',
            placeholder: 'name contains "report"',
            description: 'Google Drive query string (optional, advanced)',
            order: 3,
            aiControlled: true,
            aiDescription: 'The search query to find files in Google Drive'
          },
          fileTypes: {
            type: 'select',
            label: 'File Type Filter',
            description: 'Filter by file type',
            options: [
              { label: 'All Files', value: 'all' },
              { label: 'Folders Only', value: 'folder' },
              { label: 'Documents', value: 'document' },
              { label: 'Spreadsheets', value: 'spreadsheet' },
              { label: 'Presentations', value: 'presentation' },
              { label: 'Images', value: 'image' },
              { label: 'Videos', value: 'video' },
              { label: 'PDFs', value: 'pdf' }
            ],
            default: 'all',
            order: 4,
            aiControlled: false
          },
          includeTrashed: {
            type: 'boolean',
            label: 'Include Trashed Files',
            description: 'Include files in trash',
            default: false,
            order: 5,
            aiControlled: false
          },
          limit: {
            type: 'number',
            label: 'Limit',
            description: 'Maximum number of files to return',
            default: 100,
            min: 1,
            max: 1000,
            order: 6,
            aiControlled: false
          }
        }
      },
      {
        id: 'delete_file',
        name: 'Delete File',
        description: 'Delete or trash a file from Google Drive',
        category: 'File Operations',
        icon: 'trash',
        verified: false,
        inputSchema: {
          fileId: {
            type: 'string',
            required: true,
            label: 'File',
            description: 'Select file to delete',
            loadOptionsResource: 'files',
            loadOptionsDescription: 'Fetch files from drive',
            order: 1,
            aiControlled: false
          },
          permanentDelete: {
            type: 'boolean',
            label: 'Permanent Delete',
            description: 'Permanently delete (true) or move to trash (false)',
            default: false,
            order: 2,
            aiControlled: false
          }
        }
      },
      {
        id: 'create_directory',
        name: 'Create Folder',
        description: 'Create a new folder in Google Drive',
        category: 'Folder Operations',
        icon: 'folder-plus',
        verified: false,
        inputSchema: {
          driveId: {
            type: 'string',
            required: true,
            label: 'Drive',
            description: 'Select drive to create folder in',
            loadOptionsResource: 'drives',
            loadOptionsDescription: 'Fetch available drives',
            default: 'root',
            order: 1,
            aiControlled: false
          },
          parentFolderId: {
            type: 'string',
            label: 'Parent Folder',
            description: 'Select parent folder (optional, defaults to root)',
            loadOptionsResource: 'folders',
            loadOptionsDependsOn: ['driveId'],
            loadOptionsDescription: 'Fetch folders from selected drive',
            order: 2,
            aiControlled: false
          },
          folderName: {
            type: 'string',
            required: true,
            label: 'Folder Name',
            placeholder: 'My Folder',
            description: 'Name of the folder to create',
            order: 3,
            aiControlled: true,
            aiDescription: 'The name for the new folder'
          },
          folderColor: {
            type: 'select',
            label: 'Folder Color',
            description: 'Folder color (optional)',
            options: [
              { label: 'Default', value: '' },
              { label: 'Red', value: '#ac725e' },
              { label: 'Orange', value: '#d06b64' },
              { label: 'Yellow', value: '#f83a22' },
              { label: 'Green', value: '#16a765' },
              { label: 'Teal', value: '#42d692' },
              { label: 'Blue', value: '#4986e7' },
              { label: 'Purple', value: '#9a9cff' },
              { label: 'Pink', value: '#b99aff' },
              { label: 'Gray', value: '#8f8f8f' }
            ],
            default: '',
            order: 4,
            aiControlled: false
          }
        }
      },
      {
        id: 'share_file',
        name: 'Share File',
        description: 'Share a file or folder and get shareable link',
        category: 'Sharing',
        icon: 'share-2',
        verified: false,
        inputSchema: {
          fileId: {
            type: 'string',
            required: true,
            label: 'File/Folder',
            description: 'Select file or folder to share',
            loadOptionsResource: 'files',
            loadOptionsDescription: 'Fetch files from drive',
            order: 1,
            aiControlled: false
          },
          permissionType: {
            type: 'select',
            required: true,
            label: 'Share With',
            description: 'Who can access this file',
            options: [
              { label: 'Anyone with the link', value: 'anyone' },
              { label: 'Specific people (email)', value: 'user' },
              { label: 'Group (email)', value: 'group' },
              { label: 'Domain', value: 'domain' }
            ],
            default: 'anyone',
            order: 2,
            aiControlled: false
          },
          role: {
            type: 'select',
            required: true,
            label: 'Role',
            description: 'Permission level',
            options: [
              { label: 'Viewer (can view only)', value: 'reader' },
              { label: 'Commenter (can comment)', value: 'commenter' },
              { label: 'Editor (can edit)', value: 'writer' }
            ],
            default: 'reader',
            order: 3,
            aiControlled: false
          },
          emailAddress: {
            type: 'string',
            label: 'Email Address',
            placeholder: 'user@example.com',
            description: 'Email address (required for user/group type)',
            order: 4,
            aiControlled: false
          },
          domain: {
            type: 'string',
            label: 'Domain',
            placeholder: 'example.com',
            description: 'Domain name (required for domain type)',
            order: 5,
            aiControlled: false
          },
          sendNotificationEmail: {
            type: 'boolean',
            label: 'Send Notification Email',
            description: 'Send email notification to the user',
            default: true,
            order: 6,
            aiControlled: false
          },
          emailMessage: {
            type: 'string',
            label: 'Email Message',
            inputType: 'textarea',
            description: 'Custom message in notification email',
            order: 7,
            aiControlled: true,
            aiDescription: 'A custom message to include in the share notification email'
          }
        }
      },
      {
        id: 'get_file_metadata',
        name: 'Get File Metadata',
        description: 'Get detailed metadata about a file or folder',
        category: 'File Operations',
        icon: 'info',
        verified: false,
        inputSchema: {
          fileId: {
            type: 'string',
            required: true,
            label: 'File/Folder',
            description: 'Select file or folder',
            loadOptionsResource: 'files',
            loadOptionsDescription: 'Fetch files from drive',
            order: 1,
            aiControlled: false
          }
        }
      }
    ],
    supported_triggers: [
      {
        id: 'file_created',
        name: 'File Created',
        description: 'Triggers when a new file is created',
        eventType: 'polling',
        verified: false,
        icon: 'file-plus',
        webhookRequired: false,
        pollingEnabled: true,
        inputSchema: {
          folderId: {
            type: 'string',
            label: 'Folder ID',
            description: 'Monitor specific folder (leave empty for all)'
          },
          pollingInterval: {
            type: 'select',
            label: 'Check Interval',
            default: '5',
            options: [
              { label: 'Every Minute', value: '1' },
              { label: 'Every 5 Minutes', value: '5' },
              { label: 'Every 15 Minutes', value: '15' },
              { label: 'Every 30 Minutes', value: '30' }
            ]
          }
        },
        outputSchema: {
          type: 'object',
          properties: {
            id: { type: 'string' },
            name: { type: 'string' },
            mimeType: { type: 'string' },
            createdTime: { type: 'string' },
            webViewLink: { type: 'string' }
          }
        }
      }
    ]
  };
