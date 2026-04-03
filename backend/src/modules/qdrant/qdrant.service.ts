import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { QdrantClient } from '@qdrant/js-client-rest';

export interface VectorDocument {
  id: string;
  vector: number[];
  payload?: Record<string, any>;
}

export interface VectorSearchQuery {
  vector: number[];
  limit?: number;
  offset?: number;
  filter?: Record<string, any>;
  threshold?: number;
  withPayload?: boolean;
}

export interface VectorSearchResult {
  id: string;
  score: number;
  payload?: Record<string, any>;
}

export interface CollectionInfo {
  name: string;
  vectorSize: number;
  distance: 'cosine' | 'euclid' | 'dot';
  points: number;
  status: string;
}

@Injectable()
export class QdrantService {
  private readonly logger = new Logger(QdrantService.name);
  private client: QdrantClient;

  constructor(private readonly configService: ConfigService) {
    this.initializeQdrant();
  }

  private async initializeQdrant(): Promise<void> {
    const host = this.configService.get<string>('QDRANT_HOST') || 'localhost';
    const port = this.configService.get<number>('QDRANT_PORT') || 6333;
    const apiKey = this.configService.get<string>('QDRANT_API_KEY');

    if (!host) {
      this.logger.warn(
        'Qdrant host not configured. Vector search service will be disabled.',
      );
      return;
    }

    // Handle full URL or just hostname
    let url: string;
    if (host.startsWith('http://') || host.startsWith('https://')) {
      // If port is default (6333), don't append it
      url = port === 6333 ? host : `${host}:${port}`;
    } else {
      url = `http://${host}:${port}`;
    }

    const clientConfig: any = {
      url,
    };

    if (apiKey) {
      clientConfig.apiKey = apiKey;
    }

    this.client = new QdrantClient(clientConfig);

    try {
      this.logger.log('======================================');
      this.logger.log('====== QDRANT CONNECTION START ======');
      this.logger.log('======================================');
      this.logger.log(`Connecting to Qdrant at ${url}`);
      this.logger.log(
        `API Key: ${apiKey ? '***' + apiKey.slice(-4) : 'NOT SET'}`,
      );

      await this.client.getCollections();

      this.logger.log('======================================');
      this.logger.log('====== QDRANT CONNECTED =============');
      this.logger.log('======================================');
      this.logger.log('Qdrant vector search service initialized successfully');
    } catch (error) {
      this.logger.error('======================================');
      this.logger.error('====== QDRANT CONNECTION FAILED =====');
      this.logger.error('======================================');
      this.logger.error(
        `Failed to initialize Qdrant: ${error.message}`,
        error.stack,
      );
    }
  }

