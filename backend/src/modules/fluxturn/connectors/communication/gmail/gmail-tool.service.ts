import { Injectable, Logger } from '@nestjs/common';
import { ConnectorsService } from '../../connectors.service';
import { GmailConnector, GmailSendRequest } from './index';
import { AuthUtils } from '../../utils/auth.utils';
import { ApiUtils } from '../../utils/api.utils';
import { ConnectorConfig } from '../../types';

/**
 * Gmail Tool Service
 *
 * Provides Gmail operations for AI Agents as tools.
 * Tools are action nodes that can be connected to AI agents to perform specific tasks.
 *
 * Supported Operations:
 * - sendEmail: Send an email through Gmail
 * - getLabels: Get all Gmail labels
 */
@Injectable()
export class GmailToolService {
  private readonly logger = new Logger(GmailToolService.name);

  constructor(
    private readonly connectorsService: ConnectorsService,
    private readonly authUtils: AuthUtils,
    private readonly apiUtils: ApiUtils,
  ) {}

  /**
   * Execute Gmail tool operation
   */
  async execute(operation: string, params: any, credentialId: string): Promise<any> {
    this.logger.log(`Executing Gmail tool: ${operation}`);

    // Fetch Gmail credentials from database
    const credentials = await this.getCredentials(credentialId);

    // Initialize Gmail connector
    const gmailConnector = new GmailConnector(this.authUtils, this.apiUtils);
    await gmailConnector.initialize(credentials);

    // Execute operation
    switch (operation) {
      case 'sendEmail':
        return await this.sendEmail(gmailConnector, params);

      case 'getLabels':
        return await this.getLabels(gmailConnector);

      default:
        throw new Error(`Unknown Gmail tool operation: ${operation}`);
    }
  }

  /**
   * Send email through Gmail
   */
  private async sendEmail(
    gmailConnector: GmailConnector,
    params: {
      to: string;
      subject: string;
      message: string;
      emailType: 'html' | 'text';
      cc?: string;
      bcc?: string;
    },
  ): Promise<any> {
    this.logger.log(`Sending email to: ${params.to}`);

    // Parse recipients (comma-separated)
    const toArray = params.to.split(',').map(email => email.trim()).filter(Boolean);
    const ccArray = params.cc ? params.cc.split(',').map(email => email.trim()).filter(Boolean) : [];
    const bccArray = params.bcc ? params.bcc.split(',').map(email => email.trim()).filter(Boolean) : [];

    const sendRequest: GmailSendRequest = {
      to: toArray,
      cc: ccArray.length > 0 ? ccArray : undefined,
      bcc: bccArray.length > 0 ? bccArray : undefined,
      subject: params.subject,
      body: params.message,
      isHtml: params.emailType === 'html',
    };

    const result = await gmailConnector.sendEmail(sendRequest);

    if (!result.success) {
      throw new Error(result.error?.message || 'Failed to send email');
    }

    return {
      success: true,
      operation: 'sendEmail',
      data: {
        messageId: result.data.messageId,
        threadId: result.data.threadId,
        to: toArray,
        cc: ccArray.length > 0 ? ccArray : undefined,
        bcc: bccArray.length > 0 ? bccArray : undefined,
        subject: params.subject,
        sentAt: new Date().toISOString(),
      },
      message: `Email sent successfully to ${toArray.join(', ')}`,
    };
  }

  /**
   * Get all Gmail labels
   */
  private async getLabels(gmailConnector: GmailConnector): Promise<any> {
    this.logger.log('Fetching Gmail labels');

    const result = await gmailConnector.getLabels();

    if (!result.success) {
      throw new Error(result.error?.message || 'Failed to fetch labels');
    }

    return {
      success: true,
      operation: 'getLabels',
      data: {
        labels: result.data,
        count: result.data?.length || 0,
      },
      message: `Retrieved ${result.data?.length || 0} Gmail labels`,
    };
  }

  /**
   * Fetch Gmail credentials from ConnectorsService
   * This properly handles decryption of encrypted credentials
   */
  private async getCredentials(credentialId: string): Promise<ConnectorConfig> {
    this.logger.log(`Fetching Gmail credentials: ${credentialId}`);

    // Use ConnectorsService to get decrypted credentials
    const credentials = await this.connectorsService.getConnectorCredentials(credentialId);

    if (!credentials) {
      throw new Error(`Gmail credential not found: ${credentialId}`);
    }

    // Build ConnectorConfig with decrypted credentials
    const connectorConfig: ConnectorConfig = {
      id: credentialId,
      name: credentials.name || 'Gmail Account',
      type: 'gmail' as any,
      category: 'communication' as any,
      credentials: {
        accessToken: credentials.accessToken || credentials.access_token,
        refreshToken: credentials.refreshToken || credentials.refresh_token,
        expiresAt: credentials.expiresAt || credentials.expires_at,
        clientId: credentials.clientId || credentials.client_id,
        clientSecret: credentials.clientSecret || credentials.client_secret,
        ...credentials,
      },
    };

    return connectorConfig;
  }
}
