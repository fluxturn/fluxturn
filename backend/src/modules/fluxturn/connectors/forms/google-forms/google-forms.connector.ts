import { Injectable } from '@nestjs/common';
import { BaseConnector } from '../../base/base.connector';
import { IConnector } from '../../base/connector.interface';
import {
  ConnectorMetadata,
  ConnectorType,
  ConnectorCategory,
  ConnectorRequest,
  AuthType,
  ConnectorAction,
  ConnectorTrigger,
  OAuthTokens,
  ConnectorEventType
} from '../../types';
import { ApiUtils } from '../../utils/api.utils';

// Google Forms-specific interfaces
export interface FormsGetRequest {
  formId: string;
}

export interface FormsListResponsesRequest {
  formId: string;
  pageSize?: number;
  pageToken?: string;
}

@Injectable()
export class GoogleFormsConnector extends BaseConnector implements IConnector {
  private baseUrl = 'https://forms.googleapis.com/v1';

  constructor(
    private readonly apiUtils: ApiUtils
  ) {
    super();
  }

  getMetadata(): ConnectorMetadata {
    return {
      name: 'Google Forms',
      description: 'Google Forms integration for creating forms, managing questions, and collecting responses',
      version: '1.0.0',
      category: ConnectorCategory.FORMS,
      type: ConnectorType.GOOGLE_FORMS,
      logoUrl: 'https://www.gstatic.com/images/branding/product/2x/forms_2020q4_48dp.png',
      documentationUrl: 'https://developers.google.com/forms',
      authType: AuthType.OAUTH2,
      requiredScopes: [
        'https://www.googleapis.com/auth/forms.body',
        'https://www.googleapis.com/auth/forms.body.readonly',
        'https://www.googleapis.com/auth/forms.responses.readonly'
      ],
      actions: this.getActions(),
      triggers: this.getTriggers(),
      rateLimit: {
        requestsPerSecond: 10,
        requestsPerMinute: 100
      },
      webhookSupport: false
    };
  }

  protected async initializeConnection(): Promise<void> {
    this.logger.log('[initializeConnection] Credential keys:', Object.keys(this.config.credentials || {}).join(', '));

    const hasAccessToken = !!this.config.credentials?.accessToken;
    const hasRefreshToken = !!this.config.credentials?.refreshToken;
    const expiresAt = this.config.credentials?.expiresAt;

    this.logger.log(`[initializeConnection] Has accessToken: ${hasAccessToken}, Has refreshToken: ${hasRefreshToken}, expiresAt: ${expiresAt}`);

    // Check if we need to refresh the OAuth token
    if (expiresAt) {
      const expirationTime = new Date(expiresAt).getTime();
      const currentTime = Date.now();
      const fiveMinutesInMs = 5 * 60 * 1000;

      this.logger.log(`[initializeConnection] Token expiration check - Current: ${new Date(currentTime).toISOString()}, Expires: ${new Date(expirationTime).toISOString()}, Expired: ${currentTime >= expirationTime}`);

      // Refresh if expired or expiring within 5 minutes
      if (currentTime >= expirationTime - fiveMinutesInMs) {
        this.logger.log('OAuth token expired or expiring soon, refreshing...');
        try {
          await this.refreshTokens();
          this.logger.log('OAuth token refreshed successfully');
        } catch (error) {
          this.logger.error('Failed to refresh OAuth token:', error.message);
          throw new Error('OAuth token expired. Please reconnect your Google Forms account.');
        }
      }
    } else if (!hasAccessToken) {
      throw new Error('No access token found. Please reconnect your Google Forms account.');
    } else {
      this.logger.warn('No expiration time found for access token. Token may be expired.');
    }

    this.logger.log('Google Forms connector initialized successfully');
  }

  protected async performConnectionTest(): Promise<boolean> {
    try {
      // Test by fetching user info from Google OAuth
      const userInfoUrl = 'https://www.googleapis.com/oauth2/v2/userinfo';
      await this.performRequest({
        method: 'GET',
        endpoint: userInfoUrl,
        headers: this.getAuthHeaders()
      });
      return true;
    } catch (error) {
      this.logger.error('Connection test failed:', error.message);
      return false;
    }
  }

