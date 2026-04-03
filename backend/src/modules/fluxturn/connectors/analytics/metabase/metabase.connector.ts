import { Injectable } from '@nestjs/common';
import { BaseConnector } from '../../base/base.connector';
import {
  ConnectorMetadata,
  ConnectorType,
  ConnectorCategory,
  ConnectorRequest,
  ConnectorResponse,
  AuthType,
  ConnectorAction,
  ConnectorTrigger,
} from '../../types';
import { AuthUtils } from '../../utils/auth.utils';
import { ApiUtils } from '../../utils/api.utils';

@Injectable()
export class MetabaseConnector extends BaseConnector {
  private baseUrl: string;
  private sessionToken: string;

  constructor(
    private readonly authUtils: AuthUtils,
    private readonly apiUtils: ApiUtils,
  ) {
    super();
  }

  getMetadata(): ConnectorMetadata {
    return {
      name: 'Metabase',
      description: 'Business intelligence and analytics platform for querying databases and visualizing data',
      version: '1.0.0',
      category: ConnectorCategory.ANALYTICS,
      type: ConnectorType.METABASE,
      authType: AuthType.BASIC_AUTH,
      actions: this.getActions(),
      triggers: this.getTriggers(),
      webhookSupport: false,
    };
  }

  protected async initializeConnection(): Promise<void> {
    if (!this.config.credentials?.url || !this.config.credentials?.username || !this.config.credentials?.password) {
      throw new Error('URL, username, and password are required');
    }

    this.baseUrl = this.config.credentials.url.replace(/\/$/, '');

    // Get session token
    await this.authenticateSession();

    this.logger.log('Metabase connector initialized');
  }

  protected async performConnectionTest(): Promise<boolean> {
    try {
      const response = await this.performRequest({
        method: 'GET',
        endpoint: '/api/user/current',
        headers: this.getAuthHeaders(),
      });
      return !!response;
    } catch (error) {
      this.logger.error('Connection test failed:', error);
      return false;
    }
  }

  protected async performHealthCheck(): Promise<void> {
    const isHealthy = await this.performConnectionTest();
    if (!isHealthy) {
      throw new Error('Health check failed');
    }
  }

  protected async performRequest(request: ConnectorRequest): Promise<any> {
    const url = `${this.baseUrl}${request.endpoint}`;

    const response = await this.apiUtils.executeRequest({
      method: request.method,
      endpoint: url,
      headers: request.headers || this.getAuthHeaders(),
      queryParams: request.queryParams,
      body: request.body,
    });

    return response.data;
  }

  protected async performAction(actionId: string, input: any): Promise<any> {
    switch (actionId) {
      // Questions
      case 'get_question':
        return await this.getQuestion(input);
      case 'get_all_questions':
        return await this.getAllQuestions();
      case 'get_question_result':
        return await this.getQuestionResult(input);

      // Metrics
      case 'get_metric':
        return await this.getMetric(input);
      case 'get_all_metrics':
        return await this.getAllMetrics();

      // Databases
      case 'get_all_databases':
        return await this.getAllDatabases(input);
      case 'get_database_fields':
        return await this.getDatabaseFields(input);
      case 'add_database':
        return await this.addDatabase(input);

      // Alerts
      case 'get_alert':
        return await this.getAlert(input);
      case 'get_all_alerts':
        return await this.getAllAlerts();

      default:
        throw new Error(`Unknown action: ${actionId}`);
    }
  }

  protected async cleanup(): Promise<void> {
    this.logger.log('Metabase connector cleanup completed');
  }

  private async authenticateSession(): Promise<void> {
    try {
      const response = await this.apiUtils.executeRequest({
        method: 'POST',
        endpoint: `${this.baseUrl}/api/session`,
        body: {
          username: this.config.credentials.username,
          password: this.config.credentials.password,
        },
      });

      this.sessionToken = response.data.id;
    } catch (error) {
      this.logger.error('Failed to authenticate session:', error);
      throw new Error('Failed to authenticate with Metabase');
    }
  }

  private getAuthHeaders(): Record<string, string> {
    return {
      'Content-Type': 'application/json',
      'X-Metabase-Session': this.sessionToken,
    };
  }

