import { Injectable, Logger } from '@nestjs/common';
import { BaseConnector } from '../../base/base.connector';
import {
  ConnectorMetadata,
  ConnectorType,
  ConnectorCategory,
  ConnectorRequest,
  ConnectorResponse,
  AuthType,
} from '../../types';
import { Kafka, CompressionTypes, Producer, Consumer } from 'kafkajs';
import { SchemaRegistry } from '@kafkajs/confluent-schema-registry';

@Injectable()
export class KafkaConnector extends BaseConnector {
  protected readonly logger = new Logger(KafkaConnector.name);
  private kafka: Kafka | null = null;
  private producer: Producer | null = null;
  private consumer: Consumer | null = null;

  getMetadata(): ConnectorMetadata {
    return {
      name: 'Kafka',
      description: 'Send and consume messages from Apache Kafka topics',
      version: '1.0.0',
      category: ConnectorCategory.INFRASTRUCTURE,
      type: ConnectorType.KAFKA,
      authType: AuthType.CUSTOM,
      actions: [],
      triggers: [],
      webhookSupport: false,
    };
  }

  protected async initializeConnection(): Promise<void> {
    const brokers = this.config.credentials.brokers.split(',').map((b: string) => b.trim());
    const clientId = this.config.credentials.clientId || 'fluxturn-kafka-client';
    const ssl = this.config.credentials.ssl || false;

    const kafkaConfig: any = {
      clientId,
      brokers,
      ssl,
    };

    if (this.config.credentials.authentication) {
      kafkaConfig.sasl = {
        username: this.config.credentials.username,
        password: this.config.credentials.password,
        mechanism: this.config.credentials.saslMechanism || 'plain',
      };
    }

    this.kafka = new Kafka(kafkaConfig);
    this.logger.log('Kafka connector initialized');
  }

  protected async performConnectionTest(): Promise<boolean> {
    try {
      if (!this.kafka) {
        await this.initializeConnection();
      }

      const admin = this.kafka!.admin();
      await admin.connect();
      await admin.listTopics(); // Try to list topics to verify connection
      await admin.disconnect();

      return true;
    } catch (error) {
      this.logger.error('Kafka connection test failed', error);
      return false;
    }
  }

  protected async performHealthCheck(): Promise<void> {
    if (!this.kafka) {
      throw new Error('Kafka not initialized');
    }
  }

  protected async performRequest(request: ConnectorRequest): Promise<any> {
    throw new Error('Kafka uses custom action handlers, not generic requests');
  }

  protected async performAction(actionId: string, input: any): Promise<any> {
    switch (actionId) {
      case 'send_message':
        return await this.sendMessage(input);
      default:
        throw new Error(`Unknown action: ${actionId}`);
    }
  }

  protected async cleanup(): Promise<void> {
    try {
      if (this.producer) {
        await this.producer.disconnect();
        this.producer = null;
      }
      if (this.consumer) {
        await this.consumer.disconnect();
        this.consumer = null;
      }
      this.kafka = null;
      this.logger.log('Kafka connector cleanup completed');
    } catch (error) {
      this.logger.error('Kafka cleanup error', error);
    }
  }

