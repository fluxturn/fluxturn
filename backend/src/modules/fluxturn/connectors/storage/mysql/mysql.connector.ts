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
import * as mysql from 'mysql2/promise';

interface MySQLConfig {
  host: string;
  port?: number;
  user: string;
  password: string;
  database: string;
  ssl?: any;
  connectionLimit?: number;
  acquireTimeout?: number;
  timeout?: number;
  charset?: string;
}

interface QueryResult {
  results: any[];
  fields: mysql.FieldPacket[];
  affectedRows?: number;
  insertId?: number;
  changedRows?: number;
}

interface TableSchema {
  tableName: string;
  columns: ColumnDefinition[];
  indexes: IndexDefinition[];
  constraints: ConstraintDefinition[];
}

interface ColumnDefinition {
  name: string;
  type: string;
  nullable: boolean;
  defaultValue?: any;
  autoIncrement: boolean;
  primaryKey: boolean;
  maxLength?: number;
}

interface IndexDefinition {
  name: string;
  columns: string[];
  unique: boolean;
  type: 'PRIMARY' | 'UNIQUE' | 'INDEX' | 'FULLTEXT';
}

interface ConstraintDefinition {
  name: string;
  type: 'PRIMARY KEY' | 'FOREIGN KEY' | 'UNIQUE' | 'CHECK';
  columns: string[];
  referencedTable?: string;
  referencedColumns?: string[];
}

interface BulkInsertOptions {
  table: string;
  columns: string[];
  values: any[][];
  onDuplicateUpdate?: Record<string, any>;
  ignore?: boolean;
}

@Injectable()
export class MySQLConnector extends BaseConnector implements IDataConnector {
  private pool: mysql.Pool;
  private isConnected = false;
  private databaseName: string;

  constructor() {
    super();
  }

  getMetadata(): ConnectorMetadata {
    return {
      name: 'MySQL',
      description: 'MySQL relational database operations and management',
      version: '1.0.0',
      category: ConnectorCategory.DATABASE,
      type: ConnectorType.MYSQL,
      logoUrl: 'https://www.mysql.com/common/logos/mysql-logo.svg',
      documentationUrl: 'https://dev.mysql.com/doc/',
      authType: AuthType.CUSTOM,
      actions: this.getActions(),
      triggers: this.getTriggers(),
      rateLimit: {
        requestsPerSecond: 100,
        requestsPerMinute: 6000,
        requestsPerDay: 8640000
      },
      webhookSupport: false
    };
  }

  protected async initializeConnection(): Promise<void> {
    try {
      const config = this.config.credentials as MySQLConfig;

      // Validate required credentials
      if (!config) {
        throw new Error('MySQL credentials object is missing');
      }
      if (!config.host) {
        throw new Error('MySQL host is required');
      }
      if (!config.user) {
        throw new Error('MySQL user is required');
      }
      if (!config.password) {
        throw new Error('MySQL password is required');
      }
      if (!config.database) {
        throw new Error('MySQL database name is required');
      }

      // Store database name for later use
      this.databaseName = config.database;

      const poolConfig: mysql.PoolOptions = {
        host: config.host,
        port: config.port || 3306,
        user: config.user,
        password: config.password,
        database: config.database,
        waitForConnections: true,
        connectionLimit: config.connectionLimit || 10,
        queueLimit: 0,
        connectTimeout: config.timeout || config.acquireTimeout || 10000,
        charset: config.charset || 'utf8mb4',
        ssl: config.ssl,
        supportBigNumbers: true,
        bigNumberStrings: true,
        dateStrings: true,
        debug: false,
        multipleStatements: true
      };

      this.pool = mysql.createPool(poolConfig);

      // Test the connection
      const connection = await this.pool.getConnection();
      await connection.ping();
      connection.release();

      this.isConnected = true;
      this.logger.log('MySQL connector initialized successfully');
    } catch (error) {
      // Comprehensive error logging
      this.logger.error('=== MySQL Connection Error Debug ===');
      this.logger.error('Error object:', error);
      this.logger.error('Error type:', typeof error);
      this.logger.error('Error keys:', error ? Object.keys(error) : 'null');
      this.logger.error('Error message:', error?.message);
      this.logger.error('Error code:', error?.code);
      this.logger.error('Error errno:', error?.errno);
      this.logger.error('Error sqlMessage:', error?.sqlMessage);
      this.logger.error('Error sqlState:', error?.sqlState);
      this.logger.error('Error stack:', error?.stack);

      // Try to serialize the entire error
      try {
        this.logger.error('Full error JSON:', JSON.stringify(error, Object.getOwnPropertyNames(error), 2));
      } catch (e) {
        this.logger.error('Could not serialize error');
      }

      // Build error message with all available info
      let errorMessage = 'Unknown connection error';

      if (error) {
        if (error.message && typeof error.message === 'string' && error.message.trim()) {
          errorMessage = error.message;
        } else if (error.sqlMessage) {
          errorMessage = error.sqlMessage;
        } else if (error.code) {
          errorMessage = `Connection error with code: ${error.code}`;
        } else if (error.errno) {
          errorMessage = `Connection error with errno: ${error.errno}`;
        } else {
          errorMessage = String(error);
        }
      }

      this.logger.error(`Final error message: ${errorMessage}`);
      throw new Error(`MySQL connection failed: ${errorMessage}`);
    }
  }

