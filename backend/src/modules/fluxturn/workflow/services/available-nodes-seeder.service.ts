import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { QdrantService } from '../../../qdrant/qdrant.service';
import { PlatformService } from '../../../database/platform.service';
import OpenAI from 'openai';

/**
 * Available Nodes Seeder - Seeds available node types to Qdrant
 * This ensures AI only uses nodes that actually exist in the database
 */
@Injectable()
export class AvailableNodesSeederService implements OnModuleInit {
  private readonly logger = new Logger(AvailableNodesSeederService.name);
  private openai: OpenAI;
  private readonly AVAILABLE_NODES_COLLECTION = 'available_nodes';
  private readonly EMBEDDING_DIMENSION = 1536;

  constructor(
    private readonly qdrantService: QdrantService,
    private readonly configService: ConfigService,
    private readonly platformService: PlatformService,
  ) {
    const apiKey = this.configService.get<string>('OPENAI_API_KEY');
    if (apiKey) {
      this.openai = new OpenAI({ apiKey });
    }
  }

  async onModuleInit() {
    // Skip auto-seed via env variable for faster startup
    const skipAutoSeed = this.configService.get<string>('SKIP_AUTO_SEED') === 'true' ||
                         this.configService.get<string>('SKIP_NODES_AUTO_SEED') === 'true';

    if (skipAutoSeed) {
      this.logger.log('⚡ Skipping nodes auto-seed (SKIP_AUTO_SEED=true) - faster startup!');
      return;
    }

    if (this.openai && this.qdrantService.isConfigured()) {
      this.logger.log('🔄 Starting available nodes seeding...');
      // Wait a bit for node_types table to be populated
      setTimeout(() => this.seedAvailableNodes(), 3000);
    } else {
      this.logger.warn('Skipping node seeding - OpenAI or Qdrant not configured');
    }
  }

  /**
   * Seed available nodes from database to Qdrant
   */
  async seedAvailableNodes(): Promise<void> {
    try {
      // Step 1: Create collection
      await this.createCollection();

      // Step 2: Get nodes from database
      const nodes = await this.getNodesFromDatabase();

      if (nodes.length === 0) {
        this.logger.warn('No nodes found in database. Skipping seeding.');
        return;
      }

      this.logger.log(`Found ${nodes.length} node types to seed`);

      // Step 3: Clear old data and seed new
      await this.clearAndSeedNodes(nodes);

      this.logger.log('✅ Available nodes seeding completed');
    } catch (error) {
      this.logger.error('Error seeding available nodes:', error);
    }
  }

  /**
   * Create Qdrant collection for available nodes
   */
  private async createCollection(): Promise<void> {
    try {
      await this.qdrantService.createCollection(
        this.AVAILABLE_NODES_COLLECTION,
        this.EMBEDDING_DIMENSION,
        'cosine',
      );
      this.logger.debug('Collection verified');
    } catch (error) {
      this.logger.error('Error creating collection:', error);
    }
  }

  /**
   * Get node types from database
   */
  private async getNodesFromDatabase(): Promise<any[]> {
    try {
      const query = `
        SELECT
          type,
          name,
          category,
          description,
          icon,
          config_schema,
          input_schema,
          output_schema,
          is_trigger,
          is_action,
          is_builtin,
          connector_type,
          requires_connector,
          is_active,
          examples
        FROM node_types
        WHERE is_active = true
        ORDER BY sort_order, name
      `;

      const result = await this.platformService.query(query);
      return result.rows || [];
    } catch (error) {
      this.logger.error('Error fetching nodes from database:', error);
      return [];
    }
  }

  /**
   * Clear old data and seed fresh node types
   */
  private async clearAndSeedNodes(nodes: any[]): Promise<void> {
    try {
      // Clear old data
      const count = await this.qdrantService.countVectors(this.AVAILABLE_NODES_COLLECTION);
      if (count > 0) {
        this.logger.log(`Clearing ${count} old node documents...`);
        try {
          await this.qdrantService.deleteCollection(this.AVAILABLE_NODES_COLLECTION);
          await this.qdrantService.createCollection(
            this.AVAILABLE_NODES_COLLECTION,
            this.EMBEDDING_DIMENSION,
            'cosine',
          );
        } catch (e) {
          this.logger.warn('Could not clear collection, proceeding anyway');
        }
      }

      // Seed each node
      const points = [];
      for (const node of nodes) {
        try {
          // Create searchable text for embedding
          const searchText = this.createNodeSearchText(node);

          // Generate embedding
          const embedding = await this.createEmbedding(searchText);

          // Prepare payload
          const payload = {
            type: node.type,
            name: node.name,
            category: node.category,
            description: node.description,
            icon: node.icon,
            isTrigger: node.is_trigger,
            isAction: node.is_action,
            isBuiltin: node.is_builtin,
            connectorType: node.connector_type,
            requiresConnector: node.requires_connector,
            configSchema: node.config_schema,
            inputSchema: node.input_schema,
            outputSchema: node.output_schema,
            examples: node.examples || [],
            searchText: searchText, // Store for debugging
          };

          points.push({
            id: node.type, // Use type as ID
            vector: embedding,
            payload,
          });

          this.logger.debug(`Prepared node: ${node.name} (${node.type})`);
        } catch (error) {
          this.logger.error(`Error processing node ${node.type}:`, error);
        }
      }

      // Batch insert all points
      if (points.length > 0) {
        await this.qdrantService.upsertVectors(
          this.AVAILABLE_NODES_COLLECTION,
          points,
        );
        this.logger.log(`✅ Seeded ${points.length} node types to Qdrant`);
      }
    } catch (error) {
      this.logger.error('Error clearing and seeding nodes:', error);
    }
  }

  /**
   * Create searchable text from node data
   */
  private createNodeSearchText(node: any): string {
    const parts = [
      node.name,
      node.description,
      node.category,
      node.is_trigger ? 'trigger workflow start' : '',
      node.is_action ? 'action execute' : '',
      node.connector_type ? `connector: ${node.connector_type}` : '',
      ...(node.examples || []),
    ];

    return parts.filter(Boolean).join('. ');
  }

  /**
   * Generate embedding for text
   */
  private async createEmbedding(text: string): Promise<number[]> {
    try {
      const response = await this.openai.embeddings.create({
        model: 'text-embedding-3-small',
        input: text,
      });

      return response.data[0].embedding;
    } catch (error) {
      this.logger.error('Error creating embedding:', error);
      // Return zero vector as fallback
      return new Array(this.EMBEDDING_DIMENSION).fill(0);
    }
  }
}
