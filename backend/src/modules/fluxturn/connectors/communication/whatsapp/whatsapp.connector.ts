import { BaseConnector } from '../../base/base.connector';
import { ICommunicationConnector } from '../../base/connector.interface';
import {
  ConnectorMetadata,
  ConnectorResponse,
  ConnectorCategory,
  ConnectorType,
  AuthType,
  ConnectorAction,
  ConnectorTrigger,
  PaginatedRequest,
  ConnectorConfig,
  ConnectorRequest
} from '../../types';
import { HttpService } from '@nestjs/axios';
import { Injectable } from '@nestjs/common';
import { firstValueFrom } from 'rxjs';
import FormData = require('form-data');

@Injectable()
export class WhatsAppConnector extends BaseConnector implements ICommunicationConnector {
  private readonly baseUrl = 'https://graph.facebook.com/v18.0';

  constructor(private readonly httpService: HttpService) {
    super();
  }

  getMetadata(): ConnectorMetadata {
    return {
      name: 'whatsapp',
      description: 'Send and receive messages through WhatsApp Business Cloud API',
      version: '1.0.0',
      category: ConnectorCategory.COMMUNICATION,
      type: ConnectorType.WHATSAPP,
      logoUrl: '/assets/connectors/whatsapp.svg',
      documentationUrl: 'https://developers.facebook.com/docs/whatsapp',
      authType: AuthType.API_KEY,
      actions: this.getActions(),
      triggers: this.getTriggers(),
      webhookSupport: true
    };
  }

  private getActions(): ConnectorAction[] {
    return [
      {
        id: 'send_message',
        name: 'Send Message',
        description: 'Send a message via WhatsApp',
        inputSchema: {
          type: 'object',
          properties: {
            to: { type: 'string', description: 'Recipient phone number' },
            messageType: { type: 'string', enum: ['text', 'image', 'video', 'audio', 'document', 'location', 'contacts'] },
            text: { type: 'string' },
            mediaId: { type: 'string' },
            mediaUrl: { type: 'string' },
            caption: { type: 'string' },
            latitude: { type: 'number' },
            longitude: { type: 'number' }
          },
          required: ['to', 'messageType']
        },
        outputSchema: {
          type: 'object',
          properties: {
            messagingProduct: { type: 'string' },
            contacts: { type: 'array' },
            messages: { type: 'array' }
          }
        }
      },
      {
        id: 'send_message_and_wait',
        name: 'Send Message and Wait for Response',
        description: 'Send a message and wait for response',
        inputSchema: {
          type: 'object',
          properties: {
            to: { type: 'string' },
            text: { type: 'string' },
            timeoutMinutes: { type: 'number', default: 60 }
          },
          required: ['to', 'text']
        },
        outputSchema: {
          type: 'object'
        }
      },
      {
        id: 'send_template',
        name: 'Send Template',
        description: 'Send a pre-approved message template',
        inputSchema: {
          type: 'object',
          properties: {
            to: { type: 'string' },
            templateName: { type: 'string' },
            languageCode: { type: 'string', default: 'en' },
            templateParameters: { type: 'array' }
          },
          required: ['to', 'templateName', 'languageCode']
        },
        outputSchema: {
          type: 'object'
        }
      },
      {
        id: 'upload_media',
        name: 'Upload Media',
        description: 'Upload media to WhatsApp servers',
        inputSchema: {
          type: 'object',
          properties: {
            file: { type: 'string' },
            mediaType: { type: 'string', enum: ['image', 'video', 'audio', 'document', 'sticker'] },
            filename: { type: 'string' }
          },
          required: ['file', 'mediaType']
        },
        outputSchema: {
          type: 'object',
          properties: {
            id: { type: 'string' }
          }
        }
      },
      {
        id: 'download_media',
        name: 'Download Media',
        description: 'Download media from WhatsApp servers',
        inputSchema: {
          type: 'object',
          properties: {
            mediaId: { type: 'string' }
          },
          required: ['mediaId']
        },
        outputSchema: {
          type: 'object',
          properties: {
            id: { type: 'string' },
            url: { type: 'string' },
            mimeType: { type: 'string' }
          }
        }
      },
      {
        id: 'delete_media',
        name: 'Delete Media',
        description: 'Delete media from WhatsApp servers',
        inputSchema: {
          type: 'object',
          properties: {
            mediaId: { type: 'string' }
          },
          required: ['mediaId']
        },
        outputSchema: {
          type: 'object',
          properties: {
            success: { type: 'boolean' }
          }
        }
      }
    ];
  }

