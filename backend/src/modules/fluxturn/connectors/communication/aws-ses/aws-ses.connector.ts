import { Injectable, Logger } from '@nestjs/common';
import {
  SESClient,
  SendEmailCommand,
  SendTemplatedEmailCommand,
  SendBulkTemplatedEmailCommand,
  GetSendStatisticsCommand
} from '@aws-sdk/client-ses';
import { BaseConnector } from '../../base/base.connector';
import { ICommunicationConnector } from '../../base/connector.interface';
import {
  ConnectorMetadata,
  ConnectorResponse,
  ConnectorCategory,
  AuthType,
  ConnectorConfig,
  ConnectorRequest,
  PaginatedRequest
} from '../../types';

interface AWSCredentials {
  accessKeyId: string;
  secretAccessKey: string;
  region: string;
  configurationSetName?: string;
}

@Injectable()
export class AWSSESConnector extends BaseConnector implements ICommunicationConnector {
  protected readonly logger = new Logger(AWSSESConnector.name);
  private sesClient: SESClient;
  private credentials: AWSCredentials;

  getMetadata(): ConnectorMetadata {
    return {
      name: 'aws_ses',
      description: 'Amazon Simple Email Service connector for sending transactional and marketing emails',
      version: '1.0.0',
      category: ConnectorCategory.COMMUNICATION,
      type: 'aws_ses' as any,
      authType: AuthType.API_KEY,
      actions: [
        {
          id: 'send_email',
          name: 'Send Email',
          description: 'Send a transactional email',
          inputSchema: {},
          outputSchema: {}
        },
        {
          id: 'send_templated_email',
          name: 'Send Templated Email',
          description: 'Send email using SES template',
          inputSchema: {},
          outputSchema: {}
        },
        {
          id: 'send_bulk_email',
          name: 'Send Bulk Templated Email',
          description: 'Send personalized emails to multiple recipients',
          inputSchema: {},
          outputSchema: {}
        },
        {
          id: 'get_send_statistics',
          name: 'Get Send Statistics',
          description: 'Get email sending statistics',
          inputSchema: {},
          outputSchema: {}
        }
      ],
      triggers: [
        {
          id: 'bounce',
          name: 'Email Bounced',
          description: 'Triggers when an email bounces',
          eventType: 'ses:bounce',
          webhookRequired: true,
          outputSchema: {}
        },
        {
          id: 'complaint',
          name: 'Spam Complaint',
          description: 'Triggers when recipient marks email as spam',
          eventType: 'ses:complaint',
          webhookRequired: true,
          outputSchema: {}
        },
        {
          id: 'delivery',
          name: 'Email Delivered',
          description: 'Triggers when email is delivered',
          eventType: 'ses:delivery',
          webhookRequired: true,
          outputSchema: {}
        },
        {
          id: 'open',
          name: 'Email Opened',
          description: 'Triggers when email is opened',
          eventType: 'ses:open',
          webhookRequired: true,
          outputSchema: {}
        },
        {
          id: 'click',
          name: 'Link Clicked',
          description: 'Triggers when a link is clicked',
          eventType: 'ses:click',
          webhookRequired: true,
          outputSchema: {}
        }
      ],
      webhookSupport: true
    };
  }

  protected async initializeConnection(): Promise<void> {
    this.logger.log(`Initializing AWS SES connector`);

    // Get credentials from config
    const creds = this.config.credentials as AWSCredentials;

    if (!creds?.accessKeyId || !creds?.secretAccessKey) {
      throw new Error('AWS Access Key ID and Secret Access Key are required');
    }

    this.credentials = {
      accessKeyId: creds.accessKeyId,
      secretAccessKey: creds.secretAccessKey,
      region: creds.region || 'us-east-1',
      configurationSetName: creds.configurationSetName
    };

    // Initialize SES client
    this.sesClient = new SESClient({
      region: this.credentials.region,
      credentials: {
        accessKeyId: this.credentials.accessKeyId,
        secretAccessKey: this.credentials.secretAccessKey
      }
    });

    this.logger.log(`AWS SES connector initialized for region: ${this.credentials.region}`);
  }

  protected async performConnectionTest(): Promise<boolean> {
    try {
      // Test connection by getting send statistics
      const command = new GetSendStatisticsCommand({});
      await this.sesClient.send(command);
      return true;
    } catch (error) {
      this.logger.error('SES connection test failed:', error.message);
      return false;
    }
  }

  protected async performHealthCheck(): Promise<void> {
    if (!this.sesClient) {
      throw new Error('SES client not initialized');
    }
  }

  protected async performRequest(request: ConnectorRequest): Promise<any> {
    throw new Error('Use executeAction instead for SES operations');
  }

  protected async performAction(actionId: string, input: any): Promise<any> {
    switch (actionId) {
      case 'send_email':
        return this.sendEmail(input);
      case 'send_templated_email':
        return this.sendTemplatedEmail(input);
      case 'send_bulk_email':
        return this.sendBulkEmail(input);
      case 'get_send_statistics':
        return this.getSendStatistics();
      default:
        throw new Error(`Unknown action: ${actionId}`);
    }
  }

