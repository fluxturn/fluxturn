import { Request } from 'express';
export interface ConnectorCredentials {
  apiKey?: string;
  accessToken?: string;
  refreshToken?: string;
  clientId?: string;
  clientSecret?: string;
  username?: string;
  password?: string;
  domain?: string;
  subdomain?: string;
  instanceUrl?: string;
  webhookSecret?: string;
  [key: string]: any;
}

export interface ConnectorConfig {
  id: string;
  name: string;
  type: ConnectorType;
  category: ConnectorCategory;
  credentials: ConnectorCredentials;
  settings?: Record<string, any>;
  isActive?: boolean;
  rateLimit?: RateLimitConfig;
  retryConfig?: RetryConfig;
  webhookConfig?: WebhookConfig;
}

export interface RateLimitConfig {
  requestsPerSecond?: number;
  requestsPerMinute?: number;
  requestsPerHour?: number;
  requestsPerDay?: number;
  burstLimit?: number;
}

export interface RetryConfig {
  maxRetries: number;
  backoffStrategy: 'linear' | 'exponential' | 'fixed';
  initialDelay: number;
  maxDelay: number;
  retryOnStatusCodes?: number[];
  retryOnErrors?: string[];
}

export interface WebhookConfig {
  url: string;
  secret?: string;
  events: string[];
  headers?: Record<string, string>;
}

export enum ConnectorType {
  // Communication
  EMAIL = 'email',
  SMS = 'sms',
  VOICE = 'voice',
  CHAT = 'chat',
  VIDEO_CONFERENCE = 'video_conference',
  SLACK = 'slack',
  DISCORD = 'discord',
  TEAMS = 'teams',
  GMAIL = 'gmail',
  TWILIO = 'twilio',
  TELEGRAM = 'telegram',
  WHATSAPP = 'whatsapp',
  GOOGLE_CALENDAR = 'google_calendar',
  SMTP = 'smtp',
  IMAP = 'imap',
  POP3 = 'pop3',
  AWS_SES = 'aws_ses',
  CALENDLY = 'calendly',

  // CRM
  SALESFORCE = 'salesforce',
  HUBSPOT = 'hubspot',
  PIPEDRIVE = 'pipedrive',
  ZOHO_CRM = 'zoho_crm',
  ZOHO = 'zoho',
  AIRTABLE = 'airtable',

  // Storage
  GOOGLE_DRIVE = 'google_drive',
  DROPBOX = 'dropbox',
  ONEDRIVE = 'onedrive',
  AWS_S3 = 'aws_s3',
  BOX = 'box',
  GOOGLE_SHEETS = 'google_sheets',
  GOOGLE_DOCS = 'google_docs',
  GITHUB = 'github',
  GITLAB = 'gitlab',
  NPM = 'npm',
  MONGODB = 'mongodb',
  MYSQL = 'mysql',
  POSTGRESQL = 'postgresql',
  REDIS = 'redis',
  SNOWFLAKE = 'snowflake',
  ELASTICSEARCH = 'elasticsearch',

  // E-commerce
  SHOPIFY = 'shopify',
  WOOCOMMERCE = 'woocommerce',
  MAGENTO = 'magento',
  STRIPE = 'stripe',
  PADDLE = 'paddle',
  PAYPAL = 'paypal',
  GUMROAD = 'gumroad',

  // Marketing
  MAILCHIMP = 'mailchimp',
  SENDGRID = 'sendgrid',
  KLAVIYO = 'klaviyo',
  HUBSPOT_MARKETING = 'hubspot_marketing',
  FACEBOOK_ADS = 'facebook_ads',
  GOOGLE_ADS = 'google_ads',
  ACTIVECAMPAIGN = 'activecampaign',
  BREVO = 'brevo',

  // Project Management
  TRELLO = 'trello',
  ASANA = 'asana',
  JIRA = 'jira',
  MONDAY = 'monday',
  NOTION = 'notion',
  LINEAR = 'linear',
  CLICKUP = 'clickup',

  // AI
  OPENAI = 'openai',
  OPENAI_CHATBOT = 'openai_chatbot',
  ANTHROPIC = 'anthropic',
  GOOGLE_AI = 'google_ai',
  GOOGLE_GEMINI = 'google_gemini',
  AZURE_AI = 'azure_ai',
  AWS_BEDROCK = 'aws_bedrock',

  // Social
  TWITTER = 'twitter',
  FACEBOOK = 'facebook',
  FACEBOOK_GRAPH = 'facebook_graph',
  INSTAGRAM = 'instagram',
  LINKEDIN = 'linkedin',
  YOUTUBE = 'youtube',
  TIKTOK = 'tiktok',
  REDDIT = 'reddit',
  PINTEREST = 'pinterest',

