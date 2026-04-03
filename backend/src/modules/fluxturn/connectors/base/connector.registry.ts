import { Request } from 'express';
import { Injectable, Logger, Type } from '@nestjs/common';
import { IConnector } from './connector.interface';
import { ConnectorType, ConnectorCategory } from '../types';

export interface ConnectorRegistration {
  type: ConnectorType;
  category: ConnectorCategory;
  connectorClass: Type<IConnector>;
  description?: string;
  version?: string;
  isActive?: boolean;
  registeredAt: Date;
}

@Injectable()
export class ConnectorRegistry {
  private readonly logger = new Logger(ConnectorRegistry.name);
  private readonly connectors = new Map<ConnectorType, ConnectorRegistration>();
  private readonly categoryMap = new Map<ConnectorCategory, ConnectorType[]>();
  private creationStats = {
    totalAttempts: 0,
    successful: 0,
    failed: 0
  };

  constructor() {
    this.initializeDefaultConnectors();
  }

  /**
   * Register a connector class
   */
  register(
    type: ConnectorType,
    category: ConnectorCategory,
    connectorClass: Type<IConnector>,
    options?: {
      description?: string;
      version?: string;
      isActive?: boolean;
    }
  ): void {
    const registration: ConnectorRegistration = {
      type,
      category,
      connectorClass,
      description: options?.description,
      version: options?.version || '1.0.0',
      isActive: options?.isActive !== false,
      registeredAt: new Date()
    };

    this.connectors.set(type, registration);
    
    // Update category mapping
    if (!this.categoryMap.has(category)) {
      this.categoryMap.set(category, []);
    }
    const categoryConnectors = this.categoryMap.get(category)!;
    if (!categoryConnectors.includes(type)) {
      categoryConnectors.push(type);
    }

    this.logger.log(`Registered connector: ${type} (${category})`);
  }

  /**
   * Unregister a connector
   */
  unregister(type: ConnectorType): boolean {
    const registration = this.connectors.get(type);
    if (!registration) {
      return false;
    }

    // Remove from main registry
    this.connectors.delete(type);

    // Remove from category mapping
    const categoryConnectors = this.categoryMap.get(registration.category);
    if (categoryConnectors) {
      const index = categoryConnectors.indexOf(type);
      if (index > -1) {
        categoryConnectors.splice(index, 1);
      }
    }

    this.logger.log(`Unregistered connector: ${type}`);
    return true;
  }

  /**
   * Get connector class by type
   */
  getConnector(type: ConnectorType): Type<IConnector> | undefined {
    const registration = this.connectors.get(type);
    if (!registration || !registration.isActive) {
      return undefined;
    }
    
    this.creationStats.totalAttempts++;
    try {
      this.creationStats.successful++;
      return registration.connectorClass;
    } catch (error) {
      this.creationStats.failed++;
      throw error;
    }
  }

  /**
   * Get connector registration info
   */
  getConnectorInfo(type: ConnectorType): ConnectorRegistration | undefined {
    return this.connectors.get(type);
  }

  /**
   * Check if connector type is registered
   */
  isRegistered(type: ConnectorType): boolean {
    const registration = this.connectors.get(type);
    return registration !== undefined && registration.isActive === true;
  }

  /**
   * Get all registered connectors
   */
  getAllConnectors(): Map<ConnectorType, ConnectorRegistration> {
    return new Map(this.connectors);
  }

  /**
   * Get connectors by category
   */
  getConnectorsByCategory(category: ConnectorCategory): ConnectorRegistration[] {
    const types = this.categoryMap.get(category) || [];
    return types
      .map(type => this.connectors.get(type))
      .filter((reg): reg is ConnectorRegistration => reg !== undefined && reg.isActive === true);
  }

  /**
   * Get available connector types
   */
  getAvailableConnectors(category?: ConnectorCategory): Array<{
    type: ConnectorType;
    category: ConnectorCategory;
    className: string;
    description?: string;
    version?: string;
    isActive: boolean;
    registeredAt: Date;
  }> {
    const connectors = Array.from(this.connectors.values());
    const filtered = category 
      ? connectors.filter(c => c.category === category)
      : connectors;

    return filtered.map(registration => ({
      type: registration.type,
      category: registration.category,
      className: registration.connectorClass.name,
      description: registration.description,
      version: registration.version,
      isActive: registration.isActive || false,
      registeredAt: registration.registeredAt
    }));
  }

  /**
   * Get available categories
   */
  getAvailableCategories(): ConnectorCategory[] {
    return Array.from(this.categoryMap.keys());
  }

  /**
   * Get creation statistics
   */
  getCreationStats(): { totalAttempts: number; successful: number; failed: number } {
    return { ...this.creationStats };
  }

