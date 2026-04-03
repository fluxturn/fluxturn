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
  ConnectorTrigger,
  OAuthTokens
} from '../../types';
import { AuthUtils } from '../../utils/auth.utils';
import { ApiUtils } from '../../utils/api.utils';

// Microsoft Teams/Graph-specific interfaces
export interface TeamsMessage {
  id: string;
  replyToId?: string;
  etag: string;
  messageType: 'message' | 'chatMessage' | 'systemEventMessage';
  createdDateTime: string;
  lastModifiedDateTime: string;
  lastEditedDateTime?: string;
  deletedDateTime?: string;
  subject?: string;
  summary?: string;
  chatId?: string;
  importance: 'normal' | 'high' | 'urgent';
  locale: string;
  webUrl?: string;
  channelIdentity?: {
    teamId: string;
    channelId: string;
  };
  policyViolation?: any;
  eventDetail?: any;
  from: {
    application?: any;
    device?: any;
    user?: {
      id: string;
      displayName: string;
      userIdentityType: string;
    };
  };
  body: {
    contentType: 'text' | 'html';
    content: string;
  };
  attachments?: Array<{
    id: string;
    contentType: string;
    contentUrl?: string;
    content?: string;
    name?: string;
    thumbnailUrl?: string;
  }>;
  mentions?: Array<{
    id: number;
    mentionText: string;
    mentioned: {
      application?: any;
      device?: any;
      user?: {
        id: string;
        displayName: string;
        userIdentityType: string;
      };
    };
  }>;
  reactions?: Array<{
    reactionType: string;
    createdDateTime: string;
    user: {
      application?: any;
      device?: any;
      user?: {
        id: string;
        displayName: string;
        userIdentityType: string;
      };
    };
  }>;
}

export interface TeamsChannel {
  id: string;
  createdDateTime: string;
  displayName: string;
  description?: string;
  isFavoriteByDefault?: boolean;
  email?: string;
  webUrl?: string;
  membershipType: 'standard' | 'private' | 'unknownFutureValue';
  moderationSettings?: {
    userNewMessageRestriction: 'everyone' | 'everyoneExceptGuests' | 'moderators' | 'unknownFutureValue';
    replyRestriction: 'everyone' | 'everyoneExceptGuests' | 'moderators' | 'unknownFutureValue';
    allowNewMessageFromBots: boolean;
    allowNewMessageFromConnectors: boolean;
  };
}

export interface TeamsTeam {
  id: string;
  createdDateTime?: string;
  displayName: string;
  description?: string;
  internalId?: string;
  classification?: string;
  specialization?: 'none' | 'educationStandard' | 'educationClass' | 'educationProfessionalLearningCommunity' | 'educationStaff' | 'healthcareStandard' | 'healthcareCareCoordination' | 'unknownFutureValue';
  visibility?: 'private' | 'public' | 'hiddenMembership' | 'unknownFutureValue';
  webUrl?: string;
  isArchived?: boolean;
  isMembershipLimitedToOwners?: boolean;
  memberSettings?: {
    allowCreateUpdateChannels: boolean;
    allowCreatePrivateChannels: boolean;
    allowDeleteChannels: boolean;
    allowAddRemoveApps: boolean;
    allowCreateUpdateRemoveTabs: boolean;
    allowCreateUpdateRemoveConnectors: boolean;
  };
  guestSettings?: {
    allowCreateUpdateChannels: boolean;
    allowDeleteChannels: boolean;
  };
  messagingSettings?: {
    allowUserEditMessages: boolean;
    allowUserDeleteMessages: boolean;
    allowOwnerDeleteMessages: boolean;
    allowTeamMentions: boolean;
    allowChannelMentions: boolean;
  };
  funSettings?: {
    allowGiphy: boolean;
    giphyContentRating: 'strict' | 'moderate' | 'unknownFutureValue';
    allowStickersAndMemes: boolean;
    allowCustomMemes: boolean;
  };
  discoverySettings?: {
    showInTeamsSearchAndSuggestions: boolean;
  };
}

export interface TeamsMeeting {
  id: string;
  createdDateTime: string;
  startDateTime: string;
  endDateTime: string;
  joinWebUrl: string;
  subject: string;
  isBroadcast?: boolean;
  autoAdmittedUsers?: 'everyoneInCompany' | 'everyone' | 'unknownFutureValue';
  outerMeetingAutoAdmittedUsers?: 'everyoneInCompany' | 'everyone' | 'unknownFutureValue';
  meetingInfo?: {
    contentSharingDisabled: boolean;
    ipAudioEnabled: boolean;
    ipVideoEnabled: boolean;
    pstnAudioEnabled: boolean;
    pstnVideoEnabled: boolean;
  };
  participants?: {
    organizer: {
      upn?: string;
      role?: 'attendee' | 'presenter' | 'producer' | 'unknownFutureValue';
      identity: {
        application?: any;
        device?: any;
        user?: {
          id: string;
          displayName?: string;
          tenantId?: string;
          identityProvider?: string;
        };
      };
    };
    attendees: Array<{
      upn?: string;
      role?: 'attendee' | 'presenter' | 'producer' | 'unknownFutureValue';
      identity: {
        application?: any;
        device?: any;
        user?: {
          id: string;
          displayName?: string;
          tenantId?: string;
          identityProvider?: string;
        };
      };
    }>;
  };
  audioConferencing?: {
    conferenceId: string;
    tollNumber: string;
    tollFreeNumber?: string;
    dialinUrl: string;
  };
}

