import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { PlatformService } from '../../../database/platform.service';

/**
 * Node Types Seeder - Populates the node_types table
 * with actual supported node types from the executor
 */
@Injectable()
export class NodeTypesSeederService implements OnModuleInit {
  private readonly logger = new Logger(NodeTypesSeederService.name);

  constructor(private readonly platformService: PlatformService) {}

  async onModuleInit() {
    // ✅ DISABLED: Using builtin-nodes.ts constants instead of database seeding
    // Following n8n's pattern - all node types loaded from TypeScript constants
    this.logger.log('✅ Node types seeding DISABLED - using builtin-nodes.ts constants (NO DATABASE)');
    return; // Skip database operations entirely
  }

  private async seedNodeTypes(): Promise<void> {
    try {
      const nodeTypes = this.getNodeTypesDefinitions();

      this.logger.log(`Seeding ${nodeTypes.length} node types...`);

      for (const nodeType of nodeTypes) {
        await this.upsertNodeType(nodeType);
      }

      this.logger.log(`✅ Successfully seeded ${nodeTypes.length} node types`);
    } catch (error) {
      this.logger.error('Error seeding node types:', error);
    }
  }

  private async upsertNodeType(nodeType: any): Promise<void> {
    const query = `
      INSERT INTO node_types (
        type, name, category, description, icon,
        config_schema, input_schema, output_schema,
        is_trigger, is_action, is_builtin,
        connector_type, requires_connector, is_active,
        sort_order, examples
      ) VALUES (
        $1, $2, $3, $4, $5,
        $6::jsonb, $7::jsonb, $8::jsonb,
        $9, $10, $11,
        $12, $13, $14,
        $15, $16::jsonb
      )
      ON CONFLICT (type)
      DO UPDATE SET
        name = EXCLUDED.name,
        category = EXCLUDED.category,
        description = EXCLUDED.description,
        icon = EXCLUDED.icon,
        config_schema = EXCLUDED.config_schema,
        input_schema = EXCLUDED.input_schema,
        output_schema = EXCLUDED.output_schema,
        is_trigger = EXCLUDED.is_trigger,
        is_action = EXCLUDED.is_action,
        is_builtin = EXCLUDED.is_builtin,
        connector_type = EXCLUDED.connector_type,
        requires_connector = EXCLUDED.requires_connector,
        is_active = EXCLUDED.is_active,
        sort_order = EXCLUDED.sort_order,
        examples = EXCLUDED.examples,
        updated_at = NOW()
    `;

    await this.platformService.query(query, [
      nodeType.type,
      nodeType.name,
      nodeType.category,
      nodeType.description,
      nodeType.icon,
      JSON.stringify(nodeType.configSchema),
      JSON.stringify(nodeType.inputSchema),
      JSON.stringify(nodeType.outputSchema),
      nodeType.isTrigger,
      nodeType.isAction,
      nodeType.isBuiltin,
      nodeType.connectorType,
      nodeType.requiresConnector,
      nodeType.isActive,
      nodeType.sortOrder,
      JSON.stringify(nodeType.examples),
    ]);
  }

