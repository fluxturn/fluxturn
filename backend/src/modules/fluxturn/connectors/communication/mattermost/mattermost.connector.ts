import { Injectable, Logger } from '@nestjs/common';
import { BaseConnector } from '../../base/base.connector';
import {
  ConnectorMetadata,
  ConnectorType,
  ConnectorCategory,
  ConnectorRequest,
  ConnectorResponse,
  AuthType,
  ConnectorAction,
  ConnectorTrigger,
} from '../../types';
import { AuthUtils } from '../../utils/auth.utils';
import { ApiUtils } from '../../utils/api.utils';

@Injectable()
export class MattermostConnector extends BaseConnector {
  private baseUrl: string;

  constructor(
    private readonly authUtils: AuthUtils,
    private readonly apiUtils: ApiUtils,
  ) {
    super();
  }

  getMetadata(): ConnectorMetadata {
    return {
      name: 'Mattermost',
      description: 'Team collaboration and messaging platform for secure communication',
      version: '1.0.0',
      category: ConnectorCategory.COMMUNICATION,
      type: ConnectorType.MATTERMOST,
      authType: AuthType.BEARER_TOKEN,
      actions: this.getActions(),
      triggers: this.getTriggers(),
      webhookSupport: false,
    };
  }

  protected async initializeConnection(): Promise<void> {
    if (!this.config.credentials?.accessToken) {
      throw new Error('Access token is required');
    }
    if (!this.config.credentials?.baseUrl) {
      throw new Error('Base URL is required');
    }
    this.baseUrl = `${this.config.credentials.baseUrl.replace(/\/$/, '')}/api/v4`;
    this.logger.log('Mattermost connector initialized');
  }

  protected async performConnectionTest(): Promise<boolean> {
    try {
      const response = await this.performRequest({
        method: 'GET',
        endpoint: '/users/me',
        headers: this.getAuthHeaders(),
      });
      return !!response;
    } catch (error) {
      this.logger.error('Connection test failed:', error);
      return false;
    }
  }

  protected async performHealthCheck(): Promise<void> {
    const isHealthy = await this.performConnectionTest();
    if (!isHealthy) {
      throw new Error('Health check failed');
    }
  }

  protected async performRequest(request: ConnectorRequest): Promise<any> {
    const url = `${this.baseUrl}${request.endpoint}`;

    const response = await this.apiUtils.executeRequest({
      method: request.method,
      endpoint: url,
      headers: request.headers || this.getAuthHeaders(),
      queryParams: request.queryParams,
      body: request.body,
    });

    return response.data;
  }

  protected async performAction(actionId: string, input: any): Promise<any> {
    switch (actionId) {
      // Channel Actions
      case 'create_channel':
        return await this.createChannel(input);
      case 'delete_channel':
        return await this.deleteChannel(input);
      case 'restore_channel':
        return await this.restoreChannel(input);
      case 'add_user_to_channel':
        return await this.addUserToChannel(input);
      case 'get_channel_members':
        return await this.getChannelMembers(input);
      case 'search_channels':
        return await this.searchChannels(input);
      case 'get_channel_statistics':
        return await this.getChannelStatistics(input);

      // Message Actions
      case 'post_message':
        return await this.postMessage(input);
      case 'post_ephemeral_message':
        return await this.postEphemeralMessage(input);
      case 'delete_message':
        return await this.deleteMessage(input);

      // Reaction Actions
      case 'create_reaction':
        return await this.createReaction(input);
      case 'delete_reaction':
        return await this.deleteReaction(input);
      case 'get_all_reactions':
        return await this.getAllReactions(input);

      // User Actions
      case 'create_user':
        return await this.createUser(input);
      case 'deactivate_user':
        return await this.deactivateUser(input);
      case 'get_user_by_id':
        return await this.getUserById(input);
      case 'get_user_by_email':
        return await this.getUserByEmail(input);
      case 'get_all_users':
        return await this.getAllUsers(input);
      case 'invite_user_to_team':
        return await this.inviteUserToTeam(input);

      default:
        throw new Error(`Unknown action: ${actionId}`);
    }
  }

