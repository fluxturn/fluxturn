import { Request } from 'express';
import { Injectable } from '@nestjs/common';
import { BaseConnector } from '../../base/base.connector';
import { IDataConnector } from '../../base/connector.interface';
import {
  ConnectorMetadata,
  ConnectorType,
  ConnectorCategory,
  ConnectorRequest,
  ConnectorResponse,
  AuthType,
  PaginatedRequest,
  ConnectorAction,
  ConnectorTrigger,
  BulkOperation,
  BulkOperationResult,
  ConnectorError
} from '../../types';
import { AuthUtils } from '../../utils/auth.utils';
import { ApiUtils } from '../../utils/api.utils';
import { MongoClient, Db, Collection, MongoClientOptions, ClientSession } from 'mongodb';

interface MongoConfig {
  connectionString: string;
  database?: string;
  options?: MongoClientOptions;
}

interface AggregationPipeline {
  pipeline: any[];
  options?: {
    allowDiskUse?: boolean;
    maxTimeMS?: number;
    batchSize?: number;
    comment?: string;
  };
}

interface IndexSpec {
  keys: Record<string, 1 | -1 | 'text' | '2d' | '2dsphere'>;
  options?: {
    unique?: boolean;
    sparse?: boolean;
    partialFilterExpression?: Record<string, any>;
    expireAfterSeconds?: number;
    name?: string;
    background?: boolean;
  };
}

interface MongoBulkWriteOperation {
  insertOne?: { document: any };
  updateOne?: { filter: any; update: any; upsert?: boolean };
  updateMany?: { filter: any; update: any; upsert?: boolean };
  deleteOne?: { filter: any };
  deleteMany?: { filter: any };
  replaceOne?: { filter: any; replacement: any; upsert?: boolean };
}

@Injectable()
export class MongoDBConnector extends BaseConnector implements IDataConnector {
  private client: MongoClient;
  private db: Db;
  private isConnected = false;
  private connectionPool: Map<string, MongoClient> = new Map();

  constructor(
    private readonly authUtils: AuthUtils,
    private readonly apiUtils: ApiUtils
  ) {
    super();
  }

  getMetadata(): ConnectorMetadata {
    return {
      name: 'MongoDB',
      description: 'MongoDB document database operations and management',
      version: '1.0.0',
      category: ConnectorCategory.DATABASE,
      type: ConnectorType.MONGODB,
      logoUrl: 'https://www.mongodb.com/assets/images/global/favicon.ico',
      documentationUrl: 'https://docs.mongodb.com/',
      authType: AuthType.CUSTOM,
      actions: this.getActions(),
      triggers: this.getTriggers(),
      rateLimit: {
        requestsPerSecond: 50,
        requestsPerMinute: 3000,
        requestsPerDay: 4320000
      },
      webhookSupport: false
    };
  }

