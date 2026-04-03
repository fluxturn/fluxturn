// Redis Connector Implementation
// Based on n8n Redis node

import { Injectable, Logger } from '@nestjs/common';
import { BaseConnector } from '../../base/base.connector';
import {
  ConnectorMetadata,
  ConnectorType,
  ConnectorCategory,
  ConnectorRequest,
  ConnectorResponse,
  AuthType,
  ConnectorAction,
  ConnectorTrigger,
} from '../../types';
import Redis from 'ioredis';

interface RedisCredentials {
  host: string;
  port: number;
  database?: number;
  username?: string;
  password?: string;
  ssl?: boolean;
}

@Injectable()
export class RedisConnector extends BaseConnector {
  protected logger = new Logger(RedisConnector.name);
  private client: Redis | null = null;

  getMetadata(): ConnectorMetadata {
    return {
      name: 'Redis',
      description: 'Redis in-memory data store for caching, key-value storage, and pub/sub messaging',
      version: '1.0.0',
      category: ConnectorCategory.STORAGE,
      type: ConnectorType.REDIS,
      authType: AuthType.CUSTOM,
      actions: this.getActions(),
      triggers: this.getTriggers(),
      webhookSupport: false,
    };
  }

  protected async initializeConnection(): Promise<void> {
    const credentials = this.config.credentials as RedisCredentials;

    this.logger.log(`Initializing Redis connection to ${credentials.host}:${credentials.port}`);

    if (!credentials.host) {
      throw new Error('Redis host is required');
    }

    if (!credentials.port) {
      throw new Error('Redis port is required');
    }

    this.client = new Redis({
      host: credentials.host,
      port: credentials.port,
      password: credentials.password || undefined,
      username: credentials.username || undefined,
      db: credentials.database || 0,
      tls: credentials.ssl ? {} : undefined,
      lazyConnect: true,
      retryStrategy: (times) => {
        if (times > 3) return null;
        return Math.min(times * 100, 3000);
      },
    });

    // Connect and test
    await this.client.connect();
    await this.client.ping();

    this.logger.log('Redis connection initialized successfully');
  }

  protected async performConnectionTest(): Promise<boolean> {
    const credentials = this.config.credentials as RedisCredentials;

    try {
      const testClient = new Redis({
        host: credentials.host,
        port: credentials.port,
        password: credentials.password || undefined,
        username: credentials.username || undefined,
        db: credentials.database || 0,
        tls: credentials.ssl ? {} : undefined,
        connectTimeout: 5000,
        retryStrategy: () => null,
      });

      const result = await testClient.ping();
      await testClient.quit();

      return result === 'PONG';
    } catch (error: any) {
      this.logger.error(`Redis connection test failed: ${error.message}`);
      return false;
    }
  }

  protected async performHealthCheck(): Promise<void> {
    if (!this.client) {
      throw new Error('Redis client not initialized');
    }

    const result = await this.client.ping();
    if (result !== 'PONG') {
      throw new Error('Redis health check failed: unexpected response');
    }
  }

  protected async performRequest(request: ConnectorRequest): Promise<any> {
    throw new Error('Redis connector does not support performRequest. Use performAction instead.');
  }

  protected async performAction(actionId: string, input: any): Promise<any> {
    if (!this.client) {
      throw new Error('Redis client not initialized');
    }

    switch (actionId) {
      case 'delete_key':
        return this.deleteKey(input.key);
      case 'get_value':
        return this.getValue(input.key, input.keyType || 'automatic', input.propertyName || 'value');
      case 'set_value':
        return this.setValue(
          input.key,
          input.value,
          input.keyType || 'automatic',
          input.expire || false,
          input.ttl || 60
        );
      case 'increment':
        return this.incrementKey(input.key, input.expire || false, input.ttl || 60);
      case 'get_info':
        return this.getInfo();
      case 'get_keys':
        return this.getKeys(input.keyPattern, input.getValues !== false);
      case 'list_length':
        return this.getListLength(input.list);
      case 'push_to_list':
        return this.pushToList(input.list, input.data, input.tail || false);
      case 'pop_from_list':
        return this.popFromList(input.list, input.tail || false, input.propertyName || 'value');
      case 'publish':
        return this.publishMessage(input.channel, input.data);
      default:
        throw new Error(`Unknown action: ${actionId}`);
    }
  }

