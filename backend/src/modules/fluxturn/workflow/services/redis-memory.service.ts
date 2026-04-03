import { Injectable, Logger, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';

/**
 * Redis Memory Service
 *
 * Persistent conversation storage using Redis.
 * Based on n8n's Redis Chat Memory implementation.
 *
 * Features:
 * - Persistent storage (survives server restarts)
 * - Windowed memory (keeps last N messages)
 * - Session-based isolation
 * - Optional TTL (auto-expiration)
 * - Distributed (works across multiple instances)
 *
 * Storage Format:
 * - Key: `${workflowId}:${sessionId}:chat_history`
 * - Value: JSON array of messages
 * - TTL: Optional expiration (0 = never expire)
 *
 * Use Cases:
 * - Production AI chatbots
 * - Multi-server deployments
 * - Long-term conversation storage
 * - Scalable memory management
 */
@Injectable()
export class RedisMemoryService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(RedisMemoryService.name);
  private redis: Redis;
  private isConnected = false;

  constructor(private readonly configService: ConfigService) {}

  async onModuleInit() {
    // Initialize default Redis connection
    await this.initializeDefaultRedis();
  }

  async onModuleDestroy() {
    if (this.redis && this.isConnected) {
      await this.redis.quit();
      this.logger.log('Disconnected from Redis');
    }
  }

  /**
   * Initialize default Redis connection (for backward compatibility)
   */
  private async initializeDefaultRedis() {
    const redisHost = this.configService.get<string>('REDIS_HOST') || 'localhost';
    const redisPort = this.configService.get<number>('REDIS_PORT') || 6379;
    const redisPassword = this.configService.get<string>('REDIS_PASSWORD');
    const redisDb = this.configService.get<number>('REDIS_DB') || 0;

    this.redis = new Redis({
      host: redisHost,
      port: redisPort,
      password: redisPassword || undefined,
      db: redisDb,
      retryStrategy: (times) => {
        if (times > 3) {
          this.logger.error('Redis connection failed after 3 retries');
          return null;
        }
        return Math.min(times * 200, 1000);
      },
    });

    this.redis.on('connect', () => {
      this.isConnected = true;
      this.logger.log(`✅ Connected to Redis at ${redisHost}:${redisPort}`);
    });

    this.redis.on('error', (error) => {
      this.isConnected = false;
      this.logger.error('Redis connection error:', error.message);
    });
  }

  /**
   * Create a Redis client with custom credentials
   */
  async createRedisClient(credentials: RedisCredentials): Promise<Redis> {
    const client = new Redis({
      host: credentials.host,
      port: credentials.port,
      password: credentials.password || undefined,
      db: credentials.database || 0,
      username: credentials.username || undefined,
      tls: credentials.ssl ? {} : undefined,
      retryStrategy: (times) => {
        if (times > 3) {
          return null;
        }
        return Math.min(times * 200, 1000);
      },
    });

    return client;
  }

  /**
   * Get or create memory for a session
   */
  async getMemory(
    redisClient: Redis,
    workflowId: string,
    sessionId: string,
    contextWindowLength: number = 5,
    sessionTTL: number = 0,
  ): Promise<RedisChatMemory> {
    const memoryKey = this.buildMemoryKey(workflowId, sessionId);

    // Get existing messages
    const messages = await this.getMessages(redisClient, memoryKey);

    this.logger.debug(
      `Retrieved ${messages.length} messages from Redis for ${memoryKey}`,
    );

    return {
      sessionId,
      workflowId,
      contextWindowLength,
      sessionTTL,
      messages,
      addMessage: async (message: MemoryMessage) => {
        await this.addMessage(
          redisClient,
          memoryKey,
          message,
          contextWindowLength,
          sessionTTL,
        );
      },
      clear: async () => {
        await this.clearMemory(redisClient, memoryKey);
      },
      getMessages: async () => {
        return await this.getMessages(redisClient, memoryKey);
      },
    };
  }

  /**
   * Get messages from Redis
   */
  private async getMessages(
    client: Redis,
    memoryKey: string,
  ): Promise<StoredMessage[]> {
    try {
      const data = await client.get(memoryKey);

      if (!data) {
        return [];
      }

      const messages = JSON.parse(data) as StoredMessage[];
      return messages;
    } catch (error: any) {
      this.logger.error(
        `Error getting messages from Redis: ${error.message}`,
      );
      return [];
    }
  }

  /**
   * Add a message to Redis
   */
  private async addMessage(
    client: Redis,
    memoryKey: string,
    message: MemoryMessage,
    contextWindowLength: number,
    sessionTTL: number,
  ): Promise<void> {
    try {
      // Get existing messages
      let messages = await this.getMessages(client, memoryKey);

      // Add new message
      const storedMessage: StoredMessage = {
        ...message,
        timestamp: new Date(),
      };

      messages.push(storedMessage);

      // Trim to context window (keep last N pairs)
      const maxMessages = contextWindowLength * 2;
      if (messages.length > maxMessages) {
        const removeCount = messages.length - maxMessages;
        messages = messages.slice(removeCount);
        this.logger.debug(`Trimmed ${removeCount} old messages from ${memoryKey}`);
      }

      // Save to Redis
      const serialized = JSON.stringify(messages);

      if (sessionTTL > 0) {
        // Set with TTL
        await client.set(memoryKey, serialized, 'EX', sessionTTL);
      } else {
        // Set without TTL
        await client.set(memoryKey, serialized);
      }

      this.logger.debug(
        `Added ${message.type} message to ${memoryKey} (${messages.length} total)`,
      );
    } catch (error: any) {
      this.logger.error(`Error adding message to Redis: ${error.message}`);
      throw error;
    }
  }

  /**
   * Clear memory for a session
   */
  private async clearMemory(client: Redis, memoryKey: string): Promise<void> {
    try {
      const deleted = await client.del(memoryKey);

      if (deleted > 0) {
        this.logger.log(`Cleared memory for ${memoryKey}`);
      }
    } catch (error: any) {
      this.logger.error(`Error clearing memory: ${error.message}`);
    }
  }

  /**
   * Build memory key from workflowId and sessionId
   */
  private buildMemoryKey(workflowId: string, sessionId: string): string {
    return `${workflowId}:${sessionId}:chat_history`;
  }

  /**
   * Get memory stats (using default Redis connection)
   */
  async getStats(): Promise<MemoryStats> {
    if (!this.redis || !this.isConnected) {
      return {
        activeSessions: 0,
        totalMessages: 0,
        averageMessagesPerSession: 0,
      };
    }

    try {
      const keys = await this.redis.keys('*:*:chat_history');
      let totalMessages = 0;

      for (const key of keys) {
        const data = await this.redis.get(key);
        if (data) {
          const messages = JSON.parse(data) as StoredMessage[];
          totalMessages += messages.length;
        }
      }

      return {
        activeSessions: keys.length,
        totalMessages,
        averageMessagesPerSession:
          keys.length > 0 ? totalMessages / keys.length : 0,
      };
    } catch (error: any) {
      this.logger.error('Error getting stats:', error.message);
      return {
        activeSessions: 0,
        totalMessages: 0,
        averageMessagesPerSession: 0,
      };
    }
  }

  /**
   * Close Redis client
   */
  async closeClient(client: Redis): Promise<void> {
    try {
      await client.quit();
      this.logger.debug('Closed Redis client');
    } catch (error: any) {
      this.logger.error(`Error closing Redis client: ${error.message}`);
    }
  }
}

/**
 * Interfaces
 */

export interface RedisCredentials {
  host: string;
  port: number;
  password?: string;
  database?: number;
  username?: string;
  ssl?: boolean;
}

export interface MemoryMessage {
  type: 'human' | 'ai' | 'system';
  content: string;
}

interface StoredMessage extends MemoryMessage {
  timestamp: Date;
}

export interface RedisChatMemory {
  sessionId: string;
  workflowId: string;
  contextWindowLength: number;
  sessionTTL: number;
  messages: StoredMessage[];
  addMessage: (message: MemoryMessage) => Promise<void>;
  clear: () => Promise<void>;
  getMessages: () => Promise<StoredMessage[]>;
}

interface MemoryStats {
  activeSessions: number;
  totalMessages: number;
  averageMessagesPerSession: number;
}
