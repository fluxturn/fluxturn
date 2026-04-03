/**
 * Bitly Connector Tests
 */
import nock from 'nock';
import { BitlyConnector } from '../bitly.connector';
import { ConnectorTestHelper } from '@test/helpers/connector-test.helper';

describe('BitlyConnector', () => {
  let connector: BitlyConnector;
  const BASE_URL = 'https://api-ssl.bitly.com/v4';

  beforeEach(async () => {
    nock.cleanAll();
    connector = await ConnectorTestHelper.createConnector(BitlyConnector, 'bitly');
  });

  afterEach(() => {
    nock.cleanAll();
  });

  describe('testConnection', () => {
    it('should return success when API responds with 200', async () => {
      nock(BASE_URL)
        .get('/user')
        .reply(200, { login: 'testuser' });

      const result = await connector.testConnection();
      expect(result.success).toBe(true);
    });

    it('should return failure when API responds with 401', async () => {
      nock(BASE_URL)
        .get('/user')
        .reply(401, { message: 'Unauthorized' });

      const result = await connector.testConnection();
      expect(result.success).toBe(false);
    });
  });

  describe('create_link', () => {
    it('should create a short link successfully', async () => {
      const mockResponse = {
        id: 'bit.ly/abc123',
        link: 'https://bit.ly/abc123',
        long_url: 'https://example.com/very/long/url',
        created_at: '2026-01-14T08:00:00Z'
      };

      nock(BASE_URL)
        .post('/bitlinks')
        .reply(201, mockResponse);

      const result = await connector.executeAction('create_link', {
        longUrl: 'https://example.com/very/long/url'
      });

      expect(result.success).toBe(true);
    });

    it('should handle invalid URL error', async () => {
      nock(BASE_URL)
        .post('/bitlinks')
        .reply(400, { message: 'INVALID_ARG_LONG_URL' });

      const result = await connector.executeAction('create_link', {
        longUrl: 'invalid-url'
      });

      const innerSuccess = result.data?.success !== undefined ? result.data.success : result.success;
      expect(innerSuccess).toBe(false);
    });
  });

  describe('unknown action', () => {
    it('should handle unknown action gracefully', async () => {
      const result = await connector.executeAction('non_existent_action', {});
      expect(result.success).toBe(false);
    });
  });
});
