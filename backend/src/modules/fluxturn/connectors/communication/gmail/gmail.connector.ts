import { Request } from 'express';
import { Injectable } from '@nestjs/common';
import { BaseConnector } from '../../base/base.connector';
import { ICommunicationConnector } from '../../base/connector.interface';
import {
  ConnectorMetadata,
  ConnectorType,
  ConnectorCategory,
  ConnectorRequest,
  ConnectorResponse,
  AuthType,
  PaginatedRequest,
  ConnectorAction,
  ConnectorTrigger,
  OAuthTokens
} from '../../types';
import { AuthUtils } from '../../utils/auth.utils';
import { ApiUtils } from '../../utils/api.utils';

// Gmail-specific interfaces
export interface GmailMessage {
  id: string;
  threadId: string;
  labelIds: string[];
  snippet: string;
  historyId: string;
  internalDate: string;
  payload: {
    partId: string;
    mimeType: string;
    filename: string;
    headers: Array<{ name: string; value: string }>;
    body: {
      attachmentId?: string;
      size: number;
      data?: string;
    };
    parts?: any[];
  };
}

export interface GmailSendRequest {
  to: string | string[];
  cc?: string | string[];
  bcc?: string | string[];
  subject: string;
  body: string;
  isHtml?: boolean;
  attachments?: Array<{
    filename: string;
    content: string; // base64 encoded
    mimeType: string;
  }>;
  replyToMessageId?: string;
  threadId?: string;
}

export interface GmailSearchOptions {
  query?: string;
  labelIds?: string[];
  includeSpamTrash?: boolean;
  maxResults?: number;
  pageToken?: string;
}

export interface GmailLabel {
  id: string;
  name: string;
  messageListVisibility: string;
  labelListVisibility: string;
  type: string;
  messagesTotal?: number;
  messagesUnread?: number;
  threadsTotal?: number;
  threadsUnread?: number;
  color?: {
    textColor: string;
    backgroundColor: string;
  };
}

export interface GmailDraft {
  id: string;
  message: GmailMessage;
}

@Injectable()
export class GmailConnector extends BaseConnector implements ICommunicationConnector {
  private baseUrl = 'https://gmail.googleapis.com/gmail/v1';
  
  constructor(
    private readonly authUtils: AuthUtils,
    private readonly apiUtils: ApiUtils
  ) {
    super();
  }

  getMetadata(): ConnectorMetadata {
    return {
      name: 'Gmail',
      description: 'Google Gmail email service connector',
      version: '1.0.0',
      category: ConnectorCategory.COMMUNICATION,
      type: ConnectorType.EMAIL,
      logoUrl: 'https://ssl.gstatic.com/ui/v1/icons/mail/rfr/gmail.ico',
      documentationUrl: 'https://developers.google.com/gmail/api',
      authType: AuthType.OAUTH2,
      requiredScopes: [
        'https://www.googleapis.com/auth/gmail.send',
        'https://www.googleapis.com/auth/gmail.readonly',
        'https://www.googleapis.com/auth/gmail.modify',
        'https://www.googleapis.com/auth/gmail.compose'
      ],
      actions: this.getActions(),
      triggers: this.getTriggers(),
      rateLimit: {
        requestsPerSecond: 10,
        requestsPerMinute: 250,
        requestsPerDay: 1000000000
      },
      webhookSupport: true
    };
  }

  protected async initializeConnection(): Promise<void> {
    // Test connection by getting user profile
    const response = await this.performRequest({
      method: 'GET',
      endpoint: `${this.baseUrl}/users/me/profile`,
      headers: this.getAuthHeaders()
    });

    if (!response.emailAddress) {
      throw new Error('Failed to initialize Gmail connection');
    }

    this.logger.log(`Gmail connector initialized for: ${response.emailAddress}`);
  }

