import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { ConnectionService, AuthContext } from './connection.service';
import {
  SchemaInfo,
  TableInfo,
  ColumnInfo,
  IndexInfo,
  ForeignKeyInfo,
  TableStructure
} from '../entities/database-connection.entity';

@Injectable()
export class SchemaBrowserService {
  private readonly logger = new Logger(SchemaBrowserService.name);

  constructor(private readonly connectionService: ConnectionService) {}

  /**
   * Get list of schemas (PostgreSQL) or databases (MySQL)
   */
  async getSchemas(connectionId: string, context: AuthContext): Promise<SchemaInfo[]> {
    const connection = await this.connectionService.getConnection(connectionId, context);

    if (connection.database_type === 'postgresql') {
      return this.getPostgreSQLSchemas(connectionId, context);
    } else {
      return this.getMySQLDatabases(connectionId, context);
    }
  }

  /**
   * Get list of tables in a schema
   */
  async getTables(
    connectionId: string,
    schema: string,
    context: AuthContext
  ): Promise<TableInfo[]> {
    const connection = await this.connectionService.getConnection(connectionId, context);

    if (connection.database_type === 'postgresql') {
      return this.getPostgreSQLTables(connectionId, schema, context);
    } else {
      return this.getMySQLTables(connectionId, schema, context);
    }
  }

  /**
   * Get columns for a table
   */
  async getTableColumns(
    connectionId: string,
    schema: string,
    table: string,
    context: AuthContext
  ): Promise<ColumnInfo[]> {
    const connection = await this.connectionService.getConnection(connectionId, context);

    if (connection.database_type === 'postgresql') {
      return this.getPostgreSQLColumns(connectionId, schema, table, context);
    } else {
      return this.getMySQLColumns(connectionId, schema, table, context);
    }
  }

  /**
   * Get indexes for a table
   */
  async getTableIndexes(
    connectionId: string,
    schema: string,
    table: string,
    context: AuthContext
  ): Promise<IndexInfo[]> {
    const connection = await this.connectionService.getConnection(connectionId, context);

    if (connection.database_type === 'postgresql') {
      return this.getPostgreSQLIndexes(connectionId, schema, table, context);
    } else {
      return this.getMySQLIndexes(connectionId, schema, table, context);
    }
  }

  /**
   * Get foreign keys for a table
   */
  async getTableForeignKeys(
    connectionId: string,
    schema: string,
    table: string,
    context: AuthContext
  ): Promise<ForeignKeyInfo[]> {
    const connection = await this.connectionService.getConnection(connectionId, context);

    if (connection.database_type === 'postgresql') {
      return this.getPostgreSQLForeignKeys(connectionId, schema, table, context);
    } else {
      return this.getMySQLForeignKeys(connectionId, schema, table, context);
    }
  }

  /**
   * Get full table structure
   */
  async getTableStructure(
    connectionId: string,
    schema: string,
    table: string,
    context: AuthContext
  ): Promise<TableStructure> {
    const [columns, indexes, foreignKeys] = await Promise.all([
      this.getTableColumns(connectionId, schema, table, context),
      this.getTableIndexes(connectionId, schema, table, context),
      this.getTableForeignKeys(connectionId, schema, table, context)
    ]);

    const primaryKey = columns
      .filter(col => col.is_primary_key)
      .map(col => col.name);

    return {
      table_name: table,
      schema,
      columns,
      primary_key: primaryKey,
      indexes,
      foreign_keys: foreignKeys
    };
  }

  // ============== PostgreSQL Methods ==============

  private async getPostgreSQLSchemas(
    connectionId: string,
    context: AuthContext
  ): Promise<SchemaInfo[]> {
    const pool = await this.connectionService.getPostgreSQLPool(connectionId, context);

    const result = await pool.query(`
      SELECT schema_name as name, schema_owner as owner
      FROM information_schema.schemata
      WHERE schema_name NOT IN ('pg_catalog', 'information_schema', 'pg_toast')
      ORDER BY schema_name
    `);

    return result.rows;
  }

