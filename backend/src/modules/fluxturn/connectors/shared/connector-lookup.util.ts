import { CONNECTOR_DEFINITIONS } from './all-connectors';
import {
  ConnectorDefinition,
  ConnectorAction,
  ConnectorTrigger,
} from './types';

// Build lookup maps at module load time for O(1) access
const connectorsByName = new Map<string, ConnectorDefinition>();
CONNECTOR_DEFINITIONS.forEach((c) => connectorsByName.set(c.name, c));

const connectorsByCategory = new Map<string, ConnectorDefinition[]>();
CONNECTOR_DEFINITIONS.forEach((c) => {
  const existing = connectorsByCategory.get(c.category) || [];
  existing.push(c);
  connectorsByCategory.set(c.category, existing);
});

/**
 * Static utility class for O(1) connector definition lookups.
 * No database queries - reads directly from TypeScript constants.
 */
export class ConnectorLookup {
  /**
   * Get all connector definitions (both verified and unverified)
   */
  static getAll(): ConnectorDefinition[] {
    return [...CONNECTOR_DEFINITIONS];
  }

  /**
   * Get only verified connector definitions
   */
  static getVerifiedOnly(): ConnectorDefinition[] {
    return CONNECTOR_DEFINITIONS.filter((c) => c.verified === true);
  }

  /**
   * Get connector by name
   */
  static getByName(name: string): ConnectorDefinition | null {
    return connectorsByName.get(name) || null;
  }

  /**
   * Get connectors by category
   */
  static getByCategory(category: string): ConnectorDefinition[] {
    return connectorsByCategory.get(category) || [];
  }

  /**
   * Check if connector exists
   */
  static exists(name: string): boolean {
    return connectorsByName.has(name);
  }

  /**
   * Get all connector names
   */
  static getAllNames(): string[] {
    return CONNECTOR_DEFINITIONS.map((c) => c.name);
  }

  /**
   * Get actions for a connector
   */
  static getActions(name: string): ConnectorAction[] {
    const connector = connectorsByName.get(name);
    return connector?.supported_actions || [];
  }

  /**
   * Get triggers for a connector
   */
  static getTriggers(name: string): ConnectorTrigger[] {
    const connector = connectorsByName.get(name);
    return connector?.supported_triggers || [];
  }

  /**
   * Get a specific action from a connector
   */
  static getAction(
    connectorName: string,
    actionId: string,
  ): ConnectorAction | null {
    const actions = this.getActions(connectorName);
    return actions.find((a) => a.id === actionId) || null;
  }

  /**
   * Get a specific trigger from a connector
   */
  static getTrigger(
    connectorName: string,
    triggerId: string,
  ): ConnectorTrigger | null {
    const triggers = this.getTriggers(connectorName);
    return triggers.find((t) => t.id === triggerId) || null;
  }

  /**
   * Search connectors by name/description
   */
  static search(query: string): ConnectorDefinition[] {
    const lowerQuery = query.toLowerCase();
    return CONNECTOR_DEFINITIONS.filter(
      (c) =>
        c.name.toLowerCase().includes(lowerQuery) ||
        c.display_name.toLowerCase().includes(lowerQuery) ||
        c.description?.toLowerCase().includes(lowerQuery),
    );
  }

  /**
   * Get connector count
   */
  static count(): number {
    return CONNECTOR_DEFINITIONS.length;
  }

  /**
   * Get all categories
   */
  static getCategories(): string[] {
    return Array.from(connectorsByCategory.keys());
  }

  /**
   * Map connector definition to a simplified metadata format
   * (for backwards compatibility with database-based responses)
   */
  static toMetadata(def: ConnectorDefinition): ConnectorMetadata {
    return {
      id: def.name, // Use name as ID since we're not using DB
      name: def.name,
      display_name: def.display_name,
      description: def.description,
      category: def.category,
      auth_type: def.auth_type || 'api_key',
      status: 'active',
      is_public: true,
      auth_fields: def.auth_fields,
      supported_actions: def.supported_actions || [],
      supported_triggers: def.supported_triggers || [],
      webhook_support: def.webhook_support,
      oauth_config: def.oauth_config,
      rate_limits: def.rate_limits,
      sandbox_available: def.sandbox_available,
      verified: def.verified,
    };
  }
}

/**
 * Metadata format for backwards compatibility with database responses
 */
export interface ConnectorMetadata {
  id: string;
  name: string;
  display_name: string;
  description: string;
  category: string;
  auth_type: string;
  status: string;
  is_public: boolean;
  auth_fields?: any;
  supported_actions: ConnectorAction[];
  supported_triggers: ConnectorTrigger[];
  webhook_support?: boolean;
  oauth_config?: any;
  rate_limits?: any;
  sandbox_available?: boolean;
  verified?: boolean;
}
