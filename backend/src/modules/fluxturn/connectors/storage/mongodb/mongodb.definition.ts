// MongoDB Connector Definition
// Synced with mongodb.connector.ts implementation

import { ConnectorDefinition } from '../../shared';

export const MONGODB_CONNECTOR: ConnectorDefinition = {
  name: 'mongodb',
  display_name: 'MongoDB',
  category: 'database',
  description: 'MongoDB document database operations and management',
  auth_type: 'custom',
  verified: true,

  auth_fields: [
    {
      key: 'connectionString',
      label: 'Connection String',
      type: 'password',
      required: true,
      placeholder: 'mongodb+srv://user:password@cluster.mongodb.net/database',
      description: 'MongoDB connection string (supports Atlas and self-hosted)'
    },
    {
      key: 'database',
      label: 'Database Name',
      type: 'string',
      required: false,
      placeholder: 'myDatabase',
      description: 'Default database to use (optional if specified in connection string)'
    }
  ],

  endpoints: {
    base_url: 'mongodb://'
  },

  webhook_support: false,
  rate_limits: { requests_per_second: 50, requests_per_minute: 3000 },
  sandbox_available: false,

  supported_actions: [
    {
      id: 'insert_document',
      name: 'Insert Document',
      description: 'Insert a document into a collection',
      category: 'Documents',
      icon: 'plus',
      inputSchema: {
        collection: {
          type: 'string',
          required: true,
          label: 'Collection',
          placeholder: 'users',
          description: 'Collection name to insert into',
          aiControlled: false
        },
        document: {
          type: 'object',
          required: true,
          label: 'Document',
          description: 'Document to insert (JSON object)',
          aiControlled: false
        },
        options: {
          type: 'object',
          required: false,
          label: 'Options',
          description: 'Insert options (e.g., bypassDocumentValidation)',
          aiControlled: false
        }
      },
      outputSchema: {
        insertedId: { type: 'string', description: 'ID of the inserted document' },
        acknowledged: { type: 'boolean', description: 'Whether the operation was acknowledged' }
      }
    },
    {
      id: 'find_documents',
      name: 'Find Documents',
      description: 'Find documents in a collection with optional filtering',
      category: 'Documents',
      icon: 'search',
      inputSchema: {
        collection: {
          type: 'string',
          required: true,
          label: 'Collection',
          placeholder: 'users',
          description: 'Collection name to search',
          aiControlled: false
        },
        filter: {
          type: 'object',
          required: false,
          label: 'Filter',
          description: 'MongoDB query filter (e.g., {"age": {"$gt": 18}})',
          aiControlled: false
        },
        options: {
          type: 'object',
          required: false,
          label: 'Options',
          description: 'Query options: limit, skip, sort, projection',
          aiControlled: false
        }
      },
      outputSchema: {
        documents: { type: 'array', description: 'Array of matching documents' },
        totalCount: { type: 'number', description: 'Total number of matching documents' },
        hasMore: { type: 'boolean', description: 'Whether more results are available' }
      }
    },
    {
      id: 'update_document',
      name: 'Update Document',
      description: 'Update one or more documents in a collection',
      category: 'Documents',
      icon: 'edit',
      inputSchema: {
        collection: {
          type: 'string',
          required: true,
          label: 'Collection',
          placeholder: 'users',
          description: 'Collection name',
          aiControlled: false
        },
        filter: {
          type: 'object',
          required: true,
          label: 'Filter',
          description: 'Query to match documents to update',
          aiControlled: false
        },
        update: {
          type: 'object',
          required: true,
          label: 'Update',
          description: 'Update operations (e.g., {"$set": {"name": "John"}})',
          aiControlled: false
        },
        options: {
          type: 'object',
          required: false,
          label: 'Options',
          description: 'Options: upsert, updateMany, arrayFilters',
          aiControlled: false
        }
      },
      outputSchema: {
        matchedCount: { type: 'number', description: 'Number of documents matched' },
        modifiedCount: { type: 'number', description: 'Number of documents modified' },
        upsertedId: { type: 'string', description: 'ID of upserted document (if any)' }
      }
    },
    {
      id: 'delete_document',
      name: 'Delete Document',
      description: 'Delete one or more documents from a collection',
      category: 'Documents',
      icon: 'trash',
      inputSchema: {
        collection: {
          type: 'string',
          required: true,
          label: 'Collection',
          placeholder: 'users',
          description: 'Collection name',
          aiControlled: false
        },
        filter: {
          type: 'object',
          required: true,
          label: 'Filter',
          description: 'Query to match documents to delete',
          aiControlled: false
        },
        options: {
          type: 'object',
          required: false,
          label: 'Options',
          description: 'Options: deleteMany (boolean)',
          aiControlled: false
        }
      },
      outputSchema: {
        deletedCount: { type: 'number', description: 'Number of deleted documents' },
        acknowledged: { type: 'boolean', description: 'Whether the operation was acknowledged' }
      }
    },
    {
      id: 'aggregate',
      name: 'Aggregate',
      description: 'Execute an aggregation pipeline',
      category: 'Advanced',
      icon: 'layers',
      inputSchema: {
        collection: {
          type: 'string',
          required: true,
          label: 'Collection',
          placeholder: 'orders',
          description: 'Collection name',
          aiControlled: false
        },
        pipeline: {
          type: 'array',
          required: true,
          label: 'Pipeline',
          description: 'Array of aggregation pipeline stages',
          aiControlled: false
        },
        options: {
          type: 'object',
          required: false,
          label: 'Options',
          description: 'Options: allowDiskUse, maxTimeMS, batchSize',
          aiControlled: false
        }
      },
      outputSchema: {
        results: { type: 'array', description: 'Aggregation results' },
        resultCount: { type: 'number', description: 'Number of results returned' }
      }
    },
    {
      id: 'bulk_write',
      name: 'Bulk Write',
      description: 'Execute multiple write operations in a single request',
      category: 'Advanced',
      icon: 'database',
      inputSchema: {
        collection: {
          type: 'string',
          required: true,
          label: 'Collection',
          placeholder: 'users',
          description: 'Collection name',
          aiControlled: false
        },
        operations: {
          type: 'array',
          required: true,
          label: 'Operations',
          description: 'Array of operations: insertOne, updateOne, updateMany, deleteOne, deleteMany, replaceOne',
          aiControlled: false
        },
        options: {
          type: 'object',
          required: false,
          label: 'Options',
          description: 'Options: ordered (default true), bypassDocumentValidation',
          aiControlled: false
        }
      },
      outputSchema: {
        insertedCount: { type: 'number', description: 'Number of inserted documents' },
        matchedCount: { type: 'number', description: 'Number of matched documents' },
        modifiedCount: { type: 'number', description: 'Number of modified documents' },
        deletedCount: { type: 'number', description: 'Number of deleted documents' },
        upsertedCount: { type: 'number', description: 'Number of upserted documents' }
      }
    },
    {
      id: 'create_search_index',
      name: 'Create Search Index',
      description: 'Create a vector or text search index on a collection',
      category: 'Search Indexes',
      icon: 'search-plus',
      inputSchema: {
        collection: {
          type: 'string',
          required: true,
          label: 'Collection',
          placeholder: 'products',
          description: 'Collection name to create the index on',
          aiControlled: false
        },
        indexName: {
          type: 'string',
          required: true,
          label: 'Index Name',
          placeholder: 'vector_search_index',
          description: 'Name for the search index',
          aiControlled: false
        },
        indexType: {
          type: 'select',
          required: true,
          label: 'Index Type',
          default: 'search',
          options: [
            { label: 'Full-Text Search', value: 'search' },
            { label: 'Vector Search', value: 'vectorSearch' }
          ],
          description: 'Type of search index to create',
          aiControlled: false
        },
        definition: {
          type: 'object',
          required: true,
          label: 'Index Definition',
          description: 'JSON definition for the search index (mappings, fields, etc.)',
          aiControlled: false
        }
      },
      outputSchema: {
        indexName: { type: 'string', description: 'Name of the created index' },
        acknowledged: { type: 'boolean', description: 'Whether the operation was acknowledged' }
      }
    },
    {
      id: 'update_search_index',
      name: 'Update Search Index',
      description: 'Update an existing search index definition',
      category: 'Search Indexes',
      icon: 'edit-3',
      inputSchema: {
        collection: {
          type: 'string',
          required: true,
          label: 'Collection',
          placeholder: 'products',
          description: 'Collection name containing the index',
          aiControlled: false
        },
        indexName: {
          type: 'string',
          required: true,
          label: 'Index Name',
          placeholder: 'vector_search_index',
          description: 'Name of the search index to update',
          aiControlled: false
        },
        definition: {
          type: 'object',
          required: true,
          label: 'New Definition',
          description: 'Updated JSON definition for the search index',
          aiControlled: false
        }
      },
      outputSchema: {
        indexName: { type: 'string', description: 'Name of the updated index' },
        acknowledged: { type: 'boolean', description: 'Whether the operation was acknowledged' }
      }
    },
    {
      id: 'drop_search_index',
      name: 'Drop Search Index',
      description: 'Delete a search index from a collection',
      category: 'Search Indexes',
      icon: 'trash-2',
      inputSchema: {
        collection: {
          type: 'string',
          required: true,
          label: 'Collection',
          placeholder: 'products',
          description: 'Collection name containing the index',
          aiControlled: false
        },
        indexName: {
          type: 'string',
          required: true,
          label: 'Index Name',
          placeholder: 'vector_search_index',
          description: 'Name of the search index to delete',
          aiControlled: false
        }
      },
      outputSchema: {
        indexName: { type: 'string', description: 'Name of the deleted index' },
        dropped: { type: 'boolean', description: 'Whether the index was successfully dropped' }
      }
    },
    {
      id: 'list_search_indexes',
      name: 'List Search Indexes',
      description: 'List all search indexes on a collection',
      category: 'Search Indexes',
      icon: 'list',
      inputSchema: {
        collection: {
          type: 'string',
          required: true,
          label: 'Collection',
          placeholder: 'products',
          description: 'Collection name to list indexes for',
          aiControlled: false
        },
        indexName: {
          type: 'string',
          required: false,
          label: 'Index Name Filter',
          placeholder: 'vector_search_index',
          description: 'Optional: Filter by specific index name',
          aiControlled: false
        }
      },
      outputSchema: {
        indexes: { type: 'array', description: 'Array of search index definitions' },
        count: { type: 'number', description: 'Number of indexes found' }
      }
    }
  ],

  supported_triggers: [
    {
      id: 'document_inserted',
      name: 'Document Inserted',
      description: 'Triggered when a document is inserted into a collection',
      eventType: 'change_stream',
      icon: 'plus-circle',
      webhookRequired: false,
      inputSchema: {
        collection: {
          type: 'string',
          required: true,
          label: 'Collection',
          description: 'Collection to watch for inserts'
        }
      },
      outputSchema: {
        collection: { type: 'string', description: 'Collection name' },
        document: { type: 'object', description: 'The inserted document' },
        insertedId: { type: 'string', description: 'ID of the inserted document' }
      }
    },
    {
      id: 'document_updated',
      name: 'Document Updated',
      description: 'Triggered when a document is updated in a collection',
      eventType: 'change_stream',
      icon: 'edit-2',
      webhookRequired: false,
      inputSchema: {
        collection: {
          type: 'string',
          required: true,
          label: 'Collection',
          description: 'Collection to watch for updates'
        }
      },
      outputSchema: {
        collection: { type: 'string', description: 'Collection name' },
        documentId: { type: 'string', description: 'ID of the updated document' },
        updateDescription: { type: 'object', description: 'Description of the update' }
      }
    }
  ]
};