  /**
   * Create a collection
   */
  async createCollection(
    name: string,
    vectorSize: number,
    distance: 'cosine' | 'euclid' | 'dot' = 'cosine',
  ): Promise<void> {
    if (!this.client) {
      this.logger.warn('Qdrant not initialized. Skipping collection creation.');
      return;
    }

    try {
      // Check if collection already exists
      let collections;
      try {
        collections = await this.client.getCollections();
      } catch (error) {
        // If we can't even get collections, Qdrant is likely down
        this.logger.error(`Qdrant appears to be down: ${error.message}`);
        return; // Don't throw, just return to avoid blocking table creation
      }

      const exists = collections.collections.some((col) => col.name === name);

      if (exists) {
        this.logger.debug(`Collection ${name} already exists`);
        return;
      }

      this.logger.debug(
        `Creating collection ${name} with vector size ${vectorSize} and distance ${distance}`,
      );

      await this.client.createCollection(name, {
        vectors: {
          size: vectorSize,
          distance:
            distance === 'cosine'
              ? 'Cosine'
              : distance === 'euclid'
                ? 'Euclid'
                : 'Dot',
        },
        // Add replication factor for better reliability
        replication_factor: 1,
        // Ensure collection is created with proper settings
        on_disk_payload: true,
      });

      this.logger.log(
        `Created Qdrant collection: ${name} with vector size ${vectorSize}`,
      );
    } catch (error) {
      // Check for cluster/leader issues
      if (
        error.message?.includes('leader is not established') ||
        error.response?.data?.status?.error?.includes(
          'leader is not established',
        )
      ) {
        this.logger.error(
          `Qdrant cluster issue - leader not established for collection ${name}. This is a temporary cluster state issue.`,
        );
        // Don't throw - just log and continue
        this.logger.warn(
          `Will retry collection creation for ${name} in next operation`,
        );
        return;
      }

      // Check if it's a "channel closed" error
      if (
        error.message?.includes('Channel closed') ||
        error.message?.includes('channel')
      ) {
        this.logger.error(
          `Qdrant connection lost (channel closed): ${error.message}. Reinitializing client...`,
        );
        // Try to reinitialize the client
        try {
          await this.initializeQdrant();
        } catch (reinitError) {
          this.logger.error(
            `Failed to reinitialize Qdrant: ${reinitError.message}`,
          );
        }
      } else {
        this.logger.error(
          `Failed to create collection ${name}: ${error.message}`,
          error.stack,
        );
      }
      // Don't throw - just log and continue to avoid blocking table creation
      this.logger.warn(`Continuing without Qdrant collection for ${name}`);
    }
  }

  /**
   * Delete a collection
   */
  async deleteCollection(name: string): Promise<void> {
    if (!this.client) {
      this.logger.warn('Qdrant not initialized. Cannot delete collection.');
      return;
    }

    try {
      // First check if collection exists
      try {
        await this.client.getCollection(name);
      } catch (checkError) {
        if (
          checkError.message?.includes('Not found') ||
          checkError.status === 404
        ) {
          this.logger.debug(
            `Collection ${name} does not exist, nothing to delete`,
          );
          return;
        }
        throw checkError;
      }

      await this.client.deleteCollection(name);
      this.logger.log(`Deleted Qdrant collection: ${name}`);
    } catch (error) {
      // Check for cluster/leader issues
      if (
        error.message?.includes('leader is not established') ||
        error.response?.data?.status?.error?.includes(
          'leader is not established',
        )
      ) {
        this.logger.error(
          `Qdrant cluster issue - leader not established for deleting collection ${name}. This is a temporary cluster state issue.`,
        );
        return;
      }

      // Check if it's a not found error (shouldn't happen with our check above, but just in case)
      if (error.message?.includes('Not found') || error.status === 404) {
        this.logger.debug(
          `Collection ${name} not found during delete, considering it as success`,
        );
        return;
      }

      this.logger.error(
        `Failed to delete collection ${name}: ${error.message}`,
        error.stack,
      );
    }
  }

  /**
   * Check if collection exists
   */
  async getCollection(name: string): Promise<any> {
    if (!this.client) {
      throw new Error('Qdrant not initialized');
    }
    return this.client.getCollection(name);
  }

  /**
   * Get collection info
   */
  async getCollectionInfo(name: string): Promise<CollectionInfo | null> {
    if (!this.client) {
      this.logger.warn('Qdrant not initialized. Cannot get collection info.');
      return null;
    }

    try {
      const info = await this.client.getCollection(name);

      const vectorConfig = info.config.params.vectors as any;
      return {
        name: name,
        vectorSize: vectorConfig?.size || 0,
        distance:
          vectorConfig?.distance === 'Cosine'
            ? 'cosine'
            : vectorConfig?.distance === 'Euclid'
              ? 'euclid'
              : 'dot',
        points: info.points_count || 0,
        status: info.status,
      };
    } catch (error) {
      this.logger.error(
        `Failed to get collection info ${name}: ${error.message}`,
        error.stack,
      );
      return null;
    }
  }

