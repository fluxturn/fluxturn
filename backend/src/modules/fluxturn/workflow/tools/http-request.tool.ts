import { Logger } from '@nestjs/common';
import {
  ExecutableTool,
  ToolContext,
  ToolResult,
} from '../types/tool.interface';

/**
 * HTTP Request Tool
 *
 * Tool for AI Agents to make HTTP requests to any API.
 * Supports GET, POST, PUT, PATCH, DELETE methods.
 * Does NOT require credentials - works with any public API.
 */
export const HttpRequestTool: ExecutableTool = {
  name: 'http_request',
  description:
    'Make an HTTP request to any URL. Supports GET, POST, PUT, PATCH, DELETE methods. Use this when you need to fetch data from an API, submit forms, or interact with web services.',
  category: 'utility',
  requiresCredentials: false,
  parameters: {
    type: 'object',
    properties: {
      url: {
        type: 'string',
        description: 'The full URL to make the request to (must include http:// or https://)',
      },
      method: {
        type: 'string',
        description: 'The HTTP method to use',
        enum: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
      },
      headers: {
        type: 'object',
        description: 'Optional HTTP headers as key-value pairs. Example: {"Authorization": "Bearer token123", "Content-Type": "application/json"}',
      },
      body: {
        type: 'object',
        description: 'Optional request body for POST/PUT/PATCH requests. Will be sent as JSON.',
      },
      queryParams: {
        type: 'object',
        description: 'Optional query parameters as key-value pairs. Will be appended to the URL.',
      },
      timeout: {
        type: 'number',
        description: 'Request timeout in milliseconds. Default is 30000 (30 seconds).',
      },
    },
    required: ['url', 'method'],
  },
  execute: async (
    params: Record<string, any>,
    context: ToolContext,
  ): Promise<ToolResult> => {
    const logger = context.logger || new Logger('HttpRequestTool');

    try {
      logger.log(`HTTP Request: ${params.method} ${params.url}`);

      // Validate URL
      if (!params.url) {
        return {
          success: false,
          error: 'URL is required',
        };
      }

      if (!params.url.startsWith('http://') && !params.url.startsWith('https://')) {
        return {
          success: false,
          error: 'URL must start with http:// or https://',
        };
      }

      // Validate method
      const validMethods = ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'];
      const method = (params.method || 'GET').toUpperCase();
      if (!validMethods.includes(method)) {
        return {
          success: false,
          error: `Invalid HTTP method. Must be one of: ${validMethods.join(', ')}`,
        };
      }

      const axios = (await import('axios')).default;

      // Build request config
      const config: any = {
        method,
        url: params.url,
        timeout: params.timeout || 30000,
        headers: {
          'User-Agent': 'Fluxturn-AI-Agent/1.0',
          ...params.headers,
        },
        validateStatus: () => true, // Don't throw on any status code
      };

      // Add query params
      if (params.queryParams && Object.keys(params.queryParams).length > 0) {
        config.params = params.queryParams;
      }

      // Add body for POST/PUT/PATCH
      if (['POST', 'PUT', 'PATCH'].includes(method) && params.body) {
        config.data = params.body;
        if (!config.headers['Content-Type']) {
          config.headers['Content-Type'] = 'application/json';
        }
      }

      // Make the request
      const startTime = Date.now();
      const response = await axios(config);
      const duration = Date.now() - startTime;

      logger.log(`HTTP Response: ${response.status} in ${duration}ms`);

      // Determine if response is successful (2xx status)
      const isSuccess = response.status >= 200 && response.status < 300;

      return {
        success: true,
        data: {
          status: response.status,
          statusText: response.statusText,
          headers: response.headers,
          data: response.data,
          isSuccess,
          duration: `${duration}ms`,
          message: isSuccess
            ? `Request successful: ${response.status} ${response.statusText}`
            : `Request completed with status: ${response.status} ${response.statusText}`,
        },
      };
    } catch (error: any) {
      logger.error(`HTTP Request failed: ${error.message}`);

      // Handle specific error types
      if (error.code === 'ECONNREFUSED') {
        return {
          success: false,
          error: `Connection refused: Unable to connect to ${params.url}`,
        };
      }

      if (error.code === 'ENOTFOUND') {
        return {
          success: false,
          error: `Host not found: ${params.url}`,
        };
      }

      if (error.code === 'ETIMEDOUT' || error.code === 'ECONNABORTED') {
        return {
          success: false,
          error: `Request timed out after ${params.timeout || 30000}ms`,
        };
      }

      return {
        success: false,
        error: `HTTP Request failed: ${error.message}`,
      };
    }
  },
};

/**
 * HTTP GET Tool - Simplified version for simple GET requests
 */
export const HttpGetTool: ExecutableTool = {
  name: 'http_get',
  description:
    'Make a simple HTTP GET request to fetch data from a URL. Use this for quick data retrieval from APIs.',
  category: 'utility',
  requiresCredentials: false,
  parameters: {
    type: 'object',
    properties: {
      url: {
        type: 'string',
        description: 'The URL to fetch data from',
      },
      headers: {
        type: 'object',
        description: 'Optional HTTP headers',
      },
    },
    required: ['url'],
  },
  execute: async (
    params: Record<string, any>,
    context: ToolContext,
  ): Promise<ToolResult> => {
    // Delegate to the main HTTP Request tool
    return HttpRequestTool.execute(
      {
        ...params,
        method: 'GET',
      },
      context,
    );
  },
};

/**
 * HTTP POST Tool - Simplified version for POST requests
 */
export const HttpPostTool: ExecutableTool = {
  name: 'http_post',
  description:
    'Make an HTTP POST request to submit data to a URL. Use this for creating resources or sending data to APIs.',
  category: 'utility',
  requiresCredentials: false,
  parameters: {
    type: 'object',
    properties: {
      url: {
        type: 'string',
        description: 'The URL to send data to',
      },
      body: {
        type: 'object',
        description: 'The JSON data to send in the request body',
      },
      headers: {
        type: 'object',
        description: 'Optional HTTP headers',
      },
    },
    required: ['url', 'body'],
  },
  execute: async (
    params: Record<string, any>,
    context: ToolContext,
  ): Promise<ToolResult> => {
    // Delegate to the main HTTP Request tool
    return HttpRequestTool.execute(
      {
        ...params,
        method: 'POST',
      },
      context,
    );
  },
};

/**
 * Get all HTTP Request tools
 */
export function getHttpRequestTools(): ExecutableTool[] {
  return [HttpRequestTool, HttpGetTool, HttpPostTool];
}
