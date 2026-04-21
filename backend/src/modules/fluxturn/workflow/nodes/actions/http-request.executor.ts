import { Injectable, Optional } from '@nestjs/common';
import axios, { AxiosRequestConfig, AxiosResponse } from 'axios';
import {
  BaseNodeExecutor,
  NodeData,
  NodeInputItem,
  NodeExecutionContext,
  NodeExecutionResult,
} from '../base';
import { ConnectorsService } from '../../../connectors/connectors.service';

/**
 * HTTP Request Executor
 * Makes HTTP/API requests with advanced options
 */
@Injectable()
export class HttpRequestExecutor extends BaseNodeExecutor {
  readonly supportedTypes = ['HTTP_REQUEST'];

  constructor(
    @Optional() private readonly connectorsService?: ConnectorsService,
  ) {
    super();
  }

  protected async executeInternal(
    node: NodeData,
    inputData: NodeInputItem[],
    context: NodeExecutionContext,
  ): Promise<NodeExecutionResult> {
    const config = node.data || {};
    const results: NodeInputItem[] = [];
    const https = await import('https');

    // Process each input item
    for (const item of inputData) {
      const itemContext = this.buildItemContext(item, context);

      // Resolve URL and method
      const url = this.resolveExpression(config.url, itemContext);
      const method = (config.method || 'GET').toUpperCase();

      // Validate URL
      if (!url || String(url).trim() === '') {
        throw this.configurationError(node.data?.label || node.id, 'URL');
      }

      try {
        const axiosConfig: AxiosRequestConfig = {
          method: method as any,
          url,
          headers: {},
          params: {},
          timeout: config.timeout || 10000,
          maxRedirects: config.followRedirect !== false ? (config.maxRedirects || 21) : 0,
          validateStatus: config.neverError ? () => true : (status) => status >= 200 && status < 300,
        };

        // Handle authentication
        await this.configureAuthentication(axiosConfig, config, itemContext);

        // Handle query parameters
        this.configureQueryParams(axiosConfig, config, itemContext);

        // Handle headers
        this.configureHeaders(axiosConfig, config, itemContext);

        // Handle request body
        await this.configureBody(axiosConfig, config, method, itemContext);

        // Handle advanced options
        this.configureAdvancedOptions(axiosConfig, config, https, url);

        // Execute HTTP request
        this.logger.log(`Making ${method} request to: ${axiosConfig.url || url}`);
        const response: AxiosResponse = await axios(axiosConfig);

        // Handle response
        const responseData = this.processResponse(response, config);

        // Return full response or just body
        if (config.fullResponse) {
          results.push({
            json: {
              statusCode: response.status,
              statusMessage: response.statusText,
              headers: response.headers,
              body: responseData,
            }
          });
        } else {
          results.push({ json: responseData });
        }

      } catch (error: any) {
        this.logger.error(`HTTP request failed:`, error.message);

        if (config.neverError) {
          results.push({
            json: {
              error: true,
              statusCode: error.response?.status || 500,
              statusMessage: error.response?.statusText || 'Error',
              message: error.message,
              body: error.response?.data,
            },
          });
        } else {
          const nodeName = node.data?.label || node.id;
          const wrappedError = new Error(
            `Node "${nodeName}" failed to execute HTTP request: ${error.message}`
          );
          wrappedError.name = 'HTTPRequestError';
          (wrappedError as any).originalError = error;
          (wrappedError as any).statusCode = error.response?.status || 500;
          throw wrappedError;
        }
      }
    }

    return results;
  }

