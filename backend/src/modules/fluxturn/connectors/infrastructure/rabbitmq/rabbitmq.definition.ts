// RabbitMQ Connector Definition
// Converted from n8n RabbitMQ node and RabbitMQTrigger node

import { ConnectorDefinition } from '../../shared';

export const RABBITMQ_CONNECTOR: ConnectorDefinition = {
  name: 'rabbitmq',
  display_name: 'RabbitMQ',
  category: 'infrastructure',
  description: 'Send and receive messages from RabbitMQ queues and exchanges',
  auth_type: 'custom',
  complexity: 'Advanced',
  verified: true,

  auth_fields: [
    {
      key: 'hostname',
      label: 'Hostname',
      type: 'string',
      required: true,
      placeholder: 'localhost',
      description: 'RabbitMQ server hostname'
    },
    {
      key: 'port',
      label: 'Port',
      type: 'number',
      required: true,
      default: 5672,
      description: 'RabbitMQ server port'
    },
    {
      key: 'username',
      label: 'Username',
      type: 'string',
      required: true,
      placeholder: 'guest',
      description: 'RabbitMQ username'
    },
    {
      key: 'password',
      label: 'Password',
      type: 'password',
      required: true,
      placeholder: 'guest',
      description: 'RabbitMQ password'
    },
    {
      key: 'vhost',
      label: 'Vhost',
      type: 'string',
      required: false,
      default: '/',
      description: 'RabbitMQ virtual host'
    },
    {
      key: 'ssl',
      label: 'SSL',
      type: 'boolean',
      required: false,
      default: false,
      description: 'Use SSL for connection'
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
      description: 'Send a message to RabbitMQ',
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
        mode: {
          type: 'select',
          required: true,
          label: 'Mode',
          description: 'To where data should be moved',
          options: [
            { label: 'Queue', value: 'queue' },
            { label: 'Exchange', value: 'exchange' }
          ],
          default: 'queue',
          aiControlled: false
        },
        queue: {
          type: 'string',
          required: false,
          label: 'Queue / Topic',
          placeholder: 'queue-name',
          description: 'Name of the queue to publish to',
          inputType: 'text',
          aiControlled: false
        },
        exchange: {
          type: 'string',
          required: false,
          label: 'Exchange',
          placeholder: 'exchange-name',
          description: 'Name of the exchange to publish to',
          inputType: 'text',
          aiControlled: false
        },
        exchangeType: {
          type: 'select',
          required: false,
          label: 'Exchange Type',
          description: 'Type of exchange',
          options: [
            { label: 'Direct', value: 'direct' },
            { label: 'Topic', value: 'topic' },
            { label: 'Headers', value: 'headers' },
            { label: 'Fanout', value: 'fanout' }
          ],
          default: 'fanout',
          aiControlled: false
        },
        routingKey: {
          type: 'string',
          required: false,
          label: 'Routing Key',
          placeholder: 'routing-key',
          description: 'The routing key for the message',
          inputType: 'text',
          aiControlled: false
        },
        sendInputData: {
          type: 'boolean',
          required: false,
          label: 'Send Input Data',
          description: 'Whether to send the data the node receives as JSON',
          default: true,
          aiControlled: false
        },
        message: {
          type: 'string',
          required: false,
          label: 'Message',
          description: 'The message to be sent',
          inputType: 'textarea',
          aiControlled: false
        },
        durable: {
          type: 'boolean',
          required: false,
          label: 'Durable',
          description: 'Whether the queue will survive broker restarts',
          default: true,
          aiControlled: false
        },
        autoDelete: {
          type: 'boolean',
          required: false,
          label: 'Auto Delete Queue',
          description: 'Whether the queue will be deleted when the number of consumers drops to zero',
          default: false,
          aiControlled: false
        },
        exclusive: {
          type: 'boolean',
          required: false,
          label: 'Exclusive',
          description: 'Whether to scope the queue to the connection',
          default: false,
          aiControlled: false
        },
        alternateExchange: {
          type: 'string',
          required: false,
          label: 'Alternate Exchange',
          description: 'An exchange to send messages to if this exchange can\'t route them to any queues',
          inputType: 'text',
          aiControlled: false
        }
      },
      outputSchema: {
        success: {
          type: 'boolean',
          description: 'Whether the message was sent successfully'
        }
      }
    },
    {
      id: 'delete_message',
      name: 'Delete From Queue',
      description: 'Delete an item from the queue triggered earlier in the workflow by a RabbitMQ Trigger node',
      category: 'Queue Management',
      icon: 'trash',
      verified: false,
      api: {
        endpoint: '',
        method: 'DELETE',
        baseUrl: '',
        headers: {},
        paramMapping: {}
      },
      inputSchema: {},
      outputSchema: {
        success: {
          type: 'boolean',
          description: 'Whether the deletion was successful'
        }
      }
    }
  ],

  supported_triggers: [
    {
      id: 'message_received',
      name: 'Message Received',
      description: 'Triggers when a message is received from a RabbitMQ queue',
      eventType: 'rabbitmq.message',
      icon: 'message-circle',
      webhookRequired: false,
      pollingEnabled: true,
      inputSchema: {
        queue: {
          type: 'string',
          required: true,
          label: 'Queue / Topic',
          placeholder: 'queue-name',
          description: 'The name of the queue to read from',
          inputType: 'text',
          aiControlled: false
        },
        acknowledge: {
          type: 'select',
          required: false,
          label: 'Delete From Queue When',
          description: 'When to acknowledge the message',
          options: [
            { label: 'Immediately', value: 'immediately' },
            { label: 'Execution Finishes', value: 'executionFinishes' },
            { label: 'Execution Finishes Successfully', value: 'executionFinishesSuccessfully' },
            { label: 'Specified Later in Workflow', value: 'laterMessageNode' }
          ],
          default: 'immediately',
          aiControlled: false
        },
        contentIsBinary: {
          type: 'boolean',
          required: false,
          label: 'Content Is Binary',
          description: 'Whether to save the content as binary',
          default: false,
          aiControlled: false
        },
        jsonParseBody: {
          type: 'boolean',
          required: false,
          label: 'JSON Parse Body',
          description: 'Whether to parse the body to an object',
          default: false,
          aiControlled: false
        },
        onlyContent: {
          type: 'boolean',
          required: false,
          label: 'Only Content',
          description: 'Whether to return only the content property',
          default: false,
          aiControlled: false
        },
        parallelMessages: {
          type: 'number',
          required: false,
          label: 'Parallel Message Processing Limit',
          description: 'Max number of executions at a time. Use -1 for no limit.',
          default: -1,
          min: -1,
          aiControlled: false
        },
        durable: {
          type: 'boolean',
          required: false,
          label: 'Durable',
          description: 'Whether the queue will survive broker restarts',
          default: true,
          aiControlled: false
        },
        autoDelete: {
          type: 'boolean',
          required: false,
          label: 'Auto Delete Queue',
          description: 'Whether the queue will be deleted when the number of consumers drops to zero',
          default: false,
          aiControlled: false
        },
        exclusive: {
          type: 'boolean',
          required: false,
          label: 'Exclusive',
          description: 'Whether to scope the queue to the connection',
          default: false,
          aiControlled: false
        }
      },
      outputSchema: {
        content: {
          type: 'object',
          description: 'The message content'
        },
        properties: {
          type: 'object',
          description: 'Message properties'
        },
        fields: {
          type: 'object',
          description: 'Message fields'
        }
      }
    }
  ]
};
