import { Injectable } from '@nestjs/common';
import { BaseConnector } from '../../base/base.connector';
import { IDataConnector } from '../../base/connector.interface';
import {
  ConnectorMetadata,
  ConnectorType,
  ConnectorCategory,
  ConnectorRequest,
  ConnectorResponse,
  AuthType,
  PaginatedRequest,
  ConnectorAction,
  ConnectorTrigger,
  BulkOperation,
  BulkOperationResult,
  ConnectorError
} from '../../types';
import { Pool, PoolClient, QueryResult } from 'pg';

interface PostgreSQLConfig {
  host: string;
  port?: number;
  user: string;
  password: string;
  database: string;
  ssl?: boolean | any;
  connectionLimit?: number;
  connectionTimeoutMillis?: number;
  idleTimeoutMillis?: number;
  max?: number;
}

interface PostgreSQLQueryResult {
  rows: any[];
  rowCount: number;
  fields: any[];
  command: string;
}

@Injectable()
export class PostgreSQLConnector extends BaseConnector implements IDataConnector {
  private pool: Pool;
  private isConnected = false;
  private lastPollTimestamps: Map<string, Date> = new Map();

  getMetadata(): ConnectorMetadata {
    return {
      name: 'PostgreSQL',
      description: 'PostgreSQL relational database operations and management',
      version: '1.0.0',
      category: ConnectorCategory.DATABASE,
      type: ConnectorType.POSTGRESQL,
      logoUrl: 'https://www.postgresql.org/media/img/about/press/elephant.png',
      documentationUrl: 'https://www.postgresql.org/docs/',
      authType: AuthType.CUSTOM,
      actions: this.getActions(),
      triggers: this.getTriggers(),
      rateLimit: {
        requestsPerSecond: 100,
        requestsPerMinute: 6000,
        requestsPerDay: 8640000
      },
      webhookSupport: true
    };
  }

  protected async initializeConnection(): Promise<void> {
    try {
      const config = this.config.credentials as PostgreSQLConfig;

      const poolConfig = {
        host: config.host,
        port: config.port || 5432,
        user: config.user,
        password: config.password,
        database: config.database,
        max: config.connectionLimit || config.max || 100,
        idleTimeoutMillis: config.idleTimeoutMillis || 30000,
        connectionTimeoutMillis: config.connectionTimeoutMillis || 2000,
        ssl: config.ssl ? (typeof config.ssl === 'boolean' ? { rejectUnauthorized: false } : config.ssl) : false
      };

      this.pool = new Pool(poolConfig);

      // Test the connection
      const client = await this.pool.connect();
      await client.query('SELECT 1');
      client.release();

      this.isConnected = true;
      this.logger.log('PostgreSQL connector initialized successfully');
    } catch (error) {
      throw new Error(`PostgreSQL connection failed: ${error.message}`);
    }
  }

  protected async performConnectionTest(): Promise<boolean> {
    try {
      if (!this.isConnected || !this.pool) {
        return false;
      }

      const client = await this.pool.connect();
      await client.query('SELECT 1');
      client.release();
      return true;
    } catch (error) {
      return false;
    }
  }

  protected async performHealthCheck(): Promise<void> {
    try {
      if (!this.isConnected || !this.pool) {
        throw new Error('PostgreSQL pool not initialized');
      }

      const client = await this.pool.connect();
      const result = await client.query('SELECT 1 as health_check');
      client.release();

      if (!result.rows || result.rows[0]?.health_check !== 1) {
        throw new Error('PostgreSQL health check query failed');
      }
    } catch (error) {
      throw new Error(`PostgreSQL health check failed: ${error.message}`);
    }
  }

  protected async performRequest(request: ConnectorRequest): Promise<any> {
    throw new Error('Direct request execution not supported for PostgreSQL. Use specific methods.');
  }

  protected async performAction(actionId: string, input: any): Promise<any> {
    switch (actionId) {
      case 'execute_query':
        return this.executeQuery(input.query, input.params);
      case 'select_rows':
        return this.selectRows(input);
      case 'insert_rows':
        return this.insertRows(input);
      case 'upsert_rows':
        return this.upsertRows(input);
      case 'update_rows':
        return this.updateRows(input);
      case 'delete_rows':
        return this.deleteRows(input);
      default:
        throw new Error(`Unknown action: ${actionId}`);
    }
  }

