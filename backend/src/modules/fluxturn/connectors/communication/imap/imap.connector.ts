import { BaseConnector } from '../../base/base.connector';
import { ICommunicationConnector } from '../../base/connector.interface';
import {
  ConnectorMetadata,
  ConnectorResponse,
  ConnectorCategory,
  ConnectorType,
  AuthType,
  ConnectorTrigger,
  PaginatedRequest,
  ConnectorRequest
} from '../../types';
import { Injectable } from '@nestjs/common';

@Injectable()
export class ImapConnector extends BaseConnector implements ICommunicationConnector {

  getMetadata(): ConnectorMetadata {
    return {
      name: 'imap',
      description: 'Receive emails using IMAP protocol',
      version: '1.0.0',
      category: ConnectorCategory.COMMUNICATION,
      type: ConnectorType.IMAP,
      logoUrl: '/assets/connectors/imap.svg',
      documentationUrl: 'https://www.rfc-editor.org/rfc/rfc3501',
      authType: AuthType.CUSTOM,
      actions: [],
      triggers: this.getTriggers(),
      webhookSupport: false
    };
  }

  private getTriggers(): ConnectorTrigger[] {
    return [
      {
        id: 'new_email',
        name: 'New Email',
        description: 'Triggers when a new email is received',
        eventType: 'email_received',
        webhookRequired: false,
        pollingEnabled: true,
        outputSchema: {
          emailEvent: {
            type: 'object',
            properties: {
              from: { type: 'string' },
              to: { type: 'string' },
              subject: { type: 'string' },
              date: { type: 'string' },
              textPlain: { type: 'string' },
              textHtml: { type: 'string' },
              cc: { type: 'string' },
              metadata: { type: 'object' },
              attributes: { type: 'object' }
            }
          }
        }
      }
    ];
  }

  protected async initializeConnection(): Promise<void> {
    if (!this.config?.credentials) {
      throw new Error('IMAP credentials not configured');
    }

    this.logger.log('IMAP connector initialized (connection will be established on first use)');
  }

  protected async performConnectionTest(): Promise<boolean> {
    // Connection test will be performed by the trigger service
    // This is a lightweight validation
    if (!this.config?.credentials?.host) {
      return false;
    }
    if (!this.config?.credentials?.user) {
      return false;
    }
    if (!this.config?.credentials?.password) {
      return false;
    }
    return true;
  }

  protected async performHealthCheck(): Promise<void> {
    if (!this.config?.credentials?.host) {
      throw new Error('IMAP host not configured');
    }
    if (!this.config?.credentials?.port) {
      throw new Error('IMAP port not configured');
    }
    if (!this.config?.credentials?.user) {
      throw new Error('IMAP user not configured');
    }
    if (!this.config?.credentials?.password) {
      throw new Error('IMAP password not configured');
    }
  }

  protected async performRequest(request: ConnectorRequest): Promise<any> {
    throw new Error('Generic request not supported for IMAP connector. Use trigger service instead.');
  }

  protected async performAction(actionId: string, input: any): Promise<any> {
    throw new Error('IMAP connector does not support actions. It is a trigger-only connector.');
  }

  protected async cleanup(): Promise<void> {
    this.logger.log('IMAP connector cleanup completed');
  }

  // ICommunicationConnector interface methods
  async sendMessage(to: string | string[], message: any): Promise<ConnectorResponse> {
    return {
      success: false,
      error: {
        code: 'NOT_SUPPORTED',
        message: 'IMAP does not support sending messages. Use SMTP connector instead.'
      }
    };
  }

  async getMessages(options?: PaginatedRequest): Promise<ConnectorResponse> {
    return {
      success: false,
      error: {
        code: 'NOT_SUPPORTED',
        message: 'IMAP message fetching is handled by the trigger service. Use the IMAP trigger instead.'
      }
    };
  }

  async getContact(contactId: string): Promise<ConnectorResponse> {
    return {
      success: false,
      error: {
        code: 'NOT_SUPPORTED',
        message: 'IMAP does not support contact management'
      }
    };
  }

  async upsertContact(contact: any): Promise<ConnectorResponse> {
    return {
      success: false,
      error: {
        code: 'NOT_SUPPORTED',
        message: 'IMAP does not support contact management'
      }
    };
  }

  /**
   * Test IMAP connection
   */
  async testConnection(): Promise<ConnectorResponse<boolean>> {
    try {
      const isValid = await this.performConnectionTest();
      return {
        success: isValid,
        data: isValid,
        ...(isValid ? {} : {
          error: {
            code: 'CONNECTION_FAILED',
            message: 'IMAP credentials validation failed'
          }
        })
      };
    } catch (error: any) {
      return {
        success: false,
        data: false,
        error: {
          code: 'CONNECTION_ERROR',
          message: error.message
        }
      };
    }
  }
}
