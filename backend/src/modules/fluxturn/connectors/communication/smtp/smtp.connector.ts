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
import { Injectable } from '@nestjs/common';
import { createTransport, Transporter } from 'nodemailer';
import type SMTPTransport from 'nodemailer/lib/smtp-transport';

@Injectable()
export class SmtpConnector extends BaseConnector implements ICommunicationConnector {
  private transporter: Transporter<SMTPTransport.SentMessageInfo> | null = null;

  getMetadata(): ConnectorMetadata {
    return {
      name: 'smtp',
      description: 'Send emails using SMTP protocol',
      version: '1.0.0',
      category: ConnectorCategory.COMMUNICATION,
      type: ConnectorType.SMTP,
      logoUrl: '/assets/connectors/smtp.svg',
      documentationUrl: 'https://nodemailer.com/',
      authType: AuthType.CUSTOM,
      actions: this.getActions(),
      triggers: [],
      webhookSupport: false
    };
  }

  private getActions(): ConnectorAction[] {
    return [
      {
        id: 'send_email',
        name: 'Send Email',
        description: 'Send an email using SMTP protocol',
        inputSchema: {
          type: 'object',
          properties: {
            fromEmail: {
              type: 'string',
              description: 'Sender email address'
            },
            toEmail: {
              type: 'string',
              description: 'Recipient email address'
            },
            subject: {
              type: 'string',
              description: 'Email subject'
            },
            emailFormat: {
              type: 'string',
              enum: ['text', 'html', 'both'],
              default: 'text'
            },
            text: {
              type: 'string',
              description: 'Plain text content'
            },
            html: {
              type: 'string',
              description: 'HTML content'
            },
            ccEmail: {
              type: 'string',
              description: 'CC email addresses (comma-separated)'
            },
            bccEmail: {
              type: 'string',
              description: 'BCC email addresses (comma-separated)'
            },
            replyTo: {
              type: 'string',
              description: 'Reply-to email address'
            },
            attachments: {
              type: 'string',
              description: 'Comma-separated list of attachment property names'
            },
            allowUnauthorizedCerts: {
              type: 'boolean',
              default: false,
              description: 'Allow unauthorized SSL certificates'
            }
          },
          required: ['fromEmail', 'toEmail', 'subject']
        },
        outputSchema: {
          type: 'object',
          properties: {
            messageId: { type: 'string' },
            accepted: { type: 'array' },
            rejected: { type: 'array' },
            response: { type: 'string' }
          }
        }
      }
    ];
  }

  protected async initializeConnection(): Promise<void> {
    if (!this.config?.credentials) {
      throw new Error('SMTP credentials not configured');
    }

    const credentials = this.config.credentials;

    // Build SMTP connection options
    // Port 465 uses implicit TLS (secure: true)
    // Port 587 uses STARTTLS (secure: false, then upgrades)
    // Port 25 uses plain connection (secure: false)
    const port = Number(credentials.port);

    // Determine secure mode based on port
    // Port 465 = SSL (secure: true), Port 587 = STARTTLS (secure: false)
    // Port-based detection takes priority because port 587 + SSL is invalid
    let useSecure: boolean;
    if (port === 465) {
      useSecure = true;
    } else if (port === 587 || port === 25) {
      useSecure = false; // STARTTLS or plain - cannot use SSL on these ports
    } else {
      // For non-standard ports, use the user's preference
      useSecure = Boolean(credentials.secure);
    }

    this.logger.log(`SMTP config - Port: ${port}, Secure (SSL): ${useSecure}, User secure setting: ${credentials.secure}`);

    const connectionOptions: SMTPTransport.Options = {
      host: credentials.host as string,
      port: port,
      secure: useSecure,
    };

    // For non-secure connections (port 587), enable STARTTLS upgrade
    if (!useSecure && port === 587) {
      connectionOptions.requireTLS = true; // Require STARTTLS upgrade
      this.logger.log('STARTTLS mode enabled for port 587');
    }

    // Allow disabling STARTTLS if explicitly requested
    if (credentials.disableStartTls) {
      connectionOptions.ignoreTLS = true;
      connectionOptions.requireTLS = false;
    }

    // Add client hostname if provided
    if (typeof credentials.hostName === 'string' && credentials.hostName) {
      connectionOptions.name = credentials.hostName;
    }

    // Add authentication if credentials are provided
    if (credentials.user || credentials.password) {
      connectionOptions.auth = {
        user: credentials.user as string,
        pass: credentials.password as string,
      };
    }

    this.logger.log(`Initializing SMTP connection to ${credentials.host}:${credentials.port}`);
    this.transporter = createTransport(connectionOptions);
  }

  protected async performConnectionTest(): Promise<boolean> {
    if (!this.transporter) {
      await this.initializeConnection();
    }

    try {
      await this.transporter!.verify();
      this.logger.log('SMTP connection test successful');
      return true;
    } catch (error) {
      this.logger.error('SMTP connection test failed:', error);
      return false;
    }
  }

