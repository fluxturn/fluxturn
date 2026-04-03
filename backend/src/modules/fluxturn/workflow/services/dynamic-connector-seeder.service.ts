import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { QdrantService } from '../../../qdrant/qdrant.service';
import { ConnectorRegistry } from '../../connectors/base/connector.registry';
import { PlatformService } from '../../../database/platform.service';
import OpenAI from 'openai';

/**
 * Dynamic Connector Seeder - Reads from ACTUAL registered connectors
 * instead of hardcoded constants. Syncs to both Qdrant AND database.
 */
@Injectable()
export class DynamicConnectorSeederService implements OnModuleInit {
  private readonly logger = new Logger(DynamicConnectorSeederService.name);
  private openai: OpenAI;
  private readonly CONNECTOR_DOCS_COLLECTION = 'connector_docs';
  private readonly WORKFLOW_EXAMPLES_COLLECTION = 'workflow_examples';
  private readonly WORKFLOW_RULES_COLLECTION = 'workflow_rules';
  private readonly EMBEDDING_DIMENSION = 1536;

  constructor(
    private readonly qdrantService: QdrantService,
    private readonly configService: ConfigService,
    private readonly connectorRegistry: ConnectorRegistry,
    private readonly platformService: PlatformService,
  ) {
    const apiKey = this.configService.get<string>('OPENAI_API_KEY');
    if (apiKey) {
      this.openai = new OpenAI({ apiKey });
    }
  }

  async onModuleInit() {
    if (this.openai && this.qdrantService.isConfigured()) {
      this.logger.log('🔄 Starting dynamic connector seeding from actual implementations...');
      // Wait a bit for connectors to register
      setTimeout(() => this.seedFromRegisteredConnectors(), 2000);
    } else {
      this.logger.warn('Skipping dynamic seeding - OpenAI or Qdrant not configured');
    }
  }

  /**
   * Seed from actual registered connectors
   */
  async seedFromRegisteredConnectors(): Promise<void> {
    try {
      await this.createCollections();
      await this.seedFromRegistry();
      await this.syncConnectorsToDatabase(); // 🆕 Sync to database
      await this.seedWorkflowExamples();
      await this.seedWorkflowRules();
      this.logger.log('✅ Dynamic connector seeding completed');
    } catch (error) {
      this.logger.error('Error in dynamic seeding:', error);
    }
  }

  private async createCollections(): Promise<void> {
    try {
      await this.qdrantService.createCollection(
        this.CONNECTOR_DOCS_COLLECTION,
        this.EMBEDDING_DIMENSION,
        'cosine',
      );

      await this.qdrantService.createCollection(
        this.WORKFLOW_EXAMPLES_COLLECTION,
        this.EMBEDDING_DIMENSION,
        'cosine',
      );

      await this.qdrantService.createCollection(
        this.WORKFLOW_RULES_COLLECTION,
        this.EMBEDDING_DIMENSION,
        'cosine',
      );

      this.logger.log('Collections verified');
    } catch (error) {
      this.logger.error('Error creating collections:', error);
    }
  }

  /**
   * Seed from connector registry - reads actual connector metadata
   */
  private async seedFromRegistry(): Promise<void> {
    try {
      // Clear old data
      const count = await this.qdrantService.countVectors(this.CONNECTOR_DOCS_COLLECTION);
      if (count > 0) {
        this.logger.log(`Clearing ${count} old connector docs...`);
        // We'll delete and recreate collection for fresh data
        try {
          await this.qdrantService.deleteCollection(this.CONNECTOR_DOCS_COLLECTION);
          await this.qdrantService.createCollection(
            this.CONNECTOR_DOCS_COLLECTION,
            this.EMBEDDING_DIMENSION,
            'cosine',
          );
        } catch (e) {
          this.logger.warn('Could not clear collection, proceeding anyway');
        }
      }

      const registeredConnectors = this.connectorRegistry.getAllConnectors();
      this.logger.log(`Found ${registeredConnectors.size} registered connectors`);

      for (const [type, registration] of registeredConnectors) {
        const connectorClass = registration.connectorClass;
        try {
          // Create temporary instance to get metadata
          const instance = new connectorClass(null, null);
          const metadata = instance.getMetadata();

          const doc = {
            name: metadata.type,
            displayName: metadata.name,
            description: metadata.description,
            category: metadata.category,
            authType: metadata.authType,
            webhookSupport: metadata.webhookSupport || false,
            triggers: metadata.triggers || [],
            actions: metadata.actions || [],
            examples: this.generateExamples(metadata),
          };

          // Create searchable text
          const searchText = `
            ${metadata.name} connector for ${metadata.description}.
            Category: ${metadata.category}.
            ${doc.triggers.length > 0 ? `Triggers: ${doc.triggers.map((t: any) => t.name).join(', ')}.` : ''}
            ${doc.actions.length > 0 ? `Actions: ${doc.actions.map((a: any) => a.name).join(', ')}.` : ''}
            Use ${metadata.type} for ${this.generateUseCases(metadata)}.
          `.trim();

          // Create embedding
          const embedding = await this.createEmbedding(searchText);

          // Store in Qdrant
          await this.qdrantService.upsertVectors(
            this.CONNECTOR_DOCS_COLLECTION,
            [
              {
                id: metadata.type,
                vector: embedding,
                payload: doc,
              },
            ],
          );

          this.logger.log(`✅ Seeded: ${metadata.name} (${doc.actions.length} actions, ${doc.triggers.length} triggers)`);
        } catch (error) {
          this.logger.error(`Failed to seed connector ${type}:`, error.message);
        }
      }

      this.logger.log(`✅ Seeded ${registeredConnectors.size} connectors from registry`);
    } catch (error) {
      this.logger.error('Error seeding from registry:', error);
    }
  }