  private getTriggers(): ConnectorTrigger[] {
    return [
      {
        id: 'on_message',
        name: 'On Message',
        description: 'Triggers when a new message is received',
        eventType: 'message',
        outputSchema: {
          type: 'object',
          properties: {
            messageId: { type: 'string' },
            from: { type: 'string' },
            text: { type: 'string' },
            timestamp: { type: 'string' },
            type: { type: 'string' }
          }
        },
        webhookRequired: true
      }
    ];
  }

  // BaseConnector abstract methods
  protected async initializeConnection(): Promise<void> {
    this.logger.log('WhatsApp connector initialized');
  }

  protected async performConnectionTest(): Promise<boolean> {
    try {
      const phoneNumberId = this.config?.credentials?.phoneNumberId;
      if (!phoneNumberId) {
        return false;
      }
      // Test by getting phone number info
      const response = await this.makeApiRequest('GET', `/${phoneNumberId}`);
      return !!response.id;
    } catch (error) {
      this.logger.error('WhatsApp connection test failed:', error);
      return false;
    }
  }

  protected async performHealthCheck(): Promise<void> {
    if (!this.config?.credentials?.accessToken) {
      throw new Error('Access token not configured');
    }
    if (!this.config?.credentials?.phoneNumberId) {
      throw new Error('Phone number ID not configured');
    }
  }

  protected async performRequest(request: ConnectorRequest): Promise<any> {
    throw new Error('Use specific action methods instead of generic request');
  }

  protected async performAction(actionId: string, input: any): Promise<any> {
    const credentials = this.config?.credentials || {};

    switch (actionId) {
      case 'send_message':
        return await this.performSendMessage(input, credentials);
      case 'send_message_and_wait':
        return await this.performSendMessageAndWait(input, credentials);
      case 'send_template':
        return await this.performSendTemplate(input, credentials);
      case 'upload_media':
        return await this.performUploadMedia(input, credentials);
      case 'download_media':
        return await this.performDownloadMedia(input, credentials);
      case 'delete_media':
        return await this.performDeleteMedia(input, credentials);
      default:
        throw new Error(`Unknown action: ${actionId}`);
    }
  }

  protected async cleanup(): Promise<void> {
    this.logger.log('WhatsApp connector cleanup completed');
  }

  // ICommunicationConnector methods
  async sendMessage(to: string | string[], message: any): Promise<ConnectorResponse> {
    const recipients = Array.isArray(to) ? to : [to];
    const results = [];

    for (const recipient of recipients) {
      try {
        const result = await this.performSendMessage(
          {
            to: recipient,
            messageType: message.type || 'text',
            text: message.text || message,
            ...message
          },
          this.config?.credentials || {}
        );
        results.push(result);
      } catch (error) {
        return {
          success: false,
          error: {
            code: 'SEND_FAILED',
            message: error.message
          }
        };
      }
    }

    return {
      success: true,
      data: results.length === 1 ? results[0] : results
    };
  }

  async getMessages(options?: PaginatedRequest): Promise<ConnectorResponse> {
    return {
      success: false,
      error: {
        code: 'NOT_SUPPORTED',
        message: 'Message history retrieval is not supported via WhatsApp Business API'
      }
    };
  }

  async getContact(contactId: string): Promise<ConnectorResponse> {
    return {
      success: false,
      error: {
        code: 'NOT_SUPPORTED',
        message: 'Contact retrieval is not supported via WhatsApp Business API'
      }
    };
  }

  async upsertContact(contact: any): Promise<ConnectorResponse> {
    return {
      success: false,
      error: {
        code: 'NOT_SUPPORTED',
        message: 'Contact management is not supported via WhatsApp Business API'
      }
    };
  }

  // ==================== ACTION IMPLEMENTATIONS ====================

  private async performSendMessage(input: any, credentials: any): Promise<any> {
    const { phoneNumberId, accessToken } = credentials;
    const { to, messageType, text, mediaId, mediaUrl, caption, latitude, longitude, previewUrl } = input;

    const payload: any = {
      messaging_product: 'whatsapp',
      recipient_type: 'individual',
      to: this.sanitizePhoneNumber(to),
      type: messageType || 'text'
    };

    // Build message payload based on type
    switch (messageType) {
      case 'text':
        payload.text = {
          body: text,
          preview_url: previewUrl || false
        };
        break;

      case 'image':
      case 'video':
      case 'audio':
      case 'document':
        payload[messageType] = mediaId
          ? { id: mediaId, caption }
          : { link: mediaUrl, caption };
        break;

      case 'location':
        payload.location = {
          latitude,
          longitude,
          name: input.locationName,
          address: input.locationAddress
        };
        break;

      case 'contacts':
        payload.contacts = input.contacts;
        break;

      default:
        throw new Error(`Unsupported message type: ${messageType}`);
    }

    const response = await this.makeApiRequest('POST', `/${phoneNumberId}/messages`, payload);
    return response;
  }