  // Analytics
  GOOGLE_ANALYTICS = 'google_analytics',
  MIXPANEL = 'mixpanel',
  AMPLITUDE = 'amplitude',
  SEGMENT = 'segment',
  POSTHOG = 'posthog',
  METABASE = 'metabase',
  SPLUNK = 'splunk',
  GRAFANA = 'grafana',

  // Finance
  QUICKBOOKS = 'quickbooks',
  XERO = 'xero',
  STRIPE_FINANCE = 'stripe_finance',
  PLAID = 'plaid',
  WISE = 'wise',
  CHARGEBEE = 'chargebee',

  // Support
  ZENDESK = 'zendesk',
  INTERCOM = 'intercom',
  FRESHDESK = 'freshdesk',
  PAGERDUTY = 'pagerduty',
  SENTRY_IO = 'sentry_io',
  SERVICENOW = 'servicenow',

  // Forms
  TYPEFORM = 'typeform',
  GOOGLE_FORMS = 'google_forms',
  JOTFORM = 'jotform',

  // Video
  YOUTUBE_API = 'youtube_api',
  VIMEO = 'vimeo',
  TWILIO_VIDEO = 'twilio_video',
  ZOOM = 'zoom',

  // CMS
  WORDPRESS = 'wordpress',
  WEBFLOW = 'webflow',
  CONTENTFUL = 'contentful',

  // Data Processing
  SCRAPFLY = 'scrapfly',
  SUPABASE = 'supabase',
  EXTRACT_FROM_FILE = 'extract_from_file',

  // Development
  N8N = 'n8n',
  JENKINS = 'jenkins',
  TRAVIS_CI = 'travis_ci',
  NETLIFY = 'netlify',
  GIT = 'git',
  BITBUCKET = 'bitbucket',

  // Infrastructure
  CLOUDFLARE = 'cloudflare',
  GRAPHQL = 'graphql',
  KAFKA = 'kafka',
  RABBITMQ = 'rabbitmq',

  // Utility
  SSH = 'ssh',
  FTP = 'ftp',
  EXECUTE_COMMAND = 'execute_command',
  DEEPL = 'deepl',
  BITLY = 'bitly',

  // Productivity
  TODOIST = 'todoist',
  CLOCKIFY = 'clockify',
  HARVEST = 'harvest',
  TOGGL = 'toggl',
  FIGMA = 'figma',
  SPOTIFY = 'spotify',

  // Communication (additional)
  DISCOURSE = 'discourse',
  MATRIX = 'matrix',
  MATTERMOST = 'mattermost',

  // CMS (additional)
  GHOST = 'ghost',
  MEDIUM = 'medium'
}

export enum ConnectorCategory {
  COMMUNICATION = 'communication',
  CRM = 'crm',
  STORAGE = 'storage',
  ECOMMERCE = 'ecommerce',
  MARKETING = 'marketing',
  PROJECT_MANAGEMENT = 'project_management',
  AI = 'ai',
  SOCIAL = 'social',
  ANALYTICS = 'analytics',
  FINANCE = 'finance',
  SUPPORT = 'support',
  FORMS = 'forms',
  VIDEO = 'video',
  PAYMENT = 'payment',
  DEVELOPMENT = 'development',
  DATABASE = 'database',
  CMS = 'cms',
  DATA_PROCESSING = 'data_processing',
  INFRASTRUCTURE = 'infrastructure',
  UTILITY = 'utility',
  PRODUCTIVITY = 'productivity'
}

export interface ConnectorResponse<T = any> {
  success: boolean;
  data?: T;
  error?: ConnectorError;
  metadata?: {
    requestId?: string;
    timestamp?: Date;
    responseTime?: number;
    contentType?: string;
    contentLength?: number;
    connectorId?: string;
    rateLimit?: {
      remaining: number;
      reset: Date;
    };
    pagination?: {
      page: number;
      pageSize: number;
      total: number;
      hasNext: boolean;
    };
    [key: string]: any;
  };
}

export interface ConnectorError {
  code: string;
  message: string;
  details?: any;
  statusCode?: number;
  retryable?: boolean;
  retryAfter?: number;
}

export interface ConnectorRequest {
  method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  endpoint: string;
  headers?: Record<string, string>;
  body?: any;
  queryParams?: Record<string, any>;
  timeout?: number;
}

export interface ConnectorAction {
  id: string;
  name: string;
  description: string;
  inputSchema: Record<string, any>;
  outputSchema: Record<string, any>;
  rateLimit?: RateLimitConfig;
}

export interface ConnectorTrigger {
  id: string;
  name: string;
  description: string;
  eventType: string;
  inputSchema?: Record<string, any>;
  outputSchema: Record<string, any>;
  webhookRequired?: boolean;
  pollingEnabled?: boolean;
}

