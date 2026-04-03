import { Request } from 'express';
import { Injectable, Logger } from '@nestjs/common';
import { BaseConnector } from '../../base/base.connector';
import { ICRMConnector } from '../../base/connector.interface';
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
  BulkOperationResult
} from '../../types';
import { AuthUtils } from '../../utils/auth.utils';
import { ApiUtils } from '../../utils/api.utils';

interface MondayItem {
  id?: string;
  name: string;
  column_values?: Array<{
    id: string;
    value: any;
  }>;
  board?: {
    id: string;
  };
}

interface MondayBoard {
  id: string;
  name: string;
  columns: Array<{
    id: string;
    title: string;
    type: string;
    settings_str?: string;
  }>;
  groups: Array<{
    id: string;
    title: string;
    color: string;
  }>;
}

@Injectable()
export class MondayConnector extends BaseConnector implements ICRMConnector {
  private readonly baseUrl = 'https://api.monday.com/v2';

  constructor(
    private readonly authUtils: AuthUtils,
    private readonly apiUtils: ApiUtils
  ) {
    super();
  }

  getMetadata(): ConnectorMetadata {
    return {
      name: 'Monday.com',
      description: 'Monday.com work management platform with customizable boards, automation, and team collaboration features',
      version: '1.0.0',
      category: ConnectorCategory.CRM,
      type: ConnectorType.MONDAY,
      logoUrl: 'https://dapulse-res.cloudinary.com/image/upload/f_auto,q_auto/remote_mondaycom_static/img/logo/monday-logo-x2.png',
      documentationUrl: 'https://developer.monday.com/api-reference/docs',
      authType: AuthType.API_KEY,
      actions: this.getActions(),
      triggers: this.getTriggers(),
      rateLimit: {
        requestsPerSecond: 10,
        requestsPerMinute: 60,
        requestsPerHour: 3600
      },
      webhookSupport: true
    };
  }

  protected async initializeConnection(): Promise<void> {
    try {
      // Test the connection by fetching user info
      const query = `
        query {
          me {
            id
            name
            email
          }
        }
      `;

      const response = await this.performGraphQLRequest(query);

      if (!response?.data?.me) {
        throw new Error('Failed to connect to Monday.com API');
      }

      this.logger.log('Monday.com connector initialized successfully');
    } catch (error) {
      this.logger.error('Failed to initialize Monday.com connection:', error);
      throw new Error(`Monday.com connection failed: ${error.message}`);
    }
  }

  protected async performConnectionTest(): Promise<boolean> {
    try {
      const query = `
        query {
          me {
            id
          }
        }
      `;

      const response = await this.performGraphQLRequest(query);
      return !!response?.data?.me;
    } catch (error) {
      this.logger.error('Monday.com connection test failed:', error);
      return false;
    }
  }

  protected async performHealthCheck(): Promise<void> {
    try {
      const query = `
        query {
          me {
            id
          }
        }
      `;

      await this.performGraphQLRequest(query);
    } catch (error) {
      throw new Error(`Monday.com health check failed: ${error.message}`);
    }
  }

  protected async performRequest(request: ConnectorRequest): Promise<any> {
    try {
      const response = await this.apiUtils.executeRequest({
        ...request,
        endpoint: `${this.baseUrl}${request.endpoint}`,
        headers: {
          ...this.getAuthHeaders(),
          'Content-Type': 'application/json',
          ...request.headers
        }
      });

      if (!response.success) {
        throw new Error(response.error?.message || 'Request failed');
      }

      return response.data;
    } catch (error) {
      this.logger.error('Monday.com request failed:', error);
      throw error;
    }
  }

  protected async performAction(actionId: string, input: any): Promise<any> {
    switch (actionId) {
      case 'create_item':
        return this.createItem(input.boardId, input.item);
      case 'update_item':
        return this.updateItem(input.itemId, input.updates);
      case 'create_board':
        return this.createBoard(input.board);
      case 'add_column':
        return this.addColumn(input.boardId, input.column);
      case 'get_boards':
        return this.getBoards(input.options);
      case 'create_update':
        return this.createUpdate(input.itemId, input.update);
      case 'delete_item':
        return this.deleteItem(input.itemId);
      case 'move_item':
        return this.moveItem(input.itemId, input.groupId);
      case 'get_item':
        return this.getItem(input.itemId);
      case 'get_columns':
        return this.getColumns(input.boardId);
      case 'get_groups':
        return this.getGroups(input.boardId);
      case 'change_column_value':
        return this.changeColumnValue(input.boardId, input.itemId, input.columnId, input.value);
      case 'change_multiple_columns':
        return this.changeMultipleColumns(input.boardId, input.itemId, input.columnValues);
      default:
        throw new Error(`Unknown action: ${actionId}`);
    }
  }

  protected async cleanup(): Promise<void> {
    this.logger.log('Monday.com connector cleanup completed');
  }

