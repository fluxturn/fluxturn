import { Injectable, Logger } from '@nestjs/common';
import { BaseConnector } from '../../base/base.connector';
import { IFormConnector } from '../../base/connector.interface';
import {
  ConnectorMetadata,
  ConnectorType,
  ConnectorCategory,
  ConnectorRequest,
  ConnectorResponse,
  AuthType,
  PaginatedRequest,
  ConnectorAction,
  ConnectorTrigger
} from '../../types';
import { AuthUtils } from '../../utils/auth.utils';
import { ApiUtils } from '../../utils/api.utils';

interface JotformForm {
  id: string;
  title: string;
  status: string;
  url: string;
  count: number;
  new: number;
  created_at: string;
  updated_at: string;
}

interface JotformSubmission {
  id: string;
  form_id: string;
  ip: string;
  created_at: string;
  status: string;
  new: string;
  flag: string;
  answers: Record<string, any>;
}

interface JotformQuestion {
  qid: string;
  name: string;
  text: string;
  type: string;
  order: string;
  required: string;
}

@Injectable()
export class JotformConnector extends BaseConnector implements IFormConnector {
  private baseUrl: string;
  private apiDomain: string;

  constructor(
    private readonly authUtils: AuthUtils,
    private readonly apiUtils: ApiUtils
  ) {
    super();
  }

  getMetadata(): ConnectorMetadata {
    return {
      name: 'Jotform',
      description: 'Online form builder for creating forms, surveys, and collecting submissions',
      version: '1.0.0',
      category: ConnectorCategory.CRM,
      type: ConnectorType.JOTFORM,
      logoUrl: 'https://www.jotform.com/resources/assets/logo/jotform-icon-orange-400x400.png',
      documentationUrl: 'https://api.jotform.com/docs/',
      authType: AuthType.API_KEY,
      actions: this.getActions(),
      triggers: this.getTriggers(),
      rateLimit: {
        requestsPerDay: 1000
      },
      webhookSupport: true
    };
  }

  protected async initializeConnection(): Promise<void> {
    try {
      this.apiDomain = this.config.credentials.apiDomain || 'api.jotform.com';
      this.baseUrl = `https://${this.apiDomain}`;

      if (!this.config.credentials.apiKey) {
        throw new Error('API Key is required for Jotform connection');
      }

      // Test the connection by getting user info
      const response = await this.performRequest({
        method: 'GET',
        endpoint: '/user',
        headers: this.getAuthHeaders()
      });

      if (!response?.username) {
        throw new Error('Failed to connect to Jotform API');
      }

      this.logger.log('Jotform connector initialized successfully');
    } catch (error) {
      this.logger.error('Failed to initialize Jotform connection:', error);
      throw new Error(`Jotform connection failed: ${error.message}`);
    }
  }

  protected async performConnectionTest(): Promise<boolean> {
    try {
      const response = await this.performRequest({
        method: 'GET',
        endpoint: '/user',
        headers: this.getAuthHeaders()
      });
      return !!response?.username;
    } catch (error) {
      this.logger.error('Jotform connection test failed:', error);
      return false;
    }
  }

  protected async performHealthCheck(): Promise<void> {
    try {
      await this.performRequest({
        method: 'GET',
        endpoint: '/user/usage',
        headers: this.getAuthHeaders()
      });
    } catch (error) {
      throw new Error(`Jotform health check failed: ${error.message}`);
    }
  }

  protected async performRequest(request: ConnectorRequest): Promise<any> {
    try {
      const response = await this.apiUtils.executeRequest({
        ...request,
        endpoint: `${this.baseUrl}${request.endpoint}`,
        headers: {
          ...this.getAuthHeaders(),
          ...request.headers
        }
      });

      if (!response.success) {
        // Extract the actual Jotform error message from the response
        const jotformMessage = response.error?.details?.message || response.data?.message;
        const errorMessage = jotformMessage || response.error?.message || 'Request failed';
        const error = new Error(errorMessage);
        (error as any).code = response.error?.code || 'JOTFORM_ERROR';
        (error as any).statusCode = response.error?.statusCode;
        (error as any).details = response.error?.details;
        throw error;
      }

      return response.data?.content || response.data;
    } catch (error) {
      this.logger.error('Jotform request failed:', error);
      throw error;
    }
  }

