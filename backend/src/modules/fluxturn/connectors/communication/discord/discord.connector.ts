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

// Discord-specific interfaces
export interface DiscordMessage {
  id: string;
  type: number;
  content: string;
  channel_id: string;
  author: {
    id: string;
    username: string;
    avatar: string;
    discriminator: string;
    bot?: boolean;
  };
  attachments: Array<{
    id: string;
    filename: string;
    size: number;
    url: string;
    proxy_url: string;
    content_type?: string;
  }>;
  embeds: DiscordEmbed[];
  mentions: any[];
  mention_roles: string[];
  pinned: boolean;
  mention_everyone: boolean;
  tts: boolean;
  timestamp: string;
  edited_timestamp?: string;
  flags?: number;
  components?: any[];
  thread?: any;
}

export interface DiscordEmbed {
  title?: string;
  type?: string;
  description?: string;
  url?: string;
  timestamp?: string;
  color?: number;
  footer?: {
    text: string;
    icon_url?: string;
    proxy_icon_url?: string;
  };
  image?: {
    url: string;
    proxy_url?: string;
    height?: number;
    width?: number;
  };
  thumbnail?: {
    url: string;
    proxy_url?: string;
    height?: number;
    width?: number;
  };
  author?: {
    name: string;
    url?: string;
    icon_url?: string;
    proxy_icon_url?: string;
  };
  fields?: Array<{
    name: string;
    value: string;
    inline?: boolean;
  }>;
}

export interface DiscordChannel {
  id: string;
  type: number;
  guild_id?: string;
  position?: number;
  permission_overwrites?: any[];
  name?: string;
  topic?: string;
  nsfw?: boolean;
  last_message_id?: string;
  bitrate?: number;
  user_limit?: number;
  rate_limit_per_user?: number;
  recipients?: any[];
  icon?: string;
  owner_id?: string;
  application_id?: string;
  parent_id?: string;
  last_pin_timestamp?: string;
  rtc_region?: string;
  video_quality_mode?: number;
  message_count?: number;
  member_count?: number;
  thread_metadata?: any;
  member?: any;
  default_auto_archive_duration?: number;
  permissions?: string;
}

export interface DiscordGuild {
  id: string;
  name: string;
  icon?: string;
  icon_hash?: string;
  splash?: string;
  discovery_splash?: string;
  owner?: boolean;
  owner_id: string;
  permissions?: string;
  region?: string;
  afk_channel_id?: string;
  afk_timeout: number;
  widget_enabled?: boolean;
  widget_channel_id?: string;
  verification_level: number;
  default_message_notifications: number;
  explicit_content_filter: number;
  roles: DiscordRole[];
  emojis: any[];
  features: string[];
  mfa_level: number;
  application_id?: string;
  system_channel_id?: string;
  system_channel_flags: number;
  rules_channel_id?: string;
  joined_at?: string;
  large?: boolean;
  unavailable?: boolean;
  member_count?: number;
  voice_states?: any[];
  members?: any[];
  channels?: DiscordChannel[];
  threads?: any[];
  presences?: any[];
  max_presences?: number;
  max_members?: number;
  vanity_url_code?: string;
  description?: string;
  banner?: string;
  premium_tier: number;
  premium_subscription_count?: number;
  preferred_locale: string;
  public_updates_channel_id?: string;
  max_video_channel_users?: number;
  approximate_member_count?: number;
  approximate_presence_count?: number;
  welcome_screen?: any;
  nsfw_level: number;
  stage_instances?: any[];
  stickers?: any[];
  guild_scheduled_events?: any[];
  premium_progress_bar_enabled: boolean;
}

export interface DiscordRole {
  id: string;
  name: string;
  color: number;
  hoist: boolean;
  icon?: string;
  unicode_emoji?: string;
  position: number;
  permissions: string;
  managed: boolean;
  mentionable: boolean;
  tags?: {
    bot_id?: string;
    integration_id?: string;
    premium_subscriber?: null;
  };
}

export interface DiscordUser {
  id: string;
  username: string;
  discriminator: string;
  avatar?: string;
  bot?: boolean;
  system?: boolean;
  mfa_enabled?: boolean;
  banner?: string;
  accent_color?: number;
  locale?: string;
  verified?: boolean;
  email?: string;
  flags?: number;
  premium_type?: number;
  public_flags?: number;
}

export interface DiscordSendMessageRequest {
  content?: string;
  tts?: boolean;
  embeds?: DiscordEmbed[];
  allowed_mentions?: {
    parse?: string[];
    roles?: string[];
    users?: string[];
    replied_user?: boolean;
  };
  message_reference?: {
    message_id: string;
    channel_id?: string;
    guild_id?: string;
    fail_if_not_exists?: boolean;
  };
  components?: any[];
  sticker_ids?: string[];
  attachments?: Array<{
    id: number;
    description?: string;
    filename: string;
  }>;
  flags?: number;
}