  /**
   * List all collections
   */
  async listCollections(): Promise<string[]> {
    if (!this.client) {
      this.logger.warn('Qdrant not initialized. Cannot list collections.');
      return [];
    }

    try {
      const response = await this.client.getCollections();
      return response.collections.map((col) => col.name);
    } catch (error) {
      this.logger.error(
        `Failed to list collections: ${error.message}`,
        error.stack,
      );
      return [];
    }
  }

  /**
   * Insert a vector document
   */
  async upsertVectors(
    collectionName: string,
    vectors: VectorDocument[],
  ): Promise<void> {
    if (!this.client) {
      throw new Error('Qdrant client not initialized');
    }

    try {
      const points = vectors.map((vec) => ({
        id: this.formatPointId(vec.id),
        vector: vec.vector,
        payload: vec.payload || {},
      }));

      await this.client.upsert(collectionName, {
        wait: true,
        points,
      });
    } catch (error) {
      this.logger.error(
        `Failed to upsert vectors: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  async insertVector(
    collectionName: string,
    document: VectorDocument,
  ): Promise<void> {
    if (!this.client) {
      this.logger.warn('Qdrant not initialized. Skipping vector insertion.');
      return;
    }

    try {
      // First check if collection exists
      try {
        await this.client.getCollection(collectionName);
      } catch (collectionError) {
        if (
          collectionError.message?.includes('Not found') ||
          collectionError.status === 404
        ) {
          this.logger.warn(
            `Collection ${collectionName} not found. Creating with default settings...`,
          );
          // Create collection with default vector size
          await this.createCollection(collectionName, 1536, 'cosine');
        } else {
          throw collectionError;
        }
      }

      await this.client.upsert(collectionName, {
        wait: true,
        points: [
          {
            id: this.formatPointId(document.id),
            vector: document.vector,
            payload: document.payload || {},
          },
        ],
      });

      this.logger.debug(`Vector inserted: ${document.id} in ${collectionName}`);
    } catch (error) {
      this.logger.error(
        `Failed to insert vector ${document.id}: ${error.message}`,
        error.stack,
      );
    }
  }

  /**
   * Bulk insert vector documents
   */
  async bulkInsertVectors(
    collectionName: string,
    documents: VectorDocument[],
  ): Promise<void> {
    if (!this.client || documents.length === 0) {
      this.logger.warn('Qdrant not initialized or no documents to insert.');
      return;
    }

    try {
      const points = documents.map((doc) => ({
        id: this.formatPointId(doc.id),
        vector: doc.vector,
        payload: doc.payload || {},
      }));

      // Process in batches of 100
      const batchSize = 100;
      for (let i = 0; i < points.length; i += batchSize) {
        const batch = points.slice(i, i + batchSize);

        await this.client.upsert(collectionName, {
          wait: true,
          points: batch,
        });

        this.logger.debug(
          `Bulk inserted batch ${Math.floor(i / batchSize) + 1} of ${Math.ceil(points.length / batchSize)}`,
        );
      }

      this.logger.log(
        `Bulk inserted ${documents.length} vectors into ${collectionName}`,
      );
    } catch (error) {
      this.logger.error(
        `Failed to bulk insert vectors: ${error.message}`,
        error.stack,
      );
    }
  }

  /**
   * Search for similar vectors
   */
  async searchVectors(
    collectionName: string,
    queryVector: number[],
    limit: number = 10,
    filter?: any,
  ): Promise<VectorSearchResult[]> {
    if (!this.client) {
      this.logger.warn('Qdrant not initialized. Returning empty results.');
      return [];
    }

    try {
      // First check if collection exists
      try {
        await this.client.getCollection(collectionName);
      } catch (error) {
        // Collection doesn't exist - this is expected for new chatbots
        this.logger.debug(
          `Collection ${collectionName} does not exist yet. Returning empty results.`,
        );
        return [];
      }

      const searchParams: any = {
        vector: queryVector,
        limit: limit,
        with_payload: true,
      };

      // Add filter if provided
      if (filter) {
        searchParams.filter = filter;
      }

      const response = await this.client.search(collectionName, searchParams);

      return (response as any[]).map((result) => ({
        id: result.id.toString(),
        score: result.score,
        payload: result.payload || {},
      }));
    } catch (error) {
      this.logger.error(
        `Failed to search vectors in ${collectionName}: ${error.message}`,
        error.stack,
      );
      return [];
    }
  }

  /**
   * Search chatbot documents
   */
  async searchChatbot(
    collectionName: string,
    query: string,
    limit: number,
  ): Promise<VectorSearchResult[]> {
    // For now, return empty results since we need embeddings
    // TODO: Implement actual vector search with embeddings
    return [];
  }

  /**
   * Get vector by ID
   */
  async getVector(
    collectionName: string,
    id: string,
  ): Promise<VectorDocument | null> {
    if (!this.client) {
      this.logger.warn('Qdrant not initialized. Cannot get vector.');
      return null;
    }

    try {
      const response = await this.client.retrieve(collectionName, {
        ids: [this.formatPointId(id)],
        with_payload: true,
        with_vector: true,
      });

      if (response.length === 0) {
        return null;
      }

      const point = response[0];
      return {
        id: point.id.toString(),
        vector: point.vector as number[],
        payload: point.payload || undefined,
      };
    } catch (error) {
      this.logger.error(
        `Failed to get vector ${id}: ${error.message}`,
        error.stack,
      );
      return null;
    }
  }

  /**
   * Update vector
   */
  async updateVector(
    collectionName: string,
    id: string,
    updates: Partial<VectorDocument>,
  ): Promise<void> {
    if (!this.client) {
      this.logger.warn('Qdrant not initialized. Cannot update vector.');
      return;
    }

    try {
      const updateData: any = {
        wait: true,
        points: [
          {
            id: this.formatPointId(id),
            ...(updates.vector && { vector: updates.vector }),
            ...(updates.payload && { payload: updates.payload }),
          },
        ],
      };

      await this.client.upsert(collectionName, updateData);

      this.logger.debug(`Vector updated: ${id} in ${collectionName}`);
    } catch (error) {
      this.logger.error(
        `Failed to update vector ${id}: ${error.message}`,
        error.stack,
      );
    }
  }

  /**
   * Delete vectors by payload filter
   */
  async deleteByPayloadFilter(
    collectionName: string,
    filter: Record<string, any>,
  ): Promise<void> {
    if (!this.client) {
      this.logger.warn('Qdrant not initialized. Cannot delete vectors.');
      return;
    }

    try {
      // First check if collection exists
      const collections = await this.client.getCollections();
      const exists = collections.collections.some(
        (col) => col.name === collectionName,
      );

      if (!exists) {
        this.logger.warn(
          `Collection ${collectionName} does not exist. Skipping delete.`,
        );
        return;
      }

      await this.client.delete(collectionName, {
        wait: true,
        filter: this.buildFilter(filter),
      });

      this.logger.debug(`Vectors deleted by filter in ${collectionName}`);
    } catch (error) {
      this.logger.error(
        `Failed to delete vectors by filter: ${error.message}`,
        error.stack,
      );
    }
  }

  /**
   * Delete vector
   */
  async deleteVectors(collectionName: string, ids: string[]): Promise<void> {
    if (!this.client) {
      throw new Error('Qdrant client not initialized');
    }

    try {
      // First check if collection exists
      const collections = await this.client.getCollections();
      const exists = collections.collections.some(
        (col) => col.name === collectionName,
      );

      if (!exists) {
        this.logger.warn(
          `Collection ${collectionName} does not exist. Skipping delete.`,
        );
        return;
      }

      await this.client.delete(collectionName, {
        wait: true,
        points: ids.map((id) => this.formatPointId(id)),
      });
    } catch (error) {
      // If it's a "Not Found" error, log it but don't throw
      if (error.message === 'Not Found' || error.status === 404) {
        this.logger.warn(
          `Vectors not found in collection ${collectionName}. They may have been already deleted.`,
        );
        return;
      }

      this.logger.error(
        `Failed to delete vectors: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  async deleteVector(collectionName: string, id: string): Promise<void> {
    if (!this.client) {
      this.logger.warn('Qdrant not initialized. Cannot delete vector.');
      return;
    }

    try {
      // First check if collection exists
      const collections = await this.client.getCollections();
      const exists = collections.collections.some(
        (col) => col.name === collectionName,
      );

      if (!exists) {
        this.logger.warn(
          `Collection ${collectionName} does not exist. Skipping delete.`,
        );
        return;
      }

      await this.client.delete(collectionName, {
        wait: true,
        points: [this.formatPointId(id)],
      });

      this.logger.debug(`Vector deleted: ${id} from ${collectionName}`);
    } catch (error) {
      // If it's a "Not Found" error, log it but don't throw
      if (error.message === 'Not Found' || error.status === 404) {
        this.logger.warn(
          `Vector ${id} not found in collection ${collectionName}. It may have been already deleted.`,
        );
        return;
      }

      this.logger.error(
        `Failed to delete vector ${id}: ${error.message}`,
        error.stack,
      );
    }
  }

  /**
   * Count vectors in collection
   */
  async countVectors(
    collectionName: string,
    filter?: Record<string, any>,
  ): Promise<number> {
    if (!this.client) {
      this.logger.warn('Qdrant not initialized. Cannot count vectors.');
      return 0;
    }

    try {
      const params: any = { exact: true };

      if (filter) {
        params.filter = this.buildFilter(filter);
      }

      const response = await this.client.count(collectionName, params);
      return response.count;
    } catch (error) {
      this.logger.error(
        `Failed to count vectors in ${collectionName}: ${error.message}`,
        error.stack,
      );
      return 0;
    }
  }

  /**
   * Scroll through vectors
   */
  async scrollVectors(
    collectionName: string,
    limit: number = 100,
    offset?: string,
    filter?: Record<string, any>,
  ): Promise<{ vectors: VectorDocument[]; nextOffset?: string }> {
    if (!this.client) {
      this.logger.warn('Qdrant not initialized. Cannot scroll vectors.');
      return { vectors: [] };
    }

    try {
      const params: any = {
        limit,
        with_payload: true,
        with_vector: true,
      };

      if (offset) {
        params.offset = offset;
      }

      if (filter) {
        params.filter = this.buildFilter(filter);
      }

      const response = await this.client.scroll(collectionName, params);

      const vectors = response.points.map((point) => ({
        id: point.id.toString(),
        vector: point.vector as number[],
        payload: point.payload || undefined,
      }));

      return {
        vectors,
        nextOffset: response.next_page_offset
          ? String(response.next_page_offset)
          : undefined,
      };
    } catch (error) {
      this.logger.error(
        `Failed to scroll vectors in ${collectionName}: ${error.message}`,
        error.stack,
      );
      return { vectors: [] };
    }
  }

  /**
   * Recommend vectors (find similar to positive examples, dissimilar to negative)
   */
  async recommendVectors(
    collectionName: string,
    positive: string[],
    negative: string[] = [],
    limit: number = 10,
    filter?: Record<string, any>,
  ): Promise<VectorSearchResult[]> {
    if (!this.client) {
      this.logger.warn('Qdrant not initialized. Cannot recommend vectors.');
      return [];
    }

    try {
      const params: any = {
        positive: positive.map((id) => this.formatPointId(id)),
        negative: negative.map((id) => this.formatPointId(id)),
        limit,
        with_payload: true,
      };

      if (filter) {
        params.filter = this.buildFilter(filter);
      }

      const response = await this.client.recommend(collectionName, params);

      return (response as any[]).map((result) => ({
        id: result.id.toString(),
        score: result.score,
        payload: result.payload || {},
      }));
    } catch (error) {
      this.logger.error(
        `Failed to recommend vectors in ${collectionName}: ${error.message}`,
        error.stack,
      );
      return [];
    }
  }

  /**
   * Build Qdrant filter from object
   */
  private buildFilter(filter: Record<string, any>): any {
    const must: any[] = [];

    Object.entries(filter).forEach(([key, value]) => {
      if (value === null || value === undefined) {
        return;
      }

      if (Array.isArray(value)) {
        must.push({
          key,
          match: {
            any: value,
          },
        });
      } else if (typeof value === 'object' && value.range) {
        must.push({
          key,
          range: value.range,
        });
      } else {
        must.push({
          key,
          match: {
            value,
          },
        });
      }
    });

    return { must };
  }

  /**
   * Create index for better performance
   */
  async createIndex(
    collectionName: string,
    fieldName: string,
    fieldType: 'keyword' | 'integer' | 'float' | 'bool' = 'keyword',
  ): Promise<void> {
    if (!this.client) {
      this.logger.warn('Qdrant not initialized. Cannot create index.');
      return;
    }

    try {
      await this.client.createPayloadIndex(collectionName, {
        field_name: fieldName,
        field_schema: fieldType,
      });

      this.logger.log(
        `Created index for field ${fieldName} in collection ${collectionName}`,
      );
    } catch (error) {
      this.logger.error(
        `Failed to create index: ${error.message}`,
        error.stack,
      );
    }
  }

  /**
   * Check if Qdrant is properly configured
   */
  isConfigured(): boolean {
    return !!this.client;
  }

  /**
   * Get service health status
   */
  async getHealthStatus(): Promise<{
    status: 'healthy' | 'unhealthy' | 'disabled';
    configured: boolean;
    collections?: string[];
    error?: string;
  }> {
    if (!this.client) {
      return {
        status: 'disabled',
        configured: false,
        error: 'Qdrant not configured',
      };
    }

    try {
      const collections = await this.listCollections();

      return {
        status: 'healthy',
        configured: true,
        collections,
      };
    } catch (error) {
      return {
        status: 'unhealthy',
        configured: true,
        error: error.message,
      };
    }
  }

  /**
   * Get collection statistics
   */
  async getCollectionStats(collectionName: string): Promise<any> {
    if (!this.client) {
      return null;
    }

    try {
      const info = await this.client.getCollection(collectionName);
      const count = await this.countVectors(collectionName);

      const vectors = info.config?.params?.vectors as any;
      return {
        name: collectionName,
        status: info.status,
        vectorSize: vectors?.size || 0,
        distance: vectors?.distance || 'cosine',
        pointsCount: count,
        indexedVectorsCount: info.indexed_vectors_count || 0,
        segmentsCount: info.segments_count || 0,
      };
    } catch (error) {
      this.logger.error(
        `Failed to get collection stats: ${error.message}`,
        error.stack,
      );
      return null;
    }
  }

  /**
   * Format point ID to be compatible with Qdrant
   * Qdrant expects either an unsigned integer or a UUID
   */
  private formatPointId(id: string): string | number {
    // Check if it's already a valid UUID format
    const uuidRegex =
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (uuidRegex.test(id)) {
      return id;
    }

    // Check if it's a numeric string that can be converted to integer
    const numericId = parseInt(id, 10);
    if (!isNaN(numericId) && numericId >= 0 && numericId.toString() === id) {
      return numericId;
    }

    // Convert string to a deterministic UUID using a hash function
    // This ensures the same string always produces the same UUID
    const crypto = require('crypto');
    const hash = crypto.createHash('sha256').update(id).digest('hex');

    // Format as UUID v4
    const uuid = [
      hash.substring(0, 8),
      hash.substring(8, 12),
      '4' + hash.substring(13, 16), // Version 4
      ((parseInt(hash.substring(16, 17), 16) & 0x3) | 0x8).toString(16) +
        hash.substring(17, 20), // Variant
      hash.substring(20, 32),
    ].join('-');

    return uuid;
  }
}
