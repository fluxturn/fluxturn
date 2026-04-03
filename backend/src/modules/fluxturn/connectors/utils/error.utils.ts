import { Request } from 'express';
import { Injectable, Logger } from '@nestjs/common';
import {
  ConnectorError,
  ConnectorResponse,
  ConnectorEventType
} from '../types';

export enum ErrorSeverity {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  CRITICAL = 'critical'
}

export enum ErrorCategory {
  AUTHENTICATION = 'authentication',
  AUTHORIZATION = 'authorization',
  NETWORK = 'network',
  RATE_LIMIT = 'rate_limit',
  VALIDATION = 'validation',
  CONFIGURATION = 'configuration',
  SERVICE_UNAVAILABLE = 'service_unavailable',
  TIMEOUT = 'timeout',
  UNKNOWN = 'unknown'
}

export interface ErrorContext {
  connectorId?: string;
  connectorType?: string;
  action?: string;
  requestId?: string;
  userId?: string;
  projectId?: string;
  timestamp: Date;
  additionalData?: Record<string, any>;
}

export interface ErrorAnalysis {
  category: ErrorCategory;
  severity: ErrorSeverity;
  retryable: boolean;
  retryAfter?: number;
  suggestions: string[];
  relatedErrors?: string[];
}

@Injectable()
export class ErrorUtils {
  private readonly logger = new Logger(ErrorUtils.name);
  private readonly errorPatterns = new Map<string, ErrorAnalysis>();
  private readonly errorHistory = new Map<string, Array<{ error: ConnectorError; context: ErrorContext }>>();

  constructor() {
    this.initializeErrorPatterns();
  }

  /**
   * Create a standardized connector error
   */
  createError(
    code: string,
    message: string,
    options?: {
      details?: any;
      statusCode?: number;
      retryable?: boolean;
      retryAfter?: number;
      category?: ErrorCategory;
      severity?: ErrorSeverity;
    }
  ): ConnectorError {
    const analysis = this.analyzeError(code, message, options?.statusCode);
    
    return {
      code,
      message,
      details: options?.details,
      statusCode: options?.statusCode,
      retryable: options?.retryable ?? analysis.retryable,
      retryAfter: options?.retryAfter ?? analysis.retryAfter,
      category: options?.category ?? analysis.category,
      severity: options?.severity ?? analysis.severity
    } as ConnectorError & { category: ErrorCategory; severity: ErrorSeverity };
  }

  /**
   * Wrap error in connector response format
   */
  createErrorResponse<T = any>(
    error: ConnectorError | Error | any,
    context?: ErrorContext
  ): ConnectorResponse<T> {
    let connectorError: ConnectorError;
    
    if (this.isConnectorError(error)) {
      connectorError = error;
    } else if (error instanceof Error) {
      connectorError = this.fromStandardError(error);
    } else {
      connectorError = this.fromUnknownError(error);
    }
    
    // Log error with context
    this.logError(connectorError, context);
    
    // Track error history
    if (context?.connectorId) {
      this.trackError(context.connectorId, connectorError, context);
    }
    
    return {
      success: false,
      error: connectorError,
      metadata: {
        timestamp: new Date(),
        requestId: context?.requestId
      }
    };
  }

  /**
   * Analyze error and provide insights
   */
  analyzeError(
    code: string,
    message: string,
    statusCode?: number
  ): ErrorAnalysis {
    // Check predefined patterns
    const pattern = this.errorPatterns.get(code);
    if (pattern) {
      return { ...pattern };
    }
    
    // Analyze based on status code
    if (statusCode) {
      return this.analyzeByStatusCode(statusCode);
    }
    
    // Analyze based on message content
    return this.analyzeByMessage(message);
  }

  /**
   * Get error suggestions based on error type
   */
  getErrorSuggestions(error: ConnectorError): string[] {
    const analysis = this.analyzeError(error.code, error.message, error.statusCode);
    const suggestions = [...analysis.suggestions];
    
    // Add specific suggestions based on error context
    if (error.retryable && error.retryAfter) {
      suggestions.unshift(`Retry after ${error.retryAfter} seconds`);
    } else if (error.retryable) {
      suggestions.unshift('This error is retryable, consider implementing retry logic');
    }
    
    return suggestions;
  }

