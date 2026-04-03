import { Request } from 'express';
import { Injectable, Logger } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom, timeout, catchError } from 'rxjs';
import { AxiosRequestConfig, AxiosResponse } from 'axios';
import {
  ConnectorRequest,
  ConnectorResponse,
  ConnectorError,
  RateLimitConfig,
  RetryConfig
} from '../types';

export interface RequestOptions {
  timeout?: number;
  retries?: number;
  retryDelay?: number;
  rateLimit?: RateLimitConfig;
  validateStatus?: (status: number) => boolean;
  transformRequest?: (data: any) => any;
  transformResponse?: (data: any) => any;
}

@Injectable()
export class ApiUtils {
  private readonly logger = new Logger(ApiUtils.name);
  private readonly rateLimitTrackers = new Map<string, {
    requests: number;
    resetTime: number;
    window: number;
  }>();

  constructor(private readonly httpService: HttpService) {}

  /**
   * Execute HTTP request with comprehensive error handling
   */
  async executeRequest<T = any>(
    request: ConnectorRequest,
    options?: RequestOptions
  ): Promise<ConnectorResponse<T>> {
    const startTime = Date.now();
    
    try {
      // Check rate limits
      await this.checkRateLimit(request, options?.rateLimit);
      
      // Prepare axios config
      const axiosConfig = this.buildAxiosConfig(request, options);
      
      // Execute request with retry logic
      const response = await this.executeWithRetry(axiosConfig, options);
      
      const responseTime = Date.now() - startTime;
      
      // Parse response
      const result = this.parseSuccessResponse<T>(response, options);
      
      return {
        success: true,
        data: result,
        metadata: {
          timestamp: new Date(),
          rateLimit: this.extractRateLimitInfo(response),
          requestId: this.generateRequestId(),
          responseTime: responseTime
        }
      };
      
    } catch (error) {
      const responseTime = Date.now() - startTime;
      return this.handleRequestError(error, responseTime);
    }
  }

  /**
   * Execute GET request
   */
  async get<T = any>(
    url: string,
    queryParams?: Record<string, any>,
    headers?: Record<string, string>,
    options?: RequestOptions
  ): Promise<ConnectorResponse<T>> {
    const request: ConnectorRequest = {
      method: 'GET',
      endpoint: url,
      headers,
      queryParams
    };
    return this.executeRequest<T>(request, options);
  }

  /**
   * Execute POST request
   */
  async post<T = any>(
    url: string,
    body?: any,
    headers?: Record<string, string>,
    options?: RequestOptions
  ): Promise<ConnectorResponse<T>> {
    const request: ConnectorRequest = {
      method: 'POST',
      endpoint: url,
      headers,
      body
    };
    return this.executeRequest<T>(request, options);
  }

  /**
   * Execute PUT request
   */
  async put<T = any>(
    url: string,
    body?: any,
    headers?: Record<string, string>,
    options?: RequestOptions
  ): Promise<ConnectorResponse<T>> {
    const request: ConnectorRequest = {
      method: 'PUT',
      endpoint: url,
      headers,
      body
    };
    return this.executeRequest<T>(request, options);
  }

  /**
   * Execute PATCH request
   */
  async patch<T = any>(
    url: string,
    body?: any,
    headers?: Record<string, string>,
    options?: RequestOptions
  ): Promise<ConnectorResponse<T>> {
    const request: ConnectorRequest = {
      method: 'PATCH',
      endpoint: url,
      headers,
      body
    };
    return this.executeRequest<T>(request, options);
  }

  /**
   * Execute DELETE request
   */
  async delete<T = any>(
    url: string,
    headers?: Record<string, string>,
    options?: RequestOptions
  ): Promise<ConnectorResponse<T>> {
    const request: ConnectorRequest = {
      method: 'DELETE',
      endpoint: url,
      headers
    };
    return this.executeRequest<T>(request, options);
  }

  /**
   * Execute multiple requests in parallel
   */
  async executeParallel<T = any>(
    requests: ConnectorRequest[],
    options?: RequestOptions
  ): Promise<Array<ConnectorResponse<T>>> {
    const promises = requests.map(request => 
      this.executeRequest<T>(request, options)
    );
    
    try {
      return await Promise.all(promises);
    } catch (error) {
      this.logger.error('Parallel request execution failed:', error);
      throw error;
    }
  }

  /**
   * Execute requests in sequence with delay
   */
  async executeSequential<T = any>(
    requests: ConnectorRequest[],
    delay: number = 100,
    options?: RequestOptions
  ): Promise<Array<ConnectorResponse<T>>> {
    const results: Array<ConnectorResponse<T>> = [];
    
    for (let i = 0; i < requests.length; i++) {
      if (i > 0) {
        await this.sleep(delay);
      }
      
      const result = await this.executeRequest<T>(requests[i], options);
      results.push(result);
    }
    
    return results;
  }