  protected async performConnectionTest(): Promise<boolean> {
    try {
      if (!this.isConnected || !this.pool) {
        return false;
      }
      
      const connection = await this.pool.getConnection();
      await connection.ping();
      connection.release();
      return true;
    } catch (error) {
      return false;
    }
  }

  protected async performHealthCheck(): Promise<void> {
    try {
      if (!this.isConnected || !this.pool) {
        throw new Error('MySQL pool not initialized');
      }
      
      const connection = await this.pool.getConnection();
      const [rows] = await connection.execute('SELECT 1 as health_check');
      connection.release();
      
      if (!rows || (rows as any)[0]?.health_check !== 1) {
        throw new Error('MySQL health check query failed');
      }
    } catch (error) {
      throw new Error(`MySQL health check failed: ${error.message}`);
    }
  }

  protected async performRequest(request: ConnectorRequest): Promise<any> {
    // MySQL operations are handled directly through the driver
    throw new Error('Direct request execution not supported for MySQL. Use specific methods.');
  }

  protected async performAction(actionId: string, input: any): Promise<any> {
    switch (actionId) {
      case 'execute_query':
        return this.executeQuery(input.query, input.params);
      case 'select_rows':
        return this.selectRows(input);
      case 'insert_rows': {
        // DEBUG: Log the entire input to see what we're receiving
        this.logger.log('[INSERT DEBUG] Full input:', JSON.stringify(input, null, 2));
        this.logger.log('[INSERT DEBUG] input.dataMode:', input.dataMode);
        this.logger.log('[INSERT DEBUG] input.columnMappings:', JSON.stringify(input.columnMappings));
        this.logger.log('[INSERT DEBUG] input.data:', input.data);

        let data = input.data;

        // Transform columnMappings into data format when using autoMapInputData mode
        if (input.dataMode === 'autoMapInputData' && input.columnMappings?.mappings) {
          this.logger.log('[INSERT] CONDITION MATCHED! Transforming...');

          // Check if mappings is an array and has items
          if (Array.isArray(input.columnMappings.mappings) && input.columnMappings.mappings.length > 0) {
            data = {};
            input.columnMappings.mappings.forEach((mapping: any) => {
              if (mapping && mapping.column && mapping.value !== undefined) {
                data[mapping.column] = mapping.value;
              }
            });
            this.logger.log('[INSERT] Transformed columnMappings into data:', JSON.stringify(data));
          } else {
            this.logger.warn('[INSERT] columnMappings.mappings is empty or not an array');
          }
        } else if (input.dataMode === 'defineBelow' && input.columnMappings?.mappings) {
          // Also handle 'defineBelow' mode - same transformation
          this.logger.log('[INSERT] defineBelow mode detected, transforming...');

          if (Array.isArray(input.columnMappings.mappings) && input.columnMappings.mappings.length > 0) {
            data = {};
            input.columnMappings.mappings.forEach((mapping: any) => {
              if (mapping && mapping.column && mapping.value !== undefined) {
                data[mapping.column] = mapping.value;
              }
            });
            this.logger.log('[INSERT] Transformed columnMappings into data:', JSON.stringify(data));
          }
        } else {
          this.logger.log('[INSERT] CONDITION NOT MATCHED');
          this.logger.log('[INSERT] dataMode check:', input.dataMode === 'autoMapInputData');
          this.logger.log('[INSERT] columnMappings exists:', !!input.columnMappings);
          this.logger.log('[INSERT] columnMappings.mappings exists:', !!input.columnMappings?.mappings);
          this.logger.log('[INSERT] columnMappings.mappings is array:', Array.isArray(input.columnMappings?.mappings));
          this.logger.log('[INSERT] columnMappings.mappings length:', input.columnMappings?.mappings?.length);
        }

        // Validate that data is provided
        if (!data || (typeof data === 'object' && Object.keys(data).length === 0)) {
          this.logger.error('[INSERT] Validation failed - no data provided');
          this.logger.error('[INSERT] data value:', data);
          this.logger.error('[INSERT] data type:', typeof data);
          if (data && typeof data === 'object') {
            this.logger.error('[INSERT] data keys:', Object.keys(data));
          }
          throw new Error('Required field missing: data. Please provide data or configure columnMappings correctly.');
        }

        return this.insertRows(input.table, data, input.options);
      }
      case 'upsert_rows':
        return this.upsertRows(input.table, input.data, input.options);
      case 'update_rows':
        return this.updateRows(input.table, input.data, input.where, input.options);
      case 'delete_rows':
        return this.deleteRows(input.table, input.where);
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
      this.logger.log('MySQL connector cleanup completed');
    } catch (error) {
      this.logger.error('Error during MySQL cleanup:', error);
    }
  }

