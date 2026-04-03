/**
 * Discourse Connector Tests
 *
 * Behavioral tests that verify forum operations, API calls, and connections.
 */

import { Test, TestingModule } from '@nestjs/testing';
import { DiscourseConnector } from '../discourse.connector';
import { DISCOURSE_CONNECTOR } from '../discourse.definition';
import { AuthUtils } from '../../../utils/auth.utils';
import { ApiUtils } from '../../../utils/api.utils';

// Mock ApiUtils
const mockApiUtils = {
  executeRequest: jest.fn(),
};

// Mock AuthUtils
const mockAuthUtils = {
  createApiKeyHeader: jest.fn(),
};

describe('DiscourseConnector', () => {
  let connector: DiscourseConnector;

  const mockConfig = {
    id: 'test-config-id',
    name: 'Test Discourse Config',
    type: 'discourse',
    category: 'communication',
    credentials: {
      url: 'https://discourse.example.com',
      apiKey: 'test-api-key',
      username: 'test-username',
    },
    settings: {},
  } as any;

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DiscourseConnector,
        { provide: AuthUtils, useValue: mockAuthUtils },
        { provide: ApiUtils, useValue: mockApiUtils },
      ],
    }).compile();

    connector = module.get<DiscourseConnector>(DiscourseConnector);
  });

  describe('Metadata', () => {
    it('should return correct metadata', () => {
      const metadata = connector.getMetadata();

      expect(metadata.name).toBe('Discourse');
      expect(metadata.description).toContain('discussion platform');
      expect(metadata.version).toBe('1.0.0');
      expect(metadata.category).toBe('communication');
      expect(metadata.type).toBe('discourse');
      expect(metadata.authType).toBe('api_key');
      expect(metadata.webhookSupport).toBe(false);
    });

    it('should return 16 actions', () => {
      const metadata = connector.getMetadata();
      expect(metadata.actions).toHaveLength(16);
    });

    it('should return 0 triggers', () => {
      const metadata = connector.getMetadata();
      expect(metadata.triggers).toHaveLength(0);
    });

    it('should include all Category action IDs', () => {
      const metadata = connector.getMetadata();
      const actionIds = metadata.actions.map((a) => a.id);

      expect(actionIds).toContain('create_category');
      expect(actionIds).toContain('get_all_categories');
      expect(actionIds).toContain('update_category');
    });

    it('should include all Group action IDs', () => {
      const metadata = connector.getMetadata();
      const actionIds = metadata.actions.map((a) => a.id);

      expect(actionIds).toContain('create_group');
      expect(actionIds).toContain('get_group');
      expect(actionIds).toContain('get_all_groups');
      expect(actionIds).toContain('update_group');
    });

    it('should include all Post action IDs', () => {
      const metadata = connector.getMetadata();
      const actionIds = metadata.actions.map((a) => a.id);

      expect(actionIds).toContain('create_post');
      expect(actionIds).toContain('get_post');
      expect(actionIds).toContain('get_all_posts');
      expect(actionIds).toContain('update_post');
    });

    it('should include all User action IDs', () => {
      const metadata = connector.getMetadata();
      const actionIds = metadata.actions.map((a) => a.id);

      expect(actionIds).toContain('create_user');
      expect(actionIds).toContain('get_user');
      expect(actionIds).toContain('get_all_users');
    });

    it('should include all User Group action IDs', () => {
      const metadata = connector.getMetadata();
      const actionIds = metadata.actions.map((a) => a.id);

      expect(actionIds).toContain('add_user_to_group');
      expect(actionIds).toContain('remove_user_from_group');
    });
  });

  describe('Connector-Definition Sync', () => {
    it('should have all connector actions in definition', () => {
      const metadata = connector.getMetadata();
      const connectorActionIds = metadata.actions.map((a) => a.id);
      const definitionActionIds = DISCOURSE_CONNECTOR.supported_actions?.map((a) => a.id) || [];

      for (const actionId of connectorActionIds) {
        expect(definitionActionIds).toContain(actionId);
      }
    });

    it('should have matching name in connector and definition', () => {
      const metadata = connector.getMetadata();
      expect(metadata.name).toBe(DISCOURSE_CONNECTOR.display_name);
    });

    it('should have matching category in connector and definition', () => {
      const metadata = connector.getMetadata();
      expect(metadata.category).toBe(DISCOURSE_CONNECTOR.category);
    });
  });

  describe('initialize', () => {
    it('should initialize successfully with valid credentials', async () => {
      await expect(connector.initialize(mockConfig)).resolves.not.toThrow();
    });

    it('should throw error if URL is missing', async () => {
      const invalidConfig = {
        ...mockConfig,
        credentials: { apiKey: 'test-key', username: 'test-user' },
      };

      await expect(connector.initialize(invalidConfig)).rejects.toThrow(
        'URL is required',
      );
    });

    it('should throw error if API key is missing', async () => {
      const invalidConfig = {
        ...mockConfig,
        credentials: { url: 'https://example.com', username: 'test-user' },
      };

      await expect(connector.initialize(invalidConfig)).rejects.toThrow(
        'API key is required',
      );
    });

    it('should throw error if username is missing', async () => {
      const invalidConfig = {
        ...mockConfig,
        credentials: { url: 'https://example.com', apiKey: 'test-key' },
      };

      await expect(connector.initialize(invalidConfig)).rejects.toThrow(
        'Username is required',
      );
    });
  });

  describe('testConnection', () => {
    it('should return success for valid connection', async () => {
      mockApiUtils.executeRequest.mockResolvedValueOnce({
        data: { groups: [{ id: 1, name: 'admins' }] },
      });

      await connector.initialize(mockConfig);
      const result = await connector.testConnection();

      expect(result.success).toBe(true);
      expect(mockApiUtils.executeRequest).toHaveBeenCalledWith(
        expect.objectContaining({
          method: 'GET',
          endpoint: expect.stringContaining('/groups.json'),
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

  describe('Action: create_category', () => {
    it('should create category', async () => {
      const mockCategory = {
        category: { id: 1, name: 'Test Category', color: '0000FF' },
      };

      mockApiUtils.executeRequest.mockResolvedValueOnce({ data: mockCategory });

      await connector.initialize(mockConfig);
      const result = await connector.executeAction('create_category', {
        name: 'Test Category',
        color: '0000FF',
        textColor: 'FFFFFF',
      });

      expect(result.success).toBe(true);
      expect(mockApiUtils.executeRequest).toHaveBeenCalledWith(
        expect.objectContaining({
          method: 'POST',
          endpoint: expect.stringContaining('/categories.json'),
        }),
      );
    });
  });

  describe('Action: get_all_categories', () => {
    it('should get all categories', async () => {
      const mockCategories = {
        category_list: {
          categories: [
            { id: 1, name: 'Category 1' },
            { id: 2, name: 'Category 2' },
          ],
        },
      };

      mockApiUtils.executeRequest.mockResolvedValueOnce({ data: mockCategories });

      await connector.initialize(mockConfig);
      const result = await connector.executeAction('get_all_categories', {
        limit: 10,
      });

      expect(result.success).toBe(true);
    });
  });

  describe('Action: create_group', () => {
    it('should create group', async () => {
      const mockGroup = { basic_group: { id: 1, name: 'Test Group' } };

      mockApiUtils.executeRequest.mockResolvedValueOnce({ data: mockGroup });

      await connector.initialize(mockConfig);
      const result = await connector.executeAction('create_group', {
        name: 'Test Group',
      });

      expect(result.success).toBe(true);
      expect(mockApiUtils.executeRequest).toHaveBeenCalledWith(
        expect.objectContaining({
          method: 'POST',
          endpoint: expect.stringContaining('/admin/groups.json'),
        }),
      );
    });
  });

  describe('Action: create_post', () => {
    it('should create post', async () => {
      const mockPost = { id: 1, raw: 'Test content', topic_id: 123 };

      mockApiUtils.executeRequest.mockResolvedValueOnce({ data: mockPost });

      await connector.initialize(mockConfig);
      const result = await connector.executeAction('create_post', {
        content: 'Test content',
        title: 'Test Title',
        category: '1',
      });

      expect(result.success).toBe(true);
      expect(mockApiUtils.executeRequest).toHaveBeenCalledWith(
        expect.objectContaining({
          method: 'POST',
          endpoint: expect.stringContaining('/posts.json'),
        }),
      );
    });
  });

  describe('Action: get_post', () => {
    it('should get post by ID', async () => {
      const mockPost = { id: 123, raw: 'Post content' };

      mockApiUtils.executeRequest.mockResolvedValueOnce({ data: mockPost });

      await connector.initialize(mockConfig);
      const result = await connector.executeAction('get_post', {
        postId: '123',
      });

      expect(result.success).toBe(true);
      expect(mockApiUtils.executeRequest).toHaveBeenCalledWith(
        expect.objectContaining({
          method: 'GET',
          endpoint: expect.stringContaining('/posts/123'),
        }),
      );
    });
  });

  describe('Action: create_user', () => {
    it('should create user', async () => {
      const mockUser = { user_id: 1, username: 'newuser' };

      mockApiUtils.executeRequest.mockResolvedValueOnce({ data: mockUser });

      await connector.initialize(mockConfig);
      const result = await connector.executeAction('create_user', {
        name: 'New User',
        email: 'newuser@example.com',
        username: 'newuser',
        password: 'securepassword123',
      });

      expect(result.success).toBe(true);
      expect(mockApiUtils.executeRequest).toHaveBeenCalledWith(
        expect.objectContaining({
          method: 'POST',
          endpoint: expect.stringContaining('/users.json'),
        }),
      );
    });
  });

  describe('Action: add_user_to_group', () => {
    it('should add user to group', async () => {
      mockApiUtils.executeRequest.mockResolvedValueOnce({ data: {} });

      await connector.initialize(mockConfig);
      const result = await connector.executeAction('add_user_to_group', {
        groupId: '123',
        usernames: 'user1,user2',
      });

      expect(result.success).toBe(true);
      expect(mockApiUtils.executeRequest).toHaveBeenCalledWith(
        expect.objectContaining({
          method: 'PUT',
          endpoint: expect.stringContaining('/groups/123/members.json'),
        }),
      );
    });
  });

  describe('Action: remove_user_from_group', () => {
    it('should remove user from group', async () => {
      mockApiUtils.executeRequest.mockResolvedValueOnce({ data: {} });

      await connector.initialize(mockConfig);
      const result = await connector.executeAction('remove_user_from_group', {
        groupId: '123',
        usernames: 'user1',
      });

      expect(result.success).toBe(true);
      expect(mockApiUtils.executeRequest).toHaveBeenCalledWith(
        expect.objectContaining({
          method: 'DELETE',
          endpoint: expect.stringContaining('/groups/123/members.json'),
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

  describe('Authentication Headers', () => {
    it('should use Api-Key and Api-Username headers', async () => {
      mockApiUtils.executeRequest.mockResolvedValueOnce({ data: { groups: [] } });

      await connector.initialize(mockConfig);
      await connector.testConnection();

      const callArgs = mockApiUtils.executeRequest.mock.calls[0][0];
      expect(callArgs.headers['Api-Key']).toBe('test-api-key');
      expect(callArgs.headers['Api-Username']).toBe('test-username');
    });
  });

  describe('Error Handling', () => {
    it('should handle API errors gracefully', async () => {
      mockApiUtils.executeRequest.mockRejectedValueOnce(
        new Error('API rate limit exceeded'),
      );

      await connector.initialize(mockConfig);
      const result = await connector.executeAction('get_all_categories', {});

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });
  });
});