export interface TeamsUser {
  id: string;
  displayName?: string;
  givenName?: string;
  surname?: string;
  email?: string;
  userPrincipalName?: string;
  jobTitle?: string;
  mobilePhone?: string;
  officeLocation?: string;
  preferredLanguage?: string;
  businessPhones?: string[];
}

export interface TeamsSendMessageRequest {
  body: {
    contentType: 'text' | 'html';
    content: string;
  };
  subject?: string;
  importance?: 'normal' | 'high' | 'urgent';
  attachments?: Array<{
    id?: string;
    contentType: string;
    contentUrl?: string;
    content?: string;
    name?: string;
  }>;
  mentions?: Array<{
    id: number;
    mentionText: string;
    mentioned: {
      user: {
        id: string;
        displayName: string;
        userIdentityType: string;
      };
    };
  }>;
}

@Injectable()
export class TeamsConnector extends BaseConnector implements ICommunicationConnector {
  private baseUrl = 'https://graph.microsoft.com/v1.0';
  
  constructor(
    private readonly authUtils: AuthUtils,
    private readonly apiUtils: ApiUtils
  ) {
    super();
  }

  getMetadata(): ConnectorMetadata {
    return {
      name: 'Microsoft Teams',
      description: 'Microsoft Teams collaboration and communication platform',
      version: '1.0.0',
      category: ConnectorCategory.COMMUNICATION,
      type: ConnectorType.CHAT,
      logoUrl: 'https://upload.wikimedia.org/wikipedia/commons/c/c9/Microsoft_Office_Teams_%282018%E2%80%93present%29.svg',
      documentationUrl: 'https://docs.microsoft.com/en-us/graph/api/resources/teams-api-overview',
      authType: AuthType.OAUTH2,
      requiredScopes: [
        'https://graph.microsoft.com/Team.ReadBasic.All',
        'https://graph.microsoft.com/Channel.ReadBasic.All',
        'https://graph.microsoft.com/ChannelMessage.Send',
        'https://graph.microsoft.com/ChatMessage.Send',
        'https://graph.microsoft.com/Chat.ReadWrite',
        'https://graph.microsoft.com/OnlineMeetings.ReadWrite',
        'https://graph.microsoft.com/Files.ReadWrite.All',
        'https://graph.microsoft.com/User.Read.All'
      ],
      actions: this.getActions(),
      triggers: this.getTriggers(),
      rateLimit: {
        requestsPerSecond: 10,
        requestsPerMinute: 600,
        requestsPerHour: 36000
      },
      webhookSupport: true
    };
  }

  protected async initializeConnection(): Promise<void> {
    // Test connection by getting current user info
    const response = await this.performRequest({
      method: 'GET',
      endpoint: `${this.baseUrl}/me`,
      headers: this.getAuthHeaders()
    });

    if (!response.id) {
      throw new Error('Failed to initialize Microsoft Teams connection');
    }

    this.logger.log(`Teams connector initialized for user: ${response.displayName || response.userPrincipalName}`);
  }

  protected async performConnectionTest(): Promise<boolean> {
    try {
      const response = await this.performRequest({
        method: 'GET',
        endpoint: `${this.baseUrl}/me`,
        headers: this.getAuthHeaders()
      });
      return !!response.id;
    } catch (error) {
      return false;
    }
  }

  protected async performHealthCheck(): Promise<void> {
    const response = await this.performRequest({
      method: 'GET',
      endpoint: `${this.baseUrl}/me/joinedTeams`,
      headers: this.getAuthHeaders(),
      queryParams: { '$top': 1 }
    });

    if (!response.value) {
      throw new Error('Microsoft Teams health check failed');
    }
  }

  protected async performRequest(request: ConnectorRequest): Promise<any> {
    const response = await this.apiUtils.executeRequest(request, {
      timeout: 30000,
      retries: 3
    });

    if (!response.success) {
      throw new Error(response.error?.message || 'Microsoft Graph API request failed');
    }

    return response.data;
  }

