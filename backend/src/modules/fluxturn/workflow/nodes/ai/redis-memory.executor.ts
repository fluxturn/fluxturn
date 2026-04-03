import { Injectable, Optional } from '@nestjs/common';
import {
  BaseNodeExecutor,
  NodeData,
  NodeInputItem,
  NodeExecutionContext,
  NodeExecutionResult,
} from '../base';
import { RedisMemoryService, RedisChatMemory, MemoryMessage, RedisCredentials } from '../../services/redis-memory.service';
import { ConnectorsService } from '../../../connectors/connectors.service';

/**
 * Redis Memory Executor
 * Provides Redis-backed conversation storage for AI Agent
 */
@Injectable()
export class RedisMemoryExecutor extends BaseNodeExecutor {
  readonly supportedTypes = ['REDIS_MEMORY'];

  constructor(
    @Optional() private readonly redisMemoryService?: RedisMemoryService,
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

    this.logger.log('Executing Redis Memory node (memory provider)');

    if (!this.redisMemoryService) {
      throw new Error('Redis Memory service not available');
    }

    // Get configuration
    const sessionIdType = config.sessionIdType || 'fromInput';
    const sessionKeyTemplate = config.sessionKey || '{{ $json.sessionId }}';
    const contextWindowLength = config.contextWindowLength || 5;
    const sessionTTL = config.sessionTTL || 3600; // 1 hour default

    // Extract workflow ID from context
    const workflowId = context.$workflow?.id || 'default';

    // Get Redis credentials if configured
    let redisCredentials: RedisCredentials | undefined;
    const credentialId = config.credentialId;

    if (credentialId && this.connectorsService) {
      try {
        const credentials = await this.connectorsService.getConnectorCredentials(credentialId);
        redisCredentials = {
          host: credentials.host || 'localhost',
          port: credentials.port || 6379,
          password: credentials.password,
          database: credentials.database || 0,
          username: credentials.username,
          ssl: credentials.ssl,
        };
      } catch (error: any) {
        this.logger.warn(`Failed to get Redis credentials: ${error.message}, using defaults`);
      }
    }

    // Create Redis client (use custom credentials or default connection)
    const redisClient = redisCredentials
      ? await this.redisMemoryService.createRedisClient(redisCredentials)
      : null;

    try {
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

        this.logger.log(`Redis Memory - Using session: ${sessionId}, workflow: ${workflowId}`);

        // If we have a custom Redis client, use the getMemory method
        // Otherwise, provide a simplified memory config
        let memoryConfig: any;

        if (redisClient) {
          const chatMemory: RedisChatMemory = await this.redisMemoryService.getMemory(
            redisClient,
            workflowId,
            sessionId,
            contextWindowLength,
            sessionTTL
          );

          memoryConfig = {
            type: 'redis',
            sessionId,
            workflowId,
            contextWindowLength,
            sessionTTL,
            history: chatMemory.messages,
            addMessage: async (role: 'human' | 'ai' | 'system', content: string) => {
              const message: MemoryMessage = { type: role, content };
              await chatMemory.addMessage(message);
            },
            getHistory: async () => {
              return chatMemory.getMessages();
            },
          };
        } else {
          // Fallback: provide config without active Redis client
          // AI Agent will need to handle this case
          memoryConfig = {
            type: 'redis',
            sessionId,
            workflowId,
            contextWindowLength,
            sessionTTL,
            history: [],
            error: 'Redis client not available - configure credentials or use Simple Memory',
          };
          this.logger.warn('Redis Memory: No Redis client available, returning empty history');
        }

        // Pass through input data with memory attached
        results.push({
          json: {
            ...(item.json || item),
            memory: memoryConfig,
          }
        });
      }
    } finally {
      // Close custom Redis client if we created one
      if (redisClient) {
        await this.redisMemoryService.closeClient(redisClient);
      }
    }

    return results;
  }
}