  protected async performConnectionTest(): Promise<boolean> {
    try {
      const response = await this.performRequest({
        method: 'GET',
        endpoint: `${this.baseUrl}/users/me/profile`,
        headers: this.getAuthHeaders()
      });
      return !!response.emailAddress;
    } catch (error) {
      return false;
    }
  }

  protected async performHealthCheck(): Promise<void> {
    const response = await this.performRequest({
      method: 'GET',
      endpoint: `${this.baseUrl}/users/me/labels`,
      headers: this.getAuthHeaders(),
      queryParams: { maxResults: 1 }
    });

    if (!response.labels) {
      throw new Error('Gmail health check failed');
    }
  }

  protected async performRequest(request: ConnectorRequest): Promise<any> {
    const response = await this.apiUtils.executeRequest(request, {
      timeout: 30000,
      retries: 3
    });

    if (!response.success) {
      throw new Error(response.error?.message || 'Gmail API request failed');
    }

    return response.data;
  }

  protected async performAction(actionId: string, input: any): Promise<any> {
    switch (actionId) {
      case 'send_email':
        return this.sendEmail(input);
      case 'get_emails':
        return this.getEmails(input.options);
      case 'create_draft':
        return this.createDraft(input);
      case 'add_label':
        return this.addLabel(input.messageId, input.labelIds);
      case 'search_emails':
        return this.searchEmails(input.options);
      case 'delete_email':
        return this.deleteEmail(input.messageId);
      case 'mark_as_read':
        return this.markAsRead(input.messageId);
      case 'get_labels':
        return this.getLabels();
      case 'create_label':
        return this.createLabel(input.name, input.color);
      default:
        throw new Error(`Unknown action: ${actionId}`);
    }
  }

  protected async cleanup(): Promise<void> {
    this.logger.log('Gmail connector cleanup completed');
  }

  // ICommunicationConnector implementation
  async sendMessage(to: string | string[], message: any): Promise<ConnectorResponse> {
    const recipients = Array.isArray(to) ? to : [to];
    const gmailRequest: GmailSendRequest = {
      to: recipients,
      subject: message.subject || '',
      body: message.body || message.text || '',
      isHtml: message.isHtml || false,
      cc: message.cc,
      bcc: message.bcc,
      attachments: message.attachments,
      replyToMessageId: message.replyToMessageId,
      threadId: message.threadId
    };

    return this.sendEmail(gmailRequest);
  }

  async getMessages(options?: PaginatedRequest): Promise<ConnectorResponse> {
    const searchOptions: GmailSearchOptions = {
      maxResults: options?.pageSize || 10,
      pageToken: options?.filters?.pageToken,
      query: options?.filters?.query,
      labelIds: options?.filters?.labelIds,
      includeSpamTrash: options?.filters?.includeSpamTrash || false
    };

    return this.getEmails(searchOptions);
  }

  async getContact(contactId: string): Promise<ConnectorResponse> {
    // Gmail API doesn't have direct contact endpoints
    // This would typically integrate with Google People API
    throw new Error('Direct contact retrieval not supported. Use Google People API connector instead.');
  }

  async upsertContact(contact: any): Promise<ConnectorResponse> {
    // Gmail API doesn't have direct contact endpoints
    // This would typically integrate with Google People API
    throw new Error('Contact management not supported. Use Google People API connector instead.');
  }

  // Gmail-specific methods
  async sendEmail(request: GmailSendRequest): Promise<ConnectorResponse> {
    try {
      // Normalize to array format
      const normalizedRequest = {
        ...request,
        to: Array.isArray(request.to) ? request.to : [request.to],
        cc: request.cc ? (Array.isArray(request.cc) ? request.cc : [request.cc]) : undefined,
        bcc: request.bcc ? (Array.isArray(request.bcc) ? request.bcc : [request.bcc]) : undefined
      };

      const rawMessage = this.createRawMessage(normalizedRequest);

      const response = await this.performRequest({
        method: 'POST',
        endpoint: `${this.baseUrl}/users/me/messages/send`,
        headers: {
          ...this.getAuthHeaders(),
          'Content-Type': 'application/json'
        },
        body: {
          raw: rawMessage
        }
      });

      return {
        success: true,
        data: {
          messageId: response.id,
          threadId: response.threadId,
          labelIds: response.labelIds
        }
      };
    } catch (error) {
      return this.handleError(error as any, 'Failed to send email');
    }
  }

