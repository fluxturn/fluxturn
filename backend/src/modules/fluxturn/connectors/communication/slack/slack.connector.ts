import { Request } from 'express';
import { Injectable } from '@nestjs/common';
import { BaseConnector } from '../../base/base.connector';
import { ICommunicationConnector } from '../../base/connector.interface';
import {
  ConnectorMetadata,
  ConnectorType,
  ConnectorCategory,
  ConnectorRequest,
  ConnectorResponse,
  AuthType,
  PaginatedRequest,
  ConnectorAction,
  ConnectorTrigger
} from '../../types';
import { AuthUtils } from '../../utils/auth.utils';
import { ApiUtils } from '../../utils/api.utils';

@Injectable()
export class SlackConnector extends BaseConnector implements ICommunicationConnector {
  private baseUrl = 'https://slack.com/api';

  constructor(
    private readonly authUtils: AuthUtils,
    private readonly apiUtils: ApiUtils
  ) {
    super();
  }

  getMetadata(): ConnectorMetadata {
    return {
      name: 'Slack',
      description: 'Slack team communication and collaboration platform',
      version: '1.0.0',
      category: ConnectorCategory.COMMUNICATION,
      type: ConnectorType.SLACK,
      logoUrl: 'https://slack.com/img/slack_logo.png',
      documentationUrl: 'https://api.slack.com/',
      authType: AuthType.BEARER_TOKEN,
      requiredScopes: [
        'chat:write',
        'chat:write.customize',
        'channels:read',
        'channels:manage',
        'channels:history',
        'groups:read',
        'groups:history',
        'im:read',
        'im:write',
        'im:history',
        'mpim:read',
        'mpim:history',
        'users:read',
        'app_mentions:read',
        'reactions:read',
        'files:read'
      ],
      actions: this.getActions(),
      triggers: this.getTriggers(),
      rateLimit: {
        requestsPerMinute: 50,
        requestsPerHour: 1000
      },
      webhookSupport: true
    };
  }

  protected async initializeConnection(): Promise<void> {
    // Test the connection by calling auth.test
    const testResponse = await this.performRequest({
      method: 'GET',
      endpoint: `${this.baseUrl}/auth.test`,
      headers: this.getAuthHeaders()
    });

    if (!testResponse.ok) {
      throw new Error(`Slack connection failed: ${testResponse.error}`);
    }

    this.logger.log('Slack connector initialized successfully');
  }

  protected async performConnectionTest(): Promise<boolean> {
    try {
      const response = await this.performRequest({
        method: 'GET',
        endpoint: `${this.baseUrl}/auth.test`,
        headers: this.getAuthHeaders()
      });
      return response.ok === true;
    } catch (error) {
      return false;
    }
  }

  protected async performHealthCheck(): Promise<void> {
    const response = await this.performRequest({
      method: 'GET',
      endpoint: `${this.baseUrl}/api.test`,
      headers: this.getAuthHeaders()
    });

    if (!response.ok) {
      throw new Error(`Slack health check failed: ${response.error}`);
    }
  }

  protected async performRequest(request: ConnectorRequest): Promise<any> {
    const response = await this.apiUtils.executeRequest(request, {
      timeout: 10000,
      retries: 3
    });

    if (!response.success) {
      throw new Error(response.error?.message || 'Request failed');
    }

    return response.data;
  }

  protected async performAction(actionId: string, input: any): Promise<any> {
    switch (actionId) {
      // Message operations
      case 'send_message':
        // Handle both legacy and new comprehensive format
        if (input.sendTo) {
          // New comprehensive format - pass entire input as message
          return this.sendMessage('', input);
        } else if (input.channel && input.message) {
          // Legacy format
          return this.sendMessage(input.channel, input.message);
        } else if (input.channelId && input.text) {
          // Simple format for Phase 1
          return this.sendMessageSimple(input);
        } else {
          // Direct format - entire input is the message config
          return this.sendMessage('', input);
        }
      case 'update_message':
        return this.updateMessage(input);
      case 'delete_message':
        return this.deleteMessage(input);
      case 'get_permalink':
        return this.getPermalink(input);
      case 'search_messages':
        return this.searchMessages(input);

      // Channel operations
      case 'create_channel':
        return this.createChannel(input.name, input.is_private);
      case 'get_channel':
        return this.getChannel(input);
      case 'get_channels':
        return this.getChannels(input);
      case 'channel_history':
        return this.getChannelHistory(input);
      case 'invite_to_channel':
        return this.inviteToChannel(input);
      case 'join_channel':
        return this.joinChannel(input);
      case 'leave_channel':
        return this.leaveChannel(input);
      case 'get_channel_members':
        return this.getChannelMembers(input);

      // File operations
      case 'upload_file':
        return this.uploadFile(input);
      case 'get_file':
        return this.getFile(input);

      // Legacy/Other operations
      case 'get_users':
        return this.getUsers(input);
      case 'get_messages':
        return this.getMessages(input);

      default:
        throw new Error(`Unknown action: ${actionId}`);
    }
  }

  protected async cleanup(): Promise<void> {
    // Cleanup any resources if needed
    this.logger.log('Slack connector cleanup completed');
  }

