import { api } from '../api';

// Backend Database Types - matching the DTOs
export interface TableInfoDto {
  tableName: string;
  schemaName: string;
  rowCount: number;
  sizeBytes: number;
  sizeHuman: string;
  createdAt: Date;
  lastModified: Date;
  tableType: string;
}

export interface ColumnInfoDto {
  columnName: string;
  dataType: string;
  isNullable: boolean;
  columnDefault: string | null;
  characterMaximumLength: number | null;
  numericPrecision: number | null;
  isPrimaryKey: boolean;
  isUnique: boolean;
  ordinalPosition: number;
}

export interface DatabaseStatsDto {
  databaseName: string;
  sizeBytes: number;
  sizeHuman: string;
  tableCount: number;
  connectionCount: number;
  version: string;
  uptime: string;
  totalRows: number;
  createdAt: Date;
  lastBackup: Date | null;
  topTables: TableInfoDto[];
}

export interface TableDetailDto {
  tableInfo: TableInfoDto;
  columns: ColumnInfoDto[];
  indexes: Array<{
    indexName: string;
    columns: string[];
    isUnique: boolean;
    isPrimary: boolean;
  }>;
  foreignKeys: Array<{
    constraintName: string;
    columnName: string;
    referencedTable: string;
    referencedColumn: string;
  }>;
  checkConstraints: Array<{
    constraintName: string;
    checkClause: string;
  }>;
}

export interface TableDataQueryDto {
  page?: number;
  limit?: number;
  sortBy?: string;
  sortDirection?: 'ASC' | 'DESC';
  search?: string;
  filters?: Record<string, any>;
}

export interface TableDataResultDto {
  data: any[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  hasNext: boolean;
  hasPrev: boolean;
}

export interface DatabaseQueryDto {
  query: string;
  parameters?: any[];
}

export interface DatabaseQueryResultDto {
  data: any[];
  rowCount: number;
  command: string;
  fields?: Array<{
    name: string;
    dataTypeID: number;
    dataTypeSize: number;
    dataTypeModifier: number;
    format: string;
  }>;
}

// Legacy interfaces for compatibility
// export interface DatabaseColumn {
//   name: string;
//   type: string;
//   displayName?: string;
//   primaryKey?: boolean;
//   nullable?: boolean;
//   unique?: boolean;
//   defaultValue?: any;
//   selectOptions?: string[];
// }

// export interface DatabaseTable {
//   name: string;
//   displayName?: string;
//   description?: string;
//   columns: DatabaseColumn[];
//   createdAt: string;
//   updatedAt: string;
//   rowCount?: number;
//   views?: TableView[];
// }

// export interface SchemaDefinition {
//   version: string;
//   schema?: {
//     tables: DatabaseTable[];
//   };
// }

export interface QueryRequest {
  table: string;
  limit?: number;
  offset?: number;
}

export interface QueryResponse<T = any> {
  data: T[];
  total: number;
  page?: number;
  limit?: number;
  hasMore?: boolean;
}

// Additional types for DataTable and DataViews components
export interface QueryFilter {
  column: string;
  operator: 'eq' | 'neq' | 'gt' | 'gte' | 'lt' | 'lte' | 'like' | 'in' | 'nin' | 'null' | 'notnull';
  value?: any;
}

export interface QuerySort {
  column: string;
  direction: 'asc' | 'desc';
}

export interface BatchOperation {
  id: string;
  type: 'insert' | 'update' | 'delete';
  table: string;
  data?: Record<string, any>;
  where?: Record<string, any>;
}

export interface CollaborativeEdit {
  id: string;
  userId: string;
  userName: string;
  tableName: string;
  rowId: string;
  columnId: string;
  startedAt: Date;
  value?: any;
}

export interface TableView {
  id: string;
  name: string;
  description?: string;
  type: 'grid' | 'card' | 'kanban' | 'gallery' | 'calendar' | 'timeline';
  config: {
    columns?: string[];
    filters?: QueryFilter[];
    sort?: QuerySort[];
    groupBy?: string;
    displayField?: string;
    imageField?: string;
    dateField?: string;
    statusField?: string;
  };
  isDefault?: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface SchemaRelationship {
  id: string;
  name?: string;
  from: {
    table: string;
    column: string;
  };
  to: {
    table: string;
    column: string;
  };
  type: 'one-to-one' | 'one-to-many' | 'many-to-many';
  onDelete?: 'CASCADE' | 'SET_NULL' | 'RESTRICT' | 'NO_ACTION';
  onUpdate?: 'CASCADE' | 'SET_NULL' | 'RESTRICT' | 'NO_ACTION';
}

// For backwards compatibility with existing frontend code
export interface DatabaseStats {
  totalTables: number;
  totalRows: number;
  totalStorage: number;
  lastUpdated: string;
}

class DatabaseAPI {
  // Database Statistics
  async getDatabaseStats(): Promise<DatabaseStats> {
    const stats: DatabaseStatsDto = await api.get('/database/stats');
    // Transform backend DTO to frontend interface for compatibility
    return {
      totalTables: stats.tableCount,
      totalRows: stats.totalRows,
      totalStorage: stats.sizeBytes,
      lastUpdated: stats.lastBackup ? new Date(stats.lastBackup).toISOString() : new Date().toISOString()
    };
  }