  protected async cleanup(): Promise<void> {
    this.sesClient = null as any;
    this.logger.log('AWS SES connector cleanup completed');
  }

  // ==================== SEND EMAIL ====================
  private async sendEmail(input: any): Promise<ConnectorResponse> {
    try {
      const {
        fromEmail,
        fromName,
        toEmail,
        ccEmail,
        bccEmail,
        replyTo,
        subject,
        bodyType,
        htmlBody,
        textBody
      } = input;

      const from = fromName ? `${fromName} <${fromEmail}>` : fromEmail;
      const toAddresses = this.parseEmailList(toEmail);
      const ccAddresses = ccEmail ? this.parseEmailList(ccEmail) : undefined;
      const bccAddresses = bccEmail ? this.parseEmailList(bccEmail) : undefined;
      const replyToAddresses = replyTo ? this.parseEmailList(replyTo) : undefined;

      const command = new SendEmailCommand({
        Source: from,
        Destination: {
          ToAddresses: toAddresses,
          CcAddresses: ccAddresses,
          BccAddresses: bccAddresses
        },
        ReplyToAddresses: replyToAddresses,
        Message: {
          Subject: {
            Data: subject,
            Charset: 'UTF-8'
          },
          Body: {
            ...(bodyType !== 'text' && htmlBody ? {
              Html: {
                Data: htmlBody,
                Charset: 'UTF-8'
              }
            } : {}),
            ...(bodyType !== 'html' && textBody ? {
              Text: {
                Data: textBody,
                Charset: 'UTF-8'
              }
            } : {})
          }
        },
        ConfigurationSetName: this.credentials.configurationSetName
      });

      const response = await this.sesClient.send(command);

      this.logger.log(`Email sent successfully. MessageId: ${response.MessageId}`);

      return {
        success: true,
        data: {
          messageId: response.MessageId,
          status: 'sent',
          recipients: toAddresses,
          timestamp: new Date().toISOString()
        }
      };
    } catch (error) {
      this.logger.error('Failed to send email:', error.message);
      return {
        success: false,
        error: {
          code: 'SEND_EMAIL_FAILED',
          message: error.message
        }
      };
    }
  }

  // ==================== SEND TEMPLATED EMAIL ====================
  private async sendTemplatedEmail(input: any): Promise<ConnectorResponse> {
    try {
      const { fromEmail, toEmail, templateName, templateData } = input;

      const toAddresses = this.parseEmailList(toEmail);

      const command = new SendTemplatedEmailCommand({
        Source: fromEmail,
        Destination: {
          ToAddresses: toAddresses
        },
        Template: templateName,
        TemplateData: typeof templateData === 'string' ? templateData : JSON.stringify(templateData),
        ConfigurationSetName: this.credentials.configurationSetName
      });

      const response = await this.sesClient.send(command);

      this.logger.log(`Templated email sent. MessageId: ${response.MessageId}`);

      return {
        success: true,
        data: {
          messageId: response.MessageId,
          status: 'sent',
          template: templateName,
          recipients: toAddresses
        }
      };
    } catch (error) {
      this.logger.error('Failed to send templated email:', error.message);
      return {
        success: false,
        error: {
          code: 'SEND_TEMPLATED_EMAIL_FAILED',
          message: error.message
        }
      };
    }
  }

  // ==================== SEND BULK EMAIL ====================
  private async sendBulkEmail(input: any): Promise<ConnectorResponse> {
    try {
      const { fromEmail, templateName, recipients, defaultTemplateData } = input;

      const destinations = recipients.map((r: any) => ({
        Destination: {
          ToAddresses: [r.email]
        },
        ReplacementTemplateData: typeof r.templateData === 'string'
          ? r.templateData
          : JSON.stringify(r.templateData || {})
      }));

      const command = new SendBulkTemplatedEmailCommand({
        Source: fromEmail,
        Template: templateName,
        DefaultTemplateData: typeof defaultTemplateData === 'string'
          ? defaultTemplateData
          : JSON.stringify(defaultTemplateData || {}),
        Destinations: destinations,
        ConfigurationSetName: this.credentials.configurationSetName
      });

      const response = await this.sesClient.send(command);

      const successful = response.Status?.filter(s => s.Status === 'Success').length || 0;
      const failed = response.Status?.filter(s => s.Status !== 'Success').length || 0;
      const messageIds = response.Status?.map(s => s.MessageId).filter(Boolean) || [];

      this.logger.log(`Bulk email sent. Success: ${successful}, Failed: ${failed}`);

      return {
        success: true,
        data: {
          successful,
          failed,
          messageIds,
          details: response.Status
        }
      };
    } catch (error) {
      this.logger.error('Failed to send bulk email:', error.message);
      return {
        success: false,
        error: {
          code: 'SEND_BULK_EMAIL_FAILED',
          message: error.message
        }
      };
    }
  }

