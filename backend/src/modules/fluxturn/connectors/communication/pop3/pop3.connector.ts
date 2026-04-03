import { BaseConnector } from '../../base/base.connector';
import { ICommunicationConnector } from '../../base/connector.interface';
import {
  ConnectorMetadata,
  ConnectorResponse,
  ConnectorCategory,
  ConnectorType,
  AuthType,
  ConnectorAction,
  PaginatedRequest,
  ConnectorRequest
} from '../../types';
import { Injectable } from '@nestjs/common';

@Injectable()
export class Pop3Connector extends BaseConnector implements ICommunicationConnector {

  getMetadata(): ConnectorMetadata {
    return {
      name: 'pop3',
      description: 'Read emails using POP3 protocol',
      version: '1.0.0',
      category: ConnectorCategory.COMMUNICATION,
      type: ConnectorType.POP3,
      logoUrl: '/assets/connectors/pop3.svg',
      documentationUrl: 'https://www.rfc-editor.org/rfc/rfc1939',
      authType: AuthType.BASIC_AUTH,
      actions: this.getActions(),
      triggers: [],
      webhookSupport: false
    };
  }

  private getActions(): ConnectorAction[] {
    return [
      {
        id: 'read_email',
        name: 'Read Email',
        description: 'Read a specific email by message number',
        inputSchema: {
          messageNumber: {
            type: 'string',
            required: true,
            label: 'Message Number',
            description: 'The message number to retrieve (1 for first message). Supports expressions like {{$json.number}}',
            default: '1',
            placeholder: '1 or {{$json.number}}'
          },
          deleteAfterRead: {
            type: 'boolean',
            required: false,
            label: 'Delete After Reading',
            description: 'Delete the message from server after reading',
            default: false
          }
        },
        outputSchema: {
          from: { type: 'string', description: 'Sender email address' },
          to: { type: 'string', description: 'Recipient email address' },
          subject: { type: 'string', description: 'Email subject' },
          date: { type: 'string', description: 'Email date' },
          body: { type: 'string', description: 'Email body (plain text or HTML)' },
          rawMessage: { type: 'string', description: 'Full raw email content' }
        }
      },
      {
        id: 'list_messages',
        name: 'List Messages',
        description: 'List all messages in the mailbox',
        inputSchema: {},
        outputSchema: {
          messageCount: { type: 'number', description: 'Total number of messages' },
          messages: {
            type: 'array',
            description: 'List of message numbers and sizes',
            itemSchema: {
              number: { type: 'number' },
              size: { type: 'number' }
            }
          }
        }
      }
    ];
  }

  protected async initializeConnection(): Promise<void> {
    if (!this.config?.credentials) {
      throw new Error('POP3 credentials not configured');
    }

    const required = ['host', 'user', 'password'];
    for (const field of required) {
      if (!this.config.credentials[field]) {
        throw new Error(`POP3 ${field} is required`);
      }
    }

    this.logger.log('POP3 connector initialized');
  }

  protected async performConnectionTest(): Promise<boolean> {
    try {
      // Simple validation - actual connection test would happen in action
      if (!this.config?.credentials?.host) return false;
      if (!this.config?.credentials?.user) return false;
      if (!this.config?.credentials?.password) return false;
      return true;
    } catch (error) {
      return false;
    }
  }

  protected async performHealthCheck(): Promise<void> {
    if (!this.config?.credentials?.host) {
      throw new Error('POP3 host not configured');
    }
    if (!this.config?.credentials?.user) {
      throw new Error('POP3 user not configured');
    }
    if (!this.config?.credentials?.password) {
      throw new Error('POP3 password not configured');
    }
  }

  protected async performRequest(request: ConnectorRequest): Promise<any> {
    throw new Error('Generic request not supported for POP3 connector. Use specific actions instead.');
  }

  protected async performAction(actionId: string, input: any): Promise<any> {
    this.logger.log(`POP3 performAction called with actionId: ${actionId}`);

    switch (actionId) {
      case 'read_email':
        this.logger.log('Executing read_email action');
        return await this.readEmail(input);
      case 'list_messages':
        this.logger.log('Executing list_messages action');
        return await this.listMessages();
      default:
        throw new Error(`Unknown action: ${actionId}`);
    }
  }

  protected async cleanup(): Promise<void> {
    this.logger.log('POP3 connector cleanup completed');
  }