  protected async performAction(actionId: string, input: any): Promise<any> {
    switch (actionId) {
      case 'get_form':
        return this.getForm(input.formId);
      case 'list_forms':
        return this.listForms(input);
      case 'get_form_questions':
        return this.getFormQuestions(input.formId);
      case 'get_form_submissions':
        return this.getFormResponses(input.formId, input);
      case 'delete_form':
        return this.deleteForm(input.formId);
      case 'get_submission':
        return this.getSubmission(input.submissionId);
      case 'create_submission':
        return this.createSubmission(input.formId, input.submissionData);
      case 'update_submission':
        return this.updateSubmission(input.submissionId, input.submissionData);
      case 'delete_submission':
        return this.deleteSubmission(input.submissionId);
      case 'get_user_info':
        return this.getUserInfo();
      case 'get_user_usage':
        return this.getUserUsage();
      default:
        throw new Error(`Unknown action: ${actionId}`);
    }
  }

  protected async cleanup(): Promise<void> {
    this.logger.log('Jotform connector cleanup completed');
  }

  // IFormConnector implementation
  async createForm(form: any): Promise<ConnectorResponse> {
    try {
      const result = await this.performRequest({
        method: 'POST',
        endpoint: '/form',
        headers: this.getAuthHeaders(),
        body: form
      });

      return {
        success: true,
        data: result,
        metadata: {
          timestamp: new Date()
        }
      };
    } catch (error) {
      return this.handleError(error as any, 'Failed to create form');
    }
  }

  async getFormResponses(formId: string, options?: any): Promise<ConnectorResponse> {
    try {
      const limit = options?.returnAll ? 1000 : (options?.limit || 20);
      const offset = options?.offset || 0;

      const queryParams: any = {
        limit,
        offset
      };

      if (options?.filter) {
        queryParams.filter = options.filter;
      }

      if (options?.orderBy) {
        queryParams.orderby = options.orderBy;
      }

      const result = await this.performRequest({
        method: 'GET',
        endpoint: `/form/${formId}/submissions`,
        headers: this.getAuthHeaders(),
        queryParams
      });

      return {
        success: true,
        data: result,
        metadata: {
          timestamp: new Date(),
          pagination: {
            page: Math.floor(offset / limit) + 1,
            pageSize: limit,
            total: result?.length || 0,
            hasNext: result && result.length >= limit
          }
        }
      };
    } catch (error) {
      return this.handleError(error as any, 'Failed to get form responses');
    }
  }

  async updateForm(formId: string, updates: any): Promise<ConnectorResponse> {
    try {
      const result = await this.performRequest({
        method: 'POST',
        endpoint: `/form/${formId}/properties`,
        headers: this.getAuthHeaders(),
        body: updates
      });

      return {
        success: true,
        data: result,
        metadata: {
          timestamp: new Date()
        }
      };
    } catch (error) {
      return this.handleError(error as any, 'Failed to update form');
    }
  }

  async getFormAnalytics(formId: string): Promise<ConnectorResponse> {
    try {
      const formInfo = await this.getForm(formId);

      if (!formInfo.success) {
        return formInfo;
      }

      const analytics = {
        totalSubmissions: formInfo.data.count || 0,
        newSubmissions: formInfo.data.new || 0,
        formStatus: formInfo.data.status,
        createdAt: formInfo.data.created_at,
        updatedAt: formInfo.data.updated_at,
        url: formInfo.data.url
      };

      return {
        success: true,
        data: analytics,
        metadata: {
          timestamp: new Date()
        }
      };
    } catch (error) {
      return this.handleError(error as any, 'Failed to get form analytics');
    }
  }

  // Jotform-specific methods
  async getForm(formId: string): Promise<ConnectorResponse> {
    try {
      const result = await this.performRequest({
        method: 'GET',
        endpoint: `/form/${formId}`,
        headers: this.getAuthHeaders()
      });

      return {
        success: true,
        data: result,
        metadata: {
          timestamp: new Date()
        }
      };
    } catch (error) {
      return this.handleError(error as any, 'Failed to get form');
    }
  }

  async listForms(options?: any): Promise<ConnectorResponse> {
    try {
      const limit = options?.returnAll ? 1000 : (options?.limit || 20);
      const offset = options?.offset || 0;

      const queryParams: any = {
        limit,
        offset
      };

      if (options?.filter) {
        queryParams.filter = options.filter;
      }

      if (options?.orderBy) {
        queryParams.orderby = options.orderBy;
      }

      const result = await this.performRequest({
        method: 'GET',
        endpoint: '/user/forms',
        headers: this.getAuthHeaders(),
        queryParams
      });

      return {
        success: true,
        data: {
          forms: result || [],
          totalCount: result?.length || 0
        },
        metadata: {
          timestamp: new Date(),
          pagination: {
            page: Math.floor(offset / limit) + 1,
            pageSize: limit,
            total: result?.length || 0,
            hasNext: result && result.length >= limit
          }
        }
      };
    } catch (error) {
      return this.handleError(error as any, 'Failed to list forms');
    }
  }