@Injectable()
export class DiscordConnector extends BaseConnector implements ICommunicationConnector {
  private baseUrl = 'https://discord.com/api/v10';
  
  constructor(
    private readonly authUtils: AuthUtils,
    private readonly apiUtils: ApiUtils
  ) {
    super();
  }

  getMetadata(): ConnectorMetadata {
    return {
      name: 'Discord',
      description: 'Discord communication platform connector',
      version: '1.0.0',
      category: ConnectorCategory.COMMUNICATION,
      type: ConnectorType.CHAT,
      logoUrl: 'https://discord.com/assets/f9bb9c4af2b9c32a2c5ee0014661546d.png',
      documentationUrl: 'https://discord.com/developers/docs',
      authType: AuthType.BEARER_TOKEN,
      requiredScopes: [
        'bot',
        'messages.read',
        'messages.write',
        'guilds.read',
        'channels.read'
      ],
      actions: this.getActions(),
      triggers: this.getTriggers(),
      rateLimit: {
        requestsPerSecond: 5,
        requestsPerMinute: 300,
        requestsPerHour: 18000
      },
      webhookSupport: true
    };
  }

  protected async initializeConnection(): Promise<void> {
    const credentials = this.config.credentials;
    const configAuthType = (this.config as any).config?.authType;
    const settingsAuthType = this.config.settings?.connectionType || this.config.settings?.authType;
    const credentialsAuthType = credentials.authType;
    
    const authType = credentialsAuthType || configAuthType || settingsAuthType || 'bot_token';
    
    this.logger.log('Discord init - authType determination:', {
      credentialsAuthType,
      configAuthType,
      settingsAuthType,
      finalAuthType: authType,
      configKeys: Object.keys(this.config),
      configData: (this.config as any).config
    });
    
    if (authType === 'webhook') {
      // For webhooks, just validate the URL
      const webhookUrl = credentials.webhookUrl || credentials.webhook_url || credentials.webhook;
      this.logger.log('Looking for webhook URL in:', {
        webhookUrl: credentials.webhookUrl,
        webhook_url: credentials.webhook_url,
        webhook: credentials.webhook,
        allKeys: Object.keys(credentials)
      });
      
      if (!webhookUrl) {
        this.logger.error('Webhook credentials full object:', JSON.stringify(credentials));
        throw new Error('Webhook URL is required');
      }
      
      // Clean up webhook URL in case user copied extra text
      const cleanedUrl = webhookUrl.trim();
      
      // Check if URL contains Discord webhook pattern
      if (!cleanedUrl.includes('discord.com/api/webhooks/')) {
        this.logger.error('Invalid webhook URL:', cleanedUrl);
        
        // Check for common mistakes
        if (cleanedUrl.includes('http://localhost') || cleanedUrl.includes('[Nest]')) {
          throw new Error('Invalid webhook URL. Please enter only the Discord webhook URL (e.g., https://discord.com/api/webhooks/...)');
        }
        
        throw new Error('Invalid Discord webhook URL format. Expected format: https://discord.com/api/webhooks/ID/TOKEN');
      }
      
      this.logger.log(`Discord webhook initialized: ${webhookUrl.split('/').slice(0, -1).join('/')}/...`);
    } else if (authType === 'oauth2') {
      // For OAuth2, check if we have access token
      const botToken = credentials.botTokenOAuth || credentials.botToken || credentials.bot_token;
      const accessToken = credentials.accessToken || credentials.access_token;
      
      // If no tokens yet, this is likely during OAuth setup
      if (!botToken && !accessToken) {
        this.logger.log('OAuth2 init - no tokens yet, assuming initial setup');
        // Just validate that we have the required OAuth config
        const clientId = (this.config as any).config?.client_id || (this.config as any).config?.clientId;
        const clientSecret = credentials.client_secret || credentials.clientSecret;
        
        if (!clientId || !clientSecret) {
          throw new Error('Client ID and Client Secret are required for Discord OAuth2');
        }
        
        this.logger.log('Discord OAuth2 initialized - awaiting OAuth flow completion');
        return;
      }
      
      // If we have tokens, test the connection
      const response = await this.performRequest({
        method: 'GET',
        endpoint: `${this.baseUrl}/users/@me`,
        headers: this.getAuthHeaders()
      });

      if (!response.id) {
        throw new Error('Failed to initialize Discord connection');
      }

      this.logger.log(`Discord OAuth2 initialized: ${response.username}#${response.discriminator}`);
    } else {
      // Test connection by getting bot user info
      const response = await this.performRequest({
        method: 'GET',
        endpoint: `${this.baseUrl}/users/@me`,
        headers: this.getAuthHeaders()
      });

      if (!response.id) {
        throw new Error('Failed to initialize Discord connection');
      }

      this.logger.log(`Discord bot initialized: ${response.username}#${response.discriminator}`);
    }
  }

