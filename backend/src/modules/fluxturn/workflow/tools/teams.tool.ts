import { Logger } from '@nestjs/common';
import {
  ExecutableTool,
  ToolContext,
  ToolResult,
} from '../types/tool.interface';

/**
 * Microsoft Teams Send Message Tool
 *
 * Tool for AI Agents to send messages via Microsoft Teams.
 * Requires Microsoft Graph API OAuth credentials with appropriate permissions.
 *
 * AI/Context Split:
 * - AI-controlled: content, subject (message content)
 * - Context-controlled: team_id, channel_id, content_type
 */
export const TeamsSendMessageTool: ExecutableTool = {
  name: 'teams_send_message',
  description:
    'Send a message to a Microsoft Teams channel. Use this tool when you need to post messages, notifications, or updates to Teams.',
  category: 'communication',
  requiresCredentials: true,
  connectorType: 'teams',

  // Full parameters schema
  parameters: {
    type: 'object',
    properties: {
      team_id: {
        type: 'string',
        description:
          'The ID of the team containing the channel.',
      },
      channel_id: {
        type: 'string',
        description:
          'The ID of the channel to send the message to.',
      },
      content: {
        type: 'string',
        description:
          'The message content to send. Supports HTML formatting.',
      },
      content_type: {
        type: 'string',
        description:
          'Optional. The content type of the message. Options: text, html. Default: text.',
        enum: ['text', 'html'],
      },
      subject: {
        type: 'string',
        description:
          'Optional. Subject line for the message.',
      },
    },
    required: ['team_id', 'channel_id', 'content'],
  },

  // AI-controlled parameters only
  aiParameters: {
    type: 'object',
    properties: {
      content: {
        type: 'string',
        description:
          'The message content to send. Can include formatting.',
      },
      subject: {
        type: 'string',
        description:
          'Optional. Subject line for the message.',
      },
    },
    required: ['content'],
  },

  // Context fields (from workflow)
  contextFields: ['team_id', 'channel_id', 'content_type'],
  execute: async (
    params: Record<string, any>,
    context: ToolContext,
  ): Promise<ToolResult> => {
    const logger = context.logger || new Logger('TeamsSendMessageTool');

    try {
      logger.log(`Teams Tool: Sending message to channel ${params.channel_id}`);

      // Validate required parameters
      if (!params.team_id) {
        return {
          success: false,
          error: 'Missing required parameter: team_id',
        };
      }
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
          error: 'Teams credentials not provided. Please connect your Microsoft account.',
        };
      }

      const axios = (await import('axios')).default;

      // Get access token from credentials
      const accessToken = context.credentials.accessToken || context.credentials.access_token;

      if (!accessToken) {
        return {
          success: false,
          error: 'Teams access token not found in credentials',
        };
      }

      // Build request body
      const requestBody: Record<string, any> = {
        body: {
          contentType: params.content_type || 'text',
          content: params.content,
        },
      };

      if (params.subject) {
        requestBody.subject = params.subject;
      }

      // Send via Microsoft Graph API
      const response = await axios.post(
        `https://graph.microsoft.com/v1.0/teams/${params.team_id}/channels/${params.channel_id}/messages`,
        requestBody,
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
          },
        },
      );

      logger.log(`Teams Tool: Message sent successfully to channel ${params.channel_id}`);

      return {
        success: true,
        data: {
          message_id: response.data.id,
          web_url: response.data.webUrl,
          created_at: response.data.createdDateTime,
          message: `Message sent successfully to Teams channel`,
        },
      };
    } catch (error: any) {
      logger.error(`Teams Tool failed: ${error.message}`);

      if (error.response?.status === 401) {
        return {
          success: false,
          error: 'Teams access token expired. Please reconnect your Microsoft account.',
        };
      }
      if (error.response?.status === 403) {
        return {
          success: false,
          error: 'You do not have permission to post to this channel.',
        };
      }
      if (error.response?.status === 404) {
        return {
          success: false,
          error: 'Team or channel not found. Please check the IDs.',
        };
      }

      return {
        success: false,
        error: `Failed to send message: ${error.response?.data?.error?.message || error.message}`,
      };
    }
  },
};

/**
 * Microsoft Teams Get Channels Tool
 *
 * Tool for AI Agents to list channels in a Microsoft Teams team.
 */
export const TeamsGetChannelsTool: ExecutableTool = {
  name: 'teams_get_channels',
  description:
    'Get a list of all channels in a Microsoft Teams team. Use this to find channel IDs for sending messages.',
  category: 'communication',
  requiresCredentials: true,
  connectorType: 'teams',
  parameters: {
    type: 'object',
    properties: {
      team_id: {
        type: 'string',
        description:
          'The ID of the team to get channels from.',
      },
    },
    required: ['team_id'],
  },
  execute: async (
    params: Record<string, any>,
    context: ToolContext,
  ): Promise<ToolResult> => {
    const logger = context.logger || new Logger('TeamsGetChannelsTool');

    try {
      logger.log(`Teams Tool: Getting channels for team ${params.team_id}`);

      if (!params.team_id) {
        return {
          success: false,
          error: 'Missing required parameter: team_id',
        };
      }

      if (!context.credentials) {
        return {
          success: false,
          error: 'Teams credentials not provided. Please connect your Microsoft account.',
        };
      }

      const axios = (await import('axios')).default;

      const accessToken = context.credentials.accessToken || context.credentials.access_token;

      if (!accessToken) {
        return {
          success: false,
          error: 'Teams access token not found in credentials',
        };
      }

      const response = await axios.get(
        `https://graph.microsoft.com/v1.0/teams/${params.team_id}/channels`,
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        },
      );

      const channels = response.data.value || [];

      return {
        success: true,
        data: {
          channels: channels.map((channel: any) => ({
            id: channel.id,
            name: channel.displayName,
            description: channel.description,
            membership_type: channel.membershipType,
            web_url: channel.webUrl,
            is_favorite: channel.isFavoriteByDefault,
          })),
          count: channels.length,
        },
      };
    } catch (error: any) {
      logger.error(`Teams Get Channels failed: ${error.message}`);

      if (error.response?.status === 401) {
        return {
          success: false,
          error: 'Teams access token expired. Please reconnect your Microsoft account.',
        };
      }
      if (error.response?.status === 404) {
        return {
          success: false,
          error: 'Team not found. Please check the team ID.',
        };
      }

      return {
        success: false,
        error: `Failed to get channels: ${error.response?.data?.error?.message || error.message}`,
      };
    }
  },
};

