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
export class JotFormConnector extends BaseConnector implements IFormConnector {
  private httpClient: AxiosInstance;
  private apiKey: string;

  getMetadata(): ConnectorMetadata {
    return {
      name: 'JotForm',
      description: 'JotForm connector for creating forms and collecting submissions',
      version: '1.0.0',
      category: ConnectorCategory.FORMS,
      type: ConnectorType.JOTFORM,
      authType: AuthType.API_KEY,
      actions: [
        {
          id: 'create_form',
          name: 'Create Form',
          description: 'Create a new JotForm',
          inputSchema: {
            type: 'object',
            properties: {
              title: { type: 'string' },
              questions: { type: 'object' },
              properties: { type: 'object' },
              emails: { type: 'object' }
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
          id: 'get_submissions',
          name: 'Get Form Submissions',
          description: 'Get submissions for a form',
          inputSchema: {
            type: 'object',
            properties: {
              form_id: { type: 'string' },
              offset: { type: 'number' },
              limit: { type: 'number', maximum: 1000 },
              filter: { type: 'object' },
              orderby: { type: 'string' }
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
          id: 'form_submission',
          eventType: "webhook",
          outputSchema: {},
          name: 'Form Submission',
          description: 'Triggered when form receives new submission'
        }
      ]
    };
  }

  protected async initializeConnection(): Promise<void> {
    const { api_key } = this.config.credentials;
    
    if (!api_key) {
      throw new Error('JotForm API key is required');
    }

    this.apiKey = api_key;
    this.httpClient = axios.create({
      baseURL: 'https://api.jotform.com',
      params: { apiKey: api_key }
    });

    this.logger.log('JotForm connector initialized successfully');
  }

  async initialize(config: ConnectorConfig): Promise<void> {
    this.config = config;
    await this.initializeConnection();
  }

  protected async performConnectionTest(): Promise<boolean> {
    const response = await this.httpClient.get('/user');
    return response.status === 200;
  }

  protected async performHealthCheck(): Promise<void> {
    await this.httpClient.get('/user');
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
      const formData = new URLSearchParams();
      
      if (form.title) {
        formData.append('properties[title]', form.title);
      }
      
      if (form.questions) {
        Object.keys(form.questions).forEach(key => {
          formData.append(`questions[${key}]`, JSON.stringify(form.questions[key]));
        });
      }

      if (form.properties) {
        Object.keys(form.properties).forEach(key => {
          formData.append(`properties[${key}]`, form.properties[key]);
        });
      }

      const response = await this.httpClient.post('/form', formData, {
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
      });

      return {
        success: true,
        data: response.data.content,
      };
    } catch (error) {
      return {
        success: false,
        error: error.response?.data?.message || error.message,
      };
    }
  }

  async getFormResponses(formId: string, options?: PaginatedRequest): Promise<ConnectorResponse> {
    try {
      const params: any = {};
      
      if (options?.offset) params.offset = options.offset;
      if (options?.limit) params.limit = Math.min(options.limit, 1000);
      if (options?.filters) Object.assign(params, options.filters);

      const response = await this.httpClient.get(`/form/${formId}/submissions`, { params });

      return {
        success: true,
        data: response.data.content,
      };
    } catch (error) {
      return {
        success: false,
        error: error.response?.data?.message || error.message,
      };
    }
  }

  async updateForm(formId: string, updates: any): Promise<ConnectorResponse> {
    try {
      const formData = new URLSearchParams();
      
      if (updates.questions) {
        Object.keys(updates.questions).forEach(key => {
          formData.append(`questions[${key}]`, JSON.stringify(updates.questions[key]));
        });
      }

      if (updates.properties) {
        Object.keys(updates.properties).forEach(key => {
          formData.append(`properties[${key}]`, updates.properties[key]);
        });
      }

      const response = await this.httpClient.post(`/form/${formId}`, formData, {
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
      });

      return {
        success: true,
        data: response.data.content,
      };
    } catch (error) {
      return {
        success: false,
        error: error.response?.data?.message || error.message,
      };
    }
  }

  async getFormAnalytics(formId: string): Promise<ConnectorResponse> {
    try {
      const [formResponse, submissionsResponse] = await Promise.all([
        this.httpClient.get(`/form/${formId}`),
        this.httpClient.get(`/form/${formId}/submissions`, { params: { limit: 1000 } })
      ]);

      const analytics = {
        form: formResponse.data.content,
        totalSubmissions: submissionsResponse.data.content?.length || 0,
        submissions: submissionsResponse.data.content || []
      };

      return {
        success: true,
        data: analytics,
      };
    } catch (error) {
      return {
        success: false,
        error: error.response?.data?.message || error.message,
      };
    }
  }

  async executeAction(actionId: string, input: any): Promise<ConnectorResponse> {
    switch (actionId) {
      case 'create_form':
        return this.createForm(input);
      case 'get_submissions':
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