  protected async performConnectionTest(): Promise<boolean> {
    try {
      const credentials = this.config.credentials;
      const configAuthType = (this.config as any).config?.authType;
      const settingsAuthType = this.config.settings?.connectionType || this.config.settings?.authType;
      const credentialsAuthType = credentials.authType;
      
      const authType = credentialsAuthType || configAuthType || settingsAuthType || 'bot_token';
      
      this.logger.log('Connection test - authType determination:', {
        credentialsAuthType,
        configAuthType,
        settingsAuthType,
        finalAuthType: authType
      });
      
      if (authType === 'webhook') {
        // For webhooks, just validate the URL format
        const webhookUrl = credentials.webhookUrl || credentials.webhook_url || credentials.webhook;
        if (!webhookUrl) {
          this.logger.error('Webhook test - credentials:', JSON.stringify(credentials));
          throw new Error('Webhook URL is required');
        }
        
        // Clean up webhook URL in case user copied extra text
        const cleanedUrl = webhookUrl.trim();
        
        // Basic URL validation
        if (!cleanedUrl.includes('discord.com/api/webhooks/')) {
          this.logger.error('Invalid webhook URL in test:', cleanedUrl);
          
          // Check for common mistakes
          if (cleanedUrl.includes('http://localhost') || cleanedUrl.includes('[Nest]')) {
            throw new Error('Invalid webhook URL. Please enter only the Discord webhook URL (e.g., https://discord.com/api/webhooks/...)');
          }
          
          throw new Error('Invalid Discord webhook URL format. Expected format: https://discord.com/api/webhooks/ID/TOKEN');
        }
        
        // Optionally, we could send a test message to verify the webhook
        // But for now, just return true if URL is valid
        return true;
      } else if (authType === 'oauth2') {
        // For OAuth2, check if we have access token
        const botToken = credentials.botTokenOAuth || credentials.botToken || credentials.bot_token;
        const accessToken = credentials.accessToken || credentials.access_token;
        
        // If no tokens yet, this is likely during OAuth setup - just validate config
        if (!botToken && !accessToken) {
          this.logger.log('OAuth2 connection test - no tokens yet, assuming initial setup');
          // Just validate that we have the required OAuth config
          const clientId = (this.config as any).config?.client_id || (this.config as any).config?.clientId;
          const clientSecret = credentials.client_secret || credentials.clientSecret;
          
          if (!clientId || !clientSecret) {
            throw new Error('Client ID and Client Secret are required for Discord OAuth2');
          }
          
          // Return true to indicate config is valid (OAuth flow not yet completed)
          return true;
        }
        
        // If we have tokens, test the connection
        const response = await this.performRequest({
          method: 'GET',
          endpoint: `${this.baseUrl}/users/@me`,
          headers: this.getAuthHeaders()
        });
        return !!response.id;
      } else {
        // For bot token, test by getting current user info
        const response = await this.performRequest({
          method: 'GET',
          endpoint: `${this.baseUrl}/users/@me`,
          headers: this.getAuthHeaders()
        });
        return !!response.id;
      }
    } catch (error) {
      this.logger.error('Connection test failed:', error);
      return false;
    }
  }

  protected async performHealthCheck(): Promise<void> {
    const response = await this.performRequest({
      method: 'GET',
      endpoint: `${this.baseUrl}/users/@me/guilds`,
      headers: this.getAuthHeaders(),
      queryParams: { limit: 1 }
    });

    if (!Array.isArray(response)) {
      throw new Error('Discord health check failed');
    }
  }

  protected async performRequest(request: ConnectorRequest): Promise<any> {
    const response = await this.apiUtils.executeRequest(request, {
      timeout: 15000,
      retries: 3
    });

    if (!response.success) {
      throw new Error(response.error?.message || 'Discord API request failed');
    }

    return response.data;
  }

