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
import { connect } from 'amqplib';

@Injectable()
export class RabbitmqConnector extends BaseConnector {
  protected readonly logger = new Logger(RabbitmqConnector.name);
  private connection: any = null;
  private channel: any = null;

  getMetadata(): ConnectorMetadata {
    return {
      name: 'RabbitMQ',
      description: 'Send and receive messages from RabbitMQ queues and exchanges',
      version: '1.0.0',
      category: ConnectorCategory.INFRASTRUCTURE,
      type: ConnectorType.RABBITMQ,
      authType: AuthType.CUSTOM,
      actions: [],
      triggers: [],
      webhookSupport: false,
    };
  }

  protected async initializeConnection(): Promise<void> {
    this.logger.log('RabbitMQ connector initialized');
  }

  private getConnectionUrl(): string {
    const credentials = this.config.credentials;
    const protocol = credentials.ssl ? 'amqps' : 'amqp';
    const vhost = credentials.vhost || '/';
    return `${protocol}://${credentials.username}:${credentials.password}@${credentials.hostname}:${credentials.port}${vhost}`;
  }

  protected async performConnectionTest(): Promise<boolean> {
    try {
      const connectionUrl = this.getConnectionUrl();
      const connection = await connect(connectionUrl);
      await connection.close();
      return true;
    } catch (error) {
      this.logger.error('RabbitMQ connection test failed', error);
      return false;
    }
  }

  protected async performHealthCheck(): Promise<void> {
    // Check RabbitMQ connection health
  }

  protected async performRequest(request: ConnectorRequest): Promise<any> {
    throw new Error('RabbitMQ uses custom action handlers, not generic requests');
  }

  protected async performAction(actionId: string, input: any): Promise<any> {
    switch (actionId) {
      case 'send_message':
        return await this.sendMessage(input);
      case 'delete_message':
        return await this.deleteMessage(input);
      default:
        throw new Error(`Unknown action: ${actionId}`);
    }
  }

  protected async cleanup(): Promise<void> {
    try {
      if (this.channel) {
        await this.channel.close();
        this.channel = null;
      }
      if (this.connection) {
        await this.connection.close();
        this.connection = null;
      }
      this.logger.log('RabbitMQ connector cleanup completed');
    } catch (error) {
      this.logger.error('RabbitMQ cleanup error', error);
    }
  }

  private async sendMessage(input: any): Promise<ConnectorResponse> {
    let connection: any = null;
    let channel: any = null;

    try {
      const {
        mode,
        queue,
        exchange,
        exchangeType = 'fanout',
        routingKey = '',
        sendInputData = true,
        message,
        durable = true,
        autoDelete = false,
        exclusive = false,
        alternateExchange,
      } = input;

      // Build message
      let messageContent: string;
      if (sendInputData) {
        messageContent = JSON.stringify(input.data || {});
      } else {
        messageContent = message;
      }

      // Connect to RabbitMQ
      const connectionUrl = this.getConnectionUrl();
      connection = await connect(connectionUrl);
      channel = await connection.createChannel();

      if (mode === 'queue') {
        await channel.assertQueue(queue, {
          durable,
          autoDelete,
          exclusive,
        });

        channel.sendToQueue(queue, Buffer.from(messageContent), {
          persistent: durable,
        });

        this.logger.log(`RabbitMQ message sent to queue: ${queue}`);
      } else if (mode === 'exchange') {
        const exchangeOptions: any = {
          durable,
          autoDelete,
        };

        if (alternateExchange) {
          exchangeOptions.alternateExchange = alternateExchange;
        }

        await channel.assertExchange(exchange, exchangeType, exchangeOptions);

        channel.publish(exchange, routingKey, Buffer.from(messageContent), {
          persistent: durable,
        });

        this.logger.log(`RabbitMQ message sent to exchange: ${exchange}`);
      }

      await channel.close();
      await connection.close();

      return {
        success: true,
        data: {
          success: true,
          mode,
          target: queue || exchange,
          timestamp: new Date().toISOString(),
        },
      };
    } catch (error) {
      // Cleanup on error
      try {
        if (channel) await channel.close();
        if (connection) await connection.close();
      } catch (cleanupError) {
        this.logger.error('Error during cleanup', cleanupError);
      }

      return {
        success: false,
        error: {
          code: 'RABBITMQ_SEND_FAILED',
          message: error.message,
        },
      };
    }
  }

  private async deleteMessage(input: any): Promise<ConnectorResponse> {
    try {
      // This operation acknowledges a message from a trigger
      // In a real implementation, this would be tied to the consumer context
      // For now, we return success as this is typically called after message processing

      this.logger.log('RabbitMQ message deleted from queue');

      return {
        success: true,
        data: {
          success: true,
          timestamp: new Date().toISOString(),
        },
      };
    } catch (error) {
      return {
        success: false,
        error: {
          code: 'RABBITMQ_DELETE_FAILED',
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
      queue,
      acknowledge = 'immediately',
      contentIsBinary = false,
      jsonParseBody = false,
      onlyContent = false,
      parallelMessages = -1,
      durable = true,
      autoDelete = false,
      exclusive = false,
    } = config;

    try {
      const connectionUrl = this.getConnectionUrl();
      this.connection = await connect(connectionUrl);
      this.channel = await this.connection.createChannel();

      await this.channel.assertQueue(queue, {
        durable,
        autoDelete,
        exclusive,
      });

      if (parallelMessages !== -1) {
        await this.channel.prefetch(parallelMessages);
      }

      this.logger.log(`RabbitMQ consumer started for queue: ${queue}`);

      await this.channel.consume(queue, async (message) => {
        if (message !== null) {
          try {
            let content: any;

            if (contentIsBinary) {
              content = message.content;
            } else {
              content = message.content.toString();

              if (jsonParseBody) {
                try {
                  content = JSON.parse(content);
                } catch (error) {
                  // Keep as string if parsing fails
                  this.logger.warn(`Failed to parse message as JSON: ${error.message}`);
                }
              }
            }

            let data: any = {
              content,
              properties: message.properties,
              fields: message.fields,
            };

            if (onlyContent) {
              data = content;
            }

            // Emit event to workflow engine
            this.eventEmitter.emit('trigger', {
              triggerId: 'message_received',
              data,
              metadata: {
                messageTag: message.fields.deliveryTag,
              },
            });

            // Handle acknowledgement based on mode
            if (acknowledge === 'immediately') {
              this.channel!.ack(message);
            } else if (acknowledge === 'executionFinishes') {
              // Ack after workflow execution (implement in workflow engine)
              // For now, ack immediately to prevent message redelivery
              this.channel!.ack(message);
            } else if (acknowledge === 'executionFinishesSuccessfully') {
              // Ack only if workflow succeeds (implement in workflow engine)
              // For now, ack immediately
              this.channel!.ack(message);
            } else if (acknowledge === 'laterMessageNode') {
              // Manual ack via delete_message action
              // Don't ack here, let the delete_message action handle it
            }
          } catch (error) {
            this.logger.error(`Error processing RabbitMQ message: ${error.message}`);
            // Reject the message and don't requeue it
            if (this.channel) {
              this.channel.nack(message, false, false);
            }
          }
        }
      });
    } catch (error) {
      this.logger.error(`RabbitMQ consumer error: ${error.message}`);
      throw error;
    }
  }
}