  // POP3 Actions
  private async readEmail(input: any): Promise<any> {
    const POP3Client = require('poplib');
    const tls = require('tls');

    const { host, port = 995, user, password, secure = true, allowUnauthorizedCerts = true } = this.config.credentials;

    // Parse messageNumber from string to integer (supports expressions)
    const messageNumber = parseInt(input.messageNumber) || 1;

    if (isNaN(messageNumber) || messageNumber < 1) {
      throw new Error('Invalid message number. Must be a positive integer.');
    }

    this.logger.log(`Reading email #${messageNumber} from ${host}`);

    // Store original TLS connect function and env variable
    const originalTlsConnect = tls.connect;
    const originalRejectUnauthorized = process.env.NODE_TLS_REJECT_UNAUTHORIZED;

    return new Promise((resolve, reject) => {
      // Wrap TLS connect to inject rejectUnauthorized: false
      if (allowUnauthorizedCerts) {
        tls.connect = function(...args: any[]) {
          const options = args[0];
          if (typeof options === 'object') {
            options.rejectUnauthorized = false;
          }
          return originalTlsConnect.apply(tls, args);
        };
        process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
      }

      const clientOptions: any = {
        tlserrs: allowUnauthorizedCerts, // true = ignore TLS errors, false = throw TLS errors
        enabletls: secure,
        debug: true // Enable debug to see connection details
      };

      this.logger.debug(`POP3 readEmail connection options: ${JSON.stringify({ host, port, secure, allowUnauthorizedCerts, NODE_TLS_REJECT_UNAUTHORIZED: process.env.NODE_TLS_REJECT_UNAUTHORIZED })}`);

      const client = new POP3Client(port, host, clientOptions);

      let result: any = {};

      // Restore original TLS settings on any exit
      const restoreTLS = () => {
        if (allowUnauthorizedCerts) {
          tls.connect = originalTlsConnect;
          if (originalRejectUnauthorized !== undefined) {
            process.env.NODE_TLS_REJECT_UNAUTHORIZED = originalRejectUnauthorized;
          } else {
            delete process.env.NODE_TLS_REJECT_UNAUTHORIZED;
          }
        }
      };

      client.on('connect', () => {
        this.logger.log(`Connected to POP3 server: ${host}:${port}`);
        client.login(user, password);
      });

      client.on('login', (status, rawdata) => {
        if (status) {
          this.logger.log(`Login successful for user: ${user}`);
          client.retr(messageNumber);
        } else {
          this.logger.error(`Login failed: ${rawdata}`);
          restoreTLS();
          reject(new Error('Login failed: ' + rawdata));
        }
      });

      client.on('retr', (status, msgnumber, data) => {
        if (status === true) {
          this.logger.log(`Retrieved message #${msgnumber}`);
          result = this.parseEmail(data);

          if (input.deleteAfterRead) {
            this.logger.log(`Deleting message #${messageNumber}`);
            client.dele(messageNumber);
          } else {
            client.quit();
          }
        } else {
          this.logger.error('Failed to retrieve message');
          restoreTLS();
          reject(new Error('Retrieve failed'));
        }
      });

      client.on('dele', () => {
        this.logger.log('Message deleted successfully');
        client.quit();
      });

      client.on('quit', () => {
        this.logger.log('POP3 session closed');
        restoreTLS();
        resolve(result);
      });

      client.on('error', (err) => {
        this.logger.error(`POP3 error: ${err.message}`);
        restoreTLS();
        reject(err);
      });
    });
  }

