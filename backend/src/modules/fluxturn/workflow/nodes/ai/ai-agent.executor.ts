import { Injectable, Optional } from '@nestjs/common';
import {
  BaseNodeExecutor,
  NodeData,
  NodeInputItem,
  NodeExecutionContext,
  NodeExecutionResult,
} from '../base';

/**
 * AI Agent Executor
 * Executes AI agent with tool support
 * NOTE: This requires AIAgentService and ToolRegistryService to be injected
 */
@Injectable()
export class AIAgentExecutor extends BaseNodeExecutor {
  readonly supportedTypes = ['AI_AGENT'];

  protected async executeInternal(
    node: NodeData,
    inputData: NodeInputItem[],
    context: NodeExecutionContext,
  ): Promise<NodeExecutionResult> {
    const config = node.data || {};
    const results: NodeInputItem[] = [];

    this.logger.log('Executing AI Agent node (with tool support)');

    for (const item of inputData) {
      const itemContext = this.buildItemContext(item, context);

      // Get configuration
      const systemPrompt = this.resolveExpression(config.systemPrompt, itemContext) || 'You are a helpful AI assistant.';

      // Extract input message
      let rawInput = config.input;
      if (!rawInput) {
        const json = item.json || item;
        rawInput = json.input ||
                   json.chatInput ||
                   json.text ||
                   json.telegramEvent?.message?.text ||
                   json.message?.text ||
                   json.content ||
                   json.triggerData?.message?.text ||
                   json.data?.message?.text ||
                   (typeof json.message === 'string' ? json.message : null);
      }
      const input = this.resolveExpression(rawInput, itemContext);

      // Extract connected node data
      const modelConfig = (item.json as any)?.modelConfig;
      const memory = (item.json as any)?.memory || null;

      if (!modelConfig) {
        throw new Error('No model configuration provided. Connect an OpenAI Chat Model node to the "model" input handle.');
      }

      if (!input) {
        throw new Error('No input message provided for AI Agent.');
      }

      // NOTE: Full implementation requires:
      // - AIAgentService for agent execution
      // - ToolRegistryService for tool management
      // - ConnectorToolProviderService for connector-based tools

      // For now, return placeholder
      this.logger.warn('AI Agent executor requires full service integration');

      results.push({
        json: {
          output: 'AI Agent execution requires service integration',
          systemPrompt,
          input,
          hasModelConfig: !!modelConfig,
          hasMemory: !!memory,
        }
      });
    }

    return results;
  }
}
