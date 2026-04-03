// Shared type definitions for connector definitions

export interface OAuthConfig {
  authorization_url: string;
  token_url: string;
  scopes: string[];
  permissions?: string; // For Discord bot permissions
  scope_template?: string; // Template for dynamic scope calculation based on auth_fields
  auth_query_parameters?: string; // Additional query parameters for authorization URL (e.g., 'token_access_type=offline')
}

export interface ConnectorAction {
  id: string;
  name: string;
  description: string;
  category?: string;
  icon?: string;
  verified?: boolean;
  api?: any;
  inputSchema?: any;
  outputSchema?: any;
  displayOptions?: any;
  [key: string]: any;
}

export interface ConnectorTrigger {
  id: string;
  name: string;
  description: string;
  eventType?: string;
  icon?: string;
  verified?: boolean;
  webhookRequired?: boolean;
  pollingEnabled?: boolean;
  inputSchema?: any;
  outputSchema?: any;
  [key: string]: any;
}

export interface ConnectorDefinition {
  name: string;
  display_name: string;
  category: string;
  description: string;
  auth_type?: string;
  auth_types?: Array<{ value: string; label: string }>;
  auth_fields?: any;
  endpoints?: any;
  webhook_support?: boolean;
  rate_limits?: any;
  sandbox_available?: boolean;
  verified?: boolean; // Track if connector is verified and working
  complexity?: string; // Complexity level: 'Low', 'Medium', 'High'
  supported_actions?: ConnectorAction[];
  supported_triggers?: ConnectorTrigger[];
  oauth_config?: OAuthConfig;

  // ===== AI Tool Configuration =====

  /**
   * If true, this connector can be used as an AI Agent tool.
   * Defaults to true - set to false to explicitly disable.
   */
  usableAsTool?: boolean;

  /**
   * Custom description for the AI tool (overrides connector description).
   * Should explain what the AI can do with this connector.
   */
  toolDescription?: string;

  /**
   * Priority for tool ordering (higher = shown first). Default: 0
   */
  toolPriority?: number;
}
