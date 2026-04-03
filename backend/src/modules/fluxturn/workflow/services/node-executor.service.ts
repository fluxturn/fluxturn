import { Injectable, Logger, Optional } from '@nestjs/common';
import axios, { AxiosRequestConfig, AxiosResponse } from 'axios';
import { ConnectorsService } from '../../connectors/connectors.service';
import { PlatformService } from '../../../database/platform.service';
import { SimpleMemoryService } from './simple-memory.service';
import { RedisMemoryService } from './redis-memory.service';
import { GmailToolService } from '../../connectors/communication/gmail';
import { AIAgentService } from './ai-agent.service';
import { ToolRegistryService } from './tool-registry.service';
import { ConnectorToolProviderService, ToolProviderOutput } from './connector-tool-provider.service';
import { ToolExecutorService } from './tool-executor.service';
import {
  AgentConfig,
  ExecutableTool,
  ToolContext,
} from '../types/tool.interface';
import { getGmailTools } from '../tools/gmail.tool';
import { getSlackTools } from '../tools/slack.tool';
import { getTelegramTools } from '../tools/telegram.tool';
import { getDiscordTools } from '../tools/discord.tool';
import { getTeamsTools } from '../tools/teams.tool';
import { NodeRegistry } from '../nodes/base';

/**
 * Node Executor Service
 * Handles execution of individual workflow nodes (triggers and actions)
 *
 * This service now delegates to the NodeRegistry for most node types.
 * Only node types that haven't been extracted (like GOOGLE_ANALYTICS_GA4)
 * remain in this service.
 */
@Injectable()
export class NodeExecutorService {
  private readonly logger = new Logger(NodeExecutorService.name);

  private readonly aiAgentService: AIAgentService;
  private readonly toolRegistry: ToolRegistryService;
  private readonly connectorToolProvider: ConnectorToolProviderService | null = null;
  private readonly toolExecutor: ToolExecutorService;

  constructor(
    @Optional() private readonly nodeRegistry?: NodeRegistry,
    @Optional() private readonly connectorsService?: ConnectorsService,
    @Optional() private readonly platformService?: PlatformService,
    @Optional() private readonly simpleMemoryService?: SimpleMemoryService,
    @Optional() private readonly redisMemoryService?: RedisMemoryService,
    @Optional() private readonly gmailToolService?: GmailToolService
  ) {
    // Initialize tool registry and AI agent service
    this.toolRegistry = new ToolRegistryService();
    this.aiAgentService = new AIAgentService(this.toolRegistry);

    // Initialize connector tool provider if connectors service is available
    if (this.connectorsService) {
      this.connectorToolProvider = new ConnectorToolProviderService(this.connectorsService);
    }

    // Initialize tool executor service
    this.toolExecutor = new ToolExecutorService(this.connectorsService, this.gmailToolService);

    // Register built-in tools
    this.registerBuiltInTools();
  }

  /**
   * Register built-in tools with the registry
   */
  private registerBuiltInTools(): void {
    // Register Gmail tools
    const gmailTools = getGmailTools();
    this.toolRegistry.registerTools(gmailTools);

    // Register Slack tools
    const slackTools = getSlackTools();
    this.toolRegistry.registerTools(slackTools);

    // Register Telegram tools
    const telegramTools = getTelegramTools();
    this.toolRegistry.registerTools(telegramTools);

    // Register Discord tools
    const discordTools = getDiscordTools();
    this.toolRegistry.registerTools(discordTools);

    // Register Teams tools
    const teamsTools = getTeamsTools();
    this.toolRegistry.registerTools(teamsTools);

    this.logger.log(`Registered ${this.toolRegistry.getStats().totalTools} built-in tools`);
  }

  /**
   * Execute a single node based on its type
   * First checks the NodeRegistry for an executor, then falls back to the legacy switch
   */
  async executeNode(
    node: any,
    inputData: any[],
    context: {
      $json?: any;
      $node?: Record<string, any>;
      $workflow?: Record<string, any>;
      $env?: Record<string, any>;
    }
  ): Promise<any[]> {
    this.logger.log(`Executing node: ${node.data?.label || node.id} (${node.type})`);

    // AI_AGENT requires the full implementation with AIAgentService
    // Skip registry and use the complete implementation directly
    if (node.type === 'AI_AGENT') {
      this.logger.debug(`Using full AI Agent implementation for ${node.type}`);
      return await this.executeAIAgent(node, inputData, context);
    }

    // First, try to use the NodeRegistry for registered executors
    if (this.nodeRegistry?.hasExecutor(node.type)) {
      const executor = this.nodeRegistry.getExecutor(node.type);
      if (executor) {
        try {
          this.logger.debug(`Using NodeRegistry executor for ${node.type}`);
          const result = await executor.execute(node, inputData, context);
          this.nodeRegistry.recordExecution(true);
          return result;
        } catch (error) {
          this.nodeRegistry.recordExecution(false);
          throw error;
        }
      }
    }

    // Fall back to legacy switch statement for unregistered node types
    this.logger.debug(`Using legacy executor for ${node.type}`);

    try {
      // Legacy switch statement for node types not yet extracted to the registry
      // Most node types are now handled by NodeRegistry executors above
      switch (node.type) {
        // Node types not yet extracted to registry
        case 'GOOGLE_ANALYTICS_GA4':
          return await this.executeGoogleAnalyticsGA4(node, inputData, context);

        default:
          // If we reach here, the node type is unknown
          this.logger.warn(`Unknown node type: ${node.type}, passing data through`);
          return inputData;
      }
    } catch (error: any) {
      this.logger.error(`Failed to execute node ${node.id}: ${error.message}`);
      throw error;
    }
  }

  /**
   * Get stats about registered node executors
   */
  getRegistryStats(): { registry: any; legacy: string[] } {
    return {
      registry: this.nodeRegistry?.getStats() || { totalExecutors: 0, totalTypes: 0, byCategory: {}, executions: { total: 0, successful: 0, failed: 0 } },
      legacy: ['GOOGLE_ANALYTICS_GA4'], // Node types still handled by legacy switch
    };
  }

  /**
   * TRIGGER: Manual Trigger
   * Just passes through the input data
   */
  private executeManualTrigger(node: any, inputData: any[], context: any): any[] {
    // Manual trigger simply returns the initial input data
    return inputData.length > 0 ? inputData : [{ json: context.$json || {} }];
  }

  /**
   * TRIGGER: Schedule Trigger
   * In real execution, this would be called by a scheduler
   */
  private executeScheduleTrigger(node: any, inputData: any[], context: any): any[] {
    // For manual execution, just pass through with timestamp
    return [{
      json: {
        ...(context.$json || {}),
        triggeredAt: new Date().toISOString(),
        trigger: 'schedule',
        cron: node.data?.cron || '* * * * *'
      }
    }];
  }

  /**
   * TRIGGER: Webhook Trigger
   * In real execution, this would be called by webhook endpoint
   */
  private executeWebhookTrigger(node: any, inputData: any[], context: any): any[] {
    // For manual execution, pass through webhook data
    return [{
      json: {
        ...(context.$json || {}),
        triggeredAt: new Date().toISOString(),
        trigger: 'webhook',
        path: node.data?.path || '/webhook/default'
      }
    }];
  }

  /**
   * TRIGGER: Form Trigger
   * Triggered when a public form is submitted
   */
  private executeFormTrigger(node: any, inputData: any[], context: any): any[] {
    // Form submission data comes from the public form endpoint
    return [{
      json: {
        ...(context.$json || {}),
        triggeredAt: new Date().toISOString(),
        trigger: 'form',
        formTitle: node.data?.formTitle || 'Form Submission'
      }
    }];
  }

