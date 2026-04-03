/**
 * Figma Connector Tests
 *
 * Tests for the Figma connector actions using mocked HTTP responses.
 */
import nock from 'nock';
import { FigmaConnector } from '../figma.connector';
import { ConnectorTestHelper } from '@test/helpers/connector-test.helper';

describe('FigmaConnector', () => {
  let connector: FigmaConnector;
  const BASE_URL = 'https://api.figma.com';

  beforeEach(async () => {
    nock.cleanAll();

    // Create connector with mock credentials
    connector = await ConnectorTestHelper.createConnector(FigmaConnector, 'figma');
  });

  afterEach(() => {
    nock.cleanAll();
  });

  // ===========================================
  // Connection Tests
  // ===========================================
  describe('testConnection', () => {
    it('should return success when API responds with 200', async () => {
      nock(BASE_URL)
        .get('/v1/me')
        .reply(200, {
          id: '123456',
          handle: 'test_user',
          email: 'test@example.com',
        });

      const result = await connector.testConnection();

      expect(result.success).toBe(true);
    });

    it('should return failure when API responds with 401', async () => {
      nock(BASE_URL)
        .get('/v1/me')
        .reply(401, { status: 401, err: 'Invalid token' });

      const result = await connector.testConnection();

      expect(result.success).toBe(false);
    });

    it('should return failure when API is unreachable', async () => {
      nock(BASE_URL)
        .get('/v1/me')
        .replyWithError('Network error');

      const result = await connector.testConnection();

      expect(result.success).toBe(false);
    });
  });

  // ===========================================
  // Get File Action Tests
  // ===========================================
  describe('get_file', () => {
    it('should get file successfully', async () => {
      const fileKey = 'abc123def456';
      const mockFile = {
        name: 'Test Design',
        lastModified: '2024-01-13T12:00:00Z',
        thumbnailUrl: 'https://example.com/thumb.png',
        version: '1.0',
        document: {
          id: '0:1',
          name: 'Page 1',
          type: 'CANVAS',
        },
      };

      nock(BASE_URL)
        .get(`/v1/files/${fileKey}`)
        .reply(200, mockFile);

      const result = await connector.executeAction('get_file', {
        fileKey,
      });

      expect(result.success).toBe(true);
      const data = result.data?.data !== undefined ? result.data.data : result.data;
      expect(data.name).toBe('Test Design');
    });

    it('should handle file not found error', async () => {
      const fileKey = 'nonexistent';

      nock(BASE_URL)
        .get(`/v1/files/${fileKey}`)
        .reply(404, { status: 404, err: 'File not found' });

      const result = await connector.executeAction('get_file', {
        fileKey,
      });

      const innerSuccess = result.data?.success !== undefined
        ? result.data.success
        : result.success;
      expect(innerSuccess).toBe(false);
    });

    it('should handle invalid file key', async () => {
      nock(BASE_URL)
        .get('/v1/files/invalid')
        .reply(400, { status: 400, err: 'Invalid file key' });

      const result = await connector.executeAction('get_file', {
        fileKey: 'invalid',
      });

      const innerSuccess = result.data?.success !== undefined
        ? result.data.success
        : result.success;
      expect(innerSuccess).toBe(false);
    });
  });

  // ===========================================
  // Get Comments Action Tests
  // ===========================================
  describe('get_comments', () => {
    it('should get comments successfully', async () => {
      const fileKey = 'abc123';
      const mockComments = {
        comments: [
          {
            id: 'comment1',
            message: 'This looks great!',
            user: { handle: 'user1' },
            created_at: '2024-01-13T10:00:00Z',
          },
          {
            id: 'comment2',
            message: 'Can we change the color?',
            user: { handle: 'user2' },
            created_at: '2024-01-13T11:00:00Z',
          },
        ],
      };

      nock(BASE_URL)
        .get(`/v1/files/${fileKey}/comments`)
        .reply(200, mockComments);

      const result = await connector.executeAction('get_comments', {
        fileKey,
      });

      expect(result.success).toBe(true);
      const data = result.data?.data !== undefined ? result.data.data : result.data;
      expect(data.comments).toHaveLength(2);
    });

    it('should handle empty comments', async () => {
      nock(BASE_URL)
        .get('/v1/files/abc123/comments')
        .reply(200, { comments: [] });

      const result = await connector.executeAction('get_comments', {
        fileKey: 'abc123',
      });

      expect(result.success).toBe(true);
      const data = result.data?.data !== undefined ? result.data.data : result.data;
      expect(data.comments).toHaveLength(0);
    });
  });

  // ===========================================
  // Post Comment Action Tests
  // ===========================================
  describe('post_comment', () => {
    it('should post comment successfully', async () => {
      const fileKey = 'abc123';
      const message = 'Great work on this design!';
      const mockResponse = {
        id: 'comment_new',
        message,
        user: { handle: 'test_user' },
        created_at: '2024-01-13T12:30:00Z',
      };

      nock(BASE_URL)
        .post(`/v1/files/${fileKey}/comments`, {
          message,
        })
        .reply(200, mockResponse);

      const result = await connector.executeAction('post_comment', {
        fileKey,
        message,
      });

      expect(result.success).toBe(true);
      const data = result.data?.data !== undefined ? result.data.data : result.data;
      expect(data.message).toBe(message);
    });

    it('should post comment with client meta', async () => {
      const fileKey = 'abc123';
      const message = 'Comment at specific location';
      const clientMeta = {
        node_id: '1:5',
        node_offset: { x: 100, y: 200 },
      };

      nock(BASE_URL)
        .post(`/v1/files/${fileKey}/comments`, {
          message,
          client_meta: clientMeta,
        })
        .reply(200, {
          id: 'comment_positioned',
          message,
          client_meta: clientMeta,
        });

      const result = await connector.executeAction('post_comment', {
        fileKey,
        message,
        clientMeta,
      });

      expect(result.success).toBe(true);
    });

    it('should handle empty message error', async () => {
      nock(BASE_URL)
        .post('/v1/files/abc123/comments')
        .reply(400, { status: 400, err: 'Message cannot be empty' });

      const result = await connector.executeAction('post_comment', {
        fileKey: 'abc123',
        message: '',
      });

      const innerSuccess = result.data?.success !== undefined
        ? result.data.success
        : result.success;
      expect(innerSuccess).toBe(false);
    });
  });

  // ===========================================
  // Get File Versions Action Tests
  // ===========================================
  describe('get_file_versions', () => {
    it('should get file versions successfully', async () => {
      const fileKey = 'abc123';
      const mockVersions = {
        versions: [
          {
            id: 'version1',
            label: 'Initial design',
            created_at: '2024-01-10T10:00:00Z',
            user: { handle: 'designer1' },
          },
          {
            id: 'version2',
            label: 'Updated colors',
            created_at: '2024-01-12T14:00:00Z',
            user: { handle: 'designer2' },
          },
        ],
      };

      nock(BASE_URL)
        .get(`/v1/files/${fileKey}/versions`)
        .reply(200, mockVersions);

      const result = await connector.executeAction('get_file_versions', {
        fileKey,
      });

      expect(result.success).toBe(true);
      const data = result.data?.data !== undefined ? result.data.data : result.data;
      expect(data.versions).toHaveLength(2);
    });

    it('should handle no versions available', async () => {
      nock(BASE_URL)
        .get('/v1/files/abc123/versions')
        .reply(200, { versions: [] });

      const result = await connector.executeAction('get_file_versions', {
        fileKey: 'abc123',
      });

      expect(result.success).toBe(true);
      const data = result.data?.data !== undefined ? result.data.data : result.data;
      expect(data.versions).toHaveLength(0);
    });
  });

  // ===========================================
  // Unknown Action Tests
  // ===========================================
  describe('unknown action', () => {
    it('should handle unknown action gracefully', async () => {
      const result = await connector.executeAction('non_existent_action', {});

      expect(result.success).toBe(false);
    });
  });

  // ===========================================
  // Rate Limiting Tests
  // ===========================================
  describe('rate limiting', () => {
    it('should handle 429 Too Many Requests', async () => {
      nock(BASE_URL)
        .get('/v1/files/abc123')
        .reply(429, {
          status: 429,
          err: 'Rate limit exceeded',
        });

      const result = await connector.executeAction('get_file', {
        fileKey: 'abc123',
      });

      const innerSuccess = result.data?.success !== undefined
        ? result.data.success
        : result.success;
      expect(innerSuccess).toBe(false);
    });
  });
});
