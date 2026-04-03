import { Injectable } from '@nestjs/common';
import {
  BaseNodeExecutor,
  NodeData,
  NodeInputItem,
  NodeExecutionContext,
  NodeExecutionResult,
} from '../base';

/**
 * Form Trigger Executor
 * Triggered when a public form is submitted
 */
@Injectable()
export class FormTriggerExecutor extends BaseNodeExecutor {
  readonly supportedTypes = ['FORM_TRIGGER'];

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
        trigger: 'form',
        formTitle: config.formTitle || 'Form Submission',
        formId: config.formId,
      }
    }];
  }
}