  // ICRMConnector implementation - adapted for Monday.com's board-based structure
  async createContact(contact: any): Promise<ConnectorResponse> {
    try {
      const boardId = contact.boardId || this.config.settings?.contactsBoardId;
      if (!boardId) {
        throw new Error('Board ID is required for creating contacts');
      }

      const columnValues = this.buildColumnValues({
        'text': `${contact.firstName || ''} ${contact.lastName || ''}`.trim(),
        'email': contact.email,
        'phone': contact.phone,
        'text2': contact.company,
        'text3': contact.jobTitle,
        'text4': contact.description,
        ...contact.customFields
      });

      const mutation = `
        mutation {
          create_item (
            board_id: ${boardId}
            item_name: "${contact.firstName || ''} ${contact.lastName || ''}"
            column_values: "${columnValues}"
          ) {
            id
            name
            column_values {
              id
              value
              text
            }
          }
        }
      `;

      const result = await this.performGraphQLRequest(mutation);

      return {
        success: true,
        data: result.data?.create_item,
        metadata: {
          timestamp: new Date(),
          rateLimit: await this.getRateLimitInfo()
        }
      };
    } catch (error) {
      return this.handleError(error as any, 'Failed to create contact');
    }
  }

  async updateContact(contactId: string, updates: any): Promise<ConnectorResponse> {
    try {
      const columnValues = this.buildColumnValues({
        'text': updates.firstName || updates.lastName ? 
          `${updates.firstName || ''} ${updates.lastName || ''}`.trim() : undefined,
        'email': updates.email,
        'phone': updates.phone,
        'text2': updates.company,
        'text3': updates.jobTitle,
        'text4': updates.description,
        ...updates.customFields
      });

      const mutation = `
        mutation {
          change_multiple_column_values (
            item_id: ${contactId}
            board_id: ${updates.boardId || this.config.settings?.contactsBoardId}
            column_values: "${columnValues}"
          ) {
            id
            name
            column_values {
              id
              value
              text
            }
          }
        }
      `;

      const result = await this.performGraphQLRequest(mutation);

      return {
        success: true,
        data: result.data?.change_multiple_column_values,
        metadata: {
          timestamp: new Date(),
          rateLimit: await this.getRateLimitInfo()
        }
      };
    } catch (error) {
      return this.handleError(error as any, 'Failed to update contact');
    }
  }

  async getContact(contactId: string): Promise<ConnectorResponse> {
    try {
      const query = `
        query {
          items (ids: [${contactId}]) {
            id
            name
            state
            column_values {
              id
              title
              value
              text
            }
            board {
              id
              name
            }
            group {
              id
              title
            }
            created_at
            updated_at
          }
        }
      `;

      const result = await this.performGraphQLRequest(query);

      return {
        success: true,
        data: result.data?.items?.[0],
        metadata: {
          timestamp: new Date(),
          rateLimit: await this.getRateLimitInfo()
        }
      };
    } catch (error) {
      return this.handleError(error as any, 'Failed to get contact');
    }
  }

  async searchContacts(query: string, options?: PaginatedRequest): Promise<ConnectorResponse> {
    try {
      const boardId = options?.filters?.boardId || this.config.settings?.contactsBoardId;
      if (!boardId) {
        throw new Error('Board ID is required for searching contacts');
      }

      const graphqlQuery = `
        query {
          boards (ids: [${boardId}]) {
            items (limit: ${options?.pageSize || 25}) {
              id
              name
              column_values {
                id
                title
                value
                text
              }
              created_at
              updated_at
            }
          }
        }
      `;

      const result = await this.performGraphQLRequest(graphqlQuery);
      const items = result.data?.boards?.[0]?.items || [];

      // Filter items based on query (simple text search)
      const filteredItems = items.filter((item: any) => 
        item.name.toLowerCase().includes(query.toLowerCase()) ||
        item.column_values.some((col: any) => 
          col.text && col.text.toLowerCase().includes(query.toLowerCase())
        )
      );

      return {
        success: true,
        data: filteredItems,
        metadata: {
          timestamp: new Date(),
          rateLimit: await this.getRateLimitInfo(),
          pagination: {
            page: options?.page || 1,
            pageSize: options?.pageSize || 25,
            total: filteredItems.length,
            hasNext: false
          }
        }
      };
    } catch (error) {
      return this.handleError(error as any, 'Failed to search contacts');
    }
  }

  async getContacts(options?: PaginatedRequest): Promise<ConnectorResponse> {
    try {
      const boardId = options?.filters?.boardId || this.config.settings?.contactsBoardId;
      if (!boardId) {
        throw new Error('Board ID is required for getting contacts');
      }

      const limit = Math.min(options?.pageSize || 25, 100); // Monday.com limit
      const page = options?.page || 1;

      const query = `
        query {
          boards (ids: [${boardId}]) {
            items (limit: ${limit}, page: ${page}) {
              id
              name
              state
              column_values {
                id
                title
                value
                text
              }
              group {
                id
                title
              }
              created_at
              updated_at
            }
          }
        }
      `;

      const result = await this.performGraphQLRequest(query);

      return {
        success: true,
        data: result.data?.boards?.[0]?.items || [],
        metadata: {
          timestamp: new Date(),
          rateLimit: await this.getRateLimitInfo(),
          pagination: {
            page,
            pageSize: limit,
            total: 0,
            hasNext: (result.data?.boards?.[0]?.items?.length || 0) === limit
          }
        }
      };
    } catch (error) {
      return this.handleError(error as any, 'Failed to get contacts');
    }
  }