  protected async initializeConnection(): Promise<void> {
    try {
      const mongoConfig = this.config.credentials as MongoConfig;

      // Validate connection string
      if (!mongoConfig.connectionString) {
        throw new Error('Connection string is required');
      }

      // Log connection attempt (hide password)
      const sanitizedConnectionString = mongoConfig.connectionString.replace(
        /:([^:@]+)@/,
        ':****@'
      );
      this.logger.log(`Attempting to connect to MongoDB: ${sanitizedConnectionString}`);

      // Check if connection string contains SSL parameters
      const hasSSLInConnectionString = mongoConfig.connectionString.includes('ssl=true') ||
                                       mongoConfig.connectionString.includes('tls=true');

      const options: MongoClientOptions = {
        maxPoolSize: 10,
        minPoolSize: 2,
        maxIdleTimeMS: 30000,
        serverSelectionTimeoutMS: 15000, // Increased from 5s to 15s
        socketTimeoutMS: 45000,
        connectTimeoutMS: 15000, // Added connection timeout
        family: 4, // Use IPv4, skip trying IPv6
        retryWrites: true,
        retryReads: true,
        // SSL/TLS Configuration for MongoDB Atlas and secure connections
        tls: hasSSLInConnectionString || mongoConfig.connectionString.includes('mongodb+srv://') || mongoConfig.connectionString.includes('.mongodb.net'),
        tlsAllowInvalidCertificates: false, // Set to true only for development with self-signed certs
        tlsAllowInvalidHostnames: false,
        ...mongoConfig.options
      };

      this.client = new MongoClient(mongoConfig.connectionString, options);
      await this.client.connect();

      // MongoDB creates databases automatically on first write
      // So we just set the database reference, no need to explicitly create it
      const databaseName = mongoConfig.database || 'fluxturn_db';
      this.db = this.client.db(databaseName);
      this.isConnected = true;

      this.logger.log(`MongoDB connector initialized successfully. Database: ${databaseName}`);

      // List existing databases to verify connection
      const adminDb = this.client.db('admin');
      const dbList = await adminDb.admin().listDatabases();
      this.logger.log(`Available databases: ${dbList.databases.map(db => db.name).join(', ')}`);

    } catch (error) {
      this.logger.error(`MongoDB connection error: ${error.message}`);
      this.logger.error(`Error stack: ${error.stack}`);

      // Provide helpful error messages based on error type
      if (error.message.includes('Server selection timed out')) {
        throw new Error(
          `MongoDB connection timed out. Please verify:
          1. MongoDB server is running
          2. Connection string is correct
          3. Network/firewall allows connection
          4. MongoDB is accessible from this host
          Original error: ${error.message}`
        );
      } else if (error.message.includes('Authentication failed')) {
        throw new Error(`MongoDB authentication failed. Please check your credentials. Original error: ${error.message}`);
      } else if (error.message.includes('SSL') || error.message.includes('TLS') || error.message.includes('ssl') || error.message.includes('tls')) {
        throw new Error(
          `MongoDB SSL/TLS connection failed. This may be due to:
          1. Server requires SSL but connection string missing ssl=true or tls=true
          2. Certificate validation issues (self-signed certificates)
          3. OpenSSL version incompatibility
          4. TLS version mismatch

          Solutions:
          - For MongoDB Atlas: Use mongodb+srv:// connection string
          - For self-signed certificates: Add tlsAllowInvalidCertificates=true to connection string
          - For hostname mismatch: Add tlsAllowInvalidHostnames=true to connection string

          Original error: ${error.message}`
        );
      } else {
        throw new Error(`MongoDB connection failed: ${error.message}`);
      }
    }
  }

  protected async performConnectionTest(): Promise<boolean> {
    try {
      if (!this.isConnected || !this.client) {
        return false;
      }
      await this.client.db('admin').command({ ping: 1 });
      return true;
    } catch (error) {
      return false;
    }
  }

  protected async performHealthCheck(): Promise<void> {
    try {
      if (!this.isConnected || !this.client) {
        throw new Error('MongoDB client not connected');
      }
      
      const result = await this.client.db('admin').command({ ping: 1 });
      if (!result.ok) {
        throw new Error('MongoDB ping failed');
      }
    } catch (error) {
      throw new Error(`MongoDB health check failed: ${error.message}`);
    }
  }

  protected async performRequest(request: ConnectorRequest): Promise<any> {
    // MongoDB operations are handled directly through the driver
    throw new Error('Direct request execution not supported for MongoDB. Use specific methods.');
  }

  protected async performAction(actionId: string, input: any): Promise<any> {
    switch (actionId) {
      case 'insert_document':
        return this.insertDocument(input.collection, input.document);
      case 'find_documents':
        return this.findDocuments(input.collection, input.filter, input.options);
      case 'update_document':
        return this.updateDocument(input.collection, input.filter, input.update, input.options);
      case 'delete_document':
        return this.deleteDocument(input.collection, input.filter);
      case 'aggregate':
        return this.aggregate(input.collection, input.pipeline, input.options);
      case 'create_index':
        return this.createIndex(input.collection, input.indexSpec);
      case 'bulk_write':
        return this.bulkWrite(input.collection, input.operations, input.options);
      case 'create_collection':
        return this.createCollection(input.collection, input.options);
      case 'drop_collection':
        return this.dropCollection(input.collection);
      case 'create_search_index':
        return this.createSearchIndex(input.collection, input.indexName, input.indexType, input.definition);
      case 'update_search_index':
        return this.updateSearchIndex(input.collection, input.indexName, input.definition);
      case 'drop_search_index':
        return this.dropSearchIndex(input.collection, input.indexName);
      case 'list_search_indexes':
        return this.listSearchIndexes(input.collection, input.indexName);
      default:
        throw new Error(`Unknown action: ${actionId}`);
    }
  }

