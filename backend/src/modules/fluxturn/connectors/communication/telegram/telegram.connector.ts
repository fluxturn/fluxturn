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

@Injectable()
export class TelegramConnector extends BaseConnector implements ICommunicationConnector {
  constructor(private readonly httpService: HttpService) {
    super();
  }

  getMetadata(): ConnectorMetadata {
    return {
      name: 'telegram',
      description: 'Send and receive messages through Telegram Bot API',
      version: '1.0.0',
      category: ConnectorCategory.COMMUNICATION,
      type: ConnectorType.TELEGRAM,
      logoUrl: '/assets/connectors/telegram.svg',
      documentationUrl: 'https://core.telegram.org/bots/api',
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
        description: 'Send a text message to a Telegram chat',
        inputSchema: {
          type: 'object',
          properties: {
            chatId: { type: 'string', description: 'Chat ID or username' },
            text: { type: 'string', description: 'Message text' },
            parseMode: { type: 'string', enum: ['', 'Markdown', 'HTML'] },
            disableNotification: { type: 'boolean', default: false }
          },
          required: ['chatId', 'text']
        },
        outputSchema: {
          type: 'object',
          properties: {
            message_id: { type: 'number' },
            date: { type: 'number' },
            chat: { type: 'object' }
          }
        }
      },
      {
        id: 'send_photo',
        name: 'Send Photo',
        description: 'Send a photo to a Telegram chat',
        inputSchema: {
          type: 'object',
          properties: {
            chatId: { type: 'string', description: 'Chat ID' },
            photo: { type: 'string', description: 'Photo URL' },
            caption: { type: 'string', maxLength: 1024 },
            parseMode: { type: 'string', enum: ['', 'Markdown', 'HTML'] }
          },
          required: ['chatId', 'photo']
        },
        outputSchema: {
          type: 'object',
          properties: {
            message_id: { type: 'number' },
            date: { type: 'number' },
            chat: { type: 'object' }
          }
        }
      }
    ];
  }

  private getTriggers(): ConnectorTrigger[] {
    return [
      {
        id: 'new_message',
        name: 'New Message',
        description: 'Triggers when a new message is received',
        eventType: 'message',
        outputSchema: {
          type: 'object',
          properties: {
            message_id: { type: 'number' },
            text: { type: 'string' },
            from: { type: 'object' },
            chat: { type: 'object' }
          }
        },
        webhookRequired: true
      }
    ];
  }

  // BaseConnector abstract methods
  protected async initializeConnection(): Promise<void> {
    this.logger.log('Telegram connector initialized');
  }

  protected async performConnectionTest(): Promise<boolean> {
    try {
      // Test connection by calling getMe API endpoint
      const response = await this.makeApiRequest('getMe', {});
      return response.ok === true;
    } catch (error) {
      this.logger.error('Telegram connection test failed:', error);
      return false;
    }
  }

  protected async performHealthCheck(): Promise<void> {
    if (!this.config?.credentials?.botToken) {
      throw new Error('Bot token not configured');
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
      case 'send_photo':
        return await this.performSendPhoto(input, credentials);
      default:
        throw new Error(`Unknown action: ${actionId}`);
    }
  }

  protected async cleanup(): Promise<void> {
    this.logger.log('Telegram connector cleanup completed');
  }

  // ICommunicationConnector methods
  async sendMessage(to: string | string[], message: any): Promise<ConnectorResponse> {
    const chatIds = Array.isArray(to) ? to : [to];
    const results = [];
    
    for (const chatId of chatIds) {
      try {
        const result = await this.performSendMessage(
          { chatId, text: message.text || message, parseMode: message.parseMode },
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
        message: 'Message history is not available in Telegram Bot API'
      }
    };
  }

  async getContact(contactId: string): Promise<ConnectorResponse> {
    try {
      const result = await this.makeApiRequest('getChat', { chat_id: contactId });
      return {
        success: true,
        data: result.result
      };
    } catch (error) {
      return {
        success: false,
        error: {
          code: 'GET_CONTACT_FAILED',
          message: error.message
        }
      };
    }
  }

  async upsertContact(contact: any): Promise<ConnectorResponse> {
    return {
      success: false,
      error: {
        code: 'NOT_SUPPORTED',
        message: 'Contact management is not supported by Telegram Bot API'
      }
    };
  }

  // Private helper methods
  private async performSendMessage(params: any, credentials: any): Promise<any> {
    const { chatId, text, parseMode, disableNotification } = params;
    
    const body: any = {
      chat_id: chatId,
      text: text
    };

    if (parseMode && parseMode !== 'none') {
      body.parse_mode = parseMode;
    }

    if (disableNotification) {
      body.disable_notification = true;
    }

    const response = await this.makeApiRequest('sendMessage', body, credentials);
    
    if (!response.ok) {
      throw new Error(response.description || 'Failed to send message');
    }

    return response.result;
  }

  private async performSendPhoto(params: any, credentials: any): Promise<any> {
    const { chatId, photo, caption, parseMode } = params;
    
    const body: any = {
      chat_id: chatId,
      photo: photo
    };

    if (caption) {
      body.caption = caption;
    }

    if (parseMode) {
      body.parse_mode = parseMode;
    }

    const response = await this.makeApiRequest('sendPhoto', body, credentials);
    
    if (!response.ok) {
      throw new Error(response.description || 'Failed to send photo');
    }

    return response.result;
  }

  private async makeApiRequest(method: string, params: any, credentials?: any): Promise<any> {
    const creds = credentials || this.config?.credentials;
    const botToken = creds?.botToken;
    
    if (!botToken) {
      throw new Error('Bot token is required');
    }

    const url = `https://api.telegram.org/bot${botToken}/${method}`;
    
    try {
      const response = await firstValueFrom(
        this.httpService.post(url, params, {
          headers: {
            'Content-Type': 'application/json'
          }
        })
      );
      
      return response.data;
    } catch (error) {
      if (error.response?.data) {
        throw new Error(error.response.data.description || 'Telegram API error');
      }
      throw error;
    }
  }
}