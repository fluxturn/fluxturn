import { Injectable, Logger, Optional, Inject, forwardRef } from '@nestjs/common';
import {
  ExecutableTool,
  ToolContext,
  ToolResult,
  JSONSchema,
} from '../types/tool.interface';
import { ConnectorsService } from '../../connectors/connectors.service';
import { ToolGenerationOptions } from '../../connectors/types';
import { ToolRegistryService } from './tool-registry.service';

/**
 * Tool Provider Node Output
 * This is what tool provider nodes return to AI Agent
 */
export interface ToolProviderOutput {
  /** Indicates this is a tool provider output, not execution result */
  isToolProvider: true;

  /** Tool definitions that AI Agent can use */
  toolDefinitions: ExecutableTool[];

  /** Connector type (e.g., 'gmail', 'slack') */
  connectorType: string;

  /** Credential ID for executing the tools */
  credentialId: string;

  /** Decrypted credentials (for tool execution) */
  credentials?: Record<string, any>;

  /** Context parameters that were pre-filled (for reference) */
  contextParams?: Record<string, Record<string, any>>;
}

/**
 * Connector Tool Provider Service
 *
 * Generates ExecutableTool definitions from connector supported_actions.
 * This allows AI Agents to use any connector action as a tool.
 */
@Injectable()
export class ConnectorToolProviderService {
  private readonly logger = new Logger(ConnectorToolProviderService.name);

  /** Track which credential IDs have been registered */
  private registeredCredentials: Set<string> = new Set();

  constructor(
    @Inject(forwardRef(() => ConnectorsService))
    private readonly connectorsService: ConnectorsService,
    @Optional() private readonly toolRegistry?: ToolRegistryService,
  ) {}

  /**
   * Generate tools from a connector's supported actions
   *
   * @param connectorType - The connector type (e.g., 'gmail', 'slack', 'telegram')
   * @param credentialId - The credential ID for authentication
   * @param options - Optional configuration for tool generation
   *   - actionFilter: List of action IDs to include (if empty, include all)
   *   - contextParams: Pre-filled parameters per action (for non-AI-controlled fields)
   *   - filterAIControlled: Whether to only expose AI-controlled fields (default: true)
   */
  async generateToolsFromConnector(
    connectorType: string,
    credentialId: string,
    options?: ToolGenerationOptions | string[],
  ): Promise<ToolProviderOutput> {
    this.logger.log(`Generating tools for connector: ${connectorType}`);

    // Handle legacy API (string array for actionFilter)
    const normalizedOptions: ToolGenerationOptions = Array.isArray(options)
      ? { actionFilter: options }
      : options || {};

    const { actionFilter, contextParams, filterAIControlled = true } = normalizedOptions;

    // Get connector actions from database using existing method
    const supportedActions = await this.connectorsService.getConnectorActions(connectorType);

    if (!supportedActions || supportedActions.length === 0) {
      throw new Error(`Connector not found or has no actions: ${connectorType}`);
    }

    // Get credentials
    let credentials: Record<string, any> | undefined;
    try {
      credentials = await this.connectorsService.getConnectorCredentials(credentialId);
    } catch (error: any) {
      this.logger.warn(`Could not fetch credentials: ${error.message}`);
    }

    // Filter actions if specified
    const actionsToConvert = actionFilter?.length
      ? supportedActions.filter((a: any) => actionFilter.includes(a.id))
      : supportedActions;

    // Convert each action to an ExecutableTool
    const toolDefinitions: ExecutableTool[] = actionsToConvert.map((action: any) => {
      const actionContextParams = contextParams?.[action.id] || {};
      return this.convertActionToTool(
        action,
        connectorType,
        credentialId,
        credentials,
        actionContextParams,
        filterAIControlled,
      );
    });

    this.logger.log(`Generated ${toolDefinitions.length} tools from ${connectorType}`);

    return {
      isToolProvider: true,
      toolDefinitions,
      connectorType,
      credentialId,
      credentials,
      contextParams,
    };
  }