  /**
   * Determine if error is recoverable
   */
  isRecoverable(error: ConnectorError): boolean {
    const nonRecoverableCategories = [
      ErrorCategory.AUTHENTICATION,
      ErrorCategory.AUTHORIZATION,
      ErrorCategory.CONFIGURATION,
      ErrorCategory.VALIDATION
    ];
    
    const category = (error as any).category;
    if (category && nonRecoverableCategories.includes(category)) {
      return false;
    }
    
    return error.retryable || false;
  }

  /**
   * Calculate retry delay based on error
   */
  calculateRetryDelay(
    error: ConnectorError,
    attempt: number,
    baseDelay: number = 1000
  ): number {
    if (error.retryAfter) {
      return error.retryAfter * 1000; // Convert to milliseconds
    }
    
    const severity = (error as any).severity;
    let multiplier = 1;
    
    switch (severity) {
      case ErrorSeverity.CRITICAL:
        multiplier = 4;
        break;
      case ErrorSeverity.HIGH:
        multiplier = 2;
        break;
      case ErrorSeverity.MEDIUM:
        multiplier = 1.5;
        break;
      default:
        multiplier = 1;
    }
    
    const delay = baseDelay * multiplier * Math.pow(2, attempt);
    return Math.min(delay, 60000); // Max 60 seconds
  }

  /**
   * Get error history for a connector
   */
  getErrorHistory(connectorId: string): Array<{ error: ConnectorError; context: ErrorContext }> {
    return this.errorHistory.get(connectorId) || [];
  }

  /**
   * Get error statistics
   */
  getErrorStats(connectorId?: string): {
    totalErrors: number;
    errorsByCategory: Record<ErrorCategory, number>;
    errorsBySeverity: Record<ErrorSeverity, number>;
    retryableErrors: number;
    nonRetryableErrors: number;
    recentErrors: number; // Last 24 hours
  } {
    let errors: Array<{ error: ConnectorError; context: ErrorContext }> = [];
    
    if (connectorId) {
      errors = this.getErrorHistory(connectorId);
    } else {
      // Aggregate all errors
      for (const connectorErrors of this.errorHistory.values()) {
        errors.push(...connectorErrors);
      }
    }
    
    const now = new Date();
    const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    
    const stats = {
      totalErrors: errors.length,
      errorsByCategory: {} as Record<ErrorCategory, number>,
      errorsBySeverity: {} as Record<ErrorSeverity, number>,
      retryableErrors: 0,
      nonRetryableErrors: 0,
      recentErrors: 0
    };
    
    // Initialize counters
    Object.values(ErrorCategory).forEach(category => {
      stats.errorsByCategory[category] = 0;
    });
    Object.values(ErrorSeverity).forEach(severity => {
      stats.errorsBySeverity[severity] = 0;
    });
    
    // Count errors
    for (const { error, context } of errors) {
      const category = (error as any).category || ErrorCategory.UNKNOWN;
      const severity = (error as any).severity || ErrorSeverity.MEDIUM;
      
      stats.errorsByCategory[category]++;
      stats.errorsBySeverity[severity]++;
      
      if (error.retryable) {
        stats.retryableErrors++;
      } else {
        stats.nonRetryableErrors++;
      }
      
      if (context.timestamp >= oneDayAgo) {
        stats.recentErrors++;
      }
    }
    
    return stats;
  }

  /**
   * Clear error history for a connector
   */
  clearErrorHistory(connectorId: string): void {
    this.errorHistory.delete(connectorId);
    this.logger.log(`Cleared error history for connector: ${connectorId}`);
  }

  /**
   * Handle error and return a ConnectorResponse
   */
  handleError<T = any>(error: any, action: string): ConnectorResponse<T> {
    const context: ErrorContext = {
      action,
      timestamp: new Date()
    };

    return this.createErrorResponse<T>(error, context);
  }

