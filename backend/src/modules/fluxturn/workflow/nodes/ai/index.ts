import { NodeCategory } from '../base';
import { AIAgentExecutor } from './ai-agent.executor';
import { OpenAIChatModelExecutor } from './openai-chat-model.executor';
import { SimpleMemoryExecutor } from './simple-memory.executor';
import { RedisMemoryExecutor } from './redis-memory.executor';

// Export all AI executors
export { AIAgentExecutor } from './ai-agent.executor';
export { OpenAIChatModelExecutor } from './openai-chat-model.executor';
export { SimpleMemoryExecutor } from './simple-memory.executor';
export { RedisMemoryExecutor } from './redis-memory.executor';

// All AI executor classes for module registration
export const AIExecutors = [
  AIAgentExecutor,
  OpenAIChatModelExecutor,
  SimpleMemoryExecutor,
  RedisMemoryExecutor,
];

// Registration metadata for each AI node
export const AIRegistrations = [
  {
    executor: AIAgentExecutor,
    options: {
      category: NodeCategory.AI,
      description: 'AI agent with tool support',
    },
  },
  {
    executor: OpenAIChatModelExecutor,
    options: {
      category: NodeCategory.AI,
      description: 'OpenAI model configuration',
    },
  },
  {
    executor: SimpleMemoryExecutor,
    options: {
      category: NodeCategory.AI,
      description: 'In-memory conversation storage',
    },
  },
  {
    executor: RedisMemoryExecutor,
    options: {
      category: NodeCategory.AI,
      description: 'Redis-backed conversation storage',
    },
  },
];
