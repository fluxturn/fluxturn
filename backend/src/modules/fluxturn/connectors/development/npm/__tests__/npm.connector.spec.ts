/**
 * NPM Connector Tests
 *
 * Tests for the NPM connector actions using mocked HTTP responses.
 * NPM connector requires no authentication (public registry).
 */
import nock from 'nock';
import { NpmConnector } from '../npm.connector';
import { ConnectorTestHelper, TestFixture } from '@test/helpers/connector-test.helper';

// Import fixtures
import getMetadataFixture from './fixtures/get_metadata.json';
import searchFixture from './fixtures/search.json';

describe('NPMConnector', () => {
  let connector: NpmConnector;
  const BASE_URL = 'https://registry.npmjs.org';

  beforeEach(async () => {
    nock.cleanAll();

    // Create connector (no credentials needed for NPM)
    connector = await ConnectorTestHelper.createConnector(NpmConnector, 'npm');
  });

  afterEach(() => {
    nock.cleanAll();
  });

  // ===========================================
  // Connection Tests
  // ===========================================
  describe('testConnection', () => {
    it('should return success when NPM registry responds', async () => {
      // NPM registry is always available
      nock(BASE_URL)
        .get('/express')
        .reply(200, {
          name: 'express',
          'dist-tags': { latest: '4.18.2' }
        });

      const result = await connector.testConnection();

      expect(result.success).toBe(true);
    });

    it('should return failure when NPM registry is unreachable', async () => {
      nock(BASE_URL)
        .get('/express')
        .replyWithError('Network error');

      const result = await connector.testConnection();

      expect(result.success).toBe(false);
    });
  });

  // ===========================================
  // Get Metadata Action Tests
  // ===========================================
  describe('get_metadata', () => {
    const fixture = getMetadataFixture as unknown as TestFixture;

    fixture.testCases.forEach((testCase) => {
      it(testCase.name, async () => {
        nock(BASE_URL)
          .get(testCase.mock.path)
          .reply(testCase.mock.status, testCase.mock.response);

        const result = await connector.executeAction('get_metadata', testCase.input);

        ConnectorTestHelper.assertResponse(result, testCase.expected);
      });
    });
  });

  // ===========================================
  // Get Versions Action Tests
  // ===========================================
  describe('get_versions', () => {
    it('should get all versions for a package', async () => {
      const packageName = 'lodash';
      const mockResponse = {
        name: 'lodash',
        versions: {
          '4.17.21': { version: '4.17.21' },
          '4.17.20': { version: '4.17.20' },
          '4.17.19': { version: '4.17.19' }
        },
        time: {
          '4.17.21': '2021-02-20T08:50:00.000Z',
          '4.17.20': '2020-11-05T20:00:00.000Z',
          '4.17.19': '2020-05-15T14:00:00.000Z'
        }
      };

      nock(BASE_URL)
        .get(`/${packageName}`)
        .reply(200, mockResponse);

      const result = await connector.executeAction('get_versions', {
        packageName,
      });

      expect(result.success).toBe(true);
      const data = result.data?.data !== undefined ? result.data.data : result.data;
      expect(Array.isArray(data.versions)).toBe(true);
      expect(data.versions.length).toBeGreaterThan(0);
    });

    it('should handle package not found', async () => {
      nock(BASE_URL)
        .get('/nonexistent-package-xyz-123')
        .reply(404, { error: 'Not found' });

      const result = await connector.executeAction('get_versions', {
        packageName: 'nonexistent-package-xyz-123',
      });

      const innerSuccess = result.data?.success !== undefined
        ? result.data.success
        : result.success;
      expect(innerSuccess).toBe(false);
    });
  });

  // ===========================================
  // Search Action Tests
  // ===========================================
  describe('search', () => {
    const fixture = searchFixture as unknown as TestFixture;

    fixture.testCases.forEach((testCase) => {
      it(testCase.name, async () => {
        // Search uses query parameters
        nock(BASE_URL)
          .get('/-/v1/search')
          .query(true) // Match any query parameters
          .reply(testCase.mock.status, testCase.mock.response);

        const result = await connector.executeAction('search', testCase.input);

        ConnectorTestHelper.assertResponse(result, testCase.expected);
      });
    });
  });

  // ===========================================
  // Distribution Tag Operations
  // ===========================================
  describe('dist_tag_get_all', () => {
    it('should get all distribution tags', async () => {
      const packageName = 'react';
      const mockTags = {
        latest: '18.2.0',
        next: '0.0.0-experimental-abc123',
        canary: '18.3.0-canary-def456'
      };

      nock(BASE_URL)
        .get(`/-/package/${packageName}/dist-tags`)
        .reply(200, mockTags);

      const result = await connector.executeAction('dist_tag_get_all', {
        packageName,
      });

      expect(result.success).toBe(true);
      const data = result.data?.data !== undefined ? result.data.data : result.data;
      expect(data.tags).toHaveProperty('latest');
    });

    it('should handle package not found for dist tags', async () => {
      nock(BASE_URL)
        .get('/-/package/nonexistent-package/dist-tags')
        .reply(404, { error: 'Not found' });

      const result = await connector.executeAction('dist_tag_get_all', {
        packageName: 'nonexistent-package',
      });

      const innerSuccess = result.data?.success !== undefined
        ? result.data.success
        : result.success;
      expect(innerSuccess).toBe(false);
    });
  });

  describe('dist_tag_update', () => {
    it('should update a distribution tag', async () => {
      const packageName = 'my-package';
      const distTagName = 'beta';
      const packageVersion = '2.0.0-beta.1';

      nock(BASE_URL)
        .put(`/-/package/${packageName}/dist-tags/${distTagName}`, packageVersion)
        .reply(200);

      const result = await connector.executeAction('dist_tag_update', {
        packageName,
        distTagName,
        packageVersion,
      });

      expect(result.success).toBe(true);
    });

    it('should handle unauthorized update (no auth token)', async () => {
      nock(BASE_URL)
        .put('/-/package/some-package/dist-tags/latest')
        .reply(401, { error: 'Unauthorized' });

      const result = await connector.executeAction('dist_tag_update', {
        packageName: 'some-package',
        distTagName: 'latest',
        packageVersion: '1.0.0',
      });

      const innerSuccess = result.data?.success !== undefined
        ? result.data.success
        : result.success;
      expect(innerSuccess).toBe(false);
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
});