/**
 * Microsoft Teams Get Team Members Tool
 *
 * Tool for AI Agents to list members of a Microsoft Teams team.
 */
export const TeamsGetMembersTool: ExecutableTool = {
  name: 'teams_get_members',
  description:
    'Get a list of members in a Microsoft Teams team. Use this to find user information for mentions or direct communication.',
  category: 'communication',
  requiresCredentials: true,
  connectorType: 'teams',
  parameters: {
    type: 'object',
    properties: {
      team_id: {
        type: 'string',
        description:
          'The ID of the team to get members from.',
      },
    },
    required: ['team_id'],
  },
  execute: async (
    params: Record<string, any>,
    context: ToolContext,
  ): Promise<ToolResult> => {
    const logger = context.logger || new Logger('TeamsGetMembersTool');

    try {
      logger.log(`Teams Tool: Getting members for team ${params.team_id}`);

      if (!params.team_id) {
        return {
          success: false,
          error: 'Missing required parameter: team_id',
        };
      }

      if (!context.credentials) {
        return {
          success: false,
          error: 'Teams credentials not provided. Please connect your Microsoft account.',
        };
      }

      const axios = (await import('axios')).default;

      const accessToken = context.credentials.accessToken || context.credentials.access_token;

      if (!accessToken) {
        return {
          success: false,
          error: 'Teams access token not found in credentials',
        };
      }

      const response = await axios.get(
        `https://graph.microsoft.com/v1.0/teams/${params.team_id}/members`,
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        },
      );

      const members = response.data.value || [];

      return {
        success: true,
        data: {
          members: members.map((member: any) => ({
            id: member.id,
            user_id: member.userId,
            display_name: member.displayName,
            email: member.email,
            roles: member.roles,
          })),
          count: members.length,
        },
      };
    } catch (error: any) {
      logger.error(`Teams Get Members failed: ${error.message}`);

      if (error.response?.status === 401) {
        return {
          success: false,
          error: 'Teams access token expired. Please reconnect your Microsoft account.',
        };
      }
      if (error.response?.status === 403) {
        return {
          success: false,
          error: 'You do not have permission to view team members.',
        };
      }

      return {
        success: false,
        error: `Failed to get members: ${error.response?.data?.error?.message || error.message}`,
      };
    }
  },
};

/**
 * Microsoft Teams Get Joined Teams Tool
 *
 * Tool for AI Agents to list teams the user has joined.
 */
export const TeamsGetJoinedTeamsTool: ExecutableTool = {
  name: 'teams_get_joined_teams',
  description:
    'Get a list of all Microsoft Teams teams that the connected user has joined. Use this to find team IDs.',
  category: 'communication',
  requiresCredentials: true,
  connectorType: 'teams',
  parameters: {
    type: 'object',
    properties: {},
    required: [],
  },
  execute: async (
    params: Record<string, any>,
    context: ToolContext,
  ): Promise<ToolResult> => {
    const logger = context.logger || new Logger('TeamsGetJoinedTeamsTool');

    try {
      logger.log('Teams Tool: Getting joined teams');

      if (!context.credentials) {
        return {
          success: false,
          error: 'Teams credentials not provided. Please connect your Microsoft account.',
        };
      }

      const axios = (await import('axios')).default;

      const accessToken = context.credentials.accessToken || context.credentials.access_token;

      if (!accessToken) {
        return {
          success: false,
          error: 'Teams access token not found in credentials',
        };
      }

      const response = await axios.get(
        'https://graph.microsoft.com/v1.0/me/joinedTeams',
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        },
      );

      const teams = response.data.value || [];

      return {
        success: true,
        data: {
          teams: teams.map((team: any) => ({
            id: team.id,
            name: team.displayName,
            description: team.description,
            visibility: team.visibility,
            web_url: team.webUrl,
          })),
          count: teams.length,
        },
      };
    } catch (error: any) {
      logger.error(`Teams Get Joined Teams failed: ${error.message}`);

      if (error.response?.status === 401) {
        return {
          success: false,
          error: 'Teams access token expired. Please reconnect your Microsoft account.',
        };
      }

      return {
        success: false,
        error: `Failed to get teams: ${error.response?.data?.error?.message || error.message}`,
      };
    }
  },
};

/**
 * Get all Teams tools
 */
export function getTeamsTools(): ExecutableTool[] {
  return [
    TeamsSendMessageTool,
    TeamsGetChannelsTool,
    TeamsGetMembersTool,
    TeamsGetJoinedTeamsTool,
  ];
}
