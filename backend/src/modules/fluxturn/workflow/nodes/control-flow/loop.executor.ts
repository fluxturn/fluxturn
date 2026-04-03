import { Injectable } from '@nestjs/common';
import {
  BaseNodeExecutor,
  NodeData,
  NodeInputItem,
  NodeExecutionContext,
  NodeExecutionResult,
} from '../base';

/**
 * Loop Executor
 * Iterates over an array and outputs each item separately
 */
@Injectable()
export class LoopExecutor extends BaseNodeExecutor {
  readonly supportedTypes = ['LOOP'];

  protected async executeInternal(
    node: NodeData,
    inputData: NodeInputItem[],
    context: NodeExecutionContext,
  ): Promise<NodeExecutionResult> {
    const config = node.data || {};

    this.logger.log(`=== LOOP NODE EXECUTION ===`);
    this.logger.log(`Input data count: ${inputData.length}`);
    this.logger.log(`Items expression: ${config.items}`);

    // Validate configuration
    if (!config.items) {
      throw this.configurationError(node.data?.label || node.id, 'items expression');
    }

    const results: NodeInputItem[] = [];

    // Process each input item
    for (const item of inputData) {
      const itemContext = this.buildItemContext(item, context);

      // Resolve the items expression
      const itemsToLoop = this.resolveExpression(config.items, itemContext);

      this.logger.log(`Resolved items type: ${typeof itemsToLoop}`);
      this.logger.log(`Is array: ${Array.isArray(itemsToLoop)}`);

      if (!Array.isArray(itemsToLoop)) {
        throw new Error(
          `Loop items expression did not return an array. Expression: ${config.items}`
        );
      }

      this.logger.log(`Loop will iterate over ${itemsToLoop.length} items`);

      // Apply max iterations if configured
      const maxIterations = config.maxIterations || itemsToLoop.length;
      const itemsToProcess = itemsToLoop.slice(0, maxIterations);

      // Output each item separately
      for (const loopItem of itemsToProcess) {
        results.push({
          json: loopItem
        });
      }
    }

    this.logger.log(`Loop output: ${results.length} items`);
    this.logger.log(`=== LOOP NODE EXECUTION COMPLETE ===`);

    return results;
  }
}
