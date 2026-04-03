import { Injectable, Logger } from '@nestjs/common';
import { BaseConnector } from '../../base/base.connector';
import {
  ConnectorMetadata,
  ConnectorType,
  ConnectorCategory,
  ConnectorRequest,
  ConnectorResponse,
  AuthType,
  ConnectorAction,
  ConnectorTrigger
} from '../../types';
import { AuthUtils } from '../../utils/auth.utils';
import { ApiUtils } from '../../utils/api.utils';
import axios from 'axios';

interface FilterCondition {
  column: string;
  operator: string;
  value: any;
}

@Injectable()
export class SupabaseConnector extends BaseConnector {
  private host: string;
  private serviceRole: string;
  private baseUrl: string;

  constructor(
    private readonly authUtils: AuthUtils,
    private readonly apiUtils: ApiUtils
  ) {
    super();
  }

  getMetadata(): ConnectorMetadata {
    return {
      name: 'Supabase',
      description: 'Supabase database connector - add, get, delete and update data in tables',
      version: '1.0.0',
      category: ConnectorCategory.DATA_PROCESSING,
      type: ConnectorType.SUPABASE,
      authType: AuthType.API_KEY,
      actions: this.getActions(),
      triggers: this.getTriggers(),
      webhookSupport: false
    };
  }

  protected async initializeConnection(): Promise<void> {
    this.host = this.config.credentials.host;
    this.serviceRole = this.config.credentials.serviceRole;

    if (!this.host || !this.serviceRole) {
      throw new Error('Host and Service Role Secret are required for Supabase connector');
    }

    // Remove trailing slash from host if present
    this.host = this.host.replace(/\/$/, '');
    this.baseUrl = `${this.host}/rest/v1`;

    this.logger.log('Supabase connector initialized');
  }

  protected async performConnectionTest(): Promise<boolean> {
    try {
      // Test connection by fetching schema
      const response = await this.makeApiRequest('GET', '/');
      return response.status === 200;
    } catch (error) {
      this.logger.error('Supabase connection test failed:', error.message);
      return false;
    }
  }

  protected async performHealthCheck(): Promise<void> {
    if (!this.config?.credentials?.host || !this.config?.credentials?.serviceRole) {
      throw new Error('Host and Service Role not configured');
    }
  }

  protected async performRequest(request: ConnectorRequest): Promise<any> {
    const url = `${this.baseUrl}${request.endpoint}`;

    const headers: any = {
      'Content-Type': 'application/json',
      'apikey': this.serviceRole,
      'Authorization': `Bearer ${this.serviceRole}`,
      ...request.headers
    };

    // Add schema header if custom schema is used
    if (request.queryParams?.schema && request.queryParams.schema !== 'public') {
      headers['Accept-Profile'] = request.queryParams.schema;
      headers['Content-Profile'] = request.queryParams.schema;
    }

    const response = await axios({
      method: request.method,
      url,
      headers,
      params: request.queryParams,
      data: request.body
    });

    return response.data;
  }

  protected async performAction(actionId: string, input: any): Promise<any> {
    switch (actionId) {
      case 'create_row':
        return await this.createRow(input);
      case 'delete_row':
        return await this.deleteRow(input);
      case 'get_row':
        return await this.getRow(input);
      case 'get_all_rows':
        return await this.getAllRows(input);
      case 'update_row':
        return await this.updateRow(input);
      default:
        throw new Error(`Unknown action: ${actionId}`);
    }
  }

  protected async cleanup(): Promise<void> {
    this.logger.log('Supabase connector cleanup completed');
  }

  // Row Actions
  private async createRow(input: any): Promise<any> {
    const { tableId, useCustomSchema, schema, dataToSend, inputsToIgnore, fieldsUi, ...rest } = input;

    // Build record data
    let record: any = {};

    if (dataToSend === 'autoMapInputData') {
      // Auto-map all fields except those to ignore
      const ignoreList = inputsToIgnore ? inputsToIgnore.split(',').map((f: string) => f.trim()) : [];
      Object.keys(rest).forEach(key => {
        if (!ignoreList.includes(key) && !['tableId', 'useCustomSchema', 'schema', 'dataToSend', 'inputsToIgnore', 'fieldsUi'].includes(key)) {
          record[key] = rest[key];
        }
      });
    } else if (dataToSend === 'defineBelow' && fieldsUi) {
      // Parse fields from JSON
      try {
        record = typeof fieldsUi === 'string' ? JSON.parse(fieldsUi) : fieldsUi;
      } catch (error) {
        throw new Error('Invalid fields JSON');
      }
    }

    const headers: any = {
      'Prefer': 'return=representation'
    };

    return await this.makeApiRequest('POST', `/${tableId}`, record, headers, useCustomSchema ? schema : undefined);
  }

  private async deleteRow(input: any): Promise<any> {
    const { tableId, useCustomSchema, schema, filterType, matchType, filters, filterString } = input;

    let endpoint = `/${tableId}`;
    const queryParams: any = {};

    if (filterType === 'manual' && filters) {
      const conditions = this.parseFilters(filters);
      this.buildQueryParams(queryParams, conditions, matchType);
    } else if (filterType === 'string' && filterString) {
      // Parse filter string manually
      endpoint = `${endpoint}?${filterString}`;
    }

    const headers: any = {
      'Prefer': 'return=representation'
    };

    return await this.makeApiRequest('DELETE', endpoint, undefined, headers, useCustomSchema ? schema : undefined, queryParams);
  }

  private async getRow(input: any): Promise<any> {
    const { tableId, useCustomSchema, schema, filters } = input;

    const conditions = this.parseFilters(filters);
    const queryParams: any = {};
    this.buildQueryParams(queryParams, conditions, 'allFilters');

    return await this.makeApiRequest('GET', `/${tableId}`, undefined, {}, useCustomSchema ? schema : undefined, queryParams);
  }

