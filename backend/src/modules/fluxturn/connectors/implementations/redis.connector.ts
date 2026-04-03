import { Injectable, Logger } from '@nestjs/common';
import { BaseConnector } from '../base/base.connector';
import {
  ConnectorConfig,
  ConnectorCategory,
  ConnectorType,
  ConnectorMetadata,
  ConnectorRequest,
  AuthType,
} from '../types';
import Redis from 'ioredis';

/**
 * Redis Connector
 *
 * This is a special "connector" that provides Redis credentials
 * for infrastructure services like Redis Chat Memory.
 *
 * It doesn't execute actions like traditional connectors - it just
 * validates credentials and provides connection info.
 */
@Injectable()
export class RedisConnector extends BaseConnector {
  protected logger = new Logger(RedisConnector.name);
  private redisClient?: Redis;

  getMetadata(): ConnectorMetadata {
    return {
      name: 'redis',
      type: ConnectorType.REDIS,
      category: ConnectorCategory.DATABASE,
      description: 'Redis in-memory data store for caching and memory storage',
      version: '1.0.0',
      authType: AuthType.CUSTOM,
      actions: [],
      triggers: [],
      webhookSupport: false,
    };
  }

  protected async initializeConnection(): Promise<void> {
    this.logger.log(`Initializing Redis connection to ${this.config.credentials.host}:${this.config.credentials.port}`);

    // Validate required credentials
    if (!this.config.credentials.host) {
      throw new Error('Redis host is required');
    }

    if (!this.config.credentials.port) {
      throw new Error('Redis port is required');
    }

    // Create Redis client
    this.redisClient = new Redis({
      host: this.config.credentials.host,
      port: this.config.credentials.port,
      password: this.config.credentials.password || undefined,
      username: this.config.credentials.username || undefined,
      db: this.config.credentials.database || 0,
      tls: this.config.credentials.ssl ? {} : undefined,
      lazyConnect: true, // Don't connect immediately
    });

    this.logger.log('Redis connection initialized');
  }

  protected async performConnectionTest(): Promise<boolean> {
    this.logger.log('Testing Redis connection...');

    try {
      // Create temporary Redis client for testing
      const testClient = new Redis({
        host: this.config.credentials.host,
        port: this.config.credentials.port,
        password: this.config.credentials.password || undefined,
        username: this.config.credentials.username || undefined,
        db: this.config.credentials.database || 0,
        tls: this.config.credentials.ssl ? {} : undefined,
        connectTimeout: 5000,
        retryStrategy: () => null, // Don't retry on test
      });

      // Test ping
      const result = await testClient.ping();

      // Clean up
      await testClient.quit();

      if (result === 'PONG') {
        this.logger.log('✅ Redis connection test successful');
        return true;
      } else {
        throw new Error('Unexpected response from Redis server');
      }
    } catch (error: any) {
      this.logger.error(`❌ Redis connection test failed: ${error.message}`);
      throw error;
    }
  }

  protected async performHealthCheck(): Promise<void> {
    if (!this.redisClient) {
      throw new Error('Redis client not initialized');
    }

    try {
      // Connect if not already connected
      if (this.redisClient.status !== 'ready') {
        await this.redisClient.connect();
      }

      // Ping to check health
      const result = await this.redisClient.ping();

      if (result !== 'PONG') {
        throw new Error('Redis health check failed: unexpected response');
      }
    } catch (error: any) {
      this.logger.error(`Redis health check failed: ${error.message}`);
      throw error;
    }
  }

  protected async performRequest(request: ConnectorRequest): Promise<any> {
    // Redis doesn't use the standard request pattern
    throw new Error('Redis connector does not support performRequest. Use Redis-specific methods instead.');
  }

  protected async performAction(actionId: string, input: any): Promise<any> {
    // Redis is infrastructure - it doesn't execute actions
    throw new Error('Redis connector does not support action execution. Use Redis Memory node instead.');
  }

  protected async cleanup(): Promise<void> {
    this.logger.log('Cleaning up Redis connection');

    if (this.redisClient) {
      try {
        await this.redisClient.quit();
        this.redisClient = undefined;
      } catch (error: any) {
        this.logger.error(`Error during Redis cleanup: ${error.message}`);
      }
    }

    this.logger.log('Redis connection cleaned up');
  }

  /**
   * Get Redis client instance (for internal use by services)
   */
  getClient(): Redis | undefined {
    return this.redisClient;
  }

  /**
   * Get Redis info
   */
  async getRedisInfo(): Promise<any> {
    if (!this.redisClient) {
      throw new Error('Redis client not initialized');
    }

    try {
      // Connect if not already connected
      if (this.redisClient.status !== 'ready') {
        await this.redisClient.connect();
      }

      const info = await this.redisClient.info();
      return this.parseRedisInfo(info);
    } catch (error: any) {
      this.logger.error(`Failed to get Redis info: ${error.message}`);
      throw error;
    }
  }

  /**
   * Parse Redis INFO command output
   */
  private parseRedisInfo(info: string): any {
    const lines = info.split('\r\n');
    const parsed: any = {};

    for (const line of lines) {
      if (line && !line.startsWith('#')) {
        const [key, value] = line.split(':');
        if (key && value) {
          parsed[key] = value;
        }
      }
    }

    return {
      version: parsed['redis_version'],
      uptime_days: parsed['uptime_in_days'],
      connected_clients: parsed['connected_clients'],
      used_memory_human: parsed['used_memory_human'],
      total_commands_processed: parsed['total_commands_processed'],
    };
  }
}
