import { Injectable, Logger, Optional } from '@nestjs/common';
import { ConnectorsService } from '../../connectors/connectors.service';
import { GmailToolService } from '../../connectors/communication/gmail';
import { ToolProviderOutput } from './connector-tool-provider.service';
import {
  ExecutableTool,
  ToolContext,
} from '../types/tool.interface';

// Tool getter imports
import { getGmailTools } from '../tools/gmail.tool';
import { getSlackTools } from '../tools/slack.tool';
import { getTelegramTools } from '../tools/telegram.tool';
import { getDiscordTools } from '../tools/discord.tool';
import { getTeamsTools } from '../tools/teams.tool';

/**
 * Expression resolver function type
 * Used to resolve {{expression}} patterns in tool configurations
 */
export type ExpressionResolver = (expression: any, context: any) => any;

/**
 * Tool Executor Service
 * Handles execution of tool nodes (Gmail, Slack, Telegram, Discord, Teams, etc.)
 * Extracted from NodeExecutorService to keep that file focused on orchestration
 */
@Injectable()
export class ToolExecutorService {
  private readonly logger = new Logger(ToolExecutorService.name);

  constructor(
    @Optional() private readonly connectorsService?: ConnectorsService,
    @Optional() private readonly gmailToolService?: GmailToolService,
  ) {}

  /**
   * TOOL: Gmail Tool
   * Provides Gmail operations for AI Agents (send email, get labels, etc.)
   * Supports two modes:
   * - 'execute': Execute the Gmail operation immediately (default)
   * - 'provider': Return tool definitions for AI Agent to call autonomously
   */
  async executeGmailTool(
    node: any,
    inputData: any[],
    context: any,
    resolveExpression?: ExpressionResolver
  ): Promise<any[]> {
    const config = node.data || {};

    this.logger.log('Executing Gmail Tool node');

    const mode = config.mode || 'execute';
    const credentialId = config.credentialId;

    this.logger.log(`Gmail Tool mode: ${mode}, credentialId: ${credentialId}`);

    if (!credentialId) {
      throw new Error('Gmail Tool requires a Gmail credential to be selected. Please configure the node.');
    }

    // PROVIDER MODE: Return tool definitions for AI Agent
    if (mode === 'provider') {
      this.logger.log('Gmail Tool running in PROVIDER mode - returning tool definitions');

      let credentials: Record<string, any> | undefined;
      try {
        if (this.connectorsService) {
          credentials = await this.connectorsService.getConnectorCredentials(credentialId);
        }
      } catch (error: any) {
        this.logger.warn(`Could not fetch Gmail credentials: ${error.message}`);
      }

      const gmailTools = getGmailTools();

      const toolDefinitions: ExecutableTool[] = gmailTools.map(tool => ({
        ...tool,
        execute: async (params, ctx) => {
          const enrichedContext: ToolContext = {
            ...ctx,
            credentials: credentials,
            credentialId: credentialId,
          };
          return tool.execute(params, enrichedContext);
        }
      }));

      const output: ToolProviderOutput = {
        isToolProvider: true,
        toolDefinitions,
        connectorType: 'gmail',
        credentialId,
        credentials,
      };

      return [{ json: output }];
    }

    // EXECUTE MODE: Execute Gmail operation immediately
    if (!this.gmailToolService) {
      throw new Error('Gmail Tool service not available');
    }

    const operation = config.operation || 'sendEmail';
    this.logger.log(`Gmail Tool executing operation: ${operation}`);

    let params: any = {};

    if (operation === 'sendEmail') {
      const to = config.to || '';
      const subject = config.subject || '';
      const message = config.message || '';
      const emailType = config.emailType || 'html';
      const cc = config.cc || '';
      const bcc = config.bcc || '';

      const expressionContext = {
        ...context,
        $json: inputData[0]?.json || inputData[0] || {}
      };

      // Use resolver if provided, otherwise use raw values
      const resolve = resolveExpression || ((expr: any) => expr);

      params = {
        to: resolve(to, expressionContext),
        subject: resolve(subject, expressionContext),
        message: resolve(message, expressionContext),
        emailType,
        cc: cc ? resolve(cc, expressionContext) : '',
        bcc: bcc ? resolve(bcc, expressionContext) : '',
      };

      if (!params.to || !params.subject || !params.message) {
        throw new Error('Gmail Tool (Send Email) requires To, Subject, and Message fields to be filled');
      }
    }

    try {
      const result = await this.gmailToolService.execute(operation, params, credentialId);
      this.logger.log(`Gmail Tool executed successfully: ${operation}`);
      return [{ json: result }];
    } catch (error: any) {
      this.logger.error(`Gmail Tool execution failed:`, error.message);
      throw new Error(`Gmail Tool execution failed: ${error.message}`);
    }
  }