  /**
   * Convert a connector action to an ExecutableTool
   *
   * @param action - The action definition
   * @param connectorType - Connector type (e.g., 'telegram')
   * @param credentialId - Credential ID for auth
   * @param credentials - Decrypted credentials
   * @param contextParams - Pre-filled parameters for non-AI fields
   * @param filterAIControlled - If true, only expose aiControlled fields to AI
   */
  private convertActionToTool(
    action: any,
    connectorType: string,
    credentialId: string,
    credentials?: Record<string, any>,
    contextParams?: Record<string, any>,
    filterAIControlled: boolean = true,
  ): ExecutableTool {
    // Build tool name from connector and action
    const toolName = `${connectorType}_${action.id}`;

    // Convert inputSchema to JSON Schema format
    // If filterAIControlled, only include fields where aiControlled === true
    const parameters = filterAIControlled
      ? this.convertAIControlledSchemaToJsonSchema(action.inputSchema || {}, contextParams)
      : this.convertInputSchemaToJsonSchema(action.inputSchema || {});

    // Generate description including info about pre-filled context
    const description = this.generateToolDescription(action, connectorType, contextParams);

    // Create the executable tool
    const tool: ExecutableTool = {
      name: toolName,
      description,
      category: connectorType,
      requiresCredentials: true,
      connectorType,
      parameters,
      execute: this.createToolExecutor(action, connectorType, credentialId, credentials, contextParams),
    };

    return tool;
  }

  /**
   * Generate a description for the tool that includes context about pre-filled params
   */
  private generateToolDescription(
    action: any,
    connectorType: string,
    contextParams?: Record<string, any>,
  ): string {
    let description = action.description || `${action.name} via ${connectorType}`;

    // Add info about pre-filled context params
    if (contextParams && Object.keys(contextParams).length > 0) {
      const prefilledFields = Object.keys(contextParams).join(', ');
      description += ` (Pre-configured: ${prefilledFields})`;
    }

    return description;
  }

  /**
   * Convert connector inputSchema format to JSON Schema (all fields)
   */
  private convertInputSchemaToJsonSchema(inputSchema: Record<string, any>): JSONSchema {
    const properties: Record<string, any> = {};
    const required: string[] = [];

    for (const [key, field] of Object.entries(inputSchema)) {
      const fieldDef = field as any;

      // Map connector field types to JSON Schema types
      let jsonType = this.mapFieldTypeToJsonSchema(fieldDef.type);

      properties[key] = {
        type: jsonType,
        description: fieldDef.description || fieldDef.label || key,
      };

      // Add enum for select fields
      if (fieldDef.options && Array.isArray(fieldDef.options)) {
        properties[key].enum = fieldDef.options.map((opt: any) =>
          typeof opt === 'object' ? opt.value : opt
        );
      }

      // Add default value
      if (fieldDef.default !== undefined) {
        properties[key].default = fieldDef.default;
      }

      // Track required fields
      if (fieldDef.required) {
        required.push(key);
      }
    }

    return {
      type: 'object',
      properties,
      required: required.length > 0 ? required : undefined,
    };
  }

