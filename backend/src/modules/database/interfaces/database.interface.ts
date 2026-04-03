export interface DatabaseConfig {
  host: string;
  port: number;
  database: string;
  user: string;
  password: string;
  ssl?: boolean;
  max?: number;
  idleTimeoutMillis?: number;
  connectionTimeoutMillis?: number;
}

export interface QueryResult<T = any> {
  rows: T[];
  rowCount: number;
  command: string;
  fields: QueryResultField[];
}

export interface QueryResultField {
  name: string;
  dataTypeID: number;
  dataTypeSize: number;
  dataTypeModifier: number;
  format: string;
}

export interface TransactionOptions {
  isolationLevel?: 'READ_UNCOMMITTED' | 'READ_COMMITTED' | 'REPEATABLE_READ' | 'SERIALIZABLE';
  readOnly?: boolean;
  deferrable?: boolean;
}

export interface AuthContext {
  type: 'jwt' | 'apikey';
  userId?: string;
  projectId?: string;
  appId?: string;
  organizationId?: string;
}

export interface DatabaseConnection {
  query<T = any>(text: string, params?: any[]): Promise<QueryResult<T>>;
  release(): void;
}

export interface DatabasePool {
  connect(): Promise<DatabaseConnection>;
  query<T = any>(text: string, params?: any[]): Promise<QueryResult<T>>;
  end(): Promise<void>;
  totalCount: number;
  idleCount: number;
  waitingCount: number;
}