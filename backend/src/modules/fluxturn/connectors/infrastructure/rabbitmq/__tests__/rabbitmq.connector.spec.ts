/**
 * RabbitMQ Connector Tests - Production Implementation
 */
import { RabbitmqConnector } from '../rabbitmq.connector';
import { ConnectorTestHelper } from '@test/helpers/connector-test.helper';

// Mock amqplib
jest.mock('amqplib', () => {
  const mockChannel = {
    assertQueue: jest.fn().mockResolvedValue({ queue: 'test-queue' }),
    assertExchange: jest.fn().mockResolvedValue({ exchange: 'test-exchange' }),
    sendToQueue: jest.fn().mockReturnValue(true),
    publish: jest.fn().mockReturnValue(true),
    consume: jest.fn().mockResolvedValue({ consumerTag: 'test-consumer' }),
    ack: jest.fn(),
    nack: jest.fn(),
    prefetch: jest.fn(),
    close: jest.fn().mockResolvedValue(undefined),
  };

  const mockConnection = {
    createChannel: jest.fn().mockResolvedValue(mockChannel),
    close: jest.fn().mockResolvedValue(undefined),
  };

  return {
    connect: jest.fn().mockResolvedValue(mockConnection),
    Connection: jest.fn(),
    Channel: jest.fn(),
  };
});

describe('RabbitmqConnector', () => {
  let connector: RabbitmqConnector;

  beforeEach(async () => {
    jest.clearAllMocks();
    connector = await ConnectorTestHelper.createConnector(RabbitmqConnector, 'rabbitmq');
  });

  describe('testConnection', () => {
    it('should return success when RabbitMQ responds', async () => {
      const result = await connector.testConnection();
      expect(result.success).toBe(true);
    });
  });

  describe('send_message', () => {
    it('should send message to queue', async () => {
      const result = await connector.executeAction('send_message', {
        mode: 'queue',
        queue: 'test-queue',
        sendInputData: false,
        message: 'Hello RabbitMQ',
        durable: true,
        autoDelete: false,
        exclusive: false,
      });

      expect(result.success).toBe(true);
      expect(result.data).toHaveProperty('mode', 'queue');
      expect(result.data).toHaveProperty('target', 'test-queue');
      expect(result.data).toHaveProperty('timestamp');
    });

    it('should send message to exchange', async () => {
      const result = await connector.executeAction('send_message', {
        mode: 'exchange',
        exchange: 'test-exchange',
        exchangeType: 'fanout',
        routingKey: '',
        sendInputData: false,
        message: 'Message to exchange',
        durable: true,
        autoDelete: false,
      });

      expect(result.success).toBe(true);
      expect(result.data.mode).toBe('exchange');
      expect(result.data.target).toBe('test-exchange');
    });

    it('should send message with routing key', async () => {
      const result = await connector.executeAction('send_message', {
        mode: 'exchange',
        exchange: 'topic-exchange',
        exchangeType: 'topic',
        routingKey: 'user.created',
        sendInputData: false,
        message: 'User created event',
        durable: true,
      });

      expect(result.success).toBe(true);
      expect(result.data.target).toBe('topic-exchange');
    });

    it('should send input data as message', async () => {
      const result = await connector.executeAction('send_message', {
        mode: 'queue',
        queue: 'data-queue',
        sendInputData: true,
        data: {
          userId: '456',
          event: 'order_placed',
          amount: 99.99
        },
        durable: true,
      });

      expect(result.success).toBe(true);
      expect(result.data.target).toBe('data-queue');
    });

    it('should send message with exchange options', async () => {
      const result = await connector.executeAction('send_message', {
        mode: 'exchange',
        exchange: 'main-exchange',
        exchangeType: 'direct',
        routingKey: 'orders',
        sendInputData: false,
        message: 'Order message',
        durable: true,
        autoDelete: false,
        alternateExchange: 'backup-exchange',
      });

      expect(result.success).toBe(true);
      expect(result.data.target).toBe('main-exchange');
    });

    it('should send non-durable message', async () => {
      const result = await connector.executeAction('send_message', {
        mode: 'queue',
        queue: 'temp-queue',
        sendInputData: false,
        message: 'Temporary message',
        durable: false,
        autoDelete: true,
        exclusive: true,
      });

      expect(result.success).toBe(true);
      expect(result.data.target).toBe('temp-queue');
    });

    it('should send message to headers exchange', async () => {
      const result = await connector.executeAction('send_message', {
        mode: 'exchange',
        exchange: 'headers-exchange',
        exchangeType: 'headers',
        routingKey: '',
        sendInputData: false,
        message: 'Headers-based message',
        durable: true,
      });

      expect(result.success).toBe(true);
      expect(result.data.target).toBe('headers-exchange');
    });
  });

  describe('delete_message', () => {
    it('should acknowledge message deletion', async () => {
      const result = await connector.executeAction('delete_message', {
        messageId: 'msg-123',
      });

      expect(result.success).toBe(true);
      expect(result.data).toHaveProperty('success', true);
      expect(result.data).toHaveProperty('timestamp');
    });
  });

  describe('unknown action', () => {
    it('should handle unknown action gracefully', async () => {
      const result = await connector.executeAction('non_existent_action', {});
      expect(result.success).toBe(false);
    });
  });
});
