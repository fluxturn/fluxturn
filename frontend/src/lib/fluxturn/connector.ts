import { api } from '../api';
import type { JsonObject } from '../../types/json';

export class ConnectorAPI {
  /**
   * Get available connector types (platform-level, no tenant context needed)
   */
  static async getAvailableConnectors(): Promise<Record<string, unknown>> {
    return api.get('/workflow/connectors');
  }

  /**
   * Get available connector types list (platform-level, no tenant context needed)
   */
  static async getAvailableConnectorsList(): Promise<Record<string, unknown>> {
    return api.get('/connectors/available/list');
  }

  /**
   * Get user's configured connector instances (tenant-scoped)
   */
  static async getConnectorConfigs(organizationId?: string, projectId?: string, appId?: string): Promise<Record<string, unknown>> {
    if (organizationId) api.setOrganizationId(organizationId);
    if (projectId) api.setProjectId(projectId);
    if (appId) api.setAppId(appId);

    return api.get('/connectors');
  }

  /**
   * Create a connector config (tenant-scoped)
   */
  static async createConnectorConfig(config: {
    connectorType: string;
    name: string;
    config: JsonObject;
  }, organizationId?: string, projectId?: string, appId?: string): Promise<Record<string, unknown>> {
    if (organizationId) api.setOrganizationId(organizationId);
    if (projectId) api.setProjectId(projectId);
    if (appId) api.setAppId(appId);

    return api.post('/connectors', config);
  }

  /**
   * Update a connector config (tenant-scoped)
   */
  static async updateConnectorConfig(configId: string, config: JsonObject, organizationId?: string, projectId?: string, appId?: string): Promise<Record<string, unknown>> {
    if (organizationId) api.setOrganizationId(organizationId);
    if (projectId) api.setProjectId(projectId);
    if (appId) api.setAppId(appId);

    return api.put(`/connectors/${configId}`, config);
  }

  /**
   * Delete a connector config (tenant-scoped)
   */
  static async deleteConnectorConfig(configId: string, organizationId?: string, projectId?: string, appId?: string): Promise<Record<string, unknown>> {
    if (organizationId) api.setOrganizationId(organizationId);
    if (projectId) api.setProjectId(projectId);
    if (appId) api.setAppId(appId);

    return api.delete(`/connectors/${configId}`);
  }

  /**
   * Test a connector config (tenant-scoped)
   */
  static async testConnectorConfig(configId: string, organizationId?: string, projectId?: string, appId?: string): Promise<Record<string, unknown>> {
    if (organizationId) api.setOrganizationId(organizationId);
    if (projectId) api.setProjectId(projectId);
    if (appId) api.setAppId(appId);

    return api.post(`/connectors/${configId}/test`, {});
  }

  /**
   * Execute a connector config (tenant-scoped)
   */
  static async executeConnector(configId: string, params: JsonObject, organizationId?: string, projectId?: string, appId?: string): Promise<Record<string, unknown>> {
    if (organizationId) api.setOrganizationId(organizationId);
    if (projectId) api.setProjectId(projectId);
    if (appId) api.setAppId(appId);

    return api.post(`/connectors/${configId}/execute`, params);
  }
}
