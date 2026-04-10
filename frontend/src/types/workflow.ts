import type { JsonObject, JsonValue } from './json';

export interface WorkflowNode {
  id: string;
  type: 'connector' | 'control' | 'trigger';
  position: { x: number; y: number };
  data: {
    label: string;
    connectorType?: string;
    controlType?: string;
    config?: JsonObject;
    inputs?: WorkflowPort[];
    outputs?: WorkflowPort[];
    status?: 'idle' | 'running' | 'success' | 'error';
    error?: string;
    icon?: string;
    color?: string;
    category?: string;
  };
}

export interface WorkflowEdge {
  id: string;
  source: string;
  target: string;
  sourceHandle?: string;
  targetHandle?: string;
  type?: 'default' | 'conditional';
  data?: {
    condition?: string;
    label?: string;
  };
}

export interface WorkflowPort {
  id: string;
  name: string;
  type: 'string' | 'number' | 'boolean' | 'object' | 'array' | 'any';
  required?: boolean;
  description?: string;
  default?: JsonValue;
}

export interface WorkflowDefinition {
  id: string;
  name: string;
  description?: string;
  version: string;
  nodes: WorkflowNode[];
  edges: WorkflowEdge[];
  variables: WorkflowVariable[];
  triggers: WorkflowTrigger[];
  settings: WorkflowSettings;
  createdAt: string;
  updatedAt: string;
}

export interface WorkflowVariable {
  id: string;
  name: string;
  type: 'string' | 'number' | 'boolean' | 'object' | 'array';
  value: JsonValue;
  description?: string;
  scope: 'global' | 'local';
}

export interface WorkflowTrigger {
  id: string;
  type: 'manual' | 'schedule' | 'webhook' | 'event';
  config: JsonObject;
  enabled: boolean;
}

export interface WorkflowSettings {
  timeout: number;
  retryPolicy: {
    maxRetries: number;
    delay: number;
    backoff: 'linear' | 'exponential';
  };
  errorHandling: 'stop' | 'continue' | 'retry';
  logging: {
    level: 'debug' | 'info' | 'warn' | 'error';
    includeData: boolean;
  };
}

export interface WorkflowExecution {
  id: string;
  workflowId: string;
  status: 'pending' | 'running' | 'success' | 'error' | 'cancelled';
  startedAt: string;
  completedAt?: string;
  duration?: number;
  error?: string;
  logs: WorkflowExecutionLog[];
  nodeExecutions: NodeExecution[];
}

export interface WorkflowExecutionLog {
  id: string;
  timestamp: string;
  level: 'debug' | 'info' | 'warn' | 'error';
  message: string;
  nodeId?: string;
  data?: JsonValue;
}

export interface NodeExecution {
  nodeId: string;
  status: 'pending' | 'running' | 'success' | 'error' | 'skipped';
  startedAt: string;
  completedAt?: string;
  duration?: number;
  error?: string;
  inputData?: JsonValue;
  outputData?: JsonValue;
}

export interface ConnectorDefinition {
  id: string;
  name: string;
  description: string;
  category: string;
  icon: string;
  color: string;
  inputs: WorkflowPort[];
  outputs: WorkflowPort[];
  configSchema: JsonObject;
  documentation: string;
  version: string;
  tags: string[];
}

export interface ControlFlowDefinition {
  id: string;
  type: 'if' | 'loop' | 'switch' | 'parallel' | 'delay' | 'filter' | 'transform';
  name: string;
  description: string;
  icon: string;
  color: string;
  inputs: WorkflowPort[];
  outputs: WorkflowPort[];
  configSchema: JsonObject;
}

export interface WorkflowTemplate {
  id: string;
  name: string;
  description: string;
  category: string;
  tags: string[];
  definition: Omit<WorkflowDefinition, 'id' | 'createdAt' | 'updatedAt'>;
  popularity: number;
  author: string;
  version: string;
}