  // Core MySQL methods
  async executeQuery(query: string, params?: any[]): Promise<ConnectorResponse> {
    let connection: mysql.PoolConnection | undefined;
    
    try {
      connection = await this.pool.getConnection();
      const startTime = Date.now();
      
      const [results, fields] = await connection.execute(query, params);
      const executionTime = Date.now() - startTime;

      // Handle different types of query results
      let response: any = { results, fields };
      
      if (Array.isArray(results)) {
        response.rowCount = results.length;
      } else {
        // For INSERT, UPDATE, DELETE operations
        const resultSet = results as mysql.ResultSetHeader;
        response.affectedRows = resultSet.affectedRows;
        response.insertId = resultSet.insertId;
        response.changedRows = resultSet.changedRows;
        response.info = resultSet.info;
      }

      return {
        success: true,
        data: response,
        metadata: {
          timestamp: new Date()
        } as any
      };
    } catch (error) {
      return this.handleError(error as any, 'Failed to execute query');
    } finally {
      if (connection) connection.release();
    }
  }

  async insertRows(table: string, data: any | any[], options?: any): Promise<ConnectorResponse> {
    let connection: mysql.PoolConnection | undefined;

    try {
      // Debug logging
      this.logger.log('=== INSERT ROWS DEBUG ===');
      this.logger.log('Table:', table);
      this.logger.log('Data type:', typeof data);
      this.logger.log('Data value:', JSON.stringify(data));
      this.logger.log('Is Array:', Array.isArray(data));
      this.logger.log('Is String:', typeof data === 'string');

      // If data is a string, try to parse it as JSON
      let parsedData = data;
      if (typeof data === 'string') {
        this.logger.log('Data is a string, attempting to parse as JSON...');
        try {
          parsedData = JSON.parse(data);
          this.logger.log('Successfully parsed JSON. New type:', typeof parsedData);
          this.logger.log('Parsed value:', JSON.stringify(parsedData));
        } catch (e) {
          this.logger.error('Failed to parse data as JSON:', e.message);
          throw new Error('Data must be a valid JSON object or array');
        }
      }

      connection = await this.pool.getConnection();
      const records = Array.isArray(parsedData) ? parsedData : [parsedData];

      if (records.length === 0) {
        throw new Error('No data provided for insert');
      }

      const columns = Object.keys(records[0]);
      const placeholders = columns.map(() => '?').join(', ');
      const columnList = columns.map(col => `\`${col}\``).join(', ');

      let query = `INSERT INTO \`${table}\` (${columnList}) VALUES `;
      const values: any[] = [];

      // Build VALUES clause for multiple rows
      const valuesClauses = records.map(record => {
        columns.forEach(col => values.push(record[col]));
        return `(${placeholders})`;
      });

      query += valuesClauses.join(', ');

      // Add options
      if (options?.onDuplicateUpdate) {
        const updateClauses = Object.entries(options.onDuplicateUpdate)
          .map(([key, value]) => `\`${key}\` = ?`);
        query += ` ON DUPLICATE KEY UPDATE ${updateClauses.join(', ')}`;
        Object.values(options.onDuplicateUpdate).forEach(value => values.push(value));
      } else if (options?.ignore) {
        query = query.replace('INSERT INTO', 'INSERT IGNORE INTO');
      }

      const [result] = await connection.execute(query, values);
      const resultSet = result as mysql.ResultSetHeader;

      return {
        success: true,
        data: {
          affectedRows: resultSet.affectedRows,
          insertId: resultSet.insertId,
          insertedRows: records.length,
          info: resultSet.info
        },
        metadata: {
          timestamp: new Date()
        } as any
      };
    } catch (error) {
      return this.handleError(error as any, 'Failed to insert rows');
    } finally {
      if (connection) connection.release();
    }
  }