  async deleteContact(contactId: string): Promise<ConnectorResponse> {
    try {
      const mutation = `
        mutation {
          delete_item (item_id: ${contactId}) {
            id
          }
        }
      `;

      const result = await this.performGraphQLRequest(mutation);

      return {
        success: true,
        data: result.data?.delete_item,
        metadata: {
          timestamp: new Date(),
          rateLimit: await this.getRateLimitInfo()
        }
      };
    } catch (error) {
      return this.handleError(error as any, 'Failed to delete contact');
    }
  }

  async createDeal(deal: any): Promise<ConnectorResponse> {
    try {
      const boardId = deal.boardId || this.config.settings?.dealsBoardId;
      if (!boardId) {
        throw new Error('Board ID is required for creating deals');
      }

      const columnValues = this.buildColumnValues({
        'numbers': deal.amount,
        'status': deal.stage || 'Prospecting',
        'date': deal.closeDate,
        'text': deal.description,
        'dropdown': deal.type,
        'text2': deal.source,
        ...deal.customFields
      });

      const mutation = `
        mutation {
          create_item (
            board_id: ${boardId}
            item_name: "${deal.name}"
            column_values: "${columnValues}"
          ) {
            id
            name
            column_values {
              id
              value
              text
            }
          }
        }
      `;

      const result = await this.performGraphQLRequest(mutation);

      return {
        success: true,
        data: result.data?.create_item,
        metadata: {
          timestamp: new Date(),
          rateLimit: await this.getRateLimitInfo()
        }
      };
    } catch (error) {
      return this.handleError(error as any, 'Failed to create deal');
    }
  }

  async updateDeal(dealId: string, updates: any): Promise<ConnectorResponse> {
    try {
      const columnValues = this.buildColumnValues({
        'numbers': updates.amount,
        'status': updates.stage,
        'date': updates.closeDate,
        'text': updates.description,
        'dropdown': updates.type,
        ...updates.customFields
      });

      const mutation = `
        mutation {
          change_multiple_column_values (
            item_id: ${dealId}
            board_id: ${updates.boardId || this.config.settings?.dealsBoardId}
            column_values: "${columnValues}"
          ) {
            id
            name
            column_values {
              id
              value
              text
            }
          }
        }
      `;

      const result = await this.performGraphQLRequest(mutation);

      return {
        success: true,
        data: result.data?.change_multiple_column_values,
        metadata: {
          timestamp: new Date(),
          rateLimit: await this.getRateLimitInfo()
        }
      };
    } catch (error) {
      return this.handleError(error as any, 'Failed to update deal');
    }
  }

  async getDeal(dealId: string): Promise<ConnectorResponse> {
    try {
      const query = `
        query {
          items (ids: [${dealId}]) {
            id
            name
            state
            column_values {
              id
              title
              value
              text
            }
            board {
              id
              name
            }
            group {
              id
              title
            }
            created_at
            updated_at
          }
        }
      `;

      const result = await this.performGraphQLRequest(query);

      return {
        success: true,
        data: result.data?.items?.[0],
        metadata: {
          timestamp: new Date(),
          rateLimit: await this.getRateLimitInfo()
        }
      };
    } catch (error) {
      return this.handleError(error as any, 'Failed to get deal');
    }
  }

  async getDeals(options?: PaginatedRequest): Promise<ConnectorResponse> {
    try {
      const boardId = options?.filters?.boardId || this.config.settings?.dealsBoardId;
      if (!boardId) {
        throw new Error('Board ID is required for getting deals');
      }

      const limit = Math.min(options?.pageSize || 25, 100);
      const page = options?.page || 1;

      const query = `
        query {
          boards (ids: [${boardId}]) {
            items (limit: ${limit}, page: ${page}) {
              id
              name
              state
              column_values {
                id
                title
                value
                text
              }
              group {
                id
                title
              }
              created_at
              updated_at
            }
          }
        }
      `;

      const result = await this.performGraphQLRequest(query);

      return {
        success: true,
        data: result.data?.boards?.[0]?.items || [],
        metadata: {
          timestamp: new Date(),
          rateLimit: await this.getRateLimitInfo(),
          pagination: {
            page,
            pageSize: limit,
            total: 0,
            hasNext: (result.data?.boards?.[0]?.items?.length || 0) === limit
          }
        }
      };
    } catch (error) {
      return this.handleError(error as any, 'Failed to get deals');
    }
  }

  async deleteDeal(dealId: string): Promise<ConnectorResponse> {
    try {
      const mutation = `
        mutation {
          delete_item (item_id: ${dealId}) {
            id
          }
        }
      `;

      const result = await this.performGraphQLRequest(mutation);

      return {
        success: true,
        data: result.data?.delete_item,
        metadata: {
          timestamp: new Date(),
          rateLimit: await this.getRateLimitInfo()
        }
      };
    } catch (error) {
      return this.handleError(error as any, 'Failed to delete deal');
    }
  }