  protected async performHealthCheck(): Promise<void> {
    if (!this.config?.credentials?.accessToken) {
      throw new Error('No access token configured');
    }
  }

  protected async performRequest(request: ConnectorRequest): Promise<any> {
    const response = await this.apiUtils.executeRequest(request, {
      timeout: 30000,
      retries: 3
    });

    if (!response.success) {
      throw new Error(response.error?.message || 'Request failed');
    }

    return response.data;
  }

  protected async performAction(actionId: string, input: any): Promise<any> {
    this.logger.log(`Performing action: ${actionId}`);

    switch (actionId) {
      case 'form_get':
        return await this.getForm(input);
      case 'form_create':
        return await this.createForm(input);
      case 'form_update':
        return await this.updateForm(input);
      case 'responses_list':
        return await this.listResponses(input);
      case 'response_get':
        return await this.getResponse(input);
      case 'question_create':
        return await this.createQuestion(input);
      case 'watch_create':
        return await this.createWatch(input);
      case 'watch_renew':
        return await this.renewWatch(input);
      case 'watch_delete':
        return await this.deleteWatch(input);
      default:
        throw new Error(`Unknown action: ${actionId}`);
    }
  }

  protected async cleanup(): Promise<void> {
    this.logger.log('Google Forms connector cleanup completed');
  }

  // Action implementations
  private async getForm(input: FormsGetRequest): Promise<any> {
    const { formId } = input;

    if (!formId) {
      throw new Error('Form ID is required');
    }

    const data = await this.performRequest({
      method: 'GET',
      endpoint: `${this.baseUrl}/forms/${formId}`,
      headers: this.getAuthHeaders()
    });

    return data;
  }

  private async listResponses(input: FormsListResponsesRequest): Promise<any> {
    const { formId, pageSize, pageToken } = input;

    if (!formId) {
      throw new Error('Form ID is required');
    }

    const queryParams: Record<string, any> = {};
    if (pageSize) queryParams.pageSize = pageSize;
    if (pageToken) queryParams.pageToken = pageToken;

    const data = await this.performRequest({
      method: 'GET',
      endpoint: `${this.baseUrl}/forms/${formId}/responses`,
      headers: this.getAuthHeaders(),
      queryParams
    });

    return data;
  }

  private async getResponse(input: { formId: string; responseId: string }): Promise<any> {
    const { formId, responseId } = input;

    if (!formId || !responseId) {
      throw new Error('Form ID and Response ID are required');
    }

    const data = await this.performRequest({
      method: 'GET',
      endpoint: `${this.baseUrl}/forms/${formId}/responses/${responseId}`,
      headers: this.getAuthHeaders()
    });

    return data;
  }

  private async createForm(input: { title: string; documentTitle?: string; description?: string }): Promise<any> {
    const { title, documentTitle, description } = input;

    if (!title) {
      throw new Error('Form title is required');
    }

    const formData: any = {
      info: {
        title: title,
        documentTitle: documentTitle || title
      }
    };

    if (description) {
      formData.info.description = description;
    }

    const data = await this.performRequest({
      method: 'POST',
      endpoint: `${this.baseUrl}/forms`,
      headers: this.getAuthHeaders(),
      body: formData
    });

    return data;
  }

  private async updateForm(input: { formId: string; title?: string; description?: string }): Promise<any> {
    const { formId, title, description } = input;

    if (!formId) {
      throw new Error('Form ID is required');
    }

    const requests: any[] = [];

    if (title) {
      requests.push({
        updateFormInfo: {
          info: { title },
          updateMask: 'title'
        }
      });
    }

    if (description) {
      requests.push({
        updateFormInfo: {
          info: { description },
          updateMask: 'description'
        }
      });
    }

    if (requests.length === 0) {
      throw new Error('At least one field (title or description) is required to update');
    }

    const data = await this.performRequest({
      method: 'POST',
      endpoint: `${this.baseUrl}/forms/${formId}:batchUpdate`,
      headers: this.getAuthHeaders(),
      body: { requests }
    });

    return data;
  }