  /**
   * TOOL: Slack Tool
   * Provides Slack messaging capabilities for AI Agents
   */
  async executeSlackTool(node: any, inputData: any[], context: any): Promise<any[]> {
    const config = node.data || {};

    this.logger.log('Executing Slack Tool node');

    const mode = config.mode || 'execute';
    const credentialId = config.credentialId;

    this.logger.log(`Slack Tool mode: ${mode}, credentialId: ${credentialId}`);

    if (!credentialId) {
      throw new Error('Slack Tool requires a Slack credential to be selected. Please configure the node.');
    }

    // PROVIDER MODE: Return tool definitions for AI Agent
    if (mode === 'provider') {
      this.logger.log('Slack Tool running in PROVIDER mode - returning tool definitions');

      let credentials: Record<string, any> | undefined;
      try {
        if (this.connectorsService) {
          credentials = await this.connectorsService.getConnectorCredentials(credentialId);
        }
      } catch (error: any) {
        this.logger.warn(`Could not fetch Slack credentials: ${error.message}`);
      }

      const slackTools = getSlackTools();

      const toolDefinitions: ExecutableTool[] = slackTools.map(tool => ({
        ...tool,
        execute: async (params, ctx) => {
          const enrichedContext: ToolContext = {
            ...ctx,
            credentials: credentials,
            credentialId: credentialId,
          };
          return tool.execute(params, enrichedContext);
        }
      }));

      const output: ToolProviderOutput = {
        isToolProvider: true,
        toolDefinitions,
        connectorType: 'slack',
        credentialId,
        credentials,
      };

      return [{ json: output }];
    }

    // EXECUTE MODE: Execute Slack operation immediately
    throw new Error('Slack Tool execute mode not yet implemented. Please use provider mode with AI Agent.');
  }

  /**
   * TOOL: Telegram Tool
   * Provides Telegram messaging capabilities for AI Agents
   *
   * Supports context params for pre-filling non-AI-controlled fields:
   * - contextParams: { chatId: "{{$json.telegramEvent.chat.id}}" }
   */
  async executeTelegramTool(node: any, inputData: any[], context: any): Promise<any[]> {
    const config = node.data || {};

    this.logger.log('Executing Telegram Tool node');

    const mode = config.mode || 'execute';
    const credentialId = config.credentialId;
    const rawContextParams = config.contextParams || {}; // Pre-filled params

    this.logger.log(`Telegram Tool mode: ${mode}, credentialId: ${credentialId}`);

    if (!credentialId) {
      throw new Error('Telegram Tool requires a Telegram credential to be selected. Please configure the node.');
    }

    // PROVIDER MODE: Return tool definitions for AI Agent
    if (mode === 'provider') {
      this.logger.log('Telegram Tool running in PROVIDER mode - returning tool definitions');

      let credentials: Record<string, any> | undefined;
      try {
        if (this.connectorsService) {
          credentials = await this.connectorsService.getConnectorCredentials(credentialId);
        }
      } catch (error: any) {
        this.logger.warn(`Could not fetch Telegram credentials: ${error.message}`);
      }

      // Build expression context for resolving context params
      const expressionContext = {
        ...context,
        $json: inputData[0]?.json || inputData[0] || {},
      };

      // Resolve expressions in context params
      const resolvedContextParams: Record<string, any> = {};
      for (const [key, value] of Object.entries(rawContextParams)) {
        resolvedContextParams[key] = this.resolveExpression(value, expressionContext);
      }

      this.logger.log(`Telegram context params: ${JSON.stringify(resolvedContextParams)}`);

      const telegramTools = getTelegramTools();

      const toolDefinitions: ExecutableTool[] = telegramTools.map(tool => ({
        ...tool,
        // Filter parameters to only AI-controlled fields if context is provided
        parameters: this.filterAIControlledParams(tool.parameters, resolvedContextParams),
        // Update description to mention pre-filled fields
        description: this.enrichToolDescription(tool.description, resolvedContextParams),
        execute: async (aiParams, ctx) => {
          // Merge context params with AI params
          const mergedParams = { ...resolvedContextParams, ...aiParams };
          const enrichedContext: ToolContext = {
            ...ctx,
            credentials: credentials,
            credentialId: credentialId,
          };
          return tool.execute(mergedParams, enrichedContext);
        }
      }));

      const output: ToolProviderOutput = {
        isToolProvider: true,
        toolDefinitions,
        connectorType: 'telegram',
        credentialId,
        credentials,
        contextParams: { telegram: resolvedContextParams },
      };

      return [{ json: output }];
    }

    // EXECUTE MODE: Execute Telegram operation immediately
    throw new Error('Telegram Tool execute mode not yet implemented. Please use provider mode with AI Agent.');
  }

  /**
   * Filter tool parameters to only include AI-controlled fields
   * (removes fields that are in contextParams)
   */
  private filterAIControlledParams(
    parameters: any,
    contextParams?: Record<string, any>,
  ): any {
    if (!contextParams || Object.keys(contextParams).length === 0) {
      return parameters;
    }

    const filtered = { ...parameters };
    if (filtered.properties) {
      filtered.properties = { ...filtered.properties };
      for (const key of Object.keys(contextParams)) {
        delete filtered.properties[key];
      }
    }
    if (filtered.required) {
      filtered.required = filtered.required.filter(
        (r: string) => !contextParams[r]
      );
    }

    return filtered;
  }

