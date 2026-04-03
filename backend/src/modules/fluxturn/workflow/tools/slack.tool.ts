import { Logger } from '@nestjs/common';
import {
  ExecutableTool,
  ToolContext,
  ToolResult,
} from '../types/tool.interface';

/**
 * Slack Send Message Tool
 *
 * Tool for AI Agents to send messages via Slack.
 * Requires Slack OAuth credentials with chat:write scope.
 *
 * AI/Context Split:
 * - AI-controlled: text (message content)
 * - Context-controlled: channel, thread_ts, unfurl_links
 */
export const SlackSendMessageTool: ExecutableTool = {
  name: 'slack_send_message',
  description:
    'Send a message to a Slack channel or user. Use this tool when you need to post messages, notifications, or updates to Slack.',
  category: 'communication',
  requiresCredentials: true,
  connectorType: 'slack',

  // Full parameters schema
  parameters: {
    type: 'object',
    properties: {
      channel: {
        type: 'string',
        description:
          'The channel ID (e.g., C1234567890) or channel name (e.g., #general) to send the message to.',
      },
      text: {
        type: 'string',
        description:
          'The message text to send. Supports Slack markdown formatting (mrkdwn).',
      },
      thread_ts: {
        type: 'string',
        description:
          'Optional. Thread timestamp to reply in a thread instead of posting to the channel.',
      },
      unfurl_links: {
        type: 'boolean',
        description:
          'Optional. Pass true to enable unfurling of primarily text-based content.',
      },
    },
    required: ['channel', 'text'],
  },

  // AI-controlled parameters only
  aiParameters: {
    type: 'object',
    properties: {
      text: {
        type: 'string',
        description:
          'The message text to send. Supports Slack markdown formatting (mrkdwn).',
      },
    },
    required: ['text'],
  },

  // Context fields (from workflow)
  contextFields: ['channel', 'thread_ts', 'unfurl_links'],
  execute: async (
    params: Record<string, any>,
    context: ToolContext,
  ): Promise<ToolResult> => {
    const logger = context.logger || new Logger('SlackSendMessageTool');

    try {
      logger.log(`Slack Tool: Sending message to ${params.channel}`);

      // Validate required parameters
      if (!params.channel) {
        return {
          success: false,
          error: 'Missing required parameter: channel',
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
          error: 'Slack credentials not provided. Please connect a Slack workspace.',
        };
      }

      const axios = (await import('axios')).default;

      // Get access token from credentials
      const accessToken = context.credentials.accessToken || context.credentials.access_token;

      if (!accessToken) {
        return {
          success: false,
          error: 'Slack access token not found in credentials',
        };
      }

      // Build request body
      const requestBody: Record<string, any> = {
        channel: params.channel,
        text: params.text,
      };

      if (params.thread_ts) {
        requestBody.thread_ts = params.thread_ts;
      }
      if (params.unfurl_links !== undefined) {
        requestBody.unfurl_links = params.unfurl_links;
      }

      // Send via Slack API
      const response = await axios.post(
        'https://slack.com/api/chat.postMessage',
        requestBody,
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
          },
        },
      );

      if (!response.data.ok) {
        return {
          success: false,
          error: `Slack API error: ${response.data.error}`,
        };
      }

      logger.log(`Slack Tool: Message sent successfully to ${params.channel}`);

      return {
        success: true,
        data: {
          messageId: response.data.ts,
          channel: response.data.channel,
          message: `Message sent successfully to ${params.channel}`,
        },
      };
    } catch (error: any) {
      logger.error(`Slack Tool failed: ${error.message}`);

      if (error.response?.status === 401) {
        return {
          success: false,
          error: 'Slack access token expired. Please reconnect your Slack workspace.',
        };
      }

      return {
        success: false,
        error: `Failed to send message: ${error.response?.data?.error || error.message}`,
      };
    }
  },
};

/**
 * Slack Get Channels Tool
 *
 * Tool for AI Agents to list Slack channels.
 * Requires Slack OAuth credentials with channels:read scope.
 */