  protected async cleanup(): Promise<void> {
    try {
      if (this.pool) {
        await this.pool.end();
        this.isConnected = false;
      }
      this.logger.log('PostgreSQL connector cleanup completed');
    } catch (error) {
      this.logger.error('Error during PostgreSQL cleanup:', error);
    }
  }

  // ============== PostgreSQL Action Methods ==============

  async executeQuery(query: string, params?: any[]): Promise<ConnectorResponse> {
    let client: PoolClient | undefined;

    try {
      client = await this.pool.connect();
      const startTime = Date.now();

      const result: QueryResult = await client.query(query, params);
      const executionTime = Date.now() - startTime;

      return {
        success: true,
        data: {
          rows: result.rows,
          rowCount: result.rowCount,
          fields: result.fields,
          command: result.command,
          executionTime
        },
        metadata: {
          timestamp: new Date(),
          executionTime
        } as any
      };
    } catch (error) {
      return this.handleError(error as any, 'Failed to execute query');
    } finally {
      if (client) client.release();
    }
  }

  async selectRows(input: {
    schema?: string;
    table: string;
    columns?: string;
    where?: Record<string, any>;
    limit?: number;
    offset?: number;
    orderBy?: string;
  }): Promise<ConnectorResponse> {
    let client: PoolClient | undefined;

    try {
      client = await this.pool.connect();

      const schema = input.schema || 'public';
      const columns = input.columns || '*';
      let query = `SELECT ${columns} FROM "${schema}"."${input.table}"`;
      const params: any[] = [];
      let paramCount = 1;

      if (input.where && Object.keys(input.where).length > 0) {
        const whereClauses = Object.keys(input.where).map(key => {
          params.push(input.where![key]);
          return `"${key}" = $${paramCount++}`;
        });
        query += ` WHERE ${whereClauses.join(' AND ')}`;
      }

      if (input.orderBy) {
        query += ` ORDER BY ${input.orderBy}`;
      }

      if (input.limit) {
        query += ` LIMIT ${parseInt(input.limit.toString())}`;
      }

      if (input.offset) {
        query += ` OFFSET ${parseInt(input.offset.toString())}`;
      }

      const result = await client.query(query, params);

      return {
        success: true,
        data: {
          rows: result.rows,
          rowCount: result.rowCount
        },
        metadata: {
          timestamp: new Date()
        } as any
      };
    } catch (error) {
      return this.handleError(error as any, 'Failed to select rows');
    } finally {
      if (client) client.release();
    }
  }

  async insertRows(input: {
    schema?: string;
    table: string;
    data?: any | any[];
    columnMappings?: Array<{ column: string; value: any }> | { mappings: Array<{ column: string; value: any }> };
    returning?: string;
  }): Promise<ConnectorResponse> {
    let client: PoolClient | undefined;

    try {
      client = await this.pool.connect();
      const schema = input.schema || 'public';

      // Debug: Log the raw input
      this.logger.debug('Insert rows input:', JSON.stringify(input, null, 2));

      // Handle both columnMappings (new) and data (legacy) formats
      let records: any[];
      let mappings: Array<{ column: string; value: any }> | null = null;

      // Extract mappings from fixedCollection structure or direct array
      if (input.columnMappings) {
        this.logger.debug('columnMappings received:', JSON.stringify(input.columnMappings, null, 2));

        if (Array.isArray(input.columnMappings)) {
          // Old format: direct array
          mappings = input.columnMappings;
        } else if (input.columnMappings.mappings && Array.isArray(input.columnMappings.mappings)) {
          // New format: fixedCollection with mappings property
          mappings = input.columnMappings.mappings;
        }

        this.logger.debug('Extracted mappings:', JSON.stringify(mappings, null, 2));
      }

      if (mappings && mappings.length > 0) {
        // Convert columnMappings to data object
        const dataObject: any = {};
        mappings.forEach(mapping => {
          dataObject[mapping.column] = mapping.value;
        });
        records = [dataObject];
      } else if (input.data) {
        records = Array.isArray(input.data) ? input.data : [input.data];
      } else {
        throw new Error('No data or columnMappings provided for insert');
      }

      if (records.length === 0) {
        throw new Error('No data provided for insert');
      }

      const columns = Object.keys(records[0]);
      const columnList = columns.map(col => `"${col}"`).join(', ');

      let query = `INSERT INTO "${schema}"."${input.table}" (${columnList}) VALUES `;
      const params: any[] = [];
      let paramCount = 1;

      const valuesClauses = records.map(record => {
        const placeholders = columns.map(() => `$${paramCount++}`).join(', ');
        columns.forEach(col => params.push(record[col]));
        return `(${placeholders})`;
      });

      query += valuesClauses.join(', ');

      if (input.returning) {
        query += ` RETURNING ${input.returning}`;
      }

      const result = await client.query(query, params);

      return {
        success: true,
        data: {
          rows: result.rows,
          rowCount: result.rowCount,
          insertedRows: records.length
        },
        metadata: {
          timestamp: new Date()
        } as any
      };
    } catch (error) {
      return this.handleError(error as any, 'Failed to insert rows');
    } finally {
      if (client) client.release();
    }
  }

