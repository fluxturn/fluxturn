import { Logger } from '@nestjs/common';
import {
  ExecutableTool,
  ToolContext,
  ToolResult,
} from '../types/tool.interface';

/**
 * Discord Send Message Tool
 *
 * Tool for AI Agents to send messages via Discord Bot API.
 * Requires Discord Bot Token with appropriate permissions.
 *
 * AI/Context Split:
 * - AI-controlled: content (message text)
 * - Context-controlled: channel_id, tts, embed
 */
export const DiscordSendMessageTool: ExecutableTool = {
  name: 'discord_send_message',
  description:
    'Send a message to a Discord channel using your bot. Use this tool when you need to post messages, notifications, or updates to Discord.',
  category: 'communication',
  requiresCredentials: true,
  connectorType: 'discord',

  // Full parameters schema
  parameters: {
    type: 'object',
    properties: {
      channel_id: {
        type: 'string',
        description:
          'The ID of the channel to send the message to. You can get this by enabling Developer Mode in Discord and right-clicking a channel.',
      },
      content: {
        type: 'string',
        description:
          'The message content to send. Max 2000 characters. Supports Discord markdown.',
      },
      tts: {
        type: 'boolean',
        description:
          'Optional. True if this is a text-to-speech message.',
      },
      embed: {
        type: 'object',
        description:
          'Optional. An embed object to include in the message. Use for rich formatted content.',
      },
    },
    required: ['channel_id', 'content'],
  },

  // AI-controlled parameters only
  aiParameters: {
    type: 'object',
    properties: {
      content: {
        type: 'string',
        description:
          'The message content to send. Supports Discord markdown formatting.',
      },
    },
    required: ['content'],
  },

  // Context fields (from workflow)
  contextFields: ['channel_id', 'tts', 'embed'],
  execute: async (
    params: Record<string, any>,
    context: ToolContext,
  ): Promise<ToolResult> => {
    const logger = context.logger || new Logger('DiscordSendMessageTool');

    try {
      logger.log(`Discord Tool: Sending message to channel ${params.channel_id}`);

      // Validate required parameters
      if (!params.channel_id) {
        return {
          success: false,
          error: 'Missing required parameter: channel_id',
        };
      }
      if (!params.content) {
        return {
          success: false,
          error: 'Missing required parameter: content',
        };
      }

      // Check for credentials
      if (!context.credentials) {
        return {
          success: false,
          error: 'Discord credentials not provided. Please configure your Discord bot.',
        };
      }

      const axios = (await import('axios')).default;

      // Get bot token from credentials
      const botToken = context.credentials.botToken || context.credentials.bot_token;

      if (!botToken) {
        return {
          success: false,
          error: 'Discord bot token not found in credentials',
        };
      }

      // Build request body
      const requestBody: Record<string, any> = {
        content: params.content,
      };

      if (params.tts !== undefined) {
        requestBody.tts = params.tts;
      }
      if (params.embed) {
        requestBody.embeds = [params.embed];
      }

      // Send via Discord API
      const response = await axios.post(
        `https://discord.com/api/v10/channels/${params.channel_id}/messages`,
        requestBody,
        {
          headers: {
            Authorization: `Bot ${botToken}`,
            'Content-Type': 'application/json',
          },
        },
      );

      logger.log(`Discord Tool: Message sent successfully to channel ${params.channel_id}`);

      return {
        success: true,
        data: {
          message_id: response.data.id,
          channel_id: response.data.channel_id,
          content: response.data.content,
          timestamp: response.data.timestamp,
          message: `Message sent successfully to channel ${params.channel_id}`,
        },
      };
    } catch (error: any) {
      logger.error(`Discord Tool failed: ${error.message}`);

      if (error.response?.status === 401) {
        return {
          success: false,
          error: 'Discord bot token is invalid. Please check your credentials.',
        };
      }
      if (error.response?.status === 403) {
        return {
          success: false,
          error: 'Bot lacks permission to send messages in this channel.',
        };
      }
      if (error.response?.status === 404) {
        return {
          success: false,
          error: 'Channel not found. Please check the channel ID.',
        };
      }

      return {
        success: false,
        error: `Failed to send message: ${error.response?.data?.message || error.message}`,
      };
    }
  },
};

/**
 * Discord Get Channels Tool
 *
 * Tool for AI Agents to list channels in a Discord guild/server.
 */