  protected async performAction(actionId: string, input: any): Promise<any> {
    // Check if this is a webhook connection
    const credentials = this.config.credentials;
    const configAuthType = (this.config as any).config?.authType;
    const settingsAuthType = this.config.settings?.connectionType || this.config.settings?.authType;
    const credentialsAuthType = credentials.authType;
    const authType = credentialsAuthType || configAuthType || settingsAuthType || 'bot_token';
    
    switch (actionId) {
      case 'send_message':
      case 'message_send': // Support both naming conventions
        // For webhooks, we don't need channelId
        if (authType === 'webhook') {
          return this.sendWebhookMessage(input);
        }
        return this.sendMessage(input.channelId, input.message || input);
      case 'create_channel':
      case 'channel_create': // Support both naming conventions
        return this.createChannel(input.guildId, input.name, input.type, input);
      case 'upload_file':
        return this.uploadFile(input.channelId, input.file, input.message);
      case 'get_user_info':
        return this.getUserInfo(input.userId);
      case 'create_invite':
        return this.createInvite(input.channelId, input.options);
      case 'manage_roles':
        return this.manageRoles(input.guildId, input.userId, input.roleIds, input.action);
      case 'get_messages':
        return this.getMessages({ filters: { channelId: input.channelId }, ...input.options });
      case 'get_guilds':
        return this.getGuilds();
      case 'get_channels':
        return this.getChannels(input.guildId);
      default:
        throw new Error(`Unknown action: ${actionId}`);
    }
  }

  protected async cleanup(): Promise<void> {
    this.logger.log('Discord connector cleanup completed');
  }

