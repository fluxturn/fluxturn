// N8n Connector Definition
// Ported from n8n to fluxturn

import { ConnectorDefinition } from '../../shared';

export const N8N_CONNECTOR: ConnectorDefinition = {
  name: 'n8n',
  display_name: 'n8n',
  category: 'development',
  description: 'Handle events and perform actions on your n8n instance. Manage workflows, executions, credentials, and audit logs.',
  auth_type: 'api_key',
  verified: false,

  auth_fields: [
    {
      key: 'apiKey',
      label: 'API Key',
      type: 'password',
      required: true,
      placeholder: 'Enter your n8n API key',
      description: 'The API key for your n8n instance',
      helpUrl: 'https://docs.n8n.io/api/authentication/',
      helpText: 'How to get an API key'
    },
    {
      key: 'baseUrl',
      label: 'Base URL',
      type: 'string',
      required: true,
      placeholder: 'https://your-instance.app.n8n.cloud/api/v1',
      description: 'The API URL of your n8n instance',
      helpUrl: 'https://docs.n8n.io/api/api-reference/'
    }
  ],

  endpoints: {
    base_url: '{baseUrl}',
    workflows: '/workflows',
    executions: '/executions',
    credentials: '/credentials',
    audit: '/audit'
  },

  webhook_support: false,
  rate_limits: { requests_per_minute: 60 },

  supported_actions: [
    // Workflow Actions
    {
      id: 'get_workflows',
      name: 'Get Workflows',
      description: 'Get many workflows from your n8n instance',
      category: 'Workflow',
      icon: 'list',
      verified: false,
      api: {
        endpoint: '/workflows',
        method: 'GET',
        baseUrl: '{baseUrl}',
        headers: {
          'Accept': 'application/json',
          'X-N8N-API-KEY': '{apiKey}'
        },
        paramMapping: {
          limit: 'limit',
          active: 'active',
          tags: 'tags',
          name: 'name',
          projectId: 'projectId'
        }
      },
      inputSchema: {
        returnAll: {
          type: 'boolean',
          label: 'Return All',
          description: 'Whether to return all results or only up to a given limit',
          default: true,
          aiControlled: false
        },
        limit: {
          type: 'number',
          label: 'Limit',
          description: 'Max number of results to return',
          default: 100,
          min: 1,
          max: 250,
          aiControlled: false,
          displayOptions: {
            show: {
              returnAll: [false]
            }
          }
        },
        active: {
          type: 'boolean',
          label: 'Return Only Published Workflows',
          description: 'Whether to return only active/published workflows',
          default: true,
          required: false,
          aiControlled: false
        },
        tags: {
          type: 'string',
          label: 'Tags',
          description: 'Include only workflows with these tags (comma separated)',
          placeholder: 'tag1,tag2',
          required: false,
          aiControlled: false
        },
        name: {
          type: 'string',
          label: 'Name',
          description: 'Filter workflows by name',
          required: false,
          aiControlled: false
        },
        projectId: {
          type: 'string',
          label: 'Project ID',
          description: 'Filter workflows by project ID',
          required: false,
          aiControlled: false
        }
      },
      outputSchema: {
        data: {
          type: 'array',
          description: 'Array of workflow objects'
        }
      }
    },
    {
      id: 'get_workflow',
      name: 'Get Workflow',
      description: 'Get a single workflow by ID',
      category: 'Workflow',
      icon: 'file',
      verified: false,
      api: {
        endpoint: '/workflows/{workflowId}',
        method: 'GET',
        baseUrl: '{baseUrl}',
        headers: {
          'Accept': 'application/json',
          'X-N8N-API-KEY': '{apiKey}'
        }
      },
      inputSchema: {
        workflowId: {
          type: 'string',
          required: true,
          label: 'Workflow ID',
          description: 'The ID of the workflow to retrieve',
          placeholder: 'workflow-id',
          aiControlled: false
        }
      },
      outputSchema: {
        id: { type: 'string', description: 'Workflow ID' },
        name: { type: 'string', description: 'Workflow name' },
        active: { type: 'boolean', description: 'Is workflow active' },
        nodes: { type: 'array', description: 'Workflow nodes' },
        connections: { type: 'object', description: 'Workflow connections' }
      }
    },
    {
      id: 'create_workflow',
      name: 'Create Workflow',
      description: 'Create a new workflow in your n8n instance',
      category: 'Workflow',
      icon: 'plus',
      verified: false,
      api: {
        endpoint: '/workflows',
        method: 'POST',
        baseUrl: '{baseUrl}',
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json',
          'X-N8N-API-KEY': '{apiKey}'
        }
      },
      inputSchema: {
        workflowObject: {
          type: 'string',
          inputType: 'textarea',
          required: true,
          label: 'Workflow Object',
          description: 'A valid JSON object with required fields: name, nodes, connections, and settings',
          placeholder: '{\n  "name": "My workflow",\n  "nodes": [],\n  "connections": {},\n  "settings": {}\n}',
          helpUrl: 'https://docs.n8n.io/api/api-reference/#tag/workflow/paths/~1workflows/post',
          aiControlled: false
        }
      },
      outputSchema: {
        id: { type: 'string', description: 'Created workflow ID' },
        name: { type: 'string', description: 'Workflow name' }
      }
    },
    {
      id: 'update_workflow',
      name: 'Update Workflow',
      description: 'Update an existing workflow',
      category: 'Workflow',
      icon: 'edit',
      verified: false,
      api: {
        endpoint: '/workflows/{workflowId}',
        method: 'PUT',
        baseUrl: '{baseUrl}',
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json',
          'X-N8N-API-KEY': '{apiKey}'
        }
      },
      inputSchema: {
        workflowId: {
          type: 'string',
          required: true,
          label: 'Workflow ID',
          description: 'The ID of the workflow to update',
          placeholder: 'workflow-id',
          aiControlled: false
        },
        workflowObject: {
          type: 'string',
          inputType: 'textarea',
          required: true,
          label: 'Workflow Object',
          description: 'A valid JSON object with required fields: name, nodes, connections, and settings',
          placeholder: '{\n  "name": "My workflow",\n  "nodes": [],\n  "connections": {},\n  "settings": {}\n}',
          helpUrl: 'https://docs.n8n.io/api/api-reference/#tag/workflow/paths/~1workflows~1%7bid%7d/put',
          aiControlled: false
        }
      },
      outputSchema: {
        id: { type: 'string', description: 'Updated workflow ID' },
        name: { type: 'string', description: 'Workflow name' }
      }
    },
    {
      id: 'delete_workflow',
      name: 'Delete Workflow',
      description: 'Delete a workflow from your n8n instance',
      category: 'Workflow',
      icon: 'trash',
      verified: false,
      api: {
        endpoint: '/workflows/{workflowId}',
        method: 'DELETE',
        baseUrl: '{baseUrl}',
        headers: {
          'Accept': 'application/json',
          'X-N8N-API-KEY': '{apiKey}'
        }
      },
      inputSchema: {
        workflowId: {
          type: 'string',
          required: true,
          label: 'Workflow ID',
          description: 'The ID of the workflow to delete',
          placeholder: 'workflow-id',
          aiControlled: false
        }
      },
      outputSchema: {
        success: { type: 'boolean', description: 'Deletion success' }
      }
    },
    {
      id: 'activate_workflow',
      name: 'Publish Workflow',
      description: 'Activate/publish a workflow',
      category: 'Workflow',
      icon: 'play',
      verified: false,
      api: {
        endpoint: '/workflows/{workflowId}/activate',
        method: 'POST',
        baseUrl: '{baseUrl}',
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json',
          'X-N8N-API-KEY': '{apiKey}'
        },
        paramMapping: {
          versionId: 'versionId',
          name: 'name',
          description: 'description'
        }
      },
      inputSchema: {
        workflowId: {
          type: 'string',
          required: true,
          label: 'Workflow ID',
          description: 'The ID of the workflow to activate',
          placeholder: 'workflow-id',
          aiControlled: false
        },
        versionId: {
          type: 'string',
          label: 'Version ID',
          description: 'The version ID of the workflow to publish',
          required: false,
          aiControlled: false
        },
        name: {
          type: 'string',
          label: 'Name',
          description: 'Published version name (will be overwritten)',
          required: false,
          aiControlled: false
        },
        description: {
          type: 'string',
          inputType: 'textarea',
          label: 'Description',
          description: 'Published version description (will be overwritten)',
          required: false,
          aiControlled: false
        }
      },
      outputSchema: {
        success: { type: 'boolean', description: 'Activation success' },
        active: { type: 'boolean', description: 'Workflow is now active' }
      }
    },
    {
      id: 'deactivate_workflow',
      name: 'Unpublish Workflow',
      description: 'Deactivate/unpublish a workflow',
      category: 'Workflow',
      icon: 'pause',
      verified: false,
      api: {
        endpoint: '/workflows/{workflowId}/deactivate',
        method: 'POST',
        baseUrl: '{baseUrl}',
        headers: {
          'Accept': 'application/json',
          'X-N8N-API-KEY': '{apiKey}'
        }
      },
      inputSchema: {
        workflowId: {
          type: 'string',
          required: true,
          label: 'Workflow ID',
          description: 'The ID of the workflow to deactivate',
          placeholder: 'workflow-id',
          aiControlled: false
        }
      },
      outputSchema: {
        success: { type: 'boolean', description: 'Deactivation success' },
        active: { type: 'boolean', description: 'Workflow is now inactive' }
      }
    },
    // Execution Actions
    {
      id: 'get_executions',
      name: 'Get Executions',
      description: 'Get many workflow executions',
      category: 'Execution',
      icon: 'list',
      verified: false,
      api: {
        endpoint: '/executions',
        method: 'GET',
        baseUrl: '{baseUrl}',
        headers: {
          'Accept': 'application/json',
          'X-N8N-API-KEY': '{apiKey}'
        },
        paramMapping: {
          limit: 'limit',
          workflowId: 'workflowId',
          status: 'status'
        }
      },
      inputSchema: {
        limit: {
          type: 'number',
          label: 'Limit',
          description: 'Max number of results to return',
          default: 100,
          min: 1,
          max: 250,
          aiControlled: false
        },
        workflowId: {
          type: 'string',
          label: 'Workflow ID',
          description: 'Filter executions by workflow ID',
          required: false,
          aiControlled: false
        },
        status: {
          type: 'select',
          label: 'Status',
          description: 'Filter by execution status',
          required: false,
          aiControlled: false,
          options: [
            { label: 'All', value: '' },
            { label: 'Success', value: 'success' },
            { label: 'Error', value: 'error' },
            { label: 'Running', value: 'running' },
            { label: 'Waiting', value: 'waiting' }
          ]
        }
      },
      outputSchema: {
        data: {
          type: 'array',
          description: 'Array of execution objects'
        }
      }
    },
    {
      id: 'get_execution',
      name: 'Get Execution',
      description: 'Get a single workflow execution by ID',
      category: 'Execution',
      icon: 'file',
      verified: false,
      api: {
        endpoint: '/executions/{executionId}',
        method: 'GET',
        baseUrl: '{baseUrl}',
        headers: {
          'Accept': 'application/json',
          'X-N8N-API-KEY': '{apiKey}'
        }
      },
      inputSchema: {
        executionId: {
          type: 'string',
          required: true,
          label: 'Execution ID',
          description: 'The ID of the execution to retrieve',
          placeholder: 'execution-id',
          aiControlled: false
        }
      },
      outputSchema: {
        id: { type: 'string', description: 'Execution ID' },
        workflowId: { type: 'string', description: 'Workflow ID' },
        status: { type: 'string', description: 'Execution status' },
        startedAt: { type: 'string', description: 'Start time' },
        stoppedAt: { type: 'string', description: 'End time' }
      }
    },
    {
      id: 'delete_execution',
      name: 'Delete Execution',
      description: 'Delete a workflow execution',
      category: 'Execution',
      icon: 'trash',
      verified: false,
      api: {
        endpoint: '/executions/{executionId}',
        method: 'DELETE',
        baseUrl: '{baseUrl}',
        headers: {
          'Accept': 'application/json',
          'X-N8N-API-KEY': '{apiKey}'
        }
      },
      inputSchema: {
        executionId: {
          type: 'string',
          required: true,
          label: 'Execution ID',
          description: 'The ID of the execution to delete',
          placeholder: 'execution-id',
          aiControlled: false
        }
      },
      outputSchema: {
        success: { type: 'boolean', description: 'Deletion success' }
      }
    }
  ],

  supported_triggers: []
};