  protected async performAction(actionId: string, input: any): Promise<any> {
    switch (actionId) {
      // Channel operations - aligned with definition
      case 'create_channel':
        return this.createChannel(input.teamId, input.displayName || input.name, input.description, input.membershipType);
      case 'get_channel':
        return this.getChannel(input.teamId, input.channelId);
      case 'list_channels':
        return this.getChannels(input.teamId);
      case 'update_channel':
        return this.updateChannel(input.teamId, input.channelId, input.displayName, input.description);
      case 'delete_channel':
        return this.deleteChannel(input.teamId, input.channelId);

      // Channel message operations - aligned with definition
      case 'send_channel_message':
        return this.sendChannelMessage(input.teamId, input.channelId, input.content, input.contentType, input.replyToId);
      case 'list_channel_messages':
        return this.listChannelMessages(input.teamId, input.channelId, input.top);

      // Chat message operations - aligned with definition
      case 'send_chat_message':
        return this.sendChatMessage(input.chatId, input.content, input.contentType);
      case 'get_chat_message':
        return this.getChatMessage(input.chatId, input.messageId);
      case 'list_chat_messages':
        return this.listChatMessages(input.chatId, input.top);

      // Task operations (Planner) - aligned with definition
      case 'create_task':
        return this.createTask(input);
      case 'get_task':
        return this.getTask(input.taskId);
      case 'list_tasks':
        return this.listTasks(input.planId);
      case 'update_task':
        return this.updateTask(input.taskId, input);
      case 'delete_task':
        return this.deleteTask(input.taskId);

      // Legacy/additional actions (for backward compatibility)
      case 'send_message':
        return this.sendMessage(input.channelId || input.chatId, input.message);
      case 'create_team':
        return this.createTeam(input.team);
      case 'manage_meetings':
        return this.manageMeetings(input.action, input.meeting);
      case 'share_files':
        return this.shareFiles(input.teamId, input.channelId, input.file);
      case 'get_teams':
        return this.getTeams(input.options);
      case 'get_channels':
        return this.getChannels(input.teamId);
      case 'get_messages':
        return this.getMessages(input.options);
      case 'get_users':
        return this.getUsers(input.options);
      default:
        throw new Error(`Unknown action: ${actionId}`);
    }
  }

  protected async cleanup(): Promise<void> {
    this.logger.log('Microsoft Teams connector cleanup completed');
  }

  // ICommunicationConnector implementation
  async sendMessage(to: string | string[], message: any): Promise<ConnectorResponse> {
    const targets = Array.isArray(to) ? to : [to];
    const results: any[] = [];

    for (const target of targets) {
      try {
        const teamsMessage: TeamsSendMessageRequest = {
          body: {
            contentType: message.contentType || 'text',
            content: message.content || message.text || message.body
          },
          subject: message.subject,
          importance: message.importance || 'normal',
          attachments: message.attachments,
          mentions: message.mentions
        };

        let endpoint: string;
        
        // Determine if it's a channel message or chat message
        if (target.includes('/channels/')) {
          // Channel message format: teamId/channels/channelId
          endpoint = `${this.baseUrl}/teams/${target}/messages`;
        } else if (target.includes('chat_')) {
          // Chat message format: chat_chatId
          const chatId = target.replace('chat_', '');
          endpoint = `${this.baseUrl}/chats/${chatId}/messages`;
        } else {
          // Assume it's a team/channel format
          endpoint = `${this.baseUrl}/teams/${target}/messages`;
        }

        const response = await this.performRequest({
          method: 'POST',
          endpoint,
          headers: {
            ...this.getAuthHeaders(),
            'Content-Type': 'application/json'
          },
          body: teamsMessage
        });

        results.push({
          target,
          success: true,
          messageId: response.id,
          createdDateTime: response.createdDateTime,
          webUrl: response.webUrl
        });
      } catch (error) {
        results.push({
          target,
          success: false,
          error: error.message
        });
      }
    }

    return {
      success: true,
      data: results
    };
  }