  async upsertRows(input: {
    schema?: string;
    table: string;
    data?: any | any[];
    columnMappings?: Array<{ column: string; value: any }> | { mappings: Array<{ column: string; value: any }> };
    conflictColumns: string[] | { column: string }[] | { columns: Array<{ column: string }> };
    updateOnConflict?: boolean;
    returning?: string;
  }): Promise<ConnectorResponse> {
    let client: PoolClient | undefined;

    try {
      client = await this.pool.connect();
      const schema = input.schema || 'public';

      // Handle both columnMappings (new) and data (legacy) formats
      let records: any[];
      let mappings: Array<{ column: string; value: any }> | null = null;

      // Extract mappings from fixedCollection structure or direct array
      if (input.columnMappings) {
        if (Array.isArray(input.columnMappings)) {
          // Old format: direct array
          mappings = input.columnMappings;
        } else if (input.columnMappings.mappings && Array.isArray(input.columnMappings.mappings)) {
          // New format: fixedCollection with mappings property
          mappings = input.columnMappings.mappings;
        }
      }

      if (mappings && mappings.length > 0) {
        // Convert columnMappings to data object
        const dataObject: any = {};
        mappings.forEach(mapping => {
          dataObject[mapping.column] = mapping.value;
        });
        records = [dataObject];
      } else if (input.data) {
        records = Array.isArray(input.data) ? input.data : [input.data];
      } else {
        throw new Error('No data or columnMappings provided for upsert');
      }

      if (records.length === 0) {
        throw new Error('No data provided for upsert');
      }

      // Normalize conflict columns - handle fixedCollection structure
      let conflictColumns: string[];
      if (Array.isArray(input.conflictColumns)) {
        conflictColumns = input.conflictColumns.map(col =>
          typeof col === 'string' ? col : col.column
        );
      } else if (input.conflictColumns.columns && Array.isArray(input.conflictColumns.columns)) {
        // New format: fixedCollection with columns property
        conflictColumns = input.conflictColumns.columns.map(item => item.column);
      } else {
        throw new Error('Invalid conflictColumns format');
      }

      const columns = Object.keys(records[0]);
      const columnList = columns.map(col => `"${col}"`).join(', ');

      let query = `INSERT INTO "${schema}"."${input.table}" (${columnList}) VALUES `;
      const params: any[] = [];
      let paramCount = 1;

      const valuesClauses = records.map(record => {
        const placeholders = columns.map(() => `$${paramCount++}`).join(', ');
        columns.forEach(col => params.push(record[col]));
        return `(${placeholders})`;
      });

      query += valuesClauses.join(', ');

      // Add ON CONFLICT clause
      const conflictColumnsList = conflictColumns.map(col => `"${col}"`).join(', ');
      const shouldUpdate = input.updateOnConflict !== false; // Default to true

      if (shouldUpdate) {
        query += ` ON CONFLICT (${conflictColumnsList}) DO UPDATE SET `;

        // Update all columns except conflict columns
        const updateColumns = columns.filter(col => !conflictColumns.includes(col));
        const updateClauses = updateColumns.map(col => `"${col}" = EXCLUDED."${col}"`);
        query += updateClauses.join(', ');
      } else {
        query += ` ON CONFLICT (${conflictColumnsList}) DO NOTHING`;
      }

      if (input.returning) {
        query += ` RETURNING ${input.returning}`;
      }

      const result = await client.query(query, params);

      return {
        success: true,
        data: {
          rows: result.rows,
          rowCount: result.rowCount
        },
        metadata: {
          timestamp: new Date()
        } as any
      };
    } catch (error) {
      return this.handleError(error as any, 'Failed to upsert rows');
    } finally {
      if (client) client.release();
    }
  }