  // ICommunicationConnector implementation
  async sendMessage(to: string | string[], message: any): Promise<ConnectorResponse> {
    try {
      // Simple case: direct channel/user ID or legacy format
      if (typeof to === 'string' && !message.sendTo) {
        return await this.sendSimpleMessage(to, message);
      }

      // Complex case: using the comprehensive input schema
      // Resolve the target (channel or user ID)
      const targetId = await this.resolveTarget(message);

      // Build the message payload
      const payload: any = {
        channel: targetId,
        text: message.text
      };

      // Parse and add blocks if provided
      if (message.messageComposition === 'blocks' && message.blocks) {
        try {
          payload.blocks = typeof message.blocks === 'string'
            ? JSON.parse(message.blocks)
            : message.blocks;
        } catch (error) {
          throw new Error('Invalid blocks JSON format');
        }
      }

      // Parse and add attachments if provided
      if (message.messageComposition === 'attachments' && message.attachments) {
        try {
          payload.attachments = typeof message.attachments === 'string'
            ? JSON.parse(message.attachments)
            : message.attachments;
        } catch (error) {
          throw new Error('Invalid attachments JSON format');
        }
      }

      // Thread options
      if (message.threadOptions && message.thread_ts) {
        payload.thread_ts = message.thread_ts;
        if (message.reply_broadcast) {
          payload.reply_broadcast = message.reply_broadcast;
        }
      }

      // Additional options
      if (message.showAdditionalOptions) {
        if (message.link_names !== undefined) {
          payload.link_names = message.link_names;
        }
        if (message.mrkdwn !== undefined) {
          payload.mrkdwn = message.mrkdwn;
        }
      }

      // Bot profile customization
      if (message.customizeBotProfile) {
        if (message.botUsername) {
          payload.username = message.botUsername;
        }
        if (message.icon_url) {
          payload.icon_url = message.icon_url;
        }
        if (message.icon_emoji) {
          payload.icon_emoji = message.icon_emoji;
        }
      }

      // Determine endpoint based on ephemeral flag
      const endpoint = message.makeReplyEphemeral && message.ephemeralUserId
        ? `${this.baseUrl}/chat.postEphemeral`
        : `${this.baseUrl}/chat.postMessage`;

      // Add ephemeral user if needed
      if (message.makeReplyEphemeral && message.ephemeralUserId) {
        payload.user = message.ephemeralUserId;
      }

      // Send the message
      const response = await this.performRequest({
        method: 'POST',
        endpoint,
        headers: {
          ...this.getAuthHeaders(),
          'Content-Type': 'application/json'
        },
        body: payload
      });

      if (!response.ok) {
        throw new Error(response.error || 'Failed to send message');
      }

      return {
        success: true,
        data: {
          ok: response.ok,
          channel: response.channel,
          ts: response.ts,
          message: response.message
        }
      };
    } catch (error) {
      return this.handleError(error as any, 'Failed to send message');
    }
  }

  // Legacy simple message sending (for backward compatibility)
  private async sendSimpleMessage(to: string, message: any): Promise<ConnectorResponse> {
    try {
      const channels = Array.isArray(to) ? to : [to];
      const results: any[] = [];

      for (const channel of channels) {
        const response = await this.performRequest({
          method: 'POST',
          endpoint: `${this.baseUrl}/chat.postMessage`,
          headers: {
            ...this.getAuthHeaders(),
            'Content-Type': 'application/json'
          },
          body: {
            channel: channel,
            text: message.text || message,
            blocks: message.blocks,
            attachments: message.attachments,
            thread_ts: message.threadTs || message.thread_ts,
            reply_broadcast: message.replyBroadcast || message.reply_broadcast
          }
        });

        results.push({
          channel,
          success: response.ok,
          messageId: response.ts,
          error: response.error
        });
      }

      return {
        success: true,
        data: results
      };
    } catch (error) {
      return this.handleError(error as any, 'Failed to send message');
    }
  }

  // Resolve target ID based on selection mode
  private async resolveTarget(message: any): Promise<string> {
    const sendTo = message.sendTo || 'channel';

    if (sendTo === 'channel') {
      const mode = message.channelSelectionMode || 'list';

      switch (mode) {
        case 'list':
          return message.channelList;
        case 'id':
          return message.channelId;
        case 'name':
          return await this.resolveChannelByName(message.channelName);
        case 'url':
          return this.extractChannelIdFromUrl(message.channelUrl);
        default:
          throw new Error(`Unknown channel selection mode: ${mode}`);
      }
    } else if (sendTo === 'user') {
      const mode = message.userSelectionMode || 'list';

      switch (mode) {
        case 'list':
          return await this.openDirectMessageChannel(message.userList);
        case 'id':
          return await this.openDirectMessageChannel(message.userId);
        case 'username':
          const userId = await this.resolveUserByUsername(message.username);
          return await this.openDirectMessageChannel(userId);
        default:
          throw new Error(`Unknown user selection mode: ${mode}`);
      }
    }

    throw new Error(`Unknown sendTo value: ${sendTo}`);
  }