  async upsertRows(table: string, data: any | any[], options?: {
    conflictColumns?: string[];
    updateColumns?: string[];
  }): Promise<ConnectorResponse> {
    let connection: mysql.PoolConnection | undefined;

    try {
      // Debug logging
      this.logger.log('=== UPSERT ROWS DEBUG ===');
      this.logger.log('Table:', table);
      this.logger.log('Data type:', typeof data);
      this.logger.log('Data value:', JSON.stringify(data));
      this.logger.log('Is Array:', Array.isArray(data));
      this.logger.log('Is String:', typeof data === 'string');

      // If data is a string, try to parse it as JSON
      let parsedData = data;
      if (typeof data === 'string') {
        this.logger.log('Data is a string, attempting to parse as JSON...');
        try {
          parsedData = JSON.parse(data);
          this.logger.log('Successfully parsed JSON. New type:', typeof parsedData);
          this.logger.log('Parsed value:', JSON.stringify(parsedData));
        } catch (e) {
          this.logger.error('Failed to parse data as JSON:', e.message);
          throw new Error('Data must be a valid JSON object or array');
        }
      }

      connection = await this.pool.getConnection();
      const records = Array.isArray(parsedData) ? parsedData : [parsedData];

      if (records.length === 0) {
        throw new Error('No data provided for upsert');
      }

      const columns = Object.keys(records[0]);
      const placeholders = columns.map(() => '?').join(', ');
      const columnList = columns.map(col => `\`${col}\``).join(', ');

      let query = `INSERT INTO \`${table}\` (${columnList}) VALUES `;
      const values: any[] = [];

      // Build VALUES clause for multiple rows
      const valuesClauses = records.map(record => {
        columns.forEach(col => values.push(record[col]));
        return `(${placeholders})`;
      });

      query += valuesClauses.join(', ');

      // Build ON DUPLICATE KEY UPDATE clause
      let updateColumns = columns;
      if (options?.updateColumns && options.updateColumns.length > 0) {
        updateColumns = options.updateColumns;
      } else if (options?.conflictColumns && options.conflictColumns.length > 0) {
        // Exclude conflict columns from update
        updateColumns = columns.filter(col => !options.conflictColumns!.includes(col));
      }

      const updateClauses = updateColumns.map(col => `\`${col}\` = VALUES(\`${col}\`)`);
      query += ` ON DUPLICATE KEY UPDATE ${updateClauses.join(', ')}`;

      const [result] = await connection.execute(query, values);
      const resultSet = result as mysql.ResultSetHeader;

      return {
        success: true,
        data: {
          affectedRows: resultSet.affectedRows,
          insertId: resultSet.insertId,
          upsertedRows: records.length,
          info: resultSet.info
        },
        metadata: {
          timestamp: new Date()
        } as any
      };
    } catch (error) {
      return this.handleError(error as any, 'Failed to upsert rows');
    } finally {
      if (connection) connection.release();
    }
  }

  async updateRows(table: string, data: any, where: any, options?: any): Promise<ConnectorResponse> {
    let connection: mysql.PoolConnection | undefined;

    try {
      // Debug logging and JSON parsing
      this.logger.log('=== UPDATE ROWS DEBUG ===');
      this.logger.log('Table:', table);
      this.logger.log('Data type:', typeof data);
      this.logger.log('Where type:', typeof where);

      // Parse data if it's a string
      let parsedData = data;
      if (typeof data === 'string') {
        this.logger.log('Data is a string, attempting to parse as JSON...');
        try {
          parsedData = JSON.parse(data);
          this.logger.log('Successfully parsed data JSON');
        } catch (e) {
          this.logger.error('Failed to parse data as JSON:', e.message);
          throw new Error('Data must be a valid JSON object');
        }
      }

      // Parse where if it's a string
      let parsedWhere = where;
      if (typeof where === 'string') {
        this.logger.log('Where is a string, attempting to parse as JSON...');
        try {
          parsedWhere = JSON.parse(where);
          this.logger.log('Successfully parsed where JSON');
        } catch (e) {
          this.logger.error('Failed to parse where as JSON:', e.message);
          throw new Error('Where condition must be a valid JSON object');
        }
      }

      connection = await this.pool.getConnection();

      const setClauses = Object.keys(parsedData).map(key => `\`${key}\` = ?`);
      const setValues = Object.values(parsedData);

      let query = `UPDATE \`${table}\` SET ${setClauses.join(', ')}`;
      const values = [...setValues];

      if (parsedWhere && Object.keys(parsedWhere).length > 0) {
        const whereClauses = Object.keys(parsedWhere).map(key => `\`${key}\` = ?`);
        query += ` WHERE ${whereClauses.join(' AND ')}`;
        values.push(...Object.values(parsedWhere));
      }
      
      if (options?.limit) {
        query += ` LIMIT ${parseInt(options.limit)}`;
      }

      const [result] = await connection.execute(query, values);
      const resultSet = result as mysql.ResultSetHeader;

      return {
        success: true,
        data: {
          affectedRows: resultSet.affectedRows,
          changedRows: resultSet.changedRows,
          info: resultSet.info
        },
        metadata: {
          timestamp: new Date()
        } as any
      };
    } catch (error) {
      return this.handleError(error as any, 'Failed to update rows');
    } finally {
      if (connection) connection.release();
    }
  }