  async updateRows(input: {
    schema?: string;
    table: string;
    data?: Record<string, any>;
    columnMappings?: Array<{ column: string; value: any }> | { mappings: Array<{ column: string; value: any }> };
    where: Record<string, any>;
    returning?: string;
  }): Promise<ConnectorResponse> {
    let client: PoolClient | undefined;

    try {
      client = await this.pool.connect();

      const schema = input.schema || 'public';

      // Handle both columnMappings (new) and data (legacy) formats
      let dataToUpdate: Record<string, any>;
      let mappings: Array<{ column: string; value: any }> | null = null;

      // Extract mappings from fixedCollection structure or direct array
      if (input.columnMappings) {
        if (Array.isArray(input.columnMappings)) {
          // Old format: direct array
          mappings = input.columnMappings;
        } else if (input.columnMappings.mappings && Array.isArray(input.columnMappings.mappings)) {
          // New format: fixedCollection with mappings property
          mappings = input.columnMappings.mappings;
        }
      }

      if (mappings && mappings.length > 0) {
        // Convert columnMappings to data object
        dataToUpdate = {};
        mappings.forEach(mapping => {
          dataToUpdate[mapping.column] = mapping.value;
        });
      } else if (input.data) {
        dataToUpdate = input.data;
      } else {
        throw new Error('No data or columnMappings provided for update');
      }

      const setClauses = Object.keys(dataToUpdate).map((key, index) => `"${key}" = $${index + 1}`);
      const setValues = Object.values(dataToUpdate);

      let query = `UPDATE "${schema}"."${input.table}" SET ${setClauses.join(', ')}`;
      const params = [...setValues];
      let paramCount = setValues.length + 1;

      if (input.where && Object.keys(input.where).length > 0) {
        const whereClauses = Object.keys(input.where).map(key => {
          params.push(input.where[key]);
          return `"${key}" = $${paramCount++}`;
        });
        query += ` WHERE ${whereClauses.join(' AND ')}`;
      } else {
        throw new Error('WHERE clause is required for UPDATE operation');
      }

      if (input.returning) {
        query += ` RETURNING ${input.returning}`;
      }

      const result = await client.query(query, params);

      return {
        success: true,
        data: {
          rows: result.rows,
          rowCount: result.rowCount
        },
        metadata: {
          timestamp: new Date()
        } as any
      };
    } catch (error) {
      return this.handleError(error as any, 'Failed to update rows');
    } finally {
      if (client) client.release();
    }
  }

  async deleteRows(input: {
    operation?: string;
    table: string;
    where?: Record<string, any>;
    returning?: string;
    cascade?: boolean;
  }): Promise<ConnectorResponse> {
    let client: PoolClient | undefined;

    try {
      client = await this.pool.connect();

      const operation = input.operation || 'delete_rows';

      if (operation === 'drop_table') {
        const cascade = input.cascade ? 'CASCADE' : '';
        const query = `DROP TABLE IF EXISTS "${input.table}" ${cascade}`;
        await client.query(query);

        return {
          success: true,
          data: {
            success: true,
            message: `Table ${input.table} dropped successfully`
          },
          metadata: {
            timestamp: new Date()
          } as any
        };
      } else if (operation === 'truncate_table') {
        const query = `TRUNCATE TABLE "${input.table}" RESTART IDENTITY CASCADE`;
        await client.query(query);

        return {
          success: true,
          data: {
            success: true,
            message: `Table ${input.table} truncated successfully`
          },
          metadata: {
            timestamp: new Date()
          } as any
        };
      } else {
        // delete_rows
        let query = `DELETE FROM "${input.table}"`;
        const params: any[] = [];
        let paramCount = 1;

        if (input.where && Object.keys(input.where).length > 0) {
          const whereClauses = Object.keys(input.where).map(key => {
            params.push(input.where![key]);
            return `"${key}" = $${paramCount++}`;
          });
          query += ` WHERE ${whereClauses.join(' AND ')}`;
        }

        if (input.returning) {
          query += ` RETURNING ${input.returning}`;
        }

        const result = await client.query(query, params);

        return {
          success: true,
          data: {
            rows: result.rows,
            rowCount: result.rowCount,
            success: true
          },
          metadata: {
            timestamp: new Date()
          } as any
        };
      }
    } catch (error) {
      return this.handleError(error as any, 'Failed to delete rows');
    } finally {
      if (client) client.release();
    }
  }

