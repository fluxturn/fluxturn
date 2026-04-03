// Redis Connector Definition
// Based on n8n Redis node

import { ConnectorDefinition } from '../../shared';

export const REDIS_CONNECTOR: ConnectorDefinition = {
  name: 'redis',
  display_name: 'Redis',
  category: 'storage',
  description: 'Redis in-memory data store for caching, key-value storage, and pub/sub messaging',
  auth_type: 'custom',
  verified: false,

  auth_fields: [
    {
      key: 'host',
      label: 'Host',
      type: 'string',
      required: true,
      placeholder: 'localhost',
      description: 'Redis server hostname or IP address',
    },
    {
      key: 'port',
      label: 'Port',
      type: 'number',
      required: true,
      default: 6379,
      description: 'Redis server port',
    },
    {
      key: 'database',
      label: 'Database',
      type: 'number',
      required: false,
      default: 0,
      description: 'Redis database index (0-15)',
    },
    {
      key: 'username',
      label: 'Username',
      type: 'string',
      required: false,
      placeholder: 'default',
      description: 'Redis username (Redis 6.0+)',
    },
    {
      key: 'password',
      label: 'Password',
      type: 'password',
      required: false,
      description: 'Redis password',
    },
    {
      key: 'ssl',
      label: 'Use SSL',
      type: 'boolean',
      required: false,
      default: false,
      description: 'Enable SSL/TLS connection',
    },
  ],

  endpoints: {
    base_url: 'redis://{host}:{port}',
  },

  webhook_support: false,

  rate_limits: {
    requests_per_second: 1000,
    requests_per_minute: 60000,
  },

  supported_actions: [
    // DELETE KEY
    {
      id: 'delete_key',
      name: 'Delete Key',
      description: 'Delete a key from Redis',
      category: 'Keys',
      icon: 'trash-2',
      api: {
        endpoint: '/del',
        method: 'POST',
        baseUrl: 'redis://{host}:{port}',
      },
      inputSchema: {
        key: {
          type: 'string',
          required: true,
          label: 'Key',
          placeholder: 'mykey',
          description: 'Name of the key to delete from Redis',
          aiControlled: false,
        },
      },
      outputSchema: {
        deleted: {
          type: 'boolean',
          description: 'Whether the key was deleted',
        },
      },
    },

    // GET VALUE
    {
      id: 'get_value',
      name: 'Get Value',
      description: 'Get the value of a key from Redis',
      category: 'Keys',
      icon: 'download',
      api: {
        endpoint: '/get',
        method: 'GET',
        baseUrl: 'redis://{host}:{port}',
      },
      inputSchema: {
        key: {
          type: 'string',
          required: true,
          label: 'Key',
          placeholder: 'mykey',
          description: 'Name of the key to get from Redis',
          aiControlled: false,
        },
        keyType: {
          type: 'select',
          required: false,
          label: 'Key Type',
          description: 'The type of the key to get',
          default: 'automatic',
          options: [
            { label: 'Automatic', value: 'automatic' },
            { label: 'String', value: 'string' },
            { label: 'Hash', value: 'hash' },
            { label: 'List', value: 'list' },
            { label: 'Set', value: 'sets' },
          ],
          aiControlled: false,
        },
        propertyName: {
          type: 'string',
          required: false,
          label: 'Property Name',
          default: 'value',
          description: 'Name of the property to write received data to',
          aiControlled: false,
        },
      },
      outputSchema: {
        value: {
          type: 'any',
          description: 'The value stored at the key',
        },
      },
    },

    // SET VALUE
    {
      id: 'set_value',
      name: 'Set Value',
      description: 'Set the value of a key in Redis',
      category: 'Keys',
      icon: 'upload',
      api: {
        endpoint: '/set',
        method: 'POST',
        baseUrl: 'redis://{host}:{port}',
      },
      inputSchema: {
        key: {
          type: 'string',
          required: true,
          label: 'Key',
          placeholder: 'mykey',
          description: 'Name of the key to set in Redis',
          aiControlled: false,
        },
        value: {
          type: 'string',
          required: true,
          label: 'Value',
          inputType: 'textarea',
          description: 'The value to write in Redis',
          aiControlled: false,
        },
        keyType: {
          type: 'select',
          required: false,
          label: 'Key Type',
          description: 'The type of the key to set',
          default: 'automatic',
          options: [
            { label: 'Automatic', value: 'automatic' },
            { label: 'String', value: 'string' },
            { label: 'Hash', value: 'hash' },
            { label: 'List', value: 'list' },
            { label: 'Set', value: 'sets' },
          ],
          aiControlled: false,
        },
        expire: {
          type: 'boolean',
          required: false,
          label: 'Set Expiration',
          default: false,
          description: 'Whether to set a timeout on key',
          aiControlled: false,
        },
        ttl: {
          type: 'number',
          required: false,
          label: 'TTL (seconds)',
          default: 60,
          min: 1,
          description: 'Number of seconds before key expiration',
          displayOptions: {
            show: {
              expire: [true],
            },
          },
          aiControlled: false,
        },
      },
      outputSchema: {
        success: {
          type: 'boolean',
          description: 'Whether the value was set successfully',
        },
      },
    },

    // INCREMENT
    {
      id: 'increment',
      name: 'Increment',
      description: 'Atomically increments a key by 1. Creates the key if it does not exist.',
      category: 'Keys',
      icon: 'plus',
      api: {
        endpoint: '/incr',
        method: 'POST',
        baseUrl: 'redis://{host}:{port}',
      },
      inputSchema: {
        key: {
          type: 'string',
          required: true,
          label: 'Key',
          placeholder: 'counter',
          description: 'Name of the key to increment',
          aiControlled: false,
        },
        expire: {
          type: 'boolean',
          required: false,
          label: 'Set Expiration',
          default: false,
          description: 'Whether to set a timeout on key',
          aiControlled: false,
        },
        ttl: {
          type: 'number',
          required: false,
          label: 'TTL (seconds)',
          default: 60,
          min: 1,
          description: 'Number of seconds before key expiration',
          displayOptions: {
            show: {
              expire: [true],
            },
          },
          aiControlled: false,
        },
      },
      outputSchema: {
        value: {
          type: 'number',
          description: 'The new value after increment',
        },
      },
    },

    // GET INFO
    {
      id: 'get_info',
      name: 'Get Info',
      description: 'Returns generic information about the Redis instance',
      category: 'Server',
      icon: 'info',
      api: {
        endpoint: '/info',
        method: 'GET',
        baseUrl: 'redis://{host}:{port}',
      },
      inputSchema: {},
      outputSchema: {
        info: {
          type: 'object',
          description: 'Redis server information',
          properties: {
            redis_version: { type: 'string' },
            uptime_in_days: { type: 'number' },
            connected_clients: { type: 'number' },
            used_memory_human: { type: 'string' },
            total_commands_processed: { type: 'number' },
          },
        },
      },
    },

    // GET KEYS
    {
      id: 'get_keys',
      name: 'Get Keys',
      description: 'Returns all the keys matching a pattern',
      category: 'Keys',
      icon: 'key',
      api: {
        endpoint: '/keys',
        method: 'GET',
        baseUrl: 'redis://{host}:{port}',
      },
      inputSchema: {
        keyPattern: {
          type: 'string',
          required: true,
          label: 'Key Pattern',
          placeholder: '*',
          description: 'The key pattern for the keys to return (supports wildcards like *)',
          aiControlled: false,
        },
        getValues: {
          type: 'boolean',
          required: false,
          label: 'Get Values',
          default: true,
          description: 'Whether to get the value of matching keys',
          aiControlled: false,
        },
      },
      outputSchema: {
        keys: {
          type: 'array',
          description: 'Array of matching keys',
        },
        values: {
          type: 'object',
          description: 'Key-value pairs (if getValues is true)',
        },
      },
    },

    // LIST LENGTH
    {
      id: 'list_length',
      name: 'List Length',
      description: 'Returns the length of a list',
      category: 'Lists',
      icon: 'list',
      api: {
        endpoint: '/llen',
        method: 'GET',
        baseUrl: 'redis://{host}:{port}',
      },
      inputSchema: {
        list: {
          type: 'string',
          required: true,
          label: 'List Name',
          placeholder: 'mylist',
          description: 'Name of the list in Redis',
          aiControlled: false,
        },
      },
      outputSchema: {
        length: {
          type: 'number',
          description: 'The length of the list',
        },
      },
    },

    // PUSH TO LIST
    {
      id: 'push_to_list',
      name: 'Push to List',
      description: 'Push data to a Redis list',
      category: 'Lists',
      icon: 'arrow-right',
      api: {
        endpoint: '/push',
        method: 'POST',
        baseUrl: 'redis://{host}:{port}',
      },
      inputSchema: {
        list: {
          type: 'string',
          required: true,
          label: 'List Name',
          placeholder: 'mylist',
          description: 'Name of the list in Redis',
          aiControlled: false,
        },
        data: {
          type: 'string',
          required: true,
          label: 'Data',
          inputType: 'textarea',
          description: 'Data to push to the list',
          aiControlled: false,
        },
        tail: {
          type: 'boolean',
          required: false,
          label: 'Push to Tail',
          default: false,
          description: 'Whether to push data to the end (tail) of the list instead of the beginning (head)',
          aiControlled: false,
        },
      },
      outputSchema: {
        length: {
          type: 'number',
          description: 'The new length of the list after push',
        },
      },
    },

    // POP FROM LIST
    {
      id: 'pop_from_list',
      name: 'Pop from List',
      description: 'Pop data from a Redis list',
      category: 'Lists',
      icon: 'arrow-left',
      api: {
        endpoint: '/pop',
        method: 'POST',
        baseUrl: 'redis://{host}:{port}',
      },
      inputSchema: {
        list: {
          type: 'string',
          required: true,
          label: 'List Name',
          placeholder: 'mylist',
          description: 'Name of the list in Redis',
          aiControlled: false,
        },
        tail: {
          type: 'boolean',
          required: false,
          label: 'Pop from Tail',
          default: false,
          description: 'Whether to pop data from the end (tail) of the list instead of the beginning (head)',
          aiControlled: false,
        },
        propertyName: {
          type: 'string',
          required: false,
          label: 'Property Name',
          default: 'value',
          description: 'Name of the property to write received data to',
          aiControlled: false,
        },
      },
      outputSchema: {
        value: {
          type: 'any',
          description: 'The popped value',
        },
      },
    },

    // PUBLISH MESSAGE
    {
      id: 'publish',
      name: 'Publish Message',
      description: 'Publish a message to a Redis channel',
      category: 'Pub/Sub',
      icon: 'send',
      api: {
        endpoint: '/publish',
        method: 'POST',
        baseUrl: 'redis://{host}:{port}',
      },
      inputSchema: {
        channel: {
          type: 'string',
          required: true,
          label: 'Channel',
          placeholder: 'mychannel',
          description: 'Channel name to publish to',
          aiControlled: false,
        },
        data: {
          type: 'string',
          required: true,
          label: 'Message',
          inputType: 'textarea',
          description: 'Message data to publish',
          aiControlled: false,
        },
      },
      outputSchema: {
        receivers: {
          type: 'number',
          description: 'Number of subscribers that received the message',
        },
      },
    },
  ],

  supported_triggers: [
    {
      id: 'channel_message',
      name: 'Channel Message',
      description: 'Triggers when a message is received on a Redis channel',
      eventType: 'redis.message',
      icon: 'message-square',
      webhookRequired: false,
      pollingEnabled: true,
      inputSchema: {
        channels: {
          type: 'string',
          required: true,
          label: 'Channels',
          placeholder: 'channel1,channel2',
          description: 'Channels to subscribe to (comma-separated). Supports wildcard patterns with *.',
        },
        jsonParseBody: {
          type: 'boolean',
          required: false,
          label: 'JSON Parse Body',
          default: false,
          description: 'Whether to try to parse the message body as JSON',
        },
        onlyMessage: {
          type: 'boolean',
          required: false,
          label: 'Only Message',
          default: false,
          description: 'Whether to return only the message property without channel info',
        },
      },
      outputSchema: {
        redisEvent: {
          type: 'object',
          description: 'Redis message event data',
          properties: {
            channel: {
              type: 'string',
              description: 'The channel the message was received on',
            },
            message: {
              type: 'any',
              description: 'The message content',
            },
          },
        },
      },
    },
  ],
};