  async selectRows(input: {
    table: string;
    columns?: string | string[];
    where?: Record<string, any>;
    limit?: number;
    offset?: number;
    orderBy?: string;
    orderDirection?: 'ASC' | 'DESC';
  }): Promise<ConnectorResponse> {
    let connection: mysql.PoolConnection | undefined;

    try {
      connection = await this.pool.getConnection();

      // Build SELECT clause
      let columnsStr = '*';
      if (input.columns) {
        if (Array.isArray(input.columns)) {
          columnsStr = input.columns.map(col => `\`${col}\``).join(', ');
        } else if (input.columns.trim() !== '') {
          // Parse comma-separated string
          columnsStr = input.columns.split(',')
            .map(col => col.trim())
            .filter(col => col)
            .map(col => `\`${col}\``).join(', ');
        }
      }

      let query = `SELECT ${columnsStr} FROM \`${input.table}\``;
      const values: any[] = [];

      // Build WHERE clause
      if (input.where && Object.keys(input.where).length > 0) {
        const whereClauses = Object.keys(input.where).map(key => {
          const value = input.where![key];
          if (value === null) {
            return `\`${key}\` IS NULL`;
          }
          return `\`${key}\` = ?`;
        });
        query += ` WHERE ${whereClauses.join(' AND ')}`;
        Object.values(input.where).forEach(value => {
          if (value !== null) {
            values.push(value);
          }
        });
      }

      // Add ORDER BY
      if (input.orderBy) {
        const direction = input.orderDirection || 'ASC';
        query += ` ORDER BY \`${input.orderBy}\` ${direction}`;
      }

      // Add LIMIT and OFFSET
      if (input.limit) {
        query += ` LIMIT ${parseInt(input.limit.toString())}`;
      }

      if (input.offset) {
        query += ` OFFSET ${parseInt(input.offset.toString())}`;
      }

      const [rows] = await connection.execute(query, values);

      return {
        success: true,
        data: {
          rows: rows as any[],
          rowCount: (rows as any[]).length
        },
        metadata: {
          timestamp: new Date()
        } as any
      };
    } catch (error) {
      return this.handleError(error as any, 'Failed to select rows');
    } finally {
      if (connection) connection.release();
    }
  }

  async deleteRows(table: string, where: any, options?: any): Promise<ConnectorResponse> {
    let connection: mysql.PoolConnection | undefined;

    try {
      // Debug logging and JSON parsing for where condition
      this.logger.log('=== DELETE ROWS DEBUG ===');
      this.logger.log('Table:', table);
      this.logger.log('Where type:', typeof where);
      this.logger.log('Where value:', JSON.stringify(where));

      // If where is a string, try to parse it as JSON
      let parsedWhere = where;
      if (typeof where === 'string') {
        this.logger.log('Where is a string, attempting to parse as JSON...');
        try {
          parsedWhere = JSON.parse(where);
          this.logger.log('Successfully parsed JSON. New type:', typeof parsedWhere);
          this.logger.log('Parsed value:', JSON.stringify(parsedWhere));
        } catch (e) {
          this.logger.error('Failed to parse where as JSON:', e.message);
          throw new Error('Where condition must be a valid JSON object');
        }
      }

      connection = await this.pool.getConnection();

      let query = `DELETE FROM \`${table}\``;
      const values: any[] = [];

      if (parsedWhere && Object.keys(parsedWhere).length > 0) {
        const whereClauses = Object.keys(parsedWhere).map(key => `\`${key}\` = ?`);
        query += ` WHERE ${whereClauses.join(' AND ')}`;
        values.push(...Object.values(parsedWhere));
      }

      if (options?.limit) {
        query += ` LIMIT ${parseInt(options.limit)}`;
      }

      const [result] = await connection.execute(query, values);
      const resultSet = result as mysql.ResultSetHeader;

      return {
        success: true,
        data: {
          affectedRows: resultSet.affectedRows,
          info: resultSet.info
        },
        metadata: {
          timestamp: new Date()
        } as any
      };
    } catch (error) {
      return this.handleError(error as any, 'Failed to delete rows');
    } finally {
      if (connection) connection.release();
    }
  }

  async createTable(tableName: string, schema: TableSchema): Promise<ConnectorResponse> {
    let connection: mysql.PoolConnection | undefined;
    
    try {
      connection = await this.pool.getConnection();
      
      const columnDefinitions = schema.columns.map(col => {
        let def = `\`${col.name}\` ${col.type}`;
        
        if (col.maxLength) {
          def += `(${col.maxLength})`;
        }
        
        if (!col.nullable) {
          def += ' NOT NULL';
        }
        
        if (col.autoIncrement) {
          def += ' AUTO_INCREMENT';
        }
        
        if (col.defaultValue !== undefined) {
          def += ` DEFAULT ${mysql.escape(col.defaultValue)}`;
        }
        
        return def;
      });

      // Add primary key constraint
      const primaryKeys = schema.columns.filter(col => col.primaryKey).map(col => col.name);
      if (primaryKeys.length > 0) {
        columnDefinitions.push(`PRIMARY KEY (\`${primaryKeys.join('`, `')}\`)`);
      }

      // Add other constraints
      schema.constraints?.forEach(constraint => {
        if (constraint.type === 'UNIQUE') {
          columnDefinitions.push(`UNIQUE KEY \`${constraint.name}\` (\`${constraint.columns.join('`, `')}\`)`);
        } else if (constraint.type === 'FOREIGN KEY') {
          const fkDef = `FOREIGN KEY \`${constraint.name}\` (\`${constraint.columns.join('`, `')}\`) REFERENCES \`${constraint.referencedTable}\` (\`${constraint.referencedColumns?.join('`, `')}\`)`;
          columnDefinitions.push(fkDef);
        }
      });

      const query = `CREATE TABLE \`${tableName}\` (${columnDefinitions.join(', ')}) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`;
      
      await connection.execute(query);

      // Create additional indexes
      for (const index of schema.indexes || []) {
        if (index.type !== 'PRIMARY') {
          const indexType = index.unique ? 'UNIQUE' : '';
          const indexQuery = `CREATE ${indexType} INDEX \`${index.name}\` ON \`${tableName}\` (\`${index.columns.join('`, `')}\`)`;
          await connection.execute(indexQuery);
        }
      }

      return {
        success: true,
        data: {
          tableName,
          created: true,
          columnsCount: schema.columns.length,
          indexesCount: schema.indexes?.length || 0
        },
        metadata: {
          timestamp: new Date()
        } as any
      };
    } catch (error) {
      return this.handleError(error as any, 'Failed to create table');
    } finally {
      if (connection) connection.release();
    }
  }

