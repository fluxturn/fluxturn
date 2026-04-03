// Elasticsearch Connector Definition
// Converted from n8n Elasticsearch node

import { ConnectorDefinition } from '../../shared';

export const ELASTICSEARCH_CONNECTOR: ConnectorDefinition = {
  name: 'elasticsearch',
  display_name: 'Elasticsearch',
  category: 'database',
  description: 'Consume the Elasticsearch API - index and search documents',
  auth_type: 'basic_auth',
  complexity: 'Advanced',
  verified: true,

  auth_fields: [
    {
      key: 'baseUrl',
      label: 'Base URL',
      type: 'string',
      required: true,
      placeholder: 'https://localhost:9200',
      description: 'Elasticsearch base URL',
      inputType: 'url'
    },
    {
      key: 'username',
      label: 'Username',
      type: 'string',
      required: false,
      description: 'Elasticsearch username (if authentication is enabled)'
    },
    {
      key: 'password',
      label: 'Password',
      type: 'password',
      required: false,
      description: 'Elasticsearch password (if authentication is enabled)'
    },
    {
      key: 'ignoreSSLIssues',
      label: 'Ignore SSL Issues',
      type: 'boolean',
      required: false,
      default: false,
      description: 'Whether to connect even if SSL certificate validation fails'
    }
  ],

  endpoints: {
    base_url: '{baseUrl}'
  },

  webhook_support: false,
  rate_limits: {},
  sandbox_available: false,

  supported_actions: [
    // Document Operations
    {
      id: 'document_create',
      name: 'Create Document',
      description: 'Create a document in an index',
      category: 'Document',
      icon: 'file-plus',
      verified: false,
      api: {
        endpoint: '/{indexId}/_doc',
        method: 'POST',
        baseUrl: '{baseUrl}',
        headers: {},
        paramMapping: {}
      },
      inputSchema: {
        indexId: {
          type: 'string',
          required: true,
          label: 'Index ID',
          placeholder: 'my-index',
          description: 'ID of the index',
          inputType: 'text',
          aiControlled: false
        },
        dataToSend: {
          type: 'select',
          required: false,
          label: 'Data to Send',
          description: 'How to send data',
          options: [
            { label: 'Auto-map Input Data', value: 'autoMapInputData' },
            { label: 'Define Below', value: 'defineBelow' }
          ],
          default: 'autoMapInputData',
          aiControlled: false
        },
        documentId: {
          type: 'string',
          required: false,
          label: 'Document ID',
          description: 'Optional document ID (if not provided, Elasticsearch generates one)',
          inputType: 'text',
          aiControlled: false
        },
        fieldsToSend: {
          type: 'string',
          required: false,
          label: 'Fields to Send',
          description: 'JSON object with fields to send',
          inputType: 'textarea',
          aiControlled: false
        },
        bulkOperation: {
          type: 'boolean',
          required: false,
          label: 'Bulk Operation',
          description: 'Enable bulk operations for better performance',
          default: false,
          aiControlled: false
        }
      },
      outputSchema: {
        _id: {
          type: 'string',
          description: 'Document ID'
        },
        _index: {
          type: 'string',
          description: 'Index name'
        },
        result: {
          type: 'string',
          description: 'Operation result (created, updated)'
        }
      }
    },
    {
      id: 'document_get',
      name: 'Get Document',
      description: 'Get a single document by ID',
      category: 'Document',
      icon: 'file',
      verified: false,
      api: {
        endpoint: '/{indexId}/_doc/{documentId}',
        method: 'GET',
        baseUrl: '{baseUrl}',
        headers: {},
        paramMapping: {}
      },
      inputSchema: {
        indexId: {
          type: 'string',
          required: true,
          label: 'Index ID',
          placeholder: 'my-index',
          description: 'ID of the index',
          inputType: 'text',
          aiControlled: false
        },
        documentId: {
          type: 'string',
          required: true,
          label: 'Document ID',
          description: 'ID of the document to retrieve',
          inputType: 'text',
          aiControlled: false
        },
        simple: {
          type: 'boolean',
          required: false,
          label: 'Simple',
          description: 'Whether to return a simplified version of the response',
          default: false,
          aiControlled: false
        }
      },
      outputSchema: {
        _id: {
          type: 'string',
          description: 'Document ID'
        },
        _source: {
          type: 'object',
          description: 'Document source data'
        }
      }
    },
    {
      id: 'document_get_all',
      name: 'Search Documents',
      description: 'Search for documents in an index',
      category: 'Document',
      icon: 'search',
      verified: false,
      api: {
        endpoint: '/{indexId}/_search',
        method: 'POST',
        baseUrl: '{baseUrl}',
        headers: {},
        paramMapping: {}
      },
      inputSchema: {
        indexId: {
          type: 'string',
          required: true,
          label: 'Index ID',
          placeholder: 'my-index',
          description: 'ID of the index to search',
          inputType: 'text',
          aiControlled: false
        },
        returnAll: {
          type: 'boolean',
          required: false,
          label: 'Return All',
          description: 'Whether to return all results',
          default: false,
          aiControlled: false
        },
        limit: {
          type: 'number',
          required: false,
          label: 'Limit',
          description: 'Max number of results to return',
          default: 10,
          min: 1,
          max: 10000,
          aiControlled: false
        },
        query: {
          type: 'string',
          required: false,
          label: 'Query',
          description: 'Elasticsearch query DSL as JSON',
          inputType: 'textarea',
          placeholder: '{"match_all": {}}',
          aiControlled: false
        },
        simple: {
          type: 'boolean',
          required: false,
          label: 'Simple',
          description: 'Whether to return a simplified version of the response',
          default: false,
          aiControlled: false
        }
      },
      outputSchema: {
        hits: {
          type: 'array',
          description: 'Array of matching documents'
        }
      }
    },
    {
      id: 'document_update',
      name: 'Update Document',
      description: 'Update a document in an index',
      category: 'Document',
      icon: 'edit',
      verified: false,
      api: {
        endpoint: '/{indexId}/_update/{documentId}',
        method: 'POST',
        baseUrl: '{baseUrl}',
        headers: {},
        paramMapping: {}
      },
      inputSchema: {
        indexId: {
          type: 'string',
          required: true,
          label: 'Index ID',
          placeholder: 'my-index',
          description: 'ID of the index',
          inputType: 'text',
          aiControlled: false
        },
        documentId: {
          type: 'string',
          required: true,
          label: 'Document ID',
          description: 'ID of the document to update',
          inputType: 'text',
          aiControlled: false
        },
        dataToSend: {
          type: 'select',
          required: false,
          label: 'Data to Send',
          description: 'How to send data',
          options: [
            { label: 'Auto-map Input Data', value: 'autoMapInputData' },
            { label: 'Define Below', value: 'defineBelow' }
          ],
          default: 'autoMapInputData',
          aiControlled: false
        },
        fieldsToSend: {
          type: 'string',
          required: false,
          label: 'Fields to Send',
          description: 'JSON object with fields to update',
          inputType: 'textarea',
          aiControlled: false
        },
        bulkOperation: {
          type: 'boolean',
          required: false,
          label: 'Bulk Operation',
          description: 'Enable bulk operations for better performance',
          default: false,
          aiControlled: false
        }
      },
      outputSchema: {
        _id: {
          type: 'string',
          description: 'Document ID'
        },
        result: {
          type: 'string',
          description: 'Operation result (updated, noop)'
        }
      }
    },
    {
      id: 'document_delete',
      name: 'Delete Document',
      description: 'Delete a document from an index',
      category: 'Document',
      icon: 'trash',
      verified: false,
      api: {
        endpoint: '/{indexId}/_doc/{documentId}',
        method: 'DELETE',
        baseUrl: '{baseUrl}',
        headers: {},
        paramMapping: {}
      },
      inputSchema: {
        indexId: {
          type: 'string',
          required: true,
          label: 'Index ID',
          placeholder: 'my-index',
          description: 'ID of the index',
          inputType: 'text',
          aiControlled: false
        },
        documentId: {
          type: 'string',
          required: true,
          label: 'Document ID',
          description: 'ID of the document to delete',
          inputType: 'text',
          aiControlled: false
        },
        bulkOperation: {
          type: 'boolean',
          required: false,
          label: 'Bulk Operation',
          description: 'Enable bulk operations for better performance',
          default: false,
          aiControlled: false
        }
      },
      outputSchema: {
        result: {
          type: 'string',
          description: 'Operation result (deleted)'
        }
      }
    },
    // Index Operations
    {
      id: 'index_create',
      name: 'Create Index',
      description: 'Create a new index',
      category: 'Index',
      icon: 'database',
      verified: false,
      api: {
        endpoint: '/{indexId}',
        method: 'PUT',
        baseUrl: '{baseUrl}',
        headers: {},
        paramMapping: {}
      },
      inputSchema: {
        indexId: {
          type: 'string',
          required: true,
          label: 'Index ID',
          placeholder: 'my-index',
          description: 'ID of the index to create',
          inputType: 'text',
          aiControlled: false
        },
        mappings: {
          type: 'string',
          required: false,
          label: 'Mappings',
          description: 'Index mappings as JSON',
          inputType: 'textarea',
          aiControlled: false
        },
        settings: {
          type: 'string',
          required: false,
          label: 'Settings',
          description: 'Index settings as JSON',
          inputType: 'textarea',
          aiControlled: false
        },
        aliases: {
          type: 'string',
          required: false,
          label: 'Aliases',
          description: 'Index aliases as JSON',
          inputType: 'textarea',
          aiControlled: false
        }
      },
      outputSchema: {
        acknowledged: {
          type: 'boolean',
          description: 'Whether the operation was acknowledged'
        },
        id: {
          type: 'string',
          description: 'Index ID'
        }
      }
    },
    {
      id: 'index_get',
      name: 'Get Index',
      description: 'Get index configuration',
      category: 'Index',
      icon: 'info',
      verified: false,
      api: {
        endpoint: '/{indexId}',
        method: 'GET',
        baseUrl: '{baseUrl}',
        headers: {},
        paramMapping: {}
      },
      inputSchema: {
        indexId: {
          type: 'string',
          required: true,
          label: 'Index ID',
          placeholder: 'my-index',
          description: 'ID of the index',
          inputType: 'text',
          aiControlled: false
        }
      },
      outputSchema: {
        id: {
          type: 'string',
          description: 'Index ID'
        },
        mappings: {
          type: 'object',
          description: 'Index mappings'
        },
        settings: {
          type: 'object',
          description: 'Index settings'
        }
      }
    },
    {
      id: 'index_get_all',
      name: 'List All Indices',
      description: 'Get all indices',
      category: 'Index',
      icon: 'list',
      verified: false,
      api: {
        endpoint: '/_aliases',
        method: 'GET',
        baseUrl: '{baseUrl}',
        headers: {},
        paramMapping: {}
      },
      inputSchema: {
        returnAll: {
          type: 'boolean',
          required: false,
          label: 'Return All',
          description: 'Whether to return all results',
          default: false,
          aiControlled: false
        },
        limit: {
          type: 'number',
          required: false,
          label: 'Limit',
          description: 'Max number of results to return',
          default: 10,
          min: 1,
          aiControlled: false
        }
      },
      outputSchema: {
        indices: {
          type: 'array',
          description: 'Array of index names'
        }
      }
    },
    {
      id: 'index_delete',
      name: 'Delete Index',
      description: 'Delete an index',
      category: 'Index',
      icon: 'trash',
      verified: false,
      api: {
        endpoint: '/{indexId}',
        method: 'DELETE',
        baseUrl: '{baseUrl}',
        headers: {},
        paramMapping: {}
      },
      inputSchema: {
        indexId: {
          type: 'string',
          required: true,
          label: 'Index ID',
          placeholder: 'my-index',
          description: 'ID of the index to delete',
          inputType: 'text',
          aiControlled: false
        }
      },
      outputSchema: {
        acknowledged: {
          type: 'boolean',
          description: 'Whether the deletion was acknowledged'
        }
      }
    }
  ],

  supported_triggers: []
};