export const DiscordGetChannelsTool: ExecutableTool = {
  name: 'discord_get_channels',
  description:
    'Get a list of all channels in a Discord server (guild). Use this to find channel IDs for sending messages.',
  category: 'communication',
  requiresCredentials: true,
  connectorType: 'discord',
  parameters: {
    type: 'object',
    properties: {
      guild_id: {
        type: 'string',
        description:
          'The ID of the Discord server (guild) to get channels from. Enable Developer Mode to copy this.',
      },
    },
    required: ['guild_id'],
  },
  execute: async (
    params: Record<string, any>,
    context: ToolContext,
  ): Promise<ToolResult> => {
    const logger = context.logger || new Logger('DiscordGetChannelsTool');

    try {
      logger.log(`Discord Tool: Getting channels for guild ${params.guild_id}`);

      if (!params.guild_id) {
        return {
          success: false,
          error: 'Missing required parameter: guild_id',
        };
      }

      if (!context.credentials) {
        return {
          success: false,
          error: 'Discord credentials not provided. Please configure your Discord bot.',
        };
      }

      const axios = (await import('axios')).default;

      const botToken = context.credentials.botToken || context.credentials.bot_token;

      if (!botToken) {
        return {
          success: false,
          error: 'Discord bot token not found in credentials',
        };
      }

      const response = await axios.get(
        `https://discord.com/api/v10/guilds/${params.guild_id}/channels`,
        {
          headers: {
            Authorization: `Bot ${botToken}`,
          },
        },
      );

      const channels = response.data || [];

      // Channel type mapping
      const channelTypes: Record<number, string> = {
        0: 'text',
        2: 'voice',
        4: 'category',
        5: 'announcement',
        10: 'announcement_thread',
        11: 'public_thread',
        12: 'private_thread',
        13: 'stage_voice',
        14: 'directory',
        15: 'forum',
      };

      return {
        success: true,
        data: {
          channels: channels.map((channel: any) => ({
            id: channel.id,
            name: channel.name,
            type: channelTypes[channel.type] || 'unknown',
            type_id: channel.type,
            position: channel.position,
            parent_id: channel.parent_id,
            topic: channel.topic,
          })),
          count: channels.length,
        },
      };
    } catch (error: any) {
      logger.error(`Discord Get Channels failed: ${error.message}`);

      if (error.response?.status === 401) {
        return {
          success: false,
          error: 'Discord bot token is invalid. Please check your credentials.',
        };
      }
      if (error.response?.status === 403) {
        return {
          success: false,
          error: 'Bot is not a member of this guild or lacks permissions.',
        };
      }

      return {
        success: false,
        error: `Failed to get channels: ${error.response?.data?.message || error.message}`,
      };
    }
  },
};

/**
 * Discord Get Guild Members Tool
 *
 * Tool for AI Agents to list members of a Discord guild/server.
 */
export const DiscordGetMembersTool: ExecutableTool = {
  name: 'discord_get_members',
  description:
    'Get a list of members in a Discord server (guild). Use this to find user IDs for mentions or direct messages.',
  category: 'communication',
  requiresCredentials: true,
  connectorType: 'discord',
  parameters: {
    type: 'object',
    properties: {
      guild_id: {
        type: 'string',
        description:
          'The ID of the Discord server (guild) to get members from.',
      },
      limit: {
        type: 'number',
        description:
          'Optional. Maximum number of members to return (1-1000). Default: 100.',
      },
    },
    required: ['guild_id'],
  },
  execute: async (
    params: Record<string, any>,
    context: ToolContext,
  ): Promise<ToolResult> => {
    const logger = context.logger || new Logger('DiscordGetMembersTool');

    try {
      logger.log(`Discord Tool: Getting members for guild ${params.guild_id}`);

      if (!params.guild_id) {
        return {
          success: false,
          error: 'Missing required parameter: guild_id',
        };
      }

      if (!context.credentials) {
        return {
          success: false,
          error: 'Discord credentials not provided. Please configure your Discord bot.',
        };
      }

      const axios = (await import('axios')).default;

      const botToken = context.credentials.botToken || context.credentials.bot_token;

      if (!botToken) {
        return {
          success: false,
          error: 'Discord bot token not found in credentials',
        };
      }

      const limit = Math.min(params.limit || 100, 1000);

      const response = await axios.get(
        `https://discord.com/api/v10/guilds/${params.guild_id}/members?limit=${limit}`,
        {
          headers: {
            Authorization: `Bot ${botToken}`,
          },
        },
      );

      const members = response.data || [];

      return {
        success: true,
        data: {
          members: members.map((member: any) => ({
            user_id: member.user.id,
            username: member.user.username,
            discriminator: member.user.discriminator,
            global_name: member.user.global_name,
            nickname: member.nick,
            avatar: member.user.avatar,
            joined_at: member.joined_at,
            roles: member.roles,
            is_bot: member.user.bot || false,
          })),
          count: members.length,
        },
      };
    } catch (error: any) {
      logger.error(`Discord Get Members failed: ${error.message}`);

      if (error.response?.status === 401) {
        return {
          success: false,
          error: 'Discord bot token is invalid. Please check your credentials.',
        };
      }
      if (error.response?.status === 403) {
        return {
          success: false,
          error: 'Bot lacks the SERVER MEMBERS INTENT or permissions. Enable it in Discord Developer Portal.',
        };
      }

      return {
        success: false,
        error: `Failed to get members: ${error.response?.data?.message || error.message}`,
      };
    }
  },
};

