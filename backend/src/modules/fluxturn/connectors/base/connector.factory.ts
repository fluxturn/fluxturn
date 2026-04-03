import { Request } from 'express';
import { Injectable, Logger, Type } from '@nestjs/common';
import { ModuleRef } from '@nestjs/core';
import { IConnector } from './connector.interface';
import { ConnectorConfig, ConnectorType, ConnectorCategory } from '../types';
import { ConnectorRegistry } from './connector.registry';

export interface ConnectorConstructor {
  new (...args: any[]): IConnector;
}

@Injectable()
export class ConnectorFactory {
  private readonly logger = new Logger(ConnectorFactory.name);

  constructor(
    private readonly moduleRef: ModuleRef,
    private readonly connectorRegistry: ConnectorRegistry
  ) {}

  /**
   * Create a connector instance based on type
   */
  async createConnector(config: ConnectorConfig): Promise<IConnector> {
    try {
      this.logger.debug(`Creating connector: ${config.type}`);
      
      const connectorClass = this.connectorRegistry.getConnector(config.type);
      if (!connectorClass) {
        throw new Error(`Connector type not registered: ${config.type}`);
      }

      // Get the connector instance from NestJS DI container
      const connector = await this.moduleRef.create(connectorClass);
      
      // Initialize the connector with configuration
      await connector.initialize(config);
      
      this.logger.log(`Successfully created connector: ${config.type} (${config.id})`);
      return connector;
      
    } catch (error) {
      this.logger.error(`Failed to create connector ${config.type}:`, error);
      throw new Error(`Failed to create connector ${config.type}: ${error.message}`);
    }
  }

  /**
   * Create multiple connectors from configurations
   */
  async createConnectors(configs: ConnectorConfig[]): Promise<Map<string, IConnector>> {
    const connectors = new Map<string, IConnector>();
    const errors: Array<{ config: ConnectorConfig; error: Error }> = [];

    for (const config of configs) {
      try {
        const connector = await this.createConnector(config);
        connectors.set(config.id, connector);
      } catch (error) {
        errors.push({ config, error });
        this.logger.error(`Failed to create connector ${config.id}:`, error);
      }
    }

    if (errors.length > 0) {
      this.logger.warn(`${errors.length} connectors failed to initialize out of ${configs.length}`);
    }

    return connectors;
  }

  /**
   * Test connector creation without persistence
   */
  async testConnector(config: ConnectorConfig): Promise<{ success: boolean; error?: string; metadata?: any }> {
    try {
      const connector = await this.createConnector(config);
      const testResult = await connector.testConnection();
      const metadata = connector.getMetadata();
      
      // Try to get health status before destroying connector
      let healthStatus;
      try {
        healthStatus = await connector.getHealthStatus();
      } catch (healthError) {
        this.logger.warn(`Failed to get health status during test: ${healthError.message}`);
      }
      
      // Clean up test connector
      await connector.destroy();

      return {
        success: testResult.success,
        error: testResult.error?.message,
        metadata: {
          connectorMetadata: metadata,
          healthStatus
        }
      };
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Get available connector types for a category
   */
  getAvailableConnectors(category?: ConnectorCategory): Array<{
    type: ConnectorType;
    category: ConnectorCategory;
    className: string;
    metadata?: any;
  }> {
    return this.connectorRegistry.getAvailableConnectors(category);
  }

  /**
   * Validate connector configuration
   */
  validateConnectorConfig(config: ConnectorConfig): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    // Basic validation
    if (!config.id) {
      errors.push('Connector ID is required');
    }

    if (!config.type) {
      errors.push('Connector type is required');
    }

    if (!config.name) {
      errors.push('Connector name is required');
    }

    if (!config.credentials || Object.keys(config.credentials).length === 0) {
      errors.push('Connector credentials are required');
    }

    // Check if connector type is registered
    if (config.type && !this.connectorRegistry.isRegistered(config.type)) {
      errors.push(`Connector type not registered: ${config.type}`);
    }

    // Validate category matches type
    if (config.type && config.category) {
      const registeredConnector = this.connectorRegistry.getConnectorInfo(config.type);
      if (registeredConnector && registeredConnector.category !== config.category) {
        errors.push(`Category mismatch: expected ${registeredConnector.category}, got ${config.category}`);
      }
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }

  /**
   * Clone connector configuration for testing
   */
  cloneConnectorConfig(config: ConnectorConfig, overrides?: Partial<ConnectorConfig>): ConnectorConfig {
    return {
      ...config,
      ...overrides,
      id: overrides?.id || `${config.id}_clone_${Date.now()}`,
      credentials: {
        ...config.credentials,
        ...overrides?.credentials
      },
      settings: {
        ...config.settings,
        ...overrides?.settings
      }
    };
  }

  /**
   * Get connector metadata without instantiation
   */
  getConnectorMetadata(type: ConnectorType): any {
    try {
      const connectorClass = this.connectorRegistry.getConnector(type);
      if (!connectorClass) {
        throw new Error(`Connector type not registered: ${type}`);
      }

      // Create a temporary instance to get metadata
      const tempInstance = new connectorClass();
      return tempInstance.getMetadata();
    } catch (error) {
      this.logger.error(`Failed to get metadata for connector ${type}:`, error);
      return null;
    }
  }

  /**
   * Bulk validate connector configurations
   */
  validateConnectorConfigs(configs: ConnectorConfig[]): {
    valid: ConnectorConfig[];
    invalid: Array<{ config: ConnectorConfig; errors: string[] }>;
  } {
    const valid: ConnectorConfig[] = [];
    const invalid: Array<{ config: ConnectorConfig; errors: string[] }> = [];

    for (const config of configs) {
      const validation = this.validateConnectorConfig(config);
      if (validation.valid) {
        valid.push(config);
      } else {
        invalid.push({
          config,
          errors: validation.errors
        });
      }
    }

    return { valid, invalid };
  }

  /**
   * Get connector creation statistics
   */
  getCreationStats(): {
    totalAttempts: number;
    successfulCreations: number;
    failedCreations: number;
    registeredTypes: number;
    availableCategories: ConnectorCategory[];
  } {
    return {
      totalAttempts: this.connectorRegistry.getCreationStats().totalAttempts,
      successfulCreations: this.connectorRegistry.getCreationStats().successful,
      failedCreations: this.connectorRegistry.getCreationStats().failed,
      registeredTypes: this.connectorRegistry.getRegisteredCount(),
      availableCategories: this.connectorRegistry.getAvailableCategories()
    };
  }

  /**
   * Create connector with retry logic
   */
  async createConnectorWithRetry(
    config: ConnectorConfig,
    maxRetries: number = 3,
    retryDelay: number = 1000
  ): Promise<IConnector> {
    let lastError: Error = new Error('Failed to create connector');

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        return await this.createConnector(config);
      } catch (error) {
        lastError = error;
        
        if (attempt === maxRetries) {
          this.logger.error(`Failed to create connector after ${maxRetries} attempts:`, error);
          break;
        }
        
        this.logger.warn(`Connector creation attempt ${attempt} failed, retrying in ${retryDelay}ms:`, error.message);
        await new Promise(resolve => setTimeout(resolve, retryDelay));
        retryDelay *= 2; // Exponential backoff
      }
    }

    throw lastError || new Error('Failed to create connector after maximum retries');
  }

  /**
   * Gracefully destroy connector
   */
  async destroyConnector(connector: IConnector): Promise<void> {
    try {
      await connector.destroy();
    } catch (error) {
      this.logger.error('Error destroying connector:', error);
      throw error;
    }
  }
}