// Scrapfly Connector
// Web scraping and data extraction platform

import { ConnectorDefinition } from '../../shared';

export const SCRAPFLY_CONNECTOR: ConnectorDefinition = {
  name: 'scrapfly',
  display_name: 'Scrapfly',
  category: 'data_processing',
  description: 'Web scraping, data extraction, and screenshot capture with anti-bot bypass',
  auth_type: 'api_key',
  auth_fields: [
    {
      key: 'apiKey',
      label: 'API Key',
      type: 'password',
      required: true,
      placeholder: 'scp-live-...',
      description: 'Your Scrapfly API key',
      helpUrl: 'https://scrapfly.io/dashboard/api',
      helpText: 'Get your API key from Scrapfly dashboard'
    }
  ],
  endpoints: {
    base_url: 'https://api.scrapfly.io',
    scrape: '/scrape',
    screenshot: '/screenshot',
    extraction: '/extraction/v1',
    account: '/account'
  },
  webhook_support: false,
  rate_limits: {
    requests_per_second: 10,
    requests_per_minute: 600
  },
  sandbox_available: false,
  verified: false,
  supported_actions: [
    {
      id: 'scrape_web_page',
      name: 'Scrape Web Page',
      description: 'Scrape content from a web page with anti-bot bypass',
      category: 'Scraping',
      icon: 'globe',
      verified: false,
      api: {
        endpoint: '/scrape',
        method: 'GET',
        baseUrl: 'https://api.scrapfly.io',
        headers: {},
        paramMapping: {
          url: 'url',
          renderJs: 'render_js',
          country: 'country',
          asp: 'asp',
          proxy_pool: 'proxy_pool',
          session: 'session',
          tags: 'tags',
          format: 'format',
          correlation_id: 'correlation_id',
          timeout: 'timeout',
          cache: 'cache',
          cache_ttl: 'cache_ttl',
          dns: 'dns',
          ssl: 'ssl',
          headers: 'headers',
          cookies: 'cookies',
          body: 'body',
          method: 'method',
          retry: 'retry',
          debug: 'debug',
          webhook_name: 'webhook_name'
        }
      },
      inputSchema: {
        url: {
          type: 'string',
          required: true,
          label: 'URL',
          placeholder: 'https://example.com',
          description: 'The URL to scrape',
          aiControlled: false
        },
        renderJs: {
          type: 'boolean',
          label: 'Render JavaScript',
          default: false,
          description: 'Render JavaScript on the page (uses headless browser)',
          aiControlled: false
        },
        country: {
          type: 'select',
          label: 'Proxy Country',
          default: 'us',
          options: [
            { label: 'United States', value: 'us' },
            { label: 'United Kingdom', value: 'gb' },
            { label: 'Canada', value: 'ca' },
            { label: 'Germany', value: 'de' },
            { label: 'France', value: 'fr' },
            { label: 'Spain', value: 'es' },
            { label: 'Italy', value: 'it' },
            { label: 'Netherlands', value: 'nl' },
            { label: 'Australia', value: 'au' },
            { label: 'Japan', value: 'jp' },
            { label: 'Singapore', value: 'sg' },
            { label: 'India', value: 'in' }
          ],
          description: 'Country for proxy location',
          aiControlled: false
        },
        asp: {
          type: 'boolean',
          label: 'Anti-Scraping Protection (ASP)',
          default: false,
          description: 'Enable advanced anti-bot bypass (uses more credits)',
          aiControlled: false
        },
        proxy_pool: {
          type: 'select',
          label: 'Proxy Pool',
          default: 'public_datacenter_pool',
          options: [
            { label: 'Public Datacenter Pool', value: 'public_datacenter_pool' },
            { label: 'Public Residential Pool', value: 'public_residential_pool' }
          ],
          description: 'Type of proxy pool to use',
          aiControlled: false
        },
        format: {
          type: 'select',
          label: 'Response Format',
          default: 'html',
          options: [
            { label: 'HTML', value: 'html' },
            { label: 'JSON', value: 'json' },
            { label: 'Text', value: 'text' },
            { label: 'Markdown', value: 'markdown' }
          ],
          description: 'Format of the response content',
          aiControlled: false
        },
        session: {
          type: 'string',
          label: 'Session ID',
          placeholder: 'my-session',
          description: 'Session identifier for maintaining state across requests',
          aiControlled: false
        },
        timeout: {
          type: 'number',
          label: 'Timeout (ms)',
          default: 30000,
          min: 1000,
          max: 120000,
          description: 'Request timeout in milliseconds',
          aiControlled: false
        },
        cache: {
          type: 'boolean',
          label: 'Use Cache',
          default: false,
          description: 'Use cached response if available',
          aiControlled: false
        },
        cache_ttl: {
          type: 'number',
          label: 'Cache TTL (seconds)',
          default: 3600,
          min: 60,
          max: 2592000,
          description: 'Cache time-to-live in seconds',
          displayOptions: {
            show: {
              cache: [true]
            }
          },
          aiControlled: false
        },
        method: {
          type: 'select',
          label: 'HTTP Method',
          default: 'GET',
          options: [
            { label: 'GET', value: 'GET' },
            { label: 'POST', value: 'POST' },
            { label: 'PUT', value: 'PUT' },
            { label: 'DELETE', value: 'DELETE' },
            { label: 'PATCH', value: 'PATCH' }
          ],
          description: 'HTTP method to use',
          aiControlled: false
        },
        headers: {
          type: 'object',
          label: 'Custom Headers',
          description: 'Custom HTTP headers as JSON object',
          placeholder: '{"User-Agent": "Custom Agent"}',
          aiControlled: false
        },
        body: {
          type: 'string',
          label: 'Request Body',
          inputType: 'textarea',
          description: 'Request body for POST/PUT requests',
          displayOptions: {
            show: {
              method: ['POST', 'PUT', 'PATCH']
            }
          },
          aiControlled: false
        },
        retry: {
          type: 'boolean',
          label: 'Auto Retry',
          default: true,
          description: 'Automatically retry failed requests',
          aiControlled: false
        },
        debug: {
          type: 'boolean',
          label: 'Debug Mode',
          default: false,
          description: 'Include debug information in response',
          aiControlled: false
        }
      }
    },
    {
      id: 'screenshot',
      name: 'Capture Screenshot',
      description: 'Capture a screenshot of a web page',
      category: 'Scraping',
      icon: 'camera',
      verified: false,
      api: {
        endpoint: '/screenshot',
        method: 'GET',
        baseUrl: 'https://api.scrapfly.io',
        headers: {},
        paramMapping: {
          url: 'url',
          country: 'country',
          asp: 'asp',
          format: 'format',
          capture: 'capture',
          resolution: 'resolution',
          wait: 'wait',
          wait_for_selector: 'wait_for_selector',
          timeout: 'timeout'
        }
      },
      inputSchema: {
        url: {
          type: 'string',
          required: true,
          label: 'URL',
          placeholder: 'https://example.com',
          description: 'The URL to capture screenshot from',
          aiControlled: false
        },
        format: {
          type: 'select',
          label: 'Image Format',
          default: 'png',
          options: [
            { label: 'PNG', value: 'png' },
            { label: 'JPEG', value: 'jpeg' }
          ],
          description: 'Screenshot image format',
          aiControlled: false
        },
        capture: {
          type: 'select',
          label: 'Capture Mode',
          default: 'viewport',
          options: [
            { label: 'Viewport Only', value: 'viewport' },
            { label: 'Full Page', value: 'fullpage' }
          ],
          description: 'What to capture in the screenshot',
          aiControlled: false
        },
        resolution: {
          type: 'string',
          label: 'Resolution',
          default: '1920x1080',
          placeholder: '1920x1080',
          description: 'Screenshot resolution (widthxheight)',
          aiControlled: false
        },
        country: {
          type: 'select',
          label: 'Proxy Country',
          default: 'us',
          options: [
            { label: 'United States', value: 'us' },
            { label: 'United Kingdom', value: 'gb' },
            { label: 'Canada', value: 'ca' },
            { label: 'Germany', value: 'de' },
            { label: 'France', value: 'fr' }
          ],
          description: 'Country for proxy location',
          aiControlled: false
        },
        asp: {
          type: 'boolean',
          label: 'Anti-Scraping Protection',
          default: false,
          description: 'Enable anti-bot bypass',
          aiControlled: false
        },
        wait: {
          type: 'number',
          label: 'Wait Time (ms)',
          default: 0,
          min: 0,
          max: 30000,
          description: 'Wait time before taking screenshot (milliseconds)',
          aiControlled: false
        },
        wait_for_selector: {
          type: 'string',
          label: 'Wait for Selector',
          placeholder: '.content-loaded',
          description: 'CSS selector to wait for before taking screenshot',
          aiControlled: false
        },
        timeout: {
          type: 'number',
          label: 'Timeout (ms)',
          default: 30000,
          min: 1000,
          max: 120000,
          description: 'Request timeout in milliseconds',
          aiControlled: false
        }
      }
    },
    {
      id: 'extract_data',
      name: 'Extract Data with AI',
      description: 'Extract structured data from HTML/Markdown using AI',
      category: 'AI Extraction',
      icon: 'zap',
      verified: false,
      api: {
        endpoint: '/extraction/v1',
        method: 'POST',
        baseUrl: 'https://api.scrapfly.io',
        headers: {
          'Content-Type': 'application/json'
        },
        paramMapping: {
          url: 'url',
          content_type: 'content_type',
          body: 'body',
          extraction_template: 'extraction_template',
          extraction_prompt: 'extraction_prompt',
          extraction_model: 'extraction_model',
          is_document: 'is_document',
          document_compression_mode: 'document_compression_mode',
          charset: 'charset'
        }
      },
      inputSchema: {
        url: {
          type: 'string',
          label: 'URL',
          placeholder: 'https://example.com',
          description: 'URL to extract data from (alternative to providing body)',
          aiControlled: false
        },
        body: {
          type: 'string',
          label: 'HTML/Markdown Content',
          inputType: 'textarea',
          description: 'Raw HTML or Markdown content to extract data from',
          aiControlled: false
        },
        content_type: {
          type: 'select',
          label: 'Content Type',
          default: 'text/html',
          options: [
            { label: 'HTML', value: 'text/html' },
            { label: 'Markdown', value: 'text/markdown' }
          ],
          description: 'Type of content to extract from',
          aiControlled: false
        },
        extraction_prompt: {
          type: 'string',
          required: true,
          label: 'Extraction Prompt',
          inputType: 'textarea',
          placeholder: 'Extract product name, price, and description',
          description: 'AI prompt describing what data to extract',
          aiControlled: false
        },
        extraction_template: {
          type: 'object',
          label: 'Extraction Template',
          description: 'JSON schema defining the structure of data to extract',
          placeholder: '{"product_name": "string", "price": "number"}',
          aiControlled: false
        },
        extraction_model: {
          type: 'select',
          label: 'AI Model',
          default: 'gpt-4',
          options: [
            { label: 'GPT-4', value: 'gpt-4' },
            { label: 'GPT-3.5 Turbo', value: 'gpt-3.5-turbo' }
          ],
          description: 'AI model to use for extraction',
          aiControlled: false
        },
        is_document: {
          type: 'boolean',
          label: 'Is Document',
          default: false,
          description: 'Whether the content is a document (enables better extraction)',
          aiControlled: false
        },
        document_compression_mode: {
          type: 'select',
          label: 'Document Compression',
          default: 'auto',
          options: [
            { label: 'Auto', value: 'auto' },
            { label: 'None', value: 'none' },
            { label: 'Light', value: 'light' },
            { label: 'Medium', value: 'medium' },
            { label: 'Aggressive', value: 'aggressive' }
          ],
          description: 'Compression level for large documents',
          displayOptions: {
            show: {
              is_document: [true]
            }
          },
          aiControlled: false
        }
      }
    },
    {
      id: 'api_request',
      name: 'API Request',
      description: 'Make a direct API request through Scrapfly proxies',
      category: 'Advanced',
      icon: 'send',
      verified: false,
      api: {
        endpoint: '/scrape',
        method: 'GET',
        baseUrl: 'https://api.scrapfly.io',
        headers: {},
        paramMapping: {
          url: 'url',
          method: 'method',
          headers: 'headers',
          body: 'body',
          country: 'country',
          format: 'format',
          timeout: 'timeout'
        }
      },
      inputSchema: {
        url: {
          type: 'string',
          required: true,
          label: 'API URL',
          placeholder: 'https://api.example.com/data',
          description: 'The API endpoint URL',
          aiControlled: false
        },
        method: {
          type: 'select',
          required: true,
          label: 'HTTP Method',
          default: 'GET',
          options: [
            { label: 'GET', value: 'GET' },
            { label: 'POST', value: 'POST' },
            { label: 'PUT', value: 'PUT' },
            { label: 'DELETE', value: 'DELETE' },
            { label: 'PATCH', value: 'PATCH' }
          ],
          description: 'HTTP method for the request',
          aiControlled: false
        },
        headers: {
          type: 'object',
          label: 'Headers',
          description: 'Custom HTTP headers as JSON object',
          placeholder: '{"Authorization": "Bearer token", "Content-Type": "application/json"}',
          aiControlled: false
        },
        body: {
          type: 'string',
          label: 'Request Body',
          inputType: 'textarea',
          description: 'Request body (for POST/PUT/PATCH)',
          placeholder: '{"key": "value"}',
          displayOptions: {
            show: {
              method: ['POST', 'PUT', 'PATCH']
            }
          },
          aiControlled: false
        },
        country: {
          type: 'select',
          label: 'Proxy Country',
          default: 'us',
          options: [
            { label: 'United States', value: 'us' },
            { label: 'United Kingdom', value: 'gb' },
            { label: 'Canada', value: 'ca' },
            { label: 'Germany', value: 'de' }
          ],
          description: 'Country for proxy location',
          aiControlled: false
        },
        format: {
          type: 'select',
          label: 'Response Format',
          default: 'json',
          options: [
            { label: 'JSON', value: 'json' },
            { label: 'Text', value: 'text' }
          ],
          description: 'Expected response format',
          aiControlled: false
        },
        timeout: {
          type: 'number',
          label: 'Timeout (ms)',
          default: 30000,
          min: 1000,
          max: 120000,
          description: 'Request timeout in milliseconds',
          aiControlled: false
        }
      }
    },
    {
      id: 'get_account_info',
      name: 'Get Account Info',
      description: 'Get account usage information and credits',
      category: 'Account',
      icon: 'user',
      verified: false,
      api: {
        endpoint: '/account',
        method: 'GET',
        baseUrl: 'https://api.scrapfly.io',
        headers: {},
        paramMapping: {}
      },
      inputSchema: {}
    }
  ],
  supported_triggers: []
};