  /**
   * Handle file upload
   */
  async uploadFile(
    url: string,
    file: Buffer | string,
    fileName: string,
    headers?: Record<string, string>,
    additionalFields?: Record<string, any>
  ): Promise<ConnectorResponse> {
    const startTime = Date.now();
    
    try {
      const FormData = require('form-data');
      const formData = new FormData();
      
      formData.append('file', file, fileName);
      
      if (additionalFields) {
        Object.entries(additionalFields).forEach(([key, value]) => {
          formData.append(key, value);
        });
      }
      
      const config: AxiosRequestConfig = {
        method: 'POST',
        url,
        data: formData,
        headers: {
          ...headers,
          ...formData.getHeaders()
        }
      };
      
      const response = await firstValueFrom(
        this.httpService.request(config).pipe(
          timeout(30000),
          catchError(error => {
            throw this.transformAxiosError(error);
          })
        )
      );
      
      const responseTime = Date.now() - startTime;
      
      return {
        success: true,
        data: response.data,
        metadata: {
          timestamp: new Date(),
          requestId: this.generateRequestId(),
          responseTime: responseTime
        }
      };
      
    } catch (error) {
      const responseTime = Date.now() - startTime;
      return this.handleRequestError(error, responseTime);
    }
  }

  /**
   * Download file
   */
  async downloadFile(
    url: string,
    headers?: Record<string, string>
  ): Promise<ConnectorResponse<Buffer>> {
    const startTime = Date.now();
    
    try {
      const response = await firstValueFrom(
        this.httpService.get(url, {
          headers,
          responseType: 'arraybuffer'
        }).pipe(
          timeout(60000),
          catchError(error => {
            throw this.transformAxiosError(error);
          })
        )
      );
      
      const responseTime = Date.now() - startTime;
      
      return {
        success: true,
        data: Buffer.from(response.data),
        metadata: {
          timestamp: new Date(),
          requestId: this.generateRequestId(),
          responseTime: responseTime,
          contentType: response.headers['content-type'] as string,
          contentLength: response.headers['content-length'] ? parseInt(response.headers['content-length'] as string, 10) : undefined
        }
      };
      
    } catch (error) {
      const responseTime = Date.now() - startTime;
      return this.handleRequestError(error, responseTime);
    }
  }

  /**
   * Build axios configuration from connector request
   */
  private buildAxiosConfig(
    request: ConnectorRequest,
    options?: RequestOptions
  ): AxiosRequestConfig {
    const config: AxiosRequestConfig = {
      method: request.method,
      url: request.endpoint,
      headers: request.headers || {},
      timeout: request.timeout || options?.timeout || 30000,
      validateStatus: options?.validateStatus || ((status) => status >= 200 && status < 300)
    };

    if (request.body) {
      config.data = options?.transformRequest ? 
        options.transformRequest(request.body) : 
        request.body;
    }

    if (request.queryParams) {
      config.params = request.queryParams;
    }

    return config;
  }

