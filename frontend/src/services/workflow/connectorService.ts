import { api } from '@/lib/api';

export interface ConnectorAction {
  id: string;
  name: string;
  description?: string;
  inputSchema?: Record<string, unknown>;
}

export interface ConnectorTrigger {
  id: string;
  name: string;
  description?: string;
  eventType?: string;
  webhookRequired?: boolean;
  outputSchema?: Record<string, unknown>;
}

export interface ConnectorConfig {
  id: string;
  name: string;
  connector_type: string;
  enabled: boolean;
  status: string;
  created_at: string;
  updated_at: string;
  metadata?: {
    display_name: string;
    description: string;
    category: string;
  };
}

export interface AvailableConnector {
  id: string;
  name: string;
  display_name: string;
  description: string;
  category: string;
  auth_type: string;
  auth_fields?: Record<string, unknown>;
  supported_actions?: string[];
  supported_triggers?: string[];
  webhook_support?: boolean;
  rate_limits?: Record<string, unknown>;
  sandbox_available?: boolean;
  verified?: boolean; // Indicates if the connector is verified and working
}

export const connectorService = {
  /**
   * List user's configured connectors
   */
  async listConnectorConfigs(params?: {
    connector_type?: string;
    enabled?: boolean;
    status?: string;
    limit?: number;
    offset?: number;
  }): Promise<{ connectors: ConnectorConfig[]; total: number }> {
    const queryParams = new URLSearchParams();
    
    if (params?.connector_type) queryParams.append('connector_type', params.connector_type);
    if (params?.enabled !== undefined) queryParams.append('enabled', params.enabled.toString());
    if (params?.status) queryParams.append('status', params.status);
    if (params?.limit) queryParams.append('limit', params.limit.toString());
    if (params?.offset) queryParams.append('offset', params.offset.toString());

    const queryString = queryParams.toString();
    const url = queryString ? `/connectors?${queryString}` : '/connectors';
    
    return api.get<{ connectors: ConnectorConfig[]; total: number }>(url);
  },

  /**
   * Get available connector types from the system
   */
  async getAvailableConnectors(): Promise<AvailableConnector[]> {
    return api.get<AvailableConnector[]>('/connectors/available');
  },

  /**
   * Get connectors by category for node actions/triggers
   */
  async getConnectorsByCategory(category?: string): Promise<AvailableConnector[]> {
    const connectors = await this.getAvailableConnectors();
    if (category) {
      return connectors.filter(c => c.category.toLowerCase() === category.toLowerCase());
    }
    return connectors;
  },

  /**
   * Get email connectors for the Send Email node
   */
  async getEmailConnectors(): Promise<ConnectorConfig[]> {
    const response = await this.listConnectorConfigs({ 
      enabled: true
    });
    
    // Filter for email-type connectors (gmail, outlook, sendgrid, etc.)
    return response.connectors.filter((c: ConnectorConfig) => 
      ['gmail', 'outlook', 'sendgrid', 'smtp', 'mailchimp'].includes(c.connector_type.toLowerCase())
    );
  },

  /**
   * Get actions for a specific connector type
   */
  async getConnectorActions(connectorType: string): Promise<ConnectorAction[]> {
    return api.get<ConnectorAction[]>(`/connectors/available/${connectorType}/actions`);
  },

  /**
   * Get triggers for a specific connector type
   */
  async getConnectorTriggers(connectorType: string): Promise<ConnectorTrigger[]> {
    return api.get<ConnectorTrigger[]>(`/connectors/available/${connectorType}/triggers`);
  },

  /**
   * Get metadata for a specific connector including actions/triggers
   */
  async getConnectorMetadata(connectorType: string): Promise<AvailableConnector> {
    return api.get<AvailableConnector>(`/connectors/available/${connectorType}`);
  }
};