  protected async cleanup(): Promise<void> {
    if (this.client) {
      try {
        await this.client.quit();
      } catch (error) {
        try {
          this.client.disconnect();
        } catch {
          // Ignore disconnect errors
        }
      }
      this.client = null;
    }
    this.logger.log('Redis connection cleaned up');
  }

  // --- Redis Operations ---

  private async deleteKey(key: string): Promise<ConnectorResponse> {
    try {
      const result = await this.client!.del(key);
      return {
        success: true,
        data: {
          deleted: result > 0,
          key,
        },
      };
    } catch (error: any) {
      return this.handleError(error, 'Failed to delete key');
    }
  }

  private async getValue(
    key: string,
    keyType: string,
    propertyName: string
  ): Promise<ConnectorResponse> {
    try {
      let type = keyType;

      // Auto-detect type if needed
      if (type === 'automatic') {
        type = await this.client!.type(key);
      }

      let value: any = null;

      switch (type) {
        case 'string':
          value = await this.client!.get(key);
          break;
        case 'hash':
          value = await this.client!.hgetall(key);
          break;
        case 'list':
          value = await this.client!.lrange(key, 0, -1);
          break;
        case 'set':
        case 'sets':
          value = await this.client!.smembers(key);
          break;
        case 'none':
          value = null;
          break;
        default:
          value = await this.client!.get(key);
      }

      const data: any = {};
      data[propertyName] = value;

      return {
        success: true,
        data,
      };
    } catch (error: any) {
      return this.handleError(error, 'Failed to get value');
    }
  }

  private async setValue(
    key: string,
    value: string,
    keyType: string,
    expire: boolean,
    ttl: number
  ): Promise<ConnectorResponse> {
    try {
      let type = keyType;

      // Auto-detect type if needed
      if (type === 'automatic') {
        try {
          const parsed = JSON.parse(value);
          if (Array.isArray(parsed)) {
            type = 'list';
          } else if (typeof parsed === 'object') {
            type = 'hash';
          } else {
            type = 'string';
          }
        } catch {
          type = 'string';
        }
      }

      switch (type) {
        case 'string':
          await this.client!.set(key, value);
          break;
        case 'hash':
          let hashData: Record<string, string>;
          try {
            hashData = JSON.parse(value);
          } catch {
            throw new Error('Hash value must be valid JSON object');
          }
          await this.client!.del(key);
          for (const [field, val] of Object.entries(hashData)) {
            await this.client!.hset(key, field, String(val));
          }
          break;
        case 'list':
          let listData: string[];
          try {
            listData = JSON.parse(value);
          } catch {
            listData = [value];
          }
          await this.client!.del(key);
          if (listData.length > 0) {
            await this.client!.rpush(key, ...listData.map(String));
          }
          break;
        case 'set':
        case 'sets':
          let setData: string[];
          try {
            setData = JSON.parse(value);
          } catch {
            setData = [value];
          }
          await this.client!.del(key);
          if (setData.length > 0) {
            await this.client!.sadd(key, ...setData.map(String));
          }
          break;
        default:
          await this.client!.set(key, value);
      }

      if (expire && ttl > 0) {
        await this.client!.expire(key, ttl);
      }

      return {
        success: true,
        data: {
          key,
          success: true,
        },
      };
    } catch (error: any) {
      return this.handleError(error, 'Failed to set value');
    }
  }

  private async incrementKey(key: string, expire: boolean, ttl: number): Promise<ConnectorResponse> {
    try {
      const value = await this.client!.incr(key);

      if (expire && ttl > 0) {
        await this.client!.expire(key, ttl);
      }

      return {
        success: true,
        data: {
          key,
          value,
        },
      };
    } catch (error: any) {
      return this.handleError(error, 'Failed to increment key');
    }
  }

