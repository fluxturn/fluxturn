import { Request } from 'express';
import { Injectable, Logger } from '@nestjs/common';
import { EventEmitter } from 'events';
import {
  IConnector,
  IConnectorEventEmitter
} from './connector.interface';
import {
  ConnectorConfig,
  ConnectorResponse,
  ConnectorRequest,
  ConnectorMetadata,
  ConnectorHealthStatus,
  ConnectorUsageStats,
  ConnectorError,
  ConnectorEvent,
  ConnectorEventType,
  RetryConfig,
  RateLimitConfig,
  OAuthTokens
} from '../types';

@Injectable()
export abstract class BaseConnector implements IConnector, IConnectorEventEmitter {
  protected readonly logger = new Logger(this.constructor.name);
  protected config: ConnectorConfig;
  protected eventEmitter = new EventEmitter();
  protected usageStats: ConnectorUsageStats = {
    requestCount: 0,
    errorCount: 0,
    lastUsed: new Date(),
    avgResponseTime: 0
  };
  
  private responseTimeSamples: number[] = [];
  private rateLimitTracker = new Map<string, { count: number; resetTime: number }>();

  constructor() {
    this.setupEventHandlers();
  }

  abstract getMetadata(): ConnectorMetadata;

  async initialize(config: ConnectorConfig): Promise<void> {
    this.config = config;
    this.logger.log(`Initializing connector: ${config.name} (${config.type})`);
    
    try {
      await this.validateConfig(config);
      await this.initializeConnection();
      this.emit({
        type: ConnectorEventType.CONNECTION_ESTABLISHED,
        connectorId: config.id,
        timestamp: new Date(),
        data: { connectorType: config.type },
        source: 'manual'
      });
      this.logger.log(`Connector ${config.name} initialized successfully`);
    } catch (error) {
      this.logger.error(`Failed to initialize connector ${config.name}:`, error);
      throw error;
    }
  }

  async testConnection(): Promise<ConnectorResponse<boolean>> {
    try {
      const startTime = Date.now();
      const result = await this.performConnectionTest();
      const responseTime = Date.now() - startTime;

      // If performConnectionTest returns false, treat it as a failed connection
      if (result === false) {
        this.updateUsageStats(responseTime, false);
        return {
          success: false,
          error: {
            code: 'CONNECTION_FAILED',
            message: 'Connection test failed',
            retryable: true
          },
          metadata: {
            timestamp: new Date(),
            rateLimit: await this.getRateLimitInfo()
          }
        };
      }

      this.updateUsageStats(responseTime, true);

      return {
        success: true,
        data: result,
        metadata: {
          timestamp: new Date(),
          rateLimit: await this.getRateLimitInfo()
        }
      };
    } catch (error) {
      this.updateUsageStats(0, false);
      return this.handleError(error as any, 'Connection test failed');
    }
  }

  async getHealthStatus(): Promise<ConnectorHealthStatus> {
    try {
      const startTime = Date.now();
      await this.performHealthCheck();
      const responseTime = Date.now() - startTime;
      
      return {
        isHealthy: true,
        lastChecked: new Date(),
        responseTime,
        details: {
          connectorType: this.config?.type,
          connectorId: this.config?.id
        }
      };
    } catch (error) {
      return {
        isHealthy: false,
        lastChecked: new Date(),
        error: error.message,
        details: {
          connectorType: this.config?.type,
          connectorId: this.config?.id,
          errorCode: error.code
        }
      };
    }
  }

  async getUsageStats(): Promise<ConnectorUsageStats> {
    return {
      ...this.usageStats,
      rateLimit: await this.getRateLimitInfo()
    };
  }

  async executeRequest(request: ConnectorRequest): Promise<ConnectorResponse> {
    try {
      // Check rate limits
      await this.checkRateLimit();
      
      // Apply retry logic
      const response = await this.executeWithRetry(async () => {
        return await this.performRequest(request);
      });
      
      return response;
    } catch (error) {
      return this.handleError(error as any, 'Request execution failed');
    }
  }

