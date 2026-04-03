/**
 * Contentful Connector Tests
 *
 * Tests for the Contentful connector actions, triggers, credentials, and definition sync.
 */
import { ContentfulConnector } from '../contentful.connector';
import { CONTENTFUL_CONNECTOR } from '../contentful.definition';
import { ConnectorCategory, ConnectorType, AuthType } from '../../../types';

// Mock axios
jest.mock('axios', () => ({
  create: jest.fn(() => ({
    get: jest.fn(),
    post: jest.fn(),
    put: jest.fn(),
    delete: jest.fn(),
    request: jest.fn(),
  })),
  default: {
    create: jest.fn(() => ({
      get: jest.fn(),
      post: jest.fn(),
      put: jest.fn(),
      delete: jest.fn(),
      request: jest.fn(),
    })),
  },
}));

describe('ContentfulConnector', () => {
  let connector: ContentfulConnector;
  let mockDeliveryClient: any;
  let mockManagementClient: any;

  const mockCredentials = {
    spaceId: 'mock-space-id',
    deliveryAccessToken: 'mock-delivery-token',
    previewAccessToken: 'mock-preview-token',
    managementAccessToken: 'mock-management-token',
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const axios = require('axios');

    mockDeliveryClient = {
      get: jest.fn(),
      post: jest.fn(),
      put: jest.fn(),
      delete: jest.fn(),
      request: jest.fn(),
    };

    const mockPreviewClient = {
      get: jest.fn(),
      post: jest.fn(),
      put: jest.fn(),
      delete: jest.fn(),
      request: jest.fn(),
    };

    mockManagementClient = {
      get: jest.fn(),
      post: jest.fn(),
      put: jest.fn(),
      delete: jest.fn(),
      request: jest.fn(),
    };

    // axios.create is called 3 times: delivery, preview, management
    axios.create
      .mockReturnValueOnce(mockDeliveryClient)
      .mockReturnValueOnce(mockPreviewClient)
      .mockReturnValueOnce(mockManagementClient);

    connector = new ContentfulConnector();
    await connector.initialize({
      id: 'test-contentful-id',
      name: 'Test Contentful',
      type: ConnectorType.CONTENTFUL,
      category: ConnectorCategory.CMS,
      credentials: mockCredentials,
    } as any);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  // ===========================================
  // Metadata Tests
  // ===========================================
  describe('getMetadata', () => {
    it('should return correct connector metadata', () => {
      const metadata = connector.getMetadata();

      expect(metadata.name).toBe('Contentful');
      expect(metadata.category).toBe(ConnectorCategory.CMS);
      expect(metadata.type).toBe(ConnectorType.CONTENTFUL);
      expect(metadata.authType).toBe(AuthType.API_KEY);
      expect(metadata.webhookSupport).toBe(true);
    });

    it('should include rate limit configuration', () => {
      const metadata = connector.getMetadata();

      expect(metadata.rateLimit).toBeDefined();
      expect(metadata.rateLimit?.requestsPerSecond).toBe(10);
    });
  });

  // ===========================================
  // Connector-Definition Sync Tests
  // ===========================================
  describe('connector-definition sync', () => {
    it('should have all definition actions implemented in connector', () => {
      const definitionActionIds =
        CONTENTFUL_CONNECTOR.supported_actions?.map((a: any) => a.id) || [];

      const expectedActions = [
        'get_space',
        'get_entry',
        'get_entries',
        'create_entry',
        'update_entry',
        'delete_entry',
        'publish_entry',
        'unpublish_entry',
        'search_entries',
        'get_asset',
        'get_assets',
        'create_asset',
        'process_asset',
        'publish_asset',
        'delete_asset',
        'get_content_type',
        'get_content_types',
        'get_locales',
        'get_environments',
      ];

      for (const actionId of expectedActions) {
        expect(definitionActionIds).toContain(actionId);
      }
    });

    it('should have matching auth fields', () => {
      const definitionAuthKeys =
        CONTENTFUL_CONNECTOR.auth_fields?.map((f: any) => f.key) || [];

      expect(definitionAuthKeys).toContain('spaceId');
      expect(definitionAuthKeys).toContain('deliveryAccessToken');
      expect(definitionAuthKeys).toContain('previewAccessToken');
      expect(definitionAuthKeys).toContain('managementAccessToken');
    });

    it('should have triggers defined', () => {
      const definitionTriggers = CONTENTFUL_CONNECTOR.supported_triggers || [];

      expect(definitionTriggers.length).toBeGreaterThan(0);

      const triggerIds = definitionTriggers.map((t: any) => t.id);
      expect(triggerIds).toContain('entry_created');
      expect(triggerIds).toContain('entry_updated');
      expect(triggerIds).toContain('entry_published');
      expect(triggerIds).toContain('entry_unpublished');
      expect(triggerIds).toContain('entry_deleted');
      expect(triggerIds).toContain('asset_created');
      expect(triggerIds).toContain('asset_published');
      expect(triggerIds).toContain('asset_deleted');
    });

    it('should have api_key auth type in definition', () => {
      expect(CONTENTFUL_CONNECTOR.auth_type).toBe('api_key');
    });

    it('should have webhook support enabled in definition', () => {
      expect(CONTENTFUL_CONNECTOR.webhook_support).toBe(true);
    });

    it('should have rate limits in definition', () => {
      expect(CONTENTFUL_CONNECTOR.rate_limits?.requests_per_second).toBe(10);
    });

    it('should have all triggers with webhookRequired set', () => {
      const triggers = CONTENTFUL_CONNECTOR.supported_triggers || [];
      for (const trigger of triggers) {
        expect(trigger.webhookRequired).toBe(true);
      }
    });

    it('should have correct Contentful event types for triggers', () => {
      const triggers = CONTENTFUL_CONNECTOR.supported_triggers || [];
      const eventTypes = triggers.map((t: any) => t.eventType);
      expect(eventTypes).toContain('ContentManagement.Entry.create');
      expect(eventTypes).toContain('ContentManagement.Entry.save');
      expect(eventTypes).toContain('ContentManagement.Entry.publish');
      expect(eventTypes).toContain('ContentManagement.Entry.unpublish');
      expect(eventTypes).toContain('ContentManagement.Entry.delete');
      expect(eventTypes).toContain('ContentManagement.Asset.create');
      expect(eventTypes).toContain('ContentManagement.Asset.publish');
      expect(eventTypes).toContain('ContentManagement.Asset.delete');
    });
  });

  // ===========================================
  // Credential Tests
  // ===========================================
  describe('credentials', () => {
    it('should require spaceId for initialization', async () => {
      const newConnector = new ContentfulConnector();
      const axios = require('axios');
      axios.create.mockReturnValue(mockDeliveryClient);

      await expect(
        newConnector.initialize({
          id: 'test',
          name: 'Test',
          type: ConnectorType.CONTENTFUL,
          category: ConnectorCategory.CMS,
          credentials: { deliveryAccessToken: 'token' },
        } as any),
      ).rejects.toThrow('space ID');
    });

    it('should have spaceId as required string field', () => {
      const spaceIdField = CONTENTFUL_CONNECTOR.auth_fields?.find(
        (f: any) => f.key === 'spaceId',
      );
      expect(spaceIdField).toBeDefined();
      expect(spaceIdField?.type).toBe('string');
      expect(spaceIdField?.required).toBe(true);
    });

    it('should have delivery token as optional password field', () => {
      const field = CONTENTFUL_CONNECTOR.auth_fields?.find(
        (f: any) => f.key === 'deliveryAccessToken',
      );
      expect(field).toBeDefined();
      expect(field?.type).toBe('password');
      expect(field?.required).toBe(false);
    });

    it('should have management token as optional password field', () => {
      const field = CONTENTFUL_CONNECTOR.auth_fields?.find(
        (f: any) => f.key === 'managementAccessToken',
      );
      expect(field).toBeDefined();
      expect(field?.type).toBe('password');
      expect(field?.required).toBe(false);
    });
  });

  // ===========================================
  // Connection Tests
  // ===========================================
  describe('testConnection', () => {
    it('should return success when API responds with 200', async () => {
      mockDeliveryClient.get.mockResolvedValueOnce({
        data: { sys: { type: 'Space', id: 'mock-space-id' }, name: 'Test Space' },
        status: 200,
      });

      const result = await connector.testConnection();
      expect(result.success).toBe(true);
    });

    it('should return failure when API responds with 401', async () => {
      mockDeliveryClient.get.mockRejectedValueOnce({
        message: 'Unauthorized',
        response: { status: 401 },
      });

      const result = await connector.testConnection();
      expect(result.success).toBe(false);
    });

    it('should return failure when API is unreachable', async () => {
      mockDeliveryClient.get.mockRejectedValueOnce(new Error('Network error'));

      const result = await connector.testConnection();
      expect(result.success).toBe(false);
    });
  });

  // ===========================================
  // Space Actions
  // ===========================================
  describe('get_space', () => {
    it('should get space details', async () => {
      mockDeliveryClient.get.mockResolvedValueOnce({
        data: { sys: { type: 'Space', id: 'space-1' }, name: 'My Space' },
        status: 200,
      });

      const result = await connector.executeAction('get_space', {});
      expect(result.success).toBe(true);
    });
  });

  // ===========================================
  // Entry Actions
  // ===========================================
  describe('get_entry', () => {
    it('should get an entry by ID', async () => {
      mockDeliveryClient.get.mockResolvedValueOnce({
        data: {
          sys: { id: 'entry-1', type: 'Entry' },
          fields: { title: { 'en-US': 'Hello' } },
        },
        status: 200,
      });

      const result = await connector.executeAction('get_entry', {
        environmentId: 'master',
        entryId: 'entry-1',
        rawData: true,
      });
      expect(result.success).toBe(true);
    });

    it('should return only fields when rawData is false', async () => {
      const mockFields = { title: { 'en-US': 'Hello' } };
      mockDeliveryClient.get.mockResolvedValueOnce({
        data: { sys: { id: 'entry-1' }, fields: mockFields },
        status: 200,
      });

      const result = await connector.executeAction('get_entry', {
        environmentId: 'master',
        entryId: 'entry-1',
        rawData: false,
      });
      expect(result.success).toBe(true);
      const data = result.data?.data !== undefined ? result.data.data : result.data;
      expect(data).toEqual(mockFields);
    });

    it('should handle entry not found', async () => {
      mockDeliveryClient.get.mockRejectedValueOnce({
        message: 'Not found',
        response: { status: 404 },
      });

      const result = await connector.executeAction('get_entry', {
        environmentId: 'master',
        entryId: 'invalid',
      });
      const innerSuccess =
        result.data?.success !== undefined ? result.data.success : result.success;
      expect(innerSuccess).toBe(false);
    });
  });

  describe('get_entries', () => {
    it('should get entries with filters', async () => {
      mockDeliveryClient.get.mockResolvedValueOnce({
        data: {
          items: [
            { sys: { id: 'e1' }, fields: { title: { 'en-US': 'A' } } },
            { sys: { id: 'e2' }, fields: { title: { 'en-US': 'B' } } },
          ],
          total: 2,
          skip: 0,
          limit: 100,
        },
        status: 200,
      });

      const result = await connector.executeAction('get_entries', {
        environmentId: 'master',
        content_type: 'blogPost',
        limit: 10,
      });
      expect(result.success).toBe(true);
    });

    it('should pass query parameters', async () => {
      mockDeliveryClient.get.mockResolvedValueOnce({
        data: { items: [], total: 0, skip: 0, limit: 100 },
        status: 200,
      });

      await connector.executeAction('get_entries', {
        environmentId: 'master',
        content_type: 'blogPost',
        limit: 5,
        skip: 10,
        order: 'sys.createdAt',
        query: 'hello',
      });

      expect(mockDeliveryClient.get).toHaveBeenCalledWith(
        '/spaces/mock-space-id/environments/master/entries',
        expect.objectContaining({
          params: expect.objectContaining({
            content_type: 'blogPost',
            limit: 5,
            skip: 10,
            order: 'sys.createdAt',
            query: 'hello',
          }),
        }),
      );
    });
  });

  describe('create_entry', () => {
    it('should create an entry via management API', async () => {
      mockManagementClient.post.mockResolvedValueOnce({
        data: { sys: { id: 'new-entry' }, fields: { title: { 'en-US': 'New' } } },
        status: 201,
      });

      const result = await connector.executeAction('create_entry', {
        environmentId: 'master',
        contentTypeId: 'blogPost',
        fields: { title: { 'en-US': 'New' } },
      });
      expect(result.success).toBe(true);
    });

    it('should send X-Contentful-Content-Type header', async () => {
      mockManagementClient.post.mockResolvedValueOnce({
        data: { sys: { id: 'new' }, fields: {} },
        status: 201,
      });

      await connector.executeAction('create_entry', {
        environmentId: 'master',
        contentTypeId: 'blogPost',
        fields: { title: { 'en-US': 'Test' } },
      });

      expect(mockManagementClient.post).toHaveBeenCalledWith(
        '/spaces/mock-space-id/environments/master/entries',
        expect.objectContaining({ fields: { title: { 'en-US': 'Test' } } }),
        expect.objectContaining({
          headers: { 'X-Contentful-Content-Type': 'blogPost' },
        }),
      );
    });
  });

  describe('update_entry', () => {
    it('should update an entry with version header', async () => {
      mockManagementClient.put.mockResolvedValueOnce({
        data: { sys: { id: 'entry-1', version: 3 }, fields: {} },
        status: 200,
      });

      const result = await connector.executeAction('update_entry', {
        environmentId: 'master',
        entryId: 'entry-1',
        version: 2,
        fields: { title: { 'en-US': 'Updated' } },
      });
      expect(result.success).toBe(true);

      expect(mockManagementClient.put).toHaveBeenCalledWith(
        '/spaces/mock-space-id/environments/master/entries/entry-1',
        expect.any(Object),
        expect.objectContaining({
          headers: { 'X-Contentful-Version': '2' },
        }),
      );
    });
  });

  describe('delete_entry', () => {
    it('should delete an entry', async () => {
      mockManagementClient.delete.mockResolvedValueOnce({ status: 204 });

      const result = await connector.executeAction('delete_entry', {
        environmentId: 'master',
        entryId: 'entry-1',
      });
      expect(result.success).toBe(true);
      const data = result.data?.data !== undefined ? result.data.data : result.data;
      expect(data).toMatchObject({ deleted: true });
    });
  });

  describe('publish_entry', () => {
    it('should publish an entry with version', async () => {
      mockManagementClient.put.mockResolvedValueOnce({
        data: { sys: { id: 'entry-1', publishedVersion: 2 } },
        status: 200,
      });

      const result = await connector.executeAction('publish_entry', {
        environmentId: 'master',
        entryId: 'entry-1',
        version: 2,
      });
      expect(result.success).toBe(true);
    });
  });

  describe('unpublish_entry', () => {
    it('should unpublish an entry', async () => {
      mockManagementClient.delete.mockResolvedValueOnce({
        data: { sys: { id: 'entry-1' } },
        status: 200,
      });

      const result = await connector.executeAction('unpublish_entry', {
        environmentId: 'master',
        entryId: 'entry-1',
      });
      expect(result.success).toBe(true);
    });
  });

  // ===========================================
  // Asset Actions
  // ===========================================
  describe('get_asset', () => {
    it('should get an asset by ID', async () => {
      mockDeliveryClient.get.mockResolvedValueOnce({
        data: {
          sys: { id: 'asset-1' },
          fields: { title: { 'en-US': 'Logo' }, file: { 'en-US': { url: '//images.ctfassets.net/logo.png' } } },
        },
        status: 200,
      });

      const result = await connector.executeAction('get_asset', {
        environmentId: 'master',
        assetId: 'asset-1',
        rawData: true,
      });
      expect(result.success).toBe(true);
    });
  });

  describe('get_assets', () => {
    it('should get assets with filters', async () => {
      mockDeliveryClient.get.mockResolvedValueOnce({
        data: {
          items: [{ sys: { id: 'a1' }, fields: { title: { 'en-US': 'Image 1' } } }],
          total: 1,
          skip: 0,
          limit: 100,
        },
        status: 200,
      });

      const result = await connector.executeAction('get_assets', {
        environmentId: 'master',
        limit: 10,
      });
      expect(result.success).toBe(true);
    });
  });

  describe('create_asset', () => {
    it('should create an asset via management API', async () => {
      mockManagementClient.post.mockResolvedValueOnce({
        data: { sys: { id: 'new-asset' }, fields: {} },
        status: 201,
      });

      const result = await connector.executeAction('create_asset', {
        environmentId: 'master',
        title: 'New Image',
        description: 'A test image',
        fileName: 'test.jpg',
        contentType: 'image/jpeg',
        uploadUrl: 'https://example.com/test.jpg',
        locale: 'en-US',
      });
      expect(result.success).toBe(true);
    });
  });

  describe('process_asset', () => {
    it('should process an asset', async () => {
      mockManagementClient.put.mockResolvedValueOnce({ status: 204 });

      const result = await connector.executeAction('process_asset', {
        environmentId: 'master',
        assetId: 'asset-1',
        locale: 'en-US',
        version: 1,
      });
      expect(result.success).toBe(true);
    });
  });

  describe('publish_asset', () => {
    it('should publish an asset', async () => {
      mockManagementClient.put.mockResolvedValueOnce({
        data: { sys: { id: 'asset-1', publishedVersion: 2 } },
        status: 200,
      });

      const result = await connector.executeAction('publish_asset', {
        environmentId: 'master',
        assetId: 'asset-1',
        version: 2,
      });
      expect(result.success).toBe(true);
    });
  });

  describe('delete_asset', () => {
    it('should delete an asset', async () => {
      mockManagementClient.delete.mockResolvedValueOnce({ status: 204 });

      const result = await connector.executeAction('delete_asset', {
        environmentId: 'master',
        assetId: 'asset-1',
      });
      expect(result.success).toBe(true);
      const data = result.data?.data !== undefined ? result.data.data : result.data;
      expect(data).toMatchObject({ deleted: true });
    });
  });

  // ===========================================
  // Content Type Actions
  // ===========================================
  describe('get_content_type', () => {
    it('should get a content type', async () => {
      mockDeliveryClient.get.mockResolvedValueOnce({
        data: {
          sys: { id: 'blogPost' },
          name: 'Blog Post',
          fields: [{ id: 'title', type: 'Symbol' }],
        },
        status: 200,
      });

      const result = await connector.executeAction('get_content_type', {
        environmentId: 'master',
        contentTypeId: 'blogPost',
        rawData: true,
      });
      expect(result.success).toBe(true);
    });
  });

  describe('get_content_types', () => {
    it('should get all content types', async () => {
      mockDeliveryClient.get.mockResolvedValueOnce({
        data: {
          items: [{ sys: { id: 'blogPost' }, name: 'Blog Post' }],
          total: 1,
        },
        status: 200,
      });

      const result = await connector.executeAction('get_content_types', {
        environmentId: 'master',
      });
      expect(result.success).toBe(true);
    });
  });

  // ===========================================
  // Locale Actions
  // ===========================================
  describe('get_locales', () => {
    it('should get all locales', async () => {
      mockDeliveryClient.get.mockResolvedValueOnce({
        data: {
          items: [{ code: 'en-US', name: 'English (US)', default: true }],
          total: 1,
        },
        status: 200,
      });

      const result = await connector.executeAction('get_locales', {
        environmentId: 'master',
      });
      expect(result.success).toBe(true);
    });
  });

  // ===========================================
  // Environment Actions
  // ===========================================
  describe('get_environments', () => {
    it('should get all environments via management API', async () => {
      mockManagementClient.get.mockResolvedValueOnce({
        data: {
          items: [{ sys: { id: 'master' }, name: 'master' }],
          total: 1,
        },
        status: 200,
      });

      const result = await connector.executeAction('get_environments', {});
      expect(result.success).toBe(true);
    });
  });

  // ===========================================
  // Unknown Action Tests
  // ===========================================
  describe('unknown action', () => {
    it('should handle unknown action gracefully', async () => {
      const result = await connector.executeAction('non_existent_action', {});
      expect(result.success).toBe(false);
      expect(result.error?.message).toContain('non_existent_action');
    });
  });

  // ===========================================
  // Error Handling Tests
  // ===========================================
  describe('error handling', () => {
    it('should handle rate limit errors', async () => {
      mockDeliveryClient.get.mockRejectedValueOnce({
        message: 'Rate limit exceeded',
        response: { status: 429 },
      });

      const result = await connector.executeAction('get_space', {});
      const innerSuccess =
        result.data?.success !== undefined ? result.data.success : result.success;
      expect(innerSuccess).toBe(false);
    });

    it('should handle server errors', async () => {
      mockDeliveryClient.get.mockRejectedValueOnce({
        message: 'Internal server error',
        response: { status: 500 },
      });

      const result = await connector.executeAction('get_space', {});
      const innerSuccess =
        result.data?.success !== undefined ? result.data.success : result.success;
      expect(innerSuccess).toBe(false);
    });

    it('should require management client for write operations', async () => {
      // Create connector without management token
      const newConnector = new ContentfulConnector();
      const axios = require('axios');
      const clientWithoutMgmt = {
        get: jest.fn(),
        post: jest.fn(),
        put: jest.fn(),
        delete: jest.fn(),
        request: jest.fn(),
      };
      axios.create.mockReturnValue(clientWithoutMgmt);

      await newConnector.initialize({
        id: 'test',
        name: 'Test',
        type: ConnectorType.CONTENTFUL,
        category: ConnectorCategory.CMS,
        credentials: {
          spaceId: 'space-1',
          deliveryAccessToken: 'token',
        },
      } as any);

      const result = await newConnector.executeAction('create_entry', {
        environmentId: 'master',
        contentTypeId: 'blog',
        fields: {},
      });

      const innerSuccess =
        result.data?.success !== undefined ? result.data.success : result.success;
      expect(innerSuccess).toBe(false);
    });
  });

  // ===========================================
  // Definition Completeness Tests
  // ===========================================
  describe('definition completeness', () => {
    it('should have inputSchema and outputSchema for all actions', () => {
      const actions = CONTENTFUL_CONNECTOR.supported_actions || [];
      for (const action of actions) {
        expect(action.inputSchema).toBeDefined();
        expect(action.outputSchema).toBeDefined();
      }
    });

    it('should have api config for all actions', () => {
      const actions = CONTENTFUL_CONNECTOR.supported_actions || [];
      for (const action of actions) {
        expect(action.api).toBeDefined();
        expect(action.api.endpoint).toBeDefined();
        expect(action.api.method).toBeDefined();
        expect(action.api.baseUrl).toBeDefined();
      }
    });

    it('should have outputSchema for all triggers', () => {
      const triggers = CONTENTFUL_CONNECTOR.supported_triggers || [];
      for (const trigger of triggers) {
        expect(trigger.outputSchema).toBeDefined();
        expect(trigger.eventType).toBeDefined();
      }
    });

    it('should have unique action IDs', () => {
      const actions = CONTENTFUL_CONNECTOR.supported_actions || [];
      const ids = actions.map((a: any) => a.id);
      expect(new Set(ids).size).toBe(ids.length);
    });

    it('should have unique trigger IDs', () => {
      const triggers = CONTENTFUL_CONNECTOR.supported_triggers || [];
      const ids = triggers.map((t: any) => t.id);
      expect(new Set(ids).size).toBe(ids.length);
    });

    it('should have correct endpoint URLs for different APIs', () => {
      expect(CONTENTFUL_CONNECTOR.endpoints?.delivery_url).toBe('https://cdn.contentful.com');
      expect(CONTENTFUL_CONNECTOR.endpoints?.preview_url).toBe('https://preview.contentful.com');
      expect(CONTENTFUL_CONNECTOR.endpoints?.management_url).toBe('https://api.contentful.com');
    });
  });
});