  async createCompany(company: any): Promise<ConnectorResponse> {
    try {
      const boardId = company.boardId || this.config.settings?.companiesBoardId;
      if (!boardId) {
        throw new Error('Board ID is required for creating companies');
      }

      const columnValues = this.buildColumnValues({
        'link': company.website,
        'phone': company.phone,
        'text': company.industry,
        'dropdown': company.type,
        'numbers': company.numberOfEmployees,
        'numbers2': company.annualRevenue,
        'long_text': company.description,
        ...company.customFields
      });

      const mutation = `
        mutation {
          create_item (
            board_id: ${boardId}
            item_name: "${company.name}"
            column_values: "${columnValues}"
          ) {
            id
            name
            column_values {
              id
              value
              text
            }
          }
        }
      `;

      const result = await this.performGraphQLRequest(mutation);

      return {
        success: true,
        data: result.data?.create_item,
        metadata: {
          timestamp: new Date(),
          rateLimit: await this.getRateLimitInfo()
        }
      };
    } catch (error) {
      return this.handleError(error as any, 'Failed to create company');
    }
  }

  async updateCompany(companyId: string, updates: any): Promise<ConnectorResponse> {
    try {
      const columnValues = this.buildColumnValues({
        'link': updates.website,
        'phone': updates.phone,
        'text': updates.industry,
        'dropdown': updates.type,
        'numbers': updates.numberOfEmployees,
        'numbers2': updates.annualRevenue,
        'long_text': updates.description,
        ...updates.customFields
      });

      const mutation = `
        mutation {
          change_multiple_column_values (
            item_id: ${companyId}
            board_id: ${updates.boardId || this.config.settings?.companiesBoardId}
            column_values: "${columnValues}"
          ) {
            id
            name
            column_values {
              id
              value
              text
            }
          }
        }
      `;

      const result = await this.performGraphQLRequest(mutation);

      return {
        success: true,
        data: result.data?.change_multiple_column_values,
        metadata: {
          timestamp: new Date(),
          rateLimit: await this.getRateLimitInfo()
        }
      };
    } catch (error) {
      return this.handleError(error as any, 'Failed to update company');
    }
  }

  async getCompany(companyId: string): Promise<ConnectorResponse> {
    try {
      const query = `
        query {
          items (ids: [${companyId}]) {
            id
            name
            state
            column_values {
              id
              title
              value
              text
            }
            board {
              id
              name
            }
            group {
              id
              title
            }
            created_at
            updated_at
          }
        }
      `;

      const result = await this.performGraphQLRequest(query);

      return {
        success: true,
        data: result.data?.items?.[0],
        metadata: {
          timestamp: new Date(),
          rateLimit: await this.getRateLimitInfo()
        }
      };
    } catch (error) {
      return this.handleError(error as any, 'Failed to get company');
    }
  }

  async getCompanies(options?: PaginatedRequest): Promise<ConnectorResponse> {
    try {
      const boardId = options?.filters?.boardId || this.config.settings?.companiesBoardId;
      if (!boardId) {
        throw new Error('Board ID is required for getting companies');
      }

      const limit = Math.min(options?.pageSize || 25, 100);
      const page = options?.page || 1;

      const query = `
        query {
          boards (ids: [${boardId}]) {
            items (limit: ${limit}, page: ${page}) {
              id
              name
              state
              column_values {
                id
                title
                value
                text
              }
              group {
                id
                title
              }
              created_at
              updated_at
            }
          }
        }
      `;

      const result = await this.performGraphQLRequest(query);

      return {
        success: true,
        data: result.data?.boards?.[0]?.items || [],
        metadata: {
          timestamp: new Date(),
          rateLimit: await this.getRateLimitInfo(),
          pagination: {
            page,
            pageSize: limit,
            total: 0,
            hasNext: (result.data?.boards?.[0]?.items?.length || 0) === limit
          }
        }
      };
    } catch (error) {
      return this.handleError(error as any, 'Failed to get companies');
    }
  }

  async createActivity(activity: any): Promise<ConnectorResponse> {
    try {
      const boardId = activity.boardId || this.config.settings?.activitiesBoardId;
      if (!boardId) {
        throw new Error('Board ID is required for creating activities');
      }

      const columnValues = this.buildColumnValues({
        'date': activity.dueDate,
        'status': activity.status || 'Not Started',
        'dropdown': activity.priority || 'Medium',
        'long_text': activity.description,
        'text': activity.type,
        ...activity.customFields
      });

      const mutation = `
        mutation {
          create_item (
            board_id: ${boardId}
            item_name: "${activity.subject}"
            column_values: "${columnValues}"
          ) {
            id
            name
            column_values {
              id
              value
              text
            }
          }
        }
      `;

      const result = await this.performGraphQLRequest(mutation);

      return {
        success: true,
        data: result.data?.create_item,
        metadata: {
          timestamp: new Date(),
          rateLimit: await this.getRateLimitInfo()
        }
      };
    } catch (error) {
      return this.handleError(error as any, 'Failed to create activity');
    }
  }