  /**
   * Enrich tool description to mention pre-filled context fields
   */
  private enrichToolDescription(
    description: string,
    contextParams?: Record<string, any>,
  ): string {
    if (!contextParams || Object.keys(contextParams).length === 0) {
      return description;
    }
    const prefilledFields = Object.keys(contextParams).join(', ');
    return `${description} (Pre-configured: ${prefilledFields})`;
  }

  /**
   * Resolve expression from context (helper for tool executors)
   */
  private resolveExpression(value: any, context: any): any {
    if (typeof value !== 'string') return value;

    // Simple expression resolution for {{expression}} patterns
    const expressionRegex = /\{\{([^}]+)\}\}/g;
    let result = value;

    const matches = value.matchAll(expressionRegex);
    for (const match of matches) {
      const expression = match[1].trim();
      try {
        // Navigate the context using dot notation
        const resolved = this.resolveNestedPath(expression, context);
        if (resolved !== undefined) {
          result = result.replace(match[0], resolved);
        }
      } catch (e) {
        // Keep original if resolution fails
      }
    }

    return result;
  }

  /**
   * Resolve nested path like "$json.telegramEvent.chat.id"
   */
  private resolveNestedPath(path: string, obj: any): any {
    const parts = path.split('.');
    let current = obj;

    for (const part of parts) {
      if (current === undefined || current === null) return undefined;
      current = current[part];
    }

    return current;
  }

  /**
   * TOOL: Discord Tool
   * Provides Discord messaging capabilities for AI Agents
   */
  async executeDiscordTool(node: any, inputData: any[], context: any): Promise<any[]> {
    const config = node.data || {};

    this.logger.log('Executing Discord Tool node');

    const mode = config.mode || 'execute';
    const credentialId = config.credentialId;

    this.logger.log(`Discord Tool mode: ${mode}, credentialId: ${credentialId}`);

    if (!credentialId) {
      throw new Error('Discord Tool requires a Discord credential to be selected. Please configure the node.');
    }

    // PROVIDER MODE: Return tool definitions for AI Agent
    if (mode === 'provider') {
      this.logger.log('Discord Tool running in PROVIDER mode - returning tool definitions');

      let credentials: Record<string, any> | undefined;
      try {
        if (this.connectorsService) {
          credentials = await this.connectorsService.getConnectorCredentials(credentialId);
        }
      } catch (error: any) {
        this.logger.warn(`Could not fetch Discord credentials: ${error.message}`);
      }

      const discordTools = getDiscordTools();

      const toolDefinitions: ExecutableTool[] = discordTools.map(tool => ({
        ...tool,
        execute: async (params, ctx) => {
          const enrichedContext: ToolContext = {
            ...ctx,
            credentials: credentials,
            credentialId: credentialId,
          };
          return tool.execute(params, enrichedContext);
        }
      }));

      const output: ToolProviderOutput = {
        isToolProvider: true,
        toolDefinitions,
        connectorType: 'discord',
        credentialId,
        credentials,
      };

      return [{ json: output }];
    }

    // EXECUTE MODE: Execute Discord operation immediately
    throw new Error('Discord Tool execute mode not yet implemented. Please use provider mode with AI Agent.');
  }

  /**
   * TOOL: Teams Tool
   * Provides Microsoft Teams messaging capabilities for AI Agents
   */
  async executeTeamsTool(node: any, inputData: any[], context: any): Promise<any[]> {
    const config = node.data || {};

    this.logger.log('Executing Teams Tool node');

    const mode = config.mode || 'execute';
    const credentialId = config.credentialId;

    this.logger.log(`Teams Tool mode: ${mode}, credentialId: ${credentialId}`);

    if (!credentialId) {
      throw new Error('Teams Tool requires a Microsoft Teams credential to be selected. Please configure the node.');
    }

    // PROVIDER MODE: Return tool definitions for AI Agent
    if (mode === 'provider') {
      this.logger.log('Teams Tool running in PROVIDER mode - returning tool definitions');

      let credentials: Record<string, any> | undefined;
      try {
        if (this.connectorsService) {
          credentials = await this.connectorsService.getConnectorCredentials(credentialId);
        }
      } catch (error: any) {
        this.logger.warn(`Could not fetch Teams credentials: ${error.message}`);
      }

      const teamsTools = getTeamsTools();

      const toolDefinitions: ExecutableTool[] = teamsTools.map(tool => ({
        ...tool,
        execute: async (params, ctx) => {
          const enrichedContext: ToolContext = {
            ...ctx,
            credentials: credentials,
            credentialId: credentialId,
          };
          return tool.execute(params, enrichedContext);
        }
      }));

      const output: ToolProviderOutput = {
        isToolProvider: true,
        toolDefinitions,
        connectorType: 'teams',
        credentialId,
        credentials,
      };

      return [{ json: output }];
    }

    // EXECUTE MODE: Execute Teams operation immediately
    throw new Error('Teams Tool execute mode not yet implemented. Please use provider mode with AI Agent.');
  }
}
