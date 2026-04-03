/**
 * Node Executor Interface
 * Defines the contract that all node executors must implement
 */

/**
 * Node execution context - passed to all executors
 * Flexible to allow for various context shapes from different callers
 */
export interface NodeExecutionContext {
  $json?: any;
  $node?: Record<string, any>;
  $workflow?: Record<string, any> | {
    id: string;
    executionId?: string;
    userId?: string;
    nodeMetadata?: Record<string, any>;
    variables?: Record<string, any>;
  };
  $env?: Record<string, any>;
  [key: string]: any; // Allow additional properties
}

/**
 * Node execution input item format
 */
export interface NodeInputItem {
  json: any;
  binary?: Record<string, any>;
}

/**
 * Node data structure passed from frontend/workflow engine
 */
export interface NodeData {
  id: string;
  type: string;
  data?: Record<string, any>;
}

/**
 * Result of node execution
 */
export type NodeExecutionResult = NodeInputItem[];

/**
 * Interface that all node executors must implement
 */
export interface INodeExecutor {
  /**
   * Node types this executor handles
   */
  readonly supportedTypes: string[];

  /**
   * Execute the node with given inputs
   */
  execute(
    node: NodeData,
    inputData: NodeInputItem[],
    context: NodeExecutionContext,
  ): Promise<NodeExecutionResult>;

  /**
   * Validate node configuration before execution
   * Returns array of validation errors (empty if valid)
   */
  validate?(node: NodeData): string[];
}

/**
 * Metadata about a registered executor
 */
export interface NodeExecutorMetadata {
  executor: INodeExecutor;
  category: NodeCategory;
  description?: string;
  version?: string;
  registeredAt: Date;
}

/**
 * Node categories for organization
 */
export enum NodeCategory {
  TRIGGER = 'trigger',
  ACTION = 'action',
  CONTROL_FLOW = 'control-flow',
  AI = 'ai',
  TOOL = 'tool',
  CONNECTOR = 'connector',
  SPECIALIZED = 'specialized',
}

/**
 * Registration options for node executors
 */
export interface NodeExecutorRegistration {
  category: NodeCategory;
  description?: string;
  version?: string;
}