  async updateActivity(activityId: string, updates: any): Promise<ConnectorResponse> {
    try {
      const columnValues = this.buildColumnValues({
        'date': updates.dueDate,
        'status': updates.status,
        'dropdown': updates.priority,
        'long_text': updates.description,
        ...updates.customFields
      });

      const mutation = `
        mutation {
          change_multiple_column_values (
            item_id: ${activityId}
            board_id: ${updates.boardId || this.config.settings?.activitiesBoardId}
            column_values: "${columnValues}"
          ) {
            id
            name
            column_values {
              id
              value
              text
            }
          }
        }
      `;

      const result = await this.performGraphQLRequest(mutation);

      return {
        success: true,
        data: result.data?.change_multiple_column_values,
        metadata: {
          timestamp: new Date(),
          rateLimit: await this.getRateLimitInfo()
        }
      };
    } catch (error) {
      return this.handleError(error as any, 'Failed to update activity');
    }
  }

  async getActivities(options?: PaginatedRequest): Promise<ConnectorResponse> {
    try {
      const boardId = options?.filters?.boardId || this.config.settings?.activitiesBoardId;
      if (!boardId) {
        throw new Error('Board ID is required for getting activities');
      }

      const limit = Math.min(options?.pageSize || 25, 100);
      const page = options?.page || 1;

      const query = `
        query {
          boards (ids: [${boardId}]) {
            items (limit: ${limit}, page: ${page}) {
              id
              name
              state
              column_values {
                id
                title
                value
                text
              }
              group {
                id
                title
              }
              created_at
              updated_at
            }
          }
        }
      `;

      const result = await this.performGraphQLRequest(query);

      return {
        success: true,
        data: result.data?.boards?.[0]?.items || [],
        metadata: {
          timestamp: new Date(),
          rateLimit: await this.getRateLimitInfo(),
          pagination: {
            page,
            pageSize: limit,
            total: 0,
            hasNext: (result.data?.boards?.[0]?.items?.length || 0) === limit
          }
        }
      };
    } catch (error) {
      return this.handleError(error as any, 'Failed to get activities');
    }
  }

