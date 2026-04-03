import { api } from '../api';

export class WorkflowAPI {
  /**
   * Generate a workflow from a natural language prompt
   */
  static async generateWorkflow(params: {
    prompt: string;
    strategy?: 'AI_ONLY' | 'TEMPLATE_ONLY' | 'HYBRID';
    maxRetries?: number;
  }, organizationId?: string, projectId?: string, appId?: string): Promise<any> {
    // Set context IDs if provided
    if (organizationId) api.setOrganizationId(organizationId);
    if (projectId) api.setProjectId(projectId);
    if (appId) api.setAppId(appId);

    return api.post('/workflow/process-prompt', params);
  }

  /**
   * Get list of workflows with optional pagination and search
   */
  static async getWorkflows(params?: {
    page?: number;
    limit?: number;
    search?: string;
  }, organizationId?: string, projectId?: string, appId?: string): Promise<any> {
    // Set context IDs if provided
    if (organizationId) api.setOrganizationId(organizationId);
    if (projectId) api.setProjectId(projectId);
    if (appId) api.setAppId(appId);

    const searchParams = new URLSearchParams();
    if (params?.page) searchParams.append('page', params.page.toString());
    if (params?.limit) searchParams.append('limit', params.limit.toString());
    if (params?.search) searchParams.append('search', params.search);

    const query = searchParams.toString();
    return api.get(`/workflow/list${query ? `?${query}` : ''}`);
  }

  /**
   * Get a single workflow by ID
   */
  static async getWorkflow(workflowId: string, organizationId?: string, projectId?: string, appId?: string): Promise<any> {
    // Set context IDs if provided
    if (organizationId) api.setOrganizationId(organizationId);
    if (projectId) api.setProjectId(projectId);
    if (appId) api.setAppId(appId);

    return api.get(`/workflow/${workflowId}`);
  }

  /**
   * Create a new workflow
   */
  static async createWorkflow(workflow: any, organizationId?: string, projectId?: string, appId?: string): Promise<any> {
    // Set context IDs if provided
    if (organizationId) api.setOrganizationId(organizationId);
    if (projectId) api.setProjectId(projectId);
    if (appId) api.setAppId(appId);

    return api.post('/workflow/create', workflow);
  }

  /**
   * Update an existing workflow
   */
  static async updateWorkflow(workflowId: string, workflow: any, organizationId?: string, projectId?: string, appId?: string): Promise<any> {
    // Set context IDs if provided
    if (organizationId) api.setOrganizationId(organizationId);
    if (projectId) api.setProjectId(projectId);
    if (appId) api.setAppId(appId);

    return api.put(`/workflow/${workflowId}`, workflow);
  }

  /**
   * Delete a workflow
   */
  static async deleteWorkflow(workflowId: string, organizationId?: string, projectId?: string, appId?: string): Promise<any> {
    // Set context IDs if provided
    if (organizationId) api.setOrganizationId(organizationId);
    if (projectId) api.setProjectId(projectId);
    if (appId) api.setAppId(appId);

    return api.delete(`/workflow/${workflowId}`);
  }

  /**
   * Execute a workflow with optional parameters
   */
  static async executeWorkflow(workflowId: string, params?: any, organizationId?: string, projectId?: string, appId?: string): Promise<any> {
    // Set context IDs if provided
    if (organizationId) api.setOrganizationId(organizationId);
    if (projectId) api.setProjectId(projectId);
    if (appId) api.setAppId(appId);

    return api.post(`/workflow/${workflowId}/execute`, params || {});
  }

  /**
   * Get execution history for a workflow
   */
  static async getWorkflowExecutions(workflowId: string, params?: {
    page?: number;
    limit?: number;
    status?: string;
  }, organizationId?: string, projectId?: string, appId?: string): Promise<any> {
    // Set context IDs if provided
    if (organizationId) api.setOrganizationId(organizationId);
    if (projectId) api.setProjectId(projectId);
    if (appId) api.setAppId(appId);

    const searchParams = new URLSearchParams();
    if (params?.page) searchParams.append('page', params.page.toString());
    if (params?.limit) searchParams.append('limit', params.limit.toString());
    if (params?.status) searchParams.append('status', params.status);

    const query = searchParams.toString();
    return api.get(`/workflow/${workflowId}/executions${query ? `?${query}` : ''}`);
  }

  /**
   * Get execution statistics for dashboard
   */
  static async getExecutionStats(organizationId?: string, projectId?: string, appId?: string): Promise<any> {
    if (organizationId) api.setOrganizationId(organizationId);
    if (projectId) api.setProjectId(projectId);
    if (appId) api.setAppId(appId);

    return api.get('/workflow/execution-stats');
  }

  /**
   * Get all executions across all workflows
   */
  static async getAllExecutions(params?: {
    page?: number;
    limit?: number;
    status?: string;
  }, organizationId?: string, projectId?: string, appId?: string): Promise<any> {
    if (organizationId) api.setOrganizationId(organizationId);
    if (projectId) api.setProjectId(projectId);
    if (appId) api.setAppId(appId);

    const searchParams = new URLSearchParams();
    if (params?.page) searchParams.append('page', params.page.toString());
    if (params?.limit) searchParams.append('limit', params.limit.toString());
    if (params?.status) searchParams.append('status', params.status);

    const query = searchParams.toString();
    return api.get(`/workflow/executions${query ? `?${query}` : ''}`);
  }

  /**
   * Test database connection
   */
  static async testDatabaseConnection(data: {
    database_type: 'postgresql' | 'mysql';
    config: { host: string; port: number; database: string; ssl_enabled?: boolean; connection_timeout?: number };
    credentials: { user: string; password: string };
  }, organizationId?: string, projectId?: string, appId?: string): Promise<any> {
    if (organizationId) api.setOrganizationId(organizationId);
    if (projectId) api.setProjectId(projectId);
    if (appId) api.setAppId(appId);

    return api.post('/database-browser/connections/test', data);
  }

  /**
   * Get tables from connector credential
   */
  static async getConnectorTables(credentialId: string, schema: string = 'public', organizationId?: string, projectId?: string, appId?: string): Promise<any> {
    if (organizationId) api.setOrganizationId(organizationId);
    if (projectId) api.setProjectId(projectId);
    if (appId) api.setAppId(appId);

    const params = new URLSearchParams({ schema });
    return api.get(`/connectors/${credentialId}/resources/tables?${params}`);
  }

  /**
   * Get table columns from connector credential
   */
  static async getConnectorTableColumns(credentialId: string, table: string, schema: string = 'public', organizationId?: string, projectId?: string, appId?: string): Promise<any> {
    if (organizationId) api.setOrganizationId(organizationId);
    if (projectId) api.setProjectId(projectId);
    if (appId) api.setAppId(appId);

    if (!table) {
      throw new Error('Table name is required');
    }
    const params = new URLSearchParams({ table, schema });
    return api.get(`/connectors/${credentialId}/resources/table-columns?${params}`);
  }

  /**
   * Execute connector database action
   */
  static async executeConnectorDbAction(credentialId: string, action: string, parameters: any, organizationId?: string, projectId?: string, appId?: string): Promise<any> {
    if (organizationId) api.setOrganizationId(organizationId);
    if (projectId) api.setProjectId(projectId);
    if (appId) api.setAppId(appId);

    return api.post(`/connectors/${credentialId}/execute`, { action, parameters });
  }
}