  /**
   * Execute request with retry logic
   */
  private async executeWithRetry(
    config: AxiosRequestConfig,
    options?: RequestOptions
  ): Promise<AxiosResponse> {
    const maxRetries = options?.retries || 3;
    const baseDelay = options?.retryDelay || 1000;
    let lastError: any;

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        return await firstValueFrom(
          this.httpService.request(config).pipe(
            timeout(config.timeout || 30000),
            catchError(error => {
              throw this.transformAxiosError(error);
            })
          )
        );
      } catch (error) {
        lastError = error;
        
        if (attempt === maxRetries || !this.shouldRetry(error)) {
          throw error;
        }
        
        const delay = this.calculateRetryDelay(attempt, baseDelay);
        this.logger.warn(`Request failed, retrying in ${delay}ms. Attempt ${attempt + 1}/${maxRetries + 1}`);
        await this.sleep(delay);
      }
    }
    
    throw lastError;
  }

  /**
   * Check rate limits before making request
   */
  private async checkRateLimit(
    request: ConnectorRequest,
    rateLimitConfig?: RateLimitConfig
  ): Promise<void> {
    if (!rateLimitConfig) return;

    const key = this.getRateLimitKey(request);
    const now = Date.now();
    const windowSize = 60000; // 1 minute window
    
    let tracker = this.rateLimitTrackers.get(key);
    
    if (!tracker || now >= tracker.resetTime) {
      tracker = {
        requests: 0,
        resetTime: now + windowSize,
        window: windowSize
      };
    }
    
    if (rateLimitConfig.requestsPerMinute && 
        tracker.requests >= rateLimitConfig.requestsPerMinute) {
      const waitTime = tracker.resetTime - now;
      throw new Error(`Rate limit exceeded. Please wait ${waitTime}ms before retrying.`);
    }
    
    tracker.requests++;
    this.rateLimitTrackers.set(key, tracker);
  }

  /**
   * Get rate limit key for tracking
   */
  private getRateLimitKey(request: ConnectorRequest): string {
    const url = new URL(request.endpoint);
    return `${url.hostname}:${request.method}`;
  }

  /**
   * Determine if request should be retried
   */
  private shouldRetry(error: any): boolean {
    // Retry on network errors, timeouts, and specific HTTP status codes
    const retryableStatusCodes = [408, 429, 500, 502, 503, 504];
    const retryableErrors = ['ECONNRESET', 'ETIMEDOUT', 'ENOTFOUND'];
    
    if (error.status && retryableStatusCodes.includes(error.status)) {
      return true;
    }
    
    if (error.code && retryableErrors.includes(error.code)) {
      return true;
    }
    
    return false;
  }

  /**
   * Calculate retry delay with exponential backoff
   */
  private calculateRetryDelay(attempt: number, baseDelay: number): number {
    const maxDelay = 30000; // 30 seconds max
    const delay = baseDelay * Math.pow(2, attempt);
    return Math.min(delay, maxDelay);
  }

  /**
   * Parse successful response
   */
  private parseSuccessResponse<T>(
    response: AxiosResponse,
    options?: RequestOptions
  ): T {
    let data = response.data;
    
    if (options?.transformResponse) {
      data = options.transformResponse(data);
    }
    
    return data;
  }

  /**
   * Handle request error
   */
  private handleRequestError(error: any, responseTime?: number): ConnectorResponse {
    this.logger.error('Request failed:', error);
    
    const connectorError: ConnectorError = {
      code: error.code || 'REQUEST_FAILED',
      message: error.message || 'Request failed',
      details: error,
      statusCode: error.status || error.statusCode,
      retryable: this.shouldRetry(error)
    };
    
    if (error.retryAfter) {
      connectorError.retryAfter = error.retryAfter;
    }
    
    return {
      success: false,
      error: connectorError,
      metadata: {
        timestamp: new Date(),
        requestId: this.generateRequestId(),
        responseTime: responseTime
      }
    };
  }

  /**
   * Transform axios error to connector error format
   */
  private transformAxiosError(error: any): any {
    if (error.response) {
      // Server responded with error status
      return {
        status: error.response.status,
        statusCode: error.response.status,
        message: error.response.data?.message || error.message,
        code: error.response.data?.code || `HTTP_${error.response.status}`,
        details: error.response.data,
        retryAfter: error.response.headers['retry-after'] ? parseInt(error.response.headers['retry-after'], 10) : undefined
      };
    } else if (error.request) {
      // Request was made but no response received
      return {
        code: 'NETWORK_ERROR',
        message: error.message || 'Network error occurred',
        details: error
      };
    } else {
      // Something else happened
      return {
        code: 'REQUEST_SETUP_ERROR',
        message: error.message,
        details: error
      };
    }
  }

  /**
   * Extract rate limit information from response headers
   */
  private extractRateLimitInfo(response: AxiosResponse): { remaining: number; reset: Date } | undefined {
    const headers = response.headers;
    
    // Common rate limit headers
    const remaining = headers['x-ratelimit-remaining'] || 
                     headers['x-rate-limit-remaining'] ||
                     headers['ratelimit-remaining'];
    
    const reset = headers['x-ratelimit-reset'] || 
                  headers['x-rate-limit-reset'] ||
                  headers['ratelimit-reset'];
    
    if (remaining !== undefined && reset !== undefined) {
      return {
        remaining: parseInt(remaining, 10),
        reset: new Date(parseInt(reset, 10) * 1000)
      };
    }
    
    return undefined;
  }

  /**
   * Generate unique request ID
   */
  private generateRequestId(): string {
    return `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Sleep utility
   */
  private async sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Build query string from parameters
   */
  buildQueryString(params: Record<string, any>): string {
    const searchParams = new URLSearchParams();
    
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        if (Array.isArray(value)) {
          value.forEach(item => searchParams.append(key, item.toString()));
        } else {
          searchParams.append(key, value.toString());
        }
      }
    });
    
    return searchParams.toString();
  }

  /**
   * Parse response pagination information
   */
  parsePaginationInfo(response: AxiosResponse): {
    page?: number;
    pageSize?: number;
    total?: number;
    hasNext?: boolean;
  } | undefined {
    const headers = response.headers;
    const data = response.data;
    
    // Try to extract pagination from headers
    if (headers['x-pagination-page']) {
      return {
        page: parseInt(headers['x-pagination-page'], 10),
        pageSize: parseInt(headers['x-pagination-limit'], 10),
        total: parseInt(headers['x-pagination-total'], 10),
        hasNext: headers['x-pagination-has-next'] === 'true'
      };
    }
    
    // Try to extract pagination from response body
    if (data && typeof data === 'object') {
      if (data.pagination) {
        return data.pagination;
      }
      
      if (data.meta && data.meta.pagination) {
        return data.meta.pagination;
      }
    }
    
    return undefined;
  }
}