  private generateExamples(metadata: any): string[] {
    const examples = [];

    if (metadata.category === 'communication') {
      examples.push(`Send notifications via ${metadata.name}`);
      examples.push(`Automate ${metadata.name} messaging workflows`);
    }

    if (metadata.category === 'social') {
      examples.push(`Post content to ${metadata.name}`);
      examples.push(`Monitor ${metadata.name} activity`);
    }

    if (metadata.category === 'crm') {
      examples.push(`Sync contacts with ${metadata.name}`);
      examples.push(`Automate ${metadata.name} sales workflows`);
    }

    if (metadata.triggers && metadata.triggers.length > 0) {
      examples.push(`Trigger workflows on ${metadata.name} events`);
    }

    return examples.length > 0 ? examples : [`Use ${metadata.name} for automation`];
  }

  private generateUseCases(metadata: any): string {
    const useCases = [];

    if (metadata.actions && metadata.actions.length > 0) {
      const actionNames = metadata.actions.map((a: any) => a.name || a.id).slice(0, 3);
      useCases.push(...actionNames);
    }

    if (metadata.triggers && metadata.triggers.length > 0) {
      const triggerNames = metadata.triggers.map((t: any) => t.name || t.id).slice(0, 2);
      useCases.push(...triggerNames);
    }

    return useCases.length > 0 ? useCases.join(', ') : 'general automation';
  }

  /**
   * Seed workflow examples
   */
  private async seedWorkflowExamples(): Promise<void> {
    try {
      const count = await this.qdrantService.countVectors(this.WORKFLOW_EXAMPLES_COLLECTION);
      if (count > 0) {
        this.logger.log(`Workflow examples already seeded (${count} examples)`);
        return;
      }

      const examples = [
        {
          prompt: 'Send a Slack message when a form is submitted',
          connectors: ['slack'],
          complexity: 'simple',
          nodeTypes: ['FORM_TRIGGER', 'SEND_SLACK'],
        },
        {
          prompt: 'Send email notification when Stripe payment received',
          connectors: ['stripe'],
          complexity: 'simple',
          nodeTypes: ['CONNECTOR_TRIGGER', 'SEND_EMAIL'],
        },
        {
          prompt: 'Post to Twitter and Facebook when blog published',
          connectors: ['twitter', 'facebook_graph'],
          complexity: 'medium',
          nodeTypes: ['WEBHOOK_TRIGGER', 'CONNECTOR_ACTION', 'CONNECTOR_ACTION'],
        },
      ];

      for (const [index, example] of examples.entries()) {
        const searchText = `${example.prompt}. Connectors: ${example.connectors.join(', ')}. Complexity: ${example.complexity}.`;
        const embedding = await this.createEmbedding(searchText);

        await this.qdrantService.upsertVectors(this.WORKFLOW_EXAMPLES_COLLECTION, [
          {
            id: `example_${index + 1}`,
            vector: embedding,
            payload: example,
          },
        ]);
      }

      this.logger.log(`✅ Seeded ${examples.length} workflow examples`);
    } catch (error) {
      this.logger.error('Error seeding workflow examples:', error);
    }
  }

  /**
   * Seed workflow rules
   */
  private async seedWorkflowRules(): Promise<void> {
    try {
      const count = await this.qdrantService.countVectors(this.WORKFLOW_RULES_COLLECTION);
      if (count > 0) {
        this.logger.log(`Workflow rules already seeded (${count} rules)`);
        return;
      }

      const rules = [
        {
          pattern: 'Send notification',
          nodeType: 'SEND_SLACK',
          description: 'Use SEND_SLACK for simple slack notifications (built-in action, no connector field)',
        },
        {
          pattern: 'Send email',
          nodeType: 'SEND_EMAIL',
          description: 'Use SEND_EMAIL for sending emails (built-in action, no connector field)',
        },
        {
          pattern: 'Get slack channels',
          nodeType: 'CONNECTOR_ACTION',
          connector: 'slack',
          action: 'get_channels',
          description: 'Use CONNECTOR_ACTION with connector="slack" and action="get_channels"',
        },
        {
          pattern: 'Post to telegram',
          nodeType: 'CONNECTOR_ACTION',
          connector: 'telegram',
          action: 'send_message',
          description: 'Use CONNECTOR_ACTION with connector="telegram" and action="send_message"',
        },
      ];

      for (const [index, rule] of rules.entries()) {
        const searchText = `${rule.pattern}. ${rule.description}`;
        const embedding = await this.createEmbedding(searchText);

        await this.qdrantService.upsertVectors(this.WORKFLOW_RULES_COLLECTION, [
          {
            id: `rule_${index + 1}`,
            vector: embedding,
            payload: rule,
          },
        ]);
      }

      this.logger.log(`✅ Seeded ${rules.length} workflow rules`);
    } catch (error) {
      this.logger.error('Error seeding workflow rules:', error);
    }
  }