  /**
   * Convert only AI-controlled fields to JSON Schema
   * Non-AI fields are expected to come from context params
   */
  private convertAIControlledSchemaToJsonSchema(
    inputSchema: Record<string, any>,
    contextParams?: Record<string, any>,
  ): JSONSchema {
    const properties: Record<string, any> = {};
    const required: string[] = [];

    for (const [key, field] of Object.entries(inputSchema)) {
      const fieldDef = field as any;

      // Only include fields marked as AI-controlled
      // If aiControlled is not defined, check if it's in contextParams (then it's not AI-controlled)
      const isAIControlled = fieldDef.aiControlled === true ||
        (fieldDef.aiControlled === undefined && !contextParams?.[key]);

      if (!isAIControlled) {
        continue; // Skip non-AI-controlled fields
      }

      // Map connector field types to JSON Schema types
      const jsonType = this.mapFieldTypeToJsonSchema(fieldDef.type);

      // Use AI-specific description if available
      const description = fieldDef.aiDescription || fieldDef.description || fieldDef.label || key;

      properties[key] = {
        type: jsonType,
        description,
      };

      // Add enum for select fields
      if (fieldDef.options && Array.isArray(fieldDef.options)) {
        properties[key].enum = fieldDef.options.map((opt: any) =>
          typeof opt === 'object' ? opt.value : opt
        );
      }

      // Add AI default value if available
      if (fieldDef.aiDefault !== undefined) {
        properties[key].default = fieldDef.aiDefault;
      } else if (fieldDef.default !== undefined) {
        properties[key].default = fieldDef.default;
      }

      // Track required fields (only if not already provided by context)
      if (fieldDef.required && !contextParams?.[key]) {
        required.push(key);
      }
    }

    return {
      type: 'object',
      properties,
      required: required.length > 0 ? required : undefined,
    };
  }

  /**
   * Map connector field types to JSON Schema types
   */
  private mapFieldTypeToJsonSchema(type: string): string {
    switch (type) {
      case 'select':
      case 'textarea':
      case 'text':
      case 'email':
      case 'url':
      case 'password':
        return 'string';
      case 'number':
      case 'integer':
        return 'number';
      case 'boolean':
        return 'boolean';
      case 'array':
        return 'array';
      case 'object':
        return 'object';
      default:
        return 'string';
    }
  }

  /**
   * Create an executor function for the tool
   *
   * @param action - Action definition
   * @param connectorType - Connector type
   * @param credentialId - Credential ID
   * @param credentials - Decrypted credentials
   * @param contextParams - Pre-filled parameters to merge with AI params
   */
  private createToolExecutor(
    action: any,
    connectorType: string,
    credentialId: string,
    credentials?: Record<string, any>,
    contextParams?: Record<string, any>,
  ): (params: Record<string, any>, context: ToolContext) => Promise<ToolResult> {
    const logger = this.logger;
    const connectorsService = this.connectorsService;

    return async (aiParams: Record<string, any>, context: ToolContext): Promise<ToolResult> => {
      const startTime = Date.now();

      try {
        // Merge context params with AI params
        // AI params take precedence if there's a conflict
        const mergedParams = {
          ...contextParams,   // Pre-filled from workflow context
          ...aiParams,        // AI-generated params
        };

        logger.log(`Executing tool: ${connectorType}_${action.id}`);
        logger.debug(`Context params: ${JSON.stringify(contextParams || {})}`);
        logger.debug(`AI params: ${JSON.stringify(aiParams)}`);
        logger.debug(`Merged params: ${JSON.stringify(mergedParams)}`);

        // Execute the action via connector service
        // credentialId is actually the connector_config ID
        const actionDto = {
          action: action.id,
          parameters: mergedParams,
        };

        // Create a minimal auth context for the execution
        // Using 'jwt' type since this is running on behalf of a user
        const authContext = {
          type: 'jwt' as const,
          userId: context.userId,
          organizationId: undefined,
        };

        const result = await connectorsService.executeConnectorAction(
          credentialId, // This is the connector_config ID
          actionDto,
          authContext,
        );

        logger.log(`Tool ${connectorType}_${action.id} completed in ${Date.now() - startTime}ms`);

        return {
          success: result.success,
          data: result.data,
          error: result.success ? undefined : (result as any).error?.message || 'Action failed',
          durationMs: Date.now() - startTime,
        };
      } catch (error: any) {
        logger.error(`Tool ${connectorType}_${action.id} failed: ${error.message}`);

        return {
          success: false,
          error: error.message,
          durationMs: Date.now() - startTime,
        };
      }
    };
  }

