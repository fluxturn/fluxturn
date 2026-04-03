// Linear Connector
// Comprehensive connector definition with all Linear API capabilities

import { ConnectorDefinition } from '../../shared';

export const LINEAR_CONNECTOR: ConnectorDefinition = {
    name: 'linear',
    display_name: 'Linear',
    category: 'project_management',
    description: 'Linear is a modern issue tracking and project management tool built for high-performance teams with streamlined workflows.',
    auth_type: 'api_key',
    auth_fields: [
      {
        key: 'apiKey',
        label: 'API Key',
        type: 'password',
        required: true,
        placeholder: 'lin_api_...',
        description: 'Your Linear API key for authentication',
        helpUrl: 'https://linear.app/settings/api',
        helpText: 'Create an API key from your Linear settings'
      }
    ],
    endpoints: {
      graphql: 'https://api.linear.app/graphql'
    },
    webhook_support: true,
    rate_limits: {
      requests_per_minute: 1000,
      requests_per_hour: 10000
    },
    sandbox_available: false,
    verified: true,

    // ============================================
    // SUPPORTED ACTIONS - Complete Linear API Coverage
    // ============================================
    supported_actions: [
      // ==========================================
      // ISSUE ACTIONS
      // ==========================================
      {
        id: 'create_issue',
        name: 'Create Issue',
        description: 'Create a new issue in Linear',
        category: 'Issues',
        icon: 'plus-square',
        api: {
          endpoint: '/graphql',
          method: 'POST',
          baseUrl: 'https://api.linear.app',
          headers: { 'Content-Type': 'application/json' }
        },
        inputSchema: {
          teamId: {
            type: 'string',
            required: true,
            label: 'Team ID',
            placeholder: 'Enter team ID',
            description: 'The ID of the team to create the issue in',
            aiControlled: false
          },
          title: {
            type: 'string',
            required: true,
            label: 'Title',
            placeholder: 'Enter issue title',
            description: 'Title of the issue',
            maxLength: 255,
            aiControlled: true,
            aiDescription: 'A clear, concise title that summarizes the issue'
          },
          description: {
            type: 'string',
            required: false,
            label: 'Description',
            inputType: 'textarea',
            placeholder: 'Enter detailed description',
            description: 'Detailed description of the issue (supports Markdown)',
            aiControlled: true,
            aiDescription: 'Detailed description of the issue including context, requirements, and acceptance criteria'
          },
          priority: {
            type: 'select',
            required: false,
            label: 'Priority',
            options: [
              { label: 'No Priority', value: '0' },
              { label: 'Urgent', value: '1' },
              { label: 'High', value: '2' },
              { label: 'Medium', value: '3' },
              { label: 'Low', value: '4' }
            ],
            description: 'Priority of the issue (0 = No Priority, 1 = Urgent, 4 = Low)',
            aiControlled: false
          },
          assigneeId: {
            type: 'string',
            required: false,
            label: 'Assignee ID',
            placeholder: 'Enter user ID',
            description: 'ID of the user to assign the issue to',
            aiControlled: false
          },
          projectId: {
            type: 'string',
            required: false,
            label: 'Project ID',
            placeholder: 'Enter project ID',
            description: 'ID of the project to add the issue to',
            aiControlled: false
          },
          cycleId: {
            type: 'string',
            required: false,
            label: 'Cycle ID',
            placeholder: 'Enter cycle ID',
            description: 'ID of the cycle (sprint) to add the issue to',
            aiControlled: false
          },
          stateId: {
            type: 'string',
            required: false,
            label: 'State ID',
            placeholder: 'Enter state ID',
            description: 'ID of the workflow state for the issue',
            aiControlled: false
          },
          parentId: {
            type: 'string',
            required: false,
            label: 'Parent Issue ID',
            placeholder: 'Enter parent issue ID',
            description: 'ID of the parent issue (for creating sub-issues)',
            aiControlled: false
          },
          labelIds: {
            type: 'string',
            required: false,
            label: 'Label IDs',
            placeholder: 'label-id-1,label-id-2',
            description: 'Comma-separated list of label IDs to apply',
            aiControlled: false
          },
          estimate: {
            type: 'number',
            required: false,
            label: 'Estimate',
            placeholder: '1-10',
            description: 'Estimate points for the issue',
            min: 0,
            aiControlled: false
          },
          dueDate: {
            type: 'string',
            required: false,
            label: 'Due Date',
            placeholder: '2024-12-31',
            description: 'Due date in YYYY-MM-DD format',
            aiControlled: false
          }
        },
        outputSchema: {
          id: { type: 'string', description: 'Issue ID' },
          identifier: { type: 'string', description: 'Issue identifier (e.g., ENG-123)' },
          url: { type: 'string', description: 'URL of the created issue' }
        }
      },
      {
        id: 'update_issue',
        name: 'Update Issue',
        description: 'Update an existing issue in Linear',
        category: 'Issues',
        icon: 'edit',
        api: {
          endpoint: '/graphql',
          method: 'POST',
          baseUrl: 'https://api.linear.app',
          headers: { 'Content-Type': 'application/json' }
        },
        inputSchema: {
          issueId: {
            type: 'string',
            required: true,
            label: 'Issue ID',
            placeholder: 'Enter issue ID',
            description: 'The ID of the issue to update',
            aiControlled: false
          },
          title: {
            type: 'string',
            required: false,
            label: 'Title',
            placeholder: 'Updated title',
            description: 'New title for the issue',
            aiControlled: true,
            aiDescription: 'Updated title for the issue'
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
            type: 'select',
            required: false,
            label: 'Priority',
            options: [
              { label: 'No Priority', value: '0' },
              { label: 'Urgent', value: '1' },
              { label: 'High', value: '2' },
              { label: 'Medium', value: '3' },
              { label: 'Low', value: '4' }
            ],
            description: 'New priority for the issue',
            aiControlled: false
          },
          assigneeId: {
            type: 'string',
            required: false,
            label: 'Assignee ID',
            placeholder: 'Enter user ID',
            description: 'New assignee user ID',
            aiControlled: false
          },
          stateId: {
            type: 'string',
            required: false,
            label: 'State ID',
            placeholder: 'Enter state ID',
            description: 'New workflow state ID',
            aiControlled: false
          },
          projectId: {
            type: 'string',
            required: false,
            label: 'Project ID',
            placeholder: 'Enter project ID',
            description: 'New project ID',
            aiControlled: false
          },
          cycleId: {
            type: 'string',
            required: false,
            label: 'Cycle ID',
            placeholder: 'Enter cycle ID',
            description: 'New cycle (sprint) ID',
            aiControlled: false
          },
          labelIds: {
            type: 'string',
            required: false,
            label: 'Label IDs',
            placeholder: 'label-id-1,label-id-2',
            description: 'Comma-separated list of label IDs (replaces existing)',
            aiControlled: false
          },
          estimate: {
            type: 'number',
            required: false,
            label: 'Estimate',
            placeholder: '1-10',
            description: 'New estimate points',
            min: 0,
            aiControlled: false
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
          success: { type: 'boolean', description: 'Whether update was successful' },
          issue: { type: 'object', description: 'Updated issue data' }
        }
      },
      {
        id: 'get_issue',
        name: 'Get Issue',
        description: 'Retrieve details of a specific issue',
        category: 'Issues',
        icon: 'file-text',
        api: {
          endpoint: '/graphql',
          method: 'POST',
          baseUrl: 'https://api.linear.app',
          headers: { 'Content-Type': 'application/json' }
        },
        inputSchema: {
          issueId: {
            type: 'string',
            required: true,
            label: 'Issue ID',
            placeholder: 'Enter issue ID',
            description: 'The ID of the issue to retrieve',
            aiControlled: false
          }
        },
        outputSchema: {
          id: { type: 'string', description: 'Issue ID' },
          identifier: { type: 'string', description: 'Issue identifier (e.g., ENG-123)' },
          title: { type: 'string', description: 'Issue title' },
          description: { type: 'string', description: 'Issue description' },
          priority: { type: 'number', description: 'Issue priority' },
          state: { type: 'object', description: 'Current workflow state' },
          assignee: { type: 'object', description: 'Assigned user' },
          url: { type: 'string', description: 'Issue URL' }
        }
      },
      {
        id: 'search_issues',
        name: 'Search Issues',
        description: 'Search for issues in Linear',
        category: 'Issues',
        icon: 'search',
        api: {
          endpoint: '/graphql',
          method: 'POST',
          baseUrl: 'https://api.linear.app',
          headers: { 'Content-Type': 'application/json' }
        },
        inputSchema: {
          query: {
            type: 'string',
            required: false,
            label: 'Search Query',
            placeholder: 'Search text',
            description: 'Text to search for in issue titles',
            aiControlled: false
          },
          teamId: {
            type: 'string',
            required: false,
            label: 'Team ID',
            placeholder: 'Enter team ID',
            description: 'Filter issues by team',
            aiControlled: false
          },
          projectId: {
            type: 'string',
            required: false,
            label: 'Project ID',
            placeholder: 'Enter project ID',
            description: 'Filter issues by project',
            aiControlled: false
          },
          assigneeId: {
            type: 'string',
            required: false,
            label: 'Assignee ID',
            placeholder: 'Enter user ID',
            description: 'Filter issues by assignee',
            aiControlled: false
          },
          stateId: {
            type: 'string',
            required: false,
            label: 'State ID',
            placeholder: 'Enter state ID',
            description: 'Filter issues by workflow state',
            aiControlled: false
          },
          priority: {
            type: 'number',
            required: false,
            label: 'Priority',
            placeholder: '0-4',
            description: 'Filter issues by priority',
            aiControlled: false
          },
          limit: {
            type: 'number',
            required: false,
            label: 'Limit',
            default: 50,
            min: 1,
            max: 100,
            description: 'Maximum number of results to return',
            aiControlled: false
          }
        },
        outputSchema: {
          issues: { type: 'array', description: 'Array of matching issues' },
          pageInfo: { type: 'object', description: 'Pagination information' }
        }
      },
      {
        id: 'delete_issue',
        name: 'Delete Issue',
        description: 'Permanently delete an issue',
        category: 'Issues',
        icon: 'trash-2',
        api: {
          endpoint: '/graphql',
          method: 'POST',
          baseUrl: 'https://api.linear.app',
          headers: { 'Content-Type': 'application/json' }
        },
        inputSchema: {
          issueId: {
            type: 'string',
            required: true,
            label: 'Issue ID',
            placeholder: 'Enter issue ID',
            description: 'The ID of the issue to delete',
            aiControlled: false
          }
        },
        outputSchema: {
          success: { type: 'boolean', description: 'Whether deletion was successful' }
        }
      },
      {
        id: 'assign_issue',
        name: 'Assign Issue',
        description: 'Assign an issue to a user',
        category: 'Issues',
        icon: 'user-plus',
        api: {
          endpoint: '/graphql',
          method: 'POST',
          baseUrl: 'https://api.linear.app',
          headers: { 'Content-Type': 'application/json' }
        },
        inputSchema: {
          issueId: {
            type: 'string',
            required: true,
            label: 'Issue ID',
            placeholder: 'Enter issue ID',
            description: 'The ID of the issue to assign',
            aiControlled: false
          },
          assigneeId: {
            type: 'string',
            required: true,
            label: 'Assignee ID',
            placeholder: 'Enter user ID',
            description: 'The ID of the user to assign the issue to',
            aiControlled: false
          }
        },
        outputSchema: {
          success: { type: 'boolean', description: 'Whether assignment was successful' },
          issue: { type: 'object', description: 'Updated issue data' }
        }
      },

      // ==========================================
      // PROJECT ACTIONS
      // ==========================================
      {
        id: 'create_project',
        name: 'Create Project',
        description: 'Create a new project in Linear',
        category: 'Projects',
        icon: 'folder-plus',
        api: {
          endpoint: '/graphql',
          method: 'POST',
          baseUrl: 'https://api.linear.app',
          headers: { 'Content-Type': 'application/json' }
        },
        inputSchema: {
          name: {
            type: 'string',
            required: true,
            label: 'Project Name',
            placeholder: 'Enter project name',
            description: 'Name of the project',
            aiControlled: true,
            aiDescription: 'A clear, descriptive name for the project'
          },
          description: {
            type: 'string',
            required: false,
            label: 'Description',
            inputType: 'textarea',
            placeholder: 'Enter project description',
            description: 'Description of the project',
            aiControlled: true,
            aiDescription: 'Description of the project goals and scope'
          },
          teamIds: {
            type: 'string',
            required: true,
            label: 'Team IDs',
            placeholder: 'team-id-1,team-id-2',
            description: 'Comma-separated list of team IDs to associate with the project',
            aiControlled: false
          },
          state: {
            type: 'select',
            required: false,
            label: 'State',
            options: [
              { label: 'Planned', value: 'planned' },
              { label: 'Started', value: 'started' },
              { label: 'Paused', value: 'paused' },
              { label: 'Completed', value: 'completed' },
              { label: 'Canceled', value: 'canceled' }
            ],
            default: 'planned',
            description: 'Initial state of the project',
            aiControlled: false
          },
          targetDate: {
            type: 'string',
            required: false,
            label: 'Target Date',
            placeholder: '2024-12-31',
            description: 'Target completion date in YYYY-MM-DD format',
            aiControlled: false
          },
          color: {
            type: 'string',
            required: false,
            label: 'Color',
            placeholder: '#FF0000',
            description: 'Color of the project (hex format)',
            aiControlled: false
          },
          icon: {
            type: 'string',
            required: false,
            label: 'Icon',
            placeholder: 'Enter icon name',
            description: 'Icon for the project',
            aiControlled: false
          }
        },
        outputSchema: {
          id: { type: 'string', description: 'Project ID' },
          name: { type: 'string', description: 'Project name' },
          url: { type: 'string', description: 'Project URL' }
        }
      },
      {
        id: 'update_project',
        name: 'Update Project',
        description: 'Update an existing project in Linear',
        category: 'Projects',
        icon: 'edit',
        api: {
          endpoint: '/graphql',
          method: 'POST',
          baseUrl: 'https://api.linear.app',
          headers: { 'Content-Type': 'application/json' }
        },
        inputSchema: {
          projectId: {
            type: 'string',
            required: true,
            label: 'Project ID',
            placeholder: 'Enter project ID',
            description: 'The ID of the project to update',
            aiControlled: false
          },
          name: {
            type: 'string',
            required: false,
            label: 'Name',
            placeholder: 'Updated name',
            description: 'New name for the project',
            aiControlled: true,
            aiDescription: 'Updated name for the project'
          },
          description: {
            type: 'string',
            required: false,
            label: 'Description',
            inputType: 'textarea',
            placeholder: 'Updated description',
            description: 'New description for the project',
            aiControlled: true,
            aiDescription: 'Updated description for the project'
          },
          state: {
            type: 'select',
            required: false,
            label: 'State',
            options: [
              { label: 'Planned', value: 'planned' },
              { label: 'Started', value: 'started' },
              { label: 'Paused', value: 'paused' },
              { label: 'Completed', value: 'completed' },
              { label: 'Canceled', value: 'canceled' }
            ],
            description: 'New state for the project',
            aiControlled: false
          },
          targetDate: {
            type: 'string',
            required: false,
            label: 'Target Date',
            placeholder: '2024-12-31',
            description: 'New target date in YYYY-MM-DD format',
            aiControlled: false
          }
        },
        outputSchema: {
          success: { type: 'boolean', description: 'Whether update was successful' },
          project: { type: 'object', description: 'Updated project data' }
        }
      },
      {
        id: 'get_project',
        name: 'Get Project',
        description: 'Retrieve details of a specific project',
        category: 'Projects',
        icon: 'folder',
        api: {
          endpoint: '/graphql',
          method: 'POST',
          baseUrl: 'https://api.linear.app',
          headers: { 'Content-Type': 'application/json' }
        },
        inputSchema: {
          projectId: {
            type: 'string',
            required: true,
            label: 'Project ID',
            placeholder: 'Enter project ID',
            description: 'The ID of the project to retrieve',
            aiControlled: false
          }
        },
        outputSchema: {
          id: { type: 'string', description: 'Project ID' },
          name: { type: 'string', description: 'Project name' },
          description: { type: 'string', description: 'Project description' },
          state: { type: 'string', description: 'Project state' },
          targetDate: { type: 'string', description: 'Target date' },
          url: { type: 'string', description: 'Project URL' }
        }
      },
      {
        id: 'get_projects',
        name: 'Get Projects',
        description: 'Get all projects',
        category: 'Projects',
        icon: 'folders',
        api: {
          endpoint: '/graphql',
          method: 'POST',
          baseUrl: 'https://api.linear.app',
          headers: { 'Content-Type': 'application/json' }
        },
        inputSchema: {
          limit: {
            type: 'number',
            required: false,
            label: 'Limit',
            default: 50,
            min: 1,
            max: 100,
            description: 'Maximum number of projects to return',
            aiControlled: false
          }
        },
        outputSchema: {
          projects: { type: 'array', description: 'Array of projects' },
          pageInfo: { type: 'object', description: 'Pagination information' }
        }
      },
      {
        id: 'delete_project',
        name: 'Delete Project',
        description: 'Delete a project',
        category: 'Projects',
        icon: 'trash-2',
        api: {
          endpoint: '/graphql',
          method: 'POST',
          baseUrl: 'https://api.linear.app',
          headers: { 'Content-Type': 'application/json' }
        },
        inputSchema: {
          projectId: {
            type: 'string',
            required: true,
            label: 'Project ID',
            placeholder: 'Enter project ID',
            description: 'The ID of the project to delete',
            aiControlled: false
          }
        },
        outputSchema: {
          success: { type: 'boolean', description: 'Whether deletion was successful' }
        }
      },

      // ==========================================
      // CYCLE (SPRINT) ACTIONS
      // ==========================================
      {
        id: 'create_cycle',
        name: 'Create Cycle',
        description: 'Create a new cycle (sprint) in Linear',
        category: 'Cycles',
        icon: 'refresh-cw',
        api: {
          endpoint: '/graphql',
          method: 'POST',
          baseUrl: 'https://api.linear.app',
          headers: { 'Content-Type': 'application/json' }
        },
        inputSchema: {
          teamId: {
            type: 'string',
            required: true,
            label: 'Team ID',
            placeholder: 'Enter team ID',
            description: 'The ID of the team for the cycle',
            aiControlled: false
          },
          name: {
            type: 'string',
            required: false,
            label: 'Cycle Name',
            placeholder: 'Sprint 1',
            description: 'Name of the cycle',
            aiControlled: true,
            aiDescription: 'Name for the cycle/sprint'
          },
          description: {
            type: 'string',
            required: false,
            label: 'Description',
            inputType: 'textarea',
            placeholder: 'Enter cycle description',
            description: 'Description of the cycle',
            aiControlled: true,
            aiDescription: 'Description of the cycle goals and focus'
          },
          startsAt: {
            type: 'string',
            required: true,
            label: 'Start Date',
            placeholder: '2024-01-01',
            description: 'Start date in YYYY-MM-DD format',
            aiControlled: false
          },
          endsAt: {
            type: 'string',
            required: true,
            label: 'End Date',
            placeholder: '2024-01-14',
            description: 'End date in YYYY-MM-DD format',
            aiControlled: false
          }
        },
        outputSchema: {
          id: { type: 'string', description: 'Cycle ID' },
          name: { type: 'string', description: 'Cycle name' },
          startsAt: { type: 'string', description: 'Start date' },
          endsAt: { type: 'string', description: 'End date' }
        }
      },
      {
        id: 'get_cycles',
        name: 'Get Cycles',
        description: 'Get cycles for a team',
        category: 'Cycles',
        icon: 'list',
        api: {
          endpoint: '/graphql',
          method: 'POST',
          baseUrl: 'https://api.linear.app',
          headers: { 'Content-Type': 'application/json' }
        },
        inputSchema: {
          teamId: {
            type: 'string',
            required: false,
            label: 'Team ID',
            placeholder: 'Enter team ID',
            description: 'Filter cycles by team (optional)',
            aiControlled: false
          },
          limit: {
            type: 'number',
            required: false,
            label: 'Limit',
            default: 50,
            min: 1,
            max: 100,
            description: 'Maximum number of cycles to return',
            aiControlled: false
          }
        },
        outputSchema: {
          cycles: { type: 'array', description: 'Array of cycles' },
          pageInfo: { type: 'object', description: 'Pagination information' }
        }
      },
      {
        id: 'add_issue_to_cycle',
        name: 'Add Issue to Cycle',
        description: 'Add an issue to a cycle (sprint)',
        category: 'Cycles',
        icon: 'plus',
        api: {
          endpoint: '/graphql',
          method: 'POST',
          baseUrl: 'https://api.linear.app',
          headers: { 'Content-Type': 'application/json' }
        },
        inputSchema: {
          issueId: {
            type: 'string',
            required: true,
            label: 'Issue ID',
            placeholder: 'Enter issue ID',
            description: 'The ID of the issue to add',
            aiControlled: false
          },
          cycleId: {
            type: 'string',
            required: true,
            label: 'Cycle ID',
            placeholder: 'Enter cycle ID',
            description: 'The ID of the cycle to add the issue to',
            aiControlled: false
          }
        },
        outputSchema: {
          success: { type: 'boolean', description: 'Whether the operation was successful' }
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
          endpoint: '/graphql',
          method: 'POST',
          baseUrl: 'https://api.linear.app',
          headers: { 'Content-Type': 'application/json' }
        },
        inputSchema: {
          issueId: {
            type: 'string',
            required: true,
            label: 'Issue ID',
            placeholder: 'Enter issue ID',
            description: 'The ID of the issue to comment on',
            aiControlled: false
          },
          body: {
            type: 'string',
            required: true,
            label: 'Comment Body',
            inputType: 'textarea',
            placeholder: 'Enter your comment',
            description: 'The body of the comment (supports Markdown)',
            aiControlled: true,
            aiDescription: 'The comment text to add to the issue'
          }
        },
        outputSchema: {
          id: { type: 'string', description: 'Comment ID' },
          body: { type: 'string', description: 'Comment body' },
          createdAt: { type: 'string', description: 'Creation timestamp' }
        }
      },
      {
        id: 'update_comment',
        name: 'Update Comment',
        description: 'Update an existing comment',
        category: 'Comments',
        icon: 'edit',
        api: {
          endpoint: '/graphql',
          method: 'POST',
          baseUrl: 'https://api.linear.app',
          headers: { 'Content-Type': 'application/json' }
        },
        inputSchema: {
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
          body: { type: 'string', description: 'Updated comment body' },
          updatedAt: { type: 'string', description: 'Update timestamp' }
        }
      },
      {
        id: 'get_comments',
        name: 'Get Comments',
        description: 'Get comments for an issue',
        category: 'Comments',
        icon: 'message-circle',
        api: {
          endpoint: '/graphql',
          method: 'POST',
          baseUrl: 'https://api.linear.app',
          headers: { 'Content-Type': 'application/json' }
        },
        inputSchema: {
          issueId: {
            type: 'string',
            required: true,
            label: 'Issue ID',
            placeholder: 'Enter issue ID',
            description: 'The ID of the issue to get comments for',
            aiControlled: false
          },
          limit: {
            type: 'number',
            required: false,
            label: 'Limit',
            default: 50,
            min: 1,
            max: 100,
            description: 'Maximum number of comments to return',
            aiControlled: false
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
        description: 'Delete a comment',
        category: 'Comments',
        icon: 'trash-2',
        api: {
          endpoint: '/graphql',
          method: 'POST',
          baseUrl: 'https://api.linear.app',
          headers: { 'Content-Type': 'application/json' }
        },
        inputSchema: {
          commentId: {
            type: 'string',
            required: true,
            label: 'Comment ID',
            placeholder: 'Enter comment ID',
            description: 'The ID of the comment to delete',
            aiControlled: false
          }
        },
        outputSchema: {
          success: { type: 'boolean', description: 'Whether deletion was successful' }
        }
      },

      // ==========================================
      // LABEL ACTIONS
      // ==========================================
      {
        id: 'create_label',
        name: 'Create Label',
        description: 'Create a new label',
        category: 'Labels',
        icon: 'tag',
        api: {
          endpoint: '/graphql',
          method: 'POST',
          baseUrl: 'https://api.linear.app',
          headers: { 'Content-Type': 'application/json' }
        },
        inputSchema: {
          teamId: {
            type: 'string',
            required: true,
            label: 'Team ID',
            placeholder: 'Enter team ID',
            description: 'The ID of the team for the label',
            aiControlled: false
          },
          name: {
            type: 'string',
            required: true,
            label: 'Label Name',
            placeholder: 'Enter label name',
            description: 'Name of the label',
            aiControlled: true,
            aiDescription: 'A clear, descriptive name for the label'
          },
          description: {
            type: 'string',
            required: false,
            label: 'Description',
            placeholder: 'Enter label description',
            description: 'Description of the label',
            aiControlled: true,
            aiDescription: 'Description of when to use this label'
          },
          color: {
            type: 'string',
            required: false,
            label: 'Color',
            placeholder: '#FF0000',
            description: 'Color of the label (hex format)',
            aiControlled: false
          }
        },
        outputSchema: {
          id: { type: 'string', description: 'Label ID' },
          name: { type: 'string', description: 'Label name' },
          color: { type: 'string', description: 'Label color' }
        }
      },
      {
        id: 'get_labels',
        name: 'Get Labels',
        description: 'Get all labels',
        category: 'Labels',
        icon: 'tags',
        api: {
          endpoint: '/graphql',
          method: 'POST',
          baseUrl: 'https://api.linear.app',
          headers: { 'Content-Type': 'application/json' }
        },
        inputSchema: {
          limit: {
            type: 'number',
            required: false,
            label: 'Limit',
            default: 50,
            min: 1,
            max: 100,
            description: 'Maximum number of labels to return',
            aiControlled: false
          }
        },
        outputSchema: {
          labels: { type: 'array', description: 'Array of labels' }
        }
      },
      {
        id: 'add_label_to_issue',
        name: 'Add Label to Issue',
        description: 'Add a label to an issue',
        category: 'Labels',
        icon: 'tag',
        api: {
          endpoint: '/graphql',
          method: 'POST',
          baseUrl: 'https://api.linear.app',
          headers: { 'Content-Type': 'application/json' }
        },
        inputSchema: {
          issueId: {
            type: 'string',
            required: true,
            label: 'Issue ID',
            placeholder: 'Enter issue ID',
            description: 'The ID of the issue',
            aiControlled: false
          },
          labelId: {
            type: 'string',
            required: true,
            label: 'Label ID',
            placeholder: 'Enter label ID',
            description: 'The ID of the label to add',
            aiControlled: false
          }
        },
        outputSchema: {
          success: { type: 'boolean', description: 'Whether the operation was successful' }
        }
      },
      {
        id: 'remove_label_from_issue',
        name: 'Remove Label from Issue',
        description: 'Remove a label from an issue',
        category: 'Labels',
        icon: 'x',
        api: {
          endpoint: '/graphql',
          method: 'POST',
          baseUrl: 'https://api.linear.app',
          headers: { 'Content-Type': 'application/json' }
        },
        inputSchema: {
          issueId: {
            type: 'string',
            required: true,
            label: 'Issue ID',
            placeholder: 'Enter issue ID',
            description: 'The ID of the issue',
            aiControlled: false
          },
          labelId: {
            type: 'string',
            required: true,
            label: 'Label ID',
            placeholder: 'Enter label ID',
            description: 'The ID of the label to remove',
            aiControlled: false
          }
        },
        outputSchema: {
          success: { type: 'boolean', description: 'Whether the operation was successful' }
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
          endpoint: '/graphql',
          method: 'POST',
          baseUrl: 'https://api.linear.app',
          headers: { 'Content-Type': 'application/json' }
        },
        inputSchema: {
          issueId: {
            type: 'string',
            required: true,
            label: 'Issue ID',
            placeholder: 'Enter issue ID',
            description: 'The ID of the issue to attach to',
            aiControlled: false
          },
          title: {
            type: 'string',
            required: true,
            label: 'Title',
            placeholder: 'Enter attachment title',
            description: 'Title of the attachment',
            aiControlled: true,
            aiDescription: 'A descriptive title for the attachment'
          },
          url: {
            type: 'string',
            required: true,
            label: 'URL',
            placeholder: 'https://example.com/file.pdf',
            description: 'URL of the attachment',
            aiControlled: false
          },
          subtitle: {
            type: 'string',
            required: false,
            label: 'Subtitle',
            placeholder: 'Enter subtitle',
            description: 'Subtitle or description of the attachment',
            aiControlled: true,
            aiDescription: 'A brief description of the attachment content'
          }
        },
        outputSchema: {
          id: { type: 'string', description: 'Attachment ID' },
          title: { type: 'string', description: 'Attachment title' },
          url: { type: 'string', description: 'Attachment URL' }
        }
      },
      {
        id: 'get_attachments',
        name: 'Get Attachments',
        description: 'Get attachments for an issue',
        category: 'Attachments',
        icon: 'file',
        api: {
          endpoint: '/graphql',
          method: 'POST',
          baseUrl: 'https://api.linear.app',
          headers: { 'Content-Type': 'application/json' }
        },
        inputSchema: {
          issueId: {
            type: 'string',
            required: true,
            label: 'Issue ID',
            placeholder: 'Enter issue ID',
            description: 'The ID of the issue to get attachments for',
            aiControlled: false
          }
        },
        outputSchema: {
          attachments: { type: 'array', description: 'Array of attachments' }
        }
      },
      {
        id: 'delete_attachment',
        name: 'Delete Attachment',
        description: 'Delete an attachment',
        category: 'Attachments',
        icon: 'trash-2',
        api: {
          endpoint: '/graphql',
          method: 'POST',
          baseUrl: 'https://api.linear.app',
          headers: { 'Content-Type': 'application/json' }
        },
        inputSchema: {
          attachmentId: {
            type: 'string',
            required: true,
            label: 'Attachment ID',
            placeholder: 'Enter attachment ID',
            description: 'The ID of the attachment to delete',
            aiControlled: false
          }
        },
        outputSchema: {
          success: { type: 'boolean', description: 'Whether deletion was successful' }
        }
      },

      // ==========================================
      // TEAM ACTIONS
      // ==========================================
      {
        id: 'get_teams',
        name: 'Get Teams',
        description: 'Get all teams',
        category: 'Teams',
        icon: 'users',
        api: {
          endpoint: '/graphql',
          method: 'POST',
          baseUrl: 'https://api.linear.app',
          headers: { 'Content-Type': 'application/json' }
        },
        inputSchema: {
          limit: {
            type: 'number',
            required: false,
            label: 'Limit',
            default: 50,
            min: 1,
            max: 100,
            description: 'Maximum number of teams to return',
            aiControlled: false
          }
        },
        outputSchema: {
          teams: { type: 'array', description: 'Array of teams' }
        }
      },
      {
        id: 'get_team',
        name: 'Get Team',
        description: 'Get details of a specific team',
        category: 'Teams',
        icon: 'users',
        api: {
          endpoint: '/graphql',
          method: 'POST',
          baseUrl: 'https://api.linear.app',
          headers: { 'Content-Type': 'application/json' }
        },
        inputSchema: {
          teamId: {
            type: 'string',
            required: true,
            label: 'Team ID',
            placeholder: 'Enter team ID',
            description: 'The ID of the team to retrieve',
            aiControlled: false
          }
        },
        outputSchema: {
          id: { type: 'string', description: 'Team ID' },
          name: { type: 'string', description: 'Team name' },
          key: { type: 'string', description: 'Team key' },
          description: { type: 'string', description: 'Team description' }
        }
      },

      // ==========================================
      // USER ACTIONS
      // ==========================================
      {
        id: 'get_users',
        name: 'Get Users',
        description: 'Get all users in the workspace',
        category: 'Users',
        icon: 'users',
        api: {
          endpoint: '/graphql',
          method: 'POST',
          baseUrl: 'https://api.linear.app',
          headers: { 'Content-Type': 'application/json' }
        },
        inputSchema: {
          limit: {
            type: 'number',
            required: false,
            label: 'Limit',
            default: 50,
            min: 1,
            max: 100,
            description: 'Maximum number of users to return',
            aiControlled: false
          }
        },
        outputSchema: {
          users: { type: 'array', description: 'Array of users' }
        }
      },
      {
        id: 'get_user',
        name: 'Get User',
        description: 'Get details of a specific user',
        category: 'Users',
        icon: 'user',
        api: {
          endpoint: '/graphql',
          method: 'POST',
          baseUrl: 'https://api.linear.app',
          headers: { 'Content-Type': 'application/json' }
        },
        inputSchema: {
          userId: {
            type: 'string',
            required: true,
            label: 'User ID',
            placeholder: 'Enter user ID',
            description: 'The ID of the user to retrieve',
            aiControlled: false
          }
        },
        outputSchema: {
          id: { type: 'string', description: 'User ID' },
          name: { type: 'string', description: 'User name' },
          email: { type: 'string', description: 'User email' },
          avatarUrl: { type: 'string', description: 'Avatar URL' },
          isActive: { type: 'boolean', description: 'Whether user is active' }
        }
      },
      {
        id: 'get_current_user',
        name: 'Get Current User',
        description: 'Get details of the authenticated user',
        category: 'Users',
        icon: 'user',
        api: {
          endpoint: '/graphql',
          method: 'POST',
          baseUrl: 'https://api.linear.app',
          headers: { 'Content-Type': 'application/json' }
        },
        inputSchema: {},
        outputSchema: {
          id: { type: 'string', description: 'User ID' },
          name: { type: 'string', description: 'User name' },
          email: { type: 'string', description: 'User email' },
          avatarUrl: { type: 'string', description: 'Avatar URL' }
        }
      },

      // ==========================================
      // ISSUE RELATION ACTIONS
      // ==========================================
      {
        id: 'create_issue_relation',
        name: 'Create Issue Relation',
        description: 'Create a relation between two issues',
        category: 'Issues',
        icon: 'link',
        api: {
          endpoint: '/graphql',
          method: 'POST',
          baseUrl: 'https://api.linear.app',
          headers: { 'Content-Type': 'application/json' }
        },
        inputSchema: {
          issueId: {
            type: 'string',
            required: true,
            label: 'Issue ID',
            placeholder: 'Enter issue ID',
            description: 'The ID of the first issue',
            aiControlled: false
          },
          relatedIssueId: {
            type: 'string',
            required: true,
            label: 'Related Issue ID',
            placeholder: 'Enter related issue ID',
            description: 'The ID of the related issue',
            aiControlled: false
          },
          type: {
            type: 'select',
            required: true,
            label: 'Relation Type',
            options: [
              { label: 'Blocks', value: 'blocks' },
              { label: 'Blocked By', value: 'blocked_by' },
              { label: 'Related', value: 'related' },
              { label: 'Duplicate', value: 'duplicate' },
              { label: 'Duplicate Of', value: 'duplicate_of' }
            ],
            description: 'Type of relation between the issues',
            aiControlled: false
          }
        },
        outputSchema: {
          id: { type: 'string', description: 'Relation ID' },
          type: { type: 'string', description: 'Relation type' }
        }
      },

      // ==========================================
      // WORKFLOW STATE ACTIONS
      // ==========================================
      {
        id: 'get_workflow_states',
        name: 'Get Workflow States',
        description: 'Get workflow states for a team',
        category: 'Workflow',
        icon: 'git-branch',
        api: {
          endpoint: '/graphql',
          method: 'POST',
          baseUrl: 'https://api.linear.app',
          headers: { 'Content-Type': 'application/json' }
        },
        inputSchema: {
          teamId: {
            type: 'string',
            required: true,
            label: 'Team ID',
            placeholder: 'Enter team ID',
            description: 'The ID of the team to get states for',
            aiControlled: false
          }
        },
        outputSchema: {
          states: { type: 'array', description: 'Array of workflow states' }
        }
      },
      {
        id: 'transition_issue',
        name: 'Transition Issue',
        description: 'Move an issue to a different workflow state',
        category: 'Workflow',
        icon: 'arrow-right',
        api: {
          endpoint: '/graphql',
          method: 'POST',
          baseUrl: 'https://api.linear.app',
          headers: { 'Content-Type': 'application/json' }
        },
        inputSchema: {
          issueId: {
            type: 'string',
            required: true,
            label: 'Issue ID',
            placeholder: 'Enter issue ID',
            description: 'The ID of the issue to transition',
            aiControlled: false
          },
          stateId: {
            type: 'string',
            required: true,
            label: 'State ID',
            placeholder: 'Enter state ID',
            description: 'The ID of the target workflow state',
            aiControlled: false
          }
        },
        outputSchema: {
          success: { type: 'boolean', description: 'Whether transition was successful' },
          issue: { type: 'object', description: 'Updated issue data' }
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
        eventType: 'linear:issue_created',
        icon: 'plus-square',
        webhookRequired: true,
        inputSchema: {
          teamId: {
            type: 'string',
            required: false,
            label: 'Team ID',
            placeholder: 'Enter team ID',
            description: 'Only trigger for issues in this team (optional)'
          },
          projectId: {
            type: 'string',
            required: false,
            label: 'Project ID',
            placeholder: 'Enter project ID',
            description: 'Only trigger for issues in this project (optional)'
          }
        },
        outputSchema: {
          issue: {
            type: 'object',
            description: 'The created issue',
            properties: {
              id: { type: 'string' },
              identifier: { type: 'string' },
              title: { type: 'string' },
              description: { type: 'string' },
              priority: { type: 'number' },
              state: { type: 'object' }
            }
          },
          actor: {
            type: 'object',
            description: 'User who created the issue'
          }
        }
      },
      {
        id: 'issue_updated',
        name: 'Issue Updated',
        description: 'Triggers when an issue is updated',
        eventType: 'linear:issue_updated',
        icon: 'edit',
        webhookRequired: true,
        inputSchema: {
          teamId: {
            type: 'string',
            required: false,
            label: 'Team ID',
            placeholder: 'Enter team ID',
            description: 'Only trigger for issues in this team (optional)'
          }
        },
        outputSchema: {
          issue: {
            type: 'object',
            description: 'The updated issue'
          },
          actor: {
            type: 'object',
            description: 'User who updated the issue'
          },
          updatedFrom: {
            type: 'object',
            description: 'Previous values of changed fields'
          }
        }
      },
      {
        id: 'issue_removed',
        name: 'Issue Removed',
        description: 'Triggers when an issue is removed/deleted',
        eventType: 'linear:issue_removed',
        icon: 'trash-2',
        webhookRequired: true,
        inputSchema: {
          teamId: {
            type: 'string',
            required: false,
            label: 'Team ID',
            placeholder: 'Enter team ID',
            description: 'Only trigger for issues in this team (optional)'
          }
        },
        outputSchema: {
          issue: {
            type: 'object',
            description: 'The removed issue information'
          },
          actor: {
            type: 'object',
            description: 'User who removed the issue'
          }
        }
      },
      {
        id: 'comment_created',
        name: 'Comment Created',
        description: 'Triggers when a comment is added to an issue',
        eventType: 'linear:comment_created',
        icon: 'message-square',
        webhookRequired: true,
        inputSchema: {
          teamId: {
            type: 'string',
            required: false,
            label: 'Team ID',
            placeholder: 'Enter team ID',
            description: 'Only trigger for comments on issues in this team (optional)'
          }
        },
        outputSchema: {
          comment: {
            type: 'object',
            description: 'The created comment',
            properties: {
              id: { type: 'string' },
              body: { type: 'string' },
              createdAt: { type: 'string' }
            }
          },
          issue: {
            type: 'object',
            description: 'The issue the comment was added to'
          },
          actor: {
            type: 'object',
            description: 'User who created the comment'
          }
        }
      },
      {
        id: 'comment_updated',
        name: 'Comment Updated',
        description: 'Triggers when a comment is updated',
        eventType: 'linear:comment_updated',
        icon: 'edit',
        webhookRequired: true,
        outputSchema: {
          comment: {
            type: 'object',
            description: 'The updated comment'
          },
          issue: {
            type: 'object',
            description: 'The issue containing the comment'
          },
          actor: {
            type: 'object',
            description: 'User who updated the comment'
          }
        }
      },
      {
        id: 'project_created',
        name: 'Project Created',
        description: 'Triggers when a new project is created',
        eventType: 'linear:project_created',
        icon: 'folder-plus',
        webhookRequired: true,
        outputSchema: {
          project: {
            type: 'object',
            description: 'The created project',
            properties: {
              id: { type: 'string' },
              name: { type: 'string' },
              description: { type: 'string' },
              state: { type: 'string' }
            }
          },
          actor: {
            type: 'object',
            description: 'User who created the project'
          }
        }
      },
      {
        id: 'project_updated',
        name: 'Project Updated',
        description: 'Triggers when a project is updated',
        eventType: 'linear:project_updated',
        icon: 'folder',
        webhookRequired: true,
        outputSchema: {
          project: {
            type: 'object',
            description: 'The updated project'
          },
          actor: {
            type: 'object',
            description: 'User who updated the project'
          },
          updatedFrom: {
            type: 'object',
            description: 'Previous values of changed fields'
          }
        }
      },
      {
        id: 'cycle_created',
        name: 'Cycle Created',
        description: 'Triggers when a new cycle (sprint) is created',
        eventType: 'linear:cycle_created',
        icon: 'refresh-cw',
        webhookRequired: true,
        outputSchema: {
          cycle: {
            type: 'object',
            description: 'The created cycle',
            properties: {
              id: { type: 'string' },
              name: { type: 'string' },
              startsAt: { type: 'string' },
              endsAt: { type: 'string' }
            }
          },
          team: {
            type: 'object',
            description: 'The team the cycle belongs to'
          }
        }
      },
      {
        id: 'cycle_started',
        name: 'Cycle Started',
        description: 'Triggers when a cycle (sprint) starts',
        eventType: 'linear:cycle_started',
        icon: 'play',
        webhookRequired: true,
        outputSchema: {
          cycle: {
            type: 'object',
            description: 'The started cycle'
          },
          team: {
            type: 'object',
            description: 'The team the cycle belongs to'
          }
        }
      },
      {
        id: 'cycle_completed',
        name: 'Cycle Completed',
        description: 'Triggers when a cycle (sprint) is completed',
        eventType: 'linear:cycle_completed',
        icon: 'check-circle',
        webhookRequired: true,
        outputSchema: {
          cycle: {
            type: 'object',
            description: 'The completed cycle'
          },
          team: {
            type: 'object',
            description: 'The team the cycle belongs to'
          }
        }
      },
      {
        id: 'label_created',
        name: 'Label Created',
        description: 'Triggers when a new label is created',
        eventType: 'linear:label_created',
        icon: 'tag',
        webhookRequired: true,
        outputSchema: {
          label: {
            type: 'object',
            description: 'The created label',
            properties: {
              id: { type: 'string' },
              name: { type: 'string' },
              color: { type: 'string' }
            }
          }
        }
      }
    ]
  };