  async getDatabaseStatsRaw(): Promise<DatabaseStatsDto> {
    return api.get('/database/stats');
  }

  // Table Management - returns backend data directly
  async getTables(): Promise<TableInfoDto[]> {
    return api.get('/database/tables');
  }

  // Deprecated - use getTables() instead
  async getTablesRaw(): Promise<TableInfoDto[]> {
    return this.getTables();
  }

  async getTable(tableName: string): Promise<TableDetailDto> {
    return api.get(`/database/tables/${tableName}`);
  }

  // Deprecated - use getTable() instead
  async getTableDetail(tableName: string): Promise<TableDetailDto> {
    return this.getTable(tableName);
  }

  // Data Operations
  async queryData<T = any>(request: QueryRequest): Promise<QueryResponse<T>> {
    const queryParams = new URLSearchParams();
    
    if (request.limit) {
      queryParams.append('limit', request.limit.toString());
    }
    
    if (request.offset) {
      const page = Math.floor(request.offset / (request.limit || 50)) + 1;
      queryParams.append('page', page.toString());
    }

    const result: TableDataResultDto = await api.get(`/database/tables/${request.table}/data?${queryParams.toString()}`);
    
    // Transform backend response to frontend interface for compatibility
    return {
      data: result.data,
      total: result.total,
      page: result.page,
      limit: result.limit,
      hasMore: result.hasNext
    };
  }

  async getTableData(tableName: string, queryParams: TableDataQueryDto = {}): Promise<TableDataResultDto> {
    const params = new URLSearchParams();
    
    Object.entries(queryParams).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        if (typeof value === 'object') {
          params.append(key, JSON.stringify(value));
        } else {
          params.append(key, value.toString());
        }
      }
    });