  async getFormQuestions(formId: string): Promise<ConnectorResponse> {
    try {
      const result = await this.performRequest({
        method: 'GET',
        endpoint: `/form/${formId}/questions`,
        headers: this.getAuthHeaders()
      });

      return {
        success: true,
        data: {
          questions: result || {}
        },
        metadata: {
          timestamp: new Date()
        }
      };
    } catch (error) {
      return this.handleError(error as any, 'Failed to get form questions');
    }
  }

  async deleteForm(formId: string): Promise<ConnectorResponse> {
    try {
      const result = await this.performRequest({
        method: 'DELETE',
        endpoint: `/form/${formId}`,
        headers: this.getAuthHeaders()
      });

      return {
        success: true,
        data: {
          success: true,
          message: 'Form deleted successfully'
        },
        metadata: {
          timestamp: new Date()
        }
      };
    } catch (error) {
      return this.handleError(error as any, 'Failed to delete form');
    }
  }

  async getSubmission(submissionId: string): Promise<ConnectorResponse> {
    try {
      const result = await this.performRequest({
        method: 'GET',
        endpoint: `/submission/${submissionId}`,
        headers: this.getAuthHeaders()
      });

      return {
        success: true,
        data: result,
        metadata: {
          timestamp: new Date()
        }
      };
    } catch (error) {
      return this.handleError(error as any, 'Failed to get submission');
    }
  }

  async createSubmission(formId: string, submissionData: any): Promise<ConnectorResponse> {
    try {
      const result = await this.performRequest({
        method: 'POST',
        endpoint: `/form/${formId}/submissions`,
        headers: {
          ...this.getAuthHeaders(),
          'Content-Type': 'application/x-www-form-urlencoded'
        },
        body: submissionData
      });

      return {
        success: true,
        data: {
          submissionID: result?.submissionID || result?.id,
          success: true
        },
        metadata: {
          timestamp: new Date()
        }
      };
    } catch (error) {
      return this.handleError(error as any, 'Failed to create submission');
    }
  }

  async updateSubmission(submissionId: string, submissionData: any): Promise<ConnectorResponse> {
    try {
      const result = await this.performRequest({
        method: 'POST',
        endpoint: `/submission/${submissionId}`,
        headers: {
          ...this.getAuthHeaders(),
          'Content-Type': 'application/x-www-form-urlencoded'
        },
        body: submissionData
      });

      return {
        success: true,
        data: {
          success: true,
          submissionID: submissionId
        },
        metadata: {
          timestamp: new Date()
        }
      };
    } catch (error) {
      return this.handleError(error as any, 'Failed to update submission');
    }
  }

  async deleteSubmission(submissionId: string): Promise<ConnectorResponse> {
    try {
      const result = await this.performRequest({
        method: 'DELETE',
        endpoint: `/submission/${submissionId}`,
        headers: this.getAuthHeaders()
      });

      return {
        success: true,
        data: {
          success: true,
          message: 'Submission deleted successfully'
        },
        metadata: {
          timestamp: new Date()
        }
      };
    } catch (error) {
      return this.handleError(error as any, 'Failed to delete submission');
    }
  }

  async getUserInfo(): Promise<ConnectorResponse> {
    try {
      const result = await this.performRequest({
        method: 'GET',
        endpoint: '/user',
        headers: this.getAuthHeaders()
      });

      return {
        success: true,
        data: result,
        metadata: {
          timestamp: new Date()
        }
      };
    } catch (error) {
      return this.handleError(error as any, 'Failed to get user info');
    }
  }

  async getUserUsage(): Promise<ConnectorResponse> {
    try {
      const result = await this.performRequest({
        method: 'GET',
        endpoint: '/user/usage',
        headers: this.getAuthHeaders()
      });

      return {
        success: true,
        data: result,
        metadata: {
          timestamp: new Date()
        }
      };
    } catch (error) {
      return this.handleError(error as any, 'Failed to get user usage');
    }
  }

  // Webhook support for triggers
  async processWebhook(payload: any, headers: Record<string, string>): Promise<any[]> {
    try {
      // Parse multipart form data from Jotform webhook
      const submissionData = payload;

      // Extract submission ID and form ID
      const submissionID = submissionData.submissionID || submissionData.id;
      const formID = submissionData.formID || submissionData.form_id;

      // Process the webhook event
      const event = {
        eventType: 'jotform:form_submission',
        timestamp: new Date(),
        data: {
          submissionID,
          formID,
          ip: submissionData.ip,
          created_at: submissionData.created_at,
          status: submissionData.status,
          answers: submissionData.answers || submissionData
        }
      };

      return [event];
    } catch (error) {
      this.logger.error('Failed to process Jotform webhook:', error);
      throw error;
    }
  }