  /**
   * Sanitize error for client response
   */
  sanitizeError(error: ConnectorError): ConnectorError {
    const sanitized = { ...error };
    
    // Remove sensitive information from details
    if (sanitized.details && typeof sanitized.details === 'object') {
      sanitized.details = this.removeSensitiveData(sanitized.details);
    }
    
    return sanitized;
  }

  /**
   * Check if object is a ConnectorError
   */
  private isConnectorError(error: any): error is ConnectorError {
    return error && typeof error === 'object' && 'code' in error && 'message' in error;
  }

  /**
   * Convert standard Error to ConnectorError
   */
  private fromStandardError(error: Error): ConnectorError {
    return this.createError(
      'STANDARD_ERROR',
      error.message,
      {
        details: {
          name: error.name,
          stack: error.stack
        },
        category: ErrorCategory.UNKNOWN,
        severity: ErrorSeverity.MEDIUM
      }
    );
  }

  /**
   * Convert unknown error to ConnectorError
   */
  private fromUnknownError(error: any): ConnectorError {
    return this.createError(
      'UNKNOWN_ERROR',
      error?.message || 'An unknown error occurred',
      {
        details: error,
        category: ErrorCategory.UNKNOWN,
        severity: ErrorSeverity.LOW
      }
    );
  }

  /**
   * Analyze error by HTTP status code
   */
  private analyzeByStatusCode(statusCode: number): ErrorAnalysis {
    switch (statusCode) {
      case 400:
        return {
          category: ErrorCategory.VALIDATION,
          severity: ErrorSeverity.MEDIUM,
          retryable: false,
          suggestions: ['Check request format and required parameters']
        };
      case 401:
        return {
          category: ErrorCategory.AUTHENTICATION,
          severity: ErrorSeverity.HIGH,
          retryable: false,
          suggestions: ['Check authentication credentials', 'Refresh access token if expired']
        };
      case 403:
        return {
          category: ErrorCategory.AUTHORIZATION,
          severity: ErrorSeverity.HIGH,
          retryable: false,
          suggestions: ['Check user permissions', 'Verify API scope requirements']
        };
      case 404:
        return {
          category: ErrorCategory.VALIDATION,
          severity: ErrorSeverity.MEDIUM,
          retryable: false,
          suggestions: ['Check resource URL or ID', 'Verify resource exists']
        };
      case 429:
        return {
          category: ErrorCategory.RATE_LIMIT,
          severity: ErrorSeverity.MEDIUM,
          retryable: true,
          retryAfter: 60,
          suggestions: ['Implement rate limiting', 'Reduce request frequency']
        };
      case 500:
      case 502:
      case 503:
      case 504:
        return {
          category: ErrorCategory.SERVICE_UNAVAILABLE,
          severity: ErrorSeverity.HIGH,
          retryable: true,
          suggestions: ['Server error, retry with exponential backoff']
        };
      default:
        return {
          category: ErrorCategory.UNKNOWN,
          severity: ErrorSeverity.MEDIUM,
          retryable: statusCode >= 500,
          suggestions: ['Check API documentation for status code meaning']
        };
    }
  }

  /**
   * Analyze error by message content
   */
  private analyzeByMessage(message: string): ErrorAnalysis {
    const lowerMessage = message.toLowerCase();
    
    if (lowerMessage.includes('timeout') || lowerMessage.includes('timed out')) {
      return {
        category: ErrorCategory.TIMEOUT,
        severity: ErrorSeverity.MEDIUM,
        retryable: true,
        suggestions: ['Increase timeout value', 'Check network connectivity']
      };
    }
    
    if (lowerMessage.includes('network') || lowerMessage.includes('connection')) {
      return {
        category: ErrorCategory.NETWORK,
        severity: ErrorSeverity.HIGH,
        retryable: true,
        suggestions: ['Check network connectivity', 'Verify service endpoint']
      };
    }
    
    if (lowerMessage.includes('rate limit') || lowerMessage.includes('too many requests')) {
      return {
        category: ErrorCategory.RATE_LIMIT,
        severity: ErrorSeverity.MEDIUM,
        retryable: true,
        retryAfter: 60,
        suggestions: ['Implement rate limiting', 'Use exponential backoff']
      };
    }
    
    return {
      category: ErrorCategory.UNKNOWN,
      severity: ErrorSeverity.MEDIUM,
      retryable: false,
      suggestions: ['Check error message details', 'Consult API documentation']
    };
  }

