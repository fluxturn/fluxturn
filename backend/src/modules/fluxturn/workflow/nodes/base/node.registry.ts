import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import {
  INodeExecutor,
  NodeExecutorMetadata,
  NodeCategory,
  NodeExecutorRegistration,
} from './node-executor.interface';

/**
 * Central registry for all node executors
 * Similar pattern to ConnectorRegistry but for workflow nodes
 */
@Injectable()
export class NodeRegistry implements OnModuleInit {
  private readonly logger = new Logger(NodeRegistry.name);

  // Map: nodeType -> executor instance
  private readonly executors = new Map<string, INodeExecutor>();

  // Map: nodeType -> metadata
  private readonly metadata = new Map<string, NodeExecutorMetadata>();

  // Map: category -> nodeTypes[]
  private readonly categoryMap = new Map<NodeCategory, string[]>();

  // Statistics
  private stats = {
    total: 0,
    successful: 0,
    failed: 0,
  };

  async onModuleInit(): Promise<void> {
    this.logger.log(`Node registry initialized with ${this.executors.size} executors`);
  }

  /**
   * Register an executor instance for its supported types
   */
  registerExecutor(
    executor: INodeExecutor,
    options: NodeExecutorRegistration,
  ): void {
    for (const nodeType of executor.supportedTypes) {
      this.executors.set(nodeType, executor);

      this.metadata.set(nodeType, {
        executor,
        category: options.category,
        description: options.description,
        version: options.version || '1.0.0',
        registeredAt: new Date(),
      });

      // Update category mapping
      if (!this.categoryMap.has(options.category)) {
        this.categoryMap.set(options.category, []);
      }
      const categoryTypes = this.categoryMap.get(options.category)!;
      if (!categoryTypes.includes(nodeType)) {
        categoryTypes.push(nodeType);
      }
    }

    this.logger.log(
      `Registered executor ${executor.constructor.name} for types: ${executor.supportedTypes.join(', ')}`
    );
  }

  /**
   * Register multiple executors at once
   */
  registerExecutors(
    registrations: Array<{
      executor: INodeExecutor;
      options: NodeExecutorRegistration;
    }>,
  ): void {
    for (const { executor, options } of registrations) {
      this.registerExecutor(executor, options);
    }
  }

  /**
   * Get executor for a node type
   */
  getExecutor(nodeType: string): INodeExecutor | undefined {
    return this.executors.get(nodeType);
  }

  /**
   * Check if node type is registered
   */
  hasExecutor(nodeType: string): boolean {
    return this.executors.has(nodeType);
  }

  /**
   * Get all registered node types
   */
  getRegisteredTypes(): string[] {
    return Array.from(this.executors.keys());
  }

  /**
   * Get node types by category
   */
  getTypesByCategory(category: NodeCategory): string[] {
    return this.categoryMap.get(category) || [];
  }

  /**
   * Get metadata for a node type
   */
  getMetadata(nodeType: string): NodeExecutorMetadata | undefined {
    return this.metadata.get(nodeType);
  }

  /**
   * Get all available categories
   */
  getCategories(): NodeCategory[] {
    return Array.from(this.categoryMap.keys());
  }

  /**
   * Get registry statistics
   */
  getStats(): {
    totalExecutors: number;
    totalTypes: number;
    byCategory: Record<string, number>;
    executions: { total: number; successful: number; failed: number };
  } {
    const byCategory: Record<string, number> = {};
    for (const [category, types] of this.categoryMap) {
      byCategory[category] = types.length;
    }

    return {
      totalExecutors: new Set(this.executors.values()).size,
      totalTypes: this.executors.size,
      byCategory,
      executions: { ...this.stats },
    };
  }

  /**
   * Record execution statistics
   */
  recordExecution(success: boolean): void {
    this.stats.total++;
    if (success) {
      this.stats.successful++;
    } else {
      this.stats.failed++;
    }
  }

  /**
   * Get all executors grouped by category
   */
  getExecutorsByCategory(): Map<NodeCategory, INodeExecutor[]> {
    const result = new Map<NodeCategory, INodeExecutor[]>();

    for (const [category, types] of this.categoryMap) {
      const executors = new Set<INodeExecutor>();
      for (const type of types) {
        const executor = this.executors.get(type);
        if (executor) {
          executors.add(executor);
        }
      }
      result.set(category, Array.from(executors));
    }

    return result;
  }

  /**
   * Unregister a node type
   */
  unregister(nodeType: string): boolean {
    const meta = this.metadata.get(nodeType);
    if (!meta) {
      return false;
    }

    this.executors.delete(nodeType);
    this.metadata.delete(nodeType);

    // Remove from category mapping
    const categoryTypes = this.categoryMap.get(meta.category);
    if (categoryTypes) {
      const index = categoryTypes.indexOf(nodeType);
      if (index > -1) {
        categoryTypes.splice(index, 1);
      }
    }

    this.logger.log(`Unregistered node type: ${nodeType}`);
    return true;
  }

  /**
   * Reset statistics
   */
  resetStats(): void {
    this.stats = {
      total: 0,
      successful: 0,
      failed: 0,
    };
  }

  /**
   * Get health summary
   */
  getHealthSummary(): {
    totalTypes: number;
    categoriesCount: number;
    categories: string[];
    stats: typeof this.stats;
  } {
    return {
      totalTypes: this.executors.size,
      categoriesCount: this.categoryMap.size,
      categories: Array.from(this.categoryMap.keys()),
      stats: { ...this.stats },
    };
  }
}
