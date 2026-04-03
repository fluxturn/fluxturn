/**
 * Snowflake Connector Tests
 *
 * Behavioral tests that verify database operations, queries, and connections.
 * Tests use the connector's built-in mock connection when snowflake-sdk is unavailable.
 */

import { SnowflakeConnector } from '../snowflake.connector';
import { SNOWFLAKE_CONNECTOR } from '../snowflake.definition';

describe('SnowflakeConnector', () => {
  let connector: SnowflakeConnector;

  const mockConfig = {
    id: 'test-connector-id',
    name: 'Test Snowflake Connector',
    type: 'snowflake',
    category: 'database',
    credentials: {
      account: 'xy12345.us-east-1',
      database: 'TEST_DB',
      warehouse: 'COMPUTE_WH',
      username: 'testuser',
      password: 'testpassword',
      authentication: 'password',
      schema: 'PUBLIC',
      role: 'SYSADMIN',
      clientSessionKeepAlive: false,
    },
    settings: {},
  } as any;

  const mockKeyPairConfig = {
    ...mockConfig,
    credentials: {
      ...mockConfig.credentials,
      authentication: 'keyPair',
      password: undefined,
      privateKey: '-----BEGIN PRIVATE KEY-----\nMIIEvgIBADANBg...\n-----END PRIVATE KEY-----',
      passphrase: 'test-passphrase',
    },
  };

  beforeEach(() => {
    jest.clearAllMocks();
    connector = new SnowflakeConnector();
  });

  describe('Metadata', () => {
    it('should return correct metadata', () => {
      const metadata = connector.getMetadata();

      expect(metadata.name).toBe('Snowflake');
      expect(metadata.category).toBe('database');
      expect(metadata.type).toBe('snowflake');
      expect(metadata.authType).toBe('custom');
      expect(metadata.webhookSupport).toBe(false);
    });

    it('should have correct rate limits', () => {
      const metadata = connector.getMetadata();

      expect(metadata.rateLimit?.requestsPerMinute).toBe(480);
    });
  });

  describe('Connector-Definition Sync', () => {
    it('should have matching name in connector and definition', () => {
      const metadata = connector.getMetadata();

      expect(metadata.name).toBe(SNOWFLAKE_CONNECTOR.display_name);
    });

    it('should have matching category in connector and definition', () => {
      const metadata = connector.getMetadata();

      expect(metadata.category).toBe(SNOWFLAKE_CONNECTOR.category);
    });

    it('should have all required auth_fields for password authentication', () => {
      const definitionAuthFields = SNOWFLAKE_CONNECTOR.auth_fields || [];
      const requiredKeys = ['account', 'database', 'warehouse', 'authentication', 'username', 'password'];

      for (const key of requiredKeys) {
        const hasField = definitionAuthFields.some((f: any) => f.key === key);
        expect(hasField).toBe(true);
      }
    });

    it('should have all required auth_fields for key-pair authentication', () => {
      const definitionAuthFields = SNOWFLAKE_CONNECTOR.auth_fields || [];
      const requiredKeys = ['privateKey', 'passphrase'];

      for (const key of requiredKeys) {
        const hasField = definitionAuthFields.some((f: any) => f.key === key);
        expect(hasField).toBe(true);
      }
    });

    it('should have optional auth_fields', () => {
      const definitionAuthFields = SNOWFLAKE_CONNECTOR.auth_fields || [];
      const optionalKeys = ['schema', 'role', 'clientSessionKeepAlive'];

      for (const key of optionalKeys) {
        const hasField = definitionAuthFields.some((f: any) => f.key === key);
        expect(hasField).toBe(true);
      }
    });

    it('should have all definition actions mapped correctly', () => {
      const definitionActionIds = SNOWFLAKE_CONNECTOR.supported_actions?.map((a) => a.id) || [];
      const expectedActions = [
        'execute_query',
        'insert',
        'update',
        'delete',
        'list_tables',
        'describe_table',
        'create_table',
        'drop_table',
        'list_warehouses',
        'resume_warehouse',
        'suspend_warehouse',
        'list_databases',
        'list_schemas',
        'list_stages',
        'copy_into_table',
      ];

      for (const actionId of expectedActions) {
        expect(definitionActionIds).toContain(actionId);
      }
    });

    it('should have no triggers defined (database connector)', () => {
      expect(SNOWFLAKE_CONNECTOR.supported_triggers).toEqual([]);
    });

    it('should have authentication field with correct options', () => {
      const definitionAuthFields = SNOWFLAKE_CONNECTOR.auth_fields || [];
      const authField = definitionAuthFields.find((f: any) => f.key === 'authentication');

      expect(authField).toBeDefined();
      expect(authField?.type).toBe('select');
      expect(authField?.options).toHaveLength(2);
      expect(authField?.options?.map((o: any) => o.value)).toContain('password');
      expect(authField?.options?.map((o: any) => o.value)).toContain('keyPair');
    });

    it('should have displayOptions for conditional password field', () => {
      const definitionAuthFields = SNOWFLAKE_CONNECTOR.auth_fields || [];
      const passwordField = definitionAuthFields.find((f: any) => f.key === 'password');

      expect(passwordField).toBeDefined();
      expect(passwordField?.displayOptions?.show?.authentication).toContain('password');
    });

    it('should have displayOptions for conditional privateKey field', () => {
      const definitionAuthFields = SNOWFLAKE_CONNECTOR.auth_fields || [];
      const privateKeyField = definitionAuthFields.find((f: any) => f.key === 'privateKey');

      expect(privateKeyField).toBeDefined();
      expect(privateKeyField?.displayOptions?.show?.authentication).toContain('keyPair');
    });
  });

  describe('Action: execute_query', () => {
    it('should execute a SQL query using mock connection', async () => {
      const freshConnector = new SnowflakeConnector();

      await freshConnector.initialize(mockConfig);
      const result = await freshConnector.executeAction('execute_query', {
        query: 'SELECT * FROM users',
      });

      // Mock connection returns empty results
      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
    });

    it('should execute query with parameters', async () => {
      const freshConnector = new SnowflakeConnector();

      await freshConnector.initialize(mockConfig);
      const result = await freshConnector.executeAction('execute_query', {
        query: 'SELECT * FROM users WHERE id = ?',
        parameters: [1],
      });

      expect(result.success).toBe(true);
    });
  });

  describe('Action: insert', () => {
    it('should insert rows into a table', async () => {
      const freshConnector = new SnowflakeConnector();

      await freshConnector.initialize(mockConfig);
      const result = await freshConnector.executeAction('insert', {
        table: 'users',
        columns: 'name,email',
        data: [{ name: 'New User', email: 'new@test.com' }],
      });

      expect(result.success).toBe(true);
      expect(result.data.insertedCount).toBe(1);
    });
  });

  describe('Action: update', () => {
    it('should update rows in a table', async () => {
      const freshConnector = new SnowflakeConnector();

      await freshConnector.initialize(mockConfig);
      const result = await freshConnector.executeAction('update', {
        table: 'users',
        updateKey: 'id',
        columns: 'name,email',
        data: [{ id: 1, name: 'Updated User', email: 'updated@test.com' }],
      });

      expect(result.success).toBe(true);
      expect(result.data.updatedCount).toBe(1);
    });
  });

  describe('Action: delete', () => {
    it('should delete rows from a table', async () => {
      const freshConnector = new SnowflakeConnector();

      await freshConnector.initialize(mockConfig);
      const result = await freshConnector.executeAction('delete', {
        table: 'users',
        whereClause: 'id = ?',
        parameters: [1],
      });

      expect(result.success).toBe(true);
    });
  });

  describe('Action: list_tables', () => {
    it('should list tables in a database', async () => {
      const freshConnector = new SnowflakeConnector();

      await freshConnector.initialize(mockConfig);
      const result = await freshConnector.executeAction('list_tables', {});

      expect(result.success).toBe(true);
      expect(result.data.tables).toBeDefined();
    });

    it('should list tables with pattern filter', async () => {
      const freshConnector = new SnowflakeConnector();

      await freshConnector.initialize(mockConfig);
      const result = await freshConnector.executeAction('list_tables', {
        pattern: '%_PROD',
      });

      expect(result.success).toBe(true);
    });
  });

  describe('Action: describe_table', () => {
    it('should describe table columns', async () => {
      const freshConnector = new SnowflakeConnector();

      await freshConnector.initialize(mockConfig);
      const result = await freshConnector.executeAction('describe_table', {
        table: 'users',
      });

      expect(result.success).toBe(true);
      expect(result.data.columns).toBeDefined();
    });
  });

  describe('Action: create_table', () => {
    it('should create a new table', async () => {
      const freshConnector = new SnowflakeConnector();

      await freshConnector.initialize(mockConfig);
      const result = await freshConnector.executeAction('create_table', {
        table: 'new_table',
        columns: [
          { name: 'id', dataType: 'INTEGER', nullable: false },
          { name: 'name', dataType: 'VARCHAR', nullable: true },
        ],
        primaryKey: 'id',
        ifNotExists: true,
      });

      expect(result.success).toBe(true);
      expect(result.data.success).toBe(true);
    });
  });

  describe('Action: drop_table', () => {
    it('should drop a table', async () => {
      const freshConnector = new SnowflakeConnector();

      await freshConnector.initialize(mockConfig);
      const result = await freshConnector.executeAction('drop_table', {
        table: 'old_table',
        ifExists: true,
      });

      expect(result.success).toBe(true);
    });
  });

  describe('Action: list_warehouses', () => {
    it('should list available warehouses', async () => {
      const freshConnector = new SnowflakeConnector();

      await freshConnector.initialize(mockConfig);
      const result = await freshConnector.executeAction('list_warehouses', {});

      expect(result.success).toBe(true);
      expect(result.data.warehouses).toBeDefined();
    });
  });

  describe('Action: resume_warehouse', () => {
    it('should resume a suspended warehouse', async () => {
      const freshConnector = new SnowflakeConnector();

      await freshConnector.initialize(mockConfig);
      const result = await freshConnector.executeAction('resume_warehouse', {
        warehouse: 'COMPUTE_WH',
      });

      expect(result.success).toBe(true);
    });
  });

  describe('Action: suspend_warehouse', () => {
    it('should suspend an active warehouse', async () => {
      const freshConnector = new SnowflakeConnector();

      await freshConnector.initialize(mockConfig);
      const result = await freshConnector.executeAction('suspend_warehouse', {
        warehouse: 'COMPUTE_WH',
      });

      expect(result.success).toBe(true);
    });
  });

  describe('Action: list_databases', () => {
    it('should list available databases', async () => {
      const freshConnector = new SnowflakeConnector();

      await freshConnector.initialize(mockConfig);
      const result = await freshConnector.executeAction('list_databases', {});

      expect(result.success).toBe(true);
      expect(result.data.databases).toBeDefined();
    });
  });

  describe('Action: list_schemas', () => {
    it('should list schemas in a database', async () => {
      const freshConnector = new SnowflakeConnector();

      await freshConnector.initialize(mockConfig);
      const result = await freshConnector.executeAction('list_schemas', {
        database: 'TEST_DB',
      });

      expect(result.success).toBe(true);
      expect(result.data.schemas).toBeDefined();
    });
  });

  describe('Action: list_stages', () => {
    it('should list stages for data loading', async () => {
      const freshConnector = new SnowflakeConnector();

      await freshConnector.initialize(mockConfig);
      const result = await freshConnector.executeAction('list_stages', {});

      expect(result.success).toBe(true);
      expect(result.data.stages).toBeDefined();
    });
  });

  describe('Action: copy_into_table', () => {
    it('should copy data from stage into table', async () => {
      const freshConnector = new SnowflakeConnector();

      await freshConnector.initialize(mockConfig);
      const result = await freshConnector.executeAction('copy_into_table', {
        table: 'users',
        stage: '@my_stage/data/',
        fileFormat: 'CSV',
      });

      expect(result.success).toBe(true);
    });
  });

  describe('Authentication', () => {
    it('should initialize with password authentication', async () => {
      const freshConnector = new SnowflakeConnector();

      await expect(freshConnector.initialize(mockConfig)).resolves.not.toThrow();
    });

    it('should initialize with key-pair authentication', async () => {
      const freshConnector = new SnowflakeConnector();

      await expect(freshConnector.initialize(mockKeyPairConfig)).resolves.not.toThrow();
    });

    it('should fail initialization without required credentials', async () => {
      const freshConnector = new SnowflakeConnector();
      const badConfig = {
        ...mockConfig,
        credentials: {
          account: 'xy12345',
          // Missing database, warehouse, username
        },
      };

      await expect(freshConnector.initialize(badConfig)).rejects.toThrow();
    });

    it('should fail initialization without password or private key', async () => {
      const freshConnector = new SnowflakeConnector();
      const badConfig = {
        ...mockConfig,
        credentials: {
          account: 'xy12345',
          database: 'TEST_DB',
          warehouse: 'COMPUTE_WH',
          username: 'testuser',
          authentication: 'password',
          // Missing password
        },
      };

      await expect(freshConnector.initialize(badConfig)).rejects.toThrow();
    });
  });

  describe('Connection Test', () => {
    it('should test connection successfully with mock', async () => {
      const freshConnector = new SnowflakeConnector();

      await freshConnector.initialize(mockConfig);
      const result = await freshConnector.testConnection();

      // Mock connection should succeed
      expect(result.success).toBe(true);
    });
  });

  describe('Error Handling', () => {
    it('should handle unknown action', async () => {
      const freshConnector = new SnowflakeConnector();

      await freshConnector.initialize(mockConfig);
      const result = await freshConnector.executeAction('invalid_action', {});

      expect(result.success).toBe(false);
      expect(result.error?.message).toContain('Unknown action');
    });
  });

  describe('Cleanup', () => {
    it('should cleanup connection on destroy', async () => {
      const freshConnector = new SnowflakeConnector();

      await freshConnector.initialize(mockConfig);
      await freshConnector.destroy();

      // Should not throw
      expect(true).toBe(true);
    });
  });

  describe('Definition Validation', () => {
    it('should have valid inputSchema for execute_query action', () => {
      const executeQueryAction = SNOWFLAKE_CONNECTOR.supported_actions?.find((a) => a.id === 'execute_query');

      expect(executeQueryAction).toBeDefined();
      expect(executeQueryAction?.inputSchema?.query).toBeDefined();
      expect(executeQueryAction?.inputSchema?.query.required).toBe(true);
      expect(executeQueryAction?.inputSchema?.query.type).toBe('string');
    });

    it('should have valid inputSchema for insert action', () => {
      const insertAction = SNOWFLAKE_CONNECTOR.supported_actions?.find((a) => a.id === 'insert');

      expect(insertAction).toBeDefined();
      expect(insertAction?.inputSchema?.table).toBeDefined();
      expect(insertAction?.inputSchema?.table.required).toBe(true);
      expect(insertAction?.inputSchema?.columns).toBeDefined();
      expect(insertAction?.inputSchema?.data).toBeDefined();
    });

    it('should have valid inputSchema for update action', () => {
      const updateAction = SNOWFLAKE_CONNECTOR.supported_actions?.find((a) => a.id === 'update');

      expect(updateAction).toBeDefined();
      expect(updateAction?.inputSchema?.table).toBeDefined();
      expect(updateAction?.inputSchema?.updateKey).toBeDefined();
      expect(updateAction?.inputSchema?.columns).toBeDefined();
    });

    it('should have valid inputSchema for delete action', () => {
      const deleteAction = SNOWFLAKE_CONNECTOR.supported_actions?.find((a) => a.id === 'delete');

      expect(deleteAction).toBeDefined();
      expect(deleteAction?.inputSchema?.table).toBeDefined();
      expect(deleteAction?.inputSchema?.whereClause).toBeDefined();
    });

    it('should have valid inputSchema for copy_into_table action', () => {
      const copyAction = SNOWFLAKE_CONNECTOR.supported_actions?.find((a) => a.id === 'copy_into_table');

      expect(copyAction).toBeDefined();
      expect(copyAction?.inputSchema?.table).toBeDefined();
      expect(copyAction?.inputSchema?.stage).toBeDefined();
      expect(copyAction?.inputSchema?.fileFormat).toBeDefined();
    });

    it('should have correct fileFormat options for copy_into_table', () => {
      const copyAction = SNOWFLAKE_CONNECTOR.supported_actions?.find((a) => a.id === 'copy_into_table');
      const fileFormatOptions = copyAction?.inputSchema?.fileFormat?.options?.map((o: any) => o.value);

      expect(fileFormatOptions).toContain('CSV');
      expect(fileFormatOptions).toContain('JSON');
      expect(fileFormatOptions).toContain('PARQUET');
      expect(fileFormatOptions).toContain('AVRO');
      expect(fileFormatOptions).toContain('ORC');
    });

    it('should have correct onError options for copy_into_table', () => {
      const copyAction = SNOWFLAKE_CONNECTOR.supported_actions?.find((a) => a.id === 'copy_into_table');
      const onErrorOptions = copyAction?.inputSchema?.onError?.options?.map((o: any) => o.value);

      expect(onErrorOptions).toContain('ABORT_STATEMENT');
      expect(onErrorOptions).toContain('CONTINUE');
      expect(onErrorOptions).toContain('SKIP_FILE');
    });

    it('should have correct dataType options for create_table columns', () => {
      const createTableAction = SNOWFLAKE_CONNECTOR.supported_actions?.find((a) => a.id === 'create_table');
      const dataTypeOptions = createTableAction?.inputSchema?.columns?.itemSchema?.dataType?.options?.map(
        (o: any) => o.value,
      );

      expect(dataTypeOptions).toContain('VARCHAR');
      expect(dataTypeOptions).toContain('NUMBER');
      expect(dataTypeOptions).toContain('INTEGER');
      expect(dataTypeOptions).toContain('FLOAT');
      expect(dataTypeOptions).toContain('BOOLEAN');
      expect(dataTypeOptions).toContain('DATE');
      expect(dataTypeOptions).toContain('TIMESTAMP');
      expect(dataTypeOptions).toContain('VARIANT');
      expect(dataTypeOptions).toContain('ARRAY');
      expect(dataTypeOptions).toContain('OBJECT');
    });
  });
});