  async beginTransaction(): Promise<mysql.PoolConnection> {
    const connection = await this.pool.getConnection();
    await connection.beginTransaction();
    return connection;
  }

  async commitTransaction(connection: mysql.PoolConnection): Promise<ConnectorResponse> {
    try {
      await connection.commit();
      connection.release();
      
      return {
        success: true,
        data: { committed: true },
        metadata: {
          timestamp: new Date()
        } as any
      };
    } catch (error) {
      await connection.rollback();
      connection.release();
      return this.handleError(error as any, 'Failed to commit transaction');
    }
  }

  async rollbackTransaction(connection: mysql.PoolConnection): Promise<ConnectorResponse> {
    try {
      await connection.rollback();
      connection.release();
      
      return {
        success: true,
        data: { rolledBack: true },
        metadata: {
          timestamp: new Date()
        } as any
      };
    } catch (error) {
      connection.release();
      return this.handleError(error as any, 'Failed to rollback transaction');
    }
  }

  async bulkInsert(table: string, columns: string[], values: any[][], options?: any): Promise<ConnectorResponse> {
    let connection: mysql.PoolConnection | undefined;
    
    try {
      connection = await this.pool.getConnection();
      
      if (values.length === 0) {
        throw new Error('No values provided for bulk insert');
      }

      const columnList = columns.map(col => `\`${col}\``).join(', ');
      const placeholders = columns.map(() => '?').join(', ');
      
      let query = `INSERT INTO \`${table}\` (${columnList}) VALUES `;
      const flatValues: any[] = [];
      
      // Build VALUES clause
      const valuesClauses = values.map(row => {
        if (row.length !== columns.length) {
          throw new Error('Number of values does not match number of columns');
        }
        flatValues.push(...row);
        return `(${placeholders})`;
      });
      
      query += valuesClauses.join(', ');
      
      if (options?.ignore) {
        query = query.replace('INSERT INTO', 'INSERT IGNORE INTO');
      }

      const [result] = await connection.execute(query, flatValues);
      const resultSet = result as mysql.ResultSetHeader;

      return {
        success: true,
        data: {
          affectedRows: resultSet.affectedRows,
          insertId: resultSet.insertId,
          insertedRows: values.length,
          info: resultSet.info
        },
        metadata: {
          timestamp: new Date()
        } as any
      };
    } catch (error) {
      return this.handleError(error as any, 'Failed to execute bulk insert');
    } finally {
      if (connection) connection.release();
    }
  }

  async getTableSchema(tableName: string): Promise<ConnectorResponse> {
    let connection: mysql.PoolConnection | undefined;

    try {
      connection = await this.pool.getConnection();

      // Get column information
      const [columns] = await connection.execute(
        'SELECT * FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = ? AND TABLE_SCHEMA = ?',
        [tableName, this.databaseName]
      ) as [any[], mysql.FieldPacket[]];

      // Get index information
      const [indexes] = await connection.execute(
        'SHOW INDEX FROM ??',
        [tableName]
      ) as [any[], mysql.FieldPacket[]];

      const columnDefs: ColumnDefinition[] = columns.map(col => ({
        name: col.COLUMN_NAME,
        type: col.DATA_TYPE,
        nullable: col.IS_NULLABLE === 'YES',
        defaultValue: col.COLUMN_DEFAULT,
        autoIncrement: col.EXTRA === 'auto_increment',
        primaryKey: col.COLUMN_KEY === 'PRI',
        maxLength: col.CHARACTER_MAXIMUM_LENGTH
      }));

      const indexDefs: IndexDefinition[] = [];
      const indexMap = new Map<string, IndexDefinition>();

      indexes.forEach(idx => {
        if (!indexMap.has(idx.Key_name)) {
          indexMap.set(idx.Key_name, {
            name: idx.Key_name,
            columns: [],
            unique: idx.Non_unique === 0,
            type: idx.Key_name === 'PRIMARY' ? 'PRIMARY' : (idx.Non_unique === 0 ? 'UNIQUE' : 'INDEX')
          });
        }
        indexMap.get(idx.Key_name)!.columns.push(idx.Column_name);
      });

      indexDefs.push(...indexMap.values());

      return {
        success: true,
        data: {
          tableName,
          columns: columnDefs,
          indexes: indexDefs,
          constraints: [] // Would need additional queries for full constraint info
        },
        metadata: {
          timestamp: new Date()
        } as any
      };
    } catch (error) {
      return this.handleError(error as any, 'Failed to get table schema');
    } finally {
      if (connection) connection.release();
    }
  }

