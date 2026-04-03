import { Injectable, Logger } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';
import { BaseConnector } from '../../base/base.connector';
import {
  ConnectorConfig,
  ConnectorMetadata,
  ConnectorAction,
  ConnectorCategory,
  ConnectorType,
  AuthType,
  ConnectorRequest,
  ConnectorResponse
} from '../../types';

@Injectable()
export class ScrapflyConnector extends BaseConnector {
  protected readonly logger = new Logger(ScrapflyConnector.name);
  private baseUrl = 'https://api.scrapfly.io';
  private apiKey: string;

  constructor(private readonly httpService: HttpService) {
    super();
  }

  getMetadata(): ConnectorMetadata {
    const actions: ConnectorAction[] = [
      {
        id: 'scrape_web_page',
        name: 'Scrape Web Page',
        description: 'Scrape content from a web page with anti-bot bypass',
        inputSchema: {
          url: { type: 'string', required: true },
          renderJs: { type: 'boolean', required: false },
          country: { type: 'string', required: false },
          asp: { type: 'boolean', required: false },
          format: { type: 'string', required: false }
        },
        outputSchema: {
          content: { type: 'string', required: true },
          status_code: { type: 'number', required: true },
          url: { type: 'string', required: true }
        }
      },
      {
        id: 'screenshot',
        name: 'Capture Screenshot',
        description: 'Capture a screenshot of a web page',
        inputSchema: {
          url: { type: 'string', required: true },
          format: { type: 'string', required: false },
          capture: { type: 'string', required: false },
          resolution: { type: 'string', required: false }
        },
        outputSchema: {
          screenshot: { type: 'string', required: true },
          url: { type: 'string', required: true }
        }
      },
      {
        id: 'extract_data',
        name: 'Extract Data with AI',
        description: 'Extract structured data from HTML/Markdown using AI',
        inputSchema: {
          url: { type: 'string', required: false },
          body: { type: 'string', required: false },
          extraction_prompt: { type: 'string', required: true },
          extraction_template: { type: 'object', required: false }
        },
        outputSchema: {
          extracted_data: { type: 'object', required: true }
        }
      },
      {
        id: 'api_request',
        name: 'API Request',
        description: 'Make a direct API request through Scrapfly proxies',
        inputSchema: {
          url: { type: 'string', required: true },
          method: { type: 'string', required: true },
          headers: { type: 'object', required: false },
          body: { type: 'string', required: false }
        },
        outputSchema: {
          response: { type: 'object', required: true }
        }
      },
      {
        id: 'get_account_info',
        name: 'Get Account Info',
        description: 'Get account usage information and credits',
        inputSchema: {},
        outputSchema: {
          account: { type: 'object', required: true }
        }
      }
    ];

    return {
      name: 'scrapfly',
      description: 'Web scraping, data extraction, and screenshot capture with anti-bot bypass',
      version: '1.0.0',
      category: ConnectorCategory.DATA_PROCESSING,
      type: ConnectorType.SCRAPFLY,
      authType: AuthType.API_KEY,
      actions,
      triggers: [],
      webhookSupport: false
    };
  }

  protected async initializeConnection(): Promise<void> {
    if (!this.config?.credentials?.apiKey) {
      throw new Error('Scrapfly API key is required');
    }
    this.apiKey = this.config.credentials.apiKey;
    this.logger.log('Scrapfly connector initialized');
  }

  protected async performConnectionTest(): Promise<boolean> {
    try {
      // Test connection by getting account info
      const response = await this.makeApiRequest('GET', '/account');
      return response.status === 200;
    } catch (error) {
      this.logger.error('Scrapfly connection test failed:', error.message);
      return false;
    }
  }

  protected async performHealthCheck(): Promise<void> {
    if (!this.config?.credentials?.apiKey) {
      throw new Error('Scrapfly API key not configured');
    }
  }

  protected async performRequest(request: ConnectorRequest): Promise<any> {
    const { method = 'GET', endpoint, body, headers } = request;
    return await this.makeApiRequest(method, endpoint, body, headers);
  }

  protected async performAction(actionId: string, input: any): Promise<any> {
    switch (actionId) {
      case 'scrape_web_page':
        return await this.scrapeWebPage(input);
      case 'screenshot':
        return await this.captureScreenshot(input);
      case 'extract_data':
        return await this.extractData(input);
      case 'api_request':
        return await this.makeProxiedApiRequest(input);
      case 'get_account_info':
        return await this.getAccountInfo();
      default:
        throw new Error(`Unknown action: ${actionId}`);
    }
  }

  protected async cleanup(): Promise<void> {
    this.logger.log('Scrapfly connector cleanup completed');
  }