  protected async cleanup(): Promise<void> {
    try {
      if (this.client && this.isConnected) {
        await this.client.close();
        this.isConnected = false;
      }
      
      // Close all pooled connections
      for (const [key, client] of this.connectionPool) {
        try {
          await client.close();
        } catch (error) {
          this.logger.warn(`Failed to close pooled connection ${key}:`, error);
        }
      }
      this.connectionPool.clear();
      
      this.logger.log('MongoDB connector cleanup completed');
    } catch (error) {
      this.logger.error('Error during MongoDB cleanup:', error);
    }
  }

  // Core MongoDB methods
  async insertDocument(collectionName: string, document: any, options?: any): Promise<ConnectorResponse> {
    try {
      this.logger.log(`[MongoDB Insert] Starting insert operation...`);
      this.logger.log(`[MongoDB Insert] Collection: ${collectionName}`);
      this.logger.log(`[MongoDB Insert] Database: ${this.db.databaseName}`);
      this.logger.log(`[MongoDB Insert] Document type: ${typeof document}`);
      this.logger.log(`[MongoDB Insert] Document value: ${JSON.stringify(document)}`);

      // Parse document if it's a string
      let parsedDocument = document;
      if (typeof document === 'string') {
        this.logger.log(`[MongoDB Insert] Parsing string document...`);
        try {
          parsedDocument = JSON.parse(document);
          this.logger.log(`[MongoDB Insert] Parsed successfully: ${JSON.stringify(parsedDocument)}`);
        } catch (parseError) {
          this.logger.error(`[MongoDB Insert] JSON parse failed: ${parseError.message}`);
          return {
            success: false,
            error: {
              code: 'INVALID_JSON',
              message: `Failed to parse document JSON: ${parseError.message}. Expected valid JSON object.`,
              details: { originalDocument: document }
            }
          };
        }
      }

      // Validate that parsedDocument is an object
      if (typeof parsedDocument !== 'object' || parsedDocument === null || Array.isArray(parsedDocument)) {
        this.logger.error(`[MongoDB Insert] Invalid document type: ${typeof parsedDocument}`);
        return {
          success: false,
          error: {
            code: 'INVALID_DOCUMENT',
            message: 'Document must be a valid JSON object',
            details: { receivedType: typeof parsedDocument }
          }
        };
      }

      this.logger.log(`[MongoDB Insert] Getting collection: ${collectionName}`);
      const collection = this.db.collection(collectionName);

      this.logger.log(`[MongoDB Insert] Calling insertOne with document: ${JSON.stringify(parsedDocument)}`);
      const result = await collection.insertOne(parsedDocument, options);

      this.logger.log(`[MongoDB Insert] Insert successful!`);
      this.logger.log(`[MongoDB Insert] Inserted ID: ${result.insertedId}`);
      this.logger.log(`[MongoDB Insert] Acknowledged: ${result.acknowledged}`);

      return {
        success: true,
        data: {
          insertedId: result.insertedId,
          acknowledged: result.acknowledged
        },
        metadata: {
          timestamp: new Date()
        } as any
      };
    } catch (error) {
      return this.handleError(error as any, 'Failed to insert document');
    }
  }

