import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { PlatformService } from '../../../database/platform.service';
import { v4 as uuidv4 } from 'uuid';

/**
 * Redis Connector Seeder
 * Seeds Redis as a connector to enable credential management
 * Redis is used for memory storage, caching, and session management
 */
@Injectable()
export class RedisSeederService implements OnModuleInit {
  private readonly logger = new Logger(RedisSeederService.name);

  constructor(private readonly platformService: PlatformService) {}

  async onModuleInit() {
    this.logger.log('🔴 Seeding Redis connector...');
    await this.seedRedis();
  }

  private async seedRedis(): Promise<void> {
    try {
      const connectorName = 'redis';

      // Check if connector already exists
      const existingQuery = `
        SELECT * FROM connectors WHERE name = $1
      `;
      const existing = await this.platformService.query(existingQuery, [connectorName]);

      if (existing.rows.length > 0) {
        this.logger.log('✅ Redis connector already exists, skipping...');
        return;
      }

      // Insert the Redis connector
      const insertQuery = `
        INSERT INTO connectors (
          id, name, display_name, description, category, type,
          status, is_public, auth_type, auth_fields, endpoints,
          webhook_support, rate_limits, sandbox_available, capabilities,
          supported_triggers, supported_actions, oauth_config,
          created_at, updated_at
        ) VALUES (
          $1, $2, $3, $4, $5, $6,
          $7, $8, $9, $10::jsonb, $11::jsonb,
          $12, $13::jsonb, $14, $15::jsonb,
          $16::jsonb, $17::jsonb, $18::jsonb,
          NOW(), NOW()
        )
      `;

      const connectorData = {
        id: uuidv4(),
        name: 'redis',
        display_name: 'Redis',
        description: 'Redis in-memory data store for caching, sessions, and memory storage',
        category: 'database',
        type: 'official',
        status: 'active',
        is_public: true,
        auth_type: 'credentials',
        auth_fields: {
          host: {
            type: 'string',
            label: 'Host',
            required: true,
            description: 'Redis server hostname or IP address',
            placeholder: 'localhost',
            default: 'localhost',
          },
          port: {
            type: 'number',
            label: 'Port',
            required: true,
            description: 'Redis server port',
            placeholder: '6379',
            default: 6379,
          },
          password: {
            type: 'password',
            label: 'Password',
            required: false,
            description: 'Redis authentication password (if required)',
            placeholder: 'your-redis-password',
          },
          username: {
            type: 'string',
            label: 'Username',
            required: false,
            description: 'Redis username (Redis 6.0+)',
            placeholder: 'default',
          },
          database: {
            type: 'number',
            label: 'Database',
            required: false,
            description: 'Redis database number (0-15)',
            placeholder: '0',
            default: 0,
            min: 0,
            max: 15,
          },
          ssl: {
            type: 'boolean',
            label: 'Use SSL/TLS',
            required: false,
            description: 'Enable SSL/TLS encryption for connection',
            default: false,
          },
        },
        endpoints: {
          base_url: 'redis://',
        },
        webhook_support: false,
        rate_limits: {
          requests_per_second: 10000,
          concurrent_connections: 10000,
        },
        sandbox_available: false,
        capabilities: {
          memory_storage: true,
          session_management: true,
          caching: true,
          pub_sub: true,
          persistence: true,
          clustering: true,
          ttl: true,
        },
        supported_triggers: [],
        supported_actions: [
          {
            id: 'provide_memory',
            name: 'Provide Memory Storage',
            description: 'Configure Redis for persistent conversation memory',
            category: 'Memory Provider',
            icon: 'Database',
            inputSchema: {
              sessionIdType: {
                type: 'select',
                label: 'Session ID',
                required: false,
                default: 'fromInput',
                description: 'Where to get the session ID from',
                options: [
                  { label: 'From Trigger (sessionId)', value: 'fromInput' },
                  { label: 'Custom Expression', value: 'customKey' },
                ],
              },
              sessionKey: {
                type: 'string',
                label: 'Session Key',
                required: false,
                default: '{{ $json.sessionId }}',
                description: 'Expression to extract session ID',
                placeholder: '{{ $json.sessionId }}',
              },
              sessionTTL: {
                type: 'number',
                label: 'Session Time To Live (seconds)',
                required: false,
                default: 0,
                min: 0,
                description: 'How long to keep sessions in Redis (0 = never expire)',
                placeholder: '3600',
              },
              contextWindowLength: {
                type: 'number',
                label: 'Context Window Length',
                required: false,
                default: 5,
                min: 1,
                max: 100,
                description: 'How many past message pairs to remember',
                placeholder: '5',
              },
            },
            outputSchema: {
              memory: {
                type: 'object',
                description: 'Redis-backed conversation memory',
                properties: {
                  sessionId: 'string',
                  workflowId: 'string',
                  contextWindowLength: 'number',
                  sessionTTL: 'number',
                  messages: 'array',
                },
              },
            },
          },
        ],
        oauth_config: null,
      };

      await this.platformService.query(insertQuery, [
        connectorData.id,
        connectorData.name,
        connectorData.display_name,
        connectorData.description,
        connectorData.category,
        connectorData.type,
        connectorData.status,
        connectorData.is_public,
        connectorData.auth_type,
        JSON.stringify(connectorData.auth_fields),
        JSON.stringify(connectorData.endpoints),
        connectorData.webhook_support,
        JSON.stringify(connectorData.rate_limits),
        connectorData.sandbox_available,
        JSON.stringify(connectorData.capabilities),
        JSON.stringify(connectorData.supported_triggers),
        JSON.stringify(connectorData.supported_actions),
        connectorData.oauth_config,
      ]);

      this.logger.log(`✅ Successfully seeded Redis connector`);
    } catch (error) {
      this.logger.error('Error seeding Redis connector:', error);
      throw error;
    }
  }
}
