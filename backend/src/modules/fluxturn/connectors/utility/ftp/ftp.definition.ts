// FTP Connector Definition
// Ported from n8n to fluxturn

import { ConnectorDefinition } from '../../shared';

export const FTP_CONNECTOR: ConnectorDefinition = {
  name: 'ftp',
  display_name: 'FTP',
  category: 'utility',
  description: 'Transfer files via FTP or SFTP. Upload, download, list, rename and delete files on remote servers.',
  auth_type: 'custom',
  verified: true,
  complexity: 'Medium',

  auth_fields: [
    {
      key: 'protocol',
      label: 'Protocol',
      type: 'select',
      required: true,
      default: 'ftp',
      options: [
        { label: 'FTP', value: 'ftp' },
        { label: 'SFTP', value: 'sftp' }
      ],
      description: 'File transfer protocol to use'
    },
    {
      key: 'host',
      label: 'Host',
      type: 'string',
      required: true,
      placeholder: 'localhost',
      description: 'FTP/SFTP server hostname or IP address'
    },
    {
      key: 'port',
      label: 'Port',
      type: 'number',
      required: true,
      default: 21,
      description: 'Port number (FTP: 21, SFTP: 22)',
      displayOptions: {
        show: {
          protocol: ['ftp']
        }
      }
    },
    {
      key: 'port',
      label: 'Port',
      type: 'number',
      required: true,
      default: 22,
      description: 'Port number (FTP: 21, SFTP: 22)',
      displayOptions: {
        show: {
          protocol: ['sftp']
        }
      }
    },
    {
      key: 'username',
      label: 'Username',
      type: 'string',
      required: false,
      placeholder: 'user',
      description: 'Username for authentication'
    },
    {
      key: 'password',
      label: 'Password',
      type: 'password',
      required: false,
      description: 'Password for authentication',
      displayOptions: {
        show: {
          protocol: ['ftp']
        }
      }
    },
    {
      key: 'password',
      label: 'Password',
      type: 'password',
      required: false,
      description: 'Password for authentication (optional if using private key)',
      displayOptions: {
        show: {
          protocol: ['sftp']
        }
      }
    },
    {
      key: 'privateKey',
      label: 'Private Key',
      type: 'password',
      inputType: 'textarea',
      required: false,
      description: 'Private key for SFTP authentication (OpenSSH format)',
      displayOptions: {
        show: {
          protocol: ['sftp']
        }
      }
    },
    {
      key: 'passphrase',
      label: 'Passphrase',
      type: 'password',
      required: false,
      description: 'Passphrase for encrypted private key',
      displayOptions: {
        show: {
          protocol: ['sftp']
        }
      }
    }
  ],

  endpoints: {},

  webhook_support: false,
  rate_limits: { requests_per_minute: 60 },

  supported_actions: [
    {
      id: 'delete',
      name: 'Delete',
      description: 'Delete a file or folder from the server',
      category: 'File Operations',
      icon: 'trash',
      verified: false,
      inputSchema: {
        path: {
          type: 'string',
          required: true,
          label: 'Path',
          description: 'The file path to delete. Must contain the full path.',
          placeholder: '/public/documents/file-to-delete.txt',
          aiControlled: false
        },
        folder: {
          type: 'boolean',
          required: false,
          label: 'Folder',
          description: 'Whether to delete a folder instead of a file',
          default: false,
          aiControlled: false
        },
        recursive: {
          type: 'boolean',
          required: false,
          label: 'Recursive',
          description: 'Whether to remove all files and directories in target directory',
          default: false,
          displayOptions: {
            show: {
              folder: [true]
            }
          },
          aiControlled: false
        },
        timeout: {
          type: 'number',
          required: false,
          label: 'Timeout',
          description: 'Connection timeout in milliseconds',
          default: 10000,
          min: 1,
          aiControlled: false
        }
      },
      outputSchema: {
        success: {
          type: 'boolean',
          description: 'Whether the deletion was successful'
        }
      }
    },
    {
      id: 'download',
      name: 'Download',
      description: 'Download a file from the server',
      category: 'File Operations',
      icon: 'download',
      verified: false,
      inputSchema: {
        path: {
          type: 'string',
          required: true,
          label: 'Path',
          description: 'The file path to download. Must contain the full path.',
          placeholder: '/public/documents/file-to-download.txt',
          aiControlled: false
        },
        binaryPropertyName: {
          type: 'string',
          required: true,
          label: 'Put Output File in Field',
          description: 'The name of the output binary field to put the file in',
          default: 'data',
          aiControlled: false
        },
        enableConcurrentReads: {
          type: 'boolean',
          required: false,
          label: 'Enable Concurrent Reads',
          description: 'Whether to enable concurrent reads for downloading files (SFTP only)',
          default: false,
          aiControlled: false
        },
        maxConcurrentReads: {
          type: 'number',
          required: false,
          label: 'Max Concurrent Reads',
          description: 'Maximum number of concurrent reads',
          default: 5,
          displayOptions: {
            show: {
              enableConcurrentReads: [true]
            }
          },
          aiControlled: false
        },
        chunkSize: {
          type: 'number',
          required: false,
          label: 'Chunk Size',
          description: 'Size of each chunk in KB to download (not all servers support this)',
          default: 64,
          displayOptions: {
            show: {
              enableConcurrentReads: [true]
            }
          },
          aiControlled: false
        },
        timeout: {
          type: 'number',
          required: false,
          label: 'Timeout',
          description: 'Connection timeout in milliseconds',
          default: 10000,
          min: 1,
          aiControlled: false
        }
      },
      outputSchema: {
        data: {
          type: 'object',
          description: 'Binary file data'
        }
      }
    },
    {
      id: 'list',
      name: 'List',
      description: 'List contents of a folder',
      category: 'File Operations',
      icon: 'list',
      verified: false,
      inputSchema: {
        path: {
          type: 'string',
          required: true,
          label: 'Path',
          description: 'Path of directory to list contents of',
          placeholder: '/public/folder',
          default: '/',
          aiControlled: false
        },
        recursive: {
          type: 'boolean',
          required: true,
          label: 'Recursive',
          description: 'Whether to return all directories/files recursively found within the server',
          default: false,
          aiControlled: false
        },
        timeout: {
          type: 'number',
          required: false,
          label: 'Timeout',
          description: 'Connection timeout in milliseconds',
          default: 10000,
          min: 1,
          aiControlled: false
        }
      },
      outputSchema: {
        items: {
          type: 'array',
          description: 'List of files and folders',
          items: {
            type: {
              type: 'string',
              description: 'File type (file/directory)'
            },
            name: {
              type: 'string',
              description: 'File or folder name'
            },
            size: {
              type: 'number',
              description: 'File size in bytes'
            },
            path: {
              type: 'string',
              description: 'Full path to the item'
            }
          }
        }
      }
    },
    {
      id: 'rename',
      name: 'Rename',
      description: 'Rename or move a file or folder',
      category: 'File Operations',
      icon: 'edit',
      verified: false,
      inputSchema: {
        oldPath: {
          type: 'string',
          required: true,
          label: 'Old Path',
          description: 'Current path of the file or folder',
          placeholder: '/public/documents/old-file.txt',
          aiControlled: false
        },
        newPath: {
          type: 'string',
          required: true,
          label: 'New Path',
          description: 'New path for the file or folder',
          placeholder: '/public/documents/new-file.txt',
          aiControlled: false
        },
        createDirectories: {
          type: 'boolean',
          required: false,
          label: 'Create Directories',
          description: 'Whether to recursively create destination directory when renaming',
          default: false,
          aiControlled: false
        },
        timeout: {
          type: 'number',
          required: false,
          label: 'Timeout',
          description: 'Connection timeout in milliseconds',
          default: 10000,
          min: 1,
          aiControlled: false
        }
      },
      outputSchema: {
        success: {
          type: 'boolean',
          description: 'Whether the rename was successful'
        }
      }
    },
    {
      id: 'upload',
      name: 'Upload',
      description: 'Upload a file to the server',
      category: 'File Operations',
      icon: 'upload',
      verified: false,
      inputSchema: {
        path: {
          type: 'string',
          required: true,
          label: 'Path',
          description: 'The file path to upload to. Must contain the full path.',
          placeholder: '/public/documents/file-to-upload.txt',
          aiControlled: false
        },
        binaryData: {
          type: 'boolean',
          required: true,
          label: 'Binary File',
          description: 'Whether to upload binary data or text content',
          default: true,
          aiControlled: false
        },
        binaryPropertyName: {
          type: 'string',
          required: false,
          label: 'Input Binary Field',
          description: 'Name of the input binary field containing the file to be written',
          default: 'data',
          displayOptions: {
            show: {
              binaryData: [true]
            }
          },
          aiControlled: false
        },
        fileContent: {
          type: 'string',
          required: false,
          label: 'File Content',
          inputType: 'textarea',
          description: 'The text content of the file to upload',
          displayOptions: {
            show: {
              binaryData: [false]
            }
          },
          aiControlled: false
        },
        timeout: {
          type: 'number',
          required: false,
          label: 'Timeout',
          description: 'Connection timeout in milliseconds',
          default: 10000,
          min: 1,
          aiControlled: false
        }
      },
      outputSchema: {
        success: {
          type: 'boolean',
          description: 'Whether the upload was successful'
        }
      }
    }
  ],

  supported_triggers: []
};
