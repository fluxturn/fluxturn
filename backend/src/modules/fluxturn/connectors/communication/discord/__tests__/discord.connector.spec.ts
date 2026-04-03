/**
 * Discord Connector Behavioral Tests
 *
 * These tests verify the actual BEHAVIOR of the connector, not just metadata.
 * They mock HTTP calls and verify:
 * - Correct API endpoints are called
 * - Correct request bodies are sent
 * - Responses are processed correctly
 * - Errors are handled properly
 */
import { DiscordConnector } from '../discord.connector';
import { DISCORD_CONNECTOR } from '../discord.definition';
import { AuthUtils } from '../../../utils/auth.utils';
import { ApiUtils } from '../../../utils/api.utils';

describe('DiscordConnector - Behavioral Tests', () => {
  let connector: DiscordConnector;
  let mockAuthUtils: jest.Mocked<AuthUtils>;
  let mockApiUtils: jest.Mocked<ApiUtils>;

  const mockBotCredentials = {
    authType: 'bot_token',
    botToken: 'test-bot-token-123',
  };

  const mockWebhookCredentials = {
    authType: 'webhook',
    webhookUrl: 'https://discord.com/api/webhooks/123456789/abcdefghijklmnop',
  };

  const mockConfig = {
    id: 'test-connector-id',
    name: 'Test Discord Connector',
    type: 'discord',
    category: 'communication',
    credentials: mockBotCredentials,
    settings: {},
  } as any;

  beforeEach(() => {
    // Create mock instances
    mockAuthUtils = {} as jest.Mocked<AuthUtils>;
    mockApiUtils = {
      executeRequest: jest.fn(),
    } as unknown as jest.Mocked<ApiUtils>;

    connector = new DiscordConnector(mockAuthUtils, mockApiUtils);
    jest.clearAllMocks();
  });

  // ===========================================
  // Send Message Tests
  // ===========================================
  describe('sendMessage', () => {
    beforeEach(async () => {
      // Mock successful user info response for initialization
      mockApiUtils.executeRequest.mockResolvedValueOnce({
        success: true,
        data: { id: 'bot-user-id', username: 'TestBot', discriminator: '0001' }
      });
      await connector.initialize(mockConfig);
    });

    it('should call correct Discord API endpoint for sending message', async () => {
      const channelId = '123456789012345678';
      const messageContent = 'Hello, Discord!';

      mockApiUtils.executeRequest.mockResolvedValueOnce({
        success: true,
        data: {
          id: 'message-id-123',
          content: messageContent,
          timestamp: '2024-01-01T00:00:00.000Z'
        }
      });

      await connector.executeAction('send_message', {
        channelId,
        message: { content: messageContent }
      });

      // Verify the correct endpoint was called
      expect(mockApiUtils.executeRequest).toHaveBeenLastCalledWith(
        expect.objectContaining({
          method: 'POST',
          endpoint: `https://discord.com/api/v10/channels/${channelId}/messages`,
          body: expect.objectContaining({
            content: messageContent
          }),
          headers: expect.objectContaining({
            'Authorization': 'Bot test-bot-token-123',
            'Content-Type': 'application/json'
          })
        }),
        expect.any(Object)
      );
    });

    it('should include embeds in request body when provided', async () => {
      const channelId = '123456789012345678';
      const embeds = [
        {
          title: 'Test Embed',
          description: 'This is a test embed',
          color: 0x00ff00
        }
      ];

      mockApiUtils.executeRequest.mockResolvedValueOnce({
        success: true,
        data: { id: 'message-id-123', embeds }
      });

      await connector.executeAction('send_message', {
        channelId,
        message: { content: 'Test', embeds }
      });

      expect(mockApiUtils.executeRequest).toHaveBeenLastCalledWith(
        expect.objectContaining({
          body: expect.objectContaining({
            embeds
          })
        }),
        expect.any(Object)
      );
    });

    it('should include message_reference when replying to a message', async () => {
      const channelId = '123456789012345678';
      const replyToMessageId = '987654321098765432';

      mockApiUtils.executeRequest.mockResolvedValueOnce({
        success: true,
        data: { id: 'message-id-123' }
      });

      await connector.executeAction('send_message', {
        channelId,
        message: {
          content: 'This is a reply',
          replyTo: replyToMessageId
        }
      });

      expect(mockApiUtils.executeRequest).toHaveBeenLastCalledWith(
        expect.objectContaining({
          body: expect.objectContaining({
            message_reference: expect.objectContaining({
              message_id: replyToMessageId,
              channel_id: channelId
            })
          })
        }),
        expect.any(Object)
      );
    });

    it('should return success response with message ID', async () => {
      const channelId = '123456789012345678';

      mockApiUtils.executeRequest.mockResolvedValueOnce({
        success: true,
        data: {
          id: 'returned-message-id',
          timestamp: '2024-01-01T12:00:00.000Z'
        }
      });

      const result = await connector.executeAction('send_message', {
        channelId,
        message: { content: 'Test' }
      });

      expect(result.success).toBe(true);
      expect(result.data[0].messageId).toBe('returned-message-id');
      expect(result.data[0].channelId).toBe(channelId);
    });

    it('should handle API error gracefully', async () => {
      const channelId = '123456789012345678';

      mockApiUtils.executeRequest.mockResolvedValueOnce({
        success: false,
        error: { code: 'UNKNOWN_CHANNEL', message: 'Unknown Channel' }
      });

      const result = await connector.executeAction('send_message', {
        channelId,
        message: { content: 'Test' }
      });

      expect(result.data[0].success).toBe(false);
      expect(result.data[0].error).toContain('Unknown Channel');
    });

    it('should send to multiple channels when array is provided', async () => {
      const channelIds = ['channel1', 'channel2', 'channel3'];

      // Mock successful response for each channel
      channelIds.forEach(() => {
        mockApiUtils.executeRequest.mockResolvedValueOnce({
          success: true,
          data: { id: 'message-id', timestamp: '2024-01-01T00:00:00.000Z' }
        });
      });

      const result = await connector.sendMessage(channelIds, { content: 'Broadcast' });

      expect(result.data).toHaveLength(3);
      expect(mockApiUtils.executeRequest).toHaveBeenCalledTimes(4); // 1 init + 3 messages
    });
  });

  // ===========================================
  // Webhook Message Tests
  // ===========================================
  describe('sendWebhookMessage', () => {
    const webhookConfig = {
      ...mockConfig,
      credentials: mockWebhookCredentials,
    };

    beforeEach(async () => {
      connector = new DiscordConnector(mockAuthUtils, mockApiUtils);
      await connector.initialize(webhookConfig);
    });

    it('should call webhook URL directly (not Discord API)', async () => {
      mockApiUtils.executeRequest.mockResolvedValueOnce({
        success: true,
        data: { id: 'webhook-message-id' }
      });

      await connector.executeAction('send_message', {
        message: { content: 'Webhook message' }
      });

      expect(mockApiUtils.executeRequest).toHaveBeenLastCalledWith(
        expect.objectContaining({
          method: 'POST',
          endpoint: mockWebhookCredentials.webhookUrl,
          body: expect.objectContaining({
            content: 'Webhook message',
            username: 'FluxTurn Bot'
          }),
          headers: expect.objectContaining({
            'Content-Type': 'application/json'
          })
        }),
        expect.any(Object)
      );
    });

    it('should NOT include Authorization header for webhooks', async () => {
      mockApiUtils.executeRequest.mockResolvedValueOnce({
        success: true,
        data: { id: 'webhook-message-id' }
      });

      await connector.executeAction('send_message', {
        message: { content: 'Test' }
      });

      const lastCall = mockApiUtils.executeRequest.mock.calls[mockApiUtils.executeRequest.mock.calls.length - 1];
      expect(lastCall[0].headers).not.toHaveProperty('Authorization');
    });

    it('should allow custom username override', async () => {
      mockApiUtils.executeRequest.mockResolvedValueOnce({
        success: true,
        data: { id: 'webhook-message-id' }
      });

      await connector.executeAction('send_message', {
        message: {
          content: 'Custom bot message',
          username: 'Custom Bot Name'
        }
      });

      expect(mockApiUtils.executeRequest).toHaveBeenLastCalledWith(
        expect.objectContaining({
          body: expect.objectContaining({
            username: 'Custom Bot Name'
          })
        }),
        expect.any(Object)
      );
    });
  });

  // ===========================================
  // Create Channel Tests
  // ===========================================
  describe('createChannel', () => {
    beforeEach(async () => {
      mockApiUtils.executeRequest.mockResolvedValueOnce({
        success: true,
        data: { id: 'bot-user-id', username: 'TestBot', discriminator: '0001' }
      });
      await connector.initialize(mockConfig);
    });

    it('should call correct endpoint for creating channel', async () => {
      const guildId = '111222333444555666';
      const channelName = 'test-channel';

      mockApiUtils.executeRequest.mockResolvedValueOnce({
        success: true,
        data: {
          id: 'new-channel-id',
          name: channelName,
          type: 0,
          guild_id: guildId
        }
      });

      await connector.executeAction('create_channel', {
        guildId,
        name: channelName,
        type: 0
      });

      expect(mockApiUtils.executeRequest).toHaveBeenLastCalledWith(
        expect.objectContaining({
          method: 'POST',
          endpoint: `https://discord.com/api/v10/guilds/${guildId}/channels`,
          body: expect.objectContaining({
            name: channelName,
            type: 0
          }),
          headers: expect.objectContaining({
            'Authorization': 'Bot test-bot-token-123'
          })
        }),
        expect.any(Object)
      );
    });

    it('should include optional parameters when provided', async () => {
      const guildId = '111222333444555666';

      mockApiUtils.executeRequest.mockResolvedValueOnce({
        success: true,
        data: { id: 'new-channel-id' }
      });

      await connector.executeAction('create_channel', {
        guildId,
        name: 'private-channel',
        type: 0,
        topic: 'This is a private channel',
        nsfw: true,
        parentId: 'category-id-123'
      });

      expect(mockApiUtils.executeRequest).toHaveBeenLastCalledWith(
        expect.objectContaining({
          body: expect.objectContaining({
            name: 'private-channel',
            topic: 'This is a private channel',
            nsfw: true,
            parent_id: 'category-id-123'
          })
        }),
        expect.any(Object)
      );
    });

    it('should convert channel type string to number', async () => {
      mockApiUtils.executeRequest.mockResolvedValueOnce({
        success: true,
        data: { id: 'new-channel-id' }
      });

      await connector.executeAction('create_channel', {
        guildId: '111222333',
        name: 'voice-channel',
        type: '2' // Voice channel as string
      });

      expect(mockApiUtils.executeRequest).toHaveBeenLastCalledWith(
        expect.objectContaining({
          body: expect.objectContaining({
            type: 2 // Should be converted to number
          })
        }),
        expect.any(Object)
      );
    });

    it('should return created channel data', async () => {
      const createdChannel = {
        id: 'new-channel-123',
        name: 'test-channel',
        type: 0,
        guild_id: '111222333'
      };

      mockApiUtils.executeRequest.mockResolvedValueOnce({
        success: true,
        data: createdChannel
      });

      const result = await connector.executeAction('create_channel', {
        guildId: '111222333',
        name: 'test-channel',
        type: 0
      });

      expect(result.success).toBe(true);
      expect(result.data.id).toBe('new-channel-123');
      expect(result.data.name).toBe('test-channel');
    });
  });

  // ===========================================
  // Get User Info Tests
  // ===========================================
  describe('getUserInfo', () => {
    beforeEach(async () => {
      mockApiUtils.executeRequest.mockResolvedValueOnce({
        success: true,
        data: { id: 'bot-user-id', username: 'TestBot', discriminator: '0001' }
      });
      await connector.initialize(mockConfig);
    });

    it('should call correct endpoint for getting user info', async () => {
      const userId = '999888777666555444';

      mockApiUtils.executeRequest.mockResolvedValueOnce({
        success: true,
        data: {
          id: userId,
          username: 'TestUser',
          discriminator: '1234',
          avatar: 'avatar-hash'
        }
      });

      await connector.executeAction('get_user_info', { userId });

      expect(mockApiUtils.executeRequest).toHaveBeenLastCalledWith(
        expect.objectContaining({
          method: 'GET',
          endpoint: `https://discord.com/api/v10/users/${userId}`,
          headers: expect.objectContaining({
            'Authorization': 'Bot test-bot-token-123'
          })
        }),
        expect.any(Object)
      );
    });

    it('should return user data correctly', async () => {
      const userData = {
        id: '999888777',
        username: 'CoolUser',
        discriminator: '5678',
        avatar: 'avatar-hash-123',
        bot: false
      };

      mockApiUtils.executeRequest.mockResolvedValueOnce({
        success: true,
        data: userData
      });

      const result = await connector.executeAction('get_user_info', { userId: '999888777' });

      expect(result.success).toBe(true);
      expect(result.data.username).toBe('CoolUser');
      expect(result.data.discriminator).toBe('5678');
    });
  });

  // ===========================================
  // Get Guilds Tests
  // ===========================================
  describe('getGuilds', () => {
    it('should call correct endpoint for getting guilds', async () => {
      // Create fresh connector and mocks for this test
      const freshConnector = new DiscordConnector(mockAuthUtils, mockApiUtils);

      // Mock init call then getGuilds call
      mockApiUtils.executeRequest
        .mockResolvedValueOnce({
          success: true,
          data: { id: 'bot-user-id', username: 'TestBot', discriminator: '0001' }
        })
        .mockResolvedValueOnce({
          success: true,
          data: [
            { id: 'guild1', name: 'Test Server 1' },
            { id: 'guild2', name: 'Test Server 2' }
          ]
        });

      await freshConnector.initialize(mockConfig);
      await freshConnector.executeAction('get_guilds', {});

      expect(mockApiUtils.executeRequest).toHaveBeenLastCalledWith(
        expect.objectContaining({
          method: 'GET',
          endpoint: 'https://discord.com/api/v10/users/@me/guilds',
          queryParams: { limit: 200 }
        }),
        expect.any(Object)
      );
    });

    it('should return array of guilds', async () => {
      // Create fresh connector and mocks for this test
      const freshConnector = new DiscordConnector(mockAuthUtils, mockApiUtils);

      const guilds = [
        { id: 'guild1', name: 'Server 1', icon: 'icon1' },
        { id: 'guild2', name: 'Server 2', icon: 'icon2' }
      ];

      // Mock init call then getGuilds call
      mockApiUtils.executeRequest
        .mockResolvedValueOnce({
          success: true,
          data: { id: 'bot-user-id', username: 'TestBot', discriminator: '0001' }
        })
        .mockResolvedValueOnce({
          success: true,
          data: guilds
        });

      await freshConnector.initialize(mockConfig);
      const result = await freshConnector.executeAction('get_guilds', {});

      expect(result.success).toBe(true);
      expect(result.data).toHaveLength(2);
      expect(result.data[0].name).toBe('Server 1');
    });

    it('should have get_guilds action in getMetadata', () => {
      const metadata = connector.getMetadata();
      const actionIds = metadata.actions.map(a => a.id);
      expect(actionIds).toContain('get_guilds');
    });
  });

  // ===========================================
  // Get Channels Tests
  // ===========================================
  describe('getChannels', () => {
    it('should call correct endpoint for getting channels', async () => {
      // Create fresh connector and mocks for this test
      const freshConnector = new DiscordConnector(mockAuthUtils, mockApiUtils);
      const guildId = '111222333444555666';

      // Mock init call then getChannels call
      mockApiUtils.executeRequest
        .mockResolvedValueOnce({
          success: true,
          data: { id: 'bot-user-id', username: 'TestBot', discriminator: '0001' }
        })
        .mockResolvedValueOnce({
          success: true,
          data: [
            { id: 'channel1', name: 'general', type: 0 },
            { id: 'channel2', name: 'voice', type: 2 }
          ]
        });

      await freshConnector.initialize(mockConfig);
      await freshConnector.executeAction('get_channels', { guildId });

      expect(mockApiUtils.executeRequest).toHaveBeenLastCalledWith(
        expect.objectContaining({
          method: 'GET',
          endpoint: `https://discord.com/api/v10/guilds/${guildId}/channels`
        }),
        expect.any(Object)
      );
    });

    it('should have get_channels action in getMetadata', () => {
      const metadata = connector.getMetadata();
      const actionIds = metadata.actions.map(a => a.id);
      expect(actionIds).toContain('get_channels');
    });
  });

  // ===========================================
  // Create Invite Tests
  // ===========================================
  describe('createInvite', () => {
    beforeEach(async () => {
      mockApiUtils.executeRequest.mockResolvedValueOnce({
        success: true,
        data: { id: 'bot-user-id', username: 'TestBot', discriminator: '0001' }
      });
      await connector.initialize(mockConfig);
    });

    it('should call correct endpoint for creating invite', async () => {
      const channelId = '123456789012345678';

      mockApiUtils.executeRequest.mockResolvedValueOnce({
        success: true,
        data: {
          code: 'abc123',
          channel: { id: channelId }
        }
      });

      await connector.executeAction('create_invite', { channelId });

      expect(mockApiUtils.executeRequest).toHaveBeenLastCalledWith(
        expect.objectContaining({
          method: 'POST',
          endpoint: `https://discord.com/api/v10/channels/${channelId}/invites`,
          body: expect.objectContaining({
            max_age: 86400, // Default 24 hours
            max_uses: 0 // Default unlimited
          })
        }),
        expect.any(Object)
      );
    });

    it('should include custom options when provided', async () => {
      const channelId = '123456789012345678';

      mockApiUtils.executeRequest.mockResolvedValueOnce({
        success: true,
        data: { code: 'xyz789' }
      });

      await connector.executeAction('create_invite', {
        channelId,
        options: {
          maxAge: 3600, // 1 hour
          maxUses: 10,
          temporary: true
        }
      });

      expect(mockApiUtils.executeRequest).toHaveBeenLastCalledWith(
        expect.objectContaining({
          body: expect.objectContaining({
            max_age: 3600,
            max_uses: 10,
            temporary: true
          })
        }),
        expect.any(Object)
      );
    });

    it('should return invite URL correctly', async () => {
      mockApiUtils.executeRequest.mockResolvedValueOnce({
        success: true,
        data: { code: 'testInviteCode' }
      });

      const result = await connector.executeAction('create_invite', {
        channelId: '123456789'
      });

      expect(result.success).toBe(true);
      expect(result.data.inviteCode).toBe('testInviteCode');
      expect(result.data.inviteUrl).toBe('https://discord.gg/testInviteCode');
    });
  });

  // ===========================================
  // Manage Roles Tests
  // ===========================================
  describe('manageRoles', () => {
    beforeEach(async () => {
      mockApiUtils.executeRequest.mockResolvedValueOnce({
        success: true,
        data: { id: 'bot-user-id', username: 'TestBot', discriminator: '0001' }
      });
      await connector.initialize(mockConfig);
    });

    it('should call PUT endpoint when adding roles', async () => {
      const guildId = '111222333';
      const userId = '444555666';
      const roleId = '777888999';

      mockApiUtils.executeRequest.mockResolvedValueOnce({
        success: true,
        data: {}
      });

      await connector.executeAction('manage_roles', {
        guildId,
        userId,
        roleIds: [roleId],
        action: 'add'
      });

      expect(mockApiUtils.executeRequest).toHaveBeenLastCalledWith(
        expect.objectContaining({
          method: 'PUT',
          endpoint: `https://discord.com/api/v10/guilds/${guildId}/members/${userId}/roles/${roleId}`
        }),
        expect.any(Object)
      );
    });

    it('should call DELETE endpoint when removing roles', async () => {
      const guildId = '111222333';
      const userId = '444555666';
      const roleId = '777888999';

      mockApiUtils.executeRequest.mockResolvedValueOnce({
        success: true,
        data: {}
      });

      await connector.executeAction('manage_roles', {
        guildId,
        userId,
        roleIds: [roleId],
        action: 'remove'
      });

      expect(mockApiUtils.executeRequest).toHaveBeenLastCalledWith(
        expect.objectContaining({
          method: 'DELETE',
          endpoint: `https://discord.com/api/v10/guilds/${guildId}/members/${userId}/roles/${roleId}`
        }),
        expect.any(Object)
      );
    });

    it('should handle multiple roles', async () => {
      const roleIds = ['role1', 'role2', 'role3'];

      roleIds.forEach(() => {
        mockApiUtils.executeRequest.mockResolvedValueOnce({
          success: true,
          data: {}
        });
      });

      const result = await connector.executeAction('manage_roles', {
        guildId: '111222333',
        userId: '444555666',
        roleIds,
        action: 'add'
      });

      expect(result.data).toHaveLength(3);
      expect(mockApiUtils.executeRequest).toHaveBeenCalledTimes(4); // 1 init + 3 roles
    });
  });

  // ===========================================
  // Get Messages Tests
  // ===========================================
  describe('getMessages', () => {
    it('should call correct endpoint with query params', async () => {
      // Create fresh connector and mocks for this test
      const freshConnector = new DiscordConnector(mockAuthUtils, mockApiUtils);
      const channelId = '123456789012345678';

      // Mock init call then getMessages call
      mockApiUtils.executeRequest
        .mockResolvedValueOnce({
          success: true,
          data: { id: 'bot-user-id', username: 'TestBot', discriminator: '0001' }
        })
        .mockResolvedValueOnce({
          success: true,
          data: [
            { id: 'msg1', content: 'Hello' },
            { id: 'msg2', content: 'World' }
          ]
        });

      await freshConnector.initialize(mockConfig);
      await freshConnector.executeAction('get_messages', {
        channelId,
        options: { pageSize: 25 }
      });

      expect(mockApiUtils.executeRequest).toHaveBeenLastCalledWith(
        expect.objectContaining({
          method: 'GET',
          endpoint: `https://discord.com/api/v10/channels/${channelId}/messages`,
          queryParams: expect.objectContaining({
            limit: 25
          })
        }),
        expect.any(Object)
      );
    });

    it('should have get_messages action in getMetadata', () => {
      const metadata = connector.getMetadata();
      const actionIds = metadata.actions.map(a => a.id);
      expect(actionIds).toContain('get_messages');
    });

    it('should require channelId', async () => {
      // Mock init call
      mockApiUtils.executeRequest.mockResolvedValueOnce({
        success: true,
        data: { id: 'bot-user-id', username: 'TestBot', discriminator: '0001' }
      });
      await connector.initialize(mockConfig);

      const result = await connector.getMessages({});

      expect(result.success).toBe(false);
      expect(result.error?.message).toContain('Channel ID is required');
    });

    it('should cap limit at 100 (Discord API limit)', async () => {
      // Mock init call
      mockApiUtils.executeRequest.mockResolvedValueOnce({
        success: true,
        data: { id: 'bot-user-id', username: 'TestBot', discriminator: '0001' }
      });
      await connector.initialize(mockConfig);

      const channelId = '123456789012345678';

      mockApiUtils.executeRequest.mockResolvedValueOnce({
        success: true,
        data: []
      });

      await connector.getMessages({
        filters: { channelId },
        pageSize: 500 // Requesting more than allowed
      });

      expect(mockApiUtils.executeRequest).toHaveBeenLastCalledWith(
        expect.objectContaining({
          queryParams: expect.objectContaining({
            limit: 100 // Should be capped at 100
          })
        }),
        expect.any(Object)
      );
    });
  });

  // ===========================================
  // Authentication Tests
  // ===========================================
  describe('authentication', () => {
    it('should use Bot prefix for bot token auth', async () => {
      mockApiUtils.executeRequest.mockResolvedValueOnce({
        success: true,
        data: { id: 'bot-id', username: 'TestBot', discriminator: '0001' }
      });

      await connector.initialize(mockConfig);

      expect(mockApiUtils.executeRequest).toHaveBeenCalledWith(
        expect.objectContaining({
          headers: expect.objectContaining({
            'Authorization': 'Bot test-bot-token-123'
          })
        }),
        expect.any(Object)
      );
    });

    it('should throw error when bot token is missing', async () => {
      const invalidConfig = {
        ...mockConfig,
        credentials: {
          authType: 'bot_token'
          // Missing botToken
        }
      };

      await expect(connector.initialize(invalidConfig)).rejects.toThrow();
    });

    it('should validate webhook URL format', async () => {
      const invalidWebhookConfig = {
        ...mockConfig,
        credentials: {
          authType: 'webhook',
          webhookUrl: 'https://invalid-url.com/not-discord'
        }
      };

      await expect(connector.initialize(invalidWebhookConfig))
        .rejects.toThrow('Invalid Discord webhook URL');
    });
  });

  // ===========================================
  // Error Handling Tests
  // ===========================================
  describe('error handling', () => {
    beforeEach(async () => {
      mockApiUtils.executeRequest.mockResolvedValueOnce({
        success: true,
        data: { id: 'bot-user-id', username: 'TestBot', discriminator: '0001' }
      });
      await connector.initialize(mockConfig);
    });

    it('should handle rate limit errors', async () => {
      mockApiUtils.executeRequest.mockResolvedValueOnce({
        success: false,
        error: {
          code: 'RATE_LIMITED',
          message: 'You are being rate limited'
        }
      });

      const result = await connector.sendMessage('channel-id', { content: 'Test' });

      expect(result.data[0].success).toBe(false);
      expect(result.data[0].error).toContain('rate limited');
    });

    it('should handle unknown action gracefully', async () => {
      // Connector returns error response instead of throwing
      const result = await connector.executeAction('unknown_action', {});

      expect(result.success).toBe(false);
      expect(result.error?.message).toContain('Action not found');
    });

    it('should handle network errors', async () => {
      mockApiUtils.executeRequest.mockRejectedValueOnce(
        new Error('Network error: ECONNREFUSED')
      );

      const result = await connector.sendMessage('channel-id', { content: 'Test' });

      expect(result.data[0].success).toBe(false);
    });
  });

  // ===========================================
  // Connection Test
  // ===========================================
  describe('testConnection', () => {
    it('should return true for valid bot token', async () => {
      mockApiUtils.executeRequest.mockResolvedValue({
        success: true,
        data: { id: 'bot-id', username: 'TestBot', discriminator: '0001' }
      });

      await connector.initialize(mockConfig);
      const result = await connector.testConnection();

      expect(result.success).toBe(true);
      expect(result.data).toBe(true);
    });

    it('should return success: false for invalid bot token', async () => {
      // Create fresh connector for this test
      const freshConnector = new DiscordConnector(mockAuthUtils, mockApiUtils);

      // Mock init success then connection test failure
      mockApiUtils.executeRequest
        .mockResolvedValueOnce({
          success: true,
          data: { id: 'bot-id', username: 'TestBot', discriminator: '0001' }
        })
        .mockResolvedValueOnce({
          success: false,
          error: { code: 'INVALID_TOKEN', message: 'Invalid token' }
        });

      await freshConnector.initialize(mockConfig);
      const result = await freshConnector.testConnection();

      // When performConnectionTest returns false, base class returns success: false
      // performRequest throws on !response.success, caught by performConnectionTest -> returns false
      // BaseConnector.testConnection sees result === false and returns { success: false }
      expect(result.success).toBe(false);
      expect(result.error?.code).toBe('CONNECTION_FAILED');
    });

    it('should validate webhook URL format for webhook auth', async () => {
      const webhookConfig = {
        ...mockConfig,
        credentials: mockWebhookCredentials
      };

      connector = new DiscordConnector(mockAuthUtils, mockApiUtils);
      await connector.initialize(webhookConfig);

      const result = await connector.testConnection();

      expect(result.success).toBe(true);
      expect(result.data).toBe(true);
    });
  });

  // ===========================================
  // Connector-Definition Sync Tests
  // ===========================================
  describe('connector-definition sync', () => {
    it('should have all core actions matching definition', () => {
      const metadata = connector.getMetadata();
      const connectorActionIds = metadata.actions.map(a => a.id);

      // Core actions that must exist
      expect(connectorActionIds).toContain('send_message');
      expect(connectorActionIds).toContain('create_channel');
      expect(connectorActionIds).toContain('manage_roles');
    });

    it('should have triggers matching definition event types', () => {
      const metadata = connector.getMetadata();
      const definitionTriggers = DISCORD_CONNECTOR.supported_triggers || [];

      for (const connectorTrigger of metadata.triggers) {
        const defTrigger = definitionTriggers.find((t: any) =>
          t.eventType === connectorTrigger.eventType
        );
        // Event types should match between connector and definition
        if (defTrigger) {
          expect(connectorTrigger.eventType).toBe(defTrigger.eventType);
        }
      }
    });

    it('should have matching auth fields', () => {
      const definitionAuthKeys = DISCORD_CONNECTOR.auth_fields.map((f: any) => f.key);

      expect(definitionAuthKeys).toContain('botToken');
      expect(definitionAuthKeys).toContain('webhookUrl');
      expect(definitionAuthKeys).toContain('authType');
    });
  });
});