    const query = params.toString();
    return api.get(`/database/tables/${tableName}/data${query ? `?${query}` : ''}`);
  }

  async executeQuery(queryDto: DatabaseQueryDto): Promise<DatabaseQueryResultDto> {
    return api.post('/database/query', queryDto);
  }

  async naturalQuery(query: string, context?: any): Promise<any> {
    return api.post('/query/natural', { query, schema: context });
  }

  // Row Operations
  async createTableRow(tableName: string, data: Record<string, any>): Promise<any> {
    return api.post(`/database/tables/${tableName}/rows`, { data });
  }

  async updateTableRow(tableName: string, id: string, data: Record<string, any>): Promise<any> {
    return api.put(`/database/tables/${tableName}/rows/${id}`, { data });
  }

  async deleteTableRow(tableName: string, id: string): Promise<any> {
    return api.delete(`/database/tables/${tableName}/rows/${id}`);
  }

  // Legacy method for old database pages - will be removed when old pages are deleted
  // async getSchema(): Promise<SchemaDefinition> {
  //   const tablesInfo = await this.getTables();
    
  //   // Fetch detailed info including columns for each table
  //   const tables = await Promise.all(
  //     tablesInfo.map(async (tableInfo) => {
  //       try {
  //         const tableDetail = await this.getTable(tableInfo.tableName);
  //         return {
  //           name: tableInfo.tableName,
  //           displayName: tableInfo.tableName,
  //           description: '',
  //           columns: tableDetail.columns.map(col => ({
  //             name: col.columnName,
  //             type: col.dataType,
  //             displayName: col.columnName,
  //             primaryKey: col.isPrimaryKey,
  //             nullable: col.isNullable,
  //             unique: col.isUnique,
  //             defaultValue: col.columnDefault
  //           })),
  //           createdAt: new Date(tableInfo.createdAt).toISOString(),
  //           updatedAt: new Date(tableInfo.lastModified).toISOString(),
  //           rowCount: tableInfo.rowCount
  //         };
  //       } catch (error) {
  //         console.warn(`Failed to get details for table ${tableInfo.tableName}:`, error);
  //         // Return basic info without columns if detail fetch fails
  //         return {
  //           name: tableInfo.tableName,
  //           displayName: tableInfo.tableName,
  //           description: '',
  //           columns: [],
  //           createdAt: new Date(tableInfo.createdAt).toISOString(),
  //           updatedAt: new Date(tableInfo.lastModified).toISOString(),
  //           rowCount: tableInfo.rowCount
  //         };
  //       }
  //     })
  //   );
    
  //   return {
  //     version: '1.0',
  //     schema: {
  //       tables
  //     }
  //   };
  // }

  // Collaborative editing methods (stub implementations for now)
  async getActiveEdits(tableName: string): Promise<any[]> {
    // TODO: Implement collaborative editing API
    return [];
  }

  async getUndoRedoState(tableName?: string): Promise<{ canUndo: boolean; canRedo: boolean }> {
    // TODO: Implement undo/redo API
    return { canUndo: false, canRedo: false };
  }

  async getBatchOperations(tableName: string): Promise<any[]> {
    // TODO: Implement batch operations API
    return [];
  }

  async startEdit(tableName: string, rowId: string, columnId: string): Promise<void> {
    // TODO: Implement collaborative editing API
    return;
  }

  async endEdit(tableName: string, rowId: string, columnId: string, value?: any): Promise<void> {
    // TODO: Implement collaborative editing API
    return;
  }

  async executeOperation(operation: any): Promise<any> {
    // TODO: Implement operation execution API
    return { success: true };
  }

  async executeBatch(operations: any[]): Promise<any> {
    // TODO: Implement batch operations API
    return { success: true, results: [] };
  }

  async exportData(tableName: string, options?: any): Promise<Blob> {
    // TODO: Implement data export API
    return new Blob([''], { type: 'text/csv' });
  }

  async undo(): Promise<void> {
    // TODO: Implement undo API
    return;
  }

  async redo(): Promise<void> {
    // TODO: Implement redo API
    return;
  }

  // Placeholder methods for future implementation
  // async createTable(tableName: string, columns: DatabaseColumn[]): Promise<void> {
  //   // This would be implemented when table creation UI is added
  //   throw new Error('Table creation not yet implemented');
  // }

  async deleteTable(tableName: string): Promise<void> {
    return api.delete(`/database/tables/${tableName}`);
  }

  // View management methods
  async createView(tableName: string, view: Omit<TableView, 'id' | 'createdAt' | 'updatedAt'>): Promise<TableView> {
    // TODO: Implement view creation API
    const newView: TableView = {
      ...view,
      id: `view_${Date.now()}`,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    return Promise.resolve(newView);
  }

  async updateView(tableName: string, viewId: string, updates: Partial<TableView>): Promise<TableView> {
    // TODO: Implement view update API
    return Promise.resolve({
      id: viewId,
      name: updates.name || 'Updated View',
      type: updates.type || 'grid',
      config: updates.config || {},
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });
  }

  async deleteView(tableName: string, viewId: string): Promise<void> {
    // TODO: Implement view deletion API
    return Promise.resolve();
  }

  // Schema Import and Migration Methods
  async validateSchema(schema: any): Promise<{
    valid: boolean;
    issues: Array<{
      type: 'error' | 'warning' | 'info';
      table?: string;
      column?: string;
      message: string;
      suggestion?: string;
    }>;
    tablesCount: number;
    columnsCount: number;
  }> {
    return api.post('/database/schema/validate', { schema });
  }

  async generateMigrationPlan(schema: any): Promise<{
    id: string;
    steps: Array<{
      id: string;
      type: string;
      table: string;
      description: string;
      sql: string;
      status: string;
    }>;
    totalSteps: number;
    status: string;
  }> {
    return api.post('/database/schema/plan', { schema });
  }

  async executeMigrationPlan(planId: string): Promise<{
    success: boolean;
    completedSteps: number;
    failedStep?: {
      id: string;
      error: string;
    };
  }> {
    return api.post(`/database/schema/migrate/${planId}`);
  }

  async rollbackMigration(planId: string): Promise<{
    success: boolean;
    message: string;
  }> {
    return api.post(`/database/schema/rollback/${planId}`);
  }

  async getMigrationHistory(): Promise<Array<{
    id: string;
    createdAt: string;
    status: string;
    totalSteps: number;
    completedSteps: number;
    tablesCreated: string[];
  }>> {
    return api.get('/database/schema/history');
  }

  async exportSchema(): Promise<{
    version: string;
    tables: any[];
    metadata: {
      exportedAt: string;
      source: string;
    };
  }> {
    return api.get('/database/schema/export');
  }

  // Schema Save/Load Methods
  async saveSchema(
    name: string, 
    description: string, 
    schema: any,
    organizationId?: string,
    projectId?: string,
    appId?: string
  ): Promise<{
    success: boolean;
    data: {
      id: string;
      name: string;
      description?: string;
      created_at: string;
      updated_at: string;
    };
  }> {
    // Set context in API client
    if (organizationId) api.setOrganizationId(organizationId);
    if (projectId) api.setProjectId(projectId);
    if (appId) api.setAppId(appId);
    
    return api.post('/schema/save', {
      name,
      description,
      schema
    });
  }

  async getSavedSchemas(
    organizationId?: string,
    projectId?: string,
    appId?: string
  ): Promise<{
    success: boolean;
    data: Array<{
      id: string;
      name: string;
      description?: string;
      created_at: string;
      updated_at: string;
      created_by?: string;
    }>;
  }> {
    // Set context in API client
    if (organizationId) api.setOrganizationId(organizationId);
    if (projectId) api.setProjectId(projectId);
    if (appId) api.setAppId(appId);
    
    return api.get('/schema/saved');
  }

  async getSavedSchema(
    id: string,
    organizationId?: string,
    projectId?: string,
    appId?: string
  ): Promise<{
    success: boolean;
    data: {
      id: string;
      name: string;
      description?: string;
      schema_definition: any;
      created_at: string;
      updated_at: string;
      created_by?: string;
    };
  }> {
    // Set context in API client
    if (organizationId) api.setOrganizationId(organizationId);
    if (projectId) api.setProjectId(projectId);
    if (appId) api.setAppId(appId);
    
    return api.get(`/schema/saved/${id}`);
  }

  async deleteSavedSchema(
    id: string,
    organizationId?: string,
    projectId?: string,
    appId?: string
  ): Promise<{
    success: boolean;
    message: string;
  }> {
    // Set context in API client
    if (organizationId) api.setOrganizationId(organizationId);
    if (projectId) api.setProjectId(projectId);
    if (appId) api.setAppId(appId);
    
    return api.delete(`/schema/saved/${id}`);
  }

  async executeMigration(
    schema: any,
    organizationId?: string,
    projectId?: string,
    appId?: string
  ): Promise<{
    success: boolean;
    migrationId: string;
    message: string;
  }> {
    // Set context in API client
    if (organizationId) api.setOrganizationId(organizationId);
    if (projectId) api.setProjectId(projectId);
    if (appId) api.setAppId(appId);
    
    const result = await api.post('/schema/migrate', {
      schema,
      migrationId: `migration-${Date.now()}`,
      dryRun: false,
      force: false
    });
    return result;
  }
}

export const databaseAPI = new DatabaseAPI();
export default databaseAPI;