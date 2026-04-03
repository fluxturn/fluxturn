/**
 * Cloudflare Connector Tests
 *
 * Tests for Cloudflare infrastructure connector
 */
import nock from 'nock';
import { CloudflareConnector } from '../cloudflare.connector';
import { ConnectorTestHelper, TestFixture } from '@test/helpers/connector-test.helper';

// Import fixtures
import deleteCertificateFixture from './fixtures/delete_certificate.json';
import getCertificateFixture from './fixtures/get_certificate.json';
import getManyCertificatesFixture from './fixtures/get_many_certificates.json';
import uploadCertificateFixture from './fixtures/upload_certificate.json';

describe('CloudflareConnector', () => {
  let connector: CloudflareConnector;
  const BASE_URL = 'https://api.cloudflare.com/client/v4';

  beforeAll(async () => {
    connector = await ConnectorTestHelper.createConnector(
      CloudflareConnector,
      'cloudflare'
    );
  });

  beforeEach(() => {
    nock.cleanAll();
  });

  afterEach(() => {
    nock.cleanAll();
  });

  describe('Connection', () => {
    it('should connect successfully with valid credentials', async () => {
      nock(BASE_URL)
        .get('/user/tokens/verify')
        .reply(200, {
          success: true,
          result: {
            id: 'ed17574386854bf78a67040be0a770b0',
            status: 'active'
          }
        });

      const result = await connector.testConnection();
      expect(result.success).toBe(true);
    });

    it('should fail connection with invalid credentials', async () => {
      nock(BASE_URL)
        .get('/user/tokens/verify')
        .reply(401, {
          success: false,
          errors: [{ code: 9109, message: 'Invalid access token' }]
        });

      const result = await connector.testConnection();
      expect(result.success).toBe(false);
    });

    it('should handle network errors gracefully', async () => {
      nock(BASE_URL)
        .get('/user/tokens/verify')
        .replyWithError('Network error');

      const result = await connector.testConnection();
      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });
  });

  describe('delete_certificate', () => {
    const fixture = deleteCertificateFixture as unknown as TestFixture;

    fixture.testCases.forEach((testCase) => {
      it(testCase.name, async () => {
        const mockRequest = nock(BASE_URL)
          .delete(testCase.mock.path);

        mockRequest.reply(testCase.mock.status, testCase.mock.response);

        const result = await connector.executeAction('delete_certificate', testCase.input);

        if (testCase.expected.success) {
          expect(result.success).toBe(true);
          expect(result.data).toMatchObject(testCase.expected.data);
        } else {
          const innerSuccess = result.data?.success !== undefined
            ? result.data.success
            : result.success;
          expect(innerSuccess).toBe(false);
        }
      });
    });
  });

  describe('get_certificate', () => {
    const fixture = getCertificateFixture as unknown as TestFixture;

    fixture.testCases.forEach((testCase) => {
      it(testCase.name, async () => {
        const mockRequest = nock(BASE_URL)
          .get(testCase.mock.path);

        mockRequest.reply(testCase.mock.status, testCase.mock.response);

        const result = await connector.executeAction('get_certificate', testCase.input);

        if (testCase.expected.success) {
          expect(result.success).toBe(true);
          const actualData = result.data?.data !== undefined
            ? result.data.data
            : result.data;
          expect(actualData).toMatchObject(testCase.expected.data);
        } else {
          const innerSuccess = result.data?.success !== undefined
            ? result.data.success
            : result.success;
          expect(innerSuccess).toBe(false);
        }
      });
    });
  });

  describe('get_many_certificates', () => {
    const fixture = getManyCertificatesFixture as unknown as TestFixture;

    fixture.testCases.forEach((testCase) => {
      it(testCase.name, async () => {
        let mockRequest = nock(BASE_URL)
          .get(testCase.mock.path);

        // Add query parameters if specified in the mock (cast to any to access query)
        const mockWithQuery = testCase.mock as any;
        if (mockWithQuery.query) {
          mockRequest = mockRequest.query(mockWithQuery.query);
        } else {
          // Match any query or no query
          mockRequest = mockRequest.query(true);
        }

        mockRequest.reply(testCase.mock.status, testCase.mock.response);

        const result = await connector.executeAction('get_many_certificates', testCase.input);

        if (testCase.expected.success) {
          expect(result.success).toBe(true);
          const actualData = result.data?.data !== undefined
            ? result.data.data
            : result.data;

          if (Array.isArray(testCase.expected.data)) {
            expect(Array.isArray(actualData)).toBe(true);
            expect(actualData.length).toBe(testCase.expected.data.length);

            if (actualData.length > 0 && testCase.expected.data.length > 0) {
              actualData.forEach((item: any, index: number) => {
                expect(item).toMatchObject(testCase.expected.data[index]);
              });
            }
          }
        } else {
          const innerSuccess = result.data?.success !== undefined
            ? result.data.success
            : result.success;
          expect(innerSuccess).toBe(false);
        }
      });
    });
  });

  describe('upload_certificate', () => {
    const fixture = uploadCertificateFixture as unknown as TestFixture;

    fixture.testCases.forEach((testCase) => {
      it(testCase.name, async () => {
        const mockRequest = nock(BASE_URL)
          .post(testCase.mock.path, (body) => {
            // Validate that the body contains certificate and private_key
            return body.certificate !== undefined && body.private_key !== undefined;
          });

        mockRequest.reply(testCase.mock.status, testCase.mock.response);

        const result = await connector.executeAction('upload_certificate', testCase.input);

        if (testCase.expected.success) {
          expect(result.success).toBe(true);
          const actualData = result.data?.data !== undefined
            ? result.data.data
            : result.data;
          expect(actualData).toMatchObject(testCase.expected.data);
        } else {
          const innerSuccess = result.data?.success !== undefined
            ? result.data.success
            : result.success;
          expect(innerSuccess).toBe(false);
        }
      });
    });
  });

  describe('Unknown Action', () => {
    it('should handle unknown action gracefully', async () => {
      const result = await connector.executeAction('unknown_action', {});
      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
      expect(result.error?.message).toContain('unknown_action');
    });
  });
});
