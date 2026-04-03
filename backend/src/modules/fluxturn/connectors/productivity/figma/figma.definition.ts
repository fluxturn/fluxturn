// Figma Connector Definition
// Converted from n8n Figma node

import { ConnectorDefinition } from '../../shared';

export const FIGMA_CONNECTOR: ConnectorDefinition = {
  name: 'figma',
  display_name: 'Figma',
  category: 'productivity',
  description: 'Monitor design changes, comments, and updates in Figma files and teams',
  auth_type: 'api_key',
  complexity: 'Medium',
  verified: true,

  auth_fields: [
    {
      key: 'accessToken',
      label: 'Access Token',
      type: 'password',
      required: true,
      placeholder: 'Enter your Figma personal access token',
      description: 'Get your personal access token from Figma Settings',
      helpUrl: 'https://www.figma.com/developers/api#authentication',
      helpText: 'How to get your access token'
    }
  ],

  endpoints: {
    base_url: 'https://api.figma.com',
    webhooks: {
      list: '/v2/teams/{teamId}/webhooks',
      create: '/v2/webhooks',
      delete: '/v2/webhooks/{webhookId}'
    },
    files: {
      get: '/v1/files/{fileKey}',
      versions: '/v1/files/{fileKey}/versions',
      comments: '/v1/files/{fileKey}/comments'
    },
    teams: {
      projects: '/v1/teams/{teamId}/projects',
      files: '/v1/teams/{teamId}/files'
    }
  },

  webhook_support: true,
  rate_limits: {
    requests_per_minute: 60,
    requests_per_second: 2
  },
  sandbox_available: false,

  supported_actions: [
    // File Operations
    {
      id: 'get_file',
      name: 'Get File',
      description: 'Get a Figma file by key',
      category: 'File',
      icon: 'file',
      verified: false,
      api: {
        endpoint: '/v1/files/{fileKey}',
        method: 'GET',
        baseUrl: 'https://api.figma.com',
        headers: {
          'X-FIGMA-TOKEN': '{accessToken}'
        },
        paramMapping: {
          fileKey: 'fileKey'
        }
      },
      inputSchema: {
        fileKey: {
          type: 'string',
          required: true,
          label: 'File Key',
          placeholder: 'abc123def456',
          description: 'The key of the Figma file. Found in the URL: figma.com/file/{FILE_KEY}/',
          inputType: 'text',
          aiControlled: false
        }
      },
      outputSchema: {
        name: {
          type: 'string',
          description: 'The name of the file'
        },
        lastModified: {
          type: 'string',
          description: 'Last modification timestamp'
        },
        document: {
          type: 'object',
          description: 'The document structure'
        },
        components: {
          type: 'object',
          description: 'File components'
        },
        schemaVersion: {
          type: 'number',
          description: 'Schema version'
        }
      }
    },
    {
      id: 'get_comments',
      name: 'Get Comments',
      description: 'Get comments from a Figma file',
      category: 'Comments',
      icon: 'message-circle',
      verified: false,
      api: {
        endpoint: '/v1/files/{fileKey}/comments',
        method: 'GET',
        baseUrl: 'https://api.figma.com',
        headers: {
          'X-FIGMA-TOKEN': '{accessToken}'
        },
        paramMapping: {
          fileKey: 'fileKey'
        }
      },
      inputSchema: {
        fileKey: {
          type: 'string',
          required: true,
          label: 'File Key',
          placeholder: 'abc123def456',
          description: 'The key of the Figma file',
          inputType: 'text',
          aiControlled: false
        }
      },
      outputSchema: {
        comments: {
          type: 'array',
          description: 'List of comments'
        }
      }
    },
    {
      id: 'post_comment',
      name: 'Post Comment',
      description: 'Post a new comment to a Figma file',
      category: 'Comments',
      icon: 'message-square',
      verified: false,
      api: {
        endpoint: '/v1/files/{fileKey}/comments',
        method: 'POST',
        baseUrl: 'https://api.figma.com',
        headers: {
          'Content-Type': 'application/json',
          'X-FIGMA-TOKEN': '{accessToken}'
        },
        paramMapping: {
          fileKey: 'fileKey',
          message: 'message',
          clientMeta: 'client_meta'
        }
      },
      inputSchema: {
        fileKey: {
          type: 'string',
          required: true,
          label: 'File Key',
          placeholder: 'abc123def456',
          description: 'The key of the Figma file',
          inputType: 'text',
          aiControlled: false
        },
        message: {
          type: 'string',
          required: true,
          label: 'Comment Message',
          placeholder: 'This looks great!',
          description: 'The text content of the comment',
          inputType: 'textarea',
          aiControlled: true,
          aiDescription: 'The comment text to post on the Figma file. Should be relevant, constructive feedback or a question about the design.'
        },
        clientMeta: {
          type: 'object',
          required: false,
          label: 'Client Meta',
          description: 'Optional metadata for positioning the comment',
          aiControlled: false
        }
      },
      outputSchema: {
        id: {
          type: 'string',
          description: 'The ID of the created comment'
        },
        message: {
          type: 'string',
          description: 'The comment message'
        },
        user: {
          type: 'object',
          description: 'User who created the comment'
        },
        createdAt: {
          type: 'string',
          description: 'Creation timestamp'
        }
      }
    },
    {
      id: 'get_file_versions',
      name: 'Get File Versions',
      description: 'Get version history of a Figma file',
      category: 'File',
      icon: 'clock',
      verified: false,
      api: {
        endpoint: '/v1/files/{fileKey}/versions',
        method: 'GET',
        baseUrl: 'https://api.figma.com',
        headers: {
          'X-FIGMA-TOKEN': '{accessToken}'
        },
        paramMapping: {
          fileKey: 'fileKey'
        }
      },
      inputSchema: {
        fileKey: {
          type: 'string',
          required: true,
          label: 'File Key',
          placeholder: 'abc123def456',
          description: 'The key of the Figma file',
          inputType: 'text',
          aiControlled: false
        }
      },
      outputSchema: {
        versions: {
          type: 'array',
          description: 'List of file versions'
        }
      }
    }
  ],

  supported_triggers: [
    {
      id: 'file_commented',
      name: 'File Commented',
      description: 'Triggers when someone comments on a file',
      eventType: 'FILE_COMMENT',
      icon: 'message-circle',
      verified: false,
      webhookRequired: true,
      inputSchema: {
        teamId: {
          type: 'string',
          required: true,
          label: 'Team ID',
          placeholder: '123456789',
          description: 'Trigger will monitor this Figma Team for changes. Team ID can be found in the URL of a Figma Team page when viewed in a web browser: figma.com/files/team/{TEAM-ID}/',
          aiControlled: false
        }
      },
      outputSchema: {
        eventType: {
          type: 'string',
          description: 'The type of event (FILE_COMMENT)'
        },
        fileKey: {
          type: 'string',
          description: 'The key of the file that was commented on'
        },
        fileName: {
          type: 'string',
          description: 'The name of the file'
        },
        timestamp: {
          type: 'string',
          description: 'When the event occurred'
        },
        triggeredBy: {
          type: 'object',
          description: 'User who triggered the event',
          properties: {
            id: { type: 'string' },
            handle: { type: 'string' }
          }
        },
        comment: {
          type: 'object',
          description: 'Comment details',
          properties: {
            id: { type: 'string' },
            message: { type: 'string' },
            parentId: { type: 'string' }
          }
        }
      }
    },
    {
      id: 'file_deleted',
      name: 'File Deleted',
      description: 'Triggers whenever a file has been deleted. Does not trigger on all files within a folder, if the folder is deleted',
      eventType: 'FILE_DELETE',
      icon: 'trash-2',
      verified: false,
      webhookRequired: true,
      inputSchema: {
        teamId: {
          type: 'string',
          required: true,
          label: 'Team ID',
          placeholder: '123456789',
          description: 'Trigger will monitor this Figma Team for changes',
          aiControlled: false
        }
      },
      outputSchema: {
        eventType: {
          type: 'string',
          description: 'The type of event (FILE_DELETE)'
        },
        fileKey: {
          type: 'string',
          description: 'The key of the deleted file'
        },
        fileName: {
          type: 'string',
          description: 'The name of the deleted file'
        },
        timestamp: {
          type: 'string',
          description: 'When the event occurred'
        },
        triggeredBy: {
          type: 'object',
          description: 'User who deleted the file'
        }
      }
    },
    {
      id: 'file_updated',
      name: 'File Updated',
      description: 'Triggers whenever a file saves or is deleted. This occurs whenever a file is closed or within 30 seconds after changes have been made',
      eventType: 'FILE_UPDATE',
      icon: 'refresh-cw',
      verified: false,
      webhookRequired: true,
      inputSchema: {
        teamId: {
          type: 'string',
          required: true,
          label: 'Team ID',
          placeholder: '123456789',
          description: 'Trigger will monitor this Figma Team for changes',
          aiControlled: false
        }
      },
      outputSchema: {
        eventType: {
          type: 'string',
          description: 'The type of event (FILE_UPDATE)'
        },
        fileKey: {
          type: 'string',
          description: 'The key of the updated file'
        },
        fileName: {
          type: 'string',
          description: 'The name of the updated file'
        },
        timestamp: {
          type: 'string',
          description: 'When the event occurred'
        },
        triggeredBy: {
          type: 'object',
          description: 'User who updated the file'
        }
      }
    },
    {
      id: 'file_version_updated',
      name: 'File Version Updated',
      description: 'Triggers whenever a named version is created in the version history of a file',
      eventType: 'FILE_VERSION_UPDATE',
      icon: 'git-branch',
      verified: false,
      webhookRequired: true,
      inputSchema: {
        teamId: {
          type: 'string',
          required: true,
          label: 'Team ID',
          placeholder: '123456789',
          description: 'Trigger will monitor this Figma Team for changes',
          aiControlled: false
        }
      },
      outputSchema: {
        eventType: {
          type: 'string',
          description: 'The type of event (FILE_VERSION_UPDATE)'
        },
        fileKey: {
          type: 'string',
          description: 'The key of the file'
        },
        fileName: {
          type: 'string',
          description: 'The name of the file'
        },
        versionId: {
          type: 'string',
          description: 'The ID of the new version'
        },
        versionLabel: {
          type: 'string',
          description: 'The label of the new version'
        },
        timestamp: {
          type: 'string',
          description: 'When the event occurred'
        },
        triggeredBy: {
          type: 'object',
          description: 'User who created the version'
        }
      }
    },
    {
      id: 'library_published',
      name: 'Library Published',
      description: 'Triggers whenever a library file is published',
      eventType: 'LIBRARY_PUBLISH',
      icon: 'package',
      verified: false,
      webhookRequired: true,
      inputSchema: {
        teamId: {
          type: 'string',
          required: true,
          label: 'Team ID',
          placeholder: '123456789',
          description: 'Trigger will monitor this Figma Team for changes',
          aiControlled: false
        }
      },
      outputSchema: {
        eventType: {
          type: 'string',
          description: 'The type of event (LIBRARY_PUBLISH)'
        },
        fileKey: {
          type: 'string',
          description: 'The key of the library file'
        },
        fileName: {
          type: 'string',
          description: 'The name of the library file'
        },
        timestamp: {
          type: 'string',
          description: 'When the event occurred'
        },
        triggeredBy: {
          type: 'object',
          description: 'User who published the library'
        }
      }
    }
  ]
};