  private async getPostgreSQLTables(
    connectionId: string,
    schema: string,
    context: AuthContext
  ): Promise<TableInfo[]> {
    const pool = await this.connectionService.getPostgreSQLPool(connectionId, context);

    const result = await pool.query(
      `
      SELECT
        t.table_name as name,
        t.table_schema as schema,
        CASE t.table_type
          WHEN 'BASE TABLE' THEN 'table'
          WHEN 'VIEW' THEN 'view'
          ELSE 'table'
        END as type,
        COALESCE(s.n_live_tup, 0)::bigint as row_count,
        pg_total_relation_size(quote_ident(t.table_schema) || '.' || quote_ident(t.table_name))::bigint as size_bytes,
        obj_description((quote_ident(t.table_schema) || '.' || quote_ident(t.table_name))::regclass) as comment
      FROM information_schema.tables t
      LEFT JOIN pg_stat_user_tables s
        ON s.schemaname = t.table_schema AND s.relname = t.table_name
      WHERE t.table_schema = $1
        AND t.table_type IN ('BASE TABLE', 'VIEW')
      ORDER BY t.table_name
    `,
      [schema]
    );

    return result.rows.map(row => ({
      name: row.name,
      schema: row.schema,
      type: row.type as 'table' | 'view',
      row_count: parseInt(row.row_count) || 0,
      size_bytes: parseInt(row.size_bytes) || 0,
      comment: row.comment
    }));
  }

  private async getPostgreSQLColumns(
    connectionId: string,
    schema: string,
    table: string,
    context: AuthContext
  ): Promise<ColumnInfo[]> {
    const pool = await this.connectionService.getPostgreSQLPool(connectionId, context);

    const result = await pool.query(
      `
      SELECT
        c.column_name as name,
        c.udt_name as type,
        c.data_type,
        c.is_nullable = 'YES' as nullable,
        c.column_default as default_value,
        c.character_maximum_length as max_length,
        c.numeric_precision,
        c.numeric_scale,
        COALESCE(pk.is_primary, false) as is_primary_key,
        COALESCE(fk.is_foreign, false) as is_foreign_key,
        COALESCE(uq.is_unique, false) as is_unique,
        fk.referenced_table,
        fk.referenced_column,
        fk.referenced_schema,
        col_description(
          (quote_ident(c.table_schema) || '.' || quote_ident(c.table_name))::regclass,
          c.ordinal_position
        ) as comment
      FROM information_schema.columns c
      LEFT JOIN (
        SELECT kcu.column_name, true as is_primary
        FROM information_schema.table_constraints tc
        JOIN information_schema.key_column_usage kcu
          ON tc.constraint_name = kcu.constraint_name
          AND tc.table_schema = kcu.table_schema
        WHERE tc.constraint_type = 'PRIMARY KEY'
          AND tc.table_schema = $1
          AND tc.table_name = $2
      ) pk ON pk.column_name = c.column_name
      LEFT JOIN (
        SELECT
          kcu.column_name,
          true as is_foreign,
          ccu.table_name as referenced_table,
          ccu.column_name as referenced_column,
          ccu.table_schema as referenced_schema
        FROM information_schema.table_constraints tc
        JOIN information_schema.key_column_usage kcu
          ON tc.constraint_name = kcu.constraint_name
          AND tc.table_schema = kcu.table_schema
        JOIN information_schema.constraint_column_usage ccu
          ON tc.constraint_name = ccu.constraint_name
          AND tc.table_schema = ccu.table_schema
        WHERE tc.constraint_type = 'FOREIGN KEY'
          AND tc.table_schema = $1
          AND tc.table_name = $2
      ) fk ON fk.column_name = c.column_name
      LEFT JOIN (
        SELECT kcu.column_name, true as is_unique
        FROM information_schema.table_constraints tc
        JOIN information_schema.key_column_usage kcu
          ON tc.constraint_name = kcu.constraint_name
          AND tc.table_schema = kcu.table_schema
        WHERE tc.constraint_type = 'UNIQUE'
          AND tc.table_schema = $1
          AND tc.table_name = $2
      ) uq ON uq.column_name = c.column_name
      WHERE c.table_schema = $1 AND c.table_name = $2
      ORDER BY c.ordinal_position
    `,
      [schema, table]
    );

    return result.rows.map(row => ({
      name: row.name,
      type: row.type,
      data_type: row.data_type,
      nullable: row.nullable,
      default_value: row.default_value,
      is_primary_key: row.is_primary_key,
      is_foreign_key: row.is_foreign_key,
      is_unique: row.is_unique,
      max_length: row.max_length ? parseInt(row.max_length) : undefined,
      numeric_precision: row.numeric_precision ? parseInt(row.numeric_precision) : undefined,
      numeric_scale: row.numeric_scale ? parseInt(row.numeric_scale) : undefined,
      references: row.is_foreign_key
        ? {
            table: row.referenced_table,
            column: row.referenced_column,
            schema: row.referenced_schema
          }
        : undefined,
      comment: row.comment
    }));
  }