  protected async cleanup(): Promise<void> {
    this.logger.log('Mattermost connector cleanup completed');
  }

  private getAuthHeaders(): Record<string, string> {
    return {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${this.config.credentials.accessToken}`,
    };
  }

  private getActions(): ConnectorAction[] {
    return [
      // Channel Actions
      {
        id: 'create_channel',
        name: 'Create Channel',
        description: 'Create a new channel',
        inputSchema: {
          teamId: { type: 'string', required: true },
          name: { type: 'string', required: true },
          displayName: { type: 'string', required: true },
          type: { type: 'string', required: true },
        },
        outputSchema: { channel: { type: 'object' } },
      },
      {
        id: 'delete_channel',
        name: 'Delete Channel',
        description: 'Soft delete a channel',
        inputSchema: {
          channelId: { type: 'string', required: true },
        },
        outputSchema: { success: { type: 'boolean' } },
      },
      {
        id: 'restore_channel',
        name: 'Restore Channel',
        description: 'Restore a soft-deleted channel',
        inputSchema: {
          channelId: { type: 'string', required: true },
        },
        outputSchema: { channel: { type: 'object' } },
      },
      {
        id: 'add_user_to_channel',
        name: 'Add User to Channel',
        description: 'Add a user to a channel',
        inputSchema: {
          channelId: { type: 'string', required: true },
          userId: { type: 'string', required: true },
        },
        outputSchema: { channel_id: { type: 'string' }, user_id: { type: 'string' } },
      },
      {
        id: 'get_channel_members',
        name: 'Get Channel Members',
        description: 'Get a page of members for a channel',
        inputSchema: {
          channelId: { type: 'string', required: true },
        },
        outputSchema: { members: { type: 'array' } },
      },
      {
        id: 'search_channels',
        name: 'Search Channels',
        description: 'Search for channels',
        inputSchema: {
          teamId: { type: 'string', required: true },
          term: { type: 'string', required: true },
        },
        outputSchema: { channels: { type: 'array' } },
      },
      {
        id: 'get_channel_statistics',
        name: 'Get Channel Statistics',
        description: 'Get statistics for a channel',
        inputSchema: {
          channelId: { type: 'string', required: true },
        },
        outputSchema: { member_count: { type: 'number' }, channel_id: { type: 'string' } },
      },
      // Message Actions
      {
        id: 'post_message',
        name: 'Post Message',
        description: 'Post a message to a channel',
        inputSchema: {
          channelId: { type: 'string', required: true },
          message: { type: 'string', required: true },
          rootId: { type: 'string', required: false },
        },
        outputSchema: { post: { type: 'object' } },
      },
      {
        id: 'post_ephemeral_message',
        name: 'Post Ephemeral Message',
        description: 'Post an ephemeral message visible only to a specific user',
        inputSchema: {
          userId: { type: 'string', required: true },
          channelId: { type: 'string', required: true },
          message: { type: 'string', required: true },
        },
        outputSchema: { post: { type: 'object' } },
      },
      {
        id: 'delete_message',
        name: 'Delete Message',
        description: 'Delete a message',
        inputSchema: {
          postId: { type: 'string', required: true },
        },
        outputSchema: { success: { type: 'boolean' } },
      },
      // Reaction Actions
      {
        id: 'create_reaction',
        name: 'Create Reaction',
        description: 'Add a reaction to a post',
        inputSchema: {
          userId: { type: 'string', required: true },
          postId: { type: 'string', required: true },
          emojiName: { type: 'string', required: true },
        },
        outputSchema: { user_id: { type: 'string' }, post_id: { type: 'string' }, emoji_name: { type: 'string' } },
      },
      {
        id: 'delete_reaction',
        name: 'Delete Reaction',
        description: 'Remove a reaction from a post',
        inputSchema: {
          userId: { type: 'string', required: true },
          postId: { type: 'string', required: true },
          emojiName: { type: 'string', required: true },
        },
        outputSchema: { success: { type: 'boolean' } },
      },
      {
        id: 'get_all_reactions',
        name: 'Get All Reactions',
        description: 'Get all reactions for a post',
        inputSchema: {
          postId: { type: 'string', required: true },
        },
        outputSchema: { reactions: { type: 'array' } },
      },
      // User Actions
      {
        id: 'create_user',
        name: 'Create User',
        description: 'Create a new user account',
        inputSchema: {
          username: { type: 'string', required: true },
          email: { type: 'string', required: true },
          password: { type: 'string', required: true },
          firstName: { type: 'string', required: false },
          lastName: { type: 'string', required: false },
          nickname: { type: 'string', required: false },
          locale: { type: 'string', required: false },
        },
        outputSchema: { id: { type: 'string' }, username: { type: 'string' }, email: { type: 'string' } },
      },
      {
        id: 'deactivate_user',
        name: 'Deactivate User',
        description: 'Deactivate a user account',
        inputSchema: {
          userId: { type: 'string', required: true },
        },
        outputSchema: { success: { type: 'boolean' } },
      },
      {
        id: 'get_user_by_id',
        name: 'Get User by ID',
        description: 'Get a user by their ID',
        inputSchema: {
          userId: { type: 'string', required: true },
        },
        outputSchema: { user: { type: 'object' } },
      },
      {
        id: 'get_user_by_email',
        name: 'Get User by Email',
        description: 'Get a user by their email address',
        inputSchema: {
          email: { type: 'string', required: true },
        },
        outputSchema: { user: { type: 'object' } },
      },
      {
        id: 'get_all_users',
        name: 'Get All Users',
        description: 'Retrieve multiple users',
        inputSchema: {
          page: { type: 'number', required: false },
          perPage: { type: 'number', required: false },
        },
        outputSchema: { users: { type: 'array' } },
      },
      {
        id: 'invite_user_to_team',
        name: 'Invite User to Team',
        description: 'Send an email invite to a user to join a team',
        inputSchema: {
          teamId: { type: 'string', required: true },
          email: { type: 'string', required: true },
        },
        outputSchema: { success: { type: 'boolean' } },
      },
    ];
  }

  private getTriggers(): ConnectorTrigger[] {
    return [];
  }

  // Channel Methods
  private async createChannel(data: any): Promise<any> {
    const { teamId, name, displayName, type } = data;

    return await this.performRequest({
      method: 'POST',
      endpoint: '/channels',
      headers: this.getAuthHeaders(),
      body: {
        team_id: teamId,
        name: name,
        display_name: displayName,
        type: type,
      },
    });
  }

  private async deleteChannel(data: any): Promise<any> {
    const { channelId } = data;

    await this.performRequest({
      method: 'DELETE',
      endpoint: `/channels/${channelId}`,
      headers: this.getAuthHeaders(),
    });

    return { success: true };
  }

  private async restoreChannel(data: any): Promise<any> {
    const { channelId } = data;

    return await this.performRequest({
      method: 'POST',
      endpoint: `/channels/${channelId}/restore`,
      headers: this.getAuthHeaders(),
    });
  }

  private async addUserToChannel(data: any): Promise<any> {
    const { channelId, userId } = data;

    return await this.performRequest({
      method: 'POST',
      endpoint: `/channels/${channelId}/members`,
      headers: this.getAuthHeaders(),
      body: {
        user_id: userId,
      },
    });
  }

  private async getChannelMembers(data: any): Promise<any> {
    const { channelId } = data;

    return await this.performRequest({
      method: 'GET',
      endpoint: `/channels/${channelId}/members`,
      headers: this.getAuthHeaders(),
    });
  }

  private async searchChannels(data: any): Promise<any> {
    const { teamId, term } = data;

    return await this.performRequest({
      method: 'POST',
      endpoint: `/teams/${teamId}/channels/search`,
      headers: this.getAuthHeaders(),
      body: {
        term: term,
      },
    });
  }

  private async getChannelStatistics(data: any): Promise<any> {
    const { channelId } = data;

    return await this.performRequest({
      method: 'GET',
      endpoint: `/channels/${channelId}/stats`,
      headers: this.getAuthHeaders(),
    });
  }

  // Message Methods
  private async postMessage(data: any): Promise<any> {
    const { channelId, message, rootId } = data;

    const body: any = {
      channel_id: channelId,
      message: message,
    };

    if (rootId) {
      body.root_id = rootId;
    }

    return await this.performRequest({
      method: 'POST',
      endpoint: '/posts',
      headers: this.getAuthHeaders(),
      body: body,
    });
  }

  private async postEphemeralMessage(data: any): Promise<any> {
    const { userId, channelId, message } = data;

    return await this.performRequest({
      method: 'POST',
      endpoint: '/posts/ephemeral',
      headers: this.getAuthHeaders(),
      body: {
        user_id: userId,
        channel_id: channelId,
        message: message,
      },
    });
  }

  private async deleteMessage(data: any): Promise<any> {
    const { postId } = data;

    await this.performRequest({
      method: 'DELETE',
      endpoint: `/posts/${postId}`,
      headers: this.getAuthHeaders(),
    });

    return { success: true };
  }

  // Reaction Methods
  private async createReaction(data: any): Promise<any> {
    const { userId, postId, emojiName } = data;

    return await this.performRequest({
      method: 'POST',
      endpoint: '/reactions',
      headers: this.getAuthHeaders(),
      body: {
        user_id: userId,
        post_id: postId,
        emoji_name: emojiName,
      },
    });
  }

  private async deleteReaction(data: any): Promise<any> {
    const { userId, postId, emojiName } = data;

    await this.performRequest({
      method: 'DELETE',
      endpoint: `/users/${userId}/posts/${postId}/reactions/${emojiName}`,
      headers: this.getAuthHeaders(),
    });

    return { success: true };
  }

  private async getAllReactions(data: any): Promise<any> {
    const { postId } = data;

    return await this.performRequest({
      method: 'GET',
      endpoint: `/posts/${postId}/reactions`,
      headers: this.getAuthHeaders(),
    });
  }

  // User Methods
  private async createUser(data: any): Promise<any> {
    const { username, email, password, firstName, lastName, nickname, locale } = data;

    const body: any = {
      username: username,
      email: email,
      password: password,
    };

    if (firstName) body.first_name = firstName;
    if (lastName) body.last_name = lastName;
    if (nickname) body.nickname = nickname;
    if (locale) body.locale = locale;

    return await this.performRequest({
      method: 'POST',
      endpoint: '/users',
      headers: this.getAuthHeaders(),
      body: body,
    });
  }

  private async deactivateUser(data: any): Promise<any> {
    const { userId } = data;

    await this.performRequest({
      method: 'DELETE',
      endpoint: `/users/${userId}`,
      headers: this.getAuthHeaders(),
    });

    return { success: true };
  }

  private async getUserById(data: any): Promise<any> {
    const { userId } = data;

    return await this.performRequest({
      method: 'GET',
      endpoint: `/users/${userId}`,
      headers: this.getAuthHeaders(),
    });
  }

  private async getUserByEmail(data: any): Promise<any> {
    const { email } = data;

    return await this.performRequest({
      method: 'GET',
      endpoint: `/users/email/${email}`,
      headers: this.getAuthHeaders(),
    });
  }

  private async getAllUsers(data: any): Promise<any> {
    const { page = 0, perPage = 60 } = data;

    return await this.performRequest({
      method: 'GET',
      endpoint: '/users',
      headers: this.getAuthHeaders(),
      queryParams: {
        page: page,
        per_page: perPage,
      },
    });
  }

  private async inviteUserToTeam(data: any): Promise<any> {
    const { teamId, email } = data;

    await this.performRequest({
      method: 'POST',
      endpoint: `/teams/${teamId}/invite/email`,
      headers: this.getAuthHeaders(),
      body: [email],
    });

    return { success: true };
  }
}
