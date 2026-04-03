// Database Types
export type DatabaseType = 'postgresql' | 'mysql';

export interface DatabaseConnection {
  id: string;
  organization_id: string;
  project_id: string;
  created_by: string;
  name: string;
  description?: string;
  database_type: DatabaseType;
  config: DatabaseConnectionConfig;
  status: 'active' | 'inactive' | 'error' | 'pending';
  last_tested_at?: string;
  test_result?: TestResult;
  is_active: boolean;
  created_at: string;
  updated_at: string;
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
  tested_at?: string;
}

export interface CreateConnectionData {
  name: string;
  description?: string;
  database_type: DatabaseType;
  config: DatabaseConnectionConfig;
  credentials: DatabaseCredentials;
}

export interface UpdateConnectionData {
  name?: string;
  description?: string;
  config?: DatabaseConnectionConfig;
  credentials?: DatabaseCredentials;
  is_active?: boolean;
}

export interface ConnectionListResponse {
  data: DatabaseConnection[];
  total: number;
}

// Schema Types
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

// Query Types
export interface QueryResult {
  rows: Record<string, any>[];
  columns: ColumnInfo[];
  row_count: number;
  affected_rows?: number;
  execution_time_ms: number;
  command?: string;
}

export interface TableDataResponse extends QueryResult {
  pagination: {
    page: number;
    page_size: number;
    total: number;
    total_pages: number;
  };
}

export interface ExecuteQueryRequest {
  query: string;
  params?: any[];
  timeout?: number;
}

export interface InsertRowsRequest {
  schema: string;
  table: string;
  data: Record<string, any>[];
  returning?: string;
}

export interface UpdateRowsRequest {
  schema: string;
  table: string;
  data: Record<string, any>;
  where: Record<string, any>;
  returning?: string;
}

export interface DeleteRowsRequest {
  schema: string;
  table: string;
  where: Record<string, any>;
  returning?: string;
}

// Query History
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
  created_at: string;
}

// Connection Form State
export interface ConnectionFormData {
  name: string;
  description: string;
  database_type: DatabaseType;
  host: string;
  port: number;
  database: string;
  user: string;
  password: string;
  ssl_enabled: boolean;
}
