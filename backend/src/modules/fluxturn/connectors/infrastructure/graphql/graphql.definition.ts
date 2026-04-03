// GraphQL Connector Definition
// Converted from n8n GraphQL node

import { ConnectorDefinition } from '../../shared';

export const GRAPHQL_CONNECTOR: ConnectorDefinition = {
  name: 'graphql',
  display_name: 'GraphQL',
  category: 'infrastructure',
  description: 'Makes a GraphQL request and returns the received data',
  auth_type: 'custom',
  complexity: 'Medium',
  verified: true,

  auth_fields: [
    {
      key: 'authentication',
      label: 'Authentication',
      type: 'select',
      required: true,
      options: [
        { label: 'None', value: 'none' },
        { label: 'Basic Auth', value: 'basicAuth' },
        { label: 'Header Auth', value: 'headerAuth' },
        { label: 'Query Auth', value: 'queryAuth' },
        { label: 'Custom Auth', value: 'customAuth' },
        { label: 'Digest Auth', value: 'digestAuth' },
        { label: 'OAuth1', value: 'oAuth1' },
        { label: 'OAuth2', value: 'oAuth2' }
      ],
      default: 'none',
      description: 'The way to authenticate'
    }
  ],

  endpoints: {},

  webhook_support: false,
  rate_limits: {},
  sandbox_available: false,

  supported_actions: [
    {
      id: 'execute_query',
      name: 'Execute Query',
      description: 'Execute a GraphQL query or mutation',
      category: 'Query',
      icon: 'code',
      verified: false,
      api: {
        endpoint: '',
        method: 'POST',
        baseUrl: '',
        headers: {},
        paramMapping: {}
      },
      inputSchema: {
        endpoint: {
          type: 'string',
          required: true,
          label: 'Endpoint',
          placeholder: 'http://example.com/graphql',
          description: 'The GraphQL endpoint',
          inputType: 'url',
          aiControlled: false
        },
        requestMethod: {
          type: 'select',
          required: false,
          label: 'HTTP Request Method',
          description: 'The underlying HTTP request method to use',
          options: [
            { label: 'GET', value: 'GET' },
            { label: 'POST', value: 'POST' }
          ],
          default: 'POST',
          aiControlled: false
        },
        requestFormat: {
          type: 'select',
          required: false,
          label: 'Request Format',
          description: 'The format for the query payload',
          options: [
            { label: 'JSON (Recommended)', value: 'json' },
            { label: 'GraphQL (Raw)', value: 'graphql' }
          ],
          default: 'json',
          aiControlled: false
        },
        query: {
          type: 'string',
          required: true,
          label: 'Query',
          description: 'GraphQL query or mutation',
          inputType: 'textarea',
          placeholder: `query {
  users {
    id
    name
    email
  }
}`,
          aiControlled: false
        },
        variables: {
          type: 'string',
          required: false,
          label: 'Variables',
          description: 'Query variables as JSON object',
          inputType: 'textarea',
          placeholder: '{ "userId": "123" }',
          aiControlled: false
        },
        operationName: {
          type: 'string',
          required: false,
          label: 'Operation Name',
          description: 'Name of operation to execute (for queries with multiple operations)',
          inputType: 'text',
          aiControlled: false
        },
        allowUnauthorizedCerts: {
          type: 'boolean',
          required: false,
          label: 'Ignore SSL Issues (Insecure)',
          description: 'Whether to download the response even if SSL certificate validation is not possible',
          default: false,
          aiControlled: false
        },
        responseFormat: {
          type: 'select',
          required: false,
          label: 'Response Format',
          description: 'The format in which the data gets returned',
          options: [
            { label: 'JSON', value: 'json' },
            { label: 'String', value: 'string' }
          ],
          default: 'json',
          aiControlled: false
        },
        headers: {
          type: 'array',
          required: false,
          label: 'Headers',
          description: 'Additional headers to send with the request',
          aiControlled: false,
          itemSchema: {
            name: {
              type: 'string',
              required: true,
              label: 'Name',
              placeholder: 'Content-Type',
              aiControlled: false
            },
            value: {
              type: 'string',
              required: true,
              label: 'Value',
              placeholder: 'application/json',
              aiControlled: false
            }
          }
        }
      },
      outputSchema: {
        data: {
          type: 'object',
          description: 'GraphQL response data'
        },
        errors: {
          type: 'array',
          description: 'GraphQL errors if any'
        }
      }
    }
  ],

  supported_triggers: []
};