  private async getPostgreSQLIndexes(
    connectionId: string,
    schema: string,
    table: string,
    context: AuthContext
  ): Promise<IndexInfo[]> {
    const pool = await this.connectionService.getPostgreSQLPool(connectionId, context);

    const result = await pool.query(
      `
      SELECT
        i.relname as name,
        array_agg(a.attname ORDER BY array_position(ix.indkey, a.attnum)) as columns,
        ix.indisunique as unique,
        am.amname as type,
        pg_get_indexdef(ix.indexrelid) as definition
      FROM pg_class t
      JOIN pg_index ix ON t.oid = ix.indrelid
      JOIN pg_class i ON i.oid = ix.indexrelid
      JOIN pg_namespace n ON t.relnamespace = n.oid
      JOIN pg_am am ON i.relam = am.oid
      JOIN pg_attribute a ON a.attrelid = t.oid AND a.attnum = ANY(ix.indkey)
      WHERE n.nspname = $1
        AND t.relname = $2
        AND NOT ix.indisprimary
      GROUP BY i.relname, ix.indisunique, am.amname, ix.indexrelid
      ORDER BY i.relname
    `,
      [schema, table]
    );

    return result.rows.map(row => ({
      name: row.name,
      columns: row.columns,
      unique: row.unique,
      type: row.type,
      definition: row.definition
    }));
  }

  private async getPostgreSQLForeignKeys(
    connectionId: string,
    schema: string,
    table: string,
    context: AuthContext
  ): Promise<ForeignKeyInfo[]> {
    const pool = await this.connectionService.getPostgreSQLPool(connectionId, context);

    const result = await pool.query(
      `
      SELECT
        tc.constraint_name as name,
        array_agg(kcu.column_name ORDER BY kcu.ordinal_position) as columns,
        ccu.table_name as referenced_table,
        ccu.table_schema as referenced_schema,
        array_agg(ccu.column_name ORDER BY kcu.ordinal_position) as referenced_columns,
        rc.update_rule as on_update,
        rc.delete_rule as on_delete
      FROM information_schema.table_constraints tc
      JOIN information_schema.key_column_usage kcu
        ON tc.constraint_name = kcu.constraint_name
        AND tc.table_schema = kcu.table_schema
      JOIN information_schema.constraint_column_usage ccu
        ON tc.constraint_name = ccu.constraint_name
        AND tc.table_schema = ccu.table_schema
      JOIN information_schema.referential_constraints rc
        ON tc.constraint_name = rc.constraint_name
        AND tc.table_schema = rc.constraint_schema
      WHERE tc.constraint_type = 'FOREIGN KEY'
        AND tc.table_schema = $1
        AND tc.table_name = $2
      GROUP BY tc.constraint_name, ccu.table_name, ccu.table_schema, rc.update_rule, rc.delete_rule
      ORDER BY tc.constraint_name
    `,
      [schema, table]
    );

    return result.rows.map(row => ({
      name: row.name,
      columns: row.columns,
      referenced_table: row.referenced_table,
      referenced_schema: row.referenced_schema,
      referenced_columns: row.referenced_columns,
      on_update: row.on_update,
      on_delete: row.on_delete
    }));
  }

