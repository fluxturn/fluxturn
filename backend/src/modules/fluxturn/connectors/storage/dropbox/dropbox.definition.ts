// Dropbox Connector
// Cloud storage and file management integration

import { ConnectorDefinition } from '../../shared';

export const DROPBOX_CONNECTOR: ConnectorDefinition = {
  name: 'dropbox',
  display_name: 'Dropbox',
  category: 'storage',
  description: 'Cloud storage and file sharing platform for storing and syncing files',
  auth_type: 'multiple',

  // Support both access token and OAuth2 authentication
  auth_fields: [
    {
      key: 'authMode',
      label: 'Authentication Method',
      type: 'select',
      required: true,
      default: 'accessToken',
      description: 'Choose how to authenticate with Dropbox',
      options: [
        { label: 'Access Token (Direct)', value: 'accessToken' },
        { label: 'OAuth2 (One-Click)', value: 'oauth2' }
      ]
    },
    // Access Token fields (shown when authMode = accessToken)
    {
      key: 'accessToken',
      label: 'Access Token',
      type: 'password',
      required: true,
      placeholder: 'sl.xxxxxxxxxx',
      description: 'Your Dropbox access token from the App Console',
      helpUrl: 'https://www.dropbox.com/developers/apps',
      helpText: 'How to create a Dropbox app and get access token',
      displayOptions: {
        show: { authMode: ['accessToken'] }
      }
    },
    {
      key: 'accessType',
      label: 'App Access Type',
      type: 'select',
      default: 'full',
      description: 'The access type for your Dropbox app',
      options: [
        { label: 'Full Dropbox', value: 'full' },
        { label: 'App Folder', value: 'folder' }
      ],
      displayOptions: {
        show: { authMode: ['accessToken'] }
      }
    },
    // OAuth2 fields (shown when authMode = oauth2)
    {
      key: 'clientId',
      label: 'App Key (Client ID)',
      type: 'string',
      placeholder: 'Your Dropbox App Key',
      description: 'The App Key from your Dropbox app settings',
      helpUrl: 'https://www.dropbox.com/developers/apps',
      helpText: 'Find this in your Dropbox App Console under Settings',
      displayOptions: {
        show: { authMode: ['oauth2'] }
      }
    },
    {
      key: 'clientSecret',
      label: 'App Secret (Client Secret)',
      type: 'password',
      placeholder: 'Your Dropbox App Secret',
      description: 'The App Secret from your Dropbox app settings',
      displayOptions: {
        show: { authMode: ['oauth2'] }
      }
    }
  ],

  oauth_config: {
    authorization_url: 'https://www.dropbox.com/oauth2/authorize',
    token_url: 'https://api.dropboxapi.com/oauth2/token',
    auth_query_parameters: 'token_access_type=offline&force_reapprove=true',
    scopes: [
      'files.metadata.write',
      'files.metadata.read',
      'files.content.write',
      'files.content.read',
      'sharing.write',
      'sharing.read',
      'account_info.read'
    ]
  },

  endpoints: {
    base_url: 'https://api.dropboxapi.com/2',
    content_url: 'https://content.dropboxapi.com/2',
    files: {
      upload: '/files/upload',
      download: '/files/download',
      delete: '/files/delete_v2',
      copy: '/files/copy_v2',
      move: '/files/move_v2',
      create_folder: '/files/create_folder_v2',
      list_folder: '/files/list_folder',
      search: '/files/search_v2',
      get_metadata: '/files/get_metadata'
    }
  },

  webhook_support: true,
  rate_limits: {
    requests_per_second: 5,
    requests_per_minute: 300
  },
  sandbox_available: false,

  supported_actions: [
    // ==================== FILE OPERATIONS ====================
    {
      id: 'file_upload',
      name: 'Upload File',
      description: 'Upload a file to Dropbox',
      category: 'File',
      icon: 'upload',
      verified: false,
      api: {
        endpoint: '/files/upload',
        method: 'POST',
        baseUrl: 'https://content.dropboxapi.com/2',
        headers: {
          'Authorization': 'Bearer {accessToken}',
          'Content-Type': 'application/octet-stream',
          'Dropbox-API-Arg': '{"path": "{path}", "mode": "{mode}", "autorename": {autorename}, "mute": false}'
        }
      },
      inputSchema: {
        resource: {
          type: 'select',
          label: 'Resource',
          default: 'file',
          required: true,
          options: [
            { label: 'File', value: 'file' },
            { label: 'Folder', value: 'folder' }
          ],
          aiControlled: false
        },
        operation: {
          type: 'select',
          label: 'Operation',
          default: 'upload',
          required: true,
          displayOptions: {
            show: { resource: ['file'] }
          },
          options: [
            { label: 'Upload', value: 'upload' },
            { label: 'Download', value: 'download' },
            { label: 'Delete', value: 'delete' },
            { label: 'Copy', value: 'copy' },
            { label: 'Move', value: 'move' },
            { label: 'Search', value: 'search' }
          ],
          aiControlled: false
        },
        binaryData: {
          type: 'boolean',
          label: 'Binary Data',
          default: true,
          description: 'If the data to upload should be taken from binary field',
          displayOptions: {
            show: {
              resource: ['file'],
              operation: ['upload']
            }
          },
          aiControlled: false
        },
        path: {
          type: 'string',
          label: 'Path',
          required: true,
          placeholder: '/path/to/file.txt',
          description: 'The path where the file should be saved (including filename)',
          displayOptions: {
            show: {
              resource: ['file'],
              operation: ['upload']
            }
          },
          aiControlled: false
        },
        mode: {
          type: 'select',
          label: 'Mode',
          default: 'add',
          description: 'How to handle conflicts',
          displayOptions: {
            show: {
              resource: ['file'],
              operation: ['upload']
            }
          },
          options: [
            { label: 'Add - Rename if exists', value: 'add' },
            { label: 'Overwrite - Replace existing', value: 'overwrite' },
            { label: 'Update - Update existing', value: 'update' }
          ],
          aiControlled: false
        },
        autorename: {
          type: 'boolean',
          label: 'Auto Rename',
          default: false,
          description: 'Rename file if name already exists',
          displayOptions: {
            show: {
              resource: ['file'],
              operation: ['upload']
            }
          },
          aiControlled: false
        }
      }
    },

    {
      id: 'file_download',
      name: 'Download File',
      description: 'Download a file from Dropbox',
      category: 'File',
      icon: 'download',
      verified: false,
      api: {
        endpoint: '/files/download',
        method: 'POST',
        baseUrl: 'https://content.dropboxapi.com/2',
        headers: {
          'Authorization': 'Bearer {accessToken}',
          'Dropbox-API-Arg': '{"path": "{path}"}'
        }
      },
      inputSchema: {
        path: {
          type: 'string',
          label: 'File Path',
          required: true,
          placeholder: '/path/to/file.txt',
          description: 'The path of the file to download',
          displayOptions: {
            show: {
              resource: ['file'],
              operation: ['download']
            }
          },
          aiControlled: false
        }
      }
    },

    {
      id: 'file_delete',
      name: 'Delete File/Folder',
      description: 'Delete a file or folder from Dropbox',
      category: 'File',
      icon: 'trash',
      verified: false,
      api: {
        endpoint: '/files/delete_v2',
        method: 'POST',
        baseUrl: 'https://api.dropboxapi.com/2',
        headers: {
          'Authorization': 'Bearer {accessToken}',
          'Content-Type': 'application/json'
        },
        paramMapping: {
          path: 'path'
        }
      },
      inputSchema: {
        path: {
          type: 'string',
          label: 'Path',
          required: true,
          placeholder: '/path/to/file.txt',
          description: 'Path to the file or folder to delete',
          displayOptions: {
            show: {
              resource: ['file'],
              operation: ['delete']
            }
          },
          aiControlled: false
        }
      }
    },

    {
      id: 'file_copy',
      name: 'Copy File',
      description: 'Copy a file to another location',
      category: 'File',
      icon: 'copy',
      verified: false,
      api: {
        endpoint: '/files/copy_v2',
        method: 'POST',
        baseUrl: 'https://api.dropboxapi.com/2',
        headers: {
          'Authorization': 'Bearer {accessToken}',
          'Content-Type': 'application/json'
        },
        paramMapping: {
          fromPath: 'from_path',
          toPath: 'to_path',
          autorename: 'autorename'
        }
      },
      inputSchema: {
        fromPath: {
          type: 'string',
          label: 'From Path',
          required: true,
          placeholder: '/path/to/source.txt',
          description: 'Path of the file to copy',
          displayOptions: {
            show: {
              resource: ['file'],
              operation: ['copy']
            }
          },
          aiControlled: false
        },
        toPath: {
          type: 'string',
          label: 'To Path',
          required: true,
          placeholder: '/path/to/destination.txt',
          description: 'Destination path for the copy',
          displayOptions: {
            show: {
              resource: ['file'],
              operation: ['copy']
            }
          },
          aiControlled: false
        },
        autorename: {
          type: 'boolean',
          label: 'Auto Rename',
          default: false,
          description: 'Rename if file already exists at destination',
          displayOptions: {
            show: {
              resource: ['file'],
              operation: ['copy']
            }
          },
          aiControlled: false
        }
      }
    },

    {
      id: 'file_move',
      name: 'Move File',
      description: 'Move a file to another location',
      category: 'File',
      icon: 'move',
      verified: false,
      api: {
        endpoint: '/files/move_v2',
        method: 'POST',
        baseUrl: 'https://api.dropboxapi.com/2',
        headers: {
          'Authorization': 'Bearer {accessToken}',
          'Content-Type': 'application/json'
        },
        paramMapping: {
          fromPath: 'from_path',
          toPath: 'to_path',
          autorename: 'autorename'
        }
      },
      inputSchema: {
        fromPath: {
          type: 'string',
          label: 'From Path',
          required: true,
          placeholder: '/path/to/source.txt',
          description: 'Current path of the file',
          displayOptions: {
            show: {
              resource: ['file'],
              operation: ['move']
            }
          },
          aiControlled: false
        },
        toPath: {
          type: 'string',
          label: 'To Path',
          required: true,
          placeholder: '/path/to/destination.txt',
          description: 'New path for the file',
          displayOptions: {
            show: {
              resource: ['file'],
              operation: ['move']
            }
          },
          aiControlled: false
        },
        autorename: {
          type: 'boolean',
          label: 'Auto Rename',
          default: false,
          description: 'Rename if file already exists at destination',
          displayOptions: {
            show: {
              resource: ['file'],
              operation: ['move']
            }
          },
          aiControlled: false
        }
      }
    },

    {
      id: 'file_search',
      name: 'Search Files',
      description: 'Search for files in Dropbox',
      category: 'File',
      icon: 'search',
      verified: false,
      api: {
        endpoint: '/files/search_v2',
        method: 'POST',
        baseUrl: 'https://api.dropboxapi.com/2',
        headers: {
          'Authorization': 'Bearer {accessToken}',
          'Content-Type': 'application/json'
        },
        paramMapping: {
          query: 'query',
          path: 'options.path',
          maxResults: 'options.max_results',
          fileStatus: 'options.file_status',
          filenameOnly: 'options.filename_only'
        }
      },
      inputSchema: {
        query: {
          type: 'string',
          label: 'Query',
          required: true,
          placeholder: 'report',
          description: 'The string to search for',
          displayOptions: {
            show: {
              resource: ['file'],
              operation: ['search']
            }
          },
          aiControlled: false
        },
        path: {
          type: 'string',
          label: 'Search Path',
          default: '',
          placeholder: '/folder/path',
          description: 'The path to search in (leave empty to search all folders)',
          displayOptions: {
            show: {
              resource: ['file'],
              operation: ['search']
            }
          },
          aiControlled: false
        },
        maxResults: {
          type: 'number',
          label: 'Max Results',
          default: 100,
          min: 1,
          max: 1000,
          description: 'Maximum number of search results to return',
          displayOptions: {
            show: {
              resource: ['file'],
              operation: ['search']
            }
          },
          aiControlled: false
        },
        filenameOnly: {
          type: 'boolean',
          label: 'Filename Only',
          default: false,
          description: 'Search only file names, not content',
          displayOptions: {
            show: {
              resource: ['file'],
              operation: ['search']
            }
          },
          aiControlled: false
        }
      }
    },

    // ==================== FOLDER OPERATIONS ====================
    {
      id: 'folder_create',
      name: 'Create Folder',
      description: 'Create a new folder in Dropbox',
      category: 'Folder',
      icon: 'folder-plus',
      verified: false,
      api: {
        endpoint: '/files/create_folder_v2',
        method: 'POST',
        baseUrl: 'https://api.dropboxapi.com/2',
        headers: {
          'Authorization': 'Bearer {accessToken}',
          'Content-Type': 'application/json'
        },
        paramMapping: {
          path: 'path',
          autorename: 'autorename'
        }
      },
      inputSchema: {
        operation: {
          type: 'select',
          label: 'Operation',
          default: 'create',
          required: true,
          displayOptions: {
            show: { resource: ['folder'] }
          },
          options: [
            { label: 'Create', value: 'create' },
            { label: 'List', value: 'list' }
          ],
          aiControlled: false
        },
        path: {
          type: 'string',
          label: 'Folder Path',
          required: true,
          placeholder: '/path/to/new/folder',
          description: 'The path where the folder should be created',
          displayOptions: {
            show: {
              resource: ['folder'],
              operation: ['create']
            }
          },
          aiControlled: false
        },
        autorename: {
          type: 'boolean',
          label: 'Auto Rename',
          default: false,
          description: 'Rename folder if name already exists',
          displayOptions: {
            show: {
              resource: ['folder'],
              operation: ['create']
            }
          },
          aiControlled: false
        }
      }
    },

    {
      id: 'folder_list',
      name: 'List Folder Contents',
      description: 'List files and folders in a directory',
      category: 'Folder',
      icon: 'folder',
      verified: false,
      api: {
        endpoint: '/files/list_folder',
        method: 'POST',
        baseUrl: 'https://api.dropboxapi.com/2',
        headers: {
          'Authorization': 'Bearer {accessToken}',
          'Content-Type': 'application/json'
        },
        paramMapping: {
          path: 'path',
          recursive: 'recursive',
          includeDeleted: 'include_deleted',
          limit: 'limit'
        }
      },
      inputSchema: {
        path: {
          type: 'string',
          label: 'Folder Path',
          default: '',
          placeholder: '/folder/path',
          description: 'The folder to list (empty string for root)',
          displayOptions: {
            show: {
              resource: ['folder'],
              operation: ['list']
            }
          },
          aiControlled: false
        },
        recursive: {
          type: 'boolean',
          label: 'Recursive',
          default: false,
          description: 'List contents of subfolders recursively',
          displayOptions: {
            show: {
              resource: ['folder'],
              operation: ['list']
            }
          },
          aiControlled: false
        },
        includeDeleted: {
          type: 'boolean',
          label: 'Include Deleted',
          default: false,
          description: 'Include deleted files in results',
          displayOptions: {
            show: {
              resource: ['folder'],
              operation: ['list']
            }
          },
          aiControlled: false
        },
        limit: {
          type: 'number',
          label: 'Limit',
          default: 100,
          min: 1,
          max: 2000,
          description: 'Maximum number of items to return',
          displayOptions: {
            show: {
              resource: ['folder'],
              operation: ['list']
            }
          },
          aiControlled: false
        }
      }
    }
  ],

  supported_triggers: [
    {
      id: 'file_added',
      name: 'On File Added',
      description: 'Triggers when a new file is added to a folder (polling)',
      eventType: 'file_added',
      verified: false,
      icon: 'file-plus',
      pollingEnabled: true,
      webhookRequired: false,
      inputSchema: {
        path: {
          type: 'string',
          label: 'Folder Path',
          required: true,
          placeholder: '/folder/to/watch',
          description: 'The folder path to monitor for new files',
          aiControlled: false
        },
        recursive: {
          type: 'boolean',
          label: 'Recursive',
          default: false,
          description: 'Watch subfolders recursively',
          aiControlled: false
        },
        pollInterval: {
          type: 'number',
          label: 'Poll Interval (minutes)',
          default: 5,
          min: 1,
          max: 60,
          description: 'How often to check for new files',
          aiControlled: false
        }
      },
      outputSchema: {
        id: {
          type: 'string',
          description: 'File ID'
        },
        name: {
          type: 'string',
          description: 'File name'
        },
        path_display: {
          type: 'string',
          description: 'Full file path'
        },
        size: {
          type: 'number',
          description: 'File size in bytes'
        },
        client_modified: {
          type: 'string',
          description: 'Last modification time'
        },
        server_modified: {
          type: 'string',
          description: 'Server modification time'
        }
      }
    },

    {
      id: 'file_modified',
      name: 'On File Modified',
      description: 'Triggers when a file is modified (polling)',
      eventType: 'file_modified',
      verified: false,
      icon: 'edit',
      pollingEnabled: true,
      webhookRequired: false,
      inputSchema: {
        path: {
          type: 'string',
          label: 'Folder Path',
          required: true,
          placeholder: '/folder/to/watch',
          description: 'The folder path to monitor for modified files',
          aiControlled: false
        },
        recursive: {
          type: 'boolean',
          label: 'Recursive',
          default: false,
          description: 'Watch subfolders recursively',
          aiControlled: false
        },
        pollInterval: {
          type: 'number',
          label: 'Poll Interval (minutes)',
          default: 5,
          min: 1,
          max: 60,
          description: 'How often to check for modified files',
          aiControlled: false
        }
      },
      outputSchema: {
        id: {
          type: 'string',
          description: 'File ID'
        },
        name: {
          type: 'string',
          description: 'File name'
        },
        path_display: {
          type: 'string',
          description: 'Full file path'
        },
        size: {
          type: 'number',
          description: 'File size in bytes'
        },
        client_modified: {
          type: 'string',
          description: 'Last modification time'
        },
        server_modified: {
          type: 'string',
          description: 'Server modification time'
        }
      }
    }
  ]
};