  private async createQuestion(input: { formId: string; questionTitle: string; questionType: string; required?: boolean; options?: any[]; description?: string }): Promise<any> {
    const { formId, questionTitle, questionType, required, options, description } = input;

    if (!formId || !questionTitle || !questionType) {
      throw new Error('Form ID, question title, and question type are required');
    }

    // Build the question object based on type - only one question kind allowed
    const question: any = {
      required: required || false
    };

    // Handle different question types
    switch (questionType) {
      case 'SHORT_ANSWER':
        question.textQuestion = { paragraph: false };
        break;
      case 'PARAGRAPH':
        question.textQuestion = { paragraph: true };
        break;
      case 'RADIO':
      case 'CHECKBOX':
      case 'DROP_DOWN':
        // Handle different option formats: array, string (comma/newline/space-separated), or empty
        let optionsArray: any[] = [];
        const optionsInput = options as any;
        if (Array.isArray(optionsInput)) {
          optionsArray = optionsInput;
        } else if (typeof optionsInput === 'string' && (optionsInput as string).trim()) {
          const optStr = (optionsInput as string).trim();
          // Try comma-separated first
          if (optStr.includes(',')) {
            optionsArray = optStr.split(',').map(s => s.trim()).filter(s => s);
          }
          // Try newline-separated
          else if (optStr.includes('\n')) {
            optionsArray = optStr.split('\n').map(s => s.trim()).filter(s => s);
          }
          // Try semicolon-separated
          else if (optStr.includes(';')) {
            optionsArray = optStr.split(';').map(s => s.trim()).filter(s => s);
          }
          // Try space-separated (if multiple words and looks like options)
          else if (optStr.includes(' ')) {
            const spaceSplit = optStr.split(/\s+/).map(s => s.trim()).filter(s => s);
            // Only use space-splitting if we get multiple items
            if (spaceSplit.length > 1) {
              optionsArray = spaceSplit;
            } else {
              optionsArray = [optStr];
            }
          }
          // Single option
          else {
            optionsArray = [optStr];
          }
        } else if (optionsInput && typeof optionsInput === 'object') {
          // Handle object format - try to extract values
          optionsArray = Object.values(optionsInput);
        }

        // Ensure at least one option for choice questions
        if (optionsArray.length === 0) {
          optionsArray = ['Option 1'];
        }

        question.choiceQuestion = {
          type: questionType,
          options: optionsArray.map((opt: any) => ({ value: typeof opt === 'string' ? opt : (opt?.value || String(opt)) }))
        };
        break;
      case 'SCALE':
        question.scaleQuestion = {
          low: 1,
          high: 5,
          lowLabel: '',
          highLabel: ''
        };
        break;
      case 'DATE':
        question.dateQuestion = {
          includeTime: false,
          includeYear: true
        };
        break;
      case 'TIME':
        question.timeQuestion = {
          duration: false
        };
        break;
      default:
        question.textQuestion = { paragraph: false };
    }

    const requestItem: any = {
      createItem: {
        item: {
          title: questionTitle,
          description: description || '',
          questionItem: { question }
        },
        location: { index: 0 }
      }
    };

    const data = await this.performRequest({
      method: 'POST',
      endpoint: `${this.baseUrl}/forms/${formId}:batchUpdate`,
      headers: this.getAuthHeaders(),
      body: { requests: [requestItem] }
    });

    return data;
  }

  private async createWatch(input: { formId: string; eventType: string; topicName: string }): Promise<any> {
    const { formId, eventType, topicName } = input;

    if (!formId || !eventType || !topicName) {
      throw new Error('Form ID, event type, and topic name are required');
    }

    const data = await this.performRequest({
      method: 'POST',
      endpoint: `${this.baseUrl}/forms/${formId}/watches`,
      headers: this.getAuthHeaders(),
      body: {
        watch: {
          target: {
            topic: {
              topicName
            }
          },
          eventType
        }
      }
    });

    return data;
  }