  // Resolve channel ID from channel name
  private async resolveChannelByName(channelName: string): Promise<string> {
    try {
      // Remove # prefix if present
      const cleanName = channelName.replace(/^#/, '');

      const response = await this.performRequest({
        method: 'GET',
        endpoint: `${this.baseUrl}/conversations.list`,
        headers: this.getAuthHeaders(),
        queryParams: {
          types: 'public_channel,private_channel',
          exclude_archived: true
        }
      });

      const channel = response.channels?.find(
        (c: any) => c.name === cleanName
      );

      if (!channel) {
        throw new Error(`Channel not found: ${channelName}`);
      }

      return channel.id;
    } catch (error) {
      throw new Error(`Failed to resolve channel by name: ${error.message}`);
    }
  }

  // Extract channel ID from Slack URL
  private extractChannelIdFromUrl(url: string): string {
    // Slack channel URLs are in format: https://workspace.slack.com/archives/C01234ABCDE
    const match = url.match(/\/archives\/([A-Z0-9]+)/i);
    if (!match) {
      throw new Error('Invalid Slack channel URL format');
    }
    return match[1];
  }

  // Resolve user ID from username
  private async resolveUserByUsername(username: string): Promise<string> {
    try {
      // Remove @ prefix if present
      const cleanUsername = username.replace(/^@/, '');

      const response = await this.performRequest({
        method: 'GET',
        endpoint: `${this.baseUrl}/users.list`,
        headers: this.getAuthHeaders()
      });

      const user = response.members?.find(
        (u: any) => u.name === cleanUsername || u.real_name === cleanUsername
      );

      if (!user) {
        throw new Error(`User not found: ${username}`);
      }

      return user.id;
    } catch (error) {
      throw new Error(`Failed to resolve user by username: ${error.message}`);
    }
  }

  // Open or get direct message channel with user
  private async openDirectMessageChannel(userId: string): Promise<string> {
    try {
      const response = await this.performRequest({
        method: 'POST',
        endpoint: `${this.baseUrl}/conversations.open`,
        headers: {
          ...this.getAuthHeaders(),
          'Content-Type': 'application/json'
        },
        body: {
          users: userId
        }
      });

      if (!response.ok || !response.channel?.id) {
        throw new Error('Failed to open direct message channel');
      }

      return response.channel.id;
    } catch (error) {
      throw new Error(`Failed to open DM channel: ${error.message}`);
    }
  }

  async getMessages(options?: PaginatedRequest): Promise<ConnectorResponse> {
    try {
      const params: any = {
        channel: options?.filters?.channel,
        oldest: options?.filters?.oldest,
        latest: options?.filters?.latest,
        limit: options?.pageSize || 100,
        cursor: options?.filters?.cursor
      };

      const response = await this.performRequest({
        method: 'GET',
        endpoint: `${this.baseUrl}/conversations.history`,
        headers: this.getAuthHeaders(),
        queryParams: params
      });

      return {
        success: true,
        data: {
          messages: response.messages,
          cursor: response.response_metadata?.next_cursor
        },
        metadata: {
          timestamp: new Date(),
          pagination: {
            page: 1,
            pageSize: params.limit,
            hasNext: response.has_more,
            total: 0
          }
        }
      };
    } catch (error) {
      return this.handleError(error as any, 'Failed to get messages');
    }
  }

  async getContact(contactId: string): Promise<ConnectorResponse> {
    try {
      const response = await this.performRequest({
        method: 'GET',
        endpoint: `${this.baseUrl}/users.info`,
        headers: this.getAuthHeaders(),
        queryParams: { user: contactId }
      });

      return {
        success: true,
        data: response.user
      };
    } catch (error) {
      return this.handleError(error as any, 'Failed to get contact');
    }
  }

  async upsertContact(contact: any): Promise<ConnectorResponse> {
    // Slack doesn't allow creating users via API, only reading
    throw new Error('Creating users is not supported by Slack API');
  }

  // Additional Slack-specific methods
  async getChannels(options?: any): Promise<ConnectorResponse> {
    try {
      // Support both old and new input formats
      let params: any;

      if (options?.filters || options?.pageSize) {
        // Old PaginatedRequest format
        params = {
          exclude_archived: options?.filters?.excludeArchived ?? true,
          types: options?.filters?.types || 'public_channel,private_channel',
          limit: options?.pageSize || 100,
          cursor: options?.filters?.cursor
        };
      } else {
        // New simple format for Phase 1
        params = {
          exclude_archived: true,
          types: options?.types || 'public_channel',
          limit: options?.limit || 100
        };
      }

      const response = await this.performRequest({
        method: 'GET',
        endpoint: `${this.baseUrl}/conversations.list`,
        headers: this.getAuthHeaders(),
        queryParams: params
      });

      return {
        success: true,
        data: response.channels,
        metadata: {
          timestamp: new Date(),
          pagination: {
            page: 1,
            pageSize: params.limit,
            hasNext: response.has_more,
            total: 0
          }
        }
      };
    } catch (error) {
      return this.handleError(error as any, 'Failed to get channels');
    }
  }

  async getUsers(options?: PaginatedRequest): Promise<ConnectorResponse> {
    try {
      const params: any = {
        limit: options?.pageSize || 100,
        cursor: options?.filters?.cursor
      };

      const response = await this.performRequest({
        method: 'GET',
        endpoint: `${this.baseUrl}/users.list`,
        headers: this.getAuthHeaders(),
        queryParams: params
      });

      return {
        success: true,
        data: response.members,
        metadata: {
          timestamp: new Date(),
          pagination: {
            page: 1,
            pageSize: params.limit,
            hasNext: response.has_more,
            total: 0
          }
        }
      };
    } catch (error) {
      return this.handleError(error as any, 'Failed to get users');
    }
  }

  async createChannel(name: string, isPrivate: boolean = false): Promise<ConnectorResponse> {
    try {
      const response = await this.performRequest({
        method: 'POST',
        endpoint: `${this.baseUrl}/conversations.create`,
        headers: {
          ...this.getAuthHeaders(),
          'Content-Type': 'application/json'
        },
        body: {
          name: name,
          is_private: isPrivate
        }
      });

      return {
        success: true,
        data: response.channel
      };
    } catch (error) {
      return this.handleError(error as any, 'Failed to create channel');
    }
  }

  // ==================== PHASE 1: MESSAGE OPERATIONS ====================

  /**
   * Send a simple message (Phase 1 format)
   */
  private async sendMessageSimple(input: any): Promise<ConnectorResponse> {
    try {
      const payload: any = {
        channel: input.channelId,
        text: input.text
      };

      // Add thread_ts if provided
      if (input.threadTs) {
        payload.thread_ts = input.threadTs;
      }

      const response = await this.performRequest({
        method: 'POST',
        endpoint: `${this.baseUrl}/chat.postMessage`,
        headers: {
          ...this.getAuthHeaders(),
          'Content-Type': 'application/json'
        },
        body: payload
      });

      if (!response.ok) {
        throw new Error(response.error || 'Failed to send message');
      }

      return {
        success: true,
        data: {
          ok: response.ok,
          channel: response.channel,
          ts: response.ts,
          message: response.message
        }
      };
    } catch (error) {
      return this.handleError(error as any, 'Failed to send message');
    }
  }

  /**
   * Update an existing message
   */
  private async updateMessage(input: any): Promise<ConnectorResponse> {
    try {
      const response = await this.performRequest({
        method: 'POST',
        endpoint: `${this.baseUrl}/chat.update`,
        headers: {
          ...this.getAuthHeaders(),
          'Content-Type': 'application/json'
        },
        body: {
          channel: input.channelId,
          ts: input.ts,
          text: input.text
        }
      });

      if (!response.ok) {
        throw new Error(response.error || 'Failed to update message');
      }

      return {
        success: true,
        data: {
          ok: response.ok,
          channel: response.channel,
          ts: response.ts,
          text: response.text
        }
      };
    } catch (error) {
      return this.handleError(error as any, 'Failed to update message');
    }
  }

  /**
   * Delete a message
   */
  private async deleteMessage(input: any): Promise<ConnectorResponse> {
    try {
      const response = await this.performRequest({
        method: 'POST',
        endpoint: `${this.baseUrl}/chat.delete`,
        headers: {
          ...this.getAuthHeaders(),
          'Content-Type': 'application/json'
        },
        body: {
          channel: input.channelId,
          ts: input.ts
        }
      });

      // Check for Slack API errors
      if (!response.ok) {
        // Provide more specific error messages based on Slack's error codes
        const errorMessage = response.error || 'Failed to delete message';
        if (response.error === 'message_not_found') {
          throw new Error('Message not found. The message may have already been deleted or the timestamp is incorrect.');
        } else if (response.error === 'cant_delete_message') {
          throw new Error('Cannot delete message. Bots can only delete messages they posted themselves.');
        } else if (response.error === 'channel_not_found') {
          throw new Error('Channel not found. Please verify the channel ID is correct.');
        } else if (response.error === 'not_authed' || response.error === 'invalid_auth') {
          throw new Error('Authentication failed. Please check your access token.');
        } else if (response.error === 'missing_scope') {
          throw new Error('Missing required permission. Ensure the bot has chat:write scope.');
        }
        throw new Error(errorMessage);
      }

      // Log successful deletion for debugging
      this.logger.log(`Successfully deleted message ${input.ts} from channel ${input.channelId}`);

      return {
        success: true,
        data: {
          ok: response.ok,
          channel: response.channel,
          ts: response.ts
        }
      };
    } catch (error) {
      return this.handleError(error as any, 'Failed to delete message');
    }
  }

  /**
   * Get permalink for a message
   */
  private async getPermalink(input: any): Promise<ConnectorResponse> {
    try {
      const response = await this.performRequest({
        method: 'GET',
        endpoint: `${this.baseUrl}/chat.getPermalink`,
        headers: this.getAuthHeaders(),
        queryParams: {
          channel: input.channelId,
          message_ts: input.ts
        }
      });

      if (!response.ok) {
        throw new Error(response.error || 'Failed to get permalink');
      }

      return {
        success: true,
        data: {
          ok: response.ok,
          permalink: response.permalink,
          channel: input.channelId,
          ts: input.ts
        }
      };
    } catch (error) {
      return this.handleError(error as any, 'Failed to get permalink');
    }
  }

  /**
   * Search messages
   */
  private async searchMessages(input: any): Promise<ConnectorResponse> {
    try {
      const response = await this.performRequest({
        method: 'GET',
        endpoint: `${this.baseUrl}/search.messages`,
        headers: this.getAuthHeaders(),
        queryParams: {
          query: input.query,
          count: input.count || 20,
          sort: 'timestamp',
          sort_dir: 'desc'
        }
      });

      if (!response.ok) {
        throw new Error(response.error || 'Failed to search messages');
      }

      return {
        success: true,
        data: {
          ok: response.ok,
          query: input.query,
          messages: response.messages?.matches || [],
          total: response.messages?.total || 0
        }
      };
    } catch (error) {
      return this.handleError(error as any, 'Failed to search messages');
    }
  }

  // ==================== PHASE 1: CHANNEL OPERATIONS ====================

  /**
   * Get channel information
   */
  private async getChannel(input: any): Promise<ConnectorResponse> {
    try {
      const response = await this.performRequest({
        method: 'GET',
        endpoint: `${this.baseUrl}/conversations.info`,
        headers: this.getAuthHeaders(),
        queryParams: {
          channel: input.channelId,
          include_num_members: input.include_num_members || false
        }
      });

      if (!response.ok) {
        throw new Error(response.error || 'Failed to get channel');
      }

      return {
        success: true,
        data: {
          ok: response.ok,
          channel: response.channel
        }
      };
    } catch (error) {
      return this.handleError(error as any, 'Failed to get channel');
    }
  }

  /**
   * Get channel message history
   */
  private async getChannelHistory(input: any): Promise<ConnectorResponse> {
    try {
      const queryParams: any = {
        channel: input.channelId,
        limit: input.limit || 100
      };

      if (input.oldest) {
        queryParams.oldest = input.oldest;
      }
      if (input.latest) {
        queryParams.latest = input.latest;
      }

      const response = await this.performRequest({
        method: 'GET',
        endpoint: `${this.baseUrl}/conversations.history`,
        headers: this.getAuthHeaders(),
        queryParams
      });

      if (!response.ok) {
        throw new Error(response.error || 'Failed to get channel history');
      }

      return {
        success: true,
        data: {
          ok: response.ok,
          messages: response.messages || [],
          has_more: response.has_more || false
        }
      };
    } catch (error) {
      return this.handleError(error as any, 'Failed to get channel history');
    }
  }

  /**
   * Invite users to channel
   */
  private async inviteToChannel(input: any): Promise<ConnectorResponse> {
    try {
      const response = await this.performRequest({
        method: 'POST',
        endpoint: `${this.baseUrl}/conversations.invite`,
        headers: {
          ...this.getAuthHeaders(),
          'Content-Type': 'application/json'
        },
        body: {
          channel: input.channelId,
          users: input.users
        }
      });

      if (!response.ok) {
        throw new Error(response.error || 'Failed to invite to channel');
      }

      return {
        success: true,
        data: {
          ok: response.ok,
          channel: response.channel
        }
      };
    } catch (error) {
      return this.handleError(error as any, 'Failed to invite to channel');
    }
  }

  /**
   * Join a channel
   */
  private async joinChannel(input: any): Promise<ConnectorResponse> {
    try {
      const response = await this.performRequest({
        method: 'POST',
        endpoint: `${this.baseUrl}/conversations.join`,
        headers: {
          ...this.getAuthHeaders(),
          'Content-Type': 'application/json'
        },
        body: {
          channel: input.channelId
        }
      });

      if (!response.ok) {
        throw new Error(response.error || 'Failed to join channel');
      }

      return {
        success: true,
        data: {
          ok: response.ok,
          channel: response.channel
        }
      };
    } catch (error) {
      return this.handleError(error as any, 'Failed to join channel');
    }
  }

  /**
   * Leave a channel
   */
  private async leaveChannel(input: any): Promise<ConnectorResponse> {
    try {
      const response = await this.performRequest({
        method: 'POST',
        endpoint: `${this.baseUrl}/conversations.leave`,
        headers: {
          ...this.getAuthHeaders(),
          'Content-Type': 'application/json'
        },
        body: {
          channel: input.channelId
        }
      });

      if (!response.ok) {
        throw new Error(response.error || 'Failed to leave channel');
      }

      return {
        success: true,
        data: {
          ok: response.ok
        }
      };
    } catch (error) {
      return this.handleError(error as any, 'Failed to leave channel');
    }
  }

  /**
   * Get channel members
   */
  private async getChannelMembers(input: any): Promise<ConnectorResponse> {
    try {
      const response = await this.performRequest({
        method: 'GET',
        endpoint: `${this.baseUrl}/conversations.members`,
        headers: this.getAuthHeaders(),
        queryParams: {
          channel: input.channelId,
          limit: input.limit || 100
        }
      });

      if (!response.ok) {
        throw new Error(response.error || 'Failed to get channel members');
      }

      return {
        success: true,
        data: {
          ok: response.ok,
          members: response.members || []
        }
      };
    } catch (error) {
      return this.handleError(error as any, 'Failed to get channel members');
    }
  }

  // ==================== PHASE 1: FILE OPERATIONS ====================

  /**
   * Upload a file
   */
  private async uploadFile(input: any): Promise<ConnectorResponse> {
    try {
      const body: any = {
        content: input.content
      };

      if (input.channels) {
        body.channels = input.channels;
      }
      if (input.filename) {
        body.filename = input.filename;
      }
      if (input.title) {
        body.title = input.title;
      }
      if (input.initial_comment) {
        body.initial_comment = input.initial_comment;
      }

      const response = await this.performRequest({
        method: 'POST',
        endpoint: `${this.baseUrl}/files.upload`,
        headers: {
          ...this.getAuthHeaders(),
          'Content-Type': 'application/json'
        },
        body
      });

      if (!response.ok) {
        throw new Error(response.error || 'Failed to upload file');
      }

      return {
        success: true,
        data: {
          ok: response.ok,
          file: response.file
        }
      };
    } catch (error) {
      return this.handleError(error as any, 'Failed to upload file');
    }
  }

  /**
   * Get file information
   */
  private async getFile(input: any): Promise<ConnectorResponse> {
    try {
      const response = await this.performRequest({
        method: 'GET',
        endpoint: `${this.baseUrl}/files.info`,
        headers: this.getAuthHeaders(),
        queryParams: {
          file: input.file
        }
      });

      if (!response.ok) {
        throw new Error(response.error || 'Failed to get file');
      }

      return {
        success: true,
        data: {
          ok: response.ok,
          file: response.file
        }
      };
    } catch (error) {
      return this.handleError(error as any, 'Failed to get file');
    }
  }

  private getAuthHeaders(): Record<string, string> {
    return this.authUtils.createAuthHeaders(AuthType.BEARER_TOKEN, this.config.credentials);
  }

  private getActions(): ConnectorAction[] {
    return [
      // ========== MESSAGE OPERATIONS ==========
      {
        id: 'send_message',
        name: 'Send Message',
        description: 'Send a message to a Slack channel or direct message to a user',
        inputSchema: {
          channelId: {
            type: 'string',
            required: true,
            label: 'Channel or User ID',
            placeholder: 'C01234ABCDE or U01234ABCDE',
            description: 'The ID of the channel (starts with C) or user (starts with U) to send the message to',
            helpText: 'Right-click on a channel in Slack → View channel details → Copy channel ID'
          },
          text: {
            type: 'string',
            required: true,
            label: 'Message Text',
            inputType: 'textarea',
            placeholder: 'Enter your message here...',
            description: 'The text content of your message (supports Slack markdown formatting)',
            helpText: 'You can use *bold*, _italic_, ~strikethrough~, `code`, and ```code blocks```'
          },
          threadTs: {
            type: 'string',
            label: 'Reply in Thread (Optional)',
            placeholder: '1234567890.123456',
            description: 'To reply in a thread, provide the timestamp of the parent message',
            helpText: 'Leave empty to send as a new message. Use output from previous message node to reply in thread.'
          }
        },
        outputSchema: {
          ok: { type: 'boolean', description: 'Whether the message was sent successfully' },
          channel: { type: 'string', description: 'The channel ID where message was sent' },
          ts: { type: 'string', description: 'Message timestamp (use this to reply in thread or update/delete message)' }
        }
      },
      {
        id: 'update_message',
        name: 'Update Message',
        description: 'Edit the text of a previously sent message',
        inputSchema: {
          channelId: {
            type: 'string',
            required: true,
            label: 'Channel ID',
            placeholder: 'C01234ABCDE',
            description: 'The ID of the channel containing the message',
            helpText: 'Must be the same channel where the original message was sent'
          },
          ts: {
            type: 'string',
            required: true,
            label: 'Message Timestamp',
            placeholder: '1234567890.123456',
            description: 'The timestamp of the message you want to update',
            helpText: 'You can get this from the output of the "Send Message" action or from message permalinks'
          },
          text: {
            type: 'string',
            required: true,
            label: 'New Message Text',
            inputType: 'textarea',
            placeholder: 'Enter the updated message text...',
            description: 'The new text that will replace the existing message content',
            helpText: 'This will completely replace the old message text'
          }
        },
        outputSchema: {
          ok: { type: 'boolean', description: 'Whether the update was successful' },
          channel: { type: 'string', description: 'Channel ID' },
          ts: { type: 'string', description: 'Message timestamp' }
        }
      },
      {
        id: 'delete_message',
        name: 'Delete Message',
        description: 'Permanently delete a message from a channel',
        inputSchema: {
          channelId: {
            type: 'string',
            required: true,
            label: 'Channel ID',
            placeholder: 'C01234ABCDE',
            description: 'The ID of the channel containing the message to delete',
            helpText: 'Your bot must have permission to delete messages in this channel'
          },
          ts: {
            type: 'string',
            required: true,
            label: 'Message Timestamp',
            placeholder: '1234567890.123456',
            description: 'The timestamp of the message you want to delete',
            helpText: 'Get this from the output of "Send Message" action or message details. Deletion is permanent!'
          }
        },
        outputSchema: {
          ok: { type: 'boolean', description: 'Whether the deletion was successful' }
        }
      },
      {
        id: 'get_permalink',
        name: 'Get Message Permalink',
        description: 'Get a permanent shareable link to a specific message',
        inputSchema: {
          channelId: {
            type: 'string',
            required: true,
            label: 'Channel ID',
            placeholder: 'C01234ABCDE',
            description: 'The ID of the channel containing the message',
            helpText: 'The channel where the message exists'
          },
          ts: {
            type: 'string',
            required: true,
            label: 'Message Timestamp',
            placeholder: '1234567890.123456',
            description: 'The timestamp of the message',
            helpText: 'This creates a permanent URL that anyone with access to the channel can use to view the message'
          }
        },
        outputSchema: {
          permalink: { type: 'string', description: 'The permanent URL to the message' }
        }
      },
      {
        id: 'search_messages',
        name: 'Search Messages',
        description: 'Search for messages across your workspace using queries',
        inputSchema: {
          query: {
            type: 'string',
            required: true,
            label: 'Search Query',
            placeholder: 'from:@username in:#channel after:2024-01-01',
            description: 'Your search query using Slack search syntax',
            helpText: 'Examples: "bug report" | from:@john | in:#general | after:2024-01-01 | before:2024-12-31'
          },
          count: {
            type: 'number',
            label: 'Number of Results',
            placeholder: '20',
            default: 20,
            min: 1,
            max: 100,
            description: 'How many search results to return (1-100)',
            helpText: 'Default is 20 results. Use a lower number for faster searches.'
          }
        },
        outputSchema: {
          messages: { type: 'array', description: 'Array of matching messages' },
          total: { type: 'number', description: 'Total number of matches found' }
        }
      },

      // ========== CHANNEL OPERATIONS ==========
      {
        id: 'create_channel',
        name: 'Create Channel',
        description: 'Create a new public or private channel in your workspace',
        inputSchema: {
          name: {
            type: 'string',
            required: true,
            label: 'Channel Name',
            placeholder: 'project-updates',
            description: 'The name for the new channel (lowercase, no spaces)',
            helpText: 'Use hyphens or underscores instead of spaces. Example: "team-announcements" or "dev_updates"',
            pattern: '^[a-z0-9-_]+$'
          },
          is_private: {
            type: 'boolean',
            label: 'Private Channel',
            default: false,
            description: 'Create as a private channel (only invited members can see it)',
            helpText: 'Public channels are visible to all workspace members. Private channels are invite-only.'
          }
        },
        outputSchema: {
          channel: { type: 'object', description: 'The created channel details including ID and name' }
        }
      },
      {
        id: 'get_channel',
        name: 'Get Channel Info',
        description: 'Retrieve detailed information about a specific channel',
        inputSchema: {
          channelId: {
            type: 'string',
            required: true,
            label: 'Channel ID',
            placeholder: 'C01234ABCDE',
            description: 'The ID of the channel to get information about',
            helpText: 'Get this from "Get Many Channels" action or right-click channel → View channel details'
          }
        },
        outputSchema: {
          channel: { type: 'object', description: 'Channel details: name, topic, purpose, member count, etc.' }
        }
      },
      {
        id: 'get_channels',
        name: 'Get Many Channels',
        description: 'List all channels your bot has access to',
        inputSchema: {
          limit: {
            type: 'number',
            label: 'Maximum Results',
            placeholder: '100',
            default: 100,
            min: 1,
            max: 1000,
            description: 'How many channels to return (1-1000)',
            helpText: 'Default is 100. Use pagination for large workspaces.'
          },
          types: {
            type: 'string',
            label: 'Channel Types',
            placeholder: 'public_channel,private_channel',
            default: 'public_channel',
            description: 'Comma-separated list of channel types to include',
            helpText: 'Options: public_channel, private_channel, mpim (group DMs), im (direct messages)'
          }
        },
        outputSchema: {
          channels: { type: 'array', description: 'Array of channel objects with IDs, names, and details' }
        }
      },
      {
        id: 'channel_history',
        name: 'Get Channel History',
        description: 'Retrieve message history from a channel',
        inputSchema: {
          channelId: {
            type: 'string',
            required: true,
            label: 'Channel ID',
            placeholder: 'C01234ABCDE',
            description: 'The ID of the channel to get messages from',
            helpText: 'Your bot must be a member of the channel to read its history'
          },
          limit: {
            type: 'number',
            label: 'Number of Messages',
            placeholder: '100',
            default: 100,
            min: 1,
            max: 1000,
            description: 'How many messages to retrieve (1-1000)',
            helpText: 'Recent messages are returned first. Use oldest/latest for specific time ranges.'
          },
          oldest: {
            type: 'string',
            label: 'Start From (Timestamp)',
            placeholder: '1234567890.123456',
            description: 'Only include messages after this timestamp (optional)',
            helpText: 'Get messages after a specific point in time. Leave empty for most recent.'
          },
          latest: {
            type: 'string',
            label: 'End At (Timestamp)',
            placeholder: '1234567890.123456',
            description: 'Only include messages before this timestamp (optional)',
            helpText: 'Get messages before a specific point in time. Leave empty for current time.'
          }
        },
        outputSchema: {
          messages: { type: 'array', description: 'Array of message objects with text, user, timestamp, etc.' },
          has_more: { type: 'boolean', description: 'True if there are more messages available' }
        }
      },
      {
        id: 'invite_to_channel',
        name: 'Invite Users to Channel',
        description: 'Invite one or more users to join a channel',
        inputSchema: {
          channelId: {
            type: 'string',
            required: true,
            label: 'Channel ID',
            placeholder: 'C01234ABCDE',
            description: 'The ID of the channel to invite users to',
            helpText: 'You must be a member of this channel to invite others'
          },
          users: {
            type: 'string',
            required: true,
            label: 'User IDs',
            placeholder: 'U1234ABCD,U5678EFGH',
            description: 'Comma-separated list of user IDs to invite',
            helpText: 'Get user IDs from "Get Users" action. Example: U1234ABCD,U5678EFGH (no spaces)'
          }
        },
        outputSchema: {
          channel: { type: 'object', description: 'Updated channel information after invitations' }
        }
      },
      {
        id: 'join_channel',
        name: 'Join Channel',
        description: 'Make your bot join a public channel',
        inputSchema: {
          channelId: {
            type: 'string',
            required: true,
            label: 'Channel ID',
            placeholder: 'C01234ABCDE',
            description: 'The ID of the channel your bot should join',
            helpText: 'Bot can only join public channels. For private channels, a member must invite the bot.'
          }
        },
        outputSchema: {
          channel: { type: 'object', description: 'Channel information after joining' }
        }
      },
      {
        id: 'leave_channel',
        name: 'Leave Channel',
        description: 'Make your bot leave a channel',
        inputSchema: {
          channelId: {
            type: 'string',
            required: true,
            label: 'Channel ID',
            placeholder: 'C01234ABCDE',
            description: 'The ID of the channel your bot should leave',
            helpText: 'Bot will no longer receive messages or have access to this channel'
          }
        },
        outputSchema: {
          ok: { type: 'boolean', description: 'Whether the bot successfully left the channel' }
        }
      },
      {
        id: 'get_channel_members',
        name: 'Get Channel Members',
        description: 'List all members of a specific channel',
        inputSchema: {
          channelId: {
            type: 'string',
            required: true,
            label: 'Channel ID',
            placeholder: 'C01234ABCDE',
            description: 'The ID of the channel to get members from',
            helpText: 'Your bot must be a member of this channel to see its members'
          },
          limit: {
            type: 'number',
            label: 'Maximum Results',
            placeholder: '100',
            default: 100,
            min: 1,
            max: 1000,
            description: 'How many members to return (1-1000)',
            helpText: 'Use pagination for channels with many members'
          }
        },
        outputSchema: {
          members: { type: 'array', description: 'Array of user IDs who are members of the channel' }
        }
      },

      // ========== FILE OPERATIONS ==========
      {
        id: 'upload_file',
        name: 'Upload File',
        description: 'Upload a file to Slack and optionally share it in channels',
        inputSchema: {
          content: {
            type: 'string',
            required: true,
            label: 'File Content',
            inputType: 'textarea',
            placeholder: 'Paste file content here or use output from previous node...',
            description: 'The content of the file you want to upload',
            helpText: 'Can be text content, base64 encoded data, or any string content'
          },
          filename: {
            type: 'string',
            label: 'File Name',
            placeholder: 'report.txt',
            description: 'The name for the uploaded file (optional)',
            helpText: 'Include file extension. Example: "report.pdf", "data.csv", "image.png"'
          },
          title: {
            type: 'string',
            label: 'File Title',
            placeholder: 'Monthly Report',
            description: 'A title for the file (optional, shown in Slack)',
            helpText: 'This appears as the file name in Slack if provided'
          },
          channels: {
            type: 'string',
            label: 'Share in Channels',
            placeholder: 'C01234ABCDE,C56789FGHIJ',
            description: 'Comma-separated channel IDs to share the file in (optional)',
            helpText: 'Leave empty to upload without sharing. Example: C01234ABCDE,C56789FGHIJ (no spaces)'
          }
        },
        outputSchema: {
          file: { type: 'object', description: 'Uploaded file details including ID, name, URL, and sharing information' }
        }
      },
      {
        id: 'get_file',
        name: 'Get File Info',
        description: 'Retrieve detailed information about an uploaded file',
        inputSchema: {
          file: {
            type: 'string',
            required: true,
            label: 'File ID',
            placeholder: 'F01234ABCDE',
            description: 'The ID of the file to retrieve information about',
            helpText: 'Get this from the "Upload File" action output or from file URLs in Slack'
          }
        },
        outputSchema: {
          file: { type: 'object', description: 'Complete file information: name, size, type, URL, shares, etc.' }
        }
      },

      // ========== WORKSPACE OPERATIONS ==========
      {
        id: 'get_users',
        name: 'Get Users',
        description: 'Retrieve a list of users in your workspace',
        inputSchema: {
          limit: {
            type: 'number',
            label: 'Maximum Results',
            placeholder: '100',
            default: 100,
            min: 1,
            max: 1000,
            description: 'How many users to return (1-1000)',
            helpText: 'Use this to get user IDs for inviting to channels or sending direct messages'
          }
        },
        outputSchema: {
          users: { type: 'array', description: 'Array of user objects with IDs, names, emails, and profiles' }
        }
      },
      {
        id: 'get_messages',
        name: 'Get Messages (Legacy)',
        description: 'Retrieve messages from a channel - Use "Get Channel History" for better experience',
        inputSchema: {
          options: {
            type: 'object',
            label: 'Query Options',
            description: 'Object containing channel ID and pagination settings',
            helpText: '⚠️ Note: Use "Get Channel History" action instead for a simpler, more user-friendly interface'
          }
        },
        outputSchema: {
          messages: { type: 'array', description: 'Array of message objects' }
        }
      }
    ];
  }

  private getTriggers(): ConnectorTrigger[] {
    return [
      {
        id: 'message',
        name: 'New Message Posted to Channel',
        description: 'Triggers when a message is posted to a channel the app is added to',
        eventType: 'message',
        webhookRequired: true,
        inputSchema: {
          watchWholeWorkspace: {
            type: 'boolean',
            label: 'Watch Whole Workspace',
            description: 'When enabled, triggers for messages across all channels. When disabled, only watches specified channel.',
            default: false
          },
          channelId: {
            type: 'string',
            label: 'Channel to Watch',
            description: 'Specific channel to monitor (only used when "Watch Whole Workspace" is false)',
            placeholder: 'C01234ABCDE',
            displayOptions: {
              show: {
                watchWholeWorkspace: [false]
              }
            }
          },
          resolveIds: {
            type: 'boolean',
            label: 'Resolve User/Channel IDs',
            description: 'Resolve user and channel IDs to their names',
            default: false
          },
          ignoreUserList: {
            type: 'string',
            label: 'Ignore Messages From',
            description: 'Comma-separated list of usernames or user IDs to ignore',
            placeholder: 'U123ABC,bot_user',
            inputType: 'text'
          }
        },
        outputSchema: {
          slackEvent: {
            type: 'object',
            properties: {
              type: { type: 'string', description: 'Event type: "message"' },
              channel: { type: 'string', description: 'Channel ID where message was posted' },
              user: { type: 'string', description: 'User ID who posted the message' },
              text: { type: 'string', description: 'Message content' },
              ts: { type: 'string', description: 'Message timestamp' },
              event_ts: { type: 'string', description: 'Event timestamp' },
              channel_type: { type: 'string', description: 'Type of channel (channel, group, im, mpim, app_home)' },
              thread_ts: { type: 'string', description: 'Thread timestamp (for threaded messages)' },
              subtype: { type: 'string', description: 'Message subtype (if applicable)' }
            }
          }
        }
      },
      {
        id: 'app_mention',
        name: 'Bot / App Mention',
        description: 'Triggers when your bot or app is mentioned in a channel',
        eventType: 'app_mention',
        webhookRequired: true,
        inputSchema: {
          resolveIds: {
            type: 'boolean',
            label: 'Resolve User/Channel IDs',
            description: 'Resolve user and channel IDs to their names',
            default: false
          }
        },
        outputSchema: {
          slackEvent: {
            type: 'object',
            properties: {
              type: { type: 'string', description: 'Event type: "app_mention"' },
              user: { type: 'string', description: 'User ID who mentioned the app' },
              text: { type: 'string', description: 'Message text containing the mention' },
              ts: { type: 'string', description: 'Message timestamp' },
              channel: { type: 'string', description: 'Channel ID' },
              event_ts: { type: 'string', description: 'Event timestamp' },
              thread_ts: { type: 'string', description: 'Thread timestamp (if in thread)' },
              channel_type: { type: 'string', description: 'Type of channel' }
            }
          }
        }
      },
      {
        id: 'reaction_added',
        name: 'Reaction Added',
        description: 'Triggers when a reaction is added to a message',
        eventType: 'reaction_added',
        webhookRequired: true,
        inputSchema: {
          watchWholeWorkspace: {
            type: 'boolean',
            label: 'Watch Whole Workspace',
            description: 'When enabled, triggers for reactions across all channels',
            default: false
          },
          channelId: {
            type: 'string',
            label: 'Channel to Watch',
            description: 'Specific channel to monitor',
            placeholder: 'C01234ABCDE',
            displayOptions: {
              show: {
                watchWholeWorkspace: [false]
              }
            }
          }
        },
        outputSchema: {
          slackEvent: {
            type: 'object',
            properties: {
              type: { type: 'string', description: 'Event type: "reaction_added"' },
              user: { type: 'string', description: 'User ID who added the reaction' },
              reaction: { type: 'string', description: 'Emoji name (without colons)' },
              item_user: { type: 'string', description: 'User ID who posted the message' },
              item: {
                type: 'object',
                description: 'Message details',
                properties: {
                  type: { type: 'string', description: 'Item type (usually "message")' },
                  channel: { type: 'string', description: 'Channel ID' },
                  ts: { type: 'string', description: 'Message timestamp' }
                }
              },
              event_ts: { type: 'string', description: 'Event timestamp' }
            }
          }
        }
      },
      {
        id: 'channel_created',
        name: 'New Public Channel Created',
        description: 'Triggers when a new public channel is created',
        eventType: 'channel_created',
        webhookRequired: true,
        outputSchema: {
          slackEvent: {
            type: 'object',
            properties: {
              type: { type: 'string', description: 'Event type: "channel_created"' },
              channel: {
                type: 'object',
                description: 'Channel details',
                properties: {
                  id: { type: 'string', description: 'Channel ID' },
                  name: { type: 'string', description: 'Channel name' },
                  created: { type: 'number', description: 'Unix timestamp when created' },
                  creator: { type: 'string', description: 'User ID who created the channel' }
                }
              },
              event_ts: { type: 'string', description: 'Event timestamp' }
            }
          }
        }
      },
      {
        id: 'team_join',
        name: 'New User',
        description: 'Triggers when a new user is added to Slack',
        eventType: 'team_join',
        webhookRequired: true,
        outputSchema: {
          slackEvent: {
            type: 'object',
            properties: {
              type: { type: 'string', description: 'Event type: "team_join"' },
              user: {
                type: 'object',
                description: 'Complete user object',
                properties: {
                  id: { type: 'string', description: 'User ID' },
                  team_id: { type: 'string', description: 'Team ID' },
                  name: { type: 'string', description: 'Username' },
                  real_name: { type: 'string', description: 'Real name' },
                  tz: { type: 'string', description: 'Timezone' },
                  profile: {
                    type: 'object',
                    description: 'User profile',
                    properties: {
                      display_name: { type: 'string' },
                      real_name: { type: 'string' },
                      email: { type: 'string' },
                      image_24: { type: 'string' },
                      image_32: { type: 'string' },
                      image_48: { type: 'string' },
                      image_72: { type: 'string' },
                      image_192: { type: 'string' },
                      image_512: { type: 'string' }
                    }
                  },
                  is_admin: { type: 'boolean' },
                  is_owner: { type: 'boolean' },
                  is_bot: { type: 'boolean' }
                }
              },
              event_ts: { type: 'string', description: 'Event timestamp' }
            }
          }
        }
      },
      {
        id: 'file_shared',
        name: 'File Shared',
        description: 'Triggers when a file is shared in a channel the app is added to',
        eventType: 'file_shared',
        webhookRequired: true,
        inputSchema: {
          watchWholeWorkspace: {
            type: 'boolean',
            label: 'Watch Whole Workspace',
            description: 'When enabled, triggers for file shares across all channels',
            default: false
          },
          channelId: {
            type: 'string',
            label: 'Channel to Watch',
            description: 'Specific channel to monitor',
            placeholder: 'C01234ABCDE',
            displayOptions: {
              show: {
                watchWholeWorkspace: [false]
              }
            }
          },
          downloadFiles: {
            type: 'boolean',
            label: 'Download Files',
            description: 'Automatically download file contents when triggered',
            default: false
          }
        },
        outputSchema: {
          slackEvent: {
            type: 'object',
            properties: {
              type: { type: 'string', description: 'Event type: "file_shared"' },
              file_id: { type: 'string', description: 'File ID' },
              user_id: { type: 'string', description: 'User ID who shared the file' },
              file: {
                type: 'object',
                description: 'File object (minimal, use files.info for full details)',
                properties: {
                  id: { type: 'string', description: 'File ID' }
                }
              },
              event_ts: { type: 'string', description: 'Event timestamp' }
            }
          }
        }
      },
      {
        id: 'file_public',
        name: 'File Made Public',
        description: 'Triggers when a file is made public',
        eventType: 'file_public',
        webhookRequired: true,
        outputSchema: {
          slackEvent: {
            type: 'object',
            properties: {
              type: { type: 'string', description: 'Event type: "file_public"' },
              file_id: { type: 'string', description: 'File ID' },
              user_id: { type: 'string', description: 'User ID who made the file public' },
              file: {
                type: 'object',
                description: 'File object',
                properties: {
                  id: { type: 'string', description: 'File ID' }
                }
              },
              event_ts: { type: 'string', description: 'Event timestamp' }
            }
          }
        }
      }
    ];
  }
}