import { Logger } from '@nestjs/common';
import {
  ExecutableTool,
  ToolContext,
  ToolResult,
} from '../types/tool.interface';

/**
 * Telegram Send Message Tool
 *
 * Tool for AI Agents to send messages via Telegram Bot API.
 * Requires Telegram Bot Token.
 *
 * AI/Context Split:
 * - AI-controlled: text (message content)
 * - Context-controlled: chat_id, parse_mode, disable_notification
 */
export const TelegramSendMessageTool: ExecutableTool = {
  name: 'telegram_send_message',
  description:
    'Send a text message to a Telegram chat using your bot. Use this tool when you need to send messages, notifications, or updates via Telegram.',
  category: 'communication',
  requiresCredentials: true,
  connectorType: 'telegram',

  // Full parameters schema (all fields)
  parameters: {
    type: 'object',
    properties: {
      chat_id: {
        type: 'string',
        description:
          'The unique identifier for the target chat or username of the target channel (in the format @channelusername).',
      },
      text: {
        type: 'string',
        description:
          'The text of the message to be sent. Max 4096 characters.',
      },
      parse_mode: {
        type: 'string',
        description:
          'Optional. Mode for parsing entities in the message text. Options: Markdown, MarkdownV2, HTML.',
        enum: ['Markdown', 'MarkdownV2', 'HTML'],
      },
      disable_notification: {
        type: 'boolean',
        description:
          'Optional. Sends the message silently. Users will receive a notification with no sound.',
      },
      reply_to_message_id: {
        type: 'number',
        description:
          'Optional. If the message is a reply, ID of the original message.',
      },
    },
    required: ['chat_id', 'text'],
  },

  // AI-controlled parameters only (exposed to LLM)
  aiParameters: {
    type: 'object',
    properties: {
      text: {
        type: 'string',
        description:
          'The message text to send. Can include emojis and formatting.',
      },
    },
    required: ['text'],
  },

  // Fields that come from workflow context (not AI)
  contextFields: ['chat_id', 'parse_mode', 'disable_notification'],
  execute: async (
    params: Record<string, any>,
    context: ToolContext,
  ): Promise<ToolResult> => {
    const logger = context.logger || new Logger('TelegramSendMessageTool');

    try {
      logger.log(`Telegram Tool: Sending message to ${params.chat_id}`);

      // Validate required parameters
      if (!params.chat_id) {
        return {
          success: false,
          error: 'Missing required parameter: chat_id',
        };
      }
      if (!params.text) {
        return {
          success: false,
          error: 'Missing required parameter: text',
        };
      }

      // Check for credentials
      if (!context.credentials) {
        return {
          success: false,
          error: 'Telegram credentials not provided. Please configure your Telegram bot.',
        };
      }

      const axios = (await import('axios')).default;

      // Get bot token from credentials
      const botToken = context.credentials.botToken || context.credentials.bot_token;

      if (!botToken) {
        return {
          success: false,
          error: 'Telegram bot token not found in credentials',
        };
      }

      // Build request body
      const requestBody: Record<string, any> = {
        chat_id: params.chat_id,
        text: params.text,
      };

      if (params.parse_mode) {
        requestBody.parse_mode = params.parse_mode;
      }
      if (params.disable_notification !== undefined) {
        requestBody.disable_notification = params.disable_notification;
      }
      if (params.reply_to_message_id) {
        requestBody.reply_to_message_id = params.reply_to_message_id;
      }

      // Send via Telegram Bot API
      const response = await axios.post(
        `https://api.telegram.org/bot${botToken}/sendMessage`,
        requestBody,
        {
          headers: {
            'Content-Type': 'application/json',
          },
        },
      );

      if (!response.data.ok) {
        return {
          success: false,
          error: `Telegram API error: ${response.data.description}`,
        };
      }

      logger.log(`Telegram Tool: Message sent successfully to ${params.chat_id}`);

      return {
        success: true,
        data: {
          message_id: response.data.result.message_id,
          chat_id: response.data.result.chat.id,
          date: response.data.result.date,
          message: `Message sent successfully to chat ${params.chat_id}`,
        },
      };
    } catch (error: any) {
      logger.error(`Telegram Tool failed: ${error.message}`);

      if (error.response?.status === 401) {
        return {
          success: false,
          error: 'Telegram bot token is invalid. Please check your credentials.',
        };
      }

      return {
        success: false,
        error: `Failed to send message: ${error.response?.data?.description || error.message}`,
      };
    }
  },
};

