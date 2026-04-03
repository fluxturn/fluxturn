/**
 * Tool Interface Definitions
 *
 * Defines the interfaces for tools that can be used by the AI Agent.
 * Tools allow the agent to take actions in the real world (send emails, make API calls, etc.)
 */

import { Logger } from '@nestjs/common';

/**
 * JSON Schema type for tool parameters
 */
export interface JSONSchemaProperty {
  type: 'string' | 'number' | 'boolean' | 'object' | 'array';
  description?: string;
  enum?: string[];
  items?: JSONSchemaProperty;
  properties?: Record<string, JSONSchemaProperty>;
  required?: string[];
  default?: any;
}

export interface JSONSchema {
  type: 'object';
  properties: Record<string, JSONSchemaProperty>;
  required?: string[];
  additionalProperties?: boolean;
}

/**
 * Tool definition - describes what a tool does and how to use it
 */
export interface ToolDefinition {
  /** Unique identifier for the tool */
  name: string;

  /** Human-readable description for the LLM */
  description: string;

  /** JSON Schema describing the tool's parameters */
  parameters: JSONSchema;

  /** Category for grouping tools */
  category?: string;

  /** Whether this tool requires credentials */
  requiresCredentials?: boolean;

  /** Connector type if this tool is backed by a connector */
  connectorType?: string;
}

/**
 * Tool call from the LLM
 */
export interface ToolCall {
  /** Unique ID for this tool call (from OpenAI) */
  id: string;

  /** Name of the tool to execute */
  name: string;

  /** Arguments parsed from the LLM response */
  arguments: Record<string, any>;

  /** Raw arguments string (before parsing) */
  rawArguments?: string;
}

/**
 * Result of executing a tool
 */
export interface ToolResult {
  /** Whether the tool executed successfully */
  success: boolean;

  /** Result data (if successful) */
  data?: any;

  /** Error message (if failed) */
  error?: string;

  /** Error code for categorization */
  errorCode?: string;

  /** Execution duration in milliseconds */
  durationMs?: number;
}

/**
 * Context provided to tool execution
 */
export interface ToolContext {
  /** Current workflow ID */
  workflowId: string;

  /** Current execution ID */
  executionId: string;

  /** User ID who owns the workflow */
  userId: string;

  /** Credentials for the tool (if required) */
  credentials?: Record<string, any>;

  /** Credential ID for fetching credentials */
  credentialId?: string;

  /** Logger instance */
  logger: Logger;

  /** Additional context data */
  metadata?: Record<string, any>;
}

/**
 * Executable tool - combines definition with execution logic
 */
export interface ExecutableTool extends ToolDefinition {
  /** Execute the tool with given parameters */
  execute: (params: Record<string, any>, context: ToolContext) => Promise<ToolResult>;

  /**
   * AI-controlled parameters schema (like n8n's $fromAI)
   * Only these parameters are exposed to the LLM for generation.
   * Other parameters come from workflow context.
   */
  aiParameters?: JSONSchema;

  /**
   * List of field names that should come from workflow context
   * These fields are NOT exposed to the AI and should be pre-filled
   * from the workflow/trigger data.
   */
  contextFields?: string[];
}

/**
 * OpenAI function/tool format
 */
export interface OpenAITool {
  type: 'function';
  function: {
    name: string;
    description: string;
    parameters: JSONSchema;
  };
}

/**
 * OpenAI tool call response format
 */
export interface OpenAIToolCall {
  id: string;
  type: 'function';
  function: {
    name: string;
    arguments: string; // JSON string
  };
}

/**
 * Agent configuration
 */
export interface AgentConfig {
  /** Type of agent reasoning */
  agentType: 'toolsAgent' | 'conversational' | 'react';

  /** System prompt for the agent */
  systemPrompt: string;

  /** User input message */
  input: string;

  /** Available tools */
  tools: ExecutableTool[];

  /** Memory instance (optional) */
  memory?: AgentMemory;

  /** Model configuration */
  modelConfig: ModelConfig;

  /** Maximum iterations for the agent loop */
  maxIterations: number;

  /** Whether to include intermediate steps in output */
  returnIntermediateSteps: boolean;

  /** Output format */
  outputFormat: 'text' | 'json';

  /** JSON schema for structured output (when outputFormat is 'json') */
  outputSchema?: JSONSchema;

  /** Execution context */
  context: ToolContext;
}

/**
 * Model configuration
 */
export interface ModelConfig {
  provider: 'openai' | 'anthropic' | 'google';
  model: string;
  apiKey: string;
  organization?: string;
  baseUrl?: string;
  temperature?: number;
  maxTokens?: number;
  topP?: number;
  frequencyPenalty?: number;
  presencePenalty?: number;
}

/**
 * Memory interface for conversation history
 */
export interface AgentMemory {
  /** Get all messages in memory */
  messages: MemoryMessage[];

  /** Context window length */
  contextWindowLength: number;

  /** Add a message to memory */
  addMessage: (type: 'human' | 'ai' | 'system' | 'tool', content: string) => Promise<void>;

  /** Clear all messages */
  clear: () => Promise<void>;

  /** Get messages */
  getMessages: () => Promise<MemoryMessage[]>;
}

/**
 * Memory message
 */
export interface MemoryMessage {
  type: 'human' | 'ai' | 'system' | 'tool';
  content: string;
  timestamp?: Date;
  toolCallId?: string;
}

/**
 * Intermediate step in agent execution
 */
export interface IntermediateStep {
  /** Step number */
  step: number;

  /** Type of step */
  type: 'thought' | 'tool_call' | 'tool_result' | 'observation';

  /** Content of the step */
  content: string;

  /** Tool call details (if type is tool_call) */
  toolCall?: ToolCall;

  /** Tool result (if type is tool_result) */
  toolResult?: ToolResult;

  /** Timestamp */
  timestamp: Date;
}

/**
 * Agent execution result
 */
export interface AgentResult {
  /** Final response text */
  response: string;

  /** Whether execution was successful */
  success: boolean;

  /** Number of iterations used */
  iterations: number;

  /** Tool calls made during execution */
  toolCalls: ToolCall[];

  /** Tool results from execution */
  toolResults: ToolResult[];

  /** Intermediate steps (if returnIntermediateSteps is true) */
  intermediateSteps?: IntermediateStep[];

  /** Token usage */
  usage: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };

  /** Finish reason */
  finishReason: 'complete' | 'max_iterations' | 'error';

  /** Error details (if finishReason is 'error') */
  error?: {
    type: AgentErrorType;
    message: string;
    details?: any;
  };

  /** Execution duration in milliseconds */
  durationMs: number;
}

/**
 * Agent error types
 */
export enum AgentErrorType {
  MAX_ITERATIONS_REACHED = 'MAX_ITERATIONS_REACHED',
  TOOL_EXECUTION_FAILED = 'TOOL_EXECUTION_FAILED',
  TOOL_NOT_FOUND = 'TOOL_NOT_FOUND',
  MODEL_ERROR = 'MODEL_ERROR',
  INVALID_TOOL_CALL = 'INVALID_TOOL_CALL',
  OUTPUT_PARSE_ERROR = 'OUTPUT_PARSE_ERROR',
  RATE_LIMIT_EXCEEDED = 'RATE_LIMIT_EXCEEDED',
  INVALID_CONFIG = 'INVALID_CONFIG',
  MEMORY_ERROR = 'MEMORY_ERROR',
}

/**
 * Custom error class for agent errors
 */
export class AgentError extends Error {
  constructor(
    public type: AgentErrorType,
    message: string,
    public details?: any,
  ) {
    super(message);
    this.name = 'AgentError';
  }
}
