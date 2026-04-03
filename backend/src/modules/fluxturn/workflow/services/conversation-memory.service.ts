import { Injectable, Logger, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';

/**
 * Conversation Memory Service with Redis
 *
 * Maintains conversation history for AI workflow generation sessions.
 * Allows users to refine workflows across multiple prompts.
 *
 * Storage: Redis (supports multiple backend instances)
 * Auto-expiry: 30 minutes per session
 */
@Injectable()
export class ConversationMemoryService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(ConversationMemoryService.name);
  private redis: Redis;

  // Session timeout (30 minutes in seconds for Redis)
  private readonly SESSION_TIMEOUT_SECONDS = 30 * 60;

  // Sliding window configuration
  private readonly CONTEXT_WINDOW_SIZE = 8; // Keep last 8 messages in full (7-10 range)
  private readonly SUMMARY_THRESHOLD = 10; // Start summarizing when more than 10 messages

  constructor(private readonly configService: ConfigService) {}

  async onModuleInit() {
    const redisHost = this.configService.get<string>('REDIS_HOST') || 'localhost';
    const redisPort = this.configService.get<number>('REDIS_PORT') || 6379;
    const redisPassword = this.configService.get<string>('REDIS_PASSWORD');

    this.redis = new Redis({
      host: redisHost,
      port: redisPort,
      password: redisPassword || undefined,
      retryStrategy: (times) => {
        if (times > 3) {
          this.logger.error('Redis connection failed after 3 retries');
          return null;
        }
        return Math.min(times * 200, 1000);
      },
    });

    this.redis.on('connect', () => {
      this.logger.log(`✅ Connected to Redis at ${redisHost}:${redisPort}`);
    });

    this.redis.on('error', (error) => {
      this.logger.error('Redis connection error:', error.message);
    });
  }

  async onModuleDestroy() {
    if (this.redis) {
      await this.redis.quit();
      this.logger.log('Disconnected from Redis');
    }
  }

  /**
   * Get conversation history for a session
   */
  async getHistory(sessionId: string): Promise<ChatMessage[]> {
    try {
      const key = `conversation:${sessionId}`;
      const data = await this.redis.get(key);

      if (!data) {
        return [];
      }

      const session: ConversationSession = JSON.parse(data);

      // Update last accessed time and refresh TTL
      session.lastAccessed = Date.now();
      await this.redis.set(
        key,
        JSON.stringify(session),
        'EX',
        this.SESSION_TIMEOUT_SECONDS,
      );

      return session.messages;
    } catch (error) {
      this.logger.error(`Error getting history for session ${sessionId}:`, error.message);
      return [];
    }
  }

  /**
   * Add a user message to the conversation
   */
  async addUserMessage(sessionId: string, content: string): Promise<void> {
    try {
      const key = `conversation:${sessionId}`;
      let session: ConversationSession;

      const existing = await this.redis.get(key);

      if (!existing) {
        session = {
          sessionId,
          messages: [],
          createdAt: Date.now(),
          lastAccessed: Date.now(),
        };
        this.logger.log(`Created new conversation session: ${sessionId}`);
      } else {
        session = JSON.parse(existing);
      }

      session.messages.push({
        role: 'user',
        content,
        timestamp: Date.now(),
      });

      session.lastAccessed = Date.now();

      await this.redis.set(
        key,
        JSON.stringify(session),
        'EX',
        this.SESSION_TIMEOUT_SECONDS,
      );

      this.logger.debug(`Added user message to session ${sessionId} (${session.messages.length} messages total)`);
    } catch (error) {
      this.logger.error(`Error adding user message to session ${sessionId}:`, error.message);
    }
  }

  /**
   * Add an assistant response to the conversation
   */
  async addAssistantMessage(sessionId: string, content: string): Promise<void> {
    try {
      const key = `conversation:${sessionId}`;
      const existing = await this.redis.get(key);

      if (!existing) {
        this.logger.warn(`Attempted to add assistant message to non-existent session: ${sessionId}`);
        return;
      }

      const session: ConversationSession = JSON.parse(existing);

      session.messages.push({
        role: 'assistant',
        content,
        timestamp: Date.now(),
      });

      session.lastAccessed = Date.now();

      await this.redis.set(
        key,
        JSON.stringify(session),
        'EX',
        this.SESSION_TIMEOUT_SECONDS,
      );

      this.logger.debug(`Added assistant message to session ${sessionId}`);
    } catch (error) {
      this.logger.error(`Error adding assistant message to session ${sessionId}:`, error.message);
    }
  }

  /**
   * Clear conversation history for a session
   */
  async clearSession(sessionId: string): Promise<void> {
    try {
      const key = `conversation:${sessionId}`;
      const deleted = await this.redis.del(key);

      if (deleted > 0) {
        this.logger.log(`Cleared conversation session: ${sessionId}`);
      }
    } catch (error) {
      this.logger.error(`Error clearing session ${sessionId}:`, error.message);
    }
  }

  /**
   * Get optimized context for AI with sliding window + summarization
   * Returns: [Optional Summary] + [Recent Messages]
   */
  async getContextForAI(sessionId: string): Promise<AIContext> {
    try {
      const messages = await this.getHistory(sessionId);

      if (messages.length === 0) {
        return {
          messages: [],
          summary: null,
          totalMessages: 0
        };
      }

      // If conversation is short, return all messages
      if (messages.length <= this.CONTEXT_WINDOW_SIZE) {
        return {
          messages: messages,
          summary: null,
          totalMessages: messages.length
        };
      }

      // Split: old messages (to summarize) + recent messages (keep full)
      const splitPoint = messages.length - this.CONTEXT_WINDOW_SIZE;
      const oldMessages = messages.slice(0, splitPoint);
      const recentMessages = messages.slice(splitPoint);

      // Generate summary of old messages
      const summary = this.generateConversationSummary(oldMessages);

      this.logger.debug(
        `Context for AI: ${oldMessages.length} msgs summarized, ` +
        `${recentMessages.length} msgs in full (total: ${messages.length})`
      );

      return {
        messages: recentMessages,
        summary: summary,
        totalMessages: messages.length
      };
    } catch (error) {
      this.logger.error(`Error getting AI context for session ${sessionId}:`, error.message);
      return {
        messages: [],
        summary: null,
        totalMessages: 0
      };
    }
  }

  /**
   * Generate a concise summary of conversation history
   * Simple summarization - extracts key points
   */
  private generateConversationSummary(messages: ChatMessage[]): string {
    if (messages.length === 0) {
      return '';
    }

    // Extract key topics and actions from messages
    const userMessages = messages.filter(m => m.role === 'user').map(m => m.content);
    const assistantActions = messages.filter(m => m.role === 'assistant').map(m => m.content);

    // Simple summary format
    const summary = [
      `Previous context (${messages.length} messages):`,
      '',
      '**User requests:**',
      ...userMessages.slice(0, 3).map(msg => `- ${this.truncate(msg, 100)}`),
      userMessages.length > 3 ? `- ... and ${userMessages.length - 3} more requests` : '',
      '',
      '**Assistant responses:**',
      ...assistantActions.slice(0, 2).map(msg => `- ${this.truncate(msg, 100)}`),
      assistantActions.length > 2 ? `- ... and ${assistantActions.length - 2} more responses` : ''
    ].filter(Boolean).join('\n');

    return summary;
  }

  /**
   * Truncate text to specified length
   */
  private truncate(text: string, maxLength: number): string {
    if (text.length <= maxLength) {
      return text;
    }
    return text.substring(0, maxLength - 3) + '...';
  }

  /**
   * Get conversation context summary (for display to user)
   */
  async getSessionSummary(sessionId: string): Promise<SessionSummary | null> {
    try {
      const key = `conversation:${sessionId}`;
      const data = await this.redis.get(key);

      if (!data) {
        return null;
      }

      const session: ConversationSession = JSON.parse(data);

      return {
        sessionId: session.sessionId,
        messageCount: session.messages.length,
        createdAt: session.createdAt,
        lastAccessed: session.lastAccessed,
        duration: Date.now() - session.createdAt,
      };
    } catch (error) {
      this.logger.error(`Error getting session summary for ${sessionId}:`, error.message);
      return null;
    }
  }

  /**
   * Get active sessions count (approximate)
   */
  async getActiveSessionsCount(): Promise<number> {
    try {
      const keys = await this.redis.keys('conversation:*');
      return keys.length;
    } catch (error) {
      this.logger.error('Error getting active sessions count:', error.message);
      return 0;
    }
  }

  /**
   * Get statistics for monitoring
   */
  async getStats(): Promise<{
    activeSessions: number;
    totalMessages: number;
    averageMessagesPerSession: number;
    oldestSession: number | null;
  }> {
    try {
      const keys = await this.redis.keys('conversation:*');
      let totalMessages = 0;
      let oldestSessionTime: number | null = null;

      for (const key of keys) {
        const data = await this.redis.get(key);
        if (data) {
          const session: ConversationSession = JSON.parse(data);
          totalMessages += session.messages.length;

          if (oldestSessionTime === null || session.createdAt < oldestSessionTime) {
            oldestSessionTime = session.createdAt;
          }
        }
      }

      return {
        activeSessions: keys.length,
        totalMessages,
        averageMessagesPerSession: keys.length > 0 ? totalMessages / keys.length : 0,
        oldestSession: oldestSessionTime,
      };
    } catch (error) {
      this.logger.error('Error getting stats:', error.message);
      return {
        activeSessions: 0,
        totalMessages: 0,
        averageMessagesPerSession: 0,
        oldestSession: null,
      };
    }
  }
}

/**
 * Interfaces
 */

interface ConversationSession {
  sessionId: string;
  messages: ChatMessage[];
  createdAt: number;
  lastAccessed: number;
}

interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
  timestamp: number;
}

interface SessionSummary {
  sessionId: string;
  messageCount: number;
  createdAt: number;
  lastAccessed: number;
  duration: number;
}

export interface AIContext {
  messages: ChatMessage[];       // Recent messages in full
  summary: string | null;         // Summary of older messages
  totalMessages: number;          // Total conversation length
}
