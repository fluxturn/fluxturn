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
export class GraphqlConnector extends BaseConnector {
  protected readonly logger = new Logger(GraphqlConnector.name);

  getMetadata(): ConnectorMetadata {
    return {
      name: 'GraphQL',
      description: 'Makes a GraphQL request and returns the received data',
      version: '1.0.0',
      category: ConnectorCategory.INFRASTRUCTURE,
      type: ConnectorType.GRAPHQL,
      authType: AuthType.CUSTOM,
      actions: [],
      triggers: [],
      webhookSupport: false,
    };
  }

  protected async initializeConnection(): Promise<void> {
    this.logger.log('GraphQL connector initialized');
  }

  protected async performConnectionTest(): Promise<boolean> {
    // GraphQL connectors are stateless, no persistent connection
    return true;
  }

  protected async performHealthCheck(): Promise<void> {
    // No persistent connection to check
  }

  protected async performRequest(request: ConnectorRequest): Promise<any> {
    // GraphQL requests are handled in performAction
    throw new Error('Use performAction for GraphQL requests');
  }

  protected async performAction(actionId: string, input: any): Promise<any> {
    switch (actionId) {
      case 'execute_query':
        return await this.executeQuery(input);
      default:
        throw new Error(`Unknown action: ${actionId}`);
    }
  }

  protected async cleanup(): Promise<void> {
    this.logger.log('GraphQL connector cleanup completed');
  }

  private async executeQuery(input: any): Promise<ConnectorResponse> {
    try {
      const {
        endpoint,
        requestMethod = 'POST',
        requestFormat = 'json',
        query,
        variables,
        operationName,
        allowUnauthorizedCerts = false,
        responseFormat = 'json',
        headers = []
      } = input;

      // Build headers
      const requestHeaders: Record<string, string> = {
        'Content-Type': `application/${requestFormat}`,
      };

      // Add custom headers
      if (Array.isArray(headers)) {
        headers.forEach((header: any) => {
          if (header.name && header.value) {
            requestHeaders[header.name] = header.value;
          }
        });
      }

      // Build request body or query params
      let body: any;
      let url = endpoint;

      if (requestMethod === 'GET') {
        // For GET requests, add query as URL parameter
        const params = new URLSearchParams({ query });
        url = `${endpoint}?${params.toString()}`;
      } else {
        // For POST requests, use appropriate format
        if (requestFormat === 'json') {
          // JSON format with query, variables, and operationName
          let parsedVariables = {};
          if (variables) {
            try {
              parsedVariables = typeof variables === 'string'
                ? JSON.parse(variables)
                : variables;
            } catch (error) {
              return {
                success: false,
                error: {
                  code: 'INVALID_VARIABLES',
                  message: `Invalid variables JSON: ${error.message}`,
                },
              };
            }
          }

          body = JSON.stringify({
            query,
            variables: parsedVariables,
            operationName: operationName || null,
          });
        } else {
          // GraphQL raw format
          body = query;
        }
      }

      // Make request
      const fetchOptions: RequestInit = {
        method: requestMethod,
        headers: requestHeaders,
      };

      if (body) {
        fetchOptions.body = body;
      }

      const response = await fetch(url, fetchOptions);

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`GraphQL request failed: ${response.status} - ${errorText}`);
      }

      let responseData;
      if (responseFormat === 'json') {
        responseData = await response.json();

        // Check for GraphQL errors
        if (responseData.errors && Array.isArray(responseData.errors)) {
          const errorMessages = responseData.errors
            .map((err: any) => err.message)
            .join(', ');

          this.logger.warn(`GraphQL returned errors: ${errorMessages}`);
        }
      } else {
        responseData = await response.text();
      }

      return {
        success: true,
        data: responseData,
      };
    } catch (error) {
      return {
        success: false,
        error: {
          code: 'GRAPHQL_QUERY_FAILED',
          message: error.message,
        },
      };
    }
  }
}