  // ICommunicationConnector implementation
  async sendMessage(to: string | string[], message: any): Promise<ConnectorResponse> {
    // Check if using OAuth2 without bot token (bot operations require bot token)
    const credentials = this.config.credentials;
    const configAuthType = (this.config as any).config?.authType;
    const settingsAuthType = this.config.settings?.connectionType || this.config.settings?.authType;
    const credentialsAuthType = credentials.authType;
    const authType = credentialsAuthType || configAuthType || settingsAuthType || 'bot_token';

    if (authType === 'oauth2') {
      const botToken = credentials.botTokenOAuth || credentials.botToken || credentials.bot_token;
      if (!botToken) {
        return {
          success: false,
          error: {
            code: 'MISSING_BOT_TOKEN',
            message: 'Sending messages requires a bot token. Discord OAuth2 provides a user access token which cannot perform bot operations. Please add your bot token from Discord Developer Portal (Bot section) to your credential configuration.',
            details: {
              hint: 'Go to https://discord.com/developers/applications → Select your app → Bot → Copy token',
              requiredField: 'Bot Token (optional field in OAuth2 credentials)'
            }
          }
        };
      }
    }

    const channelIds = Array.isArray(to) ? to : [to];
    const results: any[] = [];

    for (const channelId of channelIds) {
      try {
        const discordMessage: DiscordSendMessageRequest = {
          content: message.content || message.text,
          embeds: Array.isArray(message.embeds) ? message.embeds : undefined,
          tts: message.tts || false,
          allowed_mentions: message.allowedMentions,
          message_reference: message.replyTo ? {
            message_id: message.replyTo,
            channel_id: channelId,
            fail_if_not_exists: false
          } : undefined,
          components: message.components,
          sticker_ids: message.stickerIds
        };

        const response = await this.performRequest({
          method: 'POST',
          endpoint: `${this.baseUrl}/channels/${channelId}/messages`,
          headers: {
            ...this.getAuthHeaders(),
            'Content-Type': 'application/json'
          },
          body: discordMessage
        });

        results.push({
          channelId,
          success: true,
          messageId: response.id,
          timestamp: response.timestamp
        });
      } catch (error) {
        results.push({
          channelId,
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
      if (!channelId) {
        throw new Error('Channel ID is required');
      }

      const params: any = {
        limit: Math.min(options?.pageSize || 50, 100),
        before: options?.filters?.before,
        after: options?.filters?.after,
        around: options?.filters?.around
      };

      // Remove undefined values
      Object.keys(params).forEach(key => {
        if (params[key] === undefined) {
          delete params[key];
        }
      });

      const response = await this.performRequest({
        method: 'GET',
        endpoint: `${this.baseUrl}/channels/${channelId}/messages`,
        headers: this.getAuthHeaders(),
        queryParams: params
      });

      return {
        success: true,
        data: {
          messages: response,
          channelId
        },
        metadata: {
          timestamp: new Date(),
          pagination: {
            page: 1,
            pageSize: params.limit,
            hasNext: response.length === params.limit,
            total: 0
          }
        }
      };
    } catch (error) {
      return this.handleError(error as any, 'Failed to get messages');
    }
  }

  async getContact(contactId: string): Promise<ConnectorResponse> {
    return this.getUserInfo(contactId);
  }

  async upsertContact(contact: any): Promise<ConnectorResponse> {
    // Discord doesn't allow creating users via bot API
    throw new Error('Creating users is not supported by Discord Bot API');
  }

  // Discord-specific methods
  async createChannel(guildId: string, name: string, type: number | string = 0, optionsOrInput?: any): Promise<ConnectorResponse> {
    try {
      // Check if using OAuth2 without bot token (bot operations require bot token)
      const credentials = this.config.credentials;
      const configAuthType = (this.config as any).config?.authType;
      const settingsAuthType = this.config.settings?.connectionType || this.config.settings?.authType;
      const credentialsAuthType = credentials.authType;
      const authType = credentialsAuthType || configAuthType || settingsAuthType || 'bot_token';

      if (authType === 'oauth2') {
        const botToken = credentials.botTokenOAuth || credentials.botToken || credentials.bot_token;
        if (!botToken) {
          return {
            success: false,
            error: {
              code: 'MISSING_BOT_TOKEN',
              message: 'Creating channels requires a bot token. Discord OAuth2 provides a user access token which cannot perform bot operations. Please add your bot token from Discord Developer Portal (Bot section) to your credential configuration.',
              details: {
                hint: 'Go to https://discord.com/developers/applications → Select your app → Bot → Copy token',
                requiredField: 'Bot Token (optional field in OAuth2 credentials)'
              }
            }
          };
        }
      }

      // Handle both old format (separate options) and new format (all in input)
      const options = optionsOrInput?.topic !== undefined ? optionsOrInput : (optionsOrInput || {});

      const channelData: any = {
        name,
        type: parseInt(String(type), 10), // Ensure type is a number
        topic: options.topic,
        bitrate: options.bitrate,
        user_limit: options.userLimit || options.user_limit,
        rate_limit_per_user: options.rateLimitPerUser || options.rate_limit_per_user,
        position: options.position,
        permission_overwrites: options.permissionOverwrites || options.permission_overwrites,
        parent_id: options.parentId || options.parent_id,
        nsfw: options.nsfw || false
      };

      // Remove undefined values
      Object.keys(channelData).forEach(key => {
        if (channelData[key] === undefined) {
          delete channelData[key];
        }
      });

      const response = await this.performRequest({
        method: 'POST',
        endpoint: `${this.baseUrl}/guilds/${guildId}/channels`,
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
      // Check if it's a 401 error with OAuth2 (likely missing bot token)
      const credentials = this.config.credentials;
      const configAuthType = (this.config as any).config?.authType;
      const settingsAuthType = this.config.settings?.connectionType || this.config.settings?.authType;
      const credentialsAuthType = credentials.authType;
      const authType = credentialsAuthType || configAuthType || settingsAuthType || 'bot_token';

      if (authType === 'oauth2' && error.message?.includes('401')) {
        const botToken = credentials.botTokenOAuth || credentials.botToken || credentials.bot_token;
        if (!botToken) {
          return {
            success: false,
            error: {
              code: 'MISSING_BOT_TOKEN',
              message: 'Creating channels requires a bot token. Discord OAuth2 provides a user access token which cannot perform bot operations. Please add your bot token from Discord Developer Portal (Bot section) to your credential configuration.',
              details: {
                hint: 'Go to https://discord.com/developers/applications → Select your app → Bot → Copy token',
                requiredField: 'Bot Token (optional field in OAuth2 credentials)'
              }
            }
          };
        }
      }

      return this.handleError(error as any, 'Failed to create channel');
    }
  }

  async uploadFile(channelId: string, file: { name: string; data: Buffer; contentType?: string }, message?: any): Promise<ConnectorResponse> {
    try {
      // Discord uses form-data for file uploads
      const formData = new FormData();
      
      // Add file
      const blob = new Blob([file.data as any], { type: file.contentType || 'application/octet-stream' });
      formData.append('files[0]', blob, file.name);

      // Add message payload
      const payload: any = {};
      if (message?.content) payload.content = message.content;
      if (message?.embeds) payload.embeds = message.embeds;
      if (message?.tts) payload.tts = message.tts;

      payload.attachments = [{
        id: 0,
        description: message?.description,
        filename: file.name
      }];

      formData.append('payload_json', JSON.stringify(payload));

      const response = await this.performRequest({
        method: 'POST',
        endpoint: `${this.baseUrl}/channels/${channelId}/messages`,
        headers: {
          ...this.getAuthHeaders(),
          // Don't set Content-Type for FormData - let browser set boundary
        },
        body: formData
      });

      return {
        success: true,
        data: {
          messageId: response.id,
          attachments: response.attachments
        }
      };
    } catch (error) {
      return this.handleError(error as any, 'Failed to upload file');
    }
  }

  async getUserInfo(userId: string): Promise<ConnectorResponse> {
    try {
      const response = await this.performRequest({
        method: 'GET',
        endpoint: `${this.baseUrl}/users/${userId}`,
        headers: this.getAuthHeaders()
      });

      return {
        success: true,
        data: response
      };
    } catch (error) {
      return this.handleError(error as any, 'Failed to get user info');
    }
  }

  async createInvite(channelId: string, options?: any): Promise<ConnectorResponse> {
    try {
      const inviteData: any = {
        max_age: options?.maxAge || 86400, // 24 hours default
        max_uses: options?.maxUses || 0, // unlimited default
        temporary: options?.temporary || false,
        unique: options?.unique || false,
        target_type: options?.targetType,
        target_user_id: options?.targetUserId,
        target_application_id: options?.targetApplicationId
      };

      // Remove undefined values
      Object.keys(inviteData).forEach(key => {
        if (inviteData[key] === undefined) {
          delete inviteData[key];
        }
      });

      const response = await this.performRequest({
        method: 'POST',
        endpoint: `${this.baseUrl}/channels/${channelId}/invites`,
        headers: {
          ...this.getAuthHeaders(),
          'Content-Type': 'application/json'
        },
        body: inviteData
      });

      return {
        success: true,
        data: {
          inviteCode: response.code,
          inviteUrl: `https://discord.gg/${response.code}`,
          ...response
        }
      };
    } catch (error) {
      return this.handleError(error as any, 'Failed to create invite');
    }
  }

  async manageRoles(guildId: string, userId: string, roleIds: string[], action: 'add' | 'remove'): Promise<ConnectorResponse> {
    try {
      const results: any[] = [];

      for (const roleId of roleIds) {
        try {
          const endpoint = action === 'add' 
            ? `${this.baseUrl}/guilds/${guildId}/members/${userId}/roles/${roleId}`
            : `${this.baseUrl}/guilds/${guildId}/members/${userId}/roles/${roleId}`;

          await this.performRequest({
            method: action === 'add' ? 'PUT' : 'DELETE',
            endpoint,
            headers: this.getAuthHeaders()
          });

          results.push({
            roleId,
            action,
            success: true
          });
        } catch (error) {
          results.push({
            roleId,
            action,
            success: false,
            error: error.message
          });
        }
      }

      return {
        success: true,
        data: results
      };
    } catch (error) {
      return this.handleError(error as any, 'Failed to manage roles');
    }
  }

  async getGuilds(): Promise<ConnectorResponse> {
    try {
      const response = await this.performRequest({
        method: 'GET',
        endpoint: `${this.baseUrl}/users/@me/guilds`,
        headers: this.getAuthHeaders(),
        queryParams: { limit: 200 }
      });

      return {
        success: true,
        data: response
      };
    } catch (error) {
      return this.handleError(error as any, 'Failed to get guilds');
    }
  }

  async getChannels(guildId: string): Promise<ConnectorResponse> {
    try {
      const response = await this.performRequest({
        method: 'GET',
        endpoint: `${this.baseUrl}/guilds/${guildId}/channels`,
        headers: this.getAuthHeaders()
      });

      return {
        success: true,
        data: response
      };
    } catch (error) {
      return this.handleError(error as any, 'Failed to get channels');
    }
  }

  async sendWebhookMessage(input: any): Promise<ConnectorResponse> {
    try {
      const credentials = this.config.credentials;
      const webhookUrl = credentials.webhookUrl || credentials.webhook_url || credentials.webhook;
      
      if (!webhookUrl) {
        throw new Error('Webhook URL not found in credentials');
      }

      // Extract message content from input
      const message = input.message || input;
      
      // Discord webhook message structure
      const webhookMessage: any = {
        content: message.content || message.text || input.content || '',
        username: message.username || 'FluxTurn Bot',
        avatar_url: message.avatarUrl,
        tts: message.tts || input.tts || false,
        allowed_mentions: message.allowedMentions || {
          parse: ['users', 'roles', 'everyone']
        }
      };
      
      // Handle embeds - Discord expects an array of embed objects
      if (input.embeds || message.embeds) {
        const embeds = input.embeds || message.embeds;
        // If embeds is a string, ignore it (user entered text instead of array)
        if (Array.isArray(embeds)) {
          webhookMessage.embeds = embeds;
        }
      }

      // Send directly to webhook URL (not through base API)
      const response = await this.apiUtils.executeRequest({
        method: 'POST',
        endpoint: webhookUrl,
        headers: {
          'Content-Type': 'application/json',
          'User-Agent': 'FluxTurn (https://fluxturn.com, 1.0.0)'
        },
        body: webhookMessage
      }, {
        timeout: 15000,
        retries: 3
      });

      if (!response.success) {
        throw new Error(response.error?.message || 'Failed to send webhook message');
      }

      return {
        success: true,
        data: {
          success: true,
          messageId: response.data?.id,
          timestamp: new Date().toISOString()
        }
      };
    } catch (error) {
      return this.handleError(error as any, 'Failed to send webhook message');
    }
  }

  private getAuthHeaders(): Record<string, string> {
    const credentials = this.config.credentials;
    const configAuthType = (this.config as any).config?.authType;
    const settingsAuthType = this.config.settings?.connectionType || this.config.settings?.authType;
    const credentialsAuthType = credentials.authType;
    
    const authType = credentialsAuthType || configAuthType || settingsAuthType || 'bot_token';
    
    let authHeader = '';
    
    if (authType === 'webhook') {
      // Webhooks don't use auth headers
      return {
        'User-Agent': 'FluxTurn (https://fluxturn.com, 1.0.0)'
      };
    } else if (authType === 'bot_token') {
      const token = credentials.botToken || credentials.bot_token || credentials.accessToken;
      if (!token) {
        throw new Error('Bot token is required for bot authentication');
      }
      authHeader = `Bot ${token}`;
    } else if (authType === 'oauth2') {
      const botToken = credentials.botTokenOAuth || credentials.botToken || credentials.bot_token;
      const accessToken = credentials.accessToken || credentials.access_token;

      // Discord OAuth2 still requires bot token for most API operations
      if (botToken) {
        authHeader = `Bot ${botToken}`;
      } else if (accessToken) {
        // User token can only be used for user operations, not bot operations
        // Log a warning since many operations will fail
        this.logger.warn(
          'Discord OAuth2: Using user access token. ' +
          'Bot operations (create channel, send message, etc.) require a bot token. ' +
          'Add your bot token from Discord Developer Portal to enable bot operations.'
        );
        authHeader = `Bearer ${accessToken}`;
      } else {
        // For initial OAuth2 setup, we might not have tokens yet
        this.logger.log('OAuth2 getAuthHeaders - no tokens available yet');
        return {
          'User-Agent': 'FluxTurn (https://fluxturn.com, 1.0.0)'
        };
      }
    } else {
      // Default to bot token auth
      const token = credentials.botToken || credentials.bot_token || credentials.accessToken;
      if (!token) {
        throw new Error('Authentication token is required');
      }
      authHeader = `Bot ${token}`;
    }
    
    return {
      'Authorization': authHeader,
      'User-Agent': 'FluxTurn (https://fluxturn.com, 1.0.0)'
    };
  }

  private getActions(): ConnectorAction[] {
    return [
      {
        id: 'send_message',
        name: 'Send Message',
        description: 'Send a message to a Discord channel or webhook',
        inputSchema: {
          channelId: { 
            type: 'string', 
            required: false, // Made optional - will be validated at runtime based on auth type
            description: 'Channel ID to send message to (not needed for webhooks)'
          },
          message: {
            type: 'object',
            required: true,
            description: 'Message content with text, embeds, or components'
          }
        },
        outputSchema: {
          success: { type: 'boolean', description: 'Whether the message was sent successfully' },
          messageId: { type: 'string', description: 'Unique message identifier' }
        }
      },
      {
        id: 'message_send',
        name: 'Send Message',
        description: 'Send a message to a Discord channel or webhook',
        inputSchema: {
          channelId: { 
            type: 'string', 
            required: false, // Made optional - will be validated at runtime based on auth type
            description: 'Channel ID to send message to (not needed for webhooks)'
          },
          content: {
            type: 'string',
            description: 'Message content'
          },
          embeds: {
            type: 'array',
            description: 'Array of embed objects'
          },
          tts: {
            type: 'boolean',
            description: 'Text-to-speech'
          }
        },
        outputSchema: {
          success: { type: 'boolean', description: 'Whether the message was sent successfully' },
          messageId: { type: 'string', description: 'Unique message identifier' }
        }
      },
      {
        id: 'create_channel',
        name: 'Create Channel',
        description: 'Create a new channel in a Discord server',
        inputSchema: {
          guildId: { type: 'string', required: true, description: 'Server (guild) ID' },
          name: { type: 'string', required: true, description: 'Channel name' },
          type: { type: 'number', description: 'Channel type (0=text, 2=voice, 4=category)' },
          options: { type: 'object', description: 'Additional channel options' }
        },
        outputSchema: {
          channel: { type: 'object', description: 'Created channel information' }
        }
      },
      {
        id: 'channel_create',
        name: 'Create Channel',
        description: 'Create a new channel in a Discord server',
        inputSchema: {
          guildId: { type: 'string', required: true, description: 'Server (guild) ID' },
          name: { type: 'string', required: true, description: 'Channel name' },
          type: { type: 'string', description: 'Channel type (0=text, 2=voice, 4=category)' },
          topic: { type: 'string', description: 'Channel topic' },
          nsfw: { type: 'boolean', description: 'NSFW channel' },
          position: { type: 'number', description: 'Channel position' },
          parent_id: { type: 'string', description: 'Parent category ID' }
        },
        outputSchema: {
          channel: { type: 'object', description: 'Created channel information' }
        }
      },
      {
        id: 'upload_file',
        name: 'Upload File',
        description: 'Upload a file to a Discord channel',
        inputSchema: {
          channelId: { type: 'string', required: true, description: 'Channel ID' },
          file: { type: 'object', required: true, description: 'File data and metadata' },
          message: { type: 'object', description: 'Optional message to accompany file' }
        },
        outputSchema: {
          messageId: { type: 'string', description: 'Message ID with attachment' },
          attachments: { type: 'array', description: 'Uploaded file attachments' }
        }
      },
      {
        id: 'get_user_info',
        name: 'Get User Info',
        description: 'Get information about a Discord user',
        inputSchema: {
          userId: { type: 'string', required: true, description: 'User ID' }
        },
        outputSchema: {
          user: { type: 'object', description: 'User information' }
        }
      },
      {
        id: 'create_invite',
        name: 'Create Invite',
        description: 'Create an invite link for a channel',
        inputSchema: {
          channelId: { type: 'string', required: true, description: 'Channel ID' },
          options: { type: 'object', description: 'Invite options (max_age, max_uses, etc.)' }
        },
        outputSchema: {
          inviteCode: { type: 'string', description: 'Invite code' },
          inviteUrl: { type: 'string', description: 'Full invite URL' }
        }
      },
      {
        id: 'manage_roles',
        name: 'Manage Roles',
        description: 'Add or remove roles from a user',
        inputSchema: {
          guildId: { type: 'string', required: true, description: 'Server (guild) ID' },
          userId: { type: 'string', required: true, description: 'User ID' },
          roleIds: { type: 'array', required: true, description: 'Role IDs to manage' },
          action: { type: 'string', required: true, enum: ['add', 'remove'], description: 'Action to perform' }
        },
        outputSchema: {
          results: { type: 'array', description: 'Results for each role operation' }
        }
      },
      {
        id: 'get_guilds',
        name: 'Get Guilds',
        description: 'Get all guilds (servers) the bot is a member of',
        inputSchema: {},
        outputSchema: {
          guilds: { type: 'array', description: 'Array of guild objects' }
        }
      },
      {
        id: 'get_channels',
        name: 'Get Channels',
        description: 'Get all channels in a guild',
        inputSchema: {
          guildId: { type: 'string', required: true, description: 'Server (guild) ID' }
        },
        outputSchema: {
          channels: { type: 'array', description: 'Array of channel objects' }
        }
      },
      {
        id: 'get_messages',
        name: 'Get Messages',
        description: 'Get messages from a channel',
        inputSchema: {
          channelId: { type: 'string', required: true, description: 'Channel ID' },
          limit: { type: 'number', description: 'Number of messages to fetch (max 100)' },
          before: { type: 'string', description: 'Get messages before this message ID' },
          after: { type: 'string', description: 'Get messages after this message ID' }
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
        id: 'message_received',
        name: 'Message Received',
        description: 'Triggered when a new message is received',
        eventType: 'MESSAGE_CREATE',
        outputSchema: {
          messageId: { type: 'string', description: 'Message ID' },
          channelId: { type: 'string', description: 'Channel ID' },
          guildId: { type: 'string', description: 'Guild ID' },
          author: { type: 'object', description: 'Message author information' },
          content: { type: 'string', description: 'Message content' },
          timestamp: { type: 'string', description: 'Message timestamp' }
        },
        webhookRequired: true
      },
      {
        id: 'member_joined',
        name: 'Member Joined',
        description: 'Triggered when a new member joins a server',
        eventType: 'GUILD_MEMBER_ADD',
        outputSchema: {
          user: { type: 'object', description: 'User information' },
          guildId: { type: 'string', description: 'Guild ID' },
          joinedAt: { type: 'string', description: 'Join timestamp' }
        },
        webhookRequired: true
      },
      {
        id: 'channel_created',
        name: 'Channel Created',
        description: 'Triggered when a new channel is created',
        eventType: 'CHANNEL_CREATE',
        outputSchema: {
          channel: { type: 'object', description: 'Created channel information' },
          guildId: { type: 'string', description: 'Guild ID' }
        },
        webhookRequired: true
      }
    ];
  }
}