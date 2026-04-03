import { Injectable, Logger } from '@nestjs/common';
import { AIBaseService } from '../../ai/ai-base.service';

export interface EntityDefinition {
  name: string;
  tableName: string;
  columns: Array<{
    name: string;
    type: string;
    primaryKey?: boolean;
    unique?: boolean;
    nullable?: boolean;
    default?: any;
    references?: {
      table: string;
      column: string;
    };
  }>;
  indexes?: Array<{
    name: string;
    columns: string[];
    unique?: boolean;
  }>;
  relationships?: Array<{
    type: 'hasOne' | 'hasMany' | 'belongsTo' | 'belongsToMany';
    entity: string;
    through?: string;
  }>;
}

@Injectable()
export class EntityGeneratorUtil {
  private readonly logger = new Logger(EntityGeneratorUtil.name);

  constructor(private readonly aiService: AIBaseService) {}

  /**
   * Detect app type using pure AI detection
   */
  async detectAppType(description: string): Promise<string> {
    const aiPrompt = `Analyze this app description and identify a concise app type category.

Description: "${description}"

Common app categories for reference:
- ecommerce, marketplace, dropshipping, subscription-box, digital-products, auction
- blog, news-portal, magazine, documentation, wiki, portfolio, podcast, video-platform
- social-network, dating, messaging, community, professional-network, photo-sharing
- crm, erp, project-management, hr-management, accounting, inventory-management, helpdesk
- booking, appointment, field-service, property-management, event-management

Return a concise type identifier (kebab-case, e.g., "ecommerce-store", "project-management", "social-platform").
If it's a unique/custom app, return "custom".

App type:`;

    try {
      const result = await this.aiService.generateText(aiPrompt, {
        temperature: 0.3,
        maxTokens: 50,
        modelType: 'reasoning'
      });

      const detectedType = result.text?.trim().toLowerCase().replace(/['"]/g, '') || 'custom';
      this.logger.log(`🎯 AI detected app type: ${detectedType}`);
      return detectedType;

    } catch (error) {
      this.logger.error(`Failed to detect app type via AI: ${error.message}`);
      return 'custom';
    }
  }

  /**
   * Generate entities based on app type and description
   */
  async generateEntities(
    appType: string,
    appName: string,
    description?: string,
    additionalRequirements?: string
  ): Promise<EntityDefinition[]> {
    // ✅ Pure AI generation - no registry needed
    this.logger.log('🤖 Using pure AI for database entity generation...');

    const systemPrompt = `You are an expert database architect. Generate a complete database schema with entities (tables) for the specified application.
    
STRICT RULES:
1. Return ONLY valid JSON array of entity definitions
2. Each entity must have id (uuid), created_at, and updated_at columns
3. Use PostgreSQL data types: uuid, text, varchar, integer, bigint, decimal, boolean, timestamp, date, json, jsonb
4. Include proper foreign key relationships
5. Add appropriate indexes for performance
6. Follow naming conventions: snake_case for table and column names
7. Include audit fields where appropriate (created_by, updated_by, deleted_at for soft deletes)
8. CRITICAL: DO NOT create a users table. Each tenant database already has auth.users table for authentication
9. For any user relationships, use user_id (uuid) that references the existing auth.users(id) table
10. When referencing users, the foreign key should be: {"table": "auth.users", "column": "id"}
11. The auth.users table is pre-created in each tenant database and should not be included in your schema

ENTITY STRUCTURE:
{
  "name": "EntityName",
  "tableName": "table_name",
  "columns": [
    {
      "name": "column_name",
      "type": "data_type",
      "primaryKey": boolean,
      "unique": boolean,
      "nullable": boolean,
      "default": "default_value or null",
      "references": { "table": "referenced_table", "column": "referenced_column" }
    }
  ],
  "indexes": [
    {
      "name": "index_name",
      "columns": ["column1", "column2"],
      "unique": boolean
    }
  ],
  "relationships": [
    {
      "type": "hasMany|hasOne|belongsTo|belongsToMany",
      "entity": "RelatedEntity",
      "through": "junction_table_name (for many-to-many)"
    }
  ]
}`;

    let userPrompt = `Generate database entities for:
App Type: ${appType}
App Name: ${appName}
${description ? `Description: ${description}` : ''}
${additionalRequirements ? `Additional Requirements: ${additionalRequirements}` : ''}

IMPORTANT: The tenant database already has auth.users table. DO NOT create a users table.
For any user relationships, use user_id referencing auth.users(id).

Analyze the app description carefully and design a comprehensive database schema that fulfills all requirements.
`;

    // Add examples for specific app types
    const exampleSchemas = this.getExampleSchema(appType);
    if (exampleSchemas) {
      userPrompt += `

Here's an example structure to guide you (adapt and expand as needed):
${JSON.stringify(exampleSchemas, null, 2)}`;
    }

    userPrompt += `

Generate a complete, production-ready database schema. Return ONLY the JSON array of entities.`;

    try {
      const result = await this.aiService.generateText(userPrompt, {
        systemMessage: systemPrompt,
        temperature: 0.4,
        maxTokens: 4000,
        modelType: 'code'
      });

      // Extract JSON from the response
      let entities: EntityDefinition[];
      const jsonMatch = result.text?.match(/\[[\s\S]*\]/);
      
      if (jsonMatch) {
        try {
          entities = JSON.parse(jsonMatch[0]);
        } catch (parseError) {
          this.logger.error(`Failed to parse AI response as JSON: ${parseError.message}`);
          entities = this.getDefaultEntities(appType);
        }
      } else {
        this.logger.warn('No JSON found in AI response, using default entities');
        entities = this.getDefaultEntities(appType);
      }

      // Validate and clean entities
      entities = this.validateAndCleanEntities(entities);
      
      return entities;
    } catch (error) {
      this.logger.error(`Failed to generate entities via AI: ${error.message}`);
      return this.getDefaultEntities(appType);
    }
  }

  /**
   * Get example schema for specific app types
   */
  private getExampleSchema(appType: string): EntityDefinition[] | null {
    const examples: Record<string, EntityDefinition[]> = {
      'ecommerce-basic': [
        {
          name: 'Product',
          tableName: 'products',
          columns: [
            { name: 'id', type: 'uuid', primaryKey: true, default: 'gen_random_uuid()' },
            { name: 'name', type: 'varchar(255)', nullable: false },
            { name: 'slug', type: 'varchar(255)', unique: true, nullable: false },
            { name: 'description', type: 'text' },
            { name: 'price', type: 'decimal(10,2)', nullable: false },
            { name: 'category_id', type: 'uuid', references: { table: 'categories', column: 'id' } },
            { name: 'stock_quantity', type: 'integer', default: 0 },
            { name: 'featured', type: 'boolean', default: false },
            { name: 'status', type: 'varchar(50)', default: 'active' },
            { name: 'created_at', type: 'timestamp', default: 'now()' },
            { name: 'updated_at', type: 'timestamp', default: 'now()' }
          ],
          indexes: [
            { name: 'idx_products_slug', columns: ['slug'], unique: true },
            { name: 'idx_products_category', columns: ['category_id'] },
            { name: 'idx_products_status', columns: ['status'] }
          ]
        }
      ],
      'blog': [
        {
          name: 'Post',
          tableName: 'posts',
          columns: [
            { name: 'id', type: 'uuid', primaryKey: true, default: 'gen_random_uuid()' },
            { name: 'title', type: 'varchar(255)', nullable: false },
            { name: 'slug', type: 'varchar(255)', unique: true, nullable: false },
            { name: 'content', type: 'text', nullable: false },
            { name: 'excerpt', type: 'text' },
            { name: 'author_id', type: 'uuid', references: { table: 'auth.users', column: 'id' } },
            { name: 'category_id', type: 'uuid', references: { table: 'categories', column: 'id' } },
            { name: 'featured_image', type: 'text' },
            { name: 'status', type: 'varchar(50)', default: 'draft' },
            { name: 'published_at', type: 'timestamp' },
            { name: 'view_count', type: 'integer', default: 0 },
            { name: 'created_at', type: 'timestamp', default: 'now()' },
            { name: 'updated_at', type: 'timestamp', default: 'now()' }
          ],
          indexes: [
            { name: 'idx_posts_slug', columns: ['slug'], unique: true },
            { name: 'idx_posts_author', columns: ['author_id'] },
            { name: 'idx_posts_category', columns: ['category_id'] },
            { name: 'idx_posts_status', columns: ['status'] },
            { name: 'idx_posts_published', columns: ['published_at'] }
          ]
        }
      ],
      'crm': [
        {
          name: 'Contact',
          tableName: 'contacts',
          columns: [
            { name: 'id', type: 'uuid', primaryKey: true, default: 'gen_random_uuid()' },
            { name: 'first_name', type: 'varchar(100)', nullable: false },
            { name: 'last_name', type: 'varchar(100)', nullable: false },
            { name: 'email', type: 'varchar(255)', unique: true, nullable: false },
            { name: 'phone', type: 'varchar(50)' },
            { name: 'company_id', type: 'uuid', references: { table: 'companies', column: 'id' } },
            { name: 'lead_status', type: 'varchar(50)', default: 'new' },
            { name: 'assigned_to', type: 'uuid', references: { table: 'auth.users', column: 'id' } },
            { name: 'tags', type: 'jsonb', default: '[]' },
            { name: 'created_at', type: 'timestamp', default: 'now()' },
            { name: 'updated_at', type: 'timestamp', default: 'now()' }
          ],
          indexes: [
            { name: 'idx_contacts_email', columns: ['email'], unique: true },
            { name: 'idx_contacts_company', columns: ['company_id'] },
            { name: 'idx_contacts_assigned', columns: ['assigned_to'] }
          ]
        }
      ]
    };

    return examples[appType] || null;
  }

  /**
   * Get default entities for fallback
   */
  private getDefaultEntities(appType: string): EntityDefinition[] {
    // No User entity - auth.users is pre-created in each tenant database
    const baseEntities: EntityDefinition[] = [];

    // Add app-type specific default entities
    if (appType.includes('ecommerce') || appType.includes('shop')) {
      baseEntities.push(
        {
          name: 'Product',
          tableName: 'products',
          columns: [
            { name: 'id', type: 'uuid', primaryKey: true, default: 'gen_random_uuid()' },
            { name: 'name', type: 'varchar(255)', nullable: false },
            { name: 'description', type: 'text' },
            { name: 'price', type: 'decimal(10,2)', nullable: false },
            { name: 'stock', type: 'integer', default: 0 },
            { name: 'created_at', type: 'timestamp', default: 'now()' },
            { name: 'updated_at', type: 'timestamp', default: 'now()' }
          ],
          indexes: []
        },
        {
          name: 'Order',
          tableName: 'orders',
          columns: [
            { name: 'id', type: 'uuid', primaryKey: true, default: 'gen_random_uuid()' },
            { name: 'user_id', type: 'uuid', references: { table: 'auth.users', column: 'id' } },
            { name: 'total_amount', type: 'decimal(10,2)', nullable: false },
            { name: 'status', type: 'varchar(50)', default: 'pending' },
            { name: 'created_at', type: 'timestamp', default: 'now()' },
            { name: 'updated_at', type: 'timestamp', default: 'now()' }
          ],
          indexes: [
            { name: 'idx_orders_user', columns: ['user_id'] }
          ]
        }
      );
    } else if (appType.includes('blog')) {
      baseEntities.push({
        name: 'Post',
        tableName: 'posts',
        columns: [
          { name: 'id', type: 'uuid', primaryKey: true, default: 'gen_random_uuid()' },
          { name: 'title', type: 'varchar(255)', nullable: false },
          { name: 'content', type: 'text', nullable: false },
          { name: 'author_id', type: 'uuid', references: { table: 'auth.users', column: 'id' } },
          { name: 'published', type: 'boolean', default: false },
          { name: 'created_at', type: 'timestamp', default: 'now()' },
          { name: 'updated_at', type: 'timestamp', default: 'now()' }
        ],
        indexes: [
          { name: 'idx_posts_author', columns: ['author_id'] }
        ]
      });
    }

    return baseEntities;
  }

  /**
   * Validate and clean entities
   */
  private validateAndCleanEntities(entities: EntityDefinition[]): EntityDefinition[] {
    return entities.map(entity => {
      // Ensure required columns exist
      const hasId = entity.columns.some(col => col.name === 'id' && col.primaryKey);
      const hasCreatedAt = entity.columns.some(col => col.name === 'created_at');
      const hasUpdatedAt = entity.columns.some(col => col.name === 'updated_at');

      if (!hasId) {
        entity.columns.unshift({
          name: 'id',
          type: 'uuid',
          primaryKey: true,
          default: 'gen_random_uuid()'
        });
      }

      if (!hasCreatedAt) {
        entity.columns.push({
          name: 'created_at',
          type: 'timestamp',
          default: 'now()'
        });
      }

      if (!hasUpdatedAt) {
        entity.columns.push({
          name: 'updated_at',
          type: 'timestamp',
          default: 'now()'
        });
      }

      // Clean column types
      entity.columns = entity.columns.map(col => ({
        ...col,
        type: this.normalizeDataType(col.type)
      }));

      // Ensure table name is snake_case
      if (!entity.tableName) {
        entity.tableName = this.toSnakeCase(entity.name) + 's';
      }

      return entity;
    });
  }

  /**
   * Normalize data types to PostgreSQL standards
   */
  private normalizeDataType(type: string): string {
    const typeMap: Record<string, string> = {
      'string': 'text',
      'int': 'integer',
      'float': 'decimal(10,2)',
      'double': 'decimal(10,2)',
      'datetime': 'timestamp',
      'bool': 'boolean',
      'array': 'jsonb',
      'object': 'jsonb'
    };

    return typeMap[type.toLowerCase()] || type.toLowerCase();
  }

  /**
   * Convert to snake_case
   */
  private toSnakeCase(str: string): string {
    return str
      .replace(/([A-Z])/g, '_$1')
      .toLowerCase()
      .replace(/^_/, '');
  }
}