// Kafka Connector Definition
// Converted from n8n Kafka node and KafkaTrigger node

import { ConnectorDefinition } from '../../shared';

export const KAFKA_CONNECTOR: ConnectorDefinition = {
  name: 'kafka',
  display_name: 'Kafka',
  category: 'infrastructure',
  description: 'Send and consume messages from Apache Kafka topics',
  auth_type: 'custom',
  complexity: 'Advanced',
  verified: true,

  auth_fields: [
    {
      key: 'brokers',
      label: 'Brokers',
      type: 'string',
      required: true,
      placeholder: 'localhost:9092,localhost:9093',
      description: 'Comma-separated list of Kafka broker addresses'
    },
    {
      key: 'clientId',
      label: 'Client ID',
      type: 'string',
      required: true,
      placeholder: 'n8n-kafka-client',
      description: 'Unique identifier for the client'
    },
    {
      key: 'ssl',
      label: 'SSL',
      type: 'boolean',
      required: false,
      default: false,
      description: 'Use SSL for connection'
    },
    {
      key: 'authentication',
      label: 'Authentication',
      type: 'boolean',
      required: false,
      default: false,
      description: 'Enable SASL authentication'
    },
    {
      key: 'username',
      label: 'Username',
      type: 'string',
      required: false,
      description: 'SASL username (required if authentication is enabled)'
    },
    {
      key: 'password',
      label: 'Password',
      type: 'password',
      required: false,
      description: 'SASL password (required if authentication is enabled)'
    },
    {
      key: 'saslMechanism',
      label: 'SASL Mechanism',
      type: 'select',
      required: false,
      options: [
        { label: 'plain', value: 'plain' },
        { label: 'scram-sha-256', value: 'scram-sha-256' },
        { label: 'scram-sha-512', value: 'scram-sha-512' }
      ],
      default: 'plain',
      description: 'SASL authentication mechanism'
    }
  ],

  endpoints: {},

  webhook_support: false,
  rate_limits: {},
  sandbox_available: false,

  supported_actions: [
    {
      id: 'send_message',
      name: 'Send Message',
      description: 'Send messages to a Kafka topic',
      category: 'Producer',
      icon: 'send',
      verified: false,
      api: {
        endpoint: '',
        method: 'POST',
        baseUrl: '',
        headers: {},
        paramMapping: {}
      },
      inputSchema: {
        topic: {
          type: 'string',
          required: true,
          label: 'Topic',
          placeholder: 'topic-name',
          description: 'Name of the topic to publish to',
          inputType: 'text',
          aiControlled: false
        },
        sendInputData: {
          type: 'boolean',
          required: false,
          label: 'Send Input Data',
          description: 'Whether to send the data the node receives as JSON to Kafka',
          default: true,
          aiControlled: false
        },
        message: {
          type: 'string',
          required: false,
          label: 'Message',
          description: 'The message to be sent (if not sending input data)',
          inputType: 'textarea',
          aiControlled: false
        },
        useSchemaRegistry: {
          type: 'boolean',
          required: false,
          label: 'Use Schema Registry',
          description: 'Whether to use Confluent Schema Registry',
          default: false,
          aiControlled: false
        },
        schemaRegistryUrl: {
          type: 'string',
          required: false,
          label: 'Schema Registry URL',
          placeholder: 'https://schema-registry-domain:8081',
          description: 'URL of the schema registry',
          inputType: 'url',
          aiControlled: false
        },
        eventName: {
          type: 'string',
          required: false,
          label: 'Event Name',
          description: 'Namespace and Name of Schema in Schema Registry (namespace.name)',
          inputType: 'text',
          aiControlled: false
        },
        useKey: {
          type: 'boolean',
          required: false,
          label: 'Use Key',
          description: 'Whether to use a message key',
          default: false,
          aiControlled: false
        },
        key: {
          type: 'string',
          required: false,
          label: 'Key',
          description: 'The message key',
          inputType: 'text',
          aiControlled: false
        },
        jsonParameters: {
          type: 'boolean',
          required: false,
          label: 'JSON Parameters',
          description: 'Whether to use JSON for headers',
          default: false,
          aiControlled: false
        },
        headerParametersJson: {
          type: 'string',
          required: false,
          label: 'Headers (JSON)',
          description: 'Header parameters as JSON (flat object)',
          inputType: 'textarea',
          aiControlled: false
        },
        acks: {
          type: 'boolean',
          required: false,
          label: 'Acknowledgements',
          description: 'Whether producer must wait for acknowledgement from all replicas',
          default: false,
          aiControlled: false
        },
        compression: {
          type: 'boolean',
          required: false,
          label: 'Compression',
          description: 'Whether to send the data in a compressed format using the GZIP codec',
          default: false,
          aiControlled: false
        },
        timeout: {
          type: 'number',
          required: false,
          label: 'Timeout',
          description: 'The time to await a response in ms',
          default: 30000,
          min: 0,
          aiControlled: false
        }
      },
      outputSchema: {
        success: {
          type: 'boolean',
          description: 'Whether the message was sent successfully'
        }
      }
    }
  ],

  supported_triggers: [
    {
      id: 'message_received',
      name: 'Message Received',
      description: 'Triggers when a message is received from a Kafka topic',
      eventType: 'kafka.message',
      icon: 'message-circle',
      webhookRequired: false,
      pollingEnabled: true,
      inputSchema: {
        topic: {
          type: 'string',
          required: true,
          label: 'Topic',
          placeholder: 'topic-name',
          description: 'Name of the topic to consume from',
          inputType: 'text',
          aiControlled: false
        },
        groupId: {
          type: 'string',
          required: true,
          label: 'Group ID',
          placeholder: 'n8n-kafka',
          description: 'ID of the consumer group',
          inputType: 'text',
          aiControlled: false
        },
        useSchemaRegistry: {
          type: 'boolean',
          required: false,
          label: 'Use Schema Registry',
          description: 'Whether to use Confluent Schema Registry',
          default: false,
          aiControlled: false
        },
        schemaRegistryUrl: {
          type: 'string',
          required: false,
          label: 'Schema Registry URL',
          placeholder: 'https://schema-registry-domain:8081',
          description: 'URL of the schema registry',
          inputType: 'url',
          aiControlled: false
        },
        allowAutoTopicCreation: {
          type: 'boolean',
          required: false,
          label: 'Allow Topic Creation',
          description: 'Whether to allow sending message to a previously non-existing topic',
          default: false,
          aiControlled: false
        },
        fromBeginning: {
          type: 'boolean',
          required: false,
          label: 'Read Messages From Beginning',
          description: 'Whether to read message from beginning',
          default: true,
          aiControlled: false
        },
        jsonParseMessage: {
          type: 'boolean',
          required: false,
          label: 'JSON Parse Message',
          description: 'Whether to try to parse the message to an object',
          default: false,
          aiControlled: false
        },
        onlyMessage: {
          type: 'boolean',
          required: false,
          label: 'Only Message',
          description: 'Whether to return only the message property',
          default: false,
          aiControlled: false
        },
        returnHeaders: {
          type: 'boolean',
          required: false,
          label: 'Return Headers',
          description: 'Whether to return the headers received from Kafka',
          default: false,
          aiControlled: false
        },
        parallelProcessing: {
          type: 'boolean',
          required: false,
          label: 'Parallel Processing',
          description: 'Whether to process messages in parallel or by keeping the message in order',
          default: true,
          aiControlled: false
        },
        sessionTimeout: {
          type: 'number',
          required: false,
          label: 'Session Timeout',
          description: 'The time to await a response in ms',
          default: 30000,
          min: 0,
          aiControlled: false
        },
        heartbeatInterval: {
          type: 'number',
          required: false,
          label: 'Heartbeat Interval',
          description: 'Heartbeats are used to ensure that the consumer\'s session stays active',
          default: 3000,
          min: 0,
          aiControlled: false
        }
      },
      outputSchema: {
        message: {
          type: 'object',
          description: 'The received message'
        },
        topic: {
          type: 'string',
          description: 'The topic the message was received from'
        },
        headers: {
          type: 'object',
          description: 'Message headers (if returnHeaders is true)'
        }
      }
    }
  ]
};