  /**
   * Generate a single tool for a specific connector action
   */
  async generateToolForAction(
    connectorType: string,
    actionId: string,
    credentialId: string,
  ): Promise<ExecutableTool | null> {
    const supportedActions = await this.connectorsService.getConnectorActions(connectorType);

    if (!supportedActions || supportedActions.length === 0) {
      this.logger.error(`Connector not found or has no actions: ${connectorType}`);
      return null;
    }

    const action = supportedActions.find((a: any) => a.id === actionId);

    if (!action) {
      this.logger.error(`Action ${actionId} not found in connector ${connectorType}`);
      return null;
    }

    let credentials: Record<string, any> | undefined;
    try {
      credentials = await this.connectorsService.getConnectorCredentials(credentialId);
    } catch (error: any) {
      this.logger.warn(`Could not fetch credentials: ${error.message}`);
    }

    return this.convertActionToTool(action, connectorType, credentialId, credentials);
  }

  /**
   * Get available tools for a connector (just definitions, no credentials)
   */
  async getAvailableTools(connectorType: string): Promise<Array<{
    id: string;
    name: string;
    description: string;
  }>> {
    const supportedActions = await this.connectorsService.getConnectorActions(connectorType);

    if (!supportedActions || supportedActions.length === 0) {
      return [];
    }

    return supportedActions.map((action: any) => ({
      id: action.id,
      name: action.name,
      description: action.description,
    }));
  }

  // ===== Tool Registration Methods =====

  /**
   * Register tools for a connector credential in the global tool registry
   * Call this when a user saves connector credentials to pre-register tools
   *
   * @param connectorType - The connector type (e.g., 'telegram', 'gmail')
   * @param credentialId - The saved credential ID
   * @returns The registered tools
   */
  async registerToolsForCredential(
    connectorType: string,
    credentialId: string,
  ): Promise<ExecutableTool[]> {
    if (!this.toolRegistry) {
      this.logger.warn('Tool registry not available, skipping tool registration');
      return [];
    }

    // Check if already registered
    const registrationKey = `${connectorType}:${credentialId}`;
    if (this.registeredCredentials.has(registrationKey)) {
      this.logger.log(`Tools already registered for ${registrationKey}`);
      return [];
    }

    this.logger.log(`Registering tools for credential: ${registrationKey}`);

    try {
      // Generate tools without AI filtering (all params available)
      const output = await this.generateToolsFromConnector(
        connectorType,
        credentialId,
        { filterAIControlled: false },
      );

      // Register tools in the registry
      this.toolRegistry.registerTools(output.toolDefinitions);
      this.registeredCredentials.add(registrationKey);

      this.logger.log(`Registered ${output.toolDefinitions.length} tools for ${connectorType}`);

      return output.toolDefinitions;
    } catch (error: any) {
      this.logger.error(`Failed to register tools for ${connectorType}: ${error.message}`);
      return [];
    }
  }

  /**
   * Unregister tools for a connector credential
   * Call this when credentials are deleted
   */
  async unregisterToolsForCredential(
    connectorType: string,
    credentialId: string,
  ): Promise<void> {
    if (!this.toolRegistry) {
      return;
    }

    const registrationKey = `${connectorType}:${credentialId}`;

    try {
      // Get the tool names that were registered
      const supportedActions = await this.connectorsService.getConnectorActions(connectorType);

      if (supportedActions) {
        for (const action of supportedActions) {
          const toolName = `${connectorType}_${action.id}`;
          this.toolRegistry.unregisterTool(toolName);
        }
      }

      this.registeredCredentials.delete(registrationKey);
      this.logger.log(`Unregistered tools for ${registrationKey}`);
    } catch (error: any) {
      this.logger.error(`Failed to unregister tools for ${connectorType}: ${error.message}`);
    }
  }

  /**
   * Check if tools are registered for a credential
   */
  isRegistered(connectorType: string, credentialId: string): boolean {
    return this.registeredCredentials.has(`${connectorType}:${credentialId}`);
  }

  /**
   * Get all registered credential keys
   */
  getRegisteredCredentials(): string[] {
    return Array.from(this.registeredCredentials);
  }

  /**
   * Clear all registered tools
   */
  clearAllRegistrations(): void {
    this.registeredCredentials.clear();
    this.logger.log('Cleared all tool registrations');
  }
}