  protected async performHealthCheck(): Promise<void> {
    if (!this.config?.credentials?.host) {
      throw new Error('SMTP host not configured');
    }
    if (!this.config?.credentials?.port) {
      throw new Error('SMTP port not configured');
    }
  }

  protected async performRequest(request: ConnectorRequest): Promise<any> {
    throw new Error('Generic request not supported for SMTP connector. Use sendMessage instead.');
  }

  protected async performAction(actionId: string, input: any): Promise<any> {
    switch (actionId) {
      case 'send_email':
        return await this.sendEmail(input);
      default:
        throw new Error(`Unknown action: ${actionId}`);
    }
  }

  protected async cleanup(): Promise<void> {
    if (this.transporter) {
      this.transporter.close();
      this.transporter = null;
      this.logger.log('SMTP connection closed');
    }
  }

  // ICommunicationConnector interface methods
  async sendMessage(to: string | string[], message: any): Promise<ConnectorResponse> {
    // Map to sendEmail for SMTP
    return await this.sendEmail({
      toEmail: Array.isArray(to) ? to.join(',') : to,
      fromEmail: message.from || this.config.credentials.user,
      subject: message.subject || 'No Subject',
      text: message.text,
      html: message.html,
      emailFormat: message.html ? 'html' : 'text'
    });
  }

  async getMessages(options?: PaginatedRequest): Promise<ConnectorResponse> {
    return {
      success: false,
      error: {
        code: 'NOT_SUPPORTED',
        message: 'SMTP does not support receiving messages. Use IMAP connector instead.'
      }
    };
  }

  async getContact(contactId: string): Promise<ConnectorResponse> {
    return {
      success: false,
      error: {
        code: 'NOT_SUPPORTED',
        message: 'SMTP does not support contact management'
      }
    };
  }

  async upsertContact(contact: any): Promise<ConnectorResponse> {
    return {
      success: false,
      error: {
        code: 'NOT_SUPPORTED',
        message: 'SMTP does not support contact management'
      }
    };
  }

  // SMTP-specific methods
  private async sendEmail(params: any): Promise<ConnectorResponse> {
    try {
      if (!this.transporter) {
        await this.initializeConnection();
      }

      // Debug logging to see what parameters we receive
      this.logger.log('=== SMTP sendEmail called with params ===');
      this.logger.log(JSON.stringify(params, null, 2));

      const {
        fromEmail,
        toEmail,
        subject,
        emailFormat,
        text,
        html,
        ccEmail,
        bccEmail,
        replyTo,
        attachments,
        allowUnauthorizedCerts
      } = params;

      this.logger.log(`Extracted values - emailFormat: ${emailFormat}, text: ${text}, html: ${html}`);

      // Build mail options
      const mailOptions: any = {
        from: fromEmail,
        to: toEmail,
        subject: subject,
      };

      // Add optional fields
      if (ccEmail) mailOptions.cc = ccEmail;
      if (bccEmail) mailOptions.bcc = bccEmail;
      if (replyTo) mailOptions.replyTo = replyTo;

      // Add content based on format
      // If emailFormat is not specified, auto-detect based on content provided
      const format = emailFormat || (html ? 'html' : 'text');
      this.logger.log(`Using email format: ${format}`);

      if (format === 'text' || format === 'both') {
        mailOptions.text = text || '';
      }
      if (format === 'html' || format === 'both') {
        mailOptions.html = html || '';
      }

      this.logger.log(`Mail options prepared:`, JSON.stringify(mailOptions, null, 2));

      // Handle unauthorized certs
      if (allowUnauthorizedCerts) {
        const currentTransporter = this.transporter;
        if (currentTransporter) {
          // Create a new transporter with TLS options
          const credentials = this.config.credentials;
          const connectionOptions: SMTPTransport.Options = {
            host: credentials.host as string,
            port: credentials.port as number,
            secure: credentials.secure !== false,
            tls: {
              rejectUnauthorized: false
            }
          };

          if (credentials.user || credentials.password) {
            connectionOptions.auth = {
              user: credentials.user as string,
              pass: credentials.password as string,
            };
          }

          this.transporter = createTransport(connectionOptions);
        }
      }

      // TODO: Handle attachments from binary data
      // This would require access to the workflow context to get binary data

      this.logger.log(`Sending email to ${toEmail} with subject: ${subject}`);

      // Send the email
      const info = await this.transporter!.sendMail(mailOptions);

      this.logger.log(`Email sent successfully. Message ID: ${info.messageId}`);

      return {
        success: true,
        data: {
          messageId: info.messageId,
          accepted: info.accepted,
          rejected: info.rejected,
          response: info.response
        }
      };
    } catch (error: any) {
      this.logger.error('Failed to send email:', error);
      return this.handleError(error, 'Failed to send email');
    }
  }

  /**
   * Test SMTP connection
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
            message: 'SMTP connection test failed'
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
