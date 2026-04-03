import { Injectable, Logger } from '@nestjs/common';
import { BaseConnector } from '../../base/base.connector';
import {
  ConnectorMetadata,
  ConnectorType,
  ConnectorCategory,
  ConnectorRequest,
  ConnectorResponse,
  AuthType,
  ConnectorAction,
  ConnectorTrigger
} from '../../types';
import { AuthUtils } from '../../utils/auth.utils';
import { ApiUtils } from '../../utils/api.utils';
import axios from 'axios';

@Injectable()
export class N8nConnector extends BaseConnector {
  private baseUrl: string;
  private apiKey: string;

  constructor(
    private readonly authUtils: AuthUtils,
    private readonly apiUtils: ApiUtils
  ) {
    super();
  }

  getMetadata(): ConnectorMetadata {
    return {
      name: 'n8n',
      description: 'n8n automation platform - manage workflows, executions, and credentials',
      version: '1.0.0',
      category: ConnectorCategory.DEVELOPMENT,
      type: ConnectorType.N8N,
      authType: AuthType.API_KEY,
      actions: this.getActions(),
      triggers: this.getTriggers(),
      webhookSupport: false
    };
  }

  protected async initializeConnection(): Promise<void> {
    this.baseUrl = this.config.credentials.baseUrl;
    this.apiKey = this.config.credentials.apiKey;

    if (!this.baseUrl || !this.apiKey) {
      throw new Error('Base URL and API Key are required for n8n connector');
    }

    // Remove trailing slash from baseUrl if present
    this.baseUrl = this.baseUrl.replace(/\/$/, '');

    this.logger.log('n8n connector initialized');
  }

  protected async performConnectionTest(): Promise<boolean> {
    try {
      // Test connection by fetching workflows with a limit
      const response = await this.makeApiRequest('GET', '/workflows', { limit: 5 });
      return response.status === 200;
    } catch (error) {
      this.logger.error('n8n connection test failed:', error.message);
      return false;
    }
  }

  protected async performHealthCheck(): Promise<void> {
    if (!this.config?.credentials?.apiKey || !this.config?.credentials?.baseUrl) {
      throw new Error('API Key and Base URL not configured');
    }
  }

  protected async performRequest(request: ConnectorRequest): Promise<any> {
    const url = `${this.baseUrl}${request.endpoint}`;

    const response = await axios({
      method: request.method,
      url,
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
        'X-N8N-API-KEY': this.apiKey,
        ...request.headers
      },
      params: request.queryParams,
      data: request.body
    });