  /**
   * TRIGGER: Chat Trigger
   * Triggered when a chat message is received from the chat widget/interface
   * Used for chatbot and AI agent workflows
   */
  private executeChatTrigger(node: any, inputData: any[], context: any): any[] {
    const config = node.data || {};
    const chatInputKey = config.chatInputKey || 'chatInput';
    const sessionIdKey = config.sessionIdKey || 'sessionId';

    // Chat data comes from the chat interface
    // It can be from context.$json (workflow execution) or inputData (direct call)
    const chatData = context.$json || inputData[0]?.json || inputData[0] || {};

    // Extract or generate session ID for conversation continuity
    const sessionId = chatData[sessionIdKey] || chatData.sessionId || `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    // Extract chat input
    const chatInput = chatData[chatInputKey] || chatData.chatInput || chatData.message || chatData.text || '';

    // Extract files if present
    const files = chatData.files || [];

    return [{
      json: {
        [chatInputKey]: chatInput,
        [sessionIdKey]: sessionId,
        chatInput, // Always include standard keys for compatibility
        sessionId,
        files,
        timestamp: new Date().toISOString(),
        trigger: 'chat',
        // Include any additional data passed
        ...chatData,
      }
    }];
  }

  /**
   * TRIGGER: Facebook Trigger
   * Triggered when Facebook sends webhook events (comments, posts, messages, etc.)
   */
  private executeFacebookTrigger(node: any, inputData: any[], context: any): any[] {
    // Facebook event data comes from the webhook endpoint
    return [{
      json: {
        ...(context.$json || {}),
        triggeredAt: new Date().toISOString(),
        trigger: 'facebook_webhook',
        events: node.data?.events || []
      }
    }];
  }

  /**
   * TRIGGER: Connector Trigger
   * Generic trigger for all connector-based triggers (Gmail, Twitter, Telegram, etc.)
   * The trigger data is provided by the polling/webhook service
   */
  private executeConnectorTrigger(node: any, inputData: any[], context: any): any[] {
    // Connector triggers (polling/webhook) provide data when they fire
    // During workflow execution, just pass through the trigger data
    return inputData.length > 0 ? inputData : [{
      json: {
        ...(context.$json || {}),
        triggeredAt: new Date().toISOString(),
        trigger: node.data?.connectorType || node.data?.connector || 'connector',
        triggerEvent: node.data?.triggerId || node.data?.eventType || 'unknown'
      }
    }];
  }

  /**
   * ACTION: HTTP Request
   * Makes HTTP/API requests with advanced options (Phase 1 & 2 implementation)
   */
  private async executeHttpRequest(node: any, inputData: any[], context: any): Promise<any[]> {
    const config = node.data || {};
    const results: any[] = [];
    const https = await import('https');

    // Process each input item
    for (const item of inputData) {
      // Build request context with current item
      const itemContext = {
        ...context,
        $json: item.json || item
      };

      // Resolve URL and method
      const url = this.resolveExpression(config.url, itemContext);
      const method = (config.method || 'GET').toUpperCase();

      // Validate URL
      if (!url || url.trim() === '') {
        const nodeName = node.data?.label || node.id;
        throw new Error(
          `Node "${nodeName}" is not configured properly. Missing: URL. ` +
          `Please double-click the node to configure the request URL.`
        );
      }

      try {
        // Initialize axios config
        const axiosConfig: AxiosRequestConfig = {
          method: method as any,
          url,
          headers: {},
          params: {},
          timeout: config.timeout || 10000,
          maxRedirects: config.followRedirect !== false
            ? (config.maxRedirects || 21)
            : 0,
          validateStatus: config.neverError ? () => true : (status) => status >= 200 && status < 300,
        };

        // ============ PHASE 1: AUTHENTICATION ============
        const authentication = config.authentication || 'none';

        switch (authentication) {
          case 'credential':
            // Fetch stored credential
            if (config.credentialId) {
              try {
                const credentials = await this.connectorsService.getConnectorCredentials(config.credentialId);

                // Use the access token (OAuth2) or API key
                if (credentials.accessToken) {
                  // OAuth2 access token
                  axiosConfig.headers['Authorization'] = `Bearer ${credentials.accessToken}`;
                } else if (credentials.apiKey) {
                  // API Key - can be used as Bearer or custom header
                  axiosConfig.headers['Authorization'] = `Bearer ${credentials.apiKey}`;
                } else if (credentials.token) {
                  // Generic token field
                  axiosConfig.headers['Authorization'] = `Bearer ${credentials.token}`;
                } else if (credentials.username && credentials.password) {
                  // Basic auth credentials
                  axiosConfig.auth = {
                    username: credentials.username,
                    password: credentials.password,
                  };
                }
              } catch (error) {
                throw new Error(`Failed to fetch credential: ${error.message}`);
              }
            }
            break;

          case 'bearerToken':
            if (config.bearerToken) {
              const token = this.resolveExpression(config.bearerToken, itemContext);
              axiosConfig.headers['Authorization'] = `Bearer ${token}`;
            }
            break;

          case 'headerAuth':
            if (config.headerAuthName && config.headerAuthValue) {
              const headerName = this.resolveExpression(config.headerAuthName, itemContext);
              const headerValue = this.resolveExpression(config.headerAuthValue, itemContext);
              axiosConfig.headers[headerName] = headerValue;
            }
            break;

          case 'queryAuth':
            if (config.queryAuthName && config.queryAuthValue) {
              const paramName = this.resolveExpression(config.queryAuthName, itemContext);
              const paramValue = this.resolveExpression(config.queryAuthValue, itemContext);
              axiosConfig.params[paramName] = paramValue;
            }
            break;
        }

        // ============ QUERY PARAMETERS ============
        if (config.sendQuery && config.queryParameters) {
          try {
            const queryString = this.resolveExpression(config.queryParameters, itemContext);
            const queryParams = JSON.parse(queryString);
            axiosConfig.params = { ...axiosConfig.params, ...queryParams };
          } catch (e) {
            this.logger.warn('Failed to parse query parameters:', e.message);
          }
        }

        // ============ HEADERS ============
        if (config.sendHeaders && config.headers) {
          try {
            const headersString = this.resolveExpression(config.headers, itemContext);
            const customHeaders = JSON.parse(headersString);
            axiosConfig.headers = { ...axiosConfig.headers, ...customHeaders };
          } catch (e) {
            this.logger.warn('Failed to parse headers:', e.message);
          }
        }

        // Lowercase headers option
        if (config.lowercaseHeaders !== false) {
          const lowercasedHeaders: any = {};
          for (const [key, value] of Object.entries(axiosConfig.headers)) {
            lowercasedHeaders[key.toLowerCase()] = value;
          }
          axiosConfig.headers = lowercasedHeaders;
        }

        // ============ PHASE 2: REQUEST BODY ============
        if (config.sendBody && ['POST', 'PUT', 'PATCH', 'DELETE'].includes(method)) {
          const bodyContentType = config.bodyContentType || 'json';

          switch (bodyContentType) {
            case 'json':
              try {
                const jsonString = this.resolveExpression(config.jsonBody || '{}', itemContext);
                axiosConfig.data = JSON.parse(jsonString);
                axiosConfig.headers['content-type'] = 'application/json';
              } catch (e) {
                throw new Error(`Invalid JSON in body: ${e.message}`);
              }
              break;

            case 'form-urlencoded':
              try {
                const bodyString = this.resolveExpression(config.bodyParameters || '{}', itemContext);
                const formData = JSON.parse(bodyString);
                axiosConfig.data = new URLSearchParams(formData).toString();
                axiosConfig.headers['content-type'] = 'application/x-www-form-urlencoded';
              } catch (e) {
                throw new Error(`Invalid JSON in form body: ${e.message}`);
              }
              break;

            case 'multipart-form-data':
              const FormData = (await import('form-data')).default;
              const multipartForm = new FormData();
              try {
                const bodyString = this.resolveExpression(config.bodyParameters || '{}', itemContext);
                const formData = JSON.parse(bodyString);
                for (const [name, value] of Object.entries(formData)) {
                  multipartForm.append(name, value as string);
                }
              } catch (e) {
                throw new Error(`Invalid JSON in multipart body: ${e.message}`);
              }
              axiosConfig.data = multipartForm;
              axiosConfig.headers = {
                ...axiosConfig.headers,
                ...multipartForm.getHeaders(),
              };
              break;

            case 'raw':
              axiosConfig.data = this.resolveExpression(config.rawBody || '', itemContext);
              axiosConfig.headers['content-type'] = config.rawBodyMimeType || 'text/plain';
              break;

            case 'binary':
              // Binary data would come from previous node's binary data
              // This is a placeholder for future binary data handling
              this.logger.warn('Binary content type not fully implemented yet');
              break;
          }
        }

        // ============ ADVANCED OPTIONS ============
        // SSL Certificate validation
        if (config.allowUnauthorizedCerts) {
          axiosConfig.httpsAgent = new https.Agent({
            rejectUnauthorized: false,
          });
        }

        // Proxy configuration
        if (config.proxy) {
          try {
            const proxyUrl = new URL(config.proxy);
            axiosConfig.proxy = {
              host: proxyUrl.hostname,
              port: parseInt(proxyUrl.port) || 8080,
              protocol: proxyUrl.protocol.replace(':', ''),
            };
          } catch (e) {
            this.logger.warn(`Invalid proxy URL: ${config.proxy}`);
          }
        }

        // Set response type for binary data
        const responseFormat = config.responseFormat || 'autodetect';
        const isGoogleUrl = url.includes('drive.google.com') ||
                           url.includes('docs.google.com/spreadsheets') ||
                           url.includes('sheets.googleapis.com') ||
                           url.includes('googleapis.com');

        if (responseFormat === 'file' || isGoogleUrl) {
          axiosConfig.responseType = 'arraybuffer';
        }

        // For Google services, add export format to get files
        if (isGoogleUrl && url.includes('docs.google.com/spreadsheets')) {
          // Convert view URL to export URL
          const docIdMatch = url.match(/\/d\/([a-zA-Z0-9-_]+)/);
          if (docIdMatch) {
            const docId = docIdMatch[1];
            // Export as Excel format
            axiosConfig.url = `https://docs.google.com/spreadsheets/d/${docId}/export?format=xlsx`;
          }
        }

        // Execute HTTP request
        this.logger.log(`Making ${method} request to: ${axiosConfig.url || url}`);
        const response: AxiosResponse = await axios(axiosConfig);

        // ============ PHASE 2: RESPONSE HANDLING ============
        let responseData: any;
        const contentType = response.headers['content-type'] || '';

        // Determine response format
        let detectedFormat = responseFormat;
        if (responseFormat === 'autodetect') {
          if (contentType.includes('application/json')) {
            detectedFormat = 'json';
          } else if (this.isBinaryContentType(contentType)) {
            detectedFormat = 'file';
          } else {
            detectedFormat = 'text';
          }
        }

        // Parse response based on format
        if (detectedFormat === 'json') {
          // Already parsed by axios for JSON
          responseData = response.data;
        } else if (detectedFormat === 'text') {
          // Ensure text format
          responseData = typeof response.data === 'string'
            ? response.data
            : JSON.stringify(response.data);
        } else if (detectedFormat === 'file') {
          // Binary file data - convert ArrayBuffer to Base64
          const buffer = Buffer.isBuffer(response.data)
            ? response.data
            : Buffer.from(response.data);

          const base64Data = buffer.toString('base64');
          const fileName = this.extractFileNameFromResponse(response) || 'download';
          const mimeType = contentType || 'application/octet-stream';

          // Store in n8n-compatible binary format
          responseData = {
            binary: {
              data: {
                data: base64Data,
                mimeType: mimeType,
                fileName: fileName,
                fileExtension: fileName.split('.').pop() || '',
                fileSize: buffer.length,
              }
            }
          };
        }

        // Return full response or just body
        if (config.fullResponse) {
          results.push({
            json: {
              statusCode: response.status,
              statusMessage: response.statusText,
              headers: response.headers,
              body: responseData,
            }
          });
        } else {
          results.push({ json: responseData });
        }

      } catch (error: any) {
        this.logger.error(`HTTP request failed:`, error.message);

        // Handle error based on neverError setting
        if (config.neverError) {
          // Return error as data
          results.push({
            json: {
              error: true,
              statusCode: error.response?.status || 500,
              statusMessage: error.response?.statusText || 'Error',
              message: error.message,
              body: error.response?.data,
            },
          });
        } else {
          // Re-throw to stop workflow execution
          const nodeName = node.data?.label || node.id;
          const wrappedError = new Error(
            `Node "${nodeName}" failed to execute HTTP request: ${error.message}`
          );
          wrappedError.name = 'HTTPRequestError';
          (wrappedError as any).originalError = error;
          (wrappedError as any).statusCode = error.response?.status || 500;
          throw wrappedError;
        }
      }
    }

    return results;
  }

  /**
   * Helper: Check if content type is binary
   */
  private isBinaryContentType(contentType: string): boolean {
    const binaryTypes = [
      'image/',
      'audio/',
      'video/',
      'application/octet-stream',
      'application/pdf',
      'application/zip',
      'application/gzip',
      'application/x-tar',
      'application/vnd.openxmlformats-officedocument',  // Excel, Word, PowerPoint
      'application/vnd.ms-excel',                        // Legacy Excel
      'application/vnd.ms-powerpoint',                   // Legacy PowerPoint
      'application/msword',                              // Legacy Word
      'application/vnd.google-apps',                     // Google Drive files
      'text/csv',                                        // CSV files
    ];
    return binaryTypes.some(type => contentType.includes(type));
  }

  /**
   * Helper: Extract filename from response
   */
  private extractFileNameFromResponse(response: AxiosResponse): string {
    const disposition = response.headers['content-disposition'];
    if (disposition) {
      const match = disposition.match(/filename[^;=\n]*=((['"]).*?\2|[^;\n]*)/);
      if (match && match[1]) {
        return match[1].replace(/['"]/g, '');
      }
    }

    // Try to get filename from URL
    const url = response.config.url || '';
    if (url.includes('docs.google.com/spreadsheets')) {
      const docIdMatch = url.match(/\/d\/([a-zA-Z0-9-_]+)/);
      if (docIdMatch) {
        return `spreadsheet-${docIdMatch[1]}.xlsx`;
      }
    }

    // Try to extract from URL path
    try {
      const urlPath = new URL(url).pathname;
      const pathParts = urlPath.split('/');
      const lastPart = pathParts[pathParts.length - 1];
      if (lastPart && lastPart.includes('.')) {
        return lastPart;
      }
    } catch (e) {
      // URL parsing failed
    }

    return 'download';
  }

  /**
   * ACTION: Connector Action
   * Executes any connector action (Telegram, Gmail, etc.)
   *
   * Supports two modes:
   * - 'execute' (default): Execute the action with provided parameters
   * - 'provider': Return a ToolProviderOutput for AI Agent to use
   */
  private async executeConnectorAction(node: any, inputData: any[], context: any): Promise<any[]> {
    if (!this.connectorsService) {
      throw new Error('Connectors service not available');
    }

    const config = node.data || {};
    const results: any[] = [];

    // Get connector configuration
    const credentialId = config.credentialId;
    const connectorType = config.connectorType || config.connector;
    const actionId = config.actionId;
    const nodeMode = config.mode || 'execute'; // Default to execute mode

    // === PROVIDER MODE: Return tool definition for AI Agent ===
    if (nodeMode === 'provider') {
      this.logger.log(`Connector Action node in PROVIDER mode: ${connectorType}/${actionId}`);

      if (!this.connectorToolProvider) {
        throw new Error('Connector Tool Provider service not available');
      }

      if (!connectorType || !actionId) {
        throw new Error('Provider mode requires both connector type and action ID');
      }

      // Get AI-controlled fields and context params from config
      const aiControlledFields = new Set(config.aiControlledFields || []);
      const rawContextParams = config.contextParams || config.config || {};

      // Build expression context from input data
      const expressionContext = {
        ...context,
        $json: inputData[0]?.json || inputData[0] || {},
      };

      // Resolve expressions in context params (non-AI-controlled fields)
      const resolvedContextParams: Record<string, any> = {};
      for (const [key, value] of Object.entries(rawContextParams)) {
        if (!aiControlledFields.has(key)) {
          resolvedContextParams[key] = this.resolveExpression(value, expressionContext);
        }
      }

      this.logger.log(`AI-controlled fields: ${Array.from(aiControlledFields).join(', ')}`);
      this.logger.log(`Context params (resolved): ${JSON.stringify(resolvedContextParams)}`);

      try {
        // Generate tool definition for just this action
        const toolProviderOutput = await this.connectorToolProvider.generateToolsFromConnector(
          connectorType,
          credentialId,
          {
            actionFilter: [actionId], // Only this action
            contextParams: { [actionId]: resolvedContextParams },
            filterAIControlled: true,
          }
        );

        this.logger.log(`Generated tool provider output for ${connectorType}/${actionId}`);

        // Return as ToolProviderOutput
        return [{
          json: toolProviderOutput
        }];
      } catch (error: any) {
        this.logger.error(`Provider mode failed: ${error.message}`);
        throw new Error(`Failed to generate tool: ${error.message}`);
      }
    }

    // === EXECUTE MODE: Run the action ===

    // Check if connector requires authentication by querying the database
    let requiresAuth = true; // Default to requiring auth for safety
    try {
      const connectorResult = await this.platformService.query(
        'SELECT auth_type FROM connectors WHERE name = $1 LIMIT 1',
        [connectorType]
      );
      if (connectorResult && connectorResult.rows && connectorResult.rows.length > 0) {
        requiresAuth = connectorResult.rows[0].auth_type !== 'none';
      }
    } catch (error) {
      this.logger.warn(`Could not determine auth type for connector ${connectorType}, assuming auth required`);
    }

    if (!connectorType || !actionId) {
      // Provide a user-friendly error message
      const missing = [];
      if (!connectorType) missing.push('connector type');
      if (!actionId) missing.push('action');

      const nodeName = node.data?.label || node.id;
      throw new Error(
        `Node "${nodeName}" is not configured properly. Missing: ${missing.join(', ')}. ` +
        `Please double-click the node to open its configuration.`
      );
    }

    // Only check for credential if the connector requires authentication
    if (requiresAuth && !credentialId) {
      const nodeName = node.data?.label || node.id;
      throw new Error(
        `Node "${nodeName}" is not configured properly. Missing: credential. ` +
        `Please double-click the node to open its configuration and select a credential.`
      );
    }

    this.logger.log(`Executing ${connectorType} action: ${actionId}${credentialId ? ` with credential: ${credentialId}` : ' (no credentials required)'}`);
    this.logger.log(`Input data has ${inputData.length} items`);
    this.logger.log(`Node config:`, JSON.stringify(config, null, 2));

    for (let i = 0; i < inputData.length; i++) {
      const item = inputData[i];
      try {
        this.logger.log(`Processing item ${i + 1}/${inputData.length}: ${JSON.stringify(item.json || item).substring(0, 200)}...`);

        const itemContext = {
          ...context,
          $json: item.json || item
        };

        // Prepare action parameters based on the node configuration
        let actionParams: Record<string, any> = {};

        // Special handling for Telegram send_message
        if (connectorType === 'telegram' && actionId === 'send_message') {
          // Get parameters from actionParams (where the form saves them)
          const params = config.actionParams || {};
          actionParams = {
            chatId: this.resolveExpression(params.chatId, itemContext),
            text: this.resolveExpression(params.text, itemContext),
            parseMode: params.parseMode || 'none',
            disableNotification: params.disableNotification || false,
            replyToMessageId: this.resolveExpression(params.replyToMessageId, itemContext),
            replyMarkup: this.resolveExpression(params.replyMarkup, itemContext),
            disableWebPagePreview: params.disableWebPagePreview || false
          };

          // Remove undefined values
          Object.keys(actionParams).forEach(key => {
            if (actionParams[key] === undefined || actionParams[key] === '') {
              delete actionParams[key];
            }
          });

          // Handle parseMode 'none'
          if (actionParams.parseMode === 'none') {
            delete actionParams.parseMode;
          }
        } else {
          // Generic action parameters handling

          // DEBUG: Log the entire config to see what's available
          this.logger.log('=== Full Node Config Debug ===');
          this.logger.log('Full config:', JSON.stringify(config, null, 2));

          if (config.actionParams) {
            // DEBUG: Log raw actionParams before resolution
            this.logger.log('=== Expression Resolution Debug ===');
            this.logger.log('Raw actionParams (before resolution):', JSON.stringify(config.actionParams, null, 2));
            this.logger.log('Available nodes in context:', Object.keys(itemContext.$node || {}));

            // Check if "Run Code" node exists in context
            const runCodeNode = itemContext.$node?.['Run Code'];
            if (runCodeNode) {
              this.logger.log('Run Code node found in context');
              this.logger.log('Run Code node data structure:', JSON.stringify(runCodeNode?.data?.[0]?.[0]?.json, null, 2));
            }

            actionParams = this.resolveObjectExpressions(config.actionParams, itemContext);
            this.logger.log('Resolved actionParams:', JSON.stringify(actionParams, null, 2));
          } else {
            this.logger.warn('⚠️ No actionParams found in config! This will likely cause "Required field missing" errors.');
          }
        }

        // Special handling for Google Sheets: Convert string values to 2D array
        if (connectorType === 'google_sheets' && actionParams.values) {
          this.logger.log(`Google Sheets action detected. Values before conversion:`, JSON.stringify(actionParams.values));
          if (typeof actionParams.values === 'string') {
            // Convert single string to 2D array format that Google Sheets API expects
            actionParams.values = [[actionParams.values]];
            this.logger.log(`Converted string value to 2D array: ${JSON.stringify(actionParams.values)}`);
          } else if (Array.isArray(actionParams.values) && actionParams.values.length > 0 && !Array.isArray(actionParams.values[0])) {
            // Convert 1D array to 2D array
            actionParams.values = [actionParams.values];
            this.logger.log(`Converted 1D array to 2D array: ${JSON.stringify(actionParams.values)}`);
          }
        }

        // Include binary data from previous node if it exists
        // This allows connectors like Google Drive to access binary file data
        if (item.json?.binary) {
          actionParams.binary = item.json.binary;
          this.logger.log(`Including binary data in action params (properties: ${Object.keys(item.json.binary).join(', ')})`);
        }

        this.logger.log(`Action params (final):`, JSON.stringify(actionParams, null, 2));

        // Execute the connector action
        const response = await this.connectorsService.executeConnectorAction(
          credentialId,
          {
            action: actionId,
            parameters: actionParams
          },
          // Use system context for workflow execution (no user ID needed)
          {
            type: 'jwt',
            userId: undefined // Let the service handle system-level execution
          }
        );

        this.logger.log(`Connector action response:`, JSON.stringify(response, null, 2));

        if (response.success) {
          // Structure the response data properly
          // If response.data is a string (like AI text generation), wrap it
          // If it's an object, merge it properly
          const responseData = typeof response.data === 'string'
            ? { text: response.data }
            : (response.data && typeof response.data === 'object' ? response.data : {});

          results.push({
            json: {
              success: true,
              ...responseData,
              executedAt: new Date().toISOString(),
              connector: connectorType,
              action: actionId
            }
          });
        } else {
          // Extract error message from response
          let errorMsg = 'Connector action failed';
          if (response.error) {
            if (typeof response.error === 'string') {
              errorMsg = response.error;
            } else if (typeof response.error === 'object' && response.error.message) {
              errorMsg = response.error.message;
            } else if (typeof response.error === 'object') {
              errorMsg = JSON.stringify(response.error);
            }
          }
          // Throw error to stop workflow execution with detailed message
          const detailedErrorMsg = `${errorMsg} (connector: ${connectorType}, action: ${actionId})`;
          const error = new Error(detailedErrorMsg);
          error.name = 'ConnectorActionError';
          (error as any).connector = connectorType;
          (error as any).action = actionId;
          (error as any).response = response;
          (error as any).parameters = actionParams;
          throw error;
        }
      } catch (error: any) {

        // Re-throw to stop workflow execution
        const wrappedError = new Error(error.message || 'Connector action failed');
        wrappedError.name = 'ConnectorActionError';
        wrappedError.stack = error.stack;
        (wrappedError as any).connector = connectorType;
        (wrappedError as any).action = actionId;
        (wrappedError as any).originalError = error;
        throw wrappedError;
      }
    }

    this.logger.log(`Connector action completed. Processed ${inputData.length} input items, produced ${results.length} results`);
    return results;
  }

  /**
   * ACTION: Database Query
   * Executes database query
   */
  private async executeDatabaseQuery(node: any, inputData: any[], context: any): Promise<any[]> {
    const config = node.data || {};
    const results: any[] = [];

    for (const item of inputData) {
      const itemContext = {
        ...context,
        $json: item.json || item
      };

      const query = this.resolveExpression(config.query, itemContext);
      const connection = config.connection;

      this.logger.log(`Executing database query on: ${connection}`);

      // TODO: Integrate with database connector
      // For now, simulate successful query
      results.push({
        json: {
          success: true,
          query,
          connection,
          rows: [],
          rowCount: 0,
          executedAt: new Date().toISOString()
        }
      });
    }

    return results;
  }

  /**
   * ACTION: Transform Data
   * Transforms data using JSONata or simple expressions
   */
  private async executeTransformData(node: any, inputData: any[], context: any): Promise<any[]> {
    const config = node.data || {};
    const results: any[] = [];

    for (const item of inputData) {
      const itemContext = {
        ...context,
        $json: item.json || item
      };

      const expression = config.expression;

      // TODO: Integrate JSONata library for complex transformations
      // For now, simple expression resolution
      const transformed = this.resolveExpression(expression, itemContext);

      results.push({
        json: transformed
      });
    }

    return results;
  }

  /**
   * ACTION: Run Code
   * Executes custom JavaScript code
   */
  private async executeRunCode(node: any, inputData: any[], context: any): Promise<any[]> {
    const config = node.data || {};
    const results: any[] = [];

    // Validate required configuration
    const code = config.code;
    if (!code || code.trim() === '') {
      const nodeName = node.data?.label || node.id;
      throw new Error(
        `Node "${nodeName}" is not configured properly. Missing: code. ` +
        `Please double-click the node to add your JavaScript code.`
      );
    }

    this.logger.log('Run Code - Executing code:');
    this.logger.log(code);

    for (const item of inputData) {
      try {
        // Create safe execution context
        const data = item.json || item;

        this.logger.log('Run Code - Input data:');
        this.logger.log(JSON.stringify(data, null, 2));

        // TODO: Use vm2 or isolated-vm for secure code execution
        // For now, use simple Function constructor (NOT SAFE FOR PRODUCTION)
        this.logger.warn('Code execution using Function constructor - NOT SAFE FOR PRODUCTION');

        const fn = new Function('data', 'context', code);
        const result = fn(data, context);

        this.logger.log('Run Code - Output result:');
        this.logger.log(JSON.stringify(result, null, 2));

        results.push({
          json: result || data
        });
      } catch (error: any) {
        this.logger.error('Code execution failed:', error.message);

        // Re-throw to stop workflow execution
        const nodeName = node.data?.label || node.id;
        const wrappedError = new Error(
          `Node "${nodeName}" code execution failed: ${error.message}`
        );
        wrappedError.name = 'CodeExecutionError';
        (wrappedError as any).originalError = error;
        throw wrappedError;
      }
    }

    return results;
  }

  /**
   * ACTION: AI Agent
   * Orchestrates AI agent with chat model, memory, and tools
   * Now uses the AIAgentService for proper function calling and tool execution
   */
  private async executeAIAgent(node: any, inputData: any[], context: any): Promise<any[]> {
    const config = node.data || {};
    const results: any[] = [];

    this.logger.log('Executing AI Agent node (with tool support)');
    this.logger.log('AI Agent config:', JSON.stringify({
      agentType: config.agentType || 'toolsAgent',
      maxIterations: config.maxIterations || 10,
      returnIntermediateSteps: config.returnIntermediateSteps || false,
    }, null, 2));

    for (const item of inputData) {
      try {
        const itemContext = {
          ...context,
          $json: item.json || item
        };

        // Get configuration from AI Agent node
        const systemPrompt = this.resolveExpression(config.systemPrompt, itemContext) || 'You are a helpful AI assistant.';

        // Debug: Log the actual incoming data structure
        this.logger.log('AI Agent incoming item.json structure:', JSON.stringify(item.json, null, 2));

        // Extract input message from various possible sources
        let rawInput = config.input;
        if (!rawInput) {
          const json = item.json || item;
          // Try common field names in order of specificity
          rawInput = json.input ||                    // Explicit input field
                     json.chatInput ||                // Chat Trigger
                     json.text ||                     // Direct text field
                     json.telegramEvent?.message?.text || // Telegram trigger format
                     json.message?.text ||            // Generic message format: { message: { text: "..." } }
                     json.content ||                  // Generic content field
                     json.triggerData?.message?.text || // Telegram data under triggerData
                     json.data?.message?.text ||      // Data under data wrapper
                     (typeof json.message === 'string' ? json.message : null); // Simple message string
        }
        const input = this.resolveExpression(rawInput, itemContext);
        this.logger.log('AI Agent extracted rawInput:', rawInput, 'resolved input:', input);

        // Extract connected node data from the combined input
        const modelConfig = item.json?.modelConfig;
        const memory = item.json?.memory || null;

        // DEBUG: Log what's available in item.json
        this.logger.log('AI Agent input keys:', Object.keys(item.json || {}));
        this.logger.log('AI Agent has modelConfig:', !!modelConfig);
        this.logger.log('AI Agent has memory:', !!memory);
        this.logger.log('AI Agent has tools data:', !!item.json?.tools);

        // Handle tools - can be ToolProviderOutput, array of tools, or single tool node output
        let connectedTools: ExecutableTool[] = [];
        const toolsData = item.json?.tools;
        if (toolsData) {
          this.logger.log('Tools data type:', typeof toolsData, 'isArray:', Array.isArray(toolsData));
          this.logger.log('Tools data structure:', JSON.stringify(toolsData, null, 2).substring(0, 500));
          // Check if this is a ToolProviderOutput (from CONNECTOR_TOOL or GMAIL_TOOL in provider mode)
          if (toolsData.isToolProvider && Array.isArray(toolsData.toolDefinitions)) {
            this.logger.log(`Received ToolProviderOutput with ${toolsData.toolDefinitions.length} tools from ${toolsData.connectorType}`);
            connectedTools = toolsData.toolDefinitions;
          } else if (Array.isArray(toolsData)) {
            // Array of tool definitions or ToolProviderOutputs
            for (const toolItem of toolsData) {
              if (toolItem.isToolProvider && Array.isArray(toolItem.toolDefinitions)) {
                // ToolProviderOutput in array
                connectedTools.push(...toolItem.toolDefinitions);
              } else if (toolItem.name && toolItem.execute) {
                // Already an ExecutableTool
                connectedTools.push(toolItem);
              }
            }
          } else if (typeof toolsData === 'object') {
            // Single tool node connected - extract tool definition
            if (toolsData.toolDefinition) {
              connectedTools = [toolsData.toolDefinition];
            } else if (toolsData.name && toolsData.execute) {
              // Already an ExecutableTool
              connectedTools = [toolsData];
            }
            // If it's just execution result (success, data, etc.), ignore it
            // Tools should be called by AI Agent, not pre-executed
          }
          this.logger.log(`Extracted ${connectedTools.length} connected tools`);
        } else {
          this.logger.warn('⚠️ No tools data found in AI Agent input. To give AI Agent access to tools:');
          this.logger.warn('   1. Add a tool node (GMAIL_TOOL, CONNECTOR_TOOL) to your workflow');
          this.logger.warn('   2. Set tool node mode to "provider"');
          this.logger.warn('   3. Connect tool node output to AI Agent\'s "tools" input handle');
        }

        this.logger.log('Extracted from input:', {
          hasModelConfig: !!modelConfig,
          hasMemory: !!memory,
          connectedToolsCount: connectedTools.length,
          inputLength: input ? input.length : 0
        });

        if (!modelConfig) {
          throw new Error('No model configuration provided. Connect an OpenAI Chat Model node to the "model" input handle of the AI Agent.');
        }

        if (!input) {
          throw new Error('No input message provided for AI Agent. Connect data to the "data" input handle or configure the input field.');
        }

        // Build list of available tools
        const availableTools: ExecutableTool[] = [];

        // Get tool enable toggles from config (default to true for utility tools)
        const enableHttpTool = config.enableHttpTool !== false; // default true
        const enableCalculatorTool = config.enableCalculatorTool !== false; // default true

        // Add tools from registry based on user preferences
        const registeredTools = this.toolRegistry.getAllTools();
        this.logger.log(`Found ${registeredTools.length} registered tools`);
        this.logger.log(`Tool toggles: HTTP=${enableHttpTool}, Calculator=${enableCalculatorTool}`);

        // First, add connected tools from tool provider nodes
        // These already have credentials bound via closure
        for (const connectedTool of connectedTools) {
          if (connectedTool.name && typeof connectedTool.execute === 'function') {
            availableTools.push(connectedTool);
            this.logger.log(`Added connected tool: ${connectedTool.name}`);
          }
        }

        // Then add built-in tools from registry (non-credential based)
        for (const tool of registeredTools) {
          // Skip credential-based tools from registry - they should come from connected tool nodes
          if (tool.requiresCredentials) {
            // Check if this tool was already added via connected tools
            const alreadyAdded = availableTools.some(t =>
              t.connectorType === tool.connectorType
            );
            if (alreadyAdded) {
              continue; // Skip - we already have tools from this connector via provider
            }
            // Skip credential-based tools that weren't connected
            continue;
          }

          // Handle utility tools based on user toggles
          const toolName = tool.name || '';

          // HTTP tools
          if (toolName.startsWith('http_') || toolName === 'http_request') {
            if (enableHttpTool) {
              availableTools.push(tool);
            }
            continue;
          }

          // Calculator tools
          if (toolName === 'calculator' || toolName === 'basic_math' || toolName === 'unit_converter') {
            if (enableCalculatorTool) {
              availableTools.push(tool);
            }
            continue;
          }

          // Add any other non-credential tools
          availableTools.push(tool);
        }

        this.logger.log('AI Agent execution config:', {
          provider: modelConfig.provider,
          model: modelConfig.model,
          agentType: config.agentType || 'toolsAgent',
          systemPromptLength: systemPrompt.length,
          inputLength: input.length,
          hasMemory: !!memory,
          availableToolsCount: availableTools.length,
          toolNames: availableTools.map(t => t.name),
        });

        // Log tool availability prominently
        if (availableTools.length > 0) {
          this.logger.log(`✅ AI Agent has ${availableTools.length} tools available: ${availableTools.map(t => t.name).join(', ')}`);
        } else {
          this.logger.warn('⚠️ AI Agent has NO TOOLS available. It will only be able to have conversations, not take actions.');
        }

        // Build tool context
        const toolContext: ToolContext = {
          workflowId: context.$workflow?.id || 'unknown',
          executionId: context.$workflow?.executionId || `exec_${Date.now()}`,
          userId: context.$workflow?.userId || 'unknown',
          logger: this.logger as any,
          metadata: {
            nodeId: node.id,
            nodeName: node.data?.label || node.id,
          }
        };

        // Build agent configuration
        const agentConfig: AgentConfig = {
          agentType: config.agentType || 'toolsAgent',
          systemPrompt,
          input,
          tools: availableTools,
          memory: memory || undefined,
          modelConfig: {
            provider: modelConfig.provider,
            model: modelConfig.model,
            apiKey: modelConfig.apiKey,
            organization: modelConfig.organization,
            baseUrl: modelConfig.baseUrl,
            temperature: config.temperature ?? modelConfig.temperature ?? 0.7,
            maxTokens: config.maxTokens ?? modelConfig.maxTokens ?? 4096,
            topP: modelConfig.topP,
            frequencyPenalty: modelConfig.frequencyPenalty,
            presencePenalty: modelConfig.presencePenalty,
          },
          maxIterations: config.maxIterations || 10,
          returnIntermediateSteps: config.returnIntermediateSteps || false,
          outputFormat: config.outputFormat || 'text',
          outputSchema: config.outputSchema,
          context: toolContext,
        };

        // Execute the agent
        const agentResult = await this.aiAgentService.execute(agentConfig);

        this.logger.log('AI Agent result:', {
          success: agentResult.success,
          iterations: agentResult.iterations,
          toolCallsCount: agentResult.toolCalls.length,
          responseLength: agentResult.response.length,
          finishReason: agentResult.finishReason,
          totalTokens: agentResult.usage.totalTokens,
          durationMs: agentResult.durationMs,
        });

        // Build output
        const output: any = {
          response: agentResult.response,
          success: agentResult.success,
          model: modelConfig.model,
          usage: {
            promptTokens: agentResult.usage.promptTokens,
            completionTokens: agentResult.usage.completionTokens,
            totalTokens: agentResult.usage.totalTokens,
          },
          iterations: agentResult.iterations,
          finishReason: agentResult.finishReason,
          executedAt: new Date().toISOString(),
          durationMs: agentResult.durationMs,
        };

        // Include tool calls if any were made
        if (agentResult.toolCalls.length > 0) {
          output.toolCalls = agentResult.toolCalls.map(tc => ({
            name: tc.name,
            arguments: tc.arguments,
          }));
          output.toolResults = agentResult.toolResults.map(tr => ({
            success: tr.success,
            data: tr.data,
            error: tr.error,
          }));
        }

        // Include intermediate steps if requested
        if (config.returnIntermediateSteps && agentResult.intermediateSteps) {
          output.intermediateSteps = agentResult.intermediateSteps;
        }

        // Include error details if failed
        if (!agentResult.success && agentResult.error) {
          output.error = agentResult.error;
        }

        results.push({ json: output });

      } catch (error: any) {
        this.logger.error('AI Agent execution failed:', error.message);

        // Re-throw to stop workflow execution
        const nodeName = node.data?.label || node.id;
        const wrappedError = new Error(
          `Node "${nodeName}" AI Agent execution failed: ${error.message}`
        );
        wrappedError.name = 'AIAgentError';
        (wrappedError as any).originalError = error;
        throw wrappedError;
      }
    }

    return results;
  }

  /**
   * ACTION: OpenAI Chat Model
   * Provides model configuration for AI Agent (does not call OpenAI API)
   */
  private async executeOpenAIChatModel(node: any, inputData: any[], context: any): Promise<any[]> {
    const config = node.data || {};

    this.logger.log('Executing OpenAI Chat Model node (config provider)');

    if (!config.credentialId) {
      throw new Error('OpenAI Chat Model requires a credential to be selected. Please configure the node.');
    }

    if (!this.connectorsService) {
      throw new Error('Connectors service not available');
    }

    // Fetch OpenAI credentials
    let credentials: any;
    try {
      credentials = await this.connectorsService.getConnectorCredentials(config.credentialId);
    } catch (error: any) {
      this.logger.error('Failed to fetch OpenAI credentials:', error.message);
      throw new Error(`Failed to fetch OpenAI credentials: ${error.message}`);
    }

    if (!credentials || !credentials.apiKey) {
      throw new Error('OpenAI API key not found in credentials. Please check your credential configuration.');
    }

    // Build model configuration
    const modelConfig = {
      provider: 'openai',
      model: config.model || 'gpt-4o-mini',
      apiKey: credentials.apiKey,
      organization: credentials.organization || undefined,
      baseUrl: 'https://api.openai.com/v1',
      temperature: config.temperature !== undefined ? config.temperature : 0.7,
      maxTokens: config.maxTokens !== undefined ? config.maxTokens : 4096,
      topP: config.topP !== undefined ? config.topP : 1,
      frequencyPenalty: config.frequencyPenalty !== undefined ? config.frequencyPenalty : 0,
      presencePenalty: config.presencePenalty !== undefined ? config.presencePenalty : 0,
    };

    this.logger.log('OpenAI Chat Model config created:', {
      model: modelConfig.model,
      temperature: modelConfig.temperature,
      maxTokens: modelConfig.maxTokens,
      hasApiKey: !!modelConfig.apiKey,
    });

    // Return model configuration (NOT calling OpenAI API)
    return [{
      json: {
        modelConfig
      }
    }];
  }

  /**
   * Execute OpenAI chat completion
   */
  private async executeOpenAIChat(
    modelConfig: any,
    systemPrompt: string,
    userMessage: string,
    agentConfig: any,
    memory?: any
  ): Promise<any> {
    const axios = (await import('axios')).default;

    const messages: any[] = [];

    // Add system prompt first
    if (systemPrompt) {
      messages.push({
        role: 'system',
        content: systemPrompt
      });
    }

    // Add conversation history from memory
    if (memory && memory.messages && Array.isArray(memory.messages)) {
      for (const msg of memory.messages) {
        const role = msg.type === 'human' ? 'user' : (msg.type === 'ai' ? 'assistant' : msg.type);
        messages.push({
          role,
          content: msg.content
        });
      }
      this.logger.log(`Added ${memory.messages.length} messages from memory to context`);
    }

    // Add current user message
    messages.push({
      role: 'user',
      content: userMessage
    });

    const requestBody: any = {
      model: modelConfig.model,
      messages,
      temperature: modelConfig.temperature !== undefined ? modelConfig.temperature : (agentConfig.temperature || 0.7),
      max_tokens: modelConfig.maxTokens !== undefined ? modelConfig.maxTokens : (agentConfig.maxTokens || 1000),
    };

    // Add optional parameters if provided
    if (modelConfig.topP !== undefined) {
      requestBody.top_p = modelConfig.topP;
    }
    if (modelConfig.frequencyPenalty !== undefined) {
      requestBody.frequency_penalty = modelConfig.frequencyPenalty;
    }
    if (modelConfig.presencePenalty !== undefined) {
      requestBody.presence_penalty = modelConfig.presencePenalty;
    }

    this.logger.log(`Calling OpenAI API with model: ${modelConfig.model}`);

    const response = await axios.post(
      `${modelConfig.baseUrl}/chat/completions`,
      requestBody,
      {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${modelConfig.apiKey}`,
          ...(modelConfig.organization ? { 'OpenAI-Organization': modelConfig.organization } : {})
        },
        timeout: 60000
      }
    );

    const completion = response.data;
    const choice = completion.choices[0];

    return {
      text: choice.message.content,
      model: completion.model,
      usage: {
        promptTokens: completion.usage?.prompt_tokens || 0,
        completionTokens: completion.usage?.completion_tokens || 0,
        totalTokens: completion.usage?.total_tokens || 0
      },
      finishReason: choice.finish_reason
    };
  }

  /**
   * Resolve {{$json.field}} expressions in a string
   */
  private resolveExpression(expression: any, context: any): any {
    if (typeof expression !== 'string') {
      return expression;
    }

    // Match {{expression}} patterns
    const regex = /\{\{([^}]+)\}\}/g;

    // If the entire string is just one expression, return the resolved value directly
    const singleExpressionMatch = expression.match(/^\{\{([^}]+)\}\}$/);
    if (singleExpressionMatch) {
      const path = singleExpressionMatch[1].trim();
      return this.resolveExpressionPath(path, context);
    }

    // Replace all expressions in the string
    return expression.replace(regex, (match, path) => {
      const value = this.resolveExpressionPath(path.trim(), context);
      return value !== undefined ? String(value) : match;
    });
  }

  /**
   * Resolve expression path like $json.field or $node["NodeName"].json.field
   */
  private resolveExpressionPath(path: string, context: any): any {
    // Handle $json.field.nested
    if (path.startsWith('$json.')) {
      const fieldPath = path.substring(6); // Remove "$json."
      return this.getNestedValue(context.$json, fieldPath);
    }

    // Handle $node["NodeName"].json.field
    if (path.startsWith('$node[')) {
      const nodeMatch = path.match(/\$node\[["']([^"']+)["']\]\.json\.(.+)/);
      if (nodeMatch) {
        const [, nodeName, fieldPath] = nodeMatch;

        // DEBUG: Log expression resolution details
        this.logger.log(`[ExprResolve] Resolving node expression - nodeName: "${nodeName}", fieldPath: "${fieldPath}"`);

        // Try to find node by name/label first (for user-friendly references)
        // Then fall back to ID lookup
        let nodeResult = null;

        // Check if nodeName is directly in $node (ID lookup)
        if (context.$node?.[nodeName]) {
          nodeResult = context.$node[nodeName];
          this.logger.log(`[ExprResolve] Found node by direct key lookup: ${nodeName}`);
        } else {
          // Search by label/name in node metadata
          // Context should include node metadata for label lookup
          const nodeMetadata = context.$workflow?.nodeMetadata || {};
          this.logger.log(`[ExprResolve] Node not found directly, searching in metadata. Available metadata keys:`, Object.keys(nodeMetadata));
          for (const [nodeId, metadata] of Object.entries(nodeMetadata)) {
            if ((metadata as any)?.label === nodeName || (metadata as any)?.name === nodeName) {
              nodeResult = context.$node?.[nodeId];
              this.logger.log(`[ExprResolve] Found node by metadata lookup: nodeId=${nodeId}, label=${(metadata as any)?.label}`);
              break;
            }
          }

          // Fallback: Try to find by node ID prefix (e.g., "Run Code" -> "RUN_CODE_*")
          if (!nodeResult) {
            const normalizedName = nodeName.toUpperCase().replace(/\s+/g, '_');
            this.logger.log(`[ExprResolve] Trying fallback lookup with normalized name: ${normalizedName}`);
            const nodeKeys = Object.keys(context.$node || {});
            for (const nodeKey of nodeKeys) {
              if (nodeKey.startsWith(normalizedName + '_') || nodeKey === normalizedName) {
                nodeResult = context.$node[nodeKey];
                this.logger.log(`[ExprResolve] Found node by prefix fallback: ${nodeKey}`);
                break;
              }
            }
          }
        }

        // Node result has structure: { data: [[{json: {...}}]], startTime, executionTime }
        // Extract the json data from the first item
        if (nodeResult?.data?.[0]?.[0]?.json) {
          const json = nodeResult.data[0][0].json;
          this.logger.log(`[ExprResolve] Node json data keys:`, Object.keys(json));
          const resolved = this.getNestedValue(json, fieldPath);
          this.logger.log(`[ExprResolve] Resolved value for "${fieldPath}":`, resolved);
          return resolved;
        }

        this.logger.warn(`[ExprResolve] Could not resolve node expression: $node["${nodeName}"].json.${fieldPath} - nodeResult:`, nodeResult ? 'exists but no json data' : 'not found');
        return undefined;
      }
    }

    // Handle $workflow.variables.name
    if (path.startsWith('$workflow.')) {
      const fieldPath = path.substring(10);
      return this.getNestedValue(context.$workflow, fieldPath);
    }

    // Handle $env.VARIABLE_NAME
    if (path.startsWith('$env.')) {
      const varName = path.substring(5);
      return context.$env?.[varName] || process.env[varName];
    }

    // Fallback: try to resolve as literal
    return path;
  }

  /**
   * Get nested value from object using dot notation
   */
  private getNestedValue(obj: any, path: string): any {
    if (!obj || !path) return undefined;

    const keys = path.split('.');
    let current = obj;

    for (const key of keys) {
      if (current === null || current === undefined) {
        return undefined;
      }

      // Handle array bracket notation like "places[0]"
      const arrayMatch = key.match(/^([^\[]+)\[(\d+)\]$/);
      if (arrayMatch) {
        const [, arrayKey, index] = arrayMatch;
        current = current[arrayKey];
        if (current === null || current === undefined) {
          return undefined;
        }
        current = current[parseInt(index, 10)];
      } else {
        current = current[key];
      }
    }

    return current;
  }

  /**
   * Resolve all expressions in an object recursively
   */
  private resolveObjectExpressions(obj: any, context: any): any {
    if (typeof obj === 'string') {
      return this.resolveExpression(obj, context);
    }

    if (Array.isArray(obj)) {
      return obj.map(item => this.resolveObjectExpressions(item, context));
    }

    if (obj && typeof obj === 'object') {
      const resolved: any = {};
      for (const [key, value] of Object.entries(obj)) {
        resolved[key] = this.resolveObjectExpressions(value, context);
      }
      return resolved;
    }

    return obj;
  }

  /**
   * ACTION: Simple Memory
   * Provides in-memory conversation storage for AI Agent
   */
  private async executeSimpleMemory(node: any, inputData: any[], context: any): Promise<any[]> {
    const config = node.data || {};

    this.logger.log('Executing Simple Memory node (memory provider)');

    if (!this.simpleMemoryService) {
      throw new Error('Simple Memory service not available');
    }

    // Get configuration
    const sessionIdType = config.sessionIdType || 'fromInput';
    const sessionKeyTemplate = config.sessionKey || '{{ $json.sessionId }}';
    const contextWindowLength = config.contextWindowLength || 5;

    // Extract workflow ID from context
    const workflowId = context.$workflow?.id || 'default';

    // Resolve session ID
    let sessionId: string;

    if (sessionIdType === 'fromInput') {
      // Try to get sessionId from input data
      const firstItem = inputData[0] || {};
      const itemData = firstItem.json || firstItem;

      // Try resolving the template
      const resolvedKey = this.resolveExpression(sessionKeyTemplate, {
        ...context,
        $json: itemData
      });

      sessionId = resolvedKey || itemData.sessionId || itemData.session_id || 'default-session';
    } else {
      // Custom key
      sessionId = this.resolveExpression(sessionKeyTemplate, context) || 'default-session';
    }

    this.logger.log(`Simple Memory - workflowId: ${workflowId}, sessionId: ${sessionId}, window: ${contextWindowLength}`);

    // Get or create memory
    const memory = await this.simpleMemoryService.getMemory(
      workflowId,
      sessionId,
      contextWindowLength
    );

    // Get all messages from memory
    const messages = await memory.getMessages();

    this.logger.log(`Retrieved ${messages.length} messages from memory`);

    // Return memory data (similar to OpenAI Chat Model returning modelConfig)
    return [{
      json: {
        memory: {
          sessionId,
          workflowId,
          contextWindowLength,
          messages: messages.map(m => ({
            type: m.type,
            content: m.content,
            timestamp: m.timestamp
          })),
          // Provide methods for AI Agent to use
          addMessage: async (type: 'human' | 'ai' | 'system', content: string) => {
            await this.simpleMemoryService.addMessage(workflowId, sessionId, { type, content });
          },
          clear: async () => {
            await this.simpleMemoryService.clearMemory(workflowId, sessionId);
          }
        }
      }
    }];
  }

  /**
   * ACTION: Redis Memory
   * Provides persistent Redis-backed conversation storage for AI Agent
   */
  private async executeRedisMemory(node: any, inputData: any[], context: any): Promise<any[]> {
    const config = node.data || {};

    this.logger.log('Executing Redis Memory node (memory provider)');

    if (!this.redisMemoryService) {
      throw new Error('Redis Memory service not available');
    }

    if (!this.connectorsService) {
      throw new Error('Connectors service not available');
    }

    // Get configuration
    const credentialId = config.credentialId;
    const sessionIdType = config.sessionIdType || 'fromInput';
    const sessionKeyTemplate = config.sessionKey || '{{ $json.sessionId }}';
    const contextWindowLength = config.contextWindowLength || 5;
    const sessionTTL = config.sessionTTL || 0;

    if (!credentialId) {
      throw new Error('Redis Memory requires a Redis credential to be selected. Please configure the node.');
    }

    // Fetch Redis credentials
    let credentials: any;
    try {
      credentials = await this.connectorsService.getConnectorCredentials(credentialId);
    } catch (error: any) {
      this.logger.error('Failed to fetch Redis credentials:', error.message);
      throw new Error(`Failed to fetch Redis credentials: ${error.message}`);
    }

    if (!credentials || !credentials.host) {
      throw new Error('Redis credentials not found or invalid. Please check your credential configuration.');
    }

    // Create Redis client
    const redisClient = await this.redisMemoryService.createRedisClient({
      host: credentials.host,
      port: credentials.port || 6379,
      password: credentials.password,
      database: credentials.database || 0,
      username: credentials.username,
      ssl: credentials.ssl || false,
    });

    // Extract workflow ID from context
    const workflowId = context.$workflow?.id || 'default';

    // Resolve session ID
    let sessionId: string;

    if (sessionIdType === 'fromInput') {
      // Try to get sessionId from input data
      const firstItem = inputData[0] || {};
      const itemData = firstItem.json || firstItem;

      // Try resolving the template
      const resolvedKey = this.resolveExpression(sessionKeyTemplate, {
        ...context,
        $json: itemData
      });

      sessionId = resolvedKey || itemData.sessionId || itemData.session_id || 'default-session';
    } else {
      // Custom key
      sessionId = this.resolveExpression(sessionKeyTemplate, context) || 'default-session';
    }

    this.logger.log(`Redis Memory - workflowId: ${workflowId}, sessionId: ${sessionId}, window: ${contextWindowLength}, TTL: ${sessionTTL}`);

    // Get or create memory
    const memory = await this.redisMemoryService.getMemory(
      redisClient,
      workflowId,
      sessionId,
      contextWindowLength,
      sessionTTL
    );

    // Get all messages from memory
    const messages = await memory.getMessages();

    this.logger.log(`Retrieved ${messages.length} messages from Redis memory`);

    // Return memory data (similar to Simple Memory)
    return [{
      json: {
        memory: {
          sessionId,
          workflowId,
          contextWindowLength,
          sessionTTL,
          messages: messages.map(m => ({
            type: m.type,
            content: m.content,
            timestamp: m.timestamp
          })),
          // Provide methods for AI Agent to use
          addMessage: async (type: 'human' | 'ai' | 'system', content: string) => {
            await memory.addMessage({ type, content });
          },
          clear: async () => {
            await memory.clear();
          },
          // Provide cleanup function
          _cleanup: async () => {
            await this.redisMemoryService.closeClient(redisClient);
          }
        }
      }
    }];
  }

  /**
   * TOOL: Connector Tool (Generic)
   * Provides any connector's actions as tools for AI Agents
   * Always runs in 'provider' mode - returns tool definitions, not execution results
   *
   * Supports context params for pre-filling non-AI-controlled fields:
   * - contextParams: { actionId: { field: value } }
   * - Values can be expressions like {{$json.chatId}}
   */
  private async executeConnectorTool(node: any, inputData: any[], context: any): Promise<any[]> {
    const config = node.data || {};

    this.logger.log('Executing Connector Tool node');
    this.logger.log('Connector Tool config:', JSON.stringify(config, null, 2));

    if (!this.connectorToolProvider) {
      throw new Error('Connector Tool Provider service not available');
    }

    // Get configuration
    const connectorType = config.connectorType;
    const credentialId = config.credentialId;
    const selectedActions = config.selectedActions || []; // Optional: filter specific actions
    const rawContextParams = config.contextParams || {}; // Pre-filled params per action

    if (!connectorType) {
      throw new Error('Connector Tool requires a connector type to be selected.');
    }

    if (!credentialId) {
      throw new Error('Connector Tool requires credentials to be selected.');
    }

    this.logger.log(`Generating tools for connector: ${connectorType}`);

    // Build expression context from input data
    const expressionContext = {
      ...context,
      $json: inputData[0]?.json || inputData[0] || {},
    };

    // Resolve expressions in context params
    const resolvedContextParams: Record<string, Record<string, any>> = {};
    for (const [actionId, actionParams] of Object.entries(rawContextParams)) {
      resolvedContextParams[actionId] = {};
      for (const [key, value] of Object.entries(actionParams as Record<string, any>)) {
        resolvedContextParams[actionId][key] = this.resolveExpression(value, expressionContext);
      }
    }

    this.logger.log(`Resolved context params: ${JSON.stringify(resolvedContextParams)}`);

    try {
      // Generate tool definitions from connector with context params
      const toolProviderOutput = await this.connectorToolProvider.generateToolsFromConnector(
        connectorType,
        credentialId,
        {
          actionFilter: selectedActions.length > 0 ? selectedActions : undefined,
          contextParams: Object.keys(resolvedContextParams).length > 0 ? resolvedContextParams : undefined,
          filterAIControlled: true, // Only expose AI-controlled fields to the agent
        }
      );

      this.logger.log(`Generated ${toolProviderOutput.toolDefinitions.length} tools for ${connectorType}`);

      // Return as ToolProviderOutput
      return [{
        json: toolProviderOutput
      }];
    } catch (error: any) {
      this.logger.error(`Connector Tool failed:`, error.message);
      throw new Error(`Connector Tool failed: ${error.message}`);
    }
  }

  /**
   * ACTION: Google Analytics GA4
   * Get reports from Google Analytics 4 properties
   */
  private async executeGoogleAnalyticsGA4(node: any, inputData: any[], context: any): Promise<any[]> {
    const config = node.data || {};

    this.logger.log('Executing Google Analytics GA4 node');

    // Get required configuration
    const credentialId = config.credentialId;
    const propertyId = this.resolveExpression(config.propertyId, {
      ...context,
      $json: inputData[0]?.json || inputData[0] || {}
    });

    if (!credentialId) {
      throw new Error('Google Analytics GA4 requires a credential to be selected. Please configure the node.');
    }

    if (!propertyId) {
      throw new Error('Google Analytics GA4 requires a Property ID. Please configure the node.');
    }

    // Get configuration
    const dateRange = config.dateRange || 'last7days';
    const returnAll = config.returnAll || false;
    const limit = config.limit || 100;
    const simple = config.simple !== false; // default to true
    const currencyCode = config.currencyCode;

    // Parse metrics and dimensions
    let metrics = config.metrics || ['activeUsers', 'sessions'];
    let dimensions = config.dimensions || ['date'];

    // If metrics/dimensions are strings (JSON), parse them
    if (typeof metrics === 'string') {
      try {
        metrics = JSON.parse(metrics);
      } catch (e) {
        throw new Error(`Invalid metrics format. Must be a JSON array: ${metrics}`);
      }
    }

    if (typeof dimensions === 'string') {
      try {
        dimensions = JSON.parse(dimensions);
      } catch (e) {
        throw new Error(`Invalid dimensions format. Must be a JSON array: ${dimensions}`);
      }
    }

    // Prepare date ranges
    const dateRanges = this.prepareDateRange(dateRange, config.startDate, config.endDate);

    // Build request body
    const body: any = {
      dateRanges: dateRanges,
    };

    // Add metrics
    if (Array.isArray(metrics) && metrics.length > 0) {
      body.metrics = metrics.map((metric: any) => {
        if (typeof metric === 'string') {
          return { name: metric };
        }
        return metric;
      });
    }

    // Add dimensions
    if (Array.isArray(dimensions) && dimensions.length > 0) {
      body.dimensions = dimensions.map((dimension: any) => {
        if (typeof dimension === 'string') {
          return { name: dimension };
        }
        return dimension;
      });
    }

    // Add optional fields
    if (currencyCode) {
      body.currencyCode = currencyCode;
    }

    if (config.dimensionFilter) {
      try {
        body.dimensionFilter = typeof config.dimensionFilter === 'string'
          ? JSON.parse(config.dimensionFilter)
          : config.dimensionFilter;
      } catch (e) {
        this.logger.warn('Invalid dimensionFilter JSON, skipping');
      }
    }

    if (config.metricFilter) {
      try {
        body.metricFilter = typeof config.metricFilter === 'string'
          ? JSON.parse(config.metricFilter)
          : config.metricFilter;
      } catch (e) {
        this.logger.warn('Invalid metricFilter JSON, skipping');
      }
    }

    if (config.orderBys) {
      try {
        body.orderBys = typeof config.orderBys === 'string'
          ? JSON.parse(config.orderBys)
          : config.orderBys;
      } catch (e) {
        this.logger.warn('Invalid orderBys JSON, skipping');
      }
    }

    // Add limit if not returning all
    if (!returnAll) {
      body.limit = limit;
    }

    // Get credentials from connectors service
    if (!this.connectorsService) {
      throw new Error('Connectors service not available');
    }

    try {
      const credentials = await this.connectorsService.getConnectorCredentials(credentialId);

      // Make API request to Google Analytics Data API (GA4)
      const baseURL = 'https://analyticsdata.googleapis.com';
      const endpoint = `/v1beta/properties/${propertyId}:runReport`;

      let responseData: any;

      if (returnAll) {
        // Implement pagination to get all results
        responseData = await this.googleApiRequestAllItems(baseURL, endpoint, body, credentials);
      } else {
        const response = await axios.post(`${baseURL}${endpoint}`, body, {
          headers: {
            'Accept': 'application/json',
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${credentials.accessToken}`
          }
        });

        responseData = response.data;
      }

      // Simplify response if needed
      let finalData = responseData;
      if (simple && responseData) {
        finalData = this.simplifyGA4Response(responseData);
      }

      this.logger.log(`Google Analytics GA4 executed successfully`);

      // Return result
      return Array.isArray(finalData) ? finalData.map(item => ({ json: item })) : [{ json: finalData }];

    } catch (error: any) {
      this.logger.error(`Google Analytics GA4 execution failed:`, error.message);
      throw new Error(`Google Analytics GA4 execution failed: ${error.response?.data?.error?.message || error.message}`);
    }
  }

  /**
   * Helper: Prepare date range for GA4 request
   */
  private prepareDateRange(dateRange: string, startDate?: string, endDate?: string): any[] {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    let start: string;
    let end: string;

    switch (dateRange) {
      case 'today':
        start = 'today';
        end = 'today';
        break;

      case 'yesterday':
        start = 'yesterday';
        end = 'yesterday';
        break;

      case 'last7days':
        start = '7daysAgo';
        end = 'today';
        break;

      case 'last30days':
        start = '30daysAgo';
        end = 'today';
        break;

      case 'last90days':
        start = '90daysAgo';
        end = 'today';
        break;

      case 'thisMonth':
        const thisMonthStart = new Date(today.getFullYear(), today.getMonth(), 1);
        start = thisMonthStart.toISOString().split('T')[0];
        end = 'today';
        break;

      case 'lastMonth':
        const lastMonthStart = new Date(today.getFullYear(), today.getMonth() - 1, 1);
        const lastMonthEnd = new Date(today.getFullYear(), today.getMonth(), 0);
        start = lastMonthStart.toISOString().split('T')[0];
        end = lastMonthEnd.toISOString().split('T')[0];
        break;

      case 'thisYear':
        const thisYearStart = new Date(today.getFullYear(), 0, 1);
        start = thisYearStart.toISOString().split('T')[0];
        end = 'today';
        break;

      case 'lastYear':
        const lastYearStart = new Date(today.getFullYear() - 1, 0, 1);
        const lastYearEnd = new Date(today.getFullYear() - 1, 11, 31);
        start = lastYearStart.toISOString().split('T')[0];
        end = lastYearEnd.toISOString().split('T')[0];
        break;

      case 'custom':
        if (!startDate || !endDate) {
          throw new Error('Custom date range requires startDate and endDate to be specified');
        }
        start = startDate;
        end = endDate;
        break;

      default:
        start = '7daysAgo';
        end = 'today';
    }

    return [{ startDate: start, endDate: end }];
  }

  /**
   * Helper: Simplify GA4 response to flat objects
   */
  private simplifyGA4Response(response: any): any[] {
    if (!response.rows || !Array.isArray(response.rows)) {
      return [];
    }

    const dimensionHeaders = (response.dimensionHeaders || []).map((header: any) => header.name);
    const metricHeaders = (response.metricHeaders || []).map((header: any) => header.name);

    const returnData: any[] = [];

    response.rows.forEach((row: any) => {
      const rowData: any = {};

      // Add dimensions
      dimensionHeaders.forEach((dimension: string, index: number) => {
        rowData[dimension] = row.dimensionValues?.[index]?.value || null;
      });

      // Add metrics
      metricHeaders.forEach((metric: string, index: number) => {
        rowData[metric] = row.metricValues?.[index]?.value || null;
      });

      returnData.push(rowData);
    });

    return returnData;
  }

  /**
   * Helper: Get all items from Google Analytics API with pagination
   */
  private async googleApiRequestAllItems(baseURL: string, endpoint: string, body: any, credentials: any): Promise<any> {
    const allRows: any[] = [];
    let offset = 0;
    const limit = 100000; // GA4 max limit per request

    let hasMore = true;

    while (hasMore) {
      const paginatedBody = {
        ...body,
        limit: limit,
        offset: offset
      };

      const response = await axios.post(`${baseURL}${endpoint}`, paginatedBody, {
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${credentials.accessToken}`
        }
      });

      const data = response.data;

      if (data.rows && data.rows.length > 0) {
        allRows.push(...data.rows);
        offset += data.rows.length;

        // Check if there are more rows
        if (data.rowCount && offset >= data.rowCount) {
          hasMore = false;
        } else if (data.rows.length < limit) {
          hasMore = false;
        }
      } else {
        hasMore = false;
      }
    }

    // Return combined response
    return {
      rows: allRows,
      dimensionHeaders: allRows.length > 0 ? (await axios.post(`${baseURL}${endpoint}`, { ...body, limit: 1 }, {
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${credentials.accessToken}`
        }
      })).data.dimensionHeaders : [],
      metricHeaders: allRows.length > 0 ? (await axios.post(`${baseURL}${endpoint}`, { ...body, limit: 1 }, {
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${credentials.accessToken}`
        }
      })).data.metricHeaders : [],
      rowCount: allRows.length
    };
  }

  /**
   * ACTION: Merge
   * Combines data from multiple inputs using various merge strategies
   * Based on n8n's Merge node v3 implementation
   */
  private async executeMerge(node: any, inputData: any[], context: any): Promise<any[]> {
    const config = node.data || {};
    const mode = config.mode || 'append';

    this.logger.log(`Executing Merge node with mode: ${mode}`);

    // Merge nodes work with multiple inputs, but in Fluxturn's current architecture,
    // we need to handle this differently. For now, we'll assume the node has received
    // data from multiple branches in the inputData array.

    // If we only have one input, return it as-is
    if (!Array.isArray(inputData) || inputData.length === 0) {
      return [];
    }

    try {
      switch (mode) {
        case 'append':
          return this.mergeAppend(config, inputData, context);

        case 'combine':
          const combineBy = config.combineBy || 'combineByPosition';
          switch (combineBy) {
            case 'combineByFields':
              return this.mergeCombineByFields(config, inputData, context);
            case 'combineByPosition':
              return this.mergeCombineByPosition(config, inputData, context);
            case 'combineAll':
              return this.mergeCombineAll(config, inputData, context);
            default:
              throw new Error(`Unknown combine mode: ${combineBy}`);
          }

        case 'combineBySql':
          return this.mergeCombineBySql(config, inputData, context);

        case 'chooseBranch':
          return this.mergeChooseBranch(config, inputData, context);

        default:
          throw new Error(`Unknown merge mode: ${mode}`);
      }
    } catch (error) {
      this.logger.error(`Merge execution failed:`, error);
      throw error;
    }
  }

  /**
   * Merge Mode: Append
   * Simply concatenates all input arrays
   */
  private mergeAppend(config: any, inputData: any[], context: any): any[] {
    this.logger.log(`Merge Append: Concatenating ${inputData.length} items`);
    // Just return all items as a flat array
    return inputData;
  }

  /**
   * Merge Mode: Combine by Fields
   * Matches items from different inputs based on field values
   */
  private mergeCombineByFields(config: any, inputData: any[], context: any): any[] {
    // Split input data into two inputs (we'll need to figure out how to determine the split)
    // For simplicity, we'll assume the first half is input1 and second half is input2
    const midpoint = Math.floor(inputData.length / 2);
    const input1 = inputData.slice(0, midpoint);
    const input2 = inputData.slice(midpoint);

    if (input1.length === 0 || input2.length === 0) {
      return inputData; // Can't merge if one input is empty
    }

    const fieldsToMatch = config.fieldsToMatchString || '';
    const joinMode = config.joinMode || 'keepMatches';
    const outputDataFrom = config.outputDataFrom || 'both';
    const clashHandling = config.clashHandling || 'preferInput2';

    // Parse fields to match
    const matchFields = fieldsToMatch.split(',').map((f: string) => f.trim()).filter((f: string) => f);

    if (matchFields.length === 0) {
      this.logger.warn('No fields to match specified, returning input1');
      return input1;
    }

    const results: any[] = [];
    const matched1 = new Set<number>();
    const matched2 = new Set<number>();

    // Find matches
    for (let i = 0; i < input1.length; i++) {
      for (let j = 0; j < input2.length; j++) {
        const item1 = input1[i].json || input1[i];
        const item2 = input2[j].json || input2[j];

        // Check if all fields match
        const allMatch = matchFields.every((field: string) => {
          return item1[field] === item2[field];
        });

        if (allMatch) {
          matched1.add(i);
          matched2.add(j);

          // Merge the matched items
          if (outputDataFrom === 'both') {
            const merged = this.mergeObjects(item1, item2, clashHandling);
            results.push({ json: merged });
          } else if (outputDataFrom === 'input1') {
            results.push({ json: { ...item1 } });
          } else if (outputDataFrom === 'input2') {
            results.push({ json: { ...item2 } });
          }
        }
      }
    }

    // Handle unmatched items based on joinMode
    if (joinMode === 'keepEverything' || joinMode === 'enrichInput1') {
      for (let i = 0; i < input1.length; i++) {
        if (!matched1.has(i)) {
          results.push(input1[i]);
        }
      }
    }

    if (joinMode === 'keepEverything' || joinMode === 'enrichInput2') {
      for (let j = 0; j < input2.length; j++) {
        if (!matched2.has(j)) {
          results.push(input2[j]);
        }
      }
    }

    if (joinMode === 'keepNonMatches') {
      if (outputDataFrom === 'input1' || outputDataFrom === 'both') {
        for (let i = 0; i < input1.length; i++) {
          if (!matched1.has(i)) {
            results.push(input1[i]);
          }
        }
      }
      if (outputDataFrom === 'input2' || outputDataFrom === 'both') {
        for (let j = 0; j < input2.length; j++) {
          if (!matched2.has(j)) {
            results.push(input2[j]);
          }
        }
      }
    }

    return results;
  }

  /**
   * Merge Mode: Combine by Position
   * Merges items at the same index position from different inputs
   */
  private mergeCombineByPosition(config: any, inputData: any[], context: any): any[] {
    const midpoint = Math.floor(inputData.length / 2);
    const input1 = inputData.slice(0, midpoint);
    const input2 = inputData.slice(midpoint);

    const includeUnpaired = config.includeUnpaired || false;
    const clashHandling = config.clashHandling || 'preferInput2';

    const results: any[] = [];
    const maxLength = includeUnpaired
      ? Math.max(input1.length, input2.length)
      : Math.min(input1.length, input2.length);

    for (let i = 0; i < maxLength; i++) {
      const item1 = i < input1.length ? (input1[i].json || input1[i]) : {};
      const item2 = i < input2.length ? (input2[i].json || input2[i]) : {};

      const merged = this.mergeObjects(item1, item2, clashHandling);
      results.push({ json: merged });
    }

    return results;
  }

  /**
   * Merge Mode: Combine All (Cross Join)
   * Creates a cartesian product of all inputs
   */
  private mergeCombineAll(config: any, inputData: any[], context: any): any[] {
    const midpoint = Math.floor(inputData.length / 2);
    const input1 = inputData.slice(0, midpoint);
    const input2 = inputData.slice(midpoint);

    if (input1.length === 0 || input2.length === 0) {
      return [];
    }

    const clashHandling = config.clashHandling || 'preferInput2';
    const results: any[] = [];

    // Create cartesian product
    for (const item1 of input1) {
      for (const item2 of input2) {
        const json1 = item1.json || item1;
        const json2 = item2.json || item2;
        const merged = this.mergeObjects(json1, json2, clashHandling);
        results.push({ json: merged });
      }
    }

    return results;
  }

  /**
   * Merge Mode: Combine by SQL
   * Uses SQL-like queries to merge data
   * Note: This is a simplified implementation
   */
  private mergeCombineBySql(config: any, inputData: any[], context: any): any[] {
    const query = config.query || '';

    if (!query) {
      throw new Error('SQL query is required for combineBySql mode');
    }

    // For a full implementation, we would use alasql library like n8n does
    // For now, we'll just return the input data
    this.logger.warn('SQL merge mode not fully implemented yet');
    return inputData;
  }

  /**
   * Merge Mode: Choose Branch
   * Outputs data from a specific input branch
   */
  private mergeChooseBranch(config: any, inputData: any[], context: any): any[] {
    const output = config.output || 'specifiedInput';
    const useDataOfInput = config.useDataOfInput || 1;

    if (output === 'empty') {
      return [{ json: {} }];
    }

    // For simplicity, assume we're choosing from the first or second half
    const midpoint = Math.floor(inputData.length / 2);

    if (useDataOfInput === 1) {
      return inputData.slice(0, midpoint);
    } else if (useDataOfInput === 2) {
      return inputData.slice(midpoint);
    }

    return inputData;
  }

  /**
   * Helper: Merge two objects based on clash handling strategy
   */
  private mergeObjects(obj1: any, obj2: any, clashHandling: string): any {
    if (clashHandling === 'preferInput1') {
      return { ...obj2, ...obj1 };
    } else if (clashHandling === 'preferInput2') {
      return { ...obj1, ...obj2 };
    } else if (clashHandling === 'addSuffix') {
      const result: any = {};

      // Add all fields from obj1 with suffix '1'
      for (const key in obj1) {
        const newKey = obj2.hasOwnProperty(key) ? `${key}_1` : key;
        result[newKey] = obj1[key];
      }

      // Add all fields from obj2 with suffix '2' if they conflict
      for (const key in obj2) {
        const newKey = obj1.hasOwnProperty(key) ? `${key}_2` : key;
        result[newKey] = obj2[key];
      }

      return result;
    } else {
      // Default: prefer input2
      return { ...obj1, ...obj2 };
    }
  }

  /**
   * SPLIT: Split data into multiple outputs
   */
  private async executeSplit(node: any, inputData: any[], context: any): Promise<any[]> {
    const config = node.data || {};
    const mode = config.mode || 'duplicate';
    const numberOfOutputs = config.numberOfOutputs || 2;

    this.logger.log(`Executing Split node with mode: ${mode}, outputs: ${numberOfOutputs}`);

    if (!Array.isArray(inputData) || inputData.length === 0) {
      return [];
    }

    try {
      switch (mode) {
        case 'duplicate':
          // Send same data to all outputs
          return this.splitDuplicate(config, inputData, context);

        case 'splitByCondition':
          // Split based on conditions (routes data to different outputs)
          return this.splitByCondition(config, inputData, context);

        case 'splitEvenly':
          // Distribute items evenly across outputs
          return this.splitEvenly(config, inputData, context, numberOfOutputs);

        case 'splitByField':
          // Split based on field value
          return this.splitByField(config, inputData, context);

        case 'splitBySize':
          // Split array into chunks
          return this.splitBySize(config, inputData, context);

        default:
          throw new Error(`Unknown split mode: ${mode}`);
      }
    } catch (error) {
      this.logger.error('Split execution error:', error);
      throw error;
    }
  }

  /**
   * Split Mode: Duplicate - send same data to all outputs
   */
  private splitDuplicate(config: any, inputData: any[], context: any): any[] {
    // Simply return the input data as-is
    // The workflow engine will handle sending it to multiple outputs
    return inputData;
  }

  /**
   * Split Mode: By Condition - route data based on conditions
   */
  private splitByCondition(config: any, inputData: any[], context: any): any[] {
    const conditions = config.conditions || [];
    const defaultOutput = config.defaultOutput || 0;

    // Add metadata to each item indicating which output it should go to
    return inputData.map(item => {
      let outputIndex = defaultOutput;

      // Check each condition
      for (let i = 0; i < conditions.length; i++) {
        const condition = conditions[i];
        if (this.evaluateCondition(item, condition)) {
          outputIndex = i;
          break;
        }
      }

      return {
        ...item,
        __splitOutput: outputIndex
      };
    });
  }

  /**
   * Split Mode: Evenly - distribute items across outputs
   */
  private splitEvenly(config: any, inputData: any[], context: any, numberOfOutputs: number): any[] {
    // Distribute items in round-robin fashion
    return inputData.map((item, index) => ({
      ...item,
      __splitOutput: index % numberOfOutputs
    }));
  }

  /**
   * Split Mode: By Field - split based on field value
   */
  private splitByField(config: any, inputData: any[], context: any): any[] {
    const fieldName = config.fieldName || 'type';
    const fieldValues = config.fieldValues || [];

    return inputData.map(item => {
      const fieldValue = item.json?.[fieldName] || item[fieldName];
      const outputIndex = fieldValues.indexOf(fieldValue);

      return {
        ...item,
        __splitOutput: outputIndex >= 0 ? outputIndex : 0
      };
    });
  }

  /**
   * Split Mode: By Size - split into chunks
   */
  private splitBySize(config: any, inputData: any[], context: any): any[] {
    const chunkSize = config.chunkSize || 10;
    const chunks: any[] = [];

    for (let i = 0; i < inputData.length; i += chunkSize) {
      const chunk = inputData.slice(i, i + chunkSize);
      chunks.push({
        json: {
          items: chunk,
          chunkIndex: Math.floor(i / chunkSize),
          totalChunks: Math.ceil(inputData.length / chunkSize)
        }
      });
    }

    return chunks;
  }

  /**
   * Helper: Evaluate a simple condition
   */
  private evaluateCondition(item: any, condition: any): boolean {
    const fieldValue = item.json?.[condition.field] || item[condition.field];
    const compareValue = condition.value;

    switch (condition.operator) {
      case 'equals':
        return fieldValue == compareValue;
      case 'notEquals':
        return fieldValue != compareValue;
      case 'greaterThan':
        return fieldValue > compareValue;
      case 'lessThan':
        return fieldValue < compareValue;
      case 'contains':
        return String(fieldValue).includes(String(compareValue));
      default:
        return false;
    }
  }

  /**
   * CONTROL FLOW: Loop Over Items
   * Iterates over an array and outputs each item separately
   */
  private async executeLoop(node: any, inputData: any[], context: any): Promise<any[]> {
    const config = node.data || {};

    this.logger.log(`=== LOOP NODE EXECUTION ===`);
    this.logger.log(`Input data count: ${inputData.length}`);
    this.logger.log(`Items expression: ${config.items}`);

    // Validate configuration
    if (!config.items) {
      const nodeName = node.data?.label || node.id;
      throw new Error(
        `Node "${nodeName}" is not configured properly. Missing: items expression. ` +
        `Please double-click the node to configure the items to loop over.`
      );
    }

    const results: any[] = [];

    // Process each input item
    for (const item of inputData) {
      const itemContext = {
        ...context,
        $json: item.json || item
      };

      // Resolve the items expression
      const itemsToLoop = this.resolveExpression(config.items, itemContext);

      this.logger.log(`Resolved items type: ${typeof itemsToLoop}`);
      this.logger.log(`Is array: ${Array.isArray(itemsToLoop)}`);

      if (!Array.isArray(itemsToLoop)) {
        this.logger.warn(`Loop items expression did not return an array. Got: ${typeof itemsToLoop}`);
        throw new Error(
          `Loop items expression did not return an array. Expression: ${config.items}`
        );
      }

      this.logger.log(`Loop will iterate over ${itemsToLoop.length} items`);

      // Apply max iterations if configured
      const maxIterations = config.maxIterations || itemsToLoop.length;
      const itemsToProcess = itemsToLoop.slice(0, maxIterations);

      // Output each item separately
      for (const loopItem of itemsToProcess) {
        results.push({
          json: loopItem
        });
      }
    }

    this.logger.log(`Loop output: ${results.length} items`);
    this.logger.log(`=== LOOP NODE EXECUTION COMPLETE ===`);

    return results;
  }

  /**
   * CONTROL FLOW: Wait
   * Pauses workflow execution before continuing
   * Supports: time interval, specific time, webhook, and form submission
   */
  private async executeWait(node: any, inputData: any[], context: any): Promise<any[]> {
    const config = node.data || {};
    const resume = config.resume || 'timeInterval';

    this.logger.log(`=== WAIT NODE EXECUTION ===`);
    this.logger.log(`Resume mode: ${resume}`);

    try {
      switch (resume) {
        case 'timeInterval':
          return await this.waitTimeInterval(node, inputData, context, config);

        case 'specificTime':
          return await this.waitSpecificTime(node, inputData, context, config);

        case 'webhook':
          return await this.waitWebhook(node, inputData, context, config);

        case 'form':
          return await this.waitForm(node, inputData, context, config);

        default:
          throw new Error(`Unknown wait resume mode: ${resume}`);
      }
    } catch (error: any) {
      this.logger.error(`Wait node execution failed:`, error.message);
      const nodeName = node.data?.label || node.id;
      const wrappedError = new Error(
        `Node "${nodeName}" wait execution failed: ${error.message}`
      );
      wrappedError.name = 'WaitNodeError';
      (wrappedError as any).originalError = error;
      throw wrappedError;
    }
  }

  /**
   * Wait Mode: Time Interval
   * Waits for a specified duration
   */
  private async waitTimeInterval(node: any, inputData: any[], context: any, config: any): Promise<any[]> {
    const unit = config.unit || 'seconds';
    let amount = config.amount !== undefined ? config.amount : 5;

    this.logger.log(`Wait time interval: ${amount} ${unit}`);

    // Validate amount
    if (typeof amount !== 'number' || amount < 0) {
      throw new Error(`Invalid wait amount: ${amount}. Must be a number >= 0.`);
    }

    // Convert to milliseconds
    let waitMs = amount * 1000;

    switch (unit) {
      case 'seconds':
        // Already in seconds
        break;
      case 'minutes':
        waitMs *= 60;
        break;
      case 'hours':
        waitMs *= 60 * 60;
        break;
      case 'days':
        waitMs *= 60 * 60 * 24;
        break;
      default:
        throw new Error(`Invalid time unit: ${unit}`);
    }

    this.logger.log(`Waiting for ${waitMs}ms (${amount} ${unit})`);

    // For short waits (< 65 seconds), use setTimeout
    // For longer waits, should use database-backed wait (future implementation)
    if (waitMs < 65000) {
      await new Promise(resolve => setTimeout(resolve, waitMs));
      this.logger.log(`Wait completed`);
      return inputData;
    } else {
      // For production, this should use context.putExecutionToWait()
      // For now, we'll use setTimeout but log a warning
      this.logger.warn(`Long wait detected (${waitMs}ms). In production, this should use database-backed waiting.`);
      await new Promise(resolve => setTimeout(resolve, waitMs));
      this.logger.log(`Wait completed`);
      return inputData;
    }
  }

  /**
   * Wait Mode: Specific Time
   * Waits until a specific date/time
   */
  private async waitSpecificTime(node: any, inputData: any[], context: any, config: any): Promise<any[]> {
    const dateTimeStr = config.dateTime;

    if (!dateTimeStr) {
      throw new Error('No date/time specified for wait node');
    }

    this.logger.log(`Wait until specific time: ${dateTimeStr}`);

    // Parse the date/time
    const targetTime = new Date(dateTimeStr);

    if (isNaN(targetTime.getTime())) {
      throw new Error(`Invalid date/time format: ${dateTimeStr}`);
    }

    const now = new Date();
    const waitMs = Math.max(0, targetTime.getTime() - now.getTime());

    this.logger.log(`Current time: ${now.toISOString()}`);
    this.logger.log(`Target time: ${targetTime.toISOString()}`);
    this.logger.log(`Wait duration: ${waitMs}ms`);

    if (waitMs === 0) {
      this.logger.log(`Target time already passed, continuing immediately`);
      return inputData;
    }

    // For short waits (< 65 seconds), use setTimeout
    if (waitMs < 65000) {
      await new Promise(resolve => setTimeout(resolve, waitMs));
      this.logger.log(`Wait completed`);
      return inputData;
    } else {
      // For production, this should use context.putExecutionToWait()
      this.logger.warn(`Long wait detected (${waitMs}ms). In production, this should use database-backed waiting.`);
      await new Promise(resolve => setTimeout(resolve, waitMs));
      this.logger.log(`Wait completed`);
      return inputData;
    }
  }

  /**
   * Wait Mode: Webhook
   * Waits for a webhook call to resume execution
   * NOTE: This is a simplified implementation. Full implementation would require:
   * - Generating unique webhook URL
   * - Storing execution state in database
   * - Webhook endpoint to resume execution
   */
  private async waitWebhook(node: any, inputData: any[], context: any, config: any): Promise<any[]> {
    this.logger.log(`Wait for webhook mode`);

    // Generate webhook URL (simplified - in production this would be a real URL)
    const executionId = context.$workflow?.executionId || 'test-execution';
    const webhookSuffix = config.webhookSuffix || '';
    const webhookUrl = `/api/webhooks/wait/${executionId}${webhookSuffix ? '/' + webhookSuffix : ''}`;

    this.logger.log(`Webhook URL (simulated): ${webhookUrl}`);
    this.logger.log(`HTTP Method: ${config.httpMethod || 'POST'}`);

    // In a full implementation, this would:
    // 1. Store execution state with putExecutionToWait()
    // 2. Return webhook URL in execution metadata
    // 3. Wait indefinitely until webhook is called
    // 4. Resume execution when webhook receives data

    // For now, we'll just log and return the input data with webhook info
    this.logger.warn('Webhook wait mode is not fully implemented. Returning immediately.');

    return inputData.map(item => ({
      json: {
        ...(item.json || item),
        _waitInfo: {
          mode: 'webhook',
          webhookUrl,
          httpMethod: config.httpMethod || 'POST',
          responseCode: config.responseCode || 200
        }
      }
    }));
  }

  /**
   * Wait Mode: Form
   * Waits for a form submission to resume execution
   * NOTE: This is a simplified implementation. Full implementation would require:
   * - Generating unique form URL
   * - Storing execution state in database
   * - Form endpoint to resume execution
   */
  private async waitForm(node: any, inputData: any[], context: any, config: any): Promise<any[]> {
    this.logger.log(`Wait for form submission mode`);

    // Generate form URL (simplified - in production this would be a real URL)
    const executionId = context.$workflow?.executionId || 'test-execution';
    const formUrl = `/api/forms/wait/${executionId}`;

    this.logger.log(`Form URL (simulated): ${formUrl}`);
    this.logger.log(`Form Title: ${config.formTitle || 'Form Submission'}`);

    // In a full implementation, this would:
    // 1. Store execution state with putExecutionToWait()
    // 2. Generate and serve a public form
    // 3. Wait indefinitely until form is submitted
    // 4. Resume execution with form data

    // For now, we'll just log and return the input data with form info
    this.logger.warn('Form wait mode is not fully implemented. Returning immediately.');

    return inputData.map(item => ({
      json: {
        ...(item.json || item),
        _waitInfo: {
          mode: 'form',
          formUrl,
          formTitle: config.formTitle || 'Form Submission',
          formFields: config.formFields || []
        }
      }
    }));
  }

  /**
   * ACTION: Set (Edit Fields)
   * Add, modify, or remove item fields
   * Supports manual mapping and JSON modes
   */
  private async executeSet(node: any, inputData: any[], context: any): Promise<any[]> {
    const config = node.data || {};
    const mode = config.mode || 'manual';

    this.logger.log(`=== SET NODE EXECUTION ===`);
    this.logger.log(`Mode: ${mode}`);

    try {
      const results: any[] = [];

      for (let i = 0; i < inputData.length; i++) {
        const item = inputData[i];
        const itemData = item.json || item;

        let newData: any = {};

        if (mode === 'json') {
          // JSON Mode
          newData = await this.executeSetJsonMode(itemData, config, context);
        } else {
          // Manual Mode
          newData = await this.executeSetManualMode(itemData, config, context);
        }

        // Handle field inclusion
        const finalData = this.applyFieldInclusion(itemData, newData, config);

        this.logger.log(`=== SET NODE OUTPUT ===`);
        this.logger.log(`Final data keys: ${Object.keys(finalData).join(', ')}`);
        this.logger.log(`Final data: ${JSON.stringify(finalData, null, 2)}`);

        results.push({
          json: finalData
        });
      }

      this.logger.log(`Set node processed ${results.length} items`);
      return results;
    } catch (error: any) {
      this.logger.error(`Set node execution failed:`, error.message);
      const nodeName = node.data?.label || node.id;
      const wrappedError = new Error(
        `Node "${nodeName}" set execution failed: ${error.message}`
      );
      wrappedError.name = 'SetNodeError';
      (wrappedError as any).originalError = error;
      throw wrappedError;
    }
  }

  /**
   * Execute Set node in JSON mode
   */
  private async executeSetJsonMode(itemData: any, config: any, context: any): Promise<any> {
    const jsonOutput = config.jsonOutput || '{}';

    try {
      // Parse JSON output
      let parsed: any;
      if (typeof jsonOutput === 'string') {
        parsed = JSON.parse(jsonOutput);
      } else {
        parsed = jsonOutput;
      }

      // Resolve expressions in the parsed JSON
      const resolved = this.resolveExpressionsInObject(parsed, context);

      return resolved;
    } catch (error: any) {
      throw new Error(`Invalid JSON output: ${error.message}`);
    }
  }

  /**
   * Recursively resolve expressions in an object or array
   */
  private resolveExpressionsInObject(obj: any, context: any): any {
    if (obj === null || obj === undefined) {
      return obj;
    }

    // Handle arrays
    if (Array.isArray(obj)) {
      return obj.map(item => this.resolveExpressionsInObject(item, context));
    }

    // Handle objects
    if (typeof obj === 'object') {
      const result: any = {};
      for (const key in obj) {
        if (obj.hasOwnProperty(key)) {
          result[key] = this.resolveExpressionsInObject(obj[key], context);
        }
      }
      return result;
    }

    // Handle strings with expressions
    if (typeof obj === 'string' && obj.includes('{{') && obj.includes('}}')) {
      return this.resolveExpression(obj, context);
    }

    // Return primitive values as-is
    return obj;
  }

  /**
   * Execute Set node in manual mode
   */
  private async executeSetManualMode(itemData: any, config: any, context: any): Promise<any> {
    let fields = config.fields || [];

    // Parse fields if it's a JSON string
    if (typeof fields === 'string') {
      try {
        fields = JSON.parse(fields);
      } catch (error: any) {
        throw new Error(`Invalid JSON for fields: ${error.message}`);
      }
    }

    // Ensure fields is an array
    if (!Array.isArray(fields)) {
      throw new Error('Fields must be an array');
    }

    const dotNotation = config.dotNotation !== false; // Default true
    const ignoreConversionErrors = config.ignoreConversionErrors || false;

    const newData: any = {};

    for (const field of fields) {
      const { name, type, value } = field;

      if (!name) {
        this.logger.warn('Field name is missing, skipping');
        continue;
      }

      try {
        // Resolve expression if value contains {{ }}
        let resolvedValue = value;
        if (typeof value === 'string' && value.includes('{{') && value.includes('}}')) {
          resolvedValue = this.resolveExpression(value, context);
          this.logger.log(`Resolved expression for field "${name}": ${value} -> ${resolvedValue}`);
        }

        // Convert value based on type
        const convertedValue = this.convertFieldValue(resolvedValue, type, ignoreConversionErrors);

        // Set field using dot notation if enabled
        if (dotNotation && name.includes('.')) {
          this.setNestedValue(newData, name, convertedValue);
        } else {
          newData[name] = convertedValue;
        }
      } catch (error: any) {
        if (ignoreConversionErrors) {
          this.logger.warn(`Type conversion error for field "${name}": ${error.message}, using raw value`);
          newData[name] = value;
        } else {
          throw new Error(`Type conversion error for field "${name}": ${error.message}`);
        }
      }
    }

    return newData;
  }

  /**
   * Convert field value to the specified type
   */
  private convertFieldValue(value: any, type: string, ignoreErrors: boolean): any {
    if (value === null || value === undefined) {
      return value;
    }

    switch (type) {
      case 'string':
        return String(value);

      case 'number':
        const num = Number(value);
        if (isNaN(num) && !ignoreErrors) {
          throw new Error(`Cannot convert "${value}" to number`);
        }
        return num;

      case 'boolean':
        if (typeof value === 'boolean') return value;
        if (typeof value === 'string') {
          const lowerValue = value.toLowerCase();
          if (lowerValue === 'true' || lowerValue === '1') return true;
          if (lowerValue === 'false' || lowerValue === '0') return false;
        }
        if (!ignoreErrors) {
          throw new Error(`Cannot convert "${value}" to boolean`);
        }
        return Boolean(value);

      case 'array':
        if (Array.isArray(value)) return value;
        if (typeof value === 'string') {
          try {
            const parsed = JSON.parse(value);
            if (Array.isArray(parsed)) return parsed;
          } catch (e) {
            // Not JSON, try comma-separated
            return value.split(',').map(v => v.trim());
          }
        }
        if (!ignoreErrors) {
          throw new Error(`Cannot convert "${value}" to array`);
        }
        return [value];

      case 'object':
        if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
          return value;
        }
        if (typeof value === 'string') {
          try {
            const parsed = JSON.parse(value);
            if (typeof parsed === 'object' && !Array.isArray(parsed)) {
              return parsed;
            }
          } catch (e) {
            if (!ignoreErrors) {
              throw new Error(`Invalid JSON for object: ${e.message}`);
            }
          }
        }
        if (!ignoreErrors) {
          throw new Error(`Cannot convert "${value}" to object`);
        }
        return { value };

      default:
        return value;
    }
  }

  /**
   * Set nested value using dot notation (e.g., "a.b.c")
   */
  private setNestedValue(obj: any, path: string, value: any): void {
    const keys = path.split('.');
    let current = obj;

    for (let i = 0; i < keys.length - 1; i++) {
      const key = keys[i];
      if (!current[key] || typeof current[key] !== 'object') {
        current[key] = {};
      }
      current = current[key];
    }

    current[keys[keys.length - 1]] = value;
  }

  /**
   * Apply field inclusion rules
   */
  private applyFieldInclusion(originalData: any, newData: any, config: any): any {
    const includeOtherFields = config.includeOtherFields || false;

    // Debug logging
    this.logger.log(`=== APPLY FIELD INCLUSION ===`);
    this.logger.log(`includeOtherFields from config: ${config.includeOtherFields}`);
    this.logger.log(`includeOtherFields resolved: ${includeOtherFields}`);
    this.logger.log(`Original data keys: ${Object.keys(originalData).join(', ')}`);
    this.logger.log(`New data keys: ${Object.keys(newData).join(', ')}`);

    if (!includeOtherFields) {
      // Only return the new data
      this.logger.log(`Returning ONLY new data (includeOtherFields is false)`);
      return newData;
    }

    this.logger.log(`Merging original data with new data (includeOtherFields is true)`);

    let include = config.include || 'all';
    const includeFields = config.includeFields || '';
    const excludeFields = config.excludeFields || '';

    // Defensive fix: If mode is 'selected' but no fields specified, default to 'all'
    if (include === 'selected' && !includeFields) {
      this.logger.log(`Include mode is 'selected' but includeFields is empty, defaulting to 'all'`);
      include = 'all';
    }

    this.logger.log(`Include mode: ${include}`);
    this.logger.log(`Include fields: ${includeFields}`);
    this.logger.log(`Exclude fields: ${excludeFields}`);

    let baseData: any = {};

    switch (include) {
      case 'all':
        // Include all original fields
        this.logger.log(`Case 'all': Copying all original data`);
        baseData = { ...originalData };
        this.logger.log(`Base data keys after copy: ${Object.keys(baseData).join(', ')}`);
        break;

      case 'selected':
        // Include only selected fields
        if (includeFields) {
          const fieldsToInclude = includeFields.split(',').map((f: string) => f.trim());
          for (const field of fieldsToInclude) {
            if (originalData.hasOwnProperty(field)) {
              baseData[field] = originalData[field];
            }
          }
        }
        break;

      case 'except':
        // Include all except specified fields
        baseData = { ...originalData };
        if (excludeFields) {
          const fieldsToExclude = excludeFields.split(',').map((f: string) => f.trim());
          for (const field of fieldsToExclude) {
            delete baseData[field];
          }
        }
        break;

      default:
        this.logger.log(`Default case: baseData will be empty`);
        baseData = {};
    }

    // Merge new data on top of base data
    const merged = { ...baseData, ...newData };
    this.logger.log(`Merged data keys: ${Object.keys(merged).join(', ')}`);
    return merged;
  }
}
