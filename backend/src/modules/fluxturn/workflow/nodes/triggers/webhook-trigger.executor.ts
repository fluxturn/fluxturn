import { Injectable } from '@nestjs/common';
import {
  BaseNodeExecutor,
  NodeData,
  NodeInputItem,
  NodeExecutionContext,
  NodeExecutionResult,
} from '../base';

/**
 * Webhook Trigger Executor
 * HTTP webhook endpoint trigger
 * In real execution, this is called by webhook controller
 */
@Injectable()
export class WebhookTriggerExecutor extends BaseNodeExecutor {
  readonly supportedTypes = ['WEBHOOK_TRIGGER'];

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
        trigger: 'webhook',
        path: config.path || '/webhook/default',
      }
    }];
  }
}
