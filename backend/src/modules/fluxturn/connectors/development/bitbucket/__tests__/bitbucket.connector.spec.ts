/**
 * Bitbucket Connector Tests
 *
 * Tests for the Bitbucket connector actions using mocked HTTP responses.
 */
import nock from 'nock';
import { BitbucketConnector } from '../bitbucket.connector';
import { ConnectorTestHelper, TestFixture } from '@test/helpers/connector-test.helper';

// Import fixtures
import getRepositoryFixture from './fixtures/get_repository.json';
import listRepositoriesFixture from './fixtures/list_repositories.json';
import listWorkspacesFixture from './fixtures/list_workspaces.json';

describe('BitbucketConnector', () => {
  let connector: BitbucketConnector;
  const BASE_URL = 'https://api.bitbucket.org/2.0';

  beforeEach(async () => {
    nock.cleanAll();

    // Create connector with mock credentials
    connector = await ConnectorTestHelper.createConnector(BitbucketConnector, 'bitbucket');
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
        .get('/user')
        .reply(200, {
          uuid: '{user-uuid}',
          username: 'testuser',
          display_name: 'Test User',
          type: 'user',
        });

      const result = await connector.testConnection();

      expect(result.success).toBe(true);
      expect(result.data).toBe(true);
    });

    it('should return failure when API responds with 401', async () => {
      nock(BASE_URL)
        .get('/user')
        .reply(401, {
          type: 'error',
          error: {
            message: 'Unauthorized',
          },
        });

      const result = await connector.testConnection();

      expect(result.success).toBe(false);
    });

    it('should return failure when API is unreachable', async () => {
      nock(BASE_URL)
        .get('/user')
        .replyWithError('Network error');

      const result = await connector.testConnection();

      expect(result.success).toBe(false);
    });
  });

  // ===========================================
  // Get Repository Action Tests (Fixture-based)
  // ===========================================
  describe('get_repository', () => {
    const fixture = getRepositoryFixture as unknown as TestFixture;

    fixture.testCases.forEach((testCase) => {
      it(testCase.name, async () => {
        // Setup mock
        nock(BASE_URL)
          .get(testCase.mock.path)
          .reply(testCase.mock.status, testCase.mock.response);

        // Execute action
        const result = await connector.executeAction('get_repository', testCase.input);

        // Assert
        ConnectorTestHelper.assertResponse(result, testCase.expected);
      });
    });
  });

  // ===========================================
  // List Repositories Action Tests (Fixture-based)
  // ===========================================
  describe('list_repositories', () => {
    const fixture = listRepositoriesFixture as unknown as TestFixture;

    fixture.testCases.forEach((testCase) => {
      it(testCase.name, async () => {
        // Setup mock
        nock(BASE_URL)
          .get(testCase.mock.path)
          .reply(testCase.mock.status, testCase.mock.response);

        // Execute action
        const result = await connector.executeAction('list_repositories', testCase.input);

        // Assert
        ConnectorTestHelper.assertResponse(result, testCase.expected);
      });
    });
  });

  // ===========================================
  // List Workspaces Action Tests (Fixture-based)
  // ===========================================
  describe('list_workspaces', () => {
    const fixture = listWorkspacesFixture as unknown as TestFixture;

    fixture.testCases.forEach((testCase) => {
      it(testCase.name, async () => {
        // Setup mock
        nock(BASE_URL)
          .get(testCase.mock.path)
          .reply(testCase.mock.status, testCase.mock.response);

        // Execute action
        const result = await connector.executeAction('list_workspaces', testCase.input);

        // Assert
        ConnectorTestHelper.assertResponse(result, testCase.expected);
      });
    });
  });

  // ===========================================
  // Manual Tests for Additional Scenarios
  // ===========================================
  describe('get_repository (manual tests)', () => {
    it('should get repository with full details', async () => {
      const mockRepo = {
        uuid: '{repo-uuid}',
        full_name: 'workspace/repo',
        name: 'repo',
        slug: 'repo',
        description: 'Test repository',
        is_private: false,
        mainbranch: {
          type: 'branch',
          name: 'main',
        },
        links: {
          html: {
            href: 'https://bitbucket.org/workspace/repo',
          },
        },
      };

      nock(BASE_URL)
        .get('/repositories/workspace/repo')
        .reply(200, mockRepo);

      const result = await connector.executeAction('get_repository', {
        workspace: 'workspace',
        repository: 'repo',
      });

      expect(result.success).toBe(true);
      const data = result.data?.data !== undefined ? result.data.data : result.data;
      expect(data.uuid).toBe('{repo-uuid}');
      expect(data.full_name).toBe('workspace/repo');
    });
  });

  describe('list_repositories (manual tests)', () => {
    it('should list repositories with pagination data', async () => {
      const mockResponse = {
        pagelen: 10,
        page: 1,
        size: 3,
        values: [
          { uuid: '{repo1}', name: 'repo1', slug: 'repo1' },
          { uuid: '{repo2}', name: 'repo2', slug: 'repo2' },
          { uuid: '{repo3}', name: 'repo3', slug: 'repo3' },
        ],
      };

      nock(BASE_URL)
        .get('/repositories/workspace')
        .reply(200, mockResponse);

      const result = await connector.executeAction('list_repositories', {
        workspace: 'workspace',
      });

      expect(result.success).toBe(true);
      const data = result.data?.data !== undefined ? result.data.data : result.data;
      expect(Array.isArray(data)).toBe(true);
      expect(data.length).toBe(3);
    });
  });

  describe('list_workspaces (manual tests)', () => {
    it('should list workspaces successfully', async () => {
      const mockResponse = {
        pagelen: 10,
        values: [
          { uuid: '{ws1}', name: 'Workspace 1', slug: 'workspace-1' },
          { uuid: '{ws2}', name: 'Workspace 2', slug: 'workspace-2' },
        ],
      };

      nock(BASE_URL)
        .get('/workspaces')
        .reply(200, mockResponse);

      const result = await connector.executeAction('list_workspaces', {});

      expect(result.success).toBe(true);
      const data = result.data?.data !== undefined ? result.data.data : result.data;
      expect(Array.isArray(data)).toBe(true);
      expect(data.length).toBe(2);
    });
  });

  // ===========================================
  // Unknown Action Test
  // ===========================================
  describe('unknown action', () => {
    it('should return error for unknown action', async () => {
      const result = await connector.executeAction('unknown_action', {});

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
      expect(result.error?.message).toContain('Action not found');
    });
  });
});