  /**
   * Define all supported node types based on node-executor.service.ts
   */
  private getNodeTypesDefinitions(): any[] {
    return [
      // ==================== TRIGGERS ====================
      {
        type: 'MANUAL_TRIGGER',
        name: 'Manual Trigger',
        category: 'trigger',
        description: 'Manually trigger workflow execution',
        icon: 'play',
        configSchema: {},
        inputSchema: {},
        outputSchema: { json: { type: 'object' } },
        isTrigger: true,
        isAction: false,
        isBuiltin: true,
        connectorType: null,
        requiresConnector: false,
        isActive: true,
        sortOrder: 1,
        examples: ['Start workflow manually', 'Test workflow execution'],
      },
      {
        type: 'FORM_TRIGGER',
        name: 'Form Trigger',
        category: 'trigger',
        description: 'Trigger workflow when a form is submitted',
        icon: 'form',
        configSchema: {
          formTitle: { type: 'string', required: true },
          formFields: { type: 'array', required: true },
          submitButtonText: { type: 'string' },
        },
        inputSchema: {},
        outputSchema: { formData: { type: 'object' } },
        isTrigger: true,
        isAction: false,
        isBuiltin: true,
        connectorType: null,
        requiresConnector: false,
        isActive: true,
        sortOrder: 2,
        examples: ['Contact form submission', 'Survey response'],
      },
      {
        type: 'WEBHOOK_TRIGGER',
        name: 'Webhook Trigger',
        category: 'trigger',
        description: 'Trigger workflow via HTTP webhook',
        icon: 'webhook',
        configSchema: {
          path: { type: 'string', required: true },
          method: { type: 'string', enum: ['GET', 'POST', 'PUT', 'DELETE'] },
        },
        inputSchema: {},
        outputSchema: { body: { type: 'object' }, headers: { type: 'object' } },
        isTrigger: true,
        isAction: false,
        isBuiltin: true,
        connectorType: null,
        requiresConnector: false,
        isActive: true,
        sortOrder: 3,
        examples: ['API webhook', 'Third-party integration'],
      },
      {
        type: 'SCHEDULE_TRIGGER',
        name: 'Schedule Trigger',
        category: 'trigger',
        description: 'Trigger workflow on a schedule (cron)',
        icon: 'clock',
        configSchema: {
          cron: { type: 'string', required: true },
          timezone: { type: 'string' },
        },
        inputSchema: {},
        outputSchema: { triggeredAt: { type: 'string' } },
        isTrigger: true,
        isAction: false,
        isBuiltin: true,
        connectorType: null,
        requiresConnector: false,
        isActive: true,
        sortOrder: 4,
        examples: ['Daily report', 'Hourly sync', 'Weekly summary'],
      },
      {
        type: 'CHAT_TRIGGER',
        name: 'Chat Trigger',
        category: 'trigger',
        description: 'Start workflow with a chat message. Perfect for chatbots and AI agents.',
        icon: 'message-circle',
        configSchema: {
          chatInputKey: { type: 'string', required: false, default: 'chatInput' },
          sessionIdKey: { type: 'string', required: false, default: 'sessionId' },
          allowFileUploads: { type: 'boolean', required: false, default: false },
          allowedFileTypes: { type: 'string', required: false, default: 'image/*,application/pdf' },
          placeholder: { type: 'string', required: false, default: 'Type your message...' },
          welcomeMessage: { type: 'string', required: false },
          inputFieldLabel: { type: 'string', required: false, default: 'Message' },
        },
        inputSchema: {},
        outputSchema: {
          chatInput: { type: 'string', description: 'The user chat message' },
          sessionId: { type: 'string', description: 'Unique session identifier for conversation continuity' },
          files: { type: 'array', description: 'Uploaded files (if enabled)' },
          timestamp: { type: 'string', description: 'Message timestamp' },
        },
        isTrigger: true,
        isAction: false,
        isBuiltin: true,
        connectorType: null,
        requiresConnector: false,
        isActive: true,
        sortOrder: 5,
        examples: ['AI chatbot interface', 'Customer support chat', 'Interactive AI agent'],
      },
      {
        type: 'CONNECTOR_TRIGGER',
        name: 'Connector Trigger',
        category: 'trigger',
        description: 'Trigger workflow from connector events (Gmail, Slack, Telegram, etc.)',
        icon: 'connector',
        configSchema: {
          connector: { type: 'string', required: true },
          trigger: { type: 'string', required: true },
          config: { type: 'object' },
        },
        inputSchema: {},
        outputSchema: { event: { type: 'object' } },
        isTrigger: true,
        isAction: false,
        isBuiltin: true,
        connectorType: 'dynamic',
        requiresConnector: true,
        isActive: true,
        sortOrder: 5,
        examples: [
          'New Gmail email',
          'New Slack message',
          'New Telegram message',
          'Twitter mention',
          'Facebook page comment',
        ],
      },

      // ==================== ACTIONS ====================
      {
        type: 'HTTP_REQUEST',
        name: 'HTTP Request',
        category: 'action',
        description: 'Make HTTP API requests with advanced options',
        icon: 'globe',
        configSchema: {
          // Basic Configuration
          method: {
            type: 'string',
            required: true,
            enum: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'HEAD', 'OPTIONS'],
            default: 'GET',
            label: 'Method',
            description: 'HTTP method to use'
          },
          url: {
            type: 'string',
            required: true,
            label: 'URL',
            description: 'The URL to make the request to',
            placeholder: 'https://api.example.com/endpoint'
          },

          // Authentication
          authentication: {
            type: 'string',
            required: true,
            enum: ['none', 'basicAuth', 'bearerToken', 'headerAuth', 'queryAuth', 'digestAuth'],
            default: 'none',
            label: 'Authentication',
            description: 'Authentication method to use'
          },
          basicAuth: {
            type: 'object',
            label: 'Basic Auth',
            description: 'Basic authentication credentials',
            properties: {
              username: { type: 'string', required: true, label: 'Username' },
              password: { type: 'string', required: true, label: 'Password', inputType: 'password' }
            },
            displayOptions: { show: { authentication: ['basicAuth'] } }
          },
          bearerToken: {
            type: 'string',
            label: 'Bearer Token',
            description: 'The bearer token for authentication',
            inputType: 'password',
            displayOptions: { show: { authentication: ['bearerToken'] } }
          },
          headerAuth: {
            type: 'object',
            label: 'Header Auth',
            properties: {
              name: { type: 'string', required: true, label: 'Header Name', placeholder: 'X-API-Key' },
              value: { type: 'string', required: true, label: 'Header Value', inputType: 'password' }
            },
            displayOptions: { show: { authentication: ['headerAuth'] } }
          },
          queryAuth: {
            type: 'object',
            label: 'Query Auth',
            properties: {
              name: { type: 'string', required: true, label: 'Parameter Name', placeholder: 'api_key' },
              value: { type: 'string', required: true, label: 'Parameter Value', inputType: 'password' }
            },
            displayOptions: { show: { authentication: ['queryAuth'] } }
          },
          digestAuth: {
            type: 'object',
            label: 'Digest Auth',
            properties: {
              username: { type: 'string', required: true, label: 'Username' },
              password: { type: 'string', required: true, label: 'Password', inputType: 'password' }
            },
            displayOptions: { show: { authentication: ['digestAuth'] } }
          },

          // Query Parameters
          sendQuery: {
            type: 'boolean',
            default: false,
            label: 'Query Parameters',
            description: 'Add query parameters to the request'
          },
          queryParametersUI: {
            type: 'array',
            label: 'Query Parameters',
            itemType: 'object',
            itemProperties: {
              name: { type: 'string', required: true, label: 'Name' },
              value: { type: 'string', required: true, label: 'Value' }
            },
            displayOptions: { show: { sendQuery: [true] } }
          },

          // Headers
          sendHeaders: {
            type: 'boolean',
            default: false,
            label: 'Headers',
            description: 'Add custom headers to the request'
          },
          headersUI: {
            type: 'array',
            label: 'Headers',
            itemType: 'object',
            itemProperties: {
              name: { type: 'string', required: true, label: 'Name' },
              value: { type: 'string', required: true, label: 'Value' }
            },
            displayOptions: { show: { sendHeaders: [true] } }
          },

          // Request Body
          sendBody: {
            type: 'boolean',
            default: false,
            label: 'Body',
            description: 'Add a body to the request',
            displayOptions: { show: { method: ['POST', 'PUT', 'PATCH', 'DELETE'] } }
          },
          bodyContentType: {
            type: 'string',
            label: 'Body Content Type',
            default: 'json',
            enum: ['json', 'form-urlencoded', 'multipart-form-data', 'raw', 'binary'],
            displayOptions: { show: { sendBody: [true] } }
          },
          jsonBody: {
            type: 'string',
            label: 'JSON Body',
            inputType: 'textarea',
            default: '{\n  \n}',
            placeholder: '{"key": "value"}',
            displayOptions: { show: { sendBody: [true], bodyContentType: ['json'] } }
          },
          bodyParametersUI: {
            type: 'array',
            label: 'Body Parameters',
            itemType: 'object',
            itemProperties: {
              name: { type: 'string', required: true, label: 'Name' },
              value: { type: 'string', required: true, label: 'Value' }
            },
            displayOptions: { show: { sendBody: [true], bodyContentType: ['form-urlencoded', 'multipart-form-data'] } }
          },
          rawBody: {
            type: 'string',
            label: 'Raw Body',
            inputType: 'textarea',
            displayOptions: { show: { sendBody: [true], bodyContentType: ['raw'] } }
          },
          rawBodyMimeType: {
            type: 'string',
            label: 'Content Type',
            default: 'text/plain',
            placeholder: 'text/plain',
            displayOptions: { show: { sendBody: [true], bodyContentType: ['raw'] } }
          },

          // Response Handling
          responseFormat: {
            type: 'string',
            label: 'Response Format',
            default: 'autodetect',
            enum: ['autodetect', 'json', 'text', 'file'],
            description: 'How to parse the response'
          },
          fullResponse: {
            type: 'boolean',
            label: 'Include Response Headers and Status',
            default: false,
            description: 'Return full response including headers and status code'
          },
          neverError: {
            type: 'boolean',
            label: 'Never Error',
            default: false,
            description: 'HTTP errors will not cause the node to fail'
          },

          // Advanced Options
          options: {
            type: 'object',
            label: 'Options',
            description: 'Advanced request options',
            properties: {
              timeout: {
                type: 'number',
                label: 'Timeout',
                default: 10000,
                description: 'Time in milliseconds to wait for response',
                min: 1
              },
              followRedirect: {
                type: 'boolean',
                label: 'Follow Redirects',
                default: true,
                description: 'Follow HTTP 3xx redirects'
              },
              maxRedirects: {
                type: 'number',
                label: 'Max Redirects',
                default: 21,
                description: 'Maximum number of redirects to follow'
              },
              allowUnauthorizedCerts: {
                type: 'boolean',
                label: 'Ignore SSL Issues',
                default: false,
                description: 'Allow requests with invalid SSL certificates'
              },
              proxy: {
                type: 'string',
                label: 'Proxy',
                placeholder: 'http://proxy:8080',
                description: 'HTTP proxy to use'
              },
              lowercaseHeaders: {
                type: 'boolean',
                label: 'Lowercase Headers',
                default: true,
                description: 'Convert header names to lowercase'
              }
            }
          }
        },
        inputSchema: { data: { type: 'object' } },
        outputSchema: { response: { type: 'object' } },
        isTrigger: false,
        isAction: true,
        isBuiltin: true,
        connectorType: null,
        requiresConnector: false,
        isActive: true,
        sortOrder: 10,
        examples: ['Call REST API with authentication', 'Fetch data with custom headers', 'POST JSON data to API'],
      },
      {
        type: 'CONNECTOR_ACTION',
        name: 'Connector Action',
        category: 'action',
        description: 'Execute connector-specific actions',
        icon: 'connector',
        configSchema: {
          connector: { type: 'string', required: true },
          action: { type: 'string', required: true },
          config: { type: 'object' },
        },
        inputSchema: { data: { type: 'object' } },
        outputSchema: { result: { type: 'object' } },
        isTrigger: false,
        isAction: true,
        isBuiltin: true,
        connectorType: 'dynamic',
        requiresConnector: true,
        isActive: true,
        sortOrder: 13,
        examples: [
          'Get Slack channels',
          'Send Telegram photo',
          'Post to Twitter',
          'Gmail search',
        ],
      },
      {
        type: 'DATABASE_QUERY',
        name: 'Database Query',
        category: 'action',
        description: 'Execute database queries',
        icon: 'database',
        configSchema: {
          query: { type: 'string', required: true },
          params: { type: 'array' },
        },
        inputSchema: { data: { type: 'object' } },
        outputSchema: { rows: { type: 'array' } },
        isTrigger: false,
        isAction: true,
        isBuiltin: true,
        connectorType: null,
        requiresConnector: false,
        isActive: true,
        sortOrder: 14,
        examples: ['Query database', 'Insert data', 'Update records'],
      },
      {
        type: 'TRANSFORM_DATA',
        name: 'Transform Data',
        category: 'action',
        description: 'Transform and manipulate data',
        icon: 'transform',
        configSchema: {
          operations: { type: 'array', required: true },
        },
        inputSchema: { data: { type: 'object' } },
        outputSchema: { result: { type: 'object' } },
        isTrigger: false,
        isAction: true,
        isBuiltin: true,
        connectorType: null,
        requiresConnector: false,
        isActive: true,
        sortOrder: 15,
        examples: ['Map fields', 'Filter data', 'Aggregate values'],
      },
      {
        type: 'RUN_CODE',
        name: 'Run Code',
        category: 'action',
        description: 'Execute custom JavaScript code',
        icon: 'code',
        configSchema: {
          code: { type: 'string', required: true },
        },
        inputSchema: { data: { type: 'object' } },
        outputSchema: { result: { type: 'any' } },
        isTrigger: false,
        isAction: true,
        isBuiltin: true,
        connectorType: null,
        requiresConnector: false,
        isActive: true,
        sortOrder: 16,
        examples: ['Custom logic', 'Data processing', 'Calculations'],
      },
      {
        type: 'AI_AGENT',
        name: 'AI Agent',
        category: 'action',
        description: 'AI Agent that reasons, selects tools, and executes them autonomously to complete tasks',
        icon: 'brain',
        configSchema: {
          // Agent Type Selection
          agentType: {
            type: 'select',
            required: false,
            default: 'toolsAgent',
            label: 'Agent Type',
            description: 'How the agent reasons and selects tools',
            options: [
              { label: 'Tools Agent (Recommended)', value: 'toolsAgent' },
              { label: 'Conversational Agent', value: 'conversational' },
              { label: 'ReAct Agent', value: 'react' },
            ],
          },
          // System Prompt
          systemPrompt: {
            type: 'string',
            required: false,
            inputType: 'textarea',
            label: 'System Prompt',
            description: 'Instructions that define the agent\'s behavior and capabilities',
            placeholder: 'You are a helpful AI assistant...',
          },
          // Max Iterations
          maxIterations: {
            type: 'number',
            required: false,
            default: 10,
            min: 1,
            max: 50,
            label: 'Max Iterations',
            description: 'Maximum number of reasoning/tool execution cycles before stopping',
          },
          // Return Intermediate Steps
          returnIntermediateSteps: {
            type: 'boolean',
            required: false,
            default: false,
            label: 'Return Intermediate Steps',
            description: 'Include all thinking steps and tool calls in the output',
          },
          // Output Format
          outputFormat: {
            type: 'select',
            required: false,
            default: 'text',
            label: 'Output Format',
            description: 'Format of the agent\'s response',
            options: [
              { label: 'Plain Text', value: 'text' },
              { label: 'JSON (Structured)', value: 'json' },
            ],
          },
          // Output Schema (for JSON format)
          outputSchema: {
            type: 'code',
            required: false,
            language: 'json',
            label: 'Output JSON Schema',
            description: 'JSON schema for structured output (when Output Format is JSON)',
            displayOptions: {
              show: { outputFormat: ['json'] },
            },
          },
          // Temperature (override model default)
          temperature: {
            type: 'number',
            required: false,
            min: 0,
            max: 2,
            step: 0.1,
            label: 'Temperature',
            description: 'Controls randomness. Lower = more deterministic (0-2)',
          },
          // Max Tokens (override model default)
          maxTokens: {
            type: 'number',
            required: false,
            min: 1,
            max: 128000,
            label: 'Max Tokens',
            description: 'Maximum tokens in the response',
          },
          // Input field (can be expression)
          input: {
            type: 'string',
            required: false,
            label: 'Input Message',
            description: 'The message/prompt to send to the agent. Use expressions like {{$json.message}}',
          },
          // Built-in Tools (no credentials needed)
          enableHttpTool: {
            type: 'boolean',
            required: false,
            default: true,
            label: 'Enable HTTP Request Tool',
            description: 'Allow agent to make HTTP requests to any URL (GET, POST, PUT, DELETE)',
          },
          enableCalculatorTool: {
            type: 'boolean',
            required: false,
            default: true,
            label: 'Enable Calculator Tool',
            description: 'Allow agent to perform math calculations and unit conversions',
          },
        },
        inputSchema: {
          chatModel: { type: 'object', required: true, description: 'Chat model configuration from OpenAI Chat Model node' },
          memory: { type: 'object', required: false, description: 'Memory node for conversation history' },
          tools: { type: 'array', required: false, description: 'Tool nodes the agent can use' },
          input: { type: 'string', required: true, description: 'User input/message for the agent' },
        },
        outputSchema: {
          response: { type: 'string', description: 'The agent\'s final response' },
          success: { type: 'boolean', description: 'Whether the agent completed successfully' },
          model: { type: 'string', description: 'Model used for inference' },
          usage: { type: 'object', description: 'Token usage statistics' },
          iterations: { type: 'number', description: 'Number of reasoning iterations used' },
          finishReason: { type: 'string', description: 'Why the agent stopped (complete/max_iterations/error)' },
          toolCalls: { type: 'array', description: 'Tools called during execution' },
          toolResults: { type: 'array', description: 'Results from tool executions' },
          intermediateSteps: { type: 'array', description: 'Detailed steps (if returnIntermediateSteps is true)' },
          durationMs: { type: 'number', description: 'Execution time in milliseconds' },
        },
        isTrigger: false,
        isAction: true,
        isBuiltin: true,
        connectorType: null,
        requiresConnector: false,
        isActive: true,
        sortOrder: 17,
        examples: [
          'Autonomous task completion',
          'Multi-step reasoning',
          'Tool-assisted chat',
          'Email automation with AI',
        ],
      },
      {
        type: 'OPENAI_CHAT_MODEL',
        name: 'OpenAI Chat Model',
        category: 'action',
        description: 'Provides OpenAI GPT model configuration for AI Agent nodes',
        icon: 'bot',
        configSchema: {
          credentialId: { type: 'string', required: true },
          model: { type: 'string', required: false, default: 'gpt-4o-mini' },
          temperature: { type: 'number', required: false, default: 0.7 },
          maxTokens: { type: 'number', required: false, default: 4096 },
          topP: { type: 'number', required: false, default: 1 },
          frequencyPenalty: { type: 'number', required: false, default: 0 },
          presencePenalty: { type: 'number', required: false, default: 0 },
        },
        inputSchema: {},
        outputSchema: {
          modelConfig: { type: 'object' },
        },
        isTrigger: false,
        isAction: true,
        isBuiltin: true,
        connectorType: null,
        requiresConnector: false,
        isActive: true,
        sortOrder: 18,
        examples: ['Configure GPT-4o model', 'Setup AI model for agent', 'Provide OpenAI configuration'],
      },
      {
        type: 'SIMPLE_MEMORY',
        name: 'Simple Memory',
        category: 'action',
        description: 'Stores conversation history in memory (no credentials required)',
        icon: 'database',
        configSchema: {
          sessionIdType: { type: 'string', required: false, default: 'fromInput' },
          sessionKey: { type: 'string', required: false, default: '{{ $json.sessionId }}' },
          contextWindowLength: { type: 'number', required: false, default: 5 },
        },
        inputSchema: {},
        outputSchema: {
          memory: { type: 'object' },
        },
        isTrigger: false,
        isAction: true,
        isBuiltin: true,
        connectorType: null,
        requiresConnector: false,
        isActive: true,
        sortOrder: 19,
        examples: ['Store chat history', 'Remember conversation context', 'Enable AI agent memory'],
      },
      {
        type: 'REDIS_MEMORY',
        name: 'Redis Chat Memory',
        category: 'action',
        description: 'Stores conversation history in Redis (persistent, scalable)',
        icon: 'database',
        configSchema: {
          credentialId: { type: 'string', required: true },
          sessionIdType: { type: 'string', required: false, default: 'fromInput' },
          sessionKey: { type: 'string', required: false, default: '{{ $json.sessionId }}' },
          sessionTTL: { type: 'number', required: false, default: 0 },
          contextWindowLength: { type: 'number', required: false, default: 5 },
        },
        inputSchema: {},
        outputSchema: {
          memory: { type: 'object' },
        },
        isTrigger: false,
        isAction: true,
        isBuiltin: true,
        connectorType: null,
        requiresConnector: false,
        isActive: true,
        sortOrder: 20,
        examples: ['Store persistent chat history', 'Distributed memory storage', 'Production AI chatbots'],
      },
      {
        type: 'GMAIL_TOOL',
        name: 'Gmail Tool',
        category: 'action',
        description: 'Send emails and manage labels through Gmail. In "provider" mode, provides tools for AI Agent to use autonomously.',
        icon: 'mail',
        configSchema: {
          mode: {
            type: 'string',
            required: true,
            default: 'execute',
            enum: ['execute', 'provider'],
            label: 'Mode',
            description: '"execute" runs the action immediately. "provider" passes tools to AI Agent for autonomous use.'
          },
          credentialId: { type: 'string', required: true, label: 'Gmail Credential' },
          operation: {
            type: 'string',
            required: false,
            default: 'sendEmail',
            enum: ['sendEmail', 'getLabels'],
            label: 'Operation',
            description: 'Only used in "execute" mode'
          },
          to: { type: 'string', required: false, label: 'To', description: 'Recipient email (execute mode only)' },
          subject: { type: 'string', required: false, label: 'Subject', description: 'Email subject (execute mode only)' },
          message: { type: 'string', required: false, label: 'Message', description: 'Email body (execute mode only)' },
          emailType: { type: 'string', required: false, default: 'html', enum: ['html', 'text'], label: 'Email Type' },
          cc: { type: 'string', required: false, label: 'CC' },
          bcc: { type: 'string', required: false, label: 'BCC' },
        },
        inputSchema: {},
        outputSchema: {
          success: { type: 'boolean' },
          operation: { type: 'string' },
          data: { type: 'object' },
          message: { type: 'string' },
          isToolProvider: { type: 'boolean', description: 'True when in provider mode' },
          toolDefinitions: { type: 'array', description: 'Tool definitions for AI Agent (provider mode)' },
        },
        isTrigger: false,
        isAction: true,
        isBuiltin: true,
        connectorType: 'gmail',
        requiresConnector: true,
        isActive: true,
        sortOrder: 100,
        examples: ['Send email from AI agent', 'Fetch Gmail labels', 'Provide Gmail tools to AI Agent'],
      },
      {
        type: 'CONNECTOR_TOOL',
        name: 'Connector Tool',
        category: 'action',
        description: 'Provides any connector\'s actions as tools for AI Agent. Connect to AI Agent\'s "tools" input to give the agent access to connector capabilities.',
        icon: 'wrench',
        configSchema: {
          connectorType: {
            type: 'string',
            required: true,
            label: 'Connector',
            description: 'Select which connector to provide tools from'
          },
          credentialId: {
            type: 'string',
            required: true,
            label: 'Credential',
            description: 'Credential for the selected connector'
          },
          selectedActions: {
            type: 'array',
            required: false,
            label: 'Selected Actions',
            description: 'Optionally limit which actions to provide. Leave empty for all actions.'
          },
        },
        inputSchema: {},
        outputSchema: {
          isToolProvider: { type: 'boolean', description: 'Always true - indicates tool provider output' },
          toolDefinitions: { type: 'array', description: 'Tool definitions for AI Agent' },
          connectorType: { type: 'string', description: 'The connector type' },
          credentialId: { type: 'string', description: 'Credential ID used' },
        },
        isTrigger: false,
        isAction: true,
        isBuiltin: true,
        connectorType: null,
        requiresConnector: true,
        isActive: true,
        sortOrder: 99,
        examples: [
          'Provide Slack tools to AI Agent',
          'Give AI Agent access to Telegram actions',
          'Enable AI to send tweets autonomously',
          'Let AI Agent manage CRM contacts'
        ],
      },
      {
        type: 'GOOGLE_ANALYTICS_GA4',
        name: 'Google Analytics GA4',
        category: 'action',
        description: 'Get reports from Google Analytics 4 properties',
        icon: 'bar-chart',
        configSchema: {
          credentialId: { type: 'string', required: true, label: 'Google Analytics Credential', description: 'OAuth2 credential for Google Analytics' },
          propertyId: { type: 'string', required: true, label: 'GA4 Property ID', placeholder: '123456789', description: 'Your GA4 Property ID (found in Admin → Property Settings)' },
          dateRange: {
            type: 'string',
            required: true,
            default: 'last7days',
            enum: ['today', 'yesterday', 'last7days', 'last30days', 'last90days', 'thisMonth', 'lastMonth', 'thisYear', 'lastYear', 'custom'],
            label: 'Date Range',
            description: 'Time period for the report'
          },
          startDate: { type: 'string', required: false, label: 'Start Date', placeholder: '2025-01-01', description: 'Start date (YYYY-MM-DD) - only for Custom Range' },
          endDate: { type: 'string', required: false, label: 'End Date', placeholder: '2025-01-31', description: 'End date (YYYY-MM-DD) - only for Custom Range' },
          metrics: {
            type: 'array',
            required: true,
            default: ['activeUsers', 'sessions'],
            label: 'Metrics',
            description: 'GA4 metrics to retrieve (e.g., activeUsers, sessions, conversions)'
          },
          dimensions: {
            type: 'array',
            required: false,
            default: ['date'],
            label: 'Dimensions',
            description: 'GA4 dimensions to group by (e.g., date, country, city, browser)'
          },
          returnAll: { type: 'boolean', default: false, label: 'Return All Results', description: 'Get all results or limit to a specific number' },
          limit: { type: 'number', default: 100, label: 'Limit', description: 'Maximum number of results (only if Return All is false)' },
          simple: { type: 'boolean', default: true, label: 'Simplify Response', description: 'Convert nested GA4 response into flat objects' },
          currencyCode: { type: 'string', required: false, label: 'Currency Code', placeholder: 'USD', description: 'Currency code for monetary values (e.g., USD, EUR, GBP)' },
          dimensionFilter: { type: 'object', required: false, label: 'Dimension Filter', description: 'Filter dimensions (advanced - GA4 API format)' },
          metricFilter: { type: 'object', required: false, label: 'Metric Filter', description: 'Filter metrics (advanced - GA4 API format)' },
          orderBys: { type: 'array', required: false, label: 'Order By', description: 'Sort results (e.g., by metric or dimension)' }
        },
        inputSchema: {},
        outputSchema: {
          rows: { type: 'array', description: 'Array of data rows with dimensions and metrics' },
          dimensionHeaders: { type: 'array', description: 'Dimension column headers' },
          metricHeaders: { type: 'array', description: 'Metric column headers' },
          rowCount: { type: 'number', description: 'Total number of rows' }
        },
        isTrigger: false,
        isAction: true,
        isBuiltin: true,
        connectorType: 'google_analytics',
        requiresConnector: true,
        isActive: true,
        sortOrder: 101,
        examples: [
          'Get website traffic data',
          'Analyze user behavior',
          'Generate custom reports',
          'Track conversions',
          'Monitor real-time metrics'
        ],
      },
      {
        type: 'MERGE',
        name: 'Merge',
        category: 'action',
        description: 'Combine data from multiple inputs using various merge strategies',
        icon: 'merge',
        configSchema: {
          numberOfInputs: {
            type: 'number',
            required: true,
            default: 2,
            label: 'Number of Inputs',
            description: 'How many inputs to merge (2-10)',
            min: 2,
            max: 10
          },
          mode: {
            type: 'string',
            required: true,
            default: 'append',
            enum: ['append', 'combine', 'combineBySql', 'chooseBranch'],
            label: 'Mode',
            description: 'How to merge the data'
          },
          combineBy: {
            type: 'string',
            required: false,
            default: 'combineByPosition',
            enum: ['combineByFields', 'combineByPosition', 'combineAll'],
            label: 'Combine By',
            description: 'Method to combine inputs',
            displayOptions: { show: { mode: ['combine'] } }
          },
          fieldsToMatchString: {
            type: 'string',
            required: false,
            label: 'Fields to Match',
            placeholder: 'id, email',
            description: 'Comma-separated field names to match on',
            displayOptions: { show: { combineBy: ['combineByFields'] } }
          },
          joinMode: {
            type: 'string',
            required: false,
            default: 'keepMatches',
            enum: ['keepMatches', 'keepNonMatches', 'keepEverything', 'enrichInput1', 'enrichInput2'],
            label: 'Join Mode',
            description: 'How to handle matched/unmatched items',
            displayOptions: { show: { combineBy: ['combineByFields'] } }
          },
          outputDataFrom: {
            type: 'string',
            required: false,
            default: 'both',
            enum: ['both', 'input1', 'input2'],
            label: 'Output Data From',
            description: 'Which input data to include',
            displayOptions: { show: { combineBy: ['combineByFields'] } }
          },
          clashHandling: {
            type: 'string',
            required: false,
            default: 'preferInput2',
            enum: ['preferInput1', 'preferInput2', 'addSuffix'],
            label: 'Clash Handling',
            description: 'How to handle conflicting field names',
            displayOptions: { show: { mode: ['combine'] } }
          },
          includeUnpaired: {
            type: 'boolean',
            required: false,
            default: false,
            label: 'Include Unpaired Items',
            description: 'Include items without matching pairs',
            displayOptions: { show: { combineBy: ['combineByPosition'] } }
          },
          query: {
            type: 'string',
            required: false,
            label: 'SQL Query',
            inputType: 'textarea',
            placeholder: 'SELECT * FROM input1 LEFT JOIN input2 ON input1.id = input2.id',
            description: 'SQL query to merge data (input1, input2 as table names)',
            displayOptions: { show: { mode: ['combineBySql'] } }
          },
          output: {
            type: 'string',
            required: false,
            default: 'specifiedInput',
            enum: ['specifiedInput', 'empty'],
            label: 'Output',
            description: 'What to output after branches merge',
            displayOptions: { show: { mode: ['chooseBranch'] } }
          },
          useDataOfInput: {
            type: 'number',
            required: false,
            default: 1,
            label: 'Use Data of Input',
            description: 'Which input number to use (1 or 2)',
            min: 1,
            max: 10,
            displayOptions: { show: { mode: ['chooseBranch'], output: ['specifiedInput'] } }
          }
        },
        inputSchema: { data: { type: 'array' } },
        outputSchema: { merged: { type: 'array' } },
        isTrigger: false,
        isAction: true,
        isBuiltin: true,
        connectorType: null,
        requiresConnector: false,
        isActive: true,
        sortOrder: 21,
        examples: [
          'Append multiple data sources',
          'Join data by matching fields',
          'Merge parallel arrays by position',
          'Create all combinations (cross join)',
          'Wait for branches and choose one'
        ],
      },
      {
        type: 'SPLIT',
        name: 'Split',
        category: 'action',
        description: 'Split data into multiple outputs using various strategies',
        icon: 'split',
        configSchema: {
          numberOfOutputs: {
            type: 'number',
            required: true,
            default: 2,
            label: 'Number of Outputs',
            description: 'How many outputs to split to (2-10)',
            min: 2,
            max: 10
          },
          mode: {
            type: 'string',
            required: true,
            default: 'duplicate',
            enum: ['duplicate', 'splitByCondition', 'splitEvenly', 'splitByField', 'splitBySize'],
            label: 'Mode',
            description: 'How to split the data'
          },
          conditions: {
            type: 'array',
            required: false,
            label: 'Conditions',
            description: 'Array of conditions for conditional split',
            itemType: 'object',
            itemProperties: {
              field: { type: 'string', required: true, label: 'Field Name' },
              operator: {
                type: 'string',
                required: true,
                label: 'Operator',
                enum: ['equals', 'notEquals', 'greaterThan', 'lessThan', 'contains']
              },
              value: { type: 'string', required: true, label: 'Value' }
            },
            displayOptions: { show: { mode: ['splitByCondition'] } }
          },
          defaultOutput: {
            type: 'number',
            required: false,
            default: 0,
            label: 'Default Output',
            description: 'Output index for items that don\'t match any condition',
            min: 0,
            max: 9,
            displayOptions: { show: { mode: ['splitByCondition'] } }
          },
          fieldName: {
            type: 'string',
            required: false,
            label: 'Field Name',
            placeholder: 'status',
            description: 'Field name to split by',
            displayOptions: { show: { mode: ['splitByField'] } }
          },
          fieldValues: {
            type: 'array',
            required: false,
            label: 'Field Values',
            description: 'Array of expected field values (order determines output index)',
            displayOptions: { show: { mode: ['splitByField'] } }
          },
          chunkSize: {
            type: 'number',
            required: false,
            default: 10,
            label: 'Chunk Size',
            description: 'Number of items per chunk',
            min: 1,
            displayOptions: { show: { mode: ['splitBySize'] } }
          }
        },
        inputSchema: { data: { type: 'array' } },
        outputSchema: { split: { type: 'array' } },
        isTrigger: false,
        isAction: true,
        isBuiltin: true,
        connectorType: null,
        requiresConnector: false,
        isActive: true,
        sortOrder: 102,
        examples: [
          'Duplicate data to multiple branches',
          'Route items by conditions to different outputs',
          'Distribute items evenly across outputs',
          'Split by field value',
          'Break array into smaller chunks'
        ],
      },

      // ==================== CONTROL FLOW ====================
      {
        type: 'IF_CONDITION',
        name: 'If Condition',
        category: 'control',
        description: 'Branch workflow based on conditions',
        icon: 'branch',
        configSchema: {
          conditions: { type: 'object', required: true },
          ignoreCase: { type: 'boolean' },
        },
        inputSchema: { data: { type: 'object' } },
        outputSchema: { result: { type: 'boolean' } },
        isTrigger: false,
        isAction: false,
        isBuiltin: true,
        connectorType: null,
        requiresConnector: false,
        isActive: true,
        sortOrder: 22,
        examples: ['Check if value equals', 'Validate condition', 'Branch logic'],
      },
      {
        type: 'SWITCH',
        name: 'Switch',
        category: 'control',
        description: 'Route data to different branches based on rules',
        icon: 'workflow',
        configSchema: {
          mode: { type: 'string', required: true },
          rules: { type: 'object' },
          fallbackOutput: { type: 'string' },
          ignoreCase: { type: 'boolean' },
        },
        inputSchema: { data: { type: 'object' } },
        outputSchema: { result: { type: 'any' } },
        isTrigger: false,
        isAction: false,
        isBuiltin: true,
        connectorType: null,
        requiresConnector: false,
        isActive: true,
        sortOrder: 23,
        examples: ['Route by status', 'Multiple conditions', 'Complex branching'],
      },
      {
        type: 'LOOP',
        name: 'Loop Over Items',
        category: 'control',
        description: 'Iterate over array items and execute actions for each',
        icon: 'repeat',
        configSchema: {
          items: { type: 'string', required: true },
          batchSize: { type: 'number' },
        },
        inputSchema: { items: { type: 'array' } },
        outputSchema: { results: { type: 'array' } },
        isTrigger: false,
        isAction: false,
        isBuiltin: true,
        connectorType: null,
        requiresConnector: false,
        isActive: true,
        sortOrder: 24,
        examples: ['Process array', 'Batch operations', 'Iterate items'],
      },
      {
        type: 'FILTER',
        name: 'Filter',
        category: 'control',
        description: 'Filter items based on conditions',
        icon: 'filter',
        configSchema: {
          conditions: { type: 'object', required: true },
          ignoreCase: { type: 'boolean' },
        },
        inputSchema: { items: { type: 'array' } },
        outputSchema: { filtered: { type: 'array' } },
        isTrigger: false,
        isAction: false,
        isBuiltin: true,
        connectorType: null,
        requiresConnector: false,
        isActive: true,
        sortOrder: 25,
        examples: ['Filter array', 'Remove items', 'Keep matching items'],
      },
      {
        type: 'SET',
        name: 'Edit Fields (Set)',
        category: 'action',
        description: 'Add, modify, or remove item fields',
        icon: 'edit',
        configSchema: {
          mode: {
            type: 'string',
            required: true,
            default: 'manual',
            enum: ['manual', 'json'],
            label: 'Mode',
            description: 'How to set fields'
          },
          // Manual Mode Fields
          fields: {
            type: 'array',
            required: false,
            label: 'Fields to Set',
            description: 'Edit existing fields or add new ones',
            displayOptions: { show: { mode: ['manual'] } },
            items: {
              name: { type: 'string', required: true, label: 'Field Name' },
              type: {
                type: 'string',
                required: true,
                enum: ['string', 'number', 'boolean', 'array', 'object'],
                label: 'Type'
              },
              value: { type: 'string', required: true, label: 'Value' }
            }
          },
          // JSON Mode
          jsonOutput: {
            type: 'string',
            required: false,
            label: 'JSON Output',
            description: 'JSON object to output',
            displayOptions: { show: { mode: ['json'] } }
          },
          // Include Options
          includeOtherFields: {
            type: 'boolean',
            required: false,
            default: false,
            label: 'Include Other Input Fields',
            description: 'Pass all input fields to output'
          },
          include: {
            type: 'string',
            required: false,
            default: 'all',
            enum: ['all', 'selected', 'except'],
            label: 'Input Fields to Include',
            description: 'How to select fields to include',
            displayOptions: { show: { includeOtherFields: [true] } }
          },
          includeFields: {
            type: 'string',
            required: false,
            label: 'Fields to Include',
            description: 'Comma-separated list of fields to include',
            displayOptions: { show: { include: ['selected'], includeOtherFields: [true] } }
          },
          excludeFields: {
            type: 'string',
            required: false,
            label: 'Fields to Exclude',
            description: 'Comma-separated list of fields to exclude',
            displayOptions: { show: { include: ['except'], includeOtherFields: [true] } }
          },
          // Options
          dotNotation: {
            type: 'boolean',
            required: false,
            default: true,
            label: 'Support Dot Notation',
            description: 'Use dot notation for nested fields (a.b.c)'
          },
          ignoreConversionErrors: {
            type: 'boolean',
            required: false,
            default: false,
            label: 'Ignore Type Conversion Errors',
            description: 'Apply less strict type conversion',
            displayOptions: { show: { mode: ['manual'] } }
          }
        },
        inputSchema: { data: { type: 'object' } },
        outputSchema: { result: { type: 'object' } },
        isTrigger: false,
        isAction: true,
        isBuiltin: true,
        connectorType: null,
        requiresConnector: false,
        isActive: true,
        sortOrder: 27,
        examples: [
          'Add new fields to items',
          'Modify existing field values',
          'Transform data structure',
          'Remove unwanted fields'
        ],
      },
      {
        type: 'WAIT',
        name: 'Wait',
        category: 'control',
        description: 'Wait before continuing with execution',
        icon: 'pause-circle',
        configSchema: {
          resume: {
            type: 'string',
            required: true,
            default: 'timeInterval',
            enum: ['timeInterval', 'specificTime', 'webhook', 'form'],
            label: 'Resume Mode',
            description: 'Determines how to resume workflow execution'
          },
          // Time Interval Configuration
          amount: {
            type: 'number',
            required: false,
            default: 5,
            label: 'Wait Amount',
            description: 'The time to wait',
            min: 0,
            displayOptions: { show: { resume: ['timeInterval'] } }
          },
          unit: {
            type: 'string',
            required: false,
            default: 'seconds',
            enum: ['seconds', 'minutes', 'hours', 'days'],
            label: 'Wait Unit',
            description: 'Unit of time for wait amount',
            displayOptions: { show: { resume: ['timeInterval'] } }
          },
          // Specific Time Configuration
          dateTime: {
            type: 'string',
            required: false,
            label: 'Date and Time',
            description: 'Specific date and time to wait until',
            displayOptions: { show: { resume: ['specificTime'] } }
          },
          // Webhook Configuration
          httpMethod: {
            type: 'string',
            required: false,
            default: 'POST',
            enum: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
            label: 'HTTP Method',
            description: 'HTTP method for webhook',
            displayOptions: { show: { resume: ['webhook'] } }
          },
          authentication: {
            type: 'string',
            required: false,
            default: 'none',
            enum: ['none', 'basicAuth', 'bearerToken'],
            label: 'Authentication',
            description: 'Webhook authentication method',
            displayOptions: { show: { resume: ['webhook'] } }
          },
          responseCode: {
            type: 'number',
            required: false,
            default: 200,
            label: 'Response Code',
            description: 'HTTP status code to return',
            displayOptions: { show: { resume: ['webhook'] } }
          },
          responseData: {
            type: 'string',
            required: false,
            default: '{"received": true}',
            label: 'Response Data',
            description: 'Data to return in webhook response',
            displayOptions: { show: { resume: ['webhook'] } }
          },
          webhookSuffix: {
            type: 'string',
            required: false,
            default: '',
            label: 'Webhook Suffix',
            description: 'Suffix path for webhook URL',
            displayOptions: { show: { resume: ['webhook'] } }
          },
          // Form Configuration
          formTitle: {
            type: 'string',
            required: false,
            default: 'Form Submission',
            label: 'Form Title',
            description: 'Title of the form',
            displayOptions: { show: { resume: ['form'] } }
          },
          formDescription: {
            type: 'string',
            required: false,
            label: 'Form Description',
            description: 'Description text for the form',
            displayOptions: { show: { resume: ['form'] } }
          },
          formFields: {
            type: 'array',
            required: false,
            label: 'Form Fields',
            description: 'Array of form field definitions',
            displayOptions: { show: { resume: ['form'] } }
          },
          // Wait Limit Configuration (for webhook/form modes)
          limitWaitTime: {
            type: 'boolean',
            required: false,
            default: false,
            label: 'Limit Wait Time',
            description: 'Set a maximum wait time before timeout',
            displayOptions: { show: { resume: ['webhook', 'form'] } }
          },
          limitType: {
            type: 'string',
            required: false,
            default: 'afterTimeInterval',
            enum: ['afterTimeInterval', 'atSpecifiedTime'],
            label: 'Limit Type',
            description: 'How to specify the wait limit',
            displayOptions: { show: { resume: ['webhook', 'form'], limitWaitTime: [true] } }
          },
          resumeAmount: {
            type: 'number',
            required: false,
            default: 1,
            label: 'Resume Amount',
            description: 'Time to wait before timeout',
            displayOptions: { show: { resume: ['webhook', 'form'], limitWaitTime: [true], limitType: ['afterTimeInterval'] } }
          },
          resumeUnit: {
            type: 'string',
            required: false,
            default: 'hours',
            enum: ['seconds', 'minutes', 'hours', 'days'],
            label: 'Resume Unit',
            description: 'Unit for timeout duration',
            displayOptions: { show: { resume: ['webhook', 'form'], limitWaitTime: [true], limitType: ['afterTimeInterval'] } }
          },
          maxDateAndTime: {
            type: 'string',
            required: false,
            label: 'Max Date and Time',
            description: 'Maximum date/time to wait until',
            displayOptions: { show: { resume: ['webhook', 'form'], limitWaitTime: [true], limitType: ['atSpecifiedTime'] } }
          }
        },
        inputSchema: { data: { type: 'object' } },
        outputSchema: { result: { type: 'object' } },
        isTrigger: false,
        isAction: false,
        isBuiltin: true,
        connectorType: null,
        requiresConnector: false,
        isActive: true,
        sortOrder: 26,
        examples: [
          'Wait 30 seconds before sending email',
          'Wait until specific time to post',
          'Wait for webhook confirmation',
          'Wait for form submission approval'
        ],
      },
    ];
  }
}