  private async listMessages(): Promise<any> {
    const POP3Client = require('poplib');
    const tls = require('tls');

    this.logger.debug(`POP3 config credentials: ${JSON.stringify({ hasCredentials: !!this.config.credentials, hasHost: !!this.config.credentials?.host, hasUser: !!this.config.credentials?.user })}`);

    const { host, port = 995, user, password, secure = true, allowUnauthorizedCerts = true } = this.config.credentials;

    this.logger.log(`Attempting POP3 connection to ${host}:${port} with user ${user}`);

    // Store original TLS connect function and env variable
    const originalTlsConnect = tls.connect;
    const originalRejectUnauthorized = process.env.NODE_TLS_REJECT_UNAUTHORIZED;

    return new Promise((resolve, reject) => {
      // Wrap TLS connect to inject rejectUnauthorized: false
      if (allowUnauthorizedCerts) {
        tls.connect = function(...args: any[]) {
          const options = args[0];
          if (typeof options === 'object') {
            options.rejectUnauthorized = false;
          }
          return originalTlsConnect.apply(tls, args);
        };
        process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
      }

      const clientOptions: any = {
        tlserrs: allowUnauthorizedCerts, // true = ignore TLS errors, false = throw TLS errors
        enabletls: secure,
        debug: true // Enable debug to see connection details
      };

      this.logger.debug(`POP3 listMessages connection options: ${JSON.stringify({ host, port, secure, allowUnauthorizedCerts, NODE_TLS_REJECT_UNAUTHORIZED: process.env.NODE_TLS_REJECT_UNAUTHORIZED })}`);

      const client = new POP3Client(port, host, clientOptions);

      let messageList: any[] = [];
      let messageCount = 0;

      // Restore original TLS settings on any exit
      const restoreTLS = () => {
        if (allowUnauthorizedCerts) {
          tls.connect = originalTlsConnect;
          if (originalRejectUnauthorized !== undefined) {
            process.env.NODE_TLS_REJECT_UNAUTHORIZED = originalRejectUnauthorized;
          } else {
            delete process.env.NODE_TLS_REJECT_UNAUTHORIZED;
          }
        }
      };

      client.on('connect', () => {
        this.logger.log(`Connected to POP3 server: ${host}:${port}`);
        client.login(user, password);
      });

      client.on('login', (status, rawdata) => {
        if (status) {
          this.logger.log(`Login successful for user: ${user}`);
          client.list();
        } else {
          this.logger.error(`Login failed: ${rawdata}`);
          restoreTLS();
          reject(new Error('Login failed: ' + rawdata));
        }
      });

      client.on('list', (status, msgcount, msgnumber, data, rawdata) => {
        if (status === false) {
          this.logger.error('Failed to list messages');
          restoreTLS();
          reject(new Error('List failed'));
          return;
        }

        // Parse the LIST response - use rawdata if data is not a string
        const listData = typeof data === 'string' ? data : (typeof rawdata === 'string' ? rawdata : '');

        if (listData) {
          const lines = listData.split('\r\n');
          for (const line of lines) {
            if (line && line.trim() && line.trim() !== '.') {
              const parts = line.trim().split(/\s+/);
              if (parts.length >= 2) {
                const msgNum = parseInt(parts[0]);
                const msgSize = parseInt(parts[1]);
                if (!isNaN(msgNum) && !isNaN(msgSize)) {
                  messageList.push({
                    number: msgNum,
                    size: msgSize
                  });
                }
              }
            }
          }
        }

        messageCount = msgcount || messageList.length;
        client.quit();
      });

      client.on('quit', () => {
        this.logger.log('POP3 session closed');
        restoreTLS();
        resolve({
          messageCount,
          messages: messageList
        });
      });

      client.on('error', (err) => {
        this.logger.error(`POP3 error: ${err.message}`);
        restoreTLS();
        reject(err);
      });
    });
  }

  private parseEmail(rawEmail: string): any {
    // Simple email parsing - in production, use a proper email parser library
    const lines = rawEmail.split('\n');
    const result: any = {
      from: '',
      to: '',
      subject: '',
      date: '',
      body: '',
      rawMessage: rawEmail
    };

    let headersDone = false;
    let bodyLines: string[] = [];

    for (const line of lines) {
      if (!headersDone) {
        if (line.trim() === '') {
          headersDone = true;
          continue;
        }

        if (line.toLowerCase().startsWith('from:')) {
          result.from = line.substring(5).trim();
        } else if (line.toLowerCase().startsWith('to:')) {
          result.to = line.substring(3).trim();
        } else if (line.toLowerCase().startsWith('subject:')) {
          result.subject = line.substring(8).trim();
        } else if (line.toLowerCase().startsWith('date:')) {
          result.date = line.substring(5).trim();
        }
      } else {
        bodyLines.push(line);
      }
    }

    result.body = bodyLines.join('\n');
    return result;
  }

  // ICommunicationConnector interface methods
  async sendMessage(to: string | string[], message: any): Promise<ConnectorResponse> {
    return {
      success: false,
      error: {
        code: 'NOT_SUPPORTED',
        message: 'POP3 does not support sending messages. Use SMTP connector instead.'
      }
    };
  }

  async getMessages(options?: PaginatedRequest): Promise<ConnectorResponse> {
    try {
      const result = await this.listMessages();
      return {
        success: true,
        data: result
      };
    } catch (error) {
      return this.handleError(error, 'Failed to list messages');
    }
  }

  async getContact(contactId: string): Promise<ConnectorResponse> {
    return {
      success: false,
      error: {
        code: 'NOT_SUPPORTED',
        message: 'POP3 does not support contact management'
      }
    };
  }

  async upsertContact(contact: any): Promise<ConnectorResponse> {
    return {
      success: false,
      error: {
        code: 'NOT_SUPPORTED',
        message: 'POP3 does not support contact management'
      }
    };
  }
}
