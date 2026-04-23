import { Logger } from '@nestjs/common';
import {
  INodeExecutor,
  NodeData,
  NodeInputItem,
  NodeExecutionContext,
  NodeExecutionResult,
} from './node-executor.interface';

/**
 * Abstract base class for node executors
 * Provides common utilities used by most node types
 */
export abstract class BaseNodeExecutor implements INodeExecutor {
  protected readonly logger: Logger;
  abstract readonly supportedTypes: string[];

  constructor(loggerName?: string) {
    this.logger = new Logger(loggerName || this.constructor.name);
  }

  /**
   * Template method for execution - subclasses implement executeInternal
   */
  async execute(
    node: NodeData,
    inputData: NodeInputItem[],
    context: NodeExecutionContext,
  ): Promise<NodeExecutionResult> {
    const nodeName = node.data?.label || node.id;
    this.logger.log(`Executing node: ${nodeName} (${node.type})`);

    try {
      return await this.executeInternal(node, inputData, context);
    } catch (error) {
      this.logger.error(`Failed to execute node ${nodeName}: ${error.message}`);
      throw this.wrapError(error, nodeName);
    }
  }

  /**
   * Internal execution logic - must be implemented by subclasses
   */
  protected abstract executeInternal(
    node: NodeData,
    inputData: NodeInputItem[],
    context: NodeExecutionContext,
  ): Promise<NodeExecutionResult>;

  /**
   * Default validation - subclasses can override
   */
  validate(node: NodeData): string[] {
    return [];
  }

  // ============ Expression Resolution Utilities ============

  /**
   * Resolve {{expression}} patterns in strings
   */
  protected resolveExpression(expression: any, context: NodeExecutionContext): any {
    if (typeof expression !== 'string') {
      return expression;
    }

    const regex = /\{\{([^}]+)\}\}/g;

    // If entire string is one expression, return resolved value directly
    const singleMatch = expression.match(/^\{\{([^}]+)\}\}$/);
    if (singleMatch) {
      return this.resolveExpressionPath(singleMatch[1].trim(), context);
    }

    // Replace all expressions in string
    return expression.replace(regex, (match, path) => {
      const value = this.resolveExpressionPath(path.trim(), context);
      return value !== undefined ? String(value) : match;
    });
  }

  /**
   * Resolve expression path like $json.field or $node["Name"].json.field
   */
  protected resolveExpressionPath(path: string, context: NodeExecutionContext): any {
    // Handle $json.field.nested
    if (path.startsWith('$json.')) {
      return this.getNestedValue(context.$json, path.substring(6));
    }

    // Handle $node["NodeName"].json.field
    if (path.startsWith('$node[')) {
      const match = path.match(/\$node\[["']([^"']+)["']\]\.json\.(.+)/);
      if (match) {
        const [, nodeName, fieldPath] = match;
        const nodeResult = this.findNodeResult(nodeName, context);

        if (nodeResult?.data?.[0]?.[0]?.json) {
          return this.getNestedValue(nodeResult.data[0][0].json, fieldPath);
        }
        return undefined;
      }
    }

    // Handle $workflow.variables.name
    if (path.startsWith('$workflow.')) {
      return this.getNestedValue(context.$workflow, path.substring(10));
    }

    // Handle $env.VARIABLE_NAME
    if (path.startsWith('$env.')) {
      const varName = path.substring(5);
      return context.$env?.[varName] || process.env[varName];
    }

    // Handle secrets.NAME - resolved by SecretsService at the engine level
    // This returns a placeholder; actual resolution happens in WorkflowExecutionEngine
    if (path.startsWith('secrets.')) {
      return `{{${path}}}`;
    }

    // Fallback: return as literal
    return path;
  }

  /**
   * Resolve all expressions in an object recursively
   */
  protected resolveObjectExpressions(obj: any, context: NodeExecutionContext): any {
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
   * Get nested value from object using dot notation
   */
  protected getNestedValue(obj: any, path: string): any {
    if (!obj || !path) return undefined;

    const keys = path.split('.');
    let current = obj;

    for (const key of keys) {
      if (current === null || current === undefined) {
        return undefined;
      }

      // Handle array bracket notation: field[0]
      const arrayMatch = key.match(/^([^\[]+)\[(\d+)\]$/);
      if (arrayMatch) {
        current = current[arrayMatch[1]]?.[parseInt(arrayMatch[2], 10)];
      } else {
        current = current[key];
      }
    }

    return current;
  }

  /**
   * Find node result by name in context
   */
  protected findNodeResult(nodeName: string, context: NodeExecutionContext): any {
    // Direct lookup by ID
    if (context.$node?.[nodeName]) {
      return context.$node[nodeName];
    }

    // Search by label in metadata
    const metadata = context.$workflow?.nodeMetadata || {};
    for (const [nodeId, meta] of Object.entries(metadata)) {
      if ((meta as any)?.label === nodeName || (meta as any)?.name === nodeName) {
        return context.$node?.[nodeId];
      }
    }

    // Fallback: prefix match (e.g., "Run Code" -> "RUN_CODE_*")
    const normalized = nodeName.toUpperCase().replace(/\s+/g, '_');
    for (const key of Object.keys(context.$node || {})) {
      if (key.startsWith(normalized + '_') || key === normalized) {
        return context.$node[key];
      }
    }

    return null;
  }

  // ============ Context Utilities ============

  /**
   * Build item context for iteration
   */
  protected buildItemContext(
    item: NodeInputItem,
    context: NodeExecutionContext,
  ): NodeExecutionContext {
    return {
      ...context,
      $json: item.json || item,
    };
  }

  /**
   * Wrap input data to ensure it has json property
   */
  protected normalizeInputItem(item: any): NodeInputItem {
    if (item && typeof item === 'object' && 'json' in item) {
      return item;
    }
    return { json: item };
  }

  /**
   * Normalize array of input items
   */
  protected normalizeInputData(inputData: any[]): NodeInputItem[] {
    return inputData.map(item => this.normalizeInputItem(item));
  }

  // ============ Error Handling ============

  /**
   * Wrap error with node context
   */
  protected wrapError(error: any, nodeName: string): Error {
    const wrapped = new Error(
      `Node "${nodeName}" execution failed: ${error.message}`
    );
    wrapped.name = `${this.constructor.name}Error`;
    (wrapped as any).originalError = error;
    return wrapped;
  }

  /**
   * Create a user-friendly configuration error
   */
  protected configurationError(nodeName: string, missingField: string): Error {
    return new Error(
      `Node "${nodeName}" is not configured properly. Missing: ${missingField}. ` +
      `Please double-click the node to configure it.`
    );
  }
}