  async bulkOperation<T>(operation: BulkOperation<T>): Promise<BulkOperationResult<T>> {
    try {
      // Monday.com doesn't have native bulk operations for items, so we process individually
      const successful: T[] = [];
      const failed: Array<{ item: T; error: any }> = [];

      for (const item of operation.items) {
        try {
          let result;
          switch (operation.operation) {
            case 'create':
              result = await this.createContact(item); // Assume contacts by default
              break;
            case 'update':
              result = await this.updateContact((item as any).id, item);
              break;
            case 'delete':
              result = await this.deleteContact((item as any).id);
              break;
          }

          if (result.success) {
            successful.push(item);
          } else {
            failed.push({
              item,
              error: result.error || { code: 'UNKNOWN_ERROR', error: undefined }
            });
          }
        } catch (error) {
          if (operation.continueOnError) {
            failed.push({
              item,
              error: { code: 'BULK_OPERATION_FAILED', message: error.message }
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
      this.logger.error('Bulk operation failed:', error);
      throw error;
    }
  }

  async getCustomFields(objectType: string): Promise<ConnectorResponse> {
    try {
      const boardId = this.getBoardIdForObjectType(objectType);
      if (!boardId) {
        throw new Error(`Board ID not configured for object type: ${objectType}`);
      }

      const query = `
        query {
          boards (ids: [${boardId}]) {
            columns {
              id
              title
              type
              settings_str
            }
          }
        }
      `;

      const result = await this.performGraphQLRequest(query);

      return {
        success: true,
        data: result.data?.boards?.[0]?.columns || [],
        metadata: {
          timestamp: new Date(),
          rateLimit: await this.getRateLimitInfo()
        }
      };
    } catch (error) {
      return this.handleError(error as any, 'Failed to get custom fields');
    }
  }

  async globalSearch(query: string, objectTypes?: string[]): Promise<ConnectorResponse> {
    try {
      const results: any[] = [];
      const boardIds = this.getBoardIdsForSearch(objectTypes);

      for (const boardId of boardIds) {
        try {
          const graphqlQuery = `
            query {
              boards (ids: [${boardId}]) {
                name
                items (limit: 25) {
                  id
                  name
                  column_values {
                    id
                    title
                    value
                    text
                  }
                }
              }
            }
          `;

          const result = await this.performGraphQLRequest(graphqlQuery);
          const board = result.data?.boards?.[0];
          
          if (board?.items) {
            const filteredItems = board.items.filter((item: any) => 
              item.name.toLowerCase().includes(query.toLowerCase()) ||
              item.column_values.some((col: any) => 
                col.text && col.text.toLowerCase().includes(query.toLowerCase())
              )
            );

            results.push(...filteredItems.map((item: any) => ({ 
              ...item, 
              boardName: board.name,
              boardId 
            })));
          }
        } catch (error) {
          this.logger.warn(`Failed to search in board ${boardId}:`, error);
        }
      }

      return {
        success: true,
        data: results,
        metadata: {
          timestamp: new Date(),
          rateLimit: await this.getRateLimitInfo()
        }
      };
    } catch (error) {
      return this.handleError(error as any, 'Failed to perform global search');
    }
  }

  // Monday.com-specific methods
  async createItem(boardId: string, item: MondayItem): Promise<ConnectorResponse> {
    try {
      const columnValues = item.column_values ? 
        this.buildColumnValuesFromArray(item.column_values) : '{}';

      const mutation = `
        mutation {
          create_item (
            board_id: ${boardId}
            item_name: "${item.name}"
            column_values: "${columnValues}"
          ) {
            id
            name
            column_values {
              id
              value
              text
            }
          }
        }
      `;

      const result = await this.performGraphQLRequest(mutation);

      return {
        success: true,
        data: result.data?.create_item,
        metadata: {
          timestamp: new Date(),
          rateLimit: await this.getRateLimitInfo()
        }
      };
    } catch (error) {
      return this.handleError(error as any, 'Failed to create item');
    }
  }

  async updateItem(itemId: string, updates: any): Promise<ConnectorResponse> {
    try {
      const columnValues = this.buildColumnValues(updates.columnValues || {});

      const mutation = `
        mutation {
          change_multiple_column_values (
            item_id: ${itemId}
            board_id: ${updates.boardId}
            column_values: "${columnValues}"
          ) {
            id
            name
            column_values {
              id
              value
              text
            }
          }
        }
      `;

      const result = await this.performGraphQLRequest(mutation);

      return {
        success: true,
        data: result.data?.change_multiple_column_values,
        metadata: {
          timestamp: new Date(),
          rateLimit: await this.getRateLimitInfo()
        }
      };
    } catch (error) {
      return this.handleError(error as any, 'Failed to update item');
    }
  }

  async createBoard(board: Partial<MondayBoard>): Promise<ConnectorResponse> {
    try {
      const mutation = `
        mutation {
          create_board (
            board_name: "${board.name}"
            board_kind: public
          ) {
            id
            name
          }
        }
      `;

      const result = await this.performGraphQLRequest(mutation);

      return {
        success: true,
        data: result.data?.create_board,
        metadata: {
          timestamp: new Date(),
          rateLimit: await this.getRateLimitInfo()
        }
      };
    } catch (error) {
      return this.handleError(error as any, 'Failed to create board');
    }
  }

  async addColumn(boardId: string, column: any): Promise<ConnectorResponse> {
    try {
      const mutation = `
        mutation {
          create_column (
            board_id: ${boardId}
            title: "${column.title}"
            column_type: ${column.type}
          ) {
            id
            title
            type
          }
        }
      `;

      const result = await this.performGraphQLRequest(mutation);

      return {
        success: true,
        data: result.data?.create_column,
        metadata: {
          timestamp: new Date(),
          rateLimit: await this.getRateLimitInfo()
        }
      };
    } catch (error) {
      return this.handleError(error as any, 'Failed to add column');
    }
  }

  async getBoards(options?: PaginatedRequest): Promise<ConnectorResponse> {
    try {
      const limit = Math.min(options?.pageSize || 25, 100);
      const page = options?.page || 1;

      const query = `
        query {
          boards (limit: ${limit}, page: ${page}) {
            id
            name
            state
            description
            columns {
              id
              title
              type
            }
            groups {
              id
              title
              color
            }
            created_at
            updated_at
          }
        }
      `;

      const result = await this.performGraphQLRequest(query);

      return {
        success: true,
        data: result.data?.boards || [],
        metadata: {
          timestamp: new Date(),
          rateLimit: await this.getRateLimitInfo(),
          pagination: {
            page,
            pageSize: limit,
            total: 0,
            hasNext: (result.data?.boards?.length || 0) === limit
          }
        }
      };
    } catch (error) {
      return this.handleError(error as any, 'Failed to get boards');
    }
  }

  async createUpdate(itemId: string, update: any): Promise<ConnectorResponse> {
    try {
      const mutation = `
        mutation {
          create_update (
            item_id: ${itemId}
            body: "${update.body}"
          ) {
            id
            body
            created_at
          }
        }
      `;

      const result = await this.performGraphQLRequest(mutation);

      return {
        success: true,
        data: result.data?.create_update,
        metadata: {
          timestamp: new Date(),
          rateLimit: await this.getRateLimitInfo()
        }
      };
    } catch (error) {
      return this.handleError(error as any, 'Failed to create update');
    }
  }

  async deleteItem(itemId: string): Promise<ConnectorResponse> {
    try {
      const mutation = `
        mutation {
          delete_item (item_id: ${itemId}) {
            id
          }
        }
      `;

      const result = await this.performGraphQLRequest(mutation);

      return {
        success: true,
        data: {
          id: result.data?.delete_item?.id,
          deleted: true
        },
        metadata: {
          timestamp: new Date(),
          rateLimit: await this.getRateLimitInfo()
        }
      };
    } catch (error) {
      return this.handleError(error as any, 'Failed to delete item');
    }
  }

  async moveItem(itemId: string, groupId: string): Promise<ConnectorResponse> {
    try {
      const mutation = `
        mutation {
          move_item_to_group (item_id: ${itemId}, group_id: "${groupId}") {
            id
            name
            group {
              id
              title
            }
          }
        }
      `;

      const result = await this.performGraphQLRequest(mutation);

      return {
        success: true,
        data: result.data?.move_item_to_group,
        metadata: {
          timestamp: new Date(),
          rateLimit: await this.getRateLimitInfo()
        }
      };
    } catch (error) {
      return this.handleError(error as any, 'Failed to move item');
    }
  }

  async getItem(itemId: string): Promise<ConnectorResponse> {
    try {
      const query = `
        query {
          items (ids: [${itemId}]) {
            id
            name
            state
            column_values {
              id
              title
              value
              text
            }
            board {
              id
              name
            }
            group {
              id
              title
            }
            created_at
            updated_at
          }
        }
      `;

      const result = await this.performGraphQLRequest(query);

      return {
        success: true,
        data: result.data?.items?.[0],
        metadata: {
          timestamp: new Date(),
          rateLimit: await this.getRateLimitInfo()
        }
      };
    } catch (error) {
      return this.handleError(error as any, 'Failed to get item');
    }
  }

  async getColumns(boardId: string): Promise<ConnectorResponse> {
    try {
      const query = `
        query {
          boards (ids: [${boardId}]) {
            columns {
              id
              title
              type
              settings_str
            }
          }
        }
      `;

      const result = await this.performGraphQLRequest(query);

      return {
        success: true,
        data: {
          columns: result.data?.boards?.[0]?.columns || []
        },
        metadata: {
          timestamp: new Date(),
          rateLimit: await this.getRateLimitInfo()
        }
      };
    } catch (error) {
      return this.handleError(error as any, 'Failed to get columns');
    }
  }

  async getGroups(boardId: string): Promise<ConnectorResponse> {
    try {
      const query = `
        query {
          boards (ids: [${boardId}]) {
            groups {
              id
              title
              color
              position
            }
          }
        }
      `;

      const result = await this.performGraphQLRequest(query);

      return {
        success: true,
        data: {
          groups: result.data?.boards?.[0]?.groups || []
        },
        metadata: {
          timestamp: new Date(),
          rateLimit: await this.getRateLimitInfo()
        }
      };
    } catch (error) {
      return this.handleError(error as any, 'Failed to get groups');
    }
  }

  async changeColumnValue(boardId: string, itemId: string, columnId: string, value: any): Promise<ConnectorResponse> {
    try {
      const formattedValue = JSON.stringify(value).replace(/"/g, '\\"');

      const mutation = `
        mutation {
          change_column_value (
            board_id: ${boardId}
            item_id: ${itemId}
            column_id: "${columnId}"
            value: "${formattedValue}"
          ) {
            id
            name
            column_values {
              id
              value
              text
            }
          }
        }
      `;

      const result = await this.performGraphQLRequest(mutation);

      return {
        success: true,
        data: result.data?.change_column_value,
        metadata: {
          timestamp: new Date(),
          rateLimit: await this.getRateLimitInfo()
        }
      };
    } catch (error) {
      return this.handleError(error as any, 'Failed to change column value');
    }
  }

  async changeMultipleColumns(boardId: string, itemId: string, columnValues: any): Promise<ConnectorResponse> {
    try {
      const formattedValues = this.buildColumnValues(columnValues);

      const mutation = `
        mutation {
          change_multiple_column_values (
            board_id: ${boardId}
            item_id: ${itemId}
            column_values: "${formattedValues}"
          ) {
            id
            name
            column_values {
              id
              value
              text
            }
          }
        }
      `;

      const result = await this.performGraphQLRequest(mutation);

      return {
        success: true,
        data: result.data?.change_multiple_column_values,
        metadata: {
          timestamp: new Date(),
          rateLimit: await this.getRateLimitInfo()
        }
      };
    } catch (error) {
      return this.handleError(error as any, 'Failed to change multiple column values');
    }
  }

  private async performGraphQLRequest(query: string, variables?: any): Promise<any> {
    return this.performRequest({
      method: 'POST',
      endpoint: '',
      body: {
        query,
        variables
      }
    });
  }

  protected async getRateLimitInfo(): Promise<{ remaining: number; reset: Date } | undefined> {
    // Monday.com rate limit info would be extracted from response headers
    // This would need to be implemented based on actual API responses
    return undefined;
  }

  private getAuthHeaders(): Record<string, string> {
    return {
      'Authorization': this.config.credentials.apiKey || ''
    };
  }

  private buildColumnValues(values: Record<string, any>): string {
    const columnValues: Record<string, any> = {};
    
    Object.entries(values).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        columnValues[key] = this.formatColumnValue(value);
      }
    });

    return JSON.stringify(columnValues).replace(/"/g, '\\"');
  }

  private buildColumnValuesFromArray(columnValues: Array<{ id: string; value: any }>): string {
    const values: Record<string, any> = {};
    
    columnValues.forEach(({ id, value }) => {
      values[id] = this.formatColumnValue(value);
    });

    return JSON.stringify(values).replace(/"/g, '\\"');
  }

  private formatColumnValue(value: any): any {
    if (typeof value === 'string') {
      return value;
    } else if (typeof value === 'number') {
      return value.toString();
    } else if (typeof value === 'boolean') {
      return { checked: value.toString() };
    } else if (value instanceof Date) {
      return value.toISOString().split('T')[0];
    }
    return value;
  }

  private getBoardIdForObjectType(objectType: string): string | undefined {
    const mapping: Record<string, string> = {
      contact: this.config.settings?.contactsBoardId,
      deal: this.config.settings?.dealsBoardId,
      company: this.config.settings?.companiesBoardId,
      activity: this.config.settings?.activitiesBoardId
    };
    return mapping[objectType.toLowerCase()];
  }

  private getBoardIdsForSearch(objectTypes?: string[]): string[] {
    const types = objectTypes || ['contact', 'deal', 'company', 'activity'];
    const boardIds: string[] = [];
    
    types.forEach(type => {
      const boardId = this.getBoardIdForObjectType(type);
      if (boardId) {
        boardIds.push(boardId);
      }
    });

    return boardIds;
  }

  private getActions(): ConnectorAction[] {
    return [
      {
        id: 'create_item',
        name: 'Create Item',
        description: 'Create a new item in a Monday.com board',
        inputSchema: {
          boardId: { type: 'string', required: true, description: 'Board ID' },
          item: { type: 'object', required: true, description: 'Item data including name and column values' }
        },
        outputSchema: {
          id: { type: 'string', description: 'Created item ID' },
          success: { type: 'boolean', description: 'Whether creation was successful' }
        }
      },
      {
        id: 'update_item',
        name: 'Update Item',
        description: 'Update an existing item in Monday.com',
        inputSchema: {
          itemId: { type: 'string', required: true, description: 'Item ID' },
          updates: { type: 'object', required: true, description: 'Updates including boardId and columnValues' }
        },
        outputSchema: {
          success: { type: 'boolean', description: 'Whether update was successful' }
        }
      },
      {
        id: 'create_board',
        name: 'Create Board',
        description: 'Create a new board in Monday.com',
        inputSchema: {
          board: { type: 'object', required: true, description: 'Board configuration including name' }
        },
        outputSchema: {
          id: { type: 'string', description: 'Created board ID' }
        }
      },
      {
        id: 'add_column',
        name: 'Add Column',
        description: 'Add a new column to a board',
        inputSchema: {
          boardId: { type: 'string', required: true, description: 'Board ID' },
          column: { type: 'object', required: true, description: 'Column configuration including title and type' }
        },
        outputSchema: {
          id: { type: 'string', description: 'Created column ID' }
        }
      },
      {
        id: 'get_boards',
        name: 'Get Boards',
        description: 'Retrieve boards from Monday.com',
        inputSchema: {
          options: { type: 'object', description: 'Pagination options' }
        },
        outputSchema: {
          boards: { type: 'array', description: 'List of boards' }
        }
      },
      {
        id: 'create_update',
        name: 'Create Update',
        description: 'Create an update/comment on an item',
        inputSchema: {
          itemId: { type: 'string', required: true, description: 'Item ID' },
          update: { type: 'object', required: true, description: 'Update content including body' }
        },
        outputSchema: {
          id: { type: 'string', description: 'Created update ID' }
        }
      }
    ];
  }

  private getTriggers(): ConnectorTrigger[] {
    return [
      {
        id: 'item_created',
        name: 'Item Created',
        description: 'Triggered when a new item is created',
        eventType: 'create_pulse',
        outputSchema: {
          item: { type: 'object', description: 'Created item information' },
          board: { type: 'object', description: 'Board information' }
        },
        webhookRequired: true
      },
      {
        id: 'item_updated',
        name: 'Item Updated',
        description: 'Triggered when an item is updated',
        eventType: 'change_column_value',
        outputSchema: {
          item: { type: 'object', description: 'Updated item information' },
          previousValue: { type: 'object', description: 'Previous column value' },
          newValue: { type: 'object', description: 'New column value' }
        },
        webhookRequired: true
      },
      {
        id: 'status_changed',
        name: 'Status Changed',
        description: 'Triggered when an item status is changed',
        eventType: 'change_status_column_value',
        outputSchema: {
          item: { type: 'object', description: 'Item information' },
          previousStatus: { type: 'string', description: 'Previous status' },
          newStatus: { type: 'string', description: 'New status' }
        },
        webhookRequired: true
      },
      {
        id: 'board_created',
        name: 'Board Created',
        description: 'Triggered when a new board is created',
        eventType: 'create_board',
        outputSchema: {
          board: { type: 'object', description: 'Created board information' }
        },
        webhookRequired: true
      }
    ];
  }
}