  // ============== Trigger Methods ==============

  async pollNewRows(input: {
    table: string;
    triggerOn: string;
    timestampColumn: string;
    columns?: string;
  }): Promise<ConnectorResponse> {
    let client: PoolClient | undefined;

    try {
      client = await this.pool.connect();

      const triggerKey = `${input.table}_${input.triggerOn}`;
      const lastPoll = this.lastPollTimestamps.get(triggerKey) || new Date(0);

      const columns = input.columns || '*';
      let query = `SELECT ${columns} FROM "${input.table}" WHERE "${input.timestampColumn}" > $1 ORDER BY "${input.timestampColumn}" ASC`;

      const result = await client.query(query, [lastPoll]);

      // Update last poll timestamp
      if (result.rows.length > 0) {
        const latestRow = result.rows[result.rows.length - 1];
        const latestTimestamp = new Date(latestRow[input.timestampColumn]);
        this.lastPollTimestamps.set(triggerKey, latestTimestamp);
      } else {
        this.lastPollTimestamps.set(triggerKey, new Date());
      }

      return {
        success: true,
        data: {
          rows: result.rows,
          count: result.rowCount,
          lastPolledAt: new Date().toISOString()
        },
        metadata: {
          timestamp: new Date()
        } as any
      };
    } catch (error) {
      return this.handleError(error as any, 'Failed to poll for new rows');
    } finally {
      if (client) client.release();
    }
  }

  // ============== IDataConnector Implementation ==============

  async create(data: any): Promise<ConnectorResponse> {
    return this.insertRows({
      table: data.table || 'default_table',
      data: data.record || data,
      returning: data.returning
    });
  }

  async read(request?: PaginatedRequest): Promise<ConnectorResponse> {
    const table = request?.filters?.table || 'default_table';
    return this.selectRows({
      table,
      where: request?.filters?.where,
      limit: request?.pageSize || 100,
      offset: ((request?.page || 1) - 1) * (request?.pageSize || 100),
      orderBy: request?.sortBy ? `"${request.sortBy}" ${request.sortOrder === 'desc' ? 'DESC' : 'ASC'}` : undefined
    });
  }

  async update(id: string, data: any): Promise<ConnectorResponse> {
    return this.updateRows({
      table: data.table || 'default_table',
      data: data.record || data,
      where: { id },
      returning: data.returning
    });
  }

  async delete(id: string, options?: any): Promise<ConnectorResponse> {
    return this.deleteRows({
      table: options?.table || 'default_table',
      where: { id },
      returning: options?.returning
    });
  }

  async search(query: string, options?: any): Promise<ConnectorResponse> {
    const table = options?.table || 'default_table';
    const searchColumn = options?.column || 'name';

    const sql = `SELECT * FROM "${table}" WHERE "${searchColumn}" ILIKE $1`;
    return this.executeQuery(sql, [`%${query}%`]);
  }

  async bulk<T>(operation: BulkOperation<T>): Promise<BulkOperationResult<T>> {
    const successful: T[] = [];
    const failed: Array<{ item: T; error: ConnectorError }> = [];

    try {
      const batchSize = operation.batchSize || 100;
      const batches = this.chunkArray(operation.items, batchSize);

      for (const batch of batches) {
        try {
          let result: ConnectorResponse;

          switch (operation.operation) {
            case 'create':
              result = await this.insertRows({ table: 'documents', data: batch });
              break;
            case 'update':
              result = { success: false, error: { message: 'Bulk update not implemented', code: 'NOT_IMPLEMENTED' } };
              break;
            case 'delete':
              result = { success: false, error: { message: 'Bulk delete not implemented', code: 'NOT_IMPLEMENTED' } };
              break;
            default:
              throw new Error(`Unsupported operation: ${operation.operation}`);
          }

          if (result.success) {
            successful.push(...batch);
          } else if (!operation.continueOnError) {
            batch.forEach(item => {
              failed.push({ item, error: { message: result.error?.message || 'Unknown error', code: 'BULK_OPERATION_FAILED' } });
            });
          }
        } catch (error) {
          if (operation.continueOnError) {
            batch.forEach(item => {
              failed.push({ item, error: { message: error.message, code: 'BULK_OPERATION_FAILED' } });
            });
          } else {
            throw error;
          }
        }
      }

      return {
        successful,
        failed,
        totalProcessed: operation.items.length,
        totalSuccessful: successful.length,
        totalFailed: failed.length
      };
    } catch (error) {
      operation.items.forEach(item => {
        failed.push({ item, error: { message: error.message, code: 'BULK_OPERATION_FAILED' } });
      });

      return {
        successful,
        failed,
        totalProcessed: operation.items.length,
        totalSuccessful: successful.length,
        totalFailed: failed.length
      };
    }
  }