  async getEmails(options?: GmailSearchOptions): Promise<ConnectorResponse> {
    try {
      const params: any = {
        maxResults: options?.maxResults || 10,
        pageToken: options?.pageToken,
        q: options?.query,
        labelIds: options?.labelIds,
        includeSpamTrash: options?.includeSpamTrash || false
      };

      // Remove undefined values
      Object.keys(params).forEach(key => {
        if (params[key] === undefined) {
          delete params[key];
        }
      });

      const response = await this.performRequest({
        method: 'GET',
        endpoint: `${this.baseUrl}/users/me/messages`,
        headers: this.getAuthHeaders(),
        queryParams: params
      });

      // Get full message details for each message
      const messages: any[] = [];
      if (response.messages) {
        for (const message of response.messages.slice(0, 5)) { // Limit to prevent rate limiting
          try {
            const fullMessage = await this.performRequest({
              method: 'GET',
              endpoint: `${this.baseUrl}/users/me/messages/${message.id}`,
              headers: this.getAuthHeaders()
            });
            messages.push(fullMessage);
          } catch (error) {
            this.logger.warn(`Failed to fetch message ${message.id}:`, error);
          }
        }
      }

      return {
        success: true,
        data: {
          messages,
          nextPageToken: response.nextPageToken,
          resultSizeEstimate: response.resultSizeEstimate
        },
        metadata: {
          timestamp: new Date(),
          pagination: {
            page: 1,
            pageSize: options?.maxResults || 10,
            hasNext: !!response.nextPageToken,
            total: 0
          }
        }
      };
    } catch (error) {
      return this.handleError(error as any, 'Failed to get emails');
    }
  }

  async createDraft(request: GmailSendRequest): Promise<ConnectorResponse> {
    try {
      const rawMessage = this.createRawMessage(request);
      
      const response = await this.performRequest({
        method: 'POST',
        endpoint: `${this.baseUrl}/users/me/drafts`,
        headers: {
          ...this.getAuthHeaders(),
          'Content-Type': 'application/json'
        },
        body: {
          message: {
            raw: rawMessage
          }
        }
      });

      return {
        success: true,
        data: {
          draftId: response.id,
          messageId: response.message.id,
          threadId: response.message.threadId
        }
      };
    } catch (error) {
      return this.handleError(error as any, 'Failed to create draft');
    }
  }

  async addLabel(messageId: string, labelIds: string[]): Promise<ConnectorResponse> {
    try {
      const response = await this.performRequest({
        method: 'POST',
        endpoint: `${this.baseUrl}/users/me/messages/${messageId}/modify`,
        headers: {
          ...this.getAuthHeaders(),
          'Content-Type': 'application/json'
        },
        body: {
          addLabelIds: labelIds
        }
      });

      return {
        success: true,
        data: response
      };
    } catch (error) {
      return this.handleError(error as any, 'Failed to add label');
    }
  }

  async searchEmails(options: GmailSearchOptions): Promise<ConnectorResponse> {
    return this.getEmails(options);
  }

  async deleteEmail(messageId: string): Promise<ConnectorResponse> {
    try {
      await this.performRequest({
        method: 'DELETE',
        endpoint: `${this.baseUrl}/users/me/messages/${messageId}`,
        headers: this.getAuthHeaders()
      });

      return {
        success: true,
        data: { messageId, deleted: true }
      };
    } catch (error) {
      return this.handleError(error as any, 'Failed to delete email');
    }
  }