  private async configureAuthentication(
    axiosConfig: AxiosRequestConfig,
    config: any,
    context: NodeExecutionContext,
  ): Promise<void> {
    const authentication = config.authentication || 'none';

    switch (authentication) {
      case 'credential':
        if (config.credentialId && this.connectorsService) {
          try {
            const credentials = await this.connectorsService.getConnectorCredentials(config.credentialId);
            if (credentials.accessToken) {
              axiosConfig.headers!['Authorization'] = `Bearer ${credentials.accessToken}`;
            } else if (credentials.apiKey) {
              axiosConfig.headers!['Authorization'] = `Bearer ${credentials.apiKey}`;
            } else if (credentials.token) {
              axiosConfig.headers!['Authorization'] = `Bearer ${credentials.token}`;
            } else if (credentials.username && credentials.password) {
              axiosConfig.auth = {
                username: credentials.username,
                password: credentials.password,
              };
            }
          } catch (error: any) {
            throw new Error(`Failed to fetch credential: ${error.message}`);
          }
        }
        break;

      case 'bearerToken':
        if (config.bearerToken) {
          const token = this.resolveExpression(config.bearerToken, context);
          axiosConfig.headers!['Authorization'] = `Bearer ${token}`;
        }
        break;

      case 'headerAuth':
        if (config.headerAuthName && config.headerAuthValue) {
          const headerName = this.resolveExpression(config.headerAuthName, context);
          const headerValue = this.resolveExpression(config.headerAuthValue, context);
          axiosConfig.headers![headerName] = headerValue;
        }
        break;

      case 'queryAuth':
        if (config.queryAuthName && config.queryAuthValue) {
          const paramName = this.resolveExpression(config.queryAuthName, context);
          const paramValue = this.resolveExpression(config.queryAuthValue, context);
          axiosConfig.params![paramName] = paramValue;
        }
        break;
    }
  }

  private configureQueryParams(
    axiosConfig: AxiosRequestConfig,
    config: any,
    context: NodeExecutionContext,
  ): void {
    if (config.sendQuery && config.queryParameters) {
      try {
        const queryString = this.resolveExpression(config.queryParameters, context);
        const queryParams = JSON.parse(queryString);
        axiosConfig.params = { ...axiosConfig.params, ...queryParams };
      } catch (e: any) {
        this.logger.warn('Failed to parse query parameters:', e.message);
      }
    }
  }

  private configureHeaders(
    axiosConfig: AxiosRequestConfig,
    config: any,
    context: NodeExecutionContext,
  ): void {
    if (config.sendHeaders && config.headers) {
      try {
        const headersString = this.resolveExpression(config.headers, context);
        const customHeaders = JSON.parse(headersString);
        axiosConfig.headers = { ...axiosConfig.headers, ...customHeaders };
      } catch (e: any) {
        this.logger.warn('Failed to parse headers:', e.message);
      }
    }

    // Lowercase headers option
    if (config.lowercaseHeaders !== false) {
      const lowercasedHeaders: any = {};
      for (const [key, value] of Object.entries(axiosConfig.headers || {})) {
        lowercasedHeaders[key.toLowerCase()] = value;
      }
      axiosConfig.headers = lowercasedHeaders;
    }
  }

  private async configureBody(
    axiosConfig: AxiosRequestConfig,
    config: any,
    method: string,
    context: NodeExecutionContext,
  ): Promise<void> {
    if (!config.sendBody || !['POST', 'PUT', 'PATCH', 'DELETE'].includes(method)) {
      return;
    }

    const bodyContentType = config.bodyContentType || 'json';

    switch (bodyContentType) {
      case 'json':
        try {
          const jsonString = this.resolveExpression(config.jsonBody || '{}', context);
          axiosConfig.data = JSON.parse(jsonString);
          axiosConfig.headers!['content-type'] = 'application/json';
        } catch (e: any) {
          throw new Error(`Invalid JSON in body: ${e.message}`);
        }
        break;

      case 'form-urlencoded':
        try {
          const bodyString = this.resolveExpression(config.bodyParameters || '{}', context);
          const formData = JSON.parse(bodyString);
          axiosConfig.data = new URLSearchParams(formData).toString();
          axiosConfig.headers!['content-type'] = 'application/x-www-form-urlencoded';
        } catch (e: any) {
          throw new Error(`Invalid JSON in form body: ${e.message}`);
        }
        break;

      case 'multipart-form-data':
        const FormData = (await import('form-data')).default;
        const multipartForm = new FormData();
        try {
          const bodyString = this.resolveExpression(config.bodyParameters || '{}', context);
          const formData = JSON.parse(bodyString);
          for (const [name, value] of Object.entries(formData)) {
            multipartForm.append(name, value as string);
          }
        } catch (e: any) {
          throw new Error(`Invalid JSON in multipart body: ${e.message}`);
        }
        axiosConfig.data = multipartForm;
        axiosConfig.headers = {
          ...axiosConfig.headers,
          ...multipartForm.getHeaders(),
        };
        break;

      case 'raw':
        axiosConfig.data = this.resolveExpression(config.rawBody || '', context);
        axiosConfig.headers!['content-type'] = config.rawBodyMimeType || 'text/plain';
        break;
    }
  }