  async getDatabases(): Promise<ConnectorResponse> {
    let connection: mysql.PoolConnection | undefined;

    try {
      connection = await this.pool.getConnection();

      const [databases] = await connection.execute(
        'SELECT SCHEMA_NAME FROM INFORMATION_SCHEMA.SCHEMATA WHERE SCHEMA_NAME NOT IN (?, ?, ?, ?)',
        ['information_schema', 'mysql', 'performance_schema', 'sys']
      ) as [any[], mysql.FieldPacket[]];

      const databaseNames = databases.map((db: any) => db.SCHEMA_NAME);

      return {
        success: true,
        data: {
          databases: databaseNames,
          count: databaseNames.length
        },
        metadata: {
          timestamp: new Date()
        } as any
      };
    } catch (error) {
      return this.handleError(error as any, 'Failed to get databases');
    } finally {
      if (connection) connection.release();
    }
  }

  async getTables(database?: string): Promise<Array<{ label: string; value: string }>> {
    let connection: mysql.PoolConnection | undefined;

    try {
      connection = await this.pool.getConnection();
      const dbName = database || this.databaseName;

      const [tables] = await connection.execute(
        'SELECT TABLE_NAME, TABLE_TYPE, ENGINE, TABLE_ROWS, CREATE_TIME, UPDATE_TIME FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_SCHEMA = ? AND TABLE_TYPE = ?',
        [dbName, 'BASE TABLE']
      ) as [any[], mysql.FieldPacket[]];

      return tables.map((table: any) => ({
        label: table.TABLE_NAME,
        value: table.TABLE_NAME
      }));
    } catch (error) {
      this.logger.error('Failed to fetch tables:', error);
      throw new Error(`Failed to fetch tables: ${error.message}`);
    } finally {
      if (connection) connection.release();
    }
  }

  async getColumns(table: string, database?: string): Promise<Array<{ label: string; value: string; type?: string }>> {
    let connection: mysql.PoolConnection | undefined;

    try {
      connection = await this.pool.getConnection();
      const dbName = database || this.databaseName;

      const [columns] = await connection.execute(
        `SELECT
          COLUMN_NAME,
          DATA_TYPE,
          COLUMN_TYPE,
          IS_NULLABLE,
          COLUMN_KEY,
          COLUMN_DEFAULT,
          EXTRA,
          CHARACTER_MAXIMUM_LENGTH,
          NUMERIC_PRECISION,
          NUMERIC_SCALE,
          COLUMN_COMMENT
        FROM INFORMATION_SCHEMA.COLUMNS
        WHERE TABLE_SCHEMA = ? AND TABLE_NAME = ?
        ORDER BY ORDINAL_POSITION`,
        [dbName, table]
      ) as [any[], mysql.FieldPacket[]];

      return columns.map((col: any) => ({
        label: col.COLUMN_NAME,
        value: col.COLUMN_NAME,
        type: col.DATA_TYPE,
        isPrimary: col.COLUMN_KEY === 'PRI',
        isNullable: col.IS_NULLABLE === 'YES',
        defaultValue: col.COLUMN_DEFAULT
      }));
    } catch (error) {
      this.logger.error('Failed to fetch columns:', error);
      throw new Error(`Failed to fetch columns: ${error.message}`);
    } finally {
      if (connection) connection.release();
    }
  }

  // IDataConnector implementation
  async create(data: any): Promise<ConnectorResponse> {
    const table = data.table || 'default_table';
    return this.insertRows(table, data.record || data, data.options);
  }

  async read(request?: PaginatedRequest): Promise<ConnectorResponse> {
    const table = request?.filters?.table || 'default_table';
    const page = request?.page || 1;
    const pageSize = request?.pageSize || 100;
    const offset = (page - 1) * pageSize;
    
    let query = `SELECT * FROM \`${table}\``;
    const params: any[] = [];
    
    if (request?.filters?.where) {
      const whereClauses = Object.keys(request.filters.where).map(key => `\`${key}\` = ?`);
      query += ` WHERE ${whereClauses.join(' AND ')}`;
      params.push(...Object.values(request.filters.where));
    }
    
    if (request?.sortBy) {
      query += ` ORDER BY \`${request.sortBy}\` ${request.sortOrder === 'desc' ? 'DESC' : 'ASC'}`;
    }
    
    query += ` LIMIT ? OFFSET ?`;
    params.push(pageSize, offset);
    
    return this.executeQuery(query, params);
  }

  async update(id: string, data: any): Promise<ConnectorResponse> {
    const table = data.table || 'default_table';
    const where = { id };
    return this.updateRows(table, data.record || data, where, data.options);
  }

  async delete(id: string): Promise<ConnectorResponse> {
    const table = 'default_table'; // Could be parameterized
    const where = { id };
    return this.deleteRows(table, where);
  }

  async search(query: string, options?: any): Promise<ConnectorResponse> {
    const table = options?.table || 'default_table';
    const searchColumn = options?.column || 'name';
    
    const sql = `SELECT * FROM \`${table}\` WHERE \`${searchColumn}\` LIKE ?`;
    const params = [`%${query}%`];
    
    return this.executeQuery(sql, params);
  }