  async findDocuments(collectionName: string, filter: any = {}, options?: any): Promise<ConnectorResponse> {
    try {
      const collection = this.db.collection(collectionName);
      
      const findOptions = {
        limit: options?.limit || 100,
        skip: options?.skip || 0,
        sort: options?.sort,
        projection: options?.projection,
        maxTimeMS: options?.maxTimeMS || 30000
      };

      const cursor = collection.find(filter, findOptions);
      const documents = await cursor.toArray();
      const totalCount = await collection.countDocuments(filter);

      return {
        success: true,
        data: {
          documents,
          totalCount,
          hasMore: (options?.skip || 0) + documents.length < totalCount
        },
        metadata: {
          timestamp: new Date()
        } as any
      };
    } catch (error) {
      return this.handleError(error as any, 'Failed to find documents');
    }
  }

  async updateDocument(collectionName: string, filter: any, update: any, options?: any): Promise<ConnectorResponse> {
    try {
      const collection = this.db.collection(collectionName);
      
      const updateOptions = {
        upsert: options?.upsert || false,
        arrayFilters: options?.arrayFilters,
        bypassDocumentValidation: options?.bypassDocumentValidation
      };

      const result = options?.updateMany 
        ? await collection.updateMany(filter, update, updateOptions)
        : await collection.updateOne(filter, update, updateOptions);

      return {
        success: true,
        data: {
          matchedCount: result.matchedCount,
          modifiedCount: result.modifiedCount,
          upsertedCount: result.upsertedCount,
          upsertedId: result.upsertedId,
          acknowledged: result.acknowledged
        },
        metadata: {
          timestamp: new Date()
        } as any
      };
    } catch (error) {
      return this.handleError(error as any, 'Failed to update document');
    }
  }

  async deleteDocument(collectionName: string, filter: any, options?: any): Promise<ConnectorResponse> {
    try {
      const collection = this.db.collection(collectionName);
      
      const result = options?.deleteMany
        ? await collection.deleteMany(filter)
        : await collection.deleteOne(filter);

      return {
        success: true,
        data: {
          deletedCount: result.deletedCount,
          acknowledged: result.acknowledged
        },
        metadata: {
          timestamp: new Date()
        } as any
      };
    } catch (error) {
      return this.handleError(error as any, 'Failed to delete document');
    }
  }

  async aggregate(collectionName: string, pipeline: any[], options?: any): Promise<ConnectorResponse> {
    try {
      const collection = this.db.collection(collectionName);
      
      const aggregateOptions = {
        allowDiskUse: options?.allowDiskUse || false,
        maxTimeMS: options?.maxTimeMS || 60000,
        batchSize: options?.batchSize || 1000,
        comment: options?.comment
      };

      const cursor = collection.aggregate(pipeline, aggregateOptions);
      const results = await cursor.toArray();

      return {
        success: true,
        data: {
          results,
          resultCount: results.length
        },
        metadata: {
          timestamp: new Date()
        } as any
      };
    } catch (error) {
      return this.handleError(error as any, 'Failed to execute aggregation');
    }
  }

  async createIndex(collectionName: string, indexSpec: IndexSpec): Promise<ConnectorResponse> {
    try {
      const collection = this.db.collection(collectionName);
      const indexName = await collection.createIndex(indexSpec.keys, indexSpec.options);

      return {
        success: true,
        data: {
          indexName,
          keys: indexSpec.keys,
          options: indexSpec.options
        },
        metadata: {
          timestamp: new Date()
        } as any
      };
    } catch (error) {
      return this.handleError(error as any, 'Failed to create index');
    }
  }

  async bulkWrite(collectionName: string, operations: MongoBulkWriteOperation[], options?: any): Promise<ConnectorResponse> {
    try {
      const collection = this.db.collection(collectionName);
      
      const bulkOptions = {
        ordered: options?.ordered !== false, // Default to ordered
        bypassDocumentValidation: options?.bypassDocumentValidation || false
      };

      const result = await collection.bulkWrite(operations as any, bulkOptions);

      return {
        success: true,
        data: {
          insertedCount: result.insertedCount,
          matchedCount: result.matchedCount,
          modifiedCount: result.modifiedCount,
          deletedCount: result.deletedCount,
          upsertedCount: result.upsertedCount,
          upsertedIds: result.upsertedIds,
          insertedIds: result.insertedIds
        },
        metadata: {
          timestamp: new Date()
        } as any
      };
    } catch (error) {
      return this.handleError(error as any, 'Failed to execute bulk write');
    }
  }