export const SlackGetChannelsTool: ExecutableTool = {
  name: 'slack_get_channels',
  description:
    'Get a list of all public channels in the connected Slack workspace. Use this to find channel IDs for sending messages.',
  category: 'communication',
  requiresCredentials: true,
  connectorType: 'slack',
  parameters: {
    type: 'object',
    properties: {
      limit: {
        type: 'number',
        description: 'Optional. Maximum number of channels to return (default: 100, max: 1000).',
      },
      types: {
        type: 'string',
        description:
          'Optional. Comma-separated list of channel types. Options: public_channel, private_channel, mpim, im. Default: public_channel.',
      },
    },
    required: [],
  },
  execute: async (
    params: Record<string, any>,
    context: ToolContext,
  ): Promise<ToolResult> => {
    const logger = context.logger || new Logger('SlackGetChannelsTool');

    try {
      logger.log('Slack Tool: Fetching channels');

      if (!context.credentials) {
        return {
          success: false,
          error: 'Slack credentials not provided. Please connect a Slack workspace.',
        };
      }

      const axios = (await import('axios')).default;

      const accessToken = context.credentials.accessToken || context.credentials.access_token;

      if (!accessToken) {
        return {
          success: false,
          error: 'Slack access token not found in credentials',
        };
      }

      const queryParams = new URLSearchParams();
      queryParams.append('limit', String(params.limit || 100));
      if (params.types) {
        queryParams.append('types', params.types);
      }

      const response = await axios.get(
        `https://slack.com/api/conversations.list?${queryParams.toString()}`,
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        },
      );

      if (!response.data.ok) {
        return {
          success: false,
          error: `Slack API error: ${response.data.error}`,
        };
      }

      const channels = response.data.channels || [];

      return {
        success: true,
        data: {
          channels: channels.map((channel: any) => ({
            id: channel.id,
            name: channel.name,
            is_private: channel.is_private,
            is_archived: channel.is_archived,
            num_members: channel.num_members,
            topic: channel.topic?.value,
            purpose: channel.purpose?.value,
          })),
          count: channels.length,
        },
      };
    } catch (error: any) {
      logger.error(`Slack Get Channels failed: ${error.message}`);

      if (error.response?.status === 401) {
        return {
          success: false,
          error: 'Slack access token expired. Please reconnect your Slack workspace.',
        };
      }

      return {
        success: false,
        error: `Failed to get channels: ${error.response?.data?.error || error.message}`,
      };
    }
  },
};

/**
 * Slack List Users Tool
 *
 * Tool for AI Agents to list Slack workspace members.
 * Requires Slack OAuth credentials with users:read scope.
 */
export const SlackListUsersTool: ExecutableTool = {
  name: 'slack_list_users',
  description:
    'Get a list of all users in the connected Slack workspace. Use this to find user IDs for direct messages or mentions.',
  category: 'communication',
  requiresCredentials: true,
  connectorType: 'slack',
  parameters: {
    type: 'object',
    properties: {
      limit: {
        type: 'number',
        description: 'Optional. Maximum number of users to return (default: 100).',
      },
    },
    required: [],
  },
  execute: async (
    params: Record<string, any>,
    context: ToolContext,
  ): Promise<ToolResult> => {
    const logger = context.logger || new Logger('SlackListUsersTool');

    try {
      logger.log('Slack Tool: Fetching users');

      if (!context.credentials) {
        return {
          success: false,
          error: 'Slack credentials not provided. Please connect a Slack workspace.',
        };
      }

      const axios = (await import('axios')).default;

      const accessToken = context.credentials.accessToken || context.credentials.access_token;

      if (!accessToken) {
        return {
          success: false,
          error: 'Slack access token not found in credentials',
        };
      }

      const queryParams = new URLSearchParams();
      queryParams.append('limit', String(params.limit || 100));

      const response = await axios.get(
        `https://slack.com/api/users.list?${queryParams.toString()}`,
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        },
      );

      if (!response.data.ok) {
        return {
          success: false,
          error: `Slack API error: ${response.data.error}`,
        };
      }

      const members = response.data.members || [];

      // Filter out bots and deleted users
      const activeUsers = members.filter(
        (user: any) => !user.is_bot && !user.deleted,
      );

      return {
        success: true,
        data: {
          users: activeUsers.map((user: any) => ({
            id: user.id,
            name: user.name,
            real_name: user.real_name,
            display_name: user.profile?.display_name,
            email: user.profile?.email,
            is_admin: user.is_admin,
            is_owner: user.is_owner,
            timezone: user.tz,
          })),
          count: activeUsers.length,
        },
      };
    } catch (error: any) {
      logger.error(`Slack List Users failed: ${error.message}`);

      if (error.response?.status === 401) {
        return {
          success: false,
          error: 'Slack access token expired. Please reconnect your Slack workspace.',
        };
      }

      return {
        success: false,
        error: `Failed to list users: ${error.response?.data?.error || error.message}`,
      };
    }
  },
};

