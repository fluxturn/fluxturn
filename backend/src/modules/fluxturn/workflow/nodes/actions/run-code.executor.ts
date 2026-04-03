import { Injectable } from '@nestjs/common';
import {
  BaseNodeExecutor,
  NodeData,
  NodeInputItem,
  NodeExecutionContext,
  NodeExecutionResult,
} from '../base';

/**
 * Run Code Executor
 * Executes custom JavaScript code
 */
@Injectable()
export class RunCodeExecutor extends BaseNodeExecutor {
  readonly supportedTypes = ['RUN_CODE'];

  protected async executeInternal(
    node: NodeData,
    inputData: NodeInputItem[],
    context: NodeExecutionContext,
  ): Promise<NodeExecutionResult> {
    const config = node.data || {};
    const results: NodeInputItem[] = [];

    // Validate required configuration
    const code = config.code;
    if (!code || code.trim() === '') {
      throw this.configurationError(node.data?.label || node.id, 'code');
    }

    this.logger.log('Run Code - Executing code');

    for (const item of inputData) {
      try {
        const data = item.json || item;

        // TODO: Use vm2 or isolated-vm for secure code execution
        // For now, use simple Function constructor (NOT SAFE FOR PRODUCTION)
        this.logger.warn('Code execution using Function constructor - NOT SAFE FOR PRODUCTION');

        const fn = new Function('data', 'context', code);
        const result = fn(data, context);

        results.push({
          json: result || data
        });
      } catch (error: any) {
        this.logger.error('Code execution failed:', error.message);
        throw new Error(`Code execution failed: ${error.message}`);
      }
    }

    return results;
  }
}