  async createCollection(collectionName: string, options?: any): Promise<ConnectorResponse> {
    try {
      const collection = await this.db.createCollection(collectionName, options);

      return {
        success: true,
        data: {
          collectionName: collection.collectionName,
          namespace: collection.namespace,
          options
        },
        metadata: {
          timestamp: new Date()
        } as any
      };
    } catch (error) {
      return this.handleError(error as any, 'Failed to create collection');
    }
  }

  async dropCollection(collectionName: string): Promise<ConnectorResponse> {
    try {
      const result = await this.db.dropCollection(collectionName);

      return {
        success: true,
        data: {
          dropped: result,
          collectionName
        },
        metadata: {
          timestamp: new Date()
        } as any
      };
    } catch (error) {
      return this.handleError(error as any, 'Failed to drop collection');
    }
  }

  // Transaction support
  async withTransaction<T>(operation: (session: ClientSession) => Promise<T>): Promise<ConnectorResponse<T>> {
    const session = this.client.startSession();
    
    try {
      const result = await session.withTransaction(async () => {
        return await operation(session);
      });

      return {
        success: true,
        data: result,
        metadata: {
          timestamp: new Date()
        } as any
      };
    } catch (error) {
      return this.handleError(error as any, 'Transaction failed');
    } finally {
      await session.endSession();
    }
  }

  // Database administration
  async listCollections(): Promise<ConnectorResponse> {
    try {
      const collections = await this.db.listCollections().toArray();

      return {
        success: true,
        data: {
          collections: collections.map(col => ({
            name: col.name,
            type: col.type,
            options: (col as any).options
          }))
        },
        metadata: {
          timestamp: new Date()
        } as any
      };
    } catch (error) {
      return this.handleError(error as any, 'Failed to list collections');
    }
  }

  async getCollectionStats(collectionName: string): Promise<ConnectorResponse> {
    try {
      const stats = await this.db.command({ collStats: collectionName });

      return {
        success: true,
        data: {
          namespace: stats.ns,
          count: stats.count,
          size: stats.size,
          avgObjSize: stats.avgObjSize,
          storageSize: stats.storageSize,
          totalIndexSize: stats.totalIndexSize,
          indexSizes: stats.indexSizes
        },
        metadata: {
          timestamp: new Date()
        } as any
      };
    } catch (error) {
      return this.handleError(error as any, 'Failed to get collection stats');
    }
  }

  // Atlas Search Index Operations
  async createSearchIndex(
    collectionName: string,
    indexName: string,
    indexType: 'search' | 'vectorSearch',
    definition: any
  ): Promise<ConnectorResponse> {
    try {
      const collection = this.db.collection(collectionName);

      // MongoDB Atlas Search Index creation
      const indexSpec = {
        name: indexName,
        type: indexType,
        definition: definition
      };

      // Use the createSearchIndex method available in MongoDB Node.js driver 5.0+
      const result = await collection.createSearchIndex(indexSpec);

      return {
        success: true,
        data: {
          indexName: result,
          acknowledged: true
        },
        metadata: {
          timestamp: new Date()
        } as any
      };
    } catch (error) {
      return this.handleError(error as any, 'Failed to create search index');
    }
  }

  async updateSearchIndex(
    collectionName: string,
    indexName: string,
    definition: any
  ): Promise<ConnectorResponse> {
    try {
      const collection = this.db.collection(collectionName);

      // Update the search index definition
      await collection.updateSearchIndex(indexName, definition);

      return {
        success: true,
        data: {
          indexName,
          acknowledged: true
        },
        metadata: {
          timestamp: new Date()
        } as any
      };
    } catch (error) {
      return this.handleError(error as any, 'Failed to update search index');
    }
  }

  async dropSearchIndex(collectionName: string, indexName: string): Promise<ConnectorResponse> {
    try {
      const collection = this.db.collection(collectionName);

      await collection.dropSearchIndex(indexName);

      return {
        success: true,
        data: {
          indexName,
          dropped: true
        },
        metadata: {
          timestamp: new Date()
        } as any
      };
    } catch (error) {
      return this.handleError(error as any, 'Failed to drop search index');
    }
  }

