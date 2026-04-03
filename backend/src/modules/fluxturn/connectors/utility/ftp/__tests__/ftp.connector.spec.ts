/**
 * FTP Connector Tests
 *
 * Tests for the FTP connector actions (delete, download, list, rename, upload).
 * FTP uses custom authentication with host, port, username, password.
 */
import nock from 'nock';
import { FtpConnector } from '../ftp.connector';
import { ConnectorTestHelper, TestFixture } from '@test/helpers/connector-test.helper';

// Import fixtures
import deleteFixture from './fixtures/delete.json';
import downloadFixture from './fixtures/download.json';
import listFixture from './fixtures/list.json';
import renameFixture from './fixtures/rename.json';
import uploadFixture from './fixtures/upload.json';

describe('FtpConnector', () => {
  let connector: FtpConnector;

  beforeEach(async () => {
    nock.cleanAll();

    // Create connector with FTP credentials
    connector = await ConnectorTestHelper.createConnector(FtpConnector, 'ftp');
  });

  afterEach(() => {
    nock.cleanAll();
  });

  // ===========================================
  // Connection Tests
  // ===========================================
  describe('testConnection', () => {
    it('should return success when FTP server is accessible', async () => {
      const result = await connector.testConnection();

      expect(result.success).toBe(true);
    });

    it('should return failure when FTP configuration is invalid', async () => {
      // Test expects initialization to fail, which throws an error
      // We need to catch it and verify the error
      try {
        await ConnectorTestHelper.createConnector(
          FtpConnector,
          'ftp',
          { host: '', protocol: 'ftp' }
        );
        // If we reach here, the test should fail
        expect(true).toBe(false);
      } catch (error) {
        // Initialization should throw error for invalid config
        expect(error.message).toContain('FTP host is required');
      }
    });
  });

  // ===========================================
  // Delete Action Tests
  // ===========================================
  describe('delete', () => {
    const fixture = deleteFixture as unknown as TestFixture;

    fixture.testCases.forEach((testCase) => {
      it(testCase.name, async () => {
        const result = await connector.executeAction('delete', testCase.input);

        ConnectorTestHelper.assertResponse(result, testCase.expected);
      });
    });
  });

  // ===========================================
  // Download Action Tests
  // ===========================================
  describe('download', () => {
    const fixture = downloadFixture as unknown as TestFixture;

    fixture.testCases.forEach((testCase) => {
      it(testCase.name, async () => {
        const result = await connector.executeAction('download', testCase.input);

        ConnectorTestHelper.assertResponse(result, testCase.expected);
      });
    });
  });

  // ===========================================
  // List Action Tests
  // ===========================================
  describe('list', () => {
    const fixture = listFixture as unknown as TestFixture;

    fixture.testCases.forEach((testCase) => {
      it(testCase.name, async () => {
        const result = await connector.executeAction('list', testCase.input);

        ConnectorTestHelper.assertResponse(result, testCase.expected);
      });
    });
  });

  // ===========================================
  // Rename Action Tests
  // ===========================================
  describe('rename', () => {
    const fixture = renameFixture as unknown as TestFixture;

    fixture.testCases.forEach((testCase) => {
      it(testCase.name, async () => {
        const result = await connector.executeAction('rename', testCase.input);

        ConnectorTestHelper.assertResponse(result, testCase.expected);
      });
    });
  });

  // ===========================================
  // Upload Action Tests
  // ===========================================
  describe('upload', () => {
    const fixture = uploadFixture as unknown as TestFixture;

    fixture.testCases.forEach((testCase) => {
      it(testCase.name, async () => {
        const result = await connector.executeAction('upload', testCase.input);

        ConnectorTestHelper.assertResponse(result, testCase.expected);
      });
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
