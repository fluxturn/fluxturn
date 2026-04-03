/**
 * Advanced HTTP Request Node Schema
 * Based on n8n's HTTP Request node implementation
 * Supports all advanced features: authentication, pagination, SSL, batching, etc.
 */

export const HTTP_REQUEST_SCHEMA = {
  // ============ BASIC CONFIGURATION ============
  method: {
    type: 'string',
    required: true,
    enum: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'HEAD', 'OPTIONS'],
    default: 'GET',
    displayName: 'Method',
    description: 'The HTTP method to use for the request',
  },

  url: {
    type: 'string',
    required: true,
    displayName: 'URL',
    description: 'The URL to make the request to',
    placeholder: 'https://api.example.com/endpoint',
  },

  // ============ AUTHENTICATION ============
  authentication: {
    type: 'string',
    required: true,
    enum: ['none', 'basicAuth', 'bearerToken', 'headerAuth', 'queryAuth', 'digestAuth', 'oAuth2'],
    default: 'none',
    displayName: 'Authentication',
    description: 'The authentication method to use',
  },

  // Basic Auth
  basicAuth: {
    type: 'object',
    displayName: 'Basic Auth',
    description: 'Basic authentication credentials',
    displayOptions: {
      show: { authentication: ['basicAuth'] },
    },
    properties: {
      username: {
        type: 'string',
        required: true,
        displayName: 'Username',
      },
      password: {
        type: 'string',
        required: true,
        displayName: 'Password',
        typeOptions: { password: true },
      },
    },
  },

  // Bearer Token
  bearerToken: {
    type: 'string',
    displayName: 'Bearer Token',
    description: 'The bearer token for authentication',
    typeOptions: { password: true },
    displayOptions: {
      show: { authentication: ['bearerToken'] },
    },
  },

  // Header Auth
  headerAuth: {
    type: 'object',
    displayName: 'Header Auth',
    description: 'Custom header authentication',
    displayOptions: {
      show: { authentication: ['headerAuth'] },
    },
    properties: {
      name: {
        type: 'string',
        required: true,
        displayName: 'Header Name',
        placeholder: 'X-API-Key',
      },
      value: {
        type: 'string',
        required: true,
        displayName: 'Header Value',
        typeOptions: { password: true },
      },
    },
  },

  // Query Auth
  queryAuth: {
    type: 'object',
    displayName: 'Query Auth',
    description: 'Query parameter authentication',
    displayOptions: {
      show: { authentication: ['queryAuth'] },
    },
    properties: {
      name: {
        type: 'string',
        required: true,
        displayName: 'Query Parameter Name',
        placeholder: 'api_key',
      },
      value: {
        type: 'string',
        required: true,
        displayName: 'Query Parameter Value',
        typeOptions: { password: true },
      },
    },
  },

  // ============ QUERY PARAMETERS ============
  sendQuery: {
    type: 'boolean',
    default: false,
    displayName: 'Query Parameters',
    description: 'Add query parameters to the request',
  },

  queryParametersUI: {
    type: 'fixedCollection',
    displayName: 'Query Parameters',
    description: 'The query parameters to send',
    placeholder: 'Add Parameter',
    displayOptions: {
      show: { sendQuery: [true] },
    },
    typeOptions: {
      multipleValues: true,
    },
    options: [
      {
        name: 'parameter',
        displayName: 'Parameter',
        values: [
          {
            name: 'name',
            type: 'string',
            displayName: 'Name',
            required: true,
          },
          {
            name: 'value',
            type: 'string',
            displayName: 'Value',
            required: true,
          },
        ],
      },
    ],
  },

  // ============ HEADERS ============
  sendHeaders: {
    type: 'boolean',
    default: false,
    displayName: 'Headers',
    description: 'Add custom headers to the request',
  },

  headersUI: {
    type: 'fixedCollection',
    displayName: 'Header Parameters',
    description: 'The headers to send',
    placeholder: 'Add Header',
    displayOptions: {
      show: { sendHeaders: [true] },
    },
    typeOptions: {
      multipleValues: true,
    },
    options: [
      {
        name: 'parameter',
        displayName: 'Header',
        values: [
          {
            name: 'name',
            type: 'string',
            displayName: 'Name',
            required: true,
          },
          {
            name: 'value',
            type: 'string',
            displayName: 'Value',
            required: true,
          },
        ],
      },
    ],
  },

  // ============ REQUEST BODY ============
  sendBody: {
    type: 'boolean',
    default: false,
    displayName: 'Body',
    description: 'Add a body to the request',
    displayOptions: {
      show: {
        method: ['POST', 'PUT', 'PATCH', 'DELETE'],
      },
    },
  },

  bodyContentType: {
    type: 'string',
    displayName: 'Body Content Type',
    description: 'Content type of the body to send',
    default: 'json',
    enum: ['json', 'form-urlencoded', 'multipart-form-data', 'raw', 'binary'],
    displayOptions: {
      show: {
        sendBody: [true],
      },
    },
  },

  // JSON Body
  jsonBody: {
    type: 'string',
    displayName: 'JSON Body',
    description: 'Body to send as JSON',
    default: '{\n  \n}',
    typeOptions: {
      alwaysOpenEditWindow: true,
      editor: 'json',
    },
    displayOptions: {
      show: {
        sendBody: [true],
        bodyContentType: ['json'],
      },
    },
  },

  // Form Body
  bodyParametersUI: {
    type: 'fixedCollection',
    displayName: 'Body Parameters',
    description: 'The body parameters to send',
    placeholder: 'Add Parameter',
    displayOptions: {
      show: {
        sendBody: [true],
        bodyContentType: ['form-urlencoded', 'multipart-form-data'],
      },
    },
    typeOptions: {
      multipleValues: true,
    },
    options: [
      {
        name: 'parameter',
        displayName: 'Parameter',
        values: [
          {
            name: 'name',
            type: 'string',
            displayName: 'Name',
            required: true,
          },
          {
            name: 'value',
            type: 'string',
            displayName: 'Value',
            required: true,
          },
        ],
      },
    ],
  },

  // Raw Body
  rawBody: {
    type: 'string',
    displayName: 'Raw Body',
    description: 'Raw body to send',
    default: '',
    typeOptions: {
      alwaysOpenEditWindow: true,
    },
    displayOptions: {
      show: {
        sendBody: [true],
        bodyContentType: ['raw'],
      },
    },
  },

  rawBodyMimeType: {
    type: 'string',
    displayName: 'Content Type',
    description: 'Content-Type header for raw body',
    default: 'text/plain',
    placeholder: 'text/plain',
    displayOptions: {
      show: {
        sendBody: [true],
        bodyContentType: ['raw'],
      },
    },
  },

  // ============ RESPONSE HANDLING ============
  responseFormat: {
    type: 'string',
    displayName: 'Response Format',
    description: 'The format to receive the response data in',
    default: 'autodetect',
    enum: ['autodetect', 'json', 'text', 'file'],
  },

  fullResponse: {
    type: 'boolean',
    displayName: 'Include Response Headers and Status',
    description: 'Returns the full response data including headers and status code',
    default: false,
  },

  neverError: {
    type: 'boolean',
    displayName: 'Never Error',
    description: 'HTTP errors will not cause the node to fail',
    default: false,
  },

  // ============ OPTIONS ============
  options: {
    type: 'collection',
    displayName: 'Options',
    description: 'Additional options',
    placeholder: 'Add Option',
    default: {},
    options: [
      {
        name: 'timeout',
        type: 'number',
        displayName: 'Timeout',
        description: 'Time in milliseconds to wait for a response before timing out',
        default: 10000,
        typeOptions: {
          minValue: 1,
        },
      },
      {
        name: 'followRedirect',
        type: 'boolean',
        displayName: 'Follow Redirects',
        description: 'Whether to follow HTTP 3xx redirects',
        default: true,
      },
      {
        name: 'maxRedirects',
        type: 'number',
        displayName: 'Max Redirects',
        description: 'Maximum number of redirects to follow',
        default: 21,
        displayOptions: {
          show: { followRedirect: [true] },
        },
      },
      {
        name: 'allowUnauthorizedCerts',
        type: 'boolean',
        displayName: 'Ignore SSL Issues',
        description: 'Whether to download the response even if SSL certificate validation is not possible',
        default: false,
      },
      {
        name: 'proxy',
        type: 'string',
        displayName: 'Proxy',
        description: 'HTTP proxy to use',
        placeholder: 'http://proxy:8080',
      },
      {
        name: 'lowercaseHeaders',
        type: 'boolean',
        displayName: 'Lowercase Headers',
        description: 'Lowercase header names',
        default: true,
      },
      {
        name: 'arrayFormat',
        type: 'string',
        displayName: 'Array Format in Query',
        description: 'How to format arrays in query parameters',
        default: 'brackets',
        enum: [
          { name: 'No Brackets', value: 'repeat' },
          { name: 'Brackets Only', value: 'brackets' },
          { name: 'Brackets with Indices', value: 'indices' },
        ],
      },
      // Batching
      {
        name: 'batching',
        type: 'object',
        displayName: 'Batching',
        description: 'Settings for batching requests',
        properties: {
          batchSize: {
            type: 'number',
            displayName: 'Batch Size',
            description: 'Number of items to process in each batch',
            default: 50,
          },
          batchInterval: {
            type: 'number',
            displayName: 'Batch Interval (ms)',
            description: 'Time in milliseconds between batches',
            default: 1000,
          },
        },
      },
      // SSL Configuration
      {
        name: 'ssl',
        type: 'object',
        displayName: 'SSL Configuration',
        description: 'SSL/TLS client certificate configuration',
        properties: {
          ca: {
            type: 'string',
            displayName: 'CA Certificate',
            description: 'Certificate Authority certificate (PEM format)',
            typeOptions: { alwaysOpenEditWindow: true },
          },
          cert: {
            type: 'string',
            displayName: 'Client Certificate',
            description: 'Client certificate (PEM format)',
            typeOptions: { alwaysOpenEditWindow: true },
          },
          key: {
            type: 'string',
            displayName: 'Client Key',
            description: 'Client private key (PEM format)',
            typeOptions: { alwaysOpenEditWindow: true, password: true },
          },
          passphrase: {
            type: 'string',
            displayName: 'Passphrase',
            description: 'Passphrase for encrypted key (optional)',
            typeOptions: { password: true },
          },
        },
      },
      // Pagination
      {
        name: 'pagination',
        type: 'object',
        displayName: 'Pagination',
        description: 'Automatic pagination configuration',
        properties: {
          enabled: {
            type: 'boolean',
            displayName: 'Enable Pagination',
            description: 'Automatically paginate through multiple pages',
            default: false,
          },
          paginationType: {
            type: 'string',
            displayName: 'Pagination Type',
            description: 'How to handle pagination',
            default: 'offset',
            enum: [
              { name: 'Offset/Limit', value: 'offset' },
              { name: 'Page Number', value: 'page' },
              { name: 'Cursor', value: 'cursor' },
              { name: 'Link Header', value: 'linkHeader' },
            ],
            displayOptions: {
              show: { enabled: [true] },
            },
          },
          // Offset pagination
          offsetParam: {
            type: 'string',
            displayName: 'Offset Parameter',
            description: 'Name of the offset parameter',
            default: 'offset',
            displayOptions: {
              show: { enabled: [true], paginationType: ['offset'] },
            },
          },
          limitParam: {
            type: 'string',
            displayName: 'Limit Parameter',
            description: 'Name of the limit parameter',
            default: 'limit',
            displayOptions: {
              show: { enabled: [true], paginationType: ['offset'] },
            },
          },
          // Page pagination
          pageParam: {
            type: 'string',
            displayName: 'Page Parameter',
            description: 'Name of the page parameter',
            default: 'page',
            displayOptions: {
              show: { enabled: [true], paginationType: ['page'] },
            },
          },
          // Cursor pagination
          cursorParam: {
            type: 'string',
            displayName: 'Cursor Parameter',
            description: 'Name of the cursor parameter',
            default: 'cursor',
            displayOptions: {
              show: { enabled: [true], paginationType: ['cursor'] },
            },
          },
          cursorPath: {
            type: 'string',
            displayName: 'Next Cursor Path',
            description: 'JSON path to next cursor in response (e.g., "pagination.next_cursor")',
            displayOptions: {
              show: { enabled: [true], paginationType: ['cursor'] },
            },
          },
          // Common pagination options
          pageSize: {
            type: 'number',
            displayName: 'Page Size',
            description: 'Number of items per page',
            default: 50,
            displayOptions: {
              show: { enabled: [true] },
            },
          },
          maxPages: {
            type: 'number',
            displayName: 'Max Pages',
            description: 'Maximum number of pages to fetch (0 = unlimited)',
            default: 10,
            displayOptions: {
              show: { enabled: [true] },
            },
          },
          requestInterval: {
            type: 'number',
            displayName: 'Request Interval (ms)',
            description: 'Delay between pagination requests',
            default: 0,
            displayOptions: {
              show: { enabled: [true] },
            },
          },
        },
      },
    ],
  },
};

export const HTTP_REQUEST_DEFAULTS = {
  method: 'GET',
  url: '',
  authentication: 'none',
  sendQuery: false,
  sendHeaders: false,
  sendBody: false,
  bodyContentType: 'json',
  responseFormat: 'autodetect',
  fullResponse: false,
  neverError: false,
  options: {
    timeout: 10000,
    followRedirect: true,
    maxRedirects: 21,
    allowUnauthorizedCerts: false,
    lowercaseHeaders: true,
    arrayFormat: 'brackets',
  },
};
