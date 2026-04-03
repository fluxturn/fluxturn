// Git Connector Definition
// Ported from n8n to fluxturn

import { ConnectorDefinition } from '../../shared';

export const GIT_CONNECTOR: ConnectorDefinition = {
  name: 'git',
  display_name: 'Git',
  category: 'development',
  description: 'Control git repositories. Perform git operations like clone, commit, push, pull, and more.',
  auth_type: 'none',
  verified: true,

  auth_fields: [],

  endpoints: {},

  webhook_support: false,
  rate_limits: { requests_per_minute: 60 },

  supported_actions: [
    {
      id: 'add',
      name: 'Add',
      description: 'Add files to staging',
      category: 'File',
      icon: 'plus',
      verified: false,
      inputSchema: {
        repositoryPath: {
          type: 'string',
          required: true,
          label: 'Repository Path',
          description: 'Local path of the git repository',
          placeholder: '/tmp/repository',
          aiControlled: false
        },
        pathsToAdd: {
          type: 'string',
          required: true,
          label: 'Paths to Add',
          description: 'Comma-separated list of paths to add',
          placeholder: 'file1.txt,file2.txt',
          aiControlled: false
        }
      },
      outputSchema: {}
    },
    {
      id: 'clone',
      name: 'Clone',
      description: 'Clone a repository',
      category: 'Repository',
      icon: 'download',
      verified: false,
      inputSchema: {
        repositoryPath: {
          type: 'string',
          required: true,
          label: 'Target Path',
          description: 'Local path to clone repository into',
          placeholder: '/tmp/repository',
          aiControlled: false
        },
        sourceRepository: {
          type: 'string',
          required: true,
          label: 'Source Repository',
          description: 'URL of the repository to clone',
          placeholder: 'https://github.com/user/repo.git',
          aiControlled: false
        }
      },
      outputSchema: {}
    },
    {
      id: 'commit',
      name: 'Commit',
      description: 'Commit changes',
      category: 'File',
      icon: 'check',
      verified: false,
      inputSchema: {
        repositoryPath: {
          type: 'string',
          required: true,
          label: 'Repository Path',
          description: 'Local path of the git repository',
          placeholder: '/tmp/repository',
          aiControlled: false
        },
        message: {
          type: 'string',
          required: true,
          label: 'Commit Message',
          description: 'Message for the commit',
          placeholder: 'Initial commit',
          aiControlled: true,
          aiDescription: 'Generate a clear, concise commit message that describes the changes being committed. Follow conventional commit format if appropriate (e.g., feat:, fix:, docs:).'
        },
        branch: {
          type: 'string',
          label: 'Branch',
          description: 'Branch to commit to',
          placeholder: 'main',
          aiControlled: false
        }
      },
      outputSchema: {}
    },
    {
      id: 'push',
      name: 'Push',
      description: 'Push commits to remote',
      category: 'Repository',
      icon: 'upload',
      verified: false,
      inputSchema: {
        repositoryPath: {
          type: 'string',
          required: true,
          label: 'Repository Path',
          description: 'Local path of the git repository',
          placeholder: '/tmp/repository',
          aiControlled: false
        },
        branch: {
          type: 'string',
          label: 'Branch',
          description: 'Branch to push',
          placeholder: 'main',
          aiControlled: false
        }
      },
      outputSchema: {}
    },
    {
      id: 'pull',
      name: 'Pull',
      description: 'Pull from remote repository',
      category: 'Repository',
      icon: 'download',
      verified: false,
      inputSchema: {
        repositoryPath: {
          type: 'string',
          required: true,
          label: 'Repository Path',
          description: 'Local path of the git repository',
          placeholder: '/tmp/repository',
          aiControlled: false
        }
      },
      outputSchema: {}
    },
    {
      id: 'fetch',
      name: 'Fetch',
      description: 'Fetch from remote repository',
      category: 'Repository',
      icon: 'download',
      verified: false,
      inputSchema: {
        repositoryPath: {
          type: 'string',
          required: true,
          label: 'Repository Path',
          description: 'Local path of the git repository',
          placeholder: '/tmp/repository',
          aiControlled: false
        }
      },
      outputSchema: {}
    },
    {
      id: 'log',
      name: 'Log',
      description: 'Get commit history',
      category: 'Repository',
      icon: 'list',
      verified: false,
      inputSchema: {
        repositoryPath: {
          type: 'string',
          required: true,
          label: 'Repository Path',
          description: 'Local path of the git repository',
          placeholder: '/tmp/repository',
          aiControlled: false
        },
        returnAll: {
          type: 'boolean',
          label: 'Return All',
          description: 'Return all commits',
          default: false,
          aiControlled: false
        },
        limit: {
          type: 'number',
          label: 'Limit',
          description: 'Number of commits to return',
          default: 100,
          displayOptions: {
            show: {
              returnAll: [false]
            }
          },
          aiControlled: false
        }
      },
      outputSchema: {}
    },
    {
      id: 'status',
      name: 'Status',
      description: 'Get repository status',
      category: 'Repository',
      icon: 'info',
      verified: false,
      inputSchema: {
        repositoryPath: {
          type: 'string',
          required: true,
          label: 'Repository Path',
          description: 'Local path of the git repository',
          placeholder: '/tmp/repository',
          aiControlled: false
        }
      },
      outputSchema: {}
    },
    {
      id: 'tag',
      name: 'Tag',
      description: 'Create a new tag',
      category: 'Repository',
      icon: 'tag',
      verified: false,
      inputSchema: {
        repositoryPath: {
          type: 'string',
          required: true,
          label: 'Repository Path',
          description: 'Local path of the git repository',
          placeholder: '/tmp/repository',
          aiControlled: false
        },
        name: {
          type: 'string',
          required: true,
          label: 'Tag Name',
          description: 'Name of the tag',
          placeholder: 'v1.0.0',
          aiControlled: false
        }
      },
      outputSchema: {}
    }
  ],

  supported_triggers: []
};