/**
 * Telegram Send Photo Tool
 *
 * Tool for AI Agents to send photos via Telegram Bot API.
 *
 * AI/Context Split:
 * - AI-controlled: caption (photo description)
 * - Context-controlled: chat_id, photo, parse_mode
 */
export const TelegramSendPhotoTool: ExecutableTool = {
  name: 'telegram_send_photo',
  description:
    'Send a photo to a Telegram chat using your bot. You can send a photo by URL or file_id.',
  category: 'communication',
  requiresCredentials: true,
  connectorType: 'telegram',

  // Full parameters schema
  parameters: {
    type: 'object',
    properties: {
      chat_id: {
        type: 'string',
        description:
          'The unique identifier for the target chat or username of the target channel.',
      },
      photo: {
        type: 'string',
        description:
          'Photo to send. Pass a URL or file_id of an existing photo on Telegram servers.',
      },
      caption: {
        type: 'string',
        description:
          'Optional. Photo caption, 0-1024 characters.',
      },
      parse_mode: {
        type: 'string',
        description:
          'Optional. Mode for parsing entities in the caption. Options: Markdown, MarkdownV2, HTML.',
        enum: ['Markdown', 'MarkdownV2', 'HTML'],
      },
    },
    required: ['chat_id', 'photo'],
  },

  // AI-controlled parameters only
  aiParameters: {
    type: 'object',
    properties: {
      caption: {
        type: 'string',
        description:
          'Optional caption text for the photo. Describe the photo or add context.',
      },
    },
    required: [],
  },

  // Context fields (from workflow)
  contextFields: ['chat_id', 'photo', 'parse_mode'],
  execute: async (
    params: Record<string, any>,
    context: ToolContext,
  ): Promise<ToolResult> => {
    const logger = context.logger || new Logger('TelegramSendPhotoTool');

    try {
      logger.log(`Telegram Tool: Sending photo to ${params.chat_id}`);

      if (!params.chat_id) {
        return {
          success: false,
          error: 'Missing required parameter: chat_id',
        };
      }
      if (!params.photo) {
        return {
          success: false,
          error: 'Missing required parameter: photo',
        };
      }

      if (!context.credentials) {
        return {
          success: false,
          error: 'Telegram credentials not provided. Please configure your Telegram bot.',
        };
      }

      const axios = (await import('axios')).default;

      const botToken = context.credentials.botToken || context.credentials.bot_token;

      if (!botToken) {
        return {
          success: false,
          error: 'Telegram bot token not found in credentials',
        };
      }

      const requestBody: Record<string, any> = {
        chat_id: params.chat_id,
        photo: params.photo,
      };

      if (params.caption) {
        requestBody.caption = params.caption;
      }
      if (params.parse_mode) {
        requestBody.parse_mode = params.parse_mode;
      }

      const response = await axios.post(
        `https://api.telegram.org/bot${botToken}/sendPhoto`,
        requestBody,
        {
          headers: {
            'Content-Type': 'application/json',
          },
        },
      );

      if (!response.data.ok) {
        return {
          success: false,
          error: `Telegram API error: ${response.data.description}`,
        };
      }

      return {
        success: true,
        data: {
          message_id: response.data.result.message_id,
          chat_id: response.data.result.chat.id,
          photo: response.data.result.photo,
          message: 'Photo sent successfully',
        },
      };
    } catch (error: any) {
      logger.error(`Telegram Send Photo failed: ${error.message}`);

      return {
        success: false,
        error: `Failed to send photo: ${error.response?.data?.description || error.message}`,
      };
    }
  },
};

/**
 * Telegram Get Chat Tool
 *
 * Tool for AI Agents to get information about a Telegram chat.
 */
