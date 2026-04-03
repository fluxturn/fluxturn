import { Logger } from '@nestjs/common';
import {
  ExecutableTool,
  ToolContext,
  ToolResult,
} from '../types/tool.interface';

/**
 * Gmail Send Email Tool
 *
 * Tool for AI Agents to send emails via Gmail.
 * Requires Gmail OAuth credentials.
 *
 * AI/Context Split:
 * - AI-controlled: subject, body (email content)
 * - Context-controlled: to, emailType, cc, bcc
 *
 * Note: This tool definition is used by the AI Agent to understand what the tool does.
 * The actual execution is delegated to GmailToolService which has proper dependency injection.
 */
export const GmailSendEmailTool: ExecutableTool = {
  name: 'gmail_send_email',
  description:
    'Send an email through Gmail. Use this tool when you need to send emails to users.',
  category: 'communication',
  requiresCredentials: true,
  connectorType: 'gmail',

  // Full parameters schema
  parameters: {
    type: 'object',
    properties: {
      to: {
        type: 'string',
        description:
          'The recipient email address(es). For multiple recipients, separate with commas.',
      },
      subject: {
        type: 'string',
        description: 'The email subject line.',
      },
      body: {
        type: 'string',
        description:
          'The email body content. Can be plain text or HTML depending on emailType.',
      },
      emailType: {
        type: 'string',
        description: 'The type of email content. Either "text" for plain text or "html" for HTML formatted email.',
        enum: ['text', 'html'],
      },
      cc: {
        type: 'string',
        description:
          'Carbon copy recipient(s). Optional. For multiple, separate with commas.',
      },
      bcc: {
        type: 'string',
        description:
          'Blind carbon copy recipient(s). Optional. For multiple, separate with commas.',
      },
    },
    required: ['to', 'subject', 'body'],
  },

  // AI-controlled parameters only
  aiParameters: {
    type: 'object',
    properties: {
      subject: {
        type: 'string',
        description: 'The email subject line. Be clear and concise.',
      },
      body: {
        type: 'string',
        description:
          'The email body content. Can include formatting if HTML type is used.',
      },
    },
    required: ['subject', 'body'],
  },

  // Context fields (from workflow)
  contextFields: ['to', 'emailType', 'cc', 'bcc'],
  execute: async (
    params: Record<string, any>,
    context: ToolContext,
  ): Promise<ToolResult> => {
    const logger = context.logger || new Logger('GmailSendEmailTool');

    try {
      logger.log(`Gmail Tool: Sending email to ${params.to}`);

      // Validate required parameters
      if (!params.to) {
        return {
          success: false,
          error: 'Missing required parameter: to (recipient email address)',
        };
      }
      if (!params.subject) {
        return {
          success: false,
          error: 'Missing required parameter: subject',
        };
      }
      if (!params.body) {
        return {
          success: false,
          error: 'Missing required parameter: body',
        };
      }

      // Check for credentials
      if (!context.credentials) {
        return {
          success: false,
          error: 'Gmail credentials not provided. Please connect a Gmail account.',
        };
      }

      // Use axios directly for Gmail API (avoiding complex dependency injection)
      const axios = (await import('axios')).default;

      // Get access token from credentials
      const accessToken = context.credentials.accessToken || context.credentials.access_token;

      if (!accessToken) {
        return {
          success: false,
          error: 'Gmail access token not found in credentials',
        };
      }

      // Parse recipients
      const toArray = params.to
        .split(',')
        .map((e: string) => e.trim())
        .filter(Boolean);

      // Build email message
      const emailLines = [
        `To: ${toArray.join(', ')}`,
        `Subject: ${params.subject}`,
        `Content-Type: ${params.emailType === 'html' ? 'text/html' : 'text/plain'}; charset=utf-8`,
        '',
        params.body,
      ];

      if (params.cc) {
        emailLines.splice(1, 0, `Cc: ${params.cc}`);
      }
      if (params.bcc) {
        emailLines.splice(1, 0, `Bcc: ${params.bcc}`);
      }

      const rawMessage = emailLines.join('\r\n');
      const encodedMessage = Buffer.from(rawMessage)
        .toString('base64')
        .replace(/\+/g, '-')
        .replace(/\//g, '_')
        .replace(/=+$/, '');

      // Send via Gmail API
      const response = await axios.post(
        'https://gmail.googleapis.com/gmail/v1/users/me/messages/send',
        { raw: encodedMessage },
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
          },
        },
      );

      logger.log(`Gmail Tool: Email sent successfully to ${params.to}`);

      return {
        success: true,
        data: {
          messageId: response.data.id,
          threadId: response.data.threadId,
          to: toArray,
          cc: params.cc?.split(',').map((e: string) => e.trim()).filter(Boolean),
          bcc: params.bcc?.split(',').map((e: string) => e.trim()).filter(Boolean),
          subject: params.subject,
          sentAt: new Date().toISOString(),
          message: `Email sent successfully to ${toArray.join(', ')}`,
        },
      };
    } catch (error: any) {
      logger.error(`Gmail Tool failed: ${error.message}`);

      // Handle OAuth token expiration
      if (error.response?.status === 401) {
        return {
          success: false,
          error: 'Gmail access token expired. Please reconnect your Gmail account.',
        };
      }

      return {
        success: false,
        error: `Failed to send email: ${error.response?.data?.error?.message || error.message}`,
      };
    }
  },
};

/**
 * Gmail Get Labels Tool
 *
 * Tool for AI Agents to fetch Gmail labels.
 */
export const GmailGetLabelsTool: ExecutableTool = {
  name: 'gmail_get_labels',
  description:
    'Get all Gmail labels from the connected Gmail account. Use this to see available folders/categories.',
  category: 'communication',
  requiresCredentials: true,
  connectorType: 'gmail',
  parameters: {
    type: 'object',
    properties: {},
    required: [],
  },
  execute: async (
    params: Record<string, any>,
    context: ToolContext,
  ): Promise<ToolResult> => {
    const logger = context.logger || new Logger('GmailGetLabelsTool');

    try {
      logger.log('Gmail Tool: Fetching labels');

      if (!context.credentials) {
        return {
          success: false,
          error: 'Gmail credentials not provided. Please connect a Gmail account.',
        };
      }

      const axios = (await import('axios')).default;

      const accessToken = context.credentials.accessToken || context.credentials.access_token;

      if (!accessToken) {
        return {
          success: false,
          error: 'Gmail access token not found in credentials',
        };
      }

      const response = await axios.get(
        'https://gmail.googleapis.com/gmail/v1/users/me/labels',
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        },
      );

      const labels = response.data.labels || [];

      return {
        success: true,
        data: {
          labels: labels.map((label: any) => ({
            id: label.id,
            name: label.name,
            type: label.type,
          })),
          count: labels.length,
        },
      };
    } catch (error: any) {
      logger.error(`Gmail Get Labels failed: ${error.message}`);

      if (error.response?.status === 401) {
        return {
          success: false,
          error: 'Gmail access token expired. Please reconnect your Gmail account.',
        };
      }

      return {
        success: false,
        error: `Failed to get labels: ${error.response?.data?.error?.message || error.message}`,
      };
    }
  },
};

/**
 * Get all Gmail tools
 */
export function getGmailTools(): ExecutableTool[] {
  return [GmailSendEmailTool, GmailGetLabelsTool];
}