  private async sendMessage(input: any): Promise<ConnectorResponse> {
    try {
      const {
        topic,
        sendInputData = true,
        message,
        useSchemaRegistry = false,
        schemaRegistryUrl,
        eventName,
        useKey = false,
        key,
        jsonParameters = false,
        headerParametersJson,
        acks = false,
        compression = false,
        timeout = 30000,
      } = input;

      // Ensure Kafka is initialized
      if (!this.kafka) {
        await this.initializeConnection();
      }

      // Create producer if not exists
      if (!this.producer) {
        this.producer = this.kafka!.producer();
        await this.producer.connect();
      }

      // Build message
      let messageValue: string | Buffer;
      if (sendInputData) {
        messageValue = JSON.stringify(input.data || {});
      } else {
        messageValue = message;
      }

      // Parse headers
      let headers: Record<string, string> = {};
      if (jsonParameters && headerParametersJson) {
        try {
          headers = JSON.parse(headerParametersJson);
        } catch (error) {
          return {
            success: false,
            error: {
              code: 'INVALID_HEADERS',
              message: 'Headers must be valid JSON',
            },
          };
        }
      }

      // Handle schema registry if needed
      if (useSchemaRegistry && schemaRegistryUrl) {
        try {
          const registry = new SchemaRegistry({ host: schemaRegistryUrl });
          const id = await registry.getLatestSchemaId(eventName);
          messageValue = await registry.encode(id, JSON.parse(messageValue as string));
        } catch (error) {
          return {
            success: false,
            error: {
              code: 'SCHEMA_REGISTRY_ERROR',
              message: `Schema registry error: ${error.message}`,
            },
          };
        }
      }

      const compressionType = compression ? CompressionTypes.GZIP : CompressionTypes.None;

      await this.producer.send({
        topic,
        messages: [{
          value: messageValue,
          key: useKey ? key : undefined,
          headers,
        }],
        acks: acks ? 1 : 0,
        compression: compressionType,
        timeout,
      });

      this.logger.log(`Kafka message sent to topic: ${topic}`);

      return {
        success: true,
        data: {
          success: true,
          topic,
          timestamp: new Date().toISOString(),
        },
      };
    } catch (error) {
      return {
        success: false,
        error: {
          code: 'KAFKA_SEND_FAILED',
          message: error.message,
        },
      };
    }
  }

  // Trigger handler (called by workflow engine)
  async handleTrigger(triggerId: string, config: any): Promise<void> {
    if (triggerId === 'message_received') {
      await this.consumeMessages(config);
    }
  }

  private async consumeMessages(config: any): Promise<void> {
    const {
      topic,
      groupId,
      useSchemaRegistry = false,
      schemaRegistryUrl,
      fromBeginning = true,
      jsonParseMessage = false,
      onlyMessage = false,
      returnHeaders = false,
      sessionTimeout = 30000,
      heartbeatInterval = 3000,
    } = config;

    try {
      // Ensure Kafka is initialized
      if (!this.kafka) {
        await this.initializeConnection();
      }

      // Create consumer
      this.consumer = this.kafka!.consumer({
        groupId,
        sessionTimeout,
        heartbeatInterval,
      });

      await this.consumer.connect();
      await this.consumer.subscribe({ topic, fromBeginning });

      this.logger.log(`Kafka consumer started for topic: ${topic}, group: ${groupId}`);

      await this.consumer.run({
        eachMessage: async ({ topic: messageTopic, partition, message }) => {
          try {
            let value: any = message.value?.toString();

            if (useSchemaRegistry && schemaRegistryUrl) {
              const registry = new SchemaRegistry({ host: schemaRegistryUrl });
              value = await registry.decode(message.value as Buffer);
            }

            if (jsonParseMessage) {
              try {
                value = JSON.parse(value);
              } catch (error) {
                // Keep as string if parsing fails
                this.logger.warn(`Failed to parse message as JSON: ${error.message}`);
              }
            }

            let data: any = {};
            if (returnHeaders && message.headers) {
              data.headers = Object.fromEntries(
                Object.entries(message.headers).map(([key, val]) => [
                  key,
                  val?.toString('utf8') ?? '',
                ])
              );
            }

            data.message = value;
            data.topic = messageTopic;
            data.partition = partition;
            data.offset = message.offset;
            data.timestamp = message.timestamp;

            if (onlyMessage) {
              data = value;
            }

            // Emit event to workflow engine
            this.eventEmitter.emit('trigger', {
              triggerId: 'message_received',
              data,
            });
          } catch (error) {
            this.logger.error(`Error processing Kafka message: ${error.message}`);
          }
        },
      });
    } catch (error) {
      this.logger.error(`Kafka consumer error: ${error.message}`);
      throw error;
    }
  }
}
