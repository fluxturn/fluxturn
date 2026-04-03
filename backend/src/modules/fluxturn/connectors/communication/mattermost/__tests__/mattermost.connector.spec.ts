/**
 * Mattermost Connector Tests
 *
 * Behavioral tests that verify team messaging operations, API calls, and connections.
 */

import { Test, TestingModule } from '@nestjs/testing';
import { MattermostConnector } from '../mattermost.connector';
import { MATTERMOST_CONNECTOR } from '../mattermost.definition';
import { AuthUtils } from '../../../utils/auth.utils';
import { ApiUtils } from '../../../utils/api.utils';

// Mock ApiUtils
const mockApiUtils = {
  executeRequest: jest.fn(),
};

// Mock AuthUtils
const mockAuthUtils = {
  createBearerAuthHeader: jest.fn(),
};

describe('MattermostConnector', () => {
  let connector: MattermostConnector;

  const mockConfig = {
    id: 'test-config-id',
    name: 'Test Mattermost Config',
    type: 'mattermost',
    category: 'communication',
    credentials: {
      accessToken: 'test-access-token',
      baseUrl: 'https://mattermost.example.com',
    },
    settings: {},
  } as any;

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MattermostConnector,
        { provide: AuthUtils, useValue: mockAuthUtils },
        { provide: ApiUtils, useValue: mockApiUtils },
      ],
    }).compile();

    connector = module.get<MattermostConnector>(MattermostConnector);
  });

  describe('Metadata', () => {
    it('should return correct metadata', () => {
      const metadata = connector.getMetadata();

      expect(metadata.name).toBe('Mattermost');
      expect(metadata.description).toContain('Team collaboration');
      expect(metadata.version).toBe('1.0.0');
      expect(metadata.category).toBe('communication');
      expect(metadata.type).toBe('mattermost');
      expect(metadata.authType).toBe('bearer_token');
      expect(metadata.webhookSupport).toBe(false);
    });

    it('should return 19 actions', () => {
      const metadata = connector.getMetadata();
      expect(metadata.actions).toHaveLength(19);
    });

    it('should return 0 triggers', () => {
      const metadata = connector.getMetadata();
      expect(metadata.triggers).toHaveLength(0);
    });

    it('should include all Channel action IDs', () => {
      const metadata = connector.getMetadata();
      const actionIds = metadata.actions.map((a) => a.id);

      expect(actionIds).toContain('create_channel');
      expect(actionIds).toContain('delete_channel');
      expect(actionIds).toContain('restore_channel');
      expect(actionIds).toContain('add_user_to_channel');
      expect(actionIds).toContain('get_channel_members');
      expect(actionIds).toContain('search_channels');
      expect(actionIds).toContain('get_channel_statistics');
    });

    it('should include all Message action IDs', () => {
      const metadata = connector.getMetadata();
      const actionIds = metadata.actions.map((a) => a.id);

      expect(actionIds).toContain('post_message');
      expect(actionIds).toContain('post_ephemeral_message');
      expect(actionIds).toContain('delete_message');
    });

    it('should include all Reaction action IDs', () => {
      const metadata = connector.getMetadata();
      const actionIds = metadata.actions.map((a) => a.id);

      expect(actionIds).toContain('create_reaction');
      expect(actionIds).toContain('delete_reaction');
      expect(actionIds).toContain('get_all_reactions');
    });

    it('should include all User action IDs', () => {
      const metadata = connector.getMetadata();
      const actionIds = metadata.actions.map((a) => a.id);

      expect(actionIds).toContain('create_user');
      expect(actionIds).toContain('deactivate_user');
      expect(actionIds).toContain('get_user_by_id');
      expect(actionIds).toContain('get_user_by_email');
      expect(actionIds).toContain('get_all_users');
      expect(actionIds).toContain('invite_user_to_team');
    });
  });

  describe('Connector-Definition Sync', () => {
    it('should have all connector actions in definition', () => {
      const metadata = connector.getMetadata();
      const connectorActionIds = metadata.actions.map((a) => a.id);
      const definitionActionIds = MATTERMOST_CONNECTOR.supported_actions?.map((a) => a.id) || [];

      for (const actionId of connectorActionIds) {
        expect(definitionActionIds).toContain(actionId);
      }
    });

    it('should have matching name in connector and definition', () => {
      const metadata = connector.getMetadata();
      expect(metadata.name).toBe(MATTERMOST_CONNECTOR.display_name);
    });

    it('should have matching category in connector and definition', () => {
      const metadata = connector.getMetadata();
      expect(metadata.category).toBe(MATTERMOST_CONNECTOR.category);
    });
  });

  describe('initialize', () => {
    it('should initialize successfully with valid credentials', async () => {
      await expect(connector.initialize(mockConfig)).resolves.not.toThrow();
    });

    it('should throw error if access token is missing', async () => {
      const invalidConfig = {
        ...mockConfig,
        credentials: { baseUrl: 'https://example.com' },
      };

      await expect(connector.initialize(invalidConfig)).rejects.toThrow(
        'Access token is required',
      );
    });

    it('should throw error if base URL is missing', async () => {
      const invalidConfig = {
        ...mockConfig,
        credentials: { accessToken: 'test-token' },
      };

      await expect(connector.initialize(invalidConfig)).rejects.toThrow(
        'Base URL is required',
      );
    });
  });

  describe('testConnection', () => {
    it('should return success for valid connection', async () => {
      mockApiUtils.executeRequest.mockResolvedValueOnce({
        data: { id: 'user123', username: 'testuser' },
      });

      await connector.initialize(mockConfig);
      const result = await connector.testConnection();

      expect(result.success).toBe(true);
      expect(mockApiUtils.executeRequest).toHaveBeenCalledWith(
        expect.objectContaining({
          method: 'GET',
          endpoint: expect.stringContaining('/users/me'),
        }),
      );
    });

    it('should return failure for invalid connection', async () => {
      mockApiUtils.executeRequest.mockRejectedValueOnce(
        new Error('Unauthorized'),
      );

      await connector.initialize(mockConfig);
      const result = await connector.testConnection();

      expect(result.success).toBe(false);
    });
  });

  describe('Action: create_channel', () => {
    it('should create channel', async () => {
      const mockChannel = {
        id: 'ch123',
        name: 'test-channel',
        display_name: 'Test Channel',
        type: 'O',
      };

      mockApiUtils.executeRequest.mockResolvedValueOnce({ data: mockChannel });

      await connector.initialize(mockConfig);
      const result = await connector.executeAction('create_channel', {
        teamId: 'team123',
        name: 'test-channel',
        displayName: 'Test Channel',
        type: 'O',
      });

      expect(result.success).toBe(true);
      expect(result.data).toEqual(mockChannel);
      expect(mockApiUtils.executeRequest).toHaveBeenCalledWith(
        expect.objectContaining({
          method: 'POST',
          endpoint: expect.stringContaining('/channels'),
        }),
      );
    });
  });

  describe('Action: post_message', () => {
    it('should post message', async () => {
      const mockPost = {
        id: 'post123',
        channel_id: 'ch123',
        message: 'Hello World',
      };

      mockApiUtils.executeRequest.mockResolvedValueOnce({ data: mockPost });

      await connector.initialize(mockConfig);
      const result = await connector.executeAction('post_message', {
        channelId: 'ch123',
        message: 'Hello World',
      });

      expect(result.success).toBe(true);
      expect(result.data).toEqual(mockPost);
      expect(mockApiUtils.executeRequest).toHaveBeenCalledWith(
        expect.objectContaining({
          method: 'POST',
          endpoint: expect.stringContaining('/posts'),
        }),
      );
    });

    it('should post threaded reply', async () => {
      const mockPost = {
        id: 'post456',
        channel_id: 'ch123',
        message: 'Reply message',
        root_id: 'post123',
      };

      mockApiUtils.executeRequest.mockResolvedValueOnce({ data: mockPost });

      await connector.initialize(mockConfig);
      const result = await connector.executeAction('post_message', {
        channelId: 'ch123',
        message: 'Reply message',
        rootId: 'post123',
      });

      expect(result.success).toBe(true);
      expect(result.data).toEqual(mockPost);
    });
  });

  describe('Action: delete_channel', () => {
    it('should delete channel', async () => {
      mockApiUtils.executeRequest.mockResolvedValueOnce({ data: null });

      await connector.initialize(mockConfig);
      const result = await connector.executeAction('delete_channel', {
        channelId: 'ch123',
      });

      expect(result.success).toBe(true);
      expect(mockApiUtils.executeRequest).toHaveBeenCalledWith(
        expect.objectContaining({
          method: 'DELETE',
          endpoint: expect.stringContaining('/channels/ch123'),
        }),
      );
    });
  });

  describe('Action: create_reaction', () => {
    it('should create reaction', async () => {
      const mockReaction = {
        user_id: 'user123',
        post_id: 'post123',
        emoji_name: 'thumbsup',
      };

      mockApiUtils.executeRequest.mockResolvedValueOnce({ data: mockReaction });

      await connector.initialize(mockConfig);
      const result = await connector.executeAction('create_reaction', {
        userId: 'user123',
        postId: 'post123',
        emojiName: 'thumbsup',
      });

      expect(result.success).toBe(true);
      expect(result.data).toEqual(mockReaction);
      expect(mockApiUtils.executeRequest).toHaveBeenCalledWith(
        expect.objectContaining({
          method: 'POST',
          endpoint: expect.stringContaining('/reactions'),
        }),
      );
    });
  });

  describe('Action: create_user', () => {
    it('should create user', async () => {
      const mockUser = {
        id: 'user123',
        username: 'newuser',
        email: 'newuser@example.com',
      };

      mockApiUtils.executeRequest.mockResolvedValueOnce({ data: mockUser });

      await connector.initialize(mockConfig);
      const result = await connector.executeAction('create_user', {
        username: 'newuser',
        email: 'newuser@example.com',
        password: 'securepassword123',
      });

      expect(result.success).toBe(true);
      expect(result.data).toEqual(mockUser);
      expect(mockApiUtils.executeRequest).toHaveBeenCalledWith(
        expect.objectContaining({
          method: 'POST',
          endpoint: expect.stringContaining('/users'),
        }),
      );
    });
  });

  describe('Action: get_all_users', () => {
    it('should get all users', async () => {
      const mockUsers = [
        { id: 'user1', username: 'user1' },
        { id: 'user2', username: 'user2' },
      ];

      mockApiUtils.executeRequest.mockResolvedValueOnce({ data: mockUsers });

      await connector.initialize(mockConfig);
      const result = await connector.executeAction('get_all_users', {
        page: 0,
        perPage: 60,
      });

      expect(result.success).toBe(true);
      expect(result.data).toEqual(mockUsers);
    });
  });

  describe('Unknown Action', () => {
    it('should throw error for unknown action', async () => {
      await connector.initialize(mockConfig);
      const result = await connector.executeAction('unknown_action', {});

      expect(result.success).toBe(false);
      expect(result.error?.message).toMatch(/unknown action|not found/i);
    });
  });

  describe('Authentication Headers', () => {
    it('should use Bearer token', async () => {
      mockApiUtils.executeRequest.mockResolvedValueOnce({ data: { id: 'user123' } });

      await connector.initialize(mockConfig);
      await connector.executeAction('get_user_by_id', { userId: 'user123' });

      const callArgs = mockApiUtils.executeRequest.mock.calls[0][0];
      expect(callArgs.headers?.Authorization).toBe('Bearer test-access-token');
    });
  });

  describe('Error Handling', () => {
    it('should handle API errors gracefully', async () => {
      mockApiUtils.executeRequest.mockRejectedValueOnce(
        new Error('API rate limit exceeded'),
      );

      await connector.initialize(mockConfig);
      const result = await connector.executeAction('get_all_users', {});

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });
  });
});