export interface WorkflowBuilderState {
  workflow: WorkflowDefinition;
  selectedNodes: string[];
  selectedEdges: string[];
  executionHistory: WorkflowExecution[];
  isExecuting: boolean;
  debugMode: boolean;
  breakpoints: string[];
  variables: Record<string, JsonValue>;
  clipboard: {
    nodes: WorkflowNode[];
    edges: WorkflowEdge[];
  };
}

// Connector configurations for all 54 production connectors
export const CONNECTOR_CONFIGS: Record<string, ConnectorDefinition> = {
  // AI/ML Connectors
  openai: {
    id: 'openai',
    name: 'OpenAI',
    description: 'OpenAI GPT models for text generation, completion, and embeddings',
    category: 'AI/ML',
    icon: '🤖',
    color: '#10a37f',
    version: '1.0.0',
    tags: ['ai', 'ml', 'text', 'gpt'],
    documentation: 'https://docs.openai.com/api',
    inputs: [
      { id: 'prompt', name: 'Prompt', type: 'string', required: true, description: 'Text prompt for the model' },
      { id: 'model', name: 'Model', type: 'string', required: false, default: 'gpt-4', description: 'OpenAI model to use' },
      { id: 'max_tokens', name: 'Max Tokens', type: 'number', required: false, default: 1000, description: 'Maximum tokens to generate' }
    ],
    outputs: [
      { id: 'text', name: 'Generated Text', type: 'string', description: 'Generated text response' },
      { id: 'usage', name: 'Usage Stats', type: 'object', description: 'Token usage statistics' }
    ],
    configSchema: {
      api_key: { type: 'string', required: true, description: 'OpenAI API key' },
      organization: { type: 'string', required: false, description: 'OpenAI organization ID' }
    }
  },

  anthropic: {
    id: 'anthropic',
    name: 'Anthropic',
    description: 'Anthropic Claude AI models for conversational AI and text analysis',
    category: 'AI/ML',
    icon: '🧠',
    color: '#d97706',
    version: '1.0.0',
    tags: ['ai', 'claude', 'conversation', 'analysis'],
    documentation: 'https://docs.anthropic.com/api',
    inputs: [
      { id: 'message', name: 'Message', type: 'string', required: true, description: 'Message to send to Claude' },
      { id: 'model', name: 'Model', type: 'string', required: false, default: 'claude-3-sonnet-20240229', description: 'Claude model version' }
    ],
    outputs: [
      { id: 'response', name: 'Response', type: 'string', description: 'Claude\'s response' },
      { id: 'usage', name: 'Usage Stats', type: 'object', description: 'Token usage information' }
    ],
    configSchema: {
      api_key: { type: 'string', required: true, description: 'Anthropic API key' }
    }
  },

  // Communication Connectors
  discord: {
    id: 'discord',
    name: 'Discord',
    description: 'Discord bot integration for sending messages and managing servers',
    category: 'Communication',
    icon: '🎮',
    color: '#5865f2',
    version: '1.0.0',
    tags: ['discord', 'chat', 'bot', 'gaming'],
    documentation: 'https://discord.com/developers/docs',
    inputs: [
      { id: 'channel_id', name: 'Channel ID', type: 'string', required: true, description: 'Discord channel ID' },
      { id: 'message', name: 'Message', type: 'string', required: true, description: 'Message to send' },
      { id: 'embed', name: 'Embed', type: 'object', required: false, description: 'Rich embed object' }
    ],
    outputs: [
      { id: 'message_id', name: 'Message ID', type: 'string', description: 'Sent message ID' },
      { id: 'timestamp', name: 'Timestamp', type: 'string', description: 'Message timestamp' }
    ],
    configSchema: {
      bot_token: { type: 'string', required: true, description: 'Discord bot token' },
      guild_id: { type: 'string', required: false, description: 'Discord server (guild) ID' }
    }
  },

  slack: {
    id: 'slack',
    name: 'Slack',
    description: 'Slack workspace integration for messaging and notifications',
    category: 'Communication',
    icon: '💬',
    color: '#4a154b',
    version: '1.0.0',
    tags: ['slack', 'messaging', 'workplace', 'notifications'],
    documentation: 'https://api.slack.com/',
    inputs: [
      { id: 'channel', name: 'Channel', type: 'string', required: true, description: 'Slack channel name or ID' },
      { id: 'text', name: 'Message Text', type: 'string', required: true, description: 'Message content' },
      { id: 'attachments', name: 'Attachments', type: 'array', required: false, description: 'Message attachments' }
    ],
    outputs: [
      { id: 'ts', name: 'Message Timestamp', type: 'string', description: 'Message timestamp' },
      { id: 'channel', name: 'Channel ID', type: 'string', description: 'Channel where message was sent' }
    ],
    configSchema: {
      bot_token: { type: 'string', required: true, description: 'Slack bot token' },
      workspace_id: { type: 'string', required: false, description: 'Slack workspace ID' }
    }
  },

  // Database Connectors
  postgresql: {
    id: 'postgresql',
    name: 'PostgreSQL',
    description: 'PostgreSQL database operations for querying and data manipulation',
    category: 'Database',
    icon: '🐘',
    color: '#336791',
    version: '1.0.0',
    tags: ['database', 'sql', 'postgresql', 'query'],
    documentation: 'https://www.postgresql.org/docs/',
    inputs: [
      { id: 'query', name: 'SQL Query', type: 'string', required: true, description: 'SQL query to execute' },
      { id: 'parameters', name: 'Parameters', type: 'array', required: false, description: 'Query parameters' }
    ],
    outputs: [
      { id: 'rows', name: 'Result Rows', type: 'array', description: 'Query result rows' },
      { id: 'row_count', name: 'Row Count', type: 'number', description: 'Number of affected rows' }
    ],
    configSchema: {
      host: { type: 'string', required: true, description: 'Database host' },
      port: { type: 'number', required: false, default: 5432, description: 'Database port' },
      database: { type: 'string', required: true, description: 'Database name' },
      username: { type: 'string', required: true, description: 'Database username' },
      password: { type: 'string', required: true, description: 'Database password' },
      ssl: { type: 'boolean', required: false, default: false, description: 'Use SSL connection' }
    }
  },

  // Payment Connectors
  stripe: {
    id: 'stripe',
    name: 'Stripe',
    description: 'Stripe payment processing for charges, subscriptions, and customers',
    category: 'Payment',
    icon: '💳',
    color: '#635bff',
    version: '1.0.0',
    tags: ['payment', 'stripe', 'billing', 'subscription'],
    documentation: 'https://stripe.com/docs/api',
    inputs: [
      { id: 'amount', name: 'Amount', type: 'number', required: true, description: 'Payment amount in cents' },
      { id: 'currency', name: 'Currency', type: 'string', required: false, default: 'usd', description: 'Currency code' },
      { id: 'customer_id', name: 'Customer ID', type: 'string', required: false, description: 'Stripe customer ID' },
      { id: 'description', name: 'Description', type: 'string', required: false, description: 'Payment description' }
    ],
    outputs: [
      { id: 'payment_intent_id', name: 'Payment Intent ID', type: 'string', description: 'Created payment intent ID' },
      { id: 'client_secret', name: 'Client Secret', type: 'string', description: 'Client secret for frontend' },
      { id: 'status', name: 'Status', type: 'string', description: 'Payment status' }
    ],
    configSchema: {
      secret_key: { type: 'string', required: true, description: 'Stripe secret key' },
      webhook_secret: { type: 'string', required: false, description: 'Webhook endpoint secret' }
    }
  },

  // Cloud Storage Connectors
  'aws-s3': {
    id: 'aws-s3',
    name: 'AWS S3',
    description: 'Amazon S3 cloud storage for file upload, download, and management',
    category: 'Cloud',
    icon: '☁️',
    color: '#ff9900',
    version: '1.0.0',
    tags: ['aws', 's3', 'storage', 'cloud', 'files'],
    documentation: 'https://docs.aws.amazon.com/s3/',
    inputs: [
      { id: 'bucket', name: 'Bucket Name', type: 'string', required: true, description: 'S3 bucket name' },
      { id: 'key', name: 'Object Key', type: 'string', required: true, description: 'S3 object key/path' },
      { id: 'body', name: 'File Content', type: 'any', required: false, description: 'File content to upload' },
      { id: 'operation', name: 'Operation', type: 'string', required: true, description: 'S3 operation (upload, download, delete)' }
    ],
    outputs: [
      { id: 'url', name: 'Object URL', type: 'string', description: 'S3 object URL' },
      { id: 'etag', name: 'ETag', type: 'string', description: 'Object ETag' },
      { id: 'size', name: 'File Size', type: 'number', description: 'File size in bytes' }
    ],
    configSchema: {
      access_key_id: { type: 'string', required: true, description: 'AWS access key ID' },
      secret_access_key: { type: 'string', required: true, description: 'AWS secret access key' },
      region: { type: 'string', required: true, description: 'AWS region' }
    }
  },

  // Social Media Connectors
  twitter: {
    id: 'twitter',
    name: 'Twitter/X',
    description: 'Twitter/X integration for posting tweets and managing social media presence',
    category: 'Social',
    icon: '🐦',
    color: '#1d9bf0',
    version: '1.0.0',
    tags: ['twitter', 'x', 'social', 'posts', 'tweets'],
    documentation: 'https://developer.twitter.com/en/docs',
    inputs: [
      { id: 'text', name: 'Tweet Text', type: 'string', required: true, description: 'Tweet content' },
      { id: 'media_ids', name: 'Media IDs', type: 'array', required: false, description: 'Uploaded media IDs' },
      { id: 'reply_to', name: 'Reply To', type: 'string', required: false, description: 'Tweet ID to reply to' }
    ],
    outputs: [
      { id: 'tweet_id', name: 'Tweet ID', type: 'string', description: 'Posted tweet ID' },
      { id: 'created_at', name: 'Created At', type: 'string', description: 'Tweet creation timestamp' },
      { id: 'url', name: 'Tweet URL', type: 'string', description: 'Direct link to tweet' }
    ],
    configSchema: {
      api_key: { type: 'string', required: true, description: 'Twitter API key' },
      api_secret: { type: 'string', required: true, description: 'Twitter API secret' },
      access_token: { type: 'string', required: true, description: 'Twitter access token' },
      access_token_secret: { type: 'string', required: true, description: 'Twitter access token secret' }
    }
  },

  // Analytics Connectors
  'google-analytics': {
    id: 'google-analytics',
    name: 'Google Analytics',
    description: 'Google Analytics integration for web traffic analysis and reporting',
    category: 'Analytics',
    icon: '🔍',
    color: '#e37400',
    version: '1.0.0',
    tags: ['analytics', 'google', 'tracking', 'metrics', 'web'],
    documentation: 'https://developers.google.com/analytics',
    inputs: [
      { id: 'property_id', name: 'Property ID', type: 'string', required: true, description: 'GA4 property ID' },
      { id: 'start_date', name: 'Start Date', type: 'string', required: true, description: 'Report start date (YYYY-MM-DD)' },
      { id: 'end_date', name: 'End Date', type: 'string', required: true, description: 'Report end date (YYYY-MM-DD)' },
      { id: 'metrics', name: 'Metrics', type: 'array', required: true, description: 'Metrics to retrieve' },
      { id: 'dimensions', name: 'Dimensions', type: 'array', required: false, description: 'Dimensions to group by' }
    ],
    outputs: [
      { id: 'report_data', name: 'Report Data', type: 'object', description: 'Analytics report data' },
      { id: 'row_count', name: 'Row Count', type: 'number', description: 'Number of data rows' },
      { id: 'totals', name: 'Totals', type: 'object', description: 'Report totals' }
    ],
    configSchema: {
      credentials: { type: 'object', required: true, description: 'Google service account credentials' },
      view_id: { type: 'string', required: false, description: 'Analytics view ID (for UA)' }
    }
  }

  // Note: This is a subset of the 54 connectors for brevity.
  // In production, all 54 connectors would be defined here with complete schemas.
};