  private async getAllRows(input: any): Promise<any> {
    const { tableId, useCustomSchema, schema, returnAll, limit, filterType, matchType, filters, filterString } = input;

    let endpoint = `/${tableId}`;
    const queryParams: any = {};

    if (!returnAll && limit) {
      queryParams.limit = limit;
    }

    if (filterType === 'manual' && filters) {
      const conditions = this.parseFilters(filters);
      this.buildQueryParams(queryParams, conditions, matchType);
    } else if (filterType === 'string' && filterString) {
      endpoint = `${endpoint}?${filterString}`;
    }

    // If returnAll is true, handle pagination
    if (returnAll) {
      return await this.getAllRowsWithPagination(endpoint, queryParams, useCustomSchema ? schema : undefined);
    }

    return await this.makeApiRequest('GET', endpoint, undefined, {}, useCustomSchema ? schema : undefined, queryParams);
  }

  private async updateRow(input: any): Promise<any> {
    const { tableId, useCustomSchema, schema, filterType, matchType, filters, filterString, dataToSend, inputsToIgnore, fieldsUi, ...rest } = input;

    // Build update data
    let record: any = {};

    if (dataToSend === 'autoMapInputData') {
      const ignoreList = inputsToIgnore ? inputsToIgnore.split(',').map((f: string) => f.trim()) : [];
      Object.keys(rest).forEach(key => {
        if (!ignoreList.includes(key) && !['tableId', 'useCustomSchema', 'schema', 'filterType', 'matchType', 'filters', 'filterString', 'dataToSend', 'inputsToIgnore', 'fieldsUi'].includes(key)) {
          record[key] = rest[key];
        }
      });
    } else if (dataToSend === 'defineBelow' && fieldsUi) {
      try {
        record = typeof fieldsUi === 'string' ? JSON.parse(fieldsUi) : fieldsUi;
      } catch (error) {
        throw new Error('Invalid fields JSON');
      }
    }

    let endpoint = `/${tableId}`;
    const queryParams: any = {};

    if (filterType === 'manual' && filters) {
      const conditions = this.parseFilters(filters);
      this.buildQueryParams(queryParams, conditions, matchType);
    } else if (filterType === 'string' && filterString) {
      endpoint = `${endpoint}?${filterString}`;
    }

    const headers: any = {
      'Prefer': 'return=representation'
    };

    return await this.makeApiRequest('PATCH', endpoint, record, headers, useCustomSchema ? schema : undefined, queryParams);
  }

  // Helper Methods
  private parseFilters(filters: any): FilterCondition[] {
    try {
      return typeof filters === 'string' ? JSON.parse(filters) : filters;
    } catch (error) {
      throw new Error('Invalid filters JSON');
    }
  }

  private buildQueryParams(queryParams: any, conditions: FilterCondition[], matchType: string): void {
    if (matchType === 'allFilters') {
      // Build individual query parameters for each condition
      conditions.forEach(condition => {
        const { column, operator, value } = condition;
        queryParams[column] = `${operator}.${value}`;
      });
    } else if (matchType === 'anyFilter') {
      // Build OR query
      const orConditions = conditions.map(c => `${c.column}.${c.operator}.${c.value}`);
      queryParams['or'] = `(${orConditions.join(',')})`;
    }
  }

  private async getAllRowsWithPagination(endpoint: string, queryParams: any, schema?: string): Promise<any> {
    let allRows: any[] = [];
    let offset = 0;
    const limit = 1000;

    while (true) {
      const params = { ...queryParams, limit, offset };
      const rows = await this.makeApiRequest('GET', endpoint, undefined, {}, schema, params);

      if (!rows || rows.length === 0) {
        break;
      }

      allRows = allRows.concat(rows);
      offset += rows.length;

      if (rows.length < limit) {
        break;
      }
    }

    return allRows;
  }

  private async makeApiRequest(
    method: string,
    endpoint: string,
    data?: any,
    extraHeaders?: any,
    schema?: string,
    queryParams?: any
  ): Promise<any> {
    const url = `${this.baseUrl}${endpoint}`;

    const headers: any = {
      'Content-Type': 'application/json',
      'apikey': this.serviceRole,
      'Authorization': `Bearer ${this.serviceRole}`,
      ...extraHeaders
    };

    // Add schema headers if custom schema
    if (schema && schema !== 'public') {
      headers['Accept-Profile'] = schema;
      headers['Content-Profile'] = schema;
    }

    const response = await axios({
      method,
      url,
      headers,
      params: queryParams,
      data
    });

    return response.data;
  }

  private getActions(): ConnectorAction[] {
    return [
      {
        id: 'create_row',
        name: 'Create Row',
        description: 'Create a new row in a table',
        inputSchema: {},
        outputSchema: { id: { type: 'string' } }
      },
      {
        id: 'delete_row',
        name: 'Delete Row',
        description: 'Delete rows from a table',
        inputSchema: {},
        outputSchema: { deleted: { type: 'array' } }
      },
      {
        id: 'get_row',
        name: 'Get Row',
        description: 'Get a row from a table',
        inputSchema: {},
        outputSchema: { data: { type: 'array' } }
      },
      {
        id: 'get_all_rows',
        name: 'Get Many Rows',
        description: 'Get many rows from a table',
        inputSchema: {},
        outputSchema: { data: { type: 'array' } }
      },
      {
        id: 'update_row',
        name: 'Update Row',
        description: 'Update rows in a table',
        inputSchema: {},
        outputSchema: { data: { type: 'array' } }
      }
    ];
  }

  private getTriggers(): ConnectorTrigger[] {
    return [];
  }
}
