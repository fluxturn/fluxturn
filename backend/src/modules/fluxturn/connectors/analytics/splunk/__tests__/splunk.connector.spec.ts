/**
 * Splunk Connector Tests
 *
 * Behavioral tests that verify search, alerts, reports, and user operations.
 */

import { Test, TestingModule } from '@nestjs/testing';
import { SplunkConnector } from '../splunk.connector';
import { SPLUNK_CONNECTOR } from '../splunk.definition';
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

describe('SplunkConnector', () => {
  let connector: SplunkConnector;

  const mockConfig = {
    id: 'test-config-id',
    name: 'Test Splunk Config',
    type: 'splunk',
    category: 'analytics',
    credentials: {
      authToken: 'test-splunk-auth-token',
      baseUrl: 'https://localhost:8089',
      allowUnauthorizedCerts: false,
    },
    settings: {},
  } as any;

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SplunkConnector,
        { provide: AuthUtils, useValue: mockAuthUtils },
        { provide: ApiUtils, useValue: mockApiUtils },
      ],
    }).compile();

    connector = module.get<SplunkConnector>(SplunkConnector);
  });

  describe('Metadata', () => {
    it('should return correct metadata', () => {
      const metadata = connector.getMetadata();

      expect(metadata.name).toBe('Splunk');
      expect(metadata.description).toContain('machine-generated');
      expect(metadata.version).toBe('1.0.0');
      expect(metadata.category).toBe('analytics');
      expect(metadata.type).toBe('splunk');
      expect(metadata.authType).toBe('bearer_token');
      expect(metadata.webhookSupport).toBe(false);
    });

    it('should return 16 actions', () => {
      const metadata = connector.getMetadata();
      expect(metadata.actions).toHaveLength(16);
    });

    it('should return 0 triggers', () => {
      const metadata = connector.getMetadata();
      expect(metadata.triggers).toHaveLength(0);
    });

    it('should include all Alert action IDs', () => {
      const metadata = connector.getMetadata();
      const actionIds = metadata.actions.map((a) => a.id);

      expect(actionIds).toContain('get_fired_alerts');
      expect(actionIds).toContain('get_alert_metrics');
    });

    it('should include all Search action IDs', () => {
      const metadata = connector.getMetadata();
      const actionIds = metadata.actions.map((a) => a.id);

      expect(actionIds).toContain('create_search_job');
      expect(actionIds).toContain('get_search_job');
      expect(actionIds).toContain('get_all_search_jobs');
      expect(actionIds).toContain('get_search_results');
      expect(actionIds).toContain('delete_search_job');
    });

    it('should include all Report action IDs', () => {
      const metadata = connector.getMetadata();
      const actionIds = metadata.actions.map((a) => a.id);

      expect(actionIds).toContain('create_report');
      expect(actionIds).toContain('get_report');
      expect(actionIds).toContain('get_all_reports');
      expect(actionIds).toContain('delete_report');
    });

    it('should include all User action IDs', () => {
      const metadata = connector.getMetadata();
      const actionIds = metadata.actions.map((a) => a.id);

      expect(actionIds).toContain('create_user');
      expect(actionIds).toContain('get_user');
      expect(actionIds).toContain('get_all_users');
      expect(actionIds).toContain('update_user');
      expect(actionIds).toContain('delete_user');
    });
  });

  describe('Connector-Definition Sync', () => {
    it('should have all connector actions in definition', () => {
      const metadata = connector.getMetadata();
      const connectorActionIds = metadata.actions.map((a) => a.id);
      const definitionActionIds = SPLUNK_CONNECTOR.supported_actions?.map((a) => a.id) || [];

      for (const actionId of connectorActionIds) {
        expect(definitionActionIds).toContain(actionId);
      }
    });

    it('should have matching name in connector and definition', () => {
      const metadata = connector.getMetadata();
      expect(metadata.name).toBe(SPLUNK_CONNECTOR.display_name);
    });

    it('should have matching category in connector and definition', () => {
      const metadata = connector.getMetadata();
      expect(metadata.category).toBe(SPLUNK_CONNECTOR.category);
    });
  });

  describe('initialize', () => {
    it('should initialize successfully with valid credentials', async () => {
      await expect(connector.initialize(mockConfig)).resolves.not.toThrow();
    });

    it('should throw error if auth token is missing', async () => {
      const invalidConfig = {
        ...mockConfig,
        credentials: { baseUrl: 'https://localhost:8089' },
      };

      await expect(connector.initialize(invalidConfig)).rejects.toThrow(
        'Auth token is required',
      );
    });

    it('should throw error if base URL is missing', async () => {
      const invalidConfig = {
        ...mockConfig,
        credentials: { authToken: 'test-token' },
      };

      await expect(connector.initialize(invalidConfig)).rejects.toThrow(
        'Base URL is required',
      );
    });
  });

  describe('testConnection', () => {
    it('should return success for valid connection', async () => {
      mockApiUtils.executeRequest.mockResolvedValueOnce({
        data: { entry: [{ content: {} }] },
      });

      await connector.initialize(mockConfig);
      const result = await connector.testConnection();

      expect(result.success).toBe(true);
      expect(mockApiUtils.executeRequest).toHaveBeenCalledWith(
        expect.objectContaining({
          method: 'GET',
          endpoint: expect.stringContaining('/services/alerts/fired_alerts'),
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

  describe('Action: get_fired_alerts', () => {
    it('should get fired alerts', async () => {
      const mockAlerts = {
        entry: [
          { content: { alert_name: 'Alert 1' } },
          { content: { alert_name: 'Alert 2' } },
        ],
      };

      mockApiUtils.executeRequest.mockResolvedValueOnce({ data: mockAlerts });

      await connector.initialize(mockConfig);
      const result = await connector.executeAction('get_fired_alerts', {});

      expect(result.success).toBe(true);
      expect(mockApiUtils.executeRequest).toHaveBeenCalledWith(
        expect.objectContaining({
          method: 'GET',
          endpoint: expect.stringContaining('/services/alerts/fired_alerts'),
        }),
      );
    });
  });

  describe('Action: get_alert_metrics', () => {
    it('should get alert metrics', async () => {
      const mockMetrics = { entry: [{ content: { metric: 'value' } }] };

      mockApiUtils.executeRequest.mockResolvedValueOnce({ data: mockMetrics });

      await connector.initialize(mockConfig);
      const result = await connector.executeAction('get_alert_metrics', {});

      expect(result.success).toBe(true);
      expect(mockApiUtils.executeRequest).toHaveBeenCalledWith(
        expect.objectContaining({
          method: 'GET',
          endpoint: expect.stringContaining('/services/alerts/metric_alerts'),
        }),
      );
    });
  });

  describe('Action: create_search_job', () => {
    it('should create search job', async () => {
      const mockJobCreate = { response: { sid: 'job123' } };
      const mockJobDetail = { entry: [{ content: { sid: 'job123', search: 'search query' } }] };

      mockApiUtils.executeRequest
        .mockResolvedValueOnce({ data: mockJobCreate })
        .mockResolvedValueOnce({ data: mockJobDetail });

      await connector.initialize(mockConfig);
      const result = await connector.executeAction('create_search_job', {
        search: 'search index=_internal | stats count',
        earliestTime: '2024-01-01T00:00:00',
        latestTime: '2024-01-31T23:59:59',
      });

      expect(result.success).toBe(true);
      expect(mockApiUtils.executeRequest).toHaveBeenCalledWith(
        expect.objectContaining({
          method: 'POST',
          endpoint: expect.stringContaining('/services/search/jobs'),
        }),
      );
    });
  });

  describe('Action: get_search_job', () => {
    it('should get search job by ID', async () => {
      const mockJob = { entry: [{ content: { sid: 'job123', status: 'done' } }] };

      mockApiUtils.executeRequest.mockResolvedValueOnce({ data: mockJob });

      await connector.initialize(mockConfig);
      const result = await connector.executeAction('get_search_job', {
        searchJobId: 'job123',
      });

      expect(result.success).toBe(true);
      expect(mockApiUtils.executeRequest).toHaveBeenCalledWith(
        expect.objectContaining({
          method: 'GET',
          endpoint: expect.stringContaining('/services/search/jobs/job123'),
        }),
      );
    });
  });

  describe('Action: get_all_search_jobs', () => {
    it('should get all search jobs with limit', async () => {
      const mockJobs = {
        entry: [
          { content: { sid: 'job1' } },
          { content: { sid: 'job2' } },
        ],
      };

      mockApiUtils.executeRequest.mockResolvedValueOnce({ data: mockJobs });

      await connector.initialize(mockConfig);
      const result = await connector.executeAction('get_all_search_jobs', {
        returnAll: false,
        limit: 10,
      });

      expect(result.success).toBe(true);
      expect(mockApiUtils.executeRequest).toHaveBeenCalledWith(
        expect.objectContaining({
          method: 'GET',
          endpoint: expect.stringContaining('/services/search/jobs'),
        }),
      );
    });

    it('should get all search jobs when returnAll is true', async () => {
      const mockJobs = { entry: [] };

      mockApiUtils.executeRequest.mockResolvedValueOnce({ data: mockJobs });

      await connector.initialize(mockConfig);
      const result = await connector.executeAction('get_all_search_jobs', {
        returnAll: true,
      });

      expect(result.success).toBe(true);
    });
  });

  describe('Action: get_search_results', () => {
    it('should get search results', async () => {
      const mockResults = { results: [{ field1: 'value1' }, { field1: 'value2' }] };

      mockApiUtils.executeRequest.mockResolvedValueOnce({ data: mockResults });

      await connector.initialize(mockConfig);
      const result = await connector.executeAction('get_search_results', {
        searchJobId: 'job123',
        returnAll: false,
        limit: 50,
      });

      expect(result.success).toBe(true);
      expect(mockApiUtils.executeRequest).toHaveBeenCalledWith(
        expect.objectContaining({
          method: 'GET',
          endpoint: expect.stringContaining('/services/search/jobs/job123/results'),
        }),
      );
    });
  });

  describe('Action: delete_search_job', () => {
    it('should delete search job', async () => {
      mockApiUtils.executeRequest.mockResolvedValueOnce({ data: {} });

      await connector.initialize(mockConfig);
      const result = await connector.executeAction('delete_search_job', {
        searchJobId: 'job123',
      });

      expect(result.success).toBe(true);
      expect(mockApiUtils.executeRequest).toHaveBeenCalledWith(
        expect.objectContaining({
          method: 'DELETE',
          endpoint: expect.stringContaining('/services/search/jobs/job123'),
        }),
      );
    });
  });

  describe('Action: create_report', () => {
    it('should create report from search job', async () => {
      // First call gets search job details
      const mockSearchJob = {
        entry: [{
          content: {
            search: 'search query',
            earliestTime: '-1d',
            latestTime: 'now',
          },
        }],
      };
      // Second call creates the report
      const mockReport = { entry: [{ content: { name: 'Test Report' } }] };

      mockApiUtils.executeRequest
        .mockResolvedValueOnce({ data: mockSearchJob })
        .mockResolvedValueOnce({ data: mockReport });

      await connector.initialize(mockConfig);
      const result = await connector.executeAction('create_report', {
        searchJobId: 'job123',
        name: 'Test Report',
      });

      expect(result.success).toBe(true);
      expect(mockApiUtils.executeRequest).toHaveBeenLastCalledWith(
        expect.objectContaining({
          method: 'POST',
          endpoint: expect.stringContaining('/services/saved/searches'),
        }),
      );
    });
  });

  describe('Action: get_report', () => {
    it('should get report by ID', async () => {
      const mockReport = { entry: [{ content: { name: 'My Report' } }] };

      mockApiUtils.executeRequest.mockResolvedValueOnce({ data: mockReport });

      await connector.initialize(mockConfig);
      const result = await connector.executeAction('get_report', {
        reportId: 'report123',
      });

      expect(result.success).toBe(true);
      expect(mockApiUtils.executeRequest).toHaveBeenCalledWith(
        expect.objectContaining({
          method: 'GET',
          endpoint: expect.stringContaining('/services/saved/searches/report123'),
        }),
      );
    });
  });

  describe('Action: get_all_reports', () => {
    it('should get all reports', async () => {
      const mockReports = {
        entry: [
          { content: { name: 'Report 1' } },
          { content: { name: 'Report 2' } },
        ],
      };

      mockApiUtils.executeRequest.mockResolvedValueOnce({ data: mockReports });

      await connector.initialize(mockConfig);
      const result = await connector.executeAction('get_all_reports', {
        returnAll: false,
        limit: 50,
      });

      expect(result.success).toBe(true);
      expect(mockApiUtils.executeRequest).toHaveBeenCalledWith(
        expect.objectContaining({
          method: 'GET',
          endpoint: expect.stringContaining('/services/saved/searches'),
        }),
      );
    });
  });

  describe('Action: delete_report', () => {
    it('should delete report', async () => {
      mockApiUtils.executeRequest.mockResolvedValueOnce({ data: {} });

      await connector.initialize(mockConfig);
      const result = await connector.executeAction('delete_report', {
        reportId: 'report123',
      });

      expect(result.success).toBe(true);
      expect(mockApiUtils.executeRequest).toHaveBeenCalledWith(
        expect.objectContaining({
          method: 'DELETE',
          endpoint: expect.stringContaining('/services/saved/searches/report123'),
        }),
      );
    });
  });

  describe('Action: create_user', () => {
    it('should create user', async () => {
      const mockUser = { entry: [{ content: { name: 'newuser' } }] };

      mockApiUtils.executeRequest.mockResolvedValueOnce({ data: mockUser });

      await connector.initialize(mockConfig);
      const result = await connector.executeAction('create_user', {
        name: 'newuser',
        password: 'securepass123',
        roles: ['user'],
        email: 'newuser@example.com',
      });

      expect(result.success).toBe(true);
      expect(mockApiUtils.executeRequest).toHaveBeenCalledWith(
        expect.objectContaining({
          method: 'POST',
          endpoint: expect.stringContaining('/services/authentication/users'),
        }),
      );
    });
  });

  describe('Action: get_user', () => {
    it('should get user by ID', async () => {
      const mockUser = { entry: [{ content: { name: 'testuser' } }] };

      mockApiUtils.executeRequest.mockResolvedValueOnce({ data: mockUser });

      await connector.initialize(mockConfig);
      const result = await connector.executeAction('get_user', {
        userId: 'testuser',
      });

      expect(result.success).toBe(true);
      expect(mockApiUtils.executeRequest).toHaveBeenCalledWith(
        expect.objectContaining({
          method: 'GET',
          endpoint: expect.stringContaining('/services/authentication/users/testuser'),
        }),
      );
    });
  });

  describe('Action: get_all_users', () => {
    it('should get all users', async () => {
      const mockUsers = {
        entry: [
          { content: { name: 'user1' } },
          { content: { name: 'user2' } },
        ],
      };

      mockApiUtils.executeRequest.mockResolvedValueOnce({ data: mockUsers });

      await connector.initialize(mockConfig);
      const result = await connector.executeAction('get_all_users', {
        returnAll: false,
        limit: 50,
      });

      expect(result.success).toBe(true);
      expect(mockApiUtils.executeRequest).toHaveBeenCalledWith(
        expect.objectContaining({
          method: 'GET',
          endpoint: expect.stringContaining('/services/authentication/users'),
        }),
      );
    });
  });

  describe('Action: update_user', () => {
    it('should update user', async () => {
      const mockUser = { entry: [{ content: { name: 'testuser', email: 'updated@example.com' } }] };

      mockApiUtils.executeRequest.mockResolvedValueOnce({ data: mockUser });

      await connector.initialize(mockConfig);
      const result = await connector.executeAction('update_user', {
        userId: 'testuser',
        email: 'updated@example.com',
        realname: 'Test User',
      });

      expect(result.success).toBe(true);
      expect(mockApiUtils.executeRequest).toHaveBeenCalledWith(
        expect.objectContaining({
          method: 'POST',
          endpoint: expect.stringContaining('/services/authentication/users/testuser'),
        }),
      );
    });
  });

  describe('Action: delete_user', () => {
    it('should delete user', async () => {
      mockApiUtils.executeRequest.mockResolvedValueOnce({ data: {} });

      await connector.initialize(mockConfig);
      const result = await connector.executeAction('delete_user', {
        userId: 'testuser',
      });

      expect(result.success).toBe(true);
      expect(mockApiUtils.executeRequest).toHaveBeenCalledWith(
        expect.objectContaining({
          method: 'DELETE',
          endpoint: expect.stringContaining('/services/authentication/users/testuser'),
        }),
      );
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
    it('should use Bearer token in headers', async () => {
      mockApiUtils.executeRequest.mockResolvedValueOnce({ data: { entry: [] } });

      await connector.initialize(mockConfig);
      await connector.testConnection();

      const callArgs = mockApiUtils.executeRequest.mock.calls[0][0];
      expect(callArgs.headers?.Authorization).toBe('Bearer test-splunk-auth-token');
    });
  });

  describe('Error Handling', () => {
    it('should handle API errors gracefully', async () => {
      mockApiUtils.executeRequest.mockRejectedValueOnce(
        new Error('API rate limit exceeded'),
      );

      await connector.initialize(mockConfig);
      const result = await connector.executeAction('get_fired_alerts', {});

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });
  });
});