  /**
   * Log error with appropriate level
   */
  private logError(error: ConnectorError, context?: ErrorContext): void {
    const severity = (error as any).severity || ErrorSeverity.MEDIUM;
    const logMessage = `Connector error [${error.code}]: ${error.message}`;
    const logContext = {
      error,
      context,
      statusCode: error.statusCode,
      retryable: error.retryable
    };
    
    switch (severity) {
      case ErrorSeverity.CRITICAL:
        this.logger.error(logMessage, logContext);
        break;
      case ErrorSeverity.HIGH:
        this.logger.error(logMessage, logContext);
        break;
      case ErrorSeverity.MEDIUM:
        this.logger.warn(logMessage, logContext);
        break;
      case ErrorSeverity.LOW:
        this.logger.log(logMessage, logContext);
        break;
    }
  }

  /**
   * Track error in history
   */
  private trackError(
    connectorId: string,
    error: ConnectorError,
    context: ErrorContext
  ): void {
    if (!this.errorHistory.has(connectorId)) {
      this.errorHistory.set(connectorId, []);
    }
    
    const errors = this.errorHistory.get(connectorId)!;
    errors.push({ error, context });
    
    // Keep only last 100 errors per connector
    if (errors.length > 100) {
      errors.splice(0, errors.length - 100);
    }
  }

  /**
   * Remove sensitive data from error details
   */
  private removeSensitiveData(data: any): any {
    if (typeof data !== 'object' || data === null) {
      return data;
    }
    
    const sensitiveFields = [
      'password', 'secret', 'token', 'key', 'authorization',
      'cookie', 'session', 'credential', 'auth'
    ];
    
    const sanitized = { ...data };
    
    for (const field of Object.keys(sanitized)) {
      const lowerField = field.toLowerCase();
      
      if (sensitiveFields.some(sensitive => lowerField.includes(sensitive))) {
        sanitized[field] = '[REDACTED]';
      } else if (typeof sanitized[field] === 'object') {
        sanitized[field] = this.removeSensitiveData(sanitized[field]);
      }
    }
    
    return sanitized;
  }

  /**
   * Initialize common error patterns
   */
  private initializeErrorPatterns(): void {
    this.errorPatterns.set('RATE_LIMIT_EXCEEDED', {
      category: ErrorCategory.RATE_LIMIT,
      severity: ErrorSeverity.MEDIUM,
      retryable: true,
      retryAfter: 60,
      suggestions: ['Implement exponential backoff', 'Reduce request frequency']
    });
    
    this.errorPatterns.set('INVALID_API_KEY', {
      category: ErrorCategory.AUTHENTICATION,
      severity: ErrorSeverity.HIGH,
      retryable: false,
      suggestions: ['Verify API key', 'Check key permissions']
    });
    
    this.errorPatterns.set('TOKEN_EXPIRED', {
      category: ErrorCategory.AUTHENTICATION,
      severity: ErrorSeverity.MEDIUM,
      retryable: true,
      suggestions: ['Refresh access token', 'Re-authenticate user']
    });
    
    this.errorPatterns.set('INSUFFICIENT_PERMISSIONS', {
      category: ErrorCategory.AUTHORIZATION,
      severity: ErrorSeverity.HIGH,
      retryable: false,
      suggestions: ['Check user permissions', 'Verify required scopes']
    });
    
    this.errorPatterns.set('SERVICE_UNAVAILABLE', {
      category: ErrorCategory.SERVICE_UNAVAILABLE,
      severity: ErrorSeverity.HIGH,
      retryable: true,
      suggestions: ['Service temporarily unavailable', 'Retry with backoff']
    });
  }
}