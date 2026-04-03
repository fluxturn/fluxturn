import { Injectable, Logger } from '@nestjs/common';

/**
 * Simple Memory Service
 *
 * In-memory conversation storage for AI agents.
 * Based on n8n's MemoryBufferWindow implementation.
 *
 * Features:
 * - Windowed memory (keeps last N messages)
 * - Session-based isolation (workflowId + sessionId)
 * - Auto-cleanup (1 hour inactivity)
 * - No external dependencies (stored in RAM)
 *
 * Use Cases:
 * - Prototyping AI chatbots
 * - Simple conversational agents
 * - Development and testing
 *
 * Limitations:
 * - Data lost on server restart
 * - Not suitable for production multi-instance deployments
 * - Memory usage grows with active sessions
 */
@Injectable()
export class SimpleMemoryService {
  private readonly logger = new Logger(SimpleMemoryService.name);

  // In-memory storage: Map<memoryKey, MemoryInstance>
  private memoryBuffer: Map<string, MemoryInstance> = new Map();

  // Cleanup interval (run every 15 minutes)
  private cleanupInterval: NodeJS.Timeout;

  // Session timeout (1 hour)
  private readonly SESSION_TIMEOUT_MS = 60 * 60 * 1000;

  constructor() {
    // Start automatic cleanup
    this.startCleanupTimer();
    this.logger.log('Simple Memory Service initialized');
  }

  /**
   * Get or create memory for a session
   */
  async getMemory(
    workflowId: string,
    sessionId: string,
    contextWindowLength: number = 5,
  ): Promise<ChatMemory> {
    const memoryKey = this.buildMemoryKey(workflowId, sessionId);

    // Cleanup stale buffers before proceeding
    await this.cleanupStaleBuffers();

    let memoryInstance = this.memoryBuffer.get(memoryKey);

    if (memoryInstance) {
      // Update last accessed time
      memoryInstance.lastAccessed = new Date();
      this.logger.debug(`Retrieved existing memory for ${memoryKey}`);
    } else {
      // Create new memory instance
      memoryInstance = {
        messages: [],
        contextWindowLength,
        created: new Date(),
        lastAccessed: new Date(),
      };

      this.memoryBuffer.set(memoryKey, memoryInstance);
      this.logger.log(`Created new memory for ${memoryKey} (window: ${contextWindowLength})`);
    }

    return this.buildChatMemory(memoryInstance, memoryKey);
  }

  /**
   * Add a message to memory
   */
  async addMessage(
    workflowId: string,
    sessionId: string,
    message: MemoryMessage,
  ): Promise<void> {
    const memoryKey = this.buildMemoryKey(workflowId, sessionId);
    const memoryInstance = this.memoryBuffer.get(memoryKey);

    if (!memoryInstance) {
      this.logger.warn(`Attempted to add message to non-existent memory: ${memoryKey}`);
      return;
    }

    // Add message
    memoryInstance.messages.push({
      ...message,
      timestamp: new Date(),
    });

    // Trim to context window (keep last N pairs)
    // Each pair = 2 messages (user + assistant or human + ai)
    const maxMessages = memoryInstance.contextWindowLength * 2;
    if (memoryInstance.messages.length > maxMessages) {
      const removeCount = memoryInstance.messages.length - maxMessages;
      memoryInstance.messages = memoryInstance.messages.slice(removeCount);
      this.logger.debug(`Trimmed ${removeCount} old messages from ${memoryKey}`);
    }

    memoryInstance.lastAccessed = new Date();

    this.logger.debug(
      `Added ${message.type} message to ${memoryKey} (${memoryInstance.messages.length} total)`,
    );
  }

  /**
   * Clear memory for a session
   */
  async clearMemory(workflowId: string, sessionId: string): Promise<void> {
    const memoryKey = this.buildMemoryKey(workflowId, sessionId);
    const deleted = this.memoryBuffer.delete(memoryKey);

    if (deleted) {
      this.logger.log(`Cleared memory for ${memoryKey}`);
    }
  }

  /**
   * Get memory stats
   */
  async getStats(): Promise<MemoryStats> {
    let totalMessages = 0;

    for (const instance of this.memoryBuffer.values()) {
      totalMessages += instance.messages.length;
    }

    return {
      activeSessions: this.memoryBuffer.size,
      totalMessages,
      averageMessagesPerSession:
        this.memoryBuffer.size > 0 ? totalMessages / this.memoryBuffer.size : 0,
    };
  }

  /**
   * Build memory key from workflowId and sessionId
   */
  private buildMemoryKey(workflowId: string, sessionId: string): string {
    return `${workflowId}__${sessionId}`;
  }

  /**
   * Build ChatMemory object from MemoryInstance
   */
  private buildChatMemory(instance: MemoryInstance, key: string): ChatMemory {
    return {
      messages: instance.messages.map((m) => ({ ...m })), // Clone to prevent external mutation
      contextWindowLength: instance.contextWindowLength,
      addMessage: async (message: MemoryMessage) => {
        // Extract workflowId and sessionId from key
        const [workflowId, sessionId] = key.split('__');
        await this.addMessage(workflowId, sessionId, message);
      },
      clear: async () => {
        const [workflowId, sessionId] = key.split('__');
        await this.clearMemory(workflowId, sessionId);
      },
      getMessages: async () => {
        return instance.messages.map((m) => ({ ...m }));
      },
    };
  }

  /**
   * Cleanup stale memory buffers (inactive for > 1 hour)
   */
  private async cleanupStaleBuffers(): Promise<void> {
    const now = new Date();
    const threshold = new Date(now.getTime() - this.SESSION_TIMEOUT_MS);
    let cleanedCount = 0;

    for (const [key, instance] of this.memoryBuffer.entries()) {
      if (instance.lastAccessed < threshold) {
        this.memoryBuffer.delete(key);
        cleanedCount++;
      }
    }

    if (cleanedCount > 0) {
      this.logger.log(`Cleaned up ${cleanedCount} stale memory buffers`);
    }
  }

  /**
   * Start automatic cleanup timer
   */
  private startCleanupTimer(): void {
    // Run cleanup every 15 minutes
    this.cleanupInterval = setInterval(
      () => {
        this.cleanupStaleBuffers();
      },
      15 * 60 * 1000,
    );

    this.logger.debug('Started automatic memory cleanup timer (15 min interval)');
  }

  /**
   * Stop cleanup timer (for graceful shutdown)
   */
  onModuleDestroy() {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.logger.log('Stopped memory cleanup timer');
    }

    // Log final stats
    this.logger.log(
      `Simple Memory Service destroyed. Active sessions: ${this.memoryBuffer.size}`,
    );
  }
}

/**
 * Interfaces
 */

interface MemoryInstance {
  messages: StoredMessage[];
  contextWindowLength: number;
  created: Date;
  lastAccessed: Date;
}

export interface MemoryMessage {
  type: 'human' | 'ai' | 'system';
  content: string;
}

interface StoredMessage extends MemoryMessage {
  timestamp: Date;
}

export interface ChatMemory {
  messages: StoredMessage[];
  contextWindowLength: number;
  addMessage: (message: MemoryMessage) => Promise<void>;
  clear: () => Promise<void>;
  getMessages: () => Promise<StoredMessage[]>;
}

interface MemoryStats {
  activeSessions: number;
  totalMessages: number;
  averageMessagesPerSession: number;
}
