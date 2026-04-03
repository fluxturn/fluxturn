import { Request } from 'express';
import { Injectable, Logger } from '@nestjs/common';
import axios, { AxiosInstance } from 'axios';
import { BaseConnector } from '../../base/base.connector';
import { IFormConnector } from '../../base/connector.interface';
import {
  ConnectorConfig,
  ConnectorResponse,
  ConnectorMetadata,
  ConnectorType,
  ConnectorCategory,
  AuthType,
  PaginatedRequest,
} from '../../types';

@Injectable()
export class TypeformConnector extends BaseConnector implements IFormConnector {
  private httpClient: AxiosInstance;
  private accessToken: string;

  getMetadata(): ConnectorMetadata {
    return {
      name: 'Typeform',
      description: 'Typeform connector for creating forms and collecting responses',
      version: '1.0.0',
      category: ConnectorCategory.FORMS,
      type: ConnectorType.TYPEFORM,
      authType: AuthType.OAUTH2,
      actions: [
        {
          id: 'create_form',
          name: 'Create Form',
          description: 'Create a new Typeform',
          inputSchema: {
            type: 'object',
            properties: {
              title: { type: 'string' },
              workspace: { type: 'object' },
              settings: { type: 'object' },
              theme: { type: 'object' },
              fields: { type: 'array' },
              logic: { type: 'array' }
            },
            required: ['title']
          },
          outputSchema: {
            type: 'object',
            properties: {
              success: { type: 'boolean' },
              data: { type: 'object' }
            }
          }
        },
        {
          id: 'get_responses',
          name: 'Get Form Responses',
          description: 'Get responses for a form',
          inputSchema: {
            type: 'object',
            properties: {
              form_id: { type: 'string' },
              page_size: { type: 'number', maximum: 1000 },
              since: { type: 'string', format: 'date-time' },
              until: { type: 'string', format: 'date-time' },
              after: { type: 'string' },
              before: { type: 'string' }
            },
            required: ['form_id']
          },
          outputSchema: {
            type: 'object',
            properties: {
              success: { type: 'boolean' },
              data: { type: 'object' }
            }
          }
        },
        {
          id: 'update_form',
          name: 'Update Form',
          description: 'Update an existing Typeform',
          inputSchema: {
            type: 'object',
            properties: {
              form_id: { type: 'string' },
              title: { type: 'string' },
              workspace: { type: 'object' },
              settings: { type: 'object' },
              theme: { type: 'object' },
              fields: { type: 'array' },
              logic: { type: 'array' }
            },
            required: ['form_id']
          },
          outputSchema: {
            type: 'object',
            properties: {
              success: { type: 'boolean' },
              data: { type: 'object' }
            }
          }
        },
        {
          id: 'get_analytics',
          name: 'Get Form Analytics',
          description: 'Get analytics and insights for a form',
          inputSchema: {
            type: 'object',
            properties: {
              form_id: { type: 'string' }
            },
            required: ['form_id']
          },
          outputSchema: {
            type: 'object',
            properties: {
              success: { type: 'boolean' },
              data: { type: 'object' }
            }
          }
        }
      ],
      triggers: [
        {
          id: 'form_response',
          eventType: "webhook",
          outputSchema: {},
          name: 'Form Response',
          description: 'Triggered when form receives new response'
        }
      ]
    };
  }

  protected async initializeConnection(): Promise<void> {
    const { access_token } = this.config.credentials;
    
    if (!access_token) {
      throw new Error('Typeform access token is required');
    }

    this.accessToken = access_token;
    this.httpClient = axios.create({
      baseURL: 'https://api.typeform.com',
      headers: {
        'Authorization': `Bearer ${access_token}`,
        'Content-Type': 'application/json'
      }
    });

    this.logger.log('Typeform connector initialized successfully');
  }

  async initialize(config: ConnectorConfig): Promise<void> {
    this.config = config;
    await this.initializeConnection();
  }

  protected async performConnectionTest(): Promise<boolean> {
    const response = await this.httpClient.get('/me');
    return response.status === 200;
  }

  protected async performHealthCheck(): Promise<void> {
    await this.httpClient.get('/me');
  }

  protected async performRequest(request: any): Promise<any> {
    return await this.httpClient.request(request);
  }

  protected async performAction(actionId: string, input: any): Promise<any> {
    return await this.executeAction(actionId, input);
  }

  protected async cleanup(): Promise<void> {
    // No cleanup needed
  }

  async createForm(form: any): Promise<ConnectorResponse> {
    try {
      const response = await this.httpClient.post('/forms', form);
      return {
        success: true,
        data: response.data,
      };
    } catch (error) {
      return {
        success: false,
        error: error.response?.data?.description || error.message,
      };
    }
  }

  async getFormResponses(formId: string, options?: PaginatedRequest): Promise<ConnectorResponse> {
    try {
      const params: any = {};
      if (options?.limit) params.page_size = Math.min(options.limit, 1000);
      if (options?.cursor) params.after = options.cursor;

      const response = await this.httpClient.get(`/forms/${formId}/responses`, { params });
      return {
        success: true,
        data: response.data,
      };
    } catch (error) {
      return {
        success: false,
        error: error.response?.data?.description || error.message,
      };
    }
  }

  async updateForm(formId: string, updates: any): Promise<ConnectorResponse> {
    try {
      const response = await this.httpClient.put(`/forms/${formId}`, updates);
      return {
        success: true,
        data: response.data,
      };
    } catch (error) {
      return {
        success: false,
        error: error.response?.data?.description || error.message,
      };
    }
  }

  async getFormAnalytics(formId: string): Promise<ConnectorResponse> {
    try {
      const response = await this.httpClient.get(`/insights/${formId}/summary`);
      return {
        success: true,
        data: response.data,
      };
    } catch (error) {
      return {
        success: false,
        error: error.response?.data?.description || error.message,
      };
    }
  }

  async executeAction(actionId: string, input: any): Promise<ConnectorResponse> {
    switch (actionId) {
      case 'create_form':
        return this.createForm(input);
      case 'get_responses':
        return this.getFormResponses(input.form_id, input);
      case 'update_form':
        return this.updateForm(input.form_id, input);
      case 'get_analytics':
        return this.getFormAnalytics(input.form_id);
      default:
        return {
          success: false,
          error: { code: 'UNKNOWN_ACTION', message: `Unknown action: ${actionId}` },
        };
    }
  }
}