  // ============== MySQL Methods ==============

  private async getMySQLDatabases(
    connectionId: string,
    context: AuthContext
  ): Promise<SchemaInfo[]> {
    const pool = await this.connectionService.getMySQLPool(connectionId, context);

    const [rows] = await pool.execute(`
      SELECT SCHEMA_NAME as name
      FROM INFORMATION_SCHEMA.SCHEMATA
      WHERE SCHEMA_NAME NOT IN ('information_schema', 'mysql', 'performance_schema', 'sys')
      ORDER BY SCHEMA_NAME
    `);

    return (rows as any[]).map(row => ({ name: row.name }));
  }

  private async getMySQLTables(
    connectionId: string,
    schema: string,
    context: AuthContext
  ): Promise<TableInfo[]> {
    const pool = await this.connectionService.getMySQLPool(connectionId, context);

    const [rows] = await pool.execute(
      `
      SELECT
        TABLE_NAME as name,
        TABLE_SCHEMA as \`schema\`,
        CASE TABLE_TYPE
          WHEN 'BASE TABLE' THEN 'table'
          WHEN 'VIEW' THEN 'view'
          ELSE 'table'
        END as type,
        TABLE_ROWS as row_count,
        DATA_LENGTH + INDEX_LENGTH as size_bytes,
        TABLE_COMMENT as comment
      FROM INFORMATION_SCHEMA.TABLES
      WHERE TABLE_SCHEMA = ?
        AND TABLE_TYPE IN ('BASE TABLE', 'VIEW')
      ORDER BY TABLE_NAME
    `,
      [schema]
    );

    return (rows as any[]).map(row => ({
      name: row.name,
      schema: row.schema,
      type: row.type as 'table' | 'view',
      row_count: parseInt(row.row_count) || 0,
      size_bytes: parseInt(row.size_bytes) || 0,
      comment: row.comment || undefined
    }));
  }

  private async getMySQLColumns(
    connectionId: string,
    schema: string,
    table: string,
    context: AuthContext
  ): Promise<ColumnInfo[]> {
    const pool = await this.connectionService.getMySQLPool(connectionId, context);

    const [rows] = await pool.execute(
      `
      SELECT
        c.COLUMN_NAME as name,
        c.DATA_TYPE as type,
        c.COLUMN_TYPE as data_type,
        c.IS_NULLABLE = 'YES' as nullable,
        c.COLUMN_DEFAULT as default_value,
        c.CHARACTER_MAXIMUM_LENGTH as max_length,
        c.NUMERIC_PRECISION as numeric_precision,
        c.NUMERIC_SCALE as numeric_scale,
        c.COLUMN_KEY = 'PRI' as is_primary_key,
        c.COLUMN_KEY = 'MUL' as is_foreign_key,
        c.COLUMN_KEY = 'UNI' as is_unique,
        c.COLUMN_COMMENT as comment
      FROM INFORMATION_SCHEMA.COLUMNS c
      WHERE c.TABLE_SCHEMA = ? AND c.TABLE_NAME = ?
      ORDER BY c.ORDINAL_POSITION
    `,
      [schema, table]
    );

    // Get foreign key references separately
    const [fkRows] = await pool.execute(
      `
      SELECT
        kcu.COLUMN_NAME as column_name,
        kcu.REFERENCED_TABLE_NAME as referenced_table,
        kcu.REFERENCED_COLUMN_NAME as referenced_column,
        kcu.REFERENCED_TABLE_SCHEMA as referenced_schema
      FROM INFORMATION_SCHEMA.KEY_COLUMN_USAGE kcu
      WHERE kcu.TABLE_SCHEMA = ?
        AND kcu.TABLE_NAME = ?
        AND kcu.REFERENCED_TABLE_NAME IS NOT NULL
    `,
      [schema, table]
    );

    const fkMap = new Map<string, any>();
    (fkRows as any[]).forEach(fk => {
      fkMap.set(fk.column_name, fk);
    });

    return (rows as any[]).map(row => {
      const fk = fkMap.get(row.name);
      return {
        name: row.name,
        type: row.type,
        data_type: row.data_type,
        nullable: Boolean(row.nullable),
        default_value: row.default_value,
        is_primary_key: Boolean(row.is_primary_key),
        is_foreign_key: Boolean(row.is_foreign_key) || !!fk,
        is_unique: Boolean(row.is_unique),
        max_length: row.max_length ? parseInt(row.max_length) : undefined,
        numeric_precision: row.numeric_precision ? parseInt(row.numeric_precision) : undefined,
        numeric_scale: row.numeric_scale ? parseInt(row.numeric_scale) : undefined,
        references: fk
          ? {
              table: fk.referenced_table,
              column: fk.referenced_column,
              schema: fk.referenced_schema
            }
          : undefined,
        comment: row.comment || undefined
      };
    });
  }