  async markAsRead(messageId: string): Promise<ConnectorResponse> {
    try {
      const response = await this.performRequest({
        method: 'POST',
        endpoint: `${this.baseUrl}/users/me/messages/${messageId}/modify`,
        headers: {
          ...this.getAuthHeaders(),
          'Content-Type': 'application/json'
        },
        body: {
          removeLabelIds: ['UNREAD']
        }
      });

      return {
        success: true,
        data: response
      };
    } catch (error) {
      return this.handleError(error as any, 'Failed to mark as read');
    }
  }

  async getLabels(): Promise<ConnectorResponse> {
    try {
      const response = await this.performRequest({
        method: 'GET',
        endpoint: `${this.baseUrl}/users/me/labels`,
        headers: this.getAuthHeaders()
      });

      return {
        success: true,
        data: response.labels
      };
    } catch (error) {
      return this.handleError(error as any, 'Failed to get labels');
    }
  }

  async createLabel(name: string, color?: { textColor: string; backgroundColor: string }): Promise<ConnectorResponse> {
    try {
      const labelData: any = {
        name,
        messageListVisibility: 'show',
        labelListVisibility: 'labelShow'
      };

      if (color) {
        labelData.color = color;
      }

      const response = await this.performRequest({
        method: 'POST',
        endpoint: `${this.baseUrl}/users/me/labels`,
        headers: {
          ...this.getAuthHeaders(),
          'Content-Type': 'application/json'
        },
        body: labelData
      });

      return {
        success: true,
        data: response
      };
    } catch (error) {
      return this.handleError(error as any, 'Failed to create label');
    }
  }

  async refreshTokens(): Promise<OAuthTokens> {
    try {
      const refreshToken = this.config.credentials.refreshToken;
      if (!refreshToken) {
        throw new Error('No refresh token available');
      }

      const clientId = this.config.credentials.clientId;
      const clientSecret = this.config.credentials.clientSecret;
      if (!clientId || !clientSecret) {
        throw new Error('Client ID and Secret are required for token refresh');
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

      if (!tokenResponse.success) {
        throw new Error('Failed to refresh OAuth token');
      }

      const tokens: OAuthTokens = {
        accessToken: tokenResponse.data.access_token,
        refreshToken: tokenResponse.data.refresh_token || refreshToken,
        expiresAt: new Date(Date.now() + (tokenResponse.data.expires_in * 1000)),
        scope: tokenResponse.data.scope,
        tokenType: tokenResponse.data.token_type
      };

      // Update stored credentials
      this.config.credentials.accessToken = tokens.accessToken;
      this.config.credentials.refreshToken = tokens.refreshToken;

      return tokens;
    } catch (error) {
      throw new Error(`Failed to refresh tokens: ${error.message}`);
    }
  }

  private createRawMessage(request: GmailSendRequest): string {
    const lines: string[] = [];

    // Normalize recipients to arrays
    const toArray = Array.isArray(request.to) ? request.to : [request.to];
    const ccArray = request.cc ? (Array.isArray(request.cc) ? request.cc : [request.cc]) : [];
    const bccArray = request.bcc ? (Array.isArray(request.bcc) ? request.bcc : [request.bcc]) : [];

    // Headers
    lines.push(`To: ${toArray.join(', ')}`);
    if (ccArray.length > 0) {
      lines.push(`Cc: ${ccArray.join(', ')}`);
    }
    if (bccArray.length > 0) {
      lines.push(`Bcc: ${bccArray.join(', ')}`);
    }
    lines.push(`Subject: ${request.subject}`);
    
    if (request.replyToMessageId) {
      lines.push(`In-Reply-To: ${request.replyToMessageId}`);
    }
    
    if (request.threadId) {
      lines.push(`References: ${request.threadId}`);
    }

    const contentType = request.isHtml ? 'text/html' : 'text/plain';
    lines.push(`Content-Type: ${contentType}; charset=utf-8`);
    lines.push('');
    lines.push(request.body);

    // Handle attachments (simplified - would need more complex MIME handling for production)
    if (request.attachments && request.attachments.length > 0) {
      const boundary = 'boundary_' + Date.now();
      lines[lines.length - 3] = `Content-Type: multipart/mixed; boundary="${boundary}"`;
      
      // Wrap body in boundary
      lines[lines.length - 1] = `--${boundary}\nContent-Type: ${contentType}; charset=utf-8\n\n${request.body}`;
      
      // Add attachments
      for (const attachment of request.attachments) {
        lines.push(`--${boundary}`);
        lines.push(`Content-Type: ${attachment.mimeType}; name="${attachment.filename}"`);
        lines.push(`Content-Disposition: attachment; filename="${attachment.filename}"`);
        lines.push(`Content-Transfer-Encoding: base64`);
        lines.push('');
        lines.push(attachment.content);
      }
      
      lines.push(`--${boundary}--`);
    }

    return Buffer.from(lines.join('\n')).toString('base64')
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=+$/, '');
  }

