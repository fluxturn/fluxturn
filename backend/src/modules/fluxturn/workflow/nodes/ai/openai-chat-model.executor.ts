import { Injectable, Optional } from '@nestjs/common';
import OpenAI from 'openai';
import {
  BaseNodeExecutor,
  NodeData,
  NodeInputItem,
  NodeExecutionContext,
  NodeExecutionResult,
} from '../base';
import { ConnectorsService } from '../../../connectors/connectors.service';

/**
 * OpenAI Chat Model Executor
 * Configures an OpenAI model for use with AI Agent
 */
@Injectable()
export class OpenAIChatModelExecutor extends BaseNodeExecutor {
  readonly supportedTypes = ['OPENAI_CHAT_MODEL'];

  constructor(
    @Optional() private readonly connectorsService?: ConnectorsService,
  ) {
    super();
  }

  protected async executeInternal(
    node: NodeData,
    inputData: NodeInputItem[],
    context: NodeExecutionContext,
  ): Promise<NodeExecutionResult> {
    const config = node.data || {};
    const results: NodeInputItem[] = [];

    this.logger.log('Executing OpenAI Chat Model node (model configuration provider)');

    // Get model configuration
    const model = config.model || 'gpt-4o-mini';
    const temperature = config.temperature ?? 0.7;
    const maxTokens = config.maxTokens || 2048;
    const topP = config.topP ?? 1;
    const frequencyPenalty = config.frequencyPenalty ?? 0;
    const presencePenalty = config.presencePenalty ?? 0;

    // Get credentials if configured
    const credentialId = config.credentialId;
    let apiKey: string | undefined;

    if (credentialId && this.connectorsService) {
      try {
        const credentials = await this.connectorsService.getConnectorCredentials(credentialId);
        apiKey = credentials.apiKey;
      } catch (error: any) {
        this.logger.warn(`Failed to get OpenAI credentials: ${error.message}`);
      }
    }

    // Process each input item
    for (const item of inputData) {
      // Build model configuration that AI Agent will use
      const modelConfig = {
        provider: 'openai',
        model,
        temperature,
        maxTokens,
        topP,
        frequencyPenalty,
        presencePenalty,
        apiKey, // Will be used by AI Agent for authentication
      };

      // Pass through input data with model config attached
      results.push({
        json: {
          ...(item.json || item),
          modelConfig,
        }
      });
    }

    return results;
  }
}