  // ==================== GET SEND STATISTICS ====================
  private async getSendStatistics(): Promise<ConnectorResponse> {
    try {
      const command = new GetSendStatisticsCommand({});
      const response = await this.sesClient.send(command);

      const stats = {
        deliveryAttempts: 0,
        bounces: 0,
        complaints: 0,
        rejects: 0,
        dataPoints: response.SendDataPoints || []
      };

      // Aggregate statistics
      response.SendDataPoints?.forEach(dp => {
        stats.deliveryAttempts += dp.DeliveryAttempts || 0;
        stats.bounces += dp.Bounces || 0;
        stats.complaints += dp.Complaints || 0;
        stats.rejects += dp.Rejects || 0;
      });

      return {
        success: true,
        data: stats
      };
    } catch (error) {
      this.logger.error('Failed to get send statistics:', error.message);
      return {
        success: false,
        error: {
          code: 'GET_STATISTICS_FAILED',
          message: error.message
        }
      };
    }
  }

  // ==================== INTERFACE METHODS ====================
  async sendMessage(to: string | string[], message: any): Promise<ConnectorResponse> {
    const toEmail = Array.isArray(to) ? to.join(',') : to;
    return this.sendEmail({
      fromEmail: message.from || this.config.settings?.defaultFrom,
      toEmail,
      subject: message.subject,
      bodyType: message.html ? 'html' : 'text',
      htmlBody: message.html,
      textBody: message.text
    });
  }

  async getMessages(options?: PaginatedRequest): Promise<ConnectorResponse> {
    return {
      success: false,
      error: {
        code: 'NOT_SUPPORTED',
        message: 'SES does not support fetching messages. Use IMAP for inbox access.'
      }
    };
  }

  async getContact(contactId: string): Promise<ConnectorResponse> {
    return {
      success: false,
      error: {
        code: 'NOT_SUPPORTED',
        message: 'SES does not support contact management'
      }
    };
  }

  async upsertContact(contact: any): Promise<ConnectorResponse> {
    return {
      success: false,
      error: {
        code: 'NOT_SUPPORTED',
        message: 'SES does not support contact management'
      }
    };
  }

  // ==================== HELPER METHODS ====================
  private parseEmailList(emailStr: string): string[] {
    return emailStr.split(',').map(e => e.trim()).filter(Boolean);
  }

  // ==================== WEBHOOK PROCESSING ====================
  async processWebhook(payload: any, headers: Record<string, string>): Promise<any> {
    // SNS sends notifications as JSON
    let notification = payload;

    // Handle SNS subscription confirmation
    if (notification.Type === 'SubscriptionConfirmation') {
      this.logger.log('SNS subscription confirmation received');
      return {
        type: 'subscription_confirmation',
        subscribeUrl: notification.SubscribeURL
      };
    }

    // Parse SNS notification message
    if (notification.Type === 'Notification') {
      notification = JSON.parse(notification.Message);
    }

    const eventType = notification.eventType || notification.notificationType;

    this.logger.log(`Processing SES webhook event: ${eventType}`);

    switch (eventType) {
      case 'Bounce':
        return {
          type: 'bounce',
          bounceType: notification.bounce?.bounceType,
          bounceSubType: notification.bounce?.bounceSubType,
          bouncedRecipients: notification.bounce?.bouncedRecipients?.map((r: any) => r.emailAddress),
          timestamp: notification.bounce?.timestamp,
          messageId: notification.mail?.messageId
        };

      case 'Complaint':
        return {
          type: 'complaint',
          complainedRecipients: notification.complaint?.complainedRecipients?.map((r: any) => r.emailAddress),
          complaintFeedbackType: notification.complaint?.complaintFeedbackType,
          timestamp: notification.complaint?.timestamp,
          messageId: notification.mail?.messageId
        };

      case 'Delivery':
        return {
          type: 'delivery',
          recipients: notification.delivery?.recipients,
          timestamp: notification.delivery?.timestamp,
          processingTimeMillis: notification.delivery?.processingTimeMillis,
          smtpResponse: notification.delivery?.smtpResponse,
          messageId: notification.mail?.messageId
        };

      case 'Open':
        return {
          type: 'open',
          recipient: notification.mail?.destination?.[0],
          timestamp: notification.open?.timestamp,
          userAgent: notification.open?.userAgent,
          ipAddress: notification.open?.ipAddress,
          messageId: notification.mail?.messageId
        };

      case 'Click':
        return {
          type: 'click',
          recipient: notification.mail?.destination?.[0],
          link: notification.click?.link,
          linkTags: notification.click?.linkTags,
          timestamp: notification.click?.timestamp,
          userAgent: notification.click?.userAgent,
          ipAddress: notification.click?.ipAddress,
          messageId: notification.mail?.messageId
        };

      default:
        this.logger.warn(`Unknown SES event type: ${eventType}`);
        return notification;
    }
  }
}