  private getAuthHeaders(): Record<string, string> {
    return this.authUtils.createAuthHeaders(AuthType.BEARER_TOKEN, this.config.credentials);
  }

  private getActions(): ConnectorAction[] {
    return [
      {
        id: 'send_email',
        name: 'Send Email',
        description: 'Send an email message',
        inputSchema: {
          to: { type: 'array', required: true, description: 'Recipient email addresses' },
          subject: { type: 'string', required: true, description: 'Email subject' },
          body: { type: 'string', required: true, description: 'Email body content' },
          isHtml: { type: 'boolean', description: 'Whether body is HTML' },
          cc: { type: 'array', description: 'CC recipients' },
          bcc: { type: 'array', description: 'BCC recipients' },
          attachments: { type: 'array', description: 'Email attachments' }
        },
        outputSchema: {
          messageId: { type: 'string', description: 'Sent message ID' },
          threadId: { type: 'string', description: 'Thread ID' }
        }
      },
      {
        id: 'get_emails',
        name: 'Get Emails',
        description: 'Retrieve emails from inbox',
        inputSchema: {
          options: {
            type: 'object',
            description: 'Search and pagination options'
          }
,          outputSchema: {}
        },
        outputSchema: {
          messages: { type: 'array', description: 'Email messages' },
          nextPageToken: { type: 'string', description: 'Next page token' }
        }
      },
      {
        id: 'create_draft',
        name: 'Create Draft',
        description: 'Create an email draft',
        inputSchema: {
          to: { type: 'array', required: true, description: 'Recipient email addresses' },
          subject: { type: 'string', required: true, description: 'Email subject' },
          body: { type: 'string', required: true, description: 'Email body content' }
        },
        outputSchema: {
          draftId: { type: 'string', description: 'Draft ID' },
          messageId: { type: 'string', description: 'Message ID' }
        }
      },
      {
        id: 'add_label',
        name: 'Add Label',
        description: 'Add labels to an email',
        inputSchema: {
          messageId: { type: 'string', required: true, description: 'Message ID' },
          labelIds: { type: 'array', required: true, description: 'Label IDs to add' }
        },
        outputSchema: {
          success: { type: 'boolean', description: 'Whether labels were added successfully' }
        }
      },
      {
        id: 'search_emails',
        name: 'Search Emails',
        description: 'Search for emails using Gmail query syntax',
        inputSchema: {
          options: {
            type: 'object',
            required: true,
            description: 'Search options including query string'
          }
,          outputSchema: {}
        },
        outputSchema: {
          messages: { type: 'array', description: 'Matching email messages' }
        }
      },
      {
        id: 'delete_email',
        name: 'Delete Email',
        description: 'Delete an email permanently',
        inputSchema: {
          messageId: { type: 'string', required: true, description: 'Message ID to delete' }
        },
        outputSchema: {
          deleted: { type: 'boolean', description: 'Whether email was deleted' }
        }
      },
      {
        id: 'mark_as_read',
        name: 'Mark as Read',
        description: 'Mark an email as read',
        inputSchema: {
          messageId: { type: 'string', required: true, description: 'Message ID to mark as read' }
        },
        outputSchema: {
          success: { type: 'boolean', description: 'Whether email was marked as read' }
        }
      }
    ];
  }