  private async getInfo(): Promise<ConnectorResponse> {
    try {
      const info = await this.client!.info();
      const parsed = this.parseRedisInfo(info);

      return {
        success: true,
        data: {
          info: parsed,
        },
      };
    } catch (error: any) {
      return this.handleError(error, 'Failed to get Redis info');
    }
  }

  private async getKeys(keyPattern: string, getValues: boolean): Promise<ConnectorResponse> {
    try {
      const keys = await this.client!.keys(keyPattern);

      if (!getValues) {
        return {
          success: true,
          data: { keys },
        };
      }

      const values: Record<string, any> = {};
      for (const key of keys) {
        const type = await this.client!.type(key);
        switch (type) {
          case 'string':
            values[key] = await this.client!.get(key);
            break;
          case 'hash':
            values[key] = await this.client!.hgetall(key);
            break;
          case 'list':
            values[key] = await this.client!.lrange(key, 0, -1);
            break;
          case 'set':
            values[key] = await this.client!.smembers(key);
            break;
          default:
            values[key] = null;
        }
      }

      return {
        success: true,
        data: {
          keys,
          values,
        },
      };
    } catch (error: any) {
      return this.handleError(error, 'Failed to get keys');
    }
  }

  private async getListLength(list: string): Promise<ConnectorResponse> {
    try {
      const length = await this.client!.llen(list);

      return {
        success: true,
        data: {
          list,
          length,
        },
      };
    } catch (error: any) {
      return this.handleError(error, 'Failed to get list length');
    }
  }

  private async pushToList(list: string, data: string, tail: boolean): Promise<ConnectorResponse> {
    try {
      const length = tail
        ? await this.client!.rpush(list, data)
        : await this.client!.lpush(list, data);

      return {
        success: true,
        data: {
          list,
          length,
        },
      };
    } catch (error: any) {
      return this.handleError(error, 'Failed to push to list');
    }
  }

  private async popFromList(
    list: string,
    tail: boolean,
    propertyName: string
  ): Promise<ConnectorResponse> {
    try {
      const value = tail ? await this.client!.rpop(list) : await this.client!.lpop(list);

      let parsedValue: any = value;
      if (value) {
        try {
          parsedValue = JSON.parse(value);
        } catch {
          // Keep as string if not valid JSON
        }
      }

      const data: any = {};
      data[propertyName] = parsedValue;

      return {
        success: true,
        data,
      };
    } catch (error: any) {
      return this.handleError(error, 'Failed to pop from list');
    }
  }

  private async publishMessage(channel: string, data: string): Promise<ConnectorResponse> {
    try {
      const receivers = await this.client!.publish(channel, data);

      return {
        success: true,
        data: {
          channel,
          receivers,
        },
      };
    } catch (error: any) {
      return this.handleError(error, 'Failed to publish message');
    }
  }

  // --- Helper Methods ---

  private parseRedisInfo(info: string): Record<string, any> {
    const lines = info.split('\r\n');
    const parsed: Record<string, any> = {};

    for (const line of lines) {
      if (line && !line.startsWith('#')) {
        const colonIndex = line.indexOf(':');
        if (colonIndex > 0) {
          const key = line.substring(0, colonIndex);
          const value = line.substring(colonIndex + 1);

          // Try to parse as number
          const numValue = parseFloat(value);
          parsed[key] = isNaN(numValue) ? value : numValue;
        }
      }
    }

    return {
      redis_version: parsed['redis_version'],
      uptime_in_days: parsed['uptime_in_days'],
      connected_clients: parsed['connected_clients'],
      used_memory_human: parsed['used_memory_human'],
      total_commands_processed: parsed['total_commands_processed'],
      keyspace_hits: parsed['keyspace_hits'],
      keyspace_misses: parsed['keyspace_misses'],
      raw: parsed,
    };
  }

