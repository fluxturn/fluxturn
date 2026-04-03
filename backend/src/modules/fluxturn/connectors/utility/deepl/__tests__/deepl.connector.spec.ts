/**
 * DeepL Connector Tests
 */
import nock from 'nock';
import { DeepLConnector } from '../deepl.connector';
import { ConnectorTestHelper } from '@test/helpers/connector-test.helper';

describe('DeepLConnector', () => {
  let connector: DeepLConnector;
  const BASE_URL = 'https://api.deepl.com/v2';

  beforeEach(async () => {
    nock.cleanAll();
    connector = await ConnectorTestHelper.createConnector(DeepLConnector, 'deepl');
  });

  afterEach(() => {
    nock.cleanAll();
  });

  describe('testConnection', () => {
    it('should return success when API responds with 200', async () => {
      nock(BASE_URL)
        .get('/usage')
        .query(true)
        .reply(200, { character_count: 1000, character_limit: 500000 });

      const result = await connector.testConnection();
      expect(result.success).toBe(true);
    });

    it('should return failure when API responds with 403', async () => {
      nock(BASE_URL)
        .get('/usage')
        .query(true)
        .reply(403, { message: 'Invalid API key' });

      const result = await connector.testConnection();
      expect(result.success).toBe(false);
    });
  });

  describe('translate', () => {
    it('should translate text successfully', async () => {
      const mockResponse = {
        translations: [
          {
            detected_source_language: 'EN',
            text: 'Hallo Welt'
          }
        ]
      };

      nock(BASE_URL)
        .get('/translate')
        .query(true)
        .reply(200, mockResponse);

      const result = await connector.executeAction('translate', {
        text: 'Hello world',
        translateTo: 'DE'
      });

      expect(result.success).toBe(true);
    });

    it('should handle invalid language code', async () => {
      nock(BASE_URL)
        .get('/translate')
        .query(true)
        .reply(400, { message: 'Value for \'target_lang\' not supported.' });

      const result = await connector.executeAction('translate', {
        text: 'Hello',
        translateTo: 'INVALID'
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