  async getMessages(options?: PaginatedRequest): Promise<ConnectorResponse> {
    try {
      const channelId = options?.filters?.channelId;
      const teamId = options?.filters?.teamId;
      const chatId = options?.filters?.chatId;

      if (!channelId && !chatId) {
        throw new Error('Either channelId (with teamId) or chatId is required');
      }

      let endpoint: string;
      if (chatId) {
        endpoint = `${this.baseUrl}/chats/${chatId}/messages`;
      } else {
        endpoint = `${this.baseUrl}/teams/${teamId}/channels/${channelId}/messages`;
      }

      const params: any = {
        '$top': Math.min(options?.pageSize || 20, 50),
        '$skip': ((options?.page || 1) - 1) * (options?.pageSize || 20),
        '$orderby': 'createdDateTime desc'
      };

      if (options?.filters?.from) {
        params['$filter'] = `from/user/id eq '${options.filters.from}'`;
      }

      const response = await this.performRequest({
        method: 'GET',
        endpoint,
        headers: this.getAuthHeaders(),
        queryParams: params
      });

      return {
        success: true,
        data: {
          messages: response.value,
          nextLink: response['@odata.nextLink']
        },
        metadata: {
          timestamp: new Date(),
          pagination: {
            page: options?.page || 1,
            pageSize: options?.pageSize || 20,
            total: 0,
            hasNext: !!response['@odata.nextLink']
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
        endpoint: `${this.baseUrl}/users/${contactId}`,
        headers: this.getAuthHeaders()
      });

      return {
        success: true,
        data: response
      };
    } catch (error) {
      return this.handleError(error as any, 'Failed to get contact');
    }
  }

  async upsertContact(contact: any): Promise<ConnectorResponse> {
    // Microsoft Graph doesn't allow creating users via standard APIs
    // This requires admin privileges and different endpoints
    throw new Error('Creating users requires Azure AD admin privileges and is not supported through this connector');
  }

  // Teams-specific methods
  async createChannel(teamId: string, name: string, description?: string, membershipType: 'standard' | 'private' = 'standard'): Promise<ConnectorResponse> {
    try {
      const channelData: any = {
        displayName: name,
        description: description,
        membershipType: membershipType
      };

      const response = await this.performRequest({
        method: 'POST',
        endpoint: `${this.baseUrl}/teams/${teamId}/channels`,
        headers: {
          ...this.getAuthHeaders(),
          'Content-Type': 'application/json'
        },
        body: channelData
      });

      return {
        success: true,
        data: response
      };
    } catch (error) {
      return this.handleError(error as any, 'Failed to create channel');
    }
  }

  async createTeam(team: Partial<TeamsTeam>): Promise<ConnectorResponse> {
    try {
      const teamData: any = {
        'template@odata.bind': 'https://graph.microsoft.com/v1.0/teamsTemplates/standard',
        displayName: team.displayName,
        description: team.description,
        visibility: team.visibility || 'private',
        memberSettings: team.memberSettings || {
          allowCreateUpdateChannels: true,
          allowCreatePrivateChannels: true,
          allowDeleteChannels: false,
          allowAddRemoveApps: true,
          allowCreateUpdateRemoveTabs: true,
          allowCreateUpdateRemoveConnectors: true
        },
        guestSettings: team.guestSettings || {
          allowCreateUpdateChannels: false,
          allowDeleteChannels: false
        },
        messagingSettings: team.messagingSettings || {
          allowUserEditMessages: true,
          allowUserDeleteMessages: true,
          allowOwnerDeleteMessages: true,
          allowTeamMentions: true,
          allowChannelMentions: true
        },
        funSettings: team.funSettings || {
          allowGiphy: true,
          giphyContentRating: 'moderate',
          allowStickersAndMemes: true,
          allowCustomMemes: true
        }
      };

      const response = await this.performRequest({
        method: 'POST',
        endpoint: `${this.baseUrl}/teams`,
        headers: {
          ...this.getAuthHeaders(),
          'Content-Type': 'application/json'
        },
        body: teamData
      });

      return {
        success: true,
        data: response
      };
    } catch (error) {
      return this.handleError(error as any, 'Failed to create team');
    }
  }

  async manageMeetings(action: 'create' | 'update' | 'delete' | 'get', meeting: any): Promise<ConnectorResponse> {
    try {
      switch (action) {
        case 'create':
          return this.createMeeting(meeting);
        case 'update':
          return this.updateMeeting(meeting.id, meeting);
        case 'delete':
          return this.deleteMeeting(meeting.id);
        case 'get':
          return this.getMeeting(meeting.id);
        default:
          throw new Error(`Unknown meeting action: ${action}`);
      }
    } catch (error) {
      return this.handleError(error as any, `Failed to ${action} meeting`);
    }
  }

  async shareFiles(teamId: string, channelId: string, file: { name: string; content: Buffer; folder?: string }): Promise<ConnectorResponse> {
    try {
      // First, get the drive ID for the team
      const driveResponse = await this.performRequest({
        method: 'GET',
        endpoint: `${this.baseUrl}/teams/${teamId}/drive`,
        headers: this.getAuthHeaders()
      });

      // Upload file to the channel's files folder
      const folderPath = file.folder ? `/General/${file.folder}` : '/General';
      const uploadUrl = `${this.baseUrl}/drives/${driveResponse.id}/root:${folderPath}/${file.name}:/content`;

      const uploadResponse = await this.performRequest({
        method: 'PUT',
        endpoint: uploadUrl,
        headers: {
          ...this.getAuthHeaders(),
          'Content-Type': 'application/octet-stream'
        },
        body: file.content
      });

      // Create a message in the channel about the file
      const messageResponse = await this.sendMessage(`${teamId}/channels/${channelId}`, {
        content: `File shared: ${file.name}`,
        attachments: [{
          id: '1',
          contentType: 'reference',
          contentUrl: uploadResponse.webUrl,
          name: file.name
        }]
      });

      return {
        success: true,
        data: {
          file: uploadResponse,
          message: messageResponse.data?.[0]
        }
      };
    } catch (error) {
      return this.handleError(error as any, 'Failed to share file');
    }
  }

  async getTeams(options?: PaginatedRequest): Promise<ConnectorResponse> {
    try {
      const params: any = {
        '$top': Math.min(options?.pageSize || 20, 100),
        '$skip': ((options?.page || 1) - 1) * (options?.pageSize || 20)
      };

      const response = await this.performRequest({
        method: 'GET',
        endpoint: `${this.baseUrl}/me/joinedTeams`,
        headers: this.getAuthHeaders(),
        queryParams: params
      });

      return {
        success: true,
        data: {
          teams: response.value,
          nextLink: response['@odata.nextLink']
        },
        metadata: {
          timestamp: new Date(),
          pagination: {
            page: options?.page || 1,
            pageSize: options?.pageSize || 20,
            total: 0,
            hasNext: !!response['@odata.nextLink']
          }
        }
      };
    } catch (error) {
      return this.handleError(error as any, 'Failed to get teams');
    }
  }

  async getChannels(teamId: string): Promise<ConnectorResponse> {
    try {
      const response = await this.performRequest({
        method: 'GET',
        endpoint: `${this.baseUrl}/teams/${teamId}/channels`,
        headers: this.getAuthHeaders()
      });

      return {
        success: true,
        data: response.value
      };
    } catch (error) {
      return this.handleError(error as any, 'Failed to get channels');
    }
  }

  // Definition-aligned channel operations
  async getChannel(teamId: string, channelId: string): Promise<ConnectorResponse> {
    try {
      const response = await this.performRequest({
        method: 'GET',
        endpoint: `${this.baseUrl}/teams/${teamId}/channels/${channelId}`,
        headers: this.getAuthHeaders()
      });

      return {
        success: true,
        data: response
      };
    } catch (error) {
      return this.handleError(error as any, 'Failed to get channel');
    }
  }

  async updateChannel(teamId: string, channelId: string, displayName?: string, description?: string): Promise<ConnectorResponse> {
    try {
      const updateData: any = {};
      if (displayName) updateData.displayName = displayName;
      if (description !== undefined) updateData.description = description;

      const response = await this.performRequest({
        method: 'PATCH',
        endpoint: `${this.baseUrl}/teams/${teamId}/channels/${channelId}`,
        headers: {
          ...this.getAuthHeaders(),
          'Content-Type': 'application/json'
        },
        body: updateData
      });

      return {
        success: true,
        data: response
      };
    } catch (error) {
      return this.handleError(error as any, 'Failed to update channel');
    }
  }

  async deleteChannel(teamId: string, channelId: string): Promise<ConnectorResponse> {
    try {
      await this.performRequest({
        method: 'DELETE',
        endpoint: `${this.baseUrl}/teams/${teamId}/channels/${channelId}`,
        headers: this.getAuthHeaders()
      });

      return {
        success: true,
        data: { deleted: true, channelId }
      };
    } catch (error) {
      return this.handleError(error as any, 'Failed to delete channel');
    }
  }

  // Definition-aligned channel message operations
  async sendChannelMessage(teamId: string, channelId: string, content: string, contentType: 'text' | 'html' = 'text', replyToId?: string): Promise<ConnectorResponse> {
    try {
      const messageData: any = {
        body: {
          contentType,
          content
        }
      };

      let endpoint = `https://graph.microsoft.com/beta/teams/${teamId}/channels/${channelId}/messages`;
      if (replyToId) {
        endpoint = `https://graph.microsoft.com/beta/teams/${teamId}/channels/${channelId}/messages/${replyToId}/replies`;
      }

      const response = await this.performRequest({
        method: 'POST',
        endpoint,
        headers: {
          ...this.getAuthHeaders(),
          'Content-Type': 'application/json'
        },
        body: messageData
      });

      return {
        success: true,
        data: response
      };
    } catch (error) {
      return this.handleError(error as any, 'Failed to send channel message');
    }
  }

  async listChannelMessages(teamId: string, channelId: string, top: number = 50): Promise<ConnectorResponse> {
    try {
      const response = await this.performRequest({
        method: 'GET',
        endpoint: `https://graph.microsoft.com/beta/teams/${teamId}/channels/${channelId}/messages`,
        headers: this.getAuthHeaders(),
        queryParams: { '$top': Math.min(top, 50) }
      });

      return {
        success: true,
        data: {
          messages: response.value,
          nextLink: response['@odata.nextLink']
        }
      };
    } catch (error) {
      return this.handleError(error as any, 'Failed to list channel messages');
    }
  }

  // Definition-aligned chat message operations
  async sendChatMessage(chatId: string, content: string, contentType: 'text' | 'html' = 'text'): Promise<ConnectorResponse> {
    try {
      const messageData = {
        body: {
          contentType,
          content
        }
      };

      const response = await this.performRequest({
        method: 'POST',
        endpoint: `${this.baseUrl}/chats/${chatId}/messages`,
        headers: {
          ...this.getAuthHeaders(),
          'Content-Type': 'application/json'
        },
        body: messageData
      });

      return {
        success: true,
        data: response
      };
    } catch (error) {
      return this.handleError(error as any, 'Failed to send chat message');
    }
  }

  async getChatMessage(chatId: string, messageId: string): Promise<ConnectorResponse> {
    try {
      const response = await this.performRequest({
        method: 'GET',
        endpoint: `${this.baseUrl}/chats/${chatId}/messages/${messageId}`,
        headers: this.getAuthHeaders()
      });

      return {
        success: true,
        data: response
      };
    } catch (error) {
      return this.handleError(error as any, 'Failed to get chat message');
    }
  }

  async listChatMessages(chatId: string, top: number = 50): Promise<ConnectorResponse> {
    try {
      const response = await this.performRequest({
        method: 'GET',
        endpoint: `${this.baseUrl}/chats/${chatId}/messages`,
        headers: this.getAuthHeaders(),
        queryParams: { '$top': Math.min(top, 50) }
      });

      return {
        success: true,
        data: {
          messages: response.value,
          nextLink: response['@odata.nextLink']
        }
      };
    } catch (error) {
      return this.handleError(error as any, 'Failed to list chat messages');
    }
  }

  // Definition-aligned task operations (Microsoft Planner)
  async createTask(input: { planId: string; bucketId: string; title: string; dueDateTime?: string; percentComplete?: number; assignedTo?: string }): Promise<ConnectorResponse> {
    try {
      const taskData: any = {
        planId: input.planId,
        bucketId: input.bucketId,
        title: input.title
      };

      if (input.dueDateTime) taskData.dueDateTime = input.dueDateTime;
      if (input.percentComplete !== undefined) taskData.percentComplete = input.percentComplete;
      if (input.assignedTo) {
        taskData.assignments = {
          [input.assignedTo]: {
            '@odata.type': '#microsoft.graph.plannerAssignment',
            orderHint: ' !'
          }
        };
      }

      const response = await this.performRequest({
        method: 'POST',
        endpoint: `${this.baseUrl}/planner/tasks`,
        headers: {
          ...this.getAuthHeaders(),
          'Content-Type': 'application/json'
        },
        body: taskData
      });

      return {
        success: true,
        data: response
      };
    } catch (error) {
      return this.handleError(error as any, 'Failed to create task');
    }
  }

  async getTask(taskId: string): Promise<ConnectorResponse> {
    try {
      const response = await this.performRequest({
        method: 'GET',
        endpoint: `${this.baseUrl}/planner/tasks/${taskId}`,
        headers: this.getAuthHeaders()
      });

      return {
        success: true,
        data: response
      };
    } catch (error) {
      return this.handleError(error as any, 'Failed to get task');
    }
  }

  async listTasks(planId: string): Promise<ConnectorResponse> {
    try {
      const response = await this.performRequest({
        method: 'GET',
        endpoint: `${this.baseUrl}/planner/plans/${planId}/tasks`,
        headers: this.getAuthHeaders()
      });

      return {
        success: true,
        data: {
          tasks: response.value,
          nextLink: response['@odata.nextLink']
        }
      };
    } catch (error) {
      return this.handleError(error as any, 'Failed to list tasks');
    }
  }

  async updateTask(taskId: string, input: { title?: string; percentComplete?: number; dueDateTime?: string }): Promise<ConnectorResponse> {
    try {
      // First get the task to get its etag
      const taskResponse = await this.performRequest({
        method: 'GET',
        endpoint: `${this.baseUrl}/planner/tasks/${taskId}`,
        headers: this.getAuthHeaders()
      });

      const updateData: any = {};
      if (input.title) updateData.title = input.title;
      if (input.percentComplete !== undefined) updateData.percentComplete = input.percentComplete;
      if (input.dueDateTime) updateData.dueDateTime = input.dueDateTime;

      const response = await this.performRequest({
        method: 'PATCH',
        endpoint: `${this.baseUrl}/planner/tasks/${taskId}`,
        headers: {
          ...this.getAuthHeaders(),
          'Content-Type': 'application/json',
          'If-Match': taskResponse['@odata.etag']
        },
        body: updateData
      });

      return {
        success: true,
        data: response
      };
    } catch (error) {
      return this.handleError(error as any, 'Failed to update task');
    }
  }

  async deleteTask(taskId: string): Promise<ConnectorResponse> {
    try {
      // First get the task to get its etag
      const taskResponse = await this.performRequest({
        method: 'GET',
        endpoint: `${this.baseUrl}/planner/tasks/${taskId}`,
        headers: this.getAuthHeaders()
      });

      await this.performRequest({
        method: 'DELETE',
        endpoint: `${this.baseUrl}/planner/tasks/${taskId}`,
        headers: {
          ...this.getAuthHeaders(),
          'If-Match': taskResponse['@odata.etag']
        }
      });

      return {
        success: true,
        data: { deleted: true, taskId }
      };
    } catch (error) {
      return this.handleError(error as any, 'Failed to delete task');
    }
  }

  async getUsers(options?: PaginatedRequest): Promise<ConnectorResponse> {
    try {
      const params: any = {
        '$top': Math.min(options?.pageSize || 20, 100),
        '$skip': ((options?.page || 1) - 1) * (options?.pageSize || 20),
        '$select': 'id,displayName,givenName,surname,email,userPrincipalName,jobTitle'
      };

      if (options?.filters?.search) {
        params['$filter'] = `startsWith(displayName,'${options.filters.search}') or startsWith(givenName,'${options.filters.search}') or startsWith(surname,'${options.filters.search}')`;
      }

      const response = await this.performRequest({
        method: 'GET',
        endpoint: `${this.baseUrl}/users`,
        headers: this.getAuthHeaders(),
        queryParams: params
      });

      return {
        success: true,
        data: {
          users: response.value,
          nextLink: response['@odata.nextLink']
        },
        metadata: {
          timestamp: new Date(),
          pagination: {
            page: options?.page || 1,
            pageSize: options?.pageSize || 20,
            total: 0,
            hasNext: !!response['@odata.nextLink']
          }
        }
      };
    } catch (error) {
      return this.handleError(error as any, 'Failed to get users');
    }
  }

  private async createMeeting(meeting: Partial<TeamsMeeting>): Promise<ConnectorResponse> {
    const meetingData: any = {
      startDateTime: meeting.startDateTime,
      endDateTime: meeting.endDateTime,
      subject: meeting.subject
    };

    if (meeting.participants) {
      meetingData.participants = meeting.participants;
    }

    const response = await this.performRequest({
      method: 'POST',
      endpoint: `${this.baseUrl}/me/onlineMeetings`,
      headers: {
        ...this.getAuthHeaders(),
        'Content-Type': 'application/json'
      },
      body: meetingData
    });

    return {
      success: true,
      data: response
    };
  }

  private async updateMeeting(meetingId: string, updates: any): Promise<ConnectorResponse> {
    const response = await this.performRequest({
      method: 'PATCH',
      endpoint: `${this.baseUrl}/me/onlineMeetings/${meetingId}`,
      headers: {
        ...this.getAuthHeaders(),
        'Content-Type': 'application/json'
      },
      body: updates
    });

    return {
      success: true,
      data: response
    };
  }

  private async deleteMeeting(meetingId: string): Promise<ConnectorResponse> {
    await this.performRequest({
      method: 'DELETE',
      endpoint: `${this.baseUrl}/me/onlineMeetings/${meetingId}`,
      headers: this.getAuthHeaders()
    });

    return {
      success: true,
      data: { deleted: true, meetingId }
    };
  }

  private async getMeeting(meetingId: string): Promise<ConnectorResponse> {
    const response = await this.performRequest({
      method: 'GET',
      endpoint: `${this.baseUrl}/me/onlineMeetings/${meetingId}`,
      headers: this.getAuthHeaders()
    });

    return {
      success: true,
      data: response
    };
  }

  async refreshTokens(): Promise<OAuthTokens> {
    try {
      const refreshToken = this.config.credentials.refreshToken;
      if (!refreshToken) {
        throw new Error('No refresh token available');
      }

      const clientId = this.config.credentials.clientId;
      const clientSecret = this.config.credentials.clientSecret;
      if (!clientId || !clientSecret) {
        throw new Error('Client ID and Secret are required for token refresh');
      }

      const tokenResponse = await this.apiUtils.executeRequest({
        method: 'POST',
        endpoint: 'https://login.microsoftonline.com/common/oauth2/v2.0/token',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded'
        },
        body: new URLSearchParams({
          client_id: clientId,
          client_secret: clientSecret,
          refresh_token: refreshToken,
          grant_type: 'refresh_token',
          scope: this.getMetadata().requiredScopes?.join(' ') || ''
        }).toString()
      });

      if (!tokenResponse.success) {
        throw new Error('Failed to refresh OAuth token');
      }

      const tokens: OAuthTokens = {
        accessToken: tokenResponse.data.access_token,
        refreshToken: tokenResponse.data.refresh_token || refreshToken,
        expiresAt: new Date(Date.now() + (tokenResponse.data.expires_in * 1000)),
        scope: tokenResponse.data.scope,
        tokenType: tokenResponse.data.token_type
      };

      // Update stored credentials
      this.config.credentials.accessToken = tokens.accessToken;
      this.config.credentials.refreshToken = tokens.refreshToken;

      return tokens;
    } catch (error) {
      throw new Error(`Failed to refresh tokens: ${error.message}`);
    }
  }