/**
 * Slack Add Reaction Tool
 *
 * Tool for AI Agents to add emoji reactions to Slack messages.
 * Requires Slack OAuth credentials with reactions:write scope.
 */
export const SlackAddReactionTool: ExecutableTool = {
  name: 'slack_add_reaction',
  description:
    'Add an emoji reaction to a message in Slack. Use this to acknowledge or respond to messages with emojis.',
  category: 'communication',
  requiresCredentials: true,
  connectorType: 'slack',
  parameters: {
    type: 'object',
    properties: {
      channel: {
        type: 'string',
        description: 'The channel ID where the message is located.',
      },
      timestamp: {
        type: 'string',
        description:
          'The timestamp (ts) of the message to react to. This uniquely identifies the message.',
      },
      emoji: {
        type: 'string',
        description:
          'The name of the emoji to add (without colons). E.g., "thumbsup", "heart", "check".',
      },
    },
    required: ['channel', 'timestamp', 'emoji'],
  },
  execute: async (
    params: Record<string, any>,
    context: ToolContext,
  ): Promise<ToolResult> => {
    const logger = context.logger || new Logger('SlackAddReactionTool');

    try {
      logger.log(`Slack Tool: Adding reaction ${params.emoji} to message`);

      // Validate required parameters
      if (!params.channel) {
        return {
          success: false,
          error: 'Missing required parameter: channel',
        };
      }
      if (!params.timestamp) {
        return {
          success: false,
          error: 'Missing required parameter: timestamp',
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
          error: 'Slack credentials not provided. Please connect a Slack workspace.',
        };
      }

      const axios = (await import('axios')).default;

      const accessToken = context.credentials.accessToken || context.credentials.access_token;

      if (!accessToken) {
        return {
          success: false,
          error: 'Slack access token not found in credentials',
        };
      }

      const response = await axios.post(
        'https://slack.com/api/reactions.add',
        {
          channel: params.channel,
          timestamp: params.timestamp,
          name: params.emoji,
        },
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
          },
        },
      );

      if (!response.data.ok) {
        return {
          success: false,
          error: `Slack API error: ${response.data.error}`,
        };
      }

      return {
        success: true,
        data: {
          message: `Reaction :${params.emoji}: added successfully`,
          channel: params.channel,
          timestamp: params.timestamp,
        },
      };
    } catch (error: any) {
      logger.error(`Slack Add Reaction failed: ${error.message}`);

      if (error.response?.status === 401) {
        return {
          success: false,
          error: 'Slack access token expired. Please reconnect your Slack workspace.',
        };
      }

      return {
        success: false,
        error: `Failed to add reaction: ${error.response?.data?.error || error.message}`,
      };
    }
  },
};

/**
 * Get all Slack tools
 */
export function getSlackTools(): ExecutableTool[] {
  return [
    SlackSendMessageTool,
    SlackGetChannelsTool,
    SlackListUsersTool,
    SlackAddReactionTool,
  ];
}
