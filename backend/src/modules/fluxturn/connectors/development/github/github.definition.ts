// Github Connector
// Auto-generated from connector.constants.ts

import { ConnectorDefinition } from '../../shared';

export const GITHUB_CONNECTOR: ConnectorDefinition = {
    name: 'github',
    display_name: 'GitHub',
    category: 'development',
    description: 'GitHub repository management, webhooks, and automation',
    auth_type: 'multiple', // Supports OAuth2 and Personal Access Token
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
            description: 'Connect with GitHub OAuth - automatic scopes for full API access'
          },
          {
            label: 'Personal Access Token',
            value: 'access_token',
            description: 'Use a PAT - ensure it has repo, user, workflow scopes'
          }
        ],
        default: 'oauth2'
      },
      // Personal Access Token field (shown when access_token is selected)
      {
        key: 'accessToken',
        label: 'Personal Access Token',
        type: 'password',
        required: true,
        placeholder: 'ghp_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx',
        description: 'GitHub Personal Access Token with required scopes',
        helpUrl: 'https://github.com/settings/tokens',
        helpText: 'Create a token with: repo, user, workflow, admin:repo_hook',
        displayOptions: {
          authType: ['access_token']
        }
      },
      // OAuth2 fields (optional - for custom OAuth apps)
      {
        key: 'clientId',
        label: 'Client ID (Optional)',
        type: 'string',
        required: false,
        placeholder: 'Your GitHub OAuth App Client ID',
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
        placeholder: 'Your GitHub OAuth App Client Secret',
        description: 'Leave empty to use one-click OAuth',
        displayOptions: {
          authType: ['oauth2']
        }
      }
    ],
    endpoints: {
      base_url: 'https://api.github.com',
      repos: '/repos/{owner}/{repo}',
      hooks: '/repos/{owner}/{repo}/hooks',
      commits: '/repos/{owner}/{repo}/commits',
      issues: '/repos/{owner}/{repo}/issues',
      pulls: '/repos/{owner}/{repo}/pulls',
      user: '/user'
    },
    oauth_config: {
      authorization_url: 'https://github.com/login/oauth/authorize',
      token_url: 'https://github.com/login/oauth/access_token',
      scopes: [
        'repo',
        'admin:repo_hook',
        'admin:org',
        'admin:org_hook',
        'gist',
        'notifications',
        'user',
        'workflow'
      ]
    },
    webhook_support: true,
    rate_limits: {
      requests_per_hour: 5000,
      requests_per_minute: 100
    },
    sandbox_available: false,
    verified: true,
    supported_actions: [
      {
        id: 'create_repository',
        name: 'Create Repository',
        description: 'Create a new GitHub repository',
        category: 'Repository',
        icon: 'plus-circle',
        verified: false,
        api: {
          endpoint: '/user/repos',
          method: 'POST',
          baseUrl: 'https://api.github.com',
          headers: {
            'Accept': 'application/vnd.github.v3+json',
            'Authorization': 'Bearer {accessToken}',
            'Content-Type': 'application/json'
          }
        },
        inputSchema: {
          name: {
            type: 'string',
            required: true,
            label: 'Repository Name',
            placeholder: 'my-new-repo',
            description: 'Repository name',
            aiControlled: true,
            aiDescription: 'Name for the new repository'
          },
          description: {
            type: 'string',
            required: false,
            label: 'Description',
            placeholder: 'A short description',
            description: 'Repository description',
            aiControlled: true,
            aiDescription: 'Description of the repository'
          },
          private: {
            type: 'boolean',
            required: false,
            label: 'Private',
            default: false,
            description: 'Whether repository is private',
            aiControlled: false
          },
          auto_init: {
            type: 'boolean',
            required: false,
            label: 'Initialize with README',
            default: false,
            description: 'Initialize with README file',
            aiControlled: false
          },
          gitignore_template: {
            type: 'string',
            required: false,
            label: 'Gitignore Template',
            placeholder: 'Node',
            description: 'Gitignore template name',
            aiControlled: false
          },
          license_template: {
            type: 'string',
            required: false,
            label: 'License Template',
            placeholder: 'mit',
            description: 'License template name',
            aiControlled: false
          }
        },
        outputSchema: {
          id: { type: 'number', description: 'Repository ID' },
          name: { type: 'string', description: 'Repository name' },
          full_name: { type: 'string', description: 'Full repository name' },
          html_url: { type: 'string', description: 'Repository URL' },
          clone_url: { type: 'string', description: 'Clone URL' }
        }
      },
      {
        id: 'get_repository',
        name: 'Get Repository',
        description: 'Get information about a repository',
        category: 'Repository',
        icon: 'book',
        verified: false,
        api: {
          endpoint: '/repos/{owner}/{repository}',
          method: 'GET',
          baseUrl: 'https://api.github.com',
          headers: {
            'Accept': 'application/vnd.github.v3+json',
            'Authorization': 'Bearer {accessToken}'
          }
        },
        inputSchema: {
          owner: {
            type: 'string',
            required: true,
            label: 'Owner',
            placeholder: 'octocat',
            description: 'Repository owner (username or organization)'
          },
          repository: {
            type: 'string',
            required: true,
            label: 'Repository',
            placeholder: 'Hello-World',
            description: 'Repository name'
          }
        },
        outputSchema: {
          id: { type: 'number', description: 'Repository ID' },
          name: { type: 'string', description: 'Repository name' },
          full_name: { type: 'string', description: 'Full repository name' },
          description: { type: 'string', description: 'Repository description' },
          language: { type: 'string', description: 'Primary language' },
          stargazers_count: { type: 'number', description: 'Star count' },
          forks_count: { type: 'number', description: 'Fork count' },
          private: { type: 'boolean', description: 'Whether repository is private' },
          html_url: { type: 'string', description: 'Repository URL' }
        }
      },
      {
        id: 'list_repositories',
        name: 'List Repositories',
        description: 'List authenticated user repositories',
        category: 'Repository',
        icon: 'list',
        verified: false,
        api: {
          endpoint: '/user/repos',
          method: 'GET',
          baseUrl: 'https://api.github.com',
          headers: {
            'Accept': 'application/vnd.github.v3+json',
            'Authorization': 'Bearer {accessToken}'
          }
        },
        inputSchema: {
          type: {
            type: 'select',
            required: false,
            label: 'Repository Type',
            default: 'all',
            options: [
              { label: 'All', value: 'all' },
              { label: 'Owner', value: 'owner' },
              { label: 'Public', value: 'public' },
              { label: 'Private', value: 'private' },
              { label: 'Member', value: 'member' }
            ],
            description: 'Type of repositories to list'
          },
          sort: {
            type: 'select',
            required: false,
            label: 'Sort By',
            default: 'updated',
            options: [
              { label: 'Created', value: 'created' },
              { label: 'Updated', value: 'updated' },
              { label: 'Pushed', value: 'pushed' },
              { label: 'Full Name', value: 'full_name' }
            ],
            description: 'Sort field'
          },
          direction: {
            type: 'select',
            required: false,
            label: 'Sort Direction',
            default: 'desc',
            options: [
              { label: 'Ascending', value: 'asc' },
              { label: 'Descending', value: 'desc' }
            ],
            description: 'Sort direction'
          },
          per_page: {
            type: 'number',
            required: false,
            label: 'Per Page',
            default: 30,
            min: 1,
            max: 100,
            description: 'Results per page (max 100)'
          }
        },
        outputSchema: {
          repositories: { type: 'array', description: 'Array of repositories' },
          total_count: { type: 'number', description: 'Total repository count' }
        }
      },
      {
        id: 'create_issue',
        name: 'Create Issue',
        description: 'Create a new issue in a repository',
        category: 'Issues',
        icon: 'alert-circle',
        verified: false,
        api: {
          endpoint: '/repos/{owner}/{repository}/issues',
          method: 'POST',
          baseUrl: 'https://api.github.com',
          headers: {
            'Accept': 'application/vnd.github.v3+json',
            'Authorization': 'Bearer {accessToken}',
            'Content-Type': 'application/json'
          },
          paramMapping: {
            title: 'title',
            body: 'body',
            assignees: 'assignees',
            labels: 'labels',
            milestone: 'milestone'
          }
        },
        inputSchema: {
          owner: {
            type: 'string',
            required: true,
            label: 'Owner',
            placeholder: 'octocat',
            description: 'Repository owner',
            aiControlled: false
          },
          repository: {
            type: 'string',
            required: true,
            label: 'Repository',
            placeholder: 'Hello-World',
            description: 'Repository name',
            aiControlled: false
          },
          title: {
            type: 'string',
            required: true,
            label: 'Title',
            placeholder: 'Found a bug',
            description: 'Issue title',
            aiControlled: true,
            aiDescription: 'Title of the issue'
          },
          body: {
            type: 'string',
            required: false,
            label: 'Body',
            inputType: 'textarea',
            placeholder: 'Detailed description...',
            description: 'Issue body (markdown supported)',
            aiControlled: true,
            aiDescription: 'Detailed description of the issue (markdown supported)'
          },
          labels: {
            type: 'array',
            required: false,
            label: 'Labels',
            description: 'Array of label names',
            aiControlled: true,
            aiDescription: 'Labels to apply to the issue'
          },
          assignees: {
            type: 'array',
            required: false,
            label: 'Assignees',
            description: 'Array of usernames to assign',
            aiControlled: false
          },
          milestone: {
            type: 'number',
            required: false,
            label: 'Milestone',
            description: 'Milestone number',
            aiControlled: false
          }
        },
        outputSchema: {
          id: { type: 'number', description: 'Issue ID' },
          number: { type: 'number', description: 'Issue number' },
          title: { type: 'string', description: 'Issue title' },
          body: { type: 'string', description: 'Issue body' },
          state: { type: 'string', description: 'Issue state' },
          html_url: { type: 'string', description: 'Issue URL' }
        }
      },
      {
        id: 'create_pull_request',
        name: 'Create Pull Request',
        description: 'Create a new pull request',
        category: 'Pull Requests',
        icon: 'git-pull-request',
        verified: false,
        api: {
          endpoint: '/repos/{owner}/{repository}/pulls',
          method: 'POST',
          baseUrl: 'https://api.github.com',
          headers: {
            'Accept': 'application/vnd.github.v3+json',
            'Authorization': 'Bearer {accessToken}',
            'Content-Type': 'application/json'
          }
        },
        inputSchema: {
          owner: {
            type: 'string',
            required: true,
            label: 'Owner',
            placeholder: 'octocat',
            description: 'Repository owner',
            aiControlled: false
          },
          repository: {
            type: 'string',
            required: true,
            label: 'Repository',
            placeholder: 'Hello-World',
            description: 'Repository name',
            aiControlled: false
          },
          title: {
            type: 'string',
            required: true,
            label: 'Title',
            placeholder: 'Amazing new feature',
            description: 'Pull request title',
            aiControlled: true,
            aiDescription: 'Title of the pull request'
          },
          head: {
            type: 'string',
            required: true,
            label: 'Head Branch',
            placeholder: 'feature-branch',
            description: 'Branch containing changes',
            aiControlled: false
          },
          base: {
            type: 'string',
            required: true,
            label: 'Base Branch',
            placeholder: 'main',
            description: 'Branch to merge into',
            aiControlled: false
          },
          body: {
            type: 'string',
            required: false,
            label: 'Body',
            inputType: 'textarea',
            placeholder: 'Description of changes...',
            description: 'Pull request description',
            aiControlled: true,
            aiDescription: 'Description of the changes in the pull request'
          },
          draft: {
            type: 'boolean',
            required: false,
            label: 'Draft',
            default: false,
            description: 'Create as draft PR',
            aiControlled: false
          }
        },
        outputSchema: {
          id: { type: 'number', description: 'Pull request ID' },
          number: { type: 'number', description: 'Pull request number' },
          title: { type: 'string', description: 'Pull request title' },
          html_url: { type: 'string', description: 'Pull request URL' },
          state: { type: 'string', description: 'Pull request state' }
        }
      },
      {
        id: 'get_file_content',
        name: 'Get File Content',
        description: 'Get content of a file from repository',
        category: 'Files',
        icon: 'file-text',
        verified: false,
        api: {
          endpoint: '/repos/{owner}/{repository}/contents/{path}',
          method: 'GET',
          baseUrl: 'https://api.github.com',
          headers: {
            'Accept': 'application/vnd.github.v3+json',
            'Authorization': 'Bearer {accessToken}'
          }
        },
        inputSchema: {
          owner: {
            type: 'string',
            required: true,
            label: 'Owner',
            placeholder: 'octocat',
            description: 'Repository owner'
          },
          repository: {
            type: 'string',
            required: true,
            label: 'Repository',
            placeholder: 'Hello-World',
            description: 'Repository name'
          },
          path: {
            type: 'string',
            required: true,
            label: 'File Path',
            placeholder: 'README.md',
            description: 'Path to the file'
          },
          ref: {
            type: 'string',
            required: false,
            label: 'Ref',
            placeholder: 'main',
            description: 'Branch, tag, or commit SHA'
          }
        },
        outputSchema: {
          content: { type: 'string', description: 'File content (base64 encoded)' },
          encoding: { type: 'string', description: 'Content encoding' },
          sha: { type: 'string', description: 'File SHA' },
          size: { type: 'number', description: 'File size in bytes' }
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
          endpoint: '/repos/{owner}/{repository}/contents/{path}',
          method: 'PUT',
          baseUrl: 'https://api.github.com',
          headers: {
            'Accept': 'application/vnd.github.v3+json',
            'Authorization': 'Bearer {accessToken}',
            'Content-Type': 'application/json'
          }
        },
        inputSchema: {
          owner: {
            type: 'string',
            required: true,
            label: 'Owner',
            placeholder: 'octocat',
            description: 'Repository owner'
          },
          repository: {
            type: 'string',
            required: true,
            label: 'Repository',
            placeholder: 'Hello-World',
            description: 'Repository name'
          },
          path: {
            type: 'string',
            required: true,
            label: 'File Path',
            placeholder: 'path/to/file.txt',
            description: 'Path where file will be created'
          },
          message: {
            type: 'string',
            required: true,
            label: 'Commit Message',
            placeholder: 'Add new file',
            description: 'Commit message'
          },
          content: {
            type: 'string',
            required: true,
            label: 'Content',
            inputType: 'textarea',
            placeholder: 'File content...',
            description: 'File content (will be base64 encoded)'
          },
          branch: {
            type: 'string',
            required: false,
            label: 'Branch',
            placeholder: 'main',
            description: 'Branch name (default: default branch)'
          }
        },
        outputSchema: {
          content: { type: 'object', description: 'Created file information' },
          commit: { type: 'object', description: 'Commit information' }
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
          endpoint: '/repos/{owner}/{repository}/contents/{path}',
          method: 'PUT',
          baseUrl: 'https://api.github.com',
          headers: {
            'Accept': 'application/vnd.github.v3+json',
            'Authorization': 'Bearer {accessToken}',
            'Content-Type': 'application/json'
          }
        },
        inputSchema: {
          owner: {
            type: 'string',
            required: true,
            label: 'Owner',
            placeholder: 'octocat',
            description: 'Repository owner'
          },
          repository: {
            type: 'string',
            required: true,
            label: 'Repository',
            placeholder: 'Hello-World',
            description: 'Repository name'
          },
          path: {
            type: 'string',
            required: true,
            label: 'File Path',
            placeholder: 'path/to/file.txt',
            description: 'Path to file to update'
          },
          message: {
            type: 'string',
            required: true,
            label: 'Commit Message',
            placeholder: 'Update file',
            description: 'Commit message'
          },
          content: {
            type: 'string',
            required: true,
            label: 'Content',
            inputType: 'textarea',
            placeholder: 'New file content...',
            description: 'New file content (will be base64 encoded)'
          },
          sha: {
            type: 'string',
            required: true,
            label: 'File SHA',
            placeholder: 'abc123...',
            description: 'SHA of the file being replaced (get from get_file_content)'
          },
          branch: {
            type: 'string',
            required: false,
            label: 'Branch',
            placeholder: 'main',
            description: 'Branch name (default: default branch)'
          }
        },
        outputSchema: {
          content: { type: 'object', description: 'Updated file information' },
          commit: { type: 'object', description: 'Commit information' }
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
          endpoint: '/repos/{owner}/{repository}/contents/{path}',
          method: 'DELETE',
          baseUrl: 'https://api.github.com',
          headers: {
            'Accept': 'application/vnd.github.v3+json',
            'Authorization': 'Bearer {accessToken}',
            'Content-Type': 'application/json'
          }
        },
        inputSchema: {
          owner: {
            type: 'string',
            required: true,
            label: 'Owner',
            placeholder: 'octocat',
            description: 'Repository owner'
          },
          repository: {
            type: 'string',
            required: true,
            label: 'Repository',
            placeholder: 'Hello-World',
            description: 'Repository name'
          },
          path: {
            type: 'string',
            required: true,
            label: 'File Path',
            placeholder: 'path/to/file.txt',
            description: 'Path to file to delete'
          },
          message: {
            type: 'string',
            required: true,
            label: 'Commit Message',
            placeholder: 'Delete file',
            description: 'Commit message'
          },
          sha: {
            type: 'string',
            required: true,
            label: 'File SHA',
            placeholder: 'abc123...',
            description: 'SHA of the file to delete (get from get_file_content)'
          },
          branch: {
            type: 'string',
            required: false,
            label: 'Branch',
            placeholder: 'main',
            description: 'Branch name (default: default branch)'
          }
        },
        outputSchema: {
          commit: { type: 'object', description: 'Commit information' },
          content: { type: 'object', description: 'Deleted file information (null)' }
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
          owner: {
            type: 'string',
            required: true,
            label: 'Repository Owner',
            placeholder: 'octocat',
            description: 'GitHub username or organization name (e.g., fluxturn, facebook, microsoft)',
            inputType: 'text'
          },
          repository: {
            type: 'string',
            required: true,
            label: 'Repository Name',
            placeholder: 'Hello-World',
            description: 'Repository name (e.g., backend, react, linux)',
            inputType: 'text'
          },
          branch: {
            type: 'string',
            required: false,
            label: 'Branch Filter',
            placeholder: 'main',
            description: 'Only trigger for specific branch (optional)',
            inputType: 'text'
          }
        },
        outputSchema: {
          ref: { type: 'string', description: 'Git ref that was pushed (e.g., refs/heads/main)' },
          before: { type: 'string', description: 'SHA of the commit before push' },
          after: { type: 'string', description: 'SHA of the commit after push' },
          commits: {
            type: 'array',
            description: 'Array of commit objects',
            properties: {
              id: { type: 'string' },
              message: { type: 'string' },
              timestamp: { type: 'string' },
              author: { type: 'object' },
              url: { type: 'string' }
            }
          },
          pusher: {
            type: 'object',
            description: 'User who pushed',
            properties: {
              name: { type: 'string' },
              email: { type: 'string' }
            }
          },
          repository: {
            type: 'object',
            description: 'Repository information',
            properties: {
              id: { type: 'number' },
              name: { type: 'string' },
              full_name: { type: 'string' },
              url: { type: 'string' }
            }
          }
        }
      },
      {
        id: 'on_create',
        name: 'On Create',
        description: 'Triggered when a branch or tag is created',
        eventType: 'create',
        verified: false,
        icon: 'plus-circle',
        webhookRequired: true,
        pollingEnabled: false,
        inputSchema: {
          owner: {
            type: 'string',
            required: true,
            label: 'Repository Owner',
            placeholder: 'octocat',
            description: 'GitHub username or organization name (e.g., fluxturn, facebook, microsoft)',
            inputType: 'text'
          },
          repository: {
            type: 'string',
            required: true,
            label: 'Repository Name',
            placeholder: 'Hello-World',
            description: 'Repository name (e.g., backend, react, linux)',
            inputType: 'text'
          },
          refType: {
            type: 'select',
            required: false,
            label: 'Reference Type',
            description: 'Filter by reference type',
            default: 'all',
            options: [
              { label: 'All', value: 'all' },
              { label: 'Branch', value: 'branch' },
              { label: 'Tag', value: 'tag' }
            ]
          }
        },
        outputSchema: {
          ref: { type: 'string', description: 'The git ref (branch or tag name)' },
          ref_type: { type: 'string', description: 'Type of ref created (branch or tag)' },
          master_branch: { type: 'string', description: 'The default branch of the repository' },
          description: { type: 'string', description: 'Repository description' },
          pusher_type: { type: 'string', description: 'Type of user who created the ref' },
          repository: {
            type: 'object',
            description: 'Repository information',
            properties: {
              id: { type: 'number' },
              name: { type: 'string' },
              full_name: { type: 'string' },
              url: { type: 'string' }
            }
          },
          sender: {
            type: 'object',
            description: 'User who created the ref',
            properties: {
              login: { type: 'string' },
              id: { type: 'number' },
              avatar_url: { type: 'string' }
            }
          }
        }
      },
      {
        id: 'on_delete',
        name: 'On Delete',
        description: 'Triggered when a branch or tag is deleted',
        eventType: 'delete',
        verified: false,
        icon: 'trash-2',
        webhookRequired: true,
        pollingEnabled: false,
        inputSchema: {
          owner: {
            type: 'string',
            required: true,
            label: 'Repository Owner',
            placeholder: 'octocat',
            description: 'GitHub username or organization name (e.g., fluxturn, facebook, microsoft)',
            inputType: 'text'
          },
          repository: {
            type: 'string',
            required: true,
            label: 'Repository Name',
            placeholder: 'Hello-World',
            description: 'Repository name (e.g., backend, react, linux)',
            inputType: 'text'
          },
          refType: {
            type: 'select',
            required: false,
            label: 'Reference Type',
            description: 'Filter by reference type',
            default: 'all',
            options: [
              { label: 'All', value: 'all' },
              { label: 'Branch', value: 'branch' },
              { label: 'Tag', value: 'tag' }
            ]
          }
        },
        outputSchema: {
          ref: { type: 'string', description: 'The git ref (branch or tag name)' },
          ref_type: { type: 'string', description: 'Type of ref deleted (branch or tag)' },
          pusher_type: { type: 'string', description: 'Type of user who deleted the ref' },
          repository: {
            type: 'object',
            description: 'Repository information',
            properties: {
              id: { type: 'number' },
              name: { type: 'string' },
              full_name: { type: 'string' },
              url: { type: 'string' }
            }
          },
          sender: {
            type: 'object',
            description: 'User who deleted the ref',
            properties: {
              login: { type: 'string' },
              id: { type: 'number' },
              avatar_url: { type: 'string' }
            }
          }
        }
      },
      {
        id: 'on_commit_comment',
        name: 'On Commit Comment',
        description: 'Triggered when a comment is created on a commit',
        eventType: 'commit_comment',
        verified: false,
        icon: 'message-square',
        webhookRequired: true,
        pollingEnabled: false,
        inputSchema: {
          owner: {
            type: 'string',
            required: true,
            label: 'Repository Owner',
            placeholder: 'octocat',
            description: 'GitHub username or organization name (e.g., fluxturn, facebook, microsoft)',
            inputType: 'text'
          },
          repository: {
            type: 'string',
            required: true,
            label: 'Repository Name',
            placeholder: 'Hello-World',
            description: 'Repository name (e.g., backend, react, linux)',
            inputType: 'text'
          }
        },
        outputSchema: {
          action: { type: 'string', description: 'Action performed (created)' },
          comment: {
            type: 'object',
            description: 'Comment details',
            properties: {
              id: { type: 'number' },
              body: { type: 'string', description: 'Comment text' },
              commit_id: { type: 'string', description: 'SHA of the commit' },
              path: { type: 'string', description: 'File path (if inline comment)' },
              position: { type: 'number', description: 'Line position (if inline comment)' },
              line: { type: 'number', description: 'Line number (if inline comment)' },
              html_url: { type: 'string', description: 'Comment URL' },
              user: {
                type: 'object',
                properties: {
                  login: { type: 'string' },
                  id: { type: 'number' },
                  avatar_url: { type: 'string' }
                }
              },
              created_at: { type: 'string', description: 'Creation timestamp' },
              updated_at: { type: 'string', description: 'Update timestamp' }
            }
          },
          repository: {
            type: 'object',
            description: 'Repository information',
            properties: {
              id: { type: 'number' },
              name: { type: 'string' },
              full_name: { type: 'string' },
              url: { type: 'string' }
            }
          }
        }
      },
      {
        id: 'on_repository',
        name: 'On Repository',
        description: 'Triggered when a repository is created, deleted, archived, unarchived, renamed, edited, transferred, made public, or made private',
        eventType: 'repository',
        verified: false,
        icon: 'database',
        webhookRequired: true,
        pollingEnabled: false,
        inputSchema: {
          owner: {
            type: 'string',
            required: true,
            label: 'Owner',
            placeholder: 'octocat',
            description: 'GitHub username or organization name (for org-level webhooks - e.g., fluxturn, facebook)',
            inputType: 'text'
          },
          actions: {
            type: 'array',
            required: false,
            label: 'Actions',
            description: 'Filter by specific repository actions (leave empty for all)',
            itemSchema: {
              type: 'select',
              options: [
                { label: 'Created', value: 'created' },
                { label: 'Deleted', value: 'deleted' },
                { label: 'Archived', value: 'archived' },
                { label: 'Unarchived', value: 'unarchived' },
                { label: 'Edited', value: 'edited' },
                { label: 'Renamed', value: 'renamed' },
                { label: 'Transferred', value: 'transferred' },
                { label: 'Publicized', value: 'publicized' },
                { label: 'Privatized', value: 'privatized' }
              ]
            }
          }
        },
        outputSchema: {
          action: {
            type: 'string',
            description: 'Action performed (created, deleted, archived, unarchived, edited, renamed, transferred, publicized, privatized)'
          },
          repository: {
            type: 'object',
            description: 'Repository information',
            properties: {
              id: { type: 'number' },
              name: { type: 'string' },
              full_name: { type: 'string' },
              description: { type: 'string' },
              private: { type: 'boolean' },
              archived: { type: 'boolean' },
              disabled: { type: 'boolean' },
              html_url: { type: 'string' },
              created_at: { type: 'string' },
              updated_at: { type: 'string' },
              pushed_at: { type: 'string' },
              default_branch: { type: 'string' },
              owner: {
                type: 'object',
                properties: {
                  login: { type: 'string' },
                  id: { type: 'number' },
                  type: { type: 'string' }
                }
              }
            }
          },
          sender: {
            type: 'object',
            description: 'User who performed the action',
            properties: {
              login: { type: 'string' },
              id: { type: 'number' },
              avatar_url: { type: 'string' }
            }
          },
          changes: {
            type: 'object',
            description: 'Changes made (for edited/renamed events)',
            properties: {
              repository: { type: 'object' }
            }
          }
        }
      }
    ]
  };
