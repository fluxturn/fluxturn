import { Injectable, Logger } from '@nestjs/common';
import OpenAI from 'openai';
import { BaseConnector } from '../../base/base.connector';
import {
  ConnectorMetadata,
  ConnectorAction,
  ConnectorCategory,
  ConnectorType,
  AuthType,
  ConnectorRequest,
} from '../../types';

/**
 * OpenAI Chat Model Connector
 * Provides OpenAI GPT model configuration for AI Agent nodes
 * This is a model provider that outputs model config, not an action executor
 */
@Injectable()
export class OpenAIChatbotConnector extends BaseConnector {
  protected readonly logger = new Logger(OpenAIChatbotConnector.name);
  private openai: OpenAI;

  getMetadata(): ConnectorMetadata {
    const actions: ConnectorAction[] = [
      {
        id: 'provide_model',
        name: 'Provide Model',
        description: 'Configure and provide OpenAI model for AI Agent',
        inputSchema: {
          model: {
            type: 'select',
            required: true,
            label: 'Model',
            default: 'gpt-4o-mini',
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
            required: false,
            label: 'Sampling Temperature',
            default: 0.7,
          },
          maxTokens: {
            type: 'number',
            required: false,
            label: 'Maximum Number of Tokens',
            default: 4096,
          },
          topP: {
            type: 'number',
            required: false,
            label: 'Top P',
            default: 1,
          },
          frequencyPenalty: {
            type: 'number',
            required: false,
            label: 'Frequency Penalty',
            default: 0,
          },
          presencePenalty: {
            type: 'number',
            required: false,
            label: 'Presence Penalty',
            default: 0,
          },
        },
        outputSchema: {
          modelConfig: { type: 'object', required: true },
        },
      },
    ];

    return {
      name: 'OpenAI Chat Model',
      type: ConnectorType.OPENAI_CHATBOT,
      description: 'Provides OpenAI GPT model configuration for AI Agent nodes',
      version: '1.0.0',
      category: ConnectorCategory.AI,
      logoUrl: 'https://openai.com/favicon.ico',
      documentationUrl: 'https://platform.openai.com/docs',
      authType: AuthType.API_KEY,
      actions,
      triggers: [],
      webhookSupport: false,
      rateLimit: {
        requestsPerMinute: 60,
        requestsPerDay: 1000,
      },
    };
  }

  protected async initializeConnection(): Promise<void> {
    const apiKey = this.config.credentials.apiKey;
    if (!apiKey) {
      throw new Error('OpenAI API key is required');
    }

    const organization = this.config.credentials.organization;

    this.openai = new OpenAI({
      apiKey,
      organization: organization || undefined,
      timeout: 60000, // 60 seconds
    });

    this.logger.log('OpenAI Chat Model connector initialized');
  }

  protected async performConnectionTest(): Promise<boolean> {
    try {
      // Test the connection by listing models
      const models = await this.openai.models.list();
      return models.data.length > 0;
    } catch (error) {
      this.logger.error('OpenAI Chat Model connection test failed:', error);
      return false;
    }
  }

  protected async performHealthCheck(): Promise<void> {
    const models = await this.openai.models.list();
    if (models.data.length === 0) {
      throw new Error('No models available');
    }
  }

  protected async performRequest(request: ConnectorRequest): Promise<any> {
    throw new Error('Use performAction for OpenAI Chat Model');
  }

  protected async performAction(actionId: string, input: any): Promise<any> {
    this.logger.log(`Performing OpenAI Chat Model action: ${actionId}`);

    if (actionId === 'provide_model') {
      return await this.provideModel(input);
    }

    throw new Error(`Unknown action: ${actionId}`);
  }

  protected async cleanup(): Promise<void> {
    // OpenAI client doesn't require explicit cleanup
  }

  /**
   * Provide model configuration
   * Returns the model config with all parameters for AI Agent to use
   */
  private async provideModel(input: any): Promise<any> {
    const {
      model = 'gpt-4o-mini',
      temperature = 0.7,
      maxTokens = 4096,
      topP = 1,
      frequencyPenalty = 0,
      presencePenalty = 0,
    } = input;

    return {
      modelConfig: {
        provider: 'openai',
        model,
        apiKey: this.config.credentials.apiKey,
        organization: this.config.credentials.organization,
        baseUrl: 'https://api.openai.com/v1',
        temperature,
        maxTokens,
        topP,
        frequencyPenalty,
        presencePenalty,
      },
    };
  }
}
