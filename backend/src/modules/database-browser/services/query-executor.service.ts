import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { ConnectionService, AuthContext } from './connection.service';
import { PlatformService } from '../../database/platform.service';
import { v4 as uuidv4 } from 'uuid';
import {
  ExecuteQueryDto,
  SelectRowsDto,
  InsertRowsDto,
  UpdateRowsDto,
  DeleteRowsDto
} from '../dto/query.dto';
import {
  QueryResult,
  QueryHistoryItem,
  ColumnInfo
} from '../entities/database-connection.entity';
import { SchemaBrowserService } from './schema-browser.service';

@Injectable()
export class QueryExecutorService {
  private readonly logger = new Logger(QueryExecutorService.name);

  constructor(
    private readonly connectionService: ConnectionService,
    private readonly platformService: PlatformService,
    private readonly schemaBrowserService: SchemaBrowserService
  ) {}

  /**
   * Execute raw SQL query
   */
  async executeQuery(
    connectionId: string,
    dto: ExecuteQueryDto,
    context: AuthContext
  ): Promise<QueryResult> {
    const connection = await this.connectionService.getConnection(connectionId, context);
    const startTime = Date.now();
    let result: any;
    let error: Error | null = null;

    try {
      if (connection.database_type === 'postgresql') {
        result = await this.executePostgreSQLQuery(connectionId, dto, context);
      } else {
        result = await this.executeMySQLQuery(connectionId, dto, context);
      }

      // Log query to history
      await this.logQuery(connectionId, dto.query, 'success', Date.now() - startTime, context, result.row_count);

      return result;
    } catch (err) {
      error = err as Error;
      await this.logQuery(connectionId, dto.query, 'error', Date.now() - startTime, context, 0, err.message);
      throw new BadRequestException(`Query execution failed: ${err.message}`);
    }
  }

  /**
   * Select rows from a table
   */
  async selectRows(
    connectionId: string,
    dto: SelectRowsDto,
    context: AuthContext
  ): Promise<QueryResult & { pagination: { page: number; page_size: number; total: number; total_pages: number } }> {
    const connection = await this.connectionService.getConnection(connectionId, context);
    const startTime = Date.now();

    // Default schema based on database type
    const schema = dto.schema || (connection.database_type === 'postgresql' ? 'public' : connection.config.database);
    const table = dto.table;

    // Validate identifiers
    this.validateIdentifier(schema);
    this.validateIdentifier(table);

    const columns = dto.columns || '*';
    const limit = dto.limit || 50;
    const offset = dto.offset || 0;

    let query: string;
    let countQuery: string;
    let params: any[] = [];
    let countParams: any[] = [];

    if (connection.database_type === 'postgresql') {
      const { whereClause, whereParams } = this.buildWhereClause(dto.where, 'pg');

      query = `SELECT ${columns === '*' ? '*' : this.sanitizeColumnList(columns)} FROM "${schema}"."${table}"`;
      countQuery = `SELECT COUNT(*) FROM "${schema}"."${table}"`;

      if (whereClause) {
        query += ` WHERE ${whereClause}`;
        countQuery += ` WHERE ${whereClause}`;
        params = [...whereParams];
        countParams = [...whereParams];
      }

      if (dto.order_by) {
        query += ` ORDER BY ${this.sanitizeOrderBy(dto.order_by)}`;
      }

      query += ` LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;
      params.push(limit, offset);

      const pool = await this.connectionService.getPostgreSQLPool(connectionId, context);

      const [dataResult, countResult] = await Promise.all([
        pool.query(query, params),
        pool.query(countQuery, countParams)
      ]);

      const total = parseInt(countResult.rows[0].count);
      const tableColumns = await this.schemaBrowserService.getTableColumns(connectionId, schema, table, context);

      return {
        rows: dataResult.rows,
        columns: tableColumns,
        row_count: dataResult.rows.length,
        execution_time_ms: Date.now() - startTime,
        pagination: {
          page: Math.floor(offset / limit) + 1,
          page_size: limit,
          total,
          total_pages: Math.ceil(total / limit)
        }
      };
    } else {
      // MySQL
      const { whereClause, whereParams } = this.buildWhereClause(dto.where, 'mysql');

      query = `SELECT ${columns === '*' ? '*' : this.sanitizeColumnList(columns)} FROM \`${schema}\`.\`${table}\``;
      countQuery = `SELECT COUNT(*) as count FROM \`${schema}\`.\`${table}\``;

      if (whereClause) {
        query += ` WHERE ${whereClause}`;
        countQuery += ` WHERE ${whereClause}`;
        params = [...whereParams];
        countParams = [...whereParams];
      }

      if (dto.order_by) {
        query += ` ORDER BY ${this.sanitizeOrderBy(dto.order_by)}`;
      }

      query += ` LIMIT ? OFFSET ?`;
      params.push(limit, offset);

      const pool = await this.connectionService.getMySQLPool(connectionId, context);

      // Use query() instead of execute() for MySQL to avoid prepared statement issues
      const [dataResult, countResult] = await Promise.all([
        pool.query(query, params),
        pool.query(countQuery, countParams.length > 0 ? countParams : undefined)
      ]);

      const dataRows = dataResult[0] as any[];
      const countRows = countResult[0] as any[];
      const total = parseInt(countRows[0].count);
      const tableColumns = await this.schemaBrowserService.getTableColumns(connectionId, schema, table, context);

      return {
        rows: dataRows,
        columns: tableColumns,
        row_count: dataRows.length,
        execution_time_ms: Date.now() - startTime,
        pagination: {
          page: Math.floor(offset / limit) + 1,
          page_size: limit,
          total,
          total_pages: Math.ceil(total / limit)
        }
      };
    }
  }

