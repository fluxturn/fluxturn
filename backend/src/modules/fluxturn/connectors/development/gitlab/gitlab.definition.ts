// GitLab Connector
// Repository management, webhooks, and automation for GitLab

import { ConnectorDefinition } from '../../shared';

export const GITLAB_CONNECTOR: ConnectorDefinition = {
    name: 'gitlab',
    display_name: 'GitLab',
    category: 'development',
    description: 'GitLab repository management, CI/CD pipelines, issues, merge requests, and webhooks',
    auth_type: 'multiple',
    auth_fields: [
      {
        key: 'authType',
        label: 'Authentication Type',
        type: 'select',
        required: true,
        options: [
          { label: 'OAuth2 (Recommended)', value: 'oauth2', description: 'Connect with one-click OAuth' },
          { label: 'Personal Access Token', value: 'pat', description: 'Use a GitLab Personal Access Token' },
          { label: 'Custom OAuth App', value: 'manual', description: 'Use your own GitLab OAuth app credentials' }
        ],
        default: 'oauth2'
      },
      {
        key: 'accessToken',
        label: 'Access Token',
        type: 'password',
        required: true,
        placeholder: 'glpat-xxxxxxxxxxxxxxxxxxxx',
        description: 'GitLab Personal Access Token',
        helpUrl: 'https://docs.gitlab.com/ee/user/profile/personal_access_tokens.html',
        helpText: 'How to create a Personal Access Token',
        displayOptions: { authType: ['pat'] }
      },
      {
        key: 'clientId',
        label: 'Client ID',
        type: 'string',
        required: true,
        placeholder: 'Enter your GitLab OAuth Application ID',
        description: 'OAuth2 Application ID from GitLab',
        helpUrl: 'https://docs.gitlab.com/ee/integration/oauth_provider.html',
        displayOptions: { authType: ['manual'] }
      },
      {
        key: 'clientSecret',
        label: 'Client Secret',
        type: 'password',
        required: true,
        placeholder: 'Enter your GitLab OAuth Secret',
        description: 'OAuth2 Secret from GitLab',
        displayOptions: { authType: ['manual'] }
      },
      {
        key: 'serverUrl',
        label: 'GitLab Server URL',
        type: 'string',
        required: false,
        placeholder: 'https://gitlab.com',
        default: 'https://gitlab.com',
        description: 'GitLab instance URL (use default for gitlab.com)'
      }
    ],
    endpoints: {
      base_url: 'https://gitlab.com/api/v4',
      projects: '/projects/{projectId}',
      issues: '/projects/{projectId}/issues',
      merge_requests: '/projects/{projectId}/merge_requests',
      repository: '/projects/{projectId}/repository',
      files: '/projects/{projectId}/repository/files/{filePath}',
      branches: '/projects/{projectId}/repository/branches',
      commits: '/projects/{projectId}/repository/commits',
      pipelines: '/projects/{projectId}/pipelines',
      releases: '/projects/{projectId}/releases',
      hooks: '/projects/{projectId}/hooks',
      user: '/user'
    },
    oauth_config: {
      authorization_url: 'https://gitlab.com/oauth/authorize',
      token_url: 'https://gitlab.com/oauth/token',
      scopes: [
        'api',
        'read_user',
        'read_api',
        'read_repository',
        'write_repository',
        'sudo'
      ]
    },
    webhook_support: true,
    rate_limits: {
      requests_per_minute: 600,
      requests_per_hour: 12000
    },
    sandbox_available: false,
    supported_actions: [
      {
        id: 'create_issue',
        name: 'Create Issue',
        description: 'Create a new issue in a GitLab project',
        category: 'Issues',
        icon: 'alert-circle',
        verified: false,
        api: {
          endpoint: '/projects/{projectId}/issues',
          method: 'POST',
          baseUrl: 'https://gitlab.com/api/v4',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': 'Bearer {accessToken}'
          },
          paramMapping: {
            title: 'title',
            description: 'description',
            assigneeIds: 'assignee_ids',
            labels: 'labels',
            milestoneId: 'milestone_id',
            dueDate: 'due_date'
          }
        },
        inputSchema: {
          projectId: {
            type: 'string',
            required: true,
            label: 'Project ID',
            placeholder: '12345 or group/project',
            description: 'Numeric project ID or URL-encoded path (e.g., group%2Fproject)',
            aiControlled: false
          },
          title: {
            type: 'string',
            required: true,
            label: 'Title',
            placeholder: 'Found a bug',
            description: 'Issue title',
            aiControlled: true,
            aiDescription: 'Generate a clear, concise issue title that summarizes the problem or feature request'
          },
          description: {
            type: 'string',
            required: false,
            label: 'Description',
            inputType: 'textarea',
            placeholder: 'Detailed description...',
            description: 'Issue description (markdown supported)',
            aiControlled: true,
            aiDescription: 'Generate a detailed issue description with context, steps to reproduce (for bugs), or requirements (for features). Use markdown formatting.'
          },
          assigneeIds: {
            type: 'array',
            required: false,
            label: 'Assignee IDs',
            description: 'Array of user IDs to assign',
            aiControlled: false
          },
          labels: {
            type: 'string',
            required: false,
            label: 'Labels',
            placeholder: 'bug,high-priority',
            description: 'Comma-separated labels',
            aiControlled: false
          },
          milestoneId: {
            type: 'number',
            required: false,
            label: 'Milestone ID',
            description: 'Milestone ID to associate',
            aiControlled: false
          },
          dueDate: {
            type: 'string',
            required: false,
            label: 'Due Date',
            placeholder: '2025-12-31',
            description: 'Due date in YYYY-MM-DD format',
            aiControlled: false
          }
        },
        outputSchema: {
          id: { type: 'number', description: 'Issue ID' },
          iid: { type: 'number', description: 'Issue IID (project-specific)' },
          title: { type: 'string', description: 'Issue title' },
          description: { type: 'string', description: 'Issue description' },
          state: { type: 'string', description: 'Issue state' },
          web_url: { type: 'string', description: 'Issue URL' },
          created_at: { type: 'string', description: 'Creation timestamp' }
        }
      },
      {
        id: 'get_issue',
        name: 'Get Issue',
        description: 'Get details of a specific issue',
        category: 'Issues',
        icon: 'search',
        verified: false,
        api: {
          endpoint: '/projects/{projectId}/issues/{issueIid}',
          method: 'GET',
          baseUrl: 'https://gitlab.com/api/v4',
          headers: {
            'Authorization': 'Bearer {accessToken}'
          }
        },
        inputSchema: {
          projectId: {
            type: 'string',
            required: true,
            label: 'Project ID',
            placeholder: '12345 or group/project',
            description: 'Numeric project ID or URL-encoded path',
            aiControlled: false
          },
          issueIid: {
            type: 'number',
            required: true,
            label: 'Issue IID',
            placeholder: '42',
            description: 'Issue IID (internal ID)',
            aiControlled: false
          }
        },
        outputSchema: {
          id: { type: 'number', description: 'Issue ID' },
          iid: { type: 'number', description: 'Issue IID' },
          title: { type: 'string', description: 'Issue title' },
          description: { type: 'string', description: 'Issue description' },
          state: { type: 'string', description: 'Issue state' },
          labels: { type: 'array', description: 'Labels' },
          assignees: { type: 'array', description: 'Assigned users' },
          web_url: { type: 'string', description: 'Issue URL' }
        }
      },
      {
        id: 'update_issue',
        name: 'Update Issue',
        description: 'Update an existing issue',
        category: 'Issues',
        icon: 'edit',
        verified: false,
        api: {
          endpoint: '/projects/{projectId}/issues/{issueIid}',
          method: 'PUT',
          baseUrl: 'https://gitlab.com/api/v4',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': 'Bearer {accessToken}'
          }
        },
        inputSchema: {
          projectId: {
            type: 'string',
            required: true,
            label: 'Project ID',
            placeholder: '12345 or group/project',
            description: 'Numeric project ID or URL-encoded path',
            aiControlled: false
          },
          issueIid: {
            type: 'number',
            required: true,
            label: 'Issue IID',
            placeholder: '42',
            description: 'Issue IID to update',
            aiControlled: false
          },
          title: {
            type: 'string',
            required: false,
            label: 'Title',
            description: 'New issue title',
            aiControlled: true,
            aiDescription: 'Generate an updated issue title that accurately reflects the current state or scope of the issue'
          },
          description: {
            type: 'string',
            required: false,
            label: 'Description',
            inputType: 'textarea',
            description: 'New issue description',
            aiControlled: true,
            aiDescription: 'Generate an updated issue description with current context, progress, or revised requirements. Use markdown formatting.'
          },
          state_event: {
            type: 'select',
            required: false,
            label: 'State',
            options: [
              { label: 'Close', value: 'close' },
              { label: 'Reopen', value: 'reopen' }
            ],
            description: 'Change issue state',
            aiControlled: false
          },
          labels: {
            type: 'string',
            required: false,
            label: 'Labels',
            description: 'Comma-separated labels',
            aiControlled: false
          }
        },
        outputSchema: {
          id: { type: 'number', description: 'Issue ID' },
          iid: { type: 'number', description: 'Issue IID' },
          title: { type: 'string', description: 'Issue title' },
          state: { type: 'string', description: 'Issue state' },
          web_url: { type: 'string', description: 'Issue URL' }
        }
      },
      {
        id: 'create_merge_request',
        name: 'Create Merge Request',
        description: 'Create a new merge request',
        category: 'Merge Requests',
        icon: 'git-merge',
        verified: false,
        api: {
          endpoint: '/projects/{projectId}/merge_requests',
          method: 'POST',
          baseUrl: 'https://gitlab.com/api/v4',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': 'Bearer {accessToken}'
          }
        },
        inputSchema: {
          projectId: {
            type: 'string',
            required: true,
            label: 'Project ID',
            placeholder: '12345 or group/project',
            description: 'Numeric project ID or URL-encoded path',
            aiControlled: false
          },
          title: {
            type: 'string',
            required: true,
            label: 'Title',
            placeholder: 'Amazing new feature',
            description: 'Merge request title',
            aiControlled: true,
            aiDescription: 'Generate a clear merge request title that summarizes the changes being merged'
          },
          sourceBranch: {
            type: 'string',
            required: true,
            label: 'Source Branch',
            placeholder: 'feature-branch',
            description: 'Branch containing changes',
            aiControlled: false
          },
          targetBranch: {
            type: 'string',
            required: true,
            label: 'Target Branch',
            placeholder: 'main',
            description: 'Branch to merge into',
            aiControlled: false
          },
          description: {
            type: 'string',
            required: false,
            label: 'Description',
            inputType: 'textarea',
            placeholder: 'Description of changes...',
            description: 'Merge request description',
            aiControlled: true,
            aiDescription: 'Generate a detailed merge request description including what changes were made, why, and any relevant context. Use markdown formatting.'
          },
          assigneeId: {
            type: 'number',
            required: false,
            label: 'Assignee ID',
            description: 'User ID to assign',
            aiControlled: false
          },
          labels: {
            type: 'string',
            required: false,
            label: 'Labels',
            description: 'Comma-separated labels',
            aiControlled: false
          },
          removeSourceBranch: {
            type: 'boolean',
            required: false,
            label: 'Remove Source Branch',
            default: false,
            description: 'Delete source branch after merge',
            aiControlled: false
          }
        },
        outputSchema: {
          id: { type: 'number', description: 'Merge request ID' },
          iid: { type: 'number', description: 'Merge request IID' },
          title: { type: 'string', description: 'Merge request title' },
          state: { type: 'string', description: 'Merge request state' },
          web_url: { type: 'string', description: 'Merge request URL' },
          merge_status: { type: 'string', description: 'Merge status' }
        }
      },
      {
        id: 'get_file',
        name: 'Get File',
        description: 'Get content of a file from repository',
        category: 'Files',
        icon: 'file-text',
        verified: false,
        api: {
          endpoint: '/projects/{projectId}/repository/files/{filePath}',
          method: 'GET',
          baseUrl: 'https://gitlab.com/api/v4',
          headers: {
            'Authorization': 'Bearer {accessToken}'
          }
        },
        inputSchema: {
          projectId: {
            type: 'string',
            required: true,
            label: 'Project ID',
            placeholder: '12345 or group/project',
            description: 'Numeric project ID or URL-encoded path',
            aiControlled: false
          },
          filePath: {
            type: 'string',
            required: true,
            label: 'File Path',
            placeholder: 'README.md',
            description: 'URL-encoded path to file',
            aiControlled: false
          },
          ref: {
            type: 'string',
            required: false,
            label: 'Ref',
            placeholder: 'main',
            default: 'main',
            description: 'Branch, tag, or commit SHA',
            aiControlled: false
          }
        },
        outputSchema: {
          file_name: { type: 'string', description: 'File name' },
          file_path: { type: 'string', description: 'File path' },
          size: { type: 'number', description: 'File size in bytes' },
          encoding: { type: 'string', description: 'Content encoding' },
          content: { type: 'string', description: 'File content (base64 encoded)' },
          ref: { type: 'string', description: 'Branch/tag/commit' },
          blob_id: { type: 'string', description: 'Blob ID' },
          commit_id: { type: 'string', description: 'Last commit ID' },
          last_commit_id: { type: 'string', description: 'Last commit ID' }
        }
      },
      {
        id: 'create_file',
        name: 'Create File',
        description: 'Create a new file in repository',
        category: 'Files',
        icon: 'file-plus',
        verified: false,
        api: {
          endpoint: '/projects/{projectId}/repository/files/{filePath}',
          method: 'POST',
          baseUrl: 'https://gitlab.com/api/v4',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': 'Bearer {accessToken}'
          }
        },
        inputSchema: {
          projectId: {
            type: 'string',
            required: true,
            label: 'Project ID',
            placeholder: '12345 or group/project',
            description: 'Numeric project ID or URL-encoded path',
            aiControlled: false
          },
          filePath: {
            type: 'string',
            required: true,
            label: 'File Path',
            placeholder: 'path/to/file.txt',
            description: 'Path where file will be created',
            aiControlled: false
          },
          branch: {
            type: 'string',
            required: true,
            label: 'Branch',
            placeholder: 'main',
            description: 'Branch name',
            aiControlled: false
          },
          content: {
            type: 'string',
            required: true,
            label: 'Content',
            inputType: 'textarea',
            placeholder: 'File content...',
            description: 'File content',
            aiControlled: true,
            aiDescription: 'Generate appropriate file content based on the file type and purpose'
          },
          commitMessage: {
            type: 'string',
            required: true,
            label: 'Commit Message',
            placeholder: 'Add new file',
            description: 'Commit message',
            aiControlled: true,
            aiDescription: 'Generate a clear, descriptive commit message explaining what file is being added and why'
          },
          encoding: {
            type: 'select',
            required: false,
            label: 'Encoding',
            default: 'text',
            options: [
              { label: 'Text', value: 'text' },
              { label: 'Base64', value: 'base64' }
            ],
            description: 'Content encoding',
            aiControlled: false
          }
        },
        outputSchema: {
          file_path: { type: 'string', description: 'File path' },
          branch: { type: 'string', description: 'Branch name' }
        }
      },
      {
        id: 'update_file',
        name: 'Update File',
        description: 'Update an existing file in repository',
        category: 'Files',
        icon: 'edit',
        verified: false,
        api: {
          endpoint: '/projects/{projectId}/repository/files/{filePath}',
          method: 'PUT',
          baseUrl: 'https://gitlab.com/api/v4',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': 'Bearer {accessToken}'
          }
        },
        inputSchema: {
          projectId: {
            type: 'string',
            required: true,
            label: 'Project ID',
            placeholder: '12345 or group/project',
            description: 'Numeric project ID or URL-encoded path',
            aiControlled: false
          },
          filePath: {
            type: 'string',
            required: true,
            label: 'File Path',
            placeholder: 'path/to/file.txt',
            description: 'Path to file to update',
            aiControlled: false
          },
          branch: {
            type: 'string',
            required: true,
            label: 'Branch',
            placeholder: 'main',
            description: 'Branch name',
            aiControlled: false
          },
          content: {
            type: 'string',
            required: true,
            label: 'Content',
            inputType: 'textarea',
            placeholder: 'New file content...',
            description: 'New file content',
            aiControlled: true,
            aiDescription: 'Generate updated file content based on the required changes'
          },
          commitMessage: {
            type: 'string',
            required: true,
            label: 'Commit Message',
            placeholder: 'Update file',
            description: 'Commit message',
            aiControlled: true,
            aiDescription: 'Generate a clear, descriptive commit message explaining what changes were made and why'
          }
        },
        outputSchema: {
          file_path: { type: 'string', description: 'File path' },
          branch: { type: 'string', description: 'Branch name' }
        }
      },
      {
        id: 'delete_file',
        name: 'Delete File',
        description: 'Delete a file from repository',
        category: 'Files',
        icon: 'trash-2',
        verified: false,
        api: {
          endpoint: '/projects/{projectId}/repository/files/{filePath}',
          method: 'DELETE',
          baseUrl: 'https://gitlab.com/api/v4',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': 'Bearer {accessToken}'
          }
        },
        inputSchema: {
          projectId: {
            type: 'string',
            required: true,
            label: 'Project ID',
            placeholder: '12345 or group/project',
            description: 'Numeric project ID or URL-encoded path',
            aiControlled: false
          },
          filePath: {
            type: 'string',
            required: true,
            label: 'File Path',
            placeholder: 'path/to/file.txt',
            description: 'Path to file to delete',
            aiControlled: false
          },
          branch: {
            type: 'string',
            required: true,
            label: 'Branch',
            placeholder: 'main',
            description: 'Branch name',
            aiControlled: false
          },
          commitMessage: {
            type: 'string',
            required: true,
            label: 'Commit Message',
            placeholder: 'Delete file',
            description: 'Commit message',
            aiControlled: true,
            aiDescription: 'Generate a clear commit message explaining why the file is being deleted'
          }
        },
        outputSchema: {
          file_path: { type: 'string', description: 'Deleted file path' },
          branch: { type: 'string', description: 'Branch name' }
        }
      },
      {
        id: 'create_release',
        name: 'Create Release',
        description: 'Create a new release',
        category: 'Releases',
        icon: 'tag',
        verified: false,
        api: {
          endpoint: '/projects/{projectId}/releases',
          method: 'POST',
          baseUrl: 'https://gitlab.com/api/v4',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': 'Bearer {accessToken}'
          }
        },
        inputSchema: {
          projectId: {
            type: 'string',
            required: true,
            label: 'Project ID',
            placeholder: '12345 or group/project',
            description: 'Numeric project ID or URL-encoded path',
            aiControlled: false
          },
          tagName: {
            type: 'string',
            required: true,
            label: 'Tag Name',
            placeholder: 'v1.0.0',
            description: 'Tag name for the release',
            aiControlled: false
          },
          name: {
            type: 'string',
            required: false,
            label: 'Release Name',
            placeholder: 'Version 1.0.0',
            description: 'Release name (defaults to tag name)',
            aiControlled: true,
            aiDescription: 'Generate a descriptive release name that reflects the version and key changes'
          },
          description: {
            type: 'string',
            required: false,
            label: 'Description',
            inputType: 'textarea',
            placeholder: 'Release notes...',
            description: 'Release description (markdown supported)',
            aiControlled: true,
            aiDescription: 'Generate comprehensive release notes including new features, bug fixes, breaking changes, and upgrade instructions. Use markdown formatting.'
          },
          ref: {
            type: 'string',
            required: false,
            label: 'Ref',
            placeholder: 'main',
            description: 'Branch, tag, or commit to create tag from',
            aiControlled: false
          }
        },
        outputSchema: {
          tag_name: { type: 'string', description: 'Tag name' },
          name: { type: 'string', description: 'Release name' },
          description: { type: 'string', description: 'Release description' },
          created_at: { type: 'string', description: 'Creation timestamp' },
          released_at: { type: 'string', description: 'Release timestamp' },
          _links: { type: 'object', description: 'Related URLs' }
        }
      },
      {
        id: 'get_project',
        name: 'Get Project',
        description: 'Get information about a project',
        category: 'Projects',
        icon: 'folder',
        verified: false,
        api: {
          endpoint: '/projects/{projectId}',
          method: 'GET',
          baseUrl: 'https://gitlab.com/api/v4',
          headers: {
            'Authorization': 'Bearer {accessToken}'
          }
        },
        inputSchema: {
          projectId: {
            type: 'string',
            required: true,
            label: 'Project ID',
            placeholder: '12345 or group/project',
            description: 'Numeric project ID or URL-encoded path',
            aiControlled: false
          }
        },
        outputSchema: {
          id: { type: 'number', description: 'Project ID' },
          name: { type: 'string', description: 'Project name' },
          path: { type: 'string', description: 'Project path' },
          path_with_namespace: { type: 'string', description: 'Full project path' },
          description: { type: 'string', description: 'Project description' },
          default_branch: { type: 'string', description: 'Default branch' },
          visibility: { type: 'string', description: 'Project visibility' },
          web_url: { type: 'string', description: 'Project URL' },
          star_count: { type: 'number', description: 'Star count' },
          forks_count: { type: 'number', description: 'Fork count' }
        }
      },
      {
        id: 'get_release',
        name: 'Get Release',
        description: 'Get details of a specific release',
        category: 'Releases',
        icon: 'tag',
        verified: false,
        api: {
          endpoint: '/projects/{projectId}/releases/{tagName}',
          method: 'GET',
          baseUrl: 'https://gitlab.com/api/v4',
          headers: {
            'Authorization': 'Bearer {accessToken}'
          }
        },
        inputSchema: {
          projectId: {
            type: 'string',
            required: true,
            label: 'Project ID',
            placeholder: '12345 or group/project',
            description: 'Numeric project ID or URL-encoded path',
            aiControlled: false
          },
          tagName: {
            type: 'string',
            required: true,
            label: 'Tag Name',
            placeholder: 'v1.0.0',
            description: 'Git tag name of the release',
            aiControlled: false
          }
        },
        outputSchema: {
          tag_name: { type: 'string', description: 'Tag name' },
          name: { type: 'string', description: 'Release name' },
          description: { type: 'string', description: 'Release description' },
          created_at: { type: 'string', description: 'Creation timestamp' },
          released_at: { type: 'string', description: 'Release timestamp' },
          author: { type: 'object', description: 'Release author' },
          assets: { type: 'object', description: 'Release assets' }
        }
      },
      {
        id: 'list_releases',
        name: 'List Releases',
        description: 'List all releases for a project',
        category: 'Releases',
        icon: 'list',
        verified: false,
        api: {
          endpoint: '/projects/{projectId}/releases',
          method: 'GET',
          baseUrl: 'https://gitlab.com/api/v4',
          headers: {
            'Authorization': 'Bearer {accessToken}'
          }
        },
        inputSchema: {
          projectId: {
            type: 'string',
            required: true,
            label: 'Project ID',
            placeholder: '12345 or group/project',
            description: 'Numeric project ID or URL-encoded path',
            aiControlled: false
          },
          perPage: {
            type: 'number',
            required: false,
            label: 'Per Page',
            default: 20,
            description: 'Number of releases per page (max 100)',
            aiControlled: false
          },
          page: {
            type: 'number',
            required: false,
            label: 'Page',
            default: 1,
            description: 'Page number',
            aiControlled: false
          }
        },
        outputSchema: {
          releases: { type: 'array', description: 'List of releases' },
          total: { type: 'number', description: 'Total number of releases' }
        }
      },
      {
        id: 'update_release',
        name: 'Update Release',
        description: 'Update an existing release',
        category: 'Releases',
        icon: 'edit',
        verified: false,
        api: {
          endpoint: '/projects/{projectId}/releases/{tagName}',
          method: 'PUT',
          baseUrl: 'https://gitlab.com/api/v4',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': 'Bearer {accessToken}'
          }
        },
        inputSchema: {
          projectId: {
            type: 'string',
            required: true,
            label: 'Project ID',
            placeholder: '12345 or group/project',
            description: 'Numeric project ID or URL-encoded path',
            aiControlled: false
          },
          tagName: {
            type: 'string',
            required: true,
            label: 'Tag Name',
            placeholder: 'v1.0.0',
            description: 'Git tag name of the release to update',
            aiControlled: false
          },
          name: {
            type: 'string',
            required: false,
            label: 'Release Name',
            description: 'New release name',
            aiControlled: true,
            aiDescription: 'Generate an updated release name that reflects the version and key changes'
          },
          description: {
            type: 'string',
            required: false,
            label: 'Description',
            inputType: 'textarea',
            description: 'New release description',
            aiControlled: true,
            aiDescription: 'Generate updated release notes with current information about features, fixes, and changes. Use markdown formatting.'
          },
          releasedAt: {
            type: 'string',
            required: false,
            label: 'Released At',
            placeholder: '2025-01-01T00:00:00Z',
            description: 'Release date (ISO 8601 format)',
            aiControlled: false
          }
        },
        outputSchema: {
          tag_name: { type: 'string', description: 'Tag name' },
          name: { type: 'string', description: 'Release name' },
          description: { type: 'string', description: 'Release description' },
          released_at: { type: 'string', description: 'Release timestamp' }
        }
      },
      {
        id: 'delete_release',
        name: 'Delete Release',
        description: 'Delete a release (tag is not deleted)',
        category: 'Releases',
        icon: 'trash-2',
        verified: false,
        api: {
          endpoint: '/projects/{projectId}/releases/{tagName}',
          method: 'DELETE',
          baseUrl: 'https://gitlab.com/api/v4',
          headers: {
            'Authorization': 'Bearer {accessToken}'
          }
        },
        inputSchema: {
          projectId: {
            type: 'string',
            required: true,
            label: 'Project ID',
            placeholder: '12345 or group/project',
            description: 'Numeric project ID or URL-encoded path',
            aiControlled: false
          },
          tagName: {
            type: 'string',
            required: true,
            label: 'Tag Name',
            placeholder: 'v1.0.0',
            description: 'Git tag name of the release to delete',
            aiControlled: false
          }
        },
        outputSchema: {
          tag_name: { type: 'string', description: 'Deleted tag name' },
          deleted: { type: 'boolean', description: 'Whether the release was deleted' }
        }
      },
      {
        id: 'list_issues',
        name: 'List Issues',
        description: 'List issues in a project with filters',
        category: 'Issues',
        icon: 'list',
        verified: false,
        api: {
          endpoint: '/projects/{projectId}/issues',
          method: 'GET',
          baseUrl: 'https://gitlab.com/api/v4',
          headers: {
            'Authorization': 'Bearer {accessToken}'
          }
        },
        inputSchema: {
          projectId: {
            type: 'string',
            required: true,
            label: 'Project ID',
            placeholder: '12345 or group/project',
            description: 'Numeric project ID or URL-encoded path',
            aiControlled: false
          },
          state: {
            type: 'select',
            required: false,
            label: 'State',
            default: 'all',
            options: [
              { label: 'All', value: 'all' },
              { label: 'Open', value: 'opened' },
              { label: 'Closed', value: 'closed' }
            ],
            description: 'Filter by issue state',
            aiControlled: false
          },
          labels: {
            type: 'string',
            required: false,
            label: 'Labels',
            placeholder: 'bug,high-priority',
            description: 'Comma-separated labels to filter by',
            aiControlled: false
          },
          assigneeId: {
            type: 'number',
            required: false,
            label: 'Assignee ID',
            description: 'Filter by assignee user ID',
            aiControlled: false
          },
          perPage: {
            type: 'number',
            required: false,
            label: 'Per Page',
            default: 20,
            description: 'Number of issues per page (max 100)',
            aiControlled: false
          },
          page: {
            type: 'number',
            required: false,
            label: 'Page',
            default: 1,
            description: 'Page number',
            aiControlled: false
          }
        },
        outputSchema: {
          issues: { type: 'array', description: 'List of issues' },
          total: { type: 'number', description: 'Total number of issues' }
        }
      },
      {
        id: 'create_issue_note',
        name: 'Create Issue Comment',
        description: 'Add a comment (note) to an issue',
        category: 'Issues',
        icon: 'message-square',
        verified: false,
        api: {
          endpoint: '/projects/{projectId}/issues/{issueIid}/notes',
          method: 'POST',
          baseUrl: 'https://gitlab.com/api/v4',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': 'Bearer {accessToken}'
          }
        },
        inputSchema: {
          projectId: {
            type: 'string',
            required: true,
            label: 'Project ID',
            placeholder: '12345 or group/project',
            description: 'Numeric project ID or URL-encoded path',
            aiControlled: false
          },
          issueIid: {
            type: 'number',
            required: true,
            label: 'Issue IID',
            placeholder: '42',
            description: 'Issue internal ID (IID)',
            aiControlled: false
          },
          body: {
            type: 'string',
            required: true,
            label: 'Comment',
            inputType: 'textarea',
            placeholder: 'Your comment...',
            description: 'Comment text (markdown supported)',
            aiControlled: true,
            aiDescription: 'Generate a helpful comment for the issue, providing context, updates, or relevant information. Use markdown formatting.'
          }
        },
        outputSchema: {
          id: { type: 'number', description: 'Note ID' },
          body: { type: 'string', description: 'Note body' },
          author: { type: 'object', description: 'Note author' },
          created_at: { type: 'string', description: 'Creation timestamp' }
        }
      },
      {
        id: 'list_files',
        name: 'List Files',
        description: 'List files and directories in a repository path',
        category: 'Files',
        icon: 'folder',
        verified: false,
        api: {
          endpoint: '/projects/{projectId}/repository/tree',
          method: 'GET',
          baseUrl: 'https://gitlab.com/api/v4',
          headers: {
            'Authorization': 'Bearer {accessToken}'
          }
        },
        inputSchema: {
          projectId: {
            type: 'string',
            required: true,
            label: 'Project ID',
            placeholder: '12345 or group/project',
            description: 'Numeric project ID or URL-encoded path',
            aiControlled: false
          },
          path: {
            type: 'string',
            required: false,
            label: 'Path',
            placeholder: 'src/components',
            description: 'Directory path (empty for root)',
            aiControlled: false
          },
          ref: {
            type: 'string',
            required: false,
            label: 'Ref',
            placeholder: 'main',
            default: 'main',
            description: 'Branch, tag, or commit SHA',
            aiControlled: false
          },
          recursive: {
            type: 'boolean',
            required: false,
            label: 'Recursive',
            default: false,
            description: 'List files recursively',
            aiControlled: false
          },
          perPage: {
            type: 'number',
            required: false,
            label: 'Per Page',
            default: 20,
            description: 'Number of items per page (max 100)',
            aiControlled: false
          }
        },
        outputSchema: {
          files: { type: 'array', description: 'List of files and directories' },
          total: { type: 'number', description: 'Total number of items' }
        }
      }
    ],
    supported_triggers: [
      {
        id: 'on_push',
        name: 'On Push',
        description: 'Triggered when code is pushed to a repository branch',
        eventType: 'push',
        verified: false,
        icon: 'git-commit',
        webhookRequired: true,
        pollingEnabled: false,
        inputSchema: {
          projectId: {
            type: 'string',
            required: true,
            label: 'Project ID',
            placeholder: '12345 or group/project',
            description: 'Numeric project ID or URL-encoded path',
            aiControlled: false
          },
          branch: {
            type: 'string',
            required: false,
            label: 'Branch Filter',
            placeholder: 'main',
            description: 'Only trigger for specific branch (optional)',
            aiControlled: false
          }
        },
        outputSchema: {
          object_kind: { type: 'string', description: 'Event type (push)' },
          event_name: { type: 'string', description: 'Event name' },
          before: { type: 'string', description: 'SHA before push' },
          after: { type: 'string', description: 'SHA after push' },
          ref: { type: 'string', description: 'Git ref' },
          user_name: { type: 'string', description: 'User who pushed' },
          user_email: { type: 'string', description: 'User email' },
          project: {
            type: 'object',
            description: 'Project information',
            properties: {
              id: { type: 'number' },
              name: { type: 'string' },
              path_with_namespace: { type: 'string' },
              web_url: { type: 'string' }
            }
          },
          commits: {
            type: 'array',
            description: 'Array of commits',
            properties: {
              id: { type: 'string' },
              message: { type: 'string' },
              timestamp: { type: 'string' },
              url: { type: 'string' },
              author: { type: 'object' }
            }
          }
        }
      },
      {
        id: 'on_issue',
        name: 'On Issue',
        description: 'Triggered when an issue is created, updated, or closed',
        eventType: 'issues',
        verified: false,
        icon: 'alert-circle',
        webhookRequired: true,
        pollingEnabled: false,
        inputSchema: {
          projectId: {
            type: 'string',
            required: true,
            label: 'Project ID',
            placeholder: '12345 or group/project',
            description: 'Numeric project ID or URL-encoded path',
            aiControlled: false
          },
          actions: {
            type: 'array',
            required: false,
            label: 'Actions',
            description: 'Filter by specific actions (leave empty for all)',
            aiControlled: false,
            itemSchema: {
              type: 'select',
              options: [
                { label: 'Open', value: 'open' },
                { label: 'Update', value: 'update' },
                { label: 'Close', value: 'close' },
                { label: 'Reopen', value: 'reopen' }
              ]
            }
          }
        },
        outputSchema: {
          object_kind: { type: 'string', description: 'Event type (issue)' },
          event_type: { type: 'string', description: 'Event type' },
          user: { type: 'object', description: 'User who triggered event' },
          project: { type: 'object', description: 'Project information' },
          object_attributes: {
            type: 'object',
            description: 'Issue details',
            properties: {
              id: { type: 'number' },
              iid: { type: 'number' },
              title: { type: 'string' },
              description: { type: 'string' },
              state: { type: 'string' },
              url: { type: 'string' },
              action: { type: 'string' }
            }
          }
        }
      },
      {
        id: 'on_merge_request',
        name: 'On Merge Request',
        description: 'Triggered when a merge request is created, updated, or merged',
        eventType: 'merge_requests',
        verified: false,
        icon: 'git-merge',
        webhookRequired: true,
        pollingEnabled: false,
        inputSchema: {
          projectId: {
            type: 'string',
            required: true,
            label: 'Project ID',
            placeholder: '12345 or group/project',
            description: 'Numeric project ID or URL-encoded path',
            aiControlled: false
          },
          actions: {
            type: 'array',
            required: false,
            label: 'Actions',
            description: 'Filter by specific actions',
            aiControlled: false,
            itemSchema: {
              type: 'select',
              options: [
                { label: 'Open', value: 'open' },
                { label: 'Update', value: 'update' },
                { label: 'Merge', value: 'merge' },
                { label: 'Close', value: 'close' },
                { label: 'Reopen', value: 'reopen' }
              ]
            }
          }
        },
        outputSchema: {
          object_kind: { type: 'string', description: 'Event type (merge_request)' },
          event_type: { type: 'string', description: 'Event type' },
          user: { type: 'object', description: 'User who triggered event' },
          project: { type: 'object', description: 'Project information' },
          object_attributes: {
            type: 'object',
            description: 'Merge request details',
            properties: {
              id: { type: 'number' },
              iid: { type: 'number' },
              title: { type: 'string' },
              description: { type: 'string' },
              source_branch: { type: 'string' },
              target_branch: { type: 'string' },
              state: { type: 'string' },
              merge_status: { type: 'string' },
              url: { type: 'string' },
              action: { type: 'string' }
            }
          }
        }
      },
      {
        id: 'on_pipeline',
        name: 'On Pipeline',
        description: 'Triggered when a CI/CD pipeline runs',
        eventType: 'pipeline',
        verified: false,
        icon: 'layers',
        webhookRequired: true,
        pollingEnabled: false,
        inputSchema: {
          projectId: {
            type: 'string',
            required: true,
            label: 'Project ID',
            placeholder: '12345 or group/project',
            description: 'Numeric project ID or URL-encoded path',
            aiControlled: false
          },
          statuses: {
            type: 'array',
            required: false,
            label: 'Pipeline Statuses',
            description: 'Filter by pipeline status',
            aiControlled: false,
            itemSchema: {
              type: 'select',
              options: [
                { label: 'Pending', value: 'pending' },
                { label: 'Running', value: 'running' },
                { label: 'Success', value: 'success' },
                { label: 'Failed', value: 'failed' },
                { label: 'Canceled', value: 'canceled' }
              ]
            }
          }
        },
        outputSchema: {
          object_kind: { type: 'string', description: 'Event type (pipeline)' },
          object_attributes: {
            type: 'object',
            description: 'Pipeline details',
            properties: {
              id: { type: 'number' },
              ref: { type: 'string' },
              sha: { type: 'string' },
              status: { type: 'string' },
              stages: { type: 'array' },
              created_at: { type: 'string' },
              finished_at: { type: 'string' },
              duration: { type: 'number' }
            }
          },
          project: { type: 'object', description: 'Project information' },
          commit: { type: 'object', description: 'Commit information' }
        }
      },
      {
        id: 'on_release',
        name: 'On Release',
        description: 'Triggered when a release is created',
        eventType: 'releases',
        verified: false,
        icon: 'tag',
        webhookRequired: true,
        pollingEnabled: false,
        inputSchema: {
          projectId: {
            type: 'string',
            required: true,
            label: 'Project ID',
            placeholder: '12345 or group/project',
            description: 'Numeric project ID or URL-encoded path',
            aiControlled: false
          }
        },
        outputSchema: {
          object_kind: { type: 'string', description: 'Event type (release)' },
          tag: { type: 'string', description: 'Tag name' },
          name: { type: 'string', description: 'Release name' },
          description: { type: 'string', description: 'Release description' },
          project: { type: 'object', description: 'Project information' },
          url: { type: 'string', description: 'Release URL' },
          created_at: { type: 'string', description: 'Creation timestamp' },
          released_at: { type: 'string', description: 'Release timestamp' }
        }
      },
      {
        id: 'on_tag_push',
        name: 'On Tag Push',
        description: 'Triggered when a tag is created or deleted',
        eventType: 'tag_push',
        verified: false,
        icon: 'tag',
        webhookRequired: true,
        pollingEnabled: false,
        inputSchema: {
          projectId: {
            type: 'string',
            required: true,
            label: 'Project ID',
            placeholder: '12345 or group/project',
            description: 'Numeric project ID or URL-encoded path',
            aiControlled: false
          }
        },
        outputSchema: {
          object_kind: { type: 'string', description: 'Event type (tag_push)' },
          event_name: { type: 'string', description: 'Event name' },
          before: { type: 'string', description: 'SHA before (0000... if created)' },
          after: { type: 'string', description: 'SHA after (0000... if deleted)' },
          ref: { type: 'string', description: 'Tag ref' },
          user_name: { type: 'string', description: 'User who pushed tag' },
          project: { type: 'object', description: 'Project information' }
        }
      },
      {
        id: 'on_wiki_page',
        name: 'On Wiki Page',
        description: 'Triggered when a wiki page is created or updated',
        eventType: 'wiki_page',
        verified: false,
        icon: 'book',
        webhookRequired: true,
        pollingEnabled: false,
        inputSchema: {
          projectId: {
            type: 'string',
            required: true,
            label: 'Project ID',
            placeholder: '12345 or group/project',
            description: 'Numeric project ID or URL-encoded path',
            aiControlled: false
          }
        },
        outputSchema: {
          object_kind: { type: 'string', description: 'Event type (wiki_page)' },
          user: { type: 'object', description: 'User who modified wiki' },
          project: { type: 'object', description: 'Project information' },
          wiki: {
            type: 'object',
            description: 'Wiki information',
            properties: {
              web_url: { type: 'string' },
              git_ssh_url: { type: 'string' },
              git_http_url: { type: 'string' },
              path_with_namespace: { type: 'string' },
              default_branch: { type: 'string' }
            }
          },
          object_attributes: {
            type: 'object',
            description: 'Wiki page details',
            properties: {
              title: { type: 'string' },
              content: { type: 'string' },
              format: { type: 'string' },
              message: { type: 'string' },
              slug: { type: 'string' },
              url: { type: 'string' },
              action: { type: 'string' }
            }
          }
        }
      },
      {
        id: 'on_comment',
        name: 'On Comment',
        description: 'Triggered when a comment is created on issues, merge requests, commits, or snippets',
        eventType: 'note',
        verified: false,
        icon: 'message-square',
        webhookRequired: true,
        pollingEnabled: false,
        inputSchema: {
          projectId: {
            type: 'string',
            required: true,
            label: 'Project ID',
            placeholder: '12345 or group/project',
            description: 'Numeric project ID or URL-encoded path',
            aiControlled: false
          },
          noteableTypes: {
            type: 'array',
            required: false,
            label: 'Comment Types',
            description: 'Filter by comment target type',
            aiControlled: false,
            itemSchema: {
              type: 'select',
              options: [
                { label: 'Issue', value: 'Issue' },
                { label: 'Merge Request', value: 'MergeRequest' },
                { label: 'Commit', value: 'Commit' },
                { label: 'Snippet', value: 'Snippet' }
              ]
            }
          }
        },
        outputSchema: {
          object_kind: { type: 'string', description: 'Event type (note)' },
          event_type: { type: 'string', description: 'Event type' },
          user: { type: 'object', description: 'User who commented' },
          project: { type: 'object', description: 'Project information' },
          object_attributes: {
            type: 'object',
            description: 'Comment details',
            properties: {
              id: { type: 'number' },
              note: { type: 'string' },
              noteable_type: { type: 'string' },
              url: { type: 'string' },
              created_at: { type: 'string' }
            }
          },
          issue: { type: 'object', description: 'Issue (if comment on issue)' },
          merge_request: { type: 'object', description: 'MR (if comment on MR)' },
          commit: { type: 'object', description: 'Commit (if comment on commit)' }
        }
      }
    ]
  };