  /**
   * Generate auth_fields array based on connector auth type
   */
  private generateAuthFields(metadata: any): any[] {
    const authType = metadata.authType;

    switch (authType) {
      case 'oauth2':
        return [
          {
            name: 'client_id',
            label: 'Client ID',
            type: 'text',
            required: true,
            description: `Your ${metadata.name} OAuth Client ID`,
          },
          {
            name: 'client_secret',
            label: 'Client Secret',
            type: 'password',
            required: true,
            description: `Your ${metadata.name} OAuth Client Secret`,
          },
        ];

      case 'api_key':
        return [
          {
            name: 'apiKey',
            label: 'API Key',
            type: 'password',
            required: true,
            description: `Your ${metadata.name} API key`,
            placeholder: 'Enter your API key',
          },
        ];

      case 'bearer_token':
        return [
          {
            name: 'accessToken',
            label: 'Access Token',
            type: 'password',
            required: true,
            description: `Your ${metadata.name} access token`,
            placeholder: 'Enter your access token',
          },
        ];

      case 'basic_auth':
        return [
          {
            name: 'username',
            label: 'Username',
            type: 'text',
            required: true,
            description: 'Your username',
          },
          {
            name: 'password',
            label: 'Password',
            type: 'password',
            required: true,
            description: 'Your password',
          },
        ];

      default:
        // For custom or unknown auth types, return empty array
        return [];
    }
  }

  /**
   * 🆕 Sync connector metadata to database table
   * This ensures the AI workflow generator has access to all connector actions/triggers
   *
   * ⚠️  DISABLED: This was overwriting the full schemas from CONNECTOR_DEFINITIONS
   * with simplified schemas from connector class metadata. The workflow.service.ts
   * already seeds the database with full schemas from CONNECTOR_DEFINITIONS.
   */
  private async syncConnectorsToDatabase(): Promise<void> {
    this.logger.log('⏭️  Skipping dynamic connector sync - using CONNECTOR_DEFINITIONS instead');
    this.logger.log('ℹ️  Full schemas are seeded by workflow.service.ts::initializeConnectors()');
    return;

    /* DISABLED CODE - keeping for reference
    try {
      this.logger.log('🔄 Syncing connectors to database...');

      const registeredConnectors = this.connectorRegistry.getAllConnectors();
      let syncedCount = 0;

      for (const [type, registration] of registeredConnectors) {
        const connectorClass = registration.connectorClass;
        try {
          // Create temporary instance to get metadata
          const instance = new connectorClass(null, null);
          const metadata = instance.getMetadata();

          // Upsert connector to database
          const query = `
            INSERT INTO connectors (
              name, display_name, description, category, type, status,
              auth_type, auth_fields, webhook_support, supported_triggers, supported_actions
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
            ON CONFLICT (name) DO UPDATE SET
              display_name = EXCLUDED.display_name,
              description = EXCLUDED.description,
              category = EXCLUDED.category,
              auth_type = EXCLUDED.auth_type,
              webhook_support = EXCLUDED.webhook_support,
              supported_triggers = EXCLUDED.supported_triggers,
              supported_actions = EXCLUDED.supported_actions,
              updated_at = NOW()
          `;

          // Generate auth_fields based on authType
          const authFields = this.generateAuthFields(metadata);

          await this.platformService.query(query, [
            metadata.type, // name
            metadata.name, // display_name
            metadata.description,
            metadata.category,
            'official', // type
            'active', // status
            metadata.authType,
            JSON.stringify(authFields), // auth_fields
            metadata.webhookSupport || false,
            JSON.stringify(metadata.triggers || []), // 🎯 supported_triggers
            JSON.stringify(metadata.actions || []),  // 🎯 supported_actions
          ]);

          syncedCount++;
          this.logger.log(
            `  ✅ Synced: ${metadata.name} (${metadata.actions?.length || 0} actions, ${metadata.triggers?.length || 0} triggers)`
          );
        } catch (error) {
          this.logger.error(`Failed to sync connector ${type} to database:`, error.message);
        }
      }

      this.logger.log(`✅ Synced ${syncedCount} connectors to database`);
    } catch (error) {
      this.logger.error('Error syncing connectors to database:', error);
    }
    */
  }

  private async createEmbedding(text: string): Promise<number[]> {
    try {
      const model = this.configService.get<string>('OPENAI_EMBEDDING_MODEL') || 'text-embedding-3-small';
      const response = await this.openai.embeddings.create({
        model,
        input: text,
      });
      return response.data[0].embedding;
    } catch (error) {
      this.logger.error('Error creating embedding:', error);
      throw error;
    }
  }
}