  async bulk<T>(operation: BulkOperation<T>): Promise<BulkOperationResult<T>> {
    const successful: T[] = [];
    const failed: Array<{ item: T; error: ConnectorError }> = [];
    
    try {
      // Process items in batches
      const batchSize = operation.batchSize || 100;
      const batches = this.chunkArray(operation.items, batchSize);
      
      for (const batch of batches) {
        try {
          let result: ConnectorResponse;
          
          switch (operation.operation) {
            case 'create':
              if (batch.length > 0) {
                const columns = Object.keys(batch[0] as any);
                const values = batch.map(record => columns.map(col => (record as any)[col]));
                result = await this.bulkInsert('documents', columns, values);
              } else {
                result = { success: true, data: [] };
              }
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
      // If we can't continue on error, mark all items as failed
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

  private getActions(): ConnectorAction[] {
    return [
      {
        id: 'delete_rows',
        name: 'Delete table or rows',
        description: 'Delete rows from a table',
        inputSchema: {
          table: { type: 'string', required: true, description: 'Table name' },
          where: { type: 'object', required: true, description: 'WHERE conditions' }
        },
        outputSchema: {
          affectedRows: { type: 'number', description: 'Number of deleted rows' }
        }
      },
      {
        id: 'execute_query',
        name: 'Execute a SQL query',
        description: 'Execute a SQL query',
        inputSchema: {
          query: { type: 'string', required: true, description: 'SQL query to execute' },
          params: { type: 'array', description: 'Query parameters' }
        },
        outputSchema: {
          results: { type: 'array', description: 'Query results' },
          affectedRows: { type: 'number', description: 'Number of affected rows' }
        }
      },
      {
        id: 'insert_rows',
        name: 'Insert rows in a table',
        description: 'Insert one or more rows into a table',
        inputSchema: {
          table: { type: 'string', required: true, description: 'Table name' },
          data: { type: 'object', required: false, description: 'Data to insert (required if not using columnMappings)' },
          dataMode: { type: 'string', required: false, description: 'Data mode: autoMapInputData or defineBelow' },
          columnMappings: { type: 'object', required: false, description: 'Column mappings for data transformation' },
          options: { type: 'object', description: 'Insert options' }
        },
        outputSchema: {
          affectedRows: { type: 'number', description: 'Number of inserted rows' },
          insertId: { type: 'number', description: 'Auto-generated ID' }
        }
      },
      {
        id: 'upsert_rows',
        name: 'Insert or update rows in a table',
        description: 'Insert or update rows using ON DUPLICATE KEY UPDATE',
        inputSchema: {
          table: { type: 'string', required: true, description: 'Table name' },
          data: { type: 'object', required: true, description: 'Data to upsert' },
          options: {
            type: 'object',
            description: 'Upsert options with conflictColumns or updateColumns'
          }
        },
        outputSchema: {
          affectedRows: { type: 'number', description: 'Number of affected rows' },
          insertId: { type: 'number', description: 'Auto-generated ID if inserted' }
        }
      },
      {
        id: 'select_rows',
        name: 'Select rows from a table',
        description: 'Select rows from a table with filtering and pagination',
        inputSchema: {
          table: { type: 'string', required: true, description: 'Table name' },
          columns: { type: 'string', description: 'Comma-separated column names or * for all' },
          where: { type: 'object', description: 'WHERE conditions as key-value pairs' },
          limit: { type: 'number', description: 'Maximum number of rows to return' },
          offset: { type: 'number', description: 'Number of rows to skip' },
          orderBy: { type: 'string', description: 'Column name to order by' },
          orderDirection: { type: 'string', description: 'ASC or DESC' }
        },
        outputSchema: {
          rows: { type: 'array', description: 'Selected rows' },
          rowCount: { type: 'number', description: 'Number of rows returned' }
        }
      },
      {
        id: 'update_rows',
        name: 'Update rows in a table',
        description: 'Update rows in a table',
        inputSchema: {
          table: { type: 'string', required: true, description: 'Table name' },
          data: { type: 'object', required: true, description: 'Data to update' },
          where: { type: 'object', required: true, description: 'WHERE conditions' }
        },
        outputSchema: {
          affectedRows: { type: 'number', description: 'Number of updated rows' }
        }
      }
    ];
  }

  private getTriggers(): ConnectorTrigger[] {
    return [
      {
        id: 'row_inserted',
        name: 'Row Inserted',
        description: 'Triggered when a row is inserted',
        eventType: 'polling',
        outputSchema: {
          table: { type: 'string', description: 'Table name' },
          row: { type: 'object', description: 'Inserted row data' }
        },
        webhookRequired: false
      },
      {
        id: 'row_updated',
        name: 'Row Updated',
        description: 'Triggered when a row is updated',
        eventType: 'polling',
        outputSchema: {
          table: { type: 'string', description: 'Table name' },
          rowId: { type: 'string', description: 'Updated row ID' }
        },
        webhookRequired: false
      }
    ];
  }
}