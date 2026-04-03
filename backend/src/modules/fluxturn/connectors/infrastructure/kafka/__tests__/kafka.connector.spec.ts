/**
 * Kafka Connector Tests - Production Implementation
 */
import { KafkaConnector } from '../kafka.connector';
import { ConnectorTestHelper } from '@test/helpers/connector-test.helper';

// Mock kafkajs
jest.mock('kafkajs', () => {
  const mockProducer = {
    connect: jest.fn().mockResolvedValue(undefined),
    disconnect: jest.fn().mockResolvedValue(undefined),
    send: jest.fn().mockResolvedValue([{ topicName: 'test-topic', partition: 0, errorCode: 0 }]),
  };

  const mockAdmin = {
    connect: jest.fn().mockResolvedValue(undefined),
    disconnect: jest.fn().mockResolvedValue(undefined),
    listTopics: jest.fn().mockResolvedValue(['topic1', 'topic2']),
  };

  const mockKafka = jest.fn().mockImplementation(() => ({
    producer: jest.fn(() => mockProducer),
    admin: jest.fn(() => mockAdmin),
    consumer: jest.fn(() => ({
      connect: jest.fn().mockResolvedValue(undefined),
      disconnect: jest.fn().mockResolvedValue(undefined),
      subscribe: jest.fn().mockResolvedValue(undefined),
      run: jest.fn().mockResolvedValue(undefined),
    })),
  }));

  return {
    Kafka: mockKafka,
    CompressionTypes: {
      None: 0,
      GZIP: 1,
      Snappy: 2,
      LZ4: 3,
      ZSTD: 4,
    },
  };
});

// Mock schema registry
jest.mock('@kafkajs/confluent-schema-registry', () => {
  return {
    SchemaRegistry: jest.fn().mockImplementation(() => ({
      getLatestSchemaId: jest.fn().mockResolvedValue(1),
      encode: jest.fn().mockImplementation((id, data) => Buffer.from(JSON.stringify(data))),
      decode: jest.fn().mockResolvedValue({ decoded: 'data' }),
    })),
  };
});

describe('KafkaConnector', () => {
  let connector: KafkaConnector;

  beforeEach(async () => {
    jest.clearAllMocks();
    connector = await ConnectorTestHelper.createConnector(KafkaConnector, 'kafka');
  });

  describe('testConnection', () => {
    it('should return success when Kafka responds', async () => {
      const result = await connector.testConnection();
      expect(result.success).toBe(true);
    });
  });

  describe('send_message', () => {
    it('should send message to Kafka topic', async () => {
      const result = await connector.executeAction('send_message', {
        topic: 'test-topic',
        sendInputData: false,
        message: 'Hello Kafka',
        useSchemaRegistry: false,
        useKey: false,
        jsonParameters: false,
        acks: true,
        compression: false,
        timeout: 30000,
      });

      expect(result.success).toBe(true);
      expect(result.data).toHaveProperty('topic', 'test-topic');
      expect(result.data).toHaveProperty('timestamp');
      expect(result.data.success).toBe(true);
    });

    it('should send message with key', async () => {
      const result = await connector.executeAction('send_message', {
        topic: 'keyed-topic',
        sendInputData: false,
        message: 'Message with key',
        useKey: true,
        key: 'user-123',
        useSchemaRegistry: false,
        jsonParameters: false,
      });

      expect(result.success).toBe(true);
      expect(result.data.topic).toBe('keyed-topic');
    });

    it('should send input data as message', async () => {
      const result = await connector.executeAction('send_message', {
        topic: 'data-topic',
        sendInputData: true,
        data: {
          userId: '123',
          action: 'login',
          timestamp: '2026-01-14T12:00:00Z'
        },
        useSchemaRegistry: false,
        jsonParameters: false,
      });

      expect(result.success).toBe(true);
      expect(result.data.topic).toBe('data-topic');
    });

    it('should handle headers in JSON format', async () => {
      const result = await connector.executeAction('send_message', {
        topic: 'headers-topic',
        sendInputData: false,
        message: 'Message with headers',
        jsonParameters: true,
        headerParametersJson: JSON.stringify({
          'correlation-id': 'abc-123',
          'content-type': 'application/json'
        }),
        useSchemaRegistry: false,
      });

      expect(result.success).toBe(true);
      expect(result.data.topic).toBe('headers-topic');
    });

    it('should handle invalid headers JSON', async () => {
      const result = await connector.executeAction('send_message', {
        topic: 'test-topic',
        sendInputData: false,
        message: 'Test message',
        jsonParameters: true,
        headerParametersJson: '{invalid json}',
        useSchemaRegistry: false,
      });

      expect(result.success).toBe(false);
      expect(result.error?.code).toBe('INVALID_HEADERS');
      expect(result.error?.message).toContain('valid JSON');
    });

    it('should send message with compression enabled', async () => {
      const result = await connector.executeAction('send_message', {
        topic: 'compressed-topic',
        sendInputData: false,
        message: 'Compressed message',
        compression: true,
        useSchemaRegistry: false,
        jsonParameters: false,
      });

      expect(result.success).toBe(true);
      expect(result.data.topic).toBe('compressed-topic');
    });

    it('should send message with schema registry', async () => {
      const result = await connector.executeAction('send_message', {
        topic: 'schema-topic',
        sendInputData: false,
        message: JSON.stringify({ name: 'Test', value: 123 }),
        useSchemaRegistry: true,
        schemaRegistryUrl: 'http://localhost:8081',
        eventName: 'test-event',
        jsonParameters: false,
      });

      expect(result.success).toBe(true);
      expect(result.data.topic).toBe('schema-topic');
    });
  });

  describe('unknown action', () => {
    it('should handle unknown action gracefully', async () => {
      const result = await connector.executeAction('non_existent_action', {});
      expect(result.success).toBe(false);
    });
  });
});
