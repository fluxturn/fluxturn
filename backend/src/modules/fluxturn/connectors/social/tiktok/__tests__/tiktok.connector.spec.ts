/**
 * TikTok Connector Tests
 *
 * Behavioral tests that verify TikTok API operations, OAuth handling, and connections.
 */

import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { TikTokConnector } from '../tiktok.connector';
import { TIKTOK_CONNECTOR } from '../tiktok.definition';
import { ConnectorConfigService } from '../../../services/connector-config.service';
import { TikTokOAuthService } from '../../../services/tiktok-oauth.service';
import axios from 'axios';

// Mock axios
jest.mock('axios');
const mockedAxios = jest.mocked(axios);

describe('TikTokConnector', () => {
  let connector: TikTokConnector;
  let mockConnectorConfigService: jest.Mocked<ConnectorConfigService>;
  let mockConfigService: jest.Mocked<ConfigService>;
  let mockTikTokOAuthService: jest.Mocked<TikTokOAuthService>;

  const mockConfig = {
    id: 'test-config-id',
    name: 'Test TikTok Config',
    type: 'tiktok',
    category: 'social',
    credentials: {
      accessToken: 'mock-tiktok-access-token',
      refreshToken: 'mock-tiktok-refresh-token',
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
    },
    settings: {},
  } as any;

  beforeEach(async () => {
    jest.clearAllMocks();

    mockConnectorConfigService = {
      updateRefreshedTokens: jest.fn().mockResolvedValue(undefined),
    } as any;

    mockConfigService = {
      get: jest.fn().mockReturnValue('http://localhost:3000'),
    } as any;

    mockTikTokOAuthService = {
      refreshAccessToken: jest.fn().mockResolvedValue({
        access_token: 'new-access-token',
        refresh_token: 'new-refresh-token',
        expires_in: 86400,
      }),
    } as any;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TikTokConnector,
        { provide: ConnectorConfigService, useValue: mockConnectorConfigService },
        { provide: ConfigService, useValue: mockConfigService },
        { provide: TikTokOAuthService, useValue: mockTikTokOAuthService },
      ],
    }).compile();

    connector = module.get<TikTokConnector>(TikTokConnector);
  });

  describe('Metadata', () => {
    it('should return correct metadata', () => {
      const metadata = connector.getMetadata();

      expect(metadata.name).toBe('TikTok');
      expect(metadata.description).toContain('TikTok');
      expect(metadata.version).toBe('1.0.0');
      expect(metadata.category).toBe('social');
      expect(metadata.type).toBe('tiktok');
      expect(metadata.authType).toBe('oauth2');
      expect(metadata.webhookSupport).toBe(false);
    });

    it('should return 4 actions', () => {
      const metadata = connector.getMetadata();
      expect(metadata.actions).toHaveLength(4);
    });

    it('should return 1 trigger', () => {
      const metadata = connector.getMetadata();
      expect(metadata.triggers).toHaveLength(1);
    });

    it('should include all expected action IDs', () => {
      const metadata = connector.getMetadata();
      const actionIds = metadata.actions.map((a) => a.id);

      expect(actionIds).toContain('post_video');
      expect(actionIds).toContain('get_videos');
      expect(actionIds).toContain('get_profile');
      expect(actionIds).toContain('get_creator_info');
    });

    it('should include the new_video trigger', () => {
      const metadata = connector.getMetadata();
      const triggerIds = metadata.triggers.map((t) => t.id);

      expect(triggerIds).toContain('new_video');
    });
  });

  describe('Connector-Definition Sync', () => {
    it('should have all connector actions in definition', () => {
      const metadata = connector.getMetadata();
      const connectorActionIds = metadata.actions.map((a) => a.id);
      const definitionActionIds = TIKTOK_CONNECTOR.supported_actions?.map((a) => a.id) || [];

      for (const actionId of connectorActionIds) {
        expect(definitionActionIds).toContain(actionId);
      }
    });

    it('should have matching name in connector and definition', () => {
      const metadata = connector.getMetadata();
      expect(metadata.name).toBe(TIKTOK_CONNECTOR.display_name);
    });

    it('should have matching category in connector and definition', () => {
      const metadata = connector.getMetadata();
      expect(metadata.category).toBe(TIKTOK_CONNECTOR.category);
    });

    it('should have matching triggers in definition', () => {
      const metadata = connector.getMetadata();
      const connectorTriggerIds = metadata.triggers.map((t) => t.id);
      const definitionTriggerIds = TIKTOK_CONNECTOR.supported_triggers?.map((t) => t.id) || [];

      for (const triggerId of connectorTriggerIds) {
        expect(definitionTriggerIds).toContain(triggerId);
      }
    });
  });

  describe('initialize', () => {
    it('should initialize successfully with valid credentials', async () => {
      await expect(connector.initialize(mockConfig)).resolves.not.toThrow();
    });

    it('should throw error if credentials are missing', async () => {
      const invalidConfig = {
        ...mockConfig,
        credentials: null,
      };

      await expect(connector.initialize(invalidConfig)).rejects.toThrow(
        'Invalid connector configuration: missing required fields',
      );
    });

    it('should throw error if access token is missing', async () => {
      const invalidConfig = {
        ...mockConfig,
        credentials: {
          refreshToken: 'mock-refresh-token',
          expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
        },
      };

      await expect(connector.initialize(invalidConfig)).rejects.toThrow(
        'Missing required TikTok OAuth2 access token',
      );
    });

    it('should refresh token if expired', async () => {
      const expiredConfig = {
        ...mockConfig,
        credentials: {
          accessToken: 'mock-expired-token',
          refreshToken: 'mock-refresh-token',
          expiresAt: new Date(Date.now() - 1000).toISOString(), // Expired
        },
      };

      await connector.initialize(expiredConfig);

      expect(mockTikTokOAuthService.refreshAccessToken).toHaveBeenCalledWith('mock-refresh-token');
    });

    it('should refresh token if expiring within 5 minutes', async () => {
      const expiringConfig = {
        ...mockConfig,
        credentials: {
          accessToken: 'mock-expiring-token',
          refreshToken: 'mock-refresh-token',
          expiresAt: new Date(Date.now() + 2 * 60 * 1000).toISOString(), // Expires in 2 minutes
        },
      };

      await connector.initialize(expiringConfig);

      expect(mockTikTokOAuthService.refreshAccessToken).toHaveBeenCalled();
    });
  });

  describe('testConnection', () => {
    it('should return success for valid connection', async () => {
      mockedAxios.get = jest.fn().mockResolvedValueOnce({
        data: {
          data: {
            user: {
              open_id: 'test-open-id',
              display_name: 'Test User',
            },
          },
        },
      });

      await connector.initialize(mockConfig);
      const result = await connector.testConnection();

      expect(result.success).toBe(true);
    });

    it('should return failure for invalid connection', async () => {
      mockedAxios.get = jest.fn().mockRejectedValueOnce(new Error('Unauthorized'));

      await connector.initialize(mockConfig);
      const result = await connector.testConnection();

      expect(result.success).toBe(false);
    });
  });

  describe('Action: get_profile', () => {
    it('should get user profile', async () => {
      const mockProfile = {
        data: {
          user: {
            open_id: 'test-open-id',
            display_name: 'Test User',
            avatar_url: 'https://example.com/avatar.jpg',
            follower_count: 1000,
            following_count: 500,
            likes_count: 5000,
            video_count: 50,
          },
        },
      };

      mockedAxios.get = jest.fn().mockResolvedValueOnce({ data: mockProfile });

      await connector.initialize(mockConfig);
      const result = await connector.executeAction('get_profile', {});

      expect(result.success).toBe(true);
      expect(mockedAxios.get).toHaveBeenCalledWith(
        expect.stringContaining('/user/info/'),
        expect.objectContaining({
          headers: expect.objectContaining({
            Authorization: 'Bearer mock-tiktok-access-token',
          }),
        }),
      );
    });
  });

  describe('Action: get_videos', () => {
    it('should get videos list', async () => {
      const mockVideos = {
        data: {
          videos: [
            { id: 'video1', title: 'Test Video 1' },
            { id: 'video2', title: 'Test Video 2' },
          ],
          cursor: 12345,
          has_more: true,
        },
      };

      mockedAxios.post = jest.fn().mockResolvedValueOnce({ data: mockVideos });

      await connector.initialize(mockConfig);
      const result = await connector.executeAction('get_videos', {
        maxCount: 10,
      });

      expect(result.success).toBe(true);
      expect(mockedAxios.post).toHaveBeenCalledWith(
        expect.stringContaining('/video/list/'),
        expect.objectContaining({
          max_count: 10,
        }),
        expect.any(Object),
      );
    });

    it('should handle pagination with cursor', async () => {
      const mockVideos = {
        data: {
          videos: [{ id: 'video3', title: 'Test Video 3' }],
          cursor: 67890,
          has_more: false,
        },
      };

      mockedAxios.post = jest.fn().mockResolvedValueOnce({ data: mockVideos });

      await connector.initialize(mockConfig);
      const result = await connector.executeAction('get_videos', {
        cursor: '12345',
        maxCount: 5,
      });

      expect(result.success).toBe(true);
      expect(mockedAxios.post).toHaveBeenCalledWith(
        expect.stringContaining('/video/list/'),
        expect.objectContaining({
          cursor: 12345,
          max_count: 5,
        }),
        expect.any(Object),
      );
    });

    it('should limit maxCount to 20', async () => {
      const mockVideos = {
        data: {
          videos: [],
          has_more: false,
        },
      };

      mockedAxios.post = jest.fn().mockResolvedValueOnce({ data: mockVideos });

      await connector.initialize(mockConfig);
      await connector.executeAction('get_videos', {
        maxCount: 100, // Exceeds limit
      });

      expect(mockedAxios.post).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          max_count: 20, // Should be capped at 20
        }),
        expect.any(Object),
      );
    });
  });

  describe('Action: get_creator_info', () => {
    it('should get creator info', async () => {
      const mockCreatorInfo = {
        data: {
          creator_avatar_url: 'https://example.com/avatar.jpg',
          creator_username: 'testuser',
          creator_nickname: 'Test User',
          privacy_level_options: ['PUBLIC_TO_EVERYONE', 'SELF_ONLY'],
          comment_disabled: false,
          duet_disabled: false,
          stitch_disabled: false,
          max_video_post_duration_sec: 600,
        },
      };

      mockedAxios.post = jest.fn().mockResolvedValueOnce({ data: mockCreatorInfo });

      await connector.initialize(mockConfig);
      const result = await connector.executeAction('get_creator_info', {});

      expect(result.success).toBe(true);
      expect(mockedAxios.post).toHaveBeenCalledWith(
        expect.stringContaining('/post/publish/creator_info/query/'),
        {},
        expect.any(Object),
      );
    });
  });

  describe('Action: post_video', () => {
    it('should initiate video upload', async () => {
      // Mock get creator info first
      const mockCreatorInfo = {
        data: {
          privacy_level_options: ['PUBLIC_TO_EVERYONE', 'SELF_ONLY'],
          duet_disabled: false,
          stitch_disabled: false,
        },
      };

      // Mock video init response
      const mockInitResponse = {
        data: {
          publish_id: 'publish123',
        },
      };

      // Mock status response
      const mockStatusResponse = {
        data: {
          status: 'PUBLISH_COMPLETE',
        },
      };

      mockedAxios.post = jest.fn()
        .mockResolvedValueOnce({ data: mockCreatorInfo }) // Creator info
        .mockResolvedValueOnce({ data: mockInitResponse }) // Video init
        .mockResolvedValueOnce({ data: mockStatusResponse }); // Status check

      await connector.initialize(mockConfig);
      const result = await connector.executeAction('post_video', {
        videoUrl: 'https://example.com/video.mp4',
        title: 'Test Video',
        privacyLevel: 'PUBLIC_TO_EVERYONE',
      });

      expect(result.success).toBe(true);
      expect(result.data.publish_id).toBe('publish123');
    });

    it('should throw error if videoUrl is missing', async () => {
      await connector.initialize(mockConfig);
      const result = await connector.executeAction('post_video', {
        title: 'Test Video',
      });

      expect(result.success).toBe(false);
      expect(result.error?.message).toContain('Video URL is required');
    });
  });

  describe('Unknown Action', () => {
    it('should handle unknown action gracefully', async () => {
      await connector.initialize(mockConfig);
      const result = await connector.executeAction('unknown_action', {});

      expect(result.success).toBe(false);
      expect(result.error?.message).toContain('Unknown action');
    });
  });

  describe('OAuth Token Handling', () => {
    it('should use Bearer token for authorization', async () => {
      const mockProfile = {
        data: {
          user: {
            open_id: 'test-open-id',
          },
        },
      };

      mockedAxios.get = jest.fn().mockResolvedValueOnce({ data: mockProfile });

      await connector.initialize(mockConfig);
      await connector.executeAction('get_profile', {});

      const callArgs = mockedAxios.get.mock.calls[0] as any;
      expect(callArgs[1].headers.Authorization).toBe('Bearer mock-tiktok-access-token');
    });

    it('should persist refreshed tokens to database', async () => {
      const expiredConfig = {
        ...mockConfig,
        credentials: {
          accessToken: 'mock-expired-token',
          refreshToken: 'mock-refresh-token',
          expiresAt: new Date(Date.now() - 1000).toISOString(),
        },
      };

      await connector.initialize(expiredConfig);

      expect(mockConnectorConfigService.updateRefreshedTokens).toHaveBeenCalledWith(
        'test-config-id',
        expect.objectContaining({
          accessToken: 'new-access-token',
          refreshToken: 'new-refresh-token',
        }),
      );
    });

    it('should decrypt encrypted tokens from OAuth flow', async () => {
      // Simulate encrypted token format (iv:encrypted)
      const encryptedAccessToken = 'a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4:encryptedtokendata';
      const encryptedRefreshToken = 'f6e5d4c3b2a1f6e5d4c3b2a1f6e5d4c3:encryptedrefreshdata';

      mockTikTokOAuthService.decryptToken = jest.fn()
        .mockReturnValueOnce('decrypted-access-token')
        .mockReturnValueOnce('decrypted-refresh-token');

      const encryptedConfig = {
        ...mockConfig,
        credentials: {
          accessToken: encryptedAccessToken,
          refreshToken: encryptedRefreshToken,
          expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
        },
      };

      await connector.initialize(encryptedConfig);

      expect(mockTikTokOAuthService.decryptToken).toHaveBeenCalledWith(encryptedAccessToken);
      expect(mockTikTokOAuthService.decryptToken).toHaveBeenCalledWith(encryptedRefreshToken);
    });

    it('should not decrypt plain text tokens', async () => {
      mockTikTokOAuthService.decryptToken = jest.fn();

      const plainConfig = {
        ...mockConfig,
        credentials: {
          accessToken: 'plain-access-token-without-encryption',
          refreshToken: 'plain-refresh-token-without-encryption',
          expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
        },
      };

      await connector.initialize(plainConfig);

      // decryptToken should not be called for plain text tokens
      expect(mockTikTokOAuthService.decryptToken).not.toHaveBeenCalled();
    });
  });

  describe('Error Handling', () => {
    it('should handle API errors gracefully', async () => {
      mockedAxios.get = jest.fn().mockRejectedValueOnce({
        response: {
          data: {
            error: {
              message: 'API rate limit exceeded',
            },
          },
        },
      });

      await connector.initialize(mockConfig);
      const result = await connector.executeAction('get_profile', {});

      expect(result.success).toBe(false);
    });

    it('should handle network errors', async () => {
      mockedAxios.get = jest.fn().mockRejectedValueOnce(new Error('Network error'));

      await connector.initialize(mockConfig);
      const result = await connector.executeAction('get_profile', {});

      expect(result.success).toBe(false);
      expect(result.error?.message).toContain('Network error');
    });
  });

  describe('Unsupported Operations', () => {
    it('should return not implemented for getConnections', async () => {
      await connector.initialize(mockConfig);
      const result = await connector.getConnections('followers');

      expect(result.success).toBe(false);
      expect(result.error?.code).toBe('NOT_IMPLEMENTED');
    });

    it('should return not supported for schedulePost', async () => {
      await connector.initialize(mockConfig);
      const result = await connector.schedulePost({}, new Date());

      expect(result.success).toBe(false);
      expect(result.error?.code).toBe('NOT_SUPPORTED');
    });
  });
});
