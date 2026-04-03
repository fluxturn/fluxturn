export interface WorkflowDatabaseContext {
  credentialId: string;
  connectorType: 'postgresql' | 'mysql';
  nodeId: string;
  nodeName: string;
}

export interface DatabaseNodeInfo {
  nodeId: string;
  nodeName: string;
  credentialId: string;
  connectorType: 'mysql' | 'postgresql';
}

export interface TableInfo {
  label: string;
  value: string;
}

export interface ColumnInfo {
  label: string;
  value: string;
  type?: string;
  isPrimary?: boolean;
  isNullable?: boolean;
  defaultValue?: string;
}

export interface TableRow {
  [key: string]: any;
}

export interface PaginationState {
  page: number;
  pageSize: number;
  total: number;
}

export interface ManualConnection {
  host: string;
  port: number;
  database: string;
  user: string;
  password: string;
  database_type: 'postgresql' | 'mysql';
  ssl_enabled?: boolean;
}

export type RowModalMode = 'view' | 'edit' | 'insert';