  private async renewWatch(input: { formId: string; watchId: string }): Promise<any> {
    const { formId, watchId } = input;

    if (!formId || !watchId) {
      throw new Error('Form ID and Watch ID are required');
    }

    const data = await this.performRequest({
      method: 'POST',
      endpoint: `${this.baseUrl}/forms/${formId}/watches/${watchId}:renew`,
      headers: this.getAuthHeaders()
    });

    return data;
  }

  private async deleteWatch(input: { formId: string; watchId: string }): Promise<any> {
    const { formId, watchId } = input;

    if (!formId || !watchId) {
      throw new Error('Form ID and Watch ID are required');
    }

    await this.performRequest({
      method: 'DELETE',
      endpoint: `${this.baseUrl}/forms/${formId}/watches/${watchId}`,
      headers: this.getAuthHeaders()
    });

    return { success: true };
  }

  // Helper methods
  private getAuthHeaders(): Record<string, string> {
    const accessToken = this.config.credentials?.accessToken;
    if (!accessToken) {
      throw new Error('No access token available');
    }

    return {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json'
    };
  }

  async refreshTokens(): Promise<OAuthTokens> {
    const refreshToken = this.config.credentials?.refreshToken;
    if (!refreshToken) {
      throw new Error('No refresh token available');
    }

    const clientId = this.config.settings?.client_id || process.env.GOOGLE_OAUTH_CLIENT_ID;
    const clientSecret = this.config.settings?.client_secret || process.env.GOOGLE_OAUTH_CLIENT_SECRET;

    if (!clientId || !clientSecret) {
      throw new Error('OAuth client credentials not configured');
    }

    const tokenResponse = await this.apiUtils.executeRequest({
      method: 'POST',
      endpoint: 'https://oauth2.googleapis.com/token',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: new URLSearchParams({
        client_id: clientId,
        client_secret: clientSecret,
        refresh_token: refreshToken,
        grant_type: 'refresh_token'
      }).toString()
    });

    if (!tokenResponse.success || !tokenResponse.data) {
      throw new Error('Failed to refresh token');
    }

    const { access_token, expires_in, refresh_token } = tokenResponse.data;

    // Update credentials
    this.config.credentials.accessToken = access_token;
    if (refresh_token) {
      this.config.credentials.refreshToken = refresh_token;
    }
    this.config.credentials.expiresAt = new Date(Date.now() + expires_in * 1000).toISOString();

    // Emit token refresh event
    this.emit({
      type: ConnectorEventType.TOKEN_REFRESHED,
      connectorId: this.config.id,
      timestamp: new Date(),
      data: {
        accessToken: access_token,
        refreshToken: refresh_token || refreshToken,
        expiresAt: this.config.credentials.expiresAt
      },
      source: 'manual'
    });

    return {
      accessToken: access_token,
      refreshToken: refresh_token || refreshToken,
      expiresAt: new Date(Date.now() + expires_in * 1000)
    };
  }

