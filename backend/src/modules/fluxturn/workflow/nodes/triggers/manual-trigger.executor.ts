import { Injectable } from '@nestjs/common';
import {
  BaseNodeExecutor,
  NodeData,
  NodeInputItem,
  NodeExecutionContext,
  NodeExecutionResult,
} from '../base';

/**
 * Manual Trigger Executor
 * Simply passes through input data or creates initial context
 */
@Injectable()
export class ManualTriggerExecutor extends BaseNodeExecutor {
  readonly supportedTypes = ['MANUAL_TRIGGER'];

  protected async executeInternal(
    node: NodeData,
    inputData: NodeInputItem[],
    context: NodeExecutionContext,
  ): Promise<NodeExecutionResult> {
    // Manual trigger simply returns the initial input data
    // or creates a new item with the context $json
    if (inputData.length > 0) {
      return inputData;
    }

    return [{
      json: {
        ...(context.$json || {}),
        triggeredAt: new Date().toISOString(),
        trigger: 'manual',
      }
    }];
  }
}
