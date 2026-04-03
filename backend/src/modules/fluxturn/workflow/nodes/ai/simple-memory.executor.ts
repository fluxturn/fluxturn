import { Injectable, Optional } from '@nestjs/common';
import {
  BaseNodeExecutor,
  NodeData,
  NodeInputItem,
  NodeExecutionContext,
  NodeExecutionResult,
} from '../base';
import { SimpleMemoryService, ChatMemory, MemoryMessage } from '../../services/simple-memory.service';

/**
 * Simple Memory Executor
 * Provides in-memory conversation storage for AI Agent
 */
@Injectable()
export class SimpleMemoryExecutor extends BaseNodeExecutor {
  readonly supportedTypes = ['SIMPLE_MEMORY'];

  constructor(
    @Optional() private readonly simpleMemoryService?: SimpleMemoryService,
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

    this.logger.log('Executing Simple Memory node (memory provider)');

    if (!this.simpleMemoryService) {
      throw new Error('Simple Memory service not available');
    }

    // Get configuration
    const sessionIdType = config.sessionIdType || 'fromInput';
    const sessionKeyTemplate = config.sessionKey || '{{ $json.sessionId }}';
    const contextWindowLength = config.contextWindowLength || 5;

    // Extract workflow ID from context
    const workflowId = context.$workflow?.id || 'default';

    for (const item of inputData) {
      const itemContext = this.buildItemContext(item, context);

      // Resolve session ID
      let sessionId: string;

      if (sessionIdType === 'fromInput') {
        const itemData = item.json || item;
        const resolvedKey = this.resolveExpression(sessionKeyTemplate, itemContext);
        sessionId = resolvedKey || itemData.sessionId || 'default-session';
      } else if (sessionIdType === 'customKey') {
        sessionId = this.resolveExpression(sessionKeyTemplate, itemContext) || 'default-session';
      } else {
        sessionId = 'default-session';
      }

      this.logger.log(`Simple Memory - Using session: ${sessionId}, workflow: ${workflowId}`);

      // Get memory instance from service (includes history and helper methods)
      const chatMemory: ChatMemory = await this.simpleMemoryService.getMemory(
        workflowId,
        sessionId,
        contextWindowLength
      );

      // Create memory config for AI Agent
      const memoryConfig = {
        type: 'simple',
        sessionId,
        workflowId,
        contextWindowLength,
        history: chatMemory.messages,
        addMessage: async (role: 'human' | 'ai' | 'system', content: string) => {
          const message: MemoryMessage = { type: role, content };
          await chatMemory.addMessage(message);
        },
        getHistory: async () => {
          return chatMemory.getMessages();
        },
      };

      // Pass through input data with memory attached
      results.push({
        json: {
          ...(item.json || item),
          memory: memoryConfig,
        }
      });
    }

    return results;
  }
}