  private getAuthHeaders(): Record<string, string> {
    return {
      'APIKEY': this.config.credentials.apiKey
    };
  }

  private getActions(): ConnectorAction[] {
    return [
      {
        id: 'get_form',
        name: 'Get Form',
        description: 'Retrieve detailed information about a specific form',
        inputSchema: {
          formId: { type: 'string', required: true, description: 'Form ID' }
        },
        outputSchema: {
          id: { type: 'string', description: 'Form ID' },
          title: { type: 'string', description: 'Form title' },
          status: { type: 'string', description: 'Form status' },
          url: { type: 'string', description: 'Form URL' }
        }
      },
      {
        id: 'list_forms',
        name: 'List Forms',
        description: 'Get a list of all forms in your account',
        inputSchema: {
          limit: { type: 'number', description: 'Limit' },
          offset: { type: 'number', description: 'Offset' },
          returnAll: { type: 'boolean', description: 'Return all' }
        },
        outputSchema: {
          forms: { type: 'array', description: 'Array of forms' }
        }
      },
      {
        id: 'get_form_questions',
        name: 'Get Form Questions',
        description: 'Retrieve all questions/fields from a form',
        inputSchema: {
          formId: { type: 'string', required: true, description: 'Form ID' }
        },
        outputSchema: {
          questions: { type: 'object', description: 'Form questions' }
        }
      },
      {
        id: 'get_form_submissions',
        name: 'Get Form Submissions',
        description: 'Retrieve all submissions for a specific form',
        inputSchema: {
          formId: { type: 'string', required: true, description: 'Form ID' },
          limit: { type: 'number', description: 'Limit' },
          returnAll: { type: 'boolean', description: 'Return all' }
        },
        outputSchema: {
          submissions: { type: 'array', description: 'Array of submissions' }
        }
      },
      {
        id: 'delete_form',
        name: 'Delete Form',
        description: 'Delete a form permanently',
        inputSchema: {
          formId: { type: 'string', required: true, description: 'Form ID' }
        },
        outputSchema: {
          success: { type: 'boolean', description: 'Success status' }
        }
      },
      {
        id: 'get_submission',
        name: 'Get Submission',
        description: 'Retrieve a specific form submission by ID',
        inputSchema: {
          submissionId: { type: 'string', required: true, description: 'Submission ID' }
        },
        outputSchema: {
          id: { type: 'string', description: 'Submission ID' },
          answers: { type: 'object', description: 'Submission answers' }
        }
      },
      {
        id: 'create_submission',
        name: 'Create Submission',
        description: 'Create a new form submission programmatically',
        inputSchema: {
          formId: { type: 'string', required: true, description: 'Form ID' },
          submissionData: { type: 'object', required: true, description: 'Submission data' }
        },
        outputSchema: {
          submissionID: { type: 'string', description: 'Created submission ID' }
        }
      },
      {
        id: 'update_submission',
        name: 'Update Submission',
        description: 'Update an existing form submission',
        inputSchema: {
          submissionId: { type: 'string', required: true, description: 'Submission ID' },
          submissionData: { type: 'object', required: true, description: 'Updated data' }
        },
        outputSchema: {
          success: { type: 'boolean', description: 'Success status' }
        }
      },
      {
        id: 'delete_submission',
        name: 'Delete Submission',
        description: 'Delete a form submission permanently',
        inputSchema: {
          submissionId: { type: 'string', required: true, description: 'Submission ID' }
        },
        outputSchema: {
          success: { type: 'boolean', description: 'Success status' }
        }
      },
      {
        id: 'get_user_info',
        name: 'Get User Info',
        description: 'Retrieve information about the authenticated user account',
        inputSchema: {},
        outputSchema: {
          username: { type: 'string', description: 'Username' },
          email: { type: 'string', description: 'Email' }
        }
      },
      {
        id: 'get_user_usage',
        name: 'Get API Usage',
        description: 'Get API usage statistics for the current month',
        inputSchema: {},
        outputSchema: {
          submissions: { type: 'number', description: 'Submissions count' },
          api_calls: { type: 'number', description: 'API calls count' }
        }
      }
    ];
  }

  private getTriggers(): ConnectorTrigger[] {
    return [
      {
        id: 'form_submission',
        name: 'Form Submission',
        description: 'Triggers when a new form submission is received',
        eventType: 'jotform:form_submission',
        outputSchema: {
          submissionID: { type: 'string', description: 'Submission ID' },
          formID: { type: 'string', description: 'Form ID' },
          ip: { type: 'string', description: 'Submitter IP' },
          created_at: { type: 'string', description: 'Submission timestamp' },
          answers: { type: 'object', description: 'Form answers' }
        },
        webhookRequired: true
      }
    ];
  }
}