  // Action implementations
  private async scrapeWebPage(params: any): Promise<any> {
    const {
      url,
      renderJs = false,
      country = 'us',
      asp = false,
      proxy_pool = 'public_datacenter_pool',
      format = 'html',
      session,
      timeout = 30000,
      cache = false,
      cache_ttl,
      method = 'GET',
      headers,
      body,
      retry = true,
      debug = false
    } = params;

    const queryParams: any = {
      key: this.apiKey,
      url,
      render_js: renderJs,
      country,
      asp,
      proxy_pool,
      format,
      timeout,
      cache,
      retry,
      debug
    };

    if (session) queryParams.session = session;
    if (cache && cache_ttl) queryParams.cache_ttl = cache_ttl;
    if (method !== 'GET') queryParams.method = method;
    if (headers) queryParams.headers = JSON.stringify(headers);
    if (body && ['POST', 'PUT', 'PATCH'].includes(method)) {
      queryParams.body = body;
    }

    try {
      const response = await this.makeApiRequest('GET', '/scrape', null, {}, queryParams);

      return {
        success: true,
        data: {
          content: response.data.result?.content || response.data.content,
          status_code: response.data.result?.status_code || response.status,
          url: response.data.result?.url || url,
          headers: response.data.result?.headers,
          session: response.data.result?.session,
          cost: response.data.config?.cost
        }
      };
    } catch (error) {
      return {
        success: false,
        error: {
          code: 'SCRAPE_FAILED',
          message: error.message || 'Failed to scrape web page'
        }
      };
    }
  }

  private async captureScreenshot(params: any): Promise<any> {
    const {
      url,
      format = 'png',
      capture = 'viewport',
      resolution = '1920x1080',
      country = 'us',
      asp = false,
      wait = 0,
      wait_for_selector,
      timeout = 30000
    } = params;

    const queryParams: any = {
      key: this.apiKey,
      url,
      format,
      capture,
      resolution,
      country,
      asp,
      timeout
    };

    if (wait > 0) queryParams.wait = wait;
    if (wait_for_selector) queryParams.wait_for_selector = wait_for_selector;

    try {
      const response = await this.makeApiRequest('GET', '/screenshot', null, {}, queryParams);

      return {
        success: true,
        data: {
          screenshot: response.data.result?.screenshot || response.data.screenshot,
          url: response.data.result?.url || url,
          format,
          cost: response.data.config?.cost
        }
      };
    } catch (error) {
      return {
        success: false,
        error: {
          code: 'SCREENSHOT_FAILED',
          message: error.message || 'Failed to capture screenshot'
        }
      };
    }
  }

  private async extractData(params: any): Promise<any> {
    const {
      url,
      body,
      content_type = 'text/html',
      extraction_prompt,
      extraction_template,
      extraction_model = 'gpt-4',
      is_document = false,
      document_compression_mode = 'auto',
      charset = 'utf-8'
    } = params;

    if (!url && !body) {
      return {
        success: false,
        error: {
          code: 'INVALID_INPUT',
          message: 'Either url or body must be provided'
        }
      };
    }

    const requestBody: any = {
      content_type,
      extraction_prompt,
      extraction_model,
      is_document,
      charset
    };

    if (url) requestBody.url = url;
    if (body) requestBody.body = body;
    if (extraction_template) requestBody.extraction_template = extraction_template;
    if (is_document) requestBody.document_compression_mode = document_compression_mode;

    try {
      const response = await this.makeApiRequest(
        'POST',
        '/extraction/v1',
        requestBody,
        { 'Content-Type': 'application/json' },
        { key: this.apiKey }
      );

      return {
        success: true,
        data: {
          extracted_data: response.data.result || response.data,
          cost: response.data.config?.cost
        }
      };
    } catch (error) {
      return {
        success: false,
        error: {
          code: 'EXTRACTION_FAILED',
          message: error.message || 'Failed to extract data'
        }
      };
    }
  }

  private async makeProxiedApiRequest(params: any): Promise<any> {
    const {
      url,
      method = 'GET',
      headers,
      body,
      country = 'us',
      format = 'json',
      timeout = 30000
    } = params;

    const queryParams: any = {
      key: this.apiKey,
      url,
      method,
      country,
      format,
      timeout
    };

    if (headers) queryParams.headers = JSON.stringify(headers);
    if (body && ['POST', 'PUT', 'PATCH'].includes(method)) {
      queryParams.body = body;
    }

    try {
      const response = await this.makeApiRequest('GET', '/scrape', null, {}, queryParams);

      return {
        success: true,
        data: {
          response: response.data.result || response.data,
          status_code: response.data.result?.status_code || response.status,
          cost: response.data.config?.cost
        }
      };
    } catch (error) {
      return {
        success: false,
        error: {
          code: 'API_REQUEST_FAILED',
          message: error.message || 'Failed to make API request'
        }
      };
    }
  }

  private async getAccountInfo(): Promise<any> {
    try {
      const response = await this.makeApiRequest('GET', '/account', null, {}, { key: this.apiKey });

      return {
        success: true,
        data: {
          account: response.data
        }
      };
    } catch (error) {
      return {
        success: false,
        error: {
          code: 'GET_ACCOUNT_FAILED',
          message: error.message || 'Failed to get account information'
        }
      };
    }
  }

  // Helper method for making API requests
  private async makeApiRequest(
    method: string,
    endpoint: string,
    body?: any,
    headers: Record<string, string> = {},
    queryParams: Record<string, any> = {}
  ): Promise<any> {
    const url = `${this.baseUrl}${endpoint}`;

    try {
      const response = await firstValueFrom(
        this.httpService.request({
          method,
          url,
          data: body,
          headers: {
            'Content-Type': 'application/json',
            ...headers
          },
          params: queryParams
        })
      );

      return response;
    } catch (error) {
      if (error.response?.data) {
        const errorData = error.response.data;
        throw new Error(
          errorData.message ||
          errorData.error ||
          `Scrapfly API error: ${error.response.status}`
        );
      }
      throw error;
    }
  }
}