  async listSearchIndexes(collectionName: string, indexName?: string): Promise<ConnectorResponse> {
    try {
      const collection = this.db.collection(collectionName);

      // List search indexes, optionally filtered by name
      const cursor = indexName
        ? collection.listSearchIndexes(indexName)
        : collection.listSearchIndexes();

      const indexes = await cursor.toArray();

      return {
        success: true,
        data: {
          indexes,
          count: indexes.length
        },
        metadata: {
          timestamp: new Date()
        } as any
      };
    } catch (error) {
      return this.handleError(error as any, 'Failed to list search indexes');
    }
  }

  // IDataConnector implementation
  async create(data: any): Promise<ConnectorResponse> {
    const collectionName = data.collection || 'default';
    return this.insertDocument(collectionName, data.document || data, data.options);
  }

  async read(request?: PaginatedRequest): Promise<ConnectorResponse> {
    const collectionName = request?.filters?.collection || 'default';
    const filter = request?.filters?.filter || {};
    const options = {
      limit: request?.pageSize || 100,
      skip: ((request?.page || 1) - 1) * (request?.pageSize || 100),
      sort: request?.sortBy ? { [request.sortBy]: request.sortOrder === 'desc' ? -1 : 1 } : undefined
    };
    
    return this.findDocuments(collectionName, filter, options);
  }

  async update(id: string, data: any): Promise<ConnectorResponse> {
    const collectionName = data.collection || 'default';
    const filter = { _id: id };
    const update = { $set: data.document || data };
    
    return this.updateDocument(collectionName, filter, update, data.options);
  }

  async delete(id: string): Promise<ConnectorResponse> {
    const collectionName = 'default'; // Could be parameterized
    const filter = { _id: id };
    
    return this.deleteDocument(collectionName, filter);
  }

  async search(query: string, options?: any): Promise<ConnectorResponse> {
    const collectionName = options?.collection || 'default';
    const filter = {
      $text: { $search: query }
    };
    
    return this.findDocuments(collectionName, filter, options);
  }

  async bulk<T>(operation: BulkOperation<T>): Promise<BulkOperationResult<T>> {
    const successful: T[] = [];
    const failed: Array<{ item: T; error: ConnectorError }> = [];
    
    try {
      // Process items in batches
      const batchSize = operation.batchSize || 100;
      const batches = this.chunkArray(operation.items, batchSize);
      
      for (const batch of batches) {
        try {
          // Convert items to MongoDB operations based on operation type
          const mongoOperations: MongoBulkWriteOperation[] = batch.map(item => {
            switch (operation.operation) {
              case 'create':
                return { insertOne: { document: item } };
              case 'update':
                return { updateOne: { filter: { _id: (item as any)._id }, update: { $set: item }, upsert: true } };
              case 'delete':
                return { deleteOne: { filter: { _id: (item as any)._id } } };
              default:
                throw new Error(`Unsupported operation: ${operation.operation}`);
            }
          });
          
          const result = await this.bulkWrite('documents', mongoOperations);
          if (result.success) {
            successful.push(...batch);
          } else if (!operation.continueOnError) {
            batch.forEach(item => {
              failed.push({ item, error: { message: result.error?.message || 'Unknown error', code: 'BULK_OPERATION_FAILED' } });
            });
          }
        } catch (error) {
          if (operation.continueOnError) {
            batch.forEach(item => {
              failed.push({ item, error: { message: error.message, code: 'BULK_OPERATION_FAILED' } });
            });
          } else {
            throw error;
          }
        }
      }
      
      return {
        successful,
        failed,
        totalProcessed: operation.items.length,
        totalSuccessful: successful.length,
        totalFailed: failed.length
      };
    } catch (error) {
      // If we can't continue on error, mark all items as failed
      operation.items.forEach(item => {
        failed.push({ item, error: { message: error.message, code: 'BULK_OPERATION_FAILED' } });
      });
      
      return {
        successful,
        failed,
        totalProcessed: operation.items.length,
        totalSuccessful: successful.length,
        totalFailed: failed.length
      };
    }
  }
  