  private getActions(): ConnectorAction[] {
    return [
      {
        id: 'delete_key',
        name: 'Delete Key',
        description: 'Delete a key from Redis',
        inputSchema: {
          key: { type: 'string', required: true, description: 'Key to delete' },
        },
        outputSchema: {
          deleted: { type: 'boolean', description: 'Whether the key was deleted' },
        },
      },
      {
        id: 'get_value',
        name: 'Get Value',
        description: 'Get the value of a key from Redis',
        inputSchema: {
          key: { type: 'string', required: true, description: 'Key to get' },
          keyType: { type: 'string', description: 'Type of key (automatic, string, hash, list, sets)' },
        },
        outputSchema: {
          value: { type: 'any', description: 'The value of the key' },
        },
      },
      {
        id: 'set_value',
        name: 'Set Value',
        description: 'Set the value of a key in Redis',
        inputSchema: {
          key: { type: 'string', required: true, description: 'Key to set' },
          value: { type: 'string', required: true, description: 'Value to set' },
          keyType: { type: 'string', description: 'Type of key' },
          expire: { type: 'boolean', description: 'Set expiration' },
          ttl: { type: 'number', description: 'TTL in seconds' },
        },
        outputSchema: {
          success: { type: 'boolean', description: 'Whether the operation succeeded' },
        },
      },
      {
        id: 'increment',
        name: 'Increment',
        description: 'Atomically increment a key by 1',
        inputSchema: {
          key: { type: 'string', required: true, description: 'Key to increment' },
        },
        outputSchema: {
          value: { type: 'number', description: 'New value after increment' },
        },
      },
      {
        id: 'get_info',
        name: 'Get Info',
        description: 'Get Redis server information',
        inputSchema: {},
        outputSchema: {
          info: { type: 'object', description: 'Redis server information' },
        },
      },
      {
        id: 'get_keys',
        name: 'Get Keys',
        description: 'Get all keys matching a pattern',
        inputSchema: {
          keyPattern: { type: 'string', required: true, description: 'Key pattern' },
          getValues: { type: 'boolean', description: 'Also get values' },
        },
        outputSchema: {
          keys: { type: 'array', description: 'Matching keys' },
        },
      },
      {
        id: 'list_length',
        name: 'List Length',
        description: 'Get the length of a Redis list',
        inputSchema: {
          list: { type: 'string', required: true, description: 'List name' },
        },
        outputSchema: {
          length: { type: 'number', description: 'List length' },
        },
      },
      {
        id: 'push_to_list',
        name: 'Push to List',
        description: 'Push data to a Redis list',
        inputSchema: {
          list: { type: 'string', required: true, description: 'List name' },
          data: { type: 'string', required: true, description: 'Data to push' },
          tail: { type: 'boolean', description: 'Push to tail' },
        },
        outputSchema: {
          length: { type: 'number', description: 'New list length' },
        },
      },
      {
        id: 'pop_from_list',
        name: 'Pop from List',
        description: 'Pop data from a Redis list',
        inputSchema: {
          list: { type: 'string', required: true, description: 'List name' },
          tail: { type: 'boolean', description: 'Pop from tail' },
        },
        outputSchema: {
          value: { type: 'any', description: 'Popped value' },
        },
      },
      {
        id: 'publish',
        name: 'Publish Message',
        description: 'Publish a message to a Redis channel',
        inputSchema: {
          channel: { type: 'string', required: true, description: 'Channel name' },
          data: { type: 'string', required: true, description: 'Message data' },
        },
        outputSchema: {
          receivers: { type: 'number', description: 'Number of receivers' },
        },
      },
    ];
  }

  private getTriggers(): ConnectorTrigger[] {
    return [
      {
        id: 'channel_message',
        name: 'Channel Message',
        description: 'Triggers when a message is received on a Redis channel',
        eventType: 'redis.message',
        webhookRequired: false,
        pollingEnabled: true,
        outputSchema: {
          channel: { type: 'string', description: 'Channel name' },
          message: { type: 'any', description: 'Message content' },
        },
      },
    ];
  }
}