  async executeAction(actionId: string, input: any): Promise<ConnectorResponse> {
    try {
      this.logger.debug(`Executing action: ${actionId}`);

      // Validate input against action schema
      await this.validateActionInput(actionId, input);

      // Check rate limits
      await this.checkRateLimit();

      const startTime = Date.now();
      const result = await this.performAction(actionId, input);
      const responseTime = Date.now() - startTime;

      // Check if performAction already returned a ConnectorResponse
      if (result && typeof result === 'object' && 'success' in result) {
        // If the result is already a ConnectorResponse with success: false, return it as-is
        if (result.success === false) {
          this.updateUsageStats(responseTime, false);
          this.logger.error(`Action ${actionId} failed: ${result.error?.message || 'Unknown error'}`);
          return result;
        }
        // If it's a successful ConnectorResponse, return it with metadata
        this.updateUsageStats(responseTime, true);
        return {
          ...result,
          metadata: {
            ...result.metadata,
            timestamp: new Date(),
            rateLimit: await this.getRateLimitInfo()
          }
        };
      }

      // Otherwise, wrap the raw result
      this.updateUsageStats(responseTime, true);
      return {
        success: true,
        data: result,
        metadata: {
          timestamp: new Date(),
          rateLimit: await this.getRateLimitInfo()
        }
      };
    } catch (error) {
      this.updateUsageStats(0, false);
      return this.handleError(error as any, `Action execution failed: ${actionId}`);
    }
  }

  async refreshTokens?(): Promise<OAuthTokens> {
    throw new Error('OAuth token refresh not implemented for this connector');
  }

  async destroy(): Promise<void> {
    this.logger.log(`Destroying connector: ${this.config?.name}`);
    try {
      await this.cleanup();
      this.eventEmitter.removeAllListeners();
    } catch (error) {
      this.logger.error('Error during connector cleanup:', error);
    }
  }

  // Event emitter implementation
  emit(event: ConnectorEvent): void {
    this.eventEmitter.emit(event.type, event);
  }

  on(eventType: string, handler: (event: ConnectorEvent) => void): void {
    this.eventEmitter.on(eventType, handler);
  }

  off(eventType: string, handler: (event: ConnectorEvent) => void): void {
    this.eventEmitter.off(eventType, handler);
  }

  // Protected methods for subclasses to implement
  protected abstract initializeConnection(): Promise<void>;
  protected abstract performConnectionTest(): Promise<boolean>;
  protected abstract performHealthCheck(): Promise<void>;
  protected abstract performRequest(request: ConnectorRequest): Promise<any>;
  protected abstract performAction(actionId: string, input: any): Promise<any>;
  protected abstract cleanup(): Promise<void>;

  // Utility methods
  protected async validateConfig(config: ConnectorConfig): Promise<void> {
    if (!config.id || !config.type || !config.credentials) {
      throw new Error('Invalid connector configuration: missing required fields');
    }
    
    // Validate against connector-specific requirements
    await this.validateConnectorSpecificConfig(config);
  }

  protected async validateConnectorSpecificConfig(config: ConnectorConfig): Promise<void> {
    // Override in subclasses for specific validation
  }

  protected async validateActionInput(actionId: string, input: any): Promise<void> {
    const metadata = this.getMetadata();

    // Skip validation for definition-based connectors (actions defined in .definition.ts files)
    // These connectors have actions: [] in getMetadata() and rely on database definitions
    if (!metadata.actions || metadata.actions.length === 0) {
      return;
    }

    const action = metadata.actions.find(a => a.id === actionId);

    if (!action) {
      throw new Error(`Action not found: ${actionId}`);
    }

    // Basic validation - extend as needed
    if (action.inputSchema) {
      // Implement schema validation logic here
      this.validateInputSchema(input, action.inputSchema);
    }
  }

  protected validateInputSchema(input: any, schema: any): void {
    // Basic schema validation - can be extended with a proper validator like Joi or Yup
    for (const [field, fieldSchema] of Object.entries(schema)) {
      if ((fieldSchema as any).required && !(field in input)) {
        throw new Error(`Required field missing: ${field}`);
      }
    }
  }

  protected async checkRateLimit(): Promise<void> {
    const rateLimitConfig = this.config.rateLimit || this.getMetadata().rateLimit;
    if (!rateLimitConfig) return;

    const now = Date.now();
    const windowKey = `${Math.floor(now / 60000)}`; // 1-minute windows
    
    const current = this.rateLimitTracker.get(windowKey) || { count: 0, resetTime: now + 60000 };
    
    if (rateLimitConfig.requestsPerMinute && current.count >= rateLimitConfig.requestsPerMinute) {
      const waitTime = current.resetTime - now;
      if (waitTime > 0) {
        this.emit({
          type: ConnectorEventType.RATE_LIMIT_REACHED,
          connectorId: this.config.id,
          timestamp: new Date(),
          data: { waitTime, rateLimit: rateLimitConfig },
          source: 'manual'
        });
        throw new Error(`Rate limit exceeded. Wait ${waitTime}ms before retrying.`);
      }
    }
    
    current.count++;
    this.rateLimitTracker.set(windowKey, current);
  }