  /**
   * Get registered connector count
   */
  getRegisteredCount(): number {
    return Array.from(this.connectors.values()).filter(r => r.isActive).length;
  }

  /**
   * Enable/disable a connector
   */
  setConnectorStatus(type: ConnectorType, isActive: boolean): boolean {
    const registration = this.connectors.get(type);
    if (!registration) {
      return false;
    }

    registration.isActive = isActive;
    this.logger.log(`Connector ${type} ${isActive ? 'enabled' : 'disabled'}`);
    return true;
  }

  /**
   * Bulk register connectors
   */
  registerBulk(registrations: Array<{
    type: ConnectorType;
    category: ConnectorCategory;
    connectorClass: Type<IConnector>;
    description?: string;
    version?: string;
    isActive?: boolean;
  }>): void {
    for (const reg of registrations) {
      this.register(reg.type, reg.category, reg.connectorClass, {
        description: reg.description,
        version: reg.version,
        isActive: reg.isActive
      });
    }
  }

  /**
   * Search connectors by name or description
   */
  searchConnectors(query: string): ConnectorRegistration[] {
    const searchTerm = query.toLowerCase();
    return Array.from(this.connectors.values()).filter(registration => {
      if (!registration.isActive) return false;
      
      const typeMatch = registration.type.toLowerCase().includes(searchTerm);
      const descMatch = registration.description?.toLowerCase().includes(searchTerm) || false;
      const categoryMatch = registration.category.toLowerCase().includes(searchTerm);
      
      return typeMatch || descMatch || categoryMatch;
    });
  }

  /**
   * Get connector statistics by category
   */
  getCategoryStats(): Map<ConnectorCategory, { count: number; activeCount: number }> {
    const stats = new Map<ConnectorCategory, { count: number; activeCount: number }>();
    
    for (const registration of this.connectors.values()) {
      if (!stats.has(registration.category)) {
        stats.set(registration.category, { count: 0, activeCount: 0 });
      }
      
      const categoryStats = stats.get(registration.category)!;
      categoryStats.count++;
      if (registration.isActive) {
        categoryStats.activeCount++;
      }
    }
    
    return stats;
  }

  /**
   * Validate connector registration
   */
  validateRegistration(
    type: ConnectorType,
    category: ConnectorCategory,
    connectorClass: Type<IConnector>
  ): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (!type) {
      errors.push('Connector type is required');
    }

    if (!category) {
      errors.push('Connector category is required');
    }

    if (!connectorClass) {
      errors.push('Connector class is required');
    }

    // Check for duplicate registration
    if (this.connectors.has(type)) {
      errors.push(`Connector type already registered: ${type}`);
    }

    // Validate that the class implements IConnector interface
    try {
      const instance = new connectorClass();
      if (typeof instance.getMetadata !== 'function') {
        errors.push('Connector class must implement IConnector interface');
      }
    } catch (error) {
      errors.push(`Failed to instantiate connector class: ${error.message}`);
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }

  /**
   * Get connector health summary
   */
  getHealthSummary(): {
    totalConnectors: number;
    activeConnectors: number;
    inactiveConnectors: number;
    categoriesCount: number;
    creationStats: typeof this.creationStats;
  } {
    const totalConnectors = this.connectors.size;
    const activeConnectors = Array.from(this.connectors.values()).filter(r => r.isActive).length;
    
    return {
      totalConnectors,
      activeConnectors,
      inactiveConnectors: totalConnectors - activeConnectors,
      categoriesCount: this.categoryMap.size,
      creationStats: { ...this.creationStats }
    };
  }

  /**
   * Initialize default connectors (placeholder implementations)
   */
  private initializeDefaultConnectors(): void {
    // This would typically be done by importing actual connector implementations
    // For now, we'll just set up the registry structure
    this.logger.log('Connector registry initialized');
  }

  /**
   * Reset statistics
   */
  resetStats(): void {
    this.creationStats = {
      totalAttempts: 0,
      successful: 0,
      failed: 0
    };
    this.logger.log('Connector registry statistics reset');
  }

  /**
   * Export registry configuration
   */
  exportConfig(): Array<{
    type: ConnectorType;
    category: ConnectorCategory;
    className: string;
    isActive: boolean;
    version?: string;
    description?: string;
    registeredAt: Date;
  }> {
    return Array.from(this.connectors.entries()).map(([type, registration]) => ({
      type,
      category: registration.category,
      className: registration.connectorClass.name,
      isActive: registration.isActive || false,
      version: registration.version,
      description: registration.description,
      registeredAt: registration.registeredAt
    }));
  }
}