  private getActions(): ConnectorAction[] {
    return [
      // Questions
      {
        id: 'get_question',
        name: 'Get Question',
        description: 'Get a specific question by ID',
        inputSchema: {
          questionId: { type: 'string', required: true },
        },
        outputSchema: { question: { type: 'object' } },
      },
      {
        id: 'get_all_questions',
        name: 'Get All Questions',
        description: 'Get all questions',
        inputSchema: {},
        outputSchema: { questions: { type: 'array' } },
      },
      {
        id: 'get_question_result',
        name: 'Get Question Result',
        description: 'Get the result of a question in a specific format',
        inputSchema: {
          questionId: { type: 'string', required: true },
          format: { type: 'string', required: true },
        },
        outputSchema: { result: { type: 'object' } },
      },

      // Metrics
      {
        id: 'get_metric',
        name: 'Get Metric',
        description: 'Get a specific metric by ID',
        inputSchema: {
          metricId: { type: 'string', required: true },
        },
        outputSchema: { metric: { type: 'object' } },
      },
      {
        id: 'get_all_metrics',
        name: 'Get All Metrics',
        description: 'Get all metrics',
        inputSchema: {},
        outputSchema: { metrics: { type: 'array' } },
      },

      // Databases
      {
        id: 'get_all_databases',
        name: 'Get All Databases',
        description: 'Get all databases',
        inputSchema: {
          simplify: { type: 'boolean', required: false },
        },
        outputSchema: { databases: { type: 'array' } },
      },
      {
        id: 'get_database_fields',
        name: 'Get Database Fields',
        description: 'Get fields from a database',
        inputSchema: {
          databaseId: { type: 'string', required: true },
        },
        outputSchema: { fields: { type: 'array' } },
      },
      {
        id: 'add_database',
        name: 'Add Database',
        description: 'Add a new datasource to the Metabase instance',
        inputSchema: {
          name: { type: 'string', required: true },
          engine: { type: 'string', required: true },
          host: { type: 'string', required: false },
          port: { type: 'number', required: false },
          user: { type: 'string', required: false },
          password: { type: 'string', required: false },
          dbName: { type: 'string', required: false },
          filePath: { type: 'string', required: false },
          fullSync: { type: 'boolean', required: true },
        },
        outputSchema: { database: { type: 'object' } },
      },

      // Alerts
      {
        id: 'get_alert',
        name: 'Get Alert',
        description: 'Get a specific alert by ID',
        inputSchema: {
          alertId: { type: 'string', required: true },
        },
        outputSchema: { alert: { type: 'object' } },
      },
      {
        id: 'get_all_alerts',
        name: 'Get All Alerts',
        description: 'Get all alerts',
        inputSchema: {},
        outputSchema: { alerts: { type: 'array' } },
      },
    ];
  }

  private getTriggers(): ConnectorTrigger[] {
    return [];
  }

  // Question Methods
  private async getQuestion(data: any): Promise<any> {
    const { questionId } = data;

    return await this.performRequest({
      method: 'GET',
      endpoint: `/api/card/${questionId}`,
      headers: this.getAuthHeaders(),
    });
  }

  private async getAllQuestions(): Promise<any> {
    return await this.performRequest({
      method: 'GET',
      endpoint: '/api/card/',
      headers: this.getAuthHeaders(),
    });
  }

  private async getQuestionResult(data: any): Promise<any> {
    const { questionId, format } = data;

    return await this.performRequest({
      method: 'POST',
      endpoint: `/api/card/${questionId}/query/${format}`,
      headers: this.getAuthHeaders(),
    });
  }

  // Metric Methods
  private async getMetric(data: any): Promise<any> {
    const { metricId } = data;

    return await this.performRequest({
      method: 'GET',
      endpoint: `/api/metric/${metricId}`,
      headers: this.getAuthHeaders(),
    });
  }

  private async getAllMetrics(): Promise<any> {
    return await this.performRequest({
      method: 'GET',
      endpoint: '/api/metric/',
      headers: this.getAuthHeaders(),
    });
  }

  // Database Methods
  private async getAllDatabases(data: any): Promise<any> {
    const response = await this.performRequest({
      method: 'GET',
      endpoint: '/api/database/',
      headers: this.getAuthHeaders(),
    });

    // Return the data array from response
    if (response && response.data) {
      return response.data;
    }

    return response;
  }

  private async getDatabaseFields(data: any): Promise<any> {
    const { databaseId } = data;

    return await this.performRequest({
      method: 'GET',
      endpoint: `/api/database/${databaseId}/fields`,
      headers: this.getAuthHeaders(),
    });
  }

  private async addDatabase(data: any): Promise<any> {
    const { name, engine, host, port, user, password, dbName, filePath, fullSync } = data;

    const body: any = {
      name,
      engine,
      is_full_sync: fullSync,
      details: {},
    };

    // Add connection details based on engine type
    if (['postgres', 'redshift', 'mysql', 'mongo'].includes(engine)) {
      if (host) body.details.host = host;
      if (port) body.details.port = port;
      if (user) body.details.user = user;
      if (password) body.details.password = password;
      if (dbName) body.details.db = dbName;
    } else if (['h2', 'sqlite'].includes(engine)) {
      if (filePath) body.details.db = filePath;
    }

    return await this.performRequest({
      method: 'POST',
      endpoint: '/api/database',
      headers: this.getAuthHeaders(),
      body,
    });
  }

  // Alert Methods
  private async getAlert(data: any): Promise<any> {
    const { alertId } = data;

    return await this.performRequest({
      method: 'GET',
      endpoint: `/api/alert/${alertId}`,
      headers: this.getAuthHeaders(),
    });
  }

  private async getAllAlerts(): Promise<any> {
    return await this.performRequest({
      method: 'GET',
      endpoint: '/api/alert/',
      headers: this.getAuthHeaders(),
    });
  }
}
