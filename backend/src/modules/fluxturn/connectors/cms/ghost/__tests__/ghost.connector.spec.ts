/**
 * Ghost Connector Tests
 *
 * Behavioral tests that verify CMS publishing operations, API calls, and connections.
 */

import { Test, TestingModule } from '@nestjs/testing';
import { GhostConnector } from '../ghost.connector';
import { GHOST_CONNECTOR } from '../ghost.definition';
import axios from 'axios';

// Mock axios as a function
jest.mock('axios');
const mockedAxios = jest.mocked(axios);

// Mock jsonwebtoken
jest.mock('jsonwebtoken', () => ({
  sign: jest.fn().mockReturnValue('mock-jwt-token'),
}));

describe('GhostConnector', () => {
  let connector: GhostConnector;

  const mockConfig = {
    id: 'test-config-id',
    name: 'Test Ghost Config',
    type: 'ghost',
    category: 'cms',
    credentials: {
      url: 'https://myblog.ghost.io',
      apiKey: 'mockid123:mocksecret456',
      source: 'adminApi',
    },
    settings: {},
  } as any;

  const mockContentApiConfig = {
    ...mockConfig,
    credentials: {
      url: 'https://myblog.ghost.io',
      apiKey: 'content-api-key',
      source: 'contentApi',
    },
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [GhostConnector],
    }).compile();

    connector = module.get<GhostConnector>(GhostConnector);
  });

  describe('Metadata', () => {
    it('should return correct metadata', () => {
      const metadata = connector.getMetadata();

      expect(metadata.name).toBe('Ghost');
      expect(metadata.description).toContain('publishing platform');
      expect(metadata.version).toBe('1.0.0');
      expect(metadata.category).toBe('cms');
      expect(metadata.type).toBe('ghost');
      expect(metadata.authType).toBe('custom');
      expect(metadata.webhookSupport).toBe(false);
    });

    it('should return 5 actions', () => {
      const metadata = connector.getMetadata();
      expect(metadata.actions).toHaveLength(5);
    });

    it('should return 0 triggers', () => {
      const metadata = connector.getMetadata();
      expect(metadata.triggers).toHaveLength(0);
    });

    it('should include all expected action IDs', () => {
      const metadata = connector.getMetadata();
      const actionIds = metadata.actions.map((a) => a.id);

      expect(actionIds).toContain('get_post');
      expect(actionIds).toContain('get_all_posts');
      expect(actionIds).toContain('create_post');
      expect(actionIds).toContain('update_post');
      expect(actionIds).toContain('delete_post');
    });
  });

  describe('Connector-Definition Sync', () => {
    it('should have all connector actions in definition', () => {
      const metadata = connector.getMetadata();
      const connectorActionIds = metadata.actions.map((a) => a.id);
      const definitionActionIds = GHOST_CONNECTOR.supported_actions?.map((a) => a.id) || [];

      for (const actionId of connectorActionIds) {
        expect(definitionActionIds).toContain(actionId);
      }
    });

    it('should have matching name in connector and definition', () => {
      const metadata = connector.getMetadata();
      expect(metadata.name).toBe(GHOST_CONNECTOR.display_name);
    });

    it('should have matching category in connector and definition', () => {
      const metadata = connector.getMetadata();
      expect(metadata.category).toBe(GHOST_CONNECTOR.category);
    });
  });

  describe('initialize', () => {
    it('should initialize successfully with valid credentials', async () => {
      await expect(connector.initialize(mockConfig)).resolves.not.toThrow();
    });

    it('should throw error if URL is missing', async () => {
      const invalidConfig = {
        ...mockConfig,
        credentials: { apiKey: 'test-key', source: 'adminApi' },
      };

      await expect(connector.initialize(invalidConfig)).rejects.toThrow(
        'Ghost site URL is required',
      );
    });

    it('should throw error if API key is missing', async () => {
      const invalidConfig = {
        ...mockConfig,
        credentials: { url: 'https://example.com', source: 'adminApi' },
      };

      await expect(connector.initialize(invalidConfig)).rejects.toThrow(
        'API key is required',
      );
    });

    it('should throw error if source is missing', async () => {
      const invalidConfig = {
        ...mockConfig,
        credentials: { url: 'https://example.com', apiKey: 'test-key' },
      };

      await expect(connector.initialize(invalidConfig)).rejects.toThrow(
        'API source is required',
      );
    });
  });

  describe('testConnection', () => {
    it('should return success for valid connection', async () => {
      mockedAxios.mockResolvedValueOnce({
        data: { posts: [{ id: '1', title: 'Test' }] },
      });

      await connector.initialize(mockConfig);
      const result = await connector.testConnection();

      expect(result.success).toBe(true);
    });

    it('should return failure for invalid connection', async () => {
      mockedAxios.mockRejectedValueOnce(new Error('Unauthorized'));

      await connector.initialize(mockConfig);
      const result = await connector.testConnection();

      expect(result.success).toBe(false);
    });
  });

  describe('Action: get_post', () => {
    it('should get post by ID', async () => {
      const mockPost = {
        posts: [{ id: 'post123', title: 'Test Post', slug: 'test-post' }],
      };

      mockedAxios.mockResolvedValueOnce({ data: mockPost });

      await connector.initialize(mockConfig);
      const result = await connector.executeAction('get_post', {
        by: 'id',
        identifier: 'post123',
      });

      expect(result.success).toBe(true);
      expect(mockedAxios).toHaveBeenCalledWith(
        expect.objectContaining({
          method: 'GET',
          url: expect.stringContaining('/posts/post123'),
        }),
      );
    });

    it('should get post by slug', async () => {
      const mockPost = {
        posts: [{ id: 'post123', title: 'Test Post', slug: 'test-post' }],
      };

      mockedAxios.mockResolvedValueOnce({ data: mockPost });

      await connector.initialize(mockConfig);
      const result = await connector.executeAction('get_post', {
        by: 'slug',
        identifier: 'test-post',
      });

      expect(result.success).toBe(true);
      expect(mockedAxios).toHaveBeenCalledWith(
        expect.objectContaining({
          url: expect.stringContaining('/posts/slug/test-post'),
        }),
      );
    });
  });

  describe('Action: get_all_posts', () => {
    it('should get all posts with limit', async () => {
      const mockPosts = {
        posts: [
          { id: '1', title: 'Post 1' },
          { id: '2', title: 'Post 2' },
        ],
      };

      mockedAxios.mockResolvedValueOnce({ data: mockPosts });

      await connector.initialize(mockConfig);
      const result = await connector.executeAction('get_all_posts', {
        limit: 10,
      });

      expect(result.success).toBe(true);
      expect(mockedAxios).toHaveBeenCalledWith(
        expect.objectContaining({
          method: 'GET',
          url: expect.stringContaining('/posts'),
        }),
      );
    });
  });

  describe('Action: create_post', () => {
    it('should create post with HTML content', async () => {
      const mockPost = {
        posts: [{ id: 'newpost', title: 'New Post', slug: 'new-post' }],
      };

      mockedAxios.mockResolvedValueOnce({ data: mockPost });

      await connector.initialize(mockConfig);
      const result = await connector.executeAction('create_post', {
        title: 'New Post',
        content: '<h1>Hello World</h1>',
        contentFormat: 'html',
        status: 'draft',
      });

      expect(result.success).toBe(true);
      expect(mockedAxios).toHaveBeenCalledWith(
        expect.objectContaining({
          method: 'POST',
          url: expect.stringContaining('/posts'),
        }),
      );
    });

    it('should create post with lexical content', async () => {
      const mockPost = {
        posts: [{ id: 'newpost', title: 'New Post' }],
      };

      mockedAxios.mockResolvedValueOnce({ data: mockPost });

      await connector.initialize(mockConfig);
      const result = await connector.executeAction('create_post', {
        title: 'New Post',
        content: '{"root":{}}',
        contentFormat: 'lexical',
      });

      expect(result.success).toBe(true);
    });
  });

  describe('Action: update_post', () => {
    it('should update post', async () => {
      // First call to get current post for updated_at
      const mockCurrentPost = {
        posts: [{ id: 'post123', updated_at: '2024-01-01T00:00:00Z' }],
      };
      // Second call for the update
      const mockUpdatedPost = {
        posts: [{ id: 'post123', title: 'Updated Title' }],
      };

      mockedAxios
        .mockResolvedValueOnce({ data: mockCurrentPost })
        .mockResolvedValueOnce({ data: mockUpdatedPost });

      await connector.initialize(mockConfig);
      const result = await connector.executeAction('update_post', {
        postId: 'post123',
        title: 'Updated Title',
        contentFormat: 'html',
      });

      expect(result.success).toBe(true);
      expect(mockedAxios).toHaveBeenCalledTimes(2);
    });
  });

  describe('Action: delete_post', () => {
    it('should delete post', async () => {
      mockedAxios.mockResolvedValueOnce({ data: {} });

      await connector.initialize(mockConfig);
      const result = await connector.executeAction('delete_post', {
        postId: 'post123',
      });

      expect(result.success).toBe(true);
      expect(mockedAxios).toHaveBeenCalledWith(
        expect.objectContaining({
          method: 'DELETE',
          url: expect.stringContaining('/posts/post123'),
        }),
      );
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

  describe('Authentication', () => {
    it('should use JWT token for Admin API', async () => {
      mockedAxios.mockResolvedValueOnce({
        data: { posts: [] },
      });

      await connector.initialize(mockConfig);
      await connector.testConnection();

      const callArgs = mockedAxios.mock.calls[0][0] as any;
      expect(callArgs.headers?.Authorization).toContain('Ghost');
    });

    it('should use API key query param for Content API', async () => {
      mockedAxios.mockResolvedValueOnce({
        data: { posts: [{ id: '1' }] },
      });

      await connector.initialize(mockContentApiConfig);
      const result = await connector.executeAction('get_post', {
        by: 'id',
        identifier: 'post123',
      });

      expect(result.success).toBe(true);
      const callArgs = mockedAxios.mock.calls[0][0] as any;
      expect(callArgs.params?.key).toBe('content-api-key');
    });
  });

  describe('Error Handling', () => {
    it('should handle API errors gracefully', async () => {
      mockedAxios.mockRejectedValueOnce(new Error('API rate limit exceeded'));

      await connector.initialize(mockConfig);

      // Should not throw - connector handles errors internally
      await expect(
        connector.executeAction('get_all_posts', {}),
      ).resolves.toBeDefined();
    });
  });
});