  private async performSendMessageAndWait(input: any, credentials: any): Promise<any> {
    // First send the message
    const sendResult = await this.performSendMessage(
      { ...input, messageType: 'text' },
      credentials
    );

    // Note: Actual "wait" logic would be handled by the workflow engine
    // This method just sends the message and returns the data needed for waiting
    return {
      sentMessage: sendResult,
      waitConfig: {
        timeout: input.timeoutMinutes || 60,
        approveLabel: input.approveButtonLabel || '✓ Approve',
        disapproveLabel: input.disapproveButtonLabel || '✗ Decline'
      }
    };
  }

  private async performSendTemplate(input: any, credentials: any): Promise<any> {
    const { phoneNumberId, accessToken } = credentials;
    const { to, templateName, languageCode, templateParameters } = input;

    const payload: any = {
      messaging_product: 'whatsapp',
      recipient_type: 'individual',
      to: this.sanitizePhoneNumber(to),
      type: 'template',
      template: {
        name: templateName,
        language: {
          code: languageCode
        }
      }
    };

    // Add components if parameters provided
    if (templateParameters && templateParameters.length > 0) {
      payload.template.components = [
        {
          type: 'body',
          parameters: templateParameters.map((param: any) => ({
            type: param.type || 'text',
            text: param.text
          }))
        }
      ];
    }

    const response = await this.makeApiRequest('POST', `/${phoneNumberId}/messages`, payload);
    return response;
  }

  private async performUploadMedia(input: any, credentials: any): Promise<any> {
    const { phoneNumberId, accessToken } = credentials;
    const { file, mediaType, filename } = input;

    const formData = new FormData();
    formData.append('messaging_product', 'whatsapp');
    formData.append('type', mediaType);

    // Handle file - this would need to be adapted based on how files are passed
    if (typeof file === 'string') {
      // If file is a URL or base64, convert it to a buffer
      // This is a placeholder - actual implementation depends on file format
      formData.append('file', file, filename || 'media');
    } else {
      formData.append('file', file, filename || 'media');
    }

    const response = await this.makeApiRequest('POST', `/${phoneNumberId}/media`, formData, {
      headers: formData.getHeaders()
    });

    return response;
  }

  private async performDownloadMedia(input: any, credentials: any): Promise<any> {
    const { mediaId } = input;
    const { accessToken } = credentials;

    // First get the media URL
    const mediaInfo = await this.makeApiRequest('GET', `/${mediaId}`);

    // The response contains the download URL
    return {
      id: mediaInfo.id,
      url: mediaInfo.url,
      mimeType: mediaInfo.mime_type,
      sha256: mediaInfo.sha256,
      fileSize: mediaInfo.file_size
    };
  }

  private async performDeleteMedia(input: any, credentials: any): Promise<any> {
    const { mediaId } = input;

    const response = await this.makeApiRequest('DELETE', `/${mediaId}`);

    return {
      success: response.success || true,
      mediaId
    };
  }

  // ==================== HELPER METHODS ====================

  private async makeApiRequest(
    method: string,
    endpoint: string,
    data?: any,
    options?: any
  ): Promise<any> {
    const accessToken = this.config?.credentials?.accessToken;
    const url = `${this.baseUrl}${endpoint}`;

    try {
      const config: any = {
        method,
        url,
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
          ...options?.headers
        }
      };

      if (data) {
        if (method === 'GET') {
          config.params = data;
        } else {
          config.data = data;
        }
      }

      const response = await firstValueFrom(this.httpService.request(config));
      return response.data;
    } catch (error) {
      this.logger.error(`WhatsApp API request failed: ${error.message}`, error.response?.data);
      throw new Error(error.response?.data?.error?.message || error.message);
    }
  }

  private sanitizePhoneNumber(phoneNumber: string): string {
    // Remove any non-digit characters
    return phoneNumber.replace(/\D/g, '');
  }
}