export const TelegramGetChatTool: ExecutableTool = {
  name: 'telegram_get_chat',
  description:
    'Get information about a Telegram chat (group, channel, or private chat). Returns chat title, type, member count, and other details.',
  category: 'communication',
  requiresCredentials: true,
  connectorType: 'telegram',
  parameters: {
    type: 'object',
    properties: {
      chat_id: {
        type: 'string',
        description:
          'The unique identifier for the target chat or username of the target supergroup/channel.',
      },
    },
    required: ['chat_id'],
  },
  execute: async (
    params: Record<string, any>,
    context: ToolContext,
  ): Promise<ToolResult> => {
    const logger = context.logger || new Logger('TelegramGetChatTool');

    try {
      logger.log(`Telegram Tool: Getting chat info for ${params.chat_id}`);

      if (!params.chat_id) {
        return {
          success: false,
          error: 'Missing required parameter: chat_id',
        };
      }

      if (!context.credentials) {
        return {
          success: false,
          error: 'Telegram credentials not provided. Please configure your Telegram bot.',
        };
      }

      const axios = (await import('axios')).default;

      const botToken = context.credentials.botToken || context.credentials.bot_token;

      if (!botToken) {
        return {
          success: false,
          error: 'Telegram bot token not found in credentials',
        };
      }

      const response = await axios.post(
        `https://api.telegram.org/bot${botToken}/getChat`,
        { chat_id: params.chat_id },
        {
          headers: {
            'Content-Type': 'application/json',
          },
        },
      );

      if (!response.data.ok) {
        return {
          success: false,
          error: `Telegram API error: ${response.data.description}`,
        };
      }

      const chat = response.data.result;

      return {
        success: true,
        data: {
          id: chat.id,
          type: chat.type,
          title: chat.title,
          username: chat.username,
          first_name: chat.first_name,
          last_name: chat.last_name,
          description: chat.description,
          invite_link: chat.invite_link,
        },
      };
    } catch (error: any) {
      logger.error(`Telegram Get Chat failed: ${error.message}`);

      return {
        success: false,
        error: `Failed to get chat info: ${error.response?.data?.description || error.message}`,
      };
    }
  },
};

/**
 * Telegram Get Updates Tool
 *
 * Tool for AI Agents to get recent updates/messages received by the bot.
 */
export const TelegramGetUpdatesTool: ExecutableTool = {
  name: 'telegram_get_updates',
  description:
    'Get recent updates (messages, callbacks, etc.) received by your Telegram bot. Useful for checking recent activity or incoming messages.',
  category: 'communication',
  requiresCredentials: true,
  connectorType: 'telegram',
  parameters: {
    type: 'object',
    properties: {
      limit: {
        type: 'number',
        description:
          'Optional. Maximum number of updates to retrieve (1-100). Default: 10.',
      },
      offset: {
        type: 'number',
        description:
          'Optional. Identifier of the first update to be returned. Use to skip already processed updates.',
      },
    },
    required: [],
  },
  execute: async (
    params: Record<string, any>,
    context: ToolContext,
  ): Promise<ToolResult> => {
    const logger = context.logger || new Logger('TelegramGetUpdatesTool');

    try {
      logger.log('Telegram Tool: Getting recent updates');

      if (!context.credentials) {
        return {
          success: false,
          error: 'Telegram credentials not provided. Please configure your Telegram bot.',
        };
      }

      const axios = (await import('axios')).default;

      const botToken = context.credentials.botToken || context.credentials.bot_token;

      if (!botToken) {
        return {
          success: false,
          error: 'Telegram bot token not found in credentials',
        };
      }

      const requestBody: Record<string, any> = {
        limit: params.limit || 10,
      };

      if (params.offset) {
        requestBody.offset = params.offset;
      }

      const response = await axios.post(
        `https://api.telegram.org/bot${botToken}/getUpdates`,
        requestBody,
        {
          headers: {
            'Content-Type': 'application/json',
          },
        },
      );

      if (!response.data.ok) {
        return {
          success: false,
          error: `Telegram API error: ${response.data.description}`,
        };
      }

      const updates = response.data.result || [];

      return {
        success: true,
        data: {
          updates: updates.map((update: any) => ({
            update_id: update.update_id,
            message: update.message
              ? {
                  message_id: update.message.message_id,
                  from: update.message.from,
                  chat: update.message.chat,
                  date: update.message.date,
                  text: update.message.text,
                }
              : null,
            callback_query: update.callback_query,
          })),
          count: updates.length,
        },
      };
    } catch (error: any) {
      logger.error(`Telegram Get Updates failed: ${error.message}`);

      return {
        success: false,
        error: `Failed to get updates: ${error.response?.data?.description || error.message}`,
      };
    }
  },
};

/**
 * Get all Telegram tools
 */
export function getTelegramTools(): ExecutableTool[] {
  return [
    TelegramSendMessageTool,
    TelegramSendPhotoTool,
    TelegramGetChatTool,
    TelegramGetUpdatesTool,
  ];
}
