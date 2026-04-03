import { Injectable } from '@nestjs/common';
import {
  BaseNodeExecutor,
  NodeData,
  NodeInputItem,
  NodeExecutionContext,
  NodeExecutionResult,
} from '../base';

/**
 * Transform Data Executor
 * Transforms data using expressions or JSONata
 */
@Injectable()
export class TransformDataExecutor extends BaseNodeExecutor {
  readonly supportedTypes = ['TRANSFORM_DATA'];

  protected async executeInternal(
    node: NodeData,
    inputData: NodeInputItem[],
    context: NodeExecutionContext,
  ): Promise<NodeExecutionResult> {
    const config = node.data || {};
    const results: NodeInputItem[] = [];

    for (const item of inputData) {
      const itemContext = this.buildItemContext(item, context);
      const expression = config.expression;

      // TODO: Integrate JSONata library for complex transformations
      // For now, simple expression resolution
      const transformed = this.resolveExpression(expression, itemContext);

      results.push({
        json: transformed
      });
    }

    return results;
  }
}
