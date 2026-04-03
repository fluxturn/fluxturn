import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { QdrantService } from '../../../qdrant/qdrant.service';
import { PlatformService } from '../../../database/platform.service';
import OpenAI from 'openai';
import { CONNECTOR_DEFINITIONS } from '../../connectors/shared';

/**
 * Qdrant Seeder Service
 * Seeds Qdrant vector database with:
 * 1. Connector documentation (capabilities, triggers, actions)
 * 2. Example workflows
 * 3. Common rules and patterns
 */
@Injectable()
export class QdrantSeederService implements OnModuleInit {
  private readonly logger = new Logger(QdrantSeederService.name);
  private openai: OpenAI;
  private readonly CONNECTOR_DOCS_COLLECTION = 'connector_docs';
  private readonly WORKFLOW_EXAMPLES_COLLECTION = 'workflow_examples';
  private readonly WORKFLOW_RULES_COLLECTION = 'workflow_rules';
  private readonly EMBEDDING_DIMENSION = 1536; // text-embedding-3-small dimension

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
    // 🔧 OPTIMIZATION: Allow skipping auto-seed via env variable
    const skipAutoSeed = this.configService.get<string>('SKIP_AUTO_SEED') === 'true' ||
                         this.configService.get<string>('SKIP_QDRANT_AUTO_SEED') === 'true';

    if (skipAutoSeed) {
      this.logger.log('⚡ Skipping Qdrant auto-seed (SKIP_AUTO_SEED=true) - faster startup!');
      this.logger.log('   💡 To reseed manually, run: npm run seed:qdrant');
      return;
    }

