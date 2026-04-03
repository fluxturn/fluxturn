// Jira Connector
// Comprehensive connector definition with all Jira API capabilities based on n8n

import { ConnectorDefinition } from '../../shared';

export const JIRA_CONNECTOR: ConnectorDefinition = {
  name: 'jira',
  display_name: 'Jira',
  category: 'project_management',
  description: 'Atlassian Jira is a powerful project management and issue tracking platform for agile teams with comprehensive workflow automation.',
  auth_type: 'basic_auth',
  auth_fields: [
    {
      key: 'email',
      label: 'Email',
      type: 'string',
      required: true,
      placeholder: 'your-email@company.com',
      description: 'Your Atlassian account email',
      helpUrl: 'https://id.atlassian.com/manage-profile/security/api-tokens',
      helpText: 'Use your Atlassian account email'
    },
    {
      key: 'apiToken',
      label: 'API Token',
      type: 'password',
      required: true,
      placeholder: 'Enter your API token',
      description: 'Your Jira API token for authentication',
      helpUrl: 'https://id.atlassian.com/manage-profile/security/api-tokens',
      helpText: 'Create an API token from your Atlassian account'
    },
    {
      key: 'domain',
      label: 'Jira Domain',
      type: 'string',
      required: true,
      placeholder: 'your-company.atlassian.net',
      description: 'Your Jira Cloud domain (without https://)',
      helpUrl: 'https://support.atlassian.com/jira-cloud-administration/docs/find-your-site-url/',
      helpText: 'Example: mycompany.atlassian.net'
    }
  ],
  endpoints: {
    base_url: 'https://{domain}/rest/api/3',
    base_url_v2: 'https://{domain}/rest/api/2',
    issues: '/issue',
    search: '/search',
    projects: '/project',
    users: '/user',
    comments: '/issue/{issueKey}/comment',
    attachments: '/issue/{issueKey}/attachments',
    transitions: '/issue/{issueKey}/transitions',
    webhooks: '/webhook'
  },
  webhook_support: true,
  rate_limits: {
    requests_per_second: 10,
    requests_per_minute: 300,
    requests_per_hour: 10000
  },
  sandbox_available: false,
  verified: false,

  // ============================================
  // SUPPORTED ACTIONS - Complete Jira API Coverage
  // ============================================
  supported_actions: [
    // ==========================================
    // ISSUE ACTIONS
    // ==========================================
    {
      id: 'create_issue',
      name: 'Create Issue',
      description: 'Create a new issue or subtask in Jira',
      category: 'Issues',
      icon: 'plus-square',
      api: {
        endpoint: '/issue',
        method: 'POST',
        baseUrl: 'https://{domain}/rest/api/3',
        headers: { 'Content-Type': 'application/json' },
        paramMapping: {
          projectId: 'fields.project.id',
          issueTypeId: 'fields.issuetype.id',
          summary: 'fields.summary',
          description: 'fields.description',
          priority: 'fields.priority.id',
          assignee: 'fields.assignee.accountId',
          reporter: 'fields.reporter.accountId',
          labels: 'fields.labels',
          dueDate: 'fields.duedate'
        }
      },
      inputSchema: {
        projectId: {
          type: 'string',
          required: true,
          label: 'Project ID',
          placeholder: 'Enter project ID or key',
          description: 'The ID or key of the project',
          aiControlled: false
        },
        issueTypeId: {
          type: 'string',
          required: true,
          label: 'Issue Type ID',
          placeholder: 'Enter issue type ID',
          description: 'The ID of the issue type (e.g., Bug, Task, Story)',
          aiControlled: false
        },
        summary: {
          type: 'string',
          required: true,
          label: 'Summary',
          placeholder: 'Enter issue summary',
          description: 'Brief summary of the issue',
          maxLength: 255,
          aiControlled: true,
          aiDescription: 'Brief summary/title of the issue'
        },
        description: {
          type: 'string',
          required: false,
          label: 'Description',
          inputType: 'textarea',
          placeholder: 'Enter detailed description',
          description: 'Detailed description of the issue (supports Atlassian Document Format)',
          aiControlled: true,
          aiDescription: 'Detailed description of the issue'
        },
        priority: {
          type: 'select',
          required: false,
          label: 'Priority',
          options: [
            { label: 'Highest', value: '1' },
            { label: 'High', value: '2' },
            { label: 'Medium', value: '3' },
            { label: 'Low', value: '4' },
            { label: 'Lowest', value: '5' }
          ],
          description: 'Priority of the issue',
          aiControlled: false
        },
        assignee: {
          type: 'string',
          required: false,
          label: 'Assignee Account ID',
          placeholder: 'Enter account ID',
          description: 'Account ID of the assignee',
          aiControlled: false
        },
        reporter: {
          type: 'string',
          required: false,
          label: 'Reporter Account ID',
          placeholder: 'Enter account ID',
          description: 'Account ID of the reporter',
          aiControlled: false
        },
        labels: {
          type: 'string',
          required: false,
          label: 'Labels',
          placeholder: 'bug,urgent,frontend',
          description: 'Comma-separated list of labels',
          aiControlled: true,
          aiDescription: 'Labels to apply to the issue (comma-separated)'
        },
        dueDate: {
          type: 'string',
          required: false,
          label: 'Due Date',
          placeholder: '2024-12-31',
          description: 'Due date in YYYY-MM-DD format',
          aiControlled: false
        },
        parentKey: {
          type: 'string',
          required: false,
          label: 'Parent Issue Key',
          placeholder: 'PROJ-123',
          description: 'Parent issue key for creating subtasks',
          aiControlled: false
        }
      },
      outputSchema: {
        id: { type: 'string', description: 'Issue ID' },
        key: { type: 'string', description: 'Issue key (e.g., PROJ-123)' },
        self: { type: 'string', description: 'URL of the created issue' }
      }
    },
    {
      id: 'update_issue',
      name: 'Update Issue',
      description: 'Update an existing issue in Jira',
      category: 'Issues',
      icon: 'edit',
      api: {
        endpoint: '/issue/{issueKey}',
        method: 'PUT',
        baseUrl: 'https://{domain}/rest/api/3',
        headers: { 'Content-Type': 'application/json' }
      },
      inputSchema: {
        issueKey: {
          type: 'string',
          required: true,
          label: 'Issue Key',
          placeholder: 'PROJ-123',
          description: 'The key of the issue to update',
          aiControlled: false
        },
        summary: {
          type: 'string',
          required: false,
          label: 'Summary',
          placeholder: 'Updated summary',
          description: 'New summary for the issue',
          aiControlled: true,
          aiDescription: 'Updated summary/title for the issue'
        },
        description: {
          type: 'string',
          required: false,
          label: 'Description',
          inputType: 'textarea',
          placeholder: 'Updated description',
          description: 'New description for the issue',
          aiControlled: true,
          aiDescription: 'Updated description for the issue'
        },
        priority: {
          type: 'string',
          required: false,
          label: 'Priority ID',
          placeholder: '1-5',
          description: 'New priority ID',
          aiControlled: false
        },
        assignee: {
          type: 'string',
          required: false,
          label: 'Assignee Account ID',
          placeholder: 'Enter account ID',
          description: 'New assignee account ID',
          aiControlled: false
        },
        labels: {
          type: 'string',
          required: false,
          label: 'Labels',
          placeholder: 'label1,label2',
          description: 'Comma-separated list of labels (replaces existing)',
          aiControlled: true,
          aiDescription: 'Labels to apply to the issue (comma-separated)'
        },
        dueDate: {
          type: 'string',
          required: false,
          label: 'Due Date',
          placeholder: '2024-12-31',
          description: 'New due date in YYYY-MM-DD format',
          aiControlled: false
        }
      },
      outputSchema: {
        success: { type: 'boolean', description: 'Whether update was successful' }
      }
    },
    {
      id: 'get_issue',
      name: 'Get Issue',
      description: 'Retrieve details of a specific issue',
      category: 'Issues',
      icon: 'file-text',
      api: {
        endpoint: '/issue/{issueKey}',
        method: 'GET',
        baseUrl: 'https://{domain}/rest/api/3',
        headers: { 'Content-Type': 'application/json' }
      },
      inputSchema: {
        issueKey: {
          type: 'string',
          required: true,
          label: 'Issue Key',
          placeholder: 'PROJ-123',
          description: 'The key of the issue to retrieve'
        },
        fields: {
          type: 'string',
          required: false,
          label: 'Fields',
          placeholder: 'summary,status,assignee',
          default: '*all',
          description: 'Comma-separated list of fields to return'
        },
        expand: {
          type: 'string',
          required: false,
          label: 'Expand',
          placeholder: 'renderedFields,changelog',
          description: 'Additional information to include (renderedFields, changelog, etc.)'
        }
      },
      outputSchema: {
        id: { type: 'string', description: 'Issue ID' },
        key: { type: 'string', description: 'Issue key' },
        self: { type: 'string', description: 'Issue URL' },
        fields: { type: 'object', description: 'Issue fields' }
      }
    },
    {
      id: 'search_issues',
      name: 'Search Issues',
      description: 'Search for issues using JQL (Jira Query Language)',
      category: 'Issues',
      icon: 'search',
      api: {
        endpoint: '/search',
        method: 'POST',
        baseUrl: 'https://{domain}/rest/api/3',
        headers: { 'Content-Type': 'application/json' }
      },
      inputSchema: {
        jql: {
          type: 'string',
          required: true,
          label: 'JQL Query',
          inputType: 'textarea',
          placeholder: 'project = PROJ AND status = "In Progress"',
          description: 'JQL query to search for issues'
        },
        maxResults: {
          type: 'number',
          required: false,
          label: 'Max Results',
          default: 50,
          min: 1,
          max: 100,
          description: 'Maximum number of results to return'
        },
        startAt: {
          type: 'number',
          required: false,
          label: 'Start At',
          default: 0,
          min: 0,
          description: 'Index of the first result to return (for pagination)'
        },
        fields: {
          type: 'string',
          required: false,
          label: 'Fields',
          placeholder: 'summary,status,assignee',
          default: '*all',
          description: 'Comma-separated list of fields to return'
        }
      },
      outputSchema: {
        issues: { type: 'array', description: 'Array of matching issues' },
        total: { type: 'number', description: 'Total number of results' },
        maxResults: { type: 'number', description: 'Maximum results per page' },
        startAt: { type: 'number', description: 'Starting index' }
      }
    },
    {
      id: 'delete_issue',
      name: 'Delete Issue',
      description: 'Permanently delete an issue',
      category: 'Issues',
      icon: 'trash-2',
      api: {
        endpoint: '/issue/{issueKey}',
        method: 'DELETE',
        baseUrl: 'https://{domain}/rest/api/3',
        headers: { 'Content-Type': 'application/json' }
      },
      inputSchema: {
        issueKey: {
          type: 'string',
          required: true,
          label: 'Issue Key',
          placeholder: 'PROJ-123',
          description: 'The key of the issue to delete'
        },
        deleteSubtasks: {
          type: 'boolean',
          required: false,
          label: 'Delete Subtasks',
          default: false,
          description: 'Whether to delete subtasks as well'
        }
      },
      outputSchema: {
        success: { type: 'boolean', description: 'Whether deletion was successful' }
      }
    },
    {
      id: 'transition_issue',
      name: 'Transition Issue',
      description: 'Transition an issue to a different status',
      category: 'Issues',
      icon: 'arrow-right',
      api: {
        endpoint: '/issue/{issueKey}/transitions',
        method: 'POST',
        baseUrl: 'https://{domain}/rest/api/3',
        headers: { 'Content-Type': 'application/json' }
      },
      inputSchema: {
        issueKey: {
          type: 'string',
          required: true,
          label: 'Issue Key',
          placeholder: 'PROJ-123',
          description: 'The key of the issue to transition'
        },
        transitionId: {
          type: 'string',
          required: true,
          label: 'Transition ID',
          placeholder: 'Enter transition ID',
          description: 'The ID of the transition to perform'
        },
        comment: {
          type: 'string',
          required: false,
          label: 'Comment',
          inputType: 'textarea',
          placeholder: 'Add a comment about this transition',
          description: 'Optional comment to add when transitioning'
        }
      },
      outputSchema: {
        success: { type: 'boolean', description: 'Whether transition was successful' }
      }
    },
    {
      id: 'get_transitions',
      name: 'Get Transitions',
      description: 'Get available transitions for an issue',
      category: 'Issues',
      icon: 'list',
      api: {
        endpoint: '/issue/{issueKey}/transitions',
        method: 'GET',
        baseUrl: 'https://{domain}/rest/api/3',
        headers: { 'Content-Type': 'application/json' }
      },
      inputSchema: {
        issueKey: {
          type: 'string',
          required: true,
          label: 'Issue Key',
          placeholder: 'PROJ-123',
          description: 'The key of the issue'
        }
      },
      outputSchema: {
        transitions: {
          type: 'array',
          description: 'Available transitions',
          properties: {
            id: { type: 'string' },
            name: { type: 'string' },
            to: { type: 'object' }
          }
        }
      }
    },
    {
      id: 'get_changelog',
      name: 'Get Issue Changelog',
      description: 'Get the changelog history of an issue',
      category: 'Issues',
      icon: 'clock',
      api: {
        endpoint: '/issue/{issueKey}/changelog',
        method: 'GET',
        baseUrl: 'https://{domain}/rest/api/3',
        headers: { 'Content-Type': 'application/json' }
      },
      inputSchema: {
        issueKey: {
          type: 'string',
          required: true,
          label: 'Issue Key',
          placeholder: 'PROJ-123',
          description: 'The key of the issue'
        },
        maxResults: {
          type: 'number',
          required: false,
          label: 'Max Results',
          default: 100,
          min: 1,
          max: 100,
          description: 'Maximum number of changelog entries'
        }
      },
      outputSchema: {
        values: { type: 'array', description: 'Changelog entries' },
        total: { type: 'number', description: 'Total changelog entries' }
      }
    },

    // ==========================================
    // COMMENT ACTIONS
    // ==========================================
    {
      id: 'add_comment',
      name: 'Add Comment',
      description: 'Add a comment to an issue',
      category: 'Comments',
      icon: 'message-square',
      api: {
        endpoint: '/issue/{issueKey}/comment',
        method: 'POST',
        baseUrl: 'https://{domain}/rest/api/3',
        headers: { 'Content-Type': 'application/json' }
      },
      inputSchema: {
        issueKey: {
          type: 'string',
          required: true,
          label: 'Issue Key',
          placeholder: 'PROJ-123',
          description: 'The key of the issue',
          aiControlled: false
        },
        body: {
          type: 'string',
          required: true,
          label: 'Comment Body',
          inputType: 'textarea',
          placeholder: 'Enter your comment',
          description: 'The body of the comment',
          aiControlled: true,
          aiDescription: 'The comment text to add to the issue'
        }
      },
      outputSchema: {
        id: { type: 'string', description: 'Comment ID' },
        self: { type: 'string', description: 'Comment URL' },
        author: { type: 'object', description: 'Comment author' },
        created: { type: 'string', description: 'Creation timestamp' }
      }
    },
    {
      id: 'update_comment',
      name: 'Update Comment',
      description: 'Update an existing comment on an issue',
      category: 'Comments',
      icon: 'edit',
      api: {
        endpoint: '/issue/{issueKey}/comment/{commentId}',
        method: 'PUT',
        baseUrl: 'https://{domain}/rest/api/3',
        headers: { 'Content-Type': 'application/json' }
      },
      inputSchema: {
        issueKey: {
          type: 'string',
          required: true,
          label: 'Issue Key',
          placeholder: 'PROJ-123',
          description: 'The key of the issue',
          aiControlled: false
        },
        commentId: {
          type: 'string',
          required: true,
          label: 'Comment ID',
          placeholder: 'Enter comment ID',
          description: 'The ID of the comment to update',
          aiControlled: false
        },
        body: {
          type: 'string',
          required: true,
          label: 'Comment Body',
          inputType: 'textarea',
          placeholder: 'Updated comment text',
          description: 'The new body of the comment',
          aiControlled: true,
          aiDescription: 'The updated comment text'
        }
      },
      outputSchema: {
        id: { type: 'string', description: 'Comment ID' },
        updated: { type: 'string', description: 'Update timestamp' }
      }
    },
    {
      id: 'get_comments',
      name: 'Get Comments',
      description: 'Get all comments from an issue',
      category: 'Comments',
      icon: 'message-circle',
      api: {
        endpoint: '/issue/{issueKey}/comment',
        method: 'GET',
        baseUrl: 'https://{domain}/rest/api/3',
        headers: { 'Content-Type': 'application/json' }
      },
      inputSchema: {
        issueKey: {
          type: 'string',
          required: true,
          label: 'Issue Key',
          placeholder: 'PROJ-123',
          description: 'The key of the issue'
        },
        maxResults: {
          type: 'number',
          required: false,
          label: 'Max Results',
          default: 50,
          min: 1,
          max: 5000,
          description: 'Maximum number of comments to return'
        }
      },
      outputSchema: {
        comments: { type: 'array', description: 'Array of comments' },
        total: { type: 'number', description: 'Total number of comments' }
      }
    },
    {
      id: 'delete_comment',
      name: 'Delete Comment',
      description: 'Delete a comment from an issue',
      category: 'Comments',
      icon: 'trash-2',
      api: {
        endpoint: '/issue/{issueKey}/comment/{commentId}',
        method: 'DELETE',
        baseUrl: 'https://{domain}/rest/api/3',
        headers: { 'Content-Type': 'application/json' }
      },
      inputSchema: {
        issueKey: {
          type: 'string',
          required: true,
          label: 'Issue Key',
          placeholder: 'PROJ-123',
          description: 'The key of the issue'
        },
        commentId: {
          type: 'string',
          required: true,
          label: 'Comment ID',
          placeholder: 'Enter comment ID',
          description: 'The ID of the comment to delete'
        }
      },
      outputSchema: {
        success: { type: 'boolean', description: 'Whether deletion was successful' }
      }
    },

    // ==========================================
    // ATTACHMENT ACTIONS
    // ==========================================
    {
      id: 'add_attachment',
      name: 'Add Attachment',
      description: 'Add an attachment to an issue',
      category: 'Attachments',
      icon: 'paperclip',
      api: {
        endpoint: '/issue/{issueKey}/attachments',
        method: 'POST',
        baseUrl: 'https://{domain}/rest/api/3',
        headers: { 'X-Atlassian-Token': 'no-check' }
      },
      inputSchema: {
        issueKey: {
          type: 'string',
          required: true,
          label: 'Issue Key',
          placeholder: 'PROJ-123',
          description: 'The key of the issue'
        },
        fileUrl: {
          type: 'string',
          required: false,
          label: 'File URL',
          placeholder: 'https://example.com/file.pdf',
          description: 'URL of the file to attach (alternative to file upload)'
        }
      },
      outputSchema: {
        id: { type: 'string', description: 'Attachment ID' },
        filename: { type: 'string', description: 'Filename' },
        size: { type: 'number', description: 'File size in bytes' },
        created: { type: 'string', description: 'Creation timestamp' }
      }
    },
    {
      id: 'get_attachments',
      name: 'Get Attachments',
      description: 'Get all attachments from an issue',
      category: 'Attachments',
      icon: 'file',
      api: {
        endpoint: '/issue/{issueKey}',
        method: 'GET',
        baseUrl: 'https://{domain}/rest/api/3',
        headers: { 'Content-Type': 'application/json' }
      },
      inputSchema: {
        issueKey: {
          type: 'string',
          required: true,
          label: 'Issue Key',
          placeholder: 'PROJ-123',
          description: 'The key of the issue'
        }
      },
      outputSchema: {
        attachments: {
          type: 'array',
          description: 'Array of attachments',
          properties: {
            id: { type: 'string' },
            filename: { type: 'string' },
            size: { type: 'number' },
            mimeType: { type: 'string' },
            content: { type: 'string' }
          }
        }
      }
    },
    {
      id: 'delete_attachment',
      name: 'Delete Attachment',
      description: 'Delete an attachment from an issue',
      category: 'Attachments',
      icon: 'trash-2',
      api: {
        endpoint: '/attachment/{attachmentId}',
        method: 'DELETE',
        baseUrl: 'https://{domain}/rest/api/3',
        headers: { 'Content-Type': 'application/json' }
      },
      inputSchema: {
        attachmentId: {
          type: 'string',
          required: true,
          label: 'Attachment ID',
          placeholder: 'Enter attachment ID',
          description: 'The ID of the attachment to delete'
        }
      },
      outputSchema: {
        success: { type: 'boolean', description: 'Whether deletion was successful' }
      }
    },

    // ==========================================
    // PROJECT ACTIONS
    // ==========================================
    {
      id: 'get_projects',
      name: 'Get Projects',
      description: 'Get all projects accessible to the user',
      category: 'Projects',
      icon: 'folder',
      api: {
        endpoint: '/project/search',
        method: 'GET',
        baseUrl: 'https://{domain}/rest/api/3',
        headers: { 'Content-Type': 'application/json' }
      },
      inputSchema: {
        maxResults: {
          type: 'number',
          required: false,
          label: 'Max Results',
          default: 50,
          min: 1,
          max: 100,
          description: 'Maximum number of projects to return'
        },
        startAt: {
          type: 'number',
          required: false,
          label: 'Start At',
          default: 0,
          min: 0,
          description: 'Starting index for pagination'
        }
      },
      outputSchema: {
        values: { type: 'array', description: 'Array of projects' },
        total: { type: 'number', description: 'Total number of projects' }
      }
    },
    {
      id: 'get_project',
      name: 'Get Project',
      description: 'Get details of a specific project',
      category: 'Projects',
      icon: 'folder',
      api: {
        endpoint: '/project/{projectKey}',
        method: 'GET',
        baseUrl: 'https://{domain}/rest/api/3',
        headers: { 'Content-Type': 'application/json' }
      },
      inputSchema: {
        projectKey: {
          type: 'string',
          required: true,
          label: 'Project Key',
          placeholder: 'PROJ',
          description: 'The key of the project'
        }
      },
      outputSchema: {
        id: { type: 'string', description: 'Project ID' },
        key: { type: 'string', description: 'Project key' },
        name: { type: 'string', description: 'Project name' },
        description: { type: 'string', description: 'Project description' },
        lead: { type: 'object', description: 'Project lead' }
      }
    },

    // ==========================================
    // USER ACTIONS
    // ==========================================
    {
      id: 'get_users',
      name: 'Get Users',
      description: 'Search for users in Jira',
      category: 'Users',
      icon: 'users',
      api: {
        endpoint: '/user/search',
        method: 'GET',
        baseUrl: 'https://{domain}/rest/api/3',
        headers: { 'Content-Type': 'application/json' }
      },
      inputSchema: {
        query: {
          type: 'string',
          required: false,
          label: 'Search Query',
          placeholder: 'john',
          description: 'String to search for in user names and emails'
        },
        maxResults: {
          type: 'number',
          required: false,
          label: 'Max Results',
          default: 50,
          min: 1,
          max: 1000,
          description: 'Maximum number of users to return'
        }
      },
      outputSchema: {
        users: {
          type: 'array',
          description: 'Array of users',
          properties: {
            accountId: { type: 'string' },
            displayName: { type: 'string' },
            emailAddress: { type: 'string' },
            active: { type: 'boolean' }
          }
        }
      }
    },
    {
      id: 'get_user',
      name: 'Get User',
      description: 'Get details of a specific user',
      category: 'Users',
      icon: 'user',
      api: {
        endpoint: '/user',
        method: 'GET',
        baseUrl: 'https://{domain}/rest/api/3',
        headers: { 'Content-Type': 'application/json' }
      },
      inputSchema: {
        accountId: {
          type: 'string',
          required: true,
          label: 'Account ID',
          placeholder: 'Enter account ID',
          description: 'The account ID of the user'
        }
      },
      outputSchema: {
        accountId: { type: 'string', description: 'Account ID' },
        displayName: { type: 'string', description: 'Display name' },
        emailAddress: { type: 'string', description: 'Email address' },
        active: { type: 'boolean', description: 'Whether user is active' }
      }
    },

    // ==========================================
    // NOTIFICATION ACTION
    // ==========================================
    {
      id: 'notify_issue',
      name: 'Notify Issue',
      description: 'Send a notification email for an issue',
      category: 'Issues',
      icon: 'bell',
      api: {
        endpoint: '/issue/{issueKey}/notify',
        method: 'POST',
        baseUrl: 'https://{domain}/rest/api/3',
        headers: { 'Content-Type': 'application/json' }
      },
      inputSchema: {
        issueKey: {
          type: 'string',
          required: true,
          label: 'Issue Key',
          placeholder: 'PROJ-123',
          description: 'The key of the issue',
          aiControlled: false
        },
        subject: {
          type: 'string',
          required: true,
          label: 'Subject',
          placeholder: 'Notification subject',
          description: 'Subject of the notification email',
          aiControlled: true,
          aiDescription: 'Subject line for the notification email'
        },
        textBody: {
          type: 'string',
          required: true,
          label: 'Message Body',
          inputType: 'textarea',
          placeholder: 'Notification message',
          description: 'Body of the notification email',
          aiControlled: true,
          aiDescription: 'The notification message body'
        },
        toReporter: {
          type: 'boolean',
          required: false,
          label: 'Notify Reporter',
          default: true,
          description: 'Whether to notify the reporter',
          aiControlled: false
        },
        toAssignee: {
          type: 'boolean',
          required: false,
          label: 'Notify Assignee',
          default: true,
          description: 'Whether to notify the assignee',
          aiControlled: false
        },
        toWatchers: {
          type: 'boolean',
          required: false,
          label: 'Notify Watchers',
          default: false,
          description: 'Whether to notify watchers',
          aiControlled: false
        }
      },
      outputSchema: {
        success: { type: 'boolean', description: 'Whether notification was sent' }
      }
    }
  ],

  // ============================================
  // SUPPORTED TRIGGERS
  // ============================================
  supported_triggers: [
    {
      id: 'issue_created',
      name: 'Issue Created',
      description: 'Triggers when a new issue is created',
      eventType: 'jira:issue_created',
      icon: 'plus-square',
      webhookRequired: true,
      inputSchema: {
        projectKey: {
          type: 'string',
          required: false,
          label: 'Project Key',
          placeholder: 'PROJ',
          description: 'Only trigger for issues in this project (optional)'
        },
        jqlFilter: {
          type: 'string',
          required: false,
          label: 'JQL Filter',
          inputType: 'textarea',
          placeholder: 'project = PROJ AND issuetype = Bug',
          description: 'JQL query to filter which issues trigger the webhook'
        }
      },
      outputSchema: {
        issue: {
          type: 'object',
          description: 'The created issue',
          properties: {
            id: { type: 'string' },
            key: { type: 'string' },
            fields: { type: 'object' }
          }
        },
        user: {
          type: 'object',
          description: 'User who created the issue'
        },
        changelog: {
          type: 'object',
          description: 'Changelog of the creation'
        }
      }
    },
    {
      id: 'issue_updated',
      name: 'Issue Updated',
      description: 'Triggers when an issue is updated',
      eventType: 'jira:issue_updated',
      icon: 'edit',
      webhookRequired: true,
      inputSchema: {
        projectKey: {
          type: 'string',
          required: false,
          label: 'Project Key',
          placeholder: 'PROJ',
          description: 'Only trigger for issues in this project (optional)'
        },
        jqlFilter: {
          type: 'string',
          required: false,
          label: 'JQL Filter',
          inputType: 'textarea',
          placeholder: 'project = PROJ',
          description: 'JQL query to filter which issues trigger the webhook'
        }
      },
      outputSchema: {
        issue: {
          type: 'object',
          description: 'The updated issue'
        },
        user: {
          type: 'object',
          description: 'User who updated the issue'
        },
        changelog: {
          type: 'object',
          description: 'Changes made to the issue'
        }
      }
    },
    {
      id: 'issue_deleted',
      name: 'Issue Deleted',
      description: 'Triggers when an issue is deleted',
      eventType: 'jira:issue_deleted',
      icon: 'trash-2',
      webhookRequired: true,
      inputSchema: {
        projectKey: {
          type: 'string',
          required: false,
          label: 'Project Key',
          placeholder: 'PROJ',
          description: 'Only trigger for issues in this project (optional)'
        }
      },
      outputSchema: {
        issue: {
          type: 'object',
          description: 'The deleted issue information'
        },
        user: {
          type: 'object',
          description: 'User who deleted the issue'
        }
      }
    },
    {
      id: 'comment_created',
      name: 'Comment Created',
      description: 'Triggers when a comment is added to an issue',
      eventType: 'comment_created',
      icon: 'message-square',
      webhookRequired: true,
      inputSchema: {
        projectKey: {
          type: 'string',
          required: false,
          label: 'Project Key',
          placeholder: 'PROJ',
          description: 'Only trigger for comments in this project (optional)'
        }
      },
      outputSchema: {
        comment: {
          type: 'object',
          description: 'The created comment',
          properties: {
            id: { type: 'string' },
            body: { type: 'string' },
            author: { type: 'object' },
            created: { type: 'string' }
          }
        },
        issue: {
          type: 'object',
          description: 'The issue the comment was added to'
        }
      }
    },
    {
      id: 'comment_updated',
      name: 'Comment Updated',
      description: 'Triggers when a comment is updated',
      eventType: 'comment_updated',
      icon: 'edit',
      webhookRequired: true,
      inputSchema: {
        projectKey: {
          type: 'string',
          required: false,
          label: 'Project Key',
          placeholder: 'PROJ',
          description: 'Only trigger for comments in this project (optional)'
        }
      },
      outputSchema: {
        comment: {
          type: 'object',
          description: 'The updated comment'
        },
        issue: {
          type: 'object',
          description: 'The issue containing the comment'
        }
      }
    },
    {
      id: 'comment_deleted',
      name: 'Comment Deleted',
      description: 'Triggers when a comment is deleted',
      eventType: 'comment_deleted',
      icon: 'trash-2',
      webhookRequired: true,
      inputSchema: {
        projectKey: {
          type: 'string',
          required: false,
          label: 'Project Key',
          placeholder: 'PROJ',
          description: 'Only trigger for comments in this project (optional)'
        }
      },
      outputSchema: {
        comment: {
          type: 'object',
          description: 'The deleted comment information'
        },
        issue: {
          type: 'object',
          description: 'The issue the comment was deleted from'
        }
      }
    },
    {
      id: 'sprint_created',
      name: 'Sprint Created',
      description: 'Triggers when a new sprint is created',
      eventType: 'sprint_created',
      icon: 'zap',
      webhookRequired: true,
      outputSchema: {
        sprint: {
          type: 'object',
          description: 'The created sprint',
          properties: {
            id: { type: 'string' },
            name: { type: 'string' },
            state: { type: 'string' },
            startDate: { type: 'string' },
            endDate: { type: 'string' }
          }
        }
      }
    },
    {
      id: 'sprint_started',
      name: 'Sprint Started',
      description: 'Triggers when a sprint is started',
      eventType: 'sprint_started',
      icon: 'play',
      webhookRequired: true,
      outputSchema: {
        sprint: {
          type: 'object',
          description: 'The started sprint'
        }
      }
    },
    {
      id: 'sprint_closed',
      name: 'Sprint Closed',
      description: 'Triggers when a sprint is closed',
      eventType: 'sprint_closed',
      icon: 'check-circle',
      webhookRequired: true,
      outputSchema: {
        sprint: {
          type: 'object',
          description: 'The closed sprint'
        }
      }
    },
    {
      id: 'project_created',
      name: 'Project Created',
      description: 'Triggers when a new project is created',
      eventType: 'project_created',
      icon: 'folder-plus',
      webhookRequired: true,
      outputSchema: {
        project: {
          type: 'object',
          description: 'The created project',
          properties: {
            id: { type: 'string' },
            key: { type: 'string' },
            name: { type: 'string' }
          }
        }
      }
    },
    {
      id: 'project_updated',
      name: 'Project Updated',
      description: 'Triggers when a project is updated',
      eventType: 'project_updated',
      icon: 'folder',
      webhookRequired: true,
      outputSchema: {
        project: {
          type: 'object',
          description: 'The updated project'
        }
      }
    },
    {
      id: 'worklog_created',
      name: 'Worklog Created',
      description: 'Triggers when a worklog entry is created',
      eventType: 'worklog_created',
      icon: 'clock',
      webhookRequired: true,
      outputSchema: {
        worklog: {
          type: 'object',
          description: 'The created worklog',
          properties: {
            id: { type: 'string' },
            timeSpent: { type: 'string' },
            timeSpentSeconds: { type: 'number' },
            started: { type: 'string' }
          }
        },
        issue: {
          type: 'object',
          description: 'The issue the worklog was added to'
        }
      }
    }
  ]
};