  private async getMySQLIndexes(
    connectionId: string,
    schema: string,
    table: string,
    context: AuthContext
  ): Promise<IndexInfo[]> {
    const pool = await this.connectionService.getMySQLPool(connectionId, context);

    const [rows] = await pool.execute(
      `
      SELECT
        INDEX_NAME as name,
        GROUP_CONCAT(COLUMN_NAME ORDER BY SEQ_IN_INDEX) as columns,
        NOT NON_UNIQUE as \`unique\`,
        INDEX_TYPE as type
      FROM INFORMATION_SCHEMA.STATISTICS
      WHERE TABLE_SCHEMA = ?
        AND TABLE_NAME = ?
        AND INDEX_NAME != 'PRIMARY'
      GROUP BY INDEX_NAME, NON_UNIQUE, INDEX_TYPE
      ORDER BY INDEX_NAME
    `,
      [schema, table]
    );

    return (rows as any[]).map(row => ({
      name: row.name,
      columns: row.columns.split(','),
      unique: Boolean(row.unique),
      type: row.type
    }));
  }

  private async getMySQLForeignKeys(
    connectionId: string,
    schema: string,
    table: string,
    context: AuthContext
  ): Promise<ForeignKeyInfo[]> {
    const pool = await this.connectionService.getMySQLPool(connectionId, context);

    const [rows] = await pool.execute(
      `
      SELECT
        kcu.CONSTRAINT_NAME as name,
        GROUP_CONCAT(kcu.COLUMN_NAME ORDER BY kcu.ORDINAL_POSITION) as columns,
        kcu.REFERENCED_TABLE_NAME as referenced_table,
        kcu.REFERENCED_TABLE_SCHEMA as referenced_schema,
        GROUP_CONCAT(kcu.REFERENCED_COLUMN_NAME ORDER BY kcu.ORDINAL_POSITION) as referenced_columns,
        rc.UPDATE_RULE as on_update,
        rc.DELETE_RULE as on_delete
      FROM INFORMATION_SCHEMA.KEY_COLUMN_USAGE kcu
      JOIN INFORMATION_SCHEMA.REFERENTIAL_CONSTRAINTS rc
        ON kcu.CONSTRAINT_NAME = rc.CONSTRAINT_NAME
        AND kcu.TABLE_SCHEMA = rc.CONSTRAINT_SCHEMA
      WHERE kcu.TABLE_SCHEMA = ?
        AND kcu.TABLE_NAME = ?
        AND kcu.REFERENCED_TABLE_NAME IS NOT NULL
      GROUP BY kcu.CONSTRAINT_NAME, kcu.REFERENCED_TABLE_NAME,
               kcu.REFERENCED_TABLE_SCHEMA, rc.UPDATE_RULE, rc.DELETE_RULE
      ORDER BY kcu.CONSTRAINT_NAME
    `,
      [schema, table]
    );

    return (rows as any[]).map(row => ({
      name: row.name,
      columns: row.columns.split(','),
      referenced_table: row.referenced_table,
      referenced_schema: row.referenced_schema,
      referenced_columns: row.referenced_columns.split(','),
      on_update: row.on_update,
      on_delete: row.on_delete
    }));
  }
}