    // Auto-seed on startup (only if Qdrant and OpenAI are configured)
    if (this.openai && this.qdrantService.isConfigured()) {
      this.logger.log('Auto-seeding Qdrant with connector documentation...');

      // 🔍 CHECK: Log current state before seeding
      try {
        const currentCount = await this.qdrantService.countVectors(this.WORKFLOW_EXAMPLES_COLLECTION);
        this.logger.log(`📊 Current workflow examples in Qdrant: ${currentCount}`);
      } catch (error) {
        this.logger.log('📊 Workflow examples collection not found (will be created)');
      }

      await this.seedAllCollections();
    } else {
      this.logger.warn('Skipping Qdrant seeding - OpenAI or Qdrant not configured');
    }
  }

  /**
   * Seed all collections
   */
  async seedAllCollections(): Promise<void> {
    try {
      await this.createCollections();
      await this.seedConnectorDocs();
      await this.seedWorkflowExamples();
      await this.seedWorkflowRules();
      this.logger.log('✅ Qdrant seeding completed successfully');
    } catch (error) {
      this.logger.error('Error seeding Qdrant:', error);
    }
  }

  /**
   * Create collections if they don't exist
   */
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

      this.logger.log('Collections created/verified');
    } catch (error) {
      this.logger.error('Error creating collections:', error);
      throw error;
    }
  }

  /**
   * Seed connector documentation
   */
  private async seedConnectorDocs(): Promise<void> {
    try {
      // Check if already seeded
      const count = await this.qdrantService.countVectors(this.CONNECTOR_DOCS_COLLECTION);
      if (count > 0) {
        this.logger.log(`Connector docs already seeded (${count} documents)`);
        return;
      }

      this.logger.log(`Seeding ${CONNECTOR_DEFINITIONS.length} connector documents...`);

      const vectors = [];

      for (const connector of CONNECTOR_DEFINITIONS) {
        // Create rich text description for embedding
        const description = this.buildConnectorDescription(connector);

        // Create embedding
        const embedding = await this.createEmbedding(description);

        vectors.push({
          id: `connector_${connector.name}`,
          vector: embedding,
          payload: {
            name: connector.name,
            displayName: connector.display_name,
            description: connector.description,
            category: connector.category,
            triggers: connector.supported_triggers || [],
            actions: connector.supported_actions || [],
            examples: this.getConnectorExamples(connector.name),
            authType: connector.auth_type,
            webhookSupport: connector.webhook_support,
          },
        });
      }

      // Bulk insert
      await this.qdrantService.bulkInsertVectors(this.CONNECTOR_DOCS_COLLECTION, vectors);

      this.logger.log(`✅ Seeded ${vectors.length} connector documents`);
    } catch (error) {
      this.logger.error('Error seeding connector docs:', error);
    }
  }

  /**
   * Seed example workflows
   */
  private async seedWorkflowExamples(): Promise<void> {
    try {
      const count = await this.qdrantService.countVectors(this.WORKFLOW_EXAMPLES_COLLECTION);

      // 🔧 SMART SKIP: If already seeded with good count, skip re-seeding
      // Only reseed if: (1) empty, (2) very low count suggesting corruption
      if (count > 300) {
        this.logger.log(`✅ Workflow examples already seeded (${count} examples) - skipping to save time`);
        return;
      } else if (count > 0 && count >= 100) {
        this.logger.log(`⚡ Found ${count} workflow examples - assuming complete, skipping reseed for faster startup`);
        this.logger.log(`   💡 To force reseed, run: npm run seed:qdrant`);
        return;
      } else if (count > 0 && count < 100) {
        this.logger.warn(`⚠️ Found only ${count} workflow examples (incomplete) - reseeding...`);
        await this.qdrantService.deleteCollection(this.WORKFLOW_EXAMPLES_COLLECTION);
        await this.qdrantService.createCollection(
          this.WORKFLOW_EXAMPLES_COLLECTION,
          this.EMBEDDING_DIMENSION,
          'cosine',
        );
      }

      const examples = await this.getWorkflowExamples();
      this.logger.log(`Seeding ${examples.length} workflow examples...`);

      const vectors = [];

      for (const example of examples) {
        // 🎯 ENHANCED: Build rich embedding text with workflow structure
        const embeddingText = this.buildRichEmbeddingText(example);
        const embedding = await this.createEmbedding(embeddingText);

        vectors.push({
          id: example.id || `workflow_${Date.now()}_${Math.random().toString(36).substring(7)}`,
          vector: embedding,
          payload: example,
        });
      }

      await this.qdrantService.bulkInsertVectors(this.WORKFLOW_EXAMPLES_COLLECTION, vectors);

      this.logger.log(`✅ Seeded ${vectors.length} workflow examples`);
    } catch (error) {
      this.logger.error('Error seeding workflow examples:', error);
    }
  }

  /**
   * Seed workflow rules/patterns
   */
  private async seedWorkflowRules(): Promise<void> {
    try {
      const count = await this.qdrantService.countVectors(this.WORKFLOW_RULES_COLLECTION);
      if (count > 0) {
        this.logger.log(`Workflow rules already seeded (${count} rules)`);
        return;
      }

      const rules = this.getWorkflowRules();
      this.logger.log(`Seeding ${rules.length} workflow rules...`);

      const vectors = [];

      for (const rule of rules) {
        const embedding = await this.createEmbedding(rule.pattern);

        vectors.push({
          id: `rule_${Date.now()}_${Math.random().toString(36).substring(7)}`,
          vector: embedding,
          payload: rule,
        });
      }

      await this.qdrantService.bulkInsertVectors(this.WORKFLOW_RULES_COLLECTION, vectors);

      this.logger.log(`✅ Seeded ${vectors.length} workflow rules`);
    } catch (error) {
      this.logger.error('Error seeding workflow rules:', error);
    }
  }

  /**
   * Create embedding using OpenAI
   */
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

  /**
   * Build rich connector description for embedding
   */
  private buildConnectorDescription(connector: any): string {
    return `${connector.display_name}: ${connector.description}.
Category: ${connector.category}.
Triggers: ${connector.supported_triggers?.join(', ') || 'none'}.
Actions: ${connector.supported_actions?.join(', ') || 'none'}.
Auth: ${connector.auth_type}.
${connector.webhook_support ? 'Supports webhooks.' : ''}`;
  }

  /**
   * Get connector-specific examples
   */
  private getConnectorExamples(connectorName: string): string[] {
    const examples: Record<string, string[]> = {
      gmail: ['Send email when form submitted', 'Monitor inbox for new emails', 'Auto-reply to emails'],
      slack: ['Send notification to channel', 'Post message when event occurs', 'Create channel'],
      hubspot: ['Create contact from form', 'Update deal when status changes', 'Add to email sequence'],
      stripe: ['Process payment', 'Create subscription', 'Send invoice'],
      shopify: ['Create order', 'Update inventory', 'Send order confirmation'],
      'google-sheets': ['Add row to sheet', 'Read data from sheet', 'Update cell values'],
      twitter: ['Post tweet', 'Monitor mentions', 'Like and retweet'],
      facebook: ['Post to page', 'Monitor comments', 'Reply to messages'],
      telegram: ['Send message', 'Monitor bot commands', 'Send photo'],
      openai: ['Generate text', 'Analyze sentiment', 'Summarize content', 'Generate code'],
      airtable: ['Create record', 'Update record', 'Search records'],
      notion: ['Create page', 'Update database', 'Add to calendar'],
      jira: ['Create issue', 'Update status', 'Add comment'],
    };

    return examples[connectorName] || [`Use ${connectorName} for automation`];
  }

  /**
   * Get example workflows for seeding - NOW LOADS FROM DATABASE!
   * Fetches all verified templates from PostgreSQL instead of hardcoded examples
   */
  private async getWorkflowExamples(): Promise<any[]> {
    try {
      this.logger.log('📚 Loading workflow templates from database...');

      const result = await this.platformService.query(`
        SELECT
          id,
          name,
          description,
          category,
          canvas,
          steps,
          triggers,
          conditions,
          required_connectors,
          tags,
          ai_prompt,
          metadata
        FROM workflow_templates
        ORDER BY created_at DESC
        LIMIT 500
      `);

      this.logger.log(`✅ Loaded ${result.rows.length} templates from database`);

      // 🐛 DEBUG: Log template count
      if (result.rows.length < 100) {
        this.logger.warn(`⚠️ Only got ${result.rows.length} templates from database. You may want to add more templates.`);
      } else {
        this.logger.log(`✅ Successfully loaded ${result.rows.length} templates - ready for AI workflow generation!`);
      }

      return result.rows.map(template => {
        // Calculate complexity based on node count
        const nodeCount = template.canvas?.nodes?.length || 0;
        const complexity = nodeCount > 5 ? 'complex' : nodeCount > 2 ? 'medium' : 'simple';

        // Build searchable prompt text from multiple fields
        const searchableText = [
          template.name,
          template.description,
          template.ai_prompt,
          template.category,
          template.tags?.join(' '),
        ].filter(Boolean).join('. ');

        return {
          id: template.id,
          name: template.name,
          prompt: searchableText, // Rich text for better embedding matching
          description: template.description,
          category: template.category,
          connectors: template.required_connectors || [],
          complexity,
          canvas: template.canvas,
          steps: template.steps,
          triggers: template.triggers,
          conditions: template.conditions,
          tags: template.tags || [],
          metadata: template.metadata || {},
          // Extract node types for better matching
          nodeTypes: this.extractNodeTypes(template.canvas),
        };
      });
    } catch (error) {
      this.logger.error('Failed to load templates from database:', error);
      this.logger.warn('Falling back to minimal hardcoded examples');

      // Fallback to minimal examples if database fails
      return [
        {
          prompt: 'Send Slack notification when form is submitted',
          connectors: ['form', 'slack'],
          complexity: 'simple',
        },
      ];
    }
  }

  /**
   * Extract node types from canvas for better matching
   */
  private extractNodeTypes(canvas: any): string[] {
    if (!canvas?.nodes || !Array.isArray(canvas.nodes)) {
      return [];
    }

    return canvas.nodes
      .map((node: any) => node.type)
      .filter((type: string) => type && type.length > 0);
  }

  /**
   * Build rich embedding text that includes workflow structure
   * This helps AI match user prompts to similar workflow patterns
   */
  private buildRichEmbeddingText(template: any): string {
    const parts = [];

    // 1. Template name and description (primary)
    parts.push(template.name);
    if (template.description) {
      parts.push(template.description);
    }

    // 2. Category context
    if (template.category) {
      parts.push(`Category: ${template.category}`);
    }

    // 3. Workflow structure description
    if (template.triggers && template.triggers.length > 0) {
      const triggerTypes = template.triggers.map((t: any) => t.type || 'trigger').join(', ');
      parts.push(`Triggered by: ${triggerTypes}`);
    }

    // 4. Connectors used (important for matching)
    if (template.connectors && template.connectors.length > 0) {
      parts.push(`Uses connectors: ${template.connectors.join(', ')}`);
    }

    // 5. Node types (what actions does it perform)
    if (template.nodeTypes && template.nodeTypes.length > 0) {
      parts.push(`Workflow nodes: ${template.nodeTypes.join(', ')}`);
    }

    // 6. Complexity and tags
    if (template.complexity) {
      parts.push(`Complexity: ${template.complexity}`);
    }
    if (template.tags && template.tags.length > 0) {
      parts.push(`Tags: ${template.tags.join(', ')}`);
    }

    // 7. AI prompt if available (user-intent keywords)
    if (template.ai_prompt) {
      parts.push(template.ai_prompt);
    }

    // 8. Extract action descriptions from nodes
    if (template.canvas?.nodes) {
      const actions = template.canvas.nodes
        .filter((node: any) => node.data?.label || node.data?.description)
        .map((node: any) => node.data.label || node.data.description)
        .slice(0, 5); // Limit to first 5 for relevance

      if (actions.length > 0) {
        parts.push(`Actions: ${actions.join(', ')}`);
      }
    }

    return parts.filter(Boolean).join('. ');
  }

  /**
   * Get workflow rules/patterns
   */
  private getWorkflowRules(): any[] {
    return [
      {
        pattern: 'when email arrives, when new email, monitor inbox',
        connector: 'gmail',
        trigger_type: 'email_trigger',
      },
      {
        pattern: 'send notification, notify team, alert, post message',
        connector: 'slack',
        trigger_type: 'action',
      },
      {
        pattern: 'form submitted, form submission, user fills form',
        connector: 'form',
        trigger_type: 'form_trigger',
      },
      {
        pattern: 'payment received, payment success, charge card',
        connector: 'stripe',
        trigger_type: 'payment_trigger',
      },
      {
        pattern: 'create contact, add lead, new customer',
        connector: 'hubspot',
        trigger_type: 'action',
      },
      {
        pattern: 'update spreadsheet, add to sheet, save to sheets',
        connector: 'google-sheets',
        trigger_type: 'action',
      },
      {
        pattern: 'analyze with AI, use AI to analyze, sentiment analysis',
        connector: 'openai',
        trigger_type: 'action',
      },
      {
        pattern: 'create ticket, open issue, log bug',
        connector: 'jira',
        trigger_type: 'action',
      },
      {
        pattern: 'post to social media, share on twitter, tweet',
        connector: 'twitter',
        trigger_type: 'action',
      },
      {
        pattern: 'send telegram message, notify via telegram',
        connector: 'telegram',
        trigger_type: 'action',
      },
    ];
  }

  /**
   * Force re-seed (useful for updates)
   */
  async forceSeed(): Promise<void> {
    this.logger.log('Force re-seeding all collections...');

    // Delete existing collections
    await this.qdrantService.deleteCollection(this.CONNECTOR_DOCS_COLLECTION);
    await this.qdrantService.deleteCollection(this.WORKFLOW_EXAMPLES_COLLECTION);
    await this.qdrantService.deleteCollection(this.WORKFLOW_RULES_COLLECTION);

    // Re-seed
    await this.seedAllCollections();
  }

  /**
   * Get collection stats (for debugging)
   */
  async getStats(): Promise<any> {
    try {
      const connectorCount = await this.qdrantService.countVectors(this.CONNECTOR_DOCS_COLLECTION);
      const workflowCount = await this.qdrantService.countVectors(this.WORKFLOW_EXAMPLES_COLLECTION);
      const rulesCount = await this.qdrantService.countVectors(this.WORKFLOW_RULES_COLLECTION);

      return {
        connector_docs: connectorCount,
        workflow_examples: workflowCount,
        workflow_rules: rulesCount,
        status: workflowCount < 50 ? 'NEEDS_RESEED' : 'OK',
      };
    } catch (error) {
      this.logger.error('Error getting stats:', error);
      return { error: error.message };
    }
  }
}