  private configureAdvancedOptions(
    axiosConfig: AxiosRequestConfig,
    config: any,
    https: any,
    url: string,
  ): void {
    // SSL Certificate validation
    if (config.allowUnauthorizedCerts) {
      axiosConfig.httpsAgent = new https.Agent({
        rejectUnauthorized: false,
      });
    }

    // Proxy configuration
    if (config.proxy) {
      try {
        const proxyUrl = new URL(config.proxy);
        axiosConfig.proxy = {
          host: proxyUrl.hostname,
          port: parseInt(proxyUrl.port) || 8080,
          protocol: proxyUrl.protocol.replace(':', ''),
        };
      } catch (e) {
        this.logger.warn(`Invalid proxy URL: ${config.proxy}`);
      }
    }

    // Response format for binary data
    const responseFormat = config.responseFormat || 'autodetect';
    const isGoogleUrl = url.includes('drive.google.com') ||
                        url.includes('docs.google.com/spreadsheets') ||
                        url.includes('sheets.googleapis.com') ||
                        url.includes('googleapis.com');

    if (responseFormat === 'file' || isGoogleUrl) {
      axiosConfig.responseType = 'arraybuffer';
    }

    // Google Sheets export handling
    if (isGoogleUrl && url.includes('docs.google.com/spreadsheets')) {
      const docIdMatch = url.match(/\/d\/([a-zA-Z0-9-_]+)/);
      if (docIdMatch) {
        const docId = docIdMatch[1];
        axiosConfig.url = `https://docs.google.com/spreadsheets/d/${docId}/export?format=xlsx`;
      }
    }
  }

  private processResponse(response: AxiosResponse, config: any): any {
    const contentType = String(response.headers['content-type'] || '');
    const responseFormat = config.responseFormat || 'autodetect';

    let detectedFormat = responseFormat;
    if (responseFormat === 'autodetect') {
      if (contentType.includes('application/json')) {
        detectedFormat = 'json';
      } else if (this.isBinaryContentType(contentType)) {
        detectedFormat = 'file';
      } else {
        detectedFormat = 'text';
      }
    }

    if (detectedFormat === 'json') {
      return response.data;
    } else if (detectedFormat === 'text') {
      return typeof response.data === 'string'
        ? response.data
        : JSON.stringify(response.data);
    } else if (detectedFormat === 'file') {
      const buffer = Buffer.isBuffer(response.data)
        ? response.data
        : Buffer.from(response.data);

      const base64Data = buffer.toString('base64');
      const fileName = this.extractFileNameFromResponse(response) || 'download';
      const mimeType = contentType || 'application/octet-stream';

      return {
        binary: {
          data: {
            data: base64Data,
            mimeType: mimeType,
            fileName: fileName,
            fileExtension: fileName.split('.').pop() || '',
            fileSize: buffer.length,
          }
        }
      };
    }

    return response.data;
  }

  private isBinaryContentType(contentType: string): boolean {
    const binaryTypes = [
      'image/', 'audio/', 'video/',
      'application/octet-stream', 'application/pdf',
      'application/zip', 'application/gzip', 'application/x-tar',
      'application/vnd.openxmlformats-officedocument',
      'application/vnd.ms-excel', 'application/vnd.ms-powerpoint',
      'application/msword', 'application/vnd.google-apps', 'text/csv',
    ];
    return binaryTypes.some(type => contentType.includes(type));
  }

  private extractFileNameFromResponse(response: AxiosResponse): string {
    const disposition = response.headers['content-disposition'];
    if (disposition) {
      const match = disposition.match(/filename[^;=\n]*=((['"]).*?\2|[^;\n]*)/);
      if (match && match[1]) {
        return match[1].replace(/['"]/g, '');
      }
    }

    const url = response.config.url || '';
    try {
      const urlPath = new URL(url).pathname;
      const pathParts = urlPath.split('/');
      const lastPart = pathParts[pathParts.length - 1];
      if (lastPart && lastPart.includes('.')) {
        return lastPart;
      }
    } catch (e) {
      // URL parsing failed
    }

    return 'download';
  }
}