  private chunkArray<T>(array: T[], chunkSize: number): T[][] {
    const chunks: T[][] = [];
    for (let i = 0; i < array.length; i += chunkSize) {
      chunks.push(array.slice(i, i + chunkSize));
    }
    return chunks;
  }

  // ============== Dynamic Resource Loading Methods ==============

  /**
   * Get list of available schemas in the database
   */
  async getSchemas(): Promise<Array<{ label: string; value: string }>> {
    let client: PoolClient | undefined;

    try {
      client = await this.pool.connect();

      const result = await client.query(`
        SELECT schema_name
        FROM information_schema.schemata
        WHERE schema_name NOT IN ('pg_catalog', 'information_schema', 'pg_toast')
        ORDER BY schema_name
      `);

      return result.rows.map(row => ({
        label: row.schema_name,
        value: row.schema_name
      }));
    } catch (error) {
      this.logger.error('Failed to fetch schemas:', error);
      return [];
    } finally {
      if (client) client.release();
    }
  }

  /**
   * Get list of tables in a schema
   */
  async getTables(schema: string = 'public'): Promise<Array<{ label: string; value: string }>> {
    let client: PoolClient | undefined;

    try {
      client = await this.pool.connect();

      const result = await client.query(`
        SELECT table_name, table_type
        FROM information_schema.tables
        WHERE table_schema = $1
        AND table_type IN ('BASE TABLE', 'VIEW')
        ORDER BY table_name
      `, [schema]);

      return result.rows.map(row => ({
        label: row.table_type === 'VIEW' ? `${row.table_name} (View)` : row.table_name,
        value: row.table_name
      }));
    } catch (error) {
      this.logger.error('Failed to fetch tables:', error);
      return [];
    } finally {
      if (client) client.release();
    }
  }

  /**
   * Get list of columns from a table
   */
  async getColumns(schema: string = 'public', table: string): Promise<Array<{ label: string; value: string; type?: string }>> {
    let client: PoolClient | undefined;

    try {
      client = await this.pool.connect();

      const result = await client.query(`
        SELECT
          column_name,
          data_type,
          is_nullable,
          column_default,
          character_maximum_length
        FROM information_schema.columns
        WHERE table_schema = $1
        AND table_name = $2
        ORDER BY ordinal_position
      `, [schema, table]);

      return result.rows.map(row => {
        const typeInfo = row.character_maximum_length
          ? `${row.data_type}(${row.character_maximum_length})`
          : row.data_type;

        const nullableInfo = row.is_nullable === 'NO' ? ' NOT NULL' : '';

        return {
          label: `${row.column_name} (${typeInfo}${nullableInfo})`,
          value: row.column_name,
          type: row.data_type
        };
      });
    } catch (error) {
      this.logger.error('Failed to fetch columns:', error);
      return [];
    } finally {
      if (client) client.release();
    }
  }

  /**
   * Get table schema with column details
   */
  async getTableSchema(schema: string = 'public', table: string): Promise<any> {
    let client: PoolClient | undefined;

    try {
      client = await this.pool.connect();

      // Get column information
      const columnsResult = await client.query(`
        SELECT
          column_name,
          data_type,
          is_nullable,
          column_default,
          character_maximum_length,
          numeric_precision,
          numeric_scale
        FROM information_schema.columns
        WHERE table_schema = $1
        AND table_name = $2
        ORDER BY ordinal_position
      `, [schema, table]);

      // Get primary key information
      const pkResult = await client.query(`
        SELECT a.attname as column_name
        FROM pg_index i
        JOIN pg_attribute a ON a.attrelid = i.indrelid AND a.attnum = ANY(i.indkey)
        WHERE i.indrelid = $1::regclass
        AND i.indisprimary
      `, [`${schema}.${table}`]);

      const primaryKeys = pkResult.rows.map(row => row.column_name);

      return {
        schema,
        table,
        columns: columnsResult.rows.map(row => ({
          name: row.column_name,
          type: row.data_type,
          nullable: row.is_nullable === 'YES',
          default: row.column_default,
          maxLength: row.character_maximum_length,
          precision: row.numeric_precision,
          scale: row.numeric_scale,
          isPrimaryKey: primaryKeys.includes(row.column_name)
        })),
        primaryKeys
      };
    } catch (error) {
      this.logger.error('Failed to fetch table schema:', error);
      return null;
    } finally {
      if (client) client.release();
    }
  }

