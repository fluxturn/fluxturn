export interface DatabaseConnection {
  id: string;
  organization_id: string;
  project_id: string;
  created_by: string;
  name: string;
  description?: string;
  database_type: 'postgresql' | 'mysql';
  config: DatabaseConnectionConfig;
  credentials?: DatabaseCredentials; // Only populated when decrypted
  status: 'active' | 'inactive' | 'error' | 'pending';
  last_tested_at?: Date;
  test_result?: TestResult;
  is_active: boolean;
  created_at: Date;
  updated_at: Date;
}

export interface DatabaseConnectionConfig {
  host: string;
  port: number;
  database: string;
  ssl_enabled?: boolean;
  ssl_config?: {
    rejectUnauthorized?: boolean;
    ca?: string;
    cert?: string;
    key?: string;
  };
  connection_timeout?: number;
  pool_size?: number;
}

export interface DatabaseCredentials {
  user: string;
  password: string;
}

export interface TestResult {
  success: boolean;
  message?: string;
  latency_ms?: number;
  tested_at: string;
}

export interface SchemaInfo {
  name: string;
  owner?: string;
}

export interface TableInfo {
  name: string;
  schema: string;
  type: 'table' | 'view';
  row_count?: number;
  size_bytes?: number;
  comment?: string;
}

export interface ColumnInfo {
  name: string;
  type: string;
  data_type: string;
  nullable: boolean;
  default_value?: string;
  is_primary_key: boolean;
  is_foreign_key: boolean;
  is_unique: boolean;
  max_length?: number;
  numeric_precision?: number;
  numeric_scale?: number;
  references?: {
    table: string;
    column: string;
    schema?: string;
  };
  comment?: string;
}

export interface IndexInfo {
  name: string;
  columns: string[];
  unique: boolean;
  type: string;
  definition?: string;
}

export interface ForeignKeyInfo {
  name: string;
  columns: string[];
  referenced_table: string;
  referenced_schema?: string;
  referenced_columns: string[];
  on_update: string;
  on_delete: string;
}

export interface TableStructure {
  table_name: string;
  schema: string;
  columns: ColumnInfo[];
  primary_key: string[];
  indexes: IndexInfo[];
  foreign_keys: ForeignKeyInfo[];
}

export interface QueryResult {
  rows: any[];
  columns: ColumnInfo[];
  row_count: number;
  affected_rows?: number;
  execution_time_ms: number;
  command?: string;
}

export interface QueryHistoryItem {
  id: string;
  connection_id: string;
  user_id: string;
  query_text: string;
  query_type: string;
  execution_time_ms: number;
  rows_affected?: number;
  status: 'success' | 'error';
  error_message?: string;
  created_at: Date;
}