  private getAuthHeaders(): Record<string, string> {
    return this.authUtils.createAuthHeaders(AuthType.BEARER_TOKEN, this.config.credentials);
  }

  private getActions(): ConnectorAction[] {
    return [
      {
        id: 'send_message',
        name: 'Send Message',
        description: 'Send a message to a Teams channel or chat',
        inputSchema: {
          channelId: { type: 'string', description: 'Channel ID (use with teamId)' },
          chatId: { type: 'string', description: 'Chat ID (alternative to channelId)' },
          teamId: { type: 'string', description: 'Team ID (required with channelId)' },
          message: {
            type: 'object',
            required: true,
            description: 'Message content with text, HTML, attachments, or mentions'
          }
        },
        outputSchema: {
          success: { type: 'boolean', description: 'Whether the message was sent successfully' },
          messageId: { type: 'string', description: 'Unique message identifier' },
          webUrl: { type: 'string', description: 'Web URL to view the message' }
        }
      },
      {
        id: 'create_channel',
        name: 'Create Channel',
        description: 'Create a new channel in a Teams team',
        inputSchema: {
          teamId: { type: 'string', required: true, description: 'Team ID' },
          name: { type: 'string', required: true, description: 'Channel name' },
          description: { type: 'string', description: 'Channel description' },
          membershipType: { type: 'string', enum: ['standard', 'private'], description: 'Channel membership type' }
        },
        outputSchema: {
          channel: { type: 'object', description: 'Created channel information' }
        }
      },
      {
        id: 'create_team',
        name: 'Create Team',
        description: 'Create a new Microsoft Teams team',
        inputSchema: {
          team: {
            type: 'object',
            required: true,
            description: 'Team configuration with displayName, description, and settings'
          }
,          outputSchema: {}
        },
        outputSchema: {
          team: { type: 'object', description: 'Created team information' }
        }
      },
      {
        id: 'manage_meetings',
        name: 'Manage Meetings',
        description: 'Create, update, delete, or get Teams meetings',
        inputSchema: {
          action: { type: 'string', required: true, enum: ['create', 'update', 'delete', 'get'], description: 'Action to perform' },
          meeting: { type: 'object', required: true, description: 'Meeting data or meeting ID' }
        },
        outputSchema: {
          meeting: { type: 'object', description: 'Meeting information' },
          joinWebUrl: { type: 'string', description: 'Join URL for the meeting' }
        }
      },
      {
        id: 'share_files',
        name: 'Share Files',
        description: 'Upload and share files in a Teams channel',
        inputSchema: {
          teamId: { type: 'string', required: true, description: 'Team ID' },
          channelId: { type: 'string', required: true, description: 'Channel ID' },
          file: { type: 'object', required: true, description: 'File data with name, content, and optional folder' }
        },
        outputSchema: {
          file: { type: 'object', description: 'Uploaded file information' },
          message: { type: 'object', description: 'Message about the shared file' }
        }
      },
      {
        id: 'get_teams',
        name: 'Get Teams',
        description: 'Get list of Teams that the user is a member of',
        inputSchema: {
          options: {
            type: 'object',
            description: 'Pagination and filtering options'
          }
,          outputSchema: {}
        },
        outputSchema: {
          teams: { type: 'array', description: 'List of teams' }
        }
      },
      {
        id: 'get_channels',
        name: 'Get Channels',
        description: 'Get channels in a team',
        inputSchema: {
          teamId: { type: 'string', required: true, description: 'Team ID' }
        },
        outputSchema: {
          channels: { type: 'array', description: 'List of channels' }
        }
      }
    ];
  }

