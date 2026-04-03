/**
 * Dropbox Connector Tests
 *
 * Tests for Dropbox connector metadata, action routing, and configuration.
 * Note: The Dropbox SDK uses its own HTTP handling, so we test higher-level functionality.
 */
import nock from 'nock';
import axios from 'axios';
import { HttpService } from '@nestjs/axios';
import { DropboxConnector } from '../dropbox.connector';
import { AuthUtils } from '../../../utils/auth.utils';
import { ApiUtils } from '../../../utils/api.utils';
import { getMockCredentials } from '@test/helpers/mock-credentials';
import { ConnectorCategory, ConnectorType, AuthType } from '../../../types';

describe('DropboxConnector', () => {
  let connector: DropboxConnector;
  const API_BASE_URL = 'https://api.dropboxapi.com';
  const CONTENT_BASE_URL = 'https://content.dropboxapi.com';

  // Helper to create a new connector for each test
  const createConnector = async () => {
    nock.cleanAll();

    // Mock the /users/get_current_account request that happens during initialization
    nock(API_BASE_URL)
      .post('/2/users/get_current_account')
      .reply(200, {
        account_id: 'dbid:mock-account-id',
        name: {
          given_name: 'Test',
          surname: 'User',
          familiar_name: 'Test',
          display_name: 'Test User',
          abbreviated_name: 'TU',
        },
        email: 'test@example.com',
        email_verified: true,
        profile_photo_url: 'https://dropbox.com/avatar.jpg',
        country: 'US',
        locale: 'en',
      });

    // Create mock dependencies
    const httpService = new HttpService(axios as any);
    const authUtils = new AuthUtils(httpService);
    const apiUtils = new ApiUtils(httpService);

    // Create connector with dependencies
    const newConnector = new DropboxConnector(authUtils, apiUtils);

    // Initialize with mock credentials
    await newConnector.initialize({
      id: `test-dropbox-${Date.now()}`,
      name: 'dropbox',
      type: 'dropbox' as any,
      category: 'storage' as any,
      credentials: getMockCredentials('dropbox'),
    } as any);

    // Clean nock for the actual test
    nock.cleanAll();

    return newConnector;
  };

  beforeEach(async () => {
    connector = await createConnector();
  });

  afterEach(() => {
    nock.cleanAll();
  });

  // ===========================================
  // Connection Tests
  // ===========================================
  describe('testConnection', () => {
    it('should return success when API responds with 200', async () => {
      nock(API_BASE_URL)
        .post('/2/users/get_current_account')
        .reply(200, {
          account_id: 'dbid:mock-account-id',
          name: {
            given_name: 'Test',
            surname: 'User',
            display_name: 'Test User',
          },
          email: 'test@example.com',
          email_verified: true,
        });

      const result = await connector.testConnection();
      expect(result.success).toBe(true);
    });

    it('should return failure when API responds with 401', async () => {
      nock(API_BASE_URL)
        .post('/2/users/get_current_account')
        .reply(401, {
          error_summary: 'invalid_access_token/...',
          error: {
            '.tag': 'invalid_access_token',
          },
        });

      const result = await connector.testConnection();
      expect(result.success).toBe(false);
    });
  });

  // ===========================================
  // Auth Mode Tests
  // ===========================================
  describe('authentication modes', () => {
    it('initializes with direct access token (default mode)', async () => {
      // Mock for initialization and testConnection
      nock(API_BASE_URL)
        .post('/2/users/get_current_account')
        .twice()
        .reply(200, {
          account_id: 'dbid:test',
          email: 'test@example.com',
        });

      const httpService = new HttpService(axios as any);
      const testConnector = new DropboxConnector(
        new AuthUtils(httpService),
        new ApiUtils(httpService),
      );

      // Initialize with accessToken mode (no authMode = defaults to accessToken)
      await testConnector.initialize({
        id: 'test-access-token',
        name: 'dropbox',
        type: 'dropbox' as any,
        category: 'storage' as any,
        credentials: {
          accessToken: 'sl.test-token',
        },
      } as any);

      const result = await testConnector.testConnection();
      expect(result.success).toBe(true);
    });

    it('initializes with explicit accessToken mode', async () => {
      // Mock for initialization and testConnection
      nock(API_BASE_URL)
        .post('/2/users/get_current_account')
        .times(3) // init + testConnection + potential retry
        .reply(200, {
          account_id: 'dbid:test',
          email: 'test@example.com',
        });

      const httpService = new HttpService(axios as any);
      const testConnector = new DropboxConnector(
        new AuthUtils(httpService),
        new ApiUtils(httpService),
      );

      await testConnector.initialize({
        id: 'test-explicit-mode',
        name: 'dropbox',
        type: 'dropbox' as any,
        category: 'storage' as any,
        credentials: {
          authMode: 'accessToken',
          accessToken: 'sl.test-token',
        },
      } as any);

      const result = await testConnector.testConnection();
      expect(result.success).toBe(true);
    });
  });

  // ===========================================
  // Metadata Tests
  // ===========================================
  describe('getMetadata', () => {
    it('returns correct basic metadata', () => {
      const metadata = connector.getMetadata();

      expect(metadata.name).toBe('Dropbox');
      expect(metadata.description).toContain('Dropbox');
      expect(metadata.category).toBe(ConnectorCategory.STORAGE);
      expect(metadata.type).toBe(ConnectorType.DROPBOX);
      expect(metadata.authType).toBe(AuthType.OAUTH2);
    });

    it('indicates webhook support', () => {
      const metadata = connector.getMetadata();
      expect(metadata.webhookSupport).toBe(true);
    });

    it('has rate limit configuration', () => {
      const metadata = connector.getMetadata();
      expect(metadata.rateLimit).toBeDefined();
      expect(metadata.rateLimit.requestsPerSecond).toBe(5);
      expect(metadata.rateLimit.requestsPerMinute).toBe(200);
    });

    it('has required scopes defined', () => {
      const metadata = connector.getMetadata();
      expect(metadata.requiredScopes).toBeDefined();
      expect(metadata.requiredScopes).toContain('files.content.read');
      expect(metadata.requiredScopes).toContain('files.content.write');
    });
  });

  // ===========================================
  // Action ID Tests (Definition Alignment)
  // ===========================================
  describe('action IDs', () => {
    it('has definition-aligned action IDs in metadata', () => {
      const metadata = connector.getMetadata();
      const actionIds = metadata.actions.map(a => a.id);

      // Check all definition-aligned action IDs are present
      expect(actionIds).toContain('file_upload');
      expect(actionIds).toContain('file_download');
      expect(actionIds).toContain('file_delete');
      expect(actionIds).toContain('file_copy');
      expect(actionIds).toContain('file_move');
      expect(actionIds).toContain('file_search');
      expect(actionIds).toContain('folder_create');
      expect(actionIds).toContain('folder_list');
    });

    it('has 8 actions matching the definition', () => {
      const metadata = connector.getMetadata();
      expect(metadata.actions).toHaveLength(8);
    });

    it('file_upload action has correct schema', () => {
      const metadata = connector.getMetadata();
      const uploadAction = metadata.actions.find(a => a.id === 'file_upload');

      expect(uploadAction).toBeDefined();
      expect(uploadAction.inputSchema.path).toBeDefined();
      expect(uploadAction.inputSchema.content).toBeDefined();
      expect(uploadAction.outputSchema.name).toBeDefined();
      expect(uploadAction.outputSchema.id).toBeDefined();
    });

    it('folder_list action has correct schema', () => {
      const metadata = connector.getMetadata();
      const listAction = metadata.actions.find(a => a.id === 'folder_list');

      expect(listAction).toBeDefined();
      expect(listAction.inputSchema.path).toBeDefined();
      expect(listAction.inputSchema.recursive).toBeDefined();
      expect(listAction.outputSchema.entries).toBeDefined();
      expect(listAction.outputSchema.hasMore).toBeDefined();
    });
  });

  // ===========================================
  // Trigger ID Tests (Definition Alignment)
  // ===========================================
  describe('trigger IDs', () => {
    it('has definition-aligned trigger IDs in metadata', () => {
      const metadata = connector.getMetadata();
      const triggerIds = metadata.triggers.map(t => t.id);

      // Check all definition-aligned trigger IDs are present
      expect(triggerIds).toContain('file_added');
      expect(triggerIds).toContain('file_modified');
    });

    it('has 2 triggers matching the definition', () => {
      const metadata = connector.getMetadata();
      expect(metadata.triggers).toHaveLength(2);
    });

    it('file_added trigger has polling enabled', () => {
      const metadata = connector.getMetadata();
      const fileAddedTrigger = metadata.triggers.find(t => t.id === 'file_added');

      expect(fileAddedTrigger).toBeDefined();
      expect(fileAddedTrigger.pollingEnabled).toBe(true);
      expect(fileAddedTrigger.webhookRequired).toBe(false);
    });

    it('file_modified trigger has correct schema', () => {
      const metadata = connector.getMetadata();
      const fileModifiedTrigger = metadata.triggers.find(t => t.id === 'file_modified');

      expect(fileModifiedTrigger).toBeDefined();
      expect(fileModifiedTrigger.inputSchema.path).toBeDefined();
      expect(fileModifiedTrigger.outputSchema.id).toBeDefined();
      expect(fileModifiedTrigger.outputSchema.name).toBeDefined();
    });
  });

  // ===========================================
  // Unknown Action Tests
  // ===========================================
  describe('unknown action', () => {
    it('should handle unknown action gracefully', async () => {
      const result = await connector.executeAction('unknown_action', {});

      expect(result.success).toBe(false);
      expect(result.error.code).toBe('UNKNOWN_ERROR');
    });
  });

  // ===========================================
  // Error Handling Tests
  // ===========================================
  describe('error handling', () => {
    it('handles rate limiting (429)', async () => {
      nock(API_BASE_URL)
        .post('/2/users/get_current_account')
        .reply(429, {
          error_summary: 'too_many_requests/...',
          error: {
            '.tag': 'too_many_requests',
            retry_after: 300,
          },
        });

      const result = await connector.testConnection();
      expect(result.success).toBe(false);
    });

    it('handles server error (500)', async () => {
      nock(API_BASE_URL)
        .post('/2/users/get_current_account')
        .reply(500, {
          error_summary: 'internal_error/...',
          error: {
            '.tag': 'internal_error',
          },
        });

      const result = await connector.testConnection();
      expect(result.success).toBe(false);
    });
  });

  // ===========================================
  // Action Routing Tests
  // ===========================================
  describe('action routing', () => {
    it('routes file_upload to uploadFile method', async () => {
      // Mock the upload endpoint
      nock(CONTENT_BASE_URL)
        .post('/2/files/upload')
        .reply(200, {
          name: 'test.txt',
          path_lower: '/test.txt',
          path_display: '/test.txt',
          id: 'id:abc123',
          size: 100,
        });

      const result = await connector.executeAction('file_upload', {
        path: '/test.txt',
        content: 'Hello World',
      });

      expect(result.success).toBe(true);
      expect(result.data.id).toBe('id:abc123');
    });

    it('routes file_delete to deleteFile method', async () => {
      nock(API_BASE_URL)
        .post('/2/files/delete_v2')
        .reply(200, {
          metadata: {
            '.tag': 'file',
            name: 'deleted.txt',
            path_lower: '/deleted.txt',
            id: 'id:del123',
          },
        });

      const result = await connector.executeAction('file_delete', {
        path: '/deleted.txt',
      });

      expect(result.success).toBe(true);
      expect(result.data.deleted).toBe(true);
    });

    it('routes file_copy to copyFile method', async () => {
      nock(API_BASE_URL)
        .post('/2/files/copy_v2')
        .reply(200, {
          metadata: {
            '.tag': 'file',
            name: 'copied.txt',
            path_lower: '/dest/copied.txt',
            id: 'id:copy123',
          },
        });

      const result = await connector.executeAction('file_copy', {
        fromPath: '/source/file.txt',
        toPath: '/dest/copied.txt',
      });

      expect(result.success).toBe(true);
      expect(result.data.copied).toBe(true);
    });

    it('routes file_move to moveFile method', async () => {
      nock(API_BASE_URL)
        .post('/2/files/move_v2')
        .reply(200, {
          metadata: {
            '.tag': 'file',
            name: 'moved.txt',
            path_lower: '/new/moved.txt',
            id: 'id:move123',
          },
        });

      const result = await connector.executeAction('file_move', {
        fromPath: '/old/file.txt',
        toPath: '/new/moved.txt',
      });

      expect(result.success).toBe(true);
      expect(result.data.moved).toBe(true);
    });

    it('routes file_search to searchFiles method', async () => {
      nock(API_BASE_URL)
        .post('/2/files/search_v2')
        .reply(200, {
          matches: [
            {
              match_type: { '.tag': 'filename' },
              metadata: {
                '.tag': 'metadata',
                metadata: {
                  '.tag': 'file',
                  name: 'result.txt',
                  path_lower: '/result.txt',
                  id: 'id:search1',
                },
              },
            },
          ],
          has_more: false,
        });

      const result = await connector.executeAction('file_search', {
        query: 'result',
      });

      expect(result.success).toBe(true);
      expect(result.data.matches).toHaveLength(1);
    });

    it('routes folder_create to createFolder method', async () => {
      nock(API_BASE_URL)
        .post('/2/files/create_folder_v2')
        .reply(200, {
          metadata: {
            name: 'newfolder',
            path_lower: '/newfolder',
            path_display: '/newfolder',
            id: 'id:folder123',
          },
        });

      const result = await connector.executeAction('folder_create', {
        path: '/newfolder',
      });

      expect(result.success).toBe(true);
      expect(result.data.name).toBe('newfolder');
    });

    it('routes folder_list to listFiles method', async () => {
      nock(API_BASE_URL)
        .post('/2/files/list_folder')
        .reply(200, {
          entries: [
            {
              '.tag': 'file',
              name: 'doc.pdf',
              path_lower: '/doc.pdf',
              id: 'id:file1',
              size: 1000,
            },
          ],
          cursor: 'cursor123',
          has_more: false,
        });

      const result = await connector.executeAction('folder_list', {
        path: '',
      });

      expect(result.success).toBe(true);
      expect(result.data.entries).toHaveLength(1);
    });
  });

  // ===========================================
  // Interface Implementation Tests
  // ===========================================
  describe('IStorageConnector interface', () => {
    it('implements listFiles method', async () => {
      nock(API_BASE_URL)
        .post('/2/files/list_folder')
        .reply(200, {
          entries: [],
          cursor: 'cursor',
          has_more: false,
        });

      const result = await connector.listFiles('/test');
      expect(result).toBeDefined();
    });

    it('implements createDirectory method', async () => {
      nock(API_BASE_URL)
        .post('/2/files/create_folder_v2')
        .reply(200, {
          metadata: {
            name: 'test',
            path_lower: '/test',
            id: 'id:dir1',
          },
        });

      const result = await connector.createDirectory('/test');
      expect(result).toBeDefined();
    });
  });

  // ===========================================
  // Path Normalization Tests
  // ===========================================
  describe('path normalization', () => {
    it('adds leading slash if missing', async () => {
      nock(API_BASE_URL)
        .post('/2/files/delete_v2')
        .reply(200, {
          metadata: { name: 'file.txt', id: 'id:1' },
        });

      // Should work even without leading slash
      const result = await connector.executeAction('file_delete', {
        path: 'file.txt', // Missing leading slash
      });

      expect(result.success).toBe(true);
    });
  });
});
