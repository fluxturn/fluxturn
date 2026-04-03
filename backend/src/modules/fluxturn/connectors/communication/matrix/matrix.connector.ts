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
import { v4 as uuid } from 'uuid';

@Injectable()
export class MatrixConnector extends BaseConnector {
  private baseUrl: string;
  private mediaUrl: string;

  constructor(
    private readonly authUtils: AuthUtils,
    private readonly apiUtils: ApiUtils,
  ) {
    super();
  }

  getMetadata(): ConnectorMetadata {
    return {
      name: 'Matrix',
      description: 'Decentralized communication platform for secure messaging and collaboration',
      version: '1.0.0',
      category: ConnectorCategory.COMMUNICATION,
      type: ConnectorType.MATRIX,
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
    if (!this.config.credentials?.homeserverUrl) {
      throw new Error('Homeserver URL is required');
    }

    const homeserverUrl = this.config.credentials.homeserverUrl;
    this.baseUrl = `${homeserverUrl}/_matrix/client/r0`;
    this.mediaUrl = `${homeserverUrl}/_matrix/media/r0`;

    this.logger.log('Matrix connector initialized');
  }

  protected async performConnectionTest(): Promise<boolean> {
    try {
      const response = await this.performRequest({
        method: 'GET',
        endpoint: '/account/whoami',
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
      // Account
      case 'get_account_info':
        return await this.getAccountInfo();

      // Messages
      case 'send_message':
        return await this.sendMessage(input);
      case 'get_messages':
        return await this.getMessages(input);

      // Rooms
      case 'create_room':
        return await this.createRoom(input);
      case 'join_room':
        return await this.joinRoom(input);
      case 'leave_room':
        return await this.leaveRoom(input);
      case 'invite_user':
        return await this.inviteUser(input);
      case 'kick_user':
        return await this.kickUser(input);

      // Events
      case 'get_event':
        return await this.getEvent(input);

      // Room Members
      case 'get_room_members':
        return await this.getRoomMembers(input);

      // Media
      case 'upload_media':
        return await this.uploadMedia(input);

      default:
        throw new Error(`Unknown action: ${actionId}`);
    }
  }

  protected async cleanup(): Promise<void> {
    this.logger.log('Matrix connector cleanup completed');
  }

  private getAuthHeaders(): Record<string, string> {
    return {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${this.config.credentials.accessToken}`,
    };
  }

  private getActions(): ConnectorAction[] {
    return [
      {
        id: 'get_account_info',
        name: 'Get Account Info',
        description: 'Get current user account information',
        inputSchema: {},
        outputSchema: { user_id: { type: 'string' } },
      },
      {
        id: 'send_message',
        name: 'Send Message',
        description: 'Send a message to a room',
        inputSchema: {
          roomId: { type: 'string', required: true },
          text: { type: 'string', required: true },
          messageType: { type: 'string', required: false },
          messageFormat: { type: 'string', required: false },
          fallbackText: { type: 'string', required: false },
        },
        outputSchema: { event_id: { type: 'string' } },
      },
      {
        id: 'get_messages',
        name: 'Get Messages',
        description: 'Get messages from a room',
        inputSchema: {
          roomId: { type: 'string', required: true },
          limit: { type: 'number', required: false },
          filter: { type: 'string', required: false },
        },
        outputSchema: { messages: { type: 'array' } },
      },
      {
        id: 'create_room',
        name: 'Create Room',
        description: 'Create a new chat room',
        inputSchema: {
          roomName: { type: 'string', required: true },
          preset: { type: 'string', required: true },
          roomAlias: { type: 'string', required: false },
        },
        outputSchema: { room_id: { type: 'string' } },
      },
      {
        id: 'join_room',
        name: 'Join Room',
        description: 'Join a room',
        inputSchema: {
          roomIdOrAlias: { type: 'string', required: true },
        },
        outputSchema: { room_id: { type: 'string' } },
      },
      {
        id: 'leave_room',
        name: 'Leave Room',
        description: 'Leave a room',
        inputSchema: {
          roomId: { type: 'string', required: true },
        },
        outputSchema: { success: { type: 'boolean' } },
      },
      {
        id: 'invite_user',
        name: 'Invite User',
        description: 'Invite a user to a room',
        inputSchema: {
          roomId: { type: 'string', required: true },
          userId: { type: 'string', required: true },
        },
        outputSchema: { success: { type: 'boolean' } },
      },
      {
        id: 'kick_user',
        name: 'Kick User',
        description: 'Kick a user from a room',
        inputSchema: {
          roomId: { type: 'string', required: true },
          userId: { type: 'string', required: true },
          reason: { type: 'string', required: false },
        },
        outputSchema: { success: { type: 'boolean' } },
      },
      {
        id: 'get_event',
        name: 'Get Event',
        description: 'Get a single event by ID',
        inputSchema: {
          roomId: { type: 'string', required: true },
          eventId: { type: 'string', required: true },
        },
        outputSchema: { event: { type: 'object' } },
      },
      {
        id: 'get_room_members',
        name: 'Get Room Members',
        description: 'Get members of a room',
        inputSchema: {
          roomId: { type: 'string', required: true },
          membership: { type: 'string', required: false },
          notMembership: { type: 'string', required: false },
        },
        outputSchema: { members: { type: 'array' } },
      },
      {
        id: 'upload_media',
        name: 'Upload Media',
        description: 'Upload media to a chat room',
        inputSchema: {
          roomId: { type: 'string', required: true },
          mediaType: { type: 'string', required: true },
          binaryData: { type: 'string', required: true },
          fileName: { type: 'string', required: false },
        },
        outputSchema: {
          content_uri: { type: 'string' },
          event_id: { type: 'string' },
        },
      },
    ];
  }

  private getTriggers(): ConnectorTrigger[] {
    return [];
  }

  // Account Methods
  private async getAccountInfo(): Promise<any> {
    return await this.performRequest({
      method: 'GET',
      endpoint: '/account/whoami',
      headers: this.getAuthHeaders(),
    });
  }

  // Message Methods
  private async sendMessage(data: any): Promise<any> {
    const {
      roomId,
      text,
      messageType = 'm.text',
      messageFormat = 'plain',
      fallbackText,
    } = data;

    const messageId = uuid();
    const body: any = {
      msgtype: messageType,
      body: text,
    };

    if (messageFormat === 'org.matrix.custom.html') {
      body.format = messageFormat;
      body.formatted_body = text;
      body.body = fallbackText || text;
    }

    return await this.performRequest({
      method: 'PUT',
      endpoint: `/rooms/${roomId}/send/m.room.message/${messageId}`,
      headers: this.getAuthHeaders(),
      body,
    });
  }

  private async getMessages(data: any): Promise<any> {
    const { roomId, limit = 100, filter } = data;

    const queryParams: any = {
      dir: 'b',
      limit,
    };

    if (filter) {
      queryParams.filter = filter;
    }

    const response = await this.performRequest({
      method: 'GET',
      endpoint: `/rooms/${roomId}/messages`,
      headers: this.getAuthHeaders(),
      queryParams,
    });

    return { messages: response.chunk || [] };
  }

  // Room Methods
  private async createRoom(data: any): Promise<any> {
    const { roomName, preset, roomAlias } = data;

    const body: any = {
      name: roomName,
      preset,
    };

    if (roomAlias) {
      body.room_alias_name = roomAlias;
    }

    return await this.performRequest({
      method: 'POST',
      endpoint: '/createRoom',
      headers: this.getAuthHeaders(),
      body,
    });
  }

  private async joinRoom(data: any): Promise<any> {
    const { roomIdOrAlias } = data;

    return await this.performRequest({
      method: 'POST',
      endpoint: `/rooms/${roomIdOrAlias}/join`,
      headers: this.getAuthHeaders(),
      body: {},
    });
  }

  private async leaveRoom(data: any): Promise<any> {
    const { roomId } = data;

    await this.performRequest({
      method: 'POST',
      endpoint: `/rooms/${roomId}/leave`,
      headers: this.getAuthHeaders(),
      body: {},
    });

    return { success: true };
  }

  private async inviteUser(data: any): Promise<any> {
    const { roomId, userId } = data;

    await this.performRequest({
      method: 'POST',
      endpoint: `/rooms/${roomId}/invite`,
      headers: this.getAuthHeaders(),
      body: { user_id: userId },
    });

    return { success: true };
  }

  private async kickUser(data: any): Promise<any> {
    const { roomId, userId, reason } = data;

    const body: any = {
      user_id: userId,
    };

    if (reason) {
      body.reason = reason;
    }

    await this.performRequest({
      method: 'POST',
      endpoint: `/rooms/${roomId}/kick`,
      headers: this.getAuthHeaders(),
      body,
    });

    return { success: true };
  }

  // Event Methods
  private async getEvent(data: any): Promise<any> {
    const { roomId, eventId } = data;

    const event = await this.performRequest({
      method: 'GET',
      endpoint: `/rooms/${roomId}/event/${eventId}`,
      headers: this.getAuthHeaders(),
    });

    return { event };
  }

  // Room Member Methods
  private async getRoomMembers(data: any): Promise<any> {
    const { roomId, membership = '', notMembership = '' } = data;

    const queryParams: any = {};

    if (membership) {
      queryParams.membership = membership;
    }

    if (notMembership) {
      queryParams.not_membership = notMembership;
    }

    const response = await this.performRequest({
      method: 'GET',
      endpoint: `/rooms/${roomId}/members`,
      headers: this.getAuthHeaders(),
      queryParams,
    });

    return { members: response.chunk || [] };
  }

  // Media Methods
  private async uploadMedia(data: any): Promise<any> {
    const { roomId, mediaType, binaryData, fileName } = data;

    // Note: This is a simplified implementation
    // In a real implementation, you would need to handle binary data properly
    const queryParams: any = {};
    if (fileName) {
      queryParams.filename = fileName;
    }

    // First upload the media to the media endpoint
    const uploadUrl = `${this.mediaUrl}/upload`;
    const uploadHeaders = {
      'Authorization': `Bearer ${this.config.credentials.accessToken}`,
      'Content-Type': 'application/octet-stream',
    };

    const uploadResponse = await this.apiUtils.executeRequest({
      method: 'POST',
      endpoint: uploadUrl,
      headers: uploadHeaders,
      queryParams: queryParams,
      body: binaryData,
    });

    const contentUri = uploadResponse.data.content_uri;

    // Then send a message with the media
    const messageId = uuid();
    const messageBody = {
      msgtype: `m.${mediaType}`,
      body: fileName || 'file',
      url: contentUri,
    };

    const messageResponse = await this.performRequest({
      method: 'PUT',
      endpoint: `/rooms/${roomId}/send/m.room.message/${messageId}`,
      headers: this.getAuthHeaders(),
      body: messageBody,
    });

    return {
      content_uri: contentUri,
      event_id: messageResponse.event_id,
    };
  }
}
