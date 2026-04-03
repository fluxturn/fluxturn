import { Injectable, Logger } from '@nestjs/common';
import { BaseConnector } from '../../base/base.connector';
import {
  ConnectorMetadata,
  ConnectorType,
  ConnectorCategory,
  ConnectorRequest,
  ConnectorResponse,
  AuthType,
} from '../../types';

@Injectable()
export class ElasticsearchConnector extends BaseConnector {
  protected readonly logger = new Logger(ElasticsearchConnector.name);
  private baseUrl: string;

  getMetadata(): ConnectorMetadata {
    return {
      name: 'Elasticsearch',
      description: 'Consume the Elasticsearch API - index and search documents',
      version: '1.0.0',
      category: ConnectorCategory.DATABASE,
      type: ConnectorType.ELASTICSEARCH,
      authType: AuthType.BASIC_AUTH,
      actions: [],
      triggers: [],
      webhookSupport: false,
    };
  }

  protected async initializeConnection(): Promise<void> {
    this.baseUrl = this.config.credentials.baseUrl as string;
    this.logger.log('Elasticsearch connector initialized');
    // Note: Full implementation can use @elastic/elasticsearch library
    // npm install @elastic/elasticsearch
  }

  protected async performConnectionTest(): Promise<boolean> {
    try {
      // Test connection by pinging Elasticsearch
      const response = await this.makeRequest('GET', `${this.baseUrl}/`);
      return !!response;
    } catch (error) {
      this.logger.error('Elasticsearch connection test failed', error);
      return false;
    }
  }

  protected async performHealthCheck(): Promise<void> {
    // Check Elasticsearch cluster health
  }

  protected async performRequest(request: ConnectorRequest): Promise<any> {
    const url = `${this.baseUrl}${request.endpoint}`;
    return await this.makeRequest(request.method, url, request.body);
  }

  protected async performAction(actionId: string, input: any): Promise<any> {
    switch (actionId) {
      // Document operations
      case 'document_create':
        return await this.createDocument(input);
      case 'document_get':
        return await this.getDocument(input);
      case 'document_get_all':
        return await this.searchDocuments(input);
      case 'document_update':
        return await this.updateDocument(input);
      case 'document_delete':
        return await this.deleteDocument(input);

      // Index operations
      case 'index_create':
        return await this.createIndex(input);
      case 'index_get':
        return await this.getIndex(input);
      case 'index_get_all':
        return await this.listIndices(input);
      case 'index_delete':
        return await this.deleteIndex(input);

      default:
        throw new Error(`Unknown action: ${actionId}`);
    }
  }

  protected async cleanup(): Promise<void> {
    this.logger.log('Elasticsearch connector cleanup completed');
  }