  private getTriggers(): ConnectorTrigger[] {
    return [
      {
        id: 'email_received',
        name: 'Email Received',
        description: 'Triggered when a new email is received (polling mode)',
        eventType: 'message',
        inputSchema: {
          readStatus: {
            type: 'select',
            description: 'Filter by read status',
            required: false,
            options: [
              { value: 'all', label: 'All emails' },
              { value: 'unread', label: 'Unread only' },
              { value: 'read', label: 'Read only' }
            ],
            default: 'all'
          },
          sender: {
            type: 'string',
            description: 'Filter by sender email address (e.g., user@example.com)',
            required: false
          },
          labelIds: {
            type: 'array',
            description: 'Filter by Gmail label IDs (e.g., INBOX, IMPORTANT)',
            required: false
          },
          searchQuery: {
            type: 'string',
            description: 'Custom Gmail search query (uses Gmail search syntax)',
            required: false
          },
          includeSpamTrash: {
            type: 'boolean',
            description: 'Include emails from Spam and Trash',
            required: false,
            default: false
          },
          pollingInterval: {
            type: 'select',
            description: 'How often to check for new emails',
            required: false,
            options: [
              { value: '1', label: 'Every minute' },
              { value: '5', label: 'Every 5 minutes' },
              { value: '15', label: 'Every 15 minutes' },
              { value: '30', label: 'Every 30 minutes' },
              { value: '60', label: 'Every hour' }
            ],
            default: '5'
          },
          simple: {
            type: 'boolean',
            description: 'Return simplified message data (metadata only)',
            required: false,
            default: true
          }
        },
        outputSchema: {
          messageId: { type: 'string', description: 'Message ID' },
          threadId: { type: 'string', description: 'Thread ID' },
          from: { type: 'string', description: 'Sender email address' },
          to: { type: 'string', description: 'Recipient email addresses' },
          cc: { type: 'string', description: 'CC email addresses' },
          bcc: { type: 'string', description: 'BCC email addresses' },
          subject: { type: 'string', description: 'Email subject' },
          snippet: { type: 'string', description: 'Email preview text' },
          date: { type: 'string', description: 'Email date' },
          labelIds: { type: 'array', description: 'Gmail labels applied to the email' },
          internalDate: { type: 'string', description: 'Internal Gmail timestamp' },
          headers: { type: 'object', description: 'Email headers' },
          payload: { type: 'object', description: 'Full email payload (if simple=false)' }
        },
        webhookRequired: false,
        pollingEnabled: true
      },
      {
        id: 'email_sent',
        name: 'Email Sent',
        description: 'Triggered when an email is sent from your account',
        eventType: 'sent',
        inputSchema: {
          pollingInterval: {
            type: 'select',
            description: 'How often to check for sent emails',
            required: false,
            options: [
              { value: '5', label: 'Every 5 minutes' },
              { value: '15', label: 'Every 15 minutes' },
              { value: '30', label: 'Every 30 minutes' },
              { value: '60', label: 'Every hour' }
            ],
            default: '5'
          }
        },
        outputSchema: {
          messageId: { type: 'string', description: 'Sent message ID' },
          to: { type: 'array', description: 'Recipient addresses' },
          subject: { type: 'string', description: 'Email subject' },
          timestamp: { type: 'string', description: 'Sent timestamp' }
        },
        webhookRequired: false,
        pollingEnabled: true
      }
    ];
  }
}