import { Injectable } from '@nestjs/common';
import {
  BaseNodeExecutor,
  NodeData,
  NodeInputItem,
  NodeExecutionContext,
  NodeExecutionResult,
} from '../base';

/**
 * Schedule Trigger Executor
 * Cron-based scheduling trigger
 * In real execution, this is called by the scheduler service
 */
@Injectable()
export class ScheduleTriggerExecutor extends BaseNodeExecutor {
  readonly supportedTypes = ['SCHEDULE_TRIGGER'];

  protected async executeInternal(
    node: NodeData,
    inputData: NodeInputItem[],
    context: NodeExecutionContext,
  ): Promise<NodeExecutionResult> {
    const config = node.data || {};

    return [{
      json: {
        ...(context.$json || {}),
        triggeredAt: new Date().toISOString(),
        trigger: 'schedule',
        cron: config.cron || '* * * * *',
        timezone: config.timezone || 'UTC',
      }
    }];
  }
}
