import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { PlatformService } from '../../../database/platform.service';
import { v4 as uuidv4 } from 'uuid';

/**
 * OpenAI Chat Model Seeder
 * Seeds the OpenAI Chat Model connector into the connectors table
 * This is a model provider node that outputs configured model for AI Agent
 */
@Injectable()
export class OpenAIChatbotSeederService implements OnModuleInit {
  private readonly logger = new Logger(OpenAIChatbotSeederService.name);

  constructor(private readonly platformService: PlatformService) {}

  async onModuleInit() {
    this.logger.log('🤖 Seeding OpenAI Chat Model connector...');
    await this.seedOpenAIChatbot();
  }

  private async seedOpenAIChatbot(): Promise<void> {
    try {
      const connectorName = 'openai_chatbot';

      // Check if connector already exists
      const existingQuery = `
        SELECT * FROM connectors WHERE name = $1
      `;
      const existing = await this.platformService.query(existingQuery, [connectorName]);

      if (existing.rows.length > 0) {
        this.logger.log('✅ OpenAI Chat Model connector already exists, skipping...');
        return;
      }

      // Insert the OpenAI Chatbot connector
      const insertQuery = `
        INSERT INTO connectors (
          id, name, display_name, description, category, type,
          status, is_public, auth_type, auth_fields, endpoints,
          webhook_support, rate_limits, sandbox_available, capabilities,
          supported_triggers, supported_actions, oauth_config,
          created_at, updated_at
        ) VALUES (
          $1, $2, $3, $4, $5, $6,
          $7, $8, $9, $10::jsonb, $11::jsonb,
          $12, $13::jsonb, $14, $15::jsonb,
          $16::jsonb, $17::jsonb, $18::jsonb,
          NOW(), NOW()
        )
      `;

      const connectorData = {
        id: uuidv4(),
        name: 'openai_chatbot',
        display_name: 'OpenAI Chat Model',
        description: 'Provides OpenAI GPT model configuration for AI Agent nodes',
        category: 'ai',
        type: 'official',
        status: 'active',
        is_public: true,
        auth_type: 'api_key',
        auth_fields: {
          apiKey: {
            type: 'string',
            label: 'API Key',
            required: true,
            description: 'Your OpenAI API key',
            placeholder: 'sk-...',
          },
          organization: {
            type: 'string',
            label: 'Organization ID (Optional)',
            required: false,
            description: 'Your OpenAI organization ID',
            placeholder: 'org-...',
          },
        },
        endpoints: {
          base_url: 'https://api.openai.com',
          chat_completions: '/v1/chat/completions',
          models: '/v1/models',
        },
        webhook_support: false,
        rate_limits: {
          requests_per_minute: 60,
          tokens_per_minute: 90000,
        },
        sandbox_available: false,
        capabilities: {
          streaming: true,
          function_calling: true,
          vision: false,
          embeddings: false,
          model_provider: true,
        },
        supported_triggers: [],
        supported_actions: [
          {
            id: 'provide_model',
            name: 'Provide Model',
            description: 'Configure and provide OpenAI model for AI Agent',
            category: 'Model Provider',
            icon: 'Brain',
            inputSchema: {
              model: {
                type: 'select',
                label: 'Model',
                required: true,
                default: 'gpt-4o-mini',
                description: 'The OpenAI model to use',
                options: [
                  { label: 'GPT-4o', value: 'gpt-4o' },
                  { label: 'GPT-4o Mini', value: 'gpt-4o-mini' },
                  { label: 'GPT-4 Turbo', value: 'gpt-4-turbo' },
                  { label: 'GPT-4', value: 'gpt-4' },
                  { label: 'GPT-3.5 Turbo', value: 'gpt-3.5-turbo' },
                ],
              },
              temperature: {
                type: 'number',
                label: 'Sampling Temperature',
                required: false,
                default: 0.7,
                min: 0,
                max: 2,
                step: 0.1,
                description: 'Controls randomness (0-2)',
              },
              maxTokens: {
                type: 'number',
                label: 'Maximum Number of Tokens',
                required: false,
                default: 4096,
                min: 1,
                max: 128000,
                description: 'Maximum tokens in response',
              },
              topP: {
                type: 'number',
                label: 'Top P',
                required: false,
                default: 1,
                min: 0,
                max: 1,
                step: 0.1,
                description: 'Nucleus sampling threshold',
              },
              frequencyPenalty: {
                type: 'number',
                label: 'Frequency Penalty',
                required: false,
                default: 0,
                min: -2,
                max: 2,
                step: 0.1,
                description: 'Reduces repetition',
              },
              presencePenalty: {
                type: 'number',
                label: 'Presence Penalty',
                required: false,
                default: 0,
                min: -2,
                max: 2,
                step: 0.1,
                description: 'Encourages new topics',
              },
            },
            outputSchema: {
              modelConfig: {
                type: 'object',
                description: 'OpenAI model configuration',
                properties: {
                  provider: 'string',
                  model: 'string',
                  apiKey: 'string',
                  organization: 'string',
                  temperature: 'number',
                  maxTokens: 'number',
                  topP: 'number',
                  frequencyPenalty: 'number',
                  presencePenalty: 'number',
                },
              },
            },
          },
        ],
        oauth_config: null,
      };

      await this.platformService.query(insertQuery, [
        connectorData.id,
        connectorData.name,
        connectorData.display_name,
        connectorData.description,
        connectorData.category,
        connectorData.type,
        connectorData.status,
        connectorData.is_public,
        connectorData.auth_type,
        JSON.stringify(connectorData.auth_fields),
        JSON.stringify(connectorData.endpoints),
        connectorData.webhook_support,
        JSON.stringify(connectorData.rate_limits),
        connectorData.sandbox_available,
        JSON.stringify(connectorData.capabilities),
        JSON.stringify(connectorData.supported_triggers),
        JSON.stringify(connectorData.supported_actions),
        connectorData.oauth_config,
      ]);

      this.logger.log(`✅ Successfully seeded OpenAI Chat Model connector`);
    } catch (error) {
      this.logger.error('Error seeding OpenAI Chat Model connector:', error);
      throw error;
    }
  }
}