export interface ConnectorMetadata {
  name: string;
  description: string;
  version: string;
  category: ConnectorCategory;
  type: ConnectorType;
  logoUrl?: string;
  documentationUrl?: string;
  authType: AuthType;
  requiredScopes?: string[];
  actions: ConnectorAction[];
  triggers: ConnectorTrigger[];
  rateLimit?: RateLimitConfig;
  webhookSupport?: boolean;
}

export enum AuthType {
  NONE = 'none',
  API_KEY = 'api_key',
  OAUTH2 = 'oauth2',
  BASIC_AUTH = 'basic_auth',
  BEARER_TOKEN = 'bearer_token',
  CUSTOM = 'custom'
}

export interface OAuthTokens {
  accessToken: string;
  refreshToken?: string;
  expiresAt?: Date;
  scope?: string;
  tokenType?: string;
}

export interface WebhookEvent {
  id: string;
  eventType: string;
  timestamp: Date;
  data: any;
  connectorId: string;
  projectId: string;
}

export interface ConnectorHealthStatus {
  isHealthy: boolean;
  lastChecked: Date;
  responseTime?: number;
  error?: string;
  details?: Record<string, any>;
}

export interface ConnectorUsageStats {
  requestCount: number;
  errorCount: number;
  lastUsed: Date;
  avgResponseTime: number;
  rateLimit?: {
    remaining: number;
    reset: Date;
  };
}

// Common data transfer objects
export interface PaginatedRequest {
  page?: number;
  pageSize?: number;
  limit?: number;
  offset?: number;
  cursor?: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  filters?: Record<string, any>;
  [key: string]: any; // Allow additional properties
}

export interface BulkOperation<T> {
  operation: 'create' | 'update' | 'delete';
  items: T[];
  batchSize?: number;
  continueOnError?: boolean;
}

export interface BulkOperationResult<T> {
  successful: T[];
  failed: Array<{
    item: T;
    error: ConnectorError;
  }>;
  totalProcessed: number;
  totalSuccessful: number;
  totalFailed: number;
}

// Event system types
export interface ConnectorEvent {
  type: string;
  connectorId: string;
  timestamp: Date;
  data: any;
  source: 'webhook' | 'polling' | 'manual';
}

export enum ConnectorEventType {
  DATA_CREATED = 'data.created',
  DATA_UPDATED = 'data.updated',
  DATA_DELETED = 'data.deleted',
  CONNECTION_ESTABLISHED = 'connection.established',
  CONNECTION_LOST = 'connection.lost',
  RATE_LIMIT_REACHED = 'rate_limit.reached',
  ERROR_OCCURRED = 'error.occurred',
  WEBHOOK_RECEIVED = 'webhook.received',
  TOKEN_REFRESHED = 'token.refreshed'
}

// Validation and schema types
export interface FieldSchema {
  type: 'string' | 'number' | 'boolean' | 'object' | 'array' | 'date';
  required?: boolean;
  description?: string;
  enum?: any[];
  format?: string;
  validation?: {
    min?: number;
    max?: number;
    pattern?: string;
    custom?: string;
  };
}

/**
 * Extended field schema for action input fields with AI control support
 * Used to define which parameters are controlled by AI vs workflow context
 */
export interface ActionInputField extends FieldSchema {
  // Display properties
  label?: string;
  placeholder?: string;
  default?: any;
  inputType?: 'text' | 'textarea' | 'email' | 'url' | 'password';
  maxLength?: number;
  minLength?: number;
  min?: number;
  max?: number;
  step?: number;

  // Select/enum options
  options?: Array<{ label: string; value: any }>;

  // Array item schema
  itemSchema?: Record<string, ActionInputField>;

  // Object properties
  properties?: Record<string, ActionInputField>;

  // Conditional display
  displayOptions?: {
    show?: Record<string, any[]>;
    hide?: Record<string, any[]>;
  };

  // ===== AI Control Fields (like n8n's $fromAI) =====

  /**
   * If true, this parameter is controlled by AI Agent
   * If false/undefined, parameter comes from workflow context or user config
   */
  aiControlled?: boolean;

  /**
   * Description specifically for the LLM when parameter is aiControlled
   * Helps AI understand what value to generate
   */
  aiDescription?: string;

  /**
   * Default value to use when AI doesn't provide one
   */
  aiDefault?: any;
}

export interface ActionInputSchema {
  [fieldName: string]: FieldSchema | ActionInputField;
}

export interface ActionOutputSchema {
  [fieldName: string]: FieldSchema;
}

/**
 * Options for generating tools from connectors
 */
export interface ToolGenerationOptions {
  /** Filter to specific action IDs */
  actionFilter?: string[];

  /** Pre-filled parameters per action (for non-AI-controlled fields) */
  contextParams?: Record<string, Record<string, any>>;

  /** Whether to only expose AI-controlled fields (default: true) */
  filterAIControlled?: boolean;
}