  protected async executeWithRetry<T>(operation: () => Promise<T>): Promise<T> {
    const retryConfig = this.config.retryConfig || this.getDefaultRetryConfig();
    let lastError: any;
    
    for (let attempt = 0; attempt <= retryConfig.maxRetries; attempt++) {
      try {
        return await operation();
      } catch (error) {
        lastError = error;
        
        if (attempt === retryConfig.maxRetries || !this.shouldRetry(error, retryConfig)) {
          throw error;
        }
        
        const delay = this.calculateDelay(attempt, retryConfig);
        this.logger.warn(`Request failed, retrying in ${delay}ms. Attempt ${attempt + 1}/${retryConfig.maxRetries + 1}`);
        await this.sleep(delay);
      }
    }
    
    throw lastError;
  }

  protected shouldRetry(error: any, retryConfig: RetryConfig): boolean {
    // Check if error is retryable based on status code or error type
    if (retryConfig.retryOnStatusCodes?.includes(error.status || error.statusCode)) {
      return true;
    }
    
    if (retryConfig.retryOnErrors?.some(errorType => error.message?.includes(errorType))) {
      return true;
    }
    
    // Default retryable conditions
    const retryableStatusCodes = [408, 429, 500, 502, 503, 504];
    return retryableStatusCodes.includes(error.status || error.statusCode);
  }

  protected calculateDelay(attempt: number, retryConfig: RetryConfig): number {
    let delay: number;
    
    switch (retryConfig.backoffStrategy) {
      case 'exponential':
        delay = retryConfig.initialDelay * Math.pow(2, attempt);
        break;
      case 'linear':
        delay = retryConfig.initialDelay * (attempt + 1);
        break;
      case 'fixed':
      default:
        delay = retryConfig.initialDelay;
        break;
    }
    
    return Math.min(delay, retryConfig.maxDelay);
  }

  protected getDefaultRetryConfig(): RetryConfig {
    return {
      maxRetries: 3,
      backoffStrategy: 'exponential',
      initialDelay: 1000,
      maxDelay: 30000,
      retryOnStatusCodes: [408, 429, 500, 502, 503, 504]
    };
  }

  protected async getRateLimitInfo(): Promise<{ remaining: number; reset: Date } | undefined> {
    // Override in subclasses to provide rate limit info from API responses
    return undefined;
  }

  protected updateUsageStats(responseTime: number, success: boolean): void {
    this.usageStats.requestCount++;
    this.usageStats.lastUsed = new Date();
    
    if (!success) {
      this.usageStats.errorCount++;
    }
    
    if (responseTime > 0) {
      this.responseTimeSamples.push(responseTime);
      // Keep only last 100 samples for rolling average
      if (this.responseTimeSamples.length > 100) {
        this.responseTimeSamples.shift();
      }
      
      this.usageStats.avgResponseTime = 
        this.responseTimeSamples.reduce((sum, time) => sum + time, 0) / this.responseTimeSamples.length;
    }
  }

  protected handleError(error: any, context: string): ConnectorResponse {
    this.logger.error(`${context}:`, error);
    
    const connectorError: ConnectorError = {
      code: error.code || 'UNKNOWN_ERROR',
      message: error.message || 'An unknown error occurred',
      details: error.details || error,
      statusCode: error.status || error.statusCode,
      retryable: this.shouldRetry(error, this.getDefaultRetryConfig())
    };
    
    this.emit({
      type: ConnectorEventType.ERROR_OCCURRED,
      connectorId: this.config?.id || 'unknown',
      timestamp: new Date(),
      data: connectorError,
      source: 'manual'
    });
    
    return {
      success: false,
      error: connectorError,
      metadata: {
        timestamp: new Date()
      }
    };
  }

  protected async sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  private setupEventHandlers(): void {
    // Set up default event handlers
    this.on(ConnectorEventType.ERROR_OCCURRED, (event) => {
      this.logger.error(`Connector error in ${event.connectorId}:`, event.data);
    });
    
    this.on(ConnectorEventType.RATE_LIMIT_REACHED, (event) => {
      this.logger.warn(`Rate limit reached for connector ${event.connectorId}:`, event.data);
    });
  }
}