    return response.data;
  }

  protected async performAction(actionId: string, input: any): Promise<any> {
    switch (actionId) {
      case 'get_workflows':
        return await this.getWorkflows(input);
      case 'get_workflow':
        return await this.getWorkflow(input);
      case 'create_workflow':
        return await this.createWorkflow(input);
      case 'update_workflow':
        return await this.updateWorkflow(input);
      case 'delete_workflow':
        return await this.deleteWorkflow(input);
      case 'activate_workflow':
        return await this.activateWorkflow(input);
      case 'deactivate_workflow':
        return await this.deactivateWorkflow(input);
      case 'get_executions':
        return await this.getExecutions(input);
      case 'get_execution':
        return await this.getExecution(input);
      case 'delete_execution':
        return await this.deleteExecution(input);
      default:
        throw new Error(`Unknown action: ${actionId}`);
    }
  }

  protected async cleanup(): Promise<void> {
    this.logger.log('n8n connector cleanup completed');
  }

  // Workflow Actions
  private async getWorkflows(input: any): Promise<any> {
    const params: any = {};

    if (!input.returnAll && input.limit) {
      params.limit = input.limit;
    }
    if (input.active !== undefined) {
      params.active = input.active;
    }
    if (input.tags) {
      params.tags = input.tags;
    }
    if (input.name) {
      params.name = input.name;
    }
    if (input.projectId) {
      params.projectId = input.projectId;
    }

    return await this.makeApiRequest('GET', '/workflows', params);
  }

  private async getWorkflow(input: any): Promise<any> {
    const { workflowId } = input;
    return await this.makeApiRequest('GET', `/workflows/${workflowId}`);
  }

  private async createWorkflow(input: any): Promise<any> {
    const { workflowObject } = input;

    // Parse workflow object if it's a string
    let workflow;
    try {
      workflow = typeof workflowObject === 'string'
        ? JSON.parse(workflowObject)
        : workflowObject;
    } catch (error) {
      throw new Error('Invalid workflow object JSON');
    }

    return await this.makeApiRequest('POST', '/workflows', {}, workflow);
  }

  private async updateWorkflow(input: any): Promise<any> {
    const { workflowId, workflowObject } = input;

    // Parse workflow object if it's a string
    let workflow;
    try {
      workflow = typeof workflowObject === 'string'
        ? JSON.parse(workflowObject)
        : workflowObject;
    } catch (error) {
      throw new Error('Invalid workflow object JSON');
    }

    return await this.makeApiRequest('PUT', `/workflows/${workflowId}`, {}, workflow);
  }

  private async deleteWorkflow(input: any): Promise<any> {
    const { workflowId } = input;
    return await this.makeApiRequest('DELETE', `/workflows/${workflowId}`);
  }

  private async activateWorkflow(input: any): Promise<any> {
    const { workflowId, versionId, name, description } = input;

    const body: any = {};
    if (versionId) body.versionId = versionId;
    if (name) body.name = name;
    if (description) body.description = description;

    return await this.makeApiRequest('POST', `/workflows/${workflowId}/activate`, {}, body);
  }

  private async deactivateWorkflow(input: any): Promise<any> {
    const { workflowId } = input;
    return await this.makeApiRequest('POST', `/workflows/${workflowId}/deactivate`);
  }

  // Execution Actions
  private async getExecutions(input: any): Promise<any> {
    const params: any = {};

    if (input.limit) {
      params.limit = input.limit;
    }
    if (input.workflowId) {
      params.workflowId = input.workflowId;
    }
    if (input.status) {
      params.status = input.status;
    }

    return await this.makeApiRequest('GET', '/executions', params);
  }

  private async getExecution(input: any): Promise<any> {
    const { executionId } = input;
    return await this.makeApiRequest('GET', `/executions/${executionId}`);
  }

  private async deleteExecution(input: any): Promise<any> {
    const { executionId } = input;
    return await this.makeApiRequest('DELETE', `/executions/${executionId}`);
  }

  // Helper Methods
  private async makeApiRequest(
    method: string,
    endpoint: string,
    params?: any,
    data?: any
  ): Promise<any> {
    const url = `${this.baseUrl}${endpoint}`;

    const response = await axios({
      method,
      url,
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
        'X-N8N-API-KEY': this.apiKey
      },
      params,
      data
    });

    return response.data;
  }

  private getActions(): ConnectorAction[] {
    return [
      {
        id: 'get_workflows',
        name: 'Get Workflows',
        description: 'Get many workflows from your n8n instance',
        inputSchema: {},
        outputSchema: { data: { type: 'array' } }
      },
      {
        id: 'get_workflow',
        name: 'Get Workflow',
        description: 'Get a single workflow by ID',
        inputSchema: {},
        outputSchema: { id: { type: 'string' } }
      },
      {
        id: 'create_workflow',
        name: 'Create Workflow',
        description: 'Create a new workflow',
        inputSchema: {},
        outputSchema: { id: { type: 'string' } }
      },
      {
        id: 'update_workflow',
        name: 'Update Workflow',
        description: 'Update an existing workflow',
        inputSchema: {},
        outputSchema: { id: { type: 'string' } }
      },
      {
        id: 'delete_workflow',
        name: 'Delete Workflow',
        description: 'Delete a workflow',
        inputSchema: {},
        outputSchema: { success: { type: 'boolean' } }
      },
      {
        id: 'activate_workflow',
        name: 'Publish Workflow',
        description: 'Activate/publish a workflow',
        inputSchema: {},
        outputSchema: { success: { type: 'boolean' } }
      },
      {
        id: 'deactivate_workflow',
        name: 'Unpublish Workflow',
        description: 'Deactivate/unpublish a workflow',
        inputSchema: {},
        outputSchema: { success: { type: 'boolean' } }
      },
      {
        id: 'get_executions',
        name: 'Get Executions',
        description: 'Get workflow executions',
        inputSchema: {},
        outputSchema: { data: { type: 'array' } }
      },
      {
        id: 'get_execution',
        name: 'Get Execution',
        description: 'Get a single execution by ID',
        inputSchema: {},
        outputSchema: { id: { type: 'string' } }
      },
      {
        id: 'delete_execution',
        name: 'Delete Execution',
        description: 'Delete an execution',
        inputSchema: {},
        outputSchema: { success: { type: 'boolean' } }
      }
    ];
  }

  private getTriggers(): ConnectorTrigger[] {
    return [];
  }
}