  private getTriggers(): ConnectorTrigger[] {
    return [
      // Definition-aligned trigger IDs
      {
        id: 'new_channel',
        name: 'New Channel',
        description: 'Triggered when a new channel is created in a team',
        eventType: 'channel.created',
        outputSchema: {
          id: { type: 'string', description: 'Channel ID' },
          displayName: { type: 'string', description: 'Channel name' },
          description: { type: 'string', description: 'Channel description' },
          createdDateTime: { type: 'string', description: 'Creation timestamp' }
        },
        webhookRequired: true,
        pollingEnabled: false
      },
      {
        id: 'new_channel_message',
        name: 'New Channel Message',
        description: 'Triggered when a new message is posted to a channel',
        eventType: 'channelMessage.created',
        outputSchema: {
          id: { type: 'string', description: 'Message ID' },
          from: { type: 'object', description: 'Sender information' },
          body: { type: 'object', description: 'Message content' },
          createdDateTime: { type: 'string', description: 'Timestamp' }
        },
        webhookRequired: true,
        pollingEnabled: false
      },
      {
        id: 'new_chat_message',
        name: 'New Chat Message',
        description: 'Triggered when a new direct/chat message is received',
        eventType: 'chatMessage.created',
        outputSchema: {
          id: { type: 'string', description: 'Message ID' },
          chatId: { type: 'string', description: 'Chat ID' },
          from: { type: 'object', description: 'Sender information' },
          body: { type: 'object', description: 'Message content' },
          createdDateTime: { type: 'string', description: 'Timestamp' }
        },
        webhookRequired: true,
        pollingEnabled: false
      },
      {
        id: 'new_team_member',
        name: 'New Team Member',
        description: 'Triggered when a new member joins a team',
        eventType: 'teamMember.added',
        outputSchema: {
          id: { type: 'string', description: 'Member ID' },
          displayName: { type: 'string', description: 'Member name' },
          email: { type: 'string', description: 'Member email' },
          roles: { type: 'array', description: 'Member roles' }
        },
        webhookRequired: true,
        pollingEnabled: false
      }
    ];
  }
}