  private getActions(): ConnectorAction[] {
    return [
      {
        id: 'execute_query',
        name: 'Execute Query',
        description: 'Execute a SQL query',
        inputSchema: {
          query: { type: 'string', required: true, description: 'SQL query to execute' },
          params: { type: 'array', description: 'Query parameters' }
        },
        outputSchema: {
          rows: { type: 'array', description: 'Query results' },
          rowCount: { type: 'number', description: 'Number of rows returned' }
        }
      },
      {
        id: 'select_rows',
        name: 'Select Rows',
        description: 'Select rows from a table',
        inputSchema: {
          table: { type: 'string', required: true, description: 'Table name' },
          columns: { type: 'string', description: 'Columns to select' },
          where: { type: 'object', description: 'WHERE conditions' },
          limit: { type: 'number', description: 'Limit' },
          offset: { type: 'number', description: 'Offset' },
          orderBy: { type: 'string', description: 'Order by clause' }
        },
        outputSchema: {
          rows: { type: 'array', description: 'Selected rows' },
          rowCount: { type: 'number', description: 'Number of rows' }
        }
      },
      {
        id: 'insert_rows',
        name: 'Insert rows in a table',
        description: 'Insert one or more rows into a table',
        inputSchema: {
          schema: {
            type: 'string',
            required: false,
            label: 'Schema',
            placeholder: 'public',
            default: 'public',
            description: 'Database schema',
            order: 1,
            loadOptionsResource: 'schemas',
            loadOptionsDescription: 'Fetch schemas from database'
          },
          table: {
            type: 'string',
            required: true,
            label: 'Table Name',
            placeholder: 'users',
            description: 'Name of the table to insert into',
            order: 2,
            loadOptionsResource: 'tables',
            loadOptionsDependsOn: ['schema'],
            loadOptionsDescription: 'Fetch tables from selected schema'
          },
          columnMappings: {
            type: 'fixedCollection',
            required: true,
            label: 'Column Mappings',
            description: 'Map data to table columns',
            order: 3,
            placeholder: 'Add Column Mapping',
            items: {
              mappings: {
                properties: {
                  column: {
                    type: 'string',
                    required: true,
                    label: 'Column',
                    description: 'Column name to insert into',
                    loadOptionsResource: 'table-columns',
                    loadOptionsDependsOn: ['schema', 'table'],
                    loadOptionsDescription: 'Fetch columns from selected table'
                  },
                  value: {
                    type: 'string',
                    required: true,
                    label: 'Value',
                    placeholder: '{{ $json.email }}',
                    description: 'Value or expression to insert'
                  }
                }
              }
            }
          },
          returning: {
            type: 'string',
            required: false,
            label: 'Returning',
            placeholder: '*',
            description: 'Columns to return from inserted rows',
            order: 4
          }
        },
        outputSchema: {
          rows: { type: 'array', description: 'Inserted rows' },
          rowCount: { type: 'number', description: 'Number of rows inserted' }
        }
      },
      {
        id: 'upsert_rows',
        name: 'Insert or update rows in a table',
        description: 'Insert new rows or update existing rows on conflict',
        inputSchema: {
          schema: {
            type: 'string',
            required: false,
            label: 'Schema',
            placeholder: 'public',
            default: 'public',
            description: 'Database schema',
            order: 1,
            loadOptionsResource: 'schemas',
            loadOptionsDescription: 'Fetch schemas from database'
          },
          table: {
            type: 'string',
            required: true,
            label: 'Table Name',
            placeholder: 'users',
            description: 'Name of the table',
            order: 2,
            loadOptionsResource: 'tables',
            loadOptionsDependsOn: ['schema'],
            loadOptionsDescription: 'Fetch tables from selected schema'
          },
          columnMappings: {
            type: 'fixedCollection',
            required: true,
            label: 'Column Mappings',
            description: 'Map data to table columns',
            order: 3,
            placeholder: 'Add Column Mapping',
            items: {
              mappings: {
                properties: {
                  column: {
                    type: 'string',
                    required: true,
                    label: 'Column',
                    description: 'Column name',
                    loadOptionsResource: 'table-columns',
                    loadOptionsDependsOn: ['schema', 'table'],
                    loadOptionsDescription: 'Fetch columns from selected table'
                  },
                  value: {
                    type: 'string',
                    required: true,
                    label: 'Value',
                    placeholder: '{{ $json.email }}',
                    description: 'Value or expression'
                  }
                }
              }
            }
          },
          conflictColumns: {
            type: 'array',
            required: true,
            label: 'Conflict Columns',
            description: 'Columns to check for conflicts (unique constraint)',
            order: 4,
            placeholder: 'id, email'
          },
          updateColumns: {
            type: 'array',
            required: false,
            label: 'Update Columns',
            description: 'Columns to update on conflict (leave empty to update all)',
            order: 5,
            placeholder: 'name, updated_at'
          },
          returning: {
            type: 'string',
            required: false,
            label: 'Returning',
            placeholder: '*',
            description: 'Columns to return from affected rows',
            order: 6
          }
        },
        outputSchema: {
          rows: { type: 'array', description: 'Affected rows' },
          rowCount: { type: 'number', description: 'Number of rows affected' }
        }
      },
      {
        id: 'update_rows',
        name: 'Update rows in a table',
        description: 'Update existing rows matching conditions',
        inputSchema: {
          schema: {
            type: 'string',
            required: false,
            label: 'Schema',
            placeholder: 'public',
            default: 'public',
            description: 'Database schema',
            order: 1,
            loadOptionsResource: 'schemas',
            loadOptionsDescription: 'Fetch schemas from database'
          },
          table: {
            type: 'string',
            required: true,
            label: 'Table Name',
            placeholder: 'users',
            description: 'Name of the table to update',
            order: 2,
            loadOptionsResource: 'tables',
            loadOptionsDependsOn: ['schema'],
            loadOptionsDescription: 'Fetch tables from selected schema'
          },
          columnMappings: {
            type: 'fixedCollection',
            required: true,
            label: 'Column Mappings',
            description: 'Map data to table columns for update',
            order: 3,
            placeholder: 'Add Column Mapping',
            items: {
              mappings: {
                properties: {
                  column: {
                    type: 'string',
                    required: true,
                    label: 'Column',
                    description: 'Column name to update',
                    loadOptionsResource: 'table-columns',
                    loadOptionsDependsOn: ['schema', 'table'],
                    loadOptionsDescription: 'Fetch columns from selected table'
                  },
                  value: {
                    type: 'string',
                    required: true,
                    label: 'Value',
                    placeholder: '{{ $json.name }}',
                    description: 'New value or expression'
                  }
                }
              }
            }
          },
          where: {
            type: 'object',
            required: true,
            label: 'WHERE Conditions',
            description: 'Conditions to match rows for update',
            order: 4,
            placeholder: '{"id": "123"}'
          },
          returning: {
            type: 'string',
            required: false,
            label: 'Returning',
            placeholder: '*',
            description: 'Columns to return from updated rows',
            order: 5
          }
        },
        outputSchema: {
          rows: { type: 'array', description: 'Updated rows' },
          rowCount: { type: 'number', description: 'Number of rows updated' }
        }
      },
      {
        id: 'delete_rows',
        name: 'Delete Rows',
        description: 'Delete rows from a table or drop/truncate table',
        inputSchema: {
          operation: { type: 'string', description: 'Operation type' },
          table: { type: 'string', required: true, description: 'Table name' },
          where: { type: 'object', description: 'WHERE conditions' },
          returning: { type: 'string', description: 'Columns to return' },
          cascade: { type: 'boolean', description: 'Cascade delete' }
        },
        outputSchema: {
          rows: { type: 'array', description: 'Deleted rows' },
          rowCount: { type: 'number', description: 'Number of rows deleted' },
          success: { type: 'boolean', description: 'Success status' }
        }
      }
    ];
  }

  private getTriggers(): ConnectorTrigger[] {
    return [
      {
        id: 'new_row',
        name: 'On New Postgres Event',
        description: 'Triggered when new rows are inserted or updated',
        eventType: 'polling',
        outputSchema: {
          rows: { type: 'array', description: 'New rows' },
          count: { type: 'number', description: 'Number of new rows' },
          lastPolledAt: { type: 'string', description: 'Last poll timestamp' }
        },
        webhookRequired: false
      }
    ];
  }
}
