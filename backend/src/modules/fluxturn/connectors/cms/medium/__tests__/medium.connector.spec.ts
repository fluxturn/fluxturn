/**
 * Medium Connector Tests
 *
 * Behavioral tests that verify publishing operations, API calls, and connections.
 */

import { Test, TestingModule } from '@nestjs/testing';
import { MediumConnector } from '../medium.connector';
import { MEDIUM_CONNECTOR } from '../medium.definition';
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

describe('MediumConnector', () => {
  let connector: MediumConnector;

  const mockConfig = {
    id: 'test-config-id',
    name: 'Test Medium Config',
    type: 'medium',
    category: 'cms',
    credentials: {
      accessToken: 'test-access-token',
    },
    settings: {},
  } as any;

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MediumConnector,
        { provide: AuthUtils, useValue: mockAuthUtils },
        { provide: ApiUtils, useValue: mockApiUtils },
      ],
    }).compile();

    connector = module.get<MediumConnector>(MediumConnector);
  });

  describe('Metadata', () => {
    it('should return correct metadata', () => {
      const metadata = connector.getMetadata();

      expect(metadata.name).toBe('Medium');
      expect(metadata.description).toContain('Publish');
      expect(metadata.version).toBe('1.0.0');
      expect(metadata.category).toBe('cms');
      expect(metadata.type).toBe('medium');
      expect(metadata.authType).toBe('bearer_token');
      expect(metadata.webhookSupport).toBe(false);
    });

    it('should return 3 actions', () => {
      const metadata = connector.getMetadata();
      expect(metadata.actions).toHaveLength(3);
    });

    it('should return 0 triggers', () => {
      const metadata = connector.getMetadata();
      expect(metadata.triggers).toHaveLength(0);
    });

    it('should include all expected action IDs', () => {
      const metadata = connector.getMetadata();
      const actionIds = metadata.actions.map((a) => a.id);

      expect(actionIds).toContain('create_post');
      expect(actionIds).toContain('get_all_publications');
      expect(actionIds).toContain('get_user');
    });
  });

  describe('Connector-Definition Sync', () => {
    it('should have all connector actions in definition', () => {
      const metadata = connector.getMetadata();
      const connectorActionIds = metadata.actions.map((a) => a.id);
      const definitionActionIds = MEDIUM_CONNECTOR.supported_actions?.map((a) => a.id) || [];

      for (const actionId of connectorActionIds) {
        expect(definitionActionIds).toContain(actionId);
      }
    });

    it('should have matching name in connector and definition', () => {
      const metadata = connector.getMetadata();
      expect(metadata.name).toBe(MEDIUM_CONNECTOR.display_name);
    });

    it('should have matching category in connector and definition', () => {
      const metadata = connector.getMetadata();
      expect(metadata.category).toBe(MEDIUM_CONNECTOR.category);
    });
  });

  describe('initialize', () => {
    it('should initialize successfully with valid credentials', async () => {
      await expect(connector.initialize(mockConfig)).resolves.not.toThrow();
    });

    it('should throw error if access token is missing', async () => {
      const invalidConfig = {
        ...mockConfig,
        credentials: {},
      };

      await expect(connector.initialize(invalidConfig)).rejects.toThrow(
        'Access token is required',
      );
    });
  });

  describe('testConnection', () => {
    it('should return success for valid connection', async () => {
      mockApiUtils.executeRequest.mockResolvedValueOnce({
        data: { data: { id: 'user123', name: 'Test User' } },
      });

      await connector.initialize(mockConfig);
      const result = await connector.testConnection();

      expect(result.success).toBe(true);
      expect(mockApiUtils.executeRequest).toHaveBeenCalledWith(
        expect.objectContaining({
          method: 'GET',
          endpoint: expect.stringContaining('/me'),
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

  describe('Action: get_user', () => {
    it('should get authenticated user', async () => {
      const mockUser = {
        data: {
          id: 'user123',
          username: 'testuser',
          name: 'Test User',
          url: 'https://medium.com/@testuser',
        },
      };

      mockApiUtils.executeRequest.mockResolvedValueOnce({ data: mockUser });

      await connector.initialize(mockConfig);
      const result = await connector.executeAction('get_user', {});

      expect(result.success).toBe(true);
      expect(mockApiUtils.executeRequest).toHaveBeenCalledWith(
        expect.objectContaining({
          method: 'GET',
          endpoint: expect.stringContaining('/me'),
        }),
      );
    });
  });

  describe('Action: create_post', () => {
    it('should create post on user profile', async () => {
      // First call returns user data
      mockApiUtils.executeRequest.mockResolvedValueOnce({
        data: { data: { id: 'user123' } },
      });
      // Second call creates the post
      mockApiUtils.executeRequest.mockResolvedValueOnce({
        data: {
          data: {
            id: 'post123',
            title: 'Test Post',
            url: 'https://medium.com/@testuser/test-post',
          },
        },
      });

      await connector.initialize(mockConfig);
      const result = await connector.executeAction('create_post', {
        title: 'Test Post',
        content: '<h1>Hello World</h1>',
        contentFormat: 'html',
        publishStatus: 'draft',
      });

      expect(result.success).toBe(true);
      expect(mockApiUtils.executeRequest).toHaveBeenLastCalledWith(
        expect.objectContaining({
          method: 'POST',
          endpoint: expect.stringContaining('/users/user123/posts'),
        }),
      );
    });

    it('should create post on publication', async () => {
      mockApiUtils.executeRequest.mockResolvedValueOnce({
        data: {
          data: {
            id: 'post456',
            title: 'Publication Post',
          },
        },
      });

      await connector.initialize(mockConfig);
      const result = await connector.executeAction('create_post', {
        publication: true,
        publicationId: 'pub123',
        title: 'Publication Post',
        content: '# Markdown content',
        contentFormat: 'markdown',
      });

      expect(result.success).toBe(true);
      expect(mockApiUtils.executeRequest).toHaveBeenCalledWith(
        expect.objectContaining({
          method: 'POST',
          endpoint: expect.stringContaining('/publications/pub123/posts'),
        }),
      );
    });

    it('should handle tags correctly', async () => {
      mockApiUtils.executeRequest.mockResolvedValueOnce({
        data: { data: { id: 'user123' } },
      });
      mockApiUtils.executeRequest.mockResolvedValueOnce({
        data: { data: { id: 'post789' } },
      });

      await connector.initialize(mockConfig);
      const result = await connector.executeAction('create_post', {
        title: 'Tagged Post',
        content: 'Content',
        contentFormat: 'html',
        tags: 'javascript, nodejs, programming',
      });

      expect(result.success).toBe(true);
    });

    it('should throw error for too many tags', async () => {
      mockApiUtils.executeRequest.mockResolvedValueOnce({
        data: { data: { id: 'user123' } },
      });

      await connector.initialize(mockConfig);
      const result = await connector.executeAction('create_post', {
        title: 'Tagged Post',
        content: 'Content',
        contentFormat: 'html',
        tags: 'tag1, tag2, tag3, tag4, tag5, tag6',
      });

      expect(result.success).toBe(false);
      expect(result.error?.message).toContain('Too many tags');
    });

    it('should throw error for tag exceeding max length', async () => {
      mockApiUtils.executeRequest.mockResolvedValueOnce({
        data: { data: { id: 'user123' } },
      });

      await connector.initialize(mockConfig);
      const result = await connector.executeAction('create_post', {
        title: 'Tagged Post',
        content: 'Content',
        contentFormat: 'html',
        tags: 'thisisaverylongtagthatexceedslimit',
      });

      expect(result.success).toBe(false);
      expect(result.error?.message).toContain('too long');
    });
  });

  describe('Action: get_all_publications', () => {
    it('should get all publications', async () => {
      // First call returns user data
      mockApiUtils.executeRequest.mockResolvedValueOnce({
        data: { data: { id: 'user123' } },
      });
      // Second call returns publications
      mockApiUtils.executeRequest.mockResolvedValueOnce({
        data: {
          data: [
            { id: 'pub1', name: 'Publication 1' },
            { id: 'pub2', name: 'Publication 2' },
          ],
        },
      });

      await connector.initialize(mockConfig);
      const result = await connector.executeAction('get_all_publications', {});

      expect(result.success).toBe(true);
      expect(mockApiUtils.executeRequest).toHaveBeenLastCalledWith(
        expect.objectContaining({
          method: 'GET',
          endpoint: expect.stringContaining('/users/user123/publications'),
        }),
      );
    });

    it('should apply limit when not returning all', async () => {
      mockApiUtils.executeRequest.mockResolvedValueOnce({
        data: { data: { id: 'user123' } },
      });
      mockApiUtils.executeRequest.mockResolvedValueOnce({
        data: {
          data: [
            { id: 'pub1' },
            { id: 'pub2' },
            { id: 'pub3' },
          ],
        },
      });

      await connector.initialize(mockConfig);
      const result = await connector.executeAction('get_all_publications', {
        returnAll: false,
        limit: 2,
      });

      expect(result.success).toBe(true);
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
      mockApiUtils.executeRequest.mockResolvedValueOnce({
        data: { data: { id: 'user123' } },
      });

      await connector.initialize(mockConfig);
      await connector.executeAction('get_user', {});

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

      // Should not throw - connector handles errors internally
      await expect(
        connector.executeAction('get_user', {}),
      ).resolves.toBeDefined();

      // Verify API was called
      expect(mockApiUtils.executeRequest).toHaveBeenCalled();
    });
  });
});
