import { Injectable, Logger } from '@nestjs/common';
import {
  ExecutableTool,
  ToolDefinition,
  OpenAITool,
  ToolCall,
  ToolResult,
  ToolContext,
  AgentError,
  AgentErrorType,
} from '../types/tool.interface';

/**
 * Tool Registry Service
 *
 * Central registry for all tools available to AI Agents.
 * Handles tool registration, lookup, and formatting for different LLM providers.
 */
@Injectable()
export class ToolRegistryService {
  private readonly logger = new Logger(ToolRegistryService.name);

  /** Map of tool name to tool definition */
  private tools: Map<string, ExecutableTool> = new Map();

  constructor() {
    this.logger.log('Tool Registry Service initialized');
  }

  /**
   * Register a tool with the registry
   */
  registerTool(tool: ExecutableTool): void {
    if (this.tools.has(tool.name)) {
      this.logger.warn(`Tool "${tool.name}" is already registered. Overwriting.`);
    }

    this.tools.set(tool.name, tool);
    this.logger.log(`Registered tool: ${tool.name}`);
  }

  /**
   * Register multiple tools at once
   */
  registerTools(tools: ExecutableTool[]): void {
    for (const tool of tools) {
      this.registerTool(tool);
    }
  }

  /**
   * Unregister a tool from the registry
   */
  unregisterTool(name: string): boolean {
    const deleted = this.tools.delete(name);
    if (deleted) {
      this.logger.log(`Unregistered tool: ${name}`);
    }
    return deleted;
  }

  /**
   * Get a tool by name
   */
  getTool(name: string): ExecutableTool | undefined {
    return this.tools.get(name);
  }

  /**
   * Check if a tool exists
   */
  hasTool(name: string): boolean {
    return this.tools.has(name);
  }

  /**
   * Get all registered tools
   */
  getAllTools(): ExecutableTool[] {
    return Array.from(this.tools.values());
  }

  /**
   * Get tools by category
   */
  getToolsByCategory(category: string): ExecutableTool[] {
    return this.getAllTools().filter((tool) => tool.category === category);
  }

  /**
   * Get tool definitions (without execute function)
   */
  getToolDefinitions(): ToolDefinition[] {
    return this.getAllTools().map((tool) => ({
      name: tool.name,
      description: tool.description,
      parameters: tool.parameters,
      category: tool.category,
      requiresCredentials: tool.requiresCredentials,
      connectorType: tool.connectorType,
    }));
  }

  /**
   * Format tools for OpenAI function calling API
   */
  formatForOpenAI(tools?: ExecutableTool[]): OpenAITool[] {
    const toolsToFormat = tools || this.getAllTools();

    return toolsToFormat.map((tool) => ({
      type: 'function' as const,
      function: {
        name: tool.name,
        description: tool.description,
        parameters: tool.parameters,
      },
    }));
  }

  /**
   * Format a single tool for OpenAI
   */
  formatToolForOpenAI(tool: ExecutableTool): OpenAITool {
    return {
      type: 'function',
      function: {
        name: tool.name,
        description: tool.description,
        parameters: tool.parameters,
      },
    };
  }

  /**
   * Execute a tool by name
   */
  async executeTool(
    toolCall: ToolCall,
    context: ToolContext,
  ): Promise<ToolResult> {
    const startTime = Date.now();

    const tool = this.tools.get(toolCall.name);

    if (!tool) {
      this.logger.error(`Tool not found: ${toolCall.name}`);
      return {
        success: false,
        error: `Tool "${toolCall.name}" not found in registry`,
        errorCode: AgentErrorType.TOOL_NOT_FOUND,
        durationMs: Date.now() - startTime,
      };
    }

    try {
      this.logger.log(`Executing tool: ${toolCall.name}`);
      this.logger.debug(`Tool arguments: ${JSON.stringify(toolCall.arguments)}`);

      const result = await tool.execute(toolCall.arguments, context);

      this.logger.log(
        `Tool ${toolCall.name} completed in ${Date.now() - startTime}ms`,
      );

      return {
        ...result,
        durationMs: Date.now() - startTime,
      };
    } catch (error: any) {
      this.logger.error(`Tool ${toolCall.name} failed: ${error.message}`);

      return {
        success: false,
        error: error.message,
        errorCode: AgentErrorType.TOOL_EXECUTION_FAILED,
        durationMs: Date.now() - startTime,
      };
    }
  }

  /**
   * Parse tool call arguments from OpenAI response
   */
  parseToolCallArguments(rawArguments: string): Record<string, any> {
    try {
      return JSON.parse(rawArguments);
    } catch (error) {
      this.logger.error(`Failed to parse tool arguments: ${rawArguments}`);
      throw new AgentError(
        AgentErrorType.INVALID_TOOL_CALL,
        `Failed to parse tool arguments: ${error.message}`,
        { rawArguments },
      );
    }
  }

  /**
   * Validate tool call against tool definition
   */
  validateToolCall(toolCall: ToolCall): { valid: boolean; errors: string[] } {
    const tool = this.tools.get(toolCall.name);
    const errors: string[] = [];

    if (!tool) {
      return { valid: false, errors: [`Tool "${toolCall.name}" not found`] };
    }

    // Check required parameters
    const requiredParams = tool.parameters.required || [];
    for (const param of requiredParams) {
      if (
        toolCall.arguments[param] === undefined ||
        toolCall.arguments[param] === null
      ) {
        errors.push(`Missing required parameter: ${param}`);
      }
    }

    // Check parameter types
    for (const [key, value] of Object.entries(toolCall.arguments)) {
      const schema = tool.parameters.properties[key];
      if (!schema) {
        if (!tool.parameters.additionalProperties) {
          errors.push(`Unknown parameter: ${key}`);
        }
        continue;
      }

      const actualType = Array.isArray(value) ? 'array' : typeof value;
      if (schema.type !== actualType && value !== null) {
        errors.push(
          `Parameter "${key}" should be ${schema.type} but got ${actualType}`,
        );
      }
    }

    return { valid: errors.length === 0, errors };
  }

  /**
   * Get registry stats
   */
  getStats(): {
    totalTools: number;
    toolsByCategory: Record<string, number>;
  } {
    const toolsByCategory: Record<string, number> = {};

    for (const tool of this.tools.values()) {
      const category = tool.category || 'uncategorized';
      toolsByCategory[category] = (toolsByCategory[category] || 0) + 1;
    }

    return {
      totalTools: this.tools.size,
      toolsByCategory,
    };
  }

  /**
   * Clear all registered tools
   */
  clear(): void {
    this.tools.clear();
    this.logger.log('Tool registry cleared');
  }
}