  private async makeRequest(method: string, url: string, body?: any): Promise<any> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };

    // Add basic auth if provided
    if (this.config.credentials.username && this.config.credentials.password) {
      const auth = Buffer.from(
        `${this.config.credentials.username}:${this.config.credentials.password}`
      ).toString('base64');
      headers['Authorization'] = `Basic ${auth}`;
    }

    const fetchOptions: RequestInit = {
      method,
      headers,
    };

    if (body) {
      fetchOptions.body = JSON.stringify(body);
    }

    const response = await fetch(url, fetchOptions);

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Elasticsearch request failed: ${response.status} - ${errorText}`);
    }

    return await response.json();
  }

  // Document Operations
  private async createDocument(input: any): Promise<ConnectorResponse> {
    try {
      const {
        indexId,
        documentId,
        dataToSend = 'autoMapInputData',
        fieldsToSend,
      } = input;

      let body: any = {};

      if (dataToSend === 'defineBelow' && fieldsToSend) {
        body = JSON.parse(fieldsToSend);
      } else {
        body = input.data || {};
      }

      const endpoint = documentId
        ? `/${indexId}/_doc/${documentId}`
        : `/${indexId}/_doc`;

      const method = documentId ? 'PUT' : 'POST';

      const responseData = await this.makeRequest(
        method,
        `${this.baseUrl}${endpoint}`,
        body
      );

      return {
        success: true,
        data: responseData,
      };
    } catch (error) {
      return {
        success: false,
        error: {
          code: 'DOCUMENT_CREATE_FAILED',
          message: error.message,
        },
      };
    }
  }

  private async getDocument(input: any): Promise<ConnectorResponse> {
    try {
      const { indexId, documentId, simple = false } = input;

      const endpoint = `/${indexId}/_doc/${documentId}`;
      const responseData = await this.makeRequest('GET', `${this.baseUrl}${endpoint}`);

      let result = responseData;
      if (simple) {
        result = {
          _id: responseData._id,
          ...responseData._source,
        };
      }

      return {
        success: true,
        data: result,
      };
    } catch (error) {
      return {
        success: false,
        error: {
          code: 'DOCUMENT_GET_FAILED',
          message: error.message,
        },
      };
    }
  }

  private async searchDocuments(input: any): Promise<ConnectorResponse> {
    try {
      const {
        indexId,
        returnAll = false,
        limit = 10,
        query,
        simple = false,
      } = input;

      let body: any = {};
      if (query) {
        body = JSON.parse(query);
      }

      const size = returnAll ? 10000 : limit;
      const endpoint = `/${indexId}/_search?size=${size}`;

      const responseData = await this.makeRequest(
        'POST',
        `${this.baseUrl}${endpoint}`,
        body
      );

      let hits = responseData.hits?.hits || [];

      if (simple) {
        hits = hits.map((hit: any) => ({
          _id: hit._id,
          ...hit._source,
        }));
      }

      return {
        success: true,
        data: { hits },
      };
    } catch (error) {
      return {
        success: false,
        error: {
          code: 'DOCUMENT_SEARCH_FAILED',
          message: error.message,
        },
      };
    }
  }

  private async updateDocument(input: any): Promise<ConnectorResponse> {
    try {
      const {
        indexId,
        documentId,
        dataToSend = 'autoMapInputData',
        fieldsToSend,
      } = input;

      let doc: any = {};

      if (dataToSend === 'defineBelow' && fieldsToSend) {
        doc = JSON.parse(fieldsToSend);
      } else {
        doc = input.data || {};
      }

      const body = { doc };
      const endpoint = `/${indexId}/_update/${documentId}`;

      const responseData = await this.makeRequest(
        'POST',
        `${this.baseUrl}${endpoint}`,
        body
      );

      return {
        success: true,
        data: responseData,
      };
    } catch (error) {
      return {
        success: false,
        error: {
          code: 'DOCUMENT_UPDATE_FAILED',
          message: error.message,
        },
      };
    }
  }

  private async deleteDocument(input: any): Promise<ConnectorResponse> {
    try {
      const { indexId, documentId } = input;

      const endpoint = `/${indexId}/_doc/${documentId}`;
      const responseData = await this.makeRequest('DELETE', `${this.baseUrl}${endpoint}`);

      return {
        success: true,
        data: responseData,
      };
    } catch (error) {
      return {
        success: false,
        error: {
          code: 'DOCUMENT_DELETE_FAILED',
          message: error.message,
        },
      };
    }
  }

  // Index Operations
  private async createIndex(input: any): Promise<ConnectorResponse> {
    try {
      const { indexId, mappings, settings, aliases } = input;

      let body: any = {};

      if (mappings) {
        body.mappings = JSON.parse(mappings);
      }
      if (settings) {
        body.settings = JSON.parse(settings);
      }
      if (aliases) {
        body.aliases = JSON.parse(aliases);
      }

      const endpoint = `/${indexId}`;
      const responseData = await this.makeRequest('PUT', `${this.baseUrl}${endpoint}`, body);

      return {
        success: true,
        data: {
          id: indexId,
          ...responseData,
        },
      };
    } catch (error) {
      return {
        success: false,
        error: {
          code: 'INDEX_CREATE_FAILED',
          message: error.message,
        },
      };
    }
  }

  private async getIndex(input: any): Promise<ConnectorResponse> {
    try {
      const { indexId } = input;

      const endpoint = `/${indexId}`;
      const responseData = await this.makeRequest('GET', `${this.baseUrl}${endpoint}`);

      return {
        success: true,
        data: {
          id: indexId,
          ...responseData[indexId],
        },
      };
    } catch (error) {
      return {
        success: false,
        error: {
          code: 'INDEX_GET_FAILED',
          message: error.message,
        },
      };
    }
  }

  private async listIndices(input: any): Promise<ConnectorResponse> {
    try {
      const { returnAll = false, limit = 10 } = input;

      const endpoint = '/_aliases';
      const responseData = await this.makeRequest('GET', `${this.baseUrl}${endpoint}`);

      let indices = Object.keys(responseData).map((index) => ({
        indexId: index,
      }));

      if (!returnAll) {
        indices = indices.slice(0, limit);
      }

      return {
        success: true,
        data: { indices },
      };
    } catch (error) {
      return {
        success: false,
        error: {
          code: 'INDEX_LIST_FAILED',
          message: error.message,
        },
      };
    }
  }

  private async deleteIndex(input: any): Promise<ConnectorResponse> {
    try {
      const { indexId } = input;

      const endpoint = `/${indexId}`;
      const responseData = await this.makeRequest('DELETE', `${this.baseUrl}${endpoint}`);

      return {
        success: true,
        data: { success: true, ...responseData },
      };
    } catch (error) {
      return {
        success: false,
        error: {
          code: 'INDEX_DELETE_FAILED',
          message: error.message,
        },
      };
    }
  }
}
