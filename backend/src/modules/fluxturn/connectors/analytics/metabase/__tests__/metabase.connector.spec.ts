/**
 * Metabase Connector Tests
 *
 * Behavioral tests that verify questions, metrics, databases, and alerts operations.
 */

import { Test, TestingModule } from '@nestjs/testing';
import { MetabaseConnector } from '../metabase.connector';
import { MetabaseDefinition } from '../metabase.definition';
import { AuthUtils } from '../../../utils/auth.utils';
import { ApiUtils } from '../../../utils/api.utils';

// Mock ApiUtils
const mockApiUtils = {
  executeRequest: jest.fn(),
};

// Mock AuthUtils
const mockAuthUtils = {
  createBasicAuthHeader: jest.fn(),
};

describe('MetabaseConnector', () => {
  let connector: MetabaseConnector;

  const mockConfig = {
    id: 'test-config-id',
    name: 'Test Metabase Config',
    type: 'metabase',
    category: 'analytics',
    credentials: {
      url: 'https://metabase.example.com',
      username: 'admin@example.com',
      password: 'securepassword123',
    },
    settings: {},
  } as any;

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MetabaseConnector,
        { provide: AuthUtils, useValue: mockAuthUtils },
        { provide: ApiUtils, useValue: mockApiUtils },
      ],
    }).compile();

    connector = module.get<MetabaseConnector>(MetabaseConnector);
  });

  describe('Metadata', () => {
    it('should return correct metadata', () => {
      const metadata = connector.getMetadata();

      expect(metadata.name).toBe('Metabase');
      expect(metadata.description).toContain('analytics');
      expect(metadata.version).toBe('1.0.0');
      expect(metadata.category).toBe('analytics');
      expect(metadata.type).toBe('metabase');
      expect(metadata.authType).toBe('basic_auth');
      expect(metadata.webhookSupport).toBe(false);
    });

    it('should return 10 actions', () => {
      const metadata = connector.getMetadata();
      expect(metadata.actions).toHaveLength(10);
    });

    it('should return 0 triggers', () => {
      const metadata = connector.getMetadata();
      expect(metadata.triggers).toHaveLength(0);
    });

    it('should include all Questions action IDs', () => {
      const metadata = connector.getMetadata();
      const actionIds = metadata.actions.map((a) => a.id);

      expect(actionIds).toContain('get_question');
      expect(actionIds).toContain('get_all_questions');
      expect(actionIds).toContain('get_question_result');
    });

    it('should include all Metrics action IDs', () => {
      const metadata = connector.getMetadata();
      const actionIds = metadata.actions.map((a) => a.id);

      expect(actionIds).toContain('get_metric');
      expect(actionIds).toContain('get_all_metrics');
    });

    it('should include all Databases action IDs', () => {
      const metadata = connector.getMetadata();
      const actionIds = metadata.actions.map((a) => a.id);

      expect(actionIds).toContain('get_all_databases');
      expect(actionIds).toContain('get_database_fields');
      expect(actionIds).toContain('add_database');
    });

    it('should include all Alerts action IDs', () => {
      const metadata = connector.getMetadata();
      const actionIds = metadata.actions.map((a) => a.id);

      expect(actionIds).toContain('get_alert');
      expect(actionIds).toContain('get_all_alerts');
    });
  });

  describe('Connector-Definition Sync', () => {
    it('should have all connector actions in definition', () => {
      const metadata = connector.getMetadata();
      const connectorActionIds = metadata.actions.map((a) => a.id);
      const definitionActionIds = MetabaseDefinition.supported_actions?.map((a: any) => a.id) || [];

      for (const actionId of connectorActionIds) {
        expect(definitionActionIds).toContain(actionId);
      }
    });

    it('should have matching name in connector and definition', () => {
      const metadata = connector.getMetadata();
      expect(metadata.name).toBe(MetabaseDefinition.display_name);
    });

    it('should have matching category in connector and definition', () => {
      const metadata = connector.getMetadata();
      expect(metadata.category).toBe(MetabaseDefinition.category);
    });
  });

  describe('initialize', () => {
    it('should initialize successfully with valid credentials', async () => {
      // Mock session authentication
      mockApiUtils.executeRequest.mockResolvedValueOnce({
        data: { id: 'session-token-123' },
      });

      await expect(connector.initialize(mockConfig)).resolves.not.toThrow();
    });

    it('should throw error if URL is missing', async () => {
      const invalidConfig = {
        ...mockConfig,
        credentials: { username: 'user', password: 'pass' },
      };

      await expect(connector.initialize(invalidConfig)).rejects.toThrow(
        'URL, username, and password are required',
      );
    });

    it('should throw error if username is missing', async () => {
      const invalidConfig = {
        ...mockConfig,
        credentials: { url: 'https://metabase.example.com', password: 'pass' },
      };

      await expect(connector.initialize(invalidConfig)).rejects.toThrow(
        'URL, username, and password are required',
      );
    });

    it('should throw error if password is missing', async () => {
      const invalidConfig = {
        ...mockConfig,
        credentials: { url: 'https://metabase.example.com', username: 'user' },
      };

      await expect(connector.initialize(invalidConfig)).rejects.toThrow(
        'URL, username, and password are required',
      );
    });

    it('should throw error if session authentication fails', async () => {
      mockApiUtils.executeRequest.mockRejectedValueOnce(
        new Error('Invalid credentials'),
      );

      await expect(connector.initialize(mockConfig)).rejects.toThrow(
        'Failed to authenticate with Metabase',
      );
    });
  });

  describe('testConnection', () => {
    beforeEach(async () => {
      // Mock successful session authentication
      mockApiUtils.executeRequest.mockResolvedValueOnce({
        data: { id: 'session-token-123' },
      });
      await connector.initialize(mockConfig);
    });

    it('should return success for valid connection', async () => {
      mockApiUtils.executeRequest.mockResolvedValueOnce({
        data: { id: 1, email: 'admin@example.com' },
      });

      const result = await connector.testConnection();

      expect(result.success).toBe(true);
      expect(mockApiUtils.executeRequest).toHaveBeenCalledWith(
        expect.objectContaining({
          method: 'GET',
          endpoint: expect.stringContaining('/api/user/current'),
        }),
      );
    });

    it('should return failure for invalid connection', async () => {
      mockApiUtils.executeRequest.mockRejectedValueOnce(
        new Error('Unauthorized'),
      );

      const result = await connector.testConnection();

      expect(result.success).toBe(false);
    });
  });

  describe('Action: get_question', () => {
    beforeEach(async () => {
      mockApiUtils.executeRequest.mockResolvedValueOnce({
        data: { id: 'session-token-123' },
      });
      await connector.initialize(mockConfig);
    });

    it('should get question by ID', async () => {
      const mockQuestion = {
        id: 123,
        name: 'Test Question',
        display: 'table',
        database_id: 1,
      };

      mockApiUtils.executeRequest.mockResolvedValueOnce({ data: mockQuestion });

      const result = await connector.executeAction('get_question', {
        questionId: '123',
      });

      expect(result.success).toBe(true);
      expect(mockApiUtils.executeRequest).toHaveBeenCalledWith(
        expect.objectContaining({
          method: 'GET',
          endpoint: expect.stringContaining('/api/card/123'),
        }),
      );
    });
  });

  describe('Action: get_all_questions', () => {
    beforeEach(async () => {
      mockApiUtils.executeRequest.mockResolvedValueOnce({
        data: { id: 'session-token-123' },
      });
      await connector.initialize(mockConfig);
    });

    it('should get all questions', async () => {
      const mockQuestions = [
        { id: 1, name: 'Question 1' },
        { id: 2, name: 'Question 2' },
      ];

      mockApiUtils.executeRequest.mockResolvedValueOnce({ data: mockQuestions });

      const result = await connector.executeAction('get_all_questions', {});

      expect(result.success).toBe(true);
      expect(mockApiUtils.executeRequest).toHaveBeenCalledWith(
        expect.objectContaining({
          method: 'GET',
          endpoint: expect.stringContaining('/api/card/'),
        }),
      );
    });
  });

  describe('Action: get_question_result', () => {
    beforeEach(async () => {
      mockApiUtils.executeRequest.mockResolvedValueOnce({
        data: { id: 'session-token-123' },
      });
      await connector.initialize(mockConfig);
    });

    it('should get question result in JSON format', async () => {
      const mockResult = {
        data: { rows: [[1, 'value1'], [2, 'value2']] },
      };

      mockApiUtils.executeRequest.mockResolvedValueOnce({ data: mockResult });

      const result = await connector.executeAction('get_question_result', {
        questionId: '123',
        format: 'json',
      });

      expect(result.success).toBe(true);
      expect(mockApiUtils.executeRequest).toHaveBeenCalledWith(
        expect.objectContaining({
          method: 'POST',
          endpoint: expect.stringContaining('/api/card/123/query/json'),
        }),
      );
    });

    it('should get question result in CSV format', async () => {
      mockApiUtils.executeRequest.mockResolvedValueOnce({ data: 'col1,col2\nval1,val2' });

      const result = await connector.executeAction('get_question_result', {
        questionId: '123',
        format: 'csv',
      });

      expect(result.success).toBe(true);
      expect(mockApiUtils.executeRequest).toHaveBeenCalledWith(
        expect.objectContaining({
          endpoint: expect.stringContaining('/api/card/123/query/csv'),
        }),
      );
    });
  });

  describe('Action: get_metric', () => {
    beforeEach(async () => {
      mockApiUtils.executeRequest.mockResolvedValueOnce({
        data: { id: 'session-token-123' },
      });
      await connector.initialize(mockConfig);
    });

    it('should get metric by ID', async () => {
      const mockMetric = {
        id: 456,
        name: 'Revenue Metric',
        definition: {},
      };

      mockApiUtils.executeRequest.mockResolvedValueOnce({ data: mockMetric });

      const result = await connector.executeAction('get_metric', {
        metricId: '456',
      });

      expect(result.success).toBe(true);
      expect(mockApiUtils.executeRequest).toHaveBeenCalledWith(
        expect.objectContaining({
          method: 'GET',
          endpoint: expect.stringContaining('/api/metric/456'),
        }),
      );
    });
  });

  describe('Action: get_all_metrics', () => {
    beforeEach(async () => {
      mockApiUtils.executeRequest.mockResolvedValueOnce({
        data: { id: 'session-token-123' },
      });
      await connector.initialize(mockConfig);
    });

    it('should get all metrics', async () => {
      const mockMetrics = [
        { id: 1, name: 'Metric 1' },
        { id: 2, name: 'Metric 2' },
      ];

      mockApiUtils.executeRequest.mockResolvedValueOnce({ data: mockMetrics });

      const result = await connector.executeAction('get_all_metrics', {});

      expect(result.success).toBe(true);
      expect(mockApiUtils.executeRequest).toHaveBeenCalledWith(
        expect.objectContaining({
          method: 'GET',
          endpoint: expect.stringContaining('/api/metric/'),
        }),
      );
    });
  });

  describe('Action: get_all_databases', () => {
    beforeEach(async () => {
      mockApiUtils.executeRequest.mockResolvedValueOnce({
        data: { id: 'session-token-123' },
      });
      await connector.initialize(mockConfig);
    });

    it('should get all databases', async () => {
      const mockDatabases = {
        data: [
          { id: 1, name: 'Production DB', engine: 'postgres' },
          { id: 2, name: 'Analytics DB', engine: 'mysql' },
        ],
      };

      mockApiUtils.executeRequest.mockResolvedValueOnce({ data: mockDatabases });

      const result = await connector.executeAction('get_all_databases', {
        simplify: false,
      });

      expect(result.success).toBe(true);
      expect(mockApiUtils.executeRequest).toHaveBeenCalledWith(
        expect.objectContaining({
          method: 'GET',
          endpoint: expect.stringContaining('/api/database/'),
        }),
      );
    });
  });

  describe('Action: get_database_fields', () => {
    beforeEach(async () => {
      mockApiUtils.executeRequest.mockResolvedValueOnce({
        data: { id: 'session-token-123' },
      });
      await connector.initialize(mockConfig);
    });

    it('should get database fields', async () => {
      const mockFields = [
        { id: 1, name: 'id', base_type: 'type/Integer' },
        { id: 2, name: 'name', base_type: 'type/Text' },
      ];

      mockApiUtils.executeRequest.mockResolvedValueOnce({ data: mockFields });

      const result = await connector.executeAction('get_database_fields', {
        databaseId: '1',
      });

      expect(result.success).toBe(true);
      expect(mockApiUtils.executeRequest).toHaveBeenCalledWith(
        expect.objectContaining({
          method: 'GET',
          endpoint: expect.stringContaining('/api/database/1/fields'),
        }),
      );
    });
  });

  describe('Action: add_database', () => {
    beforeEach(async () => {
      mockApiUtils.executeRequest.mockResolvedValueOnce({
        data: { id: 'session-token-123' },
      });
      await connector.initialize(mockConfig);
    });

    it('should add PostgreSQL database', async () => {
      const mockDatabase = { id: 3, name: 'New DB', engine: 'postgres' };

      mockApiUtils.executeRequest.mockResolvedValueOnce({ data: mockDatabase });

      const result = await connector.executeAction('add_database', {
        name: 'New DB',
        engine: 'postgres',
        host: 'localhost',
        port: 5432,
        user: 'admin',
        password: 'secret',
        dbName: 'mydb',
        fullSync: true,
      });

      expect(result.success).toBe(true);
      expect(mockApiUtils.executeRequest).toHaveBeenCalledWith(
        expect.objectContaining({
          method: 'POST',
          endpoint: expect.stringContaining('/api/database'),
        }),
      );
    });

    it('should add SQLite database with file path', async () => {
      const mockDatabase = { id: 4, name: 'SQLite DB', engine: 'sqlite' };

      mockApiUtils.executeRequest.mockResolvedValueOnce({ data: mockDatabase });

      const result = await connector.executeAction('add_database', {
        name: 'SQLite DB',
        engine: 'sqlite',
        filePath: '/path/to/database.db',
        fullSync: true,
      });

      expect(result.success).toBe(true);
    });
  });

  describe('Action: get_alert', () => {
    beforeEach(async () => {
      mockApiUtils.executeRequest.mockResolvedValueOnce({
        data: { id: 'session-token-123' },
      });
      await connector.initialize(mockConfig);
    });

    it('should get alert by ID', async () => {
      const mockAlert = {
        id: 789,
        card: { id: 123, name: 'Alert Card' },
        channels: [],
      };

      mockApiUtils.executeRequest.mockResolvedValueOnce({ data: mockAlert });

      const result = await connector.executeAction('get_alert', {
        alertId: '789',
      });

      expect(result.success).toBe(true);
      expect(mockApiUtils.executeRequest).toHaveBeenCalledWith(
        expect.objectContaining({
          method: 'GET',
          endpoint: expect.stringContaining('/api/alert/789'),
        }),
      );
    });
  });

  describe('Action: get_all_alerts', () => {
    beforeEach(async () => {
      mockApiUtils.executeRequest.mockResolvedValueOnce({
        data: { id: 'session-token-123' },
      });
      await connector.initialize(mockConfig);
    });

    it('should get all alerts', async () => {
      const mockAlerts = [
        { id: 1, card: { id: 100, name: 'Alert 1' } },
        { id: 2, card: { id: 200, name: 'Alert 2' } },
      ];

      mockApiUtils.executeRequest.mockResolvedValueOnce({ data: mockAlerts });

      const result = await connector.executeAction('get_all_alerts', {});

      expect(result.success).toBe(true);
      expect(mockApiUtils.executeRequest).toHaveBeenCalledWith(
        expect.objectContaining({
          method: 'GET',
          endpoint: expect.stringContaining('/api/alert/'),
        }),
      );
    });
  });

  describe('Unknown Action', () => {
    beforeEach(async () => {
      mockApiUtils.executeRequest.mockResolvedValueOnce({
        data: { id: 'session-token-123' },
      });
      await connector.initialize(mockConfig);
    });

    it('should throw error for unknown action', async () => {
      const result = await connector.executeAction('unknown_action', {});

      expect(result.success).toBe(false);
      expect(result.error?.message).toMatch(/unknown action|not found/i);
    });
  });

  describe('Session Token Authentication', () => {
    it('should use X-Metabase-Session header', async () => {
      mockApiUtils.executeRequest.mockResolvedValueOnce({
        data: { id: 'test-session-token' },
      });
      await connector.initialize(mockConfig);

      mockApiUtils.executeRequest.mockResolvedValueOnce({
        data: { id: 1, email: 'admin@example.com' },
      });
      await connector.testConnection();

      const callArgs = mockApiUtils.executeRequest.mock.calls[1][0];
      expect(callArgs.headers['X-Metabase-Session']).toBe('test-session-token');
    });
  });

  describe('Error Handling', () => {
    beforeEach(async () => {
      mockApiUtils.executeRequest.mockResolvedValueOnce({
        data: { id: 'session-token-123' },
      });
      await connector.initialize(mockConfig);
    });

    it('should handle API errors gracefully', async () => {
      mockApiUtils.executeRequest.mockRejectedValueOnce(
        new Error('API rate limit exceeded'),
      );

      const result = await connector.executeAction('get_all_questions', {});

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });
  });
});