  /**
   * Insert rows into a table
   */
  async insertRows(
    connectionId: string,
    dto: InsertRowsDto,
    context: AuthContext
  ): Promise<QueryResult> {
    const connection = await this.connectionService.getConnection(connectionId, context);
    const startTime = Date.now();

    // Default schema based on database type
    const schema = dto.schema || (connection.database_type === 'postgresql' ? 'public' : connection.config.database);
    const table = dto.table;

    this.validateIdentifier(schema);
    this.validateIdentifier(table);

    if (!dto.data || dto.data.length === 0) {
      throw new BadRequestException('No data provided for insert');
    }

    const columns = Object.keys(dto.data[0]);
    columns.forEach(col => this.validateIdentifier(col));

    if (connection.database_type === 'postgresql') {
      const pool = await this.connectionService.getPostgreSQLPool(connectionId, context);

      const values: any[] = [];
      const valuePlaceholders: string[] = [];
      let paramIndex = 1;

      for (const row of dto.data) {
        const rowPlaceholders: string[] = [];
        for (const col of columns) {
          rowPlaceholders.push(`$${paramIndex++}`);
          values.push(row[col]);
        }
        valuePlaceholders.push(`(${rowPlaceholders.join(', ')})`);
      }

      let query = `
        INSERT INTO "${schema}"."${table}" (${columns.map(c => `"${c}"`).join(', ')})
        VALUES ${valuePlaceholders.join(', ')}
      `;

      if (dto.returning) {
        query += ` RETURNING ${dto.returning === '*' ? '*' : this.sanitizeColumnList(dto.returning)}`;
      }

      const result = await pool.query(query, values);

      await this.logQuery(connectionId, query, 'success', Date.now() - startTime, context, result.rowCount || dto.data.length);

      return {
        rows: result.rows,
        columns: [],
        row_count: result.rows.length,
        affected_rows: result.rowCount || dto.data.length,
        execution_time_ms: Date.now() - startTime,
        command: 'INSERT'
      };
    } else {
      // MySQL
      const pool = await this.connectionService.getMySQLPool(connectionId, context);

      const values: any[] = [];
      const valuePlaceholders: string[] = [];

      for (const row of dto.data) {
        const rowPlaceholders: string[] = [];
        for (const col of columns) {
          rowPlaceholders.push('?');
          values.push(row[col]);
        }
        valuePlaceholders.push(`(${rowPlaceholders.join(', ')})`);
      }

      const query = `
        INSERT INTO \`${schema}\`.\`${table}\` (${columns.map(c => `\`${c}\``).join(', ')})
        VALUES ${valuePlaceholders.join(', ')}
      `;

      const [result] = await pool.query(query, values);

      await this.logQuery(connectionId, query, 'success', Date.now() - startTime, context, (result as any).affectedRows);

      return {
        rows: [],
        columns: [],
        row_count: 0,
        affected_rows: (result as any).affectedRows,
        execution_time_ms: Date.now() - startTime,
        command: 'INSERT'
      };
    }
  }

  /**
   * Update rows in a table
   */
  async updateRows(
    connectionId: string,
    dto: UpdateRowsDto,
    context: AuthContext
  ): Promise<QueryResult> {
    const connection = await this.connectionService.getConnection(connectionId, context);
    const startTime = Date.now();

    // Default schema based on database type
    const schema = dto.schema || (connection.database_type === 'postgresql' ? 'public' : connection.config.database);
    const table = dto.table;

    this.validateIdentifier(schema);
    this.validateIdentifier(table);

    if (!dto.where || Object.keys(dto.where).length === 0) {
      throw new BadRequestException('WHERE clause is required for UPDATE operations');
    }

    if (!dto.data || Object.keys(dto.data).length === 0) {
      throw new BadRequestException('No data provided for update');
    }

    const updateColumns = Object.keys(dto.data);
    updateColumns.forEach(col => this.validateIdentifier(col));

    if (connection.database_type === 'postgresql') {
      const pool = await this.connectionService.getPostgreSQLPool(connectionId, context);

      const setClauses: string[] = [];
      const params: any[] = [];
      let paramIndex = 1;

      for (const [col, value] of Object.entries(dto.data)) {
        setClauses.push(`"${col}" = $${paramIndex++}`);
        params.push(value);
      }

      const { whereClause, whereParams } = this.buildWhereClause(dto.where, 'pg', paramIndex);
      params.push(...whereParams);

      let query = `
        UPDATE "${schema}"."${table}"
        SET ${setClauses.join(', ')}
        WHERE ${whereClause}
      `;

      if (dto.returning) {
        query += ` RETURNING ${dto.returning === '*' ? '*' : this.sanitizeColumnList(dto.returning)}`;
      }

      const result = await pool.query(query, params);

      await this.logQuery(connectionId, query, 'success', Date.now() - startTime, context, result.rowCount || 0);

      return {
        rows: result.rows,
        columns: [],
        row_count: result.rows.length,
        affected_rows: result.rowCount || 0,
        execution_time_ms: Date.now() - startTime,
        command: 'UPDATE'
      };
    } else {
      // MySQL
      const pool = await this.connectionService.getMySQLPool(connectionId, context);

      const setClauses: string[] = [];
      const params: any[] = [];

      for (const [col, value] of Object.entries(dto.data)) {
        setClauses.push(`\`${col}\` = ?`);
        params.push(value);
      }

      const { whereClause, whereParams } = this.buildWhereClause(dto.where, 'mysql');
      params.push(...whereParams);

      const query = `
        UPDATE \`${schema}\`.\`${table}\`
        SET ${setClauses.join(', ')}
        WHERE ${whereClause}
      `;

      const [result] = await pool.query(query, params);

      await this.logQuery(connectionId, query, 'success', Date.now() - startTime, context, (result as any).affectedRows);

      return {
        rows: [],
        columns: [],
        row_count: 0,
        affected_rows: (result as any).affectedRows,
        execution_time_ms: Date.now() - startTime,
        command: 'UPDATE'
      };
    }
  }

  /**
   * Delete rows from a table
   */
  async deleteRows(
    connectionId: string,
    dto: DeleteRowsDto,
    context: AuthContext
  ): Promise<QueryResult> {
    const connection = await this.connectionService.getConnection(connectionId, context);
    const startTime = Date.now();

    // Default schema based on database type
    const schema = dto.schema || (connection.database_type === 'postgresql' ? 'public' : connection.config.database);
    const table = dto.table;

    this.validateIdentifier(schema);
    this.validateIdentifier(table);

    if (!dto.where || Object.keys(dto.where).length === 0) {
      throw new BadRequestException('WHERE clause is required for DELETE operations');
    }

    if (connection.database_type === 'postgresql') {
      const pool = await this.connectionService.getPostgreSQLPool(connectionId, context);

      const { whereClause, whereParams } = this.buildWhereClause(dto.where, 'pg');

      let query = `DELETE FROM "${schema}"."${table}" WHERE ${whereClause}`;

      if (dto.returning) {
        query += ` RETURNING ${dto.returning === '*' ? '*' : this.sanitizeColumnList(dto.returning)}`;
      }

      const result = await pool.query(query, whereParams);

      await this.logQuery(connectionId, query, 'success', Date.now() - startTime, context, result.rowCount || 0);

      return {
        rows: result.rows,
        columns: [],
        row_count: result.rows.length,
        affected_rows: result.rowCount || 0,
        execution_time_ms: Date.now() - startTime,
        command: 'DELETE'
      };
    } else {
      // MySQL
      const pool = await this.connectionService.getMySQLPool(connectionId, context);

      const { whereClause, whereParams } = this.buildWhereClause(dto.where, 'mysql');

      const query = `DELETE FROM \`${schema}\`.\`${table}\` WHERE ${whereClause}`;

      const [result] = await pool.query(query, whereParams);

      await this.logQuery(connectionId, query, 'success', Date.now() - startTime, context, (result as any).affectedRows);

      return {
        rows: [],
        columns: [],
        row_count: 0,
        affected_rows: (result as any).affectedRows,
        execution_time_ms: Date.now() - startTime,
        command: 'DELETE'
      };
    }
  }

  /**
   * Get query history for a connection
   */
  async getQueryHistory(
    connectionId: string,
    context: AuthContext,
    limit: number = 50,
    offset: number = 0
  ): Promise<QueryHistoryItem[]> {
    // Verify access to connection
    await this.connectionService.getConnection(connectionId, context);

    const query = `
      SELECT id, connection_id, user_id, query_text, query_type,
             execution_time_ms, rows_affected, status, error_message, created_at
      FROM database_query_history
      WHERE connection_id = $1
      ORDER BY created_at DESC
      LIMIT $2 OFFSET $3
    `;

    const result = await this.platformService.query(query, [connectionId, limit, offset]);
    return result.rows;
  }

  // ============== Private Methods ==============

  private async executePostgreSQLQuery(
    connectionId: string,
    dto: ExecuteQueryDto,
    context: AuthContext
  ): Promise<QueryResult> {
    const pool = await this.connectionService.getPostgreSQLPool(connectionId, context);
    const startTime = Date.now();

    const result = await pool.query(dto.query, dto.params);

    // Build column info from result fields
    const columns: ColumnInfo[] = result.fields?.map(field => ({
      name: field.name,
      type: field.dataTypeID?.toString() || 'unknown',
      data_type: field.dataTypeID?.toString() || 'unknown',
      nullable: true,
      is_primary_key: false,
      is_foreign_key: false,
      is_unique: false
    })) || [];

    return {
      rows: result.rows,
      columns,
      row_count: result.rows.length,
      affected_rows: result.rowCount || undefined,
      execution_time_ms: Date.now() - startTime,
      command: result.command
    };
  }

  private async executeMySQLQuery(
    connectionId: string,
    dto: ExecuteQueryDto,
    context: AuthContext
  ): Promise<QueryResult> {
    const pool = await this.connectionService.getMySQLPool(connectionId, context);
    const startTime = Date.now();

    // Use query() instead of execute() for flexibility with parameters
    const [rows, fields] = await pool.query(dto.query, dto.params || undefined);

    const columns: ColumnInfo[] = (fields as any[])?.map(field => ({
      name: field.name,
      type: field.type?.toString() || 'unknown',
      data_type: field.type?.toString() || 'unknown',
      nullable: true,
      is_primary_key: false,
      is_foreign_key: false,
      is_unique: false
    })) || [];

    const rowsArray = Array.isArray(rows) ? rows : [];

    return {
      rows: rowsArray,
      columns,
      row_count: rowsArray.length,
      affected_rows: (rows as any).affectedRows,
      execution_time_ms: Date.now() - startTime,
      command: (rows as any).command
    };
  }

  private validateIdentifier(identifier: string): void {
    if (!identifier || typeof identifier !== 'string') {
      throw new BadRequestException('Invalid identifier');
    }
    // Allow alphanumeric, underscore, and basic punctuation
    if (!/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(identifier)) {
      throw new BadRequestException(`Invalid identifier: ${identifier}`);
    }
  }

  private sanitizeColumnList(columns: string): string {
    if (columns === '*') return '*';

    return columns
      .split(',')
      .map(col => col.trim())
      .filter(col => col.length > 0)
      .map(col => {
        this.validateIdentifier(col);
        return `"${col}"`;
      })
      .join(', ');
  }

  private sanitizeOrderBy(orderBy: string): string {
    // Parse and validate ORDER BY clause
    const parts = orderBy.split(',').map(part => {
      const trimmed = part.trim();
      const match = trimmed.match(/^([a-zA-Z_][a-zA-Z0-9_]*)\s*(ASC|DESC)?$/i);
      if (!match) {
        throw new BadRequestException(`Invalid ORDER BY: ${trimmed}`);
      }
      return `"${match[1]}" ${match[2] || 'ASC'}`;
    });
    return parts.join(', ');
  }

  private buildWhereClause(
    where: Record<string, any> | undefined,
    dialect: 'pg' | 'mysql',
    startIndex: number = 1
  ): { whereClause: string; whereParams: any[] } {
    if (!where || Object.keys(where).length === 0) {
      return { whereClause: '', whereParams: [] };
    }

    const clauses: string[] = [];
    const params: any[] = [];
    let paramIndex = startIndex;

    for (const [key, value] of Object.entries(where)) {
      this.validateIdentifier(key);

      if (value === null) {
        clauses.push(dialect === 'pg' ? `"${key}" IS NULL` : `\`${key}\` IS NULL`);
      } else if (dialect === 'pg') {
        clauses.push(`"${key}" = $${paramIndex++}`);
        params.push(value);
      } else {
        clauses.push(`\`${key}\` = ?`);
        params.push(value);
      }
    }

    return {
      whereClause: clauses.join(' AND '),
      whereParams: params
    };
  }

  private classifyQuery(query: string): string {
    const trimmed = query.trim().toUpperCase();
    if (trimmed.startsWith('SELECT')) return 'SELECT';
    if (trimmed.startsWith('INSERT')) return 'INSERT';
    if (trimmed.startsWith('UPDATE')) return 'UPDATE';
    if (trimmed.startsWith('DELETE')) return 'DELETE';
    if (
      trimmed.startsWith('CREATE') ||
      trimmed.startsWith('ALTER') ||
      trimmed.startsWith('DROP') ||
      trimmed.startsWith('TRUNCATE')
    ) {
      return 'DDL';
    }
    return 'OTHER';
  }

  private async logQuery(
    connectionId: string,
    query: string,
    status: 'success' | 'error',
    executionTime: number,
    context: AuthContext,
    rowsAffected?: number,
    errorMessage?: string
  ): Promise<void> {
    try {
      const queryType = this.classifyQuery(query);

      const insertQuery = `
        INSERT INTO database_query_history (
          id, connection_id, user_id, project_id, query_text, query_type,
          execution_time_ms, rows_affected, status, error_message, created_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, NOW())
      `;

      await this.platformService.query(insertQuery, [
        uuidv4(),
        connectionId,
        context.userId,
        context.projectId,
        query.substring(0, 10000), // Limit query text length
        queryType,
        executionTime,
        rowsAffected || null,
        status,
        errorMessage || null
      ]);
    } catch (error) {
      // Don't fail the main operation if logging fails
      this.logger.error('Failed to log query:', error);
    }
  }
}