/**
 * Discord Add Reaction Tool
 *
 * Tool for AI Agents to add emoji reactions to Discord messages.
 */
export const DiscordAddReactionTool: ExecutableTool = {
  name: 'discord_add_reaction',
  description:
    'Add an emoji reaction to a message in Discord. Use this to acknowledge or respond to messages with emojis.',
  category: 'communication',
  requiresCredentials: true,
  connectorType: 'discord',
  parameters: {
    type: 'object',
    properties: {
      channel_id: {
        type: 'string',
        description: 'The ID of the channel where the message is located.',
      },
      message_id: {
        type: 'string',
        description: 'The ID of the message to react to.',
      },
      emoji: {
        type: 'string',
        description:
          'The emoji to react with. Use Unicode emoji (e.g., "👍") or custom emoji format "name:id".',
      },
    },
    required: ['channel_id', 'message_id', 'emoji'],
  },
  execute: async (
    params: Record<string, any>,
    context: ToolContext,
  ): Promise<ToolResult> => {
    const logger = context.logger || new Logger('DiscordAddReactionTool');

    try {
      logger.log(`Discord Tool: Adding reaction to message ${params.message_id}`);

      if (!params.channel_id) {
        return {
          success: false,
          error: 'Missing required parameter: channel_id',
        };
      }
      if (!params.message_id) {
        return {
          success: false,
          error: 'Missing required parameter: message_id',
        };
      }
      if (!params.emoji) {
        return {
          success: false,
          error: 'Missing required parameter: emoji',
        };
      }

      if (!context.credentials) {
        return {
          success: false,
          error: 'Discord credentials not provided. Please configure your Discord bot.',
        };
      }

      const axios = (await import('axios')).default;

      const botToken = context.credentials.botToken || context.credentials.bot_token;

      if (!botToken) {
        return {
          success: false,
          error: 'Discord bot token not found in credentials',
        };
      }

      // URL encode the emoji
      const encodedEmoji = encodeURIComponent(params.emoji);

      await axios.put(
        `https://discord.com/api/v10/channels/${params.channel_id}/messages/${params.message_id}/reactions/${encodedEmoji}/@me`,
        {},
        {
          headers: {
            Authorization: `Bot ${botToken}`,
          },
        },
      );

      return {
        success: true,
        data: {
          message: `Reaction ${params.emoji} added successfully`,
          channel_id: params.channel_id,
          message_id: params.message_id,
        },
      };
    } catch (error: any) {
      logger.error(`Discord Add Reaction failed: ${error.message}`);

      if (error.response?.status === 400) {
        return {
          success: false,
          error: 'Invalid emoji format. Use Unicode emoji or custom emoji in "name:id" format.',
        };
      }

      return {
        success: false,
        error: `Failed to add reaction: ${error.response?.data?.message || error.message}`,
      };
    }
  },
};

/**
 * Get all Discord tools
 */
export function getDiscordTools(): ExecutableTool[] {
  return [
    DiscordSendMessageTool,
    DiscordGetChannelsTool,
    DiscordGetMembersTool,
    DiscordAddReactionTool,
  ];
}