  private getActions(): ConnectorAction[] {
    return [
      {
        id: 'form_get',
        name: 'Get Form',
        description: 'Get details of a specific form',
        inputSchema: {
          formId: { type: 'string', required: true, label: 'Form ID', description: 'The ID of the form to retrieve' }
        },
        outputSchema: {
          formId: { type: 'string' },
          info: { type: 'object' },
          items: { type: 'array' }
        }
      },
      {
        id: 'form_create',
        name: 'Create Form',
        description: 'Create a new Google Form',
        inputSchema: {
          title: { type: 'string', required: true, label: 'Form Title', description: 'The title of the form' },
          documentTitle: { type: 'string', required: false, label: 'Document Title', description: 'The document title' },
          description: { type: 'string', required: false, label: 'Description', description: 'Form description' }
        },
        outputSchema: {
          formId: { type: 'string' },
          responderUri: { type: 'string' },
          formUri: { type: 'string' }
        }
      },
      {
        id: 'form_update',
        name: 'Update Form',
        description: 'Update form title or description',
        inputSchema: {
          formId: { type: 'string', required: true, label: 'Form ID', description: 'The ID of the form to update' },
          title: { type: 'string', required: false, label: 'Title', description: 'New form title' },
          description: { type: 'string', required: false, label: 'Description', description: 'New form description' }
        },
        outputSchema: {
          success: { type: 'boolean' },
          form: { type: 'object' }
        }
      },
      {
        id: 'responses_list',
        name: 'List Responses',
        description: 'List all responses for a form',
        inputSchema: {
          formId: { type: 'string', required: true, label: 'Form ID', description: 'The ID of the form' },
          pageSize: { type: 'number', required: false, label: 'Page Size', description: 'Maximum number of responses to return' }
        },
        outputSchema: {
          responses: { type: 'array' },
          nextPageToken: { type: 'string' }
        }
      },
      {
        id: 'response_get',
        name: 'Get Response',
        description: 'Get a specific response by ID',
        inputSchema: {
          formId: { type: 'string', required: true, label: 'Form ID', description: 'The ID of the form' },
          responseId: { type: 'string', required: true, label: 'Response ID', description: 'The ID of the response' }
        },
        outputSchema: {
          responseId: { type: 'string' },
          createTime: { type: 'string' },
          lastSubmittedTime: { type: 'string' },
          answers: { type: 'object' }
        }
      },
      {
        id: 'question_create',
        name: 'Add Question',
        description: 'Add a question to a form',
        inputSchema: {
          formId: { type: 'string', required: true, label: 'Form ID', description: 'The ID of the form' },
          questionTitle: { type: 'string', required: true, label: 'Question Title', description: 'The question text' },
          questionType: { type: 'string', required: true, label: 'Question Type', description: 'Type of question' },
          required: { type: 'boolean', required: false, label: 'Required', description: 'Whether the question is required' },
          options: { type: 'array', required: false, label: 'Options', description: 'Answer options for choice questions' }
        },
        outputSchema: {
          questionId: { type: 'string' },
          success: { type: 'boolean' }
        }
      },
      {
        id: 'watch_create',
        name: 'Create Watch',
        description: 'Set up a watch to receive form response notifications',
        inputSchema: {
          formId: { type: 'string', required: true, label: 'Form ID', description: 'The ID of the form' },
          eventType: { type: 'string', required: true, label: 'Event Type', description: 'Type of events to watch' },
          topicName: { type: 'string', required: true, label: 'Pub/Sub Topic', description: 'Google Cloud Pub/Sub topic name' }
        },
        outputSchema: {
          watchId: { type: 'string' },
          expireTime: { type: 'string' }
        }
      },
      {
        id: 'watch_renew',
        name: 'Renew Watch',
        description: 'Renew an existing watch before it expires',
        inputSchema: {
          formId: { type: 'string', required: true, label: 'Form ID', description: 'The ID of the form' },
          watchId: { type: 'string', required: true, label: 'Watch ID', description: 'The ID of the watch to renew' }
        },
        outputSchema: {
          expireTime: { type: 'string' }
        }
      },
      {
        id: 'watch_delete',
        name: 'Delete Watch',
        description: 'Delete a watch to stop receiving notifications',
        inputSchema: {
          formId: { type: 'string', required: true, label: 'Form ID', description: 'The ID of the form' },
          watchId: { type: 'string', required: true, label: 'Watch ID', description: 'The ID of the watch to delete' }
        },
        outputSchema: {
          success: { type: 'boolean' }
        }
      }
    ];
  }

  private getTriggers(): ConnectorTrigger[] {
    return [
      {
        id: 'new_response',
        name: 'New Form Response',
        description: 'Triggers when a new response is submitted to a form',
        eventType: 'form_response',
        webhookRequired: false,
        pollingEnabled: true,
        outputSchema: {
          responseId: { type: 'string' },
          formId: { type: 'string' },
          createTime: { type: 'string' },
          answers: { type: 'object' }
        }
      }
    ];
  }
}
