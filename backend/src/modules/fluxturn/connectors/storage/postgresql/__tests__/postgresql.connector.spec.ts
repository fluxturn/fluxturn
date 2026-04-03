/**
 * PostgreSQL Connector Tests
 *
 * Behavioral tests that verify database operations, queries, and connections.
 * Uses pg library mocking pattern for reliable testing.
 */

import { PostgreSQLConnector } from '../postgresql.connector';
import { POSTGRESQL_CONNECTOR } from '../postgresql.definition';

// Create mock client and pool outside jest.mock for reference
const mockClient = {
  query: jest.fn(),
  release: jest.fn()
};
const mockPool = {
  connect: jest.fn().mockResolvedValue(mockClient),
  query: jest.fn(),
  end: jest.fn()
};

// Mock pg library
jest.mock('pg', () => {
  return {
    Pool: jest.fn(() => mockPool)
  };
});

describe('PostgreSQLConnector', () => {
  let connector: PostgreSQLConnector;

  const mockConfig = {
    id: 'test-connector-id',
    name: 'Test PostgreSQL Connector',
    type: 'postgresql',
    category: 'database',
    credentials: {
      host: 'localhost',
      port: 5432,
      database: 'testdb',
      user: 'testuser',
      password: 'testpassword'
    },
    settings: {}
  } as any;

  beforeEach(() => {
    jest.clearAllMocks();
    connector = new PostgreSQLConnector();
    // Reset mock implementations
    mockClient.query.mockReset();
    mockClient.release.mockReset();
    mockPool.connect.mockReset().mockResolvedValue(mockClient);
  });

  describe('Metadata', () => {
    it('should return correct metadata', () => {
      const metadata = connector.getMetadata();

      expect(metadata.name).toBe('PostgreSQL');
      expect(metadata.category).toBe('database');
    });

    it('should return all defined actions', () => {
      const metadata = connector.getMetadata();
      const actionIds = metadata.actions.map(a => a.id);

      expect(actionIds).toContain('execute_query');
      expect(actionIds).toContain('select_rows');
      expect(actionIds).toContain('insert_rows');
      expect(actionIds).toContain('upsert_rows');
      expect(actionIds).toContain('update_rows');
      expect(actionIds).toContain('delete_rows');
    });

    it('should return all defined triggers', () => {
      const metadata = connector.getMetadata();
      const triggerIds = metadata.triggers.map(t => t.id);

      expect(triggerIds).toContain('new_row');
    });
  });

  describe('Connector-Definition Sync', () => {
    it('should have all connector actions in definition', () => {
      const metadata = connector.getMetadata();
      const connectorActionIds = metadata.actions.map(a => a.id);
      const definitionActionIds = POSTGRESQL_CONNECTOR.supported_actions?.map(a => a.id) || [];

      for (const actionId of connectorActionIds) {
        expect(definitionActionIds).toContain(actionId);
      }
    });

    it('should have all definition actions in connector', () => {
      const metadata = connector.getMetadata();
      const connectorActionIds = metadata.actions.map(a => a.id);
      const definitionActionIds = POSTGRESQL_CONNECTOR.supported_actions?.map(a => a.id) || [];

      for (const actionId of definitionActionIds) {
        expect(connectorActionIds).toContain(actionId);
      }
    });

    it('should have all connector triggers in definition', () => {
      const metadata = connector.getMetadata();
      const connectorTriggerIds = metadata.triggers.map(t => t.id);
      const definitionTriggerIds = POSTGRESQL_CONNECTOR.supported_triggers?.map(t => t.id) || [];

      for (const triggerId of connectorTriggerIds) {
        expect(definitionTriggerIds).toContain(triggerId);
      }
    });

    it('should have all definition triggers in connector', () => {
      const metadata = connector.getMetadata();
      const connectorTriggerIds = metadata.triggers.map(t => t.id);
      const definitionTriggerIds = POSTGRESQL_CONNECTOR.supported_triggers?.map(t => t.id) || [];

      for (const triggerId of definitionTriggerIds) {
        expect(connectorTriggerIds).toContain(triggerId);
      }
    });

    it('should have matching auth_fields keys for credentials', () => {
      const definitionAuthFields = POSTGRESQL_CONNECTOR.auth_fields || [];
      const expectedKeys = ['host', 'port', 'database', 'user', 'password'];

      for (const key of expectedKeys) {
        const hasField = definitionAuthFields.some((f: any) => f.key === key);
        expect(hasField).toBe(true);
      }
    });
  });

  describe('Action: execute_query', () => {
    it('should execute a raw SQL query', async () => {
      const freshConnector = new PostgreSQLConnector();

      // Mock for initialization (SELECT 1)
      mockClient.query
        .mockResolvedValueOnce({ rows: [{ '?column?': 1 }], rowCount: 1 })
        // Mock for actual query
        .mockResolvedValueOnce({
          rows: [{ id: 1, name: 'Test' }],
          rowCount: 1,
          fields: [],
          command: 'SELECT'
        });

      await freshConnector.initialize(mockConfig);
      const result = await freshConnector.executeAction('execute_query', {
        query: 'SELECT * FROM users WHERE id = $1',
        params: [1]
      });

      expect(result.success).toBe(true);
      expect(result.data.rows).toHaveLength(1);
    });

    it('should handle query errors', async () => {
      const freshConnector = new PostgreSQLConnector();

      // Mock for initialization
      mockClient.query
        .mockResolvedValueOnce({ rows: [{ '?column?': 1 }], rowCount: 1 })
        // Mock for query failure
        .mockRejectedValueOnce(new Error('Query error'));

      await freshConnector.initialize(mockConfig);
      const result = await freshConnector.executeAction('execute_query', {
        query: 'INVALID SQL'
      });

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });
  });

  describe('Action: select_rows', () => {
    it('should select rows from a table', async () => {
      const freshConnector = new PostgreSQLConnector();

      // Mock for initialization
      mockClient.query
        .mockResolvedValueOnce({ rows: [{ '?column?': 1 }], rowCount: 1 })
        // Mock for select
        .mockResolvedValueOnce({
          rows: [
            { id: 1, name: 'User 1' },
            { id: 2, name: 'User 2' }
          ],
          rowCount: 2
        });

      await freshConnector.initialize(mockConfig);
      const result = await freshConnector.executeAction('select_rows', {
        schema: 'public',
        table: 'users',
        columns: '*',
        limit: 10
      });

      expect(result.success).toBe(true);
      expect(result.data.rows).toHaveLength(2);
    });

    it('should select rows with conditions', async () => {
      const freshConnector = new PostgreSQLConnector();

      // Mock for initialization
      mockClient.query
        .mockResolvedValueOnce({ rows: [{ '?column?': 1 }], rowCount: 1 })
        // Mock for select with condition
        .mockResolvedValueOnce({
          rows: [{ id: 1, name: 'Active User' }],
          rowCount: 1
        });

      await freshConnector.initialize(mockConfig);
      const result = await freshConnector.executeAction('select_rows', {
        schema: 'public',
        table: 'users',
        columns: 'id, name',
        where: { status: 'active' }
      });

      expect(result.success).toBe(true);
    });
  });

  describe('Action: insert_rows', () => {
    it('should insert rows into a table', async () => {
      const freshConnector = new PostgreSQLConnector();

      // Mock for initialization
      mockClient.query
        .mockResolvedValueOnce({ rows: [{ '?column?': 1 }], rowCount: 1 })
        // Mock for insert
        .mockResolvedValueOnce({
          rows: [{ id: 1, name: 'New User', email: 'new@test.com' }],
          rowCount: 1
        });

      await freshConnector.initialize(mockConfig);
      const result = await freshConnector.executeAction('insert_rows', {
        schema: 'public',
        table: 'users',
        columnMappings: {
          mappings: [
            { column: 'name', value: 'New User' },
            { column: 'email', value: 'new@test.com' }
          ]
        },
        returning: '*'
      });

      expect(result.success).toBe(true);
    });
  });

  describe('Action: upsert_rows', () => {
    it('should upsert rows with conflict handling', async () => {
      const freshConnector = new PostgreSQLConnector();

      // Mock for initialization
      mockClient.query
        .mockResolvedValueOnce({ rows: [{ '?column?': 1 }], rowCount: 1 })
        // Mock for upsert
        .mockResolvedValueOnce({
          rows: [{ id: 1, name: 'Upserted User', email: 'upsert@test.com' }],
          rowCount: 1
        });

      await freshConnector.initialize(mockConfig);
      const result = await freshConnector.executeAction('upsert_rows', {
        schema: 'public',
        table: 'users',
        columnMappings: {
          mappings: [
            { column: 'email', value: 'upsert@test.com' },
            { column: 'name', value: 'Upserted User' }
          ]
        },
        conflictColumns: {
          columns: [{ column: 'email' }]
        },
        updateOnConflict: true,
        returning: '*'
      });

      expect(result.success).toBe(true);
    });
  });

  describe('Action: update_rows', () => {
    it('should update rows with conditions', async () => {
      const freshConnector = new PostgreSQLConnector();

      // Mock for initialization
      mockClient.query
        .mockResolvedValueOnce({ rows: [{ '?column?': 1 }], rowCount: 1 })
        // Mock for update
        .mockResolvedValueOnce({
          rows: [{ id: 1, name: 'Updated User' }],
          rowCount: 1
        });

      await freshConnector.initialize(mockConfig);
      const result = await freshConnector.executeAction('update_rows', {
        schema: 'public',
        table: 'users',
        columnMappings: {
          mappings: [{ column: 'name', value: 'Updated User' }]
        },
        where: { id: 1 },
        returning: '*'
      });

      expect(result.success).toBe(true);
    });
  });

  describe('Action: delete_rows', () => {
    it('should delete rows with conditions', async () => {
      const freshConnector = new PostgreSQLConnector();

      // Mock for initialization
      mockClient.query
        .mockResolvedValueOnce({ rows: [{ '?column?': 1 }], rowCount: 1 })
        // Mock for delete
        .mockResolvedValueOnce({
          rows: [{ id: 1 }],
          rowCount: 1
        });

      await freshConnector.initialize(mockConfig);
      const result = await freshConnector.executeAction('delete_rows', {
        operation: 'delete_rows',
        schema: 'public',
        table: 'users',
        where: { id: 1 },
        returning: '*'
      });

      expect(result.success).toBe(true);
    });

    it('should truncate table', async () => {
      const freshConnector = new PostgreSQLConnector();

      // Mock for initialization
      mockClient.query
        .mockResolvedValueOnce({ rows: [{ '?column?': 1 }], rowCount: 1 })
        // Mock for truncate
        .mockResolvedValueOnce({
          rows: [],
          rowCount: 0
        });

      await freshConnector.initialize(mockConfig);
      const result = await freshConnector.executeAction('delete_rows', {
        operation: 'truncate_table',
        schema: 'public',
        table: 'temp_data'
      });

      expect(result.success).toBe(true);
    });
  });

  describe('Error Handling', () => {
    it('should handle connection errors', async () => {
      const freshConnector = new PostgreSQLConnector();

      // Mock for initialization
      mockClient.query
        .mockResolvedValueOnce({ rows: [{ '?column?': 1 }], rowCount: 1 })
        // Mock for connection failure
        .mockRejectedValueOnce(new Error('Connection refused'));

      await freshConnector.initialize(mockConfig);
      const result = await freshConnector.executeAction('execute_query', {
        query: 'SELECT 1'
      });

      expect(result.success).toBe(false);
    });

    it('should handle unknown action', async () => {
      const freshConnector = new PostgreSQLConnector();

      // Mock for initialization
      mockClient.query.mockResolvedValueOnce({ rows: [{ '?column?': 1 }], rowCount: 1 });

      await freshConnector.initialize(mockConfig);
      const result = await freshConnector.executeAction('invalid_action', {});

      expect(result.success).toBe(false);
      expect(result.error?.message).toContain('not found');
    });
  });

  describe('Connection Test', () => {
    it('should test connection successfully', async () => {
      const freshConnector = new PostgreSQLConnector();

      // Mock for initialization and test
      mockClient.query
        .mockResolvedValueOnce({ rows: [{ '?column?': 1 }], rowCount: 1 }) // init
        .mockResolvedValueOnce({ rows: [{ '?column?': 1 }], rowCount: 1 }); // test

      await freshConnector.initialize(mockConfig);
      const result = await freshConnector.testConnection();

      expect(result.success).toBe(true);
    });

    it('should fail connection test with bad credentials', async () => {
      const freshConnector = new PostgreSQLConnector();

      // Mock for initialization success, then test failure
      mockClient.query
        .mockResolvedValueOnce({ rows: [{ '?column?': 1 }], rowCount: 1 }) // init
        .mockRejectedValueOnce(new Error('Authentication failed')); // test

      await freshConnector.initialize(mockConfig);
      const result = await freshConnector.testConnection();

      expect(result.success).toBe(false);
    });
  });
});