  private chunkArray<T>(array: T[], chunkSize: number): T[][] {
    const chunks: T[][] = [];
    for (let i = 0; i < array.length; i += chunkSize) {
      chunks.push(array.slice(i, i + chunkSize));
    }
    return chunks;
  }

  private getActions(): ConnectorAction[] {
    return [
      {
        id: 'insert_document',
        name: 'Insert Document',
        description: 'Insert a document into a collection',
        inputSchema: {
          collection: { type: 'string', required: true, description: 'Collection name' },
          document: { type: 'object', required: true, description: 'Document to insert' },
          options: { type: 'object', description: 'Insert options' }
        },
        outputSchema: {
          insertedId: { type: 'string', description: 'ID of inserted document' }
        }
      },
      {
        id: 'find_documents',
        name: 'Find Documents',
        description: 'Find documents in a collection',
        inputSchema: {
          collection: { type: 'string', required: true, description: 'Collection name' },
          filter: { type: 'object', description: 'Query filter' },
          options: { type: 'object', description: 'Query options (limit, sort, projection)' }
        },
        outputSchema: {
          documents: { type: 'array', description: 'Found documents' },
          totalCount: { type: 'number', description: 'Total matching documents' }
        }
      },
      {
        id: 'update_document',
        name: 'Update Document',
        description: 'Update documents in a collection',
        inputSchema: {
          collection: { type: 'string', required: true, description: 'Collection name' },
          filter: { type: 'object', required: true, description: 'Update filter' },
          update: { type: 'object', required: true, description: 'Update operations' },
          options: { type: 'object', description: 'Update options' }
        },
        outputSchema: {
          modifiedCount: { type: 'number', description: 'Number of modified documents' }
        }
      },
      {
        id: 'delete_document',
        name: 'Delete Document',
        description: 'Delete documents from a collection',
        inputSchema: {
          collection: { type: 'string', required: true, description: 'Collection name' },
          filter: { type: 'object', required: true, description: 'Delete filter' },
          options: { type: 'object', description: 'Delete options' }
        },
        outputSchema: {
          deletedCount: { type: 'number', description: 'Number of deleted documents' }
        }
      },
      {
        id: 'aggregate',
        name: 'Aggregate',
        description: 'Execute aggregation pipeline',
        inputSchema: {
          collection: { type: 'string', required: true, description: 'Collection name' },
          pipeline: { type: 'array', required: true, description: 'Aggregation pipeline' },
          options: { type: 'object', description: 'Aggregation options' }
        },
        outputSchema: {
          results: { type: 'array', description: 'Aggregation results' }
        }
      },
      {
        id: 'bulk_write',
        name: 'Bulk Write',
        description: 'Execute multiple write operations',
        inputSchema: {
          collection: { type: 'string', required: true, description: 'Collection name' },
          operations: { type: 'array', required: true, description: 'Bulk operations' },
          options: { type: 'object', description: 'Bulk write options' }
        },
        outputSchema: {
          insertedCount: { type: 'number', description: 'Number of inserted documents' },
          modifiedCount: { type: 'number', description: 'Number of modified documents' },
          deletedCount: { type: 'number', description: 'Number of deleted documents' }
        }
      }
    ];
  }

  private getTriggers(): ConnectorTrigger[] {
    return [
      {
        id: 'document_inserted',
        name: 'Document Inserted',
        description: 'Triggered when a document is inserted',
        eventType: 'webhook',
        outputSchema: {
          collection: { type: 'string', description: 'Collection name' },
          document: { type: 'object', description: 'Inserted document' }
        },
        webhookRequired: false
      },
      {
        id: 'document_updated',
        name: 'Document Updated',
        description: 'Triggered when a document is updated',
        eventType: 'webhook',
        outputSchema: {
          collection: { type: 'string', description: 'Collection name' },
          documentId: { type: 'string', description: 'Updated document ID' }
        },
        webhookRequired: false
      }